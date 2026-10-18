/**
 * Aggregate resource observations for the existing startup drivers and real-IDB work fixtures.
 * This test-only forwarding probe exports no owner identities or payloads, changes no scheduling,
 * and never substitutes native requests, promises, results or authority. Detailed byte accounting
 * uses JSON payload estimates, not physical disk/WAL bytes; measure its overhead separately.
 * Detailed mode also times actual repository methods and committed source-family lease rows.
 * Only bounded opaque lease keys are held privately to join creation/deletion; awaited lifetimes
 * overlap and are elapsed time, never CPU or a causal attribution of every transaction to a method.
 */
export function createStartupResourceProbe({ phase, now, cpu, cpuProcess, databaseName, detailed = true }) {
  const originals = [], buckets = new Map(), limit = 256;
  const started = now(), initialCpu = cpu?.();
  const cpuIdentity = cpuProcess && Number.isSafeInteger(cpuProcess.pid) && cpuProcess.pid > 0
    ? { pid: cpuProcess.pid, type: ['browser', 'renderer'].includes(cpuProcess.type) ? cpuProcess.type : 'unknown' } : null;
  let running = true, pending = 0, peakPending = 0, decodeCurrent = 0, decodePeak = 0;
  let heapMaximum = 0, rssMaximum = 0, activeTransactions = 0, peakTransactions = 0;
  const transactionDetails = new WeakMap(), readerDetails = new WeakMap(), liveLeases = new Map(), leaseLimit = 4096;
  const readers = { started: 0, released: 0, active: 0, peak: 0, elapsedMs: 0, maximumElapsedMs: 0 };
  const readerWaitUnion = { calls: 0, windows: 0, active: 0, peak: 0, elapsedMs: 0, maximumElapsedMs: 0 };
  let readerWaitStarted = 0;
  const leases = { created: 0, retired: 0, deleteRequests: 0, live: 0, peak: 0, unknownRetirements: 0, trackingOverflow: 0,
    trackedLive: 0, elapsedMs: 0, maximumElapsedMs: 0, abortedCreates: 0, abortedRetires: 0 };
  const broad = { inventoryRuns: 0, fullBuildCalls: 0, nodeCatalogCalls: 0, snapshotWrites: 0, checkpointWrites: 0 };
  const hashFamilies = ['source', 'snapshot-pages', 'snapshot-evidence', 'snapshot-binding', 'source-heads', 'semantic-inputs'];
  const hashPrefixes = hashFamilies.slice(1).map(family => '[1,"' + family + '",');
  const hashing = Object.fromEntries(hashFamilies.map(family => [family, { calls: 0, utf16Units: 0 }]));
  /** Bound arbitrary host/phase labels without retaining source identities. */
  function row(label) {
    let key = phase() + ':' + label;
    if (!buckets.has(key) && buckets.size >= limit - 1) key = 'other';
    let value = buckets.get(key);
    if (!value) {
      value = { calls: 0, completed: 0, failed: 0, records: 0, bytes: 0, reused: 0, invalidated: 0 };
      if (detailed) Object.assign(value, { active: 0, peak: 0, elapsedMs: 0, maximumElapsedMs: 0 });
      buckets.set(key, value);
    }
    return value;
  }
  /** Estimate serialized JSON payload size while retaining no string or payload after return. */
  function bytes(value) {
    if (!detailed || value === undefined) return 0;
    try { return new TextEncoder().encode(JSON.stringify(value)).byteLength; } catch { return 0; }
  }
  /** Replace one method reversibly, preserving receiver and exact native return identity. */
  function wrap(owner, key, create) {
    const original = owner?.[key];
    if (typeof original !== 'function') return;
    const replacement = create(original); owner[key] = replacement;
    originals.push({ owner, key, original, replacement });
  }
  /** Count an existing operation and observe completion without replacing its returned promise. */
  function operation(owner, key, label, broadKey, classify) {
    if (!detailed) {
      // Preserve the primary counts lane's original forwarding/observation work. Detailed
      // attribution must not add clocks, argument inspection or per-method arrays to that lane.
      wrap(owner, key, /** Forward the original counts-only owner. */ original => function (...args) {
        if (!running) return original.apply(this, args);
        const value = row(label); value.calls++;
        if (broadKey) broad[broadKey]++;
        let result;
        try { result = original.apply(this, args); } catch (error) { value.failed++; throw error; }
        if (result && typeof result.then === 'function') {
          pending++; peakPending = Math.max(peakPending, pending);
          result.then(/** Observe completion without substituting the producer's promise. */ () => { value.completed++; pending--; },
            /** Consume only the observer branch's rejection. */ () => { value.failed++; pending--; });
        } else value.completed++;
        return result;
      });
      return;
    }
    wrap(owner, key, /** Forward one instrumented operation. */ original => function (...args) {
      if (!running) return original.apply(this, args);
      const value = row(label), values = [value], at = detailed ? now() : 0;
      if (detailed && classify) { const classified = row(classify(args)); if (classified !== value) values.push(classified); }
      for (const item of values) { item.calls++; if (detailed) { item.active++; item.peak = Math.max(item.peak, item.active); } }
      const unionMember = ['repository.pin', 'repository.releaseLeases', 'repository.selectionReason'].includes(label);
      if (unionMember) {
        readerWaitUnion.calls++;
        if (readerWaitUnion.active++ === 0) { readerWaitStarted = at; readerWaitUnion.windows++; }
        readerWaitUnion.peak = Math.max(readerWaitUnion.peak, readerWaitUnion.active);
      }
      const reader = detailed && label === 'repository.releaseLeases' ? readerDetails.get(args[0]) : null;
      /** Finish this method observation; inclusive awaited time can overlap other method rows. */
      const finish = (failed, outcome) => {
        if (unionMember && --readerWaitUnion.active === 0) {
          const elapsed = now() - readerWaitStarted;
          readerWaitUnion.elapsedMs += elapsed; readerWaitUnion.maximumElapsedMs = Math.max(readerWaitUnion.maximumElapsedMs, elapsed);
        }
        for (const item of values) {
          if (failed) item.failed++; else item.completed++;
          if (detailed) { const elapsed = now() - at; item.active--; item.elapsedMs += elapsed; item.maximumElapsedMs = Math.max(item.maximumElapsedMs, elapsed); }
        }
        if (detailed && !failed && label === 'repository.pin' && outcome?.view?.leases?.length && !readerDetails.has(outcome.view)) {
          readerDetails.set(outcome.view, { at: now(), released: false });
          readers.started++; readers.active++; readers.peak = Math.max(readers.peak, readers.active);
        }
        if (reader && !reader.released) {
          reader.released = true; readers.released++; readers.active--;
          const elapsed = now() - reader.at; readers.elapsedMs += elapsed; readers.maximumElapsedMs = Math.max(readers.maximumElapsedMs, elapsed);
        }
      };
      if(broadKey)broad[broadKey]++;
      if(detailed&&label==='runtime.digest'&&typeof args[0]==='string')value.bytes+=new TextEncoder().encode(args[0]).byteLength;
      let result;
      try { result = original.apply(this, args); } catch (error) { finish(true); throw error; }
      if (result && typeof result.then === 'function') {
        pending++; peakPending = Math.max(peakPending, pending);
        result.then(/** Observe scalar proof outcomes without retaining returned facts. */ outcome => {
          finish(false, outcome); pending--;
          if(label==='repository.matchesFamily'){
            if(outcome?.outcome==='ready'&&outcome.value===true)value.reused++;else value.invalidated++;
          }
        },
          /** Observe failure without propagating a second rejected observer promise. */ () => { finish(true); pending--; });
      } else finish(false, result);
      return result;
    });
  }
  /** Classify only protocol-owned meta keys, never arbitrary owner names or stored values. */
  function leaseKind(key) {
    if (typeof key !== 'string') return null;
    if (key.startsWith('source-lease:')) return 'source';
    if (key.startsWith('source-impact-lease:')) return 'contributor';
    return null;
  }
  /** Commit/abort owns durable-row accounting; queued add/delete requests alone prove nothing. */
  function finishTransaction(detail, committed) {
    const { adds, deletes } = detail;
    if (!committed) { leases.abortedCreates += detail.sourceAdds; leases.abortedRetires += detail.sourceDeletes; }
    else {
      const at = now();
      leases.created += detail.sourceAdds; leases.deleteRequests += detail.sourceDeletes;
      for (const key of adds) {
        if (liveLeases.size >= leaseLimit) { leases.trackingOverflow++; continue; }
        liveLeases.set(key, at);
      }
      for (const key of deletes) {
        const created = liveLeases.get(key);
        if (created === undefined) leases.unknownRetirements++;
        else { const elapsed = at - created; leases.retired++; leases.elapsedMs += elapsed; leases.maximumElapsedMs = Math.max(leases.maximumElapsedMs, elapsed); liveLeases.delete(key); }
      }
      leases.live = Math.max(0, leases.created - leases.retired);
      leases.peak = Math.max(leases.peak, leases.live); leases.trackedLive = liveLeases.size;
    }
    const stores = detail.stores;
    const label = detail.sourceAdds ? 'source-lease.pin' : detail.sourceDeletes ? 'source-lease.release'
      : detail.contributor ? 'contributor-lease' : stores.some(name => ['sourceImpacts', 'sourceDependencies'].includes(name)) ? 'contributor-journal'
      : stores.some(name => name.startsWith('sourceLocal')) ? 'source-local'
      : stores.some(name => ['sourceChunks', 'sourcePostings'].includes(name)) ? 'source-family'
      : stores.includes('sourceHeads') ? 'source-head' : 'other';
    const value = row('storage.' + label + '.' + detail.mode); value.calls++;
    if (committed) value.completed++; else value.failed++;
  }
  wrap(IDBDatabase.prototype, 'transaction', /** Count actual native transactions, including direct lease cleanup. */ original => function (...args) {
    const tx = original.apply(this, args);
    if (!running || this.name !== databaseName) return tx;
    const stores = [...tx.objectStoreNames].sort().join(','), value = row('tx.' + tx.mode + '.' + stores);
    value.calls++; activeTransactions++; peakTransactions = Math.max(peakTransactions, activeTransactions);
    const detail = detailed ? { stores: [...tx.objectStoreNames], mode: tx.mode, adds: [], deletes: [], sourceAdds: 0, sourceDeletes: 0, contributor: false } : null;
    if (detail) transactionDetails.set(tx, detail);
    tx.addEventListener('complete', /** Observe one completed native transaction. */ () => { value.completed++; activeTransactions--; if (detail) finishTransaction(detail, true); }, { once: true });
    tx.addEventListener('abort', /** Aborted transactions never count as completed writes. */ () => { value.failed++; activeTransactions--; if (detail) finishTransaction(detail, false); }, { once: true });
    return tx;
  });
  for (const key of ['get', 'getAll', 'getAllKeys', 'openCursor', 'openKeyCursor', 'count', 'put', 'add', 'delete', 'clear']) {
    wrap(IDBObjectStore.prototype, key, /** Observe native request calls without replacing their callbacks. */ original => function (...args) {
      const request = original.apply(this, args);
      if (!running || this.transaction.db.name !== databaseName) return request;
      const write = ['put', 'add', 'delete', 'clear'].includes(key), value = row('request.' + this.transaction.mode + '.' + this.name + '.' + key);
      value.calls++;
      if (write && key !== 'clear') value.bytes += bytes(args[0]);
      if (detailed) {
        const detail = transactionDetails.get(this.transaction);
        if (detail && this.name === 'meta') {
          const candidate = key === 'add' || key === 'put' ? args[0]?.key : args[0], kind = leaseKind(candidate);
          if (kind === 'contributor') detail.contributor = true;
          if (kind === 'source' && ['add', 'delete'].includes(key)) {
            const adding = key !== 'delete', keys = adding ? detail.adds : detail.deletes;
            if (adding) detail.sourceAdds++; else detail.sourceDeletes++;
            if (keys.length < leaseLimit) keys.push(candidate); else leases.trackingOverflow++;
          }
        }
        request.addEventListener('success', /** Count cursor rows separately from the single cursor request. */ () => {
          value.completed++;
          const result = request.result, data = key === 'openCursor' ? result?.value : key === 'openKeyCursor' ? result?.key : result;
          if (!write) { value.bytes += bytes(data); value.records += Array.isArray(data) ? data.length : data === undefined || data === null ? 0 : 1; }
        });
        request.addEventListener('error', /** Keep errors aggregate and omit exception payloads. */ () => { value.failed++; }, { once: true });
      }
      return request;
    });
  }
  return {
    /** Attach to the existing owners after plugin enable; early native transactions are already observed. */
    attach(index, builder) {
      const acquisition = index.sourceAcquisition, repository = acquisition.repository;
      // Counts mode must include receipt payload hashing without encoding/copying its arguments,
      // inspecting payloads or adding a promise observer per digest. Fixed protocol prefixes only.
      wrap(repository.runtime, 'digest', original => function (text) {
        if (running) {
          let family = 'source';
          if (typeof text === 'string' && text.startsWith('[1,"')) {
            for (let position = 1; position < hashFamilies.length; position++) {
              if (text.startsWith(hashPrefixes[position - 1])) { family = hashFamilies[position]; break; }
            }
          }
          hashing[family].calls++;
          if (typeof text === 'string') hashing[family].utf16Units += text.length;
        }
        return original.apply(this, arguments);
      });
      operation(acquisition, 'reconcile', 'acquisition.reconcile', 'inventoryRuns');
      operation(index, 'rebuild', 'graph.rebuild', 'fullBuildCalls');
      operation(builder?.prototype, 'buildSourceNodeCatalog', 'graph.buildSourceNodeCatalog', 'nodeCatalogCalls');
      operation(index, 'persistIndexedDbSnapshot', 'graph.persistIndexedDbSnapshot');
      operation(index.indexedDb, 'writeSnapshot', 'snapshot.writeSnapshot', 'snapshotWrites');
      operation(index.indexedDb, 'writeCheckpoint', 'snapshot.writeCheckpoint', 'checkpointWrites');
      if (detailed) {
        operation(acquisition.app.metadataCache, 'getFirstLinkpathDest', 'host.resolveReference');
        operation(acquisition.app.metadataCache, 'getFileCache', 'host.metadataLookup');
        operation(acquisition.app.vault, 'getMarkdownFiles', 'host.markdownInventory');
        for(const key of ['dailyNotesSettings','isDateProperty','resolvedLinkCount'])operation(acquisition.metadataHost,key,'host.'+key);
        for (const key of ['readBody', 'visit', 'visitFamily', 'readSelected', 'releaseLeases', 'unpin', 'selectionReason', 'headPage', 'localDependencySelection', 'ensureLocalDependencies',
          'completeLocalDependencyInventory', 'matchesFamily', 'familyContentDigest', 'replace', 'tombstone', 'observationDigest']) operation(repository, key, 'repository.' + key);
        operation(repository, 'inspect', 'repository.inspect', undefined, /** Distinguish manifest-only observations from validating actual family payloads. */ args => args[1]?.length === 0 ? 'repository.inspect.headOnly' : 'repository.inspect.families');
        operation(repository, 'pin', 'repository.pin', undefined, /** Parser2 can recursively upgrade a head-only pin to a protected family read. */ args => args[3] === false ? 'repository.pin.headOnly' : 'repository.pin.families');
        for (const key of ['reconcileRestartHostInventory', 'readBody', 'loadBody', 'acquire', 'resolve', 'currentHostInventory', 'environment']) operation(acquisition, key, 'acquisition.' + key);
        for (const key of ['digest', 'yield']) operation(repository.runtime, key, 'runtime.' + key);
        wrap(repository, 'reserveDecode', /** Preserve the exact reservation/release lifetime and bound observation memory. */ original => function (size, ...args) {
          const release = original.call(this, size, ...args);
          decodeCurrent += size; decodePeak = Math.max(decodePeak, decodeCurrent);
          return /** Forward the existing caller-owned release's receiver, arguments and return. */ function (...releaseArgs) { decodeCurrent -= size; return release.apply(this, releaseArgs); };
        });
        wrap(repository, 'visitFamily', /** Count delivered validated batches without keeping decoded records. */ original => function (view, family, consume, ...args) {
          const knownFamily = ['values', 'body-urls', 'metadata', 'resolution'].includes(family) ? family : 'other';
          const value = row('family.' + knownFamily); value.calls++;
          return original.call(this, view, family, /** Forward the original consumer and its exact promise. */ function (records) {
            value.records += records.length;
            return consume.apply(this, arguments);
          }, ...args);
        });
      }
    },
    /** Sample existing native memory observations without forcing GC during timed startup. */
    sample(memory) {
      heapMaximum = Math.max(heapMaximum, memory.heapUsed ?? 0); rssMaximum = Math.max(rssMaximum, memory.rss ?? 0);
    },
    /** Return bounded copied aggregates; CPU is process-wide native user/system time, never await duration. */
    snapshot() {
      const currentCpu = cpu?.();
      const activeUnionMs = detailed && readerWaitUnion.active ? now() - readerWaitStarted : 0;
      return { elapsedMs: now() - started, detailed, running, pending, peakPending, activeTransactions, peakTransactions,
        decodeCurrent, decodePeak, heapMaximum, rssMaximum, broad: {...broad},
        ...(detailed ? { readers: { ...readers }, leases: { ...leases },
          readerWaitUnion: { ...readerWaitUnion, elapsedMs: readerWaitUnion.elapsedMs + activeUnionMs,
            maximumElapsedMs: Math.max(readerWaitUnion.maximumElapsedMs, activeUnionMs) },
          drain: { methods: pending === 0, transactions: activeTransactions === 0,
          readers: readers.active === 0, sourceLeases: leases.live === 0 && liveLeases.size === 0,
          sourceLeaseCoverage: leases.unknownRetirements === 0 && leases.trackingOverflow === 0, decode: decodeCurrent === 0 } } : {}),
        cpuProcess: cpuIdentity ? { ...cpuIdentity } : null,
        hashing: Object.fromEntries(hashFamilies.map(family => [family, { ...hashing[family] }])),
        cpuMicroseconds: currentCpu && initialCpu ? { user: currentCpu.user - initialCpu.user, system: currentCpu.system - initialCpu.system } : null,
        semantics: 'Native process CPU includes host/other activity. JSON bytes estimate request payloads, not engine disk/WAL bytes. Family records count deliveries, including repeated validation. Detailed method timings are inclusive overlapping await durations, not CPU or transaction causality. readerWaitUnion is wall time with any pin/releaseLeases/selectionReason pending; nested unpin is excluded, and parser2 pin includes compatibility family validation. It is an await-inclusive wall upper bound, not exclusive disk or CPU time. Source lease lifetimes run from observed add commit to matching delete commit. Committed delete requests without an observed creation are unknown, not proven row retirements; tracking overflow limits completeness. Detailed observers add unisolated overhead.',
        groups: Object.fromEntries([...buckets].map(/** Copy only bounded scalar counters. */ ([key, value]) => [key, { ...value }])) };
    },
    /** Restore only methods still owned by this probe; cleanup never cancels production work. */
    stop() {
      running = false;
      for (const entry of originals.reverse()) if (entry.owner[entry.key] === entry.replacement) entry.owner[entry.key] = entry.original;
      originals.length = 0;
      liveLeases.clear();
    },
  };
}
