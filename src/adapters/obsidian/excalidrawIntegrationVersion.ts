/** Minimum Excalidraw version and defensive verification for the K-Plex integration boundary. */

/** First Excalidraw release that provides K-Plex's view-scoped integration contract. */
export const MINIMUM_EXCALIDRAW_INTEGRATION_VERSION = "2.28.0";

/** Narrow version capability exposed by Excalidraw Automate. */
export interface ExcalidrawVersionBridge {
  verifyMinimumPluginVersion?: (requiredVersion: string) => boolean;
}

/**
 * Check the Excalidraw integration version without allowing an absent or faulty bridge to break
 * the embedded editor.
 */
export function hasMinimumExcalidrawIntegrationVersion(
  bridge: ExcalidrawVersionBridge | null | undefined,
): boolean {
  try {
    return bridge?.verifyMinimumPluginVersion?.(
      MINIMUM_EXCALIDRAW_INTEGRATION_VERSION,
    ) === true;
  } catch {
    return false;
  }
}
