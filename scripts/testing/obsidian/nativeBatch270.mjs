/** Shared disposable native acceptance fixture for #270. Serialized into the CLI controller;
 * owns only its notes, native views, temporary method observers and presentation settings.
 * The outer exact-build runner owns deployment, immutable artifacts and the application lock. */
export function nativeBatch270(app,c){
 let plugin=app.plugins.plugins['k-plex'];
 if(!plugin||app.vault.getName()!=='kplex-test-small'||app.vault.getFiles().length>=1000||app.setting.win)throw Error('Clean disposable Small required');
 const workspace=app.workspace,layout=workspace.getLayout(),settings=structuredClone(plugin.settings),saved=c.sessions(plugin).capture(),lastTabId=app.setting.lastTabId;
 const inventory=app.vault.getFiles().map(file=>file.path).sort(),folder='__kplex270_'+Date.now(),files=[],leaves=[],releases=[],restores=[];
 const remote=require('@electron/remote'),main=remote.getCurrentWindow(),bounds=main.getBounds(),minimum=main.getMinimumSize(),maximized=main.isMaximized();
 let directory,disabled=false;
 /** All asynchronous polling has a finite deadline and reports actual index/source progress. */
 const wait=ms=>new Promise(resolve=>window.setTimeout(resolve,ms));
 const check=(value,message)=>{if(!value)throw Error(message);};
 const until=async(predicate,message,maximum=60000)=>{
  const start=Date.now();while(!predicate()){
   c.progress={phase:message,waitedMs:Date.now()-start,status:plugin?.getIndexStatus(),source:plugin?.index?.getSourceAcquisitionCounters(),semantic:plugin?.index?.getSemanticPreparationDiagnostics(),url:plugin?.index?.getUrlIndexProgress(),fixtureMetadata:{ready:files.filter(file=>!!app.metadataCache.getFileCache(file)).length,total:files.length},pinState:c.pinState,lastKey:c.lastKey,activeMenu:!!plugin?.activeKplexMenu,externalPreview:c.externalPreview,webViewer:c.webViewer};
   check(!c.closed&&Date.now()-start<maximum,message);await wait(40);
  }
 };
 /** Native input must use the target document's Electron realm, including a popout. */
 const owner=doc=>{const win=doc.defaultView;check(typeof win?.require==='function','Native document realm missing');return win.require('@electron/remote').getCurrentWindow();};
 const focus=async doc=>{const native=owner(doc);if(native.isFocused()&&doc.hasFocus()&&!doc.hidden)return native;remote.app.show?.();remote.app.focus({steal:true});native.show();native.moveTop();native.focus();native.webContents.focus();await until(()=>native.isFocused()&&doc.hasFocus()&&!doc.hidden,'Native input foreground',5000);return native;};
 /** Deliver trusted pointer input after proving that its current element is visible and hit-testable. */
 const point=element=>{const doc=element.ownerDocument,r=element.getBoundingClientRect(),x=Math.round(r.x+r.width/2),y=Math.round(r.y+r.height/2),hit=doc.elementFromPoint(x,y);check(r.width>0&&r.height>0&&element.contains(hit),'Visible native pointer target: '+JSON.stringify({tag:element.tagName,classes:element.className,rect:r.toJSON(),hit:hit?.className}));return{x,y};};
 const click=async element=>{const doc=element.ownerDocument,native=await focus(doc),xy=point(element);let trusted=false;
  const observe=event=>{if(element.contains(event.target))trusted=event.isTrusted};doc.addEventListener('click',observe,true);
  try{native.webContents.sendInputEvent({type:'mouseMove',...xy});native.webContents.sendInputEvent({type:'mouseDown',...xy,button:'left',clickCount:1});native.webContents.sendInputEvent({type:'mouseUp',...xy,button:'left',clickCount:1});await until(()=>trusted,'Trusted native click',5000);}
  finally{doc.removeEventListener('click',observe,true);}
 };
 /** Enter carries a char stage so native button/menu defaults match a physical keyboard. */
 const key=async(doc,keyCode,modifiers=[],target)=>{const native=await focus(doc);if(target){check(target.isConnected&&target.ownerDocument===doc,'Current key target');target.focus({preventScroll:true});check(doc.activeElement===target,'Native key target focus');}let event;
  const observe=value=>{event=value};doc.defaultView.addEventListener('keydown',observe,true);
  try{native.webContents.sendInputEvent({type:'keyDown',keyCode,modifiers});await until(()=>event,'Trusted native key',5000);check(event.isTrusted,'Untrusted key');if(keyCode==='Enter'&&!event.defaultPrevented)native.webContents.sendInputEvent({type:'char',keyCode:'\r',modifiers});native.webContents.sendInputEvent({type:'keyUp',keyCode,modifiers});await wait(40);}
  finally{c.lastKey=event?{key:event.key,target:event.target?.tagName,className:event.target?.className,prevented:event.defaultPrevented,trusted:event.isTrusted}:null;doc.defaultView.removeEventListener('keydown',observe,true);}
 };
 /** One real pointer transaction; callers may cancel before releasing its owned capture. */
 const drag=async(handle,destination,cancel)=>{const doc=handle.ownerDocument,native=await focus(doc),start=point(handle);let trusted=false;
  const observe=event=>{if(handle.contains(event.target))trusted=event.isTrusted};doc.addEventListener('pointerdown',observe,true);
  try{native.webContents.sendInputEvent({type:'mouseMove',...start});native.webContents.sendInputEvent({type:'mouseDown',...start,button:'left',clickCount:1});await until(()=>trusted,'Trusted pin pointerdown',5000);
   // Electron's held-button state is an InputEvent modifier, not mouseMove.button.
   // https://www.electronjs.org/docs/latest/api/structures/input-event
   for(let step=1;step<=5;step++){native.webContents.sendInputEvent({type:'mouseMove',x:Math.round(start.x+(destination.x-start.x)*step/5),y:Math.round(start.y+(destination.y-start.y)*step/5),modifiers:['leftbuttondown']});await wait(30);}
   check(doc.querySelector('.kplex-pinned-bar.is-reordering'),'Native insertion gesture did not start');
   if(cancel)await cancel(doc,native);
   native.webContents.sendInputEvent({type:'mouseUp',...destination,button:'left',clickCount:1});await wait(100);
  }finally{doc.removeEventListener('pointerdown',observe,true);native.webContents.sendInputEvent({type:'mouseUp',...destination,button:'left',clickCount:1});}
 };
 /** Prepare ordinary native settings and a uniquely owned folder; no production-vault fallback. */
 const initialize=async()=>{main.setMinimumSize(200,200);main.setContentSize(1450,1000);await focus(document);
  await c.sessions(plugin).off();Object.assign(plugin.settings,{embedCentralNode:false,graphDepth:1,showPageNodes:true,showURLNodes:true,renderSiblings:false,animationSpeed:0});await plugin.saveSettings(false,false);
  await until(()=>plugin.initialIndexComplete&&!plugin.index.isBuilding()&&plugin.getIndexStatus().upToDate,'Initial current index',120000);
  await until(()=>!plugin.index.sourceAcquisition.inventory&&plugin.index.sourceAcquisition.hasSemanticDependencies(),'Closed startup source inventory',120000);
  directory=await app.vault.createFolder(folder);
 };
 /** Create exact owned files through ordinary Vault events. Real canvases, not every fixture
  * note or saved pin, own foreground demands when they are actually displayed. */
 const note=async(name,body='')=>{const file=await app.vault.create(folder+'/'+name+'.md',body);files.push(file);await until(()=>!!app.metadataCache.getFileCache(file),'Owned fixture metadata: '+name);plugin.index.insertCreatedFile(file);return file;};
 const ready=async()=>{await until(()=>!plugin.index.hasPendingSemanticPreparation()&&!plugin.index.isBuilding()&&plugin.getIndexStatus().upToDate,'Fixture index convergence');await wait(250);};
 /** Build a real tab/sidebar/popout using native registered view types, never direct React mounting. */
 const canvas=async(file,type='k-plex-react-view',destination='tab')=>{const leaf=workspace.getLeaf(destination);leaves.push(leaf);await leaf.setViewState({type,active:true});await workspace.revealLeaf(leaf);await leaf.view.waitUntilReady();plugin.notifyNavigation(file.path,leaf);await until(()=>leaf.view.contentEl.querySelector('[data-kplex-path="'+file.path+'"]'),'Native canvas center');return leaf;};
 const surface=leaf=>{const id=[...plugin.actionSurfaceHosts].find(([,registration])=>registration.leaf===leaf)?.[0];check(id,'Live action surface');return id;};
 /** Plugin reload invalidates every captured plugin/view callback; callers reacquire explicitly. */
 const reload=async()=>{await plugin.settingsWriteQueue;await app.plugins.disablePlugin('k-plex');disabled=true;await app.plugins.enablePlugin('k-plex');disabled=false;plugin=app.plugins.plugins['k-plex'];check(plugin?.index,'Plugin reload');await until(()=>plugin.initialIndexComplete&&!plugin.index.isBuilding()&&plugin.getIndexStatus().upToDate,'Reloaded current index',120000);return plugin;};
 /** Independently restore every owned resource even if an earlier assertion or native operation fails. */
 const cleanup=async()=>{const errors=[],clean=async(name,action)=>{try{await action();}catch(error){errors.push(name+': '+error);}};
  for(const restore of restores.reverse())await clean('observer',restore);
  for(const release of releases)await clean('demand',release);
  if(disabled)await clean('enable',()=>app.plugins.enablePlugin('k-plex'));plugin=app.plugins.plugins['k-plex'];
  if(app.setting.win)await clean('owned settings',()=>app.setting.close());
  for(const modal of plugin.actionDialogs?.keys()??[])await clean('owned modal',()=>modal.close());
  plugin.dismissKplexMenu();plugin.hoverParent?.hoverPopover?.hide?.();app.setting.lastTabId=lastTabId;
  for(const leaf of leaves)await clean('owned leaf',()=>leaf.detach());
  for(const file of files.reverse())if(app.vault.getFileByPath(file.path)===file)await clean('owned file',()=>app.vault.delete(file,true));
  if(directory&&app.vault.getFolderByPath(folder)===directory&&!directory.children.length)await clean('owned folder',()=>app.vault.delete(directory,true));
  await clean('settings',async()=>{plugin.settings=settings;await plugin.saveSettings(false,false);await plugin.settingsWriteQueue;});
  await clean('layout',()=>workspace.changeLayout(layout));await clean('sessions',()=>c.sessions(plugin).restore(saved));await clean('pending writer',()=>plugin.settingsWriteQueue);
  await wait(2000);await clean('settings bytes',()=>app.vault.adapter.write(plugin.manifest.dir+'/data.json',c.originalData));await clean('enabled bytes',()=>app.vault.adapter.write(app.vault.configDir+'/community-plugins.json',c.originalEnabled));
  await clean('geometry',()=>{main.setMinimumSize(...minimum);main.setBounds(bounds);if(maximized)main.maximize();});
  check(JSON.stringify(app.vault.getFiles().map(file=>file.path).sort())===JSON.stringify(inventory),'Native fixture inventory differs');if(errors.length)throw Error(errors.join('; '));
 };
 return{get p(){return plugin},workspace,folder,files,leaves,restores,check,wait,until,owner,focus,point,click,key,drag,initialize,note,ready,canvas,surface,reload,cleanup};
}
