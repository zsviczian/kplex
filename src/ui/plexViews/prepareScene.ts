/** Bind internal pure view policies to admitted host facts, shared measurement and existing presentation. No acquisition. */
import type {GraphIndex} from "../../index/GraphIndex";
import type {KplexSettings} from "../../settings";
import {graphNodeViewFromLegacy} from "../../adapters/obsidian/graphContracts";
import {nodeId, type NodeId, type GraphNodeView} from "../../core/graph/model";
import type {PlexViewDefinition, PlexViewRead, PlexProjection, PlexMeasurement, PlexOccurrence, PlexViewEdge} from "../../core/plex/views/contracts";
import {RelationType, type GraphPage, type PositionedNode, type PositionedEdge, type Role, type Neighbour} from "../../types";
import {resolveNodeStyle, resolveLinkStyle} from "../../index/style";
import {deferredNodeCounts, nodeSize} from "./measurement";
import {projectRelationGroups} from "./groupRelations";
import type {Translator} from "../../lang";
import type {HostPlexScene} from "./scene";
import {readViewConfiguration} from "../../core/plex/views/configuration";

type SceneRead = Pick<GraphIndex, "get" | "neighbours" | "sortNeighbours" | "titleFor" | "captureSemanticGateRead" | "isVisiblePage" | "explainRelationship">;
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
export function plexViewRead(source: SceneRead, current: () => boolean, maximum: number, attention?: string): PlexViewRead {
  const proof = source.captureSemanticGateRead(), nodes = new Map<NodeId, GraphNodeView>();
  let operations = 0;
  const budget = Math.min(16_384, Math.max(16, maximum * 16));
  const isCurrent = (): boolean => current() && proof.isCurrent();
  const node = (id: NodeId): GraphNodeView | null => {
    if (!isCurrent() || ++operations > budget) return null;
    const prior = nodes.get(id); if (prior) return prior;
    const page = source.get(id); if (!page || page.transient || id !== attention && !source.isVisiblePage(page)) return null;
    const value = graphNodeViewFromLegacy(page); nodes.set(id, value); return value;
  };
  return {coverage: "cached", isCurrent, node, corpus: {available: false, reason: "unsupported"},
    relations: (id, role) => {
      if (!node(id) || !isCurrent()) return {items: [], coverage: "unavailable", truncated: operations > budget};
      const page = source.get(id); if (!page) return {items: [], coverage: "unavailable", truncated: false};
      const rows = source.neighbours(page, role);
      const items = rows.slice(0, maximum).flatMap(row => {
        const value = node(nodeId(row.page.path));
        return value ? [{node: value, role: row.role, relationType: row.relationType, definition: row.typeDefinition, direction: row.linkDirection}] : [];
      });
      return {items, coverage: operations > budget ? "unavailable" : "cached", truncated: rows.length > maximum || operations > budget};
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

/** Validate finite, independently keyed output before native rendering or shared relationship actions see it. */
function validateProjection(projection: PlexProjection, maximum: number): void {
  if (projection.occurrences.length > maximum || projection.edges.length > maximum * 8) throw new Error("View projection exceeds its bound");
  const ids = new Map(projection.occurrences.map(row => [row.id, row]));
  if (ids.size !== projection.occurrences.length) throw new Error("Duplicate view occurrence");
  for (const occurrence of projection.occurrences) {
    if (!occurrence.id || occurrence.id.length > 4096 || occurrence.synthetic || occurrence.representation !== "thought"
      || occurrence.areaId && ["__proto__", "constructor", "prototype"].includes(occurrence.areaId)) throw new Error("Unsupported view occurrence");
  }
  if (!ids.has(projection.entry) || projection.editor && !ids.has(projection.editor) || projection.frame && !ids.has(projection.frame)) throw new Error("Invalid scene anchor");
  const edges = new Set<string>(), ports = new Set(["top", "bottom", "left", "right"]);
  for (const edge of projection.edges) {
    if (!edge.id || edges.has(edge.id) || !ids.has(edge.source) || !ids.has(edge.target)
      || !ports.has(edge.sourcePort) || !ports.has(edge.targetPort)) throw new Error("Invalid occurrence endpoint");
    edges.add(edge.id);
    if (edge.kind === "semantic" && (ids.get(edge.source)?.nodeId !== edge.sourceNode || ids.get(edge.target)?.nodeId !== edge.targetNode
      || edge.relation.node.id !== edge.targetNode)) throw new Error("Semantic edge does not match its canonical endpoints");
  }
}

/** Pure policy failure stays local. The shell can recover without replacing native document/editor owners. */
export function prepareViewScene(definition: PlexViewDefinition, read: PlexViewRead, source: Pick<GraphIndex, "get" | "titleFor">,
  attention: string, state: unknown, settings: KplexSettings, current: () => boolean,
  editorSize?: {width: number; height: number}, matches: (node: PositionedNode) => boolean = () => true,
  grouping?: {translate: Translator; unfolded: ReadonlySet<string>; areaHeights?: Readonly<Record<string, number>>}): PreparedViewScene {
  const empty: HostPlexScene = {nodes: [], edges: [], zoneViewports: {}, zoneAreas: {}};
  try {
    const maximum = Math.min(2048, Math.max(1, settings.maxItemCount * 8 + 1));
    const configuration = readViewConfiguration(definition, settings.canvasViewSettings === undefined ? {} : settings.canvasViewSettings);
    if (configuration.status !== "available") return {scene: empty, projection: null, failure: true};
    const projection = definition.project({attention: nodeId(attention), read, maximum: settings.maxItemCount, state, configuration});
    if (!projection || !current() || !read.isCurrent()) return {scene: empty, projection: null, failure: true};
    validateProjection(projection, maximum);
    if (editorSize && (!projection.editor || projection.occurrences.find(row => row.id === projection.editor)?.nodeId !== attention)) throw new Error("Missing attention editor anchor");
    if (projection.attention !== attention) throw new Error("View changed its admitted attention scope");
    const pages = new Map<string, GraphPage>(), measurements: PlexMeasurement[] = [];
    const nodes = new Map<string, PositionedNode>();
    for (const occurrence of projection.occurrences) {
      const page = occurrence.nodeId && read.node(occurrence.nodeId) ? source.get(occurrence.nodeId) : null; if (!page || page.transient) continue;
      pages.set(occurrence.id, page);
      const role = occurrence.role ?? (occurrence.nodeId === projection.attention ? "center" : "child"), relation = occurrence.relation ? {page, role: occurrence.relation.role,
        relationType: occurrence.relation.relationType, typeDefinition: occurrence.relation.definition, linkDirection: occurrence.relation.direction} : null;
      const style = resolveNodeStyle(page, relation, role, settings), label = source.titleFor(page);
      const size = occurrence.id === projection.editor && editorSize ? editorSize
        : nodeSize(`${style.prefix ?? ""}${label}`, style.fontSize ?? 18, settings, occurrence.nodeId === projection.attention,
          style.maxLabelLength, style.maxWidth, style.strokeWidth);
      const node: PositionedNode = {page, occurrenceId: occurrence.id, areaId: occurrence.areaId, representation: occurrence.representation,
        role, relationType: relation?.relationType, typeDefinition: relation?.typeDefinition, linkDirection: relation?.linkDirection, physicalPorts: occurrence.ports ?? {}, x: 0, y: 0, ...size, label, style, ...deferredNodeCounts()};
      if (!matches(node) && occurrence.id !== projection.editor) continue;
      nodes.set(occurrence.id, node); measurements.push({id: occurrence.id, ...size, expandedWidth: size.width, expandedReserve: 0, mini: null, envelope: null});
    }
    const admitted = new Set(nodes.keys());
    if (editorSize && (!projection.editor || !admitted.has(projection.editor))) throw new Error("Unavailable editor occurrence");
    let filtered: PlexProjection = {...projection, occurrences: projection.occurrences.filter(row => admitted.has(row.id)),
      edges: projection.edges.filter(edge => admitted.has(edge.source) && admitted.has(edge.target))};
    if (settings.groupRelations && grouping) {
      const partitions = new Map<string, PlexOccurrence[]>();
      for (const occurrence of filtered.occurrences) if (occurrence.groupingPartition && occurrence.id !== filtered.editor && occurrence.id !== filtered.entry) {
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
        for (const row of projectRelationGroups(rows, attention, partition, grouping.unfolded, grouping.translate)) {
          if (row.page.transient?.kind !== "group") continue;
          const ids = row.page.transient.groupMembers!.map(member => origins.get(member)!.id);
          const representative = origins.get(row.page.transient.groupMembers![0])!;
          const id = JSON.stringify(["group", row.page.transient.sectionId]);
          const occurrence: PlexOccurrence = {id, synthetic: {kind: "group", members: ids}, representation: "thought",
            areaId: representative.areaId, groupingPartition: representative.groupingPartition, role: representative.role};
          const style = resolveNodeStyle(row.page, row, row.role, settings);
          const size = nodeSize(row.page.name, style.fontSize ?? 18, settings, false, style.maxLabelLength, style.maxWidth, style.strokeWidth);
          const node: PositionedNode = {page: row.page, occurrenceId: id, areaId: occurrence.areaId, representation: "thought", role: row.role,
            x: 0, y: 0, ...size, label: row.page.name, style, physicalPorts: {}, ...deferredNodeCounts()};
          for (const member of ids) {aliases.set(member, id);grouped.delete(member);nodes.delete(member);}
          grouped.set(id, occurrence); nodes.set(id, node); pages.set(id, row.page);
          measurements.push({id, ...size, expandedWidth: size.width, expandedReserve: 0, mini: null, envelope: null});
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
    const layout = definition.layout(filtered, measurements, state, Boolean(editorSize), {areaHeights: grouping?.areaHeights ?? {}, configuration});
    if (!current() || !read.isCurrent()) return {scene: empty, projection: null, failure: true};
    for (const [id, node] of nodes) {
      const rect = layout.positions.get(id);
      if (!rect || !Object.values(rect).every(Number.isFinite) || rect.width <= 0 || rect.height <= 0) throw new Error("Invalid view geometry");
      Object.assign(node, rect);
    }
    const edges: PositionedEdge[] = filtered.edges.map(edge => {
      const semantic = edge.kind === "semantic", role: Role = semantic ? edge.relation.role : "child";
      const target = pages.get(edge.target)!;
      return {id: edge.id, kind: edge.kind, sourceOccurrence: edge.source, targetOccurrence: edge.target,
        sourcePath: semantic ? edge.sourceNode : pages.get(edge.source)!.path, targetPath: semantic ? edge.targetNode : target.path,
        sourcePort: edge.sourcePort, targetPort: edge.targetPort, role, relationType: semantic ? edge.relation.relationType : RelationType.INFERRED,
        typeDefinition: semantic ? edge.relation.definition : undefined, direction: semantic ? edge.relation.direction : null,
        style: semantic ? resolveLinkStyle({page: target, role, relationType: edge.relation.relationType,
          typeDefinition: edge.relation.definition, linkDirection: edge.relation.direction}, settings, pages.get(edge.source)) : settings.baseLinkStyle};
    });
    const scene: HostPlexScene = {nodes: [...nodes.values()], edges, zoneViewports: {}, zoneAreas: {}, projection: filtered, areas: layout.areas,
      entryOccurrence: filtered.entry, editorOccurrence: filtered.editor, frameOccurrence: filtered.frame};
    const areaIds = new Set<string>();
    if (layout.areas.length > 64) throw new Error("Too many view areas");
    for (const area of layout.areas) {
      if (!area.id || ["__proto__", "constructor", "prototype"].includes(area.id) || areaIds.has(area.id) || !Object.values(area.bounds).every(Number.isFinite) || area.bounds.width <= 0 || area.bounds.height <= 0) throw new Error("Invalid view area");
      areaIds.add(area.id);
      if (area.viewport && (!Object.values(area.viewport).every(Number.isFinite) || area.viewport.width <= 0 || area.viewport.height <= 0
        || area.viewport.contentHeight < 0 || area.viewport.initialScrollTop < 0)) throw new Error("Invalid area viewport");
      if (area.heightPreference && (!area.heightPreference.key || ["__proto__", "constructor", "prototype"].includes(area.heightPreference.key)
        || !Number.isFinite(area.heightPreference.minimum) || !Number.isFinite(area.heightPreference.maximum)
        || area.heightPreference.minimum <= 0 || area.heightPreference.maximum < area.heightPreference.minimum)) throw new Error("Invalid area preference");
      if (area.reflow && (!Object.values(area.reflow).every(Number.isFinite) || area.reflow.columns < 1 || !Number.isInteger(area.reflow.columns)
        || area.reflow.columns > 32 || area.reflow.columnGap < 0 || area.reflow.rowGap < 0)) throw new Error("Invalid area reflow");
      scene.zoneAreas[area.id] = {key: area.id, left: area.bounds.x, top: area.bounds.y, width: area.bounds.width, height: area.bounds.height, resizeEdge: area.resizeEdge ?? "bottom"};
      if (area.viewport) scene.zoneViewports[area.id] = {key: area.id, left: area.viewport.x, top: area.viewport.y, ...area.viewport};
    }
    return {scene, projection: filtered, failure: false};
  } catch { return {scene: empty, projection: null, failure: true}; }
}
