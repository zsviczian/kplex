# ExcaliBrain migration validation — 2026-09-27

The maintainer-provided real-life fixture now has portable regression coverage and a strict native Obsidian CLI lane. Both passed on the uncommitted `excalibrain-migration` branch based on `7ba82a0`. [Machine-readable evidence](excalibrain-migration-2026-09-27.json) records the fixture, reviewed source and exact staged artifact hashes. Refactoring remains paused at C14; this is a feature/regression change, not a new refactor checkpoint.

## Fixes

Imported node styles were correctly retained in `tagNodeStyles` and consumed by the renderer, but the manager only listed `noteTypeStyles`. **Node styles** now lists both families with distinct ownership, even when names coincide. Imported entries expose their legacy label prefix. Editing, renaming and deleting operate on the legacy dictionary and preserve the original prefix-match priority; untouched colors retain alpha and absent fields remain inherited. New/changed captions use the English localization catalog. The maintainer's `button.kplex-style-manager-row { height: fit-content; }` adjustment lets manager rows grow to fit their content and is included in the final verified CSS.

Stored relationship overrides outside current ontology assignments are now available in **All relationship fields**. The native rendering test also exposed a separate lookup mismatch: the index emits `inspired-by`, while the imported override is keyed `Inspired by`. The resolver now falls back to equivalent legacy spelling, retaining exact-key precedence and the original persisted dictionaries. Regression tests exercise both original and index-normalized names for every imported override, including explicit-key precedence.

## Automated evidence

- Node **22.22.2**, real installed Obsidian declarations **1.13.0**, full `npm run verify`, production build and `git diff --check` passed.
- Architecture: **34 migrated roots / 75 reachable files / zero violations**. **7 architecture, 58 restricted-core, 96 aggregate Node and 4 browser checks** passed. The aggregate includes **5 migration tests**. Existing indexing/golden checks remain enabled and unchanged.
- Official Obsidian ESLint: **zero errors / the same 24 legacy warnings**.
- The fixture's **32 tag-node definitions and 297 hierarchy-link entries** are compared in full, including empty overrides, casing, Unicode prefixes and alpha. Checks also cover compatible preferences, ontology precedence/exclusions, persistence stability, built-in icon migration, K-Plex-only preferences, legacy friends fallback and independent manager families.

The final `npm run verify:obsidian:migration` run passed sequentially in Obsidian **1.14.2**, vault **kplex-test**:

1. Build, exact artifact deployment, registered command, rendered Plex and captured-error smoke.
2. Real import modal file-input event and Import button; complete live and disk-persisted fixture/settings assertions.
3. Actual rendered **Node styling → Node styles** and **Link styling → Relationship-specific styles** pages. Every imported node-style name and nonblank normalized link-style name appeared after bounded list expansion. Opening #person and Inspired by verified their prefix and color controls. Custom/all relationship scopes were checked.
4. Saving unchanged #moc preserved the complete tag dictionary and match order, including **`#6e0707b2`** transparency.
5. Temporary notes indexed and were selected through the actual Plex search result. The rendered source label contained **`🧑 ⚙️ `**, its border was **`rgb(247, 206, 70)`**, and the Inspired by connector used **`rgba(254, 251, 65, 0.6)` / width 2**.
6. Plugin disable/enable and start retained the imported ontology/styles/settings. No captured JavaScript errors remained.
7. Cleanup restored pre-test settings, removed only owned temporary notes and the diagnostic controller, and waited for indexing to settle. The final build remains installed in the playground.

The final native lane was rerun after the maintainer's CSS adjustment, with all checks passing and build/installed CSS hashes matching.

Installed `main.js` SHA-256: **`4cdf0f9791c8104dd8eae0368a6a9026882ff3109e0bebba6b5ccf974c43a1e0`**. Manifest and CSS hashes also exactly match the build; no production diagnostic hook was added.

## Reproduction and limitations

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for the three explicit disposable-vault variables and `npm run verify:obsidian:migration`. Without Obsidian, the portable fixture tests remain in `npm test`; unavailable/failed native verification is not silently treated as a pass.

Harness-development attempts are not acceptance evidence. They exposed Settings popout ownership and nested-modal closure issues, generated-script errors, and the difference between persisted focus and real search activation. One earlier window/CLI stall required the maintainer to restart Obsidian; the final corrected scripted run completed without intervention. Native assertion failures led to the link resolver fix rather than weakening the expected style.

This test injects a File through the real file input; it does not automate the operating system's picker. Settings inspection uses the owning document and closes the nearest plugin modal. macOS foreground focusing supports initialization; background throttling is not changed. The narrow portable Obsidian double is not host acceptance. No physical-device, theme-parity or statistical performance claim is made, and reload assertions account for intentional test navigation rather than claiming unchanged history after navigation.

## Prioritized manual recommendation

**P1 — optional visual/touch confirmation:** In the playground, import the fixture, open #person and #moc under **Node styles**, and inspect the displayed prefix, border and translucent color. Open Inspired by under link styles and compare its yellow width-2 connector in a note pair. On a physical phone/tablet, confirm editor scrolling and save/cancel remain comfortable. Automated desktop host checks cover the migration regression; physical touch and community-theme appearance remain manual. No additional manual check is required to establish the automated migration result.
