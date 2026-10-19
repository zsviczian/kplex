/** Real session owners: persistence allowlists, independent lifetimes and memory-only repeated visits. */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import test from "node:test";
import {build} from "esbuild";
const built = await build({entryPoints:["src/ui/KplexDocumentSession.ts"],bundle:true,write:false,platform:"node",format:"esm"});
const {KplexDocumentSession,nativeLeafId} = await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
const defaults={documentSyncMode:"pinned",sidecarOpen:true,sidecarPosition:"right",sidecarLastFilePath:"Legacy.md",sidecarLastUrl:"",sidecarMarkdownMode:"preview"};
const ref=identity=>({identity,path:identity,kind:"file",fileIdentity:`native-${identity}`});

test("native sessions serialize only scalar workspace intent and never retain another view's live target",()=>{
  const writes=[],a=new KplexDocumentSession(defaults,"A",()=>writes.push("A")),b=new KplexDocumentSession(defaults,"B",()=>writes.push("B"));
  assert.equal(a.preferences.documentSyncMode,"off");assert.equal(a.preferences.sidecarOpen,false);
  a.restore({version:1,ownerId:"A",centerPath:"Center.md",targetId:"sidecar-A",documentSyncMode:"pinned",sidecarOpen:true,sidecarPosition:"left"});
  a.linkedDocumentLeaf={privateNativeObject:true};a.suppression={path:"Secret.md",until:100};a.restoreTask=Promise.resolve();
  a.pendingFollow={file:{path:"Pending.md"},leaf:a.linkedDocumentLeaf,revision:0};
  a.pendingUrl={url:"https://example.com/private-pending",leaf:a.linkedDocumentLeaf,revision:0};
  for(const name of ["A.md","B.md","A.md","C.md"])a.footprints.accept(ref(name));
  const state=a.getState();assert.deepEqual(Object.keys(state).sort(),["version","ownerId","centerPath","targetId",...Object.keys(defaults)].sort());
  const json=JSON.stringify(state);for(const privateValue of ["visits","footprints","native-A.md","Secret.md","Pending.md","private-pending","privateNativeObject","revision","restoreTask"])assert(!json.includes(privateValue));
  assert.equal(b.footprints.length,0);assert.equal(b.linkedDocumentLeaf,null);assert.equal(b.preferences.sidecarPosition,"right");assert.deepEqual(writes,[]);
  const restarted=new KplexDocumentSession(defaults,"A",()=>{});restarted.restore(JSON.parse(json));
  assert.equal(restarted.centerPath,"Center.md");assert.equal(restarted.targetId,"sidecar-A");assert.equal(restarted.footprints.length,0);
  const duplicate=new KplexDocumentSession(defaults,"new-A",()=>{});duplicate.restore(state);
  assert.equal(duplicate.centerPath,"Center.md");assert.equal(duplicate.targetId,null);assert.equal(duplicate.preferences.sidecarOpen,false);assert.equal(duplicate.footprints.length,0);
  a.persist();b.persist();assert.deepEqual(writes,["A","B"]);
  a.retire();assert.equal(a.pendingUrl,null);assert.equal(a.pendingFollow,null);
});

test("Footprints preserve repetitions, append older selections, no-op publications and independent Start here",()=>{
  const a=new KplexDocumentSession(defaults,"A",()=>assert.fail("Trail operations must not write settings/workspace"));
  const b=new KplexDocumentSession(defaults,"B",()=>assert.fail("Other view must remain untouched"));
  let notifications=0;const release=a.footprints.subscribe(()=>notifications++);
  for(const name of ["A.md","B.md","A.md","C.md"])a.footprints.accept(ref(name));
  a.footprints.accept(ref("C.md"));assert.equal(notifications,4);
  assert.deepEqual(Array.from({length:4},(_,i)=>a.footprints.at(i).node.identity),["A.md","B.md","A.md","C.md"]);
  assert.equal(new Set(Array.from({length:4},(_,i)=>a.footprints.at(i).id)).size,4);
  a.footprints.accept(a.footprints.at(1).node);assert.equal(a.footprints.length,5);assert.equal(a.footprints.at(4).node.identity,"B.md");
  b.footprints.accept(ref("Other.md"));a.footprints.startHere();assert.equal(a.footprints.length,1);assert.equal(b.footprints.length,1);
  release();a.dispose();assert.equal(a.footprints.length,0);a.footprints.accept(ref("CannotReturn.md"));assert.equal(a.footprints.length,0);assert.equal(b.footprints.length,1);
});

test("native restoration arrives once after mount; duplicate state cannot replace an accepted live session",()=>{
  const a=new KplexDocumentSession(defaults,"A",()=>{});let notifications=0;a.subscribeRestoration(()=>notifications++);
  a.restore({version:1,ownerId:"A",centerPath:"Restored.md",targetId:"native-target",documentSyncMode:"pinned"});
  a.centerPath="Accepted.md";a.restore({version:1,ownerId:"A",centerPath:"Old.md",targetId:"other-target"});
  assert.equal(a.centerPath,"Accepted.md");assert.equal(a.targetId,"native-target");assert.equal(notifications,1);
  const fresh=new KplexDocumentSession(defaults,"fresh",()=>{});fresh.restore(undefined);assert.equal(fresh.initialized,true);assert.equal(fresh.restored,false);
});

test("verified native identity refuses unverified/private guesses and unsupported restored state",()=>{
  const leaf={id:"native-A"},workspace={getLeafById:id=>id==="native-A"?leaf:null};
  assert.equal(nativeLeafId(workspace,leaf),"native-A");assert.equal(nativeLeafId(workspace,{id:"native-A"}),null);assert.equal(nativeLeafId(workspace,{}),null);
  const a=new KplexDocumentSession(defaults,"A",()=>{});a.restore({version:2,ownerId:"A",centerPath:"Unsafe.md",documentSyncMode:"pinned"});
  assert.equal(a.centerPath,null);assert.equal(a.preferences.documentSyncMode,"off");assert.equal(a.targetId,null);
});

test("native view keeps the memory owner across React migration and excludes trails from settings/support projections",()=>{
  const view=readFileSync("src/ui/KplexView.tsx","utf8"),main=readFileSync("src/main.ts","utf8");
  assert.match(view,/readonly documentSession: KplexDocumentSession/);assert.match(view,/plexSession: this.documentSession.getState\(\)/);
  const migration=view.slice(view.indexOf("this.containerEl.onWindowMigrated"),view.indexOf("this.renderReact();\n    // View"));
  assert(!migration.includes("documentSession.dispose"));assert.match(view,/this.plugin.onKplexViewClosed\(this.leaf, this.documentSession\);\s*this.documentSession.dispose\(\)/);
  assert(!main.slice(main.indexOf("reportBug(origin"),main.indexOf("private searchTargetLeaf")).includes("footprints"));
});
