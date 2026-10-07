# URL discovery and foreground indexing correction — 2026-10-06

## Scope and checkpoint

The preceding V2 implementation is checkpointed at `9ba04cf` on `indexing-fixes`.
This correction adds always-on, independently cached URL incidence, canonical web identity,
and Eager foreground parity. It does not resume C15–C26 or replace the existing source repository.
Final aggregate and native acceptance are pending until the measurements below are recorded.

## Reproduced failure

The reference vault had 11,815 Markdown owners and saved On demand/background settings.
At installed `main.js` SHA-256
`65bceafc178d368b51210a8783ae2f3786d83643096f432ffdcfc4723c73d08e`,
`https://Obsidian.md` was absent and the lowercase root had zero referring neighbors.
The status remained “Preparing local graph” over the 15-second observation although local
tasks and the URL scan were idle. This is functional failure evidence, not a startup benchmark.
Reference notes and configuration hashes remained unchanged.

The old background job prepared URL search vocabulary, then discarded URL incidence. URL-center
preparation could not obtain incoming external links from Obsidian's internal-link cache. An idle
global startup flag also selected the local preparation label. Normal-note V2 tests did not establish
URL-center acceptance. Raw URL spelling additionally allowed authority-case variants to diverge.

## Reviewed behavior and boundaries

- Discover body and property URLs using the existing grammar/collector and canonical patch compiler.
  Keep property provenance distinct, explicit/hidden ontology precedence intact, image-only values
  presentation-only, and source facts immutable during historical replay.
- Restore disposable URL-owner records before broader snapshot work. Validate format/parser version
  and exact path/file/mtime/size; file events fence equal-stat edits. URL records retain only URL-bearing
  body/inline occurrences and property values, including original lexical payloads.
- Bound native reads by count and bytes across background discovery and events. Bound cache restore
  pages by count and logical bytes, allowing one oversized owner alone; consume outside transactions.
- Publish privately prepared graph/evidence, alias/search updates, count-proof invalidation and
  notifications synchronously. Current URL-owner facts mask stale cached edges for presentation;
  this does not authorize note edits or global note-to-note negative evidence.
- Preserve canonical URL page identity in lookup, enumeration and search. Current independent URL
  incidence uses the existing semantic relationship projection; raw full-graph adjacency/evidence
  remain coherent for optional acceleration persistence. Foreground invalidation also considers
  discovered URL adjacency. Native probes sample that same projection plus rendered nodes/gates.
- Preserve compatible historical non-URL dependency coverage. Canonical URL closure uses an explicit
  derivative capability and an authenticated global-catalog marker; source heads are not restamped.
- On demand is the default; explicitly saved Eager survives. Both modes serve foreground local work.
  Eager retains V2's background source-backed catalog rather than eagerly allocating all incidence.

## Validation status

The focused offline lanes cover cold progressive centers, warm cache reuse, edits/deletion/rename,
equal-stat cache-write races, ontology changes without rereads, stale cached counts/edges/search,
URL-case and path-case semantics, property/image provenance, full/patch consistency, snapshot replay,
historical projection migration and Eager foreground edits.

The first aggregate attempt passed architecture/core and lint (zero errors, one existing deprecated
`activeLeaf` warning), then failed because the legacy status test double lacked the new URL-progress
method. After supplying that method, the monolithic fixture exposed the intentional new property-URL
origin edge and its implicit old Eager assumption. These failed attempts are retained; they are not
native acceptance or a reason to weaken the frozen oracle.

The next fixture attempt exposed a genuine public URL object identity mismatch. Node attempted to
format a huge cyclic graph difference, which looked like an indexing hang. The identity assertion
now uses an equivalent bounded boolean comparison. Production lookup retains canonical full-graph
objects; the original invariant and archived oracle remain intact. A proposed incidence copy into
the full graph was rejected during review because it could diverge from that graph's evidence.
The final coherent projection, both-mode progressive rendering/identity, stale-edge and deletion
progress subset passes 4/4. Queued-read unload and delayed-open stale-cache-write regressions pass.

Dependency migration review also found fresh-versus-upgraded occurrence-count differences. The
shared per-fact additive projection now preserves historical raw memberships and multiplicity.
Three real-IndexedDB migration checks pass, including exact mixed body/property key/count parity,
unchanged primary source caches, cancellation/resume and reopen without Markdown reads/parses.

Required full verification, exact-build small-vault mutation/reopen tests and reference URL reload
measurements remain pending here.

The first full coherent-projection verification then passed the 24 settings-independence scenarios
and restore-watchdog suite, but failed the unchanged P4 repeated ordinary-patch URL-origin assertion
(zero declarations instead of one). A previously completed independent URL scan retained negative
coverage after the ordinary semantic owner changed, masking its newly published origin evidence.
The per-file URL closure/refresh integration now invalidates stale owner authority before notifying
and schedules a repair using the already-acquired body. It never joins lower-priority repair while
holding foreground priority. A held-publication regression proves immediate fresh origin evidence,
shared-owner preservation, final-owner URL/origin/search retirement and no extra URL body reads.
The second aggregate passed P4/P5 and reached the dense Eager responsiveness fixture, then caught
unnecessary On-demand count-revision allocations in independent URL publication (16 instead of 0).
Its unchanged mode/timing guards remain in force. Both attempts stopped before build/deployment.

The third aggregate passed those mode guards but failed the unchanged dense URL patch timer bound:
61.4 ms against a 50 ms maximum. Independent URL alias preparation now uses cooperative private
slices and exact lifetime fences. The unchanged monolithic indexing fixture subsequently passes,
as does the focused dense/full-Eager/private-active and cancellation subset (3/3). This attempt
stopped before build/deployment; final aggregate verification remains required.

Independent review found parent-folder-only rename events bypassing the early TFile URL listener.
The existing known-file rename boundary now retires the old URL owner and repairs its new path,
reusing exact unchanged body/property observations without joining background publication.
The final dense/folder/identity/foreground subset passes 4/4: moved body and cached property links,
old durable-path retirement, zero extra URL reads, closed progress and warm cache reopen.
The final on-demand browser file contains 39 cases. Source freeze covers 276 verification inputs;
manifest SHA-256 `f59aaff88ed4fa54e974bd06a071438c669052c7e9f7261c8aab0e811fae1eb0`.

The fourth aggregate passes the monolithic fixture, then reports four Node fixture failures:
two host-preview cases implicitly assumed fully current Eager mode, and two status doubles omitted
URL progress. Their original assertions are retained; the fixtures now declare their intended mode
and provide the actual progress contract. An additional production-method status regression proves
ready local counts are independent of URL scanning, incomplete scans have distinct copy, and the
preparation label remains only for actual active local work. The relationship/status file passes 38/38.

The fifth aggregate passes architecture 7/core 69/Node 253/UI 17, then passes 326/327 portable
source cases. Its one failure is the intentionally added host URL availability annotation compared
with the portable gate-only result. The deliberately unscanned GraphIndex binder must now report
`complete:false, coverage:local`. The narrow URL-only oracle branch asserts exactly that annotation
on all four gates while preserving the exact portable `{hasAny, visibleCount}` shape and values;
ordinary gate equality and canonical relation/evidence/certificate checks are unchanged. The full
58-case portable neighborhood file passes after this explicit product-delta assertion.

The sixth aggregate passes the five non-browser lanes, then exposes implicit Eager startup fixture
assumptions and stale database-version expectations. Its URL-only 39-case lane passes, including
dense alias cancellation and folder moves. The diagnostic browser continuation also identifies a
production handover defect: source-ready Eager remained on the startup fallback. Eager now returns
to the existing finite durable source owner when its authenticated dependencies close, retires old
local overlays/tokens, and fences late baseline/center/count continuations. On demand stays local;
pending Eager startup or edits retain foreground fallback. No full-incidence allocation is added.

Genuine v5/v6/v8 upgrade fixtures explicitly exclude the new URL store, preserve exact existing
records, and require the additive v10 URL store to be empty. Unsupported-future fixtures use v11;
cleanup remains unable to create/upgrade storage. These are explicit schema changes authorized by
the URL-cache requirement, rather than relaxed preservation/authority assertions.

The diagnostic run was stopped with exit 143 after repeated known source-startup/CDP timeouts,
before build/deployment. Only its identified test process group was terminated; no Obsidian process
was included, and all owned group processes exited. Fixture/production corrections made during
diagnosis require a new source freeze and complete aggregate run; this attempt is not acceptance.

The independent schema-upgrade lanes now pass 107 Chromium cases: 82 contributor/dependency
cases plus 25 base-cache cases. Existing source records survive the additive URL-store upgrade;
future-version cleanup remains nondestructive. Focused actual-source Eager handover checks pass
4/4, but warm startup characterization then exposes separate read-certificate and pre-restore
local-publication races. These remain under correction; neither focused success nor the earlier
aggregate is final acceptance. The native reference driver additionally requires every rendered
gate label to be numerical after URL → ordinary note → URL navigation, and verifies inclusion of
all known body-referrer owners and root-child URL targets.

The bounded Eager arbitration waits outside foreground scheduler priority and begins after
independent URL-cache restoration. It releases at the finite targeted-preview/no-cache decision;
full evidence, node vocabulary and global source authority never retain that arbitration. Existing
current native/policy-scoped cached neighborhoods remain read-only. A local partial-Eager commit
rejects captured graph candidates through the existing publication fence while allowing neutral
source recovery to continue. Warm read-cover renewal never guesses an intervening source event.
The full 23-case foreground startup file passes with unchanged deadlines/assertions.

The subsequent source-startup file passes 42/48; its six remaining legacy URL-label repair cases
expose a retained local-partial flag after complete snapshot promotion. That flag now clears only
on genuine authenticated full restore/full rebuild, never on a source-ready node catalog. The
23-case final targeted rerun passes, including all six repairs, three bounded high-degree source
publications, mixed/nested/shared property payload reuse and actual Eager owner handover.
URL cache format 3 rejects draft flattened property values. URL-bearing properties retain their
whole original payload; unrelated fields remain omitted. Cache validation permits shared nested
values and rejects cycles without recursive traversal or spread-argument limits.

Final source freeze covers 276 verification inputs, manifest SHA-256
`790f5e6bc1809a388ecd38341cff77e6883598b5ce778313aa0e587782e520a0`.
The seventh required aggregate is running against this unchanged freeze. Architecture 7/core 69/
Node 253/UI 17/portable source 327 pass; Chromium/native/build results remain pending.

The seventh aggregate completes all browser files: 362/366 pass. Its only failures are three
remaining URL-title schema assertions (plus their parent) expecting DBv9 instead of the authorized
additive DBv10. Exact source/body preservation and title ordering assertions are unchanged; genuine
v5 setup has no URL store and upgraded v10 must contain an empty URL store. That whole file passes
19 inner cases plus parent (20/20). Build/native staging did not run after the failed aggregate.

Independent review additionally identifies the ordinary visible-neighbor count supplement still
being gated to On demand. Partial Eager now uses the same local-foreground guard; the existing
100-incoming-owner/no-extra-body-read regression runs in both modes. Genuine source-ready Eager
must continue to create no supplementary task/read. A new complete freeze/aggregate is required.
The large 20,015-owner case passes exact incidence/evidence/gates/degrees and zero cached-publication
body/source I/O. Its 255.7-second total includes source seeding; cached publication takes 121.3
seconds. This pathological single-center synthetic result is not production startup/URL latency.

The final Eager neighbor guard correction passes 3/3 focused cases with unchanged 100-owner count
and body-demand assertions. Source-ready Eager performs no supplemental count task/read.
The eighth source freeze covers the same 276 inputs, manifest SHA-256
`2c63cf0c1c8055a1259be1cc42d63ad49bb41025b0481f111b22fd9020e1f39b`.
Its required complete verification is running; native measurements remain pending.

The eighth aggregate completes at 21:17 UTC: all five non-browser lanes pass and Chromium
passes 366/367. The one failure is the unchanged exact-pair publication regression for an unrelated
native file modification: preparation returns false instead of preparing the unchanged selected
pair once. The same case passed the seventh run. This race is under investigation with the
original identity/policy/revision assertions retained. The large synthetic fixture passes again.
Verification exits 1; no build, staging or new-artifact native acceptance is claimed for this run.

The unchanged four-case fence file reproduces the failure (3/4). An instrumented isolated pass
shows the first attempt at maintenance/host/observation/selected-event revisions `0/0/0/0`, then
the native modification at `1/0/1/0`; the second attempt succeeds if those revisions stay fixed.
The modified note is a link target of the selected note. Its already-admitted asynchronous cached
fan-out can later dirty that selected owner's resolution and advance its event revision after the
retry captures its endpoint. A deterministic held-lookup regression and narrow source-owner
ordering correction are in progress; no global inventory/flush, extra attempt or relaxed fence is
authorized by this diagnosis.

The deterministic held real-dependency lookup fails on the earlier source and passes after draining
one finite snapshot of already-active cached native fan-out before exact endpoint capture. The
existing active-task registry is now iterable, retaining its existing put/finally-delete lifetime
and clearing on unload; it covers owners already removed from the pending repair queue. No later
task arrivals are chased, and unrelated semantic/URL/body tasks and global inventory are not joined.
The original two-attempt budget and all policy/physical/cache/source/publication fences remain.
The complete relationship browser file passes 44/44 in 55.604 seconds; actual TypeScript, scanner
and whitespace checks pass. Temporary diagnostic traces were removed.

Ninth source freeze: 276 verification inputs, manifest SHA-256
`1f5417e21d26020b61e5f834dd744198a0d9ff5b6ca5d0c366806cccc8671ae1`.
The required aggregate runs against this freeze; build/native results remain pending.

## Exact build and current native state

The ninth `verify:obsidian` completes successfully at 21:39 UTC: architecture 7, core 69,
Node 253, UI 17, portable source 327 and Chromium 368 all pass without failures/skips/cancellations.
The monolithic production fixture, actual installed Obsidian TypeScript, scanner (zero errors,
one existing `activeLeaf` warning), production build and exact-build native smoke also pass.
All 276 frozen verification inputs remain unchanged after completion. Exact `main.js` SHA-256:
`5044bdf7248ee821f31352a26fbdd82085f38320dbfe1908de674c7895061999`.
Manifest/CSS match their staged source hashes. The required aggregate report stays private at
`/private/tmp/kplex-url-final9-full-20261006/report.json`.

The disposable native URL fixture passes case/root identity, actual root center and numerical
gates `2/2/0/0`, genuine property-URL provenance, content edit, rename, deletion/shared hierarchy,
unused-target retirement and warm reopen. All 15 surviving Markdown owners restore from the URL
cache with zero URL body reads. Owned fixture files are removed and settings/enablement hashes
are unchanged. The first native attempt checked children before the current owner replacement
settled and failed; the rerun retains the hierarchy assertion but waits for actual closed owner
publication. It captures the intermediate children=1 with active/incomplete URL work, followed by
settled children=2. This is explicit synchronization with the required publication prerequisite,
not an assertion or production-code relaxation. The initial failed report is retained privately.

The fixture's final focus sample is false; it is functional evidence only, with no latency claim.
The Eager native foreground attempt refuses its focus prerequisite and exits failed, restoring
exact settings/enablement. Native window checks show every visible Obsidian window unfocused;
Electron `powerMonitor.getSystemIdleState(60)` reports `locked`. Application activation/focus did
not overcome the locked session, and desktop-control inspection timed out. The maintainer was
asked to unlock the desktop. Eager foreground, required backed-up small-vault SI5 cache/restart
recovery, exact-build production URL navigation/warm reuse/renderer reload and URL-cache size
remain pending. No new artifact has been deployed to the reference vault; its notes remain untouched.

## Reference comparison method

A read-only scan of matching Markdown notes, parsed using the checkpoint's existing visible-body
grammar, found 232 exact-root body-referrer owners and four distinct non-root URL targets. This is a
body-reference inclusion oracle, not full semantic parity: active path exclusions are applied and
additional property referrers are allowed. Private paths, source text and labels remain in temporary
local reports and are not included in the repository.

Native validation must establish rendered URL-center incidence, numerical gates, case/root identity,
no root self-edge, progressive discovery and warm reuse. Reference notes are strictly read-only;
only the authorized `main.js` replacement and reload are permitted. Hash preferences/enablement and
compare note path/mtime/size inventories before and after. Native drivers run serially with original
renderer throttling; distinguish API/DOM completion from paint, app cold launch and physical devices.
