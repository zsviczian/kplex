/**
 * Bundles K-Plex UI components into real browser fixtures for interaction, portal and cleanup
 * assertions. Fixtures supply current scene/editor/viewport capabilities and navigation contracts;
 * canonical CSS selectors are shared with production and fixtures are removed after each run.
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { browserExecutable } from "./support/browserExecutable.mjs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { buildSync } from "esbuild";
import ts from "typescript";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** Discover the same real browser used by the IndexedDB acceptance lane. */
function findBrowser() { return browserExecutable(); }

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
  let actionTarget = null;
  let submissions = 0;
  form.addEventListener("submit", (event) => {
    submissions += 1;
    event.preventDefault();
  });

  const root = createRoot(container);
  flushSync(() => root.render(React.createElement(ActionButton, {
    label: "Navigate back",
    "aria-pressed": true,
    icon: React.createElement("span", { "data-testid": "action-icon" }, "←"),
    onClick: (event) => { activations += 1; actionTarget = event.currentTarget; },
  })));

  let button = container.querySelector("button");
  check(button instanceof HTMLButtonElement, "ActionButton did not render a native button");
  check(button.type === "button", "ActionButton must render type=button");
  check(button.getAttribute("aria-label") === "Navigate back", "accessible label was not rendered");
  check(button.classList.contains("kplex-icon-button"), "canonical K-Plex button CSS hook is missing");
  check(button.classList.contains("kplex-action-button"), "action token hook missing");
  check(button.getAttribute("aria-pressed") === "true", "toggle state must reach the native button");
  check(!button.hasAttribute("title"), "ActionButton must not add a second/title tooltip");
  check(button.querySelector('[data-testid="action-icon"]')?.textContent === "←", "icon slot did not render");

  button.click();
  check(activations === 1, "enabled click must fire exactly once");
  check(actionTarget === button, "clipboard actions must receive their owning native button");
  check(submissions === 0, "type=button must prevent accidental form submission");

  flushSync(() => root.render(React.createElement(ActionButton, {
    label: "Navigate back",
    icon: React.createElement("span", { "data-testid": "action-icon" }, "←"),
    disabled: true,
    "aria-pressed": false,
    onClick: () => { activations += 1; },
  })));

  button = container.querySelector("button");
  check(button.disabled === true, "disabled prop did not reach the native button");
  check(button.getAttribute("aria-pressed") === "false", "toggle state must update without retaining a stale value");
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

  // The component, rather than every caller, gates expensive providers by actual list visibility.
  const lazyHost=document.createElement("div");document.body.append(lazyHost);
  const lazyRoot=createRoot(lazyHost), ranking=[];let updateLazy;
  const rank=value=>{ranking.push(value);return [value+" result"];};
  function LazyProvider(){const [value,setValue]=React.useState("");updateLazy=setValue;
    return React.createElement(FuzzySuggester,{value,onChange:setValue,getResults:rank,onChoose:()=>{},getKey:String,getLabel:String,
      placeholder:"Search",ariaLabel:"Lazy search",openResultsOnFocus:false});}
  flushSync(()=>lazyRoot.render(React.createElement(LazyProvider)));
  const lazyInput=lazyHost.querySelector("input");
  check(ranking.length===0,"hidden suggester eagerly ranked its provider");
  flushSync(()=>lazyInput.focus());
  check(ranking.length===0,"typing-only focus ranked before typing");
  flushSync(()=>type(lazyInput,"a"));
  check(ranking.join(',')==='a',"typing did not rank once");
  flushSync(()=>lazyRoot.render(React.createElement(LazyProvider)));
  check(ranking.length===1,"unrelated parent render reranked the provider");
  flushSync(()=>lazyInput.dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",bubbles:true,cancelable:true})));
  flushSync(()=>updateLazy("ab"));
  check(ranking.length===1,"dismissed list ranked hidden updates");
  flushSync(()=>type(lazyInput,"abc"));
  check(ranking.join(',')==='a,abc',"reopened list did not rank the latest query");
  flushSync(()=>lazyRoot.unmount());lazyHost.remove();

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
    resultIcon: hit => React.createElement("i", { "data-result-kind": hit.node.kind }),
  })));
  render(0);
  check(calls.length === 0, "blurred Find eagerly ranked the vault");
  render(1);
  check(calls.length === 0, "background publication ranked a blurred Find field");
  render(0);
  const input = host.querySelector("input");
  host.querySelector(".kplex-fuzzy-search").getBoundingClientRect = () => ({ left: 10, top: 20, right: 310, bottom: 50, width: 300, height: 30 });
  flushSync(() => input.focus());
  flushSync(() => type(input, "needle"));
  const rows = () => [...host.querySelectorAll(".kplex-search-result")];
  check(rows().length === 2, "search hits did not render");
  check(rows()[0].querySelector("span:not(.kplex-search-result-prefix)").textContent === second.label, "source ranking was changed");
  check(rows().every(row => row.classList.contains("has-prefix") && row.querySelector('.kplex-search-result-prefix[aria-hidden="true"]')), "caller icon prefixes lost decorative semantics");
  check(rows()[0].querySelector("[data-result-kind]").dataset.resultKind === "url" && rows()[1].querySelector("[data-result-kind]").dataset.resultKind === "document", "result type facets were reinterpreted");
  check(rows()[1].querySelector("small").textContent === first.detail, "opaque ID was used as display detail");
  check(input.getAttribute("aria-label") === "Localized search" && input.placeholder === "Localized placeholder", "localized copy was changed");
  check(host.querySelector("[data-test-icon]"), "host icon slot missing");
  check(calls.every(([, limit]) => limit === 24), "search mapping was not bounded to 24 hits");
  const count = calls.length; render(0);
  check(calls.length === count, "unchanged revision unnecessarily reran search");
  hits = [{ ...first, label: "Renamed first", detail: "actual/Renamed.md" }]; render(1);
  check(calls.length === count + 1 && calls.at(-1)[0] === "needle", "publication revision did not refresh the same query");
  check(input.value === "needle" && document.activeElement === input, "publication lost query or focus");
  check(rows().length === 1 && rows()[0].querySelector("span:not(.kplex-search-result-prefix)").textContent === "Renamed first", "stale label/result survived publication");
  flushSync(() => input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true })));
  check(chosen.length === 1 && chosen[0] === first.node.id, "activation reinterpreted/normalized the opaque ID");
  check(input.value === "", "selection did not clear query");
  const blurredCalls = calls.length; render(3);
  check(calls.length === blurredCalls, "closed Find reranked on background publication");
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
    && ["RelatedNoteComposer", "isNoteTarget", "captureRelatedEndpoint", "refreshCapturedPage"].includes(statement.name?.text)).map((statement) => statement.getText(source)).join("\n");
  const production = ts.transpileModule(functions, { compilerOptions: { target: ts.ScriptTarget.ES2021, module: ts.ModuleKind.None } }).outputText;
  return `
import React, { createElement, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { FuzzySuggester } from ${JSON.stringify(join(root, "src/ui/components/FuzzySuggester.tsx"))};
import { SavedRelationshipPendingError } from ${JSON.stringify(join(root, "src/adapters/obsidian/relationshipMetadataWrite.ts"))};
import { PartialRelatedFileError } from ${JSON.stringify(join(root, "src/adapters/obsidian/relatedFileOutcome.ts"))};
import { CreationCompletionSelect } from ${JSON.stringify(join(root, "src/ui/features/CreationCompletionSelect.tsx"))};
import {resolveCreationAfterSaving,creationAfterSavingActions,effectiveCreationAfterSaving,sanitizeCreationAfterSaving} from ${JSON.stringify(join(root,"src/core/plex/createdNoteDestination.ts"))};
import {ontologyConfiguration} from ${JSON.stringify(join(root,"src/core/contracts/ontologyConfiguration.ts"))};
import {normalizeFieldName} from ${JSON.stringify(join(root,"src/core/contracts/fieldName.ts"))};
import {ontologyFieldViews,ontologyFieldDetail,ontologyFuzzyMatches,ontologySelectionFields} from ${JSON.stringify(join(root,"src/ui/features/ontologyPresentation.ts"))};
const FuzzySearchInput = (props) => createElement(FuzzySuggester, { ...props, icon: null });
const ObsidianIcon = ({ name }) => createElement("span", null, name);
${uiDefinitions("src/ui/FuzzySearchInput.tsx", ["fuzzyFilterStrings"])}
${uiDefinitions("src/ui/FolderPathInput.tsx", ["FolderPathInput"])}
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
  const origin = { path: "Origin.md", file: { path: "Origin.md", extension: "md" } }; const target = { path: "Target.md", file: { path: "Target.md", extension: "md" } };
  const intents = [], outcomes = []; let commits = 0; let closes = 0; let rejectCommit = true; let savedPending = false;
  let folderEnumerations = 0;
  const session = { continuation: "return", suggestionOwnerId: "composer-browser-fixture", isSessionOpen: () => true, canComplete: () => true, setWriting: () => {}, registerSubmit: () => () => {}, focusName: () => host.querySelector("input")?.focus(), closeForCompletion: () => { closes++; }, finishCompletion: () => {}, focusGraph: () => {} };
  const plugin = {
   app: { vault: { on: () => ({}), offref: () => {}, getFileByPath: path => [origin, target].find(page => page.path === path)?.file,
    getAllFolders: includeRoot => { check(includeRoot === true, "folder inventory must include the vault root"); folderEnumerations++; return [{ path: "/" }, { path: "Projects" }, { path: "Projects/Ideas" }]; } } },
   settings: { editNewNodeAfterCreate: false, newNodeDefaultType: "markdown",ontologyPairingVersion:1,hierarchy:{hidden:[],parents:["parent"],children:["children","review","example"],leftFriends:[],rightFriends:[],previous:[],next:[],exclusions:[]} },
   createdNoteCompletionControl(_host,options={}){const context={desktop:true,sidepanel:false,another:options.another!==false,editable:options.editable!==false,follow:options.follow!==false};return{choices:creationAfterSavingActions(context),value:effectiveCreationAfterSaving(sanitizeCreationAfterSaving(this.settings.newNodeAfterSaving,this.settings.editNewNodeAfterCreate),context),onChange:value=>{this.settings.newNodeAfterSaving=value}}},
   finishNewRelatedNode:async()=>{},
   translator: (key) => key, drawingTemplateOptions: () => null, isExcalidrawAvailable: () => false, defaultOntologyField: () => "children",
   ontologyFieldsForRole: () => ["children", "review", "example"],
   allOntologyFields: () => ["children", "review", "example", "parent"],
   ontologyRoleForField: field => field === "parent" ? "parent" : ["children", "review", "example"].includes(field) ? "child" : null,
   validateRelatedNoteName: () => ({ valid: true, existing: false, stem: "Target" }),
   newRelatedNoteFolder: () => "Projects",
   validateNoteFolderPath: value => ({ folderPath: value === "/" ? "" : value, error: null }),
   index: { search: () => [target], titleFor: (page) => page.path, get: path => [origin, target].find(page => page.path === path), prepareRelationshipPair: async () => true },
   rememberRelationshipOntology: async (_role, field) => field,
   createRelationToPage: async (...args) => { if (savedPending) throw new SavedRelationshipPendingError("Saved; graph pending"); if (rejectCommit) throw new Error("not ready"); intents.push(args); return { state: "saved-published", page: target }; },
   requestNodeFlair: () => {},
  };
  const root = createRoot(host);
  flushSync(() => root.render(createElement(RelatedNoteComposer, { plugin, origin, session, initialRole: "child", onCommitted: outcome => { commits += 1; outcomes.push(outcome); }, onClose: () => { closes += 1; } })));
  const input = host.querySelector(".kplex-add-related-note-search input");
  const folder = host.querySelector(".kplex-folder-path-input input");
  check(folder?.value === "Projects" && !folder.autofocus, "computed folder did not prefill independently of quick-name focus");
  flushSync(() => folder.focus()); flushSync(() => type(folder, "Projects/Id"));
  let folders = document.body.querySelector(".kplex-fuzzy-floating-results");
  check(folders?.textContent.includes("Projects/Ideas"), "actual shared folder autocomplete did not rank the native folder vocabulary");
  flushSync(() => folders.querySelector("button").click());
  check(folder.value === "Projects/Ideas" && commits === 0 && closes === 0 && folderEnumerations === 1, "folder choice wrote, submitted or reacquired the inventory");
  flushSync(() => input.focus()); flushSync(() => type(input, "Target"));
  let list = document.body.querySelector(".kplex-fuzzy-floating-results");
  check(list, "existing-target suggestions did not open");
  flushSync(() => list.querySelector("button").click());
  const link = host.querySelector(".kplex-add-related-link-button");
  check(link && input.value === "Target.md", "existing selection was not retained as explicit Link action");
  check(!host.querySelector(".kplex-folder-path-input"), "linking an existing target exposed an unrelated creation folder");
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
  check(commits === 1 && outcomes[0].state === "saved-pending" && closes === 0 && notices.at(-1) === "Saved; graph pending", "saved-pending outcome lost its committed state or closed the composer");
  savedPending = false;
  flushSync(() => link.click()); await new Promise((resolve) => setTimeout(resolve, 0));
  check(intents.length === 0 && commits === 1 && link.disabled, "saved-pending state allowed an automatic mutation retry");
  const refresh = [...host.querySelectorAll("button")].find(button => button.textContent === "addRelated.refreshSaved");
  flushSync(() => refresh.focus()); flushSync(() => refresh.click()); await new Promise((resolve) => setTimeout(resolve, 0));
  for (let attempt = 0; attempt < 30 && host.querySelector(".kplex-add-related-note-search input").value !== ""; attempt++) await new Promise(resolve => setTimeout(resolve, 10));
  flushSync(() => {}); const refreshedInput = host.querySelector(".kplex-add-related-note-search input");
  check(!refreshedInput.disabled && refreshedInput.value === "", "explicit refresh did not release saved-pending input");
  flushSync(() => refreshedInput.blur()); flushSync(() => refreshedInput.focus()); flushSync(() => type(refreshedInput, "Target"));
  const refreshedResult = document.body.querySelector(".kplex-fuzzy-floating-results button");
  check(refreshedResult, "deliberate target selection after refresh did not reopen results"); flushSync(() => refreshedResult.click());
  flushSync(() => host.querySelector(".kplex-add-related-link-button").click()); await new Promise((resolve) => setTimeout(resolve, 0));
  check(intents.length === 1 && intents[0][0].file === origin.file && intents[0][1] === "child" && intents[0][2].file === target.file && intents[0][3] === "review", "explicit Link lost captured ontology, endpoint identity or role");
  check(commits === 2 && outcomes.at(-1).state === "saved-published" && closes === 1, "successful explicit Link did not commit/close once");
  // History/menu fixed targets must enter the same composer with an immediately retained Link action.
  rejectCommit = false; commits = 0; closes = 0; intents.length = 0;
  flushSync(() => root.render(createElement(RelatedNoteComposer, { key: "fixed-target", plugin, origin, session, initialRole: "right", fixedTarget: target, onCommitted: () => { commits += 1; }, onClose: () => { closes += 1; } })));
  check(host.querySelector(".kplex-add-related-note-search input").value === "Target.md", "fixed history target did not initialize the existing selection");
  flushSync(() => host.querySelector(".kplex-add-related-link-button").click());
  await new Promise((resolve) => setTimeout(resolve, 0));
  check(intents.length === 1 && intents[0][1] === "right" && intents[0][2].file === target.file && commits === 1 && closes === 1, "history fixed target did not commit through the shared Link action");
  // All is a vocabulary filter, not permission to move another direction's ontology.
  plugin.settings.editNewNodeAfterCreate = true; session.continuation = "configured";
  plugin.saveSettings = async () => {};
  flushSync(() => root.render(createElement(RelatedNoteComposer, { key: "all-directions", plugin, origin, session, initialRole: "child", fixedTarget: target })));
  const changeSelect = (selector, value) => flushSync(() => { const element=host.querySelector(selector); element.value=value; element.dispatchEvent(new Event("change", {bubbles:true})); });
  check(host.querySelector('.kplex-add-related-completion select').value === "sidecar", "configured action must retain the migrated Sidecar preference");
  check(![...host.querySelector('.kplex-add-related-completion select').options].some(option=>option.value==="configured"), "ambiguous configured choice remains visible");
  const direction=host.querySelector('.kplex-add-related-role-select');
  check(direction.parentElement===host.querySelector('.kplex-add-related-ontology-search').parentElement, "direction is not beside the ontology field");
  changeSelect('.kplex-add-related-role-select','all');
  flushSync(() => host.querySelector('.kplex-fuzzy-disclosure').click());
  let allRows=[...document.body.querySelectorAll('.kplex-fuzzy-floating-results button')];
  check(allRows.length===4 && allRows.some(row=>row.querySelector('span')?.textContent==='parent'), "All omitted another direction's configured field");
  flushSync(() => allRows.find(row=>row.querySelector('span')?.textContent==='parent').click());
  check(direction.value==='all', "choosing a field unexpectedly changed the browsing filter");
  intents.length=0;
  flushSync(() => host.querySelector('.kplex-add-related-link-button').click()); await new Promise(resolve=>setTimeout(resolve,0));
  check(intents.length===1 && intents[0][1]==='parent' && intents[0][3]==='parent', "All reclassified a known ontology field");
  flushSync(() => root.render(createElement(RelatedNoteComposer, { key: "effective-default", plugin, origin, session, initialRole: "child" })));
  check(host.querySelector('.kplex-add-related-completion select').value==='sidecar', "configured create action must retain Sidecar");
  const footer=host.querySelector('.kplex-add-related-footer');
  check(footer.querySelectorAll('select').length===1&&!footer.querySelector('input[type=checkbox]')&&footer===host.querySelector('.kplex-add-related-form').lastElementChild, "After saving must be one control at the bottom");
  check([...footer.querySelector('select').options].map(option=>option.value).join(',')==='return,another,follow,sidecar,editor,editor-maximized,tab,window',"Unified choices were omitted or reordered");
  changeSelect('.kplex-add-related-completion select','editor-maximized');
  check(plugin.settings.newNodeAfterSaving==='editor-maximized',"Explicit completion preference was not remembered");
  plugin.settings.editNewNodeAfterCreate=false; session.continuation='return';
  // Hold an actual drawing submission after durability: ordinary progress must never offer recovery.
  const style = document.createElement("style"); style.textContent = ${JSON.stringify(readFileSync(join(root, "styles.css"), "utf8"))}; document.head.append(style);
  const created = { path: "Projects/" + "Long-folder-name/".repeat(8) + "Drawing.md", file: { path: "", extension: "md" } }; created.file.path = created.path;
  const originalLookup = plugin.app.vault.getFileByPath;
  plugin.app.vault.getFileByPath = path => path === created.path ? created.file : originalLookup(path);
  plugin.isExcalidrawAvailable = () => true;
  plugin.translator = (key, params) => params?.error ? "Reason: " + params.error : params?.path ? "Created " + params.path + "; setup or linking failed. Retry using this file." : key;
  let creations = 0, links = 0, rejectLink;
  plugin.createNewRelatedFileForOrigin = async (_origin, _query, kind) => { check(kind === "excalidraw", "wrong drawing kind"); creations++; return created.file; };
  plugin.rememberNewNodeDefaultType = async () => {};
  plugin.linkNewRelatedFile = async (_origin, _role, file) => { check(file === created.file, "recovery changed physical file identity"); links++; if (links === 1) await new Promise((_resolve, reject) => { rejectLink = reject; }); return { state: "saved-pending", page: created }; };
  plugin.openInDocumentLeaf = async file => check(file === created.file, "open changed physical file identity");
  flushSync(() => root.render(createElement(RelatedNoteComposer, { key: "drawing-recovery", plugin, origin, session, initialRole: "child" })));
  flushSync(() => type(host.querySelector(".kplex-add-related-note-search input"), "Drawing"));
  flushSync(() => host.querySelector('[aria-label="addRelated.createExcalidrawLink"]').click());
  await new Promise(resolve => setTimeout(resolve, 0)); flushSync(() => {});
  check(creations === 1 && links === 1 && rejectLink, "drawing did not reach held relationship step");
  check(!host.querySelector(".kplex-add-related-recovery"), "normal in-progress creation falsely offered recovery");
  rejectLink(new Error("Owned relationship failure")); await new Promise(resolve => setTimeout(resolve, 0)); flushSync(() => {});
  const panel = host.querySelector(".kplex-add-related-recovery");
  check(panel?.getAttribute("role") === "alert" && panel.textContent.includes(created.path), "actual failure lost its durable file path");
  check(panel.querySelector(".kplex-add-related-recovery-reason")?.textContent.includes("Owned relationship failure"), "failure reason disappeared with the notice");
  check(!host.querySelector(".kplex-add-related-create-hint"), "failure retained contradictory create instructions");
  check([...host.querySelectorAll(".kplex-add-related-type-button")].every(button => button.disabled), "partial file allowed fresh drawing/Markdown/placeholder creation");
  for (const width of [680, 260]) {
    host.style.width = width + "px";
    const actions = panel.querySelector(".kplex-add-related-recovery-actions"), buttons = [...actions.querySelectorAll("button")];
    const [a, b] = buttons.map(button => button.getBoundingClientRect());
    check(getComputedStyle(actions).display === "flex" && getComputedStyle(actions).flexWrap === "wrap", "recovery actions do not wrap");
    check(a.right + 7 <= b.left || a.bottom + 7 <= b.top, "recovery actions touch or overlap at width " + width);
    check(panel.scrollWidth <= panel.clientWidth, "long path overflowed recovery panel at width " + width);
    check(actions.getBoundingClientRect().top >= panel.querySelector(".kplex-add-related-recovery-reason").getBoundingClientRect().bottom, "actions overlap failure text");
  }
  flushSync(() => panel.querySelector("button").click()); await new Promise(resolve => setTimeout(resolve, 0));
  check(creations === 1 && links === 2, "retry created another file or failed to link the retained file");
  style.remove();
  flushSync(() => root.unmount());
  check(!document.body.querySelector(".kplex-fuzzy-floating-results"), "composer list survived unmount");
  result.dataset.status = "passed"; result.textContent = "Related composer browser behavior passed";
 } catch (error) { result.dataset.status = "failed"; result.textContent = String(error?.stack ?? error); }
})();
`;
}

/** Run a production DOM fixture in an isolated profile and navigate with an encoded file URL. */
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
      `--user-data-dir=${join(temp, "profile")}`,
      "--no-first-run",
      "--no-default-browser-check",
      "--virtual-time-budget=2000",
      "--dump-dom",
      pathToFileURL(htmlPath).href,
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

/** Exercise production reconciliation keys and thought DOM across a mutable rename/placeholder
 * handover, supplying the current extracted renderer's native editor-eligibility capabilities. */
function attachmentRenameBrowserEntry() {
  return `
import {occurrenceKey,edgeOccurrence,edgePhysicalOccurrence,semanticSceneEdge} from ${JSON.stringify(join(root,'src/ui/plexViews/scene.ts'))};
import {classicViewDefinition,classicAreaDropRole,classicPorts} from ${JSON.stringify(join(root,'src/core/plex/views/classic/definition.ts'))};
import * as classicLayout from ${JSON.stringify(join(root,'src/ui/layout.ts'))};
import {classicEditorKey,classicEditorIdentity} from ${JSON.stringify(join(root,'src/ui/plexViews/classic/occurrenceEditor.ts'))};
const viewDefinition=classicViewDefinition,viewFailed=false,viewLifetime=0,viewSession=undefined,badgeColorRevision=0;
const classicFixturePolicy=(layout=classicLayout.buildScene)=>({policyKey:classicLayout.sceneLayoutPolicyKey,geometryKey:classicLayout.neighborhoodSceneKey,
  layout,sections:classicLayout.buildSectionExpandedScene,bind:classicLayout.bindSceneNeighborhood,dropRole:classicAreaDropRole,editorKey:classicEditorKey,editorIdentity:classicEditorIdentity});
const classic=classicFixturePolicy();

import {canDragNodeLink,startNodeLinkDrag,finishNodeLinkDrag} from ${JSON.stringify(join(root,"src/adapters/obsidian/nodeLinkDrag.ts"))};
import React, { useId, useMemo } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { alphaHexToCss, resolveNodeStyle, currentNodeColorStyle, nodePaint, nodePaintFallbacks } from ${JSON.stringify(join(root, "src/index/style.ts"))};
import { effectiveLabelLimit, nodeLabelFontSize, gateDiameter, projectNodeCounts, scrollZoneForRole, expandedMiniLayout, siblingScale } from ${JSON.stringify(join(root, "src/ui/layout.ts"))};
import { physicalPositionLabel } from ${JSON.stringify(join(root, "src/ui/features/positionPresentation.ts"))};
import { HoverPreview, bindHoverPreview } from ${JSON.stringify(join(root, "src/ui/components/hoverPreview.ts"))};

const result = document.querySelector("#result");
const check = (condition, message) => { if (!condition) throw new Error(message); };
const warnings = [], originalError = console.error;
console.error = (...args) => { warnings.push(args.map(String).join(" ")); originalError(...args); };
// Native icons are the only thought-rendering host boundary; this scenario has no icon effects.
const ObsidianIcon = () => null;
import {physicalGateStats} from ${JSON.stringify(join(root,"src/ui/plexViews/measurement.ts"))};
import {useGateCountPresentation} from ${JSON.stringify(join(root,'src/ui/useGateCountPresentation.ts'))};
${uiDefinitions("src/ui/ThoughtNode.tsx", ["GATES", "ThoughtNode"])}

const settings = { horizontalCompactingFactor: 2, compactingFactor: 2, baseFontSize: 12.4, wrapNodeLabels: false, showNeighborCount: true, graphDepth: 2, minLinkLength: 18, childColumns: 2, maxItemCount: 100, siblingRelativeSize: 85 };
const translate = (key) => key;
const interaction = { gates: new Set(), nodePaths: new Set() }, connectDrag = null, nodeDrag = null;
const hoverPreview = {current:new HoverPreview()};
// The production unfiltered projection is absent; rename reconciliation must not invent a filtered read.
const globalFiltering = false, filteredGateCounts = null, nodeVisuals = new Map();
const visibleEdgeProjection = {limited:false};
const predicate = null, lenses = { lenses: [] }, paintLenses = lenses, predicateEngine = {}, predicateRevision = 0, layoutRevision = 0;
let styleReads=0;const measuredStyle=()=>new Proxy({textColor:"#abcdef"},{ownKeys(target){styleReads++;return Reflect.ownKeys(target)}});
settings.baseNodeStyle=measuredStyle();let paintSettings=settings;
const graphLensNodeStyle = () => ({});
const occurrenceEditorPolicy = false, editorSwitching = false;
${uiDefinitions("src/ui/PlexGraph.tsx", ["CENTRAL_EDITOR_IMAGE_EXTENSIONS", "CENTRAL_EDITOR_MEDIA_EXTENSIONS", "supportsCentralEditorFile", "supportsBoundEditor"])}
const hasClickModifier=event=>event.altKey||event.ctrlKey||event.metaKey||event.shiftKey;
const centralEditorCapable = true, finding = false, hover = null, crossLinkPeek = null, activeNodeFlair = null, findNodePaths = new Set(), keyboardSelection = null;
const connectionStateFor = () => "normal", onCentralNodeEditorChange = () => {}, centralEditorCanMaximize = true, gateKey = (path, gate) => path + ":" + gate;
const persistentPageFor = (page) => page;
const activePath = "Editor.md", centralEditorAvailable = true, sectionExpanded = false;
// Match the production Classic section-source context used by the extracted renderer.
const sectionDocument = activePath, sectionEditorAvailable = centralEditorAvailable;
const page = (path, materialized = true) => ({ path, name: path, file: materialized ? { extension: "png", path } : null });
const centerPage = page(activePath), attachmentPage = page("Before.png"), placeholderPage = page("After.png", false), sentinelPage = page("Other.png");
const neighborhood = { center: centerPage }, miniPage = page("Descendant.png");
const predicateCenter = centerPage;
const nativeNodeDrag={current:null},viewport={current:null},suppressActivateUntil={current:0},suppressSyntheticClickUntil={current:0},miniOpened=[],activated=[],materialized=[],actionSurfaceId="gesture-fixture";
import {actionNodeRef,resolveActionPage} from ${JSON.stringify(join(root,'src/adapters/obsidian/actionNode.ts'))};
import {captureSurfaceContinuation} from ${JSON.stringify(join(root,'src/ui/surfaceContinuation.ts'))};
const Keymap={isModEvent:event=>event.ctrlKey||event.metaKey},openNode=(...args)=>miniOpened.push(args),clearHoverIntent=()=>{},setExternalDropZone=()=>{};
const runNodeAction=(...args)=>activated.push(args),setPropertyDropArea=()=>{};
${uiDefinitions("src/ui/PlexGraph.tsx", ["isPlaceholderFolderGesture", "isCenterNodeGesture", "activateOccurrence", "activateNode"])}
const manager={draggable:null,dragLink:(event,linktext,sourcePath,title,source)=>({type:"link",linktext,sourcePath,title,source}),onDragStart(event,value){this.draggable=value},onDragEnd(){this.draggable=null}};
const previewed=[];
const plugin={triggerHoverPreview:(page,target,event)=>previewed.push({page,target,ctrl:event.ctrlKey}),actionManager:{dispatch:request=>materialized.push(request),readSnapshot:()=>({mounted:true,viewRevision:0,interactionRevision:0,center:{identity:activePath}})},app:{dragManager:manager,vault:{getFileByPath:path=>[centerPage,attachmentPage,placeholderPage,sentinelPage,miniPage].find(page=>page.file?.path===path)?.file??null}}};
const gates = Object.fromEntries(["top", "bottom", "left", "right"].map((gate) => [gate, { visibleCount: 0, hasAny: false, complete: true }]));
const index = {get:path=>[centerPage,attachmentPage,placeholderPage,sentinelPage,miniPage].find(page=>page.path===path), gateStats: () => gates, neighbours: () => [{ page: miniPage, role: "child", relationType: 1 }], titleFor: (page) => page.name };
const node = (page, role, x, y, height = 26) => ({ page, role, x, y, width: 180, height, style: { fontSize: 18 }, label: page.name, neighbourCount: 0, gateStats: gates });
/** Render actual base nodes with separate zone-local/count-hydrated display copies. */
function Scene({ scene: sourceScene, expanded }) {
  const miniNamePrefix = useId();
  const scene = useMemo(() => ({ ...sourceScene, edges:sourceScene.edges??[], zoneViewports: {}, zoneAreas: {} }), [sourceScene]);
  const centralEditorPage = expanded ? centerPage : null;
  const sectionExpansion = null, expandedScrollTop = useMemo(() => ({}), []);
  const visibleNodePaths = useMemo(() => new Set(scene.nodes.map((item) => item.page.path)), [scene.nodes]);
  const renderedNodeMap = useMemo(() => new Map(scene.nodes.map((item) => [item.page.path, { ...item }])), [scene.nodes]);
  ${uiDefinitions("src/ui/PlexGraph.tsx", ["areaForNode", "isEditorOccurrence", "navigationNode", "isDraggedNode", "paintedNodeStyles", "classicEditorCounts", "sceneNodeKeys", "expandedClusters", "nativeDragRelationship", "beginNativeNodeDrag", "endNativeNodeDrag", "renderNode", "renderExpandedCluster"])}
  const miniKeys = expandedClusters.flatMap((cluster) => cluster.children.map((child) => child.key));
  check(new Set(miniKeys).size === miniKeys.length, "expanded connector keys collide during rename");
  return <><div className="kplex-nodes">{scene.nodes.map((item) => renderNode(item, { ...item }))}</div><div>{expandedClusters.map(renderExpandedCluster)}</div></>;
}

try {
 for (const rebuildDuringRename of [false, true]) {
  attachmentPage.path = "Before.png"; attachmentPage.name = "Before.png"; attachmentPage.file.path = "Before.png";
  const container = document.createElement("div"); document.body.append(container);
  viewport.current=container;const root = createRoot(container);
  const initial = { nodes: [node(centerPage, "center", 0, 0, 380), node(attachmentPage, "child", -100, 300), node(placeholderPage, "child", 100, 300), node(sentinelPage, "child", 0, 350)] };
  const render = (scene, expanded) => flushSync(() => root.render(<Scene scene={scene} expanded={expanded} />));
  const attachments = () => [...container.querySelectorAll(".kplex-thought")].filter((element) => element.dataset.kplexPath === "After.png");
  const clusters = () => container.querySelectorAll(".kplex-expanded-cluster").length;
  render(initial, true);
  const firstStyleReads=styleReads;render(initial,true);render(initial,true);
  check(styleReads===firstStyleReads,"Stable scene rerenders repeated style-dictionary work: "+JSON.stringify({before:firstStyleReads,after:styleReads}));
  paintSettings={...settings,baseNodeStyle:measuredStyle()};render(initial,true);
  check(styleReads>firstStyleReads,"New paint settings failed to re-resolve colors");
  const recoloredReads=styleReads;render(initial,true);check(styleReads===recoloredReads,"New paint cache did not settle");
  check(container.querySelectorAll(".kplex-thought").length === 4, "initial real endpoint and unresolved placeholder were not distinct");
  check(clusters() === 3, "fixture did not render expanded strips through the production owner");
  const ghost=[...container.querySelectorAll('.kplex-thought')].find(element=>element.dataset.kplexPath===placeholderPage.path),beforeActivations=activated.length,beforeMaterializations=materialized.length;
  suppressActivateUntil.current=0;
  for(const modifier of [{ctrlKey:true},{metaKey:true}])flushSync(()=>ghost.dispatchEvent(new MouseEvent('click',{bubbles:true,...modifier})));
  check(activated.length===beforeActivations,'Modified placeholder click navigated away from the current center'
  );check(materialized.length===beforeMaterializations+2&&materialized.every(request=>request.args.chooseFolder&&request.args.preserveCenter&&request.target.node.path===placeholderPage.path),'Modified single click did not request in-place creation');
  flushSync(()=>ghost.dispatchEvent(new MouseEvent('click',{bubbles:true})));
  check(activated.length===beforeActivations+1,'Ordinary placeholder click stopped navigating');
  const real=[...container.querySelectorAll('.kplex-thought')].find(element=>element.dataset.kplexPath===attachmentPage.path);
  flushSync(()=>real.dispatchEvent(new MouseEvent('click',{bubbles:true,ctrlKey:true})));
  check(activated.length===beforeActivations+2,'Modified real-file click was incorrectly reserved for placeholder creation');
  const beforeCenterWrites=materialized.length;
  flushSync(()=>ghost.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,altKey:true,detail:1})));
  check(activated.at(-1)?.[0]==='node.activate'&&activated.at(-1)?.[1]===placeholderPage&&activated.at(-1)?.[3]==='destination','Alt/Option placeholder click did not use shared explicit centering');
  check(materialized.length===beforeCenterWrites,'Alt/Option centering materialized a placeholder');
  const mini=container.querySelector(".kplex-expanded-mini-thought"),transfer=new DataTransfer();
  check(!mini.hasAttribute("aria-label")&&mini.hasAttribute("title"),"Expanded rows retained competing native tooltip sources");
  check(document.getElementById(mini.getAttribute("aria-labelledby"))?.textContent===miniPage.name,"Expanded row lost its full accessible name");
  const beforeCenterDoubleOpen=miniOpened.length;
  flushSync(()=>mini.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,altKey:true,detail:1})));
  check(activated.at(-1)?.[0]==='node.activate'&&activated.at(-1)?.[1]===miniPage&&activated.at(-1)?.[3]==='destination','Expanded Alt/Option click lost explicit center intent');
  flushSync(()=>mini.dispatchEvent(new MouseEvent('dblclick',{bubbles:true,altKey:true,detail:2})));
  check(miniOpened.length===beforeCenterDoubleOpen,'Expanded Alt/Option double-click also opened the file');
  const releasePreview=bindHoverPreview(container,hoverPreview.current),beforePreviews=previewed.length;
  flushSync(()=>mini.dispatchEvent(new PointerEvent('pointerover',{bubbles:true,pointerType:'mouse'})));
  window.dispatchEvent(new KeyboardEvent('keydown',{key:'Control',ctrlKey:true}));
  check(previewed.length===beforePreviews+1&&previewed.at(-1).page===miniPage&&previewed.at(-1).target===mini&&previewed.at(-1).ctrl,'Stationary expanded-row preview lost its exact occurrence');
  flushSync(()=>mini.dispatchEvent(new PointerEvent('pointerout',{bubbles:true,pointerType:'mouse'})));
  window.dispatchEvent(new KeyboardEvent('keyup',{key:'Control'}));window.dispatchEvent(new KeyboardEvent('keydown',{key:'Control',ctrlKey:true}));
  check(previewed.length===beforePreviews+1,'Expanded row retained preview after leave');releasePreview();
  check(mini.draggable,"Expanded descendants do not expose native dragging");
  flushSync(()=>mini.dispatchEvent(new DragEvent("dragstart",{bubbles:true,cancelable:true,dataTransfer:transfer})));
  check(manager.draggable?.linktext===miniPage.path&&manager.draggable?.source.owner===viewport.current&&manager.draggable.source.occurrence?.id===mini.dataset.kplexKeyboardId&&!manager.draggable.source.occurrence.relationship,"Expanded drag did not retain its exact copy-only occurrence");
  flushSync(()=>mini.dispatchEvent(new DragEvent("dragend",{bubbles:true,dataTransfer:transfer})));check(manager.draggable===null,"Expanded native drag did not retire");
  flushSync(()=>mini.dispatchEvent(new MouseEvent("dblclick",{bubbles:true,ctrlKey:true})));check(miniOpened.at(-1)?.[0]===miniPage&&miniOpened.at(-1)?.[1]===undefined,"Real expanded node double-click gained placeholder-only creation behavior");

  // GraphIndex.renameTreeEndpoint intentionally retains canonical page identity and mutates its
  // path; an unrelated React update may reuse the existing scene before its publication commits.
  attachmentPage.path = "After.png"; attachmentPage.name = "After.png"; attachmentPage.file.path = "After.png";
  render(rebuildDuringRename ? { nodes: initial.nodes.map((item) => ({ ...item })) } : initial, true);
  check(attachments().length === 2, "fixture did not exercise the transient rename collision");
  const normalized = { nodes: [node(centerPage, "center", 0, 0, 380), node(sentinelPage, "child", -100, 300), node(attachmentPage, "child", 100, 300)] };
  render(normalized, true);
  check(attachments().length === 1, "rename handover left an attachment outside the current React scene");
  check(container.querySelectorAll(".kplex-thought").length === normalized.nodes.length, "DOM count diverged from the authoritative scene");
  check(clusters() === 2, "rename handover left an orphan expanded strip");
  const collapsed = { nodes: normalized.nodes.map((item) => ({ ...item, y: item.role === "center" ? 0 : 110, height: item.role === "center" ? 48 : item.height })) };
  render(collapsed, false);
  check(attachments().length === 1 && attachments()[0].style.top === "97px", "collapsed editor left an unmoved phantom attachment");
  check(clusters() === 2, "collapsed editor left an orphan expanded strip");
  for (let update = 0; update < 4; update++) {
    render({ nodes: collapsed.nodes.map((item) => ({ ...item, x: item.x + update * 8 })) }, false);
    check(attachments().length === 1, "later layout publication retained a duplicate attachment");
  }
  render({ nodes: collapsed.nodes.filter((item) => item.page !== attachmentPage) }, false);
  check(attachments().length === 0, "attachment removal left orphan DOM");
  check(clusters() === 1, "attachment removal left its expanded strip behind");
  check(warnings.length === 0, "rename rendered duplicate React keys: " + warnings.join(" | "));
  flushSync(() => root.unmount());
  check(container.childElementCount === 0, "scene teardown retained thoughts");
  container.remove();
 }
 result.dataset.status = "passed"; result.textContent = "Attachment rename reconciliation passed";
} catch (error) { result.dataset.status = "failed"; result.textContent = String(error?.stack ?? error); }
finally { console.error = originalError; }
`;
}

test("attachment rename collision retires placeholder DOM through collapse, later layout and unmount", () => {
  runBrowserDom(attachmentRenameBrowserEntry(), "Attachment rename reconciliation passed");
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
  const history=uiDefinitions("src/ui/structuralConnectionActions.ts",["tagMembershipPair"])+uiDefinitions("src/ui/StructuralNodeDropActions.ts",["structuralDropKind"])+uiDefinitions("src/ui/PlexGraph.tsx",["normalizedRole","startNodeDrag","relationshipDropRoles","historyRelationshipTarget","clearHistoryDragHover","updateHistoryDragHover","cancel","lostPointerCapture"]);
  const editor=uiDefinitions("src/ui/CentralNodeEditor.tsx",["CentralNodeEditor"]);
  return `
import {occurrenceKey,edgeOccurrence,edgePhysicalOccurrence,semanticSceneEdge} from ${JSON.stringify(join(root,'src/ui/plexViews/scene.ts'))};
import {classicViewDefinition,classicAreaDropRole,classicPorts} from ${JSON.stringify(join(root,'src/core/plex/views/classic/definition.ts'))};
import * as classicLayout from ${JSON.stringify(join(root,'src/ui/layout.ts'))};
const viewDefinition=classicViewDefinition,viewFailed=false,viewLifetime=0;
const classicFixturePolicy=(layout=classicLayout.buildScene)=>({policyKey:classicLayout.sceneLayoutPolicyKey,geometryKey:classicLayout.neighborhoodSceneKey,
  layout,sections:classicLayout.buildSectionExpandedScene,bind:classicLayout.bindSceneNeighborhood,dropRole:classicAreaDropRole});
const classic=classicFixturePolicy();

import {canDragNodeLink} from ${JSON.stringify(join(root,"src/adapters/obsidian/nodeLinkDrag.ts"))};
import {markdownZoomMode,withMarkdownZoomMode} from ${JSON.stringify(join(root,"src/core/plex/markdownZoomPreferences.ts"))};
import React,{useEffect,useId,useLayoutEffect,useRef,useState} from "react";
import {TooltipButton} from ${JSON.stringify(join(root,"src/ui/components/TooltipButton.tsx"))};
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
 const touchPointers={current:new Map()},cancelTouchLongPress=()=>{if(touchLongPress.current)window.clearTimeout(touchLongPress.current.timer);touchLongPress.current=null};
 const viewport={current:null},neighborhood={center:origin},renderedNodeMap=new Map(),toWorld=(x,y)=>({x,y}),areaOutline={current:null};
 const finishAreaResize=()=>{resizeFinishes++;return true},setAreaHoverIfChanged=()=>areaClears++;
 const setConnectDrag=value=>{connectDrag=value},clearHoverIntent=()=>{};
 ${history}
 const point=button.getBoundingClientRect(),x=point.left+10,y=point.top+10;
 updateHistoryDragHover(origin,x,y,document);check(button.classList.contains("is-relationship-drop-target"),"eligible historical endpoint not highlighted");
 updateHistoryDragHover(origin,1,1,document);check(!button.classList.contains("is-relationship-drop-target"),"leaving the endpoint retained hover");
 target.isTag=true;updateHistoryDragHover(origin,x,y,document);check(button.classList.contains("is-relationship-drop-target"),"saved tag membership endpoint not highlighted");delete target.isTag;
 updateHistoryDragHover(target,x,y,document);check(!button.classList.contains("is-relationship-drop-target"),"self history endpoint highlighted");
 updateHistoryDragHover(origin,x,y,document);cancel({pointerId:7,pointerType:"mouse"});check(connectDrag===null&&!button.classList.contains("is-relationship-drop-target"),"real pointer cancellation retained highlight or drag");
 const viewportElement=document.body.appendChild(document.createElement("div")),gateElement=viewportElement.appendChild(document.createElement("span"));
 viewport.current=viewportElement;
 let capturedPointer=null;const captured=[];viewportElement.setPointerCapture=id=>{capturedPointer=id;captured.push({owner:viewportElement,id})};viewportElement.hasPointerCapture=id=>id===capturedPointer;
 gateElement.setPointerCapture=id=>captured.push({owner:gateElement,id});
 const bodyNode={role:"parent",page:origin,x:20,y:30};relocatedRow=gateElement;
 gateElement.addEventListener("pointerdown",event=>startNodeDrag(bodyNode,event));
 gateElement.dispatchEvent(new PointerEvent("pointerdown",{bubbles:true,pointerId:6,pointerType:"mouse",button:0,clientX:25,clientY:35}));
 check(gateElement.isConnected&&nodeDrag===null&&captured.length===0,"Desktop native drag lost its original source or acquired pointer capture");
 gateElement.dispatchEvent(new PointerEvent("pointerdown",{bubbles:true,pointerId:5,pointerType:"pen",button:0,clientX:25,clientY:35}));
 check(!gateElement.isConnected&&nodeDrag?.pointerId===5&&captured[0]?.owner===viewportElement,"Pen input lost its established pointer-owned relink gesture");
 nodeDrag=null;captured.length=0;viewportElement.append(gateElement);
 gateElement.dispatchEvent(new PointerEvent("pointerdown",{bubbles:true,pointerId:6,pointerType:"touch",button:0,clientX:25,clientY:35}));
 check(!gateElement.isConnected&&nodeDrag?.path===origin.path,"Fixture did not move the original row into a floating layer");
 check(captured.length===1&&captured[0].owner===viewportElement&&captured[0].id===6,"Touch drag captured its removed overflow row instead of the stable viewport");
 cancelTouchLongPress();touchPointers.current.clear();
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
 const props={plugin:{settings:{centralNodeMarkdownZoomModes:{}},index:{titleFor:page=>page.name}},hostLeaf:{},page,defaultMode:"preview",allowMaximize:true,activateHostLeafOnInteraction:false,onModeChange(){},onMaximizedChange(){},onCollapse(){},onNavigate(){},translate:key=>key,onOpenMenu:button=>opened.push(button)};
 for(const maximized of [false,true]){
  flushSync(()=>root.render(React.createElement(CentralNodeEditor,{...props,maximized})));
  check(container.querySelector(".kplex-central-editor-title").textContent==="Example","Editor title missing");
  const menu=[...container.querySelectorAll("button")].find(button=>document.getElementById(button.getAttribute("aria-labelledby"))?.textContent==="graph.openMenu");check(menu instanceof HTMLButtonElement&&menu.type==="button","editor menu button missing or nonsemantic");
  check(menu.lastElementChild.textContent==="ellipsis-vertical"&&!menu.hasAttribute("title")&&!menu.hasAttribute("aria-label"),"shared menu icon/accessibility changed");
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
  const callbacks = uiDefinitions("src/ui/structuralConnectionActions.ts",["tagMembershipPair"])+uiDefinitions("src/ui/StructuralNodeDropActions.ts",["structuralDropKind", "structuralAreaDrop"])+uiDefinitions("src/ui/PlexGraph.tsx", ["normalizedRole", "semanticRoleForGate", "toWorld", "isAreaControlTarget", "isEmptyAreaTarget", "areaHoverAt",
    "relationshipDropRoles", "historyRelationshipTarget", "clearHistoryDragHover", "updateHistoryDragHover", "openHistoryRelationshipMenu",
    "beginNativeNodeDrag", "endNativeNodeDrag", "nativeDragRelationship", "navigationNode", "isDraggedNode", "dropOriginAt", "externalFileDropTarget", "propertyAssignmentAt", "dragExternalFileOver", "leaveExternalFile", "dropExternalFile", "semanticRoleForPosition", "nodeDropRole", "commitNodeAreaDrop", "relationshipDropArea", "up"]);
  return `
import {areaContains} from ${JSON.stringify(join(root,'src/core/contracts/areaGeometry.ts'))};
import {occurrenceKey,edgeOccurrence,edgePhysicalOccurrence,semanticSceneEdge} from ${JSON.stringify(join(root,'src/ui/plexViews/scene.ts'))};
import {classicViewDefinition,classicAreaDropRole,classicPorts} from ${JSON.stringify(join(root,'src/core/plex/views/classic/definition.ts'))};
import * as classicLayout from ${JSON.stringify(join(root,'src/ui/layout.ts'))};
const viewDefinition=classicViewDefinition,viewFailed=false,viewLifetime=0;
const classicFixturePolicy=(layout=classicLayout.buildScene)=>({policyKey:classicLayout.sceneLayoutPolicyKey,geometryKey:classicLayout.neighborhoodSceneKey,
  layout,sections:classicLayout.buildSectionExpandedScene,bind:classicLayout.bindSceneNeighborhood,dropRole:classicAreaDropRole});
let classic=classicFixturePolicy(),occurrenceEditorPolicy=false;

import {getDraggedFile} from ${JSON.stringify(join(root,"src/adapters/obsidian/fileExplorerDrag.ts"))};
import {draggedGraphPage,nodeLinkDragSource,startNodeLinkDrag,finishNodeLinkDrag,isNodeLinkDragCurrent} from ${JSON.stringify(join(root,"src/adapters/obsidian/nodeLinkDrag.ts"))};
import {actionNodeRef,resolveActionPage} from ${JSON.stringify(join(root,'src/adapters/obsidian/actionNode.ts'))};
import {captureSurfaceContinuation} from ${JSON.stringify(join(root,"src/ui/surfaceContinuation.ts"))};
import {plexAreaDropMeaning} from ${JSON.stringify(join(root,"src/core/plex/views/dropTargets.ts"))};
const check=(ok,message)=>{if(!ok)throw new Error(message)},result=document.querySelector("#result");
try {
 const origin={path:"Origin.md",file:{path:"Origin.md",extension:"md"}},target={path:"Dropped.md",file:{path:"Dropped.md",extension:"md"}};
 const pages=new Map([[origin.path,origin],[target.path,target]]),filePaths=new Set([origin.path,target.path]),blocked=new Map();
 const index={get:path=>pages.get(path),isSemanticWriteReady:()=>true,neighbours:(page,role)=>(scene.edges??[]).filter(edge=>edge.sourcePath===page.path&&edge.role===role).map(edge=>({page:pages.get(edge.targetPath),role:edge.role,relationType:edge.relationType,typeDefinition:edge.typeDefinition,linkDirection:edge.direction})),gateNeighbourPaths:(page,gate)=>blocked.get(gate)||new Set()};
 const calls=[],navigated=[],destinationIntents=[],hostLeaf={id:"owning-leaf"},actionSurfaceId="drop-fixture";
 const snapshot={mounted:true,interactionRevision:1,center:{identity:origin.path}};let shown=null,hoverCleared=0;
 const plugin={app:{dragManager:{draggable:{type:"file",file:{path:target.path}}},vault:{getFileByPath:path=>filePaths.has(path)?pages.get(path)?.file??{path}:null}},
  actionManager:{readSnapshot:()=>({...snapshot,center:{...snapshot.center}})},
  openStructuralNodeDrop:()=>false,openRelationModal:options=>calls.push(options),showKplexMenuAtPosition:(menu,point,doc)=>{shown={menu,point,doc}}};
 const translate=key=>key,clearHoverIntent=()=>hoverCleared++,onActivate=(page,intent)=>{navigated.push(page);destinationIntents.push(intent)};
 class Menu {items=[];addItem(build){const item={setTitle(value){this.title=value;return this},setIcon(){return this},onClick(value){this.run=value;return this}};build(item);this.items.push(item)}}
 const surface=document.body.appendChild(document.createElement("div"));surface.style.cssText="position:absolute;left:0;top:0;width:900px;height:650px";
 const nativeNodeDrag={current:null},viewSession=undefined;const viewport={current:surface},camera={current:{x:0,y:0,scale:1}},neighborhood={center:origin},historyDragHover={current:null};
 const settings={lateralArrangement:"split"};
 const externalDropPoint={current:null};let connectDrag=null,nodeDrag=null,externalDropZone=null,propertyDropArea=null;const setExternalDropZone=value=>{externalDropZone=value},setPropertyDropArea=value=>{propertyDropArea=value};const areaResizeDrag={current:null},pendingGateLongPress={current:null},touchLongPress={current:null},suppressActivateUntil={current:0};
 const finishAreaSettingsDismiss=()=>{},setConnectDrag=value=>{connectDrag=value},setNodeDrag=value=>{nodeDrag=value},renderedNodeMap=new Map();
 const optimisticCommitToken={current:0};let optimistic=null,updating=false;
 const setOptimisticRelink=value=>{optimistic=value},setRelationshipUpdating=value=>{updating=value};
 const sceneNodeKeys=new Map();const centerNode={page:origin,role:"center"};const scene={nodes:[centerNode],zoneAreas:{parent:{left:300,top:60,width:110,height:100,resizeEdge:"top"},child:{left:450,top:60,width:110,height:100,resizeEdge:"bottom"},left:{left:300,top:230,width:110,height:100,resizeEdge:"top"},right:{left:450,top:230,width:110,height:100,resizeEdge:"top"}}};
 const ZONES=["parent","child","left","right","sibling"],AREA_RESIZE_EDGE_PX=10,AREA_HEIGHT_CONFIG={parent:{},child:{},left:{},right:{}},AREA_WIDTH_CONFIG={};
 ${callbacks}
 const center=surface.appendChild(document.createElement("div"));center.className="kplex-thought kplex-role-center";center.dataset.kplexPath=origin.path;center.dataset.kplexKeyboardId=origin.path;center.style.cssText="position:absolute;left:60px;top:60px;width:100px;height:100px";
 const other=surface.appendChild(document.createElement("div"));other.className="kplex-thought";other.dataset.kplexPath="Other.md";other.style.cssText="position:absolute;left:320px;top:100px;width:40px;height:30px";
 const control=surface.appendChild(document.createElement("button"));control.style.cssText="position:absolute;left:460px;top:100px;width:40px;height:30px";
 const editor=surface.appendChild(document.createElement("div"));editor.className="kplex-central-editor-overlay";editor.style.cssText="position:absolute;left:60px;top:200px;width:100px;height:100px";
 const event=(x,y)=>({clientX:x,clientY:y,currentTarget:surface,target:document.elementFromPoint(x,y),prevented:false,stopped:false,dataTransfer:{dropEffect:"move"},preventDefault(){this.prevented=true},stopPropagation(){this.stopped=true}});
 let e=event(90,90);dropExternalFile(e);check(e.stopped&&navigated[0]===target&&calls.length===0,"actual center did not navigate the resolved dropped file");
 e=event(90,240);dropExternalFile(e);check(navigated.length===1&&!e.prevented&&!e.stopped,"attention-following native editor did not retain its own drop ownership");
 for(const [role,area] of Object.entries(scene.zoneAreas)) {
  const x=area.left+10,y=area.top+10; e=event(x,y);dragExternalFileOver(e);check(e.dataTransfer.dropEffect==="copy"&&e.stopped&&externalDropZone===role,"eligible area did not accept/highlight drag: "+role);
  leaveExternalFile(event(x+1,y+1));check(externalDropZone===role,"child-to-child leave blinked preview");
  dropExternalFile(e);check(externalDropZone===null,"drop retained area preview");const call=calls.at(-1);check(call.origin===origin&&call.fixedTarget===target&&call.semanticRole===role&&call.hostLeaf===hostLeaf,"rendered semantic area role lost: "+role);
 }
 const completion=calls.at(-1).onCommitted;completion({state:"saved-published",page:target});check(hoverCleared===1,"current drop continuation did not clean its hover");
 snapshot.interactionRevision++;completion({state:"saved-published",page:target});check(hoverCleared===1,"late durable drop completion changed a newer graph interaction");
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
 target.file={path:target.path,extension:"png"};check(relationshipDropRoles(origin,target).length===3,"Markdown origin cannot link attachment endpoint");origin.file={path:origin.path,extension:"png"};check(relationshipDropRoles(origin,target).length===0,"two non-Markdown endpoints incorrectly writable");origin.file={path:origin.path,extension:"md"};target.file={path:target.path,extension:"md"};
 for(const flag of ["isFolder","isTag"]) {target[flag]=true;check(historyRelationshipTarget(origin,40,365,document),"structural saved target rejected");delete target[flag];}
 check(!historyRelationshipTarget(target,40,365,document),"pinned self endpoint accepted");
 const rejectCount=calls.length;origin.file={path:origin.path,extension:"png"};target.isTag=true;connectDrag={pointerId:21,originPath:origin.path,gate:"top",moved:true};up({...event(40,365),pointerId:21,pointerType:"mouse"});
 check(connectDrag===null&&calls.length===rejectCount,"rejected pinned gate fell through into empty composer");delete target.isTag;origin.file={path:origin.path,extension:"md"};
 scene.nodes=[centerNode,{page:target,role:"parent"}];nodeDrag={pointerId:22,path:target.path,startClientX:0,startClientY:0,moved:true};
 const touchDoubleTap={current:{reset(){}}},NODE_RELINK_MIN_DRAG_PX=36,NODE_RELINK_HYSTERESIS_PX=48;up({...event(40,365),pointerId:22,pointerType:"mouse"});
 check(nodeDrag===null&&calls.length===rejectCount,"rejected pinned body fell through into spatial relink");
 updateHistoryDragHover(origin,40,365,document);updateHistoryDragHover(origin,800,600,document);check(!pinned.classList.contains("is-relationship-drop-target"),"leaving pinned endpoint retained highlight");
 const frame=document.body.appendChild(document.createElement("iframe"));frame.style.cssText="position:absolute;left:650px;top:20px;width:200px;height:100px";
 const doc=frame.contentDocument,foreign=doc.body.appendChild(doc.createElement("button"));foreign.dataset.kplexPinnedPath=target.path;foreign.textContent="Other document";
 const rect=foreign.getBoundingClientRect();check(openHistoryRelationshipMenu(origin,rect.left+2,rect.top+2,doc),"owning document pinned hit rejected");check(shown.doc===doc,"chooser escaped owning document");updateHistoryDragHover(origin,rect.left+2,rect.top+2,doc);clearHistoryDragHover();check(!foreign.classList.contains("is-relationship-drop-target"),"owning document highlight leaked");
 // Preview uses the production relink hysteresis and exact fixed/inverse gate semantics.
 scene.nodes=[centerNode,{page:target,role:"left"}];camera.current={x:450,y:200,scale:1};
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
 connectDrag.current={x:330,y:110};check(relationshipDropArea()===null,"node-to-node gate target must not highlight a center relation area");
 target.isFolder=true;check(relationshipDropArea()===null,"structural endpoint highlighted");delete target.isFolder;
 connectDrag={originPath:target.path,gate:"left",current:{x:700,y:300},moved:true};
 check(relationshipDropArea()===null,"noncentral gate origin highlighted a center relation area");
 connectDrag=null;check(relationshipDropArea()===null,"cancel retained area preview");

 // The same real area geometry owns sibling preview and submitted composer intent. Only the
 // center/sibling pair is handed to the additive create flow; shared-parent evidence stays intact.
 const sibling={page:target,role:"sibling",linkDirection:"shared-parent"};scene.nodes=[centerNode,sibling];
 blocked.clear();
 for(const [role,x,y]of [["parent",350,80],["child",510,80],["left",350,280],["right",510,280]]){
  nodeDrag={path:target.path,pointerId:31,x,y,offsetX:0,offsetY:0,startClientX:800,startClientY:550,moved:true};
  renderedNodeMap.set(target.path,{...sibling,x,y});
  check(relationshipDropArea()===role,"sibling did not preview exact area: "+role);
  const before=calls.length;up({...event(x,y),pointerId:31,pointerType:"mouse"});
  const opened=calls.at(-1);check(calls.length===before+1&&opened.mode==="create"&&opened.origin===origin&&opened.fixedTarget===target&&opened.semanticRole===role,"sibling drop did not add the center relation: "+role);
  check(opened.existingDirection===undefined&&sibling.linkDirection==="shared-parent","sibling shared-parent relation was treated as a moved direct relation");
  check(nodeDrag===null,"sibling drag did not retire");
 }
 blocked.set("left",new Set([target.path]));const duplicateCount=calls.length;
 commitNodeAreaDrop(sibling,"left");check(calls.length===duplicateCount,"duplicate sibling role bypassed canonical drop eligibility");blocked.clear();
 nodeDrag={path:target.path,pointerId:32,x:700,y:500,offsetX:0,offsetY:0,startClientX:800,startClientY:550,moved:true};
 check(relationshipDropArea()===null,"sibling accepted empty canvas outside real areas");nodeDrag=null;
 pages.delete(target.path);e=event(90,90);dragExternalFileOver(e);check(externalDropZone==="center","unindexed center did not preview queued navigation");e=event(90,90);dropExternalFile(e);check(!e.stopped,"unindexed center drop lost App readiness fallback");
 // Non-Classic targets are declared geometry/ports, never screen-quadrant relationship evidence.
 pages.set(target.path,target);classic=null;occurrenceEditorPolicy=true;camera.current={x:0,y:0,scale:1};scene.entryOccurrence="map-root";scene.projection={root:"map-root"};center.dataset.kplexKeyboardId="map-root";
 const rootOccurrence={...centerNode,occurrenceId:"map-root",physicalPorts:{top:"parent",bottom:"child",left:"left"}},nested={page:target,role:"child",occurrenceId:"copy-one",semanticSourceId:"Some-other-parent",linkDirection:1};
 scene.nodes=[rootOccurrence,nested,{...nested,occurrenceId:"copy-two"}];scene.areas=[{id:"parent",dropRole:"parent"},{id:"child",dropRole:"child"},{id:"left",dropRole:"left"},{id:"right"}];
 const previousNav=navigated.length;dropExternalFile(event(90,90));check(navigated.length===previousNav+1&&destinationIntents.at(-1)==="destination","rooted center drop lost explicit destination intent");
 const editorNavigation=navigated.length;const editorDrop=event(90,240);dropExternalFile(editorDrop);check(navigated.length===editorNavigation&&!editorDrop.prevented&&!editorDrop.stopped,"occurrence editor drop retargeted map instead of retaining native edit ownership");
 externalDropZone="parent";const editorOver=event(90,240);dragExternalFileOver(editorOver);check(!editorOver.prevented&&!editorOver.stopped&&editorOver.dataTransfer.dropEffect==="move"&&externalDropZone===null,"occurrence editor drag-over suppressed native drop delivery or retained old canvas feedback");
 const beforeNested=calls.length;commitNodeAreaDrop(nested,"parent");check(calls.length===beforeNested+1&&calls.at(-1).origin===origin&&calls.at(-1).mode==="create"&&calls.at(-1).existingDirection===undefined,"nested copy borrowed unrelated parent-to-child move authority");
 nodeDrag={path:target.path,occurrenceId:"copy-one"};check(isDraggedNode(nested)&&!isDraggedNode(scene.nodes[2]),"dragging one canonical copy hid another occurrence");nodeDrag=null;
 const neutralCount=calls.length;dropExternalFile(event(510,280));check(calls.length===neutralCount,"classification-only area became a relationship writer");
 scene.areas[0].dropOrigin="copy-one";check(dropOriginAt(310,70,surface)===target,"explicit area origin lost exact admitted occurrence");scene.areas[0].dropOrigin="retired-copy";check(dropOriginAt(310,70,surface)===undefined,"removed area origin borrowed root authority");
 scene.areas[0].dropOrigin=undefined;pages.delete(origin.path);check(dropOriginAt(310,70,surface)===undefined,"stale canonical area origin was accepted");
 // Actual desktop HTML start must carry the second displayed copy through the shared adapter.
 const cPage={path:"C.md",file:{path:"C.md",extension:"md"}};pages.set(cPage.path,cPage);
 origin.file={path:origin.path,extension:"md"};target.file={path:target.path,extension:"md"};
 plugin.app.vault.getFileByPath=path=>pages.get(path)?.file??null;
 plugin.app.dragManager={draggable:null,dragLink(event,linktext,sourcePath,title,source){event.dataTransfer.setData("text/plain",linktext);return{type:"link",linktext,sourcePath,title,source}},onDragStart(event,value){this.draggable=value},onDragEnd(){this.draggable=null}};
 const first={...nested,occurrenceId:"copy-one",semanticSourceId:origin.path},second={...nested,occurrenceId:"copy-two",semanticSourceId:cPage.path};
 const cOccurrence={page:cPage,role:"child",occurrenceId:"c"};scene.nodes=[rootOccurrence,first,second,cOccurrence];sceneNodeKeys.clear();for(const row of scene.nodes)sceneNodeKeys.set(row,row.occurrenceId);
 scene.areas[0].dropOrigin=undefined;pages.set(origin.path,origin);
 scene.edges=[{kind:"semantic",sourcePath:origin.path,targetPath:target.path,sourceOccurrence:"map-root",targetOccurrence:"copy-one",role:"child",direction:1,relationType:1,typeDefinition:"Child"},{kind:"semantic",sourcePath:cPage.path,targetPath:target.path,sourceOccurrence:"c",targetOccurrence:"copy-two",role:"child",direction:1,relationType:1,typeDefinition:"Child"}];
 other.removeAttribute("data-kplex-gate");other.dataset.kplexKeyboardId="copy-two";other.dataset.kplexPath=target.path;other.draggable=true;
 let displayedDragRole="child";const startHandler=event=>beginNativeNodeDrag(target,displayedDragRole,"B",{nativeEvent:event,currentTarget:other,preventDefault:()=>event.preventDefault()});other.addEventListener("dragstart",startHandler);
 const transfer=new DataTransfer();other.dispatchEvent(new DragEvent("dragstart",{bubbles:true,cancelable:true,dataTransfer:transfer}));
 const captured=plugin.app.dragManager.draggable?.source;check(captured,"Actual drag-start failed to capture source");
 const prior=calls.length;dropExternalFile(event(310,70));
 check(calls.length===prior+1&&calls.at(-1).mode==="create"&&calls.at(-1).origin===origin&&calls.at(-1).fixedTarget===target&&calls.at(-1).existingDirection===undefined,"Desktop second C→B copy borrowed first R→B relink authority: "+JSON.stringify({mode:calls.at(-1)?.mode,origin:calls.at(-1)?.origin.path}));
 endNativeNodeDrag();scene.areas[0].dropOrigin="c";other.dispatchEvent(new DragEvent("dragstart",{bubbles:true,cancelable:true,dataTransfer:new DataTransfer()}));dropExternalFile(event(310,70));
 check(calls.at(-1).mode==="relink"&&calls.at(-1).origin===cPage&&calls.at(-1).fixedTarget===target,"Explicit C area failed to retain the second occurrence's legitimate relationship");
 endNativeNodeDrag();scene.areas[0].dropOrigin=undefined;
 // Compass combines sequential roles into physical left/right placement; capture their real role.
 classic=classicFixturePolicy();occurrenceEditorPolicy=false;
 for(const [displayRole,semanticRole]of [["left","previous"],["right","next"]]){
  const id="sequential-"+semanticRole,row={...first,role:displayRole,occurrenceId:id};scene.nodes=[rootOccurrence,row];sceneNodeKeys.clear();sceneNodeKeys.set(rootOccurrence,"map-root");sceneNodeKeys.set(row,id);
  scene.edges=[{kind:"semantic",sourcePath:origin.path,targetPath:target.path,sourceOccurrence:"map-root",targetOccurrence:id,role:displayRole,direction:1,relationType:1,typeDefinition:"Sequential"}];
  index.neighbours=(page,role)=>page===origin&&role===semanticRole?[{page:target,role:semanticRole,linkDirection:1,relationType:1,typeDefinition:"Sequential"}]:[];
  other.dataset.kplexKeyboardId=id;displayedDragRole=displayRole;other.dispatchEvent(new DragEvent("dragstart",{bubbles:true,cancelable:true,dataTransfer:new DataTransfer()}));
  check(plugin.app.dragManager.draggable?.source.occurrence.relationship?.role===semanticRole,"Compass sequential canonical role was replaced by physical placement");dropExternalFile(event(310,70));
  check(calls.at(-1).mode==="relink"&&calls.at(-1).origin===origin,"Compass sequential primary move lost its existing authority");endNativeNodeDrag();
 }
 other.removeEventListener("dragstart",startHandler);
 result.dataset.status="passed";result.textContent="External and pinned drop behavior passed";
}catch(error){result.dataset.status="failed";result.textContent=String(error.stack||error)}
`;
}

test("External file areas and pinned relationship targets use shared production routing",()=>{
  const app=readFileSync(join(root,"src/ui/App.tsx"),"utf8");
  assert.match(app, /className="kplex-pinned-open" data-kplex-pinned-path=\{pinned.path\}/);
  runBrowserDom(externalAndPinnedDropBrowserEntry(),"External and pinned drop behavior passed");
});

/** Verify painted gate coordinates and approach directions through real zoomed, scrolled DOM. */
function draftConnectorBrowserEntry() {
  const callbacks = uiDefinitions("src/ui/PlexGraph.tsx", ["gateVector", "cubicPoint", "edgeGeometry", "oppositeGate", "toWorld", "connectionDragPath"]);
  return `
const result=document.querySelector("#result"),check=(ok,message)=>{if(!ok)throw Error(message)};
try{
 const surface=document.body.appendChild(document.createElement("div"));surface.style.cssText="position:absolute;left:10px;top:20px;width:900px;height:700px";
 const camera={current:{x:40,y:40,scale:1.25}},viewport={current:surface},settings={connectorStyle:"bezier"};
 const layer=surface.appendChild(document.createElement("div"));layer.style.cssText="position:absolute;left:0;top:0;transform-origin:0 0;transform:translate(40px,40px) scale(1.25)";
 const scroll=layer.appendChild(document.createElement("div"));scroll.style.cssText="position:absolute;left:20px;top:30px;width:600px;height:260px;overflow:auto";
 const content=scroll.appendChild(document.createElement("div"));content.style.cssText="position:relative;height:800px";
 const make=(path,left,top)=>{const node=content.appendChild(document.createElement("div"));node.dataset.kplexPath=path;node.style.cssText="position:absolute;width:44px;height:28px;left:"+left+"px;top:"+top+"px";const gate=node.appendChild(document.createElement("span"));gate.dataset.kplexGate="left";gate.style.cssText="position:absolute;left:-14px;top:7px;width:14px;height:14px";return gate};
 const source=make("Source.md",36,200),target=make("Target.md",330,240),page={path:"Target.md"};
 const index={get:path=>path===page.path?page:null},connectBlockedPaths=new Set();
 let connectDrag={originPath:"Source.md",sourceGateElement:source,gate:"left",current:{x:0,y:0}};
 ${callbacks}
 for(const top of [90,160])for(const side of ["left","right","top","bottom"]){
  scroll.scrollTop=top;target.dataset.kplexGate=side;
  const a=source.getBoundingClientRect(),b=target.getBoundingClientRect();
  // Deliberately hover away from the port center; snapping must select its actual painted center.
  connectDrag.current=toWorld(b.left+2,b.top+2);
  check(surface.ownerDocument.elementFromPoint(b.left+2,b.top+2)===target,"Fixture target is clipped/covered");
  const values=connectionDragPath().match(/-?\\d+(?:\\.\\d+)?/g).map(Number),start=toWorld(a.left+a.width/2,a.top+a.height/2),end=toWorld(b.left+b.width/2,b.top+b.height/2);
  check(Math.abs(values[0]-start.x)<0.001&&Math.abs(values[1]-start.y)<0.001,"draft origin escaped the visible scrolled gate");
  check(Math.abs(values[6]-end.x)<0.001&&Math.abs(values[7]-end.y)<0.001,"draft failed to snap to target gate center");
  const vector=gateVector(side);check((values[4]-end.x)*vector.x+(values[5]-end.y)*vector.y>0,"target gate approach is reversed: "+side);
 }
 source.remove();check(connectionDragPath()===null,"detached gate retained a draft connector");
 result.dataset.status="passed";result.textContent="Draft connector gate geometry passed";
}catch(error){result.dataset.status="failed";result.textContent=String(error.stack||error)}
`;
}

test("draft connectors follow actual scrolled gates and the destination gate direction",()=>{
  runBrowserDom(draftConnectorBrowserEntry(),"Draft connector gate geometry passed");
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

/** Exercise the selection-only owner in two realms, including ordinary boundary crossing.
 * Shared Scope/DOM delivery is covered by action-surface-ui. */
function plexKeyboardBrowserEntry() {
  return `
import React from "react";
import {createRoot} from "react-dom/client";
import {flushSync} from "react-dom";
import {usePlexKeyboardNavigation} from ${JSON.stringify(join(root, "src/ui/usePlexKeyboardNavigation.ts"))};
const result=document.querySelector("#result");
const check=(ok,message)=>{if(!ok)throw new Error(message)};
const nodes=[{id:"center",section:"center",x:0,y:0,path:"center",label:"Center"},{id:"left",section:"left",x:-200,y:0,path:"left",label:"Left"},
 {id:"p1",section:"parent",x:-40,y:-200,path:"p1",label:"Parent one"},{id:"p2",section:"parent",x:40,y:-200,path:"p2",label:"Parent two"}];
try {
 const frames=[document,(()=>{const f=document.createElement("iframe");document.body.append(f);return f.contentDocument})()];
 for(const doc of frames){
  const container=doc.createElement("div");doc.body.append(container);
  let normalMode=true,activePath="center",projection=nodes,reveals=[],selection;
  function Surface(){selection=usePlexKeyboardNavigation({normalMode,activePath,nodes:projection,reveal:n=>reveals.push(n.id)});
   return React.createElement("div",{className:"kplex-app",tabIndex:0,"data-selection":selection.selectedId??""})}
  const app=createRoot(container),render=()=>flushSync(()=>app.render(React.createElement(Surface)));render();
  const el=container.firstElementChild;
  const move=(direction,section=false)=>flushSync(()=>selection.move(direction,section));
  move("up");check(el.dataset.selection==="p1","plain movement did not cross the exhausted center area");
  move("down",true);move("up",true);check(el.dataset.selection==="p1","section jump did not enter parent area");
  move("right");check(el.dataset.selection==="p2","grid movement did not select adjacent column");
  move("down",true);check(el.dataset.selection==="center","section jump did not return to center");
  render();move("up");check(el.dataset.selection==="p1","ordinary boundary movement did not enter parent area");
  normalMode=false;render();check(selection.readSelected()===null&&el.dataset.selection==="","inactive graph retained selection");
  normalMode=true;render();check(selection.readSelected()===null,"mode restore resurrected retired selection");
  move("up",true);move("right");check(el.dataset.selection==="p2","selection after mode restoration failed");
  projection=nodes.filter(n=>n.id!=="p2");render();check(el.dataset.selection==="","removed selection retained");
  move("left",true);check(el.dataset.selection==="left","section jump after filtering failed");
  activePath="other-center";render();check(el.dataset.selection==="","center change retained old keyboard selection");
  activePath="center";render();check(el.dataset.selection==="","returning to an old center resurrected its selection");
  move("up");flushSync(()=>selection.select(null));check(el.dataset.selection==="","explicit pointer selection retirement failed");
  flushSync(()=>app.unmount());container.remove();
 }
 result.dataset.status="passed";result.textContent="Plex keyboard selection and ownership passed";
}catch(error){result.dataset.status="failed";result.textContent=error.stack}
`;
}
test("Plex selection controller preserves mode, section policy, projection and owning-realm cleanup",()=>{
  runBrowserDom(plexKeyboardBrowserEntry(),"Plex keyboard selection and ownership passed");
});

/** Exercise the native hotkey row with real DOM, preserving the public SDK and keymap boundary. */
function internalHotkeySettingsBrowserEntry() {
 return `
import {createTranslator} from ${JSON.stringify(join(root,"src/lang/index.ts"))};
import {captureInternalHotkey, internalBindingEvent, INTERNAL_HOTKEY_ACTIONS, INTERNAL_HOTKEY_DEFAULTS, matchesInternalHotkey, sanitizeInternalHotkeys} from ${JSON.stringify(join(root,"src/core/plex/internalHotkeys.ts"))};
import {formatShortcut} from ${JSON.stringify(join(root,"src/core/plex/shortcutPresentation.ts"))};
const result=document.querySelector("#result"),check=(ok,message)=>{if(!ok)throw new Error(message)};
let convention="macos";
const readObsidianPresentationEnvironment=()=>({keyConvention:convention,inputModes:{keyboard:true}});
class Scope {register(modifiers,key,handler){this.handler=handler;return {handler}}}
class ExtraButtonComponent {
 constructor(container){this.extraSettingsEl=container.createDiv("clickable-icon")}
 setIcon(icon){this.extraSettingsEl.dataset.icon=icon;return this}
 setTooltip(label){this.extraSettingsEl.setAttribute("aria-label",label);return this}
 onClick(callback){this.extraSettingsEl.addEventListener("click",callback);return this}
}
${uiDefinitions("src/ui/internalHotkeySettings.ts",["ACTION_LABELS","renderHotkeyRow","internalHotkeySettings"])}
try {
 const frame=document.createElement("iframe");document.body.append(frame);
 for(const [doc,os] of [[document,"macos"],[frame.contentDocument,"windows"]]) {
  convention=os;
  const proto=doc.defaultView.HTMLElement.prototype;
  proto.addClass=function(...classes){this.classList.add(...classes)};
  proto.removeClass=function(...classes){this.classList.remove(...classes)};
  proto.createDiv=function(cls){const el=doc.createElement("div");if(cls)el.className=cls;this.append(el);return el};
  proto.createSpan=function(cls){const el=doc.createElement("span");if(cls)el.className=cls;this.append(el);return el};
  proto.setAttr=function(name,value){this.setAttribute(name,value)};
  proto.setText=function(text){this.textContent=text};
  proto.toggle=function(show){this.style.display=show?"":"none"};
  proto.toggleClass=function(name,on){this.classList.toggle(name,on)};
  const translate=createTranslator("en");let bindings=sanitizeInternalHotkeys();
  const scopes=[],baseScope={name:"Settings"};scopes.push(baseScope);
  const keymap={pushScope(scope){scopes.push(scope)},popScope(scope){const i=scopes.indexOf(scope);check(i>0,"Recorder popped another scope");scopes.splice(i,1)}};
  const page=internalHotkeySettings(()=>bindings,(action,binding)=>{bindings={...bindings,[action]:binding}},translate,keymap);
  const host=doc.body.appendChild(doc.createElement("div")),control=host.createDiv();
  const row={settingEl:host,controlEl:control,setDesc(text){host.dataset.description=text}};
  const release=page.items[1].render(row);
  const plus=control.querySelector(".setting-add-hotkey-button"),remove=control.querySelector(".setting-delete-hotkey"),restore=control.querySelector(".setting-restore-hotkey-button"),pill=control.querySelector(".setting-hotkey");
  const key=(key,extra={},native=false)=>{const event=new doc.defaultView.KeyboardEvent("keydown",{key,bubbles:true,cancelable:true,...extra});if(native&&scopes.at(-1).handler)scopes.at(-1).handler(event);else plus.dispatchEvent(event);return event};
  check(pill.textContent==="↓"&&restore.style.display==="none","Default pill/restore state wrong");
  for(const el of [plus,remove,restore])check(el.getAttribute("role")==="button"&&el.tabIndex===0&&el.getAttribute("aria-label")&&!el.hasAttribute("title"),"Icon accessibility or duplicate tooltip wrong");
  remove.click();check(bindings.moveDown===null&&pill.parentElement.style.display==="none"&&restore.style.display!=="none","Delete failed to disable the chord");
  plus.focus();key("Enter");check(scopes.length===2&&plus.getAttribute("aria-pressed")==="true","Keyboard customize did not acquire recorder scope");
  key("Control",{},true);check(scopes.length===2,"Modifier-only input ended recording");
  key("j",{code:"KeyJ",metaKey:os==="macos",ctrlKey:os!=="macos"},true);
  check(bindings.moveDown.key==="j"&&scopes.length===1&&pill.textContent.includes(os==="macos"?"⌘ J":"Control J"),"Native recording/display did not resolve platform modifier");
  plus.click();key("Escape",{},true);check(scopes.length===1&&bindings.moveDown.key==="j","Escape failed to cancel recording");
  plus.click();key("ArrowUp",{},true);check(scopes.length===1&&bindings.moveDown.key==="j"&&host.dataset.description.includes("Already assigned"),"Conflict overwrote chord or lost feedback");
  plus.click();plus.dispatchEvent(new doc.defaultView.FocusEvent("blur"));check(scopes.length===1,"Blur leaked recorder scope");
  restore.click();check(bindings.moveDown.key==="ArrowDown"&&restore.style.display==="none","Restore failed to return default");
  plus.click();release();check(scopes.length===1,"Page teardown retained recorder scope");
  key("j");check(bindings.moveDown.key==="ArrowDown","Detached recorder retained event listener");host.remove();
 }
 result.dataset.status="passed";result.textContent="Native hotkey pills and recording lifecycle passed";
}catch(error){result.dataset.status="failed";result.textContent=error.stack}
`;
}
test("Native hotkey pills support disable, customize, restore, conflicts and recording cleanup",()=>{
 runBrowserDom(internalHotkeySettingsBrowserEntry(),"Native hotkey pills and recording lifecycle passed");
});

/** Keep native compact titles separate from accessible naming without altering gate or preview ownership. */
function nodeTooltipBrowserEntry() {
 return `
import React, {useId} from 'react';
import {flushSync} from 'react-dom';
import {createRoot} from 'react-dom/client';
import {nodePaint,nodePaintFallbacks} from ${JSON.stringify(join(root,'src/index/style.ts'))};
import {effectiveLabelLimit,nodeLabelFontSize,gateDiameter} from ${JSON.stringify(join(root,'src/ui/layout.ts'))};
import {physicalPositionLabel} from ${JSON.stringify(join(root,'src/ui/features/positionPresentation.ts'))};
import {canDisplayNodeImage} from ${JSON.stringify(join(root,'src/core/plex/nodeImagePolicy.ts'))};
import {createTranslator} from ${JSON.stringify(join(root,'src/lang/index.ts'))};
import {HoverPreview,bindHoverPreview} from ${JSON.stringify(join(root,'src/ui/components/hoverPreview.ts'))};
const ObsidianIcon=()=>null;
import {physicalGateStats} from ${JSON.stringify(join(root,"src/ui/plexViews/measurement.ts"))};
import {useGateCountPresentation} from ${JSON.stringify(join(root,'src/ui/useGateCountPresentation.ts'))};
${uiDefinitions('src/ui/ThoughtNode.tsx',['GATES','ThoughtNode'])}
const result=document.querySelector('#result'),container=document.body.appendChild(document.createElement('div')),root=createRoot(container);
const check=(condition,message)=>{if(!condition)throw Error(message)},translate=createTranslator('en'),noop=()=>{};
const label='A long meaningful note name',page={path:'Folder/Original.md',name:label},gates=Object.fromEntries(['top','bottom','left','right'].map(gate=>[gate,{visibleCount:0,complete:true,hasAny:false}]));
const node={page,label,role:'child',style:{prefix:'@ ',maxLabelLength:8},x:0,y:0,width:180,height:40,gateStats:gates},settings={baseFontSize:12.4,showNeighborCount:false};
const events={preview:0,node:0,gate:0,end:0};
const preview=new HoverPreview(),releasePreview=bindHoverPreview(container,preview);
const props={node,settings,selected:false,highlighted:false,dimmed:false,highlightedGates:new Set(),translate,onActivate:noop,onOpen:noop,onHoverNode:()=>events.node++,onHoverGate:()=>events.gate++,onHoverEnd:()=>{events.end++;preview.clear()},onHoverPreview:(_,target,event)=>preview.enter(target,event,()=>events.preview++),onGatePointerDown:noop,onNodePointerDown:noop};
try{
 let firstNameId;
 for(const mode of [null,'thumbnail','replace']){
  const visual=mode?{mode,path:'Picture.png',src:'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==',alt:'Local picture'}:undefined;
  flushSync(()=>root.render(<ThoughtNode {...props} visual={visual}/>));
  const element=container.querySelector('.kplex-thought'),nameId=element.getAttribute('aria-labelledby'),name=document.getElementById(nameId);
  check(name&&name.classList.contains('kplex-accessible-name'),'Node lost its established accessible-name mechanism');
  check(name.textContent===translate('node.accessibleLabel',{label,path:page.path}),'Localized accessible name lost note label/path');
  check(!element.hasAttribute('aria-label')&&!element.hasAttribute('title'),'Node reintroduced a competing host tooltip');
  check(firstNameId===undefined||nameId===firstNameId,'Same mounted node changed its accessible name identity');firstNameId=nameId;
  const text=container.querySelector('.kplex-thought-text');
  if(mode!=='replace')check(text.title==='@ '+label&&text.textContent==='@ A lon…','Compact full-title hint or visible truncation changed');
  if(mode)check(container.querySelector('.kplex-node-visual').title===visual.alt,'Image compact title changed');
  for(const gate of container.querySelectorAll('.kplex-gate'))check(gate.getAttribute('aria-label')&&!gate.hasAttribute('title'),'Gate native hint/accessibility changed');
 }
 const element=container.querySelector('.kplex-thought');
 element.dispatchEvent(new PointerEvent('pointerover',{bubbles:true,pointerType:'mouse'}));
 check(events.node===1&&events.preview===0,'Unmodified pointer unexpectedly opened page preview');
 window.dispatchEvent(new KeyboardEvent('keydown',{key:'Control',ctrlKey:true}));
 check(events.preview===1,'Stationary Ctrl did not open preview');
 window.dispatchEvent(new KeyboardEvent('keydown',{key:'Control',ctrlKey:true,repeat:true}));
 check(events.preview===1,'Held Ctrl repeated the preview');
 window.dispatchEvent(new KeyboardEvent('keyup',{key:'Control'}));
 window.dispatchEvent(new KeyboardEvent('keydown',{key:'Meta',metaKey:true}));
 check(events.preview===2,'Stationary Cmd did not reopen preview');
 window.dispatchEvent(new KeyboardEvent('keyup',{key:'Meta'}));
 element.dispatchEvent(new PointerEvent('pointerout',{bubbles:true,pointerType:'mouse'}));
 element.dispatchEvent(new PointerEvent('pointerover',{bubbles:true,pointerType:'mouse',ctrlKey:true}));
 check(events.preview===3&&events.node===2,'Explicit page preview stopped forwarding');
 const gate=container.querySelector('.kplex-gate');
 element.dispatchEvent(new PointerEvent('pointerout',{bubbles:true,pointerType:'mouse',relatedTarget:gate}));
 gate.dispatchEvent(new PointerEvent('pointerover',{bubbles:true,pointerType:'mouse',relatedTarget:element}));
 check(events.gate===1,'Gate hover ownership changed');
 flushSync(()=>root.render(<><ThoughtNode {...props}/><ThoughtNode {...props}/></>));
 const ids=[...container.querySelectorAll('.kplex-thought')].map(node=>node.getAttribute('aria-labelledby'));
 check(ids.length===2&&new Set(ids).size===2&&ids.every(id=>document.getElementById(id)),'Repeated node occurrences share accessible-name IDs');
 result.dataset.status='passed';result.textContent='Node tooltip ownership passed';
}catch(error){result.dataset.status='failed';result.textContent=String(error?.stack??error)}finally{releasePreview();flushSync(()=>root.unmount());container.remove()}
`;
}

test('nodes retain compact delayed titles and accessible names without a duplicate styled tooltip owner',()=>{
 runBrowserDom(nodeTooltipBrowserEntry(),'Node tooltip ownership passed');
});

/** Render the real gate markup across partial/cached/unavailable structural count states. */
function structuralGateCountsBrowserEntry() {
 return `
import React, {useId} from 'react';
import {flushSync} from 'react-dom';
import {createRoot} from 'react-dom/client';
import {nodePaint,nodePaintFallbacks} from ${JSON.stringify(join(root,'src/index/style.ts'))};
import {effectiveLabelLimit,nodeLabelFontSize,gateDiameter} from ${JSON.stringify(join(root,'src/ui/layout.ts'))};
import {physicalPositionLabel} from ${JSON.stringify(join(root,'src/ui/features/positionPresentation.ts'))};
import {canDisplayNodeImage} from ${JSON.stringify(join(root,'src/core/plex/nodeImagePolicy.ts'))};
const ObsidianIcon=()=>null;
import {physicalGateStats} from ${JSON.stringify(join(root,"src/ui/plexViews/measurement.ts"))};
import {useGateCountPresentation} from ${JSON.stringify(join(root,'src/ui/useGateCountPresentation.ts'))};
${uiDefinitions('src/ui/ThoughtNode.tsx',['GATES','ThoughtNode'])}
const result=document.querySelector('#result'),container=document.body.appendChild(document.createElement('div')),root=createRoot(container),noop=()=>{};
const check=(condition,message)=>{if(!condition)throw Error(message)};
try{
 const settings={baseFontSize:12.4,showNeighborCount:true};
 const node={page:{path:'ordinary',name:'Name'},label:'Name',role:'child',style:{},x:0,y:0,width:180,height:40};
 const props={node,settings,selected:false,highlighted:false,dimmed:false,highlightedGates:new Set(),translate:key=>key,onActivate:noop,onOpen:noop,onHoverNode:noop,onHoverGate:noop,onHoverEnd:noop,onHoverPreview:noop,onGatePointerDown:noop,onNodePointerDown:noop};
 for(const kind of ['tag','folder','ordinary'])for(const coverage of [undefined,'local','cached'])for(const unavailable of [false,true]){
  node.page.isTag=kind==='tag';node.page.isFolder=kind==='folder';
  node.gateStats=Object.fromEntries(['top','bottom','left','right'].map(side=>[side,{visibleCount:0,hasAny:false,complete:false,coverage,countUnavailable:unavailable}]));
  flushSync(()=>root.render(<ThoughtNode {...props}/>));
  for(const side of ['left','right']){
   const text=container.querySelector('.gate-wrap-'+side+' .kplex-gate-count')?.textContent;
   check(text===(kind==='ordinary'?(unavailable||coverage===undefined?'…':'0'):'0'),'Incorrect lateral display: '+kind+'/'+coverage+'/'+unavailable+'/'+text);
   if(kind!=='ordinary')check(!container.querySelector('.gate-'+side).getAttribute('aria-label').includes('node.gateHostUnavailable'),'Structural zero inherited an unrelated unavailable tooltip');
  }
  check(container.querySelector('.gate-wrap-top .kplex-gate-count'),'Structural lateral rule incorrectly hid unresolved hierarchy counts');
 }
 node.page={path:'Stable.md',name:'Stable'};
 node.gateStats=Object.fromEntries(['top','bottom','left','right'].map(side=>[side,{visibleCount:side==='top'?2:0,hasAny:side==='top',complete:true}]));
 flushSync(()=>root.render(<ThoughtNode {...props}/>));
 const badge=container.querySelector('.gate-wrap-top .kplex-gate-count'),observation=new MutationObserver(()=>{});
 observation.observe(container,{subtree:true,childList:true,characterData:true});
 for(const stat of Object.values(node.gateStats))stat.complete=false;
 flushSync(()=>root.render(<ThoughtNode {...props}/>));
 check(container.querySelector('.gate-wrap-top .kplex-gate-count')===badge&&badge.textContent==='2','Unchanged displayed total flickered to a weaker qualifier');
 check(!container.querySelector('.gate-wrap-bottom .kplex-gate-count'),'An unchanged empty gate flashed an unknown/zero badge');
 check(observation.takeRecords().length===0,'Revalidation changed badge DOM despite unchanged values');
 check(node.gateStats.top.complete===false,'Presentation continuity mutated the count proof');
 check(container.querySelector('.gate-top').getAttribute('aria-label').includes('node.gateCachedCount'),'Retained display lacks its cached qualifier');
 node.gateStats.top.visibleCount=3;flushSync(()=>root.render(<ThoughtNode {...props}/>));check(badge.textContent==='≥3','Real count change did not publish immediately');
 node.gateStats.top.complete=true;flushSync(()=>root.render(<ThoughtNode {...props}/>));check(badge.textContent==='3','Complete proof did not upgrade the lower bound');
 node.gateStats.top.countUnavailable=true;flushSync(()=>root.render(<ThoughtNode {...props}/>));check(badge.textContent==='…','Unavailable input was hidden behind a retained value');
 delete node.gateStats.top.countUnavailable;node.gateStats.top.complete=false;node.page={path:'Other.md',name:'Other'};
 flushSync(()=>root.render(<ThoughtNode {...props}/>));check(badge.textContent==='≥3','Navigation inherited the previous node count proof');
 node.gateStats.top.complete=true;node.page.file={};flushSync(()=>root.render(<ThoughtNode {...props}/>));check(badge.textContent==='3','Current native incarnation did not display complete proof');
 node.page.file={};node.gateStats.top.complete=false;flushSync(()=>root.render(<ThoughtNode {...props}/>));check(badge.textContent==='≥3','Same-path recreation inherited an old native count label');
 observation.disconnect();settings.showNeighborCount=false;flushSync(()=>root.render(<ThoughtNode {...props}/>));check(!container.querySelector('.kplex-gate-count'),'Count visibility preference changed');
 result.dataset.status='passed';result.textContent='Structural gate counts passed';
}catch(error){result.dataset.status='failed';result.textContent=String(error?.stack??error)}finally{flushSync(()=>root.unmount());container.remove()}
`;
}

test('tag and folder lateral gates show exact zero independently of partial hierarchy coverage',()=>{
 runBrowserDom(structuralGateCountsBrowserEntry(),'Structural gate counts passed');
});

/** Render the actual ThoughtNode text and geometry for long titles/aliases across independent density values. */
function typographyLabelsBrowserEntry() {
  return `
import React, { useId } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { alphaHexToCss, nodePaint, nodePaintFallbacks } from ${JSON.stringify(join(root, "src/index/style.ts"))};
import { effectiveLabelLimit, nodeLabelFontSize, gateDiameter } from ${JSON.stringify(join(root, "src/ui/layout.ts"))};
${uiDefinitions("src/ui/plexViews/measurement.ts", ["clamp", "nodeSize"])}
import { physicalPositionLabel } from ${JSON.stringify(join(root, "src/ui/features/positionPresentation.ts"))};
const ObsidianIcon=({className,size})=><span className={"kplex-icon "+className} style={{width:size,height:size}}/>;
import {physicalGateStats} from ${JSON.stringify(join(root,"src/ui/plexViews/measurement.ts"))};
import {useGateCountPresentation} from ${JSON.stringify(join(root,'src/ui/useGateCountPresentation.ts'))};
${uiDefinitions("src/ui/ThoughtNode.tsx", ["GATES", "ThoughtNode"])}
const result=document.querySelector("#result"),container=document.createElement("div");document.body.append(container);
container.className="kplex-view-host";container.style.fontFamily="Arial, sans-serif";
const css=document.head.appendChild(document.createElement("style"));css.textContent=${JSON.stringify(readFileSync(join(root,"styles.css"),"utf8"))};
const root=createRoot(container),check=(condition,message)=>{if(!condition)throw new Error(message)};
const title="A long alias and original note title ".repeat(5),prefix="@ ";
const noop=()=>{},gates=Object.fromEntries(["top","bottom","left","right"].map(gate=>[gate,{visibleCount:0,hasAny:false,complete:true}]));
try{
 for(const role of ["child","center"]){
  let expectedWidth,expectedText;
  for(const density of [0.75,1,1.5,2,3,4]){
   const settings={baseFontSize:12.4,wrapNodeLabels:true,showNeighborCount:false,horizontalCompactingFactor:density,compactingFactor:density};
   const style={fontSize:20,maxLabelLength:60,maxWidth:800,prefix};
   const size=nodeSize(prefix+title,20,settings,role==="center",60,800);
   const node={page:{path:"Long.md",name:title,file:{extension:"md"}},label:title,role,x:0,y:0,...size,style,gateStats:gates,neighbourCount:0};
   flushSync(()=>root.render(<ThoughtNode node={node} settings={settings} selected={false} highlighted={false} dimmed={false} highlightedGates={new Set()}
    translate={key=>key} onActivate={noop} onOpen={noop} onHoverNode={noop} onHoverGate={noop} onHoverEnd={noop} onHoverPreview={noop} onGatePointerDown={noop} onNodePointerDown={noop}/>));
   const element=container.querySelector(".kplex-thought"),text=container.querySelector(".kplex-thought-label").textContent;
   const maximum=role==="center"?68:60;
   check(text===(prefix+title).slice(0,maximum-1)+"…","Actual long title truncated with wrong configured budget");
   check(text.length===maximum,"Center allowance/prefix/ellipsis length changed");
   if(expectedWidth!==undefined){check(element.style.width===expectedWidth,"Density changed actual measured label width");check(text===expectedText,"Density changed actual rendered truncation");}
   expectedWidth=element.style.width;expectedText=text;
  }
 }
 let priorWidth=0;
 for(const [budget,width,wrap] of [[60,800,true],[120,800,true],[8,800,true],[60,160,false],[60,160,true]]){
  const settings={baseFontSize:12.4,wrapNodeLabels:wrap,showNeighborCount:false,horizontalCompactingFactor:4,compactingFactor:0.75};
  const style={fontSize:20,maxLabelLength:budget,maxWidth:width,prefix},size=nodeSize(prefix+title,20,settings,false,budget,width);
  const node={page:{path:"Long.md",name:title,file:{extension:"md"}},label:title,role:"child",x:0,y:0,...size,style,gateStats:gates,neighbourCount:0};
  flushSync(()=>root.render(<ThoughtNode node={node} settings={settings} selected={false} highlighted={false} dimmed={false} highlightedGates={new Set()}
    translate={key=>key} onActivate={noop} onOpen={noop} onHoverNode={noop} onHoverGate={noop} onHoverEnd={noop} onHoverPreview={noop} onGatePointerDown={noop} onNodePointerDown={noop}/>));
  const element=container.querySelector(".kplex-thought"),label=container.querySelector(".kplex-thought-label");
  check(label.textContent===(prefix+title).slice(0,budget-1)+"…","Same-mount budget change left stale label text");
  check(parseFloat(element.style.width)===size.width&&parseFloat(element.style.height)===size.height,"Same-mount typography left stale geometry");
  check(label.classList.contains("is-two-line")===wrap,"Wrap change retained stale line policy");
  if(budget===120)check(size.width>priorWidth,"Raised budget did not enlarge actual geometry");
  if(budget===8)check(size.width<priorWidth,"Minimum budget did not shrink actual geometry");
  priorWidth=size.width;
 }
 // Short center labels must fit actual CSS/font/icon geometry, not merely retain their DOM text.
 for(const density of [0.75,2,4])for(const baseFontSize of [13,20,28]){
  const label="Graph Lenses are local",settings={baseFontSize,wrapNodeLabels:false,showNeighborCount:false,horizontalCompactingFactor:density,compactingFactor:density};
  const style={fontSize:25,maxLabelLength:120,maxWidth:baseFontSize===13?390:800,icon:"triangle-alert"};
  const size=nodeSize(label,25,settings,true,120,style.maxWidth),node={page:{path:"Short.md",name:label,file:{extension:"md"}},label,role:"center",x:0,y:0,...size,style,gateStats:gates,neighbourCount:0};
  flushSync(()=>root.render(<ThoughtNode node={node} settings={settings} selected={false} highlighted={false} dimmed={false} highlightedGates={new Set()}
   translate={key=>key} onActivate={noop} onOpen={noop} onHoverNode={noop} onHoverGate={noop} onHoverEnd={noop} onHoverPreview={noop} onGatePointerDown={noop} onNodePointerDown={noop}/>));
  const text=container.querySelector(".kplex-thought-text");
  check(text.textContent===label,"Short center label was character-truncated");
  check(text.scrollWidth<=text.clientWidth,"Short center label was CSS-clipped at font "+baseFontSize+", density "+density+": "+text.scrollWidth+">"+text.clientWidth);
  check(size.width<=style.maxWidth,"Center sizing ignored its explicit width cap");
 }
 for(const font of ["Arial, sans-serif","Georgia, serif","Segoe UI, sans-serif","system-ui"])for(const role of ["child","center"])for(const baseFontSize of [12.4,20,28])for(const strokeWidth of [0,1,4,8])for(const wrapNodeLabels of [false,true]){
  container.style.fontFamily=font;
  const label="Typography gyjpq",settings={baseFontSize,wrapNodeLabels,showNeighborCount:false};
  const style={fontSize:25,maxLabelLength:120,maxWidth:800,strokeWidth};
  const size=nodeSize(label,25,settings,role==="center",120,800,strokeWidth),node={page:{path:"Glyph.md",file:{extension:"md"}},label,role,x:0,y:0,...size,style,gateStats:gates,neighbourCount:0};
  flushSync(()=>root.render(<ThoughtNode node={node} settings={settings} selected={false} highlighted={false} dimmed={false} highlightedGates={new Set()}
   translate={key=>key} onActivate={noop} onOpen={noop} onHoverNode={noop} onHoverGate={noop} onHoverEnd={noop} onHoverPreview={noop} onGatePointerDown={noop} onNodePointerDown={noop}/>));
  const text=container.querySelector(".kplex-thought-text"),box=text.parentElement;
  check(text.scrollHeight<=text.clientHeight+1,"Glyph line clipped: "+role+"/font"+baseFontSize+"/border"+strokeWidth+"/wrap"+wrapNodeLabels);
  check(box.scrollHeight<=box.clientHeight+1,"Label flex box clipped");
  const range=document.createRange();range.selectNodeContents(text);const ink=range.getBoundingClientRect(),clip=text.getBoundingClientRect();
  check(ink.top>=clip.top&&ink.bottom<=clip.bottom,"Font metrics cross the text clip boundary: "+font+"/"+role+"/font"+baseFontSize+"/border"+strokeWidth+"/wrap"+wrapNodeLabels+JSON.stringify({ink:{top:ink.top,bottom:ink.bottom},clip:{top:clip.top,bottom:clip.bottom},padding:getComputedStyle(text).padding,line:getComputedStyle(text).lineHeight,font:getComputedStyle(text).fontSize}));
 }
 flushSync(()=>root.unmount());check(container.childElementCount===0,"Typography test retained nodes");
 result.dataset.status="passed";result.textContent="Density-independent rendered typography passed";
}catch(error){result.dataset.status="failed";result.textContent=String(error?.stack??error)}finally{container.remove();css.remove()}
`;
}

test("long node titles and aliases retain exact rendered truncation and measured width across all density values", () => {
  runBrowserDom(typographyLabelsBrowserEntry(), "Density-independent rendered typography passed");
});

/** Execute the production App/scene memo owners and layout with real React reconciliation. */
function colorPaintBrowserEntry() {
 return `
import {occurrenceKey,edgeOccurrence,edgePhysicalOccurrence,semanticSceneEdge} from ${JSON.stringify(join(root,'src/ui/plexViews/scene.ts'))};
import {classicViewDefinition,classicAreaDropRole,classicPorts} from ${JSON.stringify(join(root,'src/core/plex/views/classic/definition.ts'))};
import * as classicLayout from ${JSON.stringify(join(root,'src/ui/layout.ts'))};
const viewDefinition=classicViewDefinition,viewFailed=false,viewLifetime=0;
const classicFixturePolicy=(layout=classicLayout.buildScene)=>({policyKey:classicLayout.sceneLayoutPolicyKey,geometryKey:classicLayout.neighborhoodSceneKey,
  layout,sections:classicLayout.buildSectionExpandedScene,bind:classicLayout.bindSceneNeighborhood,dropRole:classicAreaDropRole});
const classic=classicFixturePolicy();

import React, {useMemo,useEffect,useState} from 'react';
import {flushSync} from 'react-dom';import {createRoot} from 'react-dom/client';
import {buildScene as realBuildScene,sceneLayoutPolicyKey,neighborhoodSceneKey,bindSceneNeighborhood} from ${JSON.stringify(join(root,'src/ui/layout.ts'))};
import {currentNodeColorStyle,nodePaint,nodePaintFallbacks} from ${JSON.stringify(join(root,'src/index/style.ts'))};
import {centerViewSettings} from ${JSON.stringify(join(root,'src/ui/KplexCenterPresentation.ts'))};
const result=document.querySelector('#result'),check=(condition,message)=>{if(!condition)throw Error(message)};
const counters={layout:0,images:0,mounts:0};const buildScene=(...args)=>{counters.layout++;return realBuildScene(...args)};
const page=path=>({path,name:path,file:{extension:'md'},aliases:[],tags:[],styleTags:[],neighbours:new Map()});
const index={titleFor:p=>p.name,neighbourCount:()=>0,gateStats:()=>({}),neighbours:()=>[],visibleRelationshipsWithin:()=>[]};
let layoutNeighborhood={center:page('Center.md'),parents:[],children:[{page:page('Child.md'),role:'child',relationType:1}],leftFriends:[],rightFriends:[],siblings:[]};
let semanticRevision=0;
const layoutSectionExpansion=null,expandedSectionIds=new Set(),layoutRevision=0,showCrossLinks=false,globalFiltering=false,centralEditorSize=undefined,boundEditorBinding=undefined,boundEditorPage=null;
const profileSurface='tab',compiledGraphLenses={lenses:[],errors:[],usesFrontmatter:false},centerMode={embedCentralNode:false,centralNodeMarkdownMode:'source'};
const plugin={settings:{baseNodeStyle:{fontSize:18,textColor:'#abcdef'},centralNodeStyle:{fontSize:30},baseLinkStyle:{},noteTypeStyles:{},tagNodeStyles:{},tagStyleList:[],hierarchyLinkStyles:{},graphLenses:[],
 compactingFactor:2,horizontalCompactingFactor:2,graphDepth:1,baseFontSize:12.4,compactView:false,maxItemCount:100,parentColumns:2,childColumns:5,parentMaxHeight:300,childMaxHeight:400,friendMaxHeight:350,siblingMaxHeight:250,siblingRelativeSize:50,minLinkLength:18,wrapNodeLabels:false},getViewSettings(){return {...this.settings}}};
let sceneBefore,nodeBefore,inputBefore,cameraBefore;
function NativeEditor(){useEffect(()=>{counters.mounts++},[]);return <input defaultValue='unsaved text'/>}
function Scene({settings,paintSettings}){
 const activePath='Center.md';const preparedDefinitionScene=null,classic=useMemo(()=>classicFixturePolicy(buildScene),[]);
 ${uiDefinitions('src/ui/PlexGraph.tsx',['classicRead','scenePolicyKey','sceneGeometryKey','sceneGeometry','scene'])}
 window.lastColorScene=scene;
 const visualPages=useMemo(()=>scene.nodes.map(node=>node.page),[scene.nodes]);useEffect(()=>{counters.images++},[visualPages]);
 return <div className='camera' style={{transform:'translate(17px, 23px) scale(1.25)'}}>{scene.nodes.map(node=>{const paint=nodePaint(currentNodeColorStyle(node,paintSettings),nodePaintFallbacks(node));return <div key={node.page.path} data-path={node.page.path} style={{color:paint.foreground,left:node.x,top:node.y}}>{node.role==='center'?<NativeEditor/>:node.label}</div>})}</div>;
}
function App({paintRevision,renderRevision}){
 ${uiDefinitions('src/ui/App.tsx',['baseViewSettings','basePaintSettings','viewSettings','paintSettings','paintLenses'])}
 return <Scene settings={viewSettings} paintSettings={paintSettings}/>;
}
try{const container=document.createElement('div');document.body.append(container);const root=createRoot(container);flushSync(()=>root.render(<App paintRevision={0} renderRevision={0}/>));
 const prior={...counters};nodeBefore=container.querySelector('[data-path="Center.md"]');inputBefore=container.querySelector('input');cameraBefore=container.querySelector('.camera');inputBefore.value='still typing';inputBefore.focus();inputBefore.setSelectionRange(2,5);
 plugin.settings.baseNodeStyle={...plugin.settings.baseNodeStyle,textColor:'#12345680'};flushSync(()=>root.render(<App paintRevision={1} renderRevision={0}/>));
 check(counters.layout===prior.layout,'Color edit rebuilt whole scene');check(counters.images===prior.images,'Color edit reacquired imagery');check(counters.mounts===prior.mounts,'Color edit remounted native editor');
 check(container.querySelector('[data-path="Center.md"]')===nodeBefore&&container.querySelector('input')===inputBefore,'Color edit replaced DOM');check(inputBefore.value==='still typing'&&document.activeElement===inputBefore&&inputBefore.selectionStart===2,'Draft/focus/caret lost');check(container.querySelector('.camera')===cameraBefore&&cameraBefore.style.transform==='translate(17px, 23px) scale(1.25)','Camera reset');check(/^rgba\\(18, 52, 86, 0\\.50?2?\\)$/.test(getComputedStyle(nodeBefore).color),'Current winning source did not repaint');
 for(let revision=1;revision<=3;revision++){
  layoutNeighborhood={...layoutNeighborhood,center:{...layoutNeighborhood.center,mtime:revision},children:layoutNeighborhood.children.map(row=>({...row,page:{...row.page,mtime:revision}}))};
  flushSync(()=>root.render(<App paintRevision={1} renderRevision={revision}/>));
  check(counters.layout===prior.layout,'Equivalent source publication rebuilt geometry');check(window.lastColorScene.nodes.find(node=>node.role==='center').page.mtime===revision,'Geometry reuse retained an old page clock');
 }
 check(counters.mounts===prior.mounts&&container.querySelector('input')===inputBefore&&document.activeElement===inputBefore&&inputBefore.selectionStart===2,'Source publication lost editor DOM/focus/caret');
 plugin.settings.baseNodeStyle={...plugin.settings.baseNodeStyle,fontSize:21};flushSync(()=>root.render(<App paintRevision={1} renderRevision={4}/>));check(counters.layout===prior.layout+1,'Geometry edit skipped layout');
 layoutNeighborhood={...layoutNeighborhood,children:layoutNeighborhood.children.map(row=>({...row,page:{...row.page,name:'A genuinely changed label'}}))};flushSync(()=>root.render(<App paintRevision={1} renderRevision={5}/>));check(counters.layout===prior.layout+2,'Changed label skipped geometry');
 semanticRevision++;flushSync(()=>root.render(<App paintRevision={1} renderRevision={6}/>));check(counters.layout===prior.layout+3,'Changed semantic crosslinks skipped geometry');
 layoutNeighborhood={...layoutNeighborhood,children:[]};flushSync(()=>root.render(<App paintRevision={1} renderRevision={7}/>));check(counters.layout===prior.layout+4&&window.lastColorScene.nodes.length===1,'Changed filter membership skipped geometry');
 flushSync(()=>root.unmount());result.dataset.status='passed';result.textContent='Color paint preserves layout and editor passed';
}catch(error){result.dataset.status='failed';result.textContent=String(error.stack||error)}
`;
}
test('color publication reuses actual scene layout, images, native editor, focus and camera',()=>runBrowserDom(colorPaintBrowserEntry(),'Color paint preserves layout and editor passed'));

/** Mount the actual hover effect, edge projection/highlight memos and viewport-aware SVG
 * renderer around finite host inputs; these flat fixture nodes have no scroll continuation area. */
function crosslinkPeekBrowserEntry(){
 const source=ts.createSourceFile('PlexGraph.tsx',readFileSync('src/ui/PlexGraph.tsx','utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),effects=[],edgeHighlights=[];
 /** Keep production lifetime/visibility callbacks intact without constructing the native plugin shell. */
 const visit=node=>{if(ts.isCallExpression(node)&&node.expression.getText(source)==='useEffect'&&
   (node.arguments[0]?.getText(source).includes('const intent = new HoverHighlight<Exclude<HoverState, null>>')||node.arguments[0]?.getText(source).includes('!visibleNodePaths.has(crossLinkPeek.path)')))effects.push(node.getText(source)+';');
   if(ts.isJsxAttribute(node)&&node.name.getText(source)==='highlighted'&&node.initializer?.expression?.getText(source).includes('edge.style.showLabel'))edgeHighlights.push(node.initializer.expression.getText(source));
   ts.forEachChild(node,visit)};visit(source);assert.equal(effects.length,2);assert.equal(edgeHighlights.length,1);
 const effectCode=ts.transpileModule(effects.join('\n'),{compilerOptions:{target:ts.ScriptTarget.ES2021}}).outputText;
 return `
import {occurrenceKey,edgeOccurrence,edgePhysicalOccurrence,semanticSceneEdge} from ${JSON.stringify(join(root,'src/ui/plexViews/scene.ts'))};
import {classicViewDefinition,classicAreaDropRole,classicPorts} from ${JSON.stringify(join(root,'src/core/plex/views/classic/definition.ts'))};
import * as classicLayout from ${JSON.stringify(join(root,'src/ui/layout.ts'))};
const viewDefinition=classicViewDefinition,viewFailed=false,viewLifetime=0;
const classicFixturePolicy=(layout=classicLayout.buildScene)=>({policyKey:classicLayout.sceneLayoutPolicyKey,geometryKey:classicLayout.neighborhoodSceneKey,
  layout,sections:classicLayout.buildSectionExpandedScene,bind:classicLayout.bindSceneNeighborhood,dropRole:classicAreaDropRole});
const classic=classicFixturePolicy();

import React,{useCallback,useState,useMemo,useRef,useEffect} from 'react';import{flushSync}from'react-dom';import{createRoot}from'react-dom/client';
import{ontologyConfiguration}from ${JSON.stringify(join(root,"src/core/contracts/ontologyConfiguration.ts"))};
import{hasDirectionalCaption,directionalRelationCaption}from ${JSON.stringify(join(root,"src/core/plex/directionalRelationCaption.ts"))};
import{HoverHighlight,bindHoverHighlight}from ${JSON.stringify(join(root,'src/ui/components/hoverHighlight.ts'))};
import{LinkDirection}from ${JSON.stringify(join(root,'src/types.ts'))};
import{edgeViewportEndpoints,edgeViewportClip}from ${JSON.stringify(join(root,'src/ui/plexViews/areaVisibility.ts'))};
import{buildScene as realBuildScene,sceneLayoutPolicyKey,neighborhoodSceneKey,bindSceneNeighborhood,appendVisibleCrossLinks,gateDiameter}from ${JSON.stringify(join(root,'src/ui/layout.ts'))};
import{alphaHexToCss,resolveLinkStyle,DEFAULT_RENDERED_LINK_WIDTH,NATIVE_LINK_STROKE,NATIVE_LINK_TEXT,NATIVE_LINK_LABEL_FILL}from ${JSON.stringify(join(root,'src/index/style.ts'))};
const result=document.querySelector('#result'),check=(value,message)=>{if(!value)throw Error(message)};
const css=document.createElement('style');css.textContent=${JSON.stringify(readFileSync('styles.css','utf8'))};document.head.append(css);
${uiDefinitions('src/ui/PlexGraph.tsx',['GATE_GAP','GENERIC_RELATION_LABELS','gateKey','gatesForEdge','gatePoint','gateVector','cubicPoint','edgeGeometry','relationLabel','markerFor','Edge','EdgeLabel'])}
const page=path=>({path,name:path,file:{path,extension:'md'},aliases:[],tags:[],styleTags:[],neighbours:new Map()});
const pages=new Map(['Center','A','B','C','D','E'].map(name=>[name,page(name)]));
const pairs={A:[['B','child','ab'],['C','parent','ac'],['D','left','ad'],['E','right','ae']],B:[['A','parent','ab'],['C','left','unrelated']],C:[['A','child','ac'],['B','right','unrelated']],D:[['A','right','ad']],E:[['A','left','ae']]};
const counters={layout:0,adjacency:0},buildScene=(...args)=>{counters.layout++;return realBuildScene(...args)};
const index={titleFor:p=>p.name,neighbourCount:()=>0,gateStats:()=>({}),neighbours:()=>[],visibleRelationshipsWithin(source,targets){counters.adjacency++;return(pairs[source.path]??[]).filter(([path])=>targets.has(path)).map(([path,role,typeDefinition])=>({page:pages.get(path),role,typeDefinition,relationType:1,linkDirection:1}))}};
const renderRevision=0,sectionExpansion=null;
const settings={compactView:false,ontologyPairingVersion:1,hierarchy:{hidden:[],parents:[],children:[],leftFriends:[],rightFriends:[],previous:[],next:[],exclusions:[]},baseNodeStyle:{fontSize:18},centralNodeStyle:{fontSize:30},baseLinkStyle:{},hierarchyLinkStyles:{ab:{showLabel:true,fontSize:12,strokeWidth:3}},noteTypeStyles:{},tagNodeStyles:{},tagStyleList:[],compactingFactor:2,horizontalCompactingFactor:2,graphDepth:1,baseFontSize:12.4,maxItemCount:100,parentColumns:2,childColumns:5,parentMaxHeight:300,childMaxHeight:400,friendMaxHeight:350,siblingMaxHeight:250,siblingRelativeSize:50,minLinkLength:18};
const layoutNeighborhood={center:pages.get('Center'),parents:[],children:['A','B','C','D','E'].map(path=>({page:pages.get(path),role:'child',relationType:1})),leftFriends:[],rightFriends:[],siblings:[]};
const layoutSectionExpansion=null,expandedSectionIds=new Set(),layoutRevision=0,globalFiltering=false,centralEditorSize=undefined,boundEditorBinding=undefined,boundEditorPage=null,neighborhood=layoutNeighborhood,activePath='Center',hostLeaf={};let semanticRevision=0;
const predicateCenter=neighborhood.center;
const predicateEngine={},lenses={},paintLenses=lenses,paintSettings=settings,predicateRevision=0,graphLensEdgeStyle=()=>({}),connectDrag=null,nodeDrag=null,resizingArea=false,areaSettingsMode=false;
const finding=true,findQuery='no search hit',matchesOntologyFind=()=>false;
const listeners=new Set(),plugin={visible:true,subscribeKplexVisibility(fn){listeners.add(fn);return()=>listeners.delete(fn)},isKplexLeafVisible(){return this.visible}};
let fixture;
class PeekBoundary extends React.Component{state={error:null};static getDerivedStateFromError(error){return{error:String(error.stack||error)}}render(){return this.state.error?<pre data-peek-error>{this.state.error}</pre>:this.props.children}}
function Graph(){
 const preparedDefinitionScene=null;
 const viewport=useRef(null),hoverHighlight=useRef(null),hoverPreview=useRef(null),[hover,setHover]=useState(null),[crossLinkPeek,setCrossLinkPeek]=useState(null),[required,setRequired]=useState(true),[showCrossLinks,setShown]=useState(false),[hidden,setHidden]=useState([]);
 const viewSettings={hoverHighlightRequiresAlt:required},clearEdgeTooltip=()=>{};
 ${uiDefinitions('src/ui/PlexGraph.tsx',['classicRead','scenePolicyKey','sceneGeometryKey','sceneGeometry','scene','clearHoverIntent','scheduleHoverIntent'])}
 const visibleNodePaths=useMemo(()=>new Set(scene.nodes.filter(node=>!hidden.includes(node.page.path)).map(node=>node.page.path)),[scene.nodes,hidden]);
 const renderedNodeMap=useMemo(()=>new Map(scene.nodes.map(node=>[node.page.path,node])),[scene.nodes]);
 const visibleOccurrenceIds=visibleNodePaths,admittedEdgeOccurrences=visibleNodePaths;
 ${uiDefinitions('src/ui/PlexGraph.tsx',['connectionCaption','visibleEdgeProjection','visibleEdges','paintedEdges','interaction'])}
 ${effectCode}
 fixture={enter(path,gate,alt=false){scheduleHoverIntent(gate?{kind:'gate',path,gate}:{kind:'node',path},{pointerType:'mouse',isTrusted:true,altKey:alt})},key:alt=>hoverHighlight.current.modifier(alt,true),leave:()=>clearHoverIntent(true),setRequired,setShown,setHidden,scene,interaction};
 return <div ref={viewport} className='kplex-plex' style={{width:1000,height:800}}><input defaultValue='unsaved editor'/><svg width='1000' height='800'>{paintedEdges.map(edge=><Edge viewportForNode={()=>undefined} key={edge.id} edge={edge} nodes={renderedNodeMap} inverseArrowDirection={true} connectorStyle='bezier' labelBackground={NATIVE_LINK_LABEL_FILL} crossLinkOpacity={0} highlighted={${edgeHighlights[0]}} dimmed={false} passive={Boolean(crossLinkPeek&&!showCrossLinks&&edge.isCrossLink)} onHover={()=>{}} onMove={()=>{}} onLeave={()=>{}} onContextMenu={()=>{}}/>)}</svg>{scene.nodes.map(node=><div key={node.page.path} data-node={node.page.path}>{node.label}</div>)}</div>;
}
try{
 const element=document.createElement('div');document.body.append(element);const root=createRoot(element);flushSync(()=>root.render(<PeekBoundary><Graph/></PeekBoundary>));const initial=counters.layout,nodes=[...element.querySelectorAll('[data-node]')],input=element.querySelector('input');check(input,element.querySelector('[data-peek-error]')?.textContent||'Mounted graph input absent');input.focus();input.setSelectionRange(2,2);
 const ids=()=>[...element.querySelectorAll('.is-cross-link .kplex-edge-hit')].map(node=>node.dataset.kplexEdgeId).sort();
 for(const required of[true,false]){
  flushSync(()=>fixture.setRequired(required));flushSync(()=>fixture.enter('A',null));check(ids().length===0,'Unmodified hover revealed disabled crosslinks');flushSync(()=>fixture.key(true));check(ids().join('|')===['cross:A:B:child','cross:A:C:parent','cross:A:D:left','cross:A:E:right'].sort().join('|'),'Node peek set differs');
  check(element.querySelectorAll('.is-cross-link.is-highlighted').length===4,'Peek connectors not highlighted');check([...element.querySelectorAll('.is-hover-peek .kplex-edge-hit')].every(node=>getComputedStyle(node).pointerEvents==='none'),'Peek steals pointer');
  check([...element.querySelectorAll('.is-cross-link .kplex-edge-visible')].every(node=>getComputedStyle(node).opacity==='1'),'Zero ordinary crosslink opacity hid a highlighted peek');
  const visits=counters.adjacency;flushSync(()=>fixture.key(true));check(counters.adjacency===visits,'Key repeat re-queried adjacency');flushSync(()=>fixture.key(false));check(ids().length===0,'Release retained temporary edges');
  flushSync(()=>fixture.enter('A','top',true));check(ids().join('|')==='cross:A:C:parent','Gate peek included another gate');
  flushSync(()=>fixture.setHidden(['C']));check(ids().length===0,'Peek revealed a filtered/clipped counterpart');flushSync(()=>fixture.setHidden(['A']));flushSync(()=>fixture.setHidden([]));check(ids().length===0,'Retired target resurrected without new entry');
  flushSync(()=>fixture.enter('B','top',true));check(ids().join('|')==='cross:A:B:child','Target-side gate flipped canonical orientation');
  flushSync(()=>{plugin.visible=false;for(const listener of listeners)listener()});check(ids().length===0,'Hidden view retained a peek');plugin.visible=true;flushSync(()=>fixture.leave());
 }
 check(counters.layout===initial,'Alt state rebuilt scene geometry');check(nodes.every(node=>node.isConnected),'Alt state replaced node DOM');check(element.querySelector('input')===input&&document.activeElement===input&&input.selectionStart===2,'Alt state changed editor focus/caret');
 flushSync(()=>fixture.setShown(true));const normal=ids();check(normal.length===5,'Normal crosslink policy changed');flushSync(()=>fixture.enter('A',null,true));check(ids().join('|')===normal.join('|'),'Enabled crosslinks duplicated/changed');flushSync(()=>fixture.key(false));check(ids().join('|')===normal.join('|'),'Release hid normal crosslinks');
 flushSync(()=>root.unmount());check(listeners.size===0,'Visibility listener leaked');element.remove();css.remove();result.dataset.status='passed';result.textContent='Transient crosslink paint passed';
}catch(error){result.dataset.status='failed';result.textContent=String(error.stack||error)}
`;
}

test('transient crosslink paint uses mounted projection/highlight/SVG owners without scene, focus or visibility changes',()=>runBrowserDom(crosslinkPeekBrowserEntry(),'Transient crosslink paint passed'));

/** Render the actual caption callback and viewport-aware SVG labels for ordinary and transient
 * endpoints; the fixture supplies the renderer's explicit no-scroll viewport capability. */
function directionalCaptionBrowserEntry(){return `
import React,{useCallback}from'react';import{flushSync}from'react-dom';import{createRoot}from'react-dom/client';
import{edgePhysicalOccurrence}from ${JSON.stringify(join(root,'src/ui/plexViews/scene.ts'))};
import{ontologyConfiguration}from ${JSON.stringify(join(root,'src/core/contracts/ontologyConfiguration.ts'))};
import{hasDirectionalCaption,directionalRelationCaption}from ${JSON.stringify(join(root,'src/core/plex/directionalRelationCaption.ts'))};
import{classicPorts}from ${JSON.stringify(join(root,"src/core/plex/views/classic/definition.ts"))};
import{gateDiameter}from ${JSON.stringify(join(root,"src/ui/layout.ts"))};
import{LinkDirection}from ${JSON.stringify(join(root,'src/types.ts'))};
import{edgeViewportEndpoints,edgeViewportClip}from ${JSON.stringify(join(root,'src/ui/plexViews/areaVisibility.ts'))};
import{alphaHexToCss,DEFAULT_RENDERED_LINK_WIDTH,NATIVE_LINK_STROKE,NATIVE_LINK_TEXT}from ${JSON.stringify(join(root,'src/index/style.ts'))};
${uiDefinitions('src/ui/PlexGraph.tsx',['GATE_GAP','GENERIC_RELATION_LABELS','gateKey','gatesForEdge','gatePoint','gateVector','cubicPoint','edgeGeometry','relationLabel','markerFor','Edge','EdgeLabel'])}
const result=document.querySelector('#result'),check=(value,message)=>{if(!value)throw Error(message)},page=path=>({path,style:{},x:path==='A'?0:200,y:0,width:100,height:40,page:{path}});
let reads=0;const decisions=[{active:true,evidence:{fieldName:'replies to',definition:'replies to',declaredByPath:'B',declaredTargetPath:'A'}}],index={explainRelationship(){reads++;return{decisions}}};
function App({reverse=false,show=true,paired=true,transient=false,folded=false,definition='replies to',mini=false}){
 const settings={compactView:false,ontologyPairingVersion:1,hierarchy:{hidden:[],parents:[],children:[],leftFriends:[],rightFriends:[],previous:paired?['replies to/replied by']:['replies to'],next:paired?[]:['replied by'],exclusions:[]}};
 const sourcePath=transient?'section A':reverse?'B':'A',targetPath=transient?'target B':reverse?'A':'B';
 const sectionPage={path:'section A',transient:{kind:'section',sourcePath:'A'}},targetPage={path:'target B',transient:{kind:'section-target',sourcePath:'A',actualPath:'B'}};
 const sectionExpansion=transient?{sections:[{page:sectionPage}],explanations:new Map([[sourcePath+'\\u0000'+targetPath,{decisions}]])}:null;
 ${uiDefinitions('src/ui/PlexGraph.tsx',['connectionCaption'])}
 const style={showLabel:show,fontSize:12,strokeWidth:3},caption=connectionCaption(definition,show,sourcePath,targetPath,transient?(folded?undefined:sectionPage):{path:sourcePath},transient?targetPage:{path:targetPath});
 const nodes=new Map([[sourcePath,{...page('A'),page:{path:sourcePath}}],[targetPath,{...page('B'),page:{path:targetPath}}]]),edge={id:'pair',sourcePath,targetPath,role:'previous',relationType:1,typeDefinition:definition,caption,direction:1,style};
 return <svg>{mini?<EdgeLabel label={show?relationLabel(caption):null} midpoint={{x:100,y:50}} style={style} background='none'/>:<Edge viewportForNode={()=>undefined} edge={edge} nodes={nodes} inverseArrowDirection={true} connectorStyle='bezier' labelBackground='none' crossLinkOpacity={1} highlighted={false} dimmed={false}/>}</svg>;
}
try{const container=document.createElement('div');document.body.append(container);const root=createRoot(container),label=()=>container.querySelector('.kplex-edge-label')?.textContent;
 flushSync(()=>root.render(<App paired={false}/>));check(label()==='replies to'&&reads===0,'Unpaired caption requested evidence or changed wording');
 flushSync(()=>root.render(<App/>));check(label()==='replied by'&&reads===1,'Stationary inverse perspective did not render');check(container.querySelector('.kplex-edge-visible').getAttribute('stroke-width')==='3','Caption changed physical-field styling');
 flushSync(()=>root.render(<App reverse/>));check(label()==='replies to','Declaring perspective followed arrow inversion');let before=reads;
 flushSync(()=>root.render(<App show={false}/>));check(!label()&&reads===before,'Disabled labels requested extra evidence');
 flushSync(()=>root.render(<App definition='Unpaired field'/>));check(label()==='Unpaired field'&&reads===before,'Irrelevant definition requested pair evidence');
 flushSync(()=>root.render(<App transient/>));check(label()==='replied by'&&reads===before,'Transient preview ignored its existing decisions');
 flushSync(()=>root.render(<App transient folded/>));check(label()==='replied by'&&reads===before,'Folded section lost physical source perspective');
 flushSync(()=>root.render(<App mini/>));check(label()==='replied by','Expanded descendant shared label differs');flushSync(()=>root.unmount());result.dataset.status='passed';result.textContent='Directional caption rendering passed';
}catch(error){result.dataset.status='failed';result.textContent=String(error.stack||error)}
`;}
test('directional captions reuse actual endpoint provenance, physical styles and shared expanded labels with bounded evidence reads',()=>runBrowserDom(directionalCaptionBrowserEntry(),'Directional caption rendering passed'));
