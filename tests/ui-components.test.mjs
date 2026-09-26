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


function fuzzySuggesterBrowserEntry() {
  return `
import React, { useState } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { FuzzySuggester } from ${JSON.stringify(join(root, "src/ui/components/FuzzySuggester.tsx"))};

const result = document.querySelector("#result");
const fail = (message) => { throw new Error(message); };
const check = (condition, message) => { if (!condition) fail(message); };
const dispatchPointer = (target) => target.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true }));
const key = (target, name, init = {}) => target.dispatchEvent(new KeyboardEvent("keydown", { key: name, bubbles: true, cancelable: true, ...init }));
const type = (input, value) => {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
  setter.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
};

try {
  let scrollCalls = 0;
  const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
  HTMLElement.prototype.scrollIntoView = function () { scrollCalls += 1; };
  const NativeResizeObserver = window.ResizeObserver;
  let observerDisconnects = 0;
  class TestResizeObserver {
    constructor(callback) { this.callback = callback; }
    observe() {}
    disconnect() { observerDisconnects += 1; }
  }
  Object.defineProperty(window, "ResizeObserver", { configurable: true, value: TestResizeObserver });
  Object.defineProperty(window, "innerWidth", { configurable: true, value: 1000 });
  Object.defineProperty(window, "innerHeight", { configurable: true, value: 700 });
  const visualViewport = window.visualViewport;
  if (visualViewport) {
    Object.defineProperty(visualViewport, "width", { configurable: true, value: 1000 });
    Object.defineProperty(visualViewport, "height", { configurable: true, value: 700 });
    Object.defineProperty(visualViewport, "offsetLeft", { configurable: true, value: 0 });
    Object.defineProperty(visualViewport, "offsetTop", { configurable: true, value: 0 });
  }

  const app = document.createElement("div");
  app.className = "test-app";
  const topbar = document.createElement("div");
  topbar.className = "test-topbar";
  const toolbarHost = document.createElement("div");
  topbar.append(toolbarHost);
  app.append(topbar);
  document.body.append(app);
  app.getBoundingClientRect = () => ({ left: 50, top: 40, right: 950, bottom: 640, width: 900, height: 600, x: 50, y: 40, toJSON() { return {}; } });
  topbar.getBoundingClientRect = () => ({ left: 50, top: 40, right: 950, bottom: 90, width: 900, height: 50, x: 50, y: 40, toJSON() { return {}; } });

  const ordered = [{ id: "z", label: "Zulu" }, { id: "a", label: "Alpha" }, { id: "m", label: "Mike" }];
  let chosen = [];
  let ctrlEnters = 0;
  let focusRequest = 0;
  function Toolbar() {
    const [value, setValue] = useState("");
    return React.createElement(FuzzySuggester, {
      value, onChange: setValue, results: ordered, onChoose: (item) => { chosen.push(item.id); setValue(""); },
      getKey: (item) => item.id, getLabel: (item) => item.label,
      icon: React.createElement("span", { "data-testid": "slot-icon" }, "S"), floating: true,
      floatingMode: "app", portalSelector: ".test-app", appTopbarSelector: ".test-topbar",
      focusRequest, onCtrlEnter: () => { ctrlEnters += 1; },
    });
  }
  const toolbarRoot = createRoot(toolbarHost);
  flushSync(() => toolbarRoot.render(React.createElement(Toolbar)));
  const toolbarShell = toolbarHost.querySelector(".kplex-fuzzy-search");
  const toolbarInput = toolbarHost.querySelector("input");
  toolbarShell.getBoundingClientRect = () => ({ left: 100, top: 50, right: 320, bottom: 80, width: 220, height: 30, x: 100, y: 50, toJSON() { return {}; } });
  flushSync(() => toolbarInput.focus());
  let list = app.querySelector(".excalibrain-search-results");
  check(list && list.parentElement === app, "toolbar results did not portal inside the app root");
  check([...list.querySelectorAll("button > span")].map((node) => node.textContent).join("|") === "Zulu|Alpha|Mike", "portable suggester reordered caller results");
  check(list.style.left === "50px" && list.style.top === "56px", "toolbar app-relative geometry changed");
  check(toolbarHost.querySelector('[data-testid="slot-icon"]'), "portable icon slot did not render");
  flushSync(() => dispatchPointer(list.querySelector("button")));
  check(app.querySelector(".excalibrain-search-results"), "inside result pointer was treated as outside");

  flushSync(() => key(toolbarInput, "ArrowDown"));
  check(list.querySelector('[data-kplex-fuzzy-index="1"]').classList.contains("is-selected"), "ArrowDown did not move selection");
  check(scrollCalls > 0, "selected row was not scrolled into view after keyboard navigation");
  flushSync(() => key(toolbarInput, "ArrowUp"));
  check(list.querySelector('[data-kplex-fuzzy-index="0"]').classList.contains("is-selected"), "ArrowUp did not move selection");
  flushSync(() => key(toolbarInput, "Enter", { ctrlKey: true }));
  check(ctrlEnters === 1 && chosen.length === 0, "Ctrl+Enter did not stay a distinct caller action");

  let leakedEscape = 0;
  window.addEventListener("keydown", () => { leakedEscape += 1; }, { once: true });
  const escape = new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true });
  flushSync(() => toolbarInput.dispatchEvent(escape));
  check(!app.querySelector(".excalibrain-search-results"), "Escape did not dismiss visible results");
  check(document.activeElement === toolbarInput, "Escape blurred the input");
  check(escape.defaultPrevented && leakedEscape === 0, "Escape leaked to the host shortcut path");

  flushSync(() => type(toolbarInput, "x"));
  check(app.querySelector(".excalibrain-search-results"), "editing after Escape did not reopen results");
  const outside = document.createElement("button"); document.body.append(outside);
  flushSync(() => dispatchPointer(outside));
  check(document.activeElement !== toolbarInput && !app.querySelector(".excalibrain-search-results"), "outside pointer did not close and blur");
  focusRequest += 1;
  flushSync(() => toolbarRoot.render(React.createElement(Toolbar)));
  check(document.activeElement === toolbarInput && app.querySelector(".excalibrain-search-results"), "focusRequest did not focus and reopen toolbar results");
  flushSync(() => key(toolbarInput, "Enter"));
  check(chosen.join("|") === "z", "Enter did not choose the caller-ordered selected result");

  const modalHost = document.createElement("div"); document.body.append(modalHost);
  let modalChosen = 0;
  let modalCtrl = 0;
  let modalDefault = 0;
  function ModalField({ disabled = false, empty = false }) {
    const [value, setValue] = useState("");
    return React.createElement(FuzzySuggester, {
      value, onChange: setValue, results: empty ? [] : ordered, onChoose: () => { modalChosen += 1; },
      getKey: (item) => item.id, getLabel: (item) => item.label, floating: true, floatingMode: "viewport",
      openResultsOnFocus: false, disabled, onCtrlEnter: () => { modalCtrl += 1; },
    });
  }
  const modalRoot = createRoot(modalHost);
  flushSync(() => modalRoot.render(React.createElement(ModalField)));
  let modalShell = modalHost.querySelector(".kplex-fuzzy-search");
  let modalInput = modalHost.querySelector("input");
  modalShell.getBoundingClientRect = () => ({ left: 200, top: 650, right: 500, bottom: 680, width: 300, height: 30, x: 200, y: 650, toJSON() { return {}; } });
  flushSync(() => modalInput.focus());
  check(!document.body.querySelector(".kplex-fuzzy-floating-results"), "modal results opened on focus before typing");
  flushSync(() => type(modalInput, "a"));
  list = document.body.querySelector(".kplex-fuzzy-floating-results");
  check(list && list.parentElement === document.body, "modal results did not portal to owner document body");
  check(list.style.bottom === "56px" && !list.style.top, "modal results did not open above when lower space was insufficient");
  if (visualViewport) {
    Object.defineProperty(visualViewport, "height", { configurable: true, value: 420 });
    flushSync(() => visualViewport.dispatchEvent(new Event("resize")));
    check(list.style.bottom === "288px", "modal results remained behind a simulated software keyboard");
    Object.defineProperty(visualViewport, "height", { configurable: true, value: 700 });
    flushSync(() => visualViewport.dispatchEvent(new Event("resize")));
    check(list.style.bottom === "56px", "modal results did not recover after the visual viewport expanded");
  }
  flushSync(() => key(modalInput, "Enter", { metaKey: true }));
  check(modalCtrl === 1 && modalChosen === 0, "modal Ctrl/Cmd+Enter was not distinct from result choice");

  flushSync(() => modalRoot.unmount());
  const noDefaultRoot = createRoot(modalHost);
  function NoDefault() {
    const [value, setValue] = useState("");
    return React.createElement(FuzzySuggester, { value, onChange: setValue, results: [], onChoose: () => { modalDefault += 1; }, getKey: String, getLabel: String, openResultsOnFocus: false });
  }
  flushSync(() => noDefaultRoot.render(React.createElement(NoDefault)));
  modalInput = modalHost.querySelector("input");
  flushSync(() => modalInput.focus());
  flushSync(() => type(modalInput, "new note"));
  flushSync(() => key(modalInput, "Enter"));
  check(modalDefault === 0, "Enter acquired a default creation action");
  flushSync(() => noDefaultRoot.unmount());

  const imeRoot = createRoot(modalHost);
  flushSync(() => imeRoot.render(React.createElement(ModalField)));
  modalInput = modalHost.querySelector("input");
  flushSync(() => modalInput.focus());
  flushSync(() => type(modalInput, "a"));
  modalInput.dispatchEvent(new CompositionEvent("compositionstart", { bubbles: true, data: "a" }));
  const imeEnter = new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true });
  Object.defineProperty(imeEnter, "isComposing", { value: true });
  flushSync(() => modalInput.dispatchEvent(imeEnter));
  modalInput.dispatchEvent(new CompositionEvent("compositionend", { bubbles: true, data: "あ" }));
  check(modalChosen === 0, "IME composition Enter selected a result");
  flushSync(() => imeRoot.unmount());

  const stateRoot = createRoot(modalHost);
  flushSync(() => stateRoot.render(React.createElement(ModalField, { disabled: true })));
  check(modalHost.querySelector("input").disabled, "disabled state did not reach input");
  check(!document.body.querySelector(".kplex-fuzzy-floating-results"), "disabled field exposed results");
  flushSync(() => stateRoot.render(React.createElement(ModalField, { empty: true })));
  modalInput = modalHost.querySelector("input");
  flushSync(() => modalInput.focus()); flushSync(() => type(modalInput, "x"));
  check(!document.body.querySelector(".kplex-fuzzy-floating-results"), "empty results rendered a list");
  flushSync(() => stateRoot.unmount());

  const iframe = document.createElement("iframe"); document.body.append(iframe);
  const frameDocument = iframe.contentDocument; const frameWindow = iframe.contentWindow;
  check(frameDocument && frameWindow, "second document unavailable");
  Object.defineProperty(frameWindow, "innerWidth", { configurable: true, value: 600 });
  Object.defineProperty(frameWindow, "innerHeight", { configurable: true, value: 400 });
  Object.defineProperty(frameWindow, "ResizeObserver", { configurable: true, value: TestResizeObserver });
  const movingHost = document.createElement("div"); document.body.append(movingHost);
  const movingRoot = createRoot(movingHost);
  function Moving() {
    const [value, setValue] = useState("x");
    return React.createElement(FuzzySuggester, { value, onChange: setValue, results: ordered, onChoose: () => {}, getKey: (item) => item.id, getLabel: (item) => item.label, floating: true, floatingMode: "viewport" });
  }
  flushSync(() => movingRoot.render(React.createElement(Moving)));
  let movingShell = movingHost.querySelector(".kplex-fuzzy-search");
  movingShell.getBoundingClientRect = () => ({ left: 20, top: 20, right: 220, bottom: 50, width: 200, height: 30, x: 20, y: 20, toJSON() { return {}; } });
  let movingInput = movingHost.querySelector("input"); flushSync(() => movingInput.focus());
  check(document.body.querySelector(".kplex-fuzzy-floating-results"), "moving suggester did not start in first document");
  frameDocument.body.append(movingHost);
  flushSync(() => movingRoot.render(React.createElement(Moving)));
  check(!document.body.querySelector(".kplex-fuzzy-floating-results"), "moving suggester portal remained in old document");
  check(frameDocument.body.querySelector(".kplex-fuzzy-floating-results"), "moving suggester did not follow owner document");
  flushSync(() => dispatchPointer(outside));
  check(frameDocument.body.querySelector(".kplex-fuzzy-floating-results"), "old-document pointer dismissed moved suggester");
  const frameOutside = frameDocument.createElement("button"); frameDocument.body.append(frameOutside);
  flushSync(() => frameOutside.dispatchEvent(new frameWindow.PointerEvent("pointerdown", { bubbles: true, cancelable: true })));
  check(!frameDocument.body.querySelector(".kplex-fuzzy-floating-results"), "new owner-document outside pointer did not dismiss moved suggester");
  movingInput = movingHost.querySelector("input");
  flushSync(() => movingInput.focus());
  check(frameDocument.body.querySelector(".kplex-fuzzy-floating-results"), "moved suggester did not reopen before owner-window teardown");
  const disconnectsBeforePagehide = observerDisconnects;
  flushSync(() => frameWindow.dispatchEvent(new frameWindow.Event("pagehide")));
  check(observerDisconnects > disconnectsBeforePagehide, "owner-window teardown did not disconnect ResizeObserver");
  flushSync(() => frameOutside.dispatchEvent(new frameWindow.PointerEvent("pointerdown", { bubbles: true, cancelable: true })));
  check(frameDocument.body.querySelector(".kplex-fuzzy-floating-results"), "owner-window teardown left an outside-pointer listener attached");
  flushSync(() => movingRoot.unmount());
  check(observerDisconnects > 0, "ResizeObserver cleanup was not observed");

  toolbarRoot.unmount();
  HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
  Object.defineProperty(window, "ResizeObserver", { configurable: true, value: NativeResizeObserver });
  if (visualViewport) {
    for (const property of ["width", "height", "offsetLeft", "offsetTop"]) delete visualViewport[property];
  }
  result.dataset.status = "passed";
  result.textContent = "FuzzySuggester browser behavior passed";
} catch (error) {
  result.dataset.status = "failed";
  result.textContent = String(error?.stack ?? error);
}
`;
}

function graphSearchBrowserEntry() {
  return `
import React from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { SearchBox } from ${JSON.stringify(join(root, "src/ui/features/SearchBox.tsx"))};

const result = document.querySelector("#result");
const check = (condition, message) => { if (!condition) throw new Error(message); };
const type = (input, value) => {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
};
try {
  check(!window.app, "host object unexpectedly exists");
  const host = document.createElement("div"); host.className = "test-search-host";
  document.body.append(host);
  host.getBoundingClientRect = () => ({ left: 0, top: 0, right: 600, bottom: 500, width: 600, height: 500 });
  const node = (id, kind) => ({ id, kind, resolution: "resolved", name: "Name", url: null, aliases: [], tags: [], noteType: null, primaryStyleTag: null, styleTags: [], maxLabelLength: 30 });
  const first = { node: node("folder:Opaque-ID", "document"), label: "Ranked first", detail: "actual/First.md" };
  const second = { node: node("Case:SECOND", "url"), label: "Configured second", detail: "https://example.com/view" };
  let hits = [second, first];
  const calls = [], chosen = [];
  const graph = { search(query, limit) { calls.push([query, limit]); return hits; } };
  const topbar = document.createElement("div"); topbar.className = "test-search-topbar"; host.append(topbar);
  topbar.getBoundingClientRect = () => ({ left: 0, top: 0, right: 600, bottom: 60, width: 600, height: 60 });
  const root = createRoot(topbar);
  const render = (revision) => flushSync(() => root.render(React.createElement(SearchBox, {
    graph, revision, onActivate: (id) => chosen.push(id), placeholder: "Localized placeholder", ariaLabel: "Localized search",
    icon: React.createElement("span", { "data-test-icon": "true" }, "search icon"), portalSelector: ".test-search-host", appTopbarSelector: ".test-search-topbar",
  })));
  render(0);
  const input = host.querySelector("input");
  host.querySelector(".kplex-fuzzy-search").getBoundingClientRect = () => ({ left: 10, top: 20, right: 310, bottom: 50, width: 300, height: 30 });
  flushSync(() => input.focus());
  flushSync(() => type(input, "needle"));
  const rows = () => [...host.querySelectorAll(".excalibrain-search-result")];
  check(rows().length === 2, "search hits did not render");
  check(rows()[0].querySelector("span").textContent === second.label, "source ranking was changed");
  check(rows()[1].querySelector("small").textContent === first.detail, "opaque ID was used as display detail");
  check(input.getAttribute("aria-label") === "Localized search" && input.placeholder === "Localized placeholder", "localized copy was changed");
  check(host.querySelector("[data-test-icon]"), "host icon slot missing");
  check(calls.every(([, limit]) => limit === 24), "search mapping was not bounded to 24 hits");
  const count = calls.length; render(0);
  check(calls.length === count, "unchanged revision unnecessarily reran search");
  hits = [{ ...first, label: "Renamed first", detail: "actual/Renamed.md" }]; render(1);
  check(calls.length === count + 1 && calls.at(-1)[0] === "needle", "publication revision did not refresh the same query");
  check(input.value === "needle" && document.activeElement === input, "publication lost query or focus");
  check(rows().length === 1 && rows()[0].querySelector("span").textContent === "Renamed first", "stale label/result survived publication");
  flushSync(() => input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true })));
  check(chosen.length === 1 && chosen[0] === first.node.id, "activation reinterpreted/normalized the opaque ID");
  check(input.value === "", "selection did not clear query");
  flushSync(() => input.focus());
  flushSync(() => type(input, "needle"));
  check(rows().length === 1, "deletion fixture must be visible before its publication");
  hits = []; render(2);
  check(rows().length === 0 && input.value === "needle", "deleted result survived publication or query was lost");
  flushSync(() => root.unmount());
  check(!host.querySelector(".kplex-fuzzy-floating-results"), "search portal survived unmount");
  result.dataset.status = "passed"; result.textContent = "Graph search read consumer behavior passed";
} catch (error) {
  result.dataset.status = "failed"; result.textContent = String(error?.stack ?? error);
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


test("FuzzySuggester production browser behavior", () => {
  runBrowserDom(fuzzySuggesterBrowserEntry(), "FuzzySuggester browser behavior passed");
});

test("SearchBox plain read model and revision browser behavior", () => {
  runBrowserDom(graphSearchBrowserEntry(), "Graph search read consumer behavior passed");
});
