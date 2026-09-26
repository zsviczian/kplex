import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const temp = mkdtempSync(join(tmpdir(), "kplex-metadata-source-"));

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
  "src/core/parser/metadata.ts",
  "src/core/graph/source.ts",
  "src/index/fieldParser.ts",
  "src/adapters/obsidian/metadataSourceCollector.ts",
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
const {
  ObsidianMetadataSourceCollector,
  createObsidianMetadataSourceHost,
} = require(join(temp, "src/adapters/obsidian/metadataSourceCollector.js"));
const {
  MAX_NORMALIZED_SOURCE_RECORDS_PER_BATCH,
  acceptSourceBatch,
  beginSourceRead,
  sourceReadCanPublish,
} = require(join(temp, "src/core/graph/source.js"));

function makeMetadata(overrides = {}) {
  return {
    frontmatter: {},
    inlineFields: {},
    inlineFieldOccurrences: [],
    aliases: [],
    tags: [],
    urls: [],
    ...overrides,
  };
}

function makeHost(files, { dateFields = [], resolutions = {}, counts = {}, daily = { folder: "Daily", format: "YYYY/MM/YYYYMMDD" } } = {}) {
  const byPath = new Map(files.map((file) => [file.path, file]));
  const dateSet = new Set(dateFields);
  const calls = [];
  return {
    calls,
    host: {
      getFileByPath(path) { return byPath.get(path) ?? null; },
      resolveLinkpath(linkpath, sourcePath) {
        calls.push([linkpath, sourcePath]);
        return resolutions[`${sourcePath}\0${linkpath}`] ?? resolutions[linkpath] ?? null;
      },
      resolvedLinkCount(sourcePath, targetPath) { return counts[sourcePath]?.[targetPath] ?? 0; },
      isDateProperty(fieldName) { return dateSet.has(fieldName); },
      dailyNotesSettings() { return daily; },
      formatDailyDate(value, format) {
        assert.equal(format, daily?.format);
        const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
        if (!match) return null;
        return `${match[1]}/${match[2]}/${match[1]}${match[2]}${match[3]}`;
      },
    },
  };
}

async function collect(collector) {
  const batches = [];
  assert.equal(await collector.collectBatches((batch) => { batches.push(batch); return true; }), true);
  assert(batches.at(-1)?.final, "source-scoped metadata collection must close with a final batch");
  assert(batches.every((batch) => batch.records.length <= MAX_NORMALIZED_SOURCE_RECORDS_PER_BATCH));
  let cursor = beginSourceRead(collector.boundary);
  for (const batch of batches) {
    const accepted = acceptSourceBatch(cursor, batch);
    assert.equal(accepted.accepted, true);
    cursor = accepted.cursor;
  }
  assert.equal(sourceReadCanPublish(cursor, collector.boundary), true);
  assert.equal(collector.isBoundaryCurrent(collector.boundary), true);
  return batches.flatMap((batch) => batch.records);
}

function assertNoHostObject(value) {
  if (!value || typeof value !== "object") return;
  assert.equal(value instanceof TFile, false, "normalized C12c facts must not retain TFile");
  if (Array.isArray(value)) for (const item of value) assertNoHostObject(item);
  else for (const item of Object.values(value)) assertNoHostObject(item);
}

try {
  {
    // Accepted C12b map-based reads/extractor are an independent normalization oracle.
    const { extractLinksFromValue, getNormalizedFrontmatterValues, getNormalizedInlineFieldValues } =
      require(join(temp, "src/index/fieldParser.js"));
    const source = new TFile("Map-only.md");
    const image = new TFile("Image.png");
    const settings = { noteTypeField: "Type", primaryTagField: "Primary", thumbnailProperty: "Thumb", nodeImageProperty: "thumb" };
    const meta = makeMetadata({
      frontmatter: { Thumb: ["[[Image.png]]", "[[Image.png]]"], Type: ["Front", { ignored: image }] },
      inlineFields: { type: ["Map value"], primary: ["#Map"], thumb: ["[[Image.png]]", "[web](https://example.org/x )"] },
      inlineFieldOccurrences: [{ name: "Display name", normalizedName: "type", value: "Wrong occurrence value", line: 3, start: 0, end: 1 }],
    });
    const { host } = makeHost([source, image], { resolutions: { "Image.png": image }, counts: { [source.path]: { [image.path]: 2 } } });
    const runtime = { isCurrent: () => true, sourceRevision: () => 1, checkpoint: async () => true };
    const metadata = await collect(new ObsidianMetadataSourceCollector(host, runtime, source, meta, settings, "metadata"));
    assert.deepEqual(metadata.filter(r => r.metadataKind === "note-type").map(r => r.value), [["Front", { unsupported: true }], "Map value"]);
    assert.deepEqual(metadata.filter(r => r.metadataKind === "primary-tag-field").map(r => r.value), ["#Map"]);
    assert(metadata.some(r => r.kind === "field-name" && r.normalizedFieldName === "display-name"), "discovery normalizes physical names independently of the value map");
    metadata.forEach(assertNoHostObject);
    const invalid = await collect(new ObsidianMetadataSourceCollector(host, runtime, source,
      makeMetadata({ frontmatter: { Type: image }, inlineFields: { type: ["Must not win"] } }), settings, "metadata"));
    const inputs = invalid.filter(r => r.metadataKind === "note-type").map(r => r.value);
    assert.deepEqual(inputs, [{ unsupported: true }, "Must not win"]);
    assert.equal(typeof (inputs[0] ?? inputs[1]), "object", "non-null unsupported frontmatter must still block inline fallback");
    const emptyField = await collect(new ObsidianMetadataSourceCollector(host, runtime, source,
      makeMetadata({ frontmatter: { "": "Front empty" }, inlineFields: { "": ["Inline empty"] } }),
      { ...settings, noteTypeField: "", primaryTagField: "" }, "metadata"));
    assert.deepEqual(emptyField.filter(r => r.metadataKind === "note-type").map(r => r.value), ["Front empty", "Inline empty"],
      "empty configured semantic fields preserve accepted map lookup behavior");
    const values = [...getNormalizedFrontmatterValues(meta, "thumb"), ...getNormalizedInlineFieldValues(meta, "thumb")];
    const expectedTargets = values.flatMap(v => extractLinksFromValue({ metadataCache: { getFirstLinkpathDest: c => c === image.path ? image : null } }, v, source));
    const records = await collect(new ObsidianMetadataSourceCollector(host, runtime, source, meta, settings, "relations"));
    const presentation = records.filter(r => r.kind === "presentation-link");
    assert.deepEqual(presentation.map(r => r.target.entity.semanticPath), expectedTargets);
    assert.deepEqual(presentation.map(r => r.hostOccurrenceCount), expectedTargets.map(p => p === image.path ? 2 : 0));
    assert(!presentation.some(r => r.provenance.location), "map-owned values must not acquire invented occurrence locations");
  }
  {
    const source = new TFile("Dense-relations.md");
    const settings = { noteTypeField: "Type", primaryTagField: "Tag", thumbnailProperty: "Thumb", nodeImageProperty: "Image" };
    const { host } = makeHost([source], { dateFields: ["date"] });
    const metadata = makeMetadata({ frontmatter: { date: Array(600).fill("2026-09-18"), Thumb: Array.from({ length: 600 }, (_, i) => `[[Target-${i}]]`) },
      urls: Array.from({ length: 600 }, (_, i) => ({ url: `https://example.org/${i}`, line: i + 1 })) });
    let checkpoints = 0;
    const records = await collect(new ObsidianMetadataSourceCollector(host, { isCurrent: () => true, sourceRevision: () => 1,
      checkpoint: async () => { checkpoints++; return true; } }, source, metadata, settings, "relations"));
    assert.equal(records.length, 1800);
    assert(checkpoints >= 50, "dense Date, URL and single visual values stay cooperative");
    let revision = 1;
    const skipped = makeMetadata({ frontmatter: Object.fromEntries(Array.from({ length: 600 }, (_, i) => [`Other-${i}`, "ignored"])) });
    assert.equal(await new ObsidianMetadataSourceCollector(host, { isCurrent: () => true, sourceRevision: () => revision,
      checkpoint: async () => { revision++; return true; } }, source, skipped, settings, "relations").collectBatches(() => true), false,
      "skipped visual/property scans still fence cancellation at awaited checkpoints");
  }
  {
    const source = new TFile("Folder/Source.md", 10, 200);
    const daily = new TFile("Daily/2026/09/20260918.md", 20, 100);
    const image = new TFile("Assets/Picture.PNG", 30, 500);
    image.extension = "PNG";
    const { host, calls } = makeHost([source, daily, image], {
      dateFields: ["date", "follow-up-date"],
      resolutions: { [`${source.path}\0Assets/Picture.PNG`]: image },
    });
    const meta = makeMetadata({
      frontmatter: {
        "Note Type": ["[[Concept#Section|Shown]]", "Ignored second"],
        "Primary Tag": "#Project #Other",
        date: "2026-09-18",
        "follow-up-date": ["invalid", "2026-09-20", 7],
        Thumbnail: "[[Assets/Picture.PNG]] and [[Assets/Picture.PNG]]",
        "custom-status": "private arbitrary value",
      },
      inlineFields: {
        "note-type": ["#InlineType"],
        "primary-tag": ["#Other"],
        thumbnail: ["[[Assets/Picture.PNG]]"],
      },
      inlineFieldOccurrences: [
        { name: "NOTE TYPE", normalizedName: "note-type", value: "#InlineType", line: 7, start: 70, end: 95, syntax: "line" },
        { name: "Primary Tag", normalizedName: "primary-tag", value: "#Other", line: 8, start: 96, end: 120, syntax: "line" },
        { name: "thumbnail", normalizedName: "thumbnail", value: "[[Assets/Picture.PNG]]", line: 9, start: 121, end: 155, syntax: "line" },
      ],
      aliases: ["Alias One", "Alias Two"],
      tags: ["#Project", "#Project/Sub"],
      urls: [
        { url: "https://shared.example/item", label: "Shared", line: 41 },
        { url: "https://[broken", line: 42 },
      ],
    });
    const settings = { noteTypeField: "Note Type", primaryTagField: "Primary Tag", thumbnailProperty: "Thumbnail", nodeImageProperty: "thumbnail" };
    const runtime = { isCurrent: () => true, sourceRevision: () => 5, checkpoint: async () => true };

    const metadataRecords = await collect(new ObsidianMetadataSourceCollector(host, runtime, source, meta, settings, "metadata"));
    metadataRecords.forEach(assertNoHostObject);
    assert.deepEqual(metadataRecords.filter((r) => r.kind === "semantic-metadata" && r.metadataKind === "alias").map((r) => r.value), ["Alias One", "Alias Two"]);
    assert.deepEqual(metadataRecords.filter((r) => r.kind === "semantic-metadata" && r.metadataKind === "tag").map((r) => r.value), ["#Project", "#Project/Sub"]);
    const noteTypes = metadataRecords.filter((r) => r.kind === "semantic-metadata" && r.metadataKind === "note-type");
    assert.equal(noteTypes.length, 2, "competing frontmatter/inline note-type inputs must remain separate source facts");
    assert.deepEqual(noteTypes[0].value, meta.frontmatter["Note Type"], "frontmatter note-type arrays stay raw for compiler-owned unwrapping");
    assert.equal(noteTypes[1].value, "#InlineType");
    const primary = metadataRecords.filter((r) => r.kind === "semantic-metadata" && r.metadataKind === "primary-tag-field");
    assert.deepEqual(primary.map((r) => r.value), ["#Project #Other", "#Other"]);
    assert(metadataRecords.some((r) => r.kind === "field-name" && r.fieldName === "custom-status" && r.surface === "frontmatter"));
    assert.equal(metadataRecords.some((r) => r.value === "private arbitrary value" || r.provenance?.rawValue === "private arbitrary value"), false,
      "unrelated frontmatter values must not enter normalized graph facts");

    const relationRecords = await collect(new ObsidianMetadataSourceCollector(host, runtime, source, meta, settings, "relations"));
    relationRecords.forEach(assertNoHostObject);
    const dates = relationRecords.filter((r) => r.kind === "date-property");
    assert.equal(dates.length, 2);
    const existingDate = dates.find((r) => r.provenance.fieldName === "date");
    assert.equal(existingDate.target.entity.semanticPath, daily.path);
    assert.equal(existingDate.target.entity.state, "materialized");
    assert.equal(existingDate.target.entity.kind, "document");
    assert.equal(existingDate.provenance.rawValue, "2026-09-18");
    const missingDate = dates.find((r) => r.provenance.fieldName === "follow-up-date");
    assert.equal(missingDate.target.entity.semanticPath, "Daily/2026/09/20260920.md");
    assert.equal(missingDate.target.entity.state, "unresolved");
    assert.equal(dates.some((r) => r.provenance.rawValue === "invalid"), false);

    const urls = relationRecords.filter((r) => r.kind === "body-url");
    assert.equal(urls.length, 2);
    const shared = urls.find((r) => r.target.entity.semanticPath === "https://shared.example/item");
    assert.equal(shared.label, "Shared");
    assert.equal(shared.provenance.location.line, 41);
    assert.equal(shared.origin.entity.semanticPath, "https://shared.example");
    const malformed = urls.find((r) => r.target.entity.semanticPath === "https://[broken");
    assert.equal(malformed.origin, undefined, "malformed body URLs retain their raw node without invented origin input");

    const presentation = relationRecords.filter((r) => r.kind === "presentation-link");
    assert.equal(presentation.length, 2, "duplicate targets inside one property value deduplicate, while separate frontmatter/inline occurrences retain multiplicity");
    assert(presentation.every((r) => r.target.entity.semanticPath === image.path));
    assert(presentation.every((r) => r.target.entity.kind === "attachment"), "host-selected attachment kind/case must cross explicitly");
    assert.deepEqual(presentation.map((r) => r.surface), ["frontmatter", "inline"]);
    assert(presentation.every((r) => r.provenance.configuredFieldName === "Thumbnail"), "normalized duplicate visual settings must not double-count a configured field");
    assert(calls.some(([candidate, path]) => candidate === "Assets/Picture.PNG" && path === source.path), "presentation resolution remains source-relative and host-owned");
  }

  {
    const source = new TFile("Dense.md", 1, 1);
    const inlineFieldOccurrences = Array.from({ length: 600 }, (_, index) => ({
      name: `Field ${index}`,
      normalizedName: `field-${index}`,
      value: "x",
      line: index + 1,
      start: index * 3,
      end: index * 3 + 2,
      syntax: "line",
    }));
    const meta = makeMetadata({ inlineFieldOccurrences });
    const { host } = makeHost([source]);
    const collector = new ObsidianMetadataSourceCollector(host, {
      isCurrent: () => true, sourceRevision: () => 7, checkpoint: async () => true,
    }, source, meta, { noteTypeField: "Type", primaryTagField: "Tag", thumbnailProperty: "Thumb", nodeImageProperty: "Image" }, "field-names");
    const batches = [];
    assert.equal(await collector.collectBatches((batch) => { batches.push(batch); return true; }), true);
    assert(batches.length >= 3, "a dense single file must span bounded source batches");
    assert(batches.every((batch) => batch.records.length <= MAX_NORMALIZED_SOURCE_RECORDS_PER_BATCH));
    assert.equal(batches.flatMap((batch) => batch.records).length, 600);
  }

  {
    const source = new TFile("Cancel.md", 1, 1);
    const meta = makeMetadata({
      inlineFieldOccurrences: Array.from({ length: 80 }, (_, index) => ({
        name: `Field ${index}`, normalizedName: `field-${index}`, value: "x", line: index + 1, start: index, end: index + 1, syntax: "line",
      })),
    });
    const { host } = makeHost([source]);
    let revision = 1;
    let checkpoints = 0;
    const collector = new ObsidianMetadataSourceCollector(host, {
      isCurrent: () => true,
      sourceRevision: () => revision,
      checkpoint: async () => { checkpoints += 1; revision = 2; return true; },
    }, source, meta, { noteTypeField: "Type", primaryTagField: "Tag", thumbnailProperty: "Thumb", nodeImageProperty: "Image" }, "field-names");
    assert.equal(await collector.collectBatches(() => true), false, "source-event revision changes after awaited checkpoints reject the attempt");
    assert(checkpoints > 0);
    assert.equal(await collector.collectBatches(() => true), false, "failed/reentrant collectors cannot be replayed");
  }

  {
    const source = new TFile("Mutate.md", 1, 1);
    const { host } = makeHost([source]);
    const collector = new ObsidianMetadataSourceCollector(host, {
      isCurrent: () => true, sourceRevision: () => 3, checkpoint: async () => true,
    }, source, makeMetadata({ aliases: ["A"] }), { noteTypeField: "Type", primaryTagField: "Tag", thumbnailProperty: "Thumb", nodeImageProperty: "Image" }, "metadata");
    assert.equal(await collector.collectBatches((batch) => {
      if (batch.final) source.stat.size += 1;
      return true;
    }), false, "file mutation before finality must reject the source attempt");
  }

  {
    const target = new TFile("Daily/2026-09-18.md");
    const app = {
      vault: { getFileByPath(path) { return path === target.path ? target : null; } },
      metadataCache: { resolvedLinks: { "Source.md": { [target.path]: 3 } }, getFirstLinkpathDest(linkpath) { return linkpath === "Target" ? target : null; } },
      metadataTypeManager: {
        getPropertyInfo(name) { return name === "Date" ? { widget: "date" } : null; },
        getAssignedWidget(name) { return name === "Fallback Date" ? "date" : null; },
      },
      internalPlugins: {
        getPluginById(id) { return id === "daily-notes" ? { enabled: true, instance: { options: { folder: "/Daily//", format: "YYYY/MM/DD" } } } : null; },
      },
    };
    global.window = {
      moment(value, inputFormat, strict) {
        assert.equal(inputFormat, "YYYY-MM-DD");
        assert.equal(strict, true);
        return { isValid: () => value === "2026-09-18", format: (format) => format === "YYYY/MM/DD" ? "2026/09/18" : "bad" };
      },
    };
    const host = createObsidianMetadataSourceHost(app);
    assert.equal(host.isDateProperty("Date"), true);
    assert.equal(host.isDateProperty("Fallback Date"), true);
    assert.deepEqual(host.dailyNotesSettings(), { folder: "Daily", format: "YYYY/MM/DD" });
    assert.equal(host.formatDailyDate("2026-09-18", "YYYY/MM/DD"), "2026/09/18");
    assert.equal(host.formatDailyDate("bad", "YYYY/MM/DD"), null);
    assert.equal(host.resolveLinkpath("Target", "Source.md"), target);
    assert.equal(host.getFileByPath(target.path), target);
    assert.equal(host.resolvedLinkCount("Source.md", target.path), 3);
    assert.equal(host.resolvedLinkCount("Unknown.md", target.path), 0);
  }
} finally {
  rmSync(temp, { recursive: true, force: true });
  delete global.window;
}
