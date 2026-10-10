# Five-issue UX package — implementation and validation

This report tracks implementation and validation of issues #96, #97, #98, #99 and #101.
It records actual outcomes;
a pending check is not a pass. Structural refactoring remains paused at C14.


## Current acceptance — 2026-10-10 unified search highlight

**Publication approved:** The maintainer reports all tests passed and authorizes commit, push, PR, merge and closure of #96, #97, #98, #99 and #101. Earlier automated Clipboard/Canvas observations remain historical evidence; this is maintainer acceptance of the batch. Copy-link preferences remain future issue #107.

The maintainer confirms both device Node width and Windows fullscreen + Zen + maximized-editor
controls pass manual testing. Actual Markdown editor text copy/paste is also confirmed. These are
accepted manual results; the separately recorded physical-mobile and Canvas zoom observations remain.

Top-right local Find now uses the same theme-accent outline and broad halo as arrow/Option-arrow
navigation and Plex typing selection. One shared CSS rule covers regular, center, section-center and
expanded nodes, after earlier center/selection styling. Search matching, keyboard selection state,
input focus and ARIA remain distinct and unchanged; clearing a match removes its halo.

This follow-up changes only styles.css among325 verification inputs. Frozen source SHA-256
`bec4f9be1011b57971eb91070f02b5167ca5439783bb0eb60c49017d086c166f`; installed styles.css `d5b3973600b9a082e600e7fcdb5b17284838bd82bd8e2bf949f01fdc9b77df73`.
JavaScript/manifest hashes are unchanged from the prior full verified build (main3875ea11). For this
CSS-only correction, scanner,26 existing UI/display Chromium checks and production typecheck/build
PASS. Exact bounded-verified build is staged using the standard native runner; rendered smoke and
owning-document style comparison4/4 PASS, no captured JavaScript errors. The style comparison uses
removed offscreen clones, not physical-device/paint validation; no query, preferences or focus edits.
Earlier full verify697.969s/native display12/12 results remain historical for source2e3ba2e5; semantic
suites were not repeated for CSS alone. Full commands and receipts are in the validation report.

Reviewed publication branch: five-issue-ux-package, base595a625. Pre-publication48-file diff ledger:
`/private/tmp/kplex-search-highlight-final-diff-2026-10-10.json`. Commit/push/PR/merge and the five implementation issue closures are authorized; no release,
version change or structural refactor is included. Copy-link preferences remain future issue107.

## Final result — 2026-10-10 Europe/Budapest

**Implemented; Windows/device validation pending.** All five requirements are delivered as a local
uncommitted diff on `five-issue-ux-package`. Final full verification/build/scanner and native smoke PASS;
exact-build workflows8, Date24, fullscreen12, action-device3, device-onlyUX6 and scoped typography/layout6
scenarios PASS. The whole actions lane remains FAILED at raw Electron clipboard H13; full native UX
remains FAILED at the persistent Canvas inner-surface zoom assertion. Those failures are preserved,
not converted into passes by scoped testing. No unrelated Canvas production correction is included.

Final source325-input SHA-256: `05e325784d5b9e8883ec1cd347854bf3a637efa4c7b0c097ab3bf4b03d358c56`; final native17-driver SHA-256:
`ef1bf66319aa6dc2158845a4a0626f34510fb75369672130abc21ff648041a80`. Full changed-file identity and deletions are recorded after documentation is
finalized in `/private/tmp/kplex-five-issue-final-diff.json` (no deletions). Build hashes and actual
commands/results follow. The final state-restoration receipt PASS verifies exact delayed configuration
bytes, live migrated empty typography map, original workspace/window/throttling,73 notes and no
controllers. Task-owned native/test processes and sleep inhibitor have been released.

## Identity and scope

- Local branch: `five-issue-ux-package`.
- Actual base: `595a625c7fa7e3d7523642da867de5367fdbb6d4` (merged PR #105).
- Incoming handoff SHA-256: `b762800e75d512fafc464f29f964d3122e8be18698979829d38886d0986f8c04`.
- The original handoff was transferred through a file-only stash after updating main.
- This package stays as an uncommitted local diff; no release, PR, merge or issue closure is authorized.
- Initial integrated 325-input source freeze: `51ee51cd8346d075a8075dff1cebffdc3510a21a1b10e8e39935283d8c9f97ae`.
  Superseded first by historical freeze `1002eea76efffce9fa8e60174e8c04b85959e8f2bbaea3cf900e1a3c7452e9b4`, then by final freeze `05e325784d5b9e8883ec1cd347854bf3a637efa4c7b0c097ab3bf4b03d358c56` after the typography-only save correction. Both full verification/build outcomes are recorded below.

## Capability and test ownership

Node 22.22.2, real installed Obsidian declarations and local Chromium are available.
Only the root validation agent uses native Obsidian; offline implementation tracks use portable/browser
checks. Heavy checks and all native drivers run serially.

The native target is the explicitly disposable `kplex-test-small` vault at
`/Users/zsviczian/Obsidian/kplex-test-small`, config `.obsidian`. Original state was captured before
new staging: 73 Markdown files, desktop mode, settings closed, plugin loaded. Configuration byte
hashes, settings, workspace, dimensions and throttling are retained in temporary receipts for cleanup.
Native checks run serially on the exact build; outcomes are recorded below. The idle-sleep inhibitor is task-owned and must be
released during final cleanup. It does not unlock the session.

## Implementation checkpoints

- #97: separates desired publication, actual registration and bounded native assignment
  presence. Comparable conflict diagnostics retain their existing contract. Combined actual
  action/fullscreen Chromium checks pass40/40,0fail/skip,9.783s.
- #98/#99: introduces sparse device typography with shared defaults, independent
  reset and view-only overlays; density-independent truncation and seven quick rails. Model/layout
  tests pass8 model/host/settings/debounce cases and21 layout cases. Actual ThoughtNode Chromium
  long-label case passes1/1 (1.588s), exercising60→120→8 on the same mount across six densities.
- #96: measures visible Windows control geometry with a per-fullscreen lease.
  Missing, hidden, zero-sized or outside-client controls reserve no space. No unverified CSS-token
  fallback or fixed titlebar width is used. Browser checks included above; the exact-build Mac display-mode lane passes below.
- #101: confirms one selected explicit frontmatter declaration and fences approval
  with captured file identities, exact key and fresh canonical evidence. Direct-unlink eligibility
  remains unchanged. Final focused9 rendered modal + inverse-selected real writer + existing decode
  budget refusal cases pass11/11,0fail/skip,11.667s. Earlier affected writer/modal18/18 pass; all44
  preexisting real writer cases pass. Exact-build native confirmed-removal workflows pass below.

## Final validation

The chronological attempts below precede the final full pass; native acceptance is tracked separately.
First `verify:obsidian` attempt refused relative config path before verification/staging; retried
with the required absolute path. Second passes architecture7/core88/scanner, then fails because
the indexing fixture's explicit compile list lacked the two new runtime helpers. Corrected the
fixture to compile real modules, preserving all assertions. No native staging occurred in either
failed attempt. The fourth full retry establishes acceptance on its final freeze below.

Third integrated run passes the indexing fixture and513/516 aggregate cases; three migration
settings fixtures lacked the manifest ID required for exact native command lookup. Added the real
`k-plex` manifest fact to those doubles; focused migration suite22/22 passes (712.027ms). The archived
scene compatibility oracle now applies only the approved density-independent label delta: four
explicit width and18 x-coordinate adjustments with unique-node/old-value/finite-number guards,
independent character-budget/grid arithmetic, and every other field still compared exactly.
Archived `graph-baseline.json` is unchanged. No native staging happened before the aggregate failure.

Final retry uses325-input freeze`1002eea76efffce9fa8e60174e8c04b85959e8f2bbaea3cf900e1a3c7452e9b4`;
ledger`/private/tmp/kplex-five-issue-final-freeze-3.json`. Native-driver inputs are hashed separately.
Native emulation expects seven sliders and all five filter pills, including Conflicts. Its production
environment probe checks independently pinned typography selection across leaf/sidepanel/popout
with synchronous restoration and no sentinel persistence. This was the pre-completion checkpoint; full and native outcomes follow.

At21:24UTC the fourth full run has passed architecture7/core88/scanner, aggregate516, UI21 and
portable-source333, all zero failures/skips. Browser/IndexedDB suite is still running normally;
the final325-input freeze readback is unchanged. Historical native-driver17-file freeze:
`40108d26ee6dc08a498a603199365400327c3e86116b6c7de613487c5f6cdbef`; subsequent driver-only fixture corrections supersede it.

### Full frozen verification and exact-build staging — passed

`npm run verify:obsidian` (fourth attempt), pinned Node22.22.2 and all three absolute small-vault
variables, runs the entire`npm run verify` and stages its real production output. It passes at
21:32:25UTC after762.307s, including the rendered native smoke/no captured JavaScript errors.
Report:`/private/tmp/kplex-five-issue-native-smoke-4/report.json`;
full log:`/private/tmp/kplex-five-issue-full-verify-4.log`.

| Suite | Passed | Duration |
| --- | ---: | ---: |
| Architecture | 7 | 304.507ms |
| Core | 88 | 2.019s |
| Aggregate | 516 | 28.134s |
| UI | 21 | 21.815s |
| Portable sources | 333 | 11.983s |
| Actual Chromium/IndexedDB | 427 | 670.821s |

Every suite has zero failures/cancellations/skips. The scanner, installed-type check and actual
production build pass. Indexing fixture and24 settings-independence scenarios also pass. Dense
20,015-owner case passes in262.519s with unchanged memory/semantic/no-IO/cancellation/deadline
guards. This test duration is not paint latency. The325-input freeze readback remains unchanged.

| Build/staged artifact | SHA-256 (identical) |
| --- | --- |
| main.js | `1fc46e0567f8f7135a510fcbe4cc1560742c67bd67de1abe26eed2458083ec9e` |
| manifest.json | `19799fff9ae459130d707901e7c0d98b3e14a8567881a393f07d457c2fa8ec1c` |
| styles.css | `500f76d144a7cbcfa27c48775ac9f42e050c32b5753e9a0e75ae023ff0f15658` |

Manifest remains0.1.0/minimum Obsidian1.13.0; no release-version change. Native host is macOS
Obsidian1.14.4 (installer1.14.0). Remaining native and final cleanup results are recorded below.

## Platform limitations and morning checks

Windows fullscreen acceptance remains pending on actual Windows (frame mode, restored/maximized,
popouts and 100/125/150% scaling). macOS synthetic control geometry is not Windows evidence.
Physical tablet/phone touch and actual device-class behavior remain pending; desktop emulation is
reported separately. Final return will name at most three prioritized manual checks.

### Native acceptance attempts (exact build, serial)

- Action workflows: passed eight scenarios in14.881s (21:33:10–21:33:25UTC), including
  native multi-source Connection details, cancellation without writes, confirmed removal of only
  the selected child property, preserved friend property/body/inverse note, refreshed canonical
  evidence, and source navigation into the Plex-owned sidecar. Receipt
  `/private/tmp/kplex-five-native-workflows-1/report.json`; cleanup removes all owned notes,
  dialogs and controller. The existing short H11 scenario label covers these new assertions.
- UX attempt1: initial prerequisite waited on full-vault authority in an on-demand graph. Actual
  local status was ready/upToDate with6/73 indexed, no build/hydration/semantic work pending,
  but no global dependency/full-snapshot authority. Root cancelled only the owned driver via
  its normal error/finally path; cleanup passed. The injected cancellation error is not a plugin
  failure. Receipt `/private/tmp/kplex-five-native-ux-1/report.json`; diagnostic snapshot
  `/private/tmp/kplex-five-ux-prerequisite-evidence.json`. Driver must obtain genuine distinct
  pair authority for its local fixture without enabling inventory or manufacturing ready flags.
- Actions attempt1: eleven preceding scenarios pass; H29 Alt+Slash search focus fails. Trusted
  Alt+Slash delivery is captured, but original saved sidecar binding also uses Alt+Slash, so
  resetting only search to its default introduces a genuine local conflict. Fixture correction
  is pending evidence review. Normal finally cleanup removes all owned files/controller and
  restores configuration; no JavaScript errors. Receipt
  `/private/tmp/kplex-five-native-actions-1/report.json`.
- Display modes attempt1: camera/selection/history preservation assertion fails during first
  mode resize; trace is under review, not accepted. Receipt
  `/private/tmp/kplex-five-native-display-1/report.json`; normal cleanup restores desktop
  dimensions/minimum/settings/workspace, removes controller and overlay, and reports73 notes.

These failures remain recorded even if a corrected fixture later passes. Production325-input
freeze and staged artifacts have not changed; native-driver edits are hashed separately.

- Native Date properties: passed24 scenarios in6.385s (21:42:10–21:42:16UTC) with
  existing Date registry and Daily Notes enabled. Covers every fallback role, configured ontology
  precedence, hidden ontology, generic inference, native settings and plugin reload; no prerequisite
  host configuration enabled to force a pass. Receipt `/private/tmp/kplex-five-native-date-1/report.json`;
  normal cleanup reports73 files, desktop/settings closed, restored workspace/controller removed.
- Native action devices: passed desktop/tablet/phone emulation in7.410s
  (21:43:39–21:43:47UTC), all5 native filter pills and inline Settings geometry. Receipt
  `/private/tmp/kplex-five-native-action-devices-1/report.json`; desktop dimensions/minimum
  restored, controller removed/manager closed. This is emulation, not physical touch acceptance.
- Actions attempt2: H29 passes after test-owned sidecar default isolation, then H18/H28
  publication button fails the retained unobscured native-pointer guard because it lies offscreen.
  Driver must reveal/reacquire the actual row control before both clicks; production unchanged.
  Receipt `/private/tmp/kplex-five-native-actions-2/report.json`;13 preceding scenarios pass,
  native errors clear and finally cleanup/configuration restoration pass.
- UX attempt2: genuine on-demand distinct-pair authority and exact owned fixture roles pass;
  first area hover check fails. The graph fixture preserves default auto-fit=false and never
  invokes Fit; driver correction uses the real Fit toolbar action and bounded failed-hover
  geometry while retaining all trusted pointer/style assertions. Receipt
  `/private/tmp/kplex-five-native-ux-2/report.json`; cleanup passes.

- Device-only UX attempt1: graph typography/layout and Filter open/close proceeded; the next old
  global-authority predicate then waited despite actual on-demand local graph ready. Scoped
  snapshot confirms desktop, Filter closed/no portal, full/sourceBacked/global dependencies false
  and no pending semantics. Root quiesced only driver PID98252, captured facts, terminated that
  driver and removed its exact verified owned web-note/controller. Normal driver finally did
  not run, so this is cancelled/not accepted. Independent exact-original-state restoration is
  separately verified before retry. Receipts `/private/tmp/kplex-five-native-ux-devices-1/report.json`,
  `controlled-recovery.json` and `/private/tmp/kplex-five-device-attempt1-state-restoration/report.json`.
  New driver preserves eager authority but prepares a real local pair in on-demand mode.

- Display modes attempt2: bounded comparisons prove only scheduled zoom changed: scale0.18→0.207
  (exact1.15 zoom factor), identical translation/selection/history/center. Driver dispatch returns
  before its animation-frame style commit; fixed baseline capture to await actual owning frames.
- Display modes attempt3: passed12 scenarios in10.038s (21:50:48–21:50:58UTC), including
  all16 exact camera/selection/history/center comparisons, allfour independent modes with both
  sidebar arrangements, zero index/hydration calls, Escape priority, explicit Fit, native palette,
  active-leaf restore, two-way popout migration, close/unload/reload cleanup and tablet/phone Zen.
  Receipt `/private/tmp/kplex-five-native-display-3/report.json`. This is macOS+emulation; it
  does not establish actual Windows control geometry or physical-device behavior.
- Actions attempt3: native publication clicks pass. The workflow-toggle whole-preference
  comparison still used the pre-publication snapshot; explicit republish persists child=true
  where the prior default was implicit. Driver now independently asserts that only this explicit
  publication override changed, then takes the correct full snapshot for workflow toggles.
  Receipt `/private/tmp/kplex-five-native-actions-3/report.json`; cleanup/configrestore pass.

- UX attempt3: first3 toolbar/control-hover/overflow scenarios pass after real Fit. F4 test
  then times out because its synthetic root event is emitted after the prior focused input was
  removed, leaving actual focus on body. Current production action eligibility reads actual
  surface focus. The driver also omits physical code for its saved Cmd+F=KeyF binding. Fixture
  adaptation preserves focus guards and adopts existing owning-window native key transport.
  Receipt `/private/tmp/kplex-five-native-ux-3/report.json`; normal cleanup passes.

- Device-only UX attempt2: passed all6 scenarios for actual desktop/tablet/phone emulation;
  independently pinned temporary61/62/63 typography resolves identically across leaf/sidepanel/popout,
  allseven quick controls are reachable, three typography rails and wrap tile fit, owning-document
  Filter geometry/close/focus pass, and desktop webview versus mobile iframe routing/teardown pass.
  Receipt `/private/tmp/kplex-five-native-ux-devices-2/report.json`; normal finally reports
  desktop/live settings/exact bytes restored. No physical touch/platform guarantee.
- Actions attempt4: physical F1 is genuinely captured by the recorder, which closes and
  filters exactly keyboard.help. Display is localized 'F1 (physical position)' as designed; old
  literal-F1 assertion corrected to the existing physicalBinding translation. All row-match and
  unchanged-preference checks retained. Receipt `/private/tmp/kplex-five-native-actions-4/report.json`;
  cleanup/configrestore pass.

- UX attempt4: trusted native F4/Cmd+F and first5 scenarios pass. Hidden-path test used
  the exact name of a genuinely visible folder parent, producing a legitimate1match with
  path mode disabled. Query now uses folder+'/' to isolate hidden flat-file paths, and explicitly
  asserts initial path mode=false. Receipt `/private/tmp/kplex-five-native-ux-4/report.json`;
  normal cleanup passes.
- UX attempt5: path isolation passes, but fixture Unrelated.txt shares the hub's physical
  folder and is legitimately displayed through sibling/expanded folder projection under original
  showFolderNodes/renderSiblings=true. Owned unrelated file now has a unique root-level path;
  an exact displayed-path absence check precedes the retained Find assertion. No feature hidden.
  Receipt `/private/tmp/kplex-five-native-ux-5/report.json`; cleanup passes.
- Actions attempt5: H18/H28 native Settings/publication/registration/assignment/recorder/global
  search passes, along with14 preceding broad scenarios. H13 raw Electron clipboard input fails
  in BOTH exact-focused embedded Markdown and the independent ordinary-editor baseline: trusted
  Meta+V, defaultPrevented=false, graph preparations0, clipboard marker present, model unchanged.
  This does not establish a K-Plex clipboard defect. Whole actions lane is failed/not accepted;
  OS clipboard accelerator acceptance remains pending. All unattended OS_CUA flags stay false
  as required by this assignment. Receipt `/private/tmp/kplex-five-native-actions-5/report.json`;
  normal finally removes owned fixtures/controller and restores configurations.

- UX attempt6:19 preceding scenarios pass, including native Find/history/gates and attachment
  immediate unlink, then URL navigation waits for raw `https://Obsidian.md`. The real index resolves
  that spelling to `https://obsidian.md`, and activation correctly renders the canonical endpoint.
  Driver comparisons must use the resolved endpoint path through navigation/history/evidence;
  lexical fixture URL remains unchanged. Production is unchanged. Normal cleanup passes. Receipt
  `/private/tmp/kplex-five-native-ux-6/report.json`,22:01:39–22:05:03UTC.

- UX attempt7:39 scenarios pass through canonical URL immediate unlink, popout Find, shared-label
  geometry and slow native density sweeps. New device typography save under the isolated foreground
  measurement exposes a real save-path issue: `typographyProfiles` correctly classifies as render-only,
  but `saveSettings()` still awaits `refreshSemanticSettings()`, which clears local requested scopes
  and starts lower-priority on-demand work. The isolated measurement's P0 owner then parks that P2
  refresh. This also violates the requirement that device typography saves do no source/semantic work.
  Root's serialized passive snapshot records four owned requested-center tasks,14 gates, no baseline
  or pair task, scheduler active[1,0,39,0,0]/43 waiters. The ordinary300s outer deadline fails.
  Receipt `/private/tmp/kplex-five-native-ux-7/report.json`,22:07:31–22:12:51UTC, is failed; its normal
  cleanup also fails during callback cancellation and must not be counted as successful.
  Controlled recovery unloads only K-Plex to retire the stuck callback and all scheduler tasks, verifies
  zero outstanding writes and73 notes/no owned fixtures, restores original configuration bytes, removes
  the empty controller and reloads the originally active plugin. Separate recovery passes in
  `/private/tmp/kplex-five-native-ux-7/controlled-recovery.json`. The source-policy/save-path correction,
  affected regression and full rebuild/native retry are required; earlier build hashes are historical.

### Typography-only save correction — focused and fresh full checks passed

The canonical settings classifier now names `typographyOnly` only when the sole changed diagnostic
key is `typographyProfiles`. `saveSettings()` skips general semantic refresh for that case and
notifies presentation consumers. Mixed semantic/visibility writes and every legacy shared control
retain their existing refresh behavior. No scheduler, timer, threshold, source schema or parser changes.
The native fixture commits its preceding layout/animation edits before the isolated measurement;
those legitimate mixed effects are not attributed to typography.

Pure typography/migration checks pass30/30. Actual Chromium/on-demand/IndexedDB regression passes
1/1, then the entire on-demand file passes63/63 in48.423s, no failures/cancellations/skips. It executes
real save/queue/reset methods with production GraphIndex, confirms zero Vault reads/metadata parses/
source acquisitions/semantic publications, stable demanded token and exact pair authority, persisted
false/reset and direct-map presentation notification. An overlapping ontology save invalidates before
queued storage, recanonicalizes the published relationship, revokes old edit authority and genuinely
re-prepares the exact pair under the new policy; the composed neighborhood then has the new role.
No global inventory starts. Earlier mixed-test assertion queried a deliberately retained old pair
projection before re-preparation; revised oracle requires real authority, not cache deletion.
Logs:`/private/tmp/kplex-five-typography-on-demand.log` and
`/private/tmp/kplex-five-typography-on-demand-full.log`.

Fresh325-input freeze:`05e325784d5b9e8883ec1cd347854bf3a637efa4c7b0c097ab3bf4b03d358c56`;
ledger:`/private/tmp/kplex-five-issue-final-freeze-4.json`. Fifth full run uses the same exact Node22
and absolute target/configuration variables. Log:`/private/tmp/kplex-five-issue-full-verify-5.log`;
planned exact-build smoke receipt:`/private/tmp/kplex-five-issue-native-smoke-5/report.json`.
Earlier full pass/native artifacts are historical and do not substitute for this new frozen run.

### Final frozen full verification — passed after the typography save correction

Fifth `npm run verify:obsidian` passes22:18:11.830–22:30:47.073UTC (755.243s).
Exact Node22.22.2, same absolute disposable-vault/configuration variables and unattended flagsfalse.
Architecture7 (315.445ms), core88 (2.036s), aggregate516 (29.703s), UI21 (21.991s), portable333
(11.626s), actual Chromium/IndexedDB428 (662.068s): all zero failures/cancellations/skips.
Scanner, installed types, real production build and exact-build rendered native smoke pass.
New actual typography save/reset regression passes in the normal full browser lane627.546ms.
The20,015-owner case passes253.791s; cached publication111.883s, replay/combined peaks
405,146,310/685,201,826 bytes, all original safety/semantic/no-I/O/deadline assertions unchanged.
Freeze325 inputs remains`05e325784d5b9e8883ec1cd347854bf3a637efa4c7b0c097ab3bf4b03d358c56`.
Full log:`/private/tmp/kplex-five-issue-full-verify-5.log`;
smoke receipt:`/private/tmp/kplex-five-issue-native-smoke-5/report.json`.

| Final build and staged artifact | SHA-256 (identical) |
| --- | --- |
| main.js | `cf434e5b67f806270fd06e24095fa99be7da36a5193b379be88d6ad8c5aca59a` |
| styles.css | `500f76d144a7cbcfa27c48775ac9f42e050c32b5753e9a0e75ae023ff0f15658` |
| manifest.json | `19799fff9ae459130d707901e7c0d98b3e14a8567881a393f07d457c2fa8ec1c` |

Manifest remains0.1.0/minimum Obsidian1.13.0. All subsequent final native receipts must match these
three hashes; earlier native passes remain historical and are repeated against this build below.

- Final-build UX attempt8 fails the child-area intermediate-pointer sampling assertion after27
  passed scenarios. Captured child resize is connected and correct:180→243 saved preview, heights
  [99.262,119.115,134.004] from99.262 initial. The first sample was taken before its React layout
  update despite two RAFs; later points and final delta are correct. Native driver now awaits each
  actual strictly increasing rendered height at that point with a bounded deadline, preserving
  all three monotonic samples, exact camera and one-save assertions. No additional pointer events
  or production changes. Receipt `/private/tmp/kplex-five-native-ux-8/report.json`,
 22:31:26–22:31:57UTC,failed with normal cleanup passed. Source freeze05e32578 unchanged.

- Final-build UX attempt9 fails after20 passed scenarios at strict tall-image screenshot colors:
  red[231,2,3],green[10,226,2],blue[0,0,255],yellow[255,255,4]. Previous broad UX runs passed the
  unchanged image and no new production image/resize code is included. Source/raster settling
  prerequisites are under review; color thresholds and contain/centering/geometry assertions stay
  unchanged. Receipt `/private/tmp/kplex-five-native-ux-9/report.json`,22:33:59–22:34:26UTC,
  failed with normal cleanup passed. This attempt is not counted as native acceptance.


### Repeated native acceptance on the final build

Every receipt below matches final main.js `cf434e5b…`, styles.css `500f76d1…` and manifest.json
`19799fff…` exactly. Runs are serial, pinned Node22.22.2, disposable `kplex-test-small`, all unattended
OS-input flags false. These are functional observations, not physical-device or paint-latency acceptance.

| Lane / receipt under `/private/tmp/` | Actual outcome | Elapsed |
| --- | --- | ---: |
| `kplex-five-native-workflows-2/report.json` | PASS, 8 scenarios; selected-property confirmation/cancel/preservation/refreshed evidence and owned-sidecar navigation | 14.860s |
| `kplex-five-native-date-2/report.json` | PASS, 24 scenarios; existing Date/Daily Notes prerequisites, scalar refusal/ontology/default-role/settings/reload | 6.627s |
| `kplex-five-native-display-4/report.json` | PASS, 12 scenarios and 16 exact preservation comparisons; both popout migrations, active leaf, Escape, close/unload/reload | 10.093s |
| `kplex-five-native-action-devices-2/report.json` | PASS, 3 desktop/tablet/phone emulation scenarios, five native filter pills and inline Settings geometry | 7.293s |
| `kplex-five-native-devices-3/report.json` | PASS, 6 emulation scenarios, actual device typography across leaf/sidepanel/popout, seven controls, Filter/Find/web routing | 5.335s |
| `kplex-five-native-actions-6/report.json` | FAILED whole lane at existing H13 clipboard check; 14 preceding scenarios PASS including new H18/H28 publication/assignment checks | 42.354s |

Workflow, Date, display and action-device runs pass normal cleanup and exact configuration restoration.
Device-only UX passes its owned teardown, live settings and byte restoration; complete independent
restoration follows all runs. The clipboard failure again records trusted, unconsumed Meta+V with no
Plex key interception; the earlier ordinary outside-editor reproduction is retained above. Actual
macOS clipboard accelerator acceptance remains pending. This failed whole lane is never reported PASS.

- Final-build UX attempt10 preserves the settled-image prerequisite yet fails the exact same colors
  as attempt9 after20 passed scenarios. Two stable captures, decoded image, connected/stable geometry,
  full-opacity ancestors and zero running animations rule out the initial timing hypothesis. Strict
  color-difference threshold remains unchanged. Receipt `kplex-five-native-ux-10/report.json`; normal
  cleanup passes. Native screenshot representation/color conversion is being investigated separately;
  neither this failed broad lane nor earlier passes substitute for final typography acceptance.


- Final-build UX attempt11 passes28 scenarios, including both strict image corner-color checks.
  The tall small surface remains contain-fitted/centered/in bounds; native Maximize yields actual
  painted350.464×592 content with red[255,0,0],green[1,255,0],blue[0,0,255],yellow[255,255,4].
  Native Restore returns the original131.234×107.469 image/frame and identical camera transform.
  This supports the tiny-image sibling-toolbar-shadow explanation; no color tolerance or CSS changed.
  Wide image remains tested in the original small surface and passes. The run then fails the existing
  native Canvas inner-surface zoom resize check after its overlay has grown. Bounded native
  ResizeObserver settling is under review. Receipt `kplex-five-native-ux-11/report.json`,
 22:42:37.140–22:43:10.054UTC (32.914s), normal cleanup PASS. Production freeze unchanged.


- Final-build UX attempts12 and13 fail before fixture creation (zero scenarios) because readiness
  observes the previously restored URL center while the newly mounted view's navigation subscription
  has not yet consumed the setup notification. Explicit physical setup path exists; both normal
  cleanups PASS. Driver now waits two owning-view frames before notification and verifies the actual
  rendered physical center before pair readiness. Receipts `kplex-five-native-ux-12/report.json`
  and `kplex-five-native-ux-13/report.json`; source/build unchanged.
- Full-scope attempt14 uses explicit existing physical setup center and reaches28 passing scenarios,
  then fails the unchanged Canvas growth condition despite a bounded5s native surface wait.
  Connected inner Canvas changes131.234×107.469→102.556×84.377, while its overlay grows
  145.234×121.469→181.875×152.117. This persistent observation is unresolved; no cause or baseline
  regression attribution is claimed, and no unrelated production fix is included. Receipt
  `kplex-five-native-ux-14/report.json`,22:46:45.060–22:47:23.134UTC (38.074s), normal cleanup PASS.
  Full native UX remains FAILED. Explicit layout-only entry point reuses the identical shared label/
  settings/layout assertion string, full owned setup and cleanup; its result is a scoped result only.


### Final scoped typography/layout acceptance — passed

`KPLEX_UX_LAYOUT_ONLY=true KPLEX_UX_EMULATE_MOBILE=false npm run verify:obsidian:ux`, pinned Node22.22.2,
all three absolute target/configuration variables and explicit existing physical setup center.
Receipt `/private/tmp/kplex-five-native-layout-1/report.json`,22:47:51.742–22:48:37.579UTC (45.837s):
6 scenarios PASS, normal cleanup PASS, no captured JavaScript errors, exact final artifact hashes.
The shared acceptance string is identical in broad and scoped paths; full owned setup/cleanup runs.

Covers native shared label Settings, wide-node/no-overlap/two-line geometry, seven-control mount/order,
independent density/columns/compact/link spacing, weighted parent seams, actual slow native slider
sweeps with no animation/camera rollback, and device font/label/width/wrap geometry/settings/persistence/
reset. Measured narrow font10px/width160/height26 versus wide font19.3548px/width500/height75; font
multiplier remains active. Shared defaults stay unchanged. Actual observed typography work:
Vault reads0, metadata parses0, source acquisitions0, semantic publications0; publication revision and
full-build counter unchanged. Reset cannot be resurrected by the older pending debounce. All three
surface projections resolve the same device override. This scoped PASS does not replace failed full UX.

### Final cleanup, review and return

Independent restoration PASS `/private/tmp/kplex-five-issue-final-state-restoration/report.json`,
22:49:28.470–22:49:32.049UTC. Original workspace,1440×875 bounds at(0,25), minimum200×150,
background throttlingtrue, desktop mode,73 Markdown files and zero temporary controllers are verified.
Live new-runtime settings contain required `typographyProfiles:{}`; original disk bytes remain exact:

| Configuration | Final SHA-256 |
| --- | --- |
| data.json | `7168bd26642d06082da37d738d379658c42960438e1a066d511230a2086b8fd1` |
| community-plugins.json | `4ac827989c179ea6dba2e5a878462085dc86e40328300b1b018fb91d466cbc35` |
| hotkeys.json | `44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a` |
| types.json | Original absence preserved |

The task-owned sleep inhibitor PID83984 is identified by exact command/start time and stopped;
receipt `/private/tmp/kplex-five-issue-caffeinate-cleanup.json` PASS. Every owned driver has exited.
Final source ledger `/private/tmp/kplex-five-issue-final-freeze-4.json` and driver ledger
`/private/tmp/kplex-five-native-driver-freeze-final.json` retain all input hashes. Independent source/
architecture/lifecycle/identity/source-provenance/localization/TSDoc review is complete; no temporary
production diagnostics or source schema/scheduler/parser grammar/timing-budget changes remain.
Whitespace check PASS; exact dist/staged hashes match. Manifest/version and package-lock unchanged.

Return is the existing uncommitted checkout:40 tracked changes plus8 new files,48 total, no deletions.
No generated artifacts, dependencies, Git metadata or vault files enter the changed-files return.
No new commit/push/PR/merge/release/issue closure was performed for this package. Previous authorized
browser-indexing publication is complete in merged PR105; local main/origin/main/base remain595a625.
Source changes stay on `five-issue-ux-package`; no continuing agent assignment is queued.

### Three priority manual checks

1. **Windows fullscreen:** restored/maximized and popout windows at100/125/150% DPI; native window controls remain reachable with no toolbar overlap, and Zen works independently.
2. **Physical tablet/phone:** device scope, font/label/width/wrap, touch activation, inheritance/reset and reload; desktop emulation does not prove mobile WebView/touch behavior.
3. **macOS native editors:** actual Cmd+C/V/X in ordinary and Plex-owned editors, plus the unresolved native Canvas wheel-resize observation. Raw Electron clipboard injection is not actual OS accelerator evidence.


### Maintainer follow-up — 2026-10-10

The maintainer reports actual Windows fullscreen testing and confirms the fix works as expected.
No exact Windows build, restored/maximized/popout or DPI matrix was supplied; this is qualitative
physical Windows confirmation, distinct from earlier Mac/browser observations. Physical tablet/phone
validation remains pending. The maintainer also reports center-label clipping in kplex-test-small at
Desktop label length120/node width800/minimum horizontal density. Full label exists in DOM but
CSS clips it (201px scroll width vs193px client width). Separate center cap390 is not reached; the
regular-font geometry estimate underestimates the center's larger/heavier typography. A narrow
center-only sizing correction and real-CSS rendered regression are being verified on new source.
Previous frozen verification/build identities remain historical. Copy-link preference behavior is
tracked as [issue107](https://github.com/zsviczian/kplex/issues/107); no feature code/PR was requested.


### Center-label follow-up — final verification and live acceptance passed

`npm run verify:obsidian`, pinned Node22.22.2 and the same three absolute disposable-vault/config
variables, passes03:55:17.297–04:06:46.753UTC on2026-10-10 (689.456s;05:55–06:06 Budapest).
Architecture7/core88/aggregate516/UI21/portable333/Chromium-IDB428, zero failures/cancellations/skips,
scanner, installed types and real build PASS. Native rendered smoke/no captured JS errors PASS;
report `/private/tmp/kplex-center-label-native-smoke-2026-10-10/report.json`, full log
`/private/tmp/kplex-center-label-full-2026-10-10.log`. Archived scene comparison passes without
another expected-geometry adjustment. Dense20,015-owner cached publication112.234s with original
405,146,310/685,201,826 byte reservations and every safety/semantic/no-I/O/deadline assertion intact.

Focused Chromium actual ThoughtNode/CSS/icon short-center regression PASS1/1 (2.898s) across
basefont13/20/28 and density0.75/2/4; full layout/typography models PASS29/29 (616.576ms).
Only center character-width estimate changes, using its actual rendered font proportions. Regular
node geometry, explicit center/tag/note-type width precedence, character budgets, wrapping and
semantic/indexing behavior are preserved. Maximum central node width remains a separate setting;
its configured390 cap is still applied in the reported live view.

Read-only post-staging native geometry confirms `Graph Lenses are local` now has scrollWidth201 and
clientWidth201 (before201 versus193); node width298.339, font18.871/weight650, no character ellipsis
or CSS clipping. Desktop overrides remain label120/width800,73 notes and zero controllers. Receipt
`/private/tmp/kplex-center-label-live-2026-10-10.json`. No fixture notes, explicit preference edits, OS keyboard
injection or new sleep inhibitor were used. The corrected bundle was staged through the normal plugin
disable/enable workflow; ordinary lifecycle/cache writes were not suppressed.

Source325-input ledger `/private/tmp/kplex-center-label-source-freeze-2026-10-10.json` has SHA-256
`044b5bbc80674c506d66700f626b616f0be5d9d59318f0e143bcc406f3c1bd56` and unchanged final readback.
Build/staged main.js identical `c48ff52cf7cc6b785ece47016a29b2a28bedd4a7db56cdd35546fa91915e01d6`;
styles `500f76d144a7cbcfa27c48775ac9f42e050c32b5753e9a0e75ae023ff0f15658` and manifest
`19799fff9ae459130d707901e7c0d98b3e14a8567881a393f07d457c2fa8ec1c` unchanged. Full local48-file
return remains uncommitted on five-issue-ux-package/base595a625; no deletions or PR/commit/push.

The prior manual clipboard request means native text copy/cut/paste inside the Plex-owned Markdown
editor, compared with an ordinary editor; it does not mean copying a node link. Canvas resizing means
zooming Plex while its native embedded Canvas is open and comparing Canvas/frame dimensions.
Those historical broad-lane observations remain separate from the implemented center fix and the
requested future copy-link improvement. Windows confirmation is accepted; no repeated Windows
manual check is requested based solely on missing detailed DPI metadata.


## Device width and Windows maximized editor — 2026-10-10

- Explicit valid device maxWidth now overlays both baseNodeStyle and centralNodeStyle in the existing
  view projection. No stored shared style is changed. Unset/reset/invalid overrides restore inheritance;
  tag/note-type styles retain precedence. Cache fingerprints include center style and override presence,
  including deleting a width equal to the shared base value. Native device Settings and quick-control
  descriptions explain scope in all eight catalogs.
- Actual buildScene regression observes center width800→320 on desktop, tablet390, reset390.
  Focused models31/31 PASS1.030s; first integrated typography/layout/display36/36 PASS6.825s.
- The existing Windows entry lease now measures visible native controls against its fullscreen overlay,
  independent of hidden Plex chrome. The Zen/maximized editor toolbar inherits the same inset. Shipped
  CSS browser regression checks starting fullscreen from Zen,150→210px native controls, unchanged
  editor rectangle, non-Zen/compact/hidden/exit/macOS behavior and complete cleanup. General fullscreen
  observer/popout lifecycle regression remains in the focused and full lanes.
- User acceptance: actual Markdown editor copy/paste PASS; earlier general Windows toolbar PASS.
  New Windows fullscreen + Zen + maximized editor placement needs actual Windows confirmation.
  Existing Canvas inner-surface zoom observation is separate and unchanged; copy-link issue107 stays
  future work. No Windows runtime or physical mobile test is claimed from Chromium simulation.
- Full verification is running against frozen source2e3ba2e5; command/log/receipts will be recorded after
  completion. Changes remain local/uncommitted on five-issue-ux-package, base595a625.

- First full attempt on source48b9e099 failed lint at the new fifth Object.assign argument:
  TypeScript selected its variadic any overload (unsafe assignment/return). No build was staged.
  Recovered by spreading the optional center style into the existing typed argument, without casts
  or scanner suppression. Final frozen source2e3ba2e5 has a fresh full run/log/report directory.

- Second full attempt on source5f328e33 passed architecture/core/scanner but stopped in indexing
  initialization: new non-English translations used entry objects where LocaleTranslationMap expects
  message strings. No build was staged. Corrected all seven non-English entries; dedicated localization/
  typography/layout50/50 PASS2.654s and actual installed typecheck PASS. Current source2e3ba2e5 is
  frozen for the third full run. The earlier errors remain recorded rather than hidden by retries.


### Final follow-up verification and restoration

- Final source325-input SHA-256 `2e3ba2e55738611796f8568a427fbfc72f5308d2ce243e9db453f6591507a339` unchanged throughout full and native runs.
  `python3 /private/tmp/kplex-action-freeze-check.py check /private/tmp/kplex-width-editor-source-freeze-accepted-2026-10-10.json` PASS.
- Pinned Node22.22.2, explicit vault/config/CLI variables, `npm run verify:obsidian` PASS697.969s
  (06:01:00.279→06:12:38.248UTC). Architecture7/core88/aggregate519/UI21/portable333/Chromium-IDB428,
  all zero failures/cancellations/skips; scanner, actual installed types, production build and native smoke PASS.
  Browser duration603.938s. Full log `/private/tmp/kplex-width-editor-full-accepted-2026-10-10.log`,
  receipt `/private/tmp/kplex-width-editor-native-smoke-accepted-2026-10-10/report.json`.
- Exact built/staged hashes: main.js `3875ea113ec3bf7a31ccc7d9336918c545368bd6ee28d35bd6350650a6c58305`, styles.css
  `227930115c5dbb0d7d3221b92b38c85fb11448cc2429b22680d69d256ff278e4`, manifest.json
  `19799fff9ae459130d707901e7c0d98b3e14a8567881a393f07d457c2fa8ec1c` (version0.1.0 unchanged).
- Same vault variables and exact build, `npm run verify:obsidian:display-modes` PASS12/12,
  06:13:20.474→06:13:30.767UTC (10.293s). Retains16 exact resize comparisons, both popout migrations,
  Escape/palette/state/lifecycle behavior. Emulator tablet900×875 and phone390×844 assert actual
  device classes, usable Zen, no fullscreen button and refused fullscreen. Cleanup returns desktop,
  original workspace/bounds/minimum/configuration bytes;74 notes retained, zero overlays/controllers/
  wrappers and `No errors captured.` Receipt `/private/tmp/kplex-width-editor-native-display-2026-10-10/report.json`.
  No actual Windows or physical mobile result is inferred from those emulated cases.
- Read-only post-cleanup live receipt `/private/tmp/kplex-width-editor-live-2026-10-10.json` PASS:
  current user Desktop maxWidth230/maxLabelLength49/baseFontSize10.2, effective center/base230,
  shared center390, actual rendered center230. Current long test note remains truncated under that cap
  (client206/scroll420), as expected; no claim of fitting every label regardless of the chosen maximum.
  User's additional note and current settings are preserved:74 Markdown files, no controller.
  Initial probe expected unprefixed CLI JSON and old73-file/short-label state; native CLI returned
  `=>` JSON with current230-width/long-note state. Parser/assertions were corrected to the actual
  targeted acceptance (cap projection), without editing production code, preferences or the note.
- Sleep inhibitor was tied to verification PID26150 and exited with it (caffeinate29563 absent).
  Native display driver completed; no active test resources or new agent assignment remain.
- Final source check and `git diff --check` PASS. Full48-file local diff identity/deletions are recorded
  separately in `/private/tmp/kplex-width-editor-final-diff-2026-10-10.json`. No commit/push/PR/merge/release.


## Unified local Find/navigation highlight and manual acceptance — 2026-10-10

- Maintainer confirms device Node width and actual Windows fullscreen + Zen + maximized-editor controls
  PASS. This supersedes the pending Windows editor case in the earlier timestamped follow-up. Markdown
  editor text copy/paste was already confirmed. Physical mobile and separate Canvas zoom remain pending.
- Replaced the thin local Find ring with the existing keyboard-navigation ring/halo in one shared CSS
  block. The block comes after earlier selected/center styles so center and section cases retain the same
  strong highlight. Existing match classes remain separate from keyboard selection and aria-current;
  no query/cycling/navigation/filter/connector logic changed. No production JavaScript changes.
- Source freeze325-input SHA-256 `bec4f9be1011b57971eb91070f02b5167ca5439783bb0eb60c49017d086c166f`. Compared with prior fully verified
  source2e3ba2e5, exactly one input differs: styles.css. Freeze check and git diff --check PASS.
- Pinned Node22.22.2: `npm run lint:obsidian` PASS; `node --test --test-concurrency=1 tests/ui-components.test.mjs tests/display-modes.test.mjs`
  PASS26/26,35.428s, zero failures/cancellations/skips; `npm run build` PASS against installed Obsidian types.
  Includes real Find controls/matching, native recorder, title geometry and display lifecycle Chromium cases.
  Log `/private/tmp/kplex-search-highlight-checks-2026-10-10.log`; scoped receipt
  `/private/tmp/kplex-search-highlight-checks-2026-10-10.json`. The prior broad full semantic run is retained;
  this CSS correction does not claim a repeat of all semantic/browser-IDB suites.
- Exact-build native staging uses scripts/testing/obsidian/runner.mjs with a callback that checks the
  already-completed bounded scanner/UI/build receipt, all frozen source hashes and artifact hashes.
  Wrapper `/private/tmp/kplex-search-highlight-native-smoke.mjs` declares the CSS-only validation scope.
  Explicit kplex-test-small/config/CLI target; normal disable/copy/enable/open and rendered smoke PASS.
  Receipt `/private/tmp/kplex-search-highlight-native-smoke-2026-10-10/report.json`. Built/staged styles.css
  `d5b3973600b9a082e600e7fcdb5b17284838bd82bd8e2bf949f01fdc9b77df73`; main.js unchanged
  `3875ea113ec3bf7a31ccc7d9336918c545368bd6ee28d35bd6350650a6c58305`, manifest unchanged
  `19799fff9ae459130d707901e7c0d98b3e14a8567881a393f07d457c2fa8ec1c` (0.1.0).
- Native owning-document computed-style comparison PASS4/4 (regular, center, section-center, expanded):
  both navigation and Find have identical3px accent outline/3px offset and the same3px surface ring,
  6px accent ring and28px/6px halo. Removing the match class clears its halo. Temporary offscreen clones
  are removed in finally; no live query, selection, focus, preferences or graph state changed by the probe.
  Receipt `/private/tmp/kplex-search-highlight-live-2026-10-10.json`; `dev:errors`: No errors captured.
  This proves native CSS/cascade values, not paint timing or physical touch acceptance.
- Final48-file local diff/no deletion ledger `/private/tmp/kplex-search-highlight-final-diff-2026-10-10.json`.
  Branch/base unchanged, no Git publication or further assignment. C15–C26 remain paused.


## PR108 Linux test scheduling correction — 2026-10-10

- Initial GitHub run [38033103697](https://github.com/zsviczian/kplex/actions/runs/38033103697)
  failed before the browser-source lane: aggregate519 tests,516 passed and3 failed. All three failures
  were Chromium startup timeouts in action-settings, action-surface-ui and display-modes before their
  assertions. Their independent Chrome processes logged startup at the same07:04:58.208UTC boundary;
  subsequent browser cases passed. Stderr includes DBus warnings, which alone do not establish cause.
- The aggregate and UI lanes now run test files with --test-concurrency=1, matching the existing
  browser-source lane. This removes simultaneous browser launches without retries, skips, relaxed
  deadlines or production scheduler changes. Harness startup-failure cleanup already terminates its
  owned child and removes its profile. CONTRIBUTING documents the scheduling contract.
- Pinned Node22.22.2: focused serial action-settings/action-surface-ui/display-modes checks PASS56/56,
  zero failures/cancellations/skips. Log /private/tmp/kplex-pr108-serial-browser-2026-10-10.log.
  Linux full verification remains pending on the corrected commit. No runtime source or shipped
  artifacts changed; prior native/manual acceptance remains applicable. No additional manual test needed.
