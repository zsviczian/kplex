/** Serial exact-build staging for the portable Compass regression and measurement lanes. */
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, realpathSync, writeFileSync} from 'node:fs';
import {homedir} from 'node:os';
import {join, relative, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseArgs} from 'node:util';
import {measureInstallableArtifacts} from '../webRuntimeArtifacts.mjs';
import {createValidationRun} from '../../validationArtifacts.mjs';
import {acquireHostLock} from './hostLock.mjs';
import {obsidianCliExecutable, runLocalBuild, spawnNativeSync} from './processTools.mjs';
import {validateTarget} from './runner.mjs';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const dist = join(root, 'dist');
const lanes = {
  compass: {script: 'authoringCompass278', env: {KPLEX_278_NATIVE_LANE: 'compass'}, exported: 'runAuthoringCompass278'},
  mindmap: {script: 'mindMap', env: {KPLEX_MINDMAP_LANE: 'navigation', KPLEX_NATIVE_MAIN_VIEWPORT: 'true'}},
  'mindmap-editor': {script: 'mindMap', env: {KPLEX_MINDMAP_LANE: 'center-navigation', KPLEX_NATIVE_MAIN_VIEWPORT: 'true'}},
  facets: {script: 'wuxing', env: {KPLEX_WUXING_NATIVE_LANE: 'node-presentation'}},
  'occurrence-editors': {script: 'occurrenceEditors', env: {}},
  'editor-mobile-navigation': {script: 'editorMobileNavigation', env: {}},
  'canvas-image': {script: 'canvasImageExport', env: {}},
  'public-api': {script: 'publicApi', env: {}},
  'stable-gates': {script: 'stableGateCounts', env: {}},
  'label-sharpness': {script: 'labelSharpness', env: {}},
  performance: {script: 'webRuntimePerformance', env: {}},
};
const {values, positionals} = parseArgs({
  options: {artifacts:{type:'string'},reference:{type:'string'},built:{type:'boolean'},mode:{type:'string'},'warm-scale':{type:'boolean'},'warm-only':{type:'boolean'}},
  allowPositionals: true,
});
const selected = positionals.length ? positionals : ['compass','mindmap','facets'];
assert(selected.every(name => Object.hasOwn(lanes, name)), `Select from ${Object.keys(lanes).join(', ')}`);
assert.equal(Boolean(values.artifacts), Boolean(values.reference), 'Provide both --artifacts and --reference for a frozen baseline');
assert(!(values.built && values.artifacts), 'Use either the existing local build or a frozen baseline');
if (values.reference) assert.match(values.reference, /^[a-f0-9]{40}$/, 'Use the exact baseline SHA');
if (values.mode) assert(['eager','on-demand'].includes(values.mode) && selected.every(name => name === 'performance'), 'Choose an indexing mode for the performance lane');

const {KPLEX_TEST_VAULT_NAME: vaultName, KPLEX_TEST_VAULT_PATH: vaultPath, KPLEX_TEST_CONFIG_DIR: configDir} = process.env;
assert(vaultName === 'kplex-test-small' || vaultName === 'kplex-test' && selected.every(name => name === 'performance'),
  'Select the prepared Small vault or the scale vault for performance only');
assert(!values['warm-scale'] || vaultName === 'kplex-test', 'Scale warm-up requires the prepared scale vault');
assert(!values['warm-only']||values['warm-scale'],'Use --warm-only with --warm-scale');
const target = validateTarget({vaultName, vaultPath, configDir});
const userData = process.env.KPLEX_OBSIDIAN_USER_DATA ?? (process.platform === 'win32' ? join(process.env.APPDATA, 'obsidian')
  : process.platform === 'darwin' ? join(homedir(), 'Library', 'Application Support', 'obsidian')
    : join(process.env.XDG_CONFIG_HOME ?? join(homedir(), '.config'), 'obsidian'));

/** Send a bounded invocation only to the explicit disposable host. */
function cli(command, ...args) {
  const result = spawnNativeSync(obsidianCliExecutable(), [`vault=${vaultName}`, command, ...args], {
    cwd: root, encoding: 'utf8', timeout: 20_000, killSignal: 'SIGKILL', windowsHide: true,
  });
  if (result.error || result.status !== 0 || /^Error:/m.test(result.stdout ?? '')) {
    throw Error(result.error?.message ?? (result.stderr || result.stdout));
  }
  return result.stdout.trim();
}

/** Decode one structured response from the selected native renderer. */
function evaluate(code) {
  const result=cli('eval',`code=${code}`);
  return JSON.parse(result.slice(result.indexOf('{')));
}

/** Recheck runtime vault and config identity before each staging or restoration. */
function hostState() {
  const state=evaluate('JSON.stringify({base:app.vault.adapter.getBasePath(),config:app.vault.configDir,loaded:!!app.plugins.plugins["k-plex"],settingsOpen:app.setting.isOpen})');
  assert.equal(relative(target.vault, realpathSync(state.base)), '');
  assert.equal(relative(target.config, realpathSync(join(state.base, state.config))), '');
  return state;
}

/** Let the existing production source and URL owners reach steady state without timed input. */
async function warmScaleIndex(directory) {
  const nonce=JSON.stringify(randomUUID());
  const evidence=[];
  const save=()=>writeFileSync(join(directory,'scale-warmup.json'),JSON.stringify(evidence,null,2));
  const started=evaluate(`(()=>{
    if(window.__kplexWebScaleWarmup)throw Error('Existing scale warm-up');
    const c=window.__kplexWebScaleWarmup={id:${nonce},closed:false};
    c.task=(async()=>{
      const p=app.plugins.plugins['k-plex'];if(!await p.whenInitialized())throw Error('K-Plex scale initialization failed');
      if(c.closed)return;
      const native=require('@electron/remote').getCurrentWindow();
      c.previous=app.workspace.getMostRecentLeaf();c.native=native;c.bounds=native.getBounds();c.wasMaximized=native.isMaximized();
      native.show();native.focus();native.webContents.focus();
      c.leaf=app.workspace.getLeaf('tab');await c.leaf.setViewState({type:'k-plex-react-view',active:true});
      if(c.closed)return;
      await app.workspace.revealLeaf(c.leaf);await c.leaf.view.waitUntilReady();
      if(c.closed)return;
      app.workspace.setActiveLeaf(c.leaf,{focus:true});c.ready=true;
    })().catch(error=>{c.error=String(error);});
    return JSON.stringify({started:true});
  })()`);
  assert(started.started);
  try {
    const deadline=Date.now()+35*60_000;
    let lastLog=0;
    while(Date.now()<deadline) {
      const state=evaluate(`(()=>{
        const c=window.__kplexWebScaleWarmup,p=app.plugins.plugins['k-plex'];
        if(c?.id!==${nonce}||!p)throw Error('Scale warm-up ownership changed');
        const urls=p.index.getUrlIndexProgress(),source=p.index.sourceAcquisition.getActivityState();
        const pass=p.index.sourceAcquisition.getRecoveryDiagnostics().pass;
        const recovery=pass&&{visited:pass.visited,total:pass.total,phase:pass.phase,outcome:pass.outcome};
        return JSON.stringify({ready:c.ready,error:c.error,urls,source,recovery,status:p.getStartupDiagnostics().status,focused:document.hasFocus()});
      })()`);
      if(state.error||state.urls.failed)throw Error(state.error??'Scale URL index reported failure');
      const done=state.ready&&state.focused&&state.urls.complete&&!state.urls.active&&!state.source.sourceActive;
      if(done||Date.now()-lastLog>=60_000){
        lastLog=Date.now();evidence.push({at:new Date().toISOString(),...state});save();
        const progress=state.recovery?`, source recovery ${state.recovery.visited}/${state.recovery.total}`:'';
        console.log(`Scale warm-up ${state.urls.processed}/${state.urls.total} URL inputs, graph ${state.status.phase}${progress}`);
      }
      if(done)return;
      await new Promise(resolve=>setTimeout(resolve,5000));
    }
    throw Error('Scale warm-up reached its deadline');
  } finally {
    const cleaned=evaluate(`(async()=>{
      const c=window.__kplexWebScaleWarmup;if(c?.id!==${nonce})throw Error('Scale warm-up cleanup lost ownership');
      c.closed=true;await c.task;
      try{c.leaf?.detach();if(c.previous?.containerEl.isConnected)await app.workspace.revealLeaf(c.previous);
        if(c.native&&c.bounds){c.native.setBounds(c.bounds);if(c.wasMaximized)c.native.maximize();}}
      finally{delete window.__kplexWebScaleWarmup;}
      return JSON.stringify({clean:true});
    })()`);
    assert(cleaned.clean,'Scale warm-up cleanup failed');
  }
}

/** Pass the parent-owned lock through composition instead of invoking a second lock owner. */
function runLane(name, directory, frozen) {
  const {script, env, exported} = lanes[name];
  const entry = `./scripts/testing/obsidian/${script}.mjs`;
  const args = exported ? ['--input-type=module', '-e', `import {${exported}} from ${JSON.stringify(entry)}; await ${exported}();`] : [entry];
  const environment = {...process.env, ...env, KPLEX_HOST_REPORT_DIR: directory};
  if (values.mode) environment.KPLEX_WEB_BENCH_MODE = values.mode;
  if (values.artifacts) {
    environment.KPLEX_PROBE_ARTIFACT_DIR = frozen;
    environment.KPLEX_PROBE_BASELINE_REF = values.reference;
  } else {
    delete environment.KPLEX_PROBE_ARTIFACT_DIR;
    delete environment.KPLEX_PROBE_BASELINE_REF;
  }
  const result = spawnNativeSync(process.execPath, args, {
    cwd: root, encoding: 'utf8', timeout: 540_000, killSignal: 'SIGKILL', windowsHide: true,
    env: environment,
  });
  if (result.error) throw result.error;
  if (!result.stdout?.trim()) throw Error(`${name}: ${result.stderr || 'Missing native report'}`);
  const report = JSON.parse(result.stdout.trim().split('\n').at(-1));
  console.log(JSON.stringify({lane: name, status: report.status, error: report.error, report: report.report}));
  if (report.report && existsSync(report.report)) {
    const evidence = JSON.parse(readFileSync(report.report, 'utf8'));
    if (evidence.cleanupError) throw Error(`${name} cleanup failed: ${evidence.cleanupError}`);
  }
  return result.status === 0 && report.status === 'passed';
}

/** Permit Obsidian's deferred enablement write before verifying the backed-up bytes. */
function waitForEnablement() {
  return new Promise(resolve => setTimeout(resolve, 700));
}

/** Serialize with other repository test jobs without interrupting the current native owner. */
async function waitForHostLock() {
  const deadline = Date.now() + 180_000;
  let reported;
  for (;;) {
    try { return acquireHostLock({userDataPath: userData}); }
    catch (error) {
      if (!/^Native host is controlled by PID \d+$/.test(error.message) || Date.now() >= deadline) throw error;
      if (reported !== error.message) { reported = error.message;console.log(`${reported}. Waiting for its cleanup.`); }
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
}

const run = createValidationRun('pr-334-native');
console.log(`Managed evidence ${run.directory}`);
let lock;
try {
  if (!values.artifacts && !values.built) runLocalBuild(root);
  const source = values.artifacts ? resolve(values.artifacts) : dist;
  const artifact = measureInstallableArtifacts(source);
  const names = Object.keys(artifact.files);
  const frozen = join(run.directory, 'artifact');
  mkdirSync(frozen);
  for (const name of names) copyFileSync(join(source, name), join(frozen, name));
  assert.deepEqual(measureInstallableArtifacts(frozen), artifact);
  writeFileSync(join(run.directory, 'artifacts.json'), JSON.stringify({artifact, reference: values.reference, node: process.version}, null, 2));
  lock = await waitForHostLock();
  const before = hostState();
  assert(!before.settingsOpen, 'Close Settings in the disposable vault before native scenarios');
  assert(before.loaded, 'Expected the prepared disposable vault to have K-Plex enabled');
  const inventory = readdirSync(target.vault).sort();
  const configs = [join(target.pluginDir, 'data.json'), join(target.config, 'community-plugins.json'), join(target.config, 'workspace.json')];
  const backups = new Map([...names.map(name => join(target.pluginDir, name)), ...configs].map(path => [path, readFileSync(path)]));
  const backupDirectory = join(run.directory, 'restoration-input');
  mkdirSync(backupDirectory);
  for (const [path, bytes] of backups) writeFileSync(join(backupDirectory, relative(target.config, path).replaceAll('\\', '/').replaceAll('/', '.')), bytes);
  try {
    cli('plugin:disable', 'id=k-plex');
    for (const name of names) copyFileSync(join(frozen, name), join(target.pluginDir, name));
    assert.deepEqual(measureInstallableArtifacts(target.pluginDir), artifact);
    if (values.mode) {
      const settings = JSON.parse(backups.get(configs[0]).toString('utf8'));
      writeFileSync(configs[0], JSON.stringify({...settings, indexingModeDesktop:values.mode, indexBeforeViewDesktop:true}));
    }
    cli('plugin:enable', 'id=k-plex');
    await waitForEnablement();
    writeFileSync(configs[1], backups.get(configs[1]));
    if(values['warm-scale'])await warmScaleIndex(run.directory);
    for (const name of values['warm-only']?[]:selected) {
      if (!values.artifacts) assert.deepEqual(measureInstallableArtifacts(dist), artifact);
      if (!runLane(name, join(run.directory, name), frozen)) process.exitCode = 1;
      assert.deepEqual(measureInstallableArtifacts(target.pluginDir), artifact);
    }
  } finally {
    try {
      if (hostState().loaded) cli('plugin:disable', 'id=k-plex');
      for (const [path, bytes] of backups) writeFileSync(path, bytes);
      cli('plugin:enable', 'id=k-plex');
      await waitForEnablement();
      for (const path of configs) writeFileSync(path, backups.get(path));
      for (const [path, bytes] of backups) assert(readFileSync(path).equals(bytes), `Restoration failed: ${path}`);
      assert(hostState().loaded);
      assert.deepEqual(readdirSync(target.vault).sort(), inventory);
      writeFileSync(join(run.directory, 'restoration.json'), JSON.stringify({passed: true}, null, 2));
    } catch (error) {
      writeFileSync(join(run.directory, 'restoration.json'), JSON.stringify({passed: false, error: String(error), backupDirectory}, null, 2));
      throw error;
    }
  }
} finally {
  try { lock?.release(); } finally { run.complete(); }
}
