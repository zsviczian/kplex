import type {NodeId} from "../core/graph/model";
import {LinkDirection} from "../core/graph/relations";
import {connectorGatePoint, edgeGeometry} from "../core/plex/connectorGeometry";
import {gateDiameter, nodeLabelFontSize, nodeSize, siblingNodeSize} from "../core/plex/nodeGeometry";
import {classicNodePorts, classicViewDefinition} from "../core/plex/views/classic/definition";
import {siblingScale, type ClassicGeometryPreferences} from "../core/plex/views/classic/geometry";
import type {PhysicalPort} from "../core/plex/views/contracts";
import type {Publication} from "./publication";

const defaultGeometry: ClassicGeometryPreferences = {
  compactingFactor: 2, horizontalCompactingFactor: 2, compactView: false, minLinkLength: 18,
  parentColumns: 2, childColumns: 5, siblingRelativeSize: 85,
  parentMaxHeight: 300, childMaxHeight: 400, friendMaxHeight: 350, siblingMaxHeight: 250,
};
const defaultTypography = {baseFontSize: 12.4, wrapNodeLabels: false, propertyFontSize: 10};

/** Resolve the publication's presentation around the same projection and layout used in Obsidian. */
export function publicationScene(publication: Publication, attention: NodeId) {
  const {read} = publication;
  const appearance = publication.manifest?.appearance;
  const flipped = appearance?.flip ?? false;
  const preferences = {...defaultGeometry, ...appearance?.geometry, flipEastWest: flipped};
  const typography = {baseFontSize: appearance?.typography?.baseFontSize ?? defaultTypography.baseFontSize,
    wrapNodeLabels: appearance?.typography?.wrapNodeLabels ?? defaultTypography.wrapNodeLabels,
    propertyFontSize: appearance?.typography?.propertyFontSize ?? defaultTypography.propertyFontSize};
  const ports = classicNodePorts(flipped);
  const projection = classicViewDefinition.project({attention, read, maximum: appearance?.maximum ?? 100, state: null,
    configuration: {status: "available", values: {flipEastWest: flipped}}});
  if (!projection) throw new Error("Publication attention is unavailable");
  const measured = projection.occurrences.map(occurrence => {
    const node = occurrence.nodeId && read.node(occurrence.nodeId);
    if (!node) throw new Error("Publication occurrence is unavailable");
    const center = occurrence.id === projection.entry;
    const sibling = occurrence.role === "sibling";
    const scale = sibling ? siblingScale(preferences) : 1;
    const style = publication.published.get(node.id)?.style;
    const styleFont = style?.fontSize ?? (center ? 30 : sibling ? 15 : 20);
    const fontSize = nodeLabelFontSize(styleFont * scale, center, typography.baseFontSize);
    const base = nodeSize(node.name, styleFont, typography, center, node.maxLabelLength);
    const size = siblingNodeSize(base, scale, styleFont * scale, typography);
    return {occurrence, node, center, fontSize, style, gateSize: gateDiameter({gateRadius: 5 * scale}),
      measurement: {id: occurrence.id, ...size, expandedWidth: size.width, expandedReserve: 0, mini: null, envelope: null}};
  });
  const layout = classicViewDefinition.layout(projection, measured.map(row => row.measurement), preferences, false);
  const cards = measured.map(({occurrence, node, center, fontSize, gateSize, style}) => ({
    id: occurrence.id, node, center, fontSize, gateSize, style, role: occurrence.role ?? "center" as const,
    bounds: layout.positions.get(occurrence.id)!,
    gates: (Object.keys(ports) as PhysicalPort[]).map(side => {
      const role = ports[side]!;
      const peers = role === "left" ? "previous" : role === "right" ? "next" : null;
      const rows = read.relations(node.id, role).items;
      const count = peers ? new Set([...rows, ...read.relations(node.id, peers).items].map(row => row.node.id)).size : rows.length;
      return {side, count};
    }),
  }));
  const cardById = new Map(cards.map(card => [card.id, card]));
  const edges = projection.edges.map(edge => {
    const source = cardById.get(edge.source)!, target = cardById.get(edge.target)!;
    const route = edgeGeometry(connectorGatePoint(source.bounds, edge.sourcePort, source.gateSize),
      connectorGatePoint(target.bounds, edge.targetPort, target.gateSize), edge.sourcePort, edge.targetPort, "bezier");
    const direction = edge.kind === "semantic" ? edge.relation.direction : null;
    const label = edge.kind === "semantic" ? edge.relation.definition ?? null : null;
    const style = edge.kind === "semantic" ? publication.linkStyle(edge.sourceNode, edge.targetNode, edge.relation.role) : undefined;
    return {id: edge.id, source: edge.source, target: edge.target, route, label,
      stroke: style?.stroke, strokeWidth: style?.width,
      arrowStart: style?.arrowStart ?? (direction === LinkDirection.FROM || direction === LinkDirection.BOTH),
      arrowEnd: style?.arrowEnd ?? (direction === LinkDirection.TO || direction === LinkDirection.BOTH)};
  });
  return {cards, edges, wrap: typography.wrapNodeLabels, truncated: projection.truncated};
}
