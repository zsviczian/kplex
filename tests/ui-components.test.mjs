import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { accessSync, constants, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { buildSync } from "esbuild";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function executable(path) {
  try {
    accessSync(path, constants.X_OK);
    return path;
  } catch {
    return null;
  }
}

function findOnPath(name) {
  for (const directory of (process.env.PATH ?? "").split(delimiter)) {
    if (!directory) continue;
    const candidate = executable(join(directory, process.platform === "win32" ? `${name}.exe` : name));
    if (candidate) return candidate;
  }
  return null;
}

function findBrowser() {
  if (process.env.KPLEX_TEST_BROWSER) return executable(process.env.KPLEX_TEST_BROWSER);
  for (const name of ["chromium", "chromium-browser", "google-chrome", "google-chrome-stable", "chrome"]) {
    const candidate = findOnPath(name);
    if (candidate) return candidate;
  }
  const known = process.platform === "darwin"
    ? [
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/Applications/Chromium.app/Contents/MacOS/Chromium",
      "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    ]
    : process.platform === "win32"
      ? [
        join(process.env.PROGRAMFILES ?? "", "Google/Chrome/Application/chrome.exe"),
        join(process.env["PROGRAMFILES(X86)"] ?? "", "Google/Chrome/Application/chrome.exe"),
        join(process.env.LOCALAPPDATA ?? "", "Google/Chrome/Application/chrome.exe"),
      ]
      : [];
  return known.map(executable).find(Boolean) ?? null;
}

function browserEntry() {
  return `
import React from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { ActionButton } from ${JSON.stringify(join(root, "src/ui/components/ActionButton.tsx"))};

const result = document.querySelector("#result");
const fail = (message) => { throw new Error(message); };
const check = (condition, message) => { if (!condition) fail(message); };

try {
  const form = document.createElement("form");
  const container = document.createElement("div");
  form.append(container);
  document.body.append(form);

  let activations = 0;
  let submissions = 0;
  form.addEventListener("submit", (event) => {
    submissions += 1;
    event.preventDefault();
  });

  const root = createRoot(container);
  flushSync(() => root.render(React.createElement(ActionButton, {
    label: "Navigate back",
    icon: React.createElement("span", { "data-testid": "action-icon" }, "←"),
    onClick: () => { activations += 1; },
  })));

  let button = container.querySelector("button");
  check(button instanceof HTMLButtonElement, "ActionButton did not render a native button");
  check(button.type === "button", "ActionButton must render type=button");
  check(button.getAttribute("aria-label") === "Navigate back", "accessible label was not rendered");
  check(button.classList.contains("excalibrain-icon-button"), "existing CSS hook changed");
  check(button.classList.contains("kplex-action-button"), "action token hook missing");
  check(!button.hasAttribute("title"), "ActionButton must not add a second/title tooltip");
  check(button.querySelector('[data-testid="action-icon"]')?.textContent === "←", "icon slot did not render");

  button.click();
  check(activations === 1, "enabled click must fire exactly once");
  check(submissions === 0, "type=button must prevent accidental form submission");

  flushSync(() => root.render(React.createElement(ActionButton, {
    label: "Navigate back",
    icon: React.createElement("span", { "data-testid": "action-icon" }, "←"),
    disabled: true,
    onClick: () => { activations += 1; },
  })));

  button = container.querySelector("button");
  check(button.disabled === true, "disabled prop did not reach the native button");
  button.click();
  check(activations === 1, "disabled click must not activate");
  check(submissions === 0, "disabled action must not submit the form");

  root.unmount();
  result.dataset.status = "passed";
  result.textContent = "ActionButton browser behavior passed";
} catch (error) {
  result.dataset.status = "failed";
  result.textContent = String(error?.stack ?? error);
}
`;
}

function floatingLayerBrowserEntry() {
  return `
import React, { useRef, useState } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { FloatingLayer } from ${JSON.stringify(join(root, "src/ui/components/FloatingLayer.tsx"))};

const result = document.querySelector("#result");
const fail = (message) => { throw new Error(message); };
const check = (condition, message) => { if (!condition) fail(message); };
const dispatchPointer = (target) => {
  const view = target.ownerDocument.defaultView;
  target.dispatchEvent(new view.PointerEvent("pointerdown", { bubbles: true, composed: true }));
};
const setViewport = (view, width, height) => {
  Object.defineProperty(view, "innerWidth", { configurable: true, value: width });
  Object.defineProperty(view, "innerHeight", { configurable: true, value: height });
};
const trackListeners = (target, types) => {
  const nativeAdd = target.addEventListener.bind(target);
  const nativeRemove = target.removeEventListener.bind(target);
  const active = new Map(types.map((type) => [type, new Set()]));
  target.addEventListener = (type, listener, options) => {
    active.get(type)?.add(listener);
    return nativeAdd(type, listener, options);
  };
  target.removeEventListener = (type, listener, options) => {
    active.get(type)?.delete(listener);
    return nativeRemove(type, listener, options);
  };
  return {
    count: (type) => active.get(type)?.size ?? 0,
    restore: () => {
      target.addEventListener = nativeAdd;
      target.removeEventListener = nativeRemove;
    },
  };
};

const positioning = {
  preferredWidth: 560,
  minimumWidth: 300,
  viewportMargin: 8,
  anchorGap: 6,
  minimumMaxHeight: 180,
};
const bodyPortal = (ownerDocument) => ownerDocument.body;

try {
  setViewport(window, 800, 600);
  const documentListeners = trackListeners(document, ["scroll", "pointerdown", "keydown"]);
  const windowListeners = trackListeners(window, ["resize", "pagehide"]);
  const NativeResizeObserver = window.ResizeObserver;
  let observerInstances = 0;
  let observerDisconnects = 0;
  class TrackingResizeObserver extends NativeResizeObserver {
    constructor(callback) {
      super(callback);
      observerInstances += 1;
    }
    disconnect() {
      observerDisconnects += 1;
      return super.disconnect();
    }
  }
  Object.defineProperty(window, "ResizeObserver", { configurable: true, value: TrackingResizeObserver });

  const container = document.createElement("div");
  const outside = document.createElement("button");
  outside.id = "outside";
  const nestedPortalRoot = document.createElement("div");
  nestedPortalRoot.id = "nested-portal-root";
  const nestedButton = document.createElement("button");
  nestedButton.textContent = "Nested portal action";
  nestedPortalRoot.append(nestedButton);
  document.body.append(container, outside, nestedPortalRoot);

  const dismissals = [];
  let rectLeft = 100;
  function Consumer() {
    const [open, setOpen] = useState(false);
    const anchorRef = useRef(null);
    const panelRef = useRef(null);
    return React.createElement(React.Fragment, null,
      React.createElement("button", {
        ref: anchorRef,
        id: "floating-trigger",
        "aria-expanded": open,
        onClick: () => setOpen((current) => !current),
      }, "Toggle"),
      React.createElement(FloatingLayer, {
        open,
        anchorRef,
        panelRef,
        insideRoots: () => [anchorRef.current, panelRef.current, nestedPortalRoot],
        onDismiss: (reason) => {
          dismissals.push(reason);
          setOpen(false);
        },
        portalTarget: bodyPortal,
        positioning,
      }, (style) => React.createElement("div", { ref: panelRef, "data-testid": "floating-panel", style },
        React.createElement("select", { "data-testid": "panel-select", defaultValue: "one" },
          React.createElement("option", { value: "one" }, "One"),
          React.createElement("option", { value: "two" }, "Two"))))
    );
  }

  const appRoot = createRoot(container);
  flushSync(() => appRoot.render(React.createElement(Consumer)));
  const trigger = container.querySelector("#floating-trigger");
  trigger.getBoundingClientRect = () => ({
    left: rectLeft, right: rectLeft + 30, top: 20, bottom: 50,
    width: 30, height: 30, x: rectLeft, y: 20, toJSON() { return {}; },
  });

  flushSync(() => trigger.click());
  let panel = document.body.querySelector('[data-testid="floating-panel"]');
  check(panel, "floating panel did not open");
  check(panel.parentElement === document.body, "panel was not portaled to the anchor ownerDocument body");
  check(trigger.getAttribute("aria-expanded") === "true", "consumer open state did not reach the trigger");
  check(panel.style.position === "fixed", "panel position must remain fixed");
  check(panel.style.left === "100px", "initial left position changed");
  check(panel.style.top === "56px", "initial top position changed");
  check(panel.style.width === "560px", "initial width formula changed");
  check(panel.style.maxHeight === "536px", "initial max-height formula changed");
  check(documentListeners.count("scroll") === 1, "captured scroll listener missing");
  check(documentListeners.count("pointerdown") === 1, "pointer listener missing");
  check(documentListeners.count("keydown") === 1, "Escape listener missing");
  check(windowListeners.count("resize") === 1, "resize listener missing");
  check(windowListeners.count("pagehide") === 1, "owner-window teardown listener missing");
  check(observerInstances === 1, "floating layer ResizeObserver missing");

  flushSync(() => dispatchPointer(trigger));
  check(document.body.querySelector('[data-testid="floating-panel"]'), "trigger pointerdown counted as outside");
  flushSync(() => dispatchPointer(panel));
  check(document.body.querySelector('[data-testid="floating-panel"]'), "panel pointerdown counted as outside");
  flushSync(() => dispatchPointer(nestedButton));
  check(document.body.querySelector('[data-testid="floating-panel"]'), "nested portal pointerdown counted as outside");
  check(dismissals.length === 0, "inside pointer unexpectedly dismissed the layer");

  setViewport(window, 420, 500);
  rectLeft = 390;
  flushSync(() => window.dispatchEvent(new Event("resize")));
  panel = document.body.querySelector('[data-testid="floating-panel"]');
  check(panel.style.width === "404px", "resize did not recompute clamped width");
  check(panel.style.left === "8px", "resize did not clamp panel inside the viewport");
  check(panel.style.maxHeight === "436px", "resize did not recompute max height");

  setViewport(window, 800, 600);
  rectLeft = 120;
  flushSync(() => window.dispatchEvent(new Event("resize")));
  check(panel.style.left === "120px", "position did not reset after viewport resize");
  rectLeft = 180;
  const scroller = document.createElement("div");
  panel.append(scroller);
  flushSync(() => scroller.dispatchEvent(new Event("scroll", { bubbles: false })));
  check(panel.style.left === "180px", "captured descendant scroll did not refresh position");

  outside.focus();
  flushSync(() => dispatchPointer(outside));
  check(dismissals.length === 1 && dismissals[0] === "outside-pointer", "outside pointer must dismiss exactly once");
  check(!document.body.querySelector('[data-testid="floating-panel"]'), "outside pointer did not close panel");
  check(document.activeElement === outside, "outside pointer dismissal forced focus back to trigger");
  check(documentListeners.count("scroll") === 0, "scroll listener leaked after close");
  check(documentListeners.count("pointerdown") === 0, "pointer listener leaked after close");
  check(documentListeners.count("keydown") === 0, "keydown listener leaked after close");
  check(windowListeners.count("resize") === 0, "resize listener leaked after close");
  check(windowListeners.count("pagehide") === 0, "pagehide listener leaked after close");
  check(observerDisconnects === 1, "ResizeObserver did not disconnect after close");

  flushSync(() => trigger.click());
  panel = document.body.querySelector('[data-testid="floating-panel"]');
  const select = panel.querySelector('[data-testid="panel-select"]');
  select.focus();
  check(document.activeElement === select, "test select did not receive focus");
  let leakedEscape = 0;
  const onLeakedEscape = () => { leakedEscape += 1; };
  window.addEventListener("keydown", onLeakedEscape);
  const escape = new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true });
  flushSync(() => select.dispatchEvent(escape));
  window.removeEventListener("keydown", onLeakedEscape);
  check(dismissals.length === 2 && dismissals[1] === "escape", "Escape must dismiss exactly once");
  check(escape.defaultPrevented && leakedEscape === 0, "handled Escape leaked to the host window");
  check(!document.body.querySelector('[data-testid="floating-panel"]'), "Escape did not close panel");
  check(document.activeElement === trigger, "Escape did not return focus to the trigger");
  check(observerDisconnects === 2, "ResizeObserver did not disconnect after Escape close");

  flushSync(() => trigger.click());
  check(documentListeners.count("pointerdown") === 1, "listeners did not reattach after reopen");
  flushSync(() => window.dispatchEvent(new Event("pagehide")));
  check(documentListeners.count("scroll") === 0, "scroll listener survived owner-window teardown");
  check(documentListeners.count("pointerdown") === 0, "pointer listener survived owner-window teardown");
  check(documentListeners.count("keydown") === 0, "keydown listener survived owner-window teardown");
  check(windowListeners.count("resize") === 0, "resize listener survived owner-window teardown");
  check(windowListeners.count("pagehide") === 0, "pagehide listener survived owner-window teardown");
  check(observerDisconnects === 3, "ResizeObserver survived owner-window teardown");

  flushSync(() => trigger.click());
  flushSync(() => trigger.click());
  check(documentListeners.count("pointerdown") === 1, "listeners did not attach before unmount cleanup test");
  flushSync(() => appRoot.unmount());
  check(documentListeners.count("scroll") === 0, "scroll listener leaked after unmount");
  check(documentListeners.count("pointerdown") === 0, "pointer listener leaked after unmount");
  check(documentListeners.count("keydown") === 0, "keydown listener leaked after unmount");
  check(windowListeners.count("resize") === 0, "resize listener leaked after unmount");
  check(windowListeners.count("pagehide") === 0, "pagehide listener leaked after unmount");
  check(observerDisconnects === 4, "ResizeObserver did not disconnect on unmount");

  documentListeners.restore();
  windowListeners.restore();
  Object.defineProperty(window, "ResizeObserver", { configurable: true, value: NativeResizeObserver });

  const iframe = document.createElement("iframe");
  document.body.append(iframe);
  const frameDocument = iframe.contentDocument;
  const frameWindow = iframe.contentWindow;
  check(frameDocument && frameWindow, "second document was unavailable");
  setViewport(frameWindow, 700, 500);
  const frameContainer = frameDocument.createElement("div");
  const frameOutside = frameDocument.createElement("button");
  frameDocument.body.append(frameContainer, frameOutside);
  let frameDismissals = 0;
  function FrameConsumer() {
    const [open, setOpen] = useState(false);
    const anchorRef = useRef(null);
    const panelRef = useRef(null);
    return React.createElement(React.Fragment, null,
      React.createElement("button", { ref: anchorRef, id: "frame-trigger", onClick: () => setOpen(true) }, "Open frame layer"),
      React.createElement(FloatingLayer, {
        open,
        anchorRef,
        panelRef,
        insideRoots: () => [anchorRef.current, panelRef.current],
        onDismiss: () => { frameDismissals += 1; setOpen(false); },
        portalTarget: bodyPortal,
        positioning,
      }, (style) => React.createElement("div", { ref: panelRef, "data-testid": "frame-floating-panel", style }, "Frame panel"))
    );
  }
  const frameRoot = createRoot(frameContainer);
  flushSync(() => frameRoot.render(React.createElement(FrameConsumer)));
  const frameTrigger = frameContainer.querySelector("#frame-trigger");
  frameTrigger.getBoundingClientRect = () => ({
    left: 40, right: 70, top: 10, bottom: 40,
    width: 30, height: 30, x: 40, y: 10, toJSON() { return {}; },
  });
  flushSync(() => frameTrigger.click());
  const framePanel = frameDocument.body.querySelector('[data-testid="frame-floating-panel"]');
  check(framePanel, "second-document floating panel did not open");
  check(framePanel.parentElement === frameDocument.body, "second-document panel was not portaled to its owning body");
  check(!document.body.querySelector('[data-testid="frame-floating-panel"]'), "second-document panel leaked into the parent document");
  flushSync(() => dispatchPointer(outside));
  check(frameDocument.body.querySelector('[data-testid="frame-floating-panel"]'), "parent-document pointer dismissed second-document layer");
  check(frameDismissals === 0, "second-document layer listened on the wrong document");
  flushSync(() => dispatchPointer(frameOutside));
  check(frameDismissals === 1, "second-document outside pointer did not dismiss exactly once");
  check(!frameDocument.body.querySelector('[data-testid="frame-floating-panel"]'), "second-document outside pointer did not close panel");
  flushSync(() => frameRoot.unmount());

  const movingAnchor = document.createElement("button");
  const movingAnchorRef = { current: movingAnchor };
  const movingPanelRef = { current: null };
  const migrationContainer = document.createElement("div");
  document.body.append(movingAnchor, migrationContainer);
  let migrationDismissals = 0;
  const migrationRoot = createRoot(migrationContainer);
  const renderMigration = () => React.createElement(FloatingLayer, {
    open: true,
    anchorRef: movingAnchorRef,
    panelRef: movingPanelRef,
    insideRoots: () => [movingAnchorRef.current, movingPanelRef.current],
    onDismiss: () => { migrationDismissals += 1; },
    portalTarget: bodyPortal,
    positioning,
  }, (style) => React.createElement("div", { ref: movingPanelRef, "data-testid": "migrating-panel", style }, "Moving panel"));
  flushSync(() => migrationRoot.render(renderMigration()));
  check(document.body.querySelector('[data-testid="migrating-panel"]'), "migrating panel did not start in the first document");
  frameDocument.body.append(movingAnchor);
  flushSync(() => migrationRoot.render(renderMigration()));
  check(!document.body.querySelector('[data-testid="migrating-panel"]'), "migrating panel remained in the old document");
  check(frameDocument.body.querySelector('[data-testid="migrating-panel"]'), "migrating panel did not follow its anchor document");
  flushSync(() => dispatchPointer(outside));
  check(migrationDismissals === 0, "migrating layer kept an outside listener in the old document");
  flushSync(() => dispatchPointer(frameOutside));
  check(migrationDismissals === 1, "migrating layer did not listen in the new document");
  flushSync(() => migrationRoot.unmount());
  movingAnchor.remove();
  migrationContainer.remove();
  iframe.remove();

  result.dataset.status = "passed";
  result.textContent = "FloatingLayer browser behavior passed";
} catch (error) {
  result.dataset.status = "failed";
  result.textContent = String(error?.stack ?? error);
}
`;
}

function runBrowserDom(entry, successText) {
  const browser = findBrowser();
  assert(browser, "A Chromium-family browser is required for the DOM behavior lane; set KPLEX_TEST_BROWSER to its executable path.");

  const temp = mkdtempSync(join(tmpdir(), "kplex-ui-components-"));
  try {
    const entryPath = join(temp, "entry.tsx");
    const bundlePath = join(temp, "bundle.js");
    const htmlPath = join(temp, "index.html");
    writeFileSync(entryPath, entry);
    buildSync({
      entryPoints: [entryPath],
      outfile: bundlePath,
      bundle: true,
      nodePaths: [join(root, "node_modules")],
      platform: "browser",
      format: "iife",
      target: ["chrome100"],
      logLevel: "silent",
    });
    writeFileSync(htmlPath, `<!doctype html><html><body><pre id="result">pending</pre><script src="./bundle.js"></script></body></html>`);

    const args = [
      "--headless=new",
      "--disable-gpu",
      "--no-sandbox",
      "--allow-file-access-from-files",
      "--virtual-time-budget=2000",
      "--dump-dom",
      `file://${htmlPath}`,
    ];
    const run = spawnSync(browser, args, { encoding: "utf8", timeout: 20_000 });
    assert.equal(run.error, undefined, run.error?.message);
    assert.equal(run.status, 0, `Browser DOM lane exited ${run.status}:\n${run.stderr}`);
    assert.match(run.stdout, /data-status="passed"/, `Browser DOM lane failed:\n${run.stdout}\n${run.stderr}`);
    assert.match(run.stdout, new RegExp(successText));
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
}

test("ActionButton rendered browser behavior", () => {
  runBrowserDom(browserEntry(), "ActionButton browser behavior passed");
});

test("FloatingLayer owner-document browser behavior", () => {
  runBrowserDom(floatingLayerBrowserEntry(), "FloatingLayer browser behavior passed");
});
