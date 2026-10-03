# Standing instructions — preserve this header

This is a temporary handoff document between agents. The development of the solution involves agents with access to Obsidian CLI and a full development environment with all node packages installed, but also agents with more limited access. Development is done in "ping-pong" between these two types of agents. Agents should use this document to pass instructions and status from one another, such as instructions for testing/validation, or instructions for development work that can only be done in a full environment.

## Mixed agent handoff

### Instructions

The **offline development agent has no Obsidian CLI/runtime access** and performs most scoped implementation and substantial trace analysis. Its Node/dependency/browser/network/Git capabilities must be recorded, not assumed. The **main validation agent has Obsidian CLI and a full dependency environment** and prepares assignments, captures runtime evidence, reviews/fixes returns, performs native validation and handles authorized Git/PR actions. Host-only probes or supporting development can be requested from the main agent and the resulting evidence sent back for offline analysis.

Follow `AGENTS.md`, `CONTRIBUTING.md` and [the mixed agent workflow](docs/AGENT_WORKFLOW.md). Keep this single handoff transient: preserve the opening note/standing instructions and overwrite the assignment/results below on each transfer, in either direction. Do not archive handoffs or append a session history. Persist accepted architecture/checkpoint decisions and limitations in `Refactor plan.md`; feature-specific evidence belongs in its issue/PR or a reviewed validation report.

Return uncommitted changes and actual results for main-agent review unless the maintainer explicitly assigns other repository authority. Missing prerequisites/tests remain pending; a skip is not a pass. The main agent independently reviews, runs applicable checks, fixes defects and recommends only necessary prioritized manual checks. Commit/PR/merge/release steps follow applicable maintainer authorization after required validation or explicit acceptance of a recorded limitation.

Obsidian is the production host; preserve the established portable semantic, identity/source, publication/revision, localization and environment boundaries.

---

# Offline assignment — complete the SI4-R3 correction

Work from the supplied repository package on `indexing-optimization-v2`. The exact R3 return is checkpointed at `56a6e68` and remains unaccepted; this assignment builds on that code and the main-agent browser expectation corrections. Accepted implementation remains SI4-R2 at `831e345`. Do not start SI5 or C15–C26.

## Execution and return

Before editing, share a step-by-step execution plan tied to the requirements below. During execution, report completed steps, current work, blockers and the next step at intervals of no more than **three minutes**. Update the plan if evidence changes the approach.

You have local read/write access only and cannot make Git commits. Return a **patch zip containing only new and changed files**, in repository-relative paths. Exclude unchanged files, Git metadata, dependencies and generated build artifacts. List any required deletions explicitly in the return; do not include a full repository zip. Preserve this standing header and replace this assignment body with your implementation/validation results.

## Concrete review evidence

Read `docs/validation/settings-independent-indexing-si4-r3-review-2026-10-03.md` and the active SI4 section of `docs/INDEX_SETTINGS_INDEPENDENCE_DESIGN.md`.

- Real IndexedDB hot lookup succeeds: 20,015 owners, 79 pages, 78 yields, exact order/count, cancellation without a prefix. Keep this forward work.
- Production cached replay is quadratic. Empty-source preparation makes 1,409,664 / 5,606,144 / 22,358,016 / 89,298,944 host-validity checks at 128 / 256 / 512 / 1,024 owners. `CachedSourceSemantics.reason()` scans every owner inside the callback used throughout replay/compiler work; neighborhood and degree readers do the same. The scope preparer's array membership check is also linear per source.
- Retained-memory safety was replaced with single-item guards. Lookup keeps all heads; discovery keeps facts and serialized deduplication keys; replay keeps owner callbacks and compiled state. Its `peakBytes` estimate counts only 256 bytes plus ID/revision lengths per owner, omitting most retained data.
- The 20,015-owner regression clones template manifests and proves lookup only. Final semantic/publication coverage uses much smaller cases.
- Main-agent test fixes retain the folder parent in the 8,193-reference case (8,194 total neighbors/gate relations/raw degree) and align the legacy-catalog frontier test with the existing portable expectation. Keep both fixes.

## Required correction — one integrated return

1. **Make validity work scale with the actual input.** Use the existing monotonic policy/demand/source/host/maintenance generations for cheap cancellation during replay/compiler steps. Validate the active source locally and cooperatively revalidate the complete selected inputs at bounded checkpoints/final publication. Remove repeated all-owner scans from record-level callbacks and linear scope membership checks. Preserve fail-closed behavior for every previously tested source/host/policy/demand mutation, including during an awaited continuation. Do not skip final validation or cache a successful validation indefinitely.
2. **Control retained memory.** Distinguish required final scope state from temporary pages, duplicated selections, serialized identities and simultaneously retained compilations. Use compact metadata, reuse/release temporary structures and bound live buffers by bytes and records. Report a defensible estimate/measurement covering heads/families, structural facts, owner captures and compiled state; the fixed per-owner estimate alone is insufficient. Keep explicit safety for pathological inputs while allowing the target 20,015-owner case to complete. Do not add a generic spill/proof framework, a second graph, a global contributor catalog or a new persistence format without a demonstrated necessity.
3. **Test the complete production path.** Add independently replayable owners/facts for a 20,015-owner supported scope and exercise cached semantic preparation through GraphIndex publication, gates/siblings/degrees and relevant consumers. Do not stop at a standalone lookup. Compare exact results with the canonical full compiler, and test supersession/cancellation between batches without exposing a prefix. Count validity work at increasing sizes to catch quadratic growth without relying only on elapsed-time thresholds. Record peak retained work and latency for the large case.
4. **Finish existing SI4 acceptance coverage.** Friend↔Challenger moves, dormant-field add/remove, inference direction and image-selector changes must use valid cached facts with zero body reads/parses/reacquisitions/full builds. Latest settings/navigation demand wins. Preserve R1 repair and R2 automatic create/modify/rename/delete/recreate locality. Keep supported hot structural scopes and gates/degree parity green.

This is the existing R3 correction, not a new prerequisite checkpoint. Prefer changes in the current owners and eliminate redundant validation rather than adding overlapping abstractions. Existing semantics, finality and memory safety remain required.

## Validation and return evidence

Run the strongest available versions of:

```bash
fnm exec --using=22.22.2 npm run test:sources
fnm exec --using=22.22.2 npm run test:sources:browser
fnm exec --using=22.22.2 npm run verify
git diff --check
```

If Git, exact Node/dependencies or browser access is unavailable, state the precise limitation and run available checks without claiming unavailable lanes passed. Include changed/new/deleted paths, the completed execution plan, validity-work counts, retained-memory/large-case measurements, exact test outcomes and narrowly specified remaining native checks in the returned HANDOFF. Native Obsidian validation belongs to the main agent after review; do not claim native or device evidence.
