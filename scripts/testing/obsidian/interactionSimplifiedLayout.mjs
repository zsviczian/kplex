/**
 * Opt-in native layout acceptance, hosted by interactionUpdates' exact-build disposable fixture.
 * Actual declarative Settings own all six arrangement changes. Existing profiles, native leaves,
 * method observers and open dialogs are restored through that controller's independent cleanup.
 * Renderer serialization requires this exported function to retain no module-scope dependencies.
 */
export async function acceptSimplifiedLayout({app,p,c,check,wait,until,frames,root,native,navigate,areaMode,captureAreas,emptyPoint,work}) {
 const originalProfiles=structuredClone(p.settings.layoutProfiles),owned=[],observers=[],observedApis=[],counts={vaultReads:0,sourceAcquisitions:0,bodyParses:0,snapshotWrites:0};
 const initialDevice=p.getTypographyDevice();
 check(initialDevice==='desktop','Desktop native layout acceptance requires an actual desktop host');
 let cleaned=false,guarded=false;
 /** Restore each exact observed method once, even after native assertion/cancellation failures. */
 const stopObservers=()=>{for(const restore of observers.reverse())restore();observers.length=0};
 /** Local restoration also runs from the parent controller when the module is interrupted. */
 const cleanup=async()=>{
  if(cleaned)return;cleaned=true;stopObservers();if(app.setting.isOpen)app.setting.close();
  for(const leaf of owned.reverse())if(leaf.view.containerEl.isConnected)leaf.detach();
  p.settings.layoutProfiles=originalProfiles;await p.saveSettings(false);await p.settingsWriteQueue;
  await navigate('Center');native(c.leaf);await frames();
 };
 c.restores.push(cleanup);
 /** Count real calls without substituting their return values or changing acquisition policy. */
 const observe=(object,key,category)=>{
  check(object&&typeof object[key]==='function','Native layout observation owner absent: '+key);
  const original=object[key];object[key]=function(...args){counts[category]++;return original.apply(this,args)};
  observedApis.push(category+'/'+key);
  let stopped=false;observers.push(()=>{if(!stopped){stopped=true;object[key]=original}});
 };
 /** Open the real Settings hierarchy rather than invoking its scalar writer directly. */
 const openPage=async()=>{
  if(app.setting.isOpen){app.setting.close();await wait(80)}
  app.workspace.setActiveLeaf(c.leaf,{focus:true});native(c.leaf);p.openSettings();
  await until(()=>p.settingsTab.containerEl.isConnected,'Native Settings root absent');
  check(p.settingsTab.openSettingsPage(p.translator('settings.ui.plex.behavior')),'Plex behavior Settings entry absent');
  await until(()=>[...p.settingsTab.containerEl.ownerDocument.querySelectorAll('.setting-item-name')]
   .some(el=>el.getClientRects().length&&el.textContent===p.translator('layout.simplifiedTitle')),'Simplified layout entry absent');
  check(p.settingsTab.openSettingsPage(p.translator('layout.simplifiedTitle')),'Simplified layout Settings navigation failed');
 };
 /** Save one actual native toggle and prove that no other device/surface profile changed. */
 const toggle=async(device,surface,enabled)=>{
  const key=device+':'+surface,before=structuredClone(p.settings.layoutProfiles);
  const label=p.translator('layout.arrangementScope',{device:p.translator('typography.'+device),surface:p.translator(surface==='leaf'?'layout.mainTab':'layout.sidepanel')});
  const doc=p.settingsTab.containerEl.ownerDocument;
  await until(()=>[...doc.querySelectorAll('.setting-item-name')].some(el=>el.getClientRects().length&&el.textContent===label),'Scoped arrangement row absent: '+key);
  const row=[...doc.querySelectorAll('.setting-item-name')].find(el=>el.getClientRects().length&&el.textContent===label).closest('.setting-item');
  const control=row.querySelector('.checkbox-container');check(control,'Native arrangement toggle absent: '+key);
  if((p.settings.layoutProfiles[key]?.lateralArrangement==='left')!==enabled)control.click();
  await until(()=>(p.settings.layoutProfiles[key]?.lateralArrangement==='left')===enabled,'Arrangement toggle did not apply: '+key);
  await p.settingsWriteQueue;const persisted=await p.loadData();
  check((persisted.layoutProfiles[key]?.lateralArrangement==='left')===enabled,'Arrangement toggle not durable: '+key);
  for(const other of Object.keys(before))if(other!==key)check(JSON.stringify(before[other])===JSON.stringify(p.settings.layoutProfiles[other]),'Scoped arrangement changed '+other+' through '+key);
 };
 /** Read only displayed occurrence bounds; no layout algorithm is copied into this oracle. */
 const rects=leaf=>{
  const el=leaf.view.contentEl,read=selector=>{const node=el.querySelector(selector);check(node,'Native layout occurrence absent: '+selector);return node.getBoundingClientRect()};
  const center=read('.kplex-role-center'),friend=read('.kplex-role-left'),challenger=read('.kplex-role-right'),sibling=read('.kplex-role-sibling');
  return{center:(center.left+center.right)/2,friend:(friend.left+friend.right)/2,challenger:(challenger.left+challenger.right)/2,sibling:(sibling.left+sibling.right)/2};
 };
 /** Keep screen-space comparisons independent from the existing camera's world-space scale. */
 const fit=async leaf=>{const button=leaf.view.contentEl.querySelector('button[aria-label="'+p.translator('graph.fitGraph')+'"]');check(button,'Native fit action absent');button.click();await wait(180);await frames()};
 try{
  const originalTabs=new Set(app.workspace.getLeavesOfType('k-plex-react-view'));
  const plus=c.leaf.view.contentEl.querySelector('button[aria-label="'+p.translator('actions.surface.new-tab')+'"]');
  check(plus?.querySelector('.lucide-plus'),'New Plex toolbar action absent');
  const plusBounds=plus.getBoundingClientRect(),point={x:Math.round(plusBounds.left+plusBounds.width/2),y:Math.round(plusBounds.top+plusBounds.height/2)};
  let trustedPlus=false;const observePlus=event=>{trustedPlus=event.isTrusted};plus.addEventListener('click',observePlus,{once:true});
  try{for(const type of ['mouseDown','mouseUp'])native(c.leaf).webContents.sendInputEvent({type,...point,button:'left',clickCount:1});
   await until(()=>app.workspace.getLeavesOfType('k-plex-react-view').some(leaf=>!originalTabs.has(leaf)),'Toolbar did not create an additional Plex tab');
  }finally{plus.removeEventListener('click',observePlus)}
  check(trustedPlus,'Toolbar new-tab input was not trusted');
  const extra=app.workspace.getLeavesOfType('k-plex-react-view').find(leaf=>!originalTabs.has(leaf));owned.push(extra);c.leaves.push(extra);await extra.view.waitUntilReady();
  const afterToolbar=new Set(app.workspace.getLeavesOfType('k-plex-react-view'));
  check(app.commands.executeCommandById('k-plex:kplex-new-tab'),'Published new Plex tab command absent');
  await until(()=>app.workspace.getLeavesOfType('k-plex-react-view').some(leaf=>!afterToolbar.has(leaf)),'Command reused an existing Plex tab');
  const commandTab=app.workspace.getLeavesOfType('k-plex-react-view').find(leaf=>!afterToolbar.has(leaf));owned.push(commandTab);c.leaves.push(commandTab);await commandTab.view.waitUntilReady();
  check([...originalTabs].every(leaf=>leaf.view.containerEl.isConnected),'Opening another Plex replaced an existing tab');
  extra.detach();commandTab.detach();await navigate('Center');native(c.leaf);await frames();
  check(!c.leaf.view.contentEl.querySelector('button .lucide-spline'),'Curved connectors still occupy the toolbar');
  c.cases.push({id:'new-plex-tabs',status:'passed',trustedToolbar:true,publishedCommand:true,independentTabs:true,curvedToolbarRemoved:true});
  const side=app.workspace.getRightLeaf(true);check(side,'Native sidebar leaf unavailable');owned.push(side);c.leaves.push(side);
  await side.setViewState({type:'k-plex-sidepanel-view',active:true});await app.workspace.revealLeaf(side);await side.view.waitUntilReady();await navigate('Center',side);
  const popout=app.workspace.getLeaf('window');owned.push(popout);c.leaves.push(popout);
  await popout.setViewState({type:'k-plex-react-view',active:true});await popout.view.waitUntilReady();await navigate('Center',popout);
  await navigate('Center');native(c.leaf);
  await until(()=>{
   const source=p.index.sourceAcquisition.getActivityState(),cache=p.index.indexedDb.getActivityState(),active=p.index.getWorkPriorityDiagnostics().active;
   return !p.index.building&&!p.rebuildTask&&!p.index.hasActiveSemanticPreparation()&&!p.index.hasPendingSemanticPreparation()
    &&!source.sourceActive&&!source.knownImpactTasks&&!source.repoWrites&&!cache.queuedBodies&&!cache.writerActive
    &&p.index.snapshotPersistTimer===null&&Object.values(active).every(value=>value===0);
  },'Native layout views did not reach genuine source/storage idle');await wait(300);
  const semanticRevision=p.index.getSemanticRevision(),sourceBefore=p.index.getSourceAcquisitionCounters(),workBefore={...work};
  for(const method of ['read','cachedRead','readBinary'])observe(app.vault,method,'vaultReads');
  observe(p.index.sourceAcquisition,'acquire','sourceAcquisitions');
  observe(p.index.indexedDb,'writeSnapshot','snapshotWrites');
  if(p.index.metadataParser&&typeof p.index.metadataParser.parse==='function')observe(p.index.metadataParser,'parse','bodyParses');
  guarded=true;
  await openPage();
  const rows=[];
  for(const device of ['desktop','tablet','mobile'])for(const surface of ['leaf','sidepanel']){await toggle(device,surface,false);rows.push(device+':'+surface)}
  for(const device of ['desktop','tablet','mobile'])for(const surface of ['leaf','sidepanel'])await toggle(device,surface,true);
  c.cases.push({id:'layout-six-native-settings',status:'passed',rows,durable:true,independentProfiles:true,actualDevice:initialDevice,mobileEmulation:false});
  await toggle('desktop','sidepanel',false);app.setting.close();await wait(100);await frames();
  check(p.getViewSettings('leaf').lateralArrangement==='left'&&p.getViewSettings('popout').lateralArrangement==='left','Main-tab arrangement did not own native pop-out');
  check(p.getViewSettings('sidepanel').lateralArrangement==='split','Sidebar arrangement did not remain independent');
  await fit(c.leaf);await fit(side);await fit(popout);
  await until(()=>{const value=rects(popout);return value.friend<value.center&&value.challenger<value.center},'Pop-out left placement did not settle');
  const mainRects=rects(c.leaf),sideRects=rects(side),popoutRects=rects(popout);
  for(const [name,value]of [['main',mainRects],['popout',popoutRects]])check(value.friend<value.center&&value.challenger<value.center&&value.sibling>value.center,'Shared-left rendered placement failed: '+name);
  check(sideRects.friend<sideRects.center&&sideRects.challenger>sideRects.center,'Native sidepanel ignored its split preference');
  const popoutDensity=p.getViewSettings('popout').compactingFactor;
  await openPage();await toggle('desktop','leaf',false);app.setting.close();await frames();
  await fit(popout);await until(()=>rects(popout).challenger>rects(popout).center,'Pop-out retained stale left placement after main-tab toggle');
  check(p.getViewSettings('popout').compactingFactor===popoutDensity,'Arrangement switch changed independent pop-out density');
  c.cases.push({id:'layout-native-surfaces',status:'passed',main:mainRects,sidepanel:sideRects,popout:popoutRects,popoutFollowsMain:true,independentDensity:true});
  await navigate('Center');native(c.leaf);await p.updateLayoutProfile('leaf',{horizontalCompactingFactor:4});await fit(c.leaf);
  // The existing fixture has siblings, but captureAreas historically returns four directions.
  // Expose all five through the same native action for this independent seam oracle.
  await areaMode();
  const challengerArea=root().querySelector('.kplex-area-frame.kplex-area-right')?.getBoundingClientRect();check(challengerArea,'Challenger area absent');
  const siblingArea=root().querySelector('.kplex-area-frame.kplex-area-sibling')?.getBoundingClientRect();check(siblingArea,'Sibling area absent');
  check(siblingArea.left>=challengerArea.right-1,'Dense Challenger/Sibling areas overlap');await areaMode();
  await openPage();await toggle('desktop','leaf',true);app.setting.close();await fit(c.leaf);
  const leftAreas=await captureAreas();check(Math.abs(leftAreas.left.left-leftAreas.right.left)<1,'Left groups use different physical columns');
  check(leftAreas.left.bottom<leftAreas.right.top,'Shared-left semantic areas overlap');
  check(leftAreas.right.right<=leftAreas.parent.left+1,'Shared-left area overlaps parent bounds');
  c.layoutWork={semanticBefore:semanticRevision,semanticAfter:p.index.getSemanticRevision(),sourceBefore,sourceAfter:p.index.getSourceAcquisitionCounters(),counts,workBefore,workAfter:{...work}};
  check(p.index.getSemanticRevision()===semanticRevision,'Arrangement changed semantic graph revision');
  check(Object.values(counts).every(value=>value===0),'Layout changes acquired or parsed source data: '+JSON.stringify(counts));
  const workDelta=Object.fromEntries(Object.keys(work).map(key=>[key,work[key]-workBefore[key]]));
  check(Object.values(workDelta).every(value=>value===0),'Layout changes started index work: '+JSON.stringify(workDelta));
  const sourceAfter=p.index.getSourceAcquisitionCounters();check(JSON.stringify(sourceAfter)===JSON.stringify(sourceBefore),'Layout settings changed source-acquisition counters');
  check(!p.index.building&&!p.rebuildTask&&!p.index.hasActiveSemanticPreparation()&&!p.index.hasPendingSemanticPreparation()
   &&p.index.snapshotPersistTimer===null,'Layout changes deferred index work beyond the guarded interval');
  c.cases.push({id:'layout-geometry-and-index-work',status:'passed',denseIndependentSeam:true,stackedLeftGroups:true,semanticRevisionUnchanged:true,counts,observedApis,work:workDelta,viewSetupWork:workBefore,sourceCountersUnchanged:true});
  stopObservers();guarded=false;
  // Preview-only same-view drags prove the physical left position does not collapse semantic roles.
  const node=root().querySelector('.kplex-role-sibling'),doc=root().ownerDocument;check(node,'Sibling drag source absent');
  for(const role of ['left','right']){
   const point=emptyPoint(leftAreas[role]),transfer=new doc.defaultView.DataTransfer();
   try{
    node.dispatchEvent(new doc.defaultView.DragEvent('dragstart',{bubbles:true,cancelable:true,dataTransfer:transfer}));
    check(app.dragManager.draggable?.type==='link','Native layout drag did not expose a link payload');
    const destination=doc.elementFromPoint(point.x,point.y);check(destination,'Native left drop point unavailable');
    destination.dispatchEvent(new doc.defaultView.DragEvent('dragover',{bubbles:true,cancelable:true,dataTransfer:transfer,clientX:point.x,clientY:point.y}));
    await until(()=>root().querySelector('.is-relationship-drop-area.kplex-area-'+role),'Left arrangement lost semantic '+role+' drop role');
   }finally{node.dispatchEvent(new doc.defaultView.DragEvent('dragend',{bubbles:true,dataTransfer:transfer}));await frames()}
  }
  c.cases.push({id:'layout-left-semantic-drop-previews',status:'passed',roles:['left','right'],relationshipCommitted:false,syntheticNativeDragEvents:true});
 }catch(error){
  c.cases.push({id:'layout-failure',status:'failed',error:String(error.stack||error)});throw error;
 }finally{
  if(guarded)stopObservers();await cleanup();
 }
}
