# Standing instructions — preserve this header

This is a temporary handoff document between agents. The development of the solution involves agents with access to Obsidian CLI and a full development environment with all node packages installed, but also agents with more limited access. Development is done in "ping-pong" between these two types of agents. Agents should use this document to pass instructions and status from one another, such as instructions for testing/validation, or instructions for development work that can only be done in a full environment.

## Mixed agent handoff

### Instructions

The **offline development agent has no Obsidian CLI/runtime access** and performs most scoped implementation and substantial trace analysis. Its Node/dependency/browser/network/Git capabilities must be recorded, not assumed. The **main validation agent has Obsidian CLI and a full dependency environment** and prepares assignments, captures runtime evidence, reviews/fixes returns, performs native validation and handles authorized Git/PR actions. Host-only probes or supporting development can be requested from the main agent and the resulting evidence sent back for offline analysis.

Follow `AGENTS.md`, `CONTRIBUTING.md` and [the mixed agent workflow](docs/AGENT_WORKFLOW.md). Keep this single handoff transient: preserve the opening note/standing instructions and overwrite the assignment/results below on each transfer, in either direction. Do not archive handoffs or append a session history. Persist accepted architecture/checkpoint decisions and limitations in `Refactor plan.md`; feature-specific evidence belongs in its issue/PR or a reviewed validation report.

Return uncommitted changes and actual results for main-agent review unless the maintainer explicitly assigns other repository authority. Missing prerequisites/tests remain pending; a skip is not a pass. The main agent independently reviews, runs applicable checks, fixes defects and recommends only necessary prioritized manual checks. Commit/PR/merge/release steps follow applicable maintainer authorization after required validation or explicit acceptance of a recorded limitation.

Obsidian is the production host; preserve the established portable semantic, identity/source, publication/revision, localization and environment boundaries.



---

# Support diagnostics and zoom batch — validated for publication

Direction: scoped offline implementation, trace and driver returns accepted by the main validation agent. The main agent had Node 22.22.2, npm 10.9.7, installed Obsidian 1.13.0 types and the CLI; offline agents did not invoke Obsidian. Only the explicitly configured disposable `kplex-test-small` vault was used.

Branch `2026-10-10-support-diagnostics-and-zoom`, base `fa4fc62e7493312a050f8bcef5c6f5c0dc2f8fc2`. The review inventory contains 50 files: 45 runtime/test/config inputs and 5 documentation files, with no required deletions. The ignored assignment stays excluded. The maintainer authorized commit, branch publication, PR creation and merge, followed by switching to main and fetching. Issue closure, a release and a version bump are outside this publication request. C14 accepted; C15–C26 paused.

- [x] Deliver #109 fresh Friend `::f` / Previous `::s`, preserving saved triggers.
- [x] Deliver #111 bounded immutable native support reporting and passive events, including active plugins, custom theme and snippet counts. No raw console or vault-content capture or report I/O.
- [x] Deliver #92's amended normal-editor drawing-fit override, with native fullscreen policy and manual zoom preservation.
- [x] Deliver the per-note normal Markdown text-size/scaling toggle, shared by source and reading, with reload/rename/delete persistence and native fullscreen/Canvas/Excalidraw isolation. Eight localized catalogs.
- [x] Review ownership, lifetime, localization, privacy and settings boundaries; complete full production verification and exact-build native acceptance.
- [x] Restore and audit native state and persistent plugin enablement; finalize durable evidence.

Full `npm run verify:obsidian` passed: architecture 7, core 88, aggregate 612, Chromium UI 30, portable sources 333, real IndexedDB 428, official Obsidian lint, actual installed-type build and exact staging/native smoke. Root focused 50, migration 24, core 88 and affected menu 1 passed. A final TSDoc-only callback comment rebuilt byte-identical artifacts; touched lint passed.

Serial native acceptance passed: Markdown 12/12 (trusted CodeMirror caret/text, fixed/scaled geometry, reading, reload/per-note choices, fullscreen and canvas isolation); matched Excalidraw fit 21/21 with a verified serialized two-element fixture; original Excalidraw 18/18; UX 56/56; support 22/22; reloaded tablet/phone emulation 2/2. Earlier failed setup, empty fixture and device-unavailability receipts are retained, never counted as passes. Assertions and deadlines were not weakened. No executable product change followed full verification.

Final artifact SHA-256:

- Main: `0121a6398387abdb90bf34091c4332eb65bc8786c9cabcece6f34ec0b2737fe8`
- Styles: `1e7a037c153feb41810a3f9bf0e6761bbe0790f011e299cc18ba2cfd6e775342`
- Unchanged manifest: `19799fff9ae459130d707901e7c0d98b3e14a8567881a393f07d457c2fa8ec1c`
- 45-input ledger: `c86c545e7120dbb500e7086be6c7a6996a160eef949d6ad5add104be604cd898`

Installed and built bytes match. Whitespace and reviewed inputs were rechecked before staging. Final native audit at 17:00 UTC confirmed K-Plex and Excalidraw loaded, enabled in memory and persisted; desktop bounds restored to 900×700 at (270,113), original throttling, 74 Markdown files, no owned fixtures/controllers/report dialogs, no Settings window/debugger/errors.

A failed device attempt found an empty enabled list despite present exact artifacts. Root restored the two required plugins through verified `enablePluginAndSave` / `saveConfig`, original serialized workspace and bounds. The strict rerun passed from a valid persisted baseline. The empty-list cause remains unconfirmed and is recorded for later harness-lifecycle investigation.

Available implementation and acceptance are complete; no implementation ETA remains. Prioritized manual checks: physical Android/iOS report clipboard/touch/permissions; affected-device perceived Excalidraw scale/manual zoom; physical Markdown fixed/scaled visual and selection behavior. Emulation and trusted desktop input do not establish physical Mobile acceptance. Durable decisions are in `Refactor plan.md` and the [validation record](docs/validation/support-diagnostics-and-zoom-2026-10-10.md). No further scope queued.
