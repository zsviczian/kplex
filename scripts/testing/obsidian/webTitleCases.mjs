/** Missing Markdown/image label regression through actual native indexing and warm plugin reuse.
 * This lane never opens a website and creates only shared-fixture-owned disposable notes. */
export async function webTitleCases(app,c) {
 const f=c.fixture(app,c),cases=[];
 try {
  await f.initialize();
  f.p.settings.inferAllLinksAsFriends=false;await f.p.saveSettings(false,false);
  const parent=await f.note('Existing embed parent'),existing=await f.note('Existing embed owner','---\nBeforeEmbed309: '+JSON.stringify('[['+parent.path+']]')+'\n---\n');
  await f.p.updateOntologyField('parents',['BeforeEmbed309'],[...f.p.settings.hierarchy.parents],()=>true);
  let stationary=await f.canvas(existing);await f.ready();
  const before=f.p.getStartupDiagnostics(),embed='https://www.youtube.com/watch?v=kplex309_EDIT';
  await app.vault.modify(existing,'---\nBeforeEmbed309: '+JSON.stringify('[['+parent.path+']]')+'\n---\n![New embed caption]('+embed+' "Video title")\n');
  await f.ready();
  await f.until(()=>{const n=f.p.index.getNeighborhood(existing.path);return n?.parents.some(row=>row.page.path===parent.path)
    &&n.children.some(row=>row.page.path===embed)&&stationary.view.contentEl.querySelector('[data-kplex-path="'+embed+'"]');},'Stationary canvas updates existing note embed without navigation');
  await f.until(()=>!f.p.index.sourceAcquisition.inventory&&f.p.index.sourceAcquisition.hasSemanticDependencies(),'Edited embed source closure');await f.ready();
  const after=f.p.getStartupDiagnostics();
  for(const counter of ['sourceInventoryPasses','fullBuildStarts'])f.check(after.sessionWork[counter]===before.sessionWork[counter],'Settled embed edit must not start '+counter+': '+JSON.stringify({before:before.sessionWork,after:after.sessionWork}));
  f.check(f.p.index.titleFor(f.p.index.get(embed))==='New embed caption','Edited image label is current');
  cases.push({phase:'settled-embed-edit',stationary:true,before:before.sessionWork,after:after.sessionWork,source:f.p.index.getSourceAcquisitionCounters()});
  f.p.settings.singleClickExternalNavigation=true;await f.p.saveSettings(false,false);
  await f.reload();stationary=await f.canvas(existing);await f.ready();
  f.check(f.p.settings.singleClickExternalNavigation===true,'Non-default external-click preference survives actual plugin reload');
  // Observe the opening sink only for this owned URL; trusted clicks still pass through the
  // real canvas, document session and actions. This test must never visit an external site.
  const p=f.p,openPage=p.openPage,openSidecar=p.openSidecar,opens=[];
  p.openPage=function(page,...args){if(page.url===embed){opens.push({path:page.path,document:args[0]===stationary.view.contentEl.ownerDocument});return Promise.resolve();}return openPage.call(this,page,...args);};
  p.openSidecar=function(host,page,...args){if(page?.url===embed){opens.push({path:page.path,sidecar:true});return Promise.resolve();}return openSidecar.call(this,host,page,...args);};
  try{
   const node=()=>stationary.view.contentEl.querySelector('[data-kplex-path="'+embed+'"]');
   p.settings.singleClickExternalNavigation=false;await p.saveSettings(false,false);
   await f.click(node());await f.until(()=>p.documentSession(stationary)?.centerPath===embed,'Web neighbour centers on first click');
   await f.click(node());f.check(opens.length===0,'Default central URL activation must not open');
   p.settings.singleClickExternalNavigation=true;await p.saveSettings(false,false);
   p.notifyNavigation(existing.path,stationary);await f.ready();
   await f.click(node());await f.until(()=>p.documentSession(stationary)?.centerPath===embed,'Opt-in web neighbour centers');
   f.check(opens.length===0,'Opt-in must not open a peripheral URL');
   await f.click(node());await f.until(()=>opens.length===1,'Opt-in central URL activation');f.check(opens[0].document,'External opening retains its owning document');
   p.settings.singleClickExternalNavigation=false;await p.saveSettings(false,false);
   await f.doubleClick(node());await f.until(()=>opens.length===2,'Explicit double-click remains available with single-click disabled');
   cases.push({phase:'external-click-navigation',defaultOff:true,peripheralCenters:true,centralOptIn:true,explicitDoubleClick:true,opens});
  }finally{p.openPage=openPage;p.openSidecar=openSidecar;}
  await f.p.updateOntologyField('parents',[...f.p.settings.hierarchy.parents,'Source'],[...f.p.settings.hierarchy.parents],()=>true);
  await f.p.updateOntologyField('rightFriends',[...f.p.settings.hierarchy.rightFriends,'supercharged by/supercharges'],[...f.p.settings.hierarchy.rightFriends],()=>true);
  f.p.settings.showFolderNodes=true;await f.p.saveSettings(false,false);
  const nancy=await f.note('Presentation pattern'),incoming=await f.note('Incoming drawing pattern','---\nexcalidraw-plugin: parsed\ntags: [excalidraw]\n---\n**supercharged by**:: [['+nancy.path+']]\n');
  const patternLeaf=await f.canvas(nancy);await f.ready();
  const folderPath='folder:'+f.folder,patternUrl='https://youtu.be/kplex309_PATTERN';
  const patternVisible=()=>{const n=f.p.index.getNeighborhood(nancy.path);return n?.parents.some(row=>row.page.path===folderPath)&&n.rightFriends.some(row=>row.page.path===incoming.path)
    &&patternLeaf.view.contentEl.querySelector('[data-kplex-path="'+folderPath+'"]')&&patternLeaf.view.contentEl.querySelector('[data-kplex-path="'+incoming.path+'"]');};
  await f.until(patternVisible,'Folder and incoming bold Excalidraw relation before embed');
  const patternBefore=f.p.getStartupDiagnostics().sessionWork;
  await app.vault.modify(nancy,'**Source**:: ![Presentation caption]('+patternUrl+')\n');
  await f.until(()=>patternVisible()&&patternLeaf.view.contentEl.querySelector('[data-kplex-path="'+patternUrl+'"]'),'Folder and incoming Excalidraw relationship retained after embed without navigation');
  await f.until(()=>!f.p.index.sourceAcquisition.inventory&&f.p.index.sourceAcquisition.hasSemanticDependencies(),'Pattern source closure');await f.ready();
  const patternAfter=f.p.getStartupDiagnostics().sessionWork;
  for(const key of ['sourceInventoryPasses','fullBuildStarts'])f.check(patternAfter[key]===patternBefore[key],'Pattern embed started '+key);
  cases.push({phase:'folder-incoming-excalidraw-embed',stationary:true,folder:true,incoming:true,before:patternBefore,after:patternAfter});
  const urls=['https://www.youtube.com/watch?v=kplex309_A1','https://youtu.be/kplex309_B2?si=retained','https://www.youtube.com/watch?v=kplex309_C3'],labels=['Game theory, Veritasium','Systems thinking','Fallback (video title)'];
  const text='![Game theory, Veritasium]('+urls[0]+' "A quoted video title")\n![Systems thinking]('+urls[1]+' "Optional title (with parentheses)")\n![]('+urls[2]+' "Fallback (video title)")\n';
  const note=await f.note('Quoted image labels',text);
  for(const phase of ['current','warm-plugin-reload']) {
   if(phase==='warm-plugin-reload')await f.reload();
   await f.canvas(note);await f.ready();
   await f.until(()=>urls.every((url,index)=>{const page=f.p.index.get(url);return page&&f.p.index.titleFor(page)===labels[index];}),'Actual indexed Markdown image labels');
   // The optional parsed-body cache can be reclaimed on reload. Durable source families, rather
   // than a warm in-memory body hit, establish that saved titles survive without another parse.
   const sources=f.p.index.indexedDb.sources,deadline=Date.now()+30000;let selection;
   do{selection=await sources.inspect(note.path,['body-urls']);if(selection.reason==='ready'&&selection.saved)break;await f.wait(100);}while(Date.now()<deadline);
   f.check(selection?.reason==='ready'&&selection.saved,'Durable current source family');
   const body=await sources.readBody(note.path,physical=>physical.path===note.path&&physical.mtime===note.stat.mtime,()=>!c.closed,false,false,undefined,true);
   f.check(body&&body.urls.length===urls.length&&body.urls.every((row,index)=>row.url===urls[index]&&row.label===labels[index]),'Durable current parser labels: '+JSON.stringify(body));
   f.check(await app.vault.read(note)===text,'Indexing must not rewrite Markdown');
   cases.push({phase,titles:urls.map(url=>f.p.index.titleFor(f.p.index.get(url))),durableSource:true,source:f.p.index.getSourceAcquisitionCounters()});
  }
  return {cases};
 }catch(error){throw Error(String(error)+'; web title cases: '+JSON.stringify(cases));}
 finally {await f.cleanup();}
}
