/** Exact-build native persistence for paired ordinary YAML fields. Reloads the plugin, never the
 * application; owns only a timestamped Small-vault subtree and restores native/configuration state.
 * No timing comparison, source-scheduler replacement or production-vault access is performed. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {Script} from 'node:vm';
import {obsidianCliExecutable,spawnNativeSync} from './processTools.mjs';
import {validateTarget} from './runner.mjs';

const root=resolve(fileURLToPath(new URL('../../..',import.meta.url))),vault=process.env.KPLEX_TEST_VAULT_NAME;
assert.equal(vault,'kplex-test-small');
const target=validateTarget({vaultName:vault,vaultPath:process.env.KPLEX_TEST_VAULT_PATH,configDir:process.env.KPLEX_TEST_CONFIG_DIR});
const output=process.env.KPLEX_HOST_REPORT_DIR;assert(output&&!existsSync(output),'Select a fresh private evidence directory');mkdirSync(output,{recursive:true});
const report={status:'failed',node:process.version,startedAt:new Date().toISOString(),driverSha256:createHash('sha256').update(readFileSync(fileURLToPath(import.meta.url))).digest('hex'),artifacts:{},limitations:['Plugin reload only; no whole-application restart, macOS, physical mobile or actual-paint acceptance.']};
const configuration=['plugins/k-plex/data.json','community-plugins.json','workspace.json'].map(name=>({path:join(target.config,name),bytes:readFileSync(join(target.config,name))}));
const folder='Kplex-Pair-Reload-190-'+Date.now(),forward='Kplex190 reload replies to',reverse='Kplex190 reload replied by';
let started=false,baseline;
/** Shared native transport retains explicit vault identity and a finite independent process deadline. */
const cli=(command,...args)=>{const result=spawnNativeSync(obsidianCliExecutable(),[`vault=${vault}`,command,...args],{encoding:'utf8',timeout:30000,killSignal:'SIGKILL',maxBuffer:4*1024*1024});if(result.error||result.status!==0||/^Error:/m.test(result.stdout))throw result.error??Error(result.stderr||result.stdout);return result.stdout.trim();};
/** Detached JSON inspection never depends on expanding live console objects. */
const evaluate=code=>{new Script(code);return JSON.parse(cli('eval','code='+code).replace(/^=>\s*/,''));};
/** Bound startup polling without altering the native scheduler. */
const until=async(read,message)=>{const end=Date.now()+90000;while(!read()){assert(Date.now()<end,message);await new Promise(resolve=>setTimeout(resolve,250));}};
try{
 assert.equal(resolve(cli('vault','info=path')),target.vault);report.obsidian=cli('version');
 for(const name of ['main.js','manifest.json','styles.css']){const hash=path=>createHash('sha256').update(readFileSync(path)).digest('hex');report.artifacts[name]=hash(join(root,'dist',name));assert.equal(hash(join(target.pluginDir,name)),report.artifacts[name]);}
 baseline=evaluate(`(()=>{if(window.kplexIndexingProbe||window.kplexOntologyReload190||app.setting.isOpen)throw Error('Clean native test ownership required');return JSON.stringify({layout:app.workspace.getLayout(),files:app.vault.getFiles().map(file=>file.path).sort()})})()`);
 const setupCode=String.raw`(async()=>{
  const p=app.plugins.plugins['k-plex'];if(!p||app.vault.getFiles().length>=1000)throw Error('Loaded Small plugin required');
  await p.settingsWriteQueue;await p.settingsReconciliation.prepare(false);
  const c=window.kplexOntologyReload190={settings:structuredClone(p.settings),files:[],folder:${JSON.stringify(folder)},layout:${JSON.stringify(baseline.layout)}};
  const forward=${JSON.stringify(forward)},reverse=${JSON.stringify(reverse)};if(p.ontologyRoleForField(forward)||p.ontologyRoleForField(reverse))throw Error('Fixture field collision');
  Object.assign(p.settings,{documentSyncMode:'off',sidecarOpen:false,followActiveFile:false,autoOpenCentralDocument:false,embedCentralNode:false,showPageNodes:true,showInferredNodes:true,showFolderNodes:false,showTagNodes:false,renderSiblings:false,graphLenses:[],applyPowerFilter:false,animationSpeed:0});p.settings.baseLinkStyle={...p.settings.baseLinkStyle,showLabel:true};await p.saveSettings(false);
  await p.updateOntologyField('previous',[...p.settings.hierarchy.previous,forward],[...p.settings.hierarchy.previous],p.receivedSettingsOwner('hierarchy'));
  await p.updateOntologyField('next',[...p.settings.hierarchy.next,reverse],[...p.settings.hierarchy.next],p.receivedSettingsOwner('hierarchy'));
  c.createdFolder=await app.vault.createFolder(c.folder);
  for(const name of ['A','B']){const file=await app.vault.create(c.folder+'/'+name+'.md',name==='B'?'---\n'+forward+': "[['+c.folder+'/A]]"\n---\n':'An owned reload target.\n');c.files.push(file);p.index.insertCreatedFile(file);}
  const leaf=app.workspace.getLeaf('tab');c.leafId=leaf.id;await leaf.setViewState({type:'k-plex-react-view',active:true});await leaf.view.waitUntilReady();p.notifyNavigation(c.folder+'/A.md',leaf);return JSON.stringify({created:true});
 })()`;new Script(setupCode);started=true;const setup=evaluate(setupCode);assert(setup.created);
 await until(()=>evaluate(`JSON.stringify(Boolean(app.plugins.plugins['k-plex'].index.explainRelationship(${JSON.stringify(folder+'/A.md')},${JSON.stringify(folder+'/B.md')})?.decisions.some(item=>item.active&&item.evidence.fieldName===${JSON.stringify(forward)})))`),'Ordinary YAML declaration did not publish');
 const paired=evaluate(`(async()=>{const p=app.plugins.plugins['k-plex'],signature=p.index.semanticCoverageSignature();await p.updateOntologyField('previous',p.settings.hierarchy.previous.map(field=>field===${JSON.stringify(forward)}?field+'/'+${JSON.stringify(reverse)}:field),[...p.settings.hierarchy.previous],p.receivedSettingsOwner('hierarchy'));await p.settingsWriteQueue;return JSON.stringify({signatureStable:signature===p.index.semanticCoverageSignature(),paired:p.inverseOntologyField(${JSON.stringify(forward)},'previous')===${JSON.stringify(reverse)}})})()`);assert(paired.signatureStable&&paired.paired);report.beforeReload=paired;
 const descriptions=evaluate(`(async()=>{const p=app.plugins.plugins['k-plex'],revision=p.index.getSemanticRevision(),hierarchy=p.receivedSettingsOwner('hierarchy'),wording=p.receivedSettingsOwner('ontologyDescriptions');await p.editOntologyConfiguration({kind:'assign',field:${JSON.stringify(forward)},role:'previous',partner:${JSON.stringify(reverse)},description:'Forward meaning retained after reload.',partnerDescription:'Independent inverse meaning retained after reload.'},structuredClone({hierarchy:p.settings.hierarchy,ontologyPairingVersion:p.settings.ontologyPairingVersion,ontologyDescriptions:p.settings.ontologyDescriptions}),()=>hierarchy()&&wording());return JSON.stringify({semanticStable:revision===p.index.getSemanticRevision(),forward:p.settings.ontologyDescriptions[${JSON.stringify(forward)}],reverse:p.settings.ontologyDescriptions[${JSON.stringify(reverse)}]})})()`);
 assert(descriptions.semanticStable);assert.equal(descriptions.forward,'Forward meaning retained after reload.');assert.equal(descriptions.reverse,'Independent inverse meaning retained after reload.');report.descriptionsBeforeReload=descriptions;
 cli('plugin:disable','id=k-plex');cli('plugin:enable','id=k-plex');
 await until(()=>evaluate('JSON.stringify(!!app.plugins.plugins["k-plex"]?.actionManager)'),'Plugin did not reload');
 // Native plugin unload deliberately detaches its views. Reopen through the actual host lifecycle;
 // this verifies durable pair recovery, not automatic resurrection of an unloaded leaf.
 const reopened=evaluate(`(async()=>{const p=app.plugins.plugins['k-plex'],c=window.kplexOntologyReload190,leaf=app.workspace.getLeaf('tab');c.leafId=leaf.id;await leaf.setViewState({type:'k-plex-react-view',active:true});await leaf.view.waitUntilReady();p.notifyNavigation(c.folder+'/A.md',leaf);return JSON.stringify({reopened:true})})()`);assert(reopened.reopened);report.reopenedAfterEnable=true;
 await until(()=>evaluate(`(()=>{const p=app.plugins.plugins['k-plex'],leaf=app.workspace.getLeavesOfType('k-plex-react-view').find(item=>item.id===window.kplexOntologyReload190.leafId);return JSON.stringify(p.settings.ontologyPairingVersion===1&&p.inverseOntologyField(${JSON.stringify(forward)},'previous')===${JSON.stringify(reverse)}&&!!leaf?.view.contentEl.querySelector('.kplex-role-center[data-kplex-path='+JSON.stringify(${JSON.stringify(folder+'/A.md')})+']')&&[...leaf.view.contentEl.querySelectorAll('.kplex-edge-label')].some(label=>label.textContent===${JSON.stringify(reverse)}))})()`),'Reopened view did not recover persisted paired caption');
 const evidence=evaluate(`(()=>{const p=app.plugins.plugins['k-plex'],e=p.index.explainRelationship(${JSON.stringify(folder+'/A.md')},${JSON.stringify(folder+'/B.md')});return JSON.stringify({physical:e.decisions.some(item=>item.active&&item.evidence.fieldName===${JSON.stringify(forward)}&&item.evidence.declaredByPath===${JSON.stringify(folder+'/B.md')}),raw:p.settings.hierarchy.previous.includes(${JSON.stringify(forward+'/'+reverse)}),forwardDescription:p.settings.ontologyDescriptions[${JSON.stringify(forward)}],reverseDescription:p.settings.ontologyDescriptions[${JSON.stringify(reverse)}]})})()`);assert(evidence.physical&&evidence.raw);assert.equal(evidence.forwardDescription,descriptions.forward);assert.equal(evidence.reverseDescription,descriptions.reverse);report.afterReload=evidence;report.status='passed';
}catch(error){report.error=String(error);process.exitCode=1;}finally{
 try{
  if(started){
   if(!evaluate('JSON.stringify(!!app.plugins.plugins["k-plex"])')){cli('plugin:enable','id=k-plex');await until(()=>evaluate('JSON.stringify(!!app.plugins.plugins["k-plex"]?.actionManager)'),'Cleanup plugin readiness');}
   const cleaned=evaluate(`(async()=>{const c=window.kplexOntologyReload190,p=app.plugins.plugins['k-plex'];if(!c)throw Error('Missing cleanup ownership');await p.settingsWriteQueue;for(const file of c.files)if(app.vault.getFileByPath(file.path)===file)await app.vault.delete(file);if(c.createdFolder&&app.vault.getFolderByPath(c.folder)===c.createdFolder&&!c.createdFolder.children.length)await app.vault.delete(c.createdFolder,true);p.settings=c.settings;await p.saveSettings(false,false);await app.workspace.changeLayout(c.layout);await p.settingsWriteQueue;delete window.kplexOntologyReload190;return JSON.stringify({clean:true})})()`);assert(cleaned.clean);started=false;
  }
  if(baseline){const files=evaluate('JSON.stringify(app.vault.getFiles().map(file=>file.path).sort())');assert.deepEqual(files,baseline.files);}
  for(const item of configuration){writeFileSync(item.path,item.bytes);assert(readFileSync(item.path).equals(item.bytes));}report.cleanup='passed';
 }catch(error){report.status='failed';report.cleanupError=String(error);process.exitCode=1;}
 report.completedAt=new Date().toISOString();writeFileSync(join(output,'ontology-pair-reload-190.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,error:report.error,cleanupError:report.cleanupError,report:join(output,'ontology-pair-reload-190.json')}));
}
