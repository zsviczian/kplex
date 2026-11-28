/** Native publication consent, source authority and real archive handoff using owned fixtures. */
import {existsSync, readFileSync, realpathSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {runControlledProbe} from './controlledProbe.mjs';

/** Save only the next download that matches the owned public fixture filename and type. */
function ownDownload(contents, destination) {
  const session = contents.session;
  const state = {done: false, result: null};
  const listener = (_event, item, origin) => {
    if (origin !== contents || item.getFilename() !== 'Owned publication.zip') return;
    item.setSavePath(destination);
    item.once('done', (_done, result) => {state.done = true;state.result = result;});
  };
  session.on('will-download', listener);
  contents.__kplexPublishTestDownload = {state, cleanup: () => {
    session.removeListener('will-download', listener);
    delete contents.__kplexPublishTestDownload;
  }};
  return true;
}

/** Drive the installed modal and actual native FileManager in Small. All test notes are owned. */
async function scenario(app, c) {
  const plugin = app.plugins.plugins['k-plex'], translate = plugin.translator;
  const previousProfiles = plugin.settings.publishProfiles, previousPolicy = plugin.savedSettingsPolicy;
  const crypto = require('node:crypto'), fs = require('node:fs'), path = require('node:path');
  const remote = require('@electron/remote'), win = remote.getCurrentWindow(), bounds = win.getBounds(), wasMaximized = win.isMaximized();
  const hostMain = source => remote.require('vm').runInThisContext(source);
  const theme = {light: document.body.classList.contains('theme-light'), dark: document.body.classList.contains('theme-dark')};
  const folder = `Kplex-Publish-${Date.now()}`, files = [], releases = [], cases = [];
  const restoreHelpFiles = [];
  let parent, removeDownload, failure, drawing;
  const wait = ms => new Promise(done => window.setTimeout(done, ms));
  const check = (value, message) => {if (!value) throw Error(message);};
  const modal = () => document.querySelector('.kplex-publish-modal');
  const status = () => modal()?.querySelector('.kplex-form-actions [role="status"]')?.textContent;
  const button = key => [...(modal()?.querySelectorAll('button') ?? [])].find(element => element.textContent === translate(key));
  const until = async (read, message, maximum = 40_000) => {
    const deadline = Date.now() + maximum;
    while (!read()) {check(!c.closed && Date.now() < deadline, message + ' · ' + status());await wait(50);}
  };
  const click = async key => {
    await until(() => button(key) && !button(key).disabled, 'Control unavailable ' + key);
    button(key).click();
  };
  const create = async (name, body) => {
    const file = await app.vault.create(`${folder}/${name}.md`, body);
    files.push(file);
    plugin.index.insertCreatedFile(file);
    releases.push(plugin.index.acquireSemanticDemand(file.path));
    return file;
  };
  const loadPack = async () => {
    const input = modal().querySelector('input[type=file]');
    const transfer = new DataTransfer();
    transfer.items.add(new File([fs.readFileSync(c.pack)], 'kplex-web-runtime.json', {type: 'application/json'}));
    input.files = transfer.files;
    input.dispatchEvent(new Event('change', {bubbles: true}));
    await until(() => status() === translate('publish.packReady'), 'Local runtime pack did not validate');
  };
  const saveArchive = async name => {
    const destination = path.join(c.directory, name);
    check(hostMain('('+c.ownDownload+')')(win.webContents, destination), 'Could not own native archive download');
    removeDownload = () => hostMain('(contents=>{contents.__kplexPublishTestDownload?.cleanup();return true})')(win.webContents);
    await click('publish.export');
    const downloaded = () => JSON.parse(hostMain('(contents=>JSON.stringify(contents.__kplexPublishTestDownload.state))')(win.webContents));
    await until(() => downloaded().done || [translate('publish.drawing'), translate('publish.failed'), translate('publish.stale')].includes(status()), 'Native archive did not download');
    check(downloaded().done, 'Native archive rejected · ' + status() + ' · ' + (plugin.publishModal.contentEl.dataset.publishDrawingDiagnostic ?? 'no drawing stage'));
    check(downloaded().result === 'completed', 'Native ZIP download failed');
    removeDownload();removeDownload = undefined;
    const zip = fs.readFileSync(destination), entries = new Map();
    for (let at = 0; zip.readUInt32LE(at) === 0x04034b50;) {
      const size = zip.readUInt32LE(at + 18), name = zip.readUInt16LE(at + 26), extra = zip.readUInt16LE(at + 28), start = at + 30 + name + extra;
      entries.set(zip.toString('utf8', at + 30, at + 30 + name), zip.subarray(start, start + size));
      at = start + size;
    }
    const manifest = JSON.parse(entries.get('publication.json').toString('utf8'));
    check(manifest.resources.every(row => crypto.createHash('sha256').update(entries.get(row.path)).digest('hex') === row.sha256), 'Manifest hash mismatch');
    return {manifest, entries, zip};
  };
  const helpPublication = async () => {
    const selected = ['00 Start Here/K-Plex Help.md', '00 Start Here/Get started.md', '00 Start Here/First 5 minutes.md',
      '01 Core concepts/Idea Compass.md', '01 Core concepts/Relationship roles.md', '01 Core concepts/Ontology and relationship fields.md'];
    const exact = selected.map(item => app.vault.getFileByPath(item));
    check(exact.every(Boolean) && app.vault.getMarkdownFiles().length >= 150, 'The approved Help copy is incomplete');
    for (const file of exact) restoreHelpFiles.push({file, bytes: await app.vault.read(file), reviewed: undefined});
    await until(() => app.vault.getMarkdownFiles().every(file => app.metadataCache.getFileCache(file)) && app.metadataCache.isCacheClean?.() !== false,
      'Copied Help metadata did not settle', 120_000);
    plugin.settings.publishProfiles = {version: 1, profiles: [{version: 1, id: crypto.randomUUID(), title: 'Owned publication', entryPath: selected[0],
      uuidProperty: 'kplex-id', include: selected.map(path => ({kind: 'note', path})), exclude: [], includePaths: [], excludePaths: [], properties: [],
      aliases: true, fullText: true, includeMedia: true, theme: true}]};
    app.commands.executeCommandById('k-plex:kplex-publish-static-site');
    await until(modal, 'The managed Help window did not open Publish');
    await loadPack();
    c.progress = {phase: 'help-review'};
    await click('publish.preview');
    await until(() => button('publish.applyIds') || button('publish.prepare') || !button('publish.export')?.disabled, 'Help preview did not admit the exact selection');
    for (const row of restoreHelpFiles) check(await app.vault.read(row.file) === row.bytes, 'Preview wrote a Help note');
    if (button('publish.applyIds')) {
      await click('publish.applyIds');
      await until(() => status() === translate('publish.idsApplied'), 'Help UUID outcomes unavailable');
      for (const row of restoreHelpFiles) row.reviewed = await app.vault.read(row.file);
      await click('publish.preview');
    }
    await until(() => button('publish.prepare') || !button('publish.export')?.disabled || status() === translate('publish.unavailable'), 'Help graph did not become reviewable');
    if (button('publish.prepare')) await click('publish.prepare');
    await until(() => !button('publish.export')?.disabled, 'Help coverage did not become exportable', 140_000);
    c.progress = {phase: 'help-archive', selected: exact.length};
    const {manifest, entries, zip} = await saveArchive('help-publication.zip');
    check(manifest.nodes.length === selected.length && manifest.nodes.every(node => exact.some(file => file.basename === node.title)), 'Publication exposed unselected Help nodes');
    check(entries.has('data/search.json') && entries.has('theme/publication.css'), 'Help presentation or search is missing');
    check(manifest.relations.length > 0 && manifest.relations.every(row => manifest.nodes.some(node => node.id === row.source)
      && manifest.nodes.some(node => node.id === row.target)), 'Help graph relations did not preserve the induced selection');
    const noteHtml = entries.get(`notes/${manifest.entry}.html`).toString('utf8');
    check(noteHtml.includes('?node='), 'Help entry links did not rewrite to published UUIDs');
    return {notes: manifest.nodes.length, relations: manifest.relations.length, bytes: zip.length,
      archiveSha256: crypto.createHash('sha256').update(zip).digest('hex')};
  };
  try {
    check(plugin && app.vault.getFiles().length < 1000, 'An initialized Small vault is required');
    win.restore();win.show();win.focus();win.webContents.focus();
    if (c.help) return await helpPublication();
    parent = await app.vault.createFolder(folder);
    const guideId = '5a6cc009-ad52-4744-a541-725bd4aac8a6';
    const sentinel = 'KPLEX_PRIVATE_PUBLISH_8025';
    const homeText = `# Welcome\n\nSee [[${folder}/Guide|Reader guide]] and [[${folder}/${sentinel}]].\n\nSafe body marker.`;
    const childField = plugin.settings.hierarchy.children[0];
    check(childField, 'A known native child-field configuration is required');
    const home = await create('Home', homeText), guide = await create('Guide', `---\nkplex-id: ${guideId}\n${JSON.stringify(childField)}: ${JSON.stringify(`[[${folder}/Home]]`)}\n---\n# Guide\n\nPublished guide text.`);
    const hidden = await create(sentinel, `---\nkplex-id: c777cb08-b740-46cb-8168-28fbad70ea67\n---\n${sentinel} in private body.`);
    const drawingId = 'a6c3c02f-1d14-43ae-b4da-5257760834cb';
    if (c.drawing) {
      const automation = window.ExcalidrawAutomate?.getAPI();
      check(automation, 'Real Excalidraw companion is required for this lane');
      try {
        const element = automation.getElement(automation.addRect(12, 12, 100, 50));
        element.link = `[[${folder}/Guide#Guide]]`;
        const name = await automation.create({filename: 'Publication diagram', foldername: folder, silent: true,
          frontmatterKeys: {'excalidraw-plugin': 'parsed', 'kplex-id': drawingId}});
        drawing = app.vault.getFileByPath(name);
        check(drawing?.path.startsWith(folder + '/'), 'Companion drawing escaped the owned fixture');
        files.push(drawing);
        plugin.index.insertCreatedFile(drawing);
        releases.push(plugin.index.acquireSemanticDemand(drawing.path));
      } finally {automation.destroy();}
    }
    await until(() => files.every(file => app.metadataCache.getFileCache(file)) && app.metadataCache.isCacheClean?.() !== false,
      'Fixture metadata did not settle');
    c.progress = {phase: 'open', cases};
    plugin.settings.publishProfiles = {version: 1, profiles: [{version: 1, id: crypto.randomUUID(), title: 'Owned publication', entryPath: home.path,
      uuidProperty: 'kplex-id', include: [{kind: 'folder', path: folder, recursive: true}], exclude: [{kind: 'note', path: hidden.path}],
      includePaths: [], excludePaths: [], properties: [childField], aliases: false, fullText: true, includeMedia: false, theme: true}]};
    app.commands.executeCommandById('k-plex:kplex-publish-static-site');
    await until(modal, 'Command did not open the shared modal');
    await click('publish.save');
    await until(() => status() === translate('publish.saved'), 'Profile queue did not save');
    c.progress = {phase: 'profile-and-privacy-preview', cases};
    await click('publish.preview');
    await until(() => button('publish.applyIds') && !button('publish.applyIds').disabled, 'UUID review is absent');
    check(await app.vault.read(home) === homeText, 'Opening or previewing wrote a note');
    check(app.metadataCache.getFileCache(guide)?.frontmatter?.['kplex-id'] === guideId, 'Existing UUID changed before approval');
    check(button('publish.export').disabled, 'Export accepted an unapproved UUID');
    cases.push('Saved private profile and preview left all note bytes unchanged');
    c.progress = {phase: 'uuid-consent', cases};
    await click('publish.applyIds');
    await until(() => status() === translate('publish.idsApplied'), 'Native ID writes did not settle');
    const reviewedId = app.metadataCache.getFileCache(home)?.frontmatter?.['kplex-id'];
    check(typeof reviewedId === 'string' && reviewedId.length === 36, 'Blank frontmatter did not acquire a saved UUID');
    check((await app.vault.read(home)).trimEnd().endsWith(homeText), 'Native frontmatter write changed the authored Markdown body');
    check(app.metadataCache.getFileCache(guide)?.frontmatter?.['kplex-id'] === guideId, 'Existing UUID changed after approval');
    cases.push('Explicit approval assigned one ID through native FileManager and preserved existing content');
    c.progress = {phase: 'runtime-and-graph', cases};
    await loadPack();
    const publishing = plugin.publishModal;
    const graph = publishing.captureGraph;
    const beforeGraph = {mode: plugin.index.isOnDemandMode() ? 'on-demand' : 'eager',
      diagnostics: plugin.index.getSemanticPreparationDiagnostics()};
    publishing.captureGraph = async function (...args) {
      try {const result = await graph.apply(this, args);c.progress.graph = 'captured';return result;}
      catch(error){
        c.progress.graph = {error: String(error), authority: plugin.index.sourceAcquisition.hasSemanticDependencies(),
          coverage: files.map(file => ({name: file.basename, ...plugin.index.viewScopeCoverage(file.path)})),
          diagnostics: plugin.index.getSemanticPreparationDiagnostics()};
        throw error;
      }
    };
    await click('publish.preview');
    await until(() => !button('publish.export')?.disabled || Boolean(button('publish.prepare')) || status() === translate('publish.unavailable'), 'Graph did not reach review');
    if (button('publish.prepare')) await click('publish.prepare');
    await until(() => !button('publish.export')?.disabled || [translate('publish.unavailable'), translate('publish.failed')].includes(status()),
      'Complete graph did not become exportable', 130_000);
    check(!button('publish.export')?.disabled, 'Publication graph is blocked · ' + JSON.stringify(c.progress.graph) + ' · ' + status());
    c.progress = {phase: 'native-export', cases};
    const {manifest, entries, zip} = await saveArchive('owned-publication.zip');
    check(manifest.version === 2 && manifest.entry === reviewedId, 'Unexpected public entry');
    check(manifest.nodes.length === (drawing ? 3 : 2) && manifest.nodes.some(node => node.id === guideId), 'Selected documents split from private ones incorrectly');
    check(manifest.relations.some(row => row.source === guideId && row.target === reviewedId && row.role === 'child'
      && row.relationType === 1 && row.definition === childField.toLowerCase().replace(/\s+/g, '-').trim())
      && manifest.relations.some(row => row.source === reviewedId && row.target === guideId && row.role === 'parent' && row.relationType === 1),
    'Package did not preserve the native defined relation and inverse role');
    for (const [name, bytes] of entries) check(!name.includes(sentinel) && !bytes.includes(Buffer.from(sentinel)), 'Excluded sentinel leaked');
    check(entries.get(`notes/${reviewedId}.html`).includes(Buffer.from(`?node=${guideId}`)), 'Public link did not point to the selected UUID');
    if (drawing) {
      const svg = entries.get(manifest.nodes.find(node => node.id === drawingId)?.asset)?.toString('utf8');
      const html = entries.get(`notes/${drawingId}.html`)?.toString('utf8');
      check(svg?.includes(`../?node=${guideId}`) && html?.includes(`?node=${guideId}`), 'Real drawing did not preserve its published vector link');
      cases.push('Unopened Excalidraw vector drawing kept the selected UUID link inside HTML and in the standalone SVG');
    }
    cases.push('Actual native download contained a complete, digest-verified site without the private sentinel');
    c.progress = {phase: 'native-layout', cases};
    const widths = [];
    for (const [width, mode] of [[1000, 'light'], [630, 'dark']]) {
      win.setSize(width, 760);
      document.body.classList.toggle('theme-light', mode === 'light');document.body.classList.toggle('theme-dark', mode === 'dark');
      await wait(250);
      const sections = modal().querySelector('.kplex-publish-sections');
      check(sections.scrollWidth <= sections.clientWidth + 1, 'Publish form overflows horizontally');
      check([...sections.querySelectorAll('.kplex-publish-rules [hidden]')].every(row => getComputedStyle(row).display === 'none'),
        'A rule displays controls for an unselected rule type');
      const columns = getComputedStyle(sections).gridTemplateColumns;
      check(columns.split(' ').length === (mode === 'light' ? 2 : 1), 'Unexpected responsive review columns');
      fs.writeFileSync(path.join(c.directory, `${mode}-${width}.png`), (await win.webContents.capturePage()).toPNG());
      widths.push({width, mode, columns});
    }
    if (c.republish) {
      c.progress = {phase: 'rename-and-republish', cases};
      const oldAsset = manifest.nodes.find(node => node.id === drawingId)?.asset;
      const oldGuidePath = guide.path;
      await app.fileManager.renameFile(guide, `${folder}/Guide revised.md`);
      if (drawing) await app.vault.delete(drawing, true);
      await until(() => app.metadataCache.getFileCache(guide)?.frontmatter?.['kplex-id'] === guideId
        && app.metadataCache.isCacheClean?.() !== false && plugin.index.get(guide.path)?.file === guide
        && plugin.index.get(oldGuidePath)?.file !== guide && !plugin.index.hasActiveSourcePreparation(),
      'The native rename and deletion did not converge');
      for (let attempt = 0; attempt < 2; attempt++) {
        await click('publish.preview');
        await until(() => button('publish.prepare') || !button('publish.export')?.disabled
          || [translate('publish.unavailable'), translate('publish.stale')].includes(status()), 'Republish graph unavailable');
        if (button('publish.prepare')) await click('publish.prepare');
        await until(() => !button('publish.export')?.disabled
          || [translate('publish.unavailable'), translate('publish.stale')].includes(status()), 'Republish did not admit updated scope', 125_000);
        if (!button('publish.export')?.disabled) break;
        await until(() => !plugin.index.hasActiveSourcePreparation() && app.metadataCache.isCacheClean?.() !== false,
          'Source inputs did not settle for a fresh preview');
      }
      check(!button('publish.export')?.disabled, 'Updated scope remained unavailable · ' + JSON.stringify(c.progress.graph));

      const next = await saveArchive('republished-site.zip');
      check(next.manifest.nodes.some(node => node.id === guideId && node.title === 'Guide revised') && next.entries.has(`notes/${guideId}.html`), 'Republish changed the renamed note’s public address');
      if (drawing) check(!next.manifest.nodes.some(node => node.id === drawingId) && !next.entries.has(`notes/${drawingId}.html`) && !next.entries.has(oldAsset),
        'Republish retained the deleted drawing or its generated resource');
      cases.push('Renamed note kept its public UUID and regenerated ZIP omitted the deleted drawing and SVG');
    }
    return {cases, widths, bytes: zip.byteLength, archiveSha256: crypto.createHash('sha256').update(zip).digest('hex'), graph: {
      before: beforeGraph, after: {mode: plugin.index.isOnDemandMode() ? 'on-demand' : 'eager', diagnostics: plugin.index.getSemanticPreparationDiagnostics()},
    }};
  } catch (error) {failure = error;throw error;}
  finally {
    const problems = [], clean = async (name, fn) => {try{await fn();}catch(error){problems.push(name + ' · ' + error);}};
    await clean('download', () => removeDownload?.());
    await clean('modal', () => plugin.publishModal?.close());
    for (const {file, bytes, reviewed} of restoreHelpFiles) if (reviewed !== undefined && reviewed !== bytes) await clean('restore owned Help file', async () => {
      check(app.vault.getFileByPath(file.path) === file && await app.vault.read(file) === reviewed, 'The reviewed Help file changed during testing');
      await app.vault.modify(file, bytes);
      check(await app.vault.read(file) === bytes, 'The reviewed Help file was not restored');
    });
    for (const release of releases.reverse()) await clean('demand', release);
    for (const file of files.reverse()) if (app.vault.getFileByPath(file.path) === file) await clean('fixture', () => app.vault.delete(file, true));
    if (parent && app.vault.getFolderByPath(folder) === parent && !parent.children.length) await clean('folder', () => app.vault.delete(parent, true));
    await clean('native window', () => {
      document.body.classList.toggle('theme-light', theme.light);document.body.classList.toggle('theme-dark', theme.dark);
      win.setBounds(bounds);if (wasMaximized) win.maximize();
    });
    await clean('settings queue', () => plugin.settingsWriteQueue);
    await clean('settings', async () => {
      if (previousProfiles === undefined) delete plugin.settings.publishProfiles;
      else plugin.settings.publishProfiles = previousProfiles;
      plugin.savedSettingsPolicy = previousPolicy;
      await app.vault.adapter.write(plugin.manifest.dir + '/data.json', c.originalData);
    });
    if (problems.length) throw Error((failure ? String(failure) + ' · ' : '') + problems.join(' · '));
  }
}

if (!['kplex-test-small', 'kplex-help-publish-test'].includes(process.env.KPLEX_TEST_VAULT_NAME)) throw Error('Explicit Small or approved Help copy required');
const config = process.env.KPLEX_TEST_CONFIG_DIR, name = JSON.parse(readFileSync('dist/manifest.json', 'utf8')).version;
if (process.env.KPLEX_TEST_VAULT_NAME === 'kplex-help-publish-test') {
  const copy = resolve('.test-work/vaults/kplex-help-publish-test');
  if (realpathSync(process.env.KPLEX_TEST_VAULT_PATH) !== copy || realpathSync(config) !== join(copy, '.obsidian') || existsSync(join(copy, '.git'))) {
    throw Error('Use the exact approved Help copy outside its live Git checkout');
  }
}
const pack = resolve(`dist-web/kplex-web-runtime-${name}.json`);
if (!existsSync(pack)) throw Error('Build the matching web runtime pack first');
const definitions = 'c.originalData='+JSON.stringify(readFileSync(join(config, 'plugins/k-plex/data.json'), 'utf8'))+';'
  +'Object.assign(c,'+JSON.stringify({pack, directory: process.env.KPLEX_HOST_REPORT_DIR, ownDownload: ownDownload.toString(),
    help: process.env.KPLEX_TEST_VAULT_NAME === 'kplex-help-publish-test', drawing: process.env.KPLEX_PUBLISH_DRAWING === 'true',
    republish: process.env.KPLEX_PUBLISH_REPUBLISH === 'true'})+');';
await runControlledProbe('publish-mvp', scenario, definitions,
  ['src/adapters/obsidian/PublishModal.tsx', 'src/adapters/obsidian/publishSelection.ts', 'src/adapters/obsidian/publishGraph.ts', 'src/adapters/obsidian/publishContent.ts'], {maximumMs: 300_000});
