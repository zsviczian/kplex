/** Actual Compass geometry and shared binding admission, with cached finite relationships only. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {plexViewModules,classicFixture,viewPage} from './support/plexViewFixture.mjs';
const M=await plexViewModules(['src/ui/plexViews/classic/occurrenceEditor.ts']);
const makeEditor=(f,node)=>{const occurrenceId=M.classicEditorKey(node,f.neighborhood.center.path);return{page:node.page,binding:{id:'native-compass-1',viewId:'classic',occurrenceId,
 target:{nodeId:node.page.path,path:node.page.file.path,fileIdentity:'owned-file'},dimensions:{width:580,height:340},mode:'source',closing:false}}};

for(const role of ['parent','child','left','right','sibling'])test('Compass '+role+' editor uses measured existing area geometry without changing the center',()=>{
 const f=classicFixture(M);
 if(role==='sibling'){
  // Child witnesses already occupy expanded strips; use a lateral second-order witness here.
  const peripheral=viewPage('peripheral'),read=f.index.neighbours;
  f.index.neighbours=(page,requested)=>page.path==='l'&&requested==='right'?[{page:peripheral,role:'right',relationType:1,linkDirection:0}]:read(page,requested);
  f.neighborhood=M.GraphIndex.prototype.getNeighborhood.call(f.index,'root');
 }
 const settings={...f.settings,graphDepth:2},before=M.buildScene(f.neighborhood,f.index,settings,false,undefined,true),original=before.nodes.find(node=>node.role===role),editor=makeEditor(f,original);
 const scene=M.buildScene(f.neighborhood,f.index,settings,false,undefined,true,editor),node=scene.nodes.find(row=>row.occurrenceId===editor.binding.occurrenceId);
 assert.equal(scene.boundEditors[0].binding,editor.binding);assert.equal(node.page,original.page);assert.equal(node.width,580);assert.equal(node.height,340);
 const root=scene.nodes.find(row=>row.role==='center'),oldRoot=before.nodes.find(row=>row.role==='center');assert.deepEqual(root,oldRoot);
 assert(node.x!==root.x||node.y!==root.y,'The chosen area occurrence must not become the center');
 const closed=M.buildScene(f.neighborhood,f.index,settings,false,undefined,true);assert.deepEqual(closed,before,'Closing restores the original geometry and canonical endpoints');
});
test('same canonical note in two Compass roles retains exact editor and connector occurrence identity',()=>{
 const f=classicFixture(M),shared=f.neighborhood.children[0];f.neighborhood.parents.push({...shared,role:'parent'});
 const normal=M.buildScene(f.neighborhood,f.index,f.settings,false,undefined,true),child=normal.nodes.find(node=>node.page===shared.page&&node.role==='child'),editor=makeEditor(f,child);
 const scene=M.buildScene(f.neighborhood,f.index,f.settings,false,undefined,true,editor),copies=scene.nodes.filter(node=>node.page===shared.page);
 assert.equal(copies.length,2);assert.equal(copies.filter(node=>node.occurrenceId).length,1);assert.equal(copies.find(node=>node.occurrenceId).role,'child');
 assert.equal(scene.edges.find(edge=>edge.targetPath===shared.page.path&&edge.role==='child').targetOccurrence,editor.binding.occurrenceId);
 assert.equal(scene.edges.find(edge=>edge.targetPath===shared.page.path&&edge.role==='parent').targetOccurrence,undefined);
 assert.deepEqual(scene.edges.map(({sourceOccurrence,targetOccurrence,...edge})=>edge),normal.edges,'Canonical evidence/paths are unchanged');
});
test('foreign scope, replaced native file or ambiguous Compass occurrences cannot acquire a binding',()=>{
 for(const kind of ['scope','file','ambiguous']){const f=classicFixture(M),normal=M.buildScene(f.neighborhood,f.index,f.settings,false,undefined,true),node=normal.nodes.find(node=>node.role==='child'),editor=makeEditor(f,node);
  if(kind==='scope')editor.binding.occurrenceId=M.classicEditorKey(node,'different-center');
  if(kind==='file')editor.page={...editor.page,file:{...editor.page.file}};
  if(kind==='ambiguous')f.neighborhood.children.push(f.neighborhood.children[0]);
  assert.equal(M.buildScene(f.neighborhood,f.index,f.settings,false,undefined,true,editor).boundEditors?.length??0,0,kind);
 }
});
test('filter reflow retains only the live editor role occurrence, preserving other hidden rows',()=>{
 const f=classicFixture(M),normal=M.buildScene(f.neighborhood,f.index,f.settings,false,undefined,true),node=normal.nodes.find(node=>node.role==='child'),editor=makeEditor(f,node);
 const hidden={...f.neighborhood,parents:[],children:[],leftFriends:[],rightFriends:[],siblings:[]},retained=M.retainClassicEditor(f.neighborhood,hidden,editor.binding);
 assert.deepEqual(retained.children.map(row=>row.page.path),[node.page.path]);assert.equal(retained.parents.length,0);assert.equal(retained.leftFriends.length,0);
 assert.equal(M.retainClassicEditor(f.neighborhood,hidden),hidden);
});
