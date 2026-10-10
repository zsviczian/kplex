/**
 * Host-free production clipboard-session contracts with controlled promises. These tests verify
 * same-turn writes, truthful outcomes and retirement; they do not emulate native clipboard rights
 * or claim physical device user activation. Temporary bundles are always removed after exit.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const temporary = mkdtempSync(join(tmpdir(), "kplex-support-clipboard-"));
process.once("exit", /** Remove the owned bundle independently of an assertion's result. */ () => rmSync(temporary, { recursive: true, force: true }));
const entry = join(temporary, "clipboard.mjs");
await build({ stdin: { contents: 'export {SupportClipboardSession} from "./src/application/supportClipboard";', resolveDir: process.cwd(), loader: "ts" }, outfile: entry, bundle: true, platform: "node", format: "esm" });
const { SupportClipboardSession } = await import(pathToFileURL(entry).href);
const report = "## K-Plex diagnostics\n\n```json\n{\"formatVersion\":1,\"synthetic\":\"é 🧠\"}\n```\n";

/** Hold one attempt at its real Promise boundary, exposing only its controlled settlement. */
function deferred() {
  let resolve, reject;
  const promise = new Promise(/** Capture the native-result stand-in without starting a timer. */ (accept, deny) => { resolve = accept; reject = deny; });
  return { promise, resolve, reject };
}

/** Drain settlement callbacks without timeouts, permissions queries or environmental clipboard access. */
async function settle() { await Promise.resolve(); await Promise.resolve(); }

test("clipboard construction is passive and writes exact bytes synchronously before the first microtask", /** Observe ordering around the production call rather than merely inspecting source text. */ async () => {
  const order = [], bytes = [], pending = deferred();
  const session = new SupportClipboardSession(report, /** The injected writer records its synchronous invocation before returning its promise. */ text => { order.push("writer"); bytes.push(text); return pending.promise; });
  assert.equal(session.state, "idle");
  assert.deepEqual(bytes, []);
  session.listen(/** State notifications are categorical and contain no clipboard payload or raw error. */ state => order.push(state));
  const microtask = Promise.resolve().then(/** The queued microtask must not precede the writer. */ () => order.push("microtask"));
  session.copy();
  order.push("handler-return");
  assert.deepEqual(order, ["idle", "copying", "writer", "handler-return"]);
  assert.deepEqual(bytes, [report]);
  assert.equal(session.state, "copying");
  await microtask;
  assert.equal(session.state, "copying", "a pending promise cannot produce success");
  pending.resolve(); await settle();
  assert.equal(session.state, "copied");
  assert.deepEqual(order, ["idle", "copying", "writer", "handler-return", "microtask", "copied"]);
  session.dispose();
});

test("a dense stream of duplicate pending attempts starts one write and permits a later explicit retry", /** Pending state coalesces attempts without retaining per-click work or emitting repeated states. */ async () => {
  const pending = deferred(), states = [];
  let writes = 0;
  const session = new SupportClipboardSession(report, /** Count actual writer calls, independent of the number of button activations. */ () => { writes++; return pending.promise; });
  session.listen(/** Retain the finite observable state sequence for the assertion. */ state => states.push(state));
  for (let i = 0; i < 10000; i++) session.copy();
  assert.equal(writes, 1);
  assert.deepEqual(states, ["idle", "copying"]);
  pending.resolve(); await settle();
  session.copy(); await settle();
  assert.equal(writes, 2);
  assert.deepEqual(states, ["idle", "copying", "copied", "copying", "copied"]);
  session.dispose();
});

test("denial is truthful and a synchronous retry uses the same immutable report", /** Private rejection details cannot become copy status; the next attempt starts in its own activation turn. */ async () => {
  const attempts = [deferred(), deferred()], bytes = [], states = [];
  const session = new SupportClipboardSession(report, /** Each write returns a separately controlled real promise. */ text => { bytes.push(text); return attempts[bytes.length - 1].promise; });
  session.listen(/** Listen only to finite state codes, never an Error message or stack. */ state => states.push(state));
  session.copy();
  attempts[0].reject(new Error("private/path.md bearer=fake-secret")); await settle();
  assert.equal(session.state, "failed");
  assert.deepEqual(states, ["idle", "copying", "failed"]);
  session.copy();
  assert.deepEqual(bytes, [report, report]);
  assert.equal(session.state, "copying");
  attempts[1].resolve(); await settle();
  assert.deepEqual(states, ["idle", "copying", "failed", "copying", "copied"]);
  session.dispose();
});

test("unavailable and synchronously throwing writers fail safely without escaping the handler", /** Missing capabilities and immediate permission failures keep the immutable report available. */ () => {
  const throwing = /** Simulate a clipboard capability that rejects before returning a promise. */ () => { throw new Error("file:///private/vault.md fake-token"); };
  for (const writer of [null, throwing]) {
    const states = [], session = new SupportClipboardSession(report, writer);
    session.listen(/** Capture categorical status to prove raw host failures never cross this API. */ state => states.push(state));
    assert.doesNotThrow(/** The production button callback cannot leak a synchronous host exception. */ () => session.copy());
    assert.equal(session.report, report);
    assert.equal(session.state, "failed");
    assert.deepEqual(states, ["idle", "copying", "failed"]);
    session.copy();
    assert.deepEqual(states, ["idle", "copying", "failed", "copying", "failed"]);
    session.dispose();
  }
});

test("retired pending fulfillment and denial cannot notify detached presentation or write again", /** Both completion branches share the revocable lease and disposal remains idempotent. */ async () => {
  for (const denied of [false, true]) {
    const pending = deferred(), states = [];
    let writes = 0, lateNotifications = 0;
    const session = new SupportClipboardSession(report, /** Track that retirement permanently releases use of the writer. */ () => { writes++; return pending.promise; });
    session.listen(/** Model the mounted modal's status sink before dismissal. */ state => states.push(state));
    session.copy(); session.dispose(); session.dispose();
    session.listen(/** A dismissed session must not bind a new retained presentation callback. */ () => lateNotifications++);
    session.copy();
    if (denied) pending.reject(new Error("private stale rejection")); else pending.resolve();
    await settle();
    assert.equal(writes, 1);
    assert.deepEqual(states, ["idle", "copying"]);
    assert.equal(lateNotifications, 0);
    assert.equal(session.state, "copying", "retirement must not mutate the detached status");
  }
});

test("rebinding presentation replaces the old listener without duplicating pending writes", /** Only the currently mounted shell receives settlement and each listener gets its immediate state. */ async () => {
  const pending = deferred(), previous = [], current = [];
  const session = new SupportClipboardSession(report, /** Supply the same single controlled attempt to both presentation bindings. */ () => pending.promise);
  session.listen(/** Model the retired first presentation without modifying production lease state. */ state => previous.push(state));
  session.copy();
  session.listen(/** Rebind to the new presentation while a write is still pending. */ state => current.push(state));
  pending.resolve(); await settle();
  assert.deepEqual(previous, ["idle", "copying"]);
  assert.deepEqual(current, ["copying", "copied"]);
  session.dispose();
});
