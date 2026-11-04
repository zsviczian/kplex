# PR #278 shared UI and Daily Notes validation

The subsequent [CTA/Pins follow-up](cta-pins-follow-up-278-2026-11-04.md) records
the latest artifacts and delivery. Results below retain their original hashes.

**Implemented; available Windows checks passed. Changes remain uncommitted** on
`2026-11-03-issue-277-creation-links-compass`, base `c0e6166`. This supersedes the
shared-form status in the [earlier UX report](authoring-compass-278-ux-2026-11-04.md).
The [JSON record](ui-harmonization-278-2026-11-04.json) retains actual receipt
hashes, artifacts, cleanup and earlier failures.

## Shared ownership and behavior

All 26 direct modal consumer modules now use `KplexModal`, extending native
Obsidian `Modal`; inherited editors use the same shell. Suggestion-only dialogs
retain `SuggestModal`. The shell leases/releases the existing mobile
VisualViewport accommodation, preserving native scroll and dismissal ownership.
29 modules directly use `FormSetting`. Authored fields/textareas are full width
with labels above. React uses `FormField`, `FormSelect` and `FormActions`;
Drawing template and After saving share one select. Explicit footers keep
progress left and accessible icon actions right.

Native controls retain Obsidian typography, height, caret, shadows and insets.
Ontology selection uses a native outer dropdown skin with an editable transparent
input and browse area, without a second boxed caret. The final native comparison
matched all 12 measured properties with core Editor/Daily Notes Settings. The
cancel X and other footer buttons have equal top edges/heights after removing
the legacy fixed-height group.

Linking/imports share `RelationshipFieldControl`, canonical ontology annotations
and the same editor. All six directions remain editable; a drop supplies only
the initial direction. One shared import destination/relation, exact-file retry,
bounded discovery and captured native identities remain.

Confirmed configured daily pins call guarded core Daily Notes `getDailyNote(date)`,
applying the actual template/default new-note parent. K-Plex retains confirmation
and remembered opening destination. Captured day/path/identity checks remain;
missing capabilities/template failures do not silently create empty substitutes.
Metadata-date projections/signatures and custom-period creation remain unchanged.
[UI_RULES.md](../../UI_RULES.md) is mandatory from AGENTS and coding standards,
with regression gates for shared shells, fields, typography and tooltip owners.

## Automated evidence

Pinned Node **22.22.2**, installed Obsidian types, release checks, official lint,
portable contracts, architecture/numeric guards and production build passed.

`npm run verify` completed **2026-11-04 13:35:16 UTC**, exit 0: **3,980 tests
passed, zero failed/skipped**, groups 9 / 133 / 2,074 / 504 / 360 / 900, plus
the custom indexing fixture. Log: `%TEMP%/kplex-278-ui-verify-final4.log`.
It began before the final native-skin/footer follow-up, so it is not frozen
whole-suite certification of those late UI changes. Semantic/index owners did
not change during that follow-up. Final UI coverage consists of **26/26** focused
browser checks, exact-build native checks below, repeated official lint and
architecture checks, and the final installed-type production build. No further
indexing/persistence aggregate was run solely for styling, following AGENTS.

A concurrent aggregate attempt observed **55.4 ms** at the unchanged URL-heavy
patch timer bound (**<50 ms**). After other work completed, standalone
`node scripts/run-indexing-tests.mjs` passed, including that bound, P1-P17,
startup admission/convergence, settings independence and restore watchdog.
Contention is plausible, not proven; no assertion/deadline was relaxed.
Log: `%TEMP%/kplex-278-ui-indexing-serial-final.log`. The full run's real
IndexedDB 20,015-owner stress case also passed.

Earlier failures were resolved: obsolete direct-button checks/finite inventories;
seven repaired host families **171/171**; Settings row lookup **15/15**;
Facets/support **24/24**. One was a real CSS code-font regression, fixed with
a shared monospace exception. The aggregate browser group then passed **504/504**.

Final delivered input fingerprint: **983 files**, SHA-256
`76945c12f82949db17d10c985025e4e19e192c063123f74d6122001ff21207e8`.
This does not claim the earlier aggregate started from that fingerprint.
Final lint/architecture passed: 260 migrated roots, 463 reachable files, zero
violations; numeric guard checked 210 sources.

## Native evidence

Windows Obsidian **1.14.5**, explicit disposable
`C:/Obsidian/kplex-test-small/.obsidian`; baseline **117 files / 98 Markdown**.
Every lane held the shared application lock, verified artifacts and restored exact
settings/enablement bytes, workspace/layout, geometry and fixtures. No production
testing or whole-application restart was used.

| Final exact-artifact lane | Coverage | Receipt suffix |
| --- | --- | --- |
| Controls | Core native skin, unboxed disclosure, trusted browse/Escape, four footer top edges/heights within 0.5 px | `gBDpQf` |
| Authoring | Ontology child Cancel/Save/focus, owner flips, properties, revalidation | `BuZZtf` |
| Imports, popout | Trusted Files drops, editable Parent direction, shared editor, exact retry/bytes, recursive directories | `m4PEqg` |
| Lifetime | Close/migration retires child controls and unaccepted import work | `0siDvf` |
| Forms, popout | Light/wide and dark/narrow fields, options, glyphs, dividers, declarative textarea | `jeUPB1` |

Earlier scope receipts preserve their actual preceding artifacts in JSON: folders
`qq3Uw3`, structural `GW82eI`, periodic `hk8gLU`, Compass `sxRfuU`, pins
`HP2NMX`, navigation `tpfd6A`, daily template `4he5da`. They are not relabeled
as final-artifact runs. Folder creation at 3 versus 103 unrelated notes required
five inspections, one read/parse, zero global inventory/head passes, no full build.
Daily template coverage used core creation, token expansion, configured/default
destinations, Cancel and missing-template failure.

Native screenshots were directly reviewed, including core Settings and the final
aligned footer. Light/dark, narrow windows and popouts were inspected. Template
control geometry used owned paths with injected drawing availability for layout;
it does not establish companion drawing creation. Earlier full-width/spacing
failures were fixed without weakening gates. Template-fixture cleanup was repaired,
exact owned leftovers removed, and accepted runs restored the complete baseline.

## Delivery and remaining acceptance

Final artifact SHA-256:

- `main.js`: `926dc454c05c7a49f1cbf4e2a596445fd4ec1c2e68313b56895969806e82f173`
- `styles.css`: `e0f104e4ee388eb39182a20f257667631879ff560f4621a918c545bc4953cb7e`
- `manifest.json`: `8c65b0d38a506f8fa9fc3311b81ea22bcda48e0209e9190483752c1f20834326`

At the maintainer's request, only `main.js`/`styles.css` were deployed/hash-verified
in Zsolt's Brain at **13:15:24 UTC / 14:15 Budapest** for Sync to the Mac.
Previous binaries are backed up under `.test-work/deploy-backups/`; receipt:
`.test-work/brain-ui-deployment.json`. Notes/settings/workspace/manifest were not
written; no production reload/testing was performed. The final aggregate build
reproduced those deployed binary hashes.

Residual risk is **moderate**: shared UI/community themes and expanded create/
import/move interactions. Physical mobile keyboard/touch/IME and macOS runtime
acceptance remain separate. Core Daily Notes is an optional unpublished capability
tested on 1.14.5; absence fails visibly. Actual companion drawing creation is not
claimed. The UI/template follow-up changes no schema, dependency or version.

Prioritized review: (1) Mac create/link/import control skins, footer alignment and
independent After saving choices; (2) physical mobile long ontology editing with
keyboard visible and actions reached by scrolling; (3) configured daily-pin
creation with actual template and chosen opening destination. Uncommitted for review.
