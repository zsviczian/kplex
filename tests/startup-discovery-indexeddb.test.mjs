/**
 * Initial Vault discovery versus real changes through exact production lifecycle listeners,
 * source reconciliation and independent URL owners in real Chromium IndexedDB. The fixture
 * preserves ordinary restart validation; no source/read/storage algorithm is substituted.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import {contributorBrowserBundle, contributorBrowserInitialize} from './support/contributorBrowserFixture.mjs';
import {chromiumHarness} from './support/browserTypeScript.mjs';
import {centerGateSettings} from './support/requestedCenterGateFixture.mjs';
import {startupSourceCoordinatorSource} from './support/startupSourceCoordinator.mjs';

const bundle = await contributorBrowserBundle(['src/main.ts', 'src/index/GraphIndex.ts', 'src/index/GraphBuilder.ts',
  'src/index/IndexSnapshot.ts'], {'src/main.ts': startupSourceCoordinatorSource()});

for (const mode of ['eager', 'on-demand']) for (const change of ['discovery', 'same-stat-modify', 'late-create',
  'late-recreate', 'offline-alias', 'offline-date', 'offline-move', 'missing-metadata', 'damaged-metadata']) {
  test(`${mode}: initial discovery preserves ${change}`, /** Compare initial enumeration with genuine native/offline changes. */ async () => {
    const browser = await chromiumHarness(bundle);
    try {
      assert.equal(await browser.evaluate(contributorBrowserInitialize), true);
      assert.equal(await browser.evaluate(`(async()=>{
        const M=sourceModules,f=await fixture('discovery-${mode}-${change}'),mode=${JSON.stringify(mode)},change=${JSON.stringify(change)};
        const centerGateSettings=${centerGateSettings.toString()};let seeding,index;const cleanup=[];
        /** Observe existing completion without changing production deadlines or scheduler policy. */
        const until=async(predicate,message)=>{const end=Date.now()+10000;while(!predicate()){ok(Date.now()<end,message);await new Promise(done=>setTimeout(done,20));}};
        try{
          const a=f.add('A.md','Status:: before\\n[Old label](https://example.com/old)',{aliases:['old'],Meeting:'2026-10-23'});
          f.add('B.md','Friends:: [[A]]');f.app.vault.getName=()=> 'discovery-${mode}-${change}';
          f.app.vault.getAbstractFileByPath=path=>f.files.get(path)??(path===''?f.app.vault.getRoot():null);
          await f.acquire();ok(await f.acquisition.reconcile(),'Seed real source heads/dependency authority');
          const settings={...centerGateSettings({lastActivePath:'',showFolderNodes:false}),indexingMode:mode,urlIndexingMode:'background',indexingThrottle:'responsive',
            hierarchy:{hidden:[],parents:[],children:[],leftFriends:['Friends'],rightFriends:[],previous:[],next:[],exclusions:[]},
            inferAllLinksAsFriends:false,inverseInfer:false,showFullTagName:true,tagStyleList:[],pinnedNodes:[]};
          seeding=new M.GraphIndex({app:f.app,settings,getIndexSourceRevision:()=>0},f.app);
          await seeding.startBackgroundUrlIndex();await until(()=>seeding.getUrlIndexProgress().complete&&!seeding.getUrlIndexProgress().active,'Seed URL inventory');
          await seeding.indexedDb.flushQueuedBodyWrites();seeding.destroy();seeding=null;f.acquisition.close();
          const old=(await f.repository.inspect('A.md')).head;f.reads.length=0;f.parses.length=0;
          if(change==='offline-alias')f.metadata.get('A.md').frontmatter.aliases=['new'];
          if(change==='offline-date')f.app.dateFields.add('Meeting');
          if(change==='offline-move'){const text=f.texts.get('B.md');f.files.delete('B.md');f.metadata.delete('B.md');f.add('Moved.md',text);}
          if(change==='damaged-metadata')await edit(await f.cache.open(),['sourceChunks'],async tx=>{
            const store=tx.objectStore('sourceChunks'),rows=await value(store.getAll());const row=rows.find(row=>row.sourceId==='A.md'&&row.family==='metadata');
            ok(row,'Owned metadata chunk exists');store.delete([row.sourceId,row.revision,row.family,row.index]);
          });
          const p=new M.StartupSourceCoordinator();Object.assign(p,{app:f.app,settings,
            register:callback=>cleanup.push(callback),registerEvent:ref=>cleanup.push(()=>f.app.vault.offref(ref)),
            notifyIndexStatus(){},hasVisibleKplexSurface:()=>false});
          index=new M.GraphIndex(p,f.app,true,mode);p.index=index;
          p.installPreRestoreChangeFence();p.installInitialUrlListeners();
          for(const file of f.files.values())f.app.vault.trigger('create',file);
          if(change==='discovery'){
            equal([...f.files.values()].filter(file=>index.sourceAcquisition.states.get(file)?.bodyDirty).length,0,'Initial enumeration is not a body edit');
            equal(index.urlOwnerEvents.size,0,'Initial enumeration does not discard URL cache owners');
          }
          if(change==='same-stat-modify'){
            f.texts.set('A.md','Status:: after\\n[New label](https://example.com/new)');f.app.vault.trigger('modify',a);
            ok(index.sourceAcquisition.states.get(a).bodyDirty,'A same-stat edit retains its actual native body fence');
          }
          p.layoutReady=true;
          if(change==='late-create'){const file=f.add('Late.md','Status:: created');f.app.vault.trigger('create',file);}
          if(change==='late-recreate'){const file=f.add('A.md','Status:: recreated\\n[Recreated](https://example.com/recreated)',{aliases:['recreated']});f.app.vault.trigger('create',file);}
          const missing=change==='missing-metadata'?f.metadata.get('B.md'):null;
          if(missing)f.metadata.delete('B.md');
          p.indexPreparationAdmitted=true;index.admitPreparation();
          const reconciled=await index.sourceAcquisition.flush();
          if(missing){
            equal(reconciled,false,'Missing host metadata cannot become source authority');
            equal(index.sourceAcquisition.hasSemanticDependencies(),false,'No false source readiness');
            f.metadata.set('B.md',missing);f.app.metadataCache.trigger('changed',f.files.get('B.md'));
            ok(await index.sourceAcquisition.flush(),'Actual metadata recovery retains its source fence');
          }else ok(reconciled,'Actual source validation completes');
          if(change==='damaged-metadata'){
            // Unchanged host comparison is not an integrity scrub; an actual selected owner
            // still authenticates and repairs its damaged family before use.
            const body=await index.sourceAcquisition.readRequestedBody(a,()=>true);ok(body,'Immutable body remains independently readable');
            const acquired=await index.sourceAcquisition.acquire(a,body,()=>true);ok(acquired.current&&acquired.saved,'Selected owner repairs metadata');
            ok(await index.sourceAcquisition.flush(),'Repair closes ordinary authority');
          }
          await index.startBackgroundUrlIndex();await until(()=>index.getUrlIndexProgress().complete&&!index.getUrlIndexProgress().active,'Restart URL inventory');
          const counters=index.getSourceAcquisitionCounters();
          if(change==='discovery'){
            equal(counters.checked,0,'No unnecessary source reacquisition after full restart validation');
            equal(counters.vaultReads,0,'No source body reread');equal(counters.parses,0,'No source parser submission');equal(counters.repaired,0,'No source replacement');
            equal(index.getUrlIndexProgress().reads,0,'Ordinary URL cache remains reusable');
          }
          if(change==='same-stat-modify'||change==='late-recreate'){
            ok(counters.vaultReads>0,'Genuine same-stat native edits still read the body');
            ok((await index.indexedDb.sources.inspect('A.md')).head.sourceRevision!==old.sourceRevision,'Changed source receives a new durable revision');
            const url=change==='same-stat-modify'?'https://example.com/new':'https://example.com/recreated';
            ok(index.publishedUrlState.pages.has(url),'Genuine URL observations publish the actual new facts');
            ok(!index.publishedUrlState.pages.has('https://example.com/old'),'Old cached URL incidence cannot survive the edit');
          }
          if(change==='late-create')ok((await index.indexedDb.sources.inspect('Late.md')).saved,'A real post-layout create persists');
          if(change==='offline-alias'||change==='offline-date'||change==='damaged-metadata'){
            ok(counters.repaired+counters.resolutionRefreshes>0,'Offline drift/corruption retains real acquisition or resolution refresh');
            const selected=await index.indexedDb.sources.inspect('A.md',['metadata']);ok(selected.saved&&selected.families.metadata==='ready','Repaired metadata is validated');
            if(change==='offline-date'){ok(selected.head.observation.environment!==old.observation.environment,'Date registry changes retain environment validation');const rows=[];await index.indexedDb.sources.visit('A.md','resolution',batch=>{rows.push(...batch);return true;});ok(rows.some(row=>row.kind==='date-property'),'Offline Date registration publishes actual date resolution');}
          }
          if(change==='offline-move'){
            equal((await index.indexedDb.sources.inspect('B.md')).reason,'tombstone','Retired path cannot survive discovery');
            ok((await index.indexedDb.sources.inspect('Moved.md')).saved,'New physical path receives normal acquisition');
          }
          return true;
        }finally{for(const release of cleanup.reverse())release();seeding?.destroy();index?.destroy();f.close();}
      })()`), true);
    } finally { await browser.cleanup(); }
  });
}
