/** Bounded, cancellable work ownership for detached image capture and native rasterization. */
export class CanvasImageError extends Error {
  /** Expose stable UI reasons without forwarding host errors or vault/resource destinations. */
  constructor(readonly reason: "retired" | "limit" | "capture") {super(`Canvas image ${reason}`);}
}
export type ImageExportGuard = Readonly<{signal?: AbortSignal; current: () => boolean}>;

/** Every asynchronous operation belongs to one canvas/document and a finite lifetime. */
export class ImageExportLifetime {
  readonly controller: AbortController;
  private readonly timer: number;
  private readonly deadline: number;
  private timedOut = false;
  private readonly retire: () => void;
  /** Own a timeout and cancellation forwarding; no plugin or graph listener is acquired. */
  constructor(readonly owner: Window & Pick<typeof window, "AbortController" | "Blob" | "FileReader">, private readonly guard: ImageExportGuard, maximumMs = 20_000) {
    this.controller = new owner.AbortController();
    this.deadline = Date.now() + maximumMs;
    this.retire = /** A closed native dialog retires pending fetch/decode continuations. */ () => this.controller.abort();
    guard.signal?.addEventListener("abort", this.retire, {once: true});
    this.timer = owner.setTimeout(/** Native timers can fire before the wall clock reaches its rounded deadline; preserve timeout ownership. */ () => {this.timedOut = true;this.retire();}, maximumMs);
    if (guard.signal?.aborted) this.retire();
  }
  /** Reject a retired canvas, closed document or exhausted resource-time budget. */
  check(): void {
    if (this.timedOut || Date.now() >= this.deadline) throw new CanvasImageError("limit");
    if (this.controller.signal.aborted || this.owner.closed || !this.guard.current()) throw new CanvasImageError("retired");
  }
  /** Retire promises promptly on cancel; handlers also consume late native failures. */
  async wait<T>(pending: Promise<T>): Promise<T> {
    this.check();
    const signal = this.controller.signal;
    let abort: (() => void) | undefined;
    try {
      const result = await Promise.race([pending, new Promise<never>(/** Cancellation never leaves an unhandled decode/fetch promise. */ (_resolve, reject) => {
        abort = /** Reject only normalized internal reasons. */ () => reject(new CanvasImageError(this.timedOut || Date.now() >= this.deadline ? "limit" : "retired"));
        signal.addEventListener("abort", abort, {once: true});
        if (signal.aborted) abort();
      })]);
      this.check();return result;
    } finally {if (abort) signal.removeEventListener("abort", abort);}
  }
  /** Yield through the owning window without leaving a timer behind on cancellation. */
  async yield(): Promise<void> {
    this.check();let timer: number | undefined;
    try {await this.wait(new Promise<void>(/** Keep every batch independently cancellable. */ resolve => {timer = this.owner.setTimeout(resolve, 0);}));}
    finally {if (timer !== undefined) this.owner.clearTimeout(timer);}
  }
  /** Release all forwarding listeners, timers and pending resource requests once. */
  dispose(): void {this.owner.clearTimeout(this.timer);this.guard.signal?.removeEventListener("abort", this.retire);this.controller.abort();}
}
