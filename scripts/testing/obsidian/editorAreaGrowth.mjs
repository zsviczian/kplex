/** Exact-build native editor placement and area growth across the three production views.
 * Controlled transport and the outer resource backup own unconditional restoration; this scenario
 * owns only its explicit Markdown fixtures, native canvas/editor and existing settings writer. */
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {runControlledProbe} from './controlledProbe.mjs';

/** Exercise real corner buttons, native dirty content, resizing and save/close without a private editor. */
async function scenario(app,c){
 const p=app.plugins.plugins['k-plex'],workspace=app.workspace,remote=require('@electron/remote'),native=remote.getCurrentWindow();
 if(!p||app.setting.isOpen||app.vault.getFiles().length>=1000)throw Error('Clean disposable Small required');
 const original=structuredClone(p.settings),policy=p.savedSettingsPolicy,layout=workspace.getLayout(),bounds=native.getBounds(),maximized=native.isMaximized();
 const folder='Kplex-editor-area-'+Date.now(),files=[],releases=[],cases=[];let createdFolder,host;
 /** Every asynchronous wait belongs to this controller and has a bounded deadline. */
 const until=async(read,message)=>{const end=Date.now()+25000;while(!read()){if(c.closed||Date.now()>end)throw Error(message);await new Promise(resolve=>window.setTimeout(resolve,40))}};
 /** Retain only fixture-owned state and aggregate assertion evidence. */
 const check=(value,message)=>{if(!value)throw Error(message)};
 const path=name=>folder+'/'+name+'.md';
 try{
  await until(()=>p.layoutReady&&!p.isStartupInitializing()&&!p.index.hasActiveSemanticPreparation(),'Startup did not settle');
  native.restore();native.setBounds({x:20,y:20,width:1800,height:1100});native.show();native.focus();native.webContents.focus();workspace.leftSplit.collapse();workspace.rightSplit.collapse();
  createdFolder=await app.vault.createFolder(folder);const child=p.settings.hierarchy.children[0],names=['Focus','Neighbor',...Array.from({length:20},(_,i)=>'Peer-'+i)];
  for(const name of names){const fm={status:name==='Focus'||name==='Neighbor'?'wood':'metal',...(name==='Focus'?{[child]:names.slice(1).map(name=>'[['+path(name)+']]')}:{})};
   const file=await app.vault.create(path(name),'---\n'+Object.entries(fm).map(([key,value])=>JSON.stringify(key)+': '+JSON.stringify(value)).join('\n')+'\n---\n# '+name+'\n\nOwned editor area fixture.\n');files.push(file);p.index.insertCreatedFile(file);releases.push(p.index.acquireSemanticDemand(file.path));}
  await until(()=>files.every(file=>app.metadataCache.getFileCache(file))&&!p.index.hasActiveSemanticPreparation(),'Fixture indexing did not settle');
  Object.assign(p.settings,{canvasViewSettings:{},embedCentralNode:false,autoOpenCentralDocument:false,followActiveFile:false,animationSpeed:0,allowAutozoom:false,
   parentMaxHeight:140,childMaxHeight:160,friendMaxHeight:140,siblingMaxHeight:120,centerEmbedWidth:700,centerEmbedHeight:450,centralNodeMarkdownMode:'source',graphDepth:1,maxItemCount:30,renderSiblings:false,nodeSortOrder:'name-asc'});
  await p.saveSettings(false,false);p.index.notifyPresentation();
  const anchors=[];workspace.iterateRootLeaves(leaf=>{if(leaf.view.containerEl.ownerDocument===document&&leaf.view.containerEl.getBoundingClientRect().width>0)anchors.push(leaf)});check(anchors[0],'Native main-window anchor absent');
  await workspace.revealLeaf(anchors[0]);workspace.setActiveLeaf(anchors[0],{focus:true});host=workspace.getLeaf('tab');await host.setViewState({type:'k-plex-react-view',active:true});await host.view.waitUntilReady();await workspace.revealLeaf(host);await p.setDocumentSyncMode(host,'off');p.notifyNavigation(path('Focus'),host);
  const root=()=>host.view.containerEl.querySelector('.kplex-app'),doc=host.view.containerEl.ownerDocument,session=host.view.documentSession.plexView;
  const card=()=>[...root().querySelectorAll('.kplex-thought')].find(el=>el.dataset.kplexPath===path('Neighbor'));
  const surface=()=>[...p.actionSurfaceHosts].find(([,entry])=>entry.leaf===host)?.[0];
  const act=(id,args)=>p.actionManager.dispatch({id,source:'internal',surfaceId:surface(),...(args?{args}:{})});
  for(const view of ['wuxing','classic','mindmap']){
   root().querySelector('.kplex-filter-trigger').click();await until(()=>doc.querySelector('.kplex-view-selector select'),'View selector absent');
   const select=doc.querySelector('.kplex-view-selector select');select.value=view;select.dispatchEvent(new doc.defaultView.Event('change',{bubbles:true}));
   await until(()=>session.definition.id===view&&card()?.querySelector('.kplex-thought-corner-action'),'Requested view/neighbor absent');doc.querySelector('.kplex-filter-panel-header button').click();
   const beforeCenter=host.view.documentSession.centerPath,beforeCard=card(),beforeArea=beforeCard.closest('.kplex-zone-panel')?.className;
   beforeCard.querySelector('.kplex-thought-corner-action').click();
   await until(()=>session.editors.bindings.length===1&&root().querySelector('.kplex-central-editor-content .cm-content'),'Exact native occurrence editor absent');
   const binding=session.editors.bindings[0],content=root().querySelector('.kplex-central-editor-content .cm-content');content.focus();
   await until(()=>workspace.activeLeaf?.view.file?.path===path('Neighbor')&&workspace.activeLeaf.view.editor?.getValue().includes('Owned editor area fixture.'),'Native document not loaded');
   const leaf=workspace.activeLeaf,editor=leaf.view.editor;check(host.view.documentSession.centerPath===beforeCenter&&binding.target.path===path('Neighbor'),'Editor opening recentered or retargeted the note');
   check(card().dataset.kplexPath===path('Neighbor')&&card().closest('.kplex-zone-panel')?.className===beforeArea,'Editor changed its canonical note or containing area');
   // Compass deliberately upgrades the ordinary path key to its role/center occurrence key.
   // Other views already have stable occurrence keys before opening the native document.
   if(view!=='classic')check(card()===beforeCard,'Editor replaced an existing occurrence-keyed card');
   const marker='Editor-area-'+view+'-'+Date.now();editor.replaceRange('\n'+marker+'\n',editor.getCursor());const cursor=JSON.stringify(editor.getCursor());
   const resized=await act('editor.resize',{bindingId:binding.id,width:920,height:700});check(resized.status==='completed','Shared editor resize refused');
   await until(()=>{const overlay=root().querySelector('.kplex-central-editor-overlay'),scale=Number(overlay?.style.getPropertyValue('--kplex-editor-camera-scale'))||1,rect=card().getBoundingClientRect();return session.editors.bindings[0]?.dimensions.width===920&&Math.abs(rect.width/scale-920)<1&&Math.abs(rect.height/scale-700)<1},'Editor dimensions did not publish');
   await act('view.fit');await new Promise(resolve=>window.setTimeout(resolve,180));
   const overlay=root().querySelector('.kplex-central-editor-overlay'),clip=getComputedStyle(overlay.querySelector('.kplex-central-editor-document')).clipPath;
   check(clip==='none'||(clip.match(/-?\d+(?:\.\d+)?/g)??[]).every(value=>Number(value)<1),'Expanded editor is clipped by its containing area: '+clip);
   const scroll=card().closest('.kplex-zone-scroll');if(scroll)check(scroll.clientWidth>=920&&scroll.clientHeight>=700,'Scrollable area is smaller than its editor');
   check(root().querySelector('.kplex-central-editor-content .cm-content')===content&&leaf.view.file.path===path('Neighbor')&&editor.getValue().includes(marker)&&JSON.stringify(editor.getCursor())===cursor,'Resize/area growth replaced native content or caret');
   let scrolledClip;
   if(scroll&&scroll.scrollHeight-scroll.clientHeight>64){
    const previous=scroll.scrollTop;scroll.scrollTop=Math.min(100,scroll.scrollHeight-scroll.clientHeight);scroll.dispatchEvent(new Event('scroll'));await new Promise(resolve=>window.setTimeout(resolve,100));
    scrolledClip=overlay.style.getPropertyValue('--kplex-editor-body-clip');
    check(scrolledClip.startsWith('inset(')&&Number.parseFloat(scrolledClip.slice(6))>0,'Actual area scroll did not clip the native body');
    check(getComputedStyle(overlay).clipPath==='none'&&root().querySelector('.kplex-central-editor-content .cm-content')===content&&editor.getValue().includes(marker)&&JSON.stringify(editor.getCursor())===cursor,'Document clipping changed native input or clipped recovery chrome');
    scroll.scrollTop=previous;scroll.dispatchEvent(new Event('scroll'));await new Promise(resolve=>window.setTimeout(resolve,80));
   }
   check(host.view.documentSession.centerPath===beforeCenter,'Area growth changed graph attention');
   c.progress={cases,view,clip,dimensions:{width:session.editors.bindings[0].dimensions.width,height:session.editors.bindings[0].dimensions.height}};
   const box=root().querySelector('.kplex-plex').getBoundingClientRect();require('node:fs').writeFileSync(c.screenshotPrefix+'-'+view+'.png',(await native.webContents.capturePage({x:Math.ceil(box.x),y:Math.ceil(box.y),width:Math.floor(box.width),height:Math.floor(box.height)})).toPNG());
   const collapsed=await act('editor.collapse',{bindingId:binding.id});check(collapsed.status==='completed','Native editor save/close failed');
   await until(()=>!session.editors.bindings.length&&!root().querySelector('.kplex-central-editor-overlay'),'Editor did not retire');
   check((await app.vault.read(files.find(file=>file.path===path('Neighbor')))).includes(marker),'Dirty native content was not saved');
   cases.push({id:'native-in-place-editor-area-growth-save-close',view,clip,scrolledClip,width:920,height:700});
  }
  check(cases.some(item=>item.scrolledClip),'A real overflowing area must exercise native document clipping');
  return {cases,host:{electron:process.versions.electron,chrome:process.versions.chrome},fixtureNotesEditedOnly:true};
 }finally{
  if(host){const binding=host.view.documentSession?.plexView.editors.bindings[0];if(binding){const surface=[...p.actionSurfaceHosts].find(([,entry])=>entry.leaf===host)?.[0];await p.actionManager.dispatch({id:'editor.collapse',source:'internal',surfaceId:surface,args:{bindingId:binding.id}});}if(workspace.getLeafById(host.id)===host)host.detach();}
  for(const release of releases.reverse())release();p.settings=original;await p.saveSettings(false,false);p.savedSettingsPolicy=policy;await workspace.changeLayout(layout);native.setBounds(bounds);if(maximized)native.maximize();
  for(const file of files.reverse())if(app.vault.getFileByPath(file.path)===file)await app.vault.delete(file,true);if(createdFolder&&!createdFolder.children.length)await app.vault.delete(createdFolder,true);
  await p.settingsWriteQueue;await new Promise(resolve=>window.setTimeout(resolve,500));await app.vault.adapter.write(p.manifest.dir+'/data.json',c.originalData);
 }
}
if(process.env.KPLEX_TEST_VAULT_NAME!=='kplex-test-small')throw Error('Explicit disposable Small required');
const definitions='c.originalData='+JSON.stringify(readFileSync(join(process.env.KPLEX_TEST_CONFIG_DIR,'plugins/k-plex/data.json'),'utf8'))+';c.screenshotPrefix='+JSON.stringify(join(process.env.KPLEX_HOST_REPORT_DIR,'editor-area'))+';';
await runControlledProbe('editor-area-growth',scenario,definitions,['src/ui/PlexGraph.tsx','src/ui/plexViews/prepareScene.ts','src/core/plex/views/wuxing/definition.ts','src/core/plex/views/classic/geometry.ts']);
