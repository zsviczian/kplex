/**
 * Shared PR212 browser lifetime for source selection and recovery contracts. Only finite synthetic
 * native facts surround production storage/acquisition; cleanup retires source owners and the owned
 * Chromium profile independently of assertions. Each scenario requires zero reader/decode/lease debt.
 */
import { contributorBrowserBundle, contributorBrowserInitialize } from './contributorBrowserFixture.mjs';
import { chromiumHarness } from './browserTypeScript.mjs';
import { installCachedSourceReadFixture } from './cachedSourceReadFixture.mjs';

const bundle = await contributorBrowserBundle(['src/index/SourceRepository.ts']);

/** Own one finite native fixture and verify reader/decode/lease retirement even on assertion failure. */
export async function warmSelectionScenario(name, body, { dense = false, urlFree = false, beforeSeed = '', reopenForCleanup = false } = {}) {
  const browser = await chromiumHarness(bundle);
  try {
    await browser.evaluate(contributorBrowserInitialize);
    await browser.evaluate(`(${installCachedSourceReadFixture.toString()})()`);
    return await browser.evaluate(`(/** Own this finite seeded scenario and its resource assertions. */async()=>{
      const M=sourceModules,B=cachedSourceRead,c=window.warmTestContext=await B.setup(${JSON.stringify(name)},1,${dense},${urlFree});
      const f=c.fixture,r=f.repository,db=c.db,id=B.path(0),file=f.files.get(id);
      ${beforeSeed}
      await B.seedRange(c);
      const originalHead=(await r.inspect(id,[])).head;
      ${body}
      equal(r.readers.size,0,'No retained selected reader');equal(r.decodeBytes,0,'No retained prepared decode');
      // A connection-failure scenario must check durable lease retirement through a new native
      // connection. The failed handle is deliberately unusable; this is cleanup, not readiness.
      if(${reopenForCleanup})f.cache.openRetryAfter=0;
      const cleanupDB=${reopenForCleanup}?await f.cache.open():db;ok(cleanupDB,'Native cleanup connection');
      const rows=await value(cleanupDB.transaction('meta').objectStore('meta').getAll());
      equal(rows.filter(row=>row.key?.startsWith('source-lease:')).length,0,'All owned durable family leases retired');
      return true;
    })()`);
  } finally {
    try { await browser.evaluate('window.warmTestContext?.fixture.close();true'); }
    finally { await browser.cleanup(); }
  }
}

