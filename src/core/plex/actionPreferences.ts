/**
 * Bounded workflow-only action preferences, legacy migration and exact chord compilation. Portable
 * laptop defaults use modified physical positions so Option-generated characters still match. No
 * host keymap, storage, graph state or executable values are retained; unknown entries never dispatch.
 */
import type { KeyConvention } from "../contracts/presentationEnvironment";
import type { ShortcutModifier } from "./shortcutPresentation";
import { INTERNAL_HOTKEY_ACTIONS, sanitizeInternalHotkeys, type InternalHotkeyAction } from "./internalHotkeys";
import { ACTION_BY_ID, ACTION_CATALOG, type ActionId, type ActionMetadata, type FocusRegion } from "./actions";
export type LocalBinding = Readonly<{match: "key" | "code"; value: string; modifiers: readonly ShortcutModifier[]}>;
export type ActionPreferencesV1 = {version: 1; defaultBindingsVersion?: number; localBindings: Record<string, readonly LocalBinding[]>; publishedCommands: Record<string, boolean>; characterShortcutsEnabled: boolean; crossSectionAtBoundary: boolean; legacyUnknown?: Record<string, unknown>};
export type ActionKeyEvent = Readonly<{key: string; code?: string; ctrlKey: boolean; metaKey: boolean; altKey: boolean; shiftKey: boolean; isComposing?: boolean; altGraph?: boolean; repeat?: boolean}>;
export type ActionBindingResolution = Readonly<{state: "none"} | {state: "matched"; id: ActionId} | {state: "ambiguous"; ids: readonly ActionId[]}>;
/** Canonical contextual overlap with exact chords at both endpoints for per-shortcut diagnostics. */
export type BindingConflict = Readonly<{first: ActionId; second: ActionId; binding: LocalBinding; secondBinding: LocalBinding; contexts: readonly FocusRegion[]; kind: "collision" | "possible-layout-overlap"}>;
export type PreferenceIssue = Readonly<{actionId?: string; reason: "invalid-binding" | "too-many-bindings" | "too-many-entries" | "unsupported-version"}>;
export type PreferenceResult = Readonly<{preferences: ActionPreferencesV1; issues: readonly PreferenceIssue[]; skippedDefaults: readonly ActionId[]; migrated: boolean; unsupportedVersion?: number}>;
const MODIFIERS: readonly ShortcutModifier[] = ["mod", "ctrl", "meta", "alt", "shift"];
const NAMED_CODES = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Home", "End", "PageUp", "PageDown", "Insert", "Delete", "Backspace", "Escape", "Enter", "Space", "ContextMenu", "CapsLock", "NumLock", "ScrollLock", "Pause", "PrintScreen", "IntlBackslash", "IntlRo", "IntlYen", "Backquote", "Minus", "Equal", "BracketLeft", "BracketRight", "Backslash", "Semicolon", "Quote", "Comma", "Period", "Slash", "NumpadEnter", "NumpadAdd", "NumpadSubtract", "NumpadMultiply", "NumpadDivide", "NumpadDecimal", "NumpadComma", "NumpadEqual", "AudioVolumeUp", "AudioVolumeDown", "AudioVolumeMute", "MediaPlayPause", "MediaStop", "MediaTrackNext", "MediaTrackPrevious"]);
const INVALID_KEYS = ["Control", "Meta", "Alt", "Shift", "AltGraph", "Dead", "Unidentified"];
const PHYSICAL_PUNCTUATION_KEYCAPS: Readonly<Record<string, readonly [string, string]>> = {
  Backquote: ["`", "~"], Minus: ["-", "_"], Equal: ["=", "+"], BracketLeft: ["[", "{"],
  BracketRight: ["]", "}"], Backslash: ["\\", "|"], Semicolon: [";", ":"], Quote: ["'", '"'],
  Comma: [",", "<"], Period: [".", ">"], Slash: ["/", "?"], Space: [" ", " "],
};
export const LEGACY_ACTION_IDS: Readonly<Record<InternalHotkeyAction, ActionId>> = {moveUp: "selection.move.up", moveDown: "selection.move.down", moveLeft: "selection.move.left", moveRight: "selection.move.right", sectionUp: "selection.section.up", sectionDown: "selection.section.down", sectionLeft: "selection.section.left", sectionRight: "selection.section.right", activate: "node.activate", focusSearch: "search.focus", focusFind: "find.focus", addParent: "relationship.create-center.parent", addChild: "relationship.create-center.child", addFriend: "relationship.create-center.left", addChallenger: "relationship.create-center.right"};
/** Build a logical key chord with independent immutable modifiers. */
function key(value: string, ...modifiers: ShortcutModifier[]): LocalBinding { return {match: "key", value, modifiers}; }
/** Keep printable defaults tied to their physical keys when Option changes the produced character. */
function code(value: string, ...modifiers: ShortcutModifier[]): LocalBinding { return {match: "code", value, modifiers}; }
export const ACTION_BINDING_DEFAULTS: Readonly<Partial<Record<ActionId, readonly LocalBinding[]>>> = {
  "selection.move.up": [key("ArrowUp")], "selection.move.down": [key("ArrowDown")], "selection.move.left": [key("ArrowLeft")], "selection.move.right": [key("ArrowRight")],
  "selection.section.up": [key("ArrowUp", "alt")], "selection.section.down": [key("ArrowDown", "alt")], "selection.section.left": [key("ArrowLeft", "alt")], "selection.section.right": [key("ArrowRight", "alt")],
  "node.activate": [key("Enter")], "search.focus": [code("Slash", "alt")], "find.focus": [key("f", "mod")], "relationship.create-center.parent": [key("ArrowUp", "mod")], "relationship.create-center.child": [key("ArrowDown", "mod")], "relationship.create-center.left": [key("ArrowLeft", "mod")], "relationship.create-center.right": [key("ArrowRight", "mod")],
  "actions.open": [code("Period", "alt")], "keyboard.help": [code("Slash", "alt", "shift")], "node.rename": [code("KeyR", "alt")], "graph.focus": [key("g", "mod", "shift")], "editor.focus": [key("e", "mod", "shift")], "selection.center": [code("Digit0", "alt")], "pin.toggle": [code("KeyP", "alt")], "pins.open": [code("KeyB", "alt")], "history.open": [code("KeyH", "alt")], "history.back": [key("Backspace")], "history.forward": [key("Backspace", "shift")], "relationship.connect": [code("KeyC", "alt")], "node.open": [key("Enter", "mod")], "node.context-menu": [code("KeyM", "alt")],
};
/** Accept only bounded plain records from persisted data. */
function record(raw: unknown): Record<string, unknown> { return raw && typeof raw === "object" && !Array.isArray(raw) ? raw as Record<string, unknown> : {}; }
/** Clone a validated binding so no caller can mutate catalog defaults. */
function cloneBinding(binding: LocalBinding): LocalBinding { return {...binding, modifiers: [...binding.modifiers]}; }
/** Validate complete chords and reject redundant platform-independent descriptions. */
export function isLocalBinding(raw: unknown): raw is LocalBinding {
  const value = record(raw), modifiers = value.modifiers;
  return (value.match === "key" || value.match === "code") && typeof value.value === "string" && value.value.length > 0 && value.value.length <= 64 && !INVALID_KEYS.includes(value.value) && value.value !== "Tab" && (value.match === "key" || /^(Key[A-Z]|Digit[0-9]|Numpad[0-9]|F(?:[1-9]|1[0-9]|2[0-4]))$/.test(value.value) || NAMED_CODES.has(value.value)) && Array.isArray(modifiers) && modifiers.length <= 5 && modifiers.every(/** Unknown registration modifiers are never executable. */ item => MODIFIERS.some(/** Match only known modifier values. */ modifier => modifier === item)) && new Set(modifiers).size === modifiers.length;
}
/**
 * Permit an explicitly modified physical position when the OS reports an accent/dead character.
 * Composition, AltGraph and ordinary/Shift-only accent typing retain native ownership; the actual
 * code must be a valid binding position, never a modifier or an unidentified key.
 */
export function isModifiedPhysicalDeadKey(event: ActionKeyEvent): boolean {
  return event.key === "Dead" && !event.isComposing && !event.altGraph && (event.ctrlKey || event.metaKey || event.altKey)
    && isLocalBinding({match: "code", value: event.code, modifiers: []});
}
/** Return effective local chords, preserving an explicit empty array as disabled. */
export function effectiveActionBindings(preferences: ActionPreferencesV1, id: ActionId): readonly LocalBinding[] {
  const bindings = preferences.localBindings[id] ?? ACTION_BINDING_DEFAULTS[id] ?? [];
  return bindings.filter(/** Accessibility opt-out disables unmodified text chords; explicit Option/Cmd chords remain usable. */ binding => preferences.characterShortcutsEnabled || !isCharacterOnlyBinding(binding)).map(cloneBinding);
}
/** Identify printable-only chords, including Shift punctuation, for accessibility and editor ownership. */
function isCharacterOnlyBinding(binding: LocalBinding): boolean {
  if (binding.modifiers.some(/** Shift still produces printable text; other modifiers make an explicit command chord. */ modifier => modifier !== "shift")) return false;
  if (binding.match === "key") return binding.value.length === 1;
  return /^(Key[A-Z]|Digit[0-9]|Numpad[0-9]|Numpad(?:Add|Subtract|Multiply|Divide|Decimal|Comma|Equal)|Space|Backquote|Minus|Equal|BracketLeft|BracketRight|Backslash|Semicolon|Quote|Comma|Period|Slash|IntlBackslash|IntlRo|IntlYen)$/.test(binding.value);
}

/** Restrict printable shortcuts to the canvas while retaining explicit focus chords in owned editors. */
export function actionBindingContexts(action: ActionMetadata, binding: LocalBinding): readonly FocusRegion[] {
  return action.localContexts.filter(/** Native fields keep text input, including Shift punctuation. */ context => !isCharacterOnlyBinding(binding) || context === "graph");
}

/** Resolve publication independently of local binding choices. */
export function isActionPublished(preferences: ActionPreferencesV1, id: ActionId): boolean { return preferences.publishedCommands[id] ?? ACTION_BY_ID.get(id)?.command?.defaultPublished ?? false; }
/** Normalize modifier facts using the caller's actual platform convention. */
function modifierMask(binding: LocalBinding, convention: KeyConvention): string | null {
  const mac = convention === "macos" || convention === "ios";
  const resolved = binding.modifiers.map(/** Mod represents the host's primary modifier. */ modifier => modifier === "mod" ? mac ? "meta" : "ctrl" : modifier);
  if (new Set(resolved).size !== resolved.length) return null;
  return ["ctrl", "meta", "alt", "shift"].map(/** Order canonical facts, never display labels. */ modifier => resolved.some(/** Compare resolved modifier facts. */ item => item === modifier) ? "1" : "0").join("");
}
/** Normalize only printable character case; named keys remain exact. */
function normalizedValue(value: string): string { return value.length === 1 ? value.toLowerCase() : value; }
/** Label familiar physical positions for display without interpreting Option-produced characters. */
export function physicalBindingKeycap(binding: LocalBinding): string | null {
  const value = binding.value;
  if (/^Key[A-Z]$/.test(value)) return value.slice(3);
  if (/^Digit[0-9]$/.test(value)) return value.slice(5);
  return PHYSICAL_PUNCTUATION_KEYCAPS[value]?.[binding.modifiers.includes("shift") ? 1 : 0] ?? null;
}
/** Project common Latin positions only as possible layout overlaps; actual events remain authoritative. */
function physicalCharacter(binding: LocalBinding): string | null {
  if (/^Digit[0-9]$/.test(binding.value) && binding.modifiers.includes("shift")) return ")!@#$%^&*("[Number(binding.value.slice(5))];
  const keycap = physicalBindingKeycap(binding);
  return keycap === null ? null : normalizedValue(keycap);
}
/** Match exact modifiers and key/code identity; only modified physical chords can accept a dead character. */
export function matchesActionBinding(event: ActionKeyEvent, binding: LocalBinding, convention: KeyConvention): boolean {
  if (event.isComposing || event.altGraph || event.key === "Process" || INVALID_KEYS.includes(event.key) && !(binding.match === "code" && isModifiedPhysicalDeadKey(event))) return false;
  const mask = modifierMask(binding, convention);
  if (mask === null || mask !== [event.ctrlKey, event.metaKey, event.altKey, event.shiftKey].map(/** Encode event flags in the compiler's canonical order. */ enabled => enabled ? "1" : "0").join("")) return false;
  return normalizedValue(binding.match === "code" ? event.code ?? "" : event.key) === normalizedValue(binding.value);
}
/** Compile bounded chord/context lookup and both conflict endpoints; saved or imported ambiguity executes neither action. */
export function compileActionBindings(preferences: ActionPreferencesV1, convention: KeyConvention): Readonly<{conflicts: readonly BindingConflict[]; issues: readonly PreferenceIssue[]; match: (event: ActionKeyEvent, context: FocusRegion) => ActionId | null; resolve: (event: ActionKeyEvent, context: FocusRegion) => ActionBindingResolution}> {
  const lookup = new Map<string, Set<ActionId>>(), entries: {id: ActionId; binding: LocalBinding; mask: string; contexts: readonly FocusRegion[]}[] = [], issues: PreferenceIssue[] = [], conflicts: BindingConflict[] = [];
  for (const action of ACTION_CATALOG) for (const binding of effectiveActionBindings(preferences, action.id)) {
    const mask = modifierMask(binding, convention);
    if (mask === null) { issues.push({actionId: action.id, reason: "invalid-binding"}); continue; }
    // Printable shortcuts belong to the canvas even when a focus action also has editor routes.
    // Search/Find fields, native controls and embedded editors must retain their ordinary typing.
    const contexts = actionBindingContexts(action, binding);
    entries.push({id: action.id, binding, mask, contexts});
    for (const context of contexts) {
      const token = `${context}:${mask}:${binding.match}:${normalizedValue(binding.value)}`;
      const ids = lookup.get(token) ?? new Set<ActionId>(); ids.add(action.id); lookup.set(token, ids);
    }
  }
  for (let index = 0; index < entries.length; index++) for (let other = index + 1; other < entries.length; other++) {
    const a = entries[index], b = entries[other];
    if (a.id === b.id || a.mask !== b.mask) continue;
    const contexts = a.contexts.filter(/** Disjoint widget modes may reuse a chord safely. */ context => b.contexts.includes(context));
    if (!contexts.length) continue;
    const same = a.binding.match === b.binding.match && normalizedValue(a.binding.value) === normalizedValue(b.binding.value);
    const overlap = a.binding.match !== b.binding.match && (a.binding.match === "code" ? physicalCharacter(a.binding) === normalizedValue(b.binding.value) : physicalCharacter(b.binding) === normalizedValue(a.binding.value));
    if (same || overlap) conflicts.push({first: a.id, second: b.id, binding: a.binding, secondBinding: b.binding, contexts, kind: same ? "collision" : "possible-layout-overlap"});
  }
  /** Reject IME/AltGraph input; modified dead characters resolve only explicitly physical bindings. */
  const resolve = (event: ActionKeyEvent, context: FocusRegion): ActionBindingResolution => {
    const physicalDead = isModifiedPhysicalDeadKey(event);
    if (event.isComposing || event.altGraph || event.key === "Process" || INVALID_KEYS.includes(event.key) && !physicalDead) return {state: "none"};
    const mask = [event.ctrlKey, event.metaKey, event.altKey, event.shiftKey].map(/** Encode exact active modifiers. */ enabled => enabled ? "1" : "0").join("");
    const ids = new Set([...(physicalDead ? [] : lookup.get(`${context}:${mask}:key:${normalizedValue(event.key)}`) ?? []), ...(lookup.get(`${context}:${mask}:code:${normalizedValue(event.code ?? "")}`) ?? [])]);
    return ids.size === 1 ? {state: "matched", id: [...ids][0]} : ids.size > 1 ? {state: "ambiguous", ids: [...ids]} : {state: "none"};
  };
  /** Compatibility lookup for consumers that do not own event consumption. */
  const match = (event: ActionKeyEvent, context: FocusRegion): ActionId | null => { const result = resolve(event, context); return result.state === "matched" ? result.id : null; };
  return {conflicts, issues, match, resolve};
}
/**
 * Validate v1 and preserve current-generation overlaps. Unmarked legacy loads apply one-time default
 * migration safety; explicit saves opt out immediately, including an unmarked live draft. The marker
 * is workflow metadata, not executable state, and future generations remain protected from rewriting.
 */
export function sanitizeActionPreferences(raw: unknown, fresh = false, convention: KeyConvention = "windows", preserveDefaultConflicts = false): PreferenceResult {
  const saved = record(raw), localBindings: Record<string, readonly LocalBinding[]> = {}, publishedCommands: Record<string, boolean> = {}, issues: PreferenceIssue[] = [];
  for (const [id, value] of Object.entries(record(saved.localBindings)).slice(0, 256)) {
    if (id.length > 128 || ["__proto__", "prototype", "constructor"].includes(id)) { issues.push({reason: "too-many-entries"}); continue; }
    if (!Array.isArray(value) || value.length > 4 || !value.every(isLocalBinding)) { issues.push({actionId: id, reason: Array.isArray(value) && value.length > 4 ? "too-many-bindings" : "invalid-binding"}); localBindings[id] = []; }
    else localBindings[id] = value.map(cloneBinding);
  }
  if (Object.keys(record(saved.localBindings)).length > 256) issues.push({reason: "too-many-entries"});
  for (const [id, value] of Object.entries(record(saved.publishedCommands)).slice(0, 256)) if (id.length <= 128 && !["__proto__", "prototype", "constructor"].includes(id) && typeof value === "boolean") publishedCommands[id] = value;
  const preferences: ActionPreferencesV1 = {version: 1, defaultBindingsVersion: 1, localBindings, publishedCommands, characterShortcutsEnabled: saved.characterShortcutsEnabled !== false, crossSectionAtBoundary: typeof saved.crossSectionAtBoundary === "boolean" ? saved.crossSectionAtBoundary : fresh, ...(saved.legacyUnknown ? {legacyUnknown: boundedUnknown(record(saved.legacyUnknown))} : {})};
  const unsupportedVersion = typeof saved.version === "number" && saved.version !== 1 ? saved.version
    : typeof saved.defaultBindingsVersion === "number" && saved.defaultBindingsVersion > 1 ? saved.defaultBindingsVersion : undefined;
  if (unsupportedVersion !== undefined) issues.push({reason: "unsupported-version"});
  const skippedDefaults = preserveDefaultConflicts || saved.defaultBindingsVersion === 1 ? [] : skipDefaultConflicts(preferences, convention);
  return {preferences, issues, skippedDefaults, migrated: false, ...(unsupportedVersion === undefined ? {} : {unsupportedVersion})};
}
/** Preserve bounded JSON compatibility facts only, excluding functions and oversized data. */
function boundedUnknown(raw: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [id, value] of Object.entries(raw).slice(0, 128)) {
    if (id.length > 128 || ["__proto__", "prototype", "constructor"].includes(id) || !boundedJsonValue(value)) continue;
    try { const json = JSON.stringify(value); if (json !== undefined && json.length <= 4096) result[id] = JSON.parse(json); } catch { /* Cyclic/executable data is not a persistence contract. */ }
  }
  return result;
}
/** Bound unknown JSON before serialization so huge/cyclic values cannot expand compatibility memory. */
function boundedJsonValue(value: unknown, depth = 0, budget = {remaining: 1024}): boolean {
  if (--budget.remaining < 0 || depth > 8) return false;
  if (value === null || typeof value === "boolean" || typeof value === "number") return true;
  if (typeof value === "string") return value.length <= 4096;
  if (typeof value !== "object") return false;
  if (Array.isArray(value)) return value.length <= 64 && value.every(/** Check bounded children before creating any JSON string. */ child => boundedJsonValue(child, depth + 1, budget));
  let count = 0;
  for (const key in value) {
    if (!Object.prototype.hasOwnProperty.call(value, key)) continue;
    if (++count > 64 || key.length > 128 || !boundedJsonValue(Reflect.get(value, key), depth + 1, budget)) return false;
  }
  return true;
}

/** Migrate from raw loadData before defaults merge so existing settings are never called fresh. */
export function migrateActionPreferences(rawPersistedSettings: unknown, convention: KeyConvention = "windows"): PreferenceResult {
  const saved = record(rawPersistedSettings), fresh = rawPersistedSettings === undefined || rawPersistedSettings === null;
  if (record(saved.actionPreferences).version !== undefined) return sanitizeActionPreferences(saved.actionPreferences, fresh, convention);
  const preferences: ActionPreferencesV1 = {version: 1, defaultBindingsVersion: 1, localBindings: {}, publishedCommands: {}, characterShortcutsEnabled: true, crossSectionAtBoundary: fresh};
  if (!fresh) {
    const legacy = sanitizeInternalHotkeys(saved.internalHotkeys);
    for (const id of INTERNAL_HOTKEY_ACTIONS) {
      const binding = legacy[id], mapped = LEGACY_ACTION_IDS[id];
      preferences.localBindings[mapped] = binding === null ? [] : [{match: /^[a-z0-9]$/i.test(binding.key) ? "code" : "key", value: /^[a-z]$/i.test(binding.key) ? `Key${binding.key.toUpperCase()}` : /^[0-9]$/.test(binding.key) ? `Digit${binding.key}` : binding.key, modifiers: [...binding.modifiers ?? []]}];
    }
    const unknown = Object.fromEntries(Object.entries(record(saved.internalHotkeys)).filter(/** Retain future legacy keys, never execute them. */ ([id]) => !INTERNAL_HOTKEY_ACTIONS.includes(id as InternalHotkeyAction)));
    if (Object.keys(unknown).length) preferences.legacyUnknown = boundedUnknown(unknown);
  }
  const skippedDefaults = skipDefaultConflicts(preferences, convention);
  return {preferences, issues: [], skippedDefaults, migrated: true};
}
/** One-time legacy migration protects explicit mappings from newly introduced inherited defaults. */
function skipDefaultConflicts(preferences: ActionPreferencesV1, convention: KeyConvention): ActionId[] {
  const skipped: ActionId[] = [];
  if (!Object.keys(preferences.localBindings).length) return skipped;
  for (const id of Object.keys(ACTION_BINDING_DEFAULTS) as ActionId[]) {
    if (preferences.localBindings[id] !== undefined) continue;
    const conflicts = compileActionBindings(preferences, convention).conflicts.filter(/** Only an explicit user's other mapping may displace a catalog default. */ conflict => {
      if (conflict.first !== id && conflict.second !== id) return false;
      const other = conflict.first === id ? conflict.second : conflict.first;
      return preferences.localBindings[other] !== undefined;
    });
    if (conflicts.length) { preferences.localBindings[id] = []; skipped.push(id); }
  }
  return skipped;
}

/** Capture the chosen matching mode; accent-producing modified keys require explicit physical mode. */
export function captureActionBinding(event: ActionKeyEvent, convention: KeyConvention, match: "key" | "code" = "key"): LocalBinding | null {
  if (event.isComposing || event.altGraph || event.key === "Process" || INVALID_KEYS.includes(event.key) && !(match === "code" && isModifiedPhysicalDeadKey(event))) return null;
  const value = match === "code" ? event.code : normalizedValue(event.key);
  if (!value) return null;
  const mac = convention === "macos" || convention === "ios", modifiers: ShortcutModifier[] = [];
  if (event.ctrlKey) modifiers.push(mac ? "ctrl" : "mod"); if (event.metaKey) modifiers.push(mac ? "mod" : "meta"); if (event.altKey) modifiers.push("alt"); if (event.shiftKey) modifiers.push("shift");
  const binding = {match, value, modifiers}; return isLocalBinding(binding) ? binding : null;
}

/** Compatibility name for consumers presenting effective local chords. */
export const effectiveLocalBindings = effectiveActionBindings;
/** Compatibility name for consumers presenting effective command publication. */
export const effectivePublished = isActionPublished;
/** Inspect K-Plex contextual conflicts without reading any native/global hotkey state. */
export function detectActionBindingConflicts(preferences: ActionPreferencesV1, convention: KeyConvention): readonly BindingConflict[] { return compileActionBindings(preferences, convention).conflicts; }
