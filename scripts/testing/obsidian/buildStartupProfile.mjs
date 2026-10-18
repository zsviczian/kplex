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
const root=resolve(fileURLToPath(new URL('../../..',import.meta.url)));
const output=process.env.KPLEX_PROFILE_OUTPUT,mode=process.env.KPLEX_PROFILE_MODE??'detailed';
const cpuProfile=process.env.KPLEX_PROFILE_CPU==='true';
if(cpuProfile&&mode!=='detailed')throw Error('CPU sampling is diagnostic-only; primary counts builds remain unchanged');
const ref=process.argv.find(/** Require an immutable explicit source checkpoint. */ arg=>arg.startsWith('--baseline-ref='))?.split('=')[1];
if(!output||!['detailed','counts'].includes(mode)||ref&&!/^[a-f0-9]{7,40}$/.test(ref))throw Error('Set KPLEX_PROFILE_OUTPUT and mode detailed/counts; use an immutable baseline hash');
if(existsSync(output))throw Error('Profile output exists; never replace earlier evidence');
/** Read committed identity/source without changing the shared branch, index or runtime tree. */
function git(...args){const r=spawnNativeSync('git',args,{cwd:root,encoding:'utf8',timeout:10000,maxBuffer:8*1024*1024});if(r.error||r.status!==0)throw Error('Source identity unavailable');return r.stdout;}
const mappings=new Map();
if(ref)for(const path of git('ls-tree','-r','--name-only',ref,'src').trim().split('\n'))if(/\.tsx?$/.test(path))mappings.set(resolve(root,path),git('show',`${ref}:${path}`));
const original=mappings.get(resolve(root,'src/main.ts'))??readFileSync(join(root,'src/main.ts'),'utf8');
const begin='this.startupDiagnostics.begin((window as Window & { kplexStartupDiagnosticsEnabled?: boolean }).kplexStartupDiagnosticsEnabled === true);';
const attach='this.index = new GraphIndex(this);';
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
const main=`import {createStartupResourceProbe} from '../scripts/testing/obsidian/startupResources.mjs';\nimport {GraphBuilder as StartupProfileGraphBuilder} from './index/GraphBuilder';\n`+original.replace(begin,install).replace(attach,attach+'\n    window.kplexStartupResources.attach(this.index,StartupProfileGraphBuilder);');
mappings.set(resolve(root,'src/main.ts'),main);
const result=await esbuild.build({absWorkingDir:root,banner:{js:'/* K-Plex - generated bundle */'},entryPoints:['src/main.ts'],bundle:true,
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
const sourcePaths=ref?[...mappings.keys()]:git('ls-files','src').trim().split('\n').filter(path=>/\.tsx?$/.test(path)).map(path=>resolve(root,path));
const identity={sourceCommit:ref??git('rev-parse','HEAD').trim(),sourceDirty:!ref&&Boolean(git('status','--porcelain','--','src').trim()),mode,node:process.version,testOnly:true,cpuProfile,cpuProfileMethod:cpuProfile?'bounded-native-cli-cdp-windows':null,samplingIntervalMicroseconds:null,hardeningEdits:cpuProfile?hardeningEdits:[],
 semantics:'Native process CPU/IDB counters and bounded resource observations; no source/graph authority, settings, scheduling, watchdog or cache changes. Counts mode keeps detailed StartupDiagnostics disabled.',
 sha256:createHash('sha256').update(code).digest('hex'),probeSha256:createHash('sha256').update(readFileSync(join(root,'scripts/testing/obsidian/startupResources.mjs'))).digest('hex'),
 source:Object.fromEntries(sourcePaths.map(/** Pin every provided source, including uncommitted inputs; the commit alone is insufficient for a dirty build. */ path=>[relative(root,path).split(sep).join('/'),createHash('sha256').update(mappings.get(path)??readFileSync(path)).digest('hex')]))};
writeFileSync(join(output,'identity.json'),JSON.stringify(identity,null,2)+'\n');console.log(JSON.stringify({sourceCommit:identity.sourceCommit,mode,sha256:identity.sha256,output}));
