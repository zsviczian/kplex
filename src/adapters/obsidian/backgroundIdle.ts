/**
 * Main-window short idle waits for index pacing. Browser timers can stretch a 24 ms pause to a
 * second in an occluded Electron renderer. A private, four-byte asynchronous atomic wait retains
 * the requested rest without blocking, polling, workers or changing Electron throttling. Hosts
 * without shared-memory/async-wait support keep owning-window timers. The scheduler owns and
 * cancels the returned resource on foreground admission and unload; no vault data crosses here.
 */

type AtomicWait = {async: false; value: "not-equal" | "timed-out"}
  | {async: true; value: Promise<"ok" | "timed-out">};

/** Optional host primitives are discovered together; no shared state escapes one idle wait. */
type BackgroundIdleWindow = Pick<Window, "setTimeout" | "clearTimeout"> & {
  document?: Pick<Document, "defaultView">;
  SharedArrayBuffer?: new (bytes: number) => SharedArrayBuffer;
  Int32Array?: typeof Int32Array;
  Atomics?: {
    waitAsync?: (cell: Int32Array, index: number, expected: number, timeout: number) => AtomicWait;
    notify: (cell: Int32Array, index: number, count: number) => number;
  };
};

/**
 * Schedule one nonblocking pacing pause and return idempotent cancellation. Cancellation wakes
 * only this waiter's private cell and suppresses queued completion, including after fallback.
 * Actual retry/persistence deadlines continue to use the normal main-window timer owner.
 */
export function scheduleBackgroundIdle(callback: () => void, milliseconds: number,
  ownerWindow: BackgroundIdleWindow = window): () => void {
  let active = true;
  let cancelTimer: (() => void) | undefined;
  let notify: (() => void) | undefined;
  /** Retire before invoking the caller, so disposal and queued notifications cannot repeat it. */
  const finish = (): void => {if (!active) return; active = false; callback();};
  /** Keep unsupported/failed capabilities on the established asynchronous host-timer path. */
  const fallback = (): void => {
    if (!active) return;
    const timer = ownerWindow.setTimeout(finish, milliseconds);
    cancelTimer = () => ownerWindow.clearTimeout(timer);
  };
  const atomic = ownerWindow.Atomics;
  const Buffer = ownerWindow.SharedArrayBuffer;
  const Cell = ownerWindow.Int32Array;
  // An ambient atomic API does not establish a live renderer loop. DOM-free consumers retain
  // timer-backed liveness; a bare async waiter need not keep their process/event loop alive.
  const renderer = ownerWindow.document?.defaultView === ownerWindow;
  if (renderer && Buffer && Cell && atomic?.waitAsync && Number.isFinite(milliseconds) && milliseconds > 0) {
    try {
      const cell = new Cell(new Buffer(Cell.BYTES_PER_ELEMENT));
      const wait = atomic.waitAsync(cell, 0, 0, milliseconds);
      if (wait.async) {
        notify = () => {atomic.notify(cell, 0, 1);};
        void wait.value.then(finish, fallback);
      } else fallback();
    } catch {fallback();}
  } else fallback();
  /** Notification releases the native waiter; the active fence also rejects an already queued job. */
  return (): void => {
    if (!active) return;
    active = false;
    cancelTimer?.();
    try {notify?.();} catch { /* The bounded original timeout still retires a failed native notification. */ }
  };
}
