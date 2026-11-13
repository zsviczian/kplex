# Standing instructions ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â preserve this header

This is a temporary handoff document between agents. The development of the solution involves agents with access to Obsidian CLI and a full development environment with all node packages installed, but also agents with more limited access. Development is done in "ping-pong" between these two types of agents. Agents should use this document to pass instructions and status from one another, such as instructions for testing/validation, or instructions for development work that can only be done in a full environment.

## Mixed agent handoff

### Instructions

The **offline development agent has no Obsidian CLI/runtime access** and performs most scoped implementation and substantial trace analysis. Its Node/dependency/browser/network/Git capabilities must be recorded, not assumed. The **main validation agent has Obsidian CLI and a full dependency environment** and prepares assignments, captures runtime evidence, reviews/fixes returns, performs native validation and handles authorized Git/PR actions. Host-only probes or supporting development can be requested from the main agent and the resulting evidence sent back for offline analysis.

Follow `AGENTS.md`, `CONTRIBUTING.md` and [the mixed agent workflow](docs/AGENT_WORKFLOW.md). Keep this single handoff transient: preserve the opening note/standing instructions and overwrite the assignment/results below on each transfer, in either direction. Do not archive handoffs or append a session history. Persist accepted architecture/checkpoint decisions and limitations in `Refactor plan.md`; feature-specific evidence belongs in the issue/PR or a reviewed validation report.

Return uncommitted changes and actual results for main-agent review unless the maintainer explicitly assigns other repository authority. Missing prerequisites/tests remain pending; a skip is not a pass. The main agent independently reviews, runs applicable checks, fixes defects and recommends only necessary prioritized manual checks. Commit/PR/merge/release steps follow applicable maintainer authorization after required validation or explicit acceptance of a recorded limitation.

Obsidian is the production host; preserve the established portable semantic, identity/source, publication/revision, localization and environment boundaries.






---

# Last-used creation tab: accepted / inactive

Root main validation completed the workspace_behavior offline return. Branch `2026-11-12-authoring-workspace-bundle`, HEAD `7ad3d43dc77d945e7a59a9dd57b38c1352754da0`. All prior uncommitted folder-suggester/type-tabs work is preserved. This correction is also uncommitted. No push, PR update, merge or production deployment was performed; Zsolt's Brain remains on its prior deployed build.

## Behavior and ownership

User requested that the tab used last time become the default on the next opening. All three creation forms now persist explicit type-tab selection immediately, including cancellation with native X. One shared host capability, creationTypeTabControl(), writes nullable newNodeCreationTab through existing saveSettings(false,false) and its serialized snapshot owner. The schema/default/migration validate the three supported type values; null retains older template/physical-default behavior.

Related creation remembers Placeholder. Physical-only forms and an unavailable Excalidraw companion project a supported local fallback without overwriting that memory. An explicitly remembered Markdown tab outranks a configured drawing-template default. Successful physical creation retains the separate legacy newNodeDefaultType behavior; no tab selection requires file creation. Per-kind template drafts, explicit invocation completion, Daily Notes behavior and partial-file recovery remain intact. Busy, retired and invalidated callbacks cannot persist late tab choices.

Documentation and UI_RULES now describe tab memory. Core graph/settings policy and index signatures remain unchanged; regression coverage proves the new workflow preference is not a semantic/index signature input and survives unknown-key/foreign-import handling. No startup/index/cache/scheduler owner was changed. The new main.ts additions are a narrow UI-preference capability and its materialization wiring, not lifecycle changes.

The prior requested shared CreationTypeTabs, scoped template catalogs, folder source suggester, After saving placement and native X remain implemented and validated.

## Independent acceptance

Windows, Node22.22.2, Obsidian1.15.0 (installer app1.14.5). Focused scope; no full indexing aggregate or whole-app restart was needed or attempted.

- Architecture and full Obsidian ESLint: PASS.
- Affected source/settings/migration regressions: 203/203 PASS.
- Browser coverage: 86 cases passed in the full87-case run; the remaining new memory fixture had a local name collision with shared setup. After renaming only its variable, that targeted browser case passed. All87 cases have passing evidence on unchanged production source; do not call the original aggregate invocation a pass.
- Native harness source regressions: 77/77 PASS.
- Actual release and locally identified builds against installed Obsidian typings: PASS.
- Exact installed local build, main window3 and real popout101: PASS. Select+native-X+reopen checked all3 dialogs, Markdown over drawing-template defaults, Placeholder through physical-only fallback, unavailable/returning companion, separate template drafts, real Markdown-template creation, source-folder autocomplete/empty/root and light1160px/dark440px geometry. Screenshot reviewed.
- Actual plugin disable/enable: a new plugin instance reloaded the durable Placeholder preference.
- Final independent native audit: layout/settings/MRU/physical inventory/window inventory restored; native leaf states/sessions verified; raw data.json/community-plugins.json/workspace.json bytes restored; no dialogs/controller; index ready98/98, no active work/cache save pending. Original Brain and its Settings window were preserved.
- Physical mobile/macOS remain unverified. Companion availability/catalog were injected for UI coverage; no new Excalidraw drawing-engine integration acceptance is claimed.

Failure accounting: the first source run was blocked by sandbox esbuild parent-directory resolution, then the identical source lane passed outside sandbox. The initial native main/popout/reload cases passed, but the outer audit ran before post-reload indexing settled. A readiness fence was added to the prepared staging caller, not production; the complete rerun passed including restoration. These earlier failed runs remain retained as failures.

## Managed evidence and identity

Normal ignored 14-day managed retention:
- `2026-11-13-creation-tab-final-v8DrCL`: architecture/lint pass; source sandbox failure.
- `2026-11-13-creation-tab-final-reviewed-3YKohS`: source203 pass; browser86/87, fixture parse failure.
- `2026-11-13-creation-tab-final-accepted-k3bgAV`: corrected browser memory case, harness77, release/local builds.
- `2026-11-13-creation-tab-native-orIrcK`: initial native case/reload passes, premature outer audit failure.
- `2026-11-13-creation-tab-native-settled-kvZU5G`: complete final native/reload/restoration pass; original inventory and configuration captured independently.

Final runtime input SHA256: `666a3f691e76502b6f425357f4fd824a0c7484d17dcd98e6e5c831526ce59fec`.
Local main.js: `4e60854754f1739fcd6c378c02a7ea937d50c084c7d286541f488453c918344e`.
styles.css: `53d06fceba48070183dc9f07d202210f65f08e56cf4bb8878618bed1e5c16a83`.
manifest.json: `dd5c24bca596d39dcfeda4adaac6649fdaa3d2a3cfd905b315c63c64f28b2efb`.

creationTypes.mjs remains an exported prepared native probe. Its staging caller owns the shared application lock, canonical target/artifact checks, full workspace/config/inventory capture and independent post-writer restoration (including File Properties). Wait for actual post-reload readiness before capture/audit; the helper's own cleanup covers only owned fixtures. No standalone unsafe command was added.

Next action: await maintainer review/instruction; do not automatically commit, deploy or resume architecture refactoring.
