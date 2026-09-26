import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const temp = mkdtempSync(join(tmpdir(), "kplex-ontology-source-"));

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
  "src/index/fieldParser.ts",
  "src/adapters/obsidian/ontologySourceCollector.ts",
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
const { ObsidianOntologySourceCollector } = require(join(temp, "src/adapters/obsidian/ontologySourceCollector.js"));
const { extractLinksFromValue, extractLinkReferencesFromValue, iterateLinkReferencesFromValue } = require(join(temp, "src/index/fieldParser.js"));
const { MAX_NORMALIZED_SOURCE_RECORDS_PER_BATCH, acceptSourceBatch, beginSourceRead, sourceReadCanPublish } = require(join(temp, "src/core/graph/source.js"));

function makeHost(files, resolutions = {}) {
  const byPath = new Map(files.map((file) => [file.path, file]));
  const calls = [];
  return {
    calls,
    host: {
      vault: { getFileByPath(path) { return byPath.get(path) ?? null; } },
      metadataCache: {
        getFirstLinkpathDest(linkpath, sourcePath) {
          calls.push([linkpath, sourcePath]);
          return resolutions[`${sourcePath}\0${linkpath}`] ?? resolutions[linkpath] ?? null;
        },
      },
    },
  };
}

async function collect(collector) {
  const batches = [];
  assert.equal(await collector.collectBatches((batch) => { batches.push(batch); return true; }), true);
  return batches;
}

function assertNoHostObject(value) {
  if (!value || typeof value !== "object") return;
  assert.equal(value instanceof TFile, false, "normalized ontology facts must not retain TFile");
  if (Array.isArray(value)) for (const item of value) assertNoHostObject(item);
  else for (const item of Object.values(value)) assertNoHostObject(item);
}

try {
  {
    const source = new TFile("Folder/Source.md", 10, 100);
    const topic = new TFile("Folder/Topic.md", 20, 200);
    const child = new TFile("Folder/Child.md", 30, 300);
    const { host, calls } = makeHost([source, topic, child], {
      [`${source.path}\0Topic`]: topic,
      [`${source.path}\0Child`]: child,
    });
    const meta = {
      frontmatter: {
        Parent: "[[Topic#Heading|Visible]], [[Never%20There#Future]], [Child label](Child), https://example.com/path",
        CHILD: ["[[Child]]", "[[Child]]"],
        Ignored: "[[Topic]]",
      },
      inlineFields: {},
      inlineFieldOccurrences: [
        { name: "PARENT", normalizedName: "parent", value: "[[Topic#Block]] and [[Ghost]]", line: 7, start: 91, end: 130, syntax: "line" },
      ],
      aliases: [], tags: [], urls: [],
    };
    const collector = new ObsidianOntologySourceCollector(host, {
      isCurrent: () => true, sourceRevision: () => 5, checkpoint: async () => true,
    }, source, meta, ["Parent", "Parent", "CHILD"]);
    const batches = await collect(collector);
    assert(batches.at(-1).final, "source-scoped ontology collection must close with a final batch");
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
    assert.equal(records.some((record) => record.provenance?.fieldName === "Ignored"), false);
    const topicFrontmatter = records.find((record) => record.kind === "frontmatter-ontology" && record.target.entity.semanticPath === topic.path && record.provenance.configuredFieldName === "Parent");
    assert(topicFrontmatter);
    assert.equal(topicFrontmatter.target.rawTarget, "Topic#Heading");
    assert.equal(topicFrontmatter.target.subpath, "#Heading");
    assert.equal(topicFrontmatter.target.resolvedBy, "host");
    assert.equal(topicFrontmatter.provenance.fieldName, "Parent");
    assert.equal(topicFrontmatter.provenance.rawValue, meta.frontmatter.Parent);

    const unresolved = records.find((record) => record.target.entity.semanticPath === "Never There");
    assert(unresolved);
    assert.equal(unresolved.target.rawTarget, "Never%20There#Future");
    assert.equal(unresolved.target.subpath, "#Future");
    assert.equal(unresolved.target.resolvedBy, "unresolved");
    const external = records.find((record) => record.target.entity.semanticPath === "https://example.com/path");
    assert(external);
    assert.equal(external.target.entity.kind, "url");
    assert.equal(external.target.resolvedBy, "url");

    const inline = records.find((record) => record.kind === "inline-ontology" && record.target.entity.semanticPath === topic.path);
    assert(inline);
    assert.equal(inline.provenance.fieldName, "PARENT", "physical inline field casing must be preserved");
    assert.equal(inline.provenance.configuredFieldName, "Parent", "configured assignment identity must remain separate from physical field spelling");
    assert.deepEqual(inline.provenance.location, { line: 7, start: 91, end: 130 });
    assert(calls.some(([linkpath, sourcePath]) => linkpath === "Topic" && sourcePath === source.path), "host resolution must remain source-relative");

    const childRecords = records.filter((record) => record.provenance?.configuredFieldName === "CHILD" && record.target.entity.semanticPath === child.path);
    assert.equal(childRecords.length, 1, "legacy semantics deduplicate repeated targets within one configured frontmatter value");
  }

  {
    const sourceA = new TFile("A/Source.md", 1, 10);
    const sourceB = new TFile("B/Source.md", 1, 10);
    const targetA = new TFile("A/Topic.md");
    const targetB = new TFile("B/Topic.md");
    const { host } = makeHost([sourceA, sourceB, targetA, targetB], {
      [`${sourceA.path}\0Topic`]: targetA,
      [`${sourceB.path}\0Topic`]: targetB,
    });
    const meta = { frontmatter: { Parent: "[[Topic]]" }, inlineFields: {}, inlineFieldOccurrences: [], aliases: [], tags: [], urls: [] };
    const collectorA = new ObsidianOntologySourceCollector(host, {
      isCurrent: () => true, sourceRevision: () => 6, checkpoint: async () => true,
    }, sourceA, meta, ["Parent"]);
    const collectorB = new ObsidianOntologySourceCollector(host, {
      isCurrent: () => true, sourceRevision: () => 6, checkpoint: async () => true,
    }, sourceB, meta, ["Parent"]);
    const recordsA = (await collect(collectorA)).flatMap((batch) => batch.records);
    const recordsB = (await collect(collectorB)).flatMap((batch) => batch.records);
    assert.equal(recordsA[0].target.entity.semanticPath, targetA.path, "ambiguous basenames must resolve relative to source A through the host");
    assert.equal(recordsB[0].target.entity.semanticPath, targetB.path, "ambiguous basenames must resolve relative to source B through the host");
  }

  {
    const source = new TFile("Configured.md", 1, 10);
    const target = new TFile("Target.md");
    const { host } = makeHost([source, target], { Target: target });
    const meta = { frontmatter: { Parent: "[[Target]]" }, inlineFields: {}, inlineFieldOccurrences: [], aliases: [], tags: [], urls: [] };
    const collector = new ObsidianOntologySourceCollector(host, {
      isCurrent: () => true, sourceRevision: () => 7, checkpoint: async () => true,
    }, source, meta, ["Parent", "parent", "Parent"]);
    const records = (await collect(collector)).flatMap((batch) => batch.records);
    assert.deepEqual(records.map((record) => record.provenance.configuredFieldName), ["Parent", "parent"],
      "configured labels that normalize alike must remain distinct while exact duplicate assignments are left for the compiler to multiply");
  }

  {
    const refs = extractLinkReferencesFromValue("[[One#A|alias]] [two](Two#B) https://example.org/x");
    assert.deepEqual([...iterateLinkReferencesFromValue("[[One#A|alias]] [two](Two#B) https://example.org/x")], refs, "streaming and compatibility extraction APIs must share one grammar");
  }

  {
    const source = new TFile("Dense.md", 1, 1);
    const targets = [];
    const resolutions = {};
    const occurrences = [];
    for (let index = 0; index < 600; index += 1) {
      const target = new TFile(`Targets/T-${index}.md`);
      targets.push(target);
      resolutions[`T-${index}`] = target;
      occurrences.push({ name: "Parent", normalizedName: "parent", value: `[[T-${index}]]`, line: index + 1, start: index * 10, end: index * 10 + 8, syntax: "line" });
    }
    const { host } = makeHost([source, ...targets], resolutions);
    const meta = { frontmatter: {}, inlineFields: {}, inlineFieldOccurrences: occurrences, aliases: [], tags: [], urls: [] };
    const collector = new ObsidianOntologySourceCollector(host, {
      isCurrent: () => true, sourceRevision: () => 2, checkpoint: async () => true,
    }, source, meta, ["Parent"]);
    const batches = await collect(collector);
    assert(batches.length >= 3, "dense ontology sources must stream through multiple bounded batches");
    assert(batches.every((batch) => batch.records.length <= MAX_NORMALIZED_SOURCE_RECORDS_PER_BATCH));
    assert.equal(batches.flatMap((batch) => batch.records).length, 600);
  }

  {
    const source = new TFile("DenseValue.md", 1, 1);
    const targets = [];
    const resolutions = {};
    const links = [];
    for (let index = 0; index < 600; index += 1) {
      const target = new TFile(`Dense/T-${index}.md`);
      targets.push(target);
      resolutions[`T-${index}`] = target;
      links.push(`[[T-${index}]]`);
    }
    const denseValue = links.join(" ");
    const { host } = makeHost([source, ...targets], resolutions);
    const meta = { frontmatter: { Parent: denseValue }, inlineFields: {}, inlineFieldOccurrences: [], aliases: [], tags: [], urls: [] };
    const collector = new ObsidianOntologySourceCollector(host, {
      isCurrent: () => true, sourceRevision: () => 3, checkpoint: async () => true,
    }, source, meta, ["Parent"]);
    const batches = await collect(collector);
    assert(batches.length >= 3, "one dense configured value must stream across bounded batches");
    assert(batches.every((batch) => batch.records.length <= MAX_NORMALIZED_SOURCE_RECORDS_PER_BATCH));
    const records = batches.flatMap((batch) => batch.records);
    assert.equal(records.length, 600);
    assert(records.every((record) => record.provenance.rawValue === denseValue), "dense targets must reuse the original raw field value semantics");
  }

  {
    let revision = 8;
    const source = new TFile("Revision.md", 4, 44);
    const { host } = makeHost([source]);
    const meta = { frontmatter: { Parent: "[[Ghost]]" }, inlineFields: {}, inlineFieldOccurrences: [], aliases: [], tags: [], urls: [] };
    const collector = new ObsidianOntologySourceCollector(host, {
      isCurrent: () => true,
      sourceRevision: () => revision,
      checkpoint: async () => { revision += 1; return true; },
    }, source, meta, ["Parent"]);
    assert.equal(await collector.collectBatches(() => true), false, "source-event revision changes during a checkpoint must cancel collection");
  }


  // Frozen pre-C12b property extractor: characterize the production grammar rather than
  // comparing two new APIs that could share the same regression.
  {
    const source = new TFile("Grammar/Source.md");
    const target = new TFile("Grammar/Topic.md");
    const { host } = makeHost([source, target], { Topic: target });
    function legacyExtract(value) {
      const found = new Set();
      const resolve = raw => {
        let candidate = raw.trim();
        try { candidate = decodeURIComponent(candidate); } catch { /* legacy undecodable input */ }
        const hash = candidate.indexOf("#");
        if (hash >= 0) candidate = candidate.slice(0, hash);
        return host.metadataCache.getFirstLinkpathDest(candidate, source.path)?.path ?? candidate;
      };
      function scan(input) {
        if (Array.isArray(input)) { input.forEach(scan); return; }
        if (input && typeof input === "object") { Object.values(input).forEach(scan); return; }
        if (typeof input !== "string") return;
        for (const m of input.matchAll(/\[\[([^\]#|]+)(?:#[^\]|]*)?(?:\|[^\]]*)?\]\]/g)) found.add(resolve(m[1]));
        for (const m of input.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) found.add(/^https?:\/\//i.test(m[1]) ? m[1] : resolve(m[1]));
        for (const m of input.matchAll(/\bhttps?:\/\/[^\s<>()\u005B\u005D{}"']+/gi)) found.add(m[0].replace(/[.,;:!?]+$/, ""));
      }
      scan(value); return [...found].filter(Boolean);
    }
    const corpus = [
      "[[Topic#Heading|alias]] [[Topic%23Heading]] [[Never%20There#Future]]",
      "[external](https://example.org/x ) [leading]( https://example.org/y )",
      "[[https://example.org/x#Fragment|alias]] https://example.org/x#Fragment",
      "[[#Heading]] [[Topic|alias]] [[%ZZ]] [block](Topic#^block)",
      { a: ["[[Topic]]", "[[Topic]]"], b: "[label](Never%20There) https://example.org/x!" },
    ];
    for (const value of corpus) {
      const expected = legacyExtract(value);
      assert.deepEqual(extractLinksFromValue({ metadataCache: host.metadataCache }, value, source), expected, "compatibility wrapper must preserve accepted grammar and exact targets");
      const meta = { frontmatter: { Parent: value }, inlineFields: {}, inlineFieldOccurrences: [], aliases: [], tags: [], urls: [] };
      const collector = new ObsidianOntologySourceCollector(host, { isCurrent: () => true, sourceRevision: () => 1, checkpoint: async () => true }, source, meta, ["Parent"]);
      const records = (await collect(collector)).flatMap(batch => batch.records);
      assert.deepEqual(records.map(record => record.target.entity.semanticPath), expected, "normalized collector must preserve legacy target deduplication/order");
    }
  }

  {
    const source = new TFile("Rejected.md", 4, 44);
    const { host } = makeHost([source]);
    const meta = { frontmatter: { Parent: "[[Ghost]]" }, inlineFields: {}, inlineFieldOccurrences: [], aliases: [], tags: [], urls: [] };
    const runtime = { isCurrent: () => true, sourceRevision: () => 1, checkpoint: async () => true };
    const collector = new ObsidianOntologySourceCollector(host, runtime, source, meta, ["Parent"]);
    let reentrant;
    assert.equal(await collector.collectBatches(async () => {
      reentrant = await collector.collectBatches(() => true); return false;
    }), false);
    assert.equal(reentrant, false);
    assert.equal(collector.isBoundaryCurrent(collector.boundary), false);
    assert.equal(await collector.collectBatches(() => true), false, "failed attempts cannot replay");
    const changed = new ObsidianOntologySourceCollector(host, { ...runtime, checkpoint: async () => { source.stat.mtime++; return true; } }, source, meta, ["Parent"]);
    assert.equal(await changed.collectBatches(() => true), false, "physical source change must invalidate the attempt");
    assert.equal(changed.isBoundaryCurrent(changed.boundary), false);
  }

  console.log("Ontology normalized source collector tests passed.");
} finally {
  rmSync(temp, { recursive: true, force: true });
}
