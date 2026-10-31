/**
 * Owns a short desktop compositing lease during direct camera movement. The owning element/window
 * supply DOM and timers; callers retain camera geometry and frame scheduling. Releasing the hint
 * after input settles lets Chromium reraster text sharply at the final scale. Coarse-pointer
 * WebViews retain their existing memory-conservative rendering policy through CSS.
 */
export class CameraMotion {
  private pending: {element: HTMLElement; owner: Window; timer: number} | null = null;

  /** Extend one camera's lease; switching documents/elements retires the previous timer and class. */
  touch(element: HTMLElement): void {
    const owner = element.ownerDocument.defaultView;
    if (!owner) return;
    if (this.pending?.element !== element) this.dispose();
    if (this.pending) this.pending.owner.clearTimeout(this.pending.timer);
    element.classList.add("is-camera-moving");
    this.pending = {element, owner, timer: owner.setTimeout(/** Restore sharp idle rendering without a React update or another camera write. */ () => this.dispose(), 160)};
  }

  /** Release before unmount/migration; a detached owner must never keep a timer or promoted layer. */
  dispose(): void {
    if (!this.pending) return;
    this.pending.owner.clearTimeout(this.pending.timer);
    this.pending.element.classList.remove("is-camera-moving");
    this.pending = null;
  }
}
