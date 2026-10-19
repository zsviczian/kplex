/**
 * Exact-build remote imagery acceptance in the explicit disposable small vault. A loopback-only
 * image origin records real Electron requests; native note creation/navigation, expanded descendants,
 * hover, shared consent and a second popout surface exercise production rendering. The driver owns
 * its fixture folder, temporary probe and server and restores settings/workspace/configuration bytes
 * independently of assertions. No personal image URL or third-party image origin is used.
 */
import {withNativeDocumentSessions} from "./nativeDocumentSessions.mjs";
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {existsSync,mkdirSync,readFileSync,readdirSync,writeFileSync,unlinkSync} from 'node:fs';
import {createServer} from 'node:http';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnNativeSync,obsidianCliExecutable} from './processTools.mjs';
import {validateTarget} from './runner.mjs';
const root=resolve(fileURLToPath(new URL('../../..',import.meta.url)));
const vaultName=process.env.KPLEX_TEST_VAULT_NAME;
assert.equal(vaultName,'kplex-test-small','Select the disposable small vault explicitly');
const target=validateTarget({vaultName,vaultPath:process.env.KPLEX_TEST_VAULT_PATH,configDir:process.env.KPLEX_TEST_CONFIG_DIR});
const output=process.env.KPLEX_HOST_REPORT_DIR;
assert(output&&(!existsSync(output)||!readdirSync(output).length),'Choose a fresh report directory');mkdirSync(output,{recursive:true});
const report={status:'running',node:process.version,platform:process.platform,startedAt:new Date().toISOString(),artifacts:{},scenarios:[],limitations:['Native Electron network/DOM evidence does not establish physical-device behavior or undo already-sent image requests.']};
const configs=['data.json','community-plugins.json'].map(name=>{const path=name==='data.json'?join(target.pluginDir,name):join(target.config,name);return{path,bytes:existsSync(path)?readFileSync(path):null}});
const requests=[];
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAEElEQVR4nGNwONAARAwQCgApDgYBWgscUQAAAABJRU5ErkJggg==','base64');
const server=createServer(/** Serve owned images and expose phase counts without retaining vault data. */ (request,response)=>{
 response.setHeader('Access-Control-Allow-Origin','*');response.setHeader('Cache-Control','no-store');
 if(request.url==='/checkpoint'){response.setHeader('Content-Type','application/json');response.end(JSON.stringify(requests));return;}
 requests.push(request.url);response.setHeader('Content-Type','image/png');response.end(png);
});
/** Reject CLI Error payloads even when the launcher returns zero. */
function cli(command,...args){const result=spawnNativeSync(obsidianCliExecutable(),[`vault=${vaultName}`,command,...args],{cwd:root,encoding:'utf8',timeout:30000,killSignal:'SIGKILL',maxBuffer:4*1024*1024});if(result.error||result.status!==0||/^Error:/m.test(result.stdout))throw result.error??Error(result.stderr||result.stdout);return result.stdout.trim()}
/** Read detached JSON observations; live instances remain owned by the renderer probe. */
function evaluate(code){code=withNativeDocumentSessions(code);return JSON.parse(cli('eval',`code=${code}`).replace(/^=>\s*/,''))}
/** Keep native task polling separate from renderer work and preserve normal throttling. */
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
/** Own one fixture/probe across reload, reacquiring the plugin and native roots after each replacement. */
function probe(origin){
 let p=app.plugins.plugins['k-plex'];const remote=require('@electron/remote'),win=remote.getCurrentWindow(),folder='__kplex_remote_image_consent';
 if(!p?.index?.invalidateNodeVisuals||window.__kplexRemoteImageProbe||app.setting.isOpen)throw Error('Clean exact-build native prerequisites required');
 const c=window.__kplexRemoteImageProbe={settings:JSON.parse(JSON.stringify(p.settings)),layout:app.workspace.getLayout(),cases:[],done:false,cancelled:false,owned:false,popout:null,owners:{documents:documentSessions(p).capture(),last:p.lastDocumentLeaf?.id,recent:p.recentLeafHistory.map(leaf=>leaf.id),sidecars:[...p.sidecarLeaves].map(([host,leaf])=>[host.id,leaf.id])}};
 let mainLeaf;
 /** Reject continuations after independent cleanup cancels the probe. */
 const check=(value,message)=>{if(c.cancelled)throw Error('Retired remote imagery probe');if(!value)throw Error(message)};
 /** Yield on the main host window; popout closures do not retain a destroyed timer realm. */
 const wait=async ms=>{check(true,'active');await new Promise(resolve=>window.setTimeout(resolve,ms));check(true,'active')};
 /** Wait for observable native DOM/source outcomes with a bounded diagnostic deadline. */
 const until=async(fn,message)=>{const end=Date.now()+20000;while(!fn()){check(Date.now()<end,message);await wait(30)}};
 /** Reacquire current rendered surfaces; root DOM ownership always follows the actual view. */
 const roots=()=>app.workspace.getLeavesOfType('k-plex-react-view').map(leaf=>leaf.view.contentEl.querySelector('.kplex-app')).filter(Boolean);
 /** Limit network assertions to the test-owned node image elements. */
 const images=()=>roots().flatMap(root=>[...root.querySelectorAll('[data-kplex-path]')].filter(el=>el.dataset.kplexPath.startsWith(folder+'/')).flatMap(el=>[...el.querySelectorAll('img')]));
 /** Inspect all owned node imagery, including retained surfaces in another document. */
 const denied=()=>check(images().every(img=>!img.src.startsWith(origin)),'Denied remote src reached native DOM');
 /** Record actual server observations using a test-owned checkpoint request. */
 const arrivals=async()=>await (await fetch(origin+'/checkpoint')).json();
 /** Drive ordinary graph navigation and wait for actual central thought identity. */
 const navigate=async path=>{p.notifyNavigation(path);await until(()=>roots().some(root=>root.querySelector('.kplex-role-center')?.dataset.kplexPath===path),'Native center absent');await wait(200)};
 /** Publish through the real settings path, without direct index notification or semantic work. */
 const consent=async value=>{p.settings.allowRemoteNodeImages=value;await p.saveSettings();await wait(200)};
 /** Record only completed native cases. */
 const passed=(id,details={})=>c.cases.push({id,status:'passed',...details});
 /** Restore runtime preferences and workspace before removing exact owned fixture files. */
 c.cleanup=()=>{if(c.cleanupTask)return c.cleanupTask;c.cleanupTask=(async()=>{
  c.cancelled=true;await c.task;p=app.plugins.plugins['k-plex'];
  if(c.popout){c.popout.detach();c.popout=null;}
  if(p){Object.assign(p.settings,c.settings);await p.saveSettings(false,false);if(c.settings.lastActivePath)p.notifyNavigation(c.settings.lastActivePath);}
  await app.workspace.changeLayout(c.layout);
  if(p){await documentSessions(p).restore(c.owners.documents);p.lastDocumentLeaf=c.owners.last?app.workspace.getLeafById(c.owners.last):null;p.recentLeafHistory=c.owners.recent.map(id=>app.workspace.getLeafById(id)).filter(Boolean);p.sidecarLeaves.clear();for(const[hostId,leafId]of c.owners.sidecars){const host=app.workspace.getLeafById(hostId),leaf=app.workspace.getLeafById(leafId);if(host&&leaf)p.setSidecarOwner(host,leaf);}}
  if(c.owned){const owned=app.vault.getFolderByPath(folder);if(owned)await app.vault.delete(owned,true);c.owned=false;}
  win.show();win.focus();c.cleaned=true;
 })();return c.cleanupTask};
 c.task=new Promise(resolve=>window.setTimeout(resolve,0)).then(async()=>{
  remote.app.focus({steal:true});win.show();win.focus();win.webContents.focus();await until(()=>document.hasFocus()&&!document.hidden,'Native foreground unavailable');
  mainLeaf=app.workspace.getLeavesOfType('k-plex-react-view').find(leaf=>leaf.view.contentEl.ownerDocument===document&&p.isKplexLeafVisible(leaf));check(mainLeaf,'Visible main Plex required');
  check(!app.vault.getFolderByPath(folder),'Fixture collision');await app.vault.createFolder(folder);c.owned=true;
  await consent(false);p.settings.embedCentralNode=false;p.settings.animationSpeed=0;p.settings.graphDepth=2;p.settings.showFolderNodes=false;p.settings.showTagNodes=false;p.settings.renderSiblings=false;p.settings.thumbnailProperty='thumbnail';p.settings.nodeImageProperty='node-image';p.settings.graphLenses=[];p.settings.applyPowerFilter=false;await documentSessions(p).off();await p.saveSettings();
  const key=p.settings.hierarchy.children[0];check(key,'Configured child ontology required');
  const local=await app.vault.createBinary(folder+'/Local.png',Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAEElEQVR4nGNwONAARAwQCgApDgYBWgscUQAAAABJRU5ErkJggg=='),ch=>ch.charCodeAt(0)).buffer);p.index.insertCreatedFile(local);
  const names=['Center','Child','Grandchild','Inline','Replacement','LocalNode'];
  for(const name of names){const fm={};if(name==='Center'){fm.thumbnail=origin+'/center.png';fm[key]=['Child','Inline','Replacement','LocalNode'].map(child=>'[['+folder+'/'+child+'.md]]');}if(name==='Child'){fm['node-image']=origin+'/child.png';fm[key]='[['+folder+'/Grandchild.md]]';}if(name==='Grandchild')fm.thumbnail=origin+'/grandchild.png';if(name==='Replacement')fm['node-image']=origin+'/replacement.png';if(name==='LocalNode')fm.thumbnail='[['+local.path+']]';const text='---\n'+Object.entries(fm).map(([name,value])=>name+': '+JSON.stringify(value)).join('\n')+'\n---\n# '+name+'\n'+(name==='Inline'?'thumbnail:: '+origin+'/inline.png\n':'');const file=await app.vault.create(folder+'/'+name+'.md',text);p.index.insertCreatedFile(file);}
  await navigate(folder+'/Center.md');await until(()=>roots().some(root=>root.querySelector('[data-kplex-path="'+folder+'/Grandchild.md"]')),'Expanded descendant absent');await navigate(folder+'/LocalNode.md');await until(()=>images().some(img=>!img.src.startsWith(origin)&&img.naturalWidth>0),'Centered local vault image did not decode');await navigate(folder+'/Center.md');
  denied();await navigate(folder+'/Child.md');denied();await navigate(folder+'/Center.md');
  for(const node of roots().flatMap(root=>[...root.querySelectorAll('.kplex-thought[data-kplex-path]')].filter(el=>el.dataset.kplexPath.startsWith(folder+'/')))){const doc=node.ownerDocument,r=node.getBoundingClientRect(),owner=doc.defaultView.require('@electron/remote').getCurrentWindow();owner.webContents.sendInputEvent({type:'mouseMove',x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2)});await wait(800);}
  await wait(400);denied();check((await arrivals()).length===0,'Network request before consent');passed('no-consent-main-navigation-expanded-hover-local');
  c.popout=app.workspace.getLeaf('window');await c.popout.setViewState({type:'k-plex-react-view',active:true});await c.popout.view.waitUntilReady();await navigate(folder+'/Center.md');await until(()=>c.popout.view.contentEl.ownerDocument!==document&&c.popout.view.contentEl.querySelector('[data-kplex-path="'+folder+'/LocalNode.md"] img'),'Popout local image absent');
  check(roots().some(root=>root.ownerDocument===document),'Main mounted view retained');denied();check((await arrivals()).length===0,'Fresh no-consent popout made a request');passed('no-consent-two-native-documents');
  // Expanded mini-nodes retain their existing label-only imagery behavior; navigate each note to validate its normal image surface.
  await consent(true);await until(()=>images().filter(img=>img.src.startsWith(origin)).length>=8,'Opt-in central/first-level remote nodes absent in both native views');for(const name of ['Center','Child','Grandchild','Inline','Replacement'])await navigate(folder+'/'+name+'.md');await navigate(folder+'/Center.md');await wait(300);c.optedInRequests=await arrivals();check(['center','child','grandchild','inline','replacement'].every(name=>(c.optedInRequests??[]).includes('/'+name+'.png')),'Native opted-in image requests absent');passed('opt-in-main-and-popout');
  await consent(false);denied();await wait(250);const revoked=await arrivals();
  // Metadata refresh in both still-mounted surfaces exercises the cached/hover consumer path.
  const center=app.vault.getFileByPath(folder+'/Center.md');await app.fileManager.processFrontMatter(center,fm=>{fm.thumbnail=origin+'/never-after-revoke.png'});await wait(800);denied();check(JSON.stringify(await arrivals())===JSON.stringify(revoked),'New network request after revocation');passed('opt-out-main-popout-metadata',{requestsBeforeRevocation:revoked.length});
  c.popout.detach();c.popout=null;win.show();win.focus();win.webContents.focus();await consent(true);
  await app.plugins.disablePlugin('k-plex');await app.plugins.enablePlugin('k-plex');p=app.plugins.plugins['k-plex'];check(p?.settings.allowRemoteNodeImages===true,'Saved consent lost on reload');app.commands.executeCommandById('k-plex:kplex-start');await until(()=>roots().length,'Reloaded Plex absent');await navigate(folder+'/Center.md');await until(()=>images().some(img=>img.src===origin+'/never-after-revoke.png'),'Reloaded explicit opt-in image absent');await consent(false);denied();passed('opt-in-reload-and-opt-out');
 }).then(()=>{c.done=true},error=>{c.error=String(error?.stack??error);c.diagnostics={epoch:p.index.getNodeVisualRevision(),permission:p.settings.allowRemoteNodeImages,nodes:roots().flatMap(root=>[...root.querySelectorAll('[data-kplex-path]')].filter(el=>el.dataset.kplexPath.startsWith(folder+'/')).map(el=>({name:el.dataset.kplexPath.slice(folder.length+1),images:[...el.querySelectorAll('img')].map(img=>({scheme:img.src.split(':')[0],complete:img.complete,width:img.naturalWidth}))}))),localMetadata:app.metadataCache.getFileCache(app.vault.getFileByPath(folder+'/LocalNode.md'))?.frontmatter?.thumbnail,localCache:p.index.nodeVisualCache.get(folder+'/LocalNode.md')};c.done=true});return{installed:true};
}
let installed=false;
try{
 assert.equal(cli('vault','info=path'),target.vault);report.obsidian=cli('version');cli('dev:errors','clear');
 for(const name of ['main.js','styles.css','manifest.json']){const built=readFileSync(join(root,'dist',name)),actual=readFileSync(join(target.pluginDir,name));assert(built.equals(actual),'Installed '+name+' mismatch');report.artifacts[name]=createHash('sha256').update(actual).digest('hex');}
 await new Promise(/** Bind the controlled origin only for this native run. */ (resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)});
 const origin=`http://127.0.0.1:${server.address().port}`;
 cli('command','id=k-plex:kplex-start');await delay(500);evaluate(`JSON.stringify((${probe.toString()})(${JSON.stringify(origin)}))`);installed=true;
 const end=Date.now()+180000;
 while(true){const state=evaluate('JSON.stringify({done:window.__kplexRemoteImageProbe?.done,error:window.__kplexRemoteImageProbe?.error,cases:window.__kplexRemoteImageProbe?.cases,diagnostics:window.__kplexRemoteImageProbe?.diagnostics})');report.scenarios=state.cases??[];if(state.diagnostics)report.diagnostics=state.diagnostics;if(state.done){if(state.error)throw Error(state.error);break}assert(Date.now()<end,'Native image acceptance deadline exceeded');await delay(500)}
 report.nativeErrors=cli('dev:errors');assert(!report.nativeErrors||/^No errors captured\.?$/i.test(report.nativeErrors),'Captured native errors');report.status='passed';
}catch(error){report.status='failed';report.error=String(error.stack??error)}
finally{
 if(installed){try{evaluate('(()=>{const c=window.__kplexRemoteImageProbe;c.cleanup().then(()=>{c.cleanupDone=true},error=>{c.cleanupError=String(error);c.cleanupDone=true});return JSON.stringify(true)})()');const end=Date.now()+30000;while(true){const state=evaluate('JSON.stringify({done:window.__kplexRemoteImageProbe?.cleanupDone,error:window.__kplexRemoteImageProbe?.cleanupError})');if(state.done){assert(!state.error,state.error);break}assert(Date.now()<end,'Native image cleanup deadline exceeded');await delay(200)}evaluate('JSON.stringify(delete window.__kplexRemoteImageProbe)');report.cleaned=true}catch(error){report.status='failed';report.cleanupError=String(error.stack??error)}}
 for(const item of configs){if(item.bytes)writeFileSync(item.path,item.bytes);else if(existsSync(item.path))unlinkSync(item.path);assert(item.bytes?readFileSync(item.path).equals(item.bytes):!existsSync(item.path),'Original configuration bytes not restored');}
 await new Promise(/** Stop the controlled origin independently of probe success. */ resolve=>server.close(resolve));
 report.imageRequests=requests;report.finishedAt=new Date().toISOString();writeFileSync(join(output,'remote-images-native.json'),JSON.stringify(report,null,2)+'\n');
}
console.log(`Remote node images native ${report.status}; ${report.scenarios.length} passed; ${join(output,'remote-images-native.json')}`);if(report.error)console.error(report.error);if(report.cleanupError)console.error(report.cleanupError);if(report.status!=='passed')process.exitCode=1;
