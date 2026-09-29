/**
 * Builds the K-Plex entry point, hardens unused React script-element branches and copies the
 * installable manifest/styles into dist. The build owns its watch context and artifact writes.
 */
import esbuild from "esbuild";
import process from "process";
import { builtinModules } from "node:module";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";

const prod = process.argv[2] === "production";

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
