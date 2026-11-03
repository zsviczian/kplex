/** Canonical real-module package admission, privacy and atomic import planning. No host/Vault effects are supplied. */
import {archivedFacetPresets} from './support/facetPresetArchive.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {plexViewModules} from './support/plexViewFixture.mjs';
const M=await plexViewModules(['src/core/plex/sharing/validation.ts','src/core/plex/sharing/transfer.ts',
 'src/core/plex/sharing/authoring.ts','src/core/plex/views/facets/templates.ts','src/core/plex/views/facets/configuration.ts',
 'src/core/plex/views/configuration.ts','src/core/plex/views/registry.ts','src/core/plex/views/wuxing/definition.ts',
 'src/core/plex/lensValidation.ts','src/lang/index.ts','src/ui/plexViews/facets/help.ts']);
const copy=value=>structuredClone(value),t=M.createTranslator('en');
const lens={id:'draft-lens',name:'Drafts',enabled:true,scope:'node',mode:'style',expression:'note.state == "draft"',style:{node:{borderColor:{kind:'theme',variable:'--color-blue'},strokeWidth:2}}};
const state=()=>({presets:{...archivedFacetPresets,...M.FACET_TEMPLATES},lenses:[copy(lens)],palette:[]});
const make=(id='arc',preset=archivedFacetPresets[id]??M.FACET_TEMPLATES[id],selected=[],lenses=[lens],palette=[],privateContent=false)=>M.exportFacetPackage(id,preset,
 {name:preset.name||id,labels:Object.fromEntries(preset.order.map(key=>[key,preset.categories[key].label||key])),helpMarkdown:M.effectiveFacetHelp(id,preset,t),locale:'en'},
 palette,lenses,selected,M.FACETS_AUTHORING_CONTEXT,privateContent);
const choices=(targetId='new-preset',extra={})=>({targetId,replace:false,lensIds:[],replacePalette:[],...extra});

test('public HTTPS references are not Windows paths, while actual drive paths and private selectors stay flagged',()=>{
 assert.deepEqual(M.packagePrivacy({helpMarkdown:'[Reference](https://github.com/dumodal/kplex-wuxing)'}),[]);
 for(const value of ['C:/Notes/Private.md','C:\\Notes\\Private.md','file.path.contains("Private/")','[[Private note]]'])assert(M.packagePrivacy({value}).length>0,value);
 assert.deepEqual(M.validatePortablePackage(make('wuxing')).privacy,[]);
});

test('published data-only examples use the exact canonical validator and survive round-trips',()=>{
 for(const name of ['publishing','draft-lens']){
  const source=readFileSync(new URL('./fixtures/portable-presets/'+name+'.json',import.meta.url),'utf8'),result=M.validatePortablePackage(source);
  assert.equal(result.status,'valid',name);assert.deepEqual(M.validatePortablePackage(JSON.stringify(result.value)).value,result.value);assert.deepEqual(result.privacy,[]);
 }
});

test('both built-in presets round-trip actual source/help/layout/diagnostics/guides without translation keys or activation',()=>{
 for(const id of M.FACET_TEMPLATE_ORDER){
  const pkg=make(id),result=M.validatePortablePackage(JSON.stringify(pkg));assert.equal(result.status,'valid',id);assert.deepEqual(result.value,pkg);
  assert.equal(pkg.preset.nameKey,undefined);assert.equal(pkg.preset.helpMarkdown,M.effectiveFacetHelp(id,M.FACET_TEMPLATES[id],t));assert.equal(pkg.preset.helpSourceLocale,'en');
  for(const category of Object.values(pkg.preset.categories))assert.equal(category.labelKey,undefined);
  assert.equal(pkg.lenses,undefined);assert.equal(pkg.palette,undefined);assert(pkg.aiContext.includes('helpMarkdown')&&pkg.aiContext.includes('https://github.com/zsviczian/kplex/'));
 }
 const original=make('arc',{...archivedFacetPresets.arc,helpMarkdown:'',helpSourceLocale:'ja',layout:'vertical',focusAnchor:'right',reverse:true,
  diagnostics:{combined:false,side:'left',orientation:'horizontal',order:['unresolved','checking','conflicting','unassigned'],showEmpty:false},
  areaSizes:{categories:{add:{width:600,height:350}},diagnostics:{combined:{width:800,height:220}}},flow:{direction:'both',style:'line',caption:'Review',captionPosition:'end'},
  flowOverrides:[{source:'add',target:'relate',caption:'',style:'none'}]});
 assert.deepEqual(M.validatePortablePackage(JSON.stringify(original)).value,original);assert.equal(original.preset.helpMarkdown,'');
});

test('canonical admission refuses future, oversized, deeply nested, prototype, executable/unknown fields and malformed safe content',()=>{
 const base=make();
 const bad=[{...base,version:2},{...base,enabled:true},{...base,kind:'plugin'},{...base,id:'__proto__'},
  {...base,preset:{...base.preset,parser:'eval'}},{...base,preset:{...base.preset,helpMarkdown:'[run](javascript:bad)'}},
  {...base,preset:{...base.preset,helpMarkdown:'<script>bad</script>'}},
  {...base,preset:{...base.preset,categories:{...base.preset.categories,add:{...base.preset.categories.add,color:'url(https://bad)'}}}},
  {...base,preset:{...base.preset,categories:{...base.preset.categories,add:{...base.preset.categories.add,color:{kind:'theme',variable:'--color-blue',script:'bad'}}}}},
  {...base,preset:{...base.preset,flow:{direction:'forward',eval:'bad'}}},
  {...base,preset:{...base.preset,diagnostics:{combined:true,scheduler:'bad'}}},
  {...base,aiContext:'x'.repeat(16001)}];
 for(const item of bad)assert.equal(M.validatePortablePackage(item).status,'invalid',JSON.stringify(item).slice(0,160));
 assert.equal(M.validatePortablePackage('{"__proto__":{},"version":1}').status,'invalid');
 assert.equal(M.validatePortablePackage(' '.repeat(65537)).status,'invalid');assert.equal(M.validatePortablePackage('{').status,'invalid');
 const cyclic={...base};cyclic.circular=cyclic;assert.equal(M.validatePortablePackage(cyclic).status,'invalid');
 const inherited=Object.assign(Object.create({execute(){}}),base);assert.equal(M.validatePortablePackage(inherited).status,'invalid');
 let called=0;const accessor={...base};Object.defineProperty(accessor,'run',{enumerable:true,get(){called++;return 'bad'}});
 assert.equal(M.validatePortablePackage(accessor).status,'invalid');assert.equal(called,0,'Admission never executes a getter');
 const hiddenHook={...base};Object.defineProperty(hiddenHook,'toJSON',{value(){called++;return base}});assert.equal(M.validatePortablePackage(hiddenHook).status,'invalid');assert.equal(called,0);
 const hooked=[];Object.setPrototypeOf(hooked,{toJSON(){called++;return []}});assert.equal(M.validatePortablePackage({...base,palette:hooked}).status,'invalid');assert.equal(called,0,'Inherited array serialization hooks are never executed');
 const future=JSON.stringify({...base,version:99});M.validatePortablePackage(future);assert(future.includes('"version":99'),'Refusal never rewrites original source');
});

test('independent focus and center-line options survive reviewed portable import with strict boolean types',()=>{
 for(const focusInCategory of [false,true])for(const centerAnchoredLinks of [false,true]){
  const pkg=make('wuxing',{...M.FACET_TEMPLATES.wuxing,focusInCategory,centerAnchoredLinks});
  const admitted=M.validatePortablePackage(JSON.stringify(pkg));assert.equal(admitted.status,'valid');
  const installed=state(),result=M.applyPortableImport(M.preparePortableImport(admitted.value,choices(),installed),installed);
  assert.equal(result.preset.focusInCategory,focusInCategory);assert.equal(result.preset.centerAnchoredLinks,centerAnchoredLinks);
  for(const field of ['focusInCategory','centerAnchoredLinks'])for(const value of ['true',1,null])
   assert.equal(M.validatePortablePackage({...pkg,preset:{...pkg.preset,[field]:value}}).status,'invalid');
 }
});

test('standalone lenses use shared grammar/styles and export no enabled flag or unrelated lenses',()=>{
 const pkg=M.exportLensPackage(lens,[],M.LENS_AUTHORING_CONTEXT);assert.equal(pkg.lens.enabled,undefined);assert.equal(M.validatePortablePackage(pkg).status,'valid');
 assert.equal(M.exportLensPackage({...lens,name:''},[],M.LENS_AUTHORING_CONTEXT).lens.name,'','Existing untitled lens definitions round-trip without inventing a name');
 for(const change of [{expression:'true'},{expression:'edge.role == "made-up"'},{expression:'fetch("https://bad")'},{expression:'node.unsupported == "bad"'},
  {enabled:true},{style:{node:{strokeWidth:9}}},{style:{edge:{strokeColor:'#fff'}}},{style:{node:{backgroundColor:'var(--unsafe)'}}}])
  assert.equal(M.validatePortablePackage({...pkg,lens:{...pkg.lens,...change}}).status,'invalid',JSON.stringify(change));
 assert.equal(M.validateGraphLensExpression('edge.role == "made-up"').code,'unknown-edge-role','Legacy editor still uses the same extracted owner');
});

test('default exports refuse private paths/selectors without explicit consent and never silently redact semantics',()=>{
 const privateLens={...lens,expression:'file.path.contains("Private/")'};assert.throws(()=>M.exportLensPackage(privateLens,[],M.LENS_AUTHORING_CONTEXT),/approval/);
 const approved=M.exportLensPackage(privateLens,[],M.LENS_AUTHORING_CONTEXT,true);assert.equal(approved.lens.expression,privateLens.expression);
 assert(M.validatePortablePackage(approved).privacy.length>0);
 assert.throws(()=>make('arc',archivedFacetPresets.arc,['missing']),/Unknown/);
 assert.equal(make('arc',archivedFacetPresets.arc,[],[lens,privateLens]).lenses,undefined,'No active/private lenses silently accompany a preset');
});

test('only referenced palette pairs travel; imported colors have explicit keep/replace collision semantics',()=>{
 const pair={id:'accent',name:'Accent',light:'#fff',dark:'#000'},extra={id:'private-color',name:'Other',light:'#123',dark:'#abc'};
 const preset={...archivedFacetPresets.arc,unassignedColor:{kind:'palette',id:'accent'}};
 const pkg=make('arc',preset,[],[lens],[pair,extra]);assert.deepEqual(pkg.palette,[pair]);
 assert.throws(()=>make('arc',preset),/Missing/);
 assert.equal(M.validatePortablePackage({...pkg,palette:[pair,extra]}).status,'invalid','Unreferenced palette content is refused');
 const installed=state();installed.palette=[{...pair,light:'#f00'}];
 const keep=M.applyPortableImport(M.preparePortableImport(pkg,choices(),installed),installed);assert.equal(keep.palette[0].light,'#f00');
 const replace=M.applyPortableImport(M.preparePortableImport(pkg,choices('new-preset',{replacePalette:['accent']}),installed),installed);assert.equal(replace.palette[0].light,'#fff');
 assert.equal(installed.palette[0].light,'#f00','Planning has no effect');
});

test('preview plans preserve unrelated changes, reject stale targets and import only chosen disabled lenses',()=>{
 const dependency={...lens,id:'dependency'},pkg=make('arc',archivedFacetPresets.arc,['dependency'],[dependency]),installed=state();
 const plan=M.preparePortableImport(pkg,choices('new-preset',{lensIds:['dependency']}),installed);
 const updated={...installed,presets:{...installed.presets,other:copy(archivedFacetPresets.para)},lenses:[...installed.lenses,{...lens,id:'other-lens'}]};
 const applied=M.applyPortableImport(plan,updated);assert.equal(applied.lenses.length,3);assert.equal(applied.lenses.find(item=>item.id==='dependency').enabled,false);
 assert.equal(applied.lenses.find(item=>item.id===lens.id).enabled,true);assert.equal(installed.presets['new-preset'],undefined);
 assert.throws(()=>M.applyPortableImport(plan,{...updated,presets:{...updated.presets,'new-preset':archivedFacetPresets.gtd}}),/stale/);
 assert.throws(()=>M.preparePortableImport(pkg,choices('arc'),installed),/explicitly/);
 assert.throws(()=>M.preparePortableImport(pkg,choices('missing',{replace:true}),installed),/explicitly/);
 const none=M.applyPortableImport(M.preparePortableImport(pkg,choices(),installed),installed);assert.equal(none.lenses.length,1);
 const standalone=M.exportLensPackage(lens,[],M.LENS_AUTHORING_CONTEXT),replaced=M.applyPortableImport(M.preparePortableImport(standalone,choices(lens.id,{replace:true}),installed),installed);
 assert.equal(replaced.lenses[0].enabled,false,'Explicit replacement never preserves live activation');
});

test('portable package limits do not bypass the original stored-library bound',()=>{
 const d={id:'wuxing',configuration:M.facetsConfigurationSchema};
 const pkg=make();let stored={};
 stored=M.editViewConfigurationAt(d,stored,{field:'presets',path:['one']},{kind:'set',value:pkg.preset});
 stored=M.editViewConfigurationAt(d,stored,{field:'presets',path:['two']},{kind:'set',value:pkg.preset});
 assert.equal(M.facetLibrary(M.readViewConfiguration(d,stored)).presets.one.helpMarkdown,pkg.preset.helpMarkdown);
 const huge={...pkg.preset,categories:Object.fromEntries(Object.entries(pkg.preset.categories).map(([id,category])=>[id,{...category,values:Array.from({length:50},(_,i)=>'alias-'+i+'x'.repeat(80))}]))};
 assert.equal(M.validatePortablePackage({...pkg,preset:huge}).status,'valid','Package can be parsed for a useful preview');
 assert.throws(()=>M.editViewConfigurationAt(d,stored,{field:'presets',path:['too-large']},{kind:'set',value:huge}),/bound|configuration/i,'Actual queue admission still preserves16K cap');
});
