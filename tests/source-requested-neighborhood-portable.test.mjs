/**
 * Production neighborhood closure with explicit portable catalog coordinates over actual memory
 * source-family reads. These coordinates are not durable heads, journal or IDB transaction evidence.
 * The independent real-browser lane uses the same live full oracle against real persisted heads.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { C, catalogFixture, ref, head } from "./support/contributorCatalogFixture.mjs";
import { M, replayFixture, settings, presentation, runtime, policy, collect } from "./support/cachedSourceFixture.mjs";
import { configureNeighborhood, fullNeighborhoodOracle, neighborhoodView } from "./support/requestedNeighborhoodFixture.mjs";

const request = () => ({ kind: "neighborhood", center: ref("A.md") });
const empty = () => ({ kind: "neighborhood", center: { id: "missing:A", kind: "unresolved", state: "unresolved", semanticPath: "missing:A" } });
const assigned = () => ({ ...settings, hierarchy: { ...settings.hierarchy, parents: ["Parent", "Dormant", "DormantInline"] } });

/** Acquire once, build production summaries, then frame exact catalog coordinates explicitly. */
async function fixture(imageOnly = false, configure = configureNeighborhood) {
  const f = replayFixture();
  configure(f, imageOnly);
  const sources = [], actual = new Map();
  for (const file of f.files.values()) {
    if (file.extension !== "md") continue;
    assert.equal((await f.acquisition.acquire(file, M.parseBodyMetadata(f.text.get(file.path)))).current, true);
    const capture = await f.acquisition.captureForReplay(file.path, presentation, runtime());
    assert.equal(capture.outcome, "ready");
    const summary = await M.summarizeContributorOwner(f.repository, capture.request, runtime());
    assert.equal(summary.outcome, "ready");
    actual.set(file.path, summary.stamp);
    sources.push({ sourceId: file.path, source: capture.request.host.source,
      head: { ...summary.stamp.head, sequence: sources.length + 1 }, summary: summary.value.summary });
  }
  const structure = await collect(new M.ObsidianStructuralSourceCollector(f.app, {
    isCurrent: () => true, sourceRevision: () => f.acquisition.hostRevision, checkpoint: async () => true,
  }));
  f.entities = new Map(structure.filter(fact => fact.kind === "entity").map(fact => [fact.entity.id, fact]));
  const catalog = catalogFixture(sources, structure);
  await catalog.seal();
  const bySource = new Map(sources.map(value => [value.sourceId, value]));
  /** Fixture envelope only; reads still validate every physical family in the production repository. */
  const coordinate = stamp => {
    const sequence = bySource.get(stamp.head.sourceId).head.sequence;
    return { head: { ...stamp.head, sequence }, sequence, saved: true };
  };
  const port = {
    readSelected: async (id, matches, work, current) => {
      const result = await f.repository.readSelected(id, stamp => matches(coordinate(stamp)),
        reader => work({ ...reader, ...coordinate(reader) }), current);
      return result.outcome === "ready" ? { ...result, stamp: coordinate(result.stamp) } : result;
    },
    validateSelections: async (stamps, current) => {
      const result = await catalog.repository.validateSelections(stamps);
      return result.reason !== "ready" ? result : f.repository.validateSelections(stamps.map(stamp => actual.get(stamp.head.sourceId)), current);
    },
  };
  const capture = (id, rt) => f.acquisition.captureForReplay(id, presentation, rt);
  const makeReader = (discovery = catalog.discovery, captureSource = capture) =>
    new M.CachedRequestedNeighborhoodReader(port, discovery, captureSource, { entity: entity => f.entities.get(entity.id) });
  return Object.assign(f, { sources, structure, catalog, port, capture, makeReader });
}

/** Every forbidden call is counted even when production catches its exception and fails closed. */
function guard(f) {
  const counters = f.acquisition.getCounters(), writes = f.catalog.state.writes;
  const before = JSON.stringify([f.catalog.state.root, [...f.catalog.state.heads], [...f.catalog.state.pages]]);
  let forbidden = 0;
  const fail = () => { forbidden++; throw new Error("Forbidden policy-only acquisition or full source build"); };
  f.app.vault.read = f.app.vault.cachedRead = f.app.vault.getRoot = f.app.vault.getFiles = f.app.vault.getMarkdownFiles = fail;
  f.acquisition.acquire = f.acquisition.parse = f.repository.replace = f.catalog.discovery.rebuild = f.catalog.host.collect = fail;
  return () => {
    assert.equal(forbidden, 0); assert.deepEqual(f.reads, []); assert.deepEqual(f.parses, []);
    assert.deepEqual(f.acquisition.getCounters(), counters); assert.equal(f.catalog.state.writes, writes);
    assert.equal(JSON.stringify([f.catalog.state.root, [...f.catalog.state.heads], [...f.catalog.state.pages]]), before);
    assert.equal(f.repository.readers.size, 0);
  };
}

/** A failed request must not expose an apparently authoritative empty or partial neighborhood. */
function rejected(result, reason) {
  assert.notEqual(result.outcome, "ready", JSON.stringify(result));
  if (reason) assert.equal(result.reason, reason);
  assert(!("preparation" in result)); assert(!("certificate" in result));
}

/** Assert the exact certificate boundary separately from the independent full semantic comparison. */
function compare(result, full, scope, config) {
  assert.equal(result.outcome, "ready", JSON.stringify(result));
  assert.equal(result.coverage, "complete-neighborhood-relations");
  assert.equal(result.certificate.gateTotals, "not-certified");
  const expected = neighborhoodView(M, full, scope.center, config);
  assert.deepEqual(result.certificate.parents.map(parent => parent.id), expected.parents);
  assert.deepEqual(result.preparation.sources, result.certificate.contributors.sources);
  assert.deepEqual(neighborhoodView(M, result.preparation.compilation, scope.center, config), expected);
  assert.equal(result.work.familyVisits, 4 * result.work.sourceReplays);
}

test("neighborhood dormant assignment/movement, inference and hidden conflicts equal independent all-owner final-policy results", async () => {
  const f = await fixture();
  try {
    const variants = [settings, assigned(),
      { ...settings, hierarchy: { ...settings.hierarchy, children: ["Dormant", "DormantInline"], rightFriends: ["Opposes", "Dormant"] } },
      { ...assigned(), hierarchy: { ...assigned().hierarchy, hidden: ["Hidden", "Dormant"], parents: ["Parent", "Dormant", "Dormant"] } },
      { ...settings, inferAllLinksAsFriends: true }, { ...settings, inverseInfer: true },
      { ...settings, inferAllLinksAsFriends: true, inverseInfer: true }, settings];
    const full = [];
    for (const config of variants) full.push(await fullNeighborhoodOracle(M, f, config, runtime()));
    const expected = full.map((value, index) => neighborhoodView(M, value, request().center, variants[index]));
    assert(!expected[0].parents.includes("P.md")); assert(expected[1].parents.includes("P.md"));
    assert.notDeepEqual(expected[1], expected[2]);
    assert(expected[1].siblings.some(sibling => sibling.id === "T.md" && sibling.witnesses.some(witness => witness.parent === "P.md")));
    assert(expected[1].parentIncidence.flatMap(parent => parent.pairs).some(pair =>
      pair.forward.decisions.some(decision => !JSON.parse(decision).active)), "Overridden declarations survive");
    const check = guard(f);
    for (const [index, config] of variants.entries()) {
      const captures = [];
      const reader = f.makeReader(f.catalog.discovery, (id, rt) => { captures.push(id); return f.capture(id, rt); });
      const result = await reader.prepare(request(), policy({ revision: "policy:" + index, settings: config }), runtime());
      compare(result, full[index], request(), config);
      assert.equal(result.work.passes, 2);
      assert.equal(captures.length, new Set(captures).size, "Each union owner captured once across both passes");
      assert(!captures.includes("D.md")); assert(!captures.includes("E.md"), "No all-owner source scan");
      assert.equal(result.certificate.policyRevision, "policy:" + index);
      if (index === 1) {
        assert(captures.includes("T.md"), "Parent's incoming child owner is not omitted");
        assert.deepEqual(result.preparation.sources.map(stamp => stamp.head.sourceId), ["A.md", "B.md", "P.md", "S.md", "T.md", "C.md"],
          "Final combined discovery preserves global source order, not capture/concatenation order");
      }
    }
    check();
  } finally { f.close(); }
});

test("neighborhood image-only selectors preserve same-policy suppression and incoming explicit conflicts", async () => {
  const f = await fixture(true);
  try {
    const variants = [settings, { ...settings, nodeImageProperty: "Image" }, { ...settings, thumbnailProperty: "Image" },
      { ...settings, nodeImageProperty: "Image", thumbnailProperty: "Image" }, { ...settings, nodeImageProperty: "Other" }];
    const full = [];
    for (const config of variants) full.push(await fullNeighborhoodOracle(M, f, config, runtime()));
    assert.notDeepEqual(neighborhoodView(M, full[0], request().center, variants[0]), neighborhoodView(M, full[1], request().center, variants[1]));
    const check = guard(f);
    for (const [index, config] of variants.entries()) compare(await f.makeReader().prepare(request(), policy({ settings: config }), runtime()), full[index], request(), config);
    check();
  } finally { f.close(); }
});

test("third-party URL/tag origins, duplicate sibling witnesses and host-only folders retain exact ownership", async () => {
  const f = await fixture();
  try {
    const full = await fullNeighborhoodOracle(M, f, assigned(), runtime());
    const url = [...full.declarations()].find(item => item.sourceKind === "url-origin"); assert(url);
    const tags = [...full.nodes.values()].filter(node => node.kind === "tag");
    assert.equal(tags.length, 2, "Leaf and compiler-derived ancestor are both exercised");
    const scopes = [...tags.map(node => node.id), url.sourceId, url.targetId, "folder:/", "image.png"]
      .map(id => { assert(full.node(id)); return { kind: "neighborhood", center: full.node(id) }; });
    const check = guard(f);
    for (const scope of scopes) {
      const result = await f.makeReader().prepare(scope, policy({ settings: assigned() }), runtime());
      compare(result, full, scope, assigned());
      if (scope.center.kind === "url") assert.deepEqual(result.preparation.sources.map(stamp => stamp.head.sourceId), ["C.md", "E.md"]);
    }
    check();
  } finally { f.close(); }
});

test("authenticated empty neighborhood finalizes one empty pass; a missing root or negative page is never empty ready", async () => {
  const f = await fixture();
  try {
    const full = await fullNeighborhoodOracle(M, f, settings, runtime());
    const check = guard(f), reader = f.makeReader();
    const result = await reader.prepare(empty(), policy(), runtime());
    compare(result, full, empty(), settings);
    assert.deepEqual(result.work, { passes: 1, sourceReplays: 0, familyVisits: 0 });
    assert.deepEqual(result.preparation.sources, []); assert.deepEqual(result.certificate.contributors.hostFacts, []);
    check();
    const root = f.catalog.state.root; f.catalog.state.root = null;
    rejected(await reader.prepare(empty(), policy(), runtime()), "dependency-pending"); f.catalog.state.root = root;
    const bucket = C.sourceDependencyBucket(C.contributorKey("node", "A.md")); let id;
    for (let i = 0; !id; i++) if (C.sourceDependencyBucket(C.contributorKey("node", "absent:" + i)) === bucket) id = "absent:" + i;
    const scope = empty(); scope.center.id = id; scope.center.semanticPath = id;
    assert.equal((await reader.prepare(scope, policy(), runtime())).outcome, "ready");
    f.catalog.state.pages.delete(JSON.stringify([root.build.slot, bucket, 0]));
    rejected(await reader.prepare(scope, policy(), runtime()), "dependency-invalid");
  } finally { f.close(); }
});

for (const fence of ["source", "host", "journal", "root", "policy", "policy-token", "demand", "captured-host", "scope", "structural-facts"]) {
  test(`neighborhood final awaited ${fence} fence discards the entire closure`, async () => {
    const f = await fixture();
    try {
      let policyCurrent = true, demand = true, hostCurrent = true, validations = 0, mutated = false;
      const p = policy({ settings: assigned(), isCurrent: () => policyCurrent });
      const original = f.catalog.discovery.revalidate.bind(f.catalog.discovery);
      f.catalog.discovery.revalidate = async certificate => {
        if (++validations !== 3) return original(certificate);
        const after = ["policy", "policy-token", "demand", "captured-host"].includes(fence);
        const checked = after ? await original(certificate) : null;
        if (fence === "source") f.catalog.state.heads.set("T.md", { ...f.catalog.state.heads.get("T.md"), sourceRevision: "new" });
        if (fence === "host") f.catalog.environmentChanged();
        if (fence === "journal") f.catalog.repository.readDependencyRoot = async () => { throw new C.SourceFactError("dependency-pending"); };
        if (fence === "root") await f.catalog.seal();
        if (fence === "policy") policyCurrent = false;
        if (fence === "policy-token") p.revision = "new-policy";
        if (fence === "demand") demand = false;
        if (fence === "captured-host") hostCurrent = false;
        if (fence === "scope") certificate.scope.endpoints[0].id = "different-center";
        if (fence === "structural-facts") certificate.hostFacts.pop();
        mutated = true;
        return after ? checked : original(certificate);
      };
      const capture = async (id, rt) => {
        const result = await f.capture(id, rt);
        if (result.outcome === "ready") {
          const current = result.request.host.isCurrent;
          result.request = { ...result.request, host: { ...result.request.host, isCurrent: () => hostCurrent && current() } };
        }
        return result;
      };
      const result = await f.makeReader(f.catalog.discovery, capture).prepare(request(), p, runtime({ isCurrent: () => demand }));
      rejected(result); assert(mutated); assert.equal(validations, 3); assert.equal(f.repository.readers.size, 0);
      if (fence === "demand") assert.equal(result.reason, "cancelled");
      if (fence.startsWith("policy")) assert.equal(result.reason, "superseded");
    } finally { f.close(); }
  });
}

for (const scope of ["empty", "host-only"]) {
  test(`${scope} neighborhood retains a synchronous host fence after final revalidation`, async () => {
    const f = await fixture();
    try {
      const requested = scope === "empty" ? empty() : { kind: "neighborhood", center: f.entities.get("folder:/").entity };
      const original = f.catalog.discovery.revalidate.bind(f.catalog.discovery); let validations = 0;
      f.catalog.discovery.revalidate = async certificate => {
        const result = await original(certificate);
        if (++validations === 2) { assert.deepEqual(certificate.sources, []); f.catalog.environmentChanged(); }
        return result;
      };
      rejected(await f.makeReader().prepare(requested, policy(), runtime()), "host-catalog-stale");
      assert.equal(validations, 2);
    } finally { f.close(); }
  });
}

for (const change of ["new-root", "missing-parent-page", "backpressure", "demand"]) {
  test(`between-pass ${change} cannot convert the direct cover into a neighborhood certificate`, async () => {
    const f = await fixture();
    try {
      let discoveries = 0, demand = true;
      const original = f.catalog.discovery.discover.bind(f.catalog.discovery);
      f.catalog.discovery.discover = async scope => {
        if (++discoveries === 2) {
          assert(scope.endpoints.some(ref => ref.id === "P.md"));
          if (change === "new-root") await f.catalog.seal();
          if (change === "missing-parent-page") f.catalog.state.pages.delete(JSON.stringify([f.catalog.state.root.build.slot,
            C.sourceDependencyBucket(C.contributorKey("node", "P.md")), 0]));
          if (change === "backpressure") return { outcome: "pending", reason: "backpressure" };
          if (change === "demand") demand = false;
        }
        return original(scope);
      };
      rejected(await f.makeReader().prepare(request(), policy({ settings: assigned() }), runtime({ isCurrent: () => demand })),
        change === "new-root" ? "superseded" : change === "missing-parent-page" ? "dependency-invalid" : change === "demand" ? "cancelled" : "backpressure");
      assert.equal(discoveries, 2); assert.equal(f.repository.readers.size, 0);
    } finally { f.close(); }
  });
}

test("a hot parent's complete incoming range exceeds the union owner cap, never admitting a partial sibling set", async () => {
  const f = await fixture();
  try {
    // These extra catalog heads need no replay: production discovery must reject the complete range first.
    for (let index = 0; index < 260; index++) {
      const sourceId = "hot:" + index, source = ref(sourceId), selected = head(sourceId, source, 100 + index);
      f.sources.push({ sourceId, source, head: selected, summary: { keys: [C.contributorKey("node", sourceId), C.contributorKey("node", "P.md")] } });
      f.catalog.state.heads.set(sourceId, selected);
    }
    await f.catalog.seal();
    let discoveries = 0;
    const original = f.catalog.discovery.discover.bind(f.catalog.discovery);
    f.catalog.discovery.discover = scope => { discoveries++; return original(scope); };
    rejected(await f.makeReader().prepare(request(), policy({ settings: assigned() }), runtime()), "backpressure");
    assert.equal(discoveries, 2);
  } finally { f.close(); }
});

test("a hot parent frontier is rejected before expanding any displayed/top-N prefix", async () => {
  const f = await fixture(false, f => {
    f.add("A.md", "", { Parent: Array.from({ length: 32 }, (_, index) => "[[Parent-" + index + "]]") });
  });
  try {
    let discoveries = 0;
    const original = f.catalog.discovery.discover.bind(f.catalog.discovery);
    f.catalog.discovery.discover = scope => { discoveries++; return original(scope); };
    rejected(await f.makeReader().prepare(request(), policy(), runtime()), "backpressure");
    assert.equal(discoveries, 1);
  } finally { f.close(); }
});

test("source-head tombstone between capture and replay cannot supply a partial neighborhood", async () => {
  const f = await fixture();
  try {
    let changed = false;
    const capture = async (id, rt) => {
      const result = await f.capture(id, rt);
      if (!changed) { changed = true; await f.repository.tombstone(id); }
      return result;
    };
    rejected(await f.makeReader(f.catalog.discovery, capture).prepare(request(), policy(), runtime()), "tombstone");
    assert(changed); assert.equal(f.repository.readers.size, 0);
  } finally { f.close(); }
});

test("the center and canonical policy are copied before the first await; tokens still supersede both passes", async () => {
  const f = await fixture();
  try {
    const config = assigned(), full = await fullNeighborhoodOracle(M, f, config, runtime());
    const requested = request(), p = policy({ settings: structuredClone(config) });
    const original = f.catalog.discovery.discover.bind(f.catalog.discovery); let calls = 0;
    f.catalog.discovery.discover = async scope => {
      if (++calls === 1) { requested.center.id = "changed-input"; p.settings.hierarchy.parents.length = 0; }
      return original(scope);
    };
    const result = await f.makeReader().prepare(requested, p, runtime());
    compare(result, full, request(), config); assert.equal(calls, 2);
  } finally { f.close(); }
});

test("a parent's complete range proves no other child; the center range alone is not an empty sibling proof", async () => {
  const f = await fixture(false, f => { f.add("P.md", "", { Children: "[[Ghost]]" }); f.add("D.md", ""); });
  try {
    const full = await fullNeighborhoodOracle(M, f, settings, runtime());
    const ghost = [...full.nodes.values()].find(node => node.kind === "unresolved"); assert(ghost);
    const scope = { kind: "neighborhood", center: ghost }, check = guard(f);
    const result = await f.makeReader().prepare(scope, policy(), runtime());
    compare(result, full, scope, settings);
    assert.equal(result.work.passes, 2); assert.deepEqual(result.certificate.parents.map(ref => ref.id), ["P.md"]);
    assert.deepEqual(neighborhoodView(M, result.preparation.compilation, ghost, settings).siblings, []);
    check();
  } finally { f.close(); }
});

test("a dormant field can add a direct parent absent from the old active graph without source work", async () => {
  const f = await fixture(false, f => {
    f.add("A.md", "", { DormantNew: "[[Z]]" }); f.add("Z.md", ""); f.add("D.md", ""); f.resolutions.set("Z", "Z.md");
  });
  try {
    const config = { ...settings, hierarchy: { ...settings.hierarchy, parents: ["Parent", "DormantNew"] } };
    const old = await fullNeighborhoodOracle(M, f, settings, runtime()), full = await fullNeighborhoodOracle(M, f, config, runtime());
    assert(!neighborhoodView(M, old, request().center, settings).centerIncidence.some(pair => pair.target === "Z.md"));
    const check = guard(f), result = await f.makeReader().prepare(request(), policy({ settings: config }), runtime());
    compare(result, full, request(), config); assert(result.certificate.parents.some(ref => ref.id === "Z.md")); check();
  } finally { f.close(); }
});


test("a hot structural parent range fails without a truncated sibling prefix", async () => {
  const f = await fixture(false, f => {
    f.add("A.md", "");
    for (let index = 0; index < 1025; index++) f.add("Attachment-" + index + ".png", "");
  });
  try {
    const check = guard(f), original = f.catalog.discovery.discover.bind(f.catalog.discovery);
    let discoveries = 0;
    f.catalog.discovery.discover = scope => { discoveries++; return original(scope); };
    rejected(await f.makeReader().prepare(request(), policy(), runtime()), "backpressure");
    assert.equal(discoveries, 2, "Only the parent expansion has the hot structural range"); check();
  } finally { f.close(); }
});

for (const fence of ["demand", "policy"]) {
  test(`parent frontier scanning yields and observes ${fence} loss before exposing a graph`, async () => {
    const f = await fixture(false, f => {
      f.add("A.md", "", { Friends: Array.from({ length: 100 }, (_, index) => "[[Friend-" + index + "]]") });
    });
    try {
      const check = guard(f), validate = f.port.validateSelections;
      let scanning = false, demand = true, policyCurrent = true, time = 0, yields = 0;
      // Cached semantics has finished compiling when it validates selections through this port.
      f.port.validateSelections = async (...args) => {
        const result = await validate(...args); if (result.reason === "ready") scanning = true; return result;
      };
      const rt = { ...runtime(), isCurrent: () => demand, now: () => scanning ? ++time : 0,
        sliceBudgetMs: 1, yield: async () => {
          if (!scanning) return;
          yields++; if (fence === "demand") demand = false; else policyCurrent = false;
        } };
      rejected(await f.makeReader().prepare(request(), policy({ isCurrent: () => policyCurrent }), rt),
        fence === "demand" ? "cancelled" : "superseded");
      assert.equal(yields, 1, "Frontier traversal must yield even if most incident relations are not parents"); check();
    } finally { f.close(); }
  });
}
