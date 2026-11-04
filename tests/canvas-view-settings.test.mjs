/** Actual declarative composition and queued persistence, with a test-only second view. Native navigation is a separate lane. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {colorEditorScenario} from './support/colorEditorBrowser.mjs';

const initialize = `
const M=sourceModules,check=(value,message)=>{if(!value)throw Error(message)},copy=value=>structuredClone(value);
const equal=(a,b,message)=>check(JSON.stringify(a)===JSON.stringify(b),message+' '+JSON.stringify([a,b]));
const second={...M.probeViewDefinition,id:'test.settings',labelKey:'Settings probe',configuration:{version:1,fields:{
 spacing:{defaultValue:20,validate:value=>typeof value==='number'&&Number.isFinite(value)&&value>=10&&value<=80},
 labels:{defaultValue:true,validate:value=>typeof value==='boolean'},
}}};
const other={...second,id:'test.other'};
const views=new M.PlexViewRegistry([M.classicViewDefinition,second,other]);
const contributions=[M.classicSettingsContribution,...[second,other].map(definition=>({id:definition.id,items:({key})=>[
 {name:'Probe spacing',control:{type:'slider',key:key('spacing'),min:10,max:80,step:1}},
 {name:'Probe labels',control:{type:'toggle',key:key('labels')}},
]}))];
const registry=new M.CanvasViewSettingsRegistry(views,contributions);
const seed=await createAppearanceHost({});let disk=copy(seed.writes.at(-1));
const create=async()=>{
 const p=await createAppearanceHost(disk);p.writes=[];p.viewSettingsRegistry=registry;p.manifest={id:'k-plex'};
 Object.assign(p,{actionPreferenceQueue:Promise.resolve(),actionPreferenceListeners:new Set(),graphLensListeners:new Set(),appearanceThemeListeners:new Set(),appearanceThemeActivation:0,externalSettingsRefresh:0,externalSettingsQueued:false,externalSettingsFailureNotified:false});
 p.work={presentation:0,semantic:0,invalidate:0,notify:0};
 p.index.refreshPresentationSettings=async()=>p.work.presentation++;p.index.refreshSemanticSettings=async()=>p.work.semantic++;
 p.index.invalidateSemanticPolicy=()=>p.work.invalidate++;p.index.notifyPresentation=()=>p.work.notify++;p.index.invalidateNodeVisuals=()=>{};
 p.loadData=async()=>copy(disk);p.saveData=async value=>{p.writes.push(copy(value));disk=copy(value)};
 p.initializeSettingsReconciliation(copy(disk));return p;
};
const drain=async p=>{for(let i=0;i<8;i++){await p.settingsReconciliation.reading;await p.settingsWriteQueue;await new Promise(r=>setTimeout(r,0));if(!p.settingsReconciliation.reading&&!p.externalSettingsQueued)break}};
const receive=async(p,value)=>{disk=copy(value);p.onExternalSettingsChange();await drain(p)};
/** Inspect actual mounted numeric rows after their declarative-to-shared-control adaptation.
 * Legacy writer assertions use the captured row key; bounds come from the real native input. */
const flatten=(items,path=[])=>items.flatMap(item=>{
 let row=item;
 if(!item.control&&item.render?.name==='renderNumberSetting'){const el=document.body.createDiv(),setting=new M.Setting(el),release=item.render(setting),key=setting.settingEl.dataset.kplexSettingKey,input=setting.controlEl.querySelector('input[type=range]');
  if(key&&input)row={...item,control:{type:'slider',key,min:Number(input.min),max:Number(input.max),step:Number(input.step),disabled:input.disabled}};
  if(typeof release==='function')release();el.remove();}
 return [...(row.control?[{...row,path}]:[]),...flatten(item.items??[],item.type==='page'?[...path,item.name]:path)];
});
`;
const scenario=body=>colorEditorScenario(`(async()=>{${initialize}\n${body}\nreturn true})()`);

const presetInitialize=`
const template={one:{name:'One',colors:['red']},two:{name:'Two',colors:['blue']}};
const presets={...second,id:'org.example.presets',configuration:{version:2,migrations:[{from:1,to:2,migrate:values=>({...values,presets:{...copy(template),one:{...copy(template.one),name:values.legacyName??'One'}}})}],fields:{
 presets:{entries:true,defaultValue:template,validate:value=>!!value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length<=16&&Object.values(value).every(row=>row&&typeof row.name==='string'&&Array.isArray(row.colors))},
 spacing:{defaultValue:24,validate:value=>typeof value==='number'&&value>=12&&value<=200},
}}};
const presetHost=async()=>{const p=await create();p.viewSettingsRegistry=new M.CanvasViewSettingsRegistry(new M.PlexViewRegistry([...views.available,presets]),[]);return p};
const name=entry=>({field:'presets',path:[entry,'name']});
`;
/** These use the production plugin writer/reconciliation prototypes, not a second settings model. */
const presetScenario=body=>scenario(presetInitialize+body);

test('scoped queued preset edits preserve sibling entries, namespaces and normal presentation-only ownership',async()=>{
 assert.equal(await presetScenario(`
 const p=await presetHost();let release;p.settingsWriteQueue=new Promise(resolve=>release=resolve);
 const first=p.updateCanvasViewConfiguration(presets.id,name('one'),{kind:'set',value:'Edited one'}),queuedSecond=p.updateCanvasViewConfiguration(presets.id,name('two'),{kind:'set',value:'Edited two'});
 release();await Promise.all([first,queuedSecond]);equal(disk.canvasViewSettings[presets.id],{version:2,values:{presets:{one:{name:'Edited one',colors:['red']},two:{name:'Edited two',colors:['blue']}}}},'Both queued entries retained');
 equal([p.work.semantic,p.work.invalidate],[0,0],'Scoped config does not rebuild semantics');equal(p.readCanvasViewConfiguration(presets.id).values.presets,disk.canvasViewSettings[presets.id].values.presets,'Live read agrees with durable state');
 `),true);
});

test('a received sibling preset rebases under an unstarted scoped save without being overwritten',async()=>{
 assert.equal(await presetScenario(`
 const p=await presetHost();await p.updateCanvasViewConfiguration(presets.id,{field:'presets'},{kind:'set',value:template});
 const a=p.receivedSettingsOwner('canvasViewSettings:'+presets.id+':presets:one'),container=p.receivedSettingsOwner('canvasViewSettings:'+presets.id+':presets');
 let release;p.settingsWriteQueue=new Promise(resolve=>release=resolve);
 const save=p.updateCanvasViewConfiguration(presets.id,name('one'),{kind:'set',value:'Local one'},{present:true,value:'One'});
 const incoming=copy(disk);incoming.canvasViewSettings[presets.id].values.presets.two.name='Remote two';disk=incoming;p.onExternalSettingsChange();await p.settingsReconciliation.reading;
 release();await save;await drain(p);
 equal(disk.canvasViewSettings[presets.id].values.presets,{one:{name:'Local one',colors:['red']},two:{name:'Remote two',colors:['blue']}},'Different preset updates compose');check(a()&&!container(),'Entry owner survives sibling change; whole collection draft retires');
 `),true);
});

test('a received same-preset change and A-B-A retire old entry owners without blocking siblings',async()=>{
 assert.equal(await presetScenario(`
 const p=await presetHost();await p.updateCanvasViewConfiguration(presets.id,{field:'presets'},{kind:'set',value:template});
 const before=copy(disk),own=p.receivedSettingsOwner('canvasViewSettings:'+presets.id+':presets:one'),otherOwner=p.receivedSettingsOwner('canvasViewSettings:'+presets.id+':presets:two');
 let release;p.settingsWriteQueue=new Promise(resolve=>release=resolve);const save=p.updateCanvasViewConfiguration(presets.id,name('one'),{kind:'set',value:'Stale'}).then(()=>false,()=>true);
 const incoming=copy(disk);incoming.canvasViewSettings[presets.id].values.presets.one.name='Remote';disk=incoming;p.onExternalSettingsChange();await p.settingsReconciliation.reading;release();check(await save,'Same-entry queued save refused');await drain(p);
 equal(disk.canvasViewSettings[presets.id].values.presets.one.name,'Remote','Incoming value retained');await receive(p,before);check(!own()&&otherOwner(),'A-B-A stays stale only for its own entry');
 `),true);
});

test('whole-view reset observes descendant epochs while a one-leaf reset retains other presets',async()=>{
 assert.equal(await presetScenario(`
 const p=await presetHost();await p.updateCanvasViewConfiguration(presets.id,name('one'),{kind:'set',value:'Custom one'});await p.updateCanvasViewConfiguration(presets.id,name('two'),{kind:'set',value:'Custom two'});
 await p.resetCanvasViewConfiguration(presets.id,name('one'));equal(disk.canvasViewSettings[presets.id].values.presets.two.name,'Custom two','One reset cannot erase another preset');equal(disk.canvasViewSettings[presets.id].values.presets.one.name,'One','Owned default restored');
 await p.updateCanvasViewConfiguration(presets.id,{field:'presets',path:['custom']},{kind:'set',value:{name:'User preset',colors:['orange']}});await p.resetCanvasViewConfiguration(presets.id);equal(disk.canvasViewSettings[presets.id].values.presets.custom,{name:'User preset',colors:['orange']},'View reset retains other user presets');
 let release;p.settingsWriteQueue=new Promise(resolve=>release=resolve);const reset=p.resetCanvasViewConfiguration(presets.id).then(()=>false,()=>true);
 const incoming=copy(disk);incoming.canvasViewSettings[presets.id].values.presets.two.name='Remote two';disk=incoming;p.onExternalSettingsChange();await p.settingsReconciliation.reading;release();check(await reset,'Whole-view stale reset refused');await drain(p);equal(disk.canvasViewSettings[presets.id].values.presets.two.name,'Remote two','Descendant receipt retained');
 `),true);
});

test('explicit schema migration is durable, idempotent and retains unknown fields/other views',async()=>{
 assert.equal(await presetScenario(`
 const p=await presetHost(),incoming=copy(disk);incoming.canvasViewSettings={[presets.id]:{version:1,opaque:'retain',values:{legacyName:'Migrated',future:{keep:true}}},'future.view':{version:9,values:{untouched:true}}};await receive(p,incoming);
 equal(p.readCanvasViewConfiguration(presets.id).values.presets.one.name,'Migrated','Pure preview interprets old data');const count=p.writes.length;
 await p.migrateCanvasViewConfiguration(presets.id);equal(disk.canvasViewSettings[presets.id].version,2,'Registered upgrade persisted');equal(disk.canvasViewSettings[presets.id].opaque,'retain','Wrapper retained');equal(disk.canvasViewSettings[presets.id].values.future,{keep:true},'Unknown values retained');equal(disk.canvasViewSettings['future.view'],incoming.canvasViewSettings['future.view'],'Unknown extension retained');
 await p.migrateCanvasViewConfiguration(presets.id);check(p.writes.length===count+1,'Repeated migration does not rewrite');equal([p.work.semantic,p.work.invalidate],[0,0],'Migration is configuration-only');
 `),true);
});

test('failed migration/storage and unsupported future payloads never publish authoritative defaults',async()=>{
 assert.equal(await presetScenario(`
 const p=await presetHost();await p.updateCanvasViewConfiguration(presets.id,name('one'),{kind:'set',value:'Durable'});const before=copy(disk),live=copy(p.settings.canvasViewSettings),save=p.saveData;p.saveData=async()=>{throw Error('Expected scoped disk rejection')};
 let rejected=false;try{await p.updateCanvasViewConfiguration(presets.id,name('one'),{kind:'set',value:'Rejected'})}catch{rejected=true}check(rejected,'Storage rejection surfaced');equal(disk,before,'Disk predecessor preserved');equal(p.settings.canvasViewSettings,live,'No optimistic authoritative settings');
 p.saveData=save;const future=copy(disk);future.canvasViewSettings[presets.id].version=9;await receive(p,future);const writes=p.writes.length;
 for(const run of [()=>p.migrateCanvasViewConfiguration(presets.id),()=>p.resetCanvasViewConfiguration(presets.id),()=>p.updateCanvasViewConfiguration(presets.id,name('one'),{kind:'set',value:'Downgrade'})]){let refused=false;try{await run()}catch{refused=true}check(refused,'Future payload refused')}
 check(p.writes.length===writes,'Future data never rewritten');equal(disk.canvasViewSettings[presets.id],future.canvasViewSettings[presets.id],'Future payload preserved');
 `),true);
});

test('scoped submission detaches drafts and refuses a definition retired before queue execution',async()=>{
 assert.equal(await presetScenario(`
 const p=await presetHost(),address=name('one'),edit={kind:'set',value:'Captured'};let release;p.settingsWriteQueue=new Promise(resolve=>release=resolve);
 const save=p.updateCanvasViewConfiguration(presets.id,address,edit);address.path[0]='two';edit.value='Changed after submit';release();await save;equal(disk.canvasViewSettings[presets.id].values.presets.one.name,'Captured','Captured request immutable');equal(disk.canvasViewSettings[presets.id].values.presets.two.name,'Two','Sibling not retargeted');
 p.settingsWriteQueue=new Promise(resolve=>release=resolve);const retiring=p.updateCanvasViewConfiguration(presets.id,name('one'),{kind:'set',value:'Late'}).then(()=>false,()=>true);p.viewSettingsRegistry=registry;release();check(await retiring,'Missing definition retired queued operation');equal(disk.canvasViewSettings[presets.id].values.presets.one.name,'Captured','No retired write');
 `),true);
});

test('production Mind Map contributes nine localized native fields and persists type settings independently of canvas intent',async()=>{
 assert.equal(await scenario(`
 const p=await create();p.viewSettingsRegistry=M.builtInCanvasViewSettings;const tab=new M.KplexSettingTab({},p),rows=flatten(tab.getSettingDefinitions());
 const controls=rows.filter(row=>row.control.key.replace(/^received:\\d+:/,'').startsWith('canvasView:mindmap:'));equal(controls.length,9,'One native control per Mind Map field');
 for(const row of controls)equal(row.path,['Canvas behavior','Mind Map'],'Type settings route');
 const spacing=controls.find(row=>row.control.key.endsWith(':horizontalSpacing')),arrangement=controls.find(row=>row.control.key.endsWith(':arrangement'));
 equal(arrangement.control.options,{balanced:'Balanced',left:'Left',right:'Right'},'Localized finite arrangement');
 const a=new M.PlexViewSession(M.builtInPlexViews,()=>{}),b=new M.PlexViewSession(M.builtInPlexViews,()=>{});a.select('mindmap');a.setRoot('R');
 const intent=[copy(a.getState()),copy(b.getState())],signature=M.encodeIndexSettingsSignature(p.settings);
 await tab.setControlValue(spacing.control.key,160);equal(disk.canvasViewSettings.mindmap,{version:1,values:{horizontalSpacing:160}},'Durable edited field only');
 await tab.setControlValue(arrangement.control.key,'left');equal(M.readViewConfiguration(a.definition,p.settings.canvasViewSettings).values.horizontalSpacing,160,'Other field retained');
 equal([a.getState(),b.getState()],intent,'Shared type settings never change either canvas choice/root');equal(M.encodeIndexSettingsSignature(p.settings),signature,'Source signature unchanged');
 equal([p.work.semantic,p.work.invalidate],[0,0],'No semantic invalidation or refresh');
 const incoming=copy(disk);incoming.canvasViewSettings.mindmap.values.verticalSpacing=44;incoming.canvasViewSettings['future.view']={version:9,values:{inert:true}};
 await receive(p,incoming);equal(tab.getControlValue('canvasView:mindmap:verticalSpacing'),44,'Incoming type values synchronize');
 await tab.setControlValue(spacing.control.key,164);equal(disk.canvasViewSettings['future.view'],incoming.canvasViewSettings['future.view'],'Future independent view retained');
 const live=p.viewSettingsRegistry.layoutControls(a.definition);equal(live.map(row=>row.field),['parentColumns','horizontalDensity','verticalDensity'],'Bottom-left controls use the same registered type fields');equal(live.map(row=>[row.min,row.max,row.step]),[[1,3,1],[0.1,4,0.05],[0.1,4,0.05]],'Live controls share the spacious range');
 await tab.setControlValue('canvasView:mindmap:horizontalDensity',0.1);await tab.setControlValue('canvasView:mindmap:verticalDensity',0.2);
 equal([disk.canvasViewSettings.mindmap.values.horizontalDensity,disk.canvasViewSettings.mindmap.values.verticalDensity],[0.1,0.2],'Both spacious density axes persist independently');equal([p.work.semantic,p.work.invalidate],[0,0],'Density is presentation only');
 await tab.setControlValue('canvasView:mindmap:parentColumns',3);equal((await p.loadData()).canvasViewSettings.mindmap.values.parentColumns,3,'Parent columns are durable type settings');equal([p.work.semantic,p.work.invalidate],[0,0],'Columns never acquire sources');
 equal([a.getState(),b.getState()],intent,'Incoming settings cannot retarget sessions');a.dispose();b.dispose();
 `),true);
});

test('all moved controls have one native location and original ownership/bounds',async()=>{
 assert.equal(await scenario(`
 const p=await create(),tab=new M.KplexSettingTab({},p);const definitions=tab.getSettingDefinitions(),rows=flatten(definitions);
 const find=key=>{const matches=rows.filter(row=>row.control.key.replace(/^received:\\d+:/,'')===key);check(matches.length===1,'Expected one '+key);return matches[0]};
 const shared=['hoverHighlightRequiresAlt','gateTooltipRequiresAlt','areaOutlineRequiresAlt','animationSpeed','allowAutozoom','startInPopout','confirmFileDelete','removeOntologyLinksOnDelete','mouseInteractionMode','centralNodeMarkdownMode','maxItemCount','showCrossLinks','showInferredNodes','showVirtualNodes','showURLNodes','showAttachments','showFolderNodes','showTagNodes','showPageNodes','showNeighborCount'];
 for(const key of shared)equal(find(key).path,['Canvas behavior'],'Shared '+key);
 // Long text now has a shared imperative field. Inspect its real mounted callback rather
 // than inventing a generic control key on a render-only declarative definition.
 const authored=[];const inspect=(items,path=[])=>{for(const item of items){if(item.name===p.translator('settings.ui.excluded.path.prefixes'))authored.push({item,path});inspect(item.items??[],item.type==='page'?[...path,item.name]:path)}};inspect(definitions);
 check(authored.length===1&&authored[0].item.render?.name==='renderAuthoredTextSetting','Expected one shared excluded-path field');equal(authored[0].path,['Canvas behavior'],'Shared excludeFilepathsCsv');
 const host=document.body.createDiv(),setting=new M.Setting(host),writer=tab.setControlValue;let capturedKey;
 tab.setControlValue=async key=>{capturedKey=key};let release;
 try{release=authored[0].item.render(setting);const input=host.querySelector('textarea');check(input?.rows===4&&setting.settingEl.classList.contains('kplex-form-field'),'Original textarea rows and shared field layout');input.dispatchEvent(new Event('input',{bubbles:true}));equal(capturedKey?.replace(/^received:\\d+:/,''),'excludeFilepathsCsv','Original canonical writer ownership');}
 finally{tab.setControlValue=writer;release?.();host.remove();}
 for(const key of ['parentMaxHeight','friendMaxHeight','childMaxHeight','siblingMaxHeight','siblingRelativeSize','compactView','minLinkLength','renderSiblings'])equal(find(key).path,['Canvas behavior','Compass'],'Compass '+key);
 for(const key of ['inferAllLinksAsFriends','inverseInfer','datePropertyRelations'])equal(find(key).path,['Ontology'],'Canonical policy '+key);
 equal(find('inverseArrowDirection').path,['Visual styling','Link styling'],'Displayed arrows');
 equal([find('maxItemCount').control.min,find('maxItemCount').control.max,find('maxItemCount').control.step],[10,300,10],'Shared budget bounds');
 equal([find('siblingRelativeSize').control.min,find('siblingRelativeSize').control.max,find('siblingRelativeSize').control.step],[30,85,5],'Sibling bounds');
 for(const device of ['desktop','tablet','mobile'])for(const surface of ['leaf','sidepanel'])equal(find('layout.'+device+'.'+surface+'.lateralArrangement').path,['Canvas behavior','Compass','One-sided layout'],'Device/surface arrangement');
 const names=[];const walk=items=>{for(const item of items){names.push(item.name);walk(item.items??[])}};walk(definitions);
 check(names.filter(name=>name==='Area tint').length===1,'Area tint has one existing native action');
 check(!names.includes('Mind Map')&&!names.includes('Wu Xing'),'Unimplemented views absent');
 equal(views.resolve('classic').id,'classic','Serialized identity retained');
 equal(p.writes,[],'Opening/indexing definitions does not persist defaults');
 `),true);
});

test('contributed controls round-trip through actual writer and effective configuration, separately from session state',async()=>{
 assert.equal(await scenario(`
 const p=await create(),tab=new M.KplexSettingTab({},p),rows=flatten(tab.getSettingDefinitions());
 const row=rows.find(row=>row.name==='Probe spacing');check(row,'Second view contributes a real native control');
 equal(tab.getControlValue(row.control.key),20,'Unmaterialized default');
 const appearance=copy(p.settings.appearanceThemes),profiles=copy(p.settings.layoutProfiles),signature=M.encodeIndexSettingsSignature(p.settings);
 await tab.setControlValue(row.control.key,37);equal(tab.getControlValue(row.control.key),37,'Read after save');
 equal(disk.canvasViewSettings['test.settings'],{version:1,values:{spacing:37}},'Only edited field persisted');
 equal(M.readViewConfiguration(second,p.settings.canvasViewSettings),{status:'available',values:{spacing:37,labels:true}},'Effective projection input');
 equal(M.readViewConfiguration(other,p.settings.canvasViewSettings).values.spacing,20,'Other type remains independent');
 equal(M.migrateAndMergeSettings(disk).canvasViewSettings,p.settings.canvasViewSettings,'Restart round-trip');
 equal(p.settings.appearanceThemes,appearance,'Themes do not capture view configuration');equal(p.settings.layoutProfiles,profiles,'Legacy profiles unchanged');
 equal(M.encodeIndexSettingsSignature(p.settings),signature,'Source signature unchanged');
 check(p.work.semantic===0&&p.work.invalidate===0,'No semantic effects');
 const imported=M.importExcaliBrainGraphSettings({canvasViewSettings:{'test.settings':{version:1,values:{spacing:79}}}},p.settings);
 equal(imported.canvasViewSettings,p.settings.canvasViewSettings,'Foreign import cannot overwrite view workflow');
 await p.updateCanvasViewSetting('test.settings','spacing',38);check(p.writes.length===2,'Second explicit edit persisted');
 const before=copy(p.settings.canvasViewSettings),store=p.saveData;p.saveData=async()=>{throw Error('Storage unavailable')};let failed=false;
 try{await p.updateCanvasViewSetting('test.settings','spacing',39)}catch{failed=true}
 check(failed,'Storage failure reported');equal(p.settings.canvasViewSettings,before,'Failed draft not installed');equal(disk.canvasViewSettings,before,'Disk retained previous commit');
 const otherFieldKey=flatten(tab.getSettingDefinitions()).find(row=>row.name==='Probe labels').control.key;let attempts=0;
 p.saveData=async()=>{attempts++;throw Error('Native storage unavailable')};await tab.setControlValue(row.control.key,39);
 const recovered=flatten(tab.getSettingDefinitions()).find(row=>row.name==='Probe spacing');
 check(recovered.control.key!==row.control.key,'Rejected immediate field retires its optimistic native binding');
 equal(flatten(tab.getSettingDefinitions()).find(row=>row.name==='Probe labels').control.key,otherFieldKey,'Unrelated native field keeps its owner');
 await tab.setControlValue(row.control.key,40);equal(attempts,1,'Retired native handler cannot submit another write');
 equal(p.settings.canvasViewSettings,before,'Native recovery does not publish a rejected draft');
 p.saveData=store;await tab.setControlValue(recovered.control.key,40);equal(disk.canvasViewSettings['test.settings'].values.spacing,40,'Replacement native handler can save after storage recovers');
 `),true);
});

test('queued scalar edits preserve other types and received fields without whole-map replacement',async()=>{
 assert.equal(await scenario(`
 const a=await create(),b=await create();
 await a.updateCanvasViewSetting('test.settings','spacing',31);
 await b.updateCanvasViewSetting('test.other','spacing',52);
 await a.updateCanvasViewSetting('test.settings','labels',false);
 await receive(b,disk);equal(b.settings.canvasViewSettings,{'test.settings':{version:1,values:{spacing:31,labels:false}},'test.other':{version:1,values:{spacing:52}}},'Independent incoming types/fields merge');
 let release;const hold=new Promise(resolve=>release=resolve);a.settingsWriteQueue=hold;
 const first=a.updateCanvasViewSetting('test.settings','spacing',32),secondWrite=a.updateCanvasViewSetting('test.other','labels',false);release();await Promise.all([first,secondWrite]);
 equal(disk.canvasViewSettings['test.settings'].values,{spacing:32,labels:false},'Latest same-type fields preserved');
 equal(disk.canvasViewSettings['test.other'].values,{spacing:52,labels:false},'Latest other type preserved');
 check(a.work.semantic===0&&b.work.semantic===0&&a.work.invalidate===0&&b.work.invalidate===0,'No semantic work through queued/incoming saves');
 const previous=copy(disk),owner=a.receivedSettingsOwner('canvasViewSettings:test.settings:spacing');
 const changed=copy(disk);changed.canvasViewSettings['test.settings'].values.spacing=45;await receive(a,changed);await receive(a,previous);
 check(!owner(),'A-B-A retires old same-field owner');
 `),true);
});

test('unknown/future/invalid payloads stay inert, bounded and preserved through unrelated saves',async()=>{
 assert.equal(await scenario(`
 const p=await create(),raw={future:{version:99,values:{mapping:{tag:'literal'}}},'test.settings':{version:2,values:{spacing:99}}};
 const next=copy(disk);next.canvasViewSettings=raw;await receive(p,next);
 equal(p.settings.canvasViewSettings,raw,'Future payload preserved');equal(M.readViewConfiguration(second,raw),{status:'unavailable',reason:'unsupported'},'Future schema is unavailable');
 const tab=new M.KplexSettingTab({},p),row=flatten(tab.getSettingDefinitions()).find(row=>row.name==='Probe spacing');check(row.control.disabled,'Future native control disabled');
 let rejected=false;try{await p.updateCanvasViewSetting('test.settings','spacing',30)}catch{rejected=true}check(rejected,'Future field cannot be overwritten');
 p.settings.confirmFileDelete=false;await p.saveSettings(false,false);equal(disk.canvasViewSettings,raw,'Unrelated save preserves future map');
 for(const bad of [null,[],17,{'test.settings':{version:1,values:{spacing:'bad'}}},{'test.settings':{version:1,values:{labels:'bad'}}}])check(M.readViewConfiguration(second,bad).status==='unavailable','Malformed configuration rejected');
 const extra={'test.settings':{version:1,values:{spacing:30,newField:{retain:true}},futureMeta:'retain'}};
 const edited=M.editViewConfiguration(second,extra,'spacing',40);equal(edited['test.settings'].values.newField,{retain:true},'Unknown fields preserved');equal(edited['test.settings'].futureMeta,'retain','Unknown namespace metadata preserved');
 const large={'test.settings':{version:1,values:{spacing:30,newField:'x'.repeat(20000)}}};check(M.readViewConfiguration(second,large).status==='unavailable','Oversized payload unavailable');equal(M.migrateAndMergeSettings({canvasViewSettings:large}).canvasViewSettings,large,'Oversized saved payload not silently reset');
 check(M.readViewConfiguration(second,Object.fromEntries(Array.from({length:33},(_,i)=>['future'+i,{}]))).status==='unavailable','Namespace count bound');
 const full={'test.settings':{version:1,values:Object.fromEntries(Array.from({length:64},(_,i)=>['unknown'+i,i]))}};
 check(M.readViewConfiguration(second,full).status==='available','A full unknown-field map can inherit supported defaults');
 let overflow=false;try{M.editViewConfiguration(second,full,'spacing',40)}catch{overflow=true}
 check(overflow,'An explicit edit cannot create an unreadable 65th field');equal(Object.keys(full['test.settings'].values).length,64,'Rejected bounded edit preserves raw payload');
 `),true);
});

test('an incoming independent field survives an in-flight configuration write and its next save',async()=>{
 assert.equal(await scenario(`
 const p=await create();await p.updateCanvasViewSetting('test.settings','spacing',30);await p.updateCanvasViewSetting('test.settings','labels',true);
 const remote=copy(disk);remote.canvasViewSettings['test.settings'].values.labels=false;
 let enter,release;const began=new Promise(resolve=>enter=resolve),hold=new Promise(resolve=>release=resolve),store=p.saveData;let first=true;
 p.saveData=async value=>{if(first){first=false;enter();await hold}await store(value)};
 const saving=p.updateCanvasViewSetting('test.settings','spacing',31);await began;disk=remote;p.onExternalSettingsChange();await p.settingsReconciliation.reading;
 release();await saving;await drain(p);
 equal(M.readViewConfiguration(second,p.settings.canvasViewSettings).values,{spacing:31,labels:false},'Incoming field plus accepted in-flight field');
 p.settings.confirmFileDelete=false;await p.saveSettings(false,false);
 equal(disk.canvasViewSettings['test.settings'].values,{spacing:31,labels:false},'Next save preserves both owners');
 `),true);
});

test('received schemas retire stale native controls and queued same-field writes without blocking unrelated fields',async()=>{
 assert.equal(await scenario(`
 const p=await create(),tab=new M.KplexSettingTab({},p);await p.updateCanvasViewSetting('test.settings','spacing',30);
 const rows=flatten(tab.getSettingDefinitions()),spacing=rows.find(row=>row.name==='Probe spacing'),labels=rows.find(row=>row.name==='Probe labels');
 const remote=copy(disk);remote.canvasViewSettings['test.settings'].values.spacing=44;await receive(p,remote);
 const writes=p.writes.length;await tab.setControlValue(spacing.control.key,35);check(p.writes.length===writes,'Stale same-field native handler cannot save');
 await tab.setControlValue(labels.control.key,false);equal(disk.canvasViewSettings['test.settings'].values,{spacing:44,labels:false},'Unrelated field control remains valid');
 let release;const hold=new Promise(resolve=>release=resolve);p.settingsWriteQueue=hold;
 const queued=p.updateCanvasViewSetting('test.settings','spacing',36).then(()=>false,()=>true);
 const future=copy(disk);future.canvasViewSettings['test.settings']={version:9,values:{spacing:55}};disk=future;p.onExternalSettingsChange();await p.settingsReconciliation.reading;
 release();check(await queued,'Queued field cannot overwrite a received future schema');await drain(p);
 equal(disk.canvasViewSettings,future.canvasViewSettings,'Future map is retained');equal(p.settings.canvasViewSettings,future.canvasViewSettings,'Live state receives future payload');
 `),true);
});

/** Routine visibility/type saves can finish durably while an optional refresh is queued; only an actual failure merits a recovery notice. */
test('routine canvas saves stay quiet during queued refresh while actual refresh failure remains actionable',async()=>{
 assert.equal(await scenario(`
 const p=await create();window.notices=[];let release,held=true;
 p.index.refreshPresentationSettings=()=>held?new Promise(resolve=>release=()=>{held=false;resolve()}):Promise.resolve();
 p.settings.renderSiblings=!p.settings.renderSiblings;
 try{
  await p.saveSettings(false,true);check(disk.renderSiblings===p.settings.renderSiblings,'Visibility not durable');
  await p.updateCanvasViewSetting(second.id,'spacing',30);check(disk.canvasViewSettings[second.id].values.spacing===30,'Coalesced type setting not durable');
  equal(window.notices,[],'Normal queued refresh must not ask the user to reload');
 }finally{release?.()}
 for(let i=0;i<100&&p.savedSettingsRefresh.flight;i++)await new Promise(resolve=>setTimeout(resolve,5));
 check(!p.savedSettingsRefresh.flight,'Refresh did not settle');
 p.index.refreshPresentationSettings=async()=>{throw Error('Expected display-refresh fault')};
 p.settings.renderSiblings=!p.settings.renderSiblings;await p.saveSettings(false,true);
 equal(window.notices,[p.translator('settings.savedRefreshPending')],'Actual refresh failure needs one actionable recovery notice');
 await p.updateCanvasViewSetting(second.id,'spacing',31);equal(window.notices.length,1,'One unresolved failure episode cannot repeat recovery noise');
 p.index.refreshPresentationSettings=async()=>{};await p.updateCanvasViewSetting(second.id,'spacing',32);
 let reject;p.index.refreshPresentationSettings=()=>new Promise((resolve,fail)=>reject=fail);
 await p.updateCanvasViewSetting(second.id,'spacing',33);equal(window.notices.length,1,'Normal short-wait completion is quiet even before a later rejection');
 reject(Error('Expected late display-refresh fault'));
 for(let i=0;i<100&&p.savedSettingsRefresh.flight;i++)await new Promise(resolve=>setTimeout(resolve,5));
 equal(window.notices.length,2,'A real late rejection after recovery remains actionable');
 const retiring=p.refreshSavedSettings(false,true);for(let i=0;i<100&&!p.savedSettingsRefresh.flight;i++)await new Promise(resolve=>setTimeout(resolve,5));await Promise.resolve();
 p.unloading=true;p.savedSettingsRefresh.close();reject(Error('Expected retired display-refresh fault'));await retiring;
 equal(window.notices.length,2,'Retired native host cannot publish late recovery noise');
 `),true);
});
