/** Portable preference-edit helpers shared by native declarative shortcut settings. */
import type { ActionId, ActionMetadata } from "../core/plex/actions";
import { ACTION_BINDING_DEFAULTS, compileActionBindings, type ActionPreferencesV1, type BindingConflict, type LocalBinding } from "../core/plex/actionPreferences";
import type { KeyConvention } from "../core/contracts/presentationEnvironment";

/** Compare actual normalized preference values rather than localized display pills. */
export function actionPreferenceChanged(preferences: ActionPreferencesV1, action: ActionMetadata): boolean {
  const defaults = ACTION_BINDING_DEFAULTS[action.id] ?? [];
  const local = preferences.localBindings[action.id];
  return local !== undefined && JSON.stringify(local) !== JSON.stringify(defaults)
    || preferences.publishedCommands[action.id] !== undefined && preferences.publishedCommands[action.id] !== (action.command?.defaultPublished ?? false);
}

/** Clone already validated JSON compatibility facts without recovering executable values or platform defaults. */
function clonePreferenceValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(/** Compatibility arrays belong to this draft only. */ item => clonePreferenceValue(item));
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(/** Nested compatibility records remain independent from live saved data. */ ([key, item]) => [key, clonePreferenceValue(item)]));
  return value;
}

/** Clone bounded preferences without stripping unknown future action entries or compatibility facts. */
export function cloneActionPreferenceDraft(preferences: ActionPreferencesV1): ActionPreferencesV1 {
  return { ...preferences,
    localBindings: Object.fromEntries(Object.entries(preferences.localBindings).map(/** Clone each bounded saved chord without installing or inheriting defaults. */ ([id, bindings]) => [id, bindings.map(/** Draft modifier arrays never alias live preferences. */ binding => ({ ...binding, modifiers: [...binding.modifiers] }))])),
    publishedCommands: { ...preferences.publishedCommands },
    ...(preferences.legacyUnknown ? { legacyUnknown: Object.fromEntries(Object.entries(preferences.legacyUnknown).map(/** Preserve unknown compatibility facts without sharing nested draft values. */ ([key, value]) => [key, clonePreferenceValue(value)])) } : {}),
  };
}

/** Stage one bounded binding and return relevant conflicts; no original preference object is mutated. */
export function stageActionBinding(preferences: ActionPreferencesV1, action: ActionId, binding: LocalBinding,
  convention: KeyConvention,
): { draft: ActionPreferencesV1; conflicts: readonly BindingConflict[] } | null {
  const draft = cloneActionPreferenceDraft(preferences);
  const current = draft.localBindings[action] ?? ACTION_BINDING_DEFAULTS[action] ?? [];
  if (current.length >= 4) return null;
  if (current.some(/** Duplicate pills carry no additional executable intent. */ saved => JSON.stringify(saved) === JSON.stringify(binding))) return { draft, conflicts: [] };
  draft.localBindings[action] = [...current, binding];
  return { draft, conflicts: compileActionBindings(draft, convention).conflicts.filter(/** Report collisions affected by this change without replacing or blocking either assignment. */ conflict => conflict.first === action || conflict.second === action) };
}
