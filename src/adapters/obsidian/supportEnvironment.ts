/**
 * Passive Obsidian customization facts explicitly authorized for user-shared support reports.
 * This host boundary reads existing community/core plugin and custom-CSS caches only; it never
 * enumerates the vault, loads plugins/themes/snippets, reads files or retains runtime instances.
 * Unpublished cache shapes are verified against the native host and remain optional capabilities.
 */
import type { App } from "obsidian";
import { supportField } from "../../application/SessionEventRecorder";
import { SUPPORT_PLUGIN_LIMIT } from "../../application/supportCustomizationProjection";

/** Admit only an existing cache record, without invoking a getter or coercing a host value. */
function cacheRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * Project cached active plugin identities and CSS customization counts without host I/O.
 * Community activity means a currently loaded instance; core activity means its enabled flag.
 * Names/versions are the deliberately disclosed metadata, not arbitrary plugin settings. Only
 * 512 plain rows are retained; the actual count distinguishes a bounded list from a complete one.
 * Each optional cache fails independently, and raw exceptions never enter the report.
 */
export function readSupportCustomizations(app: App) {
  const activePlugins: Array<{ kind: "core" | "community"; id: unknown; name: unknown; version: unknown }> = [];
  let activePluginsAvailability: "available" | "unavailable" = "unavailable";
  let activePluginTotalCount: number | null = null;
  try {
    const community = supportField(supportField(app, "plugins"), "plugins");
    const core = supportField(supportField(app, "internalPlugins"), "plugins");
    if (cacheRecord(community) && cacheRecord(core)) {
      let count = 0;
      for (const id in core) {
        const entry = supportField(core, id);
        if (supportField(entry, "enabled") !== true) continue;
        count++;
        if (activePlugins.length >= SUPPORT_PLUGIN_LIMIT) continue;
        const instance = supportField(entry, "instance");
        activePlugins.push({ kind: "core", id: supportField(instance, "id"), name: supportField(instance, "name"), version: null });
      }
      for (const id in community) {
        const instance = supportField(community, id);
        if (!cacheRecord(instance)) continue;
        count++;
        if (activePlugins.length >= SUPPORT_PLUGIN_LIMIT) continue;
        const manifest = supportField(instance, "manifest");
        activePlugins.push({ kind: "community", id: supportField(manifest, "id"), name: supportField(manifest, "name"), version: supportField(manifest, "version") });
      }
      activePluginsAvailability = "available";
      activePluginTotalCount = count;
    }
  } catch { activePlugins.length = 0; /* Cache teardown cannot disclose errors or disable reporting. */ }

  let customThemeAvailability: "available" | "unavailable" = "unavailable";
  let customThemeName: string | null = null;
  let cssSnippetsAvailability: "available" | "unavailable" = "unavailable";
  let enabledCssSnippetCount: number | null = null;
  let availableCssSnippetCount: number | null = null;
  const customCss = supportField(app, "customCss");
  const theme = supportField(customCss, "theme");
  if (typeof theme === "string") {
    customThemeAvailability = "available";
    customThemeName = theme || null;
  }
  try {
    const enabled = supportField(customCss, "enabledSnippets");
    const available = supportField(customCss, "snippets");
    // These are main-application caches even when the toolbar belongs to a popout. Do not
    // inspect snippet names or call the host's filesystem-backed reload/list operations.
    if (enabled instanceof Set && Array.isArray(available)) {
      cssSnippetsAvailability = "available";
      enabledCssSnippetCount = enabled.size;
      availableCssSnippetCount = available.length;
    }
  } catch { /* Unknown host cache types stay explicitly unavailable. */ }
  return { activePluginsAvailability, activePlugins, activePluginTotalCount,
    enabledPluginCount: activePluginTotalCount, customThemeAvailability, customThemeName,
    cssSnippetsAvailability, enabledCssSnippetCount, availableCssSnippetCount };
}
