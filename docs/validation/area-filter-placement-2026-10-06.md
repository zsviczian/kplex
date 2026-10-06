# Area filters above their node regions — validation

U9 implementation and automated acceptance complete. [Exact evidence](area-filter-placement-2026-10-06.json) retains acceptance, tested inputs/artifacts and the failed native trials. Changes remain uncommitted on `ui-improvements-batch-2`; C15–C26 remain paused.

## Correction

The shared region toolbar is anchored above its own scroll clip with a six-world-pixel gap. This places the whole filter button/input row above Parent, Friend, Challenger, Sibling and Children node regions, including taller responsive buttons. Node clipping and the input's horizontal overflow remain intact. Focus-within raises the active panel above adjacent clips so an overflowing input is still clickable. No node geometry, settings, indexing or filter behavior changes.

## Development findings

The first native run caught an overflowing Children input covered by a Friend node in the deliberately narrowed panel. A diagnostic retry retained actual rectangles and the hit stack, confirming the stacking cause. Both runs cleaned up their fixtures/settings. The focus-within correction passed the focused Chromium rerun and exact-build staging. These failed trials remain separate from final acceptance.

## Acceptance

Focused Chromium geometry passes with the actual stylesheet: above-clip placement, full-width horizontal overflow, input hit testing and preserved node clipping. Exact-build native acceptance passes 62/62: 56 desktop workflows and six desktop/tablet/phone-emulation checks. Parent, Children, Friend and Challenger controls measured 6 px clearance above their node clips; the separate overflowing Sibling fixture measured the same clearance with open/closed controls. All five fields pass hit testing. Node clipping remains intact. No captured errors or CLI timeouts; exact settings/enablement bytes and owned fixture/view/controller/mobile/window/throttling restoration pass.

`npm run verify:obsidian` passes architecture 7, core 67, Node 226, UI 17, portable sources 322 and actual IndexedDB browser 296, without skips. Production settings 24, installed types, official scanner, production build and exact installed-plugin smoke pass. Scanner reports zero errors and one retained legacy `Workspace.activeLeaf` warning at `src/main.ts:3134`.

All 270 frozen implementation/test/build inputs and rebuilt/staged/native artifacts agree. `main.js` is identical to the accepted U8 build; this runtime correction changes CSS only.

| Artifact | SHA-256 |
| --- | --- |
| `main.js` | `8b3fea712d0405761527ddb0b92e9d455b8930ce83f55c214536871df47392d4` |
| `manifest.json` | `e3bb9a35215af97f6a3394cf7fc8f7d2142bae06de94bb112fef5a05819cda62` |
| `styles.css` | `b56a473a4d59c2b2206a22ffbb28d397b8aa399358f329ae401f6d9b67ad7888` |

The final passive audit confirms ready desktop, original center (`Note A.md`), 13 original Markdown notes, saved profile/typography parity, hidden configuration and no previews/owned fixtures/controllers/pending semantic or hydration owners.

Desktop mobile emulation establishes responsive layout, not physical phone/tablet touch or WebView behavior. No indexing performance change or native large-vault timing is claimed.
