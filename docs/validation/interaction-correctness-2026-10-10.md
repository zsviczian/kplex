# Interaction correctness — 2026-10-10

Branch: `fix/interaction-correctness-2026-10-10`.
Base: `80f73619a68e634698f404ea8c61a58f276c0fbe` (merged PR #108).
Delivery: 29 changed/new files, no deletions, uncommitted. The temporary assignment document
remains untracked and is excluded from delivery. On 2026-10-10 the maintainer confirmed the fixes
and authorized commit/push, PR creation/merge, closing #24/#28/#51/#106 with the PR reference,
and updating local main. No versioned release is part of this publication. C14 remains accepted;
C15–C26 remain paused.

## Changes and findings

| Unit | Root cause and correction | Acceptance |
| --- | --- | --- |
| A / #106 | Control touch streams escaped to surrounding recognizers. A passive element-local boundary preserves native range defaults. Pane-fit controls stack above the bottom-left disclosure and scroll within short panes. | Focused Chromium and native Electron checks pass; physical Android/iOS remains pending. |
| B / #28 | Physical connector attachment sides were counted as semantic membership, yielding D right 3/1. Cached all-role classification and exact-target sets now give 1/1. | Portable fixture and six original-fixture native scenarios pass. |
| C / #24/#51 | Native trace proved same-file passive reopening reset drawing to Markdown. Exact canonical destination identity makes passive follow idempotent while retaining different-file companions. Embedded initial Markdown independently honors current marked `excalidraw-open-md` metadata. | Fifteen production-method follow tests, ten embedded-default tests and eighteen real-host scenarios pass; Windows remains pending. |

Two additional C races were independently reproduced and corrected: older passive preview could
finish after explicit same-file Go to source; duplicate observations could start coalesced native
opens before the requested file was published. Explicit native operations retire only leases for
their exact managed destination. Same-target pending observations share one request, whose pending
state clears on completion/rejection. Captured file/path/incarnation, native leaf, adjacency and
plugin lifetime reject stale mode/persistence work. Native `openFile` itself is not cancelable.

No custom range math, hold timer, default cancellation, global gesture listener, semantic classifier,
all-pairs scan or filter-driven acquisition was introduced. B preserves connector routing, certified
totals, count-only versus incidence proof, fill, evidence and edit authority. Transient section counts
retain their separate provenance; numerator calculation precedes viewport clipping. Existing lens
endpoint-survival conventions remain. C preserves explicit commands, source location, drawing
capability, owning-document focus, link-hook cleanup, openSequence and fit-on-open behavior.
No schema, ontology, parser-policy, source-cache format, scheduler, decode budget, persisted preference,
UI copy, dependency or Excalidraw sibling-source changes. Plugin version remains 0.1.0.

## Architecture and coding review

Independent review traced every changed production consumer and the exact native open/await
boundaries. The portable shell receives geometry/content; it never acquires preferences or host
state. The touch helper owns only its element's passive listeners and idempotent teardown. The
count accumulator receives classified values; GraphIndex remains the sole semantic/visibility
owner, with captured epochs and no new acquisition. Passive native completion retains exact
file incarnation, destination, request and plugin lifetime; explicit opens/source inspection are
separately tested. Existing command IDs, localization, device profiles and source formats remain.

Module/function TSDoc and comments were checked against actual ownership, cancellation, capture
limits and invariants; automated lint is not treated as documentation or reuse verification.
Installed native type checks and scanner complement this review. Test drivers use explicit disposable
configuration, fresh owned identities and finally-style restoration. No new production debugging
globals, network services, dependencies or sibling-source writes are introduced.

## Baseline evidence

Node 22.22.2 / npm 10.9.7; Obsidian 1.14.4 (installer 1.14.0); Excalidraw 2.28.1 enabled.
Unchanged baseline architecture 7/core 88, official Obsidian lint and real typed production build
passed. Baseline built/installed main `3875ea113ec3bf7a31ccc7d9336918c545368bd6ee28d35bd6350650a6c58305`,
styles `d5b3973600b9a082e600e7fcdb5b17284838bd82bd8e2bf949f01fdc9b77df73`.

- Native C: off retained drawing; recent/pinned/Sidecar switched drawing back to Markdown after
  settling with canonical toggle and registered command. Active leaf stayed correct. Trace:
  drawing switch → file observation → passive synchronization → same-file openFile → Markdown.
  Receipt: `/private/tmp/kplex-interaction-c-baseline-2026-10-10/report.json`.
- Native B: exact eleven root fixture bodies, read-only. Keep/Reflow cross-links on reproduced
  right 3/1; off gave 1/1. Clearing Quick restored 1. Semantic denominator left 2/right 1;
  source/build wrappers stayed zero. Receipt:
  `/private/tmp/kplex-interaction-b-native-baseline-badges-2026-10-10/report.json`.
- Native A: corrected actual right-drawer trace observed immediate/hold thumb/track changes and
  host bubbling in desktop iOS emulation, without drawer closure. The physical delay was not
  reproduced. Receipt: `/private/tmp/kplex-interaction-a-baseline-corrected-2026-10-10/report.json`.
  An earlier wrong-sidebar/unsettled-animation probe is discarded as acceptance evidence.

## Final verification and identity

Before the typography styling follow-up, `npm run verify:obsidian` passed in **791.329 s**, executing complete `npm run verify`, staging
and native smoke: architecture **7**, core **88**, aggregate **559**, UI **25**, portable sources
**333**, browser sources **428**, zero failures/skips. Official Obsidian lint, real installed
Obsidian types and production build pass. Receipt:
`/private/tmp/kplex-interaction-final-css-all-2026-10-10/report.json`.

Final full-run freeze identity: `1f72953dc70f2315aa06d4778e4a8466ff8df9a0a0b13746d967048e5d761741`.
Ledger: `/private/tmp/kplex-interaction-final-css-source-ledger-2026-10-10.json`.
Earlier 800.589-second pass predates the last CSS correction. Wide native comparison exposed a
stacked disclosure-size regression (30px versus shared 28px): inherited icon flex basis became
vertical. The scoped shell selector restores common sizing. The independent Chromium assertion
fails before and all four touch/layout cases pass after (11.255 seconds); receipts
`kplex-interaction-stacked-button-before-2026-10-10.log` and
`kplex-interaction-stacked-button-after-2026-10-10.log` retain the fail/pass pair.

Native UX fixture corrections and later driver-only edits preserve shared
typography inheritance, materialize owned creations before incremental patches, retry pending paths
only after observed cancellation, own and restore sidebar geometry, and reveal rows within their
area scroll. The on-demand vault has genuine local uncertified counts; native assertions preserve
that coverage instead of requiring an unavailable requested-scope certificate. Requested-scope
assertions retain complete parent incidence and candidate count proof; Child-01 avoids the fixture's
explicit Child-00 center demand. The CSS-only typography follow-up below is the sole subsequent production change; JavaScript remains identical.
Independent final portable focused run: **40/40**, **4.309 s**, Node 22.22.2. Receipt:
`/private/tmp/kplex-interaction-final-focused-2026-10-10.log`.
Delivery source identity: `85cb352300a92ed6b5e59f75c4349db6a208e8b7d8332ec9bfbde91e7411cc31`. Canonical sorted JSON contains base, branch and all 25
changed code/test/native-driver/package/style file hashes; four documentation files are excluded
from this digest to avoid self-reference. Ledger:
`/private/tmp/kplex-typography-stack-delivery-source-ledger-2026-10-10.json`.

| Final built and installed artifact | SHA-256 |
| --- | --- |
| main.js | 90a641a8f21dad9bb9d321c2cdec57f0ee4454420c52a663789cb8cf1cfadc31 |
| styles.css | da87b7b3a35522dedd63eb021f51e8458a389608dd5e5ccfd3fcb8036323506a |
| manifest.json | 19799fff9ae459130d707901e7c0d98b3e14a8567881a393f07d457c2fa8ec1c |

## Typography styling follow-up

The requested Image 1 arrangement now applies at every pane width: font size, label length and
node width each occupy a full-width card; the wrap checkbox and caption share a separate horizontal
card underneath. The typography group retains its existing width. Density, columns, disclosure,
zoom and saved values are unchanged. This is a stylesheet-only production change.

Focused actual Chromium tests pass **4/4**, **11.854 s**, including equal card widths, the wrap row
below all three rails, side-by-side checkbox/caption, pane bounds, opposite-control separation,
native touch/keyboard input and short-pane scrolling. Official `npm run lint:obsidian` and actual
installed-type `npm run build` pass. The initial sandbox run could not open its loopback server
(`EPERM`); the authorized Chromium run passes without skipped coverage.

The focused staging runner passes with matching built/installed artifacts and native smoke:
`/private/tmp/kplex-typography-stack-stage-2026-10-10/report.json`. Its report explicitly records
focused validation; the unrelated full suite was not repeated for this cosmetic follow-up.
Native `npm run verify:obsidian:interaction-touch` also passes touch, reload persistence, geometry
and cleanup on the current artifacts: `/private/tmp/kplex-typography-stack-native-2026-10-10/report.json`.
Existing physical-device and drawer-reopening limitations remain. The earlier native results below
are historical results on the previous stylesheet, with unchanged production JavaScript.

## Native results before the typography styling follow-up

Drivers run serially with all three explicit disposable-vault variables from CONTRIBUTING.md,
fresh `KPLEX_HOST_REPORT_DIR` directories and exact installed/build hashes. Chromium/mobile
emulation and trusted Electron events do not establish physical touch, OS keyboard or Windows.

| Command | Result | Receipt under `/private/tmp/` |
| --- | --- | --- |
| `KPLEX_GATE_USE_EXISTING_FIXTURE=true npm run verify:obsidian:interaction-gates` | 6/6 pass, final artifact | `kplex-interaction-final-css-gates-2026-10-10/report.json` |
| `npm run verify:obsidian:interaction-touch` | Touch, fresh-session persistence and geometry pass, final artifact | `kplex-interaction-final-css-touch-2026-10-10/report.json` |
| `npm run verify:obsidian:interaction-excalidraw` | 18/18 pass, final artifact; 17.326 s | `kplex-interaction-final-css-excalidraw-2026-10-10/report.json` |
| `npm run verify:obsidian:ux` | 56/56 pass, final artifact; 122.793 s | `kplex-interaction-final-css-ux-coverage-2026-10-10/report.json` |
| `npm run verify:obsidian:action-workflows` | 8/8 pass, final artifact; 44.359 s | `kplex-interaction-final-css-action-workflows-2026-10-10/report.json` |
| `npm run verify:obsidian:action-devices` | 3/3 emulated settings cases pass, final artifact; 7.525 s | `kplex-interaction-final-css-action-devices-2026-10-10/report.json` |

B: in Keep/Reflow cross-links on, D left 2/2 and right 1/1; off, left 1/2 and right 0/1.
Clearing Quick gives ordinary left 2/right 1. Source/semantic revisions and acquisition counters
remain identical; every measured rebuild/body/neighborhood/candidate-degree/pair call is zero.

A: eight native immediate/500-ms-hold thumb/track gestures on density and typography, intermediate
trusted inputs, no escaped control touch stream, no drawer closure, isolated camera unchanged,
outside-control drawer chrome still receives its gesture. Values reach disk and survive a fresh
mobile session after plugin reload. Actual pane fits 320/390/480/600/900 × 600 and 390/900 × 220
pass bounds, stacking, opposite-control separation, scrolled-input hits, native vertical scrolling,
collapse and absence of a hit shield. Separate Chromium 4/4 lane covers twenty rail gestures,
keyboard traversal, arrows, mouse/reset, cancellation/multiple contacts and value/focus on resize.

C: off/recent/pinned/Sidecar × toolbar-equivalent canonical toggle/registered command/trusted
shortcut retain actual drawing representation and active native leaf, without passive origin opens.
Different-file companion follows in configured preview; source inspection reaches line 1. Embedded
true starts Markdown source/preview, permits explicit drawing/Markdown changes and reapplies its
initial preference on away/back navigation. Ordinary notes lack drawing toggle; false/missing flags
retain a drawing default with its actual API mounted. Source fixtures cover missing cache,
later authoritative metadata, unavailable companion and stale/disposed opens and link-hook cleanup.

## Limitations, rejected probes and cleanup

A persistence limitation: after the test's Sidepanel retirement and plugin-only reload, the emulated
right drawer was attached and marked expanded but computed display:none with zero geometry.
Fresh mobile-shell recreation was required for visible persistence acceptance. Plugin-only last-
Sidepanel drawer reopening is not established. Preserve this bounded observation for later host-
lifecycle investigation; no production drawer CSS/workaround was added.

Rejected setup receipts remain separate: copied unqualified B links resolved to existing root notes;
metadata-ready did not prove incidence preparation; B navigation must await its mounted subscription;
gate badges are siblings under gate-wrap, not children of the gate. Native C eval lacked plugin
`require("obsidian")`, so the observer derives the real existing leaf prototype. Window capture
observes trusted chords before the native document scope consumes them. Mode assertion awaits the
adapter's completed preview restoration. A toggle hit accepts its nested SVG through button
containment. Product assertions, deadlines and test concurrency remain. The obsolete all-neighbors-partial
assertion was corrected to distinguish requested-scope complete parent incidence/candidate proof
from on-demand local uncertified coverage. Rendered badges and no-full-rebuild checks remain.
Native certified-proof acceptance is not claimed for the local vault; portable partial/count-only/
unavailable/coherent-revision tests cover that contract.

Full retries found two obsolete fixtures: rename's empty Map became the production absent-filter
null contract; the URL fixture supplies the actual retirement helper and ownership maps. Existing
assertions remain. Earlier passing full receipts predate the two native completion race fixes.
The final full receipt above accepts the delivered runtime and stylesheet. Native UX repeats retained all
width/wrap and relationship gestures and corrected the count-coverage fixture: they exposed saved overrides,
unmaterialized owned creations and prematurely read deferred proofs, inherited sidebar geometry and an authority-mode mismatch.
Canvas resize passed at the established fixture geometry after a wide-window failure. Setup was corrected
without changing production typography, indexing, coverage or deadlines. Failed receipts remain
separate (`final-ux`, `final-ux-inherited`, `final-ux-owned`, `final-ux-settled`, `final-ux-visible`, `final-ux-wide`, `final-css-ux`, `final-css-ux-owned-pane`); each cleanup passed.

Dedicated drivers restored configuration bytes, settings, workspace/native associations, 76 vault
files, original 1440 × 875 bounds, desktop mode, owned debugger/listeners/wrappers/hotkeys/leaves
and fixture folders. B's eleven existing bodies remained identical. No captured native JavaScript
errors in successful dedicated lanes. Final host audit passed: 76 files (74 Markdown), no owned fixture/controller/dialog/overlay,
only the original test-vault native window, debugger detached, desktop mode and 1440 × 875
bounds restored. Original desktop overrides remain label 49/width 230/font 10.2. Settings are
closed and no JavaScript errors are captured. Audit receipts:
`/private/tmp/kplex-interaction-final-host-audit-2026-10-10.txt` and
`/private/tmp/kplex-interaction-final-host-window-audit-2026-10-10.txt`.
The action workflow repeat had one lost read-only CLI progress response; its pre-existing bounded
retry preserved mutation ownership and the deadline. All eight assertions and exact cleanup passed.

## Delivery files

- `CONTRIBUTING.md`
- `HANDOFF.md`
- `Refactor plan.md`
- `docs/validation/interaction-correctness-2026-10-10.md`
- `package.json`
- `scripts/testing/obsidian/interactionExcalidraw.mjs`
- `scripts/testing/obsidian/interactionGateCounts.mjs`
- `scripts/testing/obsidian/interactionTouch.mjs`
- `scripts/testing/obsidian/ux.mjs`
- `scripts/testing/obsidian/uxLayoutEnhancements.mjs`
- `scripts/testing/obsidian/uxRelationshipEnhancements.mjs`
- `src/adapters/obsidian/embeddedMarkdownLeaf.ts`
- `src/core/plex/shownGateCounts.ts`
- `src/index/GraphIndex.ts`
- `src/main.ts`
- `src/ui/App.tsx`
- `src/ui/PlexGraph.tsx`
- `src/ui/components/LayoutControls.tsx`
- `src/ui/components/nativeTouchBoundary.ts`
- `src/ui/filteredGateCounts.ts`
- `styles.css`
- `tests/embedded-markdown-default.test.mjs`
- `tests/filtered-gate-counts.test.mjs`
- `tests/indexing.test.mjs`
- `tests/layout-control-touch-browser.test.mjs`
- `tests/layout-control-touch.test.mjs`
- `tests/linked-document-follow.test.mjs`
- `tests/support/browserTypeScript.mjs`
- `tests/ui-components.test.mjs`

## Maintainer checks — at most three

1. Physical Android (ideally iOS too): immediate and held thumb/track drags on density/typography;
   drawer stays open, controls stack above the toggle, short pane scroll/persistence works, normal
   canvas pan and a drawer swipe outside controls remain available. Approximately 3–5 minutes.
2. Reported Windows setup: linked recent/pinned/Sidecar toolbar and shortcut switches persist and
   target the drawing view. Embedded marked open-md note starts Markdown, permits Show drawing
   and returns to the selected source/preview mode. Approximately 4–6 minutes.
3. Original Note A / Alpha Hub fixture: Quick name contains note, Keep/Reflow/cross-links and
   clearing filter give the above D badge values with unchanged routes/readability. Visual only;
   mathematical sets are automated. Approximately 2–3 minutes.

No issue is closed on the basis of emulation or source readiness.
