/** Fixed-capacity session diagnostics: long use, pure copies, privacy and truthful work intervals. */
import assert from 'node:assert/strict';
import test from 'node:test';
import ts from 'typescript';
import {readFileSync} from 'node:fs';
import {browserBundle} from './support/browserTypeScript.mjs';
const bundle=await browserBundle(['src/application/IndexingActivity.ts','src/index/ForegroundWorkScheduler.ts']);
const host={};new Function('window',bundle)(host);
const {IndexingActivity,projectIndexingActivity,ACTIVITY_KINDS,ACTIVITY_REASONS,ACTIVITY_MILESTONES,
  ACTIVITY_SOURCE_COLUMNS,ACTIVITY_SESSION_COLUMNS,ACTIVITY_CURRENT_COLUMNS,INDEXING_ACTIVITY_BYTE_LIMIT,INDEXING_ACTIVITY_CELL_CAPACITY,INDEXING_ACTIVITY_CAPTURE_ADMISSION_LIMIT}=host.sourceModules;
const HOUR=3600000,MAX=4294967295;
const {INDEX_WORK_PRIORITY}=host.sourceModules;

/** Execute only an actual passive getter, excluding native module initialization and storage. */
function passiveMethod(path,name,dependencies={}){
  const source=ts.createSourceFile(path,readFileSync(new URL('../'+path,import.meta.url),'utf8'),ts.ScriptTarget.Latest,true);let declaration;
  function visit(node){if(ts.isMethodDeclaration(node)&&node.name.getText(source)===name)declaration=node;ts.forEachChild(node,visit)}visit(source);assert(declaration,name);
  const text=declaration.getText(source),compiled=ts.transpileModule('const getter=function '+name+text.slice(text.indexOf('('))+';', {compilerOptions:{target:ts.ScriptTarget.ES2021,module:ts.ModuleKind.None}}).outputText;
  return new Function(...Object.keys(dependencies),compiled+'return getter;')(...Object.values(dependencies));
}
/** Native collection sizes stay readable while any attempted iteration fails the purity test. */
function opaqueCollection(size,set=false){const collection=set?new Set():new Map();for(let index=0;index<size;index++)set?collection.add('private-'+index):collection.set('private-'+index,{});
  for(const name of ['values','keys','entries',Symbol.iterator])Object.defineProperty(collection,name,{value:assert.fail});return collection;}

/** Supply actual retained owner-counter shapes; no path or source object enters the recorder. */
function fixture(){let now=0,clockReads=0;const d=new IndexingActivity(()=>{clockReads++;return now});
  const source=Object.fromEntries(ACTIVITY_SOURCE_COLUMNS.map(key=>[key,0])),session=Object.fromEntries(ACTIVITY_SESSION_COLUMNS.map(key=>[key,0]));
  return{d,source,session,setNow:value=>{now=value},reads:()=>clockReads,begin:(scope='local',reason='known-file')=>d.begin(scope==='global'?'host-inventory':'local-maintenance',scope,reason,source,session),end:(token,outcome='complete')=>d.end(token,outcome,source,session)};}
/** Snapshot retained fields without calling report code or the injected clock. */
function retained(d){return Object.entries(d).map(([key,value])=>[key,ArrayBuffer.isView(value)||Array.isArray(value)?[...value]:value]);}
/** Find a declared column; tests never rely on a duplicate independent schema. */
function cell(capture,row,name){return row[capture.columns.pass.indexOf(name)];}

test('24/48-hour activity preserves startup and last-global explanation through local churn',()=>{
  const f=fixture();f.d.mark('onload');f.d.cause('uncovered-non-file');const global=f.begin('global','unscoped-resolved');
  f.setNow(500);f.source.checked=88;f.end(global);f.d.mark('strict-ready');
  for(let hour=1;hour<=24;hour++){f.setNow(hour*HOUR);f.d.cause('known-file');const token=f.begin();f.source.checked+=2;f.source.vaultReads++;f.source.parses++;f.setNow(hour*HOUR+25);f.end(token);}
  const a=f.d.capture('on-demand','background','responsive','1.2.3');
  assert.equal(a.hours.length,25);assert.equal(a.totals[0],25);assert.equal(a.recent.length,16);assert.equal(a.omitted.rotated,9);
  assert.equal(cell(a,a.lastGlobal,'firstCause'),ACTIVITY_REASONS.indexOf('uncovered-non-file'));assert.equal(cell(a,a.lastGlobal,'checked'),88);
  assert.equal(a.milestones[ACTIVITY_MILESTONES.indexOf('strict-ready')],500);
  f.setNow(48*HOUR);const before=retained(f.d),b=f.d.capture();assert.deepEqual(retained(f.d),before,'Copy cannot rotate retained bins');
  assert.equal(b.hours.length,25);assert(b.hours.every(row=>row[0]>=24));assert.equal(b.totals[0],25);assert.equal(b.lastGlobal[2],0);
  assert.equal(b.clock,'monotonic-no-suspend-proof');assert.equal(b.longObservationGaps,0,'Idle copy is not synthetic observed activity');
  f.d.cause('manual');const c=f.d.capture();assert.equal(c.longObservationGaps,1);assert.equal(c.causes[ACTIVITY_REASONS.indexOf('manual')],1);
});

test('overlapping/open intervals and cross-hour completion never imply exclusive source work',()=>{
  const f=fixture();f.setNow(HOUR-20);const a=f.begin('global','startup-offline');f.setNow(HOUR-10);const b=f.begin();
  assert.equal(f.begin(),0,'Only two detailed active passes may be retained');f.source.checked=3;f.source.parses=1;f.setNow(HOUR+10);
  const open=f.d.capture();assert.equal(open.active.length,2);assert.equal(open.omitted.capacity,1);assert.equal(open.active[0][3],30);assert.equal(open.outcomeCoverage,'capacity-limited');
  f.end(a);f.source.checked=5;f.end(b,'cancelled');const c=f.d.capture();
  assert.equal(c.recent.length,2);assert.equal(cell(c,c.recent[0],'checked'),3);assert.equal(cell(c,c.recent[1],'checked'),5,'Shared counter intervals overlap honestly');
  assert.equal(c.hours[0][7],0);assert.equal(c.hours[1][7],8,'Counter deltas belong entirely to the completion hour');assert.equal(c.hours[1][5],1);
  f.end(a);assert.deepEqual(f.d.capture(),c,'A repeated end cannot create another outcome');
});

test('coarse phases preserve closed durations/maxima and keep open elapsed separate',()=>{
  const f=fixture();f.d.phase('source','source-inventory');f.setNow(15);f.d.phase('source','source-reconciliation');f.setNow(30);f.d.phase('source','complete');
  f.d.phase('hydration','pages');f.setNow(50);const c=f.d.capture(),inventory=c.columns.phases.indexOf('source-inventory'),reconcile=c.columns.phases.indexOf('source-reconciliation');
  assert.equal(c.phases.counts[0][inventory],1);assert.equal(c.phases.elapsedMs[0][inventory],15);assert.equal(c.phases.maxMs[0][reconcile],15);
  assert.deepEqual(c.phases.current[0],[null,null]);assert.deepEqual(c.phases.current[1],[c.columns.phases.indexOf('pages'),20]);
  const before=retained(f.d);f.d.phase('source','secret/path.md');assert.deepEqual(retained(f.d),before);
});

test('cancelled/incomplete pass boundaries stop phase time before long idle without inventing outcomes',()=>{
  for(const outcome of ['cancelled','incomplete']){
    const f=fixture();f.d.phase('source','source-reconciliation');const token=f.begin();f.setNow(35);f.end(token,outcome);f.d.stopPhase('source');
    const ended=f.d.capture(),phase=ended.columns.phases.indexOf('source-reconciliation'),counts=ended.phases.counts[0];
    assert.equal(ended.phases.elapsedMs[0][phase],35);assert.deepEqual(ended.phases.current[0],[null,null]);
    const reads=f.reads();f.d.stopPhase('source');assert.equal(f.reads(),reads,'Already closed phase has no additional clock read');
    f.setNow(24*HOUR);const idle=f.d.capture();assert.deepEqual(idle.phases.counts[0],counts);assert.equal(idle.phases.elapsedMs[0][phase],35);assert.deepEqual(idle.phases.current[0],[null,null]);
    assert.equal(counts[idle.columns.phases.indexOf('cancelled')],0);assert.equal(counts[idle.columns.phases.indexOf('complete')],0);
  }
  const f=fixture();f.d.phase('hydration','evidence');f.setNow(15);f.d.phase('hydration','complete');const reads=f.reads();f.d.stopPhase('hydration');assert.equal(f.reads(),reads,'An actual terminal phase already closes the lane');
});

test('copy is nondestructive, deeply frozen, independently detached and clock-only',()=>{
  const f=fixture();f.d.cause('known-file');const token=f.begin();f.source.checked++;f.end(token);
  const before=retained(f.d),reads=f.reads(),a=f.d.capture(),b=f.d.capture();assert.deepEqual(a,b);assert.notEqual(a,b);assert.equal(f.reads(),reads+2);assert.deepEqual(retained(f.d),before);
  assert(Object.isFrozen(a)&&Object.isFrozen(a.hours)&&Object.isFrozen(a.hours[0])&&Object.isFrozen(a.columns)&&Object.isFrozen(a.phases.counts[0]));
  assert.throws(()=>a.current.push(1),TypeError);assert.throws(()=>{a.recent[0][0]=88},TypeError);
  const next=f.begin();f.source.checked++;f.end(next);assert.equal(a.recent.length,1);assert.equal(f.d.capture().recent.length,2);
  assert.equal(projectIndexingActivity(a),a);assert.equal(projectIndexingActivity(JSON.parse(JSON.stringify(a))),null,'Unbranded parsed objects do not regain trust');
});

test('unknown summary inputs, getters, proxies and toJSON cannot execute or escape',()=>{
  let traps=0;const secret='private-vault/note.md https://private.test/?token=secret';
  const hostile=new Proxy({},{get(){traps++;throw Error(secret)},getOwnPropertyDescriptor(){traps++;throw Error(secret)},ownKeys(){traps++;throw Error(secret)}});
  const getter={get mode(){traps++;throw Error(secret)},toJSON(){traps++;throw Error(secret)}};
  const revoked=Proxy.revocable({},{});revoked.revoke();
  for(const input of [hostile,getter,revoked.proxy,secret,new Error(secret),null,undefined])assert.equal(projectIndexingActivity(input),null);
  const f=fixture();const c=f.d.capture(hostile,getter,revoked.proxy,getter,...Array(ACTIVITY_CURRENT_COLUMNS.length).fill(hostile));
  assert.equal(traps,0);assert.deepEqual(c.settings,{mode:null,urls:null,pacing:null,build:null});assert(c.current.every(value=>value===null));
  assert(!JSON.stringify(c).includes('private'));f.d.cause(secret);const token=f.d.begin(secret,'unknown',secret);f.d.end(token,'failed');
  assert(!JSON.stringify(f.d.capture()).includes('private'));assert(f.d.capture().totals[7]>0);
});

test('capture admission remains eight weak keys even when consumers retain a thousand DTOs',()=>{
  const f=fixture(),retainedCaptures=[];
  for(let index=0;index<1000;index++)retainedCaptures.push(f.d.capture());
  assert.equal(INDEXING_ACTIVITY_CAPTURE_ADMISSION_LIMIT,8);
  for(let index=0;index<retainedCaptures.length;index++)assert.equal(projectIndexingActivity(retainedCaptures[index]),index>=992?retainedCaptures[index]:null);
  assert(Object.isFrozen(retainedCaptures[0]),'Expired admission does not mutate the retained DTO');
  const next=fixture(),latest=next.d.capture();assert.equal(projectIndexingActivity(retainedCaptures[992]),null,'Admission generations are module-wide across recorder lifetimes');
  assert.equal(projectIndexingActivity(latest),latest,'Both immediate export paths can admit the same latest capture repeatedly');assert.equal(projectIndexingActivity(latest),latest);
  let traps=0;const hostile=new Proxy({},{get(){traps++;throw Error('private')},getOwnPropertyDescriptor(){traps++;throw Error('private')},ownKeys(){traps++;throw Error('private')}});
  const revoked=Proxy.revocable({},{});revoked.revoke();assert.equal(projectIndexingActivity(hostile),null);assert.equal(projectIndexingActivity(revoked.proxy),null);assert.equal(traps,0);
});

test('actual persistence/source health getters use retained sizes and flags without storage or iteration',()=>{
  const repository={lanes:opaqueCollection(2),deleteTask:{},open:assert.fail,transaction:assert.fail};
  const repositoryRead=passiveMethod('src/index/SourceRepository.ts','getActivityState');assert.deepEqual(repositoryRead.call(repository),{writes:2,deleteTask:true});
  const cache={queuedBodyWrites:opaqueCollection(3),bodyWriteInFlight:true,open:assert.fail,flushQueuedBodyWrites:assert.fail};
  assert.deepEqual(passiveMethod('src/index/IndexedDbCache.ts','getActivityState').call(cache),{queuedBodies:3,writerActive:true});
  const counters=Object.fromEntries(ACTIVITY_SOURCE_COLUMNS.map((key,index)=>[key,index]));
  const source={counters,pendingKnownFiles:opaqueCollection(4,true),knownImpactTasks:5,inventory:{},repository:{getActivityState:()=>repositoryRead.call(repository)},requestInventory:assert.fail,reconcile:assert.fail};
  const counterRead=passiveMethod('src/adapters/obsidian/sourceAcquisition.ts','getActivityCounters'),stateRead=passiveMethod('src/adapters/obsidian/sourceAcquisition.ts','getActivityState');
  assert.equal(counterRead.call(source),counters);assert.equal(counterRead.call(source),counters,'Trusted boundary port allocates no counter copy');
  assert.deepEqual(stateRead.call(source),{pendingKnown:4,knownImpactTasks:5,sourceActive:1,repoWrites:2,repoDeleteTask:1});
  source.inventory=null;repository.deleteTask=null;cache.bodyWriteInFlight=false;
  assert.equal(stateRead.call(source).sourceActive,0);assert.equal(stateRead.call(source).repoDeleteTask,0);assert.equal(passiveMethod('src/index/IndexedDbCache.ts','getActivityState').call(cache).writerActive,false);
});

test('actual index activity facts stay O(1), dictionary-ordered and independent of pending preferences/status',()=>{
  const counters=Object.fromEntries(ACTIVITY_SOURCE_COLUMNS.map((key,index)=>[key,index]));let schedulerReads=0;
  const owner={sourceAcquisition:{getActivityState:()=>({pendingKnown:4,knownImpactTasks:5,sourceActive:1,repoWrites:2,repoDeleteTask:1}),getActivityCounters:()=>counters},
    indexedDb:{getActivityState:()=>({queuedBodies:3,writerActive:true})},workScheduler:{diagnostics:()=>{schedulerReads++;return{active:[1,2,3,4,5],waiting:6,throttle:'balanced'}}},
    indexingMode:'eager',snapshotHydrationTask:{},semanticPreparationTasks:opaqueCollection(2),onDemandBuildWaiters:opaqueCollection(1),semanticDemandCounts:opaqueCollection(3),onDemandTasks:opaqueCollection(4),onDemandGateTasks:opaqueCollection(5),
    semanticPreparationDiagnostics:{requested:10,prepared:8,published:7,cancelled:2,pending:11,fullBuilds:12},localHandoverStarts:3,localHandoverCompletions:2,localHandoverFailures:1,
    urlDiscoveryRunning:true,urlOwnerTasks:opaqueCollection(0),urlPendingPublications:0,urlDiscoveryProcessed:23,urlDiscoveryTotal:88,urlDiscoveryComplete:false,urlOwnerFailures:opaqueCollection(0,true),urlRestoredOwners:0,urlReadOwners:0,urlCheckedOwners:0,urlCacheAvailable:true,urlCacheWritesFailed:0,
    hasPendingSemanticPreparation:assert.fail,getVisiblePresentationDiagnostics:assert.fail,prepareSearchIndex:assert.fail};
  for(const property of ['app','plugin','state'])Object.defineProperty(owner,property,{get:assert.fail});
  owner.isOnDemandMode=passiveMethod('src/index/GraphIndex.ts','isOnDemandMode');owner.getUrlIndexProgress=passiveMethod('src/index/GraphIndex.ts','getUrlIndexProgress');
  const read=passiveMethod('src/index/GraphIndex.ts','getIndexingActivityFacts',{ACTIVITY_CURRENT_COLUMNS,INDEX_WORK_PRIORITY});
  const first=read.call(owner),second=read.call(owner),fields=Object.fromEntries(ACTIVITY_CURRENT_COLUMNS.map((name,index)=>[name,first.current[index]]));
  assert.deepEqual(first,second);assert.equal(schedulerReads,2);assert.equal(first.mode,'eager');assert.equal(first.urls,'background');assert.equal(first.pacing,'balanced');
  assert.equal(first.current.length,ACTIVITY_CURRENT_COLUMNS.length);assert.equal(new Set(ACTIVITY_CURRENT_COLUMNS).size,ACTIVITY_CURRENT_COLUMNS.length);
  assert.equal(fields.pendingKnown,4);assert.equal(fields.semanticActive,2);assert.equal(fields.scopeTasks,2);assert.equal(fields.demandedCenters,3);assert.equal(fields.buildBlocked,1);
  assert.equal(fields.schedulerBackground,5);assert.equal(fields.schedulerWaiting,6);assert.equal(fields.parses,4);assert.equal(fields.semanticPendingObservations,11);assert.equal(fields.urlTotal,88);assert.equal(fields.cacheWriterActive,1);
  assert.equal(fields.fullBuildAdmissions,12,'Includes existing progressive and private-build admissions');
  for(const name of ACTIVITY_SESSION_COLUMNS)assert.equal(fields[name],null,'Only StartupDiagnostics owns actual session work');
  assert(!JSON.stringify(first).includes('private-'));first.current[ACTIVITY_CURRENT_COLUMNS.indexOf('checked')]=999;
  assert.equal(read.call(owner).current[ACTIVITY_CURRENT_COLUMNS.indexOf('checked')],0,'Fact copies do not mutate authoritative counters');
  owner.indexingMode='on-demand';assert.equal(read.call(owner).mode,'on-demand');
});

test('clock rollback and long jumps retain ordering without inventing sleep, idle CPU or catch-up work',()=>{
  const f=fixture();f.setNow(100);const a=f.begin();f.setNow(50);f.end(a);const b=f.d.capture();assert.equal(b.ageMs,100);assert.equal(b.clockRegressions,1);assert.equal(b.recent[0][3],0);
  f.setNow(48*HOUR);const before=retained(f.d);f.d.capture();assert.deepEqual(retained(f.d),before);
  f.d.mark('layout-ready');assert.equal(f.d.capture().longObservationGaps,1);const reads=f.reads();f.d.mark('layout-ready');f.d.mark({toString:assert.fail});assert.equal(f.reads(),reads,'Repeat/unknown milestone never reads the clock');
});

test('million-event storm stays fixed-capacity, tracks later causes and retains no counter owners',()=>{
  const f=fixture(),cells=f.d.cells,initialBytes=cells.byteLength;for(let index=0;index<1000000;index++)f.d.cause(index%2?'known-file':'unknown');
  for(let index=0;index<100;index++){const token=f.begin();f.source.checked++;f.end(token);}
  f.d.cause('environment');const c=f.d.capture();assert.equal(f.d.cells,cells);assert.equal(initialBytes,INDEXING_ACTIVITY_CELL_CAPACITY*8);assert.equal(c.recent.length,16);assert.equal(c.omitted.rotated,84);
  assert.equal(c.causes[ACTIVITY_REASONS.indexOf('environment')],1);assert.equal(c.totals[6],1000001);
  assert(!Object.values(f.d).includes(f.source));assert(!Object.values(f.d).includes(f.session));
});

test('saturation/reset/absent counter facts remain explicit and never become successful zero work',()=>{
  const f=fixture();f.source.checked=MAX-1;const token=f.begin();f.source.checked=MAX+1;f.end(token);const a=f.d.capture();assert(a.saturated);assert.equal(cell(a,a.recent[0],'checked'),null);
  f.source.checked=10;const reset=f.begin();f.source.checked=0;f.end(reset,'incomplete');const b=f.d.capture();assert.equal(cell(b,b.recent.at(-1),'checked'),null);assert.equal(cell(b,b.recent.at(-1),'flags'),1);
  const noCounters=f.d.begin('full-build','global','manual');f.d.end(noCounters,'complete');assert.equal(cell(f.d.capture(),f.d.capture().lastGlobal,'parses'),null);
  f.d.totals[0]=MAX;const saturated=f.begin();f.end(saturated);assert.equal(f.d.capture().totals[0],MAX);
});

test('worst saturated 25-hour export fits 8KiB without removing totals, startup or last-global cause',()=>{
  const f=fixture();f.d.mark('onload');const token=f.begin('global','unscoped-resolved');f.source.checked=88;f.end(token);
  for(let hour=0;hour<25;hour++){f.setNow(hour*HOUR);f.d.cause('known-file');}
  // Saturate numeric storage directly as an adversarial size fixture, not a claimed real workload.
  for(let slot=0;slot<25;slot++)for(let metric=1;metric<12;metric++)f.d.cells[slot*12+metric]=MAX;
  for(let pass=0;pass<16;pass++){Object.keys(f.source).forEach(key=>{f.source[key]=0});Object.keys(f.session).forEach(key=>{f.session[key]=0});const current=f.begin();Object.keys(f.source).forEach(key=>{f.source[key]=MAX});Object.keys(f.session).forEach(key=>{f.session[key]=MAX});f.end(current);}
  const firstOpen=f.begin(),secondOpen=f.begin();assert(firstOpen&&secondOpen);
  const phases=f.d.capture().columns.phases.length,phaseOffset=25*12+16*23+2*37+23+ACTIVITY_REASONS.length+ACTIVITY_MILESTONES.length;
  f.d.cells.fill(MAX,phaseOffset,phaseOffset+phases*6);const before=retained(f.d),c=f.d.capture('eager','background','faster','12345.12345.12345+abcdef012345.dirty',...Array(ACTIVITY_CURRENT_COLUMNS.length).fill(MAX));
  assert(Buffer.byteLength(JSON.stringify(c))<=INDEXING_ACTIVITY_BYTE_LIMIT);assert.equal(c.totals[0],19);assert.equal(cell(c,c.lastGlobal,'selectionReason'),ACTIVITY_REASONS.indexOf('unscoped-resolved'));
  assert.equal(c.milestones[0],0);assert.deepEqual(retained(f.d),before);assert(c.omitted.reportPhaseLanes||c.omitted.reportHours,'Oversized detail omission is disclosed');
});

test('public build identities admit only fixed semver/source forms and never arbitrary labels',()=>{
  const f=fixture();for(const build of ['1.2.3','1.2.3+abcdef012345','1.2.3-beta.2+abcdef012345.dirty','1.2.3+source-archive','source-archive'])assert.equal(f.d.capture(undefined,undefined,undefined,build).settings.build,build);
  for(const build of ['private-vault','1.2.3+private-user','1.2.3+abcdef012345.path','1.2.3+abcdef0123456789'])assert.equal(f.d.capture(undefined,undefined,undefined,build).settings.build,null);
});

test('dispose releases retained observations/clock and late callbacks cannot reach the next lifetime',()=>{
  const f=fixture();const token=f.begin();f.d.mark('onload');const prior=f.d.capture();f.d.dispose();const before=retained(f.d),reads=f.reads();
  f.d.dispose();f.d.cause('known-file');f.d.mark('layout-ready');f.d.phase('source','pages');f.d.stopPhase('source');f.end(token);assert.equal(f.begin(),0);assert.deepEqual(retained(f.d),before);assert.equal(f.reads(),reads);
  const disposed=f.d.capture();assert.equal(disposed.status,'disposed');assert.equal(disposed.recent.length,0);assert.equal(disposed.lastGlobal,null);assert.equal(f.reads(),reads);
  const next=fixture();assert.equal(next.d.capture().totals[0],0);assert.equal(prior.active.length,1);assert.equal(projectIndexingActivity(prior),prior);
});
