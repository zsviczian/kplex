# Local edits during the first warm source audit

## Reproduction and scope

Follow-up to [PR #257](https://github.com/zsviczian/kplex/pull/257), starting at `d80ca54` / deployed runtime `bf4f974`. A read-only production observation confirmed a complete graph restored in 17,472 ms while the source audit continued. A placeholder edit left one declaring note in the graph journal, four requested scopes unavailable with `dependency-pending`, no active semantic producer and an active P4 source task. The source audit took 410,639 ms. It then drained the journal and restored global readiness without a full graph build. No production restart, note edit or probe instrumentation was used for that investigation.

The remaining bug was an admission gate: local contributor discovery and eager graph catch-up required the complete source audit before they could repair an already-fresh warm graph. The generic incomplete status also hid that audit's measured progress. Previous native event tests waited for source readiness before editing, missing the interval between complete graph hydration and source audit completion.

## Change

- Only a fresh complete eager snapshot may authenticate its source baseline through the existing closed dependency projection and bounded source-header pages. Every current Markdown source must have a supported complete head matching its native identity/stat binding. Missing/invalid/stale headers, open count journals, changed native observations and concurrent source activation reject this optional path. Normal source auditing remains the fallback.
- Accepted historical primary grammars retain the source repository's existing compatibility rules. Read-only production preflight found 8,192 supported URL-free parser-3 heads and 3,627 parser-4 heads, with no physical mismatch; requiring parser 4 for every source would have defeated the fix.
- Known local edits and authenticated referrers close through the existing local source-maintenance owner and per-file compiler at P1, yielding to canvas mutations. They do not join the paused P4 audit or overwrite either broad audit-readiness flag. The source/host/event/native receipts remain publication prerequisites. Unknown resolver/environment/topology drift retires the warm capability.
- An active audit now shows its actual note count and percentage while relationship repair is pending. A settled unavailable scope retains the existing incomplete status. Existing translated strings are reused.
- No second scheduler, source classifier, persisted store/schema, settings default or public automation signature was added. C15-C26 remain paused.

## Regression and acceptance

The real-IndexedDB coordinator test holds the actual initial metadata comparison open after a genuine complete snapshot loads. Before the fix, placeholder creation failed to publish before that hold was released. With the fix, creation and removal publish under the hold, global graph coverage returns, later navigation performs no source work, and the original audit resumes to full-compiler parity. Both broad readiness flags remain false during urgent repair.

Eight header/lifetime cases cover current and accepted parser-3 heads, stale/missing/invalid headers, pending counts, a new native event and retired caller. Existing folder-wave, startup and status checks remain intact. The native `eagerWarmMaintenance.mjs` lane creates only owned notes in Small, persists a real graph, holds the initial audit after plugin reload, performs native property edits and navigation, then releases the audit and independently restores notes/configuration/workspace/wrappers.

Iteration evidence: the behavioral failing-before case is retained privately. The 106-case affected startup/status/folder group and eight source-header guard cases passed on Node 22.22.2; installed-package TypeScript and the actual indexing harness also passed. Final aggregate, exact-build native and production navigation measurements are pending. Desktop programmatic DOM timings do not establish physical pointer/paint, macOS, popout or mobile acceptance.
