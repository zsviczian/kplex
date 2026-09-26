import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { readFileSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import vm from "node:vm";
import { fileURLToPath, pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const temp = mkdtempSync(join(tmpdir(), "kplex-parser-core-"));
process.on("exit", () => rmSync(temp, { recursive: true, force: true }));
const bundledPath = join(temp, "metadata-parser.mjs");
const sourcePath = join(root, "src/core/parser/metadata.ts");
const compiled = ts.transpileModule(readFileSync(sourcePath, "utf8"), {
  compilerOptions: { target: ts.ScriptTarget.ES2021, module: ts.ModuleKind.ESNext, strict: true },
  fileName: sourcePath,
  reportDiagnostics: true,
});
const compileErrors = (compiled.diagnostics ?? []).filter((item) => item.category === ts.DiagnosticCategory.Error);
if (compileErrors.length) throw new Error(compileErrors.map((item) => ts.flattenDiagnosticMessageText(item.messageText, "\n")).join("\n"));
writeFileSync(bundledPath, compiled.outputText);
const parser = await import(pathToFileURL(bundledPath).href);
const oracle = JSON.parse(readFileSync(join(root, "tests/fixtures/parser-c12c-oracle.json"), "utf8"));

function bodyInput(item) {
  if (typeof item.input === "string") return item.input;
  const spec = item.inputSpec;
  switch (spec.kind) {
    case "malformed-label-url": return `${spec.repeat.repeat(spec.count)}${spec.suffix}`;
    case "large-fenced-code": return [
      "Parent:: [[A]]",
      "```json",
      `{"blob":"${"x".repeat(spec.bytes)}","fake":"Friend:: [[Ignored]]"}`,
      "```",
      "Child:: [[B]]",
    ].join("\n");
    case "long-paragraph-url": return `${"x".repeat(spec.bytes)} ${spec.url}`;
    case "repeated-round-field": return `${"(".repeat(spec.count)}${spec.suffix}`;
    default: throw new Error(`Unknown parser oracle input spec: ${spec.kind}`);
  }
}

function noTimerRuntime(overrides = {}) {
  return {
    now: () => 0,
    yield: async () => {},
    shouldContinue: () => true,
    ...overrides,
  };
}


test("portable parser loads in a clean process without Obsidian or browser globals", () => {
  const result = spawnSync(process.execPath, ["--input-type=module", "-e", `
    import assert from "node:assert/strict";
    const parser = await import(${JSON.stringify(pathToFileURL(bundledPath).href)});
    assert.equal(typeof globalThis.window, "undefined");
    assert.equal(typeof globalThis.document, "undefined");
    assert.equal(typeof globalThis.Worker, "undefined");
    assert.deepEqual(parser.parseBodyMetadataCore("Parent:: [[A]]\\r\\nhttps://example.com"), {
      inlineFields: { parent: ["[[A]]"] },
      inlineFieldOccurrences: [{ name: "Parent", normalizedName: "parent", value: "[[A]]", line: 1, start: 0, end: 14, syntax: "line" }],
      urls: [{ url: "https://example.com", line: 2 }],
    });
  `], { cwd: temp, encoding: "utf8" });
  assert.equal(result.status, 0, result.stdout + result.stderr);
});

test("portable synchronous grammar and property-reference iterator match the frozen accepted C12c oracle", () => {
  assert.match(oracle.provenance, /accepted C12c/);
  for (const item of oracle.bodyCases) {
    assert.deepEqual(parser.parseBodyMetadataCore(bodyInput(item)), item.expected, item.name);
  }
  for (const item of oracle.valueCases) {
    assert.deepEqual(parser.extractLinkReferencesFromValue(item.value), item.expected, item.name);
    assert.deepEqual([...parser.iterateLinkReferencesFromValue(item.value)], item.expected, `${item.name} streaming`);
  }
});

test("portable cooperative grammar matches frozen outputs across normal and pathological scans", async () => {
  for (const item of oracle.bodyCases) {
    let yields = 0;
    const actual = await parser.parseBodyMetadataCooperativeCore(bodyInput(item), noTimerRuntime({
      yield: async () => { yields += 1; },
    }), 60_000);
    assert.deepEqual(actual, item.expected, item.name);
    assert.equal(yields, 0, `${item.name} yielded before its fake clock budget expired`);
  }
});

test("cooperative runtime owns budget, awaited-yield cancellation, and dense-scan cancellation", async () => {
  let yieldCount = 0;
  await parser.parseBodyMetadataCooperativeCore(`${"[a".repeat(64 * 1024)} https://example.com/path`, noTimerRuntime({
    yield: async () => { yieldCount += 1; },
  }), 4);
  assert.equal(yieldCount, 0, "a clock that never reaches the deadline must not schedule a yield");

  let firstNow = true;
  yieldCount = 0;
  await parser.parseBodyMetadataCooperativeCore("Parent:: [[A]]\nChild:: [[B]]", noTimerRuntime({
    now: () => firstNow ? (firstNow = false, 0) : 4,
    yield: async () => { yieldCount += 1; },
  }), 4);
  assert.equal(yieldCount, 1, "reaching the budget at a cooperative boundary must yield exactly once for a fixed clock");

  firstNow = true;
  let yielded = false;
  await assert.rejects(
    parser.parseBodyMetadataCooperativeCore("Parent:: [[A]]\nChild:: [[B]]", noTimerRuntime({
      now: () => firstNow ? (firstNow = false, 0) : 4,
      yield: async () => { yielded = true; },
      shouldContinue: () => !yielded,
    }), 4),
    (error) => error instanceof Error && error.message === "K-Plex cooperative metadata parse cancelled",
  );
  assert.equal(yielded, true, "cancellation must be checked after the awaited host yield");

  let inlineChecks = 0;
  await assert.rejects(
    parser.parseBodyMetadataCooperativeCore(`${"(".repeat(512 * 1024)}x:: y)`, noTimerRuntime({
      shouldContinue: (phase) => phase !== "inline-field-scan" || ++inlineChecks < 3,
    }), 60_000),
    /K-Plex cooperative metadata parse cancelled/,
  );
  assert(inlineChecks >= 3, "dense inline scans must observe cancellation without waiting for the time budget");

  await assert.rejects(
    parser.parseBodyMetadataCooperativeCore("x", undefined, 4),
    /K-Plex cooperative metadata parse runtime is required/,
  );
});

test("serialized worker core has no module closure and exactly matches the frozen grammar", () => {
  const isolated = vm.runInNewContext(`(${parser.parseBodyMetadataCore.toString()})`, Object.create(null));
  for (const item of oracle.bodyCases) {
    const actual = JSON.parse(JSON.stringify(isolated(bodyInput(item))));
    assert.deepEqual(actual, item.expected, item.name);
  }
});
