/** Controlled shared-file ordering through production plugin persistence/reconciliation methods. Native callback delivery is a separate lane. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {colorEditorScenario} from './support/colorEditorBrowser.mjs';

const initialize=`
const check=(value,message)=>{if(!value)throw Error(message)},copy=value=>structuredClone(value);
const seed=await createAppearanceHost({noteTypeStyles:{Project:{fontSize:23}},showCrossLinks:true});
let disk=copy(seed.writes.at(-1));
const create=async()=>{
 const p=await createAppearanceHost(disk);p.writes=[];
 Object.assign(p,{actionPreferenceQueue:Promise.resolve(),actionPreferenceListeners:new Set(),graphLensListeners:new Set(),appearanceThemeListeners:new Set(),appearanceThemeActivation:0,externalSettingsRefresh:0,externalSettingsQueued:false,externalSettingsFailureNotified:false});
 p.work={presentation:0,semantic:0,invalidate:0,notify:0};
 p.index.refreshPresentationSettings=async()=>{p.work.presentation++};p.index.refreshSemanticSettings=async()=>{p.work.semantic++};p.index.invalidateSemanticPolicy=()=>p.work.invalidate++;p.index.notifyPresentation=()=>p.work.notify++;p.index.invalidateNodeVisuals=()=>{};
 p.loadData=async()=>copy(disk);p.saveData=async value=>{p.writes.push(copy(value));disk=copy(value)};
 p.initializeSettingsReconciliation(copy(disk));return p;
};
const drain=async p=>{for(let i=0;i<8;i++){await p.settingsReconciliation.reading;await p.settingsWriteQueue;await new Promise(r=>setTimeout(r,0));if(!p.settingsReconciliation.reading&&!p.externalSettingsQueued)break}};
const receive=async(p,value)=>{disk=copy(value);p.onExternalSettingsChange();await drain(p)};
const selected=raw=>raw.appearanceThemes.themes.find(theme=>theme.id===raw.appearanceThemes.selectedId);
`;
/** Keep every trial in a fresh real browser with the established native-shaped editor boundary. */
const scenario=body=>colorEditorScenario(`(async()=>{${initialize}\n${body}\nreturn true})()`);

test('two running instances preserve received theme contents through unrelated writes and quiesce in both directions',async()=>{
 assert.equal(await scenario(`
 const a=await create(),b=await create();
 await a.updateStyleSettings(d=>{d.noteTypeStyles.Project.gateRadius=12});const first=copy(disk);await receive(b,first);
 check(b.settings.noteTypeStyles.Project.gateRadius===12,'Same-ID active appearance was not received');check(b.writes.length===0,'Receipt echoed a save');
 b.settings.hoverHighlightRequiresAlt=false;await b.saveSettings();check(selected(disk).appearance.semantic.noteTypeStyles.Project.gateRadius===12,'Unrelated B save restored old theme');
 await receive(a,disk);check(a.settings.hoverHighlightRequiresAlt===false&&a.settings.noteTypeStyles.Project.gateRadius===12,'A did not converge');
 await b.updateStyleSettings(d=>{d.noteTypeStyles.Project.strokeWidth=4});await receive(a,disk);a.settings.confirmFileDelete=false;await a.saveSettings();await receive(b,disk);
 check(b.settings.noteTypeStyles.Project.strokeWidth===4&&b.settings.confirmFileDelete===false,'Reverse direction lost a received field');
 const counts=[a.writes.length,b.writes.length];await receive(a,disk);await receive(b,disk);await new Promise(r=>setTimeout(r,50));check(JSON.stringify(counts)===JSON.stringify([a.writes.length,b.writes.length]),'Autonomous ping-pong');
 check(a.work.semantic===0&&b.work.semantic===0&&a.work.invalidate===0&&b.work.invalidate===0,'Presentation/workflow reception requested semantics');
 `),true);
});

test('equivalent keys and own echoes are no-ops; genuine remote A to B to A retires matching drafts',async()=>{
 assert.equal(await scenario(`
 const p=await create(),a=copy(disk),opening=p.captureAppearanceOwner();let updates=0;p.subscribeAppearanceThemes(()=>updates++);
 const reverse=value=>Array.isArray(value)?value.map(reverse):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).reverse().map(key=>[key,reverse(value[key])])):value;
 await receive(p,reverse(a));check(updates===0&&p.work.presentation===0&&p.writes.length===0,'Key order manufactured a change');
 const b=copy(a);selected(b).appearance.semantic.noteTypeStyles.Project.gateRadius=9;await receive(p,b);check(!p.isAppearanceOwnerCurrent(opening),'Same-ID remote edit did not retire editor');
 await receive(p,a);check(!p.isAppearanceOwnerCurrent(opening)&&p.settings.noteTypeStyles.Project.gateRadius===undefined&&updates===2,'A-B-A was blacklisted or revived editor');
 let rejected=false;try{await p.updateStyleSettings(d=>{d.noteTypeStyles.Project.fontSize=44},opening)}catch{rejected=true}check(rejected&&p.writes.length===0,'Old draft wrote after A-B-A');
 const owner=p.captureAppearanceOwner(),metadata=copy(a);metadata.appearanceThemes.themes.find(theme=>theme.id==='native-base').name='Renamed inactive';await receive(p,metadata);
 check(p.isAppearanceOwnerCurrent(owner),'Inactive metadata retired active draft');await p.updateStyleSettings(d=>{d.noteTypeStyles.Project.fontSize=28},owner);check(disk.appearanceThemes.themes.find(theme=>theme.id==='native-base').name==='Renamed inactive','Active save lost received inactive metadata');
 `),true);
});

test('unstarted writes reconcile disk without a callback and preserve submission order including undo',async()=>{
 assert.equal(await scenario(`
 const p=await create(),remote=copy(disk);selected(remote).appearance.semantic.noteTypeStyles.Project.textColor='#abcdef';disk=remote;
 p.settings.showCrossLinks=false;await p.saveSettings();check(selected(disk).appearance.semantic.noteTypeStyles.Project.textColor==='#abcdef','Preflight missed unnotified disk replacement');
 let release;const hold=new Promise(r=>release=r);p.settingsWriteQueue=hold;
 p.settings.confirmFileDelete=false;const first=p.saveSettings();p.settings.confirmFileDelete=true;const second=p.saveSettings();release();await Promise.all([first,second]);
 check(p.writes.at(-2).confirmFileDelete===false&&p.writes.at(-1).confirmFileDelete===true,'Queued undo was lost or future edit serialized early');
 `),true);
});

test('captured replacement during an in-flight write survives its completion and the next unrelated save',async()=>{
 assert.equal(await scenario(`
 const p=await create(),remote=copy(disk);selected(remote).appearance.semantic.noteTypeStyles.Project.gateRadius=15;
 let entered,release;const began=new Promise(r=>entered=r),hold=new Promise(r=>release=r),store=p.saveData;let first=true;
 p.saveData=async value=>{if(first){first=false;entered();await hold}await store(value)};
 p.settings.confirmFileDelete=false;const saving=p.saveSettings();await began;disk=remote;p.onExternalSettingsChange();await p.settingsReconciliation.reading;
 p.settings.showCrossLinks=false;const next=p.saveSettings();release();await saving;await next;await drain(p);
 check(selected(disk).appearance.semantic.noteTypeStyles.Project.gateRadius===15&&disk.confirmFileDelete===false&&disk.showCrossLinks===false,'Observed remote or accepted local roots lost during write');
 check(p.settings.noteTypeStyles.Project.gateRadius===15,'Latest live remote appearance missing');check(p.writes.length===2,'Receipt emitted an extra write');
 `),true);
});

test('a pending same-owner control conflicts explicitly instead of recreating a remotely removed style',async()=>{
 assert.equal(await scenario(`
 const p=await create();let release;const hold=new Promise(r=>release=r);p.settingsWriteQueue=hold;
 const owner=p.captureAppearanceOwner(),saving=p.updateStyleSettings(d=>{d.noteTypeStyles.Project.fontSize=40},owner).then(()=>false,()=>true);
 const remote=copy(disk);delete selected(remote).appearance.semantic.noteTypeStyles.Project;disk=remote;p.onExternalSettingsChange();await p.settingsReconciliation.reading;release();
 check(await saving,'Stale queued appearance was accepted');await drain(p);check(!p.settings.noteTypeStyles.Project&&p.writes.length===0,'Removed style resurrected');
 `),true);
});

test('malformed and missing replacements keep valid state, block overwrite, recover later and fence unload',async()=>{
 assert.equal(await scenario(`
 const p=await create(),valid=copy(disk);await receive(p,null);check(p.settings.noteTypeStyles.Project.fontSize===23&&p.writes.length===0,'Missing file installed defaults');
 p.settings.showCrossLinks=false;await p.saveSettings();check(p.writes.length===0&&window.notices.length>0,'Unaccepted file overwritten or refusal not explained');
 await receive(p,{...valid,hierarchy:42});check(p.settings.noteTypeStyles.Project.fontSize===23,'Malformed container installed');
 await receive(p,valid);p.settings.showCrossLinks=false;await p.saveSettings();check(disk.showCrossLinks===false,'Valid receipt did not recover');
 let resolve;const held=new Promise(r=>resolve=r);p.loadData=()=>held;p.onExternalSettingsChange();p.unloading=true;p.settingsReconciliation.dispose();const before=p.settings;resolve(valid);await drain(p);check(p.settings===before,'Unloaded plugin revived');
 `),true);
});

test('newest notification fences a held read, and old native scalar events cannot write the received value back',async()=>{
 assert.equal(await scenario(`
 const p=await create(),tab=new sourceModules.KplexSettingTab({workspace:{on:()=>({}),offref:()=>{}}},p),old=copy(disk),latest=copy(disk);
 const key=tab.receivedControlKey('showCrossLinks');latest.showCrossLinks=false;let release,entered;
 const held=new Promise(r=>release=r),began=new Promise(r=>entered=r),read=p.loadData;let first=true;
 p.loadData=async()=>{if(first){first=false;entered();return held}return read()};p.onExternalSettingsChange();await began;disk=latest;p.onExternalSettingsChange();release(old);await drain(p);
 check(p.settings.showCrossLinks===false,'Older held read won');await tab.setControlValue(key,true);check(p.writes.length===0&&p.settings.showCrossLinks===false,'Retired scalar handler overwrote receipt');
 await tab.setControlValue(tab.receivedControlKey('showCrossLinks'),true);check(disk.showCrossLinks===true,'Fresh scalar handler could not save');tab.disposeActionSettings();
 `),true);
});

test('failed writes reconcile read-back without replay; unsupported containers survive unrelated saves',async()=>{
 assert.equal(await scenario(`
 const p=await create(),store=p.saveData;let first=true;
 p.saveData=async value=>{if(first){first=false;throw Error('Expected before-storage failure')}await store(value)};
 p.settings.confirmFileDelete=false;let failed=false;try{await p.saveSettings()}catch{failed=true}check(failed&&p.writes.length===0,'Failed storage claimed success');await p.saveSettings();check(disk.confirmFileDelete===false&&p.writes.length===1,'Retry lost actual local intent');
 const future=copy(disk);future.appearanceThemes={version:999,opaque:{preserve:['x',1]}};future.colorPreferences={version:999,opaque:{keep:true}};future.actionPreferences={version:999,opaque:{keys:['y']}};
 await receive(p,future);check(p.settings.appearanceThemesFuture?.version===999&&p.settings.actionPreferencesFuture?.version===999,'Future containers lost');
 p.settings.hoverHighlightRequiresAlt=false;await p.saveSettings();check(JSON.stringify(disk.appearanceThemes)===JSON.stringify(future.appearanceThemes)&&JSON.stringify(disk.colorPreferences)===JSON.stringify(future.colorPreferences)&&JSON.stringify(disk.actionPreferences)===JSON.stringify(future.actionPreferences),'Fallback rendering overwrote future data');
 `),true);
});

test('rapid mixed presentation receipts do not lose a pending real semantic refresh or hold the disk queue',async()=>{
 assert.equal(await scenario(`
 const p=await create(),ontology=copy(disk),paint=copy(disk);ontology.hierarchy.parents=['Ancestor'];paint.hierarchy.parents=['Ancestor'];paint.showCrossLinks=false;
 let release,entered;const held=new Promise(r=>release=r),began=new Promise(r=>entered=r);p.index.refreshPresentationSettings=async()=>{p.work.presentation++;entered();await held};
 await receive(p,ontology);await began;await receive(p,paint);check(p.work.semantic===0,'Held presentation did not remain held');
 p.settings.confirmFileDelete=false;const save=p.saveSettings();await p.settingsWriteQueue;check(disk.confirmFileDelete===false&&disk.hierarchy.parents[0]==='Ancestor','Slow refresh held or corrupted the disk queue');
 release();await save;await new Promise(r=>setTimeout(r,0));check(p.work.semantic>0,'Later paint receipt lost the genuine semantic refresh');
 `),true);
});

test('action drafts queued before a remote replacement reject instead of restoring old shortcuts',async()=>{
 assert.equal(await scenario(`
 const p=await create();let release;const hold=new Promise(r=>release=r);p.actionPreferenceQueue=hold;
 const draft=copy(p.settings.actionPreferences);draft.publishedCommands['search.focus']=true;
 const pending=p.updateActionPreferences(draft).then(()=>false,()=>true),remote=copy(disk);remote.actionPreferences.publishedCommands['search.focus']=false;remote.actionPreferences.publishedCommands['pin.toggle']=false;
 await receive(p,remote);release();check(await pending,'Stale action snapshot accepted');check(p.writes.length===0&&p.settings.actionPreferences.publishedCommands['pin.toggle']===false,'Remote shortcuts overwritten');
 `),true);
});

test('startup receipts survive absent consumers without initializing themes or echoing a migration save',async()=>{
 assert.equal(await scenario(`
 const p=await create(),old=copy(disk);delete old.appearanceThemes;old.noteTypeStyles={Project:{fontSize:21}};const incoming=copy(old);incoming.noteTypeStyles.Project.fontSize=31;
 p.settingsReconciliation.dispose();p.settingsReconciliation=undefined;p.settings=sourceModules.migrateAndMergeSettings(old);p.savedSettingsPolicy=sourceModules.captureSettingsPolicy(p.settings);p.index=undefined;disk=incoming;
 p.onExternalSettingsChange();p.initializeSettingsReconciliation(old);await drain(p);
 check(p.settings.noteTypeStyles.Project.fontSize===31&&p.writes.length===0,'Startup lost a pending receipt or echoed it');
 await p.updateStyleSettings(()=>{},p.captureAppearanceOwner(),{initializeThemes:{existing:true}});await p.persistSettingsSnapshot(true);
 check(p.settings.appearanceThemes===undefined&&p.writes.length===0,'Receipt caused theme creation or migration write-back');
 `),true);
});

test('an event-style stale scalar save reports refusal without an unhandled rejection',async()=>{
 assert.equal(await scenario(`
 const p=await create();let release;const hold=new Promise(r=>release=r);p.settingsWriteQueue=hold;const unhandled=[];
 const observe=event=>{unhandled.push(String(event.reason));event.preventDefault()};window.addEventListener('unhandledrejection',observe);
 p.settings.showCrossLinks=false;void p.saveSettings();const remote=copy(disk);remote.showCrossLinks=false;disk=remote;p.onExternalSettingsChange();await p.settingsReconciliation.reading;release();await drain(p);await new Promise(r=>setTimeout(r,10));
 window.removeEventListener('unhandledrejection',observe);check(unhandled.length===0&&p.writes.length===0&&window.notices.length>0,'Stale event save escaped or silently wrote');
 `),true);
});
