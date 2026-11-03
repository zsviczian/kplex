/** Exact-build #270 acceptance in disposable Small. Production React/native controls receive
 * trusted Electron input; the controller owns fixtures and restores native/settings lifetimes.
 * The staging caller owns the application lock and records immutable source/artifact hashes. */
import {readFileSync} from 'node:fs';
import {homedir} from 'node:os';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {runControlledProbe} from './controlledProbe.mjs';
import {acquireHostLock} from './hostLock.mjs';
import {nativeDocumentSessions} from './nativeDocumentSessions.mjs';
import {nativeBatch270} from './nativeBatch270.mjs';
import {validateTarget} from './runner.mjs';

/** Exercise actual saved-order persistence, native input and fresh symbolic activation across views. */
async function pins(app,c){
 const f=c.fixture(app,c),samples=[];
 try{
  await f.initialize();let p=f.p;
  const a=await f.note('A','[[B]]'),b=await f.note('B','[[A]]');
  for(const name of ['2020-12-31','2021-01-01','2021-01-04','2020-W53','2021-W01','2020-12','2021-01'])await f.note(name,'# '+name);
  let clock=window.moment('2020-12-31T12:00:00').valueOf();p.readSavedPins();const runtime=p.periodicPinRuntime,originalClock=runtime.now;runtime.now=()=>clock;f.restores.push(()=>{runtime.now=originalClock;});
  for(const period of ['day','week','month'])await p.updatePeriodicPin(period,{folder:f.folder,useDailyNotes:false},false);
  const missing=f.folder+'/Missing.md';p.settings.pinnedNodes=[a.path,missing,{kind:'periodic',period:'day'},b.path,{kind:'periodic',period:'week'},{kind:'periodic',period:'month'}];
  p.settings.__kplex270Unknown={keep:['case','order']};await p.saveSettings(false,false);p.index.notifyPresentation();
  const first=await f.canvas(a),second=await f.canvas(b);await f.workspace.revealLeaf(first);await f.wait(200);
  const rows=leaf=>[...leaf.view.contentEl.querySelectorAll('.kplex-pinned-chip')],ids=leaf=>rows(leaf).map(row=>row.getAttribute('data-reorder-id'));
  await f.until(()=>rows(first).length===6&&rows(second).length===6,'Complete mixed pin collection');
  await f.ready();
  const startOrder=JSON.stringify(p.settings.pinnedNodes),centers=[p.documentSession(first).centerPath,p.documentSession(second).centerPath],history=JSON.stringify(p.settings.navigationHistory);
  const source=p.index.getSourceAcquisitionCounters(),semantic=p.index.getSemanticPreparationDiagnostics();
  let saves=0,navigations=0,moves=0;const save=p.saveSettings,notify=p.notifyNavigation,move=p.movePinned;
  p.saveSettings=function(...args){saves++;return save.apply(this,args)};p.notifyNavigation=function(...args){navigations++;return notify.apply(this,args)};
  p.movePinned=function(...args){moves++;return move.apply(this,args)};
  const observed=p;f.restores.push(()=>{observed.saveSettings=save;observed.notifyNavigation=notify;observed.movePinned=move;});
  // Exercise the host's supported DOM menu renderer. OS-native popup input is a separate device lane.
  const showMenu=p.showKplexMenuAtPosition;p.showKplexMenuAtPosition=function(menu,...args){menu.setUseNativeMenu(false);return showMenu.call(this,menu,...args)};f.restores.push(()=>{observed.showKplexMenuAtPosition=showMenu;});
  const destination=rows(first)[2].getBoundingClientRect();
  await f.drag(rows(first)[0].querySelector('[data-reorder-handle]'),{x:Math.round(destination.right-3),y:Math.round(destination.y+destination.height/2)});
  await p.settingsWriteQueue;c.pinState={saved:structuredClone(p.settings.pinnedNodes),first:ids(first),second:ids(second),saves,navigations};
  await f.until(()=>JSON.stringify(p.settings.pinnedNodes)!==startOrder,'Canonical native drop');
  // Hidden tabs deliberately skip presentation work. Reveal each real surface before comparing its DOM.
  await f.workspace.revealLeaf(second);await f.until(()=>ids(first).join()===ids(second).join(),'Shared canonical reorder on reveal');await f.workspace.revealLeaf(first);
  f.check(saves===1&&navigations===0,'One reorder write without navigation');f.check(p.settings.pinnedNodes.includes(missing),'Missing pin survived');
  f.check(JSON.stringify([p.documentSession(first).centerPath,p.documentSession(second).centerPath])===JSON.stringify(centers),'Independent centers retained');f.check(JSON.stringify(p.settings.navigationHistory)===history,'Reorder changed history');
  samples.push({case:'trusted pointer reorder',saves,navigations,order:structuredClone(p.settings.pinnedNodes),twoCanvases:true});
  const order=JSON.stringify(p.settings.pinnedNodes),written=saves;
  const end=rows(first)[1].getBoundingClientRect();await f.drag(rows(first)[0].querySelector('[data-reorder-handle]'),{x:Math.round(end.right-2),y:Math.round(end.y+end.height/2)},doc=>f.key(doc,'Escape'));
  await f.wait(120);f.check(JSON.stringify(p.settings.pinnedNodes)===order&&saves===written&&navigations===0,'Escape persisted or activated pin');
  samples.push({case:'trusted Escape cancellation',saves:0,navigations:0});
  const handle=rows(first)[0].querySelector('[data-reorder-handle]');await f.key(handle.ownerDocument,'Enter',[],handle);
  await f.until(()=>handle.ownerDocument.querySelector('.menu'),'Keyboard reorder menu',5000);
  for(let attempt=0;attempt<4;attempt++){
   const selected=handle.ownerDocument.querySelector('.menu .menu-item.is-selected');if(selected?.textContent.includes(p.translator('pins.moveRight')))break;
   await f.key(handle.ownerDocument,'Down');
  }
  await f.key(handle.ownerDocument,'Enter');await p.settingsWriteQueue;
  await f.until(()=>JSON.stringify(p.settings.pinnedNodes)!==order,'Native keyboard movement');f.check(saves===written+1,'Keyboard move writes once');
  samples.push({case:'trusted keyboard reorder',order:structuredClone(p.settings.pinnedNodes)});
  const historyList=first.view.contentEl.querySelector('.kplex-history-list'),historyStyle=historyList.getAttribute('style'),historyNavigations=navigations;
  try{
   historyList.style.flex='0 0 220px';historyList.style.maxWidth='220px';historyList.scrollLeft=0;await f.wait(80);
   f.check(historyList.scrollWidth>historyList.clientWidth+50,'Native History overflow fixture');const native=await f.focus(historyList.ownerDocument),start=f.point(historyList),end={x:start.x-50,y:start.y};
   try{native.webContents.sendInputEvent({type:'mouseMove',...start});native.webContents.sendInputEvent({type:'mouseDown',...start,button:'left',clickCount:1});native.webContents.sendInputEvent({type:'mouseMove',...end,modifiers:['leftbuttondown']});native.webContents.sendInputEvent({type:'mouseUp',...end,button:'left',clickCount:1});await f.wait(100);}
   finally{native.webContents.sendInputEvent({type:'mouseUp',...end,button:'left',clickCount:1});}
   f.check(historyList.scrollLeft>=40&&navigations===historyNavigations&&!historyList.classList.contains('is-mouse-scrolling'),'Native History grab scroll regressed');samples.push({case:'trusted History grab scroll',scrollLeft:historyList.scrollLeft,navigations:0});
  }finally{if(historyStyle===null)historyList.removeAttribute('style');else historyList.setAttribute('style',historyStyle);}
  const popout=await f.canvas(a,'k-plex-react-view','window');await f.until(()=>rows(popout).length===6,'Popout pin list');
  const popoutOrder=JSON.stringify(p.settings.pinnedNodes),popoutWrites=saves,r=rows(popout)[1].getBoundingClientRect();
  await f.drag(rows(popout)[0].querySelector('[data-reorder-handle]'),{x:Math.round(r.right-2),y:Math.round(r.y+r.height/2)},async(doc,native)=>{native.blur();await f.wait(70);});
  await f.wait(100);f.check(JSON.stringify(p.settings.pinnedNodes)===popoutOrder&&saves===popoutWrites,'Popout blur committed a gesture');
  samples.push({case:'popout adopted icon and blur cancellation',documentIsMain:popout.view.containerEl.ownerDocument===document,saves:0});
  popout.detach();await f.workspace.revealLeaf(first);
  const cancelledOrder=JSON.stringify(p.settings.pinnedNodes),cancelledMoves=moves;
  for(const kind of ['close','migration']){
   const moving=await f.canvas(a);await f.until(()=>rows(moving).length===6,'Cancellation fixture pins');await p.settingsWriteQueue;const end=rows(moving)[1].getBoundingClientRect(),beforeWrites=saves;
   await f.drag(rows(moving)[0].querySelector('[data-reorder-handle]'),{x:Math.round(end.right-2),y:Math.round(end.y+end.height/2)},async()=>{
    if(kind==='close')moving.detach();else{f.workspace.moveLeafToPopout(moving);await f.until(()=>moving.view.contentEl.ownerDocument!==document,'Native migration during pin gesture');await moving.view.waitUntilReady();}
   });
   f.check(JSON.stringify(p.settings.pinnedNodes)===cancelledOrder&&moves===cancelledMoves,'View '+kind+' committed a pin gesture');if(kind==='migration')moving.detach();await f.workspace.revealLeaf(first);
   samples.push({case:'native view '+kind+' cancellation',pinMoves:0,viewLifecycleSettingsWrites:saves-beforeWrites});
  }
  const beforeRollover=JSON.stringify({history:p.settings.navigationHistory,centers:[p.documentSession(first).centerPath,p.documentSession(second).centerPath]}),beforeSaves=saves;
  clock=window.moment('2021-01-01T12:00:00').valueOf();p.refreshPeriodicPins();await f.wait(120);
  const periods=p.readSavedPins().filter(row=>row.period);f.check(periods.find(row=>row.period==='day').path.endsWith('/2021-01-01.md'),'Day rollover');f.check(periods.find(row=>row.period==='week').path.endsWith('/2020-W53.md'),'ISO week-year rollover');f.check(periods.find(row=>row.period==='month').path.endsWith('/2021-01.md'),'Month rollover');
  f.check(saves===beforeSaves&&JSON.stringify({history:p.settings.navigationHistory,centers:[p.documentSession(first).centerPath,p.documentSession(second).centerPath]})===beforeRollover,'Passive rollover wrote or navigated');
  f.check(JSON.stringify(p.index.getSourceAcquisitionCounters())===JSON.stringify(source),'Pin reorder/rollover acquired sources');f.check(p.index.getSemanticPreparationDiagnostics().fullBuilds===semantic.fullBuilds,'Pin reorder/rollover rebuilt semantics');
  samples.push({case:'passive day/month/week-year rollover',periods,sourceReads:0,semanticRebuilds:0,writes:0});
  await p.actionManager.dispatch({id:'pins.open',source:'internal',surfaceId:f.surface(first)});
  await f.until(()=>first.view.containerEl.ownerDocument.querySelector('.prompt'),'Native pins picker');
  // App owns the picker; native search/Enter drives its public selection path without recovering a dialog instance.
  const input=first.view.containerEl.ownerDocument.querySelector('.prompt input');input.focus();await f.owner(input.ownerDocument).webContents.insertText(p.translator('pins.today'));await f.wait(180);
  clock=window.moment('2021-01-04T12:00:00').valueOf();p.refreshPeriodicPins();await f.key(input.ownerDocument,'Enter');
  await f.until(()=>p.documentSession(first).centerPath===f.folder+'/2021-01-04.md','Picker resolves current day on activation');
  samples.push({case:'picker crosses suspended period',current:p.documentSession(first).centerPath,week:p.readSavedPins().find(row=>row.period==='week').path});
  const day=p.settings.pinnedNodes.findIndex(pin=>pin?.kind==='periodic'&&pin.period==='day');
  await p.actionManager.dispatch({id:'pin.open-slot.'+(day+1),source:'internal',surfaceId:f.surface(second)});
  await f.until(()=>p.documentSession(second).centerPath===f.folder+'/2021-01-04.md','Numbered shortcut shares current period resolver');
  clock=window.moment('2021-01-05T12:00:00').valueOf();p.refreshPeriodicPins();const fileCount=app.vault.getFiles().length;
  await p.actionManager.dispatch({id:'pin.open-slot.'+(day+1),source:'internal',surfaceId:f.surface(second)});
  await f.until(()=>[...document.querySelectorAll('.notice')].some(notice=>notice.textContent.includes('2021-01-05')),'Missing periodic note explanation');f.check(app.vault.getFiles().length===fileCount,'Missing pin created a file');
  samples.push({case:'missing explicit activation',createdFiles:0});
  const persisted=JSON.stringify(p.settings.pinnedNodes);p.saveSettings=save;p.notifyNavigation=notify;await p.settingsWriteQueue;p=await f.reload();
  f.check(JSON.stringify(p.settings.pinnedNodes)===persisted,'Reload changed mixed pin order');f.check(JSON.stringify(p.settings.__kplex270Unknown)===JSON.stringify({keep:['case','order']}),'Reload lost unknown setting');
  samples.push({case:'native settings reload',canonicalOrder:true,unknownKeys:true});
  return{samples};
 }finally{await f.cleanup();}
}

/** Validate the actual core settings row and native popovers across all document owners. */
async function preview(app,c){
 const f=c.fixture(app,c),samples=[],core=app.internalPlugins.plugins['page-preview'],enabled=core.enabled;
 const corePath=app.vault.configDir+'/page-preview.json',hadConfig=await app.vault.adapter.exists(corePath),original=hadConfig?await app.vault.adapter.read(corePath):null;
 try{
  await f.initialize();const p=f.p;if(!core.enabled)await core.enable(false);
  const target=await f.note('Preview','## Mixed Heading\nNative preview text.'),source=await f.note('Source','[[Preview]]\n# Group\n[[Preview]]');
  const tab=await f.canvas(source);await f.ready();
  app.setting.open();app.setting.openTabById('page-preview');
  await f.until(()=>app.setting.getCurrentPageEl()?.querySelector('.setting-item-name'),'Native Page Preview settings');
  const page=app.setting.getCurrentPageEl(),names=[...page.querySelectorAll('.setting-item-name')].filter(row=>row.textContent.trim()==='K-Plex');
  f.check(names.length===1,'Duplicate native K-Plex Page Preview row');
  const toggle=names[0].closest('.setting-item').querySelector('.checkbox-container');f.check(toggle,'Native preview preference toggle');
  if(!toggle.classList.contains('is-enabled'))await f.click(toggle);await f.until(()=>toggle.classList.contains('is-enabled'),'Canonical modifier preference');
  samples.push({case:'native Page Preview settings',rows:names.length,canonicalSource:app.workspace.hoverLinkSources['k-plex-react-view'],sidebarSource:app.workspace.hoverLinkSources['k-plex-sidepanel-view']??null});app.setting.close();
  /** An ordinary stationary pointer followed by native Control must show a real core popover. */
  const show=async(leaf,name)=>{const p=f.p;
   await f.workspace.revealLeaf(leaf);const doc=leaf.view.contentEl.ownerDocument,native=await f.focus(doc);
   await p.actionManager.dispatch({id:'view.fit',source:'internal',surfaceId:f.surface(leaf)});
   const currentNode=()=>[...leaf.view.contentEl.querySelectorAll('.kplex-thought[data-kplex-path]')].find(row=>row.dataset.kplexPath===target.path);
   let node;await f.until(()=>{node=currentNode();if(!node)return false;try{f.point(node);return true}catch{return false}},name+' preview target');
   // Reacquire targets during native resize/React replacement. SVG :hover is only a hint:
   // acceptance below requires the actual core popover and its rendered document contents.
   for(let attempt=0;attempt<8&&!currentNode()?.matches(':hover');attempt++){
    node=currentNode();
    native.webContents.sendInputEvent({type:'mouseMove',x:2,y:2});await f.wait(80);native.webContents.sendInputEvent({type:'mouseMove',...f.point(node),modifiers:[]});await f.wait(100);
   }
   const external=!currentNode()?.matches(':hover')&&name==='popout';
   if(external)c.externalPreview={phase:'awaiting native popover',title:native.getTitle(),bounds:native.getBounds(),point:f.point(node)};
   try{native.webContents.sendInputEvent({type:'keyDown',keyCode:'Control',modifiers:['control']});await f.until(()=>p.hoverParent.hoverPopover?.hoverEl.isConnected&&p.hoverParent.hoverPopover.hoverEl.getClientRects().length,name+' stationary modifier popover',external?60000:10000);
    const popover=p.hoverParent.hoverPopover.hoverEl;await f.until(()=>popover.textContent.includes('Native preview text'),name+' native preview content');f.check(popover.ownerDocument===doc,'Preview appeared in the wrong document');samples.push({case:name+' native preview',owningDocument:true,text:true});
    if(external)c.externalPreview=null;
   }finally{native.webContents.sendInputEvent({type:'keyUp',keyCode:'Control',modifiers:[]});native.webContents.sendInputEvent({type:'mouseMove',x:2,y:2});p.hoverParent.hoverPopover?.hide?.();await f.wait(150);}
  };
  await show(tab,'tab');
  const sidebar=await f.canvas(source,'k-plex-sidepanel-view');await show(sidebar,'sidebar');
  const popout=await f.canvas(source,'k-plex-react-view','window');await show(popout,'popout');
  await core.disable(false);await f.workspace.revealLeaf(tab);const doc=tab.view.contentEl.ownerDocument,node=tab.view.contentEl.querySelector('[data-kplex-path="'+target.path+'"]');
  p.triggerHoverPreview(p.index.get(target.path),node,new doc.defaultView.MouseEvent('mouseover',{ctrlKey:true}),source.path);await f.wait(400);
  f.check(!p.hoverParent.hoverPopover?.hoverEl.isConnected,'Disabled Page Preview retained a popover');samples.push({case:'disabled core preview',safe:true});
  await core.enable(false);await show(tab,'re-enabled core');
  const next=await f.reload();f.check(Object.values(app.workspace.hoverLinkSources).filter(row=>row.display==='K-Plex').length===1,'Reload duplicated source');
  const reloaded=await f.canvas(source);await show(reloaded,'reloaded plugin');
  samples.push({case:'native plugin reload',sources:Object.values(app.workspace.hoverLinkSources).filter(row=>row.display==='K-Plex').length,pluginReady:!!next.index});
  return{samples};
 }finally{
  if(app.setting.win)app.setting.close();await core.disable(false);
  if(hadConfig)await app.vault.adapter.write(corePath,original);else if(await app.vault.adapter.exists(corePath))await app.vault.adapter.remove(corePath);
  if(enabled)await core.enable(false);await f.cleanup();
 }
}

/** URI discovery, native Markdown representations, explicit protocol opening and real warm restart. */
async function uri(app,c){
 const f=c.fixture(app,c),samples=[],web=app.internalPlugins.plugins.webviewer,webEnabled=web.enabled;
 const protocol=[],open=window.open;let explicit=null;
 window.open=function(url,...args){if(typeof url==='string'&&/^obsidian:\/\//i.test(url)){protocol.push(url);if(url!==explicit)return null;}return open.call(this,url,...args);};
 f.restores.push(()=>{window.open=open;});
 try{
  await f.initialize();let p=f.p;
  Object.assign(p.settings,{centralNodeMarkdownMode:'preview',sidecarMarkdownMode:'preview',embedCentralNode:true,showInferredNodes:true,showFolderNodes:false,showTagNodes:false});await p.saveSettings(false,false);
  const target=await f.note('Destination + Case','# URI target\n## Mixed Heading\nNative URI target text.');
  const base='obsidian://open?vault='+encodeURIComponent(app.vault.getName())+'&file='+encodeURIComponent(target.path+'#Mixed Heading');
  const labelled=base+'&kplex=LabelledCase',angle=base+'&kplex=AngleCase';
  const foreign='obsidian://open?vault=Other%20Vault&file=Other%2FNever%20Local.md%23Mixed%20Heading';
  const dangerous='obsidian://new?vault='+encodeURIComponent(app.vault.getName())+'&file='+encodeURIComponent(f.folder+'/Never created.md');
  const source=await f.note('Source',[base,'[URI native label]('+labelled+')','<'+angle+'>',foreign,dangerous,'https://example.com'].join('\n\n'));
  let leaf=await f.canvas(source);await f.ready();
  for(const value of [base,labelled,angle,foreign,dangerous])await f.until(()=>p.index.get(value)?.url===value,'Exact native URI discovery');
  await f.until(()=>p.index.search('URI native label',40,'vault').some(page=>page.path===labelled),'Native URI label search');
  for(const value of [base,labelled,angle])f.check(!p.index.get(value).neighbours.has('obsidian://open'),'URI acquired a web-origin parent');
  f.check(!p.index.get(source.path).neighbours.has(target.path),'URI became an internal file relationship');f.check(!p.index.get('Other/Never Local.md'),'Cross-vault URI became a local ghost');
  await f.until(()=>leaf.view.contentEl.querySelectorAll('.kplex-central-editor-content a[href^="obsidian://"]').length>=2,'Central native URI Markdown reading view');
  const central=[...leaf.view.contentEl.querySelectorAll('.kplex-central-editor-content a[href^="obsidian://"]')].map(anchor=>anchor.getAttribute('href'));
  const ordinary=f.workspace.getLeaf('tab');f.leaves.push(ordinary);await ordinary.setViewState({type:'markdown',state:{file:source.path,mode:'preview'},active:true});await f.workspace.revealLeaf(ordinary);
  await f.until(()=>ordinary.view.contentEl.querySelectorAll('a[href^="obsidian://"]').length>=2,'Ordinary native URI Markdown reading view');
  const markdown=[...ordinary.view.contentEl.querySelectorAll('a[href^="obsidian://"]')].map(anchor=>anchor.getAttribute('href'));
  f.check(central.includes(labelled)&&central.includes(angle)&&markdown.includes(labelled)&&markdown.includes(angle),'Native renderers changed URI bytes');
  await f.workspace.revealLeaf(leaf);await p.openSidecar(leaf,p.index.get(source.path));const sidecar=p.validateSidecarLeaf(leaf);f.check(sidecar,'Owned URI source Sidecar');f.leaves.push(sidecar);
  await f.until(()=>sidecar.view.contentEl.querySelectorAll('a[href^="obsidian://"]').length>=2,'Sidecar native URI Markdown reading view');
  await p.setDocumentSyncMode(leaf,'pinned',p.index.get(source.path));p.notifyNavigation(labelled,leaf);
  await f.until(()=>p.documentSession(leaf).centerPath===labelled,'URI graph center');await f.wait(200);
  f.check(sidecar.view.file===source,'Passive URI center replaced the native file Sidecar');
  f.check(!leaf.view.contentEl.querySelector('iframe[src^="obsidian:"],webview[src^="obsidian:"]'),'URI became a web guest');
  const uriNode=leaf.view.contentEl.querySelector('[data-kplex-path="'+labelled+'"]');f.check(uriNode,'Rendered URI node');
  uriNode.dispatchEvent(new uriNode.ownerDocument.defaultView.PointerEvent('pointerover',{bubbles:true,pointerType:'mouse',ctrlKey:true}));await f.wait(200);
  f.check(protocol.length===0,'Passive URI parsing/render/hover executed a protocol');f.check(!app.vault.getFileByPath(f.folder+'/Never created.md'),'Passive URI created a note');
  samples.push({case:'native discovery and representations',bare:true,labelled:true,autolink:true,central,ordinary:markdown,sidecar:true,passiveProtocolCalls:0,webGuests:0});
  f.check(!leaf.view.contentEl.querySelector('.kplex-sidecar-primary').disabled,'An existing native Sidecar must remain closable at a URI center');await p.closeSidecar(leaf);
  await f.until(()=>leaf.view.contentEl.querySelector('.kplex-sidecar-primary')?.disabled,'URI cannot open a web Sidecar',5000);
  for(const id of ['view.sidecar.toggle','view.sidecar.attach-from-center']){const result=await p.actionManager.dispatch({id,source:'internal',surfaceId:f.surface(leaf)});f.check(result.status==='unavailable','URI exposed a web Sidecar action');}
  f.check(!p.validateSidecarLeaf(leaf),'Unavailable URI action created a Sidecar');samples.push({case:'URI Sidecar capability',existingClosable:true,openDisabled:true,actionsUnavailable:true});
  await p.setDocumentSyncMode(leaf,'off');
  for(const enabled of [false,true]){
   if(enabled)await web.enable(false);else await web.disable(false);
   await f.workspace.revealLeaf(leaf);f.workspace.setActiveLeaf(leaf,{focus:true});p.notifyNavigation(labelled,leaf);await f.wait(100);f.check(f.workspace.activeLeaf===leaf,'URI source canvas must own the explicit action');explicit=labelled;
   try{const outcome=await p.actionManager.dispatch({id:'node.open',source:'context-menu',surfaceId:f.surface(leaf),target:{kind:'explicit',node:{identity:labelled,path:labelled,kind:'url'}}});f.check(outcome.status==='completed','Explicit URI node Open unavailable');await f.until(()=>f.workspace.activeLeaf?.view.file===target,'Explicit native URI target');}
   finally{explicit=null;}
   f.check(protocol.at(-1)===labelled,'Explicit URI bytes changed');f.check(!p.canOpenUrlInWebViewer(labelled),'URI exposed Web Viewer capability');
   f.check(f.workspace.getLeavesOfType('webviewer').every(view=>!view.getViewState().state?.url?.startsWith('obsidian:')),'URI entered a Web Viewer leaf');
   samples.push({case:'explicit node Open',webViewerEnabled:enabled,nativeTarget:target.path,exactUri:protocol.at(-1)});
  }
  const before=new Set(f.workspace.getLeavesOfType('webviewer'));await p.openUrlInWebViewer('https://example.com');const webLeaf=f.workspace.getLeavesOfType('webviewer').find(view=>!before.has(view));if(webLeaf)f.leaves.push(webLeaf);f.check(webLeaf,'HTTP Web Viewer leaf was not created');await f.until(()=>{c.webViewer={state:webLeaf.getViewState(),url:webLeaf.view.url,guest:webLeaf.view.containerEl.querySelector('webview')?.getAttribute('src')};const url=c.webViewer.state.state?.url;return URL.canParse(url)&&new URL(url).href===new URL('https://example.com').href;},'HTTP native Web Viewer navigation',10000);samples.push({case:'HTTP native Web Viewer',url:webLeaf.getViewState().state.url});
  await f.workspace.revealLeaf(leaf);p.notifyNavigation(source.path,leaf);await f.ready();
  const index=p.index;f.check(await index.persistIndexedDbSnapshot(index.snapshotPersistGeneration),'Current native snapshot activation');await p.settingsWriteQueue;
  const mtime=source.stat.mtime,size=source.stat.size,calls=protocol.length,started=performance.now();p=await f.reload();
  await f.until(()=>p.index.getUrlIndexProgress().complete&&!p.index.getUrlIndexProgress().active&&!p.index.sourceAcquisition.inventory&&p.index.sourceAcquisition.hasSemanticDependencies(),'Closed warm URI source/URL inventory',120000);
  for(const value of [base,labelled,angle,foreign,dangerous])f.check(p.index.get(value)?.url===value,'Warm restart lost exact URI');
  const counters=p.index.getSourceAcquisitionCounters(),urls=p.index.getUrlIndexProgress(),semantic=p.index.getSemanticPreparationDiagnostics();
  f.check(!counters.vaultReads&&!counters.parses&&!urls.reads&&!semantic.fullBuilds,'Warm URI cache reread or rebuilt unchanged notes');f.check(source.stat.mtime===mtime&&source.stat.size===size,'URI source changed during cache reload');f.check(protocol.length===calls,'Warm hydration executed a URI');
  samples.push({case:'real warm restart without source edits',elapsedMs:performance.now()-started,counters,urls,fullBuilds:semantic.fullBuilds,passiveProtocolCalls:0});return{samples};
 }finally{await web.disable(false);if(webEnabled)await web.enable(false);await f.cleanup();}
}

/** Trusted native text input exercises both Add/Edit shells without any draft persistence. */
async function ontology(app,c){
 const f=c.fixture(app,c),modals=[],samples=[];
 try{
  await f.initialize();const p=f.p,settings=JSON.stringify(p.settings),source=p.index.getSourceAcquisitionCounters();
  /** Each native input receipt must update the literal textarea before the next character. */
  const type=async(input,text)=>{
   const doc=input.ownerDocument,native=await f.focus(doc),times=[];input.focus();let trusted=0;
   const observe=event=>{if(event.isTrusted)trusted++};input.addEventListener('input',observe);
   try{let expected=input.value;for(const character of text){const start=performance.now();await native.webContents.insertText(character);expected+=character;await f.until(()=>input.value===expected,'Native ontology text receipt',5000);times.push(performance.now()-start);}f.check(trusted===text.length,'Native text input was not trusted');return{characters:trusted,maximumDomReceiptMs:Math.max(...times),literalValue:input.value};}
   finally{input.removeEventListener('input',observe);}
  };
  const field=p.defaultOntologyField('child');f.check(field,'Configured ontology endpoint');const edit=p.openAddToOntologyModal(field);modals.push(edit);
  const primary=edit.contentEl.querySelector('textarea[aria-label="'+p.translator('ontology.description')+'"]');f.check(primary,'Edit description textarea');
  primary.value='';primary.dispatchEvent(new primary.ownerDocument.defaultView.InputEvent('input',{bubbles:true}));samples.push({case:'edit description',...await type(primary,'Clear, literal usage wording.')});
  f.check(!edit.saveButton.buttonEl.disabled,'Edit description disabled Save');edit.close();
  p.settingsTab.openOntologyManager('all');const manager=[...p.settingsTab.ontologyManagers].at(-1);f.check(manager,'Native ontology manager');modals.push(manager);
  const add=[...manager.contentEl.querySelectorAll('button')].find(button=>button.getAttribute('aria-label')===p.translator('ontology.manager.add')||button.textContent===p.translator('ontology.manager.add'));f.check(add,'Native Add field control');await f.click(add);
  const created=[...manager.children][0];f.check(created,'Actual Add ontology modal');modals.push(created);
  const name=created.contentEl.querySelector('input[aria-label="'+p.translator('ontology.manager.fieldName')+'"]');await type(name,'Native270');
  const description=created.contentEl.querySelector('textarea[aria-label="'+p.translator('ontology.description')+'"]');samples.push({case:'add description',...await type(description,'Meaning for the new relationship.')});
  const partner=p.defaultOntologyField('parent');if(partner){await type(created.partnerControl.inputEl,partner);created.suggestions?.close();const counterpart=created.partnerDescriptionControl.inputEl;samples.push({case:'partner description',...await type(counterpart,'Meaning for the reciprocal endpoint.')});}
  f.check(!created.saveButton.buttonEl.disabled,'Description draft disabled valid Add');created.close();manager.close();
  f.check(JSON.stringify(p.settings)===settings,'Cancelled ontology wording persisted');f.check(JSON.stringify(p.index.getSourceAcquisitionCounters())===JSON.stringify(source),'Description typing acquired source data');return{samples,settingsWrites:0,sourceReads:0,limitations:'DOM receipt latency is measured; it is not physical-keyboard or pixel-paint evidence.'};
 }finally{for(const modal of modals.reverse())modal?.close();await f.cleanup();}
}

/** Actual declarative controls share initial dependency state and commit through the settings writer. */
async function settings(app,c){
 const f=c.fixture(app,c),samples=[];
 try{
  await f.initialize();const p=f.p;await p.updatePeriodicPin('day',{folder:f.folder,format:'YYYY-MM-DD',useDailyNotes:false},false);
  const before=JSON.stringify(p.settings),source=p.index.getSourceAcquisitionCounters();let saves=0;const save=p.saveSettings;
  p.saveSettings=function(...args){saves++;return save.apply(this,args)};f.restores.push(()=>{p.saveSettings=save;});
  app.setting.open();app.setting.openTabById('k-plex');app.setting.openPagePath('k-plex',[p.translator('settings.ui.plex.behavior'),p.translator('pins.settingsTitle')]);
  await f.until(()=>app.setting.getCurrentPageEl()?.querySelectorAll('.kplex-periodic-pin-settings').length===3,'Three native period editors');
  const editors=[...app.setting.getCurrentPageEl().querySelectorAll('.kplex-periodic-pin-settings')],day=editors[0],inputs=[...day.querySelectorAll('input[type=text]')],toggles=[...day.querySelectorAll('.checkbox-container')];
  const doc=day.ownerDocument;await f.until(()=>doc.fonts.status==='loaded'&&editors.every(/** New native Settings windows acquire plugin styles asynchronously. */ editor=>doc.defaultView.getComputedStyle(editor.closest('.setting-item')).display==='block'),'Native periodic section styles');
  /** Declarative pages restore their own scroll position; input must use freshly visible controls. */
  const activate=async control=>{control.scrollIntoView({block:'center',behavior:'instant'});await f.until(()=>{try{f.point(control);return true}catch{return false}},'Visible periodic setting control',10000);await f.click(control);};
  f.check(JSON.stringify(p.settings)===before&&saves===0,'Rendering periodic settings persisted defaults');f.check(inputs.length===2&&inputs.every(input=>!input.disabled),'Initial custom destination controls');
  f.check(day.querySelector('.kplex-periodic-pin-preview').textContent.includes(f.folder),'Native destination preview');
  if(c.visual){day.scrollIntoView({block:'start',behavior:'instant'});c.visualReady=true;await f.until(()=>c.visualAcknowledged,'Visual settings inspection',60000);}
  const sections=editors.map(/** Measure the actual native outer row, not an isolated HTML imitation. */ editor=>editor.closest('.setting-item'));
  const styles=sections.map(/** Restore only test-owned geometry after each width matrix. */ section=>section.getAttribute('style'));
  const themes=['theme-dark','theme-light'],originalThemes=themes.map(/** Color-mode changes affect only this disposable Settings document. */ theme=>doc.body.classList.contains(theme));
  const native=f.owner(doc),bounds=native.getBounds(),minimum=native.getMinimumSize(),maximized=native.isMaximized();
  await p.updatePeriodicPin('day',{folder:f.folder+'/Long calendar folder/'+('UnbrokenSegment'.repeat(15))});const sizingSaves=saves;
  try{if(maximized)native.unmaximize();native.setMinimumSize(200,200);native.setContentSize(1160,1000);for(const theme of themes)for(const width of [320,480,760]){
   for(const candidate of themes)doc.body.classList.toggle(candidate,candidate===theme);
   for(const section of sections){section.style.width=width+'px';section.style.maxWidth='100%';}
   await f.wait(100);
   for(const [index,section] of sections.entries()){
    const heading=section.querySelector(':scope > .setting-item-info .setting-item-name'),name=heading.getBoundingClientRect(),bounds=section.getBoundingClientRect(),first=editors[index].querySelector('.setting-item').getBoundingClientRect();
    f.check(name.width>=bounds.width*.8&&name.bottom<=first.top+1,'Period heading must have its own full-width row: '+JSON.stringify({index,width,name:name.toJSON(),section:bounds.toJSON(),first:first.toJSON(),classes:section.className}));
    f.check(section.scrollWidth<=section.clientWidth+1,'Periodic settings overflow horizontally');
    for(const input of editors[index].querySelectorAll('input[type=text],select')){const rect=input.getBoundingClientRect();f.check(rect.left>=bounds.left-1&&rect.right<=bounds.right+1,'Periodic field exceeds its settings section');}
   }
   f.check(saves===sizingSaves,'Responsive layout persisted settings');samples.push({case:'native responsive settings layout',theme,requestedWidth:width,actualWidth:sections[0].getBoundingClientRect().width,headingsUnclipped:true,horizontalOverflow:false,longPathWrapped:true});
  }}finally{for(const [index,section] of sections.entries())if(styles[index]===null)section.removeAttribute('style');else section.setAttribute('style',styles[index]);for(const [index,theme] of themes.entries())doc.body.classList.toggle(theme,originalThemes[index]);native.setMinimumSize(...minimum);native.setBounds(bounds);if(maximized)native.maximize();await p.updatePeriodicPin('day',{folder:f.folder});}
  await activate(toggles[1]);await f.until(()=>p.settings.periodicPinSettings.day.useDailyNotes&&inputs.every(input=>input.disabled),'Daily Notes dependency');await p.settingsWriteQueue;
  await activate(toggles[1]);await f.until(()=>!p.settings.periodicPinSettings.day.useDailyNotes&&inputs.every(input=>!input.disabled),'Custom destination restored');await p.settingsWriteQueue;
  f.check(inputs[0].value===f.folder&&inputs[1].value==='YYYY-MM-DD','Daily Notes toggle lost custom settings');
  await activate(toggles[0]);await f.until(()=>p.settings.pinnedNodes.some(pin=>pin?.kind==='periodic'&&pin.period==='day'),'Native opt-in membership');await p.settingsWriteQueue;
  f.check(JSON.stringify(p.index.getSourceAcquisitionCounters())===JSON.stringify(source),'Periodic settings acquired source data');samples.push({case:'native integrated period settings',editors:3,renderWrites:0,dependentControls:true,customConfigurationPreserved:true,optIn:true,sourceReads:0});app.setting.close();return{samples};
 }finally{await f.cleanup();}
}

/** Every invocation captures exact current configuration bytes and delegates ownership to its lane. */
export async function runPinsPreviewUri(){
 const target=validateTarget({vaultName:process.env.KPLEX_TEST_VAULT_NAME,vaultPath:process.env.KPLEX_TEST_VAULT_PATH,configDir:process.env.KPLEX_TEST_CONFIG_DIR});
 const definitions='c.sessions='+nativeDocumentSessions.toString()+';c.fixture='+nativeBatch270.toString()+';c.originalData='+JSON.stringify(readFileSync(join(target.pluginDir,'data.json'),'utf8'))+';c.originalEnabled='+JSON.stringify(readFileSync(join(target.config,'community-plugins.json'),'utf8'))+';c.visual='+(process.env.KPLEX_270_SETTINGS_VISUAL==='true')+';';
 const lane=process.env.KPLEX_270_NATIVE_LANE??'pins',scenario={pins,preview,uri,ontology,settings}[lane];if(!scenario)throw Error('Unknown #270 native lane');
 return runControlledProbe('pins-preview-uri-'+lane+'-270',scenario,definitions,['src/core/plex/savedPins.ts','src/core/plex/periodicPins.ts','src/ui/components/ReorderableList.tsx','src/ui/PinnedNodeBar.tsx','src/ui/AddToOntologyModal.ts','src/index/SourceFacts.ts','src/index/SourceRepository.ts','src/adapters/obsidian/sourceAcquisition.ts','src/main.ts','src/settings.ts','src/ui/App.tsx','src/core/parser/metadata.ts','src/adapters/obsidian/externalUrl.ts'],{maximumMs:420000});
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const userData=process.env.KPLEX_OBSIDIAN_USER_DATA??(process.platform==='win32'?join(process.env.APPDATA,'obsidian'):process.platform==='darwin'?join(homedir(),'Library','Application Support','obsidian'):join(process.env.XDG_CONFIG_HOME??join(homedir(),'.config'),'obsidian'));
 const lock=acquireHostLock({userDataPath:userData});
 try{await runPinsPreviewUri();}finally{lock.release();}
}
