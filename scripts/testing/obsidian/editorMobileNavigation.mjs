/** Exact-build Small-vault acceptance for editor access, PDFs, recovery, revisit state and passive tabs.
 * Native document/editor lifetimes are production; owned fixtures, settings and workspace are restored. */
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {runControlledProbe} from './controlledProbe.mjs';
import {nativeDocumentSessions} from './nativeDocumentSessions.mjs';

/** Exercise rendered controls and real native documents; synthetic clicks prove routing, not touch. */
async function scenario(app,c){
 const p=app.plugins.plugins['k-plex'],workspace=app.workspace;
 const check=(value,message)=>{if(!value)throw Error(message)};
 const wait=ms=>new Promise(resolve=>window.setTimeout(resolve,ms));
 const until=async(read,message)=>{const end=Date.now()+30000;while(!read()){check(!c.closed&&Date.now()<end,message);await wait(50)}};
 check(p&&app.vault.getFiles().length<1000&&!app.setting.isOpen,'Explicit clean Small vault required');
 await until(()=>!p.isStartupInitializing(),'Startup pending');
 const settings=structuredClone(p.settings),policy=p.savedSettingsPolicy,layout=workspace.getLayout();
 const companion=app.plugins.plugins['obsidian-excalidraw-plugin'],drawingModes=companion?{...companion.excalidrawFileModes}:null;
 const sessions=c.documentSessions(p),owners=sessions.capture(),folder='Kplex-Editor-Batch-'+Date.now();
 const files=[],releases=[],hosts=[],cases=[],embedded=new Set();let host,createdFolder,restorePrototype,failure,restoreWindow;
 const root=()=>host?.view.contentEl.querySelector('.kplex-app'),overlay=()=>root()?.querySelector('.kplex-central-editor-overlay');
 const surface=()=>[...p.actionSurfaceHosts].find(([,registration])=>registration.leaf===host)?.[0];
 const act=async id=>{const result=await p.actionManager.dispatch({id,source:'internal',surfaceId:surface()});await wait(50);return result};
 const editor=()=>[...embedded].find(leaf=>root()?.querySelector('.kplex-central-editor-leaf-host')?.contains(leaf.view.containerEl));
 const openEditor=async()=>{const node=root().querySelector('.kplex-role-center');check(node,'Central node absent');const button=node.querySelector('.kplex-thought-corner-action');check(button,'Editor action absent');button.click();await until(()=>overlay()&&editor(),'Native editor absent');await wait(200)};
 const control=key=>[...overlay().querySelectorAll('.kplex-central-editor-toolbar button')].find(button=>button.textContent===p.translator(key));
 const closeEditor=async()=>{control('app.useNormalCentralNode').click();await until(()=>!overlay(),'Close control failed')};
 const title=()=>overlay()?.querySelector('.kplex-central-editor-title')?.textContent;
 const checkFrame=()=>{const frame=overlay().getBoundingClientRect(),canvas=root().querySelector('.kplex-plex').getBoundingClientRect(),toolbar=overlay().querySelector('.kplex-central-editor-toolbar').getBoundingClientRect();
  check(frame.left>=canvas.left&&frame.right<=canvas.right+1&&frame.bottom<=canvas.bottom+1,'Expanded native frame escaped canvas');check(toolbar.top>=canvas.top&&toolbar.bottom<=canvas.bottom,'Recovery controls inaccessible')};
 try{
  const remote=require('@electron/remote'),win=remote.getCurrentWindow(),bounds=win.getBounds(),maximized=win.isMaximized();
  restoreWindow=()=>{win.setBounds(bounds);if(maximized)win.maximize()};remote.app.show?.();remote.app.focus({steal:true});win.restore();win.show();win.focus();
  await sessions.off();workspace.leftSplit.collapse();workspace.rightSplit.collapse();
  createdFolder=await app.vault.createFolder(folder);
  const child=p.settings.hierarchy.children[0];
  const bodies={Root:`---\n${JSON.stringify(child)}: "[[${folder}/Other.md]]"\n---\n# Group\n## Child\nOwned editor batch fixture.`,Other:'# Other\nOwned fixture.'};
  for(const [name,body] of Object.entries(bodies)){const file=await app.vault.create(folder+'/'+name+'.md',body);files.push(file);p.index.insertCreatedFile(file);releases.push(p.index.acquireSemanticDemand(file.path))}
  // A small offline one-page PDF with computed byte offsets; no downloaded test content.
  let pdf='%PDF-1.4\n',offsets=[0];const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 300] /Resources << >> /Contents 4 0 R >>','<< /Length 0 >>\nstream\n\nendstream'];
  for(let i=0;i<objects.length;i++){offsets.push(pdf.length);pdf+=(i+1)+' 0 obj\n'+objects[i]+'\nendobj\n'}
  const start=pdf.length;pdf+='xref\n0 5\n0000000000 65535 f \n'+offsets.slice(1).map(value=>String(value).padStart(10,'0')+' 00000 n \n').join('')+'trailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n'+start+'\n%%EOF\n';
  const document=await app.vault.createBinary(folder+'/Document.pdf',new TextEncoder().encode(pdf).buffer);files.push(document);p.index.insertCreatedFile(document);releases.push(p.index.acquireSemanticDemand(document.path));
  await until(()=>files.slice(0,2).every(file=>app.metadataCache.getFileCache(file)),'Native metadata absent');
  Object.assign(p.settings,{animationSpeed:0,allowAutozoom:false,graphDepth:1,renderSiblings:false,showPageNodes:true,showAttachmentNodes:true,showFolderNodes:false,showTagNodes:false,graphLenses:[],applyPowerFilter:false});p.index.notifyPresentation();
  host=workspace.getLeaf('tab');hosts.push(host);const prototype=Object.getPrototypeOf(host),original=prototype.setViewState;
  prototype.setViewState=function(...args){if(this.containerEl.closest('.kplex-central-editor-leaf-host'))embedded.add(this);return original.apply(this,args)};restorePrototype=()=>{prototype.setViewState=original};
  await host.setViewState({type:'k-plex-react-view',active:true});await host.view.waitUntilReady();host.view.centerPresentation.update({embedCentralNode:false,centralNodeMarkdownMode:'source'});
  p.notifyNavigation(files[0].path,host);await until(()=>host.view.documentSession.centerPath===files[0].path&&root()?.querySelector('.kplex-role-center'),'Root navigation absent');
  const session=host.view.documentSession.plexView;session.select('mindmap');await until(()=>root()?.querySelector('[data-kplex-keyboard-id="root"]'),'Mind Map absent');
  c.progress={phase:'mindmap-editor',cases};await openEditor();check(editor().view.file===files[0],'Wrong native file');check(title()===p.index.titleFor(p.index.get(files[0].path)),'Visible title absent');
  const native=editor(),binding=session.editors.bindings[0],dimensions=JSON.stringify(binding.dimensions),beforeCamera=root().querySelector('.kplex-camera').style.transform;
  const maximize=control('centralEditor.maximize');check(maximize,'Root expansion control absent');maximize.click();await until(()=>overlay()?.classList.contains('is-maximized'),'Root did not expand');await wait(150);checkFrame();
  for(let i=0;i<3;i++)await act('view.zoom-out');checkFrame();check(editor()===native,'Expansion remounted native editor');check(JSON.stringify(session.editors.bindings[0].dimensions)===dimensions,'Expansion overwrote normal size');
  win.setSize(680,680);await wait(300);checkFrame();win.setBounds(bounds);await wait(300);
  control('centralEditor.restore').click();await until(()=>!overlay()?.classList.contains('is-maximized'),'Restore absent');await wait(150);
  check(root().querySelector('.kplex-camera').style.transform===beforeCamera,'Restore lost graph camera');await closeEditor();cases.push('Mind Map root expands/restores/closes with title and the same native editor');
  for(const view of ['classic','mindmap']){
   session.select(view);if(view==='mindmap')session.setRoot(document.path);p.notifyNavigation(document.path,host);
   await until(()=>host.view.documentSession.centerPath===document.path&&root()?.querySelector('.kplex-role-center[data-kplex-path="'+CSS.escape(document.path)+'"]'),'PDF center absent');
   await openEditor();await until(()=>editor()?.view.getViewType()==='pdf'&&overlay()?.querySelector('[data-type="pdf"]'),'Native PDF viewer absent');
   await until(()=>[...overlay().querySelectorAll('canvas')].some(canvas=>canvas.width>0&&canvas.height>0),'Native PDF page did not render');
   check(!overlay().querySelector('.kplex-central-editor-status.is-error'),'PDF failed');await closeEditor();cases.push(view+': native PDF editor opens and closes');
  }
  if(companion){
   c.progress={phase:'drawing-create',cases};const created=await companion.createDrawing('Drawing.excalidraw.md',folder),drawing=typeof created==='string'?app.vault.getFileByPath(created):created;
   check(drawing?.path.startsWith(folder+'/'),'Companion drawing escaped fixture');files.push(drawing);p.index.insertCreatedFile(drawing);releases.push(p.index.acquireSemanticDemand(drawing.path));
   await until(()=>app.metadataCache.getFileCache(drawing)?.frontmatter?.['excalidraw-plugin'],'Drawing metadata absent');
   session.select('mindmap');session.setRoot(drawing.path);p.notifyNavigation(drawing.path,host);await until(()=>root()?.querySelector('.kplex-role-center[data-kplex-path="'+CSS.escape(drawing.path)+'"]'),'Drawing root absent');
   c.progress={phase:'drawing-open',cases};await wait(1100);await openEditor();
   if(control('centralEditor.showDrawing'))control('centralEditor.showDrawing').click();
   await until(()=>editor()?.view.excalidrawAPI,'Native drawing API absent');const drawingApi=editor().view.excalidrawAPI;
   c.progress={phase:'drawing-maximize',cases};await wait(1100);control('centralEditor.maximize').click();await until(()=>overlay()?.classList.contains('is-maximized'),'Drawing expansion absent');await wait(250);checkFrame();check(editor().view.excalidrawAPI===drawingApi,'Expansion replaced the native drawing API');
   check(title()===p.index.titleFor(p.index.get(drawing.path)),'Drawing title absent');c.progress={phase:'drawing-close',cases};await wait(1100);await closeEditor();cases.push('Actual Excalidraw Mind Map root expands with title, stable native API and reachable close');
  }
  session.select('classic');p.notifyNavigation(files[0].path,host);await until(()=>root()?.querySelector('.kplex-role-center[data-kplex-path="'+CSS.escape(files[0].path)+'"]'),'Section center absent');
  c.progress={phase:'revisit',cases};root().querySelector('.kplex-role-center .kplex-section-fold-handle:not(.is-branch-disclosure)').click();await until(()=>root().querySelectorAll('.is-kplex-section').length===2,'Source headings absent');
  root().querySelector('.is-kplex-section .kplex-section-fold-handle').click();await until(()=>root().querySelectorAll('.is-kplex-section').length===1,'Fold absent');await act('view.zoom-out');
  const camera=root().querySelector('.kplex-camera').style.transform;p.notifyNavigation(files[1].path,host);await until(()=>host.view.documentSession.centerPath===files[1].path&&!root().querySelector('.is-kplex-section'),'Away navigation absent');p.notifyNavigation(files[0].path,host);
  await until(()=>root().querySelectorAll('.is-kplex-section').length===1,'Revisited fold not restored');check(root().querySelector('.kplex-camera').style.transform===camera,'Revisited camera lost');cases.push('Compass revisits restore section folds and exact camera');
  c.progress={phase:'passive-tabs',cases};
  const originalRecent=p.findRecentDocumentLeaf,originalCreate=workspace.createLeafBySplit;let creates=0;
  try{p.findRecentDocumentLeaf=()=>null;workspace.createLeafBySplit=function(...args){creates++;return originalCreate.apply(this,args)};await p.setDocumentSyncMode(host,'recent');
   const active=workspace.activeLeaf;await Promise.all(Array.from({length:15},(_,i)=>p.syncPageToDocumentLeaf(p.index.get(files[i%2].path),host)));check(creates===0,'Passive navigation created tabs');check(workspace.activeLeaf===active,'Passive navigation stole focus');
  }finally{p.findRecentDocumentLeaf=originalRecent;workspace.createLeafBySplit=originalCreate;await p.setDocumentSyncMode(host,'off')}
  cases.push('Rapid passive navigation with no document creates no tabs and retains focus');
  c.progress={phase:'popout-recovery',cases};const mainHost=host;
  host=workspace.getLeaf('window');hosts.push(host);await host.setViewState({type:'k-plex-react-view',active:true});await host.view.waitUntilReady();
  host.view.centerPresentation.update({embedCentralNode:false,centralNodeMarkdownMode:'source'});p.notifyNavigation(files[0].path,host);
  await until(()=>host.view.documentSession.centerPath===files[0].path&&root()?.querySelector('.kplex-role-center'),'Popout center absent');host.view.documentSession.plexView.select('mindmap');
  await until(()=>root()?.querySelector('[data-kplex-keyboard-id="root"]'),'Popout Mind Map absent');await openEditor();control('centralEditor.maximize').click();await until(()=>overlay()?.classList.contains('is-maximized'),'Popout expansion absent');await wait(150);checkFrame();
  check(title()===p.index.titleFor(p.index.get(files[0].path)),'Popout title absent');await closeEditor();await until(()=>!root()?.querySelector('.is-central-editor-maximized'),'Closing expanded popout left camera locked');
  cases.push('Popout root title, expanded recovery controls and close while expanded');host=mainHost;
  return {cases,files:app.vault.getFiles().length};
 }catch(error){failure=error;throw error}
 finally{
  const errors=[],clean=async(name,action)=>{try{await action()}catch(error){errors.push(name+': '+error)}};
  if(restorePrototype)restorePrototype();
  for(const leaf of hosts.reverse())await clean('close-owned-host',async()=>{await p.closeSidecar(leaf);leaf.detach()});
  for(const release of releases.reverse())await clean('release-demand',release);
  p.settings=settings;await clean('restore-settings',()=>p.saveSettings(false,false));p.savedSettingsPolicy=policy;
  await clean('restore-workspace',()=>workspace.changeLayout(layout));await clean('restore-native-owners',()=>sessions.restore(owners));
  await wait(300);for(const file of files.reverse())if(app.vault.getFileByPath(file.path)===file)await clean('delete-owned-file',()=>app.vault.delete(file,true));
  if(createdFolder&&app.vault.getFolderByPath(folder)===createdFolder&&!createdFolder.children.length)await clean('delete-owned-folder',()=>app.vault.delete(createdFolder,true));
  if(companion&&drawingModes)await clean('restore-drawing-modes',()=>{for(const key of Object.keys(companion.excalidrawFileModes))if(key.startsWith(folder+'/'))delete companion.excalidrawFileModes[key];Object.assign(companion.excalidrawFileModes,drawingModes)});
  if(restoreWindow)await clean('restore-window',restoreWindow);await clean('drain-settings',()=>p.settingsWriteQueue);await clean('restore-settings-bytes',()=>app.vault.adapter.write(p.manifest.dir+'/data.json',c.originalData));
  if(errors.length)throw Error((failure?String(failure)+'; ':'')+errors.join('; '));
 }
}
if(process.env.KPLEX_TEST_VAULT_NAME!=='kplex-test-small')throw Error('Explicit Small vault required');
const definitions='c.originalData='+JSON.stringify(readFileSync(join(process.env.KPLEX_TEST_CONFIG_DIR,'plugins/k-plex/data.json'),'utf8'))+';c.documentSessions=('+nativeDocumentSessions.toString()+');';
await runControlledProbe('editor-mobile-navigation',scenario,definitions,['src/ui/PlexGraph.tsx','src/ui/CentralNodeEditor.tsx','src/ui/editorOverlayFrame.ts','src/application/PlexViewSession.ts','src/main.ts'],{maximumMs:240000});
