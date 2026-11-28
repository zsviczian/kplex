import {build} from "esbuild";
import {copyFile, readFile, writeFile} from "node:fs/promises";
import {fileURLToPath} from "node:url";
import {checkArchitecture} from "./check-architecture.mjs";
import {compactLocalization} from "./compact-localization.mjs";

const root = new URL("../", import.meta.url);
const output = new URL("dist-web/", root);
const rootPath = fileURLToPath(root);
const architecture = checkArchitecture(rootPath);
if (architecture.errors.length) throw new Error(architecture.errors.join("\n"));

const result = await build({
  absWorkingDir: rootPath,
  entryPoints: {demo: "src/web/demo.ts", compass: "src/web/mount.tsx"},
  outdir: fileURLToPath(output),
  bundle: true, splitting: true, chunkNames: "[name]", format: "esm", platform: "browser", target: "es2021",
  minify: true, charset: "utf8", metafile: true, legalComments: "linked", logLevel: "info",
  plugins: [compactLocalization(rootPath)],
});
for (const file of Object.keys(result.metafile.inputs)) {
  if (!/^(src\/(?:web|core|lang|ui\/features|ui\/components)\/|node_modules\/(?:react|react-dom|scheduler)\/)/.test(file)) {
    throw new Error(`Unexpected browser input ${file}`);
  }
}
const [shared, browser] = await Promise.all([
  readFile(new URL("styles.css", root), "utf8"),
  readFile(new URL("src/web/compass.css", root), "utf8"),
]);
await Promise.all([
  writeFile(new URL("compass.css", output), `@scope (.kplex-publication) {\n${shared}\n}\n${browser}`),
  ...["index.html", "publication.json"].map(file => copyFile(new URL(`src/web/${file}`, root), new URL(file, output))),
]);
