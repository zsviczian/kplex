import type { PresentationEnvironment } from "../core/contracts/presentationEnvironment";
import { layoutProfileKey as portableLayoutProfileKey, selectLayoutProfile } from "../core/plex/viewPresentation";
import { readObsidianPresentationEnvironment } from "../adapters/obsidian/presentationEnvironment";
import type { ExcaliBrainSettings, KplexLayoutProfile, KplexViewSurface } from "../settings";

export function layoutProfileKey(surface: KplexViewSurface, environment = readObsidianPresentationEnvironment()): string {
  return portableLayoutProfileKey(surface, environment);
}

type EffectiveSettingsCacheEntry = {
  profile: KplexLayoutProfile;
  value: ExcaliBrainSettings;
};

const effectiveSettingsCache = new WeakMap<ExcaliBrainSettings, Map<string, EffectiveSettingsCacheEntry>>();

export function effectiveViewSettings(
  settings: ExcaliBrainSettings,
  surface: KplexViewSurface,
  environment: PresentationEnvironment = readObsidianPresentationEnvironment(),
): ExcaliBrainSettings {
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
  const value = Object.assign(Object.create(settings) as ExcaliBrainSettings, profile);
  bySurface.set(key, { profile, value });
  return value;
}

export function activeLayoutProfile(
  settings: ExcaliBrainSettings,
  surface: KplexViewSurface,
  environment: PresentationEnvironment = readObsidianPresentationEnvironment(),
): KplexLayoutProfile {
  return selectLayoutProfile(settings, surface, environment);
}
