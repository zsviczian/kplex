import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const temp = mkdtempSync(join(tmpdir(), "kplex-structural-source-"));

function compile(relativePath) {
  const sourcePath = join(root, relativePath);
  const outputPath = join(temp, relativePath.replace(/\.ts$/, ".js"));
  mkdirSync(dirname(outputPath), { recursive: true });
  const result = ts.transpileModule(readFileSync(sourcePath, "utf8"), {
    compilerOptions: {
      target: ts.ScriptTarget.ES2021,
      module: ts.ModuleKind.CommonJS,
      esModuleInterop: true,
      strict: true,
    },
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
  "src/adapters/obsidian/structuralSourceCollector.ts",
]) compile(file);

const obsidianDir = join(temp, "node_modules/obsidian");
mkdirSync(obsidianDir, { recursive: true });
writeFileSync(join(obsidianDir, "index.js"), `
class TAbstractFile {
  constructor(path) {
    this.path = path;
    this.name = path.split('/').pop() || '';
    this.parent = null;
  }
}
class TFile extends TAbstractFile {
  constructor(path, stat = {}) {
    super(path);
    const dot = this.name.lastIndexOf('.');
    this.extension = dot >= 0 ? this.name.slice(dot + 1) : '';
    this.basename = dot >= 0 ? this.name.slice(0, dot) : this.name;
    this.stat = { mtime: stat.mtime ?? 1, ctime: stat.ctime ?? 1, size: stat.size ?? 0 };
  }
}
class TFolder extends TAbstractFile {
  constructor(path) { super(path); this.children = []; }
}
function getAllTags(cache) {
  return [...new Set((cache?.tags ?? []).map((item) => item.tag))];
}
module.exports = { TAbstractFile, TFile, TFolder, getAllTags };
`);

const { TFile, TFolder } = require(join(obsidianDir, "index.js"));
const { ObsidianStructuralSourceCollector } = require(join(temp, "src/adapters/obsidian/structuralSourceCollector.js"));
const {
  MAX_NORMALIZED_SOURCE_RECORDS_PER_BATCH,
  acceptSourceBatch,
  beginSourceRead,
  sourceReadCanPublish,
} = require(join(temp, "src/core/graph/source.js"));

function addChild(folder, child) {
  child.parent = folder;
  folder.children.push(child);
  return child;
}

function makeHost({ files, rootFolder, caches }) {
  const byPath = new Map(files.map((file) => [file.path, file]));
  const counters = { root: 0, markdown: 0, lookup: 0, cache: 0 };
  return {
    counters,
    host: {
      vault: {
        getRoot() { counters.root += 1; return rootFolder; },
        getMarkdownFiles() { counters.markdown += 1; return files.filter((file) => file.extension === "md"); },
        getFileByPath(path) { counters.lookup += 1; return byPath.get(path) ?? null; },
      },
      metadataCache: {
        getFileCache(file) { counters.cache += 1; return caches.get(file.path) ?? null; },
      },
    },
  };
}

async function collect(collector) {
  const batches = [];
  const ok = await collector.collectBatches((batch) => { batches.push(batch); return true; });
  assert.equal(ok, true);
  assert(batches.every((batch) => batch.final === false));
  const final = await collector.finalize();
  assert(final);
  batches.push(final);
  return batches;
}

function flattenRecords(batches) {
  return batches.flatMap((batch) => batch.records);
}

function assertNoHostObjects(value) {
  if (!value || typeof value !== "object") return;
  assert.equal(value instanceof TFile, false, "Normalized record must not contain TFile");
  assert.equal(value instanceof TFolder, false, "Normalized record must not contain TFolder");
  if (Array.isArray(value)) {
    for (const item of value) assertNoHostObjects(item);
    return;
  }
  for (const item of Object.values(value)) assertNoHostObjects(item);
}

try {
  {
    const rootFolder = new TFolder("/");
    rootFolder.name = "";
    const nested = addChild(rootFolder, new TFolder("CaseFolder"));
    const note = addChild(nested, new TFile("CaseFolder/ReadMe.MD", { mtime: 41, ctime: 17, size: 321 }));
    // Obsidian extensions are normally lowercase; model that exact host fact while preserving name/path casing.
    note.extension = "md";
    note.basename = "ReadMe";
    const attachment = addChild(rootFolder, new TFile("Diagram.Final.PNG", { mtime: 52, ctime: 21, size: 777 }));
    attachment.extension = "png";
    attachment.basename = "Diagram.Final";
    const caches = new Map([[note.path, { tags: [
      { tag: "#Project/Shared/Leaf" },
      { tag: "#Project" },
    ] }]]);
    const { host, counters } = makeHost({ files: [note, attachment], rootFolder, caches });
    let checkpoints = 0;
    const collector = new ObsidianStructuralSourceCollector(host, {
      isCurrent: () => true, sourceRevision: () => 0,
      checkpoint: async () => { checkpoints += 1; return true; },
    });
    const batches = await collect(collector);
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

    const records = flattenRecords(batches);
    records.forEach(assertNoHostObjects);
    const rootEntity = records.find((record) => record.kind === "entity" && record.entity.semanticPath === "folder:/");
    assert(rootEntity);
    assert.equal(rootEntity.name, "/");
    assert.equal(rootEntity.entity.physicalPath, "/", "Real Obsidian root path is slash; later cases retain empty-path host-double coverage");

    const noteEntity = records.find((record) => record.kind === "entity" && record.entity.semanticPath === note.path);
    assert(noteEntity);
    assert.equal(noteEntity.name, "ReadMe");
    assert.deepEqual(noteEntity.file, {
      name: "ReadMe.MD",
      extension: "md",
      path: "CaseFolder/ReadMe.MD",
      mtime: 41,
      basename: "ReadMe",
      ctime: 17,
      size: 321,
    });
    assert.equal(collector.materializedFile(noteEntity.file), note);

    const attachmentEntity = records.find((record) => record.kind === "entity" && record.entity.semanticPath === attachment.path);
    assert(attachmentEntity);
    assert.equal(attachmentEntity.name, "Diagram.Final.PNG", "Attachment display names must preserve extensions");
    assert.equal(attachmentEntity.entity.kind, "attachment");

    const nestedTree = records.find((record) => record.kind === "file-tree" && record.target.entity.semanticPath === nested.path.replace(/^/, "folder:"));
    assert(nestedTree);
    assert.equal(nestedTree.source.semanticPath, "folder:/");
    const noteTree = records.find((record) => record.kind === "file-tree" && record.target.entity.semanticPath === note.path);
    assert(noteTree);
    assert.equal(noteTree.source.semanticPath, "folder:CaseFolder");

    const memberships = records.filter((record) => record.kind === "tag-tree" && record.membership === "entity-member");
    assert.equal(memberships.length, 2);
    const nestedTag = memberships.find((record) => record.provenance?.rawValue === "#Project/Shared/Leaf");
    assert(nestedTag);
    assert.equal(nestedTag.source.semanticPath, "#Project/Shared/Leaf", "Collector must preserve raw tag identity; GraphBuilder owns normalization");
    assert.equal(nestedTag.target.entity.semanticPath, note.path);
    assert.equal(nestedTag.contribution.source.semanticPath, note.path);
    assert.notEqual(nestedTag.contribution.revision, nestedTag.sourceRevision);
    assert.equal(counters.lookup, 1, "Only explicit legacy file binding should call getFileByPath in this direct collector test");
  }

  {
    // 128 children put the last file-tree occurrence at record 255 and its entity fact in the next batch.
    // This exercises the production contract that materialized targets may arrive in a later batch.
    const rootFolder = new TFolder("");
    rootFolder.name = "";
    const files = [];
    for (let index = 0; index < 128; index += 1) {
      const file = addChild(rootFolder, new TFile(`Note-${String(index).padStart(3, "0")}.md`, { mtime: index + 1, ctime: 1, size: 10 }));
      files.push(file);
    }
    const dense = files[0];
    const denseTags = Array.from({ length: 600 }, (_, index) => ({ tag: `#dense/group/tag-${index}` }));
    const caches = new Map([[dense.path, { tags: denseTags }]]);
    const { host } = makeHost({ files, rootFolder, caches });
    const collector = new ObsidianStructuralSourceCollector(host, { isCurrent: () => true, sourceRevision: () => 0, checkpoint: async () => true });
    const batches = await collect(collector);
    assert(batches.length >= 4);
    assert(batches.every((batch) => batch.records.length <= 256));
    const first = batches[0];
    const second = batches[1];
    assert.equal(first.records.length, 256);
    assert.equal(first.records.at(-1).kind, "file-tree");
    assert.equal(second.records[0].kind, "entity");
    assert.equal(first.records.at(-1).target.entity.id, second.records[0].entity.id, "File-tree target must be completable by the later entity batch");
    const memberships = flattenRecords(batches).filter((record) => record.kind === "tag-tree" && record.target.entity.semanticPath === dense.path);
    assert.equal(memberships.length, 600, "One dense note must span batches without truncating tag memberships");
    assert(new Set(memberships.map((record) => record.contribution.revision)).size === 1, "One note revision owns all memberships from that coherent tag read");
  }

  {
    const rootFolder = new TFolder("");
    rootFolder.name = "";
    const note = addChild(rootFolder, new TFile("Mutable.md", { mtime: 1, ctime: 1, size: 1 }));
    const cache = { tags: [{ tag: "#before" }] };
    const caches = new Map([[note.path, cache]]);
    const { host } = makeHost({ files: [note], rootFolder, caches });
    const collector = new ObsidianStructuralSourceCollector(host, { isCurrent: () => true, sourceRevision: () => 0, checkpoint: async () => true });
    assert.equal(await collector.collectBatches(() => true), true);
    cache.tags = [{ tag: "#after" }];
    assert.equal(await collector.finalize(), null, "A tag-cache change across awaited work must invalidate the structural read");
  }

  {
    const rootFolder = new TFolder("");
    rootFolder.name = "";
    const files = [];
    for (let index = 0; index < 100; index += 1) files.push(addChild(rootFolder, new TFile(`Cancel-${index}.md`)));
    const { host } = makeHost({ files, rootFolder, caches: new Map() });
    let calls = 0;
    const collector = new ObsidianStructuralSourceCollector(host, {
      isCurrent: () => true, sourceRevision: () => 0,
      checkpoint: async () => { calls += 1; return calls < 2; },
    });
    assert.equal(await collector.collectBatches(() => true), false, "Cancellation at an awaited checkpoint must stop collection");
    assert(calls >= 2);
    assert.equal(await collector.finalize(), null);
  }

  {
    const rootFolder = new TFolder("");
    const note = addChild(rootFolder, new TFile("Revision.md"));
    const { host } = makeHost({ files: [note], rootFolder, caches: new Map() });
    let revision = 1;
    let verifying = false;
    const collector = new ObsidianStructuralSourceCollector(host, {
      isCurrent: () => true,
      sourceRevision: () => revision,
      checkpoint: async () => {
        // The file's topology/stats have already been hashed. A later mutation must still fail.
        if (verifying) { note.stat.size += 1; revision += 1; }
        return true;
      },
    });
    assert.equal(await collector.collectBatches(() => true), true);
    verifying = true;
    assert.equal(await collector.finalize(), null, "An earlier entity changing during the yielding verification scan invalidates the read");
    assert.equal(collector.isBoundaryCurrent(collector.boundary), false);
  }

  {
    const rootFolder = new TFolder("");
    const { host } = makeHost({ files: [], rootFolder, caches: new Map() });
    const runtime = { isCurrent: () => true, sourceRevision: () => 0, checkpoint: async () => true };
    const rejected = new ObsidianStructuralSourceCollector(host, runtime);
    assert.equal(await rejected.collectBatches(() => false), false);
    assert.equal(await rejected.finalize(), null, "A rejected partial batch cannot finalize");
    assert.equal(await rejected.collectBatches(() => true), false, "Failed reads require a fresh collector");
    const replay = new ObsidianStructuralSourceCollector(host, runtime);
    assert.equal(await replay.collectBatches(async () => {
      assert.equal(await replay.collectBatches(() => true), false, "Reentrant collection cannot share a sequence");
      return true;
    }), true);
    assert(await replay.finalize());
    assert.equal(await replay.finalize(), null, "Finality cannot be replayed");
  }

  console.log("C12a structural source collector: bounded batches, later targets, dense tags, revision fences, validity and cancellation PASS");
} finally {
  rmSync(temp, { recursive: true, force: true });
}
