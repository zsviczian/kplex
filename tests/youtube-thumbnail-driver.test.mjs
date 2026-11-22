/** Finite native ports execute the serialized production thumbnail scenario without launching
 * Obsidian, sending network requests or replacing production HTTP/image code. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {Script} from 'node:vm';
import {youtubeThumbnailCases} from '../scripts/testing/obsidian/youtubeThumbnailCases.mjs';

/** Model only native facts/capabilities consumed by this driver; image transport stays unobserved. */
function fixture({online=true,semanticChange=false,changeSource=false,onlineFault=false}={}) {
 const urls=['https://youtu.be/aqz-KE-bpKQ?t=17','https://youtu.be/aqz-KE-bpKQ?t=91'],labels=['Thumbnail first timestamp','Thumbnail second timestamp'];
 const pages=urls.map((url,i)=>({path:url,url,name:labels[i],file:null})),files=new Map(),texts=new Map(),deadlines=[],consents=[],documents=[];
 let cleaned=false,semantic=7;
 const p={settings:{},defaultOntologyField:()=> 'child',actionManager:{dispatch:async request=>assert.equal(request.id,'view.fit')},
  saveSettings:async()=>{consents.push(p.settings.allowRemoteNodeImages);if(p.settings.allowRemoteNodeImages){if(semanticChange)semantic++;if(changeSource)texts.set([...files.keys()][0],'Changed source')}},
  index:{get:path=>pages.find(page=>page.path===path),titleFor:page=>page.name,getSemanticRevision:()=>semantic,
   getSourceAcquisitionCounters:()=>({vaultReads:0,parses:0}),sourceAcquisition:{getActivityState:()=>({sourceActive:false,pendingKnown:0,knownImpactTasks:0,repoWrites:0})},
   resolveNodeVisuals:async selected=>new Map(p.settings.allowRemoteNodeImages?selected.map(page=>[page.path,{youtubeId:'aqz-KE-bpKQ',path:'https://i.ytimg.com/vi/aqz-KE-bpKQ/maxresdefault.jpg'}]):[])}};
 const app={vault:{getFileByPath:path=>files.get(path),read:async file=>texts.get(file.path)}};
 const f={p,check:(value,message)=>assert.ok(value,message),initialize:async()=>{},wait:async()=>{},ready:async()=>{},focus:async()=>{},surface:leaf=>leaf.id,
  owner:doc=>{assert(documents.includes(doc));return{setContentSize(){}}},
  until:async(predicate,message,maximum)=>{deadlines.push({message,maximum});if(onlineFault&&maximum===60000)throw TypeError('Unexpected image predicate fault');assert.ok(predicate(),message)},
  note:async(name,text)=>{const file={path:'owned/'+name+'.md'};files.set(file.path,file);texts.set(file.path,text);return file},
  canvas:async(_file,_type,destination='tab')=>{
   const doc={id:destination};documents.push(doc);
   const nodes=pages.map((page,i)=>({dataset:{kplexPath:page.path},
    querySelector:selector=>{assert.equal(selector,'.kplex-thought-text');return{textContent:'Prefix '+labels[i],getAttribute:name=>name==='title'?'Prefix '+labels[i]:null}},
    querySelectorAll:selector=>{assert.equal(selector,'.kplex-node-visual img');return p.settings.allowRemoteNodeImages&&online?[{getAttribute:name=>name==='src'?'blob:owned-'+destination:null,naturalWidth:320,complete:true}]:[]}}));
   return{id:destination,view:{contentEl:{ownerDocument:doc,querySelectorAll:selector=>{assert.equal(selector,'[data-kplex-path]');return nodes}}}};
  },cleanup:async()=>{cleaned=true;p.settings.allowRemoteNodeImages=false}};
 return{app,control:{fixture:()=>f,closed:false},deadlines,consents,get cleaned(){return cleaned;},get documents(){return documents;}};
}

test('thumbnail native scenario serializes without captured module helpers and proves both document lifetimes',async()=>{
 new Script('('+youtubeThumbnailCases.toString()+')');
 const scenario=Function('return ('+youtubeThumbnailCases.toString()+')')(),f=fixture(),result=await scenario(f.app,f.control);
 assert.equal(result.status,'passed');assert.deepEqual(result.cases.map(row=>row.phase),['permission-off','permission-on','permission-revoked']);
 assert.equal(result.cases[1].decodedBlobImages,4);assert.equal(result.cases[1].transportCounts,'not-observed');assert.equal(result.cases[2].sourceUnchanged,true);
 assert.equal(f.documents.length,2);assert.deepEqual(f.consents,[false,true,false]);assert.equal(f.cleaned,true);
 assert.equal(f.deadlines.find(row=>row.message==='Native online thumbnail decoding in main and popout').maximum,60000);
});

test('thumbnail native timeout is explicitly unavailable while opt-out and exact source checks still complete',async()=>{
 const f=fixture({online:false}),result=await youtubeThumbnailCases(f.app,f.control);
 assert.equal(result.status,'unavailable');assert.equal(result.cases[1].status,'unavailable');assert.equal(result.cases[1].reason,'native-thumbnail-decode-timeout');
 assert.equal(result.cases[2].status,'passed');assert.equal(result.cases[2].sourceUnchanged,true);assert.equal(f.cleaned,true);
 assert(result.limitations.some(value=>value.includes('do not count native HTTP requests')));
});

for(const [options,message]of [[{semanticChange:true},/acquired semantic\/source work/],[{changeSource:true},/Source note bytes/]])test('thumbnail native scenario preserves failure and cleanup: '+message,async()=>{
 const f=fixture(options);await assert.rejects(youtubeThumbnailCases(f.app,f.control),message);assert.equal(f.cleaned,true);
});

test('thumbnail native scenario never relabels an unexpected rendering/programming error as network unavailability',async()=>{
 const f=fixture({onlineFault:true});await assert.rejects(youtubeThumbnailCases(f.app,f.control),/Unexpected image predicate fault/);assert.equal(f.cleaned,true);
});

test('thumbnail native lane records the actual owners and never installs a network interception',()=>{
 const source=readFileSync(new URL('../scripts/testing/obsidian/youtubeThumbnailCases.mjs',import.meta.url),'utf8');
 const driver=readFileSync(new URL('../scripts/testing/obsidian/authoringWorkspace.mjs',import.meta.url),'utf8');
 assert(driver.includes("'youtube-thumbnails':youtubeThumbnailCases"));assert(driver.includes("process.argv.includes('--youtube-thumbnails')"));
 for(const owner of ['src/core/contracts/videoUrl.ts','src/application/youtubeThumbnails.ts','src/adapters/obsidian/youtubeThumbnails.ts','src/adapters/obsidian/urlIdentity.ts','src/ui/features/NodeVisualImage.tsx','src/ui/features/urlEmbed.ts','src/ui/ThoughtNode.tsx','src/types.ts','src/settings.ts','src/core/graph/settingsPolicy.ts','scripts/testing/obsidian/youtubeThumbnailCases.mjs','scripts/testing/obsidian/nativeBatch270.mjs','scripts/testing/obsidian/nativeDocumentSessions.mjs','scripts/testing/obsidian/authoringWorkspace.mjs'])assert(driver.includes(owner),'Missing native source owner: '+owner);
 assert(!/webRequest|setRequestHeader|require\(['"]obsidian['"]\)|\.requestUrl\s*=/.test(source));
});

test('remote image native identity uses the running vault canonical path rather than an obsolete CLI info option',()=>{
 const source=readFileSync(new URL('../scripts/testing/obsidian/remoteNodeImages.mjs',import.meta.url),'utf8');
 assert(source.includes("assert.equal(resolve(evaluate('JSON.stringify({path:app.vault.adapter.getBasePath()})').path),target.vault)"));
 assert(!source.includes("cli('vault','info=path')"));
});

/** Compile the exact serialized native probe, supplying only finite host capabilities. */
function remoteProbeFixture({diagnosticFailure=false,restoreFailure=false}={}){
 const source=readFileSync(new URL('../scripts/testing/obsidian/remoteNodeImages.mjs',import.meta.url),'utf8');
 const declaration=source.slice(source.indexOf('function probe(origin){'),source.indexOf('\nlet installed=false;'));
 const calls=[],window={setTimeout:callback=>{callback();return 1;}},plugin={settings:{allowRemoteNodeImages:false},index:{invalidateNodeVisuals(){}},recentLeafHistory:[],sidecarLeaves:new Map(),whenInitialized:async()=>true,
  saveSettings:async()=>{calls.push('settings');if(restoreFailure)throw Error('Save restoration failed');}};
 const app={plugins:{plugins:{'k-plex':plugin}},setting:{isOpen:false},workspace:{getLayout:()=>({}),getLeavesOfType:()=>{if(diagnosticFailure)throw Error('Diagnostic rendering unavailable');return[];},changeLayout:async()=>calls.push('layout'),getLeafById:()=>null},
  vault:{getFileByPath:()=>null,getFolderByPath:()=>({path:'owned'}),delete:async()=>calls.push('fixture')},metadataCache:{getFileCache:()=>null}};
 const win={show:()=>calls.push('show'),focus:()=>calls.push('focus')};
 const remote={getCurrentWindow:()=>win,app:{focus:()=>{plugin.index=undefined;throw Error('Original native failure');}}};
 const documentSessions=()=>({capture:()=>({}),restore:async()=>calls.push('documents')});
 const install=Function('app','window','require','documentSessions',declaration+';return probe;')(app,window,()=>remote,documentSessions);
 assert.deepEqual(install('http://127.0.0.1:1'),{installed:true});
 return{control:window.__kplexRemoteImageProbe,calls,plugin};
}

test('actual serialized remote probe preserves failure and always completes despite absent reloaded index and diagnostic failure',async()=>{
 for(const diagnosticFailure of [false,true]){
  const f=remoteProbeFixture({diagnosticFailure});await f.control.task;
  assert.equal(f.control.done,true);assert.match(f.control.error,/Original native failure/);
  if(diagnosticFailure)assert.match(f.control.diagnosticError,/Diagnostic rendering unavailable/);
  f.control.owned=true;await f.control.cleanup();assert.equal(f.control.cleaned,true);
  for(const stage of ['settings','layout','documents','fixture','show','focus'])assert(f.calls.includes(stage),stage);
  assert.match(f.control.error,/Original native failure/);
 }
});

test('actual serialized remote cleanup settles a rejected task and attempts independent owners after restoration failure',async()=>{
 const f=remoteProbeFixture({restoreFailure:true});await f.control.task;
 f.control.task=Promise.reject(Error('Rejected controller task'));f.control.owned=true;
 const cleanup=f.control.cleanup();assert.equal(f.control.cleanup(),cleanup,'Cleanup is idempotent');
 await assert.rejects(cleanup,/Save restoration failed/);assert.match(f.control.error,/Original native failure/);
 for(const stage of ['settings','layout','documents','fixture','show','focus'])assert(f.calls.includes(stage),stage);
 assert.equal(f.control.cleaned,false);
});

test('actual native reload block waits for plugin initialization before reading the index or saved consent',async()=>{
 const source=readFileSync(new URL('../scripts/testing/obsidian/remoteNodeImages.mjs',import.meta.url),'utf8');
 const start=source.indexOf("await app.plugins.disablePlugin('k-plex');"),end=source.indexOf("app.commands.executeCommandById('k-plex:kplex-start');",start);
 assert(start>=0&&end>start);const block=source.slice(start,end),AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
 let release,reads=0,ready=false;
 const plugin={whenInitialized:()=>new Promise(resolve=>{release=()=>{ready=true;resolve(true);};}),get index(){reads++;assert(ready);return{};},get settings(){assert(ready);return{allowRemoteNodeImages:true};}};
 const app={plugins:{plugins:{'k-plex':plugin},disablePlugin:async()=>{},enablePlugin:async()=>{}}},check=(value,message)=>assert.ok(value,message);
 const pending=AsyncFunction('app','check','let p;'+block+'return p;')(app,check);
 await Promise.resolve();await Promise.resolve();await Promise.resolve();assert.equal(reads,0);assert.equal(typeof release,'function');release();assert.equal(await pending,plugin);assert.equal(reads,1);
 const failed={whenInitialized:async()=>false,get index(){throw Error('Index accessed after failed initialization');}};app.plugins.plugins['k-plex']=failed;
 await assert.rejects(AsyncFunction('app','check','let p;'+block)(app,check),/Reloaded plugin initialization/);
});
