/**
 * Hydration lifetime/value/publication regressions through the production index and real Chromium
 * IndexedDB. Only explicit reentry/await holds are injected; snapshot decoding, graph semantics and
 * cancellation ownership remain production behavior. Every fixture and wrapper is retired on failure.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { chromiumHarness } from './support/browserTypeScript.mjs';
import { hydrationWorkBundle, contributorBrowserInitialize, initializeHydrationWork } from './support/hydrationWorkFixture.mjs';

const bundle = await hydrationWorkBundle();

/** Run independent actual-IDB cases in one browser, with bounded waits that cannot hide a leaked task. */
test('hydration guards retain policy/lifetime/physical fences while removing per-record signatures', async t => {
  const browser = await chromiumHarness(bundle);
  try {
    assert.equal(await browser.evaluate(contributorBrowserInitialize), true);
    assert.equal(await browser.evaluate(initializeHydrationWork), true);
    assert.equal(await browser.evaluate(String.raw`(() => {
      /** Limit a public wait without releasing the deliberately held storage operation. */
      window.hydrationDeadline=(promise,label)=>{
        let timer;return Promise.race([promise,new Promise((_,reject)=>timer=setTimeout(()=>reject(Error(label+' remained pending')),3000))]).finally(()=>clearTimeout(timer));
      };
      /** Pause the real reader's open await once, retaining its original continuation/receiver. */
      window.holdHydrationOpen=(index,phase)=>{
        const owner=index.indexedDb,original=owner.open;
        let enter,release,held=false;
        const entered=new Promise(resolve=>enter=resolve),gate=new Promise(resolve=>release=resolve);
        owner.open=async function(...args){
          const result=await original.apply(this,args);
          if(!held && index.getSnapshotHydrationDiagnostics().phase===phase){held=true;enter();await gate;}
          return result;
        };
        return {entered,release,restore(){owner.open=original;release();}};
      };
      return true;
    })()`), true);

    for (const records of [256, 1024, 4096]) {
      await t.test(`current chunked ${records}-record graph preserves ordered semantics with bounded signature work`, async () => {
        const result=await browser.evaluate(`(async()=>{
          const f=await hydrationWorkFixture('guards-work-${records}',${records},256);
          const probe=sourceModules.installHydrationWorkProbe(()=>performance.now(),()=>f.index.getSnapshotHydrationDiagnostics().phase);
          try {
            const expected=hydrationWorkValue({state:f.state});
            ok((await f.index.restoreIndexedDbSnapshot(['Hub.md'])).restored,'Preview');
            ok((await f.index.waitForSnapshotHydration()).restored,'Full graph');
            const phases=probe.snapshot();probe.restore();
            equal(hydrationWorkValue(f.index),expected,'Exact ordered roles, direction and provenance');
            equal(f.f.reads.length,0,'Warm body reads');equal(f.f.parses.length,0,'Warm parses');
            return {records:${records},phases};
          } finally {probe.restore();f.close();}
        })()`);
        // Notifications occur every 256 records; storage batches/yields add full checks. This bound
        // detects per-record serialization without asserting scheduler-dependent exact call counts.
        for (const phase of ['pages','relations','evidence']) {
          assert.ok(result.phases[phase].calls < records / 8, `${phase}: ${JSON.stringify(result.phases[phase])}`);
        }
      });
    }

    for (const mutation of ['in-place','replacement','observed-ABA','invalidate-ABA','unload','purge','supersede','physical-replacement','membership']) {
      await t.test(`${mutation} during a real storage await rejects late hydration`, async () => {
        assert.equal(await browser.evaluate(`(async()=>{
          const f=await hydrationWorkFixture('guards-await-${mutation}',512,128),index=f.index;
          const hold=holdHydrationOpen(index,'pages');let fullGuard;
          const iterate=index.indexedDb.iterateSnapshotPages;
          index.indexedDb.iterateSnapshotPages=function(meta,visit,current,...args){fullGuard=current;return iterate.call(this,meta,visit,current,...args);};
          try {
            const restore=index.restoreIndexedDbSnapshot(['Hub.md']);
            await hydrationDeadline(hold.entered,'Storage hold');
            const state=index.state,revision=index.publicationRevision,waiting=index.waitForSnapshotHydration();
            const mutation='${mutation}';
            if(mutation==='in-place') f.settings.hierarchy.parents.push('Changed');
            if(mutation==='replacement') f.plugin.settings={...f.settings,inverseInfer:true};
            if(mutation==='observed-ABA'){
              f.settings.hierarchy.parents.push('Changed');equal(fullGuard(),false,'Observe changed policy');
              f.settings.hierarchy.parents.pop();equal(fullGuard(),false,'Retired value lifetime cannot revive');
            }
            if(mutation==='invalidate-ABA'){
              f.settings.hierarchy.parents.push('Changed');index.invalidateSemanticPolicy();f.settings.hierarchy.parents.pop();
            }
            if(mutation==='unload') index.destroy();
            if(mutation==='purge') await index.purgePersistentIndexCache();
            if(mutation==='supersede') index.publishRestoredState(state,null,true,false);
            if(mutation==='physical-replacement'){
              const replacement=new ContributorFile(f.file.path);replacement.stat={...f.file.stat};replacement.parent=f.file.parent;
              f.f.files.set(f.file.path,replacement);
            }
            if(mutation==='membership') f.f.add('Added.md','');
            const retiredState=index.state;
            if(['invalidate-ABA','unload','purge'].includes(mutation)){
              equal((await hydrationDeadline(waiting,'Cancelled public hydration')).restored,false,'Public wait settles before storage resumes');
            }
            hold.release();
            await hydrationDeadline(restore,'Initial restore');
            equal((await hydrationDeadline(waiting,'Late hydration')).restored,false,'Captured generation rejected');
            equal(index.state===retiredState,true,'Late private records do not replace visible graph or unloaded state');
            equal(index.publicationRevision,revision+(mutation==='supersede'?1:0),'No late publication');
            equal(index.fullSnapshotHydrated,false,'Rejected generation is not complete');
            if(mutation==='supersede'){
              const failure=index.getSnapshotHydrationDiagnostics().firstFailure;
              equal(failure.reason,'publication-superseded','Failed publication guard survives its cancellation');
              equal(failure.operation,'open','Exact first failed reader boundary');
              equal(failure.pages,0,'The candidate was rejected before decoding pages');
              equal(failure.publicationCause,'snapshot','Real replacement owner is reported');
              failure.reason='private injected value';
              equal(index.getSnapshotHydrationDiagnostics().firstFailure.reason,'publication-superseded','Exported failure is an independent copy');
            }
            if(mutation==='physical-replacement') equal(index.getSnapshotHydrationDiagnostics().firstFailure.reason,'physical-identity-changed','Same-stat replacement has a distinct reason');
            if(mutation==='membership') equal(index.getSnapshotHydrationDiagnostics().firstFailure.reason,'physical-membership-changed','Membership failure remains distinct');
            equal(f.f.reads.length,0,'No fallback body scan');equal(f.f.parses.length,0,'No fallback parser');
            return true;
          } finally {index.indexedDb.iterateSnapshotPages=iterate;hold.restore();f.close();}
        })()`), true);
      });
    }

    await t.test('a real unchanged foreground file commit before page delivery does not force a source-vocabulary detour', /** Exercise coordinator recovery using the genuine source publisher and compiler snapshot. */ async () => {
      const result=await browser.evaluate(`(async()=>{
        const f=await hydrationWorkFixture('guards-real-foreground',512,0,'eager',true),index=f.index;
        const hold=holdHydrationOpen(index,'pages');let inventories=0,catalogs=0;
        const inventory=index.startPersistedSourceInventory,catalog=sourceModules.GraphBuilder.prototype.buildSourceNodeCatalog;
        index.startPersistedSourceInventory=/** Count fallback admission without replacing its work/result. */ async function(...args){inventories++;return inventory.apply(this,args);};
        sourceModules.GraphBuilder.prototype.buildSourceNodeCatalog=/** Count only actual global vocabulary calls. */ async function(...args){catalogs++;return catalog.apply(this,args);};
        try{
          const restore=index.restoreIndexedDbSnapshot(['Hub.md']);
          await hydrationDeadline(hold.entered,'Actual full-reader open');
          f.releaseSources();
          const patch=await hydrationDeadline(index.patchMarkdownPaths(['Hub.md'],{useDurableCache:true}),'Real foreground source publication');
          equal(patch.outcome,'patched','Actual current source transaction committed');
          const publication=index.publicationRevision;
          hold.release();
          await hydrationDeadline(restore,'Preview result');
          const outcome=await hydrationDeadline(index.waitForSnapshotHydration(),'Coordinator recovery');
          const diagnostic=index.getSnapshotHydrationDiagnostics();
          return {outcome,diagnostic,inventories,catalogs,publication,finalPublication:index.publicationRevision,
            full:index.fullSnapshotHydrated,reads:f.f.reads.length,parses:f.f.parses.length,
            canonical:[...index.state.pages.values()].every(/** Every restored relation targets this published generation's canonical page. */ page=>[...page.neighbours].every(/** Do not retain targets from the retired foreground graph. */ ([path,relation])=>relation.target===index.state.pages.get(path)))};
        }finally{index.startPersistedSourceInventory=inventory;sourceModules.GraphBuilder.prototype.buildSourceNodeCatalog=catalog;hold.restore();f.close();}
      })()`);
      assert.equal(result.diagnostic.firstFailure?.reason,'publication-superseded');
      assert.equal(result.diagnostic.firstFailure?.publicationCause,'file-patch');
      assert.equal(result.diagnostic.firstFailure?.operation,'open');
      assert.equal(result.diagnostic.firstFailure?.pages,0);
      assert.equal(result.full,true,JSON.stringify(result));
      assert.equal(result.diagnostic.attempts,2,'Only one newly fenced attempt follows the rejected candidate');
      assert.equal(result.diagnostic.route,'full-snapshot');
      assert.equal(result.canonical,true,'The newly published graph keeps canonical target identities');
      assert.equal(result.inventories,0,'An unchanged reusable graph does not need global source recovery');
      assert.equal(result.catalogs,0,'No unnecessary full source node catalog');
      assert.equal(result.reads,0);assert.equal(result.parses,0);
    });

    for (const scenario of ['baseline-only','baseline-file','baseline-changed-file','baseline-mixed','baseline-reentrant']) {
      await t.test(`a genuine startup structural publication remains safely accounted for: ${scenario}`,/** Reproduce the native baseline producer rather than changing a publication integer. */ async()=>{
        const result=await browser.evaluate(`(/** Execute the real body-free producer while the actual full reader is held. */ async()=>{
          const scenario='${scenario}',f=await hydrationWorkFixture('guards-structural-'+scenario,32,0,'eager',true),index=f.index;
          const hold=holdHydrationOpen(index,'pages'),inventory=index.startPersistedSourceInventory,catalog=sourceModules.GraphBuilder.prototype.buildSourceNodeCatalog,publisher=index.publishRestoredState;
          let inventories=0,catalogs=0;
          index.startPersistedSourceInventory=/** Count the actual recovery owner without replacing its result. */ function(...args){inventories++;return inventory.apply(this,args);};
          sourceModules.GraphBuilder.prototype.buildSourceNodeCatalog=/** Count actual vocabulary compilation. */ function(...args){catalogs++;return catalog.apply(this,args);};
          try{
            const expected=hydrationWorkValue({state:f.state}),restore=index.restoreIndexedDbSnapshot(['Hub.md']);await hydrationDeadline(hold.entered,'Full reader');
            if(scenario==='baseline-reentrant'){
              let reentered=false;
              index.publishRestoredState=/** A second real publication before the producer returns must never borrow its receipt. */ function(...args){const value=publisher.apply(this,args);if(!reentered){reentered=true;publisher.call(this,this.state,null,true,false);}return value;};
            }
            ok(await hydrationDeadline(index.initializeOnDemandBaseline(['Hub.md']),'Real structural baseline'),'Actual baseline publication');
            f.releaseSources();
            if(scenario==='baseline-changed-file'){
              const text='[[Current target]]';f.f.texts.set(f.file.path,text);f.f.app.metadataCache.unresolvedLinks[f.file.path]={'Current target':1};
              ok(await f.f.cache.putBody(f.file.path,f.file.stat.mtime,sourceModules.parseBodyMetadata(text)),'Real same-stat changed facts');index.fieldCache.delete(f.file.path);
            }
            if(scenario==='baseline-mixed')index.publishRestoredState(index.state,null,true,false);
            if(scenario!=='baseline-only')equal((await index.patchMarkdownPaths(['Hub.md'],{useDurableCache:true,forceRecompile:true})).outcome,'patched','Actual source publication');
            hold.release();await restore;await hydrationDeadline(index.waitForSnapshotHydration(),'Coordinator outcome');
            if(index.fullSnapshotHydrated)equal(hydrationWorkValue(index),expected,'Exact saved canonical adjacency/provenance after startup baseline');
            return {full:index.fullSnapshotHydrated,diagnostic:index.getSnapshotHydrationDiagnostics(),inventories,catalogs,
              reads:f.f.reads.length,parses:f.f.parses.length,current:!!index.state.pages.get('Current target'),retired:index.snapshotForegroundWindow===null};
          }finally{index.publishRestoredState=publisher;index.startPersistedSourceInventory=inventory;sourceModules.GraphBuilder.prototype.buildSourceNodeCatalog=catalog;hold.restore();f.close();}
        })()`);
        const reusable=scenario==='baseline-only'||scenario==='baseline-file';
        assert.equal(result.full,reusable,JSON.stringify(result));assert.equal(result.retired,true);
        assert.equal(result.diagnostic.attempts,scenario==='baseline-mixed'||scenario==='baseline-reentrant'?1:2);
        assert.equal(result.diagnostic.firstFailure?.reason,'publication-superseded');
        if(reusable){assert.equal(result.inventories,0);assert.equal(result.catalogs,0);assert.equal(result.diagnostic.route,'full-snapshot');}
        if(scenario==='baseline-changed-file')assert.equal(result.current,true,'Changed facts survive conservative fallback');
        assert.equal(result.reads,0);assert.equal(result.parses,0);
      });
    }

    for (const mutation of ['changed-source','missing-saved-proof','mixed-publication']) {
      await t.test(`${mutation} cannot replace a current foreground commit with an older saved graph`, /** Reject unproved saved semantics through the actual outer coordinator. */ async () => {
        const result=await browser.evaluate(`(async()=>{
          const mutation='${mutation}',f=await hydrationWorkFixture('guards-proof-'+mutation,32,0,'eager',mutation!=='missing-saved-proof'),index=f.index;
          const hold=holdHydrationOpen(index,'pages');
          try{
            const restore=index.restoreIndexedDbSnapshot(['Hub.md']);await hydrationDeadline(hold.entered,'First page reader');
            f.releaseSources();
            if(mutation==='changed-source'){
              const text='[[Current target]]';f.f.texts.set(f.file.path,text);
              f.f.app.metadataCache.unresolvedLinks[f.file.path]={'Current target':1};
              await f.f.cache.putBody(f.file.path,f.file.stat.mtime,sourceModules.parseBodyMetadata(text));
              index.fieldCache.delete(f.file.path);
            }
            if(mutation==='mixed-publication') index.publishRestoredState(index.state,null,true,false);
            equal((await index.patchMarkdownPaths(['Hub.md'],{useDurableCache:true,forceRecompile:true})).outcome,'patched','Real file publisher');
            hold.release();await restore;await hydrationDeadline(index.waitForSnapshotHydration(),'Safe fallback');
            return {full:index.fullSnapshotHydrated,diagnostic:index.getSnapshotHydrationDiagnostics(),
              reasons:index.getIndexDiagnostics().map(/** Return only safe decision enums. */ row=>row.reason),
              current:!!index.state.pages.get('Current target'),windowRetired:index.snapshotForegroundWindow===null};
          }finally{hold.restore();f.close();}
        })()`);
        assert.equal(result.full,false,JSON.stringify(result));
        assert.equal(result.windowRetired,true);
        assert.equal(result.diagnostic.attempts,mutation==='mixed-publication'?1:2);
        if(mutation!=='mixed-publication') assert.ok(result.reasons.includes('snapshot-foreground-proof-mismatch'),JSON.stringify(result));
        if(mutation==='changed-source') assert.equal(result.current,true,'Current source vocabulary survives conservative fallback');
      });
    }

    await t.test('a checkpoint fallback cannot borrow retry eligibility from a corrupt fresh active snapshot',/** Keep the single new attempt restricted to the actual complete active generation. */ async()=>{
      const result=await browser.evaluate(`(/** Corrupt an actual active chunk and interrupt the independently stored checkpoint reader. */ async()=>{
        const f=await hydrationWorkFixture('guards-checkpoint-retry',32,0,'eager',true),i=f.index,M=sourceModules;
        let enter,release,checkpoint=false,held=false;const entered=new Promise(/** Report the checkpoint storage boundary. */ resolve=>enter=resolve),gate=new Promise(/** Own independent late-read cleanup. */ resolve=>release=resolve);
        const open=i.indexedDb.open,iterate=i.indexedDb.iterateSnapshotPages;
        try{
          const active=await f.f.cache.readSnapshotMeta(),db=await f.f.cache.open();
          ok(await f.f.cache.writeSnapshot({createdAt:Date.now(),vaultSignature:M.computeVaultSignature(f.f.app),settingsSignature:M.computeIndexSettingsSignature(f.settings),
            urlAliasVersion:M.URL_ALIAS_FACET_VERSION,discoveredFields:[],completedMarkdownPaths:['Hub.md']},
            [...f.state.pages.values()].map(/** Preserve genuine checkpoint owner signatures. */ page=>M.persistedPageFromGraphPage(page,f.fingerprints.get(page.path))),
            [...f.state.evidence.declarations()].map(/** Use actual saved provenance. */ item=>M.persistedDeclarationFromEvidence(item)),/** Setup has no competing writer. */ ()=>true,'checkpoint'),'Real checkpoint activation');
          await edit(db,['snapshotChunks'],/** Damage only the active generation, leaving the checkpoint intact. */ tx=>tx.objectStore('snapshotChunks').delete([active.generation,'pages',0]));
          i.indexedDb.iterateSnapshotPages=/** Identify the real candidate without substituting returned records. */ function(meta,...args){checkpoint=meta.key==='checkpoint';return iterate.call(this,meta,...args);};
          i.indexedDb.open=/** Capture this reader before awaiting, then hold its genuine connection completion. */ async function(...args){const holding=checkpoint&&!held;if(holding)held=true;const db=await open.apply(this,args);if(holding){enter();await gate;}return db;};
          f.releaseSources();const restore=i.restoreIndexedDbSnapshot(['Hub.md']);await hydrationDeadline(entered,'Checkpoint reader');
          equal((await i.patchMarkdownPaths(['Hub.md'],{useDurableCache:true,forceRecompile:true})).outcome,'patched','Current foreground source');
          release();await restore;await hydrationDeadline(i.waitForSnapshotHydration(),'Checkpoint interruption fallback');
          return {diagnostic:i.getSnapshotHydrationDiagnostics(),full:i.fullSnapshotHydrated,windowRetired:i.snapshotForegroundWindow===null};
        }finally{release();i.indexedDb.open=open;i.indexedDb.iterateSnapshotPages=iterate;f.close();}
      })()`);
      assert.equal(result.diagnostic.firstFailure?.reason,'missing-chunk');
      assert.equal(result.diagnostic.attempts,2,'Exactly the active and checkpoint attempts; no borrowed retry');
      assert.equal(result.full,false);
      assert.equal(result.windowRetired,true);
    });

    for (const mutation of ['second-file-commit','physical-replacement','stat','membership','folder','attachment','policy-ABA','unload','purge','second-restore','watchdog-progress']) {
      await t.test(`a held second attempt remains fenced after ${mutation}`, /** Retire a new candidate independently of the first failure and its public wait. */ async () => {
        const result=await browser.evaluate(`(async()=>{
          const mutation='${mutation}',f=await hydrationWorkFixture('guards-retry-'+mutation,32,0,'eager',true),index=f.index;
          const hold=holdHydrationOpen(index,'pages'),open=index.indexedDb.open;
          let enter,release,held=false,quietProgress=null;const entered=new Promise(/** Report actual second-reader entry. */ resolve=>enter=resolve),gate=new Promise(/** Independent cleanup owns release. */ resolve=>release=resolve);
          index.indexedDb.open=/** Hold only the new candidate, retaining its original storage promise/result. */ async function(...args){
            const value=await open.apply(this,args);
            if(!held&&index.getSnapshotHydrationDiagnostics().attempts===2){held=true;enter();await gate;}return value;
          };
          try{
            const restore=index.restoreIndexedDbSnapshot(['Hub.md']);await hydrationDeadline(hold.entered,'First candidate');f.releaseSources();
            await index.patchMarkdownPaths(['Hub.md'],{useDurableCache:true,forceRecompile:true});
            if(mutation==='watchdog-progress'){
              await hydrationDeadline(index.sourceAcquisition.flush(),'Real source closure');
              quietProgress=index.getSnapshotHydrationDiagnostics().lastProgressAt;
              await new Promise(/** Cross a real clock tick without advancing source or decoder work. */ resolve=>setTimeout(resolve,20));
            }
            hold.release();await hydrationDeadline(entered,'Second candidate');await restore;
            if(mutation==='watchdog-progress')equal(index.getSnapshotHydrationDiagnostics().lastProgressAt,quietProgress,'Retry admission does not credit empty progress or extend the watchdog');
            const waiting=index.waitForSnapshotHydration(),publication=index.publicationRevision;
            if(mutation==='second-file-commit') await index.patchMarkdownPaths(['Hub.md'],{useDurableCache:true,forceRecompile:true});
            if(mutation==='physical-replacement'){const file=new ContributorFile(f.file.path);file.stat={...f.file.stat};file.parent=f.file.parent;f.f.files.set(file.path,file);}
            if(mutation==='stat') f.file.stat.mtime++;
            if(mutation==='membership') f.f.add('New.md','');
            if(mutation==='folder') {const folder=new ContributorFolder();folder.path='New folder';folder.name='New folder';const get=f.f.app.vault.getRoot;f.f.app.vault.getRoot=/** Expose changed membership through the production inventory's actual tree input. */ ()=>{const root=get();root.children.push(folder);return root;};}
            if(mutation==='attachment') f.f.add('New.png','');
            if(mutation==='policy-ABA'){f.settings.hierarchy.parents.push('Changed');index.invalidateSemanticPolicy();f.settings.hierarchy.parents.pop();}
            if(mutation==='unload') index.destroy();
            if(mutation==='purge') await index.purgePersistentIndexCache();
            let second;
            if(mutation==='second-restore') second=index.restoreIndexedDbSnapshot(['Hub.md']);
            if(['policy-ABA','unload','purge','second-restore'].includes(mutation)) equal((await hydrationDeadline(waiting,'Public cancellation')).restored,false,'Old public wait settles while storage is held');
            release();await hydrationDeadline(waiting,'Retired candidate');
            if(second){await second;await hydrationDeadline(index.waitForSnapshotHydration(),'New restore');}
            return {full:index.fullSnapshotHydrated,diagnostic:index.getSnapshotHydrationDiagnostics(),windowRetired:index.snapshotForegroundWindow===null,publication,finalPublication:index.publicationRevision};
          }finally{release();index.indexedDb.open=open;hold.restore();f.close();}
        })()`);
        assert.equal(result.windowRetired,true,JSON.stringify(result));
        if(mutation!=='second-restore') {
          assert.equal(result.full,mutation==='watchdog-progress',JSON.stringify(result));
          assert.equal(result.diagnostic.attempts,2,'Further changes never trigger a third attempt');
        }else assert.ok(result.diagnostic.run>1,'A new restore owns independent diagnostics');
      });
    }

    for (const phase of ['pages','relations','evidence']) {
      await t.test(`${phase} transaction completion revalidates settings before decoding returned chunks`, async () => {
        assert.equal(await browser.evaluate(`(async()=>{
          const f=await hydrationWorkFixture('guards-transaction-${phase}',1024,128),index=f.index;
          const owner=index.indexedDb,open=owner.openTransaction;
          let enter,release,held=false;
          const entered=new Promise(resolve=>enter=resolve),gate=new Promise(resolve=>release=resolve);
          const native=Object.getOwnPropertyDescriptor(IDBTransaction.prototype,'oncomplete');
          owner.openTransaction=function(...args){
            const tx=open.apply(this,args);
            if(!held && index.getSnapshotHydrationDiagnostics().phase==='${phase}' && args[1]==='snapshotChunks'){
              held=true;
              // Retain the actual transaction/request results. Only completion delivery is paused,
              // so the production reader must validate its values after transactionDone awaits.
              Object.defineProperty(tx,'oncomplete',{configurable:true,get(){return native.get.call(this);},set(callback){
                native.set.call(this,function(event){enter();gate.then(()=>callback.call(tx,event));});
              }});
            }
            return tx;
          };
          try {
            const restore=index.restoreIndexedDbSnapshot(['Hub.md']);
            await hydrationDeadline(entered,'Transaction completion hold');
            const state=index.state,revision=index.publicationRevision,processed=index.getSnapshotHydrationDiagnostics()['${phase}'];
            f.settings.hierarchy.parents.push('Changed');release();await restore;
            equal((await index.waitForSnapshotHydration()).restored,false,'Returned transaction cannot adopt old policy');
            equal(index.getSnapshotHydrationDiagnostics()['${phase}'],processed,'No returned stale record decoded');
            equal(index.state===state,true,'No stale graph publication');equal(index.publicationRevision,revision,'Revision retained');
            return true;
          } finally {owner.openTransaction=open;release?.();f.close();}
        })()`), true);
      });
    }

    for (const phase of ['pages','relations','evidence','promote']) {
      await t.test(`${phase} progress reentry cannot publish the captured policy after an in-place edit`, async () => {
        assert.equal(await browser.evaluate(`(async()=>{
          const f=await hydrationWorkFixture('guards-progress-${phase}',1024,128),index=f.index;let changed=false,visible,revision,notificationPhase;
          // The phase owner receives the new phase before the index's passive diagnostic mirror.
          f.plugin.startupDiagnostics={phase:(_,phase)=>notificationPhase=phase,count(){},processed(){},mark(){},/** Preserve the passive work-counter contract during reentry. */recordWork(){}};
          f.plugin.notifyStartupProgress=()=>{
            const d=index.getSnapshotHydrationDiagnostics();
            if(!changed && notificationPhase==='${phase}' && ('${phase}'==='promote' || d['${phase}']>=256)){
              changed=true;visible=index.state;revision=index.publicationRevision;f.settings.hierarchy.parents.push('Changed');
            }
          };
          try {
            await index.restoreIndexedDbSnapshot(['Hub.md']);
            equal((await index.waitForSnapshotHydration()).restored,false,'Policy edit rejects promotion');
            ok(changed,'Actual progress callback exercised');equal(index.state===visible,true,'Retain published generation');
            equal(index.publicationRevision,revision,'No late promotion');equal(index.fullSnapshotHydrated,false,'Not complete');
            return true;
          } finally {f.plugin.notifyStartupProgress=undefined;f.close();}
        })()`), true);
      });
    }

    await t.test('legacy cursors retain full value validation on each host continuation', async () => {
      assert.equal(await browser.evaluate(String.raw`(async()=>{
        const f=await fixture('guards-legacy'),generation='legacy';let changed=false,calls=0,visits=0;
        try {
          const db=await f.cache.open();
          await edit(db,['pages'],tx=>{for(let n=0;n<3;n++)tx.objectStore('pages').put({generation,path:'P'+n,value:{path:'P'+n}});});
          const current=()=>{calls++;return !changed;};
          const okRead=await f.cache.iterateSnapshotPages({schema:2,generation},()=>{visits++;changed=true;},current,undefined,()=>true);
          equal(okRead,false,'Legacy full guard survives an independently cheap record capability');
          equal(visits,1,'Next cursor callback cannot use retired policy');ok(calls>=2,'Full value checks on host callbacks');
          return true;
        } finally {f.close();}
      })()`), true);
    });
  } finally { await browser.cleanup(); }
});
