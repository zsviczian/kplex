/** Exact-artifact #302/#124 desktop phone-emulation acceptance. Mode changes reload Obsidian,
 * so the Node owner reacquires the CLI/plugin and restores the original native workspace afterward.
 * This establishes native session routing and responsive desktop DOM, not physical mobile acceptance. */
import assert from 'node:assert/strict';
import {existsSync,readFileSync,writeFileSync,unlinkSync,mkdirSync,realpathSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {homedir} from 'node:os';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {Script} from 'node:vm';
import {acquireHostLock} from './hostLock.mjs';
import {runControlledProbe} from './controlledProbe.mjs';
import {validateTarget} from './runner.mjs';
import {nativeBatch270} from './nativeBatch270.mjs';
import {nativeDocumentSessions} from './nativeDocumentSessions.mjs';
import {obsidianCliExecutable,spawnNativeSync} from './processTools.mjs';

/** The selected Small vault must be the application's only live BrowserWindow. Never close or
 * reload another vault to obtain this proof; callers retain pending restoration when it fails. */
function phoneIsolation(app,expectedPath){
 const remote=require('@electron/remote'),current=remote.getCurrentWindow(),windows=remote.BrowserWindow.getAllWindows().filter(value=>!value.isDestroyed());
 const proof={path:app.vault.adapter.getBasePath(),vault:app.vault.getName(),count:windows.length,current:current.id,windows:windows.map(value=>value.id)};
 if(proof.vault!=='kplex-test-small'||expectedPath&&proof.path!==expectedPath||proof.count!==1||proof.windows[0]!==proof.current)throw Error('Phone emulation requires the isolated selected Small BrowserWindow: '+JSON.stringify(proof));
 return proof;
}

/** Actual palette callbacks and registered native view shells keep explicit tab opening separate
 * from the phone's generic sidebar route, including serialized workspace restoration. */
async function phone(app,c){
 c.phoneIsolation(app,c.phonePath);
 const f=c.fixture(app,c),cases=[],workspace=app.workspace;
 const native=require('@electron/remote').getCurrentWindow(),geometryRestores=[];
 // Recheck synchronously at every geometry call, including nativeBatch's deferred cleanup.
 for(const key of ['setMinimumSize','setContentSize','setBounds','maximize','unmaximize']){
  const original=native[key],descriptor=Object.getOwnPropertyDescriptor(native,key),guarded=function(...args){c.phoneIsolation(app,c.phonePath);return original.apply(this,args)};native[key]=guarded;
  geometryRestores.push(()=>{if(native[key]===guarded){if(descriptor)Object.defineProperty(native,key,descriptor);else delete native[key]}});
 }
 const own=leaf=>{if(!f.leaves.includes(leaf))f.leaves.push(leaf);return leaf;};
 const tabs=()=>workspace.getLeavesOfType('k-plex-react-view'),sidebars=()=>workspace.getLeavesOfType('k-plex-sidepanel-view');
 /** Read native serialized leaves without introducing a parallel workspace model. */
 const serializedLeaves=node=>!node||typeof node!=='object'?[]:[...(node.type==='leaf'?[node]:[]),...(node.children??[]).flatMap(serializedLeaves)];
 /** Dispatch the published command exactly as Obsidian's palette does. Availability stays pure. */
 const command=(id,checking)=>{const native=app.commands.commands['k-plex:'+id];f.check(typeof native?.checkCallback==='function','Native palette command '+id);return native.checkCallback(checking);};
 /** Only accepted navigation updates a specific native view's center. */
 const center=async(leaf,file)=>{f.p.notifyNavigation(file.path,leaf);await f.until(()=>f.p.documentSession(leaf)?.centerPath===file.path&&leaf.view.contentEl.querySelector('.kplex-role-center[data-kplex-path="'+file.path+'"]'),'Independent native center '+file.name);};
 /** Reacquire the constructor materialized by an actual native palette invocation. */
 const explicitTab=async(initializing=false)=>{const expected=initializing?Math.max(1,tabs().length):1;f.check(command('kplex-start',true)===true,'Phone explicit tab command availability');f.check(command('kplex-start',false)===true,'Phone palette accepted explicit tab');await f.until(()=>tabs().length===expected,'Phone native tab creation');const leaf=own(tabs()[0]);await leaf.view.waitUntilReady();f.check(leaf.view.getViewType()==='k-plex-react-view'&&workspace.getLeafById(leaf.id)===leaf,'Registered native tab identity');return leaf;};
 /** Repeated generic opening must reveal the sidebar without manufacturing a normal tab. */
 const genericSidebar=async()=>{const count=tabs().length;await f.p.activateView();await f.until(()=>sidebars().length===1,'Phone generic native sidebar');const leaf=own(sidebars()[0]);await leaf.view.waitUntilReady();f.check(leaf.view.getViewType()==='k-plex-sidepanel-view'&&tabs().length===count,'Generic phone route changed normal tabs');return leaf;};
 try{
  // A Markdown-only restored layout intentionally defers indexing until a real Plex opens.
  // Bootstrap through the published palette command before the fixture's current-index fence.
  await explicitTab(true);await f.initialize();f.check(app.isMobile===true,'Phone probe requires live Obsidian mobile emulation');
  const a=await f.note('Phone tab A','# Tab A\n'),b=await f.note('Phone sidebar B','# Sidebar B\n'),next=await f.note('Phone reopened C','# Reopened C\n');
  // Keep the initial palette canvas's real main group alive while creating the Markdown switch
  // target. Mobile getLeaf(true) may return null once the final native main leaf has detached.
  let mainSeed;workspace.iterateAllLeaves(leaf=>{if(!mainSeed&&leaf.view.containerEl.ownerDocument===document)mainSeed=leaf});
  f.check(mainSeed,'Initial palette canvas main group required for the native switching anchor');
  const anchor=own(workspace.createLeafInParent(mainSeed.parent,mainSeed.parent.children.length));await anchor.openFile(a,{active:true,state:{mode:'source'}});
  // Baseline Plex views are restored by nativeBatch's saved layout/session owner. Removing them
  // after the anchor opens proves each later command materializes its requested native type.
  for(const leaf of [...tabs(),...sidebars()])leaf.detach();
  for(const [width,height]of [[390,844],[844,390]]){
   const id=width<height?'portrait':'landscape';c.progress={phase:'phone-'+id};native.setMinimumSize(200,200);native.setContentSize(width,height);await f.focus(document);
   await f.until(()=>Math.abs(innerWidth-width)<2&&Math.abs(innerHeight-height)<2,'Phone '+id+' native viewport');
   // Use the same real profile-selection sentinel as actionDevices; do not replace Platform flags.
   const profiles=f.p.settings.layoutProfiles;let device;
   try{f.p.settings.layoutProfiles={...profiles,'desktop:leaf':{...profiles['desktop:leaf'],compactingFactor:2.01},'tablet:leaf':{...profiles['tablet:leaf'],compactingFactor:2.02},'mobile:leaf':{...profiles['mobile:leaf'],compactingFactor:2.03}};const value=f.p.getActiveLayoutProfile('leaf').compactingFactor;device=value===2.03?'phone':value===2.02?'tablet':value===2.01?'desktop':'unknown';}
   finally{f.p.settings.layoutProfiles=profiles;}
   f.check(device==='phone','Actual phone presentation classification: '+JSON.stringify({device,size:[innerWidth,innerHeight],mobile:app.isMobile}));
   const beforeAvailability=tabs().length+sidebars().length;
   f.check(command('kplex-start',true)===true,'Explicit palette tab hidden on phone');f.check(command('kplex-new-tab',true)===false,'Phone adjacent-group command enabled');f.check(command('kplex-open-popout',true)===false,'Phone popout command enabled');
   f.check(tabs().length+sidebars().length===beforeAvailability,'Palette availability mutated native surfaces');
   let tab=await explicitTab();await center(tab,a);let sidebar=await genericSidebar();await center(sidebar,b);
   const tabSession=f.p.documentSession(tab),sidebarSession=f.p.documentSession(sidebar);f.check(tabSession!==sidebarSession&&tabSession.centerPath===a.path,'Sidebar navigation changed the tab center');
   f.check(await genericSidebar()===sidebar,'Generic open did not reuse the native sidebar');f.check(await explicitTab()===tab&&sidebars()[0]===sidebar,'Repeated explicit command changed the native sidebar');
   await workspace.revealLeaf(anchor);workspace.setActiveLeaf(anchor,{focus:true});await workspace.revealLeaf(tab);workspace.setActiveLeaf(tab,{focus:true});await f.wait(100);
   f.check(tab.parent.activeTab===tab||workspace.activeLeaf===tab,'Native tab switching did not select the normal canvas');f.check(f.p.documentSession(tab)===tabSession&&tabSession.centerPath===a.path&&sidebarSession.centerPath===b.path,'Native tab switching mixed independent session centers');
   const serialized=structuredClone(workspace.getLayout()),mainRows=serializedLeaves(serialized.main),sidebarRows=[...serializedLeaves(serialized.left),...serializedLeaves(serialized.right)];
   const tabRow=mainRows.find(row=>row.id===tab.id),sidebarRow=sidebarRows.find(row=>row.id===sidebar.id);
   f.check(tabRow?.state?.type==='k-plex-react-view'&&sidebarRow?.state?.type==='k-plex-sidepanel-view','Native workspace serialized the requested types in their actual regions');
   f.check(tabRow.state.state?.plexSession?.centerPath===a.path&&sidebarRow.state.state?.plexSession?.centerPath===b.path,'Serialized native centers crossed surfaces');
   tab.detach();sidebar.detach();await workspace.changeLayout(serialized);await f.until(()=>tabs().length===1&&sidebars().length===1,'Phone serialized native views restored');
   tab=own(tabs()[0]);sidebar=own(sidebars()[0]);
   // Native layout restoration may retain DeferredViews, especially in a closed mobile sidebar.
   // Materialize these exact saved leaves before asking their registered Plex views for readiness.
   await tab.loadIfDeferred();await sidebar.loadIfDeferred();await tab.view.waitUntilReady();await sidebar.view.waitUntilReady();
   await f.until(()=>f.p.documentSession(tab)?.centerPath===a.path&&f.p.documentSession(sidebar)?.centerPath===b.path,'Serialized native independent centers restored');
   tab.detach();await f.until(()=>tabs().length===0,'Phone tab close');f.check(f.p.documentSession(sidebar).centerPath===b.path,'Closing tab changed sidebar center');tab=await explicitTab();await center(tab,next);f.check(f.p.documentSession(sidebar).centerPath===b.path,'Reopening tab changed sidebar center');
   sidebar.detach();await f.until(()=>sidebars().length===0,'Phone sidebar close');f.check(f.p.documentSession(tab).centerPath===next.path,'Closing sidebar changed tab center');sidebar=await genericSidebar();await center(sidebar,b);f.check(f.p.documentSession(tab).centerPath===next.path,'Reopening generic sidebar changed tab center');
   cases.push({id,status:'passed',viewport:[innerWidth,innerHeight],device,explicitPaletteTab:true,genericSidebar:true,splitUnavailable:true,popoutUnavailable:true,independentCenters:true,nativeTabSelection:true,serializedAndRestored:true,closeReopenIndependent:true});
   tab.detach();sidebar.detach();await f.until(()=>!tabs().length&&!sidebars().length,'Phone orientation fixture surfaces closed');
  }
  return{cases,startupEvidence:f.startupEvidence,limitations:'Desktop Obsidian mobile emulation only; no physical touch, iOS/Android WebView, attached keyboard, screen-reader or OS-level mobile acceptance.'};
 }catch(error){throw Error(String(error)+'; completed phone cases: '+JSON.stringify(cases));}
 finally{try{c.phoneIsolation(app,c.phonePath);await f.cleanup();}finally{geometryRestores.reverse().forEach(restore=>restore());}}
}

const target=validateTarget({vaultName:process.env.KPLEX_TEST_VAULT_NAME,vaultPath:process.env.KPLEX_TEST_VAULT_PATH,configDir:process.env.KPLEX_TEST_CONFIG_DIR});
const directory=process.env.KPLEX_HOST_REPORT_DIR;assert(directory,'Set KPLEX_HOST_REPORT_DIR');mkdirSync(directory,{recursive:true});
const userDataPath=process.env.KPLEX_OBSIDIAN_USER_DATA??(process.platform==='win32'?join(process.env.APPDATA,'obsidian'):process.platform==='darwin'?join(homedir(),'Library','Application Support','obsidian'):join(process.env.XDG_CONFIG_HOME??join(homedir(),'.config'),'obsidian'));
const configuration=[];
const lock=acquireHostLock({userDataPath});
const report={status:'running',startedAt:new Date().toISOString(),artifacts:{},isolation:[],limitations:'Desktop mobile emulation is not physical-mobile acceptance.'};let baseline,selectedPath,mutated=false,settled=true,restored=false;
/** All native launches use the standard console bridge, including owned UTF-8 scripts on Windows. */
function cli(command,...args){const result=spawnNativeSync(obsidianCliExecutable(),[`vault=${target.vaultName??process.env.KPLEX_TEST_VAULT_NAME}`,command,...args],{encoding:'utf8',timeout:30000,killSignal:'SIGKILL',maxBuffer:4*1024*1024});if(result.error||result.status!==0||/^Error:/m.test(result.stdout))throw Error(result.error?.message||result.stderr||result.stdout);return result.stdout.trim();}
/** Syntax-check every renderer expression before native delivery. */
function evaluate(code){new Script(code);return JSON.parse(cli('eval','code='+code).replace(/^=>\s*/,''));}
/** Mirror the restart driver's canonical-path and complete BrowserWindow inventory proof. */
function isolation(phase){const proof=evaluate('JSON.stringify(('+phoneIsolation.toString()+')(app,'+JSON.stringify(selectedPath)+'))');assert.equal(realpathSync(proof.path),target.vault,'CLI selected a different vault');selectedPath=proof.path;report.isolation.push({...proof,phase,at:Date.now()});writeFileSync(join(directory,'authoring-workspace-phone-owner.json'),JSON.stringify(report,null,2)+'\n');return proof;}
/** The proof and mutation share one renderer task, with no asynchronous gap before the write. */
function isolatedEvaluate(body,phase){isolation(phase);return evaluate('(()=>{const guard=()=>('+phoneIsolation.toString()+')(app,'+JSON.stringify(selectedPath)+');guard();'+body+'})()');}
/** Every emulation transition, including restoration, is independently isolated immediately before reload. */
async function transition(mobile,phase){isolation(phase);cli('eval','code=('+phoneIsolation.toString()+')(app,'+JSON.stringify(selectedPath)+');app.emulateMobile('+mobile+')');await ready();isolation(phase+' complete');}
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
/** Mode transitions intentionally reload; every readiness poll reacquires the live vault/plugin. */
async function ready(){const deadline=Date.now()+180000;let lastError;while(Date.now()<deadline){try{const value=evaluate('JSON.stringify({path:app.vault.adapter.getBasePath(),ready:!!app.plugins.plugins["k-plex"]?.actionManager})');assert.equal(resolve(value.path),target.vault);if(value.ready)return;}catch(error){lastError=String(error)}await wait(500)}throw Error('Phone-mode reload readiness: '+lastError);}
try{
 const root=resolve(fileURLToPath(new URL('../../..',import.meta.url))),hash=path=>createHash('sha256').update(readFileSync(path)).digest('hex');
 for(const name of ['main.js','manifest.json','styles.css']){const artifact=hash(join(root,'dist',name));assert.equal(hash(join(target.pluginDir,name)),artifact,'Installed exact-build artifact '+name);report.artifacts[name]=artifact;}
 await ready();isolation('before any mode or geometry write');baseline=evaluate('JSON.stringify((()=>{const p=app.plugins.plugins["k-plex"],w=require("@electron/remote").getCurrentWindow();if(app.setting.win||document.querySelector(".modal-container .modal,.modal-container .prompt")||window.kplexIndexingProbe)throw Error("Clean native Small vault required");return{mobile:app.isMobile,bounds:w.getBounds(),minimum:w.getMinimumSize(),maximized:w.isMaximized(),layout:app.workspace.getLayout(),settings:p.settings}})())');
 configuration.push(...[join(target.pluginDir,'data.json'),...['community-plugins.json','hotkeys.json','workspace.json','workspace-mobile.json'].map(name=>join(target.config,name))].map(path=>({path,bytes:existsSync(path)?readFileSync(path):null})));
 // Keep recovery inputs before a reload; a later isolation failure must not discard originals.
 report.recoveryInputs={native:join(directory,'phone-original-native.json'),configuration:join(directory,'phone-original-configuration.json')};writeFileSync(report.recoveryInputs.native,JSON.stringify(baseline,null,2)+'\n');writeFileSync(report.recoveryInputs.configuration,JSON.stringify(configuration.map(item=>({path:item.path,bytes:item.bytes?.toString('base64')??null})),null,2)+'\n');
 mutated=true;isolatedEvaluate('const w=require("@electron/remote").getCurrentWindow();w.unmaximize();guard();w.setMinimumSize(200,200);guard();w.setContentSize(390,844);return JSON.stringify(true);','initial native geometry');
 if(!baseline.mobile)await transition(true,'enter mobile emulation');
 isolation('before native phone fixture');
 const definitions='c.fixture='+nativeBatch270.toString()+';c.sessions='+nativeDocumentSessions.toString()+';c.phoneIsolation='+phoneIsolation.toString()+';c.phonePath='+JSON.stringify(selectedPath)+';c.allowOnDemandRoutingStartup=true;c.fixturePrefix="__kplex302phone_";c.originalData='+JSON.stringify(readFileSync(join(target.pluginDir,'data.json'),'utf8'))+';c.originalEnabled='+JSON.stringify(readFileSync(join(target.config,'community-plugins.json'),'utf8'))+';';
 const result=await runControlledProbe('authoring-workspace-phone',phone,definitions,['src/main.ts','src/adapters/obsidian/presentationEnvironment.ts','src/core/plex/viewPresentation.ts','scripts/testing/obsidian/authoringWorkspacePhone.mjs'],{maximumMs:900000});
 assert.equal(result.status,'passed',result.error);report.status='passed';
}catch(error){report.status='failed';report.error=String(error);process.exitCode=1;}
finally{
 if(mutated)try{
  await ready();isolation('before restoration');settled=!evaluate('JSON.stringify(Boolean(window.kplexIndexingProbe))');assert(settled,'Preserve unsettled native controller; do not reload its renderer or overwrite configuration');
  if(evaluate('JSON.stringify(app.isMobile)')!==baseline.mobile)await transition(baseline.mobile,'restore original emulation mode');
  isolation('before layout/settings/geometry restoration');
  evaluate('(async()=>{const guard=()=>('+phoneIsolation.toString()+')(app,'+JSON.stringify(selectedPath)+');guard();const p=app.plugins.plugins["k-plex"];p.settings='+JSON.stringify(baseline.settings)+';await p.saveSettings(false,false);await p.settingsWriteQueue;guard();await app.workspace.changeLayout('+JSON.stringify(baseline.layout)+');await p.settingsWriteQueue;guard();const w=require("@electron/remote").getCurrentWindow();w.setMinimumSize('+baseline.minimum[0]+','+baseline.minimum[1]+');guard();w.setBounds('+JSON.stringify(baseline.bounds)+');'+(baseline.maximized?'guard();w.maximize();':'')+'return JSON.stringify({mobile:app.isMobile,settings:JSON.stringify(p.settings)===JSON.stringify('+JSON.stringify(baseline.settings)+')})})()');
  await wait(2000);isolation('restoration verified');const actual=evaluate('JSON.stringify({mobile:app.isMobile,controllerRemoved:!window.kplexIndexingProbe,settings:app.plugins.plugins["k-plex"].settings})');assert.equal(actual.mobile,baseline.mobile);assert(actual.controllerRemoved);assert.deepEqual(actual.settings,baseline.settings);restored=true;report.cleanup='passed';
 }catch(error){report.status='failed';report.cleanupError=String(error);process.exitCode=1;}
 try{if(mutated&&settled&&restored){for(const item of configuration){isolation('before original configuration bytes');assert.equal(evaluate('JSON.stringify(app.isMobile)'),baseline.mobile,'Do not rewrite configuration under a different emulation mode');if(item.bytes)writeFileSync(item.path,item.bytes);else if(existsSync(item.path))unlinkSync(item.path);assert(item.bytes?readFileSync(item.path).equals(item.bytes):!existsSync(item.path),'Configuration bytes: '+item.path)}report.configurationBytesRestored=true;}}
 catch(error){restored=false;report.status='failed';report.configurationRestoreError=String(error);process.exitCode=1;}
 if(mutated&&!restored){report.pendingRestoration={reason:report.cleanupError??report.configurationRestoreError??'Native restoration incomplete',recoveryInputs:report.recoveryInputs,preserveFixtures:true};report.configurationBytesRestored=false;}
 report.completedAt=new Date().toISOString();writeFileSync(join(directory,'authoring-workspace-phone-owner.json'),JSON.stringify(report,null,2)+'\n');lock.release();
}
console.log(JSON.stringify({status:report.status,error:report.error,cleanupError:report.cleanupError,report:join(directory,'authoring-workspace-phone-owner.json')}));
