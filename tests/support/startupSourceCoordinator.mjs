/**
 * Extract the unmodified production startup coordinator for real-IDB tests without importing
 * the native plugin UI shell. Field/method text comes directly from TypeScript's AST; host
 * surfaces outside this coordinator remain explicit fixture capabilities. This is test-only.
 */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';

const require = createRequire(import.meta.url), ts = require('typescript');

/** Return actual production members, with no handwritten alternate adoption/retry algorithm. */
export function startupSourceCoordinatorSource() {
  const source = readFileSync(new URL('../../src/main.ts', import.meta.url), 'utf8');
  const module = ts.createSourceFile('main.ts', source, ts.ScriptTarget.Latest, true);
  const declaration = module.statements.find(/** Select the plugin class, not nested declarations. */ node => ts.isClassDeclaration(node) && node.name?.text === 'KplexPlugin');
  assert(declaration, 'Actual plugin class exists');
  const required = new Set(['adoptInitialSourceIndex', 'finishStartupIndexPreparation', 'ensureInitialIndex', 'getIndexSourceRevision', 'installPreRestoreChangeFence', 'notifyStartupProgress', 'startIndexPreparation', 'classifyPreRestoreChanges']);
  const fields = new Set(['layoutReady', 'startupIndexPolicy', 'indexPreparationTask', 'indexPreparationAdmitted',
    'explicitIndexPreparationRequested', 'indexViewOpened', 'openKplexViews', 'indexDirty', 'indexDirtyRevision',
    'indexBacklogReasons', 'dirtyMarkdownPaths', 'preRestoreUncoveredChanges', 'unloading',
    'metadataStabilized', 'metadataStabilityPromise']);
  const members = declaration.members.filter(/** Copy only real coordinator members and its owned recovery state. */ member => {
    const name = member.name?.getText(module);
    return required.has(name) || fields.has(name) || name?.startsWith('initialIndex') || name?.startsWith('initialSource')
      || name?.startsWith('resumeInitialSource') || name?.startsWith('canResumeInitialSource') || name?.startsWith('preRestore');
  });
  for (const name of required) assert(members.some(/** Assert the explicit extraction inventory remains complete. */ member => member.name?.getText(module) === name), name);
  const onload = declaration.members.find(/** Locate the real native registration owner. */ member => member.name?.getText(module) === 'onload');
  const urlListeners = onload.body.statements.filter(/** Copy the four independent URL lifecycle registrations intact. */ statement => {
    const text = statement.getText(module);
    return text.startsWith('this.registerEvent(this.app.vault.on(');
  });
  assert.equal(urlListeners.length, 4, 'Keep the independent native URL listener inventory explicit');
  return `import {Platform,TFile,TFolder} from 'obsidian';\nimport {perfNow} from './util/perf';\nexport class StartupSourceCoordinator {\n${members.map(/** Preserve exact member implementation and initializers. */ member => member.getText(module)).join('\n')}\n/** Install the exact production onload statements without its unrelated UI shell. */\ninstallInitialUrlListeners(){${urlListeners.map(/** Keep native callback policy unchanged. */ statement => statement.getText(module)).join('\n')}}\n}`;
}
