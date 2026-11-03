/** Exact-build PR267 acceptance on the explicitly verified disposable Small vault. Runs the
 * maintained guide's actual helpers through public Obsidian writers, restores all owned notes,
 * settings and workspace state, and serializes native activity with other repository agents. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {homedir} from 'node:os';
import {runControlledProbe} from './controlledProbe.mjs';
import {validateTarget} from './runner.mjs';
import {acquireHostLock} from './hostLock.mjs';

/** Exercise bounded stored-fact discovery, selected-source inspection and reviewed config;
 * fixture migration uses only the guide's extracted public-host functions, never parser copies. */
async function scenario(app,c){
 let p=app.plugins.plugins['k-plex'];const api=window.kplexApi?.v1;
 const inventory=app.vault.getMarkdownFiles().map(file=>file.path).sort();
 if(!p||!api||inventory.length>=1000||app.setting.isOpen)throw Error('Clean disposable Small vault required');
 const layout=app.workspace.getLayout(),settings=structuredClone(p.settings),policy=p.savedSettingsPolicy;
 const files=[],leaves=[],restores=[],cases=[],runtimeErrors=[],work={reads:0,cached:0,acquire:0,parse:0,rebuild:0,semantic:0};
 /** Keep unexpected native event failures visible instead of inferring success from assertions alone. */
 const onError=event=>runtimeErrors.push(String(event.error?.stack??event.reason?.stack??event.message??event.reason));
 window.addEventListener('error',onError);window.addEventListener('unhandledrejection',onError);
 restores.push(()=>{window.removeEventListener('error',onError);window.removeEventListener('unhandledrejection',onError);});
 const suffix=crypto.randomUUID().replaceAll('-','').slice(0,8),old='KP267 old '+suffix,canonical='KP267 canonical '+suffix,inverse='KP267 inverse '+suffix;
 const mappings=[{from:old,to:canonical}],fields=[old,canonical,inverse],wc=require('@electron/remote').getCurrentWebContents();
 let debugOwned=false,measuring=false,inspectionRetries=0;
 /** Assertions are bounded by the driver lifetime and retain the actual public failure envelope. */
 const check=(value,label)=>{if(c.closed||!value)throw Error(label);};
 /** Consume successful envelopes explicitly instead of treating empty or partial responses as proof. */
 const value=result=>{check(result?.ok,'Public failure: '+JSON.stringify(result));return result.value;};
 /** Our own saved writes can publish ordinary index revisions during an inspection await.
  * Retry only a fresh read, never a mutation or an expected-snapshot refusal, with a finite cap. */
 const inspectCurrent=async request=>{for(let attempt=0;attempt<8;attempt++){const result=await api.inspectOntologyOccurrences(request);if(result.ok||result.error?.code!=='STALE_REVISION')return value(result);inspectionRetries++;await new Promise(resolve=>window.setTimeout(resolve,80));}throw Error('Fresh inspection did not settle after eight attempts');};
 /** Native completion/index cleanup uses finite host waits without changing scheduler policy. */
 const until=async(read,label)=>{const end=Date.now()+30000;while(!await read()){check(Date.now()<end,label);await new Promise(resolve=>window.setTimeout(resolve,40));}};
 /** Forward existing operations unchanged, counting only explicitly measured API intervals. */
 const observe=(owner,key,counter)=>{const original=owner[key];check(typeof original==='function','Missing owner '+key);owner[key]=function(...args){if(measuring)work[counter]++;return original.apply(this,args)};restores.push(()=>owner[key]=original);};
 /** Create only unique owned fixture notes; all are deleted in finally. */
 const create=async(name,text)=>{const file=await app.vault.create('__kplex267_'+suffix+'_'+name+'.md',text);files.push(file);return file;};
 /** A refused write must leave its exact saved source unchanged. */
 const refuses=async(run,file,label)=>{const before=await app.vault.read(file);let failed=false;try{await run()}catch{failed=true}check(failed&&await app.vault.read(file)===before,label);};
 /** Only this controller owns the newly created nonce-named fixtures; none is opened until
  * migration ends. This is fixture provenance, not a claim to discover arbitrary embedded editors. */
 const exclusive=(path,file)=>files.includes(file)&&file.path===path&&app.vault.getFileByPath(path)===file&&!leaves.some(leaf=>leaf.view.file===file);
 try{
  await until(()=>!p.isStartupInitializing()&&!p.index.hasActiveSemanticPreparation(),'Startup settling');
  Object.assign(p.settings,{allowOntologySuggester:true,boldFields:true,ontologySuggesterTrigger:':::'});await p.saveSettings(false,false);
  const capabilities=value(api.capabilities());
  for(const name of ['ontologyDocuments','inspectOntologyOccurrences','previewOntologyConfiguration','applyOntologyConfiguration'])check(capabilities.operations.includes(name),'Missing '+name);
  const preview=value(api.previewOntologyConfiguration({edits:[{kind:'assign',field:old,role:'parent',partner:null,description:'Old fixture wording'},{kind:'assign',field:canonical,role:'parent',partner:inverse,createPartner:true,description:'alternative vocabulary 267 '+suffix,partnerDescription:'Independent reciprocal wording'}]}));
  check(preview.state==='ready','Configuration preview');
  const no=await api.applyOntologyConfiguration({previewId:preview.previewId,confirm:false});check(no.error?.code==='CONFIRMATION_REQUIRED','Explicit confirmation');
  const saved=value(await api.applyOntologyConfiguration({previewId:preview.previewId,confirm:true}));check(saved.state==='saved'&&saved.verified&&saved.readbackScope==='reviewed-endpoints','Durable bounded readback');
  check((await api.applyOntologyConfiguration({previewId:preview.previewId,confirm:true})).error?.code==='STALE_REVISION','Review replay');
  await until(()=>!p.index.hasActiveSemanticPreparation()&&!p.index.hasPendingSemanticPreparation(),'Fixture configuration settling');
  const source=await create('source','---\r\n"'+old+'": ["[[Target]]", plain]\r\nKeep: 7\r\n---\r\n🙂 original body\r\n**'+old+'**:: [[Target]]\r\n('+old+':: value) ['+old+':: other]\r\n');
  const collision=await create('collision','---\n"'+old+'": one\n"'+canonical+'": two\n---\n'+old+':: value\n');
  const duplicate=await create('duplicate','---\nDuplicate: one\nDuplicate: two\n---\n');
  await new Promise(resolve=>window.setTimeout(resolve,500));await until(()=>!p.index.hasActiveSemanticPreparation()&&!p.index.hasPendingSemanticPreparation(),'Owned source settling');
  observe(app.vault,'read','reads');observe(app.vault,'cachedRead','cached');observe(p.index.sourceAcquisition,'acquire','acquire');observe(p.index.sourceAcquisition,'parse','parse');observe(p.index,'rebuild','rebuild');observe(p.index,'invalidateSemanticPolicy','semantic');
  c.progress={phase:'selected source inspection',cases,work};
  measuring=true;const before={...work};
  const inspected=value(await api.inspectOntologyOccurrences({path:source.path,fields,limit:1024}));
  measuring=false;check(work.reads-before.reads===1&&work.cached-before.cached===0,'One selected Vault.read');
  check(work.acquire===0&&work.parse===0&&work.rebuild===0,'Inspection did not acquire or index');
  check(inspected.complete&&inspected.occurrences.length===4,'All YAML/body physical declarations');
  const original=await app.vault.read(source);
  check(inspected.occurrences.filter(o=>o.keyRange).every(o=>original.slice(o.keyRange.start,o.keyRange.end)===old),'Exact original UTF16 ranges');
  const malformed=value(await api.inspectOntologyOccurrences({path:duplicate.path,fields:['Duplicate']}));
  check(!malformed.complete&&malformed.unsupported.some(item=>item.reason==='invalid-yaml'),'Native YAML duplicate refusal');
  cases.push('selected saved read; CRLF/Unicode body ranges and truthful logical YAML; native duplicate keys refused');
  c.progress.phase='reviewed YAML/body migration';
  const initialPlan=await prepareBodyPlan(original,inspected,mappings);
  await refuses(()=>writeReviewedYaml(app,collision,{[old]:'one',[canonical]:'two'},mappings,exclusive),collision,'YAML collision preserved');
  await writeReviewedYaml(app,source,{[old]:['[[Target]]','plain'],Keep:7},mappings,exclusive);
  await refuses(()=>writeReviewedBody(app,source,initialPlan,exclusive),source,'Pre-YAML body offsets refused');
  const afterYaml=await inspectCurrent({path:source.path,fields,limit:1024});
  const yamlText=await app.vault.read(source),plan=await prepareBodyPlan(yamlText,afterYaml,mappings);
  check(plan.edits.length===3,'Reinspection after YAML produces three body edits');
  // The interrupted run has completed only YAML. Resume by inspecting current saved text.
  const resumed=await inspectCurrent({path:source.path,fields,limit:1024});
  const resumedPlan=await prepareBodyPlan(await app.vault.read(source),resumed,mappings);
  check((await writeReviewedBody(app,source,resumedPlan,exclusive)).state==='saved','Resumed body write');
  const final=await inspectCurrent({path:source.path,fields,limit:1024});
  check(final.occurrences.every(o=>o.name===canonical)&&final.occurrences.length===4,'Readback exact canonical fields');
  const again=await prepareBodyPlan(await app.vault.read(source),final,mappings);check(again.edits.length===0&&(await writeReviewedBody(app,source,again,exclusive)).state==='unchanged','Idempotent second pass');
  cases.push('actual processFrontMatter/Vault.process; collision; YAML offset invalidation; interruption/resume; readback/idempotence');
  c.progress.phase='stale and dirty source guards';
  await app.vault.modify(source,(await app.vault.read(source))+'external edit\n');
  await refuses(()=>writeReviewedBody(app,source,again,exclusive),source,'Stale no-op did not falsely report idempotence');
  check((await api.inspectOntologyOccurrences({path:source.path,fields,expectedSnapshot:final.snapshot.id})).error?.code==='STALE_REVISION','Content snapshot stale guard');
  const open=app.workspace.getLeaf('tab');leaves.push(open);await open.openFile(source);await open.setViewState({...open.getViewState(),state:{...open.getViewState().state,mode:'source'}});
  const nativeView=open.view,nativeSave=nativeView.save;let held=true;const pendingSaves=[];
  /** Hold only this fixture view's native save; real editor content remains dirty during inspection. */
  nativeView.save=async function(...args){if(held)await new Promise(resolve=>pendingSaves.push(resolve));return nativeSave.apply(this,args);};
  try{open.view.editor.replaceRange('unsaved edit',{line:0,ch:0});
    const dirty=await api.inspectOntologyOccurrences({path:source.path,fields});check(!dirty.ok&&dirty.error.code==='UNAVAILABLE','Dirty native editor refused');
  }finally{held=false;nativeView.save=nativeSave;for(const release of pendingSaves)release();}
  await open.view.save();await open.setViewState({type:'empty',state:{}});
  await new Promise(resolve=>window.setTimeout(resolve,500));await until(()=>!p.index.hasActiveSemanticPreparation()&&!p.index.hasPendingSemanticPreparation(),'Saved fixture source settling before passive observations');
  const query='vocabulary267'+suffix,words='Replacement alternative '+query,desc=value(api.previewOntologyConfiguration({edits:[{kind:'describe',field:canonical,description:words}]}));
  c.progress.phase='description and stored-usage side effects';
  const semantic=work.semantic;measuring=true;value(await api.applyOntologyConfiguration({previewId:desc.previewId,confirm:true}));measuring=false;check(work.semantic===semantic,'Description save is presentation-only');
  const passive={...work};measuring=true;const completion=value(api.completeOntology({text:':::'+query,cursor:3+query.length}));measuring=false;
  check(completion.items.some(item=>item.name===canonical),'Own description finds canonical name');
  check(['reads','cached','parse','acquire','rebuild'].every(key=>work[key]===passive[key]),'Matching performed source work');
  measuring=true;value(await api.ontologyDocuments({field:old,limit:1}));measuring=false;
  check(['reads','cached','parse','acquire','rebuild'].every(key=>work[key]===passive[key]),'Usage lookup acquired source work');
  cases.push('stale/dirty source refusal; description-only save and canonical matching without acquisition; bounded explicit usage');
  c.progress.phase='native Markdown keyboard insertion and popout';
  const note=await create('native',''),leaf=app.workspace.getLeaf('tab');leaves.push(leaf);await leaf.openFile(note);app.workspace.setActiveLeaf(leaf,{focus:true});leaf.view.editor.focus();
  p.settings.allowOntologySuggester=true;p.settings.boldFields=true;p.settings.ontologySuggesterTrigger=':::';await p.saveSettings(false,false);
  if(!wc.debugger.isAttached()){wc.debugger.attach('1.3');debugOwned=true;}
  await wc.debugger.sendCommand('Input.insertText',{text:':::'+query});
  let row;await until(()=>row=[...leaf.view.containerEl.ownerDocument.querySelectorAll('.suggestion-item')].find(el=>el.querySelector('b')?.textContent===canonical),'Real Markdown description suggestion');
  const bounds=row.getBoundingClientRect();check(bounds.width>0&&bounds.height>0,'Visible native suggestion row');
  await wc.debugger.sendCommand('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
  await wc.debugger.sendCommand('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
  await until(()=>leaf.view.editor.getValue()==='**'+canonical+'**:: ','Canonical Markdown keyboard insertion');await leaf.view.save();
  check(await app.vault.read(note)==='**'+canonical+'**:: ','Native insertion persisted');
  const pop=app.workspace.getLeaf('window');leaves.push(pop);await pop.setViewState({type:'markdown',state:{file:note.path,mode:'source'},active:true});
  check(pop.getContainer().win.kplexApi===window.kplexApi,'Main/popout API owner');
  check(value(pop.getContainer().win.kplexApi.v1.completeOntology({text:':::'+query,cursor:3+query.length})).items.some(item=>item.name===canonical),'Popout description completion');
  cases.push('actual visible native Markdown popup/Enter/canonical bold insertion/save; independent popout public provider');
  c.progress.phase='plugin reload and durable readback';
  await leaf.setViewState({type:'empty',state:{}});await pop.setViewState({type:'empty',state:{}});
  await p.settingsWriteQueue;await app.plugins.disablePlugin('k-plex');await app.plugins.enablePlugin('k-plex');p=app.plugins.plugins['k-plex'];
  await until(()=>window.kplexApi?.v1!==api&&window.kplexApi?.v1.ontology().ok,'Fresh API after real plugin reload');
  check(value(window.kplexApi.v1.ontology()).fields.some(field=>field.name===canonical&&field.description===words),'Durable descriptions survived reload');
  check((await api.inspectOntologyOccurrences({path:source.path,fields})).error?.code==='API_UNAVAILABLE','Retained inspection handle retired');
  cases.push('actual plugin reload preserves persisted ontology descriptions and retires old inspection handles');
  check(!runtimeErrors.length,'Unexpected native runtime failures: '+runtimeErrors.join('; '));
  return {cases,work,inspectionRetries,fixtureCount:files.length,baselineMarkdownFiles:inventory.length,hostManifestVersion:p.manifest.version,runtimeErrors,
    runtime:{obsidian:require('@electron/remote').app.getVersion(),electron:process.versions.electron,chrome:process.versions.chrome,platform:process.platform}};
 }finally{
  measuring=false;const errors=[];
  /** Continue independent restoration so one fixture failure cannot strand other resources. */
  const clean=async run=>{try{await run()}catch(error){errors.push(String(error));}};
  if(debugOwned)await clean(()=>wc.debugger.detach());
  for(const restore of restores.reverse())await clean(restore);
  for(const leaf of leaves.reverse())await clean(()=>leaf.detach());
  for(const file of files)await clean(async()=>{if(!file.path.startsWith('__kplex267_'+suffix+'_'))throw Error('Fixture ownership changed; preserve renamed source');if(app.vault.getFileByPath(file.path)===file)await app.vault.delete(file,true);});
  await clean(async()=>{if(JSON.stringify(app.vault.getMarkdownFiles().map(file=>file.path).sort())!==JSON.stringify(inventory))throw Error('Original Markdown inventory was not restored');});
  await clean(()=>p.settingsWriteQueue);p.settings=settings;p.savedSettingsPolicy=policy;
  await clean(()=>p.saveSettings(false,false));await clean(()=>p.index.refreshPresentationSettings());await clean(()=>p.index.refreshSemanticSettings());
  await clean(()=>app.workspace.changeLayout(layout));await new Promise(resolve=>window.setTimeout(resolve,2500));
  await clean(()=>app.vault.adapter.write(p.manifest.dir+'/data.json',c.originalData));
  if(errors.length)throw Error('Consolidation cleanup: '+errors.join('; '));
 }
}

assert.equal(process.env.KPLEX_TEST_VAULT_NAME,'kplex-test-small','Explicit disposable Small vault required');
const target=validateTarget({vaultName:process.env.KPLEX_TEST_VAULT_NAME,vaultPath:process.env.KPLEX_TEST_VAULT_PATH,configDir:process.env.KPLEX_TEST_CONFIG_DIR});
const original=readFileSync(join(target.pluginDir,'data.json'),'utf8'),guide=readFileSync(new URL('../../../docs/ONTOLOGY_CONSOLIDATION.md',import.meta.url),'utf8');
const helpers=['body-plan','yaml-plan','guarded-writes'].map(name=>{const marker='<!-- tested-example: '+name+' -->',start=guide.indexOf(marker),fence=guide.indexOf('```js',start),end=guide.indexOf('```',fence+5);assert(start>=0&&fence>=0&&end>=0,'Missing runnable guide helper');return guide.slice(fence+5,end);}).join('\n');
const userData=process.env.KPLEX_OBSIDIAN_USER_DATA??(process.platform==='win32'?join(process.env.APPDATA,'obsidian'):process.platform==='darwin'?join(homedir(),'Library','Application Support','obsidian'):join(process.env.XDG_CONFIG_HOME??join(homedir(),'.config'),'obsidian'));
const lock=acquireHostLock({userDataPath:userData});
try{await runControlledProbe('ontology-consolidation-267',scenario,helpers+'\nc.originalData='+JSON.stringify(original)+';',['src/application/PublicApi.ts','src/publicApi/createPublicApi.ts','src/application/PublicApiOntologyConfiguration.ts','src/adapters/obsidian/ontologyOccurrences.ts','src/adapters/obsidian/ontologyUsagePager.ts','src/adapters/obsidian/ontologyUsage.ts','src/core/parser/metadata.ts','src/core/contracts/ontologyBatch.ts','src/core/contracts/ontologyCompletion.ts','src/ui/features/ontologyPresentation.ts','src/index/SourceRepository.ts','src/main.ts'],{maximumMs:180000});}
finally{lock.release();}
