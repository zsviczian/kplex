import { readFileSync, readdirSync } from "node:fs";
import { dirname, extname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const LAYERS = [
  ["src/lang/", "lang"],
  ["src/core/contracts/", "contracts"],
  ["src/core/parser/", "parser"],
  ["src/core/graph/", "graph"],
  ["src/core/plex/", "plex"],
  ["src/application/", "application"],
  ["src/ui/components/", "components"],
  ["src/ui/features/", "features"],
  ["src/adapters/obsidian/", "adapter"],
];
const ALLOWED = {
  lang: new Set(["lang"]),
  contracts: new Set(["contracts"]),
  parser: new Set(["parser"]),
  graph: new Set(["contracts", "graph"]),
  plex: new Set(["contracts", "graph", "plex"]),
  application: new Set(["contracts", "graph", "plex", "application"]),
  components: new Set(["components"]),
  features: new Set(["lang", "contracts", "graph", "plex", "application", "components", "features"]),
  adapter: new Set(["lang", "contracts", "parser", "graph", "plex", "application", "components", "features", "adapter"]),
};
const PORTABLE = new Set(["lang", "contracts", "parser", "graph", "plex", "application", "components", "features"]);
const UI = new Set(["components", "features"]);
const SHARED_GLOBALS = new Set(["globalThis", "localStorage", "sessionStorage", "indexedDB", "IDBDatabase", "caches", "process", "Buffer", "eval", "Function"]);
const CORE_GLOBALS = new Set(["window", "document", "self", "navigator", "HTMLElement", "Element", "Document", "Node", "MutationObserver", "ResizeObserver", "Worker", "performance", "setTimeout", "setInterval", "requestAnimationFrame", "FileReader", "Image"]);
const OBSIDIAN_DOM_METHODS = new Set(["createEl", "createDiv", "createSpan", "createSvg", "createFragment", "setIcon"]);
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".mts", ".js", ".jsx", ".mjs", ".cjs"]);

function filesUnder(dir) {
  try {
    return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const path = join(dir, entry.name);
      return entry.isDirectory() ? filesUnder(path) : SOURCE_EXTENSIONS.has(extname(path)) ? [path] : [];
    });
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

function layerOf(path, projectRoot) {
  const name = relative(projectRoot, path).split(sep).join("/");
  return LAYERS.find(([prefix]) => name.startsWith(prefix))?.[1] ?? null;
}

function isIdentifierUse(node) {
  const parent = node.parent;
  return !(ts.isPropertyAccessExpression(parent) && parent.name === node)
    && !(ts.isPropertyAssignment(parent) && parent.name === node)
    && !(ts.isMethodDeclaration(parent) && parent.name === node);
}

function importsOf(source, errors, displayName, portable) {
  const imports = [];
  const add = (specifier, node) => {
    if (specifier && ts.isStringLiteralLike(specifier)) imports.push({ name: specifier.text, node });
    else if (portable) errors.push(`${displayName}: nonliteral module loading`);
  };
  function visit(node) {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
      if (node.moduleSpecifier) add(node.moduleSpecifier, node);
    } else if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference)) {
      add(node.moduleReference.expression, node);
    } else if (ts.isImportTypeNode(node)) {
      add(node.argument.literal ?? node.argument, node);
    } else if (ts.isCallExpression(node)) {
      const dynamicImport = node.expression.kind === ts.SyntaxKind.ImportKeyword;
      const requireCall = ts.isIdentifier(node.expression) && node.expression.text === "require";
      if (dynamicImport || requireCall) add(node.arguments[0], node);
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  return imports;
}

/** Check only migrated roots, but walk every dependency reachable from them. */
export function checkArchitecture(projectRoot) {
  projectRoot = resolve(projectRoot);
  const configPath = ts.findConfigFile(projectRoot, ts.sys.fileExists, "tsconfig.json");
  if (!configPath) throw new Error(`Missing tsconfig.json in ${projectRoot}`);
  const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
  if (configFile.error) throw new Error(ts.flattenDiagnosticMessageText(configFile.error.messageText, "\n"));
  const config = ts.parseJsonConfigFileContent(configFile.config, ts.sys, dirname(configPath));
  if (config.errors.length) throw new Error(config.errors.map((item) => ts.flattenDiagnosticMessageText(item.messageText, "\n")).join("\n"));
  const roots = ["src/lang", "src/core", "src/application", "src/ui/components", "src/ui/features", "src/adapters"]
    .flatMap((area) => filesUnder(join(projectRoot, area)));
  const errors = [];
  for (const path of roots) if (!layerOf(path, projectRoot)) errors.push(`${relative(projectRoot, path)}: unclassified migrated path`);
  const visited = new Set();
  const edges = new Map();
  const sourcePath = (path) => relative(projectRoot, path).split(sep).join("/");

  function walk(path, chain = []) {
    path = resolve(path);
    if (visited.has(path)) return;
    visited.add(path);
    const layer = layerOf(path, projectRoot);
    const portable = PORTABLE.has(layer);
    const name = sourcePath(path);
    const scriptKind = path.endsWith(".tsx") ? ts.ScriptKind.TSX : path.endsWith(".jsx") ? ts.ScriptKind.JSX
      : [".js", ".mjs", ".cjs"].includes(extname(path)) ? ts.ScriptKind.JS : ts.ScriptKind.TS;
    const source = ts.createSourceFile(path, readFileSync(path, "utf8"), ts.ScriptTarget.Latest, true, scriptKind);
    for (const diagnostic of source.parseDiagnostics) errors.push(`${name}: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, " ")}`);
    if (portable) {
      const forbidden = new Set(SHARED_GLOBALS);
      if (!UI.has(layer)) for (const global of CORE_GLOBALS) forbidden.add(global);
      const checkNode = (node) => {
        if (ts.isIdentifier(node) && forbidden.has(node.text) && isIdentifierUse(node)) errors.push(`${name}: forbidden global ${node.text}`);
        if (ts.isPropertyAccessExpression(node) && OBSIDIAN_DOM_METHODS.has(node.name.text)) errors.push(`${name}: Obsidian DOM helper ${node.name.text}`);
        if (ts.isPropertyAccessExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "window" && ["app", "plugin", "plugins"].includes(node.name.text)) errors.push(`${name}: plugin escape through window.${node.name.text}`);
        if (ts.isElementAccessExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "window" && ts.isStringLiteralLike(node.argumentExpression) && ["app", "plugin", "plugins"].includes(node.argumentExpression.text)) errors.push(`${name}: plugin escape through window[${node.argumentExpression.text}]`);
        ts.forEachChild(node, checkNode);
      };
      checkNode(source);
    }
    const imports = importsOf(source, errors, name, portable);
    for (const { name: specifier } of imports) {
      if (specifier === "react" || specifier.startsWith("react/") || specifier === "react-dom" || specifier.startsWith("react-dom/")) {
        if (portable && !UI.has(layer)) errors.push(`${name}: ${layer} cannot import ${specifier}`);
        continue;
      }
      if (specifier === "obsidian" || specifier.startsWith("node:") || !specifier.startsWith(".") && !specifier.startsWith("@/")) {
        if (portable) errors.push(`${name}: forbidden external import ${specifier}`);
        continue;
      }
      const resolvedModule = ts.resolveModuleName(specifier, path, config.options, ts.sys).resolvedModule;
      if (!resolvedModule || resolvedModule.isExternalLibraryImport) {
        if (portable) errors.push(`${name}: unresolved or external import ${specifier}`);
        continue;
      }
      const dependency = resolve(resolvedModule.resolvedFileName);
      const targetLayer = layerOf(dependency, projectRoot);
      if (portable && !targetLayer) errors.push(`${name}: import reaches unmigrated module ${sourcePath(dependency)} via ${specifier}`);
      if (layer && targetLayer && !ALLOWED[layer].has(targetLayer)) errors.push(`${name}: ${layer} cannot import ${targetLayer} (${sourcePath(dependency)})`);
      if (layer && targetLayer && layer !== targetLayer) {
        if (!edges.has(layer)) edges.set(layer, new Set());
        edges.get(layer).add(targetLayer);
      }
      if (!chain.includes(dependency)) walk(dependency, [...chain, path]);
    }
  }
  for (const root of roots) walk(root);
  const visiting = new Set();
  const done = new Set();
  function visitLayer(layer) {
    if (visiting.has(layer)) { errors.push(`migrated layer cycle involving ${layer}`); return; }
    if (done.has(layer)) return;
    visiting.add(layer);
    for (const target of edges.get(layer) ?? []) visitLayer(target);
    visiting.delete(layer);
    done.add(layer);
  }
  for (const layer of edges.keys()) visitLayer(layer);
  return { roots: roots.length, files: visited.size, errors: [...new Set(errors)] };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = checkArchitecture(resolve(dirname(fileURLToPath(import.meta.url)), ".."));
  for (const error of result.errors) console.error(error);
  console.log(`Architecture: ${result.roots} migrated roots, ${result.files} reachable files, ${result.errors.length} violations`);
  if (result.roots === 0) console.log("No production portable roots exist yet; this is not a host-independence proof.");
  if (result.errors.length) process.exitCode = 1;
}
