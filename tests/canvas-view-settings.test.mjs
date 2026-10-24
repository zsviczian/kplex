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
const flatten=(items,path=[])=>items.flatMap(item=>[...('control'in item?[{...item,path}]:[]),...flatten(item.items??[],item.type==='page'?[...path,item.name]:path)]);
`;
const scenario=body=>colorEditorScenario(`(async()=>{${initialize}\n${body}\nreturn true})()`);

test('all moved controls have one native location and original ownership/bounds',async()=>{
 assert.equal(await scenario(`
 const p=await create(),tab=new M.KplexSettingTab({},p);const definitions=tab.getSettingDefinitions(),rows=flatten(definitions);
 const find=key=>{const matches=rows.filter(row=>row.control.key.replace(/^received:\\d+:/,'')===key);check(matches.length===1,'Expected one '+key);return matches[0]};
 const shared=['hoverHighlightRequiresAlt','gateTooltipRequiresAlt','areaOutlineRequiresAlt','animationSpeed','allowAutozoom','startInPopout','confirmFileDelete','removeOntologyLinksOnDelete','mouseInteractionMode','centralNodeMarkdownMode','maxItemCount','showCrossLinks','showInferredNodes','showVirtualNodes','showURLNodes','showAttachments','showFolderNodes','showTagNodes','showPageNodes','excludeFilepathsCsv','showNeighborCount'];
 for(const key of shared)equal(find(key).path,['Canvas behavior'],'Shared '+key);
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
