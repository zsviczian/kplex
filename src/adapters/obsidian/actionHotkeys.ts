/**
 * Read-only, feature-detected Obsidian hotkey facts. Unpublished manager/command APIs are confined to
 * this adapter; bounded detached snapshots never retain native maps or write hotkey preferences.
 * Native raw-config listeners have an explicit rendered-settings lifetime and no polling timer.
 * Reference: https://github.com/obsidian-typings/obsidian-typings/blob/release/obsidian-public/1.14.4/src/obsidian/internals/hotkey-manager/HotkeyManager.d.ts
 * Native 1.14.4 returns undefined for an absent custom override and [] for explicit disablement;
 * those observed distinctions are more precise than the reference declaration's array-only return.
 */
import type { App, Events } from "obsidian";
import { isLocalBinding, type LocalBinding } from "../../core/plex/actionPreferences";

export type NativeHotkeyCommand = Readonly<{ id: string; name: string; bindings: readonly LocalBinding[] }>;
/** Completeness covers comparable assignments; reserved native Tab chords are deliberately excluded. */
export type NativeHotkeySnapshot = Readonly<{ available: boolean; complete: boolean; commands: readonly NativeHotkeyCommand[] }>;
const MAX_COMMANDS = 10000, MAX_HOTKEYS = 32;
const NATIVE_MODIFIERS = { Mod: "mod", Ctrl: "ctrl", Meta: "meta", Alt: "alt", Shift: "shift" } as const;

/** Narrow host records without assuming a manager exists on every supported Obsidian version. */
function object(value: unknown): value is object { return Boolean(value && typeof value === "object" && !Array.isArray(value)); }

/** Validate public Hotkey values, returning reserved Tab separately from malformed or comparable chords. */
function nativeBinding(raw: unknown): LocalBinding | "reserved-tab" | null {
  if (!object(raw)) return null;
  const key: unknown = Reflect.get(raw, "key"), modifiers: unknown = Reflect.get(raw, "modifiers");
  if (typeof key !== "string" || !Array.isArray(modifiers) || modifiers.length > 5) return null;
  const converted: LocalBinding["modifiers"][number][] = [];
  for (const modifier of modifiers) {
    if (typeof modifier !== "string" || !Object.prototype.hasOwnProperty.call(NATIVE_MODIFIERS, modifier)) return null;
    converted.push(NATIVE_MODIFIERS[modifier as keyof typeof NATIVE_MODIFIERS]);
  }
  // Obsidian tab navigation is valid globally, but Tab is a fixed native traversal/composer key
  // and cannot be assigned locally. Excluding validated Tab facts does not make comparison partial.
  if (key === "Tab") return new Set(converted).size === converted.length ? "reserved-tab" : null;
  const binding = { match: "key" as const, value: key, modifiers: converted };
  return isLocalBinding(binding) ? binding : null;
}

/**
 * Acquire effective registered-command assignments once: custom [] disables defaults, while undefined
 * inherits manager defaults (or registered command hotkeys). Failures remain explicitly incomplete.
 */
function acquireObsidianActionHotkeys(app: App): NativeHotkeySnapshot {
  const manager: unknown = Reflect.get(app, "hotkeyManager"), registry: unknown = Reflect.get(app, "commands");
  if (!object(manager) || !object(registry)) return { available: false, complete: false, commands: [] };
  const custom: unknown = Reflect.get(manager, "getHotkeys"), defaults: unknown = Reflect.get(manager, "getDefaultHotkeys"), registered: unknown = Reflect.get(registry, "commands");
  if (typeof custom !== "function" || typeof defaults !== "function" || !object(registered)) return { available: false, complete: false, commands: [] };
  const commands: NativeHotkeyCommand[] = [];
  let complete = true, count = 0;
  for (const id in registered) {
    if (!Object.prototype.hasOwnProperty.call(registered, id)) continue;
    if (++count > MAX_COMMANDS) { complete = false; break; }
    try {
      const command: unknown = Reflect.get(registered, id);
      if (!object(command) || id.length > 256) { complete = false; continue; }
      const name: unknown = Reflect.get(command, "name");
      if (typeof name !== "string" || !name.trim() || name.length > 2048) { complete = false; continue; }
      const overridden: unknown = custom.call(manager, id);
      const inherited: unknown = overridden === undefined ? defaults.call(manager, id) : overridden;
      const hotkeys: unknown = inherited === undefined ? Reflect.get(command, "hotkeys") : inherited;
      if (hotkeys === undefined) continue;
      if (!Array.isArray(hotkeys)) { complete = false; continue; }
      if (hotkeys.length > MAX_HOTKEYS) complete = false;
      const bindings: LocalBinding[] = [];
      for (const raw of hotkeys.slice(0, MAX_HOTKEYS)) {
        const binding = nativeBinding(raw);
        if (binding === "reserved-tab") continue;
        if (binding) bindings.push(binding); else complete = false;
      }
      if (bindings.length) commands.push({ id, name, bindings });
    } catch { complete = false; }
  }
  return { available: true, complete, commands };
}

/** A missing/throwing compatibility surface cannot prevent native settings from opening. */
export function readObsidianActionHotkeys(app: App): NativeHotkeySnapshot {
  try { return acquireObsidianActionHotkeys(app); }
  catch { return {available: false, complete: false, commands: []}; }
}

/** Subscribe only to the exact active config hotkey path; release retains the public Events lifetime. */
export function subscribeObsidianActionHotkeys(app: App, refresh: () => void): () => void {
  if (!app.vault || typeof app.vault.on !== "function" || typeof app.vault.offref !== "function") return /** Without a native Events surface, no resources need releasing. */ () => {};
  const events: Events = app.vault;
  const ref = events.on("raw", /** Native reload is asynchronous; the controller owns bounded delayed rechecks after this event. */ (...data: unknown[]) => {
    if (data[0] === `${app.vault.configDir}/hotkeys.json`) refresh();
  });
  let live = true;
  return /** Remove this adapter's exact native subscription once, including controller teardown. */ () => { if (live) { live = false; app.vault.offref(ref); } };
}
