/**
 * Test-only evidence maintenance counts scoped to one current store. Original promises, receivers
 * and declaration objects pass through unchanged. Copied-bucket identity filters out unrelated
 * graph writers sharing the prototype. Instrumented runs are work receipts, never elapsed baselines.
 */

/** Observe completed sparse/full paths and their actual bucket writes; caller owns restoration. */
export function probeEvidenceMaintenance(currentStore){
  const prototype=Object.getPrototypeOf(currentStore()),full=prototype.compactCooperative,sparse=prototype.compactSparseOverrides,write=prototype.writePair,fork=prototype.forkForPatch;
  const counts={evidenceCompactions:0,compactedPairs:0,compactedDeclarations:0,sparseAttempts:0,sparseCompactions:0,sparseCopiedPairs:0,sparseCopiedDeclarations:0,foldedPairs:0,foldedPathEntries:0};let context=null;
  /** Preserve exactly the source operation's promise; completion observation closes this counter scope. */
  const observe=(original,kind)=>function(...args){
    if(this!==currentStore())return original.apply(this,args);
    const previous=context;context={store:this,kind};
    if(kind==='full')counts.evidenceCompactions++;else counts.sparseAttempts++;
    let result;try{result=original.apply(this,args);}catch(error){context=previous;throw error;}
    result.then(/** False/null sparse results never attest a completed sparse compaction. */value=>{if(kind==='sparse'&&value)counts.sparseCompactions++;context=previous;},/** Rejection also retires this observer scope. */()=>{context=previous;});
    return result;
  };
  prototype.compactCooperative=observe(full,'full');if(sparse)prototype.compactSparseOverrides=observe(sparse,'sparse');
  if(fork)prototype.forkForPatch=/** Attribute bounded head-folding Map/set copies separately from bucket copying. */function(...args){
    if(this===currentStore()&&this.sparseCompactionHead){counts.foldedPairs+=this.byPair.size;for(const keys of this.pairsByPath.values())counts.foldedPathEntries+=keys.size;}
    return fork.apply(this,args);
  };
  prototype.writePair=/** Count only arrays copied from the observed store, not writes from another graph. */function(key,declarations,...args){
    if(context&&this!==context.store&&declarations.length&&context.store.readPair(key)?.[0]===declarations[0]){
      if(context.kind==='full'){counts.compactedPairs++;counts.compactedDeclarations+=declarations.length;}
      else{counts.sparseCopiedPairs++;counts.sparseCopiedDeclarations+=declarations.length;}
    }
    return write.call(this,key,declarations,...args);
  };
  return {counts,/** Restore exact prototype methods after independent assertion/failure cleanup. */restore(){prototype.compactCooperative=full;if(sparse)prototype.compactSparseOverrides=sparse;if(fork)prototype.forkForPatch=fork;prototype.writePair=write;}};
}
