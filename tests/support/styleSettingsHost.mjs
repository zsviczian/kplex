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
  const names = new Set(["updateStyleSettings", "saveSettings", "enqueueSettingsWrite", "settingsSnapshotForPersistence", "persistSettingsSnapshot", "setGraphLenses", "readPortableSharingState", "previewPortableSharing", "importPortableSharing",
    "captureAppearanceOwner", "isAppearanceOwnerCurrent", "subscribeAppearanceThemes", "bindAppearanceEditor", "appearanceThemeNames", "updateAppearanceThemes", "showAppearanceMigrationNotification",
    "createAppearanceTheme", "resetAppearanceThemeColors", "importLegacyAppearance", "settingsForWrite", "writeSettingsSnapshot", "updateOntologyField", "updateOntologyConfiguration", "editOntologyConfiguration", "assignFieldToOntology", "ontologyFieldsForRole", "ontologyRoleForField", "inverseOntologyField", "inverseRelationshipRole", "defaultOntologyField", "refreshSavedSettings",
    "initializeSettingsReconciliation", "onExternalSettingsChange", "queueExternalSettingsAdoption", "reportExternalSettingsFailure", "installExternalSettings", "updateActionPreferences", "receivedSettingsOwner", "receivedSettingsRevision", "updateCanvasViewSetting", "readCanvasViewConfiguration", "updateCanvasViewConfiguration", "resetCanvasViewConfiguration", "migrateCanvasViewConfiguration", "commitCanvasViewConfiguration"]);
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
    import {builtInCanvasViewSettings} from './src/ui/plexViews/settingsContributions';
    import {editViewConfigurationAt,migrateViewConfiguration,readViewConfiguration,readViewConfigurationAt,resetViewConfiguration,viewConfigurationOwnerDomains,viewConfigurationUpdateDomain} from './src/core/plex/views/configuration';
    import {facetLibrary} from './src/core/plex/views/facets/configuration';
    import {applyPortableImport,PortableSharingCapacityError} from './src/core/plex/sharing/transfer';
    import {configurationJson} from './src/core/plex/views/configurationValues';
    import {editOntologyDescriptions} from './src/core/contracts/ontologyReadModel';
    import {ontologyConfiguration,assignOntologyField,applyOntologyEdit,ontologyEndpointState,editOntologyEntries,ONTOLOGY_GROUPS} from './src/core/contracts/ontologyConfiguration';
    export * from './src/core/contracts/ontologyConfiguration';
    export {OntologyUsageModal} from './src/ui/OntologyUsageModal';
    export {OntologyManagerModal} from './src/ui/OntologyManagerModal';
    export {AddToOntologyModal} from './src/ui/AddToOntologyModal';
    import {normalizeFieldName} from './src/core/contracts/fieldName';
    import {NotificationModal} from "./src/ui/NotificationModal";
    import {mergeGraphLensDefinitions} from "./src/lens/GraphLens";
    import {requireNamedColor} from "./src/core/plex/colorEditing";
    import {appearanceColorReferences,STYLE_SETTINGS_KEYS} from "./src/core/contracts/appearance";
    import {cyclicSemanticColorSlots,migrateColorPreferences} from "./src/core/plex/colorPreferences";
    import {captureSettingsPolicy,classifySettingsChange,isStyleOnlySettingsChange} from "./src/core/graph/settingsPolicy";
    export class StyleSettingsHost {actionDialogs = new Map(); ${methods.join("\n")}}`;
}
