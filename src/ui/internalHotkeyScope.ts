/**
 * Typed native keymap registrations for configured internal actions. Each concrete chord is scoped
 * to one K-Plex view; callers guard live focus/mode/settings before handling it. Concrete actions
 * precede optional graph-only text fallbacks with exact empty/Shift modifier masks. Declined text
 * fallback events require the caller's explicit parent bridge; no all-modifier capture is installed.
 * The returned release owns every concrete and text registration.
 */
import type { KeymapContext, Modifier, Scope } from "obsidian";
import type { InternalHotkeyAction, InternalHotkeys } from "../core/plex/internalHotkeys";
import { physicalBindingKeycap, type LocalBinding } from "../core/plex/actionPreferences";
import type { ShortcutModifier } from "../core/plex/shortcutPresentation";

const NATIVE_MODIFIERS: Record<ShortcutModifier, Modifier> = {
  mod: "Mod", ctrl: "Ctrl", meta: "Meta", alt: "Alt", shift: "Shift",
};

/** Register enabled concrete bindings and release precisely this caller's handlers on teardown. */
export function registerInternalHotkeys(scope: Scope | null, bindings: InternalHotkeys, actions: readonly InternalHotkeyAction[], dispatch: (event: KeyboardEvent) => false | undefined): () => void {
  const handlers = actions.flatMap(/** Disabled actions never occupy the native keymap. */ action => {
    const binding = bindings[action];
    return scope && binding ? [scope.register((binding.modifiers ?? []).map(modifier => NATIVE_MODIFIERS[modifier]), binding.key, dispatch)] : [];
  });
  return /** Unregister only the handlers acquired for this settings generation. */ () => {
    for (const handler of handlers) scope?.unregister(handler);
  };
}

/**
 * Register finite effective action chords on the focused-region child Scope. The native host's
 * virtual key uses uppercase letters and base punctuation, independent of produced Option/Shift
 * glyphs; the common dispatcher still validates the actual physical code and modifiers. Optional
 * graph text fallbacks run after concrete bindings for exactly unmodified/Shift input only.
 *
 * @remarks Native 1.14.4 keymap inspection and a temporary Scope normalization probe confirmed
 * KeyR -> R and Shift+Slash -> / virtual keys. A key-null handler stops matching even when it
 * declines; the caller must explicitly forward the original event/context to its captured parent.
 */
export function registerActionHotkeys(scope: Scope, bindings: readonly LocalBinding[], dispatch: (event: KeyboardEvent, context: KeymapContext) => false | undefined, graphTyping = false): () => void {
  const unique = new Set<string>();
  const handlers = bindings.flatMap(/** Duplicate chords register once and are rejected by the shared compiled matcher. */ binding => {
    // Shift belongs to the native modifier mask, not the base virtual-key spelling. Familiar
    // physical keycaps share the existing presentation owner without changing persisted codes.
    const key = binding.match === "key" ? binding.value : physicalBindingKeycap({ ...binding, modifiers: [] }) ?? binding.value;
    if (!key) return [];
    const modifiers = (binding.modifiers ?? []).map(modifier => NATIVE_MODIFIERS[modifier]);
    const token = `${[...modifiers].sort().join("+")}:${key}`;
    if (unique.has(token)) return [];
    unique.add(token);
    return [scope.register(modifiers, key, dispatch)];
  });
  if (graphTyping) {
    handlers.push(scope.register([], null, dispatch), scope.register(["Shift"], null, dispatch));
  }
  return /** Tear down only registrations belonging to this preference and focused-region generation. */ () => {
    for (const handler of handlers) scope.unregister(handler);
  };
}
