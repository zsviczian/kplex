/** Pure contracts for bounded passive event capture and publicly shareable allowlisted support text. */
import assert from "node:assert/strict";
import test from "node:test";
import { browserBundle } from "./support/browserTypeScript.mjs";
const source = await browserBundle(["src/application/SessionEventRecorder.ts", "src/application/supportReport.ts"]);
const host = {};
new Function("window", source)(host);
const { SessionEventRecorder, SESSION_EVENT_LIMIT, SESSION_EVENT_BYTE_LIMIT, SESSION_EVENT_MAX_AGE_MS, createSupportReport, SUPPORT_REPORT_BYTE_LIMIT } = host.sourceModules;

/** Parse only the formatter's fenced payload so tests inspect the exact bytes shown and copied. */
function payload(text) {
  assert(text.startsWith("## K-Plex support report\n\n```json\n"));
  assert(text.endsWith("\n```\n"));
  return JSON.parse(text.slice(text.indexOf("```json\n") + 8, -5));
}
/** Supply a realistic aggregate index with opaque strings only in deliberate hostile extra fields. */
function indexFixture() {
  return { formatVersion: 1, generatedAt: "2026-10-10T11:00:00.000Z", plugin: { id: "k-plex", version: "0.1.0" }, platform: "desktop",
    device: { obsidianApiVersion: "1.14.4", operatingSystem: "macos", formFactor: "desktop" }, status: { upToDate: false, phase: "indexing", indexedFiles: 4, totalFiles: 73 },
    graph: { nodes: 152, publishedMarkdownFiles: 4, authoritative: false },
    hydration: { run: 2, phase: "source-authority", lastActivePhase: "source-authority", startedAt: 1730000000000, phaseStartedAt: 1730000000004, lastProgressAt: 1730000000008,
      pages: 4, relations: 13, evidence: 8, outcome: "running" },
    saved: { storage: "available", invalidActive: false, active: { createdAt: 1730000000000, schema: 3 }, checkpoint: { createdAt: 1730000000000, schema: 3, completedMarkdownFiles: 4 } },
    sources: { formatVersion: 1, databaseVersion: 9, factFormatVersion: 4, factCompilerVersion: 4, bodyParserVersion: 3, resolutionVersion: 1, storage: "available",
      activated: 4, unsaved: 2, empty: 0, chunksWritten: 14, bytesWritten: 5200, familiesReused: 6, readFailures: 1, sequenceMin: 1, sequenceMax: 6, peakDecodeBytes: 2400,
      lastReason: "pending-metadata", familyFailures: { values: 0, "body-urls": 1, metadata: 0, resolution: 0 } },
    decisions: [{ at: 1730000000000, stage: "restore", reason: "source-backed-physical-baseline", added: 4, changedKeys: ["datePropertyRelations"] }] };
}
/** Build one ordinary passive report input without any runtime host capabilities. */
function inputFixture() {
  return { capturedAt: "2026-10-10T11:00:01.000Z", indexReport: indexFixture(), environment: { pluginVersion: "0.1.0", obsidianApiVersion: "1.14.4", operatingSystem: "macos",
    formFactor: "desktop", locale: "en", theme: "dark", surfaceKind: "tab" }, indexingPreferences: { indexingMode: "on-demand", urlIndexingMode: "background", indexingThrottle: "responsive" },
    startup: { enabled: false, frozen: false, phases: [], milestones: {}, progress: { source: { phase: "source-reconciliation", pass: 2, processed: 4, total: 73 }, hydration: null },
      source: { checked: 73, reusedBodies: 69, vaultReads: 4, parses: 4, failures: 0 }, semantic: { requested: 1, pending: 1, lastReason: "pending-metadata" } },
    session: { eventsCaptureStatus: "active", events: [{ code: "plugin-start", atMs: 0 }, { code: "index-phase-change", atMs: 350, phase: "indexing" }], droppedEvents: 0, retainedBytes: 109 } };
}

test("support output preserves useful aggregate index and partial startup facts, with explicit unknown evidence", /** Ordinary facts survive the privacy boundary without inventing readiness or telemetry. */ () => {
  const report = payload(createSupportReport(inputFixture()));
  assert.equal(report.formatVersion, 1); assert.equal(report.index.status.indexedFiles, 4); assert.equal(report.index.status.totalFiles, 73);
  assert.equal(report.index.graph.authoritative, false); assert.equal(report.index.sources.lastReason, "pending-metadata");
  assert.deepEqual(report.index.decisions[0].changedKeys, ["datePropertyRelations"]);
  assert.equal(report.startup.progress.source.processed, 4); assert.equal(report.startup.detailedTelemetry, "disabled"); assert.deepEqual(report.startup.phases, []);
  assert.equal(report.eventsCaptureStatus, "active"); assert.equal(report.rawConsoleCaptureStatus, "unsupported");
  assert.equal(report.environment.hostVersion, "unavailable"); assert.equal(report.environment.enabledPluginCount, null);
  assert.deepEqual(report.indexingPreferences, { indexingMode: "on-demand", urlIndexingMode: "background", indexingThrottle: "responsive", excalidrawFitOnNodeOpen: null });
});
test("hostile input cannot disclose paths, note titles, metadata, URLs, accounts, tokens, errors or ASCII reason secrets", /** Inject private data into plausible sources and extra properties rather than testing one scrub regex. */ () => {
  const secrets = ["/Users/alice/Private Vault/Medical.md", "C:\\Users\\Alice\\Secret Vault\\Salary.md", "https://secret.example/private?token=abc", "Alice's medical history",
    "alice@example.invalid", "Bearer-my-private-api-token", "custom-secret-property-value", "fake-bearer-secret", "Error: secret network failure\nat private/path.ts:12"];
  const input = inputFixture(), dirty = { vaultName: secrets[0], file: { path: secrets[1] }, url: secrets[2], title: secrets[3], account: secrets[4], token: secrets[5],
    metadata: secrets[6], error: new Error(secrets[8]), stack: secrets[8], toJSON: /** Arbitrary host serializers must never run. */ () => { throw new Error("serializer called"); } };
  Object.assign(input.indexReport, dirty); Object.assign(input.indexReport.saved.active, dirty); Object.assign(input.indexReport.device, dirty);
  Object.assign(input.indexReport.sources, dirty); input.indexReport.sources.lastReason = secrets[7]; input.indexReport.status.phase = secrets[0];
  input.indexReport.decisions.push({ at: 10, stage: "build", reason: secrets[7], changedKeys: [secrets[6]], ...dirty });
  Object.assign(input.environment, dirty); input.environment.locale = "en-x-private-token"; input.environment.pluginVersion = secrets[5];
  Object.assign(input.startup, dirty); input.startup.enabled = true; input.startup.milestones[secrets[0]] = 1;
  input.startup.phases = [{ lane: "source", phase: secrets[3], counters: { [secrets[6]]: 7 }, uniqueOwners: 2, owner: secrets[1], ...dirty }];
  input.startup.overlaps = [{ first: secrets[3], second: "source-reconciliation", owners: 1 }];
  input.session.events.push({ code: "action-failed", atMs: 1, category: "action", message: secrets[8], ...dirty });
  input.session.events.push({ code: secrets[7], atMs: 2 }); input.indexingPreferences.indexingMode = secrets[6];
  const text = createSupportReport(input), report = payload(text);
  for (const secret of secrets) assert(!text.includes(secret), secret);
  assert.equal(report.index.decisions[1].reason, "unrecognized"); assert.equal(report.environment.locale, "unavailable");
  assert.equal(report.index.sources.lastReason, "unavailable"); assert.equal(report.events.length, 3);
  assert.equal(report.indexingPreferences.indexingMode, "unavailable");
  const serializedIndex = indexFixture(); serializedIndex.privatePayload = secrets; serializedIndex.decisions.push({ at: 10, stage: "build", reason: secrets[7] });
  const serialized = { ...input, indexReport: JSON.stringify(serializedIndex) };
  for (const secret of secrets) assert(!createSupportReport(serialized).includes(secret), secret);
});
test("report reads only own data fields and performs no host effects, getters, iteration or serializers", /** Controlled host APIs fail loudly if report generation attempts work. */ () => {
  const input = inputFixture(); let calls = 0;
  const fail = /** Count any accidental capability access before rejecting it. */ () => { calls++; throw new Error("private host error"); };
  input.vault = { getFiles: fail, read: fail }; input.indexReport.read = fail; input.indexReport.rebuild = fail; input.indexReport.storage = { transaction: fail };
  Object.defineProperty(input.indexReport, "saved", { get: fail }); Object.defineProperty(input.environment, "locale", { get: fail });
  input.startup = { enabled: true, phases: [Object.defineProperty({ lane: "source" }, "phase", { get: fail })], toJSON: fail };
  input.session.events[Symbol.iterator] = fail;
  assert.doesNotThrow(/** Format without invoking any test capability. */ () => createSupportReport(input)); assert.equal(calls, 0);
  const proxy = Proxy.revocable({}, {}); proxy.revoke(); input.indexReport = proxy.proxy;
  assert.doesNotThrow(/** Revoked unknown proxies become unknown fields rather than a disclosed exception. */ () => createSupportReport(input));
});
test("unknown and malformed evidence stays explicit; disabled and disposed capture cannot falsely imply no failures", /** Report unavailable startup/index without hiding missing capture behind empty success. */ () => {
  const input = inputFixture(); input.indexReport = "not-json"; input.startup = null;
  for (const status of ["disabled", "disposed", "unavailable"]) {
    input.session.eventsCaptureStatus = status; const report = payload(createSupportReport(input));
    assert.equal(report.index.availability, "unavailable"); assert.equal(report.startup.detailedTelemetry, "unavailable");
    assert.equal(report.eventsCaptureStatus, status); assert.deepEqual(report.events, []);
  }
  input.indexReport = "x".repeat(100000); assert.equal(payload(createSupportReport(input)).index.availability, "unavailable");
  input.environment = { pluginVersion: { toString: /** Untrusted coercion must remain unused. */ () => "private" }, obsidianApiVersion: Infinity, theme: "secret" };
  input.capturedAt = "private-date"; const report = payload(createSupportReport(input)); assert.equal(report.capturedAt, "unavailable"); assert.equal(report.environment.pluginVersion, "unavailable");
});
test("recorder copies immutable scalar events and preserves monotonic occurrence time", /** Mutating producers or snapshots cannot rewrite retained evidence. */ () => {
  let now = 100; const recorder = new SessionEventRecorder(/** Inject deterministic occurrence clock. */ () => now);
  const fields = { phase: "indexing", durationMs: 23.9, count: 4, error: new Error("private"), extra: "private" };
  recorder.record("plugin-start"); now = 150.9; recorder.record("index-phase-change", fields); fields.phase = "ready";
  now = 110; recorder.record("navigation-request"); const snapshot = recorder.snapshot();
  assert.deepEqual(snapshot.events.map(/** Inspect retained times rather than wall-clock strings. */ event => event.atMs), [0, 50, 50]);
  assert.equal(snapshot.events[1].phase, "indexing"); assert.equal(snapshot.events[1].durationMs, 23); assert(!JSON.stringify(snapshot).includes("private"));
  assert(Object.isFrozen(snapshot)); assert(Object.isFrozen(snapshot.events)); assert(Object.isFrozen(snapshot.events[1]));
  assert.throws(/** Frozen detached events cannot be mutated by report consumers. */ () => { snapshot.events[1].count = 99; }, TypeError);
  assert.equal(recorder.snapshot().events[1].count, 4);
});
test("recorder rejects unknown codes, fields and malformed numeric values without retaining strings", /** Runtime callers cannot bypass finite vocabulary with a type assertion or raw error. */ () => {
  const recorder = new SessionEventRecorder(/** This fixture holds time at the session origin. */ () => 0);
  recorder.record("private-path.md", { message: "secret" }); recorder.record("action-failed", { category: "private", phase: "private", outcome: "private", durationMs: NaN, count: Infinity });
  recorder.record("action-failed", { durationMs: -1, count: 1.5 });
  assert.deepEqual(recorder.snapshot().events, [{ code: "action-failed", atMs: 0 }, { code: "action-failed", atMs: 0 }]);
});
test("dense capture obeys both fixed entry and byte limits, with deterministic rotation", /** Simulate event pressure without graph reads, render subscriptions or per-file strings. */ () => {
  let now = 0; const recorder = new SessionEventRecorder(/** Dense fixture increments only the injected monotonic clock. */ () => now);
  for (let index = 0; index < 100000; index++) { now++; recorder.record("semantic-preparation-failure", { phase: "dependency-final-validation", outcome: "superseded", category: "navigation", durationMs: Number.MAX_SAFE_INTEGER, count: Number.MAX_SAFE_INTEGER }); }
  const snapshot = recorder.snapshot(); assert(snapshot.events.length <= SESSION_EVENT_LIMIT); assert(snapshot.retainedBytes <= SESSION_EVENT_BYTE_LIMIT);
  assert(snapshot.events.length < SESSION_EVENT_LIMIT, "Byte cap applies independently of entry cap");
  assert.equal(snapshot.droppedEvents, 100000 - snapshot.events.length); assert.equal(snapshot.events.at(-1).atMs, 100000);
  assert.equal(snapshot.retainedBytes, snapshot.events.reduce(/** Verify exact retained JSON bytes for finite ASCII DTOs. */ (bytes, event) => bytes + Buffer.byteLength(JSON.stringify(event)), 0));
  assert.equal(recorder.slots.length, SESSION_EVENT_LIMIT, "Backing ring does not grow with event volume");
});
test("age expiry, disabled capture and disposal need no timers and release all retained events", /** Clock changes are observed only at existing record/snapshot boundaries. */ () => {
  let now = 0; const recorder = new SessionEventRecorder(/** Advance the age clock explicitly, never with a timer. */ () => now);
  recorder.record("plugin-start"); now = SESSION_EVENT_MAX_AGE_MS; assert.equal(recorder.snapshot().events.length, 1);
  now++; assert.equal(recorder.snapshot().events.length, 0); assert.equal(recorder.snapshot().droppedEvents, 1);
  recorder.record("view-created"); recorder.dispose(); recorder.dispose(); recorder.record("view-created");
  assert.equal(recorder.snapshot().eventsCaptureStatus, "disposed"); assert.equal(recorder.snapshot().retainedBytes, 0); assert.deepEqual(recorder.snapshot().events, []);
  assert(recorder.slots.every(/** Disposed ring must not retain retired DTOs. */ slot => slot === undefined));
  const disabled = new SessionEventRecorder(/** Disabled capture never needs even a clock read. */ () => { throw new Error("clock should not run"); }, false);
  disabled.record("plugin-start"); assert.equal(disabled.snapshot().eventsCaptureStatus, "disabled"); assert.deepEqual(disabled.snapshot().events, []);
});
test("bad injected clocks cannot break capture or move occurrence backwards", /** Malformed timing is unknown operational data, not an error-string source. */ () => {
  let value = 50; const recorder = new SessionEventRecorder(/** Supply finite, invalid and throwing clock cases. */ () => { if (value === "throw") throw new Error("private clock stack"); return value; });
  for (const next of [60, NaN, Infinity, -5, "throw", 80]) { value = next; recorder.record("navigation-settle"); }
  assert.deepEqual(recorder.snapshot().events.map(/** Extract normalized occurrence values. */ event => event.atMs), [10, 10, 10, 10, 10, 30]);
});
test("maximum hostile-safe report truncates oldest events deterministically before startup rows", /** Bound final clipboard bytes after indented Markdown formatting, not only the raw ring JSON. */ () => {
  const input = inputFixture(), max = Number.MAX_SAFE_INTEGER;
  input.startup.enabled = true;
  input.startup.phases = Array.from({ length: 32 }, /** Construct the largest allowed scalar phase fixtures. */ (_, index) => ({ lane: "hydration", phase: "dependency-final-validation", pass: max, processed: max, total: max,
    startedMs: max, endedMs: max, uniqueOwners: max, counters: { physicalRevisionComparisons: max, headPageOwners: max, inventoryFiles: max, inventoryFolders: max } }));
  input.startup.overlaps = Array.from({ length: 32 }, /** Each overlap is bounded and path-free. */ () => ({ first: "dependency-final-validation", second: "resolution-reconciliation", owners: max }));
  input.session.events = Array.from({ length: 96 }, /** Arrange oldest-to-newest event identity for trimming assertions. */ (_, index) => ({ code: "semantic-preparation-failure", atMs: index, phase: "dependency-final-validation", category: "navigation", outcome: "superseded", durationMs: max, count: max }));
  const text = createSupportReport(input), report = payload(text); assert.equal(createSupportReport(input), text);
  assert(Buffer.byteLength(text) <= SUPPORT_REPORT_BYTE_LIMIT); assert(report.truncation.oldestEventsOmitted > 0);
  assert.equal(report.truncation.oldestStartupPhasesOmitted, 0); assert.equal(report.truncation.oldestStartupOverlapsOmitted, 0);
  assert.equal(report.events.length + report.truncation.oldestEventsOmitted, 96);
  if (report.events.length) { assert.equal(report.events[0].atMs, report.truncation.oldestEventsOmitted); assert.equal(report.events.at(-1).atMs, 95); }
  assert.equal(input.session.events.length, 96, "Formatting must not mutate retained host snapshots");
});
test("large sparse arrays and dynamic counters are projected with fixed work and finite keys", /** Ignore huge collections instead of enumerating a discovered host inventory. */ () => {
  const input = inputFixture(); input.startup.enabled = true;
  input.startup.phases = []; input.startup.phases.length = 100000000; input.startup.phases[99999999] = { lane: "source", phase: "source-inventory", counters: { secret: 4 } };
  input.session.events = []; input.session.events.length = 100000000; input.session.events[99999999] = { code: "plugin-start", atMs: 7 };
  const report = payload(createSupportReport(input)); assert.equal(report.startup.phases.length, 32); assert.equal(report.events.length, 1);
  assert.equal(report.truncation.oldestStartupPhasesOmitted, 100000000 - 32); assert.equal(report.truncation.oldestEventsOmitted, 100000000 - 96);
  assert(!JSON.stringify(report).includes("secret")); assert(Buffer.byteLength(createSupportReport(input)) <= SUPPORT_REPORT_BYTE_LIMIT);
});
test("predeclared composed reasons remain useful, arbitrary ASCII strings do not", /** Preserve native index categories while refusing an apparently syntactically safe private token. */ () => {
  const input = inputFixture(); const reasons = ["cold-progressive:startup:no-snapshot", "per-file-patch:metadata:changed|vault:create-markdown", "active-pages-missing-chunk", "checkpoint-quota-exceeded", "my-secret-api-token"];
  input.indexReport.decisions = reasons.map(/** Exercise native diagnostic variants without injecting executable owners. */ reason => ({ stage: "restore", reason, at: 10 }));
  assert.deepEqual(payload(createSupportReport(input)).index.decisions.map(/** Compare only projected reason codes. */ row => row.reason), [...reasons.slice(0, 4), "unrecognized"]);
});
test("deterministic hostile scalar fuzz cannot leak through accepted DTO property names", /** Sweep every user-string boundary using realistic unique private payloads and Unicode escapes. */ () => {
  for (let index = 0; index < 256; index++) {
    const secret = `private-user-${index}-token-秘密-https://private.example/path`, input = inputFixture();
    input.capturedAt = secret;
    for (const key of ["pluginVersion", "obsidianApiVersion", "operatingSystem", "formFactor", "locale", "theme", "surfaceKind", "hostVersion", "installerVersion", "enabledPluginCount"]) input.environment[key] = secret;
    for (const key of ["indexingMode", "urlIndexingMode", "indexingThrottle"]) input.indexingPreferences[key] = secret;
    input.indexReport.plugin.version = secret; input.indexReport.generatedAt = secret; input.indexReport.platform = secret;
    for (const key of ["upToDate", "phase", "indexedFiles", "totalFiles"]) input.indexReport.status[key] = secret;
    input.indexReport.sources.lastReason = secret; input.indexReport.sources.activated = secret; input.indexReport.saved.active.createdAt = secret;
    input.indexReport.decisions = [{ at: secret, stage: secret, reason: secret, changedKeys: [secret] }];
    input.startup.enabled = true; input.startup.phases = [{ lane: secret, phase: secret, pass: secret, counters: { inventoryFiles: secret }, uniqueOwners: secret }];
    input.startup.overlaps = [{ first: secret, second: secret, owners: secret }]; input.startup.semantic.lastReason = secret;
    input.session.events = [{ code: "action-failed", atMs: 4, phase: secret, outcome: secret, category: secret, durationMs: secret, count: secret }];
    const text = createSupportReport(input); assert(!text.includes("private-user-")); assert(!text.includes("private.example")); assert(!text.includes("秘密"));
    assert(Buffer.byteLength(text) <= SUPPORT_REPORT_BYTE_LIMIT); payload(text);
  }
});

test("explicit customization metadata keeps active plugin names and versions, custom theme and snippet counts only", /** Intentional plugin/theme names survive while unrelated manifest/settings payloads remain excluded. */ () => {
  const input = inputFixture(), secret = "private-vault-path.md";
  Object.assign(input.environment, { activePluginsAvailability: "available", activePluginTotalCount: 2,
    activePlugins: [{ kind: "core", id: "canvas", name: "Canvas", version: "secret-core-version", path: secret },
      { kind: "community", id: "obsidian-excalidraw-plugin", name: "Excalidraw 日本語", version: "2.17.0-beta.1+build.2", dir: secret, authorUrl: "https://private.example", settings: { token: secret } }],
    customThemeAvailability: "available", customThemeName: "Minimal カスタム", cssSnippetsAvailability: "available", enabledCssSnippetCount: 2, availableCssSnippetCount: 4,
    snippets: [secret], enabledSnippets: [secret], themePath: secret });
  input.indexingPreferences.excalidrawFitOnNodeOpen = true;
  const text = createSupportReport(input), report = payload(text), environment = report.environment;
  assert.deepEqual(environment.activePlugins, [{ kind: "core", id: "canvas", name: "Canvas", version: null },
    { kind: "community", id: "obsidian-excalidraw-plugin", name: "Excalidraw 日本語", version: "2.17.0-beta.1+build.2" }]);
  assert.equal(environment.activePluginsAvailability, "available"); assert.equal(environment.activePluginTotalCount, 2); assert.equal(environment.activePluginsOmitted, 0);
  assert.equal(environment.customThemeName, "Minimal カスタム"); assert.equal(environment.enabledCssSnippetCount, 2); assert.equal(environment.availableCssSnippetCount, 4);
  assert.equal(report.indexingPreferences.excalidrawFitOnNodeOpen, true);
  assert(!text.includes(secret)); assert(!text.includes("private.example")); assert(!text.includes("secret-core-version"));
  assert(!/[^\u0000-\u007f]/.test(text)); assert.equal(Buffer.byteLength(text), text.length);
});

test("customization source availability distinguishes unavailable metadata and the default theme", /** Unsupported sources never masquerade as an empty plugin/snippet inventory or a known custom theme. */ () => {
  const input = inputFixture(); Object.assign(input.environment, { activePlugins: [{ kind: "community", id: "private-plugin", name: "Private plugin", version: "1.0.0" }], activePluginTotalCount: 1,
    customThemeName: "Private theme", enabledCssSnippetCount: 7, availableCssSnippetCount: 9 });
  let environment = payload(createSupportReport(input)).environment;
  assert.equal(environment.activePluginsAvailability, "unavailable"); assert.equal(environment.activePluginTotalCount, null); assert.deepEqual(environment.activePlugins, []);
  assert.equal(environment.activePluginsOmitted, null); assert.equal(environment.customThemeAvailability, "unavailable"); assert.equal(environment.customThemeName, null);
  assert.equal(environment.cssSnippetsAvailability, "unavailable"); assert.equal(environment.enabledCssSnippetCount, null); assert.equal(environment.availableCssSnippetCount, null);
  Object.assign(input.environment, { activePluginsAvailability: "available", activePlugins: [], activePluginTotalCount: 0, customThemeAvailability: "available", customThemeName: null,
    cssSnippetsAvailability: "available", enabledCssSnippetCount: 0, availableCssSnippetCount: 0 });
  environment = payload(createSupportReport(input)).environment;
  assert.equal(environment.activePluginsAvailability, "available"); assert.equal(environment.activePluginTotalCount, 0); assert.equal(environment.activePluginsOmitted, 0);
  assert.equal(environment.customThemeAvailability, "available"); assert.equal(environment.customThemeName, null); assert.equal(environment.enabledCssSnippetCount, 0);
  input.environment.customThemeName = "theme\nprivate-data"; environment = payload(createSupportReport(input)).environment;
  assert.equal(environment.customThemeAvailability, "unavailable"); assert.equal(environment.customThemeName, null);
});

test("customization metadata rejects unsafe fields without getters, coercion or iterator work", /** Accessors, controls, overlength metadata and path-shaped IDs/versions cannot enter the explicit allowlist. */ () => {
  const input = inputFixture(); let calls = 0;
  const fail = /** Fail loudly if any hostile accessor or serializer executes. */ () => { calls++; throw Error("private getter"); };
  const row = { kind: "community", id: "legitimate-plugin", name: "n".repeat(129), version: "https://private.example/version", toJSON: fail };
  Object.defineProperty(row, "path", { get: fail }); Object.defineProperty(row, "name", { get: fail });
  const rows = [row, { kind: "community", id: "/Users/private/plugin", name: "Private", version: "1.0.0" },
    { kind: "community", id: "controls", name: "Name\u202eprivate", version: "1.0.0\nprivate" }]; rows[Symbol.iterator] = fail;
  Object.assign(input.environment, { activePluginsAvailability: "available", activePluginTotalCount: 3, activePlugins: rows, customThemeAvailability: "available", customThemeName: "n".repeat(129),
    cssSnippetsAvailability: "available", enabledCssSnippetCount: Infinity, availableCssSnippetCount: -1 });
  const environment = payload(createSupportReport(input)).environment;
  assert.equal(calls, 0); assert.deepEqual(environment.activePlugins, [{ kind: "community", id: "legitimate-plugin", name: null, version: null }, { kind: "community", id: "controls", name: null, version: null }]);
  assert.equal(environment.activePluginsOmitted, 1); assert.equal(environment.customThemeAvailability, "unavailable"); assert.equal(environment.enabledCssSnippetCount, null);
  assert.equal(environment.availableCssSnippetCount, null); input.indexingPreferences.excalidrawFitOnNodeOpen = "private";
  assert.equal(payload(createSupportReport(input)).indexingPreferences.excalidrawFitOnNodeOpen, null);
});

test("large active-plugin metadata trims deterministic prefixes after events and remains within exact Unicode byte bound", /** Bound copied manifest slots and final output independently; no input object or snapshot is mutated. */ () => {
  const input = inputFixture(), rows = Array.from({ length: 700 }, /** Maximize authorized metadata while keeping independently recognizable IDs. */ (_, index) => ({ kind: "community", id: `plugin-${String(index).padStart(4, "0")}`, name: "界".repeat(128), version: "1.2.3-beta." + "a".repeat(110) }));
  Object.assign(input.environment, { activePluginsAvailability: "available", activePluginTotalCount: rows.length, activePlugins: rows,
    customThemeAvailability: "available", customThemeName: "テーマ", cssSnippetsAvailability: "available", enabledCssSnippetCount: 1, availableCssSnippetCount: 2 });
  const text = createSupportReport(input), report = payload(text), environment = report.environment;
  assert(Buffer.byteLength(text) <= SUPPORT_REPORT_BYTE_LIMIT); assert.equal(Buffer.byteLength(text), text.length); assert.equal(createSupportReport(input), text);
  assert.equal(report.events.length, 0); assert.equal(report.truncation.oldestEventsOmitted, input.session.events.length);
  assert(environment.activePlugins.length > 0 && environment.activePlugins.length < 512);
  assert.equal(environment.activePluginsOmitted, 700 - environment.activePlugins.length); assert.equal(report.truncation.activePluginsOmitted, environment.activePluginsOmitted);
  assert.equal(environment.activePlugins[0].id, "plugin-0000"); assert.equal(environment.activePlugins.at(-1).id, `plugin-${String(environment.activePlugins.length - 1).padStart(4, "0")}`);
  assert.equal(rows.length, 700); assert.equal(input.session.events.length, 2);
  // Sparse lengths must not cause inventory-sized traversal or import a tail private entry.
  const sparse = []; sparse.length = 100000000; sparse[99999999] = { kind: "community", id: "private-tail", name: "Private tail", version: "1.0.0" };
  input.environment.activePlugins = sparse; input.environment.activePluginTotalCount = sparse.length;
  const projected = payload(createSupportReport(input)).environment; assert.deepEqual(projected.activePlugins, []); assert.equal(projected.activePluginsOmitted, sparse.length);
});
