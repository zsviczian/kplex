/**
 * Serial exact-build native support-report acceptance in the explicit disposable small vault.
 * Real toolbar/modal controls receive trusted Electron input; clipboard results are intercepted
 * deterministically. One optional real write runs only when the original clipboard is empty or
 * plain text, with exact text/format restoration; other formats are preserved without any write.
 * Owns reversible synchronous side-effect guards, temporary surfaces, window geometry and settings.
 * Desktop narrow metrics/pop-outs are not physical Android/iOS clipboard permission acceptance.
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { Script } from "node:vm";

const root = resolve(process.env.KPLEX_PROJECT_ROOT ?? fileURLToPath(new URL("../../..", import.meta.url)));
const { validateTarget } = await import(pathToFileURL(join(root, "scripts/testing/obsidian/runner.mjs")));
const vaultName = process.env.KPLEX_TEST_VAULT_NAME;
assert.equal(vaultName, "kplex-test-small", "Select the explicit disposable small vault");
const target = validateTarget({ vaultName, vaultPath: process.env.KPLEX_TEST_VAULT_PATH, configDir: process.env.KPLEX_TEST_CONFIG_DIR });
const out = process.env.KPLEX_HOST_REPORT_DIR;
assert(out && (!existsSync(out) || readdirSync(out).length === 0), "Choose a fresh explicit KPLEX_HOST_REPORT_DIR");
mkdirSync(out, { recursive: true });
/** Identify exact artifact and driver bytes independently of manifest version strings. */
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const driver = readFileSync(fileURLToPath(import.meta.url));
writeFileSync(join(out, "driver-source.mjs"), driver);
const sourceIdentity = spawnSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8", timeout: 5000 }).stdout?.trim();
const names = ["plugins/k-plex/data.json", "community-plugins.json", "hotkeys.json", "workspace.json", "workspace-mobile.json", "app.json"];
const backups = names.map(/** Retain every relevant disposable configuration file's exact bytes or prior absence. */ name => ({ name, bytes: existsSync(join(target.config, name)) ? readFileSync(join(target.config, name)) : null }));
const report = { status: "running", startedAt: new Date().toISOString(), driverSha256: sha(driver), sourceBase: /^[a-f0-9]{40}$/.test(sourceIdentity ?? "") ? sourceIdentity : "unavailable", target: vaultName,
  limitations: ["Controlled fulfillment/denial are owning-window interceptions, distinct from the optional real native clipboard case", "Missing native capability removes only owning Clipboard.writeText; the host-installed navigator.clipboard object remains intact", "Real native clipboard runs only for empty/plain-text original content, otherwise remains pending to preserve unsupported formats", "Native Electron input and desktop clipboard do not establish physical Android/iOS permission or touch acceptance", "Narrow desktop viewport geometry does not prove mobile WebView permissions or physical touch", "Cached partial/unavailable diagnostics are controlled synchronous getter fixtures, not a cold-start performance measurement"], artifacts: {} };

/** Send explicit arguments to the selected native vault and reject CLI errors even with exit code zero. */
function cli(command, ...args) {
  const result = spawnSync(process.env.KPLEX_OBSIDIAN_CLI ?? "obsidian", [`vault=${vaultName}`, command, ...args], { cwd: root, encoding: "utf8", timeout: 30000, killSignal: "SIGKILL", maxBuffer: 8 * 1024 * 1024 });
  if (result.error || result.status !== 0 || /^Error:/m.test(result.stdout)) throw result.error ?? Error(result.stderr || result.stdout);
  return result.stdout.trim();
}
/** Validate injected syntax and require the native expression's explicit serializable JSON receipt. */
function evaluate(code) { new Script(code); return JSON.parse(cli("eval", `code=${code}`).replace(/^=>\s*/, "")); }
/** Yield between finite native observations without blocking the renderer or changing product timers. */
const delay = ms => new Promise(/** Resume the serial driver after its bounded observation interval. */ resolve => setTimeout(resolve, ms));

/** Start actual native scenarios with one independently disposable controller and finite vocabulary. */
function probe() {
  if (window.__kplexSupportReport || window.__kplexInteractionFinal || window.__kplexInteractionTouch || window.__kplexActionWorkflows) throw Error("Competing native controller");
  const p = app.plugins.plugins["k-plex"], remote = require("@electron/remote");
  const windows = remote.BrowserWindow.getAllWindows().filter(/** Never use a currently active personal-vault window as the native input target. */ item => item.getTitle().includes("kplex-test-small"));
  if (windows.length !== 1) throw Error("Disposable baseline native window identity ambiguous");
  const win = windows[0];
  if (!p?.reportBug || !p.actionManager || !win || remote.powerMonitor.getSystemIdleState(10) === "locked") throw Error("Unlocked disposable native prerequisites unavailable");
  if (app.setting.isOpen || document.querySelector(".modal-container")) throw Error("Existing native modal/settings");
  const c = window.__kplexSupportReport = { p, win, originalSettings: JSON.parse(JSON.stringify(p.settings)), originalLayout: app.workspace.getLayout(), originalBounds: win.getBounds(), originalSidebarStates: { left: app.workspace.leftSplit.collapsed, right: app.workspace.rightSplit.collapsed },
    originalWindowIds: new Set(remote.BrowserWindow.getAllWindows().map(/** Retain only opaque ids to distinguish test-created windows without reading unrelated titles into evidence. */ item => item.id)),
    owners: { linkedDocumentLeaf: p.linkedDocumentLeaf, lastDocumentLeaf: p.lastDocumentLeaf, recentLeafHistory: [...p.recentLeafHistory], sidecarLeaves: new Map(p.sidecarLeaves) },
    leaves: [], wrappers: [], writes: [], attempts: [], cases: [], closeChecks: [], docs: new Set(), clipUndo: null, realClipboardModified: false, realClipboardWrites: 0, phase: "setup", done: false, cancelled: false, lastTrusted: false, ownedModal: null };
  /** Refuse native scenario effects once cleanup has cancelled the owned task. */
  const ensureActive = () => { if (c.cancelled) throw Error("Native support task cancelled"); };
  /** Keep test-only waits finite and separate from production scheduling or diagnostic collection. */
  const wait = async ms => {
    ensureActive();
    await new Promise(/** Renderer-native timer belongs only to the bounded driver task. */ resolve => window.setTimeout(resolve, ms));
    ensureActive();
  };
  /** Fail a named native prerequisite without serializing vault content or raw host object graphs. */
  const check = (value, label) => { if (!value) throw Error(label); };
  /** Poll actual native state under a cancellation-aware finite scenario deadline. */
  const until = async (read, label, timeout = 20000) => {
    const end = Date.now() + timeout;
    for (;;) {
      ensureActive();
      if (read()) return;
      if (Date.now() > end) throw Error(label);
      await wait(25);
    }
  };
  /** Reversibly override a concrete object's own property, preserving inherited methods on release. */
  const replace = (object, key, value) => {
    const descriptor = Object.getOwnPropertyDescriptor(object, key);
    Object.defineProperty(object, key, { configurable: true, writable: true, value });
    /** Restore the exact own descriptor, or remove the test shadow to expose the original prototype. */
    return () => { if (descriptor) Object.defineProperty(object, key, descriptor); else delete object[key]; };
  };
  /** Locate the exact mounted support modal in its real native owning document. */
  const modal = owner => owner.document.querySelector(".kplex-support-report-modal");
  /** Observe trusted input passively; never cancel events or synthesize a click receipt. */
  const observe = owner => {
    if (c.docs.has(owner.document)) return;
    c.docs.add(owner.document);
    /** Only support controls can establish the current trusted gesture marker. */
    const listener = event => {
      if (event.target.closest?.('.kplex-support-report-modal,button[aria-label="' + p.translator("support.reportTitle") + '"]') || c.ownsSettings && event.target.closest?.(".mod-settings")) c.lastTrusted = event.isTrusted;
      if (event.target.closest?.('button[aria-label="' + p.translator("support.reportTitle") + '"]')) c.launchFocus = owner.document.activeElement;
    };
    owner.document.addEventListener("click", listener, true);
    c.wrappers.push(/** Remove this exact observer from its original document before any owned window closes. */ () => owner.document.removeEventListener("click", listener, true));
  };
  /** Install deterministic results on the actual owning navigator, without invoking the OS clipboard. */
  const clipboard = (owner, mode, ownerKind) => {
    c.clipUndo?.(); c.clipUndo = null; observe(owner);
    const native = owner.navigator.clipboard;
    check(native, "Native clipboard object unavailable for controlled interception");
    // Obsidian can install navigator.clipboard as a non-configurable property. Keep that native
    // owner intact and remove only the same replaceable writer method used by every other case.
    if (mode === "missing") {
      c.clipUndo = replace(native, "writeText", undefined);
      check(typeof owner.navigator.clipboard.writeText !== "function", "Native clipboard writer remains available in missing-capability fixture");
      return;
    }
    const originalWrite = native.writeText;
    c.clipUndo = replace(native, "writeText", /** The real feature calls this narrow writer synchronously in its original input turn. */ text => {
      const row = { text, ownerKind, phase: c.phase, inReport: c.inReport === true, modalBeforeWrite: Boolean(modal(owner)), trusted: c.lastTrusted };
      c.writes.push(row);
      if (mode === "real") { c.realClipboardModified = true; c.realClipboardWrites++; return originalWrite.call(native, text); }
      if (mode === "denied") return Promise.reject(new Error("synthetic private/path.md fake-bearer-token"));
      if (mode === "pending") return new Promise(/** Keep one actual Promise boundary under deterministic scenario control. */ (resolve, reject) => { row.resolve = resolve; row.reject = reject; });
      return Promise.resolve();
    });
  };
  /** Guard only the synchronous report call; every global/native method is restored before yielding. */
  const guardedReport = p.reportBug;
  p.reportBug = /** Observe the unchanged feature's exact synchronous boundary, restoring every effect guard before any yield. */ function (...args) {
    const effects = {}, restorers = [], guardedApis = [], revision = p.index.getSemanticRevision(), writesBefore = c.writes.length;
    /** Disallow observable expensive effects on discovered real owners without replacing passive diagnostic getters. */
    const guard = (object, key, category) => {
      if (!object || typeof object[key] !== "function") return;
      restorers.push(replace(object, key, /** Count and fail only an actual call inside the captured synchronous feature boundary. */ function () { effects[category] = (effects[category] ?? 0) + 1; throw Error("Report side effect forbidden: " + category); }));
      guardedApis.push(category + "/" + key);
    };
    c.inReport = true;
    c.scopeRestorers = restorers;
    try {
      for (const key of ["getFiles", "getMarkdownFiles", "getAllLoadedFiles"]) guard(app.vault, key, "vault-enumeration");
      for (const key of ["read", "cachedRead", "readBinary"]) guard(app.vault, key, "vault-read");
      for (const key of ["read", "readBinary", "list"]) guard(app.vault.adapter, key, "adapter-io");
      guard(p.index.metadataParser, "parse", "body-parse");
      for (const key of ["rebuild", "patchMarkdownPaths", "emit", "emitSemantic", "notify", "notifyPresentation"]) guard(p.index, key, "semantic-or-presentation-publication");
      const owner = args[0]?.ownerDocument.defaultView ?? window.activeWindow ?? window;
      for (const key of ["open", "deleteDatabase"]) guard(window.indexedDB, key, "indexeddb-open");
      guard(window.IDBDatabase?.prototype, "transaction", "indexeddb-transaction");
      guard(owner, "fetch", "network-fetch"); guard(owner.XMLHttpRequest?.prototype, "open", "network-xhr"); guard(owner.navigator, "sendBeacon", "network-beacon");
      return guardedReport.apply(this, args);
    }
    finally {
      for (const restore of restorers.reverse()) restore();
      c.scopeRestorers = [];
      c.inReport = false;
      c.attempts.push({ phase: c.phase, effects, semanticUnchanged: p.index.getSemanticRevision() === revision, writesStarted: c.writes.length - writesBefore, guardedApis });
    }
  };
  c.wrappers.push(/** Restore the original feature entry point even after native scenario failure. */ () => { p.reportBug = guardedReport; });
  /** Reacquire registration rather than assuming a leaf id equals the portable action-surface id. */
  const surfaceId = leaf => [...p.actionSurfaceHosts].find(/** Pick only the exact captured native leaf with its mounted registration. */ ([id, value]) => value.leaf === leaf && p.actionManager.readSnapshot(id)?.mounted)?.[0];
  /** Require the real toolbar control to have a viewport-visible usable rectangle. */
  const bug = leaf => [...leaf.view.containerEl.querySelectorAll("button")].find(/** Match the actual localized accessible name and current visibility; Zen retains hidden toolbar DOM. */ button => button.getAttribute("aria-label") === p.translator("support.reportTitle") && button.getClientRects().length > 0);
  /** Retain private navigation/focus values only inside the owned controller for equality assertions. */
  const capture = leaf => {
    c.reportHost = leaf; c.reportSurface = surfaceId(leaf);
    c.launchFocus = leaf.view.containerEl.ownerDocument.activeElement;
    c.navigationBefore = JSON.stringify({ center: p.settings.lastActivePath, history: p.settings.navigationHistory });
    c.centerBefore = JSON.stringify(p.actionManager.readSnapshot(c.reportSurface)?.center ?? null);
  };
  /** Bring only the actual test-owned target window and native leaf into the foreground. */
  const activate = async (leaf, nativeWindow) => { ensureActive(); nativeWindow.show(); nativeWindow.focus(); nativeWindow.webContents.focus(); app.workspace.setActiveLeaf(leaf, { focus: true }); await app.workspace.revealLeaf(leaf); ensureActive(); leaf.view.focus?.(); await wait(100); };
  /** Deliver a trusted Electron click to the real native control, then inspect its production result. */
  const click = async (element, nativeWindow) => {
    const rect = element?.getBoundingClientRect(); check(rect && rect.width > 0 && rect.height > 0, "Control has no native rectangle");
    const owner = element.ownerDocument.defaultView;
    check(rect.left >= 0 && rect.right <= owner.innerWidth && rect.top >= 0 && rect.bottom <= owner.innerHeight, "Control is outside native viewport");
    c.lastTrusted = false;
    nativeWindow.webContents.sendInputEvent({ type: "mouseDown", x: Math.round(rect.left + rect.width / 2), y: Math.round(rect.top + rect.height / 2), button: "left", clickCount: 1 });
    nativeWindow.webContents.sendInputEvent({ type: "mouseUp", x: Math.round(rect.left + rect.width / 2), y: Math.round(rect.top + rect.height / 2), button: "left", clickCount: 1 });
    await wait(80); check(c.lastTrusted, "Native support control did not receive trusted Electron input");
  };
  /** Close exactly this report's actual native Modal, never unrelated host dialogs. */
  const close = async (owner, nativeWindow) => {
    const element = modal(owner); if (!element) return;
    const control = [...element.querySelectorAll("button")].find(/** Native dismissal uses the feature's public localized Close control. */ button => button.textContent === p.translator("support.close"));
    await click(control, nativeWindow); await until(/** Observe actual disposal, not just an optimistic button callback. */ () => !modal(owner), "Native report did not close"); c.ownedModal = null;
    try {
      await until(/** Assert native focus restoration rather than calling focus to manufacture a pass. */ () => owner.document.activeElement === c.launchFocus || c.reportHost.view.containerEl.contains(owner.document.activeElement), "Native report did not restore its originating surface focus", 3000);
    } catch (error) {
      const active = owner.document.activeElement, origin = c.launchFocus, surface = c.reportHost.view.containerEl;
      // A fixed set of booleans diagnoses ownership/visibility without user text, paths, classes or native object graphs.
      c.focusFailure = { phase: c.phase, originConnected: Boolean(origin?.isConnected), originVisible: Boolean(origin?.getClientRects?.().length), originInSurface: surface.contains(origin),
        activeIsOrigin: active === origin, activeInSurface: surface.contains(active), activeIsBody: active === owner.document.body, activeIsDocumentRoot: active === owner.document.documentElement,
        activeInReport: Boolean(active?.closest?.(".kplex-support-report-modal")), surfaceConnected: surface.isConnected, surfaceVisible: surface.getClientRects().length > 0,
        ownerHasFocus: owner.document.hasFocus(), ownerHidden: owner.document.hidden, nativeWindowFocused: nativeWindow.isFocused() };
      throw error;
    }
    const navigationUnchanged = c.navigationBefore === JSON.stringify({ center: p.settings.lastActivePath, history: p.settings.navigationHistory });
    const centerUnchanged = c.centerBefore === JSON.stringify(p.actionManager.readSnapshot(c.reportSurface)?.center ?? null);
    check(navigationUnchanged && centerUnchanged, "Report action changed graph center or navigation settings/history");
    c.closeChecks.push({ phase: c.phase, focusRestored: true, navigationUnchanged, centerUnchanged });
  };
  /** Compare intentionally disclosed metadata with existing main-app caches, retaining only count/boolean receipts. */
  const verifyCustomizations = (parsed, element) => {
    const core = app.internalPlugins?.plugins, community = app.plugins?.plugins, installed = app.plugins?.manifests, customCss = app.customCss;
    check(core && community && installed && customCss, "Native customization metadata caches unavailable");
    const expected = [], disabledCoreIds = [], disabledCommunityIds = [];
    let coreCount = 0, communityCount = 0;
    for (const [id, entry] of Object.entries(core)) {
      if (entry.enabled !== true) { disabledCoreIds.push(entry.instance?.id ?? id); continue; }
      check(entry.instance, "Enabled native core plugin lacks cached instance");
      expected.push({ kind: "core", id: entry.instance.id, name: entry.instance.name ?? null, version: null }); coreCount++;
    }
    for (const instance of Object.values(community)) {
      if (!instance || typeof instance !== "object") continue;
      check(instance.manifest, "Loaded native community plugin lacks cached manifest");
      expected.push({ kind: "community", id: instance.manifest.id, name: instance.manifest.name ?? null, version: instance.manifest.version ?? null }); communityCount++;
    }
    for (const id of Object.keys(installed)) if (!community[id] || typeof community[id] !== "object") disabledCommunityIds.push(id);
    const environment = parsed.environment, actual = environment.activePlugins;
    check(expected.length <= 512 && environment.activePluginsAvailability === "available" && Array.isArray(actual), "Native active plugin list unavailable or exceeds this complete-list fixture");
    check(environment.activePluginTotalCount === expected.length && environment.enabledPluginCount === expected.length && environment.activePluginsOmitted === 0 && actual.length === expected.length, "Native active plugin metadata count/list differs from caches");
    for (const row of expected) {
      const matching = actual.filter(/** Compare exact disclosed fields without publishing metadata names or versions in receipts. */ candidate => candidate.kind === row.kind && candidate.id === row.id);
      check(matching.length === 1 && matching[0].name === row.name && matching[0].version === row.version, "Native active plugin metadata differs from cached identity/version");
    }
    for (const id of disabledCoreIds) check(!actual.some(/** Disabled core plugins must not appear among reported active plugins. */ row => row.kind === "core" && row.id === id), "Disabled native core plugin included");
    for (const id of disabledCommunityIds) check(!actual.some(/** Installed but unloaded community plugins must remain absent from the active list. */ row => row.kind === "community" && row.id === id), "Unloaded native community plugin included");
    check(typeof customCss.theme === "string" && environment.customThemeAvailability === "available" && environment.customThemeName === (customCss.theme || null), "Native custom theme/default-null differs from cached preference");
    check(customCss.enabledSnippets instanceof Set && Array.isArray(customCss.snippets) && environment.cssSnippetsAvailability === "available", "Native CSS snippet count caches unavailable");
    check(environment.enabledCssSnippetCount === customCss.enabledSnippets.size && environment.availableCssSnippetCount === customCss.snippets.length, "Native CSS snippet counts differ from cached counts");
    check(parsed.indexingPreferences.excalidrawFitOnNodeOpen === p.settings.excalidrawFitOnNodeOpen, "Native drawing opening-fit preference missing or differs from settings");
    const disclosure = element.querySelector(".setting-item-description")?.textContent, expectedDisclosure = p.translator("support.privacyDisclosure");
    check(disclosure === expectedDisclosure && /active plugin names and versions/i.test(disclosure) && /custom theme name/i.test(disclosure) && /CSS snippet counts/i.test(disclosure), "Native disclosure omits authorized names/versions/theme/counts");
    return { activePluginCount: expected.length, coreCount, communityCount, disabledCoreCount: disabledCoreIds.length, unloadedCommunityCount: disabledCommunityIds.length,
      activePluginMetadataMatches: true, disabledPluginsExcluded: true, customThemeMatches: true, enabledCssSnippetCount: customCss.enabledSnippets.size,
      availableCssSnippetCount: customCss.snippets.length, snippetCountsMatch: true, openingFitPreferenceMatches: true, disclosureIncludesMetadata: true };
  };
  /** Capture only safe aggregate report/DOM facts, with byte equivalence checked before summarization. */
  const snapshot = (owner, ownerKind) => {
    const element = modal(owner), preview = element?.querySelector("textarea"), status = element?.querySelector("[role=status]"), write = c.writes.at(-1);
    check(element && preview && status, "Native report modal incomplete"); c.ownedModal = { owner, element };
    const bytes = preview.value, parsed = JSON.parse(bytes.split("```json\n")[1]?.split("\n```")[0] ?? "null");
    check(parsed?.formatVersion === 1 && bytes.length <= 32768, "Support schema/size contract failed");
    if (c.phase !== "missing") check(bytes === write?.text, "Preview differs from exact intercepted clipboard bytes");
    check(!bytes.includes("kplex-test-small") && !bytes.includes("synthetic private/path.md") && !bytes.includes("fake-bearer-token"), "Default report leaked injected private details");
    const links = [...element.querySelectorAll("a")].map(/** Inspect explicit links without opening a browser or submitting an issue. */ anchor => ({ href: anchor.getAttribute("href"), target: anchor.target, rel: anchor.rel }));
    check(links.length === 2 && links[0].href === "https://github.com/zsviczian/kplex/issues" && links[1].href === "https://github.com/zsviczian/kplex/issues/new" && links.every(/** External navigation must retain an explicit isolated browsing context. */ link => link.target === "_blank" && link.rel.includes("noopener")), "Wrong external support links");
    const customizationChecks = verifyCustomizations(parsed, element);
    const bounds = element.getBoundingClientRect();
    return { ownerKind, customizationChecks, bytes: bytes.length, exactPreview: c.phase === "missing" ? "no-writer" : true, readonly: preview.readOnly, selectable: true, status: status.textContent, warning: status.classList.contains("mod-warning"), retryDisabled: [...element.querySelectorAll("button")].find(/** Use the actual native Retry label to verify pending/denied availability. */ button => button.textContent === p.translator("support.copyAgain"))?.disabled,
      formatVersion: parsed.formatVersion, indexAvailability: parsed.index.availability, indexStatus: parsed.index.status ?? null, environment: { formFactor: parsed.environment.formFactor, surfaceKind: parsed.environment.surfaceKind },
      linksCorrect: true, bounds: { width: bounds.width, left: bounds.left, right: bounds.right, viewport: owner.innerWidth }, noOverflow: element.scrollWidth <= element.clientWidth && bounds.left >= 0 && bounds.right <= owner.innerWidth,
      writerBeforeModal: write ? !write.modalBeforeWrite : null, writerInReportTurn: write?.inReport ?? null, trustedInput: write?.trusted ?? null };
  };
  /** Execute a report through its real native toolbar and preserve a named safe result. */
  const toolbar = async (leaf, nativeWindow, ownerKind, mode = "fulfilled") => {
    const owner = leaf.view.containerEl.ownerDocument.defaultView;
    await activate(leaf, nativeWindow); await until(/** Wait for the current mounted registration and actual toolbar, not a stale retained element. */ () => surfaceId(leaf) && bug(leaf), "Report toolbar unavailable");
    c.phase = mode === "missing" ? "missing" : ownerKind + "/" + mode;
    clipboard(owner, mode, ownerKind);
    capture(leaf);
    await click(bug(leaf), nativeWindow); await until(/** Require the real public Modal in the actual toolbar owner document. */ () => modal(owner), "Report modal mounted in wrong document");
    if (mode === "real") await until(/** Actual OS completion can occur later than the deterministic fixture's promise. */ () => modal(owner).querySelector("[role=status]").textContent !== p.translator("support.copying"), "Real native clipboard did not settle");
    const result = snapshot(owner, ownerKind);
    if (mode === "fulfilled" || mode === "real") check(result.status === p.translator("support.copied") && result.writerBeforeModal && result.writerInReportTurn && result.trustedInput, "False success or late/untrusted clipboard start");
    if (mode === "denied" || mode === "missing") check(result.status === p.translator("support.copyFailed") && result.warning && !result.retryDisabled, "Failure fallback unavailable");
    if (mode === "pending") check(result.status === p.translator("support.copying") && result.retryDisabled, "Pending clipboard falsely shown copied");
    check(result.readonly && result.noOverflow, "Native preview is editable or overflows viewport");
    c.cases.push({ name: c.phase, ...(mode === "missing" ? { missingCapability: "clipboard.writeText" } : {}), ...result }); return { owner, nativeWindow, result };
  };
  /** Exercise the actual searchable Compatibility setting and its real persistent writer without index/source refresh. */
  const fitSettingsScenario = async () => {
    await activate(c.main, win);
    // Commit earlier test-only presentation setup before isolating the new scalar control's impact.
    await p.saveSettings(false, false); ensureActive(); await p.settingsWriteQueue; ensureActive();
    check(!app.setting.isOpen, "Unowned native Settings already open");
    const priorQuery = app.setting.searchComponent?.getValue?.(), priorTab = app.setting.lastTabId;
    const restores = [], counts = {}, completed = [], failures = [];
    let activeWrites = 0;
    c.ownsSettings = true;
    try {
      app.setting.open(); app.setting.openTabById("k-plex");
      await until(/** Public native page ownership must be established before resolving its trusted Electron input target. */ () => app.setting.getCurrentPageEl()?.isConnected, "Native K-Plex Settings unavailable");
      const tab = app.setting.pluginTabs.find(/** Select the exact registered K-Plex settings tab rather than an unrelated setting surface. */ value => value.id === "k-plex");
      check(tab && typeof tab.getSettingDefinitions === "function", "Native declarative settings definitions unavailable");
      const compatibility = tab.getSettingDefinitions().find(/** Native searchable hierarchy must own this control under Compatibility. */ definition => definition.type === "page" && definition.name === p.translator("settings.ui.compatibility"));
      const group = compatibility?.items?.find(/** Excalidraw is an actual declarative group, not a separate imperative modal. */ definition => definition.type === "group" && definition.heading === p.translator("settings.excalidrawCompatibility"));
      const definition = group?.items?.find(/** Require the stable setting key, native toggle type and default search visibility. */ item => item.control?.key === "excalidrawFitOnNodeOpen" && item.control.type === "toggle" && item.searchable !== false && item.visible !== false);
      check(definition?.name && definition.desc, "Drawing-fit declarative setting is absent or not searchable");
      const doc = app.setting.getCurrentPageEl().ownerDocument, ownerWindow = doc.defaultView;
      check(typeof ownerWindow?.require === "function", "Native Settings document has no Electron owner");
      const owner = ownerWindow.require("@electron/remote").getCurrentWindow();
      check(owner?.getTitle().includes("kplex-test-small") && typeof owner.webContents?.sendInputEvent === "function", "Native Settings owner escaped disposable vault");
      observe(ownerWindow); owner.show(); owner.focus(); owner.webContents.focus();
      await until(/** Settings input must target its actual unlocked owner, including native detached Settings windows. */ () => remote.powerMonitor.getSystemIdleState(10) !== "locked" && owner.isFocused() && doc.hasFocus() && !doc.hidden, "Native Settings lost foreground", 5000);
      /** Reacquire a rendered native row by its actual declarative name after host navigation/redraw. */
      const row = name => [...(app.setting.getCurrentPageEl()?.querySelectorAll(".setting-item") ?? [])].find(/** Match only the actual current public settings page. */ element => element.querySelector(".setting-item-name")?.textContent === name);
      await until(/** Find the real visible Compatibility navigation entry before trusted pointer activation. */ () => row(compatibility.name)?.getClientRects().length, "Compatibility settings navigation unavailable");
      row(compatibility.name).scrollIntoView({ block: "center" }); await wait(30);
      await click(row(compatibility.name), owner);
      await until(/** Native navigation must render the new row and its descriptive group. */ () => row(definition.name)?.querySelector(".checkbox-container"), "Drawing-fit native toggle unavailable");
      check(row(definition.name).querySelector(".setting-item-description")?.textContent === definition.desc, "Drawing-fit native description differs from declarative definition");
      const heading = row(definition.name).closest(".setting-group")?.querySelector(".setting-item-heading .setting-item-name");
      check(heading?.textContent === group.heading && heading.getClientRects().length > 0, "Native Excalidraw compatibility group heading unavailable");
      const search = app.setting.searchComponent?.inputEl;
      check(search?.isConnected && search.ownerDocument === doc, "Native global settings search unavailable");
      await click(search, owner); await until(/** Search setup uses its actual native input field. */ () => doc.activeElement === search, "Native global settings search not focused"); search.select();
      let trustedInput = false;
      /** Observe native Chromium text insertion without synthesizing DOM input or a search result. */
      const input = event => { if (event.target === search) trustedInput = event.isTrusted; };
      search.addEventListener("input", input, true);
      try {
        check(typeof owner.webContents.insertText === "function", "Native Chromium settings text insertion unavailable");
        await owner.webContents.insertText(definition.name);
        await until(/** The host search index must receive trusted native text and the exact localized query. */ () => trustedInput && search.value === definition.name, "Native settings query was not delivered");
      } finally { search.removeEventListener("input", input, true); }
      /** Locate the host's own visible global-search result for this declarative row. */
      const result = () => [...(app.setting.searchResultsEl?.querySelectorAll(".setting-search-result-item") ?? [])].find(/** Match the actual native result title rather than calling a private search callback. */ element => element.querySelector(".vertical-tab-nav-item-title")?.textContent.trim() === definition.name && element.getClientRects().length);
      await until(result, "Native global search did not find drawing-fit setting"); await click(result(), owner);
      await until(/** Global search navigation must reveal the real editable native row. */ () => row(definition.name)?.querySelector(".checkbox-container")?.getClientRects().length, "Native search did not reveal drawing-fit toggle");
      /** Forward native index/source calls unchanged; count only the real control writer's asynchronous lifetime. */
      const observeRefresh = (object, key, category) => {
        check(typeof object?.[key] === "function", "Native settings refresh observation unavailable: " + category);
        const original = object[key]; counts[category] = 0;
        restores.push(replace(object, key, /** Existing work retains its exact return value; unrelated work outside the setting writer is not attributed to this control. */ function (...args) { if (activeWrites > 0) counts[category]++; return original.apply(this, args); }));
      };
      for (const key of ["refreshSemanticSettings", "invalidateSemanticPolicy", "rebuild", "rebuildProgressively", "patchMarkdownPaths"]) observeRefresh(p.index, key, "index/" + key);
      for (const key of ["requestInventory", "reconcile"]) observeRefresh(p.index.sourceAcquisition, key, "source/" + key);
      const originalWriter = tab.setControlValue;
      restores.push(replace(tab, "setControlValue", /** Track completion of the unchanged public declarative writer so persistence checks cannot race its save. */ async function (key, value) {
        if (key !== "excalidrawFitOnNodeOpen") return originalWriter.call(this, key, value);
        activeWrites++;
        try { const returned = await originalWriter.call(this, key, value); completed.push(value); return returned; }
        catch (error) { failures.push("setting-write-failed"); throw error; }
        finally { activeWrites--; }
      }));
      /** Toggle only through trusted native pointer input and verify the completed disk snapshot. */
      const selectValue = async value => {
        if (p.settings.excalidrawFitOnNodeOpen === value) return;
        const before = completed.length, toggle = row(definition.name)?.querySelector(".checkbox-container");
        check(toggle, "Native drawing-fit toggle disappeared"); await click(toggle, owner);
        await until(/** Await the actual native control callback's full writer and persistence completion. */ () => activeWrites === 0 && completed.length > before && completed.at(-1) === value && p.settings.excalidrawFitOnNodeOpen === value, "Native drawing-fit toggle did not persist");
        ensureActive(); const saved = await p.loadData(); ensureActive();
        check(saved?.excalidrawFitOnNodeOpen === value && !failures.length, "Saved drawing-fit choice differs from native toggle");
      };
      await selectValue(true); await selectValue(false); await selectValue(true);
      check(Object.values(counts).every(/** No semantic invalidation, rebuild/patch or source inventory may result from this presentation-only preference. */ count => count === 0), "Drawing-fit toggle triggered index/source refresh");
      c.cases.push({ name: "drawing-fit-native-declarative-settings", compatibilityGroupVisible: true, descriptionMatches: true, globalSearchTrusted: trustedInput, globalSearchResultVisible: true,
        trustedToggle: c.lastTrusted, falsePersisted: completed.includes(false), truePersisted: completed.includes(true), refreshCalls: counts, writerFailures: failures.length });
    } finally {
      for (const restore of restores.reverse()) restore();
      if (c.ownsSettings) { app.setting.close(); c.ownsSettings = false; }
      if (typeof priorQuery === "string") app.setting.searchComponent?.setValue(priorQuery);
      app.setting.lastTabId = priorTab;
    }
  };
  c.task = (async () => {
    win.show(); win.focus(); win.webContents.focus(); await p.setDocumentSyncMode("off"); ensureActive(); p.settings.embedCentralNode = false; p.index.notifyPresentation();
    app.workspace.leftSplit.collapse(); app.workspace.rightSplit.collapse();
    c.main = app.workspace.getLeaf("tab"); c.leaves.push(c.main); await c.main.setViewState({ type: "k-plex-react-view", active: true }); await until(/** Observe native mounted readiness with a finite, cancellable driver deadline. */ () => surfaceId(c.main), "Main native surface did not become ready");
    let current = await toolbar(c.main, win, "tab"); await close(current.owner, win);
    await activate(c.main, win); await until(/** Reacquire the real button after the previous Modal restored native focus. */ () => surfaceId(c.main) && bug(c.main), "Keyboard report toolbar unavailable");
    const keyboardButton = bug(c.main), keyboardOwner = keyboardButton.ownerDocument.defaultView;
    c.phase = "tab/keyboard-enter"; clipboard(keyboardOwner, "fulfilled", "tab"); capture(c.main);
    keyboardButton.focus(); check(keyboardOwner.document.activeElement === keyboardButton, "Real Bug button did not accept keyboard focus");
    c.lastTrusted = false;
    let observedEnter, enterCharSent = false, enterDownSent = false;
    /** Retain the actual owning-window native key event so its final cancellation state controls the char stage. */
    const observeEnter = event => { if (event.key === "Enter") observedEnter = event; };
    keyboardOwner.addEventListener("keydown", observeEnter, true);
    try {
      await until(/** Keyboard input must reach the unlocked owning native foreground, rather than an unrelated editor. */ () => remote.powerMonitor.getSystemIdleState(10) !== "locked" && win.isFocused() && keyboardOwner.document.hasFocus() && !keyboardOwner.document.hidden, "Keyboard report lost native foreground", 5000);
      win.webContents.sendInputEvent({ type: "keyDown", keyCode: "Enter" }); enterDownSent = true;
      await until(/** Observe real Electron delivery before emulating the keyboard's subsequent character stage. */ () => observedEnter, "Native Bug Enter keydown did not arrive");
      check(observedEnter.isTrusted && observedEnter.target === keyboardButton, "Bug Enter keydown was untrusted or reached another control");
      // Electron raw keyDown does not include the physical keyboard's character stage.
      // Preserve the real handler's cancellation decision, as the existing native action drivers do.
      if (!observedEnter.defaultPrevented) { win.webContents.sendInputEvent({ type: "char", keyCode: "\r" }); enterCharSent = true; }
    } finally {
      if (enterDownSent) win.webContents.sendInputEvent({ type: "keyUp", keyCode: "Enter" });
      keyboardOwner.removeEventListener("keydown", observeEnter, true);
    }
    await until(/** The trusted native key must generate the actual button activation and mount its production Modal. */ () => modal(keyboardOwner), "Native Enter did not activate Bug");
    await wait(80);
    const keyboard = snapshot(keyboardOwner, "tab");
    check(keyboard.status === p.translator("support.copied") && keyboard.exactPreview && keyboard.writerBeforeModal && keyboard.writerInReportTurn && keyboard.trustedInput, "Keyboard activation lost trusted same-turn exact copy");
    check(keyboard.readonly && keyboard.noOverflow, "Keyboard report preview is editable or overflows viewport");
    c.cases.push({ name: c.phase, activation: "trusted-electron-enter", keydown: { trusted: observedEnter.isTrusted, targetIsBug: observedEnter.target === keyboardButton, defaultPrevented: observedEnter.defaultPrevented, charSent: enterCharSent }, ...keyboard }); await close(keyboardOwner, win);
    // This is a presentation-only loading fixture: scoped center/fallback reads are unavailable.
    // The live repository, source facts, readiness and publication owners are never replaced.
    const emptyPaths = new Set(["folder:/", p.settings.lastActivePath, app.workspace.getActiveFile()?.path, p.settings.navigationHistory.at(-1)].filter(Boolean));
    const originalGet = p.index.get, originalFallback = p.resolveNavigationFallbackPath;
    const restoreEmptyGet = replace(p.index, "get", /** Hide only captured center candidates from this bounded no-page rendering scenario. */ function (path, ...args) { return emptyPaths.has(path) ? undefined : originalGet.call(this, path, ...args); });
    const restoreEmptyFallback = replace(p, "resolveNavigationFallbackPath", /** Prevent this controlled missing-center fixture from resolving to another existing center. */ function (path, ...args) { return emptyPaths.has(path) ? null : originalFallback.call(this, path, ...args); });
    try {
      c.empty = app.workspace.getLeaf("tab"); c.leaves.push(c.empty); await c.empty.setViewState({ type: "k-plex-react-view", active: true });
      await activate(c.empty, win); await until(/** A no-page view can intentionally lack mounted action readiness; its direct toolbar must still exist. */ () => c.empty.view.containerEl.querySelector(".kplex-empty-support") && bug(c.empty), "Empty startup support button unavailable");
      c.phase = "empty-startup-toolbar"; clipboard(window, "fulfilled", "tab"); capture(c.empty);
      await click(bug(c.empty), win); await until(/** Use the actual loading-state toolbar path without fabricating action-surface registration. */ () => modal(window), "Empty startup toolbar did not open report");
      const empty = snapshot(window, "tab"); check(empty.status === p.translator("support.copied") && empty.writerBeforeModal && empty.writerInReportTurn && empty.trustedInput, "Empty startup report lost same-turn copy");
      c.cases.push({ name: c.phase, actualEmptyBranch: true, exactPreview: empty.exactPreview, trustedInput: empty.trustedInput }); await close(window, win);
    } finally { restoreEmptyFallback(); restoreEmptyGet(); if (c.empty?.view.containerEl.isConnected) c.empty.detach(); }
    // Never erase an image, HTML, RTF, file list or an unknown native clipboard format to run a test.
    let nativeClipboard = null, formats = null;
    try { nativeClipboard = require("electron").clipboard; formats = nativeClipboard?.availableFormats?.() ?? null; } catch { /* An unavailable native clipboard remains a named pending check. */ }
    const safeOriginal = Array.isArray(formats) && (formats.length === 0 || formats.length === 1 && formats[0] === "text/plain");
    if (safeOriginal) {
      c.originalClipboard = { empty: formats.length === 0, text: nativeClipboard.readText(), formats };
      c.restoreRealClipboard = /** Restore text/empty formats exactly; private original text never enters a serializable result. */ () => {
        const original = c.originalClipboard; if (!original) return;
        if (original.empty) nativeClipboard.clear(); else nativeClipboard.writeText(original.text);
        check(nativeClipboard.readText() === original.text && JSON.stringify(nativeClipboard.availableFormats()) === JSON.stringify(original.formats), "Original native clipboard formats/text not restored");
        c.realClipboardModified = false; c.originalClipboard = null;
      };
      try {
        current = await toolbar(c.main, win, "tab", "real");
        check(nativeClipboard.readText() === modal(current.owner).querySelector("textarea").value, "Real native clipboard differs from exact modal bytes");
        c.cases.push({ name: "real-native-clipboard", status: "passed", actualWrite: true, trustedInput: true, exactClipboard: true });
        await close(current.owner, win);
      } finally { c.clipUndo?.(); c.clipUndo = null; c.restoreRealClipboard(); }
    } else c.cases.push({ name: "real-native-clipboard", status: "pending", reason: formats === null ? "Native clipboard capability unavailable" : "Original non-plain-text formats preserved without writing", actualWrite: false });
    current = await toolbar(c.main, win, "tab", "denied");
    const preview = modal(current.owner).querySelector("textarea"); preview.focus(); preview.select(); check(preview.selectionStart === 0 && preview.selectionEnd === preview.value.length, "Manual fallback text cannot be selected");
    c.cases.push({ name: "denial-manual-selection", exactSelection: true });
    c.clipUndo?.(); c.clipUndo = null; clipboard(current.owner, "fulfilled", "tab");
    const retry = [...modal(current.owner).querySelectorAll("button")].find(/** Retry is a real native semantic button and runs its actual synchronous callback. */ button => button.textContent === p.translator("support.copyAgain"));
    const originalBytes = preview.value; await click(retry, win); check(c.writes.at(-1).text === originalBytes && modal(current.owner).querySelector("[role=status]").textContent === p.translator("support.copied"), "Retry changed preview bytes or reported false success");
    c.cases.push({ name: "denial-trusted-retry", exactPreview: true, trustedInput: c.writes.at(-1).trusted }); await close(current.owner, win);
    current = await toolbar(c.main, win, "tab", "missing"); await close(current.owner, win);
    current = await toolbar(c.main, win, "tab", "pending"); const pending = c.writes.at(-1), retiredStatus = modal(current.owner).querySelector("[role=status]"); await close(current.owner, win); pending.resolve(); await wait(50);
    check(retiredStatus.textContent === p.translator("support.copying") && !retiredStatus.isConnected && p.actionDialogs.size === 0, "Closed pending report updated detached native presentation");
    c.cases.push({ name: "pending-close-retirement", detachedStatusUnchanged: true, dialogsReleased: true });
    const restoreStatus = replace(p, "getIndexDiagnosticsStatus", /** Simulate cached incomplete startup facts without changing graph/index readiness or scheduling. */ () => ({ upToDate: false, phase: "loading-cache", indexedFiles: 4, totalFiles: null }));
    try {
      current = await toolbar(c.main, win, "tab"); check(current.result.indexStatus?.phase === "loading-cache" && current.result.indexStatus.totalFiles === null, "Partial retained status was invented or dropped");
      c.cases.push({ name: "partial-cached-status", status: current.result.indexStatus }); await close(current.owner, win);
      await activate(c.main, win); c.phase = "partial-command-no-node-read"; clipboard(window, "fulfilled", "tab"); capture(c.main); c.lastTrusted = false;
      let nodeReads = 0;
      const restoreGet = replace(p.index, "get", /** A node-free support command must not acquire an unavailable center before dispatching. */ () => { nodeReads++; throw Error("Synthetic center unavailable"); });
      try { check(app.commands.executeCommandById("k-plex:kplex-support-report-bug"), "Partial native support command was rejected"); }
      finally { restoreGet(); }
      await until(/** The actual native command must mount usable content without a graph lookup. */ () => modal(window), "Partial support command did not mount"); await wait(50);
      const partial = snapshot(window, "tab"); check(nodeReads === 0 && partial.status === p.translator("support.copied") && partial.indexStatus?.phase === "loading-cache", "Support command required center or lost partial facts");
      c.cases.push({ name: c.phase, nodeReads, guardedCenterUnavailable: true, status: partial.indexStatus, exactPreview: partial.exactPreview }); await close(window, win);
    } finally { restoreStatus(); }
    const restoreSaved = replace(p.index, "getSavedSnapshotSummary", /** A missing diagnostic owner cannot serialize its raw failure or prevent support use. */ () => { throw Error("synthetic private/path.md fake-bearer-token"); });
    try { current = await toolbar(c.main, win, "tab"); check(current.result.indexAvailability === "unavailable", "Unavailable cache owner did not produce explicit partial report"); c.cases.push({ name: "unavailable-index-owner", availability: "unavailable" }); await close(current.owner, win); } finally { restoreSaved(); }
    await activate(c.main, win); const id = surfaceId(c.main); const zen = await p.actionManager.dispatch({ id: "view.zen.toggle", source: "toolbar", surfaceId: id }); check(zen.status === "completed", "Zen route unavailable");
    await until(/** Zen intentionally hides the complete main toolbar, including Bug. */ () => !bug(c.main), "Zen did not hide support toolbar");
    const zenFocus = await p.actionManager.dispatch({ id: "graph.focus", source: "toolbar", surfaceId: id }); check(zenFocus.status === "completed", "Zen graph focus action unavailable");
    const zenRoot = c.main.view.containerEl.querySelector(".kplex-app");
    await until(/** Establish an actual visible graph origin before launching the command; never refocus to repair dismissal. */ () => zenRoot?.ownerDocument === window.document && zenRoot.getClientRects().length > 0 && window.document.activeElement === zenRoot, "Zen command lacks visible owning graph focus", 3000);
    c.phase = "zen-native-command"; clipboard(window, "fulfilled", "tab"); capture(c.main); c.lastTrusted = false;
    check(app.commands.executeCommandById("k-plex:kplex-support-report-bug"), "Alternate native support command absent"); await until(/** Native command remains available while the toolbar is absent. */ () => modal(window), "Zen alternate command failed");
    const zenReport = snapshot(window, "tab"); check(zenReport.status === p.translator("support.copied"), "Zen command report failed"); c.cases.push({ name: c.phase, commandRoute: true, ...zenReport }); await close(window, win);
    await p.actionManager.dispatch({ id: "view.zen.toggle", source: "toolbar", surfaceId: id }); await until(/** Restore the original normal toolbar before measuring narrow native geometry. */ () => bug(c.main), "Zen restore failed");
    check(!win.webContents.debugger.isAttached(), "Another debugger owns native metrics"); win.webContents.debugger.attach("1.3"); c.debuggerOwned = true;
    try {
      await win.webContents.debugger.sendCommand("Emulation.setDeviceMetricsOverride", { width: 390, height: 780, deviceScaleFactor: 1, mobile: false }); await wait(250);
      current = await toolbar(c.main, win, "tab"); check(current.result.bounds.viewport === 390, "Narrow native viewport not applied"); c.cases.push({ name: "narrow-desktop-native-layout", viewport: 390, noOverflow: current.result.noOverflow, surface: "tab" }); await close(current.owner, win);
    } finally { await win.webContents.debugger.sendCommand("Emulation.clearDeviceMetricsOverride"); win.webContents.debugger.detach(); c.debuggerOwned = false; }
    c.sidebar = app.workspace.getRightLeaf(true); check(c.sidebar, "Native sidebar leaf unavailable"); c.leaves.push(c.sidebar); await c.sidebar.setViewState({ type: "k-plex-sidepanel-view", active: true }); await until(/** Sidebar readiness remains bounded even if the host never publishes a mounted surface. */ () => surfaceId(c.sidebar), "Sidebar native surface did not become ready"); app.workspace.rightSplit.expand();
    current = await toolbar(c.sidebar, win, "sidepanel"); check(current.result.environment.surfaceKind === "sidepanel", "Sidebar report surface owner misclassified"); await close(current.owner, win);
    c.popout = app.workspace.getLeaf("window"); c.leaves.push(c.popout); await c.popout.setViewState({ type: "k-plex-react-view", active: true }); await until(/** Poll the actual owned popout registration without retaining an uncancellable host readiness promise. */ () => surfaceId(c.popout), "Popout native surface did not become ready");
    const popup = remote.BrowserWindow.getAllWindows().filter(/** A pop-out input target must be newly test-created and belong to this exact disposable vault. */ item => !c.originalWindowIds.has(item.id) && item.getTitle().includes("kplex-test-small"));
    check(popup.length === 1, "Owned native popout window identity ambiguous"); c.popupWindow = popup[0];
    current = await toolbar(c.popout, c.popupWindow, "popout"); check(current.owner !== window && current.result.environment.surfaceKind === "popout", "Popout report owner or form classification failed"); await close(current.owner, c.popupWindow);
    await fitSettingsScenario();
    check(c.attempts.every(/** Every synchronous capture must prove zero side effects and unchanged semantic revision. */ attempt => Object.keys(attempt.effects).length === 0 && attempt.semanticUnchanged), "Support report performed guarded I/O, parsing, work or publication");
    check(c.attempts.every(/** Missing instrumentation cannot silently be reported as a verified parser-work guard. */ attempt => attempt.guardedApis.includes("body-parse/parse")), "Actual parser guard unavailable");
    return { cases: c.cases, closeChecks: c.closeChecks, synchronousCaptures: c.attempts, realClipboardWrites: c.realClipboardWrites, originalClipboardRestored: !c.realClipboardModified, rawConsoleCapture: "unsupported", passiveReportEffectChecks: "passed" };
  })().then(/** Keep the finite success result readable by the serial CLI without retaining live DOM in output. */ value => { c.value = value; c.done = true; }, /** Retain named failed prerequisites and completed cases; never convert a skipped surface into a pass. */ error => { c.error = String(error); c.done = true; });
  return JSON.stringify({ started: true });
}

let attempted = false, started = false;
try {
  assert.equal(cli("vault", "info=path"), target.vault, "CLI selected another vault");
  for (const name of ["main.js", "styles.css", "manifest.json"]) {
    const built = sha(readFileSync(join(root, "dist", name))), installed = sha(readFileSync(join(target.pluginDir, name)));
    report.artifacts[name] = { built, installed }; assert.equal(installed, built, "Installed artifact mismatch: " + name);
  }
  report.obsidian = cli("version"); cli("dev:errors", "clear"); attempted = true;
  report.start = evaluate(`(${probe.toString()})()`); started = true;
  const deadline = Date.now() + 180000;
  while (true) {
    await delay(250); const state = evaluate('JSON.stringify({done:window.__kplexSupportReport?.done,error:window.__kplexSupportReport?.error})');
    if (state.done) { report.result = evaluate('JSON.stringify(window.__kplexSupportReport.value??{cases:window.__kplexSupportReport.cases,closeChecks:window.__kplexSupportReport.closeChecks,attempts:window.__kplexSupportReport.attempts,focusFailure:window.__kplexSupportReport.focusFailure??null})'); if (state.error) throw Error(state.error); break; }
    if (Date.now() > deadline) throw Error("Native support report deadline");
  }
  const errors = cli("dev:errors"); if (errors && !/^No errors captured\.?$/i.test(errors)) throw Error("Native JavaScript errors: " + errors.slice(0, 1000));
  report.nativeErrorsClear = true; report.status = "passed";
} catch (error) { report.status = "failed"; report.error = String(error); }
finally {
  const cleanupErrors = [];
  if (attempted && !started) { try { started = evaluate("JSON.stringify(Boolean(window.__kplexSupportReport))"); } catch (error) { cleanupErrors.push("Partial controller inspection: " + String(error)); } }
  if (started) {
    try {
      evaluate(`(/** Cancel and release only this owned native controller, retaining finite teardown receipts. */ ()=>{const c=window.__kplexSupportReport;c.cancelled=true;c.cleanup=(/** Restore every native/configuration-facing owner even after scenario failure. */ async()=>{
        const errors=[],steps=[];
        /** Attempt every owned teardown even if an earlier resource fails. */
        const attempt=async(name,work)=>{try{await work();steps.push({name,status:'passed'});}catch(error){errors.push({name,error:String(error)});steps.push({name,status:'failed'});}};
        await attempt('finish-owned-task',/** Await cancellation observation before detaching any shared owner. */ async()=>{await c.task;});
        await attempt('owned-settings',/** Close only the native Settings shell opened by this driver after its scenario has retired. */ ()=>{if(c.ownsSettings){app.setting.close();c.ownsSettings=false;}});
        await attempt('owned-modal',/** Close this feature's actual native shells and retire their clipboard leases. */ ()=>{for(const [dialog] of [...c.p.actionDialogs])if(dialog.modalEl?.classList.contains('kplex-support-report-modal'))dialog.close();});
        await attempt('clipboard-descriptor',/** Restore the actual owning navigator descriptor, never an unrelated window. */ ()=>{c.clipUndo?.();c.clipUndo=null;});
        await attempt('original-native-clipboard',/** Retry restoration if the optional real clipboard case failed mid-scenario. */ ()=>{if(c.originalClipboard)c.restoreRealClipboard();});
        for(const [index,undo]of (c.scopeRestorers??[]).entries())await attempt('partial-sync-guard-'+index,undo);
        for(const [index,undo]of c.wrappers.reverse().entries())await attempt('scoped-wrapper-'+index,undo);
        await attempt('native-metrics',/** Release only the debugger ownership acquired by this test. */ async()=>{if(c.debuggerOwned&&c.win.webContents.debugger.isAttached()){await c.win.webContents.debugger.sendCommand('Emulation.clearDeviceMetricsOverride');c.win.webContents.debugger.detach();c.debuggerOwned=false;}});
        for(const [index,leaf]of c.leaves.slice().reverse().entries())await attempt('owned-leaf-'+index,/** Dispose only a test-created native leaf after restoring document-scoped wrappers. */ ()=>{if(leaf?.view.containerEl.isConnected)leaf.detach();});
        await attempt('owned-popout-window',/** A surviving test-created popout must close without touching original windows. */ ()=>{if(c.popupWindow&&!c.popupWindow.isDestroyed())c.popupWindow.close();});
        await attempt('settings-before-layout',/** Establish original preferences before restored native surfaces initialize. */ async()=>{Object.assign(c.p.settings,c.originalSettings);await c.p.saveSettings(false,false);await c.p.settingsWriteQueue;});
        await attempt('workspace-layout',/** Restore original serialized workspace ownership through the real native lifecycle. */ async()=>{await app.workspace.changeLayout(c.originalLayout);});
        await attempt('settings-after-layout',/** Await original preference persistence after native layout callbacks settle. */ async()=>{Object.assign(c.p.settings,c.originalSettings);await c.p.saveSettings(false,false);await c.p.settingsWriteQueue;});
        await attempt('native-window-bounds',/** Restore the exact disposable main window's original desktop geometry. */ ()=>{c.win.setBounds(c.originalBounds);});
        await attempt('sidebar-state',/** Preserve both original collapsed states independently of test-created sidebar leaves. */ ()=>{for(const side of ['left','right']){const split=app.workspace[side+'Split'];if(c.originalSidebarStates[side])split.collapse();else split.expand();}});
        await attempt('native-leaf-associations',/** Restore native linked/sidecar associations after layout replaces leaf instances. */ ()=>{
          /** Native layout restoration can replace objects; use the original serialized leaf id. */
          const rebind=old=>old?app.workspace.getLeavesOfType(old.getViewState().type).find(/** Identify the serialized original native leaf rather than selecting an arbitrary same-type surface. */ leaf=>leaf.id===old.id)??null:null;
          c.p.linkedDocumentLeaf=rebind(c.owners.linkedDocumentLeaf);c.p.lastDocumentLeaf=rebind(c.owners.lastDocumentLeaf);
          c.p.recentLeafHistory=c.owners.recentLeafHistory.map(rebind).filter(Boolean);c.p.sidecarLeaves.clear();
          for(const [oldHost,oldLeaf]of c.owners.sidecarLeaves){const host=rebind(oldHost),leaf=rebind(oldLeaf);if(host&&leaf)c.p.sidecarLeaves.set(host,leaf);}
        });
        await attempt('native-layout-settlement',/** Let test-triggered native workspace saves settle before exact outer configuration-byte restoration. */ async()=>{await new Promise(/** This finite cleanup timer is observed to completion and never becomes product scheduling. */ resolve=>window.setTimeout(resolve,500));});
        return{errors,steps,originalClipboardRestored:!c.realClipboardModified&&!c.originalClipboard,reportDialogsRemaining:[...c.p.actionDialogs].filter(/** Count only this feature's native dialogs without exposing unrelated dialog contents. */ ([dialog])=>dialog.modalEl?.classList.contains('kplex-support-report-modal')).length,settingsRestored:JSON.stringify(c.p.settings)===JSON.stringify(c.originalSettings),debuggerReleased:!c.debuggerOwned};
      })().then(/** Publish finite teardown receipts for the serial CLI reader. */ value=>{c.cleaned=value;},/** Keep teardown failure distinct from successful feature acceptance. */ error=>{c.cleanupError=String(error);});return JSON.stringify({cleanupStarted:true});})()`);
      const deadline = Date.now() + 90000;
      while (true) {
        await delay(250); const state = evaluate('JSON.stringify({cleaned:window.__kplexSupportReport?.cleaned,error:window.__kplexSupportReport?.cleanupError})');
        if (state.error) throw Error(state.error); if (state.cleaned) { report.cleanup = state.cleaned; break; } if (Date.now() > deadline) throw Error("Native support cleanup deadline");
      }
      for (const failure of report.cleanup.errors) cleanupErrors.push(failure.name + ": " + failure.error);
      if (report.cleanup.reportDialogsRemaining || !report.cleanup.settingsRestored || !report.cleanup.debuggerReleased || !report.cleanup.originalClipboardRestored) cleanupErrors.push("Native cleanup assertions failed");
      evaluate("(/** Drop every private clipboard, DOM and plugin capture after restoration finishes. */ ()=>{delete window.__kplexSupportReport;return JSON.stringify({removed:true});})()");
    } catch (error) { cleanupErrors.push("Native teardown: " + String(error)); }
  }
  if (attempted) for (const backup of backups) {
    try {
      const path = join(target.config, backup.name);
      if (backup.bytes === null) { if (existsSync(path)) rmSync(path); } else writeFileSync(path, backup.bytes);
      if (backup.bytes === null ? existsSync(path) : !readFileSync(path).equals(backup.bytes)) throw Error("Configuration bytes differ");
    } catch (error) { cleanupErrors.push("Configuration " + backup.name + ": " + String(error)); }
  }
  report.configurationRestored = attempted && !cleanupErrors.some(/** Identify byte restoration separately from other native teardown outcomes. */ error => error.startsWith("Configuration "));
  if (cleanupErrors.length) { report.status = "failed"; report.cleanupError = cleanupErrors.join("\n"); }
  report.completedAt = new Date().toISOString(); writeFileSync(join(out, "report.json"), JSON.stringify(report, null, 2));
}
console.log(JSON.stringify({ status: report.status, error: report.error, cleanupError: report.cleanupError, cases: report.result?.cases?.length, report: join(out, "report.json") }));
if (report.status !== "passed") process.exitCode = 1;
