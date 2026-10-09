/**
 * Native date-policy acceptance using the actual Vault, property registry and cached graph owner.
 * Owns only disposable fixtures, finite semantic demands and temporary read observers. It changes no
 * synthetic keystrokes, existing files, property types or Daily Notes options. Settings/configuration are
 * restored independently of assertions. This is desktop host evidence, not touch or paint acceptance.
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
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
const token = `date-policy-${process.pid}-${Date.now()}`;
const report = { status: 'running', startedAt: new Date().toISOString(), driverSha256: createHash('sha256').update(source).digest('hex'), artifacts: {}, scenarios: [], limitations: ['Actual desktop Vault/Date registry/cached semantics and registered declarative settings; no physical-device interaction, dropdown clicks or paint guarantee.', 'Restart scenario reloads the plugin, not the whole application.'] };
let baseline, originalSettings, modeChanged = false, configuration = [], started = false;
/** Target one named vault, reject native eval errors, and enforce an independent process deadline. */
function cli(command, ...args) {
    const began=Date.now(), r=spawnSync(process.env.KPLEX_OBSIDIAN_CLI || 'obsidian',[`vault=${vaultName}`,command,...args],{cwd:projectRoot,encoding:'utf8',timeout:30000,killSignal:'SIGKILL',maxBuffer:8*1024*1024});
    if(command==='plugin:disable'||command==='plugin:enable'||r.error||r.status!==0||/^Error:/m.test(r.stdout)) {
        const receipt={command,durationMs:Date.now()-began,status:r.status,error:r.error?.message};
        (report.cliLifecycle??=[]).push(receipt); console.log(JSON.stringify({cliLifecycle:receipt}));
    }
    if(r.error||r.status!==0||/^Error:/m.test(r.stdout)) throw new Error('Obsidian CLI '+command+' failed: '+(r.error?.message||r.stderr||r.stdout));
    return r.stdout.trim();
}
/** Native values are detached JSON; no mutation is silently retried. */
function evaluate(code) { return JSON.parse(cli('eval', `code=${code}`).replace(/^=>\s*/, '')); }
/** Let native work proceed with its original scheduling policy between bounded polls. */
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
/** Reacquire readiness after the test's explicit plugin reload. */
async function ready() { const end = Date.now() + 90000; while (!evaluate('JSON.stringify(!!app.plugins.plugins["k-plex"]?.actionManager)')) {
    assert(Date.now() < end, 'Plugin reload readiness');
    await delay(250);
} }
/** Install a native task without making its multi-step runtime work depend on one CLI eval lifetime. */
function install(token, originalSettings, originalLayout) {
    const p = app.plugins.plugins['k-plex'], i = p?.index, s = i?.sourceAcquisition;
    if (!i || !s || window.__kplexDatePolicyProbe)
        throw Error('Loaded plugin with no competing date controller required');
    const c = window.__kplexDatePolicyProbe = { token, done: false, phase: 'setup', scenarios: [], paths: [], releases: [], restores: [], work: { reads: 0, parses: 0, acquisitions: 0 }, originalSettings, originalLayout };
    /** Record a failure before granting a scenario receipt. */
    const check = (value, message) => { if (!value)
        throw Error(message); };
    /** Native async stages have a bounded independent deadline and retain their last phase. */
    const until = async (predicate, message, ms = 90000) => { const end = Date.now() + ms; while (!predicate()) {
        check((!c.cancelled || c.phase === 'cleanup') && Date.now() < end, message);
        await new Promise(r => window.setTimeout(r, 50));
    } };
    /** Release only this task's observers and exact semantic demand leases. */
    c.release = () => { for (const restore of c.restores.splice(0).reverse())
        restore(); for (const release of c.releases.splice(0))
        release(); };
    /** Restore exact settings and remove only notes/folder successfully created by this controller. */
    c.cleanup = async () => { c.phase='cleanup';c.release(); const current = app.plugins.plugins['k-plex']; current.settings = structuredClone(c.originalSettings); await current.saveSettings(false, false); for (const path of c.paths.slice().reverse()) {
        const f = app.vault.getFileByPath(path);
        if (f)
            await app.vault.delete(f, true);
    } if (c.folderCreated) {
        const f = app.vault.getFolderByPath(c.folder);
        if (f) {
            check(f.children.length === 0, 'Owned fixture folder gained an unowned item');
            await app.vault.delete(f, true);
        }
    } await app.workspace.changeLayout(c.originalLayout); await until(() => !current.index.sourceAcquisition.inventory && current.index.sourceAcquisition.knownImpactTasks === 0 && (!current.index.sourceAcquisition.enabled || !current.index.sourceAcquisition.pendingKnownFiles.size && !current.index.sourceAcquisition.pendingResolutionKeys.size), "Cleanup source tasks pending"); await current.index.sourceAcquisition.repository.flush(); await current.actionPreferenceQueue; await current.settingsWriteQueue; c.cleaned = c.paths.every(path => !app.vault.getFileByPath(path)) && (!c.folder || !app.vault.getFolderByPath(c.folder)); };
    /** Capture read/parse/acquisition calls without changing returns, throws, timers or scheduling. */
    const wrap = (owner, key, counter) => { const original = owner[key], descriptor = Object.getOwnPropertyDescriptor(owner, key); check(typeof original === 'function', 'Missing observer ' + key); owner[key] = function (...args) { c.work[counter]++; return original.apply(this, args); }; c.restores.push(() => { if (descriptor)
        Object.defineProperty(owner, key, descriptor);
    else
        delete owner[key]; }); };
    /** Inspect actual classified roles, including temporal roles placed in the lateral native gates. */
    const roles = (from, to) => { const n = i.getNeighborhood(from); check(n, 'Native neighborhood missing'); const items=[...n.parents,...n.children,...n.leftFriends,...n.rightFriends]; return Object.fromEntries(['parent','child','left','right','previous','next'].map(role=>[role,items.some(item=>item.page.path===to&&item.role===role)])); };
    const defaults=['parent','left','child','right','previous','next'];
    const inverse={parent:'child',child:'parent',left:'left',right:'right',previous:'next',next:'previous'};
    const groups={parent:'parents',child:'children',left:'leftFriends',right:'rightFriends',previous:'previous',next:'next'};
    /** Clear only temporary field-role mappings, retaining the ordinary explicit Friend fixture. */
    const resetOntology = () => { for(const group of ['hidden','parents','children','leftFriends','rightFriends','previous','next']) p.settings.hierarchy[group]=group==='leftFriends'?['working on']:[]; };
    /** Warm actual local scopes in on-demand mode; eager mode additionally requires global source authority. */
    const settle = async () => { if (!i.isOnDemandMode()) { await p.ensureIndexReady('native-date-fixture'); await until(() => { const observation={initialIndexComplete:p.initialIndexComplete,building:!!i.building,rebuildTask:!!p.rebuildTask,rebuildTimerPending:p.rebuildTimer!==null,indexDirty:p.indexDirty,status:p.getIndexStatus(),fullBuilds:i.getSemanticPreparationDiagnostics().fullBuilds}; c.lastReadiness=observation; return observation.initialIndexComplete && !observation.building && !observation.rebuildTask && !observation.rebuildTimerPending && !observation.indexDirty; }, 'Eager fixture coordinator not settled'); } await until(() => !s.inventory && s.knownImpactTasks === 0 && (i.isOnDemandMode() || s.hasSemanticDependencies() && !s.pendingKnownFiles.size && !s.pendingResolutionKeys.size), 'Source authority not ready'); await s.repository.flush(); await i.refreshSemanticSettings(); await until(() => !i.hasPendingSemanticPreparation(), 'Semantic policy publication pending'); };
    /** Save the default role and assert both native endpoint views; configured fields override it. */
    const step = async (id, fallback, expected) => {
        check(!c.cancelled, 'Native task cancelled'); c.phase=id;
        p.settings.datePropertyRelations=fallback; await p.saveSettings();
        check(!c.cancelled,'Native task cancelled'); await i.refreshSemanticSettings();
        await until(()=>!i.hasPendingSemanticPreparation(),id+' pending policy');
        const meeting=roles(c.meeting,c.daily),daily=roles(c.daily,c.meeting),working=roles(c.working,c.daily);
        c.lastObservation={id,fallback,expected,meeting,daily,working,work:{...c.work}};
        check(working.left && Object.values(working).filter(Boolean).length===1,'Explicit working-on Friend changed');
        if(expected==='hidden') check(!Object.values(meeting).some(Boolean)&&daily.child,'Directional Hidden behavior differs');
        else check(meeting[expected]&&Object.values(meeting).filter(Boolean).length===1&&daily[inverse[expected]]&&Object.values(daily).filter(Boolean).length===1,'Default/ontology role differs: '+JSON.stringify(c.lastObservation));
        const evidence=i.evidenceBetween(c.meeting,c.daily).filter(item=>item.declaredByPath===c.meeting&&item.fieldName==='date');
        check(evidence.length>0&&evidence.every(item=>item.sourceKind==='date-property'&&item.rawValue==='2098-11-28'&&item.declaredRole===expected),'Scalar Date provenance/assigned role differs');
        c.scenarios.push({id,status:'passed',fallback,expected,meeting,daily,working,dateEvidence:evidence.map(item=>({sourceKind:item.sourceKind,role:item.declaredRole,relationType:item.relationType})),work:{...c.work}});
    };
    c.task = Promise.resolve().then(async () => {
        const registry = app.metadataTypeManager, info = registry.getPropertyInfo('date'), daily = app.internalPlugins.getPluginById('daily-notes');
        check(info?.widget === 'date' && daily?.enabled, 'Existing Date property and enabled Daily Notes required; no host configuration changed');
        const options = daily.instance?.options ?? {}, iso = '2098-11-28', formatted = window.moment(iso, 'YYYY-MM-DD', true).format(options.format || 'YYYY-MM-DD');
        const path = [options.folder ?? '', formatted].filter(Boolean).join('/').replace(/\\/g, '/').replace(/^\/+|\/+$/g, '').replace(/\/{2,}/g, '/');
        c.daily = path.toLowerCase().endsWith('.md') ? path : path + '.md';
        c.folder = 'Kplex-Date-Policy-' + token;
        c.meeting = c.folder + '/Meeting.md';
        c.working = c.folder + '/Working.md';
        check(!app.vault.getFolderByPath(c.folder) && !app.vault.getFileByPath(c.daily), 'Existing owned fixture path; no mutation performed');
        const parent = c.daily.includes('/') ? c.daily.slice(0, c.daily.lastIndexOf('/')) : '';
        check(!parent || app.vault.getFolderByPath(parent), 'Daily Notes folder must already exist');
        await app.vault.createFolder(c.folder);
        c.folderCreated = true;
        await app.vault.create(c.daily, 'Body [[' + c.meeting + ']]\n');
        c.paths.push(c.daily);
        await app.vault.create(c.meeting, '---\ndate: ' + iso + '\n---\nMeeting\n');
        c.paths.push(c.meeting);
        await app.vault.create(c.working, '---\nworking on: "[[' + c.daily + ']]"\n---\n');
        c.paths.push(c.working);
        await until(() => app.metadataCache.getFileCache(app.vault.getFileByPath(c.meeting))?.frontmatter?.date === iso && app.metadataCache.resolvedLinks[c.daily]?.[c.meeting] > 0, 'Native Date/resolved link observations missing');
        p.settings.hierarchy = { ...p.settings.hierarchy, hidden: [], parents: [], children: [], leftFriends: ['working on'], rightFriends: [], previous: [], next: [] };
        Object.assign(p.settings, { datePropertyRelations: 'parent', inferAllLinksAsFriends: false, inverseInfer: false, showInferredNodes: true, showPageNodes: true, renderSiblings: false });
        for (const path of [c.meeting, c.daily, c.working])
            c.releases.push(i.acquireSemanticDemand(path));
        await p.saveSettings();
        await settle();
        const tab = app.setting.pluginTabs.find(tab => tab.id === 'k-plex');
        check(tab, 'Registered plugin settings missing');
        /** Inspect the actual registered declarative tree without opening or changing the user's Settings page. */
        const flatten = items => items.flatMap(item => [item, ...flatten(item.items ?? [])]);
        const row = flatten(tab.getSettingDefinitions()).find(item => item.control?.key === 'datePropertyRelations');
        check(row?.name && row.desc && row.control.type === 'dropdown' && defaults.every(role=>row.control.options[role]) && Object.keys(row.control.options).length===6 && row.control.defaultValue==='parent', 'Searchable date dropdown definition missing');
        c.scenarios.push({ id: 'registered-declarative-date-setting', status: 'passed', name: row.name, options: row.control.options });
        c.baselineBuilds = i.getSemanticPreparationDiagnostics().fullBuilds; c.warmReadiness={initialIndexComplete:p.initialIndexComplete,building:i.building,rebuildTask:!!p.rebuildTask,rebuildTimer:p.rebuildTimer,indexDirty:p.indexDirty};
        wrap(app.vault, 'read', 'reads');
        wrap(app.vault, 'cachedRead', 'reads');
        wrap(s, 'parse', 'parses');
        wrap(s, 'acquire', 'acquisitions');
        for(const fallback of defaults) await step('unconfigured-default-'+fallback,fallback,fallback);
        p.settings.hierarchy.parents=['date'];
        for(const fallback of defaults) await step('configured-parent-over-'+fallback,fallback,'parent');
        for(const role of defaults) {
            resetOntology(); p.settings.hierarchy[groups[role]].push('date');
            await step('configured-date-'+role,role==='parent'?'child':'parent',role);
        }
        resetOntology(); p.settings.hierarchy.hidden=['date'];
        await step('hidden-date-ontology','right','hidden');
        resetOntology(); p.settings.inferAllLinksAsFriends=true; p.settings.inverseInfer=true;
        await step('default-parent-over-generic-inference','parent','parent');
        p.settings.inferAllLinksAsFriends=false; p.settings.inverseInfer=false;
        await step('restore-default-parent','parent','parent');
        if (!i.isOnDemandMode()) check(Object.values(c.work).every(count => count === 0), 'Prepared eager policy flip reread/reparsed/reacquired source ' + JSON.stringify(c.work));
        c.fullBuildDelta = i.getSemanticPreparationDiagnostics().fullBuilds - c.baselineBuilds; c.measuredWork={...c.work}; c.indexingMode=p.settings.indexingMode;
        check(c.fullBuildDelta === 0, 'Policy flip triggered full build');
        // The separate mutation-owner guard is outside the policy-only work measurement.
        for (const restore of c.restores.splice(0).reverse()) restore();
        check(await p.directFrontmatterUnlinkCandidate(i.evidenceBetween(c.meeting, c.daily)) === null, 'Scalar Date offered as wiki-link unlink');
        c.scenarios.push({id:'scalar-date-declines-direct-wikilink-unlink',status:'passed'});
        c.release();
        c.retained = true;
    }).then(() => { c.done = true; }, error => { c.error = String(error); c.done = true; });
    return JSON.stringify({ installed: true });
}
/** Retain partial native receipts if a stage fails; do not report an unfinished controller as passed. */
async function run() { started = true; evaluate(`(${install.toString()})(${JSON.stringify(token)},${JSON.stringify(originalSettings)},${JSON.stringify(baseline.layout)})`); const end = Date.now() + 180000; while (true) {
    await delay(250);
    const state = evaluate('JSON.stringify({done:window.__kplexDatePolicyProbe?.done,error:window.__kplexDatePolicyProbe?.error,phase:window.__kplexDatePolicyProbe?.phase,lastObservation:window.__kplexDatePolicyProbe?.lastObservation,lastReadiness:window.__kplexDatePolicyProbe?.lastReadiness,scenarios:window.__kplexDatePolicyProbe?.scenarios})');
    report.scenarios = state.scenarios ?? [];
    if(report.phase!==state.phase) console.log(JSON.stringify({nativePhase:state.phase,passedScenarios:report.scenarios.length})); report.phase = state.phase; report.lastObservation = state.lastObservation; report.lastReadiness = state.lastReadiness;
    if (state.done) {
        if (state.error)
            throw Error(state.error);
        return;
    }
    assert(Date.now() < end, 'Native controller deadline');
} }
/** Acquire fresh post-reload demands using the new plugin, then verify persisted policy and roles. */
function restart() { const c = window.__kplexDatePolicyProbe, p = app.plugins.plugins['k-plex'], i = p.index; c.done = false; c.phase = 'plugin-reload'; c.task = Promise.resolve().then(async () => { await app.workspace.changeLayout(c.originalLayout); if (p.settings.datePropertyRelations !== 'parent')
    throw Error('Default Date role not persisted'); for (const path of [c.meeting, c.daily, c.working])
    c.releases.push(i.acquireSemanticDemand(path)); await i.refreshSemanticSettings(); const end = Date.now() + 90000; while (!i.isOnDemandMode() && !i.isSemanticWriteReady(c.meeting, c.daily)) {
    if (Date.now() > end)
        throw Error('Reload Date policy readiness');
    await new Promise(r => window.setTimeout(r, 50));
    await i.refreshSemanticSettings();
} if ([c.meeting,c.daily,c.working].some(path=>i.onDemandTasks.has(path))) throw Error("Fixture local scope still pending"); const meeting = i.getNeighborhood(c.meeting), daily = i.getNeighborhood(c.daily); if (!meeting.parents.some(item => item.page.path === c.daily) || !daily.children.some(item => item.page.path === c.meeting))
    throw Error('Reload default Parent/Child differs'); c.scenarios.push({ id: 'persisted-default-date-role-plugin-reload', status: 'passed', indexingMode:p.settings.indexingMode, localCoverage:i.isOnDemandMode() }); c.release(); }).then(() => { c.done = true; }, error => { c.error = String(error); c.done = true; }); return JSON.stringify({ started: true }); }
/** Always settle owned work, restore settings and retire controller ownership before raw restoration. */
async function cleanup() { if (!started)
    return; const launch = evaluate('(()=>{const c=window.__kplexDatePolicyProbe;if(!c)return JSON.stringify({absent:true});c.cancelled=true;c.cleanupDone=false;c.cleanupTask=Promise.resolve().then(async()=>{await c.task;await c.cleanup();c.cleanupResult={cleaned:c.cleaned,observers:c.restores.length,demands:c.releases.length,indexingMode:c.indexingMode,measuredWork:c.measuredWork,fullBuildDelta:c.fullBuildDelta,warmReadiness:c.warmReadiness}}).then(()=>{c.cleanupDone=true},error=>{c.cleanupError=String(error);c.cleanupDone=true});return JSON.stringify({started:true})})()'); if (launch.absent) {
    report.controllerCleanup = launch;
    started = false;
    return;
} const end = Date.now() + 120000; while (true) {
    await delay(250);
    const state = evaluate('JSON.stringify({done:window.__kplexDatePolicyProbe.cleanupDone,error:window.__kplexDatePolicyProbe.cleanupError,result:window.__kplexDatePolicyProbe.cleanupResult})');
    if (state.done) {
        if (state.error)
            throw Error(state.error);
        report.controllerCleanup = state.result;
        evaluate('(()=>{delete window.__kplexDatePolicyProbe;return JSON.stringify(true)})()');
        started = false;
        return;
    }
    assert(Date.now() < end, 'Native cleanup deadline');
} }
try {
    assert.equal(cli('vault', 'info=path').replace(/^path\s+/, ''), target.vault);
    report.version = cli('version');
    for (const name of ['main.js', 'styles.css', 'manifest.json']) {
        const hash = path => createHash('sha256').update(readFileSync(path)).digest('hex');
        report.artifacts[name] = hash(join(projectRoot, 'dist', name));
        assert.equal(hash(join(target.pluginDir, name)), report.artifacts[name], 'Installed/build hash mismatch');
    }
    evaluate('(async()=>{const p=app.plugins.plugins["k-plex"];await p.actionPreferenceQueue;await p.settingsWriteQueue;return JSON.stringify(true)})()');
    configuration = [join(target.pluginDir, 'data.json'), join(target.config, 'community-plugins.json'), join(target.config, 'hotkeys.json'), join(target.config, 'types.json')].map(path => ({ path, bytes: existsSync(path) ? readFileSync(path) : null }));
    for (const c of configuration) {
        if (c.bytes) writeFileSync(join(output, c.path.endsWith('/data.json') ? 'original-data.json' : 'original-' + c.path.split('/').pop()), c.bytes);
    }
    baseline = evaluate('JSON.stringify({layout:app.workspace.getLayout(),files:app.vault.getMarkdownFiles().length,settingsOpen:app.setting.isOpen,mobile:app.isMobile,hidden:document.hidden,visibility:document.visibilityState})');
    originalSettings = evaluate('JSON.stringify(app.plugins.plugins["k-plex"].settings)');
    const requestedMode = process.env.KPLEX_DATE_POLICY_MODE || originalSettings.indexingMode;
    assert(['eager','on-demand'].includes(requestedMode), 'Supported test indexing mode required');
    report.indexingMode=requestedMode;
    modeChanged=requestedMode!==originalSettings.indexingMode;
    cli('dev:errors', 'clear');
    if(modeChanged){
        evaluate(`(async()=>{const p=app.plugins.plugins['k-plex'];p.settings.indexingMode=${JSON.stringify(requestedMode)};await p.saveSettings(false,false);return JSON.stringify(true)})()`);
        cli('plugin:disable','id=k-plex'); cli('plugin:enable','id=k-plex'); await ready();
        evaluate(`(async()=>{await app.workspace.changeLayout(${JSON.stringify(baseline.layout)});return JSON.stringify(true)})()`);
    }
    await run();
    cli('plugin:disable', 'id=k-plex');
    cli('plugin:enable', 'id=k-plex');
    await ready();
    evaluate(`(${restart.toString()})()`);
    const end = Date.now() + 120000;
    while (true) {
        await delay(250);
        const state = evaluate('JSON.stringify({done:window.__kplexDatePolicyProbe.done,error:window.__kplexDatePolicyProbe.error,scenarios:window.__kplexDatePolicyProbe.scenarios})');
        report.scenarios = state.scenarios;
        if (state.done) {
            if (state.error)
                throw Error(state.error);
            break;
        }
        assert(Date.now() < end, 'Native restart deadline');
    }
    report.status = 'passed';
}
catch (error) {
    report.status = 'failed';
    report.error = String(error);
}
finally {
    try {
        await cleanup();
        if(modeChanged){
            evaluate(`(async()=>{const p=app.plugins.plugins['k-plex'];p.settings=${JSON.stringify(originalSettings)};await p.saveSettings(false,false);return JSON.stringify(true)})()`);
            cli('plugin:disable','id=k-plex'); cli('plugin:enable','id=k-plex'); await ready();
            evaluate(`(async()=>{await app.workspace.changeLayout(${JSON.stringify(baseline.layout)});return JSON.stringify(true)})()`);
        }
        if (baseline) {
            const after = evaluate('(async()=>{const p=app.plugins.plugins["k-plex"];await p.actionPreferenceQueue;await p.settingsWriteQueue;return JSON.stringify({files:app.vault.getMarkdownFiles().length,mobile:app.isMobile,settingsOpen:app.setting.isOpen,layout:app.workspace.getLayout(),controllerRemoved:!window.__kplexDatePolicyProbe})})()');
            assert.equal(after.files, baseline.files);
            assert.equal(after.mobile, baseline.mobile);
            assert.equal(after.settingsOpen, baseline.settingsOpen);
            assert(after.controllerRemoved);
            for (const key of ['main', 'left', 'right', 'floating'])
                assert.deepEqual(after.layout[key], baseline.layout[key]);
            report.cleanup = after;
        }
    }
    catch (error) {
        report.status = 'failed';
        report.cleanupError = String(error);
    }
    try {
        assert(!started, 'Controller cleanup incomplete; defer raw configuration restoration until owned work stops');
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
console.log(JSON.stringify({ status: report.status, error: report.error, cleanupError: report.cleanupError, report: join(output, 'report.json') }));
if (report.status !== 'passed')
    process.exitCode = 1;
