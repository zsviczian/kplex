/**
 * Detach one already-committed Mind Map scene for the reusable Markdown formatter.
 * Scene/filter owners supply admitted occurrence IDs and unscrolled geometry; native
 * link formatting uses cached file metadata only. No graph or note-body reader is accepted.
 */
import type {App} from "obsidian";
import type {MindMapMarkdownSnapshot, MarkdownOntology} from "../../core/plex/export/mindMapMarkdown";
import type {HostPlexScene} from "../plexViews/scene";
import {edgeOccurrence, occurrenceKey} from "../plexViews/scene";
import {markdownTreeParents} from "../../core/plex/export/markdownTree";
import type {PositionedNode, PositionedEdge} from "../../types";

/** Escape display text without allowing Builder's inline ontology/metadata parser to consume it. */
function labelText(value: string): string {
  return value.replace(/[\r\n\t]+/g, " ")
    .replace(/\[/g, "&#91;").replace(/\]/g, "&#93;").replace(/\|/g, "&#124;").replace(/::/g, "&#58;&#58;");
}

/** Preserve explicit links for real/placeholder notes; structural or unsupported targets remain honest text. */
function exportNodeText(app: App, node: PositionedNode): {text: string; unresolved: boolean; adjusted: boolean} {
  const page = node.page, label = labelText(node.label), adjusted = label !== node.label;
  if (page.file && app.vault.getFileByPath(page.file.path) === page.file) {
    const target = app.metadataCache.fileToLinktext(page.file, "", false) + (page.transient?.subpath ?? "");
    // Builder interprets :: anywhere as ontology. Such target paths cannot round-trip as links.
    if (!/[\r\n|[\]]|::/.test(target)) return {text: `[[${target}|${label}]]`, unresolved: false, adjusted};
  } else if (!page.file && !page.isFolder && !page.isTag && !page.url && !page.transient
    && !/[\r\n|[\]]|::/.test(page.path)) return {text: `[[${page.path}|${label}]]`, unresolved: true, adjusted};
  if (page.url && !/[\r\n<>]|::/.test(page.url)) return {text: `[${label}](<${page.url}>)`, unresolved: false, adjusted};
  return {text: label, unresolved: !page.isTag && !page.isFolder && !page.transient, adjusted};
}

export type MarkdownCaptureOptions = Readonly<{
  edges?: readonly PositionedEdge[];
  ontology?: (source: PositionedNode, target: PositionedNode, edge: PositionedEdge | undefined) => MarkdownOntology;
}>;

/** Capture any committed canvas as a rooted outline, retaining explicit hierarchy when supplied.
 * Only constructed/admitted occurrences and already-published labels are accepted. Off-camera
 * rows and native section outlines remain content; decorative point anchors do not. */
export function captureMindMapMarkdown(app: App, scene: HostPlexScene, included: ReadonlySet<string>,
  position: (node: PositionedNode) => {x: number; y: number} = /** World coordinates are independent of the camera. */ node => node,
  options: MarkdownCaptureOptions = {}): MindMapMarkdownSnapshot {
  const rows = scene.nodes.filter(node => node.representation !== "point" && included.has(occurrenceKey(node)));
  const preferredRoot = scene.projection?.root ?? scene.nodes.find(node => node.role === "center")?.occurrenceId
    ?? scene.nodes.find(node => node.role === "center")?.page.path ?? scene.entryOccurrence ?? (rows[0] ? occurrenceKey(rows[0]) : undefined);
  const root = rows.some(node => occurrenceKey(node) === preferredRoot) ? preferredRoot : rows[0] ? occurrenceKey(rows[0]) : undefined;
  if (!root || scene.failed) throw new Error("Canvas scene unavailable");
  const byRow = new Map(rows.map(node => [occurrenceKey(node), node]));
  const edges = options.edges ?? scene.edges;
  const outlineEdges = [...scene.sectionTreeEdges ?? [], ...scene.edges.filter(edge => !edge.isCrossLink && edge.kind !== "decorative")]
    .map(edge => ({source: edgeOccurrence(edge, "source"), target: edgeOccurrence(edge, "target")}));
  const sectionParents = new Map((scene.sectionTreeEdges ?? []).map(edge => [edgeOccurrence(edge, "target"), edgeOccurrence(edge, "source")]));
  const parents = markdownTreeParents(root, rows.map(node => ({id: occurrenceKey(node), parent: node.branch?.parent ?? sectionParents.get(occurrenceKey(node))})), outlineEdges);
  const byPair = new Map<string, PositionedEdge[]>();
  for (const edge of edges) if (!edge.kind || edge.kind === "semantic") {
    const key = JSON.stringify([edgeOccurrence(edge, "source"), edgeOccurrence(edge, "target")]), list = byPair.get(key) ?? [];
    list.push(edge);byPair.set(key, list);
  }
  /** Exact occurrence pairs retain independent labels even when canonical notes repeat. */
  const labels = (source: PositionedNode, target: PositionedNode, edge?: PositionedEdge): MarkdownOntology => options.ontology?.(source, target, edge)
    ?? {primary: edge ? edge.typeDefinition : target.typeDefinition, additional: [], visiblePrimary: edge?.style.showLabel ? edge.caption ?? edge.typeDefinition : undefined, visibleAdditional: []};
  const treeEdges = new Set<PositionedEdge>();
  const nodes = rows.map(node => {
    const id = occurrenceKey(node), parent = parents.get(id), source = parent ? byRow.get(parent) : undefined;
    const candidates = parent ? byPair.get(JSON.stringify([parent, id])) ?? byPair.get(JSON.stringify([id, parent])) : undefined;
    const edge = candidates?.find(candidate => candidate.typeDefinition === node.typeDefinition) ?? candidates?.[0];
    if (edge) treeEdges.add(edge);
    return {id, parent, identity: node.page.transient ? undefined : node.page.path, ...exportNodeText(app, node), label: node.label, ...position(node),
      side: node.branch?.side ?? 1 as const, reference: node.branch?.reference ?? false, expanded: node.branch?.expanded ?? true,
      canExpand: node.branch?.canExpand ?? false, partial: node.branch ? node.branch.status !== "ready" : false,
      annotation: node.typeDefinition, ontology: source ? labels(source, node, edge) : undefined};
  });
  const links = edges.flatMap(edge => {
    const source = edgeOccurrence(edge, "source"), target = edgeOccurrence(edge, "target"), from = byRow.get(source), to = byRow.get(target);
    if (edge.kind && edge.kind !== "semantic" || !from || !to || (parents.get(target) === source || parents.get(source) === target) && (options.ontology || treeEdges.has(edge))) return [];
    return [{source, target, label: edge.typeDefinition, ontology: labels(from, to, edge)}];
  });
  return {root, nodes, links, omitted: scene.nodes.filter(node => included.has(occurrenceKey(node))).length - rows.length,
    limited: scene.projection?.truncated === true || scene.crossLinksLimited === true};
}
