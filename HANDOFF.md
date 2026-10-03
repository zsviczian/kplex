# Standing instructions — preserve this header

This is a temporary handoff document between agents. The development of the solution involves agents with access to Obsidian CLI and a full development environment with all node packages installed, but also agents with more limited access. Development is done in "ping-pong" between these two types of agents. Agents should use this document to pass instructions and status from one another, such as instructions for testing/validation, or instructions for development work that can only be done in a full environment.

## Mixed agent handoff

### Instructions

The **offline development agent has no Obsidian CLI/runtime access** and performs most scoped implementation and substantial trace analysis. Its Node/dependency/browser/network/Git capabilities must be recorded, not assumed. The **main validation agent has Obsidian CLI and a full dependency environment** and prepares assignments, captures runtime evidence, reviews/fixes returns, performs native validation and handles authorized Git/PR actions. Host-only probes or supporting development can be requested from the main agent and the resulting evidence sent back for offline analysis.

Follow `AGENTS.md`, `CONTRIBUTING.md` and [the mixed agent workflow](docs/AGENT_WORKFLOW.md). Keep this single handoff transient: preserve the opening note/standing instructions and overwrite the assignment/results below on each transfer, in either direction. Do not archive handoffs or append a session history. Persist accepted architecture/checkpoint decisions and limitations in `Refactor plan.md`; feature-specific evidence belongs in its issue/PR or a reviewed validation report.

Return uncommitted changes and actual results for main-agent review unless the maintainer explicitly assigns other repository authority. Missing prerequisites/tests remain pending; a skip is not a pass. The main agent independently reviews, runs applicable checks, fixes defects and recommends only necessary prioritized manual checks. Commit/PR/merge/release steps follow applicable maintainer authorization after required validation or explicit acceptance of a recorded limitation.

Obsidian is the production host; preserve the established portable semantic, identity/source, publication/revision, localization and environment boundaries.

---

# Online work — SI4 committed; SI5 implementation under validation

SI4 is finalized at `323b260127e4fb81e1d3697d4ee8b0282f8cdb12` (`Complete SI4 settings-independent indexing and native acceptance`) on `indexing-optimization-v2`. All ten original Delivery 1/2 exits are accepted. The maintainer explicitly authorized this commit and SI5 implementation; the maintainer now authorizes the SI5a checkpoint commit and large-vault convergence work; no push/release is authorized. This is the online agent, with Git, pinned Node 22.22.2, real Chromium/IndexedDB and Obsidian CLI. C15–C26 remain paused.

## Current SI5 changes

- Begin bounded durable-source discovery before optional graph hydration. A recognized older-policy active graph is physical/search acceleration only; requested consumers compile current neutral facts. Do not resume old-policy checkpoint semantics or persist a mixed graph as current.
- Missing/corrupt optional graph acceleration uses the existing structural/host-link baseline and source owner. Physical readiness is separate from complete graph hydration; unavailable source adoption remains pending and does not route directly to a cold rebuild.
- Requested chunk failure schedules one source-local repair and automatic retry. Unrelated heads remain unchanged; a separate later corruption at the same physical revision can repair again.
- Remove the production graph-progress writer, its timers and the builder's post-commit pause hook. Keep legacy graph checkpoint reads and complete acceleration writes. Historical writer tests live in `tests/support/legacyGraphCheckpointWriter.mjs`; no schema/store/user data deletion.
- Correct monotonic search slicing/cancellation. Add seven required real-IDB restart/fault tests and startup/coordinator/production-no-checkpoint regressions. Add `verify:obsidian:si5` and the physical-device checklist.
- Release graph/search/body/visual/relation-cache ownership on index unload. Independently held published pages remain intact; the regression establishes ownership release, not a native memory diagnosis.

## Verification and remaining work

Full pinned-Node `npm run verify:obsidian` passes on the pre-unload-fix `73fbc976…` artifact: 7 architecture, 60 core, 133 Node, 7 UI, 314 portable source and 181 real-browser/IDB tests; strict timing/oracles, zero scanner warnings, actual types/build and exact-build native smoke. After the unload fix, affected indexing/settings/watchdog, seven real-IDB startup/fault checks, scanner/build and exact-build native smoke pass. Final `main.js`: `acc9cda48ec37b16d27994a10c6611a8e71721f9a6745cba222d1c49b968e729`. [Candidate report](docs/validation/settings-independent-indexing-si5-progress-2026-10-03.md) and [native evidence](docs/validation/settings-independent-indexing-si5-native-2026-10-03.json) distinguish artifacts and retain failed attempts.

Final small-vault native run passes saved-policy restart, missing/corrupt graph acceleration, one corrupt requested source and offline edit. Source corruption repairs exactly one owner from body-v2 with zero reads/parses; offline edit reads/parses only the changed owner. Valid unrelated heads stay unchanged; all measured cases use zero full builds. Driver setup now opens visible demand, seeds complete acceleration only in small-fixture setup, defers async work until after the CLI response, and cancels late probe continuations. The final driver including its cancellation guard now passes all five native cases; original fourteen-store/config cleanup passes again, with unchanged production artifacts.

The five original SI5 boxes remain open. Full body-only global search/suggestion vocabulary after losing graph acceleration is not yet reconstructed. Earlier large native trials have CLI timeouts and source repair/read observations that require investigation. On the final build, reopening the large vault fails the four-minute preflight despite ready graph status: source authority remains pending after 651 cached body reuses / 650 resolution refreshes, zero Markdown reads/parses/repairs/failures and zero full builds. Later aggregate probes show host revision 1, active inventory, no known-source/resolver-key backlog or backpressure. Investigate startup host-fence/adoption work; do not reset heads, silently extend deadlines or claim a CLI-only defect. The older SI4 hydration-watchdog/SIGTRAP failure remains historical evidence, with cause unestablished. Required dense/high-node foreground latency/memory and main-window/popout acceptance remain open. The maintainer will run iOS/Android manually once the desktop candidate is ready; [the physical procedure](docs/validation/settings-independent-indexing-si5-device-checklist.md) is prepared, not a device pass.

Native work uses only `excalidraw-test` and `kplex-test`. Small-vault cleanup is complete: all 14 original stores restored/compared, original enabled-plugin list restored, originally absent plugin removed, two original Markdown files, no owned fixtures/controllers and original throttling. Evidence includes `/private/tmp/kplex-si5-small-cleanup.json`. The final large preflight installed no wrappers/settings/fixtures; its reopened test window is closed to release the heavy workload, valid completed source progress is retained, final plugin remains installed and originally enabled. Earlier initialized runs restored settings/methods/throttling. No native driver remains active. Do not touch the personal brain vault.

Continue the same Delivery 3, rather than creating prerequisite helper checkpoints. The SI5a commit is an interim implementation checkpoint; finish native failures and catalog/scale coverage before describing SI5 as complete. No further SI4 implementation/acceptance is needed.
