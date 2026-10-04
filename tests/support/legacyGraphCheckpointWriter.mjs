/** Historical full-graph progress writer, excluded from production. Read compatibility remains real. */
const COLD_CHECKPOINT_MIN_FILES = 500;
const COLD_CHECKPOINT_INTERVAL_MS = 2 * 60 * 1000;
const COLD_CHECKPOINT_MAX_INTERVAL_MS = 5 * 60 * 1000;
const COLD_CHECKPOINT_PROGRESS_FILES = 2000;
const COLD_CHECKPOINT_PROGRESS_MIN_INTERVAL_MS = 60 * 1000;

export function legacyGraphCheckpointWriter(index, markdownFiles, indexedPaths, computeVaultSignature, resuming = false) {
      let commitsSinceCheckpoint = 0;
      // A restart must not restart the durability clock. A checkpoint restored hours later is
      // due again after the first 500 new commits, even when this process is only seconds old.
      let lastCheckpointAt = resuming && index.savedSnapshotSummary.checkpoint
        ? Math.min(Date.now(), index.savedSnapshotSummary.checkpoint.createdAt)
        : Date.now();
      let checkpointIntervalMs = COLD_CHECKPOINT_INTERVAL_MS;
      let checkpointRetryAfter = 0;
      let checkpointRetryDelayMs = 15_000;
      let checkpointVaultSignature = resuming ? index.restoredVaultSignature : null;
  const isCurrent = () => true;
  return {
    committed(path) { indexedPaths.add(path); commitsSinceCheckpoint++; },
    async afterFileCommit() {
          const elapsedSinceCheckpoint = Date.now() - lastCheckpointAt;
          if (markdownFiles.length - indexedPaths.size < COLD_CHECKPOINT_MIN_FILES ||
            commitsSinceCheckpoint < COLD_CHECKPOINT_MIN_FILES ||
            (elapsedSinceCheckpoint < checkpointIntervalMs &&
              (commitsSinceCheckpoint < COLD_CHECKPOINT_PROGRESS_FILES ||
                elapsedSinceCheckpoint < COLD_CHECKPOINT_PROGRESS_MIN_INTERVAL_MS)) ||
            Date.now() < checkpointRetryAfter) return;
          // Pause source ingestion while serializing the coherent committed graph. The IndexedDB
          // checkpoint metadata activates only after all page/evidence chunks are durable.
          let persisted = false;
          index.checkpointSaving = true;
          index.emit();
          try {
            checkpointVaultSignature ??= computeVaultSignature(index.app);
            persisted = await index.persistIndexedDbSnapshot(index.snapshotPersistGeneration, indexedPaths, isCurrent, checkpointVaultSignature);
          } catch { /* checkpoint persistence is an optimization; ingestion must continue */ }
          finally {
            index.checkpointSaving = false;
            index.emit();
          }
          if (!persisted) {
            // A failed or cancelled checkpoint did not save those sources. Retain the commit count
            // and interval, but avoid retrying a large serialization on every following note.
            checkpointRetryAfter = Date.now() + checkpointRetryDelayMs;
            checkpointRetryDelayMs = Math.min(COLD_CHECKPOINT_MAX_INTERVAL_MS, checkpointRetryDelayMs * 2);
            return;
          }
          commitsSinceCheckpoint = 0;
          lastCheckpointAt = Date.now();
          checkpointRetryAfter = 0;
          checkpointRetryDelayMs = 15_000;
          // A full graph checkpoint took about 31 seconds on the 20k-note desktop fixture. Grow
          // the interval so repeated saves do not dominate the remainder of cold indexing.
          checkpointIntervalMs = Math.min(COLD_CHECKPOINT_MAX_INTERVAL_MS, checkpointIntervalMs * 2);
    },
  };
}
