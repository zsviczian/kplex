/** Exact-build saved-node styling and trusted mouse History scrolling in disposable Small.
 * Reuses the controlled transport and existing cached notes; restores settings, layout and native
 * window independently of assertions. Does not create or edit vault content. Run serially. */
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {runControlledProbe} from './controlledProbe.mjs';

/** Exercise actual App chips and style publication through the existing native writer. */
async function scenario(app,c){
 const p=app.plugins.plugins['k-plex'],workspace=app.workspace,remote=require('@electron/remote'),native=remote.getCurrentWindow();
 if(!p||app.setting.isOpen||app.vault.getFiles().length>=1000)throw Error('Clean disposable Small required');
 const original=structuredClone(p.settings),policy=p.savedSettingsPolicy,layout=workspace.getLayout(),bounds=native.getBounds(),maximized=native.isMaximized(),cases=[];
 let host;
 /** Retire waits with this controller; never let a failed UI action hang cleanup. */
 const until=async(read,message)=>{const end=Date.now()+20000;while(!read()){if(c.closed||Date.now()>end)throw Error(message);await new Promise(resolve=>window.setTimeout(resolve,40));}};
 /** Report only aggregate assertion results and fixture-safe view state. */
 const check=(value,message)=>{if(!value)throw Error(message)};
 try{
  await until(()=>p.layoutReady&&!p.isStartupInitializing()&&!p.index.hasActiveSemanticPreparation(),'Native startup did not settle');
  native.restore();native.setBounds({x:20,y:20,width:1200,height:850});native.show();native.focus();native.webContents.focus();
  workspace.leftSplit.collapse();workspace.rightSplit.collapse();
  const pages=app.vault.getMarkdownFiles().map(file=>p.index.get(file.path)).filter(Boolean),typed=pages.find(page=>page.noteType);
  check(typed&&pages.length>=16,'Existing cached typed notes required');
  const chosen=[typed,...pages.filter(page=>page!==typed)].slice(0,16);
  p.settings.navigationHistory=chosen.map(page=>page.path);p.settings.pinnedNodes=chosen.slice(0,2).map(page=>page.path);
  await p.saveSettings(false,false);
  const style={backgroundColor:'#123456',textColor:'#ffffff',borderColor:'#fedcba',strokeWidth:2,strokeStyle:'dashed',icon:'star',prefix:'N '};
  await p.updateStyleSettings(draft=>{draft.tagNodeStyles["#"+typed.noteType.replace(/^#/,"")]=style;});
  const anchors=[];workspace.iterateRootLeaves(leaf=>{if(leaf.view.containerEl.ownerDocument===document&&leaf.view.containerEl.getBoundingClientRect().width>0)anchors.push(leaf)});
  check(anchors[0],'Main-window tab anchor absent');await workspace.revealLeaf(anchors[0]);workspace.setActiveLeaf(anchors[0],{focus:true});
  host=workspace.getLeaf('tab');await host.setViewState({type:'k-plex-react-view',active:true});await host.view.waitUntilReady();
  await workspace.revealLeaf(host);workspace.setActiveLeaf(host,{focus:true});await p.setDocumentSyncMode(host,'off');p.notifyNavigation(typed.path,host);
  const root=()=>host.view.containerEl.querySelector('.kplex-app'),doc=host.view.containerEl.ownerDocument;
  await until(()=>root()?.querySelectorAll('[data-kplex-history-path]').length===14&&root()?.querySelectorAll('[data-kplex-pinned-path]').length===2,'Actual saved rows absent');
  const pin=()=>[...root().querySelectorAll('[data-kplex-pinned-path]')].find(el=>el.dataset.kplexPinnedPath===typed.path);
  const history=()=>[...root().querySelectorAll('[data-kplex-history-path]')].find(el=>el.dataset.kplexHistoryPath===typed.path);
  await until(()=>pin()?.textContent.startsWith('N ')&&history()?.textContent.startsWith('N '),'Live type prefix absent');
  await until(()=>host.view.documentSession.centerPath===typed.path,'Requested native center did not settle');
  check(getComputedStyle(pin().parentElement).backgroundColor==='rgb(18, 52, 86)'&&getComputedStyle(history()).backgroundColor==='rgb(18, 52, 86)','Native saved-node fill mismatch');
  check(getComputedStyle(pin()).color==='rgb(255, 255, 255)'&&getComputedStyle(history()).borderStyle==='dashed'&&pin().querySelector('svg'),'Native border/text/icon absent');
  cases.push({id:'native-history-pins-share-type-paint-prefix-icon'});
  const center=host.view.documentSession.centerPath,list=root().querySelector('.kplex-history-list');list.scrollLeft=0;
  await new Promise(resolve=>window.setTimeout(resolve,180));
  const button=list.querySelector('button'),r=button.getBoundingClientRect(),x=r.x+70,y=r.y+r.height/2;
  c.progress={cases,input:{x,y,scrollLeft:list.scrollLeft,scrollWidth:list.scrollWidth,clientWidth:list.clientWidth,sameDocument:doc===document,innerHeight:doc.defaultView.innerHeight,hit:doc.elementFromPoint(x,y)?.closest('button')===button}};
  check(doc.elementFromPoint(x,y)?.closest('button')===button,'History input must hit the exact visible button');
  native.webContents.sendInputEvent({type:'mouseMove',x:Math.round(x),y:Math.round(y)});
  native.webContents.sendInputEvent({type:'mouseDown',x:Math.round(x),y:Math.round(y),button:'left',clickCount:1});
  await new Promise(resolve=>window.setTimeout(resolve,40));
  native.webContents.sendInputEvent({type:'mouseMove',x:Math.round(x-60),y:Math.round(y),button:'left',modifiers:['leftButtonDown']});
  await new Promise(resolve=>window.setTimeout(resolve,40));
  native.webContents.sendInputEvent({type:'mouseUp',x:Math.round(x-60),y:Math.round(y),button:'left',clickCount:1});
  await until(()=>list.scrollLeft>=50,'Trusted mouse History drag did not scroll');
  await until(()=>!list.classList.contains('is-mouse-scrolling'),'Native pointer release did not retire capture');
  await new Promise(resolve=>window.setTimeout(resolve,80));
  check(host.view.documentSession.centerPath===center&&!list.classList.contains('is-mouse-scrolling'),'History drag navigated or retained capture');
  cases.push({id:'native-mouse-history-scroll-without-navigation',scrollLeft:list.scrollLeft});
  await p.updateStyleSettings(draft=>{draft.tagNodeStyles["#"+typed.noteType.replace(/^#/,"")]={...style,backgroundColor:'#654321'};});
  await until(()=>getComputedStyle(pin().parentElement).backgroundColor==='rgb(101, 67, 33)'&&getComputedStyle(history()).backgroundColor==='rgb(101, 67, 33)','Saved rows did not follow paint publication');
  check(host.view.documentSession.centerPath===center,'Paint publication navigated');
  cases.push({id:'native-saved-rows-live-paint-publication-without-navigation'});
  list.scrollLeft=0;const area=root().getBoundingClientRect();
  require('node:fs').writeFileSync(c.screenshot,(await native.webContents.capturePage({x:Math.ceil(area.x),y:Math.ceil(area.y),width:Math.floor(area.width),height:Math.floor(area.height)})).toPNG());
  return {cases,notesEdited:false,host:{electron:process.versions.electron,chrome:process.versions.chrome}};
 }finally{
  if(host&&workspace.getLeafById(host.id)===host)host.detach();
  p.settings=original;await p.saveSettings(false,false);p.savedSettingsPolicy=policy;
  await workspace.changeLayout(layout);native.setBounds(bounds);if(maximized)native.maximize();
  await p.settingsWriteQueue;await new Promise(resolve=>window.setTimeout(resolve,500));
  await app.vault.adapter.write(p.manifest.dir+'/data.json',c.originalData);
 }
}
if(process.env.KPLEX_TEST_VAULT_NAME!=='kplex-test-small')throw Error('Explicit disposable Small required');
const definitions='c.originalData='+JSON.stringify(readFileSync(join(process.env.KPLEX_TEST_CONFIG_DIR,'plugins/k-plex/data.json'),'utf8'))+';c.screenshot='+JSON.stringify(join(process.env.KPLEX_HOST_REPORT_DIR,'saved-node-lists.png'))+';';
await runControlledProbe('saved-node-lists',scenario,definitions,['src/ui/App.tsx','src/ui/nodeListPresentation.ts','src/ui/components/HorizontalDragScroll.tsx','styles.css']);
