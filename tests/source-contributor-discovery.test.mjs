/** Portable discovery/proof tests. The separate real-browser lane owns IndexedDB/migration acceptance. */
import assert from "node:assert/strict";
import test from "node:test";
import { C, catalogFixture, ref, target, entityFact, head, rowsFor, sha } from "./support/contributorCatalogFixture.mjs";
import { M, replayFixture, runtime } from "./support/cachedSourceFixture.mjs";

/** Preserve opaque IDs and physical bindings in a deliberately non-path-equal owner fixture. */
function fixture() {
  const a = ref("node:A", "document", "One/A.md"), b = ref("node:a", "document", "Two/a.md"), c = ref("node:C", "document", "Elsewhere/C.md");
  const origin = ref("origin:opaque", "url"), url = ref("url:opaque", "url");
  const tag = { ...ref("tag:leaf-id", "tag"), semanticPath: "tag:project/nested" };
  const tagRecord = { kind: "tag-tree", membership: "entity-member", source: tag, sourceRevision: "tag:1",
    contribution: { source: c, revision: "tag-owner:1" }, target: target(c), provenance: { surface: "host", rawValue: "#project/nested" } };
  const sources = [
    { sourceId: "owner:A", source: a, head: head("owner:A", a, 1), records: [{ kind: "reference-candidate", source: a, target: target(b) },
      { kind: "reference-value", source: a, normalizedFieldName: "dormant" }] },
    { sourceId: "owner:a", source: b, head: head("owner:a", b, 2), records: [{ kind: "reference-candidate", source: b, target: target(a) }] },
    { sourceId: "owner:C", source: c, head: head("owner:C", c, 3), records: [tagRecord,
      { kind: "body-url", source: c, target: target(url), origin: target(origin) }] },
  ];
  const structure = [entityFact(a), entityFact(b), entityFact(c), tagRecord];
  return { ...catalogFixture(sources, structure), a, b, c, tag, origin, url, sources, structure };
}

/** Decode only rows authenticated by the currently active dependency generation. */
function activeRows(state) {
  const root = JSON.parse(state.root.data);
  return [...state.pages.values()].filter(page => page.generation === root.build.generation)
    .flatMap(page => JSON.parse(page.data));
}

/** Restore one logical host-owner coordinate from its authenticated row indices. */
function hostOrder(state, family) {
  return activeRows(state).filter(row => row.kind === "host-order" && row.family === family)
    .sort((left, right) => left.index - right.index).flatMap(row => row.owners);
}

test("opaque opposite-endpoint owners and third-party tag/URL contributors are complete and deduplicated", async () => {
  const f = fixture(); await f.seal();
  const pair = await f.discovery.discover({ kind: "pair", endpoints: [f.a, f.b] });
  assert.equal(pair.outcome, "ready", JSON.stringify(pair));
  assert.deepEqual(pair.sourceIds, ["owner:A", "owner:a"]);
  assert.deepEqual(pair.sources.map(value => value.head.physical.path), ["One/A.md", "Two/a.md"]);
  const url = await f.discovery.discover({ kind: "pair", endpoints: [f.origin, f.url] });
  assert.equal(url.outcome, "ready"); assert.deepEqual(url.sourceIds, ["owner:C"]);
  const ancestor = await f.discovery.discover({ kind: "pair", endpoints: [ref("opaque:ancestor", "tag"), f.tag] });
  assert.equal(ancestor.outcome, "ready"); assert.deepEqual(ancestor.sourceIds, ["owner:C"]);
  assert(ancestor.hostFacts.some(value => value.fact.kind === "tag-tree"));
  const dormant = await f.discovery.discover({ kind: "pair", endpoints: [ref("missing:1"), ref("missing:2")], fields: ["dormant", "dormant"] });
  assert.equal(dormant.outcome, "ready"); assert.deepEqual(dormant.sourceIds, ["owner:A"]);
});

test("an authenticated empty scope is ready, but missing root/page/owner or corrupt data never means empty", async () => {
  for (const fault of ["root", "checksum", "manifest", "page", "row", "owner"]) {
    const f = fixture(); await f.seal();
    const key = C.contributorKey("node", f.origin.id), bucket = C.sourceDependencyBucket(key);
    let missing = 0;
    while (C.sourceDependencyBucket(C.contributorKey("node", "absent:" + missing)) !== bucket) missing++;
    const request = { kind: "pair", endpoints: [ref("absent:" + missing), ref("absent:other")] };
    const before = await f.discovery.discover(request);
    assert.equal(before.outcome, "ready"); assert.deepEqual(before.sourceIds, []);
    const pageKey = JSON.stringify([f.state.root.build.slot, bucket, 0]);
    if (fault === "root") f.state.root = null;
    if (fault === "checksum") f.state.root.digest = "0".repeat(64);
    if (fault === "manifest") { const root = JSON.parse(f.state.root.data); root.buckets[bucket] = { digest: "", bytes: 0, records: 0, pages: 0 }; f.state.root.data = JSON.stringify(root); }
    if (fault === "page") f.state.pages.delete(pageKey);
    if (fault === "row") {
      const page = f.state.pages.get(pageKey), rows = JSON.parse(page.data); rows.pop(); page.data = JSON.stringify(rows);
      // Even recomputing a corrupted page's own hash cannot forge the independent root commitment.
      page.digest = sha(page.data); page.bytes = Buffer.byteLength(page.data); page.records = rows.length;
    }
    if (fault === "owner") {
      const sourceBucket = C.sourceDependencyBucket(C.contributorKey("source", "owner:C"));
      f.state.pages.delete(JSON.stringify([f.state.root.build.slot, sourceBucket, 0]));
    }
    const result = await f.discovery.discover(fault === "owner" ? { kind: "pair", endpoints: [f.origin, f.url] } : request);
    assert.notEqual(result.outcome, "ready", fault); assert(!("sourceIds" in result), fault);
  }
});

test("head/host/generation changes, cancellation, and scope tampering reject later certificates", async () => {
  for (const change of ["head", "host", "generation", "cancel", "scope", "source-selection", "host-selection"]) {
    const f = fixture(); await f.seal();
    const found = await f.discovery.discover({ kind: "pair", endpoints: [f.a, f.b] }); assert.equal(found.outcome, "ready");
    if (change === "head") f.state.heads.set("owner:a", { ...f.sources[1].head, sourceRevision: "changed" });
    if (change === "host") f.environmentChanged();
    if (change === "generation") await f.seal();
    if (change === "cancel") f.cancel();
    if (change === "scope") found.scope.endpoints[0].id = "not-the-request";
    if (change === "source-selection") found.sources.pop();
    if (change === "host-selection") found.hostFacts.pop();
    assert.notEqual(await f.discovery.revalidate(found), "ready", change);
  }
});

test("policy-only callers reuse unchanged catalog/head bytes and each dense candidate owner appears once", async () => {
  const f = fixture();
  f.sources[0].records.push(...Array.from({ length: 600 }, () => ({ kind: "reference-candidate", source: f.a, target: target(f.b) })));
  await f.seal(rowsFor(f.sources, f.structure));
  const initial = JSON.stringify([f.state.root, [...f.state.heads], [...f.state.pages]]), writes = f.state.writes;
  for (const _policy of ["baseline", "dormant", "Friend-to-Challenger", "inverse", "imagery"]) {
    const result = await f.discovery.discover({ kind: "pair", endpoints: [f.a, f.b] });
    assert.equal(result.outcome, "ready", JSON.stringify(result)); assert.equal(result.work.sourceOwners, 2);
    assert.equal(new Set(result.sourceIds).size, result.sourceIds.length);
    assert.equal(JSON.stringify([f.state.root, [...f.state.heads], [...f.state.pages]]), initial);
    assert.equal(f.state.writes, writes);
  }
});

test("empty and dense host-only catalogs exercise the production bounded writer and exact topology coverage", async () => {
  const empty = catalogFixture();
  assert.equal((await empty.discovery.discover({ kind: "pair", endpoints: [ref("none"), ref("other")] })).outcome, "pending");
  assert.equal((await empty.discovery.rebuild()).outcome, "ready");
  const absent = await empty.discovery.discover({ kind: "pair", endpoints: [ref("none"), ref("other")] });
  assert.equal(absent.outcome, "ready"); assert.deepEqual(absent.sourceIds, []);
  const folder = ref("container:opaque", "container", "actual/folder");
  const files = Array.from({ length: 1200 }, (_, index) => ref("attachment:" + index, "attachment", "real/" + index + ".png"));
  const structure = [entityFact(folder), ...files.flatMap(file => [entityFact(file), { kind: "file-tree", source: folder, sourceRevision: "tree:1",
    target: { ...target(file), resolvedBy: "structural" }, provenance: { surface: "host", definition: "file-tree" } }])];
  const f = catalogFixture([], structure);
  const built = await f.discovery.rebuild(); assert.equal(built.outcome, "ready", JSON.stringify(built));
  const found = await f.discovery.discover({ kind: "pair", endpoints: [files[0], ref("no-match")] });
  assert.equal(found.outcome, "ready", JSON.stringify(found)); assert.equal(found.hostFacts.length, 2);
  assert.deepEqual(found.sourceIds, []); assert.equal(found.hostFacts[1].fact.source.id, folder.id);
  assert.equal((await f.discovery.discover({ kind: "neighborhood", endpoints: [folder] })).outcome, "pending", "Never truncate a high-degree host-only neighborhood");
});

test("malformed or oversized requests and unknown coverage fail before reading any bucket", async () => {
  const f = fixture(); await f.seal();
  for (const request of [{ kind: "pair", endpoints: [f.a] }, { kind: "siblings", endpoints: [f.a] },
    { kind: "pair", endpoints: [f.a, f.b], depth: 2 },
    { kind: "pair", endpoints: [f.a, f.b], fields: "not-an-array" },
    { kind: "pair", endpoints: [f.a, f.b], literals: Array(257).fill("x") },
    { kind: "pair", endpoints: [f.a, f.b], literals: ["x".repeat(300000)] }]) {
    const found = await f.discovery.discover(request); assert.equal(found.outcome, "pending"); assert(!("sourceIds" in found));
  }
  assert.equal(f.state.reads, 0);
});

test("production acquisition cannot certify unsaved sources; Date and Daily Notes fences include dormant fields", async () => {
  const f = replayFixture();
  try {
    const file = f.add("A.md", "", { DormantDate: "2026-09-30" });
    assert.equal((await f.acquisition.acquire(file, M.parseBodyMetadata(""))).current, true);
    const discovery = f.acquisition.contributorDiscovery(runtime());
    const result = await discovery.rebuild(); assert.notEqual(result.outcome, "ready");
    // Exercise only the host supplement. Disk durability is deliberately absent in this fixture.
    await discovery.host.capture(entityFact({ ...ref(file.path), physicalPath: file.path }));
    assert.equal(discovery.host.validate(), true);
    f.app.dateFields.add("DormantDate"); assert.equal(discovery.host.validate(), false);
    f.app.dateFields.delete("DormantDate"); assert.equal(discovery.host.validate(), true);
    f.app.daily.folder = "Changed"; assert.equal(discovery.host.validate(), false);
    assert.deepEqual(f.reads, []); assert.deepEqual(f.parses, []);
  } finally { f.close(); }
});


test("canonical full host inventory preserves an empty root physical path and attachment topology", async () => {
  const f = replayFixture();
  try {
    f.add("picture.png", "");
    // Own-property enumeration is the oracle: integer-like keys precede later string keys, and
    // empty/non-Markdown owners remain part of the complete acquisition coordinate.
    f.app.metadataCache.resolvedLinks = { "10": {}, "2": { "picture.png": 1 }, "A.md": {} };
    f.app.metadataCache.unresolvedLinks = { "Z.md": {}, "picture.png": { Ghost: 1 }, "B.md": {} };
    const producer = f.acquisition.contributorDiscovery(runtime());
    const storage = catalogFixture();
    // Only the catalog storage port is a fixture. The inventory/finality comes from the actual
    // acquisition adapter and full structural collector, including its empty-path root contract.
    const discovery = new C.SourceContributorDiscovery(storage.repository, producer.host, runtime());
    const built = await discovery.rebuild(); assert.equal(built.outcome, "ready", JSON.stringify(built));
    const persisted = JSON.parse(storage.state.root.data);
    assert.equal(persisted.version, C.CONTRIBUTOR_CATALOG_VERSION);
    assert.deepEqual({ version: persisted.hostLinkOwnerOrder.version,
      resolved: { pages: persisted.hostLinkOwnerOrder.resolved.pages, owners: persisted.hostLinkOwnerOrder.resolved.owners,
        unsupported: persisted.hostLinkOwnerOrder.resolved.unsupported },
      unresolved: { pages: persisted.hostLinkOwnerOrder.unresolved.pages, owners: persisted.hostLinkOwnerOrder.unresolved.owners,
        unsupported: persisted.hostLinkOwnerOrder.unresolved.unsupported } }, {
      version: 1, resolved: { pages: 1, owners: 3, unsupported: 3 }, unresolved: { pages: 1, owners: 3, unsupported: 3 },
    });
    assert.deepEqual(hostOrder(storage.state, "resolved"), ["2", "10", "A.md"]);
    assert.deepEqual(hostOrder(storage.state, "unresolved"), ["Z.md", "picture.png", "B.md"]);
    const unsupportedOrder = await discovery.discoverDirectOrder(
      { kind: "neighborhood", endpoints: [ref("picture.png", "attachment")] }, { isCurrent: () => true });
    assert.notEqual(unsupportedOrder.outcome, "ready"); assert.equal(unsupportedOrder.reason, "dependency-pending");
    assert(!("resolvedSourceIds" in unsupportedOrder));
    const root = { ...ref("folder:/", "container"), physicalPath: "" };
    const found = await discovery.discover({ kind: "pair", endpoints: [root, ref("no-match")] });
    assert.equal(found.outcome, "ready", JSON.stringify(found));
    assert.deepEqual(found.sourceIds, []);
    assert(found.hostFacts.some(value => value.fact.kind === "entity" && value.fact.entity.id === root.id && value.fact.entity.physicalPath === ""));
    assert(found.hostFacts.some(value => value.fact.kind === "file-tree" && value.fact.source.physicalPath === "" && value.fact.target.entity.id === "picture.png"));
    const malformed = JSON.parse(storage.state.root.data);
    malformed.hostLinkOwnerOrder.resolved.digest = "";
    storage.state.root.data = JSON.stringify(malformed); storage.state.root.digest = sha(storage.state.root.data);
    const rejected = await discovery.discover({ kind: "pair", endpoints: [root, ref("no-match")] });
    assert.equal(rejected.outcome, "invalid"); assert.equal(rejected.reason, "dependency-invalid");
    assert.deepEqual(f.reads, []); assert.deepEqual(f.parses, []);
  } finally { f.close(); }
});

test("v4 stores two complete 20,000-owner coordinates in bounded pages while the root stays below 1 MiB", async () => {
  const storage = catalogFixture();
  const owners = Array.from({ length: 20_000 }, (_, index) => `note-${String(index).padStart(5, "0")}-${"x".repeat(32)}.md`);
  const resolved = [...owners], unresolved = [...owners].reverse();
  const host = { ...storage.host, markdownOrderVersion: 1, hostLinkOwnerOrderVersion: 1,
    captureHostLinkOwnerOrder: async () => ({ resolved, unresolved }) };
  const discovery = new C.SourceContributorDiscovery(storage.repository, host, storage.runtime);
  const built = await discovery.rebuild(); assert.equal(built.outcome, "ready", JSON.stringify(built));
  const rootBytes = Buffer.byteLength(storage.state.root.data), persisted = JSON.parse(storage.state.root.data);
  assert(rootBytes < 1024 * 1024, `compact root used ${rootBytes} bytes`);
  assert.equal(persisted.hostLinkOwnerOrder.resolved.owners, 20_000);
  assert.equal(persisted.hostLinkOwnerOrder.unresolved.owners, 20_000);
  assert(persisted.hostLinkOwnerOrder.resolved.pages > 1); assert(persisted.hostLinkOwnerOrder.unresolved.pages > 1);
  assert.deepEqual(hostOrder(storage.state, "resolved"), resolved);
  assert.deepEqual(hostOrder(storage.state, "unresolved"), unresolved);
  assert.equal(activeRows(storage.state).filter(row => row.kind === "host-order").reduce((total, row) => total + row.owners.length, 0), 40_000);
  assert.equal(activeRows(storage.state).filter(row => row.kind === "host-order-rank").length, 40_000,
    "Every durable coordinate owner has one authenticated finite-lookup rank");

  // White-box the private coordinate primitive to prove the settings-time read is selected-owner
  // bounded. Reconstructing either 20k permutation here would require dozens of dependency buckets.
  storage.state.reads = 0;
  const { root } = await discovery.root();
  const budget = { buckets: new Map(), pages: 0, bytes: 0 };
  const selected = await discovery.selectedHostOwnerOrder(root, budget, "resolved", new Map([[resolved[12_345], "selected-owner"]]));
  assert.deepEqual(selected.ordered, ["selected-owner"]); assert.deepEqual(selected.absent, []); assert.equal(selected.pages, 1);
  assert(storage.state.reads < persisted.hostLinkOwnerOrder.resolved.pages,
    `one selected rank/page must stay below full-coordinate enumeration; read ${storage.state.reads} physical pages for ${persisted.hostLinkOwnerOrder.resolved.pages} logical pages`);
});

/** Historical catalog order capabilities do not certify the newly canonical URL key space. */
test("canonical URL capability is authenticated while legacy non-URL discovery remains available", async () => {
  const f = fixture(); await f.seal();
  const scope = { kind: "neighborhood", endpoints: [f.url] };
  assert.equal((await f.discovery.discover(scope)).outcome, "ready");
  assert.equal(JSON.parse(f.state.root.data).urlIdentityVersion, 1);
  const legacy = JSON.parse(f.state.root.data); delete legacy.urlIdentityVersion;
  f.state.root.data = JSON.stringify(legacy); f.state.root.digest = sha(f.state.root.data);
  assert.equal((await f.discovery.discover(scope)).reason, "dependency-pending", "old catalog cannot certify URL absence");
  assert.equal((await f.discovery.discover({ kind: "neighborhood", endpoints: [f.a] })).outcome, "ready", "historical document coverage retained");
  const newer = { ...legacy, urlIdentityVersion: 2 };
  f.state.root.data = JSON.stringify(newer); f.state.root.digest = sha(f.state.root.data);
  assert.equal((await f.discovery.discover(scope)).reason, "dependency-invalid", "unknown URL capability fails closed");
});
