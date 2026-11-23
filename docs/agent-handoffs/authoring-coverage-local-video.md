# Authoring safety, view coverage and local video thumbnails

**Temporary planning scaffold. No runtime changes or fixes are included.**
Prepared by Zsolt's Codex Agent on 2026-11-23.
Base: main at `4f9abbf16d1ebfe02109c370c4594e5c4632f821`, after #326 and #327.
Branch: `2026-11-23-authoring-coverage-video-thumbnails`.

The draft PR is the authoritative implementation brief and acceptance checklist. Read current AGENTS.md, CONTRIBUTING.md, CODING_STANDARDS.md, UI_RULES.md, docs/AGENT_WORKFLOW.md and docs/agent-workflows/issue-resolution.md before implementation. Recheck main, issue comments and saved branch work; preserve accepted fixes and unrelated changes.

## Selected scope

- [#318](https://github.com/zsviczian/kplex/issues/318): reproduce the reported Open Tab Settings interaction and fix confirmed wrong-source relationship writes. Extend existing source-safety tests to cover existing-note linking, new-file creation and immediate re-invocation without waiting for all center representations to agree. Verify dialog identity and actual file writes.
- [#299](https://github.com/zsviczian/kplex/issues/299): add the exact inferred-body-link to explicit-Parent regression through actual authoring entry points. Fix a confirmed duplicate-check defect without weakening genuine duplicate protection or replacing the canonical relationship classifier.
- [#250](https://github.com/zsviczian/kplex/issues/250): exercise the four-Challenger fixture through repeated Compass/Mind Map switches, warm restore and held background work. Fix confirmed scope/publication/lifecycle defects without modifying source notes or forcing whole-vault rebuilding.
- [#321](https://github.com/zsviczian/kplex/issues/321): implement opt-in, on-demand local-video frame thumbnails after a native feasibility/performance check. Use the host video decoder and a small canvas; keep generated thumbnails only in a bounded session-memory cache. No thumbnail files, persistent blobs, FFmpeg, remote service or indexing work.

## Delivery boundaries

The three bugs require baseline reproduction or a precise non-reproduction result before changing behavior. Confirmed fixes need failing-before/passing-after coverage. If a case cannot be reproduced, retain useful regression coverage and publish tested conditions, commit-pinned tests, results and limitations to its issue; do not call missing device/plugin coverage a pass or close an issue merely because this PR exists.

Use the current action/navigation/relationship and graph-demand owners. Preserve exact native identities, per-canvas intent, ontology precedence, source multiplicity and partial-write recovery. Do not change companion plugin repositories or publish upstream issues/PRs without separate authorization.

For local thumbnails, reuse image visibility and subscriber lifetimes with a separate bounded local decoding policy. Default the new setting off. Begin with one active decoder across the plugin, a bounded queue, at most 32 cached results and an 8 MiB encoded-result budget, subject to native measurements. These limits do not guarantee a bound on browser decoder memory. Preserve aspect ratio and existing node dimensions, coalesce identical current files, fence file replacement/mtime/size, and clean up media, canvas, listeners, timers and object URLs on every outcome. Unsupported/corrupt/unreadable files retain the existing attachment icon. Remote-image permission remains independent.

Use focused real-dependency tests and exact-build native scenarios. Apply the full repository indexing/persistence acceptance gates if confirmed fixes change those owners, including reusable-cache and unchanged-restart evidence. Use approved disposable vaults and managed ignored validation storage; do not mutate production vaults. Follow the mixed-agent authority and keep the PR draft until review/acceptance.

This scaffold must be deleted before final implementation review, not archived. Do not replace the root HANDOFF.md for this planning-only task.

Planning evidence: current issue/comment, source/test and repository-workflow review only. No build, runtime regression, native device or performance test has been run in this planning session.
