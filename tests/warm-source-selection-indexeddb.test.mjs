/**
 * PR212 real-IDB contracts for call-local dependency/head observations and exact protected metadata.
 * Existing production fixtures seed canonical facts; cross-connection writes, masks, native events
 * and storage faults remain real operations or explicit fault injection. Every profile is disposable.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { warmSelectionScenario as scenario } from './support/warmSourceSelectionBrowser.mjs';

test('restart metadata copies the complete bounded family without persistent lease writes', async () => {
  assert.equal(await scenario('restart-copy-clean', String.raw`
    const selected=await r.inspectWithLocalDependencies(id,0,0),observer=B.observe(r);
    let metadata;
    try {metadata=await f.acquisition.durableHostInventory(id,()=>true,selected.inspection.expected,true);}
    finally {observer.retire();}
    equal(metadata.reason,'ready','Copied family authenticates');
    equal(metadata.facts,f.acquisition.currentHostInventory(file,f.metadata.get(id)),'Exact host inventory');
    equal(observer.totals.leaseAdds,0,'No persistent reader write');equal(observer.totals.leaseDeletes,0,'No persistent release write');
    equal(observer.totals.transactions['readonly|sourceChunks,sourceHeads,sourcePostings'],1,'Atomic copy');
    equal(observer.totals.transactions['readonly|sourceHeads'],1,'Closing exact head fence');
    equal(observer.totals.hashes,3,'All digests retained');equal(observer.totals.decodes,1,'Bounded single decode');
  `),true);
});

for (const mutation of ['revision','sequence','overlay','cancel','close','reclaim']) {
  test(`copied restart metadata retains final authority after ${mutation} during hashing`, async () => {
    assert.equal(await scenario('restart-copy-'+mutation, String.raw`
      const selected=await r.inspectWithLocalDependencies(id,0,0),digest=r.runtime.digest;
      let changed=false,live=true;
      r.runtime.digest=async function(...args){const result=await digest.apply(this,args);if(!changed){changed=true;
        if(${JSON.stringify(mutation)}==='cancel')live=false;
        if(${JSON.stringify(mutation)}==='close')r.close();
        if(${JSON.stringify(mutation)}==='overlay')r.unsaved.add(id);
        if(['revision','sequence'].includes(${JSON.stringify(mutation)}))await edit(db,[M.SOURCE_HEAD_STORE],tx=>tx.objectStore(M.SOURCE_HEAD_STORE).put({
          ...originalHead,sourceRevision:${mutation === 'revision' ? "originalHead.sourceRevision+'-changed'" : 'originalHead.sourceRevision'},sequence:originalHead.sequence+1}));
        if(${JSON.stringify(mutation)}==='reclaim')await edit(db,[M.SOURCE_CHUNK_STORE,M.SOURCE_POSTING_STORE],tx=>{
          tx.objectStore(M.SOURCE_CHUNK_STORE).clear();tx.objectStore(M.SOURCE_POSTING_STORE).clear();});
      }return result;};
      try {const result=await f.acquisition.durableHostInventory(id,()=>live,selected.inspection.expected,true);
        ok(changed,'Crypto await reached');equal(result.reason,${['cancel','close'].includes(mutation) ? "'cancelled'" : mutation==='reclaim' ? "'ready'" : mutation==='overlay'?"'unsaved'":"'superseded'"},'Copied bytes do not replace selection authority');
      }finally{r.runtime.digest=digest;r.unsaved.delete(id);}
    `),true);
  });
}

for (const damage of ['sha','posting']) {
  test(`copied restart metadata rejects ${damage} corruption`, async () => {
    assert.equal(await scenario('restart-copy-corrupt-'+damage,String.raw`
      const selected=await r.inspectWithLocalDependencies(id,0,0);await B.corruptMetadata(c,${JSON.stringify(damage)});
      const result=await f.acquisition.durableHostInventory(id,()=>true,selected.inspection.expected,true);
      equal(result.reason,${damage==='sha'?"'invalid-chunk'":"'invalid-posting'"},'Canonical authentication retained');
    `),true);
  });
}

for (const mode of ['dense','legacy']) {
  test(`restart ${mode} metadata retains the leased fallback`, async () => {
    assert.equal(await scenario('restart-copy-fallback-'+mode,String.raw`
      if(${mode==='legacy'})await B.prepareControl(c,'legacy');
      const selected=await r.inspectWithLocalDependencies(id,0,0),observer=B.observe(r);let result;
      try{result=await f.acquisition.durableHostInventory(id,()=>true,selected.inspection.expected,true);}finally{observer.retire();}
      equal(result.reason,'ready','Fallback authenticates');ok(observer.totals.leaseAdds>0,'Dense/legacy immutable data remains leased');
    `,{dense:mode==='dense',urlFree:mode==='legacy'}),true);
  });
}

test('clean warm observation shares one native selection and preserves protected metadata authentication', /** Count native work rather than inferring it from public wrapper calls. */async () => {
  assert.equal(await scenario('warm-selection-clean', String.raw`
    const observer=B.observe(r);let selected,metadata;
    try{
      selected=await r.inspectWithLocalDependencies(id,0,0);
      equal(selected.dependencyReason,'ready','Clean dependency proof');equal(selected.inspection.head,originalHead,'Exact copied head');
      metadata=await f.acquisition.durableHostInventory(id,/** Keep this isolated request live through the controlled phase. */()=>true,selected.inspection.expected);
    }finally{observer.retire();}
    equal(metadata.reason,'ready','Independent protected family authenticates');
    equal(metadata.facts,f.acquisition.currentHostInventory(file,f.metadata.get(id)),'Exact host facts');
    equal(observer.totals.transactions['readonly|sourceHeads']??0,0,'No duplicate head-only transaction');
    equal(observer.totals.transactions['readonly|meta,sourceHeads,sourceLocalDependencyOwners,sourceLocalDependencyRepairs'],1,'One atomic dependency/head selection');
    equal(observer.totals.leaseAdds,1,'Normal immutable-family protection');equal(observer.totals.leaseDeletes,1,'Normal retirement');
    equal(observer.totals.hashes,3,'No metadata authentication skipped');equal(observer.totals.decodes,1,'One authenticated metadata decode');
    equal((await r.inspect(id,[])).head,originalHead,'No source rewrite');
  `), true);
});

for (const mode of ['revision', 'sequence']) {
  test(`${mode} change on an independent connection rejects the old observation before delivering metadata`, /** Retained identical family bytes do not make a newer selected head interchangeable. */async () => {
    assert.equal(await scenario(`warm-selection-${mode}`, String.raw`
      const selected=await r.inspectWithLocalDependencies(id,0,0),other=new M.KplexIndexedDbCache(c.name);
      try{
        ok(await other.open(),'Independent native connection');
        equal((await other.sources.replace({sourceId:id,expected:selected.inspection.expected,
          physical:originalHead.physical,observation:originalHead.observation,bodyParserVersion:originalHead.bodyParserVersion,
          families:originalHead.families})).outcome,'activated','Independent source CAS');
        const next=await other.sources.inspect(id,[]);
        const expected=${mode === 'sequence' ? "{...selected.inspection.expected,revision:next.head.sourceRevision}" : 'selected.inspection.expected'};
        let consumed=0;
        equal(await r.visit(id,'metadata',/** Count any incorrectly delivered records from a changed selection. */()=>{consumed++;return true;},/** Keep this isolated request live through the controlled phase. */()=>true,expected),'superseded','Exact revision and sequence required');
        equal(consumed,0,'No different selected family is delivered under an old observation');
        const fresh=await r.inspectWithLocalDependencies(id,0,0);
        equal(fresh.dependencyReason,'ready','Fresh observation recovers');
        equal((await f.acquisition.durableHostInventory(id,/** Keep this isolated request live through the controlled phase. */()=>true,fresh.inspection.expected)).reason,'ready','Fresh protected metadata remains readable');
      }finally{other.close();}
    `), true);
  });
}

test('head replacement while metadata SHA is awaited rejects the final comparison', /** Immutable old bytes remain protected but cannot certify a still-current source selection. */async () => {
  assert.equal(await scenario('warm-selection-mid-auth', String.raw`
    const selected=await r.inspectWithLocalDependencies(id,0,0),other=new M.KplexIndexedDbCache(c.name),digest=r.runtime.digest;
    let changed=false;
    try{
      ok(await other.open(),'Independent writer opens before the held reader');
      r.runtime.digest=/** Forward the original operation and inject one controlled transition. */async function(...args){
        const result=await digest.apply(this,args);
        if(!changed){changed=true;equal((await other.sources.replace({sourceId:id,expected:selected.inspection.expected,
          physical:originalHead.physical,observation:originalHead.observation,bodyParserVersion:originalHead.bodyParserVersion,
          families:originalHead.families})).outcome,'activated','Independent writer changes the selected head during authentication');}
        return result;
      };
      const metadata=await f.acquisition.durableHostInventory(id,/** Keep this isolated request live through the controlled phase. */()=>true,selected.inspection.expected);
      ok(changed,'Actual crypto await reached');equal(metadata.reason,'superseded','End-of-proof source head still must match');
    }finally{r.runtime.digest=digest;other.close();}
  `), true);
});

for (const mode of ['dense', 'legacy']) {
  test(`${mode} metadata retains normal frame, posting and lease behavior`, /** Large or accepted legacy facts retain their original authentication path. */async () => {
    assert.equal(await scenario(`warm-selection-${mode}`, String.raw`
      if(${mode === 'legacy'})await B.prepareControl(c,'legacy');
      const before=await r.inspect(id,[]),selected=await r.inspectWithLocalDependencies(id,0,0);
      equal(selected.dependencyReason,'ready','Supported dependency validation');
      equal(selected.inspection.head,before.head,'Original current/legacy marker is not rewritten');
      if(${mode === 'dense'})ok(before.head.families.metadata.chunks>1,'Actual multichunk metadata');
      equal((await f.acquisition.durableHostInventory(id,/** Keep this isolated request live through the controlled phase. */()=>true,selected.inspection.expected)).reason,'ready','All chunks/postings authenticate');
    `, { dense: mode === 'dense', urlFree: mode === 'legacy' }), true);
  });
}

for (const damage of ['sha', 'posting']) {
  test(`${damage} corruption is not authorized by a healthy dependency/head observation`, /** Readonly dependency consistency never replaces immutable-family authenticity. */async () => {
    assert.equal(await scenario(`warm-selection-corrupt-${damage}`, String.raw`
      const selected=await r.inspectWithLocalDependencies(id,0,0);
      await B.corruptMetadata(c,${JSON.stringify(damage)});
      const result=await f.acquisition.durableHostInventory(id,/** Keep this isolated request live through the controlled phase. */()=>true,selected.inspection.expected);
      equal(result.reason,${damage === 'sha' ? "'invalid-chunk'" : "'invalid-posting'"},'Original failure classification');
      ok(!f.acquisition.restartInventoryChecked,'No comparison authority granted by a head receipt');
      await B.subsequentEdit(c);equal((await f.acquisition.durableHostInventory(id,/** Keep this isolated request live through the controlled phase. */()=>true)).reason,'ready','Ordinary edit repairs the selected source');
    `), true);
  });
}

test('supported parser2 inspection still authenticates its URL family before dependency reuse', /** A parser marker alone cannot bless corrupted primary URL bytes. */async () => {
  assert.equal(await scenario('warm-selection-legacy-auth', String.raw`
    const saved=await r.inspect(id,[]);
    ok(saved.head.families['body-urls'].records>0,'Genuine primary URL family');
    const family=saved.head.families['body-urls'],key=[id,family.revision,'body-urls',0];
    const chunk=await value(db.transaction(M.SOURCE_CHUNK_STORE).objectStore(M.SOURCE_CHUNK_STORE).get(key));
    await edit(db,[M.SOURCE_HEAD_STORE],/** Mutate only this fixture's explicitly named durable records. */tx=>tx.objectStore(M.SOURCE_HEAD_STORE).put({...saved.head,bodyParserVersion:2}));
    await edit(db,[M.SOURCE_CHUNK_STORE],/** Mutate only this fixture's explicitly named durable records. */tx=>tx.objectStore(M.SOURCE_CHUNK_STORE).put({...chunk,digest:'0'.repeat(64)}));
    const result=await r.inspectWithLocalDependencies(id,0,0);
    equal(result.dependencyReason,'invalid-chunk','Legacy primary URL authentication cannot be skipped');
    equal(result.inspection.reason,'invalid-chunk','Original compatibility failure classification');
    await edit(db,[M.SOURCE_CHUNK_STORE],/** Mutate only this fixture's explicitly named durable records. */tx=>tx.objectStore(M.SOURCE_CHUNK_STORE).put(chunk));
    await edit(db,[M.SOURCE_HEAD_STORE],/** Mutate only this fixture's explicitly named durable records. */tx=>tx.objectStore(M.SOURCE_HEAD_STORE).put(saved.head));
  `), true);
});

