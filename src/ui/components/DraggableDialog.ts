/**
 * Owner-document drag mechanics for dialog and floating-panel shells. This portable UI helper owns only
 * pointer/viewport geometry and cleanup; native Obsidian modal lifecycle, focus and content stay
 * with the host shell that opts into it.
 */

export interface DraggableDialogOptions {
  modalEl: HTMLElement;
  handleEl: HTMLElement;
  viewportMargin?: number;
  /** Let a React shell own matching inline coordinates while native shells retain CSS positioning. */
  onPositionChange?: (position: Readonly<{ left: number; top: number }>) => void;
}

type DragState = Readonly<{
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startLeft: number;
  startTop: number;
}>;

type ViewportBounds = Readonly<{
  left: number;
  top: number;
  width: number;
  height: number;
}>;

const DEFAULT_VIEWPORT_MARGIN = 8;
const DRAG_START_DISTANCE = 3;
const INTERACTIVE_SELECTOR = "button, input, select, textarea, a[href], [contenteditable='true'], [role='button'], [role='link'], [data-kplex-no-dialog-drag]";

/** Provide an inert cleanup callback when drag mechanics cannot bind to an owning window. */
function noopCleanup(): void {}

/** Return the event target as an Element without relying on the parent window's constructors. */
function eventTargetElement(target: EventTarget | null): Element | null {
  if (!target || typeof target !== "object" || !("closest" in target)) return null;
  return target as Element;
}

/** Decide whether a pointer-down belongs to a real control inside the drag handle. */
function isInteractiveTarget(target: EventTarget | null, handleEl: HTMLElement): boolean {
  const element = eventTargetElement(target);
  const interactive = element?.closest(INTERACTIVE_SELECTOR) ?? null;
  return Boolean(interactive && handleEl.contains(interactive));
}

/** Clamp one dialog coordinate so the full edge remains visible whenever the dialog fits. */
function clampCoordinate(value: number, viewportStart: number, viewportSize: number, itemSize: number, margin: number): number {
  const minimum = viewportStart + margin;
  const maximum = Math.max(minimum, viewportStart + viewportSize - itemSize - margin);
  return Math.min(maximum, Math.max(minimum, value));
}

/** Read the active visual viewport when available, falling back to the owning window viewport. */
function viewportBounds(view: Window): ViewportBounds {
  const viewport = view.visualViewport;
  return {
    left: viewport?.offsetLeft ?? 0,
    top: viewport?.offsetTop ?? 0,
    width: viewport?.width ?? view.innerWidth,
    height: viewport?.height ?? view.innerHeight,
  };
}

/**
 * Attach draggable positioning to a dialog using only its owning document/window.
 *
 * Pointer moves are intercepted during an active drag so the Plex behind the modal cannot pan or
 * react to the same gesture. Capture loss or owning-window blur releases that interception even
 * when the pointer-up stream is interrupted. Resizing or moving the viewport reclamps a dragged
 * dialog, and cleanup restores native centered positioning for the next open.
 *
 * @remarks A shell supplying `onPositionChange` owns matching inline positioning and discards its
 * retained coordinates when the dialog closes; the default native-modal path needs no callback.
 * @returns An idempotent cleanup function for modal close/unload.
 */
export function enableDraggableDialog({
  modalEl,
  handleEl,
  viewportMargin = DEFAULT_VIEWPORT_MARGIN,
  onPositionChange,
}: DraggableDialogOptions): () => void {
  const ownerDocument = modalEl.ownerDocument;
  const ownerWindow = ownerDocument.defaultView;
  if (!ownerWindow || handleEl.ownerDocument !== ownerDocument) return noopCleanup;

  let dragState: DragState | null = null;
  let dragActive = false;
  let positioned = false;
  let disposed = false;
  const visualViewport = ownerWindow.visualViewport;

  /** Apply fixed dialog coordinates through scoped CSS variables. */
  const setPosition = (left: number, top: number): void => {
    const rect = modalEl.getBoundingClientRect();
    const bounds = viewportBounds(ownerWindow);
    const clampedLeft = clampCoordinate(left, bounds.left, bounds.width, rect.width, viewportMargin);
    const clampedTop = clampCoordinate(top, bounds.top, bounds.height, rect.height, viewportMargin);
    modalEl.style.setProperty("--kplex-dialog-left", `${clampedLeft}px`);
    modalEl.style.setProperty("--kplex-dialog-top", `${clampedTop}px`);
    modalEl.classList.add("is-positioned");
    positioned = true;
    onPositionChange?.({ left: clampedLeft, top: clampedTop });
  };

  /** Re-clamp a dragged dialog after viewport/window geometry changes. */
  const clampCurrentPosition = (): void => {
    if (!positioned || disposed) return;
    const rect = modalEl.getBoundingClientRect();
    setPosition(rect.left, rect.top);
  };

  /** Remove owner-document move/end listeners for the active gesture. */
  const removeActivePointerListeners = (): void => {
    ownerDocument.removeEventListener("pointermove", onPointerMove, true);
    ownerDocument.removeEventListener("pointerup", onPointerEnd, true);
    ownerDocument.removeEventListener("pointercancel", onPointerEnd, true);
  };

  /** Finish the current drag without changing form focus or modal lifecycle. */
  const finishDrag = (): void => {
    if (!dragState) return;
    const pointerId = dragState.pointerId;
    dragState = null;
    dragActive = false;
    removeActivePointerListeners();
    if (handleEl.hasPointerCapture(pointerId)) handleEl.releasePointerCapture(pointerId);
    modalEl.classList.remove("is-dragging");
    handleEl.classList.remove("is-dragging");
  };

  /** Move the dialog for the active pointer and consume the gesture before background handlers. */
  function onPointerMove(event: PointerEvent): void {
    const state = dragState;
    if (!state || event.pointerId !== state.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    const deltaX = event.clientX - state.startClientX;
    const deltaY = event.clientY - state.startClientY;
    if (!dragActive) {
      if (Math.hypot(deltaX, deltaY) < DRAG_START_DISTANCE) return;
      dragActive = true;
      modalEl.classList.add("is-dragging");
      handleEl.classList.add("is-dragging");
    }
    setPosition(state.startLeft + deltaX, state.startTop + deltaY);
  }

  /** End the matching active pointer gesture while leaving the dialog at its clamped position. */
  function onPointerEnd(event: PointerEvent): void {
    if (!dragState || event.pointerId !== dragState.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    finishDrag();
  }

  /** Retire only the captured active pointer; late loss from another gesture cannot cancel this one. */
  const onLostPointerCapture = (event: PointerEvent): void => {
    if (dragState?.pointerId === event.pointerId) finishDrag();
  };

  /** Window deactivation may deliver no pointer-up in this document, so release its interception. */
  const onWindowBlur = (): void => { finishDrag(); };

  /** Start a primary-button drag unless the user targeted an interactive control in the header. */
  const onPointerDown = (event: PointerEvent): void => {
    if (disposed || dragState || event.button !== 0 || isInteractiveTarget(event.target, handleEl)) return;
    const rect = modalEl.getBoundingClientRect();
    dragState = {
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startLeft: rect.left,
      startTop: rect.top,
    };
    ownerDocument.addEventListener("pointermove", onPointerMove, true);
    ownerDocument.addEventListener("pointerup", onPointerEnd, true);
    ownerDocument.addEventListener("pointercancel", onPointerEnd, true);
    try {
      handleEl.setPointerCapture(event.pointerId);
    } catch {
      // Synthetic/older host pointer streams can reject capture; owning-document listeners remain the fallback.
    }
    event.preventDefault();
    event.stopPropagation();
  };

  /** Release all listeners/classes/styles, including when the owning pop-out window tears down. */
  const cleanup = (): void => {
    if (disposed) return;
    disposed = true;
    finishDrag();
    handleEl.removeEventListener("pointerdown", onPointerDown);
    handleEl.removeEventListener("lostpointercapture", onLostPointerCapture);
    ownerWindow.removeEventListener("blur", onWindowBlur);
    ownerWindow.removeEventListener("resize", clampCurrentPosition);
    ownerWindow.removeEventListener("pagehide", cleanup);
    visualViewport?.removeEventListener("resize", clampCurrentPosition);
    visualViewport?.removeEventListener("scroll", clampCurrentPosition);
    modalEl.classList.remove("kplex-draggable-dialog", "is-positioned", "is-dragging");
    handleEl.classList.remove("kplex-draggable-dialog-handle", "is-dragging");
    modalEl.style.removeProperty("--kplex-dialog-left");
    modalEl.style.removeProperty("--kplex-dialog-top");
  };

  modalEl.classList.add("kplex-draggable-dialog");
  handleEl.classList.add("kplex-draggable-dialog-handle");
  handleEl.addEventListener("pointerdown", onPointerDown);
  handleEl.addEventListener("lostpointercapture", onLostPointerCapture);
  ownerWindow.addEventListener("blur", onWindowBlur);
  ownerWindow.addEventListener("resize", clampCurrentPosition);
  ownerWindow.addEventListener("pagehide", cleanup);
  visualViewport?.addEventListener("resize", clampCurrentPosition);
  visualViewport?.addEventListener("scroll", clampCurrentPosition);

  return cleanup;
}
