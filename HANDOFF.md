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

**State: main-agent review and automated/CLI validation complete; one native File Explorer drag check remains for maintainer confirmation. Changes remain uncommitted.**

- Sender → recipient: offline development agent → main validation agent → maintainer.
- Kind: issue #30 feature implementation / return review.
- Objective: dragging one Markdown note from Obsidian File Explorer onto K-Plex makes that note central in the same surface. The maintainer clarified this is an Obsidian-internal File Explorer gesture, not an operating-system file drop.
- Base branch/commit: `drop-to-open-file` at `54c539f` (`54c539ffa00117ae39fe652fd2376bca3729d049`). Incoming changes were uncommitted in `HANDOFF.md`, `src/ui/App.tsx`, `tests/indexing.test.mjs`, `tests/presentation-environment.test.mjs`, and new `src/adapters/obsidian/fileExplorerDrag.ts`.
- Main-agent environment: Node v22.22.2, npm dependencies installed with `npm ci`, Obsidian CLI 1.14.2 (installer 1.14.0), installed `obsidian` types 1.13.0, macOS 14.5, explicit disposable vault `kplex-test` at `/Users/zsviczian/Obsidian/kplex-test`.

### Implementation and review

- The new `src/adapters/obsidian/fileExplorerDrag.ts` isolates Obsidian's untyped `app.dragManager.draggable` payload. It accepts only `type: "file"` or a one-element `type: "files"` payload, resolves the current Vault file by path, and returns only Markdown files. This follows the existing internal drag-manager pattern in the sibling Excalidraw plugin and fails closed for unsupported payloads.
- `src/ui/App.tsx` handles the supported drop on both the normal graph surface and initial empty/indexing surface. Indexed files use the existing `activate()` path. An unindexed file is held by `TFile` identity until a later index publication; deletion/replacement clears it, while rename/move can follow the updated file path.
- Review found that a queued unindexed drop could override a later user navigation. `activate()` now clears the pending drop whenever a newer explicit navigation occurs. A live-host probe covers that ordering.
- The incoming test change had removed unrelated assertions for the desktop draggable-dialog behavior. The review restored those regression guards. Adapter cases and the new surface/pending/cancellation guards remain in `tests/presentation-environment.test.mjs` and `tests/indexing.test.mjs`.
- No persisted schema, settings, command IDs, UI copy, styles, or vault content changed. Pending state is view-local and is not persisted.

### Validation performed by the main agent

- `npm ci` under Node v22.22.2 → PASS; 317 packages installed, no reported vulnerabilities.
- `npm run verify` → PASS on the reviewed source: architecture checker (45 migrated roots, 86 reachable files, 0 violations), core suite (58/58), lint, indexing fixture, aggregate Node suite (103/103), browser DOM suite (5/5), and production build/type check.
- `npm run verify:obsidian` → PASS against the explicit `kplex-test` vault using the exact final build. Artifact SHA-256 values matched between `dist/` and the staged plugin bundle; plugin command registration and rendered `.excalibrain-app` containing K-Plex passed with no captured JavaScript errors. Report: `/private/tmp/kplex-drop-final/report.json`.
- Live CLI/React-host event probes: a single current Markdown `type: "file"` payload was accepted, selected the requested center and added it to navigation history; `type: "link"` and multi-file payloads were ignored without navigation; a temporarily withheld index lookup queued the note and `index.notify()` activated it once available; a subsequent explicit navigation canceled the pending drop. Each probe restored the original center/history and cleared the temporary drag payload.
- `git diff --check` → PASS. No generated `dist/` output is tracked or part of the change.
- An initial native runner attempt stopped responding at `dev:errors` after opening K-Plex. The CLI endpoint responded independently, and a complete subsequent `npm run verify:obsidian` passed.

### Maintainer check still required

1. In Obsidian desktop, perform one real drag from File Explorer: drag a single Markdown note onto the graph area of K-Plex. Confirm that this same K-Plex surface centers on the note once. The CLI probe dispatched the mounted drop handler with Obsidian's drag-manager payload, but did not reproduce an actual pointer drag from File Explorer, so that host gesture remains unverified.
2. If convenient, verify that dropping a folder, attachment, multiple selected files, or an editor link does not navigate K-Plex. Automated adapter/host probes cover link and multi-file rejection; folder and attachment rejection are adapter-tested. A manual repeat in Sidepanel/popout is only needed if those surfaces are in the intended feature scope.

Cold/partial indexing was validated by withholding a target from the live index read and publishing an index notification, not by racing a real cold-start index. No manual timing test is required unless the real File Explorer check exposes an issue.

### Remaining risk and next action

The sole host-specific dependency is Obsidian's private `dragManager.draggable` shape. If it changes, the adapter rejects the payload and the gesture has no effect. After the prioritized real File Explorer drag check, record the result here for maintainer review; commit/PR actions were not requested in this handoff.
