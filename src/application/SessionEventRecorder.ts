/**
 * Passive support evidence for one plugin lifetime. This application helper owns only a bounded ring
 * of immutable scalar events; callers supply a monotonic clock and existing boundary observations.
 * It never schedules work, reads the host, retains error strings or notifies presentation consumers.
 */
export const SESSION_EVENT_LIMIT = 96;
export const SESSION_EVENT_BYTE_LIMIT = 16 * 1024;
export const SESSION_EVENT_MAX_AGE_MS = 30 * 60 * 1000;
export const SESSION_EVENT_CODES = ["plugin-start", "cache-restore-start", "cache-restore-end", "cache-restore-failure",
  "index-phase-change", "navigation-request", "navigation-settle", "action-failed", "view-created", "view-closed",
  "semantic-preparation-pending", "semantic-preparation-failure"] as const;
export const SUPPORT_PHASES = ["idle", "ready", "loading-cache", "preparing", "checking-cache", "indexing", "saving-cache", "updating", "incomplete",
  "metadata", "preview", "source-authority", "requested-semantics", "node-vocabulary", "pages", "file-rebind", "relations", "preview-search", "evidence",
  "resolve", "authoritative-search", "promote", "complete", "failed", "timed-out", "cancelled", "host-metadata-comparison", "host-retired-owner-check",
  "source-inventory", "source-coordinates", "source-reconciliation", "source-retired-owner-check", "dependency-completion", "resolution-reconciliation",
  "dependency-final-validation"] as const;
export const SESSION_EVENT_OUTCOMES = ["started", "ready", "complete", "pending", "failed", "cancelled", "superseded", "unavailable"] as const;
export const SESSION_EVENT_CATEGORIES = ["navigation", "action", "index", "view", "cache"] as const;
export type SessionEventCode = typeof SESSION_EVENT_CODES[number];
export type SessionEventFields = Readonly<{
  phase?: typeof SUPPORT_PHASES[number]; outcome?: typeof SESSION_EVENT_OUTCOMES[number];
  category?: typeof SESSION_EVENT_CATEGORIES[number]; durationMs?: number; count?: number;
}>;
export type SessionEvent = Readonly<{ code: SessionEventCode; atMs: number } & SessionEventFields>;
export type SessionEventSnapshot = Readonly<{
  eventsCaptureStatus: "active" | "disabled" | "disposed";
  events: readonly SessionEvent[]; droppedEvents: number; retainedBytes: number;
}>;

/** Read own data properties without invoking accessors; inaccessible proxy fields become missing. */
export function supportField(input: unknown, key: string): unknown {
  if (input === null || typeof input !== "object") return undefined;
  try { const descriptor = Object.getOwnPropertyDescriptor(input, key); return descriptor && "value" in descriptor ? descriptor.value : undefined; }
  catch { return undefined; }
}
/** Match exact predeclared scalar vocabulary without coercing arbitrary host objects. */
export function supportCode<T extends string>(input: unknown, vocabulary: readonly T[], fallback: T | "unavailable" = "unavailable"): T | "unavailable" {
  for (const code of vocabulary) if (input === code) return code;
  return fallback;
}
/** Reject negative, nonfinite, fractional and overflowing counters rather than exporting their text. */
export function supportCount(input: unknown): number | null {
  return typeof input === "number" && Number.isSafeInteger(input) && input >= 0 ? input : null;
}

/** Normalize measured durations to whole milliseconds without treating fractional observations as missing. */
export function supportDuration(input: unknown): number | null {
  return typeof input === "number" && Number.isFinite(input) && input >= 0 && input <= Number.MAX_SAFE_INTEGER ? Math.floor(input) : null;
}

/** Fixed-capacity ring; rotation and expiry are bounded by 96 slots and require no maintenance timer. */
export class SessionEventRecorder {
  private slots: Array<{ event: SessionEvent; bytes: number } | undefined> = new Array<{ event: SessionEvent; bytes: number } | undefined>(SESSION_EVENT_LIMIT);
  private head = 0;
  private size = 0;
  private bytes = 0;
  private dropped = 0;
  private disposed = false;
  private startedMs: number;
  private latestMs = 0;

  /** Capture the session's clock origin; disabled capture never reads even the injected clock. */
  constructor(private readonly clock: () => number, private readonly enabled = true) {
    this.startedMs = enabled ? this.readClock(0) : 0;
  }
  /** Ignore malformed/retired observations and retain only finite, copied optional scalar fields. */
  record(code: SessionEventCode, fields: SessionEventFields = {}): void {
    if (!this.enabled || this.disposed || !SESSION_EVENT_CODES.includes(code)) return;
    const atMs = this.elapsed();
    this.expire(atMs);
    const event: { code: SessionEventCode; atMs: number } & { -readonly [K in keyof SessionEventFields]: SessionEventFields[K] } = { code, atMs };
    const phase = supportCode(supportField(fields, "phase"), SUPPORT_PHASES);
    const outcome = supportCode(supportField(fields, "outcome"), SESSION_EVENT_OUTCOMES);
    const category = supportCode(supportField(fields, "category"), SESSION_EVENT_CATEGORIES);
    if (phase !== "unavailable") event.phase = phase;
    if (outcome !== "unavailable") event.outcome = outcome;
    if (category !== "unavailable") event.category = category;
    const duration = supportDuration(supportField(fields, "durationMs")), count = supportCount(supportField(fields, "count"));
    if (duration !== null) event.durationMs = duration;
    if (count !== null) event.count = count;
    // Every string is an ASCII enum and numbers are bounded; JSON length is the exact UTF-8 size.
    const immutable = Object.freeze(event), bytes = JSON.stringify(immutable).length;
    while (this.size && (this.size >= SESSION_EVENT_LIMIT || this.bytes + bytes > SESSION_EVENT_BYTE_LIMIT)) this.dropOldest();
    if (bytes > SESSION_EVENT_BYTE_LIMIT) { this.dropped++; return; }
    this.slots[(this.head + this.size) % SESSION_EVENT_LIMIT] = { event: immutable, bytes };
    this.size++; this.bytes += bytes;
  }
  /** Return immutable detached copies; reading a report lazily expires stale evidence only. */
  snapshot(): SessionEventSnapshot {
    if (this.enabled && !this.disposed) this.expire(this.elapsed());
    const events: SessionEvent[] = [];
    for (let index = 0; index < this.size; index++) {
      const slot = this.slots[(this.head + index) % SESSION_EVENT_LIMIT];
      if (slot) events.push(Object.freeze({ ...slot.event }));
    }
    return Object.freeze({ eventsCaptureStatus: this.disposed ? "disposed" : this.enabled ? "active" : "disabled",
      events: Object.freeze(events), droppedEvents: this.dropped, retainedBytes: this.bytes });
  }
  /** Retire this lifetime permanently and release every retained slot; repeated cleanup is harmless. */
  dispose(): void { this.disposed = true; this.slots.fill(undefined); this.head = 0; this.size = 0; this.bytes = 0; }
  /** Bound and isolate malformed/throwing injected clocks, without retaining underlying exceptions. */
  private readClock(fallback: number): number {
    try { const value = this.clock(); return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : fallback; }
    catch { return fallback; }
  }
  /** Keep occurrence ordering monotonic even if a host clock regresses or exceeds safe numeric range. */
  private elapsed(): number {
    this.latestMs = Math.max(this.latestMs, Math.min(Number.MAX_SAFE_INTEGER, Math.floor(this.readClock(this.startedMs + this.latestMs) - this.startedMs)));
    return this.latestMs;
  }
  /** Expire oldest slots during existing record/snapshot calls; no background observer is installed. */
  private expire(now: number): void {
    while (this.size) {
      const oldest = this.slots[this.head];
      if (oldest && now - oldest.event.atMs <= SESSION_EVENT_MAX_AGE_MS) break;
      this.dropOldest();
    }
  }
  /** Release one slot in constant time and account for deterministic rotation or age expiry. */
  private dropOldest(): void {
    const oldest = this.slots[this.head];
    if (oldest) this.bytes -= oldest.bytes;
    this.slots[this.head] = undefined; this.head = (this.head + 1) % SESSION_EVENT_LIMIT; this.size--; this.dropped++;
  }
}
