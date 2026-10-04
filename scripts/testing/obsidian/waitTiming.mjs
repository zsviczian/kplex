/** Native-test-only promise timing; self-contained so the CLI can inject this exact function. */
export function createWaitTimingProbe({ now, phase }) {
  const categories = ["yield", "transaction", "digest"];
  const upperBoundsMs = [0.1, 0.25, 0.5, 1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, null];
  const limit = 128, groups = new Map(), phases = new Map(), active = [0, 0, 0];
  const started = now();
  let last = started, lastPhase = phase(), running = true;
  /** Aggregate intervals by simultaneous wait membership, without retaining per-call samples. */
  function advance(at) {
    let key = lastPhase;
    if (!phases.has(key) && phases.size >= limit - 1) key = "other";
    let row = phases.get(key);
    if (!row) { row = { elapsedMs: 0, membershipMs: Array(8).fill(0) }; phases.set(key, row); }
    const mask = active.reduce((value, count, index) => value | (count > 0 ? 1 << index : 0), 0);
    const elapsed = Math.max(0, at - last);
    row.elapsedMs += elapsed; row.membershipMs[mask] += elapsed;
    last = at; lastPhase = phase();
  }
  function snapshot() {
    return { elapsedMs: last - started, running, active: [...active], categories: [...categories], upperBoundsMs: [...upperBoundsMs],
      semantics: "Promise observation latency and disjoint interval membership; transaction/digest durations include callback and microtask scheduling, not exclusive disk/hash CPU time. Membership 0 includes unwrapped work and waits, not just CPU. Phase grouping uses the phase at invocation.",
      groups: Object.fromEntries([...groups].map(([key, row]) => [key, { ...row, pending: row.calls - row.completed, histogram: [...row.histogram] }])),
      phases: Object.fromEntries([...phases].map(([key, row]) => [key, { ...row, membershipMs: [...row.membershipMs] }])) };
  }
  return {
    /** Forward the original return value and rejection, adding only passive promise observers. */
    observe(category, label, invoke) {
      if (!running) return invoke();
      const index = categories.indexOf(category);
      if (index < 0) throw Error("Unknown wait category");
      const start = now(); advance(start);
      let key = lastPhase + ":" + category + ":" + label;
      if (!groups.has(key) && groups.size >= limit - 1) key = "other";
      let row = groups.get(key);
      if (!row) {
        row = { calls: 0, completed: 0, rejected: 0, synchronousThrows: 0, invocationMs: 0,
          totalMs: 0, minMs: null, maxMs: 0, histogram: Array(upperBoundsMs.length).fill(0) };
        groups.set(key, row);
      }
      row.calls += 1; active[index] += 1;
      const finish = (rejected, synchronousThrow = false) => {
        if (!running) return;
        const end = now(); advance(end); active[index] -= 1;
        const duration = Math.max(0, end - start);
        row.completed += 1; row.rejected += Number(rejected); row.synchronousThrows += Number(synchronousThrow);
        row.totalMs += duration; row.minMs = row.minMs === null ? duration : Math.min(row.minMs, duration);
        row.maxMs = Math.max(row.maxMs, duration);
        const bucket = upperBoundsMs.findIndex(bound => bound === null || duration <= bound);
        row.histogram[bucket] += 1;
      };
      let value;
      try { value = invoke(); }
      catch (error) { row.invocationMs += now() - start; finish(true, true); throw error; }
      row.invocationMs += now() - start;
      if (value && typeof value.then === "function") value.then(() => finish(false), () => finish(true));
      else finish(false);
      return value;
    },
    /** Called at real diagnostic phase boundaries; never schedules a timer or production work. */
    checkpoint() { if (running) advance(now()); },
    snapshot,
    stop() { if (running) { advance(now()); running = false; } return snapshot(); },
  };
}
