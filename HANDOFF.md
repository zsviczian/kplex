# Standing instructions ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â preserve this header

This is a temporary handoff document between agents. The development of the solution involves agents with access to Obsidian CLI and a full development environment with all node packages installed, but also agents with more limited access. Development is done in "ping-pong" between these two types of agents. Agents should use this document to pass instructions and status from one another, such as instructions for testing/validation, or instructions for development work that can only be done in a full environment.

## Mixed agent handoff

### Instructions

The **offline development agent has no Obsidian CLI/runtime access** and performs most scoped implementation and substantial trace analysis. Its Node/dependency/browser/network/Git capabilities must be recorded, not assumed. The **main validation agent has Obsidian CLI and a full dependency environment** and prepares assignments, captures runtime evidence, reviews/fixes returns, performs native validation and handles authorized Git/PR actions. Host-only probes or supporting development can be requested from the main agent and the resulting evidence sent back for offline analysis.

Follow `AGENTS.md`, `CONTRIBUTING.md` and [the mixed agent workflow](docs/AGENT_WORKFLOW.md). Keep this single handoff transient: preserve the opening note/standing instructions and overwrite the assignment/results below on each transfer, in either direction. Do not archive handoffs or append a session history. Persist accepted architecture/checkpoint decisions and limitations in `Refactor plan.md`; feature-specific evidence belongs in its issue/PR or a reviewed validation report.

Return uncommitted changes and actual results for main-agent review unless the maintainer explicitly assigns other repository authority. Missing prerequisites/tests remain pending; a skip is not a pass. The main agent independently reviews, runs applicable checks, fixes defects and recommends only necessary prioritized manual checks. Commit/PR/merge/release steps follow applicable maintainer authorization after required validation or explicit acceptance of a recorded limitation.

Obsidian is the production host; preserve the established portable semantic, identity/source, publication/revision, localization and environment boundaries.




---

# PR #187 implementation returned for maintainer review

Main validation agent. Branch 2026-10-19-plex-sync-footprints; runtime head 95d82fdff6fedb54dc692e1ae6280f9e6bdfca8d, previous implementation 106e81b, main integration 42209ee. Prior PR #186 merged as 1076068. Keep #187 draft and #31/#59 open. No merge/release, branch deletion, raw archive/publication or personal-vault access is authorized for this implementation.

Delivered native view-owned document sessions, explicit per-Plex native pairing/completion fences, scalar workspace restoration, memory-only chronological Footprints and bounded shared disclosure UI. Global pins/history remain shared. Footprints glyph14 vs Find15 with shared30px button geometry, per user feedback. The native overlap reproduction found loss of a second pair when another folded their shared group; the correction reuses the existing topology validator and still releases invalid/detached ownership. No parser/compiler/source-cache/index-scheduler change. C14 accepted; structural refactoring stays paused.

Final clean-head verify:obsidian PASSED: 1149 primary,187 browser,334 source,642 browser-storage, architecture/core/official lint, real production build and exact Small smoke. Native final exact-build sessions15 passed. Other native matrices: menu14,folding37,display12,desktop/phone sidebar8 each,representation18,issue16128,live updates15 plus1 setup observation. Final staged main.js sha256 dbd5c7aa12d8736e9da91d8059f5607e41a08e4f0d674dbcadb90ed68574478c. All receipts, source provenance, failed controls and limitations are in docs/validation/plex-sync-footprints-187-2026-10-19.md and private evidence. Final report/handoff commit changes no runtime.

Small restored to original pre-lane layout/settings; no owned fixtures/controllers/fullscreen DOM, mobilefalse. Last deployment only Small's main.js/styles.css/manifest.json. No personal vault accessed. Originals retained in TEMP; durable private backup LOCALAPPDATA/KplexValidation/plex-sync-footprints-187-2026-10-19 has a verified 215-entry per-file SHA256 manifest (357b6603eb65ff4b303533a8975fc61eebe58162b17dc74ea77b927f345220e5). Do not publish it or create an archive without applicable approval.

Limitations: macOS, physical phone/tablet/WebView and screen-reader acceptance pending. A failed folding trial captured an intermittent native app.js popout getZoomFactor exception; unchanged retry passed, exception remains documented and unsuppressed. One emulation reload failure has no established cause; clean reload and unchanged complete matrix passed. No performance gain is claimed from operation counts. Highest-risk manual workflows: two independent same-file pairs, popout teardown, physical-device Footprints keyboard/touch/focus. Do not reopen unrelated indexing/refactoring or start another benchmark campaign.

No offline delegation is active. Authorized main agent capability: Windows native Obsidian CLI, Node22.22.2, browser/build/lint/test, GitHub reads and branch pushes. Implementation is ready for maintainer review; no additional autonomous feature work is pending.
