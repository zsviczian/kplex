/** Host event-task dispatch contracts use the production helper with observable disposable ports. */
import assert from "node:assert/strict";
import test from "node:test";
import { loadPortableModules } from "./support/portableTypeScript.mjs";
const { exports: { yieldToHostTask } } = loadPortableModules(["src/adapters/obsidian/yieldToHostTask.ts"]);

/** Model only owning-window event delivery and resource ownership, without pretending to be IDB. */
function fixture({ postingFailure = false, constructionFailure = false } = {}) {
  const tasks = [], ports = [];
  let timers = 0;
  class Channel {
    constructor() {
      if (constructionFailure) throw new Error("Construction failed");
      this.port1 = { onmessage: null, onmessageerror: null, closes: 0, close() { this.closes++; } };
      this.port2 = { onmessage: null, onmessageerror: null, closes: 0, close() { this.closes++; }, postMessage: () => {
        if (postingFailure) throw new Error("Posting failed");
        tasks.push(() => this.port1.onmessage?.({ data: 0 }));
      } };
      ports.push(this.port1, this.port2);
    }
  }
  return { owner: { MessageChannel: Channel, setTimeout() { timers++; } }, tasks, ports, timers: () => timers };
}

test("host CPU continuation is an event task with no timer or microtask-only completion", async () => {
  const f = fixture();let settled = false;
  const promise = yieldToHostTask(f.owner).then(() => { settled = true; });
  await Promise.resolve();assert.equal(settled, false);assert.equal(f.timers(), 0);
  assert.equal(f.tasks.length, 1);f.tasks.shift()();await promise;
  assert.equal(settled, true);assert(f.ports.every(port => port.closes === 1 && port.onmessage === null && port.onmessageerror === null));
});

test("posting and delivery failures reject after closing both ports exactly once", async () => {
  const posting = fixture({ postingFailure: true });
  await assert.rejects(yieldToHostTask(posting.owner), /Posting failed/);
  assert(posting.ports.every(port => port.closes === 1 && port.onmessage === null));assert.equal(posting.timers(), 0);
  const delivery = fixture();const pending = yieldToHostTask(delivery.owner);
  delivery.ports[0].onmessageerror();await assert.rejects(pending, /task continuation failed/);
  delivery.tasks.shift()();assert(delivery.ports.every(port => port.closes === 1));
  await assert.rejects(yieldToHostTask(fixture({ constructionFailure: true }).owner), /Construction failed/);
});

test("dispatch cannot bypass a caller's unload or replacement fence", async () => {
  const f = fixture();let current = true, published = false;
  const pending = (async () => { await yieldToHostTask(f.owner);if (current) published = true; })();
  current = false;f.tasks.shift()();await pending;
  assert.equal(published, false);assert(f.ports.every(port => port.closes === 1));
});

test("unsupported hosts preserve the injected timer fallback", async () => {
  let callback, timers = 0;
  const pending = yieldToHostTask({ setTimeout(resolve, delay) { timers++;assert.equal(delay, 0);callback = resolve;return 1; } });
  assert.equal(timers, 1);callback();await pending;
});
