/** Exact-build Small-vault regression for an edit after warm graph hydration but before the first
 * source audit closes. A test-owned read hold preserves the real audit task. One existing disposable
 * note is backed up on disk and restored with its native stat options; production vaults are refused.
 * Source/graph publication, priority and progress remain production code throughout the interaction. */
import {readFileSync} from 'node:fs';
import {join,relative,resolve} from 'node:path';
import {validateTarget} from './runner.mjs';
import {runControlledProbe} from './controlledProbe.mjs';

/** Hold the real warm metadata audit, create/remove a placeholder declaration and restore the note. */
async function scenario(app,c) {
  const check=(value,message)=>{if(!value)throw Error(message);};
  let p=app.plugins.plugins['k-plex'],unlock,restoreReader,unsubscribe,disabled=false,source,originalText,originalStat;
  /** Record useful actual state during every bounded wait, including cleanup. */
  const until=async(predicate,message)=>{const end=Date.now()+120000;while(!predicate()){
    if(p?.index)c.progress={...c.progress,status:p.getIndexStatus(),source:p.index.sourceAcquisition.getActivityState(),
      warm:p.index.sourceAcquisition.canPrepareWarmMaintenance(),coverage:p.index.publicApiCoverage(),graphTask:!!p.index.eagerGraphMaintenanceTask};
    check(!c.closed&&Date.now()<end,message);await new Promise(done=>window.setTimeout(done,25));}};
  check(app.vault.getName()==='kplex-test-small'&&app.vault.adapter.getBasePath()===c.vaultPath,'Explicit disposable Small required');
  const layout=app.workspace.getLayout(),remote=require('@electron/remote'),nativeWindow=remote.getCurrentWindow(),samples=[];
  /** Keep the selected test window visible under ordinary background throttling. */
  const focus=()=>{remote.app.show?.();remote.app.focus({steal:true});nativeWindow.show();nativeWindow.moveTop();nativeWindow.focus();};
  /** Read primary graph readiness independently of the intentionally unfinished metadata audit. */
  const ready=()=>p.initialIndexComplete&&!p.index.isBuilding()&&!p.index.eagerGraphMaintenanceTask
    &&p.index.publicApiCoverage().complete&&!p.index.publicApiCoverage().pending&&p.getIndexStatus().upToDate;
  try {
    check(p&&!p.index.isOnDemandMode(),'Eager Small required');focus();c.progress={phase:'baseline'};
    if(!app.workspace.getLeavesOfType('k-plex-react-view').length)app.commands.executeCommandById('k-plex:kplex-start');
    await until(()=>ready()&&!p.index.sourceAcquisition.inventory,'Initial eager baseline did not settle');
    await until(()=>p.index.activeSnapshotGeneration&&p.index.snapshotPersistTimer===null
      &&(!p.index.getSemanticPreparationDiagnostics().fullBuilds||p.startupDiagnostics.snapshot().sessionWork.completeSnapshotSaves>0),'Complete baseline was not normally persisted');
    source=app.vault.getFileByPath('README.md')??app.vault.getMarkdownFiles().find(file=>p.index.get(file.path)?.file);
    check(source,'An existing disposable Markdown note is required');
    const target=app.vault.getMarkdownFiles().find(file=>file!==source&&p.index.get(file.path)?.file);check(target,'Second indexed test note required');
    originalText=await app.vault.read(source);originalStat={mtime:source.stat.mtime,ctime:source.stat.ctime};
    require('node:fs').writeFileSync(c.backupPath,JSON.stringify({layout,data:c.originalData,enabled:c.originalEnabled,sourcePath:source.path,originalText,originalStat}));
    const host=app.workspace.getLeavesOfType('k-plex-react-view')[0];p.notifyNavigation(source.path,host);await p.saveSettings(false,false);await p.settingsWriteQueue;
    await app.plugins.disablePlugin('k-plex');disabled=true;await app.plugins.enablePlugin('k-plex');disabled=false;p=app.plugins.plugins['k-plex'];focus();
    const acquisition=p.index.sourceAcquisition,repository=acquisition.repository,inspect=repository.inspectWithLocalDependencies;
    c.progress={phase:'warm-graph-before-audit'};
    let entered=false;const held=new Promise(done=>unlock=done);c.release=()=>unlock();
    /** Delay only broad initial comparison; urgent source readers retain their normal methods. */
    const wrapper=async function(...args){entered=true;await held;return inspect.apply(this,args);};
    repository.inspectWithLocalDependencies=wrapper;restoreReader=()=>{if(repository.inspectWithLocalDependencies===wrapper)repository.inspectWithLocalDependencies=inspect;};
    await until(()=>entered&&ready(),'Warm graph did not load ahead of its held audit');
    check(acquisition.inventory&&!acquisition.hasSemanticDependencies(),'Initial audit unexpectedly closed before interaction');
    check(acquisition.canPrepareWarmMaintenance(),'Fresh source headers did not admit warm repair');
    await until(()=>!p.index.getUrlIndexProgress().active,'Independent URL preparation did not settle');
    const field=p.defaultOntologyField('child'),metadata=app.metadataCache.getFileCache(source)?.frontmatter;
    const hadField=!!metadata&&Object.prototype.hasOwnProperty.call(metadata,field),oldField=hadField?structuredClone(metadata[field]):undefined;
    const ghostName='KplexWarmGhost'+Date.now(),ghost=(source.parent?.path&&source.parent.path!=='/'?source.parent.path+'/':'')+ghostName;
    const builds=p.index.getSemanticPreparationDiagnostics().fullBuilds;
    /** Observe real status notifications; no readiness state is substituted. */
    unsubscribe=p.subscribeIndexStatus(()=>{const status=p.getIndexStatus();if(samples.length<40)samples.push({phase:status.phase,label:status.label});});
    c.progress={phase:'editing-with-audit-held'};
    await app.fileManager.processFrontMatter(source,fm=>{fm[field]=['[['+target.path+']]','[['+ghost+']]'];});
    await until(()=>p.index.neighbours(p.index.get(source.path),'child').some(row=>row.page.path===ghost)&&ready(),'Placeholder creation waited for the held audit');
    check(acquisition.inventory,'Urgent edit replaced or completed the audit');
    await app.fileManager.processFrontMatter(source,fm=>{if(hadField)fm[field]=oldField;else delete fm[field];});
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
    unlock();restoreReader();await until(()=>ready()&&!acquisition.inventory,'Audit did not resume and drain');result.auditDrained=true;c.result=result;return result;
  }catch(error){c.scenarioError=String(error);throw error;}
  finally{
    c.progress={phase:'restoration'};unlock?.();restoreReader?.();unsubscribe?.();const issues=[];
    /** Preserve independent restoration even after a functional or cleanup failure. */
    const clean=async(label,action)=>{try{await action();}catch(error){issues.push(label+': '+String(error));}};
    if(disabled)await clean('enable-before-cleanup',async()=>{await app.plugins.enablePlugin('k-plex');disabled=false;});
    p=app.plugins.plugins['k-plex'];
    if(source&&originalText!==undefined)await clean('restore-test-note',async()=>{
      check(app.vault.getFileByPath(source.path)===source,'Test note native identity changed');await app.vault.modify(source,originalText,originalStat);
      check(await app.vault.read(source)===originalText,'Test note bytes were not restored');if(c.result)c.result.sourceBodyRestored=true;
    });
    if(p)await clean('restored-source-backlog',()=>until(()=>ready()&&!p.index.sourceAcquisition.inventory,'Restored note did not settle'));
    await clean('disable-before-config',async()=>{await app.plugins.disablePlugin('k-plex');disabled=true;});
    await clean('restore-data',()=>app.vault.adapter.write(c.configRelative+'/plugins/k-plex/data.json',c.originalData));
    await clean('enable-after-config',async()=>{await app.plugins.enablePlugin('k-plex');disabled=false;});
    await clean('restore-layout',async()=>{await app.workspace.changeLayout(layout);await app.plugins.plugins['k-plex'].settingsWriteQueue;});
    await clean('settled-data-bytes',()=>app.vault.adapter.write(c.configRelative+'/plugins/k-plex/data.json',c.originalData));
    await clean('enabled-bytes',()=>app.vault.adapter.write(c.configRelative+'/community-plugins.json',c.originalEnabled));
    c.progress={phase:'restored',scenarioError:c.scenarioError,cleanupIssues:issues};
    if(issues.length)throw Error((c.scenarioError??'Native cleanup failed')+'; '+issues.join('; '));
  }
}
if(process.env.KPLEX_TEST_VAULT_NAME!=='kplex-test-small')throw Error('Explicit disposable Small required');
const target=validateTarget({vaultName:process.env.KPLEX_TEST_VAULT_NAME,vaultPath:process.env.KPLEX_TEST_VAULT_PATH,configDir:process.env.KPLEX_TEST_CONFIG_DIR});
const reportDir=resolve(process.env.KPLEX_HOST_REPORT_DIR??''),outside=relative(target.vault,reportDir);
if(!process.env.KPLEX_HOST_REPORT_DIR||!outside.startsWith('..')&&!outside.includes(':'))throw Error('Report directory must be outside the disposable vault');
await runControlledProbe('eager-warm-maintenance',scenario,
  'c.vaultPath='+JSON.stringify(target.vault)+';c.backupPath='+JSON.stringify(join(reportDir,'configuration-before.json'))+';c.configRelative='+JSON.stringify(relative(target.vault,target.config).replaceAll('\\','/'))+';c.originalData='+JSON.stringify(readFileSync(join(target.pluginDir,'data.json'),'utf8'))+';c.originalEnabled='+JSON.stringify(readFileSync(join(target.config,'community-plugins.json'),'utf8'))+';',
  ['src/main.ts','src/index/GraphIndex.ts','src/adapters/obsidian/sourceAcquisition.ts'],{maximumMs:360000});
