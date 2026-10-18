/** Path-free, bounded receipts for an initial visible-center recheck. No source/write authority. */
export type CenterRelationCounts = readonly [number, number, number, number, number];
/** Same pre-lens, pre-section, display-limited neighborhood on both sides of the comparison. */
export function centerRelationCounts(value: Readonly<{parents: readonly unknown[]; children: readonly unknown[];
  leftFriends: readonly unknown[]; rightFriends: readonly unknown[]; siblings: readonly unknown[]}> | null): CenterRelationCounts {
  return value ? [value.parents.length, value.children.length, value.leftFriends.length, value.rightFriends.length, value.siblings.length] : [0, 0, 0, 0, 0];
}
export const CENTER_COVERAGE = ["canonical", "local", "cached", "preview", "missing"] as const;
export type CenterCoverage = typeof CENTER_COVERAGE[number];
export const CENTER_RECOVERY_OUTCOMES = ["checking", "healthy", "repainted", "repaired", "pending", "cancelled", "failed"] as const;
export type CenterRecoveryDiagnostic = Readonly<{
  trigger: "initial" | "local-ready" | "source-ready";
  outcome: typeof CENTER_RECOVERY_OUTCOMES[number];
  sourceReadyBefore: boolean;
  sourceReadyAfter: boolean;
  activeBefore: boolean;
  coverageBefore: CenterCoverage;
  coverageAfter: CenterCoverage;
  presented: CenterRelationCounts;
  before: CenterRelationCounts;
  after: CenterRelationCounts;
}>;

/** Whitelist aggregate fields without invoking accessors, coercion or toJSON on untrusted reports. */
export function sanitizeCenterRecoveryDiagnostic(value: unknown): CenterRecoveryDiagnostic | undefined {
  try {
    if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
    const read = (key: string): unknown => Object.getOwnPropertyDescriptor(value, key)?.value;
    /** Exactly five nonnegative role counts; user strings and arbitrary arrays never cross export. */
    const counts = (input: unknown): CenterRelationCounts | undefined => {
      if (!Array.isArray(input) || input.length !== 5) return undefined;
      const next: number[] = [];
      for (let i = 0; i < 5; i++) {
        const count: unknown = Object.getOwnPropertyDescriptor(input, String(i))?.value;
        if (typeof count !== "number" || !Number.isSafeInteger(count) || count < 0) return undefined;
        next.push(count);
      }
      return [next[0], next[1], next[2], next[3], next[4]];
    };
    const trigger = ["initial", "local-ready", "source-ready"] as const;
    const chosen = trigger.find(item => item === read("trigger")), outcome = CENTER_RECOVERY_OUTCOMES.find(item => item === read("outcome"));
    const coverageBefore = CENTER_COVERAGE.find(item => item === read("coverageBefore")), coverageAfter = CENTER_COVERAGE.find(item => item === read("coverageAfter"));
    const sourceReadyBefore = read("sourceReadyBefore"), sourceReadyAfter = read("sourceReadyAfter"), activeBefore = read("activeBefore");
    const presented = counts(read("presented")), before = counts(read("before")), after = counts(read("after"));
    if (!chosen || !outcome || !coverageBefore || !coverageAfter || typeof sourceReadyBefore !== "boolean" || typeof sourceReadyAfter !== "boolean" || typeof activeBefore !== "boolean" || !presented || !before || !after) return undefined;
    return {trigger: chosen, outcome, coverageBefore, coverageAfter, sourceReadyBefore, sourceReadyAfter, activeBefore, presented, before, after};
  } catch { return undefined; }
}
