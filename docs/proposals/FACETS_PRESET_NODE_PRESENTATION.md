# Facets: preset-specific focused-note placement and gate-free connectors

**Status:** Implementation brief, not implemented. Draft PR, 2026-11-03.
**Base:** Current accepted `main`. **Scope:** Facets only, across all Facets presets; no Wu Xing-only special case.

## Goal

Add two **independent, off-by-default settings per Facets preset**, edited alongside existing Facets preset settings:

1. **Display active note in matching container**
2. **Hide gates, all links to originate from node center**

These options must be saved in the **individual preset definition**, not global K-Plex settings, not all Facets instances, and not the per-canvas selected-preset state. Two canvases selecting the same preset share these options; two canvases selecting different presets can behave differently. Existing presets, imported presets and existing saved canvases retain current behavior until toggled.

The supplied Wu Xing screenshot illustrates the desired arrangement: when the focused note is classified as Water, its **one** visual representation appears as a slightly larger, clearly selected pill inside the Water category with its related notes. The category containers, categories/colors and explanatory Wu Xing guides remain unchanged.

## Behavior A: focused note in matching container

- When enabled and the active/focused note resolves to **exactly one assigned category**, display its existing attention occurrence *inside that category* rather than at the central position. Do not also draw a second central copy.
- Make the focused note visibly larger than neighboring note pills, using the existing selected/attention styling plus **measured** size/layout so scroll, clipping, hit targets, editor expansion, accessibility and connector geometry agree with what is painted. Keep the emphasis modest and readable; do not hardcode a Wu Xing color.
- Preserve the logical focus/attention identity, selection, navigation, breadcrumbs/previous notes, native central-document editor/Sidecar policies, hover/link interaction, classification, relative Wu Xing labels, and relationship meaning. Position is presentation only. A change of focus reclassifies the new active note and repacks the relevant areas without stale duplicates or camera jumps.
- For unassigned, conflicting, checking, unresolved or otherwise unavailable classification, retain the current centrally placed focus as a predictable fallback. Do not guess a category, silently edit properties, or render the note twice. If a category is absent after preset changes, use the same fallback.
- An empty or single-note category remains visible and usable. Handle category scroll surfaces, bounds/resize, diagonal/rectangular/concentric layouts, drop overlays and filtered results. The active note must not vanish behind an area clip or be counted twice.
- If the option is disabled, preserve today's center-focused layout and size. Keep layouts deterministic and reuse the existing Facets layout/measurement mechanism.

## Behavior B: hide gates and anchor links to nodes

- When enabled, **hide the visual gate handles in this Facets preset** (for focus and neighbors), and route every rendered **actual note relationship connector**, including supported crosslinks, using the source/target node centers as the geometrical endpoints. Clip the visible strokes to each node's boundary so links do not draw across card labels; preserve relationship direction, arrows, styles, highlighting, evidence, filtering, culling, hit-testing and correct updates during movement/reflow/resize/zoom.
- Apply this consistently whether the focused note is central or located inside a category (both toggles must work independently). Keep the existing decorative Wu Xing generating/regulating guides and workflow guide routing untouched: they represent category-to-category explanations rather than note relationships.
- **Gate presentation is independent of the graph model.** Do not delete canonical roles/ports, disable relationship semantics, change index/gate counts or introduce an alternative edge classifier. Investigate shared rendering/edge conversion and select a scoped presentation policy, not a global gate preference.
- Preserve discoverable node-level actions for relationships and any supported modifier-hover/drag/edit behaviors. If an interaction fundamentally requires a visible gate target, provide a consistent Facets-only alternative or make the trade-off explicit in the implementation/UX; do not silently remove important editing affordances.
- When disabled, keep existing gates and port-specific routing exactly as they behave today.

## Settings, persistence and compatibility

- Extend `FacetPreset` (`src/core/plex/views/facets/contracts.ts`) with two optional booleans (suggested: `focusInCategory?` and `centerAnchoredLinks?`). **Absent = false**. Choose final names according to conventions; use explicit validation in `validation.ts`.
- Add two native toggles to the existing `FacetPresetEditor`, close to Layout. Use the exact user-facing labels above (or a concise equivalent with clear help text) and localize across existing language catalogs. Reuse the current detached draft, Save/Cancel/Reset, guarded settings queue and stale-entry protection. Never build a separate popover/settings store.
- Preserve inherited built-in template behavior: do not enable globally or modify a user's existing Wu Xing preset. A new custom/imported preset may choose either option independently. Retain fields in existing portable JSON import/export/sharing and validate imported values. Keep old and future entries recoverable without an unnecessary schema-version bump if the additive optional properties are sufficient.
- Changes to these options must refresh only affected Facets presentations; no vault scans, source reads, parsers, semantic recompilation, index resets or metadata writes. Respect distinct canvas sessions, popouts and live settings sync.

## Implementation map and architectural concern

The current Facets code assumes attention at the center, so **moving attention into its category requires a deliberate layout change**, not only toggling a CSS class.

- `src/core/plex/views/facets/projection.ts`: `projectFacets` currently gives the attention occurrence a `groupingPartition` and `badge` but intentionally omits `areaId` for the center. Apply the selected preset's focus placement while keeping its single stable occurrence, entry/editor/frame and canonical edge identities. Preserve unknown/diagnostic fallback.
- `src/core/plex/views/facets/layout.ts`: `layoutFacets` currently initializes attention at (0,0), includes its measured editor/badge envelope in central region geometry and packs only occurrences with `areaId` into their containers. Carefully adapt region geometry, reserved center/badge space, diagnostic docking and area packing when attention is inside a category. Review `layoutStrategies.ts`, `areaLayout.ts` and native editor/scroll ownership. Do not let a stale center reservation distort a new option's layout.
- `src/ui/plexViews/prepareScene.ts`, the shared node/edge/gate rendering owners, and `src/core/plex/views/contracts.ts`: trace the conversion from logical roles + `PhysicalPort` to displayed gates and connector endpoints. Prefer the smallest view-/preset-scoped extension needed. Avoid altering the behavior of Compass or Mind Map.
- `src/ui/plexViews/facets/FacetPresetEditor.ts`, `src/core/plex/views/facets/validation.ts`, `configuration.ts`, `templates.ts`, preset sharing/import/export and translations: preserve existing bounds, save/restore and backwards compatibility.
- `docs/FACETS.md`, `docs/FACETS_VIEW.md`: document both options, their independence, and classification fallback. Update sample/help as appropriate without claiming mockups are native acceptance captures.

This should remain presentation-only, consistent with `AGENTS.md`, `CONTRIBUTING.md` and `CODING_STANDARDS.md`. No new indexer, source acquisition, relationship parser, editor implementation, or dedicated Wu Xing renderer.

## Acceptance criteria

- [ ] Independent on/off toggles persisted on **each** preset, with default-off behavior for all existing presets; two presets with different values can be displayed at the same time in separate canvases/popouts.
- [ ] Assigned focus appears once in its category and clearly larger than neighbors; no remaining central duplicate. When the option is off it appears centrally exactly as before.
- [ ] Invalid/unknown/ambiguous classification keeps one usable central focus, without changing the note or granting assignment authority.
- [ ] With gates hidden, genuine note connectors visually start/end at node boundaries on a center-to-center line, with no gate handles; with gates shown, existing gate placement/links stay unchanged.
- [ ] Four toggle combinations work (off/off, on/off, off/on, on/on), with any supported layout and independently selected Facets presets.
- [ ] Canonical relationship role, arrow style, crosslink visibility, hover/highlight, clicks, drag/drop/editing, navigation, central/neighbor Markdown editor, Sidecar and camera behaviors remain usable or have a clearly documented explicit alternative for gate-only interactions.
- [ ] Measured reflow, category scrolling/clipping, resize, switching focus/preset/layout, status transition, lens filtering, theme, independent main/popout sessions and live settings update do not create duplicates, lost focus or stale connectors.
- [ ] Preset Save/Cancel/Reset, import/export/copy, migrations/unknown fields, localization and validation are exercised; toggling settings causes zero added source reads/parses/acquisitions or full index builds.
- [ ] Focused unit/integration tests for projection/layout/gate routing + settings, then `npm run verify` using Node 22.22.2 and real Obsidian typings, and relevant native Obsidian CLI acceptance in a **disposable** vault. Report unrun physical/mobile cases honestly.

## Implementation handoff

First fetch current `main` and branch head, read `AGENTS.md`, `CONTRIBUTING.md`, `CODING_STANDARDS.md`, inspect the live rendering owners and tests, and normally integrate any newer accepted main before implementation. Keep this PR in draft until acceptance evidence is reviewed. Make implementation changes on this PR's head branch, not on `main`. Do not merge automatically.
