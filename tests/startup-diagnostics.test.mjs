/** Verify passive startup progress, private overlap summaries, and immutable readiness measurements. */
import assert from "node:assert/strict";
import test from "node:test";
import { browserBundle } from "./support/browserTypeScript.mjs";
const bundle = await browserBundle(["src/adapters/obsidian/startupDiagnostics.ts"]);
const host = { performance: { now: () => now } };
let now = 100;
new Function("window", bundle)(host);
const { StartupDiagnostics } = host.sourceModules;
test("startup phases report actual monotonic counts and overlap without exporting owner identities", () => {
  const d = new StartupDiagnostics();d.begin(true);d.phase("source", "dependencies", 2);
  d.processed("source", "private-A.md");d.processed("source", "private-B.md");
  assert.deepEqual(d.progress("source"), { phase: "dependencies", pass: 1, processed: 2, total: 2 });
  now = 115;d.phase("source", "host-comparison", 2);d.processed("source", "private-B.md");
  now = 140;d.mark("preview");d.finish();
  const report = d.snapshot();
  assert.equal(d.owners.size, 0, "Private owner identities are released at readiness");
  assert.equal(report.phases[0].endedMs, 15);assert.equal(report.phases[1].endedMs, 40);
  assert.deepEqual(report.overlaps, [{ first: "dependencies", second: "host-comparison", owners: 1 }]);
  assert(!JSON.stringify(report).includes("private-"));
  d.phase("source", "later-work");d.processed("source", "private-C.md");d.mark("later");
  assert.deepEqual(d.snapshot(), report, "Later work cannot rewrite the measured startup");
});
test("normal startup exposes actual activity but retains no detailed timing or owner sets", () => {
  const d = new StartupDiagnostics();d.begin(false);d.phase("hydration", "evidence");
  d.processed("hydration");d.count("hydration", "reads");
  assert.deepEqual(d.progress("hydration"), { phase: "evidence", pass: 1, processed: 1, total: null });
  assert.deepEqual(d.snapshot().phases, []);assert.deepEqual(d.snapshot().milestones, {});
});
test("retry progress distinguishes passes without retaining detailed diagnostics or changing work", () => {
  const d = new StartupDiagnostics();d.begin(false);
  d.phase("source", "source-reconciliation", 2);
  d.processed("source", "private-A.md");d.processed("source", "private-B.md");
  assert.deepEqual(d.progress("source"), { phase: "source-reconciliation", pass: 1, processed: 2, total: 2 });
  d.phase("hydration", "source-reconciliation", 10);
  assert.equal(d.progress("hydration").pass, 1, "Pass counts belong to each lane");
  d.phase("source", "dependency-completion");
  d.phase("source", "source-reconciliation", 3);
  assert.deepEqual(d.progress("source"), { phase: "source-reconciliation", pass: 2, processed: 0, total: 3 });
  d.processed("source");
  assert.deepEqual(d.progress("source"), { phase: "source-reconciliation", pass: 2, processed: 1, total: 3 });
  assert.equal(d.owners.size, 0);assert.deepEqual(d.snapshot().phases, []);
  const fresh = new StartupDiagnostics();fresh.phase("source", "source-reconciliation", 3);
  assert.equal(fresh.progress("source").pass, 1, "New plugin lifetime starts a new pass count");
  d.dispose();d.phase("source", "source-reconciliation", 3);
  assert.equal(d.progress("source").pass, 2, "Unload stops pass updates");
});

/** Aggregate work remains observable after readiness without enabling detailed timings or owner tracking. */
test("session work counts actual boundaries through readiness and stops on unload", () => {
  const d = new StartupDiagnostics();d.begin(false);
  d.recordWork("sourceInventoryPasses");d.recordWork("sourceInventoryPasses");
  d.recordWork("fullBuildStarts");d.recordWork("completeSnapshotSaves");
  assert.deepEqual(d.snapshot().sessionWork, {
    sourceInventoryPasses: 2, fullBuildStarts: 1, nodeCatalogStarts: 0,
    completeSnapshotSaves: 1, checkpointSaves: 0,
  });
  assert.deepEqual(d.snapshot().phases, []);assert.equal(d.owners.size, 0);
  d.finish();d.recordWork("checkpointSaves");
  assert.equal(d.snapshot().sessionWork.checkpointSaves, 1, "Post-ready work remains visible");
  const copy = d.snapshot();copy.sessionWork.fullBuildStarts = 999;
  assert.equal(d.snapshot().sessionWork.fullBuildStarts, 1, "Reports cannot mutate the counters");
  d.dispose();d.recordWork("fullBuildStarts");
  assert.equal(d.snapshot().sessionWork.fullBuildStarts, 1, "Late callbacks after unload do not count");
  const measured = new StartupDiagnostics();measured.begin(true);measured.finish();
  measured.recordWork("fullBuildStarts");
  assert.equal(measured.snapshot().sessionWork.fullBuildStarts, 1, "Frozen detailed timings do not hide post-ready work");
});

test("default activity retains coarse causes after readiness without observing processed owners", () => {
  let clock = 0, reads = 0;
  const d = new StartupDiagnostics(() => { reads++; return clock; });
  d.begin(false); d.phase("source", "source-reconciliation");
  const before = reads;
  for (let n = 0; n < 10000; n++) {
    d.processed("source", "private-owner.md"); d.count("source", "reads");
    d.mark("on-demand-center-patched"); // Legacy detailed marker is inside the per-file patch loop.
  }
  assert.equal(reads, before, "Per-file methods add no activity clocks");
  clock = 20; d.finish();
  d.activityCause("uncovered-non-file");
  const token = d.beginActivity("host-inventory", "global", "uncovered-non-file");
  d.phase("source", "source-reconciliation");
  clock = 30; d.endActivity(token, "complete");
  const first = d.captureActivity("eager", "background", "responsive", "0.1.3");
  assert.equal(first.milestones[first.columns.milestones.indexOf("on-demand-center-patched")], null);
  assert.equal(first.totals[0], 1); assert.equal(first.totals[1], 1);
  assert.equal(first.columns.causes[first.lastGlobal[5]], "uncovered-non-file");
  assert.equal(first.phases.current[0][0], null, "The actual source pass boundary closes phase timing");
  assert(first.milestones[first.columns.milestones.indexOf("strict-ready")] !== null);
  assert(!JSON.stringify(first).includes("private-owner"));
  assert.deepEqual(d.captureActivity("eager", "background", "responsive", "0.1.3"), first, "Copy does not reset capture");
  d.dispose();
  const stopped = reads;
  d.activityCause("unknown"); d.beginActivity("host-inventory", "global", "unknown"); d.endActivity(token, "failed");
  assert.equal(reads, stopped); assert.equal(d.captureActivity(), null);
});

test("actual phase closure survives omitted pass detail without accruing idle time", () => {
  let now = 0, reads = 0;
  const d = new StartupDiagnostics(() => { reads++; return now; }); d.begin(false);
  d.beginActivity("hydration", "global", "startup-offline");
  d.beginActivity("node-catalog", "global", "startup-offline");
  d.phase("source", "source-reconciliation");
  const omitted = d.beginActivity("local-maintenance", "local", "known-file"); assert.equal(omitted, 0);
  now = 35; d.endActivity(omitted, "incomplete"); d.stopActivityPhase("source");
  const stopped = reads; d.stopActivityPhase("source"); assert.equal(reads, stopped);
  now = 24 * 3600000;
  const capture = d.captureActivity(), phase = capture.columns.phases.indexOf("source-reconciliation");
  assert.deepEqual(capture.phases.current[0], [null, null]); assert.equal(capture.phases.elapsedMs[0][phase], 35);
  assert.equal(capture.omitted.capacity, 1); assert.equal(capture.outcomeCoverage, "capacity-limited");
});

test("explicit activity capture fills authentic session totals by shared column names only",()=>{
  const d=new StartupDiagnostics(()=>0);d.begin(false);d.recordWork('fullBuildStarts');d.recordWork('checkpointSaves');
  const initial=d.captureActivity(),names=initial.columns.current,current=Array(names.length).fill(null);
  current[names.indexOf('checked')]=7;current[names.indexOf('fullBuildStarts')]=999;current[names.indexOf('semanticPendingObservations')]=4;
  const before=[...current],capture=d.captureActivity('eager','background','balanced','1.2.3+abcdef012345',...current);
  assert.deepEqual(current,before,'The caller facts array is never rewritten');
  assert.equal(capture.current[names.indexOf('fullBuildStarts')],1);assert.equal(capture.current[names.indexOf('checkpointSaves')],1);
  assert.equal(capture.current[names.indexOf('completeSnapshotSaves')],0);assert.equal(capture.current[names.indexOf('checked')],7);
  assert.equal(capture.current[names.indexOf('semanticPendingObservations')],4);assert.equal(capture.current[names.indexOf('parses')],null);
  assert.equal(d.snapshot().sessionWork.fullBuildStarts,1);d.dispose();assert.equal(d.captureActivity(),null);
});
