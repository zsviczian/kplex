# Plex interaction and central-file integration

This follow-up contains fixes and new features on `2026-10-16-plex-interaction-updates`.
Base: `3294bea18093b33791830fb55d97d53c6e3c980a`, the authorized merge of PR #170 after its
complete CI retry passed. [PR #171](https://github.com/zsviczian/kplex/pull/171) stays draft; no release or merge is authorized.

## Delivered behavior

- Scrolling relation panels have transparent backgrounds, exposing connectors and directional tint.
- A draft connector uses the displayed source/target gate centers and the actual target direction,
  including scrolled children. Non-central gate drags do not highlight the center's relation areas.
- Connection highlights and dotted area outlines have independent Alt/Option requirements. Both
  default on when absent/malformed; explicit saved false remains valid. Area settings retains its
  explicit editing controls. All eight locales use the existing environment-aware modifier labels.
- Sibling body drops add a direct center relation through the existing composer/writer, preserving
  other relations and the shared parent. Existing direct-neighbor drags retain move behavior.
- Resolved native link drags, including Bases, use the existing navigation and relation-drop routes.
  Obsidian resolves the file; incomplete, unresolved, multi-file and unsupported payloads stay inert.
- Placeholder creation immediately remaps canonical and retained incidence, including inverse
  relations and navigation. Older full/progressive builds and source preparations cannot restore
  the placeholder. A newer, different physical endpoint rejects a stale creation intent.
- Existing visible, unbound File properties follows the active Plex's central physical file.
  Pinned/grouped panes retain their native ownership. Other native content hands authority back to
  Obsidian; non-file centers clear the pane. Main/popout leases retire with their exact roots.
- Node labels retain their compact delayed browser tooltip. A referenced accessible name removes
  the competing larger Obsidian tooltip, preserving full label/path accessibility, image titles,
  gate hints and explicit modifier-triggered page previews.

## Correctness and ownership

The existing GraphIndex rename/materialization boundary handles read remapping and revokes old
source proof. Ordinary rename guards remain strict; no new source acquisition, classifier,
scheduler, database format or semantic write authority is introduced. Materialization can cancel
an older private full build; ordinary managed-create catch-up remains the recovery owner.

The existing alias/rename regression now joins real semantic preparation tasks; flushing the
source cache alone does not imply semantic completion. Its assertions remain intact.

Native testing exposed a related task-lifetime defect: a count request registered under its
original path used the mutable page's new path in completion cleanup. A settled request could
remain pending indefinitely after rename/materialization. Admission now captures the path for
all request keys/lookups and explicitly rejects a moved page. Two held real-browser count tests
prove stale-proof rejection, complete retirement, fresh admission and zero extra reads/parses.

Properties uses a narrow, guarded native FileView loader verified on Obsidian 1.14.4. Loads are
serialized per destination; late completion checks both native file and editable metadata identity.
The host's same-file short circuit requires clearing stale metadata before reloading. Failed
reads do not retry on layout/header noise. Markdown-only metadata semantics prevent unsupported
files from creating a load loop. No synthetic file-open, native activation or graph demand is used.
Native Properties may legitimately read Markdown to display it; this is distinct from graph work.

## I1 validation (`6835353`)

Windows 10.0.26200, Node 22.22.2, Obsidian 1.14.4 / installer 1.14.0. Only the authorized disposable
`kplex-test-small` was used, initially 107 files, including the maintainer's `test base.base`.
Owned synthetic notes/Bases exercise mutation; no personal vault was accessed.

| Check | Result |
| --- | --- |
| First strict `verify:obsidian` | Pass: 2,041 tests across architecture/core/general/UI/source/source-browser groups, official lint, installed types, real build and exact native smoke. This predates the two final identity/task fixes. |
| Focused final materialization/count checks | 15 real-browser cases, official lint and installed type-check pass. |
| Final strict `verify:obsidian` | Pass: 2,044 tests (7 architecture, 128 core, 906 general, 127 UI, 334 source, 542 source-browser), no failures/skips/cancellations; official lint, installed types, production build and exact native smoke. |
| First complete native interaction run | 13 functional cases pass, plus a fixture observation; exact pre-final-fix artifact. Actual Settings, trusted gate/area input, four sibling additions, held-build promotion, actual Bases link navigation, Properties identity/pinning/overlap/non-Markdown/popout. |
| Final native interaction | Two final runs each pass 14 cases, plus one fixture observation: actual Settings and trusted area/gate input, all four sibling additions, rendered placeholder reconciliation during a held build, Bases navigation and child linking, Properties following/pinning/overlap/non-Markdown/popout. Cleanup restores all files/configuration and leaves zero owned gate tasks; live active/pending preparation are both false. |
| Final native hover | 7 main/popout/Settings cases pass; zero body reads, parses, acquisitions, semantic refreshes or search rebuilds in tested intervals and separately recorded view setup. |
| Final native touch | Pass: 8 trusted range gestures, saved-value reload, pane geometry and independent cleanup. Original CLI debugger state restored. Desktop emulation is not device acceptance. |
| Final gate/filter resource lane | Fails in two runs, including an isolated reload. The unchanged resource assertion stops before completing the visual matrix. Recorded oracle-to-failure delta: source revision unchanged, semantic revision +9, acquisition.checked +9; zero fresh reads/parses/builds or wrapped body/neighborhood/degree/pair preparation calls. Cleanup passes. |

The native geometry comparison changes an opaque `rgb(40, 40, 40)` panel to
`rgba(0, 0, 0, 0)`. Scrolled left-to-left draft endpoints match actual gate centers within
0.001 screen pixel in the tested fixture, approach from the left and show no spurious relation
area. Tested area Settings/hover/draft intervals observe zero builds, semantic refreshes and
source acquisitions. These are operation counts and geometry observations, not CPU benchmarks.

I1 runtime artifact SHA-256: `852d2c8ef8bd1f3949396a06f7eec70ed2b2607cdb9d4fc66c5700d140c66700`.
CSS: `2bf34f58c561564fd890abae90946db04894fa53012b32bee3b6739ace013f4c`; manifest unchanged:
`19d9ecce5557733e0ff0f2e27155e635c30158c3cfa6fbca0f11c16e4dedfd2c`.

## Controls, evidence and reproduction

Raw trials remain local under `%TEMP%/kplex-interactions-2026-10-16/`; configuration/runtime
backups prefixed `private-` are private and must not be published. A durable local copy lives at `%LOCALAPPDATA%/kplex-validation/pr-171/`: 110 files,
12,724,181 bytes, independently checksum-verified. It includes exact artifacts, final source
snapshots, raw trials/failures, drivers and source references. `SOURCE-RECEIPT.json` binds source
blob identities to `6835353ccb82ee7cbee1f63c65470e51c62ab00e`; its SHA-256 is
`a6dc7a75eff5e09a165af9d4d5be4ba1c56eee96310b5819d70518505afd555d`.
`MANIFEST.json` SHA-256:
`f2203757209e9a6cfcf823a720472aa1cf4dfe2aeb18b0995db5004e4c035665`.
Six private backup/raw-touch files are separately copied and verified at the sibling
`pr-171-private/`; they are excluded from the main manifest. Original raw files are retained.
HANDOFF is excluded from all evidence copies. No new public evidence archive is approved.

Retained failed controls include the initial long CLI deadline and unfocused input, empty owned
folder deletion without the native force flag, incomplete sibling fixture preparation, a Bases
selector that assumed a non-virtualized row/data-href, and the pending-count-task failure above.
The final PowerShell wrapper reported a `NativeCommandError` for npm's stderr notice; every
verification group and the structured native verification report pass. The notice/transport
record is retained rather than relabeled as a failing test.

The real native overlap control proves file B / editable metadata A after an older load finishes.
The pre-task-fix GraphIndex snapshot was reconstructed by reversing only that method patch;
SHA-256 `f6f66666930cacb6c3fcf97acfe4e61ebf6edf5dd0517acb104d1b4cebca2116`.

Stage with strict `npm run verify:obsidian`, using CONTRIBUTING's three explicit disposable-vault
variables. Then run `verify:obsidian:interaction-updates`, `verify:obsidian:hover-highlight`,
`verify:obsidian:interaction-touch` and `verify:obsidian:interaction-gates` serially with fresh
report directories. The interaction fixture prepares the actual shared-parent scope before
measurement, independently of optional sibling-enrichment timing. Setup builds/acquisition are
excluded from presentation-only observations. The touch lane needs exclusive debugger ownership;
release only idle CLI capture and restore its previous state afterward.

Final restoration passes: original 107-file inventory, no owned notes/controllers, original settings
keys (with the new area-outline default enabled), desktop layout/bounds, original CLI debugger
state and all four original configuration files byte for byte. The validated artifacts remain
installed. Live preparation is neither active nor pending. Private backups are retained.

## Remaining acceptance

- Actual macOS Option/menu and main/popout lifecycle require separate host acceptance.
- Physical Android/iOS touch, external-keyboard delivery and mobile WebView behavior remain
  separate from trusted Electron input and desktop emulation.
- Native File properties uses guarded private host behavior; other Obsidian versions need acceptance.
- The broader gate/filter resource lane is **not accepted**. PR #170 historically completed five
  display cases before failing on clear (+1 check/publication). The final source fails the resource
  assertion earlier: neither run completes that matrix, and both record +9 checks/publications
  over the oracle-to-failure interval. That interval includes filter setup; it is not a per-toggle
  benchmark. Zero fresh reads/parses/builds does not prove zero work. The cause and CPU cost remain
  unproven. Retain the assertion and investigate readmission/publication separately; no performance
  optimization or assertion relaxation is included in this feature batch.

The requested behavior passes Windows feature acceptance, but the PR remains draft for review
with the resource-lane and platform limits above. No merge or release.

## Node tooltip follow-up

The native baseline at `08f620f` has an inner text `title` and outer node `aria-label`.
Trusted hover observes Obsidian's separate `.tooltip` showing the outer name; Chromium owns
the compact delayed title outside the DOM. Reuse the canvas's existing `useId`,
`.kplex-accessible-name` and `aria-labelledby` pattern on each node. No CSS, shared tooltip
scheduler, gate hint, page-preview gesture or semantic owner changes. Repeated node occurrences
have distinct accessible-name IDs and retain stable IDs during rerendering.

Validation on the unchanged Windows/Node/Obsidian environment above:

- Full strict `verify:obsidian`: **2,045 tests pass**, including 128 UI tests, with no failures,
  skips or cancellations; architecture/core, official lint, installed types, production build and
  exact native smoke pass. Runtime and regression sources remain unchanged after this run.
- Focused browser/component checks: 9/9 pass, covering ordinary/thumbnail/replacement nodes,
  exact accessible names, unique/stable occurrence IDs, full compact titles, gates and page previews.
- `KPLEX_TOOLTIP_NODE_ONLY=true` with `verify:obsidian:tooltips`: **5 scenarios pass**, including
  main/popout/returned node and gate hints, canvas and retired-owner cleanup. Each node observation
  waits 2,200 ms with no styled node hint; gate hints still appear independently. This explicitly
  limited scope excludes the separate menu/color checks. Native DOM does not establish exact
  Chromium tooltip-chrome paint or physical-device behavior.
- Exact-build interaction rerun: **14 cases pass** plus the fixture observation; hover rerun:
  **7 cases pass**. Cleanup restores 107 files, settings/layout/bounds/debugger and four configuration
  files byte for byte; no owned files/controllers, pending or active preparation remain.
- The extended native check correctly rejects the old `852d2c8e` runtime for retaining the duplicate
  node owner. The first complete-control run on the new runtime passes 12 scenarios, including the
  main node check, then fails at its obsolete `.kplex-background-modal` selector. Preserve that
  failure; it is not a complete control/color acceptance pass. Focused node scope reuses the same
  driver and all assertions, without changing production behavior or the unrelated color editor.

Current runtime SHA-256:
`fbe9eaa3ba01e0b9c9634ddb5b82fc62503fb3d90da27be025547560182c1c85`.
CSS and manifest hashes remain those recorded above. Source identities, raw old/new trials, failed
controls, full logs, reusable driver snapshots, exact artifacts and restoration receipts are retained
separately under `%LOCALAPPDATA%/kplex-validation/pr-171-node-tooltips/`, with per-file checksums
and `SOURCE-RECEIPT.json`; TEMP originals remain under `kplex-node-tooltips-2026-10-16/`.
The original 110-file evidence set is unchanged. No evidence archive is published.

CI passes on both earlier checkpoints (`6835353` and `08f620f`); the new push requires its own CI.
The broader gate/filter resource lane, macOS and physical-device acceptance remain unaccepted.
No source-acquisition, semantic, CSS, settings or shared-tooltip behavior changes in this follow-up.
