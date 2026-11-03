/** Exact-build #259 acceptance in disposable Small. Uses native metadata events and the actual
 * compiler, URL publication, canvas, search and cache reload; restores notes/configuration/layout. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {homedir} from 'node:os';
import {runControlledProbe} from './controlledProbe.mjs';
import {nativeDocumentSessions} from './nativeDocumentSessions.mjs';
import {validateTarget} from './runner.mjs';
import {acquireHostLock} from './hostLock.mjs';

/** Observe new-source discovery, live edits/removal and real warm reload in both index strategies. */
async function scenario(app,c){
  let p=app.plugins.plugins['k-plex'],disabled=false;
  const workspace=app.workspace,layout=workspace.getLayout(),settings=structuredClone(p.settings);
  const inventory=app.vault.getMarkdownFiles().map(file=>file.path).sort(),sessions=c.sessions(p),saved=sessions.capture();
  const remote=require('@electron/remote'),win=remote.getCurrentWindow();
  const files=[],folder='__kplex259_'+Date.now(),url='https://example.com/kplex259-'+Date.now();
  let directory,leaf,changedAt;
  const samples=[];
  /** Every wait exposes actual status/progress rather than silently extending the deadline. */
  const until=async(predicate,message,maximum=90000)=>{
    const start=Date.now();
    while(!predicate()){
      c.progress={...c.progress,waitedMs:Date.now()-start,status:p?.getIndexStatus(),source:p?.index.getSourceAcquisitionCounters()};
      if(c.closed||Date.now()-start>maximum)throw Error(message);
      await new Promise(resolve=>window.setTimeout(resolve,50));
    }
  };
  /** Native unload/load always replaces the captured plugin and view identities. */
  const reload=async()=>{
    await p.settingsWriteQueue;await app.plugins.disablePlugin('k-plex');disabled=true;
    await app.plugins.enablePlugin('k-plex');disabled=false;p=app.plugins.plugins['k-plex'];
    if(!p?.index)throw Error('Plugin did not reload');
    leaf=workspace.getLeavesOfType('k-plex-react-view')[0];
    if(!leaf){app.commands.executeCommandById('k-plex:kplex-start');leaf=workspace.getLeavesOfType('k-plex-react-view')[0];}
    await workspace.revealLeaf(leaf);
  };
  const ready=()=>p.initialIndexComplete&&!p.index.isBuilding()&&p.getIndexStatus().upToDate;
  /** Eager closes source authority; local mode deliberately prepares only demanded sources. Both close URL discovery. */
  const audited=()=>{const urls=p.index.getUrlIndexProgress();return (p.index.isOnDemandMode()
    ||p.index.sourceAcquisition.hasSemanticDependencies()&&!p.index.sourceAcquisition.inventory)
    &&urls.complete&&!urls.active;};
  /** Assert both canonical facets and actual rendered URL card text, with searchable alternatives. */
  const label=async(expected,alias)=>{
    p.notifyNavigation(files[0].path,leaf);
    await until(()=>{const page=p.index.get(url);return page&&p.index.titleFor(page)===expected
      &&leaf.view.containerEl.querySelector('[data-kplex-path="'+url+'"]')?.textContent.includes(expected);},'URL card did not show '+expected);
    if(alias)await until(()=>p.index.search(alias,40,'vault').some(page=>page.path===url),'Missing URL search alias');
    const page=p.index.get(url);return {name:page.name,title:p.index.titleFor(page),aliases:[...page.aliases]};
  };
  try{
    remote.app.show?.();remote.app.focus({steal:true});win.show();win.moveTop();win.focus();
    await sessions.off();Object.assign(p.settings,{documentSyncMode:'off',sidecarOpen:false,embedCentralNode:false,indexingModeDesktop:'eager'});
    await p.saveSettings(false,false);await reload();c.progress={phase:'eager baseline'};await until(ready,'Eager baseline did not settle');
    directory=await app.vault.createFolder(folder);
    const field=p.defaultOntologyField('child');if(!field)throw Error('Missing child property');
    files.push(await app.vault.create(folder+'/Source.md','---\n'+JSON.stringify(field)+': '+JSON.stringify('[Readable259]('+url+') [Alias259]('+url+')')+'\n---\n'+url+'\n'));
    changedAt=Date.now();c.progress={phase:'new frontmatter source'};
    const created=await label('Readable259','Alias259');await until(ready,'New source did not settle');
    await app.fileManager.processFrontMatter(files[0],fm=>{fm[field]='[Edited259]('+url+')';});
    c.progress={phase:'native property edit'};const edited=await label('Edited259','Edited259');
    await until(()=>!p.index.get(url)?.aliases.includes('Alias259'),'Removed search alias survived property edit');
    await app.fileManager.processFrontMatter(files[0],fm=>{delete fm[field];});
    c.progress={phase:'native label removal'};const removed=await label(url);
    await app.fileManager.processFrontMatter(files[0],fm=>{fm[field]='[Restored259]('+url+')';});changedAt=Date.now();
    const restored=await label('Restored259','Restored259');await until(ready,'Restored label did not settle');
    c.progress={phase:'normal snapshot persistence',normalIdleDelayMs:300000};
    await until(()=>p.index.getSavedSnapshotSummary().active?.createdAt>=changedAt&&p.index.snapshotPersistTimer===null,
      'Natural fixture snapshot did not persist',390000);
    c.progress={phase:'warm eager reload'};let started=performance.now();await reload();await until(ready,'Warm eager reload did not settle');
    const warm=await label('Restored259','Restored259'),usableMs=performance.now()-started;
    await until(()=>ready()&&audited(),'Warm eager source/URL audits did not close');
    const counters=p.index.getSourceAcquisitionCounters(),semantic=p.index.getSemanticPreparationDiagnostics(),urlWork=p.index.getUrlIndexProgress();
    if(counters.vaultReads||counters.parses||semantic.fullBuilds||urlWork.reads||urlWork.failed)throw Error('Warm eager reload reread/rebuilt unchanged sources');
    samples.push({strategy:'eager',usableMs,elapsedMs:performance.now()-started,counters,urlWork,fullBuilds:semantic.fullBuilds,facets:warm});
    p.settings.indexingModeDesktop='on-demand';await p.saveSettings(false,false);
    c.progress={phase:'warm on-demand reload'};started=performance.now();await reload();
    const onDemand=await label('Restored259','Restored259'),localUsableMs=performance.now()-started;
    await until(audited,'On-demand source/URL audits did not close');
    const localCounters=p.index.getSourceAcquisitionCounters(),localUrlWork=p.index.getUrlIndexProgress();
    if(localCounters.vaultReads||localCounters.parses||localUrlWork.reads||localUrlWork.failed)throw Error('Warm local reload reread unchanged Markdown');
    samples.push({strategy:'on-demand',usableMs:localUsableMs,elapsedMs:performance.now()-started,counters:localCounters,urlWork:localUrlWork,facets:onDemand});
    return {created,edited,removed,restored,samples,environment:{hidden:document.hidden,focused:document.hasFocus(),backgroundThrottling:win.webContents.getBackgroundThrottling()}};
  }finally{
    c.progress={phase:'restoring disposable fixture'};const errors=[];
    /** Cleanup continues independently after any failed assertion or plugin restart. */
    const clean=async(name,action)=>{try{await action();}catch(error){errors.push(name+': '+String(error));}};
    if(disabled)await clean('enable',()=>app.plugins.enablePlugin('k-plex'));
    p=app.plugins.plugins['k-plex'];
    for(const file of files)if(app.vault.getFileByPath(file.path)===file)await clean('note',()=>app.vault.delete(file,true));
    if(directory&&app.vault.getFolderByPath(folder)===directory&&!directory.children.length)await clean('folder',()=>app.vault.delete(directory,true));
    await clean('settings',async()=>{p.settings=settings;await p.saveSettings(false,false);await p.settingsWriteQueue;await reload();});
    await clean('layout',()=>workspace.changeLayout(layout));
    await clean('sessions',()=>c.sessions(p).restore(saved));
    await clean('pending settings',()=>p.settingsWriteQueue);
    await new Promise(resolve=>window.setTimeout(resolve,2500));
    await clean('settings bytes',()=>app.vault.adapter.write(p.manifest.dir+'/data.json',c.originalData));
    await clean('enablement bytes',()=>app.vault.adapter.write(app.vault.configDir+'/community-plugins.json',c.originalEnabled));
    await clean('inventory',async()=>{if(JSON.stringify(app.vault.getMarkdownFiles().map(file=>file.path).sort())!==JSON.stringify(inventory))throw Error('Markdown inventory differs');});
    if(errors.length)throw Error(errors.join('; '));
  }
}

/** The standalone runner or an exact-build staging caller owns the shared application lock. */
export async function runFrontmatterUrlLabelsProbe(){
  assert.equal(process.env.KPLEX_TEST_VAULT_NAME,'kplex-test-small','Explicit disposable Small required');
  const target=validateTarget({vaultName:process.env.KPLEX_TEST_VAULT_NAME,vaultPath:process.env.KPLEX_TEST_VAULT_PATH,configDir:process.env.KPLEX_TEST_CONFIG_DIR});
  await runControlledProbe('frontmatter-url-labels-259',scenario,'c.sessions='+nativeDocumentSessions.toString()+';c.originalData='+JSON.stringify(readFileSync(join(target.pluginDir,'data.json'),'utf8'))+';c.originalEnabled='+JSON.stringify(readFileSync(join(target.config,'community-plugins.json'),'utf8'))+';',
    ['src/core/parser/metadata.ts','src/core/graph/source.ts','src/adapters/obsidian/metadataSourceCollector.ts'],{maximumMs:900000});
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const userData=process.env.KPLEX_OBSIDIAN_USER_DATA??(process.platform==='win32'?join(process.env.APPDATA,'obsidian'):process.platform==='darwin'?join(homedir(),'Library','Application Support','obsidian'):join(process.env.XDG_CONFIG_HOME??join(homedir(),'.config'),'obsidian'));
  const lock=acquireHostLock({userDataPath:userData});
  try{await runFrontmatterUrlLabelsProbe();}finally{lock.release();}
}
