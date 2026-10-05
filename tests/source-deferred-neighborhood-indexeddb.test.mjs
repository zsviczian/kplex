/** High-degree structural parents preserve complete direct semantics without acquiring siblings. */
import assert from "node:assert/strict";
import test from "node:test";
import { contributorBrowserBundle, contributorBrowserInitialize } from "./support/contributorBrowserFixture.mjs";
import { chromiumHarness } from "./support/browserTypeScript.mjs";
import { fullNeighborhoodOracle, neighborhoodView } from "./support/requestedNeighborhoodFixture.mjs";
import { centerGateSettings, centerGatePolicy, fullCenterIndex } from "./support/requestedCenterGateFixture.mjs";

const bundle = await contributorBrowserBundle([
  "src/index/CachedRequestedNeighborhood.ts", "src/index/GraphIndex.ts", "src/index/GraphBuilder.ts",
  "src/core/graph/compiler.ts", "src/core/graph/resolver.ts", "src/core/graph/evidence.ts",
  "src/adapters/obsidian/metadataSourceCollector.ts", "src/adapters/obsidian/ontologySourceCollector.ts",
]);

test("4,096 actual-IDB shared-tag and root members do not enter an ordinary note's direct scope", { timeout: 180_000 }, async () => {
  const browser = await chromiumHarness(bundle);
  try {
    assert.equal(await browser.evaluate(contributorBrowserInitialize), true);
    await browser.evaluate(`(() => {
      window.deferredScopeResult = { done: false };
      (async () => {
        const M=sourceModules, f=await fixture('deferred-high-degree-structural-parents');
        const fullNeighborhoodOracle=${fullNeighborhoodOracle.toString()}, neighborhoodView=${neighborhoodView.toString()};
        const centerGateSettings=${centerGateSettings.toString()}, centerGatePolicy=${centerGatePolicy.toString()}, fullCenterIndex=${fullCenterIndex.toString()};
        const settings={hierarchy:{hidden:['Hidden'],parents:['Parent'],children:['Children'],leftFriends:['Friends'],rightFriends:['Opposes'],previous:['Previous'],next:['Next']},
          inferAllLinksAsFriends:false,inverseInfer:false,showFullTagName:true,tagStyleList:[],maxLabelLength:30};
        let oracle;
        try {
          for(let n=0;n<4096;n++) {
            const path=n===0?'A.md':n===1?'B.md':'Member-'+n+'.md';
            f.add(path,n===0?'Friends:: [[B.md]]\\nFriends:: [[B.md]]':n===1?'Opposes:: [[A.md]]':'');
            f.metadata.get(path).hostTags=['#excalidraw'];
            f.metadata.get(path).tags=[{tag:'#excalidraw'}];
          }
          await f.acquire();
          equal(await f.repository.completeLocalDependencyInventory(),'ready','Actual closed IDB membership authority');
          f.acquisition.localDependenciesReady=f.acquisition.localDependencyAuthorityReady=true;
          const full=await fullNeighborhoodOracle(M,f,settings,runtime());
          oracle=await fullCenterIndex(M,f,full,settings,centerGateSettings());
          const expectedGates=oracle.gateStats(oracle.get('A.md'));
          const expected=neighborhoodView(M,full,ref('A.md'),settings,[]);
          const captured=[], scopes=[], discovery=f.acquisition.localContributorDiscovery(runtime());
          ok(discovery,'Production local discovery ready');
          const discover=discovery.discover.bind(discovery);
          discovery.discover=async scope=>{scopes.push(scope.endpoints.map(endpoint=>endpoint.id));return discover(scope);};
          const reader=new M.CachedRequestedNeighborhoodReader(f.repository,discovery,async(id,rt)=>{
            captured.push(id);return f.acquisition.captureForReplay(id,{noteTypeField:'Type',primaryTagField:'Style'},rt);
          },{entity:entity=>f.entities.get(entity.id)});
          const counters=f.acquisition.getCounters();f.work.reset();
          const policy={revision:'test-policy',settings,isCurrent:()=>true};
          const request={kind:'neighborhood',center:ref('A.md'),siblingClosure:'deferred'};
          const started=performance.now();
          const result=await reader.prepareCenterGates(request,policy,centerGatePolicy(centerGateSettings()),runtime());
          const elapsedMs=performance.now()-started;
          equal(result.outcome,'ready','Direct center remains available '+JSON.stringify(result));
          equal(result.coverage,'complete-center-gates','Complete center counts remain certified');
          equal(result.certificate.relations.coverage,'complete-center-relations','No parent closure claim');
          equal(result.certificate.relations.siblingClosure,'deferred','Explicit optional sibling state');
          equal(result.certificate.relations.completeParents,[],'No false complete-parent incidence');
          equal(result.certificate.relations.parents.map(parent=>parent.id).sort(),['folder:/','tag:excalidraw'],'Both structural parents remain direct relations');
          equal(result.work.passes,1,'No structural parent discovery');
          equal(scopes,[['A.md']],'Only center queried');
          equal([...new Set(captured)].sort(),['A.md','B.md'],'Only complete direct declaring owners replayed');
          equal(result.preparation.sources.length,2,'No thousands-member source replay');
          equal(result.preparation.compilation.nodes.size,4,'No sibling nodes materialized');
          equal(neighborhoodView(M,result.preparation.compilation,request.center,settings,[]),expected,'Canonical complete direct evidence, precedence and both directions');
          for(const gate of ['top','bottom','left','right']) for(const field of ['hasAny','visibleCount']) equal(result.gates[gate][field],expectedGates[gate][field],'Canonical '+gate+' '+field);
          equal(f.acquisition.getCounters(),counters,'No source reacquisition');
          equal(f.reads,[],'No body reads');equal(f.parses,[],'No parsing');
          equal(f.work.fileEnumerations,0,'No whole file inventory');equal(f.work.markdownEnumerations,0,'No Markdown inventory');
          equal(f.work.headPages,0,'No head scan');equal(f.work.writes,[],'No semantic source writes');
          f.work.reset();
          const admitted=await f.acquisition.admitRequestedSiblingParents(result.certificate.relations.parents,256,runtime());
          equal(admitted,[],'Huge structural parents deferred by fenced owner/physical counts');
          equal(f.work.visits,[],'Optional admission reads no source families');
          equal(f.work.inspections,[],'Optional admission inspects no heads');
          equal(f.work.headPages,0,'Optional admission enumerates no head pages');
          equal(f.work.localLookups,0,'Optional admission enumerates no memberships');
          // Exercise each high-degree parent independently as the visible structural gate.
          for(const [hidden, parent] of [['showTagNodes','folder:/'],['showFolderNodes','tag:excalidraw']]) {
            const isolated=await reader.prepareCenterGates(request,policy,centerGatePolicy(centerGateSettings({[hidden]:false})),runtime());
            equal(isolated.outcome,'ready','High-degree '+parent+' remains usable');
            equal(isolated.certificate.relations.parents.map(item=>item.id),[parent],'Isolated parent gate');
            equal(isolated.gates.top.visibleCount,1,'Exactly one visible structural parent');
            equal(isolated.preparation.sources.length,2,'No isolated parent fanout');
            equal(isolated.preparation.compilation.nodes.size,4,'Complete direct graph unchanged by presentation');
            equal(neighborhoodView(M,isolated.preparation.compilation,request.center,settings,[]),expected,'Isolated parent retains all direct semantic evidence');
          }
          // Close the final post-await source, host, policy and demand boundaries on direct reads.
          const revalidate=discovery.revalidate.bind(discovery);
          for(const fence of ['source','host','policy','demand']) {
            let validations=0, policyCurrent=true, demand=true;
            const revision=f.acquisition.hostRevision, mtime=f.files.get('A.md').stat.mtime;
            discovery.revalidate=async certificate=>{
              const valid=await revalidate(certificate);
              if(++validations===2) {
                if(fence==='source')f.files.get('A.md').stat.mtime++;
                if(fence==='host')f.acquisition.hostRevision++;
                if(fence==='policy')policyCurrent=false;
                if(fence==='demand')demand=false;
              }
              return valid;
            };
            const rejected=await reader.prepare(request,{...policy,isCurrent:()=>policyCurrent},{...runtime(),isCurrent:()=>demand});
            ok(rejected.outcome!=='ready','Final '+fence+' fence rejects stale direct incidence');
            ok(!('preparation'in rejected)&&!('certificate'in rejected),'No '+fence+' partial inputs escape');
            equal(validations,2,'Direct read retains awaited revalidation');
            f.acquisition.hostRevision=revision;f.files.get('A.md').stat.mtime=mtime;
          }
          discovery.revalidate=revalidate;
          // Optional sibling failure cannot damage already finalized direct inputs or claim absence.
          discovery.discover=async()=>({outcome:'pending',reason:'decode-budget'});
          const optional=await reader.prepareCenterGates({...request,siblingClosure:'complete'},policy,centerGatePolicy(centerGateSettings()),runtime());
          equal(optional.reason,'decode-budget','Optional closure remains honestly unavailable');
          equal(neighborhoodView(M,result.preparation.compilation,request.center,settings,[]),expected,'Independent direct result survives optional failure');
          return {members:4096,elapsedMs,sourceReplays:result.work.sourceReplays,nodes:result.preparation.compilation.nodes.size,peakBytes:result.preparation.memory.peakBytes};
        } finally {oracle?.destroy();f.close();}
      })().then(value=>window.deferredScopeResult={done:true,value},error=>window.deferredScopeResult={done:true,error:String(error.stack??error)});
      return true;
    })()`);
    const deadline = Date.now() + 170_000;
    let result;
    do {
      await new Promise(resolve => setTimeout(resolve, 100));
      result = await browser.evaluate("window.deferredScopeResult");
    } while (!result.done && Date.now() < deadline);
    assert.equal(result.done, true, "Actual IndexedDB scale setup/read completed");
    assert.equal(result.error, undefined, result.error);
    assert.equal(result.value.members, 4096);
    console.log("Deferred structural scope:", JSON.stringify(result.value));
  } finally { await browser.cleanup(); }
});


test("selected ordinary parents retain canonical siblings and bounded authenticated count admission", { timeout: 90_000 }, async () => {
  const browser = await chromiumHarness(bundle);
  try {
    assert.equal(await browser.evaluate(contributorBrowserInitialize), true);
    const output = await browser.evaluate(`(async()=>{
      const M=sourceModules,f=await fixture('selected-ordinary-parent');
      const fullNeighborhoodOracle=${fullNeighborhoodOracle.toString()},neighborhoodView=${neighborhoodView.toString()};
      const centerGateSettings=${centerGateSettings.toString()},centerGatePolicy=${centerGatePolicy.toString()};
      const settings={hierarchy:{hidden:['Hidden'],parents:['Parent'],children:['Children'],leftFriends:['Friends'],rightFriends:['Opposes'],previous:['Previous'],next:['Next']},
        inferAllLinksAsFriends:false,inverseInfer:false,showFullTagName:true,tagStyleList:[],maxLabelLength:30};
      try {
        f.add('A.md','Parent:: [[P.md]]');f.add('P.md','Children:: [[S.md]]');f.add('S.md','Parent:: [[P.md]]');f.add('U.md','');
        await f.acquire();equal(await f.repository.completeLocalDependencyInventory(),'ready','Closed source authority');
        f.acquisition.localDependenciesReady=f.acquisition.localDependencyAuthorityReady=true;
        const full=await fullNeighborhoodOracle(M,f,settings,runtime()),discovery=f.acquisition.localContributorDiscovery(runtime());
        const reader=new M.CachedRequestedNeighborhoodReader(f.repository,discovery,(id,rt)=>f.acquisition.captureForReplay(id,{noteTypeField:'Type',primaryTagField:'Style'},rt),{entity:entity=>f.entities.get(entity.id)});
        const policy={revision:'policy',settings,isCurrent:()=>true},gatePolicy=centerGatePolicy(centerGateSettings({showFolderNodes:false,showTagNodes:false}));
        const request={kind:'neighborhood',center:ref('A.md'),siblingClosure:'deferred'};
        const direct=await reader.prepareCenterGates(request,policy,gatePolicy,runtime());equal(direct.outcome,'ready','Direct ordinary center');
        f.work.reset();
        const admitted=await f.acquisition.admitRequestedSiblingParents(direct.certificate.relations.parents,256,runtime());
        equal(admitted.map(parent=>parent.id),['P.md'],'Ordinary semantic parent admitted');
        equal(f.work.visits,[],'Count admission visits no families');equal(f.work.inspections,[],'Count admission inspects no heads');equal(f.work.localLookups,0,'Count admission enumerates no memberships');
        const selected=await reader.prepareCenterGates({...request,siblingClosure:'selected',siblingParents:admitted.map(parent=>parent.id)},policy,gatePolicy,runtime());
        equal(selected.outcome,'ready','Bounded optional canonical closure');
        equal(selected.certificate.relations.coverage,'complete-selected-parent-relations','Honest finite parent subset');
        equal(selected.certificate.relations.completeParents.map(parent=>parent.id),['P.md'],'Exactly selected parent incidence');
        equal(selected.work.passes,2,'Selected parent canonical union pass');
        equal(neighborhoodView(M,selected.preparation.compilation,request.center,settings,['P.md']),neighborhoodView(M,full,request.center,settings,['P.md']),'Full independent canonical sibling witnesses/evidence');
        ok(neighborhoodView(M,selected.preparation.compilation,request.center,settings,['P.md']).siblings.some(item=>item.id==='S.md'),'Ordinary sibling retained');
        const invalid=await reader.prepare({...request,siblingClosure:'selected',siblingParents:['U.md']},policy,runtime());
        equal(invalid.reason,'unsupported-scope','Non-parent selection cannot authorize closure');
        const duplicate=await reader.prepare({...request,siblingClosure:'selected',siblingParents:['P.md','P.md']},policy,runtime());
        equal(duplicate.reason,'unsupported-scope','Duplicate optional IDs rejected');
        const db=await f.cache.open();
        const state=await value(db.transaction('meta').objectStore('meta').get(M.SOURCE_LOCAL_DEPENDENCY_STATE_KEY));
        await edit(db,['meta'],tx=>tx.objectStore('meta').put({...state,pending:1}));
        equal(await f.acquisition.admitRequestedSiblingParents(admitted,256,runtime()),[],'Pending source count authority defers optional work');
        await edit(db,['meta'],tx=>tx.objectStore('meta').put(state));
        let current=true;const validate=f.repository.validateLocalDependencies.bind(f.repository);
        f.repository.validateLocalDependencies=async(...args)=>{const r=await validate(...args);current=false;return r;};
        const count=await f.repository.lookupLocalDependencyCounts([M.sourceLocalDependencyKey('node','P.md')],()=>current,true);
        equal(count.outcome,'cancelled','Final post-await count demand fence');
        return {selectedParents:1,sibling:'S.md'};
      } finally {f.close();}
    })()`);
    assert.deepEqual(output, { selectedParents: 1, sibling: "S.md" });
  } finally { await browser.cleanup(); }
});
