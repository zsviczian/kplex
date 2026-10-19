/**
 * Package C experiment fixture layered on the accepted real-IDB hydration fixture. Genuine Markdown
 * and the actual builder create the saved body-only URL edge; transaction-complete cache replay is
 * then held independently of graph preview. All gates/wrappers have explicit failure cleanup.
 */
import { initializeHydrationWork } from './hydrationWorkFixture.mjs';
import { centerGateSettings } from './requestedCenterGateFixture.mjs';

/** Install test-owned setup/holds; no producer, compiler, scheduler or snapshot decoder is replaced. */
export const initializeSavedPreviewUrl=initializeHydrationWork+`;const savedPreviewDisplaySettings=${centerGateSettings.toString()};`+String.raw`;
(/** Define reusable experiment ownership inside the isolated browser. */ ()=>{
  /** A bounded experiment wait never changes either production inactivity watchdog. */
  window.savedPreviewDeadline=(promise,label,ms=3000)=>{
    let timer;return Promise.race([promise,new Promise((_,reject)=>timer=setTimeout(()=>reject(Error(label+' remained pending')),ms))]).finally(()=>clearTimeout(timer));
  };
  /** Build actual warm graph/URL records, then stop cache replay after real acquisition. */
  window.savedPreviewUrlFixture=async(name,mode,phase='page',genuineFingerprints=false)=>{
    const q=await hydrationWorkFixture(name,16,0,mode),{f,index,settings}=q,M=sourceModules,target='https://cache.example/saved-preview';
    let release,entered,held=false;const gate=new Promise(resolve=>release=resolve),entry=new Promise(resolve=>entered=resolve),restores=[];
    try{
      ok(index.isOnDemandMode()===(mode==='on-demand'),'Actual captured strategy');
      Object.assign(settings,savedPreviewDisplaySettings({maxItemCount:30,renderSiblings:false}));
      await index.refreshPresentationSettings();
      const text=f.texts.get(q.file.path)+'\n[Saved body URL]('+target+')',body=M.parseBodyMetadata(text);
      f.texts.set(q.file.path,text);q.file.stat.mtime++;q.file.stat.size=text.length;
      ok(await f.cache.putBody(q.file.path,q.file.stat.mtime,body),'Current parsed body');
      index.fieldCache.set(q.file.path,{mtime:q.file.stat.mtime,body});
      const fingerprints=new Map();
      const builder=new M.GraphBuilder(q.plugin,f.app,new Map(),index.metadataParser,f.cache,/** Setup has no competing graph generation. */ ()=>true,fingerprints);
      const saved=await builder.build({acquireSources:false});ok(saved?.pages.has(target),'Real saved body URL');
      ok(await f.cache.writeSnapshot({createdAt:Date.now(),urlAliasVersion:M.URL_ALIAS_FACET_VERSION,
        vaultSignature:M.computeVaultSignature(f.app),settingsSignature:M.computeIndexSettingsSignature(settings),discoveredFields:[]},
        [...saved.pages.values()].map(/** Only proof-specific cases opt into genuine saved fingerprints. */ page=>M.persistedPageFromGraphPage(page,genuineFingerprints?fingerprints.get(page.path):undefined)),[...saved.evidence.declarations()].map(item=>M.persistedDeclarationFromEvidence(item)),()=>true),'Current snapshot activation');
      ok(await f.cache.putUrlOwners([{path:q.file.path,mtime:q.file.stat.mtime,size:q.file.stat.size,frontmatter:{},urls:body.urls,inlineFieldOccurrences:body.inlineFieldOccurrences}]),'Current URL owner');
      if(phase==='page'){
        const original=index.indexedDb.readUrlOwnerPage;
        index.indexedDb.readUrlOwnerPage=async function(...args){const page=await original.apply(this,args);if(!held){held=true;entered();await gate;}return page;};
        restores.push(()=>index.indexedDb.readUrlOwnerPage=original);
      }else if(phase==='publication'){
        index.urlPublicationLane=gate;
        const original=index.publishUrlOwner;
        index.publishUrlOwner=function(...args){const value=original.apply(this,args);if(!held){held=true;entered();}return value;};
        restores.push(()=>index.publishUrlOwner=original);
      }else if(phase==='compiler'){
        const original=index.prepareUrlAliasOwners;
        index.prepareUrlAliasOwners=async function(...args){if(!held){held=true;entered();await gate;}return original.apply(this,args);};
        restores.push(()=>index.prepareUrlAliasOwners=original);
      }else throw Error('Unknown URL hold');
      f.reads.length=0;f.parses.length=0;
      return {...q,body,target,saved,entered:entry,release,
        close(){index.destroy();for(const restore of restores.reverse())restore();release();q.close();}};
    }catch(error){index.destroy();for(const restore of restores.reverse())restore();release();q.close();throw error;}
  };
  return true;
})()`;
