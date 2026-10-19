/**
 * Remote node imagery acceptance against the actual resolver/cache, settings save/completion owners and React
 * node renderer. A controlled loopback image server records request-producing DOM assignments;
 * native Vault APIs are finite doubles, while Chromium, React and IndexedDB are real. No third-party
 * image host is contacted. Separate documents cover mounted-view ownership, not native popout proof.
 */
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import test from 'node:test';
import ts from 'typescript';
import { chromiumHarness } from './support/browserTypeScript.mjs';
import { contributorBrowserBundle, contributorBrowserInitialize } from './support/contributorBrowserFixture.mjs';
import { centerGateSettings } from './support/requestedCenterGateFixture.mjs';

const indexBundle = await contributorBrowserBundle(['src/index/GraphIndex.ts', 'src/index/GraphPresentation.ts', 'src/core/graph/settingsPolicy.ts', 'src/core/contracts/appearance.ts', 'src/adapters/obsidian/savedSettingsRefresh.ts']);
const ui = await build({ stdin: { resolveDir: process.cwd(), contents: `export {ThoughtNode} from './src/ui/ThoughtNode'; export {createElement} from 'react'; export {createRoot} from 'react-dom/client'; export {flushSync} from 'react-dom'; export {renderToStaticMarkup} from 'react-dom/server';` }, bundle: true, write: false, platform: 'browser', format: 'iife', globalName: 'nodeUI', plugins: [{ name: 'native-icon-boundary', setup(builder) {
  builder.onResolve({filter:/^obsidian$/}, /** Keep only the native icon API doubled. */ () => ({path:'obsidian',namespace:'native'}));
  builder.onLoad({filter:/.*/,namespace:'native'}, /** The fixture uses no icons or native shell components. */ () => ({contents:'export const getIcon=()=>null;'}));
} }] });
const main = ts.createSourceFile('main.ts', readFileSync('src/main.ts','utf8'), ts.ScriptTarget.Latest, true);
const owner = main.statements.find(node => ts.isClassDeclaration(node) && node.name?.text === 'KplexPlugin');
const saveMethods = ['saveSettings','refreshSavedSettings'].map(name => owner.members.find(node => node.name?.getText(main) === name));
assert(saveMethods.every(Boolean), 'Compile actual save and completion owners, never a policy or refresh reimplementation');
const saveBundle = ts.transpileModule(`window.imageSaveNotices=[]; const Notice=class {/** Record native feedback without substituting a save or refresh outcome. */ constructor(message){window.imageSaveNotices.push(message)}}; const {captureSettingsPolicy,classifySettingsChange,isStyleOnlySettingsChange,STYLE_SETTINGS_KEYS,SavedSettingsRefresh}=window.sourceModules; window.ImageSaveOwner=class {${saveMethods.map(method=>method.getText(main)).join("\n")}};`, {compilerOptions:{target:ts.ScriptTarget.ES2021,module:ts.ModuleKind.None}}).outputText;
const bundle = indexBundle + '\n' + ui.outputFiles[0].text + '\n' + saveBundle;

/** Own one real browser, real cache and finite image-bearing inventory per scenario. */
async function scenario(code, origin = 'http://127.0.0.1:9') {
  const browser = await chromiumHarness(bundle);
  try {
    await browser.evaluate(contributorBrowserInitialize);
    await browser.evaluate(`(async()=>{
      const M=sourceModules,f=await fixture('remote-node-images'); f.app.vault.getName=()=> 'remote-node-images';
      const local=f.add('Picture.png');
      f.app.vault.getResourcePath=()=> 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAEElEQVR4nGNwONAARAwQCgApDgYBWgscUQAAAABJRU5ErkJggg==';
      const settings={...(${centerGateSettings.toString()})(),hierarchy:{hidden:[],parents:[],children:[],leftFriends:[],rightFriends:[],previous:[],next:[],exclusions:[]},inferAllLinksAsFriends:false,inverseInfer:false,tagStyleList:[],thumbnailProperty:'thumbnail',nodeImageProperty:'node-image',attachmentImageDisplay:'thumbnail-label',indexingMode:'on-demand'};
      const plugin=new ImageSaveOwner();Object.assign(plugin,{translator: key=>key,settings,getIndexSourceRevision:()=>0,app:f.app,startupDiagnostics:{mark(){},count(){},phase(){},/** Image fixture discards aggregate work receipts. */recordWork(){}}});
      const index=new M.GraphIndex(plugin,f.app);plugin.index=index;plugin.savedSettingsPolicy=M.captureSettingsPolicy(settings);
      let persists=0,semanticRefreshes=0;plugin.persistSettingsSnapshot=async()=>{persists++};index.refreshSemanticSettings=async()=>{semanticRefreshes++};
      window.o={M,f,index,settings,plugin,local,origin:${JSON.stringify(origin)},counts:()=>({persists,semanticRefreshes,reads:f.reads.length,parses:f.parses.length}),close(){index.destroy();f.close()}};
      window.page=(path,frontmatter={},inline=null)=>{const file=f.add(path,'',frontmatter);if(inline!==null)index.fieldCache.set(path,{mtime:file.stat.mtime,body:M.parseBodyMetadata(inline)});return {path,file,name:file.basename,tags:[],styleTags:[]}};
      window.visual=async p=>(await index.resolveNodeVisuals([p])).get(p.path)??null;
      window.setConsent=async value=>{settings.allowRemoteNodeImages=value;await plugin.saveSettings()};
      window.pause=ms=>new Promise(resolve=>window.setTimeout(resolve,ms));
      return true;
    })()`);
    return await browser.evaluate(code);
  } finally {
    try { await browser.evaluate('o.close()'); } finally { await browser.cleanup(); }
  }
}

test('actual PlexGraph effects retire late metadata results and queued React updates across revocation and teardown', /** Execute compiled production effect callbacks with controllable promise/state boundaries. */ async () => {
  const graph=ts.createSourceFile('PlexGraph.tsx',readFileSync('src/ui/PlexGraph.tsx','utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  const effects=[];
  /** Select only the real imagery subscriptions, preserving their callbacks and cleanup. */
  const visit=node=>{if(ts.isCallExpression(node)&&node.expression.getText(graph)==='useEffect'&&/index\.resolveNodeVisuals\((visualPages|\[page\])/.test(node.arguments[0]?.getText(graph)??''))effects.push(node.arguments[0].getText(graph));ts.forEachChild(node,visit)};
  visit(graph);assert.equal(effects.length,2);
  for(const effect of effects){
    let epoch=0,resolve,changed;const queued=[],timers=new Map(),requests=[];
    const page={path:'Owned.md'},context={index:{getNodeVisualRevision:()=>epoch,invalidateNodeVisual(){},resolveNodeVisuals:()=>{const task=new Promise(done=>{resolve=done});requests.push(task);return task}},visualPages:[page],visualPageByPath:new Map([[page.path,page]]),visualRefreshTimers:{current:timers},setNodeVisuals:updater=>queued.push(updater),plugin:{app:{metadataCache:{on:(_name,callback)=>{changed=callback;return callback},offref(){changed=null}}}},window:{setTimeout:()=>1,clearTimeout(){}}};
    const emitted=ts.transpileModule('const effect='+effect+';',{compilerOptions:{target:ts.ScriptTarget.ES2021}}).outputText;
    /** Instantiate the production callback in a finite host/effect context. */
    const install=()=>Function(...Object.keys(context),emitted+';return effect();')(...Object.values(context));
    let cleanup=install();if(changed)changed(page);epoch++;resolve(new Map([[page.path,{mode:'replace',path:'https://example.invalid/late.png',src:'https://example.invalid/late.png'}]]));await requests.at(-1);await Promise.resolve();assert.equal(queued.length,0,'Revoked result cannot schedule React publication');cleanup();
    cleanup=install();if(changed)changed(page);resolve(new Map([[page.path,{mode:'thumbnail',path:'https://example.invalid/old.png',src:'https://example.invalid/old.png'}]]));await requests.at(-1);await Promise.resolve();assert.equal(queued.length,1);epoch+=2;const current=new Map();assert.equal(queued.pop()(current),current,'A deferred updater cannot survive an off/on epoch cycle');cleanup();
    cleanup=install();if(changed)changed(page);cleanup();resolve(new Map());await requests.at(-1);await Promise.resolve();assert.equal(queued.length,0,'Teardown retires pending callbacks');assert.equal(timers.size,0,'Metadata refresh timers retire');
  }
});

test('resolved URL forms, mixed fallback, hot/cold inline fields and consent-keyed cache reuse', /** Gate resolved destinations, retaining established parser behavior and local precedence. */ async () => {
  assert.equal(await scenario(`(async()=>{
    const {index,settings,M}=o;
    const forms=['http://127.0.0.1/image.png','https://example.invalid/image.png','HTTPS://EXAMPLE.INVALID/Image.png','[image](https://example.invalid/image.png)','![image](https://example.invalid/image.png)','[[https://example.invalid/image.png|caption]]','[[https%3A%2F%2Fexample.invalid%2Fimage.png]]',{image:'https://example.invalid/image.png'}];
    for(const field of ['thumbnail','node-image'])for(const [i,value]of forms.entries()){
      const p=page(field+i+'.md',{[field]:value});equal(await visual(p),null,'Default blocks '+field+' '+i);
      await setConsent(true);const permitted=await visual(p);ok(permitted&&/^https?:/i.test(permitted.src),'Explicit opt-in resolves '+i);equal(permitted.mode,field==='thumbnail'?'thumbnail':'replace','Mode preserved');
      await setConsent(false);equal(await visual(p),null,'Cached opt-in cannot survive revocation');
    }
    for(const field of ['thumbnail','node-image']){
      const mixed=page(field+'-mixed.md',{[field]:['https://example.invalid/remote.png','[[Picture.png]]']});equal((await visual(mixed)).path,'Picture.png','First allowed local fallback');
      const hot=page(field+'-hot.md',{},field+':: https://example.invalid/inline.png');equal(await visual(hot),null,'Hot inline denied');await setConsent(true);ok(await visual(hot),'Hot inline opt-in');await setConsent(false);
      const cold=page(field+'-cold.md');ok(await index.indexedDb.putBody(cold.path,cold.file.stat.mtime,M.parseBodyMetadata(field+':: https://example.invalid/cold.png')),'Durable body');equal(await visual(cold),null,'Cold inline denied');await setConsent(true);ok(await visual(cold),'Cold inline opt-in');await setConsent(false);
    }
    const fallback=page('fallback.md',{'node-image':'https://example.invalid/replace.png',thumbnail:'[[Picture.png]]'});equal((await visual(fallback)).mode,'thumbnail','Blocked replacement falls back to local thumbnail');
    for(const value of ['ftp://example.invalid/a.png','data:image/png;base64,x','javascript:alert(1)','https://',null,42])equal(await visual(page('invalid-'+String(value)+'.md',{thumbnail:value})),null,'Unsupported/malformed values stay unresolved');
    const attachment={path:o.local.path,file:o.local};equal((await visual(attachment)).mode,'thumbnail','Local attachment default');settings.attachmentImageDisplay='image';equal((await visual(attachment)).mode,'replace','Local replacement attachment');
    return true;
  })()`),true);
});

test('renderer classifies the resolved Vault destination independently of host resource URL spelling', /** Inspect real React output without assigning a test host URL to network-producing DOM. */ async () => {
  assert.equal(await scenario(`(()=>{
    const U=nodeUI,p=page('Local.md'),visual={mode:'replace',src:'https://example.invalid/host-local-resource',path:'Picture.png',alt:'Local'};
    const template=document.createElement('template');
    template.innerHTML=U.renderToStaticMarkup(U.createElement(U.ThoughtNode,{node:{page:p,style:{},label:p.name,role:'center',x:0,y:0,width:120,height:40,gateStats:Object.fromEntries(['top','bottom','left','right'].map(side=>[side,{visibleCount:0,totalCount:0}]))},settings:o.settings,visual,selected:false,highlighted:false,dimmed:false,highlightedGates:new Set(),translate:key=>key}));
    equal([...template.content.querySelectorAll('img')].map(image=>image.getAttribute('src')),[visual.src],'Resolved local file stays visible regardless of host transport');return true;
  })()`),true);
});

test('opt-out, off/on cycles and unload reject held body results and retire remote caches', /** A genuine IDB response is held across permission publication, including synchronous frontmatter in its batch. */ async () => {
  assert.equal(await scenario(`(async()=>{
    const {index,M}=o;await setConsent(true);
    const cold=page('pending.md'),front=page('front.md',{thumbnail:'https://example.invalid/front.png'});
    ok(await index.indexedDb.putBody(cold.path,cold.file.stat.mtime,M.parseBodyMetadata('node-image:: https://example.invalid/pending.png')),'Durable remote body');
    const original=index.indexedDb.getBodies.bind(index.indexedDb);
    for(const mode of ['off','off-on','unload']){
      let release,entered;const gate=new Promise(resolve=>{release=resolve}),started=new Promise(resolve=>{entered=resolve});
      index.indexedDb.getBodies=async requests=>{const result=await original(requests);entered();await gate;return result};
      index.invalidateNodeVisuals();const task=index.resolveNodeVisuals([front,cold]);await started;
      await setConsent(false);equal(index.nodeVisualCache.size,0,'Opt-out clears remote caches before return');
      if(mode==='off-on')await setConsent(true);if(mode==='unload')index.destroy();release();equal((await task).size,0,'Retired generation cannot publish '+mode);
      index.indexedDb.getBodies=original;if(mode!=='unload'){await setConsent(true);ok(await visual(cold),'Re-enable deterministic after stale result');}
    }return true;
  })()`),true);
});

test('consent saves publish before persistence, preserve live revocation and perform zero semantic work', /** Compile the real plugin save method around real GraphIndex and a held storage boundary. */ async () => {
  assert.equal(await scenario(`(async()=>{
    const {index,plugin,settings,M}=o;await setConsent(true);const p=page('cached.md',{thumbnail:'https://example.invalid/cache.png'});ok(await visual(p),'Cache remote');
    const semantic=index.getSemanticRevision(),work=o.f.work.snapshot(),before=o.counts();let releases,notifications=0;
    const pending=new Promise(resolve=>{releases=resolve});plugin.persistSettingsSnapshot=()=>pending;
    const off=index.subscribePresentation(()=>{notifications++;equal(index.nodeVisualCache.size,0,'Cache retired before notifying');equal(M.withPreparedPresentation(settings,index.presentationSettings).allowRemoteNodeImages,false,'Live revocation overrides old prepared policy');});
    settings.allowRemoteNodeImages=false;const task=plugin.saveSettings();ok(notifications>0,'Synchronous publication before held persistence');equal(index.nodeVisualCache.size,0,'Cached remote gone');off();releases();await task;
    equal(index.getSemanticRevision(),semantic,'Semantic revision preserved');equal(o.f.work.snapshot(),work,'No source work');equal(o.counts().reads,before.reads,'No Vault reads');equal(o.counts().parses,before.parses,'No parses');equal(o.counts().semanticRefreshes,0,'No scope refresh');return true;
  })()`),true);
});

test('real React image elements make zero remote requests without consent across navigation, expansion, hover and multiple documents', /** Count network arrivals at a test-owned origin; stale visuals also cross the actual rendering boundary. */ async () => {
  const requests=[];
  const server=createServer(/** Count image arrivals independently from test-owned phase checkpoints. */ (request,response)=>{
    response.setHeader('Access-Control-Allow-Origin','*');response.setHeader('Cache-Control','no-store');
    if(request.url==='/checkpoint'){response.setHeader('Content-Type','application/json');response.end(JSON.stringify(requests));return;}
    requests.push(request.url);response.setHeader('Content-Type','image/png');response.end(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAEElEQVR4nGNwONAARAwQCgApDgYBWgscUQAAAABJRU5ErkJggg==','base64'));
  });
  await new Promise(/** Bind only loopback on an ephemeral port. */ resolve=>server.listen(0,'127.0.0.1',resolve));
  try {
    const origin=`http://127.0.0.1:${server.address().port}`;
    const result=await scenario(`(async()=>{
      const U=nodeUI,{settings,origin,index}=o;
      const frame=document.createElement('iframe');document.body.append(frame);await pause(50);
      const root=U.createRoot(document.body.appendChild(document.createElement('main'))),other=U.createRoot(frame.contentDocument.body);
      const pages=[page('thumb.md',{thumbnail:origin+'/thumb.png'}),page('replace.md',{'node-image':origin+'/replace.png'}),page('inline.md',{},'thumbnail:: '+origin+'/inline.png'),page('inline-replace.md',{},'node-image:: '+origin+'/inline-replace.png'),page('local.md',{thumbnail:'[[Picture.png]]'})];
      let last=new Map();
      const render=(visuals,token='')=>{const nodes=pages.map((p,i)=>{const v=visuals.get(p.path);return U.createElement(U.ThoughtNode,{key:p.path+token,node:{page:p,style:{},label:p.name,role:i===0?'center':'child',x:70,y:30+i*60,width:120,height:40,gateStats:Object.fromEntries(['top','bottom','left','right'].map(side=>[side,{visibleCount:0,totalCount:0}]))},settings,visual:v,selected:false,highlighted:false,dimmed:false,highlightedGates:new Set(),translate:key=>key,onActivate(){},onOpen(){},onHoverNode(){},onHoverGate(){},onHoverEnd(){},onHoverPreview(){},onGatePointerDown(){},onNodePointerDown(){}})});U.flushSync(()=>{root.render(nodes);other.render(nodes)});};
      const sources=()=>[...document.querySelectorAll('main img'),...frame.contentDocument.querySelectorAll('img')].map(img=>img.getAttribute('src'));
      try{
        for(const token of ['initial','navigate','expand']){render(await index.resolveNodeVisuals(pages),token);for(const img of [...document.querySelectorAll('main img'),...frame.contentDocument.querySelectorAll('img')])img.dispatchEvent(new PointerEvent('pointerover',{bubbles:true}));await pause(120);ok(sources().every(src=>!src.startsWith(origin)),'No denied src assigned '+token);}
        await pause(300);const noConsent=sources(),noConsentLabels=[...document.querySelectorAll('main .kplex-thought-text')].map(el=>el.textContent),initialRequests=await (await fetch(origin+'/checkpoint')).json();await setConsent(true);last=await index.resolveNodeVisuals(pages);render(last,'permitted');await pause(700);const permitted=sources(),permittedRequests=await (await fetch(origin+'/checkpoint')).json();
        await setConsent(false);render(last,'revoked-cached');await pause(200);const revoked=sources(),revokedLabels=[...document.querySelectorAll('main .kplex-thought-text')].map(el=>el.textContent);
        // A brand-new remote URL retained by a pending caller must never reach an img after opt-out.
        const stale=new Map([[pages[0].path,{mode:'thumbnail',src:origin+'/never-after-revoke.png',path:origin+'/never-after-revoke.png',alt:'stale'}]]);render(stale,'late');await pause(250);const late=sources();
        return {noConsent,noConsentLabels,permitted,revoked,revokedLabels,late,initialRequests,permittedRequests,revokedRequests:await (await fetch(origin+'/checkpoint')).json()};
      }finally{U.flushSync(()=>{root.unmount();other.unmount()});frame.remove()}
    })()`,origin);
    assert(result.noConsent.every(src=>src.startsWith('data:')));
    assert(result.noConsentLabels.includes('replace')&&result.noConsentLabels.includes('inline-replace'),'Denied replacement images retain ordinary labels');
    assert(result.revokedLabels.includes('replace')&&result.revokedLabels.includes('inline-replace'),'Revocation restores ordinary labels even with retained image props');
    assert.deepEqual(result.initialRequests,[],'Zero actual image requests before explicit opt-in');
    assert.deepEqual(result.revokedRequests,result.permittedRequests,'Revocation and retained props send zero new requests');
    assert.equal(result.permitted.filter(src=>src.startsWith(origin)).length,8,'Both image modes/inline values render in both documents after opt-in');
    assert(result.revoked.every(src=>src.startsWith('data:')));assert.equal(result.late.length,0);
    assert(requests.some(path=>path==='/thumb.png'));assert(requests.some(path=>path==='/replace.png'));
    assert(requests.some(path=>path==='/inline.png'));assert(requests.some(path=>path==='/inline-replace.png'));
    assert(!requests.includes('/never-after-revoke.png'));
    // Only the four explicitly opted-in image URLs may ever reach the server.
    assert(requests.every(path=>['/thumb.png','/replace.png','/inline.png','/inline-replace.png'].includes(path)));
  } finally { await new Promise(/** Close the owned image origin even after failed assertions. */ resolve=>server.close(resolve)); }
});


test('held optional refresh cannot undo immediate image revocation or trap a durable consent save',async()=>{
 assert.equal(await scenario(`(async()=>{
  const {index,settings,plugin}=o;await setConsent(true);let release;
  const refresh=index.refreshPresentationSettings.bind(index),gate=new Promise(resolve=>release=resolve),before=o.counts();
  index.refreshPresentationSettings=async()=>{await gate;return refresh()};
  try{const pending=setConsent(false);equal(settings.allowRemoteNodeImages,false,'Revocation is synchronous');await pending;
   ok(window.imageSaveNotices.includes('settings.savedRefreshPending'),'Durable pending has truthful native feedback');
   equal(o.counts().semanticRefreshes,before.semanticRefreshes,'No semantic refresh for consent');equal(o.counts().reads,before.reads,'No note reads');equal(o.counts().parses,before.parses,'No acquisition parsing');return true;
  }finally{release();index.refreshPresentationSettings=refresh}
 })()`),true);
});
