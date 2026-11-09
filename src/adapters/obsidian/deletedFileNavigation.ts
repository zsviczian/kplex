import type {App} from "obsidian";
import type {GraphPage} from "../../types";

/** Follow one now-unresolved spelling after Obsidian replaces a deleted file's incoming targets.
 * This is navigation only: no evidence, source proof or graph identity is rewritten. An ambiguous
 * spelling, a replacement native file or surviving full-path references retain the current center. */
export function deletedFileNavigationTarget(app: Pick<App, "vault">, path: string,
  lookup: (path: string) => GraphPage | undefined): GraphPage | null {
  if (!path.endsWith(".md") || /^(?:folder:|tag:|https?:\/\/|obsidian:\/\/)/i.test(path) || app.vault.getFileByPath(path)) return null;
  const current = lookup(path);
  if (current?.file || current?.url || current?.isFolder || current?.isTag || current?.neighbours.size) return null;
  const candidates = new Set<GraphPage>();
  const stem = path.slice(0, -3);
  for (const candidate of new Set([stem.slice(stem.lastIndexOf("/") + 1), stem])) {
    const page = lookup(candidate);
    if (page && page.path !== path && !page.file && !page.isFolder && !page.isTag && !page.url && page.neighbours.size) candidates.add(page);
  }
  return candidates.size === 1 ? [...candidates][0] ?? null : null;
}
