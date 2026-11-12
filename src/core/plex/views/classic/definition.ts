/** Built-in Classic topology/geometry policy. Legacy host adapters bind styles and synthetic sections separately. */
import type {Role} from "../../../graph/relations";
import type {PlexViewDefinition, PlexOccurrence, PlexViewEdge, PlexArea} from "../contracts";
import {CLASSIC_NEIGHBOR_ROLES, projectClassicNeighborhood} from "./projection";
import {layoutClassic, siblingScale, type ClassicGeometryPreferences} from "./geometry";
import {classicConfigurationSchema, classicFlipped} from "./configuration";

/** All four gates use the same explicit physical interpretation as counts, hit testing and drags. */
export function classicNodePorts(flipped: boolean): NonNullable<PlexOccurrence["ports"]> {
  return {top: "parent", bottom: "child", left: flipped ? "right" : "left", right: flipped ? "left" : "right"};
}

/** Physical connector placement is a Classic policy, independent of the shared edge renderer. */
export function classicPorts(role: Role, flipped = false): {source: "top" | "bottom" | "left" | "right"; target: "top" | "bottom" | "left" | "right"} {
  if (role === "parent") return {source: "top", target: "bottom"};
  if (role === "child") return {source: "bottom", target: "top"};
  if ((role === "left" || role === "previous") !== flipped) return {source: "left", target: "right"};
  return {source: "right", target: "left"};
}

const CLASSIC_LABELS = {parent: "graph.zoneParents", child: "graph.zoneChildren", left: "graph.zoneFriendsPrevious", right: "graph.zoneChallengersNext", sibling: "graph.zoneSiblings"};
/** A Classic physical area may declare a direct edit intent; sibling areas never imply a write. */
export function classicAreaDropRole(area: string): "parent" | "child" | "left" | "right" | null {
  return area === "parent" || area === "child" || area === "left" || area === "right" ? area : null;
}
export const CLASSIC_AREAS = ["parent", "child", "left", "right", "sibling"] as const;
export const CLASSIC_HEIGHTS = {
  parent: {key: "parentMaxHeight", min: 140, max: 800}, child: {key: "childMaxHeight", min: 160, max: 900},
  left: {key: "friendMaxHeight", min: 140, max: 800}, right: {key: "friendMaxHeight", min: 140, max: 800},
  sibling: {key: "siblingMaxHeight", min: 120, max: 700},
} as const;

/** Validate the finite internal layout input at the unknown preference boundary. No settings object crosses it. */
function geometryPreferences(value: unknown): value is ClassicGeometryPreferences {
  if (!value || typeof value !== "object") return false;
  const numbers = ["compactingFactor", "minLinkLength", "parentColumns", "childColumns", "siblingRelativeSize", "parentMaxHeight", "childMaxHeight", "friendMaxHeight", "siblingMaxHeight"];
  if (!numbers.every(key => {const field: unknown = Reflect.get(value, key);return typeof field === "number" && Number.isFinite(field);})) return false;
  const horizontal: unknown = Reflect.get(value, "horizontalCompactingFactor"), arrangement: unknown = Reflect.get(value, "lateralArrangement");
  return typeof Reflect.get(value, "compactView") === "boolean" && (horizontal === undefined || typeof horizontal === "number" && Number.isFinite(horizontal))
    && (arrangement === undefined || arrangement === "left" || arrangement === "split");
}

/** Existing legacy surface/device preferences remain authoritative; this contract creates no settings migration. */
export const classicViewDefinition: PlexViewDefinition = {
  sectionSource: "attention", editorHosting: "occurrence",
  id: "classic", version: 1, labelKey: "view.classic", icon: "brain-circuit", configuration: classicConfigurationSchema,
  capabilities: {sections: true, descendants: true, editor: true, compact: false}, defaultState: null,
  restoreState: /** Classic has no additional persisted preference payload in this extraction. */ () => null,
  /** Project admitted incidence with the same capped Classic policy used by legacy GraphIndex callers. */
  project(input) {
    const center = input.read.node(input.attention); if (!center || !input.read.isCurrent()) return null;
    let truncated = false;
    const incidence = new Map<string, ReturnType<typeof input.read.relations>>();
    const relation = (page: typeof center, role: Parameters<typeof input.read.relations>[1]) => {
      const key = JSON.stringify([page.id, role]);
      const result = incidence.get(key) ?? input.read.relations(page.id, role); incidence.set(key, result); truncated ||= result.truncated || result.coverage === "unavailable";
      return result.items.map(value => ({page: value.node, role: value.role, relationType: value.relationType, value}));
    };
    const n = projectClassicNeighborhood(center, {identity: node => node.id, neighbours: relation,
      sort: rows => rows.sort((a, b) => input.read.compare(a.page, b.page))}, input.maximum,
      !input.state || typeof input.state !== "object" || Reflect.get(input.state, "renderSiblings") !== false);
    const flipped = classicFlipped(input.configuration);
    const occurrences: PlexOccurrence[] = [{id: "attention", nodeId: center.id, representation: "thought", ...(flipped ? {ports: classicNodePorts(true)} : {})}];
    const edges: PlexViewEdge[] = [];
    const add = (rows: typeof n.parents, area: typeof CLASSIC_AREAS[number]) => rows.forEach((row, position) => {
      const id = JSON.stringify([area, row.page.id, position]), ports = classicPorts(area, classicFlipped(input.configuration));
      occurrences.push({id, nodeId: row.page.id, role: area, areaId: area, representation: "thought", relation: row.value, groupingPartition: area, ...(flipped ? {ports: classicNodePorts(true)} : {})});
      if (area !== "sibling") edges.push({id, kind: "semantic", source: "attention", target: id,
        sourceNode: center.id, targetNode: row.page.id, sourcePort: ports.source, targetPort: ports.target, relation: row.value});
    });
    add(n.parents, "parent"); add(n.children, "child"); add(n.leftFriends, "left"); add(n.rightFriends, "right"); add(n.siblings, "sibling");
    for (const parent of occurrences.filter(row => row.role && row.role !== "sibling")) {
      if (!parent.nodeId) continue;
      const parentNode = input.read.node(parent.nodeId); if (!parentNode) continue;
      const children = CLASSIC_NEIGHBOR_ROLES.flatMap(role => relation(parentNode, role));
      for (const sibling of occurrences.filter(row => row.role === "sibling")) {
        const witness = children.find(row => row.page.id === sibling.nodeId);
        const ports = witness ? classicPorts(witness.role, flipped) : null;
        if (witness && ports) edges.push({id: JSON.stringify([parent.id, sibling.id]), kind: "semantic", source: parent.id, target: sibling.id,
          sourceNode: parent.nodeId, targetNode: witness.page.id, sourcePort: ports.source, targetPort: ports.target, relation: witness.value});
      }
    }
    return {attention: center.id, layoutRoot: center.id, entry: "attention", editor: "attention", frame: "attention",
      occurrences, edges, truncated: truncated || [n.parents, n.children, n.leftFriends, n.rightFriends, n.siblings].some(rows => rows.length === input.maximum), coverage: input.read.coverage};
  },
  /** Arrange already measured occurrences; no count, source, host or asynchronous work is available here. */
  layout(projection, measurements, preferences, editor, context) {
    if (!geometryPreferences(preferences)) throw new Error("Missing Classic geometry preferences");
    // The internal host supplies the finite typed legacy geometry projection, never plugin settings.
    const settings = {...preferences, flipEastWest: preferences.flipEastWest ?? classicFlipped(context?.configuration)};
    const measured = new Map(measurements.map(row => [row.id, row]));
    const nodes = projection.occurrences.map(occurrence => {
      const size = measured.get(occurrence.id); if (!size) throw new Error("Missing occurrence measurement");
      return {...size, x: 0, y: 0, role: occurrence.role ?? "center" as const, areaId: occurrence.areaId};
    });
    const center = nodes.find(row => row.id === projection.entry); if (!center) throw new Error("Missing Classic attention occurrence");
    const area = (id: string) => nodes.filter(row => row.areaId === id);
    const geometry = layoutClassic({center, parents: area("parent"), children: area("child"), leftFriends: area("left"), rightFriends: area("right"), siblings: area("sibling")}, settings,
      {reserve: node => node.expandedReserve, verticalReserve: node => node.expandedReserve * (node.role === "sibling" ? siblingScale(settings) : 1),
        width: node => node.expandedWidth, mini: (node, envelope) => node[envelope ? "envelope" : "mini"]}, editor);
    const areas: PlexArea[] = Object.values(geometry.zoneAreas).map(bounds => {
      const policy = CLASSIC_HEIGHTS[bounds.key];
      return {id: bounds.key, labelKey: CLASSIC_LABELS[bounds.key], bounds: {x: bounds.left, y: bounds.top, width: bounds.width, height: bounds.height},
        resizeEdge: bounds.resizeEdge, heightPreference: {key: policy.key, minimum: policy.min, maximum: policy.max},
        ...(bounds.key === "sibling" ? {} : {dropRole: bounds.key}),
        ...(geometry.zoneViewports[bounds.key] ? {viewport: {...geometry.zoneViewports[bounds.key]!, x: geometry.zoneViewports[bounds.key]!.left, y: geometry.zoneViewports[bounds.key]!.top}} : {})};
    });
    return {positions: new Map(geometry.nodes.map(row => [row.id, {x: row.x, y: row.y, width: row.width, height: row.height}])), areas};
  },
};
