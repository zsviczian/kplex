/**
 * Exact-build native long-paste acceptance in a disposable vault. The driver owns one editor/file,
 * short-lived suggester timing and heartbeat observers, clipboard restoration and configuration/layout
 * cleanup. Measurements are inclusive renderer observations, not paint or physical-device guarantees.
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, unlinkSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateTarget } from './runner.mjs';
const projectRoot = resolve(fileURLToPath(new URL('../../..', import.meta.url)));
const vaultName = process.env.KPLEX_TEST_VAULT_NAME;
assert.equal(vaultName, 'kplex-test-small', 'Use the explicit disposable small vault');
const target = validateTarget({ vaultName, vaultPath: process.env.KPLEX_TEST_VAULT_PATH, configDir: process.env.KPLEX_TEST_CONFIG_DIR });
const output = process.env.KPLEX_HOST_REPORT_DIR;
assert(output && (!existsSync(output) || !readdirSync(output).length), 'Select a fresh evidence directory');
mkdirSync(output, { recursive: true });
const source = readFileSync(fileURLToPath(import.meta.url));
writeFileSync(join(output, 'driver-source.mjs'), source);
const input = process.env.KPLEX_LARGE_PASTE_INPUT ? readFileSync(process.env.KPLEX_LARGE_PASTE_INPUT, 'utf8') : 'Ordinary prose words about a calm afternoon. '.repeat(1100);
assert(input.length >= 30000, 'The regression requires a long paragraph');
const token = `large-paste-${process.pid}-${Date.now()}`, ownedPath = `Kplex-Large-Paste-${token}.md`;
const report = { status: 'running', startedAt: new Date().toISOString(), driverSha256: createHash('sha256').update(source).digest('hex'), input: { characters: input.length, bytes: Buffer.byteLength(input), sha256: createHash('sha256').update(input).digest('hex') }, artifacts: {}, scenarios: [], limitations: ['Native Electron paste and editor/suggester observations; no OS keyboard, physical device, screen-reader or actual-paint acceptance.', 'Short heartbeat gaps include other host work; no universal performance bound is claimed.'] };
let baseline, settings, configuration = [], controllerStarted = false;
/** Enforce an explicit-vault process deadline, including native eval errors with zero exit status. */
function cli(command, ...args) { const r = spawnSync(process.env.KPLEX_OBSIDIAN_CLI || 'obsidian', [`vault=${vaultName}`, command, ...args], { cwd: projectRoot, encoding: 'utf8', timeout: 30000, killSignal: 'SIGKILL', maxBuffer: 8 * 1024 * 1024 }); if (r.error || r.status !== 0 || /^Error:/m.test(r.stdout))
    throw r.error ?? new Error(r.stderr || r.stdout); return r.stdout.trim(); }
/** Decode detached native data; mutations are never silently retried. */
function evaluate(code) { return JSON.parse(cli('eval', `code=${code}`).replace(/^=>\s*/, '')); }
/** Poll without changing the native window's own scheduling or throttling. */
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
/** Reacquire the actual loaded plugin after a deliberate reload. */
async function ready() { const end = Date.now() + 90000; while (!evaluate('JSON.stringify(!!app.plugins.plugins["k-plex"]?.actionManager)')) {
    assert(Date.now() < end, 'Plugin reload readiness');
    await delay(250);
} }
/** Run the real editor/suggester through native paste while retaining exact owned cleanup. */
function install(token, text, ownedPath) {
    const remote = require('@electron/remote'), native = remote.getCurrentWindow(), p = app.plugins.plugins['k-plex'];
    if (!p?.actionManager || window.__kplexLargePasteProbe)
        throw Error('Loaded plugin and no competing test controller required');
    if (remote.powerMonitor.getSystemIdleState(10) === 'locked' || app.setting.isOpen || document.querySelector('.modal-container .modal,.modal-container .prompt'))
        throw Error('Unlocked session with no unowned Settings/modal required');
    if (app.vault.getFileByPath(ownedPath))
        throw Error('Owned test path already exists');
    const c = window.__kplexLargePasteProbe = { token, done: false, scenarios: [], calls: [], phase: 'setup', maxGap: 0, heartbeat: null };
    /** Fail before recording a pass receipt when any observable contract differs. */
    const check = (value, message) => { if (!value)
        throw Error(message); };
    /** Bound renderer waits independently from external CLI delivery. */
    const until = async (predicate, message, ms = 15000) => { const end = Date.now() + ms; while (!predicate()) {
        check(Date.now() < end, message);
        await new Promise(r => window.setTimeout(r, 20));
    } };
    /** Restore only the exact suggestion method wrapper and heartbeat. */
    c.release = () => { if (c.heartbeat !== null) {
        window.clearInterval(c.heartbeat);
        c.heartbeat = null;
    } if (c.suggester) {
        if (c.descriptor)
            Object.defineProperty(c.suggester, 'onTrigger', c.descriptor);
        else
            delete c.suggester.onTrigger;
        c.suggester = null;
    } };
    /** Restore the clipboard immediately after each paste, without logging any original content. */
    c.restoreClipboard = () => { if (c.clipboard) {
        const { api, data } = c.clipboard;
        api.clear();
        if (Object.keys(data).length)
            api.write(data);
        for (const [key, read] of [['text', 'readText'], ['html', 'readHTML'], ['rtf', 'readRTF']])
            if (key in data)
                check(api[read]() === data[key], 'Clipboard ' + key + ' restoration differs');
        if (data.image)
            check(api.readImage().toPNG().equals(data.image.toPNG()), 'Clipboard image restoration differs');
        if (data.bookmark)
            check(api.readBookmark().title === data.bookmark, 'Clipboard bookmark restoration differs');
        c.clipboardRestorations = (c.clipboardRestorations ?? 0) + 1;
        c.clipboard = null;
    } };
    /** Remove owned UI and note even after a failed input or timing assertion. */
    c.cleanup = async () => { c.release(); c.restoreClipboard(); if (c.leaf?.parent) {
        await c.leaf.view.save();
        c.leaf.detach();
        c.leaf = null;
        await new Promise(r => window.setTimeout(r, 500));
    } const f = app.vault.getFileByPath(ownedPath); if (f)
        await app.vault.delete(f); c.cleaned = !app.vault.getFileByPath(ownedPath); };
    c.task = new Promise(r => window.setTimeout(r, 0)).then(async () => {
        remote.app.show();
        remote.app.focus({ steal: true });
        native.show();
        native.focus();
        native.webContents.focus();
        await until(() => native.isFocused() && document.hasFocus() && !document.hidden, 'Native foreground required');
        const suggester = app.workspace.editorSuggest.suggests.find(s => s.plugin === p);
        check(suggester && typeof suggester.onTrigger === 'function', 'Registered K-Plex suggester missing');
        const original = suggester.onTrigger;
        c.suggester = suggester;
        c.descriptor = Object.getOwnPropertyDescriptor(suggester, 'onTrigger');
        /** Observe original return/throw behavior and durations without storing line or query contents. */
        suggester.onTrigger = function (...args) { const start = performance.now(); try {
            return original.apply(this, args);
        }
        finally {
            if (c.calls.length < 200)
                c.calls.push({ phase: c.phase, characters: args[0]?.ch ?? 0, elapsedMs: performance.now() - start });
        } };
        p.settings.allowOntologySuggester = true;
        c.file = await app.vault.create(ownedPath, '');
        c.leaf = app.workspace.getLeaf('tab');
        await c.leaf.openFile(c.file, { active: true, state: { mode: 'source', source: true } });
        await app.workspace.revealLeaf(c.leaf);
        app.workspace.setActiveLeaf(c.leaf, { focus: true });
        await until(() => c.leaf.view.editor && c.leaf.view.containerEl.querySelector('.cm-content'), 'Owned native editor unavailable');
        /** Focus only the captured test editor before invoking a native editing command. */
        const focus = async () => { app.workspace.setActiveLeaf(c.leaf, { focus: true }); c.leaf.view.editor.focus(); await until(() => c.leaf.view.containerEl.contains(document.activeElement) && document.activeElement.closest('.cm-content') && document.hasFocus(), 'Exact owned native editor focus lost'); };
        /** Preserve standard clipboard payloads; unfamiliar formats refuse mutation rather than lose user data. */
        const captureClipboard = () => { const api = remote.clipboard, formats = api.availableFormats(); check(formats.every(f => ['text/plain', 'text/html', 'text/rtf', 'image/png', 'text/bookmark'].includes(f)), 'Unrecognized clipboard format; no mutation performed'); const data = {}; for (const [key, read] of [['text', 'readText'], ['html', 'readHTML'], ['rtf', 'readRTF']]) {
            const value = api[read]();
            if (formats.includes({ 'text': 'text/plain', 'html': 'text/html', 'rtf': 'text/rtf' }[key]))
                data[key] = value;
        } const image = api.readImage(); if (!image.isEmpty())
            data.image = image; const bookmark = api.readBookmark(); if (bookmark.title) {
            data.bookmark = bookmark.title;
            data.text ??= bookmark.url;
        } c.clipboard = { api, data }; return api; };
        /** Exercise actual Chromium paste; the native receipt and editor model establish transport fidelity.
         * @remarks https://www.electronjs.org/docs/latest/api/web-contents#contentspaste
         */
        const paste = async (phase, content) => {
            c.phase = phase;
            c.leaf.view.editor.setValue('');
            c.leaf.view.editor.setCursor({ line: 0, ch: 0 });
            await focus();
            let pasteReceipt;
            const observe = event => { if (c.leaf.view.containerEl.contains(event.target))
                pasteReceipt = { trusted: event.isTrusted, characters: event.clipboardData?.getData('text/plain').length }; };
            const api = captureClipboard();
            document.addEventListener('paste', observe, true);
            let last = performance.now();
            c.maxGap = 0;
            c.heartbeat = window.setInterval(() => { const now = performance.now(); c.maxGap = Math.max(c.maxGap, now - last); last = now; }, 20);
            const start = performance.now();
            try {
                api.writeText(content);
                native.webContents.paste();
                await until(() => c.leaf.view.editor.getValue() === content, 'Native paste did not reach exact editor model', 10000);
                await until(() => c.calls.some(v => v.phase === phase && v.characters >= content.length), 'Native paste did not invoke owned suggester');
                await new Promise(r => window.setTimeout(r, 250));
                check(pasteReceipt?.trusted && pasteReceipt.characters === content.length, 'Trusted native clipboard paste receipt missing');
                const calls = c.calls.filter(v => v.phase === phase && v.characters >= content.length), maxOwnerMs = Math.max(...calls.map(v => v.elapsedMs));
                check(maxOwnerMs < 50, 'Owned suggester blocks native updates');
                check(c.maxGap < 1000, 'Native paste stalls renderer heartbeat');
                c.scenarios.push({ id: phase, status: 'passed', characters: content.length, pasteReceipt, elapsedMs: performance.now() - start, maxOwnerMs, maxHeartbeatGapMs: c.maxGap, calls: calls.length, visiblePlex: app.workspace.getLeavesOfType('k-plex-react-view').filter(l => p.isKplexLeafVisible(l)).length });
            }
            finally {
                if (c.heartbeat !== null) {
                    window.clearInterval(c.heartbeat);
                    c.heartbeat = null;
                }
                document.removeEventListener('paste', observe, true);
                c.restoreClipboard();
            }
        };
        check(app.workspace.getLeavesOfType('k-plex-react-view').every(l => !p.isKplexLeafVisible(l)), 'Hidden Plex scenario still has a visible graph');
        await paste('hidden-plex-public-transcript', text);
        await paste('hidden-plex-repeated-long-prose', 'Ordinary prose without ontology delimiters. '.repeat(1100));
        await c.leaf.setViewState({ type: 'markdown', state: { file: ownedPath, mode: 'source', source: false }, active: true });
        await until(() => c.leaf.view.editor && c.leaf.view.getState().source === false, 'Owned Live Preview editor unavailable');
        await paste('hidden-plex-live-preview-transcript', text);
        const graph = app.workspace.getLeaf('split', 'vertical');
        c.graph = graph;
        await graph.setViewState({ type: 'k-plex-react-view', active: false });
        await graph.view.waitUntilReady();
        await focus();
        check(p.isKplexLeafVisible(graph), 'Visible Plex scenario has no visible graph');
        await paste('visible-plex-public-transcript', text);
        c.phase = 'typing';
        c.leaf.view.editor.setCursor({ line: 0, ch: text.length });
        await focus();
        native.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'Space' });
        native.webContents.sendInputEvent({ type: 'char', keyCode: ' ' });
        native.webContents.sendInputEvent({ type: 'keyUp', keyCode: 'Space' });
        await until(() => c.leaf.view.editor.getValue() === text + ' ', 'Typing after paste did not update editor');
        await new Promise(r => window.setTimeout(r, 100));
        check(c.calls.some(v => v.phase === 'typing') && c.calls.filter(v => v.phase === 'typing').every(v => v.elapsedMs < 50), 'Typing retriggers a blocking suggester');
        c.scenarios.push({ id: 'typing-after-paste', status: 'passed', calls: c.calls.filter(v => v.phase === 'typing').length });
        c.phase = 'autocomplete';
        const editor = c.leaf.view.editor, field = p.settings.hierarchy.parents[0];
        check(typeof field === 'string' && field.length > 0, 'Parent autocomplete fixture needs a configured field');
        for (const prefix of ['', p.settings.ontologySuggesterMidSentenceTrigger]) {
            const value = 'Some prose ' + prefix + p.settings.ontologySuggesterParentTrigger;
            editor.setValue(value);
            editor.setCursor({ line: 0, ch: value.length });
            await focus();
            const info = suggester.onTrigger({ line: 0, ch: value.length }, editor, c.file);
            check(info && info.query === '', 'Native configured parent trigger missing');
            const context = { ...info, editor, file: c.file };
            check(suggester.getSuggestions(context).includes(field), 'Native configured parent suggestion missing');
            const prior = suggester.context;
            try {
                suggester.context = context;
                suggester.selectSuggestion(field);
            }
            finally {
                suggester.context = prior;
            }
            const inserted = p.settings.boldFields ? '**' + field + '**' : field;
            check(editor.getValue() === 'Some prose ' + prefix + inserted + ':: ', 'Native autocomplete replacement differs');
        }
        c.scenarios.push({ id: 'configured-parent-and-inline-autocomplete', status: 'passed' });
        c.leaf.view.editor.setValue(text);
        await c.leaf.view.save();
        check(await app.vault.read(c.file) === text, 'Pasted note disk contents differ');
        c.release();
        if (c.graph?.parent)
            c.graph.detach();
        c.graph = null;
        c.saved = true;
    }).then(() => { c.done = true; }, error => { c.error = String(error); c.done = true; });
    return JSON.stringify({ installed: true });
}
/** Poll serial native work and retain partial receipts on failure. */
async function run() { controllerStarted = true; evaluate(`(${install.toString()})(${JSON.stringify(token)},${JSON.stringify(input)},${JSON.stringify(ownedPath)})`); const end = Date.now() + 120000; while (true) {
    await delay(200);
    const s = evaluate('JSON.stringify({done:window.__kplexLargePasteProbe?.done,error:window.__kplexLargePasteProbe?.error,scenarios:window.__kplexLargePasteProbe?.scenarios})');
    report.scenarios = s.scenarios ?? [];
    if (s.done) {
        if (s.error)
            throw Error(s.error);
        return;
    }
    assert(Date.now() < end, 'Native paste deadline');
} }
/** Settle and retire exact native ownership before a deliberate reload or final cleanup. */
async function cleanup() { if (!controllerStarted)
    return; report.controllerCleanup = evaluate('(async()=>{const c=window.__kplexLargePasteProbe;if(!c)return JSON.stringify({absent:true});await c.task;if(c.graph?.parent)c.graph.detach();await c.cleanup();const result={cleaned:c.cleaned,timer:c.heartbeat,wrapped:!!c.suggester,clipboardRetained:!!c.clipboard,clipboardRestorations:c.clipboardRestorations??0};delete window.__kplexLargePasteProbe;return JSON.stringify(result)})()'); controllerStarted = false; }
try {
    assert.equal(cli('vault', 'info=path').replace(/^path\s+/, ''), target.vault);
    report.version = cli('version');
    for (const name of ['main.js', 'styles.css', 'manifest.json']) {
        const hash = path => createHash('sha256').update(readFileSync(path)).digest('hex');
        report.artifacts[name] = hash(join(projectRoot, 'dist', name));
        assert.equal(hash(join(target.pluginDir, name)), report.artifacts[name], 'Installed/build hash mismatch');
    }
    evaluate('(async()=>{const p=app.plugins.plugins["k-plex"];await p.actionPreferenceQueue;await p.settingsWriteQueue;return JSON.stringify(true)})()');
    configuration = [join(target.pluginDir, 'data.json'), join(target.config, 'community-plugins.json'), join(target.config, 'hotkeys.json')].map(path => ({ path, bytes: existsSync(path) ? readFileSync(path) : null }));
    baseline = evaluate('JSON.stringify({layout:app.workspace.getLayout(),files:app.vault.getMarkdownFiles().length,mobile:app.isMobile})');
    settings = evaluate('JSON.stringify(app.plugins.plugins["k-plex"].settings)');
    assert(!baseline.mobile, 'Desktop native acceptance requires desktop mode');
    cli('dev:errors', 'clear');
    await run();
    evaluate('(async()=>{const c=window.__kplexLargePasteProbe;await c.task;c.release();if(c.leaf?.parent){await c.leaf.view.save();c.leaf.detach();}c.leaf=null;return JSON.stringify({fileRetained:!!app.vault.getFileByPath(' + JSON.stringify(ownedPath) + ')})})()');
    await appReload();
    const restart = evaluate(`(async()=>{const f=app.vault.getFileByPath(${JSON.stringify(ownedPath)});if(!f)throw Error('Owned saved note missing after reload');const text=await app.vault.read(f),s=app.workspace.editorSuggest.suggests.find(s=>s.plugin===app.plugins.plugins['k-plex']),start=performance.now(),result=s.onTrigger({line:0,ch:text.length},{getLine:()=>text},f);return JSON.stringify({characters:text.length,match:!!result,elapsedMs:performance.now()-start})})()`);
    assert.equal(restart.characters, input.length);
    assert(restart.elapsedMs < 50);
    report.scenarios.push({ id: 'persisted-note-plugin-restart', status: 'passed', ...restart });
    report.status = 'passed';
}
catch (error) {
    report.status = 'failed';
    report.error = String(error);
}
finally {
    try {
        await cleanup();
        if (baseline) {
            const f = evaluate(`(async()=>{const f=app.vault.getFileByPath(${JSON.stringify(ownedPath)});if(f)await app.vault.delete(f);const p=app.plugins.plugins['k-plex'];p.settings=${JSON.stringify(settings)};await p.saveSettings(false,false);await app.workspace.changeLayout(${JSON.stringify(baseline.layout)});await p.actionPreferenceQueue;await p.settingsWriteQueue;return JSON.stringify({files:app.vault.getMarkdownFiles().length,controllerRemoved:!window.__kplexLargePasteProbe,ownedFileRemoved:!app.vault.getFileByPath(${JSON.stringify(ownedPath)}),mobile:app.isMobile,layout:app.workspace.getLayout()})})()`);
            assert.equal(f.files, baseline.files);
            assert(f.controllerRemoved && f.ownedFileRemoved && f.mobile === baseline.mobile);
            for (const key of ['main', 'left', 'right', 'floating'])
                assert.deepEqual(f.layout[key], baseline.layout[key], 'Restored workspace ' + key + ' differs');
            report.cleanup = f;
        }
    }
    catch (error) {
        report.status = 'failed';
        report.cleanupError = String(error);
    }
    try {
        for (const c of configuration) {
            if (c.bytes)
                writeFileSync(c.path, c.bytes);
            else if (existsSync(c.path))
                unlinkSync(c.path);
            assert(c.bytes ? readFileSync(c.path).equals(c.bytes) : !existsSync(c.path));
        }
        report.configurationBytesRestored = true;
        report.errors = cli('dev:errors');
        assert(!report.errors || /^No errors captured\.?$/i.test(report.errors), report.errors);
    }
    catch (error) {
        report.status = 'failed';
        report.restoreError = String(error);
    }
    report.completedAt = new Date().toISOString();
    writeFileSync(join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
}
/** Reopen the actual plugin against the saved owned note without a full application restart. */
async function appReload() { cli('plugin:disable', 'id=k-plex'); cli('plugin:enable', 'id=k-plex'); await ready(); }
console.log(JSON.stringify({ status: report.status, error: report.error, cleanupError: report.cleanupError, report: join(output, 'report.json') }));
if (report.status !== 'passed')
    process.exitCode = 1;
