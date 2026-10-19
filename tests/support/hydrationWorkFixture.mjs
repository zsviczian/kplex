/**
 * Real-IDB hydration fixture and measurement contract shared by PR #153 guard regressions and
 * work-count probes. Production snapshot writers/readers and GraphIndex perform all decoding and
 * publication; only host file facts and unrelated source certification admission are controlled.
 */
import { contributorBrowserBundle, contributorBrowserInitialize } from './contributorBrowserFixture.mjs';

/** Include the signature probe; optional committed sources preserve the exact baseline implementations. */
export function hydrationWorkBundle(sourceOverrides = {}) {
  return contributorBrowserBundle(['src/index/GraphIndex.ts', 'src/index/GraphBuilder.ts', 'src/index/IndexSnapshot.ts',
    'src/index/GraphState.ts', 'src/index/RelationResolver.ts', 'src/core/graph/relations.ts', 'tests/support/hydrationWorkProbe.ts'], sourceOverrides);
}

export { contributorBrowserInitialize };

/** Seed genuine cached link facts, canonical pages/evidence and the actual schema-3 chunk stores. */
export const initializeHydrationWork = String.raw`(/** Install fixture capabilities without creating storage until explicitly requested. */ () => {
  /** Capture the requested mode before constructing cache/index owners; callers must always close. */
  window.hydrationWorkFixture=async(name,records,fields,indexingMode='eager',genuineSnapshot=false)=>{
    const M=sourceModules,f=await fixture(name);
    f.app.vault.getName=/** Select only this fixture's disposable cache namespace. */ ()=>name;
    f.app.vault.getAbstractFileByPath=/** Rebind captured files/root; unresolved targets have no physical identity. */ path=>f.files.get(path)??(path===''||path==='/'?f.app.vault.getRoot():null);
    const targets=Array.from({length:records},/** Give each unresolved endpoint a distinct opaque path. */ (_,n)=>'Ghost-'+n),text=targets.map(/** Supply genuine parser input outside measurement. */ path=>'[['+path+']]').join('\n');
    const file=f.add('Hub.md',text),body=M.parseBodyMetadata(text);
    f.app.metadataCache.unresolvedLinks[file.path]=Object.fromEntries(targets.map(/** Match the actual one-occurrence source input. */ path=>[path,1]));
    ok(await f.cache.putBody(file.path,file.stat.mtime,body),'Real hot body seed');
    const settings={indexingMode,hierarchy:{hidden:[],parents:Array.from({length:fields},/** Increase guard input without reclassifying these body links. */ (_,n)=>'Dormant parent '+n),children:[],leftFriends:[],rightFriends:[],previous:[],next:[],exclusions:[]},
      inferAllLinksAsFriends:false,inverseInfer:false,showFullTagName:true,tagStyleList:[],baseNodeStyle:{maxLabelLength:30},noteTypeField:'Type',primaryTagField:'Style',
      lastActivePath:file.path,pinnedNodes:[],excludeFilepaths:[],nameFields:'',maxItemCount:30};
    const plugin={app:f.app,settings,getIndexSourceRevision:/** Physical mutation cases deliberately rely on independent identity/membership checks. */ ()=>0};
    const fingerprints=new Map();
    const builder=new M.GraphBuilder(plugin,f.app,new Map(),{parse:/** Use the canonical parser for synchronous fixture setup. */ async text=>M.parseBodyMetadata(text)},f.cache,/** Seed state has no competing publication lifetime. */ ()=>true,fingerprints);
    let state=M.createGraphState();
    builder.addPage(state,builder.createPage({path:'folder:/',name:'/',isFolder:true}));
    const hub=builder.createPage({path:file.path,name:file.basename,file});builder.addPage(state,hub);
    for(const path of targets){
      const page=builder.createPage({path,name:path});builder.addPage(state,page);
      state.evidence.addPair(hub.path,path,'child',M.RelationType.INFERRED,M.LinkDirection.TO,{sourceKind:'unresolved-link'});
    }
    M.resolveEvidenceStore(state.pages,state.evidence);
    if(genuineSnapshot){state=await builder.build({acquireSources:false});ok(state,'Actual full compiler seed');}
    ok(await f.cache.writeSnapshot({createdAt:Date.now(),urlAliasVersion:M.URL_ALIAS_FACET_VERSION,
      vaultSignature:M.computeVaultSignature(f.app),settingsSignature:M.computeIndexSettingsSignature(settings),discoveredFields:[]},
      [...state.pages.values()].map(/** Preserve actual source signatures when the full compiler produced them. */ page=>M.persistedPageFromGraphPage(page,fingerprints.get(page.path))),
      [...state.evidence.declarations()].map(/** Preserve canonical declaration multiplicity/provenance. */ item=>M.persistedDeclarationFromEvidence(item)),/** Setup generation has no competing writer. */ ()=>true),'Real current graph snapshot');
    f.acquisition.close();
    const index=new M.GraphIndex(plugin,f.app);index.scheduleOrphanCleanup=/** No orphan timer outlives the owned fixture. */ ()=>{};
    const parse=index.metadataParser.parse;
    index.metadataParser.parse=/** Count the actual index parser, preserving its receiver and exact promise. */ function(...args){f.parses.push(args[0]);return parse.apply(this,args);};
    // These holds isolate graph hydration work, preserving the real source owner's continuation
    // and original scheduler. They do not turn a preview into source/write authority.
    let release;const gate=new Promise(/** Retain the release used by independent failure cleanup. */ resolve=>release=resolve);
    const originals=[];
    for(const key of ['reconcile','flush']){const original=index.sourceAcquisition[key];index.sourceAcquisition[key]=/** Hold unrelated source admission, preserving the actual continuation. */ function(...args){return gate.then(/** Forward the original receiver/arguments after release. */ ()=>original.apply(this,args))};originals.push(/** Remove only the fixture's own wrapper. */ ()=>index.sourceAcquisition[key]=original);}
    return {f,index,plugin,settings,file,state,targets,fingerprints,
      /** Coordinator cases may resume the real source owner before delivering a held graph read. */ releaseSources(){release();},
      /** Retire work, wrappers and both storage owners independently of assertions. */ close(){index.metadataParser.parse=parse;index.destroy();for(const restore of originals)restore();release();f.close();}};
  };
  /** Compare cardinality and exact role/target/provenance order outside measurement. */
  window.hydrationWorkValue=index=>({pages:[...index.state.pages].map(/** Preserve page and neighbor insertion order while excluding host file/target object identities. */ ([path,page])=>({path,name:page.name,aliases:page.aliases,neighbours:[...page.neighbours].map(/** Compare complete semantic relation values. */ ([path,{target,...relation}])=>[path,Object.fromEntries(Object.entries(relation).sort(/** Constructor property order is not relationship order. */ ([left],[right])=>left.localeCompare(right)))])})),
    declarations:[...index.state.evidence.declarations()].map(/** Allocation IDs regenerate on restore; all source provenance remains in the oracle. */ ({id,...item})=>item)});
  return true;
})()`;
