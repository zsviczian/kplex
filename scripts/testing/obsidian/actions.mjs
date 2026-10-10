/**
 * Serial exact-build native action/composer regression driver for an explicit disposable vault.
 * Owns one fixture folder, temporary wrappers and configuration restoration. Synthetic DOM keys
 * establish host delivery/control behavior, not trusted OS input or physical-device acceptance.
 * Native settings assert row-local scope and separately retained command/global-key state.
 */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { arch, cpus, platform, totalmem } from "node:os";
import { buildSync } from "esbuild";
import { validateTarget } from "./runner.mjs";

const root = resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const catalogBundle = buildSync({ stdin: { contents: 'export { ACTION_CATALOG } from "./src/core/plex/actions"; export { ACTION_BINDING_DEFAULTS } from "./src/core/plex/actionPreferences";', resolveDir: root }, bundle: true, platform: "node", format: "cjs", write: false });
const catalogModule = { exports: {} };
Function("module", catalogBundle.outputFiles[0].text)(catalogModule);
const catalogActionIds = catalogModule.exports.ACTION_CATALOG.map(action => action.id);
const defaultActionBindings = catalogModule.exports.ACTION_BINDING_DEFAULTS;
const publishableActions = catalogModule.exports.ACTION_CATALOG.filter(action => action.command).map(action => ({ id: action.id, commandId: action.command.id }));
const vaultName = process.env.KPLEX_TEST_VAULT_NAME;
const target = validateTarget({ vaultName, vaultPath: process.env.KPLEX_TEST_VAULT_PATH, configDir: process.env.KPLEX_TEST_CONFIG_DIR });
const output = process.env.KPLEX_HOST_REPORT_DIR;
const nativeOSKeys = process.env.KPLEX_ACTION_NATIVE_OS_KEYS === "true";
const recorderOSKeys = process.env.KPLEX_ACTION_RECORDER_OS_KEYS === "true";
const diagnosticH13Only = process.env.KPLEX_ACTION_DIAGNOSTIC_H13_ONLY === "true";
if (!output) throw new Error("Set KPLEX_HOST_REPORT_DIR explicitly");
mkdirSync(output, { recursive: true });
const driverSource = readFileSync(fileURLToPath(import.meta.url));
writeFileSync(join(output, "driver-source.mjs"), driverSource);
const settingsPath = join(target.pluginDir, "data.json"), enabledPath = join(target.config, "community-plugins.json");
const settingsBytes = readFileSync(settingsPath), enabledBytes = readFileSync(enabledPath);
const hotkeysPath = join(target.config, "hotkeys.json"), hotkeysBytes = existsSync(hotkeysPath) ? readFileSync(hotkeysPath) : null;
const companionPath = join(target.config, "plugins", "obsidian-excalidraw-plugin", "data.json"), companionBytes = existsSync(companionPath) ? readFileSync(companionPath) : null;
const report = { status: "running", diagnosticOnly: diagnosticH13Only, acceptance: !diagnosticH13Only, startedAt: new Date().toISOString(), node: process.version, clipboardKeyTransport: nativeOSKeys ? "OS_CUA" : "Electron_sendInputEvent", recorderKeyTransport:recorderOSKeys ? "OS_CUA" : "Electron_sendInputEvent", externalOSKeyArrivalTimeoutMs: nativeOSKeys || recorderOSKeys ? 60000 : null, pluginBehaviorTimeoutMs: 15000, hardware: { platform: platform(), arch: arch(), cpuModel: cpus()[0]?.model, cpuCount: cpus().length, memoryGiB: totalmem() / 2 ** 30 }, priorAcceptanceDriverSha256: "ff30d52fc18d721d8da0cb4e72ea3a314fc54136bd09c8b5f191b79865226b43", driverSha256: createHash("sha256").update(driverSource).digest("hex"), artifacts: {},
  limitations: ["Electron trusted native key delivery asserted separately from synthetic DOM protocol probes; no physical keyboard, screen reader or physical touch/tablet/IME acceptance",
    "Pop-out ownership/migration tested through native leaves and DOM session input; trusted cross-window OS key delivery remains separate",
    "Optional OS_CUA clipboard accelerators require separately delivered OS automation and exact trusted DOM key provenance; this is not physical-keyboard acceptance"] };
let installed = false;

/** Fail closed on process errors and Obsidian's error text even when the CLI exits zero. */
function cli(command, ...args) {
  const result = spawnSync(process.env.KPLEX_OBSIDIAN_CLI || "obsidian", [`vault=${vaultName}`, command, ...args], { encoding: "utf8", timeout: 30000, killSignal: "SIGKILL", maxBuffer: 4 * 1024 * 1024 });
  if (result.error || result.status !== 0 || /^Error:/m.test(result.stdout)) throw new Error(result.error?.message || result.stderr || result.stdout);
  return result.stdout.trim();
}

/** Decode bounded controller responses; native asynchronous work runs after the initial eval returns. */
function evaluate(code) { const text = cli("eval", `code=${code}`); return JSON.parse(text.slice(text.indexOf("{"))); }

/** Yield only the driver between bounded polls, leaving renderer scheduling and throttling unchanged. */
function wait(milliseconds) { return new Promise(resolve => setTimeout(resolve, milliseconds)); }

/** Install the bounded maintenance controller in the CLI-selected native renderer. */
function nativeActionProbe(publishableActions, nativeOSKeys, diagnosticH13Only, catalogActionIds, defaultActionBindings, recorderOSKeys) {
  if (window.__kplexActionTest) throw new Error("Action controller already exists");
  const p = app.plugins.plugins["k-plex"];
  if (!p?.actionManager) throw new Error("Exact action-manager plugin is not loaded");
  const remote = require("@electron/remote"), nativeWindow = remote.getCurrentWindow();
  remote.app.show(); remote.app.focus({ steal: true }); nativeWindow.restore(); nativeWindow.show(); nativeWindow.moveTop(); nativeWindow.focus(); nativeWindow.webContents.focus();
  const c = window.__kplexActionTest = { p, originalSettings: JSON.parse(JSON.stringify(p.settings)), folder: `Kplex-Action-Regression-${Date.now()}`,
    owned: [], created: [], wrappers: [], newLeaves: [], scenarios: [], done: false, cancelled: false };
  /** The controller owns every native fixture and async wrapper until the driver restores them. */
  const run = async () => {
    /** Keep assertion failures named; timing records API/DOM completion, never actual paint. */
    const check = (condition, message) => { if (!condition) throw new Error(message); };
    /** Yield to native metadata/React work without installing permanent polling resources. */
    const delay = milliseconds => new Promise(resolve => window.setTimeout(resolve, milliseconds));
    /** Wait for actual observed completion and honor controller cancellation on every poll. */
    const until = async (predicate, message, timeout = 15000, allowCancelled = false) => {
      const end = Date.now() + timeout;
      while (!predicate()) { check(allowCancelled || !c.cancelled, "Controller cancelled"); check(Date.now() < end, message); await delay(25); }
    };
    /** Report one bounded result only after every scenario assertion succeeds. */
    const scenario = async (id, action) => {
      if (diagnosticH13Only && id !== "H13-native-preview-and-drawing-editor-focus") return;
      check(!c.cancelled, "Controller cancelled"); c.currentScenario = id; const start = performance.now(); await action();
      c.scenarios.push({ id, status: "passed", elapsedMs: performance.now() - start, hidden: document.hidden, focused: nativeWindow.isFocused() });
    };
    /** Wrap one existing operation and retain the exact implementation for independent cleanup. */
    const wrap = (owner, key, replacement) => { const original = owner[key]; owner[key] = replacement(original); c.wrappers.push(() => { owner[key] = original; }); return original; };
    /** Capture all newly created physical notes, including partial writer outcomes. */
    wrap(p, "createNewRelatedFileForOrigin", original => async function (...args) {
      const record = { operation: "create", startedAt: performance.now() }; (c.writerEvents ??= []).push(record);
      try { const file = await original.apply(this, args); record.phase = file ? "created" : "unavailable"; if (file) { c.created.push(file); c.owned.push(file.path); } return file; }
      catch (error) { record.phase = "failed"; record.error = String(error); if (error?.file) { c.created.push(error.file); c.owned.push(error.file.path); } throw error; }
    });
    /** Observe canonical writer phases without changing durable ownership or operation sequencing. */
    for (const operation of ["rememberRelationshipOntology", "linkNewRelatedFile", "finishNewRelatedNode"]) wrap(p, operation, original => async function (...args) {
      const record = { operation, startedAt: performance.now() }; (c.writerEvents ??= []).push(record);
      const sessionFacts = () => { const dialog = c.ownedComposerDialog; return dialog ? { opened: dialog.opened, invalidated: dialog.invalidated, completing: dialog.completing, current: dialog.invocation?.current?.() } : null; };
      if (operation === "finishNewRelatedNode") record.sessionBefore = sessionFacts();
      try { const result = await original.apply(this, args); record.phase = "completed"; if (operation === "finishNewRelatedNode") record.sessionAfter = sessionFacts(); return result; }
      catch (error) { record.phase = "failed"; record.error = String(error); throw error; }
    });
    /** Read only the explicitly owned composer rather than an arbitrary active modal. */
    const composer = () => document.querySelector(".kplex-add-related-modal");
    /** Close only a test-opened composer, preserving unrelated native modal ownership. */
    const closeComposer = async () => {
      const modal = composer(); if (!modal || modal !== c.ownedComposer) return;
      const dialog = [...c.p.actionDialogs.keys()].find(item => item.modalEl === modal) ?? (c.ownedComposerDialog?.modalEl === modal ? c.ownedComposerDialog : null);
      check(Boolean(dialog), "Owned composer native identity missing");
      dialog.close(); await until(() => !modal.isConnected, "Owned composer did not close", 15000, true); c.ownedComposer = null; c.ownedComposerDialog = null;
    };
    c.closeComposer = closeComposer;
    /** Close only the Settings window opened by this probe; native row teardown owns its controller resources. */
    c.closeSettings = async () => {
      if (!c.ownedNativeSettings) return;
      const page = c.ownedSettings;
      const settingsWindow = app.setting.win ?? page?.ownerDocument.defaultView;
      const settingsOwnerId = settingsWindow ? nativeOwnerForDocument(settingsWindow.document).id : null;
      c.captureWindowLifecycle?.("before-owned-Settings-close");
      app.setting.close();
      await until(() => !page?.isConnected || !page.getClientRects().length, "Owned inline action Settings did not close", 15000, true);
      c.captureWindowLifecycle?.("after-owned-Settings-close");
      if (settingsWindow && settingsOwnerId !== null && settingsWindow !== window) await until(() => settingsWindow.closed && !remote.BrowserWindow.fromId(settingsOwnerId), "Owned native Settings window did not finish closing", 15000, true);
      // Obsidian can retain its closed Settings activeWindow until an actual main-window pointer
      // event. Restore through the exact owned graph's native input, never by assigning host globals.
      {
        let mainLeaf;
        await until(() => {
          const candidates = [c.hostLeaf, ...app.workspace.getLeavesOfType("k-plex-react-view")];
          mainLeaf = candidates.find(leaf => leaf?.view.containerEl.ownerDocument === document && leaf.view.containerEl.isConnected && c.p.isKplexLeafVisible(leaf) && leaf.view.containerEl.querySelector(".kplex-app input.kplex-search"));
          return Boolean(mainLeaf);
        }, "Existing main graph missing after native Settings close", 15000, true);
        await app.workspace.revealLeaf(mainLeaf); app.workspace.setActiveLeaf(mainLeaf, {focus:true});
        const root = mainLeaf.view.containerEl.querySelector(".kplex-app");
        const search = root?.querySelector('input[aria-label="'+c.p.translator("search.ariaLabel")+'"]');
        check(Boolean(search), "Owned main graph search input missing after Settings close");
        await trustedClick(search, true); root.focus();
        await until(() => window.activeWindow === window && window.activeDocument === document && document.hasFocus() && document.activeElement === root, "Native Settings cleanup did not restore exact main host ownership and graph focus", 15000, true);
        c.captureWindowLifecycle?.("after-trusted-main-pointer-restoration");
      }
      c.ownedSettings = null; c.ownedNativeSettings = false;
    };
    const observedWindows = new Map();
    /** Read scalar native ownership facts without changing focus, window APIs or host error handling. */
    const windowFacts = entry => {
      const read = getter => { try { return getter(); } catch { return "unavailable"; } };
      const ownerWindow = entry.doc.defaultView;
      return { kind: entry.kind, closed: read(() => ownerWindow.closed), documentFocused: read(() => entry.doc.hasFocus()), hidden: read(() => entry.doc.hidden),
        isHostActiveWindow: read(() => window.activeWindow === ownerWindow), isHostActiveDocument: read(() => window.activeDocument === entry.doc),
        frameWindowMatches: read(() => ownerWindow.frameDom?.win === ownerWindow), frameElectronWindowMatches: read(() => ownerWindow.frameDom?.eWin === ownerWindow.electronWindow),
        frameNativeId: read(() => ownerWindow.frameDom?.eWin?.id ?? null), frameWebContentsId: read(() => ownerWindow.frameDom?.eWin?.webContents?.id ?? null),
        frameZoomMethod: read(() => typeof ownerWindow.frameDom?.eWin?.webContents?.getZoomFactor),
        nativeId: read(() => entry.owner?.id ?? null), nativeDestroyed: read(() => entry.owner?.isDestroyed() ?? null) };
    };
    /** Keep a finite passive timeline across plugin restarts; no vault content or window titles are retained. */
    const captureWindowLifecycle = (phase, error) => {
      const trace = c.windowLifecycle ??= [];
      if (trace.length >= 200) { c.windowLifecycleDropped = (c.windowLifecycleDropped ?? 0) + 1; return; }
      trace.push({ phase, time: performance.now(), scenario: c.currentScenario, ...(error ? { error } : {}),
        activeWindowIsMain: window.activeWindow === window, activeDocumentIsMain: window.activeDocument === document,
        activeWindowClosed: window.activeWindow?.closed, windows: [...observedWindows.values()].map(windowFacts) });
    };
    c.captureWindowLifecycle = captureWindowLifecycle;
    /** Observe only the main and exact test-owned native documents, leaving errors unsuppressed. */
    const observeNativeWindow = (doc, kind) => {
      if (observedWindows.has(doc)) return;
      const ownerWindow = doc.defaultView;
      let owner;
      try { owner = ownerWindow.require("@electron/remote").getCurrentWindow(); } catch {}
      const onError = event => {
        if (!String(event.message).includes("getZoomFactor")) return;
        captureWindowLifecycle("native-window-error", { kind, message: event.message, filename: event.filename, line: event.lineno, column: event.colno });
      };
      ownerWindow.addEventListener("error", onError);
      observedWindows.set(doc, { doc, owner, kind, release: () => ownerWindow.removeEventListener("error", onError) });
      captureWindowLifecycle("observe-"+kind);
    };
    c.releaseWindowObservations = () => { for (const entry of observedWindows.values()) { try { entry.release(); } catch {} } observedWindows.clear(); };
    observeNativeWindow(document, "main");
    /** React controlled inputs require the native prototype setter followed by a bubbling input event. */
    const input = (element, value) => {
      check(Boolean(element), "Missing owned input"); const owner = element.ownerDocument.defaultView;
      Object.getOwnPropertyDescriptor(owner.HTMLInputElement.prototype, "value").set.call(element, value);
      element.dispatchEvent(new owner.Event("input", { bubbles: true }));
    };
    /** Completion choices remain normal native selectors rather than private React state writes. */
    const completion = intent => {
      const element = [...composer().querySelectorAll("select")].find(select => select.getAttribute("aria-label") === p.translator("addRelated.completionMode"));
      check(Boolean(element), "Completion selector missing"); element.value = intent; element.dispatchEvent(new element.ownerDocument.defaultView.Event("change", { bubbles: true }));
    };
    /** Dispatch native DOM key events with actual macOS modifier conventions and optional repeat/composition state. */
    const key = (element, name, options = {}) => element.dispatchEvent(new element.ownerDocument.defaultView.KeyboardEvent("keydown", { key: name, code: name, bubbles: true, cancelable: true, ...options }));
    /** Deliver trusted Electron input; explicit Option probes verify physical code/modifiers despite native glyph differences.
     * @remarks API reference: https://www.electronjs.org/docs/latest/api/web-contents#contentssendinputeventinputevent
     */
    const trustedKey = async (keyCode, modifiers = [], owner = nativeWindow, doc = document, physicalCode) => {
      check(typeof owner.webContents.sendInputEvent === "function", "Native trusted keyboard input unavailable");
      let observed, observedEvent;
      const expected = ({ Down: "ArrowDown", Up: "ArrowUp", Left: "ArrowLeft", Right: "ArrowRight" })[keyCode] ?? keyCode;
      const observe = event => { if (physicalCode ? modifiers.includes("alt") && event.altKey && event.code === physicalCode && event.shiftKey === modifiers.includes("shift") && !event.ctrlKey && !event.metaKey : event.key.toLocaleLowerCase() === expected.toLocaleLowerCase()) { observedEvent = event; observed = { key: event.key, code: event.code, ctrl: event.ctrlKey, meta: event.metaKey, alt: event.altKey, shift: event.shiftKey, composing: event.isComposing, altGraph: event.getModifierState("AltGraph"), trusted: event.isTrusted, target: event.target?.className }; c.lastTrustedKey = observed; } };
      const eventWindow = doc.defaultView; check(Boolean(eventWindow), "Native key owner window missing");
      eventWindow.addEventListener("keydown", observe, true);
      try {
        owner.focus(); owner.webContents.focus();
        await until(() => remote.powerMonitor.getSystemIdleState(10) !== "locked" && owner.isFocused() && doc.hasFocus() && !doc.hidden, "Trusted key lost actual unlocked native foreground", 5000);
        owner.webContents.sendInputEvent({ type: "keyDown", keyCode, modifiers });
        await until(() => observed, "Native keydown not delivered"); check(observed.trusted, "Electron key was not trusted native input");
        if (physicalCode) { check(observed.code === physicalCode && observed.alt && observed.shift === modifiers.includes("shift") && !observed.ctrl && !observed.meta, "Native Option shortcut did not match its physical code and exact modifiers"); (c.optionKeyReceipts ??= []).push({...observed}); }
        // Electron keyDown is a raw key transport. Native Enter/button activation and printable
        // editing additionally need the physical keyboard's char stage when keydown permits it.
        if (!observedEvent.defaultPrevented && !modifiers.some(modifier => ["meta", "control", "ctrl", "alt"].includes(modifier)) && (keyCode === "Enter" || keyCode.length === 1)) {
          owner.webContents.sendInputEvent({ type: "char", keyCode: keyCode === "Enter" ? "\r" : keyCode, modifiers });
          c.trustedCharEvents = (c.trustedCharEvents ?? 0) + 1;
        }
        owner.webContents.sendInputEvent({ type: "keyUp", keyCode, modifiers });
        c.trustedKeys = (c.trustedKeys ?? 0) + 1;
        await delay(25);
        observed.defaultPrevented = observedEvent.defaultPrevented;
      } finally { eventWindow.removeEventListener("keydown", observe, true); }
    };
    /** Request only owned-editor OS clipboard accelerators, separating capped external arrival from native behavior deadlines. */
    const clipboardKey = async (keyCode, expectedLeaf, expectedElement) => {
      if (!nativeOSKeys) return trustedKey(keyCode, ["meta"]);
      check(["v", "a", "c", "z"].includes(keyCode), "Unsupported OS clipboard key request");
      const path = expectedLeaf?.view.file?.path;
      check(typeof path === "string" && path.startsWith(c.folder + "/") && c.owned.includes(path), "OS clipboard key escaped an owned fixture");
      /** Native keyboard input must remain on the exact captured fixture editor, independent of workspace visibility. */
      const actualNativeFocus = () => document.activeElement === expectedElement && app.workspace.activeLeaf === expectedLeaf && expectedLeaf.view.containerEl.contains(expectedElement)
        && nativeWindow.isFocused() && document.hasFocus() && !document.hidden;
      await until(() => remote.powerMonitor.getSystemIdleState(10) !== "locked" && nativeWindow.isFocused() && document.hasFocus() && !document.hidden && actualNativeFocus(), "OS clipboard request lacks unlocked exact native editor focus", 5000);
      let observed, observedEvent, requestedAt;
      const request = { nonce: c.osKeyNonce = (c.osKeyNonce ?? 0) + 1, key: `super+${keyCode}`, expectedFixturePath: path,
        activeViewType: expectedLeaf.view.getViewType(), actualNativeFocus: actualNativeFocus(), window: { id: nativeWindow.id, title: nativeWindow.getTitle() }, transport: "OS_CUA", requestedAtEpoch: Date.now(), expiresAtEpoch: Date.now()+60000, externalArrivalTimeoutMs: 60000, behaviorTimeoutMs: 15000 };
      /** Accept only the current requested trusted chord on its exact native editor; no acknowledgement alone completes a request. */
      const observe = event => {
        if (c.osKeyRequest !== request || event.key.toLocaleLowerCase() !== keyCode || !event.metaKey || event.ctrlKey || event.altKey || event.shiftKey || event.repeat
          || event.isComposing || event.getModifierState("AltGraph") || !event.isTrusted || event.target !== expectedElement || !actualNativeFocus() || remote.powerMonitor.getSystemIdleState(10) === "locked") return;
        observedEvent = event; observed = { transport: "OS_CUA", externalArrivalMs: performance.now() - requestedAt, key: event.key, code: event.code, ctrl: event.ctrlKey, meta: event.metaKey, alt: event.altKey,
          shift: event.shiftKey, composing: event.isComposing, altGraph: event.getModifierState("AltGraph"), trusted: event.isTrusted, target: event.target.className };
        c.lastTrustedKey = observed;
      };
      window.addEventListener("keydown", observe, true);
      const release = () => window.removeEventListener("keydown", observe, true);
      c.releaseOSKeyListener = release;
      c.clearOSKeyRequest = () => { c.osKeyRequest = null; c.releaseOSKeyListener?.(); c.releaseOSKeyListener = null; };
      requestedAt = performance.now(); c.osKeyRequest = request;
      try {
        // External operator/tool arrival is separate from the unchanged 15-second native behavior assertions.
        await until(() => observed, "Requested OS_CUA clipboard chord did not deliver exact trusted native keydown", 60000);
        observed.defaultPrevented = observedEvent.defaultPrevented;
        (c.osKeyProofs ??= []).push({ ...request, event: { ...observed } }); c.trustedOSKeys = (c.trustedOSKeys ?? 0) + 1;
      } finally {
        release(); if (c.releaseOSKeyListener === release) c.releaseOSKeyListener = null;
        if (c.osKeyRequest === request) c.osKeyRequest = null;
      }
    };

    /** Submit through the visible button using labeled DOM protocol; trusted pointer parity is separate. */
    const submit = () => {
      const button = composer()?.querySelector('button[data-kplex-primary-action="true"]');
      check(Boolean(button) && !button.disabled, "Primary submit unavailable"); button.click();
    };
    /** Resolve the actual BrowserWindow from the target document's Electron realm, never from an unrelated main window. */
    const nativeOwnerForDocument = doc => {
      const targetWindow = doc.defaultView;
      check(typeof targetWindow?.require === "function", "Target document has no native Electron realm");
      const owner = targetWindow.require("@electron/remote").getCurrentWindow();
      check(owner && typeof owner.webContents?.sendInputEvent === "function", "Target document native input owner unavailable");
      return owner;
    };
    /** Deliver exact trusted input; owned cleanup may finish restoration after controller cancellation. */
    const trustedClick = async (element, allowCancelled = false) => {
      const doc = element.ownerDocument, owner = nativeOwnerForDocument(doc);
      /** Record only native foreground and document ownership facts when pointer setup or delivery fails. */
      const captureForeground = phase => {
        (c.pointerForegroundTrace ??= []).push({ phase, scenario: c.currentScenario,
          idle: remote.powerMonitor.getSystemIdleState(10), nativeWindowFocused: owner.isFocused(),
          nativeWindowId: owner.id, webContentsId: owner.webContents.id, inputOwnerIsMain: owner.id === nativeWindow.id,
          webContentsFocused: owner.webContents.isFocused(), documentFocused: doc.hasFocus(), hidden: doc.hidden,
          targetDocumentIsMain: doc === document, targetOwnerWindowIsMain: doc.defaultView === window, targetConnected: element.isConnected });
      };
      captureForeground("before-activation");
      // Native plugin restart/popout closure can release foreground without changing the main-window pointer target.
      remote.app.show(); remote.app.focus({ steal: true }); owner.restore(); owner.show(); owner.moveTop(); owner.focus(); owner.webContents.focus();
      try {
        await until(() => remote.powerMonitor.getSystemIdleState(10) !== "locked" && owner.isFocused() && doc.hasFocus() && !doc.hidden, "Trusted pointer lost actual unlocked native foreground", 5000, allowCancelled);
      } catch (error) { captureForeground("foreground-failed"); throw error; }
      captureForeground("foreground-ready");
      const rect = element.getBoundingClientRect(), x = Math.round(rect.left + rect.width / 2), y = Math.round(rect.top + rect.height / 2);
      check(rect.width > 0 && rect.height > 0 && element.contains(doc.elementFromPoint(x, y)), "Native pointer target is not visible and unobscured");
      let observed;
      const observe = event => {
        (c.pointerDeliveries ??= []).push({scenario:c.currentScenario,x:event.clientX,y:event.clientY,targetClass:event.target?.className,targetConnected:element.isConnected,expectedClass:element.className});
        if (element.contains(event.target)) observed = { trusted: event.isTrusted };
      };
      doc.defaultView.addEventListener("click", observe, true);
      try {
        owner.webContents.sendInputEvent({ type: "mouseMove", x, y });
        owner.webContents.sendInputEvent({ type: "mouseDown", x, y, button: "left", clickCount: 1 });
        owner.webContents.sendInputEvent({ type: "mouseUp", x, y, button: "left", clickCount: 1 });
        await until(() => observed, "Native pointer click not delivered", 15000, allowCancelled);
        check(observed.trusted, "Electron pointer click was not trusted input"); c.trustedClicks = (c.trustedClicks ?? 0) + 1;
      } finally { doc.defaultView.removeEventListener("click", observe, true); }
    };
    /** Insert localized text through the exact focused native field and verify trusted Chromium input receipt. */
    const insertNativeText = async (field, text, owner, doc, name) => {
      check(field.isConnected && field.ownerDocument === doc, name+" field escaped its native document");
      await until(() => remote.powerMonitor.getSystemIdleState(10) !== "locked" && owner.isFocused() && doc.hasFocus() && !doc.hidden && doc.activeElement === field, name+" lost unlocked native field focus", 5000);
      let observed;
      const observe = event => { if (event.target === field) observed = { trusted: event.isTrusted }; };
      field.addEventListener("input", observe, true);
      try {
        check(typeof owner.webContents.insertText === "function", "Native Chromium text input API unavailable");
        await owner.webContents.insertText(text);
        await until(() => observed && field.value === text, name+" was not entered through native Chromium input");
        check(observed.trusted, name+" input event was not trusted");
        c.trustedTextInputs = (c.trustedTextInputs ?? 0) + 1;
      } finally { field.removeEventListener("input", observe, true); }
    };
    /** Verify native suggestion anatomy and fixed search while only the owned result pane scrolls. */
    const paletteGeometry = async (shell, selector, name) => {
      const doc = shell.ownerDocument, ownerWindow = doc.defaultView, field = shell.querySelector("input"), results = shell.querySelector(selector);
      check(field && results, name+" native search/results missing");
      await until(() => results.clientHeight > 0 && results.scrollHeight > results.clientHeight && field.getBoundingClientRect().height > 0, name+" native results did not become scrollable");
      const rows = [...results.querySelectorAll(".suggestion-item")];
      check(rows.length > 0 && rows.every(row => row.classList.contains("mod-complex") && row.querySelector(".suggestion-content .suggestion-title") && row.querySelector(".suggestion-note") && row.querySelector(".suggestion-aux")), name+" native complex-row anatomy missing");
      const before = field.getBoundingClientRect(), outerTop = shell.scrollTop;
      const footer = shell.querySelector(".kplex-keyboard-help-footer"), footerTop = footer?.getBoundingClientRect().top;
      check(shell.scrollHeight<=shell.clientHeight+2 || ownerWindow.getComputedStyle(shell).overflowY==="hidden", name+" outer modal can scroll its search out of view");
      check(rows.every(row => {const content=row.querySelector(".suggestion-content").getBoundingClientRect(), auxiliary=row.querySelector(".suggestion-aux").getBoundingClientRect();return auxiliary.left>=content.right-1;}), name+" shortcut auxiliary area is not right-aligned beside content");
      results.scrollTop = results.scrollHeight; await delay(50);
      const after = field.getBoundingClientRect(), shellBounds = shell.getBoundingClientRect();
      check(results.scrollTop > 0 && Math.abs(after.top-before.top)<1 && Math.abs(after.bottom-before.bottom)<1 && shell.scrollTop===outerTop, name+" search moved while results scrolled");
      if(footer)check(Math.abs(footer.getBoundingClientRect().top-footerTop)<1,"Keyboard reference footer moved while results scrolled");
      check(after.top>=0 && after.bottom<=ownerWindow.innerHeight && shellBounds.left>=-1 && shellBounds.right<=ownerWindow.innerWidth+1 && results.scrollWidth<=results.clientWidth+2, name+" search/results clipped at actual viewport");
      const chips=[...results.querySelectorAll(".setting-hotkey")];
      check(chips.length > 0 && chips.every(chip => chip.closest(".suggestion-aux")), name+" shortcut chips are not in the right auxiliary column");
      const value={viewport:[ownerWindow.innerWidth,ownerWindow.innerHeight],rows:rows.length,scrollTop:results.scrollTop,searchTop:after.top,searchBottom:after.bottom,horizontalFit:true,nativeComplexRows:true,rightShortcutChips:true};
      results.scrollTop=0; return value;
    };
    /** Freeze current center before launching a command; external editor focus cannot change this origin. */
    const center = async path => {
      p.notifyNavigation(path);
      await until(() => p.settings.lastActivePath === path && c.hostLeaf?.view.containerEl.querySelector(".kplex-role-center")?.dataset.kplexPath === path, "Expected owned center not rendered");
    };
    /** Wait for the owned existing composer and its real React name field before interacting. */
    const awaitComposer = async () => { await until(() => composer()?.querySelector(".kplex-add-related-note-search input"), "Composer not mounted"); c.ownedComposer = composer(); c.ownedComposerDialog = [...c.p.actionDialogs.keys()].find(item => item.modalEl === c.ownedComposer) ?? c.ownedComposerDialog;
      await until(() => c.ownedComposerDialog?.modalEl === c.ownedComposer && Boolean(c.ownedComposerDialog.submitCallback), "Composer semantic callback not installed"); return c.ownedComposer; };
    /** Wait for the exact new name render's callback and enabled primary before invoking any transport. */
    const enterComposerName = async value => {
      const modal = c.ownedComposer, dialog = c.ownedComposerDialog, previousSubmit = dialog.submitCallback;
      const element = modal.querySelector(".kplex-add-related-note-search input"); input(element, value);
      await until(() => element.value === value && !element.disabled && !modal.querySelector('button[data-kplex-primary-action="true"]').disabled && dialog.submitCallback !== previousSubmit, "Composer name and semantic callback not committed"); return element;
    };
    /** Use the actual published native command callback, not a parallel creation implementation. */
    const command = id => { check(app.commands.executeCommandById(`k-plex:${id}`), `Published command failed: ${id}`); };
    /** Create a test-only note through the canonical Vault API and retain cleanup ownership immediately. */
    const create = async (name, body) => { const file = await app.vault.create(`${c.folder}/${name}.md`, body ?? `# ${name}\n`); c.owned.push(file.path); return file; };
    // macOS can retain DOM/native focus flags after automatic lock; lock state is an independent gate.
    await until(() => remote.powerMonitor.getSystemIdleState(10) !== "locked" && !document.hidden && document.hasFocus() && nativeWindow.isFocused(), "Unlocked native foreground required", 5000);
    check(!composer(), "Unowned composer already present before native regression");
    await until(() => !p.index.building && !p.index.hasPendingSnapshotHydration(), "Initial small-vault settle", 90000);
    check(!app.vault.getFolderByPath(c.folder), "Fixture already exists"); await app.vault.createFolder(c.folder); c.owned.push(c.folder);
    c.a = await create("Origin-A"); c.b = await create("Editor-B"); c.target = await create("Target-C");
    await until(() => [c.a, c.b, c.target].every(file => app.metadataCache.getFileCache(file)), "Fixture metadata not ready");
    Object.assign(p.settings, { documentSyncMode: "off", sidecarOpen: false, followActiveFile: false, autoOpenCentralDocument: false, embedCentralNode: false, centralNodeMarkdownMode: "source", editNewNodeAfterCreate: false, newNodeDefaultType: "markdown" });
    for (const file of [c.a, c.b, c.target]) p.index.insertCreatedFile(file);
    await p.index.publishHostMetadataPreview(c.a.path);
    c.hostLeaf = app.workspace.getLeaf("tab"); c.newLeaves.push(c.hostLeaf);
    await c.hostLeaf.setViewState({ type: "k-plex-react-view", active: true }); await app.workspace.revealLeaf(c.hostLeaf);
    // Native setViewState returns before React effects install navigation and action subscriptions.
    await c.hostLeaf.view.waitUntilReady(); await center(c.a.path);
    await until(() => [...p.actionSurfaceHosts].some(([, registration]) => registration.leaf === c.hostLeaf && registration.leaf.view.containerEl.querySelector(".kplex-app")), "Owned action surface not registered");
    const surfaceEntry = [...p.actionSurfaceHosts].find(([, registration]) => registration.leaf === c.hostLeaf);
    check(Boolean(surfaceEntry), "Main-window action surface unavailable"); c.surfaceId = surfaceEntry[0]; c.hostLeaf = surfaceEntry[1].leaf;
    c.editorLeaf = app.workspace.getLeaf("tab"); await c.editorLeaf.openFile(c.b); app.workspace.setActiveLeaf(c.editorLeaf, { focus: true });

    // These transport cases intentionally exercise preserved user-assigned named keys.
    const transportPreferences = JSON.parse(JSON.stringify(p.settings.actionPreferences));
    transportPreferences.localBindings["keyboard.help"] = [{match:"key",value:"F1",modifiers:[]}];
    transportPreferences.localBindings["editor.focus"] = [{match:"key",value:"F3",modifiers:["shift"]}];
    transportPreferences.localBindings["search.focus"] = [{match:"key",value:"F4",modifiers:[]}];
    await p.updateActionPreferences(transportPreferences);

    await scenario("H14-H16-native-control-and-local-global-same-chord", async () => {
      const preference = JSON.parse(JSON.stringify(p.settings.actionPreferences));
      const changed = JSON.parse(JSON.stringify(preference));
      changed.localBindings["pin.toggle"] = [{ match: "key", value: "F9", modifiers: ["mod", "shift"] }];
      // Preserve the old named-key transport cases as explicit custom fixtures; laptop defaults
      // receive a separate fresh-default native scenario below.
      changed.localBindings["keyboard.help"] = [{match:"key",value:"F1",modifiers:[]}];
      changed.localBindings["editor.focus"] = [{match:"key",value:"F3",modifiers:["shift"]}];
      changed.localBindings["search.focus"] = [{match:"key",value:"F4",modifiers:[]}];
      changed.publishedCommands["relationship.create-center.child"] = true;
      const id = "k-plex:kplex-add-child", prior = app.hotkeyManager.getHotkeys(id);
      c.restoreHotkeys = async () => { if (prior === undefined) app.hotkeyManager.removeHotkeys(id); else app.hotkeyManager.setHotkeys(id, prior); await app.hotkeyManager.save(); };
      app.hotkeyManager.setHotkeys(id, [{ modifiers: ["Mod", "Shift"], key: "F9" }]); await app.hotkeyManager.save();
      const root = c.hostLeaf.view.containerEl.querySelector(".kplex-app");
      app.workspace.setActiveLeaf(c.hostLeaf, { focus: true }); root.focus();
      const previousGraphScope = app.keymap.getWindowStack(window).scope;
      await p.updateActionPreferences(changed);
      wrap(p.actionManager, "prepare", original => function (request) {
        const start = performance.now(), result = original.call(this, request);
        const record = { id: request.id, source: request.source, requestedOwnedSurface: request.surfaceId === undefined ? null : request.surfaceId === c.surfaceId, state: result.state, reason: result.reasonKey, durationMs: performance.now() - start };
        (c.prepared ??= []).push(record);
        if (result.state !== "accepted") return result;
        return { ...result, run: async (...args) => { const outcome = await result.run(...args); record.outcome = outcome.status; return outcome; } };
      });
      await until(() => { const scope = app.keymap.getWindowStack(window).scope; return document.activeElement === root && scope !== previousGraphScope && scope?.win === window && scope.parent === c.hostLeaf.view.scope && scope.keys?.some(item => item.key === "F9" && item.modifiers === "Meta,Shift"); }, "Persisted F9 compiler generation not installed in native Scope");
      const nativeStack = app.keymap.getWindowStack(window);
      c.initialGraph = { focused: document.activeElement === root, center: root.querySelector(".kplex-role-center")?.dataset.kplexPath, characterKeys: p.settings.actionPreferences.characterShortcutsEnabled, bindings: p.settings.actionPreferences.localBindings["pin.toggle"], scopeKeys: nativeStack.scope?.keys?.map(item => ({ key: item.key, modifiers: item.modifiers })), scopeOwnerWindow: nativeStack.scope?.win === window };
      const pinned = p.settings.pinnedNodes.includes(c.a.path);
      await trustedKey("F9", ["meta", "shift"]);
      await until(() => p.settings.pinnedNodes.includes(c.a.path) !== pinned, "Local same-chord action did not run");
      check(!composer(), "Parent host command also opened a composer for graph-owned chord");
      app.workspace.setActiveLeaf(c.editorLeaf, { focus: true }); c.editorLeaf.view.editor?.focus();
      check(!root.contains(document.activeElement), "External editor focus setup failed");
      await trustedKey("F9", ["meta", "shift"]); await awaitComposer();
      check(p.settings.pinnedNodes.includes(c.a.path) !== pinned, "Graph local key ran outside the graph"); await closeComposer();
      // A real toolbar button owns Enter, even when graph selection exists.
      app.workspace.setActiveLeaf(c.hostLeaf, { focus: true });
      const button = root.querySelector(".kplex-filter-trigger"); check(Boolean(button), "Native toolbar filter control missing");
      let graphActivations = 0; const prepare = p.actionManager.prepare;
      p.actionManager.prepare = function (request) { if (request.id === "node.activate" || request.id.startsWith("selection.")) graphActivations++; return prepare.call(this, request); };
      try {
        button.focus(); await trustedKey("Enter"); check(graphActivations === 0, "Native button Enter activated/moved graph selection");
        await until(() => button.getAttribute("aria-expanded") === "true", "Native Enter did not activate its toolbar button");
      }
      finally { p.actionManager.prepare = prepare; }
      button.click(); await until(() => button.getAttribute("aria-expanded") === "false", "Owned filter disclosure did not close");
      await p.actionManager.dispatch({ id: "view.layout-controls", source: "toolbar", surfaceId: c.surfaceId });
      await until(() => root.querySelector('input[type="range"]'), "Native layout slider not rendered");
      const slider = root.querySelector('input[type="range"]'), value = Number(slider.value), beforeSliderPin = p.settings.pinnedNodes.includes(c.a.path);
      let graphControlKeys = 0; const nativePrepare = p.actionManager.prepare;
      p.actionManager.prepare = function (request) { if (request.id.startsWith("selection.") || request.id === "pin.toggle" || request.id === "node.activate") graphControlKeys++; return nativePrepare.call(this, request); };
      try {
        slider.focus(); await trustedKey(value >= Number(slider.max) ? "Left" : "Right");
        check(Number(slider.value) !== value, "Native range arrow did not change its slider value");
        check(graphControlKeys === 0 && p.settings.pinnedNodes.includes(c.a.path) === beforeSliderPin, "Native slider key triggered graph/pin action");
        await trustedKey("Tab"); check(document.activeElement !== slider, "Native Tab was trapped by graph Scope");
      } finally { p.actionManager.prepare = nativePrepare; }
      await p.actionManager.dispatch({ id: "view.layout-controls", source: "toolbar", surfaceId: c.surfaceId });
      await p.updateActionPreferences(preference);
    });

    await scenario("H01-H02-background-center-create-return", async () => {
      app.workspace.setActiveLeaf(c.editorLeaf, { focus: true }); c.editorLeaf.view.editor?.focus();
      const editorInvoker = document.activeElement;
      check(!c.hostLeaf.view.containerEl.contains(editorInvoker) && app.workspace.getActiveFile() === c.b, "Background command did not start from unrelated native editor");
      command("kplex-add-child"); const modal = await awaitComposer();
      check(modal.querySelector(".modal-title").textContent.includes(p.index.titleFor(p.index.get(c.a.path))), "Command retargeted to external editor");
      const dialog = [...p.actionDialogs.keys()].find(item => item.modalEl === modal), previousSubmit = dialog.submitCallback;
      completion("return"); const name = `Action-return-${Date.now()}`; input(modal.querySelector(".kplex-add-related-note-search input"), name);
      await until(() => modal.querySelector('button[data-kplex-primary-action="true"]')?.disabled === false && dialog.submitCallback && dialog.submitCallback !== previousSubmit, "Creation input and live submit callback not accepted");
      const nameInput = modal.querySelector(".kplex-add-related-note-search input"); nameInput.focus();
      await until(() => document.activeElement === nameInput && !modal.querySelector('input[aria-expanded="true"]'), "Return submit did not own current name focus without suggestions");
      await trustedKey("Enter", ["meta"]);
      await until(() => !composer() && c.created.length === 1, "Return creation did not complete", 30000);
      check(p.settings.lastActivePath === c.a.path, "Return unexpectedly followed new node");
      check((await app.vault.read(c.a)).includes(name), "Captured center relationship not saved");
      check(!(await app.vault.read(c.b)).includes(name), "External editor note was mutated");
      check(!editorInvoker?.isConnected || document.activeElement === editorInvoker, "Invoking editor focus was not restored");
    });

    await scenario("H03-explicit-create-edit-focuses-owned-native-sidecar", async () => {
      await center(c.a.path); check(!p.hasAssociatedEditor(c.hostLeaf), "Owned test surface already has an editor before explicit edit");
      const beforeLeaves = new Set(); app.workspace.iterateAllLeaves(leaf => beforeLeaves.add(leaf));
      const before = c.created.length, priorMode = p.settings.documentSyncMode;
      /** Capture ownership/focus facts only; leaf contents and unrelated vault paths are excluded. */
      const captureEdit = phase => {
        const managed = p.sidecarLeaves.get(c.hostLeaf), file = c.created.length > before ? c.created.at(-1) : null;
        (c.editProof ??= []).push({ phase, associated: Boolean(managed), associatedWasPresentBefore: managed ? beforeLeaves.has(managed) : null,
          associatedViewType: managed?.view.getViewType(), associatedFileIsCreated: Boolean(file && managed?.view.file === file),
          activeFileIsCreated: Boolean(file && app.workspace.getActiveFile() === file),
          focusedInsideAssociated: Boolean(managed?.view.containerEl.contains(document.activeElement)),
          focusedNativeEditor: Boolean(managed && managed.view.containerEl.querySelector(".cm-content") === document.activeElement),
          associatedIsActiveLeaf: Boolean(managed && app.workspace.getMostRecentLeaf() === managed),
          session: c.ownedComposerDialog ? { opened: c.ownedComposerDialog.opened, invalidated: c.ownedComposerDialog.invalidated, completing: c.ownedComposerDialog.completing, current: c.ownedComposerDialog.invocation?.current?.() } : null,
          outsideEditorStillOriginal: c.editorLeaf.view.file === c.b,
          focusClass: document.activeElement?.className, enumeratedMarkdownLeaves: app.workspace.getLeavesOfType("markdown").length });
      };
      captureEdit("before");
      try {
        c.hostLeaf.view.containerEl.querySelector(".kplex-app").focus(); command("kplex-add-child");
        const modal = await awaitComposer(); completion("edit"); await enterComposerName(`Action-edit-${Date.now()}`);
        await trustedClick(modal.querySelector('button[data-kplex-primary-action="true"]'));
        await until(() => !composer() && c.created.length === before + 1, "Explicit edit creation did not save", 30000);
        const file = c.created.at(-1);
        await until(() => app.workspace.getActiveFile() === file && p.hasAssociatedEditor(c.hostLeaf), "Explicit edit did not focus its supported associated editor", 30000);
        captureEdit("association-ready-before-focus");
        await until(() => { const editor = p.sidecarLeaves.get(c.hostLeaf); return editor?.view.file === file && editor.view.containerEl.contains(document.activeElement) && editor.view.containerEl.querySelector(".cm-content") === document.activeElement; }, "Explicit edit did not give its exact managed native editor actual focus", 30000);
        const editor = p.sidecarLeaves.get(c.hostLeaf);
        check(Boolean(editor) && !beforeLeaves.has(editor), "Explicit edit adopted or focused an unrelated native document");
        check(editor.view.containerEl.querySelector(".cm-content") === document.activeElement, "Created note did not receive actual native editor focus");
        check(c.editorLeaf.view.file === c.b, "Explicit edit retargeted the unrelated native editor");
        check(p.settings.lastActivePath === file.path, "Explicit edit did not deliberately follow the created note");
        captureEdit("owned-editor-focused");
      } finally {
        app.workspace.iterateAllLeaves(leaf => { if (!beforeLeaves.has(leaf)) c.newLeaves.push(leaf); });
        const managed = p.sidecarLeaves.get(c.hostLeaf);
        if (managed && !beforeLeaves.has(managed) && p.hasAssociatedEditor(c.hostLeaf)) await p.closeSidecar(c.hostLeaf, false);
        p.settings.documentSyncMode = priorMode;
      }
      await center(c.a.path); c.hostLeaf.view.containerEl.querySelector(".kplex-app").focus();
    });

    await scenario("H05-H08-H09-captured-origin-another-and-follow", async () => {
      await center(c.a.path); command("kplex-add-child"); const modal = await awaitComposer(); completion("another");
      await center(c.b.path);
      check(modal.querySelector(".modal-title").textContent.includes("Origin-A"), "Composer origin drifted with shared center");
      for (let index = 0; index < 3; index++) {
        const before = c.created.length, name = `Action-another-${Date.now()}-${index}`, element = modal.querySelector(".kplex-add-related-note-search input");
        await enterComposerName(name);
        key(element, "Enter", { metaKey: true, shiftKey: true }); key(element, "Enter", { metaKey: true, shiftKey: true, repeat: true });
        await until(() => c.created.length === before + 1 && element.value === "" && !element.disabled && document.activeElement === element, "Another did not clear and refocus after confirmed save", 30000);
        check(composer() === modal, "Another closed composer"); check((await app.vault.read(c.a)).includes(name), "Another origin changed");
        check(!(await app.vault.read(c.b)).includes(name), "Another modified current center instead of captured origin");
      }
      const previousSubmit = c.ownedComposerDialog.submitCallback;
      completion("follow"); const before = c.created.length, name = `Action-follow-${Date.now()}`;
      input(modal.querySelector(".kplex-add-related-note-search input"), name);
      await until(() => !modal.querySelector('button[data-kplex-primary-action="true"]').disabled && c.ownedComposerDialog.submitCallback !== previousSubmit, "Follow input and submit callback not committed"); submit();
      await until(() => !composer() && c.created.length === before + 1, "Follow creation failed", 30000);
      await until(() => p.settings.lastActivePath === c.created.at(-1).path, "Explicit follow did not activate created node");
      await until(() => c.hostLeaf.view.containerEl.querySelector(".kplex-app") === document.activeElement, "Follow did not focus its exact originating graph", 30000);
      check(c.hostLeaf.view.containerEl.contains(document.activeElement), "Follow focused an unrelated editor");
    });

    await scenario("H06-delete-recreate-captured-target", async () => {
      await center(c.a.path); const captured = p.index.get(c.b.path), before = await app.vault.read(c.a); let commits = 0;
      c.ownedComposerDialog = p.openRelationModal({ mode: "create", origin: p.index.get(c.a.path), semanticRole: "left", fixedTarget: captured, hostLeaf: c.hostLeaf, onCommitted: () => commits++ });
      const modal = await awaitComposer(); await app.vault.delete(c.b, true); c.b = await create("Editor-B"); p.index.insertCreatedFile(c.b);
      await until(() => app.metadataCache.getFileCache(c.b), "Replacement metadata missing"); submit(); await delay(100);
      check(composer() === modal, "Invalid replacement dismissed input"); check(commits === 0, "Replacement reported a commit");
      check(await app.vault.read(c.a) === before, "Replacement received captured relationship"); await closeComposer();
      c.editorLeaf.detach(); c.editorLeaf = app.workspace.getLeaf("tab"); await c.editorLeaf.openFile(c.b);
    });

    await scenario("H07-suggestion-first-enter", async () => {
      await center(c.a.path); let writes = 0; const original = p.createRelationToPage;
      p.createRelationToPage = async function (...args) { writes++; return original.apply(this, args); };
      try {
        command("kplex-add-friend"); const modal = await awaitComposer(), element = modal.querySelector(".kplex-add-related-note-search input");
        input(element, "Target-C"); await until(() => element.getAttribute("aria-expanded") === "true", "Target suggestion not shown");
        const previousSubmit = c.ownedComposerDialog.submitCallback;
        key(element, "Enter"); await until(() => modal.querySelector(".kplex-add-related-link-button") && c.ownedComposerDialog.submitCallback !== previousSubmit, "Enter did not select target and commit its callback"); check(writes === 0, "Suggestion selection also saved");
        key(element, "Enter", { metaKey: true }); await until(() => !composer(), "Intentional submit did not save", 30000); check(writes === 1, "Suggestion submit wrote more than once");
      } finally { p.createRelationToPage = original; }
    });

    await scenario("H27-partial-file-recovery-without-duplicate-create", async () => {
      await center(c.a.path); const original = p.linkNewRelatedFile; let fault = true;
      p.linkNewRelatedFile = async function (...args) { if (fault) { fault = false; throw new Error("Owned test relationship failure"); } return original.apply(this, args); };
      try {
        command("kplex-add-child"); const modal = await awaitComposer(); completion("return");
        const before = c.created.length, name = `Action-partial-${Date.now()}`; await enterComposerName(name); submit();
        const recovery = () => [...modal.querySelectorAll("button")].find(button => button.textContent === p.translator("addRelated.linkCreatedFile"));
        await until(() => recovery() && !recovery().disabled, "Partial creation has no usable recovery"); check(c.created.length === before + 1, "Partial creation created duplicates");
        recovery().click(); await until(() => !composer(), "Recover existing file did not complete", 30000);
        check(c.created.length === before + 1, "Recovery reissued file creation"); check((await app.vault.read(c.a)).includes(name), "Recovered relationship not saved");
      } finally { p.linkNewRelatedFile = original; }
    });

    await scenario("H27-saved-pending-refresh-without-retry", async () => {
      const pendingTarget = await create("Pending-target"); await until(() => app.metadataCache.getFileCache(pendingTarget), "Pending target metadata"); p.index.insertCreatedFile(pendingTarget);
      await center(c.a.path); const originalPublish = p.publishSavedRelationship, originalPair = p.index.prepareRelationshipPair; let once = true, writes = 0;
      const originalWrite = p.writeRelationship;
      p.writeRelationship = async function (...args) { writes++; return originalWrite.apply(this, args); };
      p.publishSavedRelationship = async function (...args) {
        if (!once) return originalPublish.apply(this, args); once = false;
        p.index.prepareRelationshipPair = async (...pair) => pair[0] === args[0] && pair[1] === args[1] ? false : originalPair.apply(p.index, pair);
        try { return await originalPublish.apply(this, args); } finally { p.index.prepareRelationshipPair = originalPair; }
      };
      try {
        let state;
        c.ownedComposerDialog = p.openRelationModal({ mode: "create", origin: p.index.get(c.a.path), semanticRole: "right", fixedTarget: p.index.get(pendingTarget.path), hostLeaf: c.hostLeaf, onCommitted: result => { state = result.state; } });
        const modal = await awaitComposer(); submit(); await until(() => state === "saved-pending", "Saved write incorrectly reported failure");
        check((await app.vault.read(c.a)).includes("Pending-target"), "Saved-pending content missing"); check(writes === 1, "Pending write duplicated");
        const element = modal.querySelector(".kplex-add-related-note-search input"); key(element, "Enter", { metaKey: true }); await delay(50); check(writes === 1, "Pending submit retried a mutation");
        const refresh = [...modal.querySelectorAll("button")].find(button => button.textContent === p.translator("addRelated.refreshSaved")); check(Boolean(refresh), "Targeted saved refresh missing"); refresh.click();
        await until(() => !element.disabled, "Saved refresh did not permit explicit continuation", 30000); check(writes === 1, "Refresh reissued mutation"); await closeComposer();
      } finally { p.publishSavedRelationship = originalPublish; p.index.prepareRelationshipPair = originalPair; p.writeRelationship = originalWrite; }
    });

    await scenario("H27-close-during-write-prevents-late-focus", async () => {
      const lateTarget = await create("Late-target"); await until(() => app.metadataCache.getFileCache(lateTarget), "Late target metadata"); p.index.insertCreatedFile(lateTarget);
      await center(c.a.path); const original = p.createRelationToPage, originalFinish = p.finishNewRelatedNode; let release, started = false, effects = 0, state;
      const gate = new Promise(resolve => { release = resolve; }); c.releaseWrite = release;
      p.createRelationToPage = async function (...args) { started = true; await gate; return original.apply(this, args); };
      p.finishNewRelatedNode = async function (...args) { effects++; return originalFinish.apply(this, args); };
      try {
        c.ownedComposerDialog = p.openRelationModal({ mode: "create", origin: p.index.get(c.a.path), semanticRole: "left", fixedTarget: p.index.get(lateTarget.path), hostLeaf: c.hostLeaf, invocation: { continuation: "follow" }, onCommitted: result => { state = result.state; } });
        await awaitComposer(); submit(); await until(() => started, "Controlled write did not start"); await closeComposer(); release();
        await until(() => state === "saved-published", "Dismissed write lost its explicit committed outcome", 30000);
        check(effects === 0, "Dismissed writer performed late navigation/focus"); check(p.settings.lastActivePath === c.a.path, "Dismissed writer followed target");
      } finally { release(); c.releaseWrite = null; p.createRelationToPage = original; p.finishNewRelatedNode = originalFinish; }
    });

    await scenario("H24-preferences-apply-keeps-open-composer-and-single-flight", async () => {
      await center(c.a.path); command("kplex-add-child"); const modal = await awaitComposer(), before = c.created.length;
      const preferences = JSON.parse(JSON.stringify(p.settings.actionPreferences)), next = JSON.parse(JSON.stringify(preferences));
      next.characterShortcutsEnabled = !next.characterShortcutsEnabled; await p.updateActionPreferences(next);
      const duplicate = await p.actionManager.dispatch({ id: "relationship.create-center.child", source: "obsidian-command", surfaceId: c.surfaceId });
      check(duplicate.status === "unavailable" && composer() === modal && document.querySelectorAll(".kplex-add-related-modal").length === 1, "Preference apply broke composer single-flight ownership");
      completion("return"); await enterComposerName(`Action-preferences-${Date.now()}`); submit();
      await until(() => !composer() && c.created.length === before + 1, "Composer could not complete after preference apply", 30000);
      await p.updateActionPreferences(preferences); command("kplex-add-child"); await awaitComposer(); await closeComposer();
    });

    await scenario("H17-H24-publication-and-workflow-only-settings", async () => {
      const before = JSON.parse(JSON.stringify(p.settings.actionPreferences)), next = JSON.parse(JSON.stringify(before));
      let invalidations = 0, scans = 0; const originalInvalidate = p.index.invalidateSemanticPolicy, originalFiles = app.vault.getMarkdownFiles;
      p.index.invalidateSemanticPolicy = function (...args) { invalidations++; return originalInvalidate.apply(this, args); };
      app.vault.getMarkdownFiles = function (...args) { scans++; return originalFiles.apply(this, args); };
      try {
        next.publishedCommands["relationship.create-center.child"] = false; next.localBindings["pin.toggle"] = [];
        await p.updateActionPreferences(next); check(!p.isActionPublished("relationship.create-center.child"), "Unpublication did not remove native command");
        check(!app.commands.commands["k-plex:kplex-add-child"], "Old native command still registered");
        check(app.hotkeyManager.getHotkeys("k-plex:kplex-add-child")?.some(binding => binding.key === "F9"), "Unpublish removed the actual host shortcut assignment");
        check(invalidations === 0 && scans === 0, "Workflow preference triggered semantic work or vault scan");
        await p.updateActionPreferences(before); check(p.isActionPublished("relationship.create-center.child"), "Republish did not restore stable command");
        check(Boolean(app.commands.commands["k-plex:kplex-add-child"]), "Stable old command ID missing after republish");
        check(app.hotkeyManager.getHotkeys("k-plex:kplex-add-child")?.some(binding => binding.key === "F9"), "Republish changed the actual host shortcut assignment");
      } finally { p.index.invalidateSemanticPolicy = originalInvalidate; app.vault.getMarkdownFiles = originalFiles; }
    });

    await scenario("H29-laptop-defaults-selection-sidecar-and-read-only-help", async () => {
      check(!app.setting.isOpen, "Settings already open before laptop-default fixture");
      const before = JSON.parse(JSON.stringify(p.settings.actionPreferences)), fresh = JSON.parse(JSON.stringify(before));
      // This saved test vault assigns Option+Slash to Sidecar while Search uses F4. Restoring the
      // laptop Search default alone creates an intentional compiler conflict, not a focus failure.
      for (const id of ["search.focus", "keyboard.help", "node.rename", "graph.focus", "editor.focus", "selection.center", "node.open", "view.sidecar.toggle"]) delete fresh.localBindings[id];
      fresh.characterShortcutsEnabled = true;
      fresh.crossSectionAtBoundary = true; // Fresh-vault policy; the saved upgrade fixture intentionally disables crossing.
      const root = () => c.hostLeaf.view.containerEl.querySelector(".kplex-app");
      let companion, configurationCalls = 0;
      const helpWindowGeometry = {bounds:nativeWindow.getBounds(),minimum:nativeWindow.getMinimumSize()};
      const originalConfiguration = wrap(p, "openActionSettings", original => function(...args) {
        configurationCalls++; c.ownedNativeSettings = true;
        return original.apply(this,args);
      });
      try {
        await p.updateActionPreferences(fresh); await center(c.a.path);
        await app.workspace.revealLeaf(c.hostLeaf); app.workspace.setActiveLeaf(c.hostLeaf,{focus:true}); root().focus();
        await until(() => app.keymap.getWindowStack(window).scope?.keys?.some(item => item.key === "/" && item.modifiers?.includes("Alt")), "Laptop Option+Slash default Scope not installed");
        await trustedKey("/",["alt"],nativeWindow,document,"Slash");
        const search = root().querySelector("input.kplex-search");
        await until(() => document.activeElement === search, "Slash did not focus native Vault search");
        await trustedKey("r"); check(search.value === "r" && !document.querySelector(".kplex-rename-modal"), "Letter rename stole search input");
        input(search, ""); await trustedKey("Escape"); root().focus();
        await trustedKey("?",["alt","shift"],nativeWindow,document,"Slash");
        const help = () => document.querySelector(".kplex-keyboard-help");
        await until(help, "Question mark did not open distinct keyboard reference");
        check(help().querySelectorAll(".setting-hotkey").length > 0 && !help().querySelector(".setting-add-hotkey-button"), "Keyboard reference is not read-only native shortcut rows");
        c.helpPaletteGeometry=[];
        nativeWindow.setMinimumSize(200,150);
        for (const width of [1200,900,390]) {
          nativeWindow.setContentSize(width,875);
          await until(() => innerWidth===width, "Owned help viewport did not reach requested width",3000);
          await delay(100);
          c.helpPaletteGeometry.push(await paletteGeometry(help(), ".kplex-action-results", "Keyboard reference"));
        }
        nativeWindow.setMinimumSize(...helpWindowGeometry.minimum); nativeWindow.setBounds(helpWindowGeometry.bounds);
        await until(() => innerWidth===helpWindowGeometry.bounds.width, "Owned help viewport did not restore desktop width",3000);
        const helpCenter = p.settings.lastActivePath; await trustedKey("Enter");
        await delay(100);
        check(help() && p.settings.lastActivePath === helpCenter && !composer() && configurationCalls === 0 && !app.setting.isOpen, "Keyboard reference Enter executed, configured or closed a command");
        await trustedKey("Escape"); await until(() => !help(), "Reference native Escape did not retire modal"); root().focus();
        await trustedKey("0",["alt"],nativeWindow,document,"Digit0"); await trustedKey("Down");
        const selected = () => root().querySelector(".is-keyboard-selected[data-kplex-path]");
        await until(() => selected() && p.index.get(selected().dataset.kplexPath)?.file && selected().dataset.kplexPath !== c.a.path, "Arrow navigation lacks selected existing neighbor");
        const selectedPath = selected().dataset.kplexPath, style = window.getComputedStyle(selected());
        const outlineWidth = style.outlineWidth, boxShadow = style.boxShadow;
        check(style.outlineWidth === "3px" && style.boxShadow !== "none", "Selected node lacks stronger visible ring and glow");
        await trustedKey("Enter",["meta"]);
        await until(() => p.settings.lastActivePath === selectedPath && p.isSidecarOpen(c.hostLeaf) && p.sidecarLeaves.get(c.hostLeaf)?.view.file?.path === selectedPath, "Cmd+Enter did not center and ensure selected note in sidecar");
        companion = p.sidecarLeaves.get(c.hostLeaf); c.newLeaves.push(companion);
        check(companion !== c.hostLeaf && companion.view.getViewType() === "markdown", "Cmd+Enter opened the wrong native representation");
        root().focus(); await trustedKey("Enter",["meta"]);
        await until(() => p.isSidecarOpen(c.hostLeaf) && p.sidecarLeaves.get(c.hostLeaf) === companion && companion.view.file?.path === selectedPath, "Repeated Cmd+Enter toggled or replaced sidecar");
        c.laptopDefaultsProof = {selectedPath,outlineWidth,boxShadow,sidecarReused:true,helpReadOnly:true,searchTypingPreserved:true};
      } finally {
        nativeWindow.setMinimumSize(...helpWindowGeometry.minimum); nativeWindow.setBounds(helpWindowGeometry.bounds);
        p.openActionSettings = originalConfiguration;
        if (c.ownedNativeSettings) { c.ownedSettings = app.setting.getCurrentPageEl(); await c.closeSettings(); }
        if (document.querySelector(".kplex-keyboard-help")) await trustedKey("Escape");
        if (companion && p.sidecarLeaves.get(c.hostLeaf) === companion) await p.closeSidecar(c.hostLeaf,false);
        await p.updateActionPreferences(before); await center(c.a.path); root()?.focus();
      }
    });

    await scenario("H30-native-graph-typing-selection-and-match-cycling", async () => {
      const before = JSON.parse(JSON.stringify(p.settings.actionPreferences)), fresh = JSON.parse(JSON.stringify(before));
      for (const id of catalogActionIds) delete fresh.localBindings[id];
      fresh.characterShortcutsEnabled = true;
      const phrase = "typed phrase", root = () => c.hostLeaf.view.containerEl.querySelector(".kplex-app");
      const nodes = () => [...root().querySelectorAll("[data-kplex-keyboard-id][data-kplex-path]")];
      const indicator = () => root().querySelector(".kplex-type-selection");
      const selected = () => root().querySelector(".is-keyboard-selected[data-kplex-keyboard-id]")?.dataset.kplexKeyboardId;
      const parentScope = c.hostLeaf.view.scope;
      let parentHandler, parentTypingShortcutCalls = 0;
      try {
        await p.updateActionPreferences(fresh); await center(c.a.path);
        const fixtures = [];
        for (const role of ["parent", "child"]) {
          const file = await create("Typed phrase-"+role); fixtures.push({file,role});
          await until(() => app.metadataCache.getFileCache(file), "Owned typing fixture metadata did not settle");
          p.index.insertCreatedFile(file); await p.index.publishHostMetadataPreview(file.path);
          const field = p.ontologyFieldsForRole(role)[0]; check(Boolean(field), "Owned typing fixture lacks a configured ontology field");
          const result = await p.createRelationToPage(p.index.get(c.a.path),role,p.index.get(file.path),field);
          check(result.state === "saved-published", "Owned cross-area typing fixture did not save and publish canonically");
        }
        await app.workspace.revealLeaf(c.hostLeaf); app.workspace.setActiveLeaf(c.hostLeaf,{focus:true}); root().focus();
        await until(() => fixtures.every(({file,role}) => nodes().some(node => node.dataset.kplexPath === file.path && node.classList.contains("kplex-role-"+role))), "Owned typing fixtures did not render in their two distinct graph areas");
        await until(() => document.activeElement === root(), "Native graph typing did not start on exact bare graph");
        const search = root().querySelector("input.kplex-search"), searchBefore = search.value, centerBefore = p.settings.lastActivePath;
        const inventory = () => nodes().map(node => node.dataset.kplexKeyboardId).sort();
        const inventoryBefore = JSON.stringify(inventory()), preparedBefore = (c.prepared ?? []).length;
        const matchIds = fixtures.map(({file}) => nodes().find(node => node.dataset.kplexPath === file.path).dataset.kplexKeyboardId);
        check(typeof parentScope?.register === "function", "Owned graph native parent Scope unavailable for typing priority fixture");
        parentHandler = parentScope.register([], "t", () => { parentTypingShortcutCalls++; return false; });
        for (const character of phrase) {
          await trustedKey(character);
          check(c.lastTrustedKey.defaultPrevented, "Plain graph typing was not consumed by displayed-node selection");
        }
        await until(() => indicator()?.dataset.kplexTypeQuery === phrase && indicator().dataset.kplexTypeCount === "2" && matchIds.includes(selected()), "Native graph phrase did not select exactly its two displayed cross-area matches");
        const badgeBounds = indicator().getBoundingClientRect();
        const magnifierBounds=root().querySelector(".kplex-find").getBoundingClientRect(),plexBounds=indicator().parentElement.getBoundingClientRect();
        check(Math.abs(badgeBounds.top-magnifierBounds.top)<1&&Math.abs(badgeBounds.left-plexBounds.left-(plexBounds.right-magnifierBounds.right))<1,"Native typing badge is not symmetric to its top-right magnifier");
        c.typingBadgeGeometry={top:badgeBounds.top,leftInset:badgeBounds.left-plexBounds.left,rightInset:plexBounds.right-magnifierBounds.right,magnifierTop:magnifierBounds.top};
        for (const control of root().querySelectorAll(".kplex-layout-controls, .kplex-zoom-controls, .kplex-find")) {
          const bounds = control.getBoundingClientRect();
          if (bounds.width && bounds.height) check(badgeBounds.right <= bounds.left || badgeBounds.left >= bounds.right || badgeBounds.bottom <= bounds.top || badgeBounds.top >= bounds.bottom, "Typing feedback overlaps a native graph control");
        }
        check(["1","2"].includes(indicator().dataset.kplexTypeIndex), "Graph typing indicator lacks a one-based selected match position");
        const first = selected(); await trustedKey("Tab");
        await until(() => selected() !== first && matchIds.includes(selected()), "Native Tab did not advance to the other displayed phrase match");
        const second = selected(); await trustedKey("Tab"); await until(() => selected() === first, "Native Tab did not wrap its displayed phrase matches");
        await trustedKey("Tab",["shift"]); await until(() => selected() === second, "Native Shift+Tab did not reverse through displayed phrase matches");
        await trustedKey("Tab",["shift"]); await until(() => selected() === first, "Native Shift+Tab did not wrap in reverse");
        await trustedKey("Backspace"); await until(() => indicator()?.dataset.kplexTypeQuery === phrase.slice(0,-1) && indicator().dataset.kplexTypeCount === "2", "Native Backspace did not edit the graph typing phrase");
        const selectionBeforeClear = selected(); await trustedKey("Escape");
        await until(() => !indicator() || indicator().dataset.kplexTypeQuery === "", "Native Escape did not clear graph typing");
        check(selected() === selectionBeforeClear, "Clearing graph typing changed its selected occurrence");
        await trustedKey("t"); await until(() => indicator()?.dataset.kplexTypeQuery === "t", "Native one-character graph query did not start");
        const oneCharacterSelection = selected(); await trustedKey("Backspace");
        await until(() => !indicator() || indicator().dataset.kplexTypeQuery === "", "Removing the last graph-query character did not clear typing");
        check(selected() === oneCharacterSelection, "Removing the last graph-query character changed selection");
        check(search.value === searchBefore && p.settings.lastActivePath === centerBefore && JSON.stringify(inventory()) === inventoryBefore, "Graph typing changed Vault search, center, or displayed graph inventory");
        check((c.prepared ?? []).length === preparedBefore, "Plain graph typing or its query controls executed an action");
        check(parentTypingShortcutCalls === 0, "Native parent printable shortcut took priority over owned graph typing");
        const custom = JSON.parse(JSON.stringify(fresh)); custom.localBindings["selection.center"] = [{match:"key",value:"x",modifiers:[]}];
        await p.updateActionPreferences(custom);
        await until(() => app.keymap.getWindowStack(window).scope?.keys?.some(item => item.key === "x"), "Explicit printable shortcut Scope did not replace the graph typing fixture");
        await trustedKey("x");
        await until(() => root().querySelector(".kplex-role-center.is-keyboard-selected"), "Explicit printable shortcut did not take priority over graph typing");
        check(!indicator() || indicator().dataset.kplexTypeQuery === "", "Explicit printable shortcut also entered graph typing text");
        check((c.prepared ?? []).slice(preparedBefore).some(record => record.id === "selection.center" && record.source === "local-hotkey"), "Custom printable priority did not use the canonical action dispatcher");
        c.typedSelectionProof = {phrase,matches:matchIds.length,areas:fixtures.map(item=>item.role),trustedPlainTyping:true,parentShortcutYielded:true,feedbackClearOfControls:true,tabWrap:true,shiftTabWrap:true,backspaceEdits:true,lastBackspacePreservesSelection:true,escapePreservesSelection:true,displayedInventoryUnchanged:true,vaultSearchUnchanged:true,centerUnchanged:true,customPrintableWins:true};
      } finally {
        if (parentHandler) parentScope.unregister(parentHandler);
        if (document.activeElement === root() && indicator()?.dataset.kplexTypeQuery) await trustedKey("Escape");
        await p.updateActionPreferences(before); await center(c.a.path); root()?.focus();
      }
    });

    await scenario("H18-H28-action-settings-recovery-and-controls", async () => {
      const preferencesBeforeSettingsOpen = JSON.stringify(p.settings.actionPreferences);
      check(!app.setting.isOpen, "Unowned native Settings already open before gear-menu check");
      check(await p.revealActionSurface(c.surfaceId), "Exact graph could not be revealed for its settings gear");
      const gear = c.hostLeaf.view.containerEl.querySelector('button[aria-label="'+p.translator("app.settingsMenu")+'"]');
      check(Boolean(gear), "Owned graph settings gear unavailable");
      // Owned partial-failure notices can temporarily cover the top-right gear.
      // Wait for actual pointer hit-testing within the existing native-click deadline.
      let previousGearGeometry, stableGearGeometry = 0;
      await until(() => {
        const rect = gear.getBoundingClientRect(), x = Math.round(rect.left + rect.width / 2), y = Math.round(rect.top + rect.height / 2);
        c.gearPointerGeometry = {left:rect.left,top:rect.top,width:rect.width,height:rect.height,hitClass:document.elementFromPoint(x,y)?.className};
        const geometry = [rect.left,rect.top,rect.width,rect.height];
        const ready = rect.width > 0 && rect.height > 0 && gear.contains(document.elementFromPoint(x,y));
        stableGearGeometry = ready && previousGearGeometry && geometry.every((value,index)=>Math.abs(value-previousGearGeometry[index])<0.01) ? stableGearGeometry+1 : 0;
        previousGearGeometry = geometry; return stableGearGeometry >= 3;
      }, "Owned settings gear did not become unobscured after test notices", 15000);
      // Native macOS menus have no renderer DOM. Use the real menu/item callback through its
      // supported DOM presenter for this one owned interaction, then restore its exact presenter.
      const presentMenu = wrap(p, "showKplexMenuAtMouseEvent", original => function(menu, ...args) {
        menu.setUseNativeMenu(false); return original.call(this, menu, ...args);
      });
      try {
        await trustedClick(gear);
        const settingsItem = () => [...document.querySelectorAll(".menu-item")].find(item => item.querySelector(".menu-item-title")?.textContent.trim() === p.translator("app.pluginSettings"));
        await until(settingsItem, "Real Plugin settings gear-menu item missing");
        c.ownedNativeSettings = true; await trustedClick(settingsItem());
        await until(() => app.setting.isOpen && app.setting.getCurrentPageEl()?.querySelector(".setting-item.mod-navigable"), "Plugin settings gear did not open the native main settings root");
        const rootPage = app.setting.getCurrentPageEl(); c.ownedSettings = rootPage;
        check(!rootPage.querySelector(".kplex-action-settings"), "Plugin settings gear unexpectedly opened the Actions subpage");
        check([...rootPage.querySelectorAll(".setting-item.mod-navigable .setting-item-name")].some(label => label.textContent === p.translator("actions.settingsTitle")), "Plugin settings main root lacks its native Actions page entry");
      } finally { p.showKplexMenuAtMouseEvent = presentMenu; p.dismissKplexMenu(); }
      check(p.openActionSettings(), "Native Actions settings page could not open");
      const settingsDocument = app.setting.getCurrentPageEl().ownerDocument, settingsOwner = nativeOwnerForDocument(settingsDocument);
      observeNativeWindow(settingsDocument, "owned-Actions-Settings");
      await until(() => settingsDocument.querySelector(".kplex-action-settings .kplex-action-setting"), "Inline action settings not rendered");
      let group = settingsDocument.querySelector(".kplex-action-settings"); c.ownedSettings = group;
      // Native detached-page navigation can expose a 64px slide before its parent is laid out.
      // Wait for actual stable geometry without changing pointer delivery or behavior deadlines.
      let previousSettingsGeometry, settledSettingsGeometry = 0;
      await until(() => {
        const page = app.setting.getCurrentPageEl(), bounds = page.getBoundingClientRect();
        const parent = page.parentElement.getBoundingClientRect(), search = group.querySelector('[data-kplex-action-search]').getBoundingClientRect();
        const values = [bounds.left,bounds.top,bounds.width,bounds.height,parent.width,search.left,search.top,search.width,search.height];
        const ready = bounds.width > 128 && parent.width > 0 && search.width > 0 && search.height > 0;
        const same = previousSettingsGeometry && values.every((value,index) => Math.abs(value-previousSettingsGeometry[index]) < 0.01);
        settledSettingsGeometry = ready && same ? settledSettingsGeometry+1 : 0; previousSettingsGeometry = values;
        return ready && settledSettingsGeometry >= 2;
      }, "Native Settings page did not finish its initial layout", 3000);
      const rows = () => [...group.querySelectorAll(".kplex-action-setting")];
      check(group.querySelector('[data-kplex-action-search]')?.getAttribute("aria-label"), "Native manager search lacks accessible name");
      check(rows().length === catalogActionIds.length && catalogActionIds.every(id => rows().some(row => row.dataset.actionId === id)), "Native Settings lost globally searchable catalog rows");
      check(group.querySelectorAll("button[data-kplex-action-filter]").length === 5, "Native manager filter pills unavailable");
      // Native ToggleComponent.setValue can invoke onChange while rendering; opening a read-only
      // page must neither start persistence nor manufacture successful-save feedback.
      let initialRenderFramesReady = false;
      settingsDocument.defaultView.requestAnimationFrame(() => settingsDocument.defaultView.requestAnimationFrame(() => { initialRenderFramesReady = true; }));
      await until(() => initialRenderFramesReady, "Initial native Settings render frames did not settle");
      check(JSON.stringify(p.settings.actionPreferences) === preferencesBeforeSettingsOpen, "Initial native Settings render changed committed action preferences");
      check(![...group.querySelectorAll(".kplex-action-status")].some(status => [p.translator("actions.saving"), p.translator("actions.saved")].includes(status.textContent.trim())), "Initial native Settings render initiated an unsolicited save");
      check(rows().filter(row => !row.dataset.actionId.startsWith("composer.")).every(row => row.querySelector(".kplex-action-scope")?.textContent === p.translator("actions.localScopeHint") && row.querySelector(".setting-command-hotkeys")?.getAttribute("aria-label") === p.translator("actions.localShortcuts")), "Local shortcut scope is missing from individual native rows");
      const publishedChild = group.querySelector('[data-action-id="relationship.create-center.child"]');
      check(publishedChild.querySelector(".kplex-action-publication-state")?.textContent.includes(p.translator("actions.actualPublished")) && publishedChild.querySelector(".kplex-action-publication-state")?.textContent.includes("F9"), "Actual child registration and separately assigned native shortcut are not visible");
      const localBeforePublication = JSON.stringify(p.settings.actionPreferences.localBindings);
      const childPublication = () => publishedChild.querySelector('[data-kplex-action-control="publication"]');
      /** Reveal the deep catalog row and reacquire its rebuilt control before native input. */
      const clickChildPublication = async () => {
        childPublication().scrollIntoView({ block: "center" });
        let revealed = false;
        settingsDocument.defaultView.requestAnimationFrame(() => settingsDocument.defaultView.requestAnimationFrame(() => { revealed = true; }));
        await until(() => revealed, "Child publication row did not finish scrolling");
        await trustedClick(childPublication());
      };
      await clickChildPublication();
      await until(() => !p.isActionPublished("relationship.create-center.child") && publishedChild.querySelector(".kplex-action-publication-state")?.textContent.includes(p.translator("actions.savedAssignmentUnavailable")), "Unpublished command did not retain its separately saved native key status");
      check(JSON.stringify(p.settings.actionPreferences.localBindings) === localBeforePublication && app.hotkeyManager.getHotkeys("k-plex:kplex-add-child")?.some(binding => binding.key === "F9"), "Unpublication changed local or native shortcut assignments");
      check(childPublication().getAttribute("aria-label") === p.translator("actions.publishCommand") && !childPublication().hasAttribute("title"), "Publication help does not explicitly distinguish global key assignment or duplicates tooltips");
      await clickChildPublication();
      await until(() => p.isActionPublished("relationship.create-center.child") && JSON.stringify(p.settings.actionPreferences.localBindings) === localBeforePublication, "Native publication fixture failed to restore registration without changing local keys");
      // The two explicit publication clicks retain an explicit true override even when the
      // entry started with an implicit default. Verify that single expected mutation first.
      const expectedAfterPublication = JSON.parse(preferencesBeforeSettingsOpen);
      expectedAfterPublication.publishedCommands["relationship.create-center.child"] = true;
      check(JSON.stringify(p.settings.actionPreferences) === JSON.stringify(expectedAfterPublication), "Native publication clicks changed unrelated action preferences");
      const preferencesBeforeWorkflowToggle = JSON.stringify(p.settings.actionPreferences);
      const originalCharacterShortcuts = p.settings.actionPreferences.characterShortcutsEnabled;
      const workflowToggle = () => group.querySelector('[data-action-preference="characterShortcutsEnabled"] .checkbox-container');
      const workflowSaved = expected => p.settings.actionPreferences.characterShortcutsEnabled === expected
        && workflowToggle()?.classList.contains("is-enabled") === expected
        && !workflowToggle()?.classList.contains("is-disabled")
        && [...group.querySelectorAll('[data-action-preference="characterShortcutsEnabled"] .kplex-action-status')].some(status => status.textContent.trim() === p.translator("actions.saved"));
      check(Boolean(workflowToggle()) && workflowToggle().classList.contains("is-enabled") === originalCharacterShortcuts, "Native character-shortcut ToggleComponent does not reflect its committed value");
      workflowToggle().scrollIntoView({block:"center"}); await trustedClick(workflowToggle());
      await until(() => workflowSaved(!originalCharacterShortcuts), "Trusted native workflow toggle did not save its inverse value and visual state immediately");
      await trustedClick(workflowToggle());
      await until(() => workflowSaved(originalCharacterShortcuts) && JSON.stringify(p.settings.actionPreferences) === preferencesBeforeWorkflowToggle, "Trusted native workflow toggle did not restore its original value and complete preferences");
      const livePreferences = JSON.stringify(p.settings.actionPreferences);
      const configureRow = group.querySelector('[data-action-id="actions.configure"]');
      check(configureRow?.querySelector("span.setting-hotkey.mod-empty")?.textContent === p.translator("actions.blank"), "Unassigned action does not use the localized native Blank hotkey chip");
      check(configureRow.querySelector("button.clickable-icon.setting-add-hotkey-button svg.lucide-plus-circle"), "Native action hotkey add control lost its plus-circle markup");
      check(group.querySelector('[data-action-id="pin.toggle"] button.setting-hotkey .setting-hotkey-icon.setting-delete-hotkey'), "Assigned action chip lost its native hotkey removal child");
      const captureArea = () => settingsDocument.querySelector('[role="group"][aria-label="'+p.translator("hotkeys.pressKeys")+'"]');
      const allLocalRows = rows().map(row => row.dataset.actionId);
      const f1Rows = rows().filter(row => [...row.querySelectorAll(".setting-hotkey")].some(pill => pill.textContent.trim() === "F1")).map(row => row.dataset.actionId);
      check(f1Rows.includes("keyboard.help"), "Native settings does not show the actual bound F1 help shortcut");
      const hotkeySearch = group.querySelector('button[aria-label="'+p.translator("actions.searchByHotkey")+'"]');
      check(Boolean(hotkeySearch), "Native Search by hotkey header control missing");
      await trustedClick(hotkeySearch);
      await until(() => captureArea() === settingsDocument.activeElement, "Hotkey-search recorder did not focus in its exact Settings document");
      await trustedKey("F1", [], settingsOwner, settingsDocument);
      // Recording defaults to physical matching. Unlike common letter/punctuation keycaps,
      // an F-key preserves the localized physical-position qualifier in its display label.
      const recordedF1Display = p.translator("actions.physicalBinding", { binding: "F1" });
      await until(() => !captureArea() && group.querySelector('[data-kplex-action-search]').value === recordedF1Display, "Hotkey-search recorder did not return the actual physical F1 chord");
      const f1Matches = () => rows().filter(row => !row.classList.contains("kplex-action-filtered")).map(row => row.dataset.actionId);
      await until(() => JSON.stringify(f1Matches()) === JSON.stringify(f1Rows), "Hotkey search did not filter exactly the actual F1-bound rows");
      check(JSON.stringify(p.settings.actionPreferences) === livePreferences, "Hotkey search changed live preferences");
      input(group.querySelector('[data-kplex-action-search]'), "");
      await until(() => JSON.stringify(f1Matches()) === JSON.stringify(allLocalRows), "Clearing hotkey search did not restore all catalog rows");

      // Search captures both detached interpretations of one native Option press. Saved physical
      // defaults must remain discoverable even when macOS produces a different logical glyph.
      const savedBindings = id => p.settings.actionPreferences.localBindings[id] ?? defaultActionBindings[id] ?? [];
      const physicalOption = ["node.rename", ...catalogActionIds].flatMap(id => savedBindings(id).map(binding => ({id,binding})))
        .find(({binding}) => binding.match === "code" && /^Key[A-Z]$/.test(binding.value) && binding.modifiers.length === 1 && binding.modifiers[0] === "alt");
      check(Boolean(physicalOption), "Actual native Settings has no physical Option-letter binding to search");
      const optionCode = physicalOption.binding.value, optionLetter = optionCode.slice(3), optionDisplay = "⌥ "+optionLetter;
      check([...group.querySelectorAll('[data-action-id="'+physicalOption.id+'"] .setting-hotkey')].some(pill => pill.textContent.trim() === optionDisplay), "Actual physical Option binding lacks its readable native keycap chip");
      await trustedClick(hotkeySearch);
      await until(() => captureArea() === settingsDocument.activeElement, "Option hotkey-search recorder did not focus in its exact Settings document");
      const optionRecorderShell = captureArea().closest(".modal-container");
      check(Boolean(optionRecorderShell), "Exact native Option recorder modal shell unavailable");
      await trustedKey(optionLetter.toLowerCase(),["alt"],settingsOwner,settingsDocument,optionCode);
      const optionReceipt = {...c.lastTrustedKey};
      const optionMatches = allLocalRows.filter(id => savedBindings(id).some(binding => binding.modifiers.length === 1 && binding.modifiers[0] === "alt"
        && (binding.match === "code" ? binding.value === optionCode : binding.value.toLocaleLowerCase() === optionReceipt.key.toLocaleLowerCase())));
      check(optionMatches.includes(physicalOption.id), "Actual effective Option binding disappeared from the search oracle");
      await until(() => !captureArea() && group.querySelector('[data-kplex-action-search]').value === optionDisplay && JSON.stringify(f1Matches()) === JSON.stringify(optionMatches), "Native Option hotkey search did not display readable keycaps and match its actual saved logical/physical bindings");
      await until(() => !optionRecorderShell.isConnected || !optionRecorderShell.getClientRects().length, "Exact native Option recorder shell did not finish retiring before further Settings interaction");
      check(JSON.stringify(p.settings.actionPreferences) === livePreferences, "Option hotkey search changed live preferences");
      input(group.querySelector('[data-kplex-action-search]'), "");
      await until(() => JSON.stringify(f1Matches()) === JSON.stringify(allLocalRows), "Clearing Option hotkey search did not restore all catalog rows");
      c.optionHotkeySearchProof = {actionId:physicalOption.id,physicalCode:optionCode,actualNativeKey:optionReceipt.key,display:optionDisplay,matches:optionMatches,preferencesUnchanged:true};

      // Native global Settings search indexes the declarative catalog even when this group's
      // local query hides its last row. The host may navigate to the result's original page.
      const lastAction = catalogActionIds.at(-1), lastLabel = p.translator("actions."+lastAction);
      input(group.querySelector('[data-kplex-action-search]'), p.translator("actions.pin.toggle"));
      await until(() => group.querySelector('[data-action-id="'+lastAction+'"]')?.classList.contains("kplex-action-filtered"), "Local Settings filter did not hide the last catalog action for the global-search check");
      const globalSearch = app.setting.searchComponent?.inputEl;
      check(globalSearch?.isConnected && globalSearch.ownerDocument === settingsDocument, "Native global Settings SearchComponent unavailable in the exact Settings document");
      await trustedClick(globalSearch);
      await until(() => settingsDocument.activeElement === globalSearch, "Native global Settings search did not receive exact field focus");
      // Electron raw Meta+A does not reliably invoke the macOS selection accelerator. Selection
      // is test setup through the public input API; the replacement input itself must be trusted.
      globalSearch.select();
      check(globalSearch.selectionStart === 0 && globalSearch.selectionEnd === globalSearch.value.length, "Native Settings query selection setup failed");
      await insertNativeText(globalSearch, lastLabel, settingsOwner, settingsDocument, "Native global Settings query");
      const globalResult = () => [...(app.setting.searchResultsEl?.querySelectorAll(".setting-search-result-item") ?? [])].find(element => element.querySelector(".vertical-tab-nav-item-title")?.textContent.trim() === lastLabel && element.getClientRects().length);
      await until(globalResult, "Native global Settings search did not find the final declarative catalog action hidden by local filtering");
      let previousDestinationSnapshot;
      /** Capture bounded native reveal facts without changing scroll, focus, highlighting or the acceptance oracle. */
      const captureGlobalDestination = phase => {
        const page = app.setting.getCurrentPageEl(), destination = page?.querySelector('[data-action-id="'+lastAction+'"]');
        const rect = element => { if (!element) return null; const bounds = element.getBoundingClientRect(); return {top:bounds.top,bottom:bounds.bottom,left:bounds.left,width:bounds.width,height:bounds.height}; };
        const ancestors = [];
        for (let element = destination?.parentElement; element && ancestors.length < 6; element = element.parentElement) ancestors.push({tag:element.tagName,class:element.className,
          scrollTop:element.scrollTop,clientHeight:element.clientHeight,scrollHeight:element.scrollHeight,rect:rect(element)});
        const facts = {viewport:[settingsDocument.defaultView.innerWidth,settingsDocument.defaultView.innerHeight],pageRect:rect(page),
          resultRect:rect(globalResult()),destination:destination ? {class:destination.className,connected:destination.isConnected,
            ownerIsSettings:destination.ownerDocument===settingsDocument,rectCount:destination.getClientRects().length,rect:rect(destination),
            display:settingsDocument.defaultView.getComputedStyle(destination).display,containsFocus:destination.contains(settingsDocument.activeElement)} : null,
          highlightedActionIds:[...(page?.querySelectorAll(".is-flashing") ?? [])].slice(0,6).map(element=>element.closest("[data-action-id]")?.getAttribute("data-action-id") ?? null),
          localQueries:[...(page?.querySelectorAll('[data-kplex-action-search]') ?? [])].map(element=>element.value),
          modalShells:[...settingsDocument.querySelectorAll(".modal-container")].slice(0,4).map(element=>({class:element.className,connected:element.isConnected,rectCount:element.getClientRects().length,rect:rect(element)})),ancestors};
        const serialized = JSON.stringify(facts), trace = c.globalSettingsDestinationTrace ??= [];
        if (phase === "poll" && serialized === previousDestinationSnapshot) return;
        previousDestinationSnapshot = serialized;
        if (trace.length < 40) trace.push({phase,time:performance.now(),...facts});
        else { trace[39] = {phase,time:performance.now(),...facts}; c.globalSettingsDestinationTraceDropped = (c.globalSettingsDestinationTraceDropped ?? 0) + 1; }
      };
      const chosenResult = globalResult();
      /** Observe real event propagation and native result identity without altering delivery. */
      const recordGlobalEvent = (phase,event) => {
        const records = c.globalSettingsResultEvents ??= [];
        if (records.length >= 12) return;
        records.push({phase,time:performance.now(),trusted:event.isTrusted,bubbles:event.bubbles,eventPhase:event.eventPhase,defaultPrevented:event.defaultPrevented,cancelBubble:event.cancelBubble,
          targetClass:event.target?.className,targetConnected:event.target?.isConnected,chosenConnected:chosenResult.isConnected,chosenIsCurrent:chosenResult===globalResult(),
          nativeNavEntryCurrent:app.setting.searchNavItems?.some(item=>item.el===chosenResult),
          path:event.composedPath().slice(0,12).map(node=>({tag:node.tagName,class:typeof node.className==="string"?node.className:null,chosen:node===chosenResult,connected:node.isConnected}))});
      };
      /** Preserve transient native highlight/scroll receipt after the actual click finishes bubbling. */
      const observeGlobalClick = event => {
        if (!chosenResult.contains(event.target)) return;
        recordGlobalEvent("document-capture",event);
        captureGlobalDestination("native-click-capture");
        settingsDocument.defaultView.queueMicrotask(() => captureGlobalDestination("native-click-after-propagation"));
      };
      const observeResultCapture = event => recordGlobalEvent("result-capture",event);
      const observeResultBubble = event => recordGlobalEvent("result-bubble",event);
      const observeDocumentBubble = event => { if (event.composedPath().includes(chosenResult)) recordGlobalEvent("document-bubble",event); };
      captureGlobalDestination("before-click"); settingsDocument.addEventListener("click",observeGlobalClick,true);
      chosenResult.addEventListener("click",observeResultCapture,true); chosenResult.addEventListener("click",observeResultBubble);
      settingsDocument.addEventListener("click",observeDocumentBubble);
      const nativeTab = app.setting.activeTab, lookup = nativeTab?.getElementForDefinition;
      const lookupDescriptor = nativeTab && Object.getOwnPropertyDescriptor(nativeTab,"getElementForDefinition");
      const nativeController = app.setting, navigate = nativeController.navigateToSearchResult;
      const navigateDescriptor = Object.getOwnPropertyDescriptor(nativeController,"navigateToSearchResult");
      if (typeof navigate === "function") nativeController.navigateToSearchResult = function(...args) {
        const records = c.globalSettingsNavigation ??= [];
        if (records.length < 10) records.push({time:performance.now(),receiverMatches:this===nativeController,pagePath:args[0]?.pagePath,definitionName:args[1]?.entry?.definition?.name});
        return navigate.apply(this,args);
      };
      if (typeof lookup === "function") nativeTab.getElementForDefinition = function(definition,...args) {
        const element = lookup.call(this,definition,...args), currentPage = app.setting.getCurrentPageEl(), target = currentPage?.querySelector('[data-action-id="'+lastAction+'"]');
        const bounds = element?.getBoundingClientRect();
        const records = c.globalSettingsNativeLookup ??= [];
        if (records.length < 10) records.push({time:performance.now(),definitionName:definition?.name,returned:Boolean(element),
          class:element?.className,actionId:element?.getAttribute("data-action-id"),connected:element?.isConnected,withinCurrentPage:Boolean(element&&currentPage?.contains(element)),sameAsDestination:element===target,
          rect:bounds?{top:bounds.top,bottom:bounds.bottom,width:bounds.width,height:bounds.height}:null});
        return element;
      };
      try { await trustedClick(chosenResult); } finally {
        settingsDocument.removeEventListener("click",observeGlobalClick,true);
        chosenResult.removeEventListener("click",observeResultCapture,true); chosenResult.removeEventListener("click",observeResultBubble);
        settingsDocument.removeEventListener("click",observeDocumentBubble);
        if (typeof navigate === "function") { if (navigateDescriptor) Object.defineProperty(nativeController,"navigateToSearchResult",navigateDescriptor); else delete nativeController.navigateToSearchResult; }
        if (typeof lookup === "function") { if (lookupDescriptor) Object.defineProperty(nativeTab,"getElementForDefinition",lookupDescriptor); else delete nativeTab.getElementForDefinition; }
      }
      captureGlobalDestination("after-trusted-click");
      await until(() => {
        captureGlobalDestination("poll");
        const destination = app.setting.getCurrentPageEl()?.querySelector('[data-action-id="'+lastAction+'"]');
        if (!destination?.getClientRects().length || destination.classList.contains("kplex-action-filtered") || !destination.classList.contains("is-flashing")) return false;
        const bounds = destination.getBoundingClientRect();
        return bounds.bottom > 0 && bounds.top < settingsDocument.defaultView.innerHeight;
      }, "Native global Settings result did not reveal its visible unfiltered destination action");
      group = app.setting.getCurrentPageEl().querySelector(".kplex-action-settings"); c.ownedSettings = group;
      check(group && group.querySelector('[data-kplex-action-search]').value === "", "Native global result inherited the previous local filter");
      check(JSON.stringify(p.settings.actionPreferences) === livePreferences, "Native global Settings search changed live preferences");
      if (!lastAction.startsWith("composer.")) check(group.querySelector('[data-action-id="'+lastAction+'"] .kplex-action-scope')?.textContent === p.translator("actions.localScopeHint"), "Native global-search destination lost its row-local shortcut scope");
      c.integratedSettingsProof = { gearMainRoot: true, initialRenderReadOnly: true, workflowToggleImmediateSave: true, nativeHotkeyChipMarkup: true, globalLastAction: lastAction, globalResultRevealed: true, globalDestinationHighlighted: true, f1Matches: f1Rows, hotkeySearchReadOnly: true, optionHotkeySearch:true };
      input(group.querySelector('[data-kplex-action-search]'), p.translator("actions.pin.toggle"));
      await until(() => group.querySelector('[data-action-id="pin.toggle"]')?.getClientRects().length, "Manager localized-label search did not find pin action");
      const addBinding = () => group.querySelector('[data-action-id="pin.toggle"] button[aria-label="'+p.translator("actions.addBinding")+'"]');
      check(Boolean(addBinding()), "Accessible recorder trigger missing"); addBinding().scrollIntoView({block:"center"}); addBinding().focus(); await trustedKey("Enter", [], settingsOwner, settingsDocument);
      await until(() => captureArea() === settingsDocument.activeElement, "Native shortcut recording region not focused");
      await trustedKey("Tab", [], settingsOwner, settingsDocument); check(settingsDocument.activeElement !== captureArea(), "Shortcut recorder trapped native Tab traversal");
      await trustedKey("Escape", [], settingsOwner, settingsDocument); await until(() => !captureArea(), "Recorder cancellation did not release native Scope");
      check(JSON.stringify(p.settings.actionPreferences) === livePreferences, "Recorder cancellation changed live keys");
      addBinding().focus(); await trustedKey("Enter", [], settingsOwner, settingsDocument); await until(() => captureArea() === settingsDocument.activeElement, "Second recorder focus failed");
      await trustedKey("F10", ["meta", "shift"], settingsOwner, settingsDocument); await until(() => !captureArea(), "Trusted shortcut did not finish recorder");
      await until(() => p.settings.actionPreferences.localBindings["pin.toggle"]?.some(binding => binding.value === "F10")
        && [...group.querySelectorAll('[data-action-id="pin.toggle"] .setting-hotkey')].some(pill => pill.textContent.includes("F10")), "Recorded physical input did not persist through the immediate native Settings workflow");
      await p.updateActionPreferences(JSON.parse(livePreferences));
      for (const mode of ["code","key"]) {
        addBinding().focus(); await trustedKey("Enter",[],settingsOwner,settingsDocument);
        await until(()=>captureArea()===settingsDocument.activeElement,"Polished recorder initial focus failed");
        const area=captureArea(),shell=area.closest(".modal"),select=shell.querySelector("select");
        check(Boolean(select)&&Boolean(shell.querySelector(".setting-item"))&&Boolean(shell.querySelector(".modal-button-container")),"Recorder lacks native form/action anatomy");
        if(mode==="code") {
          const geometry={bounds:settingsOwner.getBounds(),minimum:settingsOwner.getMinimumSize()};
          try {
            settingsOwner.setMinimumSize(200,150);
            for(const width of [1200,900,390]) {
              settingsOwner.setContentSize(width,875);
              await until(()=>settingsDocument.defaultView.innerWidth===width,"Recorder native viewport resize did not settle",3000);
              let framed=false;settingsDocument.defaultView.requestAnimationFrame(()=>settingsDocument.defaultView.requestAnimationFrame(()=>{framed=true}));await until(()=>framed,"Recorder resize frames did not settle",3000);
              const bounds=shell.getBoundingClientRect(),capture=area.getBoundingClientRect(),actions=shell.querySelector(".modal-button-container");
              check(bounds.left>=-1&&bounds.right<=width+1&&shell.scrollWidth<=shell.clientWidth+2&&capture.height>=40,"Native recorder shell/capture region clipped");
              check([...actions.querySelectorAll("button")].every(button=>{const box=button.getBoundingClientRect();return box.left>=bounds.left-1&&box.right<=bounds.right+1&&box.bottom<=settingsDocument.defaultView.innerHeight;}),"Native recorder footer actions clipped");
              (c.recorderGeometry??=[]).push({viewport:[width,settingsDocument.defaultView.innerHeight],captureHeight:capture.height,horizontalFit:true,nativeSetting:true,nativeActions:true});
            }
          } finally {settingsOwner.setMinimumSize(...geometry.minimum);settingsOwner.setBounds(geometry.bounds);}
        }
        select.focus();select.value=mode;select.dispatchEvent(new settingsDocument.defaultView.Event("change",{bubbles:true}));
        await until(()=>settingsDocument.activeElement===area,"Matching-mode selection did not resume capture automatically");
        await trustedKey("Shift",["shift"],settingsOwner,settingsDocument);
        check(captureArea()===area&&JSON.stringify(p.settings.actionPreferences)===livePreferences,"Shift alone prematurely saved/closed recorder");
        await trustedKey("Alt",["alt","shift"],settingsOwner,settingsDocument);
        check(captureArea()===area&&JSON.stringify(p.settings.actionPreferences)===livePreferences,"Option alone prematurely saved/closed recorder");
        if(mode==="code"&&recorderOSKeys) {
          const viewWindow=settingsDocument.defaultView;
          const focused=/** Fence each requested OS key to the exact unlocked recorder region and native owner. */ ()=>area.isConnected&&settingsDocument.activeElement===area&&settingsOwner.isFocused()&&settingsDocument.hasFocus()&&!settingsDocument.hidden;
          check(focused()&&remote.powerMonitor.getSystemIdleState(10)!=="locked","OS recorder lacks exact unlocked native focus");
          let receipt;
          const request={nonce:c.osKeyNonce=(c.osKeyNonce??0)+1,key:"alt+shift+r",expectedRecorder:true,actualNativeFocus:focused(),window:{id:settingsOwner.id,title:settingsOwner.getTitle()},transport:"OS_CUA",requestedAtEpoch:Date.now(),expiresAtEpoch:Date.now()+60000};
          const observe=/** Keep only bounded trusted modifier/chord facts on the current exact recorder request. */ event=>{
            if(c.osKeyRequest!==request||!event.isTrusted||event.target!==area||!focused()||event.repeat||event.isComposing||event.getModifierState("AltGraph")||remote.powerMonitor.getSystemIdleState(10)==="locked")return;
            if((c.recorderOSSequence??=[]).length<16)c.recorderOSSequence.push({key:event.key,code:event.code,alt:event.altKey,shift:event.shiftKey,trusted:event.isTrusted});
            if(event.code!=="KeyR"||!event.altKey||!event.shiftKey||event.ctrlKey||event.metaKey)return;
            receipt={key:event.key,code:event.code,ctrl:event.ctrlKey,meta:event.metaKey,alt:event.altKey,shift:event.shiftKey,trusted:event.isTrusted,transport:"OS_CUA"};c.lastTrustedKey=receipt;
          };
          viewWindow.addEventListener("keydown",observe,true);const release=/** Retire this exact native listener on success, timeout or driver cleanup. */ ()=>viewWindow.removeEventListener("keydown",observe,true);c.releaseOSKeyListener=release;
          c.clearOSKeyRequest=()=>{c.osKeyRequest=null;c.releaseOSKeyListener?.();c.releaseOSKeyListener=null;};c.osKeyRequest=request;
          try{await until(()=>receipt,"Requested OS Shift+Option recorder chord did not arrive",60000);(c.osKeyProofs??=[]).push({...request,event:receipt});c.trustedOSKeys=(c.trustedOSKeys??0)+1;}
          finally{release();if(c.releaseOSKeyListener===release)c.releaseOSKeyListener=null;if(c.osKeyRequest===request)c.osKeyRequest=null;}
        } else await trustedKey("r",["alt","shift"],settingsOwner,settingsDocument,"KeyR");
        const receipt={...c.lastTrustedKey};
        await until(()=>!captureArea(),"Shift+Option+R did not finish native recorder");
        // Logical single characters are normalized by captureActionBinding; Shift remains in the modifier mask.
        await until(()=>p.settings.actionPreferences.localBindings["pin.toggle"]?.some(binding=>binding.match===mode&&binding.modifiers.includes("alt")&&binding.modifiers.includes("shift")&&binding.value===(mode==="code"?"KeyR":receipt.key.length===1?receipt.key.toLowerCase():receipt.key)),"Native Shift+Option chord was not saved with selected matching semantics");
        (c.recorderPolishProof??=[]).push({mode,autoResumed:true,modifierOnlyIgnored:true,event:receipt,nativeForm:true});
        await p.updateActionPreferences(JSON.parse(livePreferences));
      }
      addBinding().focus();await trustedKey("Enter",[],settingsOwner,settingsDocument);
      await until(()=>captureArea()===settingsDocument.activeElement,"Physical accent recorder did not focus");
      const accentArea=captureArea(),accentShell=accentArea.closest(".modal");check(accentShell.querySelector("select").value==="code","Recorder no longer defaults to physical matching");
      const accentEvent=new settingsDocument.defaultView.KeyboardEvent("keydown",{key:"Dead",code:"KeyE",altKey:true,shiftKey:true,bubbles:true,cancelable:true});accentArea.dispatchEvent(accentEvent);
      await until(()=>!captureArea()&&p.settings.actionPreferences.localBindings["pin.toggle"]?.some(binding=>binding.match==="code"&&binding.value==="KeyE"&&binding.modifiers.join(",")==="alt,shift"),"Owned native recorder failed synthetic physical accent protocol");
      c.physicalAccentRecordingProof={transport:"synthetic_DOM_in_native_Obsidian",code:"KeyE",key:"Dead",modifiers:["alt","shift"],defaultPrevented:accentEvent.defaultPrevented};check(accentEvent.defaultPrevented,"Recorded physical accent was not consumed");
      await p.updateActionPreferences(JSON.parse(livePreferences));
      await c.closeSettings();
      check(await p.revealActionSurface(c.surfaceId), "Graph could not be revealed after native Settings closed");
      remote.app.show(); remote.app.focus({steal:true}); nativeWindow.show(); nativeWindow.focus(); nativeWindow.webContents.focus();
      await until(() => remote.powerMonitor.getSystemIdleState(10) !== "locked" && nativeWindow.isFocused() && document.hasFocus() && !document.hidden, "Main graph foreground was not restored after native Settings closed", 5000);
      const launchRoot = c.hostLeaf.view.containerEl.querySelector(".kplex-app"); launchRoot.focus();
      await until(() => document.activeElement === launchRoot && p.isKplexLeafVisible(c.hostLeaf), "Graph launch focus missing after native Settings closed");
      const outcome = await p.actionManager.dispatch({ id: "actions.open", source: "toolbar", surfaceId: c.surfaceId });
      check(outcome.status === "opened", "Local action menu unreachable");
      const suggest = document.querySelector(".modal-container .prompt"); check(Boolean(suggest), "Native action picker shell missing");
      c.commandPaletteGeometry=await paletteGeometry(suggest,".prompt-results","Command palette");
      key(suggest.querySelector("input"), "Escape"); await until(() => !document.querySelector(".modal-container .prompt"), "Action picker Escape failed");
      check(await p.revealActionSurface(c.surfaceId), "Exact graph could not be revealed for native action-menu choice");
      const graphRoot = c.hostLeaf.view.containerEl.querySelector(".kplex-app"); graphRoot.focus();
      await until(() => document.activeElement === graphRoot && p.isKplexLeafVisible(c.hostLeaf), "Native menu-choice graph launch focus missing");
      const choice = await p.actionManager.dispatch({ id: "actions.open", source: "toolbar", surfaceId: c.surfaceId });
      check(choice.status === "opened", "Native action-menu choice session unavailable");
      const picker = document.querySelector(".modal-container .prompt"), field = picker?.querySelector("input");
      check(picker && field, "Native action-menu choice input missing");
      c.ownedActionPicker = picker;
      await until(() => document.activeElement === field, "Native action-menu choice input not focused");
      check(p.actionManager.sessions.has(choice.sessionId), "Originating action-menu session was not retained");
      const label = p.translator("actions.graph.focus");
      await insertNativeText(field, label, nativeWindow, document, "Native action-menu query");
      await until(() => { const rows = picker.querySelectorAll(".suggestion-item"); return rows.length === 1 && rows[0].querySelector(".suggestion-title")?.textContent === label && rows[0].classList.contains("is-selected"); }, "Exact localized graph-focus menu choice was not selected");
      const priorChoices = c.prepared.filter(record => record.id === "graph.focus" && record.source === "local-menu").length;
      await trustedKey("Enter");
      await until(() => !picker.isConnected && document.activeElement === graphRoot && !p.actionManager.sessions.has(choice.sessionId)
        && c.prepared.filter(record => record.id === "graph.focus" && record.source === "local-menu" && record.outcome === "completed").length === priorChoices + 1, "Native action-menu choice did not close, release its session and focus the exact graph");
      check(p.actionManager.check({ id: "actions.open", source: "toolbar", surfaceId: c.surfaceId }).state !== "disabled", "Native action-menu choice retained the originating single-flight guard");
      check(c.prepared.filter(record => record.id === "graph.focus" && record.source === "local-menu" && record.outcome === "completed").length === priorChoices + 1, "Native action-menu choice did not execute graph.focus exactly once");
      c.menuChoiceProof = { trustedInput: true, trustedEnter: true, pickedCatalogAction: "graph.focus", exactGraphFocused: document.activeElement === graphRoot, pickerDisconnected: !picker.isConnected, originatingSessionReleased: !p.actionManager.sessions.has(choice.sessionId) };
      c.ownedActionPicker = null;
    });
    await scenario("H12-H13-native-embedded-editor-and-focus-transfers", async () => {
      await center(c.a.path);
      await p.actionManager.dispatch({ id: "view.center-editor.toggle", source: "toolbar", surfaceId: c.surfaceId });
      const root = () => c.hostLeaf.view.containerEl.querySelector(".kplex-app");
      await until(() => root()?.querySelector(".kplex-central-editor-content .cm-content"), "Embedded editor did not mount");
      let graphKeys = 0; const prepare = p.actionManager.prepare;
      p.actionManager.prepare = function (request) { if (request.id.startsWith("selection.") || request.id.startsWith("relationship.create-") || request.id === "find.focus") graphKeys++; return prepare.call(this, request); };
      try {
        check(await p.revealActionSurface(c.surfaceId), "Exact owned graph surface could not be revealed");
        root().focus();
        await until(() => document.activeElement === root() && p.isKplexLeafVisible(c.hostLeaf), "Owned graph not actually focused before native arrow");
        await trustedKey("Down"); check(graphKeys > 0, "Graph keys disabled merely because embedded editor exists");
        const selected = p.actionManager.readSnapshot(c.surfaceId).selected;
        const editor = root().querySelector(".kplex-central-editor-content .cm-content");
        /** Exercise the actual editor-focus action and await its exact native Markdown ownership. */
        const focusEmbeddedEditor = async () => {
          await trustedKey("F3", ["shift"]);
          await until(() => editor === document.activeElement && app.workspace.activeLeaf?.view.getViewType() === "markdown" && app.workspace.activeLeaf.view.containerEl.contains(editor), "Supported editor.focus shortcut did not focus embedded native editor");
        };
        await focusEmbeddedEditor(); graphKeys = 0;
        await trustedKey("Down"); await trustedKey("Down", ["meta"]); check(graphKeys === 0 && !composer(), "Embedded editor native arrow opened/moved graph");
        check(JSON.stringify(p.actionManager.readSnapshot(c.surfaceId).selected) === JSON.stringify(selected), "Editor navigation changed graph selection");
        /** Observe native finder structure and bounded Scope ownership without recording document text. */
        const findFacts = phase => {
          const scopes = []; let scope = app.keymap.getWindowStack(window).scope;
          for (let depth = 0; scope && depth < 6; depth++, scope = scope.parent) scopes.push({
            depth, isHostScope: scope === c.hostLeaf.view.scope, isOutsideScope: scope === c.editorLeaf.view.scope, isActiveViewScope: scope === app.workspace.activeLeaf?.view.scope,
            keys: scope.keys?.filter(item => item.key?.toLocaleLowerCase() === "f" || item.key === null).map(item => ({ key: item.key, modifiers: item.modifiers, handler: String(item.func ?? item.callback).slice(0, 1600) })),
          });
          (c.findDiagnostics ??= []).push({ phase, scopes, activeClass: document.activeElement?.className,
            activeTag: document.activeElement?.tagName, activeLeafIsHost: app.workspace.activeLeaf === c.hostLeaf,
            activeLeafIsOutside: app.workspace.activeLeaf === c.editorLeaf,
            activeViewType: app.workspace.activeLeaf?.view.getViewType(), activeNativeViewContainsFocus: Boolean(app.workspace.activeLeaf?.view.containerEl.contains(document.activeElement)),
            inputs: [...document.querySelectorAll('input, .cm-search, .document-search-container, .document-search-input')].slice(0, 50).map(element => ({ tag: element.tagName, class: element.className, type: element.type, focused: element === document.activeElement, insideOwnedGraph: root().contains(element), visible: Boolean(element.getClientRects().length) })),
          });
        };
        findFacts("embedded-before");
        await trustedKey("f", ["meta"]); check(graphKeys === 0, "Embedded editor Mod+F invoked Plex Find");
        check(!root().querySelector(".kplex-find-input") || document.activeElement !== root().querySelector(".kplex-find-input"), "Editor find transferred into Plex Find");
        try { await until(() => [...root().querySelectorAll(".document-search-container input")].some(element => element === document.activeElement), "Native embedded-editor Find did not open"); }
        catch (error) { findFacts("embedded-timeout"); throw error; }
        await trustedKey("Escape"); findFacts("native-find-after-escape"); await focusEmbeddedEditor();
        const clipboard = require("electron").clipboard, marker = `Kplex-native-paste-${Date.now()}`, priorClipboard = {};
        for (const [format, read] of [["text", "readText"], ["html", "readHTML"], ["rtf", "readRTF"]]) { const value = clipboard[read](); if (value) priorClipboard[format] = value; }
        const priorImage = clipboard.readImage(); if (!priorImage.isEmpty()) priorClipboard.image = priorImage;
        const priorBookmark = clipboard.readBookmark(); if (priorBookmark.title) { priorClipboard.bookmark = priorBookmark.title; priorClipboard.text ??= priorBookmark.url; }
        c.restoreClipboard = () => { if (Object.keys(priorClipboard).length) clipboard.write(priorClipboard); else clipboard.clear(); };
        try {
          const ownedNativeLeaf = app.workspace.activeLeaf;
          check(ownedNativeLeaf?.view.getViewType() === "markdown" && ownedNativeLeaf.view.file === c.a && ownedNativeLeaf.view.containerEl.contains(editor), "Clipboard oracle lacks the exact owned native Markdown model");
          /** Query the owned native editor model, avoiding virtualized CodeMirror DOM as a durable text oracle. */
          const modelContainsMarker = leaf => Boolean(leaf?.view.file === (leaf === c.editorLeaf ? c.b : c.a) && leaf.view.editor?.getValue().includes(marker));
          /** Record bounded input/focus/Scope facts and marker booleans only; never include clipboard or document text. */
          const clipboardFacts = (phase, leaf, element) => {
            const scopes = []; let scope = app.keymap.getWindowStack(window).scope;
            for (let depth = 0; scope && depth < 6; depth++, scope = scope.parent) scopes.push({ depth, isActiveViewScope: scope === app.workspace.activeLeaf?.view.scope,
              keys: scope.keys?.filter(item => item.key === null || ["v", "c", "z"].includes(item.key?.toLocaleLowerCase())).map(item => ({ key: item.key, modifiers: item.modifiers })) });
            (c.clipboardDiagnostics ??= []).push({ phase, modelContainsMarker: modelContainsMarker(leaf), renderedContainsMarker: Boolean(element?.textContent.includes(marker)),
              clipboardContainsMarker: clipboard.readText() === marker, activeViewType: app.workspace.activeLeaf?.view.getViewType(), activeNativeLeafIsExpected: app.workspace.activeLeaf === leaf,
              activeNativeViewContainsFocus: Boolean(app.workspace.activeLeaf?.view.containerEl.contains(document.activeElement)), activeClass: document.activeElement?.className,
              trustedKey: c.lastTrustedKey ? { ...c.lastTrustedKey } : null, graphKeyPreparations: graphKeys, scopes });
          };
          clipboard.writeText(marker); await trustedKey("End", ["meta"]); await clipboardKey("v", ownedNativeLeaf, editor);
          clipboardFacts("owned-after-paste-key", ownedNativeLeaf, editor);
          try { await until(() => modelContainsMarker(ownedNativeLeaf), "Native editor paste was blocked"); }
          catch (error) {
            clipboardFacts("owned-paste-timeout", ownedNativeLeaf, editor);
            try {
              await app.workspace.revealLeaf(c.editorLeaf); c.editorLeaf.view.editor?.focus();
              await until(() => app.workspace.activeLeaf === c.editorLeaf && c.editorLeaf.view.containerEl.contains(document.activeElement), "Owned outside clipboard baseline not focused");
              const outside = c.editorLeaf.view.containerEl.querySelector(".cm-content");
              clipboard.writeText(marker); clipboardFacts("outside-before-paste-key", c.editorLeaf, outside);
              await trustedKey("End", ["meta"]); await clipboardKey("v", c.editorLeaf, outside);
              await until(() => modelContainsMarker(c.editorLeaf), "Outside native editor clipboard baseline paste was blocked").catch(baselineError => { c.clipboardBaselineError = String(baselineError); });
              clipboardFacts("outside-after-paste-key", c.editorLeaf, outside);
            } catch (baselineError) { c.clipboardBaselineError = String(baselineError); }
            throw error;
          }
          await clipboardKey("a", ownedNativeLeaf, editor); await clipboardKey("c", ownedNativeLeaf, editor);
          await until(() => clipboard.readText().includes(marker), "Native editor copy was blocked");
          await clipboardKey("z", ownedNativeLeaf, editor); await until(() => !modelContainsMarker(ownedNativeLeaf), "Native editor undo was blocked");
          check(graphKeys === 0, "Native editing keys triggered graph actions");
        } finally { c.restoreClipboard(); c.restoreClipboard = null; }
        await focusEmbeddedEditor(); await trustedKey("F4");
        await until(() => root().querySelector('input[aria-label="'+p.translator("search.ariaLabel")+'"]') === document.activeElement, "F4 did not transfer from editor to vault search");
        await trustedKey("Escape");
        await p.actionManager.dispatch({ id: "graph.focus", source: "toolbar", surfaceId: c.surfaceId }); check(document.activeElement === root(), "Explicit graph focus failed");
      } finally { p.actionManager.prepare = prepare; }
      await p.actionManager.dispatch({ id: "view.center-editor.toggle", source: "toolbar", surfaceId: c.surfaceId });
      await until(() => !root().querySelector(".kplex-central-editor-content"), "Embedded editor did not release");
    });

    await scenario("H13-native-preview-and-drawing-editor-focus", async () => {
      const root = () => c.hostLeaf.view.containerEl.querySelector(".kplex-app");
      // The isolated diagnostic has no preceding creation/edit scenarios to establish its source-mode baseline.
      if (diagnosticH13Only) {
        Object.assign(p.settings, { centralNodeMarkdownMode: "source", embedCentralNode: false });
        check(await p.revealActionSurface(c.surfaceId), "Isolated mode diagnostic could not reveal its owned graph");
      }
      await center(c.a.path);
      await p.actionManager.dispatch({ id: "view.center-editor.toggle", source: "toolbar", surfaceId: c.surfaceId });
      await until(() => root().querySelector(".kplex-central-editor-content .cm-content")?.getClientRects().length, "Owned native source editor did not mount for mode focus checks");
      /** Focus the graph deliberately, then test the supported trusted keyboard transfer to its exact native representation. */
      const enterRepresentation = async (type, predicate, label) => {
        check(await p.revealActionSurface(c.surfaceId), "Exact native representation surface could not be revealed"); root().focus();
        await until(() => document.activeElement === root() && p.isKplexLeafVisible(c.hostLeaf), "Native representation graph focus missing");
        await trustedKey("F3", ["shift"]);
        await until(() => {
          const mount = root().querySelector(".kplex-central-editor-leaf-host"), nativeLeaf = app.workspace.activeLeaf, focused = document.activeElement;
          return nativeLeaf !== c.hostLeaf && nativeLeaf !== c.editorLeaf && nativeLeaf?.view.getViewType() === type
            && mount?.contains(focused) && nativeLeaf.view.containerEl.contains(focused) && focused?.getClientRects().length && predicate(nativeLeaf.view, focused);
        }, label);
        const nativeLeaf = app.workspace.activeLeaf;
        (c.representationFocusProof ??= []).push({ type, activeClass: document.activeElement.className, nativeViewOwnsFocus: nativeLeaf.view.containerEl.contains(document.activeElement),
          insideOwnedMount: root().querySelector(".kplex-central-editor-leaf-host").contains(document.activeElement), unrelatedEditorRetained: c.editorLeaf.view.file === c.b });
        check(c.editorLeaf.view.file === c.b, "Native representation focus adopted the unrelated editor");
        return nativeLeaf;
      };
      c.nativeModeLeaf = await enterRepresentation("markdown", (_view, focused) => focused.matches(".cm-content"), "Native source focus missing before reading-mode diagnostic");
      /** Capture only public native mode and bounded element identity/geometry, excluding file/document contents. */
      c.captureNativeMode = () => {
        const mount = root()?.querySelector(".kplex-central-editor-leaf-host"), leaf = c.nativeModeLeaf, view = leaf?.view;
        const elementFacts = element => element ? { tag: element.tagName, class: element.className, connected: element.isConnected,
          clientRects: element.getClientRects().length, insideOwnedMount: Boolean(mount?.contains(element)), containsFocus: element.contains(document.activeElement) } : null;
        const ownedLeaves = new Set([...app.workspace.getLeavesOfType("markdown"), ...app.workspace.getLeavesOfType("excalidraw"), leaf]);
        return { type: view?.getViewType(), mode: view?.getMode?.(), stateMode: view?.getState?.().mode, nativeLeafWorking: leaf?.working,
          currentFileIsOwnedOrigin: view?.file === c.a, nativeView: elementFacts(view?.containerEl), previewContainer: elementFacts(view?.previewMode?.containerEl), previewEl: elementFacts(view?.previewMode?.previewEl),
          sourceContainer: elementFacts(view?.sourceMode?.containerEl), sourceEditor: elementFacts(view?.containerEl.querySelector(".cm-content")),
          leafList: [...ownedLeaves].filter(item => item && (item === leaf || mount?.contains(item.view.containerEl))).slice(0, 6).map(item => ({ type: item.view.getViewType(), mode: item.view.getMode?.(), stateMode: item.view.getState?.().mode, container: elementFacts(item.view.containerEl) })) };
      };
      /** Observe only the captured owned native leaf's mode calls, retaining each original return and receiver. */
      const traceNativeModeMethod = (owner, method) => {
        const descriptor = Object.getOwnPropertyDescriptor(owner, method), original = owner[method];
        check(typeof original === "function", `Owned native ${method} is unavailable`);
        const functionSource = String(original).slice(0, 4500);
        const replacement = function (...args) {
          const requested = method === "setViewState" ? args[0] : { state: args[0] };
          const record = { method, requestedType: requested?.type, requestedMode: requested?.state?.mode,
            requestedOwnedFile: requested?.state?.file === c.a.path, receiverIsCaptured: this === owner,
            functionSource, stack: new Error().stack?.split("\n").slice(1, 10).join("\n").slice(0, 4500), before: c.captureNativeMode() };
          (c.nativeModeCalls ??= []).push(record);
          let result;
          try { result = original.apply(this, args); }
          catch (error) { record.threw = String(error); record.after = c.captureNativeMode(); throw error; }
          if (result && typeof result.then === "function") {
            void result.then(() => { record.settled = "fulfilled"; record.after = c.captureNativeMode(); }, error => { record.settled = "rejected"; record.error = String(error); record.after = c.captureNativeMode(); });
          } else { record.settled = "synchronous"; record.after = c.captureNativeMode(); }
          return result;
        };
        owner[method] = replacement;
        c.wrappers.push(() => { if (owner[method] === replacement) { if (descriptor) Object.defineProperty(owner, method, descriptor); else delete owner[method]; } });
      };
      traceNativeModeMethod(c.nativeModeLeaf, "setViewState");
      traceNativeModeMethod(c.nativeModeLeaf.view, "setState");
      (c.nativeModeTimeline ??= []).push({ phase: "source-before-mode-control", ...c.captureNativeMode() });
      // Native openFile mounts CodeMirror before its async completion commits documentView and the React mode toolbar.
      const preview = () => root().querySelector('button[aria-label="'+p.translator("centralEditor.showPreview")+'"]');
      await until(() => preview()?.getClientRects().length && !preview().disabled, "Native Markdown preview toggle missing"); preview().click();
      await until(() => { const view = c.nativeModeLeaf.view, container = view.previewMode?.containerEl; return view.getMode() === "preview" && container?.isConnected && container.getClientRects().length && root().querySelector(".kplex-central-editor-leaf-host")?.contains(container); }, "Owned Markdown reading representation did not mount");
      (c.nativeModeTimeline ??= []).push({ phase: "reading-mode-ready", ...c.captureNativeMode() });
      await enterRepresentation("markdown", (view, focused) => view.getMode() === "preview" && Boolean(view.previewMode?.containerEl?.contains(focused)), "Trusted editor.focus did not enter exact native Markdown preview");
      (c.nativeModeTimeline ??= []).push({ phase: "reading-mode-focused", ...c.captureNativeMode() });
      const source = () => root().querySelector('button[aria-label="'+p.translator("centralEditor.showEditor")+'"]');
      await until(() => source()?.getClientRects().length && !source().disabled, "Owned native source-mode restore control missing"); source().click();
      await until(() => root().querySelector(".cm-content")?.getClientRects().length, "Owned source mode was not restored after preview");
      const companion = app.plugins.plugins["obsidian-excalidraw-plugin"];
      if (companion?.createDrawing) {
        c.companion = companion; c.originalCompanionSettings = JSON.parse(JSON.stringify(companion.settings));
        check(!document.querySelector(".modal-container .modal,.modal-container .prompt"), "Unowned modal present before drawing fixture");
        /** Close only a rank modal opened by this exact owned drawing creation, including cancelled-driver cleanup. */
        c.closeCompanionDialog = async () => {
          const modal = c.ownedCompanionDialog; if (!modal?.isConnected) return;
          await until(() => remote.powerMonitor.getSystemIdleState(10) !== "locked" && nativeWindow.isFocused() && document.hasFocus() && !document.hidden, "Owned companion modal cleanup lost unlocked foreground", 5000, true);
          nativeWindow.webContents.sendInputEvent({ type: "keyDown", keyCode: "Escape" }); nativeWindow.webContents.sendInputEvent({ type: "keyUp", keyCode: "Escape" });
          await until(() => !modal.isConnected, "Owned companion rank modal did not close", 15000, true);
        };
        const created = await companion.createDrawing("Focus-acceptance.excalidraw.md", c.folder);
        const file = typeof created === "string" ? app.vault.getFileByPath(created) : created;
        check(file?.path.startsWith(c.folder + "/"), "Companion drawing escaped owned fixture folder"); c.owned.push(file.path);
        c.ownedCompanionDialog = document.querySelector(".modal-container.excalidraw-release .modal:has(.excalidraw-rank)"); await c.closeCompanionDialog();
        await until(() => app.metadataCache.getFileCache(file), "Owned drawing metadata did not settle"); p.index.insertCreatedFile(file); await p.index.publishHostMetadataPreview(file.path);
        await center(file.path);
        await until(() => root().querySelector(".excalidraw")?.getClientRects().length, "Owned embedded drawing did not mount");
        const nativeLeaf = await enterRepresentation("excalidraw", (_view, focused) => focused.matches(".excalidraw"), "Trusted editor.focus did not enter exact native drawing");
        await until(() => Boolean(nativeLeaf.view.excalidrawAPI), "Owned native drawing API did not finish initialization");
        // Repeat after actual native initialization so startup autofocus cannot satisfy the action oracle.
        const repeated = await enterRepresentation("excalidraw", (view, focused) => view === nativeLeaf.view && focused.matches(".excalidraw"), "Initialized native drawing did not accept keyboard editor.focus");
        check(repeated === nativeLeaf, "Repeated drawing focus selected another native leaf");
      } else c.drawingFocusUnavailable = "Enabled Excalidraw companion createDrawing API is absent";
      await center(c.a.path);
      await p.actionManager.dispatch({ id: "view.center-editor.toggle", source: "toolbar", surfaceId: c.surfaceId });
      await until(() => !root().querySelector(".kplex-central-editor-content"), "Mode focus checks did not release owned editor");
    });

    await scenario("H15-H20-sidebar-native-focus-and-surface-routing", async () => {
      const before = new Set(app.workspace.getLeavesOfType("k-plex-sidepanel-view"));
      await p.activateSidepanel();
      await until(() => [...p.actionSurfaceHosts].some(([, registration]) => registration.leaf !== c.hostLeaf && registration.leaf.view.getViewType() === "k-plex-sidepanel-view"), "Sidebar action surface unavailable");
      const entry = [...p.actionSurfaceHosts].find(([, registration]) => registration.leaf.view.getViewType() === "k-plex-sidepanel-view");
      const sidebar = entry[1].leaf; if (!before.has(sidebar)) c.newLeaves.push(sidebar);
      const root = sidebar.view.containerEl.querySelector(".kplex-app");
      // A newly mounted sidebar starts at the active document. Establish the owned center after activation.
      await center(c.a.path);
      await until(() => root.querySelector(".kplex-role-center")?.dataset.kplexPath === c.a.path
        && p.actionManager.readSnapshot(entry[0])?.center?.path === c.a.path, "Sidebar owned origin A was not rendered and captured");
      app.workspace.setActiveLeaf(c.editorLeaf, { focus: true }); root.focus();
      await until(() => document.activeElement === root && p.isKplexLeafVisible(sidebar), "Sidebar graph not actually focused before native arrow");
      check(app.workspace.getActiveFile() === c.b, "Sidebar test did not retain external editor workspace context");
      check(p.actionManager.readSnapshot(entry[0]).center.path === c.a.path, "Sidebar fixture lost owned center A before selection");
      let local = 0; const prepare = p.actionManager.prepare;
      p.actionManager.prepare = function (request) { if (request.id === "selection.move.down" && request.surfaceId === entry[0]) local++; return prepare.call(this, request); };
      try { await trustedKey("Down"); check(local === 1, "Sidebar native key did not execute exactly once in its actual focused region"); }
      finally { p.actionManager.prepare = prepare; }
      const snapshot = p.actionManager.readSnapshot(entry[0]); check(snapshot.selected, "Sidebar selection missing");
      check(snapshot.center.path === c.a.path && snapshot.selected.path !== c.a.path, "Sidebar routing fixture lacks distinct center A and selection");
      command("kplex-add-child"); const modal = await awaitComposer(); check(modal.querySelector(".modal-title").textContent.includes("Origin-A"), "Background command changed origin to selection/editor"); await closeComposer();
    });

    await scenario("H22-H23-saved-pin-slots-history-boundaries-and-missing-targets", async () => {
      p.settings.pinnedNodes = [c.a.path, `${c.folder}/Missing-pin.md`, c.target.path];
      c.hostLeaf.view.containerEl.querySelector(".kplex-app")?.focus();
      const slot = await p.actionManager.dispatch({ id: "pin.open-slot.3", source: "toolbar", surfaceId: c.surfaceId }); check(slot.status === "completed", "Pin slot3 unavailable");
      await until(() => p.settings.lastActivePath === c.target.path, "Missing earlier pin shifted slot3");
      const before = c.created.length;
      const missing = await p.actionManager.dispatch({ id: "pin.open-slot.2", source: "toolbar", surfaceId: c.surfaceId }); check(missing.status === "unavailable", "Missing pin slot was redirected"); check(c.created.length === before, "Missing pin materialized a file");
      // A new native surface starts at the deliberately bounded history fixture.
      p.settings.navigationHistory = [c.a.path]; p.settings.lastActivePath = c.a.path;
      const leaf = app.workspace.getLeaf("tab"); c.newLeaves.push(leaf); await leaf.setViewState({ type: "k-plex-react-view", active: true }); await app.workspace.revealLeaf(leaf);
      await until(() => [...p.actionSurfaceHosts].some(([, registration]) => registration.leaf === leaf), "Second surface not registered");
      const id = [...p.actionSurfaceHosts].find(([, registration]) => registration.leaf === leaf)[0], root = leaf.view.containerEl.querySelector(".kplex-app"); root.focus();
      await trustedKey("Backspace"); check(p.settings.lastActivePath === c.a.path, "History boundary triggered unrelated navigation");
      p.settings.navigationHistory = [c.a.path, `${c.folder}/Missing-history.md`];
      const opened = await p.actionManager.dispatch({ id: "history.open", source: "toolbar", surfaceId: id }); check(opened.status === "opened", "Complete history picker unavailable");
      const prompt = document.querySelector(".modal-container .prompt"); check(Boolean(prompt), "Native history picker missing");
      input(prompt.querySelector("input"), "Missing-history"); await until(() => prompt.querySelector(".suggestion-item"), "Missing history row vanished");
      await trustedKey("Enter"); await delay(50); check(!app.vault.getFileByPath(`${c.folder}/Missing-history.md`) && c.created.length === before, "History visit materialized missing target");
      await trustedKey("Escape"); await until(() => !document.querySelector(".modal-container .prompt"), "History picker scope not released");
    });

    await scenario("H19-native-popout-migration-retires-old-generation", async () => {
      check(typeof app.workspace.moveLeafToPopout === "function", "Native migration capability unavailable");
      for (let iteration = 0; iteration < 2; iteration++) {
      captureWindowLifecycle("before-owned-popout-move-"+iteration);
      const old = p.actionSurfaceHosts.get(c.surfaceId), mainTabs = c.editorLeaf.parent;
      check(old?.leaf === c.hostLeaf, "Owned main migration registration missing");
      const before = new Set(app.workspace.getLeavesOfType("k-plex-react-view"));
      app.workspace.moveLeafToPopout(c.hostLeaf);
      const moved = () => app.workspace.getLeavesOfType("k-plex-react-view").find(leaf => leaf.view.containerEl.ownerDocument !== document && (leaf === c.hostLeaf || !before.has(leaf)));
      await until(moved, "Owned native migration did not reach another document");
      let popout = moved(); c.newLeaves.push(popout);
      // Reparenting moves the old React DOM first; native migration then unmounts it and registers its successor.
      await until(() => !p.isActionSurfaceCurrent(c.surfaceId, old.generation)
        && [...p.actionSurfaceHosts].some(([, registration]) => registration !== old && registration.leaf === popout
          && registration.leaf.view.containerEl.ownerDocument !== document && registration.leaf.view.containerEl.querySelector(".kplex-app")), "Popout successor did not retire the old main generation");
      check(!p.isActionSurfaceCurrent(c.surfaceId, old.generation), "Retired main generation still current after migration");
      const popEntry = [...p.actionSurfaceHosts].find(([, registration]) => registration.leaf === popout), popDocument = popout.view.containerEl.ownerDocument;
      observeNativeWindow(popDocument, "owned-migration-popout-"+iteration);
      const popRoot = popout.view.containerEl.querySelector(".kplex-app"); popRoot.focus();
      const opened = await p.actionManager.dispatch({ id: "actions.open", source: "toolbar", surfaceId: popEntry[0] }); check(opened.status === "opened", "Popout action menu did not open");
      check(popDocument.querySelector(".modal-container .prompt"), "Popout picker mounted in the wrong document");
      const inputElement = popDocument.querySelector(".modal-container .prompt input"); key(inputElement, "Escape"); await until(() => !popDocument.querySelector(".modal-container .prompt"), "Popout picker scope not released");
      captureWindowLifecycle("before-owned-popout-return-"+iteration);
      popout.parent.removeChild(popout); mainTabs.insertChild(mainTabs.children.length, popout);
      // Native onWindowMigrated uses the visible node-inserted animation; insertion alone leaves a background tab hidden.
      await app.workspace.revealLeaf(popout); app.workspace.setActiveLeaf(popout, { focus: true });
      await until(() => popout.view.containerEl.ownerDocument === document && popout.view.containerEl.querySelector(".kplex-app"), "Popout-to-main migration did not restore owning document");
      await until(() => !p.isActionSurfaceCurrent(popEntry[0], popEntry[1].generation)
        && [...p.actionSurfaceHosts].some(([, registration]) => registration !== popEntry[1] && registration.leaf === popout
          && registration.leaf.view.containerEl.ownerDocument === document && registration.leaf.view.containerEl.querySelector(".kplex-app")), "Main successor did not retire the old popout generation");
      check(!p.isActionSurfaceCurrent(popEntry[0], popEntry[1].generation), "Popout generation still active after return migration");
      c.hostLeaf = popout; c.surfaceId = [...p.actionSurfaceHosts].find(([, registration]) => registration.leaf === popout)[0];
      nativeWindow.show(); nativeWindow.focus();
      captureWindowLifecycle("after-owned-popout-return-"+iteration);
      }
      const closeLeaf = app.workspace.getLeaf("window"); c.newLeaves.push(closeLeaf);
      await closeLeaf.setViewState({ type: "k-plex-react-view", active: true });
      const closingBody = closeLeaf.view.containerEl.ownerDocument.body;
      check(closingBody.ownerDocument !== document, "Closing popout readiness must belong to its native document");
      const statusStyle = closingBody.style, statusSetter = statusStyle.setProperty;
      const statusDescriptor = Object.getOwnPropertyDescriptor(statusStyle, "setProperty");
      let nativeStatusUpdates = 0;
      /** Observe the native titlebar's real initial status callback without changing its property values or scheduling. */
      statusStyle.setProperty = function(...args) {
        const result = statusSetter.apply(this, args);
        if (args[0] === "--zoom-factor") nativeStatusUpdates++;
        return result;
      };
      try {
        await app.workspace.revealLeaf(closeLeaf);
        await until(() => [...p.actionSurfaceHosts].some(([, registration]) => registration.leaf === closeLeaf), "Owned closing popout not registered");
        // Action registration precedes native titlebar initialization. Closing during that host
        // initialization races its delayed status callback; a usable window has completed it.
        await until(() => nativeStatusUpdates > 0, "Owned native titlebar initial status did not complete");
        c.nativeTitlebarReadiness = {updates:nativeStatusUpdates,zoomFactor:statusStyle.getPropertyValue("--zoom-factor"),owningDocument:true};
      } finally {
        if (statusDescriptor) Object.defineProperty(statusStyle,"setProperty",statusDescriptor);
        else delete statusStyle.setProperty;
      }
      const closing = [...p.actionSurfaceHosts].find(([, registration]) => registration.leaf === closeLeaf), closingDocument = closeLeaf.view.containerEl.ownerDocument;
      const closingWindow = closingDocument.defaultView, closingNativeId = nativeOwnerForDocument(closingDocument).id;
      observeNativeWindow(closingDocument, "owned-closing-popout"); captureWindowLifecycle("before-owned-native-window-close");
      check(closingDocument !== document && closingNativeId !== nativeWindow.id, "Owned closing popout did not leave main native window");
      const closingOwner = remote.BrowserWindow.fromId(closingNativeId);
      check(typeof closingOwner?.close === "function", "Exact owned native window close operation unavailable");
      // Exercise the same window-close lifecycle as the native titlebar control. Detaching its
      // final leaf is a different host path and previously released Electron before DOM closure.
      closingOwner.close();
      await until(() => !p.isActionSurfaceCurrent(closing[0], closing[1].generation) && !p.actionSurfaceHosts.has(closing[0]), "Closed native window retained its action registration");
      check(!closingDocument.querySelector(".kplex-app"), "Closed native window retained a mounted graph root");
      // Registration retirement alone does not prove that this exact native window is destroyed.
      await until(() => closingWindow.closed && !remote.BrowserWindow.fromId(closingNativeId), "Owned closing popout did not finish native teardown");
      c.nativeWindowCloseProof = {operation:"BrowserWindow.close",nativeWindowId:closingNativeId,registrationRetired:true,rootUnmounted:true,nativeDestroyed:true};
      nativeWindow.show(); nativeWindow.focus();
      captureWindowLifecycle("after-owned-native-window-close");
    });

    await scenario("H17-actual-global-shortcut-retained-through-native-plugin-restart", async () => {
      check(app.hotkeyManager.getHotkeys("k-plex:kplex-add-child")?.some(binding => binding.key === "F9"), "Actual host shortcut fixture missing before restart");
      // Release exact old-instance wrappers before retiring their plugin lifetime.
      for (const release of c.wrappers.reverse()) release(); c.wrappers = [];
      await p.saveSettings(false, false); await p.settingsWriteQueue;
      captureWindowLifecycle("before-first-plugin-restart");
      await app.plugins.disablePlugin("k-plex"); captureWindowLifecycle("after-first-plugin-disable");
      try { await app.plugins.enablePlugin("k-plex"); }
      finally { c.p = app.plugins.plugins["k-plex"] ?? c.p; }
      captureWindowLifecycle("after-first-plugin-enable");
      await until(() => c.p !== p && Boolean(c.p.actionManager), "Native restart did not create a new action manager", 30000);
      await until(() => !c.p.index.building && !c.p.index.hasPendingSnapshotHydration(), "Restart index did not settle", 90000);
      check(c.p.isActionPublished("relationship.create-center.child") && app.commands.commands["k-plex:kplex-add-child"], "Stable native command was not republished after restart");
      check(app.hotkeyManager.getHotkeys("k-plex:kplex-add-child")?.some(binding => binding.key === "F9"), "Native plugin restart removed or changed the assigned global shortcut");
    });

    await scenario("H18-all-character-keys-and-all-publication-disabled-reload-settings-recovery", async () => {
      const current = c.p, reference = JSON.parse(JSON.stringify(current.settings.actionPreferences)), disabled = JSON.parse(JSON.stringify(reference));
      disabled.characterShortcutsEnabled = false;
      for (const action of publishableActions) disabled.publishedCommands[action.id] = false;
      await current.updateActionPreferences(disabled);
      check(current.actionPublisher.registeredIds().length === 0 && !Object.keys(app.commands.commands).some(id => id.startsWith("k-plex:")), "Unpublish all retained actual registered native commands");
      await current.settingsWriteQueue; captureWindowLifecycle("before-all-off-plugin-restart"); await app.plugins.disablePlugin("k-plex");
      captureWindowLifecycle("after-all-off-plugin-disable");
      try { await app.plugins.enablePlugin("k-plex"); }
      finally { c.p = app.plugins.plugins["k-plex"] ?? c.p; }
      captureWindowLifecycle("after-all-off-plugin-enable");
      await until(() => c.p !== current && Boolean(c.p.actionManager), "All-disabled preferences restart did not create a new owner", 30000);
      check(c.p.settings.actionPreferences.characterShortcutsEnabled === false, "Reload restored disabled character shortcut defaults");
      check(publishableActions.every(action => c.p.settings.actionPreferences.publishedCommands[action.id] === false && !c.p.isActionPublished(action.id)), "Reload restored disabled command publication defaults");
      check(c.p.actionPublisher.registeredIds().length === 0 && !Object.keys(app.commands.commands).some(id => id.startsWith("k-plex:")), "Reload registered commands despite all publication disabled");
      check(app.hotkeyManager.getHotkeys("k-plex:kplex-add-child")?.some(binding => binding.key === "F9"), "All-disabled reload lost the retained actual host shortcut");
      c.ownedNativeSettings = true; app.setting.open(); app.setting.openTabById("k-plex");
      const settingsDocument = app.setting.getCurrentPageEl().ownerDocument;
      observeNativeWindow(settingsDocument, "owned-recovery-Settings");
      check(settingsDocument.defaultView === app.setting.win, "Settings recovery document is not owned by the native Settings window");
      const settingRow = () => [...app.setting.getCurrentPageEl().querySelectorAll(".setting-item")].find(row => row.querySelector(".setting-item-name")?.textContent === c.p.translator("actions.settingsTitle"));
      await until(settingRow, "K-Plex Settings recovery page missing with every command disabled");
      const entry = settingRow(); check(entry.classList.contains("mod-navigable"), "Actions and shortcuts Settings page entry is not native navigation");
      entry.scrollIntoView({ block: "center" }); await trustedClick(entry);
      await until(() => settingsDocument.querySelector(".kplex-action-settings .kplex-action-setting"), "Native Settings page could not recover inline controls with character keys and global commands disabled");
      c.ownedSettings = settingsDocument.querySelector(".kplex-action-settings");
      check(c.ownedSettings.querySelector('[data-action-preference="characterShortcutsEnabled"]'), "Inline workflow recovery toggle missing");
      check(publishableActions.every(action => c.ownedSettings.querySelector('[data-action-id="'+action.id+'"] button[aria-label="'+c.p.translator("actions.publishCommand")+'"]')), "Inline command recovery controls missing while all commands disabled");
      await c.p.updateActionPreferences(reference);
      check(c.p.isActionPublished("relationship.create-center.child") && app.commands.commands["k-plex:kplex-add-child"], "Reference preferences did not recover native command publication");
      await c.closeSettings();
      await until(() => !c.p.index.building && !c.p.index.hasPendingSnapshotHydration(), "Final recovery index did not settle", 90000);
    });

    const acceptedPrepareDurations = (c.prepared ?? []).filter(record => record.state === "accepted").map(record => record.durationMs).sort((left, right) => left - right);
    return { scenarios: c.scenarios, createdFiles: c.created.length, prepared: c.prepared ?? [], nativeModeCalls: c.nativeModeCalls ?? [], pointerForegroundTrace: c.pointerForegroundTrace ?? [], windowLifecycle: c.windowLifecycle ?? [], windowLifecycleDropped: c.windowLifecycleDropped ?? 0, nativeModeTimeline: c.nativeModeTimeline ?? [], clipboardKeyTransport: nativeOSKeys ? "OS_CUA" : "Electron_sendInputEvent", osKeyProofs: c.osKeyProofs ?? [], clipboardDiagnostics: c.clipboardDiagnostics ?? [], menuChoiceProof: c.menuChoiceProof, laptopDefaultsProof: c.laptopDefaultsProof, typedSelectionProof: c.typedSelectionProof, typingBadgeGeometry:c.typingBadgeGeometry, recorderPolishProof:c.recorderPolishProof, recorderGeometry:c.recorderGeometry, recorderOSSequence:c.recorderOSSequence, physicalAccentRecordingProof:c.physicalAccentRecordingProof, optionKeyReceipts: c.optionKeyReceipts ?? [], optionHotkeySearchProof:c.optionHotkeySearchProof, globalSettingsDestinationTrace:c.globalSettingsDestinationTrace ?? [], globalSettingsNativeLookup:c.globalSettingsNativeLookup ?? [], globalSettingsResultEvents:c.globalSettingsResultEvents ?? [], globalSettingsNavigation:c.globalSettingsNavigation ?? [], nativeWindowCloseProof:c.nativeWindowCloseProof,nativeTitlebarReadiness:c.nativeTitlebarReadiness, helpPaletteGeometry:c.helpPaletteGeometry, commandPaletteGeometry:c.commandPaletteGeometry, integratedSettingsProof: c.integratedSettingsProof, representationFocusProof: c.representationFocusProof ?? [], drawingFocusUnavailable: c.drawingFocusUnavailable,
      prepareTiming: { description: "Observed synchronous ActionManager.prepare calls only; small native functional sample, excluding async writes, rendering and paint", n: acceptedPrepareDurations.length, p95Ms: acceptedPrepareDurations.length ? acceptedPrepareDurations[Math.ceil(acceptedPrepareDurations.length * 0.95) - 1] : null, maxMs: acceptedPrepareDurations.at(-1) ?? null },
      trustedNativeKeys: c.trustedKeys ?? 0, trustedNativeOSKeys: c.trustedOSKeys ?? 0, trustedNativeChars: c.trustedCharEvents ?? 0, trustedNativeClicks: c.trustedClicks ?? 0, trustedNativeTextInputs: c.trustedTextInputs ?? 0, foreground: { idle: remote.powerMonitor.getSystemIdleState(10), hidden: document.hidden, focused: nativeWindow.isFocused(), throttling: nativeWindow.webContents.getBackgroundThrottling() } };
  };
  c.timer = window.setTimeout(() => { c.task = run().then(value => { c.done = true; c.value = value; }, error => {
    const modal = c.ownedComposer, dialog = [...c.p.actionDialogs.keys()].find(item => item.modalEl === modal) ?? c.ownedComposerDialog;
    c.done = true; c.error = String(error);
    try {
    c.failureSnapshot = { createdCount: c.created.length, modalConnected: modal?.isConnected,
      nativeMode: c.captureNativeMode?.(), pointerForegroundTrace: c.pointerForegroundTrace, windowLifecycle: c.windowLifecycle, globalSettingsDestinationTrace:c.globalSettingsDestinationTrace,globalSettingsNativeLookup:c.globalSettingsNativeLookup,globalSettingsResultEvents:c.globalSettingsResultEvents,globalSettingsNavigation:c.globalSettingsNavigation,
      nativeSettings: c.ownedNativeSettings ? { isOpen: app.setting.isOpen, lastAction: catalogActionIds.at(-1), pagePaths: app.setting.pageStack?.map(item => item.page?.pagePath),
        localQueries: [...(app.setting.getCurrentPageEl()?.querySelectorAll('[data-kplex-action-search]') ?? [])].map(search => search.value),
        visibleActionIds: [...(app.setting.getCurrentPageEl()?.querySelectorAll(".kplex-action-setting") ?? [])].filter(row => !row.classList.contains("kplex-action-filtered")).map(row => row.dataset.actionId),
        globalQuery: app.setting.searchComponent?.inputEl?.value, globalResults: [...(app.setting.searchResultsEl?.querySelectorAll(".vertical-tab-nav-item-title") ?? [])].slice(0,10).map(title => title.textContent) } : null,
      editorUi: { configuredMode: c.p.settings.centralNodeMarkdownMode,
        toolbarLabels: [...(c.hostLeaf?.view.containerEl.querySelectorAll(".kplex-central-editor-toolbar button")??[])].map(button => button.getAttribute("aria-label")),
        statuses: [...(c.hostLeaf?.view.containerEl.querySelectorAll(".kplex-central-editor-status")??[])].map(status => ({ class: status.className, label: status.textContent })) },
      nameDisabled: modal?.querySelector(".kplex-add-related-note-search input")?.disabled,
      primaryDisabled: modal?.querySelector('button[data-kplex-primary-action="true"]')?.disabled,
      primaryLabel: modal?.querySelector('button[data-kplex-primary-action="true"]')?.getAttribute("aria-label"),
      ontologyValue: modal?.querySelector(".kplex-add-related-ontology-search input")?.value,
      nameValue: modal?.querySelector(".kplex-add-related-note-search input")?.value,
      status: modal?.querySelector(".kplex-add-related-create-hint")?.textContent,
      session: dialog ? { opened: dialog.opened, invalidated: dialog.invalidated, writing: dialog.writing, current: dialog.invocation?.current?.() } : null,
      focus: { activeClass: document.activeElement?.className,
        activeViewType: app.workspace.activeLeaf?.view.getViewType(),
        activeNativeViewContainsFocus: Boolean(app.workspace.activeLeaf?.view.containerEl.contains(document.activeElement)),
        insideOwnedEmbeddedMount: Boolean(c.hostLeaf?.view.containerEl.querySelector(".kplex-central-editor-leaf-host")?.contains(document.activeElement)),
        composerCapturedOwnedHost: dialog?.hostLeaf === c.hostLeaf,
        ownedHostVisible: c.hostLeaf ? c.p.isKplexLeafVisible(c.hostLeaf) : false,
        activeElementInsideOwnedHost: c.hostLeaf?.view.containerEl.contains(document.activeElement),
        activeElementInsideOutsideEditor: c.editorLeaf?.view.containerEl.contains(document.activeElement),
        ownedGraphConnected: Boolean(c.hostLeaf?.view.containerEl.querySelector(".kplex-app")?.isConnected),
        ownedGraphHasClientRects: Boolean(c.hostLeaf?.view.containerEl.querySelector(".kplex-app")?.getClientRects().length),
        activeLeafIsOwnedHost: app.workspace.getMostRecentLeaf() === c.hostLeaf },
      notices: [...document.querySelectorAll(".notice")].map(notice => notice.textContent), writerEvents: c.writerEvents };
    } catch (snapshotError) { c.failureSnapshotError = String(snapshotError); }
  }); }, 50);
  return JSON.stringify({ started: true });
}

try {
  if (cli("vault", "info=path").replace(/^path\s+/, "") !== target.vault) throw new Error("CLI targets the wrong vault");
  report.obsidian = cli("version");
  for (const name of ["main.js", "styles.css", "manifest.json"]) {
    const hash = path => createHash("sha256").update(readFileSync(path)).digest("hex");
    report.artifacts[name] = hash(join(root, "dist", name));
    if (report.artifacts[name] !== hash(join(target.pluginDir, name))) throw new Error(`Installed ${name} does not match the exact build`);
  }
  cli("dev:errors", "clear"); installed = true; evaluate(`(${nativeActionProbe.toString()})(${JSON.stringify(publishableActions)},${JSON.stringify(nativeOSKeys)},${JSON.stringify(diagnosticH13Only)},${JSON.stringify(catalogActionIds)},${JSON.stringify(defaultActionBindings)},${JSON.stringify(recorderOSKeys)})`);
  const end = Date.now() + 600000;
  while (true) {
    await wait(500);
    const progressCode = "JSON.stringify({done:window.__kplexActionTest?.done,currentScenario:window.__kplexActionTest?.currentScenario,error:window.__kplexActionTest?.error,value:window.__kplexActionTest?.value,scenarios:window.__kplexActionTest?.scenarios,osKeyRequest:window.__kplexActionTest?.osKeyRequest,osKeyProofs:window.__kplexActionTest?.osKeyProofs,lastTrustedKey:window.__kplexActionTest?.lastTrustedKey,laptopDefaultsProof:window.__kplexActionTest?.laptopDefaultsProof,typedSelectionProof:window.__kplexActionTest?.typedSelectionProof,optionKeyReceipts:window.__kplexActionTest?.optionKeyReceipts,optionHotkeySearchProof:window.__kplexActionTest?.optionHotkeySearchProof,globalSettingsDestinationTrace:window.__kplexActionTest?.globalSettingsDestinationTrace,globalSettingsNativeLookup:window.__kplexActionTest?.globalSettingsNativeLookup,globalSettingsResultEvents:window.__kplexActionTest?.globalSettingsResultEvents,globalSettingsNavigation:window.__kplexActionTest?.globalSettingsNavigation,nativeWindowCloseProof:window.__kplexActionTest?.nativeWindowCloseProof,nativeTitlebarReadiness:window.__kplexActionTest?.nativeTitlebarReadiness,helpPaletteGeometry:window.__kplexActionTest?.helpPaletteGeometry,commandPaletteGeometry:window.__kplexActionTest?.commandPaletteGeometry,gearPointerGeometry:window.__kplexActionTest?.gearPointerGeometry,pointerDeliveries:window.__kplexActionTest?.pointerDeliveries,initialGraph:window.__kplexActionTest?.initialGraph,prepared:window.__kplexActionTest?.prepared,editProof:window.__kplexActionTest?.editProof,nativeModeTimeline:window.__kplexActionTest?.nativeModeTimeline,nativeModeCalls:window.__kplexActionTest?.nativeModeCalls,pointerForegroundTrace:window.__kplexActionTest?.pointerForegroundTrace,windowLifecycle:window.__kplexActionTest?.windowLifecycle,windowLifecycleDropped:window.__kplexActionTest?.windowLifecycleDropped,findDiagnostics:window.__kplexActionTest?.findDiagnostics,clipboardDiagnostics:window.__kplexActionTest?.clipboardDiagnostics,clipboardBaselineError:window.__kplexActionTest?.clipboardBaselineError,representationFocusProof:window.__kplexActionTest?.representationFocusProof,drawingFocusUnavailable:window.__kplexActionTest?.drawingFocusUnavailable,failureSnapshot:window.__kplexActionTest?.failureSnapshot})";
    let state;
    /** Retain each failed read-only transport poll; renderer timers and mutation calls are untouched. */
    const recordProgressTransportFailure = (error, attempt) => {
      const failures = report.progressTransportFailures ??= [];
      failures.push({ timestamp: new Date().toISOString(), error: String(error), attempt, count: failures.length + 1 });
      writeFileSync(join(output, "report.json"), JSON.stringify(report, null, 2));
    };
    try { state = evaluate(progressCode); }
    catch (error) {
      if (!String(error).includes("ETIMEDOUT")) throw error;
      recordProgressTransportFailure(error, 1);
      if (Date.now() > end) throw new Error("Native action regression deadline");
      // Retry this exact read once; never retry installation, input, settings or cleanup mutations.
      try { state = evaluate(progressCode); }
      catch (retryError) {
        if (String(retryError).includes("ETIMEDOUT")) recordProgressTransportFailure(retryError, 2);
        throw retryError;
      }
    }
    report.progress = state; writeFileSync(join(output, "report.json"), JSON.stringify(report, null, 2));
    if (state.done) { if (state.error) throw new Error(state.error); report.result = state.value; break; }
    if (Date.now() > end) throw new Error("Native action regression deadline");
  }
  const errors = cli("dev:errors"); if (errors && !/^No errors captured\.?$/i.test(errors)) throw new Error(`Native JavaScript errors: ${errors}`);
  report.status = "passed";
} catch (error) {
  report.status = "failed"; report.error = String(error);
  try { report.nativeErrors = cli("dev:errors"); } catch (readError) { report.nativeErrorReadFailure = String(readError); }
}
finally {
  try {
    if (installed) {
      const cleanupStart = evaluate(`(()=>{const c=window.__kplexActionTest;if(!c)return JSON.stringify({absent:true});c.cancelled=true;c.clearOSKeyRequest?.();c.releaseWrite?.();window.clearTimeout(c.timer);c.cleanup=(async()=>{
        const errors=[],attempt=async fn=>{try{await fn()}catch(error){errors.push(String(error))}};
        await attempt(()=>c.task);await attempt(()=>c.closeComposer?.());await attempt(()=>c.closeSettings?.());await attempt(()=>c.closeCompanionDialog?.());await attempt(()=>{if(c.ownedNativeSettings)app.setting.close()});
        for(const release of c.wrappers.reverse())await attempt(release);
        await attempt(()=>c.restoreHotkeys?.());await attempt(()=>c.restoreClipboard?.());
        await attempt(()=>c.p.updateActionPreferences(c.originalSettings.actionPreferences));
        Object.assign(c.p.settings,c.originalSettings);
        for(const path of [...new Set(c.owned)].reverse())await attempt(async()=>{const file=app.vault.getAbstractFileByPath(path);if(file)await app.vault.delete(file,true)});
        for(const leaf of [...new Set(c.newLeaves)].reverse())await attempt(()=>leaf?.detach());
        if(c.ownedActionPicker?.isConnected)errors.push('Owned action picker remains after host teardown');
        if(c.companion&&c.originalCompanionSettings)await attempt(async()=>{Object.assign(c.companion.settings,c.originalCompanionSettings);await c.companion.saveSettings()});
        await attempt(()=>c.editorLeaf?.detach());await attempt(()=>c.releaseWindowObservations?.());
        if(c.originalSettings.lastActivePath)await attempt(()=>c.p.notifyNavigation(c.originalSettings.lastActivePath));
        await attempt(()=>c.p.saveSettings(false,false));await attempt(()=>c.p.settingsWriteQueue);
        if(c.owned.some(path=>app.vault.getAbstractFileByPath(path)))errors.push('Owned fixture remains');
        if(errors.length)throw Error(errors.join('; '));return true;
      })().then(()=>{c.cleaned=true},error=>{c.cleanupError=String(error)});return JSON.stringify({cleanupStarted:true})})()`);
      if (!cleanupStart.absent) {
        const end = Date.now() + 60000;
        while (true) { await wait(500); const state = evaluate("JSON.stringify({cleaned:window.__kplexActionTest?.cleaned,error:window.__kplexActionTest?.cleanupError})"); if (state.error) throw new Error(state.error); if (state.cleaned) break; if (Date.now() > end) throw new Error("Native action cleanup deadline"); }
        report.cleanup = evaluate("(()=>{const c=window.__kplexActionTest;const remaining=c.owned.filter(path=>app.vault.getAbstractFileByPath(path)).length;delete window.__kplexActionTest;return JSON.stringify({remainingOwned:remaining,controllerRemoved:!window.__kplexActionTest})})()");
      } else report.cleanup = { remainingOwned: 0, controllerRemoved: true };
      if (report.cleanup.remainingOwned || !report.cleanup.controllerRemoved) throw new Error("Native action fixture/controller cleanup failed");
    }
  } catch (error) { report.status = "failed"; report.cleanupError = String(error); }
  try {
    if (installed) {
      const final = evaluate("(()=>{const c=window.__kplexActionTest;const remaining=(c?.owned??[]).filter(path=>app.vault.getAbstractFileByPath(path)).length;c?.clearOSKeyRequest?.();c?.releaseWrite?.();delete window.__kplexActionTest;return JSON.stringify({remainingOwned:remaining,controllerRemoved:!window.__kplexActionTest})})()");
      report.finalCleanup = final;
      if (final.remainingOwned) { report.status = "failed"; report.fixtureCleanupError = "Owned fixture remains after cleanup"; }
    }
  } catch (error) { report.status = "failed"; report.controllerCleanupError = String(error); }
  try {
    writeFileSync(settingsPath, settingsBytes);
    if (!readFileSync(settingsPath).equals(settingsBytes)) throw new Error("Original settings bytes not restored");
    if (!readFileSync(enabledPath).equals(enabledBytes)) throw new Error("Community-plugin enablement changed");
    if (hotkeysBytes) writeFileSync(hotkeysPath, hotkeysBytes);
    else if (existsSync(hotkeysPath)) unlinkSync(hotkeysPath);
    if (hotkeysBytes && !readFileSync(hotkeysPath).equals(hotkeysBytes)) throw new Error("Host hotkey bytes changed");
    if (companionBytes) { writeFileSync(companionPath, companionBytes); if (!readFileSync(companionPath).equals(companionBytes)) throw new Error("Original companion settings bytes not restored"); }
    else if (existsSync(companionPath)) unlinkSync(companionPath);
    report.configurationRestored = true;
  } catch (error) { report.status = "failed"; report.configurationRestoreError = String(error); }
  if (diagnosticH13Only) report.status = report.status === "passed" ? "diagnostic-passed" : "diagnostic-failed";
  report.completedAt = new Date().toISOString(); writeFileSync(join(output, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
}
console.log(JSON.stringify({ status: report.status, error: report.error, cleanupError: report.cleanupError, report: join(output, "report.json") }));
if (report.status !== "passed" && report.status !== "diagnostic-passed") process.exitCode = 1;
