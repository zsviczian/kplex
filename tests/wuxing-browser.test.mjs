/** Actual production Wu Xing/shared canvas mounts in Chromium. Hit-test scenarios size the
 * browser viewport to contain the fixed canvas. Native editor behavior has separate host coverage. */
import {archivedFacetPresets} from './support/facetPresetArchive.mjs';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {chromiumHarness} from './support/browserTypeScript.mjs';
import {plexViewBrowserModules} from './support/plexViewBrowser.mjs';
import {canvasSceneFixture} from './support/canvasSceneFixture.mjs';
const output=await plexViewBrowserModules();

test('shared Info stays beside the cog and captures the opening canvas preset after focus moves',async()=>{
 const host=await chromiumHarness(output.outputFiles[0].text+';window.sourceModules=sourceModules;');
 try{assert.equal(await host.evaluate(`(async()=>{${canvasSceneFixture}
 settings.canvasViewSettings=M.editViewConfigurationAt(M.wuXingViewDefinition,{}, {field:'presets',path:['para']},{kind:'set',value:${JSON.stringify(archivedFacetPresets.para)}});
 const requests=[],a=await mount(M.wuXingViewDefinition,{openHelp:(id,target,help,current)=>{requests.push({id,target,help,current});return true}}),b=await mount(M.wuXingViewDefinition);
 await a.contributions.capture({kind:'state',action:{id:'preset.select',args:'para'}}).run();a.render();await wait();
 const sourceBefore=JSON.stringify(settings),stateBefore=JSON.stringify(a.session.getState()),otherBefore=JSON.stringify(b.session.getState()),before={...work};
 const surface=document.createElement('div');document.body.append(surface);const root=M.createRoot(surface);M.flushSync(()=>root.render(M.createElement(M.CanvasViewChoices,{controller:a.contributions,translate:plugin.translator})));
 const row=surface.querySelector('[data-kplex-view-choice="preset"]'),buttons=[...row.querySelectorAll('button')];check(buttons.length===2&&buttons[1].querySelector('.kplex-accessible-name').textContent==='About PARA','Info is immediately after the existing preset settings cog');check(buttons.every(button=>!button.hasAttribute('title')),'Accessible shared tooltips do not add duplicate native titles');
 b.container.tabIndex=0;b.container.focus();buttons[1].click();await wait();
 check(requests.length===1&&requests[0].id==='wuxing'&&requests[0].target==='para'&&requests[0].help.markdown.key==='facets.help.para'&&requests[0].current(),'Info uses the exact captured owning preset');
 check(JSON.stringify(settings)===sourceBefore&&JSON.stringify(a.session.getState())===stateBefore&&JSON.stringify(b.session.getState())===otherBefore,'Opening Help does not save or activate a preset');
 const stale=a.contributions.choices()[0].help;await a.contributions.capture({kind:'state',action:{id:'preset.select',args:'wuxing'}}).run();a.render();await wait();
 check(!requests[0].current()&&(await stale.run()).status==='unavailable'&&requests.length===1,'Superseded Info and pending render tokens cannot borrow the next preset');
 check(work.body===before.body&&work.scans===before.scans&&work.acquisitions===before.acquisitions,'Opening and retiring Help reads no sources');
 M.flushSync(()=>root.unmount());surface.remove();a.close();b.close();plugin.actionManager.dispose();check(events.size===0,'Help/choice/canvas subscriptions retire');style.remove();return true;
 })()`),true)}finally{await host.cleanup()}
});

test('native Markdown help stages output and retires late Component work without a second renderer',async()=>{
 const host=await chromiumHarness(output.outputFiles[0].text+';window.sourceModules=sourceModules;');
 try{assert.equal(await host.evaluate(`(async()=>{
 const M=sourceModules,check=(value,message)=>{if(!value)throw Error(message)},container=document.createElement('div'),app={fixture:'native-app'};document.body.append(container);
 let finish,cleanups=0,called=0,captured;
 window.testNativeMarkdownRender=async(nativeApp,source,element,path,component)=>{called++;captured={nativeApp,source,element,path,component};component.register(()=>cleanups++);element.createEl('h1',{text:'Controlled native completion'});await new Promise(resolve=>finish=resolve)};
 const helper=new M.NativeMarkdownHelp(app,container),pending=helper.render('# Help\\n\\n~~~dataviewjs\\nshouldNeverExecute()\\n~~~');
 check(captured.nativeApp===app&&captured.path===''&&captured.component.loaded&&!captured.source.includes('dataviewjs'),'Uses the real five-argument native API and an owned loaded Component with neutralized code fence');
 check(!captured.element.isConnected&&!container.textContent,'Native completion stays detached while pending');helper.dispose();finish();check((await pending)===false&&cleanups===1&&!captured.component.loaded&&!container.textContent,'Close immediately retires native work and late output cannot reattach');helper.dispose();check(cleanups===1,'Cleanup is idempotent');
 const next=new M.NativeMarkdownHelp(app,container);let current=true;const stale=next.render('# New help',()=>current);current=false;finish();check((await stale)===false&&!container.textContent,'Changed target suppresses pending native completion');
 const prior=called;let refused=false;try{await next.render('![remote](https://example.com/image.png)')}catch{refused=true}check(refused&&called===prior,'Media source is rejected before invoking native rendering');
 window.testNativeMarkdownRender=async(_app,_source,element,_path,component)=>{component.register(()=>cleanups++);element.createEl('iframe')};refused=false;try{await next.render('# Plain help')}catch{refused=true}check(refused&&!container.textContent,'Unexpected active native extension output is refused before attachment');
 for(const href of ['javascript:bad','https://user:secret@example.com','https://example..com','https://example.com:99999/']){
  window.testNativeMarkdownRender=async(_app,_source,element)=>element.createEl('a',{text:'Native autolink',attr:{href}});refused=false;
  try{await next.render('# Ordinary source')}catch{refused=true}check(refused&&!container.textContent,'Every actual native/autolink output uses the same strict target admission: '+href);
 }
 window.testNativeMarkdownRender=async(_app,_source,element)=>{for(const href of ['https://github.com/zsviczian/kplex','#local-heading'])element.createEl('a',{text:'Allowed link',attr:{href}})};
 check(await next.render('# Ordinary source'),'Safe native links still attach');check([...container.querySelectorAll('a')].every(anchor=>anchor.rel==='noopener noreferrer'),'Safe native anchors retain their owned navigation protections');
 next.dispose();container.remove();delete window.testNativeMarkdownRender;return true;
 })()`),true)}finally{await host.cleanup()}
});

test('production measured flow captions and arrow policies remain decorative across reversed linear layouts',async()=>{
 const host=await chromiumHarness(output.outputFiles[0].text+';window.sourceModules=sourceModules;');
 try{assert.equal(await host.evaluate(`(async()=>{${canvasSceneFixture}
 document.body.style.setProperty('--text-faint','#888888');document.body.style.setProperty('--text-muted','#999999');
 fieldCaches.get('A.md').frontmatter.status='wood';fieldCaches.get('B.md').frontmatter.status='metal';const ui=await mount(M.wuXingViewDefinition),before={...work};
 const focus=ui.container.querySelector('[data-kplex-path="A.md"]'),camera=ui.container.querySelector('.kplex-camera').style.transform,relations=JSON.stringify(rows(pages.get('A.md'),'child').map(row=>[row.page.path,row.role,row.typeDefinition]));
 for(const layout of ['horizontal','vertical'])for(const reverse of [false,true])for(const style of ['arrow','line','none']){
  const preset={...structuredClone(M.FACET_TEMPLATES.wuxing),layout,reverse,flow:{direction:'both',style,caption:'Review <script>never executes</script>',captionPosition:'end'}};
  settings.canvasViewSettings=M.editViewConfigurationAt(M.wuXingViewDefinition,{}, {field:'presets',path:['wuxing']},{kind:'set',value:preset});ui.props.settings={...settings};ui.props.paintSettings=ui.props.settings;ui.render();await wait();
  const guides=[...ui.container.querySelectorAll('.kplex-view-guide')],captions=[...ui.container.querySelectorAll('.kplex-view-guide-caption')];check(guides.length===4&&captions.length===4,'Shared renderer admits four measured adjacent guides/captions');
  check(guides.every(guide=>style==='arrow'?guide.hasAttribute('marker-start')&&guide.hasAttribute('marker-end'):!guide.hasAttribute('marker-start')&&!guide.hasAttribute('marker-end')),'Arrowheads follow the declared line policy');
  check(guides.every(guide=>style==='none'?getComputedStyle(guide).stroke==='none':getComputedStyle(guide).stroke!=='none'),'No-line policy leaves only the optional caption');
  check(captions.every(caption=>caption.textContent.includes('<script>never executes</script>')&&!caption.querySelector('script')&&Number(caption.querySelector('rect').getAttribute('width'))>0),'Captions use measured literal text with no HTML execution');
  for(const guide of guides){const points=guide.points,a=points.getItem(0),b=points.getItem(points.numberOfItems-1),delta=layout==='horizontal'?b.x-a.x:b.y-a.y;check(reverse?delta<0:delta>0,'Forward logical sequence follows geometric reversal')}
  check(ui.container.querySelector('[data-kplex-path="A.md"]')===focus&&ui.container.querySelector('.kplex-camera').style.transform===camera,'Decorations preserve focus and manual camera');
 }
 check(JSON.stringify(rows(pages.get('A.md'),'child').map(row=>[row.page.path,row.role,row.typeDefinition]))===relations,'Canonical relationship evidence is unchanged');
 check(work.body===before.body&&work.scans===before.scans&&work.acquisitions===before.acquisitions,'Caption/style/axis changes acquire no source work');
 ui.close();plugin.actionManager.dispose();check(events.size===0,'Shared decoration subscriptions retire');style.remove();return true;
 })()`),true)}finally{await host.cleanup()}
});

test('preset-owned layouts share definitions without a lens-dialog selector and paint true concentric holes',async()=>{
 const host=await chromiumHarness(output.outputFiles[0].text+';window.sourceModules=sourceModules;');
 try{assert.equal(await host.evaluate(`(async()=>{${canvasSceneFixture}
 fieldCaches.get('A.md').frontmatter.status='wood';fieldCaches.get('B.md').frontmatter.status='metal';
 const a=await mount(M.wuXingViewDefinition),b=await mount(M.wuXingViewDefinition),beforeB=JSON.stringify(b.session.getState()),before={...work};
 const focused=a.container.querySelector('[data-kplex-path="A.md"]'),camera=a.container.querySelector('.kplex-camera').style.transform;
 const surface=document.createElement('div');surface.className='kplex-view-controls';surface.style.width='500px';document.body.append(surface);const choices=M.createRoot(surface);M.flushSync(()=>choices.render([M.createElement(M.PlexViewSelector,{key:'view',session:a.session,translate:plugin.translator,contributions:a.contributions}),M.createElement(M.CanvasViewChoices,{key:'choices',controller:a.contributions,translate:plugin.translator})]));
 check(!surface.querySelector('[data-kplex-view-choice="layout"]')&&surface.querySelectorAll('select').length===2,'Lens dialog contains only the preset choice, cog and Info');
 for(const width of [500,300]){surface.style.width=width+'px';const group=surface.querySelector('[data-kplex-view-choice="preset"]'),controls=[group.querySelector('select'),...group.querySelectorAll('button')].map(el=>el.getBoundingClientRect());
 check(controls.length===3&&controls.every(rect=>Math.abs(rect.bottom-controls[0].bottom)<2)&&controls[2].width<50,'Preset/select/cog/Info stay on one compact line at '+width);if(width===300)check(group.getBoundingClientRect().top>surface.querySelector('.kplex-view-selector').getBoundingClientRect().top,'Narrow preset group wraps together');}
 a.session.updateState({...a.session.state,layouts:{wuxing:'horizontal'}});a.render();await wait();
 for(const layout of ['concentric','vertical','horizontal','circular']){
  b.container.tabIndex=0;b.container.focus();const command=a.contributions.capture({kind:'configuration',address:{field:'presets',path:['wuxing']},edit:{kind:'set',value:{...M.FACET_TEMPLATES.wuxing,layout}}});
  check((await command.run()).status==='completed','Existing preset writer accepts the layout');a.props.settings={...settings};a.props.paintSettings=a.props.settings;b.props.settings={...settings};b.props.paintSettings=b.props.settings;a.render();b.render();await wait();
  check(a.contributions.context().configuration.values.presets.wuxing.layout===layout,'Saved preset owns the layout');
  check(a.container.querySelector('[data-kplex-path="A.md"]')===focused&&a.container.querySelector('.kplex-camera').style.transform===camera,'Layout changes preserve native focus occurrence and manual camera');
  check(a.container.querySelectorAll('[data-kplex-decoration]').length===6,'All categories and combined diagnostics stay visible');
  if(layout==='concentric'){
   const paths=[...a.container.querySelectorAll('.kplex-view-region > path')];check(paths.length===5,'Concentric categories use shared band paths');
   check(paths.every(path=>path.getAttribute('fill-rule')==='evenodd'&&!path.isPointInFill(new DOMPoint(0,0))),'Every painted inner hole excludes the focused note');
   check(a.container.querySelectorAll('[data-kplex-path="B.md"]').length===1,'A categorized note retains one canonical occurrence');
  }
  check(JSON.stringify(b.session.getState())===beforeB,'Shared preset edit preserves the other canvas session');
  check(b.container.querySelectorAll('.kplex-view-region > path').length===(layout==='concentric'?5:0),'Both canvases resolve the saved preset layout');
 }
 check(work.body===before.body&&work.scans===before.scans&&work.acquisitions===before.acquisitions,'Layout changes do not acquire, parse or scan sources');
 M.flushSync(()=>choices.unmount());surface.remove();a.close();b.close();plugin.actionManager.dispose();check(events.size===0,'Dropdown and view lifetimes retire');style.remove();return true;
 })()`),true)}finally{await host.cleanup()}
});

test('combined diagnostics uses shared measured status chips and a captured canvas-only toggle',async()=>{
 const host=await chromiumHarness(output.outputFiles[0].text+';window.sourceModules=sourceModules;');
 try{assert.equal(await host.evaluate(`(async()=>{${canvasSceneFixture}
 const extra=Array.from({length:24},(_,i)=>'Diagnostic '+i+'.md');
 for(const path of extra){const base=pages.get('B.md');pages.set(path,{...base,path,name:path,file:{...base.file,path,name:path}});fieldCaches.set(path,{frontmatter:{}})}
 const related=['B.md','C.md',...extra];index.neighbours=(page,role)=>page.path==='A.md'&&role==='child'?related.map(path=>({page:pages.get(path),role,relationType:1,typeDefinition:'Related',linkDirection:1})):[];
 index.getNeighborhood=path=>({center:pages.get(path),parents:[],children:index.neighbours(pages.get(path),'child'),leftFriends:[],rightFriends:[],siblings:[]});
 fieldCaches.get('A.md').frontmatter.status='wood';fieldCaches.get('B.md').frontmatter.status=['wood','metal'];fieldCaches.delete('C.md');
 const a=await mount(M.wuXingViewDefinition),b=await mount(M.wuXingViewDefinition);a.props.areaSettingsMode=true;b.props.areaSettingsMode=true;a.render();b.render();await wait();
 const before={...work},stored=JSON.stringify(settings),bState=JSON.stringify(b.session.getState());
 const combined=JSON.stringify(['facets','wuxing','diagnostics']),unassigned=JSON.stringify(['facets','wuxing','status','unassigned']);
 const frame=(ui,id)=>ui.container.querySelector('.'+CSS.escape('kplex-area-'+id)),nodes=ui=>[...ui.container.querySelectorAll('[data-kplex-keyboard-id]')];
 check(frame(a,combined)&&nodes(a).length===27,'Default combined dock admits the full bounded scene');
 check(a.container.querySelectorAll('.kplex-node-status').length===26&&a.container.querySelectorAll('.kplex-node-badge').length===1,'Diagnostic statuses share the compact node component; only the assigned center keeps a category chip');
 const badge=path=>nodes(a).find(row=>row.dataset.kplexPath===path)?.querySelector('.kplex-node-status');
 check(badge('B.md').textContent==='Conflicting'&&badge('C.md').textContent==='Cannot classify'&&badge(extra[0]).textContent==='Unassigned','Shared chips retain each diagnostic result');
 check(!frame(a,combined).dataset.kplexAssignment,'Combined dock grants no property-clearing target');
 const status=badge('B.md'),statusNode=status.closest('.kplex-thought');
 check(status.getBoundingClientRect().top>=statusNode.getBoundingClientRect().bottom&&getComputedStyle(status).fontSize==='10px'&&getComputedStyle(status).left==='0px','Diagnostic status uses the same below-card typography as hierarchy references');
 const scroll=a.container.querySelector('.'+CSS.escape('kplex-zone-'+combined)+' .kplex-zone-scroll');
 const edgeIds=()=>[...a.container.querySelectorAll('.kplex-edge-hit')].map(el=>el.dataset.kplexEdgeId);
 const canonicalRows=()=>JSON.stringify([...pages].map(([path,page])=>[path,index.neighbours(page,'child').map(row=>[row.page.path,row.role,row.relationType,row.typeDefinition])]));
 const canonical=canonicalRows(),topEdges=edgeIds();check(topEdges.length>0&&topEdges.length<26,'Only intersecting diagnostic rows retain their connectors');
 for(const mark of a.container.querySelectorAll('[data-kplex-edge-continuation]')){const group=mark.closest('.kplex-edge');check(!group.querySelector('.kplex-edge-visible').getAttribute('marker-end')&&!group.querySelector('text'),'Continuation has no hidden-note arrowhead or detached caption');check(mark.getAttribute('pointer-events')==='none'&&!mark.dataset.kplexKeyboardId,'Continuation is not a gate or action target');}
 scroll.scrollTop=scroll.scrollHeight-scroll.clientHeight;scroll.dispatchEvent(new Event('scroll'));await wait();
 const bottomEdges=edgeIds();check(bottomEdges.length>0&&bottomEdges.length<26&&JSON.stringify(bottomEdges)!==JSON.stringify(topEdges),'Scrolling swaps painted routes to the newly visible rows without hidden-row clutter');
 check(canonicalRows()===canonical,'Scroll paint never changes canonical graph state');
 scroll.scrollTop=0;scroll.dispatchEvent(new Event('scroll'));await wait();
 check(JSON.stringify(edgeIds())===JSON.stringify(topEdges),'Returning to the top restores exact connector identities');
 const camera=a.container.querySelector('.kplex-camera').style.transform,focus=nodes(a).find(row=>row.dataset.kplexPath==='A.md');
 a.session.setAreaWidth(unassigned,610);a.session.setAreaHeight(unassigned,350);a.session.setAreaWidth(combined,700);a.render();await wait();
 await a.ports.current.implementations['view.layout-controls'].execute({});await wait();
 let checkbox=a.container.querySelector('input[aria-label="Combine diagnostics"]');check(checkbox?.checked,'Shared rail reflects lazy combined default');checkbox.click();await wait();a.render();await wait();
 check(!frame(a,combined)&&frame(a,unassigned),'Rail toggles only the owning canvas to separate diagnostic surfaces');
 check(a.session.getAreaWidths()[unassigned]===610&&a.session.getAreaHeights()[unassigned]===350&&a.session.getAreaWidths()[combined]===700,'Both modes retain independent dimension identities');
 check(frame(b,combined)&&JSON.stringify(b.session.getState())===bState&&JSON.stringify(settings)===stored,'Toggle leaves the other canvas and shared preset settings unchanged');
 check(nodes(a).find(row=>row.dataset.kplexPath==='A.md')===focus&&a.container.querySelector('.kplex-camera').style.transform===camera,'Toggle preserves focused occurrence and manual camera');
 checkbox=a.container.querySelector('input[aria-label="Combine diagnostics"]');checkbox.click();await wait();a.render();await wait();
 check(frame(a,combined)&&a.session.state.combinedDiagnostics.wuxing===true,'Returning to combined records an explicit canvas preference');
 settings.canvasViewSettings=M.editViewConfigurationAt(M.wuXingViewDefinition,{}, {field:'presets',path:['wuxing','diagnostics']},{kind:'set',value:{combined:false}});a.props.settings={...settings};a.props.paintSettings=a.props.settings;a.render();await wait();
 check(frame(a,combined),'An explicit canvas preference survives later shared-default changes');
 check(work.body===before.body&&work.scans===before.scans&&work.acquisitions===before.acquisitions&&work.properties-before.properties<300,'Presentation-only changes retain bounded cached-field reads and acquire no sources');
 a.close();b.close();plugin.actionManager.dispose();check(events.size===0,'Combined and separate presentation subscriptions retire');style.remove();return true;
 })()`),true)}finally{await host.cleanup()}
});

test('shared width side handle and keyboard edits resize only the owning Facets area without source work',async()=>{
 const host=await chromiumHarness(output.outputFiles[0].text+';window.sourceModules=sourceModules;');
 try{
  await host.command('Emulation.setDeviceMetricsOverride',{width:1500,height:1050,deviceScaleFactor:1,mobile:false});
  await host.evaluate(`(async()=>{${canvasSceneFixture}
   fieldCaches.get('B.md').frontmatter.status='wood';fieldCaches.get('C.md').frontmatter.status='wood';
   const ui=await mount(M.wuXingViewDefinition);ui.props.areaSettingsMode=true;ui.render();
   await ui.ports.current.implementations['view.fit'].execute({});await wait();await wait();
   window.widthFacets={ui,work,before:{...work},style,settings,settingsBefore:JSON.stringify(settings)};return true;
  })()`);
  const id=JSON.stringify(['facets','wuxing','category','wood']);
  for(const delta of [24,-12]){
   const from=await host.evaluate(`(()=>{const frame=widthFacets.ui.container.querySelector('.'+CSS.escape('kplex-area-'+${JSON.stringify(id)})),handle=frame?.querySelector('.is-width-handle');if(!handle)throw Error('Width capability absent');const b=handle.getBoundingClientRect();return{x:b.x+b.width/2,y:b.y+b.height/2,width:Number(handle.getAttribute('aria-valuenow')),height:frame.style.height,label:handle.getAttribute('aria-label'),orientation:handle.getAttribute('aria-orientation')}})()`);
   assert.equal(from.label,'Wood width');assert.equal(from.orientation,'vertical');
   await host.command('Input.dispatchMouseEvent',{type:'mouseMoved',x:from.x,y:from.y});
   await host.command('Input.dispatchMouseEvent',{type:'mousePressed',x:from.x,y:from.y,button:'left',buttons:1,clickCount:1});
   await host.command('Input.dispatchMouseEvent',{type:'mouseMoved',x:from.x+delta,y:from.y,button:'left',buttons:1});
   await host.evaluate('new Promise(resolve=>setTimeout(resolve,80))');
   await host.command('Input.dispatchMouseEvent',{type:'mouseReleased',x:from.x+delta,y:from.y,button:'left',buttons:0,clickCount:1});
   const after=await host.evaluate(`(async()=>{widthFacets.ui.render();await new Promise(resolve=>setTimeout(resolve,70));const frame=widthFacets.ui.container.querySelector('.'+CSS.escape('kplex-area-'+${JSON.stringify(id)}));return{width:widthFacets.ui.session.getAreaWidths()[${JSON.stringify(id)}],height:frame.style.height,rendered:Number(frame.querySelector('.is-width-handle').getAttribute('aria-valuenow'))}})()`);
   assert(delta>0?after.width>from.width:after.width<from.width);assert.equal(after.width,after.rendered);assert.equal(after.height,from.height);
  }
  const before=await host.evaluate(`(()=>{const h=widthFacets.ui.container.querySelector('.'+CSS.escape('kplex-area-'+${JSON.stringify(id)})).querySelector('.is-width-handle');h.focus();return Number(h.getAttribute('aria-valuenow'))})()`);
  for(const type of ['keyDown','keyUp'])await host.command('Input.dispatchKeyEvent',{type,key:'ArrowRight',code:'ArrowRight',windowsVirtualKeyCode:39});
  assert.equal(await host.evaluate(`widthFacets.ui.session.getAreaWidths()[${JSON.stringify(id)}]`),before+10);
  assert.equal(await host.evaluate(`(()=>{const r=widthFacets;return r.work.body===r.before.body&&r.work.scans===r.before.scans&&r.work.acquisitions===r.before.acquisitions&&r.ui.props.activePath==='A.md'&&JSON.stringify(r.settings)===r.settingsBefore})()`),true);
  await host.evaluate('widthFacets.ui.close();widthFacets.style.remove();delete window.widthFacets;');
 }finally{await host.cleanup()}
});

test('shared bottom-edge pointer resize grows and shrinks Facets category and status areas without source work',async()=>{
 const host=await chromiumHarness(output.outputFiles[0].text+';window.sourceModules=sourceModules;');
 try{
  await host.command('Emulation.setDeviceMetricsOverride',{width:1500,height:1050,deviceScaleFactor:1,mobile:false});
  await host.evaluate(`(async()=>{${canvasSceneFixture}
   fieldCaches.get('A.md').frontmatter.status='wood';fieldCaches.get('B.md').frontmatter.status=['water','metal'];fieldCaches.delete('C.md');
   settings.canvasViewSettings=M.editViewConfigurationAt(M.wuXingViewDefinition,{}, {field:'presets',path:['wuxing','categories','wood','label']},{kind:'set',value:'My wood'});
   settings.canvasViewSettings=M.editViewConfigurationAt(M.wuXingViewDefinition,settings.canvasViewSettings, {field:'presets',path:['wuxing','diagnostics']},{kind:'set',value:{combined:false}});
   const ui=await mount(M.wuXingViewDefinition);ui.props.areaSettingsMode=true;ui.render();
   await ui.ports.current.implementations['view.fit'].execute({});await wait();await wait();
   window.resizeFacets={ui,work,before:{...work},style};return true;
  })()`);
  for(const [kind,name]of [['category','wood'],['status','unassigned'],['status','conflicting'],['status','unresolved']]){
   const id=JSON.stringify(['facets','wuxing',kind,name]);
   const initial=await host.evaluate(`(()=>{const r=resizeFacets,frame=r.ui.container.querySelector('.'+CSS.escape('kplex-area-'+${JSON.stringify(id)})),handle=frame?.querySelector('[role="separator"]');if(!handle)throw Error('Editable area absent');const b=handle.getBoundingClientRect();return{x:b.x+b.width/2,y:b.y+b.height/2,height:Number(handle.getAttribute('aria-valuenow'))}})()`);
   if(name==='wood')assert.equal(await host.evaluate(`resizeFacets.ui.container.querySelector('.'+CSS.escape('kplex-area-'+${JSON.stringify(id)})).querySelector('[role="separator"]').getAttribute('aria-label')`),'My wood');
   /** Trusted browser pointer input exercises shared capture, scale conversion and session persistence. */
   for(const [delta,expected]of [[18,'larger'],[-12,'smaller']]){
    const from=await host.evaluate(`(()=>{const handle=resizeFacets.ui.container.querySelector('.'+CSS.escape('kplex-area-'+${JSON.stringify(id)})).querySelector('[role="separator"]'),b=handle.getBoundingClientRect();return{x:b.x+b.width/2,y:b.y+b.height/2,height:Number(handle.getAttribute('aria-valuenow'))}})()`);
    await host.command('Input.dispatchMouseEvent',{type:'mouseMoved',x:from.x,y:from.y});
    await host.command('Input.dispatchMouseEvent',{type:'mousePressed',x:from.x,y:from.y,button:'left',buttons:1,clickCount:1});
    await host.command('Input.dispatchMouseEvent',{type:'mouseMoved',x:from.x,y:from.y+delta,button:'left',buttons:1});
    await host.evaluate('new Promise(resolve=>setTimeout(resolve,80))');
    await host.command('Input.dispatchMouseEvent',{type:'mouseReleased',x:from.x,y:from.y+delta,button:'left',buttons:0,clickCount:1});
    const height=await host.evaluate(`resizeFacets.ui.session.getAreaHeights()[${JSON.stringify(id)}]`);
    assert(expected==='larger'?height>from.height:height<from.height,`${name}: ${expected} height after physical bottom-edge drag`);
   }
   assert(initial.height>0);
  }
  assert.equal(await host.evaluate(`(()=>{const r=resizeFacets;return r.work.body===r.before.body&&r.work.scans===r.before.scans&&r.work.acquisitions===r.before.acquisitions&&r.ui.props.activePath==='A.md'})()`),true);
  await host.evaluate('resizeFacets.ui.close();resizeFacets.style.remove();delete window.resizeFacets;');
 }finally{await host.cleanup()}
});

test('advanced Facets rules use current/candidate cached metadata in the production shared renderer without source work',async()=>{
 const host=await chromiumHarness(output.outputFiles[0].text+';window.sourceModules=sourceModules;');
 try{assert.equal(await host.evaluate(`(async()=>{${canvasSceneFixture}
 fieldCaches.get('A.md').frontmatter.status='wood';fieldCaches.get('B.md').frontmatter.status='metal';fieldCaches.get('C.md').frontmatter.status='water';
 const preset=structuredClone(${JSON.stringify(archivedFacetPresets.arc)});preset.diagnostics={combined:false};preset.source='rules';preset.categories.add.rule='note.status == this.status';preset.categories.relate.rule='note.status == "metal"';preset.categories.communicate.rule='edge.role == "child" and note.status == "water"';
 settings.canvasViewSettings=M.editViewConfigurationAt(M.wuXingViewDefinition,{}, {field:'presets',path:['arc']},{kind:'set',value:preset});
 const a=await mount(M.wuXingViewDefinition);M.flushSync(()=>a.session.updateState({version:1,preset:'arc'}));a.render();await wait();
 const node=id=>[...a.container.querySelectorAll('[data-kplex-keyboard-id]')].find(row=>row.dataset.kplexPath===id);
 const area=id=>a.container.querySelector('.'+CSS.escape('kplex-zone-'+JSON.stringify(['facets','arc','category',id])));
 check(node('A.md').querySelector('.kplex-node-badge').textContent==='Add','The owning canvas focus uses this.status');
 check(area('relate')?.contains(node('B.md'))&&area('communicate')?.contains(node('C.md')),'Candidates use stored fields and canonical relationship contexts');
 const focus=node('A.md'),camera=a.container.querySelector('.kplex-camera').style.transform,before={body:work.body,scans:work.scans,acquisitions:work.acquisitions};
 settings.canvasViewSettings=M.editViewConfigurationAt(M.wuXingViewDefinition,settings.canvasViewSettings,{field:'presets',path:['arc','regionWidth']},{kind:'set',value:400});a.props.settings={...settings};a.props.paintSettings=a.props.settings;a.render();await wait();
 check(node('A.md')===focus&&a.container.querySelector('.kplex-camera').style.transform===camera,'Rule/layout settings do not retarget attention or camera');
 check(work.body===before.body&&work.scans===before.scans&&work.acquisitions===before.acquisitions,'Rule/layout presentation does no body parsing, scanning or acquisition');
 fieldCaches.delete('C.md');for(const ref of [...events])if(ref?.name==='changed')ref.callback(pages.get('C.md').file);await wait();
 const unresolved=a.container.querySelector('.'+CSS.escape('kplex-zone-'+JSON.stringify(['facets','arc','status','unresolved'])));check(unresolved?.contains(node('C.md')),'Missing metadata stays reachable and unresolved');
 check(rows(pages.get('A.md'),'child').map(row=>row.page.path).join(',')==='B.md,C.md','Rules preserve canonical relationships');
 a.close();plugin.actionManager.dispose();check(events.size===0,'Rule presentation retires the original subscriptions');style.remove();return true;
 })()`),true)}finally{await host.cleanup()}
});

test('relative Wu Xing presentation follows focus and unavailable metadata without new work or semantic edges',async()=>{
 const host=await chromiumHarness(output.outputFiles[0].text+';window.sourceModules=sourceModules;');
 try{assert.equal(await host.evaluate(`(async()=>{${canvasSceneFixture}
 fieldCaches.get('A.md').frontmatter.status='wood';fieldCaches.get('B.md').frontmatter.status='metal';
 const original=JSON.stringify([...fieldCaches]),a=await mount(M.wuXingViewDefinition),b=await mount(M.wuXingViewDefinition);
 const region=(surface,id)=>surface.container.querySelector('[data-kplex-decoration='+CSS.escape(JSON.stringify(['facets','wuxing','category',id]))+']');
 const label=(surface,id)=>region(surface,id).querySelector('.kplex-view-region-description')?.textContent;
 check(label(a,'wood')==='What shares my phase'&&label(a,'metal')==='What regulates me','Wood reference reading');
 const bState=JSON.stringify(b.session.getState()),bCamera=b.container.querySelector('.kplex-camera').style.transform;
 a.props.activePath='B.md';a.render();await wait();
 check(label(a,'wood')==='What I regulate'&&label(a,'water')==='What I generate'&&label(a,'metal')==='What shares my phase','Metal reference reading');
 check(label(b,'metal')==='What regulates me'&&JSON.stringify(b.session.getState())===bState&&b.container.querySelector('.kplex-camera').style.transform===bCamera,'Other canvas is independent');
 const guides=[...a.container.querySelectorAll('.kplex-view-guide')];check(guides.length===10&&guides.every(row=>row.getAttribute('marker-end')),'Both cycles have decorative direction');
 check(a.container.querySelectorAll('.kplex-view-guide.is-generating').length===5&&a.container.querySelectorAll('.kplex-view-guide.is-regulating').length===5,'Cycle families stay distinct');
 const markers=[a,b].map(surface=>surface.container.querySelector('marker').id);check(markers[0]!==markers[1],'Per-canvas marker identities');
 const focused=a.container.querySelector('[data-kplex-path="B.md"]'),camera=a.container.querySelector('.kplex-camera').style.transform;
 for(const phase of [undefined,['wood','metal']]){
  fieldCaches.get('B.md').frontmatter.status=phase;for(const ref of [...events])if(ref?.name==='changed')ref.callback(pages.get('B.md').file);await wait();
  check(['wood','fire','earth','metal','water'].every(id=>label(a,id)==='Reference phase unavailable'),'No model default for missing/conflicting focus');
  check(a.container.querySelector('[data-kplex-path="B.md"]')===focused&&a.container.querySelector('.kplex-camera').style.transform===camera,'Reclassification retains occurrence/camera');
 }
 fieldCaches.delete('B.md');for(const ref of [...events])if(ref?.name==='changed')ref.callback(pages.get('B.md').file);await wait();
 check(label(a,'wood')==='Reference phase unavailable','Incomplete metadata is not Wood');
 check(rows(pages.get('B.md'),'parent')[0].page.path==='A.md'&&rows(pages.get('B.md'),'parent')[0].role==='parent','Canonical relationship remains recorded parent');
 check(work.body===0&&work.scans===0,'Presentation never parses or scans');
 check(JSON.parse(original).find(([path])=>path==='A.md')[1].frontmatter.status===fieldCaches.get('A.md').frontmatter.status,'Focus never writes phases');
 a.close();b.close();plugin.actionManager.dispose();check(events.size===0,'Shared lifecycle cleanup');style.remove();return true;
 })()`),true)}finally{await host.cleanup()}
});

test('Facets production presets share captured controls, measured badges and live native colors independently',async()=>{
 const host=await chromiumHarness(output.outputFiles[0].text+';window.sourceModules=sourceModules;');
 try{assert.equal(await host.evaluate(`(async()=>{${canvasSceneFixture}
 document.body.className='theme-dark';document.body.style.cssText='--background-primary:#181818;--background-secondary:#282828;--text-normal:#eeeeee;--text-muted:#999999;--color-blue:#1144bb;--color-green:#33aa66;--color-red:#cc2233;--color-orange:#dd8833;--color-purple:#aa55ee;--color-cyan:#22bbcc;--color-yellow:#dddd22';
 settings.canvasViewSettings=M.editViewConfigurationAt(M.wuXingViewDefinition,{}, {field:'presets'},{kind:'set',value:${JSON.stringify(archivedFacetPresets)}});
 const a=await mount(M.wuXingViewDefinition),b=await mount(M.wuXingViewDefinition),beforeB=JSON.stringify(b.session.getState());
 const controller=new M.CanvasViewContributionController(a.session,M.builtInCanvasViewSettings,{settings:()=>settings.canvasViewSettings,mounted:()=>a.container.isConnected,
 beforePresentationChange:()=>a.ports.current.preparePresentationChange(),update:()=>{throw Error('Unexpected type write')},openSettings:()=>true,failed:error=>{throw error}});
 const node=()=>[...a.container.querySelectorAll('[data-kplex-keyboard-id]')].find(row=>row.dataset.kplexPath==='A.md'),original=node(),bounds=()=>({top:original.style.top,left:original.style.left});
 const position=bounds(),camera=a.container.querySelector('.kplex-camera').style.transform;
 for(const [preset,count] of [['arc',3],['para',4],['wuxing',5],['gtd',6],['eaccess',7],['sensemaking',4],['publishing',5],['map-roles',4]]){
   const choice=controller.choices()[0];check(choice.options.length===8,'Two built-ins and six saved archive fixtures exposed by shared choices');
   check((await choice.options.find(option=>option.id===preset).command.run()).status==='completed','Captured preset action accepted');a.render();await wait();
   const categories=[...a.container.querySelectorAll('[data-kplex-decoration]')].filter(row=>JSON.parse(row.dataset.kplexDecoration)[2]==='category');
   check(categories.length===count,'Exactly the selected preset categories render');check(node()===original,'Preset changes retain attention DOM identity');
   check(JSON.stringify(bounds())===JSON.stringify(position),'Attention remains centered through preset changes');
   check(a.container.querySelector('.kplex-camera').style.transform===camera,'Preset change preserves manual camera');
   const context={viewId:'wuxing',state:a.session.state,configuration:{status:'available',values:settings.canvasViewSettings.wuxing?.values??{}}};
   const controls=M.builtInCanvasViewSettings.layoutControls(M.wuXingViewDefinition,context),configControls=controls.filter(control=>!control.state),combine=controls.find(control=>control.state);
   check(configControls.length===(preset==='wuxing'?7:5)&&controls.every(control=>control.field==='presets'&&control.path[0]===preset),'Shared rails address only the selected preset and its optional interpretation');
   check(combine?.kind==='checkbox'&&combine.state.value===true&&combine.state.actionId==='diagnostics.combine'&&combine.path.join('/')===preset+'/diagnostics/combined','Combine control captures the selected canvas presentation action');
   check(JSON.stringify(b.session.getState())===beforeB,'Other canvas retains independent selection');
 }
 check(b.container.querySelector('.kplex-node-badge').textContent==='Water','Other canvas retains its own badge');
 check((await controller.capture({kind:'state',action:{id:'preset.select',args:'wuxing'}}).run()).status==='completed','Return to Wu Xing');a.render();await wait();
 const badge=node().querySelector('.kplex-node-badge');check(getComputedStyle(badge).color==='rgb(255, 255, 255)','Dark fill chooses readable white text');
 document.body.style.setProperty('--color-blue','#ffff88');await wait();await wait();
 check(getComputedStyle(badge).color==='rgb(0, 0, 0)','Live theme change chooses readable black text');
 const region=[...a.container.querySelectorAll('[data-kplex-decoration]')].find(row=>row.dataset.kplexDecoration===JSON.stringify(['facets','wuxing','category','water']));
 check(getComputedStyle(region.querySelector(':scope > rect')).fill==='rgb(255, 255, 136)','Region resolves configured native color through the shared scope');
 const before={body:work.body,scans:work.scans,acquisitions:work.acquisitions};for(let i=0;i<25;i++)a.ports.current.readWanderScene();
 check(work.body===before.body&&work.scans===before.scans&&work.acquisitions===before.acquisitions,'Presentation and repeated Wander reads acquire no extra source work');
 controller.dispose();a.close();b.close();plugin.actionManager.dispose();check(events.size===0,'Exact shared subscriptions retire');style.remove();return true;
})()`),true)}finally{await host.cleanup()}
});

test('production Wu Xing decorates real local notes, refreshes cached fields, retains shared Find/actions/grouping and retires listeners',async()=>{
 const host=await chromiumHarness(output.outputFiles[0].text+';window.sourceModules=sourceModules;');
 try{
 await host.command('Emulation.setDeviceMetricsOverride',{width:1280,height:1000,deviceScaleFactor:1,mobile:false});
 const result=await host.evaluate(`(async()=>{
 const M=sourceModules,errors=[],check=(value,message)=>{if(!value)throw Error(message)},wait=()=>new Promise(resolve=>setTimeout(resolve,50));
 window.addEventListener('error',event=>errors.push(event.message));
 const style=document.createElement('style');style.textContent=${JSON.stringify(readFileSync('styles.css','utf8'))};document.head.append(style);
 const mount=document.createElement('div');mount.className='kplex-app';mount.style.cssText='width:1200px;height:900px;position:relative';document.body.append(mount);
 const pages=new Map(['Focus.md','Concept.md','Concept2.md','Conflict.md','Unknown.md','Missing.md'].map(path=>[path,{path,name:path,file:{path,name:path,extension:'md',basename:path,stat:{mtime:1,ctime:1,size:1}},url:null,isFolder:false,isTag:false,aliases:[],tags:[],styleTags:[],primaryStyleTag:null,noteType:null,maxLabelLength:30,neighbours:new Map()}]));
 const fields=new Map([['Focus.md',{status:'water'}],['Concept.md',{status:'wood'}],['Concept2.md',{status:'wood'}],['Conflict.md',{status:['fire','earth']}],['Unknown.md',{}]]);
 const caches=new Map([...fields].map(([id,frontmatter])=>[id,{frontmatter}])),work={semantic:0,releases:0,presentation:0,reads:0,parses:0,publishes:0,settingsWrites:0},events=new Set();
 const subscribe=fn=>{events.add(fn);return()=>events.delete(fn)},nativeEvents={on:(name,callback)=>{const ref={name,callback};events.add(ref);return ref},offref:ref=>events.delete(ref)};
 const settings=M.migrateAndMergeSettings({animationSpeed:0,graphDepth:1,allowAutozoom:false,embedCentralNode:false,showFolderNodes:false,showTagNodes:false});
 settings.canvasViewSettings=M.editViewConfigurationAt(M.wuXingViewDefinition,{}, {field:'presets',path:['wuxing','diagnostics']},{kind:'set',value:{combined:false}});
 const gate=()=>({top:{visibleCount:0,hasAny:false,complete:true},bottom:{visibleCount:5,hasAny:true,complete:true},left:{visibleCount:0,hasAny:false,complete:true},right:{visibleCount:0,hasAny:false,complete:true}});
 const index={isVisiblePage:()=>true,get:path=>pages.get(path),titleFor:page=>page.name,
 neighbours:(page,role)=>page.path==='Focus.md'&&role==='child'?[...pages.values()].slice(1).map(page=>({page,role,relationType:1,typeDefinition:'Related',linkDirection:1})):[],
 sortNeighbours:rows=>[...rows].sort((a,b)=>a.page.path.localeCompare(b.page.path)),captureSemanticGateRead:()=>({isCurrent:()=>true,read:()=>new Map()}),
 acquireSemanticDemand:()=>{work.semantic++;return()=>work.releases++},acquirePresentationDemand:()=>{work.presentation++;return()=>work.presentation--},
 getNodeVisualRevision:()=>0,resolveNodeVisuals:async()=>new Map(),invalidateNodeVisual:()=>{},gateStats:gate,neighbourCount:()=>0,subscribe,subscribePresentation:subscribe,
 getNeighborhood:()=>({center:pages.get('Focus.md'),parents:[],children:[],leftFriends:[],rightFriends:[],siblings:[]}),visibleRelationshipsWithin:()=>[],explainRelationship:()=>null};
 const session=new M.PlexViewSession(M.builtInPlexViews,()=>{});session.select('wuxing');
 const plugin={settings,index,viewSettingsRegistry:M.builtInCanvasViewSettings,translator:M.createTranslator('en'),app:{workspace:{...nativeEvents},metadataCache:{...nativeEvents,getFileCache:file=>caches.get(file.path)??null},vault:{getFileByPath:path=>pages.get(path)?.file??null,cachedRead:()=>{work.reads++;throw Error('Unexpected body read')}}},
 saveSettings:()=>{work.settingsWrites++;throw Error('Unexpected settings write')},getTypographyDevice:()=> 'desktop',isKplexLeafVisible:()=>true,subscribeKplexVisibility:subscribe,subscribeNodeFlair:subscribe,getHierarchyColorRevision:()=>0,isActionSurfaceCurrent:()=>true,getSavedSettingsPolicy:()=>null};
 plugin.actionManager=new M.ActionManager({readCommandContext:()=>({sharedCenter:null,focusRegion:'graph'}),validateNode:()=>true});
 const actionPorts={current:null},activations=[],props={plugin,index,settings,paintSettings:settings,paintLenses:{lenses:[]},surface:'leaf',hostLeaf:{},predicate:null,lenses:{lenses:[]},filterLayoutMode:'keep',predicateRevision:0,showCrossLinks:true,activePath:'Focus.md',renderRevision:0,semanticRevision:0,findFocusRequest:0,areaSettingsMode:false,onAreaSettingsModeChange:()=>{},onApplyFindFilter:()=>{},appliedFindFilterQuery:null,onClearFindFilter:()=>{},onActivate:page=>activations.push(page.path),onWanderActivate:()=>{},onOpen:()=>{},onOpenInSidecar:async()=>{},onCentralNodeEditorChange:()=>{},onCentralNodeModeChange:()=>{},actionPorts,actionSurfaceId:'wuxing',displayState:{zen:false,fullscreen:false},fullscreenAvailable:false,sidecarOpen:false,viewSession:session};
 const relationshipWrites=[];plugin.openRelationModal=request=>relationshipWrites.push(request);
 const root=M.createRoot(mount);function Harness(){const revision=M.useSyncExternalStore(session.subscribe,session.getSnapshot);return M.createElement(M.PlexGraph,{...props,viewDefinition:session.definition,viewRevision:revision})}
 const render=()=>M.flushSync(()=>root.render(M.createElement(Harness)));render();await wait();
 const getNode=path=>[...mount.querySelectorAll('[data-kplex-keyboard-id]')].find(node=>node.dataset.kplexPath===path),region=id=>[...mount.querySelectorAll('[data-kplex-decoration]')].find(row=>row.dataset.kplexDecoration===JSON.stringify(['facets','wuxing',['water','wood','fire','earth','metal'].includes(id)?'category':'status',id]));
 check(!mount.querySelector('.kplex-view-error'),'Actual Wu Xing scene failed');check(mount.querySelectorAll('.kplex-view-region').length===8,'Five phases plus reachable unclassified statuses '+JSON.stringify({errors,regions:mount.querySelectorAll('.kplex-view-region').length,text:mount.textContent.slice(0,900)}));
 check(region('water').textContent.includes('0 shown locally')&&getNode('Focus.md').querySelector('.kplex-node-badge').textContent==='Water'&&region('wood').textContent.includes('2 shown locally'),'Local counts and fixed attention');
 check(region('conflicting').textContent.includes('1 shown locally')&&region('unresolved').textContent.includes('1 shown locally'),'Conflict and metadata absence stay distinct');
 check(mount.querySelectorAll('.kplex-view-guide').length===10,'Both decorative cycles render');check(getComputedStyle(mount.querySelector('.kplex-view-decorations')).pointerEvents==='none','Decorations cannot capture input');
 const releaseAction=plugin.actionManager.registerSurface({id:'wuxing',generation:1,get implementations(){return actionPorts.current.implementations},readSnapshot:()=>({mounted:true,visible:true,windowId:'test',center:M.actionNodeRef(pages.get('Focus.md')),selected:actionPorts.current.readSelected(),focusRegion:'graph',interactionRevision:0,viewRevision:session.getSnapshot()})});
 const act=async id=>{let promise;M.flushSync(()=>promise=plugin.actionManager.dispatch({id,source:'local-menu',surfaceId:'wuxing'}));const outcome=await promise;await wait();return outcome};
 const zoomAnchor=()=>{const b=getNode('Focus.md').getBoundingClientRect();return{x:b.x+b.width/2,y:b.y+b.height/2}};
 const zoomBefore=zoomAnchor();await act('view.zoom-in');await wait();const zoomAfter=zoomAnchor();
 check(Math.abs(zoomAfter.x-zoomBefore.x)<1&&Math.abs(zoomAfter.y-zoomBefore.y)<1,'Shared zoom must preserve the off-origin viewport focus');
 await act('view.zoom-out');await wait();
 const attention=getNode('Focus.md'),beforeTop=attention.style.top;let camera=mount.querySelector('.kplex-camera').style.transform;
 const viewportBounds=mount.querySelector('.kplex-plex').getBoundingClientRect(),attentionBounds=attention.getBoundingClientRect();
 check(Math.abs(attentionBounds.x+attentionBounds.width/2-viewportBounds.x-viewportBounds.width/2)<3&&Math.abs(attentionBounds.y+attentionBounds.height/2-viewportBounds.y-viewportBounds.height/2)<3,'Autozoom-off navigation must center the off-origin attention occurrence');
 // Use the real shared drag/drop handlers and native adapter, with a finite host drag manager.
 const manager={draggable:null,dragLink:(event,linktext,sourcePath,title,source)=>{event.dataTransfer.setData('text/plain',linktext);return {type:'link',linktext,sourcePath,title,source,file:pages.get(linktext)?.file??null}},onDragStart(event,value){this.draggable=value},onDragEnd(){this.draggable=null}};
 plugin.app.dragManager=manager;const outbound=new DataTransfer();attention.dispatchEvent(new DragEvent('dragstart',{bubbles:true,cancelable:true,dataTransfer:outbound}));
 check(manager.draggable?.source?.node?.path==='Focus.md'&&manager.draggable.source.owner===mount.querySelector('.kplex-plex'),'Wu Xing exports through the shared captured payload owner');
 check(outbound.getData('text/plain')==='Focus.md','Native link payload retains the canonical file');attention.dispatchEvent(new DragEvent('dragend',{bubbles:true,dataTransfer:outbound}));check(manager.draggable===null,'Shared export cleanup retires only its drag');
 const drop=(x,y)=>{const target=document.elementFromPoint(x,y);check(target&&mount.contains(target),'Drop must hit the actual owning canvas');const dataTransfer=new DataTransfer();for(const type of ['dragover','drop'])target.dispatchEvent(new DragEvent(type,{bubbles:true,cancelable:true,dataTransfer,clientX:x,clientY:y}))};
 const concept=pages.get('Concept.md');for(const payload of [{type:'file',file:concept.file},{type:'link',file:concept.file,linktext:concept.path,sourcePath:'Focus.md'}]){
  manager.draggable=payload;drop(attentionBounds.x+attentionBounds.width/2,attentionBounds.y+attentionBounds.height/2);await wait();check(activations.at(-1)==='Concept.md','Shared file/link center drop navigates attention');
 }
 await act('view.fit');await wait();camera=mount.querySelector('.kplex-camera').style.transform;const afterDropNavigation=activations.length,phaseBounds=region('water').querySelector(':scope > rect').getBoundingClientRect();drop(phaseBounds.x+24,phaseBounds.y+20);await wait();
 check(activations.length===afterDropNavigation&&relationshipWrites.length===0,'A classification phase cannot navigate, assign status or write a relationship');manager.draggable=null;
 fields.get('Focus.md').status='fire';for(const ref of [...events])if(ref?.name==='changed')ref.callback(pages.get('Focus.md').file);await wait();
 check(getNode('Focus.md')===attention,'Cached reclassification retained occurrence DOM identity');check(attention.style.top===beforeTop&&attention.querySelector('.kplex-node-badge').textContent==='Fire','Cached property event updated the centered badge without moving attention');check(mount.querySelector('.kplex-camera').style.transform===camera,'Property event preserved manual camera');
 check(region('fire').textContent.includes('0 shown locally'),'Attention is not duplicated in category counts');
 const before={...work},state=JSON.stringify(session.getState());
 settings.canvasViewSettings=M.editViewConfigurationAt(M.wuXingViewDefinition,settings.canvasViewSettings,{field:'presets',path:['wuxing','categories','water','label']},{kind:'set',value:'記憶 / Memory'});settings.canvasViewSettings=M.editViewConfigurationAt(M.wuXingViewDefinition,settings.canvasViewSettings,{field:'presets',path:['wuxing','guides']},{kind:'set',value:false});props.settings={...settings};props.paintSettings=props.settings;render();await wait();
 check(region('water').textContent.includes('記憶 / Memory')&&!mount.querySelector('.kplex-view-guide'),'Type configuration reaches production decoration');check(JSON.stringify(session.getState())===state,'Type settings do not overwrite per-canvas state');check(JSON.stringify(work)===JSON.stringify(before),'Presentation settings do no extra source work');
 await act('selection.center');check(actionPorts.current.readSelected().node.path==='Focus.md','Shared keyboard attention selection');await act('selection.move.right');check(activations.length===afterDropNavigation,'Selection does not activate or retarget a document');
 const find=mount.querySelector('.kplex-find');M.flushSync(()=>find.querySelector('button').click());const input=find.querySelector('input');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'Concept');M.flushSync(()=>input.dispatchEvent(new Event('input',{bubbles:true})));await wait();check(find.textContent.includes('2'),'Shared Find searches admitted Wu Xing notes');
 settings.groupRelations=true;props.settings={...settings};props.paintSettings=props.settings;render();await wait();check(mount.querySelector('.kplex-thought.is-relation-group'),'Shared grouping remains phase-scoped');
 const savedCamera=mount.querySelector('.kplex-camera').style.transform;M.flushSync(()=>session.select('classic'));await wait();M.flushSync(()=>session.select('wuxing'));await wait();check(mount.querySelector('.kplex-camera').style.transform===savedCamera,'View switch restores Wu Xing camera');
 check(!mount.querySelector('.kplex-view-error'),'Switch back to production Wu Xing succeeded');
 releaseAction();root.unmount();session.dispose();plugin.actionManager.dispose();style.remove();mount.remove();return {errors,events:events.size,work};
 })()`);
 assert.deepEqual(result.errors,[]);assert.equal(result.events,0);assert.equal(result.work.reads,0);assert.equal(result.work.parses,0);assert.equal(result.work.publishes,0);assert.equal(result.work.settingsWrites,0);assert.equal(result.work.semantic,result.work.releases);assert.equal(result.work.presentation,0);
 }finally{await host.cleanup()}
});
