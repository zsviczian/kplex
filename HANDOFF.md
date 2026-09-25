# Temporary handoff: E00 host environment seam

**Status:** Ready for external agent. **Implementation baseline:** `f7dfd35` on `kplex-refactor`; start from the branch HEAD that contains this handoff file.
**Owner of final acceptance:** the maintainer's reviewing agent with Obsidian access.
This file is a one-task exchange document. `Refactor plan.md` is the definitive checkpoint tracker; after review, the reviewing agent will transfer accepted evidence there and remove this file. Do not turn this into a continuing log.

## Assignment

Implement **E00 — Establish the host environment seam without changing device behavior**, as specified in `Refactor plan.md` (section 5, E00) and `docs/ARCHITECTURE.md`. You do **not** need an installed or running Obsidian application. The repository's installed `obsidian` package supplies types for the real build. Work from the base commit above on a separate branch or as a reviewable working-tree diff; do not merge or publish.

Read `AGENTS.md` first. Before editing, inspect `src/ui/viewProfile.ts`, `src/settings.ts` layout-profile keys/migration, `src/main.ts` command registration and `activateView()`/`activateSidepanel()`/`activateViewInPopout()`, and current platform references in `src/ui/`. Preserve current routing and persisted settings. `mobile` is the existing **phone profile key**; do not rename it to `phone` in stored data. `Platform.isMobile` includes tablets; the current classifier prefers optional runtime `isPhone`/`isTablet` flags and otherwise uses the shortest screen side. Confirm any Obsidian API you use against the installed declarations rather than guessing.

Create a small **host-free presentation-environment contract** with separate device class (`desktop`/`tablet`/`phone`), OS/key convention, input modes (keyboard/pointer/touch may coexist), and only the host actions actually needed by the first consumer. Collect Obsidian facts at an Obsidian-owned boundary. Keep the existing classifier's behavior, including fallback and command visibility. No process-wide mutable platform singleton. Keep the environment out of graph semantics, indexing, cache and persistence; iOS-specific indexing/memory policy stays where it is. Use an explicit `phone` → persisted `mobile` mapping where layout profile keys are selected.

Migrate one **real, narrow presentation consumer** to accept the contract through an argument or prop rather than importing `Platform` or reading `window`. A pure layout-profile selector is a viable candidate if it remains the production path and keeps existing `leaf`/`sidepanel`/`popout` profile selection intact. Avoid inventing a demo component or moving all of `PlexGraph.tsx` merely to claim portability. Keep compatibility delegates where legacy callers still need them, and name their owner and retirement checkpoint in your report. Do not start L00 localization, C03 action components, shortcut-copy redesign, a full feature-availability framework, or the separate filtered gate-count fix ([issue #28](https://github.com/zsviczian/kplex/issues/28)).

## Acceptance checks you can run without Obsidian

- Pure tests cover desktop, tablet, phone; macOS, Windows, iOS/iPadOS, Android and unknown convention; touch-only, keyboard plus touch, and pointer plus keyboard; available/unavailable pop-out and graph-tab actions. Test the current classifier's optional flags and screen-size fallback, including phone/tablet disagreement cases, without creating an Obsidian runtime dependency in the pure tests.
- Verify unchanged phone → sidepanel, tablet → normal tab/sidepanel, desktop → normal tab/pop-out routing and command visibility, ideally with focused behavior assertions around extracted decision functions. Preserve stable command IDs and persisted layout-profile keys, values and migration. Do not bless changed defaults or rewrite baselines to match an accidental behavior change.
- The migrated portable consumer's **transitive** imports pass `npm run check:architecture`; report the migrated-root count (a zero-root pass does not prove the work). `npm run verify` passes on Node 22.22.2, including Obsidian ESLint, tests and the real production build. Run `git diff --check` and inspect the full diff for unwanted persisted/schema/UI-copy changes.
- If Obsidian CLI or a device is unavailable, record the applicable host checks as **pending**, not passed. Do not make `verify:obsidian` a requirement of the portable lane. Do not add production diagnostics or generated bundles to source control.

The reviewing agent will later run applicable Obsidian checks in the disposable `kplex-test` vault: desktop command visibility/open/pop-out and layout-profile selection; tablet normal-tab and sidepanel behavior; phone sidepanel routing and physical touch where a device is available. The large synthetic vault is not needed to prove this seam. If a platform cannot be exercised, its check remains pending in `Refactor plan.md`.

## Return instructions

Update **only the report below** with what you actually changed and observed. Leave the E00 row/status and action log in `Refactor plan.md` for the reviewing agent, who will validate your code and transfer accepted evidence. Do not claim E00 Done from offline checks alone. Stop at E00's boundary and leave L00 pending.

### External agent report

- Result/status (implemented, partial, or blocked):
- Starting revision and final branch/commit or uncommitted diff:
- Files changed and reason for each:
- Existing behaviors and persisted keys preserved; evidence:
- Portable consumer migrated and exact reachable architecture-check result:
- Tests/commands, Node version, results and what they prove:
- Host/device checks not run and why:
- Highest-risk remaining behavior and prioritized test for the reviewing agent:
- Any deviations, unresolved questions, or suspected regressions:
- Remaining legacy callers, compatibility facade owner, and intended retirement checkpoint:
