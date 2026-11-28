/** Exercise benchmark evidence ingestion with positive and deliberately broken receipts. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {compareBenchmarks,inspectPairedBenchmarks,medianConfidenceBound,summarizeSamples} from '../scripts/testing/webRuntimeComparison.mjs';

/** Construct a complete independent receipt for testing the comparison rather than host timing. */
function receipt(index, commitMs=10) {
  const samples=()=>Array.from({length:30},()=>({commitMs,settledFrameProxyMs:40,mutations:1,nodes:8,edges:7,gates:32}));
  const hash='a'.repeat(64);
  return {name:'web-runtime-performance',status:'passed',cleanup:'passed',startedAt:new Date(index).toISOString(),
    driver:{scenario:'scenario',transport:'transport',definitions:`run-${index}`},source:{'src/ui/PlexGraph.tsx':'graph'},
    artifacts:{'main.js':hash,'styles.css':hash,'manifest.json':hash},
    result:{host:{chromium:'test',os:'test'},display:{width:1200,height:900,dpr:1,font:'sans-serif'},mode:'eager',inventory:100,density:6,fixtureFiles:8,
      captureHashes:[hash,'b'.repeat(64)],samples:{navigation:samples(),zoom:samples()},frameIntervalsMs:Array(40).fill(16.7),
      resources:{navigation:{wallMs:1200},zoom:{wallMs:1200}},
      work:{beforeNavigation:{vaultReads:1},afterNavigation:{vaultReads:1},beforeZoom:{vaultReads:1},afterZoom:{vaultReads:1}}}};
}

test('nearest ranks retain actual samples and require enough observations for p99',()=>{
  assert.deepEqual(summarizeSamples([6,2,3,4]),{count:4,p50:3,p95:6,max:6,medianAbsoluteDeviation:1});
  assert.equal(summarizeSamples(Array.from({length:100},(_,index)=>index)).p99,98);
  assert.throws(()=>summarizeSamples([5,NaN]),/Invalid benchmark samples/);
});

test('comparison rejects missing runs, scene witnesses and source neutrality',()=>{
  const runs=[receipt(0),receipt(1),receipt(2)];
  assert.throws(()=>compareBenchmarks(runs.slice(1)),/three independent/);
  assert.throws(()=>compareBenchmarks([runs[0],runs[1],runs[1]]),/Duplicate/);
  const changed=structuredClone(runs);
  changed[2].result.work.afterZoom.vaultReads++;
  assert.throws(()=>compareBenchmarks(changed),/Zoom admitted source work/);
  changed[2]=receipt(2);
  changed[2].result.samples.zoom.pop();
  assert.throws(()=>compareBenchmarks(changed),/Missing zoom samples/);
  changed[2]=receipt(2);
  changed[2].result.samples.navigation[2].edges=0;
  assert.throws(()=>compareBenchmarks(changed),/Invalid navigation scene witness/);
  changed[2]=receipt(2);
  changed[2].artifacts['main.js']='c'.repeat(64);
  assert.throws(()=>compareBenchmarks(changed),/A\/A artifact hashes differ/);
});

test('A/A dispersion cannot silently authorize a slower candidate',()=>{
  const baseline=[receipt(0),receipt(1,10.2),receipt(2,10.1)];
  assert.equal(compareBenchmarks(baseline).passed,true);
  assert.equal(compareBenchmarks([receipt(0),receipt(1,10.6),receipt(2,10.1)]).passed,false);
  assert.equal(compareBenchmarks(baseline,[receipt(3,10.3),receipt(4,10.3),receipt(5,10.4)]).passed,true);
  const slower=compareBenchmarks(baseline,[receipt(3,10.3),receipt(4,10.7),receipt(5,10.4)]);
  assert.equal(slower.passed,false);
  assert(slower.checks.some(row=>row.metric==='commitMs'&&!row.withinBudget));
  const extraWork=[receipt(3),receipt(4),receipt(5)];
  extraWork[1].result.work.afterNavigation.vaultReads++;
  assert.equal(compareBenchmarks(baseline,extraWork).passed,false);
});

test('paired inspection preserves the A/A result and identifies a reproducible slowdown',()=>{
  assert.deepEqual(medianConfidenceBound([.01,.02,.03,.04,.05]),{lower:.01,upper:.05,confidence:.96875});
  assert.deepEqual(medianConfidenceBound([1,2,3,4,5,6,7,8]),{lower:2,upper:7,confidence:.96484375});
  const baseline=Array.from({length:6},(_,i)=>receipt(i*2));
  const candidate=Array.from({length:5},(_,i)=>receipt(i*2+1,10.7));
  const result=inspectPairedBenchmarks(baseline,candidate);
  assert.equal(result.passed,false);
  assert.equal(result.status,'regression');
  assert(result.paired.filter(row=>row.metric==='commitMs').every(row=>!row.withinFivePercent&&row.repeatableSlowdown));
  assert.throws(()=>inspectPairedBenchmarks(baseline,candidate.toReversed()),/chronologically interleaved/);
});

test('paired decision allows noisy identical builds and identifies an inconclusive tail',()=>{
  const baseline=[10,10.9,10.1,10.7,10,10.9].map((value,index)=>receipt(index*2,value));
  const candidate=Array.from({length:5},(_,i)=>receipt(i*2+1,10.4));
  const result=inspectPairedBenchmarks(baseline,candidate);
  assert.equal(result.rawComparisonPassed,false);
  assert.equal(result.status,'passed');
  candidate[2]=receipt(5,12);
  assert.equal(inspectPairedBenchmarks(baseline,candidate).status,'inconclusive');
});
