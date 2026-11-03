/** Exact-build Facets #272 acceptance inside the existing owned Wu Xing fixture. Uses native
 * settings publication, measured cards, actual Markdown/Sidecar leaves and window migration. */
export async function acceptFacetsNodePresentation(x){
 const {app,p,c,workspace,host,hosts,cases,path,root,center,check,wait,until,choose,panel,reveal,quiet}=x;
 const session=host.view.documentSession.plexView,base=structuredClone(p.readPortableSharingState().presets.wuxing);
 const configure=value=>p.updateCanvasViewConfiguration('wuxing',{field:'presets',path:['wuxing']},{kind:'set',value});
 const cards=h=>[...root(h).querySelectorAll('.kplex-thought[data-kplex-path]')];
 const focus=h=>cards(h).filter(card=>card.dataset.kplexPath===center(h));
 const action=async(id,args)=>{const surface=[...p.actionSurfaceHosts].find(([,registration])=>registration.leaf===host)?.[0];check(surface,'Owning action surface absent');const result=await p.actionManager.dispatch({id,args,source:'internal',surfaceId:surface});check(result.status==='completed',id+': '+JSON.stringify(result));return result};
 const settle=async()=>{await wait(180);check(!root(host).querySelector('.kplex-view-error'),'Facets fallback/error after admitted presentation');check(focus(host).length===1,'Active note must appear exactly once')};
 const geometry=h=>{
  let count=0;
  for(const hit of root(h).querySelectorAll('.kplex-edge-hit')){
   const group=hit.closest('.kplex-edge');if(!group)continue;
   const key=JSON.parse(hit.dataset.kplexEdgeId),source=key[0]==='cross'?JSON.parse(key[1])[1]:center(h),target=key[0]==='cross'?JSON.parse(key[2])[1]:key[2];
   const a=cards(h).find(card=>card.dataset.kplexPath===source),b=cards(h).find(card=>card.dataset.kplexPath===target);check(a&&b,'Visible semantic endpoint absent');
   const d=hit.getAttribute('d');check(!d.includes('C'),'Center connectors must be straight');const points=d.match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/gi).map(Number);
   const point=card=>{const r=card.getBoundingClientRect();return new DOMPoint(r.x+r.width/2,r.y+r.height/2).matrixTransform(hit.getScreenCTM().inverse())};
   const start=point(a),end=point(b),length=Math.hypot(end.x-start.x,end.y-start.y);
   for(const [px,py]of [[points[0],points[1]],[points[2],points[3]]])check(Math.abs((px-start.x)*(end.y-start.y)-(py-start.y)*(end.x-start.x))/length<.1,'Native SVG attachment left the note-center line');
   check(group.querySelector('.kplex-edge-visible')?.getAttribute('d')===d,'Native hit and visible routes diverged');count++;
  }
  check(count>0,'Native semantic connectors absent');return count;
 };
 p.settings.allowAutozoom=false;p.index.notifyPresentation();await settle();
 const originalCanonical=JSON.stringify(p.index.neighbours(p.index.get(path('Memory')),'child').map(row=>[row.page.path,row.role,row.relationType,row.typeDefinition,row.linkDirection]));
 const camera=root(host).querySelector('.kplex-camera').style.transform;
 await until(()=>!p.index.hasActiveSemanticPreparation(),'Fixture semantic work did not settle');await wait(750);
 const four=base.order.filter(id=>id!=='fire'),quadrants={...base,order:four,categories:Object.fromEntries(four.map(id=>[id,base.categories[id]])),layout:'quadrants'};
 const stop=quiet();
 for(const layout of ['circular','concentric','vertical','horizontal','quadrants'])for(const focusInCategory of [false,true])for(const centerAnchoredLinks of [false,true]){
  await configure({... (layout==='quadrants'?quadrants:base),layout,focusInCategory,centerAnchoredLinks});await settle();
  const active=focus(host)[0],neighbor=cards(host).find(card=>card!==active);
  check(!!active.closest('.kplex-zone-scroll')===focusInCategory,'Native focus placement differs from preset');
  check(active.getBoundingClientRect().height>neighbor.getBoundingClientRect().height,'Active card must retain measured emphasis');
  check(root(host).querySelectorAll('[data-kplex-gate]').length===(centerAnchoredLinks?0:cards(host).length*4),'Gate visibility differs from native preset');
  if(centerAnchoredLinks)geometry(host);
  check(root(host).querySelector('.kplex-camera').style.transform===camera,'Presentation edit changed manual camera intent');
 }
 stop('native-20-presentation-combinations-zero-source-work');
 check(JSON.stringify(p.index.neighbours(p.index.get(path('Memory')),'child').map(row=>[row.page.path,row.role,row.relationType,row.typeDefinition,row.linkDirection]))===originalCanonical,'Presentation edited canonical incidence/evidence');
 cases.push({id:'native-five-layouts-four-option-combinations',combinations:20,canonicalUnchanged:true,cameraUnchanged:true});c.progress={phase:'native-contained-editor',cases};
 await configure({...base,focusInCategory:true,centerAnchoredLinks:true});await settle();await action('view.fit');
 host.view.centerPresentation.update({embedCentralNode:true,centralNodeMarkdownMode:'source'});
 await until(()=>root(host).querySelector('.kplex-central-editor-content .cm-content'),'Contained native editor absent');
 const element=root(host).querySelector('.kplex-central-editor-content'),content=element.querySelector('.cm-content');content.focus();
 await until(()=>workspace.activeLeaf?.view.editor&&element.contains(workspace.activeLeaf.view.containerEl),'Contained native Markdown leaf did not acquire focus');
 const leaf=workspace.activeLeaf,editor=leaf.view.editor;await until(()=>editor.getValue().includes('Disposable Wu Xing native fixture.')&&!element.querySelector('.kplex-central-editor-status'),'Native source document not loaded');
 editor.replaceRange('\nKplex-272-dirty-native-buffer\n',editor.getCursor('to'));editor.setCursor({line:3,ch:2});const value=editor.getValue(),cursor=JSON.stringify(editor.getCursor());
 const identity=()=>check(root(host).querySelector('.kplex-central-editor-content')===element&&leaf.view.editor===editor&&editor.getValue()===value&&JSON.stringify(editor.getCursor())===cursor&&leaf.view.file.path===path('Memory'),'Presentation replaced/retargeted dirty native text or caret');
 for(const focusInCategory of [false,true]){await configure({...base,focusInCategory,centerAnchoredLinks:true});await settle();identity();
  const card=focus(host)[0].getBoundingClientRect(),overlay=root(host).querySelector('.kplex-central-editor-overlay').getBoundingClientRect();check(['x','y','width','height'].every(key=>Math.abs(card[key]-overlay[key])<1),'Editor overlay detached from measured focus');}
 const initialBounds=x.native.getBounds();x.native.setBounds({...initialBounds,width:initialBounds.width-100,height:initialBounds.height-60});await wait(250);identity();x.native.setBounds(initialBounds);await wait(250);identity();
 const water=structuredClone(base.categories.water);await configure({...base,focusInCategory:true,centerAnchoredLinks:true,categories:{...base.categories,water:{...water,values:['unmapped-water']}}});await settle();identity();check(!focus(host)[0].closest('.kplex-zone-scroll'),'Unassigned focus failed usable central fallback');
 await configure({...base,focusInCategory:true,centerAnchoredLinks:true});await settle();identity();
 await p.openSidecar(host,p.index.get(path('Memory')));const side=p.sidecarLeaves.get(host);await until(()=>side?.view.file?.path===path('Memory'),'Sidecar canonical note not opened');identity();await p.closeSidecar(host);await action('view.center-editor.toggle');
 await until(()=>!root(host).querySelector('.kplex-central-editor-content'),'Native editor did not collapse durably');check((await app.vault.read(app.vault.getFileByPath(path('Memory')))).includes('Kplex-272-dirty-native-buffer'),'Native dirty text not saved');
 cases.push({id:'contained-native-editor-dirty-toggle-fallback-overlay-sidecar-save',nativeEditorRetained:true});c.progress={phase:'independent-native-canvases-popout',cases};
 await reveal(host);const neighboring=cards(host).find(card=>card.dataset.kplexPath===path('Concept'));check(neighboring?.querySelector('.kplex-thought-corner-action'),'Neighbor native edit action absent with gates hidden');neighboring.querySelector('.kplex-thought-corner-action').click();
 await until(()=>root(host).querySelector('.kplex-central-editor-content .cm-content'),'Neighbor native editor did not open');const neighborElement=root(host).querySelector('.kplex-central-editor-content');neighborElement.querySelector('.cm-content').focus();
 await until(()=>workspace.activeLeaf?.view.file?.path===path('Concept')&&workspace.activeLeaf.view.editor&&neighborElement.contains(workspace.activeLeaf.view.containerEl),'Neighbor native leaf did not acquire focus');
 const neighborLeaf=workspace.activeLeaf,neighborEditor=neighborLeaf.view.editor;await until(()=>neighborEditor.getValue().includes('Disposable Wu Xing native fixture.')&&!neighborElement.querySelector('.kplex-central-editor-status'),'Neighbor source document not loaded');
 neighborEditor.replaceRange('\nKplex-272-dirty-neighbor\n',neighborEditor.getCursor('to'));const neighborValue=neighborEditor.getValue(),neighborCursor=JSON.stringify(neighborEditor.getCursor()),binding=session.editors.bindings[0];check(binding&&center(host)===path('Memory'),'Neighbor editing changed logical attention');
 const scroll=neighboring.closest('.kplex-zone-scroll');check(scroll&&scroll.scrollHeight>scroll.clientHeight,'Measured neighbor editor must exercise native overflow');let clipped=0;
 for(const top of [0,scroll.scrollHeight]){
  scroll.scrollTop=top;scroll.dispatchEvent(new scroll.ownerDocument.defaultView.Event('scroll'));await wait(100);
  const overlay=root(host).querySelector('.kplex-central-editor-overlay'),card=cards(host).find(card=>card.dataset.kplexPath===path('Concept')).getBoundingClientRect(),rect=overlay.getBoundingClientRect(),aperture=scroll.getBoundingClientRect();
  check(['x','y','width','height'].every(key=>Math.abs(card[key]-rect[key])<1),'Neighbor native overlay detached from scrolled card');
  if(rect.top<aperture.top-1||rect.bottom>aperture.bottom+1){const nativeDocument=overlay.querySelector('.kplex-central-editor-document');check(overlay.style.getPropertyValue('--kplex-editor-body-clip').startsWith('rect(')&&nativeDocument&&nativeDocument.ownerDocument.defaultView.getComputedStyle(nativeDocument).clip!=='auto','Partly hidden native editor lacks its actual legacy aperture clip');clipped++;}
 }
 check(clipped>0,'Native fixture did not exercise a partially clipped editor');
 check(root(host).querySelector('.kplex-central-editor-content')===neighborElement&&neighborLeaf.view.editor===neighborEditor&&neighborEditor.getValue()===neighborValue&&JSON.stringify(neighborEditor.getCursor())===neighborCursor,'Scroll replaced dirty neighbor document or caret');
 await action('editor.collapse',{bindingId:binding.id});await until(()=>!root(host).querySelector('.kplex-central-editor-content'),'Neighbor editor did not close');check((await app.vault.read(app.vault.getFileByPath(path('Concept')))).includes('Kplex-272-dirty-neighbor'),'Neighbor native edits not saved');cases.push({id:'gate-free-neighbor-native-editor-dirty-scroll-clip-and-save',attentionRetained:true});
 await reveal(host);const current=focus(host)[0],currentBox=current.getBoundingClientRect(),doc=current.ownerDocument;let ownedComposer,ownedDialog;
 const cancelComposer=()=>ownedDialog?.close();x.restores.push(cancelComposer);
 current.dispatchEvent(new doc.defaultView.MouseEvent('contextmenu',{bubbles:true,clientX:currentBox.x+currentBox.width/2,clientY:currentBox.y+currentBox.height/2}));
 await until(()=>[...doc.querySelectorAll('.menu-item')].some(item=>item.querySelector('.menu-item-title')?.textContent===p.translator('graph.addNote')),'Gate-free native node menu Add note action absent');
 [...doc.querySelectorAll('.menu-item')].find(item=>item.querySelector('.menu-item-title')?.textContent===p.translator('graph.addNote')).click();await until(()=>doc.querySelector('.kplex-add-related-modal .kplex-add-related-note-search input'),'Gate-free relationship composer did not open');
 ownedComposer=doc.querySelector('.kplex-add-related-modal');ownedDialog=[...p.actionDialogs.keys()].find(dialog=>dialog.modalEl===ownedComposer);check(ownedDialog,'Menu composer lacks native action-dialog ownership');cancelComposer();await until(()=>!ownedComposer.isConnected,'Canceled relationship composer did not close');cases.push({id:'gate-free-node-menu-opens-existing-relationship-composer-without-write'});
 await reveal(host);const other=workspace.createLeafBySplit(host,'vertical',false);hosts.push(other);await other.setViewState({type:'k-plex-react-view',active:true});await other.view.waitUntilReady();await p.setDocumentSyncMode(other,'off');p.notifyNavigation(path('Memory'),other);await choose(other,'wuxing');panel(other).querySelector('.kplex-filter-panel-header button').click();
 const otherPreset={...base,name:'Independent presentation'};await p.updateCanvasViewConfiguration('wuxing',{field:'presets',path:['presentation-other']},{kind:'set',value:otherPreset});
 check(other.view.documentSession.plexView.updateState({version:1,preset:'presentation-other'}),'Independent native preset state rejected');
 await until(()=>root(other).querySelector('[data-kplex-gate]')&&focus(other).length===1,'Independent preset scene absent');
 check(other.view.documentSession.plexView.updateState({version:1,preset:'wuxing'}),'Shared preset selection rejected');await until(()=>!root(other)?.querySelector('[data-kplex-gate]')&&focus(other)[0]?.closest('.kplex-zone-scroll'),'Same preset did not share accepted options');
 await configure({...base,focusInCategory:false,centerAnchoredLinks:false});await until(()=>root(other)?.querySelector('[data-kplex-gate]')&&root(host)?.querySelector('[data-kplex-gate]'),'Shared preset live update did not reach both visible canvases');
 await configure({...base,focusInCategory:true,centerAnchoredLinks:true});await settle();cases.push({id:'same-preset-native-canvases-share-live-presentation'});
 check(other.view.documentSession.plexView.updateState({version:1,preset:'presentation-other'}),'Independent preset restoration rejected');await until(()=>root(other)?.querySelector('[data-kplex-gate]'),'Independent preset gates did not return');
 const mainParent=host.parent,mainIndex=mainParent.children.indexOf(host)+1,otherSession=other.view.documentSession;
 workspace.moveLeafToPopout(other);await until(()=>other.view.containerEl.ownerDocument!==document&&root(other)?.querySelector('[data-kplex-gate]'),'Native independent popout did not render');await other.view.waitUntilReady();await reveal(other);
 check(other.view.documentSession===otherSession&&focus(other).length===1&&!focus(other)[0].closest('.kplex-zone-scroll'),'Popout lost independent preset or focus');
 check(!root(host).querySelector('[data-kplex-gate]')&&focus(host)[0].closest('.kplex-zone-scroll'),'Main canvas inherited other preset');
 await configure({...base,layout:'horizontal',focusInCategory:true,centerAnchoredLinks:true});await wait(180);check(root(other).querySelector('[data-kplex-gate]'),'Live shared configuration leaked across different preset IDs');
 other.parent.removeChild(other);mainParent.insertChild(Math.min(mainIndex,mainParent.children.length),other);await workspace.revealLeaf(other);await other.view.waitUntilReady();await until(()=>other.view.containerEl.ownerDocument===document&&root(other)?.querySelector('[data-kplex-gate]'),'Native popout return did not restore independent state');
 cases.push({id:'independent-main-popout-presets-live-update-and-return',sessionRetained:true});
 await reveal(host);p.notifyNavigation(path('Concept'),host);await until(()=>center(host)===path('Concept')&&focus(host).length===1,'Native navigation did not change attention');check(focus(host)[0].closest('.kplex-zone-scroll'),'New assigned attention not contained');
 p.notifyNavigation(path('Unmapped'),host);await until(()=>center(host)===path('Unmapped')&&focus(host).length===1,'Fallback navigation absent');check(!focus(host)[0].closest('.kplex-zone-scroll'),'Unassigned navigation failed central fallback');
 cases.push({id:'native-navigation-assigned-and-unassigned-fallback'});c.progress={phase:'complete',cases};
}
