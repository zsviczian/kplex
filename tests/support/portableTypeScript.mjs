/**
 * Transpile the actual portable modules for Node tests with the repository's TypeScript dependency.
 * This is not a typecheck (check:core/build own that gate), nor an implementation shim. Relative
 * imports are compiled recursively; optional explicit host stubs are owned by adapter tests only.
 */
import { createRequire } from "node:module";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
const require = createRequire(import.meta.url);
const ts = require("typescript");
const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

/** Compile the requested real module graph into an owned temporary directory; remove it on exit or failure. */
export function loadPortableModules(paths, stubs = {}) {
  const directory = mkdtempSync(join(tmpdir(), "kplex-portable-ts-"));
  const cleanup = () => rmSync(directory, { recursive: true, force: true });
  process.once("exit", cleanup);
  const visited = new Set();
  /** Follow only repository-relative imports and report transpiler diagnostics without fabricating dependencies. */
  function compile(file) {
    if (visited.has(file)) return;
    visited.add(file);
    const source = readFileSync(file, "utf8");
    const output = join(directory, relative(root, file).replace(/\.ts$/, ".js"));
    mkdirSync(dirname(output), { recursive: true });
    const result = ts.transpileModule(source, { fileName: file, reportDiagnostics: true,
      compilerOptions: { target: ts.ScriptTarget.ES2021, module: ts.ModuleKind.CommonJS, esModuleInterop: true, strict: true } });
    const errors = (result.diagnostics ?? []).filter(d => d.category === ts.DiagnosticCategory.Error);
    if (errors.length) throw new Error(errors.map(d => ts.flattenDiagnosticMessageText(d.messageText, "\n")).join("\n"));
    writeFileSync(output, result.outputText);
    for (const dependency of ts.preProcessFile(source).importedFiles) {
      if (!dependency.fileName.startsWith(".")) continue;
      const candidate = resolve(dirname(file), dependency.fileName);
      const target = [`${candidate}.ts`, join(candidate, "index.ts")].find(existsSync);
      if (!target || !target.startsWith(root + sep)) throw new Error(`Unresolved portable dependency: ${candidate}`);
      compile(target);
    }
  }
  try {
    for (const [name, source] of Object.entries(stubs)) {
      const output = join(directory, "node_modules", name, "index.js");
      mkdirSync(dirname(output), { recursive: true }); writeFileSync(output, source);
    }
    paths.forEach(path => compile(join(root, path)));
    const exports = Object.assign({}, ...paths.map(path => require(join(directory, path.replace(/\.ts$/, ".js")))));
    const entryPath = join(directory, "portable-entry.mjs");
    writeFileSync(entryPath, 'import {createRequire} from "node:module"; const require=createRequire(import.meta.url);\n'
      + `const core=Object.assign({}, ${paths.map(path => `require(${JSON.stringify("./" + path.replace(/\.ts$/, ".js"))})`).join(",")});\n`
      + Object.keys(exports).map(key => `export const ${key}=core.${key};`).join("\n"));
    return { exports, directory, entryPath, require: path => require(join(directory, path)), cleanup };
  } catch (error) { cleanup(); throw error; }
}
