/**
 * Detached shortcut diagnostics for native action settings. Canonical compilation supplies local
 * contextual conflicts; effective host assignments supply advisory global overlaps. Physical labels
 * only suggest layout overlap, never establish an Option glyph's position or alter executable policy.
 * Native assignment candidates use Obsidian's base virtual-key spelling with Shift kept in modifiers,
 * matching the verified native boundary used by registerActionHotkeys.
 */
import { ACTION_BY_ID, type ActionId } from "../core/plex/actions";
import { compileActionBindings, effectiveActionBindings, matchesActionBinding, physicalBindingKeycap, type ActionPreferencesV1, type BindingConflict, type LocalBinding } from "../core/plex/actionPreferences";
import type { KeyConvention } from "../core/contracts/presentationEnvironment";
import type { NativeHotkeySnapshot } from "../adapters/obsidian/actionHotkeys";

export type ShortcutDiagnostic = Readonly<{
  local: readonly Readonly<{ action: ActionId; possible: boolean }>[];
  obsidian: readonly Readonly<{ id: string; name: string; possible: boolean; self: boolean }>[];
}>;
export type ShortcutDiagnosticSnapshot = ReadonlyMap<ActionId, ReadonlyMap<string, ShortcutDiagnostic>>;

/** Exact saved chord identity distinguishes individual chips on actions with several assignments. */
export function actionBindingIdentity(binding: LocalBinding): string { return JSON.stringify(binding); }

/** Normalize case only for single printable native keys, preserving named-key semantics. */
function keyIdentity(value: string): string { return value.length === 1 ? value.toLowerCase() : value; }

/** Build finite diagnostics; detached recorder-proven conflicts strengthen canonical layout suggestions within this session. */
export function collectActionShortcutConflicts(preferences: ActionPreferencesV1, convention: KeyConvention, native: NativeHotkeySnapshot, captured: readonly BindingConflict[] = []): ShortcutDiagnosticSnapshot {
  const snapshot = new Map<ActionId, Map<string, {local: {action: ActionId; possible: boolean}[]; obsidian: {id: string; name: string; possible: boolean; self: boolean}[]}>>();
  const effective = new Map<ActionId, readonly LocalBinding[]>();
  for (const [id] of ACTION_BY_ID) {
    const bindings = effectiveActionBindings(preferences, id); effective.set(id, bindings);
    snapshot.set(id, new Map(bindings.map(/** Only executable chords receive persistent diagnostics. */ binding => [actionBindingIdentity(binding), {local: [], obsidian: []}])));
  }
  for (const conflict of [...compileActionBindings(preferences, convention).conflicts, ...captured]) {
    for (const [id, other, binding] of [[conflict.first, conflict.second, conflict.binding], [conflict.second, conflict.first, conflict.secondBinding]] as const) {
      const diagnostic = snapshot.get(id)?.get(actionBindingIdentity(binding));
      if (!diagnostic) continue;
      const existing = diagnostic.local.find(/** One observed event can strengthen a layout suggestion without duplicating the label. */ item => item.action === other);
      if (existing) existing.possible = existing.possible && conflict.kind !== "collision";
      else diagnostic.local.push({action: other, possible: conflict.kind !== "collision"});
    }
  }
  const candidates = new Map<string, {id: string; name: string; binding: LocalBinding}[]>();
  for (const command of native.commands) for (const binding of command.bindings) {
    const key = keyIdentity(binding.value), values = candidates.get(key) ?? [];
    values.push({id: command.id, name: command.name, binding}); candidates.set(key, values);
  }
  for (const [id, bindings] of effective) for (const binding of bindings) {
    const keycap = binding.match === "code" ? physicalBindingKeycap({...binding, modifiers: []}) : null;
    // Native 1.14.4 uses base virtual punctuation (Shift+Slash -> /), independently of the
    // displayed shifted keycap. This remains a possible layout projection, never a glyph-to-code inference.
    const value = binding.match === "key" ? binding.value : keycap ?? (/^(Key|Digit|Numpad|Intl)/.test(binding.value) ? null : binding.value);
    if (value === null) continue;
    const diagnostic = snapshot.get(id)!.get(actionBindingIdentity(binding))!;
    for (const candidate of candidates.get(keyIdentity(value)) ?? []) {
      const primary = convention === "macos" || convention === "ios" ? "meta" : "ctrl";
      const modifiers = new Set(candidate.binding.modifiers.map(/** Native Mod uses the same actual primary modifier as the canonical matcher. */ modifier => modifier === "mod" ? primary : modifier));
      if (!matchesActionBinding({key: candidate.binding.value, ctrlKey: modifiers.has("ctrl"), metaKey: modifiers.has("meta"), altKey: modifiers.has("alt"), shiftKey: modifiers.has("shift")}, {...binding, match: "key", value}, convention)) continue;
      if (diagnostic.obsidian.some(/** Several equivalent native assignments need only one command label. */ item => item.id === candidate.id)) continue;
      diagnostic.obsidian.push({id: candidate.id, name: candidate.name, possible: binding.match === "code", self: candidate.id === `k-plex:${ACTION_BY_ID.get(id)?.command?.id}`});
    }
  }
  return snapshot;
}
