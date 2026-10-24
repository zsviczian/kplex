/**
 * Settings-file reconciliation at the plugin's existing disk queue. Detached receipts and local
 * root intents are distinct from mutable live controls. Domains fence remote conflicts; objects
 * and ordered collections are replaced, never recursively merged. No vault or graph capability.
 */
import {copyThemeValue, themeValuesEqual} from "../../core/plex/appearanceThemes";
import {STYLE_SETTINGS_KEYS} from "../../core/contracts/appearance";
import {viewConfigurationOwnerDomains} from "../../core/plex/views/configuration";

export type SettingsSnapshot = Record<string, unknown>;
type RootEdit = Readonly<{key: string; before: unknown; after: unknown; canvas?: Readonly<{id: string; field?: string}>}>;
export type SettingsWriteIntent = Readonly<{edits: readonly RootEdit[]; versions: ReadonlyMap<string, number>}>;
type Candidate = {raw: unknown; snapshot: SettingsSnapshot; overwritten: boolean; base: SettingsSnapshot};
type ReconciliationPorts = Readonly<{
  read: () => Promise<unknown>;
  normalize: (raw: unknown) => SettingsSnapshot;
  install: (snapshot: SettingsSnapshot) => void;
  schedule: () => void;
  failed: () => void;
  conflict: () => Error;
  wait: (ms: number) => Promise<void>;
}>;

/** Narrow decoded containers without allowing Array.isArray's any element type across the boundary. */
function record(value: unknown): value is SettingsSnapshot {return !!value && typeof value === "object" && !Array.isArray(value);}

/** Detach only JSON values; omission and undefined share the existing serializer's meaning. */
function editsBetween(before: SettingsSnapshot, after: SettingsSnapshot): RootEdit[] {
  return [...new Set([...Object.keys(before), ...Object.keys(after)])].filter(
    /** A real deletion remains a replacement with absence, not a stale dictionary merge. */ key => !themeValuesEqual(before[key], after[key]),
  ).flatMap(/** Only the new explicit view namespace has field-level merge ownership; existing roots remain atomic. */ key => {
    const first = before[key], last = after[key];
    if (key !== "canvasViewSettings" || !record(first) || !record(last))
      return [{key, before: copyThemeValue(first), after: copyThemeValue(last)}];
    return [...new Set([...Object.keys(first), ...Object.keys(last)])].flatMap((id): RootEdit[] => {
      const previous = first[id], next = last[id];
      if (themeValuesEqual(previous, next)) return [];
      const known = (value: unknown): boolean => record(value) && value.version === 1 && record(value.values);
      const metadata = (value: unknown): unknown => record(value) ? {...value, values: undefined} : {version: 1, values: undefined};
      if (!(previous === undefined || known(previous)) || !known(next) || !themeValuesEqual(metadata(previous), metadata(next)))
        return [{key, canvas: {id}, before: copyThemeValue(previous), after: copyThemeValue(next)}];
      const left = record(previous) && record(previous.values) ? previous.values : {}, right = record(next) && record(next.values) ? next.values : {};
      return [...new Set([...Object.keys(left), ...Object.keys(right)])].filter(field => !themeValuesEqual(left[field], right[field]))
        .map(field => ({key, canvas: {id, field}, before: copyThemeValue(left[field]), after: copyThemeValue(right[field])}));
    });
  });
}

/** Ignore the active appearance when comparing library management metadata and inactive presets. */
function libraryMetadata(value: unknown): unknown {
  if (!record(value) || !Array.isArray(value.themes)) return value;
  const selected = value.selectedId, themes: unknown[] = value.themes;
  return {...value, themes: themes.map(/** Selected appearance has its own owner; names/order remain library metadata. */ theme =>
    record(theme) && theme.id === selected ? {...theme, appearance: undefined} : theme)};
}

/** Group only coherent real owners, retaining independent workflow/scalar roots and unknown data. */
function domains(edit: RootEdit): string[] {
  if (edit.key === "canvasViewSettings") {
    return [edit.canvas ? `canvasViewSettings:${edit.canvas.id}${edit.canvas.field ? `:${edit.canvas.field}` : ""}` : edit.key];
  }
  if (edit.key === "appearanceThemes") {
    /** Only the selected identity/content retires active drafts; inactive metadata has a separate epoch. */
    const active = (value: unknown): unknown => {
      if (!record(value) || !Array.isArray(value.themes)) return value;
      const selected = value.selectedId, themes: unknown[] = value.themes;
      const theme = themes.find(/** Only one selected preset participates in live appearance. */ theme => record(theme) && theme.id === selected);
      return [selected, record(theme) ? theme.appearance : undefined];
    };
    return [!themeValuesEqual(active(edit.before), active(edit.after)) ? "appearance" : "",
      !themeValuesEqual(libraryMetadata(edit.before), libraryMetadata(edit.after)) ? "theme-library" : ""].filter(Boolean);
  }
  return [STYLE_SETTINGS_KEYS.some(/** Palette, styles, Compass and lens colors form one coherent appearance owner. */ key => key === edit.key)
    || /^(appearanceThemes|colorPreferences|graphLenses).*Future$/.test(edit.key) ? "appearance" : edit.key];
}

/** Apply only declared roots; no defaults, recursive merge or unrelated current live fields enter a save. */
function applyEdits(source: SettingsSnapshot, edits: readonly RootEdit[]): SettingsSnapshot {
  const result = {...source};
  for (const edit of edits) {
    if (edit.canvas) {
      const saved = result[edit.key], map: SettingsSnapshot = record(saved) ? {...saved} : {};
      const {id, field} = edit.canvas;
      if (field) {
        const previous = map[id], namespace: SettingsSnapshot = record(previous) ? {...previous} : {version: 1};
        const values = record(namespace.values) ? {...namespace.values} : {};
        if (edit.after === undefined) delete values[field];
        else Object.defineProperty(values, field, {value: copyThemeValue(edit.after), enumerable: true, configurable: true, writable: true});
        Object.defineProperty(map, id, {value: {...namespace, values}, enumerable: true, configurable: true, writable: true});
      } else if (edit.after === undefined) delete map[id];
      else Object.defineProperty(map, id, {value: copyThemeValue(edit.after), enumerable: true, configurable: true, writable: true});
      result[edit.key] = map;
      continue;
    }
    if (edit.after === undefined) delete result[edit.key];
    else Object.defineProperty(result, edit.key, {value: copyThemeValue(edit.after), enumerable: true, configurable: true, writable: true});
  }
  return result;
}

/** One plugin lifetime; the host serializes prepare/commit/adoption on its existing queue. */
export class SettingsReconciliation {
  private accepted: SettingsSnapshot;
  private expectedDisk: unknown;
  private cursor: SettingsSnapshot;
  private readonly versions = new Map<string, number>();
  private readonly pendingIntents = new Set<SettingsWriteIntent>();
  private generation = 0;
  private attemptedGeneration = 0;
  private reading: Promise<void> | null = null;
  private candidate: Candidate | null = null;
  private writing = false;
  private writeRevision = 0;
  private closed = false;
  private failedRead = false;

  /** Seed raw disk identity separately from its migrated, serializer-compatible effective baseline. */
  constructor(raw: unknown, snapshot: SettingsSnapshot, private readonly ports: ReconciliationPorts) {
    this.expectedDisk = copyThemeValue(raw);
    this.accepted = copyThemeValue(snapshot);
    this.cursor = copyThemeValue(snapshot);
  }

  /** Freeze imperative changes at submission, so A followed by undo-A remains two distinct intents. */
  capture(live: SettingsSnapshot): SettingsWriteIntent {
    const intent = {edits: editsBetween(this.cursor, live), versions: new Map(this.versions)};
    this.cursor = copyThemeValue(live); this.pendingIntents.add(intent); return intent;
  }

  /** Capture an editor's remote owner without treating its unsubmitted draft as an imperative live edit. */
  owner(key: string): () => boolean {
    const captured = this.versions.get(key) ?? 0;
    return /** Same-owner A→B→A cannot validate an old editor. */ () => !this.closed && captured === (this.versions.get(key) ?? 0);
  }

  /** Native declarative controls encode this remote epoch in their transient handler key, never in saved data. */
  revision(key: string): number {return this.versions.get(key) ?? 0;}

  /** Retain incoming evidence immediately, including during an accepted save's awaited disk operation. */
  notice(): void {
    if (this.closed) return;
    this.generation++;
    if (this.reading) return;
    this.reading = this.readNotices().finally(/** A later valid event can recover without a timer/watcher service. */ () => {
      this.reading = null;
      if (!this.closed) {
        this.ports.schedule();
        if (this.attemptedGeneration !== this.generation) this.notice();
      }
    });
    void this.reading.catch(/** Callback entry points never expose rejected asynchronous work to Obsidian. */ () => {if (!this.closed) this.ports.failed();});
  }

  /** Coalesce a bounded notification burst; re-read the newest generation rather than adopting an old await. */
  private async readNotices(): Promise<void> {
    for (let attempt = 0; attempt < 3 && !this.closed; attempt++) {
      const generation = this.generation, writeRevision = this.writeRevision, writing = this.writing, base = this.accepted;
      this.attemptedGeneration = generation;
      try {
        const raw = await this.ports.read();
        if (this.closed) return;
        if (generation !== this.generation) continue;
        const snapshot = this.ports.normalize(raw);
        this.candidate = {raw: copyThemeValue(raw), snapshot, base, overwritten: writing || this.writing || writeRevision !== this.writeRevision}; this.failedRead = false; return;
      } catch {
        if (this.closed) return;
        this.failedRead = true;
        if (attempt < 2) await this.ports.wait(50 * (attempt + 1));
      }
    }
    if (!this.closed) this.ports.failed();
  }

  /** Reject only roots whose remote owner changed; local field-level queue merging remains available. */
  assertCurrent(intent: SettingsWriteIntent, edits: readonly RootEdit[] = intent.edits): void {
    if (this.closed || edits.some(/** A→B→A changes the owner epoch even when values match again. */ edit => domains(edit).flatMap(viewConfigurationOwnerDomains).some(domain =>
      (intent.versions.get(domain) ?? 0) !== (this.versions.get(domain) ?? 0)))) throw this.ports.conflict();
  }

  /** Install the newest valid receipt; adoption never writes and preserves only still-valid queued local intent. */
  private adopt(candidate: Candidate): void {
    if (this.closed) return;
    if (candidate.overwritten) {
      const received = new Set(editsBetween(candidate.base, candidate.snapshot).flatMap(domains));
      candidate.snapshot = applyEdits(candidate.snapshot, editsBetween(candidate.base, this.accepted).filter(
        /** An accepted in-flight edit survives unrelated incoming owners; a received schema/map replacement also retires its fields. */ edit => domains(edit).flatMap(viewConfigurationOwnerDomains).every(domain => !received.has(domain))));
    }
    const changes = editsBetween(this.accepted, candidate.snapshot);
    if (!candidate.overwritten) this.expectedDisk = copyThemeValue(candidate.raw);
    if (!changes.length) return;
    for (const domain of new Set(changes.flatMap(domains))) this.versions.set(domain, (this.versions.get(domain) ?? 0) + 1);
    this.accepted = copyThemeValue(candidate.snapshot);
    let visible = this.accepted;
    for (const intent of this.pendingIntents) {
      const allowed = intent.edits.filter(/** Remote same-owner changes retire queued controls instead of restoring old dictionaries. */ edit =>
        domains(edit).flatMap(viewConfigurationOwnerDomains).every(domain => (intent.versions.get(domain) ?? 0) === (this.versions.get(domain) ?? 0)));
      visible = applyEdits(visible, allowed);
    }
    this.cursor = copyThemeValue(visible); this.ports.install(copyThemeValue(visible));
  }

  /** Drain captured incoming evidence before a fresh disk check at every unstarted write boundary. */
  async prepare(fresh = true): Promise<void> {
    if (this.reading) await this.reading;
    if (this.closed) throw this.ports.conflict();
    if (this.candidate) {const candidate = this.candidate; this.candidate = null; this.adopt(candidate);}
    if (!fresh) return;
    const generation = this.generation, raw = await this.ports.read();
    if (this.closed) throw this.ports.conflict();
    if (generation !== this.generation) {await this.prepare(false); if (this.failedRead) throw this.ports.conflict(); return;}
    if (!themeValuesEqual(raw, this.expectedDisk)) {
      const snapshot = this.ports.normalize(raw); this.adopt({raw, snapshot, base: this.accepted, overwritten: false}); this.failedRead = false;
    }
    if (this.failedRead) throw this.ports.conflict();
  }

  /** Prepare a detached operation view without borrowing later, unstarted controls' live mutations. */
  view(intent: SettingsWriteIntent): SettingsSnapshot {this.assertCurrent(intent); return applyEdits(this.accepted, intent.edits);}

  /** Rebase explicit operation roots on the accepted snapshot and retain post-write incoming candidates. */
  async commit(intent: SettingsWriteIntent, before: SettingsSnapshot, after: SettingsSnapshot, write: (snapshot: SettingsSnapshot) => Promise<void>, force = false): Promise<void> {
    const implicit = editsBetween(before, after), edits = [...intent.edits.filter(
      /** A prepared coherent root or explicit view field supersedes only the same submitted owner. */ edit => !implicit.some(next => next.key === edit.key
        && next.canvas?.id === edit.canvas?.id && next.canvas?.field === edit.canvas?.field)), ...implicit];
    this.assertCurrent(intent, edits);
    const next = applyEdits(this.accepted, edits);
    if (!edits.length && !force) return;
    this.writing = true; this.writeRevision++;
    try {
      await write(copyThemeValue(next));
      if (this.closed) return;
      this.acceptWrite(next);
    } catch (error) {
      // Storage may have committed before rejecting. Read back without blindly replaying the write.
      try {
        const generation = this.generation;
        const raw = await this.ports.read();
        if (!this.closed && themeValuesEqual(raw, next)) {this.acceptWrite(next); return;}
        if (!this.closed && generation === this.generation) {
          // An unchanged predecessor is already validated. Normalizing it again could sort a
          // deliberately saved list and manufacture a remote conflict after a failed local save.
          // Keep any actual incoming candidate captured during the awaited write intact.
          if (!themeValuesEqual(raw, this.expectedDisk)) {
            const snapshot = this.ports.normalize(raw);
            this.expectedDisk = copyThemeValue(raw); this.candidate = {raw, snapshot, base: this.accepted, overwritten: false};
          }
          this.failedRead = false;
        }
      } catch {this.failedRead = true;}
      throw error instanceof Error ? error : new Error(String(error));
    } finally {this.writing = false;}
  }

  /** Only successful storage or exact payload read-back can confirm this operation's durable baseline. */
  private acceptWrite(snapshot: SettingsSnapshot): void {
    this.accepted = copyThemeValue(snapshot); this.expectedDisk = copyThemeValue(snapshot);
    if (this.candidate && !themeValuesEqual(this.candidate.raw, snapshot)) this.candidate.overwritten = true;
  }

  /** Accepted saves can finish after their UI retires; no older intent may reappear on a later receipt. */
  finish(intent: SettingsWriteIntent): void {
    this.pendingIntents.delete(intent);
    let cursor = this.accepted;
    for (const pending of this.pendingIntents) cursor = applyEdits(cursor, pending.edits.filter(
      /** Conflicted queued intent must not become the next control's implicit baseline. */ edit => domains(edit).flatMap(viewConfigurationOwnerDomains).every(domain =>
        (pending.versions.get(domain) ?? 0) === (this.versions.get(domain) ?? 0))));
    this.cursor = copyThemeValue(cursor);
  }

  /** Stop late reads/adoption after unload; no listeners, persistent versions or autonomous writes remain. */
  dispose(): void {this.closed = true; this.generation++; this.candidate = null; this.pendingIntents.clear();}
}
