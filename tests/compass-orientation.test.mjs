/** Real Compass scene/port/configuration owners. No source acquisition or native writer is
 * available to geometry; native hit-testing and persistence remain separate acceptance. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {plexViewModules, classicFixture} from './support/plexViewFixture.mjs';
const M=await plexViewModules(['src/core/plex/views/classic/definition.ts','src/core/plex/views/classic/configuration.ts','src/core/plex/views/configuration.ts','src/ui/features/gateRelationshipIntent.ts']);

test('source gate creation intent follows RTL ports and modifiers independently of the target gate',()=>{
 const none={altKey:false,ctrlKey:false,metaKey:false,shiftKey:false};
 for(const flipped of [false,true])for(const side of ['top','bottom','left','right']){
  const role=M.sourceGateRole(side,undefined,flipped);
  assert.equal(role,M.classicNodePorts(flipped)[side]);
  for(const targetSide of ['top','bottom','left','right']){
   assert.equal(M.gateCreationRole(role,none),role,'Destination '+targetSide+' must not invert source intent');
   for(const key of Object.keys(none))assert.equal(M.gateCreationRole(role,{...none,[key]:true}),role==='left'?'previous':role==='right'?'next':role);
  }
 }
 assert.equal(M.sourceGateRole('left',{left:'right'},false),'right','Explicit view port wins over fallback');
 assert.equal(M.sourceGateRole('bottom',{top:'child'},false),null,'Absent custom port stays disabled');
 assert.equal(M.gateGroupRole('previous'),'left');assert.equal(M.gateGroupRole('next'),'right');
});

for(const lateralArrangement of ['split','left'])for(const graphDepth of [1,2])test(`Compass mirrors coordinates, bounds and ports without changing meaning: ${lateralArrangement}/${graphDepth}`,()=>{
 const f=classicFixture(M),settings={...f.settings,lateralArrangement,graphDepth};
 f.pages.get('l').name='صديق';f.pages.get('r').name='אתגר';f.pages.get('prev').name='Previous / السابق';
 const before=f.work.neighbours,normal=M.buildScene(f.neighborhood,f.index,settings,false,undefined,true),work=f.work.neighbours-before;
 const start=f.work.neighbours,flipped=M.buildScene(f.neighborhood,f.index,{...settings,flipEastWest:true},false,undefined,true);
 assert.equal(f.work.neighbours-start,work,'Orientation adds no relationship reads');
 assert.equal(flipped.nodes.length,normal.nodes.length);assert.equal(flipped.edges.length,normal.edges.length);
 for(let i=0;i<normal.nodes.length;i++){
  const a=normal.nodes[i],b=flipped.nodes[i];assert.equal(a.page,b.page);assert.equal(a.role,b.role);assert.equal(a.label,b.label);
  assert.equal(b.x,-a.x);assert.equal(b.y,a.y);assert.equal(b.width,a.width);assert.equal(b.height,a.height);
  assert.deepEqual(b.physicalPorts,{top:'parent',bottom:'child',left:'right',right:'left'});
 }
 for(const key of Object.keys(normal.zoneAreas)){const a=normal.zoneAreas[key],b=flipped.zoneAreas[key];assert.equal(b.left,-a.left-a.width);assert.deepEqual({...b,left:a.left},a)}
 for(const key of Object.keys(normal.zoneViewports)){const a=normal.zoneViewports[key],b=flipped.zoneViewports[key];assert.equal(b.left,-a.left-a.width);assert.deepEqual({...b,left:a.left},a)}
 for(let i=0;i<normal.edges.length;i++){
  const a=normal.edges[i],b=flipped.edges[i],{sourcePort,targetPort,...meaning}=b;
  assert.deepEqual(meaning,a);const ports=M.classicPorts(a.role,true);assert.equal(sourcePort,ports.source);assert.equal(targetPort,ports.target);
 }
 assert(flipped.nodes.filter(n=>n.role==='left').every(n=>n.x>0));
 assert(flipped.nodes.filter(n=>n.role==='right').every(n=>lateralArrangement==='left'?n.x>0:n.x<0));
});

test('Compass opt-in has a false default and uses the existing validated configuration boundary',()=>{
 const d=M.classicViewDefinition,old=M.readViewConfiguration(d,{});assert.equal(M.classicFlipped(old),false);
 assert.equal(M.classicConfigurationSchema.fields.flipEastWest.validate('true'),false);
 assert.equal(M.classicFlipped(M.readViewConfiguration(d,{classic:{version:1,values:{flipEastWest:true,future:'retained'}}})),true);
 assert.equal(M.classicFlipped({status:'unavailable',values:{flipEastWest:true}}),false);
 for(const role of ['parent','child','left','right','previous','next']){
  const normal=M.classicPorts(role),flipped=M.classicPorts(role,true);
  if(role==='parent'||role==='child')assert.deepEqual(flipped,normal);else assert.deepEqual(flipped,{source:normal.target,target:normal.source});
 }
});
