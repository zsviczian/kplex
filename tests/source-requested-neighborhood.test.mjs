/** Real IndexedDB neighborhood finality and the independent all-owner canonical semantic oracle. */
import assert from "node:assert/strict";
import test from "node:test";
import { chromiumHarness } from "./support/browserTypeScript.mjs";
import { contributorBrowserBundle, contributorBrowserInitialize } from "./support/contributorBrowserFixture.mjs";
import { configureNeighborhood, fullNeighborhoodOracle, neighborhoodView } from "./support/requestedNeighborhoodFixture.mjs";

const bundle = await contributorBrowserBundle([
  "src/index/CachedRequestedNeighborhood.ts", "src/index/CachedSourceSemantics.ts", "src/core/graph/compiler.ts", "src/core/graph/resolver.ts",
  "src/core/graph/evidence.ts", "src/adapters/obsidian/hostLinkSourceCollector.ts",
  "src/adapters/obsidian/ontologySourceCollector.ts", "src/adapters/obsidian/metadataSourceCollector.ts",
]);

/** Shared oracle functions are serialized, not replaced by browser-specific semantic approximations. */
const initialize = `(() => {
  const M=sourceModules;
  window.configureNeighborhood=${configureNeighborhood.toString()};
  window.fullNeighborhoodOracle=${fullNeighborhoodOracle.toString()};
  window.neighborhoodView=${neighborhoodView.toString()};
  window.nSettings={hierarchy:{hidden:['Hidden'],parents:['Parent'],children:['Children'],leftFriends:['Friends'],
    rightFriends:['Opposes'],previous:['Previous'],next:['Next']},inferAllLinksAsFriends:false,inverseInfer:false,
    showFullTagName:true,tagStyleList:['#project','#person'],maxLabelLength:30};
  window.nAssigned=()=>({...nSettings,hierarchy:{...nSettings.hierarchy,parents:['Parent','Dormant','DormantInline']}});
  window.nPolicy=settings=>({revision:'policy:1',settings:structuredClone(settings??nSettings),isCurrent:()=>true});
  window.nPresentation={noteTypeField:'Type',primaryTagField:'Style'};
  window.nRequest=()=>({kind:'neighborhood',center:ref('A.md')});
  window.nEmpty=()=>({kind:'neighborhood',center:{id:'missing:A',kind:'unresolved',state:'unresolved',semanticPath:'missing:A'}});
  window.nSeed=async(name,imageOnly=false,configure=configureNeighborhood)=>{
    const f=await fixture(name);configure(f,imageOnly);await f.acquire();f.discovery=await f.build();
    await fullNeighborhoodOracle(M,f,nSettings,runtime());
    const close=f.close;f.close=()=>{f.restoreGuard?.();close();};return f;
  };
  window.nReader=(f,discovery=f.discovery,capture)=>new M.CachedRequestedNeighborhoodReader(f.repository,discovery,
    capture??((id,rt)=>f.acquisition.captureForReplay(id,nPresentation,rt)),{entity:ref=>f.entities.get(ref.id)});
  window.nSnapshot=async f=>{
    const db=await f.cache.open(),data={};
    for(const store of ['sourceHeads','sourceChunks','sourcePostings','sourceDependencies','sourceImpacts','bodies'])
      data[store]=await value(db.transaction(store).objectStore(store).getAll());
    data.root=await value(db.transaction('meta').objectStore('meta').get(M.SOURCE_DEPENDENCY_ROOT_KEY));return data;
  };
  window.nGuard=f=>{
    const counters=f.acquisition.getCounters();let forbidden=0,headWrites=0;
    const fail=()=>{forbidden++;throw new Error('Forbidden acquisition or full source work');};
    f.app.vault.read=f.app.vault.cachedRead=f.app.vault.getRoot=f.app.vault.getFiles=f.app.vault.getMarkdownFiles=fail;
    f.acquisition.acquire=f.acquisition.parse=f.repository.replace=f.discovery.rebuild=f.discovery.host.collect=fail;
    const original=new Map();
    for(const method of ['put','add','delete','clear']){
      const implementation=IDBObjectStore.prototype[method];original.set(method,implementation);
      IDBObjectStore.prototype[method]=function(...args){if(this.name==='sourceHeads')headWrites++;return implementation.apply(this,args);};
    }
    f.restoreGuard=()=>{for(const [method,implementation] of original)IDBObjectStore.prototype[method]=implementation;};
    return ()=>{equal(forbidden,0,'No forbidden source work');equal(headWrites,0,'Zero actual IDB source-head write attempts');
      equal(f.acquisition.getCounters(),counters,'Acquisition counters unchanged');equal(f.reads,[],'Zero Markdown reads');equal(f.parses,[],'Zero parser calls');
      equal(f.repository.readers.size,0,'Source leases released');};
  };
  window.nFailed=(result,reason)=>{ok(result.outcome!=='ready','No partial ready scope: '+JSON.stringify(result));
    if(reason)equal(result.reason,reason,'Failure reason');ok(!('preparation'in result)&&!('certificate'in result),'No escaped partial certificate/graph');};
  window.nCompare=(result,full,request,settings)=>{
    equal(result.outcome,'ready',JSON.stringify(result));equal(result.coverage,'complete-neighborhood-relations','Private relation scope only');
    equal(result.certificate.gateTotals,'not-certified','No invented gate totals');
    const expected=neighborhoodView(M,full,request.center,settings);
    equal(result.certificate.parents.map(parent=>parent.id),expected.parents,'Entire semantic parent frontier');
    equal(result.preparation.sources,result.certificate.contributors.sources,'Exact durable selections');
    equal(neighborhoodView(M,result.preparation.compilation,request.center,settings),expected,'Full/cached directed relations and sibling witnesses');
    equal(result.work.familyVisits,4*result.work.sourceReplays,'Both passes report real replay work');
  };
  return true;
})()`;

test("real Chromium private requested-neighborhood closure and every terminal fence", { timeout: 240000 }, async t => {
  const browser = await chromiumHarness(bundle);
  try {
    await browser.evaluate(contributorBrowserInitialize);
    await browser.evaluate(initialize);

    await t.test("same-final-policy dormant field movement, duplicates, hidden conflicts and inference combinations", async () => {
      assert.equal(await browser.evaluate(`(async()=>{
        const M=sourceModules,f=await nSeed('neighborhood-policy');
        try{
          const variants=[nSettings,nAssigned(),
            {...nSettings,hierarchy:{...nSettings.hierarchy,children:['Dormant','DormantInline'],rightFriends:['Opposes','Dormant']}},
            {...nAssigned(),hierarchy:{...nAssigned().hierarchy,hidden:['Hidden','Dormant'],parents:['Parent','Dormant','Dormant']}},
            {...nSettings,inferAllLinksAsFriends:true},{...nSettings,inverseInfer:true},
            {...nSettings,inferAllLinksAsFriends:true,inverseInfer:true},nSettings];
          const full=[];for(const settings of variants)full.push(await fullNeighborhoodOracle(M,f,settings,runtime()));
          const before=await nSnapshot(f),check=nGuard(f);
          for(const [index,settings] of variants.entries()){
            const captures=[],reader=nReader(f,f.discovery,(id,rt)=>{captures.push(id);return f.acquisition.captureForReplay(id,nPresentation,rt);});
            const policy=nPolicy(settings);policy.revision='policy:'+index;
            const result=await reader.prepare(nRequest(),policy,runtime());nCompare(result,full[index],nRequest(),settings);
            equal(result.work.passes,2,'Two bounded passes');equal(new Set(captures).size,captures.length,'Each owner captured once');
            ok(!captures.includes('D.md')&&!captures.includes('E.md'),'No all-owner source scan');
            if(index===1){
              equal(result.preparation.sources.map(stamp=>stamp.head.sourceId),['A.md','B.md','P.md','S.md','T.md','C.md'],'Global contributor order');
              ok(neighborhoodView(M,full[index],nRequest().center,settings).siblings.some(sibling=>sibling.id==='T.md'&&sibling.witnesses.some(w=>w.parent==='P.md')),'Incoming parent child witness');
            }
          }
          check();equal(await nSnapshot(f),before,'No source/fact/root writes');return true;
        }finally{f.close();}
      })()`), true);
    });

    await t.test("both image selectors preserve exact suppression and incoming explicit evidence", async () => {
      assert.equal(await browser.evaluate(`(async()=>{
        const M=sourceModules,f=await nSeed('neighborhood-image',true);
        try{
          const variants=[nSettings,{...nSettings,nodeImageProperty:'Image'},{...nSettings,thumbnailProperty:'Image'},
            {...nSettings,nodeImageProperty:'Image',thumbnailProperty:'Image'},{...nSettings,nodeImageProperty:'Other'}];
          const full=[];for(const settings of variants)full.push(await fullNeighborhoodOracle(M,f,settings,runtime()));
          ok(JSON.stringify(neighborhoodView(M,full[0],nRequest().center,variants[0]))!==JSON.stringify(neighborhoodView(M,full[1],nRequest().center,variants[1])),'Image policy changes relations');
          const before=await nSnapshot(f),check=nGuard(f);
          for(const [index,settings] of variants.entries())nCompare(await nReader(f).prepare(nRequest(),nPolicy(settings),runtime()),full[index],nRequest(),settings);
          check();equal(await nSnapshot(f),before,'No source rewrites for image policy');return true;
        }finally{f.close();}
      })()`), true);
    });

    await t.test("third-party tag/URL support, derived tag ancestor identities and host-only structure match full", async () => {
      assert.equal(await browser.evaluate(`(async()=>{
        const M=sourceModules,f=await nSeed('neighborhood-third-party');
        try{
          const settings=nAssigned(),full=await fullNeighborhoodOracle(M,f,settings,runtime());
          const tags=[...full.nodes.values()].filter(node=>node.kind==='tag');equal(tags.length,2,'Leaf and derived ancestor tested');
          const url=[...full.declarations()].find(item=>item.sourceKind==='url-origin');ok(url,'URL-origin witness');
          const scopes=[...tags.map(node=>node.id),url.sourceId,url.targetId,'folder:/','image.png'].map(id=>({kind:'neighborhood',center:full.node(id)}));
          const before=await nSnapshot(f),check=nGuard(f);
          for(const scope of scopes){const result=await nReader(f).prepare(scope,nPolicy(settings),runtime());nCompare(result,full,scope,settings);
            if(scope.center.kind==='url')equal(result.preparation.sources.map(stamp=>stamp.head.sourceId),['C.md','E.md'],'Independent third-party origin support');}
          check();equal(await nSnapshot(f),before,'Read-only structural closure');return true;
        }finally{f.close();}
      })()`), true);
    });

    await t.test("authenticated empty neighborhood has one empty terminal compile, not an unqualified missing scope", async () => {
      assert.equal(await browser.evaluate(`(async()=>{
        const M=sourceModules,f=await nSeed('neighborhood-empty');
        try{
          const full=await fullNeighborhoodOracle(M,f,nSettings,runtime()),before=await nSnapshot(f),check=nGuard(f);
          const result=await nReader(f).prepare(nEmpty(),nPolicy(),runtime());nCompare(result,full,nEmpty(),nSettings);
          equal(result.work,{passes:1,sourceReplays:0,familyVisits:0},'No invented owner');equal(result.certificate.contributors.hostFacts,[],'Authenticated empty structure');
          const missing=await new M.CachedSourceSemanticReader(f.repository).prepare([],nPolicy(),{entity:()=>undefined},runtime());
          equal(missing.reason,'missing','SI4a alone does not authenticate emptiness');
          check();equal(await nSnapshot(f),before,'Read-only negative');return true;
        }finally{f.close();}
      })()`), true);
    });

    await t.test("parent range certifies no other child, rather than deriving empty siblings from the center alone", async () => {
      assert.equal(await browser.evaluate(`(async()=>{
        const M=sourceModules,f=await nSeed('neighborhood-no-other-child',false,f=>{f.add('P.md','',{Children:'[[Ghost]]'});f.add('D.md','');});
        try{
          const full=await fullNeighborhoodOracle(M,f,nSettings,runtime()),ghost=[...full.nodes.values()].find(node=>node.kind==='unresolved');ok(ghost,'Ghost center');
          const scope={kind:'neighborhood',center:ghost},check=nGuard(f);
          const result=await nReader(f).prepare(scope,nPolicy(),runtime());nCompare(result,full,scope,nSettings);
          equal(result.work.passes,2,'Parent range still authenticated');equal(result.certificate.parents.map(ref=>ref.id),['P.md'],'Exact sole parent');
          equal(neighborhoodView(M,result.preparation.compilation,ghost,nSettings).siblings,[],'No other child');check();return true;
        }finally{f.close();}
      })()`), true);
    });

    await t.test("dormant target absent from the old direct graph becomes a parent without source work", async () => {
      assert.equal(await browser.evaluate(`(async()=>{
        const M=sourceModules,f=await nSeed('neighborhood-dormant-negative',false,f=>{f.add('A.md','',{DormantNew:'[[Z]]'});f.add('Z.md','');f.add('D.md','');});
        try{
          const settings={...nSettings,hierarchy:{...nSettings.hierarchy,parents:['Parent','DormantNew']}},old=await fullNeighborhoodOracle(M,f,nSettings,runtime()),full=await fullNeighborhoodOracle(M,f,settings,runtime());
          ok(!neighborhoodView(M,old,nRequest().center,nSettings).centerIncidence.some(pair=>pair.target==='Z.md'),'No old direct neighbor');
          const check=nGuard(f),result=await nReader(f).prepare(nRequest(),nPolicy(settings),runtime());nCompare(result,full,nRequest(),settings);
          ok(result.certificate.parents.some(ref=>ref.id==='Z.md'),'New parent selected from neutral facts');check();return true;
        }finally{f.close();}
      })()`), true);
    });

    await t.test("missing root and missing/corrupt negative pages cannot be treated as empty", async () => {
      assert.equal(await browser.evaluate(`(async()=>{
        const M=sourceModules,f=await nSeed('neighborhood-negative-pages');
        try{
          const db=await f.cache.open(),root=await f.repository.readDependencyRoot(()=>true);
          await edit(db,['meta'],tx=>tx.objectStore('meta').delete(M.SOURCE_DEPENDENCY_ROOT_KEY));
          nFailed(await nReader(f).prepare(nEmpty(),nPolicy(),runtime()),'dependency-pending');
          await edit(db,['meta'],tx=>tx.objectStore('meta').put(root));
          const manifest=JSON.parse(root.data),bucket=manifest.buckets.findIndex(value=>value.pages>0);let id;
          for(let index=0;index<100000;index++){const candidate='negative:'+index;if(M.sourceDependencyBucket(M.contributorKey('node',candidate))===bucket){id=candidate;break;}}
          ok(id,'Absent key in populated bucket');const scope=nEmpty();scope.center.id=scope.center.semanticPath=id;
          const key=[root.build.slot,bucket,0],page=await value(db.transaction('sourceDependencies').objectStore('sourceDependencies').get(key));ok(page,'Original page');
          await edit(db,['sourceDependencies'],tx=>tx.objectStore('sourceDependencies').delete(key));nFailed(await nReader(f).prepare(scope,nPolicy(),runtime()),'dependency-invalid');
          await edit(db,['sourceDependencies'],tx=>tx.objectStore('sourceDependencies').put({...page,data:page.data+' '}));nFailed(await nReader(f).prepare(scope,nPolicy(),runtime()),'dependency-invalid');return true;
        }finally{f.close();}
      })()`), true);
    });

    for (const scope of ["empty", "host-only"]) {
      await t.test(`${scope} closes the host observation after its final await without source callbacks`, async () => {
        assert.equal(await browser.evaluate(`(async()=>{
          const f=await nSeed('neighborhood-final-host-${scope}');
          try{
            const scope=${JSON.stringify(scope)}==='empty'?nEmpty():{kind:'neighborhood',center:f.entities.get('folder:/').entity};
            const original=f.discovery.revalidate.bind(f.discovery);let validations=0;
            f.discovery.revalidate=async certificate=>{const result=await original(certificate);
              if(++validations===2){equal(certificate.sources,[],'No source callback');f.app.daily.folder='Changed';}return result;};
            nFailed(await nReader(f).prepare(scope,nPolicy(),runtime()),'host-catalog-stale');equal(validations,2,'Final fence reached');return true;
          }finally{f.close();}
        })()`), true);
      });
    }

    for (const fence of ["head-before-replay", "head-at-final-check", "host-event", "host-environment", "source-journal", "known-journal", "host-journal", "root-replaced", "policy", "policy-token", "demand", "captured-host"]) {
      await t.test(`${fence} cannot return a partial or stale closure`, async () => {
        assert.equal(await browser.evaluate(`(async()=>{
          const M=sourceModules,f=await nSeed('neighborhood-fence-${fence}');
          try{
            const db=await f.cache.open(),p=nPolicy(nAssigned());let demand=true,policyCurrent=true,hostCurrent=true,captures=0,validations=0,mutated=false;
            p.isCurrent=()=>policyCurrent;const rt={...runtime(),isCurrent:()=>demand},original=f.discovery.revalidate.bind(f.discovery);
            const mutate=async()=>{
              const fence=${JSON.stringify(fence)};
              if(fence.startsWith('head-')){
                const id=fence==='head-before-replay'?'A.md':'T.md';
                const head=await value(db.transaction('sourceHeads').objectStore('sourceHeads').get(id));ok(head,'Selected source head');
                await edit(db,['sourceHeads'],tx=>tx.objectStore('sourceHeads').put({...head,sourceRevision:'superseded',sequence:head.sequence+100}));
              }else if(fence==='host-event')f.app.metadataCache.trigger('resolved');
              else if(fence==='host-environment')f.app.daily.folder='Changed';
              else if(fence==='host-journal')await f.repository.markContributorHostDirty({epoch:f.discovery.host.stamp.epoch,from:f.discovery.host.stamp.revision,to:f.discovery.host.stamp.revision+1,kind:'environment'});
              else if(fence==='source-journal'||fence==='known-journal'){
                equal((await f.repository.tombstone('D.md')).outcome,'activated','Real UNKNOWN ticket');
                if(fence==='known-journal'){f.files.delete('D.md');equal((await f.discovery.prepareOwnerImpact('D.md',null,()=>!f.files.has('D.md'))).outcome,'known','Real still-open KNOWN ticket');}
              }else if(fence==='root-replaced'){
                const root=await f.repository.readDependencyRoot(()=>true),data=JSON.parse(root.data),build={...root.build,generation:root.build.generation+'-replacement'};
                data.build=build;const text=JSON.stringify(data),digest=await f.repository.observationDigest(text);
                await edit(db,['meta'],tx=>tx.objectStore('meta').put({...root,build,data:text,digest}));
              }else if(fence==='policy')policyCurrent=false;
              else if(fence==='policy-token')p.revision='next-policy';
              else if(fence==='demand')demand=false;
              else if(fence==='captured-host')hostCurrent=false;
              mutated=true;
            };
            f.discovery.revalidate=async certificate=>{
              if(++validations===3&&${JSON.stringify(fence)}!=='head-before-replay'){
                if(['policy','policy-token','demand','captured-host'].includes(${JSON.stringify(fence)})){const checked=await original(certificate);await mutate();return checked;}
                await mutate();
              }
              return original(certificate);
            };
            const capture=async(id,rt)=>{
              const captured=await f.acquisition.captureForReplay(id,nPresentation,rt);
              if(captured.outcome==='ready'){const current=captured.request.host.isCurrent;captured.request={...captured.request,host:{...captured.request.host,isCurrent:()=>hostCurrent&&current()}};}
              if(++captures===1&&${JSON.stringify(fence)}==='head-before-replay')await mutate();return captured;
            };
            const result=await nReader(f,f.discovery,capture).prepare(nRequest(),p,rt);nFailed(result);ok(mutated,'Mutation reached');equal(f.repository.readers.size,0,'Leases released');
            if(${JSON.stringify(fence)}==='demand')equal(result.reason,'cancelled','Demand fence');
            if(['policy','policy-token'].includes(${JSON.stringify(fence)}))equal(result.reason,'superseded','Policy fence');
            if(${JSON.stringify(fence)}==='captured-host')equal(result.reason,'stale','Captured host fence');return true;
          }finally{f.close();}
        })()`), true);
      });
    }

    for (const change of ["missing-parent-page", "source-journal", "root-replaced", "demand"]) {
      await t.test(`between-pass ${change} rejects without returning direct-only readiness`, async () => {
        assert.equal(await browser.evaluate(`(async()=>{
          const M=sourceModules,f=await nSeed('neighborhood-between-${change}');
          try{
            const db=await f.cache.open(),original=f.discovery.discover.bind(f.discovery);let discoveries=0,demand=true;
            f.discovery.discover=async scope=>{
              if(++discoveries===2){
                ok(scope.endpoints.some(ref=>ref.id==='P.md'),'Entire parent frontier requested');
                const change=${JSON.stringify(change)};
                if(change==='missing-parent-page'){
                  const root=await f.repository.readDependencyRoot(()=>true),bucket=M.sourceDependencyBucket(M.contributorKey('node','P.md'));
                  await edit(db,['sourceDependencies'],tx=>tx.objectStore('sourceDependencies').delete([root.build.slot,bucket,0]));
                }else if(change==='source-journal')await f.repository.tombstone('D.md');
                else if(change==='root-replaced'){
                  const root=await f.repository.readDependencyRoot(()=>true),data=JSON.parse(root.data),build={...root.build,generation:root.build.generation+'-between'};
                  data.build=build;const text=JSON.stringify(data),digest=await f.repository.observationDigest(text);
                  await edit(db,['meta'],tx=>tx.objectStore('meta').put({...root,build,data:text,digest}));
                }else demand=false;
              }
              return original(scope);
            };
            nFailed(await nReader(f).prepare(nRequest(),nPolicy(nAssigned()),{...runtime(),isCurrent:()=>demand}));equal(discoveries,2,'Expansion attempted');return true;
          }finally{f.close();}
        })()`), true);
      });
    }

    await t.test("hot incoming parent range exceeds 256 union owners without any ready prefix", async () => {
      assert.equal(await browser.evaluate(`(async()=>{
        const f=await nSeed('neighborhood-hot-owners',false,f=>{
          f.add('A.md','',{Parent:'[[P]]'});f.add('P.md','');
          for(let index=0;index<257;index++)f.add('Child-'+index+'.md','',{Parent:'[[P]]'});
        });
        try{
          const check=nGuard(f),original=f.discovery.discover.bind(f.discovery);let calls=0;
          f.discovery.discover=scope=>{calls++;return original(scope);};
          nFailed(await nReader(f).prepare(nRequest(),nPolicy(),runtime()),'backpressure');equal(calls,2,'Hot range is the parent expansion');check();return true;
        }finally{f.close();}
      })()`), true);
    });

    await t.test("hot structural parent range exceeds 1024 host facts without truncated siblings", async () => {
      assert.equal(await browser.evaluate(`(async()=>{
        const f=await nSeed('neighborhood-hot-structure',false,f=>{
          f.add('A.md','');for(let index=0;index<1025;index++)f.add('Attachment-'+index+'.png','');
        });
        try{
          const check=nGuard(f),original=f.discovery.discover.bind(f.discovery);let calls=0;
          f.discovery.discover=scope=>{calls++;return original(scope);};
          nFailed(await nReader(f).prepare(nRequest(),nPolicy(),runtime()),'backpressure');equal(calls,2,'No partial parent structure');check();return true;
        }finally{f.close();}
      })()`), true);
    });

    await t.test("oversized semantic parent frontier is rejected before a second discovery", async () => {
      assert.equal(await browser.evaluate(`(async()=>{
        const f=await nSeed('neighborhood-hot-frontier',false,f=>f.add('A.md','',{Parent:Array.from({length:32},(_,index)=>'[[Parent-'+index+']]')}));
        try{
          const check=nGuard(f),original=f.discovery.discover.bind(f.discovery);let calls=0;
          f.discovery.discover=scope=>{calls++;return original(scope);};
          nFailed(await nReader(f).prepare(nRequest(),nPolicy(),runtime()),'backpressure');equal(calls,1,'No displayed parent prefix');check();return true;
        }finally{f.close();}
      })()`), true);
    });
  } finally { await browser.cleanup(); }
});
