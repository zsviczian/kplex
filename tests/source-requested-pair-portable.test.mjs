/**
 * Portable pair-composition evidence. A catalog/read port assigns explicit fixture sequences to
 * production memory-repository reads; these are NOT durable heads, an IDB emulator or journal
 * transaction evidence. Production acquisition, family validation, replay, discovery, compiler and
 * resolver all run unchanged. The real IndexedDB lane independently exercises durable authority.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { C, catalogFixture, ref } from "./support/contributorCatalogFixture.mjs";
import { M, replayFixture, settings, presentation, runtime, policy, collect } from "./support/cachedSourceFixture.mjs";

const request = () => ({ kind: "pair", endpoints: [ref("A.md"), ref("B.md")] });
const unresolved = id => ({ ...ref(id, "unresolved"), state: "unresolved" });
const absent = () => ({ kind: "pair", endpoints: [unresolved("missing:1"), unresolved("missing:2")] });

/** Preserve both directed perspectives, every decision/provenance field and duplicate declarations. */
function pairView(compilation, scope = request()) {
  const [a, b] = scope.endpoints.map(value => value.id);
  /** Remove only attempt-local evidence keys and ownership revision labels, never source identity. */
  const declaration = item => { const { id, contribution, ...rest } = item; return { ...rest, contribution: { sourceId: contribution.sourceId } }; };
  /** Reuse the production precedence function, not test-owned active/overridden semantics. */
  const direction = (from, to) => {
    const edge = [...(compilation.node(from)?.neighbours.values() ?? [])].find(value => value.target.id === to);
    return { edge: edge ? { ...edge, target: edge.target.id } : null,
      decisions: M.applyOntologyPrecedence(compilation.evidenceBetween(from, to))
        .map(value => JSON.stringify({ ...value, evidence: declaration(value.evidence) })).sort() };
  };
  return { forward: direction(a, b), reverse: direction(b, a), declarations: [...compilation.declarations()]
    .filter(value => value.sourceId === a && value.targetId === b || value.sourceId === b && value.targetId === a)
    .map(value => JSON.stringify(declaration(value))).sort() };
}

/** Independently collect all owners and full canonical structure under the exact final policy. */
async function fullOracle(f, config) {
  const host = M.createObsidianMetadataSourceHost(f.app);
  const cr = { isCurrent: () => true, sourceRevision: () => f.acquisition.hostRevision, checkpoint: async () => true };
  const records = await collect(new M.ObsidianStructuralSourceCollector(f.app, cr));
  for (const file of f.files.values()) {
    if (file.extension !== "md") continue;
    const metadata = M.mergeFileMetadata(f.metadata.get(file.path), M.parseBodyMetadata(f.text.get(file.path)));
    records.push(...await collect(new M.ObsidianHostLinkSourceCollector(f.app, cr, file.path)));
    records.push(...await collect(new M.ObsidianMetadataSourceCollector(host, cr, file, metadata, presentation, "metadata")));
    records.push(...await collect(new M.ObsidianReferenceSourceCollector({ metadataCache: f.app.metadataCache,
      resolvedLinkCount: host.resolvedLinkCount }, cr, file, metadata)));
    records.push(...await collect(new M.ObsidianMetadataSourceCollector(host, cr, file, metadata, presentation, "relations")));
  }
  const compiler = new M.NormalizedGraphCompiler(config, runtime());
  const boundary = { generation: "full-pair-oracle", snapshotRevision: "full" }, read = compiler.beginRead(boundary);
  for (let start = 0, sequence = 0; start < records.length; start += 256, sequence++) {
    assert.equal(await compiler.acceptBatch(read, { boundary, sequence, records: records.slice(start, start + 256), final: start + 256 >= records.length }), true);
  }
  assert.equal(compiler.completeRead(read, boundary), true);
  const compiled = await compiler.finish(); assert(compiled); return compiled;
}

/** Source facts are acquired once; a narrow catalog port supplies fixture coordinates explicitly. */
async function fixture(imageOnly = false) {
  const f = replayFixture();
  if (imageOnly) {
    f.add("A.md", "", { Image: "[[B]]" });
    f.add("B.md", "Friends:: [[A]]", { Parent: "[[A]]" });
    f.app.metadataCache.resolvedLinks["A.md"] = { "B.md": 1 };
  } else {
    f.add("A.md", "DormantInline:: [[B]]\nFriends:: [[B]]\nFriends:: [[B]]", { Dormant: ["[[B]]", "[[B]]"], Friends: "[[B]]", Image: "[[B]]" });
    f.add("B.md", "Opposes:: [[A]]", { Parent: "[[A]]" });
    f.app.metadataCache.resolvedLinks["A.md"] = { "B.md": 7 };
  }
  f.app.metadataCache.resolvedLinks["B.md"] = { "A.md": 2 };
  f.add("C.md", "[Third party](https://example.com/path)", { Friends: "[[A]]" });
  f.app.metadataCache.resolvedLinks["C.md"] = { "A.md": 1 };
  f.add("D.md", "", { Unrelated: "[[Nowhere]]" }); f.add("image.png", "");
  f.metadata.get("A.md").hostTags = ["#project/nested", "#project/nested"];
  f.resolutions.set("A", "A.md"); f.resolutions.set("B", "B.md");
  const sources = [], actual = new Map();
  for (const file of f.files.values()) {
    if (file.extension !== "md") continue;
    assert.equal((await f.acquisition.acquire(file, M.parseBodyMetadata(f.text.get(file.path)))).current, true);
    const captured = await f.acquisition.captureForReplay(file.path, presentation, runtime()); assert.equal(captured.outcome, "ready");
    const summary = await M.summarizeContributorOwner(f.repository, captured.request, runtime()); assert.equal(summary.outcome, "ready");
    actual.set(file.path, summary.stamp);
    sources.push({ sourceId: file.path, source: captured.request.host.source,
      head: { ...summary.stamp.head, sequence: sources.length + 1 }, summary: summary.value.summary });
  }
  const structure = await collect(new M.ObsidianStructuralSourceCollector(f.app, {
    isCurrent: () => true, sourceRevision: () => f.acquisition.hostRevision, checkpoint: async () => true,
  }));
  const entities = new Map(structure.filter(value => value.kind === "entity").map(value => [value.entity.id, value]));
  const catalog = catalogFixture(sources, structure); await catalog.seal();
  const bySource = new Map(sources.map(value => [value.sourceId, value]));
  /** Catalog-port coordinates only: family visits still use the unchanged production selected read. */
  const coordinate = stamp => {
    const sequence = bySource.get(stamp.head.sourceId).head.sequence;
    return { head: { ...stamp.head, sequence }, sequence, saved: true };
  };
  const port = {
    /** Pass through complete validated reads and every family; project only the fixture envelope. */
    readSelected: async (id, matches, work, current) => {
      const result = await f.repository.readSelected(id, stamp => matches(coordinate(stamp)),
        reader => work({ ...reader, ...coordinate(reader) }), current);
      return result.outcome === "ready" ? { ...result, stamp: coordinate(result.stamp) } : result;
    },
    /** Both the catalog selection and the underlying actual memory head must remain selected. */
    validateSelections: async (stamps, current) => {
      const checked = await catalog.repository.validateSelections(stamps);
      return checked.reason !== "ready" ? checked : f.repository.validateSelections(stamps.map(stamp => actual.get(stamp.head.sourceId)), current);
    },
  };
  const capture = (id, rt) => f.acquisition.captureForReplay(id, presentation, rt);
  const makeReader = (discovery = catalog.discovery, captureSource = capture) => new M.CachedRequestedPairReader(port, discovery, captureSource,
    { entity: entity => entities.get(entity.id) });
  return { ...f, catalog, structure, entities, port, actual, capture, makeReader };
}

/** Policy-only tests may read facts, not parse, acquire, scan the Vault or rewrite heads/catalogs. */
function guard(f) {
  const counters = f.acquisition.getCounters(), writes = f.catalog.state.writes;
  const before = JSON.stringify([f.catalog.state.root, [...f.catalog.state.heads], [...f.catalog.state.pages]]);
  let forbidden = 0;
  /** A trap is separately counted because production rejection deliberately catches read failures. */
  const fail = () => { forbidden++; throw new Error("Forbidden source work"); };
  f.app.vault.read = f.app.vault.cachedRead = f.app.vault.getFiles = f.app.vault.getMarkdownFiles = f.app.vault.getRoot = fail;
  f.repository.replace = f.acquisition.acquire = f.acquisition.parse = f.catalog.discovery.rebuild = fail;
  return () => {
    assert.equal(forbidden, 0); assert.deepEqual(f.reads, []); assert.deepEqual(f.parses, []);
    assert.deepEqual(f.acquisition.getCounters(), counters); assert.equal(f.catalog.state.writes, writes);
    assert.equal(JSON.stringify([f.catalog.state.root, [...f.catalog.state.heads], [...f.catalog.state.pages]]), before);
  };
}

/** No partial compilation or coverage token can escape any rejected preparation. */
function rejected(result, reason) {
  assert.notEqual(result.outcome, "ready", JSON.stringify(result));
  if (reason) assert.equal(result.reason, reason);
  assert(!("preparation" in result)); assert(!("certificate" in result));
}

test("portable exact pair equals the all-owner full oracle for dormant fields, multiplicity and inference policies", async () => {
  const f = await fixture();
  try {
    const variants = [settings,
      { ...settings, hierarchy: { ...settings.hierarchy, parents: ["Parent", "Dormant", "DormantInline"] } },
      { ...settings, hierarchy: { ...settings.hierarchy, children: ["Dormant", "DormantInline"], rightFriends: ["Opposes", "Dormant"] } },
      { ...settings, hierarchy: { ...settings.hierarchy, parents: ["Parent", "Dormant", "Dormant"], hidden: ["Hidden", "Dormant"] } },
      { ...settings, inferAllLinksAsFriends: true }, { ...settings, inverseInfer: true },
      { ...settings, inferAllLinksAsFriends: true, inverseInfer: true }, settings];
    const expected = [];
    for (const config of variants) expected.push(pairView(await fullOracle(f, config)));
    assert.notDeepEqual(expected[0], expected[1]); assert.notDeepEqual(expected[1], expected[2]);
    assert(expected[0].forward.decisions.some(value => !JSON.parse(value).active));
    assert.deepEqual(expected[0], expected.at(-1), "Removing the field restores the original policy result");
    const check = guard(f), reader = f.makeReader();
    for (const [index, config] of variants.entries()) {
      const result = await reader.prepare(request(), policy({ revision: `policy:${index}`, settings: config }), runtime());
      assert.equal(result.outcome, "ready", JSON.stringify(result)); assert.equal(result.coverage, "complete-pair");
      assert.deepEqual(result.certificate.sources.map(value => value.head.sourceId), ["A.md", "B.md", "C.md"]);
      assert.deepEqual(result.preparation.sources, result.certificate.sources);
      assert.equal(result.preparation.policyRevision, `policy:${index}`);
      assert.deepEqual(pairView(result.preparation.compilation), expected[index], `Policy ${index}`);
      assert.equal(result.preparation.work.length, 3); assert(result.preparation.work.every(value => value.familyVisits === 4));
    }
    check();
  } finally { f.close(); }
});

test("portable image-only suppression changes generic evidence without losing incoming explicit support", async () => {
  const f = await fixture(true);
  try {
    const variants = [settings, { ...settings, nodeImageProperty: "Image" }, { ...settings, thumbnailProperty: "Image" },
      { ...settings, nodeImageProperty: "Image", thumbnailProperty: "Image" }, { ...settings, nodeImageProperty: "NotImage" }];
    const expected = [];
    for (const config of variants) expected.push(pairView(await fullOracle(f, config)));
    const incoming = view => view.declarations.map(value => JSON.parse(value)).filter(value => value.declaredById === "A.md" && value.sourceKind === "obsidian-link");
    assert.equal(incoming(expected[0]).length, 1); assert.equal(incoming(expected[1]).length, 0);
    assert.deepEqual(expected[0], expected[4]);
    const check = guard(f), reader = f.makeReader();
    for (const [index, config] of variants.entries()) {
      const result = await reader.prepare(request(), policy({ settings: config }), runtime());
      assert.equal(result.outcome, "ready", JSON.stringify(result)); assert.deepEqual(pairView(result.preparation.compilation), expected[index]);
    }
    check();
  } finally { f.close(); }
});

test("portable third-party URL origin, tag multiplicity and host-only attachment pair retain canonical ownership", async () => {
  const f = await fixture();
  try {
    const full = await fullOracle(f, settings), declarations = [...full.declarations()];
    const origin = declarations.find(value => value.sourceKind === "url-origin"); assert(origin);
    const originPair = { kind: "pair", endpoints: [ref(origin.sourceId, "url"), ref(origin.targetId, "url")] };
    const tag = declarations.find(value => value.sourceKind === "tag-tree" && value.targetId === "A.md"); assert(tag);
    const tagPair = { kind: "pair", endpoints: [ref(tag.sourceId, "tag"), ref("A.md")] };
    const tree = declarations.find(value => value.sourceKind === "file-tree" && value.targetId === "image.png"); assert(tree);
    const treePair = { kind: "pair", endpoints: [f.entities.get(tree.sourceId).entity, f.entities.get(tree.targetId).entity] };
    const check = guard(f), reader = f.makeReader();
    for (const [scope, ids] of [[originPair, ["C.md"]], [tagPair, ["A.md", "B.md", "C.md"]], [treePair, []]]) {
      const result = await reader.prepare(scope, policy(), runtime());
      assert.equal(result.outcome, "ready", JSON.stringify(result));
      assert.deepEqual(result.certificate.sources.map(value => value.head.sourceId), ids);
      assert.deepEqual(pairView(result.preparation.compilation, scope), pairView(full, scope));
    }
    check();
  } finally { f.close(); }
});

test("portable authenticated empty pair succeeds, but missing root/negative page and candidates-only do not", async () => {
  const f = await fixture();
  try {
    const full = await fullOracle(f, settings), reader = f.makeReader();
    const empty = await reader.prepare(absent(), policy(), runtime());
    assert.equal(empty.outcome, "ready", JSON.stringify(empty)); assert.deepEqual(empty.preparation.sources, []);
    assert.deepEqual(empty.preparation.work, []); assert.deepEqual(pairView(empty.preparation.compilation, absent()), pairView(full, absent()));
    const sourceOnly = await new M.CachedSourceSemanticReader(f.repository).prepare([], policy(), { entity: () => undefined }, runtime());
    assert.equal(sourceOnly.reason, "missing");
    const root = f.catalog.state.root; f.catalog.state.root = null;
    rejected(await reader.prepare(absent(), policy(), runtime()), "dependency-pending"); f.catalog.state.root = root;
    const bucket = C.sourceDependencyBucket(C.contributorKey("node", "A.md")); let id;
    for (let i = 0; !id; i++) if (C.sourceDependencyBucket(C.contributorKey("node", "absent:" + i)) === bucket) id = "absent:" + i;
    const negative = { kind: "pair", endpoints: [unresolved(id), unresolved("no-target")] };
    assert.equal((await reader.prepare(negative, policy(), runtime())).outcome, "ready");
    f.catalog.state.pages.delete(JSON.stringify([root.build.slot, bucket, 0]));
    rejected(await reader.prepare(negative, policy(), runtime()), "dependency-invalid");
    const candidates = f.makeReader({ discover: async () => ({ outcome: "ready", coverage: "candidates-only", sources: [], sourceIds: [] }), revalidate: async () => "ready", isHostCurrent: () => true });
    rejected(await candidates.prepare(absent(), policy(), runtime()), "dependency-invalid");
  } finally { f.close(); }
});

for (const fence of ["source", "host", "journal", "root", "policy", "policy-token", "demand", "captured-host", "scope", "structural-facts"]) {
  test(`portable final awaited ${fence} fence discards the pair`, async () => {
    const f = await fixture();
    try {
      let policyCurrent = true, demand = true, hostCurrent = true, validations = 0, mutated = false;
      const p = policy({ isCurrent: () => policyCurrent }), rt = runtime({ isCurrent: () => demand });
      const original = f.catalog.discovery.revalidate.bind(f.catalog.discovery);
      f.catalog.discovery.revalidate = async certificate => {
        validations++;
        if (validations !== 2) return original(certificate);
        // Pure callback changes can occur after the await; storage changes must be seen by the real validator.
        const after = ["policy", "policy-token", "demand", "captured-host"].includes(fence);
        const checked = after ? await original(certificate) : null;
        if (fence === "source") f.catalog.state.heads.set("A.md", { ...f.catalog.state.heads.get("A.md"), sourceRevision: "new" });
        if (fence === "host") f.catalog.environmentChanged();
        if (fence === "journal") f.catalog.repository.readDependencyRoot = async () => { throw new C.SourceFactError("dependency-pending"); };
        if (fence === "root") await f.catalog.seal();
        if (fence === "policy") policyCurrent = false;
        if (fence === "policy-token") p.revision = "new-policy";
        if (fence === "demand") demand = false;
        if (fence === "captured-host") hostCurrent = false;
        if (fence === "scope") certificate.scope.endpoints[0].id = "different-pair";
        if (fence === "structural-facts") certificate.hostFacts.pop();
        mutated = true;
        return after ? checked : original(certificate);
      };
      const capture = async (id, runtime) => {
        const value = await f.capture(id, runtime);
        if (value.outcome === "ready") {
          const current = value.request.host.isCurrent;
          value.request = { ...value.request, host: { ...value.request.host, isCurrent: () => hostCurrent && current() } };
        }
        return value;
      };
      const result = await f.makeReader(f.catalog.discovery, capture).prepare(request(), p, rt);
      rejected(result); assert(mutated); assert.equal(validations, 2); assert.equal(f.repository.readers.size, 0);
      if (fence === "demand") assert.equal(result.reason, "cancelled");
      if (fence.startsWith("policy")) assert.equal(result.reason, "superseded");
    } finally { f.close(); }
  });
}

test("portable final stamp revalidation rejects a catalog selection superseded while capturing owners", async () => {
  const f = await fixture();
  try {
    let changed = false;
    const capture = async (id, rt) => {
      const result = await f.capture(id, rt);
      if (!changed) { changed = true; f.catalog.state.heads.set(id, { ...f.catalog.state.heads.get(id), sourceRevision: "new" }); }
      return result;
    };
    rejected(await f.makeReader(f.catalog.discovery, capture).prepare(request(), policy(), runtime()), "superseded");
    assert(changed);
  } finally { f.close(); }
});

for (const fence of ["host", "journal", "policy", "demand"]) {
  test(`portable certified empty pair retains its final ${fence} fence without source callbacks`, async () => {
    const f = await fixture();
    try {
      let live = true, policyCurrent = true, validations = 0, mutated = false;
      const original = f.catalog.discovery.revalidate.bind(f.catalog.discovery);
      f.catalog.discovery.revalidate = async certificate => {
        if (++validations !== 2) return original(certificate);
        if (fence === "journal") {
          f.catalog.repository.readDependencyRoot = async () => { throw new C.SourceFactError("dependency-pending"); };
          mutated = true; return original(certificate);
        }
        const result = await original(certificate);
        if (fence === "host") f.catalog.environmentChanged();
        if (fence === "policy") policyCurrent = false;
        if (fence === "demand") live = false;
        mutated = true; return result;
      };
      const result = await f.makeReader().prepare(absent(), policy({ isCurrent: () => policyCurrent }), runtime({ isCurrent: () => live }));
      rejected(result, { host: "host-catalog-stale", journal: "dependency-pending", policy: "superseded", demand: "cancelled" }[fence]);
      assert(mutated); assert.equal(validations, 2); assert.equal(f.repository.readers.size, 0);
    } finally { f.close(); }
  });
}

test("portable explicit host-only preparation rejects oversized and wrong-identity structural inputs", async () => {
  const f = await fixture();
  try {
    const reader = new M.CachedSourceSemanticReader(f.repository), entity = f.entities.values().next().value;
    const port = { entity: ref => f.entities.get(ref.id) };
    rejected(await reader.prepare([], policy(), port, runtime(), Array.from({ length: 1025 }, () => entity)), "backpressure");
    const tooLarge = { ...entity, name: "x".repeat(M.MAX_CACHED_SCOPE_ESTIMATED_BYTES) };
    rejected(await reader.prepare([], policy(), port, runtime(), [tooLarge]), "decode-budget");
    rejected(await reader.prepare([], policy(), { entity: () => ({ ...entity, entity: { ...entity.entity, id: "wrong-id" } }) }, runtime(), [entity]), "invalid-frame");
    const scope = request(); scope.endpoints[1] = scope.endpoints[0];
    rejected(await f.makeReader().prepare(scope, policy(), runtime()), "unsupported-scope");
  } finally { f.close(); }
});


test("portable selected-source tombstone between capture and replay rejects before consuming families", async () => {
  const f = await fixture();
  try {
    let changed = false, reads = 0;
    const original = f.port.readSelected;
    f.port.readSelected = (...args) => { reads++; return original(...args); };
    const capture = async (id, rt) => {
      const result = await f.capture(id, rt);
      if (!changed) {
        const removed = await f.repository.tombstone(id);
        assert.equal(removed.outcome, "unsaved"); assert.equal(removed.reason, "storage-unavailable"); changed = true;
      }
      return result;
    };
    rejected(await f.makeReader(f.catalog.discovery, capture).prepare(request(), policy(), runtime()), "tombstone");
    assert(changed); assert.equal(reads, 1); assert.equal(f.repository.readers.size, 0);
  } finally { f.close(); }
});
