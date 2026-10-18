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

type NativeDraggable = { type: string; title: string; icon: string; source?: unknown };
type DragManagerBridge = {
  draggable?: { source?: unknown } | null;
  dragLink?: (event: DragEvent, linktext: string, sourcePath: string, title?: string, source?: unknown) => NativeDraggable;
  onDragStart?: (event: DragEvent, draggable: NativeDraggable) => void;
  onDragEnd?: () => void;
};

// Tags have no verified native DragManager type. Keep only their current gesture identity here;
// plain HTML text travels through CodeMirror's ordinary external-text drop path.
const plainTagDrags = new WeakMap<App, NodeLinkDragSource>();

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
 * internal heading link. Missing native link capabilities refuse file/URL/placeholder gestures;
 * tags use standard HTML text and the same bounded captured identity for Plex consumers.
 * @returns The exact source token to retire on drag end, or null when no drag was accepted.
 */
export function startNodeLinkDrag(app: App, page: GraphPage, event: DragEvent, owner: object, role: Role | "center", title: string, sourcePath: string): NodeLinkDragSource | null {
  const manager = dragManager(app);
  if (!event.dataTransfer || !canDragNodeLink(page) || manager?.draggable || plainTagDrags.has(app)) return null;
  if (page.file && app.vault.getFileByPath(page.file.path) !== page.file) return null;
  const source: NodeLinkDragSource = { kind: "kplex-node-link", owner, node: actionNodeRef(page), role };
  try {
    if (page.isTag) {
      event.dataTransfer.setData("text/plain", `#${tagDisplayName(page.path, true).replace(/^#/, "")}`);
      event.dataTransfer.effectAllowed = "copyLink";
      plainTagDrags.set(app, source);
      return source;
    }
    if (!manager?.onDragStart || !manager.dragLink) return null;
    const draggable = manager.dragLink(event, page.url ?? page.file?.path ?? page.path, sourcePath, title, source);
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
  const manager = dragManager(app), tag = plainTagDrags.get(app);
  if (tag && !manager?.draggable) return tag;
  if (tag) plainTagDrags.delete(app); // Another native drag cannot inherit stale tag authority.
  const source = manager?.draggable?.source;
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
export function draggedGraphPage(app: App, read: { get(path: string): GraphPage | undefined }, event?: Pick<DragEvent, "dataTransfer">): GraphPage | null {
  const source = nodeLinkDragSource(app);
  if (source) {
    const page = resolveActionPage(read, source.node);
    return page && (!page.file || app.vault.getFileByPath(page.file.path) === page.file) ? page : null;
  }
  const file = getDraggedFile(app);
  if (file) return read.get(file.path) ?? null;
  const native = dragManager(app)?.draggable;
  // An actual resolved file wins above: its #heading is not a tag. Accept only an unambiguous
  // single tag from the known native link shape or ordinary text when no native drag owns it.
  const link = native && "type" in native && native.type === "link" && "linktext" in native && typeof native.linktext === "string"
    && "sourcePath" in native && typeof native.sourcePath === "string" && !("file" in native && native.file) ? native.linktext : null;
  const text = link ?? (!native ? event?.dataTransfer?.getData("text/plain") : null);
  if (!text || !/^#[^\s#[\]|]+$/u.test(text)) return null;
  const page = read.get(`tag:${text.slice(1)}`);
  return page?.isTag && !page.transient ? page : null;
}

/** Retire only the exact accepted source; native global dragend may already have cleaned it up. */
export function finishNodeLinkDrag(app: App, source: NodeLinkDragSource | null): void {
  if (source && plainTagDrags.get(app) === source) plainTagDrags.delete(app);
  const manager = dragManager(app);
  if (source && manager?.draggable?.source === source) manager.onDragEnd?.();
}
