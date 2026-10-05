/** Foreground direct GraphIndex publication remains usable while optional canonical siblings run. */
import assert from "node:assert/strict";
import test from "node:test";
import { contributorBrowserBundle, contributorBrowserInitialize } from "./support/contributorBrowserFixture.mjs";
import { chromiumHarness } from "./support/browserTypeScript.mjs";
import { fullNeighborhoodOracle } from "./support/requestedNeighborhoodFixture.mjs";
import { centerGateSettings, fullCenterIndex } from "./support/requestedCenterGateFixture.mjs";

const bundle = await contributorBrowserBundle([
  "src/index/GraphIndex.ts", "src/index/GraphBuilder.ts", "src/index/CachedRequestedNeighborhood.ts",
  "src/core/graph/compiler.ts", "src/core/graph/resolver.ts", "src/core/graph/evidence.ts",
  "src/adapters/obsidian/metadataSourceCollector.ts", "src/adapters/obsidian/ontologySourceCollector.ts",
]);

test("direct center, inverse parent edge and mutation readiness publish before bounded optional siblings", { timeout: 90_000 }, async () => {
  const browser = await chromiumHarness(bundle);
  try {
    assert.equal(await browser.evaluate(contributorBrowserInitialize), true);
    assert.equal(await browser.evaluate(`(async()=>{
      const M=sourceModules,f=await fixture('optional-sibling-publication');
      const fullNeighborhoodOracle=${fullNeighborhoodOracle.toString()},centerGateSettings=${centerGateSettings.toString()},fullCenterIndex=${fullCenterIndex.toString()};
      const settings={hierarchy:{hidden:['Hidden'],parents:['Parent'],children:['Children'],leftFriends:['Friends'],rightFriends:['Opposes'],previous:['Previous'],next:['Next']},
        inferAllLinksAsFriends:false,inverseInfer:false,showFullTagName:true,tagStyleList:[],maxLabelLength:30};
      let index,release,unblock;
      try {
        f.add('A.md','Parent:: [[P.md]]');f.add('P.md','Children:: [[S.md]]');f.add('S.md','Parent:: [[P.md]]');
        await f.acquire();equal(await f.repository.completeLocalDependencyInventory(),'ready','Real local authority');
        f.acquisition.localDependenciesReady=f.acquisition.localDependencyAuthorityReady=true;
        const full=await fullNeighborhoodOracle(M,f,settings,runtime());
        index=await fullCenterIndex(M,f,full,settings,centerGateSettings({showFolderNodes:false,showTagNodes:false}));
        index.sourceAcquisition.close();index.sourceAcquisition=f.acquisition;index.plugin.settings.lastActivePath='A.md';
        release=index.acquireSemanticDemand('A.md');
        const admit=f.acquisition.admitRequestedSiblingParents.bind(f.acquisition);let entered=false,admissions=0;
        f.acquisition.admitRequestedSiblingParents=async(...args)=>{admissions++;entered=true;await new Promise(done=>unblock=done);return admit(...args);};
        index.invalidateSemanticPolicy();await index.refreshSemanticSettings();
        equal(index.hasPendingSemanticPreparation(),false,'Direct current scope usable before sibling admission');
        equal(index.getSemanticPreparationFailure(),null,'Optional work is no center failure');
        ok(index.get('A.md').neighbours.get('P.md')?.isParent,'Canonical parent retained');
        ok(index.get('P.md').neighbours.get('A.md')?.isChild,'Finite inverse center edge retained');
        ok(index.isSemanticWriteReady('A.md','P.md'),'Complete direct pair mutation readiness');
        const direct=index.semanticScopes.get('A.md');
        ok(direct.completePaths.has('A.md')&&!direct.completePaths.has('P.md'),'No false parent completeness');
        equal(index.getNeighborhood('A.md').siblings,[],'Deferred siblings are not represented as a complete set');
        equal(index.gateStats(index.get('P.md')).bottom.complete,false,'Deferred parent gate count is partial');
        for(let n=0;!entered&&n<100;n++)await new Promise(done=>setTimeout(done,10));
        ok(entered,'Optional count admission starts after direct publication');
        // A higher-priority action pauses optional work after its host await, without blocking it.
        const releaseForeground=index.workScheduler.begin(0);unblock();await new Promise(done=>setTimeout(done,30));
        ok(index.semanticScopes.get('A.md')===direct,'P3 optional stage yields to foreground owner');
        releaseForeground();
        for(let n=0;!index.semanticScopes.get('A.md').completePaths.has('P.md')&&n<300;n++)await new Promise(done=>setTimeout(done,10));
        ok(index.semanticScopes.get('A.md').completePaths.has('P.md'),'Optional bounded parent incidence publishes');
        equal(index.getNeighborhood('A.md').siblings.map(item=>item.page.path),['S.md'],'Ordinary canonical siblings preserved');
        equal(index.gateStats(index.get('P.md')).bottom.complete,undefined,'Optional complete parent restores exact count shape');
        await index.refreshSemanticSettings();await new Promise(done=>setTimeout(done,20));
        equal(admissions,1,'Enriched publication does not launch another sibling pass');
        // A new direct lifetime survives an optional reader failure as an available center.
        f.acquisition.admitRequestedSiblingParents=admit;
        const prepare=f.acquisition.prepareRequestedNeighborhood.bind(f.acquisition);let optionalCalls=0;
        f.acquisition.prepareRequestedNeighborhood=async(request,...args)=>{
          if(request.siblingClosure==='selected'){optionalCalls++;return{outcome:'pending',reason:'decode-budget'};}
          return prepare(request,...args);
        };
        index.invalidateSemanticPolicy();await index.refreshSemanticSettings();
        for(let n=0;optionalCalls===0&&n<100;n++)await new Promise(done=>setTimeout(done,10));
        equal(optionalCalls,1,'One bounded failed optional attempt');equal(index.hasPendingSemanticPreparation(),false,'Optional decode limit never invalidates center');
        equal(index.getSemanticPreparationFailure(),null,'Optional failure never produces relationship limit');
        ok(index.get('A.md').neighbours.get('P.md')?.isParent,'Canonical direct center survives sibling failure');
        const published=index.getSemanticPreparationDiagnostics().published;
        await index.refreshSemanticSettings();await new Promise(done=>setTimeout(done,20));
        equal(optionalCalls,1,'Failed optional lifetime does not busy retry');equal(index.getSemanticPreparationDiagnostics().published,published,'No redundant publication');
        equal(f.reads,[],'No body reads');equal(f.parses,[],'No parsing');return true;
      }finally{unblock?.();release?.();index?.destroy();f.close();}
    })()`), true);
  } finally { await browser.cleanup(); }
});

test("partial induced pages retain current policy and unknown structural degrees sort after known totals", { timeout: 90_000 }, async () => {
  const browser = await chromiumHarness(bundle);
  try {
    assert.equal(await browser.evaluate(contributorBrowserInitialize), true);
    assert.equal(await browser.evaluate(`(async()=>{
      const M=sourceModules,f=await fixture('partial-policy-degree-publication');
      const fullNeighborhoodOracle=${fullNeighborhoodOracle.toString()},centerGateSettings=${centerGateSettings.toString()},fullCenterIndex=${fullCenterIndex.toString()};
      const settings={hierarchy:{hidden:['Hidden'],parents:['Parent'],children:['Children'],leftFriends:['Friends'],rightFriends:['Opposes'],previous:['Previous'],next:['Next']},
        inferAllLinksAsFriends:false,inverseInfer:false,showFullTagName:true,tagStyleList:[],maxLabelLength:30};
      let index,release;
      try {
        f.add('A.md','Parent:: [[P.md]]\\nParent:: [[Q.md]]');
        f.add('P.md','Children:: [[A.md]]\\nParent:: [[Q.md]]\\nFriends:: [[Q.md]]');f.add('Q.md','Children:: [[A.md]]');
        for(const path of ['A.md','P.md','Q.md']){f.metadata.get(path).hostTags=['#dense'];f.metadata.get(path).tags=[{tag:'#dense'}];}
        await f.acquire();equal(await f.repository.completeLocalDependencyInventory(),'ready','Real local authority');
        f.acquisition.localDependenciesReady=f.acquisition.localDependencyAuthorityReady=true;
        const previous=await fullNeighborhoodOracle(M,f,settings,runtime());
        index=await fullCenterIndex(M,f,previous,settings,centerGateSettings({renderSiblings:false}));
        index.sourceAcquisition.close();index.sourceAcquisition=f.acquisition;index.plugin.settings.lastActivePath='A.md';
        index.plugin.settings.inferAllLinksAsFriends=true;
        const expected=await fullNeighborhoodOracle(M,f,{...settings,inferAllLinksAsFriends:true},runtime());
        const oracle=await fullCenterIndex(M,f,expected,{...settings,inferAllLinksAsFriends:true},centerGateSettings({renderSiblings:false}));
        try {
          release=index.acquireSemanticDemand('A.md');index.invalidateSemanticPolicy();await index.refreshSemanticSettings();
          const parent=index.get('P.md'),info=index.preparedPageInfo.get(parent);
          ok(info&&!info.completeRelations,'Ordinary parent is partial until optional closure');
          equal(index.fullSemanticSettings.inferAllLinksAsFriends,false,'Previous full policy genuinely differs');
          equal(index.semanticRelationSource(parent).settings.inferAllLinksAsFriends,true,'Partial flags retain captured current compiler policy');
          const expectedRoles=['parent','child','left','right','previous','next'].map(role=>oracle.neighbours(oracle.get('P.md'),role).filter(item=>item.page.path==='Q.md').map(item=>item.relationType));
          const actualRoles=['parent','child','left','right','previous','next'].map(role=>index.neighbours(parent,role).filter(item=>item.page.path==='Q.md').map(item=>item.relationType));
          equal(actualRoles,expectedRoles,'Finite induced non-center pair uses full canonical current-policy classification');
          ok(expectedRoles[0].length===1&&expectedRoles[2].length===0,'Policy-sensitive explicit parent/friend fixture');
          const items=index.getNeighborhood('A.md').parents;
          const known=items.filter(item=>index.preparedPageInfo.get(item.page)?.rawDegree!==undefined);
          const unknown=items.filter(item=>index.preparedPageInfo.get(item.page)?.rawDegree===undefined);
          ok(known.length>=2&&unknown.length>=2,'Ordinary totals available and structural totals honestly unknown');
          for(const item of unknown)ok(index.preparedPageInfo.get(item.page)?.completeRelations===false,'No false structural incidence completeness');
          for(const order of ['connections-asc','connections-desc']){
            index.plugin.settings.nodeSortOrder=order;
            const sorted=index.sortNeighbours([...unknown,...known]);
            equal(sorted.slice(0,known.length).map(item=>item.page.path).sort(),known.map(item=>item.page.path).sort(),'Known degrees precede unknown for '+order);
            equal(sorted.slice(known.length).map(item=>index.titleFor(item.page)),unknown.map(item=>index.titleFor(item.page)).sort(),'Unknown degrees use stable names for '+order);
          }
          equal(index.gateStats(index.get('A.md')).top.complete,undefined,'Exact center keeps existing complete count shape');
          equal(index.gateStats(parent).top.complete,false,'Partial gate count is marked as a lower bound');
          equal(f.reads,[],'No body reads');equal(f.parses,[],'No parsing');return true;
        } finally {oracle.destroy();}
      } finally {release?.();index?.destroy();f.close();}
    })()`), true);
  } finally { await browser.cleanup(); }
});
