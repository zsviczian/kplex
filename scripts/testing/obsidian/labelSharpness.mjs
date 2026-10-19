/**
 * Bounded native scroll-raster investigation. Reuses the controlled Small-vault transport,
 * captures actual Electron pixels privately, and restores its own leaf, fixtures and settings.
 * Screenshots establish observed appearance on this host, not universal sharpness or speed.
 */
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { runControlledProbe } from "./controlledProbe.mjs";

/** Capture one overflowed child area at adjacent native scroll offsets after all motion settles. */
async function scenario(app, c) {
  const p = app.plugins.plugins["k-plex"];
  if (!p || app.vault.getFiles().length >= 1000 || app.setting.isOpen) throw Error("Clean Small-vault prerequisites required");
  const settings = structuredClone(p.settings), policy = p.savedSettingsPolicy;
  const active = app.workspace.activeLeaf, folder = "Kplex-Sharpness-149-" + Date.now();
  const owned = [], releases = [], restores = [], samples = [];
  let leaf, createdFolder, restoreWindow, failure;
  const wait = ms => new Promise(resolve => window.setTimeout(resolve, ms));
  const check = (value, message) => { if (!value) throw Error(message); };
  /** Native metadata, source work, camera frames and pixels settle independently. */
  const until = async (predicate, message) => {
    const end = Date.now() + 60000;
    while (!predicate()) { check(!c.closed && Date.now() < end, message); await wait(50); }
  };
  try {
    await until(() => !p.isStartupInitializing(), "Startup did not settle");
    const remote = require("@electron/remote"), win = remote.getCurrentWindow();
    const bounds = win.getBounds(), maximized = win.isMaximized(), minimized = win.isMinimized();
    restoreWindow = () => { win.setBounds(bounds); if (maximized) win.maximize(); if (minimized) win.minimize(); };
    remote.app.show?.(); remote.app.focus({ steal: true }); win.restore(); win.show(); win.focus();
    await until(() => !document.hidden && document.hasFocus(), "Foreground absent");
    createdFolder = await app.vault.createFolder(folder);
    const names = Array.from({ length: 16 }, (_, i) => "Readable projects and learning " + String(i + 1).padStart(2, "0"));
    const childKey = p.settings.hierarchy.children[0]; check(childKey, "Configured child field absent");
    for (const name of [...names, "Center", "Outline"]) {
      const body = name === "Center" ? "---\n" + JSON.stringify(childKey) + ": " + JSON.stringify(names.map(n => "[[" + folder + "/" + n + "]]")) + "\n---\n"
        : name === "Outline" ? names.slice(0, 8).map((n, i) => "# Heading " + (i + 1) + "\n[[" + folder + "/" + n + "]]\n").join("\n") : "Disposable scroll fixture.\n";
      owned.push(await app.vault.create(folder + "/" + name + ".md", body));
    }
    await until(() => owned.every(file => app.metadataCache.getFileCache(file)), "Native fixture metadata absent");
    Object.assign(p.settings, { documentSyncMode: "off", sidecarOpen: false, followActiveFile: false,
      autoOpenCentralDocument: false, embedCentralNode: false, showInferredNodes: true,
      showPageNodes: true, showFolderNodes: false, showTagNodes: false, graphDepth: 1,
      renderSiblings: false, graphLenses: [], applyPowerFilter: false, animationSpeed: 0,
      allowAutozoom: false, childColumns: 1, childMaxHeight: 300, baseFontSize: 22, typographyProfiles: {}, lastActivePath: folder + "/Center.md" });
    for (const profile of Object.values(p.settings.layoutProfiles)) Object.assign(profile, { childColumns: 1, compactingFactor: 1.5 });
    for (const file of owned) { p.index.insertCreatedFile(file); releases.push(p.index.acquireSemanticDemand(file.path)); }
    await until(() => !p.index.hasPendingSemanticPreparation(), "Fixture preparation pending");
    leaf = app.workspace.getLeaf(sharpnessPopout ? "window" : "tab"); await leaf.setViewState({ type: "k-plex-react-view", active: true });
    await app.workspace.revealLeaf(leaf); await leaf.view.waitUntilReady();
    p.notifyNavigation(folder + "/Center.md", leaf);
    const root = leaf.view.contentEl;
    const view = root.ownerDocument.defaultView, native = view.require("@electron/remote").getCurrentWindow();
    native.restore(); native.show(); native.focus(); native.webContents.focus();
    await until(() => !view.document.hidden && view.document.hasFocus(), "Owning foreground absent");
    await until(() => root.querySelectorAll(".kplex-zone-child .kplex-thought").length === names.length, "Overflowed child area absent");
    await wait(1200);
    const camera = root.querySelector(".kplex-camera"), graph = root.querySelector(".kplex-plex");
    const scroll = root.querySelector(".kplex-zone-child .kplex-zone-scroll");
    check(scroll.scrollHeight > scroll.clientHeight + 100, "Fixture must overflow");
    const host = { dpr: view.devicePixelRatio, versions: process.versions, platform: process.platform,
      surface: sharpnessPopout ? "popout" : "main", hostZoom: native.webContents.getZoomFactor(), hardwareAcceleration: remote.app.isHardwareAccelerationEnabled?.() };
    /** Crop the same physical area with an integer screen rectangle, without resizing pixels. */
    const sample = async (label, area = scroll) => {
      await wait(200);
      const rect = area.getBoundingClientRect(), computed = view.getComputedStyle(camera);
      if (sharpnessExpectAuto) check(computed.willChange === "auto", "Retained camera raster hint");
      const x = Math.max(0, Math.floor(rect.left)), y = Math.max(0, Math.floor(rect.top));
      const image = await native.webContents.capturePage({ x, y,
        width: Math.min(Math.ceil(rect.width), view.innerWidth - x), height: Math.min(Math.ceil(rect.height), view.innerHeight - y) });
      require("fs").writeFileSync(sharpnessOutput + "/" + label + ".png", image.toPNG());
      const text = area.querySelectorAll(".kplex-thought-text")[3];
      if (text && area === scroll) {
        const r = text.getBoundingClientRect();
        const glyphs = await native.webContents.capturePage({ x: Math.ceil(r.left), y: Math.floor(r.top), width: Math.min(220, Math.floor(r.width)), height: Math.ceil(r.height) });
        require("fs").writeFileSync(sharpnessOutput + "/" + label + "-text.png", glyphs.toPNG());
      }
      samples.push({ label, scrollTop: area.scrollTop, camera: computed.transform, willChange: computed.willChange,
        rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
        nodes: [...area.querySelectorAll(".kplex-thought")].slice(0, 6).map(node => ({
          label: node.textContent, y: node.getBoundingClientRect().y, transform: view.getComputedStyle(node).transform })),
        runningAnimations: root.getAnimations({ subtree: true }).filter(a => a.playState === "running").length });
      c.progress = { phase: label, samples: samples.length };
    };
    /** Drive the real graph wheel owner, leaving camera state and painted geometry coherent. */
    const zoom = async scale => {
      const m = new view.DOMMatrix(view.getComputedStyle(camera).transform), rect = graph.getBoundingClientRect();
      graph.dispatchEvent(new view.WheelEvent("wheel", { bubbles: true, cancelable: true,
        clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2,
        deltaY: -Math.log(scale / m.a) / .0015 }));
      await wait(300);
    };
    for (const scale of [1, 1.25, .83]) {
      await zoom(scale);
      for (const offset of [100, 101, 102, 103, 104, 105]) {
        scroll.scrollTop = offset; await sample("zoom" + scale + "-scroll" + offset);
      }
    }
    if (sharpnessControls) {
      const prior = camera.style.willChange;
      restores.push(() => { camera.style.willChange = prior; });
      const content = scroll.firstElementChild, previous = content.style.top;
      restores.push(() => { content.style.top = previous; });
      for (const zoomValue of [1.25, .83]) {
        await zoom(zoomValue);
        camera.style.willChange = "auto";
        for (const offset of [100, 101, 102]) { scroll.scrollTop = offset; await sample("auto" + zoomValue + "-scroll" + offset); }
        camera.style.willChange = prior;
        const scale = new view.DOMMatrix(view.getComputedStyle(camera).transform).a * view.devicePixelRatio;
        for (const offset of [100, 101, 102]) {
          scroll.scrollTop = offset; await wait(100);
          content.style.top = (scroll.scrollTop - Math.round(scroll.scrollTop * scale) / scale) + "px";
          await sample("aligned" + zoomValue + "-scroll" + offset);
        }
        content.style.top = previous;
        content.style.willChange = "transform";
        for (const offset of [100, 101, 102]) { scroll.scrollTop = offset; await sample("promoted" + zoomValue + "-scroll" + offset); }
        content.style.willChange = "";
      }
      content.style.top = previous;
    }
    p.settings.childMaxHeight = 900; p.index.notifyPresentation();
    p.notifyNavigation(folder + "/Outline.md", leaf);
    await until(() => root.querySelector(".kplex-role-center")?.dataset.kplexPath === folder + "/Outline.md", "Outline center absent");
    const fold = root.querySelector(".kplex-role-center .kplex-section-fold-handle");
    check(fold, "Native outline fold control absent"); fold.click();
    await until(() => root.querySelectorAll(".is-kplex-section").length >= 8, "Expanded headings absent");
    await wait(800);
    for (const scale of [1.25, .83, 1]) {
      await zoom(scale); await sample("outline-zoom" + scale, graph);
      const beforePan = view.getComputedStyle(camera).transform;
      const rect = graph.getBoundingClientRect(), x = Math.round(rect.left + 20), y = Math.round(rect.top + 20);
      native.webContents.sendInputEvent({ type: "mouseDown", x, y, button: "middle", clickCount: 1 });
      native.webContents.sendInputEvent({ type: "mouseMove", x: x + 30, y: y - 80 });
      native.webContents.sendInputEvent({ type: "mouseUp", x: x + 30, y: y - 80, button: "middle", clickCount: 1 });
      await sample("outline-panned-zoom" + scale, graph);
      check(view.getComputedStyle(camera).transform !== beforePan, "Native middle-button pan did not move the camera");
    }
    await wait(1500); await sample("outline-idle", graph);
    check(samples.every(sample => sample.runningAnimations === 0), "Visual sample captured active motion");
    return { host, samples, outlineScrollAreas: root.querySelectorAll(".kplex-zone-scroll").length,
      cases: ["adjacent native scroll offsets", "integer and fractional graph zoom", "no retained node animation", "long expanded outline", "native middle-button pan", "idle outline"] };
  } catch (error) { failure = error; throw error; }
  finally {
    const errors = [];
    /** Cleanup all owned resources even when visual assertions or native capture fail. */
    const clean = async action => { try { await action(); } catch (error) { errors.push(String(error)); } };
    for (const restore of restores.reverse()) await clean(restore);
    for (const release of releases) await clean(release);
    if (leaf) await clean(() => leaf.detach());
    p.settings = settings; p.savedSettingsPolicy = policy;
    if (active) await clean(() => app.workspace.setActiveLeaf(active, { focus: true }));
    for (const file of owned.reverse()) if (app.vault.getFileByPath(file.path) === file) await clean(() => app.vault.delete(file));
    if (createdFolder && app.vault.getFolderByPath(folder) === createdFolder && !createdFolder.children.length) await clean(() => app.vault.delete(createdFolder, true));
    await clean(() => p.settingsWriteQueue); await wait(1000);
    await clean(() => app.vault.adapter.write(p.manifest.dir + "/data.json", c.originalData));
    if (restoreWindow) await clean(restoreWindow);
    if (errors.length) throw Error((failure ? "Scenario: " + String(failure) + "; " : "") + "Sharpness cleanup: " + errors.join("; "));
  }
}

if (process.env.KPLEX_TEST_VAULT_NAME !== "kplex-test-small") throw Error("Sharpness requires the explicit Small fixture");
const data = readFileSync(join(process.env.KPLEX_TEST_CONFIG_DIR, "plugins/k-plex/data.json"), "utf8");
const output = resolve(process.env.KPLEX_HOST_REPORT_DIR);
mkdirSync(output, { recursive: true });
writeFileSync(join(output, "driver-source.mjs"), readFileSync(new URL(import.meta.url)));
await runControlledProbe("label-sharpness-149", scenario,
  "c.originalData=" + JSON.stringify(data) + ";const sharpnessOutput=" + JSON.stringify(output)
    + ";const sharpnessControls=" + (process.env.KPLEX_SHARPNESS_CONTROLS === "true")
    + ";const sharpnessExpectAuto=" + (process.env.KPLEX_SHARPNESS_EXPECT_AUTO === "true")
    + ";const sharpnessPopout=" + (process.env.KPLEX_SHARPNESS_POPOUT === "true") + ";",
  ["src/ui/PlexGraph.tsx", "src/ui/ThoughtNode.tsx"]);
