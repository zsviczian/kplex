/**
 * Explicitly requested support metadata: active plugin identities/versions, custom theme name and
 * aggregate CSS snippet counts. Only copied own data fields cross this boundary; no host registry,
 * settings, snippet names/content, paths or arbitrary plugin manifest fields are retained.
 */
import { supportCode, supportCount, supportField } from "./SessionEventRecorder";

export const SUPPORT_PLUGIN_LIMIT = 512;
export const SUPPORT_METADATA_TEXT_LIMIT = 128;

/** Retain an intentionally public metadata name without controls, bidi escapes or shortening it. */
function supportMetadataName(input: unknown): string | null {
  if (typeof input !== "string" || input.length === 0 || input.length > SUPPORT_METADATA_TEXT_LIMIT) return null;
  for (let index = 0; index < input.length; index++) {
    const code = input.charCodeAt(index);
    if (code < 32 || code >= 127 && code <= 159 || code >= 0x200b && code <= 0x200f
      || code >= 0x2028 && code <= 0x202e || code >= 0x2060 && code <= 0x206f) return null;
  }
  return input;
}
/** IDs remain recognizable product identifiers; URLs and native paths are never accepted as IDs. */
function supportPluginId(input: unknown): string | null {
  return typeof input === "string" && /^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$/.test(input) ? input : null;
}
/** Preserve bounded numeric plugin versions and ordinary prerelease/build suffixes, never coercion. */
function supportPluginVersion(input: unknown): string | null {
  return typeof input === "string" && input.length <= SUPPORT_METADATA_TEXT_LIMIT
    && /^\d+(?:\.\d+){1,3}(?:[-+][A-Za-z0-9][A-Za-z0-9.+-]*)?$/.test(input) ? input : null;
}
/** Distinguish a safely readable array from an absent/revoked host value without invoking iterators. */
function supportPluginRows(input: unknown): number | null {
  try { return Array.isArray(input) ? supportCount(supportField(input, "length")) : null; }
  catch { return null; }
}
/**
 * Project at most the first 512 explicit active plugin records, retaining source availability and
 * exact aggregate omissions independently of missing names/versions. Core plugins have no host
 * version; null expresses that absence. Unsupported metadata remains unknown instead of fabricated.
 */
export function projectSupportCustomizations(input: unknown) {
  const candidates = supportField(input, "activePlugins"), length = supportPluginRows(candidates);
  const suppliedCount = supportCount(supportField(input, "activePluginTotalCount"));
  const available = supportField(input, "activePluginsAvailability") === "available" && length !== null;
  const activePluginTotalCount = available && suppliedCount !== null && suppliedCount >= length ? suppliedCount : null;
  const activePlugins: Array<{ kind: "core" | "community"; id: string; name: string | null; version: string | null }> = [];
  if (available) for (let index = 0; index < Math.min(length, SUPPORT_PLUGIN_LIMIT); index++) {
    const row = supportField(candidates, String(index)), kind = supportCode(supportField(row, "kind"), ["core", "community"]);
    const id = supportPluginId(supportField(row, "id"));
    if (kind === "unavailable" || id === null) continue;
    activePlugins.push({ kind, id, name: supportMetadataName(supportField(row, "name")),
      version: kind === "core" ? null : supportPluginVersion(supportField(row, "version")) });
  }
  const theme = supportField(input, "customThemeName"), customThemeName = supportMetadataName(theme);
  const customThemeAvailability = supportField(input, "customThemeAvailability") === "available" && (theme === null || customThemeName !== null)
    ? "available" as const : "unavailable" as const;
  const cssSnippetsAvailability = supportCode(supportField(input, "cssSnippetsAvailability"), ["available"]);
  return { activePluginsAvailability: available ? "available" as const : "unavailable" as const, activePluginTotalCount, activePlugins,
    activePluginsOmitted: available ? Math.max(0, (activePluginTotalCount ?? length) - activePlugins.length) : null,
    customThemeAvailability, customThemeName: customThemeAvailability === "available" ? customThemeName : null,
    cssSnippetsAvailability, enabledCssSnippetCount: cssSnippetsAvailability === "available" ? supportCount(supportField(input, "enabledCssSnippetCount")) : null,
    availableCssSnippetCount: cssSnippetsAvailability === "available" ? supportCount(supportField(input, "availableCssSnippetCount")) : null };
}
