/**
 * Independent saved-preview/URL replay through real Chromium IndexedDB and production graph/source
 * owners. Holds begin outside completed transactions, never advance a virtual timeout, and have
 * independent failure cleanup. Preview readability remains separate from current write authority.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { chromiumHarness } from './support/browserTypeScript.mjs';
import { hydrationWorkBundle,contributorBrowserInitialize } from './support/hydrationWorkFixture.mjs';
import { initializeSavedPreviewUrl } from './support/savedPreviewUrlFixture.mjs';

const bundle=await hydrationWorkBundle();

test('saved preview does not join shared URL cache replay',async t=>{
  const browser=await chromiumHarness(bundle);
  try{
    assert(await browser.evaluate(contributorBrowserInitialize));assert(await browser.evaluate(initializeSavedPreviewUrl));
    await t.test('an early foreground interruption yields retry to held URL replay while preview and visible work remain usable',/** Exercise a genuine shared URL task and both fresh-attempt publication fences. */ async()=>{
      assert(await browser.evaluate(`(/** Hold real completed storage work without changing scheduler admission. */ async()=>{
        const q=await savedPreviewUrlFixture('preview-fresh-attempt-url','eager','page',true),i=q.index,open=i.indexedDb.open;
        let enter,release,held=false;
        const entered=new Promise(/** Report first full-page read. */ resolve=>enter=resolve),gate=new Promise(/** Retain independent graph-reader cleanup. */ resolve=>release=resolve);
        i.indexedDb.open=/** Preserve the actual connection while pausing only this first graph candidate. */ async function(...args){const db=await open.apply(this,args);if(!held&&i.getSnapshotHydrationDiagnostics().phase==='pages'){held=true;enter();await gate;}return db;};
        try{
          const discovery=i.startBackgroundUrlIndex();await savedPreviewDeadline(q.entered,'Real URL reader');const shared=i.restoreUrlIndex();
          const restore=i.restorePersistedSnapshot(['Hub.md']);await savedPreviewDeadline(entered,'First graph candidate');q.releaseSources();
          equal((await savedPreviewDeadline(i.patchMarkdownPaths(['Hub.md'],{useDurableCache:true}),'First current file')).outcome,'patched','Ordinary file publication');
          release();ok((await savedPreviewDeadline(restore,'Independent saved preview')).restored,'Saved preview remains available');
          await new Promise(/** Allow the rejected candidate to reach its existing P4 checkpoint. */ resolve=>setTimeout(resolve,30));
          equal(i.getSnapshotHydrationDiagnostics().attempts,1,'Fresh attempt yields to the live URL owner');
          equal((await savedPreviewDeadline(i.withForegroundPriority(/** Run actual source work at its existing visible-change priority. */ ()=>i.patchMarkdownPaths(['Hub.md'],{useDurableCache:true,forceRecompile:true}),2),'Foreground during P4 retry')).outcome,'patched','Visible source work never joins URL/retry work');
          equal(i.restoreUrlIndex(),shared,'Shared URL task is not replaced by graph retry');
          q.release();ok(await savedPreviewDeadline(discovery,'URL convergence'),'Healthy URL owner completes');
          ok((await savedPreviewDeadline(i.waitForSnapshotHydration(),'Fresh graph attempt',8000)).restored,'Fresh graph candidate completes');
          equal(i.fullSnapshotHydrated,true,'Saved complete graph retained');equal(i.getSnapshotHydrationDiagnostics().attempts,2,'Only one fresh candidate');
          equal(i.get(q.target).aliases,['Saved body URL'],'URL vocabulary survives');
          equal(q.f.reads.length,0,'No duplicate body acquisition');equal(q.f.parses.length,0,'No duplicate parse');return true;
        }finally{release();i.indexedDb.open=open;q.close();}
      })()`));
    });
    for(const mode of ['eager','on-demand'])for(const phase of ['page','publication','compiler']){
      await t.test(`${mode}: valid preview precedes held URL ${phase}, then converges`,async()=>{
        assert(await browser.evaluate(`(async()=>{
          const q=await savedPreviewUrlFixture('preview-independent-${mode}-${phase}','${mode}','${phase}'),i=q.index;
          try{
            const discovery=i.startBackgroundUrlIndex();await savedPreviewDeadline(q.entered,'URL hold');const shared=i.restoreUrlIndex();
            await i.primePhysicalSearchCatalog();ok(i.search('Hub',10,'vault-files').some(page=>page.path==='Hub.md'),'Physical search remains usable');
            const result=await savedPreviewDeadline(i.restorePersistedSnapshot(['Hub.md']),'Saved graph preview');
            ok(result.restored&&result.partial,'Bounded saved preview');ok(i.state.pages.get('Hub.md').neighbours.has(q.target),'Saved body-only edge');
            equal(i.getUrlIndexProgress().complete,false,'Preview cannot certify URL inventory');equal(i.sourceAcquisition.hasSemanticDependencies(),false,'Unrelated source gate remains held');
            equal(i.isSemanticWriteReady('Hub.md',q.target),false,'Saved readability cannot grant write authority');equal(i.restoreUrlIndex(),shared,'One shared URL task');
            q.release();ok(await savedPreviewDeadline(discovery,'URL completion'),'URL discovery converges');
            if('${mode}'==='eager')ok((await savedPreviewDeadline(i.waitForSnapshotHydration(),'Full hydration',8000)).restored,'Optional full hydration');
            equal(i.get(q.target).aliases,['Saved body URL'],'Final exact vocabulary');ok(i.getNeighborhood(q.target).parents.some(item=>item.page.path==='Hub.md'),'Final positive incidence');
            equal(q.f.reads.length,0,'Warm cross-lane body reads');equal(q.f.parses.length,0,'Warm cross-lane parses');return true;
          }finally{q.close();}
        })()`));
      });
    }
    for(const mode of ['eager','on-demand']){
      for(const damage of ['missing','corrupt']){
        await t.test(`${mode}: ${damage} snapshot never borrows URL progress as saved/source authority`,async()=>{
          assert(await browser.evaluate(`(async()=>{
            const q=await savedPreviewUrlFixture('preview-damage-${mode}-${damage}','${mode}'),i=q.index;
            try{
              const db=await q.f.cache.open();await edit(db,['meta'],tx=>{const store=tx.objectStore('meta');store.delete('checkpoint');if('${damage}'==='missing')store.delete('active');else store.put({key:'active',schema:-1,generation:'invalid'});});
              const discovery=i.startBackgroundUrlIndex();await savedPreviewDeadline(q.entered,'URL hold');
              let settled=false;const task=i.restorePersistedSnapshot(['Hub.md']).then(result=>{settled=true;return result;});
              await new Promise(resolve=>setTimeout(resolve,30));
              if('${mode}'==='on-demand'){equal(settled,true,'Finite failed preview settles independently');equal((await task).restored,false,'No invented saved graph');}
              equal(i.fullSnapshotHydrated,false,'No complete graph certification');equal(i.isSemanticWriteReady('Hub.md',q.target),false,'No borrowed write authority');
              equal(i.getUrlIndexProgress().complete,false,'URL gate remains unresolved');i.destroy();equal((await savedPreviewDeadline(task,'Failed/retired graph request')).restored,false,'No invalid snapshot accepted');
              equal(await discovery,false,'Retired inventory');q.release();return true;
            }finally{q.close();}
          })()`));
        });
      }
      await t.test(`${mode}: replacement strategy starts independently while old URL/catalog callbacks remain held`,async()=>{
        assert(await browser.evaluate(`(async()=>{
          const q=await savedPreviewUrlFixture('preview-transfer-${mode}','${mode}'),old=q.index,catalog=old.indexedDb.readSnapshotCatalog,open=old.indexedDb.open;let next,release,entered,lateOpens=0,retired=false;
          const gate=new Promise(resolve=>release=resolve),entry=new Promise(resolve=>entered=resolve);
          old.indexedDb.open=function(...args){if(retired)lateOpens++;return open.apply(this,args);};
          try{
            const discovery=old.startBackgroundUrlIndex();await savedPreviewDeadline(q.entered,'Old URL page');
            old.indexedDb.readSnapshotCatalog=async function(...args){const value=await catalog.apply(this,args);entered();await gate;return value;};
            const previous=old.restorePersistedSnapshot(['Hub.md']);await savedPreviewDeadline(entry,'Old catalog');old.destroy();retired=true;
            equal((await previous).restored,false,'Old strategy public wait retired');equal(await discovery,false,'Old strategy URL owner retired');
            q.settings.indexingMode='${mode}'==='eager'?'on-demand':'eager';next=new sourceModules.GraphIndex(q.plugin,q.f.app);next.scheduleOrphanCleanup=()=>{};
            equal(next.isOnDemandMode(),q.settings.indexingMode==='on-demand','Actual replacement strategy');
            ok((await savedPreviewDeadline(next.restorePersistedSnapshot(['Hub.md']),'Replacement saved preview')).restored,'Replacement preview');await savedPreviewDeadline(next.restoreUrlIndex(),'Replacement URL replay');
            release();q.release();await new Promise(resolve=>setTimeout(resolve,30));
            equal(old.state.pages.size,0,'Old state remains released');equal(lateOpens,0,'Old strategy cannot reopen storage');
            equal(next.get(q.target).aliases,['Saved body URL'],'Replacement retains current URL vocabulary');return true;
          }finally{release();old.indexedDb.readSnapshotCatalog=catalog;old.indexedDb.open=open;next?.destroy();q.close();}
        })()`));
      });
      await t.test(`${mode}: aborted real URL cache transaction does not fail saved preview`,async()=>{
        assert(await browser.evaluate(`(async()=>{
          const q=await savedPreviewUrlFixture('preview-url-failure-${mode}','${mode}'),i=q.index,transaction=i.indexedDb.openTransaction;let aborted=0;
          try{
            i.indexedDb.openTransaction=function(db,stores,mode){const tx=transaction.call(this,db,stores,mode);if(mode==='readonly'&&[stores].flat().includes('urlOwners')){aborted++;tx.abort();}return tx;};
            const preview=await savedPreviewDeadline(i.restorePersistedSnapshot(['Hub.md']),'Saved preview after actual URL transaction abort');
            ok(preview.restored,'Independent graph preview');equal(await i.restoreUrlIndex(),false,'URL cache failure retained');equal(i.urlCacheAvailable,false,'URL availability remains separate');equal(aborted,1,'Actual URL transaction aborted');
            equal(i.isSemanticWriteReady('Hub.md',q.target),false,'Cache failure cannot bypass source authority');return true;
          }finally{i.indexedDb.openTransaction=transaction;q.close();}
        })()`));
      });
      for(const mutation of ['same-stat','rename','delete']){
        await t.test(`${mode}: ${mutation} during held cache replay cannot resurrect old URL incidence`,async()=>{
          assert(await browser.evaluate(`(async()=>{
            const q=await savedPreviewUrlFixture('preview-event-${mode}-${mutation}','${mode}'),i=q.index,f=q.f,path=q.file.path,next='https://changed.example/current';let revision=0;
            q.plugin.getIndexSourceRevision=()=>revision;
            try{
              const discovery=i.startBackgroundUrlIndex();await savedPreviewDeadline(q.entered,'URL page');
              ok((await savedPreviewDeadline(i.restorePersistedSnapshot([path]),'Saved preview')).restored,'Saved preview');
              revision++;
              if('${mutation}'==='delete'){
                f.files.delete(path);i.updateHostFileAvailability(path);await savedPreviewDeadline(i.refreshUrlOwner(path),'Deleted owner');
              }else{
                const text='[Current label]('+next+')',body=sourceModules.parseBodyMetadata(text);let currentPath=path;
                if('${mutation}'==='rename'){
                  currentPath='Renamed.md';f.files.delete(path);q.file.path=currentPath;q.file.name=currentPath;q.file.basename='Renamed';f.files.set(currentPath,q.file);
                  const metadata=f.metadata.get(path);f.metadata.delete(path);f.metadata.set(currentPath,metadata);
                  i.updateHostFileAvailability(path,q.file);await savedPreviewDeadline(i.refreshUrlOwner(path),'Retired old coordinates');
                }
                f.texts.set(currentPath,text);
                await savedPreviewDeadline(i.refreshUrlOwner(currentPath,true,undefined,{file:q.file,revision:{path:currentPath,mtime:q.file.stat.mtime,size:q.file.stat.size},body,frontmatter:{}}),'Current URL publication');
                ok(i.get(next)?.neighbours.has(currentPath),'Current positive incidence before stale cache release');
              }
              q.release();ok(await savedPreviewDeadline(discovery,'URL convergence'),'URL inventory');
              if('${mode}'==='eager')await savedPreviewDeadline(i.waitForSnapshotHydration(),'Late graph hydration',8000);
              const old=i.getNeighborhood(q.target);ok(!old||!['parents','children','leftFriends','rightFriends','siblings'].some(role=>old[role].some(item=>item.page.path===path)),'Stale cached incidence cannot return through the composed reader');
              equal(i.urlRestoredOwners,0,'Retired cache record is never certified');
              if('${mutation}'==='delete')equal(i.urlOwners.size,0,'Deleted owner absent');else {
                const currentPath='${mutation}'==='rename'?'Renamed.md':path;
                ok(i.get(next)?.neighbours.has(currentPath),'Current incidence survives late cache');ok(i.getNeighborhood(next).parents.some(item=>item.page.path===currentPath),'Composed current incidence after optional promotion');
                ok(i.search('Current label',10).some(page=>page.path===next),'Late full search cannot erase new URL vocabulary');
              }
              return true;
            }finally{q.close();}
          })()`));
        });
      }
      await t.test(`${mode}: rapid preview supersession keeps shared URL replay and rejects late graph work`,async()=>{
        assert(await browser.evaluate(`(async()=>{
          const q=await savedPreviewUrlFixture('preview-superseded-${mode}','${mode}'),i=q.index;let release;
          const pages=i.indexedDb.getPages,gate=new Promise(resolve=>release=resolve);let entered,held=false;const entry=new Promise(resolve=>entered=resolve);
          try{
            const discovery=i.startBackgroundUrlIndex();await savedPreviewDeadline(q.entered,'URL hold');const shared=i.restoreUrlIndex();
            i.indexedDb.getPages=async function(...args){const value=await pages.apply(this,args);if(!held){held=true;entered();await gate;}return value;};
            const old=i.restorePersistedSnapshot(['Hub.md']);await savedPreviewDeadline(entry,'Old preview pages');
            const latest=i.restorePersistedSnapshot([q.target]);equal((await savedPreviewDeadline(old,'Superseded public wait')).restored,false,'Old public wait retired');
            ok((await savedPreviewDeadline(latest,'Newest URL-center preview')).restored,'Newest cached URL center');equal(i.restoreUrlIndex(),shared,'URL owner remains shared');
            const state=i.state,revision=i.publicationRevision;release();await new Promise(resolve=>setTimeout(resolve,20));
            equal(i.state===state,true,'Late preview cannot replace current state');equal(i.publicationRevision,revision,'Late preview cannot publish');
            q.release();ok(await savedPreviewDeadline(discovery,'URL continuation'),'Healthy shared URL work continues');return true;
          }finally{release();i.indexedDb.getPages=pages;q.close();}
        })()`));
      });
      for(const retirement of ['destroy','purge'])for(const phase of ['catalog','preview']){
        await t.test(`${mode}: ${retirement} retires held URL and ${phase} without late reopen`,async()=>{
          assert(await browser.evaluate(`(async()=>{
            const q=await savedPreviewUrlFixture('preview-retire-${mode}-${retirement}-${phase}','${mode}'),i=q.index;let release,entered,held=false,retired=false,lateOpens=0;const stacks=[];
            const gate=new Promise(resolve=>release=resolve),entry=new Promise(resolve=>entered=resolve),key='${phase}'==='catalog'?'readSnapshotCatalog':'getPages',original=i.indexedDb[key],open=i.indexedDb.open;
            i.indexedDb.open=function(...args){if(retired){lateOpens++;stacks.push(Error().stack);}return open.apply(this,args);};
            try{
              const discovery=i.startBackgroundUrlIndex();await savedPreviewDeadline(q.entered,'URL hold');const shared=i.restoreUrlIndex();
              i.indexedDb[key]=async function(...args){const value=await original.apply(this,args);if(!held){held=true;entered();await gate;}return value;};
              const restore=i.restorePersistedSnapshot(['Hub.md']);await savedPreviewDeadline(entry,'Graph hold');
              if('${retirement}'==='destroy')i.destroy();else ok(await i.purgePersistentIndexCache(),'Purge completes');retired=true;
              equal((await savedPreviewDeadline(restore,'Retired public wait')).restored,false,'Retired graph wait');equal(await shared,false,'Retired shared URL');equal(await discovery,false,'Retired discovery');
              const state=i.state,revision=i.publicationRevision,diagnostics=JSON.stringify(i.getSnapshotHydrationDiagnostics());
              release();q.release();await new Promise(resolve=>setTimeout(resolve,30));
              equal(i.state===state,true,'No late state');equal(i.publicationRevision,revision,'No late publication');equal(JSON.stringify(i.getSnapshotHydrationDiagnostics()),diagnostics,'No late terminal rewrite');
              equal(lateOpens,0,'No late storage reopen '+stacks.join(' | '));equal(i.getWorkPriorityDiagnostics().active,[0,0,0,0,0],'No retained leases');return true;
            }finally{release();i.indexedDb[key]=original;i.indexedDb.open=open;q.close();}
          })()`));
        });
      }
    }
  }finally{await browser.cleanup();}
});
