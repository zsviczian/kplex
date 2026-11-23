/** Real IndexedDB event convergence through production acquisition; only native host facts are doubled. */
import assert from 'node:assert/strict';
import test from 'node:test';
import { contributorBrowserBundle, contributorBrowserInitialize } from './support/contributorBrowserFixture.mjs';
import { chromiumHarness } from './support/browserTypeScript.mjs';

const bundle = await contributorBrowserBundle();

/** Reopen durable source authority and deliver real Vault-shaped folder/descendant rename waves. */
async function startupFolderRenameScenario(mode) {
  const f = await fixture('startup-rename-admission-' + mode);
  const parent = f.app.vault.getRoot(), folders = new Map([['/', parent], ['', parent]]), branches = [];
  const sleep = ms => new Promise(done => setTimeout(done, ms));
  let source, releaseComparison;
  try {
    parent.children = [];
    for (let n = 0; n < 3; n++) {
      const name = 'Folder' + n, folder = new ContributorFolder(), file = f.add(name + '/Note.md', 'Value:: ' + n);
      Object.assign(folder, {path: name, name, parent, children: [file]});
      file.parent = folder;
      parent.children.push(folder);
      folders.set(name, folder);
      branches.push({folder, file, original: file.path});
    }
    f.app.vault.getRoot = () => parent;
    f.app.vault.getFolderByPath = path => folders.get(path) ?? null;
    f.app.vault.getAbstractFileByPath = path => f.files.get(path) ?? folders.get(path) ?? null;
    await f.acquire();
    ok(await f.acquisition.reconcile(), 'Seed actual durable source authority');
    f.acquisition.close();
    let nativeClean = mode !== 'busy', inventories = 0;
    if (mode !== 'no-readiness') f.app.metadataCache.isCacheClean = () => nativeClean;
    source = new sourceModules.ObsidianSourceAcquisition(f.app, f.cache, async text => sourceModules.parseBodyMetadata(text), undefined, undefined, {
      recordWork(key) {if (key === 'sourceInventoryPasses') inventories++;},
      phase() {}, processed() {}, count() {}, mark() {},
    });
    const rename = n => {
      const {folder, file} = branches[n], prior = folder.path, oldFile = file.path;
      const metadata = f.metadata.get(oldFile), text = f.texts.get(oldFile);
      folders.delete(prior);
      folder.path = folder.name = 'Moved' + n;
      folders.set(folder.path, folder);
      f.files.delete(oldFile);
      file.path = folder.path + '/Note.md';
      f.files.set(file.path, file);
      f.metadata.set(file.path, metadata);
      f.texts.set(file.path, text);
      f.app.vault.trigger('rename', folder, prior);
      f.app.vault.trigger('rename', file, oldFile);
      f.app.metadataCache.trigger('resolve', file);
      f.app.metadataCache.trigger('resolved');
    };
    source.enableInventory();
    rename(0);

    if (mode === 'late') {
      let reached;
      const entered = new Promise(done => reached = done), hold = new Promise(done => releaseComparison = done);
      const compare = source.reconcileRestartHostInventory;
      let held = false;
      source.reconcileRestartHostInventory = async function (...args) {
        if (inventories > 0 && !held) {held = true; reached(); await hold;}
        return compare.apply(this, args);
      };
      const first = source.reconcile();
      await Promise.race([entered, sleep(4000).then(() => ok(held, 'Source census never started'))]);
      rename(1);
      releaseComparison();
      equal(await first, false, 'A native move after census must reject the captured pass');
      ok(!source.hasSemanticDependencies(), 'Obsolete inventory cannot grant write authority');
      ok(await source.flush(), 'The later move settles with current coordinates');
      equal(inventories, 2, 'Exactly one restart for the post-capture mutation');
      return true;
    }

    const first = source.reconcile();
    if (mode === 'pause' || mode === 'close') {
      const joined = source.flush();
      await sleep(65);
      if (mode === 'pause') source.pauseInventory(); else source.close();
      equal(await first, false, 'Retirement releases a waiting caller');
      equal(await joined, false, 'Retired flush must not independently start an audit');
      equal(inventories, 0, 'Retired admission never starts an audit');
      ok(!source.hasSemanticDependencies(), 'Retired admission grants no authority');
      if (mode === 'pause') {source.resumeInventory(true);ok(await source.flush(), 'Resume reopens normal admission');}
      return true;
    }
    if (mode === 'busy') {
      f.app.metadataCache.trigger('resolve', branches[0].file);
      equal(await Promise.race([first, sleep(3000).then(() => 'unbounded')]), false, 'Busy native resolver releases the bounded wait as incomplete');
      equal(inventories, 0, 'A known-busy resolver cannot start a source census');
      ok(!source.hasSemanticDependencies(), 'Busy resolver never grants authority');
      nativeClean = true;
      f.app.metadataCache.trigger('resolved');
      const deadline = performance.now() + 3500;
      while (performance.now() < deadline && !source.hasSemanticDependencies()) await sleep(30);
      ok(source.hasSemanticDependencies(), 'A later known close wakes the pending audit without another caller');
      equal(inventories, 1, 'Recovery starts one audit after releasing a busy resolver');
      return true;
    }

    const alsoWaiting = source.flush();
    await sleep(65);
    const startedEarly = inventories;
    rename(1);
    await sleep(65);
    rename(2);
    const result = await Promise.all([first, alsoWaiting]);
    equal(startedEarly, 0, 'A direct reconcile and flush must share the pre-census wait');
    equal(result, [true, true], 'All callers see the current completed audit');
    equal(inventories, 1, 'Three nearby native waves start one broad inventory');
    for (const {file, original} of branches) {
      const next = await f.repository.inspect(file.path, []), retired = await f.repository.inspect(original, []);
      ok(next.head, 'Final moved source is durable');
      ok(!retired.head, 'Old coordinate does not own source facts');
    }
    return true;
  } finally {
    releaseComparison?.();
    source?.close();
    f.close();
  }
}

for (const mode of ['burst', 'no-readiness', 'busy', 'late', 'pause', 'close']) test('startup populated-folder verification admission ('+mode+')', async()=>{
  const browser = await chromiumHarness(bundle);
  try {
    assert.equal(await browser.evaluate(contributorBrowserInitialize), true);
    assert.equal(await browser.evaluate(`(${startupFolderRenameScenario.toString()})(${JSON.stringify(mode)})`), true);
  } finally {await browser.cleanup();}
});

for (const readiness of ['unavailable', 'busy', 'busy-past-cap']) test('warm delete, reimport and move share one source inventory ('+readiness+')', async () => {
  const browser = await chromiumHarness(bundle);
  try {
    assert.equal(await browser.evaluate(contributorBrowserInitialize), true);
    assert.equal(await browser.evaluate(`(async () => {
      const f = await fixture('warm-tree-inventory-admission'), source = f.acquisition;
      const sleep = ms => new Promise(done => setTimeout(done, ms));
      const root = f.app.vault.getRoot(), folders = new Map();
      let nativeClean = true;
      const folder = () => {
        const dir = new ContributorFolder(); Object.assign(dir, {path:'Tree',name:'Tree',parent:root,children:[]});
        folders.set(dir.path, dir); root.children.push(dir); return dir;
      };
      const add = (path, parent) => {
        const file = f.add(path, 'Value:: current');file.parent = parent; parent.children.push(file);return file;
      };
      f.app.vault.getRoot = () => root;
      f.app.vault.getFolderByPath = path => path === '/' || path === '' ? root : folders.get(path) ?? null;
      f.app.vault.getAbstractFileByPath = path => f.files.get(path) ?? f.app.vault.getFolderByPath(path);
      try {
        const old = folder(), oldFile = add('Tree/Entry.md',old), moving = add('Move.md',root);
        await f.acquire();ok(await source.reconcile(),'Seed a real warm source inventory');
        if (${readiness !== 'unavailable'}) f.app.metadataCache.isCacheClean = () => nativeClean;
        source.enableInventory();
        const initial = source.getRecoveryDiagnostics().inventories.recent.length;
        const attempts = () => {const receipts=source.getRecoveryDiagnostics().inventories;return receipts.recent.length+Number(!!receipts.active)-initial;};
        folders.delete(old.path);root.children.splice(root.children.indexOf(old),1);f.files.delete(oldFile.path);
        f.app.vault.trigger('delete',oldFile);f.app.vault.trigger('delete',old);
        nativeClean = false;
        f.app.metadataCache.trigger('resolved');
        const first = source.reconcile(), joined = source.flush();
        await sleep(420);
        equal(attempts(),0,'An intermediate native close must not admit a vault census');
        const imported = folder(), replacement = add('Tree/Entry.md',imported);
        f.app.vault.trigger('create',imported);f.app.vault.trigger('create',replacement);
        f.app.metadataCache.trigger('resolve',replacement);f.app.metadataCache.trigger('resolved');
        await sleep(${readiness === 'busy' ? 1150 : 420});
        equal(attempts(),0,'Copy batches extend the same admission without starting another scan');
        if (${readiness === 'busy-past-cap'}) {
          equal(await Promise.race([Promise.all([first,joined]),sleep(5500).then(()=>null)]),[false,false],
            'The wait releases its callers at the cap without scanning a busy vault');
          equal(attempts(),0,'Exhausting the coalescing window cannot override native busy evidence');
        }
        const oldPath=moving.path, newPath='Tree/Move.md';
        root.children.splice(root.children.indexOf(moving),1);moving.parent=imported;imported.children.push(moving);
        f.files.delete(oldPath);moving.path=newPath;f.files.set(newPath,moving);
        f.metadata.set(newPath,f.metadata.get(oldPath));f.texts.set(newPath,f.texts.get(oldPath));
        f.app.vault.trigger('rename',moving,oldPath);f.app.metadataCache.trigger('resolve',moving);
        nativeClean = true;f.app.metadataCache.trigger('resolved');
        if (${readiness === 'busy-past-cap'}) ok(await source.flush(),'A clean close releases the queued audit after the cap');
        else equal(await Promise.all([first,joined]),[true,true],'Both callers share the eventual current scan');
        equal(attempts(),1,'Only one broad inventory starts for the burst');
        ok((await f.repository.inspect(replacement.path,[])).head,'Replacement source is durable');
        ok((await f.repository.inspect(newPath,[])).head&&!(await f.repository.inspect(oldPath,[])).head,'Move settles under its new native path');
        return true;
      } finally { f.close(); }
    })()`), true);
  } finally { await browser.cleanup(); }
});

for(const phase of ['startup','settled','changed','foreign'])test('attachment resolver receipt retains exact source recovery fences ('+phase+')',async()=>{
 const browser=await chromiumHarness(bundle);try{
  await browser.evaluate(contributorBrowserInitialize);
  assert(await browser.evaluate(`(async()=>{
   const f=await fixture('attachment-startup-${phase}');let restarted;
   try{
    f.add('A.md','Parent:: [[B]]');f.add('B.md','');const attachment=f.add('Picture.png','');
    await f.acquire();ok(await f.acquisition.reconcile(),'Closed Markdown source baseline');f.acquisition.close();
    restarted=new sourceModules.ObsidianSourceAcquisition(f.app,f.cache,async text=>sourceModules.parseBodyMetadata(text));
    restarted.observeInitialResolverProgress();restarted.start();
    if('${phase}'==='settled')ok(await restarted.reconcile(),'Complete genuine startup before a later resolver event');
    if('${phase}'==='changed'){f.texts.set('A.md','Parent:: [[B]]\\nValue:: edited');f.app.vault.trigger('modify',f.files.get('A.md'));f.app.metadataCache.trigger('changed',f.files.get('A.md'));}
    const before=restarted.getCounters();
    f.app.metadataCache.trigger('resolve','${phase}'==='foreign'?new window.ContributorFile('Foreign.png'):attachment);
    f.app.metadataCache.trigger('resolved');
    const diagnostic=restarted.getRecoveryDiagnostics();
    if(['settled','foreign'].includes('${phase}')){equal(diagnostic.uncoveredResolverCause,'resolve-non-markdown','Ordinary and noncanonical attachment observations remain conservative');ok(diagnostic.resolutionUncertain,'Unknown resolution remains fenced');}
    else equal(diagnostic.resolutionUncertain,false,'Canonical initial attachment resolution is startup progress, not unknown Markdown drift');
    ok(await restarted.reconcile(),'Recovery closes through actual production source checks');
    const after=restarted.getCounters();
    if('${phase}'==='startup'){equal(after.checked-before.checked,0,'Unchanged Markdown uses closed host receipts rather than per-note family authentication');equal(after.repaired-before.repaired,0,'No source activation');}
    if('${phase}'==='changed'){ok(after.vaultReads>before.vaultReads,'A real same-stat body edit still reads current bytes');const rows=[];equal(await f.repository.visit('A.md','values',batch=>{rows.push(...batch);return true}),'ready','Authenticated edited source');ok(rows.some(row=>row.kind==='inline-payload'&&row.text==='edited'),'Edited facts survive the initial resolver receipt');}
    return true;
   }finally{restarted?.close();f.close();}
  })()`));
 }finally{await browser.cleanup();}
});

test('uncovered resolver diagnostics distinguish native owner failures without weakening recovery',async()=>{
 const browser=await chromiumHarness(bundle);try{
  await browser.evaluate(contributorBrowserInitialize);
  assert(await browser.evaluate(`(async()=>{
   for(const [kind,expected]of [['absent','resolve-no-owner'],['foreign','resolve-non-file'],['attachment','resolve-non-markdown'],['retired','resolve-missing-native-file'],['replaced','resolve-replaced-native-file']]){
    const f=await fixture('uncovered-resolver-'+kind);try{
     f.add('A.md','');await f.acquire();ok(await f.acquisition.reconcile(),'Source baseline');
     const File=f.files.get('A.md').constructor;
     const owner=kind==='absent'?undefined:kind==='foreign'?{}:new File(kind==='attachment'?'Attachment.png':kind==='retired'?'Retired.md':'A.md');
     f.app.metadataCache.trigger('resolve',owner);
     equal(f.acquisition.getRecoveryDiagnostics().uncoveredResolverCause,expected,'Fixed native category');
     ok(!f.acquisition.hasSemanticDependencies(),'Unknown input still fences authority');
     f.app.metadataCache.trigger('changed',f.files.get('A.md'));
     equal(f.acquisition.getRecoveryDiagnostics().uncoveredResolverCause,expected,'A later known edit cannot erase the cause');
    }finally{f.close();}
   }return true;
  })()`));
 }finally{await browser.cleanup();}
});

for (const reordered of [false,true]) test('a clean recovery sweep shares each head and dependency selection (reordered='+reordered+')', async () => {
  const browser = await chromiumHarness(bundle);
  try {
    await browser.evaluate(contributorBrowserInitialize);
    const result = await browser.evaluate(`(async()=>{
      const f=await fixture('recovery-shared-selection');
      try {
        for(let n=0;n<24;n++)f.add('Owner'+n+'.md','');
        await f.acquire();ok(await f.acquisition.reconcile(),'Seed actual source authority');
        if(${reordered}){const enumerate=f.app.vault.getMarkdownFiles;f.app.vault.getMarkdownFiles=()=>enumerate().reverse();}
        f.work.reset();f.reads.length=0;f.parses.length=0;
        let phase='';f.acquisition.startupDiagnostics={phase(_kind,value){phase=value;},processed(){},count(){},recordWork(){},mark(){},beginActivity(){return 0;},endActivity(){},activityCause(){},stopActivityPhase(){}};
        const transaction=f.repository.transaction;let headOnly=0,selections=0;
        f.repository.transaction=function(db,stores,mode,...rest){
          if(phase==='source-reconciliation'&&mode==='readonly'&&stores.length===1&&stores[0]==='sourceHeads')headOnly++;
          if(phase==='source-reconciliation'&&mode==='readonly'&&stores.includes('sourceHeads')&&stores.includes(sourceModules.SOURCE_LOCAL_OWNER_STORE))selections++;
          return transaction.call(this,db,stores,mode,...rest);
        };
        try {
          // Retire only lookup authority, as after a failed dependency closure. No file or
          // resolver event is fabricated; the ordinary broad owner must revalidate all sources.
          f.acquisition.localDependencyAuthorityReady=false;f.acquisition.localDependenciesReady=false;
          ok(await f.acquisition.reconcile(),'Unavailable local authority gets a complete conservative sweep');
          return {headOnly,selections,files:f.files.size,ready:f.acquisition.hasSemanticDependencies(),reads:f.reads.length,parses:f.parses.length};
        } finally {f.repository.transaction=transaction;}
      } finally {f.close();}
    })()`);
    assert.equal(result.headOnly,0,'The broad recovery path must reuse its authenticated head/dependency selection');
    assert.equal(result.selections,result.files,'Each clean owner needs one native readonly selection');
    assert.equal(result.ready,true);assert.equal(result.reads,0);assert.equal(result.parses,0);
  } finally {await browser.cleanup();}
});

/** A native sync edit invalidates its selected head, not the already checked inventory prefix. */
test('restart host comparison retains its prefix when the selected owner changes',async()=>{
 const browser=await chromiumHarness(bundle);
 try{
  await browser.evaluate(contributorBrowserInitialize);
  const result=await browser.evaluate(`(async()=>{
   const f=await fixture('sync-selected-owner'),M=sourceModules;let restarted;
   try{
    for(let i=0;i<8;i++)f.add('Owner'+i+'.md','Value:: original');await f.acquire();ok(await f.acquisition.reconcile(),'Seed closed sources');
    // This regression deliberately exercises the legacy comparison owner and its selected await.
    await edit(await f.cache.open(),['meta'],tx=>tx.objectStore('meta').delete('source-host-observation:Owner0.md'));f.acquisition.close();
    restarted=new M.ObsidianSourceAcquisition(f.app,f.cache,async text=>M.parseBodyMetadata(text));restarted.start();
    const inspect=f.repository.inspectWithLocalDependencies,visits=[];let delivered=false;
    f.repository.inspectWithLocalDependencies=async function(...args){
     const value=await inspect.apply(this,args);
     // The shared selector also serves the later source sweep. This assertion measures
     // restart comparison prefix retention; the projection argument distinguishes that sweep.
     if(!args[4])visits.push(args[0]);
     if(!args[4]&&!delivered&&args[0]==='Owner6.md'){
      delivered=true;const file=f.files.get(args[0]);f.texts.set(file.path,'Value:: synced');file.stat.mtime++;
      f.app.vault.trigger('modify',file);f.app.metadataCache.trigger('changed',file);f.app.metadataCache.trigger('resolved');
     }
     return value;
    };
    let ready=await restarted.reconcile();if(!ready)ready=await restarted.reconcile();
    ok(ready&&restarted.hasSemanticDependencies(),'Real current source closure');
    const rows=[];equal(await f.repository.visit('Owner6.md','values',batch=>{rows.push(...batch);return true}),'ready','Authenticated current facts');
    return{prefix:visits.filter(path=>path==='Owner0.md').length,selected:visits.filter(path=>path==='Owner6.md').length,values:rows.filter(row=>row.kind==='inline-payload').map(row=>row.text)};
   }finally{restarted?.close();f.close();}
  })()`);
  assert.equal(result.prefix,1,'A source-local sync event must not restart unrelated comparisons');
  assert.deepEqual(result.values,['synced']);assert(result.selected>=2,'The changed head is reacquired');
 }finally{await browser.cleanup();}
});

test('a delayed native move close needs no per-file resolve and retains exact local maintenance', async () => {
  const browser = await chromiumHarness(bundle);
  try {
    assert.equal(await browser.evaluate(contributorBrowserInitialize), true);
    assert.equal(await browser.evaluate(`(async()=>{
      const f=await fixture('native-pure-move-delayed');
      try{
        for(let i=0;i<24;i++)f.add('Owner'+i+'.md','');await f.acquire();ok(await f.acquisition.reconcile(),'Initial source authority');
        f.work.reset();const file=f.files.get('Owner0.md'),old=file.path,text=f.texts.get(old),cache=f.metadata.get(old);
        f.files.delete(old);f.texts.delete(old);f.metadata.delete(old);file.path='Moved.md';file.name='Moved.md';file.basename='Moved';
        f.files.set(file.path,file);f.texts.set(file.path,text);f.metadata.set(file.path,cache);f.app.vault.trigger('rename',file,old);
        await new Promise(done=>setTimeout(done,100));const revision=f.acquisition.getMaintenanceRevision();f.app.metadataCache.trigger('resolved');
        equal(f.acquisition.getMaintenanceRevision(),revision,'Exact native move receipt survives a delayed close without resolve');
        ok(await f.acquisition.reconcile(),'Ordinary local owner/dependent validation closes');
        equal(f.work.markdownEnumerations,0,'No global inventory after a known native move');
        equal((await f.repository.inspect(old,[])).reason,'tombstone','Old source coordinates retired');
        const after=f.acquisition.getMaintenanceRevision();f.app.metadataCache.trigger('resolved');
        ok(f.acquisition.getMaintenanceRevision()>after,'Extra unknown close cannot reuse topology receipt');return true;
      }finally{f.close();}
    })()`),true);
  }finally{await browser.cleanup();}
});

for (const unknown of [false, true]) test('delayed native per-file resolve closes only its attributed wave (unknown='+unknown+')', async () => {
  const browser = await chromiumHarness(bundle);
  try {
    assert.equal(await browser.evaluate(contributorBrowserInitialize), true);
    assert.equal(await browser.evaluate(`(async()=>{
      const f=await fixture('native-resolve-delayed-${unknown}');
      try{
        for(let i=0;i<24;i++)f.add('Owner'+i+'.md','Related:: [[Owner1]]');
        await f.acquire();ok(await f.acquisition.reconcile(),'Initial source authority');f.work.reset();
        const file=f.files.get('Owner0.md');file.stat.mtime++;
        f.texts.set(file.path,'Related:: [[Owner2]]');
        f.app.vault.trigger('modify',file);f.app.metadataCache.trigger('changed',file);
        await new Promise(done=>setTimeout(done,75));
        if(${unknown})f.app.vault.trigger('modify',new window.ContributorFolder());
        f.app.metadataCache.trigger('resolve',file);
        await new Promise(done=>setTimeout(done,75));
        const revision=f.acquisition.getMaintenanceRevision();f.app.metadataCache.trigger('resolved');
        equal(f.acquisition.getMaintenanceRevision()===revision,!${unknown},'Only attributed close remains local');
        ok(await f.acquisition.reconcile(),'Current local/global authority recovers');
        equal(f.work.markdownEnumerations,${unknown}?1:0,'Delayed file receipt avoids a whole-vault sweep');
        const after=f.acquisition.getMaintenanceRevision();f.app.metadataCache.trigger('resolved');
        ok(f.acquisition.getMaintenanceRevision()>after,'Receipt consumed once; extra close stays conservative');
        return true;
      }finally{f.close();}
    })()`),true);
  }finally{await browser.cleanup();}
});

for (const seeded of [false, true]) test(`${seeded ? 'warm revalidation' : 'fresh incomplete inventory'} retains unrelated work through finite native edits and reaches actual dependency closure`, /** Deliver all fixed edits in either implementation, independent of its repeated-work count. */ async () => {
  const browser = await chromiumHarness(bundle);
  try {
    assert.equal(await browser.evaluate(contributorBrowserInitialize), true);
    const result = await browser.evaluate(`(async () => {
      const f = await fixture('event-convergence-finite-${seeded}');
      try {
        const owners = 24, mutations = 3;
        for (let index = 0; index < owners; index++) f.add('Owner' + index + '.md', 'Value:: initial');
        if (${seeded}) {
          await f.acquire();
          ok(await f.acquisition.reconcile(), 'Seed actual complete source and dependency authority');
        } else {
          f.acquisition.start();
          ok(!f.acquisition.hasSemanticDependencies(), 'Fresh storage has no earlier complete authority to reuse');
        }
        f.work.reset();
        let phase = '', sweepVisits = 0;
        const postSweepEnsures = { resolution: 0, local: 0 };
        f.acquisition.startupDiagnostics = {
          phase(_kind, value) { phase = value; },
          processed(kind) { if (kind === 'source' && phase === 'source-reconciliation') sweepVisits++; },
          count() {}, recordWork() {}, mark() {}, beginActivity() { return 0; }, endActivity() {},
          activityCause() {}, stopActivityPhase() {}
        };
        for (const [method, key] of [['repairResolutionDirtySources', 'resolution'], ['reconcileKnownImpacts', 'local']]) {
          const original = f.acquisition[method];
          // Forward the actual owners; cold first-time resolution repair is distinct from a sweep.
          f.acquisition[method] = async function(...args) {
            const before = f.work.localEnsures;
            try { return await original.apply(this, args); }
            finally { postSweepEnsures[key] += f.work.localEnsures - before; }
          };
        }
        const ensure = f.repository.ensureLocalDependencies;
        let delivered = 0;
        const outcomes = [];
        f.repository.ensureLocalDependencies = async function(...args) {
          const result = await ensure.apply(this, args);
          if (delivered < mutations && args[0] === 'Owner' + (6 + delivered * 6) + '.md') {
            const file = f.files.get(delivered % 2 ? 'Owner0.md' : 'Owner23.md');
            f.texts.set(file.path, 'Value:: changed-' + delivered);
            f.app.vault.trigger('modify', file);
            f.app.metadataCache.trigger('changed', file);
            f.app.metadataCache.trigger('resolved');
            delivered++;
          }
          return result;
        };
        // Genuine unscoped uncertainty starts the broad route; subsequent file events are local.
        f.app.metadataCache.trigger('resolved');
        for (let attempt = 0; attempt < mutations + 2; attempt++) {
          const ready = await f.acquisition.reconcile();
          outcomes.push(ready);
          if (ready && delivered === mutations) break;
        }
        ok(await f.repository.flush(), 'Every durable source/count/reclamation writer closes');
        ok(f.acquisition.hasSemanticDependencies(), 'Final authority is actual dependency completion');
        equal(delivered, mutations, 'Fixed mutation cardinality');
        const proof = [];
        for (const path of ['Owner0.md', 'Owner23.md']) {
          const records = [];
          equal(await f.repository.visit(path, 'values', rows => { records.push(...rows); return true; }), 'ready', 'Final values authenticated');
          proof.push({ path, records });
        }
        return { outcomes, delivered, sweepVisits, postSweepEnsures, work: f.work.snapshot(), proof, counters: f.acquisition.getCounters() };
      } finally { f.close(); }
    })()`);
    assert.equal(result.delivered, 3);
    assert.equal(result.outcomes.at(-1), true);
    assert.deepEqual(result.proof.map(item => item.records.filter(record => record.kind === 'inline-payload').map(record => record.text)),
      [['changed-1'], ['changed-2']], 'Independent expected final content survives all repeated edits');
    assert.equal(result.work.markdownEnumerations, 1, 'Finite source events retain one actual broad inventory');
    assert.equal(result.sweepVisits, 24, 'Each owner is visited once in the source sweep');
    if (seeded) assert.ok(result.work.localEnsures <= 36,
      'One 24-owner warm inventory plus bounded changed-owner repair must avoid rechecking every completed prefix');
  } finally { await browser.cleanup(); }
});

for (const change of ['extra-resolved', 'expired-resolver', 'delete-recreate', 'rename', 'pause', 'unload']) {
  test(`${change} still retires broad inventory scope`, /** Deliver genuine host-shaped invalidation during a real dependency await. */ async () => {
    const browser = await chromiumHarness(bundle);
    try {
      assert.equal(await browser.evaluate(contributorBrowserInitialize), true);
      assert.equal(await browser.evaluate(`(async () => {
        const f = await fixture('event-scope-${change}'), change = ${JSON.stringify(change)};
        try {
          for (let i = 0; i < 4; i++) f.add('Owner' + i + '.md', 'Value:: original');
          await f.acquire(); ok(await f.acquisition.reconcile(), 'Seed closed authority');
          const ensure = f.repository.ensureLocalDependencies;
          let injected = false;
          f.repository.ensureLocalDependencies = async function(...args) {
            const result = await ensure.apply(this, args);
            if (!injected && args[0] === 'Owner1.md') {
              injected = true;
              const file = f.files.get('Owner3.md');
              if (change === 'extra-resolved') f.app.metadataCache.trigger('resolved');
              if (change === 'expired-resolver') {
                f.app.metadataCache.trigger('changed', file);
                await new Promise(done => setTimeout(done, 75));
                f.app.metadataCache.trigger('resolved');
              }
              if (change === 'delete-recreate') {
                f.files.delete(file.path); f.app.vault.trigger('delete', file);
                const replacement = f.add(file.path, 'Value:: recreated');
                f.app.vault.trigger('create', replacement); f.app.metadataCache.trigger('changed', replacement);
                f.app.metadataCache.trigger('resolved');
              }
              if (change === 'rename') {
                f.files.delete(file.path); const text = f.texts.get(file.path), cache = f.metadata.get(file.path);
                file.path = 'Moved.md'; file.name = 'Moved.md'; file.basename = 'Moved';
                f.files.set(file.path, file); f.texts.set(file.path, text); f.metadata.set(file.path, cache);
                f.app.vault.trigger('rename', file, 'Owner3.md'); f.app.metadataCache.trigger('resolved');
              }
              if (change === 'pause') f.acquisition.pauseInventory();
              if (change === 'unload') f.acquisition.close();
            }
            return result;
          };
          f.app.metadataCache.trigger('resolved');
          equal(await f.acquisition.reconcile(), false, 'Global/topology/lifecycle change rejects the old sweep');
          ok(injected, 'Required event delivered');
          ok(!f.acquisition.hasSemanticDependencies(), 'Retired sweep grants no authority');
          const retired=f.acquisition.getRecoveryDiagnostics().inventories.recent.at(-1);
          equal(retired.outcome,'cancelled','The cancelled broad pass survives in the public diagnostic input');
          equal(retired.endCause,change==='pause'?'build-paused':change==='unload'?'closed':'scope-changed','A finite reason identifies why the pass ended');
          ok(retired.visited>=1&&retired.total===4&&retired.scopeChanges>0,'The receipt retains the completed prefix and change counts');
          f.repository.ensureLocalDependencies = ensure;
          if (change !== 'unload') {
            ok(await f.acquisition.reconcile(), 'Finite invalidation recovers through a new valid sweep');
            ok(await f.repository.flush(), 'Persistence and tombstones close');
            ok(f.acquisition.getRecoveryDiagnostics().inventories.recent.some(row=>row.startMs===retired.startMs&&row.outcome==='cancelled'),
              'The successor cannot erase the previous cancellation');
          }
          return true;
        } finally { f.close(); }
      })()`), true);
    } finally { await browser.cleanup(); }
  });
}

test('a same-stat edit of the selected owner rejects its held inspection', /** An unrelated-scope lifetime cannot revive the changed owner's selected result. */ async () => {
  const browser = await chromiumHarness(bundle);
  try {
    assert.equal(await browser.evaluate(contributorBrowserInitialize), true);
    assert.equal(await browser.evaluate(`(async () => {
      const f = await fixture('event-selected-owner');
      try {
        const file = f.add('A.md', 'Value:: before');
        await f.acquire(); ok(await f.acquisition.reconcile(), 'Seed authority');
        const inspect = f.repository.inspect; let injected = false;
        f.repository.inspect = async function(...args) {
          const result = await inspect.apply(this, args);
          if (!injected && args[0] === file.path) {
            injected = true; f.texts.set(file.path, 'Value:: after');
            f.app.vault.trigger('modify', file); f.app.metadataCache.trigger('changed', file);
            f.app.metadataCache.trigger('resolved');
          }
          return result;
        };
        f.app.metadataCache.trigger('resolved');
        equal(await f.acquisition.reconcile(), false, 'Changed selected owner remains conservatively cancelled');
        ok(!f.acquisition.hasSemanticDependencies(), 'No stale readiness');
        f.repository.inspect = inspect;
        ok(await f.acquisition.reconcile(), 'Current owner recovers');
        const values = [];
        equal(await f.repository.visit(file.path, 'values', rows => { values.push(...rows); return true; }), 'ready', 'Current family authenticated');
        equal(values.filter(row => row.kind === 'inline-payload').map(row => row.text), ['after'], 'Same-stat final value exact');
        return true;
      } finally { f.close(); }
    })()`), true);
  } finally { await browser.cleanup(); }
});

test('final dependency completion keeps exact event revision and never publishes readiness during its await', /** Intercept only the production final phase; no readiness or revision is injected. */ async () => {
  const browser = await chromiumHarness(bundle);
  try {
    assert.equal(await browser.evaluate(contributorBrowserInitialize), true);
    assert.equal(await browser.evaluate(`(async () => {
      const f = await fixture('event-final-proof');
      try {
        const file = f.add('A.md', 'Value:: before');
        await f.acquire(); ok(await f.acquisition.reconcile(), 'Seed authority');
        let phase = '', injected = false;
        f.acquisition.startupDiagnostics = {
          phase(_lane, value) { phase = value; }, recordWork() {}, count() {}, processed() {}, mark() {},
          beginActivity() { return 0; }, endActivity() {}, stopActivityPhase() {}, activityCause() {}
        };
        const complete = f.repository.completeLocalDependencyInventory;
        f.repository.completeLocalDependencyInventory = async function(...args) {
          if (phase === 'dependency-final-validation' && !injected) {
            injected = true;
            ok(!f.acquisition.hasSemanticDependencies(), 'Final proof await cannot expose early semantic readiness');
            const result = await complete.apply(this, args);
            f.texts.set(file.path, 'Value:: after-final');
            f.app.vault.trigger('modify', file); f.app.metadataCache.trigger('changed', file);
            f.app.metadataCache.trigger('resolved');
            return result;
          }
          return complete.apply(this, args);
        };
        f.app.metadataCache.trigger('resolved');
        equal(await f.acquisition.reconcile(), false, 'Newer final-phase event cannot cross publication');
        ok(injected && !f.acquisition.hasSemanticDependencies(), 'Actual invalidation remains pending');
        f.repository.completeLocalDependencyInventory = complete;
        ok(await f.acquisition.reconcile(), 'New exact observation closes naturally');
        ok(await f.repository.flush(), 'All durable work closes');
        return true;
      } finally { f.close(); }
    })()`), true);
  } finally { await browser.cleanup(); }
});

for (const fault of ['throw', 'independent-writer']) {
  test(`a final broad ${fault} cannot retain temporary local lookup authority`, /** Reject final coverage using a declared fault or a genuine second-connection activation. */ async () => {
    const browser = await chromiumHarness(bundle);
    try {
      assert.equal(await browser.evaluate(contributorBrowserInitialize), true);
      assert.equal(await browser.evaluate(`(async () => {
        const name = 'event-final-${fault}', f = await fixture(name), fault = ${JSON.stringify(fault)};
        let writer;
        try {
          f.add('A.md', 'Value:: initial'); await f.acquire();
          ok(await f.acquisition.reconcile(), 'Seed closed authority');
          let phase = '', injected = false, evidence;
          f.acquisition.startupDiagnostics = {
            phase(_lane, value) { phase = value; }, recordWork() {}, count() {}, processed() {}, mark() {},
            beginActivity() { return 0; }, endActivity() {}, stopActivityPhase() {}, activityCause() {}
          };
          const complete = f.repository.completeLocalDependencyInventory;
          f.repository.completeLocalDependencyInventory = async function(...args) {
            if (phase === 'dependency-final-validation' && !injected) {
              injected = true;
              evidence = { temporaryScope: f.acquisition.localDependencyAuthorityReady,
                semanticReady: f.acquisition.hasSemanticDependencies() };
              if (fault === 'throw') throw Error('Owned final proof failure');
              const before = (await f.repository.inspect('A.md')).head;
              const pass = f.repository.localInventoryProjections.get(args[1]);
              writer = await fixture(name);
              const changedFile = writer.add('A.md', 'Value:: independently-activated');
              changedFile.stat.mtime++;
              changedFile.stat.size = writer.texts.get(changedFile.path).length;
              await writer.acquire(); const saved = await writer.repository.flush();
              const after = (await writer.repository.inspect('A.md')).head;
              Object.assign(evidence, { saved, before: before.sequence, after: after.sequence, projection: !!pass,
                originalConnectionUnchanged: !!pass && f.repository.sourceActivationRevision === pass.activations });
              const proofReason = await complete.apply(this, args);
              evidence.proofReason = proofReason;
              return proofReason;
            }
            return complete.apply(this, args);
          };
          f.app.metadataCache.trigger('resolved');
          equal(await f.acquisition.reconcile(), false, 'Final broad proof rejected');
          ok(injected, 'Fault reached its actual final boundary');
          // These assertions run outside the production catch boundary. A failed inner fixture
          // assertion must never masquerade as the expected product rejection.
          ok(evidence?.temporaryScope && !evidence.semanticReady, 'Actual temporary scope retained no semantic readiness');
          if (fault === 'independent-writer') {
            ok(evidence.saved && evidence.after > evidence.before, 'Writer genuinely selected a new durable source');
            ok(evidence.projection && evidence.originalConnectionUnchanged, 'Original projection excludes the independent activation');
            equal(evidence.proofReason, 'superseded', 'Actual repository sequence fence rejected the write');
          }
          equal(f.acquisition.localDependencyAuthorityReady, false, 'Failure retires temporary lookup scope');
          ok(!f.acquisition.hasSemanticDependencies(), 'Failure cannot promote readiness');
          f.repository.completeLocalDependencyInventory = complete;
          if (fault === 'throw') ok(await f.acquisition.reconcile(), 'Later healthy proof remains available');
          return true;
        } finally { writer?.close(); f.close(); }
      })()`), true);
    } finally { await browser.cleanup(); }
  });
}

test('an event-free Date environment change between completed owners cannot be absorbed by the next owner', /** The host registry changes at an actual owner boundary without a resolver notification. */ async () => {
  const browser = await chromiumHarness(bundle);
  try {
    assert.equal(await browser.evaluate(contributorBrowserInitialize), true);
    assert.equal(await browser.evaluate(`(async () => {
      const f = await fixture('event-environment-between-owners');
      try {
        f.add('A.md', '', { Due: '2026-01-01' }); f.add('B.md', '', { Due: '2026-01-01' });
        await f.acquire(); ok(await f.acquisition.reconcile(), 'Seed non-Date observations');
        const ensure = f.repository.ensureLocalDependencies; let changed = false;
        f.repository.ensureLocalDependencies = async function(...args) {
          const result = await ensure.apply(this, args);
          if (!changed && args[0] === 'A.md') { changed = true; f.app.dateFields.add('Due'); }
          return result;
        };
        f.app.metadataCache.trigger('resolved');
        equal(await f.acquisition.reconcile(), false, 'Earlier owner cannot retain its obsolete environment');
        ok(changed && !f.acquisition.hasSemanticDependencies(), 'Environment change remains a real prerequisite');
        f.repository.ensureLocalDependencies = ensure;
        ok(await f.acquisition.reconcile(), 'New environment closes through ordinary reconciliation');
        const expected = await f.repository.observationDigest(JSON.stringify({ daily: f.app.daily, dates: ['Due'] }));
        for (const path of ['A.md', 'B.md']) equal((await f.repository.inspect(path)).head.observation.environment, expected, 'Every completed owner uses current Date semantics');
        return true;
      } finally { f.close(); }
    })()`), true);
  } finally { await browser.cleanup(); }
});
