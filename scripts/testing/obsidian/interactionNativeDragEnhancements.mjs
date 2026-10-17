/**
 * Focused outbound node-link drag acceptance inside the existing native interaction driver.
 * The parent supplies exact-build/vault/input/cleanup capabilities. This self-contained function
 * is serialized into that renderer; only test-owned facts and native leaves are added. Synthetic
 * DragEvents exercise actual ThoughtNode/DragManager/drop consumers, separately from trusted
 * pointer gate/body gestures. Payload generation is observed independently of normal navigation.
 */

/** Exercise native payloads, Markdown insertion, cross-Plex drops and retained internal gestures. */
export async function acceptNativeDragEnhancements({app,p,c,check,wait,until,frames,path,native,input,center,captureAreas,emptyPoint,drag,navigate}) {
  const i=p.index,sourceLeaf=c.leaf,doc=sourceLeaf.view.contentEl.ownerDocument,view=doc.defaultView;
  /** Retain the source leaf independently of helpers that temporarily select the destination. */
  const sourceRoot=()=>sourceLeaf.view.contentEl;
  const names={origin:'Native-link-origin',sink:'Native-markdown-drop',missing:'Native-missing',image:'Native-payload.png'};
  const imagePath=c.folder+'/'+names.image,originPath=path(names.origin),sinkPath=path(names.sink);
  const url='https://example.invalid/kplex-native-drag-'+Date.now(),tag='#'+c.folder+'/Native/Drag';
  const created=[];
  /** Register each accepted native create before any following awaited work or cancellation. */
  const create=async(filePath,body)=>{check(!app.vault.getFileByPath(filePath),'Native drag fixture already exists');const file=await app.vault.create(filePath,body);c.files.push(file.path);created.push(file.path);i.insertCreatedFile(file);return file};
  const canvas=createFragment().createEl('canvas');canvas.width=1;canvas.height=1;
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));check(blob,'Native drag image encoding failed');
  const image=await app.vault.createBinary(imagePath,await blob.arrayBuffer());c.files.push(image.path);i.insertCreatedFile(image);
  await create(sinkPath,'');
  await create(originPath,'---\nChild:\n  - "[['+path('Friend')+']]"\n  - "[['+c.folder+'/'+names.missing+']]"\n  - "[['+imagePath+']]"\n---\n[Native drag URL]('+url+')\n'+tag+'\n');
  await until(()=>created.every(filePath=>app.metadataCache.getFileCache(app.vault.getFileByPath(filePath))),'Native drag fixture metadata absent');
  Object.assign(p.settings,{embedCentralNode:false,showTagNodes:true,showFolderNodes:false,showAttachments:true,showURLNodes:true,showVirtualNodes:true,showPageNodes:true,renderSiblings:false,graphDepth:1,graphLenses:[]});
  await i.refreshPresentationSettings();
  let pending=[...created];
  for(let attempt=0;pending.length&&attempt<8;attempt++){
    await until(()=>!i.building&&!i.hasActiveSemanticPreparation(),'Native drag fixture graph owner did not settle');
    const result=await i.patchMarkdownPaths(pending);
    if(result.outcome==='patched'){pending=[];break}
    check(result.outcome==='cancelled','Native drag fixture patch failed: '+result.outcome);pending=result.pendingPaths??pending;
  }
  check(!pending.length,'Native drag fixture patches did not converge');
  c.releases.push(i.acquireSemanticDemand(originPath));await i.refreshOnDemandGraph([originPath],false);
  p.notifyNavigation(originPath);await until(()=>sourceRoot().querySelector('.kplex-role-center')?.dataset.kplexPath===originPath,'Native drag source did not render');await frames();
  sourceRoot().querySelector('button[aria-label="'+p.translator('graph.fitGraph')+'"]').click();await wait(200);
  const ghost=i.get(c.folder+'/'+names.missing)??i.get(c.folder+'/'+names.missing+'.md');
  await until(()=>i.get(url)&&i.get('tag:'+tag.slice(1)),'Native URL/tag vocabulary absent');
  check(ghost&&!ghost.file,'Native drag placeholder absent');
  const cases=[{kind:'file',identity:path('Friend'),expected:path('Friend'),marker:'Friend'},
    {kind:'attachment',identity:imagePath,expected:imagePath,marker:'Native-payload'},
    {kind:'url',identity:url,expected:url,marker:url},
    {kind:'ghost',identity:ghost.path,expected:ghost.path,marker:names.missing},
    {kind:'tag',identity:'tag:'+tag.slice(1),expected:tag,marker:tag}];
  await until(()=>cases.every(item=>[...sourceRoot().querySelectorAll('.kplex-thought')].some(node=>node.dataset.kplexPath===item.identity)),'Native drag source thoughts absent');
  const counts={reads:0,parses:0,acquisitions:0,builds:0,snapshotWrites:0,inventories:0},undos=[];
  /** Observe original methods only around synchronous payload creation, preserving exact returns. */
  const observe=(owner,key,counter)=>{const descriptor=Object.getOwnPropertyDescriptor(owner,key),original=owner[key];check(typeof original==='function','Native payload work hook unavailable: '+key);owner[key]=function(...args){counts[counter]++;return original.apply(this,args)};undos.push(()=>{if(descriptor)Object.defineProperty(owner,key,descriptor);else delete owner[key]})};
  let active=null;
  /** Retire only this scenario's active native token; native global drop may already have done so. */
  const finish=()=>{if(!active)return;const drag=active;active=null;drag.node.dispatchEvent(new view.DragEvent('dragend',{bubbles:true,dataTransfer:drag.transfer}));check(!app.dragManager.draggable||app.dragManager.draggable.source!==drag.source,'Native drag source token survived dragend')};
  c.restores.push(()=>{finish();for(const undo of undos.splice(0).reverse())undo()});
  for(const [owner,key,counter]of [[app.vault,'read','reads'],[app.vault,'cachedRead','reads'],[app.vault,'getFiles','inventories'],[app.vault,'getMarkdownFiles','inventories'],[i.metadataParser,'parse','parses'],[i.sourceAcquisition,'acquire','acquisitions'],[i,'rebuild','builds'],[i,'rebuildProgressively','builds'],[i.indexedDb,'writeSnapshot','snapshotWrites']])observe(owner,key,counter);
  const ownedModals=new Set(),modalInstances=new Set(),modalCalls=[],openRelation=p.openRelationModal;
  /** Observe the unchanged native constructor result so failure cleanup closes only owned dialogs. */
  p.openRelationModal=function(options){const result=openRelation.call(this,options);if(options.origin.path.startsWith(c.folder+'/')){modalInstances.add(result);modalCalls.push({mode:options.mode,role:options.semanticRole,target:options.fixedTarget?.path})}return result};
  c.restores.push(()=>{p.openRelationModal=openRelation;for(const dialog of modalInstances)dialog.close();for(const [dialog]of [...p.actionDialogs])if(ownedModals.has(dialog.modalEl))dialog.close()});
  /** Start from the actual rendered thought and check native manager data without reading source facts. */
  const begin=item=>{
    check(!app.dragManager.draggable,'A competing native drag is active');
    const node=[...sourceRoot().querySelectorAll('.kplex-thought')].find(element=>element.dataset.kplexPath===item.identity);check(node?.draggable,'Native source thought is not draggable');
    const transfer=new view.DataTransfer(),before={...counts},sourceBefore=JSON.stringify(i.getSourceAcquisitionCounters()),semanticBefore=JSON.stringify(i.getSemanticPreparationDiagnostics());
    const event=new view.DragEvent('dragstart',{bubbles:true,cancelable:true,dataTransfer:transfer});node.dispatchEvent(event);
    const d=app.dragManager.draggable;check(d?.source?.kind==='kplex-node-link'&&d.source.node.identity===item.identity,'ThoughtNode did not create its actual native source payload');
    active={node,transfer,source:d.source};
    const work=Object.fromEntries(Object.keys(counts).map(key=>[key,counts[key]-before[key]]));
    check(Object.values(work).every(value=>value===0)&&sourceBefore===JSON.stringify(i.getSourceAcquisitionCounters())&&semanticBefore===JSON.stringify(i.getSemanticPreparationDiagnostics()),'Native payload generation performed indexing/source work: '+JSON.stringify(work));
    if(item.kind==='tag')check(d.type==='text'&&d.text===item.expected&&transfer.getData('text/plain')===item.expected,'Tags are not ordinary native #tag text');
    else{check(d.type==='link'&&d.linktext===item.expected,'Native link target differs from the rendered node');if(item.kind==='file'||item.kind==='attachment')check(d.file===app.vault.getFileByPath(item.identity),'Native link lacks the current exact physical file')}
    return {transfer,payload:{kind:item.kind,type:d.type,linktext:d.linktext??null,file:d.file?.path??null,sourcePath:d.sourcePath??null,text:d.text??null,sourceKind:d.source.node.kind},work,syntheticDragEvent:!event.isTrusted};
  };
  /** Deliver the actual native payload to the selected host element rather than calling a drop handler. */
  const drop=(target,transfer,point)=>{const w=target.ownerDocument.defaultView;target.dispatchEvent(new w.DragEvent('dragover',{bubbles:true,cancelable:true,dataTransfer:transfer,clientX:point.x,clientY:point.y}));target.dispatchEvent(new w.DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:transfer,clientX:point.x,clientY:point.y}))};
  const sink=app.workspace.getLeaf('split');c.leaves.push(sink);await sink.openFile(app.vault.getFileByPath(sinkPath),{active:true,state:{mode:'source',source:true}});await sink.loadIfDeferred();
  await until(()=>sink.view.editor&&sink.view.contentEl.querySelector('.cm-content'),'Actual Markdown drop editor absent');
  c.restores.push(async()=>{if(sink.view.containerEl.isConnected)await sink.view.save()});
  const markdown=[];
  for(const item of cases){
    const editor=sink.view.editor,before=editor.getValue();editor.setCursor(editor.lastLine(),editor.getLine(editor.lastLine()).length);editor.focus();
    const drag=begin(item);
    try{const target=sink.view.contentEl.querySelector('.cm-content');drop(target,drag.transfer,center(target));await until(()=>editor.getValue()!==before,'Native Markdown drop inserted no '+item.kind+' link');check(editor.getValue().includes(item.marker),'Native Markdown drop lost '+item.kind+' target');markdown.push({...drag.payload,work:drag.work,syntheticDragEvent:drag.syntheticDragEvent})}finally{finish()}
  }
  c.cases.push({id:'outbound-native-payloads-and-markdown-drop',status:'passed',payloads:markdown,actualThoughtNodeAndDragManager:true,actualMarkdownEditorDrop:true,trustedOutboundGesture:false});
  await sink.view.save();
  // Keep the source view stable while only the second Plex accepts each native link.
  const destination=app.workspace.getLeaf('split');c.leaves.push(destination);await destination.setViewState({type:'k-plex-react-view',active:true});await destination.view.waitUntilReady();
  await until(()=>destination.view.contentEl.querySelector('.kplex-role-center'),'Second Plex did not render');
  const cross=[];
  for(const item of cases){
    const sourceCenter=sourceRoot().querySelector('.kplex-role-center')?.dataset.kplexPath,before=i.getSourceAcquisitionCounters(),drag=begin(item);
    try{const target=destination.view.contentEl.querySelector('.kplex-role-center');drop(target,drag.transfer,center(target));await until(()=>destination.view.contentEl.querySelector('.kplex-role-center')?.dataset.kplexPath===item.identity,'Cross-Plex '+item.kind+' drop did not navigate');check(sourceRoot().querySelector('.kplex-role-center')?.dataset.kplexPath===sourceCenter,'Destination drop changed the source Plex center');cross.push({kind:item.kind,payload:drag.payload,sourceBefore:before,sourceAfter:i.getSourceAcquisitionCounters(),payloadWork:drag.work})}finally{finish()}
    // After the first Markdown endpoint, verify that an external area drop uses the real
    // fixed-target composer. Cancel before a write; source acquisition belongs to navigation.
    if(item.kind==='file'){
      const saved=c.leaf;c.leaf=destination;
      try{const areas=await captureAreas(),point=emptyPoint(areas.child),attachment=begin(cases[1]);try{const hit=destination.view.contentEl.ownerDocument.elementFromPoint(point.x,point.y);check(hit,'Cross-Plex child area has no native hit');drop(hit,attachment.transfer,point);await until(()=>doc.querySelector('.kplex-add-related-modal'),'Cross-Plex area did not open composer');const modal=doc.querySelector('.kplex-add-related-modal');ownedModals.add(modal);const field=modal.querySelector('.kplex-add-related-note-search input');check(field?.value===i.titleFor(i.get(imagePath)),'Cross-Plex composer lost its fixed attachment target');check(modalCalls.at(-1)?.mode==='create'&&modalCalls.at(-1)?.role==='child'&&modalCalls.at(-1)?.target===imagePath,'Cross-Plex area chose the wrong canonical create request');const cancel=[...modal.querySelectorAll('button')].find(button=>button.getAttribute('aria-label')===p.translator('common.cancel')||button.textContent.trim()===p.translator('common.cancel'));check(cancel,'Cross-Plex composer Cancel absent');cancel.click();await until(()=>!modal.isConnected,'Cross-Plex composer did not cancel');c.cases.push({id:'cross-plex-area-native-fixed-target-composer',status:'passed',targetKind:'attachment',role:'child',cancelledWithoutWrite:true})}finally{finish()}}finally{c.leaf=saved}
    }
  }
  c.cases.push({id:'cross-plex-native-file-attachment-url-placeholder-tag-navigation',status:'passed',cases:cross,navigationWorkIsNotPayloadWork:true});
  const popout=app.workspace.getLeaf('window');c.leaves.push(popout);
  await popout.setViewState({type:'k-plex-react-view',active:true});await popout.view.waitUntilReady();native(popout);
  await until(()=>popout.view.contentEl.querySelector('.kplex-role-center'),'Pop-out Plex did not render');
  for(const item of [cases[0],cases[2],cases[4]]){
    const drag=begin(item);
    try{const target=popout.view.contentEl.querySelector('.kplex-role-center');drop(target,drag.transfer,center(target));
      await until(()=>popout.view.contentEl.querySelector('.kplex-role-center')?.dataset.kplexPath===item.identity,'Pop-out '+item.kind+' link drop did not navigate');
      check(sourceRoot().querySelector('.kplex-role-center')?.dataset.kplexPath===originPath,'Pop-out drop changed the source Plex');
    }finally{finish()}
  }
  c.cases.push({id:'cross-window-native-payload-navigation',status:'passed',kinds:['file','url','tag'],syntheticNativeDragEvents:true,trustedCrossWindowGesture:false});popout.detach();
  destination.detach();sink.detach();app.workspace.setActiveLeaf(sourceLeaf,{focus:true});native(sourceLeaf);
  // Gate dragging keeps its pointer-owned draft even though thought bodies are native draggable.
  const children=[...sourceRoot().querySelectorAll('.kplex-role-child')].filter(node=>node.querySelector('[data-kplex-gate=left]'));
  check(children.length>=2,'Native drag gate fixture lacks two child nodes');
  const from=center(children[0].querySelector('[data-kplex-gate=left]')),to=center(children[1].querySelector('[data-kplex-gate=left]'));
  try{await drag(from,to,false);const draft=sourceRoot().querySelector('.kplex-drag-connector');check(draft,'Native-draggable body suppressed gate draft');const length=draft.getTotalLength(),first=draft.getPointAtLength(0).matrixTransform(draft.getScreenCTM()),last=draft.getPointAtLength(length).matrixTransform(draft.getScreenCTM());check(Math.hypot(first.x-from.x,first.y-from.y)<0.2&&Math.hypot(last.x-to.x,last.y-to.y)<0.2,'Gate draft moved off its actual endpoints');check(!app.dragManager.draggable,'Gate drag incorrectly started a native body link');c.cases.push({id:'native-node-gate-pointer-draft-preserved',status:'passed',endpointGeometry:true,nativeBodyPayloadAbsent:true})}finally{sourceRoot().querySelector('.kplex-plex').dispatchEvent(new view.PointerEvent('pointercancel',{bubbles:true,pointerId:1,pointerType:'mouse'}));input('mouseUp',to);await frames()}
  // Exercise the same-view native body path without changing stored relations: its area
  // composer must still represent a move, while cancellation preserves the original child.
  const friend=[...sourceRoot().querySelectorAll('.kplex-role-child')].find(node=>node.dataset.kplexPath===path('Friend'));check(friend,'Same-view body drag file absent');
  const area=await captureAreas(),point=emptyPoint(area.left);let trustedStart=false,syntheticFallbackUsed=false;
  /** Only this source viewport's native body lease may be retired by an injected gesture. */
  const finishTrustedBody=()=>{const current=app.dragManager.draggable;if(current?.source?.kind==='kplex-node-link'&&current.source.owner===sourceRoot().querySelector('.kplex-plex'))app.dragManager.onDragEnd?.()};
  const trustedReceipt=event=>{if(friend.contains(event.target)&&event.isTrusted)trustedStart=true};doc.addEventListener('dragstart',trustedReceipt,true);
  try{
    await drag(center(friend.querySelector('.kplex-thought-text')??friend),point);
    await wait(150);
    if(!doc.querySelector('.kplex-relation-modal')){check(!trustedStart,'A trusted native body drag started but its area drop did not open the composer');syntheticFallbackUsed=true;finish();finishTrustedBody();const nativeDrag=begin(cases[0]);try{drop(doc.elementFromPoint(point.x,point.y),nativeDrag.transfer,point)}finally{finish()}}
    await until(()=>doc.querySelector('.kplex-relation-modal'),'Same-view native body drop did not open its move composer');
    const modal=doc.querySelector('.kplex-relation-modal');ownedModals.add(modal);check(modalCalls.at(-1)?.mode==='relink'&&modalCalls.at(-1)?.role==='left'&&modalCalls.at(-1)?.target===path('Friend'),'Same-view native body drop lost its canonical relink request');check(modal.querySelector('.kplex-relation-direction')?.textContent===p.translator('role.friend'),'Same-view move does not display the requested Friend role');const cancel=[...modal.querySelectorAll('button')].find(button=>button.getAttribute('aria-label')===p.translator('common.cancel')||button.textContent.trim()===p.translator('common.cancel'));check(cancel,'Same-view composer Cancel absent');cancel.click();await until(()=>!modal.isConnected,'Same-view composer did not cancel');
    check(i.getNeighborhood(originPath)?.children.some(item=>item.page.path===path('Friend')),'Cancelled same-view move changed its original relation');
    c.cases.push({id:'same-view-native-body-area-move-preserved',status:'passed',trustedDragstartObserved:trustedStart,syntheticFallbackUsed,cancelledOriginalRelationPreserved:true});
  }finally{doc.removeEventListener('dragstart',trustedReceipt,true);finish();finishTrustedBody();input('mouseUp',point)}
  for(const undo of undos.splice(0).reverse())undo();c.leaf=sourceLeaf;await navigate('Center');
}
