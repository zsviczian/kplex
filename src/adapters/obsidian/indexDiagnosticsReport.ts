/** User-shared index support report. Only explicit counters, states and reason codes cross this boundary. */
import { apiVersion, Platform } from "obsidian";
import type { GraphIndex } from "../../index/GraphIndex";
import {createDiagnosticJson} from "../../application/supportReport";

type IndexStatusFacts = {
  upToDate: boolean;
  phase: string;
  indexedFiles: number;
  totalFiles: number | null;
};

/** Capture existing passive owners as data; the canonical support projection owns sanitization. */
export function captureIndexDiagnostics(
  index: GraphIndex,
  getStatus: () => IndexStatusFacts,
  pluginVersion: string,
) {
  const saved = index.getSavedSnapshotSummary();
  const { upToDate, phase, indexedFiles, totalFiles } = getStatus();
  const platform = Platform.isIosApp ? "ios" : Platform.isAndroidApp ? "android" : "desktop";
  const operatingSystem = Platform.isIosApp ? "ios" : Platform.isAndroidApp ? "android" :
    Platform.isWin ? "windows" : Platform.isLinux ? "linux" : Platform.isMacOS ? "macos" : "unknown";
  const formFactor = Platform.isPhone ? "phone" : Platform.isTablet ? "tablet" : "desktop";
  return {
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
    persistence: index.getSnapshotPersistenceDiagnostics?.(),
    sources: index.getSourceRepositoryDiagnostics?.(),
    recovery: index.getIndexRecoveryDiagnostics?.(),
    decisions: index.getIndexDiagnostics(),
  };
}

/** Compatibility entry point for passive index-only callers, using the canonical JSON schema. */
export function createIndexDiagnosticsReport(index: GraphIndex, getStatus: () => IndexStatusFacts,
  pluginVersion: string, indexingActivity?: unknown): string {
  const captured = captureIndexDiagnostics(index, getStatus, pluginVersion);
  return createDiagnosticJson({capturedAt: captured.generatedAt, indexReport: captured, startup: null,
    session: null, indexingPreferences: null, identity: {manifestVersion: pluginVersion},
    environment: {pluginVersion, ...captured.device}}, indexingActivity);
}
