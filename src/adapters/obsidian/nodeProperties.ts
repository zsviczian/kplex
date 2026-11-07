/** Bind display-only fields to the existing native-cache property reader. No Vault.read,
 * source acquisition or arbitrary property retention in semantic/index state. */
import type {App} from "obsidian";
import type {GraphPage} from "../../types";
import {graphNodeViewFromLegacy} from "./graphContracts";
import {createLegacyPropertyProvider} from "./predicateContracts";
import {nodePropertyLines, type NoteTypeProperties, type NodePropertyLine} from "../../core/plex/nodeProperties";

/** One preparation caches only selected text for its admitted pages, including repeated occurrences. */
export function nodePropertyReader(app: App, configuration: NoteTypeProperties | undefined): (page: GraphPage) => readonly NodePropertyLine[] {
  const cache = new WeakMap<GraphPage, readonly NodePropertyLine[]>();
  return page => {
    const previous = cache.get(page);if (previous) return previous;
    if (page.transient || !page.file || page.file.extension !== "md" || page.isFolder || page.isTag || page.url) return [];
    if (!page.noteType || !configuration || !Object.prototype.hasOwnProperty.call(configuration, page.noteType)) return [];
    const file = page.file, provider = createLegacyPropertyProvider(app, () => page.file === file, () => file);
    const node = graphNodeViewFromLegacy(page);
    const result = nodePropertyLines(page.noteType, configuration, field => {
      const read = provider.readNoteProperty?.(node, field);
      return read?.status === "available" && read.isCurrent?.() !== false ? read.value : undefined;
    });
    cache.set(page, result);return result;
  };
}
