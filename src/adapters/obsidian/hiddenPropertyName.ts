/**
 * Suggest an unused Hidden-property name from Obsidian's existing property registry and K-Plex
 * field names. This reads cached names only, without note bodies, index preparation or vault scans.
 * If the guarded native registry is unavailable, manual settings navigation remains the safe choice.
 */
import type { App } from "obsidian";
import { normalizeFieldName } from "../../core/parser/metadata";

/** Prefer hidden, then a namespaced numeric alternative, without repurposing a known property or ontology assignment. */
export function suggestHiddenProperty(app: App, reservedFields: readonly string[]): string | null {
  const cache = app.metadataCache as unknown as { getAllPropertyInfos?: () => unknown };
  try {
    if (typeof cache.getAllPropertyInfos !== "function") return null;
    const properties = cache.getAllPropertyInfos();
    if (!properties || typeof properties !== "object" || Array.isArray(properties)) return null;
    const reserved = new Set([...Object.keys(properties), ...reservedFields].map(normalizeFieldName));
    if (!reserved.has(normalizeFieldName("hidden"))) return "hidden";
    let candidate = "kplex-hidden", suffix = 2;
    while (reserved.has(normalizeFieldName(candidate))) candidate = `kplex-hidden-${suffix++}`;
    return candidate;
  } catch (error) {
    console.warn("K-Plex cached property names are unavailable", error);
    return null;
  }
}
