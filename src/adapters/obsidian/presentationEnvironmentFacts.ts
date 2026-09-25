import type { KeyConvention, PresentationDeviceClass } from "../../core/contracts/presentationEnvironment";

export type DeviceClassificationFacts = Readonly<{
  isMobile: boolean;
  isPhone?: boolean;
  isTablet?: boolean;
  screenWidth?: number;
  screenHeight?: number;
}>;

export type KeyConventionFacts = Readonly<{
  isMacOS?: boolean;
  isWindows?: boolean;
  isIosApp?: boolean;
  isAndroidApp?: boolean;
}>;

/** Preserve Obsidian's existing flag precedence and viewport fallback. */
export function classifyDeviceClass(facts: DeviceClassificationFacts): PresentationDeviceClass {
  if (!facts.isMobile) return "desktop";
  if (facts.isPhone) return "phone";
  if (facts.isTablet) return "tablet";

  const width = facts.screenWidth || Number.POSITIVE_INFINITY;
  const height = facts.screenHeight || Number.POSITIVE_INFINITY;
  return Math.min(width, height) >= 600 ? "tablet" : "phone";
}

export function classifyKeyConvention(facts: KeyConventionFacts): KeyConvention {
  if (facts.isIosApp) return "ios";
  if (facts.isAndroidApp) return "android";
  if (facts.isMacOS) return "macos";
  if (facts.isWindows) return "windows";
  return "unknown";
}
