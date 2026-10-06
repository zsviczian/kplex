/**
 * One-time reconciliation planning for the retired ExcaliBrain-file exclusion. Keep the saved graph
 * and identify sources requiring ordinary semantic reconciliation from current host metadata and
 * valid cached bodies. Unknown inputs conservatively dirty that source, never imply no references.
 * This upgrade-only path is distinct from presentation refresh and acquires no Markdown text.
 * Retired-policy reconciliation releases completed host metadata batches through event tasks
 * before rechecking captured file identity and the caller-owned source lifetime.
 */
import { yieldToHostTask } from "../adapters/obsidian/yieldToHostTask";
import { normalizePath, type App, type TFile } from "obsidian";
import type { KplexSettings } from "../settings";
import { HIERARCHY_ROLES } from "../core/graph/settingsPolicy";
import { normalizeFieldName, type ParsedBodyMetadata } from "../core/parser/metadata";
import { createObsidianMetadataSourceHost, ObsidianMetadataSourceCollector } from "../adapters/obsidian/metadataSourceCollector";
import { extractLinksFromValue, mergeFileMetadata } from "./fieldParser";
import type { FieldCacheEntry } from "./GraphBuilder";
import type { KplexIndexedDbCache } from "./IndexedDbCache";

/**
 * Select the formerly excluded Markdown entity and inbound declarers. Date destinations use the
 * existing metadata collector, not another date/property grammar. Ordinary unsupported physical
 * topology changes still follow the repository's existing conservative snapshot fallback.
 */
export async function planRetiredExclusionReconciliation(
  retiredPath: string, settings: KplexSettings, app: App, hot: ReadonlyMap<string, FieldCacheEntry>,
  storage: Pick<KplexIndexedDbCache, "getBodies">, isCurrent: () => boolean, sourceRevision: () => number,
): Promise<Set<string> | null> {
  const revision = sourceRevision();
  const current = (): boolean => isCurrent() && revision === sourceRevision();
  const canonical = (path: string): string => normalizePath(path).replace(/\.md$/i, "").toLowerCase();
  const target = canonical(retiredPath);
  const matches = (path: string): boolean => canonical(path) === target;
  const fields = new Set(HIERARCHY_ROLES.flatMap((role) => [...settings.hierarchy[role]]).map(normalizeFieldName));
  const host = createObsidianMetadataSourceHost(app);
  const affected = new Set<string>();
  const files = app.vault.getMarkdownFiles();
  const captured: Array<{ file: TFile; path: string; mtime: number; size: number }> = [];
  for (let offset = 0; offset < files.length; offset += 64) {
    if (!current()) return null;
    const batch = files.slice(offset, offset + 64);
    const bodies = new Map<string, ParsedBodyMetadata>();
    const missing: Array<{ path: string; mtime: number }> = [];
    for (const file of batch) {
      captured.push({ file, path: file.path, mtime: file.stat.mtime, size: file.stat.size });
      if (matches(file.path)) affected.add(file.path);
      const resolved = app.metadataCache.resolvedLinks[file.path] ?? {};
      const unresolved = app.metadataCache.unresolvedLinks[file.path] ?? {};
      if (Object.keys(resolved).some(matches) || Object.keys(unresolved).some((raw) =>
        matches(app.metadataCache.getFirstLinkpathDest(raw, file.path)?.path ?? raw))) affected.add(file.path);
      if (affected.has(file.path)) continue;
      const entry = hot.get(file.path);
      if (entry && entry.mtime === file.stat.mtime) bodies.set(file.path, entry.body);
      else missing.push({ path: file.path, mtime: file.stat.mtime });
    }
    if (missing.length) for (const [path, body] of await storage.getBodies(missing)) bodies.set(path, body);
    if (!current()) return null;
    for (const file of batch) {
      if (affected.has(file.path)) continue;
      const cache = app.metadataCache.getFileCache(file);
      const body = bodies.get(file.path);
      if (!cache || !body) { affected.add(file.path); continue; }
      const metadata = mergeFileMetadata(cache, body);
      const values = [...Object.entries(metadata.frontmatter), ...Object.entries(body.inlineFields)]
        .filter(([key]) => fields.has(normalizeFieldName(key)));
      if (values.some(([, value]) => extractLinksFromValue(app, value, file).some(matches))) {
        affected.add(file.path);
        continue;
      }
      if (Object.keys(metadata.frontmatter).some((field) => host.isDateProperty(field))) {
        const collector = new ObsidianMetadataSourceCollector(host, {
          isCurrent: current, sourceRevision, checkpoint: () => Promise.resolve(current()),
        }, file, metadata, settings, "relations");
        const ok = await collector.collectBatches((batch) => {
          if (batch.records.some((record) => record.kind === "date-property" && matches(record.target.entity.semanticPath ?? ""))) {
            affected.add(file.path);
          }
          return current();
        });
        if (!ok) return null;
      }
    }
    await yieldToHostTask();
  }
  return current() && captured.every(({ file, path, mtime, size }) => file.path === path &&
    file.stat.mtime === mtime && file.stat.size === size && app.vault.getFileByPath(path) === file) ? affected : null;
}
