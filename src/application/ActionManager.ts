/** Portable dispatch facade; bounded snapshots resolve intent and injected implementations own effects. */
import { ACTION_BY_ID, isActionId, validActionArguments, type ActionId, type ActionMetadata, type ActionOutcome, type ActionRequest, type Availability, type FocusRegion, type NodeRef, type ResolvedTarget } from "../core/plex/actions";
export type SurfaceSnapshot = Readonly<{ mounted: boolean; visible: boolean; windowId?: string; center: NodeRef | null; selected: Readonly<{node: NodeRef; occurrenceId: string}> | null; focusRegion: FocusRegion; commandFocusRegion?: FocusRegion; interactionRevision: number; historyBack?: boolean; historyForward?: boolean; editorAvailable?: boolean }>;
export type ActionContext = Readonly<{request: ActionRequest; metadata: ActionMetadata; surfaceId?: string; generation?: number; snapshot?: SurfaceSnapshot; invocationSnapshot?: SurfaceSnapshot; target: ResolvedTarget}>;
export type ActionImplementation = Readonly<{availability: (context: ActionContext) => Availability; execute: (context: ActionContext) => ActionOutcome | Promise<ActionOutcome>}>;
export type ActionImplementations = Partial<Record<ActionId, ActionImplementation>>;
export type SurfaceRegistration = Readonly<{id: string; generation: number; readSnapshot: () => SurfaceSnapshot; implementations?: ActionImplementations}>;
export type CommandContext = Readonly<{sharedCenter: NodeRef | null; windowId?: string; preferredSurfaceId?: string; editorInvocationId?: string; focusRegion?: FocusRegion}>;
export type ActionManagerOptions = Readonly<{readCommandContext: (request: ActionRequest) => CommandContext; implementations?: ActionImplementations; validateNode?: (node: NodeRef) => boolean; onError?: (error: unknown, context: ActionContext) => void}>;
export type PreparedAction = Readonly<{state: "rejected"; reasonKey: string} | {state: "accepted"; run: () => Promise<ActionOutcome>; cancel: () => void}>;
type Registered = {registration: SurfaceRegistration; order: number; interactionOrder: number};
const ACTION_SOURCES = ["obsidian-command", "local-hotkey", "local-menu", "toolbar", "context-menu", "composer", "internal"];
type Resolved = {context: ActionContext; registration?: SurfaceRegistration; implementation: ActionImplementation; availability: Availability};
/** Validate references without interpreting opaque identities. */
function validNode(value: unknown): value is NodeRef { return !!value && typeof value === "object" && typeof Reflect.get(value, "identity") === "string" && typeof Reflect.get(value, "path") === "string" && (Reflect.get(value, "fileIdentity") === undefined || typeof Reflect.get(value, "fileIdentity") === "string") && ["file", "url", "ghost", "folder", "tag", "section"].some(/** Accept a closed reference kind. */ kind => kind === Reflect.get(value, "kind")); }
/** Capture validated finite request values while retaining the discriminant/argument relationship. */
function captureRequest<Request extends ActionRequest>(request: Request): Request {
  let target = request.target;
  if (target?.kind === "explicit") target = Object.freeze({...target, node: Object.freeze({...target.node})});
  else if (target?.kind === "edge") target = Object.freeze({...target, origin: Object.freeze({...target.origin}), target: Object.freeze({...target.target})});
  else if (target) target = Object.freeze({...target});
  const captured = Object.assign({}, request);
  Object.assign(captured, {args: request.args === undefined ? undefined : Object.freeze({...request.args}), target});
  Object.freeze(captured);
  return captured;
}
/** Own ephemeral preparation, generation fences and modal/session exclusivity. */
export class ActionManager {
  private surfaces = new Map<string, Registered>();
  private guards = new Map<string, Readonly<{surfaceId?: string; generation?: number}>>();
  private sessions = new Map<string, string>();
  private order = 0;
  private interactionOrder = 0;
  private disposed = false;
  /** Supply narrow host capabilities; construction performs no I/O. */
  constructor(private readonly options: ActionManagerOptions) {}
  /** Register a generation; stale cleanup cannot deregister a migrated successor. */
  registerSurface(registration: SurfaceRegistration): () => void {
    if (this.disposed) throw new Error("Action manager disposed");
    const previous = this.surfaces.get(registration.id);
    if (previous && previous.registration !== registration) this.releaseSurfaceGuards(previous.registration);
    this.surfaces.set(registration.id, {registration, order: previous?.order ?? ++this.order, interactionOrder: previous?.interactionOrder ?? 0});
    return () => {
      if (this.surfaces.get(registration.id)?.registration !== registration) return;
      this.surfaces.delete(registration.id);
      this.releaseSurfaceGuards(registration);
    };
  }
  /** Record deliberate interaction in one shared ledger; per-surface revision counters are incomparable. */
  recordInteraction(surfaceId: string): void { const surface = this.surfaces.get(surfaceId); if (surface) surface.interactionOrder = ++this.interactionOrder; }
  /** Read current bounded presentation facts. */
  readSnapshot(surfaceId: string): SurfaceSnapshot | null { return this.surfaces.get(surfaceId)?.registration.readSnapshot() ?? null; }
  /** Check eligibility synchronously without opening, focusing, saving or scanning. */
  check(request: ActionRequest): Availability {
    try {
      const result = this.resolve(request);
      if (typeof result === "string") return {state: "disabled", reasonKey: result};
      if (result.availability.state === "disabled") return result.availability;
      const guard = this.guardKey(result.context);
      return guard && this.guards.has(guard) ? {state: "disabled", reasonKey: "actions.busy"} : result.availability;
    }
    catch { return {state: "disabled", reasonKey: "actions.failed"}; }
  }
  /** Capture target intent and take the short single-flight guard before event consumption. */
  prepare(request: ActionRequest): PreparedAction {
    let resolved: Resolved | string;
    try { resolved = this.resolve(request); } catch { return {state: "rejected", reasonKey: "actions.failed"}; }
    if (typeof resolved === "string") return {state: "rejected", reasonKey: resolved};
    if (resolved.availability.state === "disabled") return {state: "rejected", reasonKey: resolved.availability.reasonKey};
    const {context, registration, implementation} = resolved, guard = this.guardKey(context);
    if (guard && this.guards.has(guard)) return {state: "rejected", reasonKey: "actions.busy"};
    const guardToken = {surfaceId: context.surfaceId, generation: context.generation};
    if (guard) this.guards.set(guard, guardToken);
    let promise: Promise<ActionOutcome> | null = null, cancelled = false;
    /** Release unused synchronous acceptance; running effects cannot be cancelled by this token. */
    const cancel = (): void => { if (!promise) { cancelled = true; if (guard && this.guards.get(guard) === guardToken) this.guards.delete(guard); } };
    /** Execute once; every subsequent call observes the same result and captured intent. */
    const run = (): Promise<ActionOutcome> => {
      if (promise) return promise;
      promise = (/** Catch execution failures and release or transfer the accepted guard exactly once. */ async (): Promise<ActionOutcome> => {
        try {
          if (cancelled || !this.contextLive(context, registration)) return {status: "cancelled"};
          const executionContext: ActionContext = {...context, snapshot: context.surfaceId ? this.readSnapshot(context.surfaceId) ?? undefined : context.snapshot};
          const availability = implementation.availability(executionContext);
          if (availability.state === "disabled") return {status: "unavailable", reasonKey: availability.reasonKey};
          const outcome = await implementation.execute(executionContext);
          if (outcome.status === "opened" && guard && this.contextLive(context, registration)) this.sessions.set(outcome.sessionId, guard);
          return outcome;
        } catch (error) { this.options.onError?.(error, context); return {status: "failed", reasonKey: "actions.failed"}; }
        finally { if (guard && this.guards.get(guard) === guardToken && ![...this.sessions.values()].includes(guard)) this.guards.delete(guard); }
      })();
      return promise;
    };
    return {state: "accepted", run, cancel};
  }
  /** Dispatch convenience for commands/buttons; keyboard owners call prepare synchronously. */
  dispatch(request: ActionRequest): Promise<ActionOutcome> { const prepared = this.prepare(request); return prepared.state === "accepted" ? prepared.run() : Promise.resolve({status: "unavailable", reasonKey: prepared.reasonKey}); }
  /** Release transferred composer exclusivity when its host-owned session closes. */
  closeSession(sessionId: string): void { const guard = this.sessions.get(sessionId); if (guard) this.guards.delete(guard); this.sessions.delete(sessionId); }
  /** Clear registrations and preparation; injected writers own actual write cancellation. */
  dispose(): void { this.disposed = true; this.surfaces.clear(); this.guards.clear(); this.sessions.clear(); }
  /** Retiring a concrete root releases its sessions even when a successor accidentally reuses its generation. */
  private releaseSurfaceGuards(registration: SurfaceRegistration): void {
    const retired = new Set<string>();
    for (const [key, owner] of this.guards) if (owner.surfaceId === registration.id && owner.generation === registration.generation) {
      retired.add(key); this.guards.delete(key);
    }
    for (const [session, key] of this.sessions) if (retired.has(key)) this.sessions.delete(session);
  }
  /** Resolve ownership deterministically within one window; multiple cross-window owners are unsafe. */
  private chooseSurface(command: CommandContext): Registered | null | "ambiguous" {
    const live = [...this.surfaces.values()].filter(/** Closed registrations cannot own commands. */ item => item.registration.readSnapshot().mounted);
    const preferred = live.find(/** Workspace association outranks recency. */ item => item.registration.id === command.preferredSurfaceId);
    if (preferred) return preferred;
    const local = live.filter(/** Use explicit portable window identities. */ item => command.windowId !== undefined && item.registration.readSnapshot().windowId === command.windowId);
    if (local.length) return local.sort(/** Prefer deliberate interaction, then visibility and registration order. */ (a, b) => { const as = a.registration.readSnapshot(), bs = b.registration.readSnapshot(); return b.interactionOrder - a.interactionOrder || Number(bs.visible) - Number(as.visible) || a.order - b.order; })[0];
    return live.length > 1 ? "ambiguous" : live[0] ?? null;
  }
  /** Resolve current eligibility while copying references so later centering cannot drift intent. */
  private resolve(request: ActionRequest): Resolved | string {
    if (this.disposed || !request || !isActionId(request.id) || !ACTION_SOURCES.includes(request.source) || !validActionArguments(request.id, request.args) || request.surfaceId !== undefined && typeof request.surfaceId !== "string" || request.windowId !== undefined && typeof request.windowId !== "string") return "actions.invalid-request";
    const metadata = ACTION_BY_ID.get(request.id)!;
    const command = request.source === "obsidian-command" ? this.options.readCommandContext(request) : null;
    const ownerless = metadata.id.startsWith("index.") || metadata.id.startsWith("surface.open-") || metadata.id.startsWith("ontology.assign.") || ["actions.configure", "document.sync-from-center", "center.sync-from-document", "center.focus-active-note"].includes(metadata.id);
    const chosen = request.surfaceId ? this.surfaces.get(request.surfaceId) ?? null : command && !ownerless ? this.chooseSurface(command) : null;
    if (chosen === "ambiguous") return "actions.ambiguous-surface";
    if (request.surfaceId && !chosen) return "actions.surface-unavailable";
    const registration = chosen?.registration, snapshot = registration?.readSnapshot();
    if (snapshot && !snapshot.mounted) return "actions.surface-unavailable";
    if (request.source === "local-hotkey" && (!snapshot || !metadata.localContexts.includes(snapshot.focusRegion))) return "actions.context-unavailable";
    if (metadata.id.startsWith("selection.") && command && command.focusRegion !== "graph" && snapshot?.commandFocusRegion !== "graph") return "actions.context-unavailable";
    if (request.target !== undefined && (!request.target || typeof request.target !== "object")) return "actions.invalid-request";
    const requested = request.target ?? {kind: metadata.target};
    if ("occurrenceId" in requested && requested.occurrenceId !== undefined && typeof requested.occurrenceId !== "string" || "evidenceId" in requested && requested.evidenceId !== undefined && typeof requested.evidenceId !== "string") return "actions.invalid-request";
    if (metadata.target === "none" && requested.kind !== "none") return "actions.invalid-request";
    if (metadata.target === "selected" && !["selected", "explicit"].includes(requested.kind)) return "actions.invalid-request";
    if (metadata.target === "center" && !["center", "explicit"].includes(requested.kind)) return "actions.invalid-request";
    if (metadata.target === "editor-field" && requested.kind !== "editor-field") return "actions.invalid-request";
    if (metadata.target === "selected-or-center" && !["selected-or-center", "selected", "center", "explicit", ...(metadata.id.startsWith("relationship.") ? ["edge"] : [])].includes(requested.kind)) return "actions.invalid-request";
    let target: ResolvedTarget;
    if (requested.kind === "explicit" && "node" in requested) { if (!validNode(requested.node)) return "actions.invalid-request"; target = {kind: "node", node: {...requested.node}, occurrenceId: requested.occurrenceId}; }
    else if (requested.kind === "edge" && "origin" in requested) { if (!validNode(requested.origin) || !validNode(requested.target)) return "actions.invalid-request"; target = {kind: "edge", origin: {...requested.origin}, target: {...requested.target}, evidenceId: requested.evidenceId}; }
    else if (requested.kind === "editor-field") { const token = "editorInvocationId" in requested ? requested.editorInvocationId : command?.editorInvocationId; if (!token || typeof token !== "string") return "actions.editor-unavailable"; target = {kind: "editor-field", editorInvocationId: token}; }
    else if (requested.kind === "none") target = {kind: "none"};
    else if (["center", "selected", "selected-or-center"].includes(requested.kind)) {
      const selected = snapshot?.selected, center = command ? command.sharedCenter : snapshot?.center;
      const node = requested.kind === "selected" ? selected?.node : requested.kind === "selected-or-center" ? selected?.node ?? center : center;
      if (!node || !validNode(node)) return "actions.target-unavailable";
      target = {kind: "node", node: {...node}, ...(selected?.node === node ? {occurrenceId: selected.occurrenceId} : {})};
    } else return "actions.invalid-request";
    // Validated payloads are tiny finite values. Capture them without retaining a caller's mutable
    // args/reference objects or introducing a generic object traversal into dispatch.
    const context: ActionContext = {request: captureRequest(request), metadata, surfaceId: registration?.id, generation: registration?.generation, snapshot, invocationSnapshot: snapshot, target};
    if (!this.contextLive(context)) return "actions.target-unavailable";
    const implementation = registration?.implementations?.[request.id] ?? this.options.implementations?.[request.id];
    if (!implementation) return "actions.operation-unavailable";
    return {context, registration, implementation, availability: implementation.availability(context)};
  }
  /** Fence generation and exact node identity without rereading the chosen origin. */
  private contextLive(context: ActionContext, expectedRegistration?: SurfaceRegistration): boolean {
    if (expectedRegistration && this.surfaces.get(expectedRegistration.id)?.registration !== expectedRegistration) return false;
    if (this.disposed || context.surfaceId && (this.surfaces.get(context.surfaceId)?.registration.generation !== context.generation || !this.readSnapshot(context.surfaceId)?.mounted)) return false;
    if (!this.options.validateNode) return true;
    if (context.target.kind === "node") return this.options.validateNode(context.target.node);
    if (context.target.kind === "edge") return this.options.validateNode(context.target.origin) && this.options.validateNode(context.target.target);
    return true;
  }
  /** Guard modal families together; movement remains repeatable and unqueued. */
  private guardKey(context: ActionContext): string | null {
    if (context.metadata.repeat === "allow") return null;
    const family = context.request.id.startsWith("relationship.") && context.request.id !== "relationship.details" ? "relationship-composer" : context.request.id;
    return JSON.stringify([context.surfaceId === undefined ? "host" : "surface", context.surfaceId ?? null, context.generation ?? 0, family]);
  }
}
