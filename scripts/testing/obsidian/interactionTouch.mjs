/**
 * Serial exact-build native Obsidian range/geometry acceptance for the interaction-correctness batch.
 * Run from the K-Plex checkout with the three explicit disposable-vault variables and a fresh report
 * directory. This driver owns temporary settings, native touch emulation, observers, leaves and
 * window geometry, restores each independently, and never stages artifacts or claims physical Mobile.
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { Script } from 'node:vm';

const projectRoot = resolve(process.env.KPLEX_PROJECT_ROOT ?? process.cwd());
const { validateTarget } = await import(join(projectRoot, 'scripts/testing/obsidian/runner.mjs'));
const vaultName = process.env.KPLEX_TEST_VAULT_NAME;
assert.equal(vaultName, 'kplex-test-small', 'This probe is restricted to the explicitly configured disposable small vault');
const target = validateTarget({ vaultName, vaultPath: process.env.KPLEX_TEST_VAULT_PATH, configDir: process.env.KPLEX_TEST_CONFIG_DIR });
const reportDir = process.env.KPLEX_HOST_REPORT_DIR;
assert(reportDir && !existsSync(join(reportDir, 'report.json')), 'Set a fresh KPLEX_HOST_REPORT_DIR');
mkdirSync(reportDir, { recursive: true });
const artifacts = ['main.js', 'styles.css', 'manifest.json'];
/** Hash exact bytes rather than accepting a version string as deployed-build identity. */
const hash = path => createHash('sha256').update(readFileSync(path)).digest('hex');
const built = Object.fromEntries(artifacts.map(name => [name, hash(join(projectRoot, 'dist', name))]));
const installed = Object.fromEntries(artifacts.map(name => [name, hash(join(target.pluginDir, name))]));
assert.deepEqual(installed, built, 'Stage the exact current candidate build before this probe');
const configuration = ['plugins/k-plex/data.json', 'community-plugins.json', 'hotkeys.json'].map(name => ({ name, path: join(target.config, name), bytes: existsSync(join(target.config, name)) ? readFileSync(join(target.config, name)) : null }));
assert(configuration[0].bytes && configuration[1].bytes, 'Initialized K-Plex settings and plugin enablement are required');
const token = `interaction-touch-${process.pid}-${Date.now()}`;
const report = { status: 'running', startedAt: new Date().toISOString(), target: vaultName, artifacts: { built, installed }, scenarios: [],
  limitations: ['Native Electron CDP input under desktop mobile emulation is not physical Android/iOS touch or mobile WebView acceptance', 'The physical immediate-drag delay was not reproduced by the corrected old-build desktop iOS baseline; this lane proves containment and current native defaults', 'Camera isolation explicitly disables automatic fitting during this test and restores the original setting'] };
let baseline, controllerStarted = false;

/** Deliver explicit CLI arguments without a shell, retaining native failures rather than silent passes. */
function cli(command, ...args) {
  const result = spawnSync(process.env.KPLEX_OBSIDIAN_CLI ?? 'obsidian', [`vault=${vaultName}`, command, ...args], { cwd: projectRoot, encoding: 'utf8', timeout: 30000, killSignal: 'SIGKILL', maxBuffer: 8 * 1024 * 1024 });
  if (result.error || result.status !== 0 || /^Error:/m.test(result.stdout)) throw result.error ?? Error(result.stderr || result.stdout);
  return result.stdout.trim();
}
/** Syntax-check each injected native expression and accept only its explicit JSON result. */
function evaluate(code) { new Script(code); return JSON.parse(cli('eval', `code=${code}`).replace(/^=>\s*/, '')); }
/** Yield without blocking the native process; every poll also has a bounded explicit deadline. */
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
/** Reacquire native plugin identity after mobile-mode transitions and deliberate plugin reload. */
async function ready() {
  const end = Date.now() + 90000;
  while (Date.now() < end) {
    try { if (evaluate('JSON.stringify(Boolean(app.plugins.plugins["k-plex"]?.actionManager))')) return; } catch {}
    await delay(300);
  }
  throw Error('Native plugin reload readiness deadline');
}

/** Self-contained native controller: actual production callbacks/controls receive trusted CDP input. */
function startNative(token, mode, expected) {
  if (window.__kplexInteractionTouch || window.__kplexActionWorkflows || window.__kplexActionDevice || window.__kplexDisplayModesProbe || window.__kplexUxRegression) throw Error('Competing native controller');
  const remote = require('@electron/remote'), win = remote.getCurrentWindow();
  if (remote.powerMonitor.getSystemIdleState(10) === 'locked') throw Error('Unlocked native session required');
  if (win.webContents.debugger.isAttached()) throw Error('Another native debugger owner is attached');
  remote.app.show(); remote.app.focus({ steal: true }); win.show(); win.moveTop(); win.focus(); win.webContents.focus();
  const c = window.__kplexInteractionTouch = { token, win, mode, events: [], cases: [], geometry: [], wrappers: [], leaves: [], done: false, debuggerOwned: false };
  /** Isolate bounded native waits; cancellation retires every loop before further host effects. */
  const wait = ms => new Promise(resolve => window.setTimeout(resolve, ms));
  /** Require actual settled DOM state, rather than treating an animation's first frame as a result. */
  const until = async (fn, label, timeout = 12000) => { const end = Date.now() + timeout; while (!fn()) { if (c.cancelled || Date.now() > end) throw Error(label); await wait(25); } };
  /** Fail a native assertion without discarding the controller's already captured evidence. */
  const check = (value, label) => { if (!value) throw Error(label); };
  /** Capture copyable rectangle values without retaining native DOM nodes in the report. */
  const rect = element => element.getBoundingClientRect().toJSON();
  /** Native range input is never simulated by assigning its value or emitting synthetic change events. */
  const touch = (type, x = 0, y = 0) => win.webContents.debugger.sendCommand('Input.dispatchTouchEvent', { type, touchPoints: ['touchEnd', 'touchCancel'].includes(type) ? [] : [{ x, y, id: 1, radiusX: 2, radiusY: 2, force: 1 }] });
  /** Install a passive, test-only observer and retain its exact teardown owner. */
  const observe = (element, phase) => {
    for (const type of ['touchstart', 'touchmove', 'touchend', 'touchcancel', 'pointerdown', 'pointermove', 'pointercancel', 'input']) {
      /** Record event ownership, native value and propagation state without changing dispatch/defaults. */
      const listener = event => { if (c.events.length < 1200) c.events.push({ phase, type, at: performance.now(), target: event.target?.tagName, inputType: event.target?.type, label: event.target?.getAttribute?.('aria-label'), value: event.target?.type === 'range' ? Number(event.target.value) : null, trusted: event.isTrusted, defaultPrevented: event.defaultPrevented }); };
      element.addEventListener(type, listener, { capture: phase.includes('capture'), passive: true });
      c.wrappers.push(/** Remove precisely this test observer from its original native owner. */ () => element.removeEventListener(type, listener, { capture: phase.includes('capture') }));
    }
  };
  /** Locate and disclose the currently mounted controls in the exact captured surface. */
  const controls = async host => {
    await until(() => host.view.contentEl.querySelector('.kplex-app .kplex-plex'), 'Plex DOM did not materialize');
    const root = host.view.contentEl.querySelector('.kplex-app'), graph = root.querySelector('.kplex-plex'), toggle = graph.querySelector('.kplex-layout-toggle');
    if (toggle.getAttribute('aria-expanded') !== 'true') toggle.click();
    await until(() => graph.querySelectorAll('.kplex-layout-controls input[type=range]').length === 7, 'Seven native ranges missing');
    return { root, graph, toggle, owner: graph.querySelector('.kplex-layout-controls'), panel: graph.querySelector('.kplex-layout-panel') };
  };
  c.task = (async () => {
    const p = c.p = app.plugins.plugins['k-plex']; p.settings.allowAutozoom = false; await p.saveSettings(false, false); p.index.notifyPresentation(); await wait(250);
    if (mode === 'geometry') {
      app.workspace.leftSplit.collapse(); app.workspace.rightSplit.collapse();
      const host = app.workspace.getLeaf('tab'); c.leaves.push(host); await host.setViewState({ type: 'k-plex-react-view', active: true }); await app.workspace.revealLeaf(host);
      const ui = await controls(host); c.ui = ui;
      win.webContents.debugger.attach('1.3'); c.debuggerOwned = true; await win.webContents.debugger.sendCommand('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 2 });
      /** Measure actual graph fit after native window resize; do not equate window width with pane width. */
      const fitPane = async (width, height) => {
        for (let attempt = 0; attempt < 6; attempt++) {
          const current = rect(ui.graph), bounds = win.getBounds();
          if (Math.abs(current.width - width) <= 2 && Math.abs(current.height - height) <= 2) return;
          win.setBounds({ ...bounds, width: Math.round(bounds.width + width - current.width), height: Math.round(bounds.height + height - current.height) }); await wait(180);
        }
        const result = rect(ui.graph); check(Math.abs(result.width - width) <= 2 && Math.abs(result.height - height) <= 2, `Actual pane could not fit ${width}x${height}: ${result.width}x${result.height}`);
      };
      for (const [width, height] of [[320, 600], [390, 600], [480, 600], [600, 600], [900, 600], [390, 220], [900, 220]]) {
        await fitPane(width, height); await until(() => ui.owner.classList.contains('is-stacked') === (width < 760 || height < 300), 'Pane-fit state did not settle');
        const pane = rect(ui.graph), disclosure = rect(ui.toggle), panel = rect(ui.panel), zoom = rect(ui.graph.querySelector('.kplex-zoom-controls'));
        /** Inspect rectangle overlap independently of DOM nesting or screenshots. */
        const overlaps = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
        check(disclosure.left - pane.left <= 20 && pane.bottom - disclosure.bottom <= 20, 'Disclosure lost bottom-left anchor');
        if (width < 760 || height < 300) check(panel.bottom <= disclosure.top, 'Stacked panel is not above disclosure');
        check(panel.top >= pane.top && panel.right <= pane.right && !overlaps(panel, zoom) && !overlaps(disclosure, zoom), 'Panel bounds or opposite-control overlap');
        for (const input of ui.panel.querySelectorAll('input')) { input.scrollIntoView({ block: 'nearest' }); const b = rect(input); check(b.top >= pane.top && b.bottom <= pane.bottom && b.left >= pane.left && b.right <= pane.right && document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2) === input, 'Scrolled control is clipped or not hit-testable'); }
        ui.panel.scrollTop = 0;
        c.geometry.push({ requested: [width, height], pane, disclosure, panel, zoom, stacked: ui.owner.classList.contains('is-stacked'), scrollHeight: ui.panel.scrollHeight, clientHeight: ui.panel.clientHeight, device: p.getTypographyDevice() });
        if (height === 220) {
          check(ui.panel.scrollHeight > ui.panel.clientHeight, 'Short pane lacks bounded scroll');
          const heading = ui.panel.querySelectorAll('.kplex-density-heading')[1], b = rect(heading), x = b.left + b.width * .8, y = b.top + b.height / 2;
          await touch('touchStart', x, y); for (const delta of [15, 30, 45, 60]) await touch('touchMove', x, Math.max(panel.top + 5, y - delta)); await touch('touchEnd'); await wait(80);
          check(ui.panel.scrollTop > 0, 'Native label swipe did not scroll short panel');
        }
      }
      ui.toggle.click(); await until(() => !ui.graph.querySelector('.kplex-layout-panel'), 'Collapsed panel remains mounted');
      const b = rect(ui.toggle); check(ui.toggle.contains(document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2)), 'Collapsed toggle cannot be hit');
      check(!document.elementFromPoint(b.left + 80, b.top - 50)?.closest('.kplex-layout-controls'), 'Collapsed controls leave invisible hit shield');
      return { geometry: c.geometry, collapsed: true, device: p.getTypographyDevice() };
    }
    const beforeLeaves = new Set(app.workspace.getLeavesOfType('k-plex-sidepanel-view'));
    await p.activateSidepanel(); await until(() => app.workspace.getLeavesOfType('k-plex-sidepanel-view').length > 0, 'Phone sidepanel leaf did not materialize');
    const host = app.workspace.getLeavesOfType('k-plex-sidepanel-view')[0]; if (!beforeLeaves.has(host)) c.leaves.push(host);
    // A plugin reload can restore the leaf into a collapsed drawer. Join leaf creation first,
    // then explicitly expand its actual native owner before requiring visible controls.
    const drawer = host.view.containerEl.closest('.workspace-drawer'); check(drawer, 'Control owner has no native drawer');
    const split = drawer.classList.contains('mod-right') ? app.workspace.rightSplit : app.workspace.leftSplit;
    /** Retain native readiness facts on failure before restoring the drawer and window. */
    c.drawerState = () => ({ mobile: app.isMobile, width: innerWidth, height: innerHeight, drawer: drawer.className,
      collapsed: split.collapsed, transform: getComputedStyle(drawer).transform, shown: host.view.containerEl.isShown(),
      viewType: host.view.getViewType(), hostRect: rect(host.view.containerEl), drawerRect: rect(drawer),
      connected: drawer.isConnected, owningDocument: drawer.ownerDocument === document,
      ancestors: (() => { const entries = []; for (let node = drawer; node && entries.length < 10; node = node.parentElement) entries.push({ className: node.className, display: getComputedStyle(node).display, visibility: getComputedStyle(node).visibility, connected: node.isConnected }); return entries; })(),
      leaves: app.workspace.getLeavesOfType('k-plex-sidepanel-view').map(leaf => ({ id: leaf.id, shown: leaf.view.containerEl.isShown(), rect: rect(leaf.view.containerEl) })) });
    split.expand(); await until(() => !split.collapsed && getComputedStyle(drawer).transform === 'none' && host.view.containerEl.isShown(), 'Actual owner drawer did not settle');
    const ui = await controls(host); c.ui = ui;
    const density = ui.owner.querySelector('input[type=range]'), widthRail = ui.owner.querySelector(`input[aria-label="${p.translator('settings.ui.maximum.node.width')}"]`);
    check(widthRail, 'Native typography width rail missing');
    if (mode === 'reload') {
      check(p.getTypographyDevice() === expected.device, 'Reload changed typography device');
      check(Number(density.value) === expected.density && Number(widthRail.value) === expected.width, 'Reload lost native range preferences');
      return { device: p.getTypographyDevice(), density: Number(density.value), width: Number(widthRail.value), drawer: drawer.className, reloadRetained: true };
    }
    observe(window, 'window-capture'); observe(document, 'document-capture'); observe(ui.owner, 'controls-bubble'); observe(drawer, 'drawer-bubble'); observe(document, 'document-bubble');
    win.webContents.debugger.attach('1.3'); c.debuggerOwned = true; await win.webContents.debugger.sendCommand('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 2 });
    for (const range of [density, widthRail]) for (const variant of ['thumb-immediate', 'thumb-hold', 'track-immediate', 'track-hold']) {
      range.scrollIntoView({ block: 'nearest' }); await wait(30); const b = rect(range), min = Number(range.min), max = Number(range.max), value = Number(range.value), fraction = (value - min) / (max - min);
      const startX = b.left + 4 + (b.width - 8) * (variant.startsWith('thumb') ? fraction : .35), y = b.top + b.height / 2, endX = b.left + 4 + (b.width - 8) * (fraction > .55 ? .1 : .9);
      const before = { value, collapsed: split.collapsed, camera: ui.root.querySelector('.kplex-camera')?.style.transform }, start = c.events.length;
      check(document.elementFromPoint(startX, y) === range, 'Gesture origin is not the actual native range');
      await touch('touchStart', startX, y); if (variant.includes('hold')) await wait(500);
      for (let step = 1; step <= 6; step++) { await touch('touchMove', startX + (endX - startX) * step / 6, y); await wait(12); }
      await touch('touchEnd'); await wait(240); await p.settingsWriteQueue;
      const after = { value: Number(range.value), collapsed: split.collapsed, camera: ui.root.querySelector('.kplex-camera')?.style.transform }, events = c.events.slice(start);
      c.cases.push({ label: range.getAttribute('aria-label'), variant, before, after, events });
      const inputs = events.filter(event => event.type === 'input' && event.phase === 'controls-bubble');
      check(after.value !== before.value && new Set(inputs.map(event => event.value)).size >= 2 && inputs.every(event => event.trusted), 'Native range did not emit intermediate trusted values');
      check(!after.collapsed && getComputedStyle(drawer).transform === 'none', 'Range gesture moved its native drawer');
      check(!events.some(event => ['touchstart', 'touchmove'].includes(event.type) && ['drawer-bubble', 'document-bubble'].includes(event.phase)), 'Control-origin stream escaped into native host bubble recognizers');
      check(before.camera === after.camera, 'Slider gesture moved the graph camera with automatic fitting isolated');
    }
    // Ordinary canvas touches belong to graph pan; use native drawer chrome outside K-Plex instead.
    const candidates = [...drawer.querySelectorAll('.workspace-drawer-header,.workspace-drawer-header-name,.workspace-tab-header-container')];
    const header = candidates.find(element => { const b = rect(element), hit = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2); return b.width > 80 && b.height > 10 && hit && !hit.closest('.kplex-app,input,button,textarea,select'); });
    check(header, 'No native drawer chrome origin available outside K-Plex controls');
    const b = rect(header), start = c.events.length, x = b.left + b.width * .35, y = b.top + b.height / 2;
    await touch('touchStart', x, y); for (let step = 1; step <= 6; step++) await touch('touchMove', Math.min(drawer.getBoundingClientRect().right - 5, x + step * 25), y); await touch('touchEnd'); await wait(100);
    const outside = { origin: header.className, collapsed: split.collapsed, events: c.events.slice(start) };
    check(outside.events.some(event => ['touchstart', 'touchmove'].includes(event.type) && event.phase === 'drawer-bubble') && outside.events.some(event => ['touchstart', 'touchmove'].includes(event.type) && event.phase === 'document-bubble'), 'Native drawer gesture outside controls no longer reaches host');
    if (split.collapsed) split.expand(); await until(() => !split.collapsed && getComputedStyle(drawer).transform === 'none', 'Drawer did not restore after outside gesture');
    const expectedState = { device: p.getTypographyDevice(), profileKey: `${p.getTypographyDevice()}:sidepanel`, density: Number(density.value), width: Number(widthRail.value) };
    ui.toggle.click(); await until(() => !ui.graph.querySelector('.kplex-layout-panel'), 'Collapse retained control panel'); ui.toggle.click(); await until(() => ui.graph.querySelectorAll('input[type=range]').length === 7, 'Reopen lost ranges');
    check(Number(ui.owner.querySelector('input[type=range]').value) === expectedState.density && Number(ui.owner.querySelector(`input[aria-label="${p.translator('settings.ui.maximum.node.width')}"]`).value) === expectedState.width, 'Collapse/reopen lost current preferences');
    await p.settingsWriteQueue;
    return { cases: c.cases, outside, expected: expectedState, touchAction: [ui.owner.querySelector('input[type=range]'), ui.owner, ui.owner.querySelector('.kplex-layout-panel'), ui.graph, drawer].map(element => ({ class: element.className, touchAction: getComputedStyle(element).touchAction })) };
  })().then(value => { c.value = value; c.done = true; }, error => { c.error = String(error); c.readiness = c.drawerState?.(); c.done = true; });
  return JSON.stringify({ started: true, token, mode });
}

/** Retire each native resource independently, preserving cleanup failures as failures. */
async function cleanupController() {
  if (!controllerStarted) return;
  const start = evaluate(`(()=>{const c=window.__kplexInteractionTouch;if(!c||c.token!==${JSON.stringify(token)})return JSON.stringify({absent:true});c.cancelled=true;c.cleanup=(async()=>{
    const errors=[],attempt=async(fn)=>{try{await fn()}catch(error){errors.push(String(error))}};
    if(!c.done&&c.debuggerOwned)await attempt(()=>c.win.webContents.debugger.sendCommand('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]}));
    for(const release of c.wrappers.reverse())await attempt(release);c.wrappers=[];
    if(c.debuggerOwned){await attempt(()=>c.win.webContents.debugger.sendCommand('Emulation.setTouchEmulationEnabled',{enabled:false}));await attempt(()=>{if(c.win.webContents.debugger.isAttached())c.win.webContents.debugger.detach()});}
    for(const leaf of c.leaves.reverse())await attempt(()=>leaf?.detach());
    await attempt(()=>app.plugins.plugins['k-plex']?.settingsWriteQueue);
    if(!c.done)errors.push('Native task was not retired at cleanup');return{listenersRemoved:c.wrappers.length===0,debuggerReleased:!c.win.webContents.debugger.isAttached(),ownedLeavesRetired:true,taskRetired:c.done,errors};
  })().then(value=>c.cleaned=value,error=>c.cleanupError=String(error));return JSON.stringify({started:true})})()`);
  if (start.absent) { controllerStarted = false; return; }
  const end = Date.now() + 30000;
  while (Date.now() < end) {
    await delay(200); const state = evaluate('JSON.stringify({cleaned:window.__kplexInteractionTouch?.cleaned,error:window.__kplexInteractionTouch?.cleanupError})');
    if (state.error) throw Error(state.error);
    if (state.cleaned) { report.scenarios.push({ id: 'controller-cleanup', ...state.cleaned }); evaluate(`(()=>{if(window.__kplexInteractionTouch?.token===${JSON.stringify(token)}&&window.__kplexInteractionTouch.done)delete window.__kplexInteractionTouch;return JSON.stringify({removed:!window.__kplexInteractionTouch})})()`); controllerStarted = false; if (state.cleaned.errors.length) throw Error(state.cleaned.errors.join('; ')); return; }
  }
  throw Error('Native controller cleanup deadline');
}

/** Run one finite native phase at a time; no phase starts before its predecessor has cleaned up. */
async function phase(mode, expected = null) {
  controllerStarted = true; evaluate(`(${startNative.toString()})(${JSON.stringify(token)},${JSON.stringify(mode)},${JSON.stringify(expected)})`);
  const end = Date.now() + 120000;
  while (Date.now() < end) {
    await delay(250); const state = evaluate('JSON.stringify({done:window.__kplexInteractionTouch?.done,error:window.__kplexInteractionTouch?.error})');
    if (state.done) {
      const result = evaluate('JSON.stringify(window.__kplexInteractionTouch.value??{error:window.__kplexInteractionTouch.error,readiness:window.__kplexInteractionTouch.readiness,cases:window.__kplexInteractionTouch.cases,geometry:window.__kplexInteractionTouch.geometry})');
      report.scenarios.push({ id: mode, status: state.error ? 'failed' : 'passed', result }); if (state.error) throw Error(state.error);
      await cleanupController(); return result;
    }
  }
  throw Error(`Native ${mode} phase deadline`);
}

try {
  assert.equal(realpathSync(cli('vault', 'info=path').replace(/^path\s+/, '')), target.vault, 'Wrong native vault');
  baseline = evaluate('JSON.stringify((()=>{const w=require("@electron/remote").getCurrentWindow(),p=app.plugins.plugins["k-plex"];return{mobile:app.isMobile,bounds:w.getBounds(),minimum:w.getMinimumSize(),layout:app.workspace.getLayout(),settings:p.settings,files:app.vault.getFiles().length}})())'); report.baseline = baseline;
  if (!baseline.mobile) { cli('eval', 'code=app.emulateMobile(true)'); await ready(); }
  evaluate('(()=>{const w=require("@electron/remote").getCurrentWindow();w.setMinimumSize(150,150);w.setBounds({width:390,height:844});return JSON.stringify({done:true})})()'); await delay(250);
  const touchResult = await phase('touch');
  const saved = JSON.parse(readFileSync(configuration[0].path, 'utf8'));
  assert.equal(saved.typographyProfiles[touchResult.expected.device].maxWidth, touchResult.expected.width, 'Native typography preference did not reach disk');
  assert.equal(saved.layoutProfiles[touchResult.expected.profileKey].horizontalCompactingFactor, touchResult.expected.density, 'Native density preference did not reach disk');
  evaluate('(async()=>{await app.plugins.disablePlugin("k-plex");await app.plugins.enablePlugin("k-plex");return JSON.stringify({reloaded:true})})()'); await ready();
  // Retiring the last owned Sidepanel can leave Obsidian's emulated drawer display:none through
  // plugin-only reload despite expanded=true. Recreate native mobile chrome, not plugin CSS.
  // This proves saved values in a fresh session, not plugin-only drawer reopening acceptance.
  report.limitations.push('Persistence is checked after plugin reload plus recreation of emulated mobile chrome; plugin-only last-Sidepanel drawer reopening is not accepted by this lane');
  cli('eval', 'code=app.emulateMobile(false)'); await ready();
  cli('eval', 'code=app.emulateMobile(true)'); await ready();
  evaluate('(()=>{require("@electron/remote").getCurrentWindow().setBounds({width:390,height:844});return JSON.stringify(true)})()');
  await phase('reload', touchResult.expected);
  cli('eval', 'code=app.emulateMobile(false)'); await ready(); await phase('geometry');
  assert.deepEqual(Object.fromEntries(artifacts.map(name => [name, hash(join(target.pluginDir, name))])), built, 'Installed artifact identity changed during probe');
  const errors = cli('dev:errors'); if (errors && !/^No errors captured\.?$/i.test(errors)) throw Error(`Native JavaScript errors: ${errors}`);
  report.status = 'passed';
} catch (error) { report.status = 'failed'; report.error = String(error); }
finally {
  const cleanupErrors = [];
  /** Attempt every restoration lane even when an earlier one fails. */
  const attempt = async (label, action) => { try { await action(); } catch (error) { cleanupErrors.push(`${label}: ${String(error)}`); } };
  await attempt('native-resource-cleanup', cleanupController);
  if (baseline) {
    await attempt('emulation-restore', async () => { if (evaluate('JSON.stringify(app.isMobile)') !== baseline.mobile) { cli('eval', `code=app.emulateMobile(${baseline.mobile})`); await ready(); } });
    await attempt('layout-and-settings-restore', async () => { await ready(); evaluate(`(async()=>{const p=app.plugins.plugins['k-plex'];await app.workspace.changeLayout(${JSON.stringify(baseline.layout)});Object.assign(p.settings,${JSON.stringify(baseline.settings)});await p.saveSettings(false,false);await p.settingsWriteQueue;return JSON.stringify({restored:true})})()`); });
    await attempt('window-restore', async () => evaluate(`(()=>{const w=require('@electron/remote').getCurrentWindow();w.setMinimumSize(${baseline.minimum[0]},${baseline.minimum[1]});w.setBounds(${JSON.stringify(baseline.bounds)});return JSON.stringify({restored:true})})()`));
    await attempt('configuration-byte-restore', async () => { writeFileSync(configuration[0].path, configuration[0].bytes); for (const entry of configuration) if (entry.bytes ? !readFileSync(entry.path).equals(entry.bytes) : existsSync(entry.path)) throw Error(`Configuration differs: ${entry.name}`); report.configurationRestored = true; });
    await attempt('host-restoration-receipt', async () => { report.restored = evaluate('JSON.stringify({mobile:app.isMobile,files:app.vault.getFiles().length,controller:!!window.__kplexInteractionTouch,debuggerAttached:require("@electron/remote").getCurrentWindow().webContents.debugger.isAttached(),bounds:require("@electron/remote").getCurrentWindow().getBounds()})'); assert.equal(report.restored.mobile, baseline.mobile); assert.equal(report.restored.files, baseline.files); assert.equal(report.restored.controller, false); assert.equal(report.restored.debuggerAttached, false); assert.deepEqual(report.restored.bounds, baseline.bounds); });
  }
  if (cleanupErrors.length) { report.status = 'failed'; report.cleanupErrors = cleanupErrors; }
  report.completedAt = new Date().toISOString(); writeFileSync(join(reportDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
}
console.log(JSON.stringify({ status: report.status, error: report.error, cleanupErrors: report.cleanupErrors, report: join(reportDir, 'report.json') }));
if (report.status !== 'passed') process.exitCode = 1;
