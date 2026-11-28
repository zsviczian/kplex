import {build} from "esbuild";
import {createHash} from "node:crypto";
import {copyFile, readFile, writeFile} from "node:fs/promises";
import {fileURLToPath} from "node:url";
import {checkArchitecture} from "./check-architecture.mjs";
import {compactLocalization} from "./compact-localization.mjs";
import {readRuntimePack} from "../src/application/publish/runtimePack.ts";

const root = new URL("../", import.meta.url);
const output = new URL("dist-web/", root);
const rootPath = fileURLToPath(root);
const version = JSON.parse(await readFile(new URL("manifest.json", root), "utf8")).version;
const architecture = checkArchitecture(rootPath);
if (architecture.errors.length) throw new Error(architecture.errors.join("\n"));

const result = await build({
  absWorkingDir: rootPath,
  entryPoints: {demo: "src/web/demo.ts", compass: "src/web/mount.tsx"},
  outdir: fileURLToPath(output),
  bundle: true, splitting: true, chunkNames: "[name]", format: "esm", platform: "browser", target: "es2021",
  minify: true, charset: "utf8", metafile: true, legalComments: "linked", logLevel: "info",
  define: {__KPLEX_WEB_RUNTIME_VERSION__: JSON.stringify(version)},
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

const licenses = {
  "K-Plex": "LICENSE",
  React: "node_modules/react/LICENSE",
  ReactDOM: "node_modules/react-dom/LICENSE",
  Scheduler: "node_modules/scheduler/LICENSE",
};
const hash = async bytes => createHash("sha256").update(bytes).digest("hex");
const packFiles = await Promise.all([
  ...Object.keys(result.metafile.outputs).map(path => path.split("/").at(-1)).concat("compass.css").map(async name =>
    [`runtime/${name}`, await readFile(new URL(name, output), "utf8")]),
  ...Object.entries(licenses).map(async ([name, path]) => [`LICENSES/${name}.txt`, await readFile(new URL(path, root), "utf8")]),
  ["LICENSES/Source.txt", `K-Plex Web ${version}\nCopyright K-Plex contributors. Distributed under AGPL-3.0-only.\nCorresponding source: https://github.com/zsviczian/kplex/releases\nUse the source archive for the exact official release that supplied this runtime pack. When redistributing a custom build, make its exact corresponding source available.\n`],
]);
const files = await Promise.all(packFiles.map(async ([path, text]) => {
  const encoded = new TextEncoder().encode(text);
  return {path, text, bytes: encoded.byteLength, sha256: await hash(encoded)};
}));
const pack = await readRuntimePack({schema: 1, version, files}, version, hash);
await writeFile(new URL(`kplex-web-runtime-${version}.json`, output), JSON.stringify(pack) + "\n");
