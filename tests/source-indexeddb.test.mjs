/**
 * Real browser IndexedDB integration; a missing/blocked browser fails this lane, never counts as a skip.
 * Selection coordination cases exercise atomic bounded snapshots and late local masks independently
 * of family authenticity; multi-page reads still close their original global source-sequence fence.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { browserBundle, chromiumHarness } from "./support/browserTypeScript.mjs";

const bundle = await browserBundle(["src/index/IndexedDbCache.ts", "src/index/SourceFacts.ts", "src/core/parser/metadata.ts", "src/index/CachedSourceSemantics.ts", "src/adapters/obsidian/yieldToHostTask.ts"], {
  obsidian: "exports.Platform={isMobile:false,isIosApp:false};",
});

/** Test-only helpers call production owners and real IDB transactions. No IndexedDB implementation is mocked. */
const initialize = `(() => {
  const M = window.sourceModules;
  window.ok = (value, message) => { if (!value) throw new Error(message); };
  window.equal = (actual, expected, message) => ok(JSON.stringify(actual) === JSON.stringify(expected), message + ': ' + JSON.stringify(actual));
  window.requestValue = request => new Promise((resolve, reject) => { request.onsuccess=()=>resolve(request.result); request.onerror=()=>reject(request.error); });
  window.databaseName = vault => 'k-plex-index-v1-' + [...new TextEncoder().encode(vault)].map(v=>v.toString(16).padStart(2,'0')).join('').slice(0,96);
  window.rawOpen = (name, version, upgrade) => new Promise((resolve,reject) => {
    const request = indexedDB.open(name,version); request.onupgradeneeded=()=>upgrade?.(request.result,request.transaction);
    request.onsuccess=()=>resolve(request.result); request.onerror=()=>reject(request.error); request.onblocked=()=>reject(new Error('Unexpected blocked fixture open'));
  });
  window.edit = async (db, stores, callback) => {
    const tx = db.transaction(stores,'readwrite');
    const done = new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error ?? new Error('Fixture transaction aborted'));tx.onerror=()=>reject(tx.error);});
    const [value] = await Promise.all([callback(tx),done]); return value;
  };
  window.fresh = async vault => { const cache = new M.KplexIndexedDbCache(vault); ok(await cache.open(), 'Production cache must open real IDB'); return cache; };
  window.make = async (repository,id,expected={kind:'missing'},bodyText='Field:: [[Alpha]]',frontmatter={}) => {
    const body=M.parseBodyMetadata(bodyText); const metadata={...body,frontmatter,aliases:[],tags:[]};
    return {sourceId:id,physical:{identity:id+'-incarnation',path:id+'.md',mtime:1,size:bodyText.length,ctime:1},
      observation:{epoch:'browser',revision:1,environment:await repository.observationDigest('host')},expected,
      families:{values:async emit=>{for(const fact of M.sourceValueSteps(metadata))if(!await emit(fact))return false;return true;},
        'body-urls':async emit=>{for(const url of body.urls)if(!await emit({kind:'body-url',...url}))return false;return true;},
        metadata:async emit=>emit({kind:'alias',value:'label'}),resolution:async()=>true}};
  };
  window.owners = async (repository,key) => { const ids=[];ok(await repository.querySources('literal',key,batch=>{ids.push(...batch);return true;}),'Posting query available');return ids; };
  window.cache = null;
  return true;
})()`;

/** Queued bodies are optional parser-cache data; all completed flushes still use native IndexedDB. */
test("real Chromium: parsed-body write-behind remains readable without granting durable source authority", { timeout: 60000 }, async t => {
  const browser = await chromiumHarness(bundle);
  try {
    await browser.evaluate(initialize);
    await t.test("matching queued bodies are readable before the write timer or database open", async () => {
      assert.equal(await browser.evaluate(`(async()=>{
        const owner=new sourceModules.KplexIndexedDbCache('queued-body-before-open');
        const body=sourceModules.parseBodyMetadata('Field:: [[Queued]] [link](https://example.com/queued)');
        const open=indexedDB.open;let opens=0;indexedDB.open=function(...args){opens++;return open.apply(this,args);};
        try{
          owner.queueBodyWrite('queued.md',4,body);window.clearTimeout(owner.bodyWriteTimer);owner.bodyWriteTimer=null;
          equal(await owner.getBody('queued.md',4),body,'Point read reuses completed parse');
          equal([...await owner.getBodies([{path:'queued.md',mtime:4}])],[['queued.md',body]],'Batch read reuses completed parse');
          equal(opens,0,'Queued hits need no connection or durability');
          const db=await owner.open();ok(db,'Real database opens');
          equal(await requestValue(db.transaction('bodies').objectStore('bodies').count()),0,'No delayed body was persisted');
          equal(await requestValue(db.transaction('sourceHeads').objectStore('sourceHeads').count()),0,'No neutral source authority is created');
          return true;
        }finally{indexedDB.open=open;owner.close();}
      })()`),true);
    });
    await t.test("an in-flight flush retains matching hits until its real transaction completes", async () => {
      assert.equal(await browser.evaluate(`(async()=>{
        const owner=await fresh('queued-body-held-flush'),body=sourceModules.parseBodyMetadata('Field:: [[Held]]');
        const put=owner.putBodies.bind(owner);let release,entered;
        const hold=new Promise(resolve=>release=resolve),reached=new Promise(resolve=>entered=resolve);
        owner.putBodies=async records=>{entered();await hold;return put(records);};
        try{
          owner.queueBodyWrite('held.md',5,body);window.clearTimeout(owner.bodyWriteTimer);owner.bodyWriteTimer=null;
          const record=owner.queuedBodyWrites.get('held.md'),flushing=owner.flushQueuedBodyWrites();await reached;
          equal(owner.bodyWriteInFlight,true,'Production flush is in flight');
          equal(owner.queuedBodyWrites.get('held.md')===record,true,'Exact record remains owned during flush');
          equal(await owner.getBody('held.md',5),body,'Point read remains available');
          equal([...await owner.getBodies([{path:'held.md',mtime:5},{path:'missing.md',mtime:5}])],[['held.md',body]],'Mixed batch retains queued hit');
          release();await flushing;equal(owner.queuedBodyWrites.size,0,'Successful transaction retires its exact record');
          const reader=await fresh('queued-body-held-flush');
          try{equal(await reader.getBody('held.md',5),body,'Independent owner reads actual durable body');}finally{reader.close();}
          return true;
        }finally{release();owner.close();}
      })()`),true);
    });
    await t.test("an older completed flush cannot delete a newer queued replacement for the same path and mtime", async () => {
      assert.equal(await browser.evaluate(`(async()=>{
        const owner=await fresh('queued-body-latest'),first=sourceModules.parseBodyMetadata('Field:: [[First]]'),latest=sourceModules.parseBodyMetadata('Field:: [[Latest]]');
        const put=owner.putBodies.bind(owner);let releaseFirst,releaseLatest,enteredFirst,enteredLatest,calls=0;
        const firstHold=new Promise(resolve=>releaseFirst=resolve),latestHold=new Promise(resolve=>releaseLatest=resolve);
        const firstReached=new Promise(resolve=>enteredFirst=resolve),latestReached=new Promise(resolve=>enteredLatest=resolve);
        owner.putBodies=async records=>{
          calls++;if(calls===1){const written=await put(records);enteredFirst();await firstHold;return written;}
          enteredLatest();await latestHold;return put(records);
        };
        try{
          owner.queueBodyWrite('latest.md',6,first);window.clearTimeout(owner.bodyWriteTimer);owner.bodyWriteTimer=null;
          const flushing=owner.flushQueuedBodyWrites();await firstReached;
          owner.queueBodyWrite('latest.md',6,latest);const replacement=owner.queuedBodyWrites.get('latest.md');
          equal(await owner.getBody('latest.md',6),latest,'Latest queued body wins over older durable body');
          releaseFirst();await latestReached;
          equal(owner.queuedBodyWrites.get('latest.md')===replacement,true,'Older success preserves newer record identity');
          equal([...await owner.getBodies([{path:'latest.md',mtime:6}])],[['latest.md',latest]],'Replacement remains readable during its flush');
          const reader=await fresh('queued-body-latest');
          try{equal(await reader.getBody('latest.md',6),first,'Older native transaction really completed');}finally{reader.close();}
          releaseLatest();await flushing;equal(calls,2,'Replacement receives its own bounded flush');equal(owner.queuedBodyWrites.size,0,'Latest success releases queue');
          const reopened=await fresh('queued-body-latest');
          try{equal(await reopened.getBody('latest.md',6),latest,'Independent native read sees latest body');}finally{reopened.close();}
          return true;
        }finally{releaseFirst();releaseLatest();owner.close();}
      })()`),true);
    });
    await t.test("failed persistence retains optional hits and the existing retry can durably settle them", async () => {
      assert.equal(await browser.evaluate(`(async()=>{
        const owner=await fresh('queued-body-retry'),body=sourceModules.parseBodyMetadata('Field:: [[Retry]]'),put=owner.putBodies.bind(owner);
        owner.putBodies=async()=>false;
        try{
          owner.queueBodyWrite('retry.md',7,body);window.clearTimeout(owner.bodyWriteTimer);owner.bodyWriteTimer=null;
          const record=owner.queuedBodyWrites.get('retry.md');await owner.flushQueuedBodyWrites();
          equal(owner.bodyWriteInFlight,false,'Failed attempt releases in-flight owner');ok(owner.bodyWriteTimer!==null,'Existing retry timer is retained');
          equal(owner.queuedBodyWrites.get('retry.md')===record,true,'Failed persistence keeps exact record');
          equal(await owner.getBody('retry.md',7),body,'Failed optional write does not discard parsed data');
          window.clearTimeout(owner.bodyWriteTimer);owner.bodyWriteTimer=null;owner.putBodies=put;await owner.flushQueuedBodyWrites();
          equal(owner.queuedBodyWrites.size,0,'Successful retry retires record');
          const reader=await fresh('queued-body-retry');try{equal(await reader.getBody('retry.md',7),body,'Retry persisted via real transaction');}finally{reader.close();}
          return true;
        }finally{owner.close();}
      })()`),true);
    });
    await t.test("exact parser-input tokens bind the actual queued and durable body records", async () => {
      assert.equal(await browser.evaluate(`(async()=>{
        const owner=await fresh('body-input-token'),body=sourceModules.parseBodyMetadata('Status:: complete\\nhttps://example.com/token');
        let current=true;const stamp={inputToken:'opaque-current-input',isCurrent:()=>current};
        try{
          owner.queueBodyWrite('token.md',8,body,stamp);window.clearTimeout(owner.bodyWriteTimer);owner.bodyWriteTimer=null;
          equal(await owner.getBody('token.md',8,stamp.inputToken),body,'Exact queued complete input');
          equal(await owner.getBody('token.md',8,'different-input'),null,'Equal stats do not authorize another token');
          equal((await owner.getBodies([{path:'token.md',mtime:8,inputToken:'different-input'}])).size,0,'Batch uses exact token');
          await owner.flushQueuedBodyWrites();equal(owner.queuedBodyWrites.size,0,'Successful write leaves no extra body mirror');
          equal(await owner.getBody('token.md',8,stamp.inputToken),body,'Token survives ordinary structured-clone persistence');
          const replacement=sourceModules.parseBodyMetadata('Status:: unversioned');
          await owner.putBody('token.md',8,replacement);
          equal(await owner.getBody('token.md',8,stamp.inputToken),null,'A prior sidecar certificate cannot bless replacement bytes');
          equal(await owner.getBody('token.md',8),replacement,'Clean restart retains ordinary optional cache compatibility');
          owner.queueBodyWrite('retired.md',8,body,stamp);window.clearTimeout(owner.bodyWriteTimer);owner.bodyWriteTimer=null;
          current=false;equal(await owner.getBody('retired.md',8,stamp.inputToken),null,'Retired queued input is unreadable');
          await owner.flushQueuedBodyWrites();equal(owner.queuedBodyWrites.size,0,'Stale queued input drains without retry');
          equal(await owner.getBody('retired.md',8),null,'Stale queued input never reaches durable storage');
          return true;
        }finally{owner.close();}
      })()`),true);
    });
    await t.test("held body-cache opening rechecks parser-input validity before its write transaction", async () => {
      assert.equal(await browser.evaluate(`(async()=>{
        const owner=await fresh('body-token-held-write'),body=sourceModules.parseBodyMetadata('Status:: retired'),open=owner.open.bind(owner);
        let current=true,release,entered;const hold=new Promise(resolve=>release=resolve),reached=new Promise(resolve=>entered=resolve);
        owner.open=async()=>{entered();await hold;return open();};
        try{
          const writing=owner.putBody('held-token.md',8,body,{inputToken:'held-input',isCurrent:()=>current});
          await reached;current=false;release();await writing;owner.open=open;
          equal(await owner.getBody('held-token.md',8),null,'Retired bytes do not enter the transaction');return true;
        }finally{release();owner.close();}
      })()`),true);
    });
    await t.test("optional parser queues bound record count during storage failure without changing neutral facts", async () => {
      assert.equal(await browser.evaluate(`(async()=>{
        const owner=await fresh('body-record-budget'),body=sourceModules.parseBodyMetadata('Field:: bounded');
        owner.putBodies=async()=>false;
        try{
          for(let n=0;n<1201;n++)owner.queueBodyWrite('budget-'+n+'.md',1,body);
          window.clearTimeout(owner.bodyWriteTimer);owner.bodyWriteTimer=null;
          equal(owner.queuedBodyWrites.size,1200,'Finite desktop record budget');
          equal(await owner.getBody('budget-0.md',1),null,'Oldest optional body evicted');
          equal(await owner.getBody('budget-1200.md',1),body,'Latest optional body remains readable');
          await owner.flushQueuedBodyWrites();equal(owner.queuedBodyWrites.size,1200,'Failed storage cannot grow or discard the current bounded queue');
          equal((await owner.sources.inspect('budget-1200.md')).head,null,'Eviction and failure grant no neutral source authority');
          owner.close();equal(owner.queuedBodyBytes,0,'Close releases estimated retained bytes');return true;
        }finally{owner.close();}
      })()`),true);
    });
    await t.test("optional parser queues bound estimated payload bytes and reject an oversize body", async () => {
      assert.equal(await browser.evaluate(`(async()=>{
        const owner=await fresh('body-byte-budget'),body=sourceModules.parseBodyMetadata('Field:: '+'x'.repeat(1024*1024));
        owner.putBodies=async()=>false;
        try{
          for(let n=0;n<20;n++)owner.queueBodyWrite('bytes-'+n+'.md',1,body);
          window.clearTimeout(owner.bodyWriteTimer);owner.bodyWriteTimer=null;
          ok(owner.queuedBodyWrites.size<20,'Payload bytes evict before count budget');
          ok(owner.queuedBodyBytes<=32*1024*1024,'Desktop estimated parser DTO budget');
          equal(await owner.getBody('bytes-19.md',1),body,'Newest bounded input remains readable');
          const oversize=sourceModules.parseBodyMetadata('Field:: '+'x'.repeat(9*1024*1024));
          owner.queueBodyWrite('bytes-19.md',1,oversize);
          equal(await owner.getBody('bytes-19.md',1),null,'Oversize replacement retires the old optional entry');
          ok(owner.queuedBodyBytes<=32*1024*1024,'Oversize input never inflates retained budget');
          await owner.flushQueuedBodyWrites();ok(owner.queuedBodyBytes<=32*1024*1024,'Storage failure retains a finite byte budget');return true;
        }finally{owner.close();}
      })()`),true);
    });
    await t.test("queued reads reject mismatched paths, mtimes, parser versions, malformed bodies and closed owners", async () => {
      assert.equal(await browser.evaluate(`(async()=>{
        const owner=await fresh('queued-body-validity'),body=sourceModules.parseBodyMetadata('Field:: [[Valid]]');
        try{
          owner.queueBodyWrite('valid.md',8,body);window.clearTimeout(owner.bodyWriteTimer);owner.bodyWriteTimer=null;
          equal(await owner.getBody('valid.md',9),null,'Different native mtime misses');equal((await owner.getBodies([{path:'valid.md',mtime:9}])).size,0,'Batch mtime misses');
          equal(await owner.getBody('other.md',8),null,'Different path misses');
          const record=owner.queuedBodyWrites.get('valid.md');record.parserVersion=3;
          equal(await owner.getBody('valid.md',8),null,'Historical queued parser version misses');equal((await owner.getBodies([{path:'valid.md',mtime:8}])).size,0,'Batch parser guard matches');
          record.parserVersion=sourceModules.SOURCE_BODY_PARSER_VERSION;record.body={...body,urls:[{url:'https://example.com/invalid',aliases:[42]}]};
          equal(await owner.getBody('valid.md',8),null,'Malformed current queued URL aliases rejected');equal((await owner.getBodies([{path:'valid.md',mtime:8}])).size,0,'Batch body validator matches');
          record.body=body;record.path='wrong.md';equal(await owner.getBody('valid.md',8),null,'Queued payload path must match map key');record.path='valid.md';
          owner.close();equal(owner.queuedBodyWrites.size,0,'Close releases queued payloads');
          const open=indexedDB.open;let opens=0;indexedDB.open=function(...args){opens++;return open.apply(this,args);};
          try{equal(await owner.getBody('valid.md',8),null,'Closed point read rejected');equal((await owner.getBodies([{path:'valid.md',mtime:8}])).size,0,'Closed batch rejected');equal(opens,0,'Closed reads never reopen');}finally{indexedDB.open=open;}
          return true;
        }finally{owner.close();}
      })()`),true);
    });
    await t.test("close during a mixed batch storage wait rejects previously collected queued hits", async () => {
      assert.equal(await browser.evaluate(`(async()=>{
        const owner=await fresh('queued-body-close-read'),body=sourceModules.parseBodyMetadata('Field:: [[Closed]]'),open=owner.open.bind(owner);
        let release,entered;const hold=new Promise(resolve=>release=resolve),reached=new Promise(resolve=>entered=resolve);
        owner.open=async()=>{entered();await hold;return open();};
        try{
          owner.queueBodyWrite('closed.md',9,body);window.clearTimeout(owner.bodyWriteTimer);owner.bodyWriteTimer=null;
          const reading=owner.getBodies([{path:'closed.md',mtime:9},{path:'missing.md',mtime:9}]);await reached;
          owner.close();release();equal((await reading).size,0,'No queued partial result crosses close');
          equal(owner.bodyWriteTimer,null,'Closed read leaves no write timer');equal(owner.queuedBodyWrites.size,0,'Closed read retains no payload');return true;
        }finally{release();owner.close();}
      })()`),true);
    });
  } finally { await browser.cleanup(); }
});

/** Maintenance uses production cursors and database deletion; no IndexedDB data model is mocked. */
test("cache maintenance streams logical size, cancels cleanly and permanently closes after vault-local purge", { timeout: 60000 }, async t => {
  const browser = await chromiumHarness(bundle);
  try {
    await browser.evaluate(initialize);
    await t.test("size scans stores sequentially without getAll or origin-wide estimates", async () => {
      assert.equal(await browser.evaluate(`(async()=>{
        const owner=await fresh('maintenance-size'),db=await owner.open();
        const before=await owner.estimateStoredBytes();ok(before!==null,'Initial logical estimate available');
        const cycle={label:'known payload '.repeat(1000)};cycle.self=cycle;
        await edit(db,['meta','bodies'],tx=>{
          tx.objectStore('meta').put({key:'measurement',value:cycle,map:new Map([['map-key',42]]),set:new Set(['set-item']),binary:new Uint8Array(4096),blob:new Blob(['blob payload'])});
          tx.objectStore('bodies').put({path:'size-only.md',payload:'body '.repeat(1000)});
        });
        const getAll=IDBObjectStore.prototype.getAll,openCursor=IDBObjectStore.prototype.openCursor;
        const transaction=IDBDatabase.prototype.transaction;let active=0,maxActive=0,cursors=0,wrongMode=false;
        IDBObjectStore.prototype.getAll=function(){throw new Error('getAll is forbidden for size maintenance');};
        IDBObjectStore.prototype.openCursor=function(...args){cursors++;return openCursor.apply(this,args);};
        IDBDatabase.prototype.transaction=function(...args){
          const tx=transaction.apply(this,args);active++;maxActive=Math.max(active,maxActive);
          if(args[1]!=='readonly')wrongMode=true;
          tx.addEventListener('complete',()=>active--);tx.addEventListener('abort',()=>active--);return tx;
        };
        const storage=navigator.storage.estimate;navigator.storage.estimate=()=>{throw new Error('Origin size must not be read');};
        try{
          const after=await owner.estimateStoredBytes();ok(after>=before+cycle.label.length*2+10000+4096,'Strings and binary increase logical size');
          equal(cursors,db.objectStoreNames.length,'Exactly one cursor per store');equal(maxActive,1,'Only one store scan active');equal(wrongMode,false,'All scans readonly');
          equal(await owner.estimateStoredBytes(),after,'Cycle-safe estimate is repeatable');return true;
        }finally{IDBObjectStore.prototype.getAll=getAll;IDBObjectStore.prototype.openCursor=openCursor;IDBDatabase.prototype.transaction=transaction;navigator.storage.estimate=storage;owner.close();}
      })()`),true);
    });
    await t.test("close cancels an active cursor and oversized depth returns unavailable", async () => {
      assert.equal(await browser.evaluate(`(async()=>{
        const owner=await fresh('maintenance-cancel'),cursor=IDBObjectStore.prototype.openCursor;
        IDBObjectStore.prototype.openCursor=function(...args){const request=cursor.apply(this,args);request.addEventListener('success',()=>owner.close(),{once:true});return request;};
        try{equal(await owner.estimateStoredBytes(),null,'Closed scan has no partial subtotal');equal(owner.maintenanceReads.size,0,'No retained transactions');}
        finally{IDBObjectStore.prototype.openCursor=cursor;owner.close();}
        const deep=await fresh('maintenance-depth'),db=await deep.open();let value={leaf:'value'};for(let i=0;i<300;i++)value={child:value};
        await edit(db,['meta'],tx=>tx.objectStore('meta').put({key:'deep',value}));
        try{equal(await deep.estimateStoredBytes(),null,'Unbounded record is not reported as a complete estimate');equal(deep.maintenanceReads.size,0,'Failed scan releases ownership');return true;}finally{deep.close();}
      })()`),true);
    });
    await t.test("purge deletes only the selected database, discards queued writes and never reopens", async () => {
      assert.equal(await browser.evaluate(`(async()=>{
        const owner=await fresh('maintenance-purge'),other=await fresh('maintenance-unrelated');
        const body=sourceModules.parseBodyMetadata('A real body [URL](https://example.com/cache-maintenance)');
        ok(await owner.putBody('cached.md',1,body),'Populate selected database');ok(await other.putBody('retained.md',1,body),'Populate unrelated database');
        owner.queueBodyWrite('queued.md',2,body);ok(owner.bodyWriteTimer!==null,'Queued timer exists');
        const first=owner.purgeAndClose();equal(owner.purgeAndClose()===first,true,'Concurrent purge shares one request');
        ok(await first,'Actual deleteDatabase success');equal(owner.closed,true,'Owner permanently closed');equal(owner.sources.closed,true,'Repository lifetime closed');
        equal(owner.bodyWriteTimer,null,'Queued timer cancelled');equal(owner.queuedBodyWrites.size,0,'Queued bodies discarded');
        const names=(await indexedDB.databases()).map(db=>db.name);ok(!names.includes(databaseName('maintenance-purge')),'Selected database removed');ok(names.includes(databaseName('maintenance-unrelated')),'Unrelated database retained');
        const open=indexedDB.open;let opens=0;indexedDB.open=function(...args){opens++;return open.apply(this,args);};
        try{
          equal(await owner.getBody('cached.md',1),null,'No old body remains available');equal(await owner.putBody('later.md',3,body),false,'Writes stay closed');
          equal(await owner.estimateStoredBytes(),null,'Estimates stay closed');owner.queueBodyWrite('later.md',3,body);
          equal(await owner.releaseContributorLease({key:'ended-reader',impactSlot:0}),false,'Retired cleanup cannot reopen after purge');
          equal(opens,0,'Neither regular operations nor retired cleanup reopen');ok(await other.getBody('retained.md',1),'Unrelated payload unchanged');return true;
        }finally{indexedDB.open=open;owner.close();other.close();}
      })()`),true);
    });
    await t.test("blocked and storage failures report false but retain the closed lifetime", async () => {
      assert.equal(await browser.evaluate(`(async()=>{
        const blocked=await fresh('maintenance-blocked'),hold=await rawOpen(databaseName('maintenance-blocked'),10);
        try{equal(await blocked.purgeAndClose(),false,'External handle produces blocked failure');equal(blocked.closed,true,'Failed purge cannot resume writes');equal(await blocked.open(),null,'Failed purge cannot reopen');}
        finally{hold.close();blocked.close();}
        const failed=await fresh('maintenance-error'),remove=indexedDB.deleteDatabase;indexedDB.deleteDatabase=()=>{throw new Error('Injected storage failure');};
        try{equal(await failed.purgeAndClose(),false,'Delete exception reported');equal(failed.closed,true,'Error retains closed lifetime');equal(await failed.open(),null,'Error cannot reopen');return true;}
        finally{indexedDB.deleteDatabase=remove;failed.close();}
      })()`),true);
    });
    await t.test("purge fences an opening connection before it can adopt or recreate storage", async () => {
      assert.equal(await browser.evaluate(`(async()=>{
        const owner=new sourceModules.KplexIndexedDbCache('maintenance-opening'),opening=owner.bodyStoreReady();
        ok(await owner.purgeAndClose(),'Deletion also succeeds before a pending open settles');equal(await opening,false,'Late opening work cannot become usable');
        equal(await owner.open(),null,'No same-session reopen');ok(!(await indexedDB.databases()).some(db=>db.name===databaseName('maintenance-opening')),'Pending open cannot recreate purged database');return true;
      })()`),true);
    });
  } finally { await browser.cleanup(); }
});

// One profile is intentionally retained through a NEW Chromium process, then removed in finally.
test("real Chromium: version migration, atomic source heads, repair, failure recovery and process restart", { timeout: 180000 }, async t => {
  const browser = await chromiumHarness(bundle);
  try {
    await browser.evaluate(initialize);
    await t.test("cold v10 plus v4 upgrade preserve legacy stores, body-v2 and schema-1/2/3 pointers", async () => {
      assert.equal(await browser.evaluate(`(async()=>{
        cache=await fresh('cold'); const db=await cache.open(); equal(db.version,10,'Cold database version');
        for(const name of ['meta','pages','evidence','bodies','urlOwners','snapshotChunks','sourceHeads','sourceChunks','sourcePostings','sourceDependencies','sourceImpacts','sourceLocalDependencies','sourceLocalDependencyOwners','sourceLocalDependencyKeys','sourceLocalDependencyRepairs'])ok(db.objectStoreNames.contains(name),'Missing store '+name);
        const tx=db.transaction(['sourceChunks','sourcePostings','meta'],'readonly');
        ok(tx.objectStore('sourceChunks').indexNames.contains('sourceFamilyRevision'),'Family index');
        ok(tx.objectStore('sourcePostings').indexNames.contains('lookup'),'Posting lookup index');
        ok(tx.objectStore('meta').indexNames.contains('sourceLease'),'Persistent lease index');cache.close();
        const legacy=await rawOpen(databaseName('upgrade'),4,db=>{
          db.createObjectStore('meta',{keyPath:'key'}); db.createObjectStore('bodies',{keyPath:'path'});
          for(const [name,keyPath] of [['pages',['generation','path']],['evidence',['generation','key']],['snapshotChunks',['generation','kind','index']]])db.createObjectStore(name,{keyPath}).createIndex('generation','generation');
        });
        const body=sourceModules.parseBodyMetadata('Field:: [[Alpha]]');
        await edit(legacy,['bodies','meta','pages','evidence','snapshotChunks'],tx=>{
          tx.objectStore('bodies').put({path:'legacy.md',mtime:1,parserVersion:2,body});
          tx.objectStore('meta').put({key:'active',schema:3,generation:'legacy',createdAt:1,vaultSignature:'v',settingsSignature:'s',discoveredFields:[],pageChunkCount:1,evidenceChunkCount:0});
          tx.objectStore('meta').put({key:'checkpoint',schema:2,generation:'checkpoint',createdAt:1,vaultSignature:'v',settingsSignature:'s',discoveredFields:[],completedMarkdownPaths:[]});
          tx.objectStore('pages').put({generation:'legacy',path:'retained',value:{retained:true}});
          tx.objectStore('evidence').put({generation:'legacy',key:'retained',value:{retained:true}});
          tx.objectStore('snapshotChunks').put({generation:'legacy',kind:'pages',index:0,values:[]});
        });legacy.close();
        cache=await fresh('upgrade'); equal(await cache.getBody('legacy.md',1),null,'Lossy body-v2 ignored after grammar upgrade');
        await edit(await cache.open(),['bodies'],tx=>tx.objectStore('bodies').put({path:'bad-alias.md',mtime:1,parserVersion:sourceModules.SOURCE_BODY_PARSER_VERSION,body:{...body,urls:[{url:'https://example.com',aliases:[42]}]}}));
        equal(await cache.getBody('bad-alias.md',1),null,'Malformed current-version aliases are rejected');
        equal((await cache.getBodies([{path:'bad-alias.md',mtime:1}])).size,0,'Batch body reads use the same strict alias guard');
        const upgraded=await cache.open();const stored=await requestValue(upgraded.transaction('bodies').objectStore('bodies').get('legacy.md'));
        ok(!Object.hasOwn(stored,'size'),'Legacy record must not invent size');
        equal((await cache.readSnapshotMeta()).schema,3,'Schema 3 pointer preserved');equal((await cache.readSnapshotMeta('checkpoint')).schema,2,'Schema 2 pointer preserved');
        for(const name of ['pages','evidence','snapshotChunks'])equal(await requestValue(upgraded.transaction(name).objectStore(name).count()),1,'Legacy store retained');
        await edit(upgraded,['meta'],tx=>tx.objectStore('meta').put({key:'active',schema:1,generation:'one',createdAt:1,vaultSignature:'v',settingsSignature:'s',discoveredFields:[]}));
        equal((await cache.readSnapshotMeta()).schema,1,'Schema 1 remains readable');cache.close();cache=await fresh('durability');return true;
      })()`), true);
    });

    await t.test("rename bursts settle queued retained tombstones before reusing unchanged bodies", async () => {
      assert.equal(await browser.evaluate(`(async()=>{
        const isolated=await fresh('retained-rename-burst'),r=isolated.sources;
        try {
          equal((await r.replace(await make(r,'Left'))).outcome,'activated','First owner');
          equal((await r.replace(await make(r,'Empty',{kind:'missing'},''))).outcome,'activated','Empty owner');
          let release;const held=new Promise(resolve=>release=resolve);
          const first=r.tombstone('Left',()=>true,true,held);
          equal((await r.tombstone('Empty',()=>true,true)).reason,'backpressure','Second retirement queues');
          equal(await r.readBody('Empty',()=>true),null,'Ordinary read remains masked');
          const retained=r.readBody('Empty',physical=>physical.identity==='Empty-incarnation',()=>true,true,true);
          release();await first;const body=await retained;
          ok(body,'Queued empty body restored from retained families');
          equal(body.inlineFields,{},'Empty body remains empty');
          equal((await r.inspect('Empty')).reason,'tombstone','Old semantic binding stays retired');
          return true;
        } finally { isolated.close(); }
      })()`),true);
    });

    await t.test("staging is invisible; activated A/B survive process interruption with only C incomplete", async () => {
      const before = await browser.evaluate(`(async()=>{
        const r=cache.sources;
        equal((await r.replace(await make(r,'A'))).outcome,'activated','A activation');
        equal((await r.replace(await make(r,'B'))).outcome,'activated','B activation');
        const a=await r.inspect('A'),b=await r.inspect('B');ok(b.sequence>a.sequence,'Global monotonic sequence');
        const pending=await make(r,'C'); let signal;const staged=new Promise(resolve=>signal=resolve);
        pending.families.metadata=async emit=>{for(let i=0;i<256;i++)if(!await emit({kind:'alias',value:'stage-'+i}))return false;signal();await new Promise(()=>{});return true;};
        window.interruptedWrite=r.replace(pending);await staged;
        equal((await r.inspect('C')).reason,'missing','No head for staged C');
        equal(await owners(r,'Alpha'),['A','B'],'Staged postings invisible');
        return [a.sequence,b.sequence];
      })()`);
      await browser.restart();
      await browser.evaluate(initialize);
      const after = await browser.evaluate(`(async()=>{
        cache=await fresh('durability');const r=cache.sources;const a=await r.inspect('A'),b=await r.inspect('B');
        equal(a.reason,'ready','A restored');equal(b.reason,'ready','B restored');equal((await r.inspect('C')).reason,'missing','Only C pending');
        ok(await r.readBody('A',()=>true),'Immutable body restored without parser');
        equal(await owners(r,'Alpha'),['A','B'],'Orphan staging remains invisible after new process');return [a.sequence,b.sequence];
      })()`);
      assert.deepEqual(after, before);
    });

    await t.test("family-local missing/corrupt chunks and postings repair without dropping other sources", async () => {
      assert.equal(await browser.evaluate(`(async()=>{
        const r=cache.sources,db=await cache.open();let a=await r.inspect('A');const b=await r.inspect('B');
        const key=['A',a.head.families.metadata.revision,'metadata',0];
        await edit(db,['sourceChunks'],tx=>tx.objectStore('sourceChunks').delete(key));
        const bad=await r.inspect('A');equal(bad.families.metadata,'missing-chunk','Only missing metadata rejected');equal(bad.families.values,'ready','Values retained');
        equal((await r.inspect('B')).sequence,b.sequence,'Unrelated B unchanged');ok(await r.readBody('A',()=>true),'Body independent of metadata corruption');
        let replacement=await make(r,'A',bad.expected);for(const family of ['values','body-urls','resolution'])replacement.families[family]=bad.head.families[family];
        equal((await r.replace(replacement)).outcome,'activated','Selective family repair');a=await r.inspect('A');equal(a.reason,'ready','Repair validated');
        equal(a.head.families.values.revision,bad.head.families.values.revision,'Valid family revision retained');
        const postingKey=['A',a.head.families.values.revision,'values',0];
        await edit(db,['sourcePostings'],tx=>tx.objectStore('sourcePostings').delete(postingKey));
        const missing=await r.inspect('A');equal(missing.families.values,'missing-posting','Missing posting rejected');equal((await r.inspect('B')).reason,'ready','B still valid');
        replacement=await make(r,'A',missing.expected);equal((await r.replace(replacement)).outcome,'activated','Posting repaired from canonical facts');
        a=await r.inspect('A');const corruptKey=['A',a.head.families.values.revision,'values',0];
        await edit(db,['sourceChunks'],async tx=>{const store=tx.objectStore('sourceChunks');const chunk=await requestValue(store.get(corruptKey));chunk.data+=' ';store.put(chunk);});
        equal((await r.inspect('A')).families.values,'invalid-chunk','Payload/digest corruption rejected');
        equal((await r.replace(await make(r,'A',(await r.inspect('A')).expected))).outcome,'activated','Corrupt chunk repaired');return true;
      })()`), true);
    });

    await t.test("posting range reads stay bounded across batch boundaries and isolate immutable families", async () => {
      assert.equal(await browser.evaluate(`(async()=>{
        const isolated=await fresh('posting-range-bounds'),r=isolated.sources;
        const get=IDBObjectStore.prototype.get,getAll=IDBObjectStore.prototype.getAll;let pointReads=0,ranges=[];
        try {
          const input=await make(r,'A');input.families.metadata=async emit=>{for(let i=0;i<600;i++)if(!await emit({kind:'host-literal',ordinal:i,rawTarget:'target-'+i}))return false;return true;};
          equal((await r.replace(input)).outcome,'activated','Multi-batch source');
          equal((await r.replace(await make(r,'B'))).outcome,'activated','Adjacent owner');
          const before=await r.inspect('A',[]);equal(before.head.families.metadata.postings,601,'Family plus all literal postings');
          IDBObjectStore.prototype.get=function(...args){if(this.name==='sourcePostings')pointReads++;return get.apply(this,args)};
          IDBObjectStore.prototype.getAll=function(range,count){if(this.name==='sourcePostings'){ok(range instanceof IDBKeyRange,'Explicit key range');ok(count>0&&count<=256,'Existing record bound');
            equal(range.lower.slice(0,3),['A',before.head.families.metadata.revision,'metadata'],'Exact lower family');equal(range.upper.slice(0,3),range.lower.slice(0,3),'Exact upper family');
            equal(range.upper[3]-range.lower[3]+1,count,'Contiguous capped interval');ranges.push([range.lower[3],range.upper[3],count]);}return getAll.call(this,range,count)};
          const seen=[];equal(await r.visit('A','metadata',records=>{seen.push(...records);return true;}),'ready','Every bounded batch validated');
          equal(seen.length,600,'All facts replayed');equal(pointReads,0,'No per-posting point requests');
          equal(ranges,[[0,255,256],[256,256,1],[257,512,256],[513,600,88]],'One request per existing posting batch including boundary tail');
          equal((await r.inspect('A',[])).head,before.head,'Validation keeps source head unchanged');return true;
        } finally {IDBObjectStore.prototype.get=get;IDBObjectStore.prototype.getAll=getAll;isolated.close();}
      })()`),true);
    });

    await t.test("posting range holes, boundary gaps and malformed replacement rows fail closed", async () => {
      assert.equal(await browser.evaluate(`(async()=>{
        const isolated=await fresh('posting-range-corruption'),r=isolated.sources,db=await isolated.open();
        try {
          for(const fault of ['first','middle','boundary','last','wrong-key','fractional-key']){
            const input=await make(r,fault);input.families.metadata=async emit=>{for(let i=0;i<300;i++)if(!await emit({kind:'host-literal',ordinal:i,rawTarget:'target-'+i}))return false;return true;};
            equal((await r.replace(input)).outcome,'activated','Seed '+fault);const selected=await r.inspect(fault,[]),revision=selected.head.families.metadata.revision;
            await edit(db,['sourcePostings'],async tx=>{const store=tx.objectStore('sourcePostings');
              const index={first:0,middle:128,boundary:256,last:300,'wrong-key':128,'fractional-key':128}[fault];
              const key=[fault,revision,'metadata',index],row=await requestValue(store.get(key));
              if(fault==='wrong-key')store.put({...row,key:'corrupt'});
              else if(fault==='fractional-key')store.put({...row,index:127.5});
              else {store.delete(key);store.put({...row,family:'resolution'});store.put({...row,sourceId:fault+'-other'});}
            });
            let consumed=0;const result=await r.readSelected(fault,()=> 'ready',async reader=>{await reader.visit('metadata',records=>{consumed+=records.length;return true;});return 'must not publish';});
            equal(result.outcome,'invalid-family','Corrupt range rejected '+fault);equal(result.reason,fault==='wrong-key'||fault==='fractional-key'?'invalid-posting':'missing-posting','Exact corruption reason '+fault);
            ok(!('value' in result),'No partial result escapes '+fault);
            equal(await requestValue(db.transaction('meta').objectStore('meta').index('sourceLease').count([fault,selected.head.sourceRevision])),0,'Failure releases leases '+fault);
            ok(consumed<=256,'At most earlier private chunks consumed');
          }return true;
        } finally {isolated.close();}
      })()`),true);
    });

    await t.test("posting range await preserves replacement, cleanup and cancellation fences", async () => {
      assert.equal(await browser.evaluate(`(async()=>{
        const first=await fresh('posting-range-race'),second=await fresh('posting-range-race'),r=first.sources,other=second.sources,db=await second.open();
        try {
          for(const mode of ['replacement','cancelled']){
            equal((await r.replace(await make(r,mode))).outcome,'activated','Seed '+mode);const selected=await r.inspect(mode,[]);
            const leases=()=>requestValue(db.transaction('meta').objectStore('meta').index('sourceLease').count([mode,selected.head.sourceRevision]));
            const transaction=r.transaction.bind(r);let signal,release,paused=false,valid=true;
            const reached=new Promise(resolve=>signal=resolve),gate=new Promise(resolve=>release=resolve);
            r.transaction=async(...args)=>{const value=await transaction(...args);if(!paused&&args[1].includes('sourcePostings')&&args[2]==='readonly'){paused=true;signal();await gate;}return value;};
            const task=r.readSelected(mode,()=> 'ready',async reader=>{await reader.visit('values',()=>true);return 'must not escape';},()=>valid);
            await reached;ok(await leases()>0,'Await retains exact revision lease');
            if(mode==='replacement'){
              equal((await other.replace(await make(other,mode,selected.expected,'Field:: [[Replacement]]'))).outcome,'activated','Concurrent head replacement');
              equal(await other.cleanupRevision(mode,selected.head.sourceRevision),false,'Retired family remains pinned during range await');
            }else valid=false;
            release();const result=await task;r.transaction=transaction;
            equal(result.outcome,mode==='replacement'?'stale':'cancelled','Await fence '+mode);ok(!('value' in result),'No stale/cancelled result');equal(await leases(),0,'Terminal lease cleanup');
            equal(r.decodeBytes,0,'Decode reservation released');
            if(mode==='replacement')ok(await other.cleanupRevision(mode,selected.head.sourceRevision),'Retired revision collectible after read exits');
          }return true;
        } finally {first.close();second.close();}
      })()`),true);
    });

    await t.test("cross-connection CAS rejects an obsolete writer; pinned and head-selected revisions cannot be cleaned", async () => {
      assert.equal(await browser.evaluate(`(async()=>{
        const r=cache.sources;const initial=await r.inspect('A');
        const other=await fresh('durability');let signal,release;
        const paused=new Promise(resolve=>signal=resolve),gate=new Promise(resolve=>release=resolve);
        const old=await make(r,'A',initial.expected,'Field:: [[Old]]');
        old.families.metadata=async emit=>{signal();await gate;return emit({kind:'alias',value:'old'});};
        const obsolete=r.replace(old);await paused;
        const newer=await make(other.sources,'A',initial.expected,'Field:: [[New]]');equal((await other.sources.replace(newer)).outcome,'activated','Independent newer writer');
        release();equal((await obsolete).outcome,'superseded','Expected-head CAS rejects old writer');other.close();
        equal(await owners(r,'Old'),[],'Obsolete postings hidden');equal(await owners(r,'New'),['A'],'Only new revision contributes');
        const selected=await r.inspect('A');const revision=selected.head.families.values.revision;
        equal(await r.cleanupRevision('A',revision),false,'Head-referenced revision protected');
        let readerReady,readerRelease;const ready=new Promise(resolve=>readerReady=resolve),wait=new Promise(resolve=>readerRelease=resolve);
        const reader=r.visit('A','values',async()=>{readerReady();await wait;return true;});await ready;
        equal((await r.replace(await make(r,'A',selected.expected,'Field:: [[Newest]]'))).outcome,'activated','Replace while reader owns old pin');
        equal(await r.cleanupRevision('A',revision),false,'Pinned old revision protected');readerRelease();equal(await reader,'ready','Reader snapshot remains complete');
        equal(await r.cleanupRevision('A',revision),true,'Retired revision reclaimed after release');
        const db=await cache.open();const head=await requestValue(db.transaction('sourceHeads').objectStore('sourceHeads').get('A'));
        await edit(db,['sourceHeads'],tx=>tx.objectStore('sourceHeads').put({...head,formatVersion:999}));
        equal((await r.inspect('A')).reason,'format-version','Unknown format invalidates only A');
        equal(await r.cleanupRevision('A',initial.head.sourceRevision),false,'Uncertain catalog never authorizes deletion');
        equal((await r.inspect('B')).reason,'ready','Format corruption does not delete B');
        await edit(db,['sourceHeads'],tx=>tx.objectStore('sourceHeads').put(head));return true;
      })()`), true);
    });

    await t.test("faults before/between chunks and during head activation leave old disk head readable, unsaved memory reusable and retry bounded", async () => {
      assert.equal(await browser.evaluate(`(async()=>{
        for(const phase of ['before-chunks','between-chunks','before-head','abort-head']){
          const vault='fault-'+phase;const writer=await fresh(vault);const r=writer.sources;
          equal((await r.replace(await make(r,'source'))).outcome,'activated','Baseline activated');const previous=await r.inspect('source');
          const add=IDBObjectStore.prototype.add,put=IDBObjectStore.prototype.put;let chunks=0,fired=false;
          IDBObjectStore.prototype.add=function(value,...args){
            if(this.name==='sourceChunks'&&!fired&&((phase==='before-chunks')||(phase==='between-chunks'&&++chunks===2))){fired=true;throw new DOMException('Injected quota','QuotaExceededError');}
            return add.call(this,value,...args);
          };
          IDBObjectStore.prototype.put=function(value,...args){
            if(this.name==='sourceHeads'&&!fired&&(phase==='before-head'||phase==='abort-head')){
              fired=true;if(phase==='before-head')throw new DOMException('Injected quota','QuotaExceededError');
              const request=put.call(this,value,...args);this.transaction.abort();return request;
            }
            return put.call(this,value,...args);
          };
          let result;
          try {result=await r.replace(await make(r,'source',previous.expected,'Field:: [[Changed]]', {Long:'[[Changed]] '+ 'x'.repeat(600000)}));}
          finally {IDBObjectStore.prototype.add=add;IDBObjectStore.prototype.put=put;}
          ok(fired,'Fault reached '+phase);equal(result.outcome,'unsaved','Storage failure keeps validated memory');equal(result.sequence,null,'No false durable sequence');ok(result.live,'Live caller may continue');
          const inspector=await fresh(vault);equal((await inspector.sources.inspect('source')).sequence,previous.sequence,'Old activated disk head readable');inspector.close();
          ok(await r.readBody('source',()=>true),'Memory uses identical immutable body contract');
          ok(r.getDiagnostics().unsaved>0,'Unsaved progress exposed');
          // Wait through the production connection-owner backoff; the explicit stop coalesces retries.
          await new Promise(resolve=>setTimeout(resolve,1100));ok(await r.flush(),'Recovered retry durably saves facts');
          ok((await r.inspect('source')).sequence>previous.sequence,'Recovery advances sequence');writer.close();
        }return true;
      })()`), true);
    });

    await t.test("evicted unsaved facts mask an older durable head until selective reacquisition", async () => {
      assert.equal(await browser.evaluate(`(async()=>{
        const vault='memory-eviction';const writer=await fresh(vault);const r=writer.sources;
        equal((await r.replace(await make(r,'A',{kind:'missing'},'Field:: [[Old]]'))).outcome,'activated','Old A activation');
        const old=await r.inspect('A');const originalOpen=r.storage.open;
        r.storage.open=async()=>null;
        const large=target=>({Long:'[['+target+']] '+ 'x'.repeat(3000000)});
        equal((await r.replace(await make(r,'A',old.expected,'',large('Changed')))).outcome,'unsaved','Changed A held unsaved');
        equal((await r.replace(await make(r,'B',{kind:'missing'},'',large('Beta')))).outcome,'unsaved','B held unsaved');
        equal((await r.replace(await make(r,'C',{kind:'missing'},'',large('Gamma')))).outcome,'unsaved','C evicts oldest payload');
        const masked=await r.inspect('A');equal(masked.reason,'unsaved','Evicted A masks old disk head');equal(masked.head,null,'No stale head exposed');
        equal((await r.validateSelections([{head:old.head,sequence:old.sequence,saved:old.saved}],()=>true)).reason,'unsaved','Evicted unsaved mask also rejects an older selected-head certificate');
        equal(await r.readBody('A',()=>true),null,'No stale body replay after eviction');
        r.storage.open=originalOpen;
        const leaked=[];equal(await r.querySources('literal','Old',ids=>{leaked.push(...ids);return true;}),false,'Evicted unsaved lookup is incomplete');
        equal(leaked,[],'No old durable owner leak');
        equal((await r.readSelected('A',()=> 'ready',async()=>true)).outcome,'pending-acquisition','New multi-family path respects eviction');
        const expected=await r.catalogExpectation('A');
        equal((await r.replace(await make(r,'A',expected,'',large('Changed')))).outcome,'activated','A selectively reacquired');
        const restored=await r.inspect('A');ok(restored.sequence>old.sequence,'Reacquisition advances durable sequence');
        equal(await owners(r,'Old'),[],'Old posting remains inactive');equal(await owners(r,'Changed'),['A'],'Current posting restored');
        writer.close();return true;
      })()`), true);
    });

    /** Legacy primary compatibility authenticates the actual leased URL family even on head-only reads. */
    await t.test("parser2 primary compatibility validates chunks/postings, releases leases and preserves exact heads", async () => {
      assert.equal(await browser.evaluate(`(async()=>{
        const f=await fresh('parser2-urlfree'),r=f.sources,db=await f.open();
        try {
          await r.replace(await make(r,'urlfree'));await r.replace(await make(r,'urlbearing',{kind:'missing'},'[First](https://help.obsidian.md)'));
          const current=(await r.inspect('urlfree')).head,legacy={...current,bodyParserVersion:2};
          const bearing={...(await r.inspect('urlbearing')).head,bodyParserVersion:2};
          await edit(db,['sourceHeads'],tx=>{tx.objectStore('sourceHeads').put(legacy);tx.objectStore('sourceHeads').put(bearing);});
          equal((await r.inspect('urlfree',[])).head,legacy,'Head-only reads authenticate but preserve parser2 bytes');
          equal((await r.inspect('urlbearing',[])).head,bearing,'URL-bearing primary authority preserves exact legacy bytes');
          ok(await r.readBody('urlbearing',()=>true),'Primary body remains available without claiming current aliases');
          equal(await r.readBody('urlbearing',()=>true,()=>true,false,false,undefined,true),null,'Current alias grammar requires actual canonical repair');
          const bearingKey=['urlbearing',bearing.families['body-urls'].revision,'body-urls',0];
          const bearingChunk=await requestValue(db.transaction('sourceChunks').objectStore('sourceChunks').get(bearingKey));
          await edit(db,['sourceChunks'],tx=>tx.objectStore('sourceChunks').delete(bearingKey));
          equal((await r.inspect('urlbearing',[])).reason,'missing-chunk','URL-bearing primary compatibility fails closed on actual missing facts');
          await edit(db,['sourceChunks'],tx=>tx.objectStore('sourceChunks').put({...bearingChunk,data:'[{}]'}));
          equal((await r.inspect('urlbearing',[])).reason,'invalid-chunk','URL-bearing compatibility authenticates the primary records');
          await edit(db,['sourceChunks'],tx=>tx.objectStore('sourceChunks').put(bearingChunk));
          equal(await r.readBody('urlfree',physical=>physical.mtime===999),null,'Physical match is still mandatory');
          const stamp=(await r.inspect('urlfree')).head;
          equal((await r.inspect('urlfree',[],()=>false)).reason,'cancelled','Cancelled compatibility read cannot return authority');
          const originalYield=r.runtime.yield;let live=true;
          try {
            r.runtime.yield=async()=>{live=false;};
            equal((await r.inspect('urlfree',[],()=>live)).reason,'cancelled','Cancellation during authenticated family yield cannot publish authority');
          }finally{r.runtime.yield=originalYield;}
          equal((await requestValue(db.transaction('meta').objectStore('meta').getAll())).filter(row=>row.key.startsWith('source-lease:')).length,0,'Cancelled family authentication releases leases');
          const urlRevision=legacy.families['body-urls'].revision,key=['urlfree',urlRevision,'body-urls',0];
          const chunk=await requestValue(db.transaction('sourceChunks').objectStore('sourceChunks').get(key));
          const posting=await requestValue(db.transaction('sourcePostings').objectStore('sourcePostings').get(key));
          for(const fault of ['missing-chunk','invalid-chunk','missing-posting','invalid-posting']){
            await edit(db,['sourceChunks','sourcePostings'],tx=>{
              tx.objectStore('sourceChunks').put(chunk);tx.objectStore('sourcePostings').put(posting);
              if(fault==='missing-chunk')tx.objectStore('sourceChunks').delete(key);
              if(fault==='invalid-chunk')tx.objectStore('sourceChunks').put({...chunk,data:'[{}]'});
              if(fault==='missing-posting')tx.objectStore('sourcePostings').delete(key);
              if(fault==='invalid-posting')tx.objectStore('sourcePostings').put({...posting,key:'wrong'});
            });
            equal((await r.inspect('urlfree',[])).reason,fault,'Head-only candidate validates actual '+fault);
            const rows=await requestValue(db.transaction('meta').objectStore('meta').getAll());
            equal(rows.filter(row=>row.key.startsWith('source-lease:')).length,0,'Terminal failure releases exact reader leases');
          }
          await edit(db,['sourceChunks','sourcePostings'],tx=>{tx.objectStore('sourceChunks').put(chunk);tx.objectStore('sourcePostings').put(posting);});
          equal((await r.inspect('urlfree')).head,legacy,'Healthy immutable head still exact after validation failures');
          await edit(db,['sourceHeads'],tx=>tx.objectStore('sourceHeads').put({...legacy,sourceRevision:'new-source-revision',sequence:legacy.sequence+1}));
          equal(await r.selectionReason({head:stamp,sequence:stamp.sequence,saved:true}),'superseded','Old selection cannot survive a newer source tuple');
          return true;
        }finally{f.close();}
      })()`),true);
    });

    await t.test("record/byte bounds, explicit empty source, source cancellation and unload", async () => {
      assert.equal(await browser.evaluate(`(async()=>{
        const r=cache.sources;const input=await make(r,'bounded',{kind:'missing'},'', {Long:'[[Alpha]] '+'x'.repeat(700000)});
        equal((await r.replace(input)).outcome,'activated','Large payload activation');const head=(await r.inspect('bounded')).head;
        const db=await cache.open();const chunks=await requestValue(db.transaction('sourceChunks').objectStore('sourceChunks').index('sourceRevision').getAll(['bounded',head.sourceRevision]));
        ok(chunks.length>4,'Large shared payload is chunked');for(const chunk of chunks){ok(chunk.records<=256,'Record cap');ok(chunk.bytes<=256*1024,'Ordinary payload chunk byte cap');}
        ok(r.getDiagnostics().peakDecodeBytes<=sourceModules.SOURCE_DECODE_BUDGET_BYTES,'Simultaneous decode budget');
        const empty=await make(r,'empty',{kind:'missing'},'');empty.families.metadata=async()=>true;
        equal((await r.replace(empty)).outcome,'activated','Empty is acquired');const emptyHead=(await r.inspect('empty')).head;
        for(const family of sourceModules.SOURCE_FAMILIES){equal(emptyHead.families[family].records,0,'Empty record count');equal(emptyHead.families[family].chunks,1,'Explicit final chunk');}
        let release,signal;const ready=new Promise(resolve=>signal=resolve),gate=new Promise(resolve=>release=resolve);
        const pending=await make(r,'cancelled');pending.families.metadata=async()=>{signal();await gate;return true;};
        const task=r.replace(pending);await ready;r.cancelSource('cancelled');release();equal((await task).outcome,'cancelled','Cancellation prevents activation');equal((await r.inspect('cancelled')).head,null,'No cancelled head');
        const closing=await fresh('close');const closed=closing.sources.replace(await make(closing.sources,'closed'));closing.close();equal((await closed).outcome,'cancelled','Unload fence');
        return true;
      })()`), true);
    });

    await t.test("SI4a selected-head replay is coherent across connections and releases pins on all terminal paths", async () => {
      assert.equal(await browser.evaluate(`(async()=>{
        const first=await fresh('si4a-selection'),second=await fresh('si4a-selection'),r=first.sources,other=second.sources;
        await r.replace(await make(r,'A'));await r.replace(await make(r,'B'));
        const a=await r.inspect('A'),b=await r.inspect('B');const db=await second.open();
        const leases=()=>requestValue(db.transaction('meta').objectStore('meta').index('sourceLease').count(['A',a.head.sourceRevision]));
        let held,seen=[];
        const changed=await r.readSelected('A',()=> 'ready',async selected=>{
          held=selected;ok(await leases()>0,'Reader lease exists during multi-family callback');
          equal(await selected.visit('values',records=>{seen.push(...records);return true;}),'ready','Initial family');
          equal((await other.replace(await make(other,'A',a.expected,'Field:: [[Replacement]]'))).outcome,'activated','Other connection changes head');
          equal(await other.cleanupRevision('A',a.head.sourceRevision),false,'Pinned retired family cannot be reclaimed');
          equal(await selected.visit('metadata',records=>{seen.push(...records);return true;}),'superseded','Different head rejects the entire read');
          return 'not published';
        });
        equal(changed.outcome,'stale','No mixed-head result');ok(!('value' in changed),'No partial value');
        ok(!JSON.stringify(seen).includes('Replacement'),'One selected revision only');equal(await leases(),0,'Stale read released lease');
        equal(await held.visit('values',()=>true),'cancelled','Reader capability cannot escape lifetime');
        ok(await other.cleanupRevision('A',a.head.sourceRevision),'Retired revision can be reclaimed after release');
        const current=await r.inspect('A');
        const currentLeases=()=>requestValue(db.transaction('meta').objectStore('meta').index('sourceLease').count(['A',current.head.sourceRevision]));
        const ready=await r.readSelected('A',()=> 'ready',async selected=>{
          for(const family of sourceModules.SOURCE_FAMILIES)equal(await selected.visit(family,()=>true),'ready','Validated family '+family);return 'complete';
        });equal(ready.outcome,'ready','Success');equal(await currentLeases(),0,'Success released lease');
        const rejected=await r.readSelected('A',()=> 'ready',async()=>{throw new sourceModules.SourceFactError('invalid-frame','resolution');});
        equal(rejected.outcome,'invalid-family','Consumer rejection');equal(await currentLeases(),0,'Rejection released lease');
        let valid=true;
        const cancelled=await r.readSelected('A',()=> 'ready',async selected=>{await selected.visit('values',()=>true);valid=false;return true;},()=>valid);
        equal(cancelled.outcome,'cancelled','Cancellation');equal(await currentLeases(),0,'Cancellation released lease');
        const closed=await r.readSelected('A',()=> 'ready',async()=>{first.close();return true;});
        equal(closed.outcome,'cancelled','Unload');equal(await currentLeases(),0,'Unload released lease using original connection');
        equal((await other.inspect('B')).sequence,b.sequence,'Independent source intact');second.close();return true;
      })()`), true);
    });

    await t.test("SI4a selected reads reject corrupt durable families and newer format without publishing", async () => {
      assert.equal(await browser.evaluate(`(async()=>{
        const owner=await fresh('si4a-corruption'),r=owner.sources,db=await owner.open();
        await r.replace(await make(r,'intact'));const intact=await r.inspect('intact');
        for(const fault of ['missing-chunk','invalid-chunk','missing-posting','invalid-posting','format-version']){
          await r.replace(await make(r,fault));const selected=await r.inspect(fault),revision=selected.head.families.values.revision;
          if(fault==='format-version')await edit(db,['sourceHeads'],tx=>tx.objectStore('sourceHeads').put({...selected.head,sequence:selected.sequence,formatVersion:99}));
          else {const store=fault.includes('posting')?'sourcePostings':'sourceChunks',key=[fault,revision,'values',0];
            await edit(db,[store],async tx=>{const value=await requestValue(tx.objectStore(store).get(key));
              if(fault.startsWith('missing'))tx.objectStore(store).delete(key);else tx.objectStore(store).put({...value,[store==='sourcePostings'?'key':'digest']:'corrupt'});
            });}
          const result=await r.readSelected(fault,()=> 'ready',async reader=>{await reader.visit('values',()=>true);return 'must not escape';});
          equal(result.outcome,'invalid-family','Closed failure '+fault);ok(!('value' in result),'No partial value '+fault);
          equal(await requestValue(db.transaction('meta').objectStore('meta').index('sourceLease').count([fault,selected.head.sourceRevision])),0,'Failure released all leases');
          equal((await r.inspect('intact')).sequence,intact.sequence,'Intact source preserved');
        }owner.close();return true;
      })()`), true);
    });

    await t.test("SI4a postings union competing endpoints and durable replay changes policy without changing source heads", async () => {
      assert.equal(await browser.evaluate(`(async()=>{
        const owner=await fresh('si4a-semantics'),r=owner.sources,M=sourceModules;
        const refs=Object.fromEntries(['A','B'].map(id=>[id,{id,kind:'document',state:'materialized',semanticPath:id+'.md',physicalPath:id+'.md'}]));
        const entities=Object.fromEntries(['A','B'].map(id=>[id,{kind:'entity',source:refs[id],sourceRevision:'physical:1',entity:refs[id],name:id,url:null,semanticMtime:1,
          file:{path:id+'.md',name:id+'.md',extension:'md',mtime:1,ctime:1,size:100,basename:id}}]));
        for(const [id,field,target] of [['A','Friends','B'],['B','Opposes','A']]){
          const input=await make(r,id,{kind:'missing'},'',{[field]:'[['+target+']]'});
          const metadata={...M.parseBodyMetadata(''),frontmatter:{[field]:'[['+target+']]'},aliases:[],tags:[]};
          input.families.metadata=async emit=>{for(const name of M.sourceFieldNames(metadata))if(!await emit(name))return false;return true;};
          input.families.resolution=async emit=>{for(const fact of M.sourceValueSteps(metadata))if(fact?.kind==='reference-candidate'){
            if(!await emit({kind:'reference-resolution',valueId:fact.valueId,ordinal:fact.ordinal,target:{entity:refs[target],rawTarget:fact.rawTarget,resolvedBy:'host'},hostOccurrenceCount:0}))return false;
          }return true;};
          equal((await r.replace(input)).outcome,'activated','Durable source '+id);
        }
        const reader=new M.CachedSourceSemanticReader(r);
        const queries=[{kind:'field',key:'friends'},{kind:'target',key:'A'},{kind:'literal',key:'A'},{kind:'field',key:'friends'}];
        const candidates=await reader.discover(queries,()=>true);equal(candidates.outcome,'candidates','Indexed discovery');
        equal(candidates.coverage,'candidates-only','Never claim pair completeness');equal([...candidates.sourceIds].sort(),['A','B'],'Both endpoints exactly once');
        const families=await reader.discover([{kind:'family',key:'values'}],()=>true);equal([...families.sourceIds].sort(),['A','B'],'Family posting discovery');
        const heads=await Promise.all(['A','B'].map(id=>r.inspect(id)));
        const requests=heads.map((selected,index)=>{const id=['A','B'][index];return {sourceId:id,host:{source:refs[id],physical:selected.head.physical,observation:selected.head.observation,isCurrent:()=>true,
          structure:emit=>emit(entities[id]),presentation:async()=>true,hostLink:()=>{throw Error('No host-link in fixture');},bodyUrl:()=>{throw Error('No body URL in fixture');}}};});
        const config={hierarchy:{hidden:[],parents:[],children:[],leftFriends:['Friends'],rightFriends:['Opposes'],previous:[],next:[]},inferAllLinksAsFriends:false,inverseInfer:false,showFullTagName:true,tagStyleList:[],maxLabelLength:30};
        const runtime={now:()=>performance.now(),yield:()=>new Promise(resolve=>setTimeout(resolve,0)),isCurrent:()=>true,sliceBudgetMs:8,resolverBatchSize:50};
        const write=r.replace;r.replace=async()=>{throw Error('Policy must not write source facts');};
        for(let index=0;index<2;index++){
          const settings=index?{...config,hierarchy:{...config.hierarchy,leftFriends:[],rightFriends:['Friends','Opposes']}}:config;
          const result=await reader.prepare([...requests,requests[0]],{revision:'policy:'+index,settings,isCurrent:()=>true},{entity:ref=>entities[ref.id]},runtime);
          equal(result.outcome,'ready','Durable cached semantics');equal(result.work.map(work=>work.familyVisits),[4,4],'Exactly one replay per owner');
          equal([...result.compilation.declarations()].length,2,'Two genuine endpoint declarations, no duplicate requested owner');
          const roles=[...result.compilation.declarations()].map(d=>d.role).sort();equal(roles,index?['right','right']:['left','right'],'Current policy semantics');
          for(let source=0;source<2;source++){equal(result.sources[source].sequence,heads[source].sequence,'Policy leaves completion sequence unchanged');equal(result.sources[source].head.sourceRevision,heads[source].head.sourceRevision,'Same neutral head');}
        }
        r.replace=write;
        const invalidPosting=await requestValue((await owner.open()).transaction('sourcePostings').objectStore('sourcePostings').index('lookup').get(IDBKeyRange.bound(['field','friends'],['field','friends',[]],false,true)));
        await edit(await owner.open(),['sourcePostings'],tx=>tx.objectStore('sourcePostings').put({...invalidPosting,unexpected:true}));
        const incomplete=await reader.discover(queries,()=>true);equal(incomplete.outcome,'pending-acquisition','Malformed indexed candidate makes discovery incomplete');ok(!('sourceIds' in incomplete),'No partial candidate list');
        owner.close();return true;
      })()`), true);
    });

    await t.test("broken graph snapshot does not remove sources; newer-database VersionError is nondestructive", async () => {
      assert.equal(await browser.evaluate(`(async()=>{
        const r=cache.sources;const db=await cache.open();const a=await r.inspect('A');
        const meta={key:'active',schema:3,generation:'broken',createdAt:1,vaultSignature:'v',settingsSignature:'s',discoveredFields:[],pageChunkCount:1,evidenceChunkCount:0};
        await edit(db,['meta'],tx=>tx.objectStore('meta').put(meta));const reasons=[];
        equal(await cache.iterateSnapshotPages(meta,()=>{throw new Error('No page expected');},()=>true,reason=>reasons.push(reason)),false,'Missing graph chunk rejected');
        equal(reasons,['missing-chunk'],'Graph failure reason');equal((await r.inspect('A')).sequence,a.sequence,'Neutral head unaffected');
        let oldError;try{await rawOpen(databaseName('durability'),4);}catch(error){oldError=error.name;}equal(oldError,'VersionError','An old binary cannot downgrade v10');
        const newer=await rawOpen(databaseName('newer'),11,db=>db.createObjectStore('sentinel'));await edit(newer,['sentinel'],tx=>tx.objectStore('sentinel').put('retained','key'));newer.close();
        const old=new sourceModules.KplexIndexedDbCache('newer');equal(await old.readSnapshotMeta(),null,'VersionError falls back');
        equal(old.sources.getDiagnostics().activated,0,'No fake progress');await old.sources.inspect('anything');equal(old.sources.getDiagnostics().lastReason,'newer-database','Closed reason');old.close();
        const intact=await rawOpen(databaseName('newer'),11);equal(await requestValue(intact.transaction('sentinel').objectStore('sentinel').get('key')),'retained','No destructive reset');intact.close();
        const diagnostics=JSON.stringify(r.getDiagnostics());ok(!/\.md|Alpha|Changed|Dormant|hierarchy|Field|Long/.test(diagnostics),'Aggregate-only diagnostic privacy');cache.close();return true;
      })()`), true);
    });
  } finally { await browser.cleanup(); }
});

/** Completed-work observation is tested against actual dense immutable families and real IDB. */
test("real Chromium: completed source work is observable without masking waits or changing authority", { timeout: 90000 }, async () => {
  const browser = await chromiumHarness(bundle);
  try {
    await browser.evaluate(initialize);
    assert.equal(await browser.evaluate(`(async()=>{
      let events=0,throwObserver=false,clock=0,lastWork=0,maxGap=0;
      const observed=new sourceModules.KplexIndexedDbCache('completed-source-work',undefined,()=>{
        events++;maxGap=Math.max(maxGap,clock-lastWork);lastWork=clock;
        if(throwObserver)throw new Error('Observer failure');
      });
      const r=observed.sources;
      try {
        ok(await observed.open(),'Real production database');
        const originalYield=r.runtime.yield;
        r.runtime.yield=async()=>{clock+=20000;await originalYield();};
        await r.runtime.yield();equal(events,0,'A bare continuation has no completed work');
        const text=Array.from({length:600},(_,i)=>'Field'+i+':: [[Target'+i+']]').join(String.fromCharCode(10));
        const input=await make(r,'Dense',{kind:'missing'},text);
        throwObserver=true;
        equal((await r.replace(input)).outcome,'activated','Observer exceptions do not affect activation');
        ok(events>5,'Dense production/staging/count pages report work');
        throwObserver=false;events=0;clock=0;lastWork=0;maxGap=0;
        const body=await r.readBody('Dense',()=>true);
        const parsed=sourceModules.parseBodyMetadata(text);
        const canonical=value=>JSON.stringify(value,(_key,item)=>item&&typeof item==='object'&&!Array.isArray(item)
          ?Object.fromEntries(Object.keys(item).sort().map(key=>[key,item[key]])):item);
        ok(canonical(body)===canonical(parsed),'Dense authenticated body preserves all fields/provenance/URLs');
        ok(clock>90000,'One owner crosses the existing inactivity duration in the cooperative clock');
        ok(events>5,'Validated posting/chunk pages report progress within that same owner');
        ok(maxGap<90000,'Actual dense work advances before the inactivity limit');
        equal(await r.ensureLocalDependencies('Dense',0,0), 'ready','Observation leaves dependency authority unchanged');
        equal(await r.completeLocalDependencyInventory(), 'ready','Inventory closes normally');

        // Pause before the first source chunk request, outside a transaction. Pin/head reads are
        // real IDB, and neither those waits nor bare continuations manufacture completed work.
        const transact=r.transaction.bind(r);let entered,release;
        const reached=new Promise(resolve=>entered=resolve),held=new Promise(resolve=>release=resolve);
        let block=true;
        r.transaction=async(...args)=>{
          if(block&&args[1].includes('sourceChunks')&&args[2]==='readonly'){block=false;entered();await held;}
          return transact(...args);
        };
        events=0;const pending=r.readBody('Dense',()=>true);await reached;
        const frozenEvents=events;await r.runtime.yield();await r.runtime.yield();
        equal(events,frozenEvents,'Frozen I/O and continuations do not extend inactivity');
        release();equal(await pending,body,'Released real IDB read stays coherent');
        ok(events>frozenEvents,'Only completed resumed work reports progress');
        r.transaction=transact;

        // A late old read cannot keep a new restore alive after its storage owner closes.
        let enteredClosed,releaseClosed;block=true;
        const reachedClosed=new Promise(resolve=>enteredClosed=resolve),heldClosed=new Promise(resolve=>releaseClosed=resolve);
        r.transaction=async(...args)=>{
          if(block&&args[1].includes('sourceChunks')&&args[2]==='readonly'){block=false;enteredClosed();await heldClosed;}
          return transact(...args);
        };
        const late=r.readBody('Dense',()=>true);await reachedClosed;observed.close();
        const terminalEvents=events;releaseClosed();equal(await late,null,'Closed read is rejected');
        await r.runtime.yield();equal(events,terminalEvents,'Close suppresses late completed-work observation');
        return true;
      }finally{observed.close();}
    })()`), true);
  } finally { await browser.cleanup(); }
});

/** Native browser message tasks must settle even when zero-delay timer callbacks are withheld. */
test("real Chromium: host task continuation survives withheld timers and closes native ports", { timeout: 90000 }, async () => {
  const browser=await chromiumHarness(bundle);
  try {
    assert.equal(await browser.evaluate(`(async()=>{
      const NativeChannel=window.MessageChannel;let timerCalls=0,closed=0,settled=false;
      const owner={setTimeout(){timerCalls++;},MessageChannel:class {
        constructor(){const channel=new NativeChannel();
          for(const port of [channel.port1,channel.port2]){const close=port.close.bind(port);port.close=()=>{closed++;close();};}
          return channel;
        }
      }};
      const pending=sourceModules.yieldToHostTask(owner).then(()=>{settled=true;});
      await Promise.resolve();if(settled)throw new Error('Continuation did not release an event task');
      await pending;if(timerCalls!==0||closed!==2)throw new Error('Native ports/timers were not preserved');
      const cache=new sourceModules.KplexIndexedDbCache('native-task-cancel'),r=cache.sources;
      try {
        const body=sourceModules.parseBodyMetadata('Field:: [[Target]]');
        const input={sourceId:'Owner',physical:{identity:'owner',path:'Owner.md',mtime:1,size:20},
          observation:{epoch:'task-test',revision:0,environment:await r.observationDigest('host')},expected:{kind:'missing'},
          families:{values:async emit=>{for(const fact of sourceModules.sourceValueSteps({...body,frontmatter:{},aliases:[],tags:[]}))if(!await emit(fact))return false;return true;},
            'body-urls':async()=>true,metadata:async()=>true,resolution:async()=>true}};
        if((await r.replace(input)).outcome!=='activated')throw new Error('Cancellation source did not activate');
        let cancellationCloses=0;
        const cancellingOwner={setTimeout(){throw new Error('Cancellation used a timer');},MessageChannel:class {
          constructor(){const channel=new NativeChannel(),post=channel.port2.postMessage.bind(channel.port2);
            for(const port of [channel.port1,channel.port2]){const close=port.close.bind(port);port.close=()=>{cancellationCloses++;close();};}
            channel.port2.postMessage=value=>{post(value);cache.close();};return channel;
          }
        }};
        r.runtime.yield=()=>sourceModules.yieldToHostTask(cancellingOwner);
        if(await r.readBody('Owner',()=>true)!==null)throw new Error('Queued task bypassed closed source lifetime');
        if(cancellationCloses!==2)throw new Error('Cancelled native task retained ports');
      }finally{cache.close();}
      return true;
    })()`),true);
  }finally{await browser.cleanup();}
});

/** Real-IDB coalescing preserves authority while reducing only an eligible family's fetch transactions. */
test("single-chunk disk family coalescing preserves bounded validation and selected lifetimes", { timeout: 60000 }, async t => {
  const browser = await chromiumHarness(bundle);
  try {
    await browser.evaluate(initialize);
    await t.test("four tiny families save four fetch transactions without removing exact-head or lease fences", async () => {
      assert.equal(await browser.evaluate(`(async()=>{
        const owner=await fresh('single-chunk-transactions'),r=owner.sources,db=await owner.open();
        try{
          equal((await r.replace(await make(r,'Tiny'))).outcome,'activated','Durable tiny source');
          const before=await r.inspect('Tiny',[]);ok(Object.values(before.head.families).every(f=>f.chunks===1),'All families genuinely eligible');
          const transaction=r.transaction.bind(r),calls=[];
          r.transaction=async(...args)=>{calls.push({stores:[...args[1]],mode:args[2]});return transaction(...args);};
          const result=await r.readSelected('Tiny',()=> 'ready',async reader=>{
            const counts=[];for(const family of sourceModules.SOURCE_FAMILIES){let count=0;equal(await reader.visit(family,records=>{count+=records.length;return true;}),'ready','Validated '+family);counts.push(count);}return counts;
          });
          r.transaction=transaction;
          equal(result.outcome,'ready','Full selected read closes');equal(result.value,sourceModules.SOURCE_FAMILIES.map(family=>before.head.families[family].records),'Every stored canonical family record consumed');
          equal(calls.filter(c=>c.mode==='readonly'&&c.stores.join(',')==='sourceChunks,sourcePostings').length,4,'One combined fetch per tiny family');
          equal(calls.filter(c=>c.stores.length===1&&(c.stores[0]==='sourceChunks'||c.stores[0]==='sourcePostings')).length,0,'Four former extra posting transactions removed');
          equal(calls.filter(c=>c.mode==='readonly'&&c.stores.join(',')==='sourceHeads').length,6,'Initial, four family and final exact-head checks remain');
          equal(calls.filter(c=>c.mode==='readwrite'&&c.stores.includes('sourceHeads')&&c.stores.includes('meta')).length,1,'Atomic source pin remains');
          equal(r.decodeBytes,0,'All decoded data released');equal(r.readers.size,0,'Selected reader expired');
          equal(await requestValue(db.transaction('meta').objectStore('meta').index('sourceLease').count(['Tiny',before.head.sourceRevision])),0,'Actual leases removed');
          equal((await r.inspect('Tiny',[])).head,before.head,'Read does not change durable head');return true;
        }finally{owner.close();}
      })()`),true);
    });
    await t.test("one bounded prefetched page leaves subsequent posting pages and multi-chunk reads unchanged", async () => {
      assert.equal(await browser.evaluate(`(async()=>{
        const owner=await fresh('single-chunk-pages'),r=owner.sources;const getAll=IDBObjectStore.prototype.getAll;
        try{
          const input=await make(r,'Dates');input.families.resolution=async emit=>{
            for(let i=0;i<200;i++)if(!await emit({kind:'date-property',fieldName:'Date'+i,normalizedFieldName:'date'+i,rawValue:'2026-10-09',
              target:{entity:{id:'Daily-'+i,kind:'document',state:'materialized',semanticPath:'Daily-'+i,physicalPath:'Daily-'+i},rawTarget:'Daily-'+i,resolvedBy:'daily-notes'}}))return false;return true;
          };
          equal((await r.replace(input)).outcome,'activated','Many two-key resolution facts');
          const head=(await r.inspect('Dates',[])).head;equal(head.families.resolution.chunks,1,'Single chunk');equal(head.families.resolution.postings,401,'Two postings per fact plus family');
          const transaction=r.transaction.bind(r),calls=[],ranges=[];
          r.transaction=async(...args)=>{calls.push([...args[1]]);return transaction(...args);};
          IDBObjectStore.prototype.getAll=function(range,count){if(this.name==='sourcePostings'){ranges.push([range.lower[3],range.upper[3],count]);ok(count<=256,'Existing record cap');}return getAll.call(this,range,count);};
          let seen=0;equal(await r.visit('Dates','resolution',records=>{seen+=records.length;return true;}),'ready','All facts authenticated');
          equal(seen,200,'No fact prefix');equal(ranges,[[0,255,256],[256,400,145]],'Unchanged exact bounded ranges');
          equal(calls.filter(s=>s.join(',')==='sourceChunks,sourcePostings').length,1,'Only first page coalesced');
          equal(calls.filter(s=>s.join(',')==='sourcePostings').length,1,'Remaining page still fetched independently');
          r.transaction=transaction;IDBObjectStore.prototype.getAll=getAll;
          const many=await make(r,'Many');many.families.metadata=async emit=>{for(let i=0;i<600;i++)if(!await emit({kind:'host-literal',ordinal:i,rawTarget:'Target-'+i}))return false;return true;};
          equal((await r.replace(many)).outcome,'activated','Multi-chunk owner');const selected=(await r.inspect('Many',[])).head;
          ok(selected.families.metadata.chunks>1,'Genuine multi-chunk input');calls.length=0;r.transaction=async(...args)=>{calls.push([...args[1]]);return transaction(...args);};
          seen=0;equal(await r.visit('Many','metadata',records=>{seen+=records.length;return true;}),'ready','Multi-chunk validation');
          equal(seen,600,'All multi-chunk facts');equal(calls.filter(s=>s.join(',')==='sourceChunks,sourcePostings').length,0,'Multi-chunk fetch ownership unchanged');equal(r.decodeBytes,0,'All reservations released');return true;
        }finally{IDBObjectStore.prototype.getAll=getAll;owner.close();}
      })()`),true);
    });
    await t.test("corrupt prefetched rows and invalid previews retain exact failure precedence without private output", async () => {
      assert.equal(await browser.evaluate(`(async()=>{
        const owner=await fresh('single-chunk-corruption'),r=owner.sources,db=await owner.open();
        try{
          for(const fault of ['bad-sha','bad-frame-and-sha','bad-frame','missing-posting','wrong-posting']){
            equal((await r.replace(await make(r,fault))).outcome,'activated','Seed '+fault);
            const head=(await r.inspect(fault,[])).head,revision=head.families.metadata.revision,key=[fault,revision,'metadata',0];
            const chunk=await requestValue(db.transaction('sourceChunks').objectStore('sourceChunks').get(key));
            if(fault.startsWith('bad-')){
              const data=fault==='bad-sha'?chunk.data:JSON.stringify([{kind:'unknown'}]);
              const digest=fault==='bad-frame'?await r.observationDigest(data):'0'.repeat(64);
              await edit(db,['sourceChunks'],tx=>tx.objectStore('sourceChunks').put({...chunk,data,digest,records:1,bytes:new TextEncoder().encode(data).length}));
            }else await edit(db,['sourcePostings'],async tx=>{const store=tx.objectStore('sourcePostings');if(fault==='missing-posting')store.delete(key);else{const row=await requestValue(store.get(key));store.put({...row,key:'incorrect'});}});
            let consumed=0;const result=await r.readSelected(fault,()=> 'ready',async reader=>{await reader.visit('metadata',records=>{consumed+=records.length;return true;});return true;});
            equal(result.outcome,'invalid-family','Failure is not authority '+fault);equal(result.reason,{'bad-sha':'invalid-chunk','bad-frame-and-sha':'invalid-chunk','bad-frame':'invalid-frame','missing-posting':'missing-posting','wrong-posting':'invalid-posting'}[fault],'Original precise failure '+fault);
            equal(consumed,0,'No corrupt facts consumed');ok(!('value' in result),'No partial result');equal(r.decodeBytes,0,'Failed preview/validation releases decode memory');
            equal(await requestValue(db.transaction('meta').objectStore('meta').index('sourceLease').count([fault,head.sourceRevision])),0,'Failure removes actual lease');
          }return true;
        }finally{owner.close();}
      })()`),true);
    });
    await t.test("replacement after combined fetch remains private and retains its cleanup lease until terminal exit", async () => {
      assert.equal(await browser.evaluate(`(async()=>{
        const first=await fresh('single-chunk-replacement'),second=await fresh('single-chunk-replacement'),r=first.sources,other=second.sources,db=await second.open();let release;
        try{
          equal((await r.replace(await make(r,'A'))).outcome,'activated','Initial head');const selected=await r.inspect('A',[]);
          const transaction=r.transaction.bind(r);let signal,paused=false;const reached=new Promise(resolve=>signal=resolve),hold=new Promise(resolve=>release=resolve);
          r.transaction=async(...args)=>{const value=await transaction(...args);if(!paused&&args[1].join(',')==='sourceChunks,sourcePostings'){paused=true;signal();await hold;}return value;};
          const task=r.readSelected('A',()=> 'ready',async reader=>{await reader.visit('values',()=>true);return 'no authority';});
          await reached;ok(r.decodeBytes>0,'Pending prefetched decode stays charged');
          equal((await other.replace(await make(other,'A',selected.expected,'Field:: [[Replacement]]'))).outcome,'activated','Concurrent durable head changes');
          equal(await other.cleanupRevision('A',selected.head.sourceRevision),false,'Exact old revision still leased');
          release();const result=await task;equal(result.outcome,'stale','Late head replacement rejects');ok(!('value' in result),'No stale output');equal(r.decodeBytes,0,'Reservation released');
          equal(await requestValue(db.transaction('meta').objectStore('meta').index('sourceLease').count(['A',selected.head.sourceRevision])),0,'Lease finally removed');
          ok(await other.cleanupRevision('A',selected.head.sourceRevision),'Old revision becomes collectible after reader closes');return true;
        }finally{release?.();first.close();second.close();}
      })()`),true);
    });
    await t.test("native coalesced transaction abort and cancellation release memory and keep the connection healthy", async () => {
      assert.equal(await browser.evaluate(`(async()=>{
        const owner=await fresh('single-chunk-abort'),r=owner.sources,db=await owner.open(),getAll=IDBObjectStore.prototype.getAll;
        try{
          for(const mode of ['abort','cancel']){
            equal((await r.replace(await make(r,mode))).outcome,'activated','Seed '+mode);const head=(await r.inspect(mode,[])).head;let active=true,interrupted=false;
            IDBObjectStore.prototype.getAll=function(...args){const request=getAll.apply(this,args);if(this.name==='sourcePostings'&&!interrupted){interrupted=true;ok(r.decodeBytes>0,'Preview already charged');
              if(mode==='abort')r.cancelSource(mode);else request.addEventListener('success',()=>{active=false;},{once:true});}return request;};
            const result=await r.readSelected(mode,()=> 'ready',async reader=>{await reader.visit('metadata',()=>true);return true;},()=>active);
            IDBObjectStore.prototype.getAll=getAll;equal(interrupted,true,'Actual first posting request interrupted');equal(result.outcome,'cancelled','Interrupted work has no authority');ok(!('value' in result),'No partial result');equal(r.decodeBytes,0,'Aborted transaction releases preview reservation');equal(r.readers.size,0,'Reader expired');
            equal(await requestValue(db.transaction('meta').objectStore('meta').index('sourceLease').count([mode,head.sourceRevision])),0,'Owned leases removed after interruption');
            equal((await r.inspect(mode)).reason,'ready','Cancellation does not poison native storage');
          }return true;
        }finally{IDBObjectStore.prototype.getAll=getAll;owner.close();}
      })()`),true);
    });
    await t.test("indivisible oversized records retain the decode cap and memory fallback never uses disk prefetch", async () => {
      assert.equal(await browser.evaluate(`(async()=>{
        const owner=await fresh('single-chunk-budget'),r=owner.sources,db=await owner.open();
        try{
          equal((await r.replace(await make(r,'Oversized'))).outcome,'activated','Seed budget case');const head=(await r.inspect('Oversized',[])).head,key=['Oversized',head.families.metadata.revision,'metadata',0];
          const raw=await requestValue(db.transaction('sourceChunks').objectStore('sourceChunks').get(key)),data=JSON.stringify([{kind:'alias',value:'x'.repeat(2000000)}]);
          await edit(db,['sourceChunks'],tx=>tx.objectStore('sourceChunks').put({...raw,data,bytes:new TextEncoder().encode(data).length,digest:'0'.repeat(64),records:1}));
          equal((await r.inspect('Oversized',['metadata'])).families.metadata,'decode-budget','Existing indivisible decode cap applies before speculative parse');equal(r.decodeBytes,0,'Rejected reserve owns no memory');
          const mismatched=JSON.stringify([{kind:'alias',value:'x'.repeat(3000000)}]);
          await edit(db,['sourceChunks'],tx=>tx.objectStore('sourceChunks').put({...raw,data:mismatched,bytes:1,digest:'0'.repeat(64),records:1}));
          equal((await r.inspect('Oversized',['metadata'])).families.metadata,'decode-budget','Oversized wrong-byte input keeps reserve-before-encoding failure precedence');equal(r.decodeBytes,0,'Wrong-byte rejection owns no decode reservation');
          const storage=r.storage,prefetch=r.prefetchSingleFamilyChunk;r.storage={open:async()=>null,failed(){throw new Error('No native transaction may run in memory fallback');}};
          r.prefetchSingleFamilyChunk=()=>{throw new Error('Memory fallback must not prefetch');};
          try{
            equal((await r.replace(await make(r,'Memory'))).outcome,'unsaved','Unavailable storage retains bounded fallback');const memory=(await r.inspect('Memory',[])).head;let seen=0;
            const result=await r.readSelected('Memory',()=> 'ready',async reader=>{for(const family of sourceModules.SOURCE_FAMILIES)equal(await reader.visit(family,records=>{seen+=records.length;return true;}),'ready','Memory '+family);return seen;});
            equal(result.outcome,'ready','Existing selected memory authority remains');equal(result.value,Object.values(memory.families).reduce((sum,family)=>sum+family.records,0),'All real parser/family memory records');equal(r.decodeBytes,0,'Memory reservations released');
          }finally{r.storage=storage;r.prefetchSingleFamilyChunk=prefetch;}
          return true;
        }finally{owner.close();}
      })()`),true);
    });
  } finally { await browser.cleanup(); }
});

/** The ordinary production metadata visitor shares its protected fetch with atomic selection. */
test("protected single-family selection removes one native transaction without removing work", { timeout: 60000 }, /** Compare complete native work while restoring every observer before cleanup. */ async () => {
  const browser = await chromiumHarness(bundle);
  try {
    await browser.evaluate(initialize);
    assert.equal(await browser.evaluate(`(/** Exercise the production visitor against durable facts and its real original connection. */async()=>{
      const owner=await fresh('protected-family-selection-counts'),r=owner.sources,db=await owner.open();
      const nativeTransaction=db.transaction,add=IDBObjectStore.prototype.add,remove=IDBObjectStore.prototype.delete;
      const runtime=r.runtime,calls=[];let additions=0,deletions=0,hashes=0;
      try{
        equal((await r.replace(await make(r,'Tiny'))).outcome,'activated','Durable tiny source');
        const before=await r.inspect('Tiny',[]),revision=before.head.families.metadata.revision;
        equal(before.head.families.metadata.chunks,1,'Actual production single-chunk eligibility');
        const selectedRevisions=new Set(Object.values(before.head.families).map(/** Count storage revisions rather than assuming one lease per family. */family=>family.revision)).size;
        db.transaction=/** Include direct original-connection lease release in native totals. */function(...args){calls.push({stores:Array.from(args[0]),mode:args[1]});return nativeTransaction.apply(this,args);};
        IDBObjectStore.prototype.add=/** Count only actual family-lease creations. */function(value,...args){if(this.name==='meta'&&String(value?.key).startsWith('source-lease:'))additions++;return add.call(this,value,...args);};
        IDBObjectStore.prototype.delete=/** Count the corresponding original-handle deletions. */function(key){if(this.name==='meta'&&String(key).startsWith('source-lease:'))deletions++;return remove.call(this,key);};
        r.runtime={...runtime,digest:/** Authentication remains real SHA work, counted separately from IDB. */async text=>{hashes++;return runtime.digest(text);}};
        const facts=[];
        equal(await r.visit('Tiny','metadata',/** Collect private facts only until the terminal visitor result. */records=>{facts.push(...records);return true;}),'ready','Production visitor authenticates');
        equal(facts,[{kind:'alias',value:'label'}],'Canonical metadata is unchanged');
        equal(additions,selectedRevisions,'Every selected family revision remains durably protected');
        equal(deletions,selectedRevisions,'Complete lease release is included');
        equal(hashes,3,'Chunk, rolling-family and posting digest authentication remains');
        equal(calls.length,2,'One atomic selection/protected-fetch transaction plus complete original-handle release');
        equal(calls[0].mode,'readwrite','Selection and lease creation remain atomic');
        ok(['sourceHeads','meta','sourceChunks','sourcePostings'].every(/** Require all protected reads and lease writes in the same native scope. */store=>calls[0].stores.includes(store)),'Same selection transaction owns protected family reads');
        equal(calls[1],{stores:['meta'],mode:'readwrite'},'Original connection retires owned leases');
        equal(r.decodeBytes,0,'No retained decode reservation');equal(r.readers.size,0,'No selected reader lifetime remains');
        db.transaction=nativeTransaction;IDBObjectStore.prototype.add=add;IDBObjectStore.prototype.delete=remove;r.runtime=runtime;
        equal(await requestValue(db.transaction('meta').objectStore('meta').index('sourceLease').count(['Tiny',revision])),0,'No durable reader debt');
        equal((await r.inspect('Tiny',[])).head,before.head,'No source write or restamping');return true;
      }finally{db.transaction=nativeTransaction;IDBObjectStore.prototype.add=add;IDBObjectStore.prototype.delete=remove;r.runtime=runtime;owner.close();}
    })()`),true);
  }finally{await browser.cleanup();}
});

/** Real native transactions exercise prepared-decode transfer, unchanged fallbacks and retirement. */
test("protected metadata preparation preserves bounded fallback and reader cleanup", { timeout: 180000 }, /** Exercise independent native lifetime boundaries inside an owned disposable browser. */ async t => {
  const browser = await chromiumHarness(bundle);
  try {
    await browser.evaluate(initialize);
    await t.test("zero, one, record-limit and exact byte-limit families select only the bounded fast path", /** Verify count and encoded-byte eligibility without changing production budgets. */ async () => {
      assert.equal(await browser.evaluate(`(/** Construct authenticated exact-limit storage frames and prove complete retirement. */async()=>{
        const owner=await fresh('protected-family-boundaries'),r=owner.sources,db=await owner.open(),get=IDBObjectStore.prototype.get;
        try{
          const target=sourceModules.SOURCE_CHUNK_TARGET_BYTES,limit=sourceModules.SOURCE_MAX_BATCH_RECORDS;
          const cases=[['Zero',0,null,true],['One',1,null,true],['RecordLimit',limit,null,true],['RecordOver',limit+1,null,false],['ByteLimit',1,target,true],['ByteOver',1,target+1,false]];
          for(const [id,count,bytes,eligible] of cases){
            const input=await make(r,id);const base=new TextEncoder().encode(JSON.stringify([{kind:'alias',value:''}])).length;
            input.families.metadata=/** Produce exact canonical facts before arranging an authenticated storage-boundary fixture. */async emit=>{for(let i=0;i<count;i++)if(!await emit({kind:'alias',value:bytes===null?'Alias-'+i:'x'.repeat(bytes-base)}))return false;return true;};
            equal((await r.replace(input)).outcome,'activated','Persist exact boundary '+id);let before=(await r.inspect(id,[])).head;
            // The current writer flushes at the limit and appends an empty final chunk. Reader
            // codecs also admit an exact-limit single chunk: retain every fact/posting, remove only
            // that empty terminal frame and recompute its real rolling SHA/byte manifest.
            if((count===limit||bytes!==null)&&before.families.metadata.chunks===2){
              const manifest=before.families.metadata,firstKey=[id,manifest.revision,'metadata',0],lastKey=[id,manifest.revision,'metadata',1];
              const first=await requestValue(db.transaction('sourceChunks').objectStore('sourceChunks').get(firstKey));
              const last=await requestValue(db.transaction('sourceChunks').objectStore('sourceChunks').get(lastKey));
              equal(last.records,0,'Only an empty terminal frame is removed');equal(last.data,'[]','Terminal frame has no facts');
              const digest=await r.observationDigest(first.digest);before={...before,families:{...before.families,metadata:{...manifest,chunks:1,bytes:first.bytes,digest}}};
              await edit(db,['sourceChunks','sourceHeads'],/** Commit the valid boundary chunk and its authenticated manifest atomically. */tx=>{tx.objectStore('sourceChunks').put({...first,final:true});tx.objectStore('sourceChunks').delete(lastKey);tx.objectStore('sourceHeads').put(before);});
            }
            equal(before.families.metadata.records,count,'Actual persisted record count '+id);if(bytes!==null)equal(before.families.metadata.bytes,bytes,'Actual persisted byte count '+id);
            let speculative=0,seen=0;IDBObjectStore.prototype.get=/** Observe actual chunk work in the existing atomic write transaction. */function(...args){if(this.name==='sourceChunks'&&this.transaction.mode==='readwrite')speculative++;return get.apply(this,args);};
            equal(await r.visit(id,'metadata',/** Count all authenticated rows, including the empty final family. */records=>{seen+=records.length;return true;}),'ready','Boundary authenticates '+id);IDBObjectStore.prototype.get=get;
            equal(seen,count,'No truncated boundary output '+id);equal(speculative,eligible?1:0,'Exact fast-path boundary '+id);equal(r.decodeBytes,0,'Boundary reservation released '+id);equal(r.readers.size,0,'Boundary reader released '+id);
            equal(await requestValue(db.transaction('meta').objectStore('meta').index('sourceLease').count([id,before.sourceRevision])),0,'Boundary leases retired '+id);
          }return true;
        }finally{IDBObjectStore.prototype.get=get;owner.close();}
      })()`),true);
    });
    await t.test("dense, oversized, legacy and non-metadata owners issue no speculative write-transaction fetch", /** Preserve original readers for every intentionally ineligible owner shape. */ async () => {
      assert.equal(await browser.evaluate(`(/** Attribute speculative native work separately from the required fallback authentication. */async()=>{
        const owner=await fresh('protected-family-fallback'),r=owner.sources,db=await owner.open(),get=IDBObjectStore.prototype.get;
        try{
          const dense=await make(r,'Dense');dense.families.metadata=/** Force multiple production chunks with genuine alias facts. */async emit=>{for(let i=0;i<600;i++)if(!await emit({kind:'alias',value:'Alias-'+i}))return false;return true;};
          const wide=await make(r,'Wide');wide.families.metadata=/** Produce one indivisible record above the speculative target but below existing decode limits. */async emit=>emit({kind:'alias',value:'x'.repeat(270000)});
          for(const input of [dense,wide,await make(r,'Legacy'),await make(r,'Other')])equal((await r.replace(input)).outcome,'activated','Seed fallback');
          const legacy=(await r.inspect('Legacy',[])).head;
          await edit(db,['sourceHeads'],/** Select the recognized legacy grammar while preserving its actual URL-free bytes. */tx=>tx.objectStore('sourceHeads').put({...legacy,bodyParserVersion:2}));
          let speculative=0;IDBObjectStore.prototype.get=/** Attribute only chunk requests inside a native write transaction. */function(...args){if(this.name==='sourceChunks'&&this.transaction.mode==='readwrite')speculative++;return get.apply(this,args);};
          for(const [id,family,expected] of [['Dense','metadata',600],['Wide','metadata',1],['Legacy','metadata',1],['Other','values',4]]){
            let count=0;equal(await r.visit(id,family,/** Count authenticated fallback output without retaining dense payloads. */records=>{count+=records.length;return true;}),'ready','Fallback authenticates '+id);
            if(id!=='Other')equal(count,expected,'Complete fallback output '+id);
          }
          equal(speculative,0,'Ineligible paths perform no unused prepared fetch');equal(r.decodeBytes,0,'All fallback reservations close');equal(r.readers.size,0,'No fallback reader remains');return true;
        }finally{IDBObjectStore.prototype.get=get;owner.close();}
      })()`),true);
    });
    await t.test("missing and corrupt prepared rows retain digest/frame/posting failure order", /** Keep established failure precedence and reject all unauthenticated callbacks. */ async () => {
      assert.equal(await browser.evaluate(`(/** Alter one durable envelope at a time and check independent protective cleanup. */async()=>{
        const owner=await fresh('protected-family-corruption'),r=owner.sources,db=await owner.open();
        try{
          for(const fault of ['missing-chunk','bad-sha','bad-frame-and-sha','bad-frame','missing-posting','wrong-posting','large-corrupt']){
            equal((await r.replace(await make(r,fault))).outcome,'activated','Seed '+fault);
            const head=(await r.inspect(fault,[])).head,key=[fault,head.families.metadata.revision,'metadata',0];
            const raw=await requestValue(db.transaction('sourceChunks').objectStore('sourceChunks').get(key));
            if(fault==='missing-chunk')await edit(db,['sourceChunks'],/** Remove the selected chunk without changing the manifest's completeness claim. */tx=>tx.objectStore('sourceChunks').delete(key));
            else if(fault==='missing-posting'||fault==='wrong-posting')await edit(db,['sourcePostings'],/** Corrupt a required lookup row independently of the authentic chunk. */async tx=>{const store=tx.objectStore('sourcePostings');if(fault==='missing-posting')store.delete(key);else{const posting=await requestValue(store.get(key));store.put({...posting,key:'wrong'});}});
            else{
              const data=fault==='bad-sha'?raw.data:JSON.stringify([{kind:'unknown',value:fault==='large-corrupt'?'x'.repeat(300000):'x'}]);
              const digest=fault==='bad-frame'?await r.observationDigest(data):'0'.repeat(64);
              await edit(db,['sourceChunks'],/** Persist the selected SHA/frame disagreement without mutating unrelated families. */tx=>tx.objectStore('sourceChunks').put({...raw,data,digest,bytes:new TextEncoder().encode(data).length,records:1}));
            }
            let consumed=0;const reason=await r.visit(fault,'metadata',/** Detect any forbidden callback before failed authentication closes. */records=>{consumed+=records.length;return true;});
            equal(reason,{'missing-chunk':'missing-chunk','bad-sha':'invalid-chunk','bad-frame-and-sha':'invalid-chunk','bad-frame':'invalid-frame','missing-posting':'missing-posting','wrong-posting':'invalid-posting','large-corrupt':'invalid-chunk'}[fault],'Unchanged reason '+fault);
            equal(consumed,0,'No unauthenticated fact callback '+fault);equal(r.decodeBytes,0,'Failed preparation reservation closes');equal(r.readers.size,0,'Failed preparation reader closes');
            equal(await requestValue(db.transaction('meta').objectStore('meta').index('sourceLease').count([fault,head.sourceRevision])),0,'No durable pin remains');
          }return true;
        }finally{owner.close();}
      })()`),true);
    });
    await t.test("close before pin resumption retires the prepared reservation before the caller continues", /** Test unload between native commit and awaited caller resumption. */ async () => {
      assert.equal(await browser.evaluate(`(/** Hold the committed selection so synchronous close must own its prepared reservation. */async()=>{
        const owner=await fresh('protected-family-close'),r=owner.sources,db=await owner.open(),transaction=r.transaction;let release;
        try{
          equal((await r.replace(await make(r,'A'))).outcome,'activated','Seed close');
          const head=(await r.inspect('A',[])).head;let entered;const reached=new Promise(/** Signal only the post-commit boundary. */resolve=>entered=resolve),hold=new Promise(/** Let the fixture resume the retired caller after cleanup assertions. */resolve=>release=resolve);
          r.transaction=/** Hold only after the actual combined pin transaction has committed. */async function(...args){const value=await transaction.apply(this,args);if(args[2]==='readwrite'&&args[1].includes('sourceChunks')){entered();await hold;}return value;};
          let consumed=0;const pending=r.visit('A','metadata',/** Detect publication of any records after the held lifetime is closed. */records=>{consumed+=records.length;return true;});await reached;
          equal(r.readers.size,1,'Reader registered before pin resumes');ok(r.decodeBytes>0,'Prepared decode is charged while continuation is held');
          const view=[...r.readers][0];r.close();equal(r.decodeBytes,0,'Close synchronously releases unconsumed preparation');await view.release;
          equal(await requestValue(db.transaction('meta').objectStore('meta').index('sourceLease').count(['A',head.sourceRevision])),0,'Original connection removed committed protection');
          release();equal(await pending,'cancelled','Closed preparation never escapes');equal(consumed,0,'No callback after close');equal(r.decodeBytes,0,'No double release');return true;
        }finally{release?.();r.transaction=transaction;owner.close();}
      })()`),true);
    });
    await t.test("cancel or unload during a native prepared request leaves no reservation or healthy pin", /** Distinguish caller cancellation, source abort and repository close at actual request boundaries. */ async () => {
      assert.equal(await browser.evaluate(`(/** Interrupt each owned lifetime while its real posting request is still active. */async()=>{
        const getAll=IDBObjectStore.prototype.getAll;
        try{
          for(const mode of ['caller','source','close']){
            const owner=await fresh('protected-family-request-'+mode),r=owner.sources,db=await owner.open();let live=true,interrupted=false;
            try{
              equal((await r.replace(await make(r,'A'))).outcome,'activated','Seed '+mode);const head=(await r.inspect('A',[])).head;
              IDBObjectStore.prototype.getAll=/** Interrupt the real first posting request with owned cancellation. */function(...args){const request=getAll.apply(this,args);if(this.name==='sourcePostings'&&this.transaction.mode==='readwrite'&&!interrupted){interrupted=true;if(mode==='source')r.cancelSource('A');else if(mode==='close')r.close();else request.addEventListener('success',/** Retire caller authority before the request's awaited continuation. */()=>{live=false;},{once:true});}return request;};
              let consumed=0;equal(await r.visit('A','metadata',/** Detect any callback escaping an interrupted preparation. */records=>{consumed+=records.length;return true;},/** Keep caller demand independent from repository/source cancellation. */()=>live),'cancelled','Interrupted pin is cancelled');
              IDBObjectStore.prototype.getAll=getAll;equal(interrupted,true,'Real native posting boundary reached');equal(consumed,0,'No partial facts');equal(r.decodeBytes,0,'Request-local or transferred reservation released');equal(r.readers.size,0,'No active reader');
              equal(await requestValue(db.transaction('meta').objectStore('meta').index('sourceLease').count(['A',head.sourceRevision])),0,'Aborted pin leaves no durable lease');
            }finally{IDBObjectStore.prototype.getAll=getAll;owner.close();}
          }return true;
        }finally{IDBObjectStore.prototype.getAll=getAll;}
      })()`),true);
    });
    await t.test("a held background preparation protects retired rows while foreground reads and edits finish", /** Prove that committed background protection does not become a foreground join or native lock. */ async () => {
      assert.equal(await browser.evaluate(`(/** Complete foreground reads and an independent edit before resuming the retired background reader. */async()=>{
        const first=await fresh('protected-family-foreground'),second=await fresh('protected-family-foreground'),r=first.sources,other=second.sources,transaction=r.transaction;let release;
        try{
          for(const id of ['Background','Foreground'])equal((await r.replace(await make(r,id))).outcome,'activated','Seed '+id);
          const before=await r.inspect('Background',[]);let entered,held=false,live=true;const reached=new Promise(/** Announce committed background protection to the foreground fixture. */resolve=>entered=resolve),hold=new Promise(/** Retain only the caller continuation, never a live native transaction. */resolve=>release=resolve);
          r.transaction=/** Pausing after commit must not hold a native lock or join foreground work. */async function(...args){const value=await transaction.apply(this,args);if(!held&&args[3]==='Background'&&args[2]==='readwrite'&&args[1].includes('sourceChunks')){held=true;entered();await hold;}return value;};
          const background=r.visit('Background','metadata',/** Request validation without retaining background payloads. */()=>true,/** Model the existing caller freshness fence independently of storage. */()=>live);await reached;
          equal(await r.visit('Foreground','metadata',/** Complete an unrelated foreground read while background remains paused. */()=>true),'ready','Foreground read completes while background continuation is held');
          equal((await other.replace(await make(other,'Background',before.expected,'Field:: [[Changed]]'))).outcome,'activated','Independent edit completes without joining paused reader');
          equal(await other.cleanupRevision('Background',before.head.sourceRevision),false,'Old family remains protected by original reader');
          live=false;release();equal(await background,'cancelled','Existing caller freshness fence rejects old preparation');equal(r.decodeBytes,0,'Both read reservations retired');
          ok(await other.cleanupRevision('Background',before.head.sourceRevision),'Retired data becomes collectible only after reader release');
          equal(await other.visit('Background','metadata',/** Authenticate the newly selected source after old-row reclamation. */()=>true),'ready','Subsequent selected read remains healthy');return true;
        }finally{release?.();r.transaction=transaction;first.close();second.close();}
      })()`),true);
    });
    await t.test("shared revisions and memory or evicted unsaved masks retain their existing authority", /** Preserve all-family protection and storage-degraded masks without speculative disk bypass. */ async () => {
      assert.equal(await browser.evaluate(`(/** Select mixed immutable revisions, then exercise current-memory and evicted-unsaved ownership. */async()=>{
        const owner=await fresh('protected-family-revisions'),r=owner.sources,db=await owner.open(),storage=r.storage,get=IDBObjectStore.prototype.get;
        try{
          equal((await r.replace(await make(r,'A'))).outcome,'activated','Seed initial family revision');const before=await r.inspect('A',[]);
          const next=await make(r,'A',before.expected);next.families={...before.head.families,metadata:/** Replace metadata alone while retaining other authenticated family revisions. */async emit=>emit({kind:'alias',value:'new label'})};
          equal((await r.replace(next)).outcome,'activated','Only metadata receives a new immutable revision');const selected=(await r.inspect('A',[])).head;
          equal(new Set(Object.values(selected.families).map(/** Distinguish actual storage revisions rather than counting family names. */family=>family.revision)).size,2,'Actual shared and fresh family revisions');
          let pins=0;IDBObjectStore.prototype.get=/** Count the complete selected revision protection during combined fetch. */function(...args){if(this.name==='sourceChunks'&&this.transaction.mode==='readwrite')pins=r.readers.size;return get.apply(this,args);};
          const facts=[];equal(await r.visit('A','metadata',/** Retain private metadata only until the terminal reason authenticates it. */records=>{facts.push(...records);return true;}),'ready','New metadata authenticates');
          equal(facts,[{kind:'alias',value:'new label'}],'No retained old metadata');equal(pins,1,'One registered lifetime covers every family revision');
          for(const revision of new Set(Object.values(selected.families).map(/** Check retirement separately for every distinct selected storage revision. */family=>family.revision)))equal(await requestValue(db.transaction('meta').objectStore('meta').index('sourceLease').count(['A',revision])),0,'Every revision lease retired');
          r.storage={open:/** Force the existing bounded memory-write path without a native connection. */async()=>null,/** A memory-only operation must never report a native storage failure. */failed(){throw new Error('Memory-only read cannot fail native storage');}};
          equal((await r.replace(await make(r,'Memory'))).outcome,'unsaved','Storage degradation preserves bounded source memory');r.storage=storage;
          let diskReads=0;IDBObjectStore.prototype.get=/** Any disk head/chunk read would bypass the memory/unsaved mask. */function(...args){if(this.name==='sourceHeads'||this.name==='sourceChunks')diskReads++;return get.apply(this,args);};
          equal(await r.visit('Memory','metadata',/** Authenticate current memory facts without granting durable authority. */()=>true),'ready','Current memory family remains usable');
          r.memory.delete('Memory');equal(await r.visit('Memory','metadata',/** This callback must remain unreachable after unsaved payload eviction. */()=>true),'unsaved','Evicted unsaved data never exposes an older disk head');equal(diskReads,0,'Neither memory path starts durable preparation');
          equal(r.decodeBytes,0,'Shared and memory reads close decode ownership');return true;
        }finally{IDBObjectStore.prototype.get=get;r.storage=storage;owner.close();}
      })()`),true);
    });
    await t.test("post-request failure retires prepared results for both combined and standalone transactions", /** Cover reservation ownership after request success but before a wrapper returns its result. */ async () => {
      assert.equal(await browser.evaluate(`(/** Reject both preparation owners after native commit and prove a later read can recover. */async()=>{
        const owner=await fresh('protected-family-terminal-failure'),r=owner.sources,db=await owner.open(),transaction=r.transaction;
        try{
          equal((await r.replace(await make(r,'A'))).outcome,'activated','Seed failure');const head=(await r.inspect('A',[])).head;
          for(const family of ['metadata','values']){
            let interrupted=false;r.transaction=/** Fail after successful native requests/commit while the wrapper still owns their reservation. */async function(...args){const value=await transaction.apply(this,args);if(!interrupted&&args[1].includes('sourceChunks')){interrupted=true;throw new sourceModules.SourceFactError('read-error');}return value;};
            equal(await r.visit('A',family,/** No callback can authorize the interrupted prepared result. */()=>true),'read-error','No success escapes failed '+family+' transfer');r.transaction=transaction;
            equal(interrupted,true,'Relevant combined or standalone fetch reached');equal(r.decodeBytes,0,'Transferred reservation reclaimed exactly once');equal(r.readers.size,0,'Terminal reader removed');
            equal(await requestValue(db.transaction('meta').objectStore('meta').index('sourceLease').count(['A',head.sourceRevision])),0,'Committed lease retirement completed');
            equal(await r.visit('A',family,/** Reauthenticate the same durable facts after removing the fixture fault. */()=>true),'ready','Later ordinary read is healthy');
          }return true;
        }finally{r.transaction=transaction;owner.close();}
      })()`),true);
    });
    await t.test("an aborted release retains conservative protection without retaining decoded memory", /** Preserve the conservative failed-retirement contract while proving decode ownership ends. */ async () => {
      assert.equal(await browser.evaluate(`(/** Observe a real failed lease deletion through an independent still-live connection. */async()=>{
        const first=await fresh('protected-family-release-abort'),second=await fresh('protected-family-release-abort'),r=first.sources,other=second.sources,db=await first.open(),independentDb=await second.open(),native=db.transaction;
        try{
          equal((await r.replace(await make(r,'A'))).outcome,'activated','Seed retirement');const before=await r.inspect('A',[]);let aborted=false;
          db.transaction=/** Abort only original-handle lease deletion, preserving the committed protective record. */function(stores,mode,...args){const tx=native.call(this,stores,mode,...args);if(!aborted&&mode==='readwrite'&&stores.length===1&&stores[0]==='meta'){aborted=true;queueMicrotask(/** Abort after the delete request is queued but before commit. */()=>tx.abort());}return tx;};
          equal(await r.visit('A','metadata',/** Complete authentic reading before the independent retirement failure. */()=>true),'ready','Existing conservative release contract is preserved');db.transaction=native;
          equal(aborted,true,'Actual release transaction aborted');equal(r.decodeBytes,0,'Release failure cannot retain private decode');equal(r.readers.size,0,'Ended reader is no longer active');
          equal(await requestValue(independentDb.transaction('meta').objectStore('meta').index('sourceLease').count(['A',before.head.sourceRevision])),1,'Failed deletion remains protective across connections');
          equal((await other.replace(await make(other,'A',before.expected,'Field:: [[Next]]'))).outcome,'activated','Independent later edit remains live');
          equal(await other.cleanupRevision('A',before.head.sourceRevision),false,'Retained lease still refuses unsafe reclamation');
          // The ordinary cache owner may close the first connection after an unexpected native
          // release abort. Cleanup uses the independent live handle, never a closing DB object.
          await edit(independentDb,['meta'],/** Remove only this fixture's proven-ended retained lease through the independent handle. */async tx=>{const store=tx.objectStore('meta');const keys=await requestValue(store.index('sourceLease').getAllKeys(['A',before.head.sourceRevision]));for(const key of keys)store.delete(key);});
          ok(await other.cleanupRevision('A',before.head.sourceRevision),'Fixture-owned ended lease can be explicitly cleaned after proof');equal(await other.visit('A','metadata',/** Confirm current-family integrity after explicitly reclaiming the old revision. */()=>true),'ready','Current facts are intact');return true;
        }finally{db.transaction=native;first.close();second.close();}
      })()`),true);
    });
  }finally{await browser.cleanup();}
});

/** One-page head validation removes only redundant coordination; native snapshots and masks remain authoritative. */
test("bounded atomic selection validation preserves local masks and multi-page finality", { timeout: 180000 }, async t => {
  const browser = await chromiumHarness(bundle);
  try {
    await browser.evaluate(initialize);
    /** Count real repository transactions only after canonical durable sources have been seeded. */
    await t.test("one atomic transaction validates a current bounded selection without changing its heads", async () => {
      assert.equal(await browser.evaluate(`(async()=>{
        const owner=await fresh('selection-one-page'),r=owner.sources;
        const transaction=r.transaction,calls=[];
        try{
          for(const id of ['A','B'])equal((await r.replace(await make(r,id))).outcome,'activated','Seed '+id);
          const a=await r.inspect('A',[]),b=await r.inspect('B',[]);
          const stamps=[{head:a.head,sequence:a.sequence,saved:a.saved},{head:b.head,sequence:b.sequence,saved:b.saved}];
          /** Forward native work unchanged while counting its declared transaction scope. */
          r.transaction=function(...args){calls.push({stores:[...args[1]].sort(),mode:args[2]});return transaction.apply(this,args);};
          equal((await r.validateSelections([],()=>true)).reason,'ready','Empty scope is valid');equal(calls.length,0,'Empty scope performs no storage work');
          for(const selected of [stamps.slice(0,1),stamps]){
            calls.length=0;equal((await r.validateSelections(selected,()=>true)).reason,'ready','Current selected heads close');
            equal(calls,[{stores:['meta','sourceHeads'],mode:'readonly'}],'One atomic head/sequence transaction replaces three coordination transactions');
          }
          r.transaction=transaction;
          equal((await r.inspect('A',[])).head,a.head,'Read preserves A');equal((await r.inspect('B',[])).head,b.head,'Read preserves B');
          return true;
        }finally{r.transaction=transaction;owner.close();}
      })()`),true);
    });
    /** Cross-connection activation before the atomic read must invalidate the original selection. */
    await t.test("replacement before the atomic snapshot and an actual durable tombstone reject old selections", async () => {
      assert.equal(await browser.evaluate(`(async()=>{
        const first=await fresh('selection-replacement'),second=await fresh('selection-replacement'),r=first.sources,other=second.sources;
        const transaction=r.transaction;let release;
        try{
          equal((await r.replace(await make(r,'A'))).outcome,'activated','Seed selected owner');const before=await r.inspect('A',[]);
          const stamp={head:before.head,sequence:before.sequence,saved:before.saved};let signal,paused=false;
          const reached=new Promise(resolve=>signal=resolve),gate=new Promise(resolve=>release=resolve);
          /** Pause before starting the head snapshot, without holding a native transaction open. */
          r.transaction=async function(...args){
            if(!paused&&args[2]==='readonly'&&args[1].includes('sourceHeads')&&args[1].includes('meta')){paused=true;signal();await gate;}
            return transaction.apply(this,args);
          };
          const pending=r.validateSelections([stamp],()=>true);await reached;
          equal((await other.replace(await make(other,'A',before.expected,'Field:: [[New]]'))).outcome,'activated','Independent writer commits before snapshot');
          release();const stale=await pending;equal(stale.reason,'superseded','Old selected tuple rejected');
          r.transaction=transaction;const current=await r.inspect('A',[]);
          equal((await other.tombstone('A')).outcome,'activated','Independent owner commits actual tombstone');
          equal((await r.validateSelections([{head:current.head,sequence:current.sequence,saved:current.saved}],()=>true)).reason,'tombstone','Retired head is not current authority');
          return true;
        }finally{release?.();r.transaction=transaction;first.close();second.close();}
      })()`),true);
    });
    /** The sequence remains validated even though a one-page scope needs no cross-page comparison. */
    await t.test("missing sequence retains zero semantics and malformed sequence fails closed", async () => {
      assert.equal(await browser.evaluate(`(async()=>{
        const owner=await fresh('selection-sequence-shape'),r=owner.sources,db=await owner.open();let sequence;
        try{
          equal((await r.replace(await make(r,'A'))).outcome,'activated','Seed selected owner');const selected=await r.inspect('A',[]);
          const stamp={head:selected.head,sequence:selected.sequence,saved:selected.saved};
          sequence=await requestValue(db.transaction('meta').objectStore('meta').get('source-sequence'));
          await edit(db,['meta'],tx=>tx.objectStore('meta').delete('source-sequence'));
          equal((await r.validateSelections([stamp],()=>true)).reason,'ready','Missing counter is the established zero observation');
          await edit(db,['meta'],tx=>tx.objectStore('meta').put({key:'source-sequence',value:'invalid'}));
          equal((await r.validateSelections([stamp],()=>true)).reason,'catalog-uncertain','Malformed sequence cannot certify a selection');
          ok(r.getDiagnostics().storage!=='unavailable','Invalid domain data is not a native storage failure');
          return true;
        }finally{if(sequence)await edit(db,['meta'],tx=>tx.objectStore('meta').put(sequence));owner.close();}
      })()`),true);
    });
    /** Late local changes must mask a snapshot even after its native read transaction has completed. */
    await t.test("memory overlays, pending retirement, cancellation and close win after storage awaits", async () => {
      assert.equal(await browser.evaluate(`(async()=>{
        for(const mode of ['memory','retirement','cancel','close']){
          const owner=await fresh('selection-late-'+mode),r=owner.sources,transaction=r.transaction,open=r.storage.open;
          let release,releaseRetirement,retiring,live=true;
          try{
            equal((await r.replace(await make(r,'A'))).outcome,'activated','Seed '+mode);const before=await r.inspect('A',[]);
            const stamp={head:before.head,sequence:before.sequence,saved:before.saved};let signal,paused=false;
            const reached=new Promise(resolve=>signal=resolve),gate=new Promise(resolve=>release=resolve);
            /** Hold only the completed result so a local change occurs before the final overlay sweep. */
            r.transaction=async function(...args){
              const result=await transaction.apply(this,args);
              if(!paused&&args[2]==='readonly'&&args[1].includes('sourceHeads')&&args[1].includes('meta')){paused=true;signal();await gate;}
              return result;
            };
            const pending=r.validateSelections([stamp],()=>live);await reached;
            if(mode==='memory'){
              r.storage.open=async()=>null;
              equal((await r.replace(await make(r,'A',before.expected,'Field:: [[Unsaved]]'))).outcome,'unsaved','Actual unsaved replacement masks prior disk selection');
              r.storage.open=open;
            }else if(mode==='retirement'){
              const prerequisite=new Promise(resolve=>releaseRetirement=resolve);
              retiring=r.tombstone('A',()=>true,false,prerequisite);ok(r.pendingDeletes.has('A'),'Production retirement masks owner before its prerequisite');
            }else if(mode==='cancel')live=false;
            else owner.close();
            release();const result=await pending;
            equal(result.reason,mode==='memory'?'superseded':mode==='retirement'?'tombstone':'cancelled','Late '+mode+' cannot return ready');
            if(mode==='retirement'){releaseRetirement();await retiring;}
          }finally{release?.();releaseRetirement?.();if(retiring)await retiring;r.transaction=transaction;r.storage.open=open;owner.close();}
        }
        return true;
      })()`),true);
    });
    /** Real distinct owners cross the batch boundary; both intermediate and closing sequence fences remain. */
    await t.test("256 heads share one transaction while 257 retain page and final source-sequence fences", async () => {
      assert.equal(await browser.evaluate(`(async()=>{
        const first=await fresh('selection-page-boundary'),second=await fresh('selection-page-boundary'),r=first.sources,other=second.sources;
        const transaction=r.transaction,stamps=[],calls=[];let phase='count',pages=0;
        try{
          for(let index=0;index<=sourceModules.SOURCE_MAX_BATCH_RECORDS;index++){
            const id='Owner-'+index;equal((await r.replace(await make(r,id,{kind:'missing'},''))).outcome,'activated','Seed distinct owner '+index);
            const selected=await r.inspect(id,[]);stamps.push({head:selected.head,sequence:selected.sequence,saved:selected.saved});
          }
          /** Observe actual page completion, then admit an independent writer at that real await boundary. */
          r.transaction=async function(...args){
            const value=await transaction.apply(this,args);calls.push({stores:[...args[1]].sort(),mode:args[2]});
            if(args[2]==='readonly'&&args[1].includes('sourceHeads')&&args[1].includes('meta')){
              pages++;
              if(phase==='between'&&pages===1){
                const before=await other.inspect('Owner-0',[]);
                equal((await other.replace(await make(other,'Owner-0',before.expected,'Field:: [[Changed]]'))).outcome,'activated','Selected owner changes after first page');
              }else if(phase==='closing'&&pages===2){
                equal((await other.replace(await make(other,'Unselected',{kind:'missing'},''))).outcome,'activated','Unrelated owner advances source sequence after last page');
              }
            }
            return value;
          };
          equal((await r.validateSelections(stamps.slice(0,sourceModules.SOURCE_MAX_BATCH_RECORDS),()=>true)).reason,'ready','Exact maximum single page validates');
          equal(calls,[{stores:['meta','sourceHeads'],mode:'readonly'}],'Maximum eligible page still uses one atomic transaction');
          calls.length=0;pages=0;
          equal((await r.validateSelections(stamps,()=>true)).reason,'ready','Every distinct owner validates across pages');
          equal(calls.length,4,'Two head pages retain separate initial and final sequence transactions');equal(pages,2,'No selected owner prefix returned');
          for(const mode of ['between','closing']){
            phase=mode;pages=0;const result=await r.validateSelections(stamps,()=>true);
            equal(result.reason,'superseded','Source sequence closes '+mode+' drift');
            if(mode==='between'){const selected=await r.inspect('Owner-0',[]);stamps[0]={head:selected.head,sequence:selected.sequence,saved:selected.saved};}
          }
          return true;
        }finally{r.transaction=transaction;first.close();second.close();}
      })()`),true);
    });
  } finally { await browser.cleanup(); }
});
