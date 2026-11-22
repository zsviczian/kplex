/** #318 native Add friend -> Follow -> Add friend chain with exact source/file/disk receipts.
 * The outer Small runner owns staging, application lock and independent fixture restoration.
 * A one-shot hold delays the actual On-demand host-scope owner after its native read returns;
 * no readiness flag, source identity or shared-center policy is altered by this driver.
 */
export async function authoringSourceSafetyCases(app,c){
 const f=c.fixture(app,c),cases=[],captures=[],writes=[];
 try{
  await f.initialize();let p=f.p;
  Object.assign(p.settings,{indexingModeDesktop:'on-demand',indexBeforeViewDesktop:false,newNodeAfterSaving:'follow',alsoWriteInverseOntology:false});
  // This reported policy defers startup until a real canvas opens below. A reload must not
  // await global readiness while no native view owns the demand that starts initialization.
  await p.saveSettings(false,false);p=await f.reload(false);f.check(p.index.isOnDemandMode(),'Reported On-demand policy must be active');
  // A genuine non-default ontology publication makes the prior full-graph snapshot ineligible.
  // Source facts remain intact; real views must acquire local policy-current neighborhoods.
  await p.updateOntologyField('leftFriends',['Friend318'],[...p.settings.hierarchy.leftFriends],()=>!c.closed);
  const originalLink=p.linkNewRelatedFile,originalFrontmatter=app.fileManager.processFrontMatter;
  p.linkNewRelatedFile=async function(origin,role,file,field,...args){
   captures.push({origin:origin.path,nativeOrigin:origin.file?.path,exactOrigin:origin.file===app.vault.getFileByPath(origin.file?.path??''),
    target:file.path,role,field,shared:this.settings.lastActivePath,status:this.getIndexStatus(),coverage:this.index.viewScopeCoverage(origin.path)});
   return originalLink.call(this,origin,role,file,field,...args);
  };
  app.fileManager.processFrontMatter=async function(file,mutate,...args){
   const before=file.path.startsWith(f.folder+'/')?await app.vault.read(file):null;
   const result=await originalFrontmatter.call(this,file,mutate,...args);
   if(before!==null)writes.push({path:file.path,before,after:await app.vault.read(file)});return result;
  };
  f.restores.push(()=>{p.linkNewRelatedFile=originalLink;app.fileManager.processFrontMatter=originalFrontmatter;});
  /** Open the actual registered Obsidian command, preserving command routing and native modal identity. */
  const open=async(leaf,expected)=>{
   await app.workspace.revealLeaf(leaf);await f.focus(leaf.view.containerEl.ownerDocument);
   const command=app.commands.commands['k-plex:kplex-add-friend'];f.check(typeof command?.checkCallback==='function','Actual Add friend command');
   f.check(command.checkCallback(true)===true,'Command must be available for current exact center');
   command.checkCallback(false);
   let modal;await f.until(()=>{modal=[...p.actionDialogs.keys()].find(value=>value.origin?.file&&value.contentEl?.querySelector('.kplex-create-name-pair input'));return !!modal;},'Actual Add friend composer');
   f.check(modal.origin.file===expected&&modal.origin.path===expected.path,'Dialog captured wrong source: '+JSON.stringify({expected:expected.path,actual:modal.origin.path,native:modal.origin.file?.path,shared:p.settings.lastActivePath}));
   f.check(modal.titleEl.textContent.includes(p.index.titleFor(p.index.get(expected.path))),'Dialog title must name the captured source');
   return modal;
  };
  /** Type through the current native document; physical creation and selected Follow use the form. */
  const create=async(modal,name,afterSubmit)=>{
   const input=modal.contentEl.querySelector('.kplex-create-name-pair input'),doc=input.ownerDocument,native=await f.focus(doc);
   await f.key(doc,'A',[process.platform==='darwin'?'meta':'control'],input);await native.webContents.insertText(name);
   await f.until(()=>input.value===name,'Native Name draft');
   const folderInput=modal.contentEl.querySelector('.kplex-create-folder-row input');f.check(folderInput,'Native creation folder');
   if(folderInput.value!==f.folder){await f.key(doc,'A',[process.platform==='darwin'?'meta':'control'],folderInput);await native.webContents.insertText(f.folder);await f.until(()=>folderInput.value===f.folder,'Owned creation folder');}
   const tab=[...modal.contentEl.querySelectorAll('[role=tab]')].find(value=>value.textContent===p.translator('common.markdown'));
   if(tab&&tab.getAttribute('aria-selected')!=='true')await f.click(tab);
   const completion=modal.contentEl.querySelector('.kplex-add-related-completion select'),follow=[...(completion?.options??[])].findIndex(option=>option.value==='follow');
   f.check(completion&&follow>=0,'Native Follow completion choice');
   if(completion.value!=='follow'){await f.key(doc,'Home',[],completion);for(let index=0;index<follow;index++)await f.key(doc,'Down',[],completion);await f.until(()=>completion.value==='follow','Explicit Follow completion');}
   let button;await f.until(()=>{button=[...modal.contentEl.querySelectorAll('button')].find(value=>value.getAttribute('aria-label')===p.translator('addRelated.createMarkdownLink'));return button&&!button.disabled;},'Enabled physical Markdown creation');await f.click(button);
   if(afterSubmit)await afterSubmit();
   const path=f.folder+'/'+name+'.md';let file;await f.until(()=>{file=app.vault.getFileByPath(path);return !!file&&!modal.modalEl.isConnected;},'Durable created note and Follow completion');
   f.files.push(file);return file;
  };
  for(const surface of ['sidepanel','tab'])for(const phase of ['before-local-ready','after-local-ready']){
   const suffix=surface+'-'+phase,a=await f.note('A318-'+suffix,'Keep: source A\n'),bName='B318-'+suffix,cName='C318-'+suffix,bPath=f.folder+'/'+bName+'.md';
   const leaf=await f.canvas(a,surface==='sidepanel'?'k-plex-sidepanel-view':'k-plex-react-view');await f.ready();
   const source=p.index,prepare=source.publishOnDemandHostScope,requests=[];
   let release,held=0,released=phase==='after-local-ready';const gate=new Promise(done=>{release=()=>{released=true;done();};});
   source.publishOnDemandHostScope=async function(centerPath,...args){
    if(requests.length<24)requests.push({center:centerPath});
    const result=await prepare.call(this,centerPath,...args);
    if(centerPath===bPath&&!released){held++;c.progress={phase:'Held actual B On-demand host scope',surface,held};await gate;}
    return result;
   };
   try{
    const initial=await app.vault.read(a),first=await open(leaf,a),b=await create(first,bName);
    await f.until(()=>p.documentSession(leaf)?.centerPath===b.path&&p.settings.lastActivePath===b.path,'First Follow admitted exact B center');
    if(phase==='before-local-ready'){
     try{await f.until(()=>held>0,'Actual B requested-neighborhood hold');}
     catch(error){throw Error(String(error)+'; requested native scopes: '+JSON.stringify({requests,bPath,coverage:p.index.viewScopeCoverage(b.path),semantic:p.index.getSemanticPreparationDiagnostics()}));}
     f.check(p.index.viewScopeCoverage(b.path).pending,'B must still have a genuine local preparation owner before second command');
    }else{await f.ready();const coverage=p.index.viewScopeCoverage(b.path);f.check(coverage.prepared&&!coverage.pending,'B must have settled local coverage after settlement');}
    const beforeSecond={a:await app.vault.read(a),b:await app.vault.read(b)},captureStart=captures.length;
    const second=await open(leaf,b),created=await create(second,cName,async()=>{
     // Native creation may await local publication after capturing its exact owner. Keep the
     // invocation before readiness, record that capture, then let normal completion settle.
     await f.until(()=>captures.length>captureStart,'Second native write captured its source');release();
    });
    const after={a:await app.vault.read(a),b:await app.vault.read(b),c:await app.vault.read(created)},call=captures[captureStart];
    f.check(call?.origin===b.path&&call.nativeOrigin===b.path&&call.exactOrigin,'Second write must capture actual B file');
    f.check(after.a===beforeSecond.a,'Second creation must not modify A');
    f.check(after.a.includes(bName)&&!after.a.includes(cName),'A must link to B only');
    f.check(after.b.includes(cName),'B must own the new relationship to C');
    f.check(!after.c.includes(a.basename),'C must not receive an accidental relationship to A');
    cases.push({surface,phase,initial,beforeSecond,after,captured:call,held,status:p.getIndexStatus()});
   }finally{release();source.publishOnDemandHostScope=prepare;}
   await f.ready();leaf.detach();
  }
  return{cases,captures,writes,limitation:'Windows native desktop/sidepanel flow with controlled preparation hold; not physical Android acceptance.'};
 }finally{await f.cleanup();}
}
