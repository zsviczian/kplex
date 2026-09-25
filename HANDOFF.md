# Temporary handoff: L00 English localization foundation

**Status:** Ready for external agent. **Base implementation commit:** `b65632a` on `kplex-refactor`; start from the branch HEAD containing this file. **Final reviewer:** the maintainer's main agent with Obsidian access.

This is the single transient handoff file. Overwrite it for the next assignment; do not archive it or use it as the progress ledger. `Refactor plan.md` is definitive. Read `AGENTS.md`, the plan's sections **3.6**, **3.7**, **4.4**, **5/L00** and `docs/ARCHITECTURE.md` before editing. Work only on L00 and return a reviewable diff or branch; do not merge, publish, or mark L00 Done in the plan.

## Objective and boundaries

Create one English source catalog under `src/lang/` and a typed lookup/formatting API that supports named parameters, English plural forms and an English fallback when a future locale has no translation. Unknown keys, missing interpolation values and malformed plural forms must fail in focused tests; avoid blank/raw-key UI output. The catalog keys and examples should be clear enough for later translators. **Do not create translations in this checkpoint.** The Obsidian boundary obtains the configured language through the installed typed `getLanguage()` export in `node_modules/obsidian/obsidian.d.ts`; portable code receives a narrow translator/capability instead of importing Obsidian or reading `window.app`/local storage.

Migrate a **small, representative, production-used set** of existing user-facing strings while preserving their current English wording and command IDs: one React control/ARIA label, one native command or shell label, one user-visible `Notice`, and one help/tooltip/ARIA surface. `src/ui/App.tsx`'s topbar controls, `src/main.ts`'s command registration/notices, and `src/ui/NewRelatedNoteModal.ts` are starting points, not a mandate to rewrite whole files. If you touch `NewRelatedNoteModal.ts`, keep its compatibility `.tsx` copy synchronized as required by `AGENTS.md`; esbuild deliberately prefers `.ts`. Do not translate vault titles/content, ontology field names, stable IDs, persisted keys, machine-readable `aria-keyshortcuts` tokens or English developer console diagnostics. L01 will migrate the remaining legacy strings and enforce whole-source completeness; record an inventory rather than sweeping them now.

Add a **pure shortcut formatter** based on E00's `PresentationEnvironment` and one representative displayed hint passed to catalog copy as a **named parameter**. It must describe an action the current handler/registration actually accepts. Good candidates to inspect are `src/ui/App.tsx`'s F4 / Ctrl-or-Meta+F search handler or `src/ui/NewRelatedNoteModal.ts`'s `Mod+Enter` action. Keep `aria-keyshortcuts` in its standard machine syntax. Show Command/Option on macOS and Control/Alt on Windows as applicable; handle iOS/iPadOS, Android and unknown conventions explicitly. Do not advertise a fixed host-configurable binding if it cannot be read, and do not show a keyboard hint when the action is unavailable or the only known input is touch. E00 reports mobile keyboard presence as `unknown`: do not equate that with confirmed absence or invent attached-keyboard detection. No shortcut behavior change is authorized just to make a label easier to format.

Keep graph semantics, indexing, cache, persisted formats, device routing and C03 UI-component extraction out of scope. Avoid a generic localization framework, runtime network loading or large bundles. A catalog alone does not complete L00: the representative production consumers and tests must use it.

## Offline implementation and verification

- Inspect current callers and note the exact pre-change English strings, handler/registration and required capabilities. Use the installed Obsidian typings for `getLanguage()`; do not guess host APIs. Identify the chosen representative surfaces in your report.
- Focused tests must prove catalog key/parameter/plural validation, English fallback, deterministic shortcut output for macOS/Windows and relevant mobile/unknown cases, omission for unavailable/touch-only actions, and the match between the displayed hint and the real logical action. Test a representative React/host consumer through a suitable harness rather than only asserting source text. Ensure new test files are invoked by `npm test` and `npm run verify`.
- `npm run check:architecture` must report the reachable migrated roots and zero violations. Portable localization/shortcut code must not transitively import Obsidian, DOM/window globals, settings or the plugin. Run `npm run verify` on Node **22.22.2** (architecture, Obsidian ESLint, tests and actual production build), plus `git diff --check`. Report the exact result, including any pre-existing warning count; do not weaken tests or suppress lint to finish.
- Document the implemented catalog key/parameter/plural conventions and how the host supplies language and shortcut facts for future feature agents. Update `AGENTS.md` only to describe rules that the code now enforces or directly supports; do not claim L01's whole-source hard-coded-copy gate exists yet.
- No Obsidian installation is needed for your implementation. If unavailable, mark desktop text/ARIA/notice/hint checks as **pending**. Do not claim a stubbed render or compiled catalog is live-host proof, and do not make the portable lane depend on `verify:obsidian`.

The main agent will review the full diff, fix issues, run the exact build in the disposable `kplex-test` vault through `verify:obsidian`, inspect the chosen command/control/notice/ARIA text and shortcut hint, then request only any high-value manual test automation cannot cover. The reviewer will write the durable L00 ledger/action record in `Refactor plan.md`. Do not commit generated `dist/`, a test vault, or temporary reports.

## External agent report — fill in before return

- Result (implemented/partial/blocked), starting revision and final branch/commit or uncommitted diff:
- Files changed and why; catalog keys and exact representative consumers migrated:
- Existing English copy, command IDs, shortcut behavior and persisted data preserved; evidence:
- Language source/fallback behavior and portable import-boundary result (root/reachable counts):
- Shortcut specification/handler chosen, displayed hint rules and tests by environment/input mode:
- Node/npm versions, commands run, pass/fail results and what each proves:
- Obsidian/device checks unavailable and the precise host workflow for reviewer validation:
- Remaining hard-coded user-copy/key-hint inventory for L01, by surface:
- Highest-probability regression and 1–3 prioritized reviewer tests with expected outcomes:
- Open questions, deviations, compatibility facades and their retirement checkpoint:
