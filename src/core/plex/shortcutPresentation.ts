/**
 * Portable shortcut presentation from explicit device and key-convention facts. Callers supply localized modifier names; registration tokens and action availability stay separate.
 */
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

export type ShortcutPresentationLabels = Readonly<{
  shift: string;
  command: string;
  control: string;
  option: string;
  alt: string;
}>;

/** Resolve a logical modifier against explicit OS conventions and caller-supplied localized names; unknown conventions cannot invent a key hint. */
function modifierName(modifier: ShortcutModifier, convention: KeyConvention, labels: ShortcutPresentationLabels): string | null {
  if (modifier === "shift") return labels.shift;
  if (modifier === "mod") {
    if (convention === "macos" || convention === "ios") return labels.command;
    if (convention === "windows" || convention === "android") return labels.control;
    return null;
  }
  if (convention === "macos" || convention === "ios") return labels.option;
  if (convention === "windows" || convention === "android") return labels.alt;
  return null;
}

/**
 * Format a shortcut only when the action is available and a keyboard is confirmed present.
 * Mobile `unknown` keyboard state intentionally yields no hint rather than assuming either state.
 */
export function formatShortcut(
  shortcut: ShortcutSpec,
  environment: Pick<PresentationEnvironment, "keyConvention" | "inputModes">,
  labels: ShortcutPresentationLabels,
  actionAvailable = true,
): string | null {
  if (!actionAvailable || environment.inputModes.keyboard !== true) return null;
  const modifiers: string[] = [];
  for (const modifier of shortcut.modifiers ?? []) {
    const name = modifierName(modifier, environment.keyConvention, labels);
    if (!name) return null;
    modifiers.push(name);
  }
  if (environment.keyConvention === "unknown" && modifiers.length) return null;
  return [...modifiers, shortcut.key.length === 1 ? shortcut.key.toLocaleUpperCase() : shortcut.key].join("+");
}
