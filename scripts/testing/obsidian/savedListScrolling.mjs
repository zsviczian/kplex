/** Actual desktop input acceptance for saved-list scroll/export arbitration. The shared Small
 * fixture owns notes, settings, views and restoration; the caller owns the shared native lock. */
export async function savedListScrolling(app,c) {
 const f=c.fixture(app,c),cases=[];
 try {
  await f.initialize();const p=f.p,files=[];
  for(let i=0;i<12;i++)files.push(await f.note('Scrollable saved note '+i,'Owned scroll fixture.'));
  p.settings.navigationHistory=files.map(file=>file.path);p.settings.pinnedNodes=files.map(file=>file.path);await p.saveSettings(false,false);
  const leaf=await f.canvas(files[0]),native=await f.focus(document),root=leaf.view.contentEl.querySelector('.kplex-app');await f.wait(200);
  const dragManager=app.dragManager,dragLink=dragManager.dragLink;let exports=0;
  /** Observe actual exports while retaining the native manager's complete implementation. */
  dragManager.dragLink=function(...args){exports++;return dragLink.apply(this,args);};f.restores.push(()=>{dragManager.dragLink=dragLink;});
  const history=JSON.stringify(p.settings.navigationHistory),pins=JSON.stringify(p.settings.pinnedNodes);
  for(const selector of ['.kplex-pinned-bar','.kplex-history-list'])for(const button of ['left','middle']) {
   const list=root.querySelector(selector);f.check(list,'Mounted '+selector);const style=list.getAttribute('style'),left=list.scrollLeft;
   f.restores.push(()=>{if(style===null)list.removeAttribute('style');else list.setAttribute('style',style);list.scrollLeft=left;});
   list.style.maxWidth='400px';list.scrollLeft=0;await f.wait(60);
   const bounds=list.getBoundingClientRect(),chip=[...list.querySelectorAll(selector.includes('pinned')?'.kplex-pinned-open':'button')].find(el=>{const r=el.getBoundingClientRect();return r.left>=bounds.left&&r.right<=bounds.right});
   const point=f.point(chip),before=exports;
   native.webContents.sendInputEvent({type:'mouseMove',...point});native.webContents.sendInputEvent({type:'mouseDown',...point,button,clickCount:1});
   try {for(const delta of [2,4,6,10,30,60]){native.webContents.sendInputEvent({type:'mouseMove',x:point.x-delta,y:point.y+1,modifiers:[button==='middle'?'middlebuttondown':'leftbuttondown']});await f.wait(25);}}
   finally{native.webContents.sendInputEvent({type:'mouseUp',x:point.x-60,y:point.y+1,button,clickCount:1})}
   await f.wait(80);f.check(list.scrollLeft>=50,'Native '+button+' drag did not scroll '+selector);f.check(exports===before,'Horizontal '+button+' drag exported a note');
   f.check(JSON.stringify(p.settings.navigationHistory)===history&&JSON.stringify(p.settings.pinnedNodes)===pins,'Scrolling navigated or reordered saved notes');
   cases.push({selector,button,left:list.scrollLeft});
  }
  return {cases,exports};
 } finally {await f.cleanup();}
}
