# SI4a main-agent validation — 2026-09-30

**Verdict: accepted as an internal cached-source preparation seam.** Live GraphIndex publication, settings dispatch, search and UI reads still use the previous route. This checkpoint does not solve settings-change latency by itself.

The native checkout was branch `indexing-optimization-v2`, base `1f076a9` (the preceding handoff commit), with the offline implementation uncommitted. The offline archive named its source base `da471aa`; the intervening commit changed only the transfer handoff. The complete returned runtime/doc/test diff was reviewed for canonical compiler/resolver reuse, opaque identity, physical versus semantic paths, source/host/policy revision fences, exact selected-family validation, retained evidence multiplicity, bounded normalized batches, cleanup, TSDoc and unchanged C14 synchronous publication. Review fixes were two explicit `void` lease-release calls to satisfy the official lint rule and three new modules in the indexing harness's fixed transpile list. No settings/schema/command/public-copy migration was introduced.

## Automated evidence

| Check | Result |
| --- | --- |
| Node | 22.22.3, satisfying the repository baseline |
| `npm run verify` on the reviewed tree | Pass: architecture 7/7, restricted core 60/60, indexing/settings scenarios and integration 133/133, UI 7/7, source 26/26, real Chromium IndexedDB 12/12, official Obsidian lint, production build |
| `git diff --check` | Pass after review |
| Real Chromium selected-head cases | Cross-connection replacement cannot mix families; pinned retired revisions resist cleanup; success, rejection, cancellation and unload release leases; corrupt/missing chunks/postings and newer format fail closed; indexed candidate union and two-policy durable reuse pass |
| Portable semantic oracle | Eleven SI4a replay cases compare full compiler semantics and record-level provenance across policy changes, dense input, malformed source, revisions, structural supplement and opaque identities; no accepted golden was weakened |

`npm run verify:obsidian` reran the portable suite before staging and twice stopped on the existing timer-sensitive URL-heavy post-parse patch assertion (68.1 ms and 53.5 ms). The independently run full `npm run verify` passed on the same tree. The native runner's remaining exact-artifact staging and smoke assertions were therefore invoked directly without repeating that already passed portable gate. This is a harness timing limitation, not a silent `verify:obsidian` pass.

The native runner staged `dist/main.js` SHA-256 `f2ae2df986256ca37747d1455758fdbfd2e9df68d599cd02ece026e1606a753b` (manifest version `0.0.5`) into the explicitly configured disposable `kplex-test` vault. Staged hashes matched the build; the start command rendered `.kplex-app` with K-Plex text and Obsidian captured no JavaScript errors. Report: `/private/tmp/kplex-si4a-native-direct/report.json` in the validation environment.

An additional CLI maintenance probe created two temporary Markdown notes with opposite-endpoint Friend/Opposes properties, acquired both durable source heads, and called the installed internal `prepareCachedSemantics` twice with different policy objects. Both preparations returned `ready`. The first role multiset was `child, child, left, right`; moving Friend into the right-friend policy yielded `child, child, right, right`. Both owners visited each of four stored families once, the head sequences/source revisions stayed equal, and acquisition counters recorded no added Vault reads or body parses during policy-only replay. The probe removed both notes and its controller; a subsequent CLI check found zero matching notes and no controller.

This native probe verifies the adapter and installed artifact on a finite owned scope. The portable oracle supplies full-compiler/provenance equality; the native probe does not certify full-vault pair completeness, search freshness, performance, Date-environment changes, physical mobile behavior or a change to the live settings route. SI4b1 must provide exact contributor discovery before SI4b2 can publish derived semantics; SI4c then migrates settings and read consumers. **No maintainer manual test is required for SI4a.**
