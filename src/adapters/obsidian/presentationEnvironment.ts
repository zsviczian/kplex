import { Platform } from "obsidian";
import type { PresentationEnvironment, PresentationInputModes } from "../../core/contracts/presentationEnvironment";
import { classifyDeviceClass, classifyKeyConvention } from "./presentationEnvironmentFacts";

type ObsidianFormFactorRuntime = typeof Platform & Partial<{
  isPhone: boolean;
  isTablet: boolean;
}>;

function inputModes(viewWindow: Window | undefined, isMobile: boolean): PresentationInputModes {
  const touch = Boolean(
    (viewWindow?.navigator.maxTouchPoints ?? 0) > 0 ||
    (viewWindow && "ontouchstart" in viewWindow),
  );
  const finePointer = viewWindow?.matchMedia?.("(any-pointer: fine)").matches ?? false;

  // Browsers do not expose a reliable physical-keyboard-presence signal on mobile. Reporting
  // "unknown" preserves the distinction between a touch-only device and an attached keyboard.
  return {
    keyboard: isMobile ? "unknown" : true,
    pointer: !isMobile || finePointer,
    touch,
  };
}

/** Read current Obsidian-owned presentation facts without storing process-wide mutable state. */
export function readObsidianPresentationEnvironment(viewWindow?: Window): PresentationEnvironment {
  const runtime = Platform as ObsidianFormFactorRuntime;
  const windowRef = viewWindow ?? (typeof window !== "undefined" ? window : undefined);
  const device = classifyDeviceClass({
    isMobile: Platform.isMobile,
    isPhone: runtime.isPhone,
    isTablet: runtime.isTablet,
    screenWidth: windowRef?.screen?.width || windowRef?.innerWidth || 0,
    screenHeight: windowRef?.screen?.height || windowRef?.innerHeight || 0,
  });

  return {
    device,
    keyConvention: classifyKeyConvention({
      isMacOS: Platform.isMacOS,
      isWindows: Platform.isWin,
      isIosApp: Platform.isIosApp,
      isAndroidApp: Platform.isAndroidApp,
    }),
    inputModes: inputModes(windowRef, Platform.isMobile),
    hostActions: {
      graphTab: device !== "phone",
      sidepanel: true,
      popout: device === "desktop",
    },
  };
}
