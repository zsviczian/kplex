/** Bind display-only fields to the existing native-cache property reader. No Vault.read,
 * source acquisition or arbitrary property retention in semantic/index state. */
import type {App} from "obsidian";
import type {GraphPage} from "../../types";
import {graphNodeViewFromLegacy} from "./graphContracts";
import {createLegacyPropertyProvider} from "./predicateContracts";
import {normalizeFieldName} from "../../core/contracts/fieldName";
import {nodePropertyLines, nodePropertyRows, mergedNodePropertyRows, type NodeProperty, type NoteTypeProperties, type NodePropertyLine, type NodePropertyMeasure} from "../../core/plex/nodeProperties";

/** One preparation caches only selected text for its admitted pages, including repeated occurrences. */
export function nodePropertyReader(app: App, configuration: NoteTypeProperties | undefined, common: readonly NodeProperty[] = [], measure?: NodePropertyMeasure): (page: GraphPage) => readonly NodePropertyLine[] {
  const cache = new WeakMap<GraphPage, readonly NodePropertyLine[]>();
  return /** Cache only the admitted page's selected presentation fields for this render preparation. */ page => {
    const previous = cache.get(page);if (previous) return previous;
    if (page.transient || !page.file || page.file.extension !== "md" || page.isFolder || page.isTag || page.url) return [];
    if (!mergedNodePropertyRows(common, page.noteType ? nodePropertyRows(configuration, page.noteType) : []).some(/** Hidden fields cannot request native cache reads. */ row => row.visible)) return [];
    const file = page.file, provider = createLegacyPropertyProvider(app, /** Keep the same native incarnation across each cached-field read. */ () => page.file === file, /** The provider must not infer another file from a reused path. */ () => file);
    const node = graphNodeViewFromLegacy(page);
    const lines = nodePropertyLines(page.noteType, configuration, /** Read only the requested property and reject stale cache observations. */ field => {
      const frontmatter = app.metadataCache.getFileCache(file)?.frontmatter;
      const names = Object.keys(frontmatter ?? {}).filter(/** Definition refinements use canonical property identity, including whitespace normalization. */ key => normalizeFieldName(key) === normalizeFieldName(field));
      if (names.length > 1) return undefined;
      const read = provider.readNoteProperty?.(node, names[0] ?? field);
      return read?.status === "available" && read.isCurrent?.() !== false ? read.value : undefined;
    }, common);
    const result = measure ? lines.map(/** Actual UI font measurements stay alongside this preparation's selected display values. */ line => {
      const measurement = measure(line);return measurement ? {...line, measurement} : line;
    }) : lines;
    cache.set(page, result);return result;
  };
}
