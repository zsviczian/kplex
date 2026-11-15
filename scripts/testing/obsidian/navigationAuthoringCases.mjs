/** Exact-build native provenance navigation, lateral preference persistence and daily-gap consent.
 * Only marker-owned fixture notes are created; every native setting/layout is restored by the lane. */
export async function navigationAuthoringCases(app,c) {
 const f=c.fixture(app,c),cases=[];
 try{
  await f.initialize();let p=f.p;
  await p.updateOntologyField('children',['Child307'],[...p.settings.hierarchy.children],()=>true);
  const b=await f.note('Target'),a=await f.note('Source','---\nChild307: "[['+b.path+']]"\n---\n');
  let leaf=await f.canvas(a);await f.ready();
  let source=await p.singleRelationshipSourceLocation(a.path,b.path,()=>true);
  f.check(source?.path===a.path&&source.line===1&&source.current(),'Single property source must retain exact physical navigation');
  await f.until(()=>leaf.view.contentEl.querySelector('.kplex-edge-hit'),'Native connector hit surface');
  const hit=leaf.view.contentEl.querySelector('.kplex-edge-hit'),rect=hit.getBoundingClientRect();
  hit.dispatchEvent(new hit.ownerDocument.defaultView.MouseEvent('contextmenu',{bubbles:true,cancelable:true,clientX:rect.x+rect.width/2,clientY:rect.y+rect.height/2}));
  await f.until(()=>[...document.querySelectorAll('.menu-item')].some(item=>item.textContent.includes(p.translator('explain.goToSource'))),'Single-source context action');
  f.check([...document.querySelectorAll('.menu-item')].some(item=>item.textContent.includes(p.translator('graph.connectionDetails'))),'Direct source removed Connection details');p.dismissKplexMenu();
  const outcome=await p.actionManager.dispatch({id:'relationship.details',args:{directSource:true},source:'internal',surfaceId:f.surface(leaf),
   target:{kind:'edge',origin:{identity:a.path,path:a.path,kind:'file'},target:{identity:b.path,path:b.path,kind:'file'}}});
  f.check(outcome.status==='completed','Native source action: '+JSON.stringify(outcome));
  f.check(app.workspace.getLeavesOfType('markdown').some(row=>row.view.file===a),'Source action did not open actual Markdown owner');
  cases.push({id:'single-property-source',line:source.line,status:'passed'});
  await app.workspace.revealLeaf(leaf);await f.focus(leaf.view.containerEl.ownerDocument);
  p.settings.connectionSourceModifier='shift';await p.saveSettings(false,true);
  await f.wait(100);const direct=p.openRelationshipEvidenceLocation,opened=[];const observed=p;
  p.openRelationshipEvidenceLocation=async function(...args){const result=await direct.apply(this,args);opened.push(args[0]);return result;};
  f.restores.push(()=>{observed.openRelationshipEvidenceLocation=direct});
  const sourceHit=leaf.view.contentEl.querySelector('.kplex-edge-hit'),point=sourceHit.getPointAtLength(sourceHit.getTotalLength()/2);
  const position=new sourceHit.ownerDocument.defaultView.DOMPoint(point.x,point.y).matrixTransform(sourceHit.getScreenCTM()),native=await f.focus(sourceHit.ownerDocument);
  const xy={x:Math.round(position.x),y:Math.round(position.y)},clicks=[];let trusted=false;
  const receipt=event=>{clicks.push({type:event.type,trusted:event.isTrusted,shift:event.shiftKey,target:event.target?.className?.baseVal??event.target?.className});if(event.type==='pointerdown'&&event.target===sourceHit)trusted=event.isTrusted};sourceHit.ownerDocument.addEventListener('pointerdown',receipt,true);sourceHit.ownerDocument.addEventListener('click',receipt,true);
  try{
   native.webContents.sendInputEvent({type:'mouseMove',...xy});native.webContents.sendInputEvent({type:'keyDown',keyCode:'Shift',modifiers:['shift']});
   native.webContents.sendInputEvent({type:'mouseDown',...xy,button:'left',clickCount:1,modifiers:['shift']});native.webContents.sendInputEvent({type:'mouseUp',...xy,button:'left',clickCount:1,modifiers:['shift']});
   try{await f.until(()=>trusted&&opened.length===1,'Trusted Shift-click navigates the single physical source',10000)}catch(error){throw Error(String(error)+'; native click: '+JSON.stringify({xy,clicks,opened,setting:p.settings.connectionSourceModifier,connected:sourceHit.isConnected,hit:sourceHit.ownerDocument.elementFromPoint(xy.x,xy.y)?.className?.baseVal}));}
   f.check(opened[0].path===a.path&&opened[0].line===1,'Modifier-click used a guessed source');
  }finally{native.webContents.sendInputEvent({type:'keyUp',keyCode:'Shift',modifiers:[]});sourceHit.ownerDocument.removeEventListener('pointerdown',receipt,true);sourceHit.ownerDocument.removeEventListener('click',receipt,true);p.openRelationshipEvidenceLocation=direct;}
  cases.push({id:'trusted-source-modifier-click',status:'passed'});
  await app.workspace.revealLeaf(leaf);await f.focus(leaf.view.containerEl.ownerDocument);
  await app.vault.modify(a,'---\nChild307: "[['+b.path+']]"\n---\n\nChild307:: [['+b.path+']]\n');
  await f.until(()=>p.index.explainRelationship(a.path,b.path)?.decisions.some(row=>row.evidence.sourceKind==='inline-ontology'),'Edited physical source acquired');await f.ready();
  f.check(!source.current(),'Edited source retained a stale direct destination');f.check(await p.singleRelationshipSourceLocation(a.path,b.path,()=>true)===null,'Property plus body must require source selection');
  const detail=await p.actionManager.dispatch({id:'relationship.details',args:{directSource:true},source:'internal',surfaceId:f.surface(leaf),
   target:{kind:'edge',origin:{identity:a.path,path:a.path,kind:'file'},target:{identity:b.path,path:b.path,kind:'file'}}});
  f.check(detail.status==='opened','Multiple sources must open Connection details');for(const modal of p.actionDialogs.keys())modal.close();
  const modal=document.querySelector('.modal.kplex-modal');if(modal)modal.querySelector('.modal-close-button')?.click();
  cases.push({id:'edited-multiple-sources-fallback',status:'passed'});
  await p.updateOntologyField('previous',['Previous307'],[...p.settings.hierarchy.previous],()=>true);
  await p.updateOntologyField('next',['Next307'],[...p.settings.hierarchy.next],()=>true);
  await p.rememberRelationshipOntology('previous','Previous307');await p.rememberRelationshipOntology('next','Next307');
  p.settings.connectionSourceModifier='shift';p.settings.future307={keep:true};await p.saveSettings(false,false);await p.settingsWriteQueue;
  p=await f.reload();f.check(p.settings.lateralCreationRoles.left==='previous'&&p.settings.lateralCreationRoles.right==='next','Lateral family lost across plugin reload');
  f.check(p.settings.connectionSourceModifier==='shift'&&p.settings.future307?.keep,'Nondefault preference or unknown key lost on reload');
  leaf=app.workspace.getLeavesOfType('k-plex-react-view').find(row=>row.view.contentEl?.querySelector('[data-kplex-path="'+a.path+'"]'))??await f.canvas(a);await leaf.view.waitUntilReady();
  cases.push({id:'lateral-and-source-preference-reload',status:'passed'});
  const attachmentKeys=['showDocumentAttachments','showImageAttachments','showMediaAttachments','showOtherAttachments'];
  const attachments=[];
  for(const name of ['Document.txt','Image.svg','Recording.wav','Archive.bin']){
   const file=await app.vault.create(f.folder+'/'+name,name.endsWith('.svg')?'<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"></svg>':'');
   f.files.push(file);p.index.insertCreatedFile(file);attachments.push(file);
  }
  p.settings.showAttachments=false;await p.saveSettings(false,false);
  f.check(attachmentKeys.every(key=>p.settings[key]===false),'Legacy attachment preference must disable all four categories');
  await app.workspace.revealLeaf(leaf);await f.focus(leaf.view.containerEl.ownerDocument);
  const root=leaf.view.contentEl.querySelector('.kplex-app');await f.click(root.querySelector('.kplex-filter-trigger'));
  await f.until(()=>document.querySelector('.kplex-filter-panel'),'Native attachment category panel');
  const panel=document.querySelector('.kplex-filter-panel'),rows=[...panel.querySelectorAll('.kplex-filter-visibility-grid label')];
  f.check(rows.length===12,'Expected twelve native visibility controls');
  f.check(rows.slice(5,9).map(row=>row.querySelector('span').textContent).join('|')===['filter.visibilityDocuments','filter.visibilityImages','filter.visibilityMedia','filter.visibilityOtherAttachments'].map(key=>p.translator(key)).join('|'),'Native attachment category order');
  await f.click(rows[6]);await f.until(()=>p.settings.showImageAttachments&&p.settings.showAttachments,'Native image category lifts the old aggregate gate');await p.settingsWriteQueue;
  f.check(attachmentKeys.map(key=>Number(p.settings[key])).join('')==='0100','Native toggle must retain the other category choices');
  for(const [i,file]of attachments.entries())f.check(p.index.isVisiblePage(p.index.get(file.path))===(i===1),'Native physical category visibility: '+file.name);
  await f.key(panel.ownerDocument,'Escape');
  p=await f.reload();f.check(attachmentKeys.map(key=>Number(p.settings[key])).join('')==='0100','Native independent categories survive plugin reload');
  leaf=await f.canvas(a);await f.ready();cases.push({id:'attachment-categories-native-toggle-and-reload',status:'passed'});
  const daily=app.internalPlugins.getPluginById('daily-notes');f.check(daily?.enabled&&daily.instance,'Daily Notes core plugin required for native daily creation');
  const original=daily.instance.options;daily.instance.options={...original,folder:f.folder,format:'YYYY-MM-DD',template:''};f.restores.push(()=>{daily.instance.options=original});
  const today=window.moment().format('YYYY-MM-DD'),past=window.moment().subtract(3,'days').format('YYYY-MM-DD');await f.note(past);
  const path=f.folder+'/'+today+'.md',surface=f.surface(leaf);
  await p.navigateDailyNote(today,[],leaf,surface,()=>true);
  await f.until(()=>[...p.actionDialogs.keys()].some(dialog=>dialog.contentEl.textContent.includes(past)),'Today creation offers nearest earlier note');
  let prompt=[...p.actionDialogs.keys()].find(dialog=>dialog.contentEl.textContent.includes(past));
  f.check(prompt.gap&&!prompt.gapSelected,'Gap must be visible and opt-in');prompt.close();f.check(!app.vault.getFileByPath(path),'Cancel created today');
  await p.navigateDailyNote(today,[],leaf,surface,()=>true);await f.until(()=>[...p.actionDialogs.keys()].some(dialog=>dialog.gap),'Second daily-gap offer');
  prompt=[...p.actionDialogs.keys()].find(dialog=>dialog.gap);await f.click(prompt.gapToggle.toggleEl);f.check(prompt.gapSelected,'Native toggle did not record explicit gap consent');
  await prompt.confirm();const created=app.vault.getFileByPath(path);if(created)f.files.push(created);
  f.check(created,'Explicit today creation failed');await f.until(()=>[...p.actionDialogs.keys()].some(dialog=>dialog.contentEl.textContent.includes(past)),'Created today opens reviewed previous-note composer');
  for(const dialog of p.actionDialogs.keys())dialog.close();
  f.check(!p.index.isConnected(p.index.get(path),f.folder+'/'+past+'.md'),'Review without submit wrote a relationship');
  cases.push({id:'today-gap-consent-and-cancel',status:'passed'});
  return{cases,startupEvidence:f.startupEvidence};
 }catch(error){throw Error((error?.stack??String(error))+'; completed cases: '+JSON.stringify(cases));}finally{await f.cleanup();}
}
