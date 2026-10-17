/**
 * Native Obsidian link-drag boundary for Plex nodes. Desktop HTML drag events use the same
 * guarded DragManager.dragLink/onDragStart pair as native links; touch/gate gestures remain
 * caller-owned. Only one captured node reference and a view-owner token live for the gesture.
 * Reading a drop resolves that exact existing node, with no enumeration, acquisition or writes.
 */
import type { App } from "obsidian";
import type { NodeRef } from "../../core/plex/actions";
import { tagDisplayName } from "../../core/graph/presentation";
import type { GraphPage, Role } from "../../types";
import { actionNodeRef, resolveActionPage } from "./actionNode";
import { getDraggedFile } from "./fileExplorerDrag";

/** Native, transient source metadata; owner identity distinguishes an internal move from a copy. */
export type NodeLinkDragSource = Readonly<{
  kind: "kplex-node-link";
  owner: object;
  node: NodeRef;
  role: Role | "center";
}>;

type NativeDraggable = { type: string; title: string; icon: string; source?: unknown; text?: string };
type DragManagerBridge = {
  draggable?: { source?: unknown } | null;
  dragLink?: (event: DragEvent, linktext: string, sourcePath: string, title?: string, source?: unknown) => NativeDraggable;
  onDragStart?: (event: DragEvent, draggable: NativeDraggable) => void;
  onDragEnd?: () => void;
};

/** Feature-detect the reviewed unpublished API at one host boundary. */
function dragManager(app: App): DragManagerBridge | undefined {
  return (app as App & { dragManager?: DragManagerBridge }).dragManager;
}

/** Only persistent file, unresolved-link, URL and tag nodes have a meaningful outbound link. */
export function canDragNodeLink(page: GraphPage): boolean {
  return !page.transient && !page.isFolder;
}

/**
 * Start an actual native drag synchronously during HTML dragstart. Never manufacture a DragEvent
 * or claim another drag's manager state. Tags travel as ordinary tag text, rather than a fictitious
 * internal heading link. Missing host capabilities safely refuse the gesture.
 * @returns The exact source token to retire on drag end, or null when no drag was accepted.
 */
export function startNodeLinkDrag(app: App, page: GraphPage, event: DragEvent, owner: object, role: Role | "center", title: string, sourcePath: string): NodeLinkDragSource | null {
  const manager = dragManager(app);
  if (!event.dataTransfer || !canDragNodeLink(page) || !manager?.onDragStart || !manager.dragLink || manager.draggable) return null;
  if (page.file && app.vault.getFileByPath(page.file.path) !== page.file) return null;
  const source: NodeLinkDragSource = { kind: "kplex-node-link", owner, node: actionNodeRef(page), role };
  try {
    const tag = page.isTag ? `#${tagDisplayName(page.path, true).replace(/^#/, "")}` : null;
    const draggable = page.isTag
      ? { type: "text", title: tag ?? title, icon: "lucide-tag", text: tag ?? title, source }
      : manager.dragLink(event, page.url ?? page.file?.path ?? page.path, sourcePath, title, source);
    if (page.isTag) event.dataTransfer.setData("text/plain", draggable.text ?? draggable.title);
    manager.onDragStart(event, draggable);
    return nodeLinkDragSource(app) === source ? source : null;
  } catch {
    // A compatibility failure cannot erase a newer drag or propagate through React's event loop.
    finishNodeLinkDrag(app, source);
    return null;
  }
}

/** Read only this adapter's finite source shape from the host's currently active drag. */
export function nodeLinkDragSource(app: App): NodeLinkDragSource | null {
  const source = dragManager(app)?.draggable?.source;
  if (!source || typeof source !== "object" || !("kind" in source) || source.kind !== "kplex-node-link"
    || !("owner" in source) || !source.owner || typeof source.owner !== "object"
    || !("node" in source) || !source.node || typeof source.node !== "object"
    || !("role" in source) || typeof source.role !== "string") return null;
  const node = source.node as Partial<NodeRef>;
  if (typeof node.identity !== "string" || typeof node.path !== "string"
    || !["file", "url", "ghost", "tag"].includes(node.kind ?? "")) return null;
  return source as NodeLinkDragSource;
}

/** Resolve current native file drags or this plugin's captured URL/tag/placeholder without scans. */
export function draggedGraphPage(app: App, read: { get(path: string): GraphPage | undefined }): GraphPage | null {
  const source = nodeLinkDragSource(app);
  if (source) {
    const page = resolveActionPage(read, source.node);
    return page && (!page.file || app.vault.getFileByPath(page.file.path) === page.file) ? page : null;
  }
  const file = getDraggedFile(app);
  return file ? read.get(file.path) ?? null : null;
}

/** Retire only the exact accepted source; native global dragend may already have cleaned it up. */
export function finishNodeLinkDrag(app: App, source: NodeLinkDragSource | null): void {
  const manager = dragManager(app);
  if (source && manager?.draggable?.source === source) manager.onDragEnd?.();
}
