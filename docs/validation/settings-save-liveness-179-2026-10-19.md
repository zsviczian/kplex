# Settings-save liveness (#179)

## Outcome

Ship the bounded optional post-save completion and presentation-notification safeguards. Four actual-owner baseline regressions are corrected. The original intermittent whole-application freeze is **not reproduced or proved fixed**. No CPU, memory, indexing-speed or perceived-paint gain is claimed.

Main `60d2239` was integrated normally at `3bc489c`. Runtime candidate `f2fef82` and final test checkpoint `be7247a` preserve compiler/parser, source validation, persistence schema and synchronous semantic per-file publication. Later edits concern native tooling and documentation only. No receipt, reader sharing, new scheduler or #176 implementation.

## Cause and correction

| Actual-owner baseline failure | Correction |
| --- | --- |
| Removed/re-registered subscriber revisited 16 times in one dispatch | Opening snapshot and registration identities; old cleanup cannot retire a replacement |
| Nested presentation notifications recursed to depth 4 | Nonrecursive stronger/keyed coalescing; redundant feedback deduplicates; host-task continuation after four synchronous rounds |
| Controlled source-currentness churn completed 65 optional settings-preparation attempts | Eight attempts / 64 ms retry window, initial attempt plus one retry allowed, real task yields and explicit later retry |
| Durable style writer/editor trapped by held optional refresh | One optional completion flight and coalesced newer obligation; truthful saved/pending after a 200 ms host timer |

Disk persistence and coherent live-settings publication still precede completion. Accepted disk writes are never cancelled/replayed. Separate semantic-intent revisions prevent unrelated workflow saves replaying completed semantic work. Eight convergence attempts bound newer-intent adaptation; unload fences follow-up effects and consumes late failures. Existing modal, theme, field-merge, copy-on-write, failed-storage and duplicate-submit owners remain authoritative. Generic saved/pending feedback covers all eight locales.

The 200 ms timer bounds callback waiting when host tasks run. It cannot rescue an already starved renderer or guarantee wall-clock latency, paint or background timer delivery. A permanently held provider retains one flight; recovery may require explicit later input or reload. Private/compiler preparation contracts remain unchanged.

A compiler retry-cap experiment was rejected because null could enter missing-cache recovery; the baseline implementation was restored exactly. Private source SHA-256: `219d426ee872163784e5dc3c43b83091f4f3d020374636e6ba251e0bee27c96a`. Only the source-restore caller of optional adaptation distinguishes typed presentation-pending from cache damage. A real IndexedDB regression proves retained body-only relations, zero recovery/body-read admission and later valid display convergence. No source-proof relaxation.

## Verification

Node **22.22.2**, actual production dependencies/types and real Chromium/IndexedDB. Clean **be7247a** passes `npm run verify`: architecture **7**, core **130**, main **1,127**, UI **184**, sources **334**, source-browser **638**, official Obsidian lint and real production build; no failures/skips. Final native-tool-only follow-up passes syntax and **20** runner tests. Final runtime/test diff from that full-tested checkpoint is empty.

Full log SHA-256: `49bd618dd06c599896117f73bbb5ac48629934755c21959eb24823efdc4991ad`.
Exact staged/native main.js SHA-256: `2c6dce74c2930ec435ff23caa88de9fd8e231f4cc98f4d967dbe52a7990eeaea`. Strict staging/render smoke passed before native testing.

Windows **Obsidian 1.14.4 / installer 1.14.0**, real Excalidraw **2.29.0**; authorized Small only, **107 files / 88 Markdown** before and after. Serial foreground functional tests, no comparative performance campaign. Drawing fixtures use the companion's generated drawing displayed as Markdown beside a normal center. Returned-path identity precedes cleanup ownership.

| Native lane | Actual result |
| --- | --- |
| On-demand quiet managers/editors, main/popout, held/failed storage and reload | 15 pass |
| On-demand held earlier facet/search + parent Save, main | 5 pass |
| Same, plain Markdown Sidecar | 5 pass |
| Same, real drawing as Markdown Sidecar | 5 pass |
| On-demand global radius, real drawing Sidecar | Earlier diagnostic repeat: 8 pass; final stricter prerequisite refuses to start (below) |
| Eager quiet managers/editors and storage/reload | 15 pass |
| Eager real drawing Sidecar + Properties, controlled overlap | Final repeat: 5 pass, including strict work-count and stationary restart checks |
| Eager global radius, real drawing Sidecar | 8 pass, including trusted slider/Settings-close interactions |

Controlled main overlap at 300 ms: baseline **one durable write, editor pending, 25 task heartbeats**; candidate **one durable write, editor closed, 28 heartbeats**. Final Eager overlap also closes while earlier preparation remains held. This distinguishes a blocked dialog from renderer starvation. Native scalar traces are bounded to 2,048 events with dropped counts. IDs correlate queue, preparation and publication; they are not CPU attribution. Whole-trial reads/acquisitions include fixtures, native leaves, reload and cleanup. Only scoped unchanged oracles support zero-source/semantic claims. Portable work-count assertions await actual owned refresh drain outside the early UI-completion lease.

## Failures and exclusions

All originals and failed trials remain private. Three earlier full runs stopped on fixture defects: missing real Node timers (29), missing actual completion dependency in imagery (4), and one retired inline-await structural guard (1). Actual dependencies/timers and the delegated semantic obligation guard were corrected. Behavioral/source/work-count assertions were not weakened.

Native failures include an initial wrong-facet hold; first radius run whose strict guard saw overlapping source acquisition; ineffective live mode switching; and startup-strategy/canonical-authority prerequisites that rejected valid source-backed readiness. Eager mode now uses the existing ontology lane's disable/configure/enable procedure. Normal fixture preparation is recorded separately; functional deadlines remain 15 seconds. An Eager overlap passed liveness but failed its later source-work guard; observed fixture-work drainage before fault injection gives the final five-case pass.

The final On-demand drawing/radius control still refuses to start: **one known source owner remains queued**, while scheduler, hydration, semantics, writer and visible-metadata activity are zero and local status is ready. This is not genuine drain and is not relabeled a pass. Its earlier eight passing interactions do not establish repeatable quiet preparation. No build, forced proof, cleared queue or enlarged functional deadline was added.

Reproduce with existing [styleOperations.mjs](../../scripts/testing/obsidian/styleOperations.mjs) and explicit Small-vault variables in [CONTRIBUTING.md](../../CONTRIBUTING.md). `KPLEX_STYLE_REFERENCE_ONLY=true` plus `KPLEX_STYLE_LIVENESS=assert` selects overlap; documented Sidecar, Properties and real-drawing factors remain available. Global radius uses `KPLEX_STYLE_SIDECAR_GATE_ONLY=true`. Wrappers, fixtures, configuration bytes, workspace/follow owners and original On-demand mode are restored independently of assertions; final controller count zero. CLI debugger capture released. No personal vault, app termination or cache purge.

## Private evidence and recommendation

Raw Temp prefixes: `kplex-179-owner-red`, `kplex-179-durable-red`, `kplex-179-native-baseline`, `kplex-179-native-overlap`, `kplex-179-native-1792366866794`, `kplex-179-radius-cause`, `kplex-179-native-remaining`, `kplex-179-native-final-controls-1792368089931`. Native reports retain driver/artifact identities; portable receipt is `kplex-179-portable-receipt.json`. Earlier installed baseline `1137fc1` is runtime-identical to main `60d2239`, bundle SHA-256 `96ae2f09efce197dfacecf0fa29760f1867bcd719b6714979283752f5e453cee`.

Verified durable private copy: `%LOCALAPPDATA%/KplexValidation/settings-save-liveness-179-1792368186633`, **141 files / 8,210,671 bytes**; manifest SHA-256 `00a4fa5312067154bb6ad35a6825f3e4550d8e27efd6304638bc0b1b5f73deb8`. Every original/copied file hash was checked. No archive or raw traces published, originals retained.

Recommend merging these bounded safeguards while retaining the intermittent freeze as unresolved. macOS, physical mobile, different-DPI displays and long real-vault freeze conditions remain untested. Highest-value follow-up is an incident trace identifying the blocked owner. Scalar coalescing and mixed-effect classification remain unimplemented leads. #149 and #176 are separate next work packages.
