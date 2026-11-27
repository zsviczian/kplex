/** Measure exact-build Compass navigation and camera actions in a real Electron renderer. */
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {runControlledProbe} from './controlledProbe.mjs';
import {validateTarget} from './runner.mjs';

/** The transport serializes this scenario into the verified disposable renderer. */
async function measureCompass(app, c) {
  const plugin = app.plugins.plugins['k-plex'], workspace = app.workspace;
  const originalSettings = structuredClone(plugin.settings), layout = workspace.getLayout();
  const native = require('@electron/remote').getCurrentWindow(), bounds = native.getBounds(), maximized = native.isMaximized();
  const files = [], releases = [], samples = {navigation: [], zoom: [],...(c.extended?{history:[],pan:[],scroll:[]}:{})}, frames = [], tasks = [];
  const observed = {vaultReads:0,metadataParses:0,demandAcquisitions:0,settingsSaves:0};
  const restoreObservers = [];
  const fixture = '__kplex_web_runtime_benchmark';
  const centers = c.centers ?? ['A Benchmark anchor', 'B Benchmark anchor'];
  const path = name => c.centers ? name : `${fixture}/${name}.md`;
  const inventory = app.vault.getMarkdownFiles().length;
  const workloadDeadlineMs = 30_000;
  let host, folder, observer, frame, previousFrame;

  /** Poll a native prerequisite with a fixed deadline and honor a retired transport. */
  async function until(read, message, maximumMs = 25_000) {
    const finish = performance.now() + maximumMs;
    while (!c.closed) {
      const value = read();
      if (value) return value;
      if (performance.now() >= finish) break;
      await new Promise(resolve => window.setTimeout(resolve, 20));
    }
    throw Error(message);
  }

  /** Resolve only the renderer associated with the exact owned native leaf. */
  const canvas = () => host?.view.contentEl.querySelector('.kplex-plex');
  const centerPath = () => canvas()?.querySelector('.kplex-role-center[data-kplex-path]')?.dataset.kplexPath;
  const camera = () => canvas()?.querySelector('.kplex-camera');

  /** Read DOM-visible fixture geometry without walking the vault or touching the graph API. */
  const sceneCounts = () => ({nodes:canvas().querySelectorAll('.kplex-thought').length,
    edges:canvas().querySelectorAll('.kplex-edge-hit').length, gates:canvas().querySelectorAll('[data-kplex-gate]').length});

  /** Keep frames as interval proxies. Capture completed compositor pixels independently. */
  const sampleFrame = time => {
    if (previousFrame !== undefined) frames.push(time - previousFrame);
    previousFrame = time;
    frame = window.requestAnimationFrame(sampleFrame);
  };

  /** Capture only the owned canvas. Its bitmap provides paint evidence outside timed samples. */
  async function capture(name) {
    const rect = canvas().getBoundingClientRect();
    const image = await native.webContents.capturePage({x:Math.ceil(rect.x),y:Math.ceil(rect.y),width:Math.floor(rect.width)-1,height:Math.floor(rect.height)-1});
    const png = image.toPNG();
    if (png.length < 1000) throw Error('Expected a nonempty native capture');
    require('node:fs').writeFileSync(require('node:path').join(c.reportDirectory, `${name}.png`), png);
    return require('node:crypto').createHash('sha256').update(png).digest('hex');
  }

  /** Measure from trusted input to DOM commit and from input to a two-frame settle proxy. */
  async function action(eventName, send, committed, scrollArea) {
    let input, commit, settled, frameId, dispatchFrame, dispatchError, mutations = 0;
    let lastEvent;
    const events = event => {
      if (!event.isTrusted) return;
      lastEvent = {type: event.type, path: event.target?.closest?.('[data-kplex-path]')?.dataset.kplexPath,
        className: typeof event.target?.className === 'string' ? event.target.className : null};
      if (host.view.contentEl.contains(event.target)) input ??= performance.now();
    };
    const observeCommit=()=>{
      if (input === undefined || commit !== undefined || !committed()) return;
      commit = performance.now();
      frameId=window.requestAnimationFrame(()=>{frameId=window.requestAnimationFrame(()=>{settled=performance.now();});});
    };
    const changes = new window.MutationObserver(records => {
      if (input === undefined) return;
      mutations += records.length;
      observeCommit();
    });
    document.addEventListener(eventName, events, true);
    scrollArea?.addEventListener('scroll',observeCommit);
    changes.observe(canvas(), {subtree:true, childList:true, attributes:true, attributeFilter:['class','style','data-kplex-path']});
    try {
      const dispatch = () => {
        try {
          // The DOM can still move between preflight and the input frame. Wait for a real hit.
          if (send() === false) dispatchFrame = window.requestAnimationFrame(dispatch);
        } catch (error) {dispatchError = error;}
      };
      if (c.frameAligned) dispatchFrame = window.requestAnimationFrame(dispatch);
      else dispatch();
      await until(() => settled||dispatchError, `No observed DOM commit and frame proxy after trusted ${eventName}`, 3000);
      if(dispatchError)throw dispatchError;
      if (!committed()) throw Error(`Scene changed after committed ${eventName}`);
      return {inputAtMs:input,commitMs:commit-input,settledFrameProxyMs:settled-input,mutations,...sceneCounts()};
    } catch (error) {
      c.progress = {...c.progress, input: {eventName, lastEvent, received: input !== undefined, commit: commit !== undefined,
        settled: settled !== undefined, center: centerPath(), camera: camera()?.style.transform, focused: document.hasFocus()}};
      throw error;
    } finally {
      if(frameId!==undefined)window.cancelAnimationFrame(frameId);
      if(dispatchFrame!==undefined)window.cancelAnimationFrame(dispatchFrame);
      changes.disconnect();
      document.removeEventListener(eventName, events, true);
      scrollArea?.removeEventListener('scroll',observeCommit);
    }
  }

  /** Resolve the intended hit target before sending input to the native renderer. */
  function point(target, acceptsControls=false) {
    const box = target.getBoundingClientRect();
    const canvasBounds = (acceptsControls ? host.view.contentEl : canvas()).getBoundingClientRect();
    const left = Math.max(box.left,canvasBounds.left), top = Math.max(box.top,canvasBounds.top);
    const right = Math.min(box.right,canvasBounds.right), bottom = Math.min(box.bottom,canvasBounds.bottom);
    if (right - left < 2 || bottom - top < 2) return null;
    for (const horizontal of [.5,.3,.7]) for (const vertical of [.5,.3,.7]) {
      const x=Math.round(left+(right-left)*horizontal), y=Math.round(top+(bottom-top)*vertical);
      const hit=document.elementFromPoint(x,y);
      if(target.contains(hit)&&(acceptsControls||!hit?.closest('button,[data-kplex-gate]')))return {x,y};
    }
    return null;
  }

  /** Use the same native click sequence for cards and toolbar history. */
  function sendPrimaryClick(position) {
    for(const type of ['mouseDown','mouseUp'])native.webContents.sendInputEvent({type,...position,button:'left',clickCount:1});
  }

  /** Let native hover and the current frame settle at a hit before timing the click itself. */
  async function placePointer(readPoint) {
    const deadline = performance.now() + 3000;
    while (performance.now() < deadline && !c.closed) {
      const point = readPoint();
      if (point) native.webContents.sendInputEvent({type:'mouseMove',...point});
      await new Promise(resolve => window.requestAnimationFrame(resolve));
      const next = readPoint();
      if (point && next?.x === point.x && next.y === point.y) return point;
    }
    return null;
  }

  /** Navigate by a real pointer click on the visible related fixture occurrence. */
  async function navigate(name) {
    const destination = path(name);
    const readCandidates=()=>[...canvas().querySelectorAll('.kplex-thought[data-kplex-path]')].filter(node => node.dataset.kplexPath === destination);
    const readPoint=()=>readCandidates().map(node=>point(node)).find(Boolean);
    const initial = await placePointer(readPoint);
    if (!initial) {
      c.progress={...c.progress,targetBounds:readCandidates().map(node=>node.getBoundingClientRect().toJSON()),canvas:canvas().getBoundingClientRect().toJSON()};
      throw Error('Fixture target is clipped or obstructed');
    }
    c.progress={...c.progress,destination,initial};
    return action('click', () => {
      const position=readPoint();
      if(!position)return false;
      sendPrimaryClick(position);
    }, () => centerPath() === destination);
  }

  /** Send the actual wheel gesture to the graph camera and observe its live transform. */
  function zoom(index) {
    const bounds = canvas().getBoundingClientRect(), x = Math.round(bounds.left+bounds.width/2), y = Math.round(bounds.top+bounds.height/2);
    const initial = camera().style.transform;
    return action('wheel', () => native.webContents.sendInputEvent({type:'mouseWheel',x,y,deltaY:index%2 ? -80 : 80,modifiers:['control']}),
      () => camera().style.transform !== initial);
  }

  /** Change roots through the actual saved-history button instead of calling a navigation API. */
  async function history(name) {
    const destination=path(name);
    const button=()=>[...host.view.contentEl.querySelectorAll('[data-kplex-history-path]')].find(row=>row.dataset.kplexHistoryPath===destination);
    if (!await placePointer(()=>button()&&point(button(),true))) throw Error('Fixture history button was not visible');
    return action('click',()=>{
      const position=point(button(),true);
      if(!position)throw Error('History button lost its native hit target');
      sendPrimaryClick(position);
    },()=>centerPath()===destination);
  }

  /** Drag empty canvas space with a real pointer; reverse each move to preserve the same scope. */
  function pan(index) {
    const before=camera().style.transform, dx=index%2?-40:40;
    const box=canvas().getBoundingClientRect();
    const points=[.2,.35,.65,.8].flatMap(horizontal=>[.2,.35,.65,.8].map(vertical=>({x:Math.round(box.left+box.width*horizontal),y:Math.round(box.top+box.height*vertical)})));
    const position=points.find(({x,y})=>{
      const hit=document.elementFromPoint(x,y);
      return (x+dx)>box.left&&(x+dx)<box.right&&canvas().contains(hit)
        &&!hit.closest('.kplex-thought,button,[data-kplex-gate],.kplex-zone-scroll,.kplex-find,.kplex-expanded-cluster');
    });
    if(!position)throw Error('No empty native pan target');
    const {x,y}=position;
    return action('pointerdown',()=>{
      native.webContents.sendInputEvent({type:'mouseMove',x,y});
      native.webContents.sendInputEvent({type:'mouseDown',x,y,button:'middle',clickCount:1});
      native.webContents.sendInputEvent({type:'mouseMove',x:x+dx,y,modifiers:['middleButtonDown']});
      native.webContents.sendInputEvent({type:'mouseUp',x:x+dx,y,button:'middle',clickCount:1});
    },()=>camera().style.transform!==before);
  }

  /** Scroll one measured dense native area, retaining the graph camera and canonical root. */
  async function scroll(index) {
    const area=[...canvas().querySelectorAll('.kplex-zone-scroll')].find(element=>element.scrollHeight>element.clientHeight+160);
    const position=area&&point(area,true);
    if(!position)throw Error('Dense fixture did not expose a real scroll area');
    const top=area.scrollTop, transform=camera().style.transform;
    try {
      return await action('wheel',()=>native.webContents.sendInputEvent({type:'mouseWheel',...position,deltaY:index%2?100:-100,deltaX:0,canScroll:true}),
        ()=>area.scrollTop!==top&&camera().style.transform===transform,area);
    } catch (error) {
      c.progress={...c.progress,scroll:{before:top,after:area.scrollTop,maximum:area.scrollHeight-area.clientHeight,
        connected:area.isConnected,transformBefore:transform,transformAfter:camera()?.style.transform}};
      throw error;
    }
  }

  /** Measure existing work counters around the idle presentation workload. */
  const work = () => ({...plugin.index.getSourceAcquisitionCounters(), fullBuilds:plugin.index.getSemanticPreparationDiagnostics().fullBuilds,
    pendingKnown:plugin.index.sourceAcquisition.getActivityState().pendingKnown,
    ...Object.fromEntries(Object.entries(observed).map(([name,count])=>[`observed.${name}`,count])), semanticRevision:plugin.index.getSemanticRevision()});

  /** Forward exact live calls while measuring admission, without replacing scheduler behavior. */
  function countCalls(owner, method, counter) {
    const original=owner[method], descriptor=Object.getOwnPropertyDescriptor(owner,method);
    if(typeof original!=='function')throw Error(`Missing measured method ${method}`);
    owner[method]=function(...args){observed[counter]++;return original.apply(this,args);};
    restoreObservers.push(()=>{if(descriptor)Object.defineProperty(owner,method,descriptor);else delete owner[method];});
  }

  /** Fixture creation and any resulting source work must finish before measured input. */
  async function waitForQuiet(phase) {
    let previous='', quietSince=performance.now(),lastDiagnostic=0;
    await until(() => {
      const activity = plugin.index.sourceAcquisition.getActivityState();
      const snapshot = plugin.index.getSnapshotPersistenceDiagnostics();
      const counters = JSON.stringify(work());
      // The five-minute edit-idle timer is inactive. Admit a timed sequence only while its
      // maximum sample budget fits before that deadline, and verify no writes during the sample.
      const saveCanOverlap = snapshot.pending && (snapshot.dueInMs === null || snapshot.dueInMs <= workloadDeadlineMs+2000);
      // On-demand leaves unrelated known-file events dormant. Each measured scope must be current,
      // and the before/after counters still reject any activity during presentation-only input.
      const {pendingKnown,...activeSource}=activity;
      const busy = Object.values(activeSource).some(Boolean) || (!plugin.index.isOnDemandMode() && pendingKnown>0) || plugin.index.hasActiveSemanticPreparation()
        || centers.some(name=>plugin.index.viewScopeCoverage(path(name)).pending)
        || plugin.index.hasPendingSourceAuthority() || saveCanOverlap || snapshot.active || plugin.index.getUrlIndexProgress().active;
      if (busy || previous !== counters) quietSince=performance.now();
      previous=counters;
      if(performance.now()-lastDiagnostic>=1000){
        lastDiagnostic=performance.now();
        const pass=plugin.index.sourceAcquisition.getRecoveryDiagnostics().pass;
        c.progress={phase,activity,snapshot:{pending:snapshot.pending,active:snapshot.active,dueInMs:snapshot.dueInMs},busy,inventory,
          sourcePass:pass&&{reason:pass.reason,visited:pass.visited,total:pass.total,phase:pass.phase,outcome:pass.outcome}};
      }
      return performance.now()-quietSince>=1000;
    }, `Source or cache work did not settle before ${phase}`, c.vaultName==='kplex-test'?235_000:90_000);
  }

  /** Exclude inter-workload drains and screenshot capture from frame, CPU and wall timings. */
  async function runSamples(name, input) {
    if(window.PerformanceObserver.supportedEntryTypes.includes('longtask')) {
      observer=new window.PerformanceObserver(list=>tasks.push(...list.getEntries().map(entry=>({workload:name,start:entry.startTime,duration:entry.duration}))));
      observer.observe({entryTypes:['longtask']});
    }
    previousFrame=undefined;frame=window.requestAnimationFrame(sampleFrame);
    const before=work(), cpu=process.cpuUsage?.(), start=performance.now();
    const snapshotBefore=plugin.index.getSnapshotPersistenceDiagnostics().writer;
    c.progress={phase:`timed-${name}`,inventory,completed:0};
    try {
      for(let i=0;i<c.samples;i++){
        const remaining=start+i*c.cadenceMs-performance.now();
        if(remaining>0)await new Promise(resolve=>window.setTimeout(resolve,remaining));
        samples[name].push(await input(i));c.progress.completed=i+1;
        if(performance.now()-start>workloadDeadlineMs)throw Error(`Timed ${name} exceeded its reserved snapshot-free window`);
      }
      const snapshotAfter=plugin.index.getSnapshotPersistenceDiagnostics().writer;
      if(JSON.stringify(snapshotBefore)!==JSON.stringify(snapshotAfter))throw Error(`Snapshot write overlapped timed ${name}`);
      return {before,after:work(),wallMs:performance.now()-start,cpuUs:cpu?process.cpuUsage(cpu):null};
    } finally {
      window.cancelAnimationFrame(frame);frame=undefined;
      if(observer){tasks.push(...observer.takeRecords().map(entry=>({workload:name,start:entry.startTime,duration:entry.duration})));observer.disconnect();observer=undefined;}
    }
  }

  try {
    if (!c.centers && app.vault.getAbstractFileByPath(fixture)) throw Error('Benchmark fixture path already exists');
    if (c.vaultName === 'kplex-test' && inventory < 2000) throw Error(`Scale vault contains only ${inventory} Markdown files`);
    if (c.mode && c.mode !== (plugin.index.isOnDemandMode() ? 'on-demand' : 'eager')) throw Error('Staged indexing mode mismatch');
    native.restore(); native.setBounds({x:20,y:20,width:1600,height:1000}); native.show();
    require('@electron/remote').app.focus({steal:true}); native.focus(); native.webContents.focus();
    workspace.leftSplit.collapse(); workspace.rightSplit.collapse();
    Object.assign(plugin.settings,{documentSyncMode:'off',sidecarOpen:false,followActiveFile:false,autoOpenCentralDocument:false,embedCentralNode:false,
      animationSpeed:0,allowAutozoom:true,groupRelations:false,showCrossLinks:true,showPageNodes:true,showInferredNodes:true,
      showTagNodes:false,showFolderNodes:false,graphDepth:1,graphLenses:[],applyPowerFilter:false});
    const anchors=[];
    workspace.iterateRootLeaves(leaf=>{
      if(leaf.view.containerEl.ownerDocument===document&&leaf.view.containerEl.getBoundingClientRect().width>0)anchors.push(leaf);
    });
    anchors.sort((a,b)=>b.view.containerEl.getBoundingClientRect().width-a.view.containerEl.getBoundingClientRect().width);
    if(anchors[0]){await workspace.revealLeaf(anchors[0]);workspace.setActiveLeaf(anchors[0],{focus:true});}
    host=workspace.getLeaf('tab');
    await host.setViewState({type:'k-plex-react-view',active:true});
    await workspace.revealLeaf(host); await host.view.waitUntilReady(); workspace.setActiveLeaf(host,{focus:true});
    host.view.documentSession.plexView.select('classic');
    await until(() => document.hasFocus() && !document.hidden && !plugin.isStartupInitializing(),'Foreground startup did not settle',90_000);
    const startup=plugin.getStartupDiagnostics();
    c.progress={phase:'fixture',inventory};
    if(c.centers){
      if(!centers.every(name=>app.vault.getFileByPath(name)))throw Error('Prepared scale vault is missing its established benchmark notes');
    }else{
      folder=await app.vault.createFolder(fixture);
      const field=plugin.settings.hierarchy.children[0];
      if (!field) throw Error('A child ontology field is required');
      const leaves=Array.from({length:c.density},(_,i)=>`Related ${String(i).padStart(3,'0')} with a long wrapping label`);
      for(const name of [...leaves,...centers]) {
        const children=centers.includes(name) ? [centers.find(other=>other!==name),...leaves] : [];
        const yaml=children.length ? `---\n${JSON.stringify(field)}: ${JSON.stringify(children.map(child=>`[[${path(child)}]]`))}\n---\n` : '';
        const file=await app.vault.create(path(name),`${yaml}# ${name}\n`);
        files.push(file); plugin.index.insertCreatedFile(file);
      }
    }
    for (const name of centers) releases.push(plugin.index.acquireSemanticDemand(path(name)));
    if (c.centers) {
      // The prepared scale vault may reopen with a missing saved center. Give each selected note
      // the same real foreground demand it would receive before timing a local transition.
      for (const name of centers) {
        const focus = path(name);
        plugin.notifyNavigation(focus, host);
        await until(() => centerPath() === focus && plugin.index.viewScopeCoverage(focus).prepared,
          'Foreground scale fixture scope unavailable', 60_000);
      }
    }
    await until(() => centers.every(name=>plugin.index.viewScopeCoverage(path(name)).prepared),'Exact fixture scopes unavailable',60_000);
    plugin.notifyNavigation(path(centers[0]),host);
    await until(() => centerPath()===path(centers[0]) && sceneCounts().nodes>1,'Initial native scene missing');
    await document.fonts.ready;
    const surface=[...plugin.actionSurfaceHosts].find(([,registration])=>registration.leaf===host)?.[0];
    const fit=async()=>{
      const result=await plugin.actionManager.dispatch({id:'view.fit',source:'internal',surfaceId:surface});
      if(result.status!=='completed')throw Error('Native fixture camera did not fit');
    };
    await fit();
    const firstCapture=await capture('center-a');
    await navigate(centers[1]);
    const secondCapture=await capture('center-b');
    if (firstCapture===secondCapture) throw Error('Different committed centers produced identical compositor images');
    await navigate(centers[0]);
    c.progress={phase:'warm-up',inventory};
    for(let i=0;i<12;i++)await navigate(centers[(i+1)%2]);
    for(let i=0;i<12;i++)await zoom(i);
    await fit();
    countCalls(app.vault,'read','vaultReads');countCalls(app.vault,'cachedRead','vaultReads');
    countCalls(plugin.index.metadataParser,'parse','metadataParses');
    countCalls(plugin.index,'acquireSemanticDemand','demandAcquisitions');countCalls(plugin,'saveSettings','settingsSaves');
    await waitForQuiet('navigation');
    const heapBefore=performance.memory?.usedJSHeapSize??null;
    const navigation = await runSamples('navigation',i=>navigate(centers[(i+1)%2]));
    await waitForQuiet('zoom');
    const zoomWork = await runSamples('zoom',zoom);
    const extra={};
    if(c.extended){
      await waitForQuiet('history');
      extra.history=await runSamples('history',()=>history(centers.find(name=>path(name)!==centerPath())));
      for(const [name,send]of [['pan',pan],['scroll',scroll]]){
        await waitForQuiet(name);
        extra[name]=await runSamples(name,send);
        if(JSON.stringify(extra[name].before)!==JSON.stringify(extra[name].after))throw Error(`${name} changed source or settings work`);
      }
    }
    const heapAfter=performance.memory?.usedJSHeapSize??null;
    if(JSON.stringify(zoomWork.before)!==JSON.stringify(zoomWork.after)) throw Error(`Zoom changed source work: ${JSON.stringify(zoomWork)}`);
    const os=require('node:os');
    return {inventory,fixtureFiles:c.centers?centers.length:files.length,density:c.centers?0:c.density,cadenceMs:c.cadenceMs,
      fixture:c.centers?'prepared-scale':'owned-synthetic', mode:plugin.index.isOnDemandMode()?'on-demand':'eager',inputPhase:c.frameAligned?'frame-aligned':'free-running',
      display:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio,theme:document.body.classList.contains('theme-dark')?'dark':'light',font:getComputedStyle(canvas()).fontFamily},
      host:{os:process.platform,release:os.release(),cpu:os.cpus()[0]?.model,logicalCpus:os.cpus().length,electron:process.versions.electron,chromium:process.versions.chrome,node:process.version},
      startup, captureHashes:[firstCapture,secondCapture], samples, frameIntervalsMs:frames, longTasks:tasks, heapBefore, heapAfter,
      resources:Object.fromEntries(Object.entries({navigation,zoom:zoomWork,...extra}).map(([name,{wallMs,cpuUs}])=>[name,{wallMs,cpuUs}])),
      work:{beforeNavigation:navigation.before,afterNavigation:navigation.after,beforeZoom:zoomWork.before,afterZoom:zoomWork.after,
        ...Object.fromEntries(Object.entries(extra).map(([name,{before,after}])=>[name,{before,after}]))}};
  } finally {
    const failures=[];
    /** Attempt restoration of every independently owned native resource even after a failure. */
    const clean=async(label,restore)=>{try{await restore();}catch(error){failures.push(`${label}: ${String(error)}`);}};
    await clean('measurement observers',()=>{if(frame!==undefined)window.cancelAnimationFrame(frame);observer?.disconnect();});
    for(const restore of restoreObservers.reverse())await clean('work counters',restore);
    for(const release of releases.reverse())await clean('source demand',release);
    await clean('test leaf',()=>host?.detach());
    await clean('settings and layout',async()=>{Object.assign(plugin.settings,originalSettings);await workspace.changeLayout(layout);});
    for(const file of files.reverse())if(app.vault.getFileByPath(file.path)===file)await clean('fixture file',()=>app.vault.delete(file,true));
    if(folder&&app.vault.getFolderByPath(fixture)===folder&&!folder.children.length)await clean('fixture folder',()=>app.vault.delete(folder,true));
    await clean('window bounds',()=>{native.setBounds(bounds);if(maximized)native.maximize();});
    await clean('settings bytes',async()=>{await plugin.settingsWriteQueue;await app.vault.adapter.write(plugin.manifest.dir+'/data.json',c.originalData);});
    if(failures.length){c.progress={...c.progress,cleanupErrors:failures};throw Error(failures.join('\n'));}
  }
}

const vaultName = process.env.KPLEX_TEST_VAULT_NAME;
if (!['kplex-test-small','kplex-test'].includes(vaultName)) throw Error('Expected a prepared disposable benchmark vault');
const target = validateTarget({vaultName, vaultPath:process.env.KPLEX_TEST_VAULT_PATH, configDir:process.env.KPLEX_TEST_CONFIG_DIR});
const density = Number(process.env.KPLEX_WEB_BENCH_DENSITY ?? 18);
const samples = Number(process.env.KPLEX_WEB_BENCH_SAMPLES ?? 30);
if (![6,18,72].includes(density) || !Number.isInteger(samples) || samples < 30 || samples > 120) throw Error('Use density 6, 18 or 72 and 30–120 samples');
const cadenceMs=Number(process.env.KPLEX_WEB_BENCH_CADENCE_MS??0);
if(!Number.isInteger(cadenceMs)||cadenceMs<0||cadenceMs>150)throw Error('Set input cadence to 0–150 ms');
const extended=process.env.KPLEX_WEB_BENCH_EXTENDED==='true';
if(extended&&(density!==72||vaultName!=='kplex-test-small'))throw Error('Extended scroll timing requires the dense Small fixture');
const centers=vaultName==='kplex-test'?['00 Start Here/K-Plex Help.md','00 Start Here/First 5 minutes.md']:undefined;
const inputs = {vaultName,density,samples,cadenceMs,extended,centers,mode:process.env.KPLEX_WEB_BENCH_MODE,frameAligned:process.env.KPLEX_WEB_BENCH_FRAME_ALIGNED==='true',reportDirectory:process.env.KPLEX_HOST_REPORT_DIR,
  originalData:readFileSync(join(target.pluginDir,'data.json'),'utf8')};
await runControlledProbe('web-runtime-performance',measureCompass,`Object.assign(c,${JSON.stringify(inputs)});`,
  ['src/ui/PlexGraph.tsx','src/ui/ThoughtNode.tsx','src/ui/App.tsx','src/ui/CentralNodeEditor.tsx','src/adapters/obsidian/embeddedMarkdownLeaf.ts'],{maximumMs:420_000});
