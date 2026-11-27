/** Validate and compare the repeatable native Compass navigation/zoom benchmark receipts. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseArgs} from 'node:util';

const sha256 = /^[a-f0-9]{64}$/;
const requiredActions = ['navigation','zoom'];
const optionalActions = ['history','pan','scroll'];
const timings = ['commitMs','settledFrameProxyMs'];
const latencyFraction = 0.05;

/** Use nearest ranks, and avoid a tail percentile unsupported by the sample count. */
export function summarizeSamples(values) {
  assert(values.length && values.every(value => Number.isFinite(value) && value >= 0), 'Invalid benchmark samples');
  const sorted = [...values].sort((a,b) => a-b);
  /** Discrete nearest rank keeps observations in the units actually measured. */
  const rank = fraction => sorted[Math.ceil(sorted.length*fraction)-1];
  const p50 = rank(.5);
  const deviation = sorted.map(value=>Math.abs(value-p50)).sort((a,b)=>a-b);
  return {count:sorted.length,p50,p95:rank(.95),...(sorted.length>=100?{p99:rank(.99)}:{}),max:sorted.at(-1),
    medianAbsoluteDeviation:deviation[Math.ceil(deviation.length/2)-1]};
}

/** An unsuccessful or incomplete native receipt cannot contribute to a benchmark. */
function validateReceipt(report) {
  assert.equal(report.name,'web-runtime-performance');
  assert.equal(report.status,'passed');
  assert.equal(report.cleanup,'passed');
  assert(['main.js','styles.css','manifest.json'].every(name=>sha256.test(report.artifacts?.[name])), 'Missing exact artifact hashes');
  assert(report.startedAt && report.driver?.scenario && report.driver?.transport && report.source, 'Missing run identity');
  const {host,display,mode,inventory,density,fixtureFiles,captureHashes,samples,frameIntervalsMs,work,resources} = report.result;
  assert(host?.chromium && display?.width > 0 && display.height > 0 && display.dpr > 0 && display.font, 'Missing comparable host and viewport');
  assert(['eager','on-demand'].includes(mode) && inventory > 0 && fixtureFiles === density+2, 'Missing benchmark fixture identity');
  assert(captureHashes.length===2 && captureHashes.every(hash=>sha256.test(hash)) && captureHashes[0]!==captureHashes[1], 'Missing changed compositor images');
  assert(Object.keys(work.beforeNavigation).length && Object.keys(work.afterNavigation).length,'Missing navigation work');
  assert(Object.keys(work.beforeZoom).length && JSON.stringify(work.beforeZoom)===JSON.stringify(work.afterZoom), 'Zoom admitted source work');
  assert(frameIntervalsMs.length>=30,'Missing frame interval observations');
  assert(requiredActions.every(name=>Object.hasOwn(samples,name)) && Object.keys(samples).every(name=>[...requiredActions,...optionalActions].includes(name)), 'Missing or unsupported benchmark workload');
  for(const name of Object.keys(samples)) {
    const rows = samples[name];
    assert(rows.length>=30,`Missing ${name} samples`);
    assert(Number.isFinite(resources?.[name]?.wallMs) && resources[name].wallMs>0,`Missing ${name} wall timing`);
    for(const row of rows) assert(row.nodes>1 && row.edges>=1 && row.gates>0 && (name==='scroll'||row.mutations>0) && row.settledFrameProxyMs>=row.commitMs,`Invalid ${name} scene witness`);
    if(name==='pan'||name==='scroll')assert(Object.keys(work[name].before).length && JSON.stringify(work[name].before)===JSON.stringify(work[name].after),`${name} admitted source work`);
  }
  return report.result;
}

/** Reject mixed workloads or duplicate runs and return the per-run statistics intact. */
function runStatistics(reports, expected, driver) {
  assert(reports.length>=3,'At least three independent desktop runs are required');
  assert.equal(new Set(reports.map(report=>report.startedAt)).size,reports.length,'Duplicate desktop run');
  return reports.map(report=>{
    const result=validateReceipt(report);
    assert.deepEqual(workload(result),expected,'Benchmark input or host differs');
    assert.deepEqual(driverIdentity(report),driver,'Benchmark driver differs');
    return {
      scenarios:Object.fromEntries(expected.actions.map(name=>[name,Object.fromEntries(timings.map(metric=>[metric,summarizeSamples(result.samples[name].map(row=>row[metric]))]))])),
      frameIntervalsMs:summarizeSamples(result.frameIntervalsMs),resources:result.resources,
      heapBefore:result.heapBefore,heapAfter:result.heapAfter,work:result.work,artifacts:report.artifacts,
    };
  });
}

/** Retain fixed test inputs while allowing Windows and macOS to be reported separately. */
function workload({host,display,mode,inventory,density,fixtureFiles,fixture,inputPhase,cadenceMs,samples,startup}) {
  const startupPath=startup&&{route:startup.hydration?.route,outcome:startup.hydration?.outcome,fullBuilds:startup.semantic?.fullBuilds};
  const actions=Object.keys(samples).sort();
  const sampleCounts=Object.fromEntries(actions.map(name=>[name,samples[name].length]));
  return {host,display,mode,inventory,density,fixtureFiles,fixture,inputPhase,cadenceMs,startupPath,actions,sampleCounts};
}

/** The serialized invocation embeds its unique report directory. Compare executable owners. */
function driverIdentity({driver:{scenario,transport}}) {
  return {scenario,transport};
}

/** Use observed A/A dispersion as evidence, never adjust the target to accommodate a candidate. */
export function compareBenchmarks(baseline, candidate) {
  assert(baseline.length,'Baseline receipts are required');
  const inputs=workload(validateReceipt(baseline[0])), driver=driverIdentity(baseline[0]);
  const baseRuns=runStatistics(baseline,inputs,driver);
  for(const report of baseline) {
    assert.deepEqual(report.source,baseline[0].source,'A/A source revisions differ');
    assert.deepEqual(report.artifacts,baseline[0].artifacts,'A/A artifact hashes differ');
  }
  const nextRuns=candidate?.length?runStatistics(candidate,inputs,driver):null;
  if(nextRuns)for(const report of candidate) {
    assert.deepEqual(report.source,candidate[0].source,'Candidate source revisions differ');
    assert.deepEqual(report.artifacts,candidate[0].artifacts,'Candidate artifact hashes differ between runs');
  }
  // Pending known-file observations are a gauge. The zoom lane still checks their equality.
  const navigationWork=Object.keys(baseRuns[0].work.afterNavigation).filter(counter=>counter!=='pendingKnown').map(counter=>{
    /** Attribute work to timed navigation, keeping unrelated warm-up/settlement out of its delta. */
    const change=({work})=>work.afterNavigation[counter]-work.beforeNavigation[counter];
    const baselineChanges=baseRuns.map(change), candidateChanges=nextRuns?.map(change)??[];
    assert([...baselineChanges,...candidateChanges].every(value=>Number.isFinite(value)&&value>=0),`Missing navigation work counter ${counter}`);
    const maximum=Math.max(...baselineChanges);
    return {counter,baselineChanges,candidateChanges,maximum,passed:candidateChanges.every(value=>value<=maximum)};
  });
  const checks=[];
  for(const action of inputs.actions)for(const metric of timings)for(const percentile of ['p50','p95']) {
    const baselineValues=baseRuns.map(run=>run.scenarios[action][metric][percentile]);
    const reference=summarizeSamples(baselineValues).p50;
    const spread=Math.max(...baselineValues)-Math.min(...baselineValues);
    const maximum=reference*(1+latencyFraction);
    const candidates=nextRuns?.map(run=>run.scenarios[action][metric][percentile])??[];
    const withinBudget=candidates.every(value=>value<=maximum);
    checks.push({action,metric,percentile,baselineValues,candidates,reference,spread,maximum,stable:spread<=reference*latencyFraction,withinBudget});
  }
  return {inputs,baseRuns,nextRuns,checks,navigationWork,
    passed:checks.every(row=>row.stable&&row.withinBudget)&&navigationWork.every(row=>row.passed)};
}

/** Exact one-sided sign-test bounds for the median across independent matched sessions. */
export function medianConfidenceBound(values, confidence=.95) {
  assert(values.length>=5 && values.length<=50 && values.every(Number.isFinite),'Use 5–50 independent matched sessions');
  const sorted=[...values].sort((a,b)=>a-b), n=values.length;
  let term=2**(-n), lowerTail=term, rank=n-1;
  for(let i=1;i<n;i++){
    term*=((n-i+1)/i);
    if(lowerTail+term>1-confidence)break;
    lowerTail+=term;rank--;
  }
  return {lower:sorted[n-1-rank],upper:sorted[rank],confidence:1-lowerTail};
}

/** Compare matched A/B/A runs while reporting raw A/A dispersion separately. */
export function inspectPairedBenchmarks(baseline,candidate) {
  assert(candidate.length>=5&&baseline.length===candidate.length+1,'Pair each of at least five candidate runs between two references');
  const comparison=compareBenchmarks(baseline,candidate);
  const baselineTimes=baseline.map(row=>Date.parse(row.startedAt)), candidateTimes=candidate.map(row=>Date.parse(row.startedAt));
  assert(candidateTimes.every((time,i)=>time>baselineTimes[i]&&time<baselineTimes[i+1]),'Expected chronologically interleaved A/B/A runs');
  const paired=comparison.checks.map(({action,metric,percentile})=>{
    const delta=comparison.nextRuns.map((run,i)=>{
      const before=comparison.baseRuns[i].scenarios[action][metric][percentile],after=comparison.baseRuns[i+1].scenarios[action][metric][percentile];
      const fraction=(candidateTimes[i]-baselineTimes[i])/(baselineTimes[i+1]-baselineTimes[i]);
      const estimate=before+(after-before)*fraction;
      assert(estimate>0,'Paired baseline duration must be positive');
      return run.scenarios[action][metric][percentile]/estimate-1;
    });
    const bounds=medianConfidenceBound(delta);
    return {action,metric,percentile,delta,bounds,withinFivePercent:bounds.upper<=latencyFraction,
      repeatableSlowdown:bounds.lower>0,repeatableRegression:bounds.lower>latencyFraction};
  });
  const introducedWork=comparison.navigationWork.some(row=>!row.passed);
  const passed=!introducedWork&&paired.every(row=>row.withinFivePercent);
  const status=passed?'passed':introducedWork||paired.some(row=>row.repeatableRegression)?'regression':'inconclusive';
  return {...comparison,rawComparisonPassed:comparison.passed,paired,status,passed};
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const {values}=parseArgs({options:{baseline:{type:'string',multiple:true},candidate:{type:'string',multiple:true},'inspect-paired':{type:'boolean'}}});
  /** Read the managed JSON receipt generated by the exact-build lane. */
  const read=path=>JSON.parse(readFileSync(path,'utf8'));
  const baseline=(values.baseline??[]).map(read),candidate=(values.candidate??[]).map(read);
  const comparison=values['inspect-paired']?inspectPairedBenchmarks(baseline,candidate):compareBenchmarks(baseline,candidate);
  console.log(JSON.stringify(comparison,null,2));
  if(!comparison.passed)process.exitCode=1;
}
