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
  const built=await build({stdin:{resolveDir:root,contents:'export * from "./src/application/IndexingActivity"; export {createSupportReport} from "./src/application/supportReport"; export {createIndexDiagnosticsReport} from "./src/adapters/obsidian/indexDiagnosticsReport";'},bundle:true,write:false,platform:'node',format:'cjs',plugins:[{name:'native-report-boundary',setup(builder){builder.onResolve({filter:/^obsidian$/},()=>({path:'obsidian',namespace:'native-report'}));builder.onLoad({filter:/.*/,namespace:'native-report'},()=>({contents:'export const apiVersion="1.14.4"; export const Platform={isWin:true};',loader:'js'}));}}]});
  const module={exports:{}};new Function('module','exports',built.outputFiles[0].text)(module,module.exports);return module.exports;
}
/** Native report ports expose retained scalar facts only and fail if formatting requests acquisition. */
function indexFacts(){return{size:7,getSavedSnapshotSummary:()=>({storage:'available',invalidActive:false,active:null,checkpoint:null}),indexedMarkdownFileCount:()=>3,isFullSnapshotHydrated:()=>false,
  getSnapshotHydrationDiagnostics:()=>({phase:'metadata',outcome:'running'}),getSourceRepositoryDiagnostics:()=>({}),getIndexDiagnostics:()=>[]};}

test('both actual exports preserve one identical branded activity object as compact ASCII',async()=>{
  const api=await reportRuntime(),d=new api.IndexingActivity(()=>0);d.cause('unscoped-resolved');const token=d.begin('host-inventory','global','unscoped-resolved');d.end(token,'complete');
  const capture=d.capture('on-demand','background','responsive','1.2.3+abcdef012345'),index=indexFacts(),status=()=>({upToDate:false,phase:'indexing',indexedFiles:3,totalFiles:7});
  const native=api.createIndexDiagnosticsReport(index,status,'1.2.3',capture),parsed=JSON.parse(native);
  const support=api.createSupportReport({capturedAt:'2026-10-17T00:00:00.000Z',indexReport:parsed,environment:{},indexingPreferences:{},startup:{},session:{}},capture);
  const report=JSON.parse(support.slice(support.indexOf('```json\n')+8,-5));
  assert.deepEqual(parsed.indexingActivity,capture);assert.deepEqual(report.indexingActivity,parsed.indexingActivity);assert.equal(report.index.indexingActivity,undefined);
  assert(native.includes('  "indexingActivity": '+JSON.stringify(capture)+'\n}'));assert(support.includes('  "indexingActivity": '+JSON.stringify(capture)+'\n}'));
  assert.equal(Buffer.byteLength(native),native.length);assert(Buffer.byteLength(native)<=32768);assert(Buffer.byteLength(support)<=32768);
});

test('native report rejects new-summary proxies without traps and preserves activity on legacy size fallback',async()=>{
  const api=await reportRuntime(),d=new api.IndexingActivity(()=>0),capture=d.capture(),index=indexFacts(),status=()=>({upToDate:false,phase:'indexing',indexedFiles:0,totalFiles:7});
  let traps=0;const hostile=new Proxy({},{get(){traps++;throw Error('secret')},getOwnPropertyDescriptor(){traps++;throw Error('secret')},ownKeys(){traps++;throw Error('secret')}}),revoked=Proxy.revocable({},{});revoked.revoke();
  const serializer={toJSON(){traps++;throw Error('secret')}};
  for(const value of [hostile,revoked.proxy,serializer,JSON.parse(JSON.stringify(capture))])assert.equal(JSON.parse(api.createIndexDiagnosticsReport(index,status,'1.2.3',value)).indexingActivity,null);
  assert.equal(traps,0);
  index.getSnapshotHydrationDiagnostics=()=>({phase:'metadata',futureUnsupportedField:'x'.repeat(40000)});
  const text=api.createIndexDiagnosticsReport(index,status,'1.2.3',capture),report=JSON.parse(text);
  assert.equal(report.reportStatus,'size-limit');assert.deepEqual(report.indexingActivity,capture);assert(Buffer.byteLength(text)<=32768);
});
