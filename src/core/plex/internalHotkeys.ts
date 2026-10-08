/**
 * Portable registry and persistence validation for Plex-local keyboard actions. Bindings are plain
 * values; the host owns event delivery, focus/mode gating and settings storage. Null disables one
 * action. Missing or malformed known entries regain defaults; unknown future entries survive loads.
 */
import type { KeyConvention } from "../contracts/presentationEnvironment";
import type { ShortcutModifier, ShortcutSpec } from "./shortcutPresentation";

export const INTERNAL_HOTKEY_DEFAULTS = {
  moveUp: { key: "ArrowUp" }, moveDown: { key: "ArrowDown" },
  moveLeft: { key: "ArrowLeft" }, moveRight: { key: "ArrowRight" },
  sectionUp: { key: "ArrowUp", modifiers: ["alt"] }, sectionDown: { key: "ArrowDown", modifiers: ["alt"] },
  sectionLeft: { key: "ArrowLeft", modifiers: ["alt"] }, sectionRight: { key: "ArrowRight", modifiers: ["alt"] },
  activate: { key: "Enter" },
  focusSearch: { key: "F4" }, focusFind: { key: "f", modifiers: ["mod"] },
  addParent: { key: "ArrowUp", modifiers: ["mod"] }, addChild: { key: "ArrowDown", modifiers: ["mod"] },
  addFriend: { key: "ArrowLeft", modifiers: ["mod"] }, addChallenger: { key: "ArrowRight", modifiers: ["mod"] },
} as const satisfies Record<string, ShortcutSpec>;
export type InternalHotkeyAction = keyof typeof INTERNAL_HOTKEY_DEFAULTS;
export const INTERNAL_HOTKEY_ACTIONS = Object.keys(INTERNAL_HOTKEY_DEFAULTS) as InternalHotkeyAction[];
export type InternalHotkeys = Record<InternalHotkeyAction, ShortcutSpec | null>;
export type InternalKeyEvent = Readonly<{
  key: string; code?: string; ctrlKey: boolean; metaKey: boolean; altKey: boolean; shiftKey: boolean;
}>;
const MODIFIERS: readonly ShortcutModifier[] = ["mod", "ctrl", "meta", "alt", "shift"];
const MODIFIER_KEYS = ["Control", "Meta", "Alt", "Shift", "AltGraph", "Dead", "Unidentified"];

/** Normalize printable key case without relying on Option-modified letters from the OS. */
export function internalEventKey(event: Pick<InternalKeyEvent, "key" | "code">): string {
  if (event.code?.startsWith("Key") && event.code.length === 4) return event.code.slice(3).toLowerCase();
  if (event.code?.startsWith("Digit") && event.code.length === 6) return event.code.slice(5);
  return event.key.length === 1 ? event.key.toLowerCase() : event.key;
}

/** Accept one complete shortcut, never modifier-only gestures or malformed persisted modifiers. */
function validBinding(value: unknown): value is ShortcutSpec {
  if (!value || typeof value !== "object") return false;
  const key: unknown = Reflect.get(value, "key"), modifiers: unknown = Reflect.get(value, "modifiers");
  return typeof key === "string" && key.length > 0 && !MODIFIER_KEYS.includes(key)
    && (modifiers === undefined || (Array.isArray(modifiers)
      && modifiers.every(/** Reject unknown registration tokens. */ (item: unknown) => MODIFIERS.some(modifier => modifier === item))
      && new Set(modifiers).size === modifiers.length));
}

/** Merge additively and clone bindings so settings edits never mutate registry defaults. */
export function sanitizeInternalHotkeys(raw: unknown): InternalHotkeys {
  const saved = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  const result = { ...saved } as InternalHotkeys;
  for (const action of INTERNAL_HOTKEY_ACTIONS) {
    const candidate: unknown = Reflect.get(saved, action);
    const binding: ShortcutSpec | null = candidate === null || validBinding(candidate) ? candidate : INTERNAL_HOTKEY_DEFAULTS[action];
    result[action] = binding === null ? null : { key: internalEventKey(binding), modifiers: [...(binding.modifiers ?? [])] };
  }
  return result;
}

/** Project a binding to platform-resolved event facts for matching and settings conflict checks. */
export function internalBindingEvent(binding: ShortcutSpec, convention: KeyConvention): InternalKeyEvent {
  const modifiers = binding.modifiers ?? [];
  const mac = convention === "macos" || convention === "ios";
  return {
    key: binding.key,
    ctrlKey: modifiers.includes("ctrl") || (modifiers.includes("mod") && !mac),
    metaKey: modifiers.includes("meta") || (modifiers.includes("mod") && mac),
    altKey: modifiers.includes("alt"), shiftKey: modifiers.includes("shift"),
  };
}

/** Resolve exact modifiers; primary Control/Command follows host-supplied platform conventions. */
export function matchesInternalHotkey(event: InternalKeyEvent, binding: ShortcutSpec, convention: KeyConvention): boolean {
  const expected = internalBindingEvent(binding, convention);
  return internalEventKey(event) === internalEventKey(binding)
    && event.ctrlKey === expected.ctrlKey && event.metaKey === expected.metaKey
    && event.altKey === expected.altKey && event.shiftKey === expected.shiftKey;
}

/** Resolve once in registry order; disabled bindings and extra modifiers never trigger an action. */
export function resolveInternalHotkey(event: InternalKeyEvent, bindings: InternalHotkeys, convention: KeyConvention): InternalHotkeyAction | null {
  return INTERNAL_HOTKEY_ACTIONS.find(/** Match only enabled actions. */ action => {
    const binding = bindings[action];
    return binding !== null && matchesInternalHotkey(event, binding, convention);
  }) ?? null;
}

/** Capture an actual keypress; preserve platform-specific secondary Control/Meta when present. */
export function captureInternalHotkey(event: InternalKeyEvent, convention: KeyConvention): ShortcutSpec | null {
  const key = internalEventKey(event);
  if (MODIFIER_KEYS.includes(key)) return null;
  const mac = convention === "macos" || convention === "ios";
  const modifiers: ShortcutModifier[] = [];
  if (event.ctrlKey) modifiers.push(mac ? "ctrl" : "mod");
  if (event.metaKey) modifiers.push(mac ? "mod" : "meta");
  if (event.altKey) modifiers.push("alt");
  if (event.shiftKey) modifiers.push("shift");
  return { key, modifiers };
}
