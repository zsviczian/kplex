/** Complete composer-link input against the production literal grammar and exact native-file
 * boundary. A finite resolver records requests; no alternate Markdown grammar or write is used. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {loadPortableModules} from './support/portableTypeScript.mjs';

const {exports:{interpretRelatedTarget}}=loadPortableModules(['src/adapters/obsidian/relatedTarget.ts'],{
 obsidian:`exports.parseLinktext=value=>{const at=value.indexOf('#');return at<0?{path:value,subpath:''}:{path:value.slice(0,at),subpath:value.slice(at)}};`
});

/** Keep resolver and Vault incarnation independently replaceable to exercise fail-closed input. */
function fixture(){
 const file={path:'Folder/Target.md',extension:'md'},attachment={path:'Media/Target.svg',extension:'svg'},files=new Map([[file.path,file],[attachment.path,attachment]]),calls=[];
 const pages=new Map([...files].map(([path,file])=>[path,{path,file,name:path,url:null}]));
 const app={vault:{getFileByPath:path=>files.get(path)},metadataCache:{getFirstLinkpathDest:(path,source)=>{calls.push({path,source});return path==='Target'||path===file.path||path==='Folder/Target'?file:path==='Target.svg'||path===attachment.path?attachment:null}}};
 return {file,attachment,files,pages,calls,run:raw=>interpretRelatedTarget(app,file=>pages.get(file.path),'Source/Origin.md',raw)};
}

test('complete Markdown web targets preserve authored labels, query/timestamp and fragment without note creation',()=>{
 const f=fixture();
 for(const [raw,url,label]of [
  ['[Title](https://example.com/path?A=1&t=90#Part)','https://example.com/path?A=1&t=90#Part','Title'],
  [' [Ünicode 🧭](https://youtu.be/z8UkHGpykYU?t=60) ','https://youtu.be/z8UkHGpykYU?t=60','Ünicode 🧭'],
  ['https://example.com/?t=60#exact','https://example.com/?t=60#exact',''],
 ])assert.deepEqual(f.run(raw),{kind:'web',url,label});
 assert.deepEqual(f.calls,[],'Web targets never call a native file resolver');
});

test('complete wikilinks and vault-relative paths retain exact native file identity and authored aliases',()=>{
 const f=fixture();
 for(const [raw,label]of [['[[Target]]',''],['[[Folder/Target|Authored alias]]','Authored alias'],['[[Folder%2FTarget.md|表示名]]','表示名'],['Folder/Target.md','']]){
  const target=f.run(raw);assert.equal(target.kind,'note',raw);assert.equal(target.page,f.pages.get(f.file.path));assert.equal(target.page.file,f.file);assert.equal(target.label,label);
 }
 const image=f.run('[[Media/Target.svg|Wave]]');assert.equal(image.kind,'note');assert.equal(image.page.file,f.attachment);assert.equal(image.label,'Wave','Eligibility stays with existing reciprocal/owner checks');
 assert(f.calls.every(call=>call.source==='Source/Origin.md'),'Native source-relative resolution receives the captured origin');
});

test('unsupported headings/blocks are explained rather than silently removed from any complete internal target',()=>{
 const f=fixture();
 for(const raw of ['[[Target#Heading]]','[[Target#^block|Alias]]','[[Folder/Target%23Heading]]','Folder/Target.md#Heading','Folder/Target.md#^block'])assert.deepEqual(f.run(raw),{kind:'invalid',reason:'subpath'},raw);
 assert.deepEqual(f.calls,[],'Rejected subpaths never resolve to a different whole-note target');
});

test('recognized unsafe, incomplete or multiple links never become filenames',()=>{
 const f=fixture();
 for(const raw of ['[[Target]] [[Target]]','[[Target|One|Two]]','[[Target','[Title](https://example.com) extra','[Other][Title](https://example.com)',
  '[A](https://example.com) [B](https://example.org)','[A](javascript:alert(1))','[A](ftp://example.com/file)','[A](https://example.com/path "title")',
  '[A](https://example.com/\ntrailing)','https://example.com https://example.org','https://example.com/\ntrailing','javascript:alert(1)','mailto:owner@example.com','![[Target]]','![image](https://example.com/image.png)',
  '[[https://example.com]]','[[Target%ZZ]]','see [[Target]] here','see [Title](https://example.com) here','prefix [[Target','prefix [Broken](https://example.com',
  '[[Missing]] and [Title](https://example.com)','prefix [[Target]] [[Target]]','file:///C:/note.md','obsidian://open?vault=Example','data:text/plain,note','vbscript:msgbox(1)'])assert.deepEqual(f.run(raw),{kind:'invalid',reason:'invalid'},raw);
});

test('missing, retired or mismatched native targets fail closed without acquiring a graph scope',()=>{
 const f=fixture();assert.deepEqual(f.run('[[Missing]]'),{kind:'invalid',reason:'missing'});
 f.pages.delete(f.file.path);assert.deepEqual(f.run('[[Target]]'),{kind:'invalid',reason:'missing'});
 f.pages.set(f.file.path,{path:f.file.path,file:{...f.file}});assert.deepEqual(f.run('[[Target]]'),{kind:'invalid',reason:'missing'});
 f.pages.set(f.file.path,{path:'Previous.md',file:f.file});assert.deepEqual(f.run('[[Target]]'),{kind:'invalid',reason:'missing'});
 f.files.set(f.file.path,{...f.file});assert.deepEqual(f.run('[[Target]]'),{kind:'invalid',reason:'missing'});
 for(const raw of ['New plain note','Name with 🧭','[Project]','Project: roadmap','Project:roadmap','Literal [Project] draft','![Project]',''])assert.deepEqual(f.run(raw),{kind:'name'},raw);
});
