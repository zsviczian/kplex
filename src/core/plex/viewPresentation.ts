/**
 * Portable view routing and device/surface layout-profile selection. Persisted legacy density keys
 * retain their meaning; horizontal density falls back to the selected profile's old shared value.
 * This owner receives plain environment/settings values and never changes graph or host state.
 */
import type {
  PresentationDeviceClass,
  PresentationEnvironment,
  PresentationHostAction,
  PresentationInputAvailability,
  PresentationInputMode,
} from "../contracts/presentationEnvironment";

export type PresentationViewSurface = "leaf" | "sidepanel" | "popout";
export type PersistedLayoutDeviceClass = "desktop" | "tablet" | "mobile";

export type LayoutProfileValues = Readonly<{
  compactingFactor: number;
  horizontalCompactingFactor?: number;
  parentColumns: number;
  childColumns: number;
}>;

export type LayoutProfileSettings = Readonly<{
  compactingFactor: number;
  horizontalCompactingFactor?: number;
  parentColumns: number;
  childColumns: number;
  layoutProfiles: Readonly<Record<string, LayoutProfileValues | undefined>>;
}>;

/** Stored settings keep the historical `mobile` key even though presentation uses `phone`. */
export function persistedLayoutDeviceClass(device: PresentationDeviceClass): PersistedLayoutDeviceClass {
  return device === "phone" ? "mobile" : device;
}

export function layoutProfileKey(surface: PresentationViewSurface, environment: Pick<PresentationEnvironment, "device">): string {
  return `${persistedLayoutDeviceClass(environment.device)}:${surface}`;
}

/** Select one surface profile, supplying horizontal density for pre-axis persisted values. */
export function selectLayoutProfile(
  settings: LayoutProfileSettings,
  surface: PresentationViewSurface,
  environment: Pick<PresentationEnvironment, "device">,
): LayoutProfileValues {
  const profile = settings.layoutProfiles[layoutProfileKey(surface, environment)];
  if (profile?.horizontalCompactingFactor !== undefined) return profile;
  const selected = profile ?? settings;
  return {
    compactingFactor: selected.compactingFactor,
    horizontalCompactingFactor: selected.horizontalCompactingFactor ?? selected.compactingFactor,
    parentColumns: selected.parentColumns,
    childColumns: selected.childColumns,
  };
}

export function inputModeAvailability(environment: PresentationEnvironment, mode: PresentationInputMode): PresentationInputAvailability {
  return environment.inputModes[mode];
}

export function isHostActionAvailable(environment: PresentationEnvironment, action: PresentationHostAction): boolean {
  return environment.hostActions[action];
}

export function isGraphTabCommandAvailable(environment: PresentationEnvironment): boolean {
  return isHostActionAvailable(environment, "graphTab");
}

export function isPopoutCommandAvailable(environment: PresentationEnvironment): boolean {
  return isHostActionAvailable(environment, "popout");
}

/**
 * Select the target for the generic K-Plex open action. Existing Obsidian facts make phones choose
 * the sidepanel, tablets choose a normal tab, and desktops optionally choose a pop-out.
 */
export function primaryOpenSurface(
  environment: PresentationEnvironment,
  startInPopout: boolean,
): PresentationViewSurface {
  if (environment.device === "phone" || !environment.hostActions.graphTab) {
    return environment.hostActions.sidepanel ? "sidepanel" : "leaf";
  }
  if (startInPopout && environment.hostActions.popout) return "popout";
  return "leaf";
}
