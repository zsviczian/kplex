/** Exact-build external-file delivery, live views/native controls and non-echo persistence in the authorized disposable vault. */
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
/** Share the repository's native transport, bounded deadlines and explicit target selection. */
function cli(name,...args){const r=spawnNativeSync(obsidianCliExecutable(),[`vault=${vaultName}`,name,...args],{encoding:'utf8',timeout:30000,killSignal:'SIGKILL',maxBuffer:4*1024*1024});if(r.error||r.status||/^Error:/m.test(r.stdout))throw r.error??Error(r.stderr||r.stdout);return r.stdout.trim()}
/** Only finite detached observations cross IPC; incoming full settings remain local/private. */
function evaluate(code){return JSON.parse(cli('eval','code=JSON.stringify(('+code+'))').replace(/^=>\s*/,''))}
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
/** Poll only this owned trial; never modify renderer scheduling or compete with another native driver. */
async function until(code,label){const end=Date.now()+25000;while(!evaluate(code)){assert(Date.now()<end,label);await wait(120)}}
assert.equal(cli('vault','info=path'),target.vault);
assert.equal(resolve(target.vault,evaluate('app.vault.configDir')),target.config,'Actual config directory must match the selected target');
const requestedMode=process.env.KPLEX_EXTERNAL_SETTINGS_MODE;assert(!requestedMode||['eager','on-demand'].includes(requestedMode),'Unknown session mode');
const backups=['plugins/k-plex/data.json','workspace.json','community-plugins.json','appearance.json'].filter(name=>existsSync(join(target.config,name))).map((name,index)=>({name,index,bytes:readFileSync(join(target.config,name))}));
const privateDir=join(output,'private');mkdirSync(privateDir);for(const item of backups)writeFileSync(join(privateDir,'configuration-'+item.index+'.bin'),item.bytes);
const artifacts=Object.fromEntries(['main.js','styles.css','manifest.json'].map(name=>{const bytes=readFileSync(join(root,'dist',name));assert(bytes.equals(readFileSync(join(target.pluginDir,name))),'Stage the exact build first');return[name,createHash('sha256').update(bytes).digest('hex')]}));
const dataFile=join(target.pluginDir,'data.json');

/** Native host owner: synthetic note fixtures, existing settings writers, real rendered views and finally cleanup. */
function start(){
 const p=app.plugins.plugins['k-plex'];if(!p?.settingsReconciliation||window.__kplexSettingsProbe||app.setting.isOpen)throw Error('Clean exact-build prerequisites required');
 const c=window.__kplexSettingsProbe={settings:structuredClone(p.settings),policy:p.savedSettingsPolicy,layout:app.workspace.getLayout(),owners:{linked:p.linkedDocumentLeaf,last:p.lastDocumentLeaf,recent:[...p.recentLeafHistory],sidecars:[...p.sidecarLeaves]},owned:[],releases:[],restores:[],phase:'setup',cases:[],counts:{settingsReads:0,reads:0,parses:0,acquisitions:0,semantic:0,builds:0,writes:0,callbacks:0},done:false};
 const check=(value,message)=>{if(c.cancelled||!value)throw Error(message)},wait=ms=>new Promise(resolve=>window.setTimeout(resolve,ms));
 const until=async(read,label)=>{const end=Date.now()+20000;while(!read()){check(Date.now()<end,label);await wait(40)}};
 const paths=['__kplex_settings_A.md','__kplex_settings_B.md','__kplex_settings_C.md'];
 const rootOf=leaf=>leaf.view.contentEl,center=root=>root.querySelector('.kplex-role-center'),clone=value=>structuredClone(value);
 /** Capture bounded focus identities, never editor text or unrelated native file paths. */
 c.sampleFocus=label=>{const doc=c.editorLeaf?.view.contentEl.ownerDocument??document,active=doc.activeElement;return {label,same:active===c.editorFocus,connected:c.editorFocus?.isConnected,tag:active?.tagName,classes:typeof active?.className==='string'?active.className.slice(0,180):'',inEditor:!!active?.closest('.cm-editor'),sameLeaf:app.workspace.activeLeaf===c.editorLeaf,cursor:c.editorLeaf?.view.editor?.getCursor()}};
 /** Forward the real host method unchanged while counting only the guarded interval. */
 const observe=(owner,name,key)=>{const original=owner[name];owner[name]=function(...args){c.counts[key]++;return original.apply(this,args)};c.restores.push(()=>owner[name]=original)};
 /** Resolve the actual native row, including after public SettingTab.update replaces it. */
 const row=()=>[...p.settingsTab.containerEl.ownerDocument.querySelectorAll('.setting-item-name')].find(el=>el.getClientRects().length&&el.textContent===p.translator('settings.hoverHighlight.name'))?.closest('.setting-item');
 c.task=(async()=>{
  await until(()=>!p.isStartupInitializing()&&p.getIndexStatus().upToDate,'Startup pending');
  for(const path of paths)check(!app.vault.getFileByPath(path),'Fixture collision');
  const a=await app.vault.create(paths[0],'---\nChild: "[['+paths[1].slice(0,-3)+']]"\nOther: "[['+paths[2].slice(0,-3)+']]"\n---\n');c.owned.push(paths[0]);
  for(const path of paths.slice(1)){await app.vault.create(path,'Synthetic settings endpoint\n');c.owned.push(path)}
  await until(()=>app.metadataCache.getFileCache(a)?.frontmatter?.Other,'Fixture metadata absent');
  Object.assign(p.settings,{embedCentralNode:false,inferAllLinksAsFriends:false,inverseInfer:false,showFolderNodes:false,showTagNodes:false,renderSiblings:false,animationSpeed:0,graphDepth:1,hoverHighlightRequiresAlt:true,
   hierarchy:{...p.settings.hierarchy,parents:['Parent'],children:['Child'],leftFriends:['Friend'],rightFriends:['Challenger','Right'],previous:['Previous'],next:['Next'],hidden:['Hidden']}});
  await p.setDocumentSyncMode('off');await p.saveSettings();
  await p.updateStyleSettings(d=>{d.baseNodeStyle.borderColor='#123456';d.centralNodeStyle.borderColor='#123456';d.baseNodeStyle.strokeWidth=1;d.baseNodeStyle.gateRadius=4});
  for(const path of paths){p.index.insertCreatedFile(app.vault.getFileByPath(path));c.releases.push(p.index.acquireSemanticDemand(path))}
  await p.index.refreshSemanticSettings();await p.activateView();await p.activateSidepanel();
  const popout=app.workspace.getLeaf('window');c.popout=popout;await popout.setViewState({type:'k-plex-react-view',active:true});await popout.view.waitUntilReady();await app.workspace.revealLeaf(popout);p.notifyNavigation(paths[0]);
  c.leaves=[...app.workspace.getLeavesOfType('k-plex-react-view'),...app.workspace.getLeavesOfType('k-plex-sidepanel-view')];
  await until(()=>c.leaves.every(leaf=>center(rootOf(leaf))?.dataset.kplexPath===paths[0])&&!p.index.hasPendingSemanticPreparation(),'Fixture views absent');
  await p.settingsWriteQueue;await until(()=>p.getIndexStatus().upToDate&&!p.index.hasPendingSemanticPreparation(),'Setup work pending');await wait(400);c.nodes=c.leaves.map(leaf=>center(rootOf(leaf)));
  const native=require('@electron/remote').getCurrentWindow();native.focus();native.webContents.focus();
  p.openSettings();check(p.settingsTab.openSettingsPage(p.translator('settings.ui.plex.behavior')),'Behavior page absent');await until(()=>row()?.querySelector('.checkbox-container'),'Native hover row absent');c.oldControl=row().querySelector('.checkbox-container');
  observe(p,'onExternalSettingsChange','callbacks');observe(p,'loadData','settingsReads');observe(p,'saveData','writes');observe(app.vault,'read','reads');observe(app.vault,'cachedRead','reads');observe(p.index.sourceAcquisition,'parse','parses');observe(p.index.sourceAcquisition,'acquire','acquisitions');observe(p.index,'refreshSemanticSettings','semantic');observe(p.index,'rebuild','builds');
  c.initialMode=p.index.isOnDemandMode()?'on-demand':'eager';c.phase='ready';
 })().catch(error=>{c.error=String(error.stack||error);c.phase='failed'});
 /** Check completed external delivery without invoking the callback ourselves. */
 c.checkReceipt=()=>{
  check(c.counts.callbacks>0,'Native host callback absent');check(p.settings.baseNodeStyle.borderColor==='#12ab34'&&p.settings.hoverHighlightRequiresAlt===false,'Live settings not adopted');
  check(!p.isActionPublished('search.focus'),'Received action publication remained stale');
  check((p.index.isOnDemandMode()?'on-demand':'eager')===c.initialMode&&p.settings.indexingMode!==c.initialMode,'Received stored mode changed the active session');
  check(c.nodes.every((node,i)=>node===center(rootOf(c.leaves[i]))&&node.isConnected),'Color-only receipt replaced graph DOM/center');
  for(const node of c.nodes)check(node.ownerDocument.defaultView.getComputedStyle(node).borderTopColor==='rgb(18, 171, 52)','An open Plex retained old paint');
  check(!row().querySelector('.checkbox-container').classList.contains('is-enabled'),'Actual Settings row did not refresh');
  check(c.counts.writes===0&&c.counts.reads===0&&c.counts.parses===0&&c.counts.acquisitions===0&&c.counts.semantic===0&&c.counts.builds===0,'Receipt performed write/source work '+JSON.stringify(c.counts));
  c.cases.push({id:'real-external-file-callback-live-main-sidebar-popout',counts:clone(c.counts),views:c.leaves.map(leaf=>({type:leaf.view.getViewType(),popout:rootOf(leaf).ownerDocument!==document})),mode:c.initialMode});
  const before=c.counts.writes;c.oldControl.click();check(c.counts.writes===before&&p.settings.hoverHighlightRequiresAlt===false,'Retired native control wrote');
  c.cases.push({id:'native-row-replaced-stale-handler-fenced'});c.phase='received';return true;
 };
 /** Actual current native control sends one unrelated local operation through the existing queue. */
 c.localEdit=()=>{c.task=(async()=>{row().querySelector('.checkbox-container').click();await until(()=>p.settings.hoverHighlightRequiresAlt===true,'Native local edit absent');await p.settingsWriteQueue;await wait(100);check(p.settings.baseNodeStyle.borderColor==='#12ab34','Local edit lost received color');c.phase='local-saved';c.cases.push({id:'unrelated-native-save-retains-received-appearance',writes:c.counts.writes})})().catch(error=>{c.error=String(error.stack||error);c.phase='failed'});return true};
 /** A real native source editor remains the foreground owner while later receipts refresh Plex views. */
 c.setupEditor=()=>{c.task=(async()=>{if(app.setting.isOpen)app.setting.close();const leaf=app.workspace.getLeaf('split');c.editorLeaf=leaf;await leaf.openFile(app.vault.getFileByPath(paths[0]),{active:true});const state=leaf.getViewState();await leaf.setViewState({...state,state:{...state.state,mode:'source'},active:true});leaf.view.editor.setCursor({line:0,ch:0});leaf.view.editor.focus();await wait(200);c.editorFocus=leaf.view.contentEl.ownerDocument.activeElement;check(c.editorFocus?.closest('.cm-editor'),'Native source editor not focused');c.focusEvents=[];const doc=leaf.view.contentEl.ownerDocument,observeFocus=()=>{c.focusEvents.push(c.sampleFocus('focusin'));c.focusEvents=c.focusEvents.slice(-12)};doc.addEventListener('focusin',observeFocus,true);c.restores.push(()=>doc.removeEventListener('focusin',observeFocus,true));c.phase='editor-ready'})().catch(error=>{c.error=String(error.stack||error);c.phase='failed'});return true};
 /** Semantic policy uses the real cached-fact/demand path and stationary view subscription. */
 c.semanticReady=()=>p.index.getNeighborhood(paths[0]).parents.some(n=>n.page.path===paths[2])&&!p.index.hasPendingSemanticPreparation()
  &&c.leaves.every(leaf=>rootOf(leaf).querySelector('.kplex-role-parent[data-kplex-path="'+paths[2]+'"]'));
 c.checkSemantic=()=>{check(c.semanticReady()&&c.counts.semantic>0,'Real ontology change not applied');check(c.leaves.every(leaf=>center(rootOf(leaf))?.dataset.kplexPath===paths[0]),'Ontology receipt navigated views');c.foregroundAfter=c.sampleFocus('after-receipt');
  // Native frontmatter initialization can move the requested line zero before delivery.
  // Compare the actual settled cursor, editor identity and leaf, not that invalid requested position.
  check(c.foregroundBefore.same&&c.foregroundBefore.sameLeaf&&c.foregroundAfter.same&&c.foregroundAfter.sameLeaf&&JSON.stringify(c.foregroundAfter.cursor)===JSON.stringify(c.foregroundBefore.cursor)&&c.focusEvents.every(event=>event.same&&event.sameLeaf),'Receipt stole native editor focus/caret '+JSON.stringify({before:c.foregroundBefore,after:c.foregroundAfter,events:c.focusEvents}));c.cases.push({id:'real-received-ontology-reclassifies-stationary-neighbor',semanticCalls:c.counts.semantic,renderedParents:true});c.cases.push({id:'native-editor-focus-caret-and-view-centers-retained'});c.phase='semantic';return true};
 c.checkInvalid=()=>{check(p.settings.baseNodeStyle.borderColor==='#12ab34'&&p.settings.hierarchy.parents[0]==='Other','Invalid receipt replaced valid state');c.cases.push({id:'torn-file-keeps-valid-state-no-echo'});return true};
 /** Restore owned workspace/configuration and source facts even if assertions fail. */
 c.cleanup=()=>{if(c.cleanupTask)return c.cleanupTask;c.cleanupTask=(async()=>{
  c.cancelled=true;await c.task;for(const restore of c.restores.reverse())restore();if(app.setting.isOpen)app.setting.close();c.editorLeaf?.detach();c.popout?.detach();c.popout=null;for(const release of c.releases)release();
  p.settings=c.settings;p.savedSettingsPolicy=c.policy;await p.saveSettings(false,false);p.actionPublisher?.sync(p.settings.actionPreferences);p.index.invalidateSemanticPolicy();await p.index.refreshSemanticSettings();
  for(const path of c.owned){const file=app.vault.getFileByPath(path);if(file)await app.vault.delete(file)}
  await app.workspace.changeLayout(c.layout);const leaves=[];app.workspace.iterateAllLeaves(leaf=>leaves.push(leaf));const rebind=old=>old?leaves.find(leaf=>leaf.id===old.id)??null:null;
  p.linkedDocumentLeaf=rebind(c.owners.linked);p.lastDocumentLeaf=rebind(c.owners.last);p.recentLeafHistory=c.owners.recent.map(rebind).filter(Boolean);p.sidecarLeaves.clear();for(const[oldHost,oldNote]of c.owners.sidecars){const host=rebind(oldHost),note=rebind(oldNote);if(host&&note)p.sidecarLeaves.set(host,note)}
  if(c.settings.lastActivePath)p.notifyNavigation(c.settings.lastActivePath);await p.settingsWriteQueue;if(!c.owned.every(path=>!app.vault.getFileByPath(path)))throw Error('Owned notes remain');c.cleaned=true;
 })().catch(error=>{c.cleanupError=String(error.stack||error)}).finally(()=>{c.done=true});return true};
 return true;
}

const report={status:'running',node:process.version,startedAt:new Date().toISOString(),artifacts,requestedMode:requestedMode??'existing',scope:'real external settings file replacement; functional counts, not comparative performance'};
try{
 if(requestedMode){const data=JSON.parse(readFileSync(dataFile,'utf8'));data.indexingMode=requestedMode;writeFileSync(dataFile,JSON.stringify(data,null,2));cli('plugin:disable','id=k-plex');cli('plugin:enable','id=k-plex');await until('Boolean(app.plugins.plugins["k-plex"]?.settingsReconciliation&&!app.plugins.plugins["k-plex"].isStartupInitializing())','Requested session reload deadline');}
 report.obsidian=cli('version');evaluate('('+start.toString()+')()');
 await until('Boolean(window.__kplexSettingsProbe?.phase==="ready"||window.__kplexSettingsProbe?.error)','Fixture setup deadline');assert.equal(evaluate('window.__kplexSettingsProbe.error??null'),null);
 report.sessionMode=evaluate('window.__kplexSettingsProbe.initialMode');if(requestedMode)assert.equal(report.sessionMode,requestedMode,'Requested session mode was not established');
 const incoming=JSON.parse(readFileSync(dataFile,'utf8')),theme=incoming.appearanceThemes.themes.find(theme=>theme.id===incoming.appearanceThemes.selectedId);
 theme.appearance.base.baseNodeStyle.borderColor='#12ab34';theme.appearance.base.centralNodeStyle.borderColor='#12ab34';incoming.baseNodeStyle.borderColor='#12ab34';incoming.centralNodeStyle.borderColor='#12ab34';incoming.hoverHighlightRequiresAlt=false;
 incoming.actionPreferences.publishedCommands['search.focus']=false;
 incoming.indexingMode=evaluate('window.__kplexSettingsProbe.initialMode')==='eager'?'on-demand':'eager';
 writeFileSync(dataFile,JSON.stringify(incoming,null,2));
 await until('Boolean(window.__kplexSettingsProbe?.counts.callbacks>0&&app.plugins.plugins["k-plex"].settings.baseNodeStyle.borderColor==="#12ab34"&&!app.plugins.plugins["k-plex"].externalSettingsQueued)','Real onExternalSettingsChange delivery deadline');
 await wait(400);evaluate('window.__kplexSettingsProbe.checkReceipt()');evaluate('window.__kplexSettingsProbe.localEdit()');
 await until('Boolean(window.__kplexSettingsProbe.phase==="local-saved"||window.__kplexSettingsProbe.error)','Native local write deadline');assert.equal(evaluate('window.__kplexSettingsProbe.error??null'),null);
 evaluate('window.__kplexSettingsProbe.setupEditor()');await until('Boolean(window.__kplexSettingsProbe.phase==="editor-ready"||window.__kplexSettingsProbe.error)','Native editor setup deadline');assert.equal(evaluate('window.__kplexSettingsProbe.error??null'),null);
 const saved=JSON.parse(readFileSync(dataFile,'utf8'));assert.equal(saved.baseNodeStyle.borderColor,'#12ab34');assert.equal(saved.appearanceThemes.themes.find(t=>t.id===saved.appearanceThemes.selectedId).appearance.base.baseNodeStyle.borderColor,'#12ab34');
 evaluate('window.__kplexSettingsProbe.foregroundBefore=window.__kplexSettingsProbe.sampleFocus("before-receipt")');saved.hierarchy.parents=['Other'];writeFileSync(dataFile,JSON.stringify(saved,null,2));await until('window.__kplexSettingsProbe.semanticReady()','Received semantic relationship deadline');evaluate('window.__kplexSettingsProbe.checkSemantic()');
 const writes=evaluate('window.__kplexSettingsProbe.counts.writes');writeFileSync(dataFile,'{"truncated":');
 await until('Boolean(app.plugins.plugins["k-plex"].externalSettingsFailureNotified)','Torn settings retry deadline');evaluate('window.__kplexSettingsProbe.checkInvalid()');assert.equal(evaluate('window.__kplexSettingsProbe.counts.writes'),writes);
 writeFileSync(dataFile,JSON.stringify(saved,null,2));await until('!app.plugins.plugins["k-plex"].settingsReconciliation.failedRead','Valid replacement recovery deadline');await wait(250);assert.equal(evaluate('window.__kplexSettingsProbe.counts.writes'),writes);
 report.scenarios=evaluate('window.__kplexSettingsProbe.cases');report.status='passed';
}catch(error){report.status='failed';report.error=String(error.stack||error);process.exitCode=1}
finally{
 try{report.observation=evaluate('(()=>{const c=window.__kplexSettingsProbe;return c?{phase:c.phase,counts:c.counts,cases:c.cases,foregroundBefore:c.foregroundBefore,foregroundAfter:c.foregroundAfter,focusEvents:c.focusEvents}:null})()')}catch{}
 try{
  evaluate('window.__kplexSettingsProbe?.cleanup()??true');await until('Boolean(!window.__kplexSettingsProbe||window.__kplexSettingsProbe.done)','Native cleanup deadline');const cleanupError=evaluate('window.__kplexSettingsProbe?.cleanupError??null');evaluate('delete window.__kplexSettingsProbe');
  // Native layout/file deletion saves are debounced independently of plugin data writes.
  // Let those owned cleanup tasks drain before restoring the opening configuration bytes.
  await wait(2500);for(const item of backups)writeFileSync(join(target.config,item.name),item.bytes);await wait(400);
  if(requestedMode){cli('plugin:disable','id=k-plex');cli('plugin:enable','id=k-plex');await until('Boolean(app.plugins.plugins["k-plex"]?.settingsReconciliation&&!app.plugins.plugins["k-plex"].isStartupInitializing())','Original session reload deadline');await wait(2500);for(const item of backups)writeFileSync(join(target.config,item.name),item.bytes);await wait(400);}
  await until('(()=>{const p=app.plugins.plugins["k-plex"];return !p.externalSettingsQueued&&!p.settingsReconciliation.reading})()','Restored config adoption deadline');
  report.configurationBytesRestored=backups.every(item=>readFileSync(join(target.config,item.name)).equals(item.bytes));assert(report.configurationBytesRestored,'Configuration bytes not restored');
  assert.equal(cleanupError,null,'Fixture cleanup failed: '+cleanupError);
 }catch(error){report.status='failed';report.cleanupError=String(error.stack||error);process.exitCode=1}
 report.completedAt=new Date().toISOString();writeFileSync(join(output,'external-settings-native.json'),JSON.stringify(report,null,2));writeFileSync(join(output,'driver-source.mjs'),readFileSync(new URL(import.meta.url)));
}
console.log(JSON.stringify({status:report.status,error:report.error,cleanupError:report.cleanupError,cases:report.scenarios?.length,report:join(output,'external-settings-native.json')}));
