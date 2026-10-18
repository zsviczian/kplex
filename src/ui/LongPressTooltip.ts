/**
 * Owns document-scoped control hints for the Obsidian UI shell: delayed mouse hover and consumed
 * long presses share one measured, theme-styled tooltip. Native aria-label hints are suppressed by
 * scoped CSS because Obsidian's warm-tooltip shortcut bypasses delay and its bottom clamp overlaps
 * controls. Each document has one reference-counted owner; the last release removes all resources.
 */
const HOVER_MS = 650;
const LONG_PRESS_MS = 450;
const TOOLTIP_LIFETIME_MS = 1800;
const MOVE_TOLERANCE_PX = 10;

/** Dedicated callouts share the touch gesture guard without rendering a second hint. */
export const KPLEX_CONTROL_LONG_PRESS_EVENT = "kplex-control-long-press";

type DocumentState = {
  users: number;
  cleanup: () => void;
};

const documentStates = new WeakMap<Document, DocumentState>();

/** Retain one idempotent document lease; an old release cannot retire a later replacement owner. */
function retainTooltipDocument(doc: Document, state: DocumentState): () => void {
  state.users += 1;
  let released = false;
  return /** Release only this lease once, cleaning resources after the final current user. */ () => {
    if (released) return;
    released = true;
    state.users -= 1;
    if (state.users === 0 && documentStates.get(doc) === state) {
      state.cleanup();
      documentStates.delete(doc);
    }
  };
}

/** Locate touch-enabled controls without acquiring graph or native editor state. */
function scopedTooltipTarget(target: EventTarget | null): HTMLElement | null {
  if (!target || typeof target !== "object" || !("closest" in target)) return null;
  const element = (target as Element).closest<HTMLElement>("button, [data-kplex-long-press-tooltip]");
  if (!element) return null;
  return element.closest("[data-kplex-tooltip-scope]") ? element : null;
}

/** Prefer the accessible localized name; legacy title/text fallback is retained for long presses. */
function tooltipText(element: HTMLElement): string {
  return element.getAttribute("aria-label")?.trim()
    || element.getAttribute("title")?.trim()
    || element.textContent?.trim()
    || "";
}

/** Resolve mouse hints, letting a marked slider wrapper supply its longer help text. */
function hoverTooltipTarget(target: EventTarget | null): HTMLElement | null {
  if (!target || typeof target !== "object" || !("closest" in target)) return null;
  const element = (target as Element).closest<HTMLElement>("button[aria-label], input[aria-label], [role=button][aria-label], [data-kplex-control-tooltip], [data-kplex-long-press-tooltip]");
  if (!element?.closest("[data-kplex-tooltip-scope]")) return null;
  const control = element.matches("input") ? element.closest<HTMLElement>("[data-kplex-control-tooltip]") ?? element : element;
  if (control.dataset.kplexTooltip === "callout") return null;
  return control.matches(":disabled") || control.querySelector(":disabled") ? null : control;
}

/**
 * Mouse hints wait 650 ms on every control, including immediately after another hint. Android has
 * no hover tooltip. This delegated long-press guard shows the accessible label and,
 * critically, consumes the synthesized click that follows a completed long press. Buttons opt in
 * automatically; compact toggles can opt in with data-kplex-long-press-tooltip. One document-level listener is shared by all K-Plex
 * views in the same Obsidian window; portalled surfaces opt in with data-kplex-tooltip-scope.
 */
export function installKplexLongPressTooltips(doc: Document): () => void {
  const existing = documentStates.get(doc);
  if (existing) return retainTooltipDocument(doc, existing);

  const view = doc.defaultView ?? window;
  let pressTimer = 0;
  let hideTimer = 0;
  let suppressClickTimer = 0;
  let activeTarget: HTMLElement | null = null;
  let activePointerId = -1;
  let startX = 0;
  let startY = 0;
  let completedLongPress = false;
  let suppressClickFor: HTMLElement | null = null;
  let tooltip: HTMLDivElement | null = null;
  let hoverTimer = 0;
  let hoverTarget: HTMLElement | null = null;
  let hoverVisible = false;
  let alternatePressed = false;

  /** Cancel only this document owner's pending long press. */
  const clearPressTimer = () => {
    if (!pressTimer) return;
    view.clearTimeout(pressTimer);
    pressTimer = 0;
  };

  /** Expire synthesized-click suppression without affecting an intentional later tap. */
  const clearSuppressedClick = () => {
    if (suppressClickTimer) {
      view.clearTimeout(suppressClickTimer);
      suppressClickTimer = 0;
    }
    suppressClickFor = null;
  };

  /** Remove the owned hint and its touch lifetime; never remove Obsidian or another plugin's hints. */
  const removeTooltip = () => {
    if (hideTimer) {
      view.clearTimeout(hideTimer);
      hideTimer = 0;
    }
    tooltip?.remove();
    tooltip = null;
    hoverVisible = false;
  };

  /** Measure the themed hint and flip above at the window or caller-marked canvas boundary. */
  const showTooltip = (element: HTMLElement, hover = false) => {
    const text = tooltipText(element);
    if (!text || !element.isConnected || !element.getClientRects().length) return;
    removeTooltip();
    tooltip = doc.body.createDiv({ cls: "tooltip kplex-control-tooltip is-measuring", attr: { role: "tooltip" }, text });
    if (!hover) tooltip.addClass("kplex-long-press-tooltip");
    const buttonRect = element.getBoundingClientRect();
    const boundary = element.closest("[data-kplex-tooltip-boundary]")?.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    const margin = 8;
    const left = Math.max(margin, Math.min(
      buttonRect.left + (buttonRect.width - tooltipRect.width) / 2,
      view.innerWidth - tooltipRect.width - margin,
    ));
    const below = buttonRect.bottom + margin;
    const above = buttonRect.top - tooltipRect.height - margin;
    const fitsBelow = below + tooltipRect.height <= Math.min(view.innerHeight, boundary?.bottom ?? view.innerHeight) - margin;
    const top = fitsBelow ? below : above;
    // If neither side fits, showing no hint is preferable to obscuring the control being used.
    if (top < Math.max(margin, (boundary?.top ?? 0) + margin)) { removeTooltip(); return; }
    tooltip.toggleClass("mod-top", !fitsBelow);
    const arrow = tooltip.createDiv({ cls: "tooltip-arrow" });
    arrow.setCssStyles({ left: `${Math.max(margin, Math.min(tooltipRect.width - margin, buttonRect.left + buttonRect.width / 2 - left))}px` });
    tooltip.setCssStyles({ left: `${left}px`, top: `${Math.max(margin, top)}px` });
    tooltip.removeClass("is-measuring");
    hoverVisible = hover;
    if (!hover) hideTimer = view.setTimeout(removeTooltip, TOOLTIP_LIFETIME_MS);
  };

  /** Cancel hover work on exit, press, scrolling, removal or owner teardown. */
  const clearHover = () => {
    if (hoverTimer) view.clearTimeout(hoverTimer);
    hoverTimer = 0;
    hoverTarget = null;
    if (hoverVisible) removeTooltip();
  };

  /** Gate hints share the normal delay/placement while their caller owns the modifier preference. */
  const hoverAllowed = (element: HTMLElement): boolean => !element.hasAttribute("data-kplex-tooltip-requires-alt") || alternatePressed;

  /** Preserve the hovered target while withholding a gated hint, allowing a stationary modifier press. */
  const scheduleHover = (target: HTMLElement): void => {
    if (hoverTimer) view.clearTimeout(hoverTimer);
    hoverTimer = 0;
    if (hoverVisible) removeTooltip();
    if (!hoverAllowed(target)) return;
    hoverTimer = view.setTimeout(/** Re-read labels and eligibility after React/host updates. */ () => {
      hoverTimer = 0;
      if (hoverTarget !== target || hoverTooltipTarget(target) !== target || !hoverAllowed(target)) return;
      showTooltip(target, true);
    }, HOVER_MS);
  };

  /** Modifier release immediately hides only modifier-gated hints; ordinary controls keep their existing lifetime. */
  const updateAlternate = (pressed: boolean): void => {
    if (alternatePressed === pressed) return;
    alternatePressed = pressed;
    if (hoverTarget?.hasAttribute("data-kplex-tooltip-requires-alt")) scheduleHover(hoverTarget);
  };

  /** Restart the full delay only when entering a different mouse-hover control. */
  const onPointerOver = (event: PointerEvent) => {
    if (event.pointerType !== "mouse" || event.buttons !== 0) return;
    updateAlternate(event.altKey);
    const target = hoverTooltipTarget(event.target);
    if (target === hoverTarget) return;
    clearHover();
    if (!target) return;
    hoverTarget = target;
    scheduleHover(target);
  };

  /** Ignore movement between the icon, text and input descendants of the same control. */
  const onPointerOut = (event: PointerEvent) => {
    if (hoverTarget && hoverTooltipTarget(event.relatedTarget) !== hoverTarget) clearHover();
  };

  /** Escape retains application priority; an Alt/Option press can authorize the stationary hovered gate. */
  const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") clearHover(); else updateAlternate(event.altKey || event.key === "Alt"); };
  /** Key release does not require another pointer event to hide a gated hint. */
  const onKeyUp = (event: KeyboardEvent) => { updateAlternate(event.altKey); };
  /** A blurred document cannot retain a modifier from another window's keyboard session. */
  const onBlur = (): void => { alternatePressed = false; clearHover(); };

  /** Reset pending touch state without invalidating its separately owned synthesized-click guard. */
  const resetActivePress = () => {
    clearPressTimer();
    activeTarget = null;
    activePointerId = -1;
    completedLongPress = false;
  };

  /** Presses dismiss mouse hints; stationary non-mouse presses retain the existing touch contract. */
  const onPointerDown = (event: PointerEvent) => {
    clearHover();
    if (event.pointerType === "mouse") return;
    if (!event.isPrimary || event.button !== 0) return;
    const target = scopedTooltipTarget(event.target);
    if (!target) return;
    const control = target.matches("button, input") ? target : target.querySelector<HTMLElement>("button, input");
    if (control?.hasAttribute("disabled")) return;
    clearPressTimer();
    activeTarget = target;
    activePointerId = event.pointerId;
    startX = event.clientX;
    startY = event.clientY;
    completedLongPress = false;
    pressTimer = view.setTimeout(/** Complete only the still-owned stationary press. */ () => {
      pressTimer = 0;
      if (!activeTarget) return;
      completedLongPress = true;
      suppressClickFor = activeTarget;
      if (suppressClickTimer) view.clearTimeout(suppressClickTimer);
      // A browser-generated click normally follows pointerup immediately. Expire the guard so a
      // later, intentional tap on the same button is never swallowed if no click was synthesized.
      suppressClickTimer = view.setTimeout(clearSuppressedClick, 1_000);
      if (activeTarget.dataset.kplexTooltip === "callout") {
        if (activeTarget.isConnected && activeTarget.ownerDocument === doc) {
          const ControlEvent = (view as Window & { Event: typeof Event }).Event;
          activeTarget.dispatchEvent(new ControlEvent(KPLEX_CONTROL_LONG_PRESS_EVENT));
        }
      } else {
        showTooltip(activeTarget);
      }
    }, LONG_PRESS_MS);
  };

  /** Movement cancels a pending long press while preserving already-earned click suppression. */
  const onPointerMove = (event: PointerEvent) => {
    if (event.pointerType === "mouse" && event.buttons === 0) updateAlternate(event.altKey);
    if (!activeTarget || event.pointerId !== activePointerId) return;
    if (Math.hypot(event.clientX - startX, event.clientY - startY) <= MOVE_TOLERANCE_PX) return;
    clearPressTimer();
    if (!completedLongPress) activeTarget = null;
  };

  /** Consume completed long presses without invoking the underlying control action. */
  const onPointerUp = (event: PointerEvent) => {
    if (!activeTarget || event.pointerId !== activePointerId) return;
    clearPressTimer();
    if (completedLongPress) {
      event.preventDefault();
      event.stopPropagation();
    }
    activeTarget = null;
    activePointerId = -1;
    completedLongPress = false;
  };

  /** Native cancellation releases the active touch hint immediately. */
  const onPointerCancel = (event: PointerEvent) => {
    if (event.pointerId !== activePointerId) return;
    resetActivePress();
    removeTooltip();
  };

  /** Suppress only the click synthesized for the exact completed long-press target. */
  const onClick = (event: MouseEvent) => {
    if (!suppressClickFor) return;
    const target = scopedTooltipTarget(event.target);
    if (target !== suppressClickFor) return;
    clearSuppressedClick();
    event.preventDefault();
    event.stopImmediatePropagation();
  };

  /** Keep a touch hint from also opening a native context menu. */
  const onContextMenu = (event: MouseEvent) => {
    const target = scopedTooltipTarget(event.target);
    if (target && (target === activeTarget || target === suppressClickFor)) event.preventDefault();
  };

  const Observer = (view as Window & { MutationObserver: typeof MutationObserver }).MutationObserver;
  const observer = new Observer(/** Retired controls and changed gate preferences cannot retain an unauthorized hint. */ records => {
    if (hoverTarget && (!hoverTarget.isConnected || hoverTarget.ownerDocument !== doc)) clearHover();
    else if (hoverTarget && records.some(/** Only a modifier-policy change on this hovered control renews the delay. */ record => record.type === "attributes" && record.target === hoverTarget)) scheduleHover(hoverTarget);
  });
  observer.observe(doc.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-kplex-tooltip-requires-alt"] });
  doc.addEventListener("pointerover", onPointerOver, true);
  doc.addEventListener("pointerout", onPointerOut, true);
  doc.addEventListener("scroll", clearHover, true);
  doc.addEventListener("wheel", clearHover, true);
  doc.addEventListener("keydown", onKeyDown, true);
  doc.addEventListener("keyup", onKeyUp, true);
  view.addEventListener("blur", onBlur);
  view.addEventListener("resize", clearHover);

  doc.addEventListener("pointerdown", onPointerDown, true);
  doc.addEventListener("pointermove", onPointerMove, true);
  doc.addEventListener("pointerup", onPointerUp, true);
  doc.addEventListener("pointercancel", onPointerCancel, true);
  doc.addEventListener("click", onClick, true);
  doc.addEventListener("contextmenu", onContextMenu, true);

  /** The final document lease releases timers, observation, tooltip DOM and exact listeners. */
  const cleanup = () => {
    observer.disconnect();
    clearHover();
    resetActivePress();
    clearSuppressedClick();
    removeTooltip();
    doc.removeEventListener("pointerdown", onPointerDown, true);
    doc.removeEventListener("pointermove", onPointerMove, true);
    doc.removeEventListener("pointerup", onPointerUp, true);
    doc.removeEventListener("pointercancel", onPointerCancel, true);
    doc.removeEventListener("click", onClick, true);
    doc.removeEventListener("contextmenu", onContextMenu, true);
    doc.removeEventListener("pointerover", onPointerOver, true);
    doc.removeEventListener("pointerout", onPointerOut, true);
    doc.removeEventListener("scroll", clearHover, true);
    doc.removeEventListener("wheel", clearHover, true);
    doc.removeEventListener("keydown", onKeyDown, true);
    doc.removeEventListener("keyup", onKeyUp, true);
    view.removeEventListener("blur", onBlur);
    view.removeEventListener("resize", clearHover);
  };
  const state = { users: 0, cleanup };
  documentStates.set(doc, state);
  return retainTooltipDocument(doc, state);
}
