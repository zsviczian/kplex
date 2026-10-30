/**
 * Trusted automation over the existing portable-package owner. This application wrapper grants
 * no note, graph, canvas-selection or lens-activation capability. Canonical package admission,
 * exact target expectations and the host's queued writer remain authoritative. Reviewed plans
 * have a finite API-session lifetime; disposal releases both plans and all host closures.
 */
import {PublicApiError} from "./publicApiContracts";
import {validatePortablePackage} from "../core/plex/sharing/validation";
import {applyPortableImport, preparePortableImport, sharingEqual, type ImportChoices,
  type PreparedImport, type SharingState} from "../core/plex/sharing/transfer";
import type {PackageValidation, PortablePackage} from "../core/plex/sharing/contracts";
import {isFacetPreset, facetId} from "../core/plex/views/facets/validation";
import {isPaletteColorId} from "../core/contracts/colorValue";

export const PUBLIC_CONFIGURATION_LIMITS = Object.freeze({page: 200, plans: 16, previewMilliseconds: 300_000,
  fallbackCharacters: 1_048_576, fallbackEntries: 8192});
export type ConfigurationExportRequest = Readonly<{kind: "facets" | "lens"; id: string;
  lensIds?: readonly string[]; allowPrivate?: boolean}>;
export type ConfigurationListOptions = Readonly<{offset?: number; limit?: number}>;
export type ConfigurationList = Readonly<{
  presets: readonly Readonly<{id: string; name: string; available: boolean}>[];
  lenses: readonly Readonly<{id: string; name: string; scope: string; mode: string; enabled: boolean}>[];
  palette: readonly Readonly<{id: string; name: string}>[];
  totals: Readonly<{presets: number; lenses: number; palette: number}>;
  offset: number; limit: number; truncated: boolean;
}>;
export type ConfigurationPreview = Readonly<{previewId: string; expiresAt: number; configurationRevision: number;
  package: PortablePackage; choices: ImportChoices; privacy: readonly string[]}>;
export type ConfigurationApplyRequest = Readonly<{previewId: string; confirm: boolean}>;
export type ConfigurationApplyReceipt = Readonly<{state: "saved"; refreshPending: boolean; verified: boolean;
  configurationRevision: number | null; targetId: string; readback: unknown}>;
export type ConfigurationApiPort = Readonly<{
  read: () => SharingState;
  preview: (plan: PreparedImport) => void;
  save: (plan: PreparedImport, current: () => boolean) => Promise<Readonly<{refreshPending: boolean}>>;
  export: (request: ConfigurationExportRequest) => PortablePackage;
  /** Capture existing incoming-settings/appearance ownership at preview, including A→B→A. */
  capture?: (plan: PreparedImport) => (() => boolean);
  current: () => boolean;
  now: () => number;
  /** Production supplies an opaque random API-lifetime nonce so tokens cannot collide on reload. */
  sessionId?: string;
  /** Production injects its O(1) committed settings-owner revision; tests can inject a counter. */
  revision?: () => number;
}>;
type Review = Readonly<{plan: PreparedImport; expiresAt: number; current: () => boolean}>;
let configurationInstances = 0;

/** Copy already validated, data-only results; callers cannot mutate a retained plan or live settings. */
function detached<T>(value: T): T {return JSON.parse(JSON.stringify(value)) as T;}

/** Bound a selected identity list before copying it; canonical owners validate each grammar. */
function identities(value: unknown, maximum: number, valid: (entry: unknown) => boolean): value is readonly string[] {
  return Array.isArray(value) && value.length <= maximum
    && value.every(/** A machine request cannot smuggle a non-string through a grammar predicate. */ (entry: unknown) => typeof entry === "string" && valid(entry));
}

/** Only finite request values cross to canonical import/export code; no replacement is implicit. */
function choices(value: ImportChoices): ImportChoices {
  if (!value || typeof value !== "object" || !facetId(value.targetId) || typeof value.replace !== "boolean"
    || !identities(value.lensIds, 16, facetId) || !identities(value.replacePalette, 32, isPaletteColorId)
    || new Set(value.lensIds).size !== value.lensIds.length || new Set(value.replacePalette).size !== value.replacePalette.length
    || Object.keys(value).some(/** Import consent has exactly these four fields. */ key => !["targetId", "replace", "lensIds", "replacePalette"].includes(key))) {
    throw new PublicApiError("INVALID_ARGUMENT", "Invalid portable import choices");
  }
  return {targetId: value.targetId, replace: value.replace, lensIds: [...value.lensIds], replacePalette: [...value.replacePalette]};
}

/** Developer diagnostics retain a useful Error message, never an arbitrary thrown host object. */
function diagnostic(error: unknown, fallback: string): string {return error instanceof Error ? error.message : fallback;}

/** Independent small compositions can rely on exact canonical target expectations alone. */
function currentWithoutHostEpoch(): boolean {return true;}

export class PublicApiConfiguration {
  private port: ConfigurationApiPort | null;
  private readonly plans = new Map<string, Review>();
  private sequence = 0;
  private readonly sessionId: string;
  private observed: SharingState | null = null;
  private observedRevision = 0;

  /** Capture narrow existing services; the API lifecycle must call dispose before plugin teardown. */
  constructor(port: ConfigurationApiPort) {
    this.port = port;
    this.sessionId = port.sessionId ?? `local-${++configurationInstances}-${port.now()}`;
    if (!/^[A-Za-z0-9._-]{1,64}$/.test(this.sessionId)) throw new PublicApiError("INVALID_ARGUMENT", "Invalid configuration API session identity");
  }

  /** A retained old API handle becomes inert and releases every closure into the retired plugin. */
  dispose(): void {this.port = null;this.plans.clear();this.observed = null;}

  /** Fail before dereferencing a host port after API retirement or while its owner is unavailable. */
  private active(): ConfigurationApiPort {
    const port = this.port;
    if (!port || !port.current()) throw new PublicApiError("API_UNAVAILABLE", "Configuration API is unavailable");
    return port;
  }

  /** Expire review capabilities opportunistically; no timer, subscription or background work is owned. */
  private expire(port: ConfigurationApiPort): void {
    const now = port.now();
    for (const [id, review] of this.plans) if (review.expiresAt <= now) this.plans.delete(id);
  }

  /** Read a session-scoped configuration revision without inspecting graph/source state.
   * Production uses an injected constant-time owner revision. The bounded fallback is for small
   * independently composed callers and refuses oversized libraries before retaining a copy. */
  revision(): number {
    const port = this.active();
    if (port.revision) return port.revision();
    const state = port.read();
    if (state.lenses.length + state.palette.length + Object.keys(state.presets).length > PUBLIC_CONFIGURATION_LIMITS.fallbackEntries)
      throw new PublicApiError("LIMIT_EXCEEDED", "Supply a configuration revision for a large library");
    const encoded = JSON.stringify(state);
    if (encoded.length > PUBLIC_CONFIGURATION_LIMITS.fallbackCharacters)
      throw new PublicApiError("LIMIT_EXCEEDED", "Supply a configuration revision for a large library");
    if (!this.observed || !sharingEqual(state, this.observed)) {
      this.observed = JSON.parse(encoded) as SharingState;this.observedRevision++;
    }
    return this.observedRevision;
  }

  /** Page each installed collection independently. Large legacy lens/palette collections are never
   * copied wholesale; definitions and authored expressions travel only on an explicit export. */
  list(options: ConfigurationListOptions = {}): ConfigurationList {
    const port = this.active();
    if (!options || typeof options !== "object" || Array.isArray(options))
      throw new PublicApiError("INVALID_ARGUMENT", "Invalid configuration page");
    const offset = options.offset ?? 0, limit = options.limit ?? 100;
    if (!Number.isSafeInteger(offset) || offset < 0 || !Number.isSafeInteger(limit) || limit < 1 || limit > PUBLIC_CONFIGURATION_LIMITS.page)
      throw new PublicApiError("INVALID_ARGUMENT", "Invalid configuration page");
    const state = port.read(), entries = Object.entries(state.presets), end = offset + limit;
    const presets = entries.slice(offset, end).map(/** Unsupported saved entries remain visible without being normalized or deleted. */ ([id, preset]) =>
      ({id, name: isFacetPreset(preset) ? preset.name : id, available: isFacetPreset(preset)}));
    const lenses = state.lenses.slice(offset, end).map(/** Enabled state is informational and never becomes an import choice. */ lens =>
      ({id: lens.id, name: lens.name, scope: lens.scope, mode: lens.mode, enabled: lens.enabled}));
    const palette = state.palette.slice(offset, end).map(/** Colors remain explicit package dependencies, not an implicit full export. */ pair => ({id: pair.id, name: pair.name}));
    const result = {presets, lenses, palette, totals: {presets: entries.length, lenses: state.lenses.length, palette: state.palette.length},
      offset, limit, truncated: [entries.length, state.lenses.length, state.palette.length].some(/** Report any further page in any collection. */ total => total > end)};
    if (JSON.stringify(result).length > PUBLIC_CONFIGURATION_LIMITS.fallbackCharacters)
      throw new PublicApiError("LIMIT_EXCEEDED", "Configuration page exceeds the output limit");
    return result;
  }

  /** Delegate privacy, literal label/Help resolution and exact dependency admission to the same
   * exporter as the native UI. Export never enables lenses or writes settings. */
  export(request: ConfigurationExportRequest): PortablePackage {
    const port = this.active();
    if (!request || (request.kind !== "facets" && request.kind !== "lens") || typeof request.id !== "string"
      || !request.id || request.id.length > 4096 || request.allowPrivate !== undefined && typeof request.allowPrivate !== "boolean"
      || request.lensIds !== undefined && !identities(request.lensIds, 16, facetId))
      throw new PublicApiError("INVALID_ARGUMENT", "Invalid configuration export request");
    const state = port.read();
    if (request.kind === "facets" ? !Object.prototype.hasOwnProperty.call(state.presets, request.id) : !state.lenses.some(/** Exact installed identity only. */ lens => lens.id === request.id))
      throw new PublicApiError("NOT_FOUND", "Configuration entry was not found");
    if (request.kind === "lens" && request.lensIds?.length) throw new PublicApiError("INVALID_ARGUMENT", "A lens export has no dependency selection");
    try {
      const result = validatePortablePackage(port.export({...request, lensIds: request.lensIds ? [...request.lensIds] : undefined}));
      if (result.status !== "valid") throw new PublicApiError("INVALID_ARGUMENT", "Installed configuration cannot be exported in version one");
      return result.value;
    } catch (error) {
      if (error instanceof PublicApiError) throw error;
      throw new PublicApiError("INVALID_ARGUMENT", diagnostic(error, "Configuration export was refused"));
    }
  }

  /** Reuse canonical bounded admission. Invalid data remains a structured validation result;
   * inspection cannot create a review capability or perform any host write. */
  validate(source: unknown): PackageValidation {this.active();return validatePortablePackage(source);}

  /** Preview captures exact target owners plus explicit collision/dependency/palette choices.
   * The host repeats real installed-capacity checks. Returned values never alias the retained plan. */
  preview(source: unknown, selection: ImportChoices): ConfigurationPreview {
    const port = this.active();this.expire(port);
    const validation = validatePortablePackage(source);
    if (validation.status !== "valid") throw new PublicApiError("INVALID_ARGUMENT", "Portable package is invalid; call validate for field issues");
    let plan: PreparedImport, current: () => boolean;
    try {
      plan = preparePortableImport(validation.value, choices(selection), port.read());port.preview(plan);
      current = port.capture?.(plan) ?? currentWithoutHostEpoch;
      if (!current()) throw new PublicApiError("STALE_REVISION", "Configuration preview owner changed");
    }
    catch (error) {
      if (error instanceof PublicApiError) throw error;
      throw new PublicApiError("INVALID_ARGUMENT", diagnostic(error, "Portable preview was refused"));
    }
    while (this.plans.size >= PUBLIC_CONFIGURATION_LIMITS.plans) {
      const oldest = this.plans.keys().next();if (oldest.done) break;this.plans.delete(oldest.value);
    }
    const previewId = `configuration-${this.sessionId}-${++this.sequence}`, expiresAt = port.now() + PUBLIC_CONFIGURATION_LIMITS.previewMilliseconds;
    this.plans.set(previewId, {plan: detached(plan), expiresAt, current});
    return {previewId, expiresAt, configurationRevision: this.revision(), package: detached(plan.package),
      choices: detached(plan.choices), privacy: [...validation.privacy]};
  }

  /** Consume one confirmed review and delegate atomic persistence to the existing queued writer.
   * Rejected writes require a fresh preview. After durable acceptance, retirement/expiry cannot
   * turn the saved receipt into an unsaved error; verification reports later supersession honestly. */
  async apply(request: ConfigurationApplyRequest): Promise<ConfigurationApplyReceipt> {
    const port = this.active();this.expire(port);
    if (!request || request.confirm !== true) throw new PublicApiError("CONFIRMATION_REQUIRED", "Apply requires confirm: true for the reviewed package");
    if (typeof request.previewId !== "string" || request.previewId.length > 100)
      throw new PublicApiError("INVALID_ARGUMENT", "Invalid configuration preview identity");
    const review = this.plans.get(request.previewId);
    if (!review) throw new PublicApiError("STALE_REVISION", "Configuration preview is missing, expired or already consumed");
    this.plans.delete(request.previewId);
    if (!review.current()) throw new PublicApiError("STALE_REVISION", "Configuration preview owner changed");
    let expected: ReturnType<typeof applyPortableImport>;
    try {expected = applyPortableImport(review.plan, port.read());port.preview(review.plan);}
    catch (error) {throw new PublicApiError("STALE_REVISION", diagnostic(error, "Configuration preview is stale"));}
    let saved: Readonly<{refreshPending: boolean}>;
    try {saved = await port.save(detached(review.plan), /** The queue checks this only before durable acceptance. */ () =>
      this.port === port && port.current() && review.current() && port.now() < review.expiresAt);}
    catch (error) {throw new PublicApiError("WRITE_FAILED", diagnostic(error, "Configuration save failed; make a fresh preview"));}
    const plan = review.plan, targetId = plan.choices.targetId;
    // A disposed handle has no host capability. The accepted durable operation still gets a
    // truthful receipt, without reacquiring the unloaded plugin for readback.
    if (this.port !== port || !port.current()) return {state: "saved", refreshPending: saved.refreshPending,
      verified: false, configurationRevision: null, targetId, readback: null};
    try {
      const state = port.read(), target = plan.package.kind === "facets" ? state.presets[targetId]
        : state.lenses.find(/** One exact installed target is the readback; unrelated entries are not exposed. */ lens => lens.id === targetId);
      const expectedTarget = plan.package.kind === "facets" ? expected.preset : expected.lenses.find(/** The canonical planner owns the disabled imported value. */ lens => lens.id === targetId);
      const lensIds = plan.package.kind === "lens" ? [targetId] : plan.choices.lensIds;
      const paletteIds = (plan.package.palette ?? []).map(/** Supplied references were explicitly part of the reviewed plan. */ pair => pair.id);
      const verified = sharingEqual(target, expectedTarget)
        && lensIds.every(/** Check selected imports; concurrent unrelated lens changes remain mergeable. */ id => sharingEqual(
          state.lenses.find(/** Read the actual selected installed dependency. */ lens => lens.id === id),
          expected.lenses.find(/** Compare the canonical disabled imported dependency. */ lens => lens.id === id)))
        && paletteIds.every(/** Keeping installed colors is verified just as explicitly replacing them is. */ id => sharingEqual(
          state.palette.find(/** Read the installed pair after durable acceptance. */ pair => pair.id === id),
          expected.palette.find(/** The canonical plan includes explicit keep/replace choices. */ pair => pair.id === id)));
      return {state: "saved", refreshPending: saved.refreshPending, verified, configurationRevision: this.revision(), targetId,
        readback: target === undefined ? null : detached(target)};
    } catch {
      // A post-save readback failure cannot undo the writer's durable receipt or invite replay.
      return {state: "saved", refreshPending: saved.refreshPending, verified: false, configurationRevision: null, targetId, readback: null};
    }
  }
}
