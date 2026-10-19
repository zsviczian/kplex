/** Shared explicit-copy projection from captured node references; never reads note contents or acquires sources. */
import type {NodeRef} from "../core/plex/actions";
import type {GraphPage} from "../types";
import {tagDisplayName} from "../core/graph/presentation";
import {graphFolderPath} from "../adapters/obsidian/graphFolder";

/** Reuse semantic tag/folder coordinates; current metadata can supply a URL or source-section location. */
export function nodeMarkdownLink(node: NodeRef, current?: Pick<GraphPage, "url" | "transient"> | null): string {
  if (node.kind === "tag") return `#${tagDisplayName(node.path, true).replace(/^#/, "")}`;
  if (node.kind === "url") {
    const url = (current?.url ?? node.path).replace(/\r/g, "%0D").replace(/\n/g, "%0A");
    const label = url.replace(/\\/g, "\\\\").replace(/\[/g, "\\[").replace(/\]/g, "\\]");
    return `[${label}](<${url.replace(/</g, "%3C").replace(/>/g, "%3E")}>)`;
  }
  const path = node.kind === "folder" ? graphFolderPath({isFolder: true, path: node.path}) ?? node.path
    : current?.transient ? `${current.transient.actualPath ?? current.transient.sourcePath}${current.transient.subpath ?? ""}` : node.path;
  return `[[${path.replace(/\r?\n|\r/g, " ")}]]`;
}
