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
import {loadPortableModules} from './support/portableTypeScript.mjs';

const {exports:{YoutubeThumbnails,YOUTUBE_THUMBNAIL_LIMITS,youtubeVideo,youtubeThumbnailUrls,urlEmbed}}=loadPortableModules([
  'src/application/youtubeThumbnails.ts','src/core/contracts/videoUrl.ts','src/ui/features/urlEmbed.ts']);
const {exports:{decodeLocalVideoFrame,LOCAL_VIDEO_FRAME_LIMITS,LocalVideoThumbnails,LOCAL_VIDEO_THUMBNAIL_LIMITS}}=loadPortableModules([
  'src/adapters/obsidian/localVideoFrame.ts','src/adapters/obsidian/localVideoThumbnails.ts']);

const indexBundle = await contributorBrowserBundle(['src/index/GraphIndex.ts', 'src/index/GraphPresentation.ts', 'src/core/graph/settingsPolicy.ts', 'src/core/plex/savedPins.ts', 'src/core/plex/attachmentVisibility.ts', 'src/core/contracts/ontologyConfiguration.ts', 'src/core/contracts/appearance.ts', 'src/adapters/obsidian/savedSettingsRefresh.ts']);
const ui = await build({ stdin: { resolveDir: process.cwd(), contents: `export {ThoughtNode} from './src/ui/ThoughtNode'; export {NodeVisualImage} from './src/ui/features/NodeVisualImage'; export {youtubeThumbnailLoader} from './src/adapters/obsidian/youtubeThumbnails'; export {LocalVideoThumbnails} from './src/adapters/obsidian/localVideoThumbnails'; export {createElement} from 'react'; export {createRoot} from 'react-dom/client'; export {flushSync} from 'react-dom'; export {renderToStaticMarkup} from 'react-dom/server';` }, bundle: true, write: false, platform: 'browser', format: 'iife', globalName: 'nodeUI', plugins: [{ name: 'native-icon-boundary', setup(builder) {
  builder.onResolve({filter:/^obsidian$/}, /** Keep only the native icon API doubled. */ () => ({path:'obsidian',namespace:'native'}));
  builder.onLoad({filter:/.*/,namespace:'native'}, /** Only thumbnail requests use a controlled native HTTP boundary; no third-party host is contacted. */ () => ({contents:'export const getIcon=()=>null; export const requestUrl=options=>window.thumbnailRequest(options);'}));
} }] });
const main = ts.createSourceFile('main.ts', readFileSync('src/main.ts','utf8'), ts.ScriptTarget.Latest, true);
const owner = main.statements.find(node => ts.isClassDeclaration(node) && node.name?.text === 'KplexPlugin');
const saveMethods = ['saveSettings','refreshSavedSettings','refreshPeriodicPins','stopPeriodicPinTimer'].map(name => owner.members.find(node => node.name?.getText(main) === name));
assert(saveMethods.every(Boolean), 'Compile actual save and completion owners, never a policy or refresh reimplementation');
const saveBundle = ts.transpileModule(`window.imageSaveNotices=[]; const Notice=class {/** Record native feedback without substituting a save or refresh outcome. */ constructor(message){window.imageSaveNotices.push(message)}}; const {ATTACHMENT_VISIBILITY_KEYS,reconcileAttachmentVisibility,isPeriodicPin,ontologyConfiguration,captureSettingsPolicy,classifySettingsChange,isStyleOnlySettingsChange,STYLE_SETTINGS_KEYS,SavedSettingsRefresh}=window.sourceModules; window.ImageSaveOwner=class {periodicPinTimer=null;periodicPinSignature=null;${saveMethods.map(method=>method.getText(main)).join("\n")}};`, {compilerOptions:{target:ts.ScriptTarget.ES2021,module:ts.ModuleKind.None}}).outputText;
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
      const settings={...(${centerGateSettings.toString()})(),pinnedNodes:[],hierarchy:{hidden:[],parents:[],children:[],leftFriends:[],rightFriends:[],previous:[],next:[],exclusions:[]},inferAllLinksAsFriends:false,inverseInfer:false,tagStyleList:[],thumbnailProperty:'thumbnail',nodeImageProperty:'node-image',attachmentImageDisplay:'thumbnail-label',indexingMode:'on-demand'};
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
    const page={path:'Owned.md'},context={viewSession:undefined,index:{getNodeVisualRevision:()=>epoch,invalidateNodeVisual(){},resolveNodeVisuals:()=>{const task=new Promise(done=>{resolve=done});requests.push(task);return task}},visualPages:[page],visualPageByPath:new Map([[page.path,page]]),visualRefreshTimers:{current:timers},setNodeVisuals:updater=>queued.push(updater),plugin:{app:{metadataCache:{on:(_name,callback)=>{changed=callback;return callback},offref(){changed=null}}}},window:{setTimeout:()=>1,clearTimeout(){}}};
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

test('local video thumbnails align with the title and leave a half-rem gap at both node sizes', async () => {
  const css = readFileSync('styles.css', 'utf8') + '\n:root {font-size:20px;}';
  assert.equal(await scenario(`(async()=>{
    const U=nodeUI, video=page('Clip.mp4'), host=document.body.appendChild(document.createElement('div'));
    const styles=document.head.appendChild(document.createElement('style'));styles.textContent=${JSON.stringify(css)};
    const src=o.f.app.vault.getResourcePath(video.file);
    const loader={eligible:()=>true,permitted:()=>true,acquire:()=>({promise:Promise.resolve(src),release(){}})};
    const root=U.createRoot(host), settings={...o.settings,generateLocalVideoThumbnails:true};
    const gateStats=Object.fromEntries(['top','bottom','left','right'].map(side=>[side,{visibleCount:0,totalCount:0}]));
    try {
      for(const role of ['center','child'])for(const direction of ['ltr','rtl']){
        host.dir=direction;
        const node={page:video,style:{icon:'paperclip'},label:video.name,role,x:160,y:50,width:280,height:48,gateStats};
        U.flushSync(()=>root.render(U.createElement(U.ThoughtNode,{node,settings,localVideoThumbnails:loader,
          selected:false,highlighted:false,dimmed:false,highlightedGates:new Set(),translate:key=>key})));
        const image=()=>host.querySelector('.kplex-local-video-slot img');
        for(let attempt=0;attempt<80&&!image()?.naturalWidth;attempt++)await pause(20);
        ok(image()?.naturalWidth,'Visible local frame');
        const frame=image().getBoundingClientRect(), label=host.querySelector('.kplex-thought-text'), title=label.getBoundingClientRect();
        const gap=direction==='ltr'?title.left-frame.right:frame.left-title.right;
        const titleOffset=(frame.top+frame.height/2)-(title.top+title.height/2);
        ok(Math.abs(gap-10)<0.1,role+' video title has a half-rem gap in '+direction+' mode, got '+gap);
        ok(Math.abs(titleOffset-parseFloat(getComputedStyle(label).fontSize)*.05)<0.1,role+' video frame sits slightly below the center of the title line box');
      }
      return true;
    }finally{U.flushSync(()=>root.unmount());host.remove();styles.remove();}
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
   equal(window.imageSaveNotices,[],'Normal queued consent save must not emit a generic recovery notice');
   equal(o.counts().semanticRefreshes,before.semanticRefreshes,'No semantic refresh for consent');equal(o.counts().reads,before.reads,'No note reads');equal(o.counts().parses,before.parses,'No acquisition parsing');return true;
  }finally{release();index.refreshPresentationSettings=refresh}
 })()`),true);
});

test('YouTube thumbnail identity shares the existing embed allowlist and preserves full navigation URLs',()=>{
 const id='z8UkHGpykYU';
 for(const raw of [`https://youtu.be/${id}?t=60`,`https://www.youtube.com/watch?v=${id}&t=90`,`https://m.youtube.com/embed/${id}`,
  `https://www.youtube-nocookie.com/embed/${id}`,`https://youtube.com/shorts/${id}`,`https://youtube.com/live/${id}`]){
  assert.equal(youtubeVideo(new URL(raw)).id,id);assert.match(urlEmbed(raw).url,new RegExp('/embed/'+id));
 }
 for(const raw of [`https://youtube.com.attacker.invalid/watch?v=${id}`,`https://youtu.be.attacker.invalid/${id}`,
  `javascript:alert(1)`,`ftp://youtube.com/watch?v=${id}`,`https://youtube.com/watch?v=short`,`https://youtube.com/shorts/bad%2F${id}`])assert.equal(youtubeVideo(new URL(raw)),null,raw);
 assert.deepEqual(youtubeThumbnailUrls('../bad'),[]);
 assert.deepEqual(youtubeThumbnailUrls(id).map(url=>url.split('/').at(-1)),['maxresdefault.jpg','hq720.jpg','mqdefault.jpg','default.jpg']);
});

test('thumbnail leases coalesce videos, retain independent subscribers and try each quality at most once',async()=>{
 const calls=[],body={bytes:new Uint8Array([255,216,255,1]).buffer,mime:'image/jpeg'},current=()=>true;
 let release;const first=new Promise(resolve=>release=resolve),cache=new YoutubeThumbnails(async url=>{calls.push(url);if(calls.length===1)await first;return calls.length===4?body:null});
 const a=cache.acquire('z8UkHGpykYU',current),b=cache.acquire('z8UkHGpykYU',current);assert.equal(a.promise,b.promise);assert.equal(calls.length,1);
 a.release();a.release();release();assert.equal(await b.promise,body);assert.deepEqual(calls.map(url=>url.split('/').at(-1)),['maxresdefault.jpg','hq720.jpg','mqdefault.jpg','default.jpg']);
 const c=cache.acquire('z8UkHGpykYU',current);assert.equal(await c.promise,body);assert.equal(calls.length,4,'Mounted subscribers reuse successful bytes');b.release();c.release();
 assert.equal(cache.entries.size,0);assert.equal(cache.bytes,0,'Final release retires decoded payload cache');
});

test('consent revocation and final release stop fallback, stale results and negative retry loops',async()=>{
 for(const retire of ['permission','release']){
  let permitted=true,release;const requests=[],held=new Promise(resolve=>release=resolve),cache=new YoutubeThumbnails(async url=>{requests.push(url);await held;return null});
  const lease=cache.acquire('z8UkHGpykYU',()=>permitted);
  if(retire==='permission')permitted=false;else lease.release();release();assert.equal(await lease.promise,null);assert.equal(requests.length,1,retire);lease.release();assert.equal(cache.entries.size,0);
 }
 let calls=0;const cache=new YoutubeThumbnails(async()=>{calls++;throw Error('Offline')});
 const first=cache.acquire('z8UkHGpykYU',()=>true);assert.equal(await first.promise,null);assert.equal(calls,4);
 const again=cache.acquire('z8UkHGpykYU',()=>true);assert.equal(await again.promise,null);assert.equal(calls,4,'A mounted failed video does not spin');first.release();again.release();
 for(const value of ['bad','../bad']){const denied=cache.acquire(value,()=>true);assert.equal(await denied.promise,null);denied.release()}
 assert.equal(await cache.acquire('z8UkHGpykYU',()=>false).promise,null);assert.equal(calls,4,'Invalid/denied inputs send no requests');
});

test('thumbnail service bounds pending entries, individual payloads and total retained bytes',async()=>{
 let complete;const waiting=new Promise(resolve=>complete=resolve),calls=[],pending=new YoutubeThumbnails(async url=>{calls.push(url);await waiting;return null}),leases=[];
 for(let i=0;i<YOUTUBE_THUMBNAIL_LIMITS.entries;i++)leases.push(pending.acquire(String(i).padStart(11,'0'),()=>true));
 assert.equal(await pending.acquire('99999999999',()=>true).promise,null);assert.equal(calls.length,YOUTUBE_THUMBNAIL_LIMITS.entries);
 leases.forEach(lease=>lease.release());complete();await Promise.all(leases.map(lease=>lease.promise));assert.equal(pending.entries.size,0);
 for(const payload of [{bytes:new ArrayBuffer(YOUTUBE_THUMBNAIL_LIMITS.imageBytes+1),mime:'image/jpeg'},{bytes:new ArrayBuffer(4),mime:'text/html'}]){
  const cache=new YoutubeThumbnails(async()=>payload),lease=cache.acquire('z8UkHGpykYU',()=>true);assert.equal(await lease.promise,null);lease.release();assert.equal(cache.bytes,0);
 }
 const bytes=new ArrayBuffer(YOUTUBE_THUMBNAIL_LIMITS.imageBytes),cache=new YoutubeThumbnails(async()=>({bytes,mime:'image/jpeg'})),kept=[];
 for(let i=0;i<8;i++){const lease=cache.acquire(String(i).padStart(11,'0'),()=>true);assert(await lease.promise);kept.push(lease)}
 const excess=cache.acquire('99999999999',()=>true);assert.equal(await excess.promise,null);assert.equal(cache.bytes,YOUTUBE_THUMBNAIL_LIMITS.cacheBytes);excess.release();kept.forEach(lease=>lease.release());assert.equal(cache.bytes,0);
});

test('visible URL imagery yields only consent-gated candidates without source work, title changes or graph deduplication',async()=>{
 assert.equal(await scenario(`(async()=>{
  const {index,settings}=o,id='z8UkHGpykYU',a={path:'https://youtu.be/'+id+'?t=30',url:'https://youtu.be/'+id+'?t=30',name:'Authored A',file:null},b={path:'https://youtube.com/watch?v='+id+'&t=90',url:'https://youtube.com/watch?v='+id+'&t=90',name:'Authored B',file:null};
  const before=o.counts(),revision=index.getSemanticRevision();equal((await index.resolveNodeVisuals([a,b])).size,0,'Consent off');await setConsent(true);
  const result=await index.resolveNodeVisuals([a,b]);equal(result.size,2,'Separate graph identities retained');equal(result.get(a.path).youtubeId,id,'Validated shared video ID');equal(result.get(b.path).youtubeId,id,'Timestamp variant shares only image request');equal(a.name,'Authored A','Title unchanged');equal(a.url,'https://youtu.be/'+id+'?t=30','Navigation URL unchanged');
  equal(result.get(a.path).mode,'thumbnail','Preview retains label');equal(index.getSemanticRevision(),revision,'No semantic publication');equal(o.counts().reads,before.reads,'No source reads');equal(o.counts().parses,before.parses,'No parses');
  equal((await index.resolveNodeVisuals([{path:'bad',url:'https://youtube.com.attacker.invalid/watch?v='+id,file:null}])).size,0,'Denied host');return true;
 })()`),true);
});

test('real image component admits only visible consented thumbnails and retires pending native requests on replacement',async()=>{
 assert.equal(await scenario(`(async()=>{
  const U=nodeUI,{settings}=o,host=document.body.appendChild(document.createElement('main')),root=U.createRoot(host),calls=[];
  host.className='thumbnail-test';const sheet=document.head.appendChild(document.createElement('style'));sheet.textContent='.thumbnail-test img {width:24px;height:24px}';
  let consent=false,pending=null;window.thumbnailRequest=async options=>{calls.push(options.url);if(pending)await pending;return {status:404,arrayBuffer:new ArrayBuffer(0)}};
  const loader=U.youtubeThumbnailLoader(()=>consent),render=(id='z8UkHGpykYU',allow=consent)=>U.flushSync(()=>root.render(U.createElement(U.NodeVisualImage,{src:'https://i.ytimg.com/vi/'+id+'/maxresdefault.jpg',path:'https://i.ytimg.com/vi/'+id+'/maxresdefault.jpg',youtubeId:id,allowRemote:allow,loader,alt:''})));
  try{
   render();await pause(100);equal(calls,[],'Permission off has no image or transport');
   consent=true;host.style.marginTop='20000px';render();await pause(150);equal(calls,[],'Offscreen remains lazy');
   host.style.marginTop='0';await pause(200);equal(calls.length,4,'Visible failure follows each quality once');equal([...host.querySelectorAll('img[src]')].length,0,'Offline keeps normal label/icon fallback');render();await pause(100);equal(calls.length,4,'Ordinary rerender does not retry');
   let release;pending=new Promise(resolve=>release=resolve);render('aaaaaaaaaaa');await pause(100);equal(calls.length,5,'One new video request');
   consent=false;release();await pause(100);equal(calls.length,5,'Live permission stops fallback before a render');render('aaaaaaaaaaa',false);equal(host.querySelectorAll('img').length,0,'Revocation removes src boundary');
   consent=true;pending=null;render('bbbbbbbbbbb');await pause(150);equal(calls.length,9,'New identity starts its own bounded request');
  }finally{U.flushSync(()=>root.unmount());host.remove();sheet.remove();delete window.thumbnailRequest}return true;
 })()`),true);
});

test('successful video payloads coalesce across documents and revoke each owner Blob URL on teardown',async()=>{
 assert.equal(await scenario(`(async()=>{
  const U=nodeUI,host=document.body.appendChild(document.createElement('main')),frame=document.body.appendChild(document.createElement('iframe'));await pause(50);
  const canvas=document.createElement('canvas');canvas.width=canvas.height=2;const bytes=Uint8Array.from(atob(canvas.toDataURL('image/jpeg').split(',')[1]),char=>char.charCodeAt(0)).buffer,calls=[],revoked=[];
  window.thumbnailRequest=async options=>{calls.push(options.url);return {status:200,arrayBuffer:bytes}};
  const root=U.createRoot(host),other=U.createRoot(frame.contentDocument.body),loader=U.youtubeThumbnailLoader(()=>true),saved=[];
  for(const [owner,name]of [[window,'main'],[frame.contentWindow,'other']]){const original=owner.URL.revokeObjectURL.bind(owner.URL);saved.push([owner,owner.URL.revokeObjectURL]);owner.URL.revokeObjectURL=url=>{revoked.push([name,url]);original(url)}}
  const render=target=>U.createElement('span',{style:{display:'inline-flex',width:24,height:24}},U.createElement(U.NodeVisualImage,{src:'https://i.ytimg.com/vi/z8UkHGpykYU/maxresdefault.jpg',path:'https://i.ytimg.com/vi/z8UkHGpykYU/maxresdefault.jpg',youtubeId:'z8UkHGpykYU',allowRemote:true,loader,alt:'',key:target}));
  try{
   U.flushSync(()=>{root.render(render('main'));other.render(render('other'))});await pause(350);
   const images=[host.querySelector('img'),frame.contentDocument.querySelector('img')];ok(images.every(image=>image?.src.startsWith('blob:')&&image.naturalWidth===2),'Actual native bytes decode in both documents');equal(calls.length,1,'Two documents share one video fetch');
   U.flushSync(()=>root.unmount());await pause(50);equal(revoked.length,1,'First document releases only its Blob URL');ok(images[1].naturalWidth===2,'Other document retains its independent image');
   U.flushSync(()=>other.unmount());equal(revoked.length,2,'Last owner revokes its Blob URL');equal(revoked.map(item=>item[0]),['main','other'],'Captured owning windows dispose their resources');
  }finally{for(const [owner,original]of saved)owner.URL.revokeObjectURL=original;U.flushSync(()=>{root.unmount();other.unmount()});frame.remove();host.remove();delete window.thumbnailRequest}return true;
 })()`),true);
});

/** Released consumers cannot reclaim native transports that requestUrl is still awaiting. */
test('thumbnail transport permits bound abandoned requests while allowing existing-video coalescing',async()=>{
 let complete;const pending=new Promise(done=>{complete=done;}),calls=[],leases=[];
 const cache=new YoutubeThumbnails(async url=>{calls.push(url);await pending;return null;});
 for(let i=0;i<YOUTUBE_THUMBNAIL_LIMITS.requests;i++){
  const lease=cache.acquire(String(i).padStart(11,'0'),()=>true);leases.push(lease);
  if(i>0)lease.release();
 }
 assert.equal(cache.entries.size,1,'Only one mounted video remains, independently of native pending requests');
 assert.equal(cache.activeRequests,YOUTUBE_THUMBNAIL_LIMITS.requests);
 const shared=cache.acquire('00000000000',()=>true);assert.equal(shared.promise,leases[0].promise,'A current video can share its existing transport at capacity');
 assert.equal(await cache.acquire('99999999999',()=>true).promise,null);assert.equal(calls.length,YOUTUBE_THUMBNAIL_LIMITS.requests,'Released requests still consume the global transport budget');
 leases[0].release();shared.release();assert.equal(cache.entries.size,0);assert.equal(cache.activeRequests,YOUTUBE_THUMBNAIL_LIMITS.requests);
 complete();await Promise.all(leases.map(lease=>lease.promise));assert.equal(cache.activeRequests,0,'Only actual transport settlement returns permits');
 assert.equal(calls.length,YOUTUBE_THUMBNAIL_LIMITS.requests,'Retired transports cannot start later quality fallbacks');
 const next=cache.acquire('99999999999',()=>true);await next.promise;next.release();assert.equal(calls.length,YOUTUBE_THUMBNAIL_LIMITS.requests+4,'Freed capacity permits a new bounded attempt');
});

/** Missing payloads and thrown loader errors are current-owner failure states, never stale updates. */
test('thumbnail component removes failed placeholders and ignores retired loader rejection',async()=>{
 assert.equal(await scenario(`(async()=>{
  const U=nodeUI,host=document.body.appendChild(document.createElement('main')),root=U.createRoot(host),sheet=document.head.appendChild(document.createElement('style'));
  host.className='thumbnail-failure-test';sheet.textContent='.thumbnail-failure-test img {width:24px;height:24px}';
  const render=(id,loader)=>U.flushSync(()=>root.render(U.createElement(U.NodeVisualImage,{src:'https://i.ytimg.com/vi/'+id+'/maxresdefault.jpg',path:'https://i.ytimg.com/vi/'+id+'/maxresdefault.jpg',youtubeId:id,allowRemote:true,loader,alt:''})));
  let releases=0;
  try{
   const empty={permitted:()=>true,acquire:()=>({promise:Promise.resolve(null),release:()=>{releases++}})};
   render('aaaaaaaaaaa',empty);await pause(180);equal(host.querySelector('img'),null,'Null payload removes the empty image placeholder');equal(releases,1,'Current failure releases its subscriber');
   const thrown={permitted:()=>true,acquire:()=>{throw Error('Expected synchronous host failure')}};
   render('bbbbbbbbbbb',thrown);await pause(180);equal(host.querySelector('img'),null,'Thrown acquisition uses the ordinary fallback');
   let reject,resolve;const old={permitted:()=>true,acquire:()=>({promise:new Promise((_done,fail)=>{reject=fail}),release:()=>{releases++}})},current={permitted:()=>true,acquire:()=>({promise:new Promise(done=>{resolve=done}),release:()=>{releases++}})};
   render('ccccccccccc',old);await pause(120);ok(reject,'Actual outgoing lease admitted');render('ddddddddddd',current);await pause(120);ok(resolve,'Actual replacement lease admitted');
   reject(Error('Retired host request'));await pause(100);ok(host.querySelector('img'),'Old rejection cannot mark the replacement failed');
   resolve(null);await pause(120);equal(host.querySelector('img'),null,'Replacement publishes its own failure independently');return true;
  }finally{U.flushSync(()=>root.unmount());host.remove();sheet.remove();}
 })()`),true);
});

test('local frame caps input before seeking, scales short rotated frames and releases the native decoder on cancellation', async () => {
  /** Only the native media event and canvas encoding boundary is simulated here. */
  function media(width, height) {
    const video = new EventTarget(), operations = [], encoders = [];
    Object.assign(video, {HAVE_METADATA: 1, HAVE_CURRENT_DATA: 2, readyState: 0, seeking: false,
      videoWidth: width, videoHeight: height, duration: 0.125,
      removeAttribute: name => operations.push(['remove', name]), load: () => operations.push(['load'])});
    Object.defineProperties(video, {
      currentTime: {get: () => 0, set: value => {video.seeking = true;operations.push(['seek', value]);}},
      src: {set: value => operations.push(['source', value, video.crossOrigin, video.preload])},
    });
    const canvas = {width: 0, height: 0, getContext: () => ({drawImage: (_video, ...bounds) => operations.push(['draw', ...bounds])}),
      toBlob: (done, type) => encoders.push({done, type})};
    const owner = {hidden: false, defaultView: {location: {origin: 'app://obsidian.md'}, setTimeout, clearTimeout}};
    owner.win = {createFragment: () => ({ownerDocument: owner, createEl: name => name === 'video' ? video : canvas})};
    return {video, canvas, operations, encoders, owner};
  }
  const source = 'app://obsidian.md/vault/short.mp4', signal = new AbortController();
  const large = media(2160, 3840);
  const oversized = decodeLocalVideoFrame(large.owner, source, signal.signal);
  large.video.readyState = 1;
  large.video.dispatchEvent(new Event('loadedmetadata'));
  assert.equal((await oversized).status, 'oversized');
  assert.deepEqual(large.operations, [['source', source, 'anonymous', 'metadata'], ['remove', 'src'], ['load']]);
  const short = media(1080, 1920);
  const pending = decodeLocalVideoFrame(short.owner, source, signal.signal);
  short.video.readyState = 1;
  short.video.dispatchEvent(new Event('loadedmetadata'));
  assert.ok(Math.abs(short.operations[1][1] - 0.0125) < 1e-9);
  short.video.readyState = 2;
  short.video.dispatchEvent(new Event('canplay'));
  assert.equal(short.encoders.length, 0, 'A frame is unavailable while the seek is pending');
  short.video.seeking = false;
  short.video.dispatchEvent(new Event('seeked'));
  assert.deepEqual(short.operations.at(-1), ['draw', 0, 0, 144, LOCAL_VIDEO_FRAME_LIMITS.edge]);
  assert.equal(short.encoders[0].type, 'image/webp');
  signal.abort();
  short.encoders[0].done(new Blob(['late'], {type: 'image/webp'}));
  assert.equal((await pending).status, 'cancelled');
  assert.equal(short.canvas.width, 0);
  assert.deepEqual(short.operations.slice(-2), [['remove', 'src'], ['load']]);
  const remote = media(60, 80);
  assert.equal((await decodeLocalVideoFrame(remote.owner, 'https://example.invalid/clip.mp4', new AbortController().signal)).status, 'unavailable');
  assert.deepEqual(remote.operations, [], 'Remote URLs cannot reach the media boundary');
});

test('local video service bounds native work and retained bytes and rejects late results from replaced files', async () => {
  const inventory = new Map(), calls = [], nativeReads = [], liveUrls = new Map();
  let enabled = false, now = 0, nextUrl = 0;
  const owner = {hidden: false, defaultView: {closed: false, URL: {
    createObjectURL: blob => {const url = 'blob:video-' + nextUrl++;liveUrls.set(url, blob);return url;},
    revokeObjectURL: url => {assert.ok(liveUrls.delete(url), 'Each owning URL is revoked once');},
  }}};
  const vault = {getFileByPath: path => inventory.get(path),
    getResourcePath: file => {nativeReads.push(file.path);return file.path;}};
  const frame = new Blob([new Uint8Array(LOCAL_VIDEO_FRAME_LIMITS.bytes)], {type: 'image/webp'});
  const service = new LocalVideoThumbnails(vault, () => enabled,
    (_document, path, signal) => new Promise(done => calls.push({path, signal, done})), () => now);
  /** The fixture creates only explicit native handles and never reads real vault media. */
  function file(index) {
    const identity = {path: 'Video-' + index + '.mp4', extension: 'mp4', stat: {mtime: 1, size: 100}};
    inventory.set(identity.path, identity);
    return identity;
  }
  /** Each candidate comes from a mounted, visible consumer unless this test releases it. */
  const acquire = candidate => service.acquire(candidate, candidate.path, owner, () => true, () => {});
  const original = file(0);
  assert.equal(await acquire(original).promise, null);
  assert.deepEqual(nativeReads, []);
  enabled = true;
  service.syncPreference();
  const first = acquire(original), duplicate = acquire(original);
  const waiting = Array.from({length: 30}, (_, index) => acquire(file(index + 1)));
  assert.equal(service.stats().active, 1);
  assert.equal(service.stats().queued, LOCAL_VIDEO_THUMBNAIL_LIMITS.queue - 1);
  assert.equal(nativeReads.length, 1);
  for (const lease of waiting) lease.release();
  const replacement = file(0), next = acquire(replacement);
  calls[0].done({status: 'ready', blob: frame});
  assert.equal(await first.promise, null);
  assert.equal(await duplicate.promise, null);
  assert.equal(service.stats().liveUrls, 0);
  assert.equal(calls.length, 2);
  calls[1].done({status: 'ready', blob: frame});
  const firstUrl = await next.promise, cached = acquire(replacement), secondUrl = await cached.promise;
  assert.notEqual(firstUrl, secondUrl);
  assert.equal(liveUrls.get(firstUrl), liveUrls.get(secondUrl));
  assert.equal(service.stats().retainedBytes, frame.size, 'All visible occurrences share one encoded Blob');
  next.release();
  assert.equal(service.stats().liveUrls, 1);
  const failed = file('failed'), miss = acquire(failed);
  calls.at(-1).done({status: 'unavailable'});
  assert.equal(await miss.promise, null);
  assert.equal(await acquire(failed).promise, null);
  assert.equal(calls.length, 3, 'Failed decoding has a bounded negative retry');
  now += LOCAL_VIDEO_THUMBNAIL_LIMITS.retryMs;
  const retry = acquire(failed);
  for (let i = 0; i < LOCAL_VIDEO_THUMBNAIL_LIMITS.entries + 3; i++) {
    const lease = i === 0 ? retry : acquire(file(i + 100));
    calls.at(-1).done({status: 'ready', blob: frame});
    assert.ok(await lease.promise);
    lease.release();
  }
  assert.equal(service.stats().cached, LOCAL_VIDEO_THUMBNAIL_LIMITS.entries);
  assert.equal(service.stats().retainedBytes, LOCAL_VIDEO_THUMBNAIL_LIMITS.bytes);
  assert.ok(liveUrls.has(secondUrl), 'An image still held by a document cannot be evicted');
  enabled = false;
  service.syncPreference();
  assert.equal(service.stats().retainedBytes, 0);
  assert.equal(liveUrls.size, 0);
  service.dispose();
});

test('a real local node image starts only while visible and releases cancelled, replaced and rejected URLs', async () => {
  assert.equal(await scenario(`(async()=>{
    const U=nodeUI, native=[], marker=document.createElement('style');
    marker.textContent='.local-video-test{overflow:auto;width:120px;height:60px}.local-video-test img,.local-video-test .kplex-local-video-slot{display:block;width:24px;height:24px}.local-video-test .spacer{height:240px}';
    document.head.append(marker);
    const host=document.body.appendChild(document.createElement('main'));host.className='local-video-test';
    const root=U.createRoot(host), file={path:'Media.mp4',extension:'mp4',stat:{size:10,mtime:1}};
    const png=new Blob([Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAEElEQVR4nGNwONAARAwQCgApDgYBWgscUQAAAABJRU5ErkJggg=='),character=>character.charCodeAt(0))],{type:'image/png'});
    let enabled=false;
    const service=new U.LocalVideoThumbnails({getFileByPath:()=>file,getResourcePath:()=>file.path},()=>enabled,
      (owner,path,signal)=>new Promise(done=>native.push({owner,path,signal,done})));
    /** Let real intersection, layout and image decode settle without guessing a browser frame rate. */
    const wait = async (condition,message)=>{for(let attempt=0;attempt<80;attempt++){if(condition())return;await pause(20);}throw Error(message);};
    const image=()=>host.querySelector('img');
    const render=()=>U.flushSync(()=>root.render(U.createElement('div',null,U.createElement('div',{className:'spacer'}),
      U.createElement(U.NodeVisualImage,{src:'',path:file.path,localFile:file,localLoader:service,allowRemote:false,alt:''}))));
    try{
      render();equal(image(),null,'Opt-out renders no image');equal(native.length,0,'Opt-out starts no local resource work');
      enabled=true;service.syncPreference();render();await pause(150);
      const slot=host.querySelector('.kplex-local-video-slot');ok(slot,'The attachment retains an observable slot');
      equal(image(),null,'An undecoded preview leaves no missing bitmap for canvas image export');equal(native.length,0,'Nested clipping prevents native work');
      host.scrollTop=220;await wait(()=>native.length===1,'Visible image should admit native work');
      equal(image(),null,'Starting the decoder only shows the attachment icon');
      equal(native[0].owner===document,true,'The decoder uses the actual image owner');
      host.scrollTop=0;await wait(()=>native[0].signal.aborted,'Scroll-out should cancel an active native job');
      native[0].done({status:'ready',blob:png});await wait(()=>service.stats().active===0,'Retired native job should settle');
      equal(service.stats().cached,0,'Late result must not be retained');equal(image(),null,'Late result must not reach the DOM');
      host.scrollTop=220;await wait(()=>native.length===2,'A new intersection should retry');
      native[1].done({status:'ready',blob:png});await wait(()=>image()?.naturalWidth===2,'Valid frame should appear');
      equal(service.stats().liveUrls,1,'A visible frame owns one URL');
      host.scrollTop=0;await wait(()=>service.stats().liveUrls===0&&!image(),'Scrolling revokes the live URL');
      host.scrollTop=220;await wait(()=>image()?.naturalWidth===2,'Returning to the node should use the cached frame');
      equal(native.length,2,'Warm frame does not seek a second time');equal(service.stats().cacheHits,1,'Visible revisit shares one session frame');
      const stale=image().getAttribute('src');service.invalidate(file);
      await wait(()=>native.length===3&&!image(),'Same-stat rework should revoke the previous source');
      native[2].done({status:'ready',blob:new Blob(['invalid'],{type:'image/png'})});
      await wait(()=>service.stats().cached===1&&service.stats().liveUrls===0&&!image(),'Rejected DOM image should release its URL without losing the fallback slot');
      ok(host.querySelector('.kplex-local-video-slot')===slot,'The same visibility slot survives frame publication and removal');
      equal(native.length,3,'A rejected image does not trigger a same-visibility loop');
      equal((await fetch(stale).catch(()=>null)),null,'The prior owning URL was revoked');
      enabled=false;service.syncPreference();render();equal(image(),null,'Disabling restores the attachment fallback');
      equal(service.stats().retainedBytes,0,'Disabling discards retained frames');
      return true;
    }finally{U.flushSync(()=>root.unmount());service.dispose();host.remove();marker.remove();}
  })()`),true);
});
