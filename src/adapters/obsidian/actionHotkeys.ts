/**
 * Read-only, feature-detected Obsidian hotkey facts. Unpublished manager/command APIs are confined to
 * this adapter; bounded detached snapshots never retain native maps or write hotkey preferences.
 * Assignment presence is independent of comparable collision facts: valid native-only keys still
 * prove assignment, while malformed/partial absence never proves an unassigned command. Native
 * raw-config listeners have an explicit rendered-settings lifetime and no polling timer.
 * Reference: https://github.com/obsidian-typings/obsidian-typings/blob/release/obsidian-public/1.14.4/src/obsidian/internals/hotkey-manager/HotkeyManager.d.ts
 * Native 1.14.4 returns undefined for an absent custom override and [] for explicit disablement;
 * those observed distinctions are more precise than the reference declaration's array-only return.
 */
import type { App, Events } from "obsidian";
import { isLocalBinding, type LocalBinding } from "../../core/plex/actionPreferences";

export type NativeHotkeyCommand = Readonly<{ id: string; name: string; bindings: readonly LocalBinding[] }>;
/** Presence may be positive despite incomplete formatting; bindingsComplete covers the whole safely formattable list. */
export type NativeHotkeyAssignment = Readonly<{ id: string; presence: "assigned" | "unassigned" | "unknown"; bindings: readonly LocalBinding[]; bindingsComplete: boolean }>;
/** Completeness covers comparable diagnostics, never absence authority for an omitted command/assignment. */
export type NativeHotkeySnapshot = Readonly<{ available: boolean; complete: boolean; commands: readonly NativeHotkeyCommand[]; assignments: readonly NativeHotkeyAssignment[] }>;
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
 * Acquire effective assignments in one bounded read. Requested exact command IDs also observe saved
 * custom chords for unpublished commands. Comparable diagnostics remain registered-command-only;
 * their completeness never grants absence authority to the separate assignment-presence facts.
 * Undefined custom values inherit defaults; explicit empty arrays suppress them. A validated chord,
 * including native-only Tab, proves positive assignment even when other entries cannot be observed.
 */
function acquireObsidianActionHotkeys(app: App, requestedIds: readonly string[]): NativeHotkeySnapshot {
  const manager: unknown = Reflect.get(app, "hotkeyManager"), registry: unknown = Reflect.get(app, "commands");
  if (!object(manager) || !object(registry)) return { available: false, complete: false, commands: [], assignments: [] };
  const custom: unknown = Reflect.get(manager, "getHotkeys"), defaults: unknown = Reflect.get(manager, "getDefaultHotkeys"), registered: unknown = Reflect.get(registry, "commands");
  if (typeof custom !== "function" || typeof defaults !== "function" || !object(registered)) return { available: false, complete: false, commands: [], assignments: [] };
  const commands: NativeHotkeyCommand[] = [], assignments: NativeHotkeyAssignment[] = [];
  const observed = new Set<string>();
  let complete = true, count = 0;
  const observe = /** Read each command once, retaining truthful positive facts even in incomplete arrays. */ (id: string, command: unknown, diagnostics: boolean): void => {
    observed.add(id);
    let presence: NativeHotkeyAssignment["presence"] = "unknown", bindingsComplete = false;
    const bindings: LocalBinding[] = [];
    try {
      const overridden: unknown = custom.call(manager, id);
      const inherited: unknown = overridden === undefined ? defaults.call(manager, id) : overridden;
      const hotkeys: unknown = inherited === undefined && object(command) ? Reflect.get(command, "hotkeys") : inherited;
      if (hotkeys === undefined && object(command)) { presence = "unassigned"; bindingsComplete = true; }
      else if (Array.isArray(hotkeys)) {
        let valid = 0, fullyValid = hotkeys.length <= MAX_HOTKEYS;
        bindingsComplete = fullyValid;
        for (const raw of hotkeys.slice(0, MAX_HOTKEYS)) {
          const binding = nativeBinding(raw);
          if (binding === "reserved-tab") { valid++; presence = "assigned"; bindingsComplete = false; }
          else if (binding) { valid++; presence = "assigned"; bindings.push(binding); }
          else { fullyValid = false; bindingsComplete = false; }
        }
        presence = valid ? "assigned" : fullyValid && !hotkeys.length ? "unassigned" : "unknown";
        if (diagnostics && !fullyValid) complete = false;
      } else if (diagnostics && hotkeys !== undefined) complete = false;
      if (diagnostics) {
        const name: unknown = object(command) ? Reflect.get(command, "name") : undefined;
        if (typeof name !== "string" || !name.trim() || name.length > 2048) complete = false;
        else if (bindings.length) commands.push({ id, name, bindings });
      }
    } catch { if (diagnostics) complete = false; bindingsComplete = false; }
    assignments.push({ id, presence, bindings, bindingsComplete });
  };
  for (const id in registered) {
    if (!Object.prototype.hasOwnProperty.call(registered, id)) continue;
    if (++count > MAX_COMMANDS) { complete = false; break; }
    if (id.length > 256) { complete = false; continue; }
    let command: unknown;
    try { command = Reflect.get(registered, id); }
    catch { complete = false; observe(id, undefined, false); continue; }
    if (!object(command)) complete = false;
    observe(id, command, true);
  }
  for (const id of requestedIds.slice(0, MAX_COMMANDS)) {
    if (typeof id !== "string" || !id || id.length > 256 || observed.has(id)) continue;
    observe(id, undefined, false);
  }
  return { available: true, complete, commands, assignments };
}

/** A missing/throwing compatibility surface cannot prevent native settings from opening. */
export function readObsidianActionHotkeys(app: App, requestedIds: readonly string[] = []): NativeHotkeySnapshot {
  try { return acquireObsidianActionHotkeys(app, requestedIds); }
  catch { return {available: false, complete: false, commands: [], assignments: []}; }
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
