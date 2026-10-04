/**
 * Contributor retirement control-flow tests with explicit request/event ports. These ports test
 * failure acknowledgement and retry ownership, not IndexedDB atomicity, browser locks or quota.
 * Actual transactions and two-connection visibility remain in the required Chromium suites.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { loadPortableModules } from "./support/portableTypeScript.mjs";
const { exports: M } = loadPortableModules(["src/index/SourceContributorLease.ts", "src/index/SourceRepository.ts"]);
const lease = { key: "source-impact-lease:owned", impactSlot: 0 };

/** Explicitly controlled event ports; no timers or transactions complete without a test action. */
function ports(row = lease) {
  const timers = new Map(), state = { row, deleted: [], closed: 0, transactions: 0, opens: [] };
  let sequence = 0;
  const runtime = {
    schedule(callback) { const id = ++sequence; timers.set(id, callback); return id; },
    cancel(id) { timers.delete(id); },
    uniqueId: () => "test-id", now: () => 0, yield: async () => {}, digest: async () => "digest",
  };
  const request = {};
  const transaction = {
    objectStore(name) {
      assert.equal(name, "meta");
      return { get(key) { assert.equal(key, lease.key); return request; }, delete(key) { state.deleted.push(key); } };
    },
    abort() { this.onabort?.(); },
  };
  const db = {
    transaction(name, mode) { state.transactions++; assert.equal(name, "meta"); assert.equal(mode, "readwrite"); return transaction; },
    close() { state.closed++; },
  };
  const opening = { result: db, transaction: { abort() { state.upgradeAborted = true; } } };
  const factory = { open(name, version) { state.opens.push([name, version]); return opening; } };
  return { runtime, timers, transaction, db, request, factory, opening, state,
    read() { request.result = state.row; request.onsuccess(); },
    commit() { transaction.oncomplete(); },
  };
}

/** Request success cannot be mistaken for committed lease retirement. */
test("lease deletion/absence is acknowledged only by transaction completion", async () => {
  for (const row of [lease, undefined]) {
    const f = ports(row); f.state.row = row;
    const pending = M.releaseContributorRootLease(f.db, lease, f.runtime);
    let settled = false; void pending.then(() => { settled = true; });
    f.read(); await Promise.resolve(); assert.equal(settled, false);
    assert.deepEqual(f.state.deleted, row ? [lease.key] : []);
    f.commit(); assert.equal(await pending, true); assert.equal(f.timers.size, 0);
  }
});

/** An exact-row mismatch must not retire a potentially different slot/reader envelope. */
test("changed or malformed persisted lease envelopes remain protected", async () => {
  for (const row of [{ ...lease, impactSlot: 1 }, { ...lease, extra: true }, null, "not-a-lease"]) {
    const f = ports(row), pending = M.releaseContributorRootLease(f.db, lease, f.runtime);
    f.read(); f.commit(); assert.equal(await pending, false); assert.deepEqual(f.state.deleted, []);
  }
});

/** The queued deletion does not survive as a false acknowledgement after an abort/error/timeout. */
test("lease abort, request error, timeout and a closed handle keep retry ownership", async () => {
  for (const fault of ["abort", "error", "timeout", "closed"]) {
    const f = ports();
    if (fault === "closed") f.db.transaction = () => { throw new Error("Connection closed"); };
    const pending = M.releaseContributorRootLease(f.db, lease, f.runtime);
    if (fault !== "closed") {
      f.read();
      if (fault === "abort") f.transaction.abort();
      else if (fault === "error") f.request.onerror();
      else [...f.timers.values()][0]();
    }
    assert.equal(await pending, false, fault); assert.equal(f.timers.size, 0);
  }
});

/** Fresh cleanup bypasses only handle availability, not exact-row or transaction acknowledgement. */
test("fresh existing-database cleanup commits before closing its temporary connection", async () => {
  const f = ports(), pending = M.releaseContributorRootLeaseFresh(f.factory, "existing-db", 7, lease, f.runtime);
  assert.deepEqual(f.state.opens, [["existing-db", 7]]);
  f.opening.onsuccess(); f.read(); assert.equal(f.state.closed, 0); f.commit();
  assert.equal(await pending, true); assert.equal(f.state.closed, 1); assert.equal(f.timers.size, 0);
});

/** Even a late opening cannot create/migrate a database or leak its eventual handle. */
test("fresh cleanup rejects creation/upgrade, blocked/error opens, and closes late success", async () => {
  for (const fault of ["upgrade", "blocked", "error", "timeout"]) {
    const f = ports(), pending = M.releaseContributorRootLeaseFresh(f.factory, "existing-db", 7, lease, f.runtime);
    if (fault === "upgrade") f.opening.onupgradeneeded();
    else if (fault === "blocked") f.opening.onblocked();
    else if (fault === "error") f.opening.onerror();
    else [...f.timers.values()][0]();
    assert.equal(await pending, false, fault); assert.equal(f.timers.size, 0);
    if (fault === "upgrade") assert.equal(f.state.upgradeAborted, true);
    f.opening.onsuccess(); assert.equal(f.state.closed, 1); assert.equal(f.state.transactions, 0);
  }
});

/** Explicit retired-pin injection isolates repository queue ownership, not durable IDB state. */
function retirementFixture() {
  const f = ports(), state = { recover: false, recovered: [] };
  const db = { transaction() { throw new Error("Already closed"); } };
  const repository = new M.NeutralSourceRepository({ open: async () => db, failed() {},
    releaseContributorLease: async row => { state.recovered.push({ ...row }); return state.recover; },
  }, f.runtime);
  const retired = { db, lease, active: false };
  repository.impactReaders.set(lease.key, retired);
  return { ...f, state, db, repository, retired };
}

/** Failed cleanup remains owned, idempotently retries, and does not touch an active neighbour. */
test("retired tickets survive cleanup failure and explicit retry reclaims only the ended reader", async () => {
  const f = retirementFixture(), activeLease = { key: "source-impact-lease:active", impactSlot: 1 };
  f.repository.impactReaders.set(activeLease.key, { db: f.db, lease: activeLease, active: true });
  assert.equal(await f.repository.retryRetiredContributorLeases(), false);
  assert.equal(f.repository.impactReaders.size, 2); assert.equal(f.retired.release, undefined);
  assert.deepEqual(f.state.recovered, [lease]);
  f.state.recover = true;
  assert.equal(await f.repository.retryRetiredContributorLeases(), true);
  assert.equal(f.repository.impactReaders.size, 1); assert(f.repository.impactReaders.get(activeLease.key).active);
  assert.deepEqual(f.state.recovered, [lease, lease]);
  await f.repository.releaseImpactLease(lease.key); assert.equal(f.state.recovered.length, 2);
});

/** Source flush is a deterministic later reclamation point without an idle/background timer. */
test("flush retries a retained lease after storage recovery without changing source durability", async () => {
  const f = retirementFixture(); f.repository.retryMemory = async () => {};
  assert.equal(await f.repository.flush(), true); assert.equal(f.repository.impactReaders.size, 1);
  f.state.recover = true;
  assert.equal(await f.repository.flush(), true); assert.equal(f.repository.impactReaders.size, 0);
});

/** Two failed retirements cannot admit a third reader and grow an unbounded recovery queue. */
test("unreleased retired pins share the reader admission bound", async () => {
  const f = retirementFixture();
  f.repository.impactReaders.set("source-impact-lease:second", { db: f.db,
    lease: { key: "source-impact-lease:second", impactSlot: 1 }, active: false });
  await assert.rejects(f.repository.withContributorJournal({ kind: "host", id: "catalog" }, () => true,
    async () => assert.fail("No reader may be admitted")), error => error.reason === "backpressure");
  assert.equal(f.repository.impactReaders.size, 2); assert.equal(f.repository.impactReadReservations, 0);
});

/** Concurrent release/retry callers must share one pending cleanup operation. */
test("concurrent cleanup requests share a single release promise", async () => {
  const f = retirementFixture(); let finish; let calls = 0;
  f.repository.storage.releaseContributorLease = () => { calls++; return new Promise(resolve => { finish = resolve; }); };
  const a = f.repository.releaseImpactLease(lease.key), b = f.repository.releaseImpactLease(lease.key);
  assert.equal(a, b); await Promise.resolve(); assert.equal(calls, 1);
  finish(true); await Promise.all([a, b]); assert.equal(f.repository.impactReaders.size, 0);
});
