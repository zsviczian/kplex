/**
 * Exact-build native theme matrix on actual main/popout Plexes and the native declarative Settings color editor.
 * Pinned local community CSS stays test-only and offline. The controller owns temporary colors,
 * CSS, observers, previews and one popout; bounded cleanup drains writes before restoring bytes.
 * Reports contain sampled colors/counts and host metadata, never note or configuration payloads.
 */
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {existsSync,mkdirSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnNativeSync,obsidianCliExecutable} from './processTools.mjs';
import {validateTarget} from './runner.mjs';
const root=fileURLToPath(new URL('../../..',import.meta.url)),vaultName=process.env.KPLEX_TEST_VAULT_NAME;
assert.equal(vaultName,'kplex-test-small');
const target=validateTarget({vaultName,vaultPath:process.env.KPLEX_TEST_VAULT_PATH,configDir:process.env.KPLEX_TEST_CONFIG_DIR});
const output=process.env.KPLEX_HOST_REPORT_DIR;assert(output&&!existsSync(output),'Use a fresh explicit report directory');mkdirSync(output,{recursive:true});
/** Retain bounded native IPC and detect error payloads independently of launcher exit status. */
function cli(command,...args){const r=spawnNativeSync(obsidianCliExecutable(),['vault='+vaultName,command,...args],{encoding:'utf8',timeout:30000,killSignal:'SIGKILL',maxBuffer:4*1024*1024});if(r.error||r.status!==0||/^Error:/m.test(r.stdout))throw Error(r.error?.message||r.stdout||r.stderr);return r.stdout.trim()}
/** Decode only the controller's minimized JSON response. */
function evaluate(code){const s=cli('eval','code='+code);return JSON.parse(s.slice(s.indexOf('{')))}
assert.equal(cli('vault','info=path').replace(/^path\s+/,''),target.vault);
const artifacts=Object.fromEntries(['main.js','styles.css','manifest.json'].map(name=>{const bytes=readFileSync(join(root,'dist',name));assert(bytes.equals(readFileSync(join(target.pluginDir,name))),'Stale installed '+name);return[name,createHash('sha256').update(bytes).digest('hex')]}));
const files=['appearance.json','workspace.json','plugins/k-plex/data.json'];
const backups=files.map(name=>({name,bytes:existsSync(join(target.config,name))?readFileSync(join(target.config,name)):null}));
const baselineTheme=JSON.parse(backups.find(item=>item.name==='appearance.json')?.bytes?.toString('utf8')||'{}').cssTheme||'Default';assert.equal(baselineTheme,'Default','Use the prepared Default-theme disposable fixture');
const themes=[{name:'Default',css:''}];
if(process.env.KPLEX_THEME_FIXTURES){const folder=process.env.KPLEX_THEME_FIXTURES;for(const item of JSON.parse(readFileSync(join(folder,'MANIFEST.json'),'utf8'))){const css=readFileSync(join(folder,item.name+'.css'),'utf8');assert.equal(createHash('sha256').update(css).digest('hex'),item.sha256);assert(!/url\(\s*["']?https?:|@import\b/i.test(css),'Native fixture must not load remote resources');themes.push({name:item.name,css,revision:item.revision,sha256:item.sha256})}}
const bundle=await build({absWorkingDir:root,stdin:{resolveDir:root,contents:'export * from "./src/adapters/obsidian/themePreview";export * from "./src/ui/ColorPreview";'},bundle:true,write:false,format:'iife',globalName:'previewModule',platform:'browser'});
const report={baselineTheme,artifacts,rendererSha256:createHash('sha256').update(readFileSync(join(root,'src/ui/ColorPreview.ts'))).digest('hex'),driverSha256:createHash('sha256').update(readFileSync(new URL(import.meta.url))).digest('hex'),status:'running',startedAt:new Date().toISOString(),node:process.version,sourceSha256:createHash('sha256').update(readFileSync(join(root,'src/adapters/obsidian/themePreview.ts'))).digest('hex'),themes:themes.map(({css,...rest})=>rest)};
let installed=false,safeToRestore=false;
try{
 evaluate(`(()=>{${bundle.outputFiles[0].text}
  if(window.__kplex158Preview)throw Error('Preview controller exists');
  const p=app.plugins.plugins['k-plex'];if(app.setting.isOpen)throw Error('Close Settings before theme acceptance');
  const c=window.__kplex158Preview={done:false,cancelled:false,previews:[],graphs:[],counts:{reads:0,parses:0,acquisitions:0,semantics:0,search:0,visuals:0,neighborhoods:0},counterRestores:[],settings:structuredClone(p.settings),policy:p.savedSettingsPolicy,rows:[],layout:app.workspace.getLayout(),active:app.workspace.activeLeaf,initialLight:document.body.classList.contains('theme-light'),owned:[],samplers:[],restores:[],popout:null};
  c.task=(async()=>{
   const wait=ms=>new Promise(r=>setTimeout(r,ms)),until=async(fn,label='Native theme prerequisite timeout')=>{const end=Date.now()+5000;while(true){if(c.cancelled)throw Error('Theme matrix cancelled');if(fn())return;if(Date.now()>end)throw Error(label);await wait(25)}};
   const tokens=previewModule.THEME_PREVIEW_TOKENS;
   c.popout=app.workspace.getLeaf('window');await c.popout.setViewState({type:'k-plex-react-view',active:true});await c.popout.view.waitUntilReady();
   await until(()=>c.popout.containerEl.ownerDocument!==document&&c.popout.containerEl.ownerDocument.styleSheets.length>0);
   const docs=[['main',document],['popout',c.popout.containerEl.ownerDocument]];
   for(const [label,doc]of docs){await until(()=>[...doc.querySelectorAll('.kplex-plex')].some(el=>el.clientWidth>0));const graph=[...doc.querySelectorAll('.kplex-plex')].find(el=>el.clientWidth>0);c.graphs.push(graph);c.restores.push({doc,sheets:[...doc.adoptedStyleSheets]});}
   await p.updateStyleSettings(draft=>{draft.backgroundColor={kind:'theme',variable:'--background-primary'};draft.colorPreferences.compass.enabled=true;delete draft.colorPreferences.compass.intensity;draft.colorPreferences.compass.fills.north={kind:'theme',variable:'--interactive-accent'}});
   await until(()=>p.getIndexStatus().upToDate);await wait(200);
   const baseline=c.graphs.map(graph=>({center:graph.querySelector('.kplex-role-center'),camera:graph.querySelector('.kplex-camera')}));
   p.openSettings();await until(()=>p.settingsTab.containerEl.isConnected,'Settings root missing');
   for(const key of ['settings.ui.visual.styling','colors.colorsPage']){if(!p.settingsTab.openSettingsPage(p.translator(key)))throw Error('Native Settings page missing '+key);await wait(100)}
   const settingsDoc=p.settingsTab.containerEl.ownerDocument;
   const label=[...settingsDoc.querySelectorAll('.setting-item-name')].find(el=>el.textContent===p.translator('settings.ui.plex.background')&&el.getClientRects().length);
   if(!label)throw Error('Actual Settings canvas action missing');label.closest('.setting-item').querySelector('button').click();
   await until(()=>[...p.settingsTab.colorDialogs].some(dialog=>dialog.modalEl.isConnected),'Actual Settings canvas editor missing');
   c.settingsDialog=[...p.settingsTab.colorDialogs].at(-1);c.settingsScope=c.settingsDialog.options.sourceScope;c.settingsDoc=settingsDoc;
   c.restores.push({doc:settingsDoc,sheets:[...settingsDoc.adoptedStyleSheets]});
   /** Exercise the actual installed native editor in the separate Settings window, not a detached root or direct method call. */
   const settingsLive=async sampler=>{
    const native=settingsDoc.defaultView.require('@electron/remote').getCurrentWindow();native.show();native.focus();native.webContents.focus();await until(()=>!settingsDoc.hidden&&native.isFocused(),'Settings not foreground');
    const snapshot=await sampler.sample(c.settingsScope,tokens);if(!snapshot)throw Error('Settings snapshot cancelled '+JSON.stringify({connected:c.settingsScope.isConnected,closed:c.settingsScope.ownerDocument.defaultView?.closed,tokens:tokens.length,scopeClass:c.settingsScope.className}));
    await until(()=>{const cards=c.settingsDialog.contentEl.querySelectorAll('.kplex-color-preview-canvas');return cards.length===2&&['light','dark'].every((mode,n)=>cards[n].style.getPropertyValue('--_kplex-preview-canvas')===snapshot[mode].colors['--background-primary'])},'Actual Settings dual previews mismatch');
    return{snapshot,cards:[...c.settingsDialog.contentEl.querySelectorAll('.kplex-color-preview-canvas')].map(canvas=>({base:canvas.style.getPropertyValue('--_kplex-preview-base'),canvas:canvas.style.getPropertyValue('--_kplex-preview-canvas')}))};
   };

   for(let i=0;i<docs.length;i++){const container=docs[i][1].win.createDiv({cls:'kplex-color-modal kplex-theme-acceptance'});container.setCssStyles({position:'fixed',left:'-100000px',width:'640px'});docs[i][1].body.append(container);c.owned.push(container);
    c.previews.push(new previewModule.ColorPreview(container,{sourceScope:c.graphs[i],translate:p.translator,target:{kind:'compass'},preferences:()=>p.settings.colorPreferences,nodeStyle:()=>p.settings.baseNodeStyle,linkStyle:()=>p.settings.baseLinkStyle,background:()=>p.settings.backgroundColor},undefined));}
   const observe=(owner,name,counter)=>{const original=owner[name];owner[name]=function(...args){c.counts[counter]++;return original.apply(this,args)};c.counterRestores.push(()=>owner[name]=original)};

   /** Foreground each exact native owner before comparing actual graph and preview surfaces. */
   const foreground=async i=>{const doc=docs[i][1],native=doc.defaultView.require('@electron/remote').getCurrentWindow();native.show();native.focus();native.webContents.focus();await until(()=>!doc.hidden&&native.isFocused(),'Native owner not foreground/'+docs[i][0]);};
   /** Canonicalize a complete CSS color through this actual graph scope without reading note content. */
   const color=(i,value)=>{const graph=c.graphs[i],probe=graph.createSpan();try{probe.style.color=value;return docs[i][1].defaultView.getComputedStyle(probe).color}finally{probe.remove()}};
   /** Verify live consumers and real synthetic preview cards, retaining graph and camera DOM. */
   const live=async (i,sampler)=>{await foreground(i);const graph=c.graphs[i],view=docs[i][1].defaultView,svg=graph.querySelector('.kplex-compass-background');await until(()=>view.getComputedStyle(graph).backgroundColor===color(i,'var(--background-primary)'),'Live canvas mismatch/'+docs[i][0]);
    await until(()=>color(i,view.getComputedStyle(svg.children[0]).fill)===color(i,'var(--interactive-accent)'),'Live Compass mismatch/'+docs[i][0]);const snapshot=await sampler.sample(graph,tokens);if(!snapshot)throw Error('Live theme snapshot cancelled');c.previews[i].invalidate();
    await until(()=>{const cards=c.owned[i].querySelectorAll('.kplex-color-preview-canvas');return cards.length===2&&['light','dark'].every((mode,n)=>cards[n].style.getPropertyValue('--_kplex-preview-canvas')===snapshot[mode].colors['--background-primary']&&cards[n].querySelector('.kplex-color-preview-compass polygon')?.getAttribute('fill')===snapshot[mode].colors['--interactive-accent'])});
    if(graph.querySelector('.kplex-role-center')!==baseline[i].center||graph.querySelector('.kplex-camera')!==baseline[i].camera)throw Error('Theme change remounted graph');
    return{snapshot,canvas:view.getComputedStyle(graph).backgroundColor,northFill:view.getComputedStyle(svg.children[0]).fill,intensity:Number(view.getComputedStyle(svg).fillOpacity),centerRetained:true,cameraRetained:true,
      cards:[...c.owned[i].querySelectorAll('.kplex-color-preview-canvas')].map(canvas=>({base:canvas.style.getPropertyValue('--_kplex-preview-base'),canvas:canvas.style.getPropertyValue('--_kplex-preview-canvas'),sectors:canvas.querySelectorAll('.kplex-color-preview-compass polygon').length}))};};
   // Complete first activation of each newly created native view before measuring color changes.
   // Initial popout demand/layout work belongs to setup and must not be attributed to theme paint.
   for(let i=0;i<docs.length;i++){await foreground(i);await wait(200)}
   const setupSampler=new previewModule.ThemePreviewSampler();c.samplers.push(setupSampler);await settingsLive(setupSampler);setupSampler.dispose();
   await foreground(0);await wait(200);
   observe(app.vault,'read','reads');observe(app.vault,'cachedRead','reads');observe(p.index.sourceAcquisition,'parse','parses');observe(p.index.sourceAcquisition,'acquire','acquisitions');observe(p.index,'refreshSemanticSettings','semantics');observe(p.index,'prepareSearchIndex','search');observe(p.index,'invalidateNodeVisuals','visuals');observe(p.index,'getNeighborhood','neighborhoods');
   for(const theme of ${JSON.stringify(themes)}){
    for(const x of c.restores){if(theme.css){const sheet=new x.doc.defaultView.CSSStyleSheet();sheet.replaceSync(theme.css);x.doc.adoptedStyleSheets=[...x.sheets,sheet]}else x.doc.adoptedStyleSheets=x.sheets}
    app.workspace.trigger('css-change');
    const samplers=docs.map(()=>new previewModule.ThemePreviewSampler());c.samplers.push(...samplers);
    const first=[],liveBefore=[];
    for(let i=0;i<docs.length;i++){const {snapshot,...rendered}=await live(i,samplers[i]);liveBefore.push(rendered);first.push(snapshot);}
    const settingsSampler=new previewModule.ThemePreviewSampler();c.samplers.push(settingsSampler);const settingsBefore=await settingsLive(settingsSampler);
    if(!app.commands.executeCommandById('theme:toggle-light-dark'))throw Error('Native theme toggle unavailable');
    await until(()=>[...docs.map(([,d])=>d),settingsDoc].every(d=>d.body.classList.contains('theme-light')!==c.initialLight));await wait(100);
    for(let i=0;i<docs.length;i++){samplers[i].invalidate();const {snapshot:next,...liveAfter}=await live(i,samplers[i]),before=first[i];if(!before||!next)throw Error('Snapshot cancelled');const parity=tokens.every(key=>before.light.colors[key]===next.light.colors[key]&&before.dark.colors[key]===next.dark.colors[key]);c.rows.push({theme:theme.name,document:docs[i][0],first:before,afterSwitch:next,liveBefore:liveBefore[i],liveAfter,parity});if(!parity||before.light.confidence!=='matched'||next.dark.confidence!=='matched')throw Error('Native dual-mode parity failed: '+theme.name+'/'+docs[i][0]);}
    settingsSampler.invalidate();const settingsAfter=await settingsLive(settingsSampler);const settingsParity=tokens.every(key=>settingsBefore.snapshot.light.colors[key]===settingsAfter.snapshot.light.colors[key]&&settingsBefore.snapshot.dark.colors[key]===settingsAfter.snapshot.dark.colors[key]);if(!settingsParity)throw Error('Settings dual-mode parity failed '+theme.name);c.rows.push({theme:theme.name,document:'settings',first:settingsBefore.snapshot,afterSwitch:settingsAfter.snapshot,liveBefore:settingsBefore.cards,liveAfter:settingsAfter.cards,parity:settingsParity});settingsSampler.dispose();
    app.commands.executeCommandById('theme:toggle-light-dark');await until(()=>[...docs.map(([,d])=>d),settingsDoc].every(d=>d.body.classList.contains('theme-light')===c.initialLight));await wait(100);for(const s of samplers)s.dispose();
   }
   await foreground(0);const graph=c.graphs[0],originalInline=['--background-primary','--interactive-accent'].map(name=>({name,value:graph.style.getPropertyValue(name),priority:graph.style.getPropertyPriority(name)}));c.inline={graph,originalInline};
   const camera=baseline[0].camera,transform=camera.style.transform;graph.style.setProperty('--background-primary','#123456');graph.style.setProperty('--interactive-accent','#abcdef');const snippetSampler=new previewModule.ThemePreviewSampler();c.samplers.push(snippetSampler);const {snapshot:snippetSnapshot,...snippet}=await live(0,snippetSampler);snippetSampler.dispose();
   if(snippet.canvas!=='rgb(18, 52, 86)'||color(0,snippet.northFill)!=='rgb(171, 205, 239)'||camera.style.transform!==transform)throw Error('Scoped snippet failed paint/retention');
   for(const item of originalInline)if(item.value)graph.style.setProperty(item.name,item.value,item.priority);else graph.style.removeProperty(item.name);c.inline=null;
   if(Object.values(c.counts).some(value=>value!==0))throw Error('Theme paint requested source/graph work '+JSON.stringify(c.counts));
   return{rows:c.rows,snippet,counts:c.counts,host:process.versions,modeRestored:document.body.classList.contains('theme-light')===c.initialLight};
  })().then(value=>{c.done=true;c.value=value},error=>{c.done=true;c.error=String(error)});return JSON.stringify({started:true})})()`);
 installed=true;
 const deadline=Date.now()+90000;
 while(true){await new Promise(r=>setTimeout(r,250));const state=evaluate("JSON.stringify({done:window.__kplex158Preview?.done,error:window.__kplex158Preview?.error,value:window.__kplex158Preview?.value,rows:window.__kplex158Preview?.rows})");report.progress=state;if(state.done){if(state.error)throw Error(state.error);report.result=state.value;break}if(Date.now()>deadline)throw Error('Native preview deadline')}
 report.status='passed';
}catch(error){report.status='failed';report.error=String(error);process.exitCode=1}
finally{
 try{if(installed){evaluate("(()=>{\n const c=window.__kplex158Preview,p=app.plugins.plugins['k-plex'];if(!c)return JSON.stringify({absent:true});c.cancelled=true;\n c.cleanup=(async()=>{\n  const errors=[];let settingsDrained=false;\n  const attempt=async(label,action)=>{try{await action()}catch(error){errors.push(label+': '+String(error))}};\n  await attempt('native Settings',()=>{c.settingsDialog?.retire();if(app.setting.isOpen)app.setting.close()});\n  for(const preview of c.previews)await attempt('preview',()=>preview.dispose());\n  for(const sampler of c.samplers)await attempt('sampler',()=>sampler.dispose());\n  await attempt('task',()=>c.task);\n  for(const restore of c.counterRestores.reverse())await attempt('probe',restore);\n  await attempt('queue',async()=>{await p.settingsWriteQueue;settingsDrained=true});\n  for(const x of c.restores)await attempt('stylesheet',()=>{if(x.doc.defaultView&&!x.doc.defaultView.closed)x.doc.adoptedStyleSheets=x.sheets});\n  for(const el of c.owned)await attempt('container',()=>el.remove());\n  if(c.inline)for(const item of c.inline.originalInline)await attempt('snippet',()=>{if(item.value)c.inline.graph.style.setProperty(item.name,item.value,item.priority);else c.inline.graph.style.removeProperty(item.name)});\n  await attempt('mode',()=>{if(document.body.classList.contains('theme-light')!==c.initialLight)app.commands.executeCommandById('theme:toggle-light-dark')});\n  await attempt('popout',()=>c.popout?.detach());\n  await attempt('post-close queue',async()=>{await p.settingsWriteQueue;settingsDrained=true});\n  if(settingsDrained){p.settings=c.settings;p.savedSettingsPolicy=c.policy;await attempt('presentation',()=>p.index.refreshPresentationSettings());}\n  await attempt('workspace',()=>app.workspace.changeLayout(c.layout));\n  await attempt('final queue',async()=>{await p.settingsWriteQueue;settingsDrained=true});\n  return{errors,taskDrained:c.done,settingsDrained,modeRestored:document.body.classList.contains('theme-light')===c.initialLight,framesRemoved:!document.querySelector('iframe[sandbox]')};\n })().then(value=>{c.cleaned=true;c.cleanupValue=value},error=>{c.cleanupError=String(error)});\n return JSON.stringify({started:true});\n})()");const end=Date.now()+30000;while(true){await new Promise(r=>setTimeout(r,100));const state=evaluate("JSON.stringify({done:window.__kplex158Preview?.cleaned,error:window.__kplex158Preview?.cleanupError,value:window.__kplex158Preview?.cleanupValue})");if(state.error)throw Error(state.error);if(state.done){report.cleanup=state.value;safeToRestore=!!state.value.taskDrained&&!!state.value.settingsDrained;if(state.value.errors.length)throw Error(state.value.errors.join('; '));break}if(Date.now()>end)throw Error('Preview cleanup deadline')}evaluate("(()=>{delete window.__kplex158Preview;return JSON.stringify({removed:!window.__kplex158Preview})})()")}}
 catch(error){report.cleanupError=String(error);report.status='failed';process.exitCode=1}
 if(installed&&!safeToRestore){report.cleanupError??='Native theme controller did not safely drain';report.status='failed';process.exitCode=1;}
 if(!installed||safeToRestore)for(const {name,bytes}of backups){const path=join(target.config,name);if(bytes)writeFileSync(path,bytes);else if(existsSync(path))rmSync(path)}
 report.configurationBytesRestored=(!installed||safeToRestore)&&backups.every(({name,bytes})=>bytes?readFileSync(join(target.config,name)).equals(bytes):!existsSync(join(target.config,name)));
 writeFileSync(join(output,'driver-source.mjs'),readFileSync(new URL(import.meta.url)));writeFileSync(join(output,'preview-bundle.js'),bundle.outputFiles[0].text);
 report.completedAt=new Date().toISOString();writeFileSync(join(output,'report.json'),JSON.stringify(report,null,2)+'\n');
}
console.log(JSON.stringify({status:report.status,error:report.error,report:join(output,'report.json')}));
