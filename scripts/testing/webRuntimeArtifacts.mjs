/** Measure the installable release files for the portable Compass feasibility gate. */
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const installableFiles = ['main.js', 'styles.css', 'manifest.json'];
const installableBudget = 5 * 1024 ** 2;

/** Read the exact built bytes. Fail on a missing or empty artifact or an unrelated manifest. */
export function measureInstallableArtifacts(directory) {
  const files = Object.fromEntries(installableFiles.map(name => {
    const data = readFileSync(join(directory, name));
    if (!data.length) throw Error(`Empty installable artifact: ${name}`);
    if (name === 'manifest.json' && JSON.parse(data.toString('utf8')).id !== 'k-plex') {
      throw Error('Expected a k-plex release manifest');
    }
    return [name, {bytes: data.length, sha256: createHash('sha256').update(data).digest('hex')}];
  }));
  return {files, totalBytes: installableFiles.reduce((total, name) => total + files[name].bytes, 0)};
}

/** Enforce the PR's exclusive total budget and compare the total with the frozen baseline. */
export function reportInstallableArtifacts(directory, baselineDirectory) {
  const artifact = measureInstallableArtifacts(directory);
  const baseline = baselineDirectory ? measureInstallableArtifacts(baselineDirectory) : null;
  const deltaBytes = baseline ? artifact.totalBytes - baseline.totalBytes : null;
  const withinBudget = artifact.totalBytes < installableBudget;
  return {
    artifact,
    baseline,
    deltaBytes,
    budgetExclusiveBytes: installableBudget,
    withinBudget,
    passed: withinBudget && (deltaBytes === null || deltaBytes <= 0),
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [directory = 'dist', baselineDirectory] = process.argv.slice(2);
  const report = reportInstallableArtifacts(directory, baselineDirectory);
  console.log(JSON.stringify(report, null, 2));
  if (!report.passed) process.exitCode = 1;
}
