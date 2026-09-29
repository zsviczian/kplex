/**
 * Type-checks the two diagnostic report calls against the actual GraphIndex source and exported
 * result contracts. A negative control removes those methods to reproduce TS2339. This focused
 * consumer check is not a substitute for npm run build against the installed host dependencies.
 * Compiler-host overlays are memory-only. The positive lane uses unmodified production source;
 * only the negative control removes declarations. No dependency stub is supplied by this test.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import ts from "typescript";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const indexPath = join(root, "src/index/GraphIndex.ts");
const probePath = join(root, "tests/__indexDiagnosticsReportContract__.ts");
const probe = `
import type { GraphIndex } from "../src/index/GraphIndex";
/** Exercise the exact report operations that previously produced TS2339. */
export function report(index: GraphIndex) {
  const saved = index.getSavedSnapshotSummary();
  return { saved, decisions: index.getIndexDiagnostics() };
}
`;

/** Resolve the real project types, applying only the requested in-memory source overlay. */
function reportDiagnostics(indexSource = readFileSync(indexPath, "utf8")) {
  const configPath = join(root, "tsconfig.json");
  const config = ts.readConfigFile(configPath, ts.sys.readFile);
  assert.equal(config.error, undefined);
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root);
  assert.deepEqual(parsed.errors, []);
  const options = { ...parsed.options, noEmit: true };
  const host = ts.createCompilerHost(options);
  const readFile = host.readFile.bind(host);
  const fileExists = host.fileExists.bind(host);
  host.readFile = (path) => path === probePath ? probe : path === indexPath ? indexSource : readFile(path);
  host.fileExists = (path) => path === probePath || fileExists(path);
  const program = ts.createProgram([indexPath, probePath], options, host);
  const source = program.getSourceFile(probePath);
  assert(source);
  return [...program.getSyntacticDiagnostics(source), ...program.getSemanticDiagnostics(source)]
    .map((diagnostic) => ({ code: diagnostic.code, message: ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n") }));
}

test("diagnostic report calls type-check against the real GraphIndex public methods", () => {
  assert.deepEqual(reportDiagnostics(), []);
});

test("missing diagnostic methods reproduce both reported TS2339 failures", () => {
  const source = readFileSync(indexPath, "utf8");
  const file = ts.createSourceFile(indexPath, source, ts.ScriptTarget.Latest, true);
  const graph = file.statements.find((statement) => ts.isClassDeclaration(statement) && statement.name.text === "GraphIndex");
  const methods = graph.members.filter((member) => ts.isMethodDeclaration(member)
    && ["getSavedSnapshotSummary", "getIndexDiagnostics"].includes(member.name.getText(file)));
  assert.equal(methods.length, 2);
  let missing = source;
  for (const method of methods.reverse())
    missing = missing.slice(0, method.getFullStart()) + missing.slice(method.end);
  const diagnostics = reportDiagnostics(missing);
  assert.equal(diagnostics.length, 2);
  assert(diagnostics.every((diagnostic) => diagnostic.code === 2339), JSON.stringify(diagnostics));
  assert(diagnostics.some((diagnostic) => diagnostic.message.includes("getSavedSnapshotSummary")));
  assert(diagnostics.some((diagnostic) => diagnostic.message.includes("getIndexDiagnostics")));
});
