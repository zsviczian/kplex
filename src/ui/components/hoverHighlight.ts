/**
 * Own one surface's delayed, immediate or modifier-gated hover feedback. Callers provide the
 * owning window and publish only their local presentation state; drag and touch stay separate.
 * The binding below retires timers/candidates on owner-window blur, hiding and teardown.
 */
export class HoverHighlight<T> {
  private timer: number | null = null;
  private candidate: T | null = null;
  private alt = false;
  private enteredAt = 0;
  private modifierCandidate = false;

  /** Select modifier gating or a caller-specific delay; ordinary connection hover keeps 750 ms. */
  constructor(
    private readonly owner: Window,
    private readonly requireAlt: boolean,
    private readonly publish: (target: T | null) => void,
    private readonly delayMs = 750,
    private readonly modifierFeedback?: Readonly<{ accepts: (target: T) => boolean; publish: (target: T | null) => void }>,
  ) {}

  /** Remember the hovered occurrence so a stationary pointer can respond to modifier changes. */
  enter(target: T, event: { altKey: boolean; pointerType: string; isTrusted?: boolean }): void {
    if (event.pointerType === "touch") { if (this.modifierFeedback) this.clear(); return; }
    this.clear(false);
    this.candidate = target;
    this.alt = event.altKey;
    this.enteredAt = this.owner.performance.now();
    this.modifierCandidate = event.pointerType === "mouse" && event.isTrusted === true && this.modifierFeedback?.accepts(target) === true;
    this.modifierFeedback?.publish(this.modifierCandidate && this.alt ? target : null);
    if (this.requireAlt || this.modifierCandidate && this.alt) this.publish(this.alt ? target : null);
    else this.activateOrdinary();
  }

  /** Key transitions never consume host shortcuts or alter a drag-owned highlight. */
  modifier(alt: boolean, trusted = false): void {
    if (this.candidate === null || this.alt === alt || !this.requireAlt && !this.modifierCandidate) return;
    if (this.modifierCandidate && !trusted) return;
    this.alt = alt;
    if (this.timer !== null) this.owner.clearTimeout(this.timer);
    this.timer = null;
    if (this.modifierCandidate) this.modifierFeedback?.publish(alt ? this.candidate : null);
    if (this.requireAlt || alt) this.publish(alt ? this.candidate : null);
    else { this.publish(null); this.activateOrdinary(); }
  }

  /** Release restores the original hover deadline, rather than adding a second delayed owner. */
  private activateOrdinary(): void {
    const target = this.candidate;
    if (target === null) return;
    const remaining = Math.max(0, this.delayMs - (this.owner.performance.now() - this.enteredAt));
    if (remaining === 0) this.publish(target);
    else this.timer = this.owner.setTimeout(/** Retire this one activation through the existing clear path. */ () => {
      this.timer = null; this.publish(target);
    }, remaining);
  }

  /** Retire pending activation before leave, navigation, blur, policy changes or teardown. */
  clear(active = true): void {
    if (this.timer !== null) this.owner.clearTimeout(this.timer);
    this.timer = null;
    this.candidate = null;
    this.modifierCandidate = false;
    this.modifierFeedback?.publish(null);
    if (active) this.publish(null);
  }
}

/** Bind only to this graph's owning window/document, with a single explicit cleanup path. */
export function bindHoverHighlight<T>(element: HTMLElement, highlight: HoverHighlight<T>): () => void {
  const doc = element.ownerDocument;
  const owner = doc.defaultView!;
  const key = /** Keep a stationary candidate synchronized without consuming host shortcuts. */ (event: KeyboardEvent): void => highlight.modifier(event.altKey, event.isTrusted);
  const blur = /** Retire feedback when the owning window loses focus. */ (): void => highlight.clear();
  const visibility = /** A hidden document cannot retain an active pointer candidate. */ (): void => { if (doc.visibilityState === "hidden") highlight.clear(); };
  owner.addEventListener("keydown", key);
  owner.addEventListener("keyup", key);
  owner.addEventListener("blur", blur);
  doc.addEventListener("visibilitychange", visibility);
  return /** Remove the exact owner listeners before releasing transient presentation state. */ () => {
    owner.removeEventListener("keydown", key);
    owner.removeEventListener("keyup", key);
    owner.removeEventListener("blur", blur);
    doc.removeEventListener("visibilitychange", visibility);
    highlight.clear();
  };
}
