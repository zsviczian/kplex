/** Per-native-surface selection and bounded restoration. Native document/editor/Sidecar lifetimes remain separate. */
import type {PlexViewDefinition} from "../core/plex/views/contracts";
import type {PlexViewRegistry} from "../core/plex/views/registry";
import {nodeId, type NodeId} from "../core/graph/model";
import {PlexEditorBindings, type SavedPlexEditorIntent} from "./PlexEditorBindings";
import {boundedViewState as savedState} from "../core/plex/views/state";

export type PlexViewTransient = Readonly<{attention: NodeId; scope?: NodeId; camera: Readonly<{x: number; y: number; scale: number}>;
  selected: string | null; unfolded: readonly string[];
  sections?: Readonly<{expanded: boolean; unfolded: readonly string[]}>}>;

export class PlexViewSession {
  /** Document/editor lifetime does not follow attention or definition-owned transient resources. */
  readonly editors = new PlexEditorBindings(() => {
    if (this.closed) return;
    if (this.editors.bindings.length) this.restoredEditors = undefined;
    this.notify(); this.persist();
  });
  private requestedId: string;
  private readonly states = new Map<string, unknown>();
  private readonly listeners = new Set<() => void>();
  private readonly owned = new Set<() => void>();
  private readonly transient = new Map<string, PlexViewTransient>();
  private readonly areaHeights = new Map<string, Readonly<Record<string, number>>>();
  private readonly areaWidths = new Map<string, Readonly<Record<string, number>>>();
  private readonly roots = new Map<string, NodeId>();
  private stateGuard: ((state: unknown) => boolean) | null = null;
  private selectionGuard: (() => Promise<boolean>) | null = null;
  private selectionRequest = 0;
  private restoredEditors: unknown;
  private editorUsers = 0;
  private generation = 0;
  private epoch = 0;
  private closed = false;
  private restored = false;
  /** Selection persists through the existing native workspace writer, not plugin settings. */
  constructor(readonly registry: PlexViewRegistry, private readonly persist: () => void,
    private readonly readAttention: () => NodeId | null = () => null) { this.requestedId = registry.fallbackId; }
  /** Resolve only static policy; unavailable saved IDs retain the fallback without discarding their payload. */
  get definition(): PlexViewDefinition { return this.registry.resolve(this.requestedId); }
  /** Decode this definition's finite preference payload without sharing runtime/native objects. */
  get state(): unknown {
    return this.stateFor(this.definition.id);
  }
  /** Read a registered view's retained/default state without selecting it or acquiring its resources. */
  stateFor(id: string): unknown {
    if (!this.registry.has(id)) return null;
    const definition = this.registry.resolve(id);
    try { return definition.restoreState(this.states.get(id) ?? definition.defaultState); }
    catch { return null; }
  }
  /** Stable scalar snapshot supports React without retaining graph/native objects. */
  getSnapshot = (): number => this.generation;
  subscribe = (listener: () => void): (() => void) => { this.listeners.add(listener); return () => this.listeners.delete(listener); };
  /** Register one view-instance lifetime; dispose synchronously before selecting its replacement. */
  own(dispose: () => void): () => void { if (this.closed) { dispose(); return () => {}; } this.owned.add(dispose); return () => {if (this.owned.delete(dispose)) dispose();}; }
  /** Late work must match both the exact selection generation and native session lifetime. */
  getLifetime(): number { return this.epoch; }
  /** Capture the selection lifetime independently of ordinary preference/paint publications. */
  capture(): () => boolean { const epoch = this.epoch; return () => !this.closed && epoch === this.epoch; }
  /** Opt-in view entry uses this canvas's current attention as its root. Other definitions, workspace restoration and same-definition selection retain existing intent. */
  select(id: string): void {
    if (this.closed || id === this.requestedId || !this.canSelect(id) || !/^[a-z][a-z0-9.-]{0,79}$/.test(id)) return;
    const attention = this.readAttention();
    this.retire(); this.requestedId = id;
    if (this.definition.navigationEntry === "attention" && typeof attention === "string" && attention && attention.length <= 4096
      && this.roots.get(this.definition.id) !== attention) {
      this.storeRoot(attention); this.restoredEditors = undefined;
    }
    this.notify(); this.persist();
  }
  /** The captured canvas host saves/closes native content before changing hosting policy. Direct
   * synchronous selection retains its existing guard and cannot bypass native persistence. */
  async requestSelection(id: string): Promise<boolean> {
    if (this.closed || !this.registry.has(id)) return false;
    if (id === this.requestedId) return true;
    const request = ++this.selectionRequest, current = this.capture();
    try {if (this.selectionGuard && !await this.selectionGuard()) return false;}
    catch {return false;}
    if (!current() || request !== this.selectionRequest || !this.canSelect(id)) return false;
    this.select(id);return this.definition.id === id;
  }
  /** Lease one native preflight to this exact canvas; no native object or buffer enters state. */
  guardSelection(prepare: () => Promise<boolean>): () => void {
    if (this.closed) return () => {};
    this.selectionGuard = prepare;
    return () => {if (this.selectionGuard === prepare) this.selectionGuard = null;};
  }
  /** An incompatible definition/hosting mode cannot silently destroy a live native editor. Compatible legacy attention hosts retain their exact instance. */
  canSelect(id: string): boolean { return !this.closed && (!this.editors.bindings.length || this.registry.resolve(id).id === this.definition.id)
    && (!this.editorUsers || this.registry.resolve(id).id === this.definition.id || this.definition.editorHosting === undefined
      && this.registry.resolve(id).capabilities.editor === true && this.registry.resolve(id).editorHosting === undefined); }
  /** Lease only actual editor hosting; a compatible geometry change keeps the same native instance. */
  retainEditor(): () => void { this.editorUsers++; let alive = true; return () => {if (alive) {alive = false; this.editorUsers--;}}; }
  /** A rooted definition retains one explicit root while ordinary attention changes independently. */
  layoutRoot(attention: NodeId): NodeId { return this.definition.navigation === "rooted" ? this.roots.get(this.definition.id) ?? attention : attention; }
  /** Capture initial root once, outside render; this does not acquire sources or open a document. */
  ensureRoot(attention: NodeId): void { if (!this.roots.has(this.definition.id)) this.setRoot(attention); }
  /** Explicit reroot cannot remove a live editor implicitly. Collapse/save must complete first. */
  setRoot(root: NodeId): boolean {
    if (this.closed || this.definition.navigation !== "rooted" || typeof root !== "string" || !root || root.length > 4096) return false;
    if (this.roots.get(this.definition.id) === root) return true;
    if (this.editors.bindings.length) return false;
    if (this.readEditorIntent()) this.restoredEditors = undefined;
    this.storeRoot(root); this.notify(); this.persist(); return true;
  }
  /** Keep root storage bounded without publishing a partially completed selection transition. */
  private storeRoot(root: NodeId): void {
    if (this.roots.size >= 16 && !this.roots.has(this.definition.id)) {
      const oldest: unknown = this.roots.keys().next().value;
      if (typeof oldest === "string") this.roots.delete(oldest);
    }
    this.roots.set(this.definition.id, root);
  }
  /** The mounted host preflights branch-state changes against exact current editor admission. */
  guardState(check: (state: unknown) => boolean): () => void {
    if (this.closed) return () => {};
    this.stateGuard = check;
    return () => {if (this.stateGuard === check) this.stateGuard = null;};
  }
  /** Restored intent grants no native authority. Admit this exact occurrence/file before opening it. */
  readEditorIntent(): SavedPlexEditorIntent | null {
    const raw = this.restoredEditors;
    if (this.closed || this.editors.bindings.length || this.definition.editorHosting === undefined || !raw || typeof raw !== "object"
      || Reflect.get(raw, "version") !== 1) return null;
    const bindings: unknown = Reflect.get(raw, "bindings");
    if (!Array.isArray(bindings) || bindings.length !== 1) return null;
    const value: unknown = bindings[0];
    if (!value || typeof value !== "object") return null;
    const viewId: unknown = Reflect.get(value, "viewId"), occurrenceId: unknown = Reflect.get(value, "occurrenceId"), mode: unknown = Reflect.get(value, "mode");
    const target: unknown = Reflect.get(value, "target"), dimensions: unknown = Reflect.get(value, "dimensions");
    if (viewId !== this.definition.id || typeof occurrenceId !== "string" || !occurrenceId || occurrenceId.length > 4096
      || mode !== "source" && mode !== "preview" || !target || typeof target !== "object" || !dimensions || typeof dimensions !== "object") return null;
    const identity: unknown = Reflect.get(target, "nodeId"), path: unknown = Reflect.get(target, "path");
    const width: unknown = Reflect.get(dimensions, "width"), height: unknown = Reflect.get(dimensions, "height");
    if (typeof identity !== "string" || !identity || identity.length > 4096 || typeof path !== "string" || !path || path.length > 4096
      || typeof width !== "number" || !Number.isFinite(width) || width <= 0 || width > 100_000
      || typeof height !== "number" || !Number.isFinite(height) || height <= 0 || height > 100_000) return null;
    return {viewId: this.definition.id, occurrenceId, mode, target: {nodeId: nodeId(identity), path}, dimensions: {width, height}};
  }
  /** Retain recent scopes in memory only: at most 64 entries and 64 Ki UTF-16 units, never note bodies or file objects. */
  retainTransient(id: string, value: PlexViewTransient): void {
    if (this.closed || !this.registry.has(id) || !Object.values(value.camera).every(Number.isFinite) || value.camera.scale <= 0
      || value.camera.scale > 16 || Math.abs(value.camera.x) > 1e9 || Math.abs(value.camera.y) > 1e9
      || value.attention.length > 4096 || (value.scope?.length ?? 0) > 4096) return;
    const entry = {attention: value.attention, ...(value.scope ? {scope: value.scope} : {}), camera: {...value.camera},
      selected: value.selected?.slice(0, 4096) ?? null, unfolded: [] as string[],
      ...(value.sections ? {sections: {expanded: value.sections.expanded, unfolded: [] as string[]}} : {})};
    let remaining = 8192 - JSON.stringify(entry).length;
    if (remaining < 0) return;
    /** Bound encoded key bytes in one pass, without repeatedly serializing oversized fold lists. */
    const boundedKeys = (keys: readonly string[]): string[] => {
      const retained: string[] = [];
      for (const key of keys.slice(0, 256)) {
        if (typeof key !== "string" || key.length > 4096) continue;
        const cost = JSON.stringify(key).length + 1;
        if (cost > remaining) continue;
        remaining -= cost; retained.push(key);
      }
      return retained;
    };
    entry.unfolded = boundedKeys(value.unfolded);
    if (entry.sections && value.sections) entry.sections.unfolded = boundedKeys(value.sections.unfolded);
    const key = JSON.stringify([id, value.scope ?? value.attention]);
    this.transient.delete(key); this.transient.set(key, entry);
    let size = 0;
    for (const [scope, state] of this.transient) size += scope.length + JSON.stringify(state).length;
    while (this.transient.size > 64 || size > 65536) {
      const oldest = this.transient.entries().next();
      if (oldest.done) break;
      const [scope, state] = oldest.value;
      size -= scope.length + JSON.stringify(state).length; this.transient.delete(scope);
    }
  }
  /** Revisit the current layout scope without reviving another view/root or serializing presentation history. */
  readTransient(id: string, attention: NodeId): PlexViewTransient | undefined {
    const expected = this.registry.resolve(id).navigation === "rooted" ? this.roots.get(id) ?? attention : attention;
    const key = JSON.stringify([id, expected]), value = this.transient.get(key);
    if (value) {this.transient.delete(key); this.transient.set(key, value);}
    return value;
  }
  /** New views keep small area preferences in their own native-session namespace; Classic never writes here. */
  getAreaHeights(): Readonly<Record<string, number>> { return this.areaHeights.get(this.definition.id) ?? {}; }
  /** Stage a finite presentation preference through the native workspace writer, never global settings or semantic invalidation. */
  setAreaHeight(key: string, height: number): boolean {
    return this.setAreaDimension(this.areaHeights, key, height);
  }
  /** Optional horizontal area sizes belong to this same canvas/view workspace owner. */
  getAreaWidths(): Readonly<Record<string, number>> {return this.areaWidths.get(this.definition.id) ?? {};}
  /** Width changes share height's finite admission, notification and native persistence path. */
  setAreaWidth(key: string, width: number): boolean {return this.setAreaDimension(this.areaWidths, key, width);}
  /** Keep dimensions separate from global type configuration and from one another. */
  private setAreaDimension(areas: Map<string, Readonly<Record<string, number>>>, key: string, value: number): boolean {
    if (this.closed || !key || ["__proto__", "constructor", "prototype"].includes(key) || key.length > 128 || !Number.isFinite(value) || value <= 0 || value > 100_000) return false;
    const previous = areas.get(this.definition.id) ?? {};
    if (previous[key] === value || Object.keys(previous).length >= (this.definition.areaPreferenceBudget ?? 64) && !(key in previous)) return false;
    areas.set(this.definition.id, {...previous, [key]: value});this.notify();this.persist();return true;
  }
  /** Persist one bounded view-local payload without sharing another view's transient state. */
  updateState(value: unknown): boolean {
    if (this.closed) return false;
    let next: unknown;
    try { next = this.definition.restoreState(value); } catch { next = null; }
    next = savedState(next);
    if (this.editors.bindings.length) {
      try { if (!this.stateGuard || !this.stateGuard(next)) return false; } catch { return false; }
    }
    this.states.set(this.definition.id, next); this.notify(); this.persist(); return true;
  }
  /** Native workspace allowlist excludes runtime instances, acquired scope and graph payloads. */
  getState(): unknown { return {version: 1, id: this.requestedId, states: Object.fromEntries(this.states), areaHeights: Object.fromEntries(this.areaHeights),
    ...(this.areaWidths.size ? {areaWidths: Object.fromEntries(this.areaWidths)} : {}), roots: Object.fromEntries(this.roots),
    editors: this.editors.bindings.length ? {version: 1, bindings: this.editors.bindings.map(binding => ({viewId: binding.viewId,
      occurrenceId: binding.occurrenceId, target: {nodeId: binding.target.nodeId, path: binding.target.path}, dimensions: binding.dimensions, mode: binding.mode}))} : this.restoredEditors}; }
  /** Restore once; malformed and unavailable IDs safely retain the built-in experience. */
  restore(value: unknown): void {
    if (this.closed || this.restored) return;
    this.restored = true;
    if (!value || typeof value !== "object" || Reflect.get(value, "version") !== 1) return;
    const id: unknown = Reflect.get(value, "id"), states: unknown = Reflect.get(value, "states");
    this.restoredEditors = savedState(Reflect.get(value, "editors"));
    const roots: unknown = Reflect.get(value, "roots");
    if (roots && typeof roots === "object") for (const [view, root] of Object.entries(roots).slice(0, 16)) {
      if (/^[a-z][a-z0-9.-]{0,79}$/.test(view) && typeof root === "string" && root && root.length <= 4096) this.roots.set(view, nodeId(root));
    }
    if (states && typeof states === "object") for (const [key, state] of Object.entries(states).slice(0, 16)) {
      if (/^[a-z][a-z0-9.-]{0,79}$/.test(key)) this.states.set(key, savedState(state));
    }
    this.restoreAreaDimensions(Reflect.get(value, "areaHeights"), this.areaHeights);
    this.restoreAreaDimensions(Reflect.get(value, "areaWidths"), this.areaWidths);
    if (typeof id === "string" && /^[a-z][a-z0-9.-]{0,79}$/.test(id)) {
      if (id !== this.requestedId) {this.retire(); this.requestedId = id;}
      this.notify();
    }
  }
  /** Restore only the existing finite dimension vocabulary; malformed/future view IDs stay inert. */
  private restoreAreaDimensions(areas: unknown, target: Map<string, Readonly<Record<string, number>>>): void {
    if (areas && typeof areas === "object") for (const [view, rawHeights] of Object.entries(areas).slice(0, 16)) {
      const heights: unknown = rawHeights;
      if (!/^[a-z][a-z0-9.-]{0,79}$/.test(view) || !heights || typeof heights !== "object") continue;
      const admitted: Record<string, number> = {};
      const maximum = this.registry.has(view) ? this.registry.resolve(view).areaPreferenceBudget ?? 64 : 64;
      for (const [key, height] of Object.entries(heights).slice(0, maximum)) if (key && !["__proto__", "constructor", "prototype"].includes(key) && key.length <= 128 && typeof height === "number" && Number.isFinite(height) && height > 0 && height <= 100_000) admitted[key] = height;
      target.set(view, admitted);
    }
  }
  /** Isolate a failed definition without mutating its saved preferences or native document owner. */
  recover(): void { if (this.requestedId === this.registry.fallbackId) {this.retire();this.notify();} else this.select(this.registry.fallbackId); }
  /** Permanent native close, unlike a compatible view change or React remount. */
  dispose(): void { if (this.closed) return; this.closed = true; this.editors.dispose(); this.retire(); this.listeners.clear(); this.states.clear(); this.transient.clear(); this.areaHeights.clear(); this.areaWidths.clear(); this.roots.clear(); this.stateGuard = null; this.selectionGuard = null; this.restoredEditors = undefined; }
  /** Every disposer runs even if another outgoing view resource fails to close. */
  private retire(): void { this.epoch++; this.generation++; this.stateGuard = null; for (const dispose of [...this.owned]) {this.owned.delete(dispose);try {dispose();} catch { /* resource failure cannot retain another owner's lifetime */ }} }
  /** Re-render session selection/state without semantic publication or a fake navigation visit. */
  private notify(): void { this.generation++; for (const listener of this.listeners) listener(); }
}
