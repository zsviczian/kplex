/** Run two unchanged vault reloads on the exact candidate staged under the host lock. */
import assert from 'node:assert/strict';
import {mkdirSync, readFileSync, realpathSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {obsidianCliExecutable, spawnNativeSync} from './processTools.mjs';
import {validateTarget} from './runner.mjs';

const {KPLEX_HOST_REPORT_DIR: directory, KPLEX_TEST_VAULT_NAME: vaultName,
  KPLEX_TEST_VAULT_PATH: vaultPath, KPLEX_TEST_CONFIG_DIR: configDir} = process.env;
assert(directory && vaultName === 'kplex-test-small', 'Use the staged disposable Small vault');
const target = validateTarget({vaultName, vaultPath, configDir});
mkdirSync(directory, {recursive: true});
const evidence = [], report = join(directory, 'publish-warm.json');

/** Address only the selected renderer and read its structured reply. */
function evaluate(code) {
  const result = spawnNativeSync(obsidianCliExecutable(), [`vault=${vaultName}`, 'eval', `code=${code}`], {
    encoding: 'utf8', timeout: 30_000, windowsHide: true,
  });
  if (result.error || result.status !== 0 || /^Error:/m.test(result.stdout ?? '')) {
    throw Error(result.error?.message ?? (result.stderr || result.stdout));
  }
  return JSON.parse(result.stdout.slice(result.stdout.indexOf('{')));
}

let owned, previous, error;
try {
  const host = evaluate('JSON.stringify({path:app.vault.adapter.getBasePath(),config:app.vault.configDir,active:app.workspace.activeLeaf?.id})');
  assert.equal(realpathSync(host.path), target.vault);
  assert.equal(realpathSync(join(host.path, host.config)), target.config);
  previous = host.active;
  owned = evaluate("JSON.stringify({id:app.workspace.getLeaf('tab').id})").id;
  const surface = evaluate(`(async()=>{const w=app.workspace,leaf=w.getLeafById(${JSON.stringify(owned)});
    await leaf.setViewState({type:'k-plex-react-view',active:true});await w.revealLeaf(leaf);
    w.setActiveLeaf(leaf,{focus:true});await leaf.view.waitUntilReady();
    w.requestSaveLayout();await w.requestSaveLayout.run();
    return JSON.stringify({active:w.activeLeaf?.id===leaf.id})})()`);
  assert(surface.active, 'The owned Plex must be the active workspace tab');
  for (const [action, label] of [['wait', 'settled'], ['save', 'complete-cache'], ['run', 'warm-first'], ['run', 'warm-second']]) {
    const result = spawnNativeSync(process.execPath, ['./scripts/testing/obsidian/warmRestart.mjs', action], {
      env: {...process.env, KPLEX_RESTART_LABEL: label}, encoding: 'utf8', timeout: 150_000, windowsHide: true,
    });
    const file = join(directory, `${label}.json`);
    if (result.error) throw result.error;
    const observation = JSON.parse(readFileSync(file, 'utf8'));
    const {hydration, source, graph, saved, sourceRepository, startup} = observation.final ?? {};
    evidence.push({action, label, result: observation.status, report: file, hydration, source, graph, saved, sourceRepository,
      work: startup?.sessionWork});
    if (result.status !== 0 || observation.status !== 'passed') throw Error(observation.error ?? result.stderr);
    if (action === 'run') {
      assert(saved?.active && graph?.navigable && graph?.fresh && hydration?.route === 'full-snapshot'
        && startup?.sessionWork?.fullBuildStarts === 0, 'An unchanged reload must activate the saved graph without starting a full build');
    }
  }
} catch (failed) {
  error = String(failed);
} finally {
  if (owned) {
    try {
      const surface = evaluate(`(async()=>{const w=app.workspace,leaf=w.getLeafById(${JSON.stringify(owned)});
        if(leaf?.getViewState().type==='k-plex-react-view'||leaf?.getViewState().type==='empty')leaf.detach();
        const prior=w.getLeafById(${JSON.stringify(previous ?? '')});if(prior){await w.revealLeaf(prior);w.setActiveLeaf(prior,{focus:true})}
        return JSON.stringify({cleaned:true})})()`);
    } catch (failed) {
      error = [error, String(failed)].filter(Boolean).join(' · ');
    }
  }
}
if (error) process.exitCode = 1;
writeFileSync(report, JSON.stringify({status: error ? 'failed' : 'passed', error, evidence}, null, 2) + '\n');
console.log(JSON.stringify({status: error ? 'failed' : 'passed', error, report}));
