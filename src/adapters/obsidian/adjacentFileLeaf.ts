/** Native split placement preserves the originating Plex/Sidecar pair independently of the active tab. */
import type { Workspace, WorkspaceLeaf } from "obsidian";

/**
 * Split beyond the pair's outer edge on its existing axis. Right/below companions
 * are the anchor; left/above companions leave the Plex as the outer anchor.
 * With no companion, create an ordinary pane to the right of the originating Plex.
 */
export function createAdjacentFileLeaf(
  workspace: Pick<Workspace, "createLeafBySplit">,
  host: WorkspaceLeaf,
  sidecar: WorkspaceLeaf | null,
  position: "left" | "right" | "above" | "below" | null,
): WorkspaceLeaf {
  const anchor = sidecar && (position === "right" || position === "below") ? sidecar : host;
  const direction = sidecar && (position === "above" || position === "below") ? "horizontal" : "vertical";
  return workspace.createLeafBySplit(anchor, direction, false);
}
