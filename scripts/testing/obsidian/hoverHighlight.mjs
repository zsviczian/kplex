/** Exact-build Settings and trusted mouse/modifier acceptance; owns only disposable hover fixtures. */
import {withNativeDocumentSessions} from "./nativeDocumentSessions.mjs";
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {existsSync,mkdirSync,readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {obsidianCliExecutable,spawnNativeSync} from './processTools.mjs';
import {validateTarget} from './runner.mjs';
import {acceptCrosslinkPeek} from './crosslinkPeek.mjs';
const root=fileURLToPath(new URL('../../..',import.meta.url));
const vaultName=process.env.KPLEX_TEST_VAULT_NAME;assert.equal(vaultName,'kplex-test-small');
const target=validateTarget({vaultName,vaultPath:process.env.KPLEX_TEST_VAULT_PATH,configDir:process.env.KPLEX_TEST_CONFIG_DIR});
const output=process.env.KPLEX_HOST_REPORT_DIR;assert(output&&(!existsSync(output)||!readdirSync(output).length),'Use a fresh report directory');
mkdirSync(output,{recursive:true});
/** Keep CLI targeting and long-eval transport bounded and shell-free. */
function cli(command,...args){const r=spawnNativeSync(obsidianCliExecutable(),[`vault=${vaultName}`,command,...args],{encoding:'utf8',timeout:30000,killSignal:'SIGKILL',maxBuffer:4*1024*1024});if(r.error||r.status!==0||/^Error:/m.test(r.stdout))throw r.error??Error(r.stderr||r.stdout);return r.stdout.trim()}
/** Return finite receipts, never live renderer objects. */
function evaluate(code){code=withNativeDocumentSessions(code);return JSON.parse(cli('eval','code='+code).replace(/^=>\s*/,''))}
assert.equal(cli('vault','info=path'),target.vault);
const backups=['plugins/k-plex/data.json','community-plugins.json','workspace.json','appearance.json'].filter(name=>existsSync(join(target.config,name))).map(name=>({name,bytes:readFileSync(join(target.config,name))}));
const artifacts=Object.fromEntries(['main.js','styles.css','manifest.json'].map(name=>{const bytes=readFileSync(join(root,'dist',name));assert(bytes.equals(readFileSync(join(target.pluginDir,name))),'Stale installed '+name);return[name,createHash('sha256').update(bytes).digest('hex')]}));

/** Actual Settings navigation plus real SVG/node/gate targets in each owning Electron renderer. */
function start(acceptCrosslinkPeek){
 const p=app.plugins.plugins['k-plex'],tab=p.settingsTab;
 if(window.__kplexHoverProbe||app.setting.isOpen)throw Error('Clean native prerequisites required');
 const c=window.__kplexHoverProbe={settings:structuredClone(p.settings),policy:p.savedSettingsPolicy,layout:app.workspace.getLayout(),owners:{documents:documentSessions(p).capture(),last:p.lastDocumentLeaf,recent:[...p.recentLeafHistory],sidecars:[...p.sidecarLeaves]},cases:[],diagnostics:[],events:[],restores:[],releases:[],owned:[],done:false,counts:{reads:0,parses:0,acquisitions:0,semantics:0,search:0}};
 const check=(condition,message)=>{if(!condition)throw Error(message)};
 const wait=ms=>new Promise(r=>window.setTimeout(r,ms));
 const until=async(read,message)=>{const end=Date.now()+15000;while(!read()){check(!c.cancelled&&Date.now()<end,message);await wait(30)}};
 const observe=(owner,name,key)=>{const original=owner[name];owner[name]=function(...args){c.counts[key]++;return original.apply(this,args)};c.restores.push(()=>owner[name]=original)};
 const path='__kplex_hover_A.md',other='__kplex_hover_B.md';
 /** Select the owning native window without changing its background-throttling policy. */
 const focus=leaf=>{const view=leaf.view.contentEl.ownerDocument.defaultView,remote=view.require('@electron/remote'),native=remote.getCurrentWindow();if(native.isFocused()&&view.document.hasFocus())return native;if(typeof remote.app.show==='function')remote.app.show();remote.app.focus({steal:true});native.restore();native.show();native.focus();native.webContents.focus();return native};
 const rootOf=leaf=>leaf.view.contentEl;
 const highlighted=leaf=>rootOf(leaf).querySelectorAll('.kplex-edge.is-highlighted').length;
 /** Deliver trusted native movement to the actual painted target, with no synthetic enter events. */
 const move=(leaf,target,alt=false)=>{const native=focus(leaf);let point;if(target.matches('.kplex-edge-hit')){const local=target.getPointAtLength(target.getTotalLength()*0.45);point=new DOMPoint(local.x,local.y).matrixTransform(target.getScreenCTM())}else{const rect=target.getBoundingClientRect();point={x:rect.x+rect.width/2,y:rect.y+rect.height/2}}const hit=target.ownerDocument.elementFromPoint(Math.round(point.x),Math.round(point.y));c.diagnostics.push({target:target.className.baseVal??target.className,point:{x:point.x,y:point.y},hit:hit?.className.baseVal??hit?.className,owner:native.id,document:target.ownerDocument===document,alt});native.webContents.sendInputEvent({type:'mouseMove',x:Math.round(point.x),y:Math.round(point.y),modifiers:alt?['alt']:[]})};
 const key=(leaf,down)=>focus(leaf).webContents.sendInputEvent({type:down?'keyDown':'keyUp',keyCode:'Alt',modifiers:down?['alt']:[]});
 const leave=async leaf=>{const native=focus(leaf);native.webContents.sendInputEvent({type:'mouseMove',x:2,y:2});await wait(80)};
 /** Click the real native toggle and wait for its existing durable queued writer. */
 const toggle=async enabled=>{
  p.openSettings();await until(()=>tab.containerEl.isConnected,'Native Settings absent');
  check(tab.openSettingsPage(p.translator('settings.ui.plex.behavior')),'Plex behavior page absent');
  const doc=tab.containerEl.ownerDocument;
  await until(()=>[...doc.querySelectorAll('.setting-item-name')].some(el=>el.getClientRects().length&&el.textContent===p.translator('settings.hoverHighlight.name')),'Actual hover preference absent');
  const row=[...doc.querySelectorAll('.setting-item-name')].find(el=>el.getClientRects().length&&el.textContent===p.translator('settings.hoverHighlight.name')).closest('.setting-item');
  const modifier=p.translator(require('node:process').platform==='darwin'?'shortcut.option':'shortcut.alt');
  check(row.textContent.includes(modifier),'Host-specific modifier name missing');
  if(p.settings.hoverHighlightRequiresAlt!==enabled)row.querySelector('.checkbox-container').click();
  await until(()=>p.settings.hoverHighlightRequiresAlt===enabled,'Native toggle did not update');await p.settingsWriteQueue;await wait(200);
  check((await p.loadData()).hoverHighlightRequiresAlt===enabled,'Native toggle not durable');app.setting.close();await wait(100);
 };
 c.task=(async()=>{
  try{
   await until(()=>!p.isStartupInitializing(),'Startup did not settle');
   check(!app.vault.getFileByPath(path)&&!app.vault.getFileByPath(other),'Fixture collision');
   const a=await app.vault.create(path,`[[${other.slice(0,-3)}]]\n`);c.owned.push(path);
   const b=await app.vault.create(other,'Synthetic hover endpoint\n');c.owned.push(other);
   await until(()=>app.metadataCache.getFileCache(a)?.links?.length,'Fixture metadata absent');
   Object.assign(p.settings,{embedCentralNode:false,inferAllLinksAsFriends:true,renderSiblings:false,showFolderNodes:false,showTagNodes:false,graphDepth:1,animationSpeed:0});
   await documentSessions(p).off();await p.saveSettings();await p.activateView();
   p.index.insertCreatedFile(a);p.index.insertCreatedFile(b);c.releases.push(p.index.acquireSemanticDemand(path),p.index.acquireSemanticDemand(other));
   await p.index.refreshSemanticSettings();p.notifyNavigation(path);
   const findLeaf=()=>app.workspace.getLeavesOfType('k-plex-react-view').find(leaf=>p.isKplexLeafVisible(leaf)&&rootOf(leaf).querySelector(`.kplex-role-center[data-kplex-path="${path}"]`));
   await until(()=>findLeaf()?.view.contentEl.querySelector('.kplex-edge-hit'),'Native fixture scene absent');
   const main=findLeaf();focus(main);rootOf(main).querySelector('button[aria-label="'+p.translator('graph.fitGraph')+'"]')?.click();await wait(500);await until(()=>!p.index.hasPendingSemanticPreparation(),'Fixture acquisition pending');
   observe(app.vault,'read','reads');observe(app.vault,'cachedRead','reads');observe(p.index.sourceAcquisition,'parse','parses');observe(p.index.sourceAcquisition,'acquire','acquisitions');observe(p.index,'refreshSemanticSettings','semantics');observe(p.index,'prepareSearchIndex','search');
   await toggle(true);
   /** Test each actual target with and without modifier, including stationary key transitions. */
   const matrix=async(leaf,label)=>{
    focus(leaf);await wait(150);
    const root=rootOf(leaf),doc=root.ownerDocument,owner=doc.defaultView,events=[];
    const record=event=>{const fact={type:event.type,trusted:event.isTrusted,alt:event.altKey,key:event.key,target:event.target.className?.baseVal??event.target.className};events.push(fact);c.events.push(fact)};
    doc.addEventListener('pointerover',record,true);doc.addEventListener('pointerout',record,true);doc.addEventListener('keydown',record,true);owner.addEventListener('blur',record);let listening=true;const stop=()=>{if(!listening)return;listening=false;doc.removeEventListener('pointerover',record,true);doc.removeEventListener('pointerout',record,true);doc.removeEventListener('keydown',record,true);owner.removeEventListener('blur',record)};c.restores.push(stop);
    const targets=[['node',()=>root.querySelector(`.kplex-thought[data-kplex-path="${other}"] .kplex-thought-text`)],['gate',()=>root.querySelector('.kplex-role-center .gate-left.has-connections')],['connector',()=>root.querySelector('.kplex-edge-hit')]];
    for(const [kind,read]of targets){
     check(!c.cancelled,'Retired native hover trial');await leave(leaf);const target=read();check(target,'Missing native '+kind);move(leaf,target);await wait(900);check(highlighted(leaf)===0,label+' '+kind+' highlighted without modifier');
     key(leaf,true);await until(()=>highlighted(leaf)>0,label+' '+kind+' stationary modifier did not activate');key(leaf,false);await until(()=>highlighted(leaf)===0,label+' '+kind+' release retained highlight');
     await leave(leaf);key(leaf,true);move(leaf,read(),true);await until(()=>highlighted(leaf)>0,label+' '+kind+' modifier entry failed');await leave(leaf);check(highlighted(leaf)===0,label+' '+kind+' leave retained highlight');key(leaf,false);
     c.cases.push(label+' '+kind+' requires modifier, activates on entry/key and clears on release/leave');
    }
    check(events.some(event=>event.type==='pointerover'&&event.trusted)&&events.some(event=>event.type==='keydown'&&event.trusted),'Trusted native input not observed');stop();
   };
   await matrix(main,'main');
   c.mainCounts={...c.counts};
   const popout=app.workspace.getLeaf('window');c.popout=popout;await popout.setViewState({type:'k-plex-react-view',active:true});await popout.view.waitUntilReady();await app.workspace.revealLeaf(popout);p.notifyNavigation(path);
   await until(()=>rootOf(popout).querySelector('.kplex-role-center')?.dataset.kplexPath===path&&rootOf(popout).querySelector(`.kplex-thought[data-kplex-path="${other}"] .kplex-thought-text`)&&rootOf(popout).querySelector('.kplex-edge-hit'),'Popout fixture graph absent');rootOf(popout).querySelector('button[aria-label="'+p.translator('graph.fitGraph')+'"]')?.click();await wait(500);await until(()=>!p.index.hasPendingSemanticPreparation(),'Popout preparation pending');c.excludedViewSetupCounts=Object.fromEntries(Object.keys(c.counts).map(key=>[key,c.counts[key]-c.mainCounts[key]]));for(const name of Object.keys(c.counts))c.counts[name]=0;await matrix(popout,'popout');
   popout.detach();c.popout=null;focus(main);await toggle(false);
   const target=rootOf(main).querySelector(`.kplex-thought[data-kplex-path="${other}"] .kplex-thought-text`);await leave(main);move(main,target);await wait(100);check(highlighted(main)===0,'Default highlighting did not wait');await until(()=>highlighted(main)>0,'Default delay failed');await leave(main);check(highlighted(main)===0,'Default leave failed');
   c.cases.push('actual Settings durable on/off and default delayed hover restored');
   for(const name of Object.keys(c.counts))c.counts[name]+=c.mainCounts[name];
   check(Object.values(c.counts).every(value=>value===0),'Hover/settings performed source or semantic/search work '+JSON.stringify(c.counts));c.result={cases:c.cases,counts:{...c.counts},excludedViewSetupCounts:c.excludedViewSetupCounts,notes:app.vault.getFiles().length};
   c.result.crosslinkPeek=await acceptCrosslinkPeek({p,c,main,path,other,check,wait,until,focus,rootOf,move,key,leave,toggle});
  }catch(error){c.error=String(error.stack||error)}
  finally{
   try{
    for(const restore of c.restores.reverse())restore();c.popout?.detach();if(app.setting.isOpen)app.setting.close();for(const release of c.releases)release();
    p.settings=c.settings;p.savedSettingsPolicy=c.policy;await p.saveSettings();
    for(const path of c.owned){const file=app.vault.getFileByPath(path);if(file)await app.vault.delete(file)}
    await app.workspace.changeLayout(c.layout);const leaves=[];app.workspace.iterateAllLeaves(leaf=>leaves.push(leaf));const rebind=old=>old?leaves.find(leaf=>leaf.id===old.id)??null:null;await documentSessions(p).restore(c.owners.documents);p.lastDocumentLeaf=rebind(c.owners.last);p.recentLeafHistory=c.owners.recent.map(rebind).filter(Boolean);p.sidecarLeaves.clear();for(const [oldHost,oldNote]of c.owners.sidecars){const host=rebind(oldHost),note=rebind(oldNote);if(host&&note)p.setSidecarOwner(host,note)}if(c.settings.lastActivePath)p.notifyNavigation(c.settings.lastActivePath);await p.settingsWriteQueue;
    check(c.owned.every(path=>!app.vault.getFileByPath(path)),'Owned notes remain');c.cleaned=true;
   }catch(error){c.cleanupError=String(error.stack||error)}c.done=true;
  }
 })();return true;
}
const sourceFiles=['src/ui/components/hoverHighlight.ts','src/ui/PlexGraph.tsx','src/ui/layout.ts','styles.css','src/ui/ThoughtNode.tsx','src/settings.ts','scripts/testing/obsidian/crosslinkPeek.mjs',...['en','de','es','fr','nl','ja','ru','zh-TW'].map(locale=>'src/lang/'+locale+'.ts')];
const source={base:spawnNativeSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8',timeout:10000}).stdout.trim(),files:Object.fromEntries(sourceFiles.map(name=>[name,createHash('sha256').update(readFileSync(join(root,name))).digest('hex')]))};
const report={source,status:'running',node:process.version,host:process.platform,startedAt:new Date().toISOString(),artifacts};
try{
 report.obsidian=cli('version');evaluate('('+start.toString()+')('+acceptCrosslinkPeek.toString()+')');const end=Date.now()+180000;
 while(true){await new Promise(r=>setTimeout(r,300));const state=evaluate('JSON.stringify((()=>{const c=window.__kplexHoverProbe;return{done:c?.done,error:c?.error,cleanupError:c?.cleanupError,result:c?.result,cases:c?.cases,diagnostics:c?.diagnostics,events:c?.events}})())');if(state.done){report.result=state.result;report.cases=state.cases;report.diagnostics=state.diagnostics;report.events=state.events;assert(!state.error&&!state.cleanupError,state.error||state.cleanupError);report.status='passed';break}assert(Date.now()<end,'Native hover deadline')}
}catch(error){report.status='failed';report.error=String(error);process.exitCode=1}
finally{
 try{const deadline=Date.now()+25000;while(true){const state=evaluate('JSON.stringify((()=>{const c=window.__kplexHoverProbe;if(!c)return{absent:true};if(!c.done){c.cancelled=true;return{pending:true}}if(!c.cleaned)throw Error(c.cleanupError||"Cleanup incomplete");delete window.__kplexHoverProbe;return{removed:true}})())');if(!state.pending)break;assert(Date.now()<deadline,'Controller still running; preserve configuration until drained');await new Promise(r=>setTimeout(r,150))}for(const backup of backups)writeFileSync(join(target.config,backup.name),backup.bytes);report.configurationBytesRestored=backups.every(backup=>readFileSync(join(target.config,backup.name)).equals(backup.bytes))}
 catch(error){report.status='failed';report.cleanupError=String(error);process.exitCode=1}
 report.completedAt=new Date().toISOString();writeFileSync(join(output,'hover-highlight-native.json'),JSON.stringify(report,null,2)+'\n');writeFileSync(join(output,'driver-source.mjs'),readFileSync(new URL(import.meta.url)));writeFileSync(join(output,'crosslink-peek-source.mjs'),readFileSync(new URL('./crosslinkPeek.mjs',import.meta.url)));
}
console.log(JSON.stringify(report));
