/** Exact-build scroll/paint acceptance for #229. Own a small synthetic folder, one native view,
 * temporary presentation and configuration/clipboard-free observers; restore them independently. */
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {runControlledProbe} from './controlledProbe.mjs';
import {nativeDocumentSessions} from './nativeDocumentSessions.mjs';
import {validateTarget} from './runner.mjs';

/** Validate actual native scrolling and pixels without waiting for unrelated global preparation. */
async function scenario(app,c){
 if(app.vault.getName()!=='kplex-test-small'||app.vault.getFiles().length>=1000)throw Error('Disposable Small required');
 const p=app.plugins.plugins['k-plex'],workspace=app.workspace,doc=workspace.containerEl.ownerDocument,owner=doc.defaultView;
 const original=structuredClone(p.settings),policy=p.savedSettingsPolicy,layout=workspace.getLayout(),sessions=c.sessions(p),savedSessions=sessions.capture();
 const folder='Kplex-229-'+Date.now(),files=[],cases=[];let directory,host,failure,captureContents,throttling;
 /** Every wait is bounded and retires with the controlled native probe. */
 const wait=ms=>new Promise(resolve=>owner.setTimeout(resolve,ms));
 /** Require observable local state, never a whole-vault readiness promise. */
 const until=async(read,message)=>{const end=Date.now()+25000;while(!read()){if(c.closed||Date.now()>=end)throw Error(message);await wait(30)}};
 /** Fail with synthetic fixture diagnostics only. */
 const check=(value,message)=>{if(!value)throw Error(message)};
 try{
  await sessions.off();Object.assign(p.settings,{documentSyncMode:'off',sidecarOpen:false,embedCentralNode:false,autoOpenCentralDocument:false,followActiveFile:false,animationSpeed:.25,allowAutozoom:false,graphDepth:1,renderSiblings:false,showFolderNodes:true,showTagNodes:false,showPageNodes:true,showCrossLinks:false,groupRelations:false,maxItemCount:300,childMaxHeight:140,graphLenses:[],applyPowerFilter:false,
   baseNodeStyle:{...p.settings.baseNodeStyle,backgroundColor:'#ff00ff'}});p.index.notifyPresentation();
  directory=await app.vault.createFolder(folder);
  for(let i=0;i<60;i++){const file=await app.vault.create(folder+'/Synthetic '+String(i).padStart(3,'0')+'.md','');files.push(file);p.index.insertCreatedFile(file);}
  await until(()=>p.index.get('folder:'+folder),'Synthetic structural folder absent');
  host=workspace.getLeaf('tab');await host.setViewState({type:'k-plex-react-view',active:true});await workspace.revealLeaf(host);await host.view.waitUntilReady();
  const root=()=>host.view.contentEl.querySelector('.kplex-plex');
  p.notifyNavigation('folder:'+folder,host);await until(()=>root()?.querySelectorAll('.kplex-zone-child .kplex-thought').length===60,'Synthetic children absent');
  const scope=root(),camera=scope.querySelector('.kplex-camera'),scroll=scope.querySelector('.kplex-zone-child .kplex-zone-scroll');check(scroll,'Native bounded child area absent');
  check(!camera.getAnimations().some(animation=>animation.effect?.target===camera),'Camera must not acquire an overflow-wide opacity layer');
  check(owner.getComputedStyle(scope).animationName==='kplex-scene-arrive','Scene fade is not attached to the bounded canvas');
  const moving=[...scroll.querySelectorAll('.kplex-thought')].filter(card=>card.getAnimations().length).length;check(moving<60,'Clipped rows acquired animation layers');
  for(const animation of scope.getAnimations({subtree:true}))animation.finish();await wait(80);
  cases.push({id:'bounded-native-scene-and-row-animation',constructed:60,moving});
  /** Compare painted routes with actual card/aperture intersections, including partial rows. */
  const verify=()=>{const aperture=scroll.getBoundingClientRect(),visible=[...scroll.querySelectorAll('.kplex-thought')].filter(card=>{const r=card.getBoundingClientRect();return r.right>aperture.left&&r.left<aperture.right&&r.bottom>aperture.top&&r.top<aperture.bottom});
   const paths=[...scope.querySelectorAll('.kplex-edge-hit')].filter(path=>path.dataset.kplexEdgeId.startsWith('child:'));
   check(paths.length===visible.length&&paths.length>0&&paths.length<60,'Hidden rows retain routes or visible rows lost routes: '+paths.length+'/'+visible.length);
   for(const card of visible)check(paths.some(path=>path.dataset.kplexEdgeId.startsWith('child:'+card.dataset.kplexPath+':')),'Visible synthetic row lost its exact route');return visible;};
  const before={center:host.view.documentSession.centerPath,camera:camera.style.transform},counts=[];
  for(const top of[0,(scroll.scrollHeight-scroll.clientHeight)/2,scroll.scrollHeight,0]){scroll.scrollTop=top;scroll.dispatchEvent(new owner.Event('scroll',{bubbles:true}));await wait(80);counts.push(verify().length)}
  check(before.center===host.view.documentSession.centerPath&&before.camera===camera.style.transform,'Scrolling changed navigation or camera');cases.push({id:'native-scroll-route-identity',visibleCounts:counts});
  // Native capture is valid only after this exact document receives foreground animation frames.
  c.progress={phase:'native-pixels',cases};
  if(c.occludedDiagnostic){
   captureContents=owner.require('@electron/remote').getCurrentWindow().webContents;
   check(typeof captureContents.getBackgroundThrottling==='function'&&typeof captureContents.setBackgroundThrottling==='function','Occluded diagnostic capability absent');
   throttling=captureContents.getBackgroundThrottling();captureContents.setBackgroundThrottling(false);
  }else await until(()=>!doc.hidden&&doc.hasFocus(),'Foreground the disposable Small window before native pixel acceptance');
  await Promise.race([new Promise(resolve=>owner.requestAnimationFrame(()=>owner.requestAnimationFrame(resolve))),wait(3000).then(()=>{throw Error('No native foreground frames')})]);
  const remote=owner.require('@electron/remote'),image=await remote.getCurrentWindow().webContents.capturePage(),size=image.getSize(),bitmap=image.toBitmap({scaleFactor:1});
  require('node:fs').writeFileSync(c.directory+'/scroll-229.png',image.toPNG());
  check(bitmap.length===size.width*size.height*4,'Native bitmap dimensions differ');const sx=size.width/owner.innerWidth,sy=size.height/owner.innerHeight;
  const canvasBounds=scope.getBoundingClientRect(),scrollBounds=scroll.getBoundingClientRect(),sampleCards=verify().filter(card=>{const r=card.getBoundingClientRect();return r.left>=Math.max(canvasBounds.left,scrollBounds.left)+2&&r.right<=Math.min(canvasBounds.right,scrollBounds.right)-2&&r.top>=Math.max(canvasBounds.top,scrollBounds.top)+2&&r.bottom<=Math.min(canvasBounds.bottom,scrollBounds.bottom)-2});check(sampleCards.length>=3,'Three fully painted sample cards required');
  const samples=sampleCards.slice(0,3).map(card=>{const r=card.getBoundingClientRect(),expected=owner.getComputedStyle(card).backgroundColor.match(/[\d.]+/g).slice(0,3).map(Number),x=Math.floor((r.left+5)*sx),y=Math.floor((r.top+r.height/2)*sy),i=(y*size.width+x)*4,actual=[bitmap[i+2],bitmap[i+1],bitmap[i]];c.progress.capture={size,window:{width:owner.innerWidth,height:owner.innerHeight},rect:{x:r.x,y:r.y,width:r.width,height:r.height},x,y,expected,actual};check(actual.every((channel,index)=>Math.abs(channel-expected[index])<8),'Native card pixels missing: '+JSON.stringify({expected,actual}));return{expected,actual}});
  require('node:fs').writeFileSync(c.directory+'/scroll-229.png',image.toPNG());cases.push({id:'native-card-pixels',samples,hidden:doc.hidden,occludedDiagnostic:c.occludedDiagnostic,previousBackgroundThrottling:throttling});return{cases,limitations:'Synthetic native fixture. Occluded diagnostic temporarily disables and restores background throttling for functional pixels only; no foreground/performance claim. Original stale frame was repaired by window exposure; exact original trigger and other platforms remain separate.'};
 }catch(error){failure=error;throw error}
 finally{
  const errors=[];/** Cleanup continues even after a failed pixel or behavior assertion. */const clean=async(label,fn)=>{try{await fn()}catch(error){errors.push(label+': '+String(error))}};
  if(throttling!==undefined)await clean('background-throttling',()=>captureContents.setBackgroundThrottling(throttling));
  if(host)await clean('owned-view',()=>host.detach());p.settings=original;p.savedSettingsPolicy=policy;await clean('settings',()=>p.saveSettings(false,false));
  await clean('workspace',()=>workspace.changeLayout(layout));await clean('sessions',()=>sessions.restore(savedSessions));
  for(const file of files.reverse())if(app.vault.getFileByPath(file.path)===file)await clean('synthetic-note',()=>app.vault.delete(file,true));
  if(directory&&app.vault.getFolderByPath(folder)===directory&&!directory.children.length)await clean('synthetic-folder',()=>app.vault.delete(directory,true));
  await wait(500);await clean('settings-queue',()=>p.settingsWriteQueue);await clean('configuration-bytes',()=>app.vault.adapter.write(p.manifest.dir+'/data.json',c.originalData));
  if(errors.length)throw Error((failure?String(failure)+'; ':'')+errors.join('; '));
 }
}
const target=validateTarget({vaultName:process.env.KPLEX_TEST_VAULT_NAME,vaultPath:process.env.KPLEX_TEST_VAULT_PATH,configDir:process.env.KPLEX_TEST_CONFIG_DIR});
await runControlledProbe('scroll-visibility-229',scenario,'c.occludedDiagnostic='+(process.env.KPLEX_229_OCCLUDED_DIAGNOSTIC==='true')+';c.sessions=('+nativeDocumentSessions.toString()+');c.directory='+JSON.stringify(process.env.KPLEX_HOST_REPORT_DIR)+';c.originalData='+JSON.stringify(readFileSync(join(target.pluginDir,'data.json'),'utf8'))+';',
 ['src/ui/PlexGraph.tsx','src/ui/plexViews/areaVisibility.ts'],{maximumMs:180000});
