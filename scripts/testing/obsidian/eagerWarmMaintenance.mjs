/** Exact-build Small-vault regression for edits after warm graph hydration but before the initial
 * source audit closes. A test-owned read hold preserves the real audit task; native property edits,
 * graph publication, priority and progress remain production code. Owned notes/configuration/layout
 * and the read wrapper are restored independently of success. Production vaults are refused. */
import {readFileSync} from 'node:fs';
import {join,relative,resolve} from 'node:path';
import {validateTarget} from './runner.mjs';
import {runControlledProbe} from './controlledProbe.mjs';

/** Persist a genuine warm graph, hold its actual metadata audit and edit one owned source twice. */
async function scenario(app,c) {
  const check=(value,message)=>{if(!value)throw Error(message);};
  /** Observe actual state without restamping readiness or invoking any builder. */
  const until=async(predicate,message)=>{const end=Date.now()+120000;while(!predicate()){check(!c.closed&&Date.now()<end,message);await new Promise(done=>window.setTimeout(done,25));}};
  check(app.vault.getName()==='kplex-test-small'&&app.vault.adapter.getBasePath()===c.vaultPath,'Explicit disposable Small required');
  const layout=app.workspace.getLayout(),owned=[],remote=require('@electron/remote'),nativeWindow=remote.getCurrentWindow();
  let p=app.plugins.plugins['k-plex'],unlock,restoreReader,unsubscribe,disabled=false;
  const folder='Kplex-warm-audit-'+Date.now(),samples=[];
  /** Keep the test window visible with its ordinary throttling policy. */
  const focus=()=>{remote.app.show?.();remote.app.focus({steal:true});nativeWindow.show();nativeWindow.moveTop();nativeWindow.focus();};
  /** Primary graph and the existing source/graph work must settle naturally for the saved baseline. */
  const ready=()=>p.initialIndexComplete&&!p.index.isBuilding()&&!p.index.eagerGraphMaintenanceTask
    &&p.index.publicApiCoverage().complete&&!p.index.publicApiCoverage().pending&&p.getIndexStatus().upToDate;
  try {
    check(p&&!p.index.isOnDemandMode(),'Eager Small required');focus();
    if(!app.workspace.getLeavesOfType('k-plex-react-view').length)app.commands.executeCommandById('k-plex:kplex-start');
    await until(()=>ready()&&!p.index.sourceAcquisition.inventory,'Initial eager baseline did not settle');
    const generation=p.index.activeSnapshotGeneration,field=p.defaultOntologyField('child');
    await app.vault.createFolder(folder);
    const target=await app.vault.create(folder+'/Target.md','');owned.push(target);
    const source=await app.vault.create(folder+'/Source.md','---\n'+JSON.stringify(field)+': '+JSON.stringify(['[['+target.path+']]'])+'\nSentinel: keep\n---\n');owned.push(source);
    await until(()=>app.metadataCache.getFileCache(source)&&ready()&&!p.index.sourceAcquisition.inventory,'Owned sources did not reach complete baseline');
    const host=app.workspace.getLeavesOfType('k-plex-react-view')[0];p.notifyNavigation(source.path,host);await p.saveSettings(false,false);await p.settingsWriteQueue;
    await until(()=>p.index.activeSnapshotGeneration&&p.index.activeSnapshotGeneration!==generation&&p.index.snapshotPersistTimer===null,'Owned complete graph was not normally persisted');
    await app.plugins.disablePlugin('k-plex');disabled=true;await app.plugins.enablePlugin('k-plex');disabled=false;p=app.plugins.plugins['k-plex'];focus();
    const acquisition=p.index.sourceAcquisition,repository=acquisition.repository,inspect=repository.inspectWithLocalDependencies;
    let entered=false;const held=new Promise(done=>unlock=done);
    /** Hold only the broad audit's native comparison; urgent readers use ordinary source APIs. */
    const wrapper=async function(...args){entered=true;await held;return inspect.apply(this,args);};
    repository.inspectWithLocalDependencies=wrapper;
    restoreReader=()=>{if(repository.inspectWithLocalDependencies===wrapper)repository.inspectWithLocalDependencies=inspect;};
    await until(()=>entered&&ready(),'Warm graph did not load ahead of its held audit');
    check(acquisition.inventory&&!acquisition.hasSemanticDependencies(),'Initial audit unexpectedly closed before the test');
    check(acquisition.canPrepareWarmMaintenance(),'Fresh persisted source headers did not admit warm repair');
    const builds=p.index.getSemanticPreparationDiagnostics().fullBuilds;
    /** Capture actual product status notifications, including the short foreground repair interval. */
    unsubscribe=p.subscribeIndexStatus(()=>{const status=p.getIndexStatus();if(samples.length<40)samples.push({phase:status.phase,label:status.label});});
    c.progress={phase:'editing-with-audit-held',status:p.getIndexStatus()};
    const ghost=folder+'/Ghost';
    await app.fileManager.processFrontMatter(source,fm=>{fm[field]=['[['+target.path+']]','[['+ghost+']]'];});
    await until(()=>p.index.neighbours(p.index.get(source.path),'child').some(row=>row.page.path===ghost)&&ready(),'Placeholder creation waited for the held audit');
    check(acquisition.inventory&&entered,'Urgent edit replaced or completed the audit');
    await app.fileManager.processFrontMatter(source,fm=>{fm[field]=['[['+target.path+']]'];});
    await until(()=>!p.index.neighbours(p.index.get(source.path),'child').some(row=>row.page.path===ghost)&&ready(),'Placeholder removal waited for the held audit');
    check(samples.some(row=>row.phase==='updating'&&row.label.includes('%')),'Active source validation progress was hidden');
    const before=p.index.getSourceAcquisitionCounters(),semantic=p.index.getSemanticPreparationDiagnostics(),started=performance.now();
    const leaf=app.workspace.getLeavesOfType('k-plex-react-view')[0];p.notifyNavigation(target.path,leaf);
    await until(()=>leaf.view.containerEl.querySelector('.kplex-role-center')?.dataset.kplexPath===target.path,'Warm destination did not render');
    const after=p.index.getSourceAcquisitionCounters(),last=p.index.getSemanticPreparationDiagnostics();
    check(after.vaultReads===before.vaultReads&&after.parses===before.parses&&last.requested===semantic.requested&&last.dependencyVisits===semantic.dependencyVisits,'Warm navigation reconstructed source facts');
    check(last.fullBuilds===builds&&builds===0,'Warm edit triggered a full rebuild');
    const result={auditHeldDuringBothEdits:!!acquisition.inventory,coverage:p.index.publicApiCoverage(),navigationMs:performance.now()-started,
      fullBuilds:builds,reads:after.vaultReads-before.vaultReads,parses:after.parses-before.parses,requests:last.requested-semantic.requested,familyVisits:last.dependencyVisits-semantic.dependencyVisits,samples};
    unlock();restoreReader();await until(()=>ready()&&!acquisition.inventory,'Audit did not resume and drain after urgent work');
    result.auditDrained=true;return result;
  } finally {
    c.progress={phase:'restoration'};unlock?.();restoreReader?.();unsubscribe?.();
    if(disabled){await app.plugins.enablePlugin('k-plex');disabled=false;}
    p=app.plugins.plugins['k-plex'];
    for(const file of owned.reverse())if(app.vault.getFileByPath(file.path)===file)await app.vault.delete(file);
    const dir=app.vault.getFolderByPath(folder);if(dir){check(dir.children.length===0,'Owned folder has unexpected content');await app.vault.delete(dir);}
    if(p)await until(()=>ready()&&!p.index.sourceAcquisition.inventory,'Owned deletion backlog did not settle');
    await app.plugins.disablePlugin('k-plex');disabled=true;
    await app.vault.adapter.write(c.configRelative+'/plugins/k-plex/data.json',c.originalData);
    await app.plugins.enablePlugin('k-plex');disabled=false;
    await app.workspace.changeLayout(layout);await app.plugins.plugins['k-plex'].settingsWriteQueue;
    await app.vault.adapter.write(c.configRelative+'/plugins/k-plex/data.json',c.originalData);
    await app.vault.adapter.write(c.configRelative+'/community-plugins.json',c.originalEnabled);
    c.progress={phase:'restored',ownedRemaining:owned.filter(file=>app.vault.getFileByPath(file.path)===file).length};
  }
}

if(process.env.KPLEX_TEST_VAULT_NAME!=='kplex-test-small')throw Error('Explicit disposable Small required');
const target=validateTarget({vaultName:process.env.KPLEX_TEST_VAULT_NAME,vaultPath:process.env.KPLEX_TEST_VAULT_PATH,configDir:process.env.KPLEX_TEST_CONFIG_DIR});
const reportDir=resolve(process.env.KPLEX_HOST_REPORT_DIR??''),outside=relative(target.vault,reportDir);
if(!process.env.KPLEX_HOST_REPORT_DIR||!outside.startsWith('..')&&!outside.includes(':'))throw Error('Report directory must be outside the disposable vault');
await runControlledProbe('eager-warm-maintenance',scenario,
  'c.vaultPath='+JSON.stringify(target.vault)+';c.configRelative='+JSON.stringify(relative(target.vault,target.config).replaceAll('\\','/'))+';c.originalData='+JSON.stringify(readFileSync(join(target.pluginDir,'data.json'),'utf8'))+';c.originalEnabled='+JSON.stringify(readFileSync(join(target.config,'community-plugins.json'),'utf8'))+';',
  ['src/main.ts','src/index/GraphIndex.ts','src/adapters/obsidian/sourceAcquisition.ts'],{maximumMs:360000});
