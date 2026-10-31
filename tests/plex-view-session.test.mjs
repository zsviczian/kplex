/** Actual internal registry/session policies: isolation, fallback, stale work and bounded restoration.
 * Compass uses explicit editor bindings and save/close preflight. Separate named test-only views
 * retain coverage of compatible legacy central editors without pretending Compass still uses them. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import {plexViewModules} from './support/plexViewFixture.mjs';
const M=await plexViewModules(['src/application/PlexViewSession.ts','src/application/PlexEditorBindings.ts','src/core/plex/views/registry.ts','src/ui/plexViews/builtins.ts','tests/support/plexViewProbe.ts','src/ui/surfaceContinuation.ts']);

const occurrenceIntent = (occurrenceId='B1',fileIdentity='native-B') => ({viewId:'test.bound',occurrenceId,
 target:{nodeId:'B.md',path:'B.md',fileIdentity},dimensions:{width:600,height:360},mode:'source'});

test('only opted-in presets retain the bounded full size inventory across layout and mode switches',()=>{
 const normal=new M.PlexViewSession(M.builtInPlexViews,()=>{}),facets=new M.PlexViewSession(M.builtInPlexViews,()=>{});facets.select('wuxing');
 for(let i=0;i<192;i++){assert.equal(facets.setAreaWidth('area'+i,300+i),true);assert.equal(facets.setAreaHeight('area'+i,200+i),true);assert.equal(normal.setAreaWidth('area'+i,300),i<64);}
 assert.equal(facets.setAreaWidth('overflow',300),false);assert.equal(facets.setAreaHeight('overflow',300),false);
 const restored=new M.PlexViewSession(M.builtInPlexViews,()=>{});restored.restore(JSON.parse(JSON.stringify(facets.getState())));
 assert.equal(Object.keys(restored.getAreaWidths()).length,192);assert.equal(Object.keys(restored.getAreaHeights()).length,192);
 normal.dispose();facets.dispose();restored.dispose();
});

test('independent canvas width and height preferences restore without retargeting another view or canvas',()=>{
 const registry=new M.PlexViewRegistry([...M.builtInPlexViews.available,M.probeViewDefinition]);let writes=0;
 const a=new M.PlexViewSession(registry,()=>writes++),b=new M.PlexViewSession(registry,()=>{});
 assert.equal(Object.hasOwn(a.getState(),'areaWidths'),false,'Old consumers do not gain an empty optional payload');
 a.select('test.situated');b.select('test.situated');const current=a.capture();
 assert.equal(a.setAreaHeight('grove',280),true);assert.equal(a.setAreaWidth('grove',720),true);
 assert.equal(current(),true);assert.deepEqual(a.getAreaHeights(),{grove:280});assert.deepEqual(a.getAreaWidths(),{grove:720});assert.deepEqual(b.getAreaWidths(),{});
 assert.equal(a.setAreaWidth('grove',720),false);
 for(const key of ['constructor','prototype','__proto__'])assert.equal(a.setAreaWidth(key,300),false);
 for(const value of [0,-1,Infinity,100001])assert.equal(a.setAreaWidth('bad',value),false);
 const saved=JSON.parse(JSON.stringify(a.getState())),restored=new M.PlexViewSession(registry,()=>{});restored.restore(saved);
 assert.deepEqual(restored.getAreaWidths(),{grove:720});assert.deepEqual(restored.getAreaHeights(),{grove:280});
 a.select('classic');assert.deepEqual(a.getAreaWidths(),{});a.select('test.situated');assert.deepEqual(a.getAreaWidths(),{grove:720});
 assert(writes>0);a.dispose();assert.equal(a.setAreaWidth('grove',900),false);b.dispose();restored.dispose();
});

test('explicit rooted view entry captures its owning canvas current attention instead of an older saved root',()=>{
 let attention='A.md',otherAttention='Other.md',writes=0;
 const a=new M.PlexViewSession(M.builtInPlexViews,()=>writes++,()=>attention),b=new M.PlexViewSession(M.builtInPlexViews,()=>{},()=>otherAttention);
 a.select('mindmap');assert.equal(a.layoutRoot('unused'),'A.md');assert.equal(writes,1);
 a.setRoot('Old-map.md');a.select('classic');attention='Current-compass.md';a.select('mindmap');
 assert.equal(a.layoutRoot('unused'),'Current-compass.md');assert.equal(b.definition.id,'classic');
 attention='Inspected.md';a.ensureRoot(attention);a.select('mindmap');assert.equal(a.layoutRoot(attention),'Current-compass.md','Ordinary attention and same selection retain the rooted map');
 const restored=new M.PlexViewSession(M.builtInPlexViews,()=>{},()=>attention);restored.restore(JSON.parse(JSON.stringify(a.getState())));assert.equal(restored.layoutRoot(attention),'Current-compass.md','Workspace restoration keeps its explicit map state');
 b.select('mindmap');assert.equal(b.layoutRoot('unused'),'Other.md');assert.equal(a.layoutRoot(attention),'Current-compass.md');
 a.dispose();b.dispose();restored.dispose();
});

test('occurrence editor identity is independent of duplicate notes, caller mutation and geometry',()=>{
 let changes=0;const owner=new M.PlexEditorBindings(()=>changes++),intent=occurrenceIntent(),opened=owner.open(intent);
 assert.equal(opened.status,'opened');const binding=opened.binding,live=owner.capture(binding.id),future=owner.capture('occurrence-editor-2');
 intent.target.path='C.md';intent.dimensions.width=1;
 assert.equal(owner.bindings[0].target.path,'B.md');assert.equal(owner.bindings[0].dimensions.width,600);
 assert.throws(()=>owner.bindings.push(binding));assert.throws(()=>{owner.bindings[0].target.path='C.md'});
 assert.equal(owner.open(occurrenceIntent()).status,'existing');assert.equal(changes,1);
 assert.deepEqual(owner.open(occurrenceIntent('B2')),{status:'unavailable',reason:'capacity'},'Same note in another occurrence cannot replace B1');
 assert.deepEqual(owner.open(occurrenceIntent('B1','recreated-B')),{status:'unavailable',reason:'capacity'},'A new native incarnation cannot replace a live document');
 assert.equal(owner.resize(binding.id,{width:720,height:420}),true);assert.equal(owner.setMode(binding.id,'preview'),true);
 assert.equal(owner.bindings[0].id,binding.id);assert.equal(live(),true);assert.equal(future(),false);
 const close=owner.beginClose(binding.id);assert.equal(owner.bindings[0].closing,true);assert.equal(live(),true,'Native buffer stays mounted while save is pending');
 assert.equal(owner.resize(binding.id,{width:100,height:100}),false);assert.equal(owner.open(occurrenceIntent()).reason,'closing');
 close.cancel();assert.equal(close.commit(),false,'A rejected save cannot later retire the editor');assert.equal(owner.bindings[0].closing,false);
 const accepted=owner.beginClose(binding.id);assert.equal(accepted.commit(),true);assert.equal(accepted.commit(),false);assert.equal(live(),false);
 const replacement=owner.open(occurrenceIntent('B2'));assert.notEqual(replacement.binding.id,binding.id);assert.equal(future(),false,'A pre-admission capture never gains authority');
 const late=owner.beginClose(replacement.binding.id);owner.dispose();assert.equal(late.commit(),false);assert.equal(owner.open(occurrenceIntent()).reason,'closed');
});

test('invalid occurrence intent never acquires capacity or publishes binding state',()=>{
 let changes=0;const owner=new M.PlexEditorBindings(()=>changes++),base=occurrenceIntent();
 for(const bad of [null,{...base,occurrenceId:''},{...base,viewId:'../view'},{...base,mode:'unknown'},
  {...base,target:{...base.target,fileIdentity:''}},{...base,target:{...base.target,nodeId:'x'.repeat(4097)}},
  ...[0,-1,Infinity,NaN,100001].map(width=>({...base,dimensions:{width,height:360}}))])assert.equal(owner.open(bad).reason,'invalid-binding');
 assert.equal(changes,0);assert.deepEqual(owner.bindings,[]);assert.equal(owner.open(base).status,'opened');
});

test('bound editor retirement is explicit and Compass selection cannot bypass editor save and close', /** Current Compass hosting requires native persistence before switching definitions. */ ()=>{
 const bound={...M.probeViewDefinition,id:'test.bound',editorHosting:'occurrence'};
 const registry=new M.PlexViewRegistry([...M.builtInPlexViews.available,M.probeViewDefinition,bound]);
 const a=new M.PlexViewSession(registry,()=>{}),b=new M.PlexViewSession(registry,()=>{});
 a.select(bound.id);const opened=a.editors.open(occurrenceIntent()),live=a.editors.capture(opened.binding.id);
 a.retainTransient(bound.id,{attention:'A.md',camera:{x:1,y:2,scale:1},selected:'B2',unfolded:[]});
 a.readTransient(bound.id,'C.md');a.updateState({root:'R.md'});
 assert.equal(live(),true,'Attention/view preference retirement does not retarget B');assert.equal(a.editors.bindings[0].target.nodeId,'B.md');
 assert.deepEqual(b.editors.bindings,[]);a.select('classic');assert.equal(a.definition.id,bound.id,'Changing definitions requires explicit native close first');
 const close=a.editors.beginClose(opened.binding.id);close.commit();a.select('classic');assert.equal(a.definition.id,'classic');
 const release=a.retainEditor();a.select('test.situated');assert.equal(a.definition.id,'classic','A retained Compass editor cannot be discarded by synchronous selection');
 release();a.select('test.situated');assert.equal(a.definition.id,'test.situated','Selection proceeds after native hosting is released');
 assert.equal(M.probeViewDefinition.editorHosting,undefined);assert.equal(M.builtInPlexViews.resolve('classic').editorHosting,'occurrence');
 assert.throws(()=>new M.PlexViewRegistry([...M.builtInPlexViews.available,{...bound,editorHosting:'unknown'}]));
 assert.throws(()=>new M.PlexViewRegistry([...M.builtInPlexViews.available,{...bound,capabilities:{...bound.capabilities,editor:false}}]));
 a.dispose();b.dispose();assert.equal(a.canSelect('classic'),false);
});

test('rooted sessions retain independent roots and transient geometry while branch removal is preflighted',()=>{
 const rooted={...M.probeViewDefinition,id:'test.rooted',navigation:'rooted',editorHosting:'occurrence'},registry=new M.PlexViewRegistry([...M.builtInPlexViews.available,rooted]);
 const a=new M.PlexViewSession(registry,()=>{}),b=new M.PlexViewSession(registry,()=>{});a.select(rooted.id);b.select(rooted.id);
 a.ensureRoot('R.md');b.ensureRoot('S.md');a.ensureRoot('C.md');assert.equal(a.layoutRoot('C.md'),'R.md');assert.equal(b.layoutRoot('C.md'),'S.md');
 a.retainTransient(rooted.id,{attention:'A.md',scope:'R.md',camera:{x:12,y:34,scale:0.8},selected:'B2',unfolded:['branch-B']});
 const saved=a.readTransient(rooted.id,'C.md');assert.equal(saved.camera.x,12);assert.equal(saved.selected,'B2');assert.deepEqual(saved.unfolded,['branch-B']);
 const c=new M.PlexViewSession(registry,()=>{});c.restore(JSON.parse(JSON.stringify(a.getState())));assert.equal(c.layoutRoot('C.md'),'R.md');
 const binding=a.editors.open({...occurrenceIntent(),viewId:rooted.id}).binding;
 assert.equal(a.setRoot('C.md'),false);assert.equal(a.layoutRoot('C.md'),'R.md');
 assert.equal(a.updateState({removeB:true}),false,'An unmounted/unguarded host cannot remove a binding');
 const release=a.guardState(state=>!state?.removeB);assert.equal(a.updateState({removeB:true}),false);assert.equal(a.updateState({removeB:false}),true);
 release();a.guardState(()=>{throw Error('Unavailable preflight')});assert.equal(a.updateState({removeB:false}),false);
 a.editors.beginClose(binding.id).commit();assert.equal(a.setRoot('C.md'),true);assert.equal(a.readTransient(rooted.id,'C.md'),undefined,'Explicit reroot retires old root geometry');
 a.select('classic');assert.equal(a.layoutRoot('A.md'),'A.md');assert.equal(a.setRoot('R.md'),false,'Legacy attention policy cannot acquire rooted state');
 a.dispose();b.dispose();c.dispose();
});

test('workspace editor restoration carries bounded intent but never grants a stored native file token authority',()=>{
 const bound={...M.probeViewDefinition,id:'test.bound',editorHosting:'occurrence'},registry=new M.PlexViewRegistry([...M.builtInPlexViews.available,bound]);
 const a=new M.PlexViewSession(registry,()=>{});a.select(bound.id);a.editors.open(occurrenceIntent());
 const saved=JSON.parse(JSON.stringify(a.getState()));assert.equal(JSON.stringify(saved).includes('native-B'),false);assert.equal(JSON.stringify(saved).includes('occurrence-editor-'),false);
 const b=new M.PlexViewSession(registry,()=>{});b.restore(saved);assert.deepEqual(b.editors.bindings,[],'Restoration alone creates no live editor');
 assert.deepEqual(b.readEditorIntent(),{viewId:bound.id,occurrenceId:'B1',target:{nodeId:'B.md',path:'B.md'},dimensions:{width:600,height:360},mode:'source'});
 const intent=b.readEditorIntent();intent.target.path='C.md';assert.equal(b.readEditorIntent().target.path,'B.md');
 const opened=b.editors.open({...b.readEditorIntent(),target:{...b.readEditorIntent().target,fileIdentity:'fresh-native-B'}});
 assert.equal(opened.binding.target.fileIdentity,'fresh-native-B');assert.equal(b.readEditorIntent(),null);b.editors.beginClose(opened.binding.id).commit();assert.equal(b.readEditorIntent(),null,'Collapse cannot revive the saved editor');
 for(const editors of [{version:2,bindings:[{future:true}]},{version:1,bindings:[saved.editors.bindings[0],saved.editors.bindings[0]]},
  {version:1,bindings:[{...saved.editors.bindings[0],occurrenceId:'x'.repeat(4097)}]},
  {version:1,bindings:[{...saved.editors.bindings[0],dimensions:{width:Infinity,height:360}}]}]){
  const c=new M.PlexViewSession(registry,()=>{});c.restore({...saved,editors});assert.equal(c.readEditorIntent(),null);assert.deepEqual(c.editors.bindings,[]);c.dispose();
 }
 const future={version:2,bindings:[{future:true}]},c=new M.PlexViewSession(registry,()=>{});c.restore({...saved,editors:future});assert.deepEqual(c.getState().editors,future,'Unsupported intent round-trips inertly');
 a.dispose();b.dispose();c.dispose();
});

test('root restoration at capacity still captures a stable active root',()=>{
 const rooted={...M.probeViewDefinition,id:'test.rooted',navigation:'rooted'},registry=new M.PlexViewRegistry([...M.builtInPlexViews.available,rooted]);
 const session=new M.PlexViewSession(registry,()=>{});session.restore({version:1,id:rooted.id,roots:Object.fromEntries(Array.from({length:16},(_,i)=>['future.'+i,'R'+i]))});
 session.ensureRoot('Actual.md');session.ensureRoot('Other.md');assert.equal(session.layoutRoot('Other.md'),'Actual.md');assert.equal(Object.keys(session.getState().roots).length,16);session.dispose();
});

test('static registration validates identity/version and ships Compass, Mind Map and Wu Xing without test definitions',()=>{
  assert.deepEqual(M.builtInPlexViews.available.map(view=>view.id),['classic','mindmap','wuxing']);
  assert.throws(()=>new M.PlexViewRegistry([M.builtInPlexViews.resolve('classic'),M.builtInPlexViews.resolve('classic')]));
  assert.throws(()=>new M.PlexViewRegistry([M.probeViewDefinition]));
  assert.throws(()=>new M.PlexViewRegistry([{...M.builtInPlexViews.resolve('classic'),version:2}]));
});

test('independent selection retires exact outgoing work without touching shared/native owners',()=>{
  const registry=new M.PlexViewRegistry([...M.builtInPlexViews.available,M.probeViewDefinition]),writes=[],a=new M.PlexViewSession(registry,()=>writes.push('A')),b=new M.PlexViewSession(registry,()=>writes.push('B'));
  const old=a.capture(),other=b.capture();let disposal=0;
  a.own(()=>{disposal++;throw Error('One failing resource');});a.own(()=>disposal++);
  a.select('test.situated');assert.equal(disposal,2);assert.equal(old(),false);assert.equal(other(),true);
  assert.equal(a.definition.id,'test.situated');assert.equal(b.definition.id,'classic');assert.deepEqual(writes,['A']);
  const fresh=a.capture();a.select('test.situated');assert.equal(fresh(),true);assert.equal(disposal,2);
  a.dispose();assert.equal(fresh(),false);assert.equal(other(),true);b.dispose();
});

test('unknown preference payloads round-trip while fallback/recovery retain saved state',()=>{
  const registry=new M.PlexViewRegistry([...M.builtInPlexViews.available,M.probeViewDefinition]);
  const a=new M.PlexViewSession(registry,()=>{});a.restore({version:1,id:'future.view',states:{'future.view':{version:3,axis:'time'},'test.situated':{zoom:0.5}}});
  assert.equal(a.definition.id,'classic');assert.equal(a.getState().id,'future.view');assert.deepEqual(a.getState().states['future.view'],{version:3,axis:'time'});
  a.select('test.situated');assert.deepEqual(a.state,{zoom:0.5});a.recover();assert.equal(a.definition.id,'classic');
  assert.deepEqual(a.getState().states['future.view'],{version:3,axis:'time'});
  a.select('test.situated');a.updateState({camera:{x:1,y:2,scale:0.8}});
  const b=new M.PlexViewSession(registry,()=>{});b.restore(JSON.parse(JSON.stringify(a.getState())));assert.equal(b.definition.id,'test.situated');assert.deepEqual(b.state,a.state);
  b.restore({version:1,id:'classic'});assert.equal(b.definition.id,'test.situated','Only initial native restoration is accepted');a.dispose();b.dispose();
});

test('malformed, oversized, cyclic and deep state cannot retain unbounded workspace payloads',()=>{
  const registry=new M.PlexViewRegistry([...M.builtInPlexViews.available,M.probeViewDefinition]),a=new M.PlexViewSession(registry,()=>{});
  a.select('test.situated');const cyclic={};cyclic.self=cyclic;
  for(const value of [cyclic,{huge:'x'.repeat(17000)},Array.from({length:10}).reduce(value=>({value}),{})]){
    a.updateState(value);assert.equal(a.state,null);
  }
  a.select('../unsafe');assert.equal(a.definition.id,'test.situated');a.dispose();a.select('classic');assert.equal(a.definition.id,'test.situated');
});

test('compatible legacy central editors, per-view heights and transient geometry survive only their intended scope', /** Explicit legacy fixtures keep compatibility coverage separate from current Compass policy. */ ()=>{
  const legacy={...M.probeViewDefinition,id:'test.central-editor'};
  const incompatible={...M.probeViewDefinition,id:'test.no-editor',capabilities:{...M.probeViewDefinition.capabilities,editor:false}};
  const registry=new M.PlexViewRegistry([...M.builtInPlexViews.available,M.probeViewDefinition,legacy,incompatible],legacy.id);
  let writes=0;const a=new M.PlexViewSession(registry,()=>writes++),release=a.retainEditor();
  a.select('test.no-editor');assert.equal(a.definition.id,legacy.id);assert.equal(writes,0);
  a.select('test.situated');assert.equal(a.definition.id,'test.situated');const current=a.capture();
  assert.equal(a.setAreaHeight('groveHeight',170),true);assert.equal(current(),true,'Preference changes do not retire the view');
  for(const key of ['__proto__','constructor','prototype']) assert.equal(a.setAreaHeight(key,150),false);
  assert.equal(a.setAreaHeight('bad',Infinity),false);
  const transient={attention:'Focus.md',camera:{x:40,y:-10,scale:0.8},selected:'repeat-above',unfolded:['one']};
  a.retainTransient('test.situated',transient);transient.camera.x=999;
  assert.equal(a.readTransient('test.situated','Focus.md').camera.x,40,'Caller mutation cannot alter the retained camera');
  a.select(legacy.id);assert.deepEqual(a.getAreaHeights(),{});a.select('test.situated');assert.deepEqual(a.getAreaHeights(),{groveHeight:170});
  const saved=JSON.parse(JSON.stringify(a.getState()));assert.equal(JSON.stringify(saved).includes('repeat-above'),false);
  const b=new M.PlexViewSession(registry,()=>{});b.restore(saved);assert.deepEqual(b.getAreaHeights(),{groveHeight:170});assert.equal(b.readTransient('test.situated','Focus.md'),undefined);
  assert.equal(a.readTransient('test.situated','Other.md'),undefined);assert.equal(a.readTransient('test.situated','Focus.md').camera.x,40,'Revisiting a recent note restores its presentation');
  release();release();a.select('test.no-editor');assert.equal(a.definition.id,'test.no-editor');a.dispose();b.dispose();
});

test('legacy central editors switch only between compatible test views until released', /** Legacy attention-only support remains covered independently of Compass's explicit bindings. */ ()=>{
 const legacy={...M.probeViewDefinition,id:'test.central-editor'};
 const registry=new M.PlexViewRegistry([...M.builtInPlexViews.available,M.probeViewDefinition,legacy],legacy.id),session=new M.PlexViewSession(registry,()=>{}),release=session.retainEditor();
 assert.equal(session.canSelect('mindmap'),false);session.select('mindmap');assert.equal(session.definition.id,legacy.id);
 assert.equal(session.canSelect('classic'),false,'Current Compass hosting also requires save and close');
 assert.equal(session.canSelect('test.situated'),true);session.select('test.situated');assert.equal(session.definition.id,'test.situated');
 session.select('mindmap');assert.equal(session.definition.id,'test.situated');release();assert.equal(session.canSelect('mindmap'),true);session.select('mindmap');assert.equal(session.definition.id,'mindmap');session.dispose();
});


for(const saveSucceeds of [false,true])test('Compass view change '+(saveSucceeds?'waits for save and close':'retains its editor after a failed save'), /** The production session must preserve the binding and current view until its captured native host accepts persistence. */ async()=>{
 const session=new M.PlexViewSession(M.builtInPlexViews,/** Session persistence is unrelated to native file saving. */ ()=>{});
 const intent={...occurrenceIntent(),viewId:'classic'},opened=session.editors.open(intent),binding=opened.binding;
 const release=session.retainEditor();let finish,saves=0;
 const unguard=session.guardSelection(/** Model only the host save result; real native editor callbacks are covered in editor-switch tests. */ async()=>{
   saves++;const saved=await new Promise(/** Keep native persistence pending while observing session behavior. */ resolve=>{finish=resolve});
   if(!saved)return false;
   session.editors.beginClose(binding.id).commit();release();return true;
 });
 const pending=session.requestSelection('mindmap');
 assert.equal(saves,1);assert.equal(session.definition.id,'classic');assert.equal(session.editors.bindings[0],binding);
 session.select('mindmap');assert.equal(session.definition.id,'classic','Synchronous selection cannot bypass a pending save');
 finish(saveSucceeds);assert.equal(await pending,saveSucceeds);
 assert.equal(session.definition.id,saveSucceeds?'mindmap':'classic');
 assert.equal(session.editors.bindings.length,saveSucceeds?0:1);
 if(!saveSucceeds)assert.equal(session.editors.bindings[0],binding,'Failed save retains the original note binding');
 unguard();release();session.dispose();
});

test('action snapshot reads view retirement synchronously before React can publish another render',()=>{
 const source=ts.createSourceFile('usePlexActions.ts',readFileSync('src/ui/usePlexActions.ts','utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);let body;
 /** Compile the actual host snapshot callback; this fixture supplies only its finite native facts. */
 const visit=node=>{if(ts.isVariableDeclaration(node)&&node.name.getText(source)==='readSnapshot')body=node.initializer.getText(source);ts.forEachChild(node,visit)};visit(source);assert(body);
 const emitted=ts.transpileModule('const read='+body+';',{compilerOptions:{target:ts.ScriptTarget.ES2021}}).outputText;
 const registry=new M.PlexViewRegistry([...M.builtInPlexViews.available,M.probeViewDefinition]),session=new M.PlexViewSession(registry,()=>{});
 const root={isConnected:true,ownerDocument:{defaultView:{},activeElement:null},querySelector:()=>null};
 const current={current:{readViewRevision:session.getSnapshot,root:{current:root},plugin:{isKplexLeafVisible:()=>true,actionWindowId:()=> 'window',hasAssociatedEditor:()=>false},graph:{current:null}}};
 const read=Function('current','interactionRevision','commandFocusRegion','actionNodeRef','plexFocusRegion',emitted+';return read')(current,{current:0},{current:'graph'},()=>assert.fail('No canonical target needed'),()=> 'graph');
 const before=read();session.select('test.situated');const after=read();
 assert.notEqual(after.viewRevision,before.viewRevision,'An old React options object must not conceal the synchronous retirement');session.dispose();assert.notEqual(read().viewRevision,after.viewRevision);
});


test('native picker focus return can advance interaction while view, document and attention fences remain strict',()=>{
 let root={isConnected:true,ownerDocument:{}},snapshot={mounted:true,interactionRevision:1,viewRevision:1,center:{identity:'Focus',fileIdentity:'native'}};
 const strict=M.captureSurfaceContinuation(()=>root,()=>snapshot),picker=M.captureSurfaceContinuation(()=>root,()=>snapshot,{checkInteraction:false});
 snapshot={...snapshot,interactionRevision:2};assert.equal(strict(),false);assert.equal(picker(),true,'Native close returns focus before delivering its owned choice');
 snapshot={...snapshot,viewRevision:2};assert.equal(picker(),false,'Focus return never permits an outgoing view');
 snapshot={...snapshot,viewRevision:1,center:{identity:'Other',fileIdentity:'native'}};assert.equal(picker(),false);
 snapshot={...snapshot,center:{identity:'Focus',fileIdentity:'native'}};root={...root,ownerDocument:{}};assert.equal(picker(),false,'A replaced native document cannot deliver the captured choice');
});


test('recent presentation history has finite entry and byte budgets and remains session-only',()=>{
 const session=new M.PlexViewSession(M.builtInPlexViews,()=>{}),camera={x:123,y:-456,scale:1.7};
 for(let i=0;i<1000;i++)session.retainTransient('classic',{attention:'note'+i,camera,selected:null,unfolded:[],sections:{expanded:true,unfolded:['fold'+i]}});
 assert.equal(session.readTransient('classic','note0'),undefined);assert.deepEqual(session.readTransient('classic','note999').sections,{expanded:true,unfolded:['fold999']});
 const entries=session.transient;assert(entries.size<=64);assert([...entries].reduce((n,[k,v])=>n+k.length+JSON.stringify(v).length,0)<=65536);
 const restored=new M.PlexViewSession(M.builtInPlexViews,()=>{});restored.restore(session.getState());assert.equal(restored.readTransient('classic','note999'),undefined);
 const huge=Array.from({length:256},(_,i)=>String(i)+'x'.repeat(4090));
 for(let i=0;i<100;i++)session.retainTransient('classic',{attention:'large'+i,camera,selected:null,unfolded:huge,sections:{expanded:true,unfolded:huge}});
 assert([...entries].reduce((n,[k,v])=>n+k.length+JSON.stringify(v).length,0)<=65536);session.dispose();restored.dispose();
});
