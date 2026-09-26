import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const temp = mkdtempSync(join(tmpdir(), "kplex-host-link-source-"));

function compile(relativePath) {
  const sourcePath = join(root, relativePath);
  const outputPath = join(temp, relativePath.replace(/\.ts$/, ".js"));
  mkdirSync(dirname(outputPath), { recursive: true });
  const result = ts.transpileModule(readFileSync(sourcePath, "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2021, module: ts.ModuleKind.CommonJS, esModuleInterop: true, strict: true },
    fileName: sourcePath,
    reportDiagnostics: true,
  });
  const errors = (result.diagnostics ?? []).filter((item) => item.category === ts.DiagnosticCategory.Error);
  if (errors.length) throw new Error(errors.map((item) => ts.flattenDiagnosticMessageText(item.messageText, "\n")).join("\n"));
  writeFileSync(outputPath, result.outputText);
}

for (const file of [
  "src/core/graph/model.ts",
  "src/core/graph/source.ts",
  "src/adapters/obsidian/hostLinkSourceCollector.ts",
]) compile(file);

const obsidianDir = join(temp, "node_modules/obsidian");
mkdirSync(obsidianDir, { recursive: true });
writeFileSync(join(obsidianDir, "index.js"), `
class TFile {
  constructor(path, mtime = 1, size = 0) {
    this.path = path;
    this.name = path.split('/').pop() || '';
    const dot = this.name.lastIndexOf('.');
    this.extension = dot >= 0 ? this.name.slice(dot + 1) : '';
    this.basename = dot >= 0 ? this.name.slice(0, dot) : this.name;
    this.stat = { mtime, ctime: mtime, size };
  }
}
module.exports = { TFile };
`);

const { TFile } = require(join(obsidianDir, "index.js"));
const { ObsidianHostLinkSourceCollector, readHostLinkSignatureEntries } = require(join(temp, "src/adapters/obsidian/hostLinkSourceCollector.js"));
const { MAX_NORMALIZED_SOURCE_RECORDS_PER_BATCH, acceptSourceBatch, beginSourceRead, sourceReadCanPublish } = require(join(temp, "src/core/graph/source.js"));

function makeHost({ resolvedLinks = {}, unresolvedLinks = {}, files = [] } = {}) {
  const byPath = new Map(files.map((file) => [file.path, file]));
  return {
    vault: { getFileByPath(path) { return byPath.get(path) ?? null; } },
    metadataCache: { resolvedLinks, unresolvedLinks },
  };
}

async function collectAndFinalize(collector) {
  const batches = [];
  assert.equal(await collector.collectBatches((batch) => { batches.push(batch); return true; }), true);
  assert(batches.every((batch) => batch.final === false));
  const final = await collector.finalize();
  assert(final);
  batches.push(final);
  return batches;
}

function assertNoHostObject(value) {
  if (!value || typeof value !== "object") return;
  assert.equal(value instanceof TFile, false, "normalized host-link facts must not retain TFile");
  if (Array.isArray(value)) for (const item of value) assertNoHostObject(item);
  else for (const item of Object.values(value)) assertNoHostObject(item);
}

try {
  {
    const source = new TFile("Folder/Source.md", 11, 50);
    const target = new TFile("Folder/Target.md", 12, 60);
    const image = new TFile("Assets/Diagram.PNG", 13, 70);
    const resolvedLinks = {
      [source.path]: { [target.path]: 3, [image.path]: 1, "Stale/Missing.md": 2 },
    };
    const unresolvedLinks = {
      [source.path]: { "Never There": 4, "CaseSensitive Ghost": 1 },
    };
    const host = makeHost({ resolvedLinks, unresolvedLinks, files: [source, target, image] });
    let checkpoints = 0;
    const collector = new ObsidianHostLinkSourceCollector(host, {
      isCurrent: () => true,
      sourceRevision: () => 7,
      checkpoint: async () => { checkpoints += 1; return true; },
    });
    const batches = await collectAndFinalize(collector);
    assert(checkpoints > 0);
    assert(batches.every((batch) => batch.records.length <= MAX_NORMALIZED_SOURCE_RECORDS_PER_BATCH));

    let cursor = beginSourceRead(collector.boundary);
    for (const batch of batches) {
      const accepted = acceptSourceBatch(cursor, batch);
      assert.equal(accepted.accepted, true);
      cursor = accepted.cursor;
    }
    assert.equal(sourceReadCanPublish(cursor, collector.boundary), true);
    assert.equal(collector.isBoundaryCurrent(collector.boundary), true);

    const records = batches.flatMap((batch) => batch.records);
    records.forEach(assertNoHostObject);
    const resolved = records.find((record) => record.kind === "obsidian-link" && record.target.entity.semanticPath === target.path);
    assert(resolved);
    assert.equal(resolved.occurrenceCount, 3);
    assert.equal(resolved.source.semanticPath, source.path);
    assert.equal(resolved.target.rawTarget, target.path);
    assert.equal(resolved.target.resolvedBy, "host");
    assert.equal(resolved.target.entity.state, "materialized");
    assert.equal(resolved.target.entity.kind, "document");
    assert.equal(resolved.provenance.definition, "resolvedLinks");
    assert.equal(resolved.provenance.location, undefined, "aggregate host maps must not invent a Markdown location");

    const attachment = records.find((record) => record.kind === "obsidian-link" && record.target.entity.semanticPath === image.path);
    assert.equal(attachment.target.entity.kind, "attachment");
    const stale = records.find((record) => record.kind === "obsidian-link" && record.target.entity.semanticPath === "Stale/Missing.md");
    assert.equal(stale.target.entity.state, "missing");
    const ghost = records.find((record) => record.kind === "unresolved-link" && record.target.rawTarget === "Never There");
    assert(ghost);
    assert.equal(ghost.occurrenceCount, 4);
    assert.equal(ghost.target.entity.state, "unresolved");
    assert.equal(ghost.target.entity.semanticPath, "Never There");

    assert.deepEqual(readHostLinkSignatureEntries(host.metadataCache, source.path), {
      resolved: [[image.path, 1], [target.path, 3], ["Stale/Missing.md", 2]],
      unresolved: [["CaseSensitive Ghost", 1], ["Never There", 4]],
    });
  }

  {
    const sourceA = new TFile("A.md");
    const sourceB = new TFile("B.md");
    const resolvedLinks = { "A.md": {}, "B.md": { "Only.md": 1 } };
    for (let index = 0; index < 600; index += 1) resolvedLinks["A.md"][`Target-${String(index).padStart(3, "0")}.md`] = index + 1;
    const host = makeHost({ resolvedLinks, files: [sourceA, sourceB] });
    const collector = new ObsidianHostLinkSourceCollector(host, {
      isCurrent: () => true, sourceRevision: () => 9, checkpoint: async () => true,
    }, "A.md");
    const batches = await collectAndFinalize(collector);
    assert(batches.length >= 4, "dense one-source maps must stream through multiple bounded batches");
    assert(batches.every((batch) => batch.records.length <= MAX_NORMALIZED_SOURCE_RECORDS_PER_BATCH));
    const records = batches.flatMap((batch) => batch.records);
    assert.equal(records.length, 600);
    assert(records.every((record) => record.source.semanticPath === "A.md"));
    assert.equal(records.some((record) => record.target.entity.semanticPath === "Only.md"), false, "source-scoped incremental collection must not read another source");
  }

  {
    const source = new TFile("Source.md");
    const host = makeHost({ resolvedLinks: { "Source.md": { "Target.md": 1 } }, files: [source] });
    const collector = new ObsidianHostLinkSourceCollector(host, {
      isCurrent: () => true, sourceRevision: () => 1, checkpoint: async () => true,
    });
    assert.equal(await collector.collectBatches(() => true), true);
    host.metadataCache.resolvedLinks["Source.md"]["Target.md"] = 2;
    assert.equal(await collector.finalize(), null, "finalization must reject a changed host-link family digest");
  }

  {
    const source = new TFile("Case/Source.md");
    const upper = new TFile("Case/Topic.md");
    const lower = new TFile("case/Topic.md");
    const host = makeHost({
      resolvedLinks: { [source.path]: { [upper.path]: 2, [lower.path]: 5 } },
      files: [source, upper, lower],
    });
    const collector = new ObsidianHostLinkSourceCollector(host, {
      isCurrent: () => true, sourceRevision: () => 11, checkpoint: async () => true,
    }, source.path);
    const records = (await collectAndFinalize(collector)).flatMap((batch) => batch.records);
    assert.deepEqual(records.map((record) => [record.target.entity.semanticPath, record.occurrenceCount]), [
      [upper.path, 2],
      [lower.path, 5],
    ], "case-distinct host target identities and counts must survive unchanged");
  }

  {
    const source = new TFile("Rejected.md");
    const host = makeHost({ unresolvedLinks: { [source.path]: { Ghost: 1 } }, files: [source] });
    const collector = new ObsidianHostLinkSourceCollector(host, {
      isCurrent: () => true, sourceRevision: () => 12, checkpoint: async () => true,
    });
    let reentrantResult = null;
    assert.equal(await collector.collectBatches(async () => {
      reentrantResult = await collector.collectBatches(() => true);
      return false;
    }), false, "consumer rejection must fail the collection attempt");
    assert.equal(reentrantResult, false, "a collecting adapter must reject reentrant collection");
    assert.equal(await collector.finalize(), null, "a rejected attempt must never finalize");
  }

  {
    let revision = 3;
    const source = new TFile("Source.md");
    const host = makeHost({ unresolvedLinks: { "Source.md": { Ghost: 1 } }, files: [source] });
    const collector = new ObsidianHostLinkSourceCollector(host, {
      isCurrent: () => true, sourceRevision: () => revision, checkpoint: async () => true,
    });
    assert.equal(await collector.collectBatches(() => true), true);
    revision += 1;
    assert.equal(await collector.finalize(), null, "source-event revision changes must fence stale reads");
  }

  console.log("Host-link normalized source collector tests passed.");
} finally {
  rmSync(temp, { recursive: true, force: true });
}
