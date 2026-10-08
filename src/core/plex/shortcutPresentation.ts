/**
 * Portable shortcut presentation from explicit device and key-convention facts. Callers supply localized modifier names; registration tokens and action availability stay separate.
 */
import type { KeyConvention, PresentationEnvironment } from "../contracts/presentationEnvironment";

export type ShortcutModifier = "mod" | "alt" | "shift" | "ctrl" | "meta";
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

/** Focus Vault search without consuming the independent current-Plex Find shortcut. */
export function isSearchFocusShortcut(event: ShortcutKeyboardEvent): boolean {
  return event.key === "F4";
}

/** Open the current surface's Find field; native editor callers retain their own shortcut. */
export function isPlexFindShortcut(event: ShortcutKeyboardEvent): boolean {
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
  if (modifier === "ctrl") return labels.control;
  if (modifier === "meta") return labels.command;
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
 * Native hotkey pills may request a space separator; ordinary action hints retain plus separators.
 */
export function formatShortcut(
  shortcut: ShortcutSpec,
  environment: Pick<PresentationEnvironment, "keyConvention" | "inputModes">,
  labels: ShortcutPresentationLabels,
  actionAvailable = true,
  separator = "+",
): string | null {
  if (!actionAvailable || environment.inputModes.keyboard !== true) return null;
  const modifiers: string[] = [];
  for (const modifier of shortcut.modifiers ?? []) {
    const name = modifierName(modifier, environment.keyConvention, labels);
    if (!name) return null;
    modifiers.push(name);
  }
  if (environment.keyConvention === "unknown" && modifiers.length) return null;
  return [...modifiers, shortcut.key.length === 1 ? shortcut.key.toLocaleUpperCase() : shortcut.key].join(separator);
}
