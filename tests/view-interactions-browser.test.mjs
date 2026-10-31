/** Targeted actual shared canvas interaction checks. Native host facts are finite fixtures;
 * view projection/layout, action acceptance and semantic button/touch dispatch are production.
 * Pointer-specific disclosure assertions preserve a16px symbol and a44px coarse-pointer target. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {chromiumHarness} from './support/browserTypeScript.mjs';
import {plexViewBrowserModules} from './support/plexViewBrowser.mjs';
import {canvasSceneFixture} from './support/canvasSceneFixture.mjs';
const output=await plexViewBrowserModules({captureNotices:true});
const register=`
 const releases=[];
 const attach=ui=>{const release=plugin.actionManager.registerSurface({id:ui.props.actionSurfaceId,generation:1,
  get implementations(){return ui.ports.current.implementations},readSnapshot:()=>({mounted:true,visible:true,windowId:'interaction',
   center:M.actionNodeRef(pages.get(ui.props.activePath)),selected:ui.ports.current.readSelected(),focusRegion:'graph',interactionRevision:0,viewRevision:ui.session.getSnapshot()})});releases.push(release);
  ui.props.onActivate=(page,intent)=>{if(ui.session.definition.navigation==='rooted'){check(intent==='destination','Rooted activation must use accepted destination');check(ui.session.setRoot(page.path),'Root admission');}
   ui.props.activePath=page.path;ui.render();return true};ui.render();return ui};
 const dispatch=async(ui,id)=>{const result=await plugin.actionManager.dispatch({id,source:'local-hotkey',surfaceId:ui.props.actionSurfaceId});ui.render();await wait();return result};
`;

// Obsidian's shipped app.css applies this tablet rule. Insert it after plugin CSS to
// exercise specificity as well as coarse-pointer sizing; Chromium is not iOS validation.
for(const coarse of [false,true])test(`shared node controls resist tablet button padding (${coarse?'coarse':'fine'} pointer)`,async()=>{
 const host=await chromiumHarness(output.outputFiles[0].text+';window.sourceModules=sourceModules;');
 try{
  await host.command('Emulation.setTouchEmulationEnabled',{enabled:coarse,maxTouchPoints:1});
  assert(await host.evaluate(`(async()=>{${canvasSceneFixture}
   document.body.classList.add('is-mobile','is-tablet');
   const tablet=document.createElement('style');tablet.textContent='.is-tablet button:not(.clickable-icon){padding:4px 20px}';document.head.append(tablet);
   check(matchMedia('(pointer:coarse)').matches===${coarse},'Requested pointer lane is active');
   for(const view of ['classic','mindmap','wuxing']){
    const ui=await mount(M.builtInPlexViews.resolve(view));
    const buttons=[...ui.container.querySelectorAll('.kplex-thought-corner-action')];check(buttons.length>0,'Actual editor controls rendered');
    for(const button of buttons){const box=button.getBoundingClientRect(),css=getComputedStyle(button);
     check(box.width===16&&box.height===16,view+' editor control stays 16px square: '+box.width+'x'+box.height);
     check(css.paddingLeft==='0px'&&css.paddingRight==='0px'&&css.appearance==='none','Shared control removes host padding and native appearance');}
    if(view!=='wuxing'){
     const section=ui.container.querySelector('.kplex-section-fold-handle:not(.is-branch-disclosure)');check(section,'Supported central section control rendered');
     const box=section.getBoundingClientRect(),size=${coarse}?14:10;
     check(box.width===size&&box.height===size,'Section control stays square: '+box.width+'x'+box.height);
    }
    if(view==='mindmap'){
     const branch=ui.container.querySelector('.is-branch-disclosure'),box=branch.getBoundingClientRect(),symbol=branch.querySelector('.kplex-branch-disclosure-symbol').getBoundingClientRect();
     const targetSize=${coarse}?44:16;
     check(box.width===targetSize&&box.height===targetSize&&symbol.width===16&&symbol.height===16,'Branch preserves pointer-specific target and 16px visible symbol');
    }
    ui.close();
   }
   check(work.body===0&&work.scans===0,'Control presentation performs no Markdown reads or inventory');
   plugin.actionManager.dispose();style.remove();tablet.remove();document.body.classList.remove('is-mobile','is-tablet');return true})()`));
 }finally{await host.cleanup()}
});

for(const view of ['classic','mindmap','wuxing'])test(`${view}: saved History/pin/picker targets are explicit destinations independent of branch-click policy`,async()=>{
 const host=await chromiumHarness(output.outputFiles[0].text+';window.sourceModules=sourceModules;');
 try{assert(await host.evaluate(`(async()=>{${canvasSceneFixture}${register}
 const first=await mount(M.builtInPlexViews.resolve('${view}'));first.props.actionSurfaceId+='-saved';const ui=attach(first);
 const second=await mount(M.builtInPlexViews.resolve('${view}'));second.props.actionSurfaceId+='-other';const other=attach(second);
 const otherRoot=other.session.layoutRoot('A.md'),otherCamera=other.container.querySelector('.kplex-camera').style.transform;
 for(const [source,target]of [['toolbar','B.md'],['toolbar','C.md'],['local-menu','B.md']]){
  const result=await plugin.actionManager.dispatch({id:'node.activate',source,surfaceId:ui.props.actionSurfaceId,target:{kind:'explicit',node:M.actionNodeRef(pages.get(target))}});ui.render();await wait();
  check(result.status==='completed','Saved destination request accepted');check(ui.props.activePath===target,'Saved target becomes attention');
  if('${view}'==='mindmap')check(ui.session.layoutRoot(target)===target,'History/pin/full-picker target becomes Mind Map root');
 }
 // Passive attention may differ from a rooted map. Explicitly choosing that same note must still reroot.
 if('${view}'==='mindmap'){ui.props.activePath='C.md';ui.render();await wait();check(ui.session.layoutRoot('C.md')==='B.md','Passive attention retains root');
  const result=await plugin.actionManager.dispatch({id:'node.activate',source:'toolbar',surfaceId:ui.props.actionSurfaceId,target:{kind:'explicit',node:M.actionNodeRef(pages.get('C.md'))}});ui.render();await wait();check(result.status==='completed'&&ui.session.layoutRoot('C.md')==='C.md','Same-attention saved target explicitly reroots');}
 check(other.props.activePath==='A.md'&&other.session.layoutRoot('A.md')===otherRoot&&other.container.querySelector('.kplex-camera').style.transform===otherCamera,'Saved navigation stays on its captured canvas');
 check(work.body===0&&work.scans===0,'Saved navigation performs no body reads or inventory scan');
 releases.forEach(release=>release());ui.close();other.close();plugin.actionManager.dispose();style.remove();return true})()`));}finally{await host.cleanup()}
});

for(const view of ['classic','mindmap','wuxing'])test(`${view}: plain arrows leave the central area and Enter centers without renaming`,async()=>{
 const host=await chromiumHarness(output.outputFiles[0].text+';window.sourceModules=sourceModules;');
 try{assert(await host.evaluate(`(async()=>{${canvasSceneFixture}${register}
 settings.actionPreferences.crossSectionAtBoundary=false;
 const ui=attach(await mount(M.builtInPlexViews.resolve('${view}')));await dispatch(ui,'selection.center');
 const initial=ui.ports.current.readSelected();let selected=initial;
 for(const direction of ['right','down','left','up']){await dispatch(ui,'selection.move.'+direction);selected=ui.ports.current.readSelected();if(selected&&selected.node.identity!=='A.md')break;}
 check(selected&&selected.node.identity!=='A.md','Plain arrows must reach another area without Alt or the retired stop-at-boundary preference');
 const target=selected.node.identity;check((await dispatch(ui,'node.activate')).status==='completed','Enter accepted');check(ui.props.activePath===target,'Enter must center the selected canonical note');
 if('${view}'==='mindmap')check(ui.session.layoutRoot(target)===target,'Mind Map Enter reroots through destination admission');
 await dispatch(ui,'selection.center');check((await dispatch(ui,'node.activate')).status==='completed'&&!document.querySelector('.modal'),'Enter on current center never starts renaming');
 check(work.body===0&&work.scans===0,'Selection/centering performs no Markdown reads or vault scans');
 releases.forEach(release=>release());ui.close();plugin.actionManager.dispose();style.remove();return true})()`));}finally{await host.cleanup()}
});

test('Mind Map note click centers while its separate disclosure only folds',async()=>{
 const host=await chromiumHarness(output.outputFiles[0].text+';window.sourceModules=sourceModules;');
 try{assert(await host.evaluate(`(async()=>{${canvasSceneFixture}${register}
 const graph={'A.md':['B.md'],'B.md':['C.md']};index.neighbours=(page,role)=>role==='child'?(graph[page.path]??[]).map(path=>({page:pages.get(path),role,relationType:1,linkDirection:1})):[];
 const ui=attach(await mount(M.builtInPlexViews.resolve('mindmap'))),card=path=>ui.container.querySelector('[data-kplex-path="'+path+'"]');
 card('B.md').querySelector('.is-branch-disclosure').click();await wait();ui.render();await wait();
 check(card('C.md')&&ui.props.activePath==='A.md'&&ui.session.layoutRoot('A.md')==='A.md','Disclosure expands without navigation');
 card('B.md').dispatchEvent(new MouseEvent('click',{bubbles:true}));await wait();ui.render();await wait();
 check(ui.props.activePath==='B.md'&&ui.session.layoutRoot('B.md')==='B.md','Ordinary note click centers and reroots');
 releases.forEach(release=>release());ui.close();plugin.actionManager.dispose();style.remove();return true})()`));}finally{await host.cleanup()}
});

test('touch disclosure keeps a 16px symbol inside an isolated 44px hit target and consumes one fold per tap',async()=>{
 const host=await chromiumHarness(output.outputFiles[0].text+';window.sourceModules=sourceModules;');
 try{
  await host.command('Emulation.setDeviceMetricsOverride',{width:1280,height:960,deviceScaleFactor:1,mobile:false});
  await host.command('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
  assert(await host.evaluate(`(async()=>{${canvasSceneFixture}${register}
  const ui=attach(await mount(M.builtInPlexViews.resolve('mindmap')));window.interactionFixture={ui,releases,plugin,style};
  const control=ui.container.querySelector('[data-kplex-keyboard-id="root"] .is-branch-disclosure'),box=control.getBoundingClientRect(),symbol=control.querySelector('.kplex-branch-disclosure-symbol').getBoundingClientRect();
  check(box.width===44&&box.height===44&&symbol.width===16&&symbol.height===16,'Small visual symbol / larger measured touch target');
  const overlaps=(a,b)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
  const rootCard=ui.container.querySelector('[data-kplex-keyboard-id="root"]'),rootBox=rootCard.getBoundingClientRect();
  check(symbol.left<rootBox.right&&symbol.right>rootBox.right&&symbol.top<rootBox.bottom&&symbol.bottom>rootBox.bottom,'Visible glyph must straddle the note corner');
  for(const card of ui.container.querySelectorAll('.kplex-thought')){const r=card.getBoundingClientRect();if(!overlaps(box,r))continue;
   check(card===rootCard&&Math.max(box.left,r.left)>=symbol.left&&Math.min(box.right,r.right)<=symbol.right&&Math.max(box.top,r.top)>=symbol.top&&Math.min(box.bottom,r.bottom)<=symbol.bottom,'Only the visible corner glyph may overlap its own note; the transparent target must not steal body/adjacent-node taps');}
  for(const gate of ui.container.querySelectorAll('.kplex-gate'))check(!overlaps(box,gate.getBoundingClientRect()),'Touch target cannot steal a gate gesture');
  window.interactionFixture.point={x:box.left+36,y:box.top+36};window.interactionFixture.events=[];
  check(document.elementFromPoint(window.interactionFixture.point.x,window.interactionFixture.point.y)===control,'Trusted tap must target the actual visible transparent hit area');
  for(const type of ['pointerdown','pointerup','click','touchstart','touchend'])control.addEventListener(type,e=>window.interactionFixture.events.push({type:e.type,trusted:e.isTrusted}));
  return true})()`));
  const point=await host.evaluate('window.interactionFixture.point');
  for(const type of ['touchStart','touchEnd'])await host.command('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'?[]:[{...point,id:1,radiusX:8,radiusY:8,force:1}]});
  assert(await host.evaluate(`(async()=>{await new Promise(resolve=>setTimeout(resolve,160));const f=window.interactionFixture;f.ui.render();
   const control=f.ui.container.querySelector('[data-kplex-keyboard-id="root"] .is-branch-disclosure');
   if(control.getAttribute('aria-expanded')!=='false'||f.ui.props.activePath!=='A.md'||f.ui.session.layoutRoot('A.md')!=='A.md')throw Error('One transparent-area tap must fold once without centering '+JSON.stringify({expanded:control.getAttribute('aria-expanded'),events:f.events,point:f.point,hit:document.elementFromPoint(f.point.x,f.point.y)?.className,viewport:[innerWidth,innerHeight]}));return true})()`));
 }finally{
  await host.evaluate(`(()=>{const f=window.interactionFixture;if(f){f.releases.forEach(release=>release());f.ui.close();f.plugin.actionManager.dispose();f.style.remove();delete window.interactionFixture;}return true})()`);
  await host.cleanup();
 }
});

for(const view of ['classic','mindmap','wuxing'])test(`${view}: every eligible note receives the shared editor control`,async()=>{
 const host=await chromiumHarness(output.outputFiles[0].text+';window.sourceModules=sourceModules;');
 try{assert(await host.evaluate(`(async()=>{${canvasSceneFixture}${register}
 const ui=attach(await mount(M.builtInPlexViews.resolve('${view}')));
 try{const cards=[...ui.container.querySelectorAll('.kplex-thought')];check(cards.length>=3,'Real note fixture');
 for(const card of cards)check(card.querySelector('.kplex-thought-corner-action:not(:disabled)'),'Eligible note lacks shared editor control');
 if('${view}'==='mindmap'){const card=cards.find(card=>card.querySelector('.is-branch-disclosure')),r=card.getBoundingClientRect(),f=card.querySelector('.kplex-branch-disclosure-symbol').getBoundingClientRect();
 check(f.width===16&&f.height===16&&f.left<r.right&&f.right>r.right&&f.top<r.bottom&&f.bottom>r.bottom,'Small desktop disclosure belongs on the node corner');}
 return true;}finally{releases.forEach(release=>release());ui.close();plugin.actionManager.dispose();style.remove()}})()`));}finally{await host.cleanup();}
});


test('optional bounded hierarchy viewport retains connectors, clips paint and reveals the expanded row',async()=>{
 const host=await chromiumHarness(output.outputFiles[0].text+';window.sourceModules=sourceModules;');
 try{assert(await host.evaluate(`(async()=>{${canvasSceneFixture}${register}
 settings.animationSpeed=0;
 const children=Array.from({length:28},(_,i)=>'Overflow '+i+'.md');
 for(const path of children)pages.set(path,{...pages.get('C.md'),path,name:path,file:{...pages.get('C.md').file,path}});
 index.neighbours=(page,role)=>(page.path==='A.md'&&role==='parent'?['B.md']:page.path==='B.md'&&role==='child'?['A.md',...children]:[]).map(path=>({page:pages.get(path),role,relationType:1,linkDirection:1}));
 const base=M.builtInPlexViews.resolve('mindmap'),definition={...base,id:'test.bounded-hierarchy',layout(...args){const layout=base.layout(...args);return {...layout,areas:layout.areas.map(area=>area.id!=='parent'?area:{...area,bounds:{...area.bounds,y:area.bounds.y+area.bounds.height-140,height:140},viewport:{...area.viewport,y:area.viewport.y+area.viewport.height-140,height:140,scrollable:undefined}})}}};
 const ui=attach(await mount(definition));
 const card=path=>[...ui.container.querySelectorAll('.kplex-thought')].find(el=>el.dataset.kplexPath===path);
 const panel=()=>ui.container.querySelector('.kplex-zone-parent .kplex-zone-scroll');
 card('B.md').querySelector('.is-branch-disclosure').click();await wait();ui.render();await wait();ui.render();await wait();
 check(card(children[27]),'Wide parent branch must be admitted');
 const scroll=panel(),b=card('B.md').getBoundingClientRect(),v=scroll.getBoundingClientRect();
 check(scroll.scrollHeight>scroll.clientHeight&&b.top>=v.top-1&&b.bottom<=v.bottom+1,'Expansion must reveal its exact parent after measured reflow');
 const count=()=>ui.container.querySelectorAll('.kplex-edge-hit').length,before=count(),attention=ui.props.activePath,root=ui.session.layoutRoot(attention);
 check(before>0&&before<children.length,'Clipped leaf rows do not paint routes even while their parent is visible');
 scroll.scrollTop=0;scroll.dispatchEvent(new Event('scroll',{bubbles:true}));await wait();ui.render();await wait();
 check(card('B.md').getBoundingClientRect().top>scroll.getBoundingClientRect().bottom,'Expanded parent is genuinely outside the area aperture');
 /** Each actually visible child must retain its exact canonical route to the hidden source. */
 const visibleRoutes=()=>{const v=scroll.getBoundingClientRect(),visible=[...scroll.querySelectorAll('.kplex-thought')].filter(el=>{const r=el.getBoundingClientRect();return r.right>v.left&&r.left<v.right&&r.bottom>v.top&&r.top<v.bottom});
 check(visible.length>0,'At least one counterpart is physically visible');for(const el of visible){const id=el.dataset.kplexKeyboardId,path=[...ui.container.querySelectorAll('.kplex-edge-hit')].find(path=>path.dataset.kplexEdgeId===id);check(path,'Visible counterpart must keep its exact connector '+id);}return visible;};
 const visibleRows=visibleRoutes();check(count()>0&&count()<children.length,'Visible children retain ancestry routes without hidden-leaf clutter');
 const clipped=[...ui.container.querySelectorAll('.kplex-edge-hit')].filter(path=>path.closest('svg')!==ui.container.querySelector('.kplex-links'));
 check(clipped.length>=visibleRows.length,'Every visible child route uses the shared area aperture');
 check(clipped.some(path=>path.closest('.kplex-edge').querySelector('[data-kplex-edge-continuation="source"]')),'Hidden source has a read-only boundary continuation instead of disappearing');
 for(const path of clipped){const svg=path.closest('svg');check(svg.getAttribute('overflow')==='hidden'&&Number(svg.getAttribute('height'))>0,'Measured SVG aperture');}
 scroll.scrollTop=scroll.scrollHeight;scroll.dispatchEvent(new Event('scroll',{bubbles:true}));await wait();ui.render();await wait();visibleRoutes();check(count()>0,'Opposite scroll retains routes for visible counterparts');
 check(ui.props.activePath===attention&&ui.session.layoutRoot(attention)===root&&work.body===0&&work.scans===0,'Overflow remains presentation-only without navigation, body parsing or inventory');
 releases.forEach(release=>release());ui.close();plugin.actionManager.dispose();style.remove();return true})()`));}finally{await host.cleanup()}
});


test('Mind Map parents align to the bottom, grow without native scrolling and retain shared filtering and wheel navigation',async()=>{
 const host=await chromiumHarness(output.outputFiles[0].text+';window.sourceModules=sourceModules;');
 try{assert(await host.evaluate(`(async()=>{${canvasSceneFixture}${register}
 settings.animationSpeed=0;const children=Array.from({length:28},(_,i)=>'Growing '+i+'.md');for(const path of children)pages.set(path,{...pages.get('C.md'),path,name:path,file:{...pages.get('C.md').file,path}});
 index.neighbours=(page,role)=>(page.path==='A.md'&&role==='parent'?['B.md']:page.path==='B.md'&&role==='child'?['A.md',...children]:[]).map(path=>({page:pages.get(path),role,relationType:1,linkDirection:1}));
 const ui=attach(await mount(M.builtInPlexViews.resolve('mindmap'))),panel=()=>ui.container.querySelector('.kplex-zone-parent'),card=path=>[...ui.container.querySelectorAll('.kplex-thought')].find(el=>el.dataset.kplexPath===path);
 ui.session.setAreaHeight('parentHeight',140);ui.render();await wait();const smallHeight=parseFloat(panel().style.height),bodyTop=parseFloat(card('B.md').style.top),rootTop=parseFloat(card('A.md').style.top);
 ui.session.setAreaHeight('parentHeight',800);ui.render();await wait();const p=panel(),fixed=p.querySelector('.kplex-zone-fixed');
 check(parseFloat(p.style.height)===800&&parseFloat(card('B.md').style.top)-bodyTop===800-smallHeight,'Added empty space is above bottom-aligned content');
 check(parseFloat(card('A.md').style.top)===rootTop&&!p.querySelector('.kplex-zone-scroll')&&fixed.scrollHeight<=fixed.clientHeight+1,'Mind Map declares no internal scroller');
 const camera=ui.container.querySelector('.kplex-camera'),before=camera.style.transform;card('B.md').dispatchEvent(new WheelEvent('wheel',{bubbles:true,cancelable:true,clientX:500,clientY:300,deltaY:-30}));await wait();check(camera.style.transform!==before,'Plain wheel on fixed parent area reaches shared canvas zoom');
 ui.session.setAreaHeight('parentHeight',140);ui.render();card('B.md').querySelector('.is-branch-disclosure').click();await wait();ui.render();await wait();ui.render();
 check(card(children[27])&&parseFloat(panel().style.height)>800,'Expanded forest grows beyond the minimum height control ceiling');
 const expandedParent=card('B.md').getBoundingClientRect(),canvasBounds=ui.container.querySelector('.kplex-plex').getBoundingClientRect();check(expandedParent.top>=canvasBounds.top&&expandedParent.bottom<=canvasBounds.bottom,'Expanded fixed-region source must be revealed through the existing canvas owner');
 const box=panel().querySelector('.kplex-zone-fixed');check(box.scrollHeight<=box.clientHeight+1&&!ui.container.querySelector('.kplex-zone-scroll'),'Expanded Mind Map has no scrollable areas');box.scrollTop=1000;check(box.scrollTop===0,'Fixed region cannot acquire hidden scroll offset');
 const toggle=panel().querySelector('.kplex-zone-filter-button');toggle.click();await wait();const field=panel().querySelector('input');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(field,'Growing 27');field.dispatchEvent(new Event('input',{bubbles:true}));await wait();ui.render();await wait();
 check(card('B.md')&&card(children[27])&&!card(children[0]),'Shared filter preserves exact matching ancestor path');
 check(box.scrollHeight<=box.clientHeight+1&&work.body===0&&work.scans===0,'Filtering and growth do not create scrolling, body reads or inventory');
 releases.forEach(release=>release());ui.close();plugin.actionManager.dispose();style.remove();return true})()`));}finally{await host.cleanup()}
});


test('plugin reload CSS settlement centers the original note across views without navigation or source work',async()=>{
 const host=await chromiumHarness(output.outputFiles[0].text+';window.sourceModules=sourceModules;');
 try{assert.equal(await host.evaluate(`(async()=>{${canvasSceneFixture.replace('height:900px','height:3245px')}
 for(const id of ['classic','wuxing','mindmap'])for(const autozoom of [false,true]){
  settings.allowAutozoom=autozoom;const ui=await mount(M.builtInPlexViews.resolve(id)),scope=()=>ui.container.querySelector('.kplex-plex');
  const center=ui.container.querySelector('[data-kplex-path="A.md"]'),before={...work};
  ui.container.style.height='500px';await wait();await wait();await wait();
  const v=scope().getBoundingClientRect(),r=center.getBoundingClientRect();
  check(Math.abs((r.top+r.bottom)/2-(v.top+v.bottom)/2)<2,id+' keeps original center inside final reload viewport without another navigation');
  check(ui.props.activePath==='A.md'&&ui.moves.length===0&&ui.container.contains(center),'CSS settlement preserves note and DOM identity');
  check(work.body===before.body&&work.scans===before.scans&&work.acquisitions===before.acquisitions,'CSS settlement does no source work');
  await ui.ports.current.implementations['view.zoom-in'].execute({});await wait();const manual=ui.container.querySelector('.kplex-camera').style.transform;
  ui.container.style.height='650px';await wait();await wait();check(ui.container.querySelector('.kplex-camera').style.transform===manual,id+' preserves a manually owned camera');ui.close();
 }style.remove();return true;})()`),true)}finally{await host.cleanup()}
});


test('cycle references and expandable siblings share row spacing and card-edge status alignment',async()=>{
 const host=await chromiumHarness(output.outputFiles[0].text+';window.sourceModules=sourceModules;');
 try{await host.command('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
 assert(await host.evaluate(`(async()=>{${canvasSceneFixture}
 for(const path of ['D.md','E.md']){const base=pages.get('C.md');pages.set(path,{...base,path,name:path,file:{...base.file,path,name:path}});fieldCaches.set(path,{frontmatter:{phase:'water'}})}
 index.neighbours=(page,role)=>(role!=='child'?[]:page.path==='A.md'?['B.md']:page.path==='B.md'?['A.md','C.md','D.md']:page.path==='C.md'||page.path==='D.md'?['E.md']:[]).map(path=>({page:pages.get(path),role,relationType:1,typeDefinition:'Related',linkDirection:1}));
 index.getNeighborhood=path=>({center:pages.get(path),parents:[],children:index.neighbours(pages.get(path),'child'),leftFriends:[],rightFriends:[],siblings:[]});
 settings.canvasViewSettings={mindmap:{version:1,values:{initialGenerations:2,arrangement:'right'}}};
 const ui=await mount(M.builtInPlexViews.resolve('mindmap')),all=[...ui.container.querySelectorAll('.kplex-thought')],reference=all.find(n=>n.dataset.kplexPath==='A.md'&&!n.classList.contains('kplex-role-center'));
 const c=all.find(n=>n.dataset.kplexPath==='C.md'),d=all.find(n=>n.dataset.kplexPath==='D.md');check(reference&&c&&d,'Cycle and regular sibling fixture');
 const r=reference.getBoundingClientRect(),cr=c.getBoundingClientRect(),dr=d.getBoundingClientRect();check(Math.abs((cr.top-r.top)-(dr.top-cr.top))<1,'Reference status/button absence cannot compress the sibling gap');
 const status=reference.querySelector('.kplex-node-status');check(status&&getComputedStyle(status).left==='0px'&&Math.abs(status.getBoundingClientRect().left-r.left)<=3,'Shared status begins at the card edge');
 check(!reference.querySelector('.is-branch-disclosure')&&c.querySelector('.is-branch-disclosure'),'Uniform spacing does not invent a fold button on a reference');
 check(work.body===0&&work.scans===0,'Status/spacing needs no source work');ui.close();style.remove();return true;})()`));}finally{await host.cleanup()}
});


test('Compass hides center links to clipped friends and restores them as rows scroll into view',async()=>{
 const host=await chromiumHarness(output.outputFiles[0].text+';window.sourceModules=sourceModules;');
 try{assert(await host.evaluate(`(async()=>{${canvasSceneFixture}
 const friends=Array.from({length:30},(_,i)=>'Friend '+i+'.md');for(const path of friends){const base=pages.get('B.md');pages.set(path,{...base,path,name:path,file:{...base.file,path}})}
 index.neighbours=(page,role)=>(page.path==='A.md'&&role==='left'?friends:[]).map(path=>({page:pages.get(path),role,relationType:1,typeDefinition:'Related',linkDirection:1}));
 index.getNeighborhood=path=>({center:pages.get(path),parents:[],children:[],leftFriends:index.neighbours(pages.get(path),'left'),rightFriends:[],siblings:[]});
 settings.friendMaxHeight=160;const ui=await mount(M.builtInPlexViews.resolve('classic')),scroll=[...ui.container.querySelectorAll('.kplex-zone-scroll')].find(el=>el.scrollHeight>el.clientHeight+5);check(scroll,'Bounded Compass friends fixture');
 const ids=()=>[...ui.container.querySelectorAll('.kplex-edge-hit')].map(el=>el.dataset.kplexEdgeId).sort(),before=ids();check(before.length>0&&before.length<friends.length,'Clipped friends have no painted center route');
 for(const position of [0,scroll.scrollHeight,0]){scroll.scrollTop=position;scroll.dispatchEvent(new Event('scroll'));await wait();
  const aperture=scroll.getBoundingClientRect(),visible=[...scroll.querySelectorAll('.kplex-thought')].filter(el=>{const r=el.getBoundingClientRect();return r.right>aperture.left&&r.left<aperture.right&&r.bottom>aperture.top&&r.top<aperture.bottom});
  const expected=visible.map(el=>'left:'+el.dataset.kplexPath+':'+friends.indexOf(el.dataset.kplexPath)).sort();check(JSON.stringify(ids())===JSON.stringify(expected),'Only intersecting friend rows retain exact canonical route identities');
  if(position===0)check(JSON.stringify(ids())===JSON.stringify(before),'Returning restores the same route identities');
  for(const mark of ui.container.querySelectorAll('[data-kplex-edge-continuation]')){const r=mark.getBoundingClientRect(),x=(r.left+r.right)/2,y=(r.top+r.bottom)/2;check(x>=aperture.left-2&&x<=aperture.right+2&&y>=aperture.top-2&&y<=aperture.bottom+2,'Partially visible card gates remain bounded by the area');}}
 check(ui.props.activePath==='A.md'&&work.body===0&&work.scans===0,'Compass routing is presentation-only');ui.close();style.remove();return true;})()`));}finally{await host.cleanup()}
});


for(const [view,field]of [['mindmap','verticalDensity'],['mindmap','horizontalDensity'],['wuxing','regionWidth']])test(view+': async layout slider keeps first/latest only while its thumb follows input',async()=>{
 const host=await chromiumHarness(output.outputFiles[0].text+';window.sourceModules=sourceModules;');
 try{await host.evaluate(`(async()=>{${canvasSceneFixture}
 const writes=[],releases=[],rejects=[];let ui;plugin.updateCanvasViewConfiguration=(id,address,edit,expected,current)=>{writes.push({id,address,edit});return new Promise((resolve,reject)=>{rejects.push(reject);releases.push(()=>{if(!current()){reject(Error('retired'));return;}settings.canvasViewSettings=M.editViewConfigurationAt(M.builtInPlexViews.resolve(id),settings.canvasViewSettings??{},address,edit);ui.props.settings={...settings};ui.props.paintSettings=ui.props.settings;ui.render();resolve()})})};
 ui=await mount(M.builtInPlexViews.resolve('${view}'));if('${view}'==='wuxing'){ui.session.updateState({version:1,preset:'wuxing'});ui.render()}await ui.ports.current.implementations['view.layout-controls'].execute({});await wait();ui.render();await wait();
 const control=M.builtInCanvasViewSettings.layoutControls(ui.session.definition,ui.contributions.context()).find(c=>c.field==='${field}'||c.path?.at(-1)==='${field}'),label=control.label?('literal'in control.label?control.label.literal:plugin.translator(control.label.key)):plugin.translator(control.labelKey),input=[...ui.container.querySelectorAll('input[type=range]')].find(el=>el.getAttribute('aria-label')===label);check(input,'Declared shared slider absent');input.focus();
 window.sliderPending={ui,writes,releases,rejects,work,input,before:{...work},center:ui.container.querySelector('[data-kplex-path="A.md"]'),camera:ui.container.querySelector('.kplex-camera').style.transform,close:()=>{ui.close();style.remove()}};return true;})()`);
 for(let n=0;n<8;n++)for(const type of ['keyDown','keyUp'])await host.command('Input.dispatchKeyEvent',{type,key:'ArrowRight',code:'ArrowRight',windowsVirtualKeyCode:39});
 assert(await host.evaluate(`(()=>{const f=sliderPending;f.latest=Number(f.input.value);if(f.writes.length!==1||f.latest<=f.writes[0].edit.value)throw Error('Intermediate inputs queued or thumb lagged '+JSON.stringify({writes:f.writes,latest:f.latest,focus:document.activeElement?.getAttribute('aria-label'),input:f.input.value}));if(f.input.closest('label').querySelector('output').textContent!==f.latest.toFixed(2))throw Error('Latest draft output');return true})()`));
 assert(await host.evaluate(`(async()=>{const f=sliderPending;f.releases.shift()();await new Promise(r=>setTimeout(r,100));if(f.writes.length!==2||f.writes[1].edit.value!==f.latest||Number(f.input.value)!==f.latest)throw Error('Older completion replayed intermediate positions');f.releases.shift()();await new Promise(r=>setTimeout(r,180));if(f.writes.length!==2||Number(f.input.value)!==f.latest||document.activeElement!==f.input)throw Error('Final value/focus/backlog');if(f.ui.props.activePath!=='A.md'||f.ui.container.querySelector('[data-kplex-path="A.md"]')!==f.center||f.ui.container.querySelector('.kplex-camera').style.transform!==f.camera)throw Error('Layout retargeted note/camera');if(f.work.body!==f.before.body||f.work.scans!==f.before.scans||f.work.acquisitions!==f.before.acquisitions)throw Error('Slider acquired source work');return true})()`));
 }finally{await host.evaluate('window.sliderPending?.close();delete window.sliderPending;');await host.cleanup()}
});

/** A dense hub must paint only routes to intersecting scroll rows, while its full constructed
 * scene remains available to Find, scrolling and Markdown export. Visible motion stays bounded. */
test('dense Compass clips hidden leaf routes and bounds navigation animation to painted rows',async()=>{
 const host=await chromiumHarness(output.outputFiles[0].text+';window.sourceModules=sourceModules;');
 try{assert(await host.evaluate(`(async()=>{${canvasSceneFixture}
 const children=Array.from({length:300},(_,i)=>'Synthetic '+String(i).padStart(3,'0')+'.md');
 for(const path of children)pages.set(path,{...pages.get('C.md'),path,name:path,file:{...pages.get('C.md').file,path}});
 Object.assign(settings,{childMaxHeight:140,maxItemCount:300,showCrossLinks:false,animationSpeed:.25});
 index.neighbours=(page,role)=>(page.path==='A.md'&&role==='child'?children:[]).map(path=>({page:pages.get(path),role,relationType:1,linkDirection:1}));
 index.getNeighborhood=path=>({center:pages.get(path),parents:[],children:index.neighbours(pages.get(path),'child'),leftFriends:[],rightFriends:[],siblings:[]});
 const ui=await mount(M.builtInPlexViews.resolve('classic')),root=ui.container.querySelector('.kplex-plex'),camera=root.querySelector('.kplex-camera'),scroll=root.querySelector('.kplex-zone-scroll');
 const cards=[...scroll.querySelectorAll('.kplex-thought')];check(cards.length===300,'Full constructed content is retained');
 const verify=()=>{const r=scroll.getBoundingClientRect(),visible=cards.filter(card=>{const b=card.getBoundingClientRect();return b.right>r.left&&b.left<r.right&&b.bottom>r.top&&b.top<r.bottom}),expected=visible.map(card=>'child:'+card.dataset.kplexPath+':'+children.indexOf(card.dataset.kplexPath)).sort(),actual=[...root.querySelectorAll('.kplex-edge-hit')].map(edge=>edge.dataset.kplexEdgeId).sort();
 check(JSON.stringify(actual)===JSON.stringify(expected),'Only physically intersecting leaf rows receive routes: '+actual.length+' versus '+expected.length);check(actual.length>0&&actual.length<300,'Dense scene does not paint every admitted route');return visible};
 // Finish individual arrival effects before comparing their final measured positions with canonical gate paint.
 check(!camera.getAnimations().some(animation=>animation.effect?.target===camera),'Unbounded camera has no opacity animation');
 const moving=cards.filter(card=>card.getAnimations().length);check(moving.length<cards.length/4,'Clipped cards do not acquire animation layers');
 check(getComputedStyle(root).animationName==='kplex-scene-arrive','Scene fade belongs to the bounded canvas');
 for(const animation of root.getAnimations({subtree:true}))animation.finish();await wait();verify();
 for(const value of[(scroll.scrollHeight-scroll.clientHeight)/2,scroll.scrollHeight,0]){scroll.scrollTop=value;scroll.dispatchEvent(new Event('scroll',{bubbles:true}));await wait();verify();}
 check(root.querySelectorAll('.kplex-zone-content .kplex-thought').length===300&&work.body===0&&work.scans===0,'Clipping changes paint, not source work or constructed rows');
 ui.close();plugin.actionManager.dispose();style.remove();return true})()`));}finally{await host.cleanup()}
});
