/** Native mobile-emulation layout acceptance shared by the isolated phone runner. This lane
 * exercises actual drawer portals and canceled native dialogs; it cannot establish physical touch. */
export async function mobileSidebarCases(app,c,f,file) {
 const cases=[],native=require('@electron/remote').getCurrentWindow();
 const light=document.body.classList.contains('theme-light'),dark=document.body.classList.contains('theme-dark');
 f.restores.push(()=>{document.body.classList.toggle('theme-light',light);document.body.classList.toggle('theme-dark',dark);});
 await f.p.activateView();const leaf=app.workspace.getLeavesOfType('k-plex-sidepanel-view')[0];
 f.check(leaf,'Registered mobile sidebar');f.leaves.push(leaf);await leaf.view.waitUntilReady();
 f.p.notifyNavigation(file.path,leaf);
 /** All painted controls must fit their own panel, independently of the application's width. */
 const inside=(element,outer,label)=>{const a=element.getBoundingClientRect(),b=outer.getBoundingClientRect();f.check(a.left>=b.left-1&&a.right<=b.right+1,label+': '+JSON.stringify({element:a.toJSON(),outer:b.toJSON()}));};
 try{
  for(const [width,height]of [[390,844],[480,844],[600,844],[844,600],[1024,768],[1280,800]]){
   c.progress={phase:'mobile-sidebar-'+width};native.setContentSize(width,height);await f.until(()=>Math.abs(innerWidth-width)<2,'Mobile viewport '+width);
   await app.workspace.revealLeaf(leaf);await f.wait(150);
   const root=leaf.view.contentEl.querySelector('.kplex-app');f.check(root?.hasAttribute('data-floating-layer-boundary'),'Mobile anchor boundary');
   const trigger=root.querySelector('.kplex-filter-trigger');f.check(trigger,'Views and lenses trigger');
   await f.until(()=>{try{f.point(trigger);return true}catch{return false}},'Native sidebar animation exposes trigger at '+width,5000);await f.click(trigger);
   await f.until(()=>root.querySelector('.kplex-filter-panel'),'Views and lenses opens inside its own mobile root');
   const panel=root.querySelector('.kplex-filter-panel');inside(panel,root,'Drawer panel exceeds sidebar');
   f.check(panel.parentElement===root,'Floating layer must portal within the drawer boundary');
   for(const control of panel.querySelectorAll('input,select,button'))if(control.getBoundingClientRect().width)inside(control,panel,'Filter control exceeds panel');
   // Bounding boxes cannot detect canvas tools painting over a correctly sized disclosure.
   // Sample every underlying button whose center is covered by this panel, using native hit testing.
   const panelRect=panel.getBoundingClientRect();let coveredControls=0;
   for(const control of root.querySelectorAll('button'))if(!panel.contains(control)){
    const r=control.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2;
    if(r.width&&r.height&&x>panelRect.left&&x<panelRect.right&&y>panelRect.top&&y<panelRect.bottom){
     coveredControls++;f.check(panel.contains(panel.ownerDocument.elementFromPoint(x,y)),'Canvas tool painted above Views and lenses: '+control.className);
    }
   }
   f.check(coveredControls>0,'Mobile fixture must cover actual canvas tools to validate layering');
   if(c.captureRoot&&[600,1024].includes(width))for(const theme of ['theme-light','theme-dark']){
    document.body.classList.toggle('theme-light',theme==='theme-light');document.body.classList.toggle('theme-dark',theme==='theme-dark');await f.wait(100);
    require('node:fs').writeFileSync(c.captureRoot+'/mobile-sidebar-'+width+'-'+theme+'.png',(await native.webContents.capturePage()).toPNG());
   }
   panel.scrollTop=panel.scrollHeight;await f.wait(60);f.check(panel.scrollHeight<=panel.clientHeight+panel.scrollTop+2,'Panel bottom remains scroll-reachable');
   const device=document.body.classList.contains('is-tablet')?'tablet':document.body.classList.contains('is-phone')?'phone':'unknown';
   if(width>=1024)f.check(device==='tablet','Wide matrix must exercise native tablet mode: '+document.body.className);
   const size={viewport:width,device,host:Math.round(root.getBoundingClientRect().width),panel:Math.round(panel.getBoundingClientRect().width)};
   await f.key(panel.ownerDocument,'Escape');await f.until(()=>!root.querySelector('.kplex-filter-panel'),'Escape dismisses the bounded panel');
   const trailTrigger=root.querySelector('.kplex-footprints-trigger');await f.click(trailTrigger);
   await f.until(()=>root.querySelector('.kplex-footprints-panel'),'Footprints shares the mobile portal boundary');
   const trail=root.querySelector('.kplex-footprints-panel');inside(trail,root,'Footprints exceeds sidebar');
   for(const control of trail.querySelectorAll('button'))if(control.getBoundingClientRect().width)inside(control,trail,'Footprints action exceeds panel');
   await f.key(trail.ownerDocument,'Escape');await f.until(()=>!root.querySelector('.kplex-footprints-panel'),'Escape dismisses bounded Footprints');
   // The same native modal/field owners used by new links retain long text, dropdown and action reachability.
   const origin=f.p.index.get(file.path),modal=f.p.openRelationModal({mode:'create',origin,semanticRole:'left',hostLeaf:leaf});
   await f.until(()=>modal.contentEl.querySelector('input'),'Native creation form');
   for(const control of modal.contentEl.querySelectorAll('input,select,button'))if(control.getBoundingClientRect().width)inside(control,modal.modalEl,'Creation control exceeds native modal');
   modal.close();await f.until(()=>!modal.modalEl.isConnected,'Cancel removes native modal',5000);
   cases.push({...size,status:'passed',controlsBounded:true,coveredControls,bottomReachable:true,footprintsBounded:true,nativeFormCancelled:true});
  }
  return cases;
 }catch(error){
  if(c.captureRoot)require('node:fs').writeFileSync(c.captureRoot+'/mobile-sidebar-failure.png',(await native.webContents.capturePage()).toPNG());
  throw Error((error?.stack??String(error))+'; sidebar layout: '+JSON.stringify({viewport:[innerWidth,innerHeight],cases,root:leaf.view.contentEl.querySelector('.kplex-app')?.getBoundingClientRect().toJSON(),trigger:leaf.view.contentEl.querySelector('.kplex-filter-trigger')?.getBoundingClientRect().toJSON()}));
 }finally{leaf.detach();}
}
