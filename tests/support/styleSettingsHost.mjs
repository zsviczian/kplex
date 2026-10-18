/**
 * Reuse the actual production appearance/settings methods in finite Node and Chromium host
 * fixtures. This only extracts TypeScript source; it never implements persistence or ownership.
 * Installed-types/build and exact native lanes still validate the complete plugin lifecycle.
 */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import ts from "typescript";

/** Preserve original method bodies, including queue/await fences, while callers supply explicit host facts. */
export function styleSettingsHostSource(root) {
  const source = ts.createSourceFile("main.ts", readFileSync(new URL("src/main.ts", root), "utf8"), ts.ScriptTarget.Latest, true);
  const names = new Set(["updateStyleSettings", "saveSettings", "enqueueSettingsWrite", "settingsSnapshotForPersistence", "persistSettingsSnapshot", "setGraphLenses",
    "captureAppearanceOwner", "isAppearanceOwnerCurrent", "subscribeAppearanceThemes", "bindAppearanceEditor", "appearanceThemeNames", "updateAppearanceThemes",
    "createAppearanceTheme", "resetAppearanceThemeColors", "importLegacyAppearance", "settingsForWrite", "writeSettingsSnapshot", "updateOntologyField", "refreshSavedSettings",
    "initializeSettingsReconciliation", "onExternalSettingsChange", "queueExternalSettingsAdoption", "reportExternalSettingsFailure", "installExternalSettings", "updateActionPreferences", "receivedSettingsOwner", "receivedSettingsRevision"]);
  const methods = [];
  /** The owning class keeps one definition for every requested method; a missing seam is an explicit failure. */
  const visit = node => {
    if (ts.isMethodDeclaration(node) && names.has(node.name.getText(source))) methods.push(node.getText(source));
    ts.forEachChild(node, visit);
  };
  visit(source); assert.equal(methods.length, names.size);
  return `export {TextSettingDraft} from "./src/ui/components/textSettingDraft";
    export {OntologyFieldControl} from "./src/ui/OntologyFieldControl";
    import {SavedSettingsRefresh} from "./src/adapters/obsidian/savedSettingsRefresh";
    import * as appearanceThemes from "./src/core/plex/appearanceThemes";
    import {DEFAULT_SETTINGS,importExcaliBrainGraphSettings,migrateAndMergeSettings} from "./src/settings";
    import {SettingsReconciliation} from "./src/adapters/obsidian/settingsReconciliation";
    import {assertExternalSettingsRecord} from "./src/adapters/obsidian/settingsInput";
    import {readObsidianPresentationEnvironment} from "./src/adapters/obsidian/presentationEnvironment";
    import {migrateActionPreferences,sanitizeActionPreferences,compileActionBindings} from "./src/core/plex/actionPreferences";
    import {Notice} from "obsidian";
    import {mergeGraphLensDefinitions} from "./src/lens/GraphLens";
    import {requireNamedColor} from "./src/core/plex/colorEditing";
    import {appearanceColorReferences,STYLE_SETTINGS_KEYS} from "./src/core/contracts/appearance";
    import {cyclicSemanticColorSlots,migrateColorPreferences} from "./src/core/plex/colorPreferences";
    import {captureSettingsPolicy,classifySettingsChange,isStyleOnlySettingsChange} from "./src/core/graph/settingsPolicy";
    export class StyleSettingsHost {${methods.join("\n")}}`;
}
