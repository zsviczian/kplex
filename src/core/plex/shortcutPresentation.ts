import type { KeyConvention, PresentationEnvironment } from "../contracts/presentationEnvironment";

export type ShortcutModifier = "mod" | "alt" | "shift";
export type ShortcutSpec = Readonly<{
  key: string;
  modifiers?: readonly ShortcutModifier[];
}>;

export type ShortcutKeyboardEvent = Readonly<{
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
}>;

/** F4 is the search gesture verified to focus K-Plex without a conflicting host binding. */
export const SEARCH_FOCUS_SHORTCUT: ShortcutSpec = { key: "F4" };

/** Preserve the current search handler: F4, or Ctrl/Meta+F with Alt not pressed. */
export function isSearchFocusShortcut(event: ShortcutKeyboardEvent): boolean {
  if (event.key === "F4") return true;
  return event.key.toLocaleLowerCase() === "f" && (event.ctrlKey || event.metaKey) && !event.altKey;
}

function modifierName(modifier: ShortcutModifier, convention: KeyConvention): string | null {
  if (modifier === "shift") return "Shift";
  if (modifier === "mod") {
    if (convention === "macos" || convention === "ios") return "Command";
    if (convention === "windows" || convention === "android") return "Control";
    return null;
  }
  if (convention === "macos" || convention === "ios") return "Option";
  if (convention === "windows" || convention === "android") return "Alt";
  return null;
}

/**
 * Format a shortcut only when the action is available and a keyboard is confirmed present.
 * Mobile `unknown` keyboard state intentionally yields no hint rather than assuming either state.
 */
export function formatShortcut(
  shortcut: ShortcutSpec,
  environment: Pick<PresentationEnvironment, "keyConvention" | "inputModes">,
  actionAvailable = true,
): string | null {
  if (!actionAvailable || environment.inputModes.keyboard !== true) return null;
  const modifiers: string[] = [];
  for (const modifier of shortcut.modifiers ?? []) {
    const name = modifierName(modifier, environment.keyConvention);
    if (!name) return null;
    modifiers.push(name);
  }
  if (environment.keyConvention === "unknown" && modifiers.length) return null;
  return [...modifiers, shortcut.key.length === 1 ? shortcut.key.toLocaleUpperCase() : shortcut.key].join("+");
}
