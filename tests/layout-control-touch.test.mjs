/**
 * Pure lifecycle and rendered-shell contracts for the production layout-control owner. These tests
 * deliberately do not claim that synthetic events prove native range dragging or mobile acceptance;
 * trusted browser input and actual pane rectangles belong to the serial native/browser host lane.
 */
import assert from "node:assert/strict";
import { build } from "esbuild";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";

const directory = mkdtempSync(join(tmpdir(), "kplex-layout-control-touch-"));
process.on("exit", /** Remove this suite's bundled fixture without touching repository artifacts. */ () => rmSync(directory, { recursive: true, force: true }));
await build({ stdin: { contents: 'export * from "./src/ui/components/nativeTouchBoundary"; export * from "./src/ui/components/LayoutControls"; export { createElement } from "react"; export { renderToStaticMarkup } from "react-dom/server";', resolveDir: process.cwd() },
  outfile: join(directory, "controls.cjs"), bundle: true, platform: "node", format: "cjs" });
const { containNativeTouchGestures, LayoutControls, createElement, renderToStaticMarkup } = (await import(pathToFileURL(join(directory, "controls.cjs")))).default;

/** A structural owner records exact native listener identity/options, without pretending to be a DOM. */
class ListenerOwner {
  listeners = new Map();
  /** Record exactly the listeners the production helper owns. */
  addEventListener(type, listener, options) { this.listeners.set(type, { listener, options }); }
  /** Reject mismatched teardown so cleanup cannot pass while an owned listener leaks. */
  removeEventListener(type, listener) { assert.equal(this.listeners.get(type)?.listener, listener); this.listeners.delete(type); }
  /** Deliver one native Event object to the registered listener for its propagation/default contract. */
  deliver(type) {
    const event = new Event(type, { cancelable: true, bubbles: true });
    this.listeners.get(type)?.listener(event);
    return event;
  }
}

test("native control touch boundary contains all gesture phases without canceling browser defaults", /** Check ownership mechanics only, separately from trusted-input native acceptance. */ () => {
  const owner = new ListenerOwner();
  const dispose = containNativeTouchGestures(owner);
  assert.deepEqual([...owner.listeners.keys()], ["touchstart", "touchmove", "touchend", "touchcancel"]);
  for (const type of owner.listeners.keys()) {
    assert.deepEqual(owner.listeners.get(type).options, { passive: true });
    const event = owner.deliver(type);
    assert.equal(event.cancelBubble, true, `${type} must not reach graph/sidebar bubble handlers`);
    assert.equal(event.defaultPrevented, false, `${type} must preserve native range/scroll defaults`);
  }
  dispose(); dispose();
  assert.equal(owner.listeners.size, 0);
});

test("owner teardown removes containment and a new owner receives no prior gesture state", /** End/cancel/collapse need no capture release because the helper owns no capture or document state. */ () => {
  const retired = new ListenerOwner();
  const dispose = containNativeTouchGestures(retired);
  retired.deliver("touchstart"); retired.deliver("touchcancel");
  dispose();
  assert.equal(retired.deliver("touchmove").cancelBubble, false);
  const replacement = new ListenerOwner();
  const release = containNativeTouchGestures(replacement);
  replacement.deliver("touchstart"); replacement.deliver("touchstart");
  assert.equal(replacement.deliver("touchend").defaultPrevented, false);
  release();
  assert.equal(replacement.listeners.size, 0);
});

/** Render the actual shell with native range/checkbox slots and a disclosure kept first in DOM order. */
function markup(width, height, expanded) {
  return renderToStaticMarkup(createElement(LayoutControls, { width, height, expanded,
    toggle: createElement("button", { className: "kplex-layout-toggle", "aria-expanded": expanded }, "Configure") },
  createElement("input", { type: "range", min: 1, max: 7, step: 1, defaultValue: 3 }),
  createElement("input", { type: "checkbox", defaultChecked: true })));
}

test("pane geometry controls stacking for mobile and narrow desktop alike without reordering DOM focus", /** SSR proves supplied-width policy and mounted-content identity, not actual browser rectangles. */ () => {
  for (const width of [320, 390, 480, 600]) {
    const html = markup(width, 700, true);
    assert.match(html, /kplex-layout-controls is-stacked/);
    assert(html.indexOf('class="kplex-layout-toggle"') < html.indexOf('class="kplex-layout-panel"'), "disclosure remains the keyboard entry point");
    assert.match(html, /--kplex-layout-panel-height:588px/);
    assert.match(html, /type="range"[^>]*step="1"[^>]*value="3"/);
    assert.match(html, /type="checkbox"[^>]*checked/);
  }
  for (const width of [760, 900]) assert.doesNotMatch(markup(width, 700, true), /is-stacked/);
  assert.match(markup(900, 220, true), /is-stacked/);
  assert.match(markup(320, 120, true), /--kplex-layout-panel-height:24px/);
});

test("collapse unmounts the expanded panel while retaining just the native disclosure", /** Hidden controls cannot leave an invisible hit region or retain a draft input in the shell. */ () => {
  const html = markup(390, 700, false);
  assert.match(html, /kplex-layout-toggle/);
  assert.doesNotMatch(html, /class="kplex-layout-panel"|type="range"|type="checkbox"/);
});
