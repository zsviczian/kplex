/**
 * Native PR239 acceptance through the existing ontology manager/editor and settings writer.
 * The controlled transport verifies exact staged artifacts; this scenario restores settings,
 * workspace and owned native dialogs independently of assertions. It creates no note content.
 */
import {runControlledProbe} from './controlledProbe.mjs';
import {validateTarget} from './runner.mjs';

/** Exercise authored inverse wording and verify description-only saves never enter source work. */
async function scenario(app,c) {
  const p=app.plugins.plugins['k-plex'];
  if(!p||app.setting.isOpen||app.vault.getFiles().length>=1000)throw Error('Clean disposable Small vault required');
  await p.settingsWriteQueue;await p.settingsReconciliation?.prepare(false);
  const settings=structuredClone(p.settings),policy=p.savedSettingsPolicy,layout=app.workspace.getLayout(),dialogs=[],restores=[];
  const work={reads:0,parses:0,acquisitions:0,rebuilds:0,semantic:0,writes:0},cases=[];
  c.progress={phase:'ontology descriptions',work,cases};
  /** Fail with the exact native acceptance invariant. */
  const check=(value,label)=>{if(!value)throw Error(label)};
  /** Use bounded native waits while retaining cancellation ownership. */
  const until=async(read,label)=>{const end=Date.now()+30000;while(!read()){check(!c.closed&&Date.now()<end,label);await new Promise(resolve=>window.setTimeout(resolve,30))}};
  /** Route authored text through the real native component handler in its owning document. */
  const input=(element,value)=>{check(element,'Native control absent');element.value=value;element.dispatchEvent(new element.ownerDocument.defaultView.Event('input',{bubbles:true}))};
  /** Resolve the current localized native action. */
  const button=(modal,key)=>{const element=[...modal.contentEl.querySelectorAll('button')].find(item=>item.textContent===p.translator(key));check(element,'Action absent: '+key);return element};
  /** Resolve a localized accessible text control, preserving authored content verbatim. */
  const control=(modal,key)=>[...modal.contentEl.querySelectorAll('input,textarea')].find(item=>item.getAttribute('aria-label')===p.translator(key));
  /** Wait for durable native Save and the editor's own successful close. */
  const save=async modal=>{button(modal,'common.save').click();await until(()=>!modal.modalEl.isConnected,'Save did not close editor')};
  /** Forward existing operations unchanged; observations never replace scheduling or semantics. */
  const observe=(owner,key,counter)=>{const original=owner[key];check(typeof original==='function','Missing operation '+key);owner[key]=function(...args){work[counter]++;return original.apply(this,args)};restores.push(()=>owner[key]=original)};
  try {
    await until(()=>!p.isStartupInitializing()&&!p.index.hasPendingSemanticPreparation(),'Initial source work not settled');
    p.openSettings();check(p.settingsTab.openSettingsPage(p.translator('settings.ui.ontology')),'Ontology settings absent');
    await until(()=>p.settingsTab.containerEl.ownerDocument.visibilityState==='visible','Settings owner hidden');
    p.settingsTab.openOntologyManager();const manager=[...p.settingsTab.ontologyManagers][0];check(manager?.opened,'Manager absent');dialogs.push(manager);
    const first='Kplex239 describes',second='Kplex239 described by';
    check(!p.ontologyRoleForField(first)&&!p.ontologyRoleForField(second),'Description fixture fields already exist');
    manager.manager.controls.querySelector('.mod-cta').click();let editor=[...manager.children][0];dialogs.push(editor);
    input(control(editor,'ontology.manager.fieldName'),first);input(editor.partnerControl.inputEl,second);editor.createPartnerControl.toggleEl.click();
    input(control(editor,'ontology.description'), 'Explains the intended use of a physical field.');
    input(control(editor,'ontology.partnerDescription'), 'Names the independent inverse interpretation.');
    await save(editor);
    check(p.settings.ontologyDescriptions[first]==='Explains the intended use of a physical field.'&&p.settings.ontologyDescriptions[second]==='Names the independent inverse interpretation.','Independent wording was not persisted');
    await until(()=>!p.index.hasPendingSemanticPreparation(),'Fixture semantic preparation not settled');
    cases.push('new paired fields retain independent descriptions');
    observe(app.vault,'read','reads');observe(app.vault,'cachedRead','reads');observe(p.index.sourceAcquisition,'parse','parses');observe(p.index.sourceAcquisition,'acquire','acquisitions');observe(p.index,'rebuild','rebuilds');observe(p.index,'invalidateSemanticPolicy','semantic');observe(p,'saveData','writes');
    const revision=p.index.getSemanticRevision();
    /** Open the exact physical field through the current manager search/results. */
    const open=()=>{input(manager.manager.search,first);const row=[...manager.manager.list.querySelectorAll('.kplex-style-manager-row')].find(item=>item.textContent.includes(first));check(row,'Authored field missing from manager');row.click();const dialog=[...manager.children][0];dialogs.push(dialog);if(dialog.fieldName!==first){const select=dialog.endpointControl.selectEl;select.value=first;select.dispatchEvent(new select.ownerDocument.defaultView.Event('change',{bubbles:true}))}return dialog};
    editor=open();input(control(editor,'ontology.description'),'Cancelled wording');button(editor,'common.cancel').click();
    check(work.writes===0&&p.settings.ontologyDescriptions[first]!=='Cancelled wording','Cancel changed authored wording');
    editor=open();input(control(editor,'ontology.description'),'Meaning saved from the actual native editor.');await save(editor);
    check(p.settings.ontologyDescriptions[first]==='Meaning saved from the actual native editor.'&&p.settings.ontologyDescriptions[second]==='Names the independent inverse interpretation.','Description save overwrote inverse wording');
    check(manager.manager.list.textContent.includes('Meaning saved from the actual native editor.'),'Manager omitted saved wording');
    cases.push('native cancel and saved manager description');
    editor=open();input(control(editor,'ontology.partnerDescription'),'Inverse wording edited atomically.');await save(editor);
    check(p.settings.ontologyDescriptions[second]==='Inverse wording edited atomically.','Partner edit not persisted');
    editor=open();input(control(editor,'ontology.description'),'');await save(editor);
    check(!Object.hasOwn(p.settings.ontologyDescriptions,first)&&p.settings.ontologyDescriptions[second]==='Inverse wording edited atomically.','Clearing a description damaged its partner');
    cases.push('independent inverse edit and clearing');
    check(work.writes===3,'Description edits did not use exactly one write each');
    for(const key of ['reads','parses','acquisitions','rebuilds','semantic'])check(work[key]===0,'Description-only UI performed '+key);
    check(p.index.getSemanticRevision()===revision,'Description edits changed semantic revision');
    cases.push('zero source work and unchanged semantic revision');
    return {cases,work,semanticRevision:revision,limitations:'Native Windows component activation; physical mobile, macOS and actual two-device Sync remain separate.'};
  } finally {
    const errors=[];
    /** Continue independent restoration even if another cleanup step fails. */
    const clean=async run=>{try{await run()}catch(error){errors.push(String(error))}};
    for(const restore of restores.reverse())await clean(restore);
    for(const dialog of dialogs.reverse())await clean(()=>dialog.close());
    if(app.setting.isOpen)await clean(()=>app.setting.close());
    await clean(()=>p.settingsWriteQueue);p.settings=settings;p.savedSettingsPolicy=policy;
    await clean(()=>p.saveSettings(false,false));await clean(()=>p.index.refreshPresentationSettings());await clean(()=>p.index.refreshSemanticSettings());
    await clean(()=>app.workspace.changeLayout(layout));await new Promise(resolve=>window.setTimeout(resolve,2500));
    await clean(()=>app.vault.adapter.write(p.manifest.dir+'/data.json',c.originalData));
    if(errors.length)throw Error('Description cleanup: '+errors.join('; '));
  }
}

if(process.env.KPLEX_TEST_VAULT_NAME!=='kplex-test-small')throw Error('Explicit disposable Small vault required');
const {readFileSync}=await import('node:fs'),{join}=await import('node:path');
const target=validateTarget({vaultName:process.env.KPLEX_TEST_VAULT_NAME,vaultPath:process.env.KPLEX_TEST_VAULT_PATH,configDir:process.env.KPLEX_TEST_CONFIG_DIR});
const original=readFileSync(join(target.pluginDir,'data.json'),'utf8');
await runControlledProbe('ontology-descriptions-239',scenario,'c.originalData='+JSON.stringify(original)+';',[
  'src/ui/AddToOntologyModal.ts','src/ui/OntologyManagerModal.ts','src/core/contracts/ontologyReadModel.ts','src/main.ts','src/settings.ts',
]);
