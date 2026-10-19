/**
 * Shared test-owned native URL graph fixture. Runs only inside an explicit Obsidian CLI controller,
 * uses real files/parser/compiler/cache and the installed GraphIndex, and isolates persistent cache
 * naming from the actual vault. Owns its note, database, wrappers and selected-window geometry.
 */

/** Set up an isolated actual index and bounded owned files; close must run on every failure. */
export async function nativeUrlFixture(app,text,controller,owners=1) {
  const p=app.plugins.plugins['k-plex'],path='__kplex-153-url-probe.md',namespace='__kplex153_url_'+Date.now();
  /** Fail into caller-owned cleanup instead of weakening any production lifetime. */
  const check=(value,message)=>{if(!value)throw Error(message);};
  check(p,'Existing plugin must be loaded');
  check(app.vault.getMarkdownFiles().length<1000,'Use the small functional vault');
  check(Number.isInteger(owners)&&owners>=1&&owners<=512,'Bounded native URL owner fixture');
  check(!app.vault.getFileByPath(path),'Owned URL note already exists');
  const folderPath='__kplex-153-url-probe-owners';if(owners>1)check(!app.vault.getFolderByPath(folderPath),'Owned URL folder already exists');
  const remote=require('@electron/remote'),win=remote.getCurrentWindow();
  const previous={bounds:win.getBounds(),maximized:win.isMaximized(),minimized:win.isMinimized()};
  remote.app.show?.();remote.app.focus({steal:true});win.restore();win.show();win.moveTop();win.focus();
  let file,folder,index,cache,active=false;const files=[];
  const operations={reads:0,parses:0};
  /** Dispatch actual native tasks while retaining a controller cancellation boundary. */
  const delay=ms=>new Promise(/** Own just this setup wait. */ resolve=>window.setTimeout(resolve,ms));
  /** Setup polling has its own deadline and cannot outlive outer cancellation. */
  const until=async(predicate)=>{const end=performance.now()+60_000;while(!predicate()){check(!controller.closed&&performance.now()<end,'Native setup deadline');await delay(50);}};
  /** Record focus/throttling without changing Electron's background policy. */
  const foreground=()=>({hidden:document.hidden,documentFocused:document.hasFocus(),windowFocused:win.isFocused(),throttling:win.webContents.getBackgroundThrottling(),
    primary:{urlRunning:p.index.urlDiscoveryRunning,publications:p.index.urlPendingPublications,owners:p.index.urlOwnerTasks.size,writes:p.index.urlCacheWrites.size,sourceInventory:Boolean(p.index.sourceAcquisition.inventory)}});
  /** Retire the private index before deleting its independently owned cache/note; continue cleanup after failures. */
  const close=async()=>{
    active=false;const errors=[];
    try{index?.destroy();}catch(error){errors.push(String(error));}
    try{if(cache){check(cache.vaultName===namespace&&namespace!==app.vault.getName(),'Cache ownership');check(await cache.purgeAndClose(),'Owned URL cache purge');}}catch(error){errors.push(String(error));}
    for(const owned of [...files].reverse())try{if(app.vault.getFileByPath(owned.path)===owned)await app.vault.delete(owned);check(!app.vault.getFileByPath(owned.path),'Owned note cleanup');}catch(error){errors.push(String(error));}
    try{if(folder){check(app.vault.getFolderByPath(folderPath)===folder&&folder.children.length===0,'Empty owned folder cleanup');await app.vault.delete(folder,true);}}catch(error){errors.push(String(error));}
    try{win.setBounds(previous.bounds);if(previous.maximized)win.maximize();if(previous.minimized)win.minimize();}catch(error){errors.push(String(error));}
    controller.index=null;if(errors.length)throw Error('Native URL cleanup: '+errors.join('; '));
  };
  controller.cleanup=close;
  try{
    await until(/** Let an exact-build staging reload finish outside measurement before creating native source events. */()=>p.getIndexStatus().upToDate);
    file=await app.vault.create(path,text);files.push(file);
    if(owners>1){folder=await app.vault.createFolder(folderPath);for(let n=1;n<owners;n++)files.push(await app.vault.create(folderPath+'/'+String(n).padStart(4,'0')+'.md',text));}
    await until(/** Use real metadata availability for every actual owned incarnation. */ ()=>files.every(owned=>Boolean(app.metadataCache.getFileCache(owned))));
    const vault=new Proxy(app.vault,{/** Bind all native facts/read methods and override only the cache namespace. */ get(target,key){
      if(key==='getName')return /** No new vault destination is created. */ ()=>namespace;
      const value=Reflect.get(target,key,target);
      if(key==='cachedRead'||key==='read')return /** Count this isolated index's source reads and preserve the original promise. */ (...args)=>{if(active)operations.reads++;return value.apply(target,args);};
      return typeof value==='function'?value.bind(target):value;
    }});
    const host=new Proxy(app,{/** Retired legacy cleanup has no payload in this new namespace; all other APIs remain native. */ get(target,key){
      if(key==='vault')return vault;if(key==='saveLocalStorage')return /** Never alter the actual vault's legacy payload. */ ()=>undefined;
      const value=Reflect.get(target,key,target);return typeof value==='function'?value.bind(target):value;
    }});
    const settings=structuredClone(p.settings);settings.indexingMode='on-demand';
    const plugin={app:host,settings,manifest:{...p.manifest,dir:undefined},getIndexSourceRevision:/** Forward the actual host revision owner. */ ()=>p.getIndexSourceRevision(),
      notifyStartupProgress:/** Preserve the host notification boundary. */ ()=>p.notifyStartupProgress()};
    index=new p.index.constructor(plugin,host);controller.index=index;cache=index.indexedDb;
    const parse=index.metadataParser.parse;
    index.metadataParser.parse=/** Observe the actual parser without altering result or promise identity. */ function(...args){if(active)operations.parses++;return parse.apply(this,args);};
    const body=await index.metadataParser.parse(text);
    await until(/** Finish the primary inventory as well as its current wave before observing an isolated trial. */ ()=>p.getIndexStatus().upToDate&&!p.index.urlDiscoveryRunning
      &&p.index.urlPendingPublications===0&&p.index.urlOwnerTasks.size===0&&p.index.urlCacheWrites.size===0&&!p.index.sourceAcquisition.inventory);
    return {index,file,files,body,settings,operations,check,foreground,close,
      /** Bound source-operation attribution to a timed scenario. */ begin(){operations.reads=0;operations.parses=0;active=true;},
      /** Leave subsequent cleanup/verification outside source-operation counters. */ end(){active=false;}};
  }catch(error){await close();throw error;}
}

/** Preserve ordered graph/evidence values, including IDs, as an aggregate digest input outside timing. */
export function nativeUrlGraphValue(index) {
  return {pages:[...index.urlState.pages].map(/** Exclude real host identity while preserving all named facets and adjacency ordering. */ ([path,page])=>({path,name:page.name,url:page.url,aliases:page.aliases,tags:page.tags,styleTags:page.styleTags,
    neighbours:[...page.neighbours].map(/** Canonical target identity is checked separately by the scenario. */ ([path,{target,...relation}])=>[path,relation])})),
    evidence:[...index.urlState.evidence.declarations()]};
}
