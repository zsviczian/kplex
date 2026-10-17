/**
 * Amplified cost of the actual portable IndexingActivity owner, never a simulated recorder.
 * Run serially AFTER native/resource trials: node --expose-gc scripts/testing/indexing-activity-work.mjs
 * Optional --frequency-json=/private/counts.json accepts {durationMs,calls:{begin,end,cause,mark,phase,stopPhase}}.
 * --data-roots-only=true skips amplification/profiling and measures actual V8 diagnostic data roots.
 * CPU/wall trials exclude compilation, construction, explicit GC and allocation sampling. Manual
 * capture/project/serialization are separate. Sampling estimates are NOT exact total allocations;
 * retained heap includes containers and reports ArrayBuffer payload separately without double count.
 * This tool reads source/count evidence only, touches no vault, and writes JSON to stdout only.
 */
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {readFileSync} from "node:fs";
import {Session} from "node:inspector/promises";
import {cpus, totalmem, release} from "node:os";
import {resolve} from "node:path";
import {performance} from "node:perf_hooks";
import {setImmediate as nextTurn} from "node:timers/promises";
import {fileURLToPath} from "node:url";
import {build, stop} from "esbuild";

assert.equal(process.version, "v22.22.2", "Use the acceptance runtime Node22.22.2, whose shipped inspector protocol is referenced below");
assert.equal(typeof global.gc, "function", "Run explicitly with --expose-gc; retained-memory results require real GC");
const root = resolve(fileURLToPath(new URL("../..", import.meta.url))), options = new Map();
for (const argument of process.argv.slice(2)) {
  const match = /^--([a-z-]+)=(.+)$/.exec(argument); assert(match && !options.has(match[1]), `Invalid or duplicate option: ${argument}`); options.set(match[1], match[2]);
}
/** Bound amplification without silently changing a requested condition. */
const integer = (key, fallback, minimum, maximum) => {
  const value = Number(options.get(key) ?? fallback); assert(Number.isSafeInteger(value) && value >= minimum && value <= maximum, `Invalid --${key}`); return value;
};
const iterations = integer("iterations", 200000, 1000, 2000000), repetitions = integer("repetitions", 7, 3, 15);
const warmup = integer("warmup", 10000, 100, 100000), instances = integer("instances", 1024, 128, 4096);
const copies = integer("copy-iterations", 1000, 100, 20000), sampleIterations = integer("sample-iterations", 50000, 1000, 1000000);
assert(!options.has("data-roots-only") || ["true", "false"].includes(options.get("data-roots-only")), "Invalid --data-roots-only");
const dataRootsOnly = options.get("data-roots-only") === "true";
for (const key of options.keys()) assert(["iterations", "repetitions", "warmup", "instances", "copy-iterations", "sample-iterations", "frequency-json", "data-roots-only"].includes(key), `Unknown option --${key}`);
/** Source/artifact identity is separate from synthetic operation checksums. */
const hash = value => createHash("sha256").update(value).digest("hex");
const compiled = await build({absWorkingDir: root, entryPoints: ["src/application/IndexingActivity.ts"], bundle: true, platform: "node", format: "esm", target: "node22", write: false, metafile: true});
await stop();
const code = compiled.outputFiles[0].text, moduleUrl = `data:text/javascript;base64,${Buffer.from(code).toString("base64")}`;
collect(); const importBefore = process.memoryUsage();
const api = await import(moduleUrl), {IndexingActivity, projectIndexingActivity, ACTIVITY_SOURCE_COLUMNS, ACTIVITY_SESSION_COLUMNS,
  ACTIVITY_MILESTONES, ACTIVITY_CURRENT_COLUMNS, ACTIVITY_REASONS} = api;
collect(); const importAfter = process.memoryUsage();
const moduleImportRetained = {heapUsedDelta: importAfter.heapUsed - importBefore.heapUsed, arrayBuffersDelta: importAfter.arrayBuffers - importBefore.arrayBuffers,
  externalDelta: importAfter.external - importBefore.external, meaning: "One-time import includes static vocabularies, code/module/ESM-loader caches and module containers; not an isolated dictionary size or per-owner cost. esbuild source/output strings already existed before the baseline."};
assert.equal(typeof IndexingActivity.prototype.phase, "function", "Benchmark expects the actual coarse phase owner");
assert.equal(typeof IndexingActivity.prototype.stopPhase, "function", "Benchmark expects the actual coarse phase-stop owner");
const sources = Object.fromEntries(Object.keys(compiled.metafile.inputs).sort().map(/** Compile/fingerprint current real source, including its vocabulary owner. */ path => [path.replaceAll("\\", "/"), hash(readFileSync(resolve(root, path)))]));
const sourceRecords = [], memoryRecords = [], allocationRecords = [];
const clock = /** Timing trials include the actual recorder's monotonic clock acquisition cost. */ () => performance.now();
let syntheticTime = 0, retainedBatch = null, copyFixture;
const syntheticClock = /** Only filled-state/copy fixtures use an accelerated clock; never claim day-long native evidence. */ () => syntheticTime;
/** Matched call-site control: no diagnostics, clock reads, retained state or diagnostic work. */
class NoopActivity {
  begin() { return 1; }
  end() {}
  cause() {}
  mark() {}
  phase() {}
  stopPhase() {}
  capture() { return copyFixture.capture; }
}
/** Reuse fixed trusted counter objects; no per-update argument object is allocated by the harness. */
const context = enabled => ({owner: enabled ? new IndexingActivity(clock) : new NoopActivity(),
  source: Object.fromEntries(ACTIVITY_SOURCE_COLUMNS.map(/** Initialize every existing source counter. */ name => [name, 0])),
  session: Object.fromEntries(ACTIVITY_SESSION_COLUMNS.map(/** Initialize every existing session counter. */ name => [name, 0]))});
/** Consume genuine token validity while applying the identical preexisting-work scalar in each arm. */
function passLoop(value, count) {
  let checksum = 0;
  for (let index = 0; index < count; index++) {
    const global = (index & 1) !== 0;
    const token = value.owner.begin(global ? "host-inventory" : "local-maintenance", global ? "global" : "local", global ? "uncovered-non-file" : "known-file", value.source, value.session);
    value.source.checked++; value.source.reusedBodies++;
    value.owner.end(token, "complete", value.source, value.session); checksum = (checksum + (token > 0 ? 1 : 0)) >>> 0;
  }
  return checksum;
}
/** Amplify real coarse invalidations across the fixed vocabulary, not per-file instrumentation. */
function causeLoop(value, count) { let checksum = 0; for (let index = 0; index < count; index++) { value.owner.cause(ACTIVITY_REASONS[index % ACTIVITY_REASONS.length]); checksum = (checksum + 1) >>> 0; } return checksum; }
/** Repeated milestone checks are reported separately from their first-observation path. */
function markLoop(value, count) { let checksum = 0; for (let index = 0; index < count; index++) { value.owner.mark(ACTIVITY_MILESTONES[index % ACTIVITY_MILESTONES.length]); checksum = (checksum + 1) >>> 0; } return checksum; }
/** Alternate a real coarse phase and its completion without synthetic per-source notifications. */
function phaseLoop(value, count) { let checksum = 0; for (let index = 0; index < count; index++) { value.owner.phase("source", index & 1 ? "complete" : "source-authority"); checksum = (checksum + 1) >>> 0; } return checksum; }
/** Measure real phase completion without manufacturing a terminal phase or touching private state. */
function stopLoop(value, count) { let checksum = 0; for (let index = 0; index < count; index++) { value.owner.phase("source", "source-authority"); value.owner.stopPhase("source"); checksum = (checksum + 1) >>> 0; } return checksum; }
/** An already-closed stop is a distinct production guard path. */
function stoppedLoop(value, count) { let checksum = 0; for (let index = 0; index < count; index++) { value.owner.stopPhase("source"); checksum = (checksum + 1) >>> 0; } return checksum; }
/** A synthetic coarse pass combines real methods; source acquisition itself is not simulated/timed. */
function combinedLoop(value, count) {
  let checksum = 0;
  for (let index = 0; index < count; index++) {
    value.owner.cause("known-file"); const token = value.owner.begin("local-maintenance", "local", "known-file", value.source, value.session);
    value.owner.phase("source", "source-authority"); value.source.checked++;
    value.owner.stopPhase("source"); value.owner.end(token, "complete", value.source, value.session); checksum += token > 0 ? 1 : 0;
  }
  return checksum;
}
const plans = [
  {name: "completed-pass-pair", calls: {begin: 1, end: 1}, run: passLoop},
  {name: "coarse-cause", calls: {cause: 1}, run: causeLoop},
  {name: "coarse-phase-transition", calls: {phase: 1}, run: phaseLoop},
  {name: "coarse-phase-and-stop", calls: {phase: 1, stopPhase: 1}, run: stopLoop},
  {name: "phase-stop-already-closed", calls: {stopPhase: 1}, run: stoppedLoop},
  {name: "combined-coarse-pass-boundaries", calls: {cause: 1, begin: 1, phase: 1, stopPhase: 1, end: 1}, run: combinedLoop},
  {name: "milestone-already-recorded", calls: {mark: 1}, run: markLoop},
];
/** Force collection outside timed work; never infer retained size from an uncollected peak. */
function collect() { global.gc(); global.gc(); }
/** Record absolute process CPU and monotonic wall time; preserve negative paired noise later. */
function timed(action) {
  const cpu = process.cpuUsage(), at = process.hrtime.bigint(), checksum = action();
  const wallNs = Number(process.hrtime.bigint() - at), used = process.cpuUsage(cpu);
  return {userCpuUs: used.user, systemCpuUs: used.system, cpuUs: used.user + used.system, wallNs, checksum};
}
/** Summarize paired differences in absolute units; no percentage budget is imposed or implied. */
function summary(records) {
  const values = records.map(/** Equal work is paired within its prespecified replicate. */ row => row.actual.cpuUs - row.control.cpuUs).sort(/** Numeric ordering retains signed noise. */ (a, b) => a - b);
  const mean = values.reduce(/** Sum signed additional process CPU. */ (sum, value) => sum + value, 0) / values.length;
  return {meanAdditionalCpuUs: mean, medianAdditionalCpuUs: values[Math.floor(values.length / 2)], minAdditionalCpuUs: values[0], maxAdditionalCpuUs: values.at(-1),
    meanAdditionalWallNs: records.reduce(/** Wall time is a distinct observation from native CPU. */ (sum, row) => sum + row.actual.wallNs - row.control.wallNs, 0) / records.length};
}
/** Alternating matched blocks include the real method bodies and identical caller-side scalar work. */
function updateTrials(plan) {
  const rows = [];
  for (let replicate = 0; replicate < repetitions; replicate++) {
    const row = {replicate, order: replicate & 1 ? ["actual", "control"] : ["control", "actual"]};
    for (const arm of row.order) {
      const value = context(arm === "actual"); plan.run(value, warmup); collect();
      row[arm] = timed(/** No sampling, explicit GC, reports or constructors run in this interval. */ () => plan.run(value, iterations));
      assert.equal(row[arm].checksum, iterations);
      if (arm === "actual" && plan.calls.begin) assert.equal(value.owner.capture().totals[0], iterations + warmup);
    }
    assert.equal(row.actual.checksum, row.control.checksum); rows.push(row);
  }
  const callsPerIteration = Object.values(plan.calls).reduce(/** Report exact amplified API-call frequency. */ (sum, value) => sum + value, 0), aggregate = summary(rows);
  return {name: plan.name, iterations, callsPerIteration: plan.calls, totalCallsPerArm: iterations * callsPerIteration,
    ...aggregate, additionalCpuNsPerIteration: aggregate.meanAdditionalCpuUs * 1000 / iterations,
    additionalCpuNsPerBoundaryCall: aggregate.meanAdditionalCpuUs * 1000 / iterations / callsPerIteration, rows};
}
if (!dataRootsOnly) for (const plan of plans) sourceRecords.push(updateTrials(plan));

/** Each milestone is observed once per fresh owner; pool construction is outside timed work. */
function firstMarks(owners) {
  let checksum = 0;
  for (let index = 0; index < owners.length; index++) for (let milestone = 0; milestone < ACTIVITY_MILESTONES.length; milestone++) {
    owners[index].mark(ACTIVITY_MILESTONES[milestone]); checksum++;
  }
  return checksum;
}
const firstMarkPool = Math.min(copies, 2048), firstMarkCalls = firstMarkPool * ACTIVITY_MILESTONES.length, firstMarkRows = [];
/** Fresh owner pools preserve first-observation behavior without resetting production internals. */
const makeMarkPool = enabled => Array.from({length: firstMarkPool}, /** Setup allocation is excluded from mark timings/sampling. */ () => enabled ? new IndexingActivity(clock) : new NoopActivity());
if (!dataRootsOnly) { firstMarks(makeMarkPool(true)); firstMarks(makeMarkPool(false)); }
for (let replicate = 0; replicate < (dataRootsOnly ? 0 : repetitions); replicate++) {
  const row = {replicate, order: replicate & 1 ? ["actual", "control"] : ["control", "actual"]};
  for (const arm of row.order) {
    const owners = makeMarkPool(arm === "actual"); collect(); row[arm] = timed(/** All 24 real first-occurrence boundaries run on each live owner. */ () => firstMarks(owners));
    assert.equal(row[arm].checksum, firstMarkCalls);
  }
  firstMarkRows.push(row);
}
if (!dataRootsOnly) sourceRecords.push({name: "milestone-first-observation", owners: firstMarkPool, calls: firstMarkCalls,
  callsPerOwner: ACTIVITY_MILESTONES.length, ...summary(firstMarkRows), rows: firstMarkRows});

/** Populate the same bounded recorder across 25 synthetic hours plus two active slots. */
function seed(owner, value) {
  for (let hour = 0; hour < 25; hour++) {
    syntheticTime = hour * 3600000; owner.cause("known-file");
    const token = owner.begin("host-inventory", hour & 1 ? "global" : "local", "known-file", value.source, value.session);
    value.source.checked++; syntheticTime += 1; owner.end(token, "complete", value.source, value.session);
    owner.phase("source", "source-authority"); owner.phase("source", "complete"); owner.mark(ACTIVITY_MILESTONES[hour % ACTIVITY_MILESTONES.length]);
  }
  owner.begin("requested", "local", "known-file", value.source, value.session);
  owner.begin("hydration", "unknown", "startup-offline", value.source, value.session);
}
/** Include JS instance/slot/array containers and external backing stores, not just typed payloads. */
function memoryArm(enabled, filled) {
  collect(); const before = process.memoryUsage(), at = process.cpuUsage();
  retainedBatch = new Array(instances);
  const value = context(false);
  for (let index = 0; index < instances; index++) {
    syntheticTime = 0; const owner = enabled ? new IndexingActivity(syntheticClock) : new NoopActivity(); retainedBatch[index] = owner;
    if (filled) seed(owner, value);
  }
  const constructionCpu = process.cpuUsage(at); collect(); const after = process.memoryUsage();
  assert.equal(retainedBatch.length, instances);
  const typedPayloadPerOwner = Object.values(retainedBatch[0]).filter(/** Introspect actual owned payloads without adding production test hooks. */ value => ArrayBuffer.isView(value)).reduce(/** JS wrappers remain included in the heap observation. */ (sum, value) => sum + value.byteLength, 0);
  const result = {heapUsedDelta: after.heapUsed - before.heapUsed, arrayBuffersDelta: after.arrayBuffers - before.arrayBuffers,
    externalDelta: after.external - before.external, rssDelta: after.rss - before.rss, typedPayloadPerOwner,
    constructionAndSeedCpuUs: constructionCpu.user + constructionCpu.system};
  retainedBatch = null; collect(); return result;
}
for (const filled of dataRootsOnly ? [] : [false, true]) {
  const rows = [];
  for (let replicate = 0; replicate < Math.min(repetitions, 5); replicate++) {
    const row = {replicate, order: replicate & 1 ? ["actual", "control"] : ["control", "actual"]};
    for (const arm of row.order) row[arm] = memoryArm(arm === "actual", filled);
    row.additionalHeapPlusArrayBuffersPerOwner = (row.actual.heapUsedDelta + row.actual.arrayBuffersDelta - row.control.heapUsedDelta - row.control.arrayBuffersDelta) / instances;
    rows.push(row);
  }
  memoryRecords.push({state: filled ? "25-synthetic-hour-slots-two-active-passes" : "fresh", instances, sharedClockFunction: true, rows});
}

syntheticTime = 0;
const copyValue = context(false), copyOwner = new IndexingActivity(syntheticClock); seed(copyOwner, copyValue);
const current = ACTIVITY_CURRENT_COLUMNS.map(/** Fixed known current scalars; no host/state acquisition belongs to copying. */ () => 0);
copyFixture = {owner: copyOwner, capture: copyOwner.capture("eager", "on-demand", "balanced", "1.0.0", ...current)};
copyFixture.json = JSON.stringify(copyFixture.capture);
assert.equal(projectIndexingActivity(copyFixture.capture), copyFixture.capture);
assert(Buffer.byteLength(copyFixture.json) <= api.INDEXING_ACTIVITY_BYTE_LIMIT);
/** Capture costs include actual freezing, branding, sanitation and its internal size-budget checks. */
const captureCall = owner => owner.capture("eager", "on-demand", "balanced", "1.0.0", ...current);
/** A prior copy stage may retire an older admission; always measure a freshly admitted projection. */
function refreshCopyFixture() { copyFixture.capture = captureCall(copyOwner); copyFixture.json = JSON.stringify(copyFixture.capture); }
const noopCopyOwner = new NoopActivity();
/** Measure explicit copy stages separately from coarse indexing work and from each other. */
const copyPlans = [
  {name: "capture", actual: /** Fresh real public projection on every explicit copy. */ () => captureCall(copyOwner), control: /** Same call signature with diagnostics absent. */ () => captureCall(noopCopyOwner), consume: /** Consume stable projected facts. */ value => value.totals[0], calls: copies},
  {name: "project", actual: /** Real private-brand membership check. */ () => projectIndexingActivity(copyFixture.capture), control: /** No-op projection on the same value. */ () => copyFixture.capture, consume: /** Keep the projected identity live. */ value => value.totals[0], calls: iterations},
  {name: "serialize", actual: /** Real outgoing JSON encoding only, excluding capture. */ () => JSON.stringify(copyFixture.capture), control: /** A preexisting same-byte value is a no-serialization control. */ () => copyFixture.json, consume: /** Do not allocate a UTF8 copy inside the timed loop. */ value => value.length, calls: copies},
];
const copyRecords = [];
for (const plan of dataRootsOnly ? [] : copyPlans) {
  refreshCopyFixture();
  const rows = [];
  for (let replicate = 0; replicate < repetitions; replicate++) {
    const row = {replicate, order: replicate & 1 ? ["actual", "control"] : ["control", "actual"]};
    for (const arm of row.order) {
      const operation = plan[arm]; for (let index = 0; index < Math.min(warmup, plan.calls); index++) plan.consume(operation()); collect();
      row[arm] = timed(/** The sink prevents discarding actual constructed/serialized values. */ () => { let checksum = 0; for (let index = 0; index < plan.calls; index++) checksum += plan.consume(operation()); return checksum; });
    }
    assert.equal(row.actual.checksum, row.control.checksum); rows.push(row);
  }
  copyRecords.push({name: plan.name, calls: plan.calls, ...summary(rows), rows});
}

/** Sum sampled self sizes once, attributing descendants only when an actual compiled-owner frame owns them. */
function allocationTotals(profile) {
  let processEstimatedBytes = 0, ownerEstimatedBytes = 0, ownerFrameObserved = false;
  const visit = (node, inside) => {
    if (node.callFrame?.url === moduleUrl) { inside = true; ownerFrameObserved = true; }
    processEstimatedBytes += node.selfSize ?? 0;
    if (inside) ownerEstimatedBytes += node.selfSize ?? 0;
    for (const child of node.children ?? []) visit(child, inside);
  };
  visit(profile.head, false);
  return {processEstimatedBytes, ownerEstimatedBytes: ownerFrameObserved ? ownerEstimatedBytes : null,
    ownerAttributionAvailable: ownerFrameObserved, samples: Array.isArray(profile.samples) ? profile.samples.length : null};
}
// Node22.22.2's exact shipped V8 protocol supports both collection flags, although the installed
// @types/node inspector declaration only lists samplingInterval. Unsupported sampling stays explicit.
let samplingStatus = dataRootsOnly ? "not-run-data-roots-only" : "available", samplingActive = false;
const inspector = new Session();
if (!dataRootsOnly) try {
  inspector.connect(); await inspector.post("HeapProfiler.enable");
  for (const plan of plans) {
    for (let replicate = 0; replicate < 3; replicate++) {
      const row = {name: plan.name, replicate, callsPerIteration: plan.calls, iterations: sampleIterations, order: replicate & 1 ? ["actual", "control"] : ["control", "actual"]};
      for (const arm of row.order) {
        const value = context(arm === "actual"); plan.run(value, warmup); collect();
        await inspector.post("HeapProfiler.startSampling", {samplingInterval: 16384, includeObjectsCollectedByMajorGC: true, includeObjectsCollectedByMinorGC: true});
        samplingActive = true;
        const checksum = plan.run(value, sampleIterations), {profile} = await inspector.post("HeapProfiler.stopSampling"); samplingActive = false;
        assert.equal(checksum, sampleIterations); row[arm] = allocationTotals(profile);
      }
      allocationRecords.push(row);
    }
  }
  for (const name of ["milestone-first-observation", ...copyPlans.map(/** Copy allocation remains separate from background updates. */ plan => plan.name)]) {
    for (let replicate = 0; replicate < 3; replicate++) {
      const row = {name, replicate, order: replicate & 1 ? ["actual", "control"] : ["control", "actual"]};
      for (const arm of row.order) {
        refreshCopyFixture();
        const owners = name === "milestone-first-observation" ? makeMarkPool(arm === "actual") : null, plan = copyPlans.find(/** Select a fixed explicit-copy benchmark. */ item => item.name === name);
        collect();
        await inspector.post("HeapProfiler.startSampling", {samplingInterval: 16384, includeObjectsCollectedByMajorGC: true, includeObjectsCollectedByMinorGC: true}); samplingActive = true;
        let checksum = 0;
        if (owners) checksum = firstMarks(owners);
        else for (let index = 0; index < plan.calls; index++) checksum += plan.consume(plan[arm]());
        const {profile} = await inspector.post("HeapProfiler.stopSampling"); samplingActive = false;
        row[arm] = {...allocationTotals(profile), calls: owners ? firstMarkCalls : plan.calls, checksum};
      }
      assert.equal(row.actual.checksum, row.control.checksum); allocationRecords.push(row);
    }
  }
} catch (error) {
  if (!String(error.code ?? "").startsWith("ERR_INSPECTOR")) throw error;
  samplingStatus = "unavailable-or-incomplete"; allocationRecords.push({status: samplingStatus, error: String(error.message ?? error)});
}
finally {
  if (samplingActive) { try { await inspector.post("HeapProfiler.stopSampling"); } catch {} }
  try { await inspector.post("HeapProfiler.disable"); } catch {} inspector.disconnect();
}

/** One actual V8 DATA-root observation, not a whole-module/dominator/lifetime allocation proof. */
async function diagnosticDataRoots() {
  const session = new Session(), key = "__kplexIndexingActivityBenchmarkRoots", group = "kplex-activity-data-roots";
  const admissionLimit = api.INDEXING_ACTIVITY_CAPTURE_ADMISSION_LIMIT;
  assert.equal(admissionLimit, 8, "Snapshot lane expects the actual fixed eight-slot brand owner");
  // External callers keep all eight current keys alive, exercising each one-key table. Their DTOs
  // are caller-owned output, excluded from recorder bookkeeping; the real ring/tables are counted.
  const admitted = Array.from({length: admissionLimit}, /** Use the authentic copy-boundary admission operation. */ () => captureCall(copyOwner));
  const roots = {owner: copyOwner, columns: copyFixture.capture.columns, project: projectIndexingActivity, admitted}, chunks = [];
  // V8 may keep tiny typed arrays on heap until .buffer is read. Materialize before the snapshot,
  // not afterward, so the observed native backing and expected payload describe the same state.
  // This conservative measurement form may allocate the tiny totals buffer earlier than production.
  const buffers = new Set(Object.values(copyOwner).filter(/** Inspect the actual fixed typed stores. */ value => ArrayBuffer.isView(value)).map(/** Materialization is outside every CPU/heap sampling trial. */ value => value.buffer));
  const expectedBackingBytes = [...buffers].reduce(/** Count distinct backing payloads once. */ (sum, buffer) => sum + buffer.byteLength, 0);
  assert(!Object.hasOwn(global, key), "A competing benchmark owns the temporary inspector roots");
  let bytes = 0, overflow = false;
  /** Do not retain an unbounded raw snapshot, and never emit its source/stack/path payloads. */
  const chunk = message => { bytes += Buffer.byteLength(message.params.chunk); if (bytes > 128 * 1024 * 1024) { overflow = true; chunks.length = 0; } else if (!overflow) chunks.push(message.params.chunk); };
  global[key] = roots;
  try {
    collect(); session.connect(); await session.post("HeapProfiler.enable");
    const objects = {};
    for (const name of Object.keys(roots)) {
      const {result} = await session.post("Runtime.evaluate", {expression: `global.${key}.${name}`, objectGroup: group, silent: true});
      assert(result.objectId, "Actual data root has no inspector object identity"); objects[name] = result.objectId;
    }
    session.on("HeapProfiler.addHeapSnapshotChunk", chunk); await session.post("HeapProfiler.takeHeapSnapshot");
    assert(!overflow, "Snapshot exceeded this measurement's 128MiB raw-data bound");
    const snapshot = JSON.parse(chunks.join("")); chunks.length = 0;
    const ids = {};
    for (const [name, objectId] of Object.entries(objects)) {
      const {heapSnapshotObjectId} = await session.post("HeapProfiler.getHeapObjectId", {objectId});
      assert(heapSnapshotObjectId !== "0", "V8 did not assign the actual root a snapshot identity"); ids[name] = heapSnapshotObjectId;
    }
    const {nodes, edges, strings} = snapshot, meta = snapshot.snapshot.meta;
    const nf = meta.node_fields, ef = meta.edge_fields, nw = nf.length, ew = ef.length;
    const ni = Object.fromEntries(["type", "name", "id", "self_size", "edge_count"].map(/** Use this V8 snapshot's own schema, never hardcoded numeric offsets. */ name => [name, nf.indexOf(name)]));
    const ei = Object.fromEntries(["type", "name_or_index", "to_node"].map(/** Edge targets are node-array offsets, not heap object IDs. */ name => [name, ef.indexOf(name)]));
    assert([...Object.values(ni), ...Object.values(ei)].every(/** Missing metadata makes the cut unavailable, not a zero-size estimate. */ value => value >= 0));
    const nodeTypes = meta.node_types[ni.type], edgeTypes = meta.edge_types[ei.type], starts = new Uint32Array(nodes.length / nw), found = {};
    let edgeOffset = 0;
    for (let offset = 0; offset < nodes.length; offset += nw) {
      starts[offset / nw] = edgeOffset; edgeOffset += nodes[offset + ni.edge_count] * ew;
      for (const [name, id] of Object.entries(ids)) if (String(nodes[offset + ni.id]) === id) found[name] = offset;
    }
    assert(Object.keys(found).length === Object.keys(roots).length && edgeOffset === edges.length, "Snapshot root/schema mapping is incomplete");
    const type = offset => nodeTypes[nodes[offset + ni.type]], name = offset => strings[nodes[offset + ni.name]], size = offset => nodes[offset + ni.self_size];
    /** Visit only one captured node's own outgoing edges; no global root traversal is performed. */
    const eachEdge = (offset, visit) => {
      const end = starts[offset / nw] + nodes[offset + ni.edge_count] * ew;
      for (let index = starts[offset / nw]; index < end; index += ew) {
        const kind = edgeTypes[edges[index + ei.type]], raw = edges[index + ei.name_or_index];
        visit(kind, kind === "element" || kind === "hidden" ? String(raw) : strings[raw], edges[index + ei.to_node]);
      }
    };
    const seen = new Set(), byType = {}, excluded = {}, perRoot = {}, unknownNative = new Set(), brandSlots = new Set();
    let total = 0, backingBytes = 0, clockClosureBytes = 0, shallowContextBytes = 0, truncated = false;
    /** Shared data is counted once; engine self_size includes actual object/container headers. */
    const include = offset => {
      if (seen.has(offset)) return; seen.add(offset); const bytes = size(offset); total += bytes;
      byType[type(offset)] = (byType[type(offset)] ?? 0) + bytes;
      if (type(offset) === "native") backingBytes += bytes;
    };
    const skip = why => { excluded[why] = (excluded[why] ?? 0) + 1; };
    /** Function context headers are included shallowly; closure/global values are never followed. */
    const closure = offset => {
      if (!seen.has(offset)) clockClosureBytes += size(offset); include(offset);
      eachEdge(offset, (kind, label, target) => {
        if (kind === "internal" && label === "context" && /(?:Function)?Context/.test(name(target)) && !/NativeContext/.test(name(target))) {
          if (!seen.has(target)) shallowContextBytes += size(target); include(target);
        }
      });
    };
    /** Fixed policy for these actual owner/columns roots, including bounded own shape descriptors. */
    const walk = (offset, label, weakTable = false) => {
      const before = total, pending = [offset];
      while (pending.length) {
        const current = pending.pop(); if (seen.has(current)) continue;
        if (seen.size >= 4096) { truncated = true; break; }
        const kind = type(current), title = name(current);
        if (kind === "closure") { closure(current); continue; }
        if (["code", "synthetic", "symbol"].includes(kind)) { skip("code-symbol-synthetic"); continue; }
        if (kind === "hidden" && !/(?:Map|DescriptorArray|PropertyArray|EnumCache|NameDictionary|FixedArray)/.test(title)) { skip("other-engine-metadata"); continue; }
        if (kind === "native" && title !== "system / JSArrayBufferData") { unknownNative.add(title); continue; }
        include(current);
        eachEdge(current, (edgeKind, edgeName, target) => {
          if (["weak", "shortcut", "context"].includes(edgeKind)) { skip("weak-shortcut-context"); return; }
          if (["__proto__", "prototype", "constructor", "constructor_or_back_pointer", "back_pointer", "transitions", "native_context", "dependent_code"].includes(edgeName)) { skip("prototype-code-shape-ancestry"); return; }
          if (brandSlots.has(target)) { skip("brand-slot-counted-separately"); return; }
          // WeakSet entry targets belong to their callers, not strong diagnostic retention. Its
          // actual table/header/backing capacity remains included; live report DTOs do not.
          if (weakTable && current !== offset && !["array", "hidden", "native"].includes(type(target))) { skip("weakset-entry-target"); return; }
          pending.push(target);
        });
      }
      perRoot[label] = total - before;
    };
    walk(found.owner, "ownerIncludingClockAndShapeHeaders"); walk(found.columns, "sharedColumnsAndVocabularyData");
    // The actual project function closes over the private brand. Inspect at most four context
    // headers for its exact binding; never expose a production test export or walk those globals.
    const contexts = []; eachEdge(found.project, (kind, label, target) => { if (kind === "internal" && label === "context") contexts.push(target); });
    let brand, brandContext;
    for (let step = 0; contexts.length && step < 4 && brand === undefined; step++) {
      const current = contexts.shift();
      eachEdge(current, (kind, label, target) => {
        if (kind === "context" && label === "captures" && name(target) === "Array") { brand = target; brandContext = current; }
        if (kind === "internal" && label === "previous" && /Context/.test(name(target)) && !/NativeContext/.test(name(target))) contexts.push(target);
      });
    }
    let brandTables = 0;
    if (brand !== undefined) {
      const beforeBrand = total;
      include(brandContext);
      eachEdge(brand, (kind, label, target) => { if (kind === "element" && name(target) === "WeakSet") brandSlots.add(target); });
      walk(brand, "privateCaptureBrandRing");
      for (const slot of brandSlots) {
        eachEdge(slot, (kind, label, target) => { if (kind === "internal" && label === "table" && ["array", "hidden"].includes(type(target))) brandTables++; });
        walk(slot, "privateCaptureBrandSlot", true);
      }
      delete perRoot.privateCaptureBrandSlot; perRoot.privateCaptureBrandRing = total - beforeBrand;
    }
    const completeCut = !truncated && unknownNative.size === 0 && backingBytes === expectedBackingBytes && brand !== undefined && brandSlots.size === admissionLimit && brandTables === admissionLimit;
    return {status: completeCut ? "observed-data-cut" : "incomplete-data-cut", dataBytes: total, limitBytes: 32 * 1024,
      observedDataCutWithinLimit: completeCut ? total <= 32 * 1024 : null, hardWholeModuleMemoryBoundProven: false,
      heapObjectIds: {...ids, captureBrandRing: brand === undefined ? null : String(nodes[brand + ni.id])}, perRootIncrementalBytes: perRoot, bytesByNodeType: byType,
      backingBytes, expectedBackingBytes, clockFunctionShallowBytes: clockClosureBytes, clockContextShallowBytes: shallowContextBytes,
      captureBrandRing: {located: brand !== undefined, admissionLimit, observedWeakSets: brandSlots.size, identifiedTables: brandTables, retainedExternalCopies: admitted.length,
        sourceCapacityBound: "Fixed ring of eight replacement WeakSets, one admitted key per slot; retirement is independent of how long callers retain previous DTOs. Capacity is bounded by implementation/regression proof, not inferred from this snapshot."},
      truncated, unknownNativeBackingKinds: [...unknownNative], excludedEdges: excluded, snapshotRawBytes: bytes,
      limits: ["Actual V8 self_size over the selected DATA cut; shared immutable strings/shape headers are conservatively included, not proven incremental ownership.",
        "Prototype, constructor, shape ancestry/transitions, code and closure-global value graphs are excluded. Function/context headers are shallow only. This is not a dominator-retained-size or whole-module/code/loader measurement.",
        "One filled recorder and all eight one-key admission tables are observed. The finite source structure is separate proof from the observed byte cut; no hard whole-module/code/loader memory guarantee follows.",
        "Reading .buffer before the snapshot may materialize the 32-byte totals backing earlier than production; this conservative observed form is separate from unmodified per-owner post-GC trials.",
        "Heap snapshot schema/backing visibility is V8-specific; missing ring/table/backing evidence is inconclusive. No raw snapshot is saved or exported."]};
  } catch (error) { return {status: "unavailable", observedDataCutWithinLimit: null, hardWholeModuleMemoryBoundProven: false, reason: String(error.message ?? error)}; }
  finally {
    session.removeListener("HeapProfiler.addHeapSnapshotChunk", chunk); chunks.length = 0;
    if (global[key] === roots) delete global[key];
    try { await session.post("Runtime.releaseObjectGroup", {objectGroup: group}); } catch {}
    try { await session.post("HeapProfiler.disable"); } catch {} session.disconnect();
  }
}
const dataRootObservation = await diagnosticDataRoots();

/** Observe one idle turn without invoking the recorder or advancing its own clock/state. */
let idleClockReads = 0, idleTime = 0;
const idleOwner = new IndexingActivity(/** Only the constructor is allowed to read during this idle proof. */ () => { idleClockReads++; return idleTime; });
const state = owner => JSON.stringify(Object.entries(owner).map(/** Read owned primitive/array cells, not a capture which legitimately samples time. */ ([key, value]) => [key, ArrayBuffer.isView(value) ? [...value] : typeof value === "function" ? "clock" : value]));
const idleBefore = state(idleOwner), readsBefore = idleClockReads; idleTime = 25 * 3600000; await nextTurn();
assert.equal(idleClockReads, readsBefore); assert.equal(state(idleOwner), idleBefore);

let frequency = {status: "not-supplied", meaning: "Amplified call counts above are exact synthetic counts; actual native update frequency is unmeasured without separately collected evidence."};
if (options.has("frequency-json")) {
  const bytes = readFileSync(resolve(options.get("frequency-json"))), supplied = JSON.parse(bytes), calls = {};
  assert(Number.isFinite(supplied.durationMs) && supplied.durationMs > 0);
  for (const name of ["begin", "end", "cause", "mark", "phase", "stopPhase"]) { assert(Number.isSafeInteger(supplied.calls?.[name]) && supplied.calls[name] >= 0, `Missing actual frequency ${name}`); calls[name] = supplied.calls[name]; }
  frequency = {status: "supplied-separate-evidence", evidenceSha256: hash(bytes), durationMs: supplied.durationMs, calls,
    callsPerHour: Object.fromEntries(Object.entries(calls).map(/** Report actual observed rates without asserting synthetic work is a native workload. */ ([name, count]) => [name, count * 3600000 / supplied.durationMs]))};
}
console.log(JSON.stringify({schemaVersion: 1, benchmark: "indexing-activity-boundary-cost", node: process.version, v8: process.versions.v8,
  hardware: {platform: process.platform, architecture: process.arch, osRelease: release(), cpu: cpus()[0]?.model, logicalProcessors: cpus().length, totalMemoryBytes: totalmem()},
  sources, driverSha256: hash(readFileSync(fileURLToPath(import.meta.url))), compiledSha256: hash(code),
  conditions: {iterations, repetitions, warmup, instances, copies, sampleIterations, dataRootsOnly, nodeArguments: process.execArgv,
    clock: "Node performance.now for updates; accelerated shared clock only for bounded retained/copy fixtures", matchedOrder: "AB/BA alternating by replicate", explicitGcOutsideTimedUpdates: true,
    percentagesAreNotBudgets: true, memory: "Signed post-GC process deltas include JS/array containers; heapUsed+arrayBuffers excludes external's overlapping ArrayBuffer count. RSS/external remain separate noisy observations.",
    sampling: "Poisson sampled estimated V8 heap allocation including requested major/minor-GC-collected samples; not exact total allocation, native backing-store allocation, or profiler-free CPU.",
    copyScope: "IndexingActivity subprojection only, not complete Copy diagnostics/Report bug UI or clipboard latency", milestones: "Repeated warmed guard and first-observation fresh-owner pools are distinct; pool construction is excluded from the first-mark stage."},
  references: ["https://nodejs.org/docs/latest-v22.x/api/inspector.html", "https://raw.githubusercontent.com/nodejs/node/v22.22.2/deps/v8/include/js_protocol.pdl", "https://nodejs.org/docs/latest-v22.x/api/v8.html#v8getheapsnapshotoptions"],
  updateTrials: sourceRecords, retainedMemory: {moduleImport: moduleImportRetained, perOwner: memoryRecords}, explicitCopy: {utf8Bytes: Buffer.byteLength(copyFixture.json), rows: copyRecords},
  allocationSampling: {status: samplingStatus, intervalBytes: 16384, includeObjectsCollectedByMajorGC: true, includeObjectsCollectedByMinorGC: true, rows: allocationRecords},
  diagnosticDataRoots: dataRootObservation,
  idle: {clockReadsAdded: idleClockReads - readsBefore, retainedStateUnchanged: true, driverOwnedYield: "one setImmediate", sourceContract: "No timers/polling/watchers/I/O scheduling must also be proven by the source contract tests; this is not 24h native use."},
  actualFrequency: frequency}, null, 2));
