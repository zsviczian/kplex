/**
 * Gesture-safe, host-free clipboard state for one immutable support report. The host injects the
 * actual owning-window writer and native presentation listener. No timers, browser globals or
 * diagnostic gathering occur here; writes start synchronously and stale completions are retired.
 */
export type SupportCopyState = "idle" | "copying" | "copied" | "failed";
type CopyLease = { state: SupportCopyState; retired: boolean; notify: ((state: SupportCopyState) => void) | null };

/** Own one report's clipboard attempt and release native presentation references on dismissal. */
export class SupportClipboardSession {
  private readonly lease: CopyLease = { state: "idle", retired: false, notify: null };

  /** Capture exact displayed bytes and a narrow writer; constructing the session performs no I/O. */
  constructor(readonly report: string, private write: ((text: string) => Promise<void>) | null) {}

  /** Return truthful immediate state without reading permissions or touching the clipboard. */
  get state(): SupportCopyState { return this.lease.state; }

  /** Bind the currently mounted native presentation and deliver its retained state immediately. */
  listen(notify: (state: SupportCopyState) => void): void {
    if (this.lease.retired) return;
    this.lease.notify = notify;
    notify(this.lease.state);
  }

  /**
   * Start the injected write in this handler turn, before any asynchronous suspension. A pending
   * attempt cannot be duplicated. Its callbacks retain only a revocable lease, not this session,
   * the writer, a plugin or the native modal; closing clears the lease's presentation reference.
   */
  copy(): void {
    const lease = this.lease;
    if (lease.retired || lease.state === "copying") return;
    lease.state = "copying";
    lease.notify?.(lease.state);
    let pending: Promise<void>;
    try {
      if (!this.write) throw new Error("Clipboard writer unavailable");
      pending = this.write(this.report);
    } catch {
      lease.state = "failed";
      lease.notify?.(lease.state);
      return;
    }
    /** Map the actual clipboard result without exposing errors or reviving dismissed presentation. */
    const settle = (state: "copied" | "failed"): void => {
      if (lease.retired) return;
      lease.state = state;
      lease.notify?.(state);
    };
    void Promise.resolve(pending).then(
      /** Only fulfilled native writes are reported as copied. */ () => settle("copied"),
      /** Denial retains the same report for retry/manual selection, without raw error details. */ () => settle("failed"),
    );
  }

  /** Retire pending completions and release owning-window/native presentation captures once. */
  dispose(): void {
    this.lease.retired = true;
    this.lease.notify = null;
    this.write = null;
  }
}
