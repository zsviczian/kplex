/**
 * Finite raw-degree parity with fresh full GraphBuilder/GraphIndex, negative coverage and lifetime
 * adversaries. Catalog memory envelopes are diagnostic coordinates, not IndexedDB proof. Tests
 * call production classification/binding/sorting only; raw counts must include hidden relations.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { C, catalogFixture, ref, entityFact, head, sha, rowsFor } from "./support/contributorCatalogFixture.mjs";
import { M, settings, runtime, policy } from "./support/cachedSourceFixture.mjs";
import { degreeFixture, fullDegrees, guardDegreeReuse, rejectedDegree, compareDegrees } from "./support/candidateDegreeFixture.mjs";
import { fullNeighborhoodOracle } from "./support/requestedNeighborhoodFixture.mjs";
import { centerGateSettings, fullCenterIndex } from "./support/requestedCenterGateFixture.mjs";
import { fullTitleIndex, nestedTitleOwners } from "./support/selectedTitleFixture.mjs";

/** Exact caller-supplied refs, never implicit identity conversions in the implementation. */
const request = (...candidates) => ({ kind: "candidate-degrees", candidates });
const ghost = id => ({ id, kind: "unresolved", state: "unresolved", semanticPath: id });

for (const version of [2, 3]) {
  test(`v${version} complete finite incidence matches full raw counts under every semantic policy`, async () => {
    const f = await degreeFixture(undefined, version);
    try {
      const graph = await fullNeighborhoodOracle(M, f, settings, runtime());
      const parent = [...graph.nodes.values()].find(node => node.semanticPath === "tag:project");
      assert(parent); // Ancestor IDs are canonical opaque IDs, not their semantic paths.
      const tagParent = { id: parent.id, kind: parent.kind, state: parent.state, semanticPath: parent.semanticPath };
      const candidates = [ref("Candidate.md"), ref("Peer.md"), ref("Outside.md"), ref("image.png", "attachment"),
        tagParent, ref("tag:project/nested", "tag"), ref("https://example.com", "url"),
        ref("https://example.com/path", "url"), ref("folder:/", "container", "")];
      const variants = [settings,
        ...[false, true].flatMap(inferAllLinksAsFriends => [false, true].map(inverseInfer => ({ ...settings, inferAllLinksAsFriends, inverseInfer }))),
        ...["parents", "rightFriends", "hidden"].map(role => ({ ...settings, hierarchy: { ...settings.hierarchy, [role]: [...settings.hierarchy[role], "Dormant", "Dormant"] } })),
        { ...settings, nodeImageProperty: "Image" }, { ...settings, thumbnailProperty: "Image" },
        { ...settings, nodeImageProperty: "Image", thumbnailProperty: "Image" }];
      const expected = [];
      for (const config of variants) expected.push(await fullDegrees(f, candidates, config));
      assert.notDeepEqual(expected[0], expected[5], "Activating a dormant field changes raw incidence");
      assert.notDeepEqual(expected[0], expected[8], "Image-only suppression changes raw incidence");
      const check = guardDegreeReuse(f);
      for (const [i, config] of variants.entries()) {
        const captures = [];
        const reader = f.makeDegreeReader(f.discovery, (id, rt) => { captures.push(id); return f.capture(id, rt); });
        const result = await reader.prepare(request(...candidates), policy({ revision: `degree:${i}`, settings: config }), runtime());
        compareDegrees(result, expected[i], candidates);
        assert.equal(new Set(captures).size, captures.length);
        assert(!captures.includes("Unrelated.md"), "No all-owner acquisition/scan");
        assert.equal(result.certificate.policyRevision, `degree:${i}`);
      }
      check();
    } finally { f.close(); }
  });
}

test("candidate degree is not the partial center/parent cover or a visible gate total", async () => {
  const f = await degreeFixture(f => {
    f.add("Center.md", "", { Children: "[[Candidate]]" });
    f.add("Candidate.md", "", { Hidden: "[[Hidden]]" });
    f.add("Hidden.md", ""); f.add("Outside.md", "", { Friends: "[[Candidate]]" });
    for (const file of f.files.values()) f.resolutions.set(file.basename, file.path);
  });
  try {
    const candidate = ref("Candidate.md"), full = await fullDegrees(f, [candidate]);
    const index = await fullTitleIndex(f, { showFolderNodes: false, showInferredNodes: false, excludeFilepaths: [""] });
    try {
      const page = index.get("Candidate.md");
      assert(page.neighbours.get("Hidden.md").isHidden);
      assert.equal(page.neighbours.size, full[0].rawDegree);
      assert.equal(Object.values(index.gateStats(page)).reduce((sum, gate) => sum + gate.visibleCount, 0), 0);
    } finally { index.destroy(); }
    const check = guardDegreeReuse(f);
    const neighborhood = new M.CachedRequestedNeighborhoodReader(f.port, f.discovery, f.capture, { entity: ref => f.entities.get(ref.id) });
    const partial = await neighborhood.prepare({ kind: "neighborhood", center: ref("Center.md") }, policy(), runtime());
    assert.equal(partial.outcome, "ready");
    assert(partial.preparation.compilation.node(candidate.id).neighbours.size < full[0].rawDegree);
    const result = await f.makeDegreeReader().prepare(request(candidate), policy(), runtime());
    compareDegrees(result, full, [candidate]);
    assert(result.certificate.contributors.sources.some(stamp => stamp.head.sourceId === "Outside.md")); check();
  } finally { f.close(); }
});

test("directed hidden-only target is a present zero-degree negative; missing/dormant targets are not zero", async () => {
  const f = await degreeFixture(f => f.add("A.md", "", { Hidden: "[[Ghost]]", Dormant: "[[NotActive]]" }));
  try {
    const candidates = [ghost("Ghost")], expected = await fullDegrees(f, candidates);
    assert.deepEqual(expected, [{ id: "Ghost", rawDegree: 0 }]);
    const check = guardDegreeReuse(f);
    compareDegrees(await f.makeDegreeReader().prepare(request(...candidates), policy(), runtime()), expected, candidates);
    rejectedDegree(await f.makeDegreeReader().prepare(request(ghost("NotActive")), policy(), runtime()), "missing");
    rejectedDegree(await f.makeDegreeReader().prepare(request(ghost("Absent")), policy(), runtime()), "missing");
    rejectedDegree(await f.makeDegreeReader().prepare(request(...candidates, ghost("Absent")), policy(), runtime()), "missing"); check();
  } finally { f.close(); }
});

test("actual empty structural root has degree zero with no source capture", async () => {
  const center = ref("folder:/", "container", ""), fact = entityFact(center);
  const catalog = catalogFixture([], [fact]); await catalog.seal();
  const reader = new M.CachedRequestedCandidateDegreeReader(catalog.repository, catalog.discovery,
    () => assert.fail("No source for an empty root"), { entity: () => fact });
  const result = await reader.prepare(request(center), policy(), runtime());
  compareDegrees(result, [{ id: center.id, rawDegree: 0 }], [center]);
  assert.equal(result.work.sourceReplays, 0);
  catalog.environmentChanged(); rejectedDegree(await reader.prepare(request(center), policy(), runtime()), "host-catalog-stale");
});

test("duplicates and competing declarations from either endpoint count one raw entry per target", async () => {
  const f = await degreeFixture(f => {
    f.add("A.md", "Friends:: [[B]]\nFriends:: [[B]]", { Children: ["[[B]]", "[[B]]"] });
    f.add("B.md", "Opposes:: [[A]]", { Parent: "[[A]]", Hidden: "[[A]]" });
    f.resolutions.set("A", "A.md"); f.resolutions.set("B", "B.md");
    f.app.metadataCache.resolvedLinks["A.md"] = { "B.md": 4 };
    f.app.metadataCache.resolvedLinks["B.md"] = { "A.md": 3 };
  });
  try {
    const candidates = [ref("B.md"), ref("A.md")], expected = await fullDegrees(f, candidates);
    assert.deepEqual(expected.map(item => item.rawDegree), [2, 2], "Other endpoint plus structural folder, not evidence multiplicity");
    const check = guardDegreeReuse(f);
    compareDegrees(await f.makeDegreeReader().prepare(request(...candidates), policy(), runtime()), expected, candidates); check();
  } finally { f.close(); }
});

test("raw cardinality does not require v3 URL-label order, and counts grant no ordering authority", async () => {
  const f = await degreeFixture(nestedTitleOwners, 2);
  try {
    const candidates = [ref("https://example.com/path", "url"), ref("https://example.com", "url")];
    const expected = await fullDegrees(f, candidates), check = guardDegreeReuse(f);
    const result = await f.makeDegreeReader().prepare(request(...candidates), policy(), runtime());
    compareDegrees(result, expected, candidates);
    assert.deepEqual(result.certificate.contributors.sources.map(stamp => stamp.head.sourceId), ["Root.md", "Nested/First.md"]);
    assert.equal(result.certificate.contributors.markdownOrder, undefined); check();
  } finally { f.close(); }
});

for (const fence of ["demand", "policy", "policy-current", "host", "source-observation", "source-head", "root", "source-journal", "known-unrelated-journal", "host-journal"]) {
  test(`final awaited ${fence} discards every candidate degree`, async () => {
    const f = await degreeFixture();
    try {
      let current = true, sourceCurrent = true, changed = false;
      const p = policy(), d = f.discovery;
      const wrapped = { discover: scope => d.discover(scope), isHostCurrent: () => d.isHostCurrent(),
        revalidate: async certificate => {
          if (fence === "source-head") f.catalog.state.heads.set("Candidate.md", { ...f.catalog.state.heads.get("Candidate.md"), sequence: 999 });
          if (fence === "root") f.catalog.state.root.build.generation += "replaced";
          // Portable root-port fault only. Real open/known journal transactions are tested in Chromium.
          if (fence.endsWith("journal")) f.port.readDependencyRoot = async () => { throw new C.SourceFactError("dependency-pending"); };
          const result = await d.revalidate(certificate);
          if (fence === "demand") current = false;
          if (fence === "policy") p.revision = "changed";
          if (fence === "policy-current") p.isCurrent = () => false;
          if (fence === "host") f.app.vault.trigger("modify", f.files.get("Unrelated.md"));
          if (fence === "source-observation") sourceCurrent = false;
          changed = true; return result;
        } };
      const capture = async (id, rt) => {
        const result = await f.capture(id, rt);
        if (result.outcome !== "ready") return result;
        const host = result.request.host;
        return { ...result, request: { ...result.request, host: { ...host, isCurrent: () => sourceCurrent && host.isCurrent() } } };
      };
      rejectedDegree(await f.makeDegreeReader(wrapped, capture).prepare(request(ref("Candidate.md"), ref("Peer.md")), p, runtime({ isCurrent: () => current })));
      assert(changed, "Reached the final awaited fence, not an earlier fixture failure");
      assert.equal(f.repository.readers.size, 0);
    } finally { f.close(); }
  });
}

test("cancellation during a selected family returns no partial counts and retires every reader", async () => {
  const f = await degreeFixture();
  try {
    let current = true, visited = 0;
    const read = f.port.readSelected;
    f.port.readSelected = (id, matches, work, isCurrent) => read(id, matches, reader => work({ ...reader,
      visit: async (...args) => { const result = await reader.visit(...args); visited++; current = false; return result; },
    }), isCurrent);
    const check = guardDegreeReuse(f);
    rejectedDegree(await f.makeDegreeReader().prepare(request(ref("Candidate.md")), policy(), runtime({ isCurrent: () => current })), "cancelled");
    assert(visited); check();
  } finally { f.close(); }
});

for (const fault of ["missing-page", "checksum", "scope", "duplicate-owner", "captured-source", "physical-path", "entity-id", "semantic-path"]) {
  test(`${fault} cannot certify any raw candidate count`, async () => {
    const f = await degreeFixture();
    try {
      if (fault === "missing-page" || fault === "checksum") {
        const bucket = C.sourceDependencyBucket(C.contributorKey("node", "Candidate.md"));
        const key = JSON.stringify([f.catalog.state.root.build.slot, bucket, 0]), page = f.catalog.state.pages.get(key);
        assert(page);
        if (fault === "missing-page") f.catalog.state.pages.delete(key);
        else f.catalog.state.pages.set(key, { ...page, data: page.data + " " });
      }
      const d = f.discovery;
      const wrapped = { discover: async scope => {
        const result = await d.discover(scope);
        if (result.outcome !== "ready") return result;
        if (fault === "scope") return { ...result, scope: { ...result.scope, endpoints: [ref("Outside.md")] } };
        if (fault === "duplicate-owner") return { ...result, sourceIds: result.sourceIds.map(() => result.sourceIds[0]) };
        return result;
      }, revalidate: certificate => d.revalidate(certificate), isHostCurrent: () => d.isHostCurrent() };
      const capture = async (id, rt) => {
        const result = await f.capture(id, rt);
        if (result.outcome !== "ready" || fault !== "captured-source") return result;
        return { ...result, request: { ...result.request, sourceId: "not-the-selected-source" } };
      };
      const entities = { entity: input => {
        const fact = f.entities.get(input.id);
        if (!fact || input.id !== "Candidate.md") return fact;
        if (fault === "physical-path") return { ...fact, entity: { ...fact.entity, physicalPath: "Other.md" } };
        if (fault === "entity-id") return { ...fact, entity: { ...fact.entity, id: "Other" } };
        if (fault === "semantic-path") return { ...fact, entity: { ...fact.entity, semanticPath: "Other" } };
        return fact;
      } };
      const check = guardDegreeReuse(f);
      rejectedDegree(await f.makeDegreeReader(wrapped, capture, entities).prepare(request(ref("Candidate.md")), policy(), runtime())); check();
    } finally { f.close(); }
  });
}

for (const fault of ["pathless", "nul", "collision", "candidate-facets"]) {
  test(`${fault} legacy binding is unsupported, never path-deduplicated into a degree`, async () => {
    const first = { ...ref("opaque:first", "container", "physical/first"), semanticPath: "semantic/first" };
    const second = { ...ref("opaque:second", "container", "physical/second"), semanticPath: "semantic/second" };
    if (fault === "pathless") delete first.semanticPath;
    if (fault === "nul") first.semanticPath = "first\u0000path";
    if (fault === "collision") second.semanticPath = first.semanticPath;
    const structural = [entityFact(first), entityFact(second), { kind: "file-tree", source: first, sourceRevision: "r",
      target: { entity: second, rawTarget: second.semanticPath ?? "", resolvedBy: "structural" } }];
    const f = catalogFixture([], structural); await f.seal();
    const reader = new M.CachedRequestedCandidateDegreeReader(f.repository, f.discovery, () => assert.fail("Host-only"),
      { entity: value => structural.find(fact => fact.kind === "entity" && fact.entity.id === value.id) });
    const candidate = fault === "candidate-facets" ? { ...first, semanticPath: "wrong-path" } : first;
    rejectedDegree(await reader.prepare(request(candidate), policy(), runtime()), "unsupported-scope");
  });
}

test("opaque NodeId and distinct semantic/physical facets survive a ready host-only count", async () => {
  const candidate = { ...ref("opaque:root", "container", "real/root"), semanticPath: "folder:semantic" };
  const fact = entityFact(candidate), f = catalogFixture([], [fact]); await f.seal();
  const reader = new M.CachedRequestedCandidateDegreeReader(f.repository, f.discovery, () => assert.fail("Host-only"), { entity: () => fact });
  compareDegrees(await reader.prepare(request(candidate), policy(), runtime()), [{ id: candidate.id, rawDegree: 0 }], [candidate]);
});

test("request cardinality, identity and policy limits reject before any discovery or capture", async () => {
  let calls = 0;
  const bad = () => { calls++; assert.fail("Pre-admission rejection must do no IO"); };
  const reader = new M.CachedRequestedCandidateDegreeReader({}, { discover: bad, revalidate: bad, isHostCurrent: bad }, bad, { entity: bad });
  rejectedDegree(await reader.prepare(request(), policy(), runtime()), "unsupported-scope");
  rejectedDegree(await reader.prepare(request(ref("A"), ref("A")), policy(), runtime()), "unsupported-scope");
  rejectedDegree(await reader.prepare(request(ref("X".repeat(600_000))), policy(), runtime()), "backpressure");
  for (const fields of [Array(1025).fill("Repeated"), ["F".repeat(32769)]]) {
    const s = { ...settings, hierarchy: { ...settings.hierarchy, hidden: fields } };
    rejectedDegree(await reader.prepare(request(ref("A")), policy({ settings: s }), runtime()), "backpressure");
  }
  assert.equal(calls, 0);
});

test("complete candidate union enforces aggregate owner limits and never captures a prefix", async () => {
  const left = ref("Candidate:left"), right = ref("Candidate:right");
  const sources = Array.from({ length: 257 }, (_, i) => {
    const sourceId = `source:opaque:${i}`, source = { ...ref(`node:${i}`, "document", `physical/${i}.md`), semanticPath: `semantic/${i}` };
    return { sourceId, source, head: head(sourceId, source, i + 1), summary: { keys: [C.contributorKey("node", source.id), C.contributorKey("node", (i % 2 ? left : right).id)] } };
  });
  const f = catalogFixture(sources); await f.seal();
  for (const endpoint of [left, right]) assert.equal((await f.discovery.discover({ kind: "neighborhood", endpoints: [endpoint] })).outcome, "ready");
  const reader = new M.CachedRequestedCandidateDegreeReader(f.repository, f.discovery, () => assert.fail("No truncated owners"), { entity: () => undefined });
  rejectedDegree(await reader.prepare(request(left, right), policy(), runtime()), "backpressure");
});

for (const [name, count] of [["aggregate candidate relations", 4097], ["whole-owner nodes", 8193]]) {
  test(`hot ${name} completes with full raw-degree parity`, async () => {
    const f = await degreeFixture(f => {
      f.add("A.md", "", { Hidden: "[[Ghost]]", Friends: Array.from({ length: count }, (_, i) => `[[Target-${i}]]`) });
      if (f.resolutions) for (const file of f.files.values()) f.resolutions.set(file.basename, file.path);
    });
    try {
      const candidate = count > 8192 ? ghost("Ghost") : ref("A.md"), expected = await fullDegrees(f, [candidate]), check = guardDegreeReuse(f);
      compareDegrees(await f.makeDegreeReader().prepare(request(candidate), policy(), runtime()), expected, [candidate]); check();
    } finally { f.close(); }
  });
}

test("equal connection keys use exact entity ID as the final deterministic tie-break in full and scoped paths", async () => {
  const f = await degreeFixture(f => {
    f.add("A.md", "", { Children: "[[Center]]", aliases: ["Tie"] });
    f.add("B.md", "", { aliases: ["Tie"] }); f.add("Center.md", "");
    for (const file of f.files.values()) f.resolutions.set(file.basename, file.path);
    f.app.metadataCache.resolvedLinks["B.md"] = { "Center.md": 1 };
  });
  try {
    const view = centerGateSettings({ nodeSortOrder: "connections-asc", showFolderNodes: false });
    const full = await fullTitleIndex(f, view);
    let expected;
    try { expected = full.neighbours(full.get("Center.md"), "parent").map(item => item.page.path); }
    finally { full.destroy(); }
    assert.deepEqual(expected, ["A.md", "B.md"]);
    const candidates = [ref("A.md"), ref("B.md")], degrees = await fullDegrees(f, candidates);
    assert.equal(degrees[0].rawDegree, degrees[1].rawDegree);
    const partial = await new M.CachedRequestedNeighborhoodReader(f.port, f.discovery, f.capture,
      { entity: ref => f.entities.get(ref.id) }).prepare({ kind: "neighborhood", center: ref("Center.md") }, policy(), runtime());
    assert.equal(partial.outcome, "ready");
    const bound = await fullCenterIndex(M, f, partial.preparation.compilation, settings, view);
    try { assert.deepEqual(bound.neighbours(bound.get("Center.md"), "parent").map(item => item.page.path), ["A.md", "B.md"]); }
    finally { bound.destroy(); }
    const check = guardDegreeReuse(f);
    compareDegrees(await f.makeDegreeReader().prepare(request(...candidates), policy(), runtime()), degrees, candidates); check();
  } finally { f.close(); }
});

test("degree input is production-routed only through source acquisition and retains no storage/classifier/presentation authority", () => {
  const path = "src/index/CachedRequestedCandidateDegrees.ts", code = readFileSync(path, "utf8");
  const walk = dir => readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(join(dir, entry.name)) : [join(dir, entry.name)]);
  const callers = walk("src").filter(file => (file.endsWith(".ts") || file.endsWith(".tsx")) && file !== path
    && readFileSync(file, "utf8").includes("CachedRequestedCandidateDegree"));
  assert.deepEqual(callers, ["src/adapters/obsidian/sourceAcquisition.ts"]);
  for (const forbidden of ["getMarkdownFiles(", "getFiles(", "cachedRead(", ".rebuild(", ".replace(", ".tombstone(", "putBody(", "parseBodyMetadata(", "sortNeighbours(", "classify(", "titleFor(", "gateStats(", ".sort(", "GraphIndex", "GraphBuilder"]) {
    // Comments may trace the actual binding oracle; executable authority remains absent.
    assert(!code.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, "").includes(forbidden), forbidden);
  }
});

test("opaque source ownership is never substituted for node identity or either path facet", async () => {
  const f = await degreeFixture(f => f.add("physical.md", ""));
  try {
    const sourceId = "opaque:source", candidate = { ...ref("opaque:node", "document", "physical.md"), semanticPath: "semantic:note" };
    const original = f.requests.get("physical.md"), selected = f.catalog.state.heads.get("physical.md");
    const fact = { ...f.entities.get("physical.md"), source: candidate, entity: candidate };
    const source = { sourceId, source: candidate, head: { ...selected, sourceId } };
    const catalog = catalogFixture([source], [fact]); await catalog.seal();
    const coordinate = stamp => ({ ...stamp, head: { ...stamp.head, sourceId } });
    const port = { ...catalog.repository,
      readSelected: async (id, matches, work, current) => {
        assert.equal(id, sourceId);
        const result = await f.port.readSelected("physical.md", stamp => matches(coordinate(stamp)), reader => work({ ...reader, ...coordinate(reader) }), current);
        return result.outcome === "ready" ? { ...result, stamp: coordinate(result.stamp) } : result;
      },
      validateSelections: async (stamps, current) => {
        const checked = await catalog.repository.validateSelections(stamps);
        return checked.reason !== "ready" ? checked : f.port.validateSelections(stamps.map(stamp => ({ ...stamp, head: { ...stamp.head, sourceId: "physical.md" } })), current);
      },
    };
    const captures = [], reader = new M.CachedRequestedCandidateDegreeReader(port, catalog.discovery, async id => {
      captures.push(id);
      return { outcome: "ready", request: { ...original, sourceId, host: { ...original.host, source: candidate,
        // The acquired body/frontmatter are empty. No host presentation fields are requested.
        presentation: async () => original.host.isCurrent(),
      } } };
    }, { entity: input => input.id === candidate.id ? fact : undefined });
    const check = guardDegreeReuse(f);
    compareDegrees(await reader.prepare(request(candidate), policy(), runtime()), [{ id: candidate.id, rawDegree: 0 }], [candidate]);
    assert.deepEqual(captures, [sourceId]); check();
  } finally { f.close(); }
});

test("candidate refs and semantic settings are captured before the first await", async () => {
  const f = await degreeFixture();
  try {
    const candidate = ref("Candidate.md"), original = { ...candidate }, p = policy({ settings: structuredClone(settings) });
    const expected = await fullDegrees(f, [candidate]), check = guardDegreeReuse(f), d = f.discovery;
    const wrapped = { discover: async scope => {
      const result = await d.discover(scope);
      candidate.semanticPath = "changed-after-capture";
      p.settings.hierarchy.hidden.push("Dormant");
      return result;
    }, revalidate: certificate => d.revalidate(certificate), isHostCurrent: () => d.isHostCurrent() };
    compareDegrees(await f.makeDegreeReader(wrapped).prepare(request(candidate), p, runtime()), expected, [original]); check();
  } finally { f.close(); }
});

test("large candidate refs are snapshotted before the first continuation yield", async () => {
  const f = await degreeFixture();
  try {
    const candidates = Array.from({ length: 257 }, (_, index) => ghost(`Candidate-${index}`));
    const expectedTail = { ...candidates[256] };
    let yields = 0, discoveries = 0;
    const discovery = {
      discover: async scope => {
        discoveries++;
        assert.equal(scope.endpoints.length, candidates.length);
        assert.deepEqual(scope.endpoints[256], expectedTail, "Discovery sees the pre-yield candidate snapshot");
        return { outcome: "pending", reason: "unsupported-scope" };
      },
      revalidate: () => assert.fail("Rejected discovery has no certificate"),
      isHostCurrent: () => true,
    };
    const result = await f.makeDegreeReader(discovery).prepare(request(...candidates), policy(), runtime({ yield: async () => {
      yields++;
      if (yields === 1) candidates[256].semanticPath = "mutated-after-first-yield";
    } }));
    rejectedDegree(result, "unsupported-scope");
    assert.equal(discoveries, 1);
    assert(yields > 0, "Large candidate validation cooperatively yields after the complete snapshot exists");
  } finally { f.close(); }
});

test("selected original bucket decoded bytes are reserved before any page read or replay", async () => {
  const endpoint = ref("folder:/", "container", ""), fact = entityFact(endpoint), f = catalogFixture([], [fact]);
  await f.seal();
  const root = JSON.parse(f.state.root.data), bucket = root.buckets[C.sourceDependencyBucket(C.contributorKey("node", endpoint.id))];
  const previousRecords = bucket.records;
  bucket.bytes = 3 * 1024 * 1024; bucket.pages = 12; bucket.records = 12;
  root.rows += bucket.records - previousRecords;
  const data = JSON.stringify(root); f.state.root = { ...f.state.root, data, digest: sha(data) };
  const reads = f.state.reads;
  const reader = new M.CachedRequestedCandidateDegreeReader(f.repository, f.discovery, () => assert.fail("No hot-range capture"), { entity: () => fact });
  rejectedDegree(await reader.prepare(request(endpoint), policy(), runtime()), "decode-budget");
  assert.equal(f.state.reads, reads, "Budget is admitted before opening the committed bucket");
});

test("aggregate original bucket page reservation cannot cross the 256-page query budget", async () => {
  const endpoint = ref("folder:/", "container", ""), fact = entityFact(endpoint), f = catalogFixture([], [fact]);
  const used = new Set([C.sourceDependencyBucket(C.contributorKey("node", endpoint.id)), C.sourceDependencyBucket(C.contributorKey("host", "0"))]);
  let i = 0;
  while (used.has(C.sourceDependencyBucket(C.contributorKey("node", `unselected:${i}`)))) i++;
  const key = C.contributorKey("node", `unselected:${i}`), bucket = C.sourceDependencyBucket(key);
  let j = 0;
  while (C.sourceDependencyBucket(C.contributorKey("node", `absent:${j}`)) !== bucket) j++;
  // Valid page/root framing; unrelated bucket rows are authenticated, not returned as candidates.
  await f.seal([...rowsFor([], [fact]), ...Array.from({ length: 8192 }, () => ({ kind: "link", key, owner: C.contributorKey("host", "0") }))]);
  const reader = new M.CachedRequestedCandidateDegreeReader(f.repository, f.discovery, () => assert.fail("No truncated capture"), { entity: () => fact });
  rejectedDegree(await reader.prepare(request(ghost(`absent:${j}`), endpoint), policy(), runtime()), "backpressure");
  assert.equal(f.state.reads, 256, "The next committed bucket is rejected before opening any of its pages");
});
