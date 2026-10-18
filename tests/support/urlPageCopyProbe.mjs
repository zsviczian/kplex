/**
 * Test-only attribution of URL patch page cloning at the actual GraphBuilder staging owner.
 * Iterators are installed only during one clone callback and restored before preparation resumes;
 * no global Map/array instrumentation or content logging is used. Callers own outer restoration.
 */

/** Count actual clone inputs while preserving callback receivers, values and staging behavior. */
export function probeUrlPageCopies(builder) {
  const counts={pagesCloned:0,neighboursCopied:0,aliasesCopied:0,tagsCopied:0,styleTagsCopied:0};
  const create=builder.createPatchState;
  builder.createPatchState=/** Observe this builder's real page-clone callback, not compiler/read-port lookups. */ function(...args){
    const state=create.apply(this,args),pages=state.pages,clone=pages.cloneOnRead;
    pages.cloneOnRead=/** Attribute only synchronous clone work and release every iterator on throws. */ function(page){
      counts.pagesCloned++;
      const restores=[];
      for(const [key,value] of [['neighboursCopied',page.neighbours],['aliasesCopied',page.aliases],['tagsCopied',page.tags],['styleTagsCopied',page.styleTags]]){
        const own=Object.getOwnPropertyDescriptor(value,Symbol.iterator),iterator=value[Symbol.iterator];
        value[Symbol.iterator]=/** Preserve original iteration order/results while counting cloned entries. */ function*(){for(const item of iterator.call(this)){counts[key]++;yield item;}};
        restores.push(/** Restore exact own descriptors before another staging callback can observe the array/map. */ ()=>{if(own)Object.defineProperty(value,Symbol.iterator,own);else delete value[Symbol.iterator];});
      }
      try{return clone.call(this,page);}finally{for(const restore of restores.reverse())restore();}
    };
    return state;
  };
  return {counts,/** Release this builder's staging wrapper independently of assertion outcome. */ restore(){builder.createPatchState=create;}};
}
