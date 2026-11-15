/** Native phone navbar acceptance shared by the isolated phone runner. Uses the registered view
 * and real display controls; owns only reversible modes and selection of existing fixture leaves. */
export async function mobileNavigationCases(app,c,f,tab,anchor) {
 const workspace=app.workspace,modes=tab.view.displayModes;
 const navbar=document.querySelector('body > .app-container > .mobile-navbar');
 f.check(navbar,'Native phone navigation bar required');
 const root=()=>tab.view.contentEl.querySelector('.kplex-app');
 const hidden=()=>getComputedStyle(navbar).display==='none';
 /** The entire application, including History, must stop above the real native bar. */
 const docked=()=>getComputedStyle(navbar).position==='relative'&&!hidden()
   &&root().getBoundingClientRect().bottom<=navbar.getBoundingClientRect().top+1;
 /** Use real native controls so action activation and controller geometry are exercised together. */
 const click=async mode=>{const control=root().querySelector('[data-kplex-display-control="'+mode+'"]');f.check(control,'Mobile '+mode+' control');await f.click(control);};
 /** Refresh the foreground compositor before retaining a real native mode screenshot. */
 const capture=async mode=>{if(!c.captureRoot)return;const native=f.owner(document);native.webContents.invalidate();await f.wait(100);require('node:fs').writeFileSync(c.captureRoot+'/mobile-navigation-'+innerWidth+'-'+mode+'.png',(await native.webContents.capturePage()).toPNG());};
 try {
  workspace.leftSplit.collapse();workspace.rightSplit.collapse();
  // A generic sidebar invocation precedes this case. Mobile's drawer backdrop owns its own
  // dismissal input even after a main leaf is revealed; finish that native gesture explicitly.
  const control=root().querySelector('[data-kplex-display-control="zen"]'),box=control.getBoundingClientRect();
  const point={x:Math.round(box.left+box.width/2),y:Math.round(box.top+box.height/2)},hit=document.elementFromPoint(point.x,point.y);
  if(hit?.classList.contains('workspace-drawer-backdrop')){
   const native=await f.focus(document);native.webContents.sendInputEvent({type:'mouseMove',...point});native.webContents.sendInputEvent({type:'mouseDown',...point,button:'left',clickCount:1});native.webContents.sendInputEvent({type:'mouseUp',...point,button:'left',clickCount:1});
  }
  await f.until(()=>{try{f.point(root().querySelector('[data-kplex-display-control="zen"]'));return true}catch{return false}},'Native drawers finish closing above the main tab');
  await f.until(docked,'Normal phone tab reserves navigation space');
  const normalGeometry={root:root().getBoundingClientRect().toJSON(),navbar:navbar.getBoundingClientRect().toJSON()};await capture('normal');
  const normal=root().getBoundingClientRect().height;
  await click('zen');await f.until(hidden,'Zen hides mobile navigation');
  await capture('zen');
  f.check(root().getBoundingClientRect().height>normal,'Zen recovers native navigation space');
  await click('fullscreen');await f.until(()=>modes.getSnapshot().fullscreen&&hidden(),'Combined full screen/Zen hides navigation');
  await click('zen');await f.until(()=>!modes.getSnapshot().zen&&hidden(),'Full screen alone hides navigation');
  await capture('fullscreen');
  await click('fullscreen');await f.until(docked,'Leaving full screen restores normal docking');
  await click('zen');await workspace.revealLeaf(anchor);workspace.setActiveLeaf(anchor,{focus:true});
  await f.until(()=>!navbar.classList.contains('kplex-mobile-navbar-hidden')&&!navbar.classList.contains('kplex-mobile-navbar-docked'),'Another tab restores native navbar behavior');
  await workspace.revealLeaf(tab);workspace.setActiveLeaf(tab,{focus:true});
  await f.until(hidden,'Returning to the dormant Zen tab restores its own chrome');
  await click('zen');await f.until(docked,'Final normal mobile geometry');
  return {width:innerWidth,height:innerHeight,normalGeometry,cases:['normal-docking','zen','fullscreen-and-zen','fullscreen','native-tab-restoration','return-to-zen']};
 } catch(error){
  if(c.captureRoot){require('node:fs').writeFileSync(c.captureRoot+'/mobile-navigation-failure.png',(await require('@electron/remote').getCurrentWindow().webContents.capturePage()).toPNG());require('node:fs').writeFileSync(c.captureRoot+'/mobile-navigation-failure.json',JSON.stringify({error:String(error),body:document.body.className,left:workspace.leftSplit.collapsed,right:workspace.rightSplit.collapsed,active:workspace.activeLeaf?.view.getViewType(),modes:modes.getSnapshot(),root:root().getBoundingClientRect().toJSON(),navbar:navbar.getBoundingClientRect().toJSON(),controls:[...root().querySelectorAll('[data-kplex-display-control]')].map(el=>({mode:el.dataset.kplexDisplayControl,rect:el.getBoundingClientRect().toJSON(),hit:(()=>{const r=el.getBoundingClientRect();return document.elementFromPoint(r.left+r.width/2,r.top+r.height/2)?.className})()}))},null,2));}
  throw error;
 } finally {modes.setZen(false);modes.exitFullscreen(false);}
}
