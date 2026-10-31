/** Native structured ontology editor. Drafts are local; complete field/pair intents enter the
 * established queue once, with raw endpoint conflict checks and durable-before-publication semantics.
 * Description rows stack their labels above full-width literal text editors. */
import {Modal,Notice,Setting,type ButtonComponent,type DropdownComponent,type TextComponent,type TextAreaComponent,type ToggleComponent} from 'obsidian';
import type KplexPlugin from '../main';
import {normalizeFieldName} from '../core/contracts/fieldName';
import {ontologyConfiguration,eligibleOntologyPartners,applyOntologyEdit,ONTOLOGY_RECIPROCAL,type OntologyRole,type OntologyConfigurationInput,type OntologyEdit} from '../core/contracts/ontologyConfiguration';
import {ONTOLOGY_DESCRIPTION_LIMIT,validateOntologyDescription,ontologyDescription,ontologyReadModel} from '../core/contracts/ontologyReadModel';
import {ontologyRoleLabel} from './features/ontologyPresentation';
import {OntologyPartnerSuggest} from './OntologyPartnerSuggest';
import {OntologyUsageModal} from './OntologyUsageModal';
import type {OntologyUsageResult} from '../adapters/obsidian/ontologyUsage';

export type OntologyAssignmentRole=OntologyRole;

export class AddToOntologyModal extends Modal {
  private opened=false;
  private busy=false;
  private committed=false;
  private generation=0;
  private selected:OntologyRole='child';
  private partner='';
  private createPartner=false;
  private removing=false;
  private composing=false;
  private newField=false;
  private readonly descriptionDrafts=new Map<string,string>();
  private readonly physicalNames=new Map<string,string>();
  private partnerDescriptionControl:TextAreaComponent|null=null;
  private partnerDescriptionRow:Setting|null=null;
  private opening:OntologyConfigurationInput|null=null;
  private current:()=>boolean=()=>false;
  private saveButton:ButtonComponent|null=null;
  private cancelButton:ButtonComponent|null=null;
  private roleControl:DropdownComponent|null=null;
  private partnerControl:TextComponent|null=null;
  private partnerRow:Setting|null=null;
  private createPartnerRow:Setting|null=null;
  private createPartnerControl:ToggleComponent|null=null;
  private resolutionRow:Setting|null=null;
  private feedback:HTMLElement|null=null;
  private preview:HTMLElement|null=null;
  private suggestions:OntologyPartnerSuggest|null=null;
  private endpointControl:DropdownComponent|null=null;
  private releaseWindow:(()=>void)|null=null;
  private readonly usageDialogs=new Set<OntologyUsageModal>();

  /** Empty names open Add field; a connection caller can retain its captured relationship role.
   * Existing identities stay read-only. Save returns the accepted physical name to its owner. */
  constructor(private plugin:KplexPlugin,private fieldName:string,private onSaved?:(field:string)=>void,private onClosed?:()=>void,private onUsage?:(field:string,result:OntologyUsageResult)=>void,private context?:Readonly<{role:OntologyRole}>){super(plugin.app);}

  /** Capture raw configuration and remote owner before mounting an explicit Save/Cancel form. */
  onOpen():void {
    this.opened=true;this.committed=false;this.newField=!this.fieldName;this.generation++;
    this.opening=structuredClone({hierarchy:this.plugin.settings.hierarchy,ontologyPairingVersion:this.plugin.settings.ontologyPairingVersion,ontologyDescriptions:this.plugin.settings.ontologyDescriptions});
    this.physicalNames.clear();
    for(const field of ontologyReadModel(ontologyConfiguration(this.opening)))this.physicalNames.set(field.key,field.name);
    if(!this.newField)this.fieldName=this.canonicalName(this.fieldName);
    const hierarchyOwner=this.plugin.receivedSettingsOwner('hierarchy'),descriptionOwner=this.plugin.receivedSettingsOwner('ontologyDescriptions');
    this.current=/** Both roots belong to this detached vocabulary draft. */ ()=>hierarchyOwner()&&descriptionOwner();
    this.descriptionDrafts.clear();
    this.render();
    const view=this.contentEl.ownerDocument.defaultView;
    const close=():void=>this.close();
    view?.addEventListener('pagehide',close,{once:true});
    this.releaseWindow=()=>view?.removeEventListener('pagehide',close);
  }

  /** Build the shared editor for one selected physical endpoint; switching endpoints is offered before edits. */
  private render():void {
    this.suggestions?.close();this.contentEl.empty();
    const t=this.plugin.translator,config=ontologyConfiguration(this.opening!);
    this.selected=config.roles.get(normalizeFieldName(this.fieldName))??this.context?.role??'child';
    this.partner=config.pairs.get(normalizeFieldName(this.fieldName))?.partner??'';
    this.createPartner=false;this.removing=false;
    this.setTitle(this.fieldName?t('ontology.addTitle',{field:this.fieldName}):t('ontology.manager.add'));
    const pair=config.pairs.get(normalizeFieldName(this.fieldName));
    if(pair)new Setting(this.contentEl).setName(t('ontology.manager.endpoint')).addDropdown(/** Either endpoint can be removed or unpaired explicitly. */ dropdown=>{
      this.endpointControl=dropdown;dropdown.addOption(pair.field,pair.field).addOption(pair.partner,pair.partner).setValue(pair.field).onChange(/** Endpoint navigation never saves a draft. */ value=>{this.fieldName=value;this.render();});
    });
    else this.endpointControl=null;
    new Setting(this.contentEl).setName(t('ontology.manager.fieldName')).addText(/** Existing names are physical identities, not captions to rename. */ text=>{
      text.setValue(this.fieldName);text.inputEl.readOnly=Boolean(this.fieldName);
      text.inputEl.setAttribute('aria-label',t('ontology.manager.fieldName'));
      if(!this.fieldName)text.onChange(/** New names remain local until explicit Save; their description follows the typed draft. */ value=>{const description=this.description(this.fieldName);this.fieldName=value;this.descriptionDrafts.set(this.canonicalName(value),description);this.refresh();});
    });
    if(this.fieldName)new Setting(this.contentEl).addButton(/** Inspect the selected physical name without submitting or replacing this draft. */ button=>button.setButtonText(t('ontology.usage.show')).onClick(/** Each child owns a cancellable read-only lookup. */ ()=>{
      const field=this.fieldName,dialog=new OntologyUsageModal(this.plugin,field,()=>this.usageDialogs.delete(dialog),/** Pass the captured physical field, without changing the editor draft. */ result=>{if(this.opened)this.onUsage?.(field,result);});this.usageDialogs.add(dialog);dialog.open();
    }));
    const descriptionRow=new Setting(this.contentEl).setName(t('ontology.description')).setDesc(t('ontology.descriptionHelp',{count:ONTOLOGY_DESCRIPTION_LIMIT})).addTextArea(/** The description belongs to this exact physical name and stays local until Save. */ text=>{
      text.setValue(this.description(this.fieldName));text.inputEl.maxLength=ONTOLOGY_DESCRIPTION_LIMIT;text.inputEl.setAttribute('aria-label',t('ontology.description'));text.inputEl.rows=3;
      text.onChange(/** Authored text is literal, including line breaks; no Markdown rendering occurs. */ value=>{this.descriptionDrafts.set(this.canonicalName(this.fieldName),value);this.refresh();});
    });
    descriptionRow.settingEl.addClass('kplex-ontology-description-setting');
    new Setting(this.contentEl).setName(t('ontology.relationshipRole')).addDropdown(/** Pair role changes derive the reciprocal only in this local candidate. */ dropdown=>{
      this.roleControl=dropdown;
      for(const role of ['parent','child','left','right','previous','next','hidden','excluded'] as const)dropdown.addOption(role,ontologyRoleLabel(role,t));
      dropdown.setValue(this.selected).onChange(/** Changing to a non-pairable state requires explicit unpairing. */ value=>{this.selected=value as OntologyRole;this.suggestions?.close();this.refresh();});
    });
    this.partnerRow=new Setting(this.contentEl).setName(t('ontology.pairWith')).setDesc(t('ontology.pairOptionalHelp')).addText(/** Eligible existing physical fields share the native suggester. */ text=>{
      this.partnerControl=text;text.setValue(this.partner).setPlaceholder(t('ontology.pairNone'));
      text.inputEl.setAttribute('aria-label',t('ontology.pairWith'));
      text.onChange(/** Typed partner names do not create vocabulary without the explicit new-field choice. */ value=>{this.partner=value;this.refresh();});
      this.suggestions=new OntologyPartnerSuggest(this.app,text.inputEl,()=>this.eligible(),/** Creation is an explicit local choice; both fields still share the single Save. */ (field,create)=>{if(this.opened&&!this.busy){this.partner=field;this.createPartner=create;this.refresh();}},()=>ontologyConfiguration(this.plugin.settings),t,field=>this.canCreatePartner(field),()=>this.plugin.settings.ontologyDescriptions);
    });
    this.partnerDescriptionRow=new Setting(this.contentEl).setName(t('ontology.partnerDescription')).setDesc(t('ontology.partnerDescriptionHelp')).addTextArea(/** A partner has independent wording, including when both endpoints are newly created. */ text=>{
      this.partnerDescriptionControl=text;text.setValue(this.description(this.partner));text.inputEl.maxLength=ONTOLOGY_DESCRIPTION_LIMIT;text.inputEl.setAttribute('aria-label',t('ontology.partnerDescription'));text.inputEl.rows=3;
      text.onChange(/** Keep drafts keyed by exact partner so choosing another field cannot overwrite it. */ value=>{this.descriptionDrafts.set(this.canonicalName(this.partner),value);this.refresh();});
    });
    this.partnerDescriptionRow.settingEl.addClass('kplex-ontology-description-setting');
    this.createPartnerRow=new Setting(this.contentEl).setName(t('ontology.manager.createPartner')).setDesc(t('ontology.manager.createPartnerHelp')).addToggle(/** Creating a second new physical field is an explicit draft choice. */ toggle=>{this.createPartnerControl=toggle;toggle.setValue(false).onChange(/** Revalidate the whole two-name candidate. */ value=>{this.createPartner=value;this.refresh();});});
    this.preview=this.contentEl.createEl('p',{cls:'setting-item-description kplex-ontology-preview',attr:{role:'status'}});
    this.resolutionRow=new Setting(this.contentEl).addButton(/** Clear the partner explicitly, preserving its old role on Save. */ button=>button.setButtonText(t('ontology.clearPair')).onClick(/** No write happens until Save. */ ()=>{this.partner='';this.createPartner=false;this.partnerControl?.setValue('');this.refresh();}));
    if(config.roles.has(normalizeFieldName(this.fieldName)))new Setting(this.contentEl).setName(t('ontology.manager.removeHelp')).addButton(/** Removal is a two-step inline confirmation naming the selected physical endpoint. */ button=>{
      button.setButtonText(t('ontology.manager.remove')).setDestructive().onClick(/** Require a second explicit durable confirmation. */ ()=>{this.removing=true;this.refresh();});
    });
    this.feedback=this.contentEl.createEl('p',{cls:'mod-warning',attr:{role:'alert'}});
    new Setting(this.contentEl).addButton(/** Duplicate submissions are excluded while the queue owns this operation. */ button=>{this.saveButton=button;button.setCta().onClick(/** Submit the complete detached candidate once. */ ()=>{void this.save();});})
      .addButton(/** Cancel never submits an unaccepted draft. */ button=>{this.cancelButton=button;button.setButtonText(t('common.cancel')).onClick(()=>this.close());});
    for(const input of Array.from(this.contentEl.querySelectorAll<HTMLInputElement|HTMLTextAreaElement>('input,textarea'))){
      input.addEventListener('compositionstart',/** Composition is an unsubmitted draft, even if Save is clicked. */ ()=>{this.composing=true;this.refresh();});
      input.addEventListener('compositionend',/** Validate only after the IME owns its final text. */ ()=>{this.composing=false;this.refresh();});
    }
    this.refresh();
  }

  /** Offer the current partner for pair-wide role edits, plus only compatible unclaimed fields. */
  private eligible():string[]{
    const config=ontologyConfiguration(this.plugin.settings),pair=ontologyConfiguration(this.opening!).pairs.get(normalizeFieldName(this.fieldName));
    const fields=eligibleOntologyPartners(config,this.fieldName,this.selected);
    if(pair&&ONTOLOGY_RECIPROCAL[this.selected]&&!fields.includes(pair.partner))fields.unshift(pair.partner);
    return fields;
  }

  /** Offer creation only when the canonical validator accepts both current draft endpoints. */
  private canCreatePartner(field:string):boolean {
    if(!this.opened||this.busy||this.committed||this.composing||this.removing)return false;
    try{applyOntologyEdit(this.plugin.settings,{kind:'assign',field:this.fieldName.trim(),role:this.selected,partner:field,createPartner:true});return true;}catch{return false;}
  }

  /** Resolve existing normalized aliases to their saved physical spelling; new names retain trimmed authored identity. */
  private canonicalName(field:string):string {return this.physicalNames.get(normalizeFieldName(field))??field.trim();}

  /** Read an exact-name draft before its opening saved value; a new name starts with no inferred meaning. */
  private description(field:string):string {const name=this.canonicalName(field);return this.descriptionDrafts.get(name)??ontologyDescription(this.opening?.ontologyDescriptions,name)??'';}

  /** Convert local controls to one finite typed operation; the writer repeats all validation. */
  private operation():OntologyEdit {
    if(this.removing)return {kind:'remove',field:this.fieldName};
    const config=ontologyConfiguration(this.opening!),pair=config.pairs.get(normalizeFieldName(this.fieldName)),partner=this.partner.trim()?this.canonicalName(this.partner):null;
    return {kind:'assign',field:this.canonicalName(this.fieldName),role:this.selected,partner,createPartner:this.createPartner,description:this.description(this.fieldName),partnerDescription:partner?this.description(partner):undefined,
      movePair:Boolean(pair&&partner&&normalizeFieldName(pair.partner)===normalizeFieldName(partner)&&this.selected!==pair.role)};
  }

  /** Validate a complete local candidate without graph/source work or persistence. */
  private valid():boolean {try{if(this.newField&&ontologyConfiguration(this.opening!).roles.has(normalizeFieldName(this.fieldName)))return false;const operation=this.operation();applyOntologyEdit(this.opening!,operation);if(operation.kind==='assign'){validateOntologyDescription(operation.description??'');validateOntologyDescription(operation.partnerDescription??'');}return true;}catch{return false;}}

  /** Show both derived assignments, destructive scope and inline candidate feedback. */
  private refresh():void {
    const t=this.plugin.translator,valid=this.valid(),reciprocal=ONTOLOGY_RECIPROCAL[this.selected],pair=ontologyConfiguration(this.opening!).pairs.get(normalizeFieldName(this.fieldName));
    this.partnerRow?.settingEl.toggle(Boolean(reciprocal));
    this.createPartnerRow?.settingEl.toggle(Boolean(reciprocal));
    this.partnerDescriptionRow?.settingEl.toggle(Boolean(reciprocal&&this.partner.trim()));
    this.partnerDescriptionControl?.setValue(this.description(this.partner.trim()));
    this.createPartnerControl?.setValue(this.createPartner).setDisabled(this.busy||this.removing);
    this.resolutionRow?.settingEl.toggle(Boolean(this.partner));
    if(this.preview){
      const primary=`${this.fieldName} · ${pair&&this.selected!==pair.role?ontologyRoleLabel(pair.role,t)+' → ':''}${ontologyRoleLabel(this.selected,t)}`;
      // Hidden/Excluded drafts still name their configured partner until explicit unpairing.
      // Hiding the optional input must not hide which physical assignment will be preserved.
      const partnerRole=reciprocal??pair?.partnerRole;
      const partner=this.partner?`${this.partner}${partnerRole?' · '+(reciprocal&&pair&&this.selected!==pair.role?ontologyRoleLabel(pair.partnerRole,t)+' → ':'')+ontologyRoleLabel(partnerRole,t):''}`:'';
      const retained=pair&&normalizeFieldName(this.partner)!==normalizeFieldName(pair.partner)?' · '+t('ontology.manager.retainedPartner',{field:pair.partner,role:ontologyRoleLabel(pair.partnerRole,t)}):'';
      this.preview.setText(this.removing?t('ontology.manager.removeConfirm',{field:this.fieldName}):[primary,partner].filter(Boolean).join(' ↔ ')+retained);
    }
    if(this.feedback){this.feedback.setText(valid?'':t(!normalizeFieldName(this.fieldName)||this.newField&&ontologyConfiguration(this.opening!).roles.has(normalizeFieldName(this.fieldName))?'ontology.manager.nameRequired':'ontology.pairIncompatible'));this.feedback.toggle(!valid);}
    const pairMove=reciprocal&&pair&&this.partner&&normalizeFieldName(pair.partner)===normalizeFieldName(this.partner)&&this.selected!==pair.role;
    this.modalEl.setAttribute('aria-busy',String(this.busy));
    for(const button of Array.from(this.contentEl.querySelectorAll('button')))if(button!==this.cancelButton?.buttonEl)button.disabled=this.busy||this.committed;
    this.saveButton?.setButtonText(t(this.removing?'ontology.manager.confirmRemove':pairMove?'ontology.manager.saveBoth':'common.save')).setDisabled(this.busy||this.committed||this.composing||!valid);
    this.roleControl?.setDisabled(this.busy||this.removing||Boolean(this.context));this.partnerControl?.setDisabled(this.busy||this.removing);
    for(const input of Array.from(this.contentEl.querySelectorAll<HTMLInputElement|HTMLTextAreaElement>('input,textarea')))input.disabled=this.busy||this.committed||this.removing;
    this.endpointControl?.setDisabled(this.busy||this.removing||this.createPartner||this.composing||this.selected!==pair?.role||this.partner!==pair?.partner||[...this.descriptionDrafts].some(/** Endpoint navigation cannot discard unsaved wording. */ ([field,text])=>text!==(ontologyDescription(this.opening?.ontologyDescriptions,this.canonicalName(field))??'')));
  }

  /** Queue acceptance fences remote owners and affected raw endpoints; saved-pending is never retried. */
  private async save():Promise<void> {
    if(!this.opened||this.busy||this.committed||this.composing||!this.opening||!this.valid())return;
    this.busy=true;this.refresh();const generation=this.generation;
    try{
      const result=await this.plugin.editOntologyConfiguration(this.operation(),this.opening,this.current);
      if(!this.opened||this.generation!==generation)return;
      this.committed=true;
      if(result.refreshPending)new Notice(this.plugin.translator('styles.operation.savedRefreshPending'));
      this.onSaved?.(this.fieldName.trim());this.close();
    }catch(error){
      if(this.opened&&this.generation===generation&&this.feedback){this.feedback.setText(this.plugin.translator(this.committed?'styles.operation.savedRefreshPending':error instanceof Error&&error.name==='SettingsValidationError'?'ontology.pairInvalid':error instanceof Error&&error.name==='SettingsConflictError'?'settings.ontology.conflict':'styles.operation.notSaved'));this.feedback.toggle(true);}
    }finally{this.busy=false;if(this.opened&&this.generation===generation){this.modalEl.setAttribute('aria-busy','false');for(const button of Array.from(this.contentEl.querySelectorAll('button')))if(button!==this.cancelButton?.buttonEl)button.disabled=this.committed;this.saveButton?.setDisabled(this.committed||!this.valid());this.roleControl?.setDisabled(this.committed||this.removing||Boolean(this.context));this.createPartnerControl?.setDisabled(this.committed||this.removing);for(const input of Array.from(this.contentEl.querySelectorAll<HTMLInputElement|HTMLTextAreaElement>('input,textarea')))input.disabled=this.committed||this.removing;}}
  }

  /** Retire only this invocation; an operation already accepted by storage remains owned by the queue. */
  onClose():void {
    const notify=this.opened;this.opened=false;this.suggestions?.close();this.suggestions=null;this.releaseWindow?.();this.releaseWindow=null;
    for(const dialog of this.usageDialogs)dialog.close();this.usageDialogs.clear();
    this.contentEl.empty();if(notify)this.onClosed?.();
  }
}
