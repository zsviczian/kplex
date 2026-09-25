export type PresentationDeviceClass = "desktop" | "tablet" | "phone";

export type KeyConvention = "macos" | "windows" | "ios" | "android" | "unknown";

export type PresentationInputMode = "keyboard" | "pointer" | "touch";

/** `unknown` means the host cannot establish whether this input is currently attached. */
export type PresentationInputAvailability = boolean | "unknown";

export type PresentationInputModes = Readonly<Record<PresentationInputMode, PresentationInputAvailability>>;

export type PresentationHostAction = "graphTab" | "sidepanel" | "popout";

export type PresentationHostActions = Readonly<Record<PresentationHostAction, boolean>>;

/**
 * Host-free facts that presentation code may use to choose affordances and layout profiles.
 * Device class does not imply a particular input mode or host action.
 */
export type PresentationEnvironment = Readonly<{
  device: PresentationDeviceClass;
  keyConvention: KeyConvention;
  inputModes: PresentationInputModes;
  hostActions: PresentationHostActions;
}>;
