# Standing instructions ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â preserve this header

This is a temporary handoff document between agents. The development of the solution involves agents with access to Obsidian CLI and a full development environment with all node packages installed, but also agents with more limited access. Development is done in "ping-pong" between these two types of agents. Agents should use this document to pass instructions and status from one another, such as instructions for testing/validation, or instructions for development work that can only be done in a full environment.

## Mixed agent handoff

### Instructions

The **offline development agent has no Obsidian CLI/runtime access** and performs most scoped implementation and substantial trace analysis. Its Node/dependency/browser/network/Git capabilities must be recorded, not assumed. The **main validation agent has Obsidian CLI and a full dependency environment** and prepares assignments, captures runtime evidence, reviews/fixes returns, performs native validation and handles authorized Git/PR actions. Host-only probes or supporting development can be requested from the main agent and the resulting evidence sent back for offline analysis.

Follow `AGENTS.md`, `CONTRIBUTING.md` and [the mixed agent workflow](docs/AGENT_WORKFLOW.md). Keep this single handoff transient: preserve the opening note/standing instructions and overwrite the assignment/results below on each transfer, in either direction. Do not archive handoffs or append a session history. Persist accepted architecture/checkpoint decisions and limitations in `Refactor plan.md`; feature-specific evidence belongs in the issue/PR or a reviewed validation report.

Return uncommitted changes and actual results for main-agent review unless the maintainer explicitly assigns other repository authority. Missing prerequisites/tests remain pending; a skip is not a pass. The main agent independently reviews, runs applicable checks, fixes defects and recommends only necessary prioritized manual checks. Commit/PR/merge/release steps follow applicable maintainer authorization after required validation or explicit acceptance of a recorded limitation.

Obsidian is the production host; preserve the established portable semantic, identity/source, publication/revision, localization and environment boundaries.






---

# Active status: implementation validated; publication authorized

Branch: 2026-11-15-mobile-navigation-and-authoring, base main 69eb464. The maintainer explicitly authorized committing, pushing, merging to main, closing related issues with the PR reference, and switching/fetching local main on 2026-11-15. Work belongs to K-Plex; no Excalidraw repository changes or parallel agents were used.

Implemented issues #303-#307: single-source connector navigation with optional modifier click; native external-link routing; Pins/History scrolling and hover previews; remembered lateral relationship family and drag modifier hints; bounded responsive mobile disclosures. Added today's missing-yesterday daily-note linking offer and four independent attachment visibility categories with legacy preference migration and shared cached-gate policy. Updated all eight locales and relevant documentation/tests.

Follow-up UI fixes keep usage hints horizontal outside the camera, with a transparent background; dock native mobile navigation below normal main tabs and hide it in Zen/fullscreen; prevent bottom-edge editor focus from scrolling the canvas; keep controls reachable in short landscape viewports; distinguish horizontal saved-list scrolling from outward export and support middle-button scrolling; suppress overlapping tooltips while native modifier-hover previews are active. Lifecycle ownership restores native chrome and preview markers on teardown/migration. No startup, source schema, scheduling, compression or dependency changes.

Validation used pinned Node 22.22.2. The full aggregate had core 135, main 2471, browser 589 and sources 384 passing; storage finished with six failures caused by isolated fixture import omissions and one pre-assertion Chromium launch timeout. Corrected fixture inventories without weakening assertions; affected reruns passed (30, 274 and 43 tests). Attachment/migration/cached-gate/order/localization 116, shared mobile disclosures 44 and connector contracts 33 also passed. The completed-gates receipt retains the original aggregate failure; this is not a claim that a clean npm run verify exited zero. Actual installed Obsidian types, production/local builds and lint passed.

Final follow-up suites: UI 181/181 and tooltip/preview 48/48 passed; these overlap and are not 229 distinct tests. Touched-source lint and architecture checks passed (287 roots, 495 reachable, zero violations). Exact final local artifact build: 0.4.3+69eb4642dbf7.dirty.local.20261115T122555007Z. Windows Obsidian 1.15.1 native checks passed for real previews, core preview disable/re-enable, sidebar/popout/reload, actual Markdown and Excalidraw child editors at the bottom, trusted gate origin, both saved lists' left/middle drag, phone portrait/landscape display-mode combinations, tab restoration and six phone/tablet sidebar widths. Isolated fixture cleanup restored original settings, plugin enablement, workspace bytes, native recent files and original 11 leaves.

Final build receipt: .test-work/validation/2026-11-15-mobile-editor-final-build-uy0QSM/receipt.json. Final UI suites: ...authoring-34gxrl and ...authoring-xuNpCx. Passing native receipts: ...mobile-layout-native-BzzDif, ...OoimHN, ...WleaPA and ...iZdbTL. Final independent cleanup audit: ...mobile-editor-final-audit-QoJdLd. Raw evidence stays in ignored managed storage; do not commit it or re-run native mutations merely to repeat passing evidence.

Zsolt's Brain received only the exact tested main.js/styles.css under explicit authorization while closed. Deployment receipt ...brain-mobile-editor-deployment-O5OeaK verifies unchanged data.json and saved plugin list. Production notes were not modified by test commands. Final SHA-256: main.js 6fe14e4e6d6af02df0e7a9ab4e69b78ef027855322f52c51100000d64fba43e7; styles.css a9a98390ae2607131fc192fb2d69b6053723cc0bb9f7373c7a6115ecfdfe1822.

Remaining platform acceptance: physical Android/iOS touch, native mobile Web viewer preferences and keyboard viewport, and macOS. Windows emulation does not establish those. The maintainer requested merge with these recorded limitations. Priority manual checks: saved-chip swipe versus outward export, tablet drawer resize with keyboard/disclosure open, and one-tap mobile external links. No additional restart is necessary for publication; another task may use the shared Obsidian CLI.
