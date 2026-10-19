/**
 * Host view projection combines surface density, scoped lateral arrangement and sparse device typography. Root settings
 * inherit prepared dictionaries; an explicit device width applies to base and center styles before
 * tag/note-type precedence. Pop-out arrangement follows the same device's main-tab choice while
 * density remains independently scoped. Read/write arrangement routing shares that surface rule.
 * Sparse reset restores shared role styles. No graph/default mutations occur.
 */
import type { PresentationEnvironment } from "../core/contracts/presentationEnvironment";
import { layoutProfileKey as portableLayoutProfileKey, persistedLayoutDeviceClass, selectLayoutProfile } from "../core/plex/viewPresentation";
import { effectiveTypography, sanitizeTypographyValue, type TypographyOverride } from "../core/plex/typographyPreferences";
import { readObsidianPresentationEnvironment } from "../adapters/obsidian/presentationEnvironment";
import type { KplexSettings, KplexLayoutProfile, KplexViewSurface } from "../settings";

/** Select the stable persisted device/surface key from explicit or current host environment facts. */
export function layoutProfileKey(surface: KplexViewSurface, environment = readObsidianPresentationEnvironment()): string {
  return portableLayoutProfileKey(surface, environment);
}

/** Arrangement has six device/surface scopes: pop-outs share the current device's main-tab choice. */
export function lateralArrangementSurface(surface: KplexViewSurface): "leaf" | "sidepanel" {
  return surface === "popout" ? "leaf" : surface;
}

type EffectiveSettingsCacheEntry = {
  profile: KplexLayoutProfile | undefined;
  override: TypographyOverride | undefined;
  sharedStyle: KplexSettings["baseNodeStyle"];
  styleValues: ReadonlyArray<readonly [string, unknown]>;
  sharedCenterStyle: KplexSettings["centralNodeStyle"];
  centerStyleValues: ReadonlyArray<readonly [string, unknown]>;
  deviceWidth: number | undefined;
  font: number;
  wrap: boolean;
  typographyValues: string;
  lateralArrangement: KplexSettings["lateralArrangement"];
  value: KplexSettings;
};
const effectiveSettingsCache = new WeakMap<KplexSettings, Map<string, EffectiveSettingsCacheEntry>>();

/** Project scoped arrangement and explicit device width without changing shared styles or graph state. */
export function effectiveViewSettings(settings: KplexSettings, surface: KplexViewSurface,
  environment: PresentationEnvironment = readObsidianPresentationEnvironment()): KplexSettings {
  const key = layoutProfileKey(surface, environment);
  const profile = settings.layoutProfiles[key];
  // Pop-outs keep their own density, but the six device/surface controls own arrangement.
  const lateralArrangement = settings.layoutProfiles[layoutProfileKey(lateralArrangementSurface(surface), environment)]?.lateralArrangement ?? "split";
  const override = settings.typographyProfiles?.[persistedLayoutDeviceClass(environment.device)];
  if (!profile && !override && lateralArrangement === "split") return settings;
  const typography = effectiveTypography({ baseFontSize: settings.baseFontSize, wrapNodeLabels: settings.wrapNodeLabels,
    maxLabelLength: settings.baseNodeStyle.maxLabelLength ?? 30, maxWidth: settings.baseNodeStyle.maxWidth ?? 286 }, override);
  // A small scalar fingerprint catches supported in-place edits without cloning the settings tree.
  const typographyValues = JSON.stringify(typography);
  const styleValues = Object.entries(settings.baseNodeStyle);
  const centerStyleValues = Object.entries(settings.centralNodeStyle);
  const widthOverride = sanitizeTypographyValue("maxWidth", override?.maxWidth);
  const deviceWidth = typeof widthOverride === "number" ? widthOverride : undefined;
  let bySurface = effectiveSettingsCache.get(settings);
  if (!bySurface) { bySurface = new Map(); effectiveSettingsCache.set(settings, bySurface); }
  const cached = bySurface.get(key);
  if (cached && cached.profile === profile && cached.override === override && cached.sharedStyle === settings.baseNodeStyle
    && cached.lateralArrangement === lateralArrangement
    && cached.font === settings.baseFontSize && cached.wrap === settings.wrapNodeLabels && cached.typographyValues === typographyValues
    && cached.sharedCenterStyle === settings.centralNodeStyle && cached.deviceWidth === deviceWidth
    && cached.centerStyleValues.length === centerStyleValues.length && centerStyleValues.every(/** Preserve supported center-style edits underneath the device width. */ ([name, value], i) => cached.centerStyleValues[i][0] === name && cached.centerStyleValues[i][1] === value)
    && cached.styleValues.length === styleValues.length && styleValues.every(/** Compare bounded primitive style fields so in-place edits invalidate own merged fields. */ ([name, value], i) => cached.styleValues[i][0] === name && cached.styleValues[i][1] === value)) return cached.value;
  const value = Object.assign(Object.create(settings) as KplexSettings, profile ?? {}, profile ? {
    horizontalCompactingFactor: profile.horizontalCompactingFactor ?? profile.compactingFactor,
  } : {}, {
    lateralArrangement,
    baseFontSize: typography.baseFontSize,
    wrapNodeLabels: typography.wrapNodeLabels,
    baseNodeStyle: { ...settings.baseNodeStyle, maxLabelLength: typography.maxLabelLength, maxWidth: typography.maxWidth },
    ...(deviceWidth === undefined ? {} : { centralNodeStyle: { ...settings.centralNodeStyle, maxWidth: deviceWidth } }),
  });
  bySurface.set(key, { profile, override, sharedStyle: settings.baseNodeStyle, styleValues,
    sharedCenterStyle: settings.centralNodeStyle, centerStyleValues, deviceWidth, font: settings.baseFontSize,
    wrap: settings.wrapNodeLabels, typographyValues, lateralArrangement, value });
  return value;
}

/** Read the active density profile without changing settings or graph state. */
export function activeLayoutProfile(settings: KplexSettings, surface: KplexViewSurface,
  environment: PresentationEnvironment = readObsidianPresentationEnvironment()): KplexLayoutProfile {
  return selectLayoutProfile(settings, surface, environment);
}
