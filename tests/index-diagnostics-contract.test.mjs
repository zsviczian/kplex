/**
 * Type-checks the two diagnostic report calls against the actual GraphIndex source and exported
 * result contracts. A negative control removes those methods to reproduce TS2339. This focused
 * consumer check is not a substitute for npm run build against the installed host dependencies.
 * Compiler-host overlays are memory-only and use TypeScript's slash-normalized paths on Windows.
 * The positive lane uses unmodified production source;
 * only the negative control removes declarations. No dependency stub is supplied by this test.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import ts from "typescript";
import {build} from "esbuild";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

test('selected-source comparison diagnostics export fixed codes and never invoke private getters',async()=>{
  const built=await build({entryPoints:[join(root,'src/application/indexRecoveryDiagnostics.ts')],bundle:true,write:false,platform:'node',format:'cjs'});
  const module={exports:{}};new Function('module','exports',built.outputFiles[0].text)(module,module.exports);
  const project=module.exports.projectIndexRecoveryDiagnostics;
  assert.deepEqual(project({source:{metadataComparison:{outcome:'different',family:'resolution',path:'Private/Note.md'}}}).source.metadataComparison,
    {outcome:'different',family:'resolution'});
  let reads=0;const malformed={outcome:'private exception text'};
  Object.defineProperty(malformed,'family',{get(){reads++;throw Error('Private value');}});
  assert.deepEqual(project({source:{metadataComparison:malformed}}).source.metadataComparison,{outcome:'unavailable',family:'unavailable'});
  assert.equal(reads,0);
  assert.deepEqual(project({source:{environmentChange:{kind:'date-registry',fields:1,scoped:true,property:'Private field'}}}).source.environmentChange,
    {kind:'date-registry',fields:1,scoped:true});
  const environment={kind:'Private field',fields:-1};Object.defineProperty(environment,'scoped',{get(){reads++;throw Error('Private value')}});
  assert.deepEqual(project({source:{environmentChange:environment}}).source.environmentChange,{kind:'unavailable',fields:null,scoped:null});
  assert.equal(reads,0,'Environment diagnostics never invoke getters or expose dynamic field names');
  const url={policyPreparations:1,flushes:3,pendingPaths:0,maxPendingPaths:20,timerPending:false,privateUrl:'https://private.invalid/'};
  assert.deepEqual(project({url}).url,{policyPreparations:1,flushes:3,pendingPaths:0,maxPendingPaths:20,timerPending:false});
  Object.defineProperty(url,'policyPreparations',{get(){reads++;throw Error('Private value')}});
  assert.equal(project({url}).url.policyPreparations,null);assert.equal(reads,0);
});
const indexPath = join(root, "src/index/GraphIndex.ts").replaceAll("\\", "/");
const probePath = join(root, "tests/__indexDiagnosticsReportContract__.ts").replaceAll("\\", "/");
const probe = `
import type { GraphIndex } from "../src/index/GraphIndex";
/** Exercise the exact report operations that previously produced TS2339. */
export function report(index: GraphIndex) {
  const saved = index.getSavedSnapshotSummary();
  return { saved, decisions: index.getIndexDiagnostics() };
}
`;

/** Resolve the real project types, applying only the requested in-memory source overlay. */
function reportDiagnostics(indexSource = readFileSync(indexPath, "utf8")) {
  const configPath = join(root, "tsconfig.json");
  const config = ts.readConfigFile(configPath, ts.sys.readFile);
  assert.equal(config.error, undefined);
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root);
  assert.deepEqual(parsed.errors, []);
  const options = { ...parsed.options, noEmit: true };
  const host = ts.createCompilerHost(options);
  const readFile = host.readFile.bind(host);
  const fileExists = host.fileExists.bind(host);
  host.readFile = (path) => path === probePath ? probe : path === indexPath ? indexSource : readFile(path);
  host.fileExists = (path) => path === probePath || fileExists(path);
  const program = ts.createProgram([indexPath, probePath], options, host);
  const source = program.getSourceFile(probePath);
  assert(source);
  return [...program.getSyntacticDiagnostics(source), ...program.getSemanticDiagnostics(source)]
    .map((diagnostic) => ({ code: diagnostic.code, message: ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n") }));
}

test("diagnostic report calls type-check against the real GraphIndex public methods", () => {
  assert.deepEqual(reportDiagnostics(), []);
});

test("missing diagnostic methods reproduce both reported TS2339 failures", () => {
  const source = readFileSync(indexPath, "utf8");
  const file = ts.createSourceFile(indexPath, source, ts.ScriptTarget.Latest, true);
  const graph = file.statements.find((statement) => ts.isClassDeclaration(statement) && statement.name.text === "GraphIndex");
  const methods = graph.members.filter((member) => ts.isMethodDeclaration(member)
    && ["getSavedSnapshotSummary", "getIndexDiagnostics"].includes(member.name.getText(file)));
  assert.equal(methods.length, 2);
  let missing = source;
  for (const method of methods.reverse())
    missing = missing.slice(0, method.getFullStart()) + missing.slice(method.end);
  const diagnostics = reportDiagnostics(missing);
  assert.equal(diagnostics.length, 2);
  assert(diagnostics.every((diagnostic) => diagnostic.code === 2339), JSON.stringify(diagnostics));
  assert(diagnostics.some((diagnostic) => diagnostic.message.includes("getSavedSnapshotSummary")));
  assert(diagnostics.some((diagnostic) => diagnostic.message.includes("getIndexDiagnostics")));
});

/** Load actual formatting/sanitizing owners with only the native Platform/version boundary stubbed. */
async function reportRuntime(){
  const built=await build({stdin:{resolveDir:root,contents:'export * from "./src/application/IndexingActivity"; export {createSupportReport,createDiagnosticJson} from "./src/application/supportReport"; export {captureIndexDiagnostics,createIndexDiagnosticsReport} from "./src/adapters/obsidian/indexDiagnosticsReport";'},bundle:true,write:false,platform:'node',format:'cjs',plugins:[{name:'native-report-boundary',setup(builder){builder.onResolve({filter:/^obsidian$/},()=>({path:'obsidian',namespace:'native-report'}));builder.onLoad({filter:/.*/,namespace:'native-report'},()=>({contents:'export const apiVersion="1.14.4"; export const Platform={isWin:true};',loader:'js'}));}}]});
  const module={exports:{}};new Function('module','exports',built.outputFiles[0].text)(module,module.exports);return module.exports;
}
/** Native report ports expose retained scalar facts only and fail if formatting requests acquisition. */
function indexFacts(){return{size:7,getSavedSnapshotSummary:()=>({storage:'available',invalidActive:false,active:null,checkpoint:null}),indexedMarkdownFileCount:()=>3,isFullSnapshotHydrated:()=>false,
  getSnapshotHydrationDiagnostics:()=>({phase:'metadata',outcome:'running'}),getSourceRepositoryDiagnostics:()=>({}),getIndexDiagnostics:()=>[]};}

test('both actual exports preserve one identical branded activity object as compact ASCII',async()=>{
  const api=await reportRuntime(),d=new api.IndexingActivity(()=>0);d.cause('unscoped-resolved');const token=d.begin('host-inventory','global','unscoped-resolved');d.end(token,'complete');
  const capture=d.capture('on-demand','background','responsive','1.2.3+abcdef012345'),index=indexFacts(),status=()=>({upToDate:false,phase:'indexing',indexedFiles:3,totalFiles:7});
  const input={capturedAt:'2026-10-17T00:00:00.000Z',indexReport:api.captureIndexDiagnostics(index,status,'1.2.3'),environment:{},indexingPreferences:{},startup:{},session:{}};
  const native=api.createDiagnosticJson(input,capture),parsed=JSON.parse(native);
  const support=api.createSupportReport(input,capture);
  const report=JSON.parse(support.slice(support.indexOf('```json\n')+8,-5));
  const {build,...settings}=capture.settings;
  assert.deepEqual(parsed.indexingActivity,{...capture,settings});assert.deepEqual(report,parsed);assert.equal(report.index.indexingActivity,undefined);
  assert.equal(support.slice(support.indexOf('```json\n')+8,-5),native);assert(native.includes('  "indexingActivity": '+JSON.stringify({...capture,settings})+',\n'));
  assert.equal(Buffer.byteLength(native),native.length);assert(Buffer.byteLength(native)<=49152);assert(Buffer.byteLength(support)<=49152);
});

test('native report rejects new-summary proxies without traps and ignores oversized unsupported raw fields',async()=>{
  const api=await reportRuntime(),d=new api.IndexingActivity(()=>0),capture=d.capture(),index=indexFacts(),status=()=>({upToDate:false,phase:'indexing',indexedFiles:0,totalFiles:7});
  let traps=0;const hostile=new Proxy({},{get(){traps++;throw Error('secret')},getOwnPropertyDescriptor(){traps++;throw Error('secret')},ownKeys(){traps++;throw Error('secret')}}),revoked=Proxy.revocable({},{});revoked.revoke();
  const serializer={toJSON(){traps++;throw Error('secret')}};
  for(const value of [hostile,revoked.proxy,serializer,JSON.parse(JSON.stringify(capture))])assert.equal(JSON.parse(api.createIndexDiagnosticsReport(index,status,'1.2.3',value)).indexingActivity,null);
  assert.equal(traps,0);
  index.getSnapshotHydrationDiagnostics=()=>({phase:'metadata',futureUnsupportedField:'x'.repeat(40000)});
  const text=api.createIndexDiagnosticsReport(index,status,'1.2.3',capture),report=JSON.parse(text);
  const {build,...settings}=capture.settings;
  assert.equal(report.reportStatus,undefined);assert.equal(report.index.hydration.phase,'metadata');assert.deepEqual(report.indexingActivity,{...capture,settings});assert(Buffer.byteLength(text)<=49152);
});

test('center recovery aggregates survive both diagnostic exports without private payloads',async()=>{
  const api=await reportRuntime(),index=indexFacts();
  const centerCheck={trigger:'initial',outcome:'repaired',sourceReadyBefore:false,sourceReadyAfter:false,activeBefore:true,coverageBefore:'preview',coverageAfter:'local',presented:[0,2,0,0,0],before:[0,2,0,0,0],after:[0,7,0,0,0],path:'PRIVATE-NOTE',content:'PRIVATE-CONTENT'};
  index.getIndexDiagnostics=()=>[{at:123,stage:'reconcile',reason:'center-watchdog:repaired',durationMs:12,centerCheck}];
  const native=api.createIndexDiagnosticsReport(index,()=>({upToDate:false,phase:'indexing',indexedFiles:3,totalFiles:7}),'1.2.3');
  const parsed=JSON.parse(native),support=api.createSupportReport({capturedAt:'2026-10-18T00:00:00.000Z',indexReport:api.captureIndexDiagnostics(index,()=>({upToDate:false,phase:'indexing',indexedFiles:3,totalFiles:7}),'1.2.3'),environment:{},indexingPreferences:{},startup:{},session:{}});
  const report=JSON.parse(support.slice(support.indexOf('```json\n')+8,-5));
  assert.deepEqual(parsed.index.decisions[0].centerCheck,report.index.decisions[0].centerCheck);assert.equal(report.index.decisions[0].reason,'center-watchdog:repaired');
  assert.deepEqual(report.index.decisions[0].centerCheck.after,[0,7,0,0,0]);assert(!native.includes('PRIVATE'));assert(!support.includes('PRIVATE'));
});

test('recovery blockers and writer error classes survive both exports without private values',async()=>{
 const api=await reportRuntime(),index=indexFacts();let getters=0;
 const source={dependenciesReady:false,localAuthorityReady:false,pendingKnown:2152,inventoryActive:true,
  pass:{phase:'sources',outcome:'cancelled',elapsedMs:1000,visited:42,total:11988,scopeChanges:1,path:'PRIVATE-PATH'}};
 Object.defineProperty(source,'warmAuthority',{get(){getters++;throw Error('PRIVATE-ERROR')}});
 index.getIndexRecoveryDiagnostics=()=>({demandedCenters:1,incompleteCenters:1,activeCenterTasks:0,dependencyPendingCenters:1,foregroundLeases:0,
  waitingForSources:true,source,snapshot:{phase:'pages',outcome:'failed',errorName:'DataCloneError',elapsedMs:20,pageChunks:2,evidenceChunks:0,message:'PRIVATE-ERROR'}});
 const native=api.createIndexDiagnosticsReport(index,()=>({upToDate:false,phase:'updating',indexedFiles:3,totalFiles:3}),'1.2.3'),parsed=JSON.parse(native);
 const support=api.createSupportReport({capturedAt:'2026-11-04T14:11:32.000Z',indexReport:api.captureIndexDiagnostics(index,()=>({upToDate:false,phase:'updating',indexedFiles:3,totalFiles:3}),'1.2.3'),environment:{},indexingPreferences:{},startup:{},session:{}});
 const report=JSON.parse(support.slice(support.indexOf('```json\n')+8,-5));
 assert.deepEqual(parsed.index.recovery,report.index.recovery);assert.equal(parsed.index.recovery.source.pass.scopeChanges,1);
 assert.equal(parsed.index.cache.writer.errorName,'DataCloneError');assert.equal(parsed.index.recovery.waitingForSources,true);
 assert.equal(getters,0);assert(!native.includes('PRIVATE'));assert(!support.includes('PRIVATE'));
 assert(Buffer.byteLength(native)<=49152&&Buffer.byteLength(support)<=49152);
});
