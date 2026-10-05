/** Foreground document-pair authority and resumable background source slices over real browser IndexedDB. */
import assert from "node:assert/strict";
import test from "node:test";
import { contributorBrowserBundle, contributorBrowserInitialize } from "./support/contributorBrowserFixture.mjs";
import { chromiumHarness } from "./support/browserTypeScript.mjs";
import { hostOracle, collect } from "./support/cachedSourceFixture.mjs";

const bundle = await contributorBrowserBundle(["src/index/GraphBuilder.ts", "src/index/ForegroundWorkScheduler.ts", "src/core/graph/compiler.ts", "src/adapters/obsidian/ontologySourceCollector.ts", "src/adapters/obsidian/metadataSourceCollector.ts"]);

/** Run the unchanged production source/replay/compiler/storage code with only host events doubled. */
test("exact editable pair completes while real inventory is paused, then inventory resumes", async () => {
  const browser = await chromiumHarness(bundle);
  try {
    assert.equal(await browser.evaluate(contributorBrowserInitialize), true);
    assert.equal(await browser.evaluate(`(async()=>{
      const M=sourceModules,f=await fixture('priority-pair'),assert=Object.assign((v,m)=>ok(v,m),{equal});
      const collect=${collect.toString()},hostOracle=${hostOracle.toString()};
      const settings={hierarchy:{hidden:['Hidden'],parents:['Parent'],children:['Children'],leftFriends:['Friends'],rightFriends:['Opposes'],previous:['Previous'],next:['Next']},inferAllLinksAsFriends:false,inverseInfer:false,showFullTagName:true,tagStyleList:[],maxLabelLength:30};
      const presentation={noteTypeField:'Type',primaryTagField:'Style'},policy={revision:'pair:1',settings,isCurrent:()=>true};
      let release,entered;
      const blocked=new Promise(r=>release=r),reached=new Promise(r=>entered=r);
      let boundaries=0,paused=true;
      try{
        f.text=f.texts;
        f.add('A.md','Friends:: [[B]]');f.add('B.md','Parent:: [[A]]');
        f.add('C.md','Friends:: [[A]] [Shared](https://example.com/shared)');f.add('Image.png','');
        await f.acquire();f.work.reset();
        f.acquisition.backgroundCheckpoint=async()=>{boundaries++;if(paused&&boundaries===4){entered();await blocked;}};
        const inventory=f.acquisition.reconcile();await reached;
        ok(!f.acquisition.hasSemanticDependencies(),'Global inventory is genuinely unfinished');
        const before=f.work.snapshot(),request={kind:'pair',endpoints:[ref('A.md'),ref('B.md')]};
        const prepared=await f.acquisition.prepareRequestedPair(request,policy,presentation,runtime());
        equal(prepared.outcome,'ready','Pair completes before unrelated inventory resumes '+JSON.stringify(prepared));
        equal(prepared.certificate.sources.map(s=>s.head.sourceId),['A.md','B.md'],'Only both directed document owners selected');
        ok(!f.acquisition.hasSemanticDependencies(),'Local pair does not fabricate whole-vault authority');
        equal(f.work.markdownEnumerations,before.markdownEnumerations,'Foreground pair does not enumerate Markdown');
        equal(f.work.headPages,before.headPages,'Foreground pair does not scan stored heads');
        equal(f.work.localLookups,before.localLookups,'Foreground pair needs no global incidence lookup');
        ok(f.work.writes.filter(s=>s.startsWith('replace:')).every(s=>s==='replace:A.md'||s==='replace:B.md'),'Only exact document owners can be refreshed');
        const full=await hostOracle(f,['A.md','B.md','C.md'],settings,presentation,true);
        const pairView=c=>['A.md','B.md'].map((source,i)=>{
          const target=['B.md','A.md'][i],edge=[...(c.node(source)?.neighbours.values()??[])].find(e=>e.target.id===target);
          return {edge:edge?Object.fromEntries(Object.entries({...edge,target:edge.target.id}).sort(([a],[b])=>a.localeCompare(b))):null,
            evidence:c.evidenceBetween(source,target).map(({id,contribution,...rest})=>JSON.stringify({...rest,contribution:{sourceId:contribution.sourceId}})).sort()};
        });
        equal(pairView(prepared.preparation.compilation),pairView(full),'Full canonical directed/evidence parity');
        const inventories=f.work.markdownEnumerations;
        paused=false;release();ok(await inventory,'Original inventory closes after release');
        equal(f.work.markdownEnumerations,inventories,'Pause resumes captured inventory without restart');
        ok(f.acquisition.hasSemanticDependencies(),'Full authority eventually converges');
        return true;
      }finally{release?.();f.close();}
    })()`), true);
  } finally { await browser.cleanup(); }
});

/** Full document-family absence, shared target ownership, and new source edits remain pair-local. */
test("pair-local add/remove, shared targets, offline resolution drift and cancellation retain exact authority", async () => {
  const browser = await chromiumHarness(bundle);
  try {
    assert.equal(await browser.evaluate(contributorBrowserInitialize), true);
    assert.equal(await browser.evaluate(`(async()=>{
      const M=sourceModules,f=await fixture('local-pair-mutations');
      const settings={hierarchy:{hidden:['Hidden'],parents:[],children:[],leftFriends:['Friends'],rightFriends:[],previous:[],next:[]},inferAllLinksAsFriends:true,inverseInfer:false,showFullTagName:true,tagStyleList:[],maxLabelLength:30};
      const presentation={noteTypeField:'Type',primaryTagField:'Style'},policy={revision:'pair:1',settings,isCurrent:()=>true};
      try{
        const parse=f.acquisition.parse,parserCheckpoints=[];f.acquisition.parse=async(text,checkpoint)=>{parserCheckpoints.push(checkpoint);return parse(text);};
        const a=f.add('A.md',''),b=f.add('B.md',''),c=f.add('C.md','Friends:: [[B]] [Shared](https://example.com/shared)');f.add('Image.png','');
        const request={kind:'pair',endpoints:[ref('A.md'),ref('B.md')]};
        let result=await f.acquisition.prepareRequestedPair(request,policy,presentation,runtime());
        equal(result.outcome,'ready','Cold exact owners acquired without inventory');
        ok(parserCheckpoints.length===2&&parserCheckpoints.every(value=>value===undefined),'Cold foreground parsing never receives its own background pause');
        equal(result.preparation.compilation.evidenceBetween('A.md','B.md').length,0,'Third-party B incidence does not invent A/B evidence');
        f.texts.set('A.md','Friends:: [[B]]');a.stat.mtime++;f.app.vault.trigger('modify',a);
        result=await f.acquisition.prepareRequestedPair(request,policy,presentation,runtime());equal(result.outcome,'ready','Added exact pair prepared ahead of inventory');
        ok(result.preparation.compilation.evidenceBetween('A.md','B.md').length>0,'Added declarations authenticated');
        f.texts.set('A.md','');a.stat.mtime++;f.app.vault.trigger('modify',a);
        result=await f.acquisition.prepareRequestedPair(request,policy,presentation,runtime());equal(result.outcome,'ready','Removed exact pair prepared ahead of inventory');
        equal(result.preparation.compilation.evidenceBetween('A.md','B.md').length,0,'Removed declarations have complete negative pair proof');
        f.texts.set('A.md',['[Shared](https://example.com/shared)','Friends:: [[Image.png]]'].join(String.fromCharCode(10))); a.stat.mtime++;f.app.vault.trigger('modify',a);
        const url={id:'https://example.com/shared',semanticPath:'https://example.com/shared',kind:'url',state:'materialized'};
        result=await f.acquisition.prepareRequestedPair({kind:'pair',endpoints:[ref('A.md'),url]},policy,presentation,runtime());
        equal(result.outcome,'ready','Shared URL pair current');equal(result.certificate.sources.map(s=>s.head.sourceId),['A.md'],'Shared URL owners remain unrelated');
        ok(result.preparation.compilation.evidenceBetween('A.md',url.id).length>0,'Current URL relation preserved');
        const image={id:'Image.png',semanticPath:'Image.png',physicalPath:'Image.png',kind:'attachment',state:'materialized'};
        result=await f.acquisition.prepareRequestedPair({kind:'pair',endpoints:[ref('A.md'),image]},policy,presentation,runtime());equal(result.outcome,'ready','Document/attachment exact owner proof');
        ok(result.preparation.compilation.evidenceBetween('A.md','Image.png').length>0,'Attachment relation preserved');
        // Changed native resolver output without changing the source body must refresh resolution.
        f.app.metadataCache.getFirstLinkpathDest=literal=>literal==='Image.png'?b:f.files.get(literal)??f.files.get(literal+'.md')??null;
        result=await f.acquisition.prepareRequestedPair(request,policy,presentation,runtime());equal(result.outcome,'ready','Offline target drift reconciled locally');
        ok(result.preparation.compilation.evidenceBetween('A.md','B.md').length>0,'Current native resolver authority wins over durable old target');
        const durablePair=result;ok(durablePair.isCurrent(),'Ready pair exposes current finite host authority');
        const cachedMetadata=f.metadata.get('A.md');f.metadata.set('A.md',{...cachedMetadata});ok(!durablePair.isCurrent(),'Unnotified cache replacement expires stored pair authority');f.metadata.set('A.md',cachedMetadata);
        const captured=await f.acquisition.captureForReplay('A.md',presentation,runtime(),true);equal(captured.outcome,'ready','Pair host captured');
        f.acquisition.maintenanceRevision++;ok(durablePair.isCurrent(),'Unrelated maintenance retains stored pair authority');ok(captured.request.host.isCurrent(),'Unrelated background maintenance cannot retire an exact pair host');
        f.app.daily.format='YYYY';ok(!durablePair.isCurrent(),'Date drift expires stored pair authority');ok(!captured.request.host.isCurrent(),'Actual Date environment drift still retires the exact host');
        result=await f.acquisition.prepareRequestedPair(request,policy,presentation,{...runtime(),isCurrent:()=>false});equal(result.outcome,'cancelled','Cancelled demand cannot certify');
        equal((await f.acquisition.prepareRequestedPair({kind:'pair',endpoints:[url,image]},policy,presentation,runtime())).reason,'unsupported-scope','Ownerless non-document pair refused');
        equal(f.work.markdownEnumerations,0,'No mutation needs whole-vault Markdown inventory');equal(f.work.headPages,0,'No mutation needs durable source scan');
        return true;
      }finally{f.close();}
    })()`), true);
  } finally { await browser.cleanup(); }
});

/** Foreground pruning keeps global absence pending, then converges through real source authority. */
test("foreground synthetic pruning never joins a blocked inventory and preserves shared negative proof", async () => {
  const browser = await chromiumHarness(bundle);
  try {
    assert.equal(await browser.evaluate(contributorBrowserInitialize), true);
    assert.equal(await browser.evaluate(`(async()=>{
      const M=sourceModules,f=await fixture('foreground-pruning'),assert=Object.assign((v,m)=>ok(v,m),{equal});
      const collect=${collect.toString()},hostOracle=${hostOracle.toString()};
      const settings={hierarchy:{hidden:[],parents:[],children:[],leftFriends:[],rightFriends:[],previous:[],next:[]},inferAllLinksAsFriends:false,inverseInfer:false,showFullTagName:true,tagStyleList:[],maxLabelLength:30,noteTypeField:'Type',primaryTagField:'Style',baseNodeStyle:{maxLabelLength:30}};
      const presentation={noteTypeField:'Type',primaryTagField:'Style'},policy={revision:'prune:1',settings,isCurrent:()=>true};
      const scheduler=new M.ForegroundWorkScheduler(),url='https://example.com/shared',endpoint={id:url,kind:'url',state:'materialized',semanticPath:url};
      let release=()=>{},inventory;
      try{
        const parse=f.acquisition.parse,parserCheckpoints=[];f.acquisition.parse=async(text,checkpoint)=>{parserCheckpoints.push(checkpoint);return parse(text);};
        f.text=f.texts;const a=f.add('A.md','[A]('+url+')'),c=f.add('C.md','[C]('+url+')');await f.acquire();ok(await f.acquisition.reconcile(),'Real global source authority seeded');
        const builder=new M.GraphBuilder({settings,getIndexSourceRevision:()=>f.acquisition.getMaintenanceRevision()},f.app,new Map(),{parse:async text=>M.parseBodyMetadata(text)},f.cache,()=>true,new Map(),f.acquisition);
        const state=await builder.bindCompiledGraph(await hostOracle(f,['A.md','C.md'],settings,presentation,true),{materializedFile:facet=>f.files.get(facet.path)??null});
        ok(state.pages.has(url),'Shared synthetic node genuinely materialized');
        f.texts.set('A.md','');a.stat.mtime++;f.app.vault.trigger('modify',a);
        release=scheduler.begin(2);let entered;const reached=new Promise(done=>entered=done);
        f.acquisition.backgroundCheckpoint=async()=>{entered();await scheduler.checkpoint(3);};
        inventory=f.acquisition.reconcile();await reached;
        ok(!f.acquisition.hasSemanticDependencies(),'Changed source closes global negative authority');
        const flush=f.acquisition.flush;f.acquisition.flush=async()=>{throw Error('Foreground pruning attempted a global source flush');};
        equal(await f.acquisition.currentEndpointNode(endpoint,policy,presentation,runtime()),null,'Unclosed absence returns pending without waiting for background');
        equal(await builder.prepareNodeImpactPatch(state,[endpoint]),null,'Private patch defers while authority pending');
        ok(state.pages.has(url),'Pending proof never deletes a shared synthetic node');
        equal(scheduler.diagnostics().waiting,1,'Only the real background owner waits for foreground release');
        f.acquisition.flush=flush;release();ok(await inventory,'Captured background pass resumes and closes');
        ok(parserCheckpoints.length===1&&typeof parserCheckpoints[0]==='function','Background acquisition forwards its parser pause capability');
        const retained=await builder.prepareNodeImpactPatch(state,[endpoint]);ok(retained,'Closed current authority prepares retained node');retained.publish();ok(state.pages.has(url),'Other actual owner retains shared URL');
        f.texts.set('C.md','');c.stat.mtime++;f.app.vault.trigger('modify',c);ok(await f.acquisition.reconcile(),'Last owner removal closes authentic source authority');
        equal(await f.acquisition.currentEndpointNode(endpoint,policy,presentation,runtime()),undefined,'Full cached owner absence is a genuine negative proof');
        const removed=await builder.prepareNodeImpactPatch(state,[endpoint]);ok(removed,'Authenticated negative patch prepared');removed.publish();ok(!state.pages.has(url),'Only final certified absence prunes the node');
        return true;
      }finally{release();scheduler.close();await inventory?.catch(()=>{});f.close();}
    })()`), true);
  } finally { await browser.cleanup(); }
});
