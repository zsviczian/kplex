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

## Saved targets, structural drops and gate hints

Follow-up to `577b73c2ed6a79add9d3899362575cfbc583d4fb`, on the same draft
PR #177 branch. History, pins and their native picker reuse Find's type icons;
saved tags retain their complete hierarchy independently of graph label shortening.
Markdown gate drops onto saved tags use the existing metadata-write observer and
native YAML-list mutation. Unlink removes only exact YAML membership. Inline tags
remain source-owned and open the existing evidence dialog; no inline text is
rewritten. Folder membership offers inspection only, and neither structural edge
offers an unrepresentable Hidden declaration.

Physical note/attachment/folder gate drops onto folders use one native confirmation
and FileManager move. Captured incarnation/path checks reject stale targets,
collisions, root moves and recursive destinations. Cancel submits nothing. The
existing empty-space child-gate creation gesture remains available for folders.
Gate hints share the existing document tooltip owner and now require Alt/Option by
default, with a durable opt-out under Plex behavior. Accessible gate names remain.
All eight locales are maintained. No parser/compiler, schema, scheduler or broad
source-acquisition change belongs to this checkpoint.

Native Windows/Obsidian 1.14.4 acceptance, using only Small (107 files/88 Markdown):

- Six structural cases pass: saved labels/icons; history/pin YAML assignments;
  YAML-only, mixed and inline-only Unlink plus folder action policy; Cancel;
  confirmed Markdown/attachment/folder moves; preserved child creation.
- Cancel records zero reads, acquisitions, builds, metadata writes or moves.
  The deliberate tag/move mutations produce normal local source work (26 observed
  reads, 28 acquisitions, four metadata writes, three moves); no forced build.
  These are functional operation counts, not comparative performance measurements.
- Eight directly affected tooltip cases pass across main window, popout and
  return: actual Settings opt-out/re-enable persistence, unmodified suppression,
  stationary modifier activation/release, retained accessible names and retired
  source-window ownership. The corrected broad tooltip lane passes all 24 control/menu/color-editor and
  window-migration cases. Its prior 15-case failure at the old background-modal
  selector remains preserved as a driver failure, not a product acceptance result.
- Exact configuration bytes, original inventory and owned-resource cleanup pass.

Private original receipts use `%TEMP%/kplex-structural-drops-`: structural
`1792318577497`, tooltip nodes `1792318758983`, broad tooltip `1792320464560`
(previous failure `1792318707216`), full verify `1792319239307`,
focused tests `kplex-structural-extended-focused.txt`, indexing fixture
`kplex-structural-index-final.txt`. Earlier failed setup/driver controls are
retained, including hidden native window, icon alias and modal dismissal issues.
The corrected driver follows the existing native backdrop dismissal path and
waits for Settings subpage replacement before trusted toggle input.

Exact functional candidate: main SHA-256
`a2a4fdbba4fa86357e625a80db071ce48fd19fbdd045505199aec35eee7ffc94`;
CSS `37f691d4ffafe822577ddf136868af0f721746fdc6e9372ec9bbe2f5fed5432d`;
manifest `19d9ecce5557733e0ff0f2e27155e635c30158c3cfa6fbca0f11c16e4dedfd2c`.
Full `verify:obsidian` passes on Node 22.22.2: architecture7/core130, lint,
Node1048/UI132/source334/browser598, the actual production build and native smoke.
Only native-driver corrections follow that full run; runtime/build hashes match.

Separate newly reported investigations remain open: the native node-style Save
freeze after choosing `--h1-color`, and a restart showing only the saved-preview
center until navigation. The supplied diagnostics describe a non-authoritative
preview during source validation and an ontology change; they do not establish a
color-induced semantic invalidation. No personal-vault access or comparative
performance run is authorized by that attachment. Per-style border width/gate
size and confirmed fixes belong to the next independent checkpoint.

## Color chooser previews and node-style dimensions

The shared source editor now uses one native searchable chooser for theme variables
and named colors, with the existing Light/Dark swatches. It retains the curated
Obsidian choices and the current custom variable; **Custom variable** still permits
explicit entry. It does not discover every CSS property or scan vault data. Native
rows and sampler registrations are capped at 40 per query and retired on close;
source references and exact saved alpha are preserved. Unavailable previews show
the existing question mark. No RGB preview becomes a saved fallback.

The existing node-style editor exposes border width and gate radius using the
supported style records and renderer. Blank restores inheritance, zero border
width remains explicit, unchanged imported values stay exact, and concurrent
unrelated fields survive the queued save. These non-color style changes retain
the existing layout policy; they are not classified as paint-only. No production
index, source-validation, storage-schema or scheduling code changes in this
checkpoint. All eight locales and the appearance guide are maintained.

Focused regressions cover custom-scope preview alpha, duplicate named identities,
bounded repeated queries, native close-before-choice ordering, cancelled callbacks,
theme A → B → A fencing, dimension inheritance, legacy values, concurrency, restart
and rejected storage. Four additional real-IndexedDB startup cases retain the same
center demand across preview restore, with/without an ontology change and demand
registered before/after restore. A current changed Parent appears before held
global source authority, without granting write authority or requiring navigation.

The supplied restart report shows a non-authoritative saved preview while source
inventory is active and records a semantic policy change. It does not prove that
the border-color save caused semantic work or identify the intermittent freeze.
Earlier one-Plex native Save probes passed with File properties closed and open;
the first negative control had no usable `--h1-color` in Small’s installed theme.
Positive controls supply a temporary test-owned heading token when missing.
These results do not establish a fix for either reported symptom. The reusable
native style lane now includes the same actual Settings route and a stationary
Parent check after plugin reload. The maintainer subsequently reproduced the
stationary-startup symptom again on the current build; it remains open. A bounded
center recheck with diagnostic receipts is the next separately authorized checkpoint.

Final validation on Node22.22.2: full `verify:obsidian` PASS, architecture7/core130,
Obsidian lint, Node1048/UI135/source334/browser602, actual build and native smoke.
The native color/theme lifecycle lane passes28 cases, including actual custom
variable entry and both swatches, reference preservation, Cancel, inheritance,
palette replacement, Compass and durable theme operations. The native style
fault/concurrency/popout/reload matrix passes15 cases. Two additional single-Plex
variants pass with Properties closed/open: actual `--h1-color` selection, rendered
3px border and8.4px gate, persisted width3/radius8, and a stationary Parent after
plugin reload. Each Save records1 write/1 presentation/0 semantic refreshes/0
source acquisitions after fixture startup drains. These are positive functional
controls, not proof that the intermittent freeze/startup defect is fixed.

Private receipts retain full verify1792321482318; colors1792322740105;
styles1792322777292; focused Save/restart1792322856204 and1792322867808; and sanity
1792322883091 under `%TEMP%/kplex-structural-drops-`. Failed controls are retained:
the missing harness-module inventory, the color driver's fixed-source assumption
(colors1792322708939), and fixture acquisition crossing the first Save measurement
(styles1792322791645). The corrected fixture guard waits for genuine local drain;
no runtime workaround was made for those driver failures. Original107 files/88
Markdown, exact configuration bytes, controller/modal cleanup and opening disabled
CLI capture are restored. No comparative performance tests or personal-vault access.

Exact tested artifacts: main SHA-256
`32704b03fb222562073caccf1722c713dbc266403ad5d3cd694e586426619d7a`;
CSS `9664241e9e87f357ebfa57fcfe5477a5b8f592db4e4bbbb53f65db680dd6a7c0`;
manifest `19d9ecce5557733e0ff0f2e27155e635c30158c3cfa6fbca0f11c16e4dedfd2c`.
Build provenance is parent `a9e5a86.dirty`; runtime source is unchanged after full
verification. The verified private backup/source manifest is recorded in PR177;
originals and prior backups are retained, and no raw archive is published.

## Stationary-center subscription race and bounded recovery

Follow-up to appearance checkpoint `5fe9c802cd19f219e3731fadd8e057d5678300ac`.
The maintainer still observed partial central children after restart and authorized
a delayed recovery check. A focused real-React reproduction confirms one cause:
a child demand/layout publication can occur after the parent's first render but
before its subscription effect attaches. Both semantic and presentation variants
leave 2 rendered children when the backing index has 7. The existing App owner now
subscribes and immediately refreshes, preserving identity/materialization handling.
Both reproductions then show 7 without navigation, source work or the watchdog.
This establishes a real race, not every cause of the maintainer's intermittent case.

The separate safeguard checks one newly mounted visible stationary Markdown
center after three seconds, without restarting that timer on indexing progress.
It compares the rendered pre-lens neighborhood against the current index and
existing coverage proofs. Current canonical coverage requires no acquisition;
otherwise existing host preview/local foreground/requested-scope owners perform
bounded repair. At most one source-ready follow-up is admitted after an incomplete
initial check. There is no polling loop, new scheduler, full-build request,
source-validation relaxation, note write or watchdog snapshot rewrite.
Navigation, hidden/closed surfaces and captured file/source/policy lifetimes
cancel or fence stale completion. Already accepted underlying work retains its
existing demand owner.

The existing persisted 20-entry diagnostic history protects its latest two
non-healthy center entries. Both Copy index diagnostics and Report bug export the
same sanitized fixed flags, coverage labels, role counts and inclusive duration.
No center identity, content or error payload is retained. The
[diagnostic guide](../INDEXING_DIAGNOSTICS.md#initial-center-recovery) documents
the fields, interpretation and collection steps. This is diagnostic metadata,
not the rejected persistent source-validation receipt experiment.

Focused checks pass 42 cases: actual React subscription races, finite timer and
cancellation behavior, both sanitized exports, existing eager startup cases and
real IndexedDB recovery. The canonical stale-view case emits one presentation
with zero new source acquisitions, Markdown reads, semantic revisions or snapshot
writes. A held-source case refreshes late host Parent metadata without navigation
or a full build, grants no pair-write authority, and converges after source
release. Navigation, same-stat source revision and physical file replacement
reject stale continuations. A durable cache reread retains the diagnostic after
40 subsequent background decisions. Tests distinguish local repair from complete
canonical coverage.

Limits: count vectors cannot detect every same-count relationship substitution;
missing host metadata still depends on its existing source owner. Accepted repair
work can await that owner; an outstanding `checking` entry is not an idle claim.
The watchdog is finite and cannot guarantee recovery from arbitrary future source
failures. The reported Save freeze remains unreproduced. No comparative resource
or startup-performance claim is made while HandBrake runs. Final full/native
results are recorded below; macOS and physical-device acceptance
remain separate.

Final runtime verification passes on Node22.22.2: architecture7/core130, Obsidian
lint, Node1049/UI140/source334/browser607, real production build and native smoke.
Private full receipt: `kplex-structural-drops-verify-1792324807460`. The first full
attempt1792324552238 failed two test-only callback-extractor assumptions; the
extractor now reads the named production callback, and all42 native-follow/
materialization assertions still pass unchanged. Final driver/architecture checks
pass27 cases after native-driver refinements.

Exact-build Windows11/Obsidian1.14.4 acceptance passes the full native style
matrix15 (1792326297211), held-source live updates (1792326304258) and native
support/clipboard/main-popout exports24 (1792326309024). Focused actual Settings
Save/plugin-reload/watchdog lanes pass4 cases each with Properties closed
(1792326331855) and open (1792326286964, also1792326259257). Both variants use the
real three-second timer. A temporary presentation-only reader wrapper supplies
an incomplete new-tab frame, is restored without notification, and the timer
repaints the stationary Parent from0 to1 without navigation during recovery.
The receipt explicitly reports local coverage/source-not-ready where appropriate.
The style Save interval still records1 write/1 presentation/0 semantic refreshes/
0 source acquisitions; these counts exclude startup, fixture setup and reload.

Failures remain evidence, not acceptance:1792326023637 assumed a new tab would
start on the fixture rather than the native active document; setup now explicitly
selects the fixture before recovery begins. Two Properties-open attempts
(1792326132804 and1792326213319) passed Save but timed out waiting for fixture
Parent reconciliation before plugin reload. Closing Settings did not explain
the second failure. Later repeated runs pass without a runtime change; the cause
remains unresolved. The native driver now captures bounded synthetic-fixture
metadata, current role counts, demand, visible centers and diagnostic entries on
failure. This does not establish a fix for that intermittent variant or the
reported freeze. Full Obsidian-process restart and the maintainer's affected-vault
workflow remain manual acceptance; plugin reload is a narrower positive control.

Sanity1792326341858 verifies original107 files/88Markdown, exact artifacts,
configuration restoration, no dialogs/controllers, desktop mode and opening CLI
capture restored to false. Native Electron43.3.0/Chrome150.0.7871.212/Node24.18.1.
Main SHA-256 `bb5126d3d4a0aa17b0365740b73a2ef7009b7f460047cc7e4b27fd568bd0ee23`;
CSS and manifest match the preceding checkpoint. Build provenance is
`5fe9c80.dirty`; production runtime source is unchanged after full verification.
All trials use Small only; no personal-vault access or comparative performance
testing. Original private evidence and failures are retained; no raw publication.

Delivered runtime checkpoint: `173c0c9080c8c0646699e950e4fa6ca3e68453ef`.
Verified private backup outside Temp:
`%LOCALAPPDATA%/KplexValidation/structural-drops-177-20261018-1792326449722`;
273 files/18,098,913 bytes, source ZIP537 entries with CRCs and per-file SHA-256
verified, HANDOFF excluded. MANIFEST SHA-256
`d8046052040695c2147e09edb667870ab5bf063edaa1e4f2f03698ae386f788a`.
The source archive pins the runtime/test checkpoint; subsequent documentation
records its verified backup. Originals and all prior backups remain private.

## Tag assignment, structural moves and independent center modes

This follow-up starts at `8f65dd5181d3cb0ef7bc90cb6a47336fdf008d10` on the
same draft PR. The additional scope is the maintainer's tag/Note Type and
central-folder gestures, adjacent new-tab default, independent center modes,
and shared style sliders. All eight locales are maintained.

Tag membership remains the existing `tag-tree` relationship. A native assignment
form chooses ordinary YAML `tags` membership or that membership plus the single
configured Note Type property. A different incoming type requires explicit
keep/replace; replacement preserves the old type as an ordinary tag. Conversion
and Unlink reuse the same per-file queue, fresh native frontmatter callback and
saved-metadata observer. Normalized duplicate keys, unsupported values, stale
drafts, replaced/renamed files and changed selector policy cannot overwrite
unreviewed metadata. No body-tag editor, ontology role, source fact, index schema
or second settings writer is added.

Note Type tag links inherit ordinary tag styling with twice its actual rendered
width (including the 1.2px renderer fallback). The optional override lives in the
existing theme-owned `hierarchyLinkStyles` map at `k-plex:note-type-tag`; it is
excluded from ontology-field discovery. Existing theme copying, palette usage,
color reset, stale-editor and queued appearance ownership apply. Only prepared
page facets choose the style; lens styling keeps its established final precedence.
The frozen compatibility oracle is unchanged: exactly two expected scene-edge
width deltas are asserted explicitly; graph facts, evidence and search remain exact.

The existing node/link editors share native Obsidian sliders for font/label size,
border/line width and gate radius, with visible values and a native inheritance
reset action. Unchanged out-of-range/fractional legacy values remain intact;
explicit edits are bounded. The relationship manager explains its existing
All relationship fields/search workflow. No new picker or style-manager fork.

Central tag gates accept Markdown scene/history/pin endpoints. Parent-area drops
accept a captured tag from another Plex, a known native single-tag link payload,
or exact single-tag text; resolved file headings, arbitrary prose and ambiguous
native drags remain distinct. Center drops retain navigation. Central folder/file
pairs reverse the existing physical move plan, including attachments. Confirmation
and Alt/Option use the same final incarnation/collision/ancestry checks and native
FileManager rename. The modifier bypasses consent UI only; placeholders/tags/URLs
remain invalid physical files. No forced graph rebuild is added by these actions;
real metadata edits/moves legitimately invoke existing local indexing.

New K-Plex tabs use the public split-leaf operation. Center representation and
Markdown mode are native-leaf workspace state, initialized from existing defaults,
not a shared plugin setting. React remount/window migration retains the leaf's
owner; workspace serialization contains only the two representation scalars.
The per-view settings projection preserves inherited device/profile fields and
retains paint/layout identity boundaries. Other Plexes and plugin defaults stay
independent.

### Latest startup report and bounded correction

The supplied macOS diagnostic (2026-10-18 13:45:42 UTC, build `8f65dd5181d3.dirty`)
records an initial check at about 5.6 seconds, `missing` coverage, zero role counts,
and a `pending` result about one second later. The local baseline milestone occurs
at about 36.9 seconds; global source readiness is still absent. These observations
do not establish why that user's original scope was incomplete, but expose a
confirmed missing local-readiness wakeup in the previous finite watchdog.

The watchdog now observes the existing local-baseline milestone separately from
global source readiness: initial, at most one `local-ready` follow-up, and at most
one global `source-ready` follow-up. It does not poll, reset its delay on progress,
weaken source/write proof or schedule a full build. The existing bounded diagnostics
preserve the distinct trigger and actual source-readiness flags.

A real GraphIndex/IndexedDB fixture holds the replacement structural baseline and
global source reconciliation, admits the watchdog onto the original center owner,
then retires that owner through normal restore admission. Oversized paint-preview
metadata leaves the Parent absent. The initial check records pending; completion
of the actual replacement local baseline admits the finite follow-up, and the
stationary Parent is present while global inventory is still held. The prior
committed watchdog fails this same fixture waiting for local readiness notification;
the candidate passes. This is a functional causal control, not a performance trial
or a full reproduction of every macOS/affected-vault startup condition.

### Validation and retained failures

Final full/native receipts are recorded after serial acceptance. Interim checks:
78 focused structural/drag/locale/browser cases pass; 119 view/mode/action/diagnostic
cases pass; 35 final slider/localization cases and Obsidian lint pass. Required
Node is 22.22.2. Real builds pass; no comparative performance work or personal-vault
access. Existing Windows/Obsidian 1.14.4 lanes use Small's original 107-file,
88-Markdown inventory and restore owned state.

Failed attempts remain private evidence. Early full runs exposed callback-extractor
missing dependencies and the two intentional scene-style deltas; no semantic
assertions were relaxed. Native conversion exposed an undocumented Modal.selection
collision: the host overwrites it with focus restoration data. The draft now uses
its own selectedType field. A Settings-control probe established that the editor
belongs to the Settings document, which may differ from the Plex's document.
A later per-view prototype-spread defect emptied the native React view; that
attempt was stopped, its readiness waiter released solely for cancellation/cleanup,
and configuration plus the original inventory restored. The implementation now
preserves inherited settings, with a regression for that boundary; native fixture
readiness also has a bounded deadline. Neither aborted nor failed trials count as
acceptance. Prior unresolved Properties-open Parent timeouts and the unreproduced
Save freeze remain recorded above.

The maintainer subsequently reported a freeze when closing Settings after changing
gate radius, with a normal central node and a Markdown Sidecar. No freeze fix is
claimed. Trial1792334285798 passes eight native cases: four ordinary radius
changes/close operations, then trusted slider and actual Settings-window close
clicks in Markdown editing/reading modes, each after selecting Default theme,
with storage either completed or held until after close. Copy-on-write, durable
completion, graph and managed Sidecar ownership remain intact. Guarded edits
request no semantic refresh or source acquisition. The earlier successful
1792334236848 repeats the trusted matrix on an editable theme. Configuration
and workspace are restored. Initial probes used an incorrect graph CSS selector
and assumed Escape closed this host's standalone Settings window; those failed
probes are retained, and only the actual title-bar-click runs count as acceptance.
The reported intermittent freeze remains an open limitation, alongside the
earlier style-Save freeze and Properties-open fixture failures.

A separate real-Chromium regression confirms a narrower lifetime defect: hold an
accepted native scalar save, detach its Settings row without calling the host's
optional cleanup callback, then release storage. The previous completion writes
to the retired slider, and a later detached input can submit another save. The
callback now requires its captured generation, connected row, original document
and live owning window before handling input or refreshing the native control.
The accepted disk operation still completes and persists the requested radius.
The regression fails before this guard and passes after it; all13 appearance UI
cases, including actual iframe-document adoption/concurrent saves, pass. This is
a confirmed retired-control correction, not evidence that the maintainer's
full-application freeze has been reproduced or eliminated. Final native receipts
below identify the rebuilt artifact containing this guard.

### Verified feature checkpoint and open native failures

Full `verify:obsidian`1792334769085 passes on Node22.22.2: architecture7,
core130, Obsidian lint, Node1058, UI142, portable source334, browser/IndexedDB608,
production build and native smoke. Runtime logic is unchanged since that run
started; an extra EOF blank line was removed before commit. The final native
driver additionally captures bounded index activity on
its synthetic-fixture failures; it does not install production diagnostics.

| Exact-build native lane | Receipt | Result |
| --- | --- | --- |
| Structural actions |1792336059640 |12 passed |
| Adjacent groups / independent modes / scoped layout |1792336113646 |6 passed |
| Style operations, faults and concurrency |1792336147532 |15 passed |
| Outbound/native dragging |1792336154825 |6 passed |
| Settings gate radius + Markdown Sidecar |1792336187780 |8 passed, including trusted window close and held storage |
| Custom style / restart, Properties closed |1792336195363 |4 passed |
| Custom style / restart, Properties open |1792336205664 |4 passed |
| Custom style / restart, Sidecar open |1792336216068 |Failed:3 checks passed, then the separate synthetic recovery fixture did not reach genuine idle within its prerequisite deadline |
| Custom style, Sidecar + Properties open |1792336295440 |Failed:Save/Settings close passed, but the fixture Parent did not reconcile before reload |

Both failed variants restore configuration and workspace and keep their full
private evidence. They are not passes or discarded setup exclusions. The last
failure observes a genuine missing Parent despite current fixture frontmatter
and native resolved-link targets, with `upToDate:true`, phase `ready`, label
`Local graph ready`, zero on-demand tasks, no active semantic preparation and
`sourceReady:false`. This remains a focused follow-up; the feature checkpoint
does not claim the stationary-graph/startup problem solved. Neither failed run
reproduces an unresponsive application or a failed style Save. Each isolated Save
records1 write/1 presentation/0 semantic refreshes/0 acquisitions after setup.

Layout-only guards record zero reads/acquisitions/parses/snapshot writes/builds
and semantic refreshes. Intentional structural edits/moves record58 reads,
27 acquisitions,13 metadata writes and5 native moves, with zero forced full builds;
these are functional counts, not comparative CPU/storage/latency evidence.
No comparative performance tests or personal-vault access occurred.

Sanity1792336350349 verifies original107 files/88Markdown, exact artifacts,
no controllers/dialogs, desktop mode and opening CLI capture false. Main SHA-256
`0ea42b2b1a627b5d61a3f0fb19ebc6e66a5f5fb4c1644287779e169c397eda07`;
CSS `9664241e9e87f357ebfa57fcfe5477a5b8f592db4e4bbbb53f65db680dd6a7c0`;
manifest `19d9ecce5557733e0ff0f2e27155e635c30158c3cfa6fbca0f11c16e4dedfd2c`.
Build provenance is8f65dd5.dirty. Windows11/Obsidian1.14.4 installer1.14.0,
Electron43.3.0/Chrome150.0.7871.212/native Node24.18.1. macOS, minimum host,
physical mobile/touch/IME, OS drag, actual Bases tag-cell gesture and affected
full-process restart remain unverified. Keep PR draft; no merge/release.

Feature runtime/test checkpoint: `1941b48c13a9eea2ff2dc4b6f156b55bfbd8f54d`.
Verified private backup outside Temp:
`%LOCALAPPDATA%/KplexValidation/structural-drops-177-20261018-1792336531810`;
583 files/36,151,035 bytes, source ZIP541 entries with CRCs and per-file SHA-256
verified, HANDOFF excluded. MANIFEST SHA-256
`ba61eb5d95513393ae661ee6ca351023bd5dfdacd5e86e6421ff623ba38f7937`.
Originals and previous backups remain; no raw publication. CI for1941b48 is
in progress when this checkpoint is recorded, not claimed green. The missing
Parent/Sidecar drain failures remain separate open investigation work.

## Follow-up: superseded local host publication

The private forwarding trace1792336984693 reproduces the actual missing-Parent
failure. The first complete local host build is admitted at source5/host98,
demand1/baseline2. Its gate revision advances from0 to1 while source, host,
demand and baseline remain unchanged; its finality guard correctly refuses that
private result. No replacement local host scope is installed. The subsequent
ordinary patch sees the exact native Markdown file and readable center, but
conservatively returns `needs-rebuild` while its late-created target has no
canonical baseline. The current demand task then drains with no Parent. A later
count-only host build does contain the Parent; count proof alone does not publish
the missing visible incidence. No app freeze occurs in this trace.

Candidate forwarding trace1792338821140 attributes the native epoch change to
the existing `publishUrlSearch` owner: source6/host98/demand1/baseline1 remain
unchanged while gate0 advances to1. Its URL publication is valid; the lost
replacement host cover is the defect.
A controlled real GraphIndex/IndexedDB regression exercises that actual publisher
between admission and completion of the host cover, with real late-created
endpoints and the real ordinary patch fallback. Previous code fails with zero
Parents. The candidate retries only the superseded private host preparation within
the existing demand owner; it then exposes the Parent and drains. Two attempts
have zero Markdown reads/parses at their admission boundaries. The later ordinary
patch retains its conservative fallback and does not gain invented write proof.
Find remains available during the hold; no global inventory or full build starts.
A separate regression retires demand during the same hold and confirms one
attempt, no stale publication and no body reads.

This is preparation retry after an actual captured-input change, not a timed
watchdog/polling loop or a new scheduler. Unchanged missing/budget-limited host
results still report unavailable and stop. Source, host, gate, policy, demand,
file-incarnation and lifetime fences remain. Each attempt retains its existing
record/byte/cooperative budgets; total retry work depends on actual input churn.
This is a correctness correction, not a measured performance improvement.

Full1792337424909 passes architecture7/core130/lint/Node1058/UI142/source334/
browser612, build and native smoke for the host-cover correction. The functional
old-source control1792338661957 restores exact dd4ef63 GraphIndex source and
fails both new Parent cases while both demand-cancellation controls pass, then
restores the candidate bytes. Candidate main SHA-256 is
`da2f29401fab3066575ffc46373a9cee9e70079f1f69e7d100401f3a5fe560b3` (superseded by the later
startup-backlog candidate; use the final artifact receipt below).

Exact-build reference controls1792338690975 (Sidecar + Properties) and
1792338713165 (Sidecar) now pass Save/close, stationary Parent/plugin restart
and timer-receipt checks. Both still fail the later synthetic recovery fixture's
genuine-idle prerequisite, so neither complete lane is counted as passed.
Properties-only1792338735926 and closed1792338745890 pass all4 checks.
All configuration/workspace cleanup passes. The original failures remain intact.

### Follow-up: restore classification after an already-completed local baseline

Private trace1792339143489 observes the remaining failed idle prerequisite:
Parent present, native UI responsive, no active source/semantic/local/gate/search
work and no rebuild/timer, but dirty state contains only `startup:no-snapshot`.
The visible local baseline can finish while native Markdown Sidecar restoration
awaits. Later snapshot classification adds a real backlog, but startup joins an
already-resolved initialization task and previously scheduled no reconciliation.

The startup completion now joins that same initialization owner and queues any
remaining visible, complete, live backlog through the existing rebuild scheduler.
It does not declare stale work clean, clear newer source paths/reasons, run a
second initialization owner or force a full semantic build. Closed/incomplete/
unloaded/clean cases remain deferred or unchanged. Regression coverage exercises
those gates and preservation of newer Markdown edits. No claim that every
startup/drain/freeze cause is fixed; the reported whole-application freeze remains
unreproduced.

### Combined candidate acceptance

Full `verify:obsidian`1792339241307 passes on Node22.22.2: architecture7,
core130, Obsidian lint, Node1058, UI142, source334, browser/IndexedDB612,
production build and native smoke. All four changed runtime/test file hashes
match the run; no private causal instrumentation appears in source or bundle.
Build provenance is dd4ef63.dirty. Main SHA-256
`b5d453d57bb1b21963a32f161591efb4a951a88dc1093dddf3860c6d8b28c1ef`;
CSS/manifest remain the hashes recorded above. Windows/host versions are unchanged.

| Exact-build native lane | Receipt | Result |
| --- | --- | --- |
| Custom style / restart, Sidecar + Properties |1792340401520 |4 passed |
| Custom style / restart, Sidecar |1792340411889 |4 passed |
| Custom style / restart, Properties |1792340422330 |4 passed |
| Custom style / restart, neither pane |1792340432438 |4 passed |
| Style operations / faults / concurrency |1792340442402 |15 passed |
| Settings gate radius / Markdown Sidecar / trusted close / held storage |1792340449543 |8 passed |
| Foreground live updates with background sources held |1792340458120 |Passed |
| Structural actions / native tag and folder gestures |1792340462722 |12 passed |
| Adjacent groups / independent modes / scoped layout |1792340515852 |6 passed |

Both previously failing pane variants now pass stationary Parent restoration,
native plugin restart, actual watchdog receipt, genuine-idle prerequisite and
the synthetic recovery control. The old failed receipts are preserved, not
reclassified as successes. Native Save controls record1 accepted write,
1 presentation and0 semantic refreshes/acquisitions. These are functional
operation counts, not evidence of native CPU/memory/latency savings. No comparative
performance tests, personal-vault access, new global indexing strategy or runtime
diagnostics were added. Remaining acceptance is the affected full-process startup/
freeze case and the macOS/minimum-host/physical-device/native-gesture gaps above.

Foreground acceptance preserves the actual held P3 body while new native files
become discoverable/navigable and reach exact local semantics. Its final drain
flags are all false and configuration/owned files are restored. Layout-only
changes again record0 reads, acquisitions, parses, snapshot writes, builds and
semantic refreshes. The intentional structural mutation fixture records62 reads,
20 acquisitions,13 metadata writes and5 moves, with0 forced full builds; those
counts depend on fixture state and are not a comparison with prior trials.
Sanity1792340561280 confirms original107 files/88Markdown, matching deployed
artifacts, no controllers/dialogs, desktop mode and opening CLI capture off.
All native lanes restore configuration/workspace; all old raw failures remain.

Validated runtime/test checkpoint:
`ba8ad7e7b1ad7d714edc2340f330e5f706e723d3`. Private durable backup:
`%LOCALAPPDATA%/KplexValidation/structural-drops-177-20261018-1792340626104`;
685 files/38,971,887 bytes; source ZIP541 entries with verified CRCs and per-file
SHA-256, HANDOFF excluded. MANIFEST SHA-256
`57c5c60589a7ce06d73d55ed49323eb8cb0d9d8cec1025381351eafe2b8ff8d5`.
Originals and previous backups remain intact; nothing raw is published. CI for
dd4ef63 passed; the new checkpoint's CI is running when recorded. Keep PR draft;
no merge or release. Documentation-only evidence pinning does not change the
validated runtime or require another performance experiment.
