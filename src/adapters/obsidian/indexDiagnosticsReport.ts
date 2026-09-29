/** User-shared index support report. Only explicit counters, states and reason codes cross this boundary. */
import { apiVersion, Platform } from "obsidian";
import { sanitizeIndexDiagnostics } from "../../index/IndexedDbCache";
import { sanitizeSourceRepositoryDiagnostics } from "../../index/SourceRepository";
import type { GraphIndex } from "../../index/GraphIndex";

type IndexStatusFacts = {
  upToDate: boolean;
  phase: string;
  indexedFiles: number;
  totalFiles: number | null;
};

/** Export only sanitized aggregate decisions, even if an older runtime supplied history. */
export function createIndexDiagnosticsReport(
  index: GraphIndex,
  getStatus: () => IndexStatusFacts,
  pluginVersion: string,
): string {
  const saved = index.getSavedSnapshotSummary();
  const { upToDate, phase, indexedFiles, totalFiles } = getStatus();
  const platform = Platform.isIosApp ? "ios" : Platform.isAndroidApp ? "android" : "desktop";
  const operatingSystem = Platform.isIosApp ? "ios" : Platform.isAndroidApp ? "android" :
    Platform.isWin ? "windows" : Platform.isLinux ? "linux" : Platform.isMacOS ? "macos" : "unknown";
  const formFactor = Platform.isPhone ? "phone" : Platform.isTablet ? "tablet" : "desktop";
  return JSON.stringify({
    formatVersion: 1,
    generatedAt: new Date().toISOString(),
    plugin: { id: "k-plex", version: pluginVersion },
    platform,
    device: { obsidianApiVersion: apiVersion, operatingSystem, formFactor },
    status: { upToDate, phase, indexedFiles, totalFiles },
    graph: {
      nodes: index.size,
      publishedMarkdownFiles: index.indexedMarkdownFileCount(),
      authoritative: index.isFullSnapshotHydrated(),
    },
    hydration: index.getSnapshotHydrationDiagnostics(),
    saved,
    sources: sanitizeSourceRepositoryDiagnostics(index.getSourceRepositoryDiagnostics?.()),
    decisions: sanitizeIndexDiagnostics(index.getIndexDiagnostics()),
  }, null, 2);
}
