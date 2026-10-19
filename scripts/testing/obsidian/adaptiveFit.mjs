/**
 * Exact-build navigation/late-publication camera fit acceptance in the explicit disposable small vault. Temporary
 * fixtures, native input, observers and settings belong to this driver and are restored on failure.
 * Actual native rectangles establish functional camera fit, not subjective paint or touch quality.
 */
import assert from 'node:assert/strict';
import {spawnNativeSync as spawnSync,obsidianCliExecutable} from './processTools.mjs';
import {createHash} from 'node:crypto';
import {existsSync,mkdirSync,readFileSync,readdirSync,writeFileSync,unlinkSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateTarget} from './runner.mjs';
import {acceptMarkdownSaveContinuity} from './markdownSaveContinuity.mjs';
const projectRoot=resolve(fileURLToPath(new URL('../../..',import.meta.url)));
const vaultName=process.env.KPLEX_TEST_VAULT_NAME;
assert.equal(vaultName,'kplex-test-small','Select the disposable small vault explicitly');
const target=validateTarget({vaultName,vaultPath:process.env.KPLEX_TEST_VAULT_PATH,configDir:process.env.KPLEX_TEST_CONFIG_DIR});
const output=process.env.KPLEX_HOST_REPORT_DIR;
assert(output&&(!existsSync(output)||!readdirSync(output).length),'Choose a fresh report directory');mkdirSync(output,{recursive:true});
const driver=readFileSync(fileURLToPath(import.meta.url));writeFileSync(join(output,'driver-source.mjs'),driver);
const saveHelper=readFileSync(new URL('./markdownSaveContinuity.mjs',import.meta.url));writeFileSync(join(output,'markdownSaveContinuity.mjs'),saveHelper);
const report={status:'running',startedAt:new Date().toISOString(),node:process.version,driverSha256:createHash('sha256').update(driver).digest('hex'),artifacts:{},scenarios:[],limitations:['Electron input and observed native geometry/keyframes are functional evidence; physical touch and perceived paint remain separate.']};
report.markdownSave={selected:process.env.KPLEX_MARKDOWN_SAVE_ONLY==='true',observationOnly:process.env.KPLEX_MARKDOWN_SAVE_OBSERVE_ONLY==='true',helperSha256:createHash('sha256').update(saveHelper).digest('hex')};
const configurations=['data.json','community-plugins.json'].map(name=>{const path=name==='data.json'?join(target.pluginDir,name):join(target.config,name);return{path,bytes:existsSync(path)?readFileSync(path):null}});
/** Reject native eval errors even when CLI returns zero. */
function cli(command,...args){const r=spawnSync(obsidianCliExecutable(),[`vault=${vaultName}`,command,...args],{cwd:projectRoot,encoding:'utf8',timeout:30000,killSignal:'SIGKILL',maxBuffer:4*1024*1024});if(r.error||r.status!==0||/^Error:/m.test(r.stdout))throw r.error??Error(r.stderr||r.stdout);return r.stdout.trim()}
/** Read detached JSON observations instead of retaining renderer objects. */
function evaluate(code){return JSON.parse(cli('eval',`code=${code}`).replace(/^=>\s*/,''))}
/** Poll briefly without blocking the renderer or changing its throttling. */
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
/** Install one cancellable native owner; metadata events publish through the existing source/index path. */
function probe(saveAcceptance,saveOnly,observeSavesOnly){
 const p=app.plugins.plugins['k-plex'],win=require('@electron/remote').getCurrentWindow();
 if(!p?.actionManager||window.__kplexAutoFitProbe||app.setting.isOpen||document.querySelector('.modal-container,.menu'))throw Error('Clean native prerequisites required');
 const c=window.__kplexAutoFitProbe={settings:JSON.parse(JSON.stringify(p.settings)),layout:app.workspace.getLayout(),bounds:win.getBounds(),owners:{linkedDocumentLeaf:p.linkedDocumentLeaf,lastDocumentLeaf:p.lastDocumentLeaf,recentLeafHistory:[...p.recentLeafHistory],sidecarLeaves:new Map(p.sidecarLeaves)},cases:[],done:false,cancelled:false,owned:false};
 const folder='__kplex_auto_fit_native';let leaf,root,surface;
 c.observeSavesOnly=observeSavesOnly;
 /** Fence every task against cleanup and retain strict native deadlines. */
 const check=(value,message)=>{if(c.cancelled)throw Error('Retired auto-fit probe');if(!value)throw Error(message)};
 /** Yield native tasks without changing renderer throttling. */
 const wait=async ms=>{check(true,'active');await new Promise(resolve=>window.setTimeout(resolve,ms));check(true,'active')};
 /** Await actual semantic publication/render completion rather than forcing index refreshes. */
 const until=async(fn,message)=>{const end=Date.now()+15000;while(!fn()){check(Date.now()<end,message);await wait(25)}};
 /** Record complete native assertions only. */
 const passed=(id,details={})=>c.cases.push({id,status:'passed',...details});
 /** Route camera intent to the exact native surface. */
 const action=async id=>{const result=await p.actionManager.dispatch({id,source:'toolbar',surfaceId:surface});check(result.status==='completed',id+' failed');await wait(100)};
 /** Read the actual rendered camera matrix, not an implementation ref. */
 const camera=()=>{const matrix=new DOMMatrix(root.querySelector('.kplex-camera').style.transform);return{x:matrix.e,y:matrix.f,scale:matrix.a}};
 /** Assert the central thought stays at the actual graph viewport center. */
 const centered=()=>{const graph=root.querySelector('.kplex-plex').getBoundingClientRect(),node=root.querySelector('.kplex-role-center').getBoundingClientRect();check(Math.abs(node.left+node.width/2-graph.left-graph.width/2)<1,'Central node is horizontally misaligned');check(Math.abs(node.top+node.height/2-graph.top-graph.height/2)<1,'Central node is vertically misaligned')};
 /** Check finite visible thoughts and bounded list boxes against the fitted viewport. */
 const contained=()=>{const graph=root.querySelector('.kplex-plex').getBoundingClientRect(),boxes=new Set();for(const node of root.querySelectorAll('[data-kplex-path]')){if(!node.getClientRects().length)continue;boxes.add(node.closest('.kplex-zone-scroll')??node)}for(const box of boxes){const r=box.getBoundingClientRect();check(r.left>=graph.left-1&&r.right<=graph.right+1&&r.top>=graph.top-1&&r.bottom<=graph.bottom+1,'Fitted displayed extent is clipped')}};
 /** Preserve normal navigation and wait for its real center identity. */
 const navigate=async file=>{p.notifyNavigation(file.path);await until(()=>p.actionManager.readSnapshot(surface)?.center?.identity===file.path&&root.querySelector('.kplex-role-center [data-kplex-path]')?.dataset.kplexPath===file.path||p.actionManager.readSnapshot(surface)?.center?.identity===file.path&&root.querySelector('.kplex-role-center')?.dataset.kplexPath===file.path,'Navigation center absent');await wait(150)};
 /** Cleanup is idempotent and restores settings/workspace/bounds without retaining test globals. */
 c.cleanup=()=>{if(c.cleanupTask)return c.cleanupTask;c.cleanupTask=(async()=>{c.cancelled=true;await c.task;Object.assign(p.settings,c.settings);await p.saveSettings(false,false);p.index.notifyPresentation();if(c.settings.lastActivePath)p.notifyNavigation(c.settings.lastActivePath);if(c.owned){const owned=app.vault.getFolderByPath(folder);if(owned)await app.vault.delete(owned,true);c.owned=false}win.setBounds(c.bounds);await app.workspace.changeLayout(c.layout);const leaves=app.workspace.getLeavesOfType('k-plex-react-view').concat(app.workspace.getLeavesOfType('markdown'),app.workspace.getLeavesOfType('excalidraw'));const rebind=old=>old?leaves.find(item=>item.id===old.id)??null:null;p.linkedDocumentLeaf=rebind(c.owners.linkedDocumentLeaf);p.lastDocumentLeaf=rebind(c.owners.lastDocumentLeaf);p.recentLeafHistory=c.owners.recentLeafHistory.map(rebind).filter(Boolean);p.sidecarLeaves.clear();for(const[oldHost,oldLeaf]of c.owners.sidecarLeaves){const host=rebind(oldHost),leaf=rebind(oldLeaf);if(host&&leaf)p.sidecarLeaves.set(host,leaf)}win.focus();win.webContents.sendInputEvent({type:'mouseMove',x:0,y:0});c.cleaned=true})();return c.cleanupTask};
 c.task=new Promise(resolve=>window.setTimeout(resolve,0)).then(async()=>{
  win.show();win.focus();win.webContents.focus();await until(()=>document.hasFocus(),'Native foreground unavailable');leaf=app.workspace.getLeavesOfType('k-plex-react-view').find(item=>item.view.contentEl.ownerDocument===document&&p.isKplexLeafVisible(item));root=leaf?.view.contentEl.querySelector('.kplex-app');surface=[...p.actionSurfaceHosts].find(([,entry])=>entry.leaf===leaf)?.[0];check(root&&surface,'Rendered native Plex absent');
  check(!app.vault.getFolderByPath(folder),'Fixture collision');await app.vault.createFolder(folder);c.owned=true;
  p.settings.embedCentralNode=false;p.settings.animationSpeed=0;p.settings.allowAutozoom=true;p.settings.showFolderNodes=false;p.settings.showTagNodes=false;p.settings.renderSiblings=false;p.settings.graphDepth=1;await p.setDocumentSyncMode('off');
  const childKey=p.settings.hierarchy.children[0],parentKey=p.settings.hierarchy.parents[0],leftKey=p.settings.hierarchy.leftFriends[0];check(childKey&&parentKey&&leftKey,'Configured ontology absent');
  const files=new Map();for(const name of ['Center','Child','Next',...Array.from({length:24},(_,n)=>'Late-'+n)]){const file=await app.vault.create(folder+'/'+name+'.md','# '+name+'\n');files.set(name,file);p.index.insertCreatedFile(file)}
  if(saveOnly){p.settings.animationSpeed=1;return saveAcceptance({app,p,leaf,root,files,center:files.get('Center'),parentKey,childKey,wait,until,check,passed,c})}
  const center=files.get('Center');await app.fileManager.processFrontMatter(center,fm=>{fm[childKey]='[['+files.get('Child').path+']]'});p.index.notifyPresentation();await navigate(center);await until(()=>p.index.getNeighborhood(center.path)?.children.some(item=>item.page.path===files.get('Child').path),'Initial child absent');await wait(150);centered();contained();const initial=camera();passed('navigation-centered-fit',{camera:initial});
  await app.fileManager.processFrontMatter(center,fm=>{fm[parentKey]=Array.from({length:12},(_,n)=>'[['+files.get('Late-'+n).path+']]')});await until(()=>p.index.getNeighborhood(center.path)?.parents.length>=12,'Late native metadata did not publish parents');await until(()=>camera().scale<initial.scale,'Late layout did not refit');centered();contained();passed('late-publication-refit',{initial,after:camera(),parents:12});
  await action('view.zoom-in');await action('view.pan.right');const manual=camera();await app.fileManager.processFrontMatter(center,fm=>{fm[leftKey]=Array.from({length:6},(_,n)=>'[['+files.get('Late-'+(12+n)).path+']]')});await until(()=>p.index.getNeighborhood(center.path)?.leftFriends.length>=6,'Late friends did not publish');await wait(200);check(JSON.stringify(camera())===JSON.stringify(manual),'Late publication overwrote manual graph camera');passed('manual-camera-preserved',{camera:manual});
  await action('view.fit');centered();contained();const renewed=camera();await app.fileManager.processFrontMatter(center,fm=>{fm[leftKey]=Array.from({length:12},(_,n)=>'[['+files.get('Late-'+(12+n)).path+']]')});await until(()=>p.index.getNeighborhood(center.path)?.leftFriends.length>=12,'Additional friends did not publish');await wait(200);centered();contained();passed('explicit-fit-renews-following',{before:renewed,after:camera()});
  await action('view.zoom-out');await action('view.pan.left');await navigate(files.get('Next'));centered();contained();passed('new-navigation-renews-fit',{camera:camera()});
  await action('view.zoom-out');const beforeWheel=camera();const graph=root.querySelector('.kplex-plex').getBoundingClientRect(),x=Math.round(graph.left+15),y=Math.round(graph.top+15);win.webContents.sendInputEvent({type:'mouseMove',x,y});win.webContents.sendInputEvent({type:'mouseWheel',x,y,deltaY:80,deltaX:0,canScroll:true});await until(()=>camera().scale!==beforeWheel.scale,'Trusted wheel did not change graph zoom');await wait(150);const wheel=camera();await app.fileManager.processFrontMatter(files.get('Next'),fm=>{fm[childKey]='[['+center.path+']]'});await until(()=>p.index.getNeighborhood(files.get('Next').path)?.children.some(item=>item.page.path===center.path),'Wheel follow-up scene absent');await wait(200);check(JSON.stringify(camera())===JSON.stringify(wheel),'Late publication overwrote trusted wheel camera');const bounds=win.getBounds();win.setBounds({...bounds,width:bounds.width+40,height:bounds.height+30});await wait(200);check(JSON.stringify(camera())===JSON.stringify(wheel),'Pane resize overwrote manual camera');passed('wheel-and-pane-resize-preserve-camera',{camera:wheel});
  p.settings.allowAutozoom=false;p.index.notifyPresentation();await action('view.zoom-in');const scale=camera().scale;await navigate(center);centered();check(camera().scale===scale,'Autozoom-off navigation reset manual scale');passed('disabled-autofit-navigation-centers-only',{scale});
 }).then(()=>{c.done=true},error=>{c.error=String(error?.stack??error);c.done=true});return{installed:true};
}

let installed=false;
try{
 assert.equal(cli('vault','info=path'),target.vault);
 report.obsidian=cli('version');cli('dev:errors','clear');
 for(const name of ['main.js','styles.css','manifest.json']){const built=readFileSync(join(projectRoot,'dist',name)),actual=readFileSync(join(target.pluginDir,name));assert(built.equals(actual),`Installed ${name} mismatch`);report.artifacts[name]=createHash('sha256').update(actual).digest('hex')}
 cli('command','id=k-plex:kplex-start');await delay(1000);evaluate(`JSON.stringify((${probe.toString()})(${acceptMarkdownSaveContinuity.toString()},${process.env.KPLEX_MARKDOWN_SAVE_ONLY==='true'},${process.env.KPLEX_MARKDOWN_SAVE_OBSERVE_ONLY==='true'}))`);installed=true;
 const end=Date.now()+180000;
 while(true){const state=evaluate('JSON.stringify((()=>{const c=window.__kplexAutoFitProbe;return {done:c?.done,error:c?.error,cases:c?.cases,stopAnimations:c?.stopAnimations}})())');report.scenarios=state.cases??[];if(state.stopAnimations)report.stopAnimations=state.stopAnimations;if(state.done){if(state.error)throw Error(state.error);break}assert(Date.now()<end,'Native adaptive fit deadline exceeded');await delay(500)}
 report.nativeErrors=cli('dev:errors');assert(!report.nativeErrors||/^No errors captured\.?$/i.test(report.nativeErrors),'Native JavaScript errors captured');
 report.status='passed';
}catch(error){report.status='failed';report.error=String(error.stack??error)}
finally{
 if(installed){try{evaluate('(()=>{const c=window.__kplexAutoFitProbe;c.cleanup().then(()=>{c.cleanupDone=true},error=>{c.cleanupError=String(error);c.cleanupDone=true});return JSON.stringify(true)})()');const end=Date.now()+30000;while(true){const s=evaluate('JSON.stringify({done:window.__kplexAutoFitProbe?.cleanupDone,error:window.__kplexAutoFitProbe?.cleanupError})');if(s.done){assert(!s.error,s.error);break}assert(Date.now()<end,'Native cleanup timeout');await delay(250)}evaluate('JSON.stringify(delete window.__kplexAutoFitProbe)');report.cleaned=true}catch(error){report.status='failed';report.cleanupError=String(error.stack??error)}}
 for(const item of configurations){if(item.bytes)writeFileSync(item.path,item.bytes);else if(existsSync(item.path))unlinkSync(item.path)}
 report.finishedAt=new Date().toISOString();
 writeFileSync(join(output,'auto-fit-native.json'),JSON.stringify(report,null,2)+'\n');
}
console.log(`Adaptive fit native ${report.status}; ${report.scenarios.length} passed scenarios; ${join(output,'auto-fit-native.json')}`);if(report.error)console.error(report.error);if(report.cleanupError)console.error(report.cleanupError);if(report.status!=='passed')process.exitCode=1;
