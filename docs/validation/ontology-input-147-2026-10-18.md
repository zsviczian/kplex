# Ontology input commit cadence (PR #147)

Implementation checkpoint on `2026-10-12-issue-144-ontology-input`, integrated with
`main@658793f` through merge `183a948` without rewriting. Addresses #144. Keep draft;
no merge/release or personal-vault access. Full verification/native candidate
full-chain acceptance remains pending at this checkpoint. Exact native acceptance
passes seven cases in each of the actual On-demand and Eager sessions.

## Confirmed cause and bounded change

The original native relationship textarea calls `setControlValue` for each input.
It mutates hierarchy and enters settings-policy capture/invalidation, persistence
and semantic refresh for intermediate values. The legacy `saveSettings(true)` flag
is not itself a full-rebuild request.

Windows Small observational baseline: 14 trusted character events, 14 native
callbacks, 12 writes, 12 semantic invalidations/refreshes and 35 acquisitions after
blur; 0 parses. Source `main@658793f` matches the previously installed verified
runtime `dbe5317` (main.js SHA-256
`75177091ce58f6e70a214954fb33224767e75208ea8defa32bf8bcc9af48e425`). Original
configuration restored byte-exact. This establishes repeated committed work, not
the reporter's actual Mac freeze or a matched resource/latency comparison. Its
support counts, hydration/source failures and background work are context, not a
causal timing trace. No personal vault or comparative performance campaign used.

All seven ontology lists now use the same native textarea/draft binding. Typing
stays local, with a 750 ms idle save and confirmed-text flush on blur/page exit.
IME preedit never commits; row removal drops only unfinished preedit. Each field
retains at most one submitted operation and the latest draft, including while its
semantic refresh is slow. Native text/caret is not rewritten during normal saves.

`updateOntologyField` extends the existing settings queue, accepted-snapshot reader
and writer. It verifies opening field/remote owner, persists before live hierarchy
publication, and retains other accepted role lists exactly. Own migration's sorted
view must not silently rewrite those unrelated roles. Other local fields/styles,
actions and consent keep their existing ownership. Real final semantic refresh is
required and runs outside the disk queue. No parser/compiler/index scheduler or
persistent schema changed; C14 structural work remains paused.

Failed writes retain text across reopen with native Retry and Use saved fields.
Same-field or remote owner conflicts retain read-only copyable text until explicit
saved-value recovery. A genuinely saved-but-refresh-pending result cannot retry the
file write. Plugin teardown fences unsubmitted microtasks, timers and row/window
listeners; accepted storage may finish without reviving unloaded UI. All eight
locales include help/recovery copy; accessible names/descriptions reference native
localized setting nodes.

## Checkpoint verification

Node 22.22.2, real dependencies/Obsidian typings: build and official lint pass.
14 focused real-Chromium cases exercise the actual native controls, shared draft
and extracted production persistence methods. An affected run passed 94 tests
before the final three edge cases/copy updates; final ontology/localization run
passes 36. Final full chain and exact-native repetitions remain required.

Removing idle submission and removing the field-conflict guard each makes its
corresponding regression fail. Exact original source bytes restore in finally.
The first build reached type-check success but sandbox path traversal blocked
esbuild; elevated real build passed. Lint found an inferred-any cache Map; explicit
field/control types corrected it, and the next lint passes. No assertion budget
or core compatibility oracle was weakened.

Reusable native lane: `npm run verify:obsidian:ontology-input`, after exact staging
with the three explicit Small vault variables and a fresh report directory. It
owns three synthetic notes, observes trusted native typing separately from
synthetic composition/paste, checks stationary final parents in three views,
close/reopen, storage retry, saved-refresh-pending and no-view persistence. It
restores private configuration/workspace/fixtures; raw backups must not be published.
The first exact candidate `3743bfb` native lane passed trusted typing, stationary
parents in three views and close/reopen, then failed explicit storage Retry.
Its 22 trusted inputs caused zero writes/policy/source work during typing; idle
produced one write, one invalidation/semantic refresh and three acquisitions.
These are functional counts on a different fixture from the original baseline,
not a matched CPU/memory/latency comparison.

A deterministic new regression reproduced the Retry failure: unchanged failed-write
read-back was normalized again, sorting an accepted list and manufacturing a
remote hierarchy owner change. The narrow shared read-back guard now retains the
already validated predecessor without reinterpretation and keeps any genuine
incoming candidate. The regression is red before and green after; all 31 ontology
and external-settings tests pass, including captured evidence during a failed
write. Real build/types and lint pass. Corrected runtime `af31fc9` passes seven native
cases in both actual indexing modes, including plugin restart with the final saved
policy and stationary rendered Parent. Each run restores original configuration
bytes. Native typing causes zero draft-time work and one final durable policy
commit; reload work is explicitly excluded from those counts. Full verification
and the combined regression lanes remain pending; the failed trial and red log
are preserved.

Raw baseline and all checks are private under `%TEMP%/kplex-147-*`; no archive is
published. Final closeout will pin tested source/artifacts and verified durable
backup references, retain failures, remove the temporary plan marker and replace
this checkpoint status.

## Remaining acceptance

Actual Mac report/large-vault input contention, physical phone/tablet/IME and
minimum-host behavior are separate evidence. Windows/Chromium cannot prove them.
Existing full regression and applicable combined #180/#181 native lanes remain
pending; they are functional acceptance, not a new broad benchmark campaign.
