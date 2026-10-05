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

test("a hot parent's complete incoming range exceeds the retired catalog owner cap without a partial sibling set", async () => {
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

test("a hot parent frontier reaches the retired catalog boundary without expanding any displayed/top-N prefix", async () => {
  const f = await fixture(false, f => {
    f.add("A.md", "", { Parent: Array.from({ length: 32 }, (_, index) => "[[Parent-" + index + "]]") });
  });
  try {
    let discoveries = 0;
    const original = f.catalog.discovery.discover.bind(f.catalog.discovery);
    f.catalog.discovery.discover = scope => { discoveries++; return original(scope); };
    rejected(await f.makeReader().prepare(request(), policy(), runtime()), "unsupported-scope");
    assert.equal(discoveries, 2);
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

// Gate-only proof uses the same acquired facts, but never upgrades a relation certificate to lists.
/** Independent full GraphIndex binding and deliberately narrower private gate inputs. */
const { centerGateSettings, centerGatePolicy, fullCenterIndex, currentNeighborhoodView, centerVisibilityCases } =
  await import("./support/requestedCenterGateFixture.mjs");

/** Assert canonical relation equality as well as each independently computed full GraphIndex gate. */
async function compareGates(result, full, scope, semantic, expected, view, fixture, presentationRevision = "presentation:1") {
  assert.equal(result.outcome, "ready", JSON.stringify(result));
  assert.equal(result.coverage, "complete-center-gates");
  assert.equal(result.certificate.visibleLists, "not-certified");
  assert.equal(result.certificate.relations.gateTotals, "not-certified", "Relation-only certificate is not relabelled");
  assert.equal(result.certificate.presentationRevision, presentationRevision);
  assert.deepEqual(result.gates, expected);
  assert(!("neighborhood" in result) && !("siblings" in result), "No uncertified visible lists escape");
  assert.equal(result.certificate.relations.coverage, "complete-visible-parent-relations");
  const index = await fullCenterIndex(M, fixture, full, semantic, view);
  const partial = await fullCenterIndex(M, fixture, result.preparation.compilation, semantic, view);
  try {
    // Actual full GraphIndex visibility, before top-N, independently defines this scene's cover.
    const parents = index.neighbours(index.get(scope.center.semanticPath), "parent").map(item => item.page.path).sort();
    const certified = result.certificate.relations.parents.map(parent => {
      const node = result.preparation.compilation.node(parent.id);
      assert(node, "Every opaque certified ID binds in its own compilation");
      assert.equal(node.semanticPath, parent.semanticPath);
      return parent.semanticPath;
    }).sort();
    assert.deepEqual(certified, parents);
    // This is a host scene contract: each real binder maps opaque identities to explicit semantic
    // paths. Derived tag IDs may differ across compilation inputs; no ID is parsed or restamped.
    // Compare complete center and selected-parent maps and every genuine declaration, including
    // hidden decisions and both directions. Relation-only tests retain their exact portable IDs.
    const stable = value => Array.isArray(value) ? value.map(stable) : value && typeof value === "object"
      ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, stable(item)])) : value;
    const evidence = (owner, path, target) => owner.evidenceBetween(path, target).map(({ id, ...item }) => JSON.stringify(stable(item))).sort();
    const relations = page => [...page.neighbours].map(([path, { target, ...relation }]) => [path, stable(relation)]).sort(([a], [b]) => a.localeCompare(b));
    for (const path of [scope.center.semanticPath, ...parents]) {
      const expectedPage = index.get(path), actualPage = partial.get(path);
      assert(expectedPage && actualPage);
      assert.deepEqual(relations(actualPage), relations(expectedPage));
      for (const target of expectedPage.neighbours.keys()) {
        assert.deepEqual(evidence(partial, path, target), evidence(index, path, target));
        assert.deepEqual(evidence(partial, target, path), evidence(index, target, path));
      }
    }
  } finally { index.destroy(); partial.destroy(); }
  assert.deepEqual(result.preparation.sources, result.certificate.relations.contributors.sources);
}

test("private center gates equal the full current GraphIndex across visibility, sort and top-N policies", async () => {
  const f = await fixture(false, f => {
    configureNeighborhood(f);
    Object.assign(f.metadata.get("A.md").frontmatter, { Children: ["[[image.png]]", "[[Missing]]"],
      Previous: "[[T]]", Next: "[[S]]", Hidden: "[[D]]" });
  });
  try {
    const semantic = assigned(), full = await fullNeighborhoodOracle(M, f, semantic, runtime());
    const views = centerVisibilityCases().map(centerGateSettings), expected = [];
    for (const view of views) {
      const index = await fullCenterIndex(M, f, full, semantic, view);
      try { expected.push(currentNeighborhoodView(index, "A.md").gates); } finally { index.destroy(); }
    }
    assert.notDeepEqual(expected[0], expected[10], "All-excluded policy must change visible counts");
    const check = guard(f);
    for (const [i, view] of views.entries()) {
      const result = await f.makeReader().prepareCenterGates(request(), policy({ settings: semantic }), centerGatePolicy(view), runtime());
      await compareGates(result, full, request(), semantic, expected[i], view, f);
      assert(result.work.gateEntityReads > 0);
    }
    check();
  } finally { f.close(); }
});

test("gate-only requests retain dormant role/image changes, hidden conflicts, and third-party tag/URL support", async () => {
  const f = await fixture();
  try {
    const semantics = [settings, assigned(), { ...assigned(), hierarchy: { ...assigned().hierarchy, hidden: ["Hidden", "Dormant"] } },
      { ...settings, inferAllLinksAsFriends: true }, { ...settings, inverseInfer: true },
      { ...settings, thumbnailProperty: "Image", nodeImageProperty: "Image" }];
    const view = centerGateSettings({ showInferredNodes: false }), expected = [];
    for (const semantic of semantics) {
      const full = await fullNeighborhoodOracle(M, f, semantic, runtime());
      const scopes = [request(), ...[...full.nodes.values()].filter(n => ["tag", "url"].includes(n.kind))
        .map(center => ({ kind: "neighborhood", center }))];
      const index = await fullCenterIndex(M, f, full, semantic, view);
      try { expected.push({ semantic, full, scopes: scopes.map(scope => ({ scope, gates: structuredClone(index.gateStats(index.get(scope.center.semanticPath))) })) }); }
      finally { index.destroy(); }
    }
    const check = guard(f);
    for (const { semantic, full, scopes } of expected) for (const { scope, gates } of scopes) {
      await compareGates(await f.makeReader().prepareCenterGates(scope, policy({ settings: semantic }), centerGatePolicy(view), runtime()), full, scope, semantic, gates, view, f);
    }
    check();
  } finally { f.close(); }
});

test("no-other-child and empty existing center have proved gates; a negative relation range does not prove center existence", async () => {
  const f = await fixture(false, f => { f.add("P.md", "", { Children: "[[Ghost]]" }); f.add("D.md", ""); });
  try {
    const full = await fullNeighborhoodOracle(M, f, settings, runtime()), view = centerGateSettings();
    const ghost = [...full.nodes.values()].find(n => n.kind === "unresolved"), scope = { kind: "neighborhood", center: ghost };
    const index = await fullCenterIndex(M, f, full, settings, view);
    const expected = structuredClone(index.gateStats(index.get(ghost.semanticPath))); index.destroy();
    const check = guard(f), reader = f.makeReader();
    const result = await reader.prepareCenterGates(scope, policy(), centerGatePolicy(view), runtime());
    await compareGates(result, full, scope, settings, expected, view, f);
    assert.equal(result.gates.bottom.visibleCount, 0); assert.equal(result.gates.bottom.hasAny, false);
    assert.deepEqual(neighborhoodView(M, result.preparation.compilation, ghost, settings).siblings, []);
    rejected(await reader.prepareCenterGates(empty(), policy(), centerGatePolicy(view), runtime()), "missing");
    check();
  } finally { f.close(); }
  // A real empty root container is present even though its relation range has no owners/edges.
  const f2 = await fixture(false, () => {});
  try {
    const scope = { kind: "neighborhood", center: f2.entities.get("folder:/").entity }, check = guard(f2);
    const result = await f2.makeReader().prepareCenterGates(scope, policy(), centerGatePolicy(centerGateSettings()), runtime());
    assert.equal(result.outcome, "ready", JSON.stringify(result));
    assert.deepEqual(Object.values(result.gates), Array(4).fill({ hasAny: false, visibleCount: 0 }));
    assert.equal(result.work.gateEntityReads, 0); check();
  } finally { f2.close(); }
});

for (const path of ["A.md", "B.md"]) for (const fault of ["missing", "wrong-id", "wrong-path", "wrong-extension"]) {
  test(`gate visibility rejects ${fault} exact physical facts for ${path} rather than pretending the target is virtual`, async () => {
    const f = await fixture();
    try {
      const validate = f.port.validateSelections; let readyForProjection = false, validations = 0;
      f.port.validateSelections = async (...args) => {
        const result = await validate(...args); if (++validations === 2) readyForProjection = true; return result;
      };
      let projectionReads = 0;
      const entity = ref => {
        const fact = f.entities.get(ref.id);
        if (!readyForProjection || ref.id !== path) return fact;
        projectionReads++;
        if (fault === "missing") return undefined;
        if (fault === "wrong-id") return { ...fact, entity: { ...fact.entity, id: "wrong" } };
        if (fault === "wrong-path") return { ...fact, file: { ...fact.file, path: "elsewhere.md" } };
        return { ...fact, file: { ...fact.file, extension: "png" } };
      };
      const reader = new M.CachedRequestedNeighborhoodReader(f.port, f.catalog.discovery, f.capture, { entity });
      const result = await reader.prepareCenterGates(request(), policy({ settings: assigned() }), centerGatePolicy(centerGateSettings()), runtime());
      rejected(result, fault === "missing" ? "missing" : "stale"); assert.equal(projectionReads, 1);
      assert(!("gates" in result));
    } finally { f.close(); }
  });
}

for (const fence of ["source", "host", "journal", "root", "semantic", "presentation", "presentation-token", "demand", "captured-host"]) {
  test(`center-gate final awaited ${fence} mutation discards computed totals`, async () => {
    const f = await fixture();
    try {
      let semanticCurrent = true, presentationCurrent = true, demand = true, hostCurrent = true, calls = 0, projectedReads = 0;
      const semantic = policy({ settings: assigned(), isCurrent: () => semanticCurrent });
      const presentationPolicy = centerGatePolicy(centerGateSettings(), { isCurrent: () => presentationCurrent });
      const revalidate = f.catalog.discovery.revalidate.bind(f.catalog.discovery);
      f.catalog.discovery.revalidate = async certificate => {
        if (++calls !== 3) return revalidate(certificate);
        assert(projectedReads > 0, "Projection precedes the final awaited fence");
        const after = ["semantic", "presentation", "presentation-token", "demand", "captured-host"].includes(fence);
        const validated = after ? await revalidate(certificate) : null;
        if (fence === "source") f.catalog.state.heads.set("T.md", { ...f.catalog.state.heads.get("T.md"), sourceRevision: "later" });
        if (fence === "host") f.catalog.environmentChanged();
        if (fence === "journal") f.catalog.repository.readDependencyRoot = async () => { throw new C.SourceFactError("dependency-pending"); };
        if (fence === "root") await f.catalog.seal();
        if (fence === "semantic") semanticCurrent = false;
        if (fence === "presentation") presentationCurrent = false;
        if (fence === "presentation-token") presentationPolicy.revision = "presentation:2";
        if (fence === "demand") demand = false;
        if (fence === "captured-host") hostCurrent = false;
        return after ? validated : revalidate(certificate);
      };
      const capture = async (id, rt) => {
        const result = await f.capture(id, rt);
        if (result.outcome === "ready") {
          const current = result.request.host.isCurrent;
          result.request = { ...result.request, host: { ...result.request.host, isCurrent: () => hostCurrent && current() } };
        }
        return result;
      };
      const reader = new M.CachedRequestedNeighborhoodReader(f.port, f.catalog.discovery, capture, { entity: ref => {
        if (calls === 2) projectedReads++; return f.entities.get(ref.id);
      } });
      const result = await reader.prepareCenterGates(request(), semantic, presentationPolicy, runtime({ isCurrent: () => demand }));
      rejected(result); assert(!("gates" in result)); assert.equal(calls, 3); assert.equal(f.repository.readers.size, 0);
      if (fence === "demand") assert.equal(result.reason, "cancelled");
      if (fence === "semantic" || fence.startsWith("presentation")) assert.equal(result.reason, "superseded");
    } finally { f.close(); }
  });
}

test("gate visibility is captured before discovery; S1-S2-S3 presentation tokens supersede old requests", async () => {
  const f = await fixture();
  try {
    const full = await fullNeighborhoodOracle(M, f, settings, runtime()), view = centerGateSettings({ excludeFilepaths: ["B.md"] });
    const index = await fullCenterIndex(M, f, full, settings, view), expected = structuredClone(index.gateStats(index.get("A.md"))); index.destroy();
    const p = centerGatePolicy(structuredClone(view)), discover = f.catalog.discovery.discover.bind(f.catalog.discovery);
    let calls = 0;
    f.catalog.discovery.discover = async scope => { if (++calls === 1) { p.settings.excludeFilepaths.length = 0; p.settings.showPageNodes = false; } return discover(scope); };
    await compareGates(await f.makeReader().prepareCenterGates(request(), policy(), p, runtime()), full, request(), settings, expected, view, f);
    let generation = 1;
    const old = centerGatePolicy(view, { isCurrent: () => generation === 1 });
    f.catalog.discovery.discover = async scope => { generation = 3; return discover(scope); };
    rejected(await f.makeReader().prepareCenterGates(request(), policy(), old, runtime()), "superseded");
    const obsolete = centerGatePolicy(view, { revision: "presentation:2", isCurrent: () => generation === 2 });
    rejected(await f.makeReader().prepareCenterGates(request(), policy(), obsolete, runtime()), "superseded");
    const latest = centerGatePolicy(view, { revision: "presentation:3", isCurrent: () => generation === 3 });
    await compareGates(await f.makeReader().prepareCenterGates(request(), policy(), latest, runtime()), full, request(), settings, expected, view, f, "presentation:3");
  } finally { f.close(); }
});

test("full GraphIndex demonstrates why partial candidate metadata and degrees cannot certify sorted visible lists", async () => {
  const f = await fixture(false, f => {
    f.add("A.md", "", { Children: ["[[B]]", "[[C]]"] });
    f.add("B.md", "", { aliases: ["Zebra"], Display: "Zulu" });
    f.add("C.md", "", { aliases: ["Alpha"], Display: "Alpha" });
    for (const letter of ["X", "Y", "Z"]) f.add(letter + ".md", "", { Friends: "[[B]]" });
    for (const file of f.files.values()) f.resolutions.set(file.basename, file.path);
  });
  try {
    const full = await fullNeighborhoodOracle(M, f, settings, runtime());
    const privateResult = await f.makeReader().prepare(request(), policy(), runtime());
    assert.equal(privateResult.outcome, "ready");
    const partial = privateResult.preparation.compilation;
    assert(full.node("B.md").neighbours.size > partial.node("B.md").neighbours.size, "Third-party degree is outside center/parent incidence");
    assert.deepEqual(partial.node("B.md").aliases, []); assert.deepEqual(full.node("B.md").aliases, ["Zebra"]);
    for (const nodeSortOrder of ["name-asc", "name-desc", "modified-asc", "modified-desc", "created-asc", "created-desc", "connections-asc", "connections-desc"]) {
      const view = centerGateSettings({ nodeSortOrder, maxItemCount: 1, showFolderNodes: false });
      const index = await fullCenterIndex(M, f, full, settings, view);
      const undercovered = await fullCenterIndex(M, f, partial, settings, view);
      try {
        const actual = currentNeighborhoodView(index, "A.md"), incomplete = currentNeighborhoodView(undercovered, "A.md");
        if (nodeSortOrder === "name-asc" || nodeSortOrder === "connections-asc") assert.notDeepEqual(actual.children, incomplete.children);
        assert.equal(actual.gates.bottom.visibleCount, 2, "Top-N=1 must not truncate gate totals");
        await compareGates(await f.makeReader().prepareCenterGates(request(), policy(), centerGatePolicy(view), runtime()), full, request(), settings, actual.gates, view, f);
      } finally { index.destroy(); undercovered.destroy(); }
    }
    // A non-reference scalar title field is host metadata, absent from every SourceEntityFact.
    const view = centerGateSettings({ renderAlias: true, nameFields: "Display", maxItemCount: 1, showFolderNodes: false });
    const first = await fullCenterIndex(M, f, full, settings, view);
    const before = currentNeighborhoodView(first, "A.md"); first.destroy();
    f.metadata.get("B.md").frontmatter.Display = "000 first";
    const second = await fullCenterIndex(M, f, full, settings, view);
    const after = currentNeighborhoodView(second, "A.md"); second.destroy();
    assert.notDeepEqual(before.children, after.children, "Equal relation/entity facts cannot determine configured-field order");
    assert.deepEqual(before.gates, after.gates);
  } finally { f.close(); }
});

/** Gate readiness must never reinterpret missing or oversized relation coverage as zero. */
test("gate requests inherit missing-root, incomplete-range and hot-parent rejection without source work", async () => {
  const f = await fixture();
  try {
    const reader = f.makeReader(), p = centerGatePolicy(centerGateSettings()), root = f.catalog.state.root;
    const check = guard(f);
    f.catalog.state.root = null;
    rejected(await reader.prepareCenterGates(request(), policy(), p, runtime()), "dependency-pending");
    f.catalog.state.root = root;
    const bucket = C.sourceDependencyBucket(C.contributorKey("node", "A.md"));
    const key = JSON.stringify([root.build.slot, bucket, 0]), page = f.catalog.state.pages.get(key), pages = new Map(f.catalog.state.pages);
    assert(page); f.catalog.state.pages.delete(key);
    rejected(await reader.prepareCenterGates(request(), policy(), p, runtime()), "dependency-invalid");
    f.catalog.state.pages = pages; check();
  } finally { f.close(); }
  const hot = await fixture(false, f => {
    f.add("A.md", "");
    for (let i = 0; i < 1025; i++) f.add("Image-" + i + ".png", "");
  });
  try {
    const check = guard(hot);
    const result = await hot.makeReader().prepareCenterGates(request(), policy(), centerGatePolicy(centerGateSettings()), runtime());
    rejected(result, "backpressure"); assert(!("gates" in result)); check();
  } finally { hot.close(); }
});

test("bounded gate visibility capture rejects oversized prefixes before discovery", async () => {
  const f = await fixture();
  try {
    let discoveries = 0;
    const discover = f.catalog.discovery.discover.bind(f.catalog.discovery);
    f.catalog.discovery.discover = scope => { discoveries++; return discover(scope); };
    const check = guard(f);
    for (const excludeFilepaths of [Array(257).fill("A"), ["A".repeat(32769)]]) {
      rejected(await f.makeReader().prepareCenterGates(request(), policy(), centerGatePolicy(centerGateSettings({ excludeFilepaths })), runtime()), "backpressure");
    }
    assert.equal(discoveries, 0); check();
  } finally { f.close(); }
});

for (const fence of ["demand", "presentation"]) {
  test(`gate projection yields and discards already-read physical inputs on ${fence} loss`, async () => {
    const f = await fixture();
    try {
      let validations = 0, projecting = false, demand = true, presentationCurrent = true, time = 0, yields = 0;
      const validate = f.port.validateSelections;
      f.port.validateSelections = async (...args) => { const result = await validate(...args); validations++; return result; };
      const reader = new M.CachedRequestedNeighborhoodReader(f.port, f.catalog.discovery, f.capture, { entity: ref => {
        if (validations === 2) projecting = true;
        return f.entities.get(ref.id);
      } });
      const rt = runtime({ isCurrent: () => demand, now: () => projecting ? ++time : 0, sliceBudgetMs: 1, yield: async () => {
        if (!projecting) return;
        yields++; if (fence === "demand") demand = false; else presentationCurrent = false;
      } });
      const check = guard(f);
      const result = await reader.prepareCenterGates(request(), policy({ settings: assigned() }),
        centerGatePolicy(centerGateSettings(), { isCurrent: () => presentationCurrent }), rt);
      rejected(result, fence === "demand" ? "cancelled" : "superseded");
      assert(!("gates" in result)); assert.equal(yields, 1); check();
    } finally { f.close(); }
  });
}

test("low-level gate projection continues beyond the former relation cap and rejects path/identity faults", async () => {
  const f = await fixture(false, f => { f.add("A.md", "", { Children: ["[[Ghost1]]", "[[Ghost2]]"] }); });
  try {
    const full = await fullNeighborhoodOracle(M, f, settings, runtime()), center = full.node("A.md");
    const original = center.neighbours, relation = [...original.values()].find(r => r.target.kind === "unresolved"); assert(relation);
    let reads = 0;
    const entities = { entity: ref => { reads++; return f.entities.get(ref.id); } };
    const project = () => M.projectCachedCenterGates(full, request().center, false, centerGateSettings(), entities, runtime());
    center.neighbours = new Map(Array.from({ length: 4097 }, (_, i) => [String(i), relation]));
    const large = await project(); assert.equal(large.outcome, "ready", JSON.stringify(large));
    assert.equal(large.work.relations, 4097); assert(reads > 0);
    center.neighbours = original; reads = 0;
    const ghost = relation.target, path = ghost.semanticPath;
    ghost.semanticPath = "x".repeat(16 * 1024 * 1024 + 1);
    assert.deepEqual(await project(), { outcome: "unproved", reason: "backpressure" });
    ghost.semanticPath = undefined;
    assert.deepEqual(await project(), { outcome: "unproved", reason: "unsupported-scope" });
    ghost.semanticPath = path;
    const other = [...original.values()].find(r => r.target.kind === "unresolved" && r.target.id !== ghost.id);
    assert(other); other.target.semanticPath = path; other.isHidden = true;
    assert.deepEqual(await project(), { outcome: "unproved", reason: "unsupported-scope" }, "A hidden collision could overwrite a visible edge in the legacy path binder");
    reads = 0;
    assert.deepEqual(await M.projectCachedCenterGates(full, request().center, false, centerGateSettings(), entities, runtime({ isCurrent: () => false })),
      { outcome: "unproved", reason: "cancelled" }); assert.equal(reads, 0);
  } finally { f.close(); }
});

test("duplicate declarations count once, target filters retain gate fill, and hidden relations contribute nothing", async () => {
  const f = await fixture(false, f => {
    f.add("A.md", "Children:: [[B]]\nChildren:: [[B]]", { Children: ["[[B]]", "[[B]]"], Hidden: "[[H]]" });
    f.add("B.md", "", { Parent: "[[A]]" }); f.add("H.md", ""); f.add("I.md", "");
    f.app.metadataCache.resolvedLinks["A.md"] = { "I.md": 1 };
    for (const file of f.files.values()) f.resolutions.set(file.basename, file.path);
  });
  try {
    const full = await fullNeighborhoodOracle(M, f, settings, runtime());
    const view = centerGateSettings({ showFolderNodes: false, showInferredNodes: false });
    const index = await fullCenterIndex(M, f, full, settings, view);
    try {
      assert(full.node("A.md").neighbours.get("H.md").isHidden);
      assert.equal(index.gateStats(index.get("A.md")).bottom.visibleCount, 1);
      const check = guard(f);
      await compareGates(await f.makeReader().prepareCenterGates(request(), policy(), centerGatePolicy(view), runtime()), full, request(), settings,
        structuredClone(index.gateStats(index.get("A.md"))), view, f);
      const hiddenTargets = centerGateSettings({ ...view, excludeFilepaths: [""] });
      const result = await f.makeReader().prepareCenterGates(request(), policy(), centerGatePolicy(hiddenTargets), runtime());
      assert.equal(result.outcome, "ready"); assert.deepEqual(result.gates.bottom, { hasAny: true, visibleCount: 0 });
      assert(Object.values(result.gates).every(gate => gate.visibleCount === 0)); check();
    } finally { index.destroy(); }
  } finally { f.close(); }
});

test("full visible lists use displayed parents and role concatenation, unlike the complete semantic gate cover", async () => {
  const f = await fixture(false, f => {
    f.add("A.md", "", { Parent: ["[[P]]", "[[Q]]"], Children: ["[[B]]", "[[C]]"], Friends: "[[Zed]]", Previous: "[[Alpha]]" });
    f.add("P.md", "", { Children: ["[[C]]", "[[Ponly]]", "[[Shared]]"] });
    f.add("Q.md", "", { Children: ["[[Qonly]]", "[[Shared]]"] });
    for (const name of ["B", "C", "Ponly", "Qonly", "Shared", "Zed", "Alpha"]) f.add(name + ".md", "");
    for (const file of f.files.values()) f.resolutions.set(file.basename, file.path);
  });
  try {
    const full = await fullNeighborhoodOracle(M, f, settings, runtime());
    for (const nodeSortOrder of ["name-asc", "name-desc"]) {
      const view = centerGateSettings({ nodeSortOrder, maxItemCount: 1, showFolderNodes: false, excludeFilepaths: ["Shared"] });
      const index = await fullCenterIndex(M, f, full, settings, view);
      try {
        const visible = currentNeighborhoodView(index, "A.md"), ascending = nodeSortOrder === "name-asc";
        assert.deepEqual(visible.parents.map(n => n.path), [ascending ? "P.md" : "Q.md"]);
        assert.deepEqual(visible.siblings.map(n => n.path), [ascending ? "C.md" : "Qonly.md"]);
        assert.deepEqual(visible.leftFriends.map(n => n.path), ["Zed.md"], "Left role precedes previous role, even if its title sorts later");
        assert.equal(visible.gates.top.visibleCount, 2); assert.equal(visible.gates.bottom.visibleCount, 2); assert.equal(visible.gates.left.visibleCount, 2);
        const result = await f.makeReader().prepareCenterGates(request(), policy(), centerGatePolicy(view), runtime());
        await compareGates(result, full, request(), settings, visible.gates, view, f);
        assert(result.certificate.relations.parents.some(p => p.id === "P.md"));
        assert(result.certificate.relations.parents.some(p => p.id === "Q.md"));
      } finally { index.destroy(); }
    }
  } finally { f.close(); }
});
