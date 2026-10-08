/**
 * Typed native keymap registrations for configured internal actions. Each concrete chord is scoped
 * to one K-Plex view; callers guard live focus/mode/settings before handling it. No wildcard handler
 * can shadow a different action in the same Scope. The returned release owns all registrations.
 */
import type { Modifier, Scope } from "obsidian";
import type { InternalHotkeyAction, InternalHotkeys } from "../core/plex/internalHotkeys";
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
