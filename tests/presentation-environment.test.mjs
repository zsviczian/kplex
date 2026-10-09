/**
 * Tests K-Plex environment-driven routing, shortcuts and view profiles with portable contracts
 * and bounded host doubles. Temporary outputs are test-owned and native device delivery is not inferred.
 */
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function compilePureModule(relativePath) {
  const temp = mkdtempSync(join(tmpdir(), "kplex-presentation-test-"));
  const sourcePath = join(root, relativePath);
  const outputPath = join(temp, relativePath.replace(/\.ts$/, ".js"));
  mkdirSync(dirname(outputPath), { recursive: true });
  const result = ts.transpileModule(readFileSync(sourcePath, "utf8"), {
    compilerOptions: {
      target: ts.ScriptTarget.ES2021,
      module: ts.ModuleKind.CommonJS,
      esModuleInterop: true,
      strict: true,
    },
    fileName: sourcePath,
    reportDiagnostics: true,
  });
  const errors = (result.diagnostics ?? []).filter((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error);
  if (errors.length) {
    rmSync(temp, { recursive: true, force: true });
    throw new Error(errors.map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")).join("\n"));
  }
  writeFileSync(outputPath, result.outputText);
  return { temp, exports: require(outputPath) };
}

/** Execute the actual nested production arrow while making only its enclosing host capabilities explicit. */
function productionArrow(relativePath, name, dependencies) {
  const source = readFileSync(join(root, relativePath), "utf8");
  const file = ts.createSourceFile(relativePath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let declaration;
  /** Locate the named production declaration without reconstructing its behavior in the test. */
  const visit = node => {
    if (ts.isVariableDeclaration(node) && node.name.getText(file) === name) declaration = node;
    ts.forEachChild(node, visit);
  };
  visit(file);
  assert(declaration?.initializer, `Missing production arrow ${name}`);
  const transpiled = ts.transpileModule(`const production = ${declaration.initializer.getText(file)};`, {
    compilerOptions: {target: ts.ScriptTarget.ES2021, module: ts.ModuleKind.CommonJS},
  }).outputText;
  return new Function(...Object.keys(dependencies), `${transpiled}\nreturn production;`)(...Object.values(dependencies));
}

const compiled = compilePureModule("src/core/plex/viewPresentation.ts");
const presentation = compiled.exports;
process.on("exit", () => rmSync(compiled.temp, { recursive: true, force: true }));
const classified = compilePureModule("src/adapters/obsidian/presentationEnvironmentFacts.ts");
const obsidianFacts = classified.exports;
process.on("exit", () => rmSync(classified.temp, { recursive: true, force: true }));
const fileDragCompiled = compilePureModule("src/adapters/obsidian/fileExplorerDrag.ts");
const fileExplorerDrag = fileDragCompiled.exports;
process.on("exit", () => rmSync(fileDragCompiled.temp, { recursive: true, force: true }));
const excalidrawVersionCompiled = compilePureModule("src/adapters/obsidian/excalidrawIntegrationVersion.ts");
const excalidrawVersion = excalidrawVersionCompiled.exports;
process.on("exit", () => rmSync(excalidrawVersionCompiled.temp, { recursive: true, force: true }));
const externalUrlCompiled = compilePureModule("src/adapters/obsidian/externalUrl.ts");
const externalUrl = externalUrlCompiled.exports;
process.on("exit", () => rmSync(externalUrlCompiled.temp, { recursive: true, force: true }));
const doubleTapCompiled = compilePureModule("src/ui/components/DoubleTapGesture.ts");
const { DoubleTapGesture } = doubleTapCompiled.exports;
process.on("exit", () => rmSync(doubleTapCompiled.temp, { recursive: true, force: true }));

function compileObsidianAdapter() {
  const temp = mkdtempSync(join(tmpdir(), "kplex-obsidian-environment-test-"));
  for (const relativePath of ["src/adapters/obsidian/presentationEnvironmentFacts.ts", "src/adapters/obsidian/presentationEnvironment.ts"]) {
    const sourcePath = join(root, relativePath);
    const outputPath = join(temp, relativePath.replace(/\.ts$/, ".js"));
    mkdirSync(dirname(outputPath), { recursive: true });
    const result = ts.transpileModule(readFileSync(sourcePath, "utf8"), {
      compilerOptions: { target: ts.ScriptTarget.ES2021, module: ts.ModuleKind.CommonJS, esModuleInterop: true },
      fileName: sourcePath,
    });
    writeFileSync(outputPath, result.outputText);
  }
  const obsidianStubPath = join(temp, "node_modules/obsidian/index.js");
  mkdirSync(dirname(obsidianStubPath), { recursive: true });
  writeFileSync(obsidianStubPath, "exports.Platform = {};\n");
  return {
    temp,
    platform: require(obsidianStubPath).Platform,
    adapter: require(join(temp, "src/adapters/obsidian/presentationEnvironment.js")),
  };
}

const hostFixture = compileObsidianAdapter();
process.on("exit", () => rmSync(hostFixture.temp, { recursive: true, force: true }));

function environment({
  device = "desktop",
  keyConvention = "unknown",
  keyboard = false,
  pointer = false,
  touch = false,
  graphTab = true,
  sidepanel = true,
  popout = false,
} = {}) {
  return {
    device,
    keyConvention,
    inputModes: { keyboard, pointer, touch },
    hostActions: { graphTab, sidepanel, popout },
  };
}

test("touch tap pairs require the same nearby target and reset after opening or cancellation", () => {
  const gesture = new DoubleTapGesture();
  assert.equal(gesture.complete("URL-A", 100, 20, 20), false);
  assert.equal(gesture.complete("URL-A", 300, 22, 20), true);
  assert.equal(gesture.complete("URL-A", 400, 22, 20), false, "third tap must not reopen");
  gesture.reset();
  assert.equal(gesture.complete("URL-A", 500, 22, 20), false, "cancelled gestures must not complete a pair");
  assert.equal(gesture.complete("URL-B", 600, 22, 20), false, "different nodes cannot form a pair");
  assert.equal(gesture.complete("URL-B", 1100, 22, 20), false, "slow taps stay separate");
  assert.equal(gesture.complete("URL-B", 1200, 80, 20), false, "distant taps stay separate");
  assert.equal(gesture.complete("URL-B", 1000, 80, 20), false, "clock reversal cannot form a pair");
});

test("external URL adapter activates an Obsidian external-link anchor and cleans it up", () => {
  const bodyChildren = [];
  let clickedWhileAttached = false;
  const link = {
    classList: { values: [], add(value) { this.values.push(value); } },
    href: "", target: "", rel: "",
    click() { clickedWhileAttached = bodyChildren.includes(this); },
    remove() {
      const index = bodyChildren.indexOf(this);
      if (index >= 0) bodyChildren.splice(index, 1);
    },
  };
  const ownerDocument = {
    body: { createEl(tagName) {
      assert.equal(tagName, "a");
      bodyChildren.push(link);
      return link;
    } },
  };

  externalUrl.openExternalUrl("https://example.com/path?q=1", ownerDocument);

  assert.deepEqual(link.classList.values, ["external-link"]);
  assert.equal(link.href, "https://example.com/path?q=1");
  assert.equal(link.target, "_blank");
  assert.equal(link.rel, "noopener");
  assert.equal(clickedWhileAttached, true, "the click must bubble from a document-attached external link");
  assert.deepEqual(bodyChildren, [], "the temporary routing anchor must always be removed");

  link.click = () => { throw new Error("host activation failed"); };
  assert.throws(() => externalUrl.openExternalUrl("https://example.com", ownerDocument), /host activation failed/);
  assert.deepEqual(bodyChildren, [], "a failed activation must also remove the routing anchor");
});

test("Web Viewer capability rejects disabled or unavailable native views", () => {
  assert.equal(externalUrl.isWebViewerAvailable({}), false);
  assert.equal(externalUrl.isWebViewerAvailable({ viewRegistry: {} }), false);
  assert.equal(externalUrl.isWebViewerAvailable({ viewRegistry: { getViewCreatorByType: () => undefined } }), false);
  assert.equal(externalUrl.isWebViewerAvailable({ viewRegistry: { getViewCreatorByType(type) {
    assert.equal(type, "webviewer");
    return () => {};
  } } }), true);
});

test("File Explorer drag adapter accepts one current Markdown file and rejects unrelated drags", () => {
  const note = { path: "Projects/Alpha.md", extension: "md" };
  const second = { path: "Projects/Beta.md", extension: "md" };
  const image = { path: "Assets/diagram.png", extension: "png" };
  const files = new Map([[note.path, note], [second.path, second], [image.path, image]]);
  const app = {
    dragManager: { draggable: { type: "file", file: note } },
    vault: { getFileByPath: (path) => files.get(path) ?? null },
  };

  assert.equal(fileExplorerDrag.singleFileExplorerDragCandidate(app.dragManager.draggable), note);
  assert.equal(fileExplorerDrag.getDraggedMarkdownFile(app), note);

  app.dragManager.draggable = { type: "files", files: [note] };
  assert.equal(fileExplorerDrag.getDraggedMarkdownFile(app), note, "single selection File Explorer drags should work");

  app.dragManager.draggable = { type: "files", files: [note, second] };
  assert.equal(fileExplorerDrag.getDraggedMarkdownFile(app), null, "multi-file drags must not choose an arbitrary center");

  app.dragManager.draggable = { type: "file", file: image };
  assert.equal(fileExplorerDrag.getDraggedMarkdownFile(app), null, "attachments are not note-navigation drops");
  assert.equal(fileExplorerDrag.getDraggedFile(app), image, "Plex navigation supports image attachments");
  const canvas = { path: "Projects/Board.canvas", extension: "canvas" };
  files.set(canvas.path, canvas);
  app.dragManager.draggable = { type: "file", file: canvas };
  assert.equal(fileExplorerDrag.getDraggedFile(app), canvas, "Canvas files are navigation targets");

  app.dragManager.draggable = { type: "link", file: note };
  assert.equal(fileExplorerDrag.getDraggedMarkdownFile(app), null, "editor/internal link drags are outside the File Explorer scope");

  app.dragManager.draggable = { type: "file", file: { path: note.path } };
  assert.equal(fileExplorerDrag.getDraggedMarkdownFile(app), note, "the adapter should resolve the current Vault file by path");

  files.delete(note.path);
  assert.equal(fileExplorerDrag.getDraggedMarkdownFile(app), null, "stale drag payloads must not return deleted files");
});

test("Excalidraw integration requires the declared semantic version and contains bridge failures", () => {
  const calls = [];
  assert.equal(excalidrawVersion.MINIMUM_EXCALIDRAW_INTEGRATION_VERSION, "2.28.0");
  assert.equal(excalidrawVersion.hasMinimumExcalidrawIntegrationVersion({
    verifyMinimumPluginVersion: (requiredVersion) => {
      calls.push(requiredVersion);
      return true;
    },
  }), true);
  assert.deepEqual(calls, ["2.28.0"]);
  assert.equal(excalidrawVersion.hasMinimumExcalidrawIntegrationVersion({}), false);
  assert.equal(excalidrawVersion.hasMinimumExcalidrawIntegrationVersion(null), false);
  assert.equal(excalidrawVersion.hasMinimumExcalidrawIntegrationVersion({
    verifyMinimumPluginVersion: () => { throw new Error("incompatible bridge"); },
  }), false);
});

test("device classifier preserves desktop, explicit phone/tablet flags and shortest-side fallback", () => {
  assert.equal(obsidianFacts.classifyDeviceClass({ isMobile: false, isPhone: true, isTablet: true, screenWidth: 390, screenHeight: 844 }), "desktop");
  assert.equal(obsidianFacts.classifyDeviceClass({ isMobile: true, isPhone: true, screenWidth: 1024, screenHeight: 1366 }), "phone");
  assert.equal(obsidianFacts.classifyDeviceClass({ isMobile: true, isTablet: true, screenWidth: 390, screenHeight: 844 }), "tablet");
  assert.equal(obsidianFacts.classifyDeviceClass({ isMobile: true, isPhone: true, isTablet: true, screenWidth: 1024, screenHeight: 1366 }), "phone");
  assert.equal(obsidianFacts.classifyDeviceClass({ isMobile: true, screenWidth: 599, screenHeight: 1000 }), "phone");
  assert.equal(obsidianFacts.classifyDeviceClass({ isMobile: true, screenWidth: 600, screenHeight: 1000 }), "tablet");
  assert.equal(obsidianFacts.classifyDeviceClass({ isMobile: true, screenWidth: 1200, screenHeight: 500 }), "phone");
  assert.equal(obsidianFacts.classifyDeviceClass({ isMobile: true, screenWidth: 0, screenHeight: 0 }), "tablet");
});

test("key convention keeps macOS, Windows, iOS/iPadOS, Android and unknown distinct", () => {
  assert.equal(obsidianFacts.classifyKeyConvention({ isMacOS: true }), "macos");
  assert.equal(obsidianFacts.classifyKeyConvention({ isWindows: true }), "windows");
  assert.equal(obsidianFacts.classifyKeyConvention({ isIosApp: true, isMacOS: true }), "ios");
  assert.equal(obsidianFacts.classifyKeyConvention({ isAndroidApp: true }), "android");
  assert.equal(obsidianFacts.classifyKeyConvention({}), "unknown");
});

test("Obsidian adapter preserves form-factor routing and leaves mobile keyboard presence unknown", () => {
  const mobileWindow = {
    screen: { width: 390, height: 844 }, innerWidth: 390, innerHeight: 844,
    navigator: { maxTouchPoints: 5 }, matchMedia: () => ({ matches: false }),
  };
  Object.assign(hostFixture.platform, {
    isMobile: true, isPhone: true, isTablet: false,
    isIosApp: true, isAndroidApp: false, isMacOS: false, isWin: false,
  });
  const phone = hostFixture.adapter.readObsidianPresentationEnvironment(mobileWindow);
  assert.equal(phone.device, "phone");
  assert.equal(phone.keyConvention, "ios");
  assert.equal(phone.inputModes.keyboard, "unknown");
  assert.equal(phone.inputModes.touch, true);
  assert.deepEqual(phone.hostActions, { graphTab: false, sidepanel: true, popout: false });

  Object.assign(hostFixture.platform, { isPhone: false, isTablet: true });
  const tablet = hostFixture.adapter.readObsidianPresentationEnvironment(mobileWindow);
  assert.equal(tablet.device, "tablet");
  assert.equal(tablet.inputModes.keyboard, "unknown");
  assert.equal(tablet.hostActions.graphTab, true);

  Object.assign(hostFixture.platform, { isMobile: false, isIosApp: false, isMacOS: true });
  const desktop = hostFixture.adapter.readObsidianPresentationEnvironment(mobileWindow);
  assert.equal(desktop.device, "desktop");
  assert.equal(desktop.keyConvention, "macos");
  assert.equal(desktop.inputModes.keyboard, true);
  assert.equal(desktop.hostActions.popout, true);
});

test("input modes coexist independently of device class", () => {
  const touchOnly = environment({ device: "phone", touch: true, graphTab: false });
  assert.equal(presentation.inputModeAvailability(touchOnly, "touch"), true);
  assert.equal(presentation.inputModeAvailability(touchOnly, "keyboard"), false);
  assert.equal(presentation.inputModeAvailability(touchOnly, "pointer"), false);

  const keyboardTouch = environment({ device: "tablet", keyboard: true, touch: true });
  assert.equal(presentation.inputModeAvailability(keyboardTouch, "keyboard"), true);
  assert.equal(presentation.inputModeAvailability(keyboardTouch, "touch"), true);

  const pointerKeyboard = environment({ device: "desktop", keyboard: true, pointer: true, popout: true });
  assert.equal(presentation.inputModeAvailability(pointerKeyboard, "pointer"), true);
  assert.equal(presentation.inputModeAvailability(pointerKeyboard, "keyboard"), true);
  assert.equal(presentation.inputModeAvailability(pointerKeyboard, "touch"), false);

  const uncertainMobileKeyboard = environment({ device: "phone", keyboard: "unknown", touch: true });
  assert.equal(presentation.inputModeAvailability(uncertainMobileKeyboard, "keyboard"), "unknown");
});

test("host action availability drives command visibility without conflating device and capability", () => {
  const desktop = environment({ device: "desktop", keyboard: true, pointer: true, popout: true });
  assert.equal(presentation.isGraphTabCommandAvailable(desktop), true);
  assert.equal(presentation.isPopoutCommandAvailable(desktop), true);

  const noPopout = environment({ device: "desktop", keyboard: true, pointer: true, popout: false });
  assert.equal(presentation.isPopoutCommandAvailable(noPopout), false);
  assert.equal(presentation.primaryOpenSurface(noPopout, true), "leaf");

  const noGraphTab = environment({ device: "tablet", touch: true, graphTab: false, sidepanel: true });
  assert.equal(presentation.isGraphTabCommandAvailable(noGraphTab), false);
  assert.equal(presentation.primaryOpenSurface(noGraphTab, false), "sidepanel");
});

test("Obsidian routing remains phone sidepanel, tablet normal tab, desktop normal tab/popout", () => {
  const phone = environment({ device: "phone", touch: true, graphTab: false, sidepanel: true, popout: false });
  assert.equal(presentation.primaryOpenSurface(phone, false), "sidepanel");
  assert.equal(presentation.primaryOpenSurface(phone, true), "sidepanel");
  assert.equal(presentation.isGraphTabCommandAvailable(phone), false);
  assert.equal(presentation.isPopoutCommandAvailable(phone), false);

  const tablet = environment({ device: "tablet", touch: true, graphTab: true, sidepanel: true, popout: false });
  assert.equal(presentation.primaryOpenSurface(tablet, false), "leaf");
  assert.equal(presentation.primaryOpenSurface(tablet, true), "leaf");
  assert.equal(presentation.isGraphTabCommandAvailable(tablet), true);
  assert.equal(presentation.isPopoutCommandAvailable(tablet), false);

  const desktop = environment({ device: "desktop", keyboard: true, pointer: true, graphTab: true, sidepanel: true, popout: true });
  assert.equal(presentation.primaryOpenSurface(desktop, false), "leaf");
  assert.equal(presentation.primaryOpenSurface(desktop, true), "popout");
  assert.equal(presentation.isGraphTabCommandAvailable(desktop), true);
  assert.equal(presentation.isPopoutCommandAvailable(desktop), true);
});

test("phone maps explicitly to persisted mobile layout profiles and keeps every surface key", () => {
  const phone = environment({ device: "phone", touch: true, graphTab: false });
  const tablet = environment({ device: "tablet", touch: true });
  const desktop = environment({ device: "desktop", keyboard: true, pointer: true, popout: true });

  assert.equal(presentation.layoutProfileKey("leaf", phone), "mobile:leaf");
  assert.equal(presentation.layoutProfileKey("sidepanel", phone), "mobile:sidepanel");
  assert.equal(presentation.layoutProfileKey("popout", phone), "mobile:popout");
  assert.equal(presentation.layoutProfileKey("leaf", tablet), "tablet:leaf");
  assert.equal(presentation.layoutProfileKey("sidepanel", desktop), "desktop:sidepanel");
  assert.equal(presentation.layoutProfileKey("popout", desktop), "desktop:popout");

  const settings = {
    compactingFactor: 9,
    parentColumns: 9,
    childColumns: 9,
    layoutProfiles: {
      "mobile:sidepanel": { compactingFactor: 2.85, parentColumns: 1, childColumns: 2 },
      "tablet:leaf": { compactingFactor: 2.25, parentColumns: 2, childColumns: 4 },
      "desktop:popout": { compactingFactor: 2, parentColumns: 2, childColumns: 5 },
    },
  };
  assert.deepEqual(presentation.selectLayoutProfile(settings, "sidepanel", phone), { ...settings.layoutProfiles["mobile:sidepanel"], horizontalCompactingFactor: 2.85 });
  assert.deepEqual(presentation.selectLayoutProfile(settings, "leaf", tablet), { ...settings.layoutProfiles["tablet:leaf"], horizontalCompactingFactor: 2.25 });
  assert.deepEqual(presentation.selectLayoutProfile(settings, "popout", desktop), { ...settings.layoutProfiles["desktop:popout"], horizontalCompactingFactor: 2 });
  assert.deepEqual(presentation.selectLayoutProfile(settings, "leaf", desktop), { compactingFactor: 9, horizontalCompactingFactor: 9, parentColumns: 9, childColumns: 9 });
});

test("persisted layout keys and node-open leaf modes remain stable with canonical K-Plex command IDs", () => {
  const settingsSource = readFileSync(join(root, "src/settings.ts"), "utf8");
  for (const key of ["mobile:leaf", "mobile:sidepanel", "mobile:popout", "tablet:leaf", "desktop:leaf"]) {
    assert(settingsSource.includes(`"${key}"`), `missing persisted layout profile ${key}`);
  }
  assert(!settingsSource.includes('"phone:leaf"'), "phone must not become a persisted profile key");
  assert(settingsSource.includes("Object.entries(DEFAULT_LAYOUT_PROFILES)"), "profile migration must continue to enumerate the existing persisted defaults");
  assert(settingsSource.includes("old.layoutProfiles?.[key]"), "profile migration must continue reading the same stored keys");

  const mainSource = readFileSync(join(root, "src/main.ts"), "utf8");
  const catalogModule = compilePureModule("src/core/plex/actions.ts");
  try {
    for (const [action, stableId] of [["surface.open-tab", "kplex-start"], ["surface.open-popout", "kplex-open-popout"], ["surface.open-sidepanel", "kplex-open-sidepanel"]]) {
      const metadata = catalogModule.exports.ACTION_BY_ID.get(action);
      assert.equal(metadata.command.id, stableId);
      assert.equal(metadata.command.kind, "ordinary");
      assert.equal(metadata.command.defaultPublished, true);
    }
  } finally { rmSync(catalogModule.temp, {recursive: true, force: true}); }
  assert(mainSource.includes("this.initializeActions()"), "Lifecycle must compose catalog registrations");
  assert(mainSource.includes("primaryOpenSurface(environment, this.settings.startInPopout)"));
  assert.match(mainSource, /operation\("surface\.open-tab",[\s\S]*?isGraphTabCommandAvailable\(readObsidianPresentationEnvironment\(window\.activeWindow \?\? window\)\)/,
    "Registered graph-tab checking must use the current invocation window's shared device policy");
  assert.match(mainSource, /operation\("surface\.open-popout",[\s\S]*?isPopoutCommandAvailable\(readObsidianPresentationEnvironment\(window\.activeWindow \?\? window\)\)/,
    "Registered popout checking must use the current invocation window's shared device policy");
  assert(mainSource.includes("async openFileInNewTab(file: TFile)"));
  assert(mainSource.includes('getLeaf("tab")'), "node Open menu must create an explicit new tab");
  assert(mainSource.includes("async openFileInAdjacentPane(file: TFile, hostLeaf: WorkspaceLeaf)"));
  assert(mainSource.includes("createAdjacentFileLeaf(this.app.workspace, hostLeaf, sidecar, position)"));
  assert(mainSource.includes("async openFileInPopout(file: TFile)"));
  assert(mainSource.includes('getLeaf("window")'), "node Open menu must create desktop pop-outs through Obsidian's window leaf mode");

  const plexSource = readFileSync(join(root, "src/ui/PlexGraph.tsx"), "utf8");
  assert(plexSource.includes('translate("graph.openMenu")'), "node context menu must expose the localized Open submenu");
  assert(plexSource.includes('addNativeSubmenu(menu, translate("graph.openMenu")'));
  const nodeModule = compilePureModule("src/adapters/obsidian/actionNode.ts");
  try {
    const items = new Map(), requests = [], originalFile = {path: "Original.md", extension: "md"};
    const page = {path: originalFile.path, file: originalFile, isFolder: false, isTag: false, url: null};
    const captured = nodeModule.exports.actionNodeRef(page);
    class MenuDouble {
      addItem(build) {
        const item = {setTitle(value) {this.label = value; return this;}, setIcon() {return this;}, onClick(callback) {items.set(this.label, callback); return this;}};
        build(item); return this;
      }
      addSeparator() {return this;}
    }
    const showMenu = productionArrow("src/ui/PlexGraph.tsx", "showNodeContextMenuAt", {
      touchDoubleTap: {current: {reset() {}}}, persistentPageFor: () => page,
      neighborhood: null, activePath: "Other.md", canExpandCentralSections: () => false,
      Menu: MenuDouble, actionNodeRef: nodeModule.exports.actionNodeRef, actionSurfaceId: "owning-surface", sceneNodeKeys: new Map(),
      plugin: {getFileOpenMenuState: () => ({focusOpenTab: true, adjacentPane: true, popoutWindow: false}), isPinned: () => false,
        actionManager: {dispatch: request => {requests.push(request); return Promise.resolve({status: "completed"});}}, showKplexMenuAtPosition() {}},
      addNativeSubmenu: (menu, _title, _icon, populate) => populate(menu), translate: key => key,
      viewport: {current: {ownerDocument: {}}}, hostLeaf: {},
    });
    showMenu({page, role: "child"}, 10, 20, "captured-occurrence");
    assert(items.has("graph.focusOpenTab")); assert(items.has("graph.openNewTab")); assert(items.has("graph.openAdjacentPane"));
    assert(!items.has("graph.openPopoutWindow"), "Unavailable popout destination remains absent");
    page.path = "Changed.md"; page.file = {path: "Changed.md", extension: "md"};
    items.get("graph.openAdjacentPane")();
    assert.deepEqual(requests, [{id: "node.open.split", source: "context-menu", surfaceId: "owning-surface", target: {kind: "explicit", node: captured, occurrenceId: "captured-occurrence"}}],
      "Choosing the native menu must retain launch-time file identity and occurrence through shared dispatch");
  } finally { rmSync(nodeModule.temp, {recursive: true, force: true}); }
  assert(plexSource.includes('if (destination === "split") return plugin.openFileInAdjacentPane(page.file, hostLeaf)'), "Shared split implementation must retain the exact owning native pane operation");
  assert(plexSource.includes("openState.focusOpenTab"), "focus-open action must remain conditional on an already-open file leaf");
  assert(plexSource.includes("openState.adjacentPane"), "adjacent-pane action must follow presentation availability");
  assert(plexSource.includes("openState.popoutWindow"), "pop-out action must follow presentation availability");
  assert(mainSource.includes("type !== KPLEX_VIEW_TYPE && type !== KPLEX_SIDEPANEL_VIEW_TYPE"), "Focus open tab excludes graph surfaces but includes actual file tabs such as Sidecars");
});

test("portable presentation code has no Obsidian or window dependency", () => {
  const contractSource = readFileSync(join(root, "src/core/contracts/presentationEnvironment.ts"), "utf8");
  const policySource = readFileSync(join(root, "src/core/plex/viewPresentation.ts"), "utf8");
  const combined = `${contractSource}\n${policySource}`;
  assert(!combined.includes('from "obsidian"'));
  assert(!/\bPlatform\b/.test(combined));
  assert(!/\bwindow\b/.test(combined));
});


test("native submenu uses host navigation and falls back to flat actions only when unavailable", () => {
  const compiled = compilePureModule("src/adapters/obsidian/nativeSubmenu.ts");
  try {
    const child = {};
    let receiver;
    const item = { setTitle() { return this; }, setIcon() { return this; }, setSubmenu() { receiver = this; return child; } };
    const menu = { addItem(callback) { callback(item); } };
    let target;
    compiled.exports.addNativeSubmenu(menu, "Open", "external-link", (submenu) => { target = submenu; });
    assert.equal(target, child);
    assert.equal(receiver, item);
    delete item.setSubmenu;
    let label = false;
    item.setIsLabel = () => { label = true; return item; };
    compiled.exports.addNativeSubmenu(menu, "Open", "external-link", (submenu) => { target = submenu; });
    assert.equal(target, menu);
    assert.equal(label, true);
  } finally { rmSync(compiled.temp, { recursive: true, force: true }); }
});

test("adjacent file panes split beyond the Plex/Sidecar pair on every side", () => {
  const compiled = compilePureModule("src/adapters/obsidian/adjacentFileLeaf.ts");
  try {
    const host = {}, sidecar = {}, result = {};
    let actual;
    const workspace = { createLeafBySplit(...args) { actual = args; return result; } };
    for (const [position, anchor, direction] of [
      ["right", sidecar, "vertical"], ["left", host, "vertical"],
      ["below", sidecar, "horizontal"], ["above", host, "horizontal"],
      [null, host, "vertical"],
    ]) {
      assert.equal(compiled.exports.createAdjacentFileLeaf(workspace, host, position ? sidecar : null, position), result);
      assert.deepEqual(actual, [anchor, direction, false]);
    }
  } finally { rmSync(compiled.temp, { recursive: true, force: true }); }
});

const urlEmbedCompiled = compilePureModule("src/ui/features/urlEmbed.ts");
const { urlEmbed } = urlEmbedCompiled.exports;
process.on("exit", () => rmSync(urlEmbedCompiled.temp, { recursive: true, force: true }));

test("URL expansion normalizes videos, preserves private Vimeo tokens and rejects executable protocols", () => {
  const id = "dQw4w9WgXcQ";
  for (const raw of [`https://youtu.be/${id}`, `https://www.youtube.com/watch?v=${id}`, `https://www.youtube.com/embed/${id}`]) {
    assert.deepEqual(urlEmbed(raw), { url: `https://www.youtube.com/embed/${id}?playsinline=1`, aspectRatio: 16 / 9 });
  }
  assert.deepEqual(urlEmbed(`https://www.youtube.com/shorts/${id}?t=12s`), { url: `https://www.youtube.com/embed/${id}?playsinline=1&start=12`, aspectRatio: 9 / 16 });
  assert.deepEqual(urlEmbed("https://vimeo.com/123456789/abcdef0123"), { url: "https://player.vimeo.com/video/123456789?h=abcdef0123", aspectRatio: 16 / 9 });
  assert.deepEqual(urlEmbed("https://help.obsidian.md/"), { url: "https://help.obsidian.md/", aspectRatio: null });
  assert.deepEqual(urlEmbed(`https://youtube.com.evil.example/watch?v=${id}`), { url: `https://youtube.com.evil.example/watch?v=${id}`, aspectRatio: null });
  for (const raw of ["javascript:alert(1)", "file:///private/secrets", "data:text/html,test", "invalid"]) assert.equal(urlEmbed(raw), null);
});

/** Compile the actual cache-only facet provider and its host-free dependencies into test-owned output. */
function compileGraphPresentation() {
  const temp = mkdtempSync(join(tmpdir(), "kplex-graph-presentation-"));
  for (const relative of ["src/index/GraphPresentation.ts", "src/adapters/obsidian/yieldToHostTask.ts",
    "src/core/contracts/fieldName.ts", "src/core/graph/presentation.ts", "src/core/graph/settings.ts", "src/core/graph/settingsPolicy.ts"]) {
    const output = join(temp, relative.replace(/\.ts$/, ".js"));
    mkdirSync(dirname(output), { recursive: true });
    writeFileSync(output, ts.transpileModule(readFileSync(join(root, relative), "utf8"), {
      compilerOptions: { target: ts.ScriptTarget.ES2021, module: ts.ModuleKind.CommonJS },
    }).outputText);
  }
  const obsidianPath = join(temp, "node_modules/obsidian/index.js");
  mkdirSync(dirname(obsidianPath), { recursive: true });
  writeFileSync(obsidianPath, "exports.getAllTags = cache => cache.hostTags ?? [];\n");
  return { temp, provider: require(join(temp, "src/index/GraphPresentation.js")) };
}
const graphPresentation = compileGraphPresentation();
process.on("exit", () => rmSync(graphPresentation.temp, { recursive: true, force: true }));

/** Selected host/cache doubles make all forbidden acquisition and whole-vault enumeration fail loudly. */
function facetFixture() {
  const file = { path: "Visible.md", extension: "md", stat: { mtime: 1, size: 40 } };
  const page = { path: file.path, file, tags: ["#card", "#drawing"], isTag: false,
    noteType: "Card", primaryStyleTag: "#card", styleTags: ["#drawing"], maxLabelLength: 20 };
  const settings = { noteTypeField: "Type", primaryTagField: "Style", tagStyleList: ["#card", "#drawing"],
    showFullTagName: true, baseNodeStyle: { maxLabelLength: 30 } };
  const metadata = { frontmatter: {}, hostTags: ["#card", "#drawing"] }, body = { inlineFields: { type: ["Drawing"], style: ["#drawing"] } };
  const state = { file, metadata }, hot = new Map(), statuses = new WeakMap();
  let reads = 0;
  /** Acquisition is outside the presentation provider's contract. */
  const forbidden = () => assert.fail("Presentation attempted Vault reads or enumeration");
  const app = { vault: { getFileByPath: path => path === file.path ? state.file : null,
    read: forbidden, cachedRead: forbidden, getFiles: forbidden, getMarkdownFiles: forbidden },
  metadataCache: { getFileCache: () => state.metadata } };
  const storage = { getBodies: async requests => { reads++; assert.deepEqual(requests, [{ path: file.path, mtime: 1 }]); return new Map([[file.path, body]]); } };
  return { file, page, settings, metadata, body, state, hot, statuses, app, storage, reads: () => reads };
}

/** Use the production owning-window task continuation while restoring all test-owned host globals. */
async function withFacetWindow(work) {
  const previous = globalThis.window;
  globalThis.window = { setTimeout, MessageChannel };
  try { await work(); } finally { if (previous === undefined) delete globalThis.window; else globalThis.window = previous; }
}

test("unknown note type and style facets omit fields and preserve shared page identity and known-good values", async () => {
  await withFacetWindow(async () => {
    const f = facetFixture(), P = graphPresentation.provider;
    f.state.metadata = null;
    f.storage.getBodies = async () => new Map();
    const result = await P.prepareGraphPresentation([f.page], f.settings, P.ALL_PRESENTATION_FACETS,
      f.app, f.hot, f.storage, () => true);
    assert(result && result.isCurrent()); assert.equal(result.pending, 1);
    assert.deepEqual(result.facets.get(f.page), { maxLabelLength: 30, status: { noteType: "pending", styleTags: "pending" } });
    const shared = f.page;
    P.applyPreparedPresentation(result, f.statuses);
    assert.equal(shared, f.page); assert.equal(shared.noteType, "Card"); assert.equal(shared.primaryStyleTag, "#card");
    assert.deepEqual(shared.styleTags, ["#drawing"]); assert.deepEqual(f.statuses.get(shared), { noteType: "pending", styleTags: "pending" });
    f.page.tags = [];
    const sparse = P.presentationFacetsForPage(f.page, f.settings, f.app, undefined);
    assert.equal(sparse.status.styleTags, "pending"); assert.equal("primaryStyleTag" in sparse, false);
  });
});

test("current cached presentation replaces styles and ready empty clears them without acquisition", async () => {
  await withFacetWindow(async () => {
    const f = facetFixture(), P = graphPresentation.provider;
    const prepare = () => P.prepareGraphPresentation([f.page], f.settings, P.ALL_PRESENTATION_FACETS, f.app, f.hot, f.storage, () => true);
    const ready = await prepare(); assert(ready && ready.isCurrent()); assert.equal(ready.pending, 0);
    P.applyPreparedPresentation(ready, f.statuses);
    assert.equal(f.page.noteType, "Drawing"); assert.equal(f.page.primaryStyleTag, "#drawing"); assert.deepEqual(f.page.styleTags, ["#card"]);
    f.body.inlineFields = {}; f.page.tags = []; f.metadata.hostTags = [];
    const empty = await prepare(); assert(empty && empty.isCurrent()); P.applyPreparedPresentation(empty, f.statuses);
    assert.equal(f.page.noteType, null); assert.equal(f.page.primaryStyleTag, null); assert.deepEqual(f.page.styleTags, []);
    assert.deepEqual(f.statuses.get(f.page), { noteType: "ready", styleTags: "ready" }); assert.equal(f.reads(), 2);
  });
});

for (const mutation of ["metadata-replaced", "frontmatter-in-place", "file-modified", "file-replaced", "file-renamed", "settings-in-place", "tags-in-place", "source-revision", "unload"]) {
  test(`presentation preparation rejects ${mutation} across a durable body-cache await`, async () => {
    await withFacetWindow(async () => {
      const f = facetFixture(), P = graphPresentation.provider;
      let current = true, entered, release;
      const blocked = new Promise(resolve => { release = resolve; }), started = new Promise(resolve => { entered = resolve; });
      f.storage.getBodies = async () => { entered(); await blocked; return new Map([["Visible.md", f.body]]); };
      const preparing = P.prepareGraphPresentation([f.page], f.settings, P.ALL_PRESENTATION_FACETS, f.app, f.hot, f.storage, () => current);
      await started;
      if (mutation === "metadata-replaced") f.state.metadata = { frontmatter: {} };
      else if (mutation === "frontmatter-in-place") f.metadata.frontmatter.Type = "Changed";
      else if (mutation === "file-modified") f.file.stat.size++;
      else if (mutation === "file-replaced") f.state.file = { ...f.file };
      else if (mutation === "file-renamed") f.file.path = "Renamed.md";
      else if (mutation === "settings-in-place") f.settings.tagStyleList.push("#new");
      else if (mutation === "tags-in-place") f.page.tags.push("#new");
      else current = false;
      release(); assert.equal(await preparing, null);
      assert.equal(f.page.noteType, "Card"); assert.equal(f.page.primaryStyleTag, "#card"); assert.deepEqual(f.page.styleTags, ["#drawing"]);
    });
  });
}

test("final presentation fence rejects changed same-object metadata and hot body before synchronous apply", async () => {
  await withFacetWindow(async () => {
    for (const input of ["frontmatter", "hot-body", "hot-entry", "policy", "file", "tags"]) {
      const f = facetFixture(), P = graphPresentation.provider;
      f.hot.set(f.file.path, { mtime: 1, body: f.body });
      const ready = await P.prepareGraphPresentation([f.page], f.settings, P.ALL_PRESENTATION_FACETS, f.app, f.hot, f.storage, () => true);
      assert(ready && ready.isCurrent()); assert.equal(f.reads(), 0);
      if (input === "frontmatter") f.metadata.frontmatter.Style = "#card";
      if (input === "hot-body") f.body.inlineFields.type[0] = "Changed";
      if (input === "hot-entry") f.hot.set(f.file.path, { mtime: 1, body: f.body });
      if (input === "policy") f.settings.noteTypeField = "Other";
      if (input === "file") f.page.file = { ...f.file };
      if (input === "tags") f.page.tags.reverse();
      assert.equal(ready.isCurrent(), false, input);
      assert.equal(f.page.noteType, "Card"); assert.equal(f.page.primaryStyleTag, "#card");
    }
  });
});

test("presentation captures only selected fields and preserves ready facets when another facet is pending", async () => {
  await withFacetWindow(async () => {
    const f = facetFixture(), P = graphPresentation.provider;
    f.metadata.frontmatter.Type = "Current"; f.storage.getBodies = async () => new Map();
    const ready = await P.prepareGraphPresentation([f.page], f.settings, P.ALL_PRESENTATION_FACETS, f.app, f.hot, f.storage, () => true);
    assert(ready && ready.isCurrent()); assert.deepEqual(ready.facets.get(f.page), {
      maxLabelLength: 30, noteType: "Current", status: { noteType: "ready", styleTags: "pending" },
    });
    const unrelated = {}; unrelated.self = unrelated; f.metadata.frontmatter.Unrelated = unrelated;
    assert.equal(ready.isCurrent(), true, "Unselected cyclic metadata is never traversed");
    P.applyPreparedPresentation(ready, f.statuses);
    assert.equal(f.page.noteType, "Current"); assert.equal(f.page.primaryStyleTag, "#card");
    assert.equal(f.statuses.get(f.page).styleTags, "pending");
  });
});

test("sparse incoming Card candidates recover actual host tag styling without altering semantic tag membership", async () => {
  await withFacetWindow(async () => {
    const f = facetFixture(), P = graphPresentation.provider;
    f.page.tags = []; f.page.noteType = null; f.page.primaryStyleTag = null; f.page.styleTags = [];
    f.metadata.hostTags = ["#excalidraw"]; f.metadata.frontmatter.tags = ["excalidraw"];
    f.settings.tagStyleList = ["#excalidraw"]; f.settings.primaryTagField = ""; f.settings.noteTypeField = "";
    const ready = await P.prepareGraphPresentation([f.page], f.settings, { names: false, limits: false, noteType: true, styleTags: true },
      f.app, f.hot, f.storage, () => true);
    assert(ready && ready.isCurrent()); assert.equal(ready.pending, 0); assert.equal(f.reads(), 0);
    P.applyPreparedPresentation(ready, f.statuses);
    assert.equal(f.page.primaryStyleTag, "#excalidraw"); assert.deepEqual(f.page.styleTags, []);
    assert.deepEqual(f.page.tags, [], "Presentation never rewrites source-owned semantic tags");
    f.metadata.hostTags[0] = "#changed";
    assert.equal(ready.isCurrent(), false, "Actual host tag mutation fences even the same MetadataCache object");
  });
});

test("frontmatter primary style avoids body lookup while genuine empty policy clears old presentation", async () => {
  await withFacetWindow(async () => {
    const f = facetFixture(), P = graphPresentation.provider;
    f.metadata.frontmatter.Style = "#drawing"; f.metadata.frontmatter.Type = "Ready";
    const ready = await P.prepareGraphPresentation([f.page], f.settings, P.ALL_PRESENTATION_FACETS, f.app, f.hot, f.storage, () => true);
    assert(ready && ready.isCurrent()); assert.equal(f.reads(), 0); P.applyPreparedPresentation(ready, f.statuses);
    assert.equal(f.page.primaryStyleTag, "#drawing"); assert.equal(f.page.noteType, "Ready");
    f.settings.tagStyleList = []; f.settings.noteTypeField = ""; f.state.metadata = null;
    const disabled = await P.prepareGraphPresentation([f.page], f.settings, P.ALL_PRESENTATION_FACETS, f.app, f.hot, f.storage, () => true);
    assert(disabled && disabled.isCurrent()); assert.equal(disabled.pending, 0); P.applyPreparedPresentation(disabled, f.statuses);
    assert.equal(f.page.noteType, null); assert.equal(f.page.primaryStyleTag, null); assert.deepEqual(f.page.styleTags, []);
  });
});

test("an earlier presentation batch remains fenced while a later cache batch is prepared", async () => {
  await withFacetWindow(async () => {
    const f = facetFixture(), P = graphPresentation.provider;
    f.metadata.frontmatter.Type = "Known"; f.settings.primaryTagField = "";
    const pages = Array.from({ length: 65 }, (_, index) => {
      const file = { path: `Node-${index}.md`, extension: "md", stat: { mtime: 1, size: 40 } };
      return { ...f.page, path: file.path, file, tags: [...f.page.tags] };
    });
    const files = new Map(pages.map(page => [page.path, page.file]));
    f.app.vault.getFileByPath = path => files.get(path) ?? null;
    let checkpoints = 0;
    const result = await P.prepareGraphPresentation(pages, f.settings, P.ALL_PRESENTATION_FACETS, f.app, f.hot, f.storage,
      () => true, undefined, async () => { if (++checkpoints === 2) pages[0].file.stat.mtime++; });
    assert.equal(checkpoints, 2); assert.equal(result, null);
    assert(pages.every(page => page.noteType === "Card"), "All staged facets remain private on cross-batch cancellation");
  });
});
