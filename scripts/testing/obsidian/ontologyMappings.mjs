/**
 * Exact-build reciprocal ontology acceptance in the authorized small disposable vault. Exercises
 * actual Settings controls, canonical source publication, reverse property authorization and reload.
 * Programmatic DOM events validate host wiring, not trusted typing, paint or physical-device input.
 */
import assert from 'node:assert/strict';
import {readFileSync,realpathSync} from 'node:fs';
import {join} from 'node:path';
import {validateTarget} from './runner.mjs';
import {runControlledProbe} from './controlledProbe.mjs';
import {spawnNativeSync,obsidianCliExecutable} from './processTools.mjs';

assert.equal(process.env.KPLEX_TEST_VAULT_NAME,'kplex-test-small','Use the authorized disposable small vault');
const target=validateTarget({vaultName:process.env.KPLEX_TEST_VAULT_NAME,vaultPath:process.env.KPLEX_TEST_VAULT_PATH,configDir:process.env.KPLEX_TEST_CONFIG_DIR});
/** Confirm native identity before even reading the disposable configuration backups. */
const identity=spawnNativeSync(obsidianCliExecutable(),['vault=kplex-test-small','vault','info=path'],{encoding:'utf8',timeout:15000,killSignal:'SIGKILL',maxBuffer:1024*1024});
assert(!identity.error&&identity.status===0&&!/^Error:/m.test(identity.stdout??''),'Selected-vault identity preflight failed');
assert.equal(realpathSync(identity.stdout.trim().replace(/^path\s+/,'')),realpathSync(target.vault),'CLI selected a different vault');
const configuration=['plugins/k-plex/data.json','community-plugins.json','workspace.json'].map(/** Capture only explicit disposable configuration files for byte-exact restoration. */ name=>({path:join(target.config,name),bytes:readFileSync(join(target.config,name))}));
const token='ontology-pair-'+process.pid+'-'+Date.now();
const definitions=`c.token=${JSON.stringify(token)};c.restoreConfiguration=()=>{const fs=require('node:fs');for(const item of ${JSON.stringify(configuration.map(/** Keep restore payloads inside local transport, never the report. */ item=>({path:item.path,text:item.bytes.toString('utf8')})))})fs.writeFileSync(item.path,item.text);};`;

/** Exercise finite owned notes and native saved controls; every exit restores preferences/workspace. */
async function scenario(app,c){
  let p=app.plugins.plugins['k-plex'];const originalSettings=structuredClone(p.settings),originalLayout=app.workspace.getLayout();
  const originalFiles=app.vault.getFiles().map(/** Compare exact fixture inventory without copying note contents. */ file=>file.path).sort();
  const folder=c.token,a=folder+'/Target.md',b=folder+'/Source.md';let folderCreated=false;
  const created=[],releases=[],cases=[];
  /** Poll current host state without changing production scheduling or masking failures. */
  const wait=ms=>new Promise(/** Yield through this native document's timer without changing throttling. */ resolve=>window.setTimeout(resolve,ms));
  /** Keep every prerequisite bounded, including independent cleanup after cancellation. */
  const until=async(predicate,message,maximumMs=60000)=>{const end=Date.now()+maximumMs;while(!predicate()){if(c.closed&&c.phase!=='cleanup'||Date.now()>end)throw Error(message);await wait(30);}};
  /** Read the actual directed ontology view while retaining physical evidence identities. */
  const evidence=(from,to,kind='frontmatter-ontology')=>p.index.evidenceBetween(from,to).filter(/** Isolate actual physical declarations from generic cache mirrors. */ item=>item.sourceKind===kind);
  /** Prepare canonical exact-pair scope rather than treating a green indicator as mutation authority. */
  const pair=async()=>{await until(()=>!!p.index.get(a)&&!!p.index.get(b),'Fixture pages missing');const end=Date.now()+60000;while(!(await p.index.prepareRelationshipPair(a,b))){assertLocal(!c.closed&&Date.now()<end,'Pair preparation failed');await wait(30);}};
  /** Fail before recording any scenario as passed. */
  const assertLocal=(condition,message)=>{if(!condition)throw Error(message);};
  /** Record only named outcomes, never note payloads or arbitrary source identities. */
  const passed=name=>{cases.push(name);c.progress={phase:c.phase,passed:cases.length};};
  try{
    c.phase='prerequisite';
    await until(()=>p.getIndexStatus().upToDate&&!p.index.sourceAcquisition.inventory&&!p.index.building,'Startup not ready');
    const w=require('@electron/remote').getCurrentWindow();w.restore();w.show();w.focus();w.webContents.focus();
    await app.vault.createFolder(folder);folderCreated=true;
    for(const [path,text]of [[a,''],[b,`---\nKplex replies to: "[[${a}]]"\nKeep: original\n---\n\nUnrelated prose.\n`]]){await app.vault.create(path,text);created.push(path);}
    releases.push(p.index.acquireSemanticDemand(a),p.index.acquireSemanticDemand(b));
    await pair();
    c.phase='actual-settings';
    p.openSettings();await wait(100);assertLocal(p.settingsTab.openSettingsPage(p.translator('settings.ui.ontology')),'Ontology page missing');await wait(100);
    assertLocal(p.settingsTab.openSettingsPage(p.translator('settings.ui.relationship.fields')),'Relationship fields page missing');await wait(100);
    const doc=p.settingsTab.containerEl.ownerDocument;
    const row=[...doc.querySelectorAll('.setting-item')].find(/** Match the localized actual control after native subpage replacement. */ item=>item.querySelector('.setting-item-name')?.textContent.trim()===p.translator('settings.ui.previous.fields'));
    const input=row?.querySelector('textarea');assertLocal(input,'Native Previous fields textarea missing');
    input.value=[...p.settings.hierarchy.previous,'Kplex replies to/Kplex replied by'].join(', ');
    input.dispatchEvent(new input.ownerDocument.defaultView.Event('input',{bubbles:true}));
    await until(()=>p.settings.hierarchy.previous.includes('Kplex replies to/Kplex replied by'),'Native control did not save pair');
    await p.settingsWriteQueue;await p.index.refreshSemanticSettings();app.setting.close();await pair();
    const forward=evidence(b,a),reverse=evidence(a,b);
    assertLocal(forward.some(/** Assert the source-facing configured role and label together. */ item=>item.role==='previous'&&item.definition==='kplex-replies-to'),'Forward role/label differs');
    assertLocal(reverse.some(/** Reciprocal presentation must retain the physical declaring field. */ item=>item.role==='next'&&item.definition==='kplex-replied-by'&&item.fieldName==='Kplex replies to'),'Reverse label or physical field differs');
    passed('native Settings control saves reciprocal role and label');
    const physical=reverse.find(/** Select the reciprocal ontology declaration for native edit authorization. */ item=>item.definition==='kplex-replied-by');
    const expectation=p.captureFrontmatterUnlinkExpectation(physical);
    assertLocal(expectation?.storage.path===b&&expectation.fieldKey==='Kplex replies to','Reverse source identity points to synthetic property');
    assertLocal((await p.relationshipEvidenceLocations(physical)).some(/** Source navigation must still point to the physical declaring note. */ item=>item.path===b),'Reverse source location missing');
    passed('reverse source lookup and unlink expectation preserve declaring property');
    c.phase='ordinary-edit';
    await app.fileManager.processFrontMatter(app.vault.getFileByPath(b),/** Exercise a real semantic edit with repeated targets and unrelated metadata. */ fm=>{fm['Kplex replies to']=[`[[${a}]]`,`[[${a}]]`];fm.Keep='changed';});
    await until(()=>app.metadataCache.getFileCache(app.vault.getFileByPath(b))?.frontmatter?.Keep==='changed','Native metadata edit pending');
    await p.index.refreshSemanticSettings();await pair();
    assertLocal(evidence(a,b).some(/** Per-file publication must preserve both reciprocal display and declaration identity. */ item=>item.definition==='kplex-replied-by'&&item.fieldName==='Kplex replies to'),'Exact pair after ordinary edit dropped reverse metadata');
    passed('ordinary native edit and exact-pair refresh preserve reciprocal publication');
    c.phase='plugin-reload';
    for(const release of releases.splice(0))release();
    await p.settingsWriteQueue;await app.plugins.disablePlugin('k-plex');await app.plugins.enablePlugin('k-plex');
    p=app.plugins.plugins['k-plex'];assertLocal(p,'Plugin did not reload');
    releases.push(p.index.acquireSemanticDemand(a),p.index.acquireSemanticDemand(b));
    await p.index.refreshSemanticSettings();await pair();
    assertLocal(p.settings.hierarchy.previous.includes('Kplex replies to/Kplex replied by'),'Pair did not persist');
    assertLocal(evidence(a,b).some(/** Cached source replay must reconstruct the same reciprocal label after reload. */ item=>item.definition==='kplex-replied-by'),'Warm reload dropped inverse label');
    passed('warm plugin reload retains pair and reciprocal labels');
    c.phase='reverse-unlink';
    const item=evidence(a,b).find(/** Reacquire current evidence before exact-source removal. */ item=>item.definition==='kplex-replied-by'),approved=p.captureFrontmatterUnlinkExpectation(item);
    assertLocal(approved&&await p.unlinkFrontmatterEvidence(item,approved),'Reverse exact-source unlink failed');
    await until(()=>!app.metadataCache.getFileCache(app.vault.getFileByPath(b))?.frontmatter?.['Kplex replies to'],'Unlink metadata pending');
    const text=await app.vault.read(app.vault.getFileByPath(b));
    assertLocal(text.includes('Keep: changed')&&text.includes('Unrelated prose.')&&!text.includes(`[[${a}]]`),'Unlink altered unrelated content or missed duplicate target');
    passed('reverse exact-source unlink removes duplicate target and preserves other content');
    return {cases,indexingMode:p.settings.indexingMode};
  }finally{
    c.phase='cleanup';if(app.setting.isOpen)app.setting.close();
    for(const release of releases.splice(0))release();p=app.plugins.plugins['k-plex'];
    if(p){p.settings=structuredClone(originalSettings);await p.saveSettings(false,false);}
    for(const path of created.slice().reverse()){const file=app.vault.getFileByPath(path);if(file)await app.vault.delete(file,true);}
    if(folderCreated){const owned=app.vault.getFolderByPath(folder);if(owned){assertLocal(owned.children.length===0,'Owned folder contains unowned files');await app.vault.delete(owned,true);}}
    await app.workspace.changeLayout(originalLayout);
    if(p){await p.settingsWriteQueue;await p.actionPreferenceQueue;await until(()=>!p.index.sourceAcquisition.inventory&&p.index.sourceAcquisition.knownImpactTasks===0,'Cleanup source work pending',15000);await p.index.sourceAcquisition.repository.flush();}
    assertLocal(JSON.stringify(app.vault.getFiles().map(/** Compare exact fixture inventory without copying note contents. */ file=>file.path).sort())===JSON.stringify(originalFiles),'Fixture inventory did not restore');
    c.restoreConfiguration();
  }
}
// Only the scenario's settled cleanup may restore bytes; never race a still-running native writer
// from an outer fallback. The shared transport reports incomplete/failed cleanup as a failure.
await runControlledProbe('ontology-mappings',scenario,definitions,['src/core/contracts/fieldName.ts','src/core/graph/sourcePolicy.ts','src/core/graph/evidence.ts','src/core/graph/settingsPolicy.ts','src/main.ts'],{maximumMs:180000});
