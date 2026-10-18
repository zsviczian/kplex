# Native dragging, Find and creation destinations

Implementation branch: `2026-10-17-navigation-and-native-drag`, based on merged
#174 at `8f702d9c6dfcb70921a1bd5c15087af70e7f2156`.
Scope: #157 and the maintainer's navigation/creation enhancement batch; #175's
overlapping independent areas and requested combined-left alternative. This does
not implement a separate hide-Challengers mode. C14 remains accepted and
structural refactoring paused.

## Behavior and ownership

- Global Find includes the existing tag and folder vocabulary. `#` restricts
  results to tags; tag labels retain `#`, with the full hierarchy in the detail.
  Native Lucide icons identify result types and common attachment subtypes.
  Explicit tag centers expose their parent/child tags and member notes even when
  tags are hidden around ordinary notes. Other filters remain in force.
- Desktop node-body drags use the guarded native Obsidian link-drag boundary
  used by Bases. Files, URLs and placeholders carry native links; tags carry
  literal tag text. Captured node identity supports drops between Plex views.
  Folders and transient nodes have no outbound link gesture. Touch, pen and gate
  gestures retain the existing pointer interaction path.
- Six saved device/surface preferences place Friends and Challengers together
  on the left. Missing preferences preserve the split arrangement. Semantic
  roles, gates, ontology and filters are unchanged. The independent
  Challenger/Sibling seam no longer inherits negative parent compaction.
- One compact folder component serves new-note/placeholder creation and explicit
  Control-click (Command-click on macOS) materialization without moving the center. Obsidian's calculated destination is
  prefilled; normal name-first quick creation remains available. Placeholder
  references default to the filename alias. Existing-target duplicate/relink
  policy remains unchanged.

`GraphIndex` owns search and relation presentation; layout/profile owners own
placement. No compiler, source acquisition policy, schema, receipt or scheduler
is added. Folder suggestions take one native folder inventory when the dialog
opens, then filter it locally. Changing a pathful placeholder's destination is
an explicit mutation: approved native reference occurrences are retargeted by
the existing literal grammar and atomic `Vault.process` callbacks. This operation
is bounded to 256 source identities and the existing source decode byte budget.
Ambiguous/stale source proof fails closed. Accepted file/reference writes are
retained on a later failure, with a modal-local continuation rather than a second
creation. This is not a multi-file transaction.

## Initial checkpoint validation

This section records the initial delivered checkpoint. The subsequent maintainer-feedback
checkpoint below supersedes its gesture, build hashes and final-source references.

Runtime and tests are pinned to [ac22f45](https://github.com/zsviczian/kplex/commit/ac22f45600e6835fb22f849dcf3e82b86f5f8f88).
The final local `verify:obsidian` run starts and builds from a clean tree on
Node 22.22.2; its process exits zero. Later closeout changes are documentation only.

| Required lane | Result |
| --- | --- |
| Architecture / restricted core | 7/7 and 130/130 |
| Node contracts | 1,013/1,013 |
| Browser UI | 131/131 |
| Portable source / real-browser source | 334/334 and 598/598 |
| Obsidian lint / real-types production build | Pass |
| Exact-build native staging, command/render/error smoke | Pass |

Full verification reports no skips or cancellations; assertions are preserved.
The browser source lane includes its
20,015-record synthetic restart/publication case. Native acceptance uses Windows
11 10.0.26200, Obsidian 1.14.4 (installer 1.14.0), Electron 43.3.0 and native
Node 24.18.1. Only authorized disposable `kplex-test-small` is used: 107 original
files, including 88 Markdown notes. No personal vault is accessed.

Repository output and installed files match these final SHA-256 values:

| Artifact | SHA-256 |
| --- | --- |
| `main.js` | `86fa12f02946d1d0c085c73bbab3eab501d0224b7f23b8402ed17d2fe7aea0f8` |
| `styles.css` | `3dd15f02ccd96bd363731342b7fc8d056b8461ca7371b9ca3746d41471f3366f` |
| `manifest.json` | `19d9ecce5557733e0ff0f2e27155e635c30158c3cfa6fbca0f11c16e4dedfd2c` |

All five native lanes pass serially on that exact build:

- Find: eight guarded queries, six navigations, hierarchical/accented tags,
  hidden ordinary tag nodes, folders and native result-type icons.
- Folder creation: eight real-dialog workflows plus a genuine plugin reload.
  Covers name-first modifier-Enter, existing/root/new folders, duplicate basenames,
  placeholder aliases, failed storage, modifier double-click/Cancel and durable
  relocation. The mixed-reference case moves three space-target links while
  preserving three percent-literal links and every other source byte.
- Combined layout/drag: ten cases, including all six actual Settings controls,
  main/sidepanel/popout placement, dense independent areas and semantic drop
  previews; five Markdown drop types, cross-Plex navigation/composer, popout
  handlers, trusted gate geometry and trusted same-view body-drag delivery.
- Existing interactions: all 14 asserted cases pass, including sibling additions
  in four directions, Bases drops, held-build materialization and Properties
  focus/overlap/non-Markdown/popout behavior. One fixture observation is separate.
- Touch emulation: eight trusted gestures, saved-value reload and phone/pane
  geometry. Earlier acceptance also exercised the temporary-enablement branch.

Native handlers receive synthetic drops where stated by their receipts. Trusted
body dragging uses Chromium's intercepted native data with trusted start/drop and
no synthetic fallback; this does not prove an OS drag across windows/applications.
Every lane restores its owned fixtures, workspace and configuration bytes. A final
independent sanity check confirms 107/88 files, no test controllers/dialogs,
desktop mode, loaded candidate and restored CLI console capture. Visual inspection
of the actual compact composer confirms name focus and a closed folder menu;
that check submits no note or settings write. All eight locales remain covered.

## Indexing impact

Guarded Find queries, layout changes, native payload creation and folder
typing/cancellation record zero added Vault reads, parsing, source acquisition,
semantic builds and snapshot writes. Layout also retains semantic revision and
source counters. Search uses the existing vocabulary; folder browsing filters one
captured native folder inventory. Ordinary On-demand navigation and actual
creation/retargeting legitimately perform their existing source and note work and
are measured separately. This is operation-level evidence, not a claim of zero
UI CPU/allocation cost, a startup speedup or measured whole-vault resource savings.

## Safety and remaining limitations

Native cache probes and four failing-before regressions exposed a defect in the
new relocation path: wiki percentages were decoded like Markdown. The correction
preserves literal wiki spelling, decodes Markdown once and requires exact native
cache/token agreement. Literal wiki `%23` is not a heading. All 49 composer
tests pass; raw/twice-decoded cache mismatches fail closed. General index/parser
policy is unchanged. Percent-escape-looking wiki destinations are conservatively
refused by the new serializer. Unsupported wiki targets and uncertain YAML quoting
fail before creation; a destination apostrophe plus any apostrophe in affected
frontmatter can be refused even when that other apostrophe is unrelated.

The separate On-demand gate/filter lane **fails** its unchanged-semantic-revision
guard, with correct gate values. The existing cross-link toggle's legacy settings
save calls `refreshSemanticSettings()`, clears requested coverage and repatches
files despite unchanged source counters. Main contains that same source path;
this is a source comparison, not a native old-build trial. The assertion remains
intact and no unrelated correction is included. A focused future fix can route
cross-link-only saves through presentation while preserving mixed semantic saves.

An ordinary unmodified double-click can move a noncentral placeholder after its
first click, putting its second click over a gate. Baseline source has the same
hazard; that exact old-build native sequence is unproven. Ordinary materialization
is validated on a stationary center; the new modifier gesture is validated on a
noncentral node. Earlier browser-startup, drag-transport, folder/reload and cleanup
failures remain preserved with their successful controls and recovery receipts.

Remaining manual acceptance, in priority order:

1. Physical mouse drag between adjacent Plex/Markdown panes and across
   windows/applications: links arrive correctly and Cancel preserves relations.
2. macOS Command/Option, folder selection and native input/IME; minimum-host
   compatibility remains untested separately from the installed desktop host.
3. Physical phone/tablet picker focus, touch/scroll and separate layout profiles.
   Desktop emulation does not establish device acceptance.

## Preserved evidence

Private durable backup: `%LOCALAPPDATA%/KplexValidation/navigation-native-drag-177-20261018`.
It contains 403 verified files (74,104,069 bytes): complete owned raw
measurements, failures/recoveries, staged artifacts and a source/test archive pinned
to `ac22f45`. `sources/SOURCE_REFERENCES.json` and `sources/REPRODUCE.txt`
record source identities, fixture conditions and the established runnable lanes.
`MANIFEST.json` records every file's checksum. Its SHA-256 is
`4c3c98f4bba8b008021468a0823c7056763021c91b15ff61156a83d0f2b55c39`.
All copies and checksums were verified before closeout; Temp originals are retained.
Configuration backups remain private. No raw evidence is published or added to Git,
and the transient handoff is excluded from the source archive.

[Runtime CI](https://github.com/zsviczian/kplex/actions/runs/39081868817) and
[the draft PR's current checks](https://github.com/zsviczian/kplex/pull/177/checks)
provide the remote results; the PR description records final-head CI status.
No merge or release is authorized for this implementation branch.

## Maintainer-feedback checkpoint

The folder field now uses the same `FuzzySearchInput`/`FuzzySuggester` owner as
filename search. Both creation dialogs have a full-width, same-line Folder row,
the established 38px input, no folder icon/disclosure/help paragraph, and a
viewport-clamped suggestion list with a 560px preferred minimum width. Paths wrap
instead of being ellipsized. Leading root slashes do not prevent partial matching:
`/08` finds `08 About`. Editing preserves the entered destination and case-sensitive
native identity. Trusted pointer selection from the actual modal portal is covered.

The toolbar plus and **New K-Plex tab** command create an independent desktop/tablet
tab. Both reuse the existing surface policy: phones retain side-panel-only opening,
with the plus hidden and command unavailable. Curved
connectors remain configurable at **Settings → K-Plex → Visual styling → Link
styling → Link shape**. **Simplified layout** is the first entry in the Layout &
sizing group under **Settings → K-Plex → Plex behavior**; its six device/surface
choices remain independent. All eight locale catalogs include the new action.

Control-single-click (Command-single-click on macOS) opens the folder/materialization
dialog without moving the originating center. It replaces the requested modified
double-click gesture. Cancellation writes nothing. In-place materialization avoids
document-follow and global navigation broadcasts; a second Plex already centered
on the exact ghost follows its canonical identity into the real file locally.
Other Plex centers, history and unrelated document ownership remain unchanged.

Find already had a 24-result cap; that cap is retained. An unfocused field now skips
ranking. `GraphIndex` caches its merged search projection until actual vocabulary,
publication, maintenance or policy changes, and reuses exact/repeated prefix query
candidates. A regression with 1,000 partial search entries and eight typed/repeated
queries builds one 1,000-row projection instead of eight. This is an operation-count
improvement, not a measured native CPU/heap or startup improvement. Initial query
scoring remains linear and up to two merged read projections can remain retained.

The existing startup inventory also captures native folders, including empty ones,
and loaded tag metadata through `getAllTags`. It owns no second inventory or body
read. Availability can survive an unrelated source event during its cooperative
traversal; finite newer native file/folder events win over the older captured
inventory. Exact native identities still fence deletion, rename and replacement.
Durable restore validation retains its strict source-revision fence. Regressions
hold actual yielded preparation across those events and verify one inventory,
late file/tag discovery, and event preservation after an older publication.

Selecting an early tag builds a bounded cover from current metadata witnesses via
the existing structural fact producer and `NormalizedGraphCompiler`. This does
perform bounded compilation; it is not a zero-work tag shortcut. It does not read
note bodies, acquire/persist semantic sources, grant complete-source authority, or
change durable policy. Canonical complete counts outrank capped previews. Metadata
changes update shared ancestry and last-witness retirement; uncertain/oversized
metadata stays conservative. Preview admission retains the existing record/byte
budgets and configured visible limit (maximum 300); canonical publication supplies
the eventual full graph. The extra lexical lookups/retained tag memberships are
real startup/memory work, whose net native cost has not been benchmarked.

The intermittent host freeze reported by the maintainer was not reproduced. A
separate causal regression proves that a private Properties loader resolving
without converging could form an unbounded microtask retry chain. The existing
owner now allows at most three repair steps for an unchanged target/ownership
intent, latches failure, and retries for a genuinely newer intent. Native injected
refusal checks the three-attempt bound, responsive animation frames and subsequent
recovery, alongside overlap, pinning, unsupported-file and popout behavior. This
does not establish that Properties caused the original freeze.

No receipt, source scheduler, schema, relationship classifier or broad architectural
refactor is added. The separate gate/filter guard and physical-platform limitations
above remain open. Only disposable kplex-test-small is accessed. DaVinci Resolve
was rendering concurrently; long verification/native launcher runs used below-normal
process priority, while short focused checks/probes used default priority. All ran
serially without changing Resolve or unrelated applications. These conditions support
functional assertions, not controlled resource or latency comparisons.

The first combined follow-up verification exceeded the established 35-minute
aggregate portable deadline. Its child storage suite subsequently finished
598/598, but the wrapper/host report remains **failed** and is preserved as such.
Assertions and deadlines were not weakened; descendant work was allowed to drain
before the next serial verification attempt. Earlier follow-up attempts also
preserve two obsolete test expectations (removed help text and the old command
count), corrected to assert the intended UI and new public command.
The next run was intentionally cancelled in its owned headless validation process
tree before correcting the phone availability omission found in final review.
The command-policy regression fails before that correction; native touch-emulation
acceptance additionally checks the absent toolbar action and zero tab allocation.

The corrected candidate's below-normal aggregate attempt also reached the
35-minute wrapper deadline. All child assertions then finished: architecture 7/7,
restricted core 130/130, Node 1,029/1,029, UI 131/131, portable source 334/334 and
browser storage 598/598, with no skips/cancellations, plus Obsidian lint. That
wrapper report remains failed; production build and native lanes are run separately.
Final-head CI and the final standard-priority verification outcome are recorded in
the PR description, without treating these failed wrappers as passes.

The first final-build folder run failed its zero-work guard because the guarded
block also navigated back and opened the composer. The reusable driver now records
that setup separately and waits for genuine drain before observing folder typing,
selection and Cancel. On the successful control, setup adds two checked/repaired
sources and zero body reads/parses; all seven guarded operation categories remain
zero. This narrows the measurement to its stated interaction, preserves the zero
assertion and does not claim that opening/navigation is free. Both receipts and
the existing no-note/configuration-write checks are preserved.

### Final artifact and native acceptance

Runtime, regression tests and reusable drivers are pinned to
[`d86fea3`](https://github.com/zsviczian/kplex/commit/d86fea32cad34f92cbb14cfff9d9c8d6e882196d).
The subsequent closeout commit changes documentation only. Production build passes
on Node 22.22.2 against the installed Obsidian types. Installed/build SHA-256 values:

| Artifact | SHA-256 |
| --- | --- |
| `main.js` | `f10694fe6eb79bdb1349ffc1edb98bbbae8db4ab9d04acd417eb0f9dad1e7050` |
| `styles.css` | `b22bad683a71019b03f663bc4b48ad26e450b22e64a5aea4a2102ad475b2b056` |
| `manifest.json` | `19d9ecce5557733e0ff0f2e27155e635c30158c3cfa6fbca0f11c16e4dedfd2c` |

All six final-build native lanes pass serially on the same Windows/Obsidian host
and disposable fixture described above:

- Find: eight guarded queries, six navigations and both scenario groups.
- Folder creation: nine workflows and actual plugin reload, including trusted
  long-path selection and two-Plex in-place materialization.
- Layout: five cases, all six actual Settings controls, native plus/command and
  main/sidepanel/popout geometry, with unchanged semantic/source/storage counters.
- Existing interactions: fifteen assertions and one separately labelled fixture
  observation, including native Properties refusal/overlap and held-build creation.
- Native dragging: six cases covering Markdown/cross-Plex payloads, popout/gates
  and trusted intercepted renderer drag delivery; physical OS dragging stays open.
- Touch emulation: eight range gestures, phone command/toolbar policy, durable
  reload and seven pane geometries. Native dispatcher success means no exception,
  not command availability: the driver checks the actual availability callback and
  verifies zero tab allocation. Its initial dispatcher assumption and subsequent
  test-only helper-name error are retained as failed controls.

Every lane restores owned fixtures, workspace and configuration bytes. Independent
final sanity confirms 107 files/88 Markdown notes, matching artifacts, no controllers or
dialogs, desktop mode, and the opening disabled CLI console capture state. This
does not establish physical touch, macOS/minimum-host compatibility, OS drag or a
native large-vault startup/performance result. The reported intermittent freeze,
separate gate/filter guard and ordinary moving-placeholder double-click limitation
remain as described above. Established graph owners are used; no deferred indexing
experiment is reopened.

### Follow-up evidence and final-head checks

The new private durable backup is
`%LOCALAPPDATA%/KplexValidation/navigation-feedback-177-20261018-1792308483120`:
208 verified files (43,617,105 bytes). The source ZIP contains 524 files with verified
CRCs/per-entry checksums and excludes HANDOFF. Its source references, fixture
instructions, artifacts, successful/failed native trials and aggregate failures
are preserved. Every copied file is rehashed; root `MANIFEST.json` SHA-256:
`43205a56fd58dc859fa8a4d933d7cb7b46d611e30c63f855db2eab0cdf232975`.
The earlier 403-file backup and Temp originals remain untouched. No raw evidence
is published or added to Git.

The maintainer subsequently reports that the Resolve render has finished. The
post-push standard-priority full verification uses that changed condition, without
changing test deadlines or application processes. Its exact outcome, any additional
private receipt, and final-head CI are recorded in the
[draft PR description/checks](https://github.com/zsviczian/kplex/pull/177).
Keep the PR draft; no merge or release is authorized.


## Relationship composer follow-up

The maintainer requested clearer completion controls, a combined direction/ontology
row, an All filter and faster existing-note suggestions after reviewing `54fef0c`.
This follow-up keeps the native modal, current action/session owner, shared picker,
creation recovery and relationship writers.

Direction now shares the ontology row. All enumerates the existing six selectable
relationship-direction vocabularies through `allOntologyFields()`; hidden/exclusion
policy fields are not relationship choices. Choosing an existing field uses its
configured direction rather than moving it into the opening gate's category. A new,
unassigned field in All requires choosing a specific direction before saving.

After saving and the context-dependent Open for editing toggle sit together at the
bottom right. The dropdown shows Return or Edit note for the existing configured
policy, alongside Create another and Follow node. The persisted/invocation
`configured` intent remains compatible; no new setting or migration is introduced.
Explicit outcomes and the edit toggle reflect the same effective state.

`FuzzySuggester.getResults` is a lazy ranking capability: the shared control invokes
it only when its list can be displayed and memoizes it across unrelated parent
renders. Both global Find and the composer use it; callers no longer implement
separate focus-gating state. Existing static-result consumers remain compatible.
The note composer uses the existing physical-file catalog (`vault-files`), avoiding
graph visibility evaluation for note selection and permitting discovery during
startup. It retains the existing 48-hit candidate query / 18 displayed notes,
Markdown-only/self-target checks and exact native identity validation at save.
Prefix caching remains index-owned. Initial query scoring remains linear; this is
not a measured large-vault latency, CPU or memory improvement.

Focused verification passes 100 checks on Node 22.22.2, including actual Chromium
controls, all eight locales, effective completion defaults, All-field direction,
saved-pending/partial recovery and a shared lazy-provider operation guard. An
initial sandbox run could not resolve its temporary browser entry. The first full
attempt then exposed the old title-bar source assertion and nested PATH selecting
Node 22.22.3. The assertion now checks the moved localized choices; the private
launcher pins nested Node to 22.22.2. All unsuccessful logs remain private.

Full `verify:obsidian` passes on Node 22.22.2: architecture 7, core 130,
Obsidian lint, Node 1,032, UI 131, portable source 334 and real browser storage
598, with zero failures/skips/cancellations, plus production build and native smoke.
The serial native follow-up on Windows 11 / Obsidian 1.14.4 (installer 1.14.0)
uses only kplex-test-small and passes:

- Folder/composer: ten workflows and actual plugin reload. The new case verifies
  native direction/footer controls, All vocabulary and unchanged ontology, one
  48-hit physical query, no alias-only rerank, and zero guarded body reads, parsing,
  acquisition, builds, semantic refreshes, note/folder writes or snapshot writes.
- Full action workflows: eight scenarios, 51 trusted native key events, six
  direction-specific saved relationships, center/selected-origin isolation,
  saved Return, folder capabilities and enabled Excalidraw transitions.
- Find: eight guarded queries/six navigations and both scenario groups.
- Visual review: actual native new/existing-note modal captures, 680px wide,
  seven direction choices, effective Return and no horizontal overflow. The
  existing-note form omits creation-only controls. This is desktop inspection,
  not physical-device or subjective paint-latency acceptance.

The new native case initially referenced a fixture absent from the folder-only
lane, then failed to dismiss suggestions before closing. Both failed trials and
successful cleanup are retained; the corrected driver follows suggestion-first
Escape. A broader action trial exposed its pre-existing property-existence wait:
an already-populated child property could be inspected before a newly saved target
arrived. The reusable check now asserts the owned saved file and waits for the exact
target with the same deadline. The successful control records two saved-file/cache
arrival gaps, then correct metadata publication. No production writer change was
needed, and no timeout/storage assertion was relaxed.

Successful raw receipts (private Temp prefix `kplex-composer-feedback-`):
`verify-1792312440827`, `folders-1792313724282`, `actions-1792313842792`,
`find-1792313880908`, `preview-1792313914841`,
`final-sanity-1792313974005.json`. Every native lane restores its owned resources
and configuration; final sanity confirms original 107 files/88 Markdown, no test
controllers/dialogs, desktop mode and disabled opening diagnostic capture.

Exact tested/staged artifact SHA-256:

| Artifact | SHA-256 |
| --- | --- |
| main.js | `bed178e785babad2d2070097fbd291fd1a85cfe78d6add0be5e626b1838d4555` |
| styles.css | `c98c8c4be660ac38e5d77144f111637d0e60450339c882b4bd51e5a7fb5e2828` |
| manifest.json | `19d9ecce5557733e0ff0f2e27155e635c30158c3cfa6fbca0f11c16e4dedfd2c` |

The full run covers the unchanged production runtime; subsequent driver-only
corrections are covered by their successful native runs. Final committed source,
CI and verified private backup references are recorded in the draft PR. Original
receipts remain private and retained. Earlier platform/gate/freeze limitations
remain; no personal vault, merge, release or performance-win claim.
