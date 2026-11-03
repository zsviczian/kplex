/** Real shared-canvas tests for per-preset focus/gate presentation. Native graph/cache facts
 * are finite fixtures; projection, measurement, scrolling, SVG endpoints and React lifetimes are production. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {chromiumHarness} from './support/browserTypeScript.mjs';
import {plexViewBrowserModules} from './support/plexViewBrowser.mjs';
import {canvasSceneFixture} from './support/canvasSceneFixture.mjs';
const output=await plexViewBrowserModules();

/** Actual card/connector world coordinates must agree after scene scrolling and camera transforms. */
const checks=`
 const cards=ui=>[...ui.container.querySelectorAll('.kplex-thought[data-kplex-path]')];
 const focus=ui=>cards(ui).filter(card=>card.dataset.kplexPath===ui.props.activePath);
 const update=async(ui,value)=>{settings.canvasViewSettings=M.editViewConfigurationAt(ui.session.definition,settings.canvasViewSettings??{},
  {field:'presets',path:['wuxing']},{kind:'set',value});ui.props.settings={...settings};ui.render();await wait();ui.render();await wait()};
 const verify=ui=>{
  check(!ui.container.querySelector('.kplex-view-error'),'Shared canvas must not fall back after a valid preset edit');
  check(focus(ui).length===1,'Exactly one active occurrence');
  for(const hit of ui.container.querySelectorAll('[data-kplex-edge-id]')){
   if(!hit.closest('.kplex-edge'))continue;
   const d=hit.getAttribute('d');check(!d.includes('C'),'Center-anchored relationships are straight');
   const key=JSON.parse(hit.dataset.kplexEdgeId),target=key[0]==='cross'?JSON.parse(key[2])[1]:key[2],source=key[0]==='cross'?JSON.parse(key[1])[1]:ui.props.activePath;
   const a=cards(ui).find(card=>card.dataset.kplexPath===source),b=cards(ui).find(card=>card.dataset.kplexPath===target);check(a&&b,'Real connector endpoints remain rendered');
   const rect=node=>{const r=node.getBoundingClientRect();return new DOMPoint(r.x+r.width/2,r.y+r.height/2).matrixTransform(hit.getScreenCTM().inverse())};
   const x=rect(a),y=rect(b),points=d.match(/-?\\d+(?:\\.\\d+)?(?:e[+-]?\\d+)?/gi).map(Number);
   for(const [px,py]of [[points[0],points[1]],[points[2],points[3]]])check(Math.abs((px-x.x)*(y.y-x.y)-(py-x.y)*(y.x-x.x))/Math.hypot(y.y-x.y,y.x-x.x)<.05,'Actual SVG stays on card center line '+JSON.stringify({d,x,y,key,px,py}));
   check(hit.nextSibling!==null||hit.previousSibling!==null,'Visible and hit paths retain the same owner');
  }
 };
`;

test('all four preset combinations render independently with measured focus and real center-line connectors',async()=>{
 const browser=await chromiumHarness(output.outputFiles[0].text+';window.sourceModules=sourceModules;');
 try{assert(await browser.evaluate(`(async()=>{${canvasSceneFixture}${checks}
 const definition=M.builtInPlexViews.resolve('wuxing'),ui=await mount(definition);
 try{
  const before={...work};
  const four=M.FACET_TEMPLATES['map-roles'],quadrants={...four,source:'property',field:'status',categories:Object.fromEntries(four.order.map((id,i)=>[id,{...four.categories[id],values:[i===0?'water':id]}]))};
  for(const layout of ['circular','concentric','vertical','horizontal','quadrants'])for(const focusInCategory of [false,true])for(const centerAnchoredLinks of [false,true]){
   await update(ui,{...(layout==='quadrants'?quadrants:M.FACET_TEMPLATES.wuxing),layout,focusInCategory,centerAnchoredLinks});
   const active=focus(ui)[0];check(active,'Focus remains visible in DOM');
   check(!!active.closest('.kplex-zone-scroll')===focusInCategory,'Attention enters a real category scroll surface only when enabled');
   const neighbor=cards(ui).find(card=>card!==active);check(neighbor,'Related note remains');
   check(active.getBoundingClientRect().height>neighbor.getBoundingClientRect().height,'Attention is measurably larger, not just transformed');
   check(ui.container.querySelectorAll('[data-kplex-gate]').length===(centerAnchoredLinks?0:cards(ui).length*4),'Only this preset hides every handle '+JSON.stringify({layout,focusInCategory,centerAnchoredLinks,cards:cards(ui).length,gates:ui.container.querySelectorAll('[data-kplex-gate]').length}));
   if(centerAnchoredLinks)verify(ui);else check([...ui.container.querySelectorAll('[data-kplex-edge-id]')].some(path=>path.getAttribute('d').includes('C')),'Default Bezier gate routing stays intact');
  }
  check(work.body===before.body&&work.scans===before.scans&&work.acquisitions===before.acquisitions,'Preset toggles request no source reads/scans/semantic leases');
 }finally{ui.close();plugin.actionManager.dispose();style.remove()}
 return true})()`));}finally{await browser.cleanup()}
});

test('different presets and Classic retain independent presentation through focus/status/filter changes',async()=>{
 const browser=await chromiumHarness(output.outputFiles[0].text+';window.sourceModules=sourceModules;');
 try{assert(await browser.evaluate(`(async()=>{${canvasSceneFixture}${checks}
 const definition=M.builtInPlexViews.resolve('wuxing'),a=await mount(definition),b=await mount(definition),classic=await mount(M.builtInPlexViews.resolve('classic'));
 try{
  const base=M.FACET_TEMPLATES.wuxing;
  settings.canvasViewSettings=M.editViewConfigurationAt(definition,settings.canvasViewSettings??{}, {field:'presets',path:['other']},{kind:'set',value:{...base,name:'Other preset'}});
  check((await b.contributions.capture({kind:'state',action:{id:'preset.select',args:'other'}}).run()).status==='completed','Second canvas selects another preset');
  await update(a,{...base,focusInCategory:true,centerAnchoredLinks:true});b.render();classic.render();await wait();
  check(!a.container.querySelector('[data-kplex-gate]')&&b.container.querySelector('[data-kplex-gate]')&&classic.container.querySelector('[data-kplex-gate]'),'Preset and other-view gate isolation');
  check(focus(a)[0].closest('.kplex-zone-scroll')&&!focus(b)[0].closest('.kplex-zone-scroll'),'Placement is per preset');
  a.props.activePath='B.md';a.render();await wait();check(focus(a).length===1&&focus(a)[0].closest('.kplex-zone-scroll'),'New attention keeps a single contained occurrence');
  for(const value of [undefined,['wood','water'],{unsupported:true}]){
   fieldCaches.set('B.md',{frontmatter:{status:value}});a.props.renderRevision++;a.render();await wait();
   check(focus(a).length===1&&!focus(a)[0].closest('.kplex-zone-scroll'),'Unassigned/conflicting/unresolved fallback stays central');
  }
  fieldCaches.set('B.md',{frontmatter:{status:'water'}});a.props.renderRevision++;a.render();await wait();
  check(focus(a)[0].closest('.kplex-zone-scroll'),'A proven classification re-enters its category');
 }finally{a.close();b.close();classic.close();plugin.actionManager.dispose();style.remove()}
 return true})()`));}finally{await browser.cleanup()}
});

test('real scrolling resize crosslinks hover and navigation retain clipped center routes without source work',async()=>{
 const browser=await chromiumHarness(output.outputFiles[0].text+';window.sourceModules=sourceModules;');
 try{assert(await browser.evaluate(`(async()=>{${canvasSceneFixture}${checks}
 const extra=Array.from({length:24},(_,i)=>'Row-'+i+'.md');
 for(const path of extra){pages.set(path,{...pages.get('C.md'),path,name:path,file:{...pages.get('C.md').file,path}});fieldCaches.set(path,{frontmatter:{status:'water'}})}
 index.neighbours=(page,role)=>(page.path==='A.md'&&role==='child'?['B.md','C.md',...extra]:page.path!=='A.md'&&role==='parent'?['A.md']:[]).map(path=>({page:pages.get(path),role,relationType:1,typeDefinition:'Related',linkDirection:1}));
 index.visibleRelationshipsWithin=page=>page.path==='Row-23.md'?[{page:pages.get('Row-22.md'),role:'child',relationType:1,typeDefinition:'Cross link',linkDirection:1}]:[];
 const ui=await mount(M.builtInPlexViews.resolve('wuxing'));
 try{
  await update(ui,{...M.FACET_TEMPLATES.wuxing,regionWidth:500,regionHeight:350,focusInCategory:true,centerAnchoredLinks:true});
  const scroll=focus(ui)[0].closest('.kplex-zone-scroll'),camera=ui.container.querySelector('.kplex-camera').style.transform,before={...work};
  check(scroll.scrollHeight>scroll.clientHeight,'Real category overflow required');verify(ui);
  check(ui.container.querySelector('.kplex-edge.is-cross-link'),'Actual canonical crosslink remains admitted '+JSON.stringify([...ui.container.querySelectorAll('.kplex-edge-hit')].map(row=>row.dataset.kplexEdgeId)));
  for(const position of [25,(scroll.scrollHeight-scroll.clientHeight)/2,scroll.scrollHeight,0]){
   scroll.scrollTop=position;scroll.dispatchEvent(new Event('scroll'));await wait();verify(ui);
   check(Math.abs(scroll.scrollTop-Math.min(position,scroll.scrollHeight-scroll.clientHeight))<1,'Ordinary manual scroll must not pull attention back');
  }
  const hit=ui.container.querySelector('.kplex-edge-hit'),group=hit.closest('.kplex-edge');hit.dispatchEvent(new PointerEvent('pointerover',{bubbles:true,altKey:true}));await wait();
  check(group.classList.contains('is-highlighted'),'The same hit path still highlights canonical incidence');hit.dispatchEvent(new PointerEvent('pointerout',{bubbles:true}));await wait();
  const area=JSON.stringify(['facets','wuxing','category','water']);ui.session.setAreaWidth(area,500);ui.session.setAreaHeight(area,350);ui.render();await wait();verify(ui);
  check(ui.container.querySelector('.kplex-camera').style.transform===camera,'Scroll/reflow retains manual camera');
  ui.container.style.width='900px';ui.container.style.height='700px';await wait();ui.render();await wait();verify(ui);
  const beforeFilter={...work};check(beforeFilter.body===before.body&&beforeFilter.scans===before.scans&&beforeFilter.acquisitions===before.acquisitions,'Scroll/reflow/resize adds no source work');
  ui.props.predicate=M.compileGraphPredicate({kind:'compare',operator:'eq',left:{kind:'property',namespace:'node',key:'path'},right:{kind:'literal',value:'Row-23.md'}});ui.props.filterLayoutMode='reflow';ui.props.predicateRevision++;ui.render();await wait();verify(ui);check(focus(ui).length===1&&cards(ui).length===2,'Reflow filtering pins exactly the active occurrence and matching neighbor');
  document.body.classList.add('theme-dark');await wait();verify(ui);document.body.classList.remove('theme-dark');
  ui.props.predicate=null;ui.props.predicateRevision++;ui.render();await wait();
  ui.props.activePath='B.md';ui.render();await wait();check(focus(ui).length===1&&focus(ui)[0].closest('.kplex-zone-scroll'),'Navigation retains contained attention');verify(ui);
  check(work.body===before.body&&work.scans===before.scans,'Navigation stays within cache-only local facts');
 }finally{ui.close();plugin.actionManager.dispose();style.remove()}
 return true})()`));}finally{await browser.cleanup()}
});
