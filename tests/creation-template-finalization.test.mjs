/** Characterize the actual main creation/finalization chain, rather than mocking its legacy writes.
 * Native template execution and observer delivery remain separate integration acceptance. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import {build} from 'esbuild';

const source=ts.createSourceFile('main.ts',readFileSync('src/main.ts','utf8'),ts.ScriptTarget.Latest,true);
const names=new Set(['configuredDisplayNameField','writeCreatedNodeDisplayName','writeCreatedNodeAlias','finalizeCreatedNoteMetadata','createNewRelatedFileForOrigin']),methods=[];
/** Keep each real host method body and its call order; substitute only physical/native capabilities. */
const visit=node=>{if(ts.isMethodDeclaration(node)&&names.has(node.name.getText(source)))methods.push(node.getText(source));ts.forEachChild(node,visit)};
visit(source);assert.equal(methods.length,names.size);
const bundle=await build({stdin:{resolveDir:process.cwd(),loader:'ts',contents:`
 import {normalizeFieldName} from './src/core/contracts/fieldName';
 import {PartialRelatedFileError} from './src/adapters/obsidian/relatedFileOutcome';
 export {applyCreationProperties} from './src/adapters/obsidian/creationProperties';
 class Notice {constructor(..._args: unknown[]) {}}
 export class TemplateCreationHost {${methods.join('\n')}}
`},bundle:true,write:false,platform:'node',format:'cjs',plugins:[{name:'native-tag-parser',setup(builder){
 builder.onResolve({filter:/^obsidian$/},()=>({path:'native',namespace:'tags'}));
 builder.onLoad({filter:/.*/,namespace:'tags'},()=>({contents:'export const parseFrontMatterTags=()=>null;'}));
}}]});
const module={exports:{}};Function('module','exports',bundle.outputFiles[0].text)(module,module.exports);

/** Native creation supplies one durable template-backed file; only actual host finalization mutates its fields. */
function templateHost(frontmatter,nameFields='Name'){
 const host=new module.exports.TemplateCreationHost(),file={path:'New filename.md',extension:'md'},writes=[];
 Object.assign(host,{settings:{nameFields,commonNodeProperties:[{field:nameFields,visible:true,creationVisible:true}]},managedMetadataWrites:new Map(),
  pruneManagedMetadataWrites:()=>{},index:{withForegroundPriority:run=>run()},translator:key=>key,
  validateNoteFolderPath:()=>({folderPath:''}),validateRelatedNoteName:()=>({valid:true,stem:'New filename'}),createNewFileInFolder:async()=>file,
  mutateCreatedNodeMetadata:async(_file,fields,mutate)=>{writes.push([...fields]);mutate(frontmatter)}});
 return{host,file,writes};
}

test('an untouched common Name preserves the template value independently of the physical filename',async()=>{
 const frontmatter={Name:'Template name',TemplateKeep:'Template value'}, {host,file,writes}=templateHost(frontmatter);
 const created=await host.createNewRelatedFileForOrigin({},'New filename','markdown','', '', 'Template.md',false);
 assert.equal(created,file);assert.deepEqual(frontmatter,{Name:'Template name',TemplateKeep:'Template value'});assert.deepEqual(writes,[[]]);
});

test('composer policy keeps unset or disabled display/Alias fields absent instead of deriving values from the filename',async()=>{
 for(const nameFields of ['Name','aliases'])for(const creationVisible of [true,false]){
  const fm={TemplateKeep:'Template value'},{host,writes}=templateHost(fm,nameFields);host.settings.commonNodeProperties=[{field:nameFields,visible:false,creationVisible}];
  await host.createNewRelatedFileForOrigin({},'New filename','markdown','', '', 'Template.md',false);
  assert.deepEqual(fm,{TemplateKeep:'Template value'});assert.deepEqual(writes,[[]]);
 }
});

test('explicit composer Alias remains additive while template display metadata stays intact',async()=>{
 for(const nameFields of ['Name','aliases']){
  const fm={Name:'Template name',Alias:['Template alias']},{host}=templateHost(fm,nameFields);
  await host.createNewRelatedFileForOrigin({},'New filename','markdown','Authored alias','', 'Template.md',false);
  assert.deepEqual(fm,{Name:'Template name',Alias:['Template alias','Authored alias']});
 }
});

test('explicit Name overrides the template after composer finalization and retained-file finalization preserves untouched metadata',async()=>{
 const fm={Name:'Template name',TemplateKeep:'Template value'},{host,file}=templateHost(fm);
 await host.finalizeCreatedNoteMetadata(file,'New filename','',false);
 assert.equal(fm.Name,'Template name');
 module.exports.applyCreationProperties(fm,{noteType:null,properties:[{field:'Name',value:'Authored Name'}]},'Note type','invalid');
 assert.deepEqual(fm,{Name:'Authored Name',TemplateKeep:'Template value'});
});

test('legacy callers retain default filename synthesis for scalar names and additive display aliases',async()=>{
 const fm={Name:'Template name'},{host}=templateHost(fm);await host.createNewRelatedFileForOrigin({},'New filename','markdown','', '', 'Template.md');assert.equal(fm.Name,'New filename');
 const aliases={aliases:['Template alias']},legacy=templateHost(aliases,'aliases');
 await legacy.host.finalizeCreatedNoteMetadata(legacy.file,'New filename','Additional alias');
 assert.deepEqual(aliases,{aliases:['New filename','Template alias','Additional alias']});
});
