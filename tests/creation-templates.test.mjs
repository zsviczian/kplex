/** Actual template discovery/execution with native-shaped file identities and a controlled parser receipt. */
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import test from 'node:test';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';
import moment from 'moment';
import ts from 'typescript';
const previousWindow=globalThis.window;
globalThis.window={moment,setTimeout,clearTimeout};
const directory=mkdtempSync(join(tmpdir(),'kplex-template-execution-'));
test.after(()=>{rmSync(directory,{recursive:true,force:true});globalThis.window=previousWindow;});
const native=`export class TFile{constructor(path,body=''){this.path=path;this.extension=path.split('.').at(-1);this.body=body;this.stat={mtime:1,size:body.length};}}export class TFolder{constructor(path,children=[]){this.path=path;this.children=children;}}`;
await build({stdin:{resolveDir:process.cwd(),contents:`export * from './src/adapters/obsidian/creationTemplates';export {FileCreationAutomation} from './src/adapters/obsidian/fileCreationAutomation';export {TFile,TFolder} from 'obsidian';`},bundle:true,platform:'node',format:'esm',outfile:join(directory,'adapter.mjs'),plugins:[{name:'native',setup(b){b.onResolve({filter:/^obsidian$/},()=>({path:'obsidian',namespace:'native'}));b.onLoad({filter:/.*/,namespace:'native'},()=>({contents:native,resolveDir:process.cwd()}));}}]});
const api=await import(pathToFileURL(join(directory,'adapter.mjs')));
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b});return{promise,resolve,reject}};

/** Only direct folder metadata and exact paths are available; broad source/index access would fail. */
function fixture(body='---\ntitle: "{{title}}"\n---\nBody {{date:YYYY}}'){
 const template=new api.TFile('Templates/Selected.md',body),file=new api.TFile('Notes/Created.md'),files=new Map([[template.path,template],[file.path,file]]),events=[];
 const app={plugins:{plugins:{}},internalPlugins:{plugins:{templates:{instance:{options:{dateFormat:'YYYY-MM-DD',timeFormat:'HH:mm'}}}}},vault:{
  getFileByPath:path=>files.get(path)??null,read:async given=>{events.push('read:'+given.path);return given.body},
  process:async(given,mutate)=>{events.push('write:'+given.path);given.body=mutate(given.body)},
  getFolderByPath:path=>path==='Templates'?new api.TFolder(path,[template]):null,
 }};
 const unavailable=()=>Error('retired template or target'),unsupported=()=>Error('unsupported executable template');
 return{app,template,file,files,events,unavailable,unsupported};
}

/** Native Templater owns configuration, including the active note available as tp.config.active_file. */
function runningConfig(template_file,target_file,run_mode){return {template_file,target_file,run_mode};}

/** Exercise both actual host creation methods while keeping unrelated drawing/index branches unavailable. */
function nativeCreationMethod(name,dependencies){
 const source=ts.createSourceFile('main.ts',readFileSync(new URL('../src/main.ts',import.meta.url),'utf8'),ts.ScriptTarget.Latest,true);let expression;
 function visit(node){if(ts.isMethodDeclaration(node)&&node.name.getText(source)===name)expression=`${node.modifiers?.some(modifier=>modifier.kind===ts.SyntaxKind.AsyncKeyword)?'async ':''}function ${name}${node.getText(source).slice(node.getText(source).indexOf('('))}`;ts.forEachChild(node,visit);}visit(source);
 assert(expression,`Production method ${name} missing`);const output=ts.transpileModule(`const selected=${expression};`,{compilerOptions:{target:ts.ScriptTarget.ES2021,module:ts.ModuleKind.None}}).outputText;
 return Function(...Object.keys(dependencies),`${output};return selected;`)(...Object.values(dependencies));
}

/** The file system and template receipt remain real adapter operations; only folder timing is controlled. */
function nativeCreationFixture(){
 const f=fixture('Chosen body');let creates=0;
 f.app.vault.getAbstractFileByPath=path=>f.files.get(path)??null;
 f.app.vault.create=async(path,body)=>{creates++;const file=new api.TFile(path,body);f.files.set(path,file);return file};
 const owner={app:f.app,settings:{markdownTemplateFolder:'Templates'},unloading:false,translator:key=>key,drawingTemplateOptions:()=>null,
  managedCreatedPaths:new Map(),rememberManagedCreatedFile:file=>file,ensureFolderPath:async()=>{}};
 owner.fileCreationAutomation=new api.FileCreationAutomation(f.app,{waiting:()=>{},unavailable:()=> 'unsupported',cancelled:()=> 'retired'});
 const dependencies={prepareMarkdownTemplate:api.prepareMarkdownTemplate,markdownTemplateFiles:api.markdownTemplateFiles,normalizePath:path=>path,drawingAutomation:()=>null,MANAGED_CREATED_PATH_TTL_MS:1000,Notice:class{}};
 owner.createNewFileInFolder=nativeCreationMethod('createNewFileInFolder',dependencies);owner.createNativeFileInFolder=nativeCreationMethod('createNativeFileInFolder',dependencies);
 return {...f,owner,creates:()=>creates,close:()=>owner.fileCreationAutomation.dispose()};
}

test('discovery is folder-scoped, metadata-only, bounded and preserves case-distinct duplicate names',()=>{
 const a=new api.TFile('Templates/A/Note.md'),b=new api.TFile('Templates/B/Note.md'),upper=new api.TFile('Templates/A/NOTE.md');let reads=0;
 const root=new api.TFolder('Templates',[new api.TFolder('Templates/A',[a,upper]),new api.TFolder('Templates/B',[b]),new api.TFile('Templates/Drawing.excalidraw.md'),new api.TFile('Templates/Binary.png')]);
 const app={vault:{getFolderByPath:path=>{assert.equal(path,'Templates');return root},read:()=>{reads++;throw Error('Discovery executed a template')}}};
 assert.deepEqual(api.markdownTemplateFiles(app,'Templates').map(f=>f.path).sort(),[a.path,b.path,upper.path].sort());assert.equal(reads,0);
 assert(api.markdownTemplateFiles(app,'Templates',2).length<=2);assert.deepEqual(api.markdownTemplateFiles(app,''),[]);
});

test('explicit vault-root template discovery is metadata-only and bounded while blank disables discovery',()=>{
 const files=Array.from({length:4097},(_,i)=>new api.TFile(`Root-${i}.md`)),root=new api.TFolder('/',files);let roots=0;
 const app={vault:{getRoot:()=>{roots++;return root},getFolderByPath:()=>assert.fail('Vault root requires its native root identity'),read:()=>assert.fail('Discovery must not read note bodies')}};
 assert.deepEqual(api.markdownTemplateFiles(app,''),[]);assert.deepEqual(api.markdownTemplateFiles(app,'  '),[]);assert.equal(roots,0);
 const selected=api.markdownTemplateFiles(app,'/');assert.equal(selected.length,4096);assert(selected.every(file=>files.includes(file)));assert(!selected.includes(files[4096]));
 assert.equal(api.markdownTemplateFiles(app,'/',2).length,2);assert.equal(roots,2);
});

test('core template variables use the chosen note and one captured local clock without parsing arbitrary syntax',()=>{
 const now=new Date(2035,2,4,5,6).getTime();
 assert.equal(api.expandMarkdownTemplate('{{title}} {{date}} {{time}} {{date:YYYY}} {{other}}','Selected',{dateFormat:'YYYY-MM-DD'},now),'Selected 2035-03-04 05:06 2035 {{other}}');
});

test('preparing a Markdown template reads it once but executes nothing before the exact file is created',async()=>{
 const f=fixture(),run=await api.prepareMarkdownTemplate(f.app,f.template,'Chosen',()=>true,f.unavailable,f.unsupported);
 assert.deepEqual(f.events,['read:Templates/Selected.md']);assert.equal(f.file.body,'');await run(f.file);
 assert.match(f.file.body,/title: "Chosen"/);assert(!f.file.body.includes('{{'));assert.deepEqual(f.events,['read:Templates/Selected.md','write:Notes/Created.md']);
});

test('missing executable capability is refused before creation rather than copying unevaluated code',async()=>{
 const f=fixture('---\nvalue: <% tp.date.now() %>\n---');
 await assert.rejects(api.prepareMarkdownTemplate(f.app,f.template,'Chosen',()=>true,f.unavailable,f.unsupported),/unsupported/);
 assert.equal(f.file.body,'');assert(!f.events.some(e=>e.startsWith('write:')));
});

test('explicit Templater execution runs the selected parser once and ends its task only after text is written',async()=>{
 const f=fixture('---\nselected: <% value %>\n---\n<% body %>'),gate=deferred();let calls=0;
 f.app.plugins.plugins['templater-obsidian']={templater:{
  create_running_config:runningConfig,
  start_templater_task:path=>f.events.push('start:'+path),end_templater_task:async path=>f.events.push('end:'+path),
  parse_template:async(config,content)=>{calls++;assert.equal(config.template_file,f.template);assert.equal(config.target_file,f.file);assert.equal(config.run_mode,0);await gate.promise;return content.replace('<% value %>','ready').replace('<% body %>','Rendered');},
 }};
 const run=await api.prepareMarkdownTemplate(f.app,f.template,'Chosen',()=>true,f.unavailable,f.unsupported),work=run(f.file);
 assert.equal(calls,1);assert.equal(f.file.body,'');gate.resolve();await work;assert.match(f.file.body,/selected: ready/);assert.match(f.file.body,/Rendered/);
 assert(f.events.indexOf('write:'+f.file.path)<f.events.indexOf('end:'+f.file.path));assert.equal(calls,1);
});

test('template rename/replacement/edit and owner retirement cannot write into a stale selected identity',async()=>{
 for(const change of ['rename','replacement','edit','retire']){
  const f=fixture();let live=true;const run=await api.prepareMarkdownTemplate(f.app,f.template,'Chosen',()=>live,f.unavailable,f.unsupported);
  if(change==='rename')f.template.path='Templates/Moved.md';if(change==='replacement')f.files.set(f.template.path,new api.TFile(f.template.path));if(change==='edit')f.template.stat.mtime++;if(change==='retire')live=false;
  await assert.rejects(run(f.file),/retired/);assert.equal(f.file.body,'');
 }
});

test('a delayed parser cannot overwrite concurrent text or a replaced created file',async()=>{
 for(const replace of [false,true]){
  const f=fixture('<% body %>'),gate=deferred();let ended=0;
  f.app.plugins.plugins['templater-obsidian']={templater:{create_running_config:runningConfig,start_templater_task(){},end_templater_task:async()=>{ended++},parse_template:async()=>{await gate.promise;return 'Template';}}};
  const run=await api.prepareMarkdownTemplate(f.app,f.template,'Chosen',()=>true,f.unavailable,f.unsupported),work=run(f.file);
  if(replace)f.files.set(f.file.path,new api.TFile(f.file.path));else f.file.body='Concurrent edit';gate.resolve();await assert.rejects(work,/retired/);
  assert.equal(f.file.body,replace?'':'Concurrent edit');assert.equal(ended,1);
 }
});

test('properties-only and body templates preserve their exact selected content; errors do not publish partial text',async()=>{
 for(const body of ['---\nselected: true\n---\n','Plain body']){const f=fixture(body),run=await api.prepareMarkdownTemplate(f.app,f.template,'Chosen',()=>true,f.unavailable,f.unsupported);await run(f.file);assert.equal(f.file.body,body);}
 const f=fixture('<% fail %>');let ended=0;f.app.plugins.plugins['templater-obsidian']={templater:{create_running_config:runningConfig,start_templater_task(){},end_templater_task:async()=>{ended++},parse_template:async()=>{throw Error('Template failed')}}};
 const run=await api.prepareMarkdownTemplate(f.app,f.template,'Chosen',()=>true,f.unavailable,f.unsupported);await assert.rejects(run(f.file),/Template failed/);assert.equal(f.file.body,'');assert.equal(ended,1);
});

test('selected Templater uses its native running configuration including the active note',async()=>{
 const f=fixture('<% tp.config.active_file.path %>'),active=new api.TFile('Context.md');let configs=0;
 const engine={create_running_config(template,target,mode){assert.equal(this,engine);configs++;return {...runningConfig(template,target,mode),active_file:active}},start_templater_task(){},async end_templater_task(){},
  async parse_template(config){assert.equal(config.active_file,active);return config.active_file.path}};
 f.app.plugins.plugins['templater-obsidian']={templater:engine};
 const run=await api.prepareMarkdownTemplate(f.app,f.template,'Chosen',()=>true,f.unavailable,f.unsupported);await run(f.file);
 assert.equal(configs,1);assert.equal(f.file.body,active.path);
});

test('replaced Templater engine cannot execute or publish a captured explicit plan',async()=>{
 for(const replaceDuringParse of [false,true]){
  const f=fixture('<% body %>'),gate=deferred();let parsed=0,ended=0;
  const engine={create_running_config:runningConfig,start_templater_task(){},async end_templater_task(){ended++},async parse_template(){parsed++;await gate.promise;return 'Old engine output'}};
  const plugin={templater:engine};f.app.plugins.plugins['templater-obsidian']=plugin;
  const run=await api.prepareMarkdownTemplate(f.app,f.template,'Chosen',()=>true,f.unavailable,f.unsupported);
  let work;if(replaceDuringParse)work=run(f.file);
  plugin.templater={...engine};if(!replaceDuringParse)work=run(f.file);gate.resolve();
  await assert.rejects(work,/retired/);assert.equal(f.file.body,'');assert.equal(parsed,replaceDuringParse?1:0);assert.equal(ended,replaceDuringParse?1:0);
 }
});

test('executable templates require the native running-configuration capability before creation',async()=>{
 const f=fixture('<% body %>');f.app.plugins.plugins['templater-obsidian']={templater:{start_templater_task(){},async end_templater_task(){},async parse_template(){assert.fail('Incomplete native engine was executed')}}};
 await assert.rejects(api.prepareMarkdownTemplate(f.app,f.template,'Chosen',()=>true,f.unavailable,f.unsupported),/unsupported/);assert.equal(f.file.body,'');
});

test('native parser rename and move preserve the exact created identity and publish output once',async()=>{
 for(const destination of ['Notes/Renamed.md','Moved/Created.md']){
  const f=fixture('<% rename or move %>'),originalPath=f.file.path;let parsed=0;
  f.app.plugins.plugins['templater-obsidian']={templater:{create_running_config:runningConfig,start_templater_task:path=>f.events.push('start:'+path),async end_templater_task(path){f.events.push('end:'+path)},
   async parse_template(){parsed++;f.files.delete(originalPath);f.file.path=destination;f.files.set(destination,f.file);return 'Selected output'}}};
  const run=await api.prepareMarkdownTemplate(f.app,f.template,'Chosen',()=>true,f.unavailable,f.unsupported);await run(f.file);
  assert.equal(parsed,1);assert.equal(f.file.body,'Selected output');assert.equal(f.files.get(destination),f.file);
  assert.deepEqual(f.events,['read:'+f.template.path,'start:'+originalPath,'write:'+destination,'end:'+originalPath]);
 }
});

test('parser relocation rejects a replacement at its current path and preserves concurrent text',async()=>{
 for(const change of ['replacement','concurrent-text']){
  const f=fixture('<% move %>'),originalPath=f.file.path;
  f.app.plugins.plugins['templater-obsidian']={templater:{create_running_config:runningConfig,start_templater_task(){},async end_templater_task(){},
   async parse_template(){f.files.delete(originalPath);f.file.path='Moved/Created.md';f.files.set(f.file.path,f.file);
    if(change==='replacement')f.files.set(f.file.path,new api.TFile(f.file.path,'Foreign text'));else f.file.body='Concurrent text';return 'Selected output'}}};
  const run=await api.prepareMarkdownTemplate(f.app,f.template,'Chosen',()=>true,f.unavailable,f.unsupported);await assert.rejects(run(f.file),/retired/);
  assert.equal(f.files.get(f.file.path).body,change==='replacement'?'Foreign text':'Concurrent text');assert.equal(f.file.body,change==='replacement'?'':'Concurrent text');
 }
});

for(const change of ['source-folder','unload','source-rename','source-revision','source-replacement','caller-retired']){
 test(`native creation revalidates ${change} after its awaited folder creation`,async()=>{
  const f=nativeCreationFixture();let current=true;
  try{
   f.owner.ensureFolderPath=async()=>{await Promise.resolve();
    if(change==='source-folder')f.owner.settings.markdownTemplateFolder='Other';if(change==='unload')f.owner.unloading=true;
    if(change==='source-rename')f.template.path='Templates/Renamed.md';if(change==='source-revision')f.template.stat.mtime++;
    if(change==='source-replacement')f.files.set(f.template.path,new api.TFile(f.template.path));if(change==='caller-retired')current=false;
   };
   await assert.rejects(f.owner.createNewFileInFolder('Created','markdown','Parent',()=>current,f.template.path),/endpointChanged/);
   assert.equal(f.creates(),0);assert.equal(f.files.has('Parent/Created.md'),false);
  }finally{f.close();}
 });
}

test('a parser failure after physical creation preserves the exact partial file and rejected receipt',async()=>{
 const f=nativeCreationFixture();let parses=0;
 class Templater{
  static async on_file_creation(){assert.fail('Selected explicit template must replace automatic parsing')}
  create_running_config(...args){return runningConfig(...args)}start_templater_task(){}async end_templater_task(){}
  async parse_template(){parses++;throw Error('Selected parse failed')}
 }
 f.template.body='<% fail %>';f.template.stat.size=f.template.body.length;const engine=new Templater();f.app.plugins.plugins['templater-obsidian']={templater:engine};
 const create=f.app.vault.create;f.app.vault.create=async(...args)=>{const file=await create(...args);void Templater.on_file_creation(engine,f.app,file);return file};
 try{
  await assert.rejects(f.owner.createNewFileInFolder('Created','markdown','Parent',()=>true,f.template.path),error=>error.file===f.files.get('Parent/Created.md')&&error.cause.message==='Selected parse failed');
  assert.equal(f.creates(),1);assert.equal(parses,1);assert.equal(f.files.get('Parent/Created.md').body,'');
  await assert.rejects(f.owner.fileCreationAutomation.wait(f.files.get('Parent/Created.md')),/Selected parse failed/);
 }finally{f.close();}
});
