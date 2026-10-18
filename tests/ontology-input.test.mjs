/** Production native-row/draft/queue behavior with real Chromium events; native event delivery is a separate lane. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {colorEditorScenario} from './support/colorEditorBrowser.mjs';

const initialize=`
const check=(v,m)=>{if(!v)throw Error(m)},copy=v=>structuredClone(v),wait=ms=>new Promise(r=>setTimeout(r,ms));
const until=async(read,message)=>{const end=Date.now()+6000;while(!read()){check(Date.now()<end,message);await wait(20)}};
const p=await createAppearanceHost({hierarchy:{parents:['Parent'],children:['Child'],leftFriends:['Friend'],rightFriends:['Challenger'],previous:['Previous'],next:['Next'],hidden:['Hidden']}});
let disk=copy(p.writes.at(-1));p.writes=[];p.work={invalidations:0,presentation:0,semantic:0};
p.index.invalidateSemanticPolicy=()=>p.work.invalidations++;p.index.refreshPresentationSettings=async()=>{p.work.presentation++};p.index.refreshSemanticSettings=async()=>{p.work.semantic++};p.index.notifyPresentation=()=>{};p.index.invalidateNodeVisuals=()=>{};
Object.assign(p,{actionPreferenceQueue:Promise.resolve(),actionPreferenceListeners:new Set(),graphLensListeners:new Set(),externalSettingsRefresh:0,externalSettingsQueued:false});
p.loadData=async()=>copy(disk);p.saveData=async value=>{p.writes.push(copy(value));disk=copy(value)};p.initializeSettingsReconciliation(disk);
const tab=new sourceModules.KplexSettingTab({},p);p.settingsTab=tab;
const rows=[];
const mount=(field='parents')=>{const definition=tab.bindThemeScalar({name:field,control:{type:'textarea',key:'hierarchy.'+field,rows:3}}),container=document.body.createDiv(),setting=new sourceModules.Setting(container),release=definition.render(setting),input=setting.controlEl.querySelector('textarea'),control=tab.ontologyFields.get(field);const row={container,setting,input,control,release:()=>{release();container.remove()}};rows.push(row);return row};
const type=(row,value)=>{row.input.value=value;row.input.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertText',data:value.slice(-1)}))};
const settled=async()=>{await until(()=>[...tab.ontologyFields.values()].every(c=>!c.draft.state().busy),'Draft did not settle');await p.settingsWriteQueue;await wait(0)};
const receive=async value=>{disk=copy(value);p.onExternalSettingsChange();await p.settingsReconciliation.reading;await p.settingsWriteQueue;await wait(0)};
`;
/** Execute one isolated production-boundary case and tear down model clocks even after assertion failures. */
const scenario=body=>colorEditorScenario(`(async()=>{${initialize}try{${body};return true}finally{tab.disposeOntologySettings();for(const row of rows)row.release()}})()`);

test('actual native rows keep burst text/caret local and commit one final ontology after real idle',async()=>{
 assert.equal(await scenario(`const row=mount(),node=row.input;node.focus();
 for(const value of ['Parent, A','Parent, An','Parent, Anc','Parent, Ancestor'])type(row,value);
 row.input.setSelectionRange(4,4);check(p.writes.length===0&&p.work.invalidations===0&&p.work.semantic===0,'Input touched persistence/semantics');
 check(p.settings.hierarchy.parents.join(',')==='Parent','Draft leaked into live hierarchy');
 await wait(300);check(p.writes.length===0,'Idle boundary ignored');await until(()=>p.work.semantic===1,'Final policy not refreshed');await settled();
 check(p.writes.length===1&&p.work.invalidations===1,'Burst queued per-character writes');
 check(JSON.stringify(disk.hierarchy.parents)===JSON.stringify(['Parent','Ancestor']),'Final field missing');
 check(row.input===node&&document.activeElement===node&&node.selectionStart===4&&node.value==='Parent, Ancestor','Saved draft replaced input/caret');`),true);
});

test('composition never commits preedit; blur waits for its final text and teardown rejects late events',async()=>{
 assert.equal(await scenario(`const row=mount();row.input.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true}));type(row,'Parent, Preedit');row.input.dispatchEvent(new FocusEvent('blur'));
 await wait(850);check(!p.writes.length&&!p.work.invalidations,'Preedit was published');
 row.input.value='Parent, Finished';row.input.dispatchEvent(new CompositionEvent('compositionend',{bubbles:true}));await settled();
 check(p.writes.length===1&&disk.hierarchy.parents.includes('Finished')&&!disk.hierarchy.parents.includes('Preedit'),'Final composition not saved once');
 const second=mount('children');second.input.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true}));type(second,'Unconfirmed');second.release();second.input.dispatchEvent(new CompositionEvent('compositionend',{bubbles:true}));await wait(850);
 check(p.writes.length===1&&disk.hierarchy.children[0]==='Child','Retired preedit or late event saved');`),true);
});

test('immediate blur/page replacement flush once and a submitted write may finish after the row closes',async()=>{
 assert.equal(await scenario(`let release,entered;const hold=new Promise(r=>release=r),began=new Promise(r=>entered=r),store=p.saveData;p.saveData=async value=>{entered();await hold;await store(value)};
 const row=mount();type(row,'Replacement');row.input.dispatchEvent(new FocusEvent('blur'));tab.hide();row.release();await began;
 check(p.settings.hierarchy.parents[0]==='Parent'&&p.work.invalidations===0,'Uncommitted field was published');release();await settled();
 check(p.writes.length===1&&disk.hierarchy.parents[0]==='Replacement'&&p.settings.hierarchy.parents[0]==='Replacement','Accepted save lost after row close');
 const reopened=mount();check(reopened.input.value==='Replacement','Reopen did not show saved field');`),true);
});

test('storage failure keeps a draft across reopen and Retry saves without prior semantic publication',async()=>{
 assert.equal(await scenario(`const row=mount(),store=p.saveData;p.saveData=async()=>{throw Error('controlled storage failure')};type(row,'Kept draft');row.input.dispatchEvent(new FocusEvent('blur'));await settled();
 check(!p.writes.length&&!p.work.invalidations&&p.settings.hierarchy.parents[0]==='Parent','Failed storage changed live policy');check(row.control.draft.state().error==='storage','Failed draft not recoverable');row.release();const again=mount();
 check(again.input.value==='Kept draft','Reopen lost failed text');await wait(850);check(!p.writes.length,'Failure retried autonomously');p.saveData=store;
 [...again.setting.controlEl.querySelectorAll('button')].find(el=>el.textContent==='Retry').click();await settled();
 check(p.writes.length===1&&disk.hierarchy.parents[0]==='Kept draft'&&p.work.semantic===1,'Explicit retry failed');`),true);
});

test('different fields merge with interleaved appearance, action and consent saves on the existing queue',async()=>{
 assert.equal(await scenario(`const parents=mount(),children=mount('children');type(parents,'New parent');type(children,'New child');
 parents.input.dispatchEvent(new FocusEvent('blur'));children.input.dispatchEvent(new FocusEvent('blur'));
 const appearance=p.updateStyleSettings(d=>{d.baseNodeStyle.strokeWidth=3});const actions=copy(p.settings.actionPreferences);actions.publishedCommands['search.focus']=false;const action=p.updateActionPreferences(actions);
 p.settings.allowRemoteNodeImages=true;const consent=p.saveSettings();await Promise.all([appearance,action,consent]);await settled();
 check(disk.hierarchy.parents[0]==='New parent'&&disk.hierarchy.children[0]==='New child','Concurrent fields lost');
 check(disk.baseNodeStyle.strokeWidth===3&&!disk.actionPreferences.publishedCommands['search.focus']&&disk.allowRemoteNodeImages===true,'Ontology saved an obsolete unrelated root');
 check(JSON.stringify(disk.hierarchy.hidden)===JSON.stringify(['Hidden']),'Another hierarchy field changed');`),true);
});

test('slow semantic refresh does not hold disk queue; only the latest newer text waits behind it',async()=>{
 assert.equal(await scenario(`let release;const hold=new Promise(r=>release=r);let first=true;p.index.refreshSemanticSettings=async()=>{p.work.semantic++;if(first){first=false;await hold}};
 const row=mount();type(row,'Z, A');row.input.dispatchEvent(new FocusEvent('blur'));await until(()=>p.work.semantic===1,'Refresh not entered');
 for(const value of ['Y','Y, B','Y, B, B'])type(row,value);row.input.dispatchEvent(new FocusEvent('blur'));
 p.settings.confirmFileDelete=false;await p.saveSettings();await p.settingsWriteQueue;check(disk.confirmFileDelete===false&&disk.hierarchy.parents.join(',')==='Z,A','Slow refresh held disk or serialized future draft');
 release();await until(()=>p.work.semantic===2,'Latest pending draft not refreshed');await settled();
 check(disk.hierarchy.parents.join(',')==='Y,B,B'&&p.work.invalidations===2,'Ordered/multiple entries or bounded pending edit lost');`),true);
});

test('saved refresh failure is not an unsaved retry and unchanged/whitespace-only input writes nothing',async()=>{
 assert.equal(await scenario(`const row=mount();type(row,' Parent, ');row.input.dispatchEvent(new FocusEvent('blur'));await settled();await wait(800);check(!p.writes.length&&!p.work.invalidations,'Whitespace edit saved');
 p.index.refreshSemanticSettings=async()=>{p.work.semantic++;throw Error('controlled view failure')};type(row,'Saved');row.input.dispatchEvent(new FocusEvent('blur'));await settled();
 check(p.writes.length===1&&disk.hierarchy.parents[0]==='Saved'&&!row.control.draft.state().dirty&&!row.control.draft.state().error,'Refresh failure misreported unsaved');
 row.input.dispatchEvent(new FocusEvent('blur'));await wait(800);check(p.writes.length===1,'Refresh failure replayed disk write');`),true);
});

test('remote same-owner changes and A to B to A fence stale drafts until explicit saved-value recovery',async()=>{
 assert.equal(await scenario(`const row=mount();type(row,'Unsubmitted');const original=copy(disk),remote=copy(disk);remote.hierarchy.parents=['Incoming'];await receive(remote);await receive(original);row.release();const fresh=mount();
 await wait(800);check(!p.writes.length&&fresh.input.readOnly&&fresh.input.value==='Unsubmitted','Remote change revived or lost stale draft');
 type(row,'Late detached event');check(fresh.input.value==='Unsubmitted','Retired callback redirected to new row');
 [...fresh.setting.controlEl.querySelectorAll('button')].find(el=>el.textContent==='Use saved fields').click();check(fresh.input.value==='Parent'&&!fresh.input.readOnly,'Explicit discard did not reload accepted field');
 type(fresh,'Deliberate new edit');fresh.input.dispatchEvent(new FocusEvent('blur'));await settled();check(p.writes.length===1&&disk.hierarchy.parents[0]==='Deliberate new edit','Recovered field unusable');`),true);
});

test('a competing same-field writer cannot be overwritten by an old local draft',async()=>{
 assert.equal(await scenario(`const row=mount();type(row,'Old local draft');await p.updateOntologyField('parents',['New explicit setting'],['Parent'],p.receivedSettingsOwner('hierarchy'));row.input.dispatchEvent(new FocusEvent('blur'));await settled();
 check(p.writes.length===1&&disk.hierarchy.parents[0]==='New explicit setting'&&row.control.draft.state().error==='conflict','Same-field stale draft overwrote a later save');`),true);
});

test('plugin teardown abandons unsubmitted work and fences feedback after an already accepted write',async()=>{
 assert.equal(await scenario(`const row=mount();type(row,'Never submitted');tab.disposeOntologySettings();await wait(850);check(!p.writes.length&&!p.work.invalidations,'Unload flushed an unsubmitted draft');
 const other=mount('children');let release,entered;const hold=new Promise(r=>release=r),began=new Promise(r=>entered=r),store=p.saveData;p.saveData=async value=>{entered();await hold;await store(value)};
 type(other,'Accepted before unload');other.input.dispatchEvent(new FocusEvent('blur'));await began;p.unloading=true;p.settingsReconciliation.dispose();tab.disposeOntologySettings();const notices=window.notices.length;release();await p.settingsWriteQueue;await wait(50);
 check(p.writes.length===1&&disk.hierarchy.children[0]==='Accepted before unload','Already accepted storage falsely cancelled');check(p.settings.hierarchy.children[0]==='Child'&&p.work.invalidations===0&&window.notices.length===notices,'Late callback revived unloaded UI/policy');`),true);
});

test('an unavailable preflight keeps an explicit retryable draft without overwriting disk or live policy',async()=>{
 assert.equal(await scenario(`const row=mount(),valid=copy(disk);disk=null;type(row,'Retry after recovery');row.input.dispatchEvent(new FocusEvent('blur'));await settled();
 check(row.control.draft.state().error==='storage'&&!p.writes.length&&!p.work.invalidations&&p.settings.hierarchy.parents[0]==='Parent','Unaccepted file lost draft or published policy');
 await receive(valid);[...row.setting.controlEl.querySelectorAll('button')].find(el=>el.textContent==='Retry').click();await settled();check(p.writes.length===1&&disk.hierarchy.parents[0]==='Retry after recovery','Valid recovery could not save retained draft');`),true);
});

test('a later accepted same-field writer stays visible when an older refresh completes',async()=>{
 assert.equal(await scenario(`const row=mount();let release;const hold=new Promise(r=>release=r);let first=true;p.index.refreshSemanticSettings=async()=>{p.work.semantic++;if(first){first=false;await hold}};
 type(row,'First accepted');row.input.dispatchEvent(new FocusEvent('blur'));await until(()=>p.work.semantic===1,'First accepted save absent');
 await p.updateOntologyField('parents',['Later accepted'],['First accepted'],p.receivedSettingsOwner('hierarchy'));release();await settled();
 check(disk.hierarchy.parents[0]==='Later accepted'&&row.input.value==='Later accepted'&&!row.control.draft.state().dirty,'Older completion restored stale native text');`),true);
});

test('teardown between flush and its submission microtask starts no storage work; native paste/deletion use the same boundary',async()=>{
 assert.equal(await scenario(`const old=mount();type(old,'Not yet submitted');old.input.dispatchEvent(new FocusEvent('blur'));tab.disposeOntologySettings();await wait(50);check(!p.writes.length&&!p.work.invalidations,'Unsubmitted microtask outlived teardown');
 const row=mount();row.input.value='';row.input.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'deleteContentBackward'}));check(!p.writes.length&&p.settings.hierarchy.parents[0]==='Parent','Deletion immediately published');row.input.dispatchEvent(new FocusEvent('blur'));await settled();check(disk.hierarchy.parents.length===0,'Empty final list did not persist');
 row.input.value='Z, A, A';row.input.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertFromPaste',data:'Z, A, A'}));row.input.dispatchEvent(new FocusEvent('blur'));await settled();check(disk.hierarchy.parents.join(',')==='Z,A,A','Paste changed order/multiplicity');`),true);
});
