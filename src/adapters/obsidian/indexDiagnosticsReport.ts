/** User-shared index support report. Only explicit counters, states and reason codes cross this boundary. */
import { apiVersion, Platform } from "obsidian";
import { sanitizeIndexDiagnostics } from "../../index/IndexedDbCache";
import { sanitizeSourceRepositoryDiagnostics } from "../../index/SourceRepository";
import type { GraphIndex } from "../../index/GraphIndex";
import { formatDiagnosticsJson, SUPPORT_REPORT_BYTE_LIMIT } from "../../application/supportReport";
import { projectIndexingActivity } from "../../application/IndexingActivity";

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
  indexingActivity?: unknown,
): string {
  const activity = projectIndexingActivity(indexingActivity);
  const saved = index.getSavedSnapshotSummary();
  const { upToDate, phase, indexedFiles, totalFiles } = getStatus();
  const platform = Platform.isIosApp ? "ios" : Platform.isAndroidApp ? "android" : "desktop";
  const operatingSystem = Platform.isIosApp ? "ios" : Platform.isAndroidApp ? "android" :
    Platform.isWin ? "windows" : Platform.isLinux ? "linux" : Platform.isMacOS ? "macos" : "unknown";
  const formFactor = Platform.isPhone ? "phone" : Platform.isTablet ? "tablet" : "desktop";
  const report = {
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
    truncation: { oldestDecisionsOmitted: 0 },
  };
  let text = formatDiagnosticsJson(report, activity);
  while (text.length > SUPPORT_REPORT_BYTE_LIMIT && report.decisions.length) {
    report.decisions.shift(); report.truncation.oldestDecisionsOmitted++;
    text = formatDiagnosticsJson(report, activity);
  }
  // Existing aggregate sections normally fit. Preserve the bounded activity core if a future
  // legacy diagnostic extension violates that assumption; do not emit an oversized clipboard.
  return text.length <= SUPPORT_REPORT_BYTE_LIMIT ? text
    : formatDiagnosticsJson({formatVersion: 1, reportStatus: "size-limit"}, activity);
}
