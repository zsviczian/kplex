/**
 * Portable after-saving policy for creation dialogs. Navigation and native opening are one
 * remembered choice; unavailable choices fall back locally without overwriting the preference.
 * Legacy action invocations and the former editing toggle retain explicit migration semantics.
 */
import type {CompletionIntent} from './actions';
export const CREATED_NOTE_DESTINATIONS = ['none','sidecar','tab','editor','editor-maximized','window'] as const;
export type CreatedNoteDestination = typeof CREATED_NOTE_DESTINATIONS[number];
export const CREATION_AFTER_SAVING_ACTIONS = ['return','another','follow','sidecar','editor','editor-maximized','tab','window'] as const;
export type CreationAfterSavingAction = typeof CREATION_AFTER_SAVING_ACTIONS[number];
export type CreatedNoteContext = Readonly<{sidepanel: boolean; desktop: boolean}>;
export type CreationCompletionContext = CreatedNoteContext & Readonly<{another: boolean; editable: boolean; follow?: boolean}>;

/** Missing/invalid preferences migrate the former editing toggle to its existing Sidecar route. */
export function sanitizeCreationAfterSaving(value: unknown, legacyEdit = false): CreationAfterSavingAction {
  return CREATION_AFTER_SAVING_ACTIONS.find(/** Unknown values never become opening instructions. */ item=>item===value)
    ?? (legacyEdit ? 'sidecar' : 'return');
}

/** Offer only meaningful choices for this dialog, native surface and device. */
export function creationAfterSavingActions(context: CreationCompletionContext): readonly CreationAfterSavingAction[] {
  return CREATION_AFTER_SAVING_ACTIONS.filter(/** Non-file relationships cannot open an editor; materialization cannot create the same file twice. */ action=>
    action==='return'||action==='follow'&&context.follow!==false||action==='another'&&context.another
    ||context.editable&&action!=='another'&&action!=='follow'&&(action!=='sidecar'||!context.sidepanel)&&(action!=='window'||context.desktop));
}

/** Resolve a local fallback without changing the remembered preference. */
export function effectiveCreationAfterSaving(action: CreationAfterSavingAction, context: CreationCompletionContext): CreationAfterSavingAction {
  if(creationAfterSavingActions(context).includes(action))return action;
  return action==='another'||action==='follow'||!context.editable ? 'return' : 'tab';
}

/** Translate stable command/hotkey intents into the unified form without persisting transient overrides. */
export function resolveCreationAfterSaving(intent: CompletionIntent|CreationAfterSavingAction, preference: CreationAfterSavingAction): CreationAfterSavingAction {
  if(intent==='configured')return preference;
  if(intent==='edit')return preference==='sidecar'||preference==='tab'||preference==='editor'||preference==='editor-maximized'||preference==='window' ? preference : 'editor';
  return intent;
}

/** Execution rechecks native availability, independently of a dialog's earlier option snapshot. */
export function effectiveCreatedNoteDestination(value: CreatedNoteDestination, context: CreatedNoteContext): CreatedNoteDestination {
  return value==='sidecar'&&context.sidepanel||value==='window'&&!context.desktop ? 'tab' : value;
}
