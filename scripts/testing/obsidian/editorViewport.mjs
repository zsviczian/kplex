/** Exact-build bottom-edge editor/focus and gate-origin acceptance in disposable Small.
 * The shared fixture owns notes, native leaves and restoration; the shell serializes all native
 * activity under the shared app lock. No production-vault fallback or companion substitute. */
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {homedir} from 'node:os';
import {acquireHostLock} from './hostLock.mjs';
import {runControlledProbe} from './controlledProbe.mjs';
import {nativeBatch270} from './nativeBatch270.mjs';
import {nativeDocumentSessions} from './nativeDocumentSessions.mjs';

/** Pan actual child notes toward History, open their native editors, and inspect the unchanged
 * canvas/HUD plus a real central-gate drag. Only fixture files may be created or saved. */
async function scenario(app,c) {
 const f=c.fixture(app,c),cases=[];
 try {
  await f.initialize();const p=f.p,companion=app.plugins.plugins['obsidian-excalidraw-plugin'];
  f.check(!document.querySelector('.modal-container .modal'),'No unowned modal may cover native input');
  const openRelation=p.openRelationModal,dialogs=[];
  /** Observe and own only composers opened by this fixture's real gate gestures. */
  p.openRelationModal=function(...args){const modal=openRelation.apply(this,args);dialogs.push(modal);return modal;};
  f.restores.push(()=>{p.openRelationModal=openRelation;for(const modal of dialogs)modal.close();});
  f.check(companion?.createDrawing,'The actual Excalidraw companion is required for drawing coverage');
  const modes={...companion.excalidrawFileModes};
  f.restores.push(()=>{for(const path of Object.keys(companion.excalidrawFileModes))if(path.startsWith(f.folder+'/'))delete companion.excalidrawFileModes[path];Object.assign(companion.excalidrawFileModes,modes)});
  const markdown=await f.note('Markdown child','# Bottom-edge editor\n\n'+Array.from({length:60},(_,i)=>'Line '+i).join('\n\n'));
  const created=await companion.createDrawing('Drawing child.excalidraw.md',f.folder),drawing=typeof created==='string'?app.vault.getFileByPath(created):created;
  f.check(drawing?.path.startsWith(f.folder+'/'),'Drawing must stay inside the owned fixture');f.files.push(drawing);p.index.insertCreatedFile(drawing);
  const field=p.settings.hierarchy.children[0];f.check(field,'Configured child ontology required');
  const file=await f.note('Parent','---\n'+JSON.stringify(field)+':\n  - '+JSON.stringify('[['+markdown.path+']]')+'\n  - '+JSON.stringify('[['+drawing.path+']]')+'\n---\nParent.');
  Object.assign(p.settings,{allowAutozoom:false,showFolderNodes:false,showTagNodes:false,groupRelations:false});await p.saveSettings(false,false);
  const leaf=await f.canvas(file),native=await f.focus(document),session=leaf.view.documentSession.plexView;session.select('classic');
  /** Read only this mounted generation's native canvas. */
  const root=()=>leaf.view.contentEl.querySelector('.kplex-app');
  /** Detached rectangles expose offsets without retaining native view objects. */
  const rect=element=>element.getBoundingClientRect().toJSON();
  /** Fixed chrome must stay in the same canvas coordinate system while a child editor loads. */
  const geometry=()=>({viewport:rect(root().querySelector('.kplex-plex')),controls:rect(root().querySelector('.kplex-zoom-controls')),tint:rect(root().querySelector('.kplex-compass-background'))});
  for(const target of [markdown,drawing]) {
   c.progress={phase:'bottom-editor-'+target.basename,cases};
   await p.actionManager.dispatch({id:'view.fit',source:'internal',surfaceId:f.surface(leaf)});await f.wait(200);
   await f.until(()=>root().querySelector('.kplex-thought[data-kplex-path="'+CSS.escape(target.path)+'"]'),'Child note must be projected');
   const viewport=root().querySelector('.kplex-plex'),node=root().querySelector('.kplex-thought[data-kplex-path="'+CSS.escape(target.path)+'"]'),v=rect(viewport),n=rect(node);
   const start={x:Math.round(v.left+70),y:Math.round(v.top+120)},delta=v.bottom-80-(n.top+n.height/2),deltaX=v.left+v.width/2-(n.left+n.width/2);
   native.webContents.sendInputEvent({type:'mouseMove',...start});native.webContents.sendInputEvent({type:'mouseDown',...start,button:'middle',clickCount:1});
   try {for(let step=1;step<=5;step++){native.webContents.sendInputEvent({type:'mouseMove',x:Math.round(start.x+deltaX*step/5),y:Math.round(start.y+delta*step/5),modifiers:['middlebuttondown']});await f.wait(35)}}
   finally{native.webContents.sendInputEvent({type:'mouseUp',x:Math.round(start.x+deltaX),y:Math.round(start.y+delta),button:'middle',clickCount:1})}
   await f.wait(150);
   // Camera culling may replace the original row; native input must reacquire its current DOM.
   const selector='.kplex-thought[data-kplex-path="'+CSS.escape(target.path)+'"] .kplex-thought-corner-action';
   await f.until(()=>root().querySelector(selector)?.getBoundingClientRect().width>0,'Current bottom-edge editor action');
   const before=geometry();await f.click(root().querySelector(selector));
   await f.until(()=>root().querySelector('.kplex-central-editor-leaf-host [data-type="'+(target===drawing?'excalidraw':'markdown')+'"]'),'Real native editor loaded');
   if(target===drawing)await f.until(()=>root().querySelector('.kplex-central-editor-leaf-host .excalidraw'),'Actual Excalidraw canvas loaded');
   await f.wait(700);
   f.check(viewport.scrollTop===0&&viewport.scrollLeft===0,'Native editor startup scrolled the canvas');
   f.check(JSON.stringify(geometry())===JSON.stringify(before),'Native editor shifted fixed controls or directional tint');
   const gate=root().querySelector('.kplex-role-center [data-kplex-gate="bottom"]'),point=f.point(gate);
   native.webContents.sendInputEvent({type:'mouseMove',...point});native.webContents.sendInputEvent({type:'mouseDown',...point,button:'left',clickCount:1});
   try {
    native.webContents.sendInputEvent({type:'mouseMove',x:point.x+60,y:point.y+60,modifiers:['leftbuttondown']});
    await f.until(()=>root().querySelector('.kplex-drag-connector'),'Real gate drag must render its connector');
    const line=root().querySelector('.kplex-drag-connector'),start=line.getPointAtLength(0).matrixTransform(line.getScreenCTM()),box=rect(gate);
    f.check(Math.abs(start.x-box.left-box.width/2)<2&&Math.abs(start.y-box.top-box.height/2)<2,'Drag must originate at the visible bottom gate');
   } finally {native.webContents.sendInputEvent({type:'mouseUp',...point,button:'left',clickCount:1})}
   // Releasing a gate opens the existing relationship composer. Escape belongs to that native
   // modal, rather than the pointer-drag session; cancel it before testing editor recovery.
   await f.until(()=>document.querySelector('.modal-container .modal'),'Gate release opens its native composer');
   await f.key(document,'Escape');await f.until(()=>!document.querySelector('.modal-container .modal'),'Gate composer cancels');
   await f.wait(150);
   const close=[...root().querySelectorAll('.kplex-central-editor-toolbar button')].find(button=>button.textContent===p.translator('app.useNormalCentralNode'));f.check(close,'Editor recovery control required');
   const events=[];
   /** Retain exact input delivery when a native toolbar action fails its trusted-click receipt. */
   const trace=event=>events.push({type:event.type,x:event.clientX,y:event.clientY,target:event.target?.className,current:close.isConnected,trusted:event.isTrusted});
   for(const type of ['pointerdown','pointerup','click'])document.addEventListener(type,trace,true);
   try{await f.click(close);}catch(error){throw Error(String(error)+'; close input '+JSON.stringify(events));}
   finally{for(const type of ['pointerdown','pointerup','click'])document.removeEventListener(type,trace,true);}
   await f.until(()=>!root().querySelector('.kplex-central-editor-overlay'),'Native editor closes');cases.push(target===drawing?'Excalidraw child':'Markdown child');
  }
  return {cases,canvasScroll:0,gateOrigin:'visible native gate'};
 } catch(error) {
  const leaf=app.workspace.getLeavesOfType('k-plex-react-view').find(leaf=>leaf.view.contentEl.querySelector('.kplex-central-editor-overlay'));
  c.progress={cases,error:String(error),active:app.workspace.activeLeaf?.view.getViewType(),overlays:[...document.querySelectorAll('.kplex-central-editor-overlay')].map(el=>({title:el.textContent.slice(0,180),rect:el.getBoundingClientRect().toJSON()})),leaf:leaf?.id};
  if(c.captureRoot)require('node:fs').writeFileSync(c.captureRoot+'/editor-failure.png',(await require('@electron/remote').getCurrentWindow().webContents.capturePage()).toPNG());
  throw error;
 } finally {await f.cleanup();}
}

const userData=process.env.KPLEX_OBSIDIAN_USER_DATA??(process.platform==='win32'?join(process.env.APPDATA,'obsidian'):process.platform==='darwin'?join(homedir(),'Library','Application Support','obsidian'):join(process.env.XDG_CONFIG_HOME??join(homedir(),'.config'),'obsidian'));
const lock=acquireHostLock({userDataPath:userData});
try {
 const config=process.env.KPLEX_TEST_CONFIG_DIR;
 const definitions='c.captureRoot='+JSON.stringify(process.env.KPLEX_HOST_REPORT_DIR)+';c.fixture='+nativeBatch270.toString()+';c.sessions='+nativeDocumentSessions.toString()+';c.allowOnDemandRoutingStartup=true;c.fixturePrefix="__kplexEditorViewport_";c.originalData='+JSON.stringify(readFileSync(join(config,'plugins/k-plex/data.json'),'utf8'))+';c.originalEnabled='+JSON.stringify(readFileSync(join(config,'community-plugins.json'),'utf8'))+';';
 await runControlledProbe('editor-viewport',scenario,definitions,['styles.css','src/ui/PlexGraph.tsx','src/adapters/obsidian/embeddedMarkdownLeaf.ts'],{maximumMs:300000});
} finally {lock.release();}
