# Standing instructions ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â preserve this header

This is a temporary handoff document between agents. The development of the solution involves agents with access to Obsidian CLI and a full development environment with all node packages installed, but also agents with more limited access. Development is done in "ping-pong" between these two types of agents. Agents should use this document to pass instructions and status from one another, such as instructions for testing/validation, or instructions for development work that can only be done in a full environment.

## Mixed agent handoff

### Instructions

The **offline development agent has no Obsidian CLI/runtime access** and performs most scoped implementation and substantial trace analysis. Its Node/dependency/browser/network/Git capabilities must be recorded, not assumed. The **main validation agent has Obsidian CLI and a full dependency environment** and prepares assignments, captures runtime evidence, reviews/fixes returns, performs native validation and handles authorized Git/PR actions. Host-only probes or supporting development can be requested from the main agent and the resulting evidence sent back for offline analysis.

Follow `AGENTS.md`, `CONTRIBUTING.md` and [the mixed agent workflow](docs/AGENT_WORKFLOW.md). Keep this single handoff transient: preserve the opening note/standing instructions and overwrite the assignment/results below on each transfer, in either direction. Do not archive handoffs or append a session history. Persist accepted architecture/checkpoint decisions and limitations in `Refactor plan.md`; feature-specific evidence belongs in the issue/PR or a reviewed validation report.

Return uncommitted changes and actual results for main-agent review unless the maintainer explicitly assigns other repository authority. Missing prerequisites/tests remain pending; a skip is not a pass. The main agent independently reviews, runs applicable checks, fixes defects and recommends only necessary prioritized manual checks. Commit/PR/merge/release steps follow applicable maintainer authorization after required validation or explicit acceptance of a recorded limitation.

Obsidian is the production host; preserve the established portable semantic, identity/source, publication/revision, localization and environment boundaries.






---

# Active status: PR #302 merge authorized

The maintainer explicitly instructed committing/merging the tested branch, then switching to main and fetching, after review of the known strict cache-work exception and platform limits. Implementation and final Windows validation are complete. See https://github.com/zsviczian/kplex/pull/302 for scope, actual results and the accepted exception. No new runtime changes are needed for this merge.

Final source: ordinary minified CommonJS, no code/catalog packing, fflate or Pako. Deferred settings/services retain native loading-view state and lifecycle cleanup. Deleted Sidecar notes retain incoming placeholder connections. Prior authoring, reciprocal writes, phone-tab, Sidecar-release and shared template-dialog work is included.

Verification: Node22.22.2, full npm run verify PASS (core135, main2425, browser575, sources383, real IndexedDB1037, installed Obsidian types and real build). Exact-source native Small functional checks and all4 pending-save/reuse app-reload cycles PASS, including independent restoration audits. Brain warm plugin initialization53.5-65.7ms. One visible-canvas restart still checked3 cached sources and prepared80 dependencies: zero Vault body reads/parses, repairs, global inventory, full rebuilds, source writes or snapshot saves. That strict zero-work gate FAILED; the maintainer authorized merge after this specific limitation was explained. Assertions remain unchanged. Physical mobile/WKWebView and a fresh exact-artifact native Mac run remain unverified.

Production state is restored: Brain only open, original layout/settings restored and stable; notes inventory/mtime/size unchanged. Sync remains paused by the user; do not resume it. The exact unpacked local build56143c6697cec9e23924e18fb6bd555798ec579638b21b8f5c10f487a1d01dcf remains deployed in Brain and Small; Small is closed. Do not replace current settings with an older backup. Raw evidence and recovery receipts remain in managed ignored .test-work/validation storage, summarized in the PR; no routine reports belong in Git.

Git merge/switch/fetch is the only remaining authorized work. Do not publish a release, tag a version, resume Sync or modify production notes.
