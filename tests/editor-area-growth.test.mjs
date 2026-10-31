/** Actual shared binding/measurement and pure built-in layouts: editor rectangles remain whole
 * while their containing area grows temporarily. Native document content has a separate lane. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {plexViewModules,classicFixture,viewPage} from './support/plexViewFixture.mjs';
const M=await plexViewModules(['src/ui/plexViews/prepareScene.ts','src/ui/plexViews/classic/occurrenceEditor.ts',
 'src/core/plex/views/wuxing/definition.ts','src/core/plex/views/facets/layout.ts','src/core/plex/views/facets/templates.ts','src/adapters/obsidian/actionNode.ts',
 'src/ui/plexViews/areaVisibility.ts','src/ui/editorOverlayFrame.ts','src/ui/plexViews/occurrenceEditors.ts','src/application/PlexViewSession.ts','src/core/plex/views/registry.ts']);

for(const role of ['parent','child','left','right','sibling'])test(`Compass ${role} area grows in both axes around an exact large editor and restores on close`,()=>{
 const f=classicFixture(M),settings={...f.settings,parentMaxHeight:140,childMaxHeight:160,friendMaxHeight:140,siblingMaxHeight:120},before=JSON.stringify(settings);
 const normal=M.buildScene(f.neighborhood,f.index,settings,false,undefined,true),target=normal.nodes.find(node=>node.role===role),binding={id:'large-editor',viewId:'classic',occurrenceId:M.classicEditorKey(target,f.neighborhood.center.path),target:{nodeId:target.page.path,path:target.page.file.path,fileIdentity:'native'},dimensions:{width:920,height:700},mode:'source',closing:false};
 const opened=M.buildScene(f.neighborhood,f.index,settings,false,undefined,true,{binding,page:target.page}),area=opened.zoneAreas[role],viewport=opened.zoneViewports[role];
 assert(area.width>=968);assert(area.height>=772);if(viewport){assert(viewport.width>=968);assert(viewport.height>=732)}
 const editor=opened.nodes.find(node=>node.occurrenceId===binding.occurrenceId);assert.equal(editor.width,920);assert.equal(editor.height,700);
 assert(editor.x-editor.width/2>=area.left);assert(editor.x+editor.width/2<=area.left+area.width);
 if(viewport){const local=editor.y-viewport.contentTop,scroll=M.revealRowScrollTop(local,editor.height+32,0,viewport.height,viewport.contentHeight),displayY=viewport.top+local-scroll;
  assert(displayY-editor.height/2>=viewport.top);assert(displayY+editor.height/2<=viewport.top+viewport.height);
 }else{assert(editor.y-editor.height/2>=area.top);assert(editor.y+editor.height/2<=area.top+area.height)}
 assert.deepEqual(opened.nodes.find(node=>node.role==='center'),normal.nodes.find(node=>node.role==='center'));
 assert.equal(JSON.stringify(settings),before);assert.deepEqual(M.buildScene(f.neighborhood,f.index,settings,false,undefined,true),normal);
});

/** Finite cached canonical relationships; the renderer receives no body/acquisition capability. */
function facets(layout='circular'){
 const pages=new Map(['Focus','Neighbor','Other'].map(id=>{const page=viewPage(id);page.file.stat={mtime:1,size:1,ctime:1};return[id,page]}));
 const source={get:id=>pages.get(id),titleFor:page=>page.name,isVisiblePage:()=>true,captureSemanticGateRead:()=>({isCurrent:()=>true}),
  neighbours:(page,role)=>page.path==='Focus'&&role==='child'?['Neighbor','Other'].map(id=>({page:pages.get(id),role,relationType:1,linkDirection:1})):[],
  sortNeighbours:rows=>rows,viewScopeCoverage:()=>({coverage:'local',prepared:true,complete:true,pending:false}),explainRelationship:()=>null};
 const template=M.FACET_TEMPLATES['map-roles'],preset={...template,layout,regionWidth:200,regionHeight:160},settings={...M.migrateAndMergeSettings({groupRelations:false}),maxItemCount:16,
  canvasViewSettings:{wuxing:{version:2,values:{presets:{'map-roles':preset}}}}};
 const read=M.plexViewRead(source,()=>true,16,'Focus',256);read.properties={availability:()=> 'available',read:()=>({status:'available',value:'hub'})};
 const prepare=(bindings=[],editorSize)=>M.prepareViewScene(M.wuXingViewDefinition,read,source,'Focus',{version:1,preset:'map-roles'},settings,()=>true,editorSize,()=>true,
  {translate:key=>key,unfolded:new Set()},{bindings,supports:()=>true});
 return {pages,settings,prepare};
}

for(const layout of ['circular','horizontal','vertical','quadrants','concentric'])test(`Facets ${layout} keeps a neighbor editor in its phase/role area and fits its full measured body`,()=>{
 const f=facets(layout),normal=f.prepare();assert.equal(normal.failure,false);
 const target=normal.scene.nodes.find(node=>node.page.path==='Neighbor'),reference=M.actionNodeRef(target.page),binding={id:'facets-editor',viewId:'wuxing',occurrenceId:target.occurrenceId,
  target:{nodeId:'Neighbor',path:target.page.file.path,fileIdentity:reference.fileIdentity},dimensions:{width:920,height:700},mode:'source',closing:false};
 const before=JSON.stringify(f.settings),opened=f.prepare([binding]);assert.equal(opened.failure,false);
 const editor=opened.scene.nodes.find(node=>node.occurrenceId===target.occurrenceId),area=opened.scene.areas.find(area=>area.id===target.areaId),viewport=area.viewport;
 assert.equal(editor.areaId,target.areaId);assert.equal(editor.width,920);assert.equal(editor.height,700);assert(viewport.width>=968);assert(viewport.height>=732);
 assert.deepEqual(opened.scene.nodes.find(node=>node.page.path==='Focus'),normal.scene.nodes.find(node=>node.page.path==='Focus'));
 assert.equal(opened.projection.attention,'Focus');assert.equal(opened.scene.boundEditors[0].binding,binding);assert.equal(JSON.stringify(f.settings),before);
 assert.deepEqual(opened.projection.edges,normal.projection.edges);assert.deepEqual(f.prepare().scene,normal.scene);
});

test('Facets central automatic editor still uses the existing attention dimensions and hybrid mode is registered',()=>{
 const f=facets(),opened=f.prepare([],{width:660,height:410});assert.equal(opened.failure,false);
 assert.equal(M.wuXingViewDefinition.editorHosting,'attention-and-occurrence');const focus=opened.scene.nodes.find(node=>node.page.path==='Focus');assert.equal(focus.width,660);assert.equal(focus.height,410);
});

test('Facets saves occurrence intent without native authority and restores it through the same hybrid host policy',()=>{
 const registry=new M.PlexViewRegistry([{...M.wuXingViewDefinition,id:'classic',editorHosting:undefined},M.wuXingViewDefinition]),session=new M.PlexViewSession(registry,()=>{});
 session.select('wuxing');const opened=session.editors.open({viewId:'wuxing',occurrenceId:'exact-phase-note',target:{nodeId:'Neighbor',path:'Neighbor',fileIdentity:'native-instance'},dimensions:{width:920,height:700},mode:'source'});
 assert.equal(opened.status,'opened');const saved=JSON.parse(JSON.stringify(session.getState()));assert(!JSON.stringify(saved).includes('native-instance'));
 const restored=new M.PlexViewSession(registry,()=>{});restored.restore(saved);assert.equal(restored.definition.id,'wuxing');assert.equal(restored.editors.bindings.length,0);
 const intent=restored.readEditorIntent();assert.equal(intent.occurrenceId,'exact-phase-note');assert.deepEqual(intent.dimensions,{width:920,height:700});session.dispose();restored.dispose();
});


test('expanded native editor frames stay inside the canvas independently of camera and large node geometry',()=>{
 const node={x:10000,y:-10000,width:1400,height:900};
 for(const viewport of [{width:1200,height:900},{width:390,height:380}])for(const camera of [{x:-100000,y:12000,scale:3},{x:0,y:-1200,scale:.3}]){
  const frame=M.editorOverlayFrame(node,camera,viewport,true);
  assert(frame.left>=0&&frame.top>=34);assert(frame.left+frame.width<=viewport.width);assert(frame.top+frame.height<=viewport.height);
  assert.deepEqual(frame,M.editorOverlayFrame({...node,x:-node.x,y:-node.y},{x:500,y:500,scale:2},viewport,true));
 }
 assert.deepEqual(M.editorOverlayFrame({x:0,y:0,width:600,height:400},{x:400,y:300,scale:.5},{width:800,height:600},false),{left:250,top:200,width:300,height:200});
});

for(const extension of ['pdf','png','mp4','webm'])test(extension+' occurrence admission delegates native eligibility and preserves exact file identity',()=>{
 const f=classicFixture(M),page=f.neighborhood.center;page.file.extension=extension;
 const reference=M.actionNodeRef(page),binding={target:{nodeId:reference.identity,path:page.file.path,fileIdentity:reference.fileIdentity}};
 const source={get:()=>page};assert.equal(M.resolveOccurrenceEditorPage(binding,source,()=>true),page);
 assert.equal(M.resolveOccurrenceEditorPage(binding,source,()=>false),null);
 page.file={...page.file};assert.equal(M.resolveOccurrenceEditorPage(binding,source,()=>true),null);
});
