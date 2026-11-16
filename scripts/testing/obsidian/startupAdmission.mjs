/** Exact-build startup admission checks in disposable Small. Reloads the real plugin and uses
 * actual native Settings controls; measurement reuses the existing retained-memory owner. */
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {validateTarget} from './runner.mjs';
import {runControlledProbe} from './controlledProbe.mjs';
import {startupRetainedMemory} from './startupRetainedMemory.mjs';

async function scenario(app,c){
 const id='k-plex',types=['k-plex-react-view','k-plex-sidepanel-view'],initial=app.plugins.plugins[id];
 const check=(value,message)=>{if(!value)throw Error(message)},wait=ms=>new Promise(resolve=>window.setTimeout(resolve,ms));
 const until=async(read,message)=>{const end=Date.now()+45000;while(!(await read())){check(!c.closed&&Date.now()<end,message);await wait(40)}};
 check(initial&&!app.setting.isOpen&&app.vault.getFiles().length<1000,'Clean disposable Small required');
 check(types.every(type=>app.workspace.getLeavesOfType(type).length===0),'Close Plexes before startup admission probe');
 const layout=app.workspace.getLayout(),owned=[],prefix='Kplex195-'+Date.now();
 const cases=[],nativeProcess=require('process');let p=initial;c.progress={phase:'setup',cases};
 const reload=async()=>{
  c.progress={phase:'reload',cases};
  await p.settingsWriteQueue;await app.plugins.disablePlugin(id);await app.plugins.enablePlugin(id);p=app.plugins.plugins[id];
  check(p&&p!==initial,'Plugin reload did not replace its lifetime');
  await until(()=>p.layoutReady,'Layout/settings setup pending');p.appearanceMigrationDialog?.close();await p.settingsWriteQueue;
 };
 const quietFacts=()=>({source:p.index.getSourceAcquisitionCounters(),hydration:p.index.getSnapshotHydrationDiagnostics(),
  startup:p.getStartupDiagnostics(),urls:p.index.getUrlIndexProgress(),catalogEntries:p.index.physicalSearchEntries.size});
 const noWork=()=>{
  const facts=quietFacts();check(!p.indexPreparationAdmitted&&facts.startup.status.phase==='deferred','Dormant state was admitted');
  check(facts.source.vaultReads===0&&facts.source.parses===0&&facts.source.checked===0,'Dormant source acquisition');
  check(facts.hydration.phase==='idle'&&!facts.urls.active&&facts.urls.processed===0,'Dormant graph or URL hydration');
  check(!p.indexSearchPrimed,'Dormant broad search catalog');
  return facts;
 };
 try{
  initial.appearanceMigrationDialog?.close();await initial.settingsWriteQueue;
  p.settings.indexBeforeViewDesktop=false;p.settings.indexBeforeViewTablet=false;p.settings.indexBeforeViewMobile=false;
  p.settings.indexingMode='on-demand';p.settings.indexingModeDesktop='on-demand';p.settings.indexingModeTablet='on-demand';p.settings.indexingModeMobile='on-demand';p.settings.startInPopout=false;p.settings.documentSyncMode='off';p.settings.sidecarOpen=false;await p.saveSettings(false,false);
  const cpu=nativeProcess.cpuUsage(),started=performance.now();await reload();
  await wait(10000);const after=nativeProcess.cpuUsage();
  const measured={elapsedMs:performance.now()-started,cpuMicroseconds:{user:after.user-cpu.user,system:after.system-cpu.system},facts:quietFacts()};
  if(c.baseline){
   check(p.indexPreparationAdmitted===undefined,'Baseline unexpectedly contains candidate admission');
   measured.retained=await c.retained(app,'kplex-test-small');return {baseline:true,measured,files:app.vault.getFiles().length};
  }
  noWork();cases.push('disabled desktop: ten seconds without graph/source/URL preparation');
  measured.retained=await c.retained(app,'kplex-test-small');

  c.progress={phase:'Settings',cases};
  p.openSettings();check(p.settingsTab.openSettingsPage(p.translator('indexing.pageTitle')),'Native Indexing page absent');
  const doc=p.settingsTab.containerEl.ownerDocument;
  const toggle=key=>{
   const label=p.translator(key),rows=[...doc.querySelectorAll('.setting-item')];
   const row=rows.find(row=>row.querySelector('.setting-item-name')?.textContent===label&&row.getClientRects().length);
   const button=row?.querySelector('.checkbox-container');check(button,'Native device toggle absent: '+key);return button;
  };
  for(const [key,pref] of [['typography.desktop','indexBeforeViewDesktop'],['typography.tablet','indexBeforeViewTablet'],['typography.mobile','indexBeforeViewMobile']]){
   toggle(key).click();await until(()=>p.settings[pref]===true,'Preference write pending');await p.settingsWriteQueue;
   noWork();check(p.startupIndexPolicy.beforeView===false,'Saved preference changed current admission policy');
  }
  for(const [key,pref] of [['typography.desktop','indexingModeDesktop'],['typography.tablet','indexingModeTablet'],['typography.mobile','indexingModeMobile']]){
   const row=[...doc.querySelectorAll('.setting-item')].find(row=>row.querySelector('.setting-item-name')?.textContent===p.translator(key)&&row.querySelector('select')&&row.getClientRects().length);
   const select=row?.querySelector('select');check(select,'Native device mode dropdown absent: '+key);
   select.value='eager';select.dispatchEvent(new doc.defaultView.Event('change',{bubbles:true}));
   await until(()=>p.settings[pref]==='eager','Strategy write pending');await p.settingsWriteQueue;
   noWork();check(p.startupIndexPolicy.mode==='on-demand'&&p.index.isOnDemandMode(),'Saved strategy changed the running index');
   if(pref==='indexingModeDesktop'){
    select.value='on-demand';select.dispatchEvent(new doc.defaultView.Event('change',{bubbles:true}));
    await until(()=>p.settings[pref]==='on-demand','Desktop strategy reset pending');await p.settingsWriteQueue;
   }
  }
  const saved=await p.loadData();check(saved.indexBeforeViewDesktop&&saved.indexBeforeViewTablet&&saved.indexBeforeViewMobile,'Independent toggles not durable');
  check(saved.indexingModeDesktop==='on-demand'&&saved.indexingModeTablet==='eager'&&saved.indexingModeMobile==='eager','Independent device strategies not durable');
  const rectangle=doc.querySelector('.modal.mod-settings')?.getBoundingClientRect();check(rectangle&&rectangle.width>100,'Visible native Settings geometry absent');
  await new Promise(resolve=>doc.defaultView.requestAnimationFrame(()=>doc.defaultView.requestAnimationFrame(resolve)));
  const image=await doc.defaultView.require('@electron/remote').getCurrentWindow().webContents.capturePage({x:Math.max(0,Math.floor(rectangle.x)),y:Math.max(0,Math.floor(rectangle.y)),width:Math.ceil(rectangle.width),height:Math.ceil(rectangle.height)});
  require('fs').writeFileSync(c.screenshot,image.toPNG());

  check(doc.body.textContent.includes(p.translator('indexing.startupHelp')),'Restart disclosure absent');
  toggle('typography.desktop').click();await until(()=>!p.settings.indexBeforeViewDesktop,'Desktop toggle reset pending');await p.settingsWriteQueue;app.setting.close();
  cases.push('six real Settings device controls persist independently without admitting or changing the running session');

  const a=await app.vault.create(prefix+' A.md','[['+prefix+' B]]'),b=await app.vault.create(prefix+' B.md','');owned.push(a,b);
  await until(()=>app.metadataCache.getFileCache(a)&&app.metadataCache.getFileCache(b),'Native metadata pending');
  await app.vault.modify(a,'[['+prefix+' B]]\n');await wait(500);noWork();
  p.settings.lastActivePath=a.path;p.settings.navigationHistory=[a.path];await p.saveSettings(false,false);noWork();
  cases.push('native create/modify/metadata and saved navigation remain dormant');
  // A normal explicit opening follows the actual active native document after startup settles.
  await app.workspace.getLeaf(true).openFile(a);noWork();
  c.progress={phase:'first concurrent opening',cases};
  const first=performance.now();await Promise.all([p.activateView(),p.activateSidepanel()]);
  await until(()=>types.flatMap(type=>app.workspace.getLeavesOfType(type)).some(leaf=>{
   if(leaf.view.contentEl.querySelector('.kplex-role-center')?.dataset.kplexPath!==a.path)return false;
   const paths=[...leaf.view.contentEl.querySelectorAll('[data-kplex-path]')].map(el=>el.dataset.kplexPath);return paths.includes(b.path);
  }),'First stationary center or its native connection pending');
  const centerMs=performance.now()-first;
  await until(()=>p.indexPreparationTask!==null&&p.initialIndexComplete,'Initial preparation pending');
  const task=p.indexPreparationTask,index=p.index;await task;const restore=p.snapshotRestoreTask;
  check(types.every(type=>app.workspace.getLeavesOfType(type).length===1),'Concurrent main/sidebar opening absent');
  for(const type of types)for(const leaf of app.workspace.getLeavesOfType(type))leaf.detach();
  await p.activateView();await until(()=>app.workspace.getLeavesOfType(types[0]).length===1,'Reopening pending');
  check(p.index===index&&p.indexPreparationTask===task&&p.snapshotRestoreTask===restore,'Close/reopen replayed successful preparation');
  cases.push('concurrent actual main/sidebar opening admits once, shows connections and reuses startup after close/reopen');
  const afterOpening=quietFacts();
  for(const type of types)for(const leaf of app.workspace.getLeavesOfType(type))leaf.detach();
  p.settings.indexBeforeViewDesktop=true;p.settings.indexingModeDesktop='eager';await p.saveSettings(false,false);await reload();
  await until(()=>p.indexPreparationAdmitted&&p.initialIndexComplete,'Enabled Eager pre-open startup pending');
  check(types.every(type=>app.workspace.getLeavesOfType(type).length===0),'Enabled test unexpectedly opened a Plex');
  check(!p.index.isOnDemandMode()&&p.startupIndexPolicy.mode==='eager','Reload did not apply saved desktop strategy');
  const enabled=quietFacts();cases.push('enabled desktop admits Eager preparation with no native Plex');
  await app.vault.modify(a,'[['+b.basename+']]\nBackground edit:: [['+prefix+' background target]]');
  await until(()=>p.indexDirty,'Closed-canvas edit reaches the ordinary native backlog');
  await until(()=>!p.indexDirty&&!p.rebuildTask&&p.index.hasCurrentFullSemanticGraph()
   &&!p.index.hasActiveSourcePreparation()&&!p.index.hasPendingSemanticPreparation(),
   'Enabled desktop preparation must settle a genuine edit without opening a Plex');
  check(p.index.get(a.path)?.neighbours.has(prefix+' background target'),'Background graph omitted the actual edited link');
  check(types.every(type=>app.workspace.getLeavesOfType(type).length===0),'Background maintenance opened a Plex');
  cases.push('enabled desktop maintains a genuine edit to current graph authority with every Plex closed');
  p.settings.indexBeforeViewDesktop=false;await p.saveSettings(false,false);await reload();await wait(2000);noWork();
  await p.rebuildIndex(true,true,'native-startup-admission');
  check(p.initialIndexComplete,'Explicit closed rebuild did not establish readiness');
  check(p.getStartupDiagnostics().sessionWork.fullBuildStarts===1,'Explicit first work rebuilt the complete graph twice');
  cases.push('first explicit closed rebuild runs one complete builder and establishes readiness');
  await reload();await wait(1000);noWork();
  const editor=app.workspace.getLeaf(true);await editor.openFile(b);const parked=app.workspace.getLeaf(true);
  await parked.setViewState({type:types[0],active:false});app.workspace.setActiveLeaf(editor,{focus:true});
  await until(()=>p.indexPreparationAdmitted&&p.initialIndexComplete,'Inactive live Plex did not admit Eager startup');
  check(app.workspace.activeLeaf!==parked,'Parked Plex did not stay inactive');
  cases.push('inactive live Plex admits Eager work even with pre-open startup disabled');
  return {cases,measured,firstUsableCenterMs:centerMs,afterOpening,enabled,files:app.vault.getFiles().length,runtime:{electron:nativeProcess.versions.electron,chrome:nativeProcess.versions.chrome,node:nativeProcess.versions.node},
   limits:'Windows plugin reload and native DOM/API interactions; no full Obsidian process restart, actual paint timing or physical tablet/phone claim.'};
 }catch(error){
  c.progress={...c.progress,cases,facts:quietFacts()};throw error;
 }finally{
  const failures=[],clean=async run=>{try{await run()}catch(error){failures.push(String(error))}};
  if(app.setting.isOpen)await clean(()=>app.setting.close());
  for(const type of types)for(const leaf of app.workspace.getLeavesOfType(type))await clean(()=>leaf.detach());
  for(const file of owned)await clean(async()=>{check(file.path.startsWith(prefix)&&app.vault.getFileByPath(file.path)===file,'Fixture identity changed');await app.vault.delete(file)});
  await clean(()=>p.index.sourceAcquisition.flush());
  await clean(()=>app.plugins.disablePlugin(id));
  await clean(()=>app.workspace.changeLayout(layout));
  await clean(()=>app.vault.adapter.write(initial.manifest.dir+'/data.json',c.originalData));
  await clean(()=>app.plugins.enablePlugin(id));p=app.plugins.plugins[id];
  await clean(async()=>{await until(()=>p.layoutReady,'Restored plugin setup pending');await p.settingsWriteQueue;await wait(1500);
   await app.vault.adapter.write(p.manifest.dir+'/data.json',c.originalData);
  });
  if(failures.length)throw Error('Startup probe cleanup: '+failures.join('; '));
 }
}

if(process.env.KPLEX_TEST_VAULT_NAME!=='kplex-test-small')throw Error('Explicit disposable Small required');
const target=validateTarget({vaultName:process.env.KPLEX_TEST_VAULT_NAME,vaultPath:process.env.KPLEX_TEST_VAULT_PATH,configDir:process.env.KPLEX_TEST_CONFIG_DIR});
const baseline=process.env.KPLEX_STARTUP_POLICY_BASELINE==='true';
await runControlledProbe('startup-admission-195',scenario,
 'c.originalData='+JSON.stringify(readFileSync(join(target.pluginDir,'data.json'),'utf8'))+';c.screenshot='+JSON.stringify(join(process.env.KPLEX_HOST_REPORT_DIR??'','startup-settings.png'))+';c.baseline='+JSON.stringify(baseline)+';c.retained='+startupRetainedMemory.toString()+';',
 ['src/main.ts','src/adapters/obsidian/sourceAcquisition.ts',...(baseline?[]:['src/settings.ts','src/core/plex/startupIndexPreferences.ts'])]);
