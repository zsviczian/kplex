/**
 * Measure actual cached-source validation work in doubling-size real Chromium/IndexedDB fixtures.
 * Genuine acquisition seeds durable heads/dependencies outside measurement; a new connection and
 * acquisition lifetime then handle clean restart or an ordinary unscoped resolved wave. No graph,
 * storage, lease, digest or validation behavior is replaced. This is not native startup timing.
 * Single/multi-chunk and compatible parser2 fixtures share the same lifecycle. Repeated exact-owner
 * reads have a separate drained probe interval, so their work cannot be hidden in restart totals.
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {appendFileSync,existsSync,readFileSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {join,resolve} from 'node:path';
import {contributorBrowserBundle,contributorBrowserInitialize} from '../../tests/support/contributorBrowserFixture.mjs';
import {chromiumHarness} from '../../tests/support/browserTypeScript.mjs';
import {spawnNativeSync} from './obsidian/processTools.mjs';
import {createStartupResourceProbe} from './obsidian/startupResources.mjs';
const root=resolve(fileURLToPath(new URL('../..',import.meta.url))),overrides={};
const reportPath=process.env.KPLEX_BENCHMARK_REPORT;
if(reportPath&&(existsSync(reportPath)||existsSync(reportPath+'.samples.jsonl')))throw Error('Report exists; preserve prior evidence');
const ref=process.argv.find(/** Select an immutable committed source baseline. */ arg=>arg.startsWith('--baseline-ref='))?.split('=')[1];
const sizes=(process.argv.find(/** Keep scale explicit and bounded. */ arg=>arg.startsWith('--sizes='))?.split('=')[1]??'32,64,128').split(',').map(Number);
const profiles=(process.argv.find(/** Restrict shape labels to fixed synthetic fixture recipes. */ arg=>arg.startsWith('--profiles='))?.split('=')[1]??'single,multi,parser2').split(',');
const repeats=Number(process.argv.find(/** Repeat exact-owner readers without adding another timing framework. */ arg=>arg.startsWith('--repeats='))?.split('=')[1]??2);
const mode=process.argv.find(/** Counts and detailed observations are separate overhead arms. */ arg=>arg.startsWith('--mode='))?.split('=')[1]??'detailed';
if(ref&&!/^[a-f0-9]{7,40}$/.test(ref))throw Error('Use an immutable commit hash');
if(!sizes.length||sizes.length>8||sizes.some(/** Refuse accidental huge fixture setup. */ size=>!Number.isSafeInteger(size)||size<2||size>4096))throw Error('Use 2–4096 owners per fixture');
if(!profiles.length||new Set(profiles).size!==profiles.length||profiles.some(/** No arbitrary label or fixture body enters the report. */ profile=>!['single','multi','parser2'].includes(profile)))throw Error('Use single,multi,parser2 fixture profiles');
if(!Number.isSafeInteger(repeats)||repeats<1||repeats>16)throw Error('Use 1–16 exact-owner reader cycles');
if(!['counts','detailed'].includes(mode))throw Error('Use counts or detailed mode');
const paths=['src/adapters/obsidian/sourceAcquisition.ts','src/index/SourceRepository.ts','src/adapters/obsidian/startupDiagnostics.ts'];
if(ref)for(const path of paths){const r=spawnNativeSync('git',['show',`${ref}:${path}`],{cwd:root,encoding:'utf8',timeout:10000});if(r.error||r.status!==0)throw Error('Baseline unavailable');overrides[path]=r.stdout;}
const source=Object.fromEntries(paths.map(/** Pin exactly the sources supplied to the browser bundle. */ path=>[path,createHash('sha256').update(overrides[path]??readFileSync(join(root,path))).digest('hex')]));
const browser=await chromiumHarness(await contributorBrowserBundle(['src/adapters/obsidian/startupDiagnostics.ts'],overrides)),results=[];
try{
 assert.equal(await browser.evaluate(contributorBrowserInitialize),true);
 assert.equal(await browser.evaluate(`window.sourceWorkProbeFactory=(${createStartupResourceProbe.toString()});true`),true);
 for(const count of sizes)for(const profile of profiles)for(const wave of [false,true]){
  if(reportPath)appendFileSync(reportPath+'.samples.jsonl',JSON.stringify({status:'starting',owners:count,profile,resolvedWave:wave,at:new Date().toISOString()})+'\n');
  const result=await browser.evaluate(`(/** Reopen genuine durable state and observe a complete restart inventory. */ async()=>{
   const M=sourceModules,name='validation-work-${count}-${profile}-${wave}',f=await fixture(name);let cache,acquisition,probe,phase='initialization';
   try{
    for(let n=0;n<${count};n++){
     const references=${JSON.stringify(profile)}==='multi'?Array.from({length:600},(_,i)=>'[[Synthetic-'+n+'-'+i+']]').join(' '):'[[Note-'+((n+1)%${count})+']]';
     const file=f.add('Note-'+n+'.md','Friends:: '+references+(${JSON.stringify(profile)}==='parser2'?'':'\\n[Example](https://example.com/'+n+')'),{aliases:['Alias-'+n]});
     f.metadata.get(file.path).links=[{link:'Note-'+((n+1)%${count}),position:{start:{line:0,offset:0},end:{line:0,offset:10}}}];
    }
    await f.acquire();ok(await f.acquisition.reconcile(),'Seed complete genuine dependency authority');
    const seeded=await f.repository.inspect('Note-0.md',[]);
    const familyChunks=Object.fromEntries(Object.entries(seeded.head.families).map(([family,manifest])=>[family,manifest.chunks]));
    if(${JSON.stringify(profile)}==='multi')ok(familyChunks.resolution>1&&familyChunks.values>1,'Dense fixture actually contains multiple immutable family chunks');
    else ok(Object.values(familyChunks).every(chunks=>chunks===1),'Small fixture uses one physical chunk per family');
    if(${JSON.stringify(profile)}==='parser2'){
     const db=await f.cache.open();await edit(db,['sourceHeads'],async tx=>{
      const heads=await value(tx.objectStore('sourceHeads').getAll());
      for(const head of heads){ok(head.families['body-urls'].records===0,'Parser2 fixture is genuinely URL-free');tx.objectStore('sourceHeads').put({...head,bodyParserVersion:2});}
     });
    }
    f.acquisition.close();f.cache.close();
    cache=new M.KplexIndexedDbCache(name);ok(await cache.open(),'Reopen real IndexedDB');
    const diagnostics=new M.StartupDiagnostics();diagnostics.begin(true);
    acquisition=new M.ObsidianSourceAcquisition(f.app,cache,async text=>{f.parses.push(text);return M.parseBodyMetadata(text);},undefined,undefined,diagnostics);
    acquisition.start();
    const options={phase:()=>phase==='initialization'?diagnostics.progress('source')?.phase??phase:phase,now:()=>performance.now(),databaseName:dbName(name),detailed:${mode==='detailed'}};
    const originalFileCache=f.app.metadataCache.getFileCache;
    probe=window.sourceWorkProbeFactory(options);
    probe.attach({sourceAcquisition:acquisition,indexedDb:cache});
    if(${mode==='detailed'}){
     acquisition.metadataHost.dailyNotesSettings();await cache.sources.inspect('Note-0.md',[]);acquisition.metadataHost.dailyNotesSettings();
     equal(probe.snapshot().groups['initialization:host.dailyNotesSettings'].calls,2,'Host methods wrap exactly once, independently of request count');
    }
    probe.stop();equal(f.app.metadataCache.getFileCache===originalFileCache,true,'Observer cleanup restores exact host method identity');
    probe=window.sourceWorkProbeFactory(options);probe.attach({sourceAcquisition:acquisition,indexedDb:cache});
    const before=f.reads.length,parses=f.parses.length;
    if(${wave})f.app.metadataCache.trigger('resolved');
    const at=performance.now(),ready=await acquisition.reconcile(),elapsedMs=performance.now()-at;
    ok(ready&&acquisition.hasSemanticDependencies(),'Actual source authority closes');
    const resources=probe.snapshot();
    const source=acquisition.getCounters(),workDiagnostics=diagnostics.snapshot();
    equal(resources.activeTransactions,0,'Restart native transactions drained');equal(resources.pending,0,'Restart method observations drained');
    if(resources.drain)ok(Object.values(resources.drain).every(Boolean),'Restart source-family readers, leases and decode reservations drained');
    probe.stop();phase='repeated-owner';probe=window.sourceWorkProbeFactory(options);probe.attach({sourceAcquisition:acquisition,indexedDb:cache});
    const repeatedAt=performance.now(),file=f.files.get('Note-0.md');
    for(let cycle=0;cycle<${repeats};cycle++){
     ok(await acquisition.readBody(file),'Repeated exact-owner body remains readable');
     const inspected=await cache.sources.inspect(file.path,['metadata']);equal(inspected.reason,'ready','Repeated metadata remains validated');
     const selected=await cache.sources.readSelected(file.path,stamp=>stamp.saved?'ready':'unsaved',async reader=>reader.visit('resolution',()=>true));
     equal(selected.outcome,'ready','Repeated exact-owner selection remains authoritative');
    }
    const repeated={cycles:${repeats},elapsedMs:performance.now()-repeatedAt,resources:probe.snapshot()};
    return {owners:${count},profile:${JSON.stringify(profile)},familyChunks,resolvedWave:${wave},elapsedMs,ready,resources,source,reads:f.reads.length-before,parses:f.parses.length-parses,diagnostics:workDiagnostics,repeated};
   }finally{probe?.stop();acquisition?.close();cache?.close();f.close();}
  })()`);
  assert.equal(result.ready,true);assert.equal(result.reads,0);assert.equal(result.parses,0);
  assert.equal(result.resources.activeTransactions,0);assert.equal(result.resources.pending,0);
  assert.equal(result.repeated.resources.activeTransactions,0);assert.equal(result.repeated.resources.pending,0);
  if(result.repeated.resources.drain)assert(Object.values(result.repeated.resources.drain).every(Boolean));
  if(result.diagnostics.sessionWork)assert.deepEqual(result.diagnostics.sessionWork,{sourceInventoryPasses:1,fullBuildStarts:0,nodeCatalogStarts:0,completeSnapshotSaves:0,checkpointSaves:0});
  results.push(result);if(reportPath)appendFileSync(reportPath+'.samples.jsonl',JSON.stringify({status:'passed',...result})+'\n');
 }
 const browserVersion=await browser.command('Browser.getVersion');
 const report={node:process.version,baselineRef:ref??null,source,
  driverSha256:createHash('sha256').update(readFileSync(fileURLToPath(import.meta.url))).digest('hex'),probeSha256:createHash('sha256').update(readFileSync(join(root,'scripts/testing/obsidian/startupResources.mjs'))).digest('hex'),
  browser:{product:browserVersion.product,jsVersion:browserVersion.jsVersion},mode,profiles,repeats,
  fixture:{multiReferencesPerOwner:600,parser2:'Authentic current URL-free families with the persisted parser version changed to compatible version 2; no source payload or validation is bypassed.'},
  method:'Genuine source restart in real IndexedDB; setup excluded. Repeated exact-owner reads measured separately after drain. Doubling-size work counts and inclusive awaited method time, not native startup/CPU/battery timing.',results};
 if(reportPath)writeFileSync(reportPath,JSON.stringify({status:'passed',...report},null,2)+'\n');
 console.log(JSON.stringify(results.map(/** Keep console output compact; complete aggregate groups go to the report. */ row=>({owners:row.owners,profile:row.profile,resolvedWave:row.resolvedWave,elapsedMs:row.elapsedMs,source:row.source,leases:row.resources.leases,readers:row.resources.readers,transactions:Object.entries(row.resources.groups).filter(/** Count all store/mode selections. */ ([key])=>key.includes(':tx.')).reduce(/** Sum disjoint transaction buckets. */ (sum,[,value])=>sum+value.calls,0)}))));
}catch(error){
 if(reportPath)writeFileSync(reportPath,JSON.stringify({status:'failed',node:process.version,baselineRef:ref??null,source,sizes,profiles,mode,repeats,error:String(error.message),results},null,2)+'\n');
 throw error;
}finally{await browser.cleanup();}
