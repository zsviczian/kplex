/**
 * Test-only synthetic replacements and independent dependency oracles around production repository
 * owners in real Chromium IndexedDB. Detailed observers own reversible realm-local wrappers; callers
 * own fixture/database retirement. Synthetic contents and full oracles stay outside timing lanes.
 */
export function installDependencyCountReuseFixture() {
  const M = window.sourceModules;
  /** Reject a synthetic contract failure without treating partial maintenance as successful. */
  const assert = (value, message) => { if (!value) throw new Error(message); };
  const request = window.value;
  /** Serialize deterministic synthetic oracle values without changing their occurrence order. */
  const encode = value => JSON.stringify(value);
  /** Measure encoded stored-row bytes using the same UTF-8 representation as production staging. */
  const byteLength = value => new TextEncoder().encode(encode(value)).length;
  /** Keep PR204 defaults; optional PR207 distributions retain exact occurrences, URL origins, resolver tokens and tag ancestors. */
  function facts(index, revision, changed = false, wide = false, distribution = "reuse") {
    const suffix = wide ? "x".repeat(2400) : "";
    const result = { values: [], "body-urls": [], metadata: [], resolution: [] };
    result.metadata.push({ kind: "alias", value: `Fresh label ${revision}` });
    const repair = distribution !== "reuse", changedSuffix = repair && changed === true ? `-edit-${revision}` : "";
    result.metadata.push({ kind: "tag", value: `#shared/nested/leaf${changedSuffix}` });
    result.metadata.push({ kind: "field-name", fieldName: `Friends${changedSuffix}`, normalizedFieldName: `friends${changedSuffix}`, surface: "frontmatter" });
    for (let i = 0; i < 144; i++) {
      const key = distribution === "distinct" ? `Owner-${index}-Target-${i}`
        : distribution === "mixed" ? i % 3 === 0 ? `Owner-${index}-Target-${i}` : `Shared-${i % 32}`
          : `Shared-${i % 24}`;
      const target = `${key}${changed === true && i === 0 ? repair ? changedSuffix : "-different" : ""}${suffix}.md`;
      // The opt-in late control changes only the final host-resolved target. Host literals are
      // separate observed facts and remain unchanged, so the first unequal membership is near EOF.
      const resolvedTarget = changed === "late" && i === 143 ? `Shared-${i % 24}-different${suffix}.md` : target;
      result.resolution.push({ kind: "host-link", state: "resolved", target: resolvedTarget, count: 1 + revision });
      result.metadata.push({ kind: "host-literal", ordinal: i, rawTarget: `../${target}` });
    }
    for (let i = 0; i < 8; i++) result["body-urls"].push({ kind: "body-url", url: distribution === "distinct"
      ? `https://owner-${index}-url-${i}.example/path${changedSuffix}` : `https://Example.com/shared/${i % 4}${changedSuffix}`,
    label: `Label ${revision}`, line: i + 1 });
    return result;
  }
  /** Wrap only test-owned calls, restoring exact method identities on retirement. */
  function observe(repository) {
    let phase = "other";
    const operations = {}, restores = [], eligibility = { attempted: 0, matching: 0, records: 0, matchingRecords: 0, reasons: {}, firstMismatchIndices: {} };
    const staging = { pages: 0, records: 0, bytes: 0, maxPageRecords: 0, maxPageBytes: 0 };
    const delivered = {}, transactions = new WeakMap(), lifetimes = { started: 0, complete: 0, aborted: 0, pending: 0,
      maxElapsedMs: 0, repairPages: 0, repairRows: 0, repairDistinctKeys: 0, maxRepairRows: 0, maxRepairBytes: 0 };
    /** Attribute an observed native operation to the currently awaited production phase. */
    const add = (kind, store = "") => {
      const key = `${phase}|${kind}|${store}`;
      operations[key] = (operations[key] ?? 0) + 1;
    };
    /** Retain each exact method identity before installing its diagnostic-only replacement. */
    const patch = (object, name, wrap) => {
      const original = object[name]; object[name] = wrap(original);
      restores.push(/** Restore the observed object's original method after success or failure. */() => { object[name] = original; });
    };
    /** Count delivered read payloads without replacing request callbacks or mutating native results. */
    const observeRequest = (native, name, store, transaction) => {
      if (!native?.addEventListener || !["get", "getAll", "openCursor"].includes(name)) return native;
      const label = `${phase}|${store}`, lifetime = transactions.get(transaction);
      native.addEventListener("success", /** Cursor requests deliver a row on every successful advance, not only on creation. */() => {
        const value = native.result, rows = name === "openCursor" ? value ? [value.value] : [] : name === "getAll" ? value : value === undefined ? [] : [value];
        const receipt = delivered[label] ??= { rows: 0, bytes: 0 };
        for (const row of rows) {
          receipt.rows++; receipt.bytes += byteLength(row);
          if (lifetime?.phase === "selected-count-repair" && store === M.SOURCE_LOCAL_DEPENDENCY_STORE) {
            lifetime.rows++; lifetime.bytes += byteLength(row); lifetime.keys.add(row.key);
          }
        }
      });
      return native;
    };
    for (const name of ["get", "getAll", "getAllKeys", "count", "put", "add", "delete", "openCursor", "openKeyCursor"])
      patch(IDBObjectStore.prototype, name, /** Wrap without changing receiver, arguments or native return identity. */original => /** Count the request and its delivered read payload before forwarding unchanged identity. */function(...args) { add(name, this.name); return observeRequest(original.apply(this, args), name, this.name, this.transaction); });
    for (const name of ["get", "getKey", "getAll", "getAllKeys", "count", "openCursor", "openKeyCursor"])
      patch(IDBIndex.prototype, name, /** Preserve native index semantics while observing request volume. */original => /** Attribute index calls and read payloads to their owning store. */function(...args) { add(`index.${name}`, this.objectStore.name); return observeRequest(original.apply(this, args), name, this.objectStore.name, this.objectStore.transaction); });
    patch(IDBCursor.prototype, "delete", /** Preserve cursor deletion behavior. */original => /** Include cursor-owned deletions in reclamation accounting. */function(...args) { add("cursor.delete", this.source.objectStore?.name ?? this.source.name); return original.apply(this, args); });
    patch(IDBCursor.prototype, "continue", /** Preserve cursor advancement behavior. */original => /** Count traversal independently of initial cursor requests. */function(...args) { add("cursor.continue", this.source.objectStore?.name ?? this.source.name); return original.apply(this, args); });
    patch(IDBDatabase.prototype, "transaction", /** Observe transaction creation without changing store ownership. */original => /** Retain terminal events and bounded aggregate page statistics, not a transaction history. */function(...args) {
      add(`transaction:${args[1] ?? "readonly"}`, Array.from(typeof args[0] === "string" ? [args[0]] : args[0]).sort().join(","));
      const transaction = original.apply(this, args);
      if (!transaction?.addEventListener) return transaction;
      const state = { phase, start: performance.now(), rows: 0, bytes: 0, keys: new Set() };
      transactions.set(transaction, state); lifetimes.started++; lifetimes.pending++;
      /** Fold terminal native lifetime and distinct membership coverage into finite diagnostic totals. */
      const finish = terminal => {
        lifetimes.pending--; lifetimes[terminal]++; lifetimes.maxElapsedMs = Math.max(lifetimes.maxElapsedMs, performance.now() - state.start);
        if (state.rows) { lifetimes.repairPages++; lifetimes.repairRows += state.rows; lifetimes.repairDistinctKeys += state.keys.size;
          lifetimes.maxRepairRows = Math.max(lifetimes.maxRepairRows, state.rows); lifetimes.maxRepairBytes = Math.max(lifetimes.maxRepairBytes, state.bytes); }
      };
      transaction.addEventListener("complete", /** Count only a native commit as completed. */() => finish("complete"), { once: true });
      transaction.addEventListener("abort", /** Preserve aborted work separately from committed page work. */() => finish("aborted"), { once: true });
      return transaction;
    });
    for (const [name, next] of [["stageChunks", "source-staging"], ["stageLocalDependencies", "membership-staging"], ["authenticateLocalCountReuse", "authentication-proof"], ["activate", "activation"], ["repairLocalDependencies", "selected-count-repair"], ["cleanupStagedLocalDependencies", "private-reclaim"], ["cleanupRevision", "old-revision-reclaim"]]) {
      if (typeof repository[name] !== "function") continue;
      patch(repository, name, /** Keep phase attribution local to the awaited repository operation. */original => /** Restore the enclosing phase even when production work rejects. */async function(...args) {
        const previous = phase; phase = next;
        try {
          if (name === "stageLocalDependencies") {
            const rows = args[1], bytes = rows.reduce(/** Include each serialized row and production separator allowance. */(sum, row) => sum + byteLength(row) + 1, 0);
            staging.pages++; staging.records += rows.length; staging.bytes += bytes;
            staging.maxPageRecords = Math.max(staging.maxPageRecords, rows.length); staging.maxPageBytes = Math.max(staging.maxPageBytes, bytes);
          }
          return await original.apply(this, args);
        } finally { phase = previous; }
      });
    }
    return { operations, eligibility, staging, delivered, lifetimes,
      /** Isolate expensive diagnostic oracle calls from measured production phases. */
      async inPhase(next, task) { const previous = phase; phase = next; try { return await task(); } finally { phase = previous; } },
      /** Retire installed wrappers in reverse order after every outcome. */
      retire() { for (const restore of restores.reverse()) restore(); assert(lifetimes.pending === 0, "Every observed transaction has a terminal native event"); } };
  }
  /** Independently derive selected counts from actual rows; no timing or count instrumentation is active. */
  async function oracle(context) {
    const { db, repository } = context;
    const owners = await request(db.transaction(M.SOURCE_LOCAL_OWNER_STORE).objectStore(M.SOURCE_LOCAL_OWNER_STORE).getAll());
    const rows = await request(db.transaction(M.SOURCE_LOCAL_DEPENDENCY_STORE).objectStore(M.SOURCE_LOCAL_DEPENDENCY_STORE).getAll());
    const counts = await request(db.transaction(M.SOURCE_LOCAL_KEY_STORE).objectStore(M.SOURCE_LOCAL_KEY_STORE).getAll());
    const repairs = await request(db.transaction(M.SOURCE_LOCAL_REPAIR_STORE).objectStore(M.SOURCE_LOCAL_REPAIR_STORE).getAll());
    const state = await request(db.transaction("meta").objectStore("meta").get(M.SOURCE_LOCAL_DEPENDENCY_STATE_KEY));
    const primary = await request(db.transaction("meta").objectStore("meta").get(M.SOURCE_DEPENDENCY_STATE_KEY));
    const impactJournals = await request(db.transaction(M.SOURCE_IMPACT_STORE).objectStore(M.SOURCE_IMPACT_STORE).count());
    const expected = new Map(), byOwner = new Map(owners.map(/** Bind rows to their actual selected source owner. */owner => [owner.sourceId, owner]));
    let inactive = 0;
    for (const row of rows) {
      const owner = byOwner.get(row.sourceId);
      if (owner?.state !== "complete" || owner.sourceRevision !== row.sourceRevision) { inactive++; continue; }
      expected.set(row.key, (expected.get(row.key) ?? 0) + 1);
    }
    assert(inactive === 0 && repairs.length === 0 && state.pending === 0, "Reclamation and repair debt must be closed");
    assert(encode([...expected].sort()) === encode(counts.map(/** Compare stored counts with independently enumerated occurrences. */row => [row.key, row.count]).sort()), "Every actual selected contribution equals the persisted count ledger");
    // A retained rename tombstone protects immutable families while contributing no memberships.
    const selectedFamilies = new Map(), heads = new Map();
    let after = null;
    do {
      const page = await repository.headPage(after);
      assert(page.available && page.invalid === 0, "Actual durable heads decode");
      for (const head of page.heads) { heads.set(head.sourceId, head); selectedFamilies.set(head.sourceId, head.families); }
      after = page.next;
    } while (after !== null);
    for (const owner of owners) {
      const head = heads.get(owner.sourceId);
      assert(head?.sourceRevision === owner.sourceRevision && head.sequence === owner.sequence && head.state === owner.state, "Every local owner agrees with its current durable head");
      if (owner.state === "tombstone") assert(owner.records === 0 && !rows.some(/** Tombstones own no selected membership occurrence. */row => row.sourceId === owner.sourceId), "Tombstones contribute zero rows");
    }
    for (const owner of owners.filter(/** Tombstones contribute no selected memberships. */owner => owner.state === "complete")) {
      const selected = rows.filter(/** Include only this exact selected source revision. */row => row.sourceId === owner.sourceId && row.sourceRevision === owner.sourceRevision);
      assert(selected.length === owner.records, "Selected owner record count");
      const head = await repository.inspect(owner.sourceId);
      assert(head.head?.sourceRevision === owner.sourceRevision && head.sequence === owner.sequence, "Actual head and local owner agree");
      const projected = [M.sourceLocalDependencyKey("node", owner.sourceId)];
      for (const family of M.SOURCE_FAMILIES) assert(await repository.visit(owner.sourceId, family, /** Derive dependency occurrences from authenticated actual source facts. */records => {
        for (const record of records) projected.push(...M.sourceLocalStoredDependencyKeys(head.head.physical.path, record));
        return true;
      }) === "ready", "Actual selected family authenticates");
      assert(encode(projected) === encode(selected.sort(/** Restore canonical source occurrence order. */(a, b) => a.index - b.index).map(/** Compare membership keys without revision-specific storage coordinates. */row => row.key)), "Actual source facts project to exactly the selected ordered rows");
    }
    const retiredFamilies = {};
    for (const store of [M.SOURCE_CHUNK_STORE, M.SOURCE_POSTING_STORE]) {
      const keys = await request(db.transaction(store).objectStore(store).getAllKeys());
      retiredFamilies[store] = keys.filter(/** Any family revision absent from selected manifests is unreclaimed debt. */key => selectedFamilies.get(key[0])?.[key[2]]?.revision !== key[1]).length;
      assert(retiredFamilies[store] === 0, "Old source chunks and postings must also be reclaimed");
    }
    assert((primary?.dirty === 0 || owners.length === 0 && primary === undefined) && impactJournals === 0, "Primary staging and contributor journals must be closed");
    const closure = await closeWork(context);
    return { owners: owners.length, selectedRecords: rows.length, selectedBytes: rows.reduce(/** Retain only the aggregate selected-row byte total. */(sum, row) => sum + byteLength(row), 0), keys: counts.length, repairs: repairs.length, inactive, pending: state.pending, primaryDirty: primary?.dirty ?? 0, impactJournals, retiredFamilies, closure, countDigest: await repository.observationDigest(encode(counts)) };
  }
  /** Replace all families normally; fresh labels and counts prove facts are not suppressed by projection reuse. */
  async function replace(context, index, revision, changed = false, wide = false, detailed = null) {
    const { repository, db } = context, sourceId = `Owner-${String(index).padStart(4, "0")}.md`;
    const old = await repository.inspect(sourceId), data = facts(index, revision, changed, wide, context.distribution);
    if (detailed && old.head) {
      const before = await detailed.inPhase("diagnostic-oracle", /** Enumerate the synthetic predecessor only in the separate detailed lane. */() => request(db.transaction(M.SOURCE_LOCAL_DEPENDENCY_STORE).objectStore(M.SOURCE_LOCAL_DEPENDENCY_STORE).index(M.SOURCE_LOCAL_REVISION_INDEX).getAll(IDBKeyRange.only([sourceId, old.head.sourceRevision]))));
      const projected = [M.sourceLocalDependencyKey("node", sourceId)];
      for (const family of M.SOURCE_FAMILIES) for (const fact of data[family]) projected.push(...M.sourceLocalStoredDependencyKeys(sourceId, fact));
      const previousKeys = before.sort(/** Compare predecessor occurrences in their stored ordinal order. */(a, b) => a.index - b.index).map(/** Exclude revision coordinates from the independent projection oracle. */row => row.key);
      const matching = encode(previousKeys) === encode(projected);
      detailed.eligibility.attempted++; detailed.eligibility.records += projected.length;
      if (matching) { detailed.eligibility.matching++; detailed.eligibility.matchingRecords += projected.length; }
      else {
        const reason = before.length === projected.length ? "same-count-different-keys" : "different-record-count";
        detailed.eligibility.reasons[reason] = (detailed.eligibility.reasons[reason] ?? 0) + 1;
        let prefix = 0;
        while (prefix < Math.min(previousKeys.length, projected.length) && previousKeys[prefix] === projected[prefix]) prefix++;
        detailed.eligibility.firstMismatchIndices[prefix] = (detailed.eligibility.firstMismatchIndices[prefix] ?? 0) + 1;
      }
    }
    const result = await repository.replace({ sourceId, expected: old.expected, physical: { identity: sourceId, path: sourceId, mtime: revision + 1, size: revision + 100 }, observation: { epoch: "dependency-benchmark", revision, environment: "0".repeat(64) }, bodyParserVersion: M.SOURCE_BODY_PARSER_VERSION,
      families: Object.fromEntries(M.SOURCE_FAMILIES.map(/** Produce each genuine source family through ordinary backpressured replacement. */family => [family, /** Stop immediately when the repository rejects an emitted fact. */async emit => { for (const fact of data[family]) if (!await emit(fact)) return false; return true; }])) });
    assert(result.outcome === "activated", `Ordinary replacement failed: ${result.outcome}/${result.reason}`);
    if (old.head) for (const previous of new Set([old.head.sourceRevision, ...Object.values(old.head.families).map(/** Include retained family revisions in end-to-end reclamation. */family => family.revision)]))
      assert(await repository.cleanupRevision(sourceId, previous), "Known old revision reclaimed before timing ends");
    return result;
  }
  /** Fresh test-owned logical state; production storage/projection/repair implementations are unchanged. */
  async function seedRange(context, first = 0, limit = context.owners) {
    for (let i = first; i < Math.min(context.owners, first + limit); i++) await replace(context, i, 0, false, context.wide);
    assert(await context.repository.completeLocalDependencyInventory() === "ready", "Initial inventory closes");
  }
  /** Seed in bounded transport batches when the tool-side driver owns a larger fixture. */
  async function setup(name, owners, wide = false, seed = true, distribution = "reuse") {
    const fixture = await window.fixture(name), db = await fixture.cache.open();
    const context = { fixture, db, repository: fixture.repository, name, owners, wide, distribution };
    try {
      if (seed) await seedRange(context);
      return context;
    } catch (error) { fixture.close(); throw error; }
  }
  /** Complete all count and private journals after the same deterministic replacement sequence. */
  async function workload(context, mixed = false, rounds = 1, detailed = null, first = 0, limit = context.owners) {
    const end = Math.min(context.owners, first + limit);
    for (let round = 1; round <= rounds; round++) for (let i = first; i < end; i++)
      await replace(context, i, round, context.changeMode === "late" ? "late" : mixed && i % 4 === 0, context.wide, detailed);
    assert(await context.repository.completeLocalDependencyInventory() === "ready", "Final inventory closes");
    const repairs = await request(context.db.transaction(M.SOURCE_LOCAL_REPAIR_STORE).objectStore(M.SOURCE_LOCAL_REPAIR_STORE).count());
    assert(repairs === 0, "No journal or private marker remains at measured completion");
    const primary = await request(context.db.transaction("meta").objectStore("meta").get(M.SOURCE_DEPENDENCY_STATE_KEY));
    const impactJournals = await request(context.db.transaction(M.SOURCE_IMPACT_STORE).objectStore(M.SOURCE_IMPACT_STORE).count());
    assert(primary?.dirty === 0 && impactJournals === 0, "No primary dirty fence or contributor journal remains at measured completion");
    return { activations: (end - first) * rounds, memory: performance.memory ? { usedJSHeapSize: performance.memory.usedJSHeapSize, totalJSHeapSize: performance.memory.totalJSHeapSize } : null, hidden: document.hidden, focused: document.hasFocus() };
  }
  /** Verify durable closure with bounded metadata reads; no source serialization or count enumeration. */
  async function closeWork(context) {
    const { repository: r, db } = context;
    assert(await r.flush(), "All ordinary writes and release/retry owners close");
    assert(await r.completeLocalDependencyInventory() === "ready", "Selected count inventory closes");
    const repairs = await request(db.transaction(M.SOURCE_LOCAL_REPAIR_STORE).objectStore(M.SOURCE_LOCAL_REPAIR_STORE).count());
    const metadata = db.transaction("meta").objectStore("meta");
    const [familyLeases, impactLeases, primary, state] = await Promise.all([
      request(metadata.count(IDBKeyRange.bound("source-lease:", "source-lease:\uffff"))),
      request(metadata.count(IDBKeyRange.bound("source-impact-lease:", "source-impact-lease:\uffff"))),
      request(metadata.get(M.SOURCE_DEPENDENCY_STATE_KEY)), request(metadata.get(M.SOURCE_LOCAL_DEPENDENCY_STATE_KEY)),
    ]);
    const leases = familyLeases + impactLeases;
    const impactJournals = await request(db.transaction(M.SOURCE_IMPACT_STORE).objectStore(M.SOURCE_IMPACT_STORE).count());
    assert(repairs === 0 && state?.pending === 0 && state.complete && (primary?.dirty ?? 0) === 0 && impactJournals === 0, "No repair, private reclaim or primary journal debt remains");
    assert(leases === 0 && r.readers.size === 0 && r.decodeBytes === 0 && r.getDiagnostics().unsaved === 0, "Every fresh-arm reader, durable lease and decode reservation closes");
    return { repairs, pending: state.pending, impactJournals, primaryDirty: primary?.dirty ?? 0, leases, readers: r.readers.size, decodeBytes: r.decodeBytes };
  }
  /** Measure distinct ordinary operations separately; deletion includes its normal pin release and reclamation. */
  async function repairWorkload(context, operation, detailed = null, first = 0, limit = context.owners) {
    const end = Math.min(context.owners, first + limit);
    for (let i = first; i < end; i++) {
      if (operation === "delete") {
        const result = await context.repository.tombstone(`Owner-${String(i).padStart(4, "0")}.md`);
        assert(result.outcome === "activated", "Ordinary deletion activates");
      } else await replace(context, i, operation === "create" ? 0 : 1, operation === "changed", context.wide, detailed);
    }
    return { activations: end - first, operation, closure: await closeWork(context), hidden: document.hidden, focused: document.hasFocus() };
  }
  /** Observe only a restarted lookup/closure interval; retained native event records are strictly bounded. */
  function observeReopen() {
    const start = performance.now(), restores = [], states = new WeakMap();
    let phase = "fixture-open", retired = false;
    const report = { spans: {}, operations: {}, opens: [], droppedOpens: 0, transactions: [], droppedTransactions: 0,
      pendingTransactions: 0, completedTransactions: 0, abortedTransactions: 0, repairEntries: 0, countKeyWrites: 0 };
    /** Express diagnostic timestamps only relative to this finite observer lifetime. */
    const at = () => performance.now() - start;
    /** Retain exact method identities and restore every binding even after another cleanup fails. */
    const wrap = (object, name, factory) => {
      const original = object[name]; assert(typeof original === "function", `Missing reopen diagnostic seam ${name}`);
      object[name] = factory(original); restores.push(/** Retire only this observer's original binding. */() => { object[name] = original; });
    };
    /** Count native request attempts and the first delivered success without reading result payloads. */
    const requestEvent = (request, transaction, kind, store) => {
      const label = `${phase}|${kind}|${store}`; report.operations[label] = (report.operations[label] ?? 0) + 1;
      const state = states.get(transaction);
      request.addEventListener("success", /** First request delivery distinguishes native waiting from completion-event waiting. */() => {
        if (state && state.firstSuccessAtMs === null) state.firstSuccessAtMs = at();
      });
      return request;
    };
    wrap(IDBFactory.prototype, "open", /** Observe genuine native open events without replacing callbacks. */original => /** Keep only eight open-event records and never retain a database name. */function(...args) {
      const row = { callAtMs: at(), successAtMs: null, blockedAtMs: null, upgradeAtMs: null, errorAtMs: null };
      if (report.opens.length < 8) report.opens.push(row); else report.droppedOpens++;
      const request = original.apply(this, args);
      for (const [event, field] of [["success", "successAtMs"], ["blocked", "blockedAtMs"], ["upgradeneeded", "upgradeAtMs"], ["error", "errorAtMs"]])
        request.addEventListener(event, /** Record native open timing while preserving the production event owner. */() => { row[field] = at(); });
      return request;
    });
    wrap(IDBDatabase.prototype, "transaction", /** Retain aggregate counts for every native transaction but at most sixteen event records. */original => /** Observe transaction birth and terminal event with no timer, await or callback replacement. */function(...args) {
      const transaction = original.apply(this, args);
      const row = { phase, mode: args[1] ?? "readonly", stores: Array.from(typeof args[0] === "string" ? [args[0]] : args[0]).sort(),
        createAtMs: at(), firstSuccessAtMs: null, terminalAtMs: null, outcome: null };
      states.set(transaction, row); report.pendingTransactions++;
      if (report.transactions.length < 16) report.transactions.push(row); else report.droppedTransactions++;
      /** Count commit/abort separately; native event elapsed is not exclusive lock duration or CPU. */
      const terminal = outcome => { row.terminalAtMs = at(); row.outcome = outcome; report.pendingTransactions--;
        if (outcome === "complete") report.completedTransactions++; else report.abortedTransactions++; };
      transaction.addEventListener("complete", /** Preserve native commit as the only successful terminal state. */() => terminal("complete"), { once: true });
      transaction.addEventListener("abort", /** Retain genuine native aborts rather than treating them as empty successful work. */() => terminal("abort"), { once: true });
      return transaction;
    });
    for (const name of ["get", "getAll", "getAllKeys", "count", "put", "add", "delete", "openCursor", "openKeyCursor"])
      wrap(IDBObjectStore.prototype, name, /** Observe request attempts while forwarding receiver and arguments unchanged. */original => /** Count selected-ledger writes independently of normal metadata commit barriers. */function(...args) {
        if (this.name === M.SOURCE_LOCAL_KEY_STORE && ["put", "add", "delete"].includes(name)) report.countKeyWrites++;
        return requestEvent(original.apply(this, args), this.transaction, name, this.name);
      });
    for (const name of ["get", "getKey", "getAll", "getAllKeys", "count", "openCursor", "openKeyCursor"])
      wrap(IDBIndex.prototype, name, /** Preserve real index requests and their owning transaction. */original => /** Record first native delivery without serializing selected rows. */function(...args) {
        return requestEvent(original.apply(this, args), this.objectStore.transaction, `index.${name}`, this.objectStore.name);
      });
    return { report,
      /** Name one existing phase synchronously; no diagnostic yield enters the production await order. */
      phase(name) { phase = name; },
      /** Attach to the newly opened repository only; wrappers add no host task or scheduling wait. */
      attach(repository) {
        for (const [name, label] of [["flush", "flush"], ["completeLocalDependencyInventory", "completeInventory"], ["repairLocalDependencies", "countRepair"]])
          wrap(repository, name, /** Preserve the original owner and its existing completion promise. */original => /** Accumulate duration/calls only while awaiting this unchanged native owner. */async function(...args) {
            const previous = phase, begin = performance.now(); phase = label;
            if (name === "repairLocalDependencies") report.repairEntries++;
            try { return await original.apply(this, args); }
            finally { const span = report.spans[label] ??= { calls: 0, elapsedMs: 0 }; span.calls++; span.elapsedMs += performance.now() - begin; phase = previous; }
          });
      },
      /** Restore every binding independently, returning cleanup failures alongside the original diagnostic outcome. */
      retire() {
        if (retired) return report.cleanup; retired = true;
        const errors = [];
        for (const restore of restores.reverse()) try { restore(); } catch (error) { errors.push(String(error)); }
        report.cleanup = { restored: errors.length === 0, pendingTransactions: report.pendingTransactions, errors };
        return report.cleanup;
      } };
  }

  /** Observe event-loop gaps and optional long tasks only during the complete measured workload. */
  function observeResponsiveness() {
    const start = performance.now(); let last = start, end = Infinity, observer = null, stopped = false, timerCleared = false, observerDisconnected = false;
    const report = { intervalMs: 16, samples: 0, largestObservedGapMs: 0, longTasksSupported: false,
      longTaskCount: 0, maxObservedLongTaskMs: null, largestLongTasks: [], observerError: null, cleanupErrors: [], droppedCleanupErrors: 0, cleanupComplete: false };
    /** Keep cleanup-failure history finite even when a caller retries a failed resource owner. */
    const cleanupFailure = (owner, error) => {
      if (report.cleanupErrors.length < 8) report.cleanupErrors.push(`${owner}: ${String(error)}`); else report.droppedCleanupErrors++;
    };
    /** Keep at most eight synthetic duration/offset records; names, URLs and attribution payloads are excluded. */
    const accept = entries => {
      for (const entry of entries) {
        if (entry.startTime < start || entry.startTime >= end || entry.duration < 50) continue;
        report.longTaskCount++; report.maxObservedLongTaskMs = Math.max(report.maxObservedLongTaskMs ?? 0, entry.duration);
        report.largestLongTasks.push({ atMs: entry.startTime - start, durationMs: entry.duration });
        report.largestLongTasks.sort(/** Retain only the eight largest observed long tasks. */(a, b) => b.durationMs - a.durationMs);
        report.largestLongTasks.length = Math.min(8, report.largestLongTasks.length);
      }
    };
    const timer = window.setInterval(/** Timer gaps include host dispatch/descheduling and do not identify paint or exclusive CPU. */() => {
      if (stopped) return;
      const now = performance.now(); report.samples++; report.largestObservedGapMs = Math.max(report.largestObservedGapMs, now - last); last = now;
    }, 16);
    try {
      if (typeof window.PerformanceObserver === "function" && window.PerformanceObserver.supportedEntryTypes?.includes("longtask")) {
        observer = new window.PerformanceObserver(/** Exclude startup/oracle tasks and ignore queued callbacks after the single terminal drain. */list => { if (!stopped) accept(list.getEntries()); });
        observer.observe({ type: "longtask", buffered: false }); report.longTasksSupported = true;
      }
    } catch (error) { report.observerError = String(error); }
    return { report,
      /** Include the terminal partial heartbeat interval and independently retire both diagnostic resources. */
      stop() {
        if (!stopped) {
          stopped = true; end = performance.now();
          report.elapsedMs = end - start; report.largestObservedGapMs = Math.max(report.largestObservedGapMs, end - last);
          try { if (observer) accept(observer.takeRecords()); }
          catch (error) { cleanupFailure("takeRecords", error); }
        }
        try { if (!timerCleared) { window.clearInterval(timer); timerCleared = true; } }
        catch (error) { cleanupFailure("clearInterval", error); }
        finally {
          try { if (!observerDisconnected) { observer?.disconnect(); observerDisconnected = true; } }
          catch (error) { cleanupFailure("disconnect", error); }
        }
        report.cleanupComplete = timerCleared && observerDisconnected;
        return report;
      } };
  }

  window.dependencyCountReuse = { setup, seedRange, replace, workload, repairWorkload, closeWork, oracle, observe, observeReopen, observeResponsiveness, facts, context: null };
}
