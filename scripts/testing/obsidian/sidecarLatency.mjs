/**
 * Exact-build Sidecar request/latency acceptance in the explicitly selected disposable small vault.
 * Warm, equal-input navigation compares managed Sidecar, closed and same-size ordinary native panes.
 * Test-owned forwarding wrappers record overlapping owner boundaries, not paint or physical-mobile
 * latency. Native opening/representation remains authoritative. Cleanup restores fixtures, wrappers,
 * workspace, settings/follow ownership and exact configuration bytes independently of success.
 */
import {withNativeDocumentSessions} from "./nativeDocumentSessions.mjs";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnNativeSync, obsidianCliExecutable } from "./processTools.mjs";
import { validateTarget } from "./runner.mjs";
const root = resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const vaultName = process.env.KPLEX_TEST_VAULT_NAME;
assert.equal(vaultName, "kplex-test-small", "Select the prepared disposable small vault explicitly");
const target = validateTarget({ vaultName, vaultPath: process.env.KPLEX_TEST_VAULT_PATH, configDir: process.env.KPLEX_TEST_CONFIG_DIR });
const { vault, config, pluginDir: plugin } = target;
const output = process.env.KPLEX_HOST_REPORT_DIR;
assert(output && (!existsSync(output) || !readdirSync(output).length), "Select a fresh report directory");
mkdirSync(output, { recursive: true });
writeFileSync(join(output, "driver-source.mjs"), readFileSync(fileURLToPath(import.meta.url)));
const phase = "candidate";
/** Invoke only the selected vault through bounded, shell-free native transport; reject error payloads as well as process failures. */
const cli = (command, ...args) => {
  const result = spawnNativeSync(obsidianCliExecutable(), [`vault=${vaultName}`, command, ...args], {
    encoding: "utf8",
    timeout: 30000,
    killSignal: "SIGKILL",
    maxBuffer: 4 * 1024 * 1024,
  });
  if (result.error || result.status !== 0 || /^Error:/m.test(result.stdout)) throw result.error ?? Error(result.stderr || result.stdout);
  return result.stdout.trim();
};
/** Deserialize finite observations without retaining renderer instances across native reloads. */
const evalJSON = (code) => JSON.parse(cli("eval", "code=" + withNativeDocumentSessions(code)).replace(/^=>\s*/, ""));
/** Keep polling outside the renderer so native work and cleanup can progress. */
const pause = (ms) => new Promise(/** Resolve one bounded outer poll interval. */ (done) => setTimeout(done, ms));
assert.equal(cli("vault", "info=path"), vault);
const bytes = ["plugins/k-plex/data.json", "community-plugins.json", "workspace.json"].map(
  /** Preserve exact settings, enabled-list and workspace bytes independently of success. */ (name) => ({
    path: join(config, name),
    bytes: readFileSync(join(config, name)),
  }),
);
const artifacts = Object.fromEntries(
  ["main.js", "styles.css", "manifest.json"].map(
    /** Refuse any mismatch between the tested runtime and this repository's three built artifacts. */ (name) => {
      const built = readFileSync(join(root, "dist", name)),
        installed = readFileSync(join(plugin, name));
      assert(built.equals(installed));
      return [name, createHash("sha256").update(built).digest("hex")];
    },
  ),
);
/** Own one synthetic linked-note sequence, finite forwarding wrappers and reversible native layout/settings changes. No production diagnostics are installed. */
function start() {
  const p = app.plugins.plugins["k-plex"],
    remote = require("@electron/remote"),
    win = remote.getCurrentWindow();
  if (window.__kplex140Latency || app.setting.isOpen || document.querySelector(".modal-container")) throw Error("Clean host prerequisites required");
  const c = (window.__kplex140Latency = {
    settings: JSON.parse(JSON.stringify(p.settings)),
    layout: app.workspace.getLayout(),
    owners: { documents:documentSessions(p).capture(), last: p.lastDocumentLeaf, recent: [...p.recentLeafHistory], sidecars: new Map(p.sidecarLeaves) },
    samples: [],
    events: [],
    wrappers: [],
    done: false,
    cancelled: false,
    owned: false,
  });
  const folder = "__kplex140_latency";
  let host, companion, activeSample;
  /** Reject a retired controller or unmet native prerequisite. */
  const check = (value, message) => {
    if (c.cancelled || !value) throw Error(c.cancelled ? "Retired latency probe" : message);
  };
  /** Yield ordinary owning-window tasks while fencing controller retirement. */
  const wait = async (ms) => {
    check(true, "alive");
    await new Promise(/** Yield one task in the owning native renderer. */ (done) => window.setTimeout(done, ms));
    check(true, "alive");
  };
  /** Bound a native observable condition without leaving an IPC command awaiting it. */
  const until = async (read, label) => {
    const end = performance.now() + 15000;
    while (!read()) {
      check(performance.now() < end, label);
      await wait(10);
    }
  };
  /** Reacquire the currently rendered central identity after React publications. */
  const center = () => host?.view.contentEl.querySelector(".kplex-role-center")?.dataset.kplexPath;
  /** Retain phase boundaries only while an owned sample is active; times overlap and are not paint. */
  const record = (name, edge, details = {}) => {
    if (activeSample) c.events.push({ sample: activeSample.id, name, edge, t: performance.now() - activeSample.start, ...details });
  };
  /** Forward the exact native receiver/arguments and restore only this wrapper in cleanup. */
  const wrap = (owner, key, name, detail) => {
    const original = owner[key];
    check(typeof original === "function", name + " missing");
    /** Preserve the real native call, including its receiver, returned value and rejection. */
    const replacement = function (...args) {
      record(name, "start", detail?.(args) ?? {});
      let result;
      try {
        result = original.apply(this, args);
      } catch (error) {
        record(name, "error");
        throw error;
      }
      if (result?.then)
        return result.then(
          /** Record completion without replacing the native return value. */ (value) => {
            record(name, "end");
            return value;
          },
          /** Retain native rejection semantics while recording its boundary. */ (error) => {
            record(name, "error");
            throw error;
          },
        );
      record(name, "end", name === "follow-eligible" ? { eligible: result } : {});
      return result;
    };
    owner[key] = replacement;
    c.wrappers.push(
      /** Restore only this exact wrapper, preserving a later owner. */ () => {
        if (owner[key] === replacement) owner[key] = original;
      },
    );
  };
  /** Reacquire the main graph surface after native view creation. */
  const acquire = () => {
    host = app.workspace.getLeavesOfType("k-plex-react-view")[0];
    return Boolean(host?.view.contentEl.querySelector(".kplex-role-center"));
  };
  /** Repeat equal settled-index navigation with fixed inputs; report DOM/native boundaries separately. */
  const samples = async (condition, files) => {
    await until(/** Require current local-graph readiness before comparing another sample. */ () => p.getIndexStatus().upToDate, "Condition readiness pending");
    for (let i = 0; i < 12; i++) {
      const file = files[(i + 1) % files.length];
      await until(
        /** Require current local-graph readiness before comparing another sample. */ () => p.getIndexStatus().upToDate,
        "Previous local graph pending",
      );
      await wait(100);
      const sample = (activeSample = {
        id: condition + "-" + i,
        condition,
        index: i,
        start: performance.now(),
        hidden: document.hidden,
        focused: document.hasFocus(),
        fileNumber: (i + 1) % files.length,
      });
      c.samples.push(sample);
      p.notifyNavigation(file.path);
      sample.dispatchedMs = performance.now() - sample.start;
      await until(/** Read the currently rendered requested identity. */ () => center() === file.path, "Latest center absent");
      sample.centerDomMs = performance.now() - sample.start;
      if (condition === "sidecar") {
        await until(/** Require canonical native file identity, not just path equality. */ () => companion.view.file === file, "Sidecar target absent");
        sample.nativeTargetMs = performance.now() - sample.start;
      }
      await wait(200);
      sample.settledMs = performance.now() - sample.start;
      sample.centerCorrect = center() === file.path;
      sample.sidecarCorrect = condition !== "sidecar" || companion.view.file === file;
      sample.mode = companion?.getViewState().state?.mode;
      sample.semanticRevision = p.index.getSemanticRevision();
      sample.status = p.getIndexStatus();
      sample.hiddenEnd = document.hidden;
      sample.events = c.events.filter(/** Associate overlapping owner events with their originating sample. */ (event) => event.sample === sample.id);
      const opens = sample.events.filter(
        /** Count real opens rather than summing overlapping durations. */ (event) => event.name === "native-open" && event.edge === "start",
      ).length;
      check(opens === (condition === "sidecar" ? 1 : 0), "A center switch must open its managed companion exactly once");
      check(sample.centerCorrect && sample.sidecarCorrect, "A settled sample lost its requested target");
      check(!sample.hidden && !sample.hiddenEnd, "Background samples are not comparable foreground measurements");
      delete sample.start;
      activeSample = null;
    }
  };
  /** Restore wrappers, fixtures, settings and the original native ownership/layout even after a failed assertion. */
  c.cleanup = () =>
    (c.cleanupTask ??= (async () => {
      c.cancelled = true;
      await c.task;
      for (const release of c.wrappers.reverse()) release();
      c.wrappers = [];
      Object.assign(p.settings, c.settings);
      await p.saveSettings(false, false);
      if (c.owned) {
        const file = app.vault.getFolderByPath(folder);
        if (file) await app.vault.delete(file, true);
        c.owned = false;
      }
      await app.workspace.changeLayout(c.layout);
      const leaves = [];
      app.workspace.iterateAllLeaves(/** Collect native layout identities for restoration only. */ (leaf) => leaves.push(leaf));
      /** Restore ownership by native leaf identity after layout replacement, never by a remembered DOM instance. */
      const rebind = /** Rebind saved ownership to the current native leaf generation. */ (old) =>
        old ? (leaves.find(/** Match the saved native identity after layout restoration. */ (leaf) => leaf.id === old.id) ?? null) : null;
      await documentSessions(p).restore(c.owners.documents);
      p.lastDocumentLeaf = rebind(c.owners.last);
      p.recentLeafHistory = c.owners.recent.map(rebind).filter(Boolean);
      p.sidecarLeaves.clear();
      for (const [h, s] of c.owners.sidecars) {
        const nh = rebind(h),
          ns = rebind(s);
        if (nh && ns) p.sidecarLeaves.set(nh, ns);
      }
      p.index.notifyPresentation();
      c.cleaned = true;
    })());
  /** Start native setup after returning the initial CLI response; no probe task owns persistent configuration. */
  c.task = new Promise(/** Return the IPC response before starting asynchronous native setup. */ (done) => window.setTimeout(done, 0))
    .then(
      /** Run the owned equal-input native sequence after IPC returns. */ async () => {
        remote.app.show?.();
        remote.app.focus({ steal: true });
        win.restore();
        win.show();
        win.focus();
        win.webContents.focus();
        await until(
          /** Require an actual foreground renderer without overriding throttling. */ () => !document.hidden && document.hasFocus(),
          "Foreground required",
        );
        await until(/** Wait for normal startup ownership to settle. */ () => !p.isStartupInitializing(), "Startup ownership pending");
        p.settings.embedCentralNode = false;
        p.settings.startInPopout = false;
        p.settings.animationSpeed = 1;
        p.settings.sidecarMarkdownMode = "preview";
        await documentSessions(p).off();
        await p.activateView();
        await until(acquire, "Graph absent");
        // A mode reload can still be restoring source-backed startup. Establish the ordinary
        // graph first so startup publication cannot replace freshly inserted synthetic fixtures.
        await until(/** Require settled startup before creating measurement inputs. */ () => p.getIndexStatus().upToDate, "Initial graph readiness pending");
        check(!app.vault.getFolderByPath(folder), "Fixture collision");
        await app.vault.createFolder(folder);
        c.owned = true;
        const files = [];
        for (const name of ["A", "B", "C", "D"])
          files.push(
            await app.vault.create(
              folder + "/" + name + ".md",
              "# " + name + "\n\n[[" + folder + "/" + (name === "D" ? "A" : String.fromCharCode(name.charCodeAt(0) + 1)) + "]]\n",
            ),
          );
        for (const file of files) p.index.insertCreatedFile(file);
        c.fixture = {
          markdown: app.vault.getMarkdownFiles().length,
          sequence: files.length,
          indexMode: p.settings.indexingMode,
          backgroundUrls: p.settings.urlIndexingMode,
          animationSpeed: 1,
          embedded: false,
          viewport: { width: window.innerWidth, height: window.innerHeight },
          readiness: p.getIndexStatus(),
          throttled: win.webContents.getBackgroundThrottling?.(),
        };
        for (const file of files) {
          p.notifyNavigation(file.path);
          await until(/** Read the currently rendered requested identity. */ () => center() === file.path, "Warmup center absent");
          await until(
            /** Require current local-graph readiness before comparing another sample. */ () => p.getIndexStatus().upToDate,
            "Warmup readiness pending",
          );
          await wait(150);
        }
        p.notifyNavigation(files[0].path);
        await until(
          /** Start measurement from the same settled central note. */ () => center() === files[0].path && p.getIndexStatus().upToDate,
          "Initial settled center absent",
        );
        await wait(400);
        c.fixture.readiness = p.getIndexStatus();
        for (const [key, label] of [
          ["saveSettings", "settings-save"],
          ["syncPageToDocumentLeaf", "linked-sync"],
          ["syncSidecarToPage", "sidecar-sync"],
        ])
          wrap(p, key, label);
        wrap(
          p,
          "shouldFollowDocumentFile",
          "follow-eligible",
          /** Attribute eligibility to the synthetic note name only. */ (args) => ({ file: args[0]?.path.split("/").pop() }),
        );
        wrap(
          app.workspace,
          "trigger",
          "workspace-event",
          /** Retain native event kinds and synthetic file-open attribution. */ (args) => ({
            event: args[0],
            file: args[0] === "file-open" ? args[1]?.path.split("/").pop() : undefined,
          }),
        );
        wrap(p, "persistSettingsSnapshot", "settings-disk");
        wrap(p.index, "rebuild", "rebuild");
        wrap(app.vault, "cachedRead", "body-read");
        wrap(p.index, "acquireSemanticDemand", "semantic-demand");
        await samples("closed", files);
        await p.openSidecar(host, p.index.get(files[0].path));
        companion = p.sidecarLeaves.get(host);
        check(companion, "Managed Sidecar absent");
        wrap(companion, "openFile", "native-open");
        wrap(
          companion,
          "setViewState",
          "native-state",
          /** Record finite native representation facts. */ (args) => ({ type: args[0]?.type, mode: args[0]?.state?.mode }),
        );
        await wait(400);
        c.sidecarGeometry = { host: host.view.containerEl.getBoundingClientRect().toJSON(), note: companion.view.containerEl.getBoundingClientRect().toJSON() };
        await samples("sidecar", files);
        const lastFile = files[0],
          surfaceId = [...p.actionSurfaceHosts].find(/** Resolve the actual registered owning action surface. */ ([, entry]) => entry.leaf === host)?.[0];
        check(surfaceId, "Registered surface absent");
        activeSample = { id: "same-file-and-camera", start: performance.now() };
        c.samples.push(activeSample);
        for (let i = 0; i < 4; i++) p.notifyNavigation(lastFile.path);
        for (const id of ["view.pan.right", "view.zoom-in", "view.zoom-out"]) {
          const outcome = await p.actionManager.dispatch({ id, source: "internal", surfaceId });
          check(outcome.status === "completed", "Camera action failed");
        }
        await wait(250);
        activeSample.events = c.events.filter(/** Retain only the active controller-owned scenario events. */ (event) => event.sample === activeSample.id);
        activeSample.centerCorrect = center() === lastFile.path;
        activeSample.sidecarCorrect = companion.view.file === lastFile;
        check(activeSample.centerCorrect && activeSample.sidecarCorrect, "Camera actions changed document identity");
        check(
          !activeSample.events.some(
            /** Reject document or index work caused by camera/same-file actions. */ (event) =>
              event.edge === "start" && ["native-open", "body-read", "rebuild"].includes(event.name),
          ),
          "Same-file/camera actions must not reopen notes, read bodies or rebuild",
        );
        delete activeSample.start;
        activeSample = null;
        activeSample = { id: "rapid", start: performance.now() };
        c.samples.push(activeSample);
        p.notifyNavigation(files[0].path);
        p.notifyNavigation(files[1].path);
        p.notifyNavigation(files[2].path);
        p.notifyNavigation(files[3].path);
        await until(
          /** Require the newest rapid request in both graph and native document. */ () => center() === files[3].path && companion.view.file === files[3],
          "Rapid latest target lost",
        );
        await wait(150);
        check(center() === files[3].path && companion.view.file === files[3], "Late request overrode latest target");
        c.rapidLatestTarget = true;
        activeSample.events = c.events.filter(/** Retain only the active controller-owned scenario events. */ (event) => event.sample === activeSample.id);
        delete activeSample.start;
        activeSample = null;
        const originalOpen = companion.openFile;
        let releaseOpen, enteredOpen = false, openCount = 0;
        const heldOpen = async function(...args) {
          openCount++;
          if (!enteredOpen) { enteredOpen = true; await new Promise(/** Hold one genuine native open until a newer A/B/A request arrives. */ resolve => { releaseOpen = resolve; }); }
          return originalOpen.apply(this, args);
        };
        companion.openFile = heldOpen;
        try {
          p.notifyNavigation(files[0].path);
          await until(/** Ensure the first request has actually entered native opening before superseding it. */ () => enteredOpen, "Held Sidecar open did not start");
          p.notifyNavigation(files[1].path); p.notifyNavigation(files[0].path);
          releaseOpen();
          await until(/** The newest same-file request must settle the graph and companion together. */ () => center() === files[0].path && companion.view.file === files[0], "Rapid A/B/A target lost");
          await wait(150);
          check(center() === files[0].path && companion.view.file === files[0] && openCount === 1,
            "A/B/A oscillated or redundantly reopened its in-flight final file");
          c.rapidReturnTarget = { passed: true, nativeOpens: openCount };
        } finally { releaseOpen?.(); if (companion.openFile === heldOpen) companion.openFile = originalOpen; }
        await p.detachSidecar(host);
        check(!p.sidecarLeaves.has(host) && p.getDocumentSyncMode(host) === "off", "Ordinary control must release sync");
        c.ordinaryGeometry = {
          host: host.view.containerEl.getBoundingClientRect().toJSON(),
          note: companion.view.containerEl.getBoundingClientRect().toJSON(),
        };
        check(
          Math.abs(c.ordinaryGeometry.host.width - c.sidecarGeometry.host.width) < 1 &&
            Math.abs(c.ordinaryGeometry.note.width - c.sidecarGeometry.note.width) < 1,
          "Ordinary-pane control changed the Sidecar footprint",
        );
        await wait(400);
        await samples("ordinary-pane", files);
        // Reopening after a move and explicit unlink must acquire usable native
        // geometry before normal linked navigation, even with retained pixel bases.
        await p.openSidecar(host, p.index.get(files[0].path));
        await p.moveSidecar(host, "left", p.index.get(files[0].path));
        await documentSessions(p).off();
        await p.setDocumentSyncMode(host,"pinned",p.index.get(files[0].path));
        await p.openSidecar(host, p.index.get(files[0].path));
        const reopened = p.sidecarLeaves.get(host);
        check(reopened && p.getSidecarPosition(host) === "left"
          && reopened.view.containerEl.getBoundingClientRect().width > 8,
        "Reopened Sidecar lost ownership or native pane allocation");
        p.notifyNavigation(files[3].path);
        await until(/** Native navigation must use the reopened companion. */ () =>
          center() === files[3].path && reopened.view.file === files[3], "Reopened Sidecar did not follow latest navigation");
        c.reopenAfterUnlink = { passed: true, position: p.getSidecarPosition(host), width: reopened.view.containerEl.getBoundingClientRect().width };
        c.done = true;
      },
    )
    .catch(
      /** Retain failure facts before cleanup without leaking the controller. */ (error) => {
        c.error = String(error.stack ?? error);
        c.failure = {
          center: center(),
          lastActive: p.settings.lastActivePath,
          native: companion?.view.file?.path,
          requests: host ? { file: p.passiveSidecarSyncRequests.get(host)?.file?.path, pending: p.passiveSidecarSyncRequests.get(host)?.pending } : null,
        };
        if (activeSample) {
          activeSample.events = c.events.filter(/** Retain only the active controller-owned scenario events. */ (event) => event.sample === activeSample.id);
          delete activeSample.start;
        }
        c.done = true;
      },
    );
  return true;
}
let installed = false;
const report = { phase, node: process.version, host: cli("version"), artifacts, startedAt: new Date().toISOString(), status: "running" };
try {
  cli("dev:errors", "clear");
  evalJSON(`JSON.stringify((${start.toString()})())`);
  installed = true;
  const end = Date.now() + 180000;
  while (true) {
    const state = evalJSON("JSON.stringify({done:window.__kplex140Latency?.done,error:window.__kplex140Latency?.error})");
    if (state.done) {
      assert(!state.error, state.error);
      break;
    }
    assert(Date.now() < end, "Probe deadline");
    await pause(500);
  }
  Object.assign(
    report,
    evalJSON(
      "JSON.stringify({samples:window.__kplex140Latency.samples,events:window.__kplex140Latency.events,fixture:window.__kplex140Latency.fixture,ordinaryGeometry:window.__kplex140Latency.ordinaryGeometry,sidecarGeometry:window.__kplex140Latency.sidecarGeometry,rapidLatestTarget:window.__kplex140Latency.rapidLatestTarget,rapidReturnTarget:window.__kplex140Latency.rapidReturnTarget,reopenAfterUnlink:window.__kplex140Latency.reopenAfterUnlink})",
    ),
  );
  report.errors = cli("dev:errors");
  assert(/^No errors captured\.?$/i.test(report.errors));
  report.status = "passed";
} catch (error) {
  report.status = "failed";
  report.error = String(error.stack ?? error);
  if (installed)
    Object.assign(
      report,
      evalJSON("JSON.stringify({samples:window.__kplex140Latency?.samples,events:window.__kplex140Latency?.events,failure:window.__kplex140Latency?.failure})"),
    );
  process.exitCode = 1;
} finally {
  if (installed) {
    try {
      evalJSON(
        "(()=>{const c=window.__kplex140Latency;c.cleanup().then(()=>c.cleanupDone=true,error=>{c.cleanupError=String(error);c.cleanupDone=true});return JSON.stringify(true)})()",
      );
      const end = Date.now() + 30000;
      while (true) {
        const state = evalJSON(
          "JSON.stringify({done:window.__kplex140Latency?.cleanupDone,error:window.__kplex140Latency?.cleanupError,cleaned:window.__kplex140Latency?.cleaned})",
        );
        if (state.done) {
          assert(!state.error, state.error);
          assert(state.cleaned);
          report.cleaned = true;
          break;
        }
        assert(Date.now() < end, "Cleanup deadline");
        await pause(100);
      }
      evalJSON("JSON.stringify(delete window.__kplex140Latency)");
    } catch (error) {
      report.cleanupError = String(error);
      report.status = "failed";
      process.exitCode = 1;
    }
  }
  for (const entry of bytes) {
    writeFileSync(entry.path, entry.bytes);
    assert(readFileSync(entry.path).equals(entry.bytes));
  }
  report.configurationRestored = true;
  report.limitations = [
    "Desktop native API/DOM completion with forwarding observer overhead; no trusted pointer, actual paint or physical HarmonyOS responsiveness evidence.",
  ];
  report.finishedAt = new Date().toISOString();
  writeFileSync(join(output, "sidecar-latency-native.json"), JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify({ phase, status: report.status, error: report.error, samples: report.samples?.length, cleaned: report.cleaned }));
}
