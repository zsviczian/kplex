/**
 * Bounded graph-reference mapping at the Obsidian action boundary. References contain plain exact
 * identities and presentation facets; resolving one reference never scans or hydrates the graph.
 * Captured references carry a host-only opaque incarnation; no path-to-file identity index is retained.
 */
import type { NodeRef } from "../../core/plex/actions";
import type { GraphPage } from "../../types";

const fileIdentities = new WeakMap<object, string>();
let identitySequence = 0;

/** Give a live native file an opaque, nonpersistent identity without retaining the file itself. */
function fileIdentity(file: object): string {
  let identity = fileIdentities.get(file);
  if (!identity) { identity = `file-${++identitySequence}`; fileIdentities.set(file, identity); }
  return identity;
}

/** Describe one current page without interpreting an opaque identity as a physical file path. */
export function actionNodeRef(page: GraphPage): NodeRef {
  return {
    identity: page.path,
    path: page.path,
    ...(page.file ? { fileIdentity: fileIdentity(page.file) } : {}),
    kind: page.isFolder ? "folder" : page.isTag ? "tag" : page.transient?.kind === "section" ? "section"
      : page.url ? "url" : page.file ? "file" : "ghost",
  };
}

/** Reacquire only the requested identity; a changed kind is unavailable rather than retargeted. */
export function resolveActionPage(read: { get(identity: string): GraphPage | undefined }, node: NodeRef): GraphPage | null {
  const page = read.get(node.identity);
  if (!page) return null;
  const current = actionNodeRef(page);
  return current.kind === node.kind && (node.fileIdentity === undefined || node.fileIdentity === current.fileIdentity) ? page : null;
}
