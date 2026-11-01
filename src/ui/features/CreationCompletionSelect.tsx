/**
 * One accessible After saving select shared by note creation/materialization dialogs.
 * Hosts own persistence and completion; this control accepts only currently offered values.
 */
import {createElement} from 'react';
import type {Translator} from '../../lang';
import type {CreationAfterSavingAction} from '../../core/plex/createdNoteDestination';
export type CreatedNoteCompletionControl=Readonly<{
  value: CreationAfterSavingAction;
  choices: readonly CreationAfterSavingAction[];
  onChange: (value: CreationAfterSavingAction)=>void;
}>;

/** Render the remembered outcome with the existing After saving caption and no additional label. */
export function CreationCompletionSelect({translate,value,choices,onChange,disabled=false}:CreatedNoteCompletionControl&{
  translate:Translator;disabled?:boolean;
}){
  return createElement('label',{className:'kplex-creation-completion kplex-add-related-completion'},
    createElement('span',{className:'kplex-creation-completion-caption'},translate('addRelated.completionMode')),
    createElement('select',{className:'dropdown',value,disabled,
      'aria-label':translate('addRelated.completionMode'),'data-kplex-control':'creation-completion',
      onChange:/** Reject unavailable/synthetic values and edits during native writes. */(event:{currentTarget:HTMLSelectElement})=>{
        const choice=choices.find(/** Match the exact offered action. */item=>item===event.currentTarget.value);
        if(!disabled&&choice)onChange(choice);
      },
    },...choices.map(/** Localized labels never enter persisted action values. */choice=>createElement('option',{
      key:choice,value:choice,
    },translate(`creation.afterSaving.${choice}`)))));
}
