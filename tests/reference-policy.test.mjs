/** SI2 production producer -> shared selector -> full/patch acceptance, without Obsidian runtime. */
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { loadPortableModules } from "./support/portableTypeScript.mjs";

const loaded = loadPortableModules([
  "src/core/graph/compiler.ts", "src/core/graph/patch.ts", "src/core/graph/source.ts",
  "src/core/graph/resolver.ts",
  "src/core/graph/relations.ts",
  "src/core/graph/sourcePolicy.ts", "src/core/parser/metadata.ts", "src/core/parser/referenceValues.ts",
  "src/core/graph/settingsPolicy.ts", "src/application/frontmatterUnlink.ts",
  "src/adapters/obsidian/ontologySourceCollector.ts", "src/index/SourceFingerprint.ts",
], { obsidian: `class TFile { constructor(path) { this.path=path; this.name=path.split('/').pop();
  this.extension=this.name.split('.').pop(); this.basename=this.name.replace(/\\.[^.]*$/, '');
  this.stat={mtime:1,size:1,ctime:1}; } } module.exports={TFile};` });
const c = loaded.exports;
const { TFile } = loaded.require("node_modules/obsidian/index.js");
const emptyHierarchy = () => ({ hidden: [], parents: [], children: [], leftFriends: [], rightFriends: [], previous: [], next: [] });
const policy = (hierarchy = {}, images = {}) => ({ hierarchy: { ...emptyHierarchy(), ...hierarchy },
  inferAllLinksAsFriends: false, inverseInfer: false, showFullTagName: true, maxLabelLength: 30,
  tagStyleList: [], thumbnailProperty: "", nodeImageProperty: "", ...images });
const runtime = () => ({ now: () => 0, yield: async () => {}, isCurrent: () => true, sliceBudgetMs: 10, resolverBatchSize: 32 });
const metadata = (frontmatter = {}, body = "") => ({ ...c.parseBodyMetadata(body), frontmatter });
const sourceFile = () => new TFile("Source.md");
const host = (files = [], count = 0) => ({ metadataCache: { getFirstLinkpathDest: path => files.find(f => f.path === path || f.basename === path) ?? null },
  resolvedLinkCount: () => count });
async function collect(meta, options = {}) {
  const file = options.file ?? sourceFile();
  const collector = new c.ObsidianReferenceSourceCollector(options.host ?? host(), {
    isCurrent: () => true, sourceRevision: () => 1, checkpoint: async () => true, ...options.runtime,
  }, file, meta);
  const batches = [];
  const accepted = await collector.collectBatches(batch => { batches.push(batch); return true; });
  return { file, collector, batches, records: batches.flatMap(b => b.records), accepted };
}
const entityFact = entity => ({ kind: "entity", source: entity, sourceRevision: "entity:1", entity,
  name: entity.semanticPath ?? entity.id, url: entity.kind === "url" ? entity.semanticPath : null,
  ...(entity.physicalPath ? { file: { name: entity.physicalPath, extension: entity.kind === "document" ? "md" : "png", path: entity.physicalPath, mtime: 1 } } : {}),
});
const ref = file => ({ id: file.path, kind: file.extension === "md" ? "document" : "attachment",
  state: "materialized", semanticPath: file.path, physicalPath: file.path });
async function feed(target, records, name = "test") {
  const boundary = { generation: name, snapshotRevision: name };
  const read = target.beginRead(boundary);
  for (let offset = 0, sequence = 0; offset < records.length || offset === 0; offset += 256, sequence++) {
    const batch = records.slice(offset, offset + 256);
    const final = offset + batch.length >= records.length;
    assert.equal(await target.acceptBatch(read, { boundary, sequence, final, records: batch }), true);
    if (final) break;
  }
  assert.equal(target.completeRead(read, boundary), true);
}
async function compile(records, settings) {
  const compiler = new c.NormalizedGraphCompiler(settings, runtime());
  await feed(compiler, records); const result = await compiler.finish(); assert(result); return result;
}
function declarations(graph) {
  return [...graph.declarations()].map(({ id, ...d }) => d);
}
function canonical(graph) {
  return { nodes: [...graph.nodes].map(([id, n]) => ({ id, name: n.name, kind: n.kind, url: n.url, tags: n.tags,
    relations: [...n.neighbours].map(([id, relation]) => ({ id, ...relation, target: relation.target.id })) })),
  declarations: declarations(graph) };
}
function fingerprintInputs(meta) {
  return { metadata: meta, tags: [], resolved: [], unresolved: [], frontmatterFields: new Set(["alias", "aliases", "tags", "tag"]),
    inlineFields: new Set(), isDateProperty: () => false };
}

test("same unassigned frontmatter/inline facts replay parent, friend, challenger and deactivation in full/patch", async () => {
  const meta = metadata({ Latent: { values: ["[[One#H]]", "[[Two]]", "[[One#Other]]"] }, Empty: null },
    "Latent Inline:: [[Three]]\nLatent Inline:: [[Three]]");
  const first = await collect(meta), again = await collect(meta);
  assert(first.accepted && again.accepted);
  assert.deepEqual(first.records, again.records, "producer has no ontology/image input; only read boundary tokens differ");
  assert.deepEqual(first.records.filter(r => r.kind === "reference-value").map(r => r.fieldName), ["Latent", "Latent Inline", "Latent Inline"]);
  assert.equal(first.records.filter(r => r.kind === "reference-candidate").length, 4);
  assert(!JSON.stringify(first.records).includes("configuredFieldName"));
  const source = ref(first.file), fact = entityFact(source);
  for (const settings of [policy(), policy({ parents: ["Latent", "Latent Inline"] }),
    policy({ leftFriends: ["Latent", "Latent Inline"] }), policy({ rightFriends: ["Latent", "Latent Inline"] }), policy()]) {
    const replay = await compile([fact, ...first.records], settings);
    const clean = await compile([fact, ...(await collect(meta, { file: first.file })).records], settings);
    assert.deepEqual(canonical(replay), canonical(clean));
    const preparer = new c.NormalizedSourcePatchPreparer(source.id, settings, runtime(), { entity: e => e.id === source.id ? fact : undefined });
    await feed(preparer, [fact, ...first.records]); const outcome = await preparer.finish();
    assert.equal(outcome.outcome, "prepared"); assert.deepEqual(canonical(outcome.patch.compilation), canonical(replay));
    const activeRole = settings.hierarchy.parents.length ? "parent" : settings.hierarchy.leftFriends.length ? "left" : settings.hierarchy.rightFriends.length ? "right" : null;
    assert.equal(replay.nodes.size, activeRole ? 4 : 1);
    assert.equal(declarations(replay).length, activeRole ? 4 : 0);
    if (activeRole) assert(declarations(replay).every(d => d.declaredRole === activeRole));
  }
});

test("dormant internal values cannot materialize even their source or demand missing published targets", async () => {
  const file = sourceFile(), target = new TFile("NotPublished.md");
  const { records } = await collect(metadata({ Unknown: ["[[NotPublished]]", "[[Ghost]]"] }), { file, host: host([target]) });
  const result = await compile(records, policy());
  assert.equal(result.nodes.size, 0); assert.deepEqual(declarations(result), []); assert.equal(result.discoveredFields.size, 0);
  const source = ref(file), fact = entityFact(source), lookedUp = [];
  const prep = new c.NormalizedSourcePatchPreparer(source.id, policy(), runtime(), {
    entity: entity => { lookedUp.push(entity.id); return entity.id === source.id ? fact : undefined; },
  });
  await feed(prep, [fact, ...records]); const outcome = await prep.finish();
  assert.equal(outcome.outcome, "prepared"); assert.deepEqual(lookedUp, [source.id]);
  assert.equal(outcome.patch.compilation.nodes.size, 1); assert.deepEqual([...outcome.patch.newNodes()], []);
  assert.deepEqual([...outcome.patch.declarations()], []);
  // A distinct acquired family can still activate the same target: dormancy is not a blacklist.
  const url = { entity: { id: "https://dormant.example/a", kind: "url", state: "materialized", semanticPath: "https://dormant.example/a" },
    rawTarget: "https://dormant.example/a", resolvedBy: "url" };
  const withBody = await compile([fact, ...records, { kind: "body-url", source, sourceRevision: "body:1", target: url, provenance: { surface: "body" } }], policy());
  assert(withBody.node(url.entity.id)); assert.equal(declarations(withBody).length, 1);
});

test("configured order, exact duplicates, normalized labels, physical multiplicity and precedence retain the oracle", async () => {
  const meta = metadata({ Zeta: ["[[Target]]", "[[Target]]"], PARENT: "[[Target]]", Parent: "[[Target]]" },
    "pArEnT:: [[Target]]\nZeta:: [[Target]]\npArEnT:: [[Target]]");
  const { records } = await collect(meta);
  const settings = policy({ parents: ["Parent", "parent", "Parent", "Zeta"], rightFriends: ["Parent"] });
  const result = await compile([entityFact(records[0].source), ...records], settings);
  const actual = declarations(result).map(d => [d.sourceKind, d.fieldName, d.declaredRole, d.line]);
  // Independent frozen collector ordering: unique exact configuration, FM then physical inline,
  // then same-exact assignment order. No new selector is used to compute this oracle.
  const expected = [];
  for (const [label, roles] of [["Parent", ["parent", "parent", "right"]], ["parent", ["parent"]], ["Zeta", ["parent"]]]) {
    const values = label === "Zeta" ? [["frontmatter-ontology", label, undefined], ["inline-ontology", "Zeta", 2]]
      : [["frontmatter-ontology", label, undefined], ["frontmatter-ontology", label, undefined],
        ["inline-ontology", "pArEnT", 1], ["inline-ontology", "pArEnT", 3]];
    for (const [kind, field, line] of values) for (const role of roles) expected.push([kind, field, role, line]);
  }
  assert.deepEqual(actual, expected);
  const relation = [...result.node("Source.md").neighbours.values()][0];
  assert(relation.isParent); assert(relation.isRightFriend);
  // Opposing inline direction stays in the evidence; frontmatter wins final relation precedence.
  const mixed = (await collect(metadata({ Parent: "[[Other]]" }, "Children:: [[Other]]"))).records;
  const precedence = await compile([entityFact(mixed[0].source), ...mixed], policy({ parents: ["Parent"], children: ["Children"] }));
  assert.equal(declarations(precedence).length, 2);
  const p = [...precedence.node("Source.md").neighbours.values()][0];
  assert.equal(p.isParent, true); assert.equal(p.isChild, false);
  const conflictingRecords = (await collect(metadata({}, "Parent:: [[Other]]\nChildren:: [[Other]]"))).records;
  const conflicting = await compile([entityFact(conflictingRecords[0].source), ...conflictingRecords],
    policy({ parents: ["Parent"], children: ["Children"] }));
  const r = [...conflicting.node("Source.md").neighbours.values()][0];
  assert.equal(r.isParent, true); assert.equal(r.isChild, true);
});

test("image policy replay keeps image-only, prose-plus-image and ontology-plus-image suppression exact", async () => {
  const file = sourceFile(), image = new TFile("Image.png"), source = ref(file), target = ref(image);
  for (const count of [1, 2]) {
    const { records } = await collect(metadata({ Cover: ["[[Image.png]]", "[[Image.png]]"] }), { file, host: host([image], count) });
    const structural = [entityFact(source), entityFact(target)];
    const generic = { kind: "obsidian-link", source, sourceRevision: "host:1", occurrenceCount: count,
      target: { entity: target, rawTarget: "Image.png", resolvedBy: "host" } };
    for (const settings of [policy(), policy({}, { thumbnailProperty: "Cover", nodeImageProperty: "cover" }),
      policy({ parents: ["Cover"] }, { thumbnailProperty: "Cover" })]) {
      const input = [...structural, generic, ...records]; const full = await compile(input, settings);
      const declared = declarations(full);
      assert.equal(declared.filter(d => d.sourceKind === "obsidian-link").length,
        count === 1 && settings.thumbnailProperty ? 0 : 1);
      assert.equal(declared.filter(d => d.sourceKind === "frontmatter-ontology").length, settings.hierarchy.parents.length ? 1 : 0);
      const facts = new Map(structural.map(f => [f.entity.id, f]));
      const patch = new c.NormalizedSourcePatchPreparer(source.id, settings, runtime(), { entity: e => facts.get(e.id) });
      await feed(patch, [structural[0], generic, ...records]); const out = await patch.finish();
      assert.equal(out.outcome, "prepared"); assert.deepEqual(canonical(out.patch.compilation), canonical(full));
    }
  }
});

test("image-only web properties preserve materialization without inferred links or origins in full and patch", async () => {
  const { file, records } = await collect(metadata({ Cover: "https://Obsidian.md/Cover" }));
  const source = ref(file), fact = entityFact(source), candidate = records.find(item => item.kind === "reference-candidate");
  assert(candidate?.origin);
  const body = { kind: "body-url", source, sourceRevision: "body:1", target: candidate.target, origin: candidate.origin,
    provenance: { surface: "body", rawValue: candidate.target.rawTarget, line: 5 } };
  const imagePolicy = policy({}, { thumbnailProperty: "Cover", nodeImageProperty: "cover" });
  for (const [settings, bodyReference] of [[imagePolicy, false], [imagePolicy, true],
    [policy({ parents: ["Cover"] }, { thumbnailProperty: "Cover" }), false]]) {
    const input = [fact, ...records, ...(bodyReference ? [body] : [])];
    const full = await compile(input, settings), evidence = declarations(full);
    assert.equal(full.node(candidate.target.entity.id).url, "https://obsidian.md/Cover", "Presentation URL entity remains materialized");
    assert.equal(evidence.filter(item => item.sourceKind === "property-url").length, 0, "Image-only property cannot infer a child");
    assert.equal(evidence.filter(item => item.sourceKind === "body-url").length, bodyReference ? 1 : 0, "Independent genuine body reference survives");
    const semantic = bodyReference || settings.hierarchy.parents.length > 0;
    assert.equal(evidence.filter(item => item.sourceKind === "url-origin").length, semantic ? 1 : 0, "Only actual relationship input creates origin evidence");
    assert.equal(Boolean(full.node(candidate.origin.entity.id)), semantic, "Image-only property cannot seed a phantom origin");
    assert.equal(evidence.filter(item => item.sourceKind === "frontmatter-ontology").length, settings.hierarchy.parents.length ? 1 : 0,
      "Explicit ontology plus image remains semantic");
    const patch = new c.NormalizedSourcePatchPreparer(source.id, settings, runtime(), { entity: item => item.id === source.id ? fact : undefined });
    await feed(patch, input); const result = await patch.finish();
    assert.equal(result.outcome, "prepared"); assert.deepEqual(canonical(result.patch.compilation), canonical(full));
  }
});

test("dense nested payload is represented once, byte-aware batches stay bounded and chunks match JSON", async () => {
  const raw = { explanation: "context ".repeat(18000), links: Array.from({ length: 900 }, (_, i) => [`[[Target-${i}]]`, `[[Target-${i}]]`]) };
  const { accepted, records, batches } = await collect(metadata({ Unassigned: raw }));
  assert(accepted); assert.equal(records.filter(r => r.kind === "reference-value").length, 1);
  assert.equal(records.filter(r => r.kind === "reference-candidate").length, 900);
  const payload = records.filter(r => r.kind === "reference-payload");
  assert(payload.length > 1); assert(payload.every(r => r.text.length <= c.MAX_REFERENCE_PAYLOAD_CHARS));
  assert.equal(payload.map(r => r.text).join(""), JSON.stringify(raw));
  assert(records.filter(r => r.kind === "reference-candidate").every(r => !("rawValue" in r) && !("provenance" in r)));
  assert(batches.every(b => b.records.length <= 256 && b.records.reduce((n, r) => n + c.estimateReferenceRecordBytes(r), 0) <= c.MAX_REFERENCE_BATCH_ESTIMATED_BYTES));
  const dormantRead = new c.ReferenceSourcePolicyRead(new c.ReferencePolicySelector(policy()));
  for (const r of records) {
    const out = dormantRead.accept(r); assert(out.accepted); assert.equal(out.record, undefined);
    assert.equal(dormantRead.active?.chunks.length ?? 0, 0, "dormant payload discarded immediately, not accumulated");
  }
  assert(dormantRead.canComplete()); dormantRead.release(); assert.equal(dormantRead.active, undefined);
  for (const rawValue of [{ a: ["quote\"\n\\", "🌍\ud800", null, 7, false, undefined], b: { date: new Date("2026-09-29T00:00:00Z") } },
    ["a".repeat(32767) + "🌍", "[[Target]]"], "raw\ntext"]) {
    assert.equal([...c.iterateReferencePayloadChunks(rawValue, 7)].join(""), typeof rawValue === "string" ? rawValue : JSON.stringify(rawValue));
  }
});

test("fingerprints detect dormant changes, ignore unrelated properties, hash shared payload once and yield", async () => {
  const raw = { links: Array.from({ length: 700 }, (_, i) => `[[Target-${i}]]`), context: "long ".repeat(8000) };
  const meta = metadata({ Dormant: raw, Unrelated: { a: 1 } }, "Unassigned Inline:: [[Inline]]");
  const input = fingerprintInputs(meta); const original = c.sourceFingerprint(input);
  assert.equal(await c.sourceFingerprintCooperative(input, async () => true), original);
  assert.equal(c.sourceFingerprint(fingerprintInputs({ ...meta, frontmatter: { ...meta.frontmatter, Unrelated: { different: [1, 2, 3] } } })), original);
  assert.notEqual(c.sourceFingerprint(fingerprintInputs({ ...meta, frontmatter: { ...meta.frontmatter, Dormant: { ...raw, links: ["[[Changed]]"] } } })), original);
  assert.notEqual(c.sourceFingerprint(fingerprintInputs(metadata(meta.frontmatter, "Unassigned Inline:: [[Changed]]"))), original);
  const values = [...c.iterateSourceFingerprintTokens(input)].filter(t => t.part !== "checkpoint");
  assert(values.every(t => t.hashFragment.length <= 2048));
  const bytes = values.reduce((n, t) => n + t.hashFragment.length, 0);
  assert(bytes < JSON.stringify(raw).length + 1000, "no per-target or topology/provenance raw duplication");
  let checkpoints = 0;
  assert.equal(await c.sourceFingerprintCooperative(input, async () => ++checkpoints < 5), null);
  assert.equal(checkpoints, 5);
  let ignoredCheckpoints = 0;
  assert.equal(await c.sourceFingerprintCooperative(fingerprintInputs(metadata({ Arbitrary: Array(4000).fill(0) })),
    async () => ++ignoredCheckpoints < 3), null);
});

test("truncated payloads/candidates, oversized payloads and orphan candidates are terminal before patch lookup", async () => {
  const { records } = await collect(metadata({ Latent: "[[Target]]" }));
  const source = records[0].source, fact = entityFact(source);
  for (const input of [[records[2]], [records[0], { ...records[1], index: 2 }],
    [records[0], { ...records[1], text: "x".repeat(c.MAX_REFERENCE_PAYLOAD_CHARS + 1) }],
    [records[0], records[2]], [records[0]],
    [records[0], records[1], { ...records[2], final: false }],
    [records[0], records[1], records[2], { ...records[2], ordinal: 1 }]]) {
    for (const patch of [false, true]) {
      const reads = [];
      const consumer = patch ? new c.NormalizedSourcePatchPreparer(source.id, policy(), runtime(), {
        entity: e => { reads.push(e.id); return fact; },
      }) : new c.NormalizedGraphCompiler(policy(), runtime());
      const boundary = { generation: "bad", snapshotRevision: "bad" }, read = consumer.beginRead(boundary);
      const accepted = await consumer.acceptBatch(read, { boundary, sequence: 0, final: true, records: input });
      if (accepted) assert.equal(consumer.completeRead(read, boundary), false);
      assert.equal(patch ? (await consumer.finish()).outcome : await consumer.finish(), patch ? "rejected" : null);
      assert.deepEqual(reads, []);
    }
  }
});

test("cancellation covers dense ignored leaves and a shared payload before finality", async () => {
  for (const meta of [metadata({ Huge: Array(5000).fill(1) }), metadata({ Huge: { reference: "[[Target]]", text: "x".repeat(1000000) } })]) {
    let checkpoints = 0;
    const result = await collect(meta, { runtime: { checkpoint: async () => ++checkpoints < 3 } });
    assert.equal(result.accepted, false); assert.equal(result.collector.isBoundaryCurrent(result.collector.boundary), false);
    assert.equal(result.batches.some(b => b.final), false); assert.equal(checkpoints, 3);
  }
});

test("SI2 retains settings-triggered semantic rebuilds and introduces no durable source store", () => {
  const source = readFileSync(new URL("../src/core/graph/settingsPolicy.ts", import.meta.url), "utf8");
  assert(source.includes('"thumbnailProperty"')); assert(source.includes('"nodeImageProperty"'));
  const builder = readFileSync(new URL("../src/index/GraphBuilder.ts", import.meta.url), "utf8");
  assert(builder.includes("ObsidianReferenceSourceCollector"));
  const docs = readFileSync(new URL("../docs/INDEX_SETTINGS_INDEPENDENCE_DESIGN.md", import.meta.url), "utf8");
  assert(docs.includes("SI3") && docs.includes("SI4"));
  // Persistence/restart reuse and demand-driven reinterpretation are pending SI3/SI4, not SI2 claims.
});

/** URLs in genuine property occurrences have default inference without pretending to be body links. */
test("unassigned property URLs infer with raw provenance, configured roles and root hierarchy remain canonical", async () => {
  const raw = "https://Obsidian.md/Slug", second = "https://obsidian.md/Other";
  const meta = metadata({ Website: [raw], Parents: raw, Hidden: second }, "Resource:: https://Obsidian.md/Inline");
  const found = await collect(meta), source = ref(found.file), fact = entityFact(source);
  const inferred = await compile([fact, ...found.records], policy());
  const property = declarations(inferred).filter(record => record.sourceKind === "property-url");
  assert(property.some(record => record.declaredTargetPath === "https://obsidian.md/Slug" && record.fieldName === "Website" && record.rawValue === raw));
  assert(property.some(record => record.declaredTargetPath === "https://obsidian.md/Inline" && record.fieldName === "Resource" && record.line === 1));
  assert.equal(declarations(inferred).filter(record => record.sourceKind === "body-url").length, 0, "reference family retains property provenance");
  assert.equal(declarations(inferred).filter(record => record.sourceKind === "url-origin").length, 3, "one hierarchy edge per distinct property target");
  const defined = await compile([fact, ...found.records], policy({ parents: ["Parents"], hidden: ["Hidden"] }));
  const role = [...defined.node(source.id).neighbours.values()].find(relation => relation.target.semanticPath === "https://obsidian.md/Slug");
  assert.equal(c.classifyRelation(role, "parent", false), c.RelationType.DEFINED);
  assert.equal(c.classifyRelation(role, "child", false), null, "configured parent overrides default inference in the canonical resolver");
  assert.equal(declarations(defined).filter(record => record.sourceKind === "frontmatter-ontology" && record.declaredTargetPath === "https://obsidian.md/Slug").length, 1);
  assert.equal(declarations(defined).filter(record => record.sourceKind === "property-url" && record.fieldName === "Parents").length, 0);
  const hidden = [...defined.node(source.id).neighbours.values()].find(relation => relation.target.semanticPath === second);
  assert.equal(hidden.isHidden, true, "configured hidden URL remains hidden");
  assert.equal(declarations(defined).filter(record => record.sourceKind === "property-url" && record.fieldName === "Hidden").length, 0);
  const preparer = new c.NormalizedSourcePatchPreparer(source.id, policy(), runtime(), { entity: e => e.id === source.id ? fact : undefined });
  await feed(preparer, [fact, ...found.records]); const patch = await preparer.finish(); assert.equal(patch.outcome, "prepared");
  assert.deepEqual(declarations(patch.patch.compilation), declarations(inferred), "full and patch share the URL default and hierarchy owner");
});

test("parseHierarchyFieldMapping parses forward and inverse slash syntax with escape and boundary safety", () => {
  const mapping1 = c.parseHierarchyFieldMapping("replies to/replied by");
  assert.equal(mapping1.forward, "replies to");
  assert.equal(mapping1.normalizedForward, "replies-to");
  assert.equal(mapping1.inverse, "replied by");
  assert.equal(mapping1.normalizedInverse, "replied-by");

  const mapping2 = c.parseHierarchyFieldMapping("  replaces  /  replaced by  ");
  assert.equal(mapping2.forward, "replaces");
  assert.equal(mapping2.normalizedForward, "replaces");
  assert.equal(mapping2.inverse, "replaced by");
  assert.equal(mapping2.normalizedInverse, "replaced-by");

  const mapping3 = c.parseHierarchyFieldMapping("parent");
  assert.equal(mapping3.forward, "parent");
  assert.equal(mapping3.normalizedForward, "parent");
  assert.equal(mapping3.inverse, undefined);
  assert.equal(mapping3.normalizedInverse, undefined);

  // Escaped slashes: a\/b treated as literal name a/b
  const mappingEscaped = c.parseHierarchyFieldMapping("replaces\\/supersedes");
  assert.equal(mappingEscaped.forward, "replaces/supersedes");
  assert.equal(mappingEscaped.normalizedForward, "replaces/supersedes");
  assert.equal(mappingEscaped.inverse, undefined);

  // Consecutive slashes: a//b treated as literal single token
  const mappingDoubleSlash = c.parseHierarchyFieldMapping("replaces//supersedes");
  assert.equal(mappingDoubleSlash.forward, "replaces//supersedes");
  assert.equal(mappingDoubleSlash.inverse, undefined);

  // Multiple slashes: a/b/c treated as literal single token
  const mappingMultiSlash = c.parseHierarchyFieldMapping("a/b/c");
  assert.equal(mappingMultiSlash.forward, "a/b/c");
  assert.equal(mappingMultiSlash.inverse, undefined);

  // Leading or trailing slashes: /a or a/ treated as literal
  const mappingLeading = c.parseHierarchyFieldMapping("/leading");
  assert.equal(mappingLeading.forward, "/leading");
  assert.equal(mappingLeading.inverse, undefined);

  const mappingTrailing = c.parseHierarchyFieldMapping("trailing/");
  assert.equal(mappingTrailing.forward, "trailing/");
  assert.equal(mappingTrailing.inverse, undefined);
});

test("reassignFieldInHierarchy preserves reciprocal half or moves full pair without data loss", () => {
  const makeHierarchy = () => ({
    hidden: [],
    parents: ["super/sub"],
    children: [],
    leftFriends: ["friend/ally"],
    rightFriends: [],
    previous: ["replies to/replied by", "before"],
    next: ["after"],
  });

  // 1. Reassigning forward half of a pair: "replies to" from previous -> parents
  // Should move "replies to" to parents, and preserve inverse "replied by" in next (the reciprocal role of previous).
  const h1 = makeHierarchy();
  const updated1 = c.reassignFieldInHierarchy(h1, "replies to", "parents");
  assert.deepEqual(updated1.parents, ["replies to", "super/sub"]);
  assert.deepEqual(updated1.previous, ["before"]);
  assert.deepEqual(updated1.next, ["after", "replied by"]);

  // 2. Reassigning inverse half of a pair: "sub" from parents -> next
  // In "super/sub", forward was in parents so inverse "sub" belonged reciprocally to children.
  // When "sub" is moved to next, "super" should be preserved in parents.
  const h2 = makeHierarchy();
  const updated2 = c.reassignFieldInHierarchy(h2, "sub", "next");
  assert.deepEqual(updated2.parents, ["super"]);
  assert.deepEqual(updated2.next, ["after", "sub"]);

  // 3. Reassigning full pair: "replies to/replied by" -> leftFriends
  const h3 = makeHierarchy();
  const updated3 = c.reassignFieldInHierarchy(h3, "replies to/replied by", "leftFriends");
  assert.deepEqual(updated3.leftFriends, ["friend/ally", "replies to/replied by"]);
  assert.deepEqual(updated3.previous, ["before"]);

  // 4. Reassigning single field: "before" -> children
  const h4 = makeHierarchy();
  const updated4 = c.reassignFieldInHierarchy(h4, "before", "children");
  assert.deepEqual(updated4.previous, ["replies to/replied by"]);
  assert.deepEqual(updated4.children, ["before"]);

  // 5. Symmetric friend pair reassignment: "friend" in leftFriends moved to rightFriends
  // In leftFriends, reciprocal role is leftFriends. "ally" should remain in leftFriends.
  const h5 = makeHierarchy();
  const updated5 = c.reassignFieldInHierarchy(h5, "friend", "rightFriends");
  assert.deepEqual(updated5.leftFriends, ["ally"]);
  assert.deepEqual(updated5.rightFriends, ["friend"]);
});

test("slash syntax defines forward and inverse names for ontology categories and places reverse links in opposite roles with reverse labels", async () => {
  const targetFile = new TFile("Target.md");
  const hostInstance = host([targetFile]);
  const meta = metadata({ "replies to": "[[Target]]" });
  const found = await collect(meta, { host: hostInstance });
  const source = ref(found.file);
  const factSource = entityFact(source);
  const factTarget = entityFact(ref(targetFile));

  const settings = policy({ previous: ["replies to/replied by"] });
  const graph = await compile([factSource, factTarget, ...found.records], settings);

  // Check Source -> Target: role is previous, definition is replies-to
  const sourceNode = graph.node(source.id);
  const toTarget = sourceNode.neighbours.get(targetFile.path);
  assert(toTarget, "Source has connection to Target");
  assert.equal(c.classifyRelation(toTarget, "previous", false), c.RelationType.DEFINED);
  assert.equal(toTarget.previousFriendTypeDefinition, "replies-to");

  // Check Target -> Source: role is next, definition is replied-by
  const targetNode = graph.node(targetFile.path);
  const toSource = targetNode.neighbours.get(source.id);
  assert(toSource, "Target has reverse connection to Source");
  assert.equal(c.classifyRelation(toSource, "next", false), c.RelationType.DEFINED);
  assert.equal(toSource.nextFriendTypeDefinition, "replied-by");
});

test("slash syntax inverse field declared in a note is recognized under the reciprocal role", async () => {
  const targetFile = new TFile("Other.md");
  const hostInstance = host([targetFile]);
  const meta = metadata({ "replied by": "[[Other]]" });
  const found = await collect(meta, { host: hostInstance });
  const source = ref(found.file);
  const factSource = entityFact(source);
  const factTarget = entityFact(ref(targetFile));

  const settings = policy({ previous: ["replies to/replied by"] });
  const graph = await compile([factSource, factTarget, ...found.records], settings);

  // Source -> Target: role is next, definition is replied-by
  const sourceNode = graph.node(source.id);
  const toTarget = sourceNode.neighbours.get(targetFile.path);
  assert(toTarget, "Source has connection to Target");
  assert.equal(c.classifyRelation(toTarget, "next", false), c.RelationType.DEFINED);
  assert.equal(toTarget.nextFriendTypeDefinition, "replied-by");

  // Target -> Source: role is previous, definition is replies-to
  const targetNode = graph.node(targetFile.path);
  const toSource = targetNode.neighbours.get(source.id);
  assert(toSource, "Target has reverse connection to Source");
  assert.equal(c.classifyRelation(toSource, "previous", false), c.RelationType.DEFINED);
  assert.equal(toSource.previousFriendTypeDefinition, "replies-to");
});

test("parent/child slash syntax places reverse links in child role with inverse definition", async () => {
  const targetFile = new TFile("ParentNote.md");
  const hostInstance = host([targetFile]);
  const meta = metadata({ "subclass of": "[[ParentNote]]" });
  const found = await collect(meta, { host: hostInstance });
  const source = ref(found.file);
  const factSource = entityFact(source);
  const factTarget = entityFact(ref(targetFile));

  const settings = policy({ parents: ["subclass of/superclass of"] });
  const graph = await compile([factSource, factTarget, ...found.records], settings);

  // Source -> Target: parent, definition is subclass-of
  const sourceNode = graph.node(source.id);
  const toTarget = sourceNode.neighbours.get(targetFile.path);
  assert(toTarget, "Source has parent connection to ParentNote");
  assert.equal(c.classifyRelation(toTarget, "parent", false), c.RelationType.DEFINED);
  assert.equal(toTarget.parentTypeDefinition, "subclass-of");

  // Target -> Source: child, definition is superclass-of
  const targetNode = graph.node(targetFile.path);
  const toSource = targetNode.neighbours.get(source.id);
  assert(toSource, "ParentNote has child connection to Source");
  assert.equal(c.classifyRelation(toSource, "child", false), c.RelationType.DEFINED);
  assert.equal(toSource.childTypeDefinition, "superclass-of");
});

test("pair reassignment preserves unrelated halves from every intersecting existing pair", () => {
  const hierarchy={...emptyHierarchy(),parents:['A/B'],children:['D/C'],exclusions:[]};
  c.reassignFieldInHierarchy(hierarchy,'A/C','previous');
  assert.deepEqual(hierarchy.parents,[]);
  assert.deepEqual(hierarchy.children,['B','D']);
  assert.deepEqual(hierarchy.previous,['A/C']);
  assert.deepEqual(c.ontologyFieldsForHierarchyRole(hierarchy,'next'),['C']);
});

test("reassignment sorts only destination and newly extended counterpart roles, preserving all other precedence", () => {
  for(const counterpartAlreadyPresent of [false,true]){
    const hierarchy={hidden:['Z-hidden','A-hidden'],parents:['Z-parent','Move/Counterpart','A-parent'],
      children:counterpartAlreadyPresent?['Z-child','Counterpart','A-child']:['Z-child','A-child'],
      leftFriends:['Z-friend','A-friend'],rightFriends:['Z-challenge','A-challenge'],
      previous:['Z-previous','A-previous'],next:['Z-next','A-next'],exclusions:['Z-excluded','A-excluded']};
    const before=structuredClone(hierarchy);
    c.reassignFieldInHierarchy(hierarchy,'Move','right',{literal:true});
    assert.deepEqual(hierarchy.parents,['Z-parent','A-parent'],'A role that only loses a field keeps its remaining order');
    assert.deepEqual(hierarchy.rightFriends,['A-challenge','Move','Z-challenge'],'The destination retains established sorted insertion');
    assert.deepEqual(hierarchy.children,counterpartAlreadyPresent?before.children:['A-child','Counterpart','Z-child'],
      'A counterpart role is sorted only if its preserved half was actually appended');
    for(const role of ['hidden','leftFriends','previous','next','exclusions'])assert.deepEqual(hierarchy[role],before[role],role+' precedence remains unchanged');
    assert.equal(c.ontologyFieldsForHierarchyRole(hierarchy,'parent')[0],'Z-parent');
    assert.equal(c.ontologyFieldsForHierarchyRole(hierarchy,'previous')[0],'Z-previous');
    const selector=new c.ReferencePolicySelector({hierarchy});
    assert.deepEqual(selector.assignmentsForField('Move').map(item=>item.role),['right']);
    assert.deepEqual(selector.assignmentsForField('Counterpart').map(item=>item.role),['child']);
  }
});

test("physical literal slashes stay literal when menus reassign escaped or directional fields", () => {
  const hierarchy={...emptyHierarchy(),parents:['Track\\/Part'],hidden:['Hidden/Path'],exclusions:[]};
  c.reassignFieldInHierarchy(hierarchy,'Track/Part','child',{literal:true});
  assert.deepEqual(hierarchy.parents,[]);
  assert.deepEqual(hierarchy.children,['Track\\/Part']);
  assert.deepEqual(c.ontologyFieldsForHierarchyRole(hierarchy,'child'),['Track/Part']);
  assert.deepEqual(c.ontologyFieldsForHierarchyRole(hierarchy,'parent'),[]);
  c.reassignFieldInHierarchy(hierarchy,'Hidden/Path','previous',{literal:true});
  assert.deepEqual(hierarchy.hidden,[]);
  assert.deepEqual(c.ontologyFieldsForHierarchyRole(hierarchy,'previous'),['Hidden/Path']);
  assert.deepEqual(c.ontologyFieldsForHierarchyRole(hierarchy,'next'),[]);
});

test("reciprocal graph labels never replace the declaring property used for edit authorization", async () => {
  const targetFile=new TFile('Other.md'),found=await collect(metadata({'Replies to':'[[Other]]'}),{host:host([targetFile])});
  const source=ref(found.file),records=[entityFact(source),entityFact(ref(targetFile)),...found.records];
  const settings=policy({previous:['Replies to/Replied by']});
  const graph=await compile(records,settings),forward=graph.evidenceBetween(source.id,targetFile.path)[0],reverse=graph.evidenceBetween(targetFile.path,source.id)[0];
  assert.equal(forward.fieldName,'Replies to');assert.equal(reverse.fieldName,'Replies to');
  assert.equal(reverse.definition,'replied-by');assert.equal(reverse.inverseFieldName,'Replied by');
  assert.equal(reverse.declaredByPath,source.id);assert.equal(reverse.declaredTargetPath,targetFile.path);
  assert.equal(JSON.parse(c.frontmatterDeclarationKey(reverse))[2],'replies-to');
  const patch=new c.NormalizedSourcePatchPreparer(source.id,settings,runtime(),{entity:entity=>entityFact(entity)});
  await feed(patch,records);const result=await patch.finish();assert.equal(result.outcome,'prepared');
  assert.deepEqual(declarations(result.patch.compilation),declarations(graph));
});

test("Hidden slash names remain directional literal fields rather than incomplete reciprocal pairs", async () => {
  const targetFile=new TFile('Other.md'),settings=policy({hidden:['Secret/Link']});
  const selector=new c.ReferencePolicySelector(settings);
  assert.equal(selector.assignmentsForField('Secret/Link').length,1);assert.equal(selector.assignmentsForField('Secret').length,0);
  const found=await collect(metadata({'Secret/Link':'[[Other]]'}),{host:host([targetFile])});
  const source=ref(found.file),graph=await compile([entityFact(source),entityFact(ref(targetFile)),...found.records],settings);
  assert.equal(graph.evidenceBetween(source.id,targetFile.path)[0].role,'hidden');
  assert.deepEqual(graph.evidenceBetween(targetFile.path,source.id),[]);
});

test("only reciprocal or escaped interpretation changes require the v5 graph signature", () => {
  const ordinary={...policy(),hierarchy:{...emptyHierarchy(),exclusions:[]},baseNodeStyle:{maxLabelLength:30},datePropertyRelations:'parent'};
  const plain=c.encodeIndexSettingsSignature(ordinary);assert.equal(JSON.parse(plain).signatureVersion,4);
  assert.equal(c.compareIndexSettingsSignature(plain,ordinary).compatible,true);
  for(const name of ['Replies to/Replied by','Track\\/Part']){
    const mapped={...ordinary,hierarchy:{...ordinary.hierarchy,previous:[name]}},signature=c.encodeIndexSettingsSignature(mapped),saved=JSON.parse(signature);
    assert.equal(saved.signatureVersion,5);assert.equal(c.compareIndexSettingsSignature(signature,mapped).compatible,true);
    const old=JSON.stringify({...saved,signatureVersion:4}),comparison=c.compareIndexSettingsSignature(old,mapped);
    assert.equal(comparison.compatible,false);assert.equal(comparison.reason,'semantic-settings-changed');
    assert.deepEqual(comparison.changedKeys,['hierarchy.previous']);
  }
  for(const role of ['hidden','exclusions'])assert.equal(JSON.parse(c.encodeIndexSettingsSignature({...ordinary,hierarchy:{...ordinary.hierarchy,[role]:['Literal/Property']}})).signatureVersion,4);
});

test("ordinary quoted whitespace keys keep historical normalization, configured spelling and v4 signatures", () => {
  for(const role of ['parents','hidden']){
    const settings={...policy({[role]:[' Foo ']}),hierarchy:{...policy({[role]:[' Foo ']}).hierarchy,exclusions:[]},baseNodeStyle:{maxLabelLength:30},datePropertyRelations:'parent'};
    const mapping=c.parseHierarchyFieldMapping(' Foo ',role!=='hidden');
    assert.equal(mapping.forward,' Foo ');assert.equal(mapping.normalizedForward,'-foo-');
    const selector=new c.ReferencePolicySelector(settings);
    assert.equal(selector.assignmentsForField(' Foo ')[0].configuredFieldName,' Foo ');
    assert.equal(selector.assignmentsForField('Foo').length,0,'No ordinary-field normalization migration is introduced');
    const signature=c.encodeIndexSettingsSignature(settings);assert.equal(JSON.parse(signature).signatureVersion,4);
    assert.equal(c.compareIndexSettingsSignature(signature,settings).compatible,true);
  }
});
