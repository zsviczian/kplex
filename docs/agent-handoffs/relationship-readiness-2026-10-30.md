# Temporary bootstrap: relationship readiness stuck until navigation

Prepared by **Zsolt's Codex Agent** on 2026-10-30. **Plan and supplied evidence only; no runtime fix or runtime validation.** The draft PR for this branch owns the implementation plan and results. The root `HANDOFF.md` remains the single active assignment/return document.

## Identity and input

- Branch: `2026-10-30-relationship-readiness-recovery`.
- Accepted base: `main` at `9e203ed0ec1371822d9b279c0772a6f603b7e3b4` (manifest 0.3.1).
- Reported runtime: K-Plex 0.3.0, Windows desktop, Obsidian API 1.14.5; Eager, background URL indexing, Responsive pacing. Exact installed bundle hash was not supplied.
- [Complete supplied diagnostic](relationship-readiness-2026-10-30.json), captured 2026-10-30T11:27:03.343Z. All JSON values are preserved; whitespace is normalized. This is an incident report, not a test result.
- Original upload SHA-256: `e0828475bc25a1c0920e025684196dbaaa584f17e13e6ecdead57fa611d324d0`.
- Normalized JSON SHA-256: `f6ff3c90d0f53fee14fb85fdc4e998b50f6658b94b47da98d947c675d61a4fcf`.

The maintainer reported: "The index is stuck on 'Relationship data is incomplete. Open another note or try again after indexing.' for hours now." Follow-up: "after I have navigated away from the node and back, the indexing status cleared."

There is no post-navigation diagnostic. A step-by-step reproduction and the exact blocking operation remain unknown.

## Evidence boundaries

Decode compact rows using their exported `columns` dictionaries. The two recorded activities are **one completed hydration and one still-active host-inventory**, not two source inventory passes. `sourceInventoryPasses=1`; the active source phase is `host-metadata-comparison` for 9,456,321 ms (about 2 h 37 m 36 s). Hydration completed; all 11,848 Markdown files are published in a 110,517-node graph.

At capture: `sourceActive=1`, `semanticActive=0`, one demanded center, zero scope tasks, one background scheduler owner and zero scheduler waiters. No body reads/parses/full-build starts are recorded in this plugin lifetime. The latest center check reports canonical/healthy coverage while source readiness is false. Persisted decision history can include earlier lifetimes and does not identify the checked note.

Elapsed time includes waits and is not CPU time or proof of continuous foreground execution. `sources.lastReason=storage-unavailable` with current storage available does not prove a current outage. Navigation clearing the indicator does not prove the source inventory finished, nor does canonical read coverage grant global/source/write authority.

## First action for the local agent

Read the PR, `AGENTS.md`, `CONTRIBUTING.md`, `docs/AGENT_WORKFLOW.md`, and `docs/agent-workflows/issue-resolution.md`. Verify the branch/head and preserve unrelated local changes. Replace the old assignment below the standing header in root `HANDOFF.md` when taking this task; do not continue its unrelated prior assignment.

Compare release tag 0.3.0 (`34aedd4e4716987487b3c50c7be0b32066de5c9d`) with the accepted base before changing code. Main already includes [#230](https://github.com/zsviczian/kplex/pull/230) (visible recovery) and [#234](https://github.com/zsviczian/kplex/pull/234) (startup completion/status notification). Neither is yet proven to resolve this incident. Establish a failing reproduction or identify the existing fix with regression evidence; avoid a speculative duplicate runtime patch.

Use the PR's scoped investigation, acceptance criteria and native-test boundaries. Preserve source authority, cancellation and indexing performance. Return actual findings/checks in root `HANDOFF.md`; default return is uncommitted for main-agent review. No merge, release, personal-vault deployment, cache purge or force-push is authorized.

Remove these two temporary bootstrap files before final review, retaining the accepted diagnosis and necessary minimized evidence in the PR or an appropriate reviewed validation record. Do not archive this bootstrap as a second handoff.
