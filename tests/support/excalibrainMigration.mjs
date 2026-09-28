import assert from "node:assert/strict";

// Contract assertions shared by the portable test and actual CLI-import test. Compare the entire
// dictionaries, including empty overrides, alpha channels, casing, prefixes and legacy-only keys.
export function assertMigratedExcaliBrainSettings(actual, fixture, current = {}) {
  for (const key of ["tagNodeStyles", "tagStyleList", "hierarchyLinkStyles", "navigationHistory", "excludeFilepaths"])
    assert.deepEqual(actual[key], fixture[key], `Imported ${key} differs`);
  for (const [key, value] of Object.entries(fixture)) {
    if (typeof value !== "object" && !["maxZoom", "primaryTagFieldLowerCase", "autoOpenCentralDocument", "embedCentralNode"].includes(key))
      assert.equal(actual[key], value, `Legacy setting ${key} was lost`);
  }
  // ExcaliBrain's embedCentralNode controlled a different presentation. Auto migration starts with
  // K-Plex's normal center; manual import preserves the already-initialized K-Plex preference.
  assert.equal(actual.embedCentralNode, current.embedCentralNode ?? false);
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
