/** Surface-owned native page-preview intent, shared by nodes and saved lists. An active preview
 * leases a DOM marker so the shared tooltip owner yields without changing accessible names. */
export const HOVER_PREVIEW_ACTIVE_ATTRIBUTE = "data-kplex-hover-preview-active";

/** Own one hovered occurrence and its preview/tooltip handoff until leave, blur or disposal. */
export class HoverPreview {
  private candidate: {element: HTMLElement; event: PointerEvent; modified: boolean; ownsTooltipSuppression: boolean; preview: (event: MouseEvent) => void} | null = null;

  /** Suppress overlapping hints for this hover's lifetime, including after modifier release while
   * the native preview can remain open. The caller alone owns opening the actual popover. */
  private openPreview(event: MouseEvent): void {
    const candidate = this.candidate;
    if (!candidate) return;
    if (!candidate.element.hasAttribute(HOVER_PREVIEW_ACTIVE_ATTRIBUTE)) {
      candidate.element.setAttribute(HOVER_PREVIEW_ACTIVE_ATTRIBUTE, "");candidate.ownsTooltipSuppression = true;
    }
    candidate.preview(event);
  }

  /** Retain only the hovered occurrence; an unmodified hover schedules no preview or timer. */
  enter(element: HTMLElement, event: PointerEvent, preview: (event: MouseEvent) => void): void {
    this.clear();
    if (event.pointerType === "touch") return;
    const modified = event.ctrlKey || event.metaKey;
    this.candidate = {element, event, modified, ownsTooltipSuppression: false, preview};
    if (modified) this.openPreview(event);
  }

  /** Keep the eventual popover near the current pointer without renewing or opening it. */
  move(event: PointerEvent): void {
    if (this.candidate) this.candidate.event = event;
  }

  /** A fresh Ctrl/Cmd press opens the same native preview once, without consuming shortcuts. */
  modifier(event: KeyboardEvent): void {
    const candidate = this.candidate;
    if (!candidate) return;
    if (!candidate.element.isConnected || candidate.element.ownerDocument.visibilityState === "hidden") {this.clear(); return;}
    const modified = event.ctrlKey || event.metaKey;
    if (!modified) {candidate.modified = false; return;}
    if (event.type !== "keydown" || event.repeat || candidate.modified || (event.key !== "Control" && event.key !== "Meta")) return;
    candidate.modified = true;
    const owner = candidate.element.ownerDocument.defaultView;
    if (!owner) return;
    // The native hover contract expects a mouse event. Preserve pointer coordinates while using
    // the new modifier state and the target's actual window (including popouts).
    this.openPreview(new owner.MouseEvent("mousemove", {view: owner,
      clientX: candidate.event.clientX, clientY: candidate.event.clientY,
      screenX: candidate.event.screenX, screenY: candidate.event.screenY,
      ctrlKey: event.ctrlKey, metaKey: event.metaKey, altKey: event.altKey, shiftKey: event.shiftKey}));
  }

  /** Navigation, leave, drag, blur, hidden surfaces and teardown all retire the captured occurrence. */
  clear(): void {
    if (this.candidate?.ownsTooltipSuppression) this.candidate.element.removeAttribute(HOVER_PREVIEW_ACTIVE_ATTRIBUTE);
    this.candidate = null;
  }
}

/** Bind one preview owner per graph to its actual window; remove every listener on teardown. */
export function bindHoverPreview(element: HTMLElement, preview: HoverPreview): () => void {
  const doc = element.ownerDocument, owner = doc.defaultView!;
  const key = /** Preserve host keyboard propagation while updating only this graph's hover intent. */ (event: KeyboardEvent): void => preview.modifier(event);
  const move = /** Track pointer position inside this surface, including text and gate descendants. */ (event: PointerEvent): void => preview.move(event);
  const clear = /** Native pointer actions and focus changes end hover-owned preview eligibility. */ (): void => preview.clear();
  const visibility = /** A hidden window must not react to a later modifier from another surface. */ (): void => {if (doc.visibilityState === "hidden") preview.clear();};
  owner.addEventListener("keydown", key);
  owner.addEventListener("keyup", key);
  owner.addEventListener("blur", clear);
  element.addEventListener("pointermove", move);
  element.addEventListener("pointerdown", clear, true);
  doc.addEventListener("visibilitychange", visibility);
  return /** Release the exact native owner, including a stationary candidate. */ () => {
    owner.removeEventListener("keydown", key);
    owner.removeEventListener("keyup", key);
    owner.removeEventListener("blur", clear);
    element.removeEventListener("pointermove", move);
    element.removeEventListener("pointerdown", clear, true);
    doc.removeEventListener("visibilitychange", visibility);
    preview.clear();
  };
}
