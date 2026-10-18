/** A startup surface gets one delayed check and, only if needed, one source-ready follow-up. */
export function startCenterWatchdog(options: Readonly<{
  schedule: (run: () => void, delayMs: number) => () => void;
  sourceReady: () => boolean;
  subscribe: (changed: () => void) => () => void;
  check: (trigger: "initial" | "source-ready", isCurrent: () => boolean) => Promise<boolean>;
}>): () => void {
  let alive = true, running = false, checks = 0, waiting = false;
  let cancelTimer: (() => void) | null = null;
  let release = (): void => {};
  /** Exact owner teardown cancels timers/subscriptions; accepted semantic work keeps its demand owner. */
  const dispose = (): void => {alive = false; cancelTimer?.(); cancelTimer = null; release();};
  /** Readiness events never reset the initial delay or create an idle timer loop. */
  const changed = (): void => {
    if (alive && waiting && checks === 1 && !running && options.sourceReady()) arm("source-ready");
  };
  /** One finite timer per admitted check; navigation/unmount retires its completion callback. */
  const arm = (trigger: "initial" | "source-ready"): void => {
    waiting = false; cancelTimer?.();
    cancelTimer = options.schedule(() => {
      cancelTimer = null; if (!alive) return;
      running = true; checks++;
      const readyBefore = options.sourceReady();
      void options.check(trigger, () => alive).then(complete => {
        if (!alive) return;
        running = false;
        if (complete || checks === 2 || readyBefore) {dispose(); return;}
        waiting = true; changed();
      }, () => {if (alive) dispose();});
    }, 3000);
  };
  release = options.subscribe(changed);
  arm("initial");
  return dispose;
}
