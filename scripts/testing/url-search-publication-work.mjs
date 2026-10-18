/**
 * #153 search-flush work gate using actual publisher/search/evidence methods and controlled facts.
 * Exact committed GraphIndex source may be selected without changing the checkout. Each size
 * prepares distinct children under one origin, then observes one explicit display boundary.
 * Ordered graph/evidence/public-search digests and zero source work accompany allocation counts;
 * the fixed clock/virtual timers prohibit elapsed or representative cadence claims.
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {contributorBrowserBundle} from '../../tests/support/contributorBrowserFixture.mjs';
import {urlSearchPublicationFixture,urlSearchGraphValue,urlSearchResults} from '../../tests/support/urlSearchPublicationProbe.mjs';
import {spawnNativeSync} from './obsidian/processTools.mjs';

const source='src/index/GraphIndex.ts',ref=process.argv.find(/** Baseline selection is explicit and commit-pinned. */arg=>arg.startsWith('--baseline-ref='))?.slice('--baseline-ref='.length),overrides={};
if(ref){assert.match(ref,/^[a-f0-9]{7,40}$/);const result=spawnNativeSync('git',['show',`${ref}:${source}`],{cwd:process.cwd(),encoding:'utf8',timeout:10000});assert.equal(result.status,0,result.stderr);overrides[source]=result.stdout;}
const bundle=await contributorBrowserBundle([source,'src/index/GraphBuilder.ts'],overrides),rows=[];
for(const owners of [256,512,1024,2048,4096]){
  const f=urlSearchPublicationFixture(bundle),i=f.index;
  try{
    for(let n=0;n<owners;n++){const record=f.add(`Owner-${n}.md`,`[High label ${n}](https://search.example/child/${n})`);await i.publishUrlOwner(record.file,record.body,0,undefined,true);}
    f.reset();i.flushUrlPublication();const counts={...f.counts},operations={...f.operations};
    const value={graph:urlSearchGraphValue(i),search:urlSearchResults(i,['','high label 0','https://search.example/child/'],owners*2+8)};
    rows.push({owners,...counts,operations,urlCatalog:i.urlSearchEntries.size,duplicateGeneralUrls:[...i.searchEntryByPath.keys()].filter(/** The effective public merges already discard these duplicate general entries. */path=>i.urlSearchEntries.has(path)).length,digest:createHash('sha256').update(JSON.stringify(value)).digest('hex')});
    assert.equal(operations.reads,0);assert.equal(operations.parses,0);
  }finally{f.close();}
}
console.log(JSON.stringify({node:process.version,baselineRef:ref??null,sourceHash:createHash('sha256').update(overrides[source]??readFileSync(source)).digest('hex'),rows},null,2));
