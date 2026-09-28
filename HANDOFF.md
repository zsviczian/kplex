# Standing instructions — preserve this header

This is a temporary handoff document between agents. The development of the solution involves agents with access to Obsidian CLI and a full development environment with all node packages installed, but also agents with more limited access. Development is done in "ping-pong" between these two types of agents. Agents should use this document to pass instructions and status from one another, such as instructions for testing/validation, or instructions for development work that can only be done in a full environment.

## Mixed agent handoff

### Instructions

The **offline development agent has no Obsidian CLI/runtime access** and performs most scoped implementation and substantial trace analysis. Its Node/dependency/browser/network/Git capabilities must be recorded, not assumed. The **main validation agent has Obsidian CLI and a full dependency environment** and prepares assignments, captures runtime evidence, reviews/fixes returns, performs native validation and handles authorized Git/PR actions. Host-only probes or supporting development can be requested from the main agent and the resulting evidence sent back for offline analysis.

Follow `AGENTS.md`, `CONTRIBUTING.md` and [the mixed agent workflow](docs/AGENT_WORKFLOW.md). Keep this single handoff transient: preserve the opening note/standing instructions and overwrite the assignment/results below on each transfer, in either direction. Do not archive handoffs or append a session history. Persist accepted architecture/checkpoint decisions and limitations in `Refactor plan.md`; feature-specific evidence belongs in its issue/PR or a reviewed validation report.

Return uncommitted changes and actual results for main-agent review unless the maintainer explicitly assigns other repository authority. Missing prerequisites/tests remain pending; a skip is not a pass. The main agent independently reviews, runs applicable checks, fixes defects and recommends only necessary prioritized manual checks. Commit/PR/merge/release steps follow applicable maintainer authorization after required validation or explicit acceptance of a recorded limitation.

Obsidian is the production host; preserve the established portable semantic, identity/source, publication/revision, localization and environment boundaries.

---


## Current transfer

**State: returned for main-agent review.**

- Sender → recipient: offline development agent → main validation agent.
- Kind: correction to recent-leaf navigation history.
- Objective: make **Sync K-Plex with recent tab** follow the exact sequence of `active-leaf-change` events inside a tab group instead of resolving through workspace/group order.
- Base identity: the maintainer's current repository state from the previous transfer (user-supplied `repository.zip` plus the prior leaf-history adaptation). No Git metadata is available in this offline handoff copy.
- Actual capabilities: no Obsidian runtime/CLI. Container Node is `v22.16.0`; repository contract requires Node `22.22.2`. Project dependencies are not installed; global TypeScript is available for syntax checks.

## Root cause in the previous patch

The previous implementation was still treating navigation history as a **qualified MRU set**:

- it tried to decide during `active-leaf-change` whether the activated leaf already exposed a file or Web Viewer URL;
- it de-duplicated by leaf identity and moved that entry to the MRU front;
- it later iterated that MRU rather than replaying the real activation sequence.

That is weaker than the required model. `active-leaf-change` can occur before a newly selected view is fully materialized, and de-duplicating the leaf sequence obscures the exact navigation chronology. The reliable input is the leaf activation itself; file/URL qualification belongs at resolution time.

## Implementation

`src/main.ts` now keeps a bounded chronological `WorkspaceLeaf[]` history, oldest to newest.

- Every non-null `active-leaf-change` is appended immediately, including K-Plex and utility leaves.
- No file/view/visibility check is performed before the leaf is stored.
- Repeated activations are preserved; the history is **not de-duplicated**.
- The history is capped at 20 entries by removing only the oldest overflow.
- Closed leaves are pruned by comparing leaf object identity with `workspace.iterateAllLeaves()`; surviving order is unchanged.
- `findRecentDocumentLeaf()` iterates the activation history from newest to oldest and inspects each leaf **at resolution time** with `fileForLeaf()`. K-Plex/utility leaves are skipped naturally; hidden file siblings in the same tab group remain eligible.
- `findRecentIndexedNavigationTarget()` uses the same reverse chronological traversal. For each live historical leaf it checks, in order:
  1. current vault file → indexed file path;
  2. current Web Viewer URL → indexed URL node.
- If explicit activation history exists but contains no indexed target, sync returns no target. It does not fall through to `getMostRecentLeaf()` or workspace iteration, which is the path that previously selected the first tab in the group.
- Generic file handling from the previous patch is preserved: any view/file type resolving to a `TFile` can participate (Markdown, image, Bases, attachment, etc.). Web Viewer URL support is also preserved.

## Changed files

- `src/main.ts`
- `tests/indexing.test.mjs`
- `HANDOFF.md`

## Validation performed offline

- `NODE_PATH=/opt/nvm/versions/node/v22.16.0/lib/node_modules node tests/indexing.test.mjs` — **PASS**.
- Global TypeScript `transpileModule` syntax validation of `src/main.ts` — **PASS**.
- Behavioral simulation of `tab 1 → tab 3 → K-Plex` using the same chronological resolver semantics — **PASS**: reverse traversal skips K-Plex and returns tab 3; after tab 3 is closed, traversal falls back to tab 1.
- Regression guards now require:
  - every `active-leaf-change` to append the leaf before qualification;
  - chronological `push()` storage;
  - no de-duplication;
  - newest-to-oldest traversal;
  - closed-leaf pruning without reordering;
  - file qualification at resolution time;
  - Web Viewer qualification at resolution time;
  - no workspace-order fallback once explicit activation history exists.

## Required main-agent validation

1. Run Node `22.22.2` with normal dependencies and execute `npm run verify`.
2. Primary native regression in **one tab group**:
   - tab 1 = file A;
   - tab 2 = K-Plex;
   - tab 3 = file B;
   - click tab 1, click tab 3, optionally edit B, click K-Plex, then choose **Sync K-Plex with recent tab**;
   - expected: K-Plex navigates to B, never A.
3. Repeated chronology: A → B → A → K-Plex must resolve A; then B → K-Plex must resolve B.
4. Stale history: activate B, close B, return to K-Plex, sync. Expected: reverse traversal skips the detached B leaf and resolves the previous valid indexed target.
5. File-type regression: repeat with an indexed image/attachment/Bases file. The most recently activated indexed file-backed leaf must win regardless of extension/view subtype.
6. Web Viewer regression where supported: activate an indexed URL in Obsidian Web Viewer, then K-Plex, then sync. Expected: reverse history traversal skips K-Plex and resolves the indexed URL. A non-indexed URL should cause traversal to continue backward to the preceding indexed file/URL target.
7. Startup/Sidecar regression: verify persisted Sidecar restoration and recent/pinned document sync modes still behave correctly. The chronological history is session-only and does not replace persisted Sidecar ownership.

## Reviewer attention

If native behavior still differs, instrument/log the actual `active-leaf-change` sequence (leaf identity and current `getViewState().type/state.file`) for A → B → K-Plex. Do not reintroduce `getMostRecentLeaf()` or workspace-order selection as an authoritative recent-tab source; those APIs are retained only for the no-history startup compatibility path.

## Next recipient

Main validation agent: run the full repository gate and the same-group chronology tests above against the exact build artifact.
