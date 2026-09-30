/**
 * Real Chromium/IndexedDB URL-title derivative upgrade, reopen and fault proofs. Host events are
 * explicit doubles; storage transactions, source acquisition, full GraphBuilder and GraphIndex are
 * production. No mock IDB or fallback can turn an unavailable browser lane into a passing result.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { chromiumHarness } from "./support/browserTypeScript.mjs";
import { contributorBrowserBundle, contributorBrowserInitialize } from "./support/contributorBrowserFixture.mjs";
import { centerGateSettings } from "./support/requestedCenterGateFixture.mjs";
import { reframeTitleCatalog } from "./support/urlTitleFixture.mjs";

const bundle = await contributorBrowserBundle([
  "src/index/CachedRequestedUrlTitle.ts", "src/index/GraphBuilder.ts", "src/index/GraphIndex.ts",
]);
/** Browser fixture setup uses no replacement title selector or derivative query implementation. */
const initialize = `(() => {
  const M=sourceModules;
  window.centerGateSettings=${centerGateSettings.toString()};
  window.reframeTitleCatalog=${reframeTitleCatalog.toString()};
  window.titleUrl='https://example.com/path';
  window.titleRef=(url=titleUrl)=>({id:url,kind:'url',state:'materialized',semanticPath:url});
  window.titleSettings={hierarchy:{hidden:['Hidden'],parents:['Parent'],children:['Children'],leftFriends:['Friends'],rightFriends:['Opposes'],previous:['Previous'],next:['Next']},inferAllLinksAsFriends:false,inverseInfer:false,showFullTagName:true,tagStyleList:[],maxLabelLength:30};
  window.titlePolicy=()=>({revision:'title-policy:1',settings:structuredClone(titleSettings),isCurrent:()=>true});
  window.titleSeed=async(name)=>{
    const f=await fixture(name),first=f.add('Nested/First.md','[First label]('+titleUrl+')'),second=f.add('Root.md','[Second label]('+titleUrl+')');
    const unrelated=f.add('Unrelated.md','No URL');
    const root=f.app.vault.getRoot(),folder=new window.ContributorFolder();
    folder.path=folder.name='Nested';folder.parent=root;folder.children=[first];first.parent=folder;root.children=[folder,second,unrelated];
    f.app.vault.getRoot=()=>root;f.root=root;f.folder=folder;
    await f.acquire();f.discovery=await f.build();return f;
  };
  /** Exercise collectMarkdownSources itself, not a hand-arranged substitute full compilation. */
  window.titleFull=async(f,url=titleUrl,overrides={})=>{
    for(const file of f.app.vault.getMarkdownFiles())await f.cache.putBody(file.path,file.stat.mtime,M.parseBodyMetadata(f.texts.get(file.path)));
    const app={...f.app,vault:{...f.app.vault,getName:()=> 'url-title-fresh-full'}},plugin={app,settings:{...titleSettings,...centerGateSettings(overrides)},getIndexSourceRevision:()=>f.acquisition.hostRevision};
    const index=new M.GraphIndex(plugin,app);
    try{
      const builder=new M.GraphBuilder(plugin,app,new Map(),index.metadataParser,f.cache,()=>true);
      const state=await builder.build({acquireSources:false});ok(state,'Actual full builder completes');index.state=state;
      const page=state.pages.get(url);ok(page,'Full URL exists');equal(page.file,null,'Synthetic URL has no live scalar observation');equal(page.aliases,[],'Synthetic URL has no aliases');
      return index.titleFor(page);
    }finally{index.destroy();}
  };
  /** Exact canonical identity facts, never an already-published graph's URL label. */
  window.titleReader=(f,discovery=f.discovery)=>new M.CachedRequestedUrlTitleReader(f.repository,discovery,
    (id,rt)=>f.acquisition.captureForReplay(id,{noteTypeField:'',primaryTagField:''},rt),{entity:ref=>{
      const file=ref.physicalPath?f.app.vault.getFileByPath(ref.physicalPath):null;if(!file)return undefined;
      const fact=M.entityFactForFile(file);return fact.entity.id===ref.id?fact:undefined;
    }});
  window.titleSnapshot=async f=>{
    const db=await f.cache.open(),result={};
    for(const name of ['sourceHeads','sourceChunks','sourcePostings','bodies'])result[name]=await value(db.transaction(name).objectStore(name).getAll());return result;
  };
  /** Trap forbidden work independently of caught exceptions and compare actual source records. */
  window.titleGuard=f=>{
    const counts=f.acquisition.getCounters();let forbidden=0;
    const fail=()=>{forbidden++;throw new Error('Settings-only acquisition forbidden');};
    f.app.vault.read=f.app.vault.cachedRead=f.app.vault.getFiles=f.app.vault.getMarkdownFiles=f.app.vault.getRoot=fail;
    f.repository.replace=f.acquisition.acquire=f.acquisition.parse=f.discovery.rebuild=f.discovery.host.collect=fail;
    return ()=>{equal(forbidden,0,'No Markdown, parser, inventory or rebuild calls');equal(f.reads,[],'No Markdown IO');equal(f.parses,[],'No parser calls');equal(f.acquisition.getCounters(),counts,'No acquisition');equal(f.repository.readers.size,0,'Every source lease retired');};
  };
  window.titleRejected=(result,reason)=>{ok(result.outcome!=='ready','No ready partial title: '+JSON.stringify(result));if(reason)equal(result.reason,reason,'Reason');ok(!('input'in result)&&!('certificate'in result),'No partial input/certificate');};
  /** Modify only derivative pages/root, preserving the original source/control/host coordinates. */
  window.titleReframe=async(f,transform,version)=>{
    const db=await f.cache.open(),original=await f.repository.readDependencyRoot(()=>true);
    const pages=await value(db.transaction('sourceDependencies').objectStore('sourceDependencies').getAll());
    const changed=await reframeTitleCatalog(M,original,pages,transform,text=>f.repository.observationDigest(text),version);
    await edit(db,['meta','sourceDependencies'],tx=>{
      const store=tx.objectStore('sourceDependencies');
      for(const page of pages)if(page.slot===original.build.slot)store.delete([page.slot,page.bucket,page.index]);
      for(const page of changed.pages)store.put(page);tx.objectStore('meta').put(changed.root);
    });return changed.root;
  };
  return true;
})()`;

test("real IndexedDB URL-title order, compatibility and terminal fences", { timeout: 180000 }, async t => {
  const browser = await chromiumHarness(bundle);
  try {
    await browser.evaluate(contributorBrowserInitialize); await browser.evaluate(initialize);
    await t.test("nested/root full-title parity, unchanged structural order and zero settings source work", async () => {
      assert.equal(await browser.evaluate(`(async()=>{
        const f=await titleSeed('url-title-order');try{
          const variants=[{}, {renderAlias:false}, {nameFields:'Title,aliases',nodeTitleScript:'throw 1'}, {inverseInfer:true,inferAllLinksAsFriends:true}],expected=[];
          for(const options of variants)expected.push(await titleFull(f,titleUrl,options));equal(expected,['First label','First label','First label','First label'],'Fresh full GraphIndex');
          const relation=await f.discovery.discover({kind:'neighborhood',endpoints:[titleRef()]});equal(relation.sourceIds,['Root.md','Nested/First.md'],'Structural relation order preserved');
          const before=await titleSnapshot(f),root=await f.repository.readDependencyRoot(()=>true),check=titleGuard(f);
          equal(JSON.parse(root.data).version,4,'Derivative v4');equal((await f.cache.open()).version,7,'No IDB schema bump');
          for(let i=0;i<variants.length;i++){
            const policy=titlePolicy();Object.assign(policy.settings,variants[i]);const result=await titleReader(f).prepare(titleRef(),policy,runtime());
            equal(result.outcome,'ready','Bounded title input '+JSON.stringify(result));equal(result.input.name,expected[i],'Full title parity');
            equal(result.certificate.contributors.sources.map(s=>s.head.sourceId),['Nested/First.md','Root.md'],'Every supporting owner in Markdown order');
            equal(result.certificate.contributors.markdownOrder,[0,1],'Authenticated source ordinals');equal(result.work.familyVisits,8,'No unrelated owner replay');
          }
          check();equal(await titleSnapshot(f),before,'Durable source/body data unchanged');equal(await f.repository.readDependencyRoot(()=>true),root,'No root rewrite');return true;
        }finally{f.close();}
      })()`), true);
    });

    await t.test("genuine v2 root survives reopen for relations, then explicit v3 acquisition preserves sources", async () => {
      assert.equal(await browser.evaluate(`(async()=>{
        const M=sourceModules,f=await titleSeed('url-title-v2-reopen');let other;
        try{
          await titleFull(f);const before=await titleSnapshot(f);
          await titleReframe(f,rows=>rows.map(row=>{if(row.kind!=='source')return row;const {markdownOrdinal,...old}=row;return old;}),2);
          // Close the connection, not the live host observation. A new repository authenticates
          // the same disk root; a fresh host session would correctly require a new host catalog.
          const db=await f.cache.open();db.close();other=new M.KplexIndexedDbCache('url-title-v2-reopen');ok(await other.open(),'Real reopened connection');
          const d=new M.SourceContributorDiscovery(other.sources,f.discovery.host,runtime());
          equal((await d.discover({kind:'neighborhood',endpoints:[titleRef()]})).outcome,'ready','Legacy relations remain readable');
          titleRejected(await d.discoverUrlTitle(titleRef()),'dependency-pending');titleRejected(await d.discoverUrlTitle(titleRef('https://absent.example')),'dependency-pending');
          equal((await d.rebuild()).outcome,'ready','Only explicit acquisition replaces derivative root');
          equal((await d.discoverUrlTitle(titleRef())).sourceIds,['Nested/First.md','Root.md'],'New authenticated order');
          const reopened=await other.open();for(const [store,rows]of Object.entries(before))equal(await value(reopened.transaction(store).objectStore(store).getAll()),rows,store+' preserved through coexistence');
          equal(reopened.version,7,'No database migration');return true;
        }finally{other?.close();f.close();}
      })()`), true);
    });

    await t.test("v5 to v7 upgrade preserves accepted data before creating a v3 derivative", async () => {
      assert.equal(await browser.evaluate(`(async()=>{
        const M=sourceModules,seed=await titleSeed('url-title-upgrade-source'),db=await seed.cache.open(),copied={};
        const stores=['meta','sourceHeads','sourceChunks','sourcePostings','bodies'];for(const name of stores)copied[name]=await value(db.transaction(name).objectStore(name).getAll());seed.close();
        const old=await rawOpen(dbName('url-title-v5'),5,db=>{
          db.createObjectStore('meta',{keyPath:'key'}).createIndex('sourceLease',['sourceId','revision']);db.createObjectStore('bodies',{keyPath:'path'});db.createObjectStore('sourceHeads',{keyPath:'sourceId'});
          for(const name of ['sourceChunks','sourcePostings']){const store=db.createObjectStore(name,{keyPath:['sourceId','revision','family','index']});store.createIndex('sourceRevision',['sourceId','revision']);store.createIndex('sourceFamilyRevision',['sourceId','revision','family']);if(name==='sourcePostings')store.createIndex('lookup',['kind','key','sourceId','revision','family','index']);}
        });
        await edit(old,stores,tx=>{for(const name of stores)for(const row of copied[name]){if(name==='meta'&&(row.key.startsWith('source-dependency-')||row.key.startsWith('source-impact-')))continue;tx.objectStore(name).put(row);}});old.close();
        const f=await fixture('url-title-v5');try{
          const upgraded=await f.cache.open();equal(upgraded.version,7,'Existing additive upgrade');
          for(const name of ['sourceHeads','sourceChunks','sourcePostings','bodies'])equal(await value(upgraded.transaction(name).objectStore(name).getAll()),copied[name],name+' preserved during upgrade');
          titleRejected(await f.acquisition.contributorDiscovery(runtime()).discoverUrlTitle(titleRef()),'dependency-pending');
          f.add('A.md','[New label]('+titleUrl+')');await f.acquire();const d=await f.build();equal((await d.discoverUrlTitle(titleRef())).outcome,'ready','Explicit fresh v3 catalog');return true;
        }finally{f.close();}
      })()`), true);
    });

    for (const fault of ["missing-ordinal", "duplicate-ordinal", "out-of-range", "page-checksum", "missing-page"]) {
      await t.test(`${fault} cannot certify URL support or an empty colliding range`, async () => {
        assert.equal(await browser.evaluate(`(async()=>{
          const M=sourceModules,f=await titleSeed('url-title-fault-${fault}');try{
            const fault=${JSON.stringify(fault)},db=await f.cache.open(),before=await titleSnapshot(f);
            if(fault.endsWith('ordinal')||fault==='out-of-range')await titleReframe(f,rows=>{
              const owners=rows.filter(row=>row.kind==='source');
              if(fault==='missing-ordinal')delete owners.find(row=>row.head.sourceId==='Root.md').markdownOrdinal;
              if(fault==='duplicate-ordinal')for(const owner of owners)owner.markdownOrdinal=0;
              if(fault==='out-of-range')for(const owner of owners)owner.markdownOrdinal=owners.length;
              return rows;
            });
            else{
              const root=await f.repository.readDependencyRoot(()=>true),bucket=M.sourceDependencyBucket(M.contributorKey('node',titleUrl));
              const page=await f.repository.readDependencyPage(root.build,bucket,0,()=>true);
              await edit(db,['sourceDependencies'],tx=>{const store=tx.objectStore('sourceDependencies');if(fault==='missing-page')store.delete([page.slot,page.bucket,page.index]);else store.put({...page,data:page.data+' '});});
              let i=0;while(M.sourceDependencyBucket(M.contributorKey('node','https://missing.example/'+i))!==bucket)i++;
              titleRejected(await f.discovery.discoverUrlTitle(titleRef('https://missing.example/'+i)),'dependency-invalid');
            }
            titleRejected(await titleReader(f).prepare(titleRef(),titlePolicy(),runtime()),'dependency-invalid');
            equal(await titleSnapshot(f),before,'Corruption cannot rewrite durable source data');return true;
          }finally{f.close();}
        })()`), true);
      });
    }

    await t.test("aborted v3 page transaction leaves the old v2 root usable after reopen", async () => {
      assert.equal(await browser.evaluate(`(async()=>{
        const M=sourceModules,f=await titleSeed('url-title-abort');let other;const add=IDBObjectStore.prototype.add;
        try{
          await titleReframe(f,rows=>rows.map(row=>{if(row.kind!=='source')return row;const {markdownOrdinal,...rest}=row;return rest;}),2);
          const before=await titleSnapshot(f),root=await f.repository.readDependencyRoot(()=>true);let aborted=false;
          IDBObjectStore.prototype.add=function(...args){const request=add.apply(this,args);if(this.name==='sourceDependencies'&&!aborted){aborted=true;this.transaction.abort();}return request;};
          const result=await f.discovery.rebuild();IDBObjectStore.prototype.add=add;ok(aborted,'Actual dependency transaction aborted');titleRejected(result);
          other=new M.KplexIndexedDbCache('url-title-abort');ok(await other.open(),'Real reopen after fault');const d=new M.SourceContributorDiscovery(other.sources,f.discovery.host,runtime());
          equal(await other.sources.readDependencyRoot(()=>true),root,'No partial v3 root activation');equal((await d.discover({kind:'neighborhood',endpoints:[titleRef()]})).outcome,'ready','Old relation cover retained');titleRejected(await d.discoverUrlTitle(titleRef()),'dependency-pending');
          const db=await other.open();for(const [store,rows]of Object.entries(before))equal(await value(db.transaction(store).objectStore(store).getAll()),rows,store+' survived abort');return true;
        }finally{IDBObjectStore.prototype.add=add;other?.close();f.close();}
      })()`), true);
    });

    for (const mutation of ["insert", "delete", "rename", "inventory-reorder"]) {
      await t.test(`${mutation} invalidates old URL-title order without a query-time inventory scan`, async () => {
        assert.equal(await browser.evaluate(`(async()=>{
          const f=await titleSeed('url-title-${mutation}');try{
            const before=f.discovery,mutation=${JSON.stringify(mutation)};
            if(mutation==='insert'){const file=f.add('Inserted.md','[Inserted]('+titleUrl+')');f.root.children.push(file);f.app.vault.trigger('create',file);}
            if(mutation==='delete'){const file=f.files.get('Root.md');f.files.delete(file.path);f.root.children=f.root.children.filter(child=>child!==file);f.app.vault.trigger('delete',file);}
            if(mutation==='rename'){const file=f.files.get('Nested/First.md'),old=file.path;f.files.delete(old);file.path='Nested/Renamed.md';file.name='Renamed.md';file.basename='Renamed';f.files.set(file.path,file);f.texts.set(file.path,f.texts.get(old));f.metadata.set(file.path,f.metadata.get(old));f.app.vault.trigger('rename',file,old);}
            if(mutation==='inventory-reorder'){
              // Mutation while explicit acquisition is open, without an event: the final exact
              // inventory equality still rejects. This does not claim native event ordering.
              let reads=0;const get=f.app.vault.getMarkdownFiles;f.app.vault.getMarkdownFiles=()=>{const result=get();return ++reads===1?result:result.reverse();};
              const d=f.acquisition.contributorDiscovery(runtime());titleRejected(await d.rebuild());return true;
            }
            const check=titleGuard(f);titleRejected(await titleReader(f,before).prepare(titleRef(),titlePolicy(),runtime()));check();return true;
          }finally{f.close();}
        })()`), true);
      });
    }

    for (const fence of ["source-journal", "known-journal", "host-journal", "head", "policy", "demand"]) {
      await t.test(`final ${fence} prevents a ready URL-title input`, async () => {
        assert.equal(await browser.evaluate(`(async()=>{
          const M=sourceModules,f=await titleSeed('url-title-final-${fence}');try{
            const original=f.discovery.revalidate.bind(f.discovery),p=titlePolicy();let calls=0,current=true,mutated=false;
            f.discovery.revalidate=async certificate=>{
              if(++calls!==2)return original(certificate);
              const fence=${JSON.stringify(fence)};
              if(fence==='source-journal'||fence==='known-journal'){
                equal((await f.repository.tombstone('Unrelated.md')).outcome,'activated','Open unrelated source ticket');
                if(fence==='known-journal'){f.files.delete('Unrelated.md');const result=await f.discovery.prepareOwnerImpact('Unrelated.md',null,()=>true);equal(result.outcome,'known','Known remains open');}
              }
              if(fence==='host-journal')await f.repository.markContributorHostDirty({epoch:f.discovery.host.stamp.epoch,from:f.discovery.host.stamp.revision,to:f.discovery.host.stamp.revision+1,kind:'environment'});
              if(fence==='head'){const db=await f.cache.open(),head=await value(db.transaction('sourceHeads').objectStore('sourceHeads').get('Root.md'));await edit(db,['sourceHeads'],tx=>tx.objectStore('sourceHeads').put({...head,sequence:head.sequence+100}));}
              const result=await original(certificate);
              if(fence==='policy')p.revision='title-policy:2';if(fence==='demand')current=false;mutated=true;return result;
            };
            titleRejected(await titleReader(f).prepare(titleRef(),p,{...runtime(),isCurrent:()=>current}));ok(mutated,'Final awaited mutation ran');equal(f.repository.readers.size,0,'No leaked selected readers');return true;
          }finally{f.close();}
        })()`), true);
      });
    }
  } finally { await browser.cleanup(); }
});
