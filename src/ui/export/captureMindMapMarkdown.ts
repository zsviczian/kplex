/**
 * Detach one already-committed Mind Map scene for the reusable Markdown formatter.
 * Scene/filter owners supply admitted occurrence IDs and unscrolled geometry; native
 * link formatting uses cached file metadata only. No graph or note-body reader is accepted.
 */
import type {App} from "obsidian";
import type {MindMapMarkdownSnapshot} from "../../core/plex/export/mindMapMarkdown";
import type {HostPlexScene} from "../plexViews/scene";
import {edgeOccurrence, occurrenceKey} from "../plexViews/scene";
import type {PositionedNode} from "../../types";

/** Escape display text without allowing Builder's inline ontology/metadata parser to consume it. */
function labelText(value: string): string {
  return value.replace(/[\r\n\t]+/g, " ")
    .replace(/\[/g, "&#91;").replace(/\]/g, "&#93;").replace(/\|/g, "&#124;").replace(/::/g, "&#58;&#58;");
}

/** Preserve explicit links for real/placeholder notes; structural or unsupported targets remain honest text. */
function exportNodeText(app: App, node: PositionedNode): {text: string; unresolved: boolean; adjusted: boolean} {
  const page = node.page, label = labelText(node.label), adjusted = label !== node.label;
  if (page.file && app.vault.getFileByPath(page.file.path) === page.file) {
    const target = app.metadataCache.fileToLinktext(page.file, "", false);
    // Builder interprets :: anywhere as ontology. Such target paths cannot round-trip as links.
    if (!/[\r\n|[\]]|::/.test(target)) return {text: `[[${target}|${label}]]`, unresolved: false, adjusted};
  } else if (!page.file && !page.isFolder && !page.isTag && !page.url && !page.transient
    && !/[\r\n|[\]]|::/.test(page.path)) return {text: `[[${page.path}|${label}]]`, unresolved: true, adjusted};
  if (page.url && !/[\r\n<>]|::/.test(page.url)) return {text: `[${label}](<${page.url}>)`, unresolved: false, adjusted};
  return {text: label, unresolved: !page.isTag, adjusted};
}

/** Capture displayed rows including overflow, excluding only actual filters and unsupported outlines. */
export function captureMindMapMarkdown(app: App, scene: HostPlexScene, included: ReadonlySet<string>,
  position: (node: PositionedNode) => {x: number; y: number} = /** Original world coordinates are already independent of the camera. */ node => node): MindMapMarkdownSnapshot {
  const root = scene.projection?.root;
  if (!root || scene.failed) throw new Error("Mind Map scene unavailable");
  const rows = scene.nodes.filter(node => included.has(occurrenceKey(node)));
  const nodes = rows.filter(node => node.branch).map(/** Copy only finite presentation values; native objects cannot escape into the formatter. */ node => ({
    id: occurrenceKey(node), parent: node.branch!.parent, identity: node.page.transient ? undefined : node.page.path,
    ...exportNodeText(app, node), label: node.label, ...position(node), side: node.branch!.side,
    reference: node.branch!.reference, expanded: node.branch!.expanded, canExpand: node.branch!.canExpand,
    partial: node.branch!.status !== "ready", annotation: node.typeDefinition,
  }));
  const byId = new Map(nodes.map(/** Exact occurrence IDs keep repeated notes independent. */ node => [node.id, node]));
  const links = scene.edges.flatMap(/** Decorative/derived edges never become invented hierarchy or semantic crosslinks. */ edge => {
    const source = edgeOccurrence(edge, "source"), target = edgeOccurrence(edge, "target");
    if (edge.kind && edge.kind !== "semantic" || !byId.has(source) || !byId.has(target) || byId.get(target)?.parent === source) return [];
    return [{source, target, label: edge.typeDefinition}];
  });
  return {root, nodes, links, omitted: rows.length - nodes.length,
    limited: scene.projection?.truncated === true || scene.crossLinksLimited === true};
}
