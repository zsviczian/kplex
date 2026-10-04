# SI4 acceptance — 2026-10-03

**Accepted: all ten original SI4 Delivery 1/2 exits pass in the working tree.** This report supersedes the earlier [scoped R3 correction report](settings-independent-indexing-si4-r3-correction-2026-10-03.md), which did not close the original Delivery 1/2 checklist. Working tree: `indexing-optimization-v2`, HEAD `bf0b3582bb5e39e512d7f282f78393b999d9f6a1`; last committed accepted checkpoint remains R2 `831e345`. No commit/release or SI5/C15–C26 work is included.

## Corrections required by online validation

1. **Warm accepted source observations:** unchanged heads retain their accepted epoch/revision after binding the physical identity. Fabricating the new session epoch made a valid reused head fail cached matching. The clean-restart real-IDB test now exercises captured observations, cached matching and actual candidate-degree preparation while proving unchanged heads and zero acquisition work.
2. **Ordinary visible request scope:** private neighborhood proof still authenticates all semantic parents, but the public scope expands complete incidence and supplemental degrees only for visible parents/candidates. A hidden root no longer expands all unrelated owners before a normal note renders. A coverage signature supports visibility expansion/contraction without changing semantic/source validity. The 1,024-unrelated-owner regression compares full canonical gates/siblings and enforces at most two distinct owner captures with folders hidden.
3. **Attachment events:** native binary creation queued a structural full rebuild, which continued into settings measurement. Creation/deletion now reuse existing file-tree materialization and ghost dematerialization; source-local maintenance repairs inbound bindings. Coordinator and real native create/modify/rename/delete/recreate cases enforce local work and no graph rebuild.
4. **Edit/open publication race:** a graph patch could supersede preparation after source readiness had already fired, leaving a normal view permanently updating. Task coalescing now includes source/publication/presentation fences; a superseded task retries live demand when one of those fences actually changed. The regression uses the production incremental publisher and requires exactly one automatic retry. Unchanged missing inputs never self-schedule.

5. **Known folder topology:** nested moves/deletions now walk only the existing affected file tree in cooperative slices, preserve canonical file/folder identities and remap current navigation/pins. Per-file publication waits for that maintenance. The parent/child deletion denominator uses physical identity to avoid double counting. A rename burst completes an already authorized retained tombstone before immutable body replay; the old binding remains masked to ordinary readers. Native move/delete/recreate passes with zero reads/parses/full builds; uncertain folder resolution uses cached-data reconciliation.

6. **Physical creation and late unsaved acquisition:** a file already visible through a prepared scope must still materialize in the canonical incremental baseline. Materialization is idempotent and no longer promotes only a private page. An unsaved GraphBuilder acquisition retains a source-local retry owner after the earlier inventory consumed its event; it cannot leave readiness closed with no dirty file to retry. The current native creation sequence and real-IDB automatic scheduler regression cover these cases.

No persisted schema, settings keys, role precedence, parser grammar, CSS or user-data migration changes in these corrections. The existing R3 byte/record guards, cooperative cancellation and synchronous publication remain.

## Consolidation and finite compatibility callers

Application acquisition had no callers for `prepareCachedSemantics()` or global `contributorDiscovery()`. Both methods were removed mechanically and preserved intact in `tests/support/retiredSourcePrototypes.mjs`; portable/browser characterization fixtures explicitly install them. The runtime contract test checks their absence on the application prototype. Production uses requested neighborhood plus supplemental candidate degrees, with shared replay/finality helpers and no global catalog bootstrap. Pair/direct-order classes and old discovery algorithms remain for characterization/type/shared helpers; unused implementations are tree-shaken out of `main.js`. SourceRepository contributor/journal/lease APIs and legacy stores remain for persisted-data compatibility. Their physical retirement belongs to explicit SI5 cleanup; no SI4 application wrapper is deferred to SI5.

## Original SI4 delivery exits

| Exit | Evidence |
| --- | --- |
| D1.1 — actual saved policies and consumers | Exact-build native 14-case settings/navigation sequence in both small and 20,015-note vaults; rendered center/gates/counts/accessible label or replacement image, siblings, alias search, provenance and write readiness; production browser full-compile oracle. |
| D1.2 — valid facts, zero source/full work and bounded first normal view | Native large run waits for actual graph and source readiness, exercises an adopted warm owner without rewriting its head, records six distinct owners and zero reads/parses/acquisitions/inventory/head pages/full builds; source completion remains ready and unchanged. |
| D1.3 — new demand, supersession and stale writes | Production expansion/navigation/settings tests and native held-B/released-B/published-C race; overlapping saved policies reject a stale relationship edit and publish the final policy; local patch retry regression. |
| D1.4 — title freshness and consistent tie behavior | Selected-title completion/absence/freshness and URL-order real-IDB tests; existing full/scoped stable tie fixtures, unchanged semantic oracles; actual alias label/search checks. |
| D1.5 — required lanes/native settings | Final pinned-Node full verification, actual installed Obsidian types/build, scanner and exact-build native staging/settings checks. |
| D2.1 — known edit and dormant activation | Source-local production scheduler and acquisition tests; native dormant B→C edit while unassigned followed by cached field activation of C; real live Markdown waves require no inventory/head/unrelated-source work. |
| D2.2 — real host events and uncertain convergence | Native folder/Markdown creation and five Markdown/attachment waves; Date property/Daily Notes configuration drift and idle observation; portable/real-IDB alias, unresolved, relative/subpath, tag/URL, burst, race and coalesced uncertain-host cases. |
| D2.3 — supported hot completion | Real-IDB 20,015 independent-owner production GraphIndex publication, exact canonical provenance/gates/siblings/degrees/search/edit parity; hot-key/long-key and non-Markdown owner regressions with bounded pages/yields. |
| D2.4 — atomicity, cancellation and consolidation | Real-IDB repair/crash/concurrent-reader/write/lease tests; cancellation exposes no prefix; aggregate retained-memory rejection; retired application wrappers and bundle/caller review above. |
| D2.5 — final automated/native maintenance and no hidden pending | Exact-build native edit/open race now converges automatically; final native ready prerequisites are observed, never fabricated or driven with manual reconciliation. All required results and cleanup are recorded below. |

## Verification and artifact identity

`npm run verify:obsidian` passed on pinned Node 22.22.2, installed Obsidian types 1.13.0, Obsidian 1.14.4 and macOS Darwin 23.5.0. It includes full `npm run verify`: architecture **7/7**, core **60/60**, aggregate Node **133/133**, UI browser **7/7**, portable source **314/314**, real Chromium/IndexedDB **174/174**, strict indexing/settings checks, the official scanner and actual TypeScript/production build. No lint warnings remain. Exact-build staging/rendering passes with no captured JavaScript errors. Full lane: 2026-10-03 11:26:26–11:36:07 UTC.

| Artifact | SHA-256 |
| --- | --- |
| `main.js` | `d8ae7df70ea58a25f39f21a6fa50a125e210a3e8bc15969b63b92c6f38d7a68b` |
| `manifest.json` | `e3bb9a35215af97f6a3394cf7fc8f7d2142bae06de94bb112fef5a05819cda62` |
| `styles.css` | `e9da76ff7840cea44b77912963977f1fe2ab762b69a9853d047712d7b3270494` |

The final independent-owner production case publishes exactly once for **20,015 owners**, with **11,630,401** validity calls and complete canonical/provenance/consumer parity. Elapsed time: **238,123 ms**; sampled JS heap: **571,454,211 bytes**; conservative combined retained reservation: **719,667,320 bytes**, below 768 MiB. Cancellation at the second yield exposes no prefix. Hot dependency lookup completes all 20,015 owners in **770 pages / 769 yields**, with a 171,774,458-byte retained-work estimate. Earlier validity scaling at 128/256/512/1,024 owners remains exactly linear at 124 calls per owner. These are supported-completion observations, not latency/paint/device acceptance.

The final artifact passes **14 actual saved-settings/navigation cases in each vault**. Large prerequisites are genuinely ready at 20,015 original Markdown files; measurement includes five owned Markdown fixtures. Both runs replay a warm accepted owner without rewriting its head, capture **six distinct owners**, and record zero body reads/parses/acquisitions, Markdown/file inventories, head paging and full builds. Source counters and ready completion are unchanged. Rendered output, gates/siblings, aliases/search, provenance, stale-write rejection and latest policy/demand are asserted. Native maintenance and final restoration are recorded in [machine-readable evidence](settings-independent-indexing-si4-native-2026-10-03.json).

## Failed attempts and limits

Earlier green lanes certify their earlier artifacts only. Native trials reproduced the warm-observation, hidden-parent, attachment, publication retry, canonical-creation, retained-body and late-unsaved-owner failures above; fixes have production regressions and final native reruns. Failed attempts are preserved and not counted as passes:

- The unchanged 50 ms URL-heavy timer assertion failed at 55.3, 95.7, 196.6, 74.5 and 60.1 ms in intermediate runs. Some overlapped heavy native startup; a cause for every sample is not established. Neither timing bound nor oracle was relaxed. The final full lane passes.
- The first tombstone correction made ordinary retained-body reads wait behind a held deletion, producing a browser timeout. Waiting is now an explicit rename-only opt-in; ordinary masked readers remain nonblocking. The full 174-test lane passes this contract.
- Harness corrections covered intentional image replacement retaining an accessible label, repeated captures versus distinct owners, explicit text→Date setup after native auto-detection, and activating a visible demand before testing graph publication. These were not product behavior changes.
- Earlier CLI readiness/poll timeouts and the initial Node 18 invocation are failures; final drivers use pinned Node and hard CLI timeout termination. No manually fabricated readiness or explicit reconciliation is used to pass the native scenarios.
- A prior large restart exceeded the hydration watchdog and entered `full-rebuild:startup:partial-restore-incomplete`. Its renderer subsequently crashed with `EXC_BREAKPOINT`/`SIGTRAP`, termination code 5. The macOS report is `Obsidian Helper (Renderer)-2026-10-03-130618.ips`; **the cause is not established**, and an out-of-memory cause is not claimed. Only the explicit disposable large vault was reopened. The final quiet native run passes with actual ready prerequisites. This failed restart remains an open SI5 startup/scale investigation; this report does not accept that workflow.

Native tests temporarily disable renderer background throttling and restore its actual previous boolean. They establish functional behavior/work counters, not paint, foreground performance or physical-device evidence. High-degree multi-minute completion and conservative memory reservation establish supported bounded completion, not SI5 latency or mobile safety. No physical mobile or popout result is inferred.

## Cleanup and remaining work

Final cleanup passes: owned fixtures/controllers/wrappers/demand are removed and actual original throttling is restored. Native Markdown five-wave maintenance, attachment five-wave maintenance, dormant edit/activation, nested folder move/delete/recreate, actual Date/Daily Notes drift and the unchanged 31-second idle poll all pass on the final artifact. Known file waves perform no inventory/head paging/unrelated-owner work; uncertain folder/configuration transitions reconcile cached facts without body reads/parses or full builds.

The temporary small-vault plugin is removed, original enabled plugins restored, and all 14 pre-test cache stores restored and compared. The large vault retains the exact build and its 20,015 original notes.

SI5 remains pending: startup/sync/interruption adoption, derived-cache failure/migration/retirement, comparable named-hardware latency/memory, desktop main-window/popout and physical iPad/Android validation. Highest-probability risks are warm convergence and dense-scope device memory/latency; test those separately. No further validation is pending for the original SI4 Delivery 1/2 exits. SI5 has not started.
