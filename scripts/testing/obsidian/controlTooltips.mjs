/**
 * Exact-build native tooltip acceptance in the explicitly named disposable small vault. Trusted
 * pointer moves exercise real host CSS, every-hover delay, measured flipping, sliders, portalled
 * controls, compact native node titles without duplicate host hints, the extended canvas menu/native
 * background draft and two-way popout ownership.
 * KPLEX_TOOLTIP_NODE_ONLY=true limits acceptance to canvas/node/gate hints and window migration;
 * that scope does not claim the separate control/menu/color cases. The temporary probe owns no files; finally restores the
 * saved workspace/display modes and removes observation/global state even after assertion failure.
 */
import assert from 'node:assert/strict';
import {spawnNativeSync as spawnSync,obsidianCliExecutable} from './processTools.mjs';
import {createHash} from 'node:crypto';
import {existsSync,mkdirSync,readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateTarget} from './runner.mjs';
const root=resolve(fileURLToPath(new URL('../../..',import.meta.url)));
const vaultName=process.env.KPLEX_TEST_VAULT_NAME;
assert.equal(vaultName,'kplex-test-small','Select the disposable small vault explicitly');
const target=validateTarget({vaultName,vaultPath:process.env.KPLEX_TEST_VAULT_PATH,configDir:process.env.KPLEX_TEST_CONFIG_DIR});
const output=process.env.KPLEX_HOST_REPORT_DIR;
assert(output&&(!existsSync(output)||!readdirSync(output).length),'Choose a fresh report directory');mkdirSync(output,{recursive:true});
const nodeOnly=process.env.KPLEX_TOOLTIP_NODE_ONLY==='true';
const configuration=['plugins/k-plex/data.json','workspace.json'].filter(name=>existsSync(join(target.config,name))).map((name,index)=>({name,index,bytes:readFileSync(join(target.config,name))}));
const privateDir=join(output,'private');mkdirSync(privateDir);for(const item of configuration)writeFileSync(join(privateDir,'configuration-'+item.index+'.bin'),item.bytes);
const report={scope:nodeOnly?'node-hints-main-popout-return':'complete-control-hints',status:'running',startedAt:new Date().toISOString(),node:process.version,artifacts:{},scenarios:[],limitations:['Native rectangles and trusted pointer input establish functional behavior, not physical-device or subjective paint acceptance.']};
writeFileSync(join(output,'driver-source.mjs'),readFileSync(fileURLToPath(import.meta.url)));
/** Reject explicit CLI errors as well as process/transport failures. */
function cli(name,...args){const r=spawnSync(obsidianCliExecutable(),[`vault=${vaultName}`,name,...args],{cwd:root,encoding:'utf8',timeout:30000,killSignal:'SIGKILL',maxBuffer:4*1024*1024});if(r.error||r.status!==0||/^Error:/m.test(r.stdout))throw r.error??Error(r.stderr||r.stdout);return r.stdout.trim()}
/** Return detached observations, never retained native renderer references. */
function evaluate(code){return JSON.parse(cli('eval',`code=${code}`).replace(/^=>\s*/,''))}
/** Poll transport without blocking native rendering or altering throttling. */
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
/** Install one cancellable native owner with no product debug entry point. */
function probe(nodeOnly=false){
 const p=app.plugins.plugins['k-plex'],remote=require('@electron/remote'),win=remote.getCurrentWindow();
 if(!p?.actionManager||window.__kplexTooltipProbe||app.setting.isOpen||document.querySelector('.modal-container,.menu,.kplex-wander-controls'))throw Error('Clean native prerequisites required');
 const c=window.__kplexTooltipProbe={layout:app.workspace.getLayout(),originalColor:p.settings.backgroundColor,settings:structuredClone(p.settings),policy:p.savedSettingsPolicy,cases:[],cancelled:false,done:false};
 let leaf,root,surface,popDoc;
 /** Reject late callbacks after external failure cleanup retires this probe. */
 const check=(value,label)=>{if(c.cancelled)throw Error('Retired tooltip probe');if(!value)throw Error(label)};
 /** Yield actual native tasks with a cancellation fence on both sides. */
 const wait=async ms=>{check(true,'active');await new Promise(resolve=>(c.timerWindow??window).setTimeout(resolve,ms));check(true,'active')};
 /** Wait for actual node/generation readiness, preserving strict short deadlines. */
 const until=async(predicate,label,ms=10000)=>{const end=Date.now()+ms;while(!predicate()){check(Date.now()<end,label);await wait(20)}};
 /** Record only complete assertions. */
 const passed=(id,data={})=>c.cases.push({id,status:'passed',...data});
 /** Reacquire the live main-window surface after replacement. */
 const acquire=()=>{leaf=app.workspace.getLeavesOfType('k-plex-react-view').find(l=>l.view.contentEl.ownerDocument===document&&p.isKplexLeafVisible(l));root=leaf?.view.contentEl.querySelector('.kplex-app');surface=[...p.actionSurfaceHosts].find(([,entry])=>entry.leaf===leaf)?.[0];return Boolean(root&&surface)};
 /** Dispatch ordinary catalog actions through the exact owning native surface. */
 const action=async id=>{const result=await p.actionManager.dispatch({id,source:'toolbar',surfaceId:surface});check(result.status==='completed',`${id}: ${result.status}`)};
 /** Deliver actual Electron mouse motion in the control's rendering window. */
 const move=element=>{const doc=element.ownerDocument,r=element.getBoundingClientRect(),x=Math.round(r.left+r.width/2),y=Math.round(r.top+r.height/2);check(element.contains(doc.elementFromPoint(x,y)),'Control obscured '+JSON.stringify({rect:r.toJSON(),hit:doc.elementFromPoint(x,y)?.outerHTML.slice(0,400),element:element.outerHTML.slice(0,400)}));const owner=doc.defaultView.require("@electron/remote").getCurrentWindow();check(owner?.webContents?.sendInputEvent,"Owning native input realm unavailable");owner.focus();owner.webContents.focus();owner.webContents.sendInputEvent({type:'mouseMove',x,y});return{owner,r}};
 /** Press the actual hit-tested button without using a React implementation shortcut. */
 const click=async element=>{const{owner,r}=move(element),x=Math.round(r.left+r.width/2),y=Math.round(r.top+r.height/2);owner.webContents.sendInputEvent({type:'mouseDown',x,y,button:'left',clickCount:1});owner.webContents.sendInputEvent({type:'mouseUp',x,y,button:'left',clickCount:1});await wait(100)};
 /** Assert every hover delay, themed placement, pointer transparency and absence of duplicate hints. */
 const hover=async(element,id,expectedSide)=>{
  check(element?.getClientRects().length,'Visible hint control required');const doc=element.ownerDocument;
  c.timerWindow=doc.defaultView;const inputOwner=doc.defaultView.require('@electron/remote').getCurrentWindow();inputOwner.focus();inputOwner.webContents.focus();await until(()=>doc.hasFocus(),'Hint input window not focused');inputOwner.webContents.sendInputEvent({type:'mouseMove',x:0,y:0});await wait(100);
  let appeared=0;const observer=new doc.defaultView.MutationObserver(()=>{if(!appeared&&doc.querySelector('.kplex-control-tooltip:not(.is-measuring)'))appeared=performance.now()});c.observer=observer;observer.observe(doc.body,{childList:true,subtree:true});
  c.timerWindow=doc.defaultView;const start=performance.now(),{r}=move(element);await wait(300);check(!doc.querySelector('.kplex-control-tooltip'),'Hint flashed before delay');await until(()=>doc.querySelector('.kplex-control-tooltip:not(.is-measuring)'),`Hint ${id} absent`);
  observer.disconnect();c.observer=null;const hint=doc.querySelector('.kplex-control-tooltip'),h=hint.getBoundingClientRect(),style=doc.defaultView.getComputedStyle(hint),side=hint.classList.contains('mod-top')?'above':'below';
  check(appeared-start>=600,'Warm/native shortcut bypassed delay');check(h.bottom<=r.top-7||h.top>=r.bottom+7,'Hint overlaps control');check(h.left>=7&&h.right<=doc.defaultView.innerWidth-7&&h.top>=7&&h.bottom<=doc.defaultView.innerHeight-7,'Hint outside viewport');check(style.pointerEvents==='none','Hint intercepts control');check(doc.querySelectorAll('.tooltip').length===1,'Duplicate native/browser hint');check(!element.hasAttribute('title'),'Competing title hint');if(expectedSide)check(side===expectedSide,'Incorrect placement side');
  passed(id,{elapsedMs:Math.round(appeared-start),side,text:hint.firstChild.textContent,control:{top:r.top,bottom:r.bottom},hint:{top:h.top,bottom:h.bottom,height:h.height},background:style.backgroundColor});
 };
 /** Keep the browser-owned compact title, accessible full name and independent host gate hints. */
 const nodeHints=async(scope,id)=>{
  const doc=scope.ownerDocument;c.timerWindow=doc.defaultView;
  const label=[...scope.querySelectorAll('.kplex-thought-text')].find(el=>{const r=el.getBoundingClientRect();return el.contains(doc.elementFromPoint(Math.round(r.left+r.width/2),Math.round(r.top+r.height/2)))});
  check(label,'Hit-testable node label required');const node=label.closest('.kplex-thought'),name=doc.getElementById(node.getAttribute('aria-labelledby'));
  check(!node.hasAttribute('aria-label')&&name?.textContent?.trim(),'Node accessible name lost or duplicate host tooltip retained');check(Boolean(label.getAttribute('title')),'Compact browser title lost');
  const inputOwner=doc.defaultView.require('@electron/remote').getCurrentWindow();inputOwner.focus();inputOwner.webContents.focus();await until(()=>doc.hasFocus(),'Node input window not focused');inputOwner.webContents.sendInputEvent({type:'mouseMove',x:0,y:0});await wait(150);move(label);await wait(2200);
  check(!doc.querySelector('.tooltip'),'Node still shows a competing styled hint');
  const gate=[...node.querySelectorAll('[data-kplex-gate]')].find(el=>{const r=el.getBoundingClientRect();return el.contains(doc.elementFromPoint(Math.round(r.left+r.width/2),Math.round(r.top+r.height/2)))});check(gate,'Hit-testable gate required');move(gate);
  const requiresAlt=p.settings.gateTooltipRequiresAlt!==false;
  if(requiresAlt){await wait(800);check(!doc.querySelector('.tooltip'),'Unmodified gate still shows a hint');inputOwner.webContents.sendInputEvent({type:'keyDown',keyCode:'Alt',modifiers:['alt']})}
  await until(()=>doc.querySelector('.kplex-control-tooltip'),'Shared gate hint lost');
  check(doc.querySelectorAll('.tooltip').length===1&&doc.querySelector('.tooltip').textContent===gate.getAttribute('aria-label'),'Gate hint changed or duplicated');
  if(requiresAlt){inputOwner.webContents.sendInputEvent({type:'keyUp',keyCode:'Alt'});await until(()=>!doc.querySelector('.tooltip'),'Released gate modifier retained hint')}
  passed(id,{requiresAlt,stationaryModifier:requiresAlt,accessibleName:true,compactTitle:true,nodeStyledHints:0,gateStyledHints:1,observationMs:2200,browserTooltipPaint:'Browser chrome is outside the DOM; title retained, visual/device acceptance separate'});
  inputOwner.webContents.sendInputEvent({type:'mouseMove',x:0,y:0});await wait(150);
 };
 /** Restore the owning layout and modes, retiring timers through normal stop/unmount. */
 c.cleanup=()=>{if(c.cleanupTask)return c.cleanupTask;c.cleanupTask=(async()=>{
  c.cancelled=true;c.observer?.disconnect();p.dismissKplexMenu();
  if(c.menuOriginal)p.showKplexMenuAtMouseEvent=c.menuOriginal;if(c.reportOriginal)p.reportBug=c.reportOriginal;
  if(c.ownedSettings)app.setting.close();const ownedModal=document.querySelector('.kplex-color-modal');if(ownedModal){const cancel=[...ownedModal.querySelectorAll('button')].find(el=>el.textContent===p.translator('common.cancel'));cancel?.click();}
  p.settings=c.settings;p.savedSettingsPolicy=c.policy;await p.saveSettings(false,false);
  for(const[id]of p.actionSurfaceHosts)await p.actionManager.dispatch({id:'view.wander.stop',source:'internal',surfaceId:id});
  if(leaf?.view.displayModes&&c.originalModes){const m=leaf.view.displayModes;m.setZen(c.originalModes.zen)}
  await app.workspace.changeLayout(c.layout);
  const original=app.workspace.getLeavesOfType('k-plex-react-view').find(item=>item.id===c.originalLeafId)?.view.displayModes;
  if(original&&c.originalModes){if(original.getSnapshot().fullscreen!==c.originalModes.fullscreen)original.toggleFullscreen();original.setZen(c.originalModes.zen)}
  win.focus();win.webContents.sendInputEvent({type:'mouseMove',x:0,y:0});c.cleaned=true;
 })();return c.cleanupTask;};
 /** Actual declarative Settings controls persist the opt-out and return to the captured default. */
 const setGateHints=async enabled=>{
  c.ownedSettings=true;p.openSettings();await until(()=>p.settingsTab?.containerEl.isConnected,'Settings absent');
  check(p.settingsTab.openSettingsPage(p.translator('settings.ui.plex.behavior')),'Behavior page absent');
  await wait(300);
  const findRow=()=>[...p.settingsTab.containerEl.ownerDocument.querySelectorAll('.setting-item-name')].find(el=>el.getClientRects().length&&el.textContent===p.translator('settings.gateTooltip.name'))?.closest('.setting-item');
  await until(()=>findRow()?.querySelector('.checkbox-container'),'Gate tooltip preference absent');const row=findRow();row.scrollIntoView({block:'center'});await wait(150);
  if(p.settings.gateTooltipRequiresAlt!==enabled)await click(row.querySelector('.checkbox-container'));
  await until(()=>p.settings.gateTooltipRequiresAlt===enabled,'Gate preference did not update');await p.settingsWriteQueue;check((await p.loadData()).gateTooltipRequiresAlt===enabled,'Gate preference not durable');
  app.setting.close();c.ownedSettings=false;await until(()=>!app.setting.isOpen&&acquire(),'Plex did not return after Settings');passed(enabled?'gate-setting-enabled':'gate-setting-opt-out',{durable:true});
 };
 win.restore();win.show();win.focus();win.webContents.focus();
 c.task=new Promise(resolve=>window.setTimeout(resolve,0)).then(async()=>{
  remote.app.focus({steal:true});win.show();win.focus();win.webContents.focus();await until(()=>document.hasFocus()&&!document.hidden,'Native foreground unavailable',5000);if(!acquire())await p.activateView();await until(acquire,'Rendered Plex required');c.originalLeafId=leaf.id;c.originalModes=leaf.view.displayModes.getSnapshot();if(c.originalModes.fullscreen)leaf.view.displayModes.toggleFullscreen();leaf.view.displayModes.setZen(false);await wait(150);
  check(!root.hasAttribute('aria-label')&&document.getElementById(root.getAttribute('aria-labelledby'))?.textContent===p.translator('view.displayName'),'Canvas accessible naming lost or native tooltip source retained');const canvas=root.querySelector('.kplex-plex'),b=canvas.getBoundingClientRect();win.webContents.sendInputEvent({type:'mouseMove',x:Math.round(b.left+15),y:Math.round(b.top+35)});await wait(1200);check(!document.querySelector('.tooltip'),'Canvas background has a tooltip');passed('canvas-no-tooltip',{name:p.translator('view.displayName')});
  await setGateHints(false);await nodeHints(root,'main-gate-opt-out');await setGateHints(true);
  await nodeHints(root,'main-node-single-hint');
  if(!nodeOnly){
  await hover(root.querySelector('.kplex-top-actions button[aria-label]:not(:disabled)'),'top-toolbar','below');
  await hover(root.querySelector('.kplex-zoom-controls button'),'zoom-bottom','above');
  await action('view.wander.start');await until(()=>root.querySelector('.kplex-wander-controls'),'Wander controls missing');await click(root.querySelector('.kplex-wander-controls button:nth-child(2)'));
  await hover(root.querySelector('.kplex-wander-controls button'),'wander-stop','above');await hover(root.querySelector('.kplex-wander-controls button:nth-child(2)'),'wander-warm-play','above');await hover(root.querySelector('.kplex-wander-controls input'),'wander-range','above');await action('view.wander.stop');
  await click(root.querySelector('.kplex-layout-toggle'));await hover(root.querySelector('.kplex-layout-panel input[type=range]'),'layout-range-help');await click(root.querySelector('.kplex-layout-toggle'));
  await click(root.querySelector('.kplex-filter-trigger'));await until(()=>document.querySelector('.kplex-filter-panel'),'Portalled filter absent');await hover(document.querySelector('.kplex-filter-panel button[aria-label]:not(:disabled)'),'portalled-filter');await click(root.querySelector('.kplex-filter-trigger'));
  c.menuOriginal=p.showKplexMenuAtMouseEvent;p.showKplexMenuAtMouseEvent=function(menu,event,owner){menu.setUseNativeMenu(false);return c.menuOriginal.call(this,menu,event,owner)};
  /** Open the real native menu through the production canvas callback; only its backend is selected. */
  const openMenu=async()=>{const canvas=root.querySelector('.kplex-plex'),r=canvas.getBoundingClientRect();canvas.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true,clientX:r.left+15,clientY:r.top+35,button:2}));await until(()=>document.querySelector('.menu'),'Canvas native DOM menu absent')};
  /** Select an actual native menu item by its localized title and deliver trusted pointer activation. */
  const select=async key=>{const title=p.translator(key),item=[...document.querySelectorAll('.menu-item')].find(el=>el.querySelector('.menu-item-title')?.textContent===title);check(item,`Menu item ${key} absent`);await click(item)};
  await openMenu();const titles=[...document.querySelectorAll('.menu-item-title')].map(el=>el.textContent);check(JSON.stringify(titles)===JSON.stringify(['actions.view.wander.start','actions.canvasSettings','actions.canvasZen','actions.canvasFullscreen','actions.canvasBackground','support.reportTitle'].map(key=>p.translator(key))),'Canvas item order/coverage differs');p.dismissKplexMenu();passed('canvas-menu-items',{titles});
  await openMenu();await select('actions.canvasZen');await until(()=>leaf.view.displayModes.getSnapshot().zen,'Menu Zen toggle absent');await openMenu();await select('actions.canvasZen');await until(()=>!leaf.view.displayModes.getSnapshot().zen,'Menu Zen restore absent');passed('canvas-menu-zen');
  await openMenu();await select('actions.canvasFullscreen');await until(()=>leaf.view.displayModes.getSnapshot().fullscreen,'Menu fullscreen toggle absent');await openMenu();await select('actions.canvasFullscreen');await until(()=>!leaf.view.displayModes.getSnapshot().fullscreen,'Menu fullscreen restore absent');passed('canvas-menu-fullscreen');
  /** Reuse the real native color component with a test-owned draft; Save goes through production persistence. */
  const colorDialog=async()=>{await openMenu();await select('actions.canvasBackground');await until(()=>document.querySelector('.kplex-color-modal'),'Native color modal absent');return document.querySelector('.kplex-color-modal')};
  /** Deliver native color-input events without claiming to automate the operating-system picker. */
  const setDraft=(modal,value)=>{const source=modal.querySelector('.kplex-color-source-editor select');check(source,'Shared color source control absent');if(source.value!=='fixed'){source.value='fixed';source.dispatchEvent(new Event('change',{bubbles:true}))}const input=modal.querySelector('input[type=color]');check(input,'Native color input absent');input.value=value;input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));const opacity=modal.querySelector('fieldset input[type=number]');check(opacity,'Native opacity input absent');opacity.value='100';opacity.dispatchEvent(new Event('input',{bubbles:true}))};
  /** Find native localized Save/Cancel controls in this exact owned modal. */
  const button=(modal,key)=>[...modal.querySelectorAll('button')].find(el=>el.textContent===p.translator(key));
  let modal=await colorDialog();setDraft(modal,'#abcdef');await click(button(modal,'common.cancel'));check(p.settings.backgroundColor===c.originalColor,'Cancel persisted the background draft');passed('canvas-background-cancel');
  modal=await colorDialog();const chosen=typeof c.originalColor==='string'&&c.originalColor.toLowerCase()==='#123456ff'?'#654321':'#123456';setDraft(modal,chosen);await click(button(modal,'common.save'));await until(()=>p.settings.backgroundColor===chosen+'ff'&&!document.querySelector('.kplex-color-modal'),'Color Save/persistence absent');const painted=window.getComputedStyle(root.querySelector('.kplex-plex')).backgroundColor;check(painted===`rgb(${parseInt(chosen.slice(1,3),16)}, ${parseInt(chosen.slice(3,5),16)}, ${parseInt(chosen.slice(5,7),16)})`,'Saved color did not render');passed('canvas-background-save',{color:chosen,painted});p.settings.backgroundColor=c.originalColor;await p.saveSettings(false);
  await openMenu();c.ownedSettings=true;await select('actions.canvasSettings');await until(()=>app.setting.isOpen&&p.settingsTab.containerEl.getClientRects().length,'K-Plex settings did not open');app.setting.close();await until(()=>!app.setting.isOpen,'Settings failed to close');c.ownedSettings=false;passed('canvas-menu-settings');
  c.reportOriginal=p.reportBug;p.reportBug=function(origin,surfaceId){c.reportCall={originIsCanvas:origin===root.querySelector('.kplex-plex'),surfaceId}};await openMenu();await select('support.reportTitle');check(c.reportCall?.originIsCanvas&&c.reportCall.surfaceId===surface,'Support menu did not reuse synchronous owning-view report flow');p.reportBug=c.reportOriginal;c.reportOriginal=null;passed('canvas-menu-report-route',{clipboardAndExternalEffects:'Existing report flow stubbed only at its entry point; no clipboard or external navigation in this driver'});
  p.showKplexMenuAtMouseEvent=c.menuOriginal;c.menuOriginal=null;
  }
  const mainParent=leaf.parent,mainRoot=root;app.workspace.moveLeafToPopout(leaf);await until(()=>leaf.view.contentEl.ownerDocument!==document&&leaf.view.contentEl.querySelector('.kplex-app')!==mainRoot,'Popout remount absent');popDoc=leaf.view.contentEl.ownerDocument;await until(()=>popDoc.body.style.getPropertyValue('--zoom-factor'),'Popout native chrome absent');await leaf.view.waitUntilReady();const popRoot=leaf.view.contentEl.querySelector('.kplex-app');
  await nodeHints(popRoot,'popout-node-single-hint');
  if(!nodeOnly)await hover(popRoot.querySelector('.kplex-zoom-controls button'),'popout-bottom','above');check(!document.querySelector('.kplex-control-tooltip'),'Source window retained hint');
  c.timerWindow=window;leaf.parent.removeChild(leaf);mainParent.insertChild(mainParent.children.length,leaf);await app.workspace.revealLeaf(leaf);app.workspace.setActiveLeaf(leaf,{focus:true});await until(()=>leaf.view.contentEl.ownerDocument===document&&leaf.view.contentEl.querySelector('.kplex-app')!==popRoot,'Return remount absent');await until(acquire,'Main surface absent');await leaf.view.waitUntilReady();await wait(200);await nodeHints(root,'returned-node-single-hint');if(!nodeOnly)await hover(root.querySelector('.kplex-zoom-controls button'),'returned-main-bottom','above');passed('popout-retired-owner',{sourceHints:popDoc.querySelectorAll('.kplex-control-tooltip').length});check(!popDoc.querySelector('.kplex-control-tooltip'),'Retired popout hint leaked');
 }).then(()=>{c.status='passed'},error=>{c.status='failed';c.error=String(error?.stack??error)}).finally(async()=>{try{await c.cleanup()}catch(error){c.cleanupError=String(error?.stack??error);c.status='failed'}c.done=true});return true;
}
try{
 assert.equal(cli('vault','info=path').replace(/^path /,''),target.vault);
 for(const name of ['main.js','styles.css','manifest.json']){const built=readFileSync(join(root,'dist',name)),installed=readFileSync(join(target.pluginDir,name));assert(built.equals(installed),`${name}: exact-build staging required`);report.artifacts[name]=createHash('sha256').update(installed).digest('hex')}
 cli('dev:errors','clear');evaluate(`(${probe.toString()})(${nodeOnly})`);const end=Date.now()+120000;let result;
 do{await delay(500);result=evaluate('(()=>{const c=window.__kplexTooltipProbe;return{done:c.done,status:c.status,error:c.error,cleanupError:c.cleanupError,cases:c.cases,cleaned:c.cleaned}})()');if(result.done)break;assert(Date.now()<end,'Native tooltip deadline exceeded')}while(true);
 report.scenarios=result.cases;report.cleanup=result.cleaned;report.error=result.error??result.cleanupError;assert.equal(result.status,'passed',report.error);assert.equal(result.cleaned,true);const errors=cli('dev:errors');report.errors=errors;assert(!errors||/^No errors captured\.?$/i.test(errors));report.status='passed';
}catch(error){report.error=String(error?.stack??error);report.status='failed';process.exitCode=1}
finally{try{evaluate('(async()=>{const c=window.__kplexTooltipProbe;if(c&&!c.done)await c.cleanup();delete window.__kplexTooltipProbe;return true})()');for(const item of configuration)writeFileSync(join(target.config,item.name),item.bytes);report.configurationRestored=configuration.every(item=>readFileSync(join(target.config,item.name)).equals(item.bytes))}catch(error){report.cleanupError=String(error);report.status='failed';process.exitCode=1}report.finishedAt=new Date().toISOString();writeFileSync(join(output,'control-tooltips-native.json'),JSON.stringify(report,null,2));console.log(`${report.status}: ${report.scenarios.length} native tooltip scenarios; ${join(output,'control-tooltips-native.json')}`)}
