import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";
import { produceNormalizedFixtureRecords } from "./support/normalizedSourceFixture.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const temp = mkdtempSync(join(tmpdir(), "kplex-graph-compiler-"));
process.on("exit", () => rmSync(temp, { recursive: true, force: true }));
const corePath = join(temp, "graph-compiler.mjs");
await build({
  stdin: {
    contents: [
      'export * from "./src/core/graph/compiler.ts";',
      'export * from "./src/core/graph/model.ts";',
      'export * from "./src/core/graph/source.ts";',
      'export * from "./src/core/graph/relations.ts";',
      'export * from "./src/core/graph/evidence.ts";',
    ].join("\n"),
    resolveDir: root,
    sourcefile: "graph-compiler-entry.ts",
    loader: "ts",
  },
  outfile: corePath,
  bundle: true,
  platform: "node",
  format: "esm",
  target: "es2021",
});
const core = await import(pathToFileURL(corePath).href);

const settings = {
  hierarchy: {
    hidden: ["hidden"],
    parents: ["Parent", "Parents", "up", "u", "North", "origin", "inception", "source", "parent domain"],
    children: ["Children", "Child", "down", "d", "South", "leads to", "contributes to", "nurtures"],
    leftFriends: ["Friends", "Friend", "Jump", "Jumps", "j", "similar", "supports", "alternatives", "advantages", "pros"],
    rightFriends: ["opposes", "disadvantages", "missing", "cons", "Challenger"],
    previous: ["Previous", "Prev", "West", "w", "Before"],
    next: ["Next", "n", "East", "e", "After"],
    exclusions: [],
  },
  inferAllLinksAsFriends: false,
  inverseInfer: false,
  excalibrainFilepath: "Excalibrain.md",
  showFullTagName: true,
  noteTypeField: "Note type",
  primaryTagField: "Note type",
  tagStyleList: ["#project", "#person"],
  maxLabelLength: 30,
};

const runtime = (overrides = {}) => ({
  now: () => 0,
  yield: async () => {},
  isCurrent: () => true,
  sliceBudgetMs: 10,
  resolverBatchSize: 400,
  ...overrides,
});

const boundary = (name = "fixture") => ({
  generation: core.sourceGeneration(`${name}:generation`),
  snapshotRevision: core.sourceSnapshotRevision(`${name}:snapshot`),
});

async function compileRecords(records, options = {}) {
  const compiler = new core.NormalizedGraphCompiler(options.settings ?? settings, options.runtime ?? runtime());
  const readBoundary = options.boundary ?? boundary("compile");
  const read = compiler.beginRead(readBoundary);
  if (records.length === 0) {
    assert.equal(await compiler.acceptBatch(read, { boundary: readBoundary, sequence: 0, final: true, records: [] }), true);
  } else {
    for (let start = 0, sequence = 0; start < records.length; start += core.MAX_NORMALIZED_SOURCE_RECORDS_PER_BATCH, sequence += 1) {
      const batchRecords = records.slice(start, start + core.MAX_NORMALIZED_SOURCE_RECORDS_PER_BATCH);
      assert.equal(await compiler.acceptBatch(read, {
        boundary: readBoundary,
        sequence,
        final: start + batchRecords.length === records.length,
        records: batchRecords,
      }), true);
    }
  }
  assert.equal(compiler.completeRead(read, options.currentBoundary ?? readBoundary), options.expectComplete ?? true);
  return { compiler, compilation: options.expectComplete === false ? null : await compiler.finish() };
}

const stableSort = (items) => items.map((item) => JSON.stringify(item)).sort();
const optional = (key, value) => value === undefined ? {} : { [key]: value };

function cleanRelation(relation) {
  return {
    actualTargetPath: relation.target.semanticPath,
    direction: relation.direction,
    isHidden: relation.isHidden,
    isParent: relation.isParent,
    ...optional("parentType", relation.parentType),
    ...optional("parentTypeDefinition", relation.parentTypeDefinition),
    isChild: relation.isChild,
    ...optional("childType", relation.childType),
    ...optional("childTypeDefinition", relation.childTypeDefinition),
    isLeftFriend: relation.isLeftFriend,
    ...optional("leftFriendType", relation.leftFriendType),
    ...optional("leftFriendTypeDefinition", relation.leftFriendTypeDefinition),
    isRightFriend: relation.isRightFriend,
    ...optional("rightFriendType", relation.rightFriendType),
    ...optional("rightFriendTypeDefinition", relation.rightFriendTypeDefinition),
    isNextFriend: relation.isNextFriend,
    ...optional("nextFriendType", relation.nextFriendType),
    ...optional("nextFriendTypeDefinition", relation.nextFriendTypeDefinition),
    isPreviousFriend: relation.isPreviousFriend,
    ...optional("previousFriendType", relation.previousFriendType),
    ...optional("previousFriendTypeDefinition", relation.previousFriendTypeDefinition),
    targetPath: relation.target.semanticPath,
  };
}

function cleanPage(node) {
  return {
    aliases: [...node.aliases],
    isFolder: node.kind === "container",
    isTag: node.kind === "tag",
    maxLabelLength: node.maxLabelLength,
    name: node.name,
    noteType: node.noteType,
    path: node.semanticPath,
    physicalExtension: node.file?.extension ?? null,
    physicalPath: node.file?.path ?? null,
    primaryStyleTag: node.primaryStyleTag,
    relations: [...node.neighbours.values()].map(cleanRelation).sort((left, right) => left.targetPath.localeCompare(right.targetPath)),
    styleTags: [...node.styleTags],
    tags: [...node.tags],
    url: node.url,
  };
}

function semanticDeclaration(item) {
  return {
    sourcePath: item.sourcePath,
    targetPath: item.targetPath,
    role: item.role,
    relationType: item.relationType,
    direction: item.direction,
    declaredByPath: item.declaredByPath,
    declaredTargetPath: item.declaredTargetPath,
    declaredRole: item.declaredRole,
    sourceKind: item.sourceKind,
    ...optional("definition", item.definition),
    ...optional("fieldName", item.fieldName),
  };
}

test("portable full compiler matches the frozen pre-move compatibility graph semantics", async () => {
  const fixtureRoot = join(root, "tests/fixtures/excalibrain-indexing/Vault");
  const baseline = JSON.parse(readFileSync(join(root, "tests/fixtures/excalibrain-indexing/graph-baseline.json"), "utf8")).graph;
  const produced = produceNormalizedFixtureRecords(fixtureRoot).records;
  // Production structural collectors own materialized document/attachment/container entity facts.
  // Synthetic tag/URL/unresolved entity facts at the tail of this test producer are C11 contract
  // coverage only; the C13c compiler derives those targets from their occurrence records.
  const compatibilityRecords = produced.filter((record) => record.kind !== "entity"
    || ["document", "attachment", "container"].includes(record.entity.kind));
  // Mirror production family ordering: structural inventory is complete before aggregate host-link
  // summaries are consumed, while structural file/tag edges may still precede their entity facts.
  // The standalone C11 producer interleaves per-file host rows before appending folder topology.
  const familyRank = (record) => record.kind === "entity" || record.kind === "file-tree" || record.kind === "tag-tree" ? 0
    : record.kind === "obsidian-link" || record.kind === "unresolved-link" ? 1 : 2;
  const records = compatibilityRecords.map((record, index) => ({ record, index }))
    .sort((left, right) => familyRank(left.record) - familyRank(right.record) || left.index - right.index)
    .map(({ record }) => record);
  const { compilation } = await compileRecords(records);
  assert(compilation);

  const actualPages = [...compilation.nodes.values()]
    .map(cleanPage)
    .sort((left, right) => left.path.localeCompare(right.path));
  const expectedPages = [...baseline.pages]
    .map((page) => ({ ...page, relations: [...page.relations].sort((left, right) => left.targetPath.localeCompare(right.targetPath)) }))
    .sort((left, right) => left.path.localeCompare(right.path));
  assert.deepEqual(actualPages, expectedPages, "full compiler page/relation output must remain frozen-baseline compatible");

  const actualDeclarations = stableSort([...compilation.declarations()].map(semanticDeclaration));
  const expectedDeclarations = stableSort(baseline.declarations.map(semanticDeclaration));
  assert.deepEqual(actualDeclarations, expectedDeclarations, "all declaration families, multiplicity and semantic provenance must match the pre-move oracle");
  assert.equal(compilation.legacyEvidence()?.declarationCount, baseline.declarations.length);
});

test("opaque NodeId is primary identity for pathless and case-distinct entities", async () => {
  const rev = core.sourceRevision("identity:1");
  const pathlessSource = { id: core.nodeId("opaque-source"), kind: "unresolved", state: "unresolved" };
  const pathlessTarget = { id: core.nodeId("opaque-target"), kind: "unresolved", state: "unresolved" };
  const upper = { id: core.nodeId("case-upper"), kind: "document", state: "materialized", semanticPath: "Case/Thing.md", physicalPath: "Case/Thing.md" };
  const lower = { id: core.nodeId("case-lower"), kind: "document", state: "materialized", semanticPath: "case/thing.md", physicalPath: "case/thing.md" };
  const records = [
    { kind: "entity", source: pathlessSource, sourceRevision: rev, entity: pathlessSource, name: "Pathless source", url: null },
    { kind: "entity", source: pathlessTarget, sourceRevision: rev, entity: pathlessTarget, name: "Pathless target", url: null },
    { kind: "inline-ontology", source: pathlessSource, sourceRevision: rev, target: { entity: pathlessTarget, rawTarget: "display-only", resolvedBy: "unresolved" }, provenance: { configuredFieldName: "Parent", normalizedFieldName: "parent", fieldName: "Parent", definition: "parent" } },
    { kind: "entity", source: upper, sourceRevision: rev, entity: upper, name: "Upper", url: null, file: { name: "Thing.md", extension: "md", path: "Case/Thing.md", mtime: 1 } },
    { kind: "entity", source: lower, sourceRevision: rev, entity: lower, name: "Lower", url: null, file: { name: "thing.md", extension: "md", path: "case/thing.md", mtime: 1 } },
    { kind: "inline-ontology", source: upper, sourceRevision: rev, target: { entity: lower, rawTarget: "case/thing", resolvedBy: "host" }, provenance: { configuredFieldName: "Parent", normalizedFieldName: "parent", fieldName: "Parent", definition: "parent" } },
  ];
  const { compilation } = await compileRecords(records);
  assert(compilation);
  assert.equal(compilation.nodes.size, 4);
  assert.equal(compilation.node(pathlessSource.id).semanticPath, undefined);
  assert.equal(compilation.node(pathlessTarget.id).semanticPath, undefined);
  assert.notEqual(compilation.node(upper.id), compilation.node(lower.id));
  assert.equal(compilation.node(upper.id).semanticPath, "Case/Thing.md");
  assert.equal(compilation.node(lower.id).semanticPath, "case/thing.md");
  assert.equal(compilation.node(pathlessSource.id).neighbours.size, 1);
  assert.equal([...compilation.node(pathlessSource.id).neighbours.values()][0].target.id, pathlessTarget.id);
  const pathlessEvidence = compilation.evidenceBetween(pathlessSource.id, pathlessTarget.id);
  assert.equal(pathlessEvidence.length, 1);
  assert.equal(pathlessEvidence[0].sourceId, pathlessSource.id);
  assert.equal(pathlessEvidence[0].targetId, pathlessTarget.id);
  assert.equal("sourcePath" in pathlessEvidence[0], false, "opaque IDs must never be projected as synthetic semantic paths");
  assert.equal("targetPath" in pathlessEvidence[0], false, "opaque IDs must never be projected as synthetic semantic paths");
  assert.equal(compilation.legacyEvidence(), null, "legacy path publication is intentionally unavailable for pathless portable graphs");
});

test("streaming accepts later materialized facts, ignores stale host-map rows, and rejects incoherent reads", async () => {
  const rev = core.sourceRevision("stream:1");
  const source = { id: core.nodeId("source-id"), kind: "document", state: "materialized", semanticPath: "A.md", physicalPath: "A.md" };
  const target = { id: core.nodeId("target-id"), kind: "document", state: "materialized", semanticPath: "B.md", physicalPath: "B.md" };
  const staleSource = { id: core.nodeId("stale-source"), kind: "document", state: "missing", semanticPath: "Deleted.md" };
  const staleTarget = { id: core.nodeId("stale-target"), kind: "document", state: "missing", semanticPath: "Gone.md" };
  const untrackedMaterializedTarget = { id: core.nodeId("untracked-target"), kind: "attachment", state: "materialized", semanticPath: "Loose.jpg", physicalPath: "Loose.jpg" };
  const fileTree = {
    kind: "file-tree", source, sourceRevision: rev,
    target: { entity: target, rawTarget: "B.md", resolvedBy: "structural" },
  };
  const records = [
    fileTree,
    { kind: "entity", source, sourceRevision: rev, entity: source, name: "A", url: null, file: { name: "A.md", extension: "md", path: "A.md", mtime: 1 } },
    { kind: "entity", source: target, sourceRevision: rev, entity: target, name: "B", url: null, file: { name: "B.md", extension: "md", path: "B.md", mtime: 1 } },
    { kind: "obsidian-link", source, sourceRevision: rev, target: { entity: target, rawTarget: "B", resolvedBy: "host" }, occurrenceCount: 1 },
    { kind: "obsidian-link", source: staleSource, sourceRevision: rev, target: { entity: target, rawTarget: "B", resolvedBy: "host" }, occurrenceCount: 1 },
    { kind: "obsidian-link", source, sourceRevision: rev, target: { entity: staleTarget, rawTarget: "Gone", resolvedBy: "host" }, occurrenceCount: 1 },
    { kind: "obsidian-link", source, sourceRevision: rev, target: { entity: untrackedMaterializedTarget, rawTarget: "Loose.jpg", resolvedBy: "host" }, occurrenceCount: 1 },
  ];
  const { compilation } = await compileRecords(records);
  assert(compilation);
  assert.equal(compilation.nodes.size, 2, "stale host-cache rows must not materialize deleted/missing graph nodes");
  assert.equal(compilation.node(source.id).neighbours.size, 1);
  assert.equal([...compilation.node(source.id).neighbours.values()][0].target.id, target.id);

  const compiler = new core.NormalizedGraphCompiler(settings, runtime());
  const expected = boundary("coherent");
  const wrong = boundary("changed");
  const read = compiler.beginRead(expected);
  assert.equal(await compiler.acceptBatch(read, { boundary: expected, sequence: 0, final: true, records: [] }), true);
  assert.equal(compiler.completeRead(read, wrong), false, "a changed generation/snapshot fence must reject publication");
  assert.equal(await compiler.finish(), null, "an unclosed incoherent read keeps all compiler state private");

  const incomplete = new core.NormalizedGraphCompiler(settings, runtime());
  const incompleteBoundary = boundary("missing-entity");
  const incompleteRead = incomplete.beginRead(incompleteBoundary);
  assert.equal(await incomplete.acceptBatch(incompleteRead, { boundary: incompleteBoundary, sequence: 0, final: true, records: [fileTree] }), true);
  assert.equal(incomplete.completeRead(incompleteRead, incompleteBoundary), true);
  assert.equal(await incomplete.finish(), null, "materialized references must have entity facts before a full result can publish");
});

test("compiler cancellation is checked after awaited yields and during cooperative resolution", async () => {
  const rev = core.sourceRevision("cancel:1");
  const source = { id: core.nodeId("cancel-source"), kind: "unresolved", state: "unresolved" };
  const target = { id: core.nodeId("cancel-target"), kind: "unresolved", state: "unresolved" };
  const record = { kind: "inline-ontology", source, sourceRevision: rev, target: { entity: target, rawTarget: "target", resolvedBy: "unresolved" }, provenance: { configuredFieldName: "Parent", normalizedFieldName: "parent", fieldName: "Parent" } };

  let current = true;
  let clock = 0;
  let yields = 0;
  const compiler = new core.NormalizedGraphCompiler(settings, runtime({
    now: () => (clock += 20),
    yield: async () => { yields += 1; current = false; },
    isCurrent: () => current,
    sliceBudgetMs: 1,
  }));
  const firstBoundary = boundary("cancel-batch");
  const read = compiler.beginRead(firstBoundary);
  assert.equal(await compiler.acceptBatch(read, { boundary: firstBoundary, sequence: 0, final: true, records: [record] }), false);
  assert.equal(yields, 1);
  assert.equal(await compiler.finish(), null);

  current = true;
  clock = 0;
  yields = 0;
  const resolverCompiler = new core.NormalizedGraphCompiler(settings, runtime({
    now: () => (clock += 8),
    yield: async () => { yields += 1; current = false; },
    isCurrent: () => current,
    sliceBudgetMs: 10_000,
    resolverBatchSize: 1,
  }));
  const secondBoundary = boundary("cancel-resolver");
  const secondRead = resolverCompiler.beginRead(secondBoundary);
  assert.equal(await resolverCompiler.acceptBatch(secondRead, { boundary: secondBoundary, sequence: 0, final: true, records: [record] }), true);
  assert.equal(resolverCompiler.completeRead(secondRead, secondBoundary), true);
  assert.equal(await resolverCompiler.finish(), null, "resolver cancellation after its awaited host yield must abort publication");
  assert(yields >= 1);
});

test("compiler reports bounded cooperative progress on a dense portable graph", async () => {
  const records = [];
  const rev = core.sourceRevision("dense:1");
  for (let index = 0; index < 600; index += 1) {
    const entity = { id: core.nodeId(`opaque-${index}`), kind: "unresolved", state: "unresolved" };
    records.push({ kind: "entity", source: entity, sourceRevision: rev, entity, name: `Node ${index}`, url: null });
  }
  let progress = 0;
  const { compilation } = await compileRecords(records, { runtime: runtime({ resolverBatchSize: 64, onProgress: () => { progress += 1; } }) });
  assert(compilation);
  assert.equal(compilation.nodes.size, 600);
  assert(progress > 0, "dense resolution must expose progress checkpoints without whole-vault publication");
});

test("portable compiler bundle loads without Obsidian or browser globals", () => {
  const result = spawnSync(process.execPath, ["--input-type=module", "-e", `
    import assert from "node:assert/strict";
    const core = await import(${JSON.stringify(pathToFileURL(corePath).href)});
    assert.equal(typeof globalThis.window, "undefined");
    assert.equal(typeof globalThis.document, "undefined");
    assert.equal(typeof globalThis.Worker, "undefined");
    const compiler = new core.NormalizedGraphCompiler(${JSON.stringify(settings)}, {
      now: () => 0, yield: async () => {}, isCurrent: () => true, sliceBudgetMs: 10, resolverBatchSize: 16,
    });
    assert.equal(typeof compiler.beginRead, "function");
  `], { cwd: temp, encoding: "utf8" });
  assert.equal(result.status, 0, result.stdout + result.stderr);
});

test("production GraphBuilder full build delegates normalized facts to the portable compiler", () => {
  const source = readFileSync(join(root, "src/index/GraphBuilder.ts"), "utf8");
  const buildStart = source.indexOf("  async build(): Promise<GraphState | null>");
  const settingsStart = source.indexOf("  private fullCompilerSettings()", buildStart);
  assert(buildStart >= 0 && settingsStart > buildStart);
  const body = source.slice(buildStart, settingsStart);
  for (const call of [
    "this.createFullCompiler()",
    "this.collectStructuralSources(compiler)",
    "this.collectHostLinkSources(compiler)",
    "this.collectMarkdownSources(compiler)",
    "this.finalizeStructuralSources(compiler, structuralRead)",
    "compiler.finish()",
    "this.bindCompiledGraph(compiled, structuralRead.collector)",
  ]) assert(body.includes(call), `production full build must delegate through ${call}`);
  for (const removed of ["this.addStructuralSources(state)", "this.addHostLinkSources(state)", "this.enrichMarkdownPages(state)", "resolveEvidenceStoreCooperative("])
    assert(!body.includes(removed), `legacy full-build semantic path must not remain active: ${removed}`);
  assert(source.includes("new NormalizedSourcePatchPreparer("), "incremental preparation must reuse the portable semantic owner");
  assert(source.includes("this.prepareMarkdownSourcePatch(stagedState, file, meta)"), "the production patch path must delegate preparation before publication");
  assert(!source.includes("private consumeHostLinkRecord("), "the retired incremental host-link classifier must not remain active");
});

test("compiler rejection is terminal even if a producer retries the batch", async () => {
  const source = { id: core.nodeId("rejected-source"), kind: "unresolved", state: "unresolved" };
  const rev = core.sourceRevision("reject:1");
  const compiler = new core.NormalizedGraphCompiler(settings, runtime());
  const b = boundary("rejected");
  const read = compiler.beginRead(b);
  const invalid = { kind: "inline-ontology", source, sourceRevision: rev, target: { entity: source, rawTarget: "source", resolvedBy: "unresolved" }, provenance: { configuredFieldName: "Not assigned" } };
  const entity = { kind: "entity", source, sourceRevision: rev, entity: source, name: "Partial", url: null };
  assert.equal(await compiler.acceptBatch(read, { boundary: b, sequence: 0, final: true, records: [entity, invalid] }), false);
  assert.equal(await compiler.acceptBatch(read, { boundary: b, sequence: 0, final: true, records: [] }), false);
  assert.equal(await compiler.finish(), null, "a rejected read must never recover and publish its partially consumed records");
});

test("opaque identities containing delimiters remain distinct and retain contribution ownership", async () => {
  const rev = core.sourceRevision("opaque:1");
  const a = { id: core.nodeId("a\u0000b"), kind: "unresolved", state: "unresolved" };
  const b = { id: core.nodeId("c"), kind: "unresolved", state: "unresolved" };
  const records = [a, b].map(entity => ({ kind: "entity", source: entity, sourceRevision: rev, entity, name: String(entity.id), url: null }));
  records.push({ kind: "inline-ontology", source: a, sourceRevision: rev, target: { entity: b, rawTarget: "label", resolvedBy: "unresolved" }, provenance: { configuredFieldName: "Parent" } });
  const { compilation } = await compileRecords(records);
  assert(compilation);
  assert.equal(compilation.node(a.id).neighbours.size, 1);
  assert.equal([...compilation.node(a.id).neighbours.values()][0].target.id, b.id);
  const evidence = compilation.evidenceBetween(a.id, b.id);
  assert.equal(evidence.length, 1);
  assert.equal(evidence[0].contribution.sourceId, a.id);
  assert.equal(evidence[0].contribution.revision, rev);
});

test("URL display names preserve the legacy first meaningful label rule", async () => {
  const rev = core.sourceRevision("url-label:1");
  const source = { id: core.nodeId("url-source"), kind: "unresolved", state: "unresolved" };
  const url = "https://labels.example/item";
  const target = { id: core.nodeId("url-target"), kind: "url", state: "materialized", semanticPath: url };
  const records = [url, "Friendly label", "Later label"].map(label => ({ kind: "body-url", source, sourceRevision: rev, target: { entity: target, rawTarget: url, resolvedBy: "url" }, label }));
  const { compilation } = await compileRecords(records);
  assert.equal(compilation.node(target.id).name, "Friendly label");
});

test("pathless tag membership preserves the producer's exact tag identity", async () => {
  const rev = core.sourceRevision("tag-identity:1");
  const source = { id: core.nodeId("opaque-tag"), kind: "tag", state: "materialized" };
  const target = { id: core.nodeId("opaque-member"), kind: "unresolved", state: "unresolved" };
  const { compilation } = await compileRecords([{ kind: "tag-tree", source, sourceRevision: rev, target: { entity: target, rawTarget: "member", resolvedBy: "structural" }, membership: "entity-member", provenance: { rawValue: "#parent/child" } }]);
  assert(compilation.node(source.id));
  assert.equal(compilation.node(source.id).semanticPath, undefined);
  assert.equal(compilation.evidenceBetween(source.id, target.id)[0].declaredById, source.id);
});

test("derived tag ancestors cannot overwrite unrelated opaque identities", async () => {
  const rev = core.sourceRevision("tag-collision:1");
  const unrelated = { id: core.nodeId("tag:parent"), kind: "unresolved", state: "unresolved", semanticPath: "Unrelated" };
  const tag = { id: core.nodeId("explicit-child"), kind: "tag", state: "materialized", semanticPath: "tag:parent/child" };
  const member = { id: core.nodeId("member"), kind: "unresolved", state: "unresolved" };
  const { compilation } = await compileRecords([
    { kind: "entity", source: unrelated, sourceRevision: rev, entity: unrelated, name: "Unrelated", url: null },
    { kind: "tag-tree", source: tag, sourceRevision: rev, target: { entity: member, rawTarget: "member", resolvedBy: "structural" }, membership: "entity-member", provenance: { rawValue: "#parent/child" } },
  ]);
  assert.equal(compilation.node(unrelated.id).kind, "unresolved");
  assert.equal(compilation.node(unrelated.id).semanticPath, "Unrelated");
  assert.equal(compilation.node(unrelated.id).neighbours.size, 0);
  const parent = [...compilation.nodes.values()].find(node => node.semanticPath === "tag:parent");
  assert(parent);
  assert.notEqual(parent.id, unrelated.id);
  assert.equal(compilation.evidenceBetween(parent.id, tag.id).length, 1);
});

test("late tag facts preserve explicit identities after synthetic ancestors exist", async () => {
  const rev = core.sourceRevision("late-tag:1");
  const child = { id: core.nodeId("child-tag"), kind: "tag", state: "materialized", semanticPath: "tag:parent/child" };
  const parent = { id: core.nodeId("parent-tag"), kind: "tag", state: "materialized", semanticPath: "tag:parent" };
  const member = { id: core.nodeId("member"), kind: "unresolved", state: "unresolved" };
  const unrelated = { id: core.nodeId("\u0001kplex-derived-tag:1"), kind: "unresolved", state: "unresolved", semanticPath: "Elsewhere" };
  const membership = (source, rawValue) => ({ kind: "tag-tree", source, sourceRevision: rev, target: { entity: member, rawTarget: "member", resolvedBy: "structural" }, membership: "entity-member", provenance: { rawValue } });
  const { compilation } = await compileRecords([
    membership(child, "#parent/child"),
    { kind: "entity", source: unrelated, sourceRevision: rev, entity: unrelated, name: "Unrelated", url: null },
    membership(parent, "#parent"),
  ]);
  assert.equal(compilation.node(unrelated.id).semanticPath, "Elsewhere");
  assert.equal(compilation.node(unrelated.id).neighbours.size, 0);
  assert.equal(compilation.evidenceBetween(parent.id, child.id).length, 1);
  assert.equal(compilation.evidenceBetween(parent.id, member.id).length, 1);
});

test("tag hierarchy labels cannot reinterpret an explicit semantic path", async () => {
  const rev = core.sourceRevision("tag-path:1");
  const tag = { id: core.nodeId("tag-record-17"), kind: "tag", state: "materialized", semanticPath: "host-tag/17" };
  const member = { id: core.nodeId("member-17"), kind: "unresolved", state: "unresolved" };
  const { compilation } = await compileRecords([{ kind: "tag-tree", source: tag, sourceRevision: rev, target: { entity: member, rawTarget: "member", resolvedBy: "structural" }, membership: "entity-member", provenance: { rawValue: "#parent/child" } }]);
  assert.equal(compilation.node(tag.id).semanticPath, "host-tag/17");
  assert.equal(compilation.evidenceBetween(tag.id, member.id).length, 1);
});

test("portable evidence cannot fabricate a missing contribution revision", async () => {
  const rev = core.sourceRevision("ownership:1");
  const source = { id: core.nodeId("owner"), kind: "unresolved", state: "unresolved" };
  const target = { id: core.nodeId("target"), kind: "unresolved", state: "unresolved" };
  const { compilation } = await compileRecords([{ kind: "inline-ontology", source, sourceRevision: rev, target: { entity: target, rawTarget: "target", resolvedBy: "unresolved" }, provenance: { configuredFieldName: "Parent" } }]);
  const nodes = new Map([...compilation.nodes.values()].map(node => [node.id, node]));
  const keys = new Map([...compilation.nodes.keys()].map(id => [id, id]));
  const store = new core.RelationEvidenceStore();
  store.addPair(source.id, target.id, "parent", core.RelationType.DEFINED, core.LinkDirection.FROM, { sourceKind: "inline-ontology" });
  const unowned = new core.PortableGraphCompilation(compilation.nodes, compilation.discoveredFields, nodes, keys, store, new Map());
  assert.throws(() => [...unowned.declarations()], /no contribution ownership/);
});
