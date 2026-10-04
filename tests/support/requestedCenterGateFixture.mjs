/**
 * Independent full GraphIndex presentation oracle and gate-policy inputs. The caller supplies a
 * compilation made by all live canonical collectors, never by the requested reader's chosen owners.
 * Production GraphBuilder performs binding and production GraphIndex performs all view decisions.
 */

/** Full current presentation defaults for the existing synchronous view, with explicit overrides. */
export function centerGateSettings(overrides = {}) {
  return { excludeFilepaths: [], showVirtualNodes: true, showAttachments: true, showFolderNodes: true,
    showTagNodes: true, showPageNodes: true, showURLNodes: true, showInferredNodes: true,
    renderAlias: true, nameFields: "aliases", nodeTitleScript: "", nodeSortOrder: "name-asc",
    maxItemCount: 100, renderSiblings: true, baseNodeStyle: { maxLabelLength: 30 },
    noteTypeField: "Type", primaryTagField: "Style", ...overrides };
}

/** A distinct monotonic presentation token; no source/semantic token is reused as its authority. */
export function centerGatePolicy(settings, overrides = {}) {
  return { revision: "presentation:1", settings, isCurrent: () => true, ...overrides };
}

/**
 * Bind all full-oracle nodes with the actual production binder, then read a fresh production index.
 * Only native file lookup is doubled. No source selection, visibility, sorting or gates are emulated.
 * Each caller must destroy the index; no live application or persisted state is installed.
 */
export async function fullCenterIndex(M, f, compilation, semantic, presentation) {
  const app = { ...f.app, vault: { ...f.app.vault, getName: () => "private-center-gate-oracle" } };
  const plugin = { app, settings: { ...semantic, ...presentation }, getIndexSourceRevision: () => f.acquisition.hostRevision };
  const index = new M.GraphIndex(plugin, app);
  try {
    const builder = new M.GraphBuilder(plugin, app, new Map(), index.metadataParser, index.indexedDb, () => true);
    const state = await builder.bindCompiledGraph(compilation, { materializedFile: facet => f.files.get(facet.path) ?? null });
    if (!state) throw new Error("Independent full GraphBuilder binding failed");
    index.state = state;
    return index;
  } catch (error) { index.destroy(); throw error; }
}

/** Preserve the exact displayed lists, including order, duplicate paths, provenance and title. */
export function currentNeighborhoodView(index, path) {
  const value = index.getNeighborhood(path);
  if (!value) return null;
  const result = { center: value.center.path, gates: structuredClone(index.gateStats(value.center)) };
  for (const role of ["parents", "children", "leftFriends", "rightFriends", "siblings"]) {
    result[role] = value[role].map(item => ({ path: item.page.path, role: item.role, relationType: item.relationType,
      direction: item.linkDirection, definition: item.typeDefinition, title: index.titleFor(item.page) }));
  }
  return result;
}

/** Exercise all kind/inference/prefix filters and prove that sorting/top-N do not change gate totals. */
export function centerVisibilityCases() {
  return [{}, ...["showVirtualNodes", "showAttachments", "showFolderNodes", "showTagNodes", "showPageNodes", "showURLNodes", "showInferredNodes"]
    .map(key => ({ [key]: false })), { excludeFilepaths: ["B", "image", "https://", "tag:"] },
    { excludeFilepaths: ["A.md"] }, { excludeFilepaths: [""] },
    { showVirtualNodes: true, showPageNodes: false }, { showInferredNodes: false, maxItemCount: 0 },
    ...["name-asc", "name-desc", "modified-asc", "modified-desc", "created-asc", "created-desc", "connections-asc", "connections-desc"]
      .map(nodeSortOrder => ({ nodeSortOrder, maxItemCount: 1, renderSiblings: false }))];
}
