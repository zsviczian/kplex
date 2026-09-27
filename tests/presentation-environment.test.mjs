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

const compiled = compilePureModule("src/core/plex/viewPresentation.ts");
const presentation = compiled.exports;
process.on("exit", () => rmSync(compiled.temp, { recursive: true, force: true }));
const classified = compilePureModule("src/adapters/obsidian/presentationEnvironmentFacts.ts");
const obsidianFacts = classified.exports;
process.on("exit", () => rmSync(classified.temp, { recursive: true, force: true }));

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
  assert.deepEqual(presentation.selectLayoutProfile(settings, "sidepanel", phone), settings.layoutProfiles["mobile:sidepanel"]);
  assert.deepEqual(presentation.selectLayoutProfile(settings, "leaf", tablet), settings.layoutProfiles["tablet:leaf"]);
  assert.deepEqual(presentation.selectLayoutProfile(settings, "popout", desktop), settings.layoutProfiles["desktop:popout"]);
  assert.deepEqual(presentation.selectLayoutProfile(settings, "leaf", desktop), { compactingFactor: 9, parentColumns: 9, childColumns: 9 });
});

test("persisted layout keys and stable command ids remain unchanged in production sources", () => {
  const settingsSource = readFileSync(join(root, "src/settings.ts"), "utf8");
  for (const key of ["mobile:leaf", "mobile:sidepanel", "mobile:popout", "tablet:leaf", "desktop:leaf"]) {
    assert(settingsSource.includes(`"${key}"`), `missing persisted layout profile ${key}`);
  }
  assert(!settingsSource.includes('"phone:leaf"'), "phone must not become a persisted profile key");
  assert(settingsSource.includes("Object.entries(DEFAULT_LAYOUT_PROFILES)"), "profile migration must continue to enumerate the existing persisted defaults");
  assert(settingsSource.includes("old.layoutProfiles?.[key]"), "profile migration must continue reading the same stored keys");

  const mainSource = readFileSync(join(root, "src/main.ts"), "utf8");
  assert(mainSource.includes('id: "excalibrain-start"'));
  assert(mainSource.includes('id: "kplex-open-popout"'));
  assert(mainSource.includes('id: "kplex-open-sidepanel"'));
  assert(mainSource.includes("primaryOpenSurface(environment, this.settings.startInPopout)"));
  assert(mainSource.includes("isGraphTabCommandAvailable(readObsidianPresentationEnvironment())"));
  assert(mainSource.includes("isPopoutCommandAvailable(readObsidianPresentationEnvironment())"));
});

test("portable presentation code has no Obsidian or window dependency", () => {
  const contractSource = readFileSync(join(root, "src/core/contracts/presentationEnvironment.ts"), "utf8");
  const policySource = readFileSync(join(root, "src/core/plex/viewPresentation.ts"), "utf8");
  const combined = `${contractSource}\n${policySource}`;
  assert(!combined.includes('from "obsidian"'));
  assert(!/\bPlatform\b/.test(combined));
  assert(!/\bwindow\b/.test(combined));
});
