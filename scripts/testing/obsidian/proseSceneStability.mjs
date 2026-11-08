/** Native sidecar autosaves must retain scene identities, geometry and visibility until a real edit. */
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {homedir} from 'node:os';
import {runControlledProbe} from './controlledProbe.mjs';
import {nativeBatch270} from './nativeBatch270.mjs';
import {nativeDocumentSessions} from './nativeDocumentSessions.mjs';
import {validateTarget} from './runner.mjs';
import {acquireHostLock} from './hostLock.mjs';

/** Only fixture notes/settings in the explicitly selected disposable vault may be changed. */
async function scenario(app,c){
 const f=c.fixture(app,c),results=[];let observer,frame,frameWindow;
 try{
  await f.initialize();let p=f.p;
  const target=await f.note('Parent'),field=p.defaultOntologyField('parent');f.check(field,'Configured parent ontology');
  const body=field+':: [['+target.basename+']]\n\nOrdinary prose.';
  const source=await f.note('Center',c.incoming?'':body),edited=c.incoming?target:source;
  const editedBody=c.incoming?field+':: [['+source.basename+']]\n\nOrdinary prose.':body;
  const role=c.incoming?'children':'parents';
  if(c.incoming)await app.vault.modify(edited,editedBody);
  const setupLeaf=await f.canvas(source);await f.ready();
  const settled=()=>{const s=p.index.sourceAcquisition.getActivityState();return !p.indexDirty&&!p.rebuildTask&&p.rebuildTimer===null&&!p.index.hasActiveSemanticPreparation()&&!p.index.hasPendingSemanticPreparation()&&!s.sourceActive&&!s.pendingKnown&&!s.knownImpactTasks&&!s.repoWrites&&!p.index.onDemandTasks.size;};
  for(const mode of ['eager','on-demand']){
   Object.assign(p.settings,{indexingMode:mode,showFolderNodes:false,showTagNodes:false,renderSiblings:false,sidecarMarkdownMode:'source',animationSpeed:200});await p.saveSettings(false,false);
   // Prepare a genuine persisted warm graph outside the measured edit, then retire its owner.
   if(mode==='eager'){
    await f.until(settled,'Warm fixture source convergence');await p.index.sourceAcquisition.flush();p.index.cancelPendingPersistence();
    f.check(await p.index.persistIndexedDbSnapshot(p.index.snapshotPersistGeneration),'Warm fixture snapshot activation');
   }
   if(mode==='eager')setupLeaf.detach();
   p=await f.reload();await c.sessions(p).off();
   const leaf=await f.canvas(source),root=leaf.view.contentEl,doc=root.ownerDocument;await f.ready();
   await f.until(()=>p.index.getNeighborhood(source.path)?.[role].some(row=>row.page.path===target.path)&&settled(),'Body ontology ready');
   await p.openSidecar(leaf,p.index.get(edited.path));const editor=p.sidecarLeaves.get(leaf)?.view.containerEl;
   await f.until(()=>editor?.querySelector('.cm-content')&&settled(),'Sidecar source editor ready');await f.wait(750);
   const session=p.documentSession(leaf);
   const parse=p.index.metadataParser.parse,parser=p.index.metadataParser;
   parser.parse=async function(text,...args){if(text.includes('Plain prose'))await f.wait(250);return parse.call(this,text,...args);};
   f.restores.push(()=>{parser.parse=parse;});
   for(const view of ['classic','mindmap','wuxing']){
    f.check(await session.plexView.requestSelection(view),'Selected native view '+view);await f.ready();await f.wait(750);
    const nodes=()=>[...root.querySelectorAll('.kplex-thought[data-kplex-path]')];
    const baseline=nodes().map(element=>({element,path:element.dataset.kplexPath,rect:element.getBoundingClientRect().toJSON()}));
    f.check(baseline.some(row=>row.path===target.path),'Parent node visible in '+view);
    const edges=[...root.querySelectorAll('[data-kplex-edge-id]')].map(element=>({element,id:element.dataset.kplexEdgeId,d:element.getAttribute('d')}));
    const violations=[];let samples=0;
    /** Inspect the mounted scene at every frame and DOM delivery, including a one-frame blink. */
    const inspect=()=>{
     samples++;const current=nodes();let reason;
     if(current.length!==baseline.length)reason='node-count';
     for(const row of baseline){const element=row.element,r=element.getBoundingClientRect(),style=doc.defaultView.getComputedStyle(element);
      if(!element.isConnected||!current.includes(element))reason='node-identity';
      else if(Math.abs(r.x-row.rect.x)>.5||Math.abs(r.y-row.rect.y)>.5||Math.abs(r.width-row.rect.width)>.5||Math.abs(r.height-row.rect.height)>.5)reason='node-geometry';
      else if(style.visibility==='hidden'||style.display==='none'||Number(style.opacity)<.99)reason='node-visibility';
      for(let owner=element.parentElement;owner&&owner!==root;owner=owner.parentElement)if(Number(doc.defaultView.getComputedStyle(owner).opacity)<.99)reason='ancestor-visibility';
     }
     const currentEdges=[...root.querySelectorAll('[data-kplex-edge-id]')];
     if(currentEdges.length!==edges.length||edges.some(row=>!row.element.isConnected||!currentEdges.includes(row.element)||row.element.getAttribute('d')!==row.d))reason='edge-identity-or-geometry';
     if(reason&&violations.length<32)violations.push({reason,at:performance.now()});
    };
    frameWindow=doc.defaultView;const tick=()=>{inspect();frame=frameWindow.requestAnimationFrame(tick);};frame=frameWindow.requestAnimationFrame(tick);
    observer=new frameWindow.MutationObserver(inspect);observer.observe(root,{subtree:true,childList:true,attributes:true,attributeFilter:['style','class','d']});
    try{
     for(let edit=0;edit<3;edit++){
      const revision=p.getIndexSourceRevision(),content=editor.querySelector('.cm-content'),native=await f.focus(doc);content.focus();
      for(const type of ['keyDown','keyUp'])native.webContents.sendInputEvent({type,keyCode:'End',modifiers:[require('process').platform==='darwin'?'meta':'control']});
      await native.webContents.insertText('\nPlain prose '+view+' '+edit+'.');
      await f.until(()=>p.getIndexSourceRevision()>revision&&settled(),'Native prose autosave '+mode+' '+view);await f.wait(300);inspect();
     }
     f.check(editor.contains(doc.activeElement),'Sidecar editor focus preserved');
     f.check(!violations.length,'Prose-only scene changed '+mode+' '+view+': '+JSON.stringify(violations));
     results.push({mode,view,incomingContributor:!!c.incoming,saves:3,samples,nodeCount:baseline.length,edgeCount:edges.length,sceneStable:true});
    }finally{observer.disconnect();observer=null;frameWindow.cancelAnimationFrame(frame);frame=null;}
   }
   // Genuine link edits must still converge naturally; no direct index patch or forced refresh.
   await app.vault.modify(edited,'The relationship was removed.');await f.until(()=>settled()&&!p.index.getNeighborhood(source.path)?.[role].some(row=>row.page.path===target.path),'Real parent removal');
   await app.vault.modify(edited,editedBody);await f.until(()=>settled()&&p.index.getNeighborhood(source.path)?.[role].some(row=>row.page.path===target.path),'Real parent restoration');
   await p.closeSidecar(leaf,false);leaf.detach();
  }
  return{results,realRelationshipEdits:true,limitations:'Native Windows Electron frames and DOM; macOS and physical mobile remain separate acceptance.'};
 }finally{observer?.disconnect();if(frame!==null&&frame!==undefined)frameWindow?.cancelAnimationFrame(frame);await f.cleanup();}
}

const target=validateTarget({vaultName:process.env.KPLEX_TEST_VAULT_NAME,vaultPath:process.env.KPLEX_TEST_VAULT_PATH,configDir:process.env.KPLEX_TEST_CONFIG_DIR});
if(process.env.KPLEX_TEST_VAULT_NAME!=='kplex-test-small')throw Error('Explicit disposable Small required');
const userData=process.env.KPLEX_OBSIDIAN_USER_DATA??(process.platform==='win32'?join(process.env.APPDATA,'obsidian'):process.platform==='darwin'?join(homedir(),'Library','Application Support','obsidian'):join(homedir(),'.config','obsidian'));
const lock=acquireHostLock({userDataPath:userData});
try{
 const definitions='c.incoming='+JSON.stringify(process.env.KPLEX_PROSE_INCOMING==='true')+';c.fixturePrefix="__kplex_prose_scene_";c.sessions='+nativeDocumentSessions.toString()+';c.fixture='+nativeBatch270.toString()+';c.originalData='+JSON.stringify(readFileSync(join(target.pluginDir,'data.json'),'utf8'))+';c.originalEnabled='+JSON.stringify(readFileSync(join(target.config,'community-plugins.json'),'utf8'))+';';
 await runControlledProbe('prose-scene-stability',scenario,definitions,['src/main.ts','src/ui/PlexGraph.tsx','src/ui/ThoughtNode.tsx'],{maximumMs:420000});
}finally{lock.release();}
