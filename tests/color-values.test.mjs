/** Portable production color contracts: intent preservation, explicit alpha, safe identities and schema gates. */
import assert from "node:assert/strict";
import test from "node:test";
import {loadPortableModules} from "./support/portableTypeScript.mjs";
const {exports:m}=loadPortableModules(["src/core/contracts/colorValue.ts","src/core/plex/colorPreferences.ts","src/core/plex/colorEditing.ts","src/core/contracts/appearance.ts","src/core/graph/settingsPolicy.ts"]);

test("literal round trips preserve spelling and opacity while RGB edits retain exact non-byte alpha", /** Exercise the real parser and explicit-edit serializer, including transparent zero. */ () => {
  for(const value of ["#123", "#1234", "#123456", "#12345600", "#AbCdEf80", "rgba(12, 34, 56, 0.123456789)", "rgb(10% 20% 30% / 0%)", "transparent"]){
    assert.equal(m.copyColorValue(value),value);const parsed=m.parseLiteralColor(value);assert(parsed);
    assert(m.colorValuesEqual(value,m.formatLiteralColor(parsed)));
    const edited=m.replaceLiteralRgb(parsed,"#ffeedd");assert.equal(m.parseLiteralColor(edited).alpha,parsed.alpha);
  }
  for(const bad of ["#12", "#12345", "rgb(1 2 3 0.5)", "rgb(1,2,3 / .5)", "rgba(1,2,3,NaN)", "rgba(1,2,3,1.01)","var(--x)","url(https://example.invalid/image)","12px",""])
    assert.equal(m.parseLiteralColor(bad),null,bad);
  assert.equal(m.colorValuesEqual(undefined,"transparent"),false);
  assert.equal(m.colorValuesEqual("#112233", "#112233ff"),true);
  assert.equal(m.copyColorValue("rebeccapurple"),"rebeccapurple","Opaque legacy literal intent is not destructively normalized by a copy");
  assert.equal(m.sanitizeColorValue("url(https://example.invalid/image)"),undefined);
});

test("theme/palette identities survive detached copies and equality never collapses resolved lookalikes", /** The saved source identity, not its current RGB, defines a meaningful override. */ () => {
  const a={kind:"theme",variable:"--Accent-X"},b={kind:"palette",id:"stable-A"};
  assert.deepEqual(m.copyColorValue(a),a);assert.notEqual(m.copyColorValue(a),a);assert.deepEqual(m.copyColorValue(b),b);
  assert.equal(m.colorValuesEqual(a,{kind:"theme",variable:"--accent-x"}),false);
  assert.equal(m.colorValuesEqual(b,{kind:"palette",id:"stable-B"}),false);
  for(const value of ["var(--x)","--x: red", "--x);color:red", "--x x", "--"]){assert.equal(m.isThemeColorName(value),false);}
  assert.equal(m.isThemeColorName("--Accent-X"),true);
  const damaged={kind:"theme",variable:"--broken: red"};assert.deepEqual(m.copyColorValue(damaged),damaged);
  assert.equal(m.colorIdentityText(a),"--Accent-X");assert.equal(m.colorIdentityText(b,[{id:"stable-A",name:"Renamed"}]),"Renamed");
  assert.equal(m.colorIdentityText(b),"stable-A");
});

test("palette schemas and unrepresentable data persist read-only rather than losing future intent", /** Reload known pairs and extensions; unknown formats never become successful lossy migrations. */ () => {
  const p=m.defaultColorPreferences();p.palette.push({id:"stable-1",name:"Δ concept",light:"#12345600",dark:"rgba(3, 4, 5, .123456)"});
  p.semantic.origin={kind:"palette",id:"missing-but-retained"};p.compass.intensity=0;
  p.futureExtension={supportedElsewhere:true};
  const loaded=m.migrateColorPreferences(JSON.parse(JSON.stringify(p)));
  assert.deepEqual(loaded.preferences,p);assert.equal(loaded.future,undefined);
  assert.equal(m.compassIntensity(loaded.preferences,"light"),0);assert.equal(m.compassIntensity(loaded.preferences,"dark"),0);
  const defaults=m.defaultColorPreferences();assert.equal(m.compassIntensity(defaults,"light"),.07);assert.equal(m.compassIntensity(defaults,"dark"),.07);assert.equal(defaults.compass.enabled,false);
  for(const raw of [{version:2,palette:[{newData:true}]},{...p,palette:[{...p.palette[0],dark:"future-color-function()"}]},{...p,palette:[...p.palette,...p.palette]}]){
    const result=m.migrateColorPreferences(raw);assert.equal(result.future,raw);assert.deepEqual(result.preferences,m.defaultColorPreferences());
  }
});

test("the four semantic slots reject direct and indirect cycles without treating palette literals as formulas", /** Bounded graph safety includes slots leading into another slot's cycle. */ () => {
  const p=m.defaultColorPreferences();assert.deepEqual(m.cyclicSemanticColorSlots(p),[]);
  p.semantic.origin={kind:"theme",variable:"--kplex-semantic-origin"};assert.deepEqual(m.cyclicSemanticColorSlots(p),["origin"]);
  p.semantic.origin={kind:"theme",variable:"--kplex-semantic-support"};p.semantic.support={kind:"theme",variable:"--kplex-semantic-development"};
  p.semantic.development={kind:"theme",variable:"--kplex-semantic-support"};
  assert.deepEqual(m.cyclicSemanticColorSlots(p),["origin","development","support"]);
  p.semantic.support={kind:"palette",id:"literal-pair"};assert.deepEqual(m.cyclicSemanticColorSlots(p),[]);
});

test("paint classification retains every non-color policy and reads configured sources without mutation", () => {
 const base={hierarchy:{hidden:[],parents:[],children:[],leftFriends:[],rightFriends:[],previous:[],next:[],exclusions:[]},inferAllLinksAsFriends:true,inverseInfer:false,
  showFullTagName:false,noteTypeField:'Note type',primaryTagField:'Style',tagStyleList:[],baseNodeStyle:{fontSize:18},baseLinkStyle:{strokeWidth:1},
  colorPreferences:m.defaultColorPreferences(),noteTypeStyles:{},tagNodeStyles:{},hierarchyLinkStyles:{},graphLenses:[]};
 const before=m.captureSettingsPolicy(base);
 for(const edit of [s=>s.backgroundColor={kind:'theme',variable:'--background-primary'},s=>s.baseNodeStyle.textColor='#abcdef00',
  s=>s.colorPreferences.palette.push({id:'stable',name:'Name',light:'#123456',dark:'#abcdef'}),
  s=>s.noteTypeStyles.Type={textColor:{kind:'palette',id:'stable'}}]){
   const next=structuredClone(base);edit(next);const effects=m.classifySettingsChange(before,m.captureSettingsPolicy(next));assert.equal(effects.paintOnly,true);assert.equal(effects.semanticInvalidation,false);assert.equal(effects.presentationFacets,false);assert.equal(effects.searchTerms,false);
 }
 for(const edit of [s=>s.baseNodeStyle.fontSize=21,s=>s.baseNodeStyle.prefix='x',s=>s.tagStyleList.push('#x'),s=>s.graphLenses.push({id:'a',name:'Name',mode:'style',scope:'node',enabled:true,expression:'node.label contains x',style:{node:{textColor:'#123456'}}})]){
   const next=structuredClone(base);edit(next);const effects=m.classifySettingsChange(before,m.captureSettingsPolicy(next));if(effects.render)assert.equal(effects.paintOnly,false);
 }
 const lens={id:'a',name:'Lens',mode:'style',scope:'node',enabled:true,expression:'node.label contains x',style:{node:{textColor:'#123456'}}};
 base.graphLenses=[lens];const next=structuredClone(base);next.graphLenses[0].style.node.textColor={kind:'theme',variable:'--text-normal'};
 assert.equal(m.classifySettingsChange(m.captureSettingsPolicy(base),m.captureSettingsPolicy(next)).paintOnly,true);
 const configured=Object.freeze({baseNodeStyle:Object.freeze({textColor:Object.freeze({kind:'palette',id:'stable'}),fontSize:18}),backgroundColor:'#00000000',unrelated:{textColor:'#ffffff'}});
 assert.deepEqual(m.appearanceColorReferences(configured),[{kind:'palette',id:'stable'},'#00000000']);
 const replacement=structuredClone(configured);m.mapAppearanceColors(replacement,value=>typeof value==='object'&&value?.kind==='palette'?'#abcdef80':value);
 assert.deepEqual(replacement.baseNodeStyle,{textColor:'#abcdef80',fontSize:18});assert.deepEqual(replacement.unrelated,configured.unrelated);
});

test("opaque future/null identities compare safely without coercion or accidental source equality",()=>{
 assert.equal(m.colorValuesEqual(null,null),true);assert.equal(m.colorValuesEqual(null,undefined),false);assert.equal(m.colorValuesEqual(null,{kind:'theme',variable:'--text-normal'}),false);
 assert.equal(m.colorValuesEqual({kind:'theme',variable:null},{kind:'theme',variable:null}),true);assert.equal(m.colorValuesEqual({kind:'future'},{kind:'future'}),false);
});


test("named pair edits merge only changed fields and deletion rewrites every configured consumer atomically",()=>{
 const settings={baseNodeStyle:{textColor:{kind:'palette',id:'a'},fontSize:19},baseLinkStyle:{strokeColor:{kind:'palette',id:'a'}},
  noteTypeStyles:{Type:{borderColor:{kind:'palette',id:'a'},extension:{id:'a'}}},tagNodeStyles:{},hierarchyLinkStyles:{},
  backgroundColor:{kind:'palette',id:'a'},graphLenses:[{style:{node:{backgroundColor:{kind:'palette',id:'a'}},edge:{textColor:{kind:'palette',id:'a'}}}}],colorPreferences:m.defaultColorPreferences()};
 settings.colorPreferences.palette=[{id:'a',name:'A',light:'#11223300',dark:'rgba(1,2,3,.123456789)'},{id:'b',name:'B',light:'#ffffff',dark:'#000000'}];
 settings.colorPreferences.semantic.origin={kind:'palette',id:'a'};settings.colorPreferences.compass.fills.north={kind:'palette',id:'a'};
 assert.equal(m.namedColorUsage(settings).get('a'),8);
 const opening={...settings.colorPreferences.palette[0]};settings.colorPreferences.palette[0].dark='#55667780';settings.colorPreferences.palette[0].extension=true;
 m.saveNamedColor(settings,opening,{...opening,name:'Renamed'});
 assert.deepEqual(settings.colorPreferences.palette[0],{...opening,name:'Renamed',dark:'#55667780',extension:true});
 m.deleteNamedColor(settings,'a',{kind:'palette',id:'b'});
 assert.equal(m.namedColorUsage(settings).get('a'),undefined);assert.equal(m.namedColorUsage(settings).get('b'),8);
 assert.deepEqual(settings.noteTypeStyles.Type.extension,{id:'a'});assert.equal(settings.baseNodeStyle.fontSize,19);
 assert.throws(()=>m.saveNamedColor(settings,opening,{...opening,name:'Restore'}));
});

test("destructive palette edits reject uncertain known sources and preserve all state on precondition failure",()=>{
 const p=m.defaultColorPreferences();p.palette=[{id:'a',name:'A',light:'#123456',dark:'#abcdef'}];
 for(const raw of [null,{kind:'future',payload:['a']},{kind:'theme',variable:['--text-normal']}]){
  const settings={colorPreferences:structuredClone(p),baseNodeStyle:{textColor:raw}};const before=structuredClone(settings);
  assert.equal(m.appearanceHasUnsupportedColors(settings),true);assert.throws(()=>m.deleteNamedColor(settings,'a',undefined));assert.deepEqual(settings,before);
 }
 const settings={colorPreferences:p,baseNodeStyle:{textColor:{kind:'palette',id:'a'}}};
 assert.throws(()=>m.deleteNamedColor(settings,'a',{kind:'palette',id:'a'}));assert.equal(p.palette.length,1);
 assert.throws(()=>m.deleteNamedColor(settings,'a',{kind:'palette',id:'missing'}));assert.equal(p.palette.length,1);
});

test("explicit standard adoption changes only listed color slots and detached parent saves retain concurrent replacements",()=>{
 const initial={textColor:{kind:'palette',id:'old'},backgroundColor:'#12345600',fontSize:20};
 const edited={...initial,fontSize:23},latest={...initial,textColor:{kind:'palette',id:'replacement'}};
 assert.deepEqual(m.mergeStyleDraft(initial,edited,latest,m.NODE_COLOR_FIELDS),{...edited,textColor:latest.textColor});
 const prefs=m.defaultColorPreferences(),settings={baseNodeStyle:initial,centralNodeStyle:{textColor:'#abcdef',maxWidth:370},baseLinkStyle:{strokeColor:'#ffffff',strokeWidth:2},backgroundColor:'transparent',
  noteTypeStyles:{Type:{textColor:'#445566'}},graphLenses:[{style:{node:{textColor:'#556677'}}}],colorPreferences:prefs,unrelated:'kept'};
 const before=structuredClone(settings);assert.deepEqual(m.standardColorSlots(settings),['backgroundColor','baseNodeStyle.backgroundColor','baseNodeStyle.textColor','centralNodeStyle.textColor','baseLinkStyle.strokeColor']);
 m.adoptStandardThemeColors(settings);assert.equal(settings.standardStyleDefaults,'native');assert.equal(m.standardColorSlots(settings).length,0);
 assert.deepEqual(settings.baseNodeStyle,{fontSize:20});assert.deepEqual(settings.centralNodeStyle,{maxWidth:370});assert.deepEqual(settings.baseLinkStyle,{strokeWidth:2});
 for(const key of ['noteTypeStyles','graphLenses','colorPreferences','unrelated'])assert.deepEqual(settings[key],before[key]);
});


test("local style saves preserve concurrent unedited geometry/extensions and standard reference deletion retains native absence",()=>{
 const first={textColor:{kind:'palette',id:'a'},fontSize:18,strokeWidth:1,extension:{source:'initial'}};
 const edited={...first,textColor:'#ffffff'},latest={...first,fontSize:27,extension:{source:'latest'},gateRadius:7};
 assert.deepEqual(m.mergeStyleDraft(first,edited,latest,m.NODE_COLOR_FIELDS),{...latest,textColor:'#ffffff'});
 const settings={standardStyleDefaults:'legacy',baseNodeStyle:{textColor:{kind:'palette',id:'a'},backgroundColor:'#11223366',fontSize:18},colorPreferences:m.defaultColorPreferences()};
 settings.colorPreferences.palette=[{id:'a',name:'A',light:'#123456',dark:'#abcdef'}];m.deleteNamedColor(settings,'a',undefined);
 assert.equal(settings.standardStyleDefaults,'native');assert.deepEqual(settings.baseNodeStyle,{backgroundColor:'#11223366',fontSize:18});
});
