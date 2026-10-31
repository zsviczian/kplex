/** Non-Classic boundary conformance using the actual explicit SectionExpansion source operation,
 * shared scene measurement, ThoughtNode/edge/tree renderer, fold actions and captured lifetimes. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {chromiumHarness} from './support/browserTypeScript.mjs';
import {plexViewBrowserModules} from './support/plexViewBrowser.mjs';
import {canvasSceneFixture} from './support/canvasSceneFixture.mjs';
const output=await plexViewBrowserModules({captureNotices:true});
const actionSurface=`
 const register=a=>plugin.actionManager.registerSurface({id:a.props.actionSurfaceId,generation:1,get implementations(){return a.ports.current.implementations},
  readSnapshot:()=>({mounted:true,visible:true,windowId:'section-test',center:M.actionNodeRef(pages.get(a.props.activePath)),selected:a.ports.current.readSelected(),focusRegion:'graph',interactionRevision:0,viewRevision:a.session.getSnapshot()})});
`;

for(const view of ['classic','mindmap'])test(`${view}: saved section relationships remain visible and physically attached while evidence is pending`,async()=>{
 const host=await chromiumHarness(output.outputFiles[0].text+';window.sourceModules=sourceModules;');
 try{assert.equal(await host.evaluate(String.raw`(async()=>{${canvasSceneFixture}${actionSurface}
 settings.inferAllLinksAsFriends=false;settings.inverseInfer=false;settings.renderSiblings=false;
 const file=pages.get('A.md').file,body='# First\n[[B]]\n# Second\n[[C]]';file.stat.size=body.length;
 fieldCaches.set('A.md',{frontmatter:{},links:[...body.matchAll(/\[\[([^\]]+)\]\]/g)].map(match=>({link:match[1],position:{start:{line:body.slice(0,match.index).split('\n').length-1,col:0,offset:match.index},end:{offset:match.index+match[0].length}}}))});
 plugin.app.vault.cachedRead=async requested=>{check(requested===file,'Only central source can be read');work.body++;return body};
 plugin.app.metadataCache.getFirstLinkpathDest=link=>pages.get(link+'.md')?.file??null;
 index.evidenceFrom=()=>[];index.publishedInferAllLinksAsFriends=()=>false;
 const canonical=(page,role)=>rows(page,role).map(row=>({...row,relationType:2,linkDirection:2}));
 index.neighbours=canonical;index.getNeighborhood=path=>({center:pages.get(path),parents:canonical(pages.get(path),'parent'),children:canonical(pages.get(path),'child'),leftFriends:[],rightFriends:[],siblings:[]});
 let cached=true,retired=false;index.getSectionPreviewNeighborhood=path=>cached?{...index.getNeighborhood(path),children:index.getNeighborhood(path).children.filter(row=>!retired||row.page.path!=='B.md')}:null;
 const definition=M.builtInPlexViews.resolve('${view}'),project=definition.project,projections=[];
 definition.project=input=>{const p=project(input);projections.push(p);return p};
 const a=await mount(definition),release=register(a),root=()=>a.container.querySelector('[data-kplex-path="A.md"]');
 root().querySelector('.kplex-section-fold-handle:not(.is-branch-disclosure)').click();for(let n=0;n<5;n++)await wait();
 check(a.container.querySelectorAll('.is-kplex-section').length===2,'Both headings shown before hydration');
 if('${view}'==='classic'){
  check(a.container.querySelector('[data-kplex-path$=":B.md"]')&&a.container.querySelector('[data-kplex-path$=":C.md"]'),'Compass outline retains both link targets before hydration');
 }else{
  const edges=projections.at(-1).edges;check(edges.length===2&&edges.every(edge=>edge.sourceSection),'Mind Map canonical edges immediately attach to sections');
  check(edges[0].sourceSection.sectionId!==edges[1].sourceSection.sectionId,'Each connector uses its own heading');
 }
 check(work.body===1&&work.scans===0,'Expansion reads only the source once');
 a.props.renderRevision++;a.render();await wait();check(work.body===1,'Passive presentation never rereads Markdown');
 const cache=fieldCaches.get('A.md');fieldCaches.set('A.md',{...cache});a.props.renderRevision++;a.render();await wait();
 check(a.container.querySelector('[data-kplex-path="B.md"]')&&a.container.querySelector('[data-kplex-path="C.md"]'),'Retired physical metadata proof must retain canonical note targets at the header');
 if('${view}'==='mindmap')check(projections.at(-1).edges.every(edge=>!edge.sourceSection),'Stale metadata must not retain a physical section endpoint');
 fieldCaches.set('A.md',cache);a.props.renderRevision++;a.render();await wait();
 retired=true;a.props.renderRevision++;a.render();await wait();
 if('${view}'==='classic')check(!a.container.querySelector('[data-kplex-path$=":B.md"]'),'A removed canonical row cannot be resurrected from cached local evidence');
 release();a.close();plugin.actionManager.dispose();style.remove();return true;
 })()`),true)}finally{await host.cleanup()}
});

test('Mind Map section labels reserve the same heading chrome as Compass without clipping short names',async()=>{
 const host=await chromiumHarness(output.outputFiles[0].text+';window.sourceModules=sourceModules;');
 try{assert.equal(await host.evaluate(String.raw`(async()=>{${canvasSceneFixture}${actionSurface}
 const names=['Summary','Links','Notes','Reference details'],body=names.map(name=>'# '+name).join('\n');
 pages.get('A.md').file.stat.size=body.length;plugin.app.vault.cachedRead=async()=>{work.body++;return body};
 index.evidenceFrom=()=>[];index.publishedInferAllLinksAsFriends=()=>false;
 const a=await mount(M.mindMapViewDefinition),release=register(a);
 a.container.querySelector('[data-kplex-keyboard-id="root"] .kplex-section-fold-handle:not(.is-branch-disclosure)').click();for(let i=0;i<5;i++)await wait();
 const verify=()=>{const cards=[...a.container.querySelectorAll('.is-kplex-section')];check(cards.length===names.length,'Every source heading remains visible');
  for(let i=0;i<cards.length;i++){const text=cards[i].querySelector('.kplex-thought-text');check(text.textContent===names[i],'Source label was character-truncated');
   check(text.scrollWidth<=text.clientWidth+1,'Heading chrome clips '+names[i]+': '+JSON.stringify({scroll:text.scrollWidth,client:text.clientWidth,card:cards[i].style.width}));
   check(Number.parseFloat(cards[i].style.width)>=172,'Shared heading minimum missing');}};
 verify();for(const size of [16,20]){settings.baseFontSize=size;a.props.settings={...settings};a.props.paintSettings=a.props.settings;a.render();await wait();verify();}
 check(work.body===1&&work.scans===0,'Font/layout changes never reread the section source or scan');
 release();a.close();plugin.actionManager.dispose();style.remove();return true})()`),true)}finally{await host.cleanup()}
});

test('failed explicit section source reads leave a retryable closed outline and actionable feedback',async()=>{
 const host=await chromiumHarness(output.outputFiles[0].text+';window.sourceModules=sourceModules;');
 try{assert.equal(await host.evaluate(`(async()=>{${canvasSceneFixture}${actionSurface}
 plugin.app.vault.cachedRead=async()=>{work.body++;throw Error('Expected test source failure')};
 const a=await mount(M.mindMapViewDefinition),release=register(a),root=()=>a.container.querySelector('[data-kplex-keyboard-id="root"]');
 root().querySelector('.kplex-section-fold-handle:not(.is-branch-disclosure)').click();for(let i=0;i<5;i++)await wait();
 check(work.body===1&&!a.container.querySelector('.is-kplex-section')&&root().querySelector('.kplex-section-fold-handle:not(.is-branch-disclosure)').getAttribute('aria-expanded')==='false','Failed source leaves a closed, retryable central control');
 check(window.testNotices?.length===1&&window.testNotices[0].message===plugin.translator('graph.sectionLoadFailed'),'Only actionable explicit source failure is reported');
 release();a.close();plugin.actionManager.dispose();style.remove();return true})()`),true)}finally{await host.cleanup()}
});

test('Mind Map root sections and graph branches fold independently while attention and canonical relationships stay separate',async()=>{
 const host=await chromiumHarness(output.outputFiles[0].text+';window.sourceModules=sourceModules;');
 try{assert.equal(await host.evaluate(String.raw`(async()=>{${canvasSceneFixture}${actionSurface}
 settings.inferAllLinksAsFriends=false;settings.renderSiblings=false;
 const file=pages.get('A.md').file,body='# Group\n## Repeated\n[[B]]\n## Repeated\n[[C]]';file.stat.size=body.length;
 pages.get('B.md').file.stat.size=12;
 const links=[...body.matchAll(/\[\[([^\]]+)\]\]/g)].map(match=>({link:match[1],position:{start:{line:body.slice(0,match.index).split('\n').length-1,col:0,offset:match.index},end:{offset:match.index+match[0].length}}}));
 fieldCaches.set('A.md',{frontmatter:{},links,tags:[]});
 plugin.app.vault.cachedRead=async requested=>{check(requested===file||requested===pages.get('B.md').file,'Only the declared root document can be read');work.body++;return requested===file?body:'# Other root'};
 plugin.app.metadataCache.getFirstLinkpathDest=link=>pages.get(link.endsWith('.md')?link:link+'.md')?.file??null;
 index.evidenceFrom=path=>path==='A.md'?['B.md','C.md'].map(targetPath=>({targetPath,evidence:[{id:'recorded-'+targetPath,sourcePath:'A.md',targetPath,role:'child',declaredRole:'child',declaredByPath:'A.md',declaredTargetPath:targetPath,sourceKind:'obsidian-link',relationType:2,direction:2}]})):[];
 index.publishedInferAllLinksAsFriends=()=>false;index.neighbours=(page,role)=>rows(page,role).map(row=>({...row,relationType:2,linkDirection:2}));
 const projections=[],definition=M.mindMapViewDefinition,project=definition.project;
 definition.project=input=>{const value=project(input);projections.push(value);return value};
 const a=await mount(definition),release=register(a),root=()=>a.container.querySelector('[data-kplex-keyboard-id="root"]'),sections=()=>[...a.container.querySelectorAll('.is-kplex-section')];
 check(work.body===0&&root().querySelector('.is-branch-disclosure')&&root().querySelector('.kplex-section-fold-handle:not(.is-branch-disclosure)'),'Both supported central controls are distinct and passive');
 const canonical=()=>projections.at(-1).edges.map(({sourceSection,...edge})=>edge),before=JSON.stringify(canonical());
 root().querySelector('.kplex-section-fold-handle:not(.is-branch-disclosure)').click();for(let i=0;i<5;i++)await wait();a.render();
 check(work.body===1&&sections().length===3&&a.container.querySelectorAll('.kplex-section-tree-edge').length===3,'Explicit root expansion reuses the source/tree renderer '+JSON.stringify({work,sections:sections().length,trees:a.container.querySelectorAll('.kplex-section-tree-edge').length}));
 check(JSON.stringify(canonical())===before&&projections.at(-1).edges.every(edge=>edge.sourceSection),'Canonical endpoints/evidence survive physical heading attachment');
 root().querySelector('.is-branch-disclosure').click();await wait();a.render();await wait();
 check(!a.container.querySelector('[data-kplex-path="B.md"]')&&sections().length===3,'Branch fold leaves the root outline expanded '+JSON.stringify({state:a.session.state,sections:sections().length,text:a.container.textContent.slice(-1000)}));
 root().querySelector('.is-branch-disclosure').click();await wait();a.render();await wait();
 sections()[0].querySelector('.kplex-section-fold-handle').click();await wait();a.render();await wait();check(sections().length===1,'Heading fold changes only the source outline');
 a.props.activePath='B.md';a.render();await wait();check(sections().length===1&&root().dataset.kplexPath==='A.md'&&work.body===1,'Ordinary attention retains the pinned root outline without another body read');
 check(a.session.layoutRoot('B.md')==='A.md'&&a.props.activePath==='B.md','Root/attention identities stay independent');
 a.session.setRoot('B.md');a.render();for(let i=0;i<5;i++)await wait();a.render();
 check(!sections().length&&work.body===1,'Reroot retires the old outline without reading another document');
 root().querySelector('.kplex-section-fold-handle:not(.is-branch-disclosure)').click();for(let i=0;i<5;i++)await wait();a.render();
 check(sections().length===1&&sections()[0].textContent.includes('Other root')&&work.body===2,'Explicit reroot replaces only the central source');
 a.session.select('wuxing');a.props.viewDefinition=M.wuXingViewDefinition;a.render();await wait();
 check(!sections().length&&!a.container.querySelector('.kplex-section-fold-handle'),'Unsupported Facets retires all section controls/rows');
 release();a.close();definition.project=project;plugin.actionManager.dispose();check(events.size===0&&work.scans===0,'All source/action lifetimes retire without a scan');style.remove();return true})()`),true)}finally{await host.cleanup()}
});

test('pending Mind Map outline reads cannot attach after the pinned root changes',async()=>{
 const host=await chromiumHarness(output.outputFiles[0].text+';window.sourceModules=sourceModules;');
 try{assert.equal(await host.evaluate(String.raw`(async()=>{${canvasSceneFixture}${actionSurface}
 let finish;plugin.app.vault.cachedRead=file=>{work.body++;return file===pages.get('A.md').file?new Promise(resolve=>{finish=resolve}):Promise.resolve('# Current root')};
 index.evidenceFrom=()=>[];index.publishedInferAllLinksAsFriends=()=>false;
 const a=await mount(M.mindMapViewDefinition),release=register(a),root=a.container.querySelector('[data-kplex-keyboard-id="root"]');
 root.querySelector('.kplex-section-fold-handle:not(.is-branch-disclosure)').click();await wait();check(finish&&work.body===1,'Old root read started');
 a.session.setRoot('B.md');a.render();for(let i=0;i<3;i++)await wait();
 check(!a.container.querySelector('.is-kplex-section')&&work.body===1,'Reroot does not implicitly expand another document');
 a.container.querySelector('[data-kplex-keyboard-id="root"] .kplex-section-fold-handle:not(.is-branch-disclosure)').click();for(let i=0;i<5;i++)await wait();
 finish('# Retired root');for(let i=0;i<3;i++)await wait();a.render();
 check(!a.container.querySelector('.kplex-view-error')&&a.container.querySelectorAll('.is-kplex-section').length===1,'Current root outline remains admitted '+JSON.stringify({work,text:a.container.textContent.slice(-1500)}));
 check(a.container.querySelector('.is-kplex-section').textContent.includes('Current root')&&!a.container.textContent.includes('Retired root'),'Late old-root rows cannot attach');
 check(a.props.activePath==='A.md'&&a.session.layoutRoot('A.md')==='B.md','Source completion cannot navigate or reroot');
 release();a.close();plugin.actionManager.dispose();style.remove();return true})()`),true)}finally{await host.cleanup()}
});

test('unsupported production views hide and reject section actions without body reads',async()=>{
 const host=await chromiumHarness(output.outputFiles[0].text+';window.sourceModules=sourceModules;');
 try{assert.equal(await host.evaluate(`(async()=>{${canvasSceneFixture}${actionSurface}
 for(const definition of [M.wuXingViewDefinition,M.exampleViewDefinition]){
  const a=await mount(definition),release=register(a);check(!a.container.querySelector('[aria-label="'+plugin.translator('graph.unfoldNoteSections')+'"]'),'Unsupported view has no note-section control');
  for(const id of ['sections.toggle','sections.fold-all','sections.unfold-all']){
   const result=await plugin.actionManager.dispatch({id,source:'keyboard',surfaceId:a.props.actionSurfaceId});check(result.status==='unavailable'&&result.reasonKey!=='actions.surface-unavailable','The actual registered section capability refuses keyboard/action execution');
  }
  check(work.body===0,'Unsupported views never load section content');release();a.close();
 }
 plugin.actionManager.dispose();check(events.size===0,'Unsupported action owners cleaned');style.remove();return true;
 })()`),true)}finally{await host.cleanup()}
});

test('explicit non-Classic sections use real source rows and measured left/right anchors, folds and native-editor guards',async()=>{
 const host=await chromiumHarness(output.outputFiles[0].text+';window.sourceModules=sourceModules;');
 try{assert.equal(await host.evaluate(String.raw`(async()=>{${canvasSceneFixture}${actionSurface}
 settings.inferAllLinksAsFriends=false;settings.inverseInfer=false;settings.renderSiblings=false;
 const file=pages.get('A.md').file;let body='# Group\n## Repeated\n[[B]]\n## Repeated\n[[C]]';file.stat.size=body.length;pages.get('A.md').mtime=1;
 const cacheBody=()=>{const links=[...body.matchAll(/\[\[([^\]]+)\]\]/g)].map(match=>({link:match[1],position:{start:{line:body.slice(0,match.index).split('\n').length-1,col:0,offset:match.index},end:{offset:match.index+match[0].length}}}));fieldCaches.set('A.md',{frontmatter:{},links,tags:[]});};cacheBody();
 plugin.app.vault.cachedRead=async requested=>{check(requested===file,'Only the explicitly expanded source is read');work.body++;return body};
 plugin.app.metadataCache.getFirstLinkpathDest=link=>pages.get(link.endsWith('.md')?link:link+'.md')?.file??null;
 index.evidenceFrom=path=>path==='A.md'?['B.md','C.md'].map(targetPath=>({targetPath,evidence:[{id:'recorded-'+targetPath,sourcePath:'A.md',targetPath,
  role:'child',declaredRole:'child',declaredByPath:'A.md',declaredTargetPath:targetPath,sourceKind:'obsidian-link',relationType:2,direction:2}]})):[];
 index.neighbours=(page,role)=>rows(page,role).map(row=>({...row,relationType:2,linkDirection:2}));index.publishedInferAllLinksAsFriends=()=>false;
 const snapshots=[],projections=[],layouts=[],outcomes=[];const dispatch=plugin.actionManager.dispatch.bind(plugin.actionManager);plugin.actionManager.dispatch=async request=>{const result=await dispatch(request);outcomes.push({id:request.id,result});return result};
 const probe={...M.sectionViewProbeDefinition,project:input=>{snapshots.push(input.sections);const p=M.sectionViewProbeDefinition.project(input);projections.push(p);return p},layout:(...args)=>{const p=M.sectionViewProbeDefinition.layout(...args);layouts.push(p);return p}};
 const a=await mount(probe),release=register(a),root=()=>[...a.container.querySelectorAll('[data-kplex-keyboard-id]')].find(row=>row.dataset.kplexPath==='A.md');
 const note=root();check(work.body===0,'Ordinary paint has no section source work');M.flushSync(()=>note.querySelector('.kplex-section-fold-handle').click());for(let i=0;i<5;i++)await wait();
 check(!a.container.querySelector('.kplex-view-error'),'Non-Classic section source admitted');check(work.body===1,'Explicit expansion reads the source once '+JSON.stringify({work,outcomes,states:snapshots.map(row=>row?.status)}));
 const current=()=>snapshots.filter(row=>row?.status==='available').at(-1).snapshot,snapshot=current();
 check(snapshot.rows.length===3&&snapshot.rows.filter(row=>row.label==='Repeated').length===2,'Existing heading owner supplies duplicate labels');
 check(new Set(snapshot.rows.map(row=>row.id)).size===3,'Source revision IDs, not heading labels, identify rows');
 check(a.container.querySelectorAll('.kplex-section-tree-edge').length===3,'Existing shared section tree renderer is reused');
 const p=projections.at(-1),b=p.edges.find(row=>row.targetNode==='B.md'),c=p.edges.find(row=>row.targetNode==='C.md');
 check(b.sourceSection&&c.sourceSection&&b.sourceSection.sectionId!==c.sourceSection.sectionId,'Genuine distinct source placements survive repeated names '+JSON.stringify(snapshot.provenance));
 const path=edge=>a.container.querySelector('[data-kplex-edge-id='+CSS.escape(edge.id)+']').getAttribute('d');
 const start=edge=>path(edge).match(/^M\s*([\d.+-]+)[ ,]+([\d.+-]+)/).slice(1).map(Number);
 const layout=layouts.at(-1),bRow=layout.positions.get('row-'+b.sourceSection.sectionId),cRow=layout.positions.get('row-'+c.sourceSection.sectionId);
 check(Math.abs(start(b)[1]-bRow.y)<0.1&&start(b)[0]<bRow.x,'Left canonical connector uses its measured section left gate');
 check(Math.abs(start(c)[1]-cRow.y)<0.1&&start(c)[0]>cRow.x,'Right canonical connector uses its measured section right gate');
 check(b.source==='root'&&b.sourceNode==='A.md'&&b.relation.role==='child','Physical attachment preserves canonical occurrence, note and relationship');
 const camera=a.container.querySelector('.kplex-camera').style.transform,group=snapshot.rows.find(row=>row.label==='Group');
 const groupNode=[...a.container.querySelectorAll('[data-kplex-keyboard-id]')].find(row=>row.dataset.kplexKeyboardId==='row-'+group.id);
 M.flushSync(()=>groupNode.querySelector('.kplex-section-fold-handle').click());await wait();
 check(current().visible.length===1&&a.container.querySelector('.kplex-camera').style.transform===camera,'Shared folding preserves camera and current visible ancestors');
 const folded=projections.at(-1);check(folded.edges.every(row=>row.sourceSection?.sectionId===group.id),'Folded connectors rebind to the visible ancestor');check(work.body===1,'Folding never rereads or reparses the note');
 const expansion=await M.buildCentralSectionExpansion(plugin,index,pages.get('A.md'));
 const context=M.createPlexSectionViewContext(expansion,'native-proof',new Set(snapshot.rows.map(row=>row.id)),index,()=>true);check(context,'Actual source snapshot can be reused');
 const read=M.plexViewRead(index,()=>true,100,'A.md');const editor=M.prepareViewScene(probe,read,index,'A.md',null,settings,()=>true,{width:640,height:420},()=>true,{translate:plugin.translator,unfolded:new Set(),sections:context});
 check(!editor.failure&&editor.projection.editor==='root'&&editor.scene.nodes.every(row=>!row.page.transient),'Native editor guard retains the document and declines section replacement');
 const revision=snapshot.revision;body='# Renamed\n[[B]]\n## New child\n[[C]]';file.stat.mtime++;file.stat.size=body.length;pages.get('A.md').mtime=file.stat.mtime;cacheBody();
 check(!context.isCurrent(),'A real source revision retires measured row bindings');a.props.semanticRevision++;a.props.renderRevision++;a.render();for(let i=0;i<5;i++)await wait();
 check(current().revision!==revision&&!M.plexSectionReference(current(),b.sourceSection),'Edited source gets a new revision, never an old row coordinate');
 const nextExpansion=await M.buildCentralSectionExpansion(plugin,index,pages.get('A.md')),next=M.createPlexSectionViewContext(nextExpansion,'identity-proof',new Set(nextExpansion.sections.map(row=>row.id)),index,()=>true);check(next,'Fresh revision proof');
 const wrong={...probe,project:input=>{const p=probe.project(input);if(input.sections?.status==='available')p.edges[0].sourceSection={documentId:input.sections.snapshot.documentId,revision:input.sections.snapshot.revision,sectionId:input.sections.snapshot.rows.at(-1).id};return p}};
 const rejected=M.prepareViewScene(wrong,M.plexViewRead(index,()=>true,100,'A.md'),index,'A.md',null,settings,()=>true,undefined,()=>true,{translate:plugin.translator,unfolded:new Set(),sections:next});
 check(rejected.failure,'A view cannot attach a canonical connector to an unrelated source heading');
 const savedPath=file.path;file.path='Renamed.md';check(!next.isCurrent(),'Rename retires the exact document proof');file.path=savedPath;
 const replacement={...file,stat:{...file.stat}};pages.get('A.md').file=replacement;check(!next.isCurrent(),'Same-path/stat replacement cannot reuse an anchor');pages.get('A.md').file=file;
 release();a.close();plugin.actionManager.dispose();check(events.size===0,'Source/fold/action owners release exactly');style.remove();return true;
 })()`),true)}finally{await host.cleanup()}
});

test('switching to an unsupported view retires pending section source work and never publishes its late rows',async()=>{
 const host=await chromiumHarness(output.outputFiles[0].text+';window.sourceModules=sourceModules;');
 try{assert.equal(await host.evaluate(`(async()=>{${canvasSceneFixture}${actionSurface}
 let finish;plugin.app.vault.cachedRead=()=>{work.body++;return new Promise(resolve=>{finish=resolve})};
 const a=await mount(M.sectionViewProbeDefinition),release=register(a),note=[...a.container.querySelectorAll('[data-kplex-keyboard-id]')].find(row=>row.dataset.kplexPath==='A.md');
 M.flushSync(()=>note.querySelector('.kplex-section-fold-handle').click());await wait();check(work.body===1&&finish,'Explicit source operation started');
 M.flushSync(()=>a.session.select('wuxing'));a.props.viewDefinition=M.wuXingViewDefinition;a.render();await wait();finish('# Late heading');await wait();
 check(!a.container.querySelector('.kplex-plex.is-section-expanded')&&!a.container.querySelector('.kplex-section-fold-handle'),'Unsupported transition retires section mode');
 check(!a.container.querySelector('.kplex-section-tree-edge')&&!a.container.querySelector('.kplex-view-error'),'Late source completion cannot replace the new view');
 check(work.body===1,'Retirement never starts another body operation');release();a.close();plugin.actionManager.dispose();check(events.size===0,'Pending source owner cleanup');style.remove();return true;
 })()`),true)}finally{await host.cleanup()}
});


for(const view of ['classic','mindmap'])test(view+': revisiting a note restores section folds and camera without retaining source bodies',async()=>{
 const host=await chromiumHarness(output.outputFiles[0].text+';window.sourceModules=sourceModules;');
 try{assert.equal(await host.evaluate(String.raw`(async()=>{${canvasSceneFixture}${actionSurface}
 const file=pages.get('A.md').file,body='# Group\n## Child';file.stat.size=body.length;
 plugin.app.vault.cachedRead=async requested=>{check(requested===file,'Only expanded note source requested');work.body++;return body};
 index.evidenceFrom=()=>[];index.publishedInferAllLinksAsFriends=()=>false;
 const a=await mount(M.builtInPlexViews.resolve('${view}')),release=register(a);
 const sections=()=>[...a.container.querySelectorAll('.is-kplex-section')];
 a.container.querySelector('[data-kplex-path="A.md"] .kplex-section-fold-handle:not(.is-branch-disclosure)').click();for(let n=0;n<5;n++)await wait();
 check(sections().length===2,'Expanded source headings required');
 sections()[0].querySelector('.kplex-section-fold-handle').click();await wait();check(sections().length===1,'One group folded');
 await plugin.actionManager.dispatch({id:'view.zoom-out',source:'keyboard',surfaceId:a.props.actionSurfaceId});await wait();
 const camera=a.container.querySelector('.kplex-camera').style.transform;
 const go=async path=>{if('${view}'==='mindmap')check(a.session.setRoot(path),'Native root transition accepted');a.props.activePath=path;a.render();for(let n=0;n<5;n++)await wait()};
 await go('B.md');check(sections().length===0,'Different note is initially closed');await go('A.md');
 check(sections().length===1,'Revisited outline restores folded group');check(a.container.querySelector('.kplex-camera').style.transform===camera,'Revisited camera exactly restored');
 check(work.body===2,'Only revisit of previously expanded source rereads its current body');check(work.scans===0,'No vault scan');
 release();a.close();plugin.actionManager.dispose();style.remove();return true})()`),true)}finally{await host.cleanup()}
});
