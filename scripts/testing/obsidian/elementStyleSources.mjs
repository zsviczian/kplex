/** Exact-artifact native appearance navigation. Uses real menus, native settings and existing
 * editors in main/popout documents; the shared fixture owns all notes and restoration. */
export async function elementStyleSources(app,c) {
 const f=c.fixture(app,c),cases=[];
 try {
  await f.initialize();const p=f.p,t=p.translator;
  app.workspace.leftSplit.collapse();app.workspace.rightSplit.collapse();
  await p.updateOntologyField('children',['Related310'],[...p.settings.hierarchy.children],()=>true);
  const b=await f.note('Styled target','---\n'+JSON.stringify(p.settings.noteTypeField)+': Appearance310\n---\n'),a=await f.note('Source','---\nRelated310: "[['+b.path+']]"\n---\n');
  p.settings.tagStyleList=[...p.settings.tagStyleList,'#Appearance310'];
  p.settings.tagNodeStyles={...p.settings.tagNodeStyles,'#Appearance310':{backgroundColor:'#e7c0ff',fontSize:23}};
  p.settings.hierarchyLinkStyles={...p.settings.hierarchyLinkStyles,related310:{strokeColor:'#e10000',strokeWidth:3}};
  p.settings.graphLenses=[...p.settings.graphLenses,
   {id:'appearance310-node',name:'Node highlight 310',enabled:true,scope:'node',mode:'style',expression:'file.extension == "md"',style:{node:{strokeWidth:4}}},
   {id:'appearance310-edge',name:'Connection highlight 310',enabled:true,scope:'edge',mode:'style',expression:'edge.role == "child"',style:{edge:{strokeColor:'#0000ee'}}}];
  await p.saveSettings(false,true);
  let shown;const show=p.showKplexMenuAtPosition;
  p.showKplexMenuAtPosition=function(menu,...args){shown=menu;menu.setUseNativeMenu(false);return show.call(this,menu,...args)};
  f.restores.push(()=>{p.dismissKplexMenu();p.showKplexMenuAtPosition=show;});
  const light=document.body.classList.contains('theme-light'),dark=document.body.classList.contains('theme-dark');
  f.restores.push(()=>{document.body.classList.toggle('theme-light',light);document.body.classList.toggle('theme-dark',dark);});
  /** Retain authentic native menu/editor pixels for visual QA, separately from interaction assertions. */
  const capture=async(doc,name)=>{if(!c.captureRoot)return;const owner=f.owner(doc);owner.webContents.invalidate();await f.wait(100);require('node:fs').writeFileSync(c.captureRoot+'/'+c.appearanceCapturePrefix+'-'+name+'.png',(await owner.webContents.capturePage()).toPNG());};
  /** Open the actual element menu, then hover its native submenu and select with trusted input. */
  const select=async(element,title)=>{
   const doc=element.ownerDocument,native=await f.focus(doc);let xy;
   if(element.tagName.toLowerCase()==='path'){
    const position=element.getPointAtLength(element.getTotalLength()/2),point=position.matrixTransform(element.getScreenCTM());xy={x:Math.round(point.x),y:Math.round(point.y)};
    f.check(element.contains(doc.elementFromPoint(xy.x,xy.y)),'Visible connector stroke target');
   }else xy=f.point(element);
   shown=undefined;
   native.webContents.sendInputEvent({type:'mouseMove',...xy});native.webContents.sendInputEvent({type:'mouseDown',...xy,button:'right',clickCount:1});native.webContents.sendInputEvent({type:'mouseUp',...xy,button:'right',clickCount:1});
   await f.until(()=>shown,'Actual element context menu');
   const parent=shown.items.find(item=>item.titleEl?.textContent===t('styleSources.menu'));
   f.check(parent?.submenu,'Native appearance submenu');
   const titles=parent.submenu.items.map(item=>item.titleEl?.textContent).filter(Boolean);f.check(titles.includes(title),'Source missing: '+JSON.stringify({title,titles}));
   const position=f.point(parent.titleEl.closest('.menu-item'));native.webContents.sendInputEvent({type:'mouseMove',...position});
   const row=parent.submenu.items.find(item=>item.titleEl?.textContent===title),elementRow=row.titleEl.closest('.menu-item');
   await f.until(()=>elementRow.isConnected&&elementRow.getBoundingClientRect().width>0,'Native appearance submenu visible');
   if(title===t('styleSources.noteType',{name:'#Appearance310'}))await capture(doc,'node-menu');
   if(title===t('styleSources.ontology',{name:'related310'}))await capture(doc,'connection-menu');
   await f.click(elementRow);return titles;
  };
  /** Suggesters consume Escape before their parent dialog; Cancel deliberately tests the form owner. */
  const cancel=async container=>{
   const button=[...container.querySelectorAll('button')].find(element=>element.textContent.trim()===t('common.cancel')||element.getAttribute('aria-label')===t('common.cancel'));
   f.check(button,'Existing Cancel action');button.scrollIntoView({block:'nearest'});await f.click(button);
  };
  for(const [destination,width,theme]of [['tab',1450,'theme-light'],['tab',480,'theme-dark'],['window',1000,'theme-dark'],['window',480,'theme-light']]) {
   c.progress={phase:'appearance-'+destination+'-'+width,cases};
   c.appearanceCapturePrefix=destination+'-'+width+'-'+theme;
   const leaf=await f.canvas(a,'k-plex-react-view',destination),doc=leaf.view.contentEl.ownerDocument,native=await f.focus(doc);
   doc.body.classList.toggle('theme-light',theme==='theme-light');doc.body.classList.toggle('theme-dark',theme==='theme-dark');native.setMinimumSize(200,200);native.setContentSize(width,900);await f.ready();
   const root=()=>leaf.view.contentEl.querySelector('.kplex-app'),node=()=>root().querySelector('[data-kplex-path="'+b.path+'"]');
   await f.until(()=>node()&&root().querySelector('.kplex-edge-hit'),'Styled node and connector rendered');
   const fit=root().querySelector('[aria-label="'+t('graph.fitGraph')+'"]');await f.click(fit);
   await f.until(()=>{try{f.point(node());return true}catch{return false}},'Fit exposes the styled node after native resize');
   const saved=JSON.stringify(p.settings),writes=p.settingsWriteQueue;
   const nodeTitles=await select(node(),t('styleSources.noteType',{name:'#Appearance310'}));
   await f.until(()=>doc.querySelector('.modal-container .modal'),'Exact node style editor');
   f.check(doc.querySelector('.kplex-style-editor input[type="text"]')?.value==='#Appearance310','Node source opened another editor');
   await capture(doc,'type-editor');
   await cancel(doc.querySelector('.modal-container .modal'));await f.until(()=>!doc.querySelector('.modal-container .modal'),'Cancel node style');
   await select(node(),t('styleSources.lens',{name:'Node highlight 310'}));
   await f.until(()=>doc.querySelector('.kplex-lens-editor input')?.value==='Node highlight 310','Exact node styling lens');
   f.check(doc.querySelector('.kplex-lens-style-editor')?.contains(doc.activeElement),'Requested lens style control is focused');
   await capture(doc,'lens-editor');
   await cancel(doc.querySelector('.kplex-lens-editor'));await f.key(doc,'Escape');await f.until(()=>!doc.querySelector('.kplex-filter-panel'),'Cancel lens draft');
   await select(root().querySelector('.kplex-edge-hit'),t('styleSources.ontology',{name:'related310'}));
   await f.until(()=>doc.querySelector('.modal-container .modal'),'Exact ontology style editor');
   f.check(doc.querySelector('.modal-title')?.textContent.toLowerCase().includes('related310'),'Connection source opened another editor');
   await cancel(doc.querySelector('.modal-container .modal'));await f.until(()=>!doc.querySelector('.modal-container .modal'),'Cancel relationship style');
   const edgeTitles=await select(root().querySelector('.kplex-edge-hit'),t('styleSources.lens',{name:'Connection highlight 310'}));
   await f.until(()=>doc.querySelector('.kplex-lens-editor input')?.value==='Connection highlight 310','Exact connection styling lens');
   await cancel(doc.querySelector('.kplex-lens-editor'));await f.key(doc,'Escape');await f.until(()=>!doc.querySelector('.kplex-filter-panel'),'Cancel connection lens draft');
   await select(node(),t('colors.standard.baseNodeStyle'));
   let previousPageGeometry,stablePageGeometry=0;
   await f.until(()=>{
    const page=app.setting.getCurrentPageEl();if(!app.setting.isOpen||!page)return false;
    const label=[...page.querySelectorAll('.setting-item-heading .setting-item-name')].find(label=>label.textContent===t('colors.standard.baseNodeStyle'));
    const r=page.getBoundingClientRect(),values=[r.left,r.top,r.width,r.height];
    const same=previousPageGeometry&&values.every((value,index)=>Math.abs(value-previousPageGeometry[index])<.01);
    stablePageGeometry=same?stablePageGeometry+1:0;previousPageGeometry=values;
    return stablePageGeometry>=3&&r.width>128&&label?.getClientRects().length>0;
   },'Exact native Base node colors page finishes its slide transition',5000);
   await capture(app.setting.getCurrentPageEl().ownerDocument,'standard-settings');
   app.setting.close();await f.until(()=>!app.setting.isOpen,'Native settings closed');await app.workspace.revealLeaf(leaf);
   f.check(JSON.stringify(p.settings)===saved&&p.settingsWriteQueue===writes,'Navigation or Cancel changed settings');
   cases.push({destination,width,theme,nodeTitles,edgeTitles,nativeSourceEditors:true,exactStandardPage:true,cancelRetainedSettings:true});
   leaf.detach();await f.wait(100);
  }
  return {cases};
 }catch(error){
  const docs=new Set([document,...f.leaves.map(leaf=>leaf.view.contentEl.ownerDocument)]);
  const native=[...docs].map(doc=>({title:doc.title,settings:[...doc.querySelectorAll('.modal.mod-settings')].map(element=>element.textContent.slice(-5000))}));
  native.push({settingsPage:app.setting.getCurrentPageEl()?.textContent.slice(-5000),open:app.setting.isOpen});
  throw Error(String(error)+'; appearance cases: '+JSON.stringify(cases)+'; native settings: '+JSON.stringify(native));
 }
 finally{await f.cleanup();}
}
