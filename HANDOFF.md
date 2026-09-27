# Standing instructions — preserve this header

This is a temporary handoff document between agents. The development of the solution involves agents with access to Obsidian CLI and a full development environment with all node packages installed, but also agents with more limited access. Development is done in "ping-pong" between these two types of agents. Agents should use this document to pass instructions and status from one another, such as instructions for testing/validation, or instructions for development work that can only be done in a full environment.

## Mixed agent handoff

### Instructions

The **offline development agent has no Obsidian CLI/runtime access** and performs most scoped implementation and substantial trace analysis. Its Node/dependency/browser/network/Git capabilities must be recorded, not assumed. The **main validation agent has Obsidian CLI and a full dependency environment** and prepares assignments, captures runtime evidence, reviews/fixes returns, performs native validation and handles authorized Git/PR actions. Host-only probes or supporting development can be requested from the main agent and the resulting evidence sent back for offline analysis.

Follow `AGENTS.md`, `CONTRIBUTING.md` and [the mixed agent workflow](docs/AGENT_WORKFLOW.md). Keep this single handoff transient: preserve the opening note/standing instructions and overwrite the assignment/results below on each transfer, in either direction. Do not archive handoffs or append a session history. Persist accepted architecture/checkpoint decisions and limitations in `Refactor plan.md`; feature-specific evidence belongs in its issue/PR or a reviewed validation report.

Return uncommitted changes and actual results for main-agent review unless the maintainer explicitly assigns other repository authority. Missing prerequisites/tests remain pending; a skip is not a pass. The main agent independently reviews, runs applicable checks, fixes defects and recommends only necessary prioritized manual checks. Commit/PR/merge/release steps follow applicable maintainer authorization after required validation or explicit acceptance of a recorded limitation.

Obsidian is the production host; preserve the established portable semantic, identity/source, publication/revision, localization and environment boundaries.

---

### Current transfer

**State: main-agent review and local validation complete; changes remain uncommitted. Two device/reboot acceptance checks remain manual.**

- Sender → recipient: main validation agent → maintainer.
- Kind: reviewed implementation / validation report.
- Objective: publish a useful center neighborhood and working search before cold/warm startup indexing is authoritative, then grow progressively; add a reusable anchored information bubble for incomplete startup indexing.
- Branch/base: `instant-initialization`, `4d4e0e103d0421298df2146015d21df05758fb0c`.
- Validation environment: macOS, Node 22.22.2, Obsidian 1.14.2 (installer 1.14.0), disposable `kplex-test` vault with 20,000+ Markdown notes including its large-file population.
- Review covered `AGENTS.md`, `CONTRIBUTING.md`, `docs/ARCHITECTURE.md`, `docs/INDEXING_ARCHITECTURE.md` and `docs/AGENT_WORKFLOW.md`. No commit, push or PR action was performed.

### Main-agent findings and fixes

1. **Partial snapshot persistence was not fully prevented.** `rebuildProgressively()` scheduled persistence only after completion, but another graph action could schedule the existing writer while a partial graph was live. `persistIndexedDbSnapshot()` now rejects every non-authoritative state through `fullSnapshotHydrated`, with an executable regression test proving no write occurs.
2. **The startup bubble could reopen during an ordinary later update.** Readiness only made its `open` expression false while leaving caller state true. `App.tsx` now clears that state when readiness becomes true. A ready → later-updating runtime probe confirmed the bubble closes and stays closed in the same session.
3. **Escape could not restore focus to the index indicator.** The `span` anchor could not receive programmatic focus. It now has `tabIndex={-1}`. Exact-build pop-out validation confirmed Escape is consumed, the bubble closes and focus returns to the indicator.
4. **The claimed InfoBubble browser coverage did not exist.** The returned test only inspected source text. `tests/ui-components.test.mjs` now renders the real component and verifies owner-document portal placement, accessible note/description semantics, action labels/order, caller-owned advance behavior and explicit dismissal.

The implementation otherwise follows the established architecture: GraphBuilder owns host fact collection and prepared source work; GraphIndex owns coherent publication/search/persistence; main.ts owns startup coordination; the host-free `InfoBubble` composes the existing owner-document-aware `FloatingLayer`; all product copy uses the localization catalog.

### Automated validation

- `npm run verify:obsidian` on exact Node 22.22.2: **passed** after review fixes.
  - Architecture: 7/7; 36 migrated roots, 77 reachable files, zero violations.
  - Core contracts: 58/58.
  - Official Obsidian ESLint and production TypeScript/esbuild build: passed.
  - Indexing fixture, progressive cold parity, warm preview, publication/search/discovered-field checks: passed.
  - Aggregate Node tests: 101/101.
  - Browser component tests: 5/5, including the new real InfoBubble lane.
  - Exact built artifacts were staged and reloaded in `kplex-test`; command registration, graph render and captured-error smoke checks passed.
- Final runner report: `/private/tmp/kplex-progressive-final/report.json`. The report records identical source/staged SHA-256 hashes; these are transient local artifacts.
- `git diff --check`: passed.
- One earlier full run hit the existing timing-sensitive malformed-URL scaling assertion while the native 20,000-note cold build was consuming resources (31 ms outlier). The unchanged suite passed after stopping that concurrent native build. This was treated as harness contention, not a waived failure.

### Native cold-start and interruption evidence

- Deleted only K-Plex's IndexedDB cache in the authorized disposable vault and restarted the exact staged plugin.
- Before first useful publication: `full=false`, graph size 0, updating indicator active.
- First useful publication: remembered center `Synthetic-Scale-v2/Nodes/056/Scale-005600.md` existed, search returned that note and its URL, `full=false`, and graph size was already about 20,500 because the structural baseline materializes vault nodes. Subsequent samples grew while Markdown semantics were ingested.
- The red/updating state remained active. The localized bubble appeared only after a useful page was present and pointed to the index indicator.
- While the partial graph was live, `readSnapshotMeta()` returned `null`.
- Interrupted the run by disabling the plugin. IndexedDB still had `meta=null` while 1,017 durable body-cache records remained, proving partial semantic state was not promoted and resumable parse checkpoints survived.
- Restarted K-Plex: it republished the useful partial graph from the retained cache and resumed progressive work without false-ready state.
- The test vault's roughly 2,000 near-1 MB notes make complete first indexing intentionally long. The native test validated useful publication and interruption/resume rather than waiting hours for completion. Final authoritative parity and warm targeted-preview behavior are covered by executable fixtures.

### InfoBubble and environment evidence

- Desktop main window: anchored below the indicator, 320 px wide, z-index 1000, Obsidian theme background, fully inside the viewport.
- Outside pointer dismissal closed it; an index rerender in the same session did not reopen it.
- Pop-out: the bubble and indicator were in the pop-out's owner document. Escape closed it, prevented host handling and restored focus to the indicator.
- Temporary ready → later-updating status transition: automatic ready close passed; the later ordinary update did not reopen the bubble; coordinator fields were immediately restored.
- Tablet emulation at 900×875: partial center/search published, bubble fit fully inside the viewport.
- Phone emulation at 390×875: partial graph published, only the visible K-Plex surface claimed guidance, and the 320 px bubble fit fully inside the viewport.
- Final cleanup restored `app.emulateMobile(false)`, cleared the CDP metrics override, restored the 996×795 desktop window and removed temporary pop-outs/globals. Final `dev:errors`: no errors captured.

### Prioritized manual checks

1. **Physical iPhone/iPad, first cold run:** confirm the center neighborhood paints before remaining body-cache prewarm, touch dismissal/positioning works, closing/reopening resumes, and memory remains stable. Desktop emulation proves layout/routing but not native WebView touch or memory behavior.
2. **True warm Obsidian reboot after a completed snapshot exists:** confirm the persisted center and one-hop search/neighborhood appear before full hydration, transient workspace focus does not replace the K-Plex center, and the final graph becomes ready. The disposable vault's new cold run was deliberately interrupted, so it did not produce a new authoritative snapshot for this reboot observation; the warm path passed its executable snapshot fixture.

No additional desktop manual test is required for local acceptance. Changes remain uncommitted pending maintainer review of the two manual boundaries above.
