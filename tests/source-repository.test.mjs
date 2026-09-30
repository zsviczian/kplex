/** Production codecs/repository under deterministic storage-unavailable runtime. Not a browser-IDB substitute. */
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import test from "node:test";
import { loadPortableModules } from "./support/portableTypeScript.mjs";
const { exports: source } = loadPortableModules(["src/index/SourceFacts.ts", "src/index/SourceRepository.ts", "src/core/parser/metadata.ts"]);
const { NeutralSourceRepository, SourceFrameValidator, SourceBodyDecoder, sourceValueSteps, parseBodyMetadata,
  sanitizeSourceRepositoryDiagnostics, SOURCE_FAMILIES } = source;

/** Drive the real producer with storage backpressure and genuine canonical parser inputs. */
function values(metadata) { return async emit => { for (const record of sourceValueSteps(metadata)) if (!await emit(record)) return false; return true; }; }
/** Keep fixture parser data canonical; only storage availability is controlled here. */
function metadata(text, frontmatter = {}) { return { ...parseBodyMetadata(text), frontmatter, aliases: [], tags: [] }; }
/** Exercise production scheduling/masks with an explicitly unavailable storage port, not fake IDB. */
function fixture() {
  let time = 0, yields = 0, opens = 0;
  const timers = new Map();
  const runtime = { now: () => time, yield: async () => { yields++; }, digest: async text => createHash("sha256").update(text).digest("hex"),
    uniqueId: randomUUID, schedule: (callback, delay) => { const id = timers.size + 1; timers.set(id, { callback, delay }); return id; }, cancel: id => timers.delete(id) };
  const storage = { open: async () => { opens++; return null; }, failed() { assert.fail("No transaction exists when storage is unavailable"); } };
  const repository = new NeutralSourceRepository(storage, runtime);
  const input = async (id = "source", meta = metadata("Field:: [[Alpha]]\nStatus:: dormant")) => ({ sourceId: id,
    physical: { identity: id + "-identity", path: id + ".md", mtime: 1, size: 42 },
    observation: { epoch: "session", revision: 1, environment: await runtime.digest("host") }, expected: { kind: "missing" },
    families: { values: values(meta), "body-urls": async emit => { for (const url of meta.urls) if (!await emit({ kind: "body-url", ...url })) return false; return true; },
      metadata: async emit => emit({ kind: "field-name", fieldName: "Field", normalizedFieldName: "field", surface: "inline" }), resolution: async () => true } });
  return { repository, runtime, storage, timers, input, tick: ms => { time += ms; }, yields: () => yields, opens: () => opens };
}

/** Validate a complete family using the same strict incremental validator as disk reads. */
function validate(records, family = "values") { const validator = new SourceFrameValidator(family); for (const fact of records) validator.accept(fact); validator.finish(); }

test("neutral value codec preserves dormant lexical targets, single provenance, and immutable parser inputs", () => {
  const input = metadata("Status:: still plain\nLinks:: [[Alias]] [[Target#section]]\nhttps://example.test/path", {
    Dormant: ["[[Alias]]", "[[Target]]", "[[Alias]]"], Private: { notAReference: "secret text" }, position: { value: "[[Must not escape]]" },
  });
  const records = [...sourceValueSteps(input)].filter(Boolean); validate(records);
  const frontmatter = records.filter(r => r.kind === "reference-value" && r.surface === "frontmatter");
  assert.equal(frontmatter.length, 1);
  const candidates = records.filter(r => r.kind === "reference-candidate" && r.valueId === frontmatter[0].valueId);
  assert.deepEqual(candidates.map(r => r.rawTarget), ["Alias", "Target"]);
  assert.equal(candidates.at(-1).final, true);
  assert(!JSON.stringify(records).includes("secret text")); assert(!JSON.stringify(records).includes("Must not escape"));
  const decoder = new SourceBodyDecoder();
  records.forEach(r => decoder.accept(r)); input.urls.forEach(url => decoder.accept({ kind: "body-url", ...url }));
  assert.deepEqual(JSON.parse(JSON.stringify(decoder.finish())), JSON.parse(JSON.stringify(parseBodyMetadata("Status:: still plain\nLinks:: [[Alias]] [[Target#section]]\nhttps://example.test/path"))));
});

test("strict codecs reject property mirrors, missing terminals, post-final records, mismatched IDs and sparse-index bombs", () => {
  const records = [...sourceValueSteps(metadata("Field:: [[Alpha]]"))].filter(Boolean);
  assert.throws(() => validate(records.slice(0, -1)), /invalid-frame/);
  assert.throws(() => validate([...records, records.at(-1)]), /invalid-frame/);
  assert.throws(() => validate([{ ...records[0], frontmatter: { private: "payload" } }, ...records.slice(1)]), /invalid-frame/);
  assert.throws(() => validate([{ ...records[0], inlineMapIndex: 2 ** 32 - 1 }, ...records.slice(1)]), /invalid-frame/);
  assert.throws(() => validate([records[0], { ...records[1], valueId: "other" }, ...records.slice(2)]), /invalid-frame/);
  assert.equal(source.sourceHeadReason(undefined), "missing");
  assert.equal(source.validSourcePosting({ sourceId: "s", revision: "r", family: "values", index: 0, kind: "literal", key: "A", rawValue: "private" }), false);
  assert.equal(source.validSourcePhysical({ identity: "i", path: "a.md", mtime: 1 }), true);
  assert.equal(source.validSourcePhysical({ identity: "i", path: "a.md", mtime: 1, size: undefined }), false);
});

test("chunked oversized provenance remains one framed value, while exceptional identities have an explicit decode cap", async () => {
  const state = fixture();
  try {
    const large = "[[Alpha]] " + "escaped \\\" \u{1f642} ".repeat(45000);
    const input = await state.input("large", metadata("", { Dormant: large }));
    const result = await state.repository.replace(input);
    assert.equal(result.outcome, "unsaved");
    const inspection = await state.repository.inspect("large");
    assert.equal(inspection.reason, "ready");
    assert(inspection.head.families.values.chunks > 1);
    const pieces = []; let count = 0;
    assert.equal(await state.repository.visit("large", "values", records => {
      assert(records.length <= 256);
      for (const record of records) { if (record.kind === "reference-payload") pieces.push(record.text); if (record.kind === "reference-candidate") count++; }
      return true;
    }), "ready");
    assert.equal(pieces.join(""), large); assert.equal(count, 1);
    assert(state.repository.getDiagnostics().peakDecodeBytes <= source.SOURCE_DECODE_BUDGET_BYTES);
    const invalid = await state.input("oversized");
    invalid.families.metadata = async emit => emit({ kind: "alias", value: "x".repeat(source.SOURCE_DECODE_BUDGET_BYTES) });
    assert.equal((await state.repository.replace(invalid)).reason, "decode-budget");
    assert.equal((await state.repository.inspect("oversized")).head, null);
  } finally { state.repository.close(); }
});

test("storage unavailable keeps complete neutral facts, no false durable progress, body reuse and matching posting boundary", async () => {
  const state = fixture();
  try {
    const input = await state.input();
    const result = await state.repository.replace(input);
    assert.equal(result.outcome, "unsaved"); assert.equal(result.live, true); assert.equal(result.sequence, null);
    const inspection = await state.repository.inspect("source");
    assert.equal(inspection.reason, "ready"); assert.equal(inspection.saved, false); assert.equal(inspection.sequence, null);
    assert(SOURCE_FAMILIES.every(family => inspection.families[family] === "ready"));
    const body = await state.repository.readBody("source", physical => physical.mtime === 1);
    assert.deepEqual([...body.inlineFields.field], ["[[Alpha]]"]);
    assert.equal(await state.repository.readBody("source", physical => physical.mtime === 2), null);
    const ids = [];
    assert.equal(await state.repository.querySources("literal", "Alpha", batch => { ids.push(...batch); return true; }), false,
      "An unavailable catalog cannot prove a complete dependency result");
    assert.deepEqual(ids, ["source"]);
    assert.equal(await state.repository.flush(), false);
    assert.equal(state.repository.getDiagnostics().activated, 0);
    assert.equal(state.repository.getDiagnostics().unsaved, 1);
    assert(state.timers.size <= 1);
  } finally { state.repository.close(); }
});

test("latest-writer slots, cancellation, close and independent-source backpressure are bounded", async () => {
  const state = fixture();
  try {
    let release; const latch = new Promise(resolve => { release = resolve; });
    const first = await state.input("race"); first.families.values = async () => { await latch; return true; };
    const old = state.repository.replace(first);
    await Promise.resolve();
    const middle = state.repository.replace(await state.input("race", metadata("Field:: [[Middle]]")));
    const latest = state.repository.replace(await state.input("race", metadata("Field:: [[Latest]]")));
    assert.equal((await middle).outcome, "superseded");
    release(); assert.equal((await old).outcome, "cancelled"); assert.equal((await latest).outcome, "unsaved");
    assert.equal((await state.repository.readBody("race", () => true)).inlineFields.field[0], "[[Latest]]");
    let unblock; const held = new Promise(resolve => { unblock = resolve; });
    const a = await state.input("a"), b = await state.input("b");
    a.families.values = b.families.values = async () => { await held; return true; };
    const activeA = state.repository.replace(a), activeB = state.repository.replace(b);
    assert.equal((await state.repository.replace(await state.input("c"))).reason, "backpressure");
    state.repository.close(); unblock();
    assert.equal((await activeA).outcome, "cancelled"); assert.equal((await activeB).outcome, "cancelled");
    assert.equal((await state.repository.replace(await state.input("closed"))).outcome, "cancelled");
    assert.equal(await state.repository.flush(), false);
  } finally { state.repository.close(); }
});

test("elapsed flush and a durable stop include active producers; empty acquisition is not a miss", async () => {
  const state = fixture();
  try {
    const input = await state.input("elapsed", metadata(""));
    input.families.metadata = async emit => {
      if (!await emit({ kind: "alias", value: "a" })) return false;
      state.tick(1001);
      if (!await emit(null)) return false;
      return emit({ kind: "alias", value: "b" });
    };
    assert.equal((await state.repository.replace(input)).outcome, "unsaved");
    assert.equal((await state.repository.inspect("elapsed")).head.families.metadata.chunks, 2);
    const empty = await state.input("empty", metadata("")); empty.families.metadata = async () => true;
    await state.repository.replace(empty);
    const view = await state.repository.inspect("empty");
    assert.equal(view.reason, "ready"); assert.equal(view.head.state, "complete");
    for (const family of SOURCE_FAMILIES) { assert.equal(view.head.families[family].records, 0); assert.equal(view.head.families[family].chunks, 1); }
    let release; const blocked = new Promise(resolve => { release = resolve; });
    const pending = await state.input("pending"); pending.families.values = async () => { await blocked; return true; };
    const write = state.repository.replace(pending); let stopped = false;
    const stop = state.repository.flush().then(result => { stopped = true; return result; });
    await Promise.resolve(); assert.equal(stopped, false);
    release(); await write; assert.equal(await stop, false);
    assert(state.yields() > 0);
  } finally { state.repository.close(); }
});

test("diagnostics allowlist strips paths, settings, property values, raw exceptions and arbitrary reasons", () => {
  const result = sanitizeSourceRepositoryDiagnostics({ storage: "available", activated: 3, unsaved: 2, path: "secret.md", body: "content",
    lastReason: "secret.md: private exception", familyFailures: { values: 4, "secret field": 500 }, sequenceMax: NaN,
    factFormatVersion: "SECRET", settings: { ontology: "private" } });
  assert.equal(result.activated, 3); assert.equal(result.unsaved, 2); assert.equal(result.familyFailures.values, 4);
  assert(!JSON.stringify(result).match(/secret|SECRET|private|ontology|content/));
  assert.deepEqual(Object.keys(result.familyFailures).sort(), [...SOURCE_FAMILIES].sort());
});

test("storage-unavailable tombstones immediately mask postings, retain only rename body inputs, and lose to recreation", async () => {
  const state = fixture();
  try {
    await state.repository.replace(await state.input("move"));
    assert.equal((await state.repository.tombstone("move", () => true, true)).outcome, "unsaved");
    assert.equal((await state.repository.inspect("move")).reason, "tombstone");
    assert.equal(await state.repository.readBody("move", () => true), null);
    assert(await state.repository.readBody("move", () => true, () => true, true));
    const owners = [];
    await state.repository.querySources("literal", "Alpha", ids => { owners.push(...ids); return true; });
    assert.deepEqual(owners, []);
    assert.equal(await state.repository.flush(), false);
    await state.repository.replace(await state.input("move", metadata("Changed:: [[Beta]]")));
    assert.equal((await state.repository.inspect("move")).reason, "ready");
    const revived = [];
    await state.repository.querySources("literal", "Beta", ids => { revived.push(...ids); return true; });
    assert.deepEqual(revived, ["move"]);
    await state.repository.tombstone("move");
    assert.equal(await state.repository.readBody("move", () => true, () => true, true), null);
    assert.equal(state.repository.getDiagnostics().activated, 0);
    assert(state.timers.size <= 1);
  } finally { state.repository.close(); }
});


test("deletion pin authority is identity-fenced; includeTombstone never bypasses an evicted unsaved mask", async () => {
  const state = fixture();
  try {
    await state.repository.replace(await state.input("evicted"));
    state.repository.memory.delete("evicted"); // Model only payload eviction, never remove the mask.
    let current = true;
    assert.equal((await state.repository.tombstone("evicted", () => current, true)).outcome, "unsaved");
    const pending = state.repository.pendingDeletes.get("evicted");
    assert.equal(pending.retain, false, "An older disk body must not become a rename input after eviction");
    const before = state.opens();
    assert.equal((await state.repository.pin("evicted", true)).reason, "unsaved");
    assert.equal((await state.repository.pin("evicted", true, { ...pending })).reason, "cancelled");
    assert.equal(state.opens(), before, "Ordinary/stale capabilities do not reach the disk port");
    assert.equal((await state.repository.pin("evicted", true, pending)).reason, "storage-unavailable");
    assert.equal(state.opens(), before + 1, "Only the current deletion may select its masked CAS input");
    assert(state.repository.unsaved.has("evicted"));
    current = false;
    assert.equal((await state.repository.pin("evicted", true, pending)).reason, "cancelled");
    assert.equal(state.opens(), before + 1);
  } finally { state.repository.close(); }
});

test("cancelling a deletion stops retrying but cannot certify durability or reveal an older disk head", async () => {
  const state = fixture();
  try {
    let current = true;
    assert.equal((await state.repository.tombstone("cancelled", () => current)).outcome, "unsaved");
    current = false;
    assert.equal(await state.repository.flush(), false, "Cancellation is not an authoritative completion fence");
    assert.equal(state.repository.pendingDeletes.has("cancelled"), false, "No retry of an invalid absence observation");
    assert(state.repository.unsaved.has("cancelled"), "The dirty source must remain masked");
    assert.equal((await state.repository.inspect("cancelled")).reason, "unsaved");
    assert.equal(await state.repository.readBody("cancelled", () => true, () => true, true), null);
    assert.equal(state.timers.size, 0, "A cancelled predicate must not create an endless retry timer");
    await state.repository.replace(await state.input("cancelled"));
    assert.equal((await state.repository.inspect("cancelled")).reason, "ready", "New authoritative facts can replace the mask");
    assert.equal(await state.repository.flush(), false, "Memory-only replacement still is not durable");
  } finally { state.repository.close(); }
});

test("coalesced delete requests cannot restore retention that an earlier final delete removed", async () => {
  const state = fixture();
  try {
    await state.repository.replace(await state.input("retired"));
    await state.repository.tombstone("retired", () => true, false);
    await state.repository.tombstone("retired", () => true, true);
    assert.equal(state.repository.pendingDeletes.get("retired").retain, false);
    assert.equal(await state.repository.readBody("retired", () => true, () => true, true), null);
    assert.equal(await state.repository.flush(), false);
  } finally { state.repository.close(); }
});


test("a retry snapshot cannot discard a newer coalesced deletion or its unsaved mask", async () => {
  const state = fixture();
  let release;
  try {
    let oldCurrent = true;
    await state.repository.tombstone("first");
    await state.repository.tombstone("second", () => oldCurrent);
    let signal, pause = true;
    const paused = new Promise(resolve => { signal = resolve; });
    const gate = new Promise(resolve => { release = resolve; });
    const open = state.storage.open;
    state.storage.open = async () => {
      if (pause) { pause = false; signal(); await gate; }
      return open();
    };
    const flushing = state.repository.flush();
    await paused;
    oldCurrent = false;
    assert.equal((await state.repository.tombstone("second", () => true)).reason, "backpressure");
    const latest = state.repository.pendingDeletes.get("second");
    release();
    assert.equal(await flushing, false);
    assert.equal(state.repository.pendingDeletes.get("second"), latest, "The stale snapshot may not consume the current capability");
    assert(state.repository.unsaved.has("second"), "A cancelled older predicate is not authority to clear the new mask");
  } finally { release?.(); state.repository.close(); }
});
