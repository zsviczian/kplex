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
  "src/core/contracts/fieldName.ts",
  "src/core/parser/metadata.ts",
  "src/core/parser/referenceValues.ts",
  "src/core/graph/source.ts",
  "src/index/fieldParser.ts",
  "src/adapters/obsidian/yieldToHostTask.ts",
  "src/adapters/obsidian/urlIdentity.ts",
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
const { ObsidianReferenceSourceCollector } = require(join(temp, "src/adapters/obsidian/ontologySourceCollector.js"));
const { extractLinksFromValue, extractLinkReferencesFromValue, iterateLinkReferencesFromValue } = require(join(temp, "src/index/fieldParser.js"));
const { MAX_NORMALIZED_SOURCE_RECORDS_PER_BATCH, acceptSourceBatch, beginSourceRead, sourceReadCanPublish } = require(join(temp, "src/core/graph/source.js"));
const { canonicalWebUrl } = require(join(temp, "src/adapters/obsidian/urlIdentity.js"));

function makeHost(files, resolutions = {}) {
  const byPath = new Map(files.map((file) => [file.path, file]));
  const calls = [];
  return {
    calls,
    host: {
      resolvedLinkCount: () => 0,
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
    const { canonicalWebUrl, webUrlOrigin } = require(join(temp, "src/adapters/obsidian/urlIdentity.js"));
    assert.equal(canonicalWebUrl("HTTPS://Obsidian.MD/"), "https://obsidian.md");
    assert.equal(canonicalWebUrl("https://Obsidian.md/?"), "https://obsidian.md?");
    assert.equal(canonicalWebUrl("https://Obsidian.md/#"), "https://obsidian.md#");
    assert.equal(canonicalWebUrl("https://Obsidian.md:443/Slug?Key=Value#Part"), "https://obsidian.md/Slug?Key=Value#Part");
    assert.notEqual(canonicalWebUrl("https://obsidian.md/Slug"), canonicalWebUrl("https://obsidian.md/slug"));
    assert.notEqual(canonicalWebUrl("https://obsidian.md?Key=Value"), canonicalWebUrl("https://obsidian.md?key=Value"));
    assert.notEqual(canonicalWebUrl("https://obsidian.md#Part"), canonicalWebUrl("https://obsidian.md#part"));
    assert.equal(canonicalWebUrl("https://bad:port/item"), "https://bad:port/item");
    assert.equal(webUrlOrigin("https://bad:port/item"), null);
    assert.equal(webUrlOrigin("https://Obsidian.md/slug1"), "https://obsidian.md");
    const source = new TFile("URL-property.md"), { host, calls } = makeHost([source]);
    const raw = "https://Obsidian.md/";
    const collector = new ObsidianReferenceSourceCollector(host, {
      isCurrent: () => true, sourceRevision: () => 1, checkpoint: async () => true,
    }, source, { frontmatter: { Parent: raw }, inlineFields: {}, inlineFieldOccurrences: [], aliases: [], tags: [], urls: [] });
    const records = (await collect(collector)).flatMap(batch => batch.records);
    const reference = records.find(record => record.kind === "reference-candidate");
    assert.equal(reference.target.entity.id, "https://obsidian.md");
    assert.equal(reference.target.rawTarget, raw, "property lexical target survives canonical identity normalization");
    assert.deepEqual(extractLinksFromValue(host, [raw, "https://obsidian.md"], source), ["https://obsidian.md"]);
    const urlOnly = new ObsidianReferenceSourceCollector(host, {
      isCurrent: () => true, sourceRevision: () => 1, checkpoint: async () => true,
    }, source, { frontmatter: { Parent: "[[Internal]] [Docs](https://Obsidian.md/)", Other: "[[Unrelated]]" },
      inlineFields: {}, inlineFieldOccurrences: [], aliases: [], tags: [], urls: [] }, { externalOnly: true });
    const isolated = (await collect(urlOnly)).flatMap(batch => batch.records);
    assert.deepEqual(isolated.filter(record => record.kind === "reference-candidate").map(record => record.target.entity.id), ["https://obsidian.md"]);
    assert.deepEqual(isolated.filter(record => record.kind === "reference-value").map(record => record.fieldName), ["Parent"]);
    assert.equal(isolated.find(record => record.kind === "reference-payload").text, "[[Internal]] [Docs](https://Obsidian.md/)");
    assert.equal(calls.length, 0, "external-only lane does not resolve unrelated internal references");
  }
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
    const collector = new ObsidianReferenceSourceCollector(host, {
      isCurrent: () => true, sourceRevision: () => 5, checkpoint: async () => true,
    }, source, meta);
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
    assert(records.some((record) => record.kind === "reference-value" && record.fieldName === "Ignored"));
    const parent = records.find(record => record.kind === "reference-value" && record.fieldName === "Parent");
    const topicFrontmatter = records.find(record => record.kind === "reference-candidate" && record.valueId === parent.valueId && record.target?.entity.semanticPath === topic.path);
    assert(topicFrontmatter);
    assert.equal(topicFrontmatter.target.rawTarget, "Topic#Heading");
    assert.equal(topicFrontmatter.target.subpath, "#Heading");
    assert.equal(topicFrontmatter.target.resolvedBy, "host");
    assert.equal(parent.fieldName, "Parent");
    assert.equal(records.filter(r => r.kind === "reference-payload" && r.valueId === parent.valueId).map(r => r.text).join(""), meta.frontmatter.Parent);

    const unresolved = records.find((record) => record.target?.entity.semanticPath === "Never There");
    assert(unresolved);
    assert.equal(unresolved.target.rawTarget, "Never%20There#Future");
    assert.equal(unresolved.target.subpath, "#Future");
    assert.equal(unresolved.target.resolvedBy, "unresolved");
    const external = records.find((record) => record.target?.entity.semanticPath === "https://example.com/path");
    assert(external);
    assert.equal(external.target.entity.kind, "url");
    assert.equal(external.target.resolvedBy, "url");

    const inline = records.find(record => record.kind === "reference-value" && record.surface === "inline");
    assert.equal(inline.fieldName, "PARENT", "physical inline field casing must be preserved");
    assert.equal("configuredFieldName" in inline, false, "assignment identity is not a source observation");
    assert.deepEqual(inline.location, { line: 7, start: 91, end: 130 });
    assert(calls.some(([linkpath, sourcePath]) => linkpath === "Topic" && sourcePath === source.path));
    const childValue = records.find(record => record.kind === "reference-value" && record.fieldName === "CHILD");
    assert.equal(records.filter(record => record.kind === "reference-candidate" && record.valueId === childValue.valueId).length, 1,
      "repeated targets in one nested frontmatter value remain deduplicated");
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
    const collectorA = new ObsidianReferenceSourceCollector(host, {
      isCurrent: () => true, sourceRevision: () => 6, checkpoint: async () => true,
    }, sourceA, meta);
    const collectorB = new ObsidianReferenceSourceCollector(host, {
      isCurrent: () => true, sourceRevision: () => 6, checkpoint: async () => true,
    }, sourceB, meta);
    const recordsA = (await collect(collectorA)).flatMap((batch) => batch.records);
    const recordsB = (await collect(collectorB)).flatMap((batch) => batch.records);
    assert.equal(recordsA.find(r => r.kind === "reference-candidate").target.entity.semanticPath, targetA.path, "ambiguous basenames must resolve relative to source A through the host");
    assert.equal(recordsB.find(r => r.kind === "reference-candidate").target.entity.semanticPath, targetB.path, "ambiguous basenames must resolve relative to source B through the host");
  }

  {
    const source = new TFile("Configured.md", 1, 10);
    const target = new TFile("Target.md");
    const { host } = makeHost([source, target], { Target: target });
    const meta = { frontmatter: { Parent: "[[Target]]" }, inlineFields: {}, inlineFieldOccurrences: [], aliases: [], tags: [], urls: [] };
    const collector = new ObsidianReferenceSourceCollector(host, {
      isCurrent: () => true, sourceRevision: () => 7, checkpoint: async () => true,
    }, source, meta);
    const records = (await collect(collector)).flatMap((batch) => batch.records);
    assert.deepEqual(records.filter(r => r.kind === "reference-value").map(r => r.fieldName), ["Parent"],
      "physical field identity is collected once, independently of configured exact/normalized multiplicity");
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
    const collector = new ObsidianReferenceSourceCollector(host, {
      isCurrent: () => true, sourceRevision: () => 2, checkpoint: async () => true,
    }, source, meta);
    const batches = await collect(collector);
    assert(batches.length >= 3, "dense ontology sources must stream through multiple bounded batches");
    assert(batches.every((batch) => batch.records.length <= MAX_NORMALIZED_SOURCE_RECORDS_PER_BATCH));
    assert.equal(batches.flatMap((batch) => batch.records).filter(r => r.kind === "reference-candidate").length, 600);
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
    const collector = new ObsidianReferenceSourceCollector(host, {
      isCurrent: () => true, sourceRevision: () => 3, checkpoint: async () => true,
    }, source, meta);
    const batches = await collect(collector);
    assert(batches.length >= 3, "one dense configured value must stream across bounded batches");
    assert(batches.every((batch) => batch.records.length <= MAX_NORMALIZED_SOURCE_RECORDS_PER_BATCH));
    const records = batches.flatMap((batch) => batch.records);
    assert.equal(records.filter(r => r.kind === "reference-candidate").length, 600);
    assert.equal(records.filter(r => r.kind === "reference-value").length, 1);
    assert.equal(records.filter(r => r.kind === "reference-payload").map(r => r.text).join(""), denseValue, "serialize the original value once, not once per target");
  }

  {
    let revision = 8;
    const source = new TFile("Revision.md", 4, 44);
    const { host } = makeHost([source]);
    const meta = { frontmatter: { Parent: "[[Ghost]]" }, inlineFields: {}, inlineFieldOccurrences: [], aliases: [], tags: [], urls: [] };
    const collector = new ObsidianReferenceSourceCollector(host, {
      isCurrent: () => true,
      sourceRevision: () => revision,
      checkpoint: async () => { revision += 1; return true; },
    }, source, meta);
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
      // Accepted discovery grammar stays unchanged. Only web authority/root identity is deliberately
      // normalized. The existing per-value deduplication now recognizes equivalent web identities.
      const expected = [...new Set(legacyExtract(value).map(canonicalWebUrl))];
      assert.deepEqual(extractLinksFromValue({ metadataCache: host.metadataCache }, value, source), expected, "compatibility wrapper preserves discovery with canonical web identities");
      const meta = { frontmatter: { Parent: value }, inlineFields: {}, inlineFieldOccurrences: [], aliases: [], tags: [], urls: [] };
      const collector = new ObsidianReferenceSourceCollector(host, { isCurrent: () => true, sourceRevision: () => 1, checkpoint: async () => true }, source, meta);
      const records = (await collect(collector)).flatMap(batch => batch.records);
      assert.deepEqual(records.filter(record => record.kind === "reference-candidate").map(record => record.target.entity.semanticPath), expected, "normalized collector preserves per-value target order and deduplication through canonical identity normalization");
    }
  }

  {
    const source = new TFile("Rejected.md", 4, 44);
    const { host } = makeHost([source]);
    const meta = { frontmatter: { Parent: "[[Ghost]]" }, inlineFields: {}, inlineFieldOccurrences: [], aliases: [], tags: [], urls: [] };
    const runtime = { isCurrent: () => true, sourceRevision: () => 1, checkpoint: async () => true };
    const collector = new ObsidianReferenceSourceCollector(host, runtime, source, meta);
    let reentrant;
    assert.equal(await collector.collectBatches(async () => {
      reentrant = await collector.collectBatches(() => true); return false;
    }), false);
    assert.equal(reentrant, false);
    assert.equal(collector.isBoundaryCurrent(collector.boundary), false);
    assert.equal(await collector.collectBatches(() => true), false, "failed attempts cannot replay");
    const changed = new ObsidianReferenceSourceCollector(host, { ...runtime, checkpoint: async () => { source.stat.mtime++; return true; } }, source, meta);
    assert.equal(await changed.collectBatches(() => true), false, "physical source change must invalidate the attempt");
    assert.equal(changed.isBoundaryCurrent(changed.boundary), false);
  }

  console.log("Neutral reference source collector tests passed.");
} finally {
  rmSync(temp, { recursive: true, force: true });
}
