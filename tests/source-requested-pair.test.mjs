/** Private pair proof over real IndexedDB, canonical live collectors and unchanged cached facts. */
import assert from "node:assert/strict";
import test from "node:test";
import { chromiumHarness } from "./support/browserTypeScript.mjs";
import { contributorBrowserBundle, contributorBrowserInitialize } from "./support/contributorBrowserFixture.mjs";

const bundle = await contributorBrowserBundle([
  "src/index/CachedRequestedPair.ts", "src/index/CachedSourceSemantics.ts", "src/core/graph/compiler.ts",
  "src/core/graph/evidence.ts", "src/adapters/obsidian/hostLinkSourceCollector.ts",
  "src/adapters/obsidian/ontologySourceCollector.ts", "src/adapters/obsidian/metadataSourceCollector.ts",
]);

/** Small explicit host fixtures; all semantic compilation, source selection and storage are production. */
const initialize = String.raw`(() => {
  const M=sourceModules;
  window.pairSettings={hierarchy:{hidden:['Hidden'],parents:['Parent'],children:['Children'],leftFriends:['Friends'],
    rightFriends:['Opposes'],previous:['Previous'],next:['Next']},inferAllLinksAsFriends:false,inverseInfer:false,
    showFullTagName:true,tagStyleList:[],maxLabelLength:30};
  window.pairPresentation={noteTypeField:'Type',primaryTagField:'Style'};
  window.pairPolicy=settings=>({revision:'policy:1',settings:structuredClone(settings??pairSettings),isCurrent:()=>true});
  window.documentPair=()=>({kind:'pair',endpoints:[ref('A.md'),ref('B.md')]});
  window.noPair=()=>({kind:'pair',endpoints:['absent-A','absent-B'].map(id=>({id,kind:'unresolved',state:'unresolved',semanticPath:id}))});

  /** Full live-collector oracle, including ALL unrelated owners and canonical host structure. */
  window.fullPairOracle=async(f,settings)=>{
    const compiler=new M.NormalizedGraphCompiler(settings,runtime()),host=M.createObsidianMetadataSourceHost(f.app);
    const cr={isCurrent:()=>true,sourceRevision:()=>f.acquisition.hostRevision,checkpoint:async()=>true};
    f.entities=new Map();
    /** Preserve producer cursor/finality instead of concatenating unvalidated partial batches. */
    const feed=async collector=>{
      const read=compiler.beginRead(collector.boundary);
      const consume=async batch=>{
        for(const record of batch.records)if(record.kind==='entity')f.entities.set(record.entity.id,record);
        return compiler.acceptBatch(read,batch);
      };
      ok(await collector.collectBatches(consume),'Full producer collection');
      if(collector.finalize){const final=await collector.finalize();ok(final,'Full producer finality');ok(await consume(final),'Full final batch');}
      ok(collector.isBoundaryCurrent(collector.boundary),'Full producer current');
      ok(compiler.completeRead(read,collector.boundary),'Full read complete');
    };
    await feed(new M.ObsidianStructuralSourceCollector(f.app,cr));
    await feed(new M.ObsidianHostLinkSourceCollector(f.app,cr));
    for(const file of f.app.vault.getMarkdownFiles()){
      const metadata=M.mergeFileMetadata(f.metadata.get(file.path),M.parseBodyMetadata(f.texts.get(file.path)));
      await feed(new M.ObsidianMetadataSourceCollector(host,cr,file,metadata,pairPresentation,'metadata'));
      await feed(new M.ObsidianReferenceSourceCollector({metadataCache:f.app.metadataCache,resolvedLinkCount:host.resolvedLinkCount},cr,file,metadata));
      await feed(new M.ObsidianMetadataSourceCollector(host,cr,file,metadata,pairPresentation,'relations'));
    }
    const result=await compiler.finish();ok(result,'Full canonical compilation');return result;
  };

  /** Only attempt-local evidence IDs and contribution revisions are projected out; duplicates remain. */
  window.pairView=(compilation,request=documentPair())=>{
    const [a,b]=request.endpoints.map(endpoint=>endpoint.id);
    /** Provenance, ownership IDs, physical locations, role and direction all survive the oracle. */
    const evidence=item=>{const {id,contribution,...rest}=item;return {...rest,contribution:{sourceId:contribution.sourceId}};};
    /** Canonical precedence decides active/overridden evidence; the test adds no semantic rule. */
    const perspective=(source,target)=>{
      const edge=[...(compilation.node(source)?.neighbours.values()??[])].find(edge=>edge.target.id===target);
      // JSON equality below must compare edge values, not insertion order of equivalent properties.
      const stableEdge=edge?Object.fromEntries(Object.entries({...edge,target:edge.target.id})
        .sort(([left],[right])=>left.localeCompare(right))):null;
      return {edge:stableEdge,
        decisions:M.applyOntologyPrecedence(compilation.evidenceBetween(source,target)).map(decision=>
          JSON.stringify({...decision,evidence:evidence(decision.evidence)})).sort()};
    };
    return {forward:perspective(a,b),reverse:perspective(b,a),declarations:[...compilation.declarations()]
      .filter(item=>item.sourceId===a&&item.targetId===b||item.sourceId===b&&item.targetId===a)
      .map(item=>JSON.stringify(evidence(item))).sort()};
  };

  /** Incoming C is selected, unrelated D is not; body and metadata are fixed before policy runs. */
  window.pairSeed=async(name,imageOnly=false)=>{
    const f=await fixture(name);
    if(imageOnly){
      f.add('A.md','',{Image:'[[B]]'});f.add('B.md','Friends:: [[A]]',{Parent:'[[A]]'});
      f.app.metadataCache.resolvedLinks['A.md']={'B.md':1};
    }else{
      f.add('A.md','DormantInline:: [[B]]\nFriends:: [[B]]\nFriends:: [[B]]',
        {Dormant:['[[B]]','[[B]]'],Friends:'[[B]]',Image:'[[B]]'});
      f.add('B.md','Opposes:: [[A]]',{Parent:'[[A]]'});
      f.app.metadataCache.resolvedLinks['A.md']={'B.md':7};
    }
    f.app.metadataCache.resolvedLinks['B.md']={'A.md':2};
    f.add('C.md','[Third party](https://example.com/path)',{Friends:'[[A]]'});
    f.app.metadataCache.resolvedLinks['C.md']={'A.md':1};
    f.add('D.md','',{Unrelated:'[[Nowhere]]'});f.add('image.png','');
    f.metadata.get('A.md').hostTags=['#project/nested','#project/nested'];
    await f.acquire();f.discovery=await f.build();return f;
  };
  /** The read port supplies current canonical entities, not live graph relationships or copied maps. */
  window.pairReader=(f,discovery=f.discovery,capture)=>new M.CachedRequestedPairReader(f.repository,discovery,
    capture??((id,rt)=>f.acquisition.captureForReplay(id,pairPresentation,rt)),{entity:entity=>f.entities.get(entity.id)});
  /** Durable facts and roots must stay byte-shape identical across policy-only preparation. */
  window.sourceSnapshot=async f=>{
    const db=await f.cache.open(),data={};
    for(const store of ['sourceHeads','sourceChunks','sourcePostings','sourceDependencies','sourceImpacts','bodies'])
      data[store]=await value(db.transaction(store).objectStore(store).getAll());
    data.root=await value(db.transaction('meta').objectStore('meta').get(M.SOURCE_DEPENDENCY_ROOT_KEY));return data;
  };
  /** Fail immediately on acquisition, parsing, head writes or full inventory/source builds. */
  window.guardPolicyOnly=f=>{
    const counters=f.acquisition.getCounters();let forbidden=0;
    const fail=()=>{forbidden++;throw new Error('Forbidden source work during policy-only preparation');};
    f.app.vault.read=f.app.vault.cachedRead=fail;
    f.app.vault.getFiles=f.app.vault.getMarkdownFiles=f.app.vault.getRoot=fail;
    f.repository.replace=f.acquisition.acquire=f.acquisition.parse=f.discovery.rebuild=f.discovery.host.collect=fail;
    return ()=>{equal(forbidden,0,'No forbidden source work');equal(f.acquisition.getCounters(),counters,'Acquisition counters unchanged');
      equal(f.reads,[],'Zero Vault body reads');equal(f.parses,[],'Zero parser calls');};
  };
  /** A rejection exposes neither a partial compilation nor an authoritative pair certificate. */
  window.failedPair=(result,reason)=>{ok(result.outcome!=='ready','Must reject: '+JSON.stringify(result));
    if(reason)equal(result.reason,reason,'Failure reason');ok(!('preparation'in result)&&!('certificate'in result),'No mixed private result');};
  return true;
})()`;

test("real Chromium clean-host requested pair: same-policy full/cached parity and terminal fences", { timeout: 180000 }, async t => {
  const browser = await chromiumHarness(bundle);
  try {
    await browser.evaluate(contributorBrowserInitialize);
    await browser.evaluate(initialize);

    await t.test("dormant assignment/movement, duplicate/hidden assignments and every inference combination", async () => {
      assert.equal(await browser.evaluate(`(async()=>{
        const f=await pairSeed('pair-policy'),base=pairSettings;
        try{
          const variants=[base,
            {...base,hierarchy:{...base.hierarchy,parents:['Parent','Dormant','DormantInline']}},
            {...base,hierarchy:{...base.hierarchy,children:['Dormant','DormantInline'],rightFriends:['Opposes','Dormant']}},
            {...base,hierarchy:{...base.hierarchy,hidden:['Hidden','Dormant'],parents:['Parent','Dormant','Dormant']}},
            {...base,inferAllLinksAsFriends:true}, {...base,inverseInfer:true},
            {...base,inferAllLinksAsFriends:true,inverseInfer:true}];
          const expected=[];for(const variant of variants)expected.push(pairView(await fullPairOracle(f,variant)));
          ok(expected[0].declarations.length>0,'Nonempty pair oracle');
          ok(JSON.stringify(expected[0])!==JSON.stringify(expected[1]),'Dormant assignment changes semantics');
          ok(JSON.stringify(expected[1])!==JSON.stringify(expected[2]),'Moving assignment changes semantics');
          ok(expected[0].forward.decisions.some(value=>!JSON.parse(value).active),'Competing explicit evidence overrides body evidence');
          const before=await sourceSnapshot(f),check=guardPolicyOnly(f),reader=pairReader(f);
          for(const [index,variant] of variants.entries()){
            const policy=pairPolicy(variant);policy.revision='policy:'+index;
            const result=await reader.prepare(documentPair(),policy,runtime());
            equal(result.outcome,'ready',JSON.stringify(result));equal(result.coverage,'complete-pair','Only a pair proof');
            equal(result.certificate.sources.map(value=>value.head.sourceId),['A.md','B.md','C.md'],'Complete conservative direct cover, not all owners');
            equal(result.preparation.sources,result.certificate.sources,'Exact durable selections retained');
            equal(result.preparation.policyRevision,policy.revision,'Final policy revision');
            equal(pairView(result.preparation.compilation),expected[index],'Same-policy full/cached semantics '+index);
            equal(result.preparation.work.length,3,'Each selected owner replayed once');
            ok(result.preparation.work.every(work=>work.familyVisits===4),'Four family visits per owner');
          }
          check();equal(await sourceSnapshot(f),before,'No fact/head/root writes');return true;
        }finally{f.close();}
      })()`), true);
    });

    await t.test("image-only suppression toggles preserve incoming explicit evidence and exact declarations", async () => {
      assert.equal(await browser.evaluate(`(async()=>{
        const f=await pairSeed('pair-image',true);
        try{
          const variants=[pairSettings,{...pairSettings,nodeImageProperty:'Image'},
            {...pairSettings,thumbnailProperty:'Image'}, {...pairSettings,nodeImageProperty:'Image',thumbnailProperty:'Image'},
            {...pairSettings,nodeImageProperty:'NotImage',thumbnailProperty:'NotImage'}];
          const expected=[];for(const variant of variants)expected.push(pairView(await fullPairOracle(f,variant)));
          const declaredByA=view=>view.declarations.map(value=>JSON.parse(value)).filter(value=>value.declaredById==='A.md'&&value.sourceKind==='obsidian-link').length;
          equal(declaredByA(expected[0]),1,'Initial ordinary link');equal(declaredByA(expected[1]),0,'Image-only link suppressed');
          equal(expected[0],expected[4],'Changing away restores ordinary evidence');
          ok(expected[1].declarations.some(value=>JSON.parse(value).sourceKind==='frontmatter-ontology'),'Incoming explicit support remains');
          const before=await sourceSnapshot(f),check=guardPolicyOnly(f),reader=pairReader(f);
          for(const variant of variants){const result=await reader.prepare(documentPair(),pairPolicy(variant),runtime());
            equal(result.outcome,'ready',JSON.stringify(result));equal(pairView(result.preparation.compilation),expected[variants.indexOf(variant)],'Image-policy parity');}
          check();equal(await sourceSnapshot(f),before,'Policy toggles preserve durable facts');return true;
        }finally{f.close();}
      })()`), true);
    });

    await t.test("third-party URL origin, repeated tag memberships and host-only file tree each match full compilation", async () => {
      assert.equal(await browser.evaluate(`(async()=>{
        const f=await pairSeed('pair-structure');
        try{
          const full=await fullPairOracle(f,pairSettings);
          const origin=[...full.declarations()].find(value=>value.sourceKind==='url-origin');ok(origin,'Third-party origin declaration');
          const originPair={kind:'pair',endpoints:[{id:origin.sourceId,kind:'url',state:'materialized',semanticPath:origin.sourcePath},
            {id:origin.targetId,kind:'url',state:'materialized',semanticPath:origin.targetPath}]};
          const tag=[...full.declarations()].find(value=>value.sourceKind==='tag-tree'&&value.targetId==='A.md');ok(tag,'Repeated canonical membership');
          const tagPair={kind:'pair',endpoints:[{id:tag.sourceId,kind:'tag',state:'materialized',semanticPath:tag.sourcePath},ref('A.md')]};
          const tree=[...full.declarations()].find(value=>value.sourceKind==='file-tree'&&value.targetId==='image.png');ok(tree,'Host-only tree');
          const treePair={kind:'pair',endpoints:[f.entities.get(tree.sourceId).entity,f.entities.get(tree.targetId).entity]};
          const check=guardPolicyOnly(f),reader=pairReader(f);
          for(const [request,ids] of [[originPair,['C.md']],[tagPair,['A.md','B.md','C.md']],[treePair,[]]]){
            const result=await reader.prepare(request,pairPolicy(),runtime());equal(result.outcome,'ready',JSON.stringify(result));
            equal(result.certificate.sources.map(value=>value.head.sourceId),ids,'Third-party/host-only owner cover');
            equal(pairView(result.preparation.compilation,request),pairView(full,request),'Full structural/origin parity, including multiplicity');
          }
          check();return true;
        }finally{f.close();}
      })()`), true);
    });

    await t.test("authenticated empty cover prepares no sources; unqualified SI4a emptiness remains missing", async () => {
      assert.equal(await browser.evaluate(`(async()=>{
        const f=await pairSeed('pair-empty');
        try{
          const full=await fullPairOracle(f,pairSettings),before=await sourceSnapshot(f),check=guardPolicyOnly(f);
          const result=await pairReader(f).prepare(noPair(),pairPolicy(),runtime());equal(result.outcome,'ready',JSON.stringify(result));
          equal(result.certificate.sources,[],'Certified empty sources');equal(result.certificate.hostFacts,[],'Certified empty structure');
          equal(result.preparation.work,[],'No source replay');equal(pairView(result.preparation.compilation,noPair()),pairView(full,noPair()),'Empty full parity');
          const sourceOnly=await new sourceModules.CachedSourceSemanticReader(f.repository).prepare([],pairPolicy(),{entity:()=>undefined},runtime());
          equal(sourceOnly.reason,'missing','No unqualified absence shortcut');check();equal(await sourceSnapshot(f),before,'Empty proof is read-only');return true;
        }finally{f.close();}
      })()`), true);
    });

    await t.test("missing root and corrupted negative bucket never become empty ready pairs", async () => {
      assert.equal(await browser.evaluate(`(async()=>{
        const M=sourceModules,f=await pairSeed('pair-negative');
        try{
          await fullPairOracle(f,pairSettings);const db=await f.cache.open(),root=await f.repository.readDependencyRoot(()=>true);
          await edit(db,['meta'],tx=>tx.objectStore('meta').delete(M.SOURCE_DEPENDENCY_ROOT_KEY));
          failedPair(await pairReader(f).prepare(noPair(),pairPolicy(),runtime()),'dependency-pending');
          await edit(db,['meta'],tx=>tx.objectStore('meta').put(root));
          // Choose absent exact IDs whose bucket is populated: absence requires authenticating its pages.
          const manifest=JSON.parse(root.data),bucket=manifest.buckets.findIndex(value=>value.pages>0);let id;
          for(let index=0;index<100000;index++){const candidate='missing-collision-'+index;
            if(M.sourceDependencyBucket(M.contributorKey('node',candidate))===bucket){id=candidate;break;}}
          ok(id,'Deterministic populated negative bucket');const request=noPair();request.endpoints[0]={...request.endpoints[0],id,semanticPath:id};
          const page=await value(db.transaction('sourceDependencies').objectStore('sourceDependencies').get([root.build.slot,bucket,0]));ok(page,'Committed page');
          await edit(db,['sourceDependencies'],tx=>tx.objectStore('sourceDependencies').delete([root.build.slot,bucket,0]));
          failedPair(await pairReader(f).prepare(request,pairPolicy(),runtime()),'dependency-invalid');
          await edit(db,['sourceDependencies'],tx=>tx.objectStore('sourceDependencies').put({...page,data:page.data+' '}));
          failedPair(await pairReader(f).prepare(request,pairPolicy(),runtime()),'dependency-invalid');return true;
        }finally{f.close();}
      })()`), true);
    });

    for (const scope of ["empty", "host-only"]) {
      await t.test(`${scope} retains the host fence after the final revalidation await`, async () => {
        assert.equal(await browser.evaluate(`(async()=>{
          const f=await pairSeed('pair-final-host-${scope}');
          try{
            const full=await fullPairOracle(f,pairSettings);
            const edge=[...full.declarations()].find(value=>value.sourceKind==='file-tree'&&value.targetId==='image.png');
            const request=${JSON.stringify(scope)}==='empty'?noPair():{kind:'pair',endpoints:[f.entities.get(edge.sourceId).entity,f.entities.get(edge.targetId).entity]};
            const original=f.discovery.revalidate.bind(f.discovery);let validations=0,mutated=false;
            f.discovery.revalidate=async certificate=>{
              const result=await original(certificate);
              if(++validations===2){equal(certificate.sources,[],'No source host callbacks');f.app.daily.folder='Changed';mutated=true;}
              return result;
            };
            failedPair(await pairReader(f).prepare(request,pairPolicy(),runtime()),'host-catalog-stale');
            ok(mutated,'Host changed after the final await');equal(validations,2,'Final revalidation reached');return true;
          }finally{f.close();}
        })()`), true);
      });
    }

    for (const fence of ["head-before-replay", "head-at-final-check", "host-event", "host-environment", "source-journal", "known-journal", "host-journal", "root-replaced", "policy", "policy-token", "demand", "captured-host"]) {
      await t.test(`${fence} rejects private preparation at its awaited boundary`, async () => {
        assert.equal(await browser.evaluate(`(async()=>{
          const M=sourceModules,f=await pairSeed('pair-fence-${fence}');
          try{
            await fullPairOracle(f,pairSettings);const db=await f.cache.open(),policy=pairPolicy();let demand=true,policyCurrent=true,hostCurrent=true;
            policy.isCurrent=()=>policyCurrent;const rt={...runtime(),isCurrent:()=>demand};
            const original=f.discovery.revalidate.bind(f.discovery);let validations=0,captures=0,mutated=false;
            /** Mutate one real authority, without manufacturing a ready replacement certificate. */
            const mutate=async()=>{
              const fence=${JSON.stringify(fence)};
              if(fence.startsWith('head-')){
                const head=await value(db.transaction('sourceHeads').objectStore('sourceHeads').get('A.md'));
                await edit(db,['sourceHeads'],tx=>tx.objectStore('sourceHeads').put({...head,sourceRevision:'superseding-head',sequence:head.sequence+100}));
              }else if(fence==='host-event')f.app.metadataCache.trigger('resolved');
              else if(fence==='host-environment')f.app.daily.folder='Changed';
              else if(fence==='host-journal')await f.repository.markContributorHostDirty({epoch:f.discovery.host.stamp.epoch,
                from:f.discovery.host.stamp.revision,to:f.discovery.host.stamp.revision+1,kind:'environment'});
              else if(fence==='source-journal'||fence==='known-journal'){
                // A real repository invalidation opens a source repair ticket; no ticket may be retired here.
                const removed=await f.repository.tombstone('D.md');equal(removed.outcome,'activated','Real source ticket opened');
                if(fence==='known-journal'){
                  f.files.delete('D.md');
                  const impact=await f.discovery.prepareOwnerImpact('D.md',null,()=>!f.files.has('D.md'));
                  equal(impact.outcome,'known','Known S2a ticket is still open, not query authority');
                }
              }else if(fence==='root-replaced'){
                const root=await f.repository.readDependencyRoot(()=>true),data=JSON.parse(root.data);
                const build={...root.build,generation:root.build.generation+'-other'};data.build=build;
                const text=JSON.stringify(data),digest=await f.repository.observationDigest(text);await edit(db,['meta'],tx=>tx.objectStore('meta').put({...root,build,data:text,digest}));
              }else if(fence==='policy')policyCurrent=false;
              else if(fence==='policy-token')policy.revision='policy:2';
              else if(fence==='demand')demand=false;
              else if(fence==='captured-host')hostCurrent=false;
              mutated=true;
            };
            f.discovery.revalidate=async certificate=>{
              validations++;
              if(validations===2&&${JSON.stringify(fence)}!=='head-before-replay'){
                if(['policy','policy-token','demand','captured-host'].includes(${JSON.stringify(fence)})){
                  const checked=await original(certificate);await mutate();return checked;
                }
                await mutate();
              }
              return original(certificate);
            };
            const capture=async(id,runtime)=>{
              const captured=await f.acquisition.captureForReplay(id,pairPresentation,runtime);captures++;
              if(captured.outcome==='ready'){
                const current=captured.request.host.isCurrent;
                captured.request={...captured.request,host:{...captured.request.host,isCurrent:()=>hostCurrent&&current()}};
              }
              if(captures===1&&${JSON.stringify(fence)}==='head-before-replay')await mutate();
              return captured;
            };
            const result=await pairReader(f,f.discovery,capture).prepare(documentPair(),policy,rt);
            failedPair(result);ok(mutated,'The requested mutation completed');equal(f.repository.readers.size,0,'Selected source leases released');
            if(${JSON.stringify(fence)}==='demand')equal(result.reason,'cancelled','Demand is not fallback rebuild');
            if(['policy','policy-token'].includes(${JSON.stringify(fence)}))equal(result.reason,'superseded','Policy fence');
            if(${JSON.stringify(fence)}==='captured-host')equal(result.reason,'stale','Host capability survives final await');
            return true;
          }finally{f.close();}
        })()`), true);
      });
    }
  } finally { await browser.cleanup(); }
});
