/** Await a real Obsidian Files deletion with finite event receipts for only the owned fixture. */
export async function nativeDeleteImportedFolder(app, c, f, leaf, folder, referrer, affected, phase) {
  const p = f.p, index = p.index, source = index.sourceAcquisition, path = folder.path, parent = folder.parent;
  const explorer = app.workspace.getLeavesOfType('file-explorer')[0]?.view;
  f.check(parent && path.startsWith(f.folder + '/') && app.vault.getFolderByPath(path) === folder && explorer, 'Exact owned folder and native Files explorer required');
  const livePaths = new Set(affected.map(file => file.path));
  const original = referrer ? await app.vault.read(referrer) : null;
  /** Capture the independent inventory and graph build owners from the real diagnostic counters. */
  const work = () => ({
    inventory: p.startupDiagnostics.snapshot().sessionWork.sourceInventoryPasses,
    builds: index.getSemanticPreparationDiagnostics().fullBuilds,
    source: index.getSourceAcquisitionCounters(),
    recovery: source.getRecoveryDiagnostics(),
    snapshot: index.getSnapshotPersistenceDiagnostics(),
  });
  p.notifyNavigation('folder:' + path, leaf);
  const center = () => leaf.view.contentEl.querySelector('.kplex-role-center')?.getAttribute('data-kplex-path');
  await f.until(() => center() === 'folder:' + path, 'Actual imported folder center');
  app.workspace.leftSplit?.expand();
  await app.workspace.revealLeaf(explorer.leaf);
  await explorer.revealInFolder(folder);
  /** Resolve the owned explorer row from actual native markup. */
  const explorerRow = () => [...explorer.containerEl.querySelectorAll('[data-path]')].find(row => row.getAttribute('data-path') === path);
  await f.until(explorerRow, 'Actual imported root in Files');
  const row = explorerRow(), entry = row.closest('.nav-folder-title') ?? row.querySelector('.nav-folder-title') ?? row;
  const doc = entry.ownerDocument, native = await f.focus(doc), point = f.point(entry);
  const events = [], refs = [];
  const before = work(), at = Date.now();
  c.progress = c.pinState = {phase, before, events};
  /** Never retain other vault paths when a global host event arrives. */
  const observe = (name, file, previous) => {
    if (events.length >= 96 || file && file !== referrer && file.path !== path && !file.path.startsWith(path + '/') && !livePaths.has(previous)) return;
    const live = file && app.vault.getAbstractFileByPath(file.path);
    events.push({event:name, atMs:Date.now() - at, relative:file === referrer ? 'referrer' : file?.path === path ? '' : file?.path.slice(path.length+1),
      previous:typeof previous==='string' && previous.startsWith(path+'/') ? previous.slice(path.length+1) : undefined,
      exact:file ? live===file : undefined, occupied:file ? !!live : undefined, descendants:[...livePaths].filter(item=>app.vault.getAbstractFileByPath(item)).length,
      maintenance:source.getMaintenanceRevision(), inventory:!!source.inventory});
  };
  for (const [owner,name] of [[app.vault,'create'],[app.vault,'rename'],[app.vault,'delete'],[app.metadataCache,'resolve'],[app.metadataCache,'resolved']]) {
    refs.push([owner,owner.on(name,(file,previous)=>observe(name,file,previous))]);
  }
  let menu;
  refs.push([app.workspace,app.workspace.on('file-menu',(value,file)=>{if(file===folder){menu=value;value.setUseNativeMenu(false);}})]);
  let dialog;
  try {
    native.webContents.sendInputEvent({type:'mouseMove',...point});
    native.webContents.sendInputEvent({type:'mouseDown',...point,button:'right',clickCount:1});
    native.webContents.sendInputEvent({type:'mouseUp',...point,button:'right',clickCount:1});
    await f.until(()=>menu && doc.querySelector('.menu'), 'Actual owned Files context menu');
    /** Obsidian 1.15/1.16 labels vary by trash policy, but share the same native delete glyph. */
    const remove=[...doc.querySelectorAll('.menu .menu-item')].find(item=>item.querySelector('svg.lucide-trash,svg.lucide-trash-2') || /^(Delete|Move to (trash|system trash))\b/i.test(item.textContent.trim()));
    f.check(remove,'Actual Files delete action');
    const prior = new Set(doc.querySelectorAll('.modal'));
    await f.click(remove);
    await f.until(()=>!app.vault.getFolderByPath(path)||(dialog=[...doc.querySelectorAll('.modal')].find(item=>!prior.has(item))), 'Native folder delete or confirmation');
    if (dialog) {
      const confirm=dialog.querySelector('button.mod-warning,button.mod-cta');
      f.check(confirm,'Native folder deletion confirm');await f.click(confirm);
    }
    await f.until(()=>!app.vault.getFolderByPath(path)&&[...livePaths].every(item=>!app.vault.getAbstractFileByPath(item)), 'Exact physical subtree removed');
    await app.workspace.revealLeaf(leaf);
    await f.until(()=>center()==='folder:'+parent.path,'Deleted center falls back to its native parent');
    await f.ready();
    await f.until(()=>{
      const activity=source.getActivityState();
      return !source.inventory&&!activity.pendingKnown&&!activity.knownImpactTasks&&!activity.sourceActive&&!activity.repoWrites&&!activity.repoDeleteTask;
    },'Source ownership settles after native folder deletion');
    f.check(!index.get('folder:'+path)&&affected.every(item=>Array.isArray(item.children) ? !index.get('folder:'+item.path) : !index.get(item.path)?.file),'Deleted physical graph entries remain');
    const retired=[];
    for(const item of affected)if(item.extension==='md'){
      const inspection=await source.repository.inspect(item.path,[]);
      retired.push({relative:item.path.slice(path.length+1),reason:inspection.reason});
      f.check(!inspection.head,'Durable source head remains for a deleted file');
    }
    if(referrer){
      f.check(await app.vault.read(referrer)===original,'Surviving referrer was written');
      const cache=app.metadataCache.getFileCache(referrer);
      f.check(cache?.links?.length===1&&!app.metadataCache.getFirstLinkpathDest(cache.links[0].link,referrer.path),'Surviving declaration did not become unresolved');
    }
    const after=work(), result={phase,before,after,events,retired,additionalInventories:after.inventory-before.inventory,additionalBuilds:after.builds-before.builds};
    c.progress=result;
    if(c.expectLocal)f.check(result.additionalInventories===0&&result.additionalBuilds===0,'Provable folder deletion admitted global work');
    return result;
  } finally {
    for(const [owner,ref] of refs)owner.offref(ref);
    if(dialog?.isConnected)await f.key(doc,'Escape');
  }
}

/** Separate baseline that proves folder deletion even if the external import fails before creating files. */
export async function nativeSettledFolderDeletion(app,c){
  const f=c.fixture(app,c);
  try{
    await f.initialize();const p=f.p;
    p.settings.showFolderNodes=true;await p.saveSettings(false,false);
    const folder=await app.vault.createFolder(f.folder+'/Imported');
    f.restores.push(async()=>{if(app.vault.getFolderByPath(folder.path)===folder)await app.vault.delete(folder,true);});
    await app.vault.createFolder(folder.path+'/Level1');await app.vault.createFolder(folder.path+'/Level1/Level2');
    const file=await app.vault.create(folder.path+'/Level1/Level2/Deep.md','# Deep owned fixture\n');f.files.push(file);
    const referrer=await f.note('Surviving referrer','[['+file.path+']]\n'),leaf=await f.canvas(referrer);
    await f.until(()=>app.metadataCache.resolvedLinks[referrer.path]?.[file.path]===1,'Surviving native referrer resolves to imported note');
    await f.ready();
    await f.until(()=>!p.index.sourceAcquisition.inventory&&p.index.sourceAcquisition.hasSemanticDependencies()&&p.index.completePhysicalFolderInventory,'Real settled physical and source authority');
    return await c.deleteImportedFolder(app,c,f,leaf,folder,referrer,[file],'settled native folder deletion');
  }finally{await f.cleanup();}
}
