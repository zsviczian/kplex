# Standing instructions ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â preserve this header

This is a temporary handoff document between agents. The development of the solution involves agents with access to Obsidian CLI and a full development environment with all node packages installed, but also agents with more limited access. Development is done in "ping-pong" between these two types of agents. Agents should use this document to pass instructions and status from one another, such as instructions for testing/validation, or instructions for development work that can only be done in a full environment.

## Mixed agent handoff

### Instructions

The **offline development agent has no Obsidian CLI/runtime access** and performs most scoped implementation and substantial trace analysis. Its Node/dependency/browser/network/Git capabilities must be recorded, not assumed. The **main validation agent has Obsidian CLI and a full dependency environment** and prepares assignments, captures runtime evidence, reviews/fixes returns, performs native validation and handles authorized Git/PR actions. Host-only probes or supporting development can be requested from the main agent and the resulting evidence sent back for offline analysis.

Follow `AGENTS.md`, `CONTRIBUTING.md` and [the mixed agent workflow](docs/AGENT_WORKFLOW.md). Keep this single handoff transient: preserve the opening note/standing instructions and overwrite the assignment/results below on each transfer, in either direction. Do not archive handoffs or append a session history. Persist accepted architecture/checkpoint decisions and limitations in `Refactor plan.md`; feature-specific evidence belongs in its issue/PR or a reviewed validation report.

Return uncommitted changes and actual results for main-agent review unless the maintainer explicitly assigns other repository authority. Missing prerequisites/tests remain pending; a skip is not a pass. The main agent independently reviews, runs applicable checks, fixes defects and recommends only necessary prioritized manual checks. Commit/PR/merge/release steps follow applicable maintainer authorization after required validation or explicit acceptance of a recorded limitation.

Obsidian is the production host; preserve the established portable semantic, identity/source, publication/revision, localization and environment boundaries.




---

# PR183 startup correction — completed, inactive

Main validation is complete. No production work or refactoring is queued.
Branch: `2026-10-18-startup-center-investigation`.
Base/HEAD: `d10cb46b43cb079df424f45bcb2f8c3af14adbd8`.
Changes remain uncommitted; no push, PR edit, merge or release occurred.

The maintainer authorized implementation, personal-vault read-only diagnostics
with only main.js deployment, and Small-vault testing/deployment. Offline agents
implemented and analyzed source using installed Node/browser dependencies; they
never accessed Obsidian or vaults. Main independently reviewed the full diff against
AGENTS, CONTRIBUTING and architecture/workflow rules and performed native acceptance.
C14 structural refactoring remains paused.

## Delivered checklist

- [x] Reproduce the stationary 72-second native failure and explain the foreground
  continuation/baseline wait and later host-input refresh gap.
- [x] Reuse the existing parser/compiler/scheduler for a finite, coalesced P1
  readonly center phase independent of broad startup waits. Preserve affected-event
  retirement, unrelated-host continuity and all native/source/policy/demand fences.
- [x] Fence baseline policy replacement and retry only changed observations; fix
  actual PlexGraph recovery completion across hide/reveal.
- [x] Observe primary and host-wave regressions red before corrections. Pass 105
  startup/foreground cases and final full npm run verify on Node 22.22.2: architecture
  7, core 130, Node 1,068, UI 145, portable source 334, IndexedDB browser 630; lint,
  installed real typings and production build all pass.
- [x] Pass four observed native starts with exact mature-primary fingerprints at
  3.811/3.325/3.669/3.318 seconds after plugin module installation, before global
  readiness, stable after two seven-second interruptions.
- [x] Deploy normal verified main.js to both authorized vaults. Standard exact-build
  Small command/render/error smoke passes. Four normal starts show stable rendered
  3-parent/37-child counts at 6.804/3.961/6.612/5.595 seconds from reload commands,
  still loading cache metadata, with explicit foreground/visibility checks.
- [x] Restore exact original Small settings/workspace after startup normalization
  and smoke layout changes. Verify both vaults' original data/workspace/enabled-list
  hashes, unchanged Small content (74 Markdown files), exact installed hashes,
  no observer/global/staging file and zero changed verified inputs.

## Exact identities and evidence

- Verified 553-file input/artifact receipt SHA256:
  `880ec93a4821c95bcad8a4afddbf7fc701d30f32b9fd1285ea61a5a8b425e374`.
- Normal main.js SHA256 in dist and both vaults:
  `a47c87da51086d65acbad8286bf4e66e7aa93b79e04e03b75fbb0c8c49476414`.
- GraphIndex source SHA256:
  `58e969df37204fb8250796645d43165bd644c47886b474b1eec453226faf90aa`.
- SourceAcquisition source SHA256:
  `d9b2ad9e330106fdf4aab0d3b0b144b4592629be933ddc63cca25131a82bb1f7`.
- PlexGraph source SHA256:
  `4cc49cdf5bc08aa35ff4b4d1efeffbd976439717e5e49fcf715b362fc7a7ee27`.

Durable cause, code, failed controls, actual commands/results and limits:
[validation record](docs/validation/startup-center-investigation-2026-10-18.md).
Accepted feature checkpoint is recorded at the end of Refactor plan.md. Private
logs, captures, receipts and original bundle/configuration backups remain under
`/private/tmp/kplex183-startup/`; no vault contents are committed.

The first candidate passed full verification but failed native early availability;
its control remains recorded. An initial normal-bundle CLI capture timed out after
30 seconds with no established cause and no valid early timing. Two unchanged-bundle
incremental/foreground pairs subsequently pass. Optional screenshot export was
rejected by automatic review; no screenshot was captured or indirect retry attempted.

## Remaining limits

No code blocker remains; implementation and authorized deployment are complete.
Native evidence is macOS renderer reload plus ordinary-read/DOM output, not actual
paint or a universal speed guarantee. Highest-value manual follow-up is a true
full-application exit/reopen and another interruption after 5–10 seconds: the same
3-parent/37-child center should remain complete without navigation. Process-exit
cache/save behavior and physical mobile were not exercised. No ETA or automatic
continuation applies; wait for a new maintainer assignment.
