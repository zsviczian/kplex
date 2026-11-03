/** Bind internal pure view policies to admitted host facts, shared measurement and existing presentation. No acquisition. */
import type {GraphIndex} from "../../index/GraphIndex";
import type {KplexSettings} from "../../settings";
import {graphNodeViewFromLegacy} from "../../adapters/obsidian/graphContracts";
import {nodeId, type NodeId, type GraphNodeView} from "../../core/graph/model";
import type {PlexViewDefinition, PlexViewRead, PlexProjection, PlexMeasurement, PlexOccurrence, PlexViewEdge, PlexViewPropertyDependencies, PlexNodeBadge, PlexDecorationTextSize} from "../../core/plex/views/contracts";
import {RelationType, type GraphPage, type PositionedNode, type PositionedEdge, type Role, type Neighbour} from "../../types";
import {resolveNodeStyle, resolveLinkStyle} from "../../index/style";
import {deferredNodeCounts, nodeSize, sectionNodeSize, nodeBadgeSize} from "./measurement";
import {projectRelationGroups} from "./groupRelations";
import type {Translator} from "../../lang";
import type {HostPlexScene} from "./scene";
import {readViewConfiguration} from "../../core/plex/views/configuration";
import type {GraphPropertyProvider} from "../../core/plex/predicate";
import {admitOccurrenceEditors, type OccurrenceEditorHost} from "./occurrenceEditors";
import {boundedViewState} from "../../core/plex/views/state";
import {hierarchyPathClosure} from "../../core/plex/views/hierarchy";
import {validCanvasViewText} from "../../core/plex/views/presentation";
import {validPlexNodeBadge, nodeBadgeBounds, boundedViewColors} from "../../core/plex/views/decorations";
import {canvasViewText} from "./labels";
import {validPropertyAssignment} from "../../core/plex/views/propertyAssignment";
import {plexSectionReference, visiblePlexSection, plexSectionAnchor, plexSectionDocument} from "../../core/plex/views/sections";
import {branchDisclosureReserve} from "./branchDisclosure";
import type {PlexSectionViewContext} from "./sections";
import {validPlexDropMeaning, plexAreaDropMeaning} from "../../core/plex/views/dropTargets";
import {validAreaShape} from "../../core/contracts/areaGeometry";

/** One text/font/color path serves real occurrences and the shared synthetic group row. */
function measuredViewBadge(badge: PlexNodeBadge | undefined, settings: KplexSettings, translate?: Translator): PositionedNode["viewBadge"] {
  if (!badge) return undefined;
  const label = translate ? canvasViewText(badge.label, translate) : "literal" in badge.label ? badge.label.literal : badge.label.key;
  const description = badge.description && (translate ? canvasViewText(badge.description, translate) : "literal" in badge.description ? badge.description.literal : badge.description.key);
  return {label, ...(description ? {description} : {}), background: badge.background, ...(badge.presentation ? {presentation: badge.presentation} : {}), ...nodeBadgeSize(label, settings, badge.presentation)};
}

/** A group may retain only a common declared chip. Different reasons remain with individual
 * members after expansion; a representative cannot assert its reason for every grouped note. */
function sharedGroupBadge(members: readonly PlexOccurrence[]): PlexNodeBadge | undefined {
  const first = members[0]?.badge;if (!first) return undefined;
  const identity = JSON.stringify([first.label, first.background, first.presentation]), description = JSON.stringify(first.description);
  if (!members.every(/** Label/color identity is presentation data, never relationship evidence. */ member => member.badge && JSON.stringify([member.badge.label, member.badge.background, member.badge.presentation]) === identity)) return undefined;
  const sameReason = members.every(/** Only equal explanations can describe the entire collapsed row. */ member => JSON.stringify(member.badge?.description) === description);
  return {label: first.label, background: first.background, ...(first.presentation ? {presentation: first.presentation} : {}), ...(sameReason && first.description ? {description: first.description} : {})};
}

type SceneRead = Pick<GraphIndex, "get" | "neighbours" | "sortNeighbours" | "titleFor" | "captureSemanticGateRead" | "isVisiblePage" | "explainRelationship">
  & Partial<Pick<GraphIndex, "viewScopeCoverage" | "cachedViewRelation">>;
export type PreparedViewScene = Readonly<{scene: HostPlexScene; projection: PlexProjection | null; failure: boolean}>;

/** A failed policy keeps only the current canonical attention/editor host. It neither reuses old graph payloads nor acquires sources. */
export function attentionFallbackScene(source: Pick<GraphIndex, "get" | "titleFor">, attention: string, settings: KplexSettings,
  editorSize?: {width: number; height: number}): HostPlexScene {
  const page = source.get(attention);
  if (!page) return {nodes: [], edges: [], zoneAreas: {}, zoneViewports: {}, failed: true};
  const style = resolveNodeStyle(page, null, "center", settings), label = source.titleFor(page);
  const size = editorSize ?? nodeSize(label, style.fontSize ?? 30, settings, true, style.maxLabelLength, style.maxWidth, style.strokeWidth);
  return {nodes: [{page, role: "center", occurrenceId: "recovery-attention", physicalPorts: {}, x: 0, y: 0, ...size,
    label, style, ...deferredNodeCounts()}], edges: [], zoneAreas: {}, zoneViewports: {}, failed: true,
    entryOccurrence: "recovery-attention", editorOccurrence: "recovery-attention", frameOccurrence: "recovery-attention"};
}

/** Expose a bounded, revision-scoped cache-only reader. Corpus/metric absence is explicit, never numerical zero. */
export function plexViewRead(source: SceneRead, current: () => boolean, maximum: number, attention?: string, hierarchyOccurrences = 0,
  properties?: GraphPropertyProvider & {viewDependencies?: PlexViewPropertyDependencies}): PlexViewRead {
  const proof = source.captureSemanticGateRead(), nodes = new Map<NodeId, GraphNodeView>();
  let operations = 0;
  let propertyOperations = 0;
  const requested = properties?.viewDependencies;
  const dependencies = requested && requested.fields.length <= 16 && requested.fields.every(field => typeof field === "string" && field.length > 0 && field.length <= 128)
    && (requested.evidence === undefined || typeof requested.evidence === "boolean") ? requested : undefined;
  const occurrences = Math.min(2048, maximum * 6 + 1);
  const propertyBudget = dependencies && dependencies.fields.length > 1 ? Math.min(16_384, occurrences * (dependencies.fields.length + 1)) : Math.min(2048, maximum * 8 + 1);
  /** Property reads address only admitted nodes with a separate finite scene budget. */
  const propertyNode = (id: NodeId): GraphNodeView | null => isCurrent() && ++propertyOperations <= propertyBudget ? nodes.get(id) ?? null : null;
  // Ordinary definitions retain their existing budget. A hierarchy admits at most256 occurrences:
  // each can probe six roles plus node/scope/admission guards; eight expanded scopes can read six
  // bounded prefixes (8 * 6 = 48). The absolute read-operation cap remains16,384; no read acquires sources.
  const budget = Math.min(16_384, Math.max(16, maximum * 16, Number.isInteger(hierarchyOccurrences) && hierarchyOccurrences > 0
    ? Math.min(256, hierarchyOccurrences) * 16 + maximum * 48 : 0, dependencies?.evidence ? occurrences * 6 : 0));
  const isCurrent = (): boolean => current() && proof.isCurrent();
  const node = (id: NodeId): GraphNodeView | null => {
    if (!isCurrent() || ++operations > budget) return null;
    const prior = nodes.get(id); if (prior) return prior;
    const page = source.get(id); if (!page || page.transient || id !== attention && !source.isVisiblePage(page)) return null;
    const value = graphNodeViewFromLegacy(page); nodes.set(id, value); return value;
  };
  return {coverage: "cached", isCurrent, node, corpus: {available: false, reason: "unsupported"},
    ...(properties ? {properties: {
      /** Only admitted, current canonical nodes may ask the existing field owner for availability. */
      availability: (id: NodeId) => {const value = propertyNode(id); return value ? properties.notePropertyAvailability?.(value) ?? "unavailable" : "unavailable";},
      /** Selected fields share the same operation budget and lifetime as local node/relationship reads. */
      read: (id: NodeId, field: string) => {const value = propertyNode(id); return value && field.length <= 128
        ? properties.readNoteProperty?.(value, field) ?? {status: "unavailable" as const} : {status: "unavailable" as const};},
    }} : {}),
    scope: id => {
      const page = node(id) && source.get(id);
      const value = page && isCurrent() && source.viewScopeCoverage ? source.viewScopeCoverage(page.path) : null;
      return value && isCurrent() ? value : {coverage: "unavailable", prepared: false, complete: false, pending: false};
    },
    relation: (sourceId, targetId, role) => {
      if (!node(sourceId) || !node(targetId) || !isCurrent() || !source.cachedViewRelation) return {items: [], coverage: "unavailable", truncated: false};
      const row = source.cachedViewRelation(sourceId, targetId, role), target = row && node(nodeId(row.page.path));
      return isCurrent() ? {items: row && target ? [{node: target, role: row.role, relationType: row.relationType,
        definition: row.typeDefinition, direction: row.linkDirection}] : [], coverage: "cached", truncated: false}
        : {items: [], coverage: "unavailable", truncated: false};
    },
    relations: (id, role, requestedMaximum) => {
      if (!node(id) || !isCurrent()) return {items: [], coverage: "unavailable", truncated: operations > budget};
      const page = source.get(id); if (!page) return {items: [], coverage: "unavailable", truncated: false};
      const rows = source.neighbours(page, role);
      const limit = requestedMaximum === undefined ? maximum : Number.isInteger(requestedMaximum) && requestedMaximum > 0
        ? Math.min(maximum, requestedMaximum) : 0;
      const items = rows.slice(0, limit).flatMap(row => {
        const value = node(nodeId(row.page.path));
        return value ? [{node: value, role: row.role, relationType: row.relationType, definition: row.typeDefinition, direction: row.linkDirection}] : [];
      });
      return {items, coverage: operations > budget || limit === 0 ? "unavailable" : "cached", truncated: rows.length > limit || operations > budget};
    },
    evidence: (sourceId, targetId) => {
      if (!node(sourceId) || !node(targetId) || !isCurrent()) return {coverage: "unavailable", value: null};
      const explanation = source.explainRelationship(sourceId, targetId);
      return {coverage: "cached", value: explanation ? {source: sourceId, target: targetId, hidden: explanation.hidden, summary: explanation.summary,
        roles: explanation.resolvedRoles, decisions: explanation.decisions} : null};
    },
    compare: (left, right) => {
      if (left.id === right.id) return 0;
      const a = source.get(left.id), b = source.get(right.id); if (!a || !b) return 0;
      const rows = source.sortNeighbours([{page: a, role: "child", relationType: RelationType.INFERRED, linkDirection: null},
        {page: b, role: "child", relationType: RelationType.INFERRED, linkDirection: null}]);
      return rows[0]?.page === a ? -1 : 1;
    },
  };
}

/** Validate finite, independently keyed output and declared hierarchy depth before shared rendering/actions.
 * Hierarchies without an explicit depth capability retain their existing eight-level admission limit. */
function validateProjection(projection: PlexProjection, maximum: number, definition: PlexViewDefinition): void {
  if (projection.connectionPresentation !== undefined && projection.connectionPresentation !== "node-centers") throw new Error("Invalid connection presentation");
  if (projection.occurrences.length > maximum || projection.edges.length > maximum * 8) throw new Error("View projection exceeds its bound");
  const ids = new Map(projection.occurrences.map(row => [row.id, row]));
  if (projection.occurrences.filter(row => row.badge).length > Math.min(maximum, definition.badgeBudget ?? 16)) throw new Error("Too many node badges");
  if (ids.size !== projection.occurrences.length) throw new Error("Duplicate view occurrence");
  for (const occurrence of projection.occurrences) {
    if (occurrence.badge && (definition.capabilities.badges !== true || !validPlexNodeBadge(occurrence.badge))
      || occurrence.description !== undefined && !validCanvasViewText(occurrence.description)) throw new Error("Invalid node decoration");
    if (!occurrence.id || occurrence.id.length > 4096 || occurrence.synthetic || occurrence.representation !== "thought"
      || occurrence.areaId && ["__proto__", "constructor", "prototype"].includes(occurrence.areaId)) throw new Error("Unsupported view occurrence");
    const peer = occurrence.peerPort;
    if (peer && (definition.hierarchy?.relations !== "child-and-peer" || !occurrence.ports?.[peer.side]
      || !Number.isInteger(peer.count) || peer.count < 0 || peer.count > 1024 || typeof peer.complete !== "boolean")) throw new Error("Invalid bounded peer port");
  }
  if (!ids.has(projection.entry) || projection.root && !ids.has(projection.root) || projection.editor && !ids.has(projection.editor)
    || projection.frame && !ids.has(projection.frame)) throw new Error("Invalid scene anchor");
  for (const occurrence of projection.occurrences) if (occurrence.branch) {
    const branch = occurrence.branch, parent = branch.parent ? ids.get(branch.parent) : null;
    if (!definition.hierarchy || !Number.isInteger(branch.depth) || branch.depth < 0
      || branch.depth > (definition.hierarchy.maximumDepth ?? 8) || ![-1, 1].includes(branch.side)
      || !["ready", "loading", "partial", "unavailable", "limited"].includes(branch.status)
      || [branch.expanded, branch.canExpand, branch.reference].some(value => typeof value !== "boolean")
      || branch.parent && (!parent?.branch || parent.branch.depth + 1 !== branch.depth || parent.branch.depth > 0 && parent.branch.side !== branch.side)
      || !branch.parent && (branch.depth !== 0 || occurrence.id !== projection.root)
      || branch.reference && (branch.expanded || branch.canExpand)) throw new Error("Invalid occurrence hierarchy");
    if (parent && !projection.edges.some(edge => edge.kind === "semantic" && edge.source === parent.id && edge.target === occurrence.id
      && (edge.relation.role === "child" || definition.hierarchy?.relations === "child-and-peer" && occurrence.role === edge.relation.role
        && (["left", "right", "previous", "next"].includes(edge.relation.role) || parent.id === projection.root && edge.relation.role === "parent")))) throw new Error("Missing canonical hierarchy branch");
  }
  if (projection.preparation) {
    const parents = projection.preparation.parents;
    if (!definition.hierarchy || parents.length > definition.hierarchy.maximumScopes || new Set(parents).size !== parents.length
      || parents.some(id => !projection.occurrences.some(row => row.nodeId === id && row.branch?.expanded && !row.branch.reference))) throw new Error("Invalid requested frontiers");
  }
  if (projection.stateSuggestion !== undefined && (!definition.hierarchy || projection.stateSuggestion !== null
    && boundedViewState(projection.stateSuggestion) === null)) throw new Error("Invalid view state suggestion");
  const edges = new Set<string>(), ports = new Set(["top", "bottom", "left", "right"]);
  for (const edge of projection.edges) {
    if (!edge.id || edges.has(edge.id) || !ids.has(edge.source) || !ids.has(edge.target)
      || !ports.has(edge.sourcePort) || !ports.has(edge.targetPort)) throw new Error("Invalid occurrence endpoint");
    edges.add(edge.id);
    if (edge.kind === "semantic" && (ids.get(edge.source)?.section || ids.get(edge.target)?.section
      || ids.get(edge.source)?.nodeId !== edge.sourceNode || ids.get(edge.target)?.nodeId !== edge.targetNode
      || edge.relation.node.id !== edge.targetNode)) throw new Error("Semantic edge does not match its canonical endpoints");
  }
}

/** Pure policy failure stays local. The shell can recover without replacing native document/editor owners. */
export function prepareViewScene(definition: PlexViewDefinition, read: PlexViewRead, source: Pick<GraphIndex, "get" | "titleFor">,
  attention: string, state: unknown, settings: KplexSettings, current: () => boolean,
  editorSize?: {width: number; height: number}, matches: (node: PositionedNode) => boolean = () => true,
  grouping?: {translate: Translator; unfolded: ReadonlySet<string>; areaHeights?: Readonly<Record<string, number>>; areaWidths?: Readonly<Record<string, number>>; layoutRoot?: NodeId; retainedScopes?: readonly NodeId[];
    sections?: PlexSectionViewContext | null; touchControls?: boolean},
  editorHost?: OccurrenceEditorHost): PreparedViewScene {
  const empty: HostPlexScene = {nodes: [], edges: [], zoneViewports: {}, zoneAreas: {}};
  try {
    const maximum = Math.min(2048, Math.max(1, settings.maxItemCount * 8 + 1));
    const configuration = readViewConfiguration(definition, settings.canvasViewSettings === undefined ? {} : settings.canvasViewSettings);
    if (configuration.status !== "available") return {scene: empty, projection: null, failure: true};
    const propertyAssignments = definition.propertyAssignments?.(state, configuration) ?? [];
    if (!Array.isArray(propertyAssignments) || propertyAssignments.length > 32 || !propertyAssignments.every(validPropertyAssignment)
      || new Set(propertyAssignments.map(target => target.id)).size !== propertyAssignments.length) throw new Error("Invalid property assignment targets");
    const layoutRoot = definition.navigation === "rooted" ? grouping?.layoutRoot ?? nodeId(attention) : undefined;
    const requestedSections = definition.capabilities.sections === true ? grouping?.sections : undefined;
    const sectionDocument = plexSectionDocument(definition, nodeId(attention), layoutRoot);
    const sectionEditor = editorSize || editorHost?.bindings.some(binding => binding.target.nodeId === sectionDocument);
    const sectionHost = !sectionEditor && requestedSections?.isCurrent() && requestedSections.snapshot.documentId === sectionDocument ? requestedSections : null;
    const projection = definition.project({attention: nodeId(attention), layoutRoot, retainedScopes: grouping?.retainedScopes,
      editors: editorHost?.bindings.map(binding => ({occurrenceId: binding.occurrenceId, nodeId: binding.target.nodeId})),
      read, maximum: settings.maxItemCount, state, configuration,
      ...(requestedSections !== undefined ? {sections: sectionHost ? {status: "available", snapshot: sectionHost.snapshot}
        : {status: "unavailable", reason: sectionEditor ? "editor" : "source"}} : {})});
    if (!projection || !current() || !read.isCurrent()) return {scene: empty, projection: null, failure: true};
    validateProjection(projection, maximum, definition);
    const sectionOccurrences = new Map<string, string>();
    for (const occurrence of projection.occurrences) if (occurrence.section) {
      if (!sectionHost || !plexSectionReference(sectionHost.snapshot, occurrence.section)
        || occurrence.nodeId !== occurrence.section.documentId || !sectionHost.snapshot.visible.includes(occurrence.section.sectionId)
        || sectionOccurrences.has(occurrence.section.sectionId) || occurrence.id === projection.editor || occurrence.id === projection.entry
        || occurrence.id === projection.root) throw new Error("Invalid section row occurrence");
      sectionOccurrences.set(occurrence.section.sectionId, occurrence.id);
    }
    if (projection.heading !== undefined && projection.heading !== null && !validCanvasViewText(projection.heading)) throw new Error("Invalid canvas heading");
    if (projection.status !== undefined && !validCanvasViewText(projection.status)) throw new Error("Invalid canvas status");
    if (definition.colorReferences) boundedViewColors(definition.colorReferences(configuration));
    if (definition.editorHosting === "occurrence" && editorSize) throw new Error("Occurrence editors require occurrence dimensions");
    if (editorSize && (!projection.editor || projection.occurrences.find(row => row.id === projection.editor)?.nodeId !== attention)) throw new Error("Missing attention editor anchor");
    if (projection.attention !== attention) throw new Error("View changed its admitted attention scope");
    if (layoutRoot && projection.layoutRoot !== layoutRoot) throw new Error("View changed its admitted root scope");
    const rootCandidates = layoutRoot ? projection.occurrences.filter(row => row.nodeId === layoutRoot) : [];
    const rootOccurrence = layoutRoot ? projection.root ?? (rootCandidates.length === 1 ? rootCandidates[0].id : undefined) : undefined;
    if (layoutRoot && (!rootOccurrence || projection.occurrences.find(row => row.id === rootOccurrence)?.nodeId !== layoutRoot)) throw new Error("Missing unique root occurrence");
    const boundEditors = admitOccurrenceEditors(definition, projection, read, source, editorHost);
    const legacyEditor = definition.editorHosting === "occurrence" ? undefined : projection.editor;
    const pages = new Map<string, GraphPage>(), measurements: PlexMeasurement[] = [];
    const nodes = new Map<string, PositionedNode>();
    const occurrences = new Map(projection.occurrences.map(row => [row.id, row])), matched = new Set<string>();
    for (const occurrence of projection.occurrences) {
      const canonical = occurrence.nodeId && read.node(occurrence.nodeId) ? source.get(occurrence.nodeId) : null;
      const page = canonical && occurrence.section ? sectionHost?.page(occurrence.section) : canonical;
      if (!page || page.transient && !occurrence.section) continue;
      pages.set(occurrence.id, page);
      const isRoot = !occurrence.section && (layoutRoot ? occurrence.id === rootOccurrence : occurrence.nodeId === projection.attention);
      const role = occurrence.role ?? (isRoot ? "center" : "child"), relation = occurrence.relation ? {page, role: occurrence.relation.role,
        relationType: occurrence.relation.relationType, typeDefinition: occurrence.relation.definition, linkDirection: occurrence.relation.direction} : null;
      const style = resolveNodeStyle(page, relation, role, settings), label = source.titleFor(page);
      const boundEditor = boundEditors.get(occurrence.id);
      const measuredSize = boundEditor?.binding.dimensions ?? (occurrence.id === legacyEditor && editorSize ? editorSize
        : nodeSize(`${style.prefix ?? ""}${label}`, style.fontSize ?? 18, settings, isRoot,
          style.maxLabelLength, style.maxWidth, style.strokeWidth));
      const size = occurrence.section ? sectionNodeSize(measuredSize, style.maxWidth ?? settings.baseNodeStyle.maxWidth) : measuredSize;
      const translate = grouping?.translate;
      const description = occurrence.description && (translate ? canvasViewText(occurrence.description, translate) : "literal" in occurrence.description ? occurrence.description.literal : occurrence.description.key);
      const viewBadge = measuredViewBadge(occurrence.badge, settings, translate);
      const controlReserve = branchDisclosureReserve(occurrence.branch, grouping?.touchControls === true && definition.hierarchy?.controls === "measured");
      const node: PositionedNode = {page, occurrenceId: occurrence.id, areaId: occurrence.areaId, representation: occurrence.representation,
        ...(viewBadge ? {viewBadge} : {}), ...(description ? {viewDescription: description} : {}),
        ...(controlReserve ? {controlReserve} : {}),
        role, relationType: relation?.relationType, typeDefinition: relation?.typeDefinition, linkDirection: relation?.linkDirection,
        ...(occurrence.branch ? {branch: occurrence.branch, semanticSourceId: occurrence.branch.parent ? occurrences.get(occurrence.branch.parent)?.nodeId : undefined} : {}),
        physicalPorts: occurrence.ports ?? {}, peerPort: occurrence.peerPort, x: 0, y: 0, ...size, label, style, ...deferredNodeCounts()};
      const matching = occurrence.section ? true : matches(node);
      if (matching || occurrence.id === legacyEditor || boundEditor) matched.add(occurrence.id);
      if (!matching && occurrence.id !== legacyEditor && !boundEditor && !definition.hierarchy) continue;
      nodes.set(occurrence.id, node); measurements.push({id: occurrence.id, ...size, expandedWidth: size.width, expandedReserve: 0,
        ...(viewBadge ? {badge: {width: viewBadge.width, height: viewBadge.height, ...(viewBadge.presentation ? {presentation: viewBadge.presentation} : {})}} : {}),
        ...(controlReserve ? {controlReserve} : {}),
        ...(boundEditor ? {editor: true as const} : {}), mini: null, envelope: null});
    }
    if (definition.hierarchy) {
      // A matching descendant retains its genuine displayed path. No semantic shortcut is invented
      // across a removed parent, and the fixed root remains visible even for an empty match set.
      const keep = new Set(hierarchyPathClosure(projection.occurrences.filter(row => nodes.has(row.id)).map(row => ({id: row.id, parent: row.branch?.parent})),
        matched, rootOccurrence, definition.hierarchy.maximumDepth));
      // Current source-validated headings are presentation children of the one central document,
      // never canonical graph branches. Their own source tree remains with the section owner.
      for (const row of projection.occurrences) if (row.section && nodes.has(row.id)) keep.add(row.id);
      for (const id of nodes.keys()) if (!keep.has(id)) {nodes.delete(id); pages.delete(id);}
      for (let position = measurements.length - 1; position >= 0; position--) if (!keep.has(measurements[position].id)) measurements.splice(position, 1);
    }
    const admitted = new Set(nodes.keys());
    if (editorSize && (!projection.editor || !admitted.has(projection.editor))) throw new Error("Unavailable editor occurrence");
    for (const occurrenceId of boundEditors.keys()) if (!admitted.has(occurrenceId)) throw new Error("Unavailable bound editor admission");
    let filtered: PlexProjection = {...projection, root: rootOccurrence ?? projection.root, editor: legacyEditor, occurrences: projection.occurrences.filter(row => admitted.has(row.id)),
      edges: projection.edges.filter(edge => admitted.has(edge.source) && admitted.has(edge.target))};
    if (settings.groupRelations && grouping) {
      const partitions = new Map<string, PlexOccurrence[]>();
      const branchParents = definition.hierarchy ? new Set(filtered.occurrences.flatMap(row => row.branch?.parent ? [row.branch.parent] : [])) : null;
      for (const occurrence of filtered.occurrences) if (!occurrence.section && occurrence.groupingPartition && occurrence.id !== filtered.root
        && occurrence.id !== filtered.editor && occurrence.id !== filtered.entry && !branchParents?.has(occurrence.id) && !boundEditors.has(occurrence.id)) {
        const partition = JSON.stringify([occurrence.areaId ?? null, occurrence.groupingPartition]);
        const members = partitions.get(partition) ?? []; members.push(occurrence); partitions.set(partition, members);
      }
      const aliases = new Map<string, string>(), grouped = new Map(filtered.occurrences.map(row => [row.id, row]));
      for (const [partition, members] of partitions) {
        const origins = new Map<Neighbour, PlexOccurrence>();
        const rows = members.map(occurrence => {
          const node = nodes.get(occurrence.id)!;
          const row: Neighbour = {page: node.page, role: occurrence.role ?? "child", relationType: occurrence.relation?.relationType ?? RelationType.INFERRED,
            typeDefinition: occurrence.relation?.definition, linkDirection: occurrence.relation?.direction ?? null};
          origins.set(row, occurrence); return row;
        });
        const parentId = members[0]?.branch?.parent;
        const groupSource = parentId ? occurrences.get(parentId)?.nodeId ?? layoutRoot ?? attention : layoutRoot ?? attention;
        for (const row of projectRelationGroups(rows, groupSource, partition, grouping.unfolded, grouping.translate)) {
          if (row.page.transient?.kind !== "group") continue;
          const ids = row.page.transient.groupMembers!.map(member => origins.get(member)!.id);
          const representative = origins.get(row.page.transient.groupMembers![0])!;
          const id = JSON.stringify(["group", row.page.transient.sectionId]);
          const badge = sharedGroupBadge(ids.map(/** Group members retain exact original occurrence metadata. */ member => occurrences.get(member)!));
          const occurrence: PlexOccurrence = {id, synthetic: {kind: "group", members: ids}, representation: "thought",
            areaId: representative.areaId, groupingPartition: representative.groupingPartition, role: representative.role,
            ...(badge ? {badge} : {}),
            ...(representative.branch ? {branch: {...representative.branch, expanded: false, canExpand: false, reference: false}} : {})};
          const style = resolveNodeStyle(row.page, row, row.role, settings);
          const size = nodeSize(row.page.name, style.fontSize ?? 18, settings, false, style.maxLabelLength, style.maxWidth, style.strokeWidth);
          const viewBadge = measuredViewBadge(badge, settings, grouping.translate);
          const node: PositionedNode = {page: row.page, occurrenceId: id, areaId: occurrence.areaId, representation: "thought", role: row.role,
            ...(viewBadge ? {viewBadge} : {}),
            ...(occurrence.branch ? {branch: occurrence.branch, semanticSourceId: groupSource} : {}),
            x: 0, y: 0, ...size, label: row.page.name, style, physicalPorts: {}, ...deferredNodeCounts()};
          for (const member of ids) {aliases.set(member, id);grouped.delete(member);nodes.delete(member);}
          grouped.set(id, occurrence); nodes.set(id, node); pages.set(id, row.page);
          measurements.push({id, ...size, expandedWidth: size.width, expandedReserve: 0, ...(viewBadge ? {badge: {width: viewBadge.width, height: viewBadge.height, ...(viewBadge.presentation ? {presentation: viewBadge.presentation} : {})}} : {}), mini: null, envelope: null});
        }
      }
      const activeMeasurements = new Set(nodes.keys());
      for (let position = measurements.length - 1; position >= 0; position--) if (!activeMeasurements.has(measurements[position].id)) measurements.splice(position, 1);
      const edges: PlexViewEdge[] = filtered.edges.flatMap(edge => {
        const sourceId = aliases.get(edge.source) ?? edge.source, targetId = aliases.get(edge.target) ?? edge.target;
        if (sourceId === targetId) return [];
        if (sourceId === edge.source && targetId === edge.target) return [edge];
        return [{id: edge.id, source: sourceId, target: targetId, sourcePort: edge.sourcePort, targetPort: edge.targetPort,
          kind: edge.kind === "decorative" ? "decorative" : "derived", evidence: edge.kind === "semantic"
            ? [{sourceNode: edge.sourceNode, targetNode: edge.targetNode, relation: edge.relation}] : edge.evidence}];
      });
      filtered = {...filtered, occurrences: [...grouped.values()], edges};
    }
    if (filtered.preparation) {
      const represented = new Set(filtered.occurrences.flatMap(row => row.nodeId ? [row.nodeId] : []));
      filtered = {...filtered, preparation: {parents: filtered.preparation.parents.filter(id => represented.has(id))}};
    }
    const decorationMeasurements = new Map<string, PlexDecorationTextSize>(), labels = definition.decorationLabels?.(state, configuration) ?? [];
    const labelList: unknown = labels;
    if (!Array.isArray(labelList) || labels.length > 32) throw new Error("Too many decoration labels");
    for (const label of labels) {
      if (!label || typeof label.id !== "string" || !label.id || label.id.length > 128 || decorationMeasurements.has(label.id)
        || !validCanvasViewText(label.label) || "literal" in label.label && label.label.literal.length > 80) throw new Error("Invalid decoration label");
      const text = grouping?.translate ? canvasViewText(label.label, grouping.translate) : "literal" in label.label ? label.label.literal : label.label.key;
      decorationMeasurements.set(label.id, nodeBadgeSize(text, settings));
    }
    const layout = definition.layout(filtered, measurements, state, Boolean(editorSize), {areaHeights: grouping?.areaHeights ?? {}, areaWidths: grouping?.areaWidths ?? {}, configuration, decorationMeasurements});
    if (!current() || !read.isCurrent()) return {scene: empty, projection: null, failure: true};
    for (const [id, node] of nodes) {
      const rect = layout.positions.get(id);
      if (!rect || !Object.values(rect).every(Number.isFinite) || rect.width <= 0 || rect.height <= 0) throw new Error("Invalid view geometry");
      Object.assign(node, rect);
    }
    const edges: PositionedEdge[] = filtered.edges.map(edge => {
      const semantic = edge.kind === "semantic", role: Role = semantic ? edge.relation.role : "child";
      const target = pages.get(edge.target)!;
      const physicalSection = (reference: typeof edge.sourceSection): string | undefined => {
        if (!reference) return undefined;
        if (edge.kind !== "semantic" || !sectionHost || reference.documentId !== edge.sourceNode || !plexSectionReference(sectionHost.snapshot, reference)) throw new Error("Invalid physical section endpoint");
        const visible = visiblePlexSection(sectionHost.snapshot, reference), occurrence = visible && sectionOccurrences.get(visible.sectionId);
        const proven = plexSectionAnchor(sectionHost.snapshot, edge.targetNode, edge.relation.role);
        if (visible?.sectionId !== proven?.sectionId) throw new Error("Unproven physical section endpoint");
        return occurrence && nodes.has(occurrence) ? occurrence : undefined;
      };
      const sourceSectionOccurrence = physicalSection(edge.sourceSection);
      return {id: edge.id, kind: edge.kind, sourceOccurrence: edge.source, targetOccurrence: edge.target,
        sourcePath: semantic ? edge.sourceNode : pages.get(edge.source)!.path, targetPath: semantic ? edge.targetNode : target.path,
        sourcePort: edge.sourcePort, targetPort: edge.targetPort, role, relationType: semantic ? edge.relation.relationType : RelationType.INFERRED,
        ...(sourceSectionOccurrence ? {sourceSectionOccurrence} : {}),
        typeDefinition: semantic ? edge.relation.definition : undefined, direction: semantic ? edge.relation.direction : null,
        style: semantic ? resolveLinkStyle({page: target, role, relationType: edge.relation.relationType,
          typeDefinition: edge.relation.definition, linkDirection: edge.relation.direction}, settings, pages.get(edge.source)) : settings.baseLinkStyle};
    });
    const scene: HostPlexScene = {nodes: [...nodes.values()], edges, zoneViewports: {}, zoneAreas: {}, projection: filtered, areas: layout.areas,
      entryOccurrence: filtered.entry, editorOccurrence: filtered.editor, frameOccurrence: filtered.frame, decorations: layout.decorations, propertyAssignments};
    if (sectionHost) scene.sectionTreeEdges = [...sectionOccurrences].flatMap(([id, targetOccurrence]) => {
      const row = sectionHost.snapshot.rows.find(row => row.id === id)!;
      const parent = row.parent && visiblePlexSection(sectionHost.snapshot, {...sectionHost.snapshot, sectionId: row.parent});
      const sourceOccurrence = parent ? sectionOccurrences.get(parent.sectionId) : filtered.root ?? filtered.entry;
      const sourcePage = sourceOccurrence && pages.get(sourceOccurrence), targetPage = pages.get(targetOccurrence);
      return sourceOccurrence && sourcePage && targetPage ? [{id: `section-tree-${targetOccurrence}`, sourceOccurrence, targetOccurrence,
        sourcePath: sourcePage.path, targetPath: targetPage.path}] : [];
    });
    const viewports = new Map(layout.areas.flatMap(/** Overflow badges fit through the same declared viewport as their cards. */ area => area.viewport ? [[area.id, area.viewport] as const] : []));
    scene.badgeBounds = [...nodes].flatMap(/** Offscreen overflow cannot enlarge a fitted scene through a detached status chip. */ ([id, node]) => {
      if (!node.viewBadge) return [];
      const bounds = nodeBadgeBounds(node, node.viewBadge), viewport = node.areaId ? viewports.get(node.areaId) : undefined;
      if (!viewport) return [{occurrenceId: id, bounds}];
      const left = Math.max(bounds.x, viewport.x), top = Math.max(bounds.y - viewport.initialScrollTop, viewport.y);
      const right = Math.min(bounds.x + bounds.width, viewport.x + viewport.width), bottom = Math.min(bounds.y - viewport.initialScrollTop + bounds.height, viewport.y + viewport.height);
      return right > left && bottom > top ? [{occurrenceId: id, bounds: {x: left, y: top, width: right - left, height: bottom - top}}] : [];
    });
    if (boundEditors.size) scene.boundEditors = [...boundEditors.values()];
    const areaIds = new Set<string>();
    if (layout.areas.length > 64) throw new Error("Too many view areas");
    for (const area of layout.areas) {
      if (!area.id || ["__proto__", "constructor", "prototype"].includes(area.id) || areaIds.has(area.id) || !Object.values(area.bounds).every(Number.isFinite) || area.bounds.width <= 0 || area.bounds.height <= 0) throw new Error("Invalid view area");
      areaIds.add(area.id);
      if (area.shape && !validAreaShape(area.bounds, area.shape)) throw new Error("Invalid area shape");
      if (area.dropRole !== undefined && !["parent", "child", "left", "right"].includes(area.dropRole)) throw new Error("Invalid area drop role");
      if (area.dropTarget !== undefined && !validPlexDropMeaning(area.dropTarget)) throw new Error("Invalid area drop meaning");
      const drop = plexAreaDropMeaning(area);
      if (drop.kind === "property" && !propertyAssignments.some(target => target.id === drop.assignmentId)) throw new Error("Missing property assignment target");
      if (drop.kind === "relationship" && drop.origin !== undefined && !nodes.has(drop.origin)) throw new Error("Missing relationship area origin");
      if (area.dropOrigin !== undefined && (typeof area.dropOrigin !== "string" || !nodes.has(area.dropOrigin)
        || !filtered.occurrences.some(row => row.id === area.dropOrigin && row.nodeId))) throw new Error("Invalid area drop origin");
      if (area.viewport) {
        const {scrollable, edgeVisibility, ...geometry} = area.viewport;
        if (!Object.values(geometry).every(Number.isFinite) || area.viewport.width <= 0 || area.viewport.height <= 0
          || area.viewport.contentHeight < 0 || area.viewport.initialScrollTop < 0 || scrollable !== undefined && scrollable !== false
          || edgeVisibility !== undefined && edgeVisibility !== "visible-endpoints"
          || scrollable === false && (area.viewport.contentHeight > area.viewport.height || area.viewport.initialScrollTop !== 0)) throw new Error("Invalid area viewport");
      }
      for (const preference of [area.heightPreference, area.widthPreference]) if (preference && (!preference.key || preference.key.length > 128
        || ["__proto__", "constructor", "prototype"].includes(preference.key) || !Number.isFinite(preference.minimum) || !Number.isFinite(preference.maximum)
        || preference.minimum <= 0 || preference.maximum < preference.minimum || preference.maximum > 100_000
        || preference.value !== undefined && (!Number.isFinite(preference.value) || preference.value < preference.minimum || preference.value > preference.maximum)))
        throw new Error("Invalid area preference");
      if (area.widthResizeEdge !== undefined && (area.widthResizeEdge !== "left" && area.widthResizeEdge !== "right" || !area.widthPreference)) throw new Error("Invalid area width edge");
      if (area.reflow) {
        const {autoColumns, filterLayout, ...geometry} = area.reflow;
        if (!Object.values(geometry).every(Number.isFinite) || area.reflow.columns < 1 || !Number.isInteger(area.reflow.columns)
          || area.reflow.columns > 32 || area.reflow.columnGap < 0 || area.reflow.rowGap < 0 || autoColumns !== undefined && typeof autoColumns !== "boolean"
          || filterLayout !== undefined && filterLayout !== "keep")
          throw new Error("Invalid area reflow");
      }
      scene.zoneAreas[area.id] = {key: area.id, left: area.bounds.x, top: area.bounds.y, width: area.bounds.width, height: area.bounds.height, resizeEdge: area.resizeEdge ?? "bottom", ...(area.shape ? {shape: area.shape} : {})};
      if (area.viewport) scene.zoneViewports[area.id] = {key: area.id, left: area.viewport.x, top: area.viewport.y, ...area.viewport};
    }
    const decorationIds = new Set<string>();
    if ((layout.decorations?.length ?? 0) > 64) throw new Error("Too many view decorations");
    for (const mark of layout.decorations ?? []) {
      if (!mark.id || decorationIds.has(mark.id)) throw new Error("Invalid decoration identity");
      decorationIds.add(mark.id);
      if (mark.kind === "region") {
        if (mark.shape && !validAreaShape(mark.bounds, mark.shape)) throw new Error("Invalid decoration shape");
        if (mark.color !== undefined) boundedViewColors([mark.color]);
        if (!Object.values(mark.bounds).every(Number.isFinite) || mark.bounds.width <= 0 || mark.bounds.height <= 0
          || mark.labelKey.length > 128 || (mark.label?.length ?? 0) > 128 || mark.areaId && !areaIds.has(mark.areaId)
          || mark.description !== undefined && !validCanvasViewText(mark.description)) throw new Error("Invalid decoration region");
      } else if (mark.kind !== "guide" || mark.points.length < 2 || mark.points.length > 32
        || !mark.points.every(point => Number.isFinite(point.x) && Number.isFinite(point.y))
        || mark.directed !== undefined && typeof mark.directed !== "boolean"
        || mark.direction !== undefined && mark.direction !== "forward" && mark.direction !== "backward" && mark.direction !== "both"
        || mark.stroke !== undefined && mark.stroke !== "line" && mark.stroke !== "none"
        || mark.caption !== undefined && (!validCanvasViewText(mark.caption.label) || "literal" in mark.caption.label && mark.caption.label.literal.length > 80
          || !Object.values(mark.caption.bounds).every(Number.isFinite) || mark.caption.bounds.width <= 0 || mark.caption.bounds.width > 1000
          || mark.caption.bounds.height <= 0 || mark.caption.bounds.height > 200 || !Number.isFinite(mark.caption.fontSize) || mark.caption.fontSize < 1 || mark.caption.fontSize > 80)
        || mark.variant !== undefined && mark.variant !== "generating" && mark.variant !== "regulating") throw new Error("Invalid decoration guide");
    }
    if (sectionHost && !sectionHost.isCurrent()) throw new Error("Retired section revision");
    return {scene, projection: filtered, failure: false};
  } catch { return {scene: empty, projection: null, failure: true}; }
}
