/** Finite startup checks follow actual local/global readiness; progress never creates a polling loop. */
export function startCenterWatchdog(options: Readonly<{
  schedule: (run: () => void, delayMs: number) => () => void;
  sourceReady: () => boolean;
  localReady?: () => boolean;
  subscribe: (changed: () => void) => () => void;
  check: (trigger: "initial" | "local-ready" | "source-ready", isCurrent: () => boolean) => Promise<boolean>;
}>): () => void {
  let alive = true, running = false, checks = 0, waiting = false, checkedLocal = false;
  let cancelTimer: (() => void) | null = null;
  let release = (): void => {};
  /** Exact owner teardown cancels timers/subscriptions; accepted semantic work keeps its demand owner. */
  const dispose = (): void => {alive = false; cancelTimer?.(); cancelTimer = null; release();};
  /** Readiness events never reset the initial delay or create an idle timer loop. */
  const changed = (): void => {
    if (!alive || !waiting || running) return;
    if (options.sourceReady()) arm("source-ready");
    else if (!checkedLocal && options.localReady?.()) arm("local-ready");
  };
  /** One finite timer per admitted check; navigation/unmount retires its completion callback. */
  const arm = (trigger: "initial" | "local-ready" | "source-ready"): void => {
    waiting = false; cancelTimer?.();
    cancelTimer = options.schedule(() => {
      cancelTimer = null; if (!alive) return;
      running = true; checks++;
      const readyBefore = options.sourceReady();
      checkedLocal ||= options.localReady?.() === true;
      void options.check(trigger, () => alive).then(complete => {
        if (!alive) return;
        running = false;
        if (complete || checks === 3 || trigger === "source-ready" || readyBefore) {dispose(); return;}
        waiting = true; changed();
      }, () => {if (alive) dispose();});
    }, 3000);
  };
  release = options.subscribe(changed);
  arm("initial");
  return dispose;
}
