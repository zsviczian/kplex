/** Explicit host/event doubles around production acquisition, storage, replay and discovery in real Chromium. */
import { browserBundle } from "./browserTypeScript.mjs";

/** Compile real production modules; only Obsidian's host API is represented by fixture entities/events. */
export async function contributorBrowserBundle() {
  return browserBundle([
    "src/index/IndexedDbCache.ts", "src/index/SourceFacts.ts", "src/index/SourceContributorDiscovery.ts",
    "src/adapters/obsidian/sourceAcquisition.ts", "src/core/parser/metadata.ts",
    "src/adapters/obsidian/structuralSourceCollector.ts", "src/index/SourceReplay.ts", "src/index/SourceContributorSummary.ts", "src/index/SourceContributorJournal.ts", "src/index/fieldParser.ts",
  ], { obsidian: `exports.Platform={isMobile:false,isIosApp:false}; exports.TFile=class TFile {
    constructor(path){this.path=path;this.name=path.split('/').pop();this.extension=path.split('.').pop();this.basename=this.name.replace(/\\.[^.]+$/,'');this.stat={mtime:1,size:100,ctime:1};this.parent=null;}
  }; exports.TFolder=class TFolder {constructor(){this.path='';this.name='';this.children=[];this.parent=null;}};
  exports.getAllTags=cache=>cache.hostTags??[];window.ContributorFile=exports.TFile;window.ContributorFolder=exports.TFolder;` });
}

/** Executed in the real browser: no IDB implementation, transaction or source module is substituted. */
export const contributorBrowserInitialize = `(() => {
  const M = window.sourceModules;
  window.ok = (value,message) => {if(!value)throw new Error(message);};
  window.equal = (actual,expected,message) => ok(JSON.stringify(actual)===JSON.stringify(expected),message+': '+JSON.stringify(actual));
  window.value = request => new Promise((resolve,reject)=>{request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
  window.edit = async (db,stores,callback) => {
    const tx=db.transaction(stores,'readwrite');
    const done=new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error);tx.onerror=()=>reject(tx.error);});
    const [result]=await Promise.all([callback(tx),done]);return result;
  };
  window.dbName = vault => 'k-plex-index-v1-'+[...new TextEncoder().encode(vault)].map(v=>v.toString(16).padStart(2,'0')).join('').slice(0,96);
  window.rawOpen = (name,version,upgrade) => new Promise((resolve,reject)=>{const r=indexedDB.open(name,version);r.onupgradeneeded=()=>upgrade?.(r.result,r.transaction);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
  window.runtime = () => ({now:()=>0,yield:async()=>{},sliceBudgetMs:8,resolverBatchSize:50,isCurrent:()=>true});
  window.ref = (id,kind='document') => ({id,kind,state:'materialized',semanticPath:id,...(kind==='document'?{physicalPath:id}:{})});
  window.absent = () => ({kind:'pair',endpoints:[ref('no-such-A'),ref('no-such-B')]});
  window.fixture = async vault => {
    const events=()=>{const refs=new Set();return {on(name,callback){const r={name,callback};refs.add(r);return r;},offref(r){refs.delete(r);},trigger(name,...args){for(const r of refs)if(r.name===name)r.callback(...args);}};};
    const files=new Map(),metadata=new Map(),texts=new Map(),root=new window.ContributorFolder();
    const reads=[],parses=[];
    const app={vault:{...events(),getFileByPath:path=>files.get(path)??null,getFiles:()=>[...files.values()],
      getMarkdownFiles:()=>[...files.values()].filter(file=>file.extension==='md'),getRoot:()=>{root.children=[...files.values()];return root;},
      cachedRead:async file=>{reads.push(file.path);return texts.get(file.path)??'';}},
      metadataCache:{...events(),resolvedLinks:{},unresolvedLinks:{},getFileCache:file=>metadata.get(file.path)??null,
        getFirstLinkpathDest:literal=>files.get(literal)??files.get(literal+'.md')??null},
      dateFields:new Set(),daily:{folder:'Daily',format:'YYYY-MM-DD'}};
    app.vault.read=app.vault.cachedRead;app.metadataTypeManager={getPropertyInfo:name=>({widget:app.dateFields.has(name)?'date':'text'})};
    app.internalPlugins={getPluginById:()=>({enabled:true,instance:{options:app.daily}})};
    window.moment=input=>({isValid:()=>true,format:()=>input});
    const cache=new M.KplexIndexedDbCache(vault);ok(await cache.open(),'Real IDB must open');
    const acquisition=new M.ObsidianSourceAcquisition(app,cache,async text=>{parses.push(text);return M.parseBodyMetadata(text);});
    const add=(path,text='',frontmatter={})=>{const file=new window.ContributorFile(path);file.parent=root;files.set(path,file);texts.set(path,text);metadata.set(path,{frontmatter,links:[]});return file;};
    const acquire=async()=>{for(const file of app.vault.getMarkdownFiles()){const result=await acquisition.acquire(file,M.parseBodyMetadata(texts.get(file.path)));ok(result.current,'Source current');ok(result.saved,'Source durable: '+result.reason);}};
    const build=async()=>{const d=acquisition.contributorDiscovery(runtime());const result=await d.rebuild();equal(result.outcome,'ready','Catalog activation '+JSON.stringify(result));return d;};
    return {app,cache,repository:cache.sources,acquisition,files,metadata,texts,reads,parses,add,acquire,build,
      close(){acquisition.close();cache.close();}};
  };
  window.seed = async vault => {const f=await fixture(vault);f.add('A.md','Friends:: [[B]]');f.add('B.md','Opposes:: [[A]]');f.add('C.md','[Page](https://example.com/path)');f.metadata.get('C.md').hostTags=['#project/nested'];await f.acquire();return f;};
  return true;
})()`;
