/** Exact-build native acceptance for shared maximization, clipped editor chrome, media and Properties.
 * All fixtures and settings/workspace mutations are restricted to the existing disposable Small vault. */
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {runControlledProbe} from './controlledProbe.mjs';
import {nativeDocumentSessions} from './nativeDocumentSessions.mjs';

/** Exercise actual buttons, native renderers and the existing Properties pane without a substitute editor. */
async function scenario(app,c){
 const p=app.plugins.plugins['k-plex'],workspace=app.workspace,remote=require('@electron/remote'),native=remote.getCurrentWindow();
 const check=(value,message)=>{if(!value)throw Error(message)};
 const wait=ms=>new Promise(resolve=>window.setTimeout(resolve,ms));
 const until=async(read,message)=>{const end=Date.now()+30000;while(!read()){if(c.closed||Date.now()>=end)throw Error(message+' '+JSON.stringify(c.progress?{editorFile:nativeEditor()?.view.file?.path,editorType:nativeEditor()?.view.getViewType(),types:[...overlay()?.querySelectorAll('[data-type]')??[]].map(element=>element.dataset.type),error:overlay()?.querySelector('.is-error')?.textContent}:{}));await wait(50)}};
 check(p&&!app.setting.isOpen&&app.vault.getFiles().length<1000,'Explicit clean Small vault required');
 await until(()=>!p.isStartupInitializing(),'Startup pending');
 const original=structuredClone(p.settings),policy=p.savedSettingsPolicy,layout=workspace.getLayout(),bounds=native.getBounds(),maximized=native.isMaximized();
 const sessions=c.documentSessions(p),owners=sessions.capture(),companion=app.plugins.plugins['obsidian-excalidraw-plugin'];
 check(companion,'Existing Excalidraw companion required for the reported area-editor workflow');
 const drawingModes={...companion.excalidrawFileModes},folder='Kplex-Editor-Followup-'+Date.now(),files=[],embedded=new Set(),cases=[];
 let createdFolder,host,properties,restorePrototype,failure;
 const root=()=>host?.view.contentEl.querySelector('.kplex-app'),overlay=()=>root()?.querySelector('.kplex-central-editor-overlay');
 const nativeEditor=()=>[...embedded].find(leaf=>overlay()?.querySelector('.kplex-central-editor-leaf-host')?.contains(leaf.view.containerEl));
 const surface=()=>[...p.actionSurfaceHosts].find(([,entry])=>entry.leaf===host)?.[0];
 const act=(id,args)=>p.actionManager.dispatch({id,source:'internal',surfaceId:surface(),...(args?{args}:{})});
 const control=key=>[...overlay().querySelectorAll('.kplex-central-editor-toolbar button')].find(button=>button.textContent===p.translator(key));
 const close=async()=>{control('app.useNormalCentralNode').click();await until(()=>!overlay()&&!host.view.documentSession.plexView.editors.bindings.length,'Editor did not close');};
 const card=(file,role)=>[...root().querySelectorAll('.kplex-thought')].find(node=>node.dataset.kplexPath===file.path&&(!role||node.classList.contains('kplex-role-'+role)));
 /** Every recovery button stays within the actual canvas; the title remains one ellipsized row. */
 const chrome=()=>{
  const editor=overlay(),toolbar=editor.querySelector('.kplex-central-editor-toolbar'),bar=toolbar.getBoundingClientRect(),canvas=root().querySelector('.kplex-plex').getBoundingClientRect();
  const buttons=[...toolbar.querySelectorAll('button')];
  check(getComputedStyle(editor).clipPath==='none'&&!editor.querySelector('.kplex-central-editor-document').contains(toolbar),'Native document clip also clips recovery controls');
  check(bar.top>=canvas.top&&bar.bottom<=canvas.bottom&&bar.left>=canvas.left&&bar.right<=canvas.right+1,'Toolbar escaped the canvas: '+JSON.stringify({bar:bar.toJSON(),canvas:canvas.toJSON(),clientWidth:root().querySelector('.kplex-plex').clientWidth,styles:editor.style.cssText}));
  check(bar.height<=Math.max(...buttons.map(button=>button.getBoundingClientRect().height))+7,'Editor toolbar wrapped into a second row');
  for(const button of buttons){const box=button.getBoundingClientRect(),hit=toolbar.ownerDocument.elementFromPoint(box.x+box.width/2,box.y+box.height/2);check(hit&&(hit===button||button.contains(hit)),'A recovery control is occluded: '+JSON.stringify({button:button.getAttribute('aria-label'),box:box.toJSON(),hit:hit?.className,hitTag:hit?.tagName,toolbar:bar.toJSON()}));}
  const body=editor.querySelector('.kplex-central-editor-document').getBoundingClientRect(),leaf=editor.querySelector('.kplex-central-editor-leaf-host').getBoundingClientRect();
  check(Math.abs(body.height-leaf.height)<1,'Area editor still reserves a fixed strip inside native content');
 };
 /** Capture only this disposable canvas, using the owning native window. */
 const screenshot=async name=>{const box=root().querySelector('.kplex-plex').getBoundingClientRect();require('node:fs').writeFileSync(c.screenshotPrefix+'-'+name+'.png',(await native.webContents.capturePage({x:Math.ceil(box.x),y:Math.ceil(box.y),width:Math.floor(box.width),height:Math.floor(box.height)})).toPNG());};
 try{
  await sessions.off();native.restore();native.setBounds({x:20,y:20,width:1200,height:900});native.show();native.focus();
  createdFolder=await app.vault.createFolder(folder);
  const created=await companion.createDrawing('Parent with a deliberately long title to verify editor title truncation.excalidraw.md',folder),drawing=typeof created==='string'?app.vault.getFileByPath(created):created;
  check(drawing?.path.startsWith(folder+'/'),'Drawing escaped the fixture');files.push(drawing);
  await app.fileManager.processFrontMatter(drawing,fm=>{fm.status='wood'});
  const image=await app.vault.createBinary(folder+'/Image.png',Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAIAAAD8GO2jAAAACXBIWXMAAAABAAAAAQBPJcTWAAAAK0lEQVR4nGP4u5SBpoi2po9aMGrBqAWjFoxaMGrBqAWjFoxaMGrBqAVURADSYohbK/YbTQAAAABJRU5ErkJggg=='),character=>character.charCodeAt(0)).buffer);files.push(image);
  const video=await app.vault.createBinary(folder+'/Video.mp4',new Uint8Array(c.video).buffer);files.push(video);
  const child=await app.vault.create(folder+'/Child.md','---\nstatus: wood\n---\n# Child\nOwned follow-up fixture.');files.push(child);
  const center=await app.vault.create(folder+'/Focus.md','---\nstatus: wood\n'+JSON.stringify(p.settings.hierarchy.parents[0])+': '+JSON.stringify('[['+drawing.path+']]')+'\n'+JSON.stringify(p.settings.hierarchy.children[0])+': '+JSON.stringify([child,image,video].map(file=>'[['+file.path+']]'))+'\n---\n# Focus\nOwned follow-up fixture.');files.push(center);
  await until(()=>app.metadataCache.getFileCache(center)?.frontmatter&&app.metadataCache.getFileCache(drawing)?.frontmatter?.['excalidraw-plugin'],'Fixture metadata pending');
  Object.assign(p.settings,{canvasViewSettings:{},embedCentralNode:false,autoOpenCentralDocument:false,animationSpeed:0,allowAutozoom:false,showPageNodes:true,showAttachments:true,showInferredNodes:true,showFolderNodes:false,showTagNodes:false,graphLenses:[],applyPowerFilter:false,centralNodeMarkdownMode:'source',centerEmbedWidth:660,centerEmbedHeight:410,graphDepth:1,maxItemCount:30,renderSiblings:false});
  p.index.notifyPresentation();
  host=workspace.getLeaf('tab');const prototype=Object.getPrototypeOf(host),setViewState=prototype.setViewState;
  prototype.setViewState=function(...args){if(this.containerEl.closest('.kplex-central-editor-leaf-host'))embedded.add(this);return setViewState.apply(this,args)};
  restorePrototype=()=>{prototype.setViewState=setViewState};

  await host.setViewState({type:'k-plex-react-view',active:true});await host.view.waitUntilReady();await workspace.revealLeaf(host);host.view.centerPresentation.update({embedCentralNode:false});
  properties=workspace.getRightLeaf(true);check(properties,'Properties leaf unavailable');await properties.setViewState({type:'file-properties',active:false});workspace.rightSplit.expand();
  p.notifyNavigation(center.path,host);const session=host.view.documentSession.plexView;
  for(const view of ['classic','mindmap','wuxing']){
   c.progress={phase:'root-'+view,cases};session.select(view);if(view==='mindmap')session.setRoot(center.path);
   await until(()=>card(center,'center')?.querySelector('.kplex-thought-corner-action'),'Root editor button absent in '+view);
   for(const modified of [false,true]){
    const button=card(center,'center').querySelector('.kplex-thought-corner-action');button.dispatchEvent(new button.ownerDocument.defaultView.MouseEvent('click',{bubbles:true,altKey:modified}));
    await until(()=>overlay()&&nativeEditor()?.view.file===center,'Native root editor absent');check(overlay().classList.contains('is-maximized')===modified,'Root modifier maximize differs in '+view);await wait(250);chrome();
    await until(()=>properties.view.file===center,'Root Properties mismatch');await close();
   }
   cases.push(view+': normal/modifier root opening');
   for(const [file,type]of [[image,'image'],[video,'video']]){
    c.progress={phase:view+'-'+type,cases};await until(()=>card(file)?.querySelector('.kplex-thought-corner-action'),'Media editor button absent');card(file).querySelector('.kplex-thought-corner-action').click();
    await until(()=>nativeEditor()?.view.file===file&&overlay()?.querySelector('[data-type="'+type+'"]'),'Native media view absent');
    await until(()=>type==='image'?overlay().querySelector('img')?.naturalWidth>0:overlay().querySelector('video')?.videoWidth>0,'Native media failed to decode');await wait(250);chrome();
    await until(()=>properties.view.file===file,'Media Properties mismatch');await close();await until(()=>properties.view.file===center,'Collapse did not restore root Properties');
    cases.push(view+': native '+type+' and Properties fallback');
   }
   if(view==='mindmap')for(const file of [image,video]){
    c.progress={phase:'mindmap-media-root',cases};session.setRoot(file.path);p.notifyNavigation(file.path,host);
    await until(()=>card(file,'center')?.querySelector('.kplex-thought-corner-action'),'Media root button absent');
    const button=card(file,'center').querySelector('.kplex-thought-corner-action');button.dispatchEvent(new button.ownerDocument.defaultView.MouseEvent('click',{bubbles:true,altKey:true}));
    await until(()=>nativeEditor()?.view.file===file&&overlay()?.classList.contains('is-maximized'),'Media root did not open maximized');await wait(250);chrome();
    await until(()=>properties.view.file===file,'Media root Properties mismatch');await close();session.setRoot(center.path);p.notifyNavigation(center.path,host);
    await until(()=>card(center,'center')&&properties.view.file===center,'Root restoration after media root failed');cases.push('mindmap: modifier '+file.extension+' root');
   }
  }
  for(const [view,file,role]of [['mindmap',drawing,'parent'],['wuxing',drawing,null],['mindmap',child,'child']]){
   c.progress={phase:view+'-'+role,cases};session.select(view);if(view==='mindmap')session.setRoot(center.path);
   await until(()=>card(file,role)?.querySelector('.kplex-thought-corner-action'),'Area editor button absent');card(file,role).querySelector('.kplex-thought-corner-action').click();
   await until(()=>nativeEditor()?.view.file===file,'Area native editor absent');
   if(file===drawing){if(control('centralEditor.showDrawing'))control('centralEditor.showDrawing').click();await until(()=>nativeEditor()?.view.excalidrawAPI,'Native drawing API absent');}
   const leaf=nativeEditor(),api=leaf.view.excalidrawAPI,binding=session.editors.bindings[0];
   await act('view.fit');await wait(250);chrome();await screenshot(view+'-'+(role??'facet')+'-normal');
   if(file===child){
    const text=leaf.view.editor.getValue(),toggle=overlay().querySelector('[data-kplex-markdown-zoom-toggle]');check(toggle,'Markdown zoom control absent');toggle.click();
    await until(()=>overlay()?.querySelector('.is-markdown-zoom-scaled'),'Markdown scale mode absent');await act('view.zoom-out');await wait(150);
    const mount=overlay().querySelector('.kplex-central-editor-leaf-host'),scale=Number(overlay().style.getPropertyValue('--kplex-editor-camera-scale'));
    const transform=getComputedStyle(mount).transform;check(transform!=='none'&&Math.abs(Number(transform.slice(7).split(',')[0])-scale)<.001,'Markdown scale no longer applies through the document clip wrapper');
    check(nativeEditor()===leaf&&leaf.view.editor.getValue()===text,'Markdown zoom changed its native editor or buffer');toggle.click();await until(()=>!overlay()?.querySelector('.is-markdown-zoom-scaled'),'Fixed Markdown mode did not restore');
    cases.push('native Markdown scale/fixed retains the same document through the clipped wrapper');
   }
   await until(()=>properties.view.file===file,'Area editor Properties mismatch');workspace.setActiveLeaf(properties,{focus:true});await wait(100);check(properties.view.file===file,'Properties focus lost the editor target');
   check((await act('editor.resize',{bindingId:binding.id,width:1100,height:1000})).status==='completed','Area resize refused');
   await act('view.fit');await wait(150);
   for(let n=0;n<12&&overlay().getBoundingClientRect().height<root().querySelector('.kplex-plex').clientHeight+100;n++){await act('view.zoom-in');await wait(50);}
   await act('view.pan.up');await wait(100);chrome();
   check(nativeEditor()===leaf&&leaf.view.excalidrawAPI===api,'Area resize/pan replaced its native editor');
   check(host.view.documentSession.centerPath===center.path,'In-place editor changed central attention');await screenshot(view+'-'+(role??'facet')+'-oversized');
   await close();await until(()=>properties.view.file===center,'Closing area editor did not restore root Properties');cases.push(view+' '+(role??'facet')+': full/oversized chrome, stable native host, Properties');
  }
  return {cases,mediaDecoded:true,propertiesFollowed:true};
 }catch(error){failure=error;if(root())await screenshot('failure');throw error}
 finally{
  const errors=[],clean=async(name,action)=>{try{await action()}catch(error){errors.push(name+': '+error)}};
  if(host&&overlay())await clean('close-native-editor',close);
  if(restorePrototype)restorePrototype();if(properties)await clean('close-owned-properties',()=>properties.detach());if(host)await clean('close-owned-canvas',()=>host.detach());
  p.settings=original;await clean('restore-settings',()=>p.saveSettings(false,false));p.savedSettingsPolicy=policy;
  await clean('restore-workspace',()=>workspace.changeLayout(layout));await clean('restore-native-owners',()=>sessions.restore(owners));
  for(const file of files.reverse())if(app.vault.getFileByPath(file.path)===file)await clean('delete-owned-file',()=>app.vault.delete(file,true));
  if(createdFolder&&!createdFolder.children.length)await clean('delete-owned-folder',()=>app.vault.delete(createdFolder,true));
  for(const key of Object.keys(companion.excalidrawFileModes))if(key.startsWith(folder+'/'))delete companion.excalidrawFileModes[key];Object.assign(companion.excalidrawFileModes,drawingModes);
  await clean('restore-window',()=>{native.setBounds(bounds);if(maximized)native.maximize()});await clean('drain-settings',()=>p.settingsWriteQueue);await clean('restore-settings-bytes',()=>app.vault.adapter.write(p.manifest.dir+'/data.json',c.originalData));
  if(errors.length)throw Error((failure?String(failure)+'; ':'')+errors.join('; '));
 }
}
if(process.env.KPLEX_TEST_VAULT_NAME!=='kplex-test-small')throw Error('Explicit Small vault required');
if(!process.env.KPLEX_EDITOR_VIDEO_FIXTURE)throw Error('Set KPLEX_EDITOR_VIDEO_FIXTURE to an offline generated MP4 fixture');
const definitions='c.originalData='+JSON.stringify(readFileSync(join(process.env.KPLEX_TEST_CONFIG_DIR,'plugins/k-plex/data.json'),'utf8'))+';c.documentSessions=('+nativeDocumentSessions.toString()+');c.video='+JSON.stringify([...readFileSync(process.env.KPLEX_EDITOR_VIDEO_FIXTURE)])+';c.screenshotPrefix='+JSON.stringify(join(process.env.KPLEX_HOST_REPORT_DIR,'editor-followup'))+';';
await runControlledProbe('editor-node-followup',scenario,definitions,['src/ui/PlexGraph.tsx','src/ui/CentralNodeEditor.tsx','src/ui/App.tsx','src/ui/plexViews/areaVisibility.ts','src/ui/plexViews/occurrenceEditors.ts','src/adapters/obsidian/filePropertiesCenter.ts','src/core/plex/actions.ts'],{maximumMs:300000});
