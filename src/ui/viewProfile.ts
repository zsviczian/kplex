/**
 * Adapts K-Plex host environment facts to portable layout-profile selection. Effective settings
 * inherit live base values and are weakly cached by settings/profile identity without semantic reindexing.
 */
import type { PresentationEnvironment } from "../core/contracts/presentationEnvironment";
import { layoutProfileKey as portableLayoutProfileKey, selectLayoutProfile } from "../core/plex/viewPresentation";
import { readObsidianPresentationEnvironment } from "../adapters/obsidian/presentationEnvironment";
import type { KplexSettings, KplexLayoutProfile, KplexViewSurface } from "../settings";

/** Select the stable persisted device/surface key from explicit or current host environment facts. */
export function layoutProfileKey(surface: KplexViewSurface, environment = readObsidianPresentationEnvironment()): string {
  return portableLayoutProfileKey(surface, environment);
}

type EffectiveSettingsCacheEntry = {
  profile: KplexLayoutProfile;
  value: KplexSettings;
};

const effectiveSettingsCache = new WeakMap<KplexSettings, Map<string, EffectiveSettingsCacheEntry>>();

/** Overlay the active layout profile while preserving inherited settings and cache identity. */
export function effectiveViewSettings(
  settings: KplexSettings,
  surface: KplexViewSurface,
  environment: PresentationEnvironment = readObsidianPresentationEnvironment(),
): KplexSettings {
  const key = layoutProfileKey(surface, environment);
  const profile = settings.layoutProfiles[key];
  if (!profile) return settings;

  let bySurface = effectiveSettingsCache.get(settings);
  if (!bySurface) {
    bySurface = new Map();
    effectiveSettingsCache.set(settings, bySurface);
  }
  const cached = bySurface.get(key);
  if (cached?.profile === profile) return cached.value;

  // Layout profiles override only a small subset of settings. Inherit the rest from the live base
  // settings object instead of spreading it on every React render: base-setting mutations remain
  // immediately visible while the effective object's identity changes only when the profile does.
  const value = Object.assign(Object.create(settings) as KplexSettings, profile);
  bySurface.set(key, { profile, value });
  return value;
}

/** Read the active profile through the portable selector without changing settings or graph state. */
export function activeLayoutProfile(
  settings: KplexSettings,
  surface: KplexViewSurface,
  environment: PresentationEnvironment = readObsidianPresentationEnvironment(),
): KplexLayoutProfile {
  return selectLayoutProfile(settings, surface, environment);
}
