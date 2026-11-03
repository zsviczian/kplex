/** Current-period pin contracts use actual portable resolution and the Obsidian calendar adapter.
 * Moment is a test-only window capability; no global locale changes or source/Vault scans exist. */
import assert from 'node:assert/strict';
import test from 'node:test';
import moment from 'moment';
import {plexViewModules} from './support/plexViewFixture.mjs';
const M=await plexViewModules(['src/core/plex/savedPins.ts','src/core/plex/periodicPins.ts','src/adapters/obsidian/periodicPins.ts','src/settings.ts','src/ui/savedPinPresentation.ts']);

/** Finite native calendar/file facts; every path lookup is observable and every other I/O is absent. */
function fixture(time,overrides={}){
 let now=Date.parse(time);const files=new Set(),lookups=[];
 const app={vault:{getFileByPath:path=>{lookups.push(path);return files.has(path)?{path}:null}},internalPlugins:{getPluginById:()=>({enabled:true,instance:{options:{folder:'Daily',format:'YYYY-MM-DD'}}})}};
 const runtime=M.createPeriodicPinRuntime(app,path=>files.has(path),()=>now);
 const settings=M.loadPeriodicPinSettings(overrides);
 return {app,runtime,settings,files,lookups,now:value=>now=Date.parse(value),read:(pins)=>M.resolveSavedPins(pins,settings,runtime)};
}
/** Each local calendar factory owns its test locale/zone; production never mutates shared Moment. */
const calendar=(locale='en')=>{global.window={moment:time=>moment(time).utc().locale(locale)}};
const symbolic=period=>({kind:'periodic',period});

test('fixed strings, future descriptors and extra configuration keys survive loading without coercion',()=>{
 const future={kind:'future-version',id:'keep',payload:{version:9}},pins=['Case.md',symbolic('day'),'Unavailable.md',future,'Case.md'];
 const loaded=M.loadSavedPins(pins);assert.deepEqual(loaded,pins);assert.deepEqual(M.fixedPinPaths(loaded),['Case.md','Unavailable.md','Case.md']);
 assert.equal(new Set(M.savedPinEntries(loaded).map(row=>row.id)).size,5);
 const settings=M.loadPeriodicPinSettings({future:{keep:true},day:{format:'YYYY/MM/DD',extra:{keep:true}}});
 assert.deepEqual(settings.future,{keep:true});assert.deepEqual(settings.day.extra,{keep:true});assert.equal(settings.day.format,'YYYY/MM/DD');
 const migrated=M.migrateAndMergeSettings({pinnedNodes:pins,periodicPinSettings:settings,unknownTop:{keep:true}});
 assert.deepEqual(migrated.pinnedNodes,pins);assert.deepEqual(migrated.unknownTop,{keep:true});assert.deepEqual(migrated.periodicPinSettings.day.extra,{keep:true});
});

test('Today, ISO This Week and This Month use one captured clock and correct year/month anchors',()=>{
 calendar();const f=fixture('2021-01-01T12:00:00Z'),pins=['Fixed.md',symbolic('day'),symbolic('week'),symbolic('month')];
 const first=f.read(pins);assert.deepEqual(first.map(row=>row.path),['Fixed.md','Daily/2021-01-01.md','2020-W53.md','2021-01.md']);
 assert.equal(first[1].state,'missing');f.files.add(first[1].path);assert.equal(f.read(pins)[1].state,'ready');
 f.now('2021-01-04T00:00:00Z');const next=f.read(pins);assert.equal(next[2].path,'2021-W01.md');assert.equal(next[1].path,'Daily/2021-01-04.md');
 assert.deepEqual(first.map(row=>row.id),next.map(row=>row.id),'Rollover never changes saved identities/order');
 assert.deepEqual(pins,['Fixed.md',symbolic('day'),symbolic('week'),symbolic('month')],'Resolution never persists resolved filenames');
});

test('locale week and explicit formats work without Periodic Notes or a global locale mutation',()=>{
 const before=moment.locale();calendar('en');const f=fixture('2021-01-01T12:00:00Z',{week:{folder:'Weeks',format:'gggg-[w]ww',weekStart:'locale'},day:{useDailyNotes:false,folder:'Custom',format:'YYYY/MM/DD'}});
 delete f.app.internalPlugins;const result=f.read([symbolic('day'),symbolic('week')]);
 assert.deepEqual(result.map(row=>row.path),['Custom/2021/01/01.md','Weeks/2021-w01.md']);assert.equal(moment.locale(),before);
 f.now('2024-02-29T23:59:59Z');assert.equal(f.read([symbolic('day')])[0].path,'Custom/2024/02/29.md');
 f.now('2024-03-01T00:00:01Z');assert.equal(f.read([symbolic('month')])[0].path,'2024-03.md');
});

test('unavailable Daily Notes, invalid formats/paths and unknown descriptors remain explicit inert rows',()=>{
 calendar();const f=fixture('2026-11-03T12:00:00Z');f.app.internalPlugins.getPluginById=()=>({enabled:false});
 const missing=f.read([symbolic('day'),{kind:'future',opaque:true}]);assert.deepEqual(missing.map(row=>[row.state,row.path]),[['configuration',null],['unsupported',null]]);
 assert.equal(f.lookups.length,0,'Unavailable configuration must not become a guessed filename');
 for(const [folder,format]of [['../Outside','YYYY'],['Notes','[../Outside]'],['Notes',''],['C:/Private','YYYY']]){
  const config=M.loadPeriodicPinSettings({day:{useDailyNotes:false,folder,format}}),rows=M.resolveSavedPins([symbolic('day')],config,f.runtime);assert.equal(rows[0].state,'configuration');
 }
 assert.equal(M.periodicPinPath('Notes','2026-11-03.md'),'Notes/2026-11-03.md');assert.equal(M.periodicPinPath('Notes','2026-11-03#bad'), 'Notes/2026-11-03#bad.md','No URI decoding or silent target substitution');
});

test('enabling/disabling preserves mixed order and fixed notes matching the current period path',()=>{
 const pins=['A.md',symbolic('week'),'Daily/2026-11-03.md',symbolic('day'),{kind:'future',id:'keep'}];
 const changed=M.setPeriodicPinEnabled(pins,'day',false);assert.deepEqual(changed,['A.md',symbolic('week'),'Daily/2026-11-03.md',{kind:'future',id:'keep'}]);
 assert.deepEqual(M.setPeriodicPinEnabled(pins,'week',true),pins);
 const rows=M.savedPinEntries(pins),move={id:rows[3].id,before:rows[0].id,expected:rows.map(row=>row.id)};
 assert.deepEqual(M.moveSavedPin(pins,move),[symbolic('day'),'A.md',symbolic('week'),'Daily/2026-11-03.md',{kind:'future',id:'keep'}]);
});

test('ordinary fixed pins do not acquire the calendar or Daily Notes capability',()=>{
 const fail=()=>{throw Error('Unexpected calendar or I/O')};const runtime={now:fail,dailyNotes:fail,format:fail,fileExists:fail,fixedAvailable:path=>path==='A.md'};
 assert.deepEqual(M.resolveSavedPins(['A.md','Missing.md'],M.DEFAULT_PERIODIC_PIN_SETTINGS,runtime).map(row=>row.state),['ready','missing']);
});

test('shared pin presentation retains periodic labels, cached node styling and useful unavailable state',()=>{
 const settings=M.migrateAndMergeSettings({baseNodeStyle:{...M.DEFAULT_SETTINGS.baseNodeStyle,prefix:'Pinned ',icon:'star'}});
 const page={path:'Daily/2026-11-03.md',name:'Authored note',file:{extension:'md'},isFolder:false,isTag:false,url:null,tags:[],styleTags:[],aliases:[]};
 const t=(key,values)=>key+(values?' '+values.path:'');
 const row={id:'symbolic-day',entry:symbolic('day'),period:'day',path:page.path,state:'ready'};
 const ready=M.savedPinPresentation(row,page,page.name,settings,t,page.path);
 assert.equal(ready.label,'Pinned pins.today');assert.equal(ready.icon,'star');assert.equal(ready.active,true);assert.equal(ready.actionable,true);
 const missing=M.savedPinPresentation({...row,state:'missing'},undefined,undefined,settings,t,'Other.md');
 assert.equal(missing.label,'pins.today');assert.equal(missing.icon,'calendar');assert.equal(missing.available,false);assert.equal(missing.actionable,true);assert(missing.detail.includes(page.path));
 const future=M.savedPinPresentation({id:'future',entry:{kind:'future'},path:null,state:'unsupported'},undefined,undefined,settings,t,'');
 assert.equal(future.actionable,false);assert.equal(future.path,null);
});
