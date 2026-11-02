/** Both visibility surfaces share finite presentation writes; no index/source effects are granted. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {colorEditorScenario} from './support/colorEditorBrowser.mjs';

const setup=`
const M=sourceModules,check=(value,message)=>{if(!value)throw Error(message)},copy=value=>structuredClone(value),equal=(a,b,message)=>check(JSON.stringify(a)===JSON.stringify(b),message);
const seed=await createAppearanceHost({});let disk=copy(seed.writes.at(-1));
const create=async()=>{
 const p=await createAppearanceHost(disk);p.manifest={id:'k-plex'};p.writes=[];p.settingsWriteQueue=Promise.resolve();
 Object.assign(p,{actionPreferenceQueue:Promise.resolve(),actionPreferenceListeners:new Set(),graphLensListeners:new Set(),appearanceThemeListeners:new Set(),externalSettingsRefresh:0});
 p.work={notifications:0};p.index.notifyPresentation=()=>{p.work.notifications++;p.onNotification?.()};
 for(const key of ['refreshPresentationSettings','refreshSemanticSettings','invalidateSemanticPolicy','rebuildIndex','ensureSemanticScope'])p.index[key]=()=>{throw Error('Unexpected index work: '+key)};
 p.saveData=async value=>{p.writes.push(copy(value));disk=copy(value)};p.loadData=async()=>copy(disk);p.initializeSettingsReconciliation(copy(disk));return p;
};
const flatten=items=>items.flatMap(item=>[item,...flatten(item.items??[])]);
const turn=()=>new Promise(resolve=>setTimeout(resolve,0));
`;
const scenario=body=>colorEditorScenario(`(async()=>{${setup}\n${body}\nreturn true})()`);

test('native Content visibility exposes explicit Enable all and Disable all actions',async()=>{
  assert.equal(await colorEditorScenario(`(async()=>{
    const M=sourceModules,p=await createAppearanceHost({});p.manifest={id:'k-plex'};const tab=new M.KplexSettingTab({},p);
    const flatten=items=>items.flatMap(item=>[item,...flatten(item.items??[])]);
    const group=flatten(tab.getSettingDefinitions()).find(item=>item.type==='group'&&item.heading===p.translator('settings.ui.content.visibility'));
    if(!group)throw Error('Content visibility group missing');
    const root=document.body.createDiv(),cleanups=[];
    for(const row of group.items)if(row.render){const release=row.render(new M.Setting(root));if(typeof release==='function')cleanups.push(release);}
    const labels=[...root.querySelectorAll('button')].map(button=>button.textContent);
    if(!labels.includes('Enable all')||!labels.includes('Disable all'))throw Error('Bulk visibility actions absent: '+labels.join(','));
    for(const release of cleanups)release();root.remove();tab.hide();return true;
  })()`),true);
});

for(const scope of ['settings','lenses']) test(scope+' bulk writes mixed, all-on/off and repeated states once while retaining unrelated settings',async()=>{
  assert.equal(await scenario(`
    const p=await create(),keys=M.contentVisibilityKeys('${scope}');
    p.settings.showPageNodes=false;p.settings.showTagNodes=true;p.settings.excludeFilepaths=['untouched/'];p.settings.excludeFilepathsCsv='untouched/';
    p.settings.graphLenses=[{id:'keep-me',name:'Kept lens',enabled:true,scope:'node',mode:'include',expression:'node.path != "hidden"'}];p.settings.unknown261={keep:['exact']};
    const unrelated=copy(p.settings);for(const key of keys)delete unrelated[key];
    check(await p.setContentVisibility('${scope}',true),'Mixed operation changed');
    check(keys.every(key=>p.settings[key]===true),'All applicable controls enabled');equal([p.writes.length,p.work.notifications],[1,1],'One write/refresh');
    check(!await p.setContentVisibility('${scope}',true),'Repeat is a no-op');equal([p.writes.length,p.work.notifications],[1,1],'No redundant write/refresh');
    check(await p.setContentVisibility('${scope}',false),'Disable changed');check(keys.every(key=>p.settings[key]===false),'All applicable controls disabled');
    const after=copy(p.settings);for(const key of keys)delete after[key];equal(after,unrelated,'Unrelated and unknown preferences retained');
    const restored=M.migrateAndMergeSettings(disk);check(keys.every(key=>restored[key]===false),'Persistence round trip');equal(disk.unknown261,{keep:['exact']},'Unknown data retained on disk');
  `),true);
});

test('failed bulk storage publishes no values or refresh, and a later queued operation can succeed',async()=>{
  assert.equal(await scenario(`
    const p=await create(),before=copy(p.settings);p.saveData=async()=>{throw Error('storage unavailable')};
    let failed=false;try{await p.setContentVisibility('lenses',true)}catch{failed=true}
    check(failed,'Storage failure returned');equal(p.settings,before,'Live settings unchanged');equal(p.work.notifications,0,'No false refresh');
    p.saveData=async value=>{p.writes.push(copy(value));disk=copy(value)};await p.setContentVisibility('lenses',true);equal(p.writes.length,1,'Queue recovered');
  `),true);
});

test('queued visibility choices compose with later non-default and unknown settings without stale replacements',async()=>{
  assert.equal(await scenario(`
    const p=await create();let release;p.settingsWriteQueue=new Promise(resolve=>release=resolve);
    const first=p.setContentVisibility('settings',false),second=p.setContentVisibility('lenses',true);
    p.settings.excludeFilepaths=['concurrent/'];p.settings.excludeFilepathsCsv='concurrent/';p.settings.unknown261={received:true};
    const unrelatedSave=p.persistSettingsSnapshot();release();await Promise.all([first,second,unrelatedSave]);
    check(M.COMMON_CONTENT_VISIBILITY.every(key=>p.settings[key]),'Later shared choice wins');check(p.settings.showNeighborCount===false&&p.settings.renderSiblings===true,'Surface-specific owners preserved');
    equal(disk.excludeFilepaths,['concurrent/'],'Concurrent exclusion retained');equal(disk.unknown261,{received:true},'Unknown edit retained');
    equal(p.writes.length,3,'Two bulk saves and the concurrent unrelated save');
  `),true);
});

test('native buttons disable no-ops, reject repeat clicks and restore truthful failure state',async()=>{
  assert.equal(await scenario(`
    const p=await create(),tab=new M.KplexSettingTab({},p),root=document.body.createDiv();
    const group=flatten(tab.getSettingDefinitions()).find(item=>item.type==='group'&&item.heading===p.translator('settings.ui.content.visibility'));
    const release=group.items.find(item=>item.name===p.translator('filter.visibility')).render(new M.Setting(root));
    const [enable,disable]=root.querySelectorAll('button');let done;p.settingsWriteQueue=new Promise(resolve=>done=resolve);
    enable.click();enable.click();check(enable.disabled&&disable.disabled,'Both controls pending');done();
    for(let i=0;i<8;i++)await turn();equal(p.writes.length,1,'Duplicate click not saved');check(enable.disabled&&!disable.disabled,'Enabled state disables Enable all');
    p.saveData=async()=>{throw Error('storage failure')};disable.click();for(let i=0;i<8;i++)await turn();
    check(M.contentVisibilityKeys('settings').every(key=>p.settings[key]),'Failed operation keeps values');check(enable.disabled&&!disable.disabled,'Failure restores enabled state');
    check(window.notices.includes(p.translator('visibility.saveFailed')),'Failure notice');release();root.remove();tab.hide();
  `),true);
});

test('two mounted React bulk controls follow one shared commit and preserve filters and narrow keyboard layout',async()=>{
  assert.equal(await scenario(`
    const p=await create(),containers=[document.body.createDiv(),document.body.createDiv()],roots=containers.map(el=>M.createRoot(el));
    let calls=0;const render=()=>M.flushSync(()=>roots.forEach(root=>root.render(M.React.createElement(M.ContentVisibilityActions,{scope:'lenses',values:p.settings,translate:p.translator,onSet:async value=>{calls++;await p.setContentVisibility('lenses',value);}}))));
    p.onNotification=render;render();const buttons=()=>containers.map(el=>el.querySelectorAll('button'));
    M.flushSync(()=>buttons()[0][0].click());for(let i=0;i<8;i++)await turn();equal([calls,p.writes.length],[1,1],'One action/save');
    check(buttons().every(pair=>pair[0].disabled&&!pair[1].disabled),'Both canvases reflect enabled state');
    containers[0].style.width='180px';buttons()[0][1].focus();check(document.activeElement===buttons()[0][1],'Keyboard target reachable');
    p.saveData=async()=>{throw Error('fail')};M.flushSync(()=>buttons()[0][1].click());for(let i=0;i<8;i++)await turn();
    check(containers[0].querySelector('[role=alert]'),'Truthful React failure');check(M.contentVisibilityKeys('lenses').every(key=>p.settings[key]),'Failure leaves values');
    for(const root of roots)M.flushSync(()=>root.unmount());containers.forEach(el=>el.remove());
  `),true);
});

test('native visibility buttons follow a row adopted into another document and retire on cleanup',async()=>{
  assert.equal(await scenario(`
    const p=await create(),tab=new M.KplexSettingTab({},p),root=document.body.createDiv();
    const group=flatten(tab.getSettingDefinitions()).find(item=>item.type==='group'&&item.heading===p.translator('settings.ui.content.visibility'));
    const release=group.items.find(item=>item.name===p.translator('filter.visibility')).render(new M.Setting(root));
    const adopted=document.implementation.createHTMLDocument('Settings popout');adopted.body.appendChild(adopted.adoptNode(root));
    root.querySelector('button').click();for(let i=0;i<8;i++)await turn();
    check(M.contentVisibilityKeys('settings').every(key=>p.settings[key]),'Adopted row applied current gesture');equal(p.writes.length,1,'One adopted write');
    release();root.querySelectorAll('button')[1].click();for(let i=0;i<4;i++)await turn();equal(p.writes.length,1,'Retired handler cannot write');root.remove();tab.hide();
  `),true);
});
