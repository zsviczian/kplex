/**
 * Compiler-instance work attribution for URL alias membership. Only the selected private node's
 * array is proxied: native includes reads and iterator entries are forwarded and counted. No
 * global array/Set implementation changes. Restore before semantic or duration comparisons.
 */

/** Observe actual numeric reads within includes and actual membership-seeding iteration. */
export function probeUrlAliasMembership(compiler, targetId) {
  const ensure=compiler.ensureNode, originals=new Map(), counts={includesCalls:0,includesEntries:0,seedEntries:0};
  compiler.ensureNode=/** Install once after the production identity/materialization owner returns. */ function(...args){
    const node=ensure.apply(this,args);
    if(node?.id===targetId&&!originals.has(node)){
      const array=node.aliases;let including=false;
      const proxy=new Proxy(array,{
        /** Forward exact native array behavior; count only reads made by includes or its iterator. */
        get(target,key,receiver){
          if(including&&typeof key==='string'&&/^\d+$/.test(key))counts.includesEntries++;
          if(key==='includes')return /** Native includes still decides equality and short-circuit order. */ function(...values){counts.includesCalls++;including=true;try{return Array.prototype.includes.apply(receiver,values);}finally{including=false;}};
          if(key===Symbol.iterator)return /** Forward alias-array enumeration, not unrelated input vocabulary. */ function*(){for(const value of target){counts.seedEntries++;yield value;}};
          return Reflect.get(target,key,receiver);
        },
      });
      originals.set(node,array);node.aliases=proxy;
    }
    return node;
  };
  return {counts,/** Release wrappers and exact original array identities independently of assertions. */ restore(){compiler.ensureNode=ensure;for(const [node,array] of originals)node.aliases=array;}};
}
