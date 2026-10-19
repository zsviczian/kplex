/**
 * URL search-publication work probe using the existing actual GraphIndex/compiler fixture.
 * Virtual timers and a fixed clock isolate declared display boundaries; counts are not timings.
 * Observes only this index's flush/get and its VM-owned evidence prototype, preserving results
 * and exact descriptors. Owns timer/method restoration; source preparation is outside work counts.
 */
import assert from 'node:assert/strict';
import {urlPublicationFixture} from './urlPublicationFixture.mjs';

/** Construct finite native facts with caller-selected strategy and owned virtual display timers. */
export function urlSearchPublicationFixture(bundle,mode='on-demand'){
  let token=0;const timers=new Map();
  const f=urlPublicationFixture(bundle,{setTimeout:/** Hold host timers until explicit publication; no latency is inferred. */(callback,delay)=>{const id=++token;timers.set(id,{callback,delay});return id;},clearTimeout:/** Retire only the exact owned virtual task. */id=>timers.delete(id)},
    {indexingMode:mode,showPageNodes:true,showURLNodes:true,showFolderNodes:true,showTagNodes:true,showAttachments:true,showVirtualNodes:true});
  const i=f.index,counts={gets:0,urlGets:0,coveredGets:0,fromCalls:0,fromPairRows:0,flushes:0},operations={reads:0,parses:0};let depth=0;
  const restores=[];
  /** Preserve inherited-versus-own method shape as well as its original function identity. */
  const replace=(owner,key,method)=>{const descriptor=Object.getOwnPropertyDescriptor(owner,key);owner[key]=method;restores.push(/** Independent failure cleanup restores this exact descriptor. */()=>{if(descriptor)Object.defineProperty(owner,key,descriptor);else delete owner[key];});};
  const get=i.get,flush=i.flushUrlPublication,prototype=i.urlState.evidence.constructor.prototype,from=prototype.from,read=i.app.vault.cachedRead,parse=i.metadataParser.parse;
  replace(i,'get',/** Count only general lookup work performed synchronously within an actual flush. */function(path,...args){if(depth){counts.gets++;if(/^https?:\/\//i.test(path))counts.urlGets++;if(this.urlSearchEntries.has(path))counts.coveredGets++;}return get.call(this,path,...args);});
  replace(prototype,'from',/** Observe actual materialized pair rows; other stores and out-of-flush queries stay outside attribution. */function(...args){const result=from.apply(this,args);if(depth&&this===i.publishedUrlState.evidence){counts.fromCalls++;counts.fromPairRows+=result.length;}return result;});
  replace(i,'flushUrlPublication',/** Preserve immediate/publication behavior; nesting never retires an outer observation. */function(...args){const before=this.urlPresentationFlushes;depth++;try{return flush.apply(this,args);}finally{depth--;if(this.urlPresentationFlushes!==before)counts.flushes++;}});
  replace(i.app.vault,'cachedRead',/** An incidental source read is observable rather than replaced with successful facts. */function(...args){operations.reads++;return read.apply(this,args);});
  replace(i.metadataParser,'parse',/** Supplied parsed fixture input must not cause another production parser admission. */function(...args){operations.parses++;return parse.apply(this,args);});
  return{...f,counts,operations,timers,
    /** Reset attribution after untimed owner preparation or an earlier explicit publication. */reset(){for(const key of Object.keys(counts))counts[key]=0;operations.reads=0;operations.parses=0;},
    /** Restore all scoped hooks before destroying the actual index and asserting timer retirement. */close(){for(const restore of restores.reverse())restore();f.close();assert.equal(timers.size,0,'Owned publication timers retired');},
  };
}

/** Preserve ordered semantic/alias/incidence facts and exact evidence IDs without cyclic host objects. */
export function urlSearchGraphValue(index){return{pages:[...index.urlState.pages].map(/** Ordered neighbours retain all relation flags and explicit endpoint identity. */([path,page])=>({path,name:page.name,url:page.url,aliases:page.aliases,tags:page.tags,styleTags:page.styleTags,neighbours:[...page.neighbours].map(/** Exclude only the cyclic target object. */([key,{target,...relation}])=>[key,{...relation,targetPath:target.path}])})),evidence:[...index.urlState.evidence.declarations()],owners:[...index.urlOwners.keys()]};}

/** Capture public result order/facets in both scopes; eligibility still executes the real get(). */
export function urlSearchResults(index,queries,limit=10000){return queries.flatMap(/** Query prefix reuse and scope separation remain owned by production search. */query=>['visible','vault-files'].map(/** Keep scope/result order, not an independently sorted set of paths. */scope=>({query,scope,pages:index.search(query,limit,scope).map(/** Retain labels and alias vocabulary as well as identity. */page=>({path:page.path,name:page.name,aliases:page.aliases}))})));}
