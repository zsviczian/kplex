/**
 * Test-only passive startup trace installed from a non-minified build footer before plugin creation.
 * Prototype wrappers retain original return/throw identity; no read, acquisition or scheduling API is
 * called. Only bounded scalar observations and opaque run-local identities leave this owner. The
 * caller owns installation/disposal; elapsed timings include instrumentation and are not paint times.
 */

/**
 * Install one self-contained observer suitable for embedding with Function.prototype.toString().
 * @param constructors Actual bundled constructors, never runtime substitutes.
 * @param ownerWindow Window receiving kplexStartupCenterObserver and supplying the monotonic clock.
 * @param fingerprintNeighborhood Optional synchronous test-owned SHA-256 capability, called only on
 * actual ordinary getNeighborhood results. Only a validated lowercase 64-hex digest is retained.
 * @returns Bounded snapshot/dispose controller. Disposal restores only wrappers still owned here.
 * @remarks Observes native promises passively without replacing them. Non-native thenables remain
 * untouched. Captures stop after three minutes; explicit disposal also releases retained paths.
 */
export function installStartupCenterObserver({ GraphIndex, GraphBuilder, HostMetadataPreview }, ownerWindow, fingerprintNeighborhood) {
  ownerWindow.kplexStartupCenterObserver?.dispose();
  const started = ownerWindow.performance.now(), startedAt = Date.now();
  const limits = { milliseconds: 180000, events: 640, bytes: 1048576, centers: 64, failureBefore: 16, failureAfter: 16 };
  const events = [], recent = [], failureSegment = [], cleanups = [], installed = [], missing = [];
  const objects = new WeakMap(), centers = new Map();
  let previewIndices = new WeakMap(), lastCenters = new WeakMap();
  let nextObject = 0, nextTask = 0, bytes = 0, omitted = 0, omittedCenters = 0, observationErrors = 0;
  let disposed = false, expired = false, firstFailure = null, failureRemaining = 0;

  /** Assign weak object identity without retaining index, builder, preview or Promise lifetimes. */
  function objectId(value) {
    if (!value || (typeof value !== "object" && typeof value !== "function")) return 0;
    let id = objects.get(value);
    if (!id) { id = ++nextObject; objects.set(value, id); }
    return id;
  }

  /** Retain at most 64 private center identities; exported traces contain only numeric aliases. */
  function centerId(path) {
    if (typeof path !== "string") return 0;
    if (centers.has(path)) return centers.get(path);
    if (centers.size === limits.centers) { omittedCenters++; return 0; }
    const id = centers.size + 1;
    centers.set(path, id);
    return id;
  }

  /** Read only fixed own scalar properties, excluding accessor execution and arbitrary strings. */
  function scalars(value, names) {
    const result = {};
    if (!value) return result;
    for (const name of names) {
      const item = Object.getOwnPropertyDescriptor(value, name)?.value;
      if (typeof item === "boolean" || (typeof item === "number" && Number.isFinite(item)) || item === null) result[name] = item;
    }
    return result;
  }

  /** Read one ordinary own data property without invoking getters or host methods. */
  function own(value, key) { return value && Object.getOwnPropertyDescriptor(value, key)?.value; }

  /** Capture canonical/preview center presence without get(), lazy presentation or neighborhood reads. */
  function centerState(state, path) {
    const pages = own(state, "pages"), page = pages instanceof Map ? pages.get(path) : undefined;
    const neighbors = own(page, "neighbours");
    return { present: !!page, neighbors: neighbors instanceof Map ? neighbors.size : null };
  }

  /** Count positive native link targets in at most 256 own-data entries; never retain target keys. */
  function hostTargetCount(metadataCache, dictionary, path) {
    const targets = own(own(metadataCache, dictionary), path);
    if (!targets || typeof targets !== "object") return null;
    let visited = 0, positiveTargets = 0;
    for (const key in targets) {
      const descriptor = Object.getOwnPropertyDescriptor(targets, key);
      if (!descriptor) continue;
      if (visited === 256) return { positiveTargets, truncated: true };
      visited++;
      if (typeof descriptor.value === "number" && descriptor.value > 0) positiveTargets++;
    }
    return { positiveTargets, truncated: false };
  }

  /** Snapshot readiness/revision/scheduler primitives directly; no authority or lazy APIs are invoked. */
  function stateOf(receiver, group, path) {
    const plugin = own(receiver, "plugin");
    const index = group === "GraphIndex" ? receiver : own(plugin, "index") ?? previewIndices.get(receiver);
    const source = own(index, "sourceAcquisition"), preview = group === "HostMetadataPreview" ? receiver : own(index, "hostPreview");
    if (index && preview) previewIndices.set(preview, index);
    if (index && typeof path === "string") lastCenters.set(index, path);
    path ??= index && lastCenters.get(index);
    const scheduler = own(index, "workScheduler"), active = own(scheduler, "active"), waiting = own(scheduler, "waiters");
    const result = {
      index: objectId(index),
      indexFlags: scalars(index, ["generation", "building", "diagnosticsClosed", "onDemandBaselineReady", "onDemandBaselineRevision",
        "onDemandPartialState", "publicationRevision", "semanticRevision", "semanticPolicyRevision", "fullSemanticPolicyRevision",
        "fullSemanticSourceRevision", "fullSemanticMaintenanceRevision", "snapshotHydrationRun", "navigableSnapshotSourceRevision"]),
      pluginFlags: scalars(plugin, ["layoutReady", "metadataStabilized", "initialIndexComplete", "initialSourceIndexIncomplete", "indexDirtyRevision", "unloading"]),
      sourceFlags: scalars(source, ["localDependenciesReady", "localDependencyAuthorityReady", "started", "enabled", "closed", "hostRevision",
        "inventoryCaptureRevision", "inventoryRevision", "maintenanceRevision", "restartInventoryChecked"]),
      previewFlags: scalars(preview, ["initialized", "disposed", "revision"]),
      scheduler: { active: Array.isArray(active) ? active.slice(0, 5) : null, waiting: waiting instanceof Set ? waiting.size : null },
    };
    if (typeof path === "string") {
      result.centerId = centerId(path);
      result.center = centerState(own(index, "state"), path);
      const metadataCache = own(own(index, "app"), "metadataCache");
      result.hostResolvedTargets = hostTargetCount(metadataCache, "resolvedLinks", path);
      result.hostUnresolvedTargets = hostTargetCount(metadataCache, "unresolvedLinks", path);
      for (const key of ["hostPreviewScopes", "onDemandHostScopes", "onDemandCachedScopes"]) {
        const scopes = own(index, key);
        result[key] = centerState(scopes instanceof Map ? scopes.get(path) : undefined, path);
      }
    }
    return result;
  }

  /** Describe only the actual returned result; ordinary getNeighborhood calls are never synthesized. */
  function resultOf(method, result) {
    let fingerprint;
    if (method === "getNeighborhood" && typeof fingerprintNeighborhood === "function") {
      try {
        const candidate = fingerprintNeighborhood(result);
        if (typeof candidate === "string" && /^[0-9a-f]{64}$/.test(candidate)) fingerprint = candidate;
        else observationErrors++;
      } catch { observationErrors++; }
    }
    if (result === null || typeof result === "boolean" || typeof result === "undefined") return { value: result ?? null, ...(fingerprint ? { fingerprint } : {}) };
    if (method === "getNeighborhood") {
      const roles = {};
      for (const key of ["parents", "children", "leftFriends", "rightFriends", "siblings"]) {
        const items = own(result, key);
        roles[key] = Array.isArray(items) ? items.length : null;
      }
      return { present: !!own(result, "center"), roles, ...(fingerprint ? { fingerprint } : {}) };
    }
    const pages = own(result, "pages");
    return { ...scalars(result, ["restored", "fresh", "partial", "incomplete"]), ...(pages instanceof Map ? { pages: pages.size } : {}) };
  }

  /** Keep an early prefix and bounded rolling tail, plus a separate first-rejection context segment. */
  function record(event) {
    if (disposed) return;
    const elapsed = ownerWindow.performance.now() - started;
    if (elapsed > limits.milliseconds) { expired = true; omitted++; return; }
    event.ms = Math.round(elapsed * 1000) / 1000;
    if (firstFailure === null && event.phase === "reject") {
      firstFailure = { task: event.task, ms: event.ms };
      failureSegment.push(...recent);
      failureRemaining = limits.failureAfter + 1;
    }
    if (failureRemaining > 0) { failureSegment.push(event); failureRemaining--; }
    recent.push(event);
    if (recent.length > limits.failureBefore) recent.shift();
    const size = JSON.stringify(event).length;
    if (size > limits.bytes / 4) { omitted++; return; }
    while (events.length >= limits.events || bytes + size > limits.bytes) {
      const removed = events.splice(Math.min(192, events.length - 1), 1)[0];
      bytes -= JSON.stringify(removed).length;
      omitted++;
    }
    events.push(event); bytes += size;
  }

  /** Never let a diagnostic failure change the observed method's return, rejection or thrown value. */
  function observe(receiver, group, method, path, task, phase, result) {
    try {
      record({ owner: objectId(receiver), group, method, center: centerId(path), task, phase,
        state: stateOf(receiver, group, path), ...(phase === "end" ? { result: resultOf(method, result) } : {}) });
    } catch { observationErrors++; }
  }

  /** Install exact-descriptor wrappers on actual prototypes; unavailable methods are explicit evidence. */
  function wrap(constructor, group, methods) {
    for (const method of methods) {
      const prototype = constructor?.prototype, descriptor = prototype && Object.getOwnPropertyDescriptor(prototype, method);
      if (typeof descriptor?.value !== "function") { missing.push(`${group}.${method}`); continue; }
      const original = descriptor.value;
      /** Preserve synchronous return and exception identity; passive native-promise observers return nothing. */
      function wrapper(...args) {
        if (disposed || expired) return Reflect.apply(original, this, args);
        const task = ++nextTask, receiver = this;
        const path = typeof args[0] === "string" && method !== "buildStructuralProjection" ? args[0] : undefined;
        observe(receiver, group, method, path, task, "start");
        let result;
        try { result = Reflect.apply(original, receiver, args); }
        catch (error) { observe(receiver, group, method, path, task, "reject"); throw error; }
        let nativePromise = false;
        if (result && (typeof result === "object" || typeof result === "function")) {
          try {
            Promise.prototype.then.call(result,
              /** Observe resolution without substituting the caller's original Promise. */
              value => { observe(receiver, group, method, path, task, "end", value); },
              /** Observe rejection without serializing the potentially private error message. */
              () => { observe(receiver, group, method, path, task, "reject"); });
            nativePromise = true;
          } catch { /* Native Promise brand rejection: arbitrary thenables must remain untouched. */ }
        }
        if (!nativePromise) observe(receiver, group, method, path, task, "end", result);
        return result;
      }
      Object.defineProperty(prototype, method, { ...descriptor, value: wrapper });
      installed.push(`${group}.${method}`);
      /** Restore this exact original descriptor unless a later independent wrapper replaced ours. */
      cleanups.push(() => { if (Object.getOwnPropertyDescriptor(prototype, method)?.value === wrapper) Object.defineProperty(prototype, method, descriptor); });
    }
  }

  wrap(GraphIndex, "GraphIndex", ["primePhysicalSearchCatalog", "restorePersistedSnapshot", "initializeOnDemandBaseline", "ensureOnDemandCenter",
    "publishHostMetadataPreview", "publishOnDemandHostScope", "recheckVisibleCenter", "publishRestoredState", "getNeighborhood"]);
  wrap(GraphBuilder, "GraphBuilder", ["buildStructuralBaseline", "buildStructuralProjection", "collectStructuralSources", "collectHostLinkSources", "bindCompiledGraph"]);
  wrap(HostMetadataPreview, "HostMetadataPreview", ["initializeBacklinks", "build"]);
  const controller = {
    /** Return detached scalar JSON; callers cannot mutate the retained trace or recover private paths. */
    snapshot() {
      return JSON.parse(JSON.stringify({ schema: 1, startedAt, limits, disposed, expired, installed, missing, omitted, omittedCenters,
        observationErrors, eventBytes: bytes, firstFailure, failureSegment, events }));
    },
    /** Independently restore all owned descriptors and remove the global, even after partial replacement. */
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const cleanup of cleanups) {
        try { cleanup(); } catch { observationErrors++; }
      }
      cleanups.length = 0; centers.clear(); recent.length = 0;
      previewIndices = new WeakMap(); lastCenters = new WeakMap();
      if (ownerWindow.kplexStartupCenterObserver === controller) delete ownerWindow.kplexStartupCenterObserver;
    },
  };
  ownerWindow.kplexStartupCenterObserver = controller;
  return controller;
}
