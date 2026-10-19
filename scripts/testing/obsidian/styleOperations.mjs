/**
 * Exact-build style-operation acceptance in the explicitly selected prepared small Obsidian vault.
 * Uses the real native manager/editor and queued persistence with reversible storage/refresh faults.
 * Owns only synthetic style keys, finite forwarding probes and native layout/settings changes;
 * cleanup restores configuration bytes independently of assertions. DOM activation is programmatic,
 * not physical touch or perceived-latency evidence. No production diagnostics are installed.
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { obsidianCliExecutable, spawnNativeSync } from "./processTools.mjs";
import { validateTarget } from "./runner.mjs";

const root = fileURLToPath(new URL("../../..", import.meta.url));
const vaultName = process.env.KPLEX_TEST_VAULT_NAME;
assert.equal(
  vaultName,
  "kplex-test-small",
  "Select the prepared disposable small vault explicitly"
);
const { vault, config, pluginDir } = validateTarget({
  vaultName,
  vaultPath: process.env.KPLEX_TEST_VAULT_PATH,
  configDir: process.env.KPLEX_TEST_CONFIG_DIR,
});
const output = process.env.KPLEX_HOST_REPORT_DIR;
assert(
  output && (!existsSync(output) || readdirSync(output).length === 0),
  "Select a fresh report directory"
);
mkdirSync(output, { recursive: true });
writeFileSync(
  join(output, "driver-source.mjs"),
  readFileSync(fileURLToPath(import.meta.url))
);
/** Use bounded, shell-free IPC and reject CLI error payloads even when the launcher exits successfully. */
function cli(command, ...args) {
  const result = spawnNativeSync(
    obsidianCliExecutable(),
    [`vault=${vaultName}`, command, ...args],
    {
      encoding: "utf8",
      timeout: 30000,
      killSignal: "SIGKILL",
      maxBuffer: 4 * 1024 * 1024,
    }
  );
  if (result.error || result.status !== 0 || /^Error:/m.test(result.stdout))
    throw result.error ?? new Error(result.stderr || result.stdout);
  return result.stdout.trim();
}
/** Decode finite observations without retaining native objects across IPC or reloads. */
function evaluate(code) {
  return JSON.parse(cli("eval", "code=" + code).replace(/^=>\s*/, ""));
}
/** Poll outside the renderer, leaving its ordinary tasks and native cleanup free to progress. */
function pause(milliseconds) {
  return new Promise(
    /** Resolve one bounded poll interval. */ (resolve) =>
      setTimeout(resolve, milliseconds)
  );
}
assert.equal(cli("vault", "info=path"), vault);
const bytes = [
  "plugins/k-plex/data.json",
  "community-plugins.json",
  "workspace.json",
].map(
  /** Preserve actual native configuration independently of runtime cleanup success. */ (
    name
  ) => ({ path: join(config, name), bytes: readFileSync(join(config, name)) })
);
const artifacts = Object.fromEntries(
  ["main.js", "styles.css", "manifest.json"].map(
    /** Refuse stale installed artifacts rather than claiming evidence for an untested source build. */ (
      name
    ) => {
      const built = readFileSync(join(root, "dist", name));
      assert(built.equals(readFileSync(join(pluginDir, name))));
      return [name, createHash("sha256").update(built).digest("hex")];
    }
  )
);

/** Run real style-manager operations with finite fault injection and exact native modal ownership. */
function start(referenceOnly = false, referenceProperties = false, sidecarGateOnly = false, referenceSidecar = false, liveness = false, excalidrawSidecar = false) {
  const p = app.plugins.plugins["k-plex"],
    tab = p.settingsTab,
    remote = require("@electron/remote"),
    native = remote.getCurrentWindow();
  if (
    window.__kplex146Styles ||
    app.setting.isOpen ||
    (tab.containerEl.isConnected &&
      !tab.containerEl.ownerDocument.defaultView?.closed) ||
    document.querySelector(
      ".kplex-style-editor-modal,.kplex-style-manager-modal"
    )
  )
    throw new Error("Clean host prerequisites required");
  const c = (window.__kplex146Styles = {
    settings: structuredClone(p.settings),
    policy: p.savedSettingsPolicy,
    layout: app.workspace.getLayout(),
    owners: {
      linked: p.linkedDocumentLeaf,
      last: p.lastDocumentLeaf,
      recent: [...p.recentLeafHistory],
      sidecars: new Map(p.sidecarLeaves),
    },
    cases: [],
    events: [],
    trace: {next: 0, current: 0, last: 0, waiting: 0, active: 0},
    restores: [],
    modals: [],
    done: false,
    cancelled: false,
    diskFailure: false,
    presentationFailure: false,
    managerFailure: false,
    counts: {
      writes: 0,
      presentations: 0,
      semantics: 0,
      acquisitions: 0,
      reads: 0,
      sourceReads: 0,
      nativeLeafReads: 0,
      peakQueueDepth: 0,
      peakDiskWriters: 0,
      preparations: 0,
      droppedTraceEvents: 0,
    },
    release: null,
  });
  const key = "__kplex146_style",
    other = key + "_renamed";
  /** Fail a bounded probe or retire its exact controller without leaving delayed operations alive. */
  const check = (condition, message) => {
    if (c.cancelled || !condition)
      throw new Error(c.cancelled ? "Retired style probe" : message);
  };
  /** Yield the selected document's native task queue with cancellation on both sides of the await. */
  const wait = async (milliseconds) => {
    check(true, "alive");
    await new Promise(
      /** Yield one owning-window task. */ (resolve) =>
        window.setTimeout(resolve, milliseconds)
    );
    check(true, "alive");
  };
  /** Require an observed native state within the existing finite functional deadline. */
  const until = async (read, label) => {
    const end = performance.now() + 15000;
    while (!read()) {
      check(performance.now() < end, label);
      await wait(25);
    }
  };
  /** Mark only completed observable checks as passed. */
  const passed = (name, details = {}) =>
    c.cases.push({ name, status: "passed", ...details });
  /** Search only the concrete native documents that can own this Settings/editor invocation. */
  const documents = () => [
    ...new Set(
      [document, window.activeDocument, tab.containerEl.ownerDocument].filter(
        Boolean
      )
    ),
  ];
  /** Reacquire the currently mounted real editor; never treat a detached old modal as its replacement. */
  const editor = () =>
    documents()
      .map(
        /** Find an actual editor in its document. */ (doc) =>
          doc.querySelector(".kplex-style-editor-modal")
      )
      .find(Boolean);
  /** Select a localized native action through its actual button, preserving all production callbacks. */
  const button = (root, name) =>
    [...root.querySelectorAll("button")].find(
      /** Match a real native action label. */ (element) =>
        element.textContent === p.translator(name)
    );
  /** Record separate storage/presentation/manager boundaries; times are diagnostics, not paint measurements. */
  const record = (phase, edge, operation = c.trace.current || c.trace.last) => {
    if (c.cancelled || c.done) return;
    if (c.events.length >= 2048) {c.counts.droppedTraceEvents++; return;}
    const event = {phase, edge, operation, time: performance.now(), queued: c.trace.waiting,
      sourceRevision: p.getIndexSourceRevision(), policyRevision: p.index.semanticPolicyRevision,
      publicationRevision: p.index.publicationRevision, presentationRun: p.index.presentationRun};
    c.events.push(event); return event;
  };
  /** Retain an exact forwarding receiver and restore only the probe's installed method. */
  const wrap = (owner, key, replacement) => {
    const original = owner[key];
    owner[key] = replacement(original);
    const installed = owner[key];
    c.restores.push(
      /** Release this exact wrapper without overwriting another owner's replacement. */ () => {
        if (owner[key] === installed) owner[key] = original;
      }
    );
  };
  wrap(p, "enqueueSettingsWrite", /** Observe the existing queue without changing intent capture or its returned promise. */ original => function(write) {
    const operation = ++c.trace.next; let started = false;
    c.trace.waiting++;
    c.counts.peakQueueDepth = Math.max(c.counts.peakQueueDepth, c.trace.waiting + c.trace.active);
    record("write-queue", "queued", operation);
    const result = original.call(this, /** The existing writer still owns persistence and live-settings installation. */ async () => {
      started = true; c.trace.waiting--; c.trace.active++; c.trace.current = operation;
      c.counts.peakDiskWriters = Math.max(c.counts.peakDiskWriters, c.trace.active);
      record("write-body", "start", operation);
      try {const value = await write(); record("write-body", "complete", operation); c.trace.last = operation; return value;}
      finally {c.trace.active--; if (c.trace.current === operation) c.trace.current = 0;}
    });
    void result.then(/** Refused preflight never entered the body, but must retire its observer count. */ () => {
      if (!started) c.trace.waiting--; record("write-queue", "complete", operation);
    }, /** Observe failure without consuming or transforming the caller's original rejection. */ () => {
      if (!started) c.trace.waiting--; record("write-queue", "failed", operation);
    });
    return result;
  });
  wrap(p.index, "prepareSearchIndex", /** Count actual preparation without retaining graph or source payloads. */ original => function(...args) {
    c.counts.preparations++; record("search-preparation", "start");
    const result = original.apply(this, args);
    void result.then(/** Retain scalar readiness only; production owns the prepared records. */ prepared => record("search-preparation", prepared ? "ready" : "rejected"),
      /** Failure stays a rejection to the production caller. */ () => record("search-preparation", "failed"));
    return result;
  });
  c.restores.push(p.index.subscribePresentation(/** Publication is distinct from preparation, callback scheduling or actual paint. */ event => record("presentation-publication", event.kind)));
  wrap(
    p,
    "saveData",
    /** Storage faults occur before native persistence; held writes are released during cleanup. */ (
      original
    ) =>
      async function (...args) {
        const operation = c.trace.current || c.trace.last;
        c.counts.writes++;
        record("storage", "start", operation);
        if (c.diskFailure)
          throw new Error("Expected native style storage fault");
        if (c.holdDisk)
          await new Promise(
            /** Expose only this controller's bounded storage release. */ (
              resolve
            ) => {
              c.release = resolve;
            }
          );
        const result = await original.apply(this, args);
        record("storage", "end", operation);
        return result;
      }
  );
  wrap(
    p.index,
    "refreshPresentationSettings",
    /** Distinguish a saved refresh fault from a rejected disk write. */ (
      original
    ) =>
      async function (...args) {
        const operation = c.trace.current || c.trace.last;
        c.counts.presentations++;
        record("presentation", "start", operation);
        if (c.presentationFailure)
          throw new Error("Expected native presentation fault");
        const result = await original.apply(this, args);
        record("presentation", "end", operation);
        return result;
      }
  );
  wrap(
    p.index,
    "refreshSemanticSettings",
    /** A style operation must never invoke this unrelated semantic owner. */ (
      original
    ) =>
      function (...args) {
        c.counts.semantics++;
        return original.apply(this, args);
      }
  );
  wrap(
    p.index.sourceAcquisition,
    "acquire",
    /** Count actual source work while retaining native acquisition behavior. */ (
      original
    ) =>
      function (...args) {
        c.counts.acquisitions++;
        const event = record("source-acquire", "start");
        if (event) Object.assign(event, {owner: args[0] === c.fixtureFile ? "owned-note" : args[0] === c.fixtureParentFile ? "owned-parent" : "other",
          mtime: args[0]?.stat?.mtime, size: args[0]?.stat?.size,
          frames: new Error().stack?.split("\n").slice(1, 9).map(/** Function names only, never paths or note contents. */ line => line.match(/^\s*at ([\w.$<>]+)/)?.[1] ?? "anonymous")});
        return original.apply(this, args);
      }
  );
  for (const name of ["read", "cachedRead"])
    wrap(
      app.vault,
      name,
      /** Observe native read kinds without retaining filenames or file contents. */ (
        original
      ) =>
        function (...args) {
          const stack = new Error().stack ?? "";
          const frames = stack
            .split("\n")
            .slice(1, 9)
            .map(
              /** Keep function names only, excluding source paths and note identities. */ (
                line
              ) => line.match(/^\s*at ([\w.$<>]+)/)?.[1] ?? "anonymous"
            );
          const pluginCaller = stack.includes("plugin:k-plex");
          // Returning focus to the ordinary Markdown leaf can invoke native file-open handlers.
          // Count those separately only with positive caller evidence; unknown/plugin reads stay strict.
          const nativeLeaf =
            !pluginCaller &&
            frames.some(
              /** Identify the observed native FileView/metadata lifecycle, not arbitrary reads. */ (
                frame
              ) => /\.(loadFileInternal|onFileOpen|onFileChanged)$/.test(frame)
            );
          if (nativeLeaf) c.counts.nativeLeafReads++;
          else c.counts.sourceReads++;
          c.counts.reads++;
          (c.readFacts ??= []).push({
            kind: args[0]?.extension ?? typeof args[0],
            inspector: Boolean(c.inspectingStorage),
            method: name,
            pluginCaller,
            nativeLeaf,
            frames,
            time: performance.now(),
          });
          return original.apply(this, args);
        }
    );
  wrap(
    tab,
    "nodeStyleEntries",
    /** The manager can throw after persistence; do not simulate an unsaved operation. */ (
      original
    ) =>
      function (...args) {
        if (c.managerFailure) throw new Error("Expected native manager fault");
        return original.apply(this, args);
      }
  );

  /** Apply one local child color draft through the actual shared native source shell, never persistence. */
  const editColor = async (root, caption, value, rgbOnly = false) => {
    const action = root.querySelector('button[aria-label="' + p.translator(caption) + '"]');
    check(action, "Shared color-source action missing"); action.click();
    await until(() => root.ownerDocument.querySelector(".kplex-color-modal"), "Color source did not mount");
    const modal = root.ownerDocument.querySelector(".kplex-color-modal"); c.modals.push(modal);
    const selector = modal.querySelector(".kplex-color-source-editor select");
    if (selector.value !== "fixed") {selector.value = "fixed"; selector.dispatchEvent(new modal.ownerDocument.defaultView.Event("change", {bubbles:true}));}
    const input = modal.querySelector(rgbOnly ? 'input[type="color"]' : 'fieldset input[type="text"]');
    check(input, "Native literal control missing for " + caption + "; source=" + selector.value + "; controls=" + [...modal.querySelectorAll("input")].map(field => field.type).join(","));
    input.value = value; input.dispatchEvent(new modal.ownerDocument.defaultView.Event("input", {bubbles:true}));
    if (rgbOnly) input.dispatchEvent(new modal.ownerDocument.defaultView.Event("change", {bubbles:true}));
    button(modal, "colors.useColor").click();
    await until(() => !modal.isConnected, "Local source draft did not close");
  };

  /** Open the real manager, then its real Add/row action, in the current native document. */
  const open = async (kind, name = null, managerAlreadyOpen = false) => {
    if (!managerAlreadyOpen) {
      // The shared source chooser preserves its originating Settings CSS/document. Attach the
      // actual native tab before invoking its manager, even in the no-Plex-view scenario.
      if (!tab.containerEl.isConnected || !tab.containerEl.ownerDocument.defaultView) {
        p.openSettings(); await until(() => tab.containerEl.isConnected && !!tab.containerEl.ownerDocument.defaultView, "Native Settings did not attach");
      }
      tab.openNoteTypeStylesManager();
    }
    await until(
      /** Wait for native attachment in its concrete owner. */ () =>
        documents().some((doc) =>
          doc.querySelector(".kplex-style-manager-modal")
        ),
      "Manager did not mount"
    );
    const manager = documents()
      .map(
        /** Capture this invocation's native manager. */ (doc) =>
          doc.querySelector(".kplex-style-manager-modal")
      )
      .find(Boolean);
    c.modals.push(manager);
    if (name) {
      const search = manager.querySelector('input[type="search"]');
      search.value = name;
      search.dispatchEvent(
        new manager.ownerDocument.defaultView.Event("input", { bubbles: true })
      );
      const row = [
        ...manager.querySelectorAll(".kplex-style-manager-row"),
      ].find(
        /** Resolve the exact family when names collide. */ (row) =>
          row.querySelector(".kplex-style-manager-name")?.textContent ===
            name &&
          row.querySelector(".kplex-style-manager-badge")?.textContent ===
            p.translator(
              kind === "tag" ? "styles.legacyTag" : "styles.propertyValue"
            )
      );
      check(row, "Exact style row unavailable");
      row.click();
    } else button(manager, "styles.addStyle").click();
    await until(editor, "Editor did not mount");
    const root = editor();
    c.modals.push(root);
    const select = root.querySelector("select");
    if (!name && select.value !== kind) {
      select.value = kind;
      select.dispatchEvent(
        new root.ownerDocument.defaultView.Event("change", { bubbles: true })
      );
    }
    check(root.querySelector('input[aria-label="' + p.translator(kind === "tag" ? "styles.tagPrefix" : "styles.propertyValue") + '"]'), "Native name field missing for " + kind);
    return root;
  };
  /** Close only the owned manager shells after the editor has reached a durable outcome. */
  const closeManagers = () => {
    for (const root of c.modals)
      if (
        root.isConnected &&
        root.classList.contains("kplex-style-manager-modal")
      )
        root.closest(".modal-container").querySelector(".modal-bg").click();
  };
  /** Read the operation's actual native durable configuration, independent of live settings. */
  const stored = async () => {
    c.inspectingStorage = true;
    try {
      return await p.loadData();
    } finally {
      c.inspectingStorage = false;
    }
  };
  /** Programmatic activation observes real callbacks without claiming trusted pointer/touch delivery. */
  const save = async (root) => {
    button(root, "common.save").click();
    await until(
      /** Observe completion, not a fixed delay. */ () => !root.isConnected,
      "Save did not close"
    );
    closeManagers();
  };

  /** Restore every probe, submitted-write lease and native setting even when an assertion failed. */
  c.cleanup = async () => {
    c.holdDisk = false;
    c.release?.();
    c.release = null;
    c.diskFailure = false;
    c.presentationFailure = false;
    c.managerFailure = false;
    // A submitted write is durable work, not a cancelable DOM draft. Drain it before restoring
    // configuration bytes so its late completion cannot overwrite the restored test-vault data.
    await (app.plugins.plugins["k-plex"]?.settingsWriteQueue ??
      p.settingsWriteQueue);
    await new Promise(
      /** Let the queued editor completion release its pending close exclusion. */ (
        resolve
      ) => window.setTimeout(resolve, 100)
    );
    for (const restore of c.restores.reverse()) restore();
    for(const file of [c.fixtureFile,c.fixtureParentFile]) if(file && app.vault.getFileByPath(file.path)===file) await app.vault.delete(file);
    for (const root of c.modals)
      if (root.isConnected) button(root, "common.cancel")?.click();
    closeManagers();
    const current = app.plugins.plugins["k-plex"];
    if (!current) throw new Error("Plugin disappeared during native cleanup");
    current.settings = c.settings;
    current.savedSettingsPolicy = c.policy;
    if (current === p) {
      p.linkedDocumentLeaf = c.owners.linked;
      p.lastDocumentLeaf = c.owners.last;
      p.recentLeafHistory = c.owners.recent;
      p.sidecarLeaves = c.owners.sidecars;
    }
    if (c.ownsSettings) app.setting.close();
    await current.index.refreshPresentationSettings();
    await app.workspace.changeLayout(c.layout);
    await current.settingsWriteQueue;
    c.cleaned = true;
  };
  /** Create only this probe's real drawing; preserve its generated payload and opt into native Markdown display. */
  const drawing = async path => {
    const ex=app.plugins.plugins['obsidian-excalidraw-plugin'];
    check(ex?.createDrawing,'Enabled real Excalidraw companion required');
    check(!app.vault.getFileByPath(path),'Drawing fixture collision');
    const created=await ex.createDrawing(path,'/');
    const file=typeof created==='string'?app.vault.getFileByPath(created):created;
    check(file?.path===path,'Companion returned a non-owned drawing');
    c.fixtureFile=file;
    await app.fileManager.processFrontMatter(c.fixtureFile,/** Keep generated scene data and all other drawing metadata intact. */ fm=>{fm['excalidraw-open-md']=true});
    await until(/** Native cache must recognize both the real drawing and its selected representation. */ ()=>app.metadataCache.getFileCache(c.fixtureFile)?.frontmatter?.['excalidraw-plugin']&&app.metadataCache.getFileCache(c.fixtureFile)?.frontmatter?.['excalidraw-open-md']===true,'Drawing Markdown metadata absent');
    p.index.insertCreatedFile(c.fixtureFile);return c.fixtureFile;
  };
  /** Both reported incidents used a normal central node; verify the actual per-leaf representation. */
  const requireNormalCenter = plex => check(plex.view.getState()?.centerPresentation?.embedCentralNode === false, "A normal central node is required for this probe");
  /** Observe actual retained work, not a startup strategy or whole-graph authority flag. */
  const workDrained = () => {
    const index = p.index, scheduler = index.getWorkPriorityDiagnostics();
    const source = index.sourceAcquisition.getActivityState(), cache = index.indexedDb.getActivityState();
    c.quietObservation = {status: p.getIndexStatus(), hydration: index.hasPendingSnapshotHydration(),
      semantic: index.hasActiveSemanticPreparation(), tasks: index.onDemandTasks.size,
      scheduler, source, cache, visibleTimer: Boolean(p.visibleMetadataTimer), visiblePaths: p.visibleMetadataPaths.size};
    return p.getIndexStatus().upToDate && !index.hasPendingSnapshotHydration()
      && !index.hasActiveSemanticPreparation() && !index.onDemandTasks.size
      && scheduler.active.every(count => count === 0) && scheduler.waiting === 0
      && Object.values(source).every(count => count === 0) && !cache.writerActive && cache.queuedBodies === 0
      && !p.visibleMetadataTimer && !p.visibleMetadataPaths.size;
  };
  /** Require a quiet half-second within the existing finite prerequisite deadline; admit no work. */
  const awaitQuiet = async message => {
    let quietSince = null;
    await until(() => {
      if (!workDrained()) {quietSince = null; return false;}
      quietSince ??= performance.now();
      return performance.now() - quietSince >= 500;
    }, message);
  };
  /** Execute the serial no-view/active-view and fault matrix, then report facts before retiring the controller. */
  const run = async () => {
    try {
      if (typeof remote.app.show === "function") remote.app.show();
      remote.app.focus({ steal: true });
      native.show();
      native.focus();
      native.webContents.focus();
      await until(
        /** Foreground is a prerequisite, not inferred from a focus API return. */ () =>
          !document.hidden && document.hasFocus(),
        "Selected test window did not foreground"
      );
      await p.activateView();
      await awaitQuiet("Initial source startup did not settle");
      if (sidecarGateOnly) {
        const plex = app.workspace.getLeavesOfType("k-plex-react-view").find(leaf => p.isKplexLeafVisible(leaf));
        check(plex, "A visible main Plex is required");
        requireNormalCenter(plex);
        if(excalidrawSidecar)await drawing(key+'-'+Date.now()+'.excalidraw.md');
        const page = excalidrawSidecar ? p.index.get(c.fixtureFile.path) : p.index.allPages().find(page => page.file?.extension === "md");
        check(page, "A physical Markdown center is required");
        app.workspace.setActiveLeaf(plex, {focus: true}); p.notifyNavigation(page.path);
        await p.openSidecar(plex, page);
        await until(() => p.isSidecarOpen(plex), "Sidecar did not open");
        if(excalidrawSidecar)check(p.sidecarLeaves.get(plex)?.view.getViewType()==='markdown'&&p.sidecarLeaves.get(plex)?.view.file===c.fixtureFile,'Real drawing Sidecar must be Markdown, not drawing editor');
        // This is the quiet radius control, separate from the deliberately held overlap lane.
        // An empty task map alone can precede admission of a newly created drawing's center work.
        await awaitQuiet("Sidecar setup work did not drain");
        const before = {...c.counts};
        c.gateBaseline = {counts: before, at: performance.now(), sourceRevision: p.getIndexSourceRevision(), mtime: c.fixtureFile?.stat?.mtime, canonical: p.index.hasCurrentCanonicalCenter(page.path)};
        for (const radius of [8, 2, 6.5, 5]) {
          c.ownsSettings = true; p.openSettings();
          await until(() => tab.containerEl.isConnected, "Settings did not attach");
          check(tab.openSettingsPage(p.translator("settings.ui.visual.styling")), "Visual styling page absent");
          await wait(100);
          check(tab.openSettingsPage(p.translator("settings.ui.node.styling")), "Node styling page absent");
          await wait(100);
          const field = tab.containerEl.ownerDocument.querySelector('input[aria-label="' + p.translator("settings.ui.gate.radius") + '"]');
          check(field, "Actual Settings gate radius slider absent");
          field.value = String(radius);
          field.dispatchEvent(new field.ownerDocument.defaultView.Event("input", {bubbles: true}));
          field.dispatchEvent(new field.ownerDocument.defaultView.Event("change", {bubbles: true}));
          await until(() => p.settings.baseNodeStyle.gateRadius === radius, "Gate radius was not committed");
          await p.settingsWriteQueue;
          record("sidecar-gate-settings-close", "start");
          app.setting.close(); c.ownsSettings = false;
          await wait(250);
          record("sidecar-gate-settings-close", "end");
          check(p.isSidecarOpen(plex), "Settings close lost Sidecar ownership");
          check(plex.view.containerEl.querySelector(".kplex-plex"), "Settings close lost the graph");
          passed("actual Settings gate radius save and close with managed Sidecar", {radius});
        }
        for (const mode of ["source", "preview"]) {
          const companion = p.sidecarLeaves.get(plex);
          check(companion, "Managed companion disappeared");
          const saved = companion.getViewState();
          await companion.setViewState({...saved, active: false, state: {...saved.state, mode}});
          for (const closePending of [false, true]) {
            await p.updateAppearanceThemes({kind: "select", id: "default"});
            check(p.settings.appearanceThemes.selectedId === "default", "Factory theme selection failed");
            c.ownsSettings = true; p.openSettings();
            await until(() => tab.containerEl.isConnected, "Settings did not attach");
            check(tab.openSettingsPage(p.translator("settings.ui.visual.styling")), "Visual styling page absent"); await wait(100);
            check(tab.openSettingsPage(p.translator("settings.ui.node.styling")), "Node styling page absent"); await wait(100);
            const doc = tab.containerEl.ownerDocument;
            const field = doc.querySelector('input[aria-label="' + p.translator("settings.ui.gate.radius") + '"]');
            check(field, "Native radius slider absent"); field.scrollIntoView({block: "center"}); await wait(50);
            const host = doc.defaultView.require("@electron/remote").getCurrentWindow();
            host.show(); host.focus(); host.webContents.focus();
            await until(() => doc.hasFocus(), "Settings window did not focus");
            const rectangle = field.getBoundingClientRect();
            check(rectangle.width > 0 && rectangle.height > 0, "Native radius slider is hidden");
            const trusted = []; const observe = event => trusted.push(event.isTrusted);
            field.addEventListener("change", observe);
            c.holdDisk = closePending;
            try {
              const point = {x: Math.round(rectangle.left + rectangle.width * (closePending ? 0.2 : 0.8)), y: Math.round(rectangle.top + rectangle.height / 2)};
              for (const type of ["mouseDown", "mouseUp"]) host.webContents.sendInputEvent({type, ...point, button: "left", clickCount: 1});
              await until(() => trusted.length > 0, "Trusted slider input did not reach Settings");
              if (closePending) await until(() => Boolean(c.release), "Native save did not reach held storage");
              else await p.settingsWriteQueue;
              record("sidecar-gate-native-close", "start");
              const close = doc.querySelector(".titlebar-button.mod-close");
              check(close, "Native Settings window close control absent");
              const closeBounds = close.getBoundingClientRect();
              check(closeBounds.width > 0 && closeBounds.height > 0, "Settings close control hidden");
              const closePoint = {x: Math.round(closeBounds.left + closeBounds.width / 2), y: Math.round(closeBounds.top + closeBounds.height / 2)};
              for (const type of ["mouseDown", "mouseUp"]) host.webContents.sendInputEvent({type, ...closePoint, button: "left", clickCount: 1});
              await until(() => !app.setting.isOpen, "Native close click did not close Settings");
              c.ownsSettings = false; c.holdDisk = false; c.release?.(); c.release = null;
              await p.settingsWriteQueue; await wait(250);
              record("sidecar-gate-native-close", "end");
              check(trusted.every(Boolean), "Slider input was not trusted");
              check(p.settings.appearanceThemes.selectedId !== "default", "First actual appearance edit did not create an editable theme");
              check(p.isSidecarOpen(plex) && plex.view.containerEl.querySelector(".kplex-plex"), "Native Settings close lost Sidecar/graph");
              passed("trusted Settings gate slider and window close with managed Sidecar", {mode, closePending, radius: p.settings.baseNodeStyle.gateRadius});
            } finally {field.removeEventListener("change", observe); c.holdDisk = false; c.release?.(); c.release = null;}
          }
        }
        c.gateFinal = {counts: {...c.counts}, at: performance.now(), sourceRevision: p.getIndexSourceRevision(), mtime: c.fixtureFile?.stat?.mtime};
        check(c.counts.semantics === before.semantics && c.counts.acquisitions === before.acquisitions,
          "Gate radius editing requested semantic/source work");
        c.result = {status: "passed", cases: c.cases, counts: c.counts, events: c.events,
          scope: "Actual native Settings controls and Sidecar; programmatic input, no comparative timing"};
        return;
      }
      if(referenceOnly){
        check(p.settings.noteTypeField,'Configured style field required');
        const path=key+'-'+Date.now()+(excalidrawSidecar?'.excalidraw.md':'.md');check(!app.vault.getFileByPath(path),'Reference fixture collision');
        const parentPath=path.replace(/\.md$/,'-parent.md'),parentField=p.settings.hierarchy.parents[0];
        check(parentField&&parentField!==p.settings.noteTypeField&&!app.vault.getFileByPath(parentPath),'Independent Parent fixture required');
        c.fixtureParentFile=await app.vault.create(parentPath,'');
        if(excalidrawSidecar){
          await drawing(path);
          await app.fileManager.processFrontMatter(c.fixtureFile,/** Add the same semantic fixture fields without replacing the actual drawing. */ fm=>{fm[p.settings.noteTypeField]=key;fm[parentField]='[['+parentPath+']]'});
        }else c.fixtureFile=await app.vault.create(path,'---\n'+JSON.stringify(p.settings.noteTypeField)+': '+JSON.stringify(key)+'\n'+JSON.stringify(parentField)+': '+JSON.stringify('[['+parentPath+']]')+'\n---\n');
        await until(()=>app.metadataCache.getFileCache(c.fixtureFile)?.frontmatter?.[p.settings.noteTypeField]===key,'Style fixture metadata absent');
        const plex=app.workspace.getLeavesOfType('k-plex-react-view').find(l=>p.isKplexLeafVisible(l));check(plex,'Single main Plex required');requireNormalCenter(plex);
        for(const leaf of [...app.workspace.getLeavesOfType('k-plex-react-view'),...app.workspace.getLeavesOfType('k-plex-sidepanel-view')])if(leaf!==plex)leaf.detach();
        for(const leaf of app.workspace.getLeavesOfType('file-properties'))leaf.detach();
        if(referenceProperties){c.properties=app.workspace.getLeaf('split');await c.properties.setViewState({type:'file-properties',active:false});await app.workspace.revealLeaf(c.properties);await c.properties.loadIfDeferred()}
        app.workspace.setActiveLeaf(plex,{focus:true});p.notifyNavigation(path);
        await until(()=>[...document.querySelectorAll('.kplex-role-center')].some(el=>el.dataset.kplexPath===path),'Style fixture did not become central');
        if (referenceSidecar) {
          const center = p.index.get(path); check(center?.file === c.fixtureFile, "Physical Sidecar fixture center missing");
          await p.openSidecar(plex, center);
          await until(() => p.isSidecarOpen(plex), "Reference Sidecar did not open");
          if(excalidrawSidecar)check(p.sidecarLeaves.get(plex)?.view.getViewType()==='markdown'&&p.sidecarLeaves.get(plex)?.view.file===c.fixtureFile,'Actual Excalidraw-as-Markdown Sidecar required');
        }
        await awaitQuiet('Style fixture work did not drain');
        if(referenceProperties)await until(()=>c.properties.view.file===c.fixtureFile&&c.properties.view.modifyingFile===c.fixtureFile,'Native Properties did not adopt fixture');
        const body=document.body,heading='--h1-color',originalHeading=body.style.getPropertyValue(heading),priority=body.style.getPropertyPriority(heading);
        c.testHeadingToken=!getComputedStyle(body).getPropertyValue(heading).trim();
        if(c.testHeadingToken){body.style.setProperty(heading,'var(--text-normal)');c.restores.push(()=>{if(originalHeading)body.style.setProperty(heading,originalHeading,priority);else body.style.removeProperty(heading)})}
        c.ownsSettings=true;p.openSettings();await until(()=>tab.containerEl.isConnected,'Settings root missing');
        check(tab.openSettingsPage(p.translator('settings.ui.visual.styling')),'Visual styling page missing');
        await until(()=>!tab.containerEl.isConnected,'Visual styling did not replace Settings root');
        check(tab.openSettingsPage(p.translator('settings.ui.node.styling')),'Node styling page missing');await wait(300);
        const label=[...tab.containerEl.ownerDocument.querySelectorAll('.setting-item-name')].find(el=>el.getClientRects().length&&el.textContent===p.translator('styles.nodeTitle'));check(label,'Actual Node styles action absent');
        const row=label.closest('.setting-item');(row.querySelector('button')??row).click();
        let root=await open('property',null,true);
        root.querySelector('input[aria-label="'+p.translator('styles.propertyValue')+'"]').value=key;
        await awaitQuiet('Reference fixture work did not drain');
        const before={...c.counts};record('reference-child','start');
        root.querySelector('button[aria-label="'+p.translator('styles.border')+'"]').click();
        await until(()=>root.ownerDocument.querySelector('.kplex-color-modal'),'Reference chooser absent');
        const child=root.ownerDocument.querySelector('.kplex-color-modal');c.modals.push(child);
        const source=child.querySelector('.kplex-color-source-editor select');source.value='theme';source.dispatchEvent(new child.ownerDocument.defaultView.Event('change',{bubbles:true}));
        child.querySelector('.kplex-theme-color-choice').click();
        await until(()=>child.ownerDocument.querySelector('.prompt-input'),'Native heading chooser absent');
        const query=child.ownerDocument.querySelector('.prompt-input');query.value=heading;query.dispatchEvent(new query.ownerDocument.defaultView.Event('input',{bubbles:true}));
        await until(()=>[...child.ownerDocument.querySelectorAll('.suggestion-item')].some(row=>row.querySelector('.suggestion-content')?.firstElementChild?.textContent===heading),'Native heading choice absent');
        const choice=[...child.ownerDocument.querySelectorAll('.suggestion-item')].find(row=>row.querySelector('.suggestion-content')?.firstElementChild?.textContent===heading);
        await until(()=>choice.querySelectorAll('.kplex-color-swatch').length===2,'Native heading swatches absent');choice.dispatchEvent(new choice.ownerDocument.defaultView.MouseEvent('mousedown',{bubbles:true,cancelable:true,button:0}));choice.click();
        await until(()=>!query.isConnected,'Native heading choice did not close');
        await until(()=>!button(child,'colors.useColor').disabled,'Heading theme color cannot be selected');button(child,'colors.useColor').click();
        await until(()=>!child.isConnected,'Reference chooser did not close');
        check(c.counts.writes===before.writes&&!p.settings.noteTypeStyles[key],'Child draft changed durable/live graph styling');record('reference-child','end');
        const dimensions={strokeWidth:3,gateRadius:8};
        for(const [label,value] of [['filter.borderWidth',dimensions.strokeWidth],['settings.ui.gate.radius',dimensions.gateRadius]]){
          const field=root.querySelector('input[aria-label="'+p.translator(label)+'"]');check(field,'Native size input absent');
          field.value=String(value);field.dispatchEvent(new field.ownerDocument.defaultView.Event('input',{bubbles:true}));
        }
        if(liveness){
          let releasePrevious,releaseRefresh,heartbeats=0;const beat=window.setInterval(/** Count actual task opportunities while optional work remains held. */ ()=>heartbeats++,10);
          const search=p.index.prepareSearchIndex,refresh=p.index.refreshPresentationSettings;
          let entered=false,held=false;
          // Hold actual facet-changing preparation; another durable style Save must not own its disk queue.
          p.index.prepareSearchIndex=/** Hold only the first real earlier preparation; keep its exact receiver. */ async function(...args){if(!entered){entered=true;await new Promise(/** Expose only the finite probe-owned earlier-preparation gate. */ resolve=>releasePrevious=resolve)}return search.apply(this,args)};
          p.settings.showFullTagName=!p.settings.showFullTagName;
          const previous=p.index.refreshPresentationSettings();
          try{
            await until(()=>entered,'Earlier facet-changing preparation did not enter');
            p.index.refreshPresentationSettings=/** Model a held optional host continuation after durable Save. */ async function(...args){held=true;await new Promise(/** Cleanup releases the exact optional continuation even after a failed assertion. */ resolve=>releaseRefresh=resolve);return refresh.apply(this,args)};
            record('overlap-parent-save','start');button(root,'common.save').click();
            await until(()=>held,'Saved operation did not enter held optional refresh');await wait(300);
            const observed={editorPending:root.isConnected,heartbeats,durable:Boolean((await stored()).noteTypeStyles[key]),earlierPreparationHeld:Boolean(releasePrevious),writes:c.counts.writes-before.writes};
            check(observed.durable&&heartbeats>0,'Hold must distinguish durable Save from a starved renderer');
            passed('controlled overlap and held optional refresh observation',observed);
            if(liveness==='assert')check(!root.isConnected,'Durably saved editor remains trapped by optional refresh');
          }finally{window.clearInterval(beat);releaseRefresh?.();releasePrevious?.();p.index.prepareSearchIndex=search;p.index.refreshPresentationSettings=refresh;await previous;}
          await until(()=>!root.isConnected,'Released overlap Save did not close');record('overlap-parent-save','end');
        }else{record('reference-parent-save','start');await save(root);record('reference-parent-save','end');}
        const expected={kind:'theme',variable:'--h1-color'};
        check(JSON.stringify(p.settings.noteTypeStyles[key]?.borderColor)===JSON.stringify(expected),'Reference did not publish');
        check(JSON.stringify((await stored()).noteTypeStyles[key]?.borderColor)===JSON.stringify(expected),'Reference did not persist');
        app.setting.close();await wait(400);
        if (referenceSidecar) check(p.isSidecarOpen(plex), "Style Save/Settings close lost Sidecar ownership");
        check([...document.querySelectorAll('.kplex-role-center')].some(el=>el.dataset.kplexPath===path),'Style Save lost central graph');
        check(c.counts.semantics===before.semantics&&c.counts.acquisitions===before.acquisitions,'Reference/size Save requested semantic/source work');
        const style=p.settings.noteTypeStyles[key],durable=(await stored()).noteTypeStyles[key];
        check(style.strokeWidth===3&&style.gateRadius===8&&durable.strokeWidth===3&&durable.gateRadius===8,'Native dimensions not persisted');
        await until(()=>{const center=[...document.querySelectorAll('.kplex-role-center')].find(el=>el.dataset.kplexPath===path);return center&&getComputedStyle(center).borderWidth==='3px'&&center.style.getPropertyValue('--kplex-gate-size')==='8.4px'},'Native dimension paint absent');
        passed('actual Settings Node styles Border h1 reference child draft and parent Save',{source:expected,dimensions,counts:{writes:c.counts.writes-before.writes,presentations:c.counts.presentations-before.presentations,semantics:c.counts.semantics-before.semantics,acquisitions:c.counts.acquisitions-before.acquisitions},properties:referenceProperties,sidecar:referenceSidecar,excalidrawSidecar,companionVersion:excalidrawSidecar?app.plugins.plugins['obsidian-excalidraw-plugin']?.manifest?.version:undefined,testOwnedHeadingToken:c.testHeadingToken,context:'Actual Visual styling / Node styling subpages'});
        app.setting.close();c.ownsSettings=false;
        await until(()=>p.index.getNeighborhood(path)?.parents.some(node=>node.page.path===parentPath),'Parent fixture did not reconcile');
        const restartAt=Date.now();await app.plugins.disablePlugin('k-plex');await app.plugins.enablePlugin('k-plex');const reloaded=app.plugins.plugins['k-plex'];
        await reloaded.activateView();
        await until(()=>[...document.querySelectorAll('.kplex-role-center')].some(el=>el.dataset.kplexPath===path),'Restart did not restore stationary center');
        await until(()=>[...document.querySelectorAll('.kplex-role-parent')].some(el=>el.dataset.kplexPath===parentPath),'Restart did not complete stationary Parent without navigation');
        check(reloaded.settings.noteTypeStyles[key]?.strokeWidth===3&&reloaded.settings.noteTypeStyles[key]?.gateRadius===8&&reloaded.settings.noteTypeStyles[key]?.borderColor?.variable===heading,'Native reload lost reference or sizes');
        passed('native plugin restart restores stationary central relationship and saved reference/dimensions without history navigation',{properties:referenceProperties,scope:'Small disposable vault; normal startup, not a long-validation timing comparison'});
        await until(()=>reloaded.index.getIndexDiagnostics().some(row=>row.at>=restartAt&&row.centerCheck?.trigger==='initial'&&row.centerCheck.outcome!=='checking'),'Actual visible-center watchdog timer did not leave a diagnostic');
        const receipt=reloaded.index.getIndexDiagnostics().filter(row=>row.at>=restartAt&&row.centerCheck?.trigger==='initial'&&row.centerCheck.outcome!=='checking').at(-1);
        check(!['failed','cancelled'].includes(receipt.centerCheck.outcome),'Native watchdog did not finish against the live initial center');
        check(receipt.centerCheck.after[0]===reloaded.index.getNeighborhood(path).parents.length,'Watchdog did not observe stationary Parent coverage');
        passed('actual initial-center watchdog timer records a bounded shareable receipt after native restart',{properties:referenceProperties,receipt});
        await until(()=>reloaded.getIndexStatus().upToDate&&!reloaded.index.hasActiveSemanticPreparation(),'Recovery fixture did not drain');
        const getter=reloaded.index.getNeighborhood.bind(reloaded.index),openingLeaves=new Set(app.workspace.getLeavesOfType('k-plex-react-view')),repairAt=Date.now();
        // Present one deliberately incomplete frame, then restore the real reader without a notification.
        // The actual new surface's timer must discover the missed presentation by itself.
        reloaded.index.getNeighborhood=(target,...args)=>{const value=getter(target,...args);return target===path&&value?{...value,parents:[]}:value};
        let recoveryLeaf;
        try{
          await reloaded.createPlexTab();recoveryLeaf=app.workspace.getLeavesOfType('k-plex-react-view').find(leaf=>!openingLeaves.has(leaf));check(recoveryLeaf,'Recovery tab missing');
          await recoveryLeaf.view.waitUntilReady();reloaded.notifyNavigation(path);
          await until(()=>[...recoveryLeaf.view.containerEl.querySelectorAll('.kplex-role-center')].some(el=>el.dataset.kplexPath===path),'Recovery center missing');
          await until(()=>!reloaded.index.onDemandTasks.size&&!reloaded.index.hasActiveSemanticPreparation(),'New-tab demand did not drain');await wait(100);
          check(!recoveryLeaf.view.containerEl.querySelector('.kplex-role-parent'),'Incomplete-frame control did not reproduce');
          check(!reloaded.index.getIndexDiagnostics().some(row=>row.at>=repairAt&&row.centerCheck),'Initial timer ran before the incomplete-frame setup finished');
        }finally{reloaded.index.getNeighborhood=getter}
        await until(()=>reloaded.index.getIndexDiagnostics().some(row=>row.at>=repairAt&&row.reason==='center-watchdog:repainted'),'Timer did not diagnose the missing presentation');
        await until(()=>[...recoveryLeaf.view.containerEl.querySelectorAll('.kplex-role-parent')].some(el=>el.dataset.kplexPath===parentPath),'Actual watchdog did not restore stationary Parent');
        const repaired=reloaded.index.getIndexDiagnostics().find(row=>row.at>=repairAt&&row.reason==='center-watchdog:repainted');
        check(repaired.centerCheck.presented[0]===0&&repaired.centerCheck.after[0]>=1,'Native repair receipt lacks before/after evidence');
        recoveryLeaf.detach();passed('actual new-tab watchdog repairs a missed stationary presentation without navigation',{properties:referenceProperties,receipt:repaired,control:'Temporary getNeighborhood presentation wrapper; real index and timer unchanged'});
        c.result={status:'passed',cases:c.cases,counts:c.counts,events:c.events};return;
      }
      for (const type of ["k-plex-react-view", "k-plex-sidepanel-view"])
        for (const leaf of app.workspace.getLeavesOfType(type)) leaf.detach();
      await p.settingsWriteQueue;
      await until(
        /** Drain retired native demand before attributing work to the subsequent style operations. */ () =>
          p.index.onDemandTasks.size === 0,
        "Retired demand did not drain"
      );
      let reads = c.counts.reads,
        quietSince = performance.now();
      await until(
        /** Detaching graph tabs can reveal a Markdown renderer; exclude its initial read cascade from the style measurement. */ () => {
          if (reads !== c.counts.reads) {
            reads = c.counts.reads;
            quietSince = performance.now();
          }
          return performance.now() - quietSince >= 250;
        },
        "Native leaf read cascade did not settle"
      );
      const before = { ...c.counts };
      c.noViewBefore = before;
      let root = await open("property");
      root.querySelector('input[aria-label="' + p.translator("styles.propertyValue") + '"]').value = other;
      await editColor(root, "styles.background", "#123456");
      button(root, "common.cancel").click();
      await until(/** A cancelled draft owns no storage or live publication. */ () => !root.isConnected, "Draft Cancel did not close");
      closeManagers();
      check(!p.settings.noteTypeStyles[other] && !(await stored()).noteTypeStyles[other] && c.counts.writes === before.writes,
        "Cancelled draft changed styles or reached persistence");
      passed("unsaved name/color draft Cancel leaves live and durable styles unchanged");
      root = await open("property");
      root.querySelector(
        'input[aria-label="' + p.translator("styles.propertyValue") + '"]'
      ).value = key;
      c.holdDisk = true;
      button(root, "common.save").click();
      c.submitted = {
        text: root.textContent,
        busy: root.getAttribute("aria-busy"),
        values: [...root.querySelectorAll("input")].map(
          /** Retain synthetic draft facts only, never vault content. */ (
            input
          ) => ({ label: input.getAttribute("aria-label"), value: input.value })
        ),
        connected: root.isConnected,
      };
      await until(
        /** Verify the held native storage boundary. */ () => c.release,
        "Write did not start"
      );
      button(root, "common.save").dispatchEvent(
        new root.ownerDocument.defaultView.Event("click")
      );
      button(root, "common.cancel").dispatchEvent(
        new root.ownerDocument.defaultView.Event("click")
      );
      root.closest(".modal-container").querySelector(".modal-bg").click();
      if (root.ownerDocument === document) {
        native.webContents.sendInputEvent({
          type: "keyDown",
          keyCode: "Escape",
        });
        native.webContents.sendInputEvent({ type: "keyUp", keyCode: "Escape" });
      } else
        root.ownerDocument.dispatchEvent(
          new root.ownerDocument.defaultView.KeyboardEvent("keydown", {
            key: "Escape",
            code: "Escape",
            bubbles: true,
          })
        );
      await wait(50);
      check(
        root.isConnected && root.getAttribute("aria-busy") === "true",
        "Pending form closed"
      );
      check(!p.settings.noteTypeStyles[key], "Pending style published early");
      check(
        [...root.querySelectorAll("input,select,button")].every(
          (control) => control.disabled
        ),
        "Pending controls remained enabled"
      );
      check(
        c.counts.writes === before.writes + 1,
        "Repeated submissions reached storage"
      );
      c.holdDisk = false;
      c.release();
      c.release = null;
      await until(
        /** Observe the one native completion. */ () => !root.isConnected,
        "Released save did not close"
      );
      closeManagers();
      check(
        (await stored()).noteTypeStyles[key],
        "Property style was not durable"
      );
      passed("no-view create, duplicate clicks and pending Cancel/Escape", {
        writes: 1,
      });

      await p.updateStyleSettings(
        /** Seed imported RGBA spelling; the native color picker exposes only normalized RGB. */
        (draft) => {
          draft.noteTypeStyles[key] = {
            ...draft.noteTypeStyles[key],
            backgroundColor: "#AABBCC80",
            textColor: "#FFEEDD66",
          };
        }
      );
      root = await open("property", key);
      check(root.querySelector('button[aria-label="' + p.translator("styles.background") + '"]').textContent === "#AABBCC80", "Opening source action normalized saved spelling");
      await editColor(root, "styles.text", "#010203", true);
      await save(root);
      const rgba = (await stored()).noteTypeStyles[key];
      check(
        rgba.backgroundColor === "#AABBCC80" &&
          rgba.textColor === "#01020366" &&
          rgba.fontSize === undefined,
        "Native appearance edit lost alpha, spelling or inheritance"
      );
      passed(
        "native RGB normalization/edit preserves imported alpha and inheritance"
      );

      root = await open("property", key);
      root.querySelector('input[aria-label="' + p.translator("styles.lucideIcon") + '"]').value = "info";
      c.diskFailure = true;
      button(root, "common.save").click();
      await until(/** A rejected Save must stay editable and disclose that nothing was saved. */ () =>
        root.querySelector('[role="status"]')?.textContent === p.translator("styles.operation.notSaved"), "Rejected Save had no feedback");
      check(root.isConnected && p.settings.noteTypeStyles[key].icon === rgba.icon && (await stored()).noteTypeStyles[key].icon === rgba.icon,
        "Rejected Save changed live or durable style");
      c.diskFailure = false;
      button(root, "common.cancel").click();
      await until(/** Cancel after a failed write only discards the draft. */ () => !root.isConnected, "Failed Save draft could not cancel");
      closeManagers();
      passed("failed Save reports not saved and Cancel preserves the previous style");

      root = await open("tag");
      root.querySelector(
        'input[aria-label="' + p.translator("styles.tagPrefix") + '"]'
      ).value = key;
      await save(root);
      check(
        (await stored()).tagNodeStyles["#" + key] &&
          p.settings.noteTypeStyles[key],
        "Tag/property families collided"
      );
      passed("create both style families durably");
      root = await open("property", key);
      root.querySelector(
        'input[aria-label="' + p.translator("styles.propertyValue") + '"]'
      ).value = other;
      await save(root);
      check(
        !p.settings.noteTypeStyles[key] &&
          (await stored()).noteTypeStyles[other],
        "Property rename was not durable"
      );
      passed("rename updates the correct manager family");

      root = await open("property", other);
      c.diskFailure = true;
      button(root, "common.delete").click();
      await until(
        /** Storage failure keeps the current editor live with a safe recovery message. */ () =>
          root.querySelector('[role="status"]')?.textContent ===
          p.translator("styles.operation.notSaved"),
        "Rejected write had no feedback"
      );
      check(
        root.isConnected &&
          p.settings.noteTypeStyles[other] &&
          (await stored()).noteTypeStyles[other],
        "Rejected delete changed durable/live styles"
      );
      c.diskFailure = false;
      button(root, "common.delete").click();
      await until(
        /** Retry completes only the fixed family. */ () => !root.isConnected,
        "Delete retry did not close"
      );
      closeManagers();
      check(
        !(await stored()).noteTypeStyles[other] &&
          p.settings.tagNodeStyles["#" + key],
        "Delete affected the other family"
      );
      passed(
        "failed delete retains draft/live/disk; one retry deletes its family"
      );

      for (const failure of ["presentationFailure", "managerFailure"]) {
        root = await open("tag", "#" + key);
        root.querySelector(
          'input[aria-label="' + p.translator("styles.lucideIcon") + '"]'
        ).value = failure === "managerFailure" ? "info" : "box";
        c[failure] = true;
        await save(root);
        c[failure] = false;
        check(
          (await stored()).tagNodeStyles["#" + key].icon ===
            (failure === "managerFailure" ? "info" : "box"),
          "Saved refresh fault lost durable data"
        );
        check(
          documents().some((doc) =>
            [...doc.querySelectorAll(".notice")].some((notice) =>
              notice.textContent.includes(
                p.translator("styles.operation.savedRefreshPending")
              )
            )
          ),
          "Saved refresh fault had no truthful notice"
        );
        passed("durable " + failure + " closes with saved recovery feedback");
      }
      check(
        c.counts.semantics === before.semantics &&
          c.counts.acquisitions === before.acquisitions &&
          c.counts.sourceReads === before.sourceReads,
        "No-view styles requested unrelated source/semantic work"
      );
      passed(
        "no-view style operations perform no semantic refresh, source acquisition or K-Plex body reads",
        { nativeLeafReads: c.counts.nativeLeafReads - before.nativeLeafReads }
      );

      await p.activateView();
      await until(
        /** Require current ordinary-view readiness before taking active-view owner counters. */ () =>
          app.workspace
            .getLeavesOfType("k-plex-react-view")
            .some((leaf) =>
              leaf.view.contentEl.querySelector(".kplex-role-center")
            ),
        "Active graph did not render"
      );
      await awaitQuiet("Source startup did not settle");
      const pairFiles = p.index
        .allPages()
        .filter(
          /** Prepare genuine physical endpoints without recording their names. */ (
            page
          ) => page.file?.extension === "md"
        )
        .slice(0, 2);
      check(
        pairFiles.length === 2 &&
          (await p.index.prepareRelationshipPair(
            pairFiles[0].path,
            pairFiles[1].path
          )),
        "Selected native pair did not prepare"
      );
      check(
        p.index.isSemanticWriteReady(pairFiles[0].path, pairFiles[1].path),
        "Selected native pair lacks initial authority"
      );
      const activeBefore = { ...c.counts },
        semanticRevision = p.index.semanticPolicyRevision,
        publicationRevision = p.index.publicationRevision;
      root = await open("tag", "#" + key);
      root.querySelector(
        'input[aria-label="' + p.translator("styles.labelPrefix") + '"]'
      ).value = "Style ";
      await save(root);
      check(
        (await stored()).tagNodeStyles["#" + key].prefix === "Style ",
        "Active style edit not durable"
      );
      root = await open("tag");
      root.querySelector(
        'input[aria-label="' + p.translator("styles.tagPrefix") + '"]'
      ).value = key + "_active";
      await save(root);
      check(
        p.index.isSemanticWriteReady(pairFiles[0].path, pairFiles[1].path),
        "Tag priority discarded native relationship editing authority"
      );
      check(
        c.counts.semantics === activeBefore.semantics &&
          c.counts.acquisitions === activeBefore.acquisitions &&
          c.counts.sourceReads === activeBefore.sourceReads,
        "Active styles requested semantic/source work"
      );
      check(
        p.index.semanticPolicyRevision === semanticRevision &&
          p.index.publicationRevision === publicationRevision,
        "Active style edit changed semantic publication"
      );
      passed(
        "active on-demand graph and tag priority retain prepared editing authority without source work",
        { indexingMode: p.settings.indexingMode }
      );

      root = await open("property");
      root.querySelector('input[aria-label="' + p.translator("styles.propertyValue") + '"]').value = key;
      await save(root);
      const retainedProperty = JSON.stringify(p.settings.noteTypeStyles[key]);
      root = await open("tag", "#" + key);
      button(root, "common.delete").click();
      await until(/** Deleting a tag style must leave the identically named property family untouched. */ () => !root.isConnected, "Tag Delete did not close");
      closeManagers();
      check(!(await stored()).tagNodeStyles["#" + key] && JSON.stringify(p.settings.noteTypeStyles[key]) === retainedProperty,
        "Tag Delete affected the property family or failed persistence");
      passed("tag Delete persists and preserves identically named property style");
      root = await open("tag");
      root.querySelector('input[aria-label="' + p.translator("styles.tagPrefix") + '"]').value = key;
      root.querySelector('input[aria-label="' + p.translator("styles.labelPrefix") + '"]').value = "Style ";
      await save(root);

      c.ownsSettings = true;
      p.openSettings();
      await until(
        /** Native Settings may mount in a separate document; await its actual root before navigation. */ () =>
          tab.containerEl.isConnected,
        "Native Settings did not attach"
      );
      /** Navigate the existing declarative subpages through their real native rows. */
      const navigate = async (key) => {
        let row;
        await until(
          /** Reacquire this page's exact localized entry after the previous native render. */ () => {
            row = [
              ...tab.containerEl.ownerDocument.querySelectorAll(
                ".setting-item-name"
              ),
            ]
              .find((element) => element.textContent === p.translator(key))
              ?.closest(".setting-item");
            return row;
          },
          "Native settings entry unavailable: " + key
        );
        row.click();
        await wait(50);
      };
      await navigate("settings.ui.visual.styling");
      await navigate("settings.ui.node.styling");
      await navigate("styles.nodeTitle");
      root = await open("property", null, true);
      const settingsDocument = tab.containerEl.ownerDocument;
      check(
        root.ownerDocument === settingsDocument,
        "Style editor escaped its owning Settings document"
      );
      root.querySelector(
        'input[aria-label="' + p.translator("styles.propertyValue") + '"]'
      ).value = key + "_settings";
      await save(root);
      check(
        (await stored()).noteTypeStyles[key + "_settings"],
        "Owning Settings save was not durable"
      );
      passed(
        "actual Settings subpages and style manager complete in their owning document",
        { popout: settingsDocument !== document }
      );
      app.setting.close();
      c.ownsSettings = false;

      const compatibilityBefore = {semantics: c.counts.semantics, acquisitions: c.counts.acquisitions, sourceReads: c.counts.sourceReads};
      p.settings.noteTypeStyles[key].textColor = "#12345678";
      let compatibilityRejected = false;
      c.diskFailure = true;
      try {await p.saveSettings(false, false);} catch {compatibilityRejected = true;} finally {c.diskFailure = false;}
      check(compatibilityRejected, "Compatibility storage fault was not observed");
      await p.saveSettings(false, false);
      const retried = await stored(), selected = retried.appearanceThemes.themes.find(theme => theme.id === retried.appearanceThemes.selectedId);
      check(retried.noteTypeStyles[key].textColor === "#12345678" && selected.appearance.semantic.noteTypeStyles[key].textColor === "#12345678",
        "Retried compatibility save left the active theme out of sync");
      check(Object.entries(compatibilityBefore).every(([name, count]) => c.counts[name] === count), "Compatibility color retry requested semantic/source work");
      passed("failed imperative appearance save retries with a coherent durable selected theme and no source work");

      const data = await stored();
      await app.plugins.disablePlugin("k-plex");
      await app.plugins.enablePlugin("k-plex");
      const reloaded = app.plugins.plugins["k-plex"];
      check(
        reloaded.settings.tagNodeStyles["#" + key].prefix ===
          data.tagNodeStyles["#" + key].prefix,
        "Reload lost committed style"
      );
      check(reloaded.settings.noteTypeStyles[key].textColor === "#12345678", "Reload lost retried compatibility color");
      // Cleanup reacquires the new lifetime; it cannot restore wrappers or settings onto the retired plugin.
      for (const restore of c.restores.reverse()) restore();
      c.restores = [];
      reloaded.settings = c.settings;
      reloaded.savedSettingsPolicy = c.policy;
      await reloaded.index.refreshPresentationSettings();
      await app.workspace.changeLayout(c.layout);
      c.cleaned = true;
      passed("committed style survives native plugin reload");
      c.result = {
        status: "passed",
        cases: c.cases,
        counts: c.counts,
        events: c.events,
        foreground: !document.hidden,
        settingsDocumentDiffers: tab.containerEl.ownerDocument !== document,
      };
    } catch (error) {
      c.error = String(error);
      if(referenceOnly&&c.fixtureFile){
        const live=app.plugins.plugins['k-plex'],path=c.fixtureFile.path,neighborhood=live?.index.getNeighborhood(path);
        c.failureObservation={fixtureMetadata:app.metadataCache.getFileCache(c.fixtureFile)?.frontmatter,
          indexStatus:live?.getIndexStatus(),sourceReady:live?.index.isCenterRecoverySourceReady(),
          sourceBackedStartup:live?.index.hasSourceBackedStartup(),activeSemantic:live?.index.hasActiveSemanticPreparation(),
          onDemandTasks:live?.index.onDemandTasks.size,sourceCounters:live?.index.getSourceAcquisitionCounters(),
          resolvedTargets:Object.keys(app.metadataCache.resolvedLinks[path]??{}),filePresent:app.vault.getFileByPath(path)===c.fixtureFile,
          parents:neighborhood?.parents.map(item=>item.page.path),children:neighborhood?.children.map(item=>item.page.path),
          centerFile:neighborhood?.center.file?.path,demanded:live?.index.semanticDemandCounts.get(path)??0,
          diagnostics:live?.index.getIndexDiagnostics(),visibleCenters:[...document.querySelectorAll('.kplex-role-center')].map(el=>el.dataset.kplexPath)};
      }
    } finally {
      if (!c.cleaned) {
        try {
          await c.cleanup();
        } catch (error) {
          c.cleanupError = String(error);
        }
      }
      c.done = true;
    }
  };
  window.setTimeout(
    /** Return the initial CLI response before bounded asynchronous native work starts. */ () => {
      void run();
    },
    0
  );
  return true;
}

const report = {
  schemaVersion: 1,
  node: process.version,
  obsidian: cli("version"),
  artifacts,
  status: "running",
  activation: "programmatic native manager/editor DOM",
};
try {
  evaluate("JSON.stringify((" + start.toString() + ")("+JSON.stringify(process.env.KPLEX_STYLE_REFERENCE_ONLY==="true")+","+JSON.stringify(process.env.KPLEX_STYLE_REFERENCE_PROPERTIES==="true")+","+JSON.stringify(process.env.KPLEX_STYLE_SIDECAR_GATE_ONLY==="true")+","+JSON.stringify(process.env.KPLEX_STYLE_REFERENCE_SIDECAR==="true")+","+JSON.stringify(process.env.KPLEX_STYLE_LIVENESS||false)+","+JSON.stringify(process.env.KPLEX_STYLE_EXCALIDRAW_SIDECAR==="true")+"))");
  const end = Date.now() + 180000;
  while (true) {
    await pause(100);
    const state = evaluate(
      "JSON.stringify((()=>{const c=window.__kplex146Styles;return {done:c?.done,error:c?.error,cleanupError:c?.cleanupError,cleaned:c?.cleaned,result:c?.result,submitted:c?.submitted,counts:c?.counts,events:c?.events,cases:c?.cases,noViewBefore:c?.noViewBefore,readFacts:c?.readFacts,failureObservation:c?.failureObservation,gateBaseline:c?.gateBaseline,gateFinal:c?.gateFinal,quietObservation:c?.quietObservation}})())"
    );
    if (state.done) {
      Object.assign(report, state);
      assert(!state.error, state.error);
      assert(!state.cleanupError, state.cleanupError);
      assert(state.cleaned);
      report.status = "passed";
      break;
    }
    assert(Date.now() < end, "Style matrix deadline expired");
  }
} catch (error) {
  report.status = "failed";
  report.error = String(error);
  process.exitCode = 1;
} finally {
  try {
    evaluate(
      "JSON.stringify((()=>{const c=window.__kplex146Styles;if(c&&!c.done){c.cancelled=true;c.holdDisk=false;c.release?.();}return true})())"
    );
    const end = Date.now() + 20000;
    while (
      !evaluate(
        "JSON.stringify(!window.__kplex146Styles||window.__kplex146Styles.done)"
      )
    ) {
      assert(Date.now() < end, "Cleanup deadline expired");
      await pause(100);
    }
    evaluate("JSON.stringify(delete window.__kplex146Styles)");
  } catch (error) {
    report.status = "failed";
    report.cleanupFailure = String(error);
    process.exitCode = 1;
  }
  for (const saved of bytes) writeFileSync(saved.path, saved.bytes);
  report.configurationRestored = bytes.every((saved) =>
    readFileSync(saved.path).equals(saved.bytes)
  );
  writeFileSync(
    join(output, "style-operations-native.json"),
    JSON.stringify(report, null, 2) + "\n"
  );
}
console.log(
  JSON.stringify({
    status: report.status,
    cases: report.result?.cases.length,
    error: report.error,
    cleanupFailure: report.cleanupFailure,
    configurationRestored: report.configurationRestored,
  })
);
