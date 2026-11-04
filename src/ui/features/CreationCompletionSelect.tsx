/**
 * One accessible After saving select shared by note creation/materialization dialogs.
 * Hosts own persistence and completion; this control accepts only currently offered values.
 */
import {createElement} from 'react';
import type {Translator} from '../../lang';
import type {CreationAfterSavingAction} from '../../core/plex/createdNoteDestination';
import {FormSelect} from '../components/FormSelect';
export type CreatedNoteCompletionControl=Readonly<{
  value: CreationAfterSavingAction;
  choices: readonly CreationAfterSavingAction[];
  onChange: (value: CreationAfterSavingAction)=>void;
}>;

/** Render the remembered outcome with the existing After saving caption and no additional label. */
export function CreationCompletionSelect({translate,value,choices,onChange,disabled=false,labelForChoice}:CreatedNoteCompletionControl&{
  translate:Translator;disabled?:boolean;labelForChoice?:(choice:CreationAfterSavingAction)=>string;
}){
  return createElement(FormSelect,{className:'kplex-creation-completion kplex-add-related-completion',
    label:translate('addRelated.completionMode'),value,disabled,control:'creation-completion',
      onChange:/** Reject unavailable/synthetic values and edits during native writes. */(value:string)=>{
        const choice=choices.find(/** Match the exact offered action. */item=>item===value);
        if(!disabled&&choice)onChange(choice);
      },
    children:choices.map(/** Localized labels never enter persisted action values. */choice=>createElement('option',{
      key:choice,value:choice,
    },labelForChoice?.(choice) ?? translate(`creation.afterSaving.${choice}`)))});
}
