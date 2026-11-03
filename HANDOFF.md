# Standing instructions ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â preserve this header

This is a temporary handoff document between agents. The development of the solution involves agents with access to Obsidian CLI and a full development environment with all node packages installed, but also agents with more limited access. Development is done in "ping-pong" between these two types of agents. Agents should use this document to pass instructions and status from one another, such as instructions for testing/validation, or instructions for development work that can only be done in a full environment.

## Mixed agent handoff

### Instructions

The **offline development agent has no Obsidian CLI/runtime access** and performs most scoped implementation and substantial trace analysis. Its Node/dependency/browser/network/Git capabilities must be recorded, not assumed. The **main validation agent has Obsidian CLI and a full dependency environment** and prepares assignments, captures runtime evidence, reviews/fixes returns, performs native validation and handles authorized Git/PR actions. Host-only probes or supporting development can be requested from the main agent and the resulting evidence sent back for offline analysis.

Follow `AGENTS.md`, `CONTRIBUTING.md` and [the mixed agent workflow](docs/AGENT_WORKFLOW.md). Keep this single handoff transient: preserve the opening note/standing instructions and overwrite the assignment/results below on each transfer, in either direction. Do not archive handoffs or append a session history. Persist accepted architecture/checkpoint decisions and limitations in `Refactor plan.md`; feature-specific evidence belongs in the issue/PR or a reviewed validation report.

Return uncommitted changes and actual results for main-agent review unless the maintainer explicitly assigns other repository authority. Missing prerequisites/tests remain pending; a skip is not a pass. The main agent independently reviews, runs applicable checks, fixes defects and recommends only necessary prioritized manual checks. Commit/PR/merge/release steps follow applicable maintainer authorization after required validation or explicit acceptance of a recorded limitation.

Obsidian is the production host; preserve the established portable semantic, identity/source, publication/revision, localization and environment boundaries.




---

# Sync hydration fix returned for review

**Inactive implementation handoff:** the fix was implemented and validated on `fix/sync-hydration-backlog`, based on main `e757239ce41a29934bc8a2b74d598146b2bd7e10`. On 2026-11-03, after reviewing the stated residual risks and validation gaps, the maintainer authorized publishing and merging this work, switching to main and fetching. Release and further production runtime changes are outside this integration request.

## Outcome

- Compatible changed-vault Eager caches hydrate as cached/read-only presentation before the all-owner source audit. Current relationship/write authority still requires genuine source closure and authoritative compilation. Exact-fresh warm behavior is unchanged.
- The existing single bounded retry covers that active cached generation. Before retrying, it joins already-running local center tasks that may release scheduler leases between structural and file publication. All fingerprint, policy, physical identity/stat/membership and publication accounting guards remain.
- Known selected-owner revisions are reacquired without repeating validated unrelated owners. Equal-stat raw-body edits, unknown/global/topology changes and unobserved native drift retain their rejecting fences.
- Successful full builds retire only their captured creation reason. Newer metadata stays per-file; newer creation stays structural. No persistence debounce, schema, setting, release version or background pacing was changed.

## Evidence

Detailed results and limits: [validation report](docs/validation/sync-hydration-2026-11-02.md), [exact-build native receipt](docs/validation/sync-hydration-2026-11-02.json).

- Failing-before evidence for audit-before-cache, covered creation, repeated inventory prefix, foreground supersession, and split center publication. Original rejecting same-stat assertion retained after the complete suite caught an over-broad retry.
- Aggregate verify passed release/architecture/core/lint/indexing and 1,906 main tests. Browser aggregate: 462/463, one pre-bundle Chromium load timeout; unchanged five-test file passed rerun (earlier separate 23-test file also passed rerun). Do not describe this as one uninterrupted green verify.
- Portable source lane: 357 passed. Complete real-IDB lane: 888/889, one same-stat fence failure corrected and rechecked. Final affected foreground/startup/source/lifetime/hydration run: 153 passed. Expanded hydration file: 48 passed, including a changed-source rejection. Final lint and production build passed.
- Existing 20,015-owner case passed exact semantics, zero acquisition/full-build work, linear owner checks and cancellation bounds. No accepted oracle or timing/work bound weakened.
- Final Windows native: cache hydration 633 ms, current graph including newer edit 9,084 ms, healthy warm reload and three semantic destinations 7,525 ms; warm zero full builds/reads/parses/additional requests. Normal throttling; no foreground recovery; cleanup and configuration-byte restoration passed.

## Production boundary and deployment

Zsolt's Brain remained read-only except the explicitly authorized `main.js`/`styles.css` deployment. Only those two files were deployed after final native success; manifest, data and enablement hashes were preserved. No production reload/restart/navigation/notes/cache/config changes were performed.

Passive production sample at 2026-11-02T22:33:48.709Z: old process still incomplete, 4,458/11,821 files, 4,496 pending owners/graph sources, all Markdown paths dirty; hydration timed out in source authority before any full-cache attempt/page. Renderer hidden/unfocused; two body reads/parses, zero source failures. The deployed fix needs a normal plugin/Obsidian reload to become active; production timing against it is not established.

Final main SHA-256: `4f7f67b2af446859ac5c2e625cd09d6c4873670637103b3c6fc01b657bdecca2`. Styles: `d89188385a224f257da98ca48b41ea1e0fe9dd14f67f45012a51b144fb492ab1`. Private production evidence and pre-deployment backups: `%TEMP%/kplex-sync-deployment-0p7zT8/`. Final private native receipt: `%TEMP%/kplex-sync-hydration-native-8puusr/`.

## Review and remaining acceptance

The source/tests/native probe/report are the reviewed integration scope. The indexing and menu/action extraction fixture changes include actual dependencies omitted by previous PR261 fixtures; no behavior assertion was weakened. Temporary staging/diagnostic helpers were removed; the maintained scenario remains `scripts/testing/obsidian/syncHydration.mjs` and requires exact-build disposable staging under the shared application lock.

Highest-risk manual check: after a normal reload, save and rename notes across two real synced devices with an open Plex; confirm final links match notes and progress advances. Physical two-device Sync, macOS, mobile, popouts, actual paint and final 11,821-note production startup timing are not established by the Windows Small lane. Do not infer those passes from synthetic events or this receipt.
