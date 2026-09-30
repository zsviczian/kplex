/**
 * C2 source-local summary/delta boundary. These tests use production replay and the explicitly
 * storage-unavailable SI4a fixture; catalog fixtures are a separate storage port, not IndexedDB.
 * They do not claim that a private delta closes host impact or provides incremental root selection.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { M, replayFixture, presentation, runtime } from "./support/cachedSourceFixture.mjs";
import { C, catalogFixture, ref, head, rowsFor, entityFact, sha } from "./support/contributorCatalogFixture.mjs";

/** Acquire genuine cached neutral input once, including lexical aliases absent from normalized output. */
async function acquiredFixture() {
  const f = replayFixture();
  const file = f.add("A.md", "Friends:: [[Alias]] [[B]]\nDormant:: [[Missing]]\n[Page](https://example.com/path)",
    { Friends: "[[Alias]] [[B]]", Inactive: "[[Never visible]]", Empty: "" });
  f.add("B.md", ""); f.add("C.md", "");
  f.resolutions.set("Alias", "B.md"); f.resolutions.set("B", "B.md");
  f.metadata.get("A.md").hostTags = ["#project/nested", "#project/nested"];
  f.metadata.get("A.md").links = [{ link: "B", original: "[[B]]", position: { start: { line: 0, offset: 0 }, end: { line: 0, offset: 5 } } }];
  for (const id of ["A.md", "B.md", "C.md"]) assert.equal((await f.acquisition.acquire(f.files.get(id), M.parseBodyMetadata(f.text.get(id)))).current, true);
  const captured = await f.acquisition.captureForReplay("A.md", presentation, runtime());
  assert.equal(captured.outcome, "ready");
  return { ...f, file, request: captured.request };
}

/** Remove only attempt-local batch boundaries; record values, multiplicity and finality remain exact. */
function stableBatch(batch) { return { sequence: batch.sequence, final: batch.final, records: structuredClone(batch.records) }; }

/** Count selected reads and family visits without substituting storage, decoded facts or leases. */
function countReads(repository) {
  const original = repository.readSelected.bind(repository), counts = { selected: 0, families: [] };
  repository.readSelected = (id, matches, work, current) => {
    counts.selected++;
    return original(id, matches, reader => work({ ...reader, visit: (family, consume) => {
      counts.families.push([id, family]); return reader.visit(family, consume);
    } }), current);
  };
  return counts;
}

/** Awaited observation must not alter any accepted SI4a normalized record or work counter. */
test("stored observer shares four visits, preserves all normalized batches and has no second replay", async () => {
  const f = await acquiredFixture();
  try {
    const plain = [], observed = [], records = [], families = new Set();
    const replay = new M.CachedSourceReplay(f.repository);
    const before = await replay.read(f.request, runtime(), batch => { plain.push(stableBatch(batch)); return true; });
    const after = await replay.read(f.request, runtime(), batch => { observed.push(stableBatch(batch)); return true; },
      async (family, batch) => { families.add(family); records.push(...structuredClone(batch)); await Promise.resolve(); return true; });
    assert.equal(before.outcome, "ready"); assert.equal(after.outcome, "ready");
    assert.deepEqual(observed, plain); assert.deepEqual(after.value.work, before.value.work);
    assert.equal(after.value.work.familyVisits, 4); assert.equal(records.length, after.value.work.storedRecords);
    assert.deepEqual([...families], ["resolution", "metadata", "values", "body-urls"]);
    const normalized = plain.flatMap(batch => batch.records).filter(record => record.kind === "reference-candidate");
    assert(records.some(record => record.kind === "reference-candidate" && record.rawTarget === "B"));
    assert(!normalized.some(record => record.target.rawTarget === "B"), "Canonical target deduplication is not changed to build a summary");
    assert.equal(f.repository.readers.size, 0); assert.equal(f.repository.decodeBytes, 0);
  } finally { f.close(); }
});

/** An observer await is a real backpressure boundary, not a detached best-effort notification. */
test("observer backpressure, false, throw and cancellation release the selected source without partial readiness", async () => {
  for (const fault of ["cancel", "false", "throw"]) {
    const f = await acquiredFixture();
    let release;
    try {
      let enter, current = true, settled = false, calls = 0;
      const entered = new Promise(resolve => { enter = resolve; }), gate = new Promise(resolve => { release = resolve; });
      const read = new M.CachedSourceReplay(f.repository).read(f.request, runtime({ isCurrent: () => current }), () => true,
        async () => { calls++; enter(); await gate; if (fault === "throw") throw new M.SourceFactError("dependency-invalid"); return fault !== "false"; });
      read.then(() => { settled = true; });
      await entered;
      assert.equal(settled, false); assert.equal(calls, 1);
      // This portable fixture is explicitly unsaved memory, not a fake durable lease. The real
      // IndexedDB observer test checks the persistent lease while its callback is paused.
      assert.equal(f.repository.readers.size, 0); assert(f.repository.memory.has("A.md"));
      if (fault === "cancel") current = false;
      release(); const result = await read;
      assert.notEqual(result.outcome, "ready", fault); assert(!("value" in result)); assert.equal(calls, 1);
      assert.equal(f.repository.readers.size, 0); assert.equal(f.repository.decodeBytes, 0);
    } finally { release?.(); f.close(); }
  }
});

/** Observing all chunks is not a terminal family proof or an enduring selected-head proof. */
test("late family commitment failure and head supersession discard observed keys", async () => {
  for (const fault of ["terminal-family", "head-after-work"]) {
    const f = await acquiredFixture();
    try {
      const intact = structuredClone((await f.repository.inspect("C.md")).head);
      let observed = 0;
      if (fault === "terminal-family") {
        f.repository.memory.get("A.md").head.families.metadata.digest = "0".repeat(64);
        const result = await new M.CachedSourceReplay(f.repository).read(f.request, runtime(), () => true,
          family => { if (family === "metadata") observed++; return true; });
        assert(observed > 0); assert.equal(result.reason, "invalid-chunk"); assert(!("value" in result));
      } else {
        const selected = f.repository.readSelected.bind(f.repository);
        f.repository.readSelected = (id, matches, work, current) => selected(id, matches, async reader => {
          const value = await work(reader); observed++;
          const memory = f.repository.memory.get(id);
          f.repository.memory.set(id, { ...memory, head: { ...memory.head, sourceRevision: "superseding-head" } });
          return value;
        }, current);
        const result = await M.summarizeContributorOwner(f.repository, f.request, runtime());
        assert.equal(observed, 1); assert.equal(result.outcome, "stale"); assert(!("value" in result));
      }
      assert.deepEqual((await f.repository.inspect("C.md")).head, intact);
      assert.equal(f.repository.readers.size, 0); assert.equal(f.repository.decodeBytes, 0);
    } finally { f.close(); }
  }
});

/** The fused summary must equal the old four-normalized-plus-three-lexical projection exactly. */
test("one-source summary equals the legacy seven-visit key oracle in four visits with zero Markdown IO", async () => {
  const f = await acquiredFixture();
  try {
    const expected = new Set([M.contributorKey("node", f.request.host.source.id)]);
    const normalized = await new M.CachedSourceReplay(f.repository).read(f.request, runtime(), batch => {
      for (const record of batch.records) for (const key of M.contributorRecordKeys(record)) expected.add(key);
      return true;
    });
    assert.equal(normalized.outcome, "ready");
    for (const family of ["values", "metadata", "resolution"]) for (const record of await f.facts("A.md", family)) {
      for (const key of M.contributorStoredKeys(record)) expected.add(key);
    }
    const heads = JSON.stringify([...f.repository.memory].map(([id, value]) => [id, value.head]));
    f.app.vault.read = f.app.vault.cachedRead = async () => assert.fail("Summary must not read Markdown");
    f.acquisition.parse = async () => assert.fail("Summary must not parse Markdown");
    const counts = countReads(f.repository);
    const result = await M.summarizeContributorOwner(f.repository, f.request, runtime());
    assert.equal(result.outcome, "ready", JSON.stringify(result));
    assert.deepEqual(result.value.summary.keys, [...expected].sort());
    assert.equal(counts.selected, 1); assert.equal(counts.families.length, 4); assert.equal(result.value.work.familyVisits, 4);
    assert(result.value.summary.keys.includes(M.contributorKey("field", "inactive")));
    assert(result.value.summary.keys.includes(M.contributorKey("literal", "B")));
    assert(result.value.summary.keys.includes(M.contributorKey("node", "https://example.com")));
    assert(result.value.summary.keys.includes(M.contributorKey("family", "tag-tree")));
    assert.equal(result.stamp.saved, false); assert.equal(result.value.summary.sequence, null, "Memory selection never becomes a durable stamp");
    assert.equal(JSON.stringify([...f.repository.memory].map(([id, value]) => [id, value.head])), heads);
    assert.deepEqual(f.reads, []); assert.deepEqual(f.parses, []);
  } finally { f.close(); }
});

/** The source identity namespace must stay independent of the semantic node and physical path. */
test("summary preserves distinct opaque SourceId, NodeId, semantic path and physical path", async () => {
  const f = await acquiredFixture();
  try {
    const inspection = await f.repository.inspect("A.md"), families = {};
    for (const family of ["values", "body-urls", "metadata", "resolution"]) {
      const facts = await f.facts("A.md", family);
      families[family] = async emit => { for (const fact of facts) if (!await emit(fact)) return false; return true; };
    }
    const sourceId = "owner:\u0000\ud800", source = { ...f.request.host.source, id: "node:\u0000\ud801", semanticPath: "logical/A" };
    assert.equal((await f.repository.replace({ sourceId, physical: inspection.head.physical, observation: inspection.head.observation,
      expected: { kind: "unavailable" }, families })).outcome, "unsaved");
    const request = { sourceId, host: { ...f.request.host, source,
      structure: emit => emit({ ...M.entityFactForFile(f.file), source, entity: source }) } };
    const result = await M.summarizeContributorOwner(f.repository, request, runtime());
    assert.equal(result.outcome, "ready", JSON.stringify(result));
    assert.equal(result.value.summary.sourceId, sourceId); assert.equal(result.value.summary.source.id, source.id);
    assert.equal(result.value.summary.source.physicalPath, "A.md"); assert.equal(result.value.summary.source.semanticPath, "logical/A");
    assert(result.value.summary.keys.includes(M.contributorKey("node", source.id)));
    assert(!result.value.summary.keys.includes(M.contributorKey("node", sourceId)));
    assert.equal(M.validContributorOwnerSummary(JSON.parse(JSON.stringify(result.value.summary))), true);
  } finally { f.close(); }
});

/** Source-local union closes new keys only for this source; the result is deliberately not a certificate. */
test("A adding B yields the exact old/new union; deletion, recreation and rename require explicit owner states", async () => {
  const f = replayFixture();
  try {
    const file = f.add("A.md", ""); f.add("B.md", ""); f.add("C.md", ""); f.resolutions.set("B", "B.md");
    assert.equal((await f.acquisition.acquire(file, M.parseBodyMetadata(""))).current, true);
    const beforeRequest = await f.acquisition.captureForReplay("A.md", presentation, runtime()); assert.equal(beforeRequest.outcome, "ready");
    const before = await M.summarizeContributorOwner(f.repository, beforeRequest.request, runtime()); assert.equal(before.outcome, "ready");
    const b = M.contributorKey("node", "B.md"), c = M.contributorKey("node", "C.md");
    assert(!before.value.summary.keys.includes(b));
    f.text.set("A.md", "Friends:: [[B]]"); file.stat.mtime++;
    f.app.vault.trigger("modify", file);
    assert.equal((await f.acquisition.acquire(file, M.parseBodyMetadata(f.text.get("A.md")))).current, true);
    const afterRequest = await f.acquisition.captureForReplay("A.md", presentation, runtime()); assert.equal(afterRequest.outcome, "ready");
    const counts = countReads(f.repository);
    const after = await M.summarizeContributorOwner(f.repository, afterRequest.request, runtime()); assert.equal(after.outcome, "ready");
    assert.equal(counts.families.length, 4);
    const previous = { kind: "present", summary: before.value.summary }, next = { kind: "present", summary: after.value.summary };
    const delta = M.prepareContributorOwnerDelta(previous, next);
    assert(delta.addedKeys.includes(b)); assert(delta.affectedKeys.includes(b)); assert(!delta.affectedKeys.includes(c));
    assert.deepEqual(delta.affectedKeys, [...new Set([...previous.summary.keys, ...next.summary.keys])].sort());
    assert(!("outcome" in delta)); assert(!("certificate" in delta));
    const reads = counts.families.length, absent = { kind: "absent", sourceId: "A.md" };
    const deleted = M.prepareContributorOwnerDelta(next, absent), recreated = M.prepareContributorOwnerDelta(absent, next);
    assert.deepEqual(deleted.removedKeys, next.summary.keys); assert.deepEqual(deleted.addedKeys, []);
    assert.deepEqual(recreated.addedKeys, next.summary.keys); assert.deepEqual(recreated.removedKeys, []);
    assert.equal(counts.families.length, reads, "Deletion/delta calculation needs zero family visits");
    assert.throws(() => M.prepareContributorOwnerDelta({ kind: "present", summary: null }, next), /dependency-invalid/);
    assert.throws(() => M.prepareContributorOwnerDelta(undefined, next), /dependency-invalid/);
    assert.throws(() => M.prepareContributorOwnerDelta(previous, { kind: "absent", sourceId: "Renamed.md" }), /dependency-invalid/);
    const unchangedKeysNewHead = { kind: "present", summary: { ...next.summary, sourceRevision: "new-incarnation" } };
    const renewed = M.prepareContributorOwnerDelta(next, unchangedKeysNewHead);
    assert.deepEqual(renewed.addedKeys, []); assert.deepEqual(renewed.removedKeys, []);
    assert.deepEqual(renewed.affectedKeys, next.summary.keys, "A changed head still invalidates its complete old/new scope");
    next.summary.keys.length = 0;
    assert(delta.next.summary.keys.length > 0, "A caller cannot mutate an already prepared plan through its input array");
  } finally { f.close(); }
});

/** Actual encoding and record limits apply together, without normalizing or splitting opaque keys. */
test("owner summary paging preserves long escaped identities and never returns a truncated key", () => {
  const keys = Array.from({ length: 700 }, (_, index) => C.contributorKey("literal", String(index).padStart(4, "0") + "\ud800\ud801\"\\".repeat(30))).sort();
  const pages = [...C.contributorSummaryPages(keys, 4096)]; assert(pages.length > 1);
  assert.deepEqual(pages.flatMap(page => page.keys), keys);
  pages.forEach((page, index) => { assert.equal(page.index, index); assert.equal(Buffer.byteLength(page.data), page.bytes); assert(page.bytes <= 4096); assert(page.keys.length <= 256); });
  assert.notEqual(C.contributorKey("node", "\ud800"), C.contributorKey("node", "\ud801"));
  assert.throws(() => [...C.contributorSummaryPages([C.contributorKey("literal", "x".repeat(5000))], 4096)], /backpressure/);
  assert.throws(() => [...C.contributorSummaryPages(keys, 0)], /backpressure/);
  const small = Array.from({ length: 600 }, (_, index) => C.contributorKey("field", String(index))).sort();
  assert.deepEqual([...C.contributorSummaryPages(small, 256 * 1024)].map(page => page.keys.length), [256, 256, 88]);
});

/** Even canonical host supplements cannot cause an unbounded summary or return a valid prefix. */
test("summary reservation exhaustion is explicit non-ready and releases the source pin", async () => {
  const f = await acquiredFixture();
  try {
    const source = f.request.host.source, fact = M.entityFactForFile(f.file);
    const request = { ...f.request, host: { ...f.request.host, structure: async emit => {
      for (let index = 0; index < 50000; index++) {
        const entity = { ...source, id: "large:" + index + ":" + "x".repeat(200) };
        if (!await emit({ ...fact, entity })) return false;
      }
      return true;
    } } };
    const result = await M.summarizeContributorOwner(f.repository, request, runtime());
    assert.equal(result.reason, "memory-budget"); assert.notEqual(result.outcome, "ready"); assert(!("value" in result));
    assert.equal(f.repository.readers.size, 0); assert.equal(f.repository.decodeBytes, 0);
  } finally { f.close(); }
});

/** A valid outer bucket alone cannot shrink a missing or corrupted per-owner summary into completeness. */
test("authenticated summary lookup rejects missing pages, empty ranges, wrong identities and altered original commitments", async () => {
  const source = ref("node:A", "document", "physical/A.md"), sourceId = "owner:A";
  const owner = { sourceId, source, head: head(sourceId, source), records: Array.from({ length: 600 }, (_, index) => ({ kind: "field-name", normalizedFieldName: "field:" + index })) };
  for (const fault of ["missing", "empty", "duplicate-index", "wrong-head", "wrong-path", "wrong-key", "reordered-keys"]) {
    const f = catalogFixture([owner], [entityFact(source)]), rows = rowsFor([owner], [entityFact(source)]);
    await f.seal(rows);
    const intact = await f.discovery.readOwnerSummary(sourceId); assert.equal(intact.outcome, "ready", JSON.stringify(intact));
    assert.equal(intact.summary.source.id, source.id); assert.equal(intact.summary.keys.length, 601);
    const summaryRows = rows.filter(row => row.kind === "summary"); assert(summaryRows.length > 1);
    const sourceRow = rows.find(row => row.kind === "source");
    if (fault === "missing") rows.splice(rows.indexOf(summaryRows[1]), 1);
    if (fault === "empty") for (const row of summaryRows) rows.splice(rows.indexOf(row), 1);
    if (fault === "duplicate-index") summaryRows[1].index = 0;
    if (fault === "wrong-head") sourceRow.head = { ...sourceRow.head, sourceRevision: "another-head" };
    if (fault === "wrong-path") sourceRow.source = { ...sourceRow.source, physicalPath: "other/A.md" };
    if (fault === "wrong-key") summaryRows[0].keys = [...summaryRows[0].keys.slice(1), C.contributorKey("field", "forged")].sort();
    if (fault === "reordered-keys") summaryRows[0].keys = [...summaryRows[0].keys].reverse();
    await f.seal(rows); // Only the OUTER producer is recommitted; the original owner commitment remains.
    const failed = await f.discovery.readOwnerSummary(sourceId);
    assert.equal(failed.reason, "dependency-invalid", fault); assert(!("summary" in failed));
    const discovered = await f.discovery.discover({ kind: "pair", endpoints: [source, ref("absent")] });
    assert.notEqual(discovered.outcome, "ready", fault); assert(!("sourceIds" in discovered));
  }
});

/** A retained v6 prototype root has no summary proof; it is not upgraded by inventing an empty set. */
test("v1 derivative roots are non-ready without rewriting accepted heads; missing owner is not certified absence", async () => {
  const source = ref("node:A", "document", "physical/A.md"), owner = { sourceId: "owner:A", source, head: head("owner:A", source) };
  const f = catalogFixture([owner], [entityFact(source)]); await f.seal();
  const initial = JSON.stringify([...f.state.heads]);
  const missing = await f.discovery.readOwnerSummary("not-an-owner");
  assert.equal(missing.reason, "missing"); assert(!("summary" in missing));
  const old = JSON.parse(f.state.root.data); old.version = 1;
  f.state.root.data = JSON.stringify(old); f.state.root.digest = sha(f.state.root.data);
  const result = await f.discovery.discover({ kind: "pair", endpoints: [ref("absent:A"), ref("absent:B")] });
  assert.equal(result.reason, "dependency-invalid"); assert.equal(JSON.stringify([...f.state.heads]), initial);
});

/** A source-local disjoint key union cannot silently replace the adapter's global host authority. */
test("an unchanged C head still needs host-transition authority after A adds B, even when A's delta is disjoint", async () => {
  const f = replayFixture();
  try {
    const a = f.add("A.md", ""); f.add("B.md", ""); f.add("C.md", ""); f.resolutions.set("B", "B.md");
    for (const file of f.files.values()) assert.equal((await f.acquisition.acquire(file, M.parseBodyMetadata(""))).current, true);
    const oldA = await f.acquisition.captureForReplay("A.md", presentation, runtime()); assert.equal(oldA.outcome, "ready");
    const oldC = await f.acquisition.captureForReplay("C.md", presentation, runtime()); assert.equal(oldC.outcome, "ready");
    const previous = await M.summarizeContributorOwner(f.repository, oldA.request, runtime()); assert.equal(previous.outcome, "ready");
    assert.equal((await M.summarizeContributorOwner(f.repository, oldC.request, runtime())).outcome, "ready");
    const cHead = structuredClone((await f.repository.inspect("C.md")).head);
    f.text.set("A.md", "Friends:: [[B]]"); a.stat.mtime++; f.app.vault.trigger("modify", a);
    assert.equal((await f.acquisition.acquire(a, M.parseBodyMetadata(f.text.get("A.md")))).current, true);
    const newA = await f.acquisition.captureForReplay("A.md", presentation, runtime()); assert.equal(newA.outcome, "ready");
    const next = await M.summarizeContributorOwner(f.repository, newA.request, runtime()); assert.equal(next.outcome, "ready");
    const delta = M.prepareContributorOwnerDelta({ kind: "present", summary: previous.value.summary }, { kind: "present", summary: next.value.summary });
    assert(delta.affectedKeys.includes(M.contributorKey("node", "B.md")));
    assert(!delta.affectedKeys.includes(M.contributorKey("node", "C.md")));
    const newC = await f.acquisition.captureForReplay("C.md", presentation, runtime()); assert.equal(newC.outcome, "ready");
    assert.notEqual(newC.request.host.observation.revision, cHead.observation.revision);
    const counts = countReads(f.repository), refused = await M.summarizeContributorOwner(f.repository, newC.request, runtime());
    assert.equal(refused.reason, "stale"); assert(!("value" in refused)); assert.equal(counts.families.length, 0);
    assert.deepEqual((await f.repository.inspect("C.md")).head, cHead);
    // This is an executable counterexample to reusing C without a new host-impact proof, not a
    // claim that the required incremental transaction/host protocol has been implemented.
  } finally { f.close(); }
});

/** Codecs reject malformed sets rather than normalizing corruption into a different valid summary. */
test("owner-summary codecs enforce identity, original ordering, self membership and finite page bounds", async () => {
  const source = ref("opaque-node", "document", "physical/A.md");
  const valid = { version: 1, sourceId: "opaque-owner", sourceRevision: "r:1", sequence: 1, source,
    keys: [C.contributorKey("literal", "B"), C.contributorKey("node", source.id)].sort() };
  assert.equal(C.validContributorOwnerSummary(valid), true);
  for (const invalid of [
    { ...valid, version: 2 }, { ...valid, sequence: 0 }, { ...valid, sourceId: "" }, { ...valid, extra: 1 },
    { ...valid, source: { ...source, physicalPath: "" } }, { ...valid, keys: [...valid.keys].reverse() },
    { ...valid, keys: [valid.keys[0], ...valid.keys] }, { ...valid, keys: [C.contributorKey("literal", "B")] },
    { ...valid, keys: [C.contributorKey("source", "A"), ...valid.keys].sort() },
  ]) assert.equal(C.validContributorOwnerSummary(invalid), false, JSON.stringify(invalid));
  const manifest = { pages: 1, records: 1, bytes: 24, digest: "a".repeat(64) };
  assert.equal(C.validContributorSummaryManifest(manifest), true);
  for (const invalid of [{ ...manifest, pages: 0 }, { ...manifest, records: 257 },
    { ...manifest, bytes: C.SOURCE_CHUNK_TARGET_BYTES + 1 }, { ...manifest, digest: "" }]) {
    assert.equal(C.validContributorSummaryManifest(invalid), false);
  }
  assert.throws(() => [...C.contributorSummaryPages(valid.keys, C.SOURCE_CHUNK_TARGET_BYTES + 1)], /backpressure/);
  const oversized = catalogFixture();
  // JSON tuple escaping, not raw UTF-8 replacement, sets the public source-identity query budget.
  assert.equal((await oversized.discovery.readOwnerSummary("\ud800".repeat(50_000))).reason, "unsupported-scope");
  assert.equal(oversized.state.reads, 0);
});
