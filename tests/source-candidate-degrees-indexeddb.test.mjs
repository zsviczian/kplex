/**
 * Real Chromium/IndexedDB finite candidate-degree reads: independent full GraphBuilder/GraphIndex,
 * durable reopen, exact root/head/journal terminal fences and source/body byte preservation. Native
 * host events are explicit doubles. No storage codec changed, no IDB shim or fallback is permitted.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { chromiumHarness } from "./support/browserTypeScript.mjs";
import { contributorBrowserBundle, contributorBrowserInitialize } from "./support/contributorBrowserFixture.mjs";
import { centerGateSettings } from "./support/requestedCenterGateFixture.mjs";
import { configureDegrees } from "./support/candidateDegreeFixture.mjs";
import { reframeTitleCatalog } from "./support/urlTitleFixture.mjs";

const bundle = await contributorBrowserBundle([
  "src/index/CachedRequestedCandidateDegrees.ts", "src/index/GraphBuilder.ts", "src/index/GraphIndex.ts",
]);
/** Transfer fixture operations, never an alternative relationship classifier/count/sort. */
const initialize = `(() => {
  const M=sourceModules;
  window.degreeSettings={hierarchy:{hidden:['Hidden'],parents:['Parent'],children:['Children'],leftFriends:['Friends'],rightFriends:['Opposes'],previous:['Previous'],next:['Next']},inferAllLinksAsFriends:false,inverseInfer:false,showFullTagName:true,tagStyleList:[],maxLabelLength:30};
  window.degreePolicy=()=>({revision:'degree-policy:1',settings:structuredClone(degreeSettings),isCurrent:()=>true});
  window.centerGateSettings=${centerGateSettings.toString()};
  window.configureDegrees=${configureDegrees.toString()};
  window.reframeTitleCatalog=${reframeTitleCatalog.toString()};
  window.degreeRequest=(...candidates)=>({kind:'candidate-degrees',candidates});
  window.degreeSeed=async name=>{const f=await fixture(name);configureDegrees(f);await f.acquire();f.discovery=await f.build();
    // Capture exact current structural entity facts during test setup. The private reader's
    // read port must include the root folder as well as files; a file-only port is incomplete.
    f.entities=new Map();ok(await f.discovery.host.collect(async fact=>{if(fact.kind==='entity')f.entities.set(fact.entity.id,fact);return true;}),'Current structural entity inventory');
    return f;};
  window.degreeFull=async(f,candidates,settings=degreeSettings,visibility=centerGateSettings(),withGates=false)=>{
    for(const file of f.app.vault.getMarkdownFiles())await f.cache.putBody(file.path,file.stat.mtime,M.parseBodyMetadata(f.texts.get(file.path)));
    const app={...f.app,vault:{...f.app.vault,getName:()=> 'degree-fresh-full'}},plugin={app,settings:{...settings,...visibility},getIndexSourceRevision:()=>f.acquisition.hostRevision};
    const index=new M.GraphIndex(plugin,app);
    try{const builder=new M.GraphBuilder(plugin,app,new Map(),index.metadataParser,f.cache,()=>true),state=await builder.build({acquireSources:false});ok(state,'Fresh full build completes');index.state=state;
      return candidates.map(candidate=>{const page=state.pages.get(candidate.semanticPath);ok(page,'Full candidate exists');const gates=withGates?index.gateStats(page):null;
        return {id:candidate.id,rawDegree:page.neighbours.size,...(gates?{gates:Object.fromEntries(['top','bottom','left','right'].map(side=>[side,{hasAny:gates[side].hasAny,visibleCount:gates[side].visibleCount}]))}:{})};});
    }finally{index.destroy();}
  };
  window.degreeReader=(f,d=f.discovery,repository=f.repository)=>new M.CachedRequestedCandidateDegreeReader(repository,d,
    (id,rt)=>f.acquisition.captureForReplay(id,{noteTypeField:'',primaryTagField:''},rt),{entity:ref=>f.entities.get(ref.id)});
  window.degreeSnapshot=async f=>{const db=await f.cache.open(),result={};for(const store of ['sourceHeads','sourceChunks','sourcePostings','bodies'])result[store]=await value(db.transaction(store).objectStore(store).getAll());return result;};
  window.degreeGuard=f=>{
    let forbidden=0;const counts=f.acquisition.getCounters(),fail=()=>{forbidden++;throw new Error('Forbidden degree acquisition/write/scan');};
    f.app.vault.read=f.app.vault.cachedRead=f.app.vault.getFiles=f.app.vault.getMarkdownFiles=f.app.vault.getRoot=fail;
    f.repository.replace=f.repository.tombstone=f.repository.headPage=f.repository.querySources=f.acquisition.acquire=f.acquisition.parse=f.discovery.rebuild=f.discovery.host.collect=fail;
    f.cache.putBody=f.cache.putBodies=f.cache.queueBodyWrite=f.cache.deleteBody=fail;
    return()=>{equal(forbidden,0,'No caught forbidden work');equal(f.reads,[],'No body reads');equal(f.parses,[],'No parser work');equal(f.acquisition.getCounters(),counts,'No acquisition');equal(f.repository.readers.size,0,'No reader leases');};
  };
  window.degreeRejected=(result,reason)=>{ok(result.outcome!=='ready','No ready prefix '+JSON.stringify(result));if(reason)equal(result.reason,reason,'Failure reason');for(const key of ['inputs','certificate','compilation','preparation'])ok(!(key in result),'No leaked '+key);};
  window.degreeLegacy=async f=>{
    const db=await f.cache.open(),original=await f.repository.readDependencyRoot(()=>true),pages=await value(db.transaction('sourceDependencies').objectStore('sourceDependencies').getAll());
    const changed=await reframeTitleCatalog(M,original,pages,rows=>rows.map(row=>{if(row.kind!=='source')return row;const {markdownOrdinal,...rest}=row;return rest;}),text=>f.repository.observationDigest(text),2);
    await edit(db,['meta','sourceDependencies'],tx=>{const store=tx.objectStore('sourceDependencies');for(const page of pages)if(page.slot===original.build.slot)store.delete([page.slot,page.bucket,page.index]);for(const page of changed.pages)store.put(page);tx.objectStore('meta').put(changed.root);});
  };
  return true;
})()`;

test("real IndexedDB finite raw-degree parity, read-only reopen and terminal fences", { timeout: 180000 }, async t => {
  const browser = await chromiumHarness(bundle);
  try {
    await browser.evaluate(contributorBrowserInitialize); await browser.evaluate(initialize);
    for (const version of [2, 3]) {
      await t.test(`v${version} fresh full parity, unchanged source/body records and same-host reopen`, async () => {
        assert.equal(await browser.evaluate(`(async()=>{
          const M=sourceModules,f=await degreeSeed('degree-v${version}');let reopened;
          try{
            if(${version}===2)await degreeLegacy(f);
            const candidates=[ref('Candidate.md'),ref('Peer.md'),ref('Outside.md'),ref('https://example.com','url'),ref('https://example.com/path','url')];
            const policies=[degreePolicy(),degreePolicy(),degreePolicy()];policies[1].settings.nodeImageProperty='Image';policies[2].settings.hierarchy.hidden.push('Dormant');policies[2].settings.inverseInfer=true;
            const expected=[];for(const p of policies)expected.push(await degreeFull(f,candidates,p.settings));
            const before=await degreeSnapshot(f),root=await f.repository.readDependencyRoot(()=>true),check=degreeGuard(f);
            for(let i=0;i<policies.length;i++){
              const result=await degreeReader(f).prepare(degreeRequest(...candidates),policies[i],runtime());equal(result.outcome,'ready','Bounded raw degrees '+JSON.stringify(result));
              equal(result.coverage,'complete-candidate-raw-degrees','Distinct proof');equal(result.inputs,expected[i],'Full GraphIndex parity');equal(result.work.familyVisits,result.work.sourceReplays*4,'One replay per owner');
              ok(!result.certificate.contributors.sourceIds.includes('Unrelated.md'),'No unrelated owner');
            }
            check();equal(await degreeSnapshot(f),before,'No source/head/body writes');equal(await f.repository.readDependencyRoot(()=>true),root,'No derivative rewrite');
            // Keep the same live host capability, but close and reopen actual durable storage.
            f.cache.close();reopened=new M.KplexIndexedDbCache('degree-v${version}');ok(await reopened.open(),'Actual reopen');
            const d=new M.SourceContributorDiscovery(reopened.sources,f.discovery.host,runtime()),reader=degreeReader(f,d,reopened.sources);
            const result=await reader.prepare(degreeRequest(...candidates),policies[0],runtime());equal(result.outcome,'ready','Reopen proof '+JSON.stringify(result));equal(result.inputs,expected[0],'Reopen count parity');
            const db=await reopened.open();for(const [store,rows]of Object.entries(before))equal(await value(db.transaction(store).objectStore(store).getAll()),rows,store+' unchanged after reopen');equal(db.version,10,'Supported v10 schema remains unchanged');equal(reopened.sources.readers.size,0,'No reopened leases');return true;
          }finally{reopened?.close();f.close();}
        })()`), true);
      });
    }

    await t.test("optional directional totals match full visibility without another replay or acquisition", async () => {
      assert.equal(await browser.evaluate(`(async()=>{
        const f=await degreeSeed('degree-directional-counts');try{
          const candidates=[ref('Candidate.md'),ref('Peer.md'),ref('Outside.md')];
          const visibility=[centerGateSettings(),centerGateSettings({showInferredNodes:false,showVirtualNodes:false}),centerGateSettings({excludeFilepaths:['Peer.md'],showFolderNodes:false,showTagNodes:false})];
          const expected=[];for(const settings of visibility)expected.push(await degreeFull(f,candidates,degreeSettings,settings,true));
          const check=degreeGuard(f),before=await degreeSnapshot(f);
          for(let n=0;n<visibility.length;n++){
            const gatePolicy={revision:'gates:'+n,settings:visibility[n],isCurrent:()=>true};
            const result=await degreeReader(f).prepare(degreeRequest(...candidates),degreePolicy(),runtime(),gatePolicy);
            equal(result.outcome,'ready','Directional count proof');equal(result.inputs,expected[n],'Full gate/degree parity');
            equal(result.certificate.gatePolicyRevision,gatePolicy.revision,'Separate captured visibility proof');
            equal(result.work.familyVisits,result.work.sourceReplays*4,'No second semantic replay for counts');
          }
          check();equal(await degreeSnapshot(f),before,'Gate counting writes no source/body records');return true;
        }finally{f.close();}
      })()`),true);
    });
    await t.test("final awaited visibility-token mutation discards directional counts and degree prefix", async () => {
      assert.equal(await browser.evaluate(`(async()=>{
        const f=await degreeSeed('degree-gate-finality');try{
          const d=f.discovery,gatePolicy={revision:'gates:1',settings:centerGateSettings(),isCurrent:()=>true};let mutated=false;
          const wrapped={discover:scope=>d.discover(scope),isHostCurrent:()=>d.isHostCurrent(),revalidate:async certificate=>{const result=await d.revalidate(certificate);gatePolicy.revision='gates:2';mutated=true;return result;}};
          degreeRejected(await degreeReader(f,wrapped).prepare(degreeRequest(ref('Candidate.md')),degreePolicy(),runtime(),gatePolicy),'superseded');
          ok(mutated,'Actual final awaited fence changed');equal(f.repository.readers.size,0,'No reader leases');return true;
        }finally{f.close();}
      })()`),true);
    });

    for (const fault of ["missing-page", "page-checksum", "source-chunk"]) {
      await t.test(`${fault} is not a degree or an authenticated negative`, async () => {
        assert.equal(await browser.evaluate(`(async()=>{
          const M=sourceModules,f=await degreeSeed('degree-fault-${fault}');try{
            const db=await f.cache.open(),fault=${JSON.stringify(fault)};
            if(fault==='source-chunk'){
              const chunks=await value(db.transaction('sourceChunks').objectStore('sourceChunks').getAll()),chunk=chunks.find(row=>row.sourceId==='Candidate.md');ok(chunk,'Real selected chunk');
              await edit(db,['sourceChunks'],tx=>tx.objectStore('sourceChunks').delete([chunk.sourceId,chunk.revision,chunk.family,chunk.index]));
            }else{
              const root=await f.repository.readDependencyRoot(()=>true),bucket=M.sourceDependencyBucket(M.contributorKey('node','Candidate.md')),page=await f.repository.readDependencyPage(root.build,bucket,0,()=>true);
              await edit(db,['sourceDependencies'],tx=>{const store=tx.objectStore('sourceDependencies');if(fault==='missing-page')store.delete([page.slot,page.bucket,page.index]);else store.put({...page,data:page.data+' '});});
              let i=0;while(M.sourceDependencyBucket(M.contributorKey('node','Missing-'+i))!==bucket)i++;
              degreeRejected(await degreeReader(f).prepare(degreeRequest(ref('Missing-'+i)),degreePolicy(),runtime()),'dependency-invalid');
            }
            const before=await degreeSnapshot(f),check=degreeGuard(f);
            degreeRejected(await degreeReader(f).prepare(degreeRequest(ref('Candidate.md')),degreePolicy(),runtime()));check();equal(await degreeSnapshot(f),before,'No repair/source rewrite after read failure');return true;
          }finally{f.close();}
        })()`), true);
      });
    }

    for (const fence of ["source-journal", "known-unrelated-journal", "host-journal", "head", "root", "policy", "demand", "host"]) {
      await t.test(`final awaited ${fence} prevents every candidate count`, async () => {
        assert.equal(await browser.evaluate(`(async()=>{
          const M=sourceModules,f=await degreeSeed('degree-final-${fence}');try{
            const d=f.discovery,p=degreePolicy(),fence=${JSON.stringify(fence)};let current=true,mutated=false;
            const wrapped={discover:scope=>d.discover(scope),isHostCurrent:()=>d.isHostCurrent(),revalidate:async certificate=>{
              if(fence==='source-journal'||fence==='known-unrelated-journal'){
                equal((await f.repository.tombstone('Unrelated.md')).outcome,'activated','Unrelated source ticket');
                if(fence==='known-unrelated-journal'){f.files.delete('Unrelated.md');equal((await d.prepareOwnerImpact('Unrelated.md',null,()=>true)).outcome,'known','Known impact remains open');}
              }
              if(fence==='host-journal')await f.repository.markContributorHostDirty({epoch:d.host.stamp.epoch,from:d.host.stamp.revision,to:d.host.stamp.revision+1,kind:'environment'});
              if(fence==='head'){const db=await f.cache.open(),head=await value(db.transaction('sourceHeads').objectStore('sourceHeads').get('Candidate.md'));await edit(db,['sourceHeads'],tx=>tx.objectStore('sourceHeads').put({...head,sequence:head.sequence+100}));}
              if(fence==='root')equal((await d.rebuild()).outcome,'ready','New valid root replaces selected root');
              const result=await d.revalidate(certificate);
              if(fence==='policy')p.revision='degree:changed';if(fence==='demand')current=false;if(fence==='host')f.app.vault.trigger('modify',f.files.get('Unrelated.md'));
              mutated=true;return result;
            }};
            degreeRejected(await degreeReader(f,wrapped).prepare(degreeRequest(ref('Candidate.md'),ref('Peer.md')),p,{...runtime(),isCurrent:()=>current}));ok(mutated,'Final awaited mutation ran');equal(f.repository.readers.size,0,'No leaked selected readers');return true;
          }finally{f.close();}
        })()`), true);
      });
    }
  } finally { await browser.cleanup(); }
});
