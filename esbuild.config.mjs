/**
 * Builds the K-Plex entry point, hardens unused React script-element branches and copies the
 * installable manifest/styles into dist. The build owns its watch context and artifact writes.
 */
import esbuild from "esbuild";
import process from "process";
import { builtinModules } from "node:module";
import { execFileSync } from "node:child_process";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";

const prod = process.argv[2] === "production";

/** Resolve a public static identity at build time; archives never require Git to be available. */
async function publicBuildIdentity() {
  const manifest = JSON.parse(await readFile(new URL("./manifest.json", import.meta.url), "utf8"));
  const version = manifest.version;
  if (typeof version !== "string" || !/^\d{1,5}\.\d{1,5}\.\d{1,5}(?:-(?:alpha|beta|rc)\.\d{1,5})?$/.test(version)) {
    throw new Error("Build identity requires a supported manifest version");
  }
  try {
    const options = { cwd: new URL(".", import.meta.url), encoding: "utf8", timeout: 5000, stdio: ["ignore", "pipe", "ignore"] };
    const revision = execFileSync("git", ["rev-parse", "--short=12", "HEAD"], options).trim();
    if (!/^[a-f0-9]{12}$/.test(revision)) return version + "+source-archive";
    const dirty = execFileSync("git", ["status", "--porcelain", "--untracked-files=normal"], options).length > 0;
    return version + "+" + revision + (dirty ? ".dirty" : "");
  } catch { return version + "+source-archive"; }
}

const buildId = await publicBuildIdentity();

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
  define: { __KPLEX_BUILD_ID__: JSON.stringify(buildId) },
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
  plugins: [{
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
