/**
 * Hash disposable-vault cache inputs outside timed startup. Records stream through the existing
 * bounded readers into an injected synchronous SHA-256 implementation; no payload/path is returned.
 * Optional borrowed live fingerprints must match every saved input; head-key ordering separates
 * semantic input identity from native record enumeration. No identity grants host/graph authority.
 */
export async function startupCacheIdentity(cache, createHash, fingerprints, current = /** Standalone stored-cache readers have no live graph lifetime. */ () => true, markdownPaths) {
  if(!current())throw Error('Input selection changed while hashing');
  const replayPaths=markdownPaths?.();
  const db = await cache.open(), meta = await cache.readSnapshotMeta();
  if (!db || !meta || meta.key !== 'active' || meta.completedMarkdownPaths !== undefined) throw Error('Complete saved cache required for input identity');
  /** Read the actual global source sequence without changing leases, journals or source state. */
  function sequence() {
    return new Promise(/** Observe completion of this native readonly transaction. */ (resolve, reject) => {
      const tx = db.transaction('meta', 'readonly'), request = tx.objectStore('meta').get('source-sequence');
      let selected;
      request.addEventListener('success', /** Keep only this small scalar record until transaction completion. */ () => { selected = request.result; });
      tx.addEventListener('complete', /** Unknown/malformed sequence cannot certify stable cache input. */ () => {
        if (selected === undefined) resolve(0);
        else if (selected?.key === 'source-sequence' && Number.isSafeInteger(selected.value) && selected.value >= 0) resolve(selected.value);
        else reject(Error('Invalid source sequence for input identity'));
      }, { once: true });
      tx.addEventListener('abort', /** Fail rather than reporting a partial input digest. */ () => reject(Error('Source identity transaction aborted')), { once: true });
    });
  }
  /** Frame each stored row separately, retaining only a synchronous hash and aggregate sizes. */
  function stream() {
    const hash = createHash('sha256');let records = 0, bytes = 0;
    return {
      /** Stream one exact record; length framing preserves order and duplicate multiplicity. */
      add(record) {
        const text = JSON.stringify(record), length = new TextEncoder().encode(text).byteLength;
        hash.update(String(length) + ':');hash.update(text);records++;bytes += length;
      },
      /** Finish once; no source or graph record survives the call. */
      finish() { return { sha256: hash.digest('hex'), records, bytes }; },
    };
  }
  const before = await sequence(), pages = stream(), evidence = stream(), heads = stream(), inputs = stream();
  let savedInputs=0,inputMismatch=false;
  if (!(await cache.iterateSnapshotPages(meta, /** Hash exact records and prove borrowed tokens describe this saved graph. */ row => {
    pages.add(row);
    if(fingerprints&&typeof row.semanticSignature==='string'){
      savedInputs++;if(fingerprints.get(row.path)!==row.semanticSignature)inputMismatch=true;
    }
  },current))
    || !(await cache.iterateSnapshotEvidence(meta, /** Preserve evidence order and declaration multiplicity. */ row => evidence.add(row),current))) {
    throw Error('Unreadable graph input identity');
  }
  if(fingerprints&&(inputMismatch||savedInputs!==fingerprints.size))throw Error('Live fingerprints do not match saved graph inputs');
  let after = null;
  do {
    const page = await cache.sources.headPage(after);
    if (!page.available || page.invalid || !current()) throw Error('Unreadable source input identity');
    for (const head of page.heads) {
      heads.add(head);
      if(fingerprints&&head.state==='complete'&&fingerprints.has(head.physical.path)){
        inputs.add({path:head.physical.path,signature:fingerprints.get(head.physical.path)});
      }
    }
    after = page.next;
  } while (after !== null);
  const finalSequence = await sequence(), finalMeta = await cache.readSnapshotMeta();
  if (before !== finalSequence || JSON.stringify(meta) !== JSON.stringify(finalMeta) || !current()) throw Error('Input selection changed while hashing');
  const semanticInputs=fingerprints?inputs.finish():null;
  if(semanticInputs&&semanticInputs.records!==fingerprints.size)throw Error('Saved graph inputs lack complete source-head coverage');
  let hostReplayInputs=null;
  if(replayPaths){
    const replay=stream();
    if(!fingerprints||replayPaths.length!==fingerprints.size)throw Error('Incomplete host replay input coverage');
    for(const path of replayPaths){if(!fingerprints.has(path))throw Error('Unknown host replay input');replay.add({path,signature:fingerprints.get(path)});}
    const now=markdownPaths();
    if(now.length!==replayPaths.length||now.some((path,index)=>path!==replayPaths[index])||!current())throw Error('Host replay order changed while hashing');
    hostReplayInputs=replay.finish();
  }
  const policy = stream();policy.add({ schema: meta.schema, vaultSignature: meta.vaultSignature,
    settingsSignature: meta.settingsSignature, urlAliasVersion: meta.urlAliasVersion, discoveredFields: meta.discoveredFields });
  const configuration=stream();configuration.add({schema:meta.schema,vaultSignature:meta.vaultSignature,
    settingsSignature:meta.settingsSignature,urlAliasVersion:meta.urlAliasVersion});
  return { formatVersion: 3, method: 'Raw records, head-key ordered saved inputs and optional current host replay inputs; outside startup timing; no host-authority claim',
    activation: { createdAt: meta.createdAt, generationSha256: createHash('sha256').update(meta.generation).digest('hex'),optionalReceiptPresent:meta.sourceReceipt!==undefined,
      receiptVersion:Number.isSafeInteger(meta.sourceReceipt?.version)?meta.sourceReceipt.version:null },
    graph: { pages: pages.finish(), evidence: evidence.finish(), policy: policy.finish() },
    configuration:configuration.finish(),semanticInputs,hostReplayInputs,sources: { sequence: before, heads: heads.finish() } };
}
