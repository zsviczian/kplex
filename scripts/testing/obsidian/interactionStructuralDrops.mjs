/** Native saved-node icons/tag membership and confirmed physical moves, injected into the shared fixture/lifetime driver. */
export async function acceptStructuralDrops(context) {
  const {app,p,c,check,wait,until,frames,root,native,center,drag}=context;
  c.phase='structural-fixture';
  const i=p.index,base=c.folder+'/Operations',owned=[],folders=[],originalPaths=new Map();
  let activeDialog=null,creationShell=null;
  /** Reuse the native style lane's backdrop dismissal; the native close glyph is outside modalEl on some hosts. */
  const dismiss=async element=>{if(!element?.isConnected)return;const backdrop=element.closest('.modal-container')?.querySelector('.modal-bg');check(backdrop,'Owned native modal backdrop absent');backdrop.click();await until(()=>!element.isConnected,'Owned native modal did not dismiss')};
  /** Cleanup uses captured native incarnations and refuses unknown children; never recursively deletes a foreign path. */
  c.restores.push(async()=>{
    activeDialog?.close();
    await dismiss(creationShell);
    for(const [file,path]of [...originalPaths].reverse())if(file.path!==path&&app.vault.getAbstractFileByPath(file.path)===file&&!app.vault.getAbstractFileByPath(path))await app.fileManager.renameFile(file,path);
    for(const file of owned.reverse())if(app.vault.getFileByPath(file.path)===file)await app.vault.delete(file);
    for(const folder of folders.reverse())if(app.vault.getFolderByPath(folder.path)===folder){check(!folder.children.length,'Unknown children in structural fixture');await app.vault.delete(folder,true)}
  });
  /** Own each new native folder immediately, before another asynchronous fixture operation. */
  const folder=async path=>{const result=await app.vault.createFolder(path);folders.push(result);return result};
  /** Keep physical objects, not stale paths, so native move cleanup follows the accepted file. */
  const file=async(path,body)=>{const result=await app.vault.create(path,body);owned.push(result);return result};
  const operations=await folder(base),a=await folder(base+'/A'),b=await folder(base+'/B');
  const prefix='KplexDrop'+Date.now(),historyTag=prefix+'/History',pinTag=prefix+'/Pinned';
  const note=await file(base+'/Note.md','---\ncustom: keep\ntags: [preserved]\n---\nBody #'+pinTag+'\n'),attachment=await file(base+'/Attachment.txt','owned attachment');
  const nested=await file(a.path+'/Nested.md','owned folder child');
  const seed=await file(base+'/Tag seed.md','---\ntags: ['+historyTag+', '+pinTag+']\n---\nhttps://example.com/kplex-structural\n[['+base+'/Missing]]\n');
  await until(()=>owned.every(file=>app.metadataCache.getFileCache(file)||file.extension!=='md'),'Structural fixture metadata absent');
  c.phase="structural-policy";
  Object.assign(p.settings,{showFolderNodes:true,showTagNodes:true,showFullTagName:false,childMaxHeight:650,childColumns:2,graphDepth:1,renderSiblings:false});
  const ids={history:'tag:'+historyTag,pin:'tag:'+pinTag,folder:'folder:'+b.path,ghost:base+'/Missing',url:'https://example.com/kplex-structural'};
  p.settings.pinnedNodes=[ids.pin,ids.folder,note.path,attachment.path,ids.url,ids.ghost];
  p.settings.navigationHistory=[ids.history,note.path];await p.saveSettings(false);
  for(const path of [note.path,seed.path,'folder:'+base])c.releases.push(i.acquireSemanticDemand(path));
  c.phase="structural-demand";await i.refreshOnDemandGraph([note.path,seed.path,'folder:'+base],false);
  /** Native navigation uses normal publication; it does not call a node action or mutation directly. */
  const navigate=async path=>{app.workspace.setActiveLeaf(c.leaf,{focus:true});p.notifyNavigation(path);await until(()=>root().querySelector('.kplex-role-center')?.dataset.kplexPath===path,'Structural center absent: '+path);await frames()};
  /** Explicit source/cache drain keeps presentation controls separate from legitimate write-driven indexing. */
  const idle=async()=>{await until(()=>{const s=i.sourceAcquisition.getActivityState(),db=i.indexedDb.getActivityState();return !i.building&&!p.rebuildTask&&!i.hasActiveSemanticPreparation()&&!i.hasPendingSemanticPreparation()&&!s.sourceActive&&!s.knownImpactTasks&&!s.repoWrites&&!db.writerActive&&!db.queuedBodies&&i.snapshotPersistTimer===null},'Structural fixture did not drain');await wait(250)};
  c.phase="structural-idle";await navigate(note.path);await idle();
  c.phase="saved-labels";
  const chip=(kind,path)=>[...root().querySelectorAll('[data-kplex-'+kind+'-path]')].find(el=>el.dataset[kind==='pinned'?'kplexPinnedPath':'kplexHistoryPath']===path);
  await until(()=>chip('history',ids.history)&&chip('pinned',ids.pin),'Saved tag chips absent');
  check(chip('history',ids.history).textContent==='#'+historyTag,'History shortened a hierarchical tag');
  check(chip('pinned',ids.pin).textContent==='#'+pinTag,'Pin shortened a hierarchical tag');
  const iconCases=[[ids.pin,'tags'],[ids.folder,'folder'],[note.path,'file-text'],[attachment.path,'paperclip'],[ids.url,'globe'],[ids.ghost,'file-question']];
  for(const [path,icon]of iconCases){const row=chip('pinned',path);const svg=row?.querySelector('svg'),classes=svg?.getAttribute('class')??'';check(svg&&(icon==='folder'?/lucide-folder(?:-|\b)/.test(classes):svg.classList.contains('lucide-'+icon)),'Saved type icon absent: '+icon+' '+JSON.stringify({rendered:!!row,classes,known:!!i.get(path)}));check(row.getAttribute('aria-label')?.includes(path),'Saved row lost its accessible identity')}
  c.cases.push({id:'saved-node-types-and-full-tag-labels',status:'passed',icons:iconCases.map(([,icon])=>icon),showFullTagName:false});
  const work={reads:0,builds:0,acquisitions:0,metadataWrites:0,moves:0},undos=[];
  /** Passive wrappers preserve exact host returns and are retired before fixture cleanup. */
  const observe=(owner,key,counter)=>{const original=owner[key];check(typeof original==='function','Work owner missing: '+key);owner[key]=function(...args){work[counter]++;return original.apply(this,args)};undos.push(()=>{owner[key]=original})};
  for(const [owner,key,counter]of [[app.vault,'read','reads'],[app.vault,'cachedRead','reads'],[i,'rebuild','builds'],[i,'rebuildProgressively','builds'],[i.sourceAcquisition,'acquire','acquisitions'],[app.fileManager,'processFrontMatter','metadataWrites'],[app.fileManager,'renameFile','moves']])observe(owner,key,counter);
  c.restores.push(()=>{for(const undo of undos.reverse())undo()});
  /** Drive a real rendered gate with trusted Electron input, including history/pin targets. */
  const gateDrop=async(source,target)=>{
    const element=[...root().querySelectorAll('.kplex-thought[data-kplex-path]')].find(el=>el.dataset.kplexPath===source);
    check(element,'Move source thought absent: '+source);const gate=element.querySelector('[data-kplex-gate="left"]');check(gate,'Move source gate absent');
    await drag(center(gate),center(target));await frames();
  };
  for(const [kind,identity,tag]of [['history',ids.history,historyTag],['pinned',ids.pin,pinTag]]){
    await gateDrop(note.path,chip(kind,identity));
    await until(()=>app.metadataCache.getFileCache(note)?.frontmatter?.tags?.includes(tag),'Drop did not add YAML tag: '+kind);
    await until(()=>!p.relationshipWriteCancels.size,'Saved tag observer did not converge');
    const fm=app.metadataCache.getFileCache(note).frontmatter;check(fm.custom==='keep'&&fm.tags.includes('preserved'),'Tag drop discarded existing metadata');
    const body=await app.vault.read(note);check(/^tags:\s*\n(?:\s+-.*\n)+/m.test(body),'Tag drop did not persist YAML list');
  }
  c.cases.push({id:'history-and-pin-tag-membership',status:'passed',nativeYamlList:true,existingMetadataPreserved:true,trustedGateInput:true});
  c.phase='structural-unlink';
  const showMenu=p.showKplexMenuAtPosition;
  p.showKplexMenuAtPosition=function(menu,...args){menu.setUseNativeMenu(false);return showMenu.call(this,menu,...args)};
  c.restores.push(async()=>{p.dismissKplexMenu();p.showKplexMenuAtPosition=showMenu;await dismiss(root().ownerDocument.querySelector('.kplex-explanation-modal'))});
  /** Select the rendered membership edge using the layout's fixture coordinate; no handler or writer is invoked directly. */
  const edgeMenu=async path=>{
    p.dismissKplexMenu();await until(()=>[...root().querySelectorAll('.kplex-edge-hit')].some(el=>['parent','child','left','right'].some(role=>el.dataset.kplexEdgeId?.startsWith(role+':'+path+':'))),'Structural edge absent: '+path);
    const edge=[...root().querySelectorAll('.kplex-edge-hit')].find(el=>['parent','child','left','right'].some(role=>el.dataset.kplexEdgeId?.startsWith(role+':'+path+':'))),doc=edge.ownerDocument,w=doc.defaultView,point=center(edge);
    edge.dispatchEvent(new w.MouseEvent('contextmenu',{bubbles:true,cancelable:true,button:2,clientX:point.x,clientY:point.y}));
    await until(()=>doc.querySelector('.menu .menu-item'),'Actual edge context menu absent');return [...doc.querySelectorAll('.menu-item')];
  };
  /** Trusted native activation chooses the existing localized context-menu item. Context opening is synthetic. */
  const chooseUnlink=async path=>{
    const items=await edgeMenu(path);check(!items.some(el=>el.textContent.includes(p.translator('hide.title'))),'Tag edge offers impossible Hidden');
    const item=items.find(el=>el.textContent.includes(p.translator('graph.unlinkConnection')));check(item,'Tag edge lacks Unlink');const point=center(item),doc=item.ownerDocument;check(item.contains(doc.elementFromPoint(point.x,point.y)),'Unlink item is obscured');
    context.input('mouseMove',point);context.input('mouseDown',point);context.input('mouseUp',point);await frames();
  };
  await chooseUnlink(ids.history);await until(()=>!app.metadataCache.getFileCache(note)?.frontmatter?.tags?.includes(historyTag)&&!p.relationshipWriteCancels.size,'YAML-only tag Unlink did not converge');
  await until(()=>!i.evidenceBetween(note.path,ids.history).length,'YAML-only membership remained after normal patch');
  check(!root().ownerDocument.querySelector('.kplex-explanation-modal'),'YAML-only unlink opened unnecessary details');
  await chooseUnlink(ids.pin);await until(()=>root().ownerDocument.querySelector('.kplex-explanation-modal'),'Retained body tag did not open details');
  let details=root().ownerDocument.querySelector('.kplex-explanation-modal');
  await until(()=>details.querySelector('.kplex-edge-source-text')?.textContent.includes('Body #'+pinTag),'Inline tag evidence has no actual note source');
  check(!details.querySelector('[data-kplex-hide-connection],.kplex-edge-ontology-row button'),'Details offers impossible structural mutation');
  check(!app.metadataCache.getFileCache(note)?.frontmatter?.tags?.includes(pinTag),'Mixed tag Unlink retained its YAML tag');await dismiss(details);
  await idle();const bodyBefore=await app.vault.read(note),writesBefore=work.metadataWrites;
  await chooseUnlink(ids.pin);await until(()=>root().ownerDocument.querySelector('.kplex-explanation-modal'),'Inline-only tag did not open details');
  details=root().ownerDocument.querySelector('.kplex-explanation-modal');await until(()=>details.querySelector('.kplex-edge-source-text')?.textContent.includes('Body #'+pinTag),'Inline-only evidence absent');
  check(work.metadataWrites===writesBefore&&await app.vault.read(note)===bodyBefore,'Inline-only Unlink rewrote the note');await dismiss(details);
  const folderMenu=await edgeMenu('folder:'+operations.path);check(folderMenu.length===1&&folderMenu[0].textContent.includes(p.translator('graph.connectionDetails')),'Folder membership exposes Unlink or Hidden');p.dismissKplexMenu();
  c.cases.push({id:'structural-connection-unlink-and-hidden-policy',status:'passed',yamlOnlyRemoved:true,mixedYamlRemovedBodyPreserved:true,inlineOnlyNoWrite:true,actualSourceEvidence:true,folderMenuReadOnly:true,syntheticContextOpen:true,trustedItemSelection:true});
  await idle();
  /** Capture the real confirmation instance solely for cleanup; submission always clicks its native controls. */
  const beforeOpen=p.openStructuralNodeDrop;
  p.openStructuralNodeDrop=function(...args){const result=beforeOpen.apply(this,args);activeDialog=[...(this.structuralDrops?.dialogs??[])].at(-1)??null;return result};
  c.restores.push(()=>{p.openStructuralNodeDrop=beforeOpen;activeDialog?.close()});
  const dialog=()=>root().ownerDocument.querySelector('.modal-container .modal:has(.mod-cta)');
  const cancelWork={...work};await gateDrop(note.path,chip('pinned',ids.folder));await until(()=>dialog(),'Move confirmation absent');
  check(activeDialog?.plan.source===note&&activeDialog.plan.folder===b,'Move confirmation captured wrong endpoints');
  const cancel=[...dialog().querySelectorAll('button')].find(el=>el.textContent===p.translator('common.cancel'));check(cancel,'Native Cancel absent');cancel.click();await frames();
  check(note.path===base+'/Note.md','Cancel moved a note');check(JSON.stringify(work)===JSON.stringify(cancelWork),'Cancel/hover performed host/index work: '+JSON.stringify(work));
  c.cases.push({id:'move-confirmation-cancel',status:'passed',zeroWork:Object.fromEntries(Object.keys(work).map(key=>[key,work[key]-cancelWork[key]]))});
  /** Actual Move confirmation reuses the single CTA; no test invokes FileManager for the operation under test. */
  const confirm=async(source,target,destination)=>{
    await gateDrop(source.children ? "folder:"+source.path : source.path,target);await until(()=>dialog(),'Native move dialog absent');originalPaths.set(source,source.path);
    dialog().querySelector('.mod-cta').click();await until(()=>source.path===destination&&!dialog(),'Native move did not finish');
    check(app.vault.getAbstractFileByPath(destination)===source,'Move lost native incarnation');await idle();
  };
  await confirm(note,chip('pinned',ids.folder),b.path+'/Note.md');
  await navigate(attachment.path);await confirm(attachment,chip('pinned',ids.folder),b.path+'/Attachment.txt');
  await navigate('folder:'+operations.path);await until(()=>[...root().querySelectorAll('.kplex-thought')].some(el=>el.dataset.kplexPath==='folder:'+a.path)&&[...root().querySelectorAll('.kplex-thought')].some(el=>el.dataset.kplexPath==='folder:'+b.path),'Sibling folders absent');
  const target=[...root().querySelectorAll('.kplex-thought')].find(el=>el.dataset.kplexPath==='folder:'+b.path);
  await confirm(a,target,b.path+'/A');check(nested.path===b.path+'/A/Nested.md','Folder move did not preserve contents');
  c.cases.push({id:'confirmed-file-attachment-and-folder-moves',status:'passed',nativeFileManager:true,trustedGateInput:true,folderContentsPreserved:true,work:{...work},noForcedBuild:work.builds===0});
  const viewport=root().querySelector('.kplex-plex'),rect=viewport.getBoundingClientRect(),doc=viewport.ownerDocument;
  let empty=null;
  for(let y=rect.top+35;y<rect.bottom-25&&!empty;y+=25)for(let x=rect.left+25;x<rect.right-25;x+=25){const hit=doc.elementFromPoint(x,y);if(hit&&viewport.contains(hit)&&!hit.closest('[data-kplex-path],button,input,select,.kplex-layout-controls,.kplex-area-frame,.kplex-zone-tools')){empty={x,y};break}}
  check(empty,'No empty folder-child creation target');const gate=root().querySelector('.kplex-role-center [data-kplex-gate="bottom"]');
  await drag(center(gate),empty);await until(()=>doc.querySelector('.kplex-create-folder-note-modal'),'Empty folder-child drag lost its creation gesture');
  creationShell=doc.querySelector('.kplex-create-folder-note-modal');await dismiss(creationShell);await until(()=>!creationShell.isConnected,'Folder-child creation shell did not cancel');
  c.cases.push({id:'folder-child-empty-space-creation-preserved',status:'passed',trustedGateInput:true,cancelledBeforeWrite:true});
  // Restore moved parents before their children, and retire wrappers before cleanup emits ordinary events.
  for(const undo of undos.splice(0).reverse())undo();
}
