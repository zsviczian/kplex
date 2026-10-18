/**
 * Exact-build ontology Settings acceptance in the authorized Small vault. Real native text input,
 * idle/exit/composition/storage recovery and final stationary semantics are separate observations.
 * Functional work counts only; this is not a comparative resource/latency benchmark. Private config
 * backups, forwarding probes, owned source fixtures and window/layout restoration belong here.
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {existsSync,mkdirSync,readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {obsidianCliExecutable,spawnNativeSync} from './processTools.mjs';
import {validateTarget} from './runner.mjs';

const root=fileURLToPath(new URL('../../..',import.meta.url)),vaultName=process.env.KPLEX_TEST_VAULT_NAME;
assert.equal(vaultName,'kplex-test-small');
const target=validateTarget({vaultName,vaultPath:process.env.KPLEX_TEST_VAULT_PATH,configDir:process.env.KPLEX_TEST_CONFIG_DIR});
const output=process.env.KPLEX_HOST_REPORT_DIR;assert(output&&(!existsSync(output)||!readdirSync(output).length),'Use a fresh report directory');mkdirSync(output,{recursive:true});
/** Use the same bounded native IPC owner as other repository lanes. */
function cli(name,...args){const r=spawnNativeSync(obsidianCliExecutable(),[`vault=${vaultName}`,name,...args],{encoding:'utf8',timeout:30000,killSignal:'SIGKILL',maxBuffer:4*1024*1024});if(r.error||r.status||/^Error:/m.test(r.stdout))throw r.error??Error(r.stderr||r.stdout);return r.stdout.trim()}
/** Transfer finite detached observations, never live host objects or unrelated note data. */
function evaluate(code){return JSON.parse(cli('eval','code=JSON.stringify(('+code+'))').replace(/^=>\s*/,''))}
/** Leave the selected renderer's ordinary task/throttling policy unchanged. */
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
assert.equal(cli('vault','info=path'),target.vault);assert.equal(resolve(target.vault,evaluate('app.vault.configDir')),target.config);
const backups=['plugins/k-plex/data.json','workspace.json','community-plugins.json','appearance.json'].filter(name=>existsSync(join(target.config,name))).map((name,index)=>({name,index,bytes:readFileSync(join(target.config,name))}));
mkdirSync(join(output,'private'));for(const item of backups)writeFileSync(join(output,'private',item.index+'.bin'),item.bytes);
const artifacts=Object.fromEntries(['main.js','styles.css','manifest.json'].map(name=>{const bytes=readFileSync(join(root,'dist',name));assert(bytes.equals(readFileSync(join(target.pluginDir,name))),'Stage exact build first');return[name,createHash('sha256').update(bytes).digest('hex')]}));

/** Native fixture/lifetime owner; no production hooks beyond temporary forwarding counters and reversible faults. */
function start(){
 const p=app.plugins.plugins['k-plex'];if(!p?.updateOntologyField||window.__kplexOntologyInputProbe||app.setting.isOpen)throw Error('Clean exact-build prerequisites required');
 const c=window.__kplexOntologyInputProbe={settings:structuredClone(p.settings),policy:p.savedSettingsPolicy,layout:app.workspace.getLayout(),owners:{linked:p.linkedDocumentLeaf,last:p.lastDocumentLeaf,recent:[...p.recentLeafHistory],sidecars:[...p.sidecarLeaves]},owned:[],releases:[],restores:[],cases:[],phase:'setup',counts:{inputs:0,trusted:0,writes:0,invalidations:0,semantic:0,presentation:0,reads:0,parses:0,acquisitions:0,builds:0},done:false};
 const paths=['__kplex147_A.md','__kplex147_B.md','__kplex147_C.md'],wait=ms=>new Promise(resolve=>window.setTimeout(resolve,ms)),check=(value,message)=>{if(c.cancelled||!value)throw Error(message)};
 /** Every wait is bounded and observes actual native/controller readiness. */
 const until=async(read,label)=>{const end=Date.now()+25000;while(!read()){check(Date.now()<end,label);await wait(40)}};
 /** Existing native page/search rows stay the test target; no modal class is instantiated in isolation. */
 const row=()=>[...p.settingsTab.containerEl.ownerDocument.querySelectorAll('.setting-item-name')].find(el=>el.textContent===p.translator('settings.ui.parent.fields')&&el.getClientRects().length)?.closest('.setting-item');
 /** Native Settings navigation is re-acquired after actual modal close/reopen. */
 const open=async()=>{p.openSettings();check(p.settingsTab.openSettingsPage(p.translator('settings.ui.ontology')),'Ontology page absent');check(p.settingsTab.openSettingsPage(p.translator('settings.ui.relationship.fields')),'Fields page absent');await until(()=>row()?.querySelector('textarea'),'Native field absent');const input=row().querySelector('textarea');if(c.measuring)observeInput(input);return input};
 const observedInputs=new WeakSet();
 /** Reopened native rows retain distinct event leases, all removed independently at cleanup. */
 const observeInput=input=>{if(observedInputs.has(input))return;observedInputs.add(input);const changed=event=>{c.counts.inputs++;if(event.isTrusted)c.counts.trusted++};input.addEventListener('input',changed);c.restores.push(()=>input.removeEventListener('input',changed))};
 /** Observe actual code unchanged; method counters distinguish native presentation from semantic/source work. */
 const observe=(owner,name,key)=>{const original=owner[name];owner[name]=function(...args){c.counts[key]++;return original.apply(this,args)};c.restores.push(()=>owner[name]=original)};
 /** A real committed ontology field must reclassify and render the stationary fixture center in all views. */
 const parentReady=()=>p.index.getNeighborhood(paths[0]).parents.some(node=>node.page.path===paths[1])&&c.leaves.every(leaf=>leaf.view.contentEl.querySelector('.kplex-role-parent[data-kplex-path="'+paths[1]+'"]'));
 /** Read model completion through its native busy state and real graph outcome. */
 const settle=async()=>{await until(()=>row()?.querySelector('textarea')?.getAttribute('aria-busy')==='false'&&!p.index.hasPendingSemanticPreparation(),'Native field still pending');await p.settingsWriteQueue;await wait(50)};
 /** Deliver trusted character events to the actual owning native textarea, preserving host input handlers. */
 const type=async value=>{const input=row().querySelector('textarea'),doc=input.ownerDocument,native=doc.defaultView.require('@electron/remote').getCurrentWindow();native.focus();native.webContents.focus();input.focus();input.setSelectionRange(0,input.value.length);await until(()=>doc.hasFocus(),'Native input window not focused');for(const char of value){native.webContents.sendInputEvent({type:'char',keyCode:char});await wait(20)}return input};
 /** Programmatic paste/composition events exercise real handlers but do not claim OS clipboard/IME coverage. */
 const inputValue=(input,value,inputType='insertFromPaste')=>{input.value=value;input.dispatchEvent(new InputEvent('input',{bubbles:true,inputType,data:value}))};
 /** Count deltas explicitly so fixture/setup and genuine committed policy work cannot masquerade as typing work. */
 const delta=before=>Object.fromEntries(Object.entries(c.counts).map(([key,value])=>[key,value-before[key]]));
 /** A draft must perform zero persistence/policy/source work while input is active. */
 const noWork=before=>{const d=delta(before);for(const key of ['writes','invalidations','semantic','presentation','reads','parses','acquisitions','builds'])check(d[key]===0,'Typing performed '+key+': '+JSON.stringify(d));return d};
 c.task=(async()=>{
  await until(()=>!p.isStartupInitializing()&&p.getIndexStatus().upToDate,'Startup not settled');
  for(const path of paths)check(!app.vault.getFileByPath(path),'Fixture collision');
  for(const path of paths.slice(1)){await app.vault.create(path,'Synthetic ontology endpoint\n');c.owned.push(path)}
  const a=await app.vault.create(paths[0],'---\nKplex147Parent: "[['+paths[1].slice(0,-3)+']]"\nKplex147Child: "[['+paths[2].slice(0,-3)+']]"\n---\nSynthetic ontology source\n');c.owned.push(paths[0]);
  await until(()=>app.metadataCache.getFileCache(a)?.frontmatter?.Kplex147Parent,'Fixture metadata absent');
  Object.assign(p.settings,{embedCentralNode:false,inferAllLinksAsFriends:false,showFolderNodes:false,showTagNodes:false,renderSiblings:false,animationSpeed:0,graphDepth:1,hierarchy:{...p.settings.hierarchy,parents:['Parent'],children:['Child'],leftFriends:['Friend'],rightFriends:['Challenger'],previous:['Previous'],next:['Next'],hidden:['Hidden']}});
  await p.setDocumentSyncMode('off');await p.saveSettings();
  for(const path of paths){p.index.insertCreatedFile(app.vault.getFileByPath(path));c.releases.push(p.index.acquireSemanticDemand(path))}
  await p.index.refreshSemanticSettings();await p.activateView();await p.activateSidepanel();
  c.popout=app.workspace.getLeaf('window');await c.popout.setViewState({type:'k-plex-react-view',active:true});await c.popout.view.waitUntilReady();p.notifyNavigation(paths[0]);
  c.leaves=[...app.workspace.getLeavesOfType('k-plex-react-view'),...app.workspace.getLeavesOfType('k-plex-sidepanel-view')];
  await until(()=>c.leaves.every(leaf=>leaf.view.contentEl.querySelector('.kplex-role-center')?.dataset.kplexPath===paths[0])&&!p.index.hasPendingSemanticPreparation()&&p.getIndexStatus().upToDate,'Fixture not settled');await wait(400);
  const first=await open();
  observe(p,'saveData','writes');observe(p.index,'invalidateSemanticPolicy','invalidations');observe(p.index,'refreshPresentationSettings','presentation');observe(p.index,'refreshSemanticSettings','semantic');observe(app.vault,'read','reads');observe(app.vault,'cachedRead','reads');observe(p.index.sourceAcquisition,'parse','parses');observe(p.index.sourceAcquisition,'acquire','acquisitions');observe(p.index,'rebuild','builds');
  /** This listener is fixture-owned; track native input trust without logging the user's field values. */
  c.measuring=true;observeInput(first);
  c.mode=p.index.isOnDemandMode()?'on-demand':'eager';const before=structuredClone(c.counts),input=await type('Parent, Kplex147Parent');input.setSelectionRange(4,4);const active=noWork(before);await wait(250);noWork(before);
  await until(()=>c.counts.writes===before.writes+1&&parentReady(),'Idle commit did not publish stationary Parent');await settle();
  check(c.counts.invalidations===before.invalidations+1&&c.counts.semantic===before.semantic+1,'Idle burst performed repeated semantic work');check(input===row().querySelector('textarea')&&input.ownerDocument.activeElement===input&&input.selectionStart===4,'Idle save replaced input/caret');check(active.trusted==='Parent, Kplex147Parent'.length,'Native trusted input missing');
  c.cases.push({id:'trusted-native-burst-idle-final-stationary-parents',typing:active,afterCommit:delta(before),views:c.leaves.length,caretRetained:true});
  const pastedBefore=structuredClone(c.counts);inputValue(input,'Parent, Kplex147Parent, Extra147');noWork(pastedBefore);app.setting.close();await p.settingsWriteQueue;await until(()=>p.settings.hierarchy.parents.includes('Extra147'),'Close did not flush final draft');await until(()=>![...p.settingsTab.ontologyFields.values()].some(control=>control.draft.state().busy),'Close refresh pending');
  check(c.counts.writes===pastedBefore.writes+1,'Close duplicated/lost save');c.cases.push({id:'native-paste-close-and-reopen',work:delta(pastedBefore)});const reopened=await open();check(reopened.value.includes('Extra147'),'Reopen lost saved value');
  const failureBefore=structuredClone(c.counts),save=p.saveData;let fail=true;p.saveData=async value=>{if(fail)throw Error('Controlled ontology storage failure');return save.call(p,value)};c.restores.push(()=>p.saveData=save);
  inputValue(reopened,'Parent, Kplex147Parent, Failure147');reopened.blur();await until(()=>row()?.querySelector('[aria-invalid="true"]'),'Storage failure missing native feedback');
  check(!p.settings.hierarchy.parents.includes('Failure147')&&c.counts.invalidations===failureBefore.invalidations&&c.counts.semantic===failureBefore.semantic,'Failed storage published ontology');
  fail=false;const retry=[...row().querySelectorAll('button')].find(button=>button.textContent===p.translator('settings.ontology.retry'));check(retry,'Native Retry absent');retry.click();await until(()=>p.settings.hierarchy.parents.includes('Failure147'),'Retry not persisted');await settle();check(c.counts.writes===failureBefore.writes+1,'Failure recovery duplicated successful writes');c.cases.push({id:'native-storage-failure-keeps-draft-and-explicit-retry',work:delta(failureBefore)});
  const composing=row().querySelector('textarea'),imeBefore=structuredClone(c.counts);composing.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true}));inputValue(composing,'Transient147','insertCompositionText');composing.dispatchEvent(new FocusEvent('blur'));await wait(900);noWork(imeBefore);
  composing.value='Parent, Kplex147Parent, Final147';composing.dispatchEvent(new CompositionEvent('compositionend',{bubbles:true}));await until(()=>p.settings.hierarchy.parents.includes('Final147'),'Final composition absent');await settle();check(c.counts.writes===imeBefore.writes+1,'Composition wrote intermediate values');c.cases.push({id:'native-synthetic-composition-no-preedit-save',work:delta(imeBefore),physicalIme:false});
  const refresh=p.index.refreshSemanticSettings;p.index.refreshSemanticSettings=async()=>{await refresh.call(p.index);throw Error('Controlled ontology refresh failure')};c.restores.push(()=>p.index.refreshSemanticSettings=refresh);
  const refreshBefore=structuredClone(c.counts);composing.focus();inputValue(composing,'Parent, Kplex147Parent, Saved147');composing.blur();await until(()=>p.settings.hierarchy.parents.includes('Saved147')&&row()?.querySelector('textarea')?.getAttribute('aria-busy')==='false','Saved refresh-pending did not settle');await wait(900);
  check(c.counts.writes===refreshBefore.writes+1&&!row().querySelector('[aria-invalid="true"]'),'Refresh failure became unsaved replay');p.index.refreshSemanticSettings=refresh;c.cases.push({id:'native-saved-refresh-pending-no-replay',work:delta(refreshBefore)});
  app.setting.close();for(const release of c.releases.splice(0))release();for(const leaf of c.leaves)leaf.detach();c.popout=null;await wait(400);const noView=await open(),noViewBefore=structuredClone(c.counts);check(!app.workspace.getLeavesOfType('k-plex-react-view').length&&!app.workspace.getLeavesOfType('k-plex-sidepanel-view').length,'Plex still active');
  inputValue(noView,'Parent, Kplex147Parent, NoView147');app.setting.close();await p.settingsWriteQueue;await until(()=>p.settings.hierarchy.parents.includes('NoView147'),'No-view commit missing');await until(()=>![...p.settingsTab.ontologyFields.values()].some(control=>control.draft.state().busy),'No-view refresh pending');c.cases.push({id:'native-no-plex-close-persists-final-field',work:delta(noViewBefore)});
  c.phase='complete';
 })().catch(error=>{c.error=String(error.stack||error);c.phase='failed'}).finally(()=>{c.done=true});
 /** Cleanup is independent of comparisons; no test wrappers or owned source files survive a failure. */
  c.cleanup=()=>{if(c.cleanupTask)return true;c.cancelled=true;c.cleanupTask=(async()=>{await c.task;for(const restore of c.restores.reverse())restore();if(app.setting.isOpen)app.setting.close();p.settingsTab.disposeOntologySettings();c.popout?.detach();for(const release of c.releases)release();p.settings=c.settings;p.savedSettingsPolicy=c.policy;await p.saveSettings(false,false);p.index.invalidateSemanticPolicy();await p.index.refreshSemanticSettings();for(const path of c.owned){const file=app.vault.getFileByPath(path);if(file)await app.vault.delete(file)}await app.workspace.changeLayout(c.layout);const leaves=[];app.workspace.iterateAllLeaves(leaf=>leaves.push(leaf));const rebind=old=>old?leaves.find(leaf=>leaf.id===old.id)??null:null;p.linkedDocumentLeaf=rebind(c.owners.linked);p.lastDocumentLeaf=rebind(c.owners.last);p.recentLeafHistory=c.owners.recent.map(rebind).filter(Boolean);p.sidecarLeaves.clear();for(const[oldHost,oldNote]of c.owners.sidecars){const host=rebind(oldHost),note=rebind(oldNote);if(host&&note)p.sidecarLeaves.set(host,note)}if(c.settings.lastActivePath)p.notifyNavigation(c.settings.lastActivePath);await p.settingsWriteQueue;if(!c.owned.every(path=>!app.vault.getFileByPath(path)))throw Error('Owned notes remain')})().catch(error=>{c.cleanupError=String(error.stack||error)}).finally(()=>{c.cleaned=true});return true};
 return true;
}

const report={status:'running',node:process.version,obsidian:cli('version'),artifacts,startedAt:new Date().toISOString(),scope:'functional native ontology Settings acceptance; no comparative performance'};
try{
 evaluate('('+start.toString()+')()');const end=Date.now()+120000;while(!evaluate('window.__kplexOntologyInputProbe.done')){assert(Date.now()<end,'Native ontology deadline');await pause(150)}
 report.observation=evaluate('(()=>{const c=window.__kplexOntologyInputProbe;return{phase:c.phase,error:c.error,cases:c.cases,counts:c.counts,mode:c.mode}})()');assert(!report.observation.error,report.observation.error);assert.equal(report.observation.phase,'complete');report.status='passed';
}catch(error){report.status='failed';report.error=String(error.stack||error);process.exitCode=1}
finally{
 try{if(!report.observation)report.observation=evaluate('(()=>{const c=window.__kplexOntologyInputProbe;return c?{phase:c.phase,error:c.error,cases:c.cases,counts:c.counts}:null})()');evaluate('window.__kplexOntologyInputProbe?.cleanup()??true');const end=Date.now()+30000;while(!evaluate('Boolean(!window.__kplexOntologyInputProbe||window.__kplexOntologyInputProbe.cleaned)')){assert(Date.now()<end,'Cleanup deadline');await pause(100)}const error=evaluate('window.__kplexOntologyInputProbe?.cleanupError??null');evaluate('delete window.__kplexOntologyInputProbe');await pause(2500);for(const item of backups)writeFileSync(join(target.config,item.name),item.bytes);await pause(500);report.configurationExact=backups.every(item=>readFileSync(join(target.config,item.name)).equals(item.bytes));assert(report.configurationExact,'Configuration bytes changed');assert.equal(error,null,'Cleanup failed: '+error)}catch(error){report.status='failed';report.cleanupError=String(error.stack||error);process.exitCode=1}
 report.completedAt=new Date().toISOString();writeFileSync(join(output,'ontology-input-native.json'),JSON.stringify(report,null,2));writeFileSync(join(output,'driver-source.mjs'),readFileSync(new URL(import.meta.url)));
}
console.log(JSON.stringify({status:report.status,cases:report.observation?.cases?.length,error:report.error,cleanupError:report.cleanupError,report:join(output,'ontology-input-native.json')}));
