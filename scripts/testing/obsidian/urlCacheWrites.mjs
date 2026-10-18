/**
 * Native #153 D measurement gate. Observe the installed six-owner URL refresh/persistence pipeline
 * with exact prepared native parser inputs, then compare isolated real-IDB batch sizes. Transaction
 * complete events, inclusive waits and uninstrumented trials remain distinct. No production queue,
 * storage schema, admission, scheduler or authority behavior is substituted. Owns only fixture resources.
 */
import {runControlledProbe} from './controlledProbe.mjs';
import {nativeUrlFixture,nativeUrlGraphValue} from './nativeUrlFixture.mjs';

/** Measure real installed owners and cache transactions in an isolated namespace after native setup. */
async function scenario(app,c){
  const f=await nativeUrlFixture(app,'[Fixed label](https://shared.example/path)',c,512),indexes=[],rows=[];
  try{
    const crypto=require('node:crypto');
    const filesByPath=new Map(f.files.map(/** Retain exact identities outside all observation scopes. */file=>[file.path,file]));
    /** Union observed complete-event intervals; this includes event-loop/storage latency, not disk CPU alone. */
    const union=intervals=>{let total=0,end=-Infinity;for(const [start,stop] of [...intervals].sort(/** Merge intervals by starting timestamp, retaining overlaps only once. */(a,b)=>a[0]-b[0])){total+=Math.max(0,stop-Math.max(start,end));end=Math.max(end,stop);}return total;};
    for(const observe of [true,false,false,false]){
      const i=new f.index.constructor(f.index.plugin,f.index.app),cache=i.indexedDb;indexes.push(i);c.index=i;
      f.check(await cache.open(),'Isolated URL cache opens');
      const transact=cache.openTransaction,put=cache.putUrlOwners,parse=i.metadataParser.parse,scheduler=i.workScheduler,paced=scheduler.pacedCheckpoint;
      const work={transactions:0,completed:0,aborted:0,records:0,maxRecords:0,maxPendingWrites:0,maxReadActive:0,maxReadBytes:0,putWaitMs:0,putCalls:0,putSyncMs:0,transactionIntervals:[],idleIntervals:[]};
      i.metadataParser.parse=/** Count actual trial parser calls rather than only fixture setup. */function(...args){f.operations.parses++;return parse.apply(this,args);};
      if(observe){
        scheduler.pacedCheckpoint=/** Observe each newly owned idle promise without changing pacing, results or promise identity. */function(...args){
          const before=this.idleWait,result=paced.apply(this,args),idle=this.idleWait;
          if(idle&&idle!==before){const at=performance.now();idle.then(/** Completion includes the original timer/event-loop/microtask delay. */()=>work.idleIntervals.push([at,performance.now()]),/** Observations must not create a derived unhandled rejection. */()=>{});}
          return result;
        };
        cache.openTransaction=/** Observe actual completion without replacing request/transaction handlers. */function(...args){
          const tx=transact.apply(this,args);
          if(args[1]==='urlOwners'&&args[2]==='readwrite'){
            const at=performance.now();work.transactions++;
            const store=tx.objectStore('urlOwners'),write=store.put,own=Object.getOwnPropertyDescriptor(store,'put');
            store.put=/** Attribute actual synchronous clone/enqueue duration; retain the original IDBRequest. */function(...values){const start=performance.now();try{return write.apply(this,values);}finally{work.putCalls++;work.putSyncMs+=performance.now()-start;}};
            /** Release only this transaction's temporary native-store method property. */
            const release=()=>{if(own)Object.defineProperty(store,'put',own);else delete store.put;};
            tx.addEventListener('complete',release,{once:true});tx.addEventListener('abort',release,{once:true});
            tx.addEventListener('complete',/** A request success is not a committed transaction. */()=>{work.completed++;work.transactionIntervals.push([at,performance.now()]);},{once:true});
            tx.addEventListener('abort',/** Preserve actual abort accounting and the production rejection. */()=>{work.aborted++;},{once:true});
          }
          return tx;
        };
        cache.putUrlOwners=/** Preserve original promise/results and sample current read/write reservations. */function(records,...args){
          work.records+=records.length;work.maxRecords=Math.max(work.maxRecords,records.length);
          work.maxPendingWrites=Math.max(work.maxPendingWrites,i.urlCacheWrites.size);
          work.maxReadActive=Math.max(work.maxReadActive,i.urlReadActive);work.maxReadBytes=Math.max(work.maxReadBytes,i.urlReadBytes);
          const at=performance.now(),task=put.call(this,records,...args);
          task.then(/** Inclusive put waits overlap and must not be summed as exclusive disk time. */()=>{work.putWaitMs+=performance.now()-at;},/** Keep diagnostics from introducing an unhandled derived rejection. */()=>{});
          return task;
        };
      }
      const before=f.foreground();f.begin();const at=performance.now();
      // Mirror background-wave context without claiming closure for unrelated native vault notes.
      i.urlDiscoveryRunning=true;
      for(let start=0;start<f.files.length;start+=6)await Promise.all(f.files.slice(start,start+6).map(/** Actual production admission and serial publisher receive already parsed current source facts. */file=>i.refreshUrlOwner(file.path,false,undefined,{file,body:f.body,revision:{mtime:file.stat.mtime,size:file.stat.size}},true)));
      i.urlDiscoveryRunning=false;
      i.flushUrlPublication();const elapsedMs=performance.now()-at;f.end();
      cache.openTransaction=transact;cache.putUrlOwners=put;i.metadataParser.parse=parse;scheduler.pacedCheckpoint=paced;
      f.check(f.operations.reads===0&&f.operations.parses===0,'Prepared source facts require no duplicate acquisition');
      f.check(i.urlReadActive===0&&i.urlReadBytes===0&&i.urlReadWaiters.length===0&&i.urlCacheWrites.size===0&&i.urlOwnerTasks.size===0,'Pipeline fully drained');
      let restored=0;f.check(await cache.readUrlOwners(/** Validate exact native revision and complete compact facts outside observation. */async records=>{restored+=records.length;for(const record of records){const file=filesByPath.get(record.path);f.check(file&&record.mtime===file.stat.mtime&&record.size===file.stat.size&&JSON.stringify(record.urls)===JSON.stringify(f.body.urls)&&JSON.stringify(record.inlineFieldOccurrences)===JSON.stringify(f.body.inlineFieldOccurrences)&&JSON.stringify(record.frontmatter)===JSON.stringify(i.urlOwnerFrontmatter.get(record.path)),'Cached compact facts');}},/** This test index remains alive through readback. */()=>true),'Cache readback');
      f.check(restored===512,'All actual transactions committed current owners');
      if(observe)f.check(work.transactions>0&&work.transactions===work.completed&&work.aborted===0&&work.records===512&&work.putCalls===512,'Actual transaction and record observations close');
      const after=f.foreground();f.check(!before.hidden&&before.documentFocused&&before.windowFocused&&!after.hidden&&after.documentFocused&&after.windowFocused,'Native foreground retained');
      const digest=crypto.createHash('sha256').update(JSON.stringify(nativeUrlGraphValue(i))).digest('hex');
      f.check([before,after].every(/** Observe no competing primary fixture-event inventory at either boundary. */value=>!value.primary.urlRunning&&!value.primary.publications&&!value.primary.owners&&!value.primary.writes&&!value.primary.sourceInventory),'Primary inventory settled');
      rows.push({observe,...(observe?{...work,transactionUnionMs:union(work.transactionIntervals),idleUnionMs:union(work.idleIntervals),combinedUnionMs:union([...work.transactionIntervals,...work.idleIntervals])}:{elapsedMs}),scheduler:i.getWorkPriorityDiagnostics(),operations:{...f.operations},restored,before,after,graphDigest:digest});
      i.destroy();c.index=f.index;
    }
    f.check(rows.every(/** No sorting or identity suppression hides graph differences between observations. */row=>row.graphDigest===rows[0].graphDigest),'Identical final graph/evidence');
    const cache=f.index.indexedDb;f.check(await cache.open(),'Batch-only namespace opens');
    const records=f.files.map(/** Actual parsed URL facts, without raw Markdown, form bounded diagnostic batches. */file=>({path:file.path,mtime:file.stat.mtime,size:file.stat.size,urls:f.body.urls,inlineFieldOccurrences:f.body.inlineFieldOccurrences,frontmatter:{}})),batchOnly=[];
    for(let trial=0;trial<3;trial++)for(const batchSize of [[1,6,64],[64,6,1],[6,1,64]][trial]){
      const at=performance.now();let transactions=0;
      for(let start=0;start<records.length;start+=batchSize){const batch=records.slice(start,start+batchSize);f.check(await cache.putUrlOwners(batch,/** Check exactly the same total records for each batch-size trial. */()=>batch.every(record=>{const file=filesByPath.get(record.path);return app.vault.getFileByPath(record.path)===file&&file.stat.mtime===record.mtime&&file.stat.size===record.size;})),'Batch-only transaction completes');transactions++;}
      batchOnly.push({batchSize,trial,transactions,elapsedMs:performance.now()-at});
    }
    const concurrentSingletons=[],serialization=[];
    for(let trial=0;trial<3;trial++){
      const at=performance.now();for(let start=0;start<records.length;start+=6)await Promise.all(records.slice(start,start+6).map(/** Match current singleton concurrency without graph/compiler work or a scheduler substitution. */record=>cache.putUrlOwners([record],/** Each singleton retains its own exact native fence. */()=>{const file=filesByPath.get(record.path);return app.vault.getFileByPath(record.path)===file&&file.stat.mtime===record.mtime&&file.stat.size===record.size;}))).then(/** Failed real transactions cannot masquerade as a timing success. */results=>f.check(results.every(Boolean),'Concurrent singleton commits'));
      concurrentSingletons.push({trial,transactions:512,concurrency:6,elapsedMs:performance.now()-at});
      const start=performance.now();let bytes=0,largest=0;for(const record of records){const size=JSON.stringify(record).length*2;bytes+=size;largest=Math.max(largest,size);}serialization.push({trial,records:records.length,utf16JsonBytes:bytes,largestUtf16JsonBytes:largest,elapsedMs:performance.now()-start});
    }
    return {owners:512,runtime:{node:process.versions.node,electron:process.versions.electron,chrome:process.versions.chrome,platform:process.platform},rows,batchOnly,concurrentSingletons,serialization,limitations:'Prepared-input production refresh plus isolated batch potential; observed waits include event-loop latency and overlapping idle intervals. JSON UTF16 estimates are not decoded heap or IDB bytes. Batch-only gains do not prove a safe production batching implementation or whole-vault startup/paint gain.'};
  }finally{f.end();for(const i of indexes)i.destroy();await f.close();}
}

await runControlledProbe('url-cache-writes',scenario,`const nativeUrlFixture=${nativeUrlFixture.toString()};const nativeUrlGraphValue=${nativeUrlGraphValue.toString()};`,['src/index/UrlAdjacencyMap.ts']);
