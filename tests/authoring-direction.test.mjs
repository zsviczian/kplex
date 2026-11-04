/** Actual plugin reversal/append control flow with finite native write and publication receipts.
 * Grammar, IndexedDB and real native metadata convergence are tested in their existing lanes. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import {build} from 'esbuild';
const names=new Set(['reverseFrontmatterEvidence','appendRelationshipReference','addRelationshipOntology','createRelationToPage','linkNewRelatedFile']);
const source=ts.createSourceFile('main.ts',readFileSync('src/main.ts','utf8'),ts.ScriptTarget.Latest,true),methods=[];
/** Preserve production bodies; only their native capability ports are supplied by each case. */
const visit=node=>{if(ts.isMethodDeclaration(node)&&names.has(node.name.getText(source)))methods.push(node.getText(source));ts.forEachChild(node,visit)};visit(source);assert.equal(methods.length,names.size);
const compiled=await build({stdin:{loader:'ts',resolveDir:process.cwd(),contents:`
 import {frontmatterDeclarationKey} from './src/application/frontmatterUnlink';
 import {normalizeFieldName} from './src/core/contracts/fieldName';
 import {eligibleRelationshipOwner} from './src/adapters/obsidian/relationshipOwner';
 import {SavedRelationshipPendingError} from './src/adapters/obsidian/relationshipMetadataWrite';
 class Notice{constructor(message){throw Error('Unexpected notice: '+message)}}
 export {SavedRelationshipPendingError,frontmatterDeclarationKey,eligibleRelationshipOwner};
 export class AuthoringHost{relationshipReversals=new Map();${methods.join('\n')}}
 `},bundle:true,write:false,format:'cjs',platform:'node'});
const module={exports:{}};Function('module','exports',compiled.outputFiles[0].text)(module,module.exports);const M=module.exports;

/** Exact identities and the selected tuple stay independent of generated evidence IDs and raw values. */
function fixture(role='child',paired=true){
 const a={path:'A.md',extension:'md'},b={path:'B.md',extension:'md'},pages=[{path:a.path,file:a},{path:b.path,file:b}],files=new Map([[a.path,a],[b.path,b]]),fm=new Map([[a,{Selected:['[[B.md]]','[[Other.md]]'],Keep:'unchanged'}],[b,{Keep:'receiver'}]]);
 const calls=[],evidence={sourceKind:'frontmatter-ontology',relationType:1,fieldName:'Selected',declaredByPath:a.path,declaredTargetPath:b.path,declaredRole:role,sourcePath:a.path,targetPath:b.path,direction:1};
 const expectation={storage:a,target:b,storagePath:a.path,targetPath:b.path,fieldKey:'Selected',declarationKey:M.frontmatterDeclarationKey(evidence),viewSourcePath:a.path,viewTargetPath:b.path};
 const p=Object.assign(new M.AuthoringHost(),{app:{vault:{getFileByPath:path=>files.get(path)??null},metadataCache:{getFileCache:file=>({frontmatter:fm.get(file)})}},translator:key=>key,unloading:false,
  inverseOntologyField:()=>paired?'Inverse':role==='parent'?'Child':role==='child'?'Parent':role==='previous'?'Next':role==='next'?'Previous':'Selected',ontologyRoleForField:()=>role,
  index:{withForegroundPriority:async run=>run(),isSemanticWriteReady:()=>true,evidenceBetween:()=>fm.get(a).Selected?.includes('[[B.md]]')?[evidence]:[]},
  prepareRelationshipMutation:async()=>pages,referenceForPage:page=>'[['+page.path+']]',pruneManagedMetadataWrites(){},managedMetadataWrites:new Map(),
  valueContainsTarget:(value,_file,target)=>Array.isArray(value)&&value.includes('[['+target.path+']]'),
  mutateRelationshipMetadata:async(file,fields,mutate)=>{calls.push('save:'+file.path);const next=structuredClone(fm.get(file));mutate(next);fm.set(file,next);calls.push('durable:'+file.path)},
  publishSavedRelationship:async()=>{calls.push('publish')},
  unlinkFrontmatterEvidence:async(_e,approved,current)=>{assert.equal(approved,expectation);assert(current());calls.push('remove');fm.get(a).Selected=fm.get(a).Selected.filter(value=>value!=='[[B.md]]');return true},
 });return{p,a,b,pages,files,fm,calls,evidence,expectation};
}

for(const role of ['parent','child','left','right','previous','next'])for(const paired of [false,true])test(`selected ${role} reversal ${paired?'paired':'unpaired'} saves before removing and retries idempotently`,async()=>{
 const f=fixture(role,paired),{p}=f;assert.equal(M.frontmatterDeclarationKey(f.evidence),f.expectation.declarationKey);
 assert.deepEqual(await p.reverseFrontmatterEvidence(f.evidence,f.expectation,()=>true),{state:'reversed'});
 assert.deepEqual(f.calls,['save:B.md','durable:B.md','publish','remove']);assert.deepEqual(f.fm.get(f.a),{Selected:['[[Other.md]]'],Keep:'unchanged'});
 const property=p.inverseOntologyField();assert.deepEqual(f.fm.get(f.b),{Keep:'receiver',[property]:['[[A.md]]']});
 assert.deepEqual(await p.reverseFrontmatterEvidence(f.evidence,f.expectation,()=>true),{state:'reversed'});assert.equal(f.calls.filter(c=>c==='save:B.md').length,1);
});

test('held replacement, duplicate activation and cancellation preserve the original declaration',async()=>{
 const f=fixture();let release,entered;const held=new Promise(done=>entered=done),gate=new Promise(done=>release=done),write=f.p.mutateRelationshipMetadata;let current=true;
 f.p.mutateRelationshipMetadata=async(...args)=>{entered();await gate;return write(...args)};
 const first=f.p.reverseFrontmatterEvidence(f.evidence,f.expectation,()=>current),second=f.p.reverseFrontmatterEvidence(f.evidence,f.expectation,()=>current);
 assert.equal(first,second);await held;assert(f.fm.get(f.a).Selected.includes('[[B.md]]'));current=false;release();await assert.rejects(first,/endpointChanged/);
 assert.equal(f.calls.includes('remove'),false);assert.deepEqual(f.fm.get(f.b),{Keep:'receiver'});assert.equal(f.p.relationshipReversals.size,0);
});

for(const failure of ['replacement-pending','publication-pending','publication-error','removal'])test(`cross-file ${failure} outcome preserves truthful partial status`,async()=>{
 const f=fixture();if(failure==='replacement-pending')f.p.mutateRelationshipMetadata=async()=>{throw new M.SavedRelationshipPendingError('saved')};
 if(failure==='publication-pending')f.p.publishSavedRelationship=async()=>{throw new M.SavedRelationshipPendingError('saved')};
 if(failure==='publication-error')f.p.publishSavedRelationship=async()=>{throw Error('unexpected graph publication failure')};
 if(failure==='removal')f.p.unlinkFrontmatterEvidence=async()=>{throw Error('native removal interrupted')};
 assert.deepEqual(await f.p.reverseFrontmatterEvidence(f.evidence,f.expectation,()=>true),{state:'pending',stage:failure==='removal'?'removal':'replacement'});
 assert(f.fm.get(f.a).Selected.includes('[[B.md]]'));assert.equal(f.p.relationshipReversals.size,0);
});

for(const change of ['target-replacement','source-rename','attachment','pair-change'])test(`opposite-owner consent rejects ${change} across preparation`,async()=>{
 const f=fixture();f.p.prepareRelationshipMutation=async()=>{if(change==='target-replacement')f.files.set('B.md',{path:'B.md',extension:'md'});if(change==='source-rename')f.a.path='Moved.md';if(change==='attachment')f.b.extension='png';if(change==='pair-change')f.p.inverseOntologyField=()=> 'Changed';return f.pages};
 await assert.rejects(f.p.reverseFrontmatterEvidence(f.evidence,f.expectation,()=>true));assert.deepEqual(f.calls,[]);
});

test('stale selected role and missing provenance never masquerade as completed reversal',async()=>{
 for(const change of ['role','provenance']){
  const f=fixture();f.fm.get(f.b).Inverse=['[[A.md]]'];
  if(change==='role')f.p.ontologyRoleForField=()=> 'parent';else f.p.index.evidenceBetween=()=>[];
  await assert.rejects(f.p.reverseFrontmatterEvidence(f.evidence,f.expectation,()=>true),/removeSourceChanged/);
  assert(f.fm.get(f.a).Selected.includes('[[B.md]]'));assert.deepEqual(f.calls,[]);
 }
});

for(const value of [42,{custom:'preserve'},['[[Other.md]]',42]])test('receiver custom property shape cannot be silently rewritten: '+JSON.stringify(value),async()=>{
 const f=fixture();f.fm.get(f.b).Inverse=value;const before=structuredClone(f.fm.get(f.b));
 await assert.rejects(f.p.reverseFrontmatterEvidence(f.evidence,f.expectation,()=>true),/removeUnsupported/);assert.deepEqual(f.fm.get(f.b),before);assert(f.fm.get(f.a).Selected.includes('[[B.md]]'));assert(!f.calls.includes('remove'));
});
