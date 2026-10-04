/**
 * Portable S2 codecs and authenticated repair reads. The journal below is an explicit STORAGE PORT,
 * not an IDB emulator. Durability, crash ordering and two-connection CAS belong to the browser suite.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { loadPortableModules } from "./support/portableTypeScript.mjs";
import { C, catalogFixture, ref, head, sha } from "./support/contributorCatalogFixture.mjs";
import { M, replayFixture, runtime } from "./support/cachedSourceFixture.mjs";
const { exports: J } = loadPortableModules(["src/index/SourceContributorJournal.ts"]);
const owner = { kind: "source", sourceId: "A.md" };

/** Retain an authentic catalog commitment and exact original head in a detached journal-port row. */
async function retainedFixture() {
  const source = ref("A.md"), original = head("A.md", source);
  const summary = { version: 1, sourceId: "A.md", sourceRevision: original.sourceRevision, sequence: original.sequence,
    source, keys: [C.contributorKey("node", "A.md"), C.contributorKey("literal", "Alias")].sort() };
  const f = catalogFixture([{ sourceId: "A.md", source, head: original, summary }]);
  await f.seal();
  const state = { record: { version: 1, owner: J.contributorJournalKey(owner), subject: owner, ticket: "ticket:1",
    slot: f.state.root.build.slot, root: { build: { ...f.state.root.build }, digest: f.state.root.digest }, original: { kind: "head", head: original },
    before: { kind: "head", head: original }, selected: { kind: "head", head: { ...original, state: "tombstone", sequence: 2 } },
    change: null, status: "unknown", impact: null }, stores: 0, visits: 0 };
  const check = (record, current) => {
    if (!current()) throw new C.SourceFactError("cancelled");
    if (J.contributorJournalAuthority(record) !== J.contributorJournalAuthority(state.record)) throw new C.SourceFactError("superseded");
  };
  f.repository.withContributorJournal = async (_owner, current, consume) => {
    const record = structuredClone(state.record);
    check(record, current);
    const result = await consume({ record, root: structuredClone(f.state.root), fence: { revision: 3, sequence: 2 }, page: async (bucket, index) => {
      check(record, current);
      return f.repository.readDependencyPage(record.root.build, bucket, index);
    } });
    await state.afterConsume?.(); check(record, current); return result;
  };
  f.repository.storeContributorImpact = async (reader, data, current) => {
    await state.beforeStore?.(); check(reader.record, current); state.stores++;
    state.record = { ...state.record, status: "known", impact: { data, digest: sha(data) } };
  };
  f.repository.validateContributorImpact = async (reader, current) => check(reader.record, current);
  f.repository.readDependencyRoot = async () => { throw new C.SourceFactError("dependency-pending"); };
  f.repository.readSelected = async () => { state.visits++; throw new Error("Deletion must not select source families"); };
  return { ...f, repair: state };
}

test("journal codec keeps SourceId/host ownership distinct and rejects ambiguous or incomplete known records", async () => {
  const f = await retainedFixture(), record = f.repair.record;
  assert(J.validContributorJournalRecord(record));
  assert.notEqual(J.contributorJournalKey({ kind: "source", sourceId: "catalog" }), J.contributorJournalKey({ kind: "host", id: "catalog" }));
  for (const invalid of [{ ...record, extra: 1 }, { ...record, slot: -1 }, { ...record, owner: "A.md" },
    { ...record, original: {} }, { ...record, status: "known" }, { ...record, selected: undefined },
    { ...record, change: { epoch: "e", from: 1, to: 1, kind: "source" } },
    { ...record, original: { kind: "head", head: { ...record.original.head, sequence: 0 } } }]) {
    assert.equal(J.validContributorJournalRecord(invalid), false);
  }
  assert.deepEqual(J.contributorJournalSelection(undefined), { kind: "missing" });
  assert.deepEqual(J.contributorJournalSelection({}), { kind: "invalid" });
  assert(J.validContributorJournalRecord({ ...record, original: { kind: "invalid" }, root: null, slot: -1 }));
  assert(!J.validContributorHostChange({ epoch: "e", from: 0, to: Infinity, kind: "topology" }));
});

test("ticket authority binds original, predecessor, selected incarnation, root and event, not knowledge status", async () => {
  const f = await retainedFixture(), r = f.repair.record, authority = J.contributorJournalAuthority(r);
  assert.equal(J.contributorJournalAuthority({ ...r, status: "known", impact: { data: "{}", digest: sha("{}") } }), authority);
  for (const changed of [{ ...r, ticket: "new" }, { ...r, selected: { kind: "missing" } },
    { ...r, before: { kind: "invalid" } }, { ...r, original: { kind: "missing" } },
    { ...r, root: { ...r.root, digest: sha("replacement") } },
    { ...r, change: { epoch: "e", from: 0, to: 1, kind: "resolution" } }]) assert.notEqual(J.contributorJournalAuthority(changed), authority);
});

test("unchanged-host deletion authenticates old summary with zero source reads; known is never query readiness", async t => {
  const f = await retainedFixture(), result = await f.discovery.prepareOwnerImpact("A.md", null, () => true);
  assert.equal(result.outcome, "known", JSON.stringify(result));
  assert.equal(result.work.familyVisits, 0); assert.equal(f.repair.visits, 0); assert.equal(f.repair.stores, 1);
  assert.deepEqual(result.certificate.next, { kind: "absent", sourceId: "A.md" });
  assert(result.certificate.affectedKeys.includes(C.contributorKey("literal", "Alias")));
  assert.deepEqual(result.certificate.sourceOwners, ["A.md"]); assert.deepEqual(result.certificate.hostOwners, []);
  result.certificate.affectedKeys.length = 0;
  const reread = await f.discovery.readOwnerImpact("A.md");
  assert.equal(reread.outcome, "known"); assert(reread.certificate.affectedKeys.length > 0, "Returned arrays do not alias stored proof");
  assert.equal((await f.discovery.discover({ kind: "pair", endpoints: [ref("B.md"), ref("C.md")] })).outcome, "pending");
  assert.equal(f.repair.record.ticket, "ticket:1");
  t.diagnostic(`Portable storage-port deletion only (NOT IndexedDB): ${JSON.stringify(result.work)}`);
});

test("pending/invalid selection and unproved deletion never turn an old summary into absence", async () => {
  for (const selected of [null, { kind: "invalid" }]) {
    const f = await retainedFixture(); f.repair.record.selected = selected;
    const result = await f.discovery.prepareOwnerImpact("A.md", null, () => true);
    assert.notEqual(result.outcome, "known"); assert.equal(f.repair.stores, 0); assert(!("certificate" in result));
  }
  const f = await retainedFixture();
  assert.equal((await f.discovery.prepareOwnerImpact("A.md", null)).outcome, "cancelled");
  assert.equal(f.repair.stores, 0);
});

test("changed host cannot exclude C's Alias referrer from A's direct impact, even after preparing a complete local delta", async () => {
  const f = await retainedFixture();
  // C contains [[Alias]]; A changes which materialized entity resolves Alias. Direct keys omit C.
  f.host.stamp = { ...f.host.stamp, revision: f.host.stamp.revision + 1 };
  const result = await f.discovery.prepareOwnerImpact("A.md", null, () => true);
  assert.equal(result.outcome, "unknown"); assert.equal(result.reason, "host-catalog-stale");
  assert.equal(result.work.familyVisits, 0); assert(!("certificate" in result)); assert(!("affectedKeys" in result));
  assert.equal(f.repair.record.status, "unknown"); assert.equal(f.repair.stores, 0);
});

test("missing/corrupt original proof cannot authorize a deletion, even with a well-formed journal envelope", async () => {
  for (const fault of ["page", "digest", "head", "root"]) {
    const f = await retainedFixture();
    if (fault === "page") f.state.pages.clear();
    if (fault === "digest") f.repair.record.root.digest = sha("corrupted");
    if (fault === "head") f.repair.record.original = { kind: "head", head: { ...f.repair.record.original.head, sequence: 7 } };
    if (fault === "root") { f.repair.record.root = null; f.repair.record.slot = -1; }
    const result = await f.discovery.prepareOwnerImpact("A.md", null, () => true);
    assert.notEqual(result.outcome, "known", fault); assert.equal(f.repair.stores, 0); assert(!("certificate" in result));
  }
});

test("a newer unknown ticket or demand loss at the awaited persistence boundary discards prepared impact", async () => {
  for (const fault of ["ticket", "demand"]) {
    const f = await retainedFixture();
    f.repair.beforeStore = async () => { if (fault === "ticket") f.repair.record.ticket = "ticket:2"; else f.cancel(); };
    const result = await f.discovery.prepareOwnerImpact("A.md", null, () => true);
    assert.notEqual(result.outcome, "known"); assert.equal(f.repair.record.status, "unknown"); assert.equal(f.repair.stores, 0);
  }
});

test("persisted known impact validates its digest and exact old/new union rather than accepting a surviving subset", async () => {
  for (const fault of ["digest", "union", "owner", "host", "authority"]) {
    const f = await retainedFixture(); assert.equal((await f.discovery.prepareOwnerImpact("A.md", null, () => true)).outcome, "known");
    const proof = JSON.parse(f.repair.record.impact.data);
    if (fault === "union") proof.affectedKeys.pop();
    if (fault === "owner") proof.sourceOwners.push("C.md");
    if (fault === "host") proof.host.from.token = "other-capability";
    if (fault === "authority") proof.authority = sha("wrong-authority");
    const data = JSON.stringify(proof);
    f.repair.record.impact = { data, digest: fault === "digest" ? sha("wrong-digest") : sha(data) };
    const result = await f.discovery.readOwnerImpact("A.md");
    assert.notEqual(result.outcome, "known", fault); assert(!("certificate" in result));
  }
});

test("host adapter journals topology, resolution and reversible Date/Daily changes without weakening its accepted validator", async () => {
  const f = replayFixture(), observations = [];
  f.repository.markContributorHostDirty = async change => { observations.push(structuredClone(change)); return "ready"; };
  try {
    const file = f.add("A.md", "", { Dormant: "2026-09-30" });
    await f.acquisition.acquire(file, M.parseBodyMetadata(""));
    const d = f.acquisition.contributorDiscovery(runtime());
    await d.host.capture({ kind: "entity", source: ref("A.md"), entity: ref("A.md"), name: "A", url: null, sourceRevision: "1" });
    f.app.dateFields.add("Dormant"); assert.equal(d.host.validate(), false); assert.equal(d.host.validate(), false);
    f.app.dateFields.delete("Dormant"); assert.equal(d.host.validate(), true);
    f.app.daily.folder = "Elsewhere"; assert.equal(d.host.validate(), false);
    f.app.metadataCache.trigger("resolved"); f.app.vault.trigger("create", file);
    assert.deepEqual(observations.map(x => x.kind), ["environment", "environment", "resolution", "topology"]);
    assert(observations.every(J.validContributorHostChange));
    assert.deepEqual(observations.map(x => [x.from, x.to]), [[0, 1], [1, 2], [2, 3], [3, 4]]);
    assert.equal(d.host.isCurrent(), false);
  } finally { f.close(); }
});

test("historical reader reservations bound concurrency before the first storage await and release on failed open", async () => {
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const repository = new M.NeutralSourceRepository({ open: () => gate, failed() {} });
  try {
    const one = repository.withContributorJournal(owner, () => true, async () => assert.fail("Storage absent"));
    const two = repository.withContributorJournal(owner, () => true, async () => assert.fail("Storage absent"));
    await assert.rejects(repository.withContributorJournal(owner, () => true, async () => null), /backpressure/);
    release(null);
    await Promise.all([assert.rejects(one, /storage-unavailable/), assert.rejects(two, /storage-unavailable/)]);
    assert.equal(repository.impactReadReservations, 0); assert.equal(repository.impactReaders.size, 0);
    await assert.rejects(repository.contributorJournalOwners(null, 65), /backpressure/);
  } finally { repository.close(); }
});

/** Lease release is an await too; a certificate cannot omit its final canonical environment check. */
test("host environment change during repair-read release discards an otherwise known impact", async () => {
  for (const method of ["prepare", "read"]) {
    const f = await retainedFixture();
    if (method === "read") assert.equal((await f.discovery.prepareOwnerImpact("A.md", null, () => true)).outcome, "known");
    f.repair.afterConsume = async () => f.environmentChanged();
    const result = method === "prepare" ? await f.discovery.prepareOwnerImpact("A.md", null, () => true) : await f.discovery.readOwnerImpact("A.md");
    assert.notEqual(result.outcome, "known"); assert(!("certificate" in result));
  }
});
