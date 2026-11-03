# Facets preset node presentation (#272)

Implementation was returned uncommitted for review on `2026-11-03-facets-preset-node-presentation`,
after normally merging accepted main into the original spec-only PR head
`22c79896d8963ff2342a7274b5778267556cacbd`. Integration checkpoint:
`56a1c10982e9e10ad935e9f4c61c89c0afe5c2b3`.

The preceding, separately authorized #259 replacement was published and merged
as `d6ffedc79300fac6e4aa0c131faefe4116abbcff`. Local main was switched to,
fetched and fast-forwarded before #272 implementation. #272 remains draft and
unmerged. No production-vault deployment, release or issue closure occurred.

## Implementation and compatibility

Two independent optional booleans live on each version-1 Facets preset:
`focusInCategory` and `centerAnchoredLinks`. Missing values mean false. Existing
presets, schema versions and per-canvas selection state retain their behavior.
The canonical classifier alone determines membership. A uniquely assigned
attention occurrence enters its category, using existing measured attention and
editor dimensions. Other classifications retain one central occurrence. Layout
packs the contained focus without reserving a nonexistent central duplicate.

The optional projection policy `connectionPresentation: "node-centers"` selects
the shared rounded-body connector geometry and hides gate elements. Canonical
ports, relationships, styles, evidence and action targets remain intact. Scroll
aperture clipping preserves collinearity. Decorative category guides and default
Compass/Mind Map routing remain unchanged. Hidden gates have no gate-drag target;
the native node menu opens the existing relationship composer instead.

Detached native preset drafts, guarded Save, Cancel, Reset, portable package
admission/export and the existing serialized writer are reused. Known optional
values require booleans. Unknown/future compatibility remains with the existing
configuration owner. Four new strings are translated in all eight catalogs.
No parser, index, source scheduling, semantic publication or persistence-cache
implementation changed. C15–C26 remain paused.

## Automated evidence

- Before implementation: the new projection/layout matrix had nine failures;
  seven cases describing existing behavior already passed.
- Focused source, geometry, browser-manager and portable package run: **50 tests
  passed**. The subsequently strengthened overflow/filter browser case also
  passed independently.
- Browser matrix: all four toggle combinations across circular, concentric,
  vertical, horizontal and valid four-category quadrants. Actual shared-canvas
  cards and SVG paths are measured after camera transforms. Coverage includes
  larger single attention cards, default Bezier routing, independent presets and
  Classic, classification fallback, real overflow/manual scrolling, clipped
  center lines, canonical crosslinks, hit-path hover, reflow filtering, resize,
  theme change and cache-only navigation. Source work is counted independently.
- Preset manager: missing fields default off; sequential independent toggles
  survive the existing writer/reopen path; Cancel and canceled Reset write
  nothing; saved Reset restores both defaults; other presets remain unchanged.
  Portable export/admission/import round-trips all four combinations and rejects
  strings, numbers and null. Existing future/unknown-field suites remain active.
- Production build with the actual installed Obsidian typings: passed on
  **Node 22.22.2**, Obsidian typings **1.13.0**.
- Existing 20,015-owner cached-publication case passed unchanged: **8,187,369
  owner checks, one direct canonical pass, one publication, two cancellation
  yields**, with optional root closure conservatively deferred. Measured cached
  publication was **152,325.7 ms**, compared with the previous #259 receipt's
  approximately 154.6 seconds on this machine. This is evidence of preserved
  fixture performance, not a production-vault navigation benchmark.
- Required `npm run verify`: **passed completely** on Node 22.22.2, including
  release metadata, architecture (9 tests), portable core (133), lint, main
  (1,990), browser (470), portable sources (359), IndexedDB/source lifecycle
  (894), and the actual installed-type production build. The initial run's
  1,990-test main group passed; four older extracted-node
  fixtures omitted the newly shared corner-radius import. React consequently
  retired their trees, including the stable-style-cache fixture. Adding the real
  helper import fixed all four with their original assertions unchanged. The
  focused rerun passed **4/4**, followed by the successful complete aggregate
  rerun. No assertions were removed or relaxed.

Both new test files are in the executed `npm test` inventory. Existing Facets,
portable, editor, default-view and localization checks remain enabled; no timing
bound, semantic assertion or source-work assertion was weakened.

## Exact-build native Windows evidence

Final expanded native receipt: `kplex-272-native-rCeeuR`,
`wuxing-220-node-presentation.json`; both the inner controlled probe and outer
staging/restoration receipt **passed**. The adjacent JSON records hashes and
results without depending on temporary logs.

Final fully verified and natively accepted `main.js` SHA-256:
`5a9d63134c478a44252b7f2df5c89cb2f0870711b80eae3314af33c3095433cc`.
The final translated build was redeployed and the entire native lane rerun;
both the installed artifacts and final `dist` match that receipt.

Target: existing disposable **kplex-test-small**, explicitly validated CLI vault
and configuration identity, 117 files / 98 Markdown notes before eight owned Markdown fixtures, shared
application-user-data lock. Obsidian **1.14.5**; host Node **24.22.0**, Electron
**43.8.3**, Chromium **150.0.7871.250**. Build/driver Node was **22.22.2**.
This is a functional local-neighborhood fixture, not a scale benchmark or a
claim that the vault's global semantic coverage was complete.

Native assertions passed:

1. All **20** layout/toggle combinations, unchanged canonical incidence, manual
   camera intent and measured attention emphasis. During this closed toggle
   interval: **0 vault reads, 0 parses, 0 semantic acquisitions, 0 rebuilds**.
2. A real dirty attention Markdown editor retains its native leaf, text and
   caret through central/category toggles, classification fallback and native
   window resizing. The overlay follows the measured card; Sidecar uses the
   canonical document; collapse saves the typed fixture text.
3. The native neighboring editor opens with gates hidden, preserves attention,
   dirty text/caret and exact overlay geometry at both actual scroll extremes,
   uses the current legacy `rect(...)` document clip when partly hidden, and
   saves on collapse.
4. The actual node context menu opens the existing relationship composer.
   Cleanup closes that exact registered native Modal owner; no relationship is
   submitted. This does not claim an Escape/OS-keyboard acceptance pass.
5. Visible canvases selecting the same preset receive live shared updates.
   A different preset in a popout retains its own gates/placement and session
   through main→popout→main migration and another preset's live update.
6. Navigation to assigned and unassigned notes retains a single usable focus
   and the correct category/central fallback.

Every fixture, demand, observation wrapper and owned host was removed; original
settings, layout, window bounds and exact settings/enablement bytes were restored.
The candidate artifacts remain installed only in the disposable vault.

Earlier probe attempts are not counted as passes: the first run exposed delayed
native plugin-enablement persistence during baseline capture; staging now waits
and checks the actual enabled-plugin list before capture. A scroll assertion
initially checked obsolete `clip-path` instead of the existing native `rect(...)`
owner. A shared-canvas assertion initially used an inactive tab; the final check
uses two genuinely visible split canvases. Composer cleanup now uses the exact
registered native Modal owner rather than assuming a close-button selector or
claiming synthetic Escape success. Scenario cleanup and outer byte restoration are reported separately.
Outer restoration passed on these attempts. No production behavior or test
deadline was changed to conceal those failures.

## Remaining risk and device checks

The principal residual risk is shared-renderer interaction at unusual editor,
card-size or scroll combinations when the options are enabled. Existing defaults
are preserved, and the exact native/default-view regression coverage limits this
risk. Source/index behavior was not modified; zero-work observations are scoped
to the actual toggle interval, not to editing or navigation in general.

Unavailable acceptance remains explicit:

1. **macOS:** repeat dirty attention/neighbor editor scrolling and
   main→popout→main migration; expect the same canonical document, text/caret,
   clipping, controls and preset isolation. Windows cannot establish macOS
   native lifecycle behavior.
2. **Physical phone/tablet:** enable each option in the preset editor; pan/zoom,
   scroll a populated category, edit a note and use its menu to add a
   relationship. Expect usable controls, one active card and no hidden gate
   target. Desktop browser/native automation is not physical touch evidence.

No production `Zsolt's Brain` content or configuration was accessed or changed
for this feature. The maintainer subsequently authorized commit, publication and merge of #272 on 2026-11-03. Release remains outside this task.

Publication authorization: the maintainer approved committing, publishing and merging this exact validated implementation on 2026-11-03. The runtime source and artifact hashes above remain unchanged.
