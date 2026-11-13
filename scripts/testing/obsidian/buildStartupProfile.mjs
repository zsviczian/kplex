/**
 * Build explicitly test-only startup resource artifacts without editing shipping source or dist.
 * Exact production build options/hardening are retained; injected observation is restricted to
 * the two authorized disposable vaults. Optional source maps support bounded diagnostic CPU
 * samples through the existing native CLI/CDP owner; primary counts builds retain their options. Immutable baseline source overrides cover every src file.
 */
import esbuild from 'esbuild';
import {builtinModules} from 'node:module';
import {createHash} from 'node:crypto';
import {existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {join,relative,resolve,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnNativeSync} from './processTools.mjs';
import ts from 'typescript';

/** Refuse changed or duplicated observation boundaries instead of silently profiling another path. */
export function replaceProfileAnchor(source, anchor, replacement) {
 if(source.split(anchor).length!==2)throw Error('Startup observation boundary changed: '+anchor);
 return source.replace(anchor,replacement);
}

/** Instrument the exact class method/function body without changing return, throw or await behavior. */
function profileBody(source, className, name, phase) {
 const file=ts.createSourceFile('profile.ts',source,ts.ScriptTarget.Latest,true),matches=[];
 function visit(node){
  if(className&&ts.isClassDeclaration(node)&&node.name?.text===className){
   for(const member of node.members)if((name==='constructor'?ts.isConstructorDeclaration(member):ts.isMethodDeclaration(member)&&member.name.getText(file)===name)&&member.body)matches.push(member.body);
  }else if(!className&&ts.isFunctionDeclaration(node)&&node.name?.text===name&&node.body)matches.push(node.body);
  ts.forEachChild(node,visit);
 }
 visit(file);if(matches.length!==1)throw Error('Startup method boundary changed: '+className+'.'+name);
 const body=matches[0],start=body.getStart(file)+1,end=body.end-1;
 return source.slice(0,start)+`\n__kplexInitiation.mark(${JSON.stringify(phase+':enter')});try {`+source.slice(start,end)+`\n} finally {__kplexInitiation.mark(${JSON.stringify(phase+':exit')});${phase==='onload'?'__kplexInitiation.finish();':''}}\n`+source.slice(end);
}

/** One finite lexical recorder; only onload publishes its test-only controller to the selected vault. */
export const initiationBanner=`const __kplexInitiation=(()=>{const events=[],origin=performance.now(),cpuOrigin=require('process').cpuUsage();let active=true,dropped=0;const mark=phase=>{if(!active)return;if(events.length===128){dropped++;return;}const cpu=require('process').cpuUsage(cpuOrigin);events.push({phase,ms:performance.now()-origin,userUs:cpu.user,systemUs:cpu.system});};return{mark,finish(){active=false;},snapshot(){return{timeOrigin:performance.timeOrigin,origin,active,dropped,events:events.map(event=>({...event}))};}}})();__kplexInitiation.mark('module-eval:enter');`;
export const initiationFooter="__kplexInitiation.mark('module-eval:exit');";

/** Add source-only phase receipts; no native registrations, settings or index admission are deferred. */
export function instrumentInitiationSources(sources) {
 let {main,settings,graphIndex,indexedDb}=sources;
 const settingsRegistration=main.includes('this.addSettingTab(tab);')?'this.addSettingTab(tab);':'this.addSettingTab(this.settingsTab);';
 main=replaceProfileAnchor(main,'export default class KplexPlugin extends Plugin {',`export default class KplexPlugin extends Plugin {
 constructor(...args: ConstructorParameters<typeof Plugin>) {__kplexInitiation.mark('constructor:enter');super(...args);__kplexInitiation.mark('constructor:exit');}`);
 main=replaceProfileAnchor(main,'async onload(): Promise<void> {',`async onload(): Promise<void> {
 if(!['kplex-test','kplex-test-small'].includes(this.app.vault.getName()))throw Error('Disposable startup profile only');
 const profileWindow=window as Window & {kplexStartupInitiation?: typeof __kplexInitiation};
 const previousProfile=profileWindow.kplexStartupInitiation;profileWindow.kplexStartupInitiation=__kplexInitiation;
 this.register(()=>{if(profileWindow.kplexStartupInitiation===__kplexInitiation){if(previousProfile===undefined)delete profileWindow.kplexStartupInitiation;else profileWindow.kplexStartupInitiation=previousProfile;}});`);
 for(const [anchor,phase]of [
  ['this.translator = createObsidianTranslator();','translator'],
  ['const ownData: unknown = await this.loadData();','loadData'],
  [settingsRegistration,'addSettingTab'],
  ['this.app.workspace.onLayoutReady(() => {','layout-callback-registration'],
 ]){
  if(phase==='layout-callback-registration')main=replaceProfileAnchor(main,anchor,`__kplexInitiation.mark('layout-callback:registered');${anchor}__kplexInitiation.mark('layout-callback:enter');`);
  else main=replaceProfileAnchor(main,anchor,`__kplexInitiation.mark('${phase}:enter');${anchor}__kplexInitiation.mark('${phase}:exit');`);
 }
 main=profileBody(main,'KplexPlugin','initializeActions','actions');
 main=profileBody(main,'KplexPlugin','onload','onload');
 settings=profileBody(settings,'KplexSettingTab','getSettingDefinitions','settings-definitions');
 settings=profileBody(settings,null,'migrateAndMergeSettings','settings-migration');
 graphIndex=profileBody(graphIndex,'GraphIndex','constructor','GraphIndex');
 indexedDb=profileBody(indexedDb,'KplexIndexedDbCache','clearLegacyLocalStorage','legacy-localStorage');
 return{main,settings,graphIndex,indexedDb};
}

async function buildStartupProfile(){
const root=resolve(fileURLToPath(new URL('../../..',import.meta.url)));
const output=process.env.KPLEX_PROFILE_OUTPUT,mode=process.env.KPLEX_PROFILE_MODE??'detailed';
const cpuProfile=process.env.KPLEX_PROFILE_CPU==='true';
if(cpuProfile&&mode!=='detailed')throw Error('CPU sampling is diagnostic-only; primary counts builds remain unchanged');
const ref=process.argv.find(/** Require an immutable explicit source checkpoint. */ arg=>arg.startsWith('--baseline-ref='))?.split('=')[1];
if(!output||!['detailed','counts','initiation'].includes(mode)||ref&&!/^[a-f0-9]{7,40}$/.test(ref))throw Error('Set KPLEX_PROFILE_OUTPUT and mode detailed/counts/initiation; use an immutable baseline hash');
if(existsSync(output))throw Error('Profile output exists; never replace earlier evidence');
/** Read committed identity/source without changing the shared branch, index or runtime tree. */
function git(...args){const r=spawnNativeSync('git',args,{cwd:root,encoding:'utf8',timeout:10000,maxBuffer:8*1024*1024});if(r.error||r.status!==0)throw Error('Source identity unavailable');return r.stdout;}
const mappings=new Map();
if(ref){for(const path of git('ls-tree','-r','--name-only',ref,'src').trim().split('\n'))if(/\.tsx?$/.test(path))mappings.set(resolve(root,path),git('show',`${ref}:${path}`));}
else {for(const path of git('ls-files','src').trim().split('\n').filter(path=>/\.tsx?$/.test(path)))mappings.set(resolve(root,path),readFileSync(join(root,path),'utf8'));}
const sourceOriginals=new Map(mappings);
const original=mappings.get(resolve(root,'src/main.ts'))??readFileSync(join(root,'src/main.ts'),'utf8');
const begin='this.startupDiagnostics.begin((window as Window & { kplexStartupDiagnosticsEnabled?: boolean }).kplexStartupDiagnosticsEnabled === true);';
const currentAttach='this.index = new GraphIndex(this, this.app, true, this.startupIndexPolicy.mode);';
const attach=original.includes(currentAttach)?currentAttach:'this.index = new GraphIndex(this);';
if(original.split(begin).length!==2||original.split(attach).length!==2)throw Error('Startup observation boundary changed; review injection');
const install=`${begin.replace('=== true','=== true || '+(mode==='detailed'))}
    if (!['kplex-test','kplex-test-small'].includes(this.app.vault.getName())) throw Error('Disposable startup profile only');
    window.kplexStartupResources?.stop();
    window.kplexStartupResources = createStartupResourceProbe({
      phase: /** Low-instrumentation runs avoid per-request diagnostic projection; detailed runs reuse existing phases. */ () => { if(${mode!=='detailed'})return 'all';const s=this.startupDiagnostics.progress('source'),h=this.startupDiagnostics.progress('hydration'); return s&&s.phase!=='complete'?'source-'+s.phase:'hydration-'+(h?.phase??'initialization'); },
      now: /** Retain the existing renderer clock. */ () => performance.now(), cpu: /** Read native process CPU, not await duration. */ () => require('process').cpuUsage(),
      cpuProcess: {pid: require('process').pid, type: require('process').type}, detailed: ${mode==='detailed'},
      databaseName: 'k-plex-index-v1-'+[...new TextEncoder().encode(this.app.vault.getName())].map(/** Match the existing cache name without exposing it in reports. */ n=>n.toString(16).padStart(2,'0')).join('').slice(0,96),
    });
    const startupResourceProbe=window.kplexStartupResources;
    this.register(/** Retire this exact test observer on unload even when CLI cleanup is unavailable. */ () => {startupResourceProbe.stop();if(window.kplexStartupResources===startupResourceProbe)delete window.kplexStartupResources;});`;
let main;
if(mode==='initiation'){
 const paths={settings:'src/settings.ts',graphIndex:'src/index/GraphIndex.ts',indexedDb:'src/index/IndexedDbCache.ts'};
 const inputs={main:original,...Object.fromEntries(Object.entries(paths).map(([key,path])=>[key,mappings.get(resolve(root,path))??readFileSync(join(root,path),'utf8')]))};
 const instrumented=instrumentInitiationSources(inputs);main=instrumented.main;
 for(const[key,path]of Object.entries(paths))mappings.set(resolve(root,path),instrumented[key]);
}else main=`import {createStartupResourceProbe} from '../scripts/testing/obsidian/startupResources.mjs';\nimport {GraphBuilder as StartupProfileGraphBuilder} from './index/GraphBuilder';\n`+original.replace(begin,install).replace(attach,attach+'\n    window.kplexStartupResources.attach(this.index,StartupProfileGraphBuilder);');
mappings.set(resolve(root,'src/main.ts'),main);
const result=await esbuild.build({absWorkingDir:root,banner:{js:'/* K-Plex - generated bundle */'+(mode==='initiation'?'\n'+initiationBanner:'')},footer:mode==='initiation'?{js:initiationFooter}:undefined,entryPoints:['src/main.ts'],bundle:true,
 resolveExtensions:['.ts','.tsx','.js','.jsx','.css','.json'],external:['obsidian','electron','@codemirror/autocomplete','@codemirror/collab','@codemirror/commands','@codemirror/language','@codemirror/lint','@codemirror/search','@codemirror/state','@codemirror/view','@lezer/common','@lezer/highlight','@lezer/lr',...builtinModules],
 format:'cjs',target:'es2021',sourcemap:cpuProfile?'external':false,treeShaking:true,minify:true,write:false,outfile:'dist/main.js',plugins:[{name:'test-only-startup-resource-profile',
 /** Override source in memory only; package/dependency resolution remains the real build's. */
 setup(build){build.onLoad({filter:/[\\/]src[\\/].*\.tsx?$/},/** Supply only exact selected source content. */ args=>mappings.has(args.path)?{contents:mappings.get(args.path),loader:args.path.endsWith('.tsx')?'tsx':'ts'}:undefined);}}]});
const generated=result.outputFiles.find(file=>file.path.endsWith('main.js')).text,hardeningEdits=[];
const template='.createElement("template")';let previousLine=-1,lineDelta=0;
const code=generated.replace(new RegExp(`\\.createElement\\((["'])scr${'ipt'}\\1\\)`,'g'),/** Preserve exact source-map coordinates across the production hardening rewrite. */ (match,quote,offset)=>{
  const prefix=generated.slice(0,offset),line=prefix.split('\n').length-1,column=offset-prefix.lastIndexOf('\n')-1;
  if(line!==previousLine){previousLine=line;lineDelta=0;}
  hardeningEdits.push({line,afterColumn:column+lineDelta+template.length,delta:template.length-match.length});lineDelta+=template.length-match.length;return template;
});
mkdirSync(output,{recursive:true});writeFileSync(join(output,'main.js'),code);writeFileSync(join(output,'main.profile.ts'),main);
if(cpuProfile)writeFileSync(join(output,'main.js.map'),result.outputFiles.find(file=>file.path.endsWith('main.js.map')).contents);
const sourcePaths=[...sourceOriginals.keys()];
const identity={sourceCommit:ref??git('rev-parse','HEAD').trim(),sourceDirty:!ref&&Boolean(git('status','--porcelain','--','src').trim()),mode,node:process.version,testOnly:true,cpuProfile,cpuProfileMethod:cpuProfile?'bounded-native-cli-cdp-windows':null,samplingIntervalMicroseconds:null,hardeningEdits:cpuProfile?hardeningEdits:[],
 semantics:mode==='initiation'?'Test-only bounded lexical module/constructor/onload phase clock and process CPU receipts; no startup scheduling, native registrations, settings or cache changes. Banner excludes native compilation/file loading; time app.plugins.loadPlugin externally for the enclosing host interval.':'Native process CPU/IDB counters and bounded resource observations; no source/graph authority, settings, scheduling, watchdog or cache changes. Counts mode keeps detailed StartupDiagnostics disabled.',
 sha256:createHash('sha256').update(code).digest('hex'),probeSha256:createHash('sha256').update(readFileSync(join(root,'scripts/testing/obsidian/startupResources.mjs'))).digest('hex'),
 source:Object.fromEntries(sourcePaths.map(/** Pin the frozen original inputs separately from their test-only observation overlays. */ path=>[relative(root,path).split(sep).join('/'),createHash('sha256').update(sourceOriginals.get(path)).digest('hex')]))};
writeFileSync(join(output,'identity.json'),JSON.stringify(identity,null,2)+'\n');console.log(JSON.stringify({sourceCommit:identity.sourceCommit,mode,sha256:identity.sha256,output}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))await buildStartupProfile();
