/**
 * Tests K-Plex per-source patch preparation, cancellation and graph/evidence coherence using
 * portable transpiled production modules. Publication remains caller-owned and legacy fixture data is not rewritten.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { loadPortableModules } from "./support/portableTypeScript.mjs";
import { neutralizeLegacyReferenceFixtures } from "./support/referenceCandidateFixture.mjs";

const loaded = loadPortableModules(['src/core/graph/compiler.ts', 'src/core/graph/patch.ts', 'src/core/graph/model.ts', 'src/core/graph/source.ts', 'src/core/graph/relations.ts', 'src/core/graph/evidence.ts']);
const { exports: core } = loaded;

const settings = {
  hierarchy: {
    hidden: ["Hidden"],
    parents: ["Parent"],
    children: ["Children"],
    leftFriends: ["Friends"],
    rightFriends: ["Opposes"],
    previous: ["Previous"],
    next: ["Next"],
  },
  inferAllLinksAsFriends: false,
  inverseInfer: false,
  showFullTagName: true,
  tagStyleList: ["#project", "#person"],
  maxLabelLength: 30,
};

const runtime = (overrides = {}) => ({
  now: () => 0,
  yield: async () => {},
  isCurrent: () => true,
  sliceBudgetMs: 10,
  resolverBatchSize: 50,
  ...overrides,
});

const boundary = (name) => ({
  generation: core.sourceGeneration(`${name}:generation`),
  snapshotRevision: core.sourceSnapshotRevision(`${name}:snapshot`),
});

const entityFact = (entity, name, revision = "base:1") => ({
  kind: "entity",
  source: entity,
  sourceRevision: core.sourceRevision(revision),
  entity,
  name,
  url: entity.kind === "url" ? entity.semanticPath ?? null : null,
  semanticMtime: entity.kind === "document" ? 1 : null,
  ...(entity.kind === "document" && entity.semanticPath ? {
    file: { name: entity.semanticPath.split("/").pop(), extension: "md", path: entity.semanticPath, mtime: 1 },
  } : {}),
});

async function consumeOneRead(target, records, name = "read") {
  records = neutralizeLegacyReferenceFixtures(records);
  const b = boundary(name);
  const read = target.beginRead(b);
  let sequence = 0;
  for (let start = 0; start < records.length || (records.length === 0 && start === 0); start += core.MAX_NORMALIZED_SOURCE_RECORDS_PER_BATCH) {
    const batchRecords = records.slice(start, start + core.MAX_NORMALIZED_SOURCE_RECORDS_PER_BATCH);
    const final = records.length === 0 || start + batchRecords.length >= records.length;
    assert.equal(await target.acceptBatch(read, { boundary: b, sequence: sequence++, final, records: batchRecords }), true);
    if (final) break;
  }
  assert.equal(target.completeRead(read, b), true);
}

function semanticDeclaration(item) {
  return {
    sourceId: item.sourceId,
    targetId: item.targetId,
    declaredById: item.declaredById,
    declaredTargetId: item.declaredTargetId,
    role: item.role,
    relationType: item.relationType,
    direction: item.direction,
    sourceKind: item.sourceKind,
    definition: item.definition,
    fieldName: item.fieldName,
    rawValue: item.rawValue,
    line: item.line,
    start: item.start,
    end: item.end,
  };
}

function sortedDeclarations(iterable) {
  return [...iterable].map(semanticDeclaration).map((item) => JSON.stringify(item)).sort();
}

test("prepared source semantics equal the accepted full compiler for mixed source facts", async () => {
  const source = { id: core.nodeId("source-id"), kind: "document", state: "materialized", semanticPath: "A.md", physicalPath: "A.md" };
  const parent = { id: core.nodeId("parent-id"), kind: "document", state: "materialized", semanticPath: "Parent.md", physicalPath: "Parent.md" };
  const hidden = { id: core.nodeId("hidden-id"), kind: "document", state: "materialized", semanticPath: "Hidden.md", physicalPath: "Hidden.md" };
  const date = { id: core.nodeId("date-id"), kind: "document", state: "materialized", semanticPath: "Daily/2026-09-26.md", physicalPath: "Daily/2026-09-26.md" };
  const image = { id: core.nodeId("image-id"), kind: "attachment", state: "materialized", semanticPath: "img.png", physicalPath: "img.png" };
  const url = { id: core.nodeId("url-id"), kind: "url", state: "materialized", semanticPath: "https://example.com/path" };
  const origin = { id: core.nodeId("origin-id"), kind: "url", state: "materialized", semanticPath: "https://example.com" };
  const tag = { id: core.nodeId("tag:project/demo"), kind: "tag", state: "materialized", semanticPath: "tag:project/demo" };
  const rev = core.sourceRevision("A:2");
  const records = [
    entityFact(source, "A", "A:2"),
    { kind: "tag-tree", membership: "entity-member", source: tag, sourceRevision: rev, contribution: { source, revision: rev }, provenance: { surface: "host", definition: "tag-tree", rawValue: "#project/demo" }, target: { entity: source, rawTarget: "A.md", resolvedBy: "structural" } },
    { kind: "semantic-metadata", metadataKind: "alias", value: "Alias A", source, sourceRevision: rev, provenance: { surface: "frontmatter" } },
    { kind: "semantic-metadata", metadataKind: "tag", value: "#project/demo", source, sourceRevision: rev, provenance: { surface: "frontmatter" } },
    { kind: "semantic-metadata", metadataKind: "note-type", value: "[[Type X]]", source, sourceRevision: rev, provenance: { surface: "frontmatter" } },
    { kind: "semantic-metadata", metadataKind: "primary-tag-field", value: "#project", source, sourceRevision: rev, provenance: { surface: "frontmatter" } },
    { kind: "field-name", fieldName: "Parent", normalizedFieldName: "parent", surface: "frontmatter", source, sourceRevision: rev },
    { kind: "frontmatter-ontology", source, sourceRevision: rev, target: { entity: parent, rawTarget: "Parent", resolvedBy: "host" }, provenance: { configuredFieldName: "Parent", normalizedFieldName: "parent", fieldName: "Parent", rawValue: "[[Parent]]" } },
    { kind: "frontmatter-ontology", source, sourceRevision: rev, target: { entity: hidden, rawTarget: "Hidden", resolvedBy: "host" }, provenance: { configuredFieldName: "Hidden", normalizedFieldName: "hidden", fieldName: "Hidden", rawValue: "[[Hidden]]" } },
    { kind: "date-property", source, sourceRevision: rev, target: { entity: date, rawTarget: "2026-09-26", resolvedBy: "daily-notes" }, provenance: { fieldName: "Date", definition: "Date", rawValue: "2026-09-26" } },
    { kind: "obsidian-link", source, sourceRevision: rev, target: { entity: image, rawTarget: "img.png", resolvedBy: "host" }, occurrenceCount: 1 },
    { kind: "presentation-link", source, sourceRevision: rev, target: { entity: image, rawTarget: "img.png", resolvedBy: "host" }, hostOccurrenceCount: 1, surface: "frontmatter" },
    { kind: "body-url", source, sourceRevision: rev, target: { entity: url, rawTarget: "https://example.com/path", resolvedBy: "url" }, origin: { entity: origin, rawTarget: "https://example.com", resolvedBy: "url" }, label: "Friendly", provenance: { surface: "body", location: { line: 9 } } },
  ];
  const baseFacts = [entityFact(source, "A"), entityFact(parent, "Parent"), entityFact(hidden, "Hidden"), entityFact(date, "Date"), entityFact(image, "img.png")];

  const full = new core.NormalizedGraphCompiler(settings, runtime());
  await consumeOneRead(full, [...baseFacts.filter((fact) => fact.entity.id !== source.id), ...records], "full");
  const fullCompilation = await full.finish();
  assert(fullCompilation);

  let reads = 0;
  const byId = new Map(baseFacts.map((fact) => [fact.entity.id, fact]));
  const preparer = new core.NormalizedSourcePatchPreparer(source.id, settings, runtime(), {
    entity(ref) { reads += 1; return byId.get(ref.id); },
  });
  await consumeOneRead(preparer, records, "patch");
  const result = await preparer.finish();
  assert.equal(result.outcome, "prepared");
  const patch = result.patch;
  assert.deepEqual(sortedDeclarations(patch.declarations()), sortedDeclarations([...fullCompilation.declarations()].filter((item) => item.contribution.sourceId === source.id)));
  assert.deepEqual([...patch.compilation.discoveredFields], [...fullCompilation.discoveredFields]);
  assert.equal(patch.sourceNode.aliases[0], "Alias A");
  assert.equal(patch.sourceNode.noteType, "Type X");
  assert.equal(patch.sourceNode.primaryStyleTag, "#project");
  assert.equal([...patch.declarations()].some((item) => item.sourceKind === "obsidian-link" && item.targetId === image.id), false, "visual-only host link is suppressed by the shared compiler");
  assert(reads < 20, "preparation reads only identities referenced by this source, not the whole graph");
});

test("opaque and pathless identities remain exact through preparation", async () => {
  const source = { id: core.nodeId("opaque/source\u0000x"), kind: "unresolved", state: "unresolved" };
  const target = { id: core.nodeId("opaque/target\u0000y"), kind: "unresolved", state: "unresolved" };
  const sourceFact = entityFact(source, "Opaque source");
  const targetFact = entityFact(target, "Opaque target");
  const rev = core.sourceRevision("opaque:2");
  const records = [
    sourceFact,
    { kind: "inline-ontology", source, sourceRevision: rev, target: { entity: target, rawTarget: "display", resolvedBy: "unresolved" }, provenance: { configuredFieldName: "Parent", normalizedFieldName: "parent", fieldName: "Parent", rawValue: "display" } },
  ];
  const byId = new Map([[source.id, sourceFact], [target.id, targetFact]]);
  const preparer = new core.NormalizedSourcePatchPreparer(source.id, settings, runtime(), { entity: (ref) => byId.get(ref.id) });
  await consumeOneRead(preparer, records, "opaque");
  const result = await preparer.finish();
  assert.equal(result.outcome, "prepared");
  const declaration = [...result.patch.declarations()][0];
  assert.equal(declaration.sourceId, source.id);
  assert.equal(declaration.targetId, target.id);
  assert.equal("sourcePath" in declaration, false);
  assert.equal("targetPath" in declaration, false);
});

test("cancellation and rejected input are terminal without publishing a prepared patch", async () => {
  const source = { id: core.nodeId("A.md"), kind: "document", state: "materialized", semanticPath: "A.md", physicalPath: "A.md" };
  const sourceFact = entityFact(source, "A");
  let current = true;
  let yields = 0;
  const cancelRuntime = runtime({
    now: () => 100,
    sliceBudgetMs: 0,
    yield: async () => { yields += 1; current = false; },
    isCurrent: () => current,
  });
  const cancelled = new core.NormalizedSourcePatchPreparer(source.id, settings, cancelRuntime, { entity: () => sourceFact });
  const b = boundary("cancel");
  const read = cancelled.beginRead(b);
  assert.equal(await cancelled.acceptBatch(read, { boundary: b, sequence: 0, final: true, records: [sourceFact] }), false);
  assert(yields > 0);
  assert.equal((await cancelled.finish()).outcome, "cancelled");

  const rejected = new core.NormalizedSourcePatchPreparer(source.id, settings, runtime(), { entity: () => sourceFact });
  const good = boundary("good");
  const wrong = boundary("wrong");
  const rejectedRead = rejected.beginRead(good);
  assert.equal(await rejected.acceptBatch(rejectedRead, { boundary: wrong, sequence: 0, final: true, records: [sourceFact] }), false);
  assert.equal(await rejected.acceptBatch(rejectedRead, { boundary: good, sequence: 0, final: true, records: [sourceFact] }), false, "rejected preparation cannot be retried");
  assert.equal((await rejected.finish()).outcome, "rejected");
});

test("missing published source reports rebuild-required while unrelated graph size is irrelevant", async () => {
  const source = { id: core.nodeId("missing-source"), kind: "document", state: "materialized", semanticPath: "Missing.md", physicalPath: "Missing.md" };
  const rev = core.sourceRevision("missing:1");
  let lookups = 0;
  const preparer = new core.NormalizedSourcePatchPreparer(source.id, settings, runtime(), {
    entity() { lookups += 1; return undefined; },
  });
  await consumeOneRead(preparer, [{ kind: "field-name", source, sourceRevision: rev, fieldName: "X", normalizedFieldName: "x", surface: "frontmatter" }], "missing");
  const result = await preparer.finish();
  assert.equal(result.outcome, "rebuild-required");
  assert.equal(lookups, 1);
});

test("published first meaningful URL label survives recompiling a later referrer", async () => {
  const source = { id: core.nodeId("B.md"), kind: "document", state: "materialized", semanticPath: "B.md", physicalPath: "B.md" };
  const url = { id: core.nodeId("https://shared.example/path"), kind: "url", state: "materialized", semanticPath: "https://shared.example/path" };
  const origin = { id: core.nodeId("https://shared.example"), kind: "url", state: "materialized", semanticPath: "https://shared.example" };
  const sourceFact = entityFact(source, "B");
  const urlFact = { ...entityFact(url, "First label"), url: "https://shared.example/path" };
  const originFact = { ...entityFact(origin, "https://shared.example"), url: "https://shared.example" };
  const rev = core.sourceRevision("B:2");
  const records = [
    entityFact(source, "B", "B:2"),
    { kind: "body-url", source, sourceRevision: rev, target: { entity: url, rawTarget: "https://shared.example/path", resolvedBy: "url" }, origin: { entity: origin, rawTarget: "https://shared.example", resolvedBy: "url" }, label: "Later label", provenance: { surface: "body", location: { line: 3 } } },
  ];
  const byId = new Map([[source.id, sourceFact], [url.id, urlFact], [origin.id, originFact]]);
  const preparer = new core.NormalizedSourcePatchPreparer(source.id, settings, runtime(), { entity: (ref) => byId.get(ref.id) });
  await consumeOneRead(preparer, records, "shared-label");
  const result = await preparer.finish();
  assert.equal(result.outcome, "prepared");
  assert.equal(result.patch.compilation.node(url.id).name, "First label");
  assert.equal([...result.patch.declarations()].filter((item) => item.sourceKind === "url-origin").length, 1);
});

test("stable read port must return the exact requested identity", async () => {
  const source = { id: core.nodeId("Exact.md"), kind: "document", state: "materialized", semanticPath: "Exact.md", physicalPath: "Exact.md" };
  const other = { id: core.nodeId("Other.md"), kind: "document", state: "materialized", semanticPath: "Other.md", physicalPath: "Other.md" };
  const preparer = new core.NormalizedSourcePatchPreparer(source.id, settings, runtime(), {
    entity() { return entityFact(other, "Other"); },
  });
  const b = boundary("wrong-identity");
  const read = preparer.beginRead(b);
  assert.equal(await preparer.acceptBatch(read, { boundary: b, sequence: 0, final: true, records: [entityFact(source, "Exact")] }), false);
  assert.equal((await preparer.finish()).outcome, "rejected");
});

test("missing materialized semantic target reports rebuild-required instead of ambiguous rejection", async () => {
  const source = { id: core.nodeId("Source.md"), kind: "document", state: "materialized", semanticPath: "Source.md", physicalPath: "Source.md" };
  const target = { id: core.nodeId("Created.md"), kind: "document", state: "materialized", semanticPath: "Created.md", physicalPath: "Created.md" };
  const sourceFact = entityFact(source, "Source");
  const rev = core.sourceRevision("Source:2");
  const preparer = new core.NormalizedSourcePatchPreparer(source.id, settings, runtime(), {
    entity(ref) { return ref.id === source.id ? sourceFact : undefined; },
  });
  await consumeOneRead(preparer, [
    entityFact(source, "Source", "Source:2"),
    { kind: "frontmatter-ontology", source, sourceRevision: rev, target: { entity: target, rawTarget: "Created", resolvedBy: "host" }, provenance: { configuredFieldName: "Parent", normalizedFieldName: "parent", fieldName: "Parent", rawValue: "[[Created]]" } },
  ], "missing-materialized-target");
  assert.deepEqual(await preparer.finish(), { outcome: "rebuild-required", reason: "materialized-entity-not-published" });
});

test("case-distinct IDs and root/malformed URLs remain distinct without synthetic origin edges", async () => {
  const source = { id: core.nodeId("Case.md"), kind: "document", state: "materialized", semanticPath: "Case.md", physicalPath: "Case.md" };
  const upper = { id: core.nodeId("Case/Target"), kind: "unresolved", state: "unresolved" };
  const lower = { id: core.nodeId("case/target"), kind: "unresolved", state: "unresolved" };
  const rootUrl = { id: core.nodeId("https://root.example"), kind: "url", state: "materialized", semanticPath: "https://root.example" };
  const malformedUrl = { id: core.nodeId("http://[bad"), kind: "url", state: "materialized", semanticPath: "http://[bad" };
  const sourceFact = entityFact(source, "Case");
  const rev = core.sourceRevision("case:2");
  const records = [
    entityFact(source, "Case", "case:2"),
    { kind: "inline-ontology", source, sourceRevision: rev, target: { entity: upper, rawTarget: "Upper", resolvedBy: "unresolved" }, provenance: { configuredFieldName: "Parent", normalizedFieldName: "parent", fieldName: "Parent", rawValue: "Upper" } },
    { kind: "inline-ontology", source, sourceRevision: rev, target: { entity: lower, rawTarget: "Lower", resolvedBy: "unresolved" }, provenance: { configuredFieldName: "Parent", normalizedFieldName: "parent", fieldName: "Parent", rawValue: "Lower" } },
    { kind: "body-url", source, sourceRevision: rev, target: { entity: rootUrl, rawTarget: "https://root.example", resolvedBy: "url" }, origin: { entity: rootUrl, rawTarget: "https://root.example", resolvedBy: "url" }, provenance: { surface: "body" } },
    { kind: "body-url", source, sourceRevision: rev, target: { entity: malformedUrl, rawTarget: "http://[bad", resolvedBy: "url" }, provenance: { surface: "body" } },
  ];
  const preparer = new core.NormalizedSourcePatchPreparer(source.id, settings, runtime(), {
    entity(ref) { return ref.id === source.id ? sourceFact : undefined; },
  });
  await consumeOneRead(preparer, records, "case-urls");
  const result = await preparer.finish();
  assert.equal(result.outcome, "prepared");
  assert(result.patch.compilation.node(upper.id));
  assert(result.patch.compilation.node(lower.id));
  assert.notEqual(upper.id, lower.id);
  const declarations = [...result.patch.declarations()];
  assert.equal(declarations.filter((item) => item.sourceKind === "url-origin").length, 0);
  assert.equal(declarations.filter((item) => item.sourceKind === "body-url").length, 2);
});

test("invalid or oversized batches are rejected before any published entity lookup", async () => {
  const source = { id: core.nodeId("A.md"), kind: "document", state: "materialized", semanticPath: "A.md" };
  const fact = entityFact(source, "A");
  for (const variant of ["boundary", "sequence", "oversized"]) {
    let lookups = 0;
    const preparer = new core.NormalizedSourcePatchPreparer(source.id, settings, runtime(), {
      entity() { lookups += 1; return fact; },
    });
    const b = boundary(variant);
    const read = preparer.beginRead(b);
    const batch = {
      boundary: variant === "boundary" ? boundary("wrong") : b,
      sequence: variant === "sequence" ? 1 : 0,
      final: true,
      records: variant === "oversized" ? Array(core.MAX_NORMALIZED_SOURCE_RECORDS_PER_BATCH + 1).fill(fact) : [fact],
    };
    assert.equal(await preparer.acceptBatch(read, batch), false);
    assert.equal(lookups, 0, variant);
    assert.equal((await preparer.finish()).outcome, "rejected");
  }
});
