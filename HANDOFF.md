# Standing instructions — preserve this header

This is a temporary handoff document between agents. The development of the solution involves agents with access to Obsidian CLI and a full development environment with all node packages installed, but also agents with more limited access. Development is done in "ping-pong" between these two types of agents. Agents should use this document to pass instructions and status from one another, such as instructions for testing/validation, or instructions for development work that can only be done in a full environment.

## Mixed agent handoff

### Instructions

The **offline development agent has no Obsidian CLI/runtime access** and performs most scoped implementation and substantial trace analysis. Its Node/dependency/browser/network/Git capabilities must be recorded, not assumed. The **main validation agent has Obsidian CLI and a full dependency environment** and prepares assignments, captures runtime evidence, reviews/fixes returns, performs native validation and handles authorized Git/PR actions. Host-only probes or supporting development can be requested from the main agent and the resulting evidence sent back for offline analysis.

Follow `AGENTS.md`, `CONTRIBUTING.md` and [the mixed agent workflow](docs/AGENT_WORKFLOW.md). Keep this single handoff transient: preserve the opening note/standing instructions and overwrite the assignment/results below on each transfer, in either direction. Do not archive handoffs or append a session history. Persist accepted architecture/checkpoint decisions and limitations in `Refactor plan.md`; feature-specific evidence belongs in its issue/PR or a reviewed validation report.

Return uncommitted changes and actual results for main-agent review unless the maintainer explicitly assigns other repository authority. Missing prerequisites/tests remain pending; a skip is not a pass. The main agent independently reviews, runs applicable checks, fixes defects and recommends only necessary prioritized manual checks. Commit/PR/merge/release steps follow applicable maintainer authorization after required validation or explicit acceptance of a recorded limitation.

Obsidian is the production host; preserve the established portable semantic, identity/source, publication/revision, localization and environment boundaries.

---

# Main validation pending desktop unlock

Offline → main. URL correction and narrow native fan-out correction are reviewed and frozen on
`indexing-fixes`, after checkpoint `9ba04cf`. New changes remain uncommitted; no push/PR authority.
C15–C26 stay paused. The main agent has CLI/runtime access; no further offline edits are queued.

## Exact current evidence

- Required Node22.22.2 `verify:obsidian` passes architecture7/core69/Node253/UI17/portable327/
  Chromium368, production fixtures/types/scanner/build and exact native smoke. Existing
  activeLeaf warning only. Source freeze `/private/tmp/kplex-url-final9-source-freeze-20261006.json`
  covers276 unchanged inputs; manifest SHA
  `1f5417e21d26020b61e5f834dd744198a0d9ff5b6ca5d0c366806cccc8671ae1`.
- Exact staged small-vault main SHA
  `5044bdf7248ee821f31352a26fbdd82085f38320dbfe1908de674c7895061999`.
  Reference vault still has the previous artifact; no new main.js deployment there yet.
- Complete relationship browser file44/44. Native cached fan-out can dirty a selected linked
  owner after the first cancellation/last retry capture; source acquisition now drains one finite
  snapshot of its authoritative active-task Map, preserving current fences and two attempts.
  Finally-delete/unload-clear retain its lifetime. No new parser/classifier/scheduler/schema.
- Disposable URL fixture passes identity/property evidence/numeric gates/content/rename/delete/
  shared hierarchy and warm URL cache15 owners/zero URL body reads. Owned notes removed and
  settings/enablement exact hashes preserved. Initial premature child assertion failure retained;
  rerun waits current owner closure, captures active incomplete1-child→settled2-child state.
- Focus=false makes the fixture functional-only. Eager foreground refuses its focus prerequisite
  and restores settings/enablement. Electron reports desktop session `locked`; all three visible
  Obsidian windows are unfocused. Activation cannot overcome lock. CUA inspection timed out.
  User was asked to unlock. This is an environment prerequisite, not approval rejection.

## Remaining serial native work after unlock

Use required Node22 PATH plus `/usr/local/bin` and explicit small-vault variables. Keep actual
window focus/visibility and original throttling; do not overlap drivers or browser runs.

1. Rerun `/private/tmp/kplex-eager-foreground-run.mjs` with report directory
   `/private/tmp/kplex-url-eager-foreground-20261006`; retain initial focus failure reports.
2. Run `/private/tmp/kplex-url-si5-run.mjs` with the same explicit disposable-vault variables.
   It backs up the7.2MiB vault and exact structured IDB values privately, invokes the existing
   required SI5 driver in temporary Eager mode with genuine saved semantics, then restores
   original data/enablement/controller/load/save/mode. Backup is not yet created.
3. Run `/private/tmp/kplex-url-reference-check.mjs --deploy` then `--warm` then `--eager`,
   one at a time. Only main.js may be deployed; reference notes strictly read-only. Private
   independent body oracle expects232 root referrers/four subpaths before active exclusions.
   Require actual URL center/progressive incidence/case-root identity/no self-edge/numeric
   labels after URL→ordinary→URL navigation, exact preference/enablement/note-inventory cleanup.
4. Run `/private/tmp/kplex-url-vault-reload.mjs`, then `/private/tmp/kplex-url-cache-size.mjs`.
   Renderer reload is not process cold start; logical JSON UTF16 size is not physical IDB allocation.
5. Recheck frozen inputs/artifacts/no temporary controllers or wrappers, update V2/Refactor plan/
   validation and minimized evidence, mark HANDOFF inactive only after actual acceptance.

All owned test processes have completed. Full report remains private at
`/private/tmp/kplex-url-final9-full-20261006/report.json`; durable current findings and all failed
attempts are in [validation](docs/validation/url-indexing-and-foreground-2026-10-06.md).
Do not claim production latency, complete delivery or physical-device acceptance yet.
