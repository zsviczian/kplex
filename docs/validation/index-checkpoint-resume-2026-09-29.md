# Checkpoint cadence after repeated desktop restarts

The maintainer's Desktop 1 report showed a complete active snapshot, two `complete-snapshot-fresh` decisions and two `complete-restored` decisions with zero changed files. Its brief `upToDate: false` / `phase: updating` status was a pending update, not evidence of a cold rebuild.

Desktop 2 repeatedly selected the same checkpoint created at 05:35:23 UTC with 7,057 completed Markdown files. The complete active generation failed with `active-pages-missing-chunk`, but the fallback checkpoint restored successfully. Reports after later restarts showed progress into the 9,000–10,000 range, yet no later `checkpoint-saved` decision. The checkpoint's creation time and completed count stayed unchanged. In the previous scheduler, each restart reset the two-minute checkpoint timer; advancing thousands of files during a short resumed session could therefore leave no new durable graph checkpoint before the next restart.

## Change

- A resumed build starts its checkpoint clock from the restored checkpoint's saved creation time. Once 500 new files commit, an old checkpoint is eligible for another save immediately.
- After a successful save, 2,000 more commits and one elapsed minute can trigger a checkpoint even when the normal four- or five-minute interval has not elapsed. The existing retry backoff, atomic generation activation and fewer-than-500-remaining skip still apply.
- The copied support report now includes Obsidian API version, operating-system family and phone/tablet/desktop form factor through public Obsidian fields. It does not include device identifiers, vault paths, the complete user agent or installed-plugin inventory.

## Verification and limits

A deterministic resumed-build fixture starts from a one-hour-old 500-file checkpoint. It proves saves at 1,000 and 3,000 completed files; the second save fires after 2,000 more commits and 100 simulated seconds, before the four-minute timer. A report fixture checks desktop/macOS and iOS/tablet fields and confirms path-free output. Node 22.22.3 `npm run verify:obsidian` passed architecture, core, scanner lint, indexing/browser suites, production build and exact installed render in disposable `kplex-test`. Obsidian 1.14.2 reported no captured JavaScript errors. Installed `main.js` SHA-256: `cb84c3e480f3cfa64e013f50fa58471787be8bf01004b96b8f55ce9bddf8d2fa`. One earlier repeat run hit an unrelated 50 ms URL-heavy fixture timer limit at 51.6 ms; the same full gate passed on rerun without changing that fixture or the index code.

The test vault verifies the installed build and portable scheduler logic; its 20,015-note graph was not interrupted repeatedly to reproduce the maintainer's 110,000-node checkpoint write cost. A restart before an attempted checkpoint activates, persistent IndexedDB failure, or the final fewer-than-500-file tail can still lose unsaved graph progress. The body parse cache may still reduce rereads on the next run. The main vault was not accessed or changed. On Desktop 2, the practical check is whether the next report records a newer `checkpoint-saved` count after at least 500 newly indexed files. A physical iOS/Android interrupted run remains the priority platform check because mobile storage and memory behavior differ from desktop emulation.
