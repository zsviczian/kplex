# Standing instructions — preserve this header

This is a temporary handoff document between agents. The development of the solution involves agents with access to Obsidian CLI and a full development environment with all node packages installed, but also agents with more limited access. Development is done in "ping-pong" between these two types of agents. Agents should use this document to pass instructions and status from one another, such as instructions for testing/validation, or instructions for development work that can only be done in a full environment.

## Mixed agent handoff

### Instructions

The **offline development agent has no Obsidian CLI/runtime access** and performs most scoped implementation and substantial trace analysis. Its Node/dependency/browser/network/Git capabilities must be recorded, not assumed. The **main validation agent has Obsidian CLI and a full dependency environment** and prepares assignments, captures runtime evidence, reviews/fixes returns, performs native validation and handles authorized Git/PR actions. Host-only probes or supporting development can be requested from the main agent and the resulting evidence sent back for offline analysis.

Follow `AGENTS.md`, `CONTRIBUTING.md` and [the mixed agent workflow](docs/AGENT_WORKFLOW.md). Keep this single handoff transient: preserve the opening note/standing instructions and overwrite the assignment/results below on each transfer, in either direction. Do not archive handoffs or append a session history. Persist accepted architecture/checkpoint decisions and limitations in `Refactor plan.md`; feature-specific evidence belongs in its issue/PR or a reviewed validation report.

Return uncommitted changes and actual results for main-agent review unless the maintainer explicitly assigns other repository authority. Missing prerequisites/tests remain pending; a skip is not a pass. The main agent independently reviews, runs applicable checks, fixes defects and recommends only necessary prioritized manual checks. Commit/PR/merge/release steps follow applicable maintainer authorization after required validation or explicit acceptance of a recorded limitation.

Obsidian is the production host; preserve the established portable semantic, identity/source, publication/revision, localization and environment boundaries.

---

# Online SI5 result — bounded posting reads implemented and validated

## Scope and checkpoint boundaries

Pre-instrumentation implementation `62c7283`; diagnostics/owner-loop correction `8cd10b7d6746d607f8214ad192670a0b9a370778`; selection-reuse correction **`80a14ecaff42daa657c0e86aa04ff4ecd46046fc`**. Posting batching was developed and measured on a separate candidate after that clean checkpoint and forms the next independently validated checkpoint. Use `git log -1` for its resulting SHA; no push/release. Explicit online CLI/Git/development authority applies. C15–C26 stay paused.

SI5 remains open. Existing extreme-vault cold behavior is accepted; the synthetic 20k-contributor hub `decode-budget` result is a known stress limit outside the critical path. No architecture/projection/cache/database redesign, memory increase, scheduling change or further cold optimization. Physical iPad/Android and final settings-route/retirement/evidence audit remain pending.

## Implementation and exact results

[All timings, counters, commands and limits](docs/validation/settings-independent-indexing-si5-posting-batching-2026-10-04.md); [machine-readable evidence](docs/validation/settings-independent-indexing-si5-posting-batching-2026-10-04.json); [immediate baseline](docs/validation/settings-independent-indexing-si5-clean-selection-2026-10-04.md).

The production change is eight lines in `visitFamily()`: use the existing byte/record-bounded posting batch's first/last primary keys to issue one exact `getAll(range, batch.length)` (at most 256 records). Check returned length, then retain every shape/source/revision/family/index/kind/key comparison and posting/family/frame digests. Keep existing transaction ownership, leases/head/freshness checks, cancellation, decode limits, yields and memory fallback. Do not aggregate families or expand the existing batch sizes. No schema or parser/compiler/classifier change.

Exact installed `main.js` SHA-256 **`c9cc8a491b4294de9f7d04781069ea983131029b682aec02b778ba0f17d7b4bf`** passes three foreground restarts at **66,170.2 / 65,323.9 / 74,122.6 ms**, median **66,170.2 ms**, immediate baseline median **82,149.4 ms**: observed **15,979.2 ms lower**. These sequential series are not randomized paired trials or pre-implementation A/B. Report the observed improvement without exclusive I/O/timer/GC attribution or SI5/device/paint acceptance.

Posting reads **484,199 point requests → 0 point requests + 20,027 bounded range requests**, **464,172 fewer requests**. Host comparison specifically **484,178 → 20,015 requests**. Four owner walks each still visit all 20,015 owners; dependency checks/selections 40,030, inspections 80,060, head reads 100,111 and repository yields 20,027 remain. Zero source/Markdown I/O, parsing, reacquisition, repair, rewrites or full builds.

Host comparison **47.024–56.329 seconds**, reconciliation **9.228–9.701 seconds**; post-requested hydration **6.077 / 7.364 / 6.700 seconds**. Complete phase tables and milestones are in the report. Scheduling wait remains unmeasured; no yield removal or next optimization was added.

## Validation and cleanup

Focused real-IDB lane **16/16**; full `npm run verify` passes architecture 7/core 62/Node 138/UI 7/portable 317/browser **199**, actual installed Obsidian types and production build. Existing 20,015-owner browser publication passes in 394,237.9 ms; browser lane 527,588.2 ms. Three new regressions protect capped ranges/batch boundaries and family isolation; first/middle/boundary/last missing, wrong-key and fractional-key postings; and concurrent head replacement/cleanup or cancellation during the range await, with lease/decode cleanup. Existing repair/corruption/process restart/storage/byte-budget tests pass. No production source edits after verification started.

Native foreground **68/68, 67/67, 76/76** samples valid, normal background throttling enabled. Timed CLI reconnects zero; all **20 evidence assertions** pass. Source heads/settings unchanged; original settings/enablement byte-identical; wrappers/controllers/opt-in removed, private owner sets released; 21 frozen phases remain readable after CLI exit. Restoring original Reference-center settings leaves live status updating on the excluded hub; completed strict-ready records are historical, not current readiness guarantees.

Fresh backup `/private/tmp/kplex-si5-posting-before-2026-10-04`; exact build stays installed only in disposable kplex-test. Matched native disable/enable staging passes with actual instance/hash/config checks; no configured-versus-loaded mismatch or lost read. Existing individual 30-second CLI limits, five-second polling/ten-second reconnect, no outer readiness limit and unchanged production watchdog remain. Submission/cleanup still need responsive CLI. No personal-vault changes.

## Remaining steps

Checkpoint this correction before adding another behavior change. The largest remaining phase is host comparison, now 47–56 seconds. Exclusive cost of its 20,015 repository yields and other storage waits is still unmeasured; measurement is the next candidate before any scheduling correction. Do not infer cause from total time or remove yields blindly. Physical iPad/Android interruption/resume and representative workflows (hundreds of links, roughly a thousand at an extreme), and the final retirement/settings-route/evidence audit, remain separate required work. Do not reopen dense-hub/cold redesign or expand SI5 into broad refactoring.
