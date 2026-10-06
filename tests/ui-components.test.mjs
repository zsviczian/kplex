/**
 * Bundles K-Plex UI components into real browser fixtures for interaction, portal and cleanup
 * assertions. Canonical CSS selectors are shared with production; fixtures are removed after each run.
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { accessSync, constants, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { buildSync } from "esbuild";
import ts from "typescript";

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
  check(button.classList.contains("kplex-icon-button"), "canonical K-Plex button CSS hook is missing");
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

function infoBubbleBrowserEntry() {
  return `
import React, { useRef, useState } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { InfoBubble } from ${JSON.stringify(join(root, "src/ui/components/InfoBubble.tsx"))};

const result = document.querySelector("#result");
const fail = (message) => { throw new Error(message); };
const check = (condition, message) => { if (!condition) fail(message); };

try {
  Object.defineProperty(window, "innerWidth", { configurable: true, value: 800 });
  Object.defineProperty(window, "innerHeight", { configurable: true, value: 600 });
  const container = document.createElement("div");
  const outside = document.createElement("button");
  document.body.append(container, outside);
  let advances = 0;
  let dismissals = 0;

  function Consumer({ actionless = false }) {
    const [open, setOpen] = useState(true);
    const targetRef = useRef(null);
    return React.createElement(React.Fragment, null,
      React.createElement("button", { ref: targetRef, id: "bubble-target" }, "Index status"),
      React.createElement(InfoBubble, {
        open,
        targetRef,
        message: "Indexing in progress.",
        dismissLabel: actionless ? undefined : "Dismiss",
        advanceLabel: actionless ? undefined : "Next",
        onAdvance: actionless ? undefined : () => { advances += 1; },
        onDismiss: () => { dismissals += 1; setOpen(false); },
      }),
    );
  }

  const root = createRoot(container);
  flushSync(() => root.render(React.createElement(Consumer)));
  const target = container.querySelector("#bubble-target");
  target.getBoundingClientRect = () => ({
    left: 20, right: 40, top: 10, bottom: 30,
    width: 20, height: 20, x: 20, y: 10, toJSON() { return {}; },
  });
  flushSync(() => window.dispatchEvent(new Event("resize")));

  const bubble = document.body.querySelector(".kplex-info-bubble");
  check(bubble, "InfoBubble did not portal into the target owner document");
  check(bubble.getAttribute("role") === "note", "InfoBubble needs an accessible informational role");
  const descriptionId = bubble.getAttribute("aria-describedby");
  check(descriptionId && document.getElementById(descriptionId)?.textContent === "Indexing in progress.", "InfoBubble message was not exposed as its description");
  const buttons = [...bubble.querySelectorAll("button")];
  check(buttons.map((button) => button.textContent).join("|") === "Next|Dismiss", "InfoBubble actions changed order or labels");
  flushSync(() => buttons[0].click());
  check(advances === 1, "InfoBubble advance action must delegate exactly once");
  check(document.body.contains(bubble), "Caller-owned advance must not implicitly dismiss the bubble");
  flushSync(() => buttons[1].click());
  check(dismissals === 1, "InfoBubble dismiss action must delegate exactly once");
  check(!document.body.querySelector(".kplex-info-bubble"), "InfoBubble remained after explicit dismissal");

  flushSync(() => root.render(React.createElement(Consumer, { actionless: true, key: "actionless" })));
  const informationalBubble = document.body.querySelector(".kplex-info-bubble");
  check(informationalBubble, "Actionless InfoBubble did not render");
  check(!informationalBubble.querySelector(".kplex-info-bubble-actions"), "Actionless InfoBubble rendered an empty action row");
  check(informationalBubble.querySelectorAll("button").length === 0, "Actionless InfoBubble rendered an unexpected button");

  flushSync(() => root.unmount());
  container.remove();
  outside.remove();
  result.dataset.status = "passed";
  result.textContent = "InfoBubble browser behavior passed";
} catch (error) {
  result.dataset.status = "failed";
  result.textContent = String(error?.stack ?? error);
}
`;
}


function draggableDialogBrowserEntry() {
  return `
import { enableDraggableDialog } from ${JSON.stringify(join(root, "src/ui/components/DraggableDialog.ts"))};

const result = document.querySelector("#result");
const check = (condition, message) => { if (!condition) throw new Error(message); };
const setViewport = (view, width, height) => {
  Object.defineProperty(view, "innerWidth", { configurable: true, value: width });
  Object.defineProperty(view, "innerHeight", { configurable: true, value: height });
  if (view.visualViewport) {
    Object.defineProperty(view.visualViewport, "width", { configurable: true, value: width });
    Object.defineProperty(view.visualViewport, "height", { configurable: true, value: height });
    Object.defineProperty(view.visualViewport, "offsetLeft", { configurable: true, value: 0 });
    Object.defineProperty(view.visualViewport, "offsetTop", { configurable: true, value: 0 });
  }
};
const installStyles = (doc, selector, left, top, width, height) => {
  const style = doc.createElement("style");
  style.textContent = selector + " { position: fixed; left: " + left + "px; top: " + top + "px; width: " + width + "px; height: " + height + "px; box-sizing: border-box; }" +
    ".kplex-draggable-dialog.is-positioned { position: fixed; left: var(--kplex-dialog-left); top: var(--kplex-dialog-top); right: auto; bottom: auto; margin: 0; }";
  doc.head.append(style);
};
const dispatchPointer = (view, target, type, init) => target.dispatchEvent(new view.PointerEvent(type, {
  bubbles: true,
  cancelable: true,
  pointerId: init.pointerId ?? 1,
  button: init.button ?? 0,
  clientX: init.clientX ?? 0,
  clientY: init.clientY ?? 0,
}));

try {
  setViewport(window, 800, 600);
  installStyles(document, ".test-draggable-modal", 250, 180, 300, 200);
  const background = document.createElement("div");
  const modal = document.createElement("div");
  const title = document.createElement("div");
  const titleText = document.createElement("span");
  const roleSelect = document.createElement("select");
  const input = document.createElement("input");
  titleText.textContent = "Add link / child";
  roleSelect.append(new Option("Child", "child"), new Option("Parent", "parent"));
  title.append(titleText, roleSelect);
  modal.className = "test-draggable-modal";
  modal.append(title, input);
  document.body.append(background, modal);

  let backgroundMoves = 0;
  background.addEventListener("pointermove", () => { backgroundMoves += 1; });
  input.value = "preserved form state";
  input.focus();
  const release = enableDraggableDialog({ modalEl: modal, handleEl: title });
  check(modal.classList.contains("kplex-draggable-dialog"), "desktop shell did not opt into draggable positioning");
  check(title.classList.contains("kplex-draggable-dialog-handle"), "dialog title was not marked as the drag handle");

  dispatchPointer(window, titleText, "pointerdown", { pointerId: 7, clientX: 300, clientY: 200 });
  check(document.activeElement === input, "starting a title drag stole form focus");
  check(!modal.classList.contains("is-positioned"), "pointerdown without movement replaced native modal positioning");
  dispatchPointer(window, background, "pointermove", { pointerId: 7, clientX: 900, clientY: 700 });
  check(modal.classList.contains("is-dragging"), "pointer movement did not start dragging");
  check(backgroundMoves === 0, "active dialog drag leaked a pointer move to the Plex/background");
  check(modal.style.getPropertyValue("--kplex-dialog-left") === "492px", "horizontal drag was not clamped inside the viewport");
  check(modal.style.getPropertyValue("--kplex-dialog-top") === "392px", "vertical drag was not clamped inside the viewport");
  check(input.value === "preserved form state", "dragging changed the form state");
  dispatchPointer(window, background, "pointerup", { pointerId: 7, clientX: 900, clientY: 700 });
  check(!modal.classList.contains("is-dragging"), "pointerup did not finish the drag");

  setViewport(window, 500, 350);
  window.dispatchEvent(new Event("resize"));
  check(modal.style.getPropertyValue("--kplex-dialog-left") === "192px", "resize did not keep the dialog's right edge reachable");
  check(modal.style.getPropertyValue("--kplex-dialog-top") === "142px", "resize did not keep the dialog's title/actions reachable");

  const beforeControlPointer = [
    modal.style.getPropertyValue("--kplex-dialog-left"),
    modal.style.getPropertyValue("--kplex-dialog-top"),
  ].join("|");
  dispatchPointer(window, roleSelect, "pointerdown", { pointerId: 8, clientX: 350, clientY: 190 });
  check(!modal.classList.contains("is-dragging"), "interactive title control incorrectly started a drag");
  dispatchPointer(window, background, "pointermove", { pointerId: 8, clientX: 100, clientY: 100 });
  const afterControlPointer = [
    modal.style.getPropertyValue("--kplex-dialog-left"),
    modal.style.getPropertyValue("--kplex-dialog-top"),
  ].join("|");
  check(afterControlPointer === beforeControlPointer, "interactive title control moved the dialog");

  // Interrupted streams must stop swallowing the Plex's later pointer moves, even when no up
  // reaches the owning document. A late capture loss from a different pointer is not cancellation.
  for (const interruption of ["lostpointercapture", "blur"]) {
    dispatchPointer(window, titleText, "pointerdown", { pointerId: 12, clientX: 200, clientY: 150 });
    dispatchPointer(window, background, "pointermove", { pointerId: 12, clientX: 220, clientY: 170 });
    check(modal.classList.contains("is-dragging"), "interrupted-stream fixture did not begin its drag");
    dispatchPointer(window, title, "lostpointercapture", { pointerId: 99 });
    check(modal.classList.contains("is-dragging"), "capture loss from an unrelated pointer retired the active drag");
    const interruptedPosition = modal.style.getPropertyValue("--kplex-dialog-left") + "|" + modal.style.getPropertyValue("--kplex-dialog-top");
    interruption === "blur" ? window.dispatchEvent(new Event("blur")) : dispatchPointer(window, title, "lostpointercapture", { pointerId: 12 });
    check(!modal.classList.contains("is-dragging") && !title.classList.contains("is-dragging"), interruption + " did not terminate active drag state");
    const movesBefore = backgroundMoves;
    dispatchPointer(window, background, "pointermove", { pointerId: 12, clientX: 350, clientY: 220 });
    check(backgroundMoves === movesBefore + 1, interruption + " retained capture-phase interception of later graph movement");
    check(modal.style.getPropertyValue("--kplex-dialog-left") + "|" + modal.style.getPropertyValue("--kplex-dialog-top") === interruptedPosition, interruption + " allowed a retired stream to move its dialog");
    // The native host can still deliver a late end after interruption; it remains harmless.
    dispatchPointer(window, background, "pointerup", { pointerId: 12 });
    dispatchPointer(window, title, "lostpointercapture", { pointerId: 12 });
  }

  release();
  release();
  check(!modal.classList.contains("kplex-draggable-dialog"), "close cleanup left draggable modal classes behind");
  check(!title.classList.contains("kplex-draggable-dialog-handle"), "close cleanup left draggable title classes behind");
  check(!modal.style.getPropertyValue("--kplex-dialog-left") && !modal.style.getPropertyValue("--kplex-dialog-top"), "close cleanup left fixed positioning behind");
  dispatchPointer(window, titleText, "pointerdown", { pointerId: 9, clientX: 300, clientY: 200 });
  check(!modal.classList.contains("is-dragging"), "released dialog still responded to pointerdown");
  setViewport(window, 800, 600);
  const releaseReopened = enableDraggableDialog({ modalEl: modal, handleEl: title });
  check(!modal.classList.contains("is-positioned"), "reopened dialog inherited stale dragged positioning");
  check(!modal.style.getPropertyValue("--kplex-dialog-left"), "reopened dialog did not return positioning ownership to the native modal");
  dispatchPointer(window, titleText, "pointerdown", { pointerId: 10, clientX: 300, clientY: 200 });
  dispatchPointer(window, titleText, "pointerup", { pointerId: 10, clientX: 300, clientY: 200 });
  check(!modal.classList.contains("is-positioned"), "clicking the title without dragging replaced native modal positioning");
  releaseReopened();

  const iframe = document.createElement("iframe");
  document.body.append(iframe);
  const frameDocument = iframe.contentDocument;
  const frameWindow = iframe.contentWindow;
  check(frameDocument && frameWindow, "pop-out test document unavailable");
  setViewport(frameWindow, 600, 400);
  installStyles(frameDocument, ".frame-draggable-modal", 100, 80, 200, 150);
  const frameModal = frameDocument.createElement("div");
  const frameTitle = frameDocument.createElement("div");
  const frameTitleText = frameDocument.createElement("span");
  const frameBackground = frameDocument.createElement("div");
  frameTitleText.textContent = "Pop-out title";
  frameTitle.append(frameTitleText);
  frameModal.className = "frame-draggable-modal";
  frameModal.append(frameTitle);
  frameDocument.body.append(frameBackground, frameModal);
  enableDraggableDialog({ modalEl: frameModal, handleEl: frameTitle });
  dispatchPointer(frameWindow, frameTitleText, "pointerdown", { pointerId: 11, clientX: 130, clientY: 100 });
  const framePinned = frameModal.style.getPropertyValue("--kplex-dialog-left") + "|" + frameModal.style.getPropertyValue("--kplex-dialog-top");
  dispatchPointer(window, background, "pointermove", { pointerId: 11, clientX: 400, clientY: 300 });
  check(frameModal.style.getPropertyValue("--kplex-dialog-left") + "|" + frameModal.style.getPropertyValue("--kplex-dialog-top") === framePinned, "parent-window pointer moved a pop-out dialog");
  window.dispatchEvent(new Event("blur"));
  dispatchPointer(frameWindow, frameBackground, "pointermove", { pointerId: 11, clientX: 400, clientY: 300 });
  check(frameModal.style.getPropertyValue("--kplex-dialog-left") === "370px", "pop-out drag lost ownership to parent-window blur or used the wrong document coordinates");
  check(frameModal.style.getPropertyValue("--kplex-dialog-top") === "242px", "pop-out drag did not clamp against its owning window");
  dispatchPointer(frameWindow, frameBackground, "pointerup", { pointerId: 11, clientX: 400, clientY: 300 });
  frameWindow.dispatchEvent(new frameWindow.Event("pagehide"));
  check(!frameModal.classList.contains("kplex-draggable-dialog"), "pop-out teardown did not release draggable classes");
  check(!frameModal.style.getPropertyValue("--kplex-dialog-left"), "pop-out teardown did not clear positioning");
  iframe.remove();

  result.dataset.status = "passed";
  result.textContent = "DraggableDialog browser behavior passed";
} catch (error) {
  result.dataset.status = "failed";
  result.textContent = String(error?.stack ?? error);
}
`;
}


/** Exercise shared floating-layer drag without duplicating the native helper or host filter content. */
function draggableFloatingLayerBrowserEntry() {
  return `
import React,{useRef,useState} from "react";
import {flushSync} from "react-dom";
import {createRoot} from "react-dom/client";
import {FloatingLayer} from ${JSON.stringify(join(root,"src/ui/components/FloatingLayer.tsx"))};
const result=document.querySelector("#result");
const check=(ok,message)=>{if(!ok)throw new Error(message)};
const pointer=(view,target,type,x,y)=>flushSync(()=>target.dispatchEvent(new view.PointerEvent(type,{bubbles:true,cancelable:true,pointerId:7,button:0,clientX:x,clientY:y,pointerType:"touch"})));
const positioning={preferredWidth:280,minimumWidth:180,viewportMargin:8,anchorGap:6,minimumMaxHeight:120};
try {
 for(const framed of [false,true]) {
  const iframe=framed?document.body.appendChild(document.createElement("iframe")):null;
  const doc=iframe?.contentDocument??document,view=doc.defaultView;
  Object.defineProperty(view,"innerWidth",{configurable:true,value:800});
  Object.defineProperty(view,"innerHeight",{configurable:true,value:600});
  if(view.visualViewport) {
   for(const [key,value] of Object.entries({width:800,height:600,offsetLeft:0,offsetTop:0}))Object.defineProperty(view.visualViewport,key,{configurable:true,value});
  }
  const container=doc.body.appendChild(doc.createElement("div")),outside=doc.body.appendChild(doc.createElement("button"));
  const style=doc.head.appendChild(doc.createElement("style"));style.textContent=".drag-test-panel {height:150px;box-sizing:border-box}.drag-test-header {height:30px;touch-action:none}";
  let anchorLeft=100,dismissals=[],renders=0;
  function Consumer(){
   const [open,setOpen]=useState(false),anchorRef=useRef(null),panelRef=useRef(null),dragHandleRef=useRef(null);
   return React.createElement(React.Fragment,null,
    React.createElement("button",{ref:anchorRef,"data-trigger":true,onClick:()=>setOpen(!open)},"Filters"),
    React.createElement(FloatingLayer,{open,anchorRef,panelRef,dragHandleRef,insideRoots:()=>[anchorRef.current,panelRef.current],onDismiss:reason=>{dismissals.push(reason);setOpen(false)},portalTarget:d=>d.body,positioning},
     panelStyle=>React.createElement("div",{ref:panelRef,className:"drag-test-panel",style:panelStyle},
      React.createElement("div",{ref:dragHandleRef,className:"drag-test-header"},React.createElement("span",null,"Filters and lenses"),React.createElement("button",{"data-header-control":true},"Control")),React.createElement("input",{defaultValue:"preserved"}))))
  }
  const root=createRoot(container),render=()=>flushSync(()=>root.render(React.createElement(Consumer,{revision:++renders})));
  render();const trigger=container.querySelector("[data-trigger]");
  trigger.getBoundingClientRect=()=>({left:anchorLeft,right:anchorLeft+30,top:20,bottom:50,width:30,height:30});
  flushSync(()=>trigger.click());let panel=doc.querySelector(".drag-test-panel"),header=panel.querySelector("span");
  check(panel.ownerDocument===doc&&panel.classList.contains("kplex-draggable-dialog"),"floating panel must bind shared drag to its own document");
  panel.querySelector("input").focus();
  pointer(view,header,"pointerdown",110,60);
  if(framed)pointer(window,document.body,"pointermove",180,100);
  check(!panel.classList.contains("is-positioned"),"parent document cannot move a framed floating panel");
  pointer(view,outside,"pointermove",180,100);pointer(view,outside,"pointerup",180,100);
  check(panel.style.left==="170px"&&panel.style.top==="96px","dragged React inline coordinates must match the shared helper");
  check(doc.activeElement===panel.querySelector("input")&&panel.querySelector("input").value==="preserved","drag must preserve focus and form state");
  anchorLeft=340;flushSync(()=>doc.dispatchEvent(new view.Event("scroll")));render();
  check(panel.style.left==="170px"&&panel.style.top==="96px","scroll and caller rerender must not snap a dragged panel back to its anchor");
  pointer(view,panel.querySelector("[data-header-control]"),"pointerdown",200,100);pointer(view,outside,"pointermove",400,200);
  check(panel.style.left==="170px","interactive header controls must not drag the panel");
  Object.defineProperty(view,"innerWidth",{configurable:true,value:450});
  if(view.visualViewport)Object.defineProperty(view.visualViewport,"width",{configurable:true,value:450});
  flushSync(()=>view.dispatchEvent(new view.Event("resize")));
  check(panel.style.left==="162px","resize must reclamp dragged coordinates in the owning viewport");
  flushSync(()=>doc.dispatchEvent(new view.KeyboardEvent("keydown",{key:"Escape",bubbles:true})));
  check(!doc.querySelector(".drag-test-panel")&&doc.activeElement===trigger&&dismissals.at(-1)==="escape","Escape must close and restore owning-document trigger focus");
  check(!panel.classList.contains("kplex-draggable-dialog")&&!panel.style.getPropertyValue("--kplex-dialog-left"),"closed floating panel must release shared drag state");
  flushSync(()=>trigger.click());panel=doc.querySelector(".drag-test-panel");
  check(panel.style.left==="162px"&&panel.style.top==="56px"&&!panel.classList.contains("is-positioned"),"reopening must reset to its current anchored geometry");
  pointer(view,outside,"pointerdown",0,0);
  check(!doc.querySelector(".drag-test-panel")&&dismissals.at(-1)==="outside-pointer","outside pointer dismissal must still work after dragging");
  flushSync(()=>trigger.click());panel=doc.querySelector(".drag-test-panel");header=panel.querySelector("span");
  pointer(view,header,"pointerdown",170,60);pointer(view,outside,"pointermove",220,100);
  flushSync(()=>view.dispatchEvent(new view.Event("pagehide")));
  check(!panel.classList.contains("kplex-draggable-dialog")&&!panel.classList.contains("is-dragging"),"page teardown must cancel active floating drag");
  const before=panel.style.left;pointer(view,outside,"pointermove",350,200);
  check(panel.style.left===before,"retired owning-document drag listeners cannot move the panel");
  root.unmount();container.remove();outside.remove();style.remove();iframe?.remove();
 }
 result.dataset.status="passed";result.textContent="Draggable floating layer behavior passed";
}catch(error){result.dataset.status="failed";result.textContent=error.stack}
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
  let list = app.querySelector(".kplex-search-results");
  check(list && list.parentElement === app, "toolbar results did not portal inside the app root");
  check([...list.querySelectorAll("button > span")].map((node) => node.textContent).join("|") === "Zulu|Alpha|Mike", "portable suggester reordered caller results");
  check(list.style.left === "50px" && list.style.top === "56px", "toolbar app-relative geometry changed");
  check(toolbarHost.querySelector('[data-testid="slot-icon"]'), "portable icon slot did not render");
  flushSync(() => dispatchPointer(list.querySelector("button")));
  check(app.querySelector(".kplex-search-results"), "inside result pointer was treated as outside");

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
  check(!app.querySelector(".kplex-search-results"), "Escape did not dismiss visible results");
  check(document.activeElement === toolbarInput, "Escape blurred the input");
  check(escape.defaultPrevented && leakedEscape === 0, "Escape leaked to the host shortcut path");

  flushSync(() => type(toolbarInput, "x"));
  check(app.querySelector(".kplex-search-results"), "editing after Escape did not reopen results");
  const outside = document.createElement("button"); document.body.append(outside);
  flushSync(() => dispatchPointer(outside));
  check(document.activeElement !== toolbarInput && !app.querySelector(".kplex-search-results"), "outside pointer did not close and blur");
  focusRequest += 1;
  flushSync(() => toolbarRoot.render(React.createElement(Toolbar)));
  check(document.activeElement === toolbarInput && app.querySelector(".kplex-search-results"), "focusRequest did not focus and reopen toolbar results");
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

  const disclosureRoot = createRoot(modalHost);
  let disclosed = 0;
  let fieldChosen = null;
  function OntologyField() {
    const [value, setValue] = useState("");
    const [browse, setBrowse] = useState(false);
    return React.createElement(FuzzySuggester, {
      value, onChange: (next) => { setBrowse(false); setValue(next); },
      results: browse ? ordered : [], onChoose: (item) => { fieldChosen = item.id; setValue(item.label); },
      getKey: (item) => item.id, getLabel: (item) => item.label, floating: true, floatingMode: "viewport", openResultsOnFocus: false,
      disclosure: { label: "Show all ontology fields", icon: React.createElement("span", null, "v"), onOpen: () => { disclosed += 1; setBrowse(true); } },
    });
  }
  flushSync(() => disclosureRoot.render(React.createElement(OntologyField)));
  modalInput = modalHost.querySelector("input");
  flushSync(() => modalInput.focus());
  check(!document.body.querySelector(".kplex-fuzzy-floating-results"), "empty ontology opened without explicit disclosure");
  const disclosure = modalHost.querySelector(".kplex-fuzzy-disclosure");
  check(disclosure.type === "button" && disclosure.getAttribute("aria-label") === "Show all ontology fields", "disclosure lacks semantic/accessibility contract");
  flushSync(() => disclosure.click());
  list = document.body.querySelector(".kplex-fuzzy-floating-results");
  check(disclosed === 1 && list?.querySelectorAll("button").length === 3 && modalInput.value === "", "disclosure failed to reveal the complete empty-input list");
  check(disclosure.getAttribute("aria-expanded") === "true", "disclosure expanded state missing");
  flushSync(() => key(modalInput, "ArrowDown")); flushSync(() => key(modalInput, "Enter"));
  check(fieldChosen === "a" && modalInput.value === "Alpha" && !document.body.querySelector(".kplex-fuzzy-floating-results"), "disclosure keyboard choice failed");
  flushSync(() => modalInput.focus()); flushSync(() => type(modalInput, "")); flushSync(() => disclosure.click());
  check(document.body.querySelector(".kplex-fuzzy-floating-results")?.querySelectorAll("button").length === 3, "cleared ontology cannot reopen all choices");
  flushSync(() => key(modalInput, "Escape"));
  check(!document.body.querySelector(".kplex-fuzzy-floating-results") && document.activeElement === modalInput, "disclosure Escape did not preserve editable input");
  flushSync(() => disclosureRoot.unmount());

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

/** Model native pre-focus before passive autofocus, preserving typed/requested focus and Escape semantics. */
function fuzzyProgrammaticFocusBrowserEntry() {
  return `
import React, { useLayoutEffect, useState } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { FuzzySuggester } from ${JSON.stringify(join(root, "src/ui/components/FuzzySuggester.tsx"))};
const result=document.querySelector("#result");
const check=(condition,message)=>{if(!condition)throw new Error(message)};
const host=document.body.appendChild(document.createElement("div"));
const type=(input,value)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set.call(input,value);input.dispatchEvent(new Event("input",{bubbles:true}))};
const key=(input,key)=>input.dispatchEvent(new KeyboardEvent("keydown",{key,bubbles:true,cancelable:true}));
let preFocusing=false,blockedFocusEvents=0,focusEvents=0,unmounted=false;const choices=[];
const nativeFocus=(event)=>{if(!host.contains(event.target))return;focusEvents++;if(preFocusing){blockedFocusEvents++;event.stopPropagation();}};
document.addEventListener("focusin",nativeFocus,true);
const root=createRoot(host);
try{
  function Field({preFocus=false,autoFocus=false,focusRequest=0}){
    const [value,setValue]=useState("");
    // Native shells can focus committed DOM before React's passive autofocus effect and consume
    // that focus event. Repeating focus on the already-active input emits no replacement event.
    useLayoutEffect(()=>{if(preFocus){preFocusing=true;host.querySelector("input").focus();preFocusing=false;}},[]);
    return React.createElement(FuzzySuggester,{value,onChange:setValue,results:["Alpha","Beta"],onChoose:item=>choices.push(item),getKey:String,getLabel:String,
      placeholder:"Search related notes",ariaLabel:"Related notes",openResultsOnFocus:false,floating:true,floatingMode:"viewport",autoFocus,focusRequest});
  }
  const render=(id,props)=>flushSync(()=>root.render(React.createElement(Field,{key:id,...props})));
  const list=()=>document.body.querySelector(".kplex-fuzzy-floating-results");
  render("pre-focused",{preFocus:true,autoFocus:true});let input=host.querySelector("input");
  check(document.activeElement===input&&blockedFocusEvents===1&&focusEvents===1,"host did not pre-focus without a fresh React focus event");
  check(!list()&&input.getAttribute("aria-expanded")==="false","autofocus opened a typing-only list");
  flushSync(()=>type(input,"Alpha"));check(list()?.querySelectorAll("button").length===2&&input.getAttribute("aria-expanded")==="true","pre-focused autofocus lost typed suggestions");
  flushSync(()=>key(input,"Escape"));check(!list()&&input.value==="Alpha"&&document.activeElement===input,"Escape lost the retained editable focus/query");
  const eventsBeforeRequest=focusEvents;render("pre-focused",{preFocus:true,autoFocus:true,focusRequest:1});
  check(focusEvents===eventsBeforeRequest&&!list(),"same-input request required a fresh focus event or opened before typing");
  flushSync(()=>type(input,"Beta"));check(list(),"explicit request failed to reopen typed suggestions after Escape");
  flushSync(()=>key(input,"Enter"));check(choices.length===1&&choices[0]==="Alpha"&&!list()&&document.activeElement!==input,"normal selection did not close/blur its focus lifetime");
  render("normal-autofocus",{autoFocus:true});input=host.querySelector("input");
  check(document.activeElement===input&&!list(),"normal autofocus changed typing-only policy");flushSync(()=>type(input,"Alpha"));check(list(),"normal autofocus lost typing");
  render("normal-request",{});input=host.querySelector("input");check(document.activeElement!==input&&!list(),"an unrequested field acquired focus");
  render("normal-request",{focusRequest:1});check(document.activeElement===input&&!list(),"normal request did not focus without premature suggestions");
  flushSync(()=>type(input,"Beta"));check(list(),"normal focus request lost typing");flushSync(()=>key(input,"Escape"));check(!list()&&document.activeElement===input,"normal requested Escape lost focus");
  flushSync(()=>root.unmount());unmounted=true;check(!list(),"programmatic-focus portal survived unmount");
  result.dataset.status="passed";result.textContent="Fuzzy programmatic focus behavior passed";
}catch(error){result.dataset.status="failed";result.textContent=String(error?.stack??error);}
finally{document.removeEventListener("focusin",nativeFocus,true);if(!unmounted)flushSync(()=>root.unmount());}
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
  const rows = () => [...host.querySelectorAll(".kplex-search-result")];
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

/** Exercise the canonical composer selection and disclosure with production React mechanics. */
function relatedComposerBrowserEntry() {
  const source = ts.createSourceFile("NewRelatedNoteModal.ts", readFileSync(join(root, "src/ui/NewRelatedNoteModal.ts"), "utf8"), ts.ScriptTarget.Latest, true);
  const functions = source.statements.filter((statement) => ts.isFunctionDeclaration(statement)
    && ["RelatedNoteComposer", "isNoteTarget"].includes(statement.name?.text)).map((statement) => statement.getText(source)).join("\n");
  const production = ts.transpileModule(functions, { compilerOptions: { target: ts.ScriptTarget.ES2021, module: ts.ModuleKind.None } }).outputText;
  return `
import React, { createElement, useEffect, useMemo, useState } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { FuzzySuggester } from ${JSON.stringify(join(root, "src/ui/components/FuzzySuggester.tsx"))};
import { SavedRelationshipPendingError } from ${JSON.stringify(join(root, "src/adapters/obsidian/relationshipMetadataWrite.ts"))};
const FuzzySearchInput = (props) => createElement(FuzzySuggester, { ...props, icon: null });
const ObsidianIcon = ({ name }) => createElement("span", null, name);
const fuzzyFilterStrings = (values, query, limit) => values.filter((value) => !query || value.includes(query)).slice(0, limit);
const notices = []; class Notice { constructor(message) { notices.push(message); } }
${production}
(async () => {
 const result = document.querySelector("#result");
 const check = (condition, message) => { if (!condition) throw new Error(message); };
 const type = (input, value) => {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
 };
 try {
  const host = document.createElement("div"); document.body.append(host);
  const origin = { path: "Origin.md", file: { extension: "md" } }; const target = { path: "Target.md", file: { extension: "md" } };
  const intents = []; let commits = 0; let closes = 0; let rejectCommit = true; let savedPending = false;
  const plugin = {
   settings: { editNewNodeAfterCreate: false, newNodeDefaultType: "markdown" },
   translator: (key) => key, isExcalidrawAvailable: () => false, defaultOntologyField: () => "children",
   ontologyFieldsForRole: () => ["children", "review", "example"],
   validateRelatedNoteName: () => ({ valid: true, existing: false, stem: "Target" }),
   index: { search: () => [target], titleFor: (page) => page.path },
   rememberRelationshipOntology: async (_role, field) => field,
   createRelationToPage: async (...args) => { if (savedPending) throw new SavedRelationshipPendingError("Saved; graph pending"); if (rejectCommit) throw new Error("not ready"); intents.push(args); },
   requestNodeFlair: () => {},
  };
  const root = createRoot(host);
  flushSync(() => root.render(createElement(RelatedNoteComposer, { plugin, origin, initialRole: "child", onCommitted: () => { commits += 1; }, onClose: () => { closes += 1; } })));
  const input = host.querySelector(".kplex-add-related-note-search input");
  flushSync(() => input.focus()); flushSync(() => type(input, "Target"));
  let list = document.body.querySelector(".kplex-fuzzy-floating-results");
  check(list, "existing-target suggestions did not open");
  flushSync(() => list.querySelector("button").click());
  const link = host.querySelector(".kplex-add-related-link-button");
  check(link && input.value === "Target.md", "existing selection was not retained as explicit Link action");
  const ontology = host.querySelector(".kplex-add-related-ontology-search input");
  flushSync(() => ontology.focus()); flushSync(() => type(ontology, ""));
  flushSync(() => host.querySelector(".kplex-fuzzy-disclosure").click());
  list = document.body.querySelector(".kplex-fuzzy-floating-results");
  check(list?.querySelectorAll("button").length === 3, "composer disclosure did not show full empty-input role vocabulary");
  flushSync(() => list.querySelector('[data-kplex-fuzzy-index="1"]').click());
  check(ontology.value === "review" && host.querySelector(".kplex-add-related-link-button"), "ontology choice lost the existing-target selection");
  flushSync(() => link.click()); await new Promise((resolve) => setTimeout(resolve, 0));
  check(commits === 0 && closes === 0 && notices.length === 1, "failed existing-target write falsely committed or closed composer");
  rejectCommit = false; savedPending = true;
  flushSync(() => link.click()); await new Promise((resolve) => setTimeout(resolve, 0));
  check(commits === 0 && closes === 0 && notices.at(-1) === "Saved; graph pending", "saved-pending outcome was wrapped as an unsaved failure or closed the composer");
  savedPending = false;
  flushSync(() => link.click()); await new Promise((resolve) => setTimeout(resolve, 0));
  check(intents.length === 1 && intents[0][0] === origin && intents[0][1] === "child" && intents[0][2] === target && intents[0][3] === "review", "existing Link lost ontology, endpoint or role");
  check(commits === 1 && closes === 1, "successful explicit Link did not commit/close once");
  // History/menu fixed targets must enter the same composer with an immediately retained Link action.
  rejectCommit = false; commits = 0; closes = 0; intents.length = 0;
  flushSync(() => root.render(createElement(RelatedNoteComposer, { key: "fixed-target", plugin, origin, initialRole: "right", fixedTarget: target, onCommitted: () => { commits += 1; }, onClose: () => { closes += 1; } })));
  check(host.querySelector(".kplex-add-related-note-search input").value === "Target.md", "fixed history target did not initialize the existing selection");
  flushSync(() => host.querySelector(".kplex-add-related-link-button").click());
  await new Promise((resolve) => setTimeout(resolve, 0));
  check(intents.length === 1 && intents[0][1] === "right" && intents[0][2] === target && commits === 1 && closes === 1, "history fixed target did not commit through the shared Link action");
  flushSync(() => root.unmount());
  check(!document.body.querySelector(".kplex-fuzzy-floating-results"), "composer list survived unmount");
  result.dataset.status = "passed"; result.textContent = "Related composer browser behavior passed";
 } catch (error) { result.dataset.status = "failed"; result.textContent = String(error?.stack ?? error); }
})();
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

test("InfoBubble rendered browser behavior", () => {
  runBrowserDom(infoBubbleBrowserEntry(), "InfoBubble browser behavior passed");
});

test("DraggableDialog owner-document browser behavior", () => {
  runBrowserDom(draggableDialogBrowserEntry(), "DraggableDialog browser behavior passed");
});

test("Draggable floating layer retains placement and owns cleanup in main and framed documents",()=>{
 runBrowserDom(draggableFloatingLayerBrowserEntry(),"Draggable floating layer behavior passed");
});


test("FuzzySuggester production browser behavior", () => {
  runBrowserDom(fuzzySuggesterBrowserEntry(), "FuzzySuggester browser behavior passed");
});

/** Host pre-focus must not leave the shared field's React focus state behind its DOM state. */
test("FuzzySuggester programmatic focus after native host pre-focus",()=>{
  runBrowserDom(fuzzyProgrammaticFocusBrowserEntry(),"Fuzzy programmatic focus behavior passed");
});

test("SearchBox plain read model and revision browser behavior", () => {
  runBrowserDom(graphSearchBrowserEntry(), "Graph search read consumer behavior passed");
});

/** Isolate named production UI callbacks/components while retaining their actual DOM/action behavior. */
function uiDefinitions(path, names) {
  const source=ts.createSourceFile(path,readFileSync(join(root,path),"utf8"),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),definitions=[];
  /** Visit nested view callbacks without importing its native plugin shell into the browser fixture. */
  function visit(node){
    if(ts.isVariableDeclaration(node)&&names.includes(node.name.getText(source)))definitions.push(`const ${node.name.getText(source)} = ${node.initializer.getText(source)};`);
    if(ts.isFunctionDeclaration(node)&&names.includes(node.name?.text))definitions.push(node.getText(source).replace(/^export /,""));
    ts.forEachChild(node,visit);
  }
  visit(source);
  assert.equal(definitions.length,names.length,"Each selected production owner must be present");
  return ts.transpileModule(definitions.join("\n"),{compilerOptions:{target:ts.ScriptTarget.ES2021,module:ts.ModuleKind.None,jsx:ts.JsxEmit.React}}).outputText;
}

/** Native-free real DOM checks for history targeting/cancellation and the center's shared menu button. */
function editorHistoryBrowserEntry(){
  const history=uiDefinitions("src/ui/PlexGraph.tsx",["normalizedRole","startNodeDrag","relationshipDropRoles","historyRelationshipTarget","clearHistoryDragHover","updateHistoryDragHover","cancel","lostPointerCapture"]);
  const editor=uiDefinitions("src/ui/CentralNodeEditor.tsx",["CentralNodeEditor"]);
  return `
import React,{useEffect,useLayoutEffect,useRef,useState} from "react";
import {flushSync} from "react-dom";
import {createRoot} from "react-dom/client";
const check=(ok,message)=>{if(!ok)throw new Error(message)},result=document.querySelector("#result");
const ObsidianIcon=({name})=>React.createElement("span",null,name),EmbeddedWebPage=()=>React.createElement("div",null,"Web guest"),urlEmbed=url=>({url});
${editor}
try{
 const button=document.body.appendChild(document.createElement("button"));button.dataset.kplexHistoryPath="Target.md";button.textContent="Target";
 button.style.cssText="position:absolute;left:100px;top:100px;width:100px;height:40px";
 const target={path:"Target.md",file:{extension:"md"}},origin={path:"Origin.md",file:{extension:"md"}},index={get:path=>path===target.path?target:undefined,gateNeighbourPaths:()=>new Set()},historyDragHover={current:null};
 let drag={pointerId:7},connectDrag=drag,nodeDrag=null;
 const touchDoubleTap={current:{reset(){}}},areaSettingsDismissPointer={current:null},areaResizeDrag={current:null},pendingGateLongPress={current:null},panDrag={current:null};
 let relocatedRow=null;
 const touchLongPress={current:null},setNodeDrag=value=>{nodeDrag=value;if(value?.path&&relocatedRow)relocatedRow.remove()};let resizeFinishes=0,areaClears=0;
 const viewport={current:null},neighborhood={center:origin},renderedNodeMap=new Map(),toWorld=(x,y)=>({x,y});
 const finishAreaResize=()=>{resizeFinishes++;return true},setAreaHoverIfChanged=()=>areaClears++;
 const setConnectDrag=value=>{connectDrag=value},clearHoverIntent=()=>{};
 ${history}
 const point=button.getBoundingClientRect(),x=point.left+10,y=point.top+10;
 updateHistoryDragHover(origin,x,y,document);check(button.classList.contains("is-relationship-drop-target"),"eligible historical endpoint not highlighted");
 updateHistoryDragHover(origin,1,1,document);check(!button.classList.contains("is-relationship-drop-target"),"leaving the endpoint retained hover");
 target.isTag=true;updateHistoryDragHover(origin,x,y,document);check(!button.classList.contains("is-relationship-drop-target"),"ineligible tag history endpoint highlighted");delete target.isTag;
 updateHistoryDragHover(target,x,y,document);check(!button.classList.contains("is-relationship-drop-target"),"self history endpoint highlighted");
 updateHistoryDragHover(origin,x,y,document);cancel({pointerId:7,pointerType:"mouse"});check(connectDrag===null&&!button.classList.contains("is-relationship-drop-target"),"real pointer cancellation retained highlight or drag");
 const viewportElement=document.body.appendChild(document.createElement("div")),gateElement=viewportElement.appendChild(document.createElement("span"));
 viewport.current=viewportElement;
 let capturedPointer=null;const captured=[];viewportElement.setPointerCapture=id=>{capturedPointer=id;captured.push({owner:viewportElement,id})};viewportElement.hasPointerCapture=id=>id===capturedPointer;
 gateElement.setPointerCapture=id=>captured.push({owner:gateElement,id});
 const bodyNode={role:"parent",page:origin,x:20,y:30};relocatedRow=gateElement;
 gateElement.addEventListener("pointerdown",event=>startNodeDrag(bodyNode,event));
 gateElement.dispatchEvent(new PointerEvent("pointerdown",{bubbles:true,pointerId:6,pointerType:"mouse",button:0,clientX:25,clientY:35}));
 check(!gateElement.isConnected&&nodeDrag?.path===origin.path,"Fixture did not move the original row into a floating layer");
 check(captured.length===1&&captured[0].owner===viewportElement&&captured[0].id===6,"Body drag captured its removed overflow row instead of the stable viewport");
 relocatedRow=null;nodeDrag=null;viewportElement.append(gateElement);
 viewportElement.addEventListener("lostpointercapture",lostPointerCapture);
 connectDrag={pointerId:7};updateHistoryDragHover(origin,x,y,document);
 gateElement.dispatchEvent(new PointerEvent("lostpointercapture",{bubbles:true,pointerId:9,pointerType:"mouse"}));
 check(connectDrag!==null&&button.classList.contains("is-relationship-drop-target"),"another child capture cancelled this relationship drag");
 gateElement.dispatchEvent(new PointerEvent("lostpointercapture",{bubbles:true,pointerId:7,pointerType:"mouse"}));
 check(connectDrag===null&&!button.classList.contains("is-relationship-drop-target"),"gate-owned capture loss retained history hover or connector drag");
 nodeDrag={pointerId:8};capturedPointer=8;updateHistoryDragHover(origin,x,y,document);
 gateElement.dispatchEvent(new PointerEvent("lostpointercapture",{bubbles:true,pointerId:8,pointerType:"mouse"}));
 check(nodeDrag!==null&&button.classList.contains("is-relationship-drop-target"),"retired child loss cancelled a newer viewport-owned node drag");
 capturedPointer=null;viewportElement.dispatchEvent(new PointerEvent("lostpointercapture",{bubbles:true,pointerId:8,pointerType:"mouse"}));
 check(nodeDrag===null&&!button.classList.contains("is-relationship-drop-target"),"actual viewport capture loss retained history hover or node drag");
 delete button.dataset.kplexHistoryPath;button.dataset.kplexPinnedPath=target.path;
 connectDrag={pointerId:7};updateHistoryDragHover(origin,x,y,document,"parent");cancel({pointerId:7,pointerType:"mouse"});
 check(connectDrag===null&&!button.classList.contains("is-relationship-drop-target"),"pinned pointer cancellation retained drag highlight");
 nodeDrag={pointerId:8};updateHistoryDragHover(origin,x,y,document);viewportElement.dispatchEvent(new PointerEvent("lostpointercapture",{bubbles:true,pointerId:8,pointerType:"mouse"}));
 check(nodeDrag===null&&!button.classList.contains("is-relationship-drop-target"),"pinned node capture loss retained drag highlight");
 check(resizeFinishes===0,"child-owned captures completed viewport area resize");
 viewportElement.dispatchEvent(new PointerEvent("lostpointercapture",{bubbles:true,pointerId:10,pointerType:"mouse"}));
 check(resizeFinishes===1&&areaClears===1,"viewport-owned resize lost its capture completion");
 const container=document.body.appendChild(document.createElement("div")),root=createRoot(container),opened=[],page={path:"https://example.com",url:"https://example.com",name:"Example"};
 const props={plugin:{},hostLeaf:{},page,defaultMode:"preview",allowMaximize:true,activateHostLeafOnInteraction:false,onModeChange(){},onMaximizedChange(){},onCollapse(){},onNavigate(){},translate:key=>key,onOpenMenu:button=>opened.push(button)};
 for(const maximized of [false,true]){
  flushSync(()=>root.render(React.createElement(CentralNodeEditor,{...props,maximized})));
  const menu=container.querySelector('[aria-label="graph.openMenu"]');check(menu instanceof HTMLButtonElement&&menu.type==="button","editor menu button missing or nonsemantic");
  check(menu.textContent==="ellipsis-vertical"&&!menu.hasAttribute("title"),"shared menu icon/accessibility changed");
  check(menu.parentElement.querySelector("button:last-child")===menu,"shared menu must be the final button in both editor sizes");
  flushSync(()=>menu.click());check(opened[opened.length-1]===menu&&menu.ownerDocument===document,"editor menu did not retain actual owning button/document");
 }
 check(opened.length===2,"normal and maximized editor must delegate once each");flushSync(()=>root.unmount());clearHistoryDragHover();
 result.dataset.status="passed";result.textContent="Editor menu and history target browser behavior passed";
}catch(error){result.dataset.status="failed";result.textContent=error.stack;}
`;
}

/** Exercise production fixed-target routing with real DOM hit tests and the actual host file-drag adapter. */
function externalAndPinnedDropBrowserEntry() {
  const callbacks = uiDefinitions("src/ui/PlexGraph.tsx", ["normalizedRole", "semanticRoleForGate", "toWorld", "isAreaControlTarget", "isEmptyAreaTarget", "areaHoverAt",
    "relationshipDropRoles", "historyRelationshipTarget", "clearHistoryDragHover", "updateHistoryDragHover", "openHistoryRelationshipMenu",
    "externalFileDropTarget", "dragExternalFileOver", "leaveExternalFile", "dropExternalFile", "semanticRoleForPosition", "relationshipDropArea", "up"]);
  return `
import {getDraggedFile} from ${JSON.stringify(join(root,"src/adapters/obsidian/fileExplorerDrag.ts"))};
const check=(ok,message)=>{if(!ok)throw new Error(message)},result=document.querySelector("#result");
try {
 const origin={path:"Origin.md",file:{extension:"md"}},target={path:"Dropped.md",file:{extension:"md"}};
 const pages=new Map([[origin.path,origin],[target.path,target]]),filePaths=new Set([origin.path,target.path]),blocked=new Map();
 const index={get:path=>pages.get(path),gateNeighbourPaths:(page,gate)=>blocked.get(gate)||new Set()};
 const calls=[],navigated=[],hostLeaf={id:"owning-leaf"};let shown=null;
 const plugin={app:{dragManager:{draggable:{type:"file",file:{path:target.path}}},vault:{getFileByPath:path=>filePaths.has(path)?{path}:null}},
  openRelationModal:options=>calls.push(options),showKplexMenuAtPosition:(menu,point,doc)=>{shown={menu,point,doc}}};
 const translate=key=>key,clearHoverIntent=()=>{},onActivate=page=>navigated.push(page);
 class Menu {items=[];addItem(build){const item={setTitle(value){this.title=value;return this},setIcon(){return this},onClick(value){this.run=value;return this}};build(item);this.items.push(item)}}
 const surface=document.body.appendChild(document.createElement("div"));surface.style.cssText="position:absolute;left:0;top:0;width:900px;height:650px";
 const viewport={current:surface},camera={current:{x:0,y:0,scale:1}},neighborhood={center:origin},historyDragHover={current:null};
 let connectDrag=null,nodeDrag=null,externalDropZone=null;const setExternalDropZone=value=>{externalDropZone=value};const areaResizeDrag={current:null},pendingGateLongPress={current:null},touchLongPress={current:null},suppressActivateUntil={current:0};
 const finishAreaSettingsDismiss=()=>{},setConnectDrag=value=>{connectDrag=value},setNodeDrag=value=>{nodeDrag=value},renderedNodeMap=new Map();
 const scene={zoneAreas:{parent:{left:300,top:60,width:110,height:100,resizeEdge:"top"},child:{left:450,top:60,width:110,height:100,resizeEdge:"bottom"},left:{left:300,top:230,width:110,height:100,resizeEdge:"top"},right:{left:450,top:230,width:110,height:100,resizeEdge:"top"}}};
 const ZONES=["parent","child","left","right","sibling"],AREA_RESIZE_EDGE_PX=10;
 ${callbacks}
 const center=surface.appendChild(document.createElement("div"));center.className="kplex-thought kplex-role-center";center.dataset.kplexPath=origin.path;center.style.cssText="position:absolute;left:60px;top:60px;width:100px;height:100px";
 const other=surface.appendChild(document.createElement("div"));other.className="kplex-thought";other.dataset.kplexPath="Other.md";other.style.cssText="position:absolute;left:320px;top:100px;width:40px;height:30px";
 const control=surface.appendChild(document.createElement("button"));control.style.cssText="position:absolute;left:460px;top:100px;width:40px;height:30px";
 const editor=surface.appendChild(document.createElement("div"));editor.className="kplex-central-editor-overlay";editor.style.cssText="position:absolute;left:60px;top:200px;width:100px;height:100px";
 const event=(x,y)=>({clientX:x,clientY:y,currentTarget:surface,prevented:false,stopped:false,dataTransfer:{dropEffect:"move"},preventDefault(){this.prevented=true},stopPropagation(){this.stopped=true}});
 let e=event(90,90);dropExternalFile(e);check(e.stopped&&navigated[0]===target&&calls.length===0,"actual center did not navigate the resolved dropped file");
 e=event(90,240);dropExternalFile(e);check(navigated.length===2,"center editor overlay did not navigate");
 for(const [role,area] of Object.entries(scene.zoneAreas)) {
  const x=area.left+10,y=area.top+10; e=event(x,y);dragExternalFileOver(e);check(e.dataTransfer.dropEffect==="copy"&&e.stopped&&externalDropZone===role,"eligible area did not accept/highlight drag: "+role);
  leaveExternalFile(event(x+1,y+1));check(externalDropZone===role,"child-to-child leave blinked preview");
  dropExternalFile(e);check(externalDropZone===null,"drop retained area preview");const call=calls.at(-1);check(call.origin===origin&&call.fixedTarget===target&&call.semanticRole===role&&call.hostLeaf===hostLeaf,"rendered semantic area role lost: "+role);
 }
 dragExternalFileOver(event(310,70));leaveExternalFile(event(901,70));check(externalDropZone===null,"outside leave retained preview");
 dragExternalFileOver(event(310,70));dragExternalFileOver(event(90,90));check(externalDropZone==="center"&&relationshipDropArea()==="center","center navigation did not preview its target");
 dragExternalFileOver(event(650,350));check(externalDropZone==="center","background navigation fallback did not preview the center");
 externalDropZone=null;
 e=event(330,110);dropExternalFile(e);check(calls.at(-1).origin===origin&&calls.at(-1).fixedTarget===target&&calls.at(-1).semanticRole==="parent","area node body changed center-origin drop meaning");
 const count=calls.length,nav=navigated.length;
 e=event(470,110);dropExternalFile(e);check(e.stopped&&calls.length===count&&navigated.length===nav,"area control triggered a drop");
 other.style.setProperty("left","600px");other.style.setProperty("top","230px");e=event(610,240);dropExternalFile(e);check(e.stopped&&calls.length===count&&navigated.length===nav,"out-of-area unrelated node triggered a drop");
 e=event(650,350);dropExternalFile(e);check(!e.stopped&&!e.prevented,"background navigation fallback was consumed");
 e=event(10000,10000);dropExternalFile(e);check(!e.stopped&&!e.prevented,"outside navigation fallback was consumed");
 blocked.set("top",new Set([target.path]));e=event(310,70);dragExternalFileOver(e);check(e.dataTransfer.dropEffect==="none"&&externalDropZone===null,"duplicate area role accepted/highlighted");dropExternalFile(e);check(calls.length===count,"duplicate area role opened composer");blocked.clear();
 const pinned=document.body.appendChild(document.createElement("button"));pinned.dataset.kplexPinnedPath=target.path;pinned.style.cssText="position:absolute;left:20px;top:350px;width:100px;height:35px";
 const label=pinned.appendChild(document.createElement("span"));label.textContent="Pinned note";
 for(const role of ["parent","child","left","right"]) {updateHistoryDragHover(origin,40,365,document,role);check(pinned.classList.contains("is-relationship-drop-target"),"pinned role highlight missing");check(openHistoryRelationshipMenu(origin,40,365,document,role),"pinned fixed gate role rejected");check(calls.at(-1).semanticRole===role&&calls.at(-1).fixedTarget===target,"pinned fixed target/role lost");}
 blocked.set("left",new Set([target.path]));updateHistoryDragHover(origin,40,365,document,"left");check(!pinned.classList.contains("is-relationship-drop-target"),"blocked pinned gate retained highlight");
 check(openHistoryRelationshipMenu(origin,40,365,document),"pinned body chooser rejected");check(shown.doc===document&&shown.menu.items.length===3&&!shown.menu.items.some(item=>item.title==="role.friend"),"body chooser did not filter canonical duplicate role");shown.menu.items[0].run();check(calls.at(-1).fixedTarget===target,"body chooser lost fixed endpoint");
 target.file={extension:"png"};check(relationshipDropRoles(origin,target).length===3,"Markdown origin cannot link attachment endpoint");origin.file={extension:"png"};check(relationshipDropRoles(origin,target).length===0,"two non-Markdown endpoints incorrectly writable");origin.file={extension:"md"};target.file={extension:"md"};
 for(const flag of ["isFolder","isTag"]) {target[flag]=true;check(!historyRelationshipTarget(origin,40,365,document),"structural pinned endpoint accepted");delete target[flag];}
 check(!historyRelationshipTarget(target,40,365,document),"pinned self endpoint accepted");
 const rejectCount=calls.length;target.isFolder=true;connectDrag={pointerId:21,originPath:origin.path,gate:"top",moved:true};up({...event(40,365),pointerId:21,pointerType:"mouse"});
 check(connectDrag===null&&calls.length===rejectCount,"rejected pinned gate fell through into empty composer");delete target.isFolder;
 scene.nodes=[{page:target,role:"parent"}];nodeDrag={pointerId:22,path:target.path,startClientX:0,startClientY:0,moved:true};
 const touchDoubleTap={current:{reset(){}}},NODE_RELINK_MIN_DRAG_PX=36,NODE_RELINK_HYSTERESIS_PX=48;up({...event(40,365),pointerId:22,pointerType:"mouse"});
 check(nodeDrag===null&&calls.length===rejectCount,"rejected pinned body fell through into spatial relink");
 updateHistoryDragHover(origin,40,365,document);updateHistoryDragHover(origin,800,600,document);check(!pinned.classList.contains("is-relationship-drop-target"),"leaving pinned endpoint retained highlight");
 const frame=document.body.appendChild(document.createElement("iframe"));frame.style.cssText="position:absolute;left:650px;top:20px;width:200px;height:100px";
 const doc=frame.contentDocument,foreign=doc.body.appendChild(doc.createElement("button"));foreign.dataset.kplexPinnedPath=target.path;foreign.textContent="Other document";
 const rect=foreign.getBoundingClientRect();check(openHistoryRelationshipMenu(origin,rect.left+2,rect.top+2,doc),"owning document pinned hit rejected");check(shown.doc===doc,"chooser escaped owning document");updateHistoryDragHover(origin,rect.left+2,rect.top+2,doc);clearHistoryDragHover();check(!foreign.classList.contains("is-relationship-drop-target"),"owning document highlight leaked");
 // Preview uses the production relink hysteresis and exact fixed/inverse gate semantics.
 scene.nodes=[{page:target,role:"left"}];camera.current={x:450,y:200,scale:1};
 nodeDrag={path:target.path,x:0,y:-100,offsetX:0,offsetY:0,startClientX:100,startClientY:300,moved:true};
 check(relationshipDropArea()==="parent","body parent action did not preview its area");
 nodeDrag.y=100;check(relationshipDropArea()==="child","body child action did not preview its area");
 nodeDrag.x=-250;nodeDrag.y=0;check(relationshipDropArea()===null,"unchanged body role highlighted");
 nodeDrag.x=0;nodeDrag.y=-100;nodeDrag.startClientX=450;nodeDrag.startClientY=100;check(relationshipDropArea()===null,"sub-threshold body drag highlighted");
 nodeDrag=null;camera.current={x:0,y:0,scale:1};
 plugin.inverseGateRole=role=>({parent:"child",child:"parent",left:"right",right:"left"}[role]);
 connectDrag={originPath:origin.path,gate:"top",current:{x:700,y:300},moved:true};
 check(relationshipDropArea()==="parent","fixed gate action changed with pointer quadrant");
 connectDrag.current={x:470,y:110};check(relationshipDropArea()===null,"control retained gate preview");
 connectDrag.current={x:40,y:365};check(relationshipDropArea()===null,"pinned target retained area preview");
 connectDrag.current={x:1000,y:700};check(relationshipDropArea()===null,"outside pointer retained gate preview");
 other.style.setProperty("left","320px");other.style.setProperty("top","100px");other.dataset.kplexPath=target.path;other.dataset.kplexGate="left";
 connectDrag.current={x:330,y:110};check(relationshipDropArea()==="right","hovered gate inverse role missing");
 target.isFolder=true;check(relationshipDropArea()===null,"structural endpoint highlighted");delete target.isFolder;
 connectDrag=null;check(relationshipDropArea()===null,"cancel retained area preview");
 pages.delete(target.path);e=event(90,90);dragExternalFileOver(e);check(externalDropZone==="center","unindexed center did not preview queued navigation");e=event(90,90);dropExternalFile(e);check(!e.stopped,"unindexed center drop lost App readiness fallback");
 result.dataset.status="passed";result.textContent="External and pinned drop behavior passed";
}catch(error){result.dataset.status="failed";result.textContent=String(error.stack||error)}
`;
}

test("External file areas and pinned relationship targets use shared production routing",()=>{
  const app=readFileSync(join(root,"src/ui/App.tsx"),"utf8");
  assert.match(app, /className="kplex-pinned-open" data-kplex-pinned-path=\{pinned.path\}/);
  runBrowserDom(externalAndPinnedDropBrowserEntry(),"External and pinned drop behavior passed");
});

/** Exercise the production glow and shared CSS across covered/clipped areas and both host themes. */
function dropPreviewAndControlsBrowserEntry() {
  return `
import React from "react";
import {flushSync} from "react-dom";
import {createRoot} from "react-dom/client";
import {DropAreaPreview} from ${JSON.stringify(join(root,"src/ui/components/DropAreaPreview.tsx"))};
const check=(ok,message)=>{if(!ok)throw new Error(message)},result=document.querySelector("#result");
const css=document.head.appendChild(document.createElement("style"));css.textContent=${JSON.stringify(readFileSync(join(root,"styles.css"),"utf8"))};
try {
 const host=document.body.appendChild(document.createElement("div"));host.className="kplex-view-host";
 const app=host.appendChild(document.createElement("div"));app.className="kplex-app";
 app.style.cssText="position:absolute;left:0;top:0;width:420px;height:350px";
 app.innerHTML='<div class="kplex-find"><button id="find">F</button></div><div class="kplex-zoom-controls"><button id="zoom">Z</button></div><button id="config" class="kplex-layout-toggle">C</button><button id="filter" class="kplex-zone-filter-button">A</button><div class="kplex-sidecar-controls"><button id="sidecar">S</button></div><div class="kplex-central-editor-toolbar"><button id="editor">E</button></div>';
 const detached=document.body.appendChild(document.createElement("button"));detached.id="unfold";detached.className="kplex-sidecar-unfold-plex";
 const properties=["width","height","padding","color","backgroundColor","borderTopWidth","borderTopColor","borderRadius","boxShadow"];
 for(const dark of [false,true]) {
  document.body.className=dark?"theme-dark":"theme-light";document.body.style.setProperty("--interactive-accent","#7c5cff");document.body.style.setProperty("--text-accent","#7c5cff");
  const expected=getComputedStyle(app.querySelector("#zoom"));
  for(const id of ["find","config","filter","sidecar","editor","unfold"]) {
   const button=document.querySelector("#"+id),style=getComputedStyle(button);
   for(const property of properties)check(style[property]===expected[property],"Control style differs: "+id+"/"+property+"/dark="+dark);
  }
  const filter=app.querySelector("#filter");filter.classList.add("is-on");check(getComputedStyle(filter).borderTopColor==="rgb(124, 92, 255)","Active filter lost shared accent");filter.classList.remove("is-on");
 }
 const viewport=app.appendChild(document.createElement("div"));viewport.className="kplex-plex";
 viewport.innerHTML='<div class="kplex-camera" style="transform:translate(0px,0px)"><div class="kplex-nodes"><div class="kplex-zone-panel" style="left:0;top:50px;width:420px;height:250px;background:black"><button id="drop-underlay" style="position:absolute;left:350px;top:30px;width:70px;height:120px">Drop target</button></div></div></div>';
 const overflowZone=viewport.appendChild(document.createElement("div"));overflowZone.className="kplex-zone-panel";overflowZone.style.cssText="left:180px;top:230px;width:100px;height:80px";
 overflowZone.innerHTML='<div class="kplex-zone-scroll"><div class="kplex-zone-content">Clipped rows</div></div><div class="kplex-zone-tools"><input class="kplex-zone-filter-input"><span class="kplex-zone-filter-control"><button class="kplex-zone-filter-button">F</button></span></div>';
 const field=overflowZone.querySelector("input"),fr=field.getBoundingClientRect(),zr=overflowZone.getBoundingClientRect();
 check(fr.left<zr.left&&fr.width===150&&getComputedStyle(overflowZone).overflow==="visible","Filter must overflow its narrow panel at its full width: "+JSON.stringify({left:fr.left,panel:zr.left,width:fr.width,overflow:getComputedStyle(overflowZone).overflow}));
 check(getComputedStyle(overflowZone.querySelector(".kplex-zone-scroll")).overflowX==="hidden","Overflowing controls must preserve node clipping");
 check(fr.bottom<zr.top&&overflowZone.querySelector("button").getBoundingClientRect().bottom<zr.top,"Open area controls must stay above the node clip");
 check(Math.abs(overflowZone.querySelector("button").getBoundingClientRect().right-zr.right)<0.5,"Area filter must align with the scroll area's right edge");
 check(document.elementFromPoint(fr.left+6,fr.top+fr.height/2)===field,"Overflowing input is clipped or cannot receive input");
 overflowZone.remove();
 const mount=viewport.appendChild(document.createElement("div")),react=createRoot(mount);
 for(const left of [350,900]) {
  flushSync(()=>react.render(<DropAreaPreview left={left} top={60} width={180} height={160} viewportWidth={420} viewportHeight={350} className="kplex-area-right is-relationship-drop-area" />));
  const glow=viewport.querySelector(".kplex-drop-area-preview"),r=glow.getBoundingClientRect(),v=viewport.getBoundingClientRect(),s=getComputedStyle(glow);
  check(r.left>=v.left&&r.right<=v.right&&r.top>=v.top&&r.bottom<=v.bottom&&r.width>=16,"Clipped/offscreen Challenger cue disappeared");
  check(s.pointerEvents==="none"&&Number(s.zIndex)>16&&s.borderTopWidth==="2px"&&getComputedStyle(glow,"::before").opacity==="0.08","Glow is hidden behind panels or opaque");
  check(document.elementFromPoint(410,120)?.id==="drop-underlay","Glow intercepted underlying drop delivery");
 }
 flushSync(()=>react.render(<DropAreaPreview left={160} top={100} width={100} height={50} viewportWidth={420} viewportHeight={350} className="kplex-center-drop-preview is-navigation-drop-target" />));
 check(Number(getComputedStyle(viewport.querySelector(".kplex-center-drop-preview")).zIndex)>26,"Center preview is covered by the embedded editor");
 flushSync(()=>react.unmount());check(!viewport.querySelector(".kplex-drop-area-preview"),"Unmount retained feedback");
 result.dataset.status="passed";result.textContent="Drop preview and shared controls passed";
}catch(error){result.dataset.status="failed";result.textContent=String(error.stack||error)}
`;
}

test("Drop glow remains visible above panels and controls share theme/state styling",()=>{
  runBrowserDom(dropPreviewAndControlsBrowserEntry(),"Drop preview and shared controls passed");
});

test("Editor shared menu and history target eligibility, leave and cancellation",()=>{
 runBrowserDom(editorHistoryBrowserEntry(),"Editor menu and history target browser behavior passed");
});

/** Check focused Find, history states and dark hover outlines against representative host theme tokens. */
function themedHistoryBrowserEntry() {
 return `
const result=document.querySelector("#result"),check=(ok,message)=>{if(!ok)throw new Error(message)};
const style=document.body.appendChild(document.createElement("style"));style.textContent=${JSON.stringify(readFileSync(join(root,"styles.css"),"utf8"))};
const hostStyle=document.body.appendChild(document.createElement("style"));hostStyle.textContent='input[type="text"]:focus { background: var(--background-primary); }';
const host=document.body.appendChild(document.createElement("div"));host.className="kplex-view-host";
const app=host.appendChild(document.createElement("div"));app.className="kplex-app";
app.innerHTML='<div class="kplex-history-bar"><span class="kplex-history-label">Past nodes</span><div class="kplex-history-list"><button>History note</button></div></div><div class="kplex-area-frame"></div>';
const button=app.querySelector("button"),bar=app.querySelector(".kplex-history-bar"),frame=app.querySelector(".kplex-area-frame");
const find=app.appendChild(document.createElement("input"));find.type="text";find.className="kplex-find-input";find.value="Readable query";find.placeholder="Find in Plex";
const rgb=value=>value.match(/[\\d.]+/g).slice(0,3).map(Number);
const luminance=color=>rgb(color).map(v=>{v/=255;return v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4)}).reduce((v,c,i)=>v+c*[.2126,.7152,.0722][i],0);
const contrast=(a,b)=>{a=luminance(a);b=luminance(b);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05)};
try{
 for(const dark of [false,true]){
  document.body.className=dark?"theme-dark":"theme-light";
  const tokens=dark?{primary:"#1e1e1e",secondary:"#262626",alt:"#303030",text:"#dadada",muted:"#b3b3b3",border:"#404040"}:{primary:"#ffffff",secondary:"#f6f6f6",alt:"#eeeeee",text:"#222222",muted:"#666666",border:"#dddddd"};
  for(const [name,value] of Object.entries({"background-primary":tokens.primary,"background-secondary":tokens.secondary,"background-secondary-alt":tokens.alt,"text-normal":tokens.text,"text-muted":tokens.muted,"background-modifier-border":tokens.border,"background-modifier-border-hover":tokens.border,"interactive-accent":"#7c5cff"}))document.body.style.setProperty("--"+name,value);
  for(const focused of [false,true]){focused?find.focus():find.blur();check((document.activeElement===find)===focused,"Find focus fixture did not activate");const s=getComputedStyle(find);check(contrast(s.color,s.backgroundColor)>=4.5,"Find text lost contrast: "+document.body.className+"/focused="+focused);check(contrast(getComputedStyle(find,"::placeholder").color,s.backgroundColor)>=4.5,"Find placeholder lost contrast: "+document.body.className)}
  check(getComputedStyle(bar).backgroundColor===(dark?"rgb(38, 38, 38)":"rgb(246, 246, 246)"),"History bar did not follow the host theme");
  for(const state of ["","is-active","is-relationship-drop-target"]){button.className=state;const s=getComputedStyle(button);check(contrast(s.color,s.backgroundColor)>=4.5,"History text lost contrast: "+document.body.className+"/"+state)}
  if(dark){const s=getComputedStyle(frame),alpha=Number(s.opacity),canvas=[15,55,90],line=rgb(s.borderColor).map((v,i)=>Math.round(v*alpha+canvas[i]*(1-alpha)));check(contrast("rgb("+line.join(",")+")","rgb("+canvas.join(",")+")")>=3,"Dark area outline disappeared against the Plex canvas")}
 }
 result.dataset.status="passed";result.textContent="History and area theme contrast passed";
}catch(error){result.dataset.status="failed";result.textContent=error.stack}
`;
}

test("Focused Find, history text and area hover outlines remain readable in light and dark themes",()=>{
 runBrowserDom(themedHistoryBrowserEntry(),"History and area theme contrast passed");
});

/** Exercise the independent Find field with real React input/focus/keyboard events. */
function plexFindBrowserEntry() {
  return `
import React from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { PlexFind, matchesFindText, matchesFindNode, matchesOntologyFind } from ${JSON.stringify(join(root, "src/ui/features/PlexFind.tsx"))};
const style=document.body.appendChild(document.createElement("style"));style.textContent=${JSON.stringify(readFileSync(join(root,"styles.css"),"utf8"))};
const result=document.querySelector("#result"), container=document.createElement("div");
document.body.append(container);
const root=createRoot(container);
const check=(ok,message)=>{if(!ok)throw new Error(message)};
${uiDefinitions("src/ui/PlexGraph.tsx",["GENERIC_RELATION_LABELS","relationLabel"])}
let query="", focusRequest=0, cycles=[], includePath=false, visible=true, appliedFilters=[], exposeFilter=true, appliedFilterQuery=null, filterClears=0;
const render=()=>flushSync(()=>root.render(React.createElement(PlexFind,{
  query,focusRequest,includePath,visible,pathIcon:"Paths",pathLabel:"Include paths",onIncludePathChange:value=>{includePath=value;render()},icon:"Find",closeIcon:"Close",label:"Find in Plex",placeholder:"Find in Plex…",
  closeLabel:"Close Find",matchLabel:"2 matches",
  ...(exposeFilter ? { filterIcon:"Filter",filterLabel:"Filter matching notes",appliedFilterQuery,
    onApplyFilter:value=>{appliedFilters.push(value);appliedFilterQuery=value;render()},
    onClearFilter:()=>{filterClears++;appliedFilterQuery=null;render()} } : {}),
  onChange:value=>{query=value;render()},onNext:backward=>cycles.push(backward)
})));
try {
  render();
  check(!container.querySelector("input"),"Find should initially show only its magnifier");
  flushSync(()=>container.querySelector("button").click());
  let input=container.querySelector("input");
  check(document.activeElement===input,"magnifier must focus its independent input");
  check(!container.querySelector("button[aria-expanded]"),"Expanded Find must remove its redundant magnifier");
  let filter=container.querySelector('[aria-label="Filter matching notes"]');
  check(filter?.disabled && filter.type==="button" && !filter.hasAttribute("title")&&filter.getAttribute("aria-pressed")==="false","optional filter action must be accessible, non-submitting and disabled for empty text");
  check(filter.previousElementSibling.getAttribute("aria-label")==="Include paths","filter action must sit beside the include-path button");
  filter.click();check(appliedFilters.length===0,"empty Find cannot apply a filter");
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set.call(input,"Alias Match");
  flushSync(()=>input.dispatchEvent(new Event("input",{bubbles:true})));
  check(query==="Alias Match","Find must keep its controlled query");
  flushSync(()=>filter.click());
  check(JSON.stringify(appliedFilters)==='["Alias Match"]' && query==="Alias Match" && !includePath,"applying a filter must retain the independent Find query/path mode");
  check(filter.getAttribute("aria-pressed")==="true","caller-owned active filter must expose pressed state");
  flushSync(()=>filter.click());
  check(filterClears===1&&appliedFilterQuery===null&&filter.getAttribute("aria-pressed")==="false"&&appliedFilters.length===1,"same-query second click must clear the retained filter rather than reapply it");
  check(query==="Alias Match"&&!includePath,"filter toggle-off must preserve Find query and path mode");
  flushSync(()=>filter.click());
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set.call(input,"  Replacement  ");
  flushSync(()=>input.dispatchEvent(new Event("input",{bubbles:true})));
  flushSync(()=>filter.click());
  check(appliedFilterQuery==="Replacement"&&appliedFilters.at(-1)==="Replacement"&&filterClears===1&&filter.getAttribute("aria-pressed")==="true","a changed query must replace the active term without clearing it first");
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set.call(input,"  ");
  flushSync(()=>input.dispatchEvent(new Event("input",{bubbles:true})));
  check(!filter.disabled&&filter.getAttribute("aria-pressed")==="true","blank Find must retain an available off switch for its active filter");
  flushSync(()=>filter.click());
  check(filterClears===2&&appliedFilterQuery===null&&filter.disabled&&query==="  ","blank-query click must clear the owned filter and preserve the Find term");
  appliedFilterQuery="External retained term";render();
  check(filter.getAttribute("aria-pressed")==="true","pressed state must follow current caller ownership, not stale local button state");
  appliedFilterQuery=null;render();
  check(filter.getAttribute("aria-pressed")==="false"&&filter.disabled,"external quick-filter edits can retire Find ownership");
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set.call(input,"Alias Match");
  flushSync(()=>input.dispatchEvent(new Event("input",{bubbles:true})));
  exposeFilter=false;render();check(!container.querySelector('[aria-label="Filter matching notes"]'),"consumers without a filter action must preserve their existing controls");
  exposeFilter=true;render();
  check(!container.querySelector('[role="listbox"], [role="option"], .kplex-search-results'),"Find must never render a dropdown");
  check(matchesFindText(query,["unrelated","An ALIAS MATCH title"]),"case-insensitive alias match missing");
  check(!matchesFindText("  ",["anything"]),"empty query must clear highlights");
  check(!matchesFindText("a.*b",["a random b"]),"Find must use literal text, not regex");
  check(!matchesOntologyFind("Related Note", "[[Related Note]]"), "Wiki-link destinations must not highlight connectors");
  check(!matchesOntologyFind("Comma Note", "[[Folder,Comma Note]], supports"), "Commas within a wiki destination must not become ontology fields");
  check(!matchesOntologyFind("al", relationLabel("challenger") ?? undefined), "A generic role hidden by actual rendering must not light its connector");
  check(matchesOntologyFind("custom", relationLabel("Custom relation")), "Actual custom ontology text remains searchable");
  check(!matchesOntologyFind("parent", undefined), "An omitted rendered label must not light a connector");
  check(matchesOntologyFind("supports", "[[Related Note]], supports"), "Defined ontology remains searchable beside inferred links");
  check(!matchesFindNode("al","Note B","Synthetic-Scale/NoteB.md",false), "Only the displayed label is searched by default");
  check(matchesFindNode("al","Note B","Synthetic-Scale/NoteB.md",true), "Extended mode must include the path");
  flushSync(()=>container.querySelector('[aria-label="Include paths"]').click());
  check(includePath && container.querySelector('[aria-label="Include paths"]').getAttribute("aria-pressed")==="true", "path toggle lacks view-local pressed state");
  visible=false;render();
  check(container.querySelector(".kplex-find").inert && container.querySelector(".kplex-find").getAttribute("aria-hidden")==="true", "maximized editor must suspend Find focus and controls");
  check(getComputedStyle(container.querySelector(".kplex-find")).display==="none", "production CSS must hide Find over maximized editor controls");
  check(query==="Alias Match" && input.value===query && includePath, "suspension must retain the query and path mode");
  visible=true;render();check(container.querySelector("input")===input && document.activeElement===input, "returning must retain the Find session and focus");
  check(!matchesOntologyFind("tree", "file-tree"), "Physical topology is not an ontology match");
  input.dispatchEvent(new KeyboardEvent("keydown",{key:"Enter",bubbles:true}));
  input.dispatchEvent(new KeyboardEvent("keydown",{key:"Enter",shiftKey:true,bubbles:true}));
  check(JSON.stringify(cycles)==="[false,true]","Enter/Shift+Enter must cycle projected matches");
  focusRequest++;render();
  check(input.selectionStart===0 && input.selectionEnd===query.length,"repeat shortcut must select current term");
  flushSync(()=>input.dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",bubbles:true})));
  check(query==="" && !container.querySelector("input"),"Escape must clear and close Find");
  check(document.activeElement===container.querySelector("button"),"dismissal must restore magnifier focus");
  focusRequest++;render();
  // Shortcut disclosure schedules a local React state update; inspect after its commit/effect.
  let focusAttempts=0;
  const inspectFocus=()=>{
    try {
      if(document.activeElement!==container.querySelector("input") && focusAttempts++<50) {
        setTimeout(inspectFocus,10);return;
      }
      check(document.activeElement===container.querySelector("input"),"shortcut must reopen Find");
      root.unmount();
      result.dataset.status="passed";result.textContent="Plex Find independent field behavior passed";
    } catch(error) {result.dataset.status="failed";result.textContent=error.stack;}
  };
  setTimeout(inspectFocus,10);
} catch(error) {result.dataset.status="failed";result.textContent=error.stack;}
`;
}

test("Plex Find independent field focus, literal matching, cycling and dismissal", () => {
  runBrowserDom(plexFindBrowserEntry(), "Plex Find independent field behavior passed");
});

/** Exercise the real portable area-height control without an Obsidian runtime. */
function areaFrameBrowserEntry() {
  return `
import React from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { ResizableAreaFrame } from ${JSON.stringify(join(root, "src/ui/components/ResizableAreaFrame.tsx"))};
const result = document.querySelector("#result");
const check = (condition, message) => { if (!condition) throw new Error(message); };
try {
  const container = document.body.appendChild(document.createElement("div"));
  const root = createRoot(container);
  const values = [];
  const render = (edge, editing = true, value = 200) => flushSync(() => root.render(<ResizableAreaFrame className="test-frame" left={10} top={20} width={300} height={value} edge={edge} editing={editing} label="Localized region" value={value} min={140} max={800} onHeightChange={height => values.push(height)} />));
  render("top");
  let handle = container.querySelector('[role="separator"]');
  check(handle.getAttribute("aria-label") === "Localized region" && handle.getAttribute("aria-valuenow") === "200", "height control lost its localized accessible value");
  handle.focus();
  check(document.activeElement === handle, "height control cannot receive keyboard focus");
  const key = value => handle.dispatchEvent(new KeyboardEvent("keydown", { key: value, bubbles: true, cancelable: true }));
  key("ArrowUp"); key("ArrowDown"); key("Home"); key("End"); key("Escape");
  check(JSON.stringify(values) === "[210,190,140,800]", "top-edge direction or height limits changed");
  render("bottom", true, 795); handle = container.querySelector('[role="separator"]');
  key("ArrowDown"); check(values.at(-1) === 800, "bottom edge did not clamp outward motion");
  render("bottom", false);
  check(!container.querySelector('[role="separator"]'), "transient keyboard control survived edit-mode exit");
  flushSync(() => root.unmount());
  result.dataset.status = "passed"; result.textContent = "Area frame browser behavior passed";
} catch (error) { result.dataset.status = "failed"; result.textContent = String(error?.stack ?? error); }
`;
}

test("ResizableAreaFrame localized keyboard behavior", () => {
  runBrowserDom(areaFrameBrowserEntry(), "Area frame browser behavior passed");
});


/** A real composer must retain existing selection across ontology browsing and failed commits. */
test("Related composer existing selection and ontology disclosure browser behavior", () => {
  runBrowserDom(relatedComposerBrowserEntry(), "Related composer browser behavior passed");
});


/** Verify toolbar wrapping uses its own available space and consumes margin before search width. */
function responsiveToolbarBrowserEntry() {
 return `
const result=document.querySelector("#result"),check=(ok,message)=>{if(!ok)throw new Error(message)};
const style=document.body.appendChild(document.createElement("style"));style.textContent=${JSON.stringify(readFileSync(join(root,"styles.css"),"utf8"))};
const host=document.body.appendChild(document.createElement("div"));host.className="kplex-view-host";
const app=host.appendChild(document.createElement("div"));app.className="kplex-app";
const bar=app.appendChild(document.createElement("header"));bar.className="kplex-topbar";bar.style.boxSizing="border-box";
bar.innerHTML='<button class="kplex-index-status"></button><div class="kplex-brand">Brain<strong>K-Plex</strong></div><button class="kplex-icon-button">Back</button><button class="kplex-icon-button">Next</button><div class="kplex-search-shell"><input class="kplex-search" placeholder="Search Vault"></div><button class="kplex-icon-button">Filter</button><div class="kplex-top-actions is-compact"><button class="kplex-icon-button">Sync</button><button class="kplex-icon-button">Title</button><span class="kplex-toolbar-divider"></span><button class="kplex-icon-button">Sort</button><button class="kplex-icon-button">Links</button><button class="kplex-icon-button">Settings</button></div>';
const search=bar.querySelector(".kplex-search-shell"),actions=bar.querySelector(".kplex-top-actions"),filter=actions.previousElementSibling;
const measure=width=>{bar.style.width=width+"px";const s=search.getBoundingClientRect(),a=actions.getBoundingClientRect(),f=filter.getBoundingClientRect();return {width:s.width,gap:a.left-f.right-parseFloat(getComputedStyle(bar).gap),sameRow:Math.abs(a.top-s.top)<5}};
try{
 const wide=measure(1500),middle=measure(1100),tight=measure(700),minimum=measure(570),narrow=measure(300);
 check(wide.sameRow&&middle.sameRow&&tight.sameRow&&minimum.sameRow,"Toolbar wrapped before consuming available search width");
 check(Math.abs(wide.width-middle.width)<1&&middle.gap<wide.gap,"Spare margin must disappear before reducing search width");
 check(tight.gap<1&&tight.width<middle.width&&minimum.width>=100,"Search shrinks only after spare margin reaches zero");
 check(!narrow.sameRow,"Toolbar must still wrap when controls cannot fit");
 const hostButtons=document.body.appendChild(document.createElement("style"));hostButtons.textContent="button {display:inline-flex;justify-content:center;height:28px}";
 const column=app.appendChild(document.createElement("div"));column.className="kplex-main-column";column.innerHTML='<div></div><div></div><footer class="kplex-history-bar"><div class="kplex-history-list"><button><span class="kplex-history-text">A meaningful history title that is much longer than the history button and must stay visible at its beginning</span></button><button><span class="kplex-history-text">Short</span></button></div></footer>';column.style.width="500px";column.style.height="200px";
 const history=column.querySelector("button"),historyText=history.firstElementChild,first=document.createRange();first.setStart(historyText.firstChild,0);first.setEnd(historyText.firstChild,1);
 check(first.getBoundingClientRect().left>=history.getBoundingClientRect().left+8&&historyText.scrollWidth>historyText.clientWidth,"Overflowing history title lost its left edge");
 const compactHeight=column.querySelector("footer").getBoundingClientRect().height;column.classList.add("is-two-line-history");
 const hs=getComputedStyle(historyText);check(hs.whiteSpace==="normal"&&hs.webkitLineClamp==="2"&&historyText.getBoundingClientRect().height>parseFloat(hs.lineHeight)*1.5,"History long title did not use two lines");
 check(column.querySelector("footer").getBoundingClientRect().height>compactHeight&&history.getBoundingClientRect().height===column.querySelectorAll("button")[1].getBoundingClientRect().height,"Wrapped history must reserve an aligned taller row");
 const label=app.appendChild(document.createElement("span"));label.className="kplex-thought-label is-two-line";label.style.width="160px";label.style.fontSize="18px";label.innerHTML='<span class="kplex-thought-text">A meaningful long title that must occupy two lines in the label area</span>';
 const text=label.firstElementChild,s=getComputedStyle(text);check(s.whiteSpace==="normal"&&s.webkitLineClamp==="2"&&text.getBoundingClientRect().height>parseFloat(s.lineHeight)*1.5,"Long title did not wrap into the fixed two-line label area");
 result.dataset.status="passed";result.textContent="Toolbar shrink and two-line label browser behavior passed";
}catch(error){result.dataset.status="failed";result.textContent=error.stack}
`;
}
test("Toolbar consumes spare space and search width before wrapping; labels use two lines",()=>{
 runBrowserDom(responsiveToolbarBrowserEntry(),"Toolbar shrink and two-line label browser behavior passed");
});
