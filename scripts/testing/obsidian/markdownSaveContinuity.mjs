/** Focused actual-save observations inside adaptiveFit's exact-build, disposable-vault owner. */
export async function acceptMarkdownSaveContinuity({app,p,leaf,root,files,center,parentKey,childKey,wait,until,check,passed,c}) {
 const source=app.vault, index=p.index, restorers=[];
 const parent=files.get('Late-0'), children=Array.from({length:20},(_,n)=>files.get('Late-'+(n+1)));
 const body='# Continuity fixture\n\n'+parentKey+':: [['+parent.path+']]\n\nUnrelated prose.\n';
 const roles=()=>{
  const nodes=[...root.querySelectorAll('.kplex-thought[data-kplex-path]')];
  return nodes.filter(node=>node.dataset.kplexPath===parent.path).map(node=>({role:[...node.classList].find(name=>name.startsWith('kplex-role-')),y:Math.round(node.getBoundingClientRect().y)}));
 };
 const idle=async()=>{
  await until(()=>!index.building&&!p.rebuildTask&&!index.hasActiveSemanticPreparation()&&!index.hasPendingSemanticPreparation()
   &&!index.sourceAcquisition.getActivityState().sourceActive&&!index.sourceAcquisition.getActivityState().knownImpactTasks
   &&!index.sourceAcquisition.getActivityState().repoWrites&&!index.indexedDb.getActivityState().writerActive
   &&!index.indexedDb.getActivityState().queuedBodies&&index.snapshotPersistTimer===null,'Save fixture did not drain');await wait(300);
 };
 /** Observe real owners without replacing source validation or their results. */
 const wrap=(object,key,observe)=>{
  const original=object[key];check(typeof original==='function','Observation owner missing: '+key);
  object[key]=function(...args){observe.call(this,args);return original.apply(this,args)};
  restorers.push(()=>{object[key]=original});
 };
 try{
  await source.modify(center,body);
  await app.fileManager.processFrontMatter(center,fm=>{fm[childKey]=children.map(file=>'[['+file.path+']]')});
  p.notifyNavigation(center.path);
  await until(()=>index.getNeighborhood(center.path)?.parents.some(item=>item.page.path===parent.path),'Body parent absent');
  await until(()=>root.querySelector('.kplex-role-parent[data-kplex-path="'+parent.path+'"]'),'Rendered body parent absent');
  await idle();
  for(const embedded of [false,true]){
   const modeLabel=p.translator(embedded?'app.useCentralNodeEditor':'app.useNormalCentralNode');
   const button=root.querySelector('button[aria-label="'+modeLabel+'"]');
   if(button)button.click();
   await until(()=>Boolean(root.querySelector('.kplex-central-editor-content'))===embedded,'Center representation absent');await idle();
   if(!embedded){p.settings.sidecarMarkdownMode='source';await p.openSidecar(leaf,index.get(center.path));await idle()}
   const mount=embedded?root.querySelector('.kplex-central-editor-content'):p.sidecarLeaves.get(leaf)?.view.containerEl;
   await until(()=>mount?.querySelector('.cm-content'),'Native Markdown source editor absent');
   const work={neighborhoods:0,reads:0,cachedReads:0,parses:0,acquisitions:0,semantic:0,presentation:0,animations:0},observations=[];
   const before=[...root.querySelectorAll('.kplex-thought[data-kplex-path]')],beforeRoles=roles();
   wrap(index,'getNeighborhood',()=>{work.neighborhoods++});wrap(source,'read',()=>{work.reads++});
   wrap(source,'cachedRead',()=>{work.cachedReads++});
   wrap(index.metadataParser,'parse',()=>{work.parses++});wrap(index.sourceAcquisition,'acquire',()=>{work.acquisitions++});
   const releaseSemantic=index.subscribe(()=>{work.semantic++;observations.push({event:'semantic',roles:roles()})});
   const releasePresentation=index.subscribePresentation(event=>{work.presentation++;observations.push({event:event.kind,roles:roles()})});
   const observer=new MutationObserver(()=>{const next=roles();if(JSON.stringify(next)!==JSON.stringify(observations.at(-1)?.roles))observations.push({event:'dom',roles:next})});
   observer.observe(root,{subtree:true,childList:true,attributes:true,attributeFilter:['class','style']});
   const owner=root.ownerDocument.defaultView;
   wrap(owner.Element.prototype,'animate',function(){if(root.contains(this))work.animations++});
   try{
    for(let n=0;n<3;n++){
     const content=mount.querySelector('.cm-content'),native=require('@electron/remote').getCurrentWindow(),mtime=center.stat.mtime;
     content.focus();const modifiers=[require('process').platform==='darwin'?'meta':'control'];
     for(const type of ['keyDown','keyUp'])native.webContents.sendInputEvent({type,keyCode:'End',modifiers});
     await native.webContents.insertText('\nOrdinary paragraph '+n+'.\n');
     await until(()=>center.stat.mtime!==mtime,'Native autosave did not change the owned file');
     await idle();
    }
    const details={embedded,nativeAutosave:true,mode:p.settings.indexingMode,work,beforeRoles,observations,domRetained:before.every(node=>node.isConnected),finalRoles:roles(),editorFocus:mount.contains(root.ownerDocument.activeElement)};
    c.saveObservations??=[];c.saveObservations.push(details);
    check(details.finalRoles.some(item=>item.role==='kplex-role-parent'),'Body parent did not return');
    // Baseline observation mode preserves failing work/role evidence without pretending acceptance.
    if(!c.observeSavesOnly){
     check(observations.every(item=>item.roles.some(role=>role.role==='kplex-role-parent')),'Body parent disappeared or changed role during prose save');
     check(work.semantic===0,'Prose save bypassed the ordinary semantic no-op path '+work.semantic+' times');
     check(work.animations===0&&details.domRetained,'Prose save changed mounted graph motion/DOM');
     check(details.editorFocus,'Prose save lost native editor focus');
    }
    passed('markdown-save-'+(embedded?'editor':'normal'),details);
   }finally{observer.disconnect();releaseSemantic();releasePresentation();for(const restore of restorers.splice(0).reverse())restore()}
   const saved=await source.read(center),declaration=parentKey+':: [['+parent.path+']]';
   check(saved.includes(declaration),'Expected body declaration changed unexpectedly');
   await source.modify(center,saved.replace(declaration,''));
   await until(()=>!index.getNeighborhood(center.path)?.parents.some(row=>row.page.path===parent.path),'Real body-parent removal did not publish');
   await until(()=>!root.querySelector('.kplex-role-parent[data-kplex-path="'+parent.path+'"]'),'Removed body parent remained rendered');
   await idle();passed('markdown-parent-removal-'+(embedded?'editor':'normal'),{coherentRemoval:true});
   await source.modify(center,saved);
   await until(()=>index.getNeighborhood(center.path)?.parents.some(row=>row.page.path===parent.path),'Restored body parent did not publish');await idle();
  }
 }finally{for(const restore of restorers.reverse())restore()}
}
