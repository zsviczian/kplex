/**
 * Storage-only retirement of contributor root-slot leases. The repository proves that the reader
 * lifetime has ended before calling these helpers. A successful result acknowledges a committed
 * exact-row deletion (or committed absence), never just a queued request. Cleanup can use a fresh
 * existing-database connection after the normal cache handle fails, without resetting writer
 * backoff, upgrading stores, publishing a root, or expiring another reader by elapsed time.
 */
export type ContributorRootLease = Readonly<{ key: string; impactSlot: number }>;
export type ContributorLeaseRuntime = Readonly<{
  schedule(callback: () => void, delay: number): number;
  cancel(timer: number): void;
}>;
const META_STORE = "meta";
const CLEANUP_TIMEOUT_MS = 5000;

/** Match the complete persisted v7 lease envelope; a colliding or changed row stays protective. */
function sameLease(value: unknown, expected: ContributorRootLease): boolean {
  return !!value && typeof value === "object" && Object.keys(value).length === 2
    && "key" in value && value.key === expected.key
    && "impactSlot" in value && value.impactSlot === expected.impactSlot;
}

/**
 * Delete only this retired reader's exact lease. False retains retry ownership on any failure,
 * mismatch, or timeout. The timer aborts work; it is never an age-based lease expiration rule.
 */
export function releaseContributorRootLease(db: IDBDatabase, lease: ContributorRootLease,
  runtime: ContributorLeaseRuntime): Promise<boolean> {
  return new Promise<boolean>(/** Own both request and terminal transaction events, including synchronous throws. */ resolve => {
    let transaction: IDBTransaction | undefined;
    let timer: number | null = null;
    let settled = false;
    let matched = false;
    /** Only oncomplete can acknowledge absence/deletion; all other paths retain the lease ticket. */
    const finish = (released: boolean): void => {
      if (settled) return;
      settled = true;
      if (timer !== null) runtime.cancel(timer);
      resolve(released);
    };
    /** Abort before acknowledging failure so no later read callback can enqueue a new deletion. */
    const fail = (): void => {
      try { transaction?.abort(); } catch { /* Completed or never opened; ownership still remains. */ }
      finish(false);
    };
    try {
      transaction = db.transaction(META_STORE, "readwrite");
      const store = transaction.objectStore(META_STORE);
      transaction.oncomplete = /** A queued request alone is not durable cleanup. */ () => finish(matched);
      transaction.onabort = /** An aborted deletion must be retryable. */ () => finish(false);
      transaction.onerror = fail;
      timer = runtime.schedule(fail, CLEANUP_TIMEOUT_MS);
      const request = store.get(lease.key);
      request.onerror = fail;
      request.onsuccess = /** Read and compare within the same serialized transaction as deletion. */ () => {
        if (settled) return;
        const value: unknown = request.result;
        matched = value === undefined || sameLease(value, lease);
        if (value !== undefined && matched) {
          try { store.delete(lease.key); } catch { fail(); }
        }
      };
    } catch { fail(); }
  });
}

/**
 * One bounded cleanup-only reopen. Never creates a deleted database, upgrades an older version,
 * adopts a newer version, or changes the normal connection owner's availability/backoff. The
 * caller owns retrying a false result. Late/blocked opens and all successful handles are closed.
 */
export function releaseContributorRootLeaseFresh(factory: IDBFactory, name: string, version: number,
  lease: ContributorRootLease, runtime: ContributorLeaseRuntime): Promise<boolean> {
  return new Promise<boolean>(/** The opening handle exists only for one retired lease operation. */ resolve => {
    let settled = false;
    let timer: number | null = null;
    /** Complete once; the success handler independently closes any handle arriving after timeout. */
    const finish = (released: boolean): void => {
      if (settled) return;
      settled = true;
      if (timer !== null) runtime.cancel(timer);
      resolve(released);
    };
    try {
      const request = factory.open(name, version);
      timer = runtime.schedule(/** An open timeout keeps the durable pin and retry ticket intact. */ () => finish(false), CLEANUP_TIMEOUT_MS);
      request.onblocked = /** Do not wait indefinitely behind another database version. */ () => finish(false);
      request.onerror = /** Includes VersionError; never silently delete a newer-version lease. */ () => finish(false);
      request.onupgradeneeded = /** Cleanup must not create or migrate a database as a side effect. */ () => {
        try { request.transaction?.abort(); } catch { /* Keep the pin if the upgrade already terminated. */ }
        finish(false);
      };
      request.onsuccess = /** Close the temporary handle even when deletion fails or the open was late. */ () => {
        const db = request.result;
        if (settled) { db.close(); return; }
        if (timer !== null) runtime.cancel(timer);
        timer = null;
        void releaseContributorRootLease(db, lease, runtime).then(
          /** Only acknowledged deletion may forget the reader's retirement ticket. */ released => { db.close(); finish(released); },
          /** Defensive port/runtime failure still owns and closes this temporary connection. */ () => { db.close(); finish(false); });
      };
    } catch { finish(false); }
  });
}
