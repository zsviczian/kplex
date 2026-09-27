/**
 * Portable pointer gesture state for recognizing two completed stationary taps on one target.
 * Callers own movement/long-press cancellation and supply event time and viewport coordinates.
 * No timers, DOM resources or host state are retained.
 */
type CompletedTap = { target: string; time: number; x: number; y: number };

/** Recognize disjoint tap pairs without relying on browser-generated double-click events. */
export class DoubleTapGesture {
  private previous: CompletedTap | null = null;

  /**
   * Record a completed tap and return whether it completes a nearby pair on the same opaque target.
   * A recognized pair consumes both taps, so a third tap cannot reopen the target immediately.
   */
  complete(target: string, time: number, x: number, y: number): boolean {
    const previous = this.previous;
    const elapsed = previous ? time - previous.time : -1;
    if (previous?.target === target && elapsed >= 0 && elapsed <= 400
      && Math.hypot(x - previous.x, y - previous.y) <= 24) {
      this.previous = null;
      return true;
    }
    this.previous = { target, time, x, y };
    return false;
  }

  /** Cancel a pending pair when another gesture takes ownership of the pointer stream. */
  reset(): void {
    this.previous = null;
  }
}
