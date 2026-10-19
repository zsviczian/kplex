/**
 * Named #161 acceptance cases for the existing serial Excalidraw native driver. All drawing
 * creation, link following and saves use the installed companion; no index insertion or manual
 * materialization can stand in for external event delivery. The caller owns teardown and receipts.
 */
export async function issue161Scenarios({app,p,ex,host,c,check,wait,until,activate,emit,record,win}) {
 const root=()=>host.view.contentEl;
 const stableWindowMs=400;
 /** Require continuous agreement after actual owner completion, not a transient matching frame. */
 const stable=async(predicate,label)=>{let since=null;await until(()=>{if(!predicate()){since=null;return false;}since??=performance.now();return performance.now()-since>=stableWindowMs;},label);};
 const center=()=>root().querySelector('.kplex-role-center')?.dataset.kplexPath;
 const node=path=>[...root().querySelectorAll('.kplex-thought')].find(element=>element.dataset.kplexPath===path);
 check(win?.getTitle().includes('kplex-test-small'),'Explicit disposable window missing');
 /** Native input verifies the real pointer-up route as well as React compatibility clicks. */
 const click=async element=>{
  check(element?.isConnected,'Native target detached');
  win.restore();win.show();win.focus();win.webContents.focus();
  const rect=element.getBoundingClientRect(),point={x:Math.round(rect.x+rect.width/2),y:Math.round(rect.y+rect.height/2)};
  check(element.contains(element.ownerDocument.elementFromPoint(point.x,point.y)),'Native target obscured');
  for(const type of ['mouseMove','mouseDown','mouseUp']){
   win.webContents.sendInputEvent({type,...point,button:'left',clickCount:1});await wait(45);
  }
 };
 /** Wait for the actual scene commit before asking Excalidraw to serialize its drawing. */
 const edit=async(leaf,add)=>{
  await until(()=>leaf.view.excalidrawAPI&&leaf.view._loaded,'Native drawing not ready');
  const view=leaf.view,ea=new ex.ea.constructor(ex,view);c.wrappers.push(()=>ea.destroy());
  const ids=add(ea);
  check(await ea.addElementsToView(false,false),'Native drawing edit rejected');
  await until(()=>ids.every(id=>view.excalidrawAPI.getSceneElements().some(element=>element.id===id)),'Drawing scene edit not committed');
  await new Promise(resolve=>view.ownerWindow.requestAnimationFrame(()=>view.ownerWindow.requestAnimationFrame(resolve)));
  await view.forceSave(true,true);
  return ids;
 };
 /** Search and select the visible native control rather than inserting a page through the test. */
 const choose=async file=>{
  await activate(host);
  const input=root().querySelector('.kplex-topbar input');check(input,'Vault search input missing');
  input.focus();const owner=input.ownerDocument.defaultView;
  Object.getOwnPropertyDescriptor(owner.HTMLInputElement.prototype,'value').set.call(input,file.basename);
  input.dispatchEvent(new owner.Event('input',{bubbles:true}));
  await until(()=>[...input.ownerDocument.querySelectorAll('.kplex-search-result')].some(element=>element.textContent.includes(file.path)),'External file absent from visible search');
  await click([...input.ownerDocument.querySelectorAll('.kplex-search-result')].find(element=>element.textContent.includes(file.path)));
  await until(()=>center()===file.path,'Selected native search result did not become center');
 };
 /** Describe semantic evidence and rendered roles independently, without exporting drawing payloads. */
 const snapshot=path=>{
  const graph=p.index.getNeighborhood(path);
  const relations=items=>items.map(item=>({path:item.page.path,relationType:item.relationType,typeDefinition:item.typeDefinition,file:item.page.file?.path}));
  return{center:center(),pinned:p.linkedDocumentLeaf?.view.file?.path,
   parents:graph?relations(graph.parents):[],children:graph?relations(graph.children):[],
   rendered:[...root().querySelectorAll('.kplex-thought')].map(element=>({path:element.dataset.kplexPath,role:[...element.classList].find(name=>name.startsWith('kplex-role-'))})),
   edges:[...root().querySelectorAll('.kplex-edge:not(.is-cross-link) .kplex-edge-visible')].map(element=>({dash:element.getAttribute('stroke-dasharray')})),
   work:p.index.sourceAcquisition.getCounters()};
 };
 /** Check roles against explicit source syntax, not merely node colors or their presence. */
 const explicit=(path,role,target,definition)=>{
  const graph=p.index.getNeighborhood(path),item=graph?.[role]?.find(item=>item.page.path===target);
  return item?.relationType===1&&item.typeDefinition?.toLowerCase().split(',').map(value=>value.trim()).includes(definition);
 };
 /** One graph action must synchronize the graph and pinned file without a second click/tab reveal. */
 const navigate=async(path,file=app.vault.getFileByPath(path))=>{
  await activate(host);await click(node(path));
  await stable(()=>center()===path&&(!file||p.linkedDocumentLeaf?.view.file===file)
   &&!p.index.onDemandTasks.has(path)&&!p.index.semanticPreparationTasks.has(path),'One-click graph/pinned-file agreement failed');
  check(center()!=='folder:/','Physical navigation fell back to the folder root');
  if(file)check(p.index.get(path)?.file===file,'Centered endpoint lost its exact native identity');
 };
 Object.assign(p.settings,{embedCentralNode:false,animationSpeed:0,graphLenses:[],showFolderNodes:false,showTagNodes:false,showURLNodes:false,renderSiblings:false,showVirtualNodes:true,documentSyncMode:'off',followActiveFile:false});
 // Solid versus dashed is a declared fixture presentation, independent of the vault's custom rules.
 p.settings.baseLinkStyle={...p.settings.baseLinkStyle,strokeStyle:'solid'};
 p.settings.inferredLinkStyle={...p.settings.inferredLinkStyle,strokeStyle:'dashed'};
 p.settings.hierarchyLinkStyles={};
 p.settings.hierarchy={...p.settings.hierarchy,parents:['Parent'],children:['Child']};await p.saveSettings(false,false);
 check(p.index.isOnDemandMode(),'Run #161 in an actual On-demand session; indexing strategy requires a restart');
 check(p.settings.urlIndexingMode==='background'&&p.settings.indexingThrottle==='responsive','Run #161 with background URLs and Responsive pacing');
 for(const prior of [false,true]){
  const variant=prior?'prior-ghost-navigation':'no-prior-ghost-navigation';
  const suffix=prior?'prior':'direct',name='Starting_Note_'+suffix,childName='Ghost_Child_Note_'+suffix,parentName='Ghost_Parent_Note_'+suffix;
  const start=await ex.createDrawing(name+'.md',c.folder);
  check(start?.path.startsWith(c.folder+'/'),'Starting drawing escaped owned fixture');
  c.note=app.workspace.getLeaf('tab');c.leaves.push(c.note);await c.note.openFile(start,{active:true});await activate(c.note);
  const [rectangle,text]=await edit(c.note,ea=>[ea.addRect(0,0,150,60),ea.addText(0,100,'Child:: [['+childName+']]')]);
  await until(()=>app.metadataCache.getFileCache(start)?.links?.some(link=>link.link===childName),'Saved Child text missing from native metadata');
  p.lastDocumentLeaf=c.note;await p.setDocumentSyncMode('pinned');
  check(p.linkedDocumentLeaf===c.note,'Fixed native document pin not established');
  await choose(start);
  await until(()=>p.index.getNeighborhood(start.path)?.children.some(item=>item.page.name===childName),'Native ghost child missing');
  const ghost=p.index.getNeighborhood(start.path).children.find(item=>item.page.name===childName).page.path;
  await until(()=>explicit(start.path,'children',ghost,'child'),'Stationary drawing Child relation did not become explicit');
  check(node(ghost)?.classList.contains('kplex-role-child'),'Explicit child rendered in wrong area');
  record('issue-161/'+variant+'/before-creation',snapshot(start.path));
  if(prior){await navigate(ghost,null);check(p.linkedDocumentLeaf.view.file===start,'Ghost navigation replaced the pinned real file');await navigate(start.path,start);}
  await activate(c.note);
  // The installed companion supplies its configured new-tab action and actual Create EX modal.
  await c.note.view.linkClick(null,{id:text,text:'Child:: [['+childName+']]'},null,null);
  await until(()=>[...c.note.view.ownerDocument.querySelectorAll('.modal button')].some(button=>button.textContent==='Create EX'),'Actual Create EX dialog missing');
  await click([...c.note.view.ownerDocument.querySelectorAll('.modal button')].find(button=>button.textContent==='Create EX'));
  const childPath=c.folder+'/'+childName+'.md';
  await until(()=>app.vault.getFileByPath(childPath),'External Create EX file missing');
  const child=app.vault.getFileByPath(childPath);
  await until(()=>app.workspace.getLeavesOfType('excalidraw').some(leaf=>leaf.view.file===child&&leaf.view.excalidrawAPI),'External child drawing not mounted');
  const childLeaf=app.workspace.getLeavesOfType('excalidraw').find(leaf=>leaf.view.file===child&&leaf.view.excalidrawAPI);
  if(!c.leaves.includes(childLeaf))c.leaves.push(childLeaf);
  await edit(childLeaf,ea=>[ea.addRect(20,20,120,50)]);
  await activate(host);
  await until(()=>node(child.path)?.classList.contains('kplex-role-child'),'Materialized child not rendered');
  check(center()===start.path&&p.linkedDocumentLeaf===c.note&&c.note.view.file===start,'External new tab changed the genuinely pinned target');
  record('issue-161/'+variant+'/pinned-target-control',snapshot(start.path));
  check(p.index.get(child.path)?.file===child,'Displayed native endpoint is absent from exact lookup');
  check([...root().querySelectorAll('.kplex-thought')].filter(element=>element.dataset.kplexPath===ghost||element.dataset.kplexPath===child.path).length===1,'Old ghost and native child are duplicated');
  await navigate(child.path,child);
  await until(()=>explicit(child.path,'parents',start.path,'child'),'Materialized child lost its explicit originating parent');
  check(node(start.path)?.classList.contains('kplex-role-parent'),'Originating parent rendered in wrong area');
  record('issue-161/'+variant+'/first-click',snapshot(child.path));
  for(let cycle=1;cycle<=4;cycle++){
   await navigate(start.path,start);await until(()=>explicit(start.path,'children',child.path,'child'),'Cycle lost explicit child');
   const startingState=snapshot(start.path);
   check(node(child.path)?.classList.contains('kplex-role-child'),'Cycle rendered child in the wrong area');
   check(startingState.edges.length===1&&startingState.edges.every(edge=>!edge.dash),'Cycle lost solid explicit child styling');
   check(startingState.rendered.filter(item=>item.path===ghost||item.path===child.path).length===1,'Cycle duplicated the materialized child');
   record('issue-161/'+variant+'/cycle-'+cycle+'/starting',startingState);
   await navigate(child.path,child);await until(()=>explicit(child.path,'parents',start.path,'child'),'Cycle lost explicit parent');
   const childState=snapshot(child.path);
   check(node(start.path)?.classList.contains('kplex-role-parent'),'Cycle rendered the originating parent in the wrong area');
   check(childState.edges.length===1&&childState.edges.every(edge=>!edge.dash),'Cycle lost solid explicit parent styling');
   record('issue-161/'+variant+'/cycle-'+cycle+'/child',childState);
  }
  // Re-run the reporter's tab reveal sequence as a control, after first-click success is established.
  await activate(p.linkedDocumentLeaf);await activate(host);
  check(center()===child.path&&p.linkedDocumentLeaf.view.file===child,'Tab-switch control changed the settled native identity');
  record('issue-161/'+variant+'/tab-switch-control',snapshot(child.path));
  await navigate(start.path,start);await activate(c.note);
  await until(()=>c.note.view.file===start&&c.note.view.excalidrawAPI?.getSceneElements().some(element=>element.id===rectangle),'Original starting scene not remounted');
  await edit(c.note,ea=>[ea.addText(0,180,'Parent:: [['+parentName+']]')]);
  await until(()=>app.metadataCache.getFileCache(start)?.links?.some(link=>link.link===parentName),'Saved Parent text missing from native metadata');
  await activate(host);
  await stable(()=>{
   const parent=p.index.getNeighborhood(start.path)?.parents.find(item=>item.page.name===parentName);
   return center()===start.path&&parent&&node(parent.page.path)?.classList.contains('kplex-role-parent')
    &&node(child.path)?.classList.contains('kplex-role-child')&&explicit(start.path,'parents',parent.page.path,'parent')&&explicit(start.path,'children',child.path,'child');
  },'Stationary Parent/Child edit did not converge to explicit roles');
  const state=snapshot(start.path),parent=state.parents.find(item=>item.path.includes(parentName));
  check(node(parent.path)?.classList.contains('kplex-role-parent')&&node(child.path)?.classList.contains('kplex-role-child'),'Updated parent/child displayed in wrong areas');
  check(state.edges.length===2&&state.edges.every(edge=>!edge.dash),'Explicit fixture relations are not both solid');
  record('issue-161/'+variant+'/parent-edit',state);
  // Following disabled must retain the current graph when its owned native document changes.
  await p.setDocumentSyncMode('off');await c.note.openFile(child,{active:true});await activate(c.note);await activate(host);await stable(()=>center()===start.path,'Disabled document follow changed graph center');
  record('issue-161/'+variant+'/disabled-follow',snapshot(start.path));
  emit('issue-161-complete',{variant,cycles:4});
 }
 return{cases:c.cases,events:c.events,folder:c.folder,scope:'Actual Create EX, both ghost-history variants, four cycles each and stationary explicit Parent/Child edit',conditions:{indexingMode:p.index.isOnDemandMode()?'on-demand':'eager',urlIndexingMode:p.settings.urlIndexingMode,indexingThrottle:p.settings.indexingThrottle,stableWindowMs},foreground:{hidden:document.hidden,focused:document.hasFocus()}};
}
