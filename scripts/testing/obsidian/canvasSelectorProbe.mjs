/** Serialize into the bounded native Settings controller. This helper owns no production registration or persistent state. */
export async function acceptCanvasSelector({app,p,c,host,views,probe,files,hosts,restores,cases,check,wait,until,observe}) {
 const workspace=app.workspace,root=leaf=>leaf.view.contentEl.querySelector('.kplex-app'),session=leaf=>leaf.view.documentSession.plexView;
 const owner=doc=>doc.defaultView.require('@electron/remote').getCurrentWindow();
 const doc=leaf=>leaf.view.containerEl.ownerDocument,panel=leaf=>doc(leaf).querySelector('.kplex-filter-panel');
 const select=leaf=>panel(leaf)?.querySelector('.kplex-view-selector select');
 const reveal=async leaf=>{const native=owner(doc(leaf));native.show();native.focus();native.webContents.focus();await workspace.revealLeaf(leaf);workspace.setActiveLeaf(leaf,{focus:true});await until(()=>doc(leaf).hasFocus()&&native.isFocused(),'Owning canvas window did not receive native focus')};
 const open=async leaf=>{await reveal(leaf);if(!panel(leaf)){root(leaf).querySelector('.kplex-filter-trigger').click();await until(()=>select(leaf),'Owning native selector absent')}};
 const choose=async(leaf,id,expected=id)=>{
  const element=select(leaf);check(element?.isConnected,'Native select not mounted');element.value=id;element.dispatchEvent(new element.ownerDocument.defaultView.Event('change',{bubbles:true}));
  await until(()=>session(leaf).definition.id===expected&&select(leaf)?.value===expected,'Native selector did not reflect actual selection '+id);
 };
 const node=leaf=>root(leaf)?.querySelector('[data-kplex-keyboard-id="layout-root"]');
 const snapshot=leaf=>({state:JSON.stringify(session(leaf).getState()),center:leaf.view.documentSession.centerPath,root:node(leaf)?.dataset.kplexPath,rootElement:node(leaf),rootLeft:node(leaf)?.style.left,camera:root(leaf)?.querySelector('.kplex-camera')?.style.transform,
  selected:root(leaf)?.querySelector('.is-keyboard-selected')?.getAttribute('data-kplex-keyboard-id')??null,sidecar:p.sidecarLeaves.get(leaf),
  sidecarFile:p.sidecarLeaves.get(leaf)?.getViewState()?.state?.file??null});
 const same=(leaf,before)=>{const after=snapshot(leaf);return Object.keys(before).every(key=>before[key]===after[key])};
 const guard=()=>{
  const work={reads:0,parses:0,acquisitions:0,rebuilds:0,settings:0},stops=[observe(app.vault,'read','reads',work),observe(app.vault,'cachedRead','reads',work),observe(p.index.metadataParser,'parse','parses',work),observe(p.index,'acquireSemanticDemand','acquisitions',work),observe(p.index,'rebuild','rebuilds',work),observe(p.index,'rebuildProgressively','rebuilds',work),observe(p,'saveSettings','settings',work)];
  return label=>{for(const stop of stops)stop();check(Object.values(work).every(value=>value===0),'Same-scope selector performed unrelated work: '+JSON.stringify(work));cases.push({id:label,work:{...work}})};
 };

 if(app.setting.isOpen){const window=app.setting.isInPopoutWindow()?app.setting.getPopoutWindow():null;app.setting.close();if(window)await until(()=>window.closed,'Owned Settings window did not close')}
 await open(host);
 const retainedPanel=panel(host),newLens=retainedPanel.querySelector('button[aria-label="'+p.translator('filter.newLens')+'"]');
 newLens.scrollIntoView({block:'nearest'});newLens.click();await until(()=>panel(host).querySelector('.kplex-lens-editor input'),'Native unsaved lens draft absent');
 const name=panel(host).querySelector('.kplex-lens-editor input');
 Object.getOwnPropertyDescriptor(name.ownerDocument.defaultView.HTMLInputElement.prototype,'value').set.call(name,'Unsaved native view-switch draft');
 name.dispatchEvent(new name.ownerDocument.defaultView.Event('input',{bubbles:true}));await wait(50);
 const lenses=JSON.stringify(p.settings.graphLenses),history=JSON.stringify(p.settings.navigationHistory),filter=panel(host).querySelector('.kplex-quick-lens-row input')?.value;
 const stopDraftGuard=guard();
 await choose(host,'test.second');await until(()=>node(host),'Second native view did not render');
 check(panel(host)===retainedPanel&&name.isConnected&&name.value==='Unsaved native view-switch draft','Switch discarded native panel/draft');
 check(JSON.stringify(p.settings.graphLenses)===lenses&&JSON.stringify(p.settings.navigationHistory)===history&&panel(host).querySelector('.kplex-quick-lens-row input')?.value===filter,'View switch changed lenses/history/filter');
 cases.push({id:'native-mounted-panel-and-unsaved-lens-draft-retained'});
 stopDraftGuard('native-same-scope-draft-switch-zero-work');

 // The existing attention editor supplies the real compatibility lease. This is not M0 or off-centre editing.
 panel(host).querySelector('.kplex-lens-editor-actions button').click();await choose(host,probe.id);
 host.view.centerPresentation.update({embedCentralNode:true,centralNodeMarkdownMode:'source'});
 await until(()=>root(host)?.querySelector('.kplex-central-editor-content .cm-content'),'Native compatibility editor absent');
 const editor=root(host).querySelector('.kplex-central-editor-content');await choose(host,'test.blocked',probe.id);
 check(select(host).parentElement.parentElement.querySelector('[role=status]')?.textContent===p.translator('view.editorTransitionBlocked'),'Rejected transition unexplained');
 check(root(host).querySelector('.kplex-central-editor-content')===editor,'Rejected selector transition replaced native editor');
 host.view.centerPresentation.update({embedCentralNode:false});await until(()=>!root(host).querySelector('.kplex-central-editor-content'),'Native editor did not collapse');
 cases.push({id:'native-incompatible-editor-transition-rejected'});

 const popout=workspace.getLeaf('window');hosts.push(popout);await popout.setViewState({type:'k-plex-react-view',active:true});await popout.view.waitUntilReady();
 session(popout).registry=views;popout.view.centerPresentation.update({embedCentralNode:false});await p.setDocumentSyncMode(popout,'off');
 p.notifyNavigation(files.find(file=>file.basename==='Repeated').path,popout);session(popout).select(probe.id);await until(()=>node(popout),'Owned popout view absent');
 await p.openSidecar(popout,p.index.get(files.find(file=>file.basename==='Repeated').path));
 const companion=p.sidecarLeaves.get(popout);check(companion,'Owned native companion absent');hosts.push(companion);
 for(const leaf of [host,popout]){
  const surface=[...p.actionSurfaceHosts].find(([,registration])=>registration.leaf===leaf)?.[0];check(surface,'Owned action surface absent');
  const outcome=await p.actionManager.dispatch({id:'selection.center',source:'internal',surfaceId:surface});check(outcome.status==='completed','Owned selection action failed');
  await until(()=>root(leaf).querySelector('.is-keyboard-selected'),'Meaningful other-canvas selection absent');
 }
 await open(popout);await open(host);check(doc(host)!==doc(popout),'Actual native popout required');
 await until(()=>!p.index.hasPendingSemanticPreparation()&&!p.index.hasActiveSemanticPreparation(),'Popout scope did not settle');await p.settingsWriteQueue;
 const stopPairGuard=guard();
 const popBefore=snapshot(popout),mainPanel=panel(host),popPanel=panel(popout);
 await reveal(popout);await choose(host,'test.second');await until(()=>node(host),'Main second view absent');check(same(popout,popBefore),'Focused popout changed with main selection');
 const mainBefore=snapshot(host);await reveal(host);await choose(popout,'test.second');check(same(host,mainBefore),'Focused main changed with popout selection');
 await choose(popout,probe.id);check(panel(host)===mainPanel&&panel(popout)===popPanel,'Cross-window switching remounted panels');
 check(p.sidecarLeaves.get(popout)===companion,'View switching released the owned Sidecar association');
 check(select(host).value==='test.second'&&select(popout).value===probe.id,'Dropdowns lost independent owners');
 cases.push({id:'native-main-popout-independent-selection-focus-and-camera'});

 // Native select owns keyboard behavior; graph shortcuts must not intercept these trusted events.
 await reveal(host);await choose(host,'classic');const element=select(host),native=owner(doc(host)),keys=[],changes=[];
 element.scrollIntoView({block:'nearest'});element.focus();await until(()=>doc(host).hasFocus()&&doc(host).activeElement===element&&native.isFocused(),'Native select did not receive keyboard focus');const keyDocument=doc(host),observeKey=event=>keys.push({key:event.key,trusted:event.isTrusted,targetSelect:event.target===element,target: event.target?.tagName});keyDocument.addEventListener('keydown',observeKey,true);
 const observeChange=event=>changes.push({trusted:event.isTrusted,value:element.value});element.addEventListener('change',observeChange,true);
 const expected=c.osSelectKeys?probe.id:'test.blocked';
 cases.push({id:'native-select-key-delivery',transport:c.osSelectKeys?'OS_CUA':'Electron',keys,changes});
 try{
  if(c.osSelectKeys)c.progress={phase:'await-native-select-os-keys',cases,expected,ownerWindow:native.id,documentFocused:doc(host).hasFocus()};
  else for(const type of ['keyDown','keyUp'])native.webContents.sendInputEvent({type,keyCode:'End'});
  await until(()=>session(host).definition.id===expected,'Trusted select keyboard did not change the owning view',c.osSelectKeys?60000:20000);
 }finally{keyDocument.removeEventListener('keydown',observeKey,true);element.removeEventListener('change',observeChange,true)}
 check(keys.some(event=>event.trusted&&event.targetSelect),'Trusted owning-document select key absent');
 check(changes.some(event=>event.trusted&&event.value===expected),'Trusted native select change absent');
 c.progress={phase:'native-select-keys-delivered',cases};
 check(session(popout).definition.id===probe.id,'Native keyboard changed another canvas');cases.push({id:'native-owning-document-select-keyboard',keys});
 stopPairGuard('native-main-popout-switch-keyboard-zero-work');

 await p.closeSidecar(popout);await until(()=>!p.sidecarLeaves.get(popout),'Owned companion did not close');

 // Recreate only the two owned native views through their real serialized setState path.
 // This is a view reload, not a whole application restart or a fix for #215's extra-tab inventory.
 await choose(host,'test.second');const ids=new Set([host.id,popout.id]),prototype=Object.getPrototypeOf(host.view),original=prototype.setState;
 prototype.setState=function(...args){if(ids.has(this.leaf.id))this.documentSession.plexView.registry=views;return original.apply(this,args)};
 restores.push(()=>{prototype.setState=original});
 const saved=[host,popout].map(leaf=>({leaf,state:structuredClone(leaf.getViewState()),expected:session(leaf).definition.id,center:leaf.view.documentSession.centerPath}));
 for(const item of saved){await item.leaf.setViewState({type:'empty'});await item.leaf.setViewState(item.state);await item.leaf.view.waitUntilReady();await until(()=>session(item.leaf).definition.id===item.expected&&node(item.leaf),'Owned native view restoration failed');check(item.leaf.view.documentSession.centerPath===item.center,'Restoration retargeted native attention');await open(item.leaf);check(select(item.leaf).value===item.expected,'Restored dropdown does not match its canvas')}
 check(select(host).value==='test.second'&&select(popout).value===probe.id,'Independent restored choices were lost');
 cases.push({id:'native-owned-view-reload-independent-workspace-selection',applicationRestart:false,expected:saved.map(item=>item.expected)});
 c.progress={...c.progress,phase:'native-selector-complete',cases};
}
