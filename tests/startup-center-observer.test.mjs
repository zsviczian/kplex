/**
 * Node contract checks for the test-only startup observer. Finite prototype doubles prove passive
 * wrapper/retention/teardown behavior, not actual Obsidian startup, semantic or timing acceptance.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { installStartupCenterObserver } from "../scripts/testing/obsidian/startupCenterObserver.mjs";

/** Build isolated finite constructors and a controlled clock; no host or personal vault is accessed. */
function fixture() {
  let now = 0;
  class GraphIndex {
    /** Provide ordinary mutable own fields matching the observer's fixed scalar inventory. */
    constructor() {
      this.publicationRevision = 1;
      this.semanticPolicyRevision = 2;
      this.state = { pages: new Map([["private-center.md", { neighbours: new Map([["private-target.md", {}]]) }]]) };
      this.workScheduler = { active: [0, 1, 0, 0, 1], waiters: new Set([{}]) };
      this.plugin = { index: this, initialIndexComplete: false, indexDirtyRevision: 3 };
      this.sourceAcquisition = { localDependenciesReady: false, localDependencyAuthorityReady: true };
    }
    /** Return the exact supplied value for wrapper identity assertions. */
    primePhysicalSearchCatalog(value) { return value; }
    /** Throw the exact supplied value without diagnostic error serialization. */
    recheckVisibleCenter(path, error) { throw error; }
    /** Return an already-built neighborhood without lazy graph acquisition. */
    getNeighborhood() { return { center: {}, parents: [{}, {}], children: [{}], leftFriends: [], rightFriends: [], siblings: [] }; }
    /** Reject accidental diagnostic graph reads; only the ordinary neighborhood return may be counted. */
    get() { throw new Error("Observer must not acquire a page"); }
  }
  class GraphBuilder {}
  class HostMetadataPreview {}
  const ownerWindow = { performance: { /** Supply a controlled monotonic clock. */ now() { return now; } } };
  return { GraphIndex, GraphBuilder, HostMetadataPreview, ownerWindow,
    /** Advance only the diagnostic clock, without timer scheduling or host work. */
    setNow(value) { now = value; } };
}

/** Verify synchronous/promise/throw identity and privacy using only actual ordinary call results. */
test("observer preserves results, promises, exceptions and private error/path boundaries", async () => {
  const f = fixture(), original = Object.getOwnPropertyDescriptor(f.GraphIndex.prototype, "primePhysicalSearchCatalog");
  const observer = installStartupCenterObserver(f, f.ownerWindow), index = new f.GraphIndex();
  const value = { confidential: "private-value" };
  assert.equal(index.primePhysicalSearchCatalog(value), value);
  const promise = Promise.resolve(value);
  assert.equal(index.primePhysicalSearchCatalog(promise), promise);
  await promise;
  const error = new Error("private-error"), rejection = Promise.reject(error);
  assert.equal(index.primePhysicalSearchCatalog(rejection), rejection);
  await assert.rejects(rejection, /** Compare exact error identity, not a replacement or serialized copy. */ actual => actual === error);
  assert.throws(/** Trigger the original synchronous exception under observation. */ () => index.recheckVisibleCenter("private-center.md", error),
    /** The observer must rethrow the exact original object. */ actual => actual === error);
  index.getNeighborhood("private-center.md");
  const snapshot = observer.snapshot(), last = snapshot.events.at(-1);
  assert.deepEqual(last.result.roles, { parents: 2, children: 1, leftFriends: 0, rightFriends: 0, siblings: 0 });
  assert.deepEqual(last.state.center, { present: true, neighbors: 1 });
  assert.deepEqual(last.state.scheduler, { active: [0, 1, 0, 0, 1], waiting: 1 });
  assert(snapshot.firstFailure);
  assert(snapshot.failureSegment.some(/** Confirm the rejected original operation was retained. */ event => event.phase === "reject"));
  assert(!JSON.stringify(snapshot).includes("private-"));
  assert.equal(snapshot.observationErrors, 0);
  observer.dispose();
  assert.deepEqual(Object.getOwnPropertyDescriptor(f.GraphIndex.prototype, "primePhysicalSearchCatalog"), original);
  assert.equal(f.ownerWindow.kplexStartupCenterObserver, undefined);
});

/** Non-native thenables/getters must not gain diagnostic side effects or be assimilated. */
test("observer never invokes arbitrary then getters or lazy state accessors", () => {
  const f = fixture(), observer = installStartupCenterObserver(f, f.ownerWindow), index = new f.GraphIndex();
  let calls = 0;
  const result = { /** Any then-property access would change original synchronous behavior. */ get then() { calls++; throw new Error("No assimilation"); } };
  Object.defineProperty(index, "state", { /** Any lazy graph access would invalidate passive observation. */ get() { calls++; throw new Error("No acquisition"); } });
  assert.equal(index.primePhysicalSearchCatalog(result), result);
  assert.equal(calls, 0);
  assert.equal(observer.snapshot().events.length, 2);
  observer.dispose();
});

/** Stress finite event/path bounds and ensure the first failure survives later successful churn. */
test("event bytes/counts and private center mapping remain bounded with omission receipts", () => {
  const f = fixture(), observer = installStartupCenterObserver(f, f.ownerWindow), index = new f.GraphIndex();
  assert.throws(/** Create the first failure before overflowing the rolling trace. */ () => index.recheckVisibleCenter("private-failure.md", new Error("private")));
  for (let i = 0; i < 3000; i++) index.getNeighborhood(`private-${i}.md`);
  const report = observer.snapshot();
  assert(report.events.length <= report.limits.events);
  assert(report.eventBytes <= report.limits.bytes);
  assert(report.omitted > 0);
  assert(report.omittedCenters > 0);
  assert(report.failureSegment.length <= report.limits.failureBefore + report.limits.failureAfter + 1);
  assert(report.failureSegment.some(/** The first rejection remains separately retained. */ event => event.task === report.firstFailure.task));
  assert(!JSON.stringify(report).includes("private-"));
  report.events[0].phase = "mutated";
  assert.notEqual(observer.snapshot().events[0].phase, "mutated");
  observer.dispose();
});

/** Expiry is finite and disposal prevents late promise continuations from recording or restoring peers. */
test("expiry, independent replacement and in-flight teardown preserve ownership", async () => {
  const f = fixture(), observer = installStartupCenterObserver(f, f.ownerWindow), index = new f.GraphIndex();
  let resolve;
  const held = new Promise(/** Keep a single original promise pending across observer disposal. */ done => { resolve = done; });
  index.primePhysicalSearchCatalog(held);
  f.setNow(180001);
  index.getNeighborhood("private-expired.md");
  assert.equal(observer.snapshot().expired, true);
  const count = observer.snapshot().events.length;
  const replacement = /** Model an independent owner replacing one observed prototype method. */ function () { return "replacement"; };
  f.GraphIndex.prototype.getNeighborhood = replacement;
  observer.dispose();
  observer.dispose();
  resolve(true);
  await held;
  assert.equal(observer.snapshot().events.length, count);
  assert.equal(f.GraphIndex.prototype.getNeighborhood, replacement);
  assert.equal(index.getNeighborhood(), "replacement");
});

/** A serialized installer must carry no module lexical dependencies into the esbuild footer. */
test("installer is self-contained and enumerates unavailable prototype methods", () => {
  const f = fixture();
  const fromFooter = new Function(`return (${installStartupCenterObserver.toString()})`)();
  const observer = fromFooter(f, f.ownerWindow), report = observer.snapshot();
  assert(report.installed.includes("GraphIndex.getNeighborhood"));
  assert(report.missing.includes("GraphBuilder.buildStructuralBaseline"));
  assert.equal(report.installed.length + report.missing.length, 16);
  observer.dispose();
});

/** Hash only ordinary returned neighborhoods, retaining no callback inputs or unvalidated outputs. */
test("optional fingerprint capability sees actual neighborhoods only and retains validated digests", () => {
  const f = fixture(), calls = [], digest = "a".repeat(64);
  const observer = installStartupCenterObserver(f, f.ownerWindow,
    /** Record exact actual result identity and supply one finite valid lowercase digest. */
    neighborhood => { calls.push(neighborhood); return digest; });
  const index = new f.GraphIndex();
  index.primePhysicalSearchCatalog({ private: "private-non-neighborhood" });
  assert.equal(calls.length, 0);
  const returned = index.getNeighborhood("private-center.md");
  assert.equal(calls.length, 1);
  assert.equal(calls[0], returned);
  assert.equal(observer.snapshot().events.at(-1).result.fingerprint, digest);
  assert(!JSON.stringify(observer.snapshot()).includes("private-"));
  observer.dispose();
});

/** Invalid outputs and capability exceptions must leave caller return identity and trace privacy intact. */
test("fingerprint failures are scalar omissions without return substitution or raw output retention", () => {
  for (const output of ["private-output", "A".repeat(64), "b".repeat(65), { private: "private-object" }]) {
    const f = fixture(), observer = installStartupCenterObserver(f, f.ownerWindow,
      /** Supply deliberately invalid capability output, which must never enter the trace. */
      () => output);
    const index = new f.GraphIndex(), result = index.getNeighborhood("private-center.md");
    assert.equal(result.children.length, 1);
    assert.equal(observer.snapshot().events.at(-1).result.fingerprint, undefined);
    assert.equal(observer.snapshot().observationErrors, 1);
    assert(!JSON.stringify(observer.snapshot()).includes("private-"));
    observer.dispose();
  }
  const f = fixture(), observer = installStartupCenterObserver(f, f.ownerWindow,
    /** A test-owned hash failure cannot reject or replace an ordinary synchronous neighborhood. */
    () => { throw new Error("private-hash-error"); });
  const result = new f.GraphIndex().getNeighborhood("private-center.md");
  assert.equal(result.parents.length, 2);
  assert.equal(observer.snapshot().observationErrors, 1);
  assert(!JSON.stringify(observer.snapshot()).includes("private-"));
  observer.dispose();
});

/** Native link attribution counts only bounded own data without exposing paths or invoking getters. */
test("native link facts are bounded, private and accessor-free", () => {
  const f = fixture(), observer = installStartupCenterObserver(f, f.ownerWindow), index = new f.GraphIndex();
  index.getNeighborhood("private-center.md");
  assert.equal(observer.snapshot().events.at(-1).state.hostResolvedTargets, null);
  assert.equal(observer.snapshot().events.at(-1).state.hostUnresolvedTargets, null);
  let getterCalls = 0;
  const targets = { "private-a.md": 2, "private-zero.md": 0, "private-negative.md": -1 };
  Object.defineProperty(targets, "private-getter.md", {
    enumerable: true,
    /** A native dictionary accessor must never run during passive attribution. */
    get() { getterCalls++; throw new Error("private-getter"); },
  });
  index.app = { metadataCache: { resolvedLinks: { "private-center.md": targets }, unresolvedLinks: {} } };
  Object.defineProperty(index.app.metadataCache.unresolvedLinks, "private-center.md", {
    /** Center dictionary lookup must also avoid invoking host accessors. */
    get() { getterCalls++; throw new Error("private-center-getter"); },
  });
  index.getNeighborhood("private-center.md");
  let state = observer.snapshot().events.at(-1).state;
  assert.deepEqual(state.hostResolvedTargets, { positiveTargets: 1, truncated: false });
  assert.equal(state.hostUnresolvedTargets, null);
  const dense = {};
  for (let i = 0; i < 1000; i++) dense[`private-${i}.md`] = 1;
  index.app.metadataCache.resolvedLinks["private-center.md"] = dense;
  index.getNeighborhood("private-center.md");
  state = observer.snapshot().events.at(-1).state;
  assert.deepEqual(state.hostResolvedTargets, { positiveTargets: 256, truncated: true });
  assert.equal(getterCalls, 0);
  assert(!JSON.stringify(observer.snapshot()).includes("private-"));
  observer.dispose();
});
