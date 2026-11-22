/** Native #313 source/recovery characterization, serialized into the approved Small controller.
 * The outer authoring fixture owns exact-build deployment, host lock, native settings and cleanup.
 * Completed source inventories, not a fixed wait or a ready-looking graph, establish settlement.
 * Application-restart/cache-reuse acceptance remains the existing isolated restart driver's job.
 */
export async function emptyWikilinkCases(app,c){
 const f=c.fixture(app,c),cases=[],passes=[],warmup=[];
 try{
  await f.initialize();const p=f.p,index=p.index,source=index.sourceAcquisition;
  // Keep a real non-default ontology fixture beside the empty-link source. This tests existing
  // semantic policy without rewriting any original vault property or changing recovery policy.
  const field='Related313';
  await p.updateOntologyField('leftFriends',[...p.settings.hierarchy.leftFriends,field],[...p.settings.hierarchy.leftFriends],()=>!c.closed);
  const target=await f.note('Target313');
  const definitions=[
   ['Empty313','see [[ ]] here',1],
   ['Repeated313','see [[ ]] here and [[ ]] again',2],
   ['Self313','see [[Self313]] here',1],
   ['Code313','see `[[ ]]` here',0],
  ];
  for(const [name,body]of definitions){
   const file=await f.note(name,'---\n'+field+': '+JSON.stringify('[['+target.path+']]')+'\n---\n'+body+'\n');
   await f.until(()=>{
    const cache=app.metadataCache.getFileCache(file),resolved=app.metadataCache.resolvedLinks[file.path];
    return !!cache&&resolved?.[target.path]===1;
   },'Native empty/self-link resolution: '+name);
   const cache=app.metadataCache.getFileCache(file),selfCount=app.metadataCache.resolvedLinks[file.path]?.[file.path]??0;
   if(name==='Self313')f.check(selfCount===1,'Explicit native self-link control');
   if(name==='Code313')f.check(selfCount===0,'Inline-code native exclusion control');
   const literals=(cache.links??[]).map(link=>({raw:link.link,original:link.original,
    host:app.metadataCache.getFirstLinkpathDest(link.link,file.path)?.path??null,
    trimmedHost:app.metadataCache.getFirstLinkpathDest(link.link.trim(),file.path)?.path??null,
    start:link.position.start.offset,end:link.position.end.offset}));
   cases.push({name,path:file.path,selfCount,literals,resolved:{...app.metadataCache.resolvedLinks[file.path]}});
  }
  const capture=()=>({counters:index.getSourceAcquisitionCounters(),recovery:source.getRecoveryDiagnostics(),
   activity:source.getActivityState(),repository:index.getSourceRepositoryDiagnostics(),semantic:index.getSemanticPreparationDiagnostics()});
  /** New native fixtures may cancel an already captured startup pass. Preserve every actual
   * attempt, then establish closure through completed source work before testing unchanged reuse. */
  if(c.expectFixed){
   const deadline=Date.now()+60000;let settled=false;
   for(let attempt=0;attempt<32&&Date.now()<deadline;attempt++){
    f.check(!c.closed,'Empty-wikilink warm-up was cancelled');
    try{
     const completed=await source.reconcile(),state={attempt,completed,...capture()};warmup.push(state);
     c.progress={phase:'Empty-wikilink source settlement',cases,warmup,passes};
     if(completed&&state.recovery.pass?.outcome==='complete'&&state.recovery.dependenciesReady
       &&state.recovery.pendingKnown===0&&state.recovery.pendingResolution===0&&state.repository.unsaved===0){settled=true;break;}
    }catch(error){warmup.push({attempt,error:String(error),...capture()});c.progress={phase:'Empty-wikilink settlement error',cases,warmup,passes};throw error;}
   }
   f.check(settled,'Empty-wikilink source work did not reach completed durable closure');
  }
  const before=capture();
  for(let cycle=0;cycle<3;cycle++){
   const completed=await source.reconcile();
   passes.push({cycle,completed,...capture()});
   c.progress={phase:'Empty-wikilink completed recovery cycle',cases,warmup,before,passes};
  }
  for(const row of cases){
   row.stored={};
   for(const family of ['metadata','resolution']){
    const facts=[],outcome=await index.indexedDb.sources.visit(row.path,family,records=>{facts.push(...records);return true;},()=>!c.closed);
    row.stored[family]={outcome,facts:facts.filter(record=>['host-literal','literal-resolution','host-link'].includes(record.kind))};
   }
  }
  if(c.expectFixed){
   f.check(passes.every(pass=>pass.completed),'Every actual source recovery cycle must settle');
   f.check(passes.every(pass=>pass.counters.failures===before.counters.failures),'Completed unchanged cycles must not grow failure counters');
   f.check(passes.every(pass=>pass.recovery.pendingKnown===0&&pass.recovery.pass?.outcome==='complete'),'No empty-link source may remain queued after completed recovery');
   f.check(passes.every(pass=>pass.repository.unsaved===0),'No source may be masked in memory instead of durable');
   for(const row of cases){
    f.check(row.stored.metadata.outcome==='ready'&&row.stored.resolution.outcome==='ready','Actual source families must be durable: '+row.name);
    const nativeSelf=row.literals.filter(link=>link.host===row.path||link.trimmedHost===row.path).length;
    const resolvedSelf=row.stored.resolution.facts.filter(record=>record.kind==='literal-resolution'&&record.target?.entity.id===row.path).length;
    f.check(resolvedSelf===nativeSelf,'Stored lexical self-bindings must match native host: '+row.name);
    const counts=row.stored.resolution.facts.filter(record=>record.kind==='host-link'&&record.state==='resolved'&&record.target===row.path).map(record=>record.count);
    f.check(row.selfCount===0?counts.length===0:counts.length===1&&counts[0]===row.selfCount,'Preserve genuine native self-link multiplicity: '+row.name);
    if(row.name==='Code313')f.check(row.literals.every(link=>!link.original.includes('[[ ]]')),'Inline code is not a native lexical link');
   }
  }
  return{cases,warmup,passes,before,expectFixed:!!c.expectFixed,
   limitation:'Completed native inventory cycles; not application restart/cache-reuse or physical macOS evidence.'};
 }finally{await f.cleanup();}
}
