/**
 * Independent legacy-import oracle shared by portable and native UI tests. Graph/ontology/style
 * values are compared exactly; local K-Plex workflow preferences must remain unchanged.
 */
import assert from "node:assert/strict";

/** Graph appearance and ontology scalar values expected from the historical fixture. */
const graphValueKeys = [
  "compactView", "compactingFactor", "minLinkLength",
  "inferAllLinksAsFriends", "inverseInfer", "inverseArrowDirection", "renderAlias", "backgroundColor",
  "showInferredNodes", "showAttachments", "showURLNodes", "showVirtualNodes", "showFolderNodes",
  "showTagNodes", "showPageNodes", "showNeighborCount", "showFullTagName", "maxItemCount",
  "renderSiblings", "primaryTagField", "displayAllStylePrefixes",
];

/** Plugin workflow settings are not part of legacy graph compatibility. */
export const localPreferenceKeys = [
  "internalHotkeys", "actionPreferences", "colorPreferences", "navigationHistory", "lastActivePath", "pinnedNodes", "documentSyncMode", "followActiveFile",
  "autoOpenCentralDocument", "toggleEmbedTogglesAutoOpen", "indexUpdateInterval", "nodeTitleScript",
  "allowOntologySuggester", "ontologySuggesterParentTrigger", "ontologySuggesterChildTrigger",
  "ontologySuggesterLeftFriendTrigger", "ontologySuggesterRightFriendTrigger", "ontologySuggesterPreviousTrigger",
  "ontologySuggesterNextTrigger", "ontologySuggesterTrigger", "ontologySuggesterMidSentenceTrigger",
  "boldFields", "allowAutozoom", "allowAutofocuOnSearch", "defaultAlwaysOnTop", "applyPowerFilter",
  "embedCentralNode", "centralNodeMarkdownMode", "centralNodeMarkdownZoomModes", "centerEmbedWidth", "centerEmbedHeight",
  "startInPopout", "sidecarOpen", "sidecarPosition", "sidecarLastFilePath", "sidecarLastUrl",
  "mouseInteractionMode", "toolbarExpanded", "kplexInitialized", "startupIndexInfoBubbleSeen",
  "deletePromptInitialized", "confirmFileDelete", "removeOntologyLinksOnDelete", "editNewNodeAfterCreate", "newNodeAfterSaving", "newNodeDefaultType",
];

/** Verify complete restored appearance/ontology, including its library, in both live and durable native data. This independent oracle follows the captured settings' style keys; it never defines a persistence schema. */
export function assertRestoredKplexAppearance(actual, expected) {
  const keys = new Set(["hierarchy", "appearanceThemes", "tagStyleList", "backgroundColor", "standardStyleDefaults", "colorPreferences", "graphLenses",
    ...Object.keys(expected).filter(key => key.endsWith("Style") || key.endsWith("Styles"))]);
  for (const key of keys) assert.deepEqual(actual[key], expected[key], `Restored ${key} differs from the pre-import appearance`);
}

/** Compare complete imported dictionaries and local preferences without masking changed fields. */
export function assertMigratedExcaliBrainSettings(actual, fixture, current) {
  // This independent oracle compares physical names. Version 1 only escapes literal foreign
  // slashes/backslashes; the fixture must not acquire a directional pair during import.
  const hierarchy = actual.ontologyPairingVersion === 1 ? Object.fromEntries(Object.entries(actual.hierarchy).map(
    /** Decode the two documented literal escapes, independently of the production projector. */ ([group, fields]) => [group, fields.map(
      /** Foreign input never opts into a pair; preserve its exact property spelling. */ value => value.replace(/\\([\\/])/g, "$1"))])) : actual.hierarchy;
  assert.equal(Object.hasOwn(actual, "excalibrainFilepath"), false,
    "Transient ExcaliBrain drawing path must not become K-Plex state");
  for (const key of ["tagNodeStyles", "tagStyleList", "hierarchyLinkStyles", "excludeFilepaths"])
    assert.deepEqual(actual[key], fixture[key], `Imported ${key} differs`);
  for (const key of graphValueKeys)
    assert.deepEqual(actual[key], fixture[key], `Legacy graph setting ${key} was lost`);
  for (const key of localPreferenceKeys)
    assert.deepEqual(actual[key], current[key], `Legacy import changed local ${key}`);
  for (const key of ["ontologySuggesterFriendTrigger", "hierarchyStyleList", "showURLs"])
    assert.equal(Object.hasOwn(actual, key), Object.hasOwn(current, key), `Unknown legacy key ${key} leaked`);
  for (const key of ["baseNodeStyle", "centralNodeStyle", "inferredNodeStyle", "virtualNodeStyle", "siblingNodeStyle", "baseLinkStyle", "inferredLinkStyle", "folderLinkStyle", "tagLinkStyle"])
    for (const [field, value] of Object.entries(fixture[key])) assert.deepEqual(actual[key][field], value, `${key}.${field}`);
  for (const [key, icon] of [["urlNodeStyle", "globe"], ["attachmentNodeStyle", "paperclip"], ["folderNodeStyle", "folder"], ["tagNodeStyle", "tag"]]) {
    assert.equal(actual[key].icon, icon);
    for (const [field, value] of Object.entries(fixture[key]))
      if (field !== "prefix") assert.deepEqual(actual[key][field], value, `${key}.${field}`);
  }
  // Independent ontology ownership oracle: each imported field goes to its first assigned role.
  const roles = ["hidden", "parents", "children", "leftFriends", "rightFriends", "previous", "next"];
  const owner = new Map();
  for (const role of roles) {
    const source = role === "leftFriends" ? fixture.hierarchy.leftFriends ?? fixture.hierarchy.friends : fixture.hierarchy[role];
    for (const field of source ?? []) {
      const normalized = field.trim().toLowerCase().replaceAll(" ", "-");
      if (!owner.has(normalized)) owner.set(normalized, role);
    }
  }
  owner.set("challenger", "rightFriends");
  for (const [field, role] of owner) {
    if (!field) continue; // Classic settings retain blank role placeholders.
    assert(hierarchy[role].some(value => value.trim().toLowerCase().replaceAll(" ", "-") === field), `Ontology ${field} missing from ${role}`);
    for (const other of roles) if (other !== role)
      assert(!hierarchy[other].some(value => value.trim().toLowerCase().replaceAll(" ", "-") === field), `Ontology ${field} duplicated into ${other}`);
  }
  assert.deepEqual(hierarchy.exclusions.slice().sort(), fixture.hierarchy.exclusions.filter(value => !owner.has(value.trim().toLowerCase().replaceAll(" ", "-"))).sort());
  assert.equal(actual.primaryTagFieldLowerCase, "note-type");
  assert.equal(actual.noteTypeField, current.noteTypeField ?? "Note type");
  assert.equal(actual.connectorStyle, current.connectorStyle ?? "bezier");
  assert.equal(actual.graphDepth, current.graphDepth ?? 1);
  assert.equal("maxZoom" in actual, false);
}
