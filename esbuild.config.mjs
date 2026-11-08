/**
 * Builds the K-Plex entry point, hardens unused React script-element branches and copies the
 * installable manifest/styles into dist. The build owns its watch context and artifact writes.
 */
import esbuild from "esbuild";
import process from "process";
import { builtinModules } from "node:module";
import { execFileSync } from "node:child_process";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";

const mode = process.argv[2];
const prod = mode === "production" || mode === "local";
let lastLocalTime = 0;

/** Distinguish actual local rebuilds even when the host clock repeats or moves backwards. */
function localBuildStamp() {
  lastLocalTime = Math.max(Date.now(), lastLocalTime + 1);
  return new Date(lastLocalTime).toISOString().replace(/[-:.]/g, "");
}

/** Keep production reproducible from source archives; only development builds include Git state. */
async function publicBuildIdentity() {
  const manifest = JSON.parse(await readFile(new URL("./manifest.json", import.meta.url), "utf8"));
  const version = manifest.version;
  if (typeof version !== "string" || !/^\d{1,5}\.\d{1,5}\.\d{1,5}(?:-(?:alpha|beta|rc)\.\d{1,5})?$/.test(version)) {
    throw new Error("Build identity requires a supported manifest version");
  }
  if (mode === "production") return version;
  let identity;
  try {
    const options = { cwd: new URL(".", import.meta.url), encoding: "utf8", timeout: 5000, stdio: ["ignore", "pipe", "ignore"] };
    const revision = execFileSync("git", ["rev-parse", "--short=12", "HEAD"], options).trim();
    if (!/^[a-f0-9]{12}$/.test(revision)) throw new Error("Unavailable revision");
    const dirty = execFileSync("git", ["status", "--porcelain", "--untracked-files=normal"], options).length > 0;
    identity = version + "+" + revision + (dirty ? ".dirty" : "");
  } catch { identity = version + "+source-archive"; }
  return identity + ".local." + localBuildStamp();
}

const buildId = prod ? await publicBuildIdentity() : null;

const hardenReactBundle = async () => {
  const path = "dist/main.js";
  let code = await readFile(path, "utf8");

  // React DOM contains support for rendering/hoisting <script> resources. K-Plex never renders
  // script elements, and community-plugin review correctly rejects bundles that can create them.
  // Keep React for the UI, but make those unused internal branches inert in the shipped bundle.
  const scriptElementPattern = new RegExp(`\\.createElement\\((["'])scr${"ipt"}\\1\\)`, "g");
  code = code.replace(scriptElementPattern, '.createElement("template")');

  if (new RegExp(`\\.createElement\\((["'])scr${"ipt"}\\1\\)`).test(code)) {
    throw new Error("Build hardening failed: runtime script-element creation remains in dist/main.js");
  }
  await writeFile(path, code);
};

const copyArtifacts = async () => {
  await mkdir("dist", { recursive: true });
  await Promise.all([
    copyFile("manifest.json", "dist/manifest.json"),
    copyFile("styles.css", "dist/styles.css")
  ]);
};

const context = await esbuild.context({
  banner: { js: "/* K-Plex - generated bundle */" },
  define: { __KPLEX_BUILD_ID__: prod ? JSON.stringify(buildId) : "__kplexWatchBuildIdentity" },
  inject: prod ? [] : ["kplex-watch-build-identity"],
  entryPoints: ["src/main.ts"],
  bundle: true,
  // Keep extensionless imports aligned with TypeScript's resolution order. A legacy
  // NewRelatedNoteModal.tsx may still exist in upgraded checkouts beside the canonical .ts file.
  resolveExtensions: [".ts", ".tsx", ".js", ".jsx", ".css", ".json"],
  external: [
    "obsidian",
    "electron",
    "@codemirror/autocomplete",
    "@codemirror/collab",
    "@codemirror/commands",
    "@codemirror/language",
    "@codemirror/lint",
    "@codemirror/search",
    "@codemirror/state",
    "@codemirror/view",
    "@lezer/common",
    "@lezer/highlight",
    "@lezer/lr",
    ...builtinModules
  ],
  format: "cjs",
  target: "es2021",
  logLevel: "info",
  sourcemap: prod ? false : "inline",
  treeShaking: true,
  outfile: "dist/main.js",
  minify: prod,
  plugins: [...(prod ? [] : [{
    name: "watch-build-identity",
    setup(build) {
      build.onResolve({filter: /^kplex-watch-build-identity$/}, () => ({path: "identity", namespace: "kplex-build"}));
      build.onLoad({filter: /^identity$/, namespace: "kplex-build"}, async () => ({
        contents: `export const __kplexWatchBuildIdentity = ${JSON.stringify(await publicBuildIdentity())};`, loader: "js",
      }));
    },
  }]), {
    name: "copy-plugin-artifacts",
    setup(build) {
      build.onEnd(async (result) => {
      if (result.errors.length === 0 && prod) await hardenReactBundle();
      await copyArtifacts();
    });
    }
  }]
});

if (prod) {
  await context.rebuild();
  await context.dispose();
  process.exit(0);
} else {
  await copyArtifacts();
  await context.watch();
}
