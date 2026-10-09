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
  "internalHotkeys", "actionPreferences", "navigationHistory", "lastActivePath", "pinnedNodes", "documentSyncMode", "followActiveFile",
  "autoOpenCentralDocument", "toggleEmbedTogglesAutoOpen", "indexUpdateInterval", "nodeTitleScript",
  "allowOntologySuggester", "ontologySuggesterParentTrigger", "ontologySuggesterChildTrigger",
  "ontologySuggesterLeftFriendTrigger", "ontologySuggesterRightFriendTrigger", "ontologySuggesterPreviousTrigger",
  "ontologySuggesterNextTrigger", "ontologySuggesterTrigger", "ontologySuggesterMidSentenceTrigger",
  "boldFields", "allowAutozoom", "allowAutofocuOnSearch", "defaultAlwaysOnTop", "applyPowerFilter",
  "embedCentralNode", "centralNodeMarkdownMode", "centerEmbedWidth", "centerEmbedHeight",
  "startInPopout", "sidecarOpen", "sidecarPosition", "sidecarLastFilePath", "sidecarLastUrl",
  "mouseInteractionMode", "toolbarExpanded", "kplexInitialized", "startupIndexInfoBubbleSeen",
  "deletePromptInitialized", "confirmFileDelete", "editNewNodeAfterCreate", "newNodeDefaultType",
];

/** Compare complete imported dictionaries and local preferences without masking changed fields. */
export function assertMigratedExcaliBrainSettings(actual, fixture, current) {
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
    assert(actual.hierarchy[role].some(value => value.trim().toLowerCase().replaceAll(" ", "-") === field), `Ontology ${field} missing from ${role}`);
    for (const other of roles) if (other !== role)
      assert(!actual.hierarchy[other].some(value => value.trim().toLowerCase().replaceAll(" ", "-") === field), `Ontology ${field} duplicated into ${other}`);
  }
  assert.deepEqual(actual.hierarchy.exclusions.slice().sort(), fixture.hierarchy.exclusions.filter(value => !owner.has(value.trim().toLowerCase().replaceAll(" ", "-"))).sort());
  assert.equal(actual.primaryTagFieldLowerCase, "note-type");
  assert.equal(actual.noteTypeField, current.noteTypeField ?? "Note type");
  assert.equal(actual.connectorStyle, current.connectorStyle ?? "bezier");
  assert.equal(actual.graphDepth, current.graphDepth ?? 1);
  assert.equal("maxZoom" in actual, false);
}
