# On-demand indexing V2 validation — 2026-10-06

## Result

The reopened desktop regression checks now pass on the exact corrected build. The original scoped results below remain historical; the final regression section distinguishes saved-Eager vault reload/cached presentation from current local On-demand readiness. The preceding W1–W6 checkpoint is committed as `e97696f325a8ebbcb83ce293730b76b0b1e072a9`. V2 is checkpointed on `indexing-fixes` before the separately requested URL-indexing correction; no push/PR/release was requested. C15–C26 remain paused. The reopened correction and final desktop validation are recorded below; previous failures and scoped evidence are retained.

The accepted ordinary-center run in the reference vault, containing 11,815 Markdown notes, completed local graph/count work in **3.695 seconds** after plugin settings-load completion with Obsidian layout/metadata already ready. All 24 rendered gate labels were numerical. Only 3 selected owners were canonicalized; global source inventory was disabled, no inventory task was running, and global dependency authority remained false. This meets the initial 5-second target for that measured center. It is one accepted timing sample, not a universal latency guarantee or an app cold-launch benchmark.

[Exact minimized evidence](on-demand-indexing-v2-2026-10-06.json) preserves artifact hashes, counters, milestones, cleanup assertions, failed attempts and limits.

## Implemented behavior and coverage

- **Indexing config** supplies restart-required eager/on-demand and independent URL strategies. Eager remains default. Strategy edits persist without rebuilding the active graph.
- On-demand publishes physical/host facts and bounded canonical owner patches without global inventory, source certification, whole-graph evidence hydration or unrelated reconciliation. Existing collectors/compiler/resolver own all semantics; no schema, parser concurrency or contributor-catalog redesign was introduced.
- Current host-supported/indexed local incidence produces numerical gate totals before display/body-owner truncation. Coverage remains separate from global negative-evidence/write authority. Exact editing retains its existing pair preparation.
- A cold graph cannot discover body-only incoming declarations from never-indexed unrelated owners using Obsidian metadata alone. Fresh finite snapshot incidence can accelerate those counts; metadata/file/policy observations retire its proof. Partial live graphs never become complete persisted snapshots.
- Local covers stream one owner at a time with 2 MiB estimated metadata/owner, 2,048-value traversal, 8,192 normalized-record and 32 MiB normalized-payload guards. Genuine missing/oversized inputs expose unavailable counts rather than silently truncating totals. Folder totals use independent direct native membership.
- Optional URL discovery populates vocabulary/aliases through the canonical node compiler without unrelated owner incidence or global source authority. Foreground preparation preempts/resumes it. Ontology policy cancellation may stop this one-session optional scan and require restart.
- Cache size is a settings-only logical-payload estimate. Confirmed purge cancels work, closes/deletes only this vault's K-Plex IndexedDB and requires restart. Notes are not deleted.

## Automated verification

Required Node 22.22.2 was used. Final `npm run verify:obsidian` passes:

| Lane | Passed |
| --- | ---: |
| Architecture | 7 |
| Restricted core | 67 |
| Node contracts | 247 |
| UI components | 17 |
| Portable sources | 322 |
| Actual Chromium/IndexedDB | 329 |

No skips, cancellations or failures. Production fixtures/settings-independence 24 scenarios, installed types, official scanner, production build and exact-staged desktop smoke also pass. Scanner reports zero errors and one unchanged legacy `activeLeaf` warning. All 280 captured verification inputs remained unchanged through build and native acceptance. No temporary probe prefix occurs in `src/` or `dist/main.js`.

Focused coverage includes 18 V2 real-IDB cases, 14 existing eager startup cases, 29 host metadata/count cases, 50 settings/localization/layout cases and 25 actual cache-storage cases. These overlap the final suite; they are not additional independent repetitions. The navigation regression holds old count work, releases its demand, verifies immediate new-center publication, skips queued obsolete covers and refuses late old proofs/failures.

Final main.js SHA-256: `0b906182bbc5bf1df7c862ea76ef50b3c9f897ea98c0471a0803e7c480410183`. Build/staged small-vault/reference hashes match. CSS and manifest remain unchanged.

## Native controlled acceptance

Serial native probes used the exact verified bundle in `kplex-test-small` on Obsidian 1.14.4/installer 1.14.0, macOS. One owned folder supplied 78 Markdown fixtures, including 70 incoming Parent-property owners, center declarations, peer/parent/child notes and one unrelated URL note.

| Observation | First on-demand run | Warm restart with URL background enabled |
| --- | ---: | ---: |
| Body-free baseline | 31 ms | 28 ms |
| First numerical center labels | 65 ms | 55 ms |
| Center body publication | 573 ms | 338 ms |
| Local work and count-cover closure | 3624 ms | 2614 ms |
| Selected Markdown owners | 64 |64 |
| Wrapped fixture `cachedRead` calls | 64 | 0 |
| Rendered numerical gate labels | 308 |308 |

First numerical labels are not used as the completed count oracle. The final canonical center totals are **top 2 / bottom 72 / left 1 / right 1**, including all incoming metadata owners beyond the64-body cap. All 308 rendered labels are numerical. Status reports 64 indexed of 91 notes, never all notes indexed merely because the local graph is ready.

A → B → A increased wrapped reads 64 → 65 → 65: returning to A required no reread. Folder navigation reports top 1 / bottom 78 / left 0 / right 0 with no extra reads. Actual relationship creation and provenance unlink persisted only to owned fixture notes and converged locally; inventory remained disabled/runningfalse/global-readyfalse. Optional background discovery completed, added searchable URL vocabulary, and left the unrelated URL-note incidence empty. Its own `Vault.read` work is not included in the foreground `cachedRead` wrapper; zero warm wrapped reads does not mean the optional scan performs no reads.

The native settings page renders both enum controls and a 20.3 MB approximate cache estimate. Cancel leaves cache alive; confirm returns actual successful deletion and displays 0 B with restart-required copy. Obsidian's settings/dialog document is separate from the main graph document; the probe locates the modal in its owning document. Cleanup removed all fixtures and controllers, restored read/load/save methods and original settings/enablement bytes, and returned to the original 13-note disposable vault.

## Native reference acceptance

Only previously authorized main.js deployment/reload was performed in the reference vault. No fixture, note editing, fault injection, cache purge or renderer-throttling change was performed there. Runtime-only on-demand/URL modes used a save fence; original saved preferences were restored.

| Milestone | Accepted foreground run |
| --- | ---: |
| Body-free baseline | 3132 ms |
| First numerical center labels | 3132 ms |
| Center body publication | 3335 ms |
| Local work and count-cover closure | 3695 ms |

All 24 rendered labels were numerical.3 selected source bodies were reused, with zero source-adapter body reads/parses/repairs. The aggregate native `cachedRead` wrapper observed 1 call across the entire vault/window; it is not exclusive caller attribution. No global source inventory or dependency authority was enabled. Physical file path/stat digests matched; saved data.json and enabled-plugin list are byte-identical; no temporary controller/load/save/read wrapper remains. Only the deployed main.js differs from the pre-deployment artifacts.

Two additional functional reloads reached numerical local readiness but ended without document focus. Their elapsed times are excluded from comparisons. No three-run median or general production-vault performance guarantee is claimed.

## Development failures and cleanup corrections

1. The first full aggregate attempt stopped on 7 obsolete eager/status test doubles missing the new session-mode method. Updated doubles and explicit local-status coverage passed 37/37 relationship-action tests.
2. The second aggregate passed 327/328 browser tests; an existing exact-pair unrelated-change fence returned false once. Its production implementation was unchanged. The isolated case, complete 43-case relationship-mutation file, and final 329-browser suite subsequently passed. Assertions and timing limits were not weakened; the intermittent failure's underlying cause is not established.
3. Three small-vault probe attempts were corrected: acquisition `checked` includes selected-owner work and is not a global-inventory counter; native dropdowns include duplicate display selects; settings modals belong to another document. All failed attempts cleaned up notes/settings successfully. No production code changed after final verification.
4. The first reference measurement completed its functional work, but CLI disable/enable reordered the enabled-plugin list. The original unique array position/format was reconstructed against its captured SHA-256 and restored to exact original bytes. Subsequent probes use matched native instance reloads, which preserve configured order. That cleanup-failed attempt is not the accepted reference run. Additional focus-lost attempts are likewise excluded from latency comparison; their cleanup passed.

Raw session reports remain under `/private/tmp/kplex-v2-*20261006*`; the linked minimized JSON is the durable accepted evidence. Native probes used bounded serial CLI eval controllers and lifecycle completion tokens, not production instrumentation. Graph observations begin after settings-load completion with host layout/metadata already available; they measure API/DOM work closure rather than actual paint, trusted pointer latency, full application cold start or physical-device performance.

## Enablement and remaining manual coverage

Select **Indexing config → Indexing mode → On demand**, then restart Obsidian. The reference vault's saved **Eager** mode was deliberately restored. Select **Web link indexing → Background scan** only if independent all-note URL discovery is desired.

Priority manual checks:

1. Physical Android/iOS cold/warm startup and background/resume in On-demand mode: current local gates become numerical after host metadata is available; navigation remains responsive and settings/purge confirmation are usable.
2. Multiple views/popout navigation while count work is pending: released views cannot publish late proofs, surviving views retain their own demand, and switching centers does not wait for obsolete covers.

Desktop/native/browser checks do not substitute for physical WebView/touch acceptance. Unseen cold body-only incoming incidence, dense-input guards and the optional policy-cancelled URL scan remain the explicit limits described above.


## Subsequent production failure — acceptance reopened

The maintainer reports missing relations/counts after full Obsidian restart, a >10-minute vocabulary phase, and loss of previously complete counts on Cohort → StoryOS → Cohort navigation. Installed artifact hash matches the tested build. Saved and active Eager mode is confirmed. The reference timing above used a temporary On-demand session after host metadata/layout readiness; it does not establish the reported ordinary startup or navigation behavior. This report's individual passing assertions remain historical evidence, but overall production desktop acceptance is pending. Root-cause investigation and final exact-build regression validation are required.

## Reopened investigation and final regression validation

### Confirmed causes

The ordinary saved mode was Eager. An actual native vault reload produced more than 11,000 host metadata observations during schema-3 page hydration; the resolution source revision then advanced and the restore failed. At 15.9 seconds hydration was failed; at 17.4 seconds the coordinator selected `startup:partial-restore-incomplete` cold recovery. A plugin reload with metadata already ready instead restored the same complete cache. This distinguishes the real startup-wave failure from the earlier limited reference test.

Released Eager scopes were deleted, so navigation could replace a previously complete graph with zero-incidence source vocabulary while a replacement prepared. Vocabulary replay additionally serialized the 34.9 KiB settings policy per normalized record. The On-demand Finite and Infinite Games center already had exact local gates 8/16/10/1, but an unresolved neighbor was incorrectly classified as missing Markdown metadata and retained four ellipses. The corrected owners preserve bounded released scopes, check mutable policy at cooperative/final boundaries, retain explicitly read-only cached incidence through physically unchanged host waves, and compile virtual/URL/tag local covers through canonical entity facts and collectors.

### Verification findings retained

- Focused corrected counts/cache/navigation suite: 74/74 passed; an additional mode-guard rerun passed all 21 On-demand cases.
- Full attempts stopped twice on the unchanged URL-heavy timer guard (50.8 ms and 56.7 ms against 50 ms). An unchanged isolated attempt also failed at 52.4 ms while the old reference runtime was rebuilding. A temporary sequential native-pause diagnostic measured original 35.46 ms and On-demand-cleanup-only counterfactual 31.29 ms, with search/commit behavior preserved. All saved settings and enablement bytes were restored. These are diagnostic comparisons, not native graph latency evidence.
- The approved narrow mode guard prevents Eager from allocating On-demand-only per-URL revision entries. The final unchanged isolated indexing runner subsequently passed the 50 ms guard and asserted that the Eager map remains empty. No search/staging refactor or timing-limit relaxation was made.
- A further full attempt passed Node/UI/indexing checks but cancelled eight portable cases because an old cancellation fixture waited for a preparation hook on a now-retained current scope. The fixture now retires B through a real host observation, settles A's separate repair, then holds the new B preparation; every original semantic oracle, cancellation and coherent-view assertion remains. Its 15 cases pass.

### Final exact-build results

Node22.22.2 `verify:obsidian` passes architecture7/core67/Node248/UI17/portable322/real-browser341, zero failures/skips/cancellations, production fixture scenarios24, TypeScript, scanner zero errors/one retained warning, build and exact native smoke. All280 frozen inputs match. Final main.js SHA-256: `65bceafc178d368b51210a8783ae2f3786d83643096f432ffdcfc4723c73d08e`; reference, small and dist artifacts match. Styles/manifest remain unchanged. Main review checked canonical ownership, opaque identities, physical/policy/publication fences, count-vs-write authority, LRU byte/entry bounds, mutable policy checkpoints, localization/TSDoc, settings compatibility and cleanup; no schema or C15–C26 change.

**Saved-Eager actual vault reload:** the cache survives11,049 metadata notifications with diagnostic `startup-host-wave-cached-presentation`, no cold/physical-only fallback and no repeated global node-vocabulary rebuild. From the whole CLI vault-reload trigger: numerical center21.716s, all rendered gates numerical33.966s, hydration complete38.509s. Initial samples were hidden/unfocused and the window was brought foreground during capture; these are functional phase observations, not comparable five-second current-readiness or process-cold-start measurements. Early finite neighbors remained explicitly partial until full cached incidence was decoded. Notes/settings/enablement hashes were preserved.

**Saved-Eager named navigation:** Cohort → StoryOS → Cohort → Finite and Infinite Games → Cohort all retain numeric gates and every expected direct node (8/12/8/35/8). Cached count coverage is explicit; current scopes supersede it. Rapid navigation captured transient canonical preparation/incomplete status, so this establishes coherent read presentation rather than completed current scope certification. Final settled restored Eager status is ready, with no pending semantic work.

**Current local On-demand reference session:** temporary runtime override after metadata/layout readiness, saved Eager preserved. Initial local count closure **3.760s**, four durable owners reused,13 rendered nodes/12 expected direct neighbors,52 numerical gate labels, global inventory/dependency authority false, zero wrapped body reads. Cohort/StoryOS revisits take554–566ms; Finite and Infinite Games takes **2.665s**, with gates **8/16/10/1**,35 expected direct neighbors/36 rendered nodes and **144 numerical gate labels**, including the previously unresolved neighbor. All five navigation steps show zero missing direct nodes/unavailable labels and zero wrapped body reads;31 owners acquired by Finite, no further reads on returning to Cohort. These are API/DOM closure measurements in one warm foreground session, not actual paint or universal latency guarantees. An earlier5.595s target miss remains recorded.

Final audit: reference11,815 notes, small13 original notes, zero owned fixture notes, original saved Eager mode, both instances ready, no temporary globals/load/save/read wrappers, no active priority owners/waiters/pending semantic work. Reference data.json/enablement exact original hashes match. Reference deployment changed only main.js. Documentation/plans updated; V2 remains uncommitted. Physical Android/iOS and persistent On-demand process-start timing remain unmeasured; the manual recommendations above still apply.
