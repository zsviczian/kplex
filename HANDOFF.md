# Standing instructions — preserve this header

This is a temporary handoff document between agents. The development of the solution involves agents with access to Obsidian CLI and a full development environment with all node packages installed, but also agents with more limited access. Development is done in "ping-pong" between these two types of agents. Agents should use this document to pass instructions and status from one another, such as instructions for testing/validation, or instructions for development work that can only be done in a full environment.

## Mixed agent handoff

### Instructions

The **offline development agent has no Obsidian CLI/runtime access** and performs most scoped implementation and substantial trace analysis. Its Node/dependency/browser/network/Git capabilities must be recorded, not assumed. The **main validation agent has Obsidian CLI and a full dependency environment** and prepares assignments, captures runtime evidence, reviews/fixes returns, performs native validation and handles authorized Git/PR actions. Host-only probes or supporting development can be requested from the main agent and the resulting evidence sent back for offline analysis.

Follow `AGENTS.md`, `CONTRIBUTING.md` and [the mixed agent workflow](docs/AGENT_WORKFLOW.md). Keep this single handoff transient: preserve the opening note/standing instructions and overwrite the assignment/results below on each transfer, in either direction. Do not archive handoffs or append a session history. Persist accepted architecture/checkpoint decisions and limitations in `Refactor plan.md`; feature-specific evidence belongs in its issue/PR or a reviewed validation report.

Return uncommitted changes and actual results for main-agent review unless the maintainer explicitly assigns other repository authority. Missing prerequisites/tests remain pending; a skip is not a pass. The main agent independently reviews, runs applicable checks, fixes defects and recommends only necessary prioritized manual checks. Commit/PR/merge/release steps follow applicable maintainer authorization after required validation or explicit acceptance of a recorded limitation.

Obsidian is the production host; preserve the established portable semantic, identity/source, publication/revision, localization and environment boundaries.

---

# Offline assignment — SI4-R3 high-degree completion and final SI4 acceptance

Work from the supplied `indexing-optimization-v2` package. Accepted implementation baseline is `831e345` (SI4-R2). Implement the complete R3 package. Do not start SI5 or C15–C26.

## Objective

Make supported hot dependency, structural and semantic scopes finish through cancellable bounded work instead of remaining permanently pending at arbitrary cardinality caps. Then close SI4 with end-to-end settings and maintenance regressions. Keep the existing settings-neutral source repository, source-local dependency index and canonical compiler; do not restore the retired process-wide contributor-catalog bootstrap or add another graph/index/proof format.

## Required behavior

1. A valid dependency key with **20,015 active owners** must be read in bounded pages, cooperatively yield, honor cancellation and final revision/sequence/head fences, and return one complete ordered result. It must never publish a prefix. Replace the existing test that expects pre-scan backpressure with real rows/owners/heads and successful completion.
2. Carry that complete result through the production source-local discovery, cached replay and requested semantic path. Hot folders, center relationships, parent/sibling witnesses, gate totals and candidate raw degrees must not become permanently pending at the current 256-owner, 1,024-structural-fact, 4,096-relation, 8,192-node or 32-candidate boundaries. Keep genuine byte/memory safety checks, but process a supported large scope in bounded batches/continuations rather than simply raising or deleting constants.
3. Preserve point-in-time finality. Policy, demand, source, host, maintenance or dependency supersession must cancel/discard the entire unfinished result. Storage faults and malformed evidence fail closed. Repeated cancellation/navigation/settings changes must release readers, timers and retained graphs; no partial readiness or stale publication may escape.
4. Keep work proportional to the requested scope. A hot request may visit all of its proven owners/relations, but it must not scan unrelated owners, enumerate Markdown, reread unchanged bodies, rebuild the full graph or resurrect the global contributor catalog. Record work counters for pages, rows, owners, source replays, relationships, yields and retained peak items/estimated bytes.
5. Complete the existing production settings route: Friend↔Challenger moves, dormant-field add/remove, both inference directions and image-selector changes must publish coherent center relationships, siblings, gates, search, explanation and edit eligibility from cached facts with zero valid-source body reads/parses/reacquisitions and no full build. S1→S2→S3 and navigation cancellation publish only the latest demand.
6. Consolidate only code made redundant by the completed production path. Preserve stored-data compatibility, R1 repair, R2 local-event scheduling, uncertain-event cached-fact reconciliation and existing presentation behavior. Do not broaden scope into SI5 startup/device work.

## Regression and acceptance evidence

Add deterministic portable/real-IndexedDB coverage for:

- 20,015-owner hot lookup success, exact order/count and cancellation between pages;
- hot structural parent/folder and high-degree center completion with exact full-compiler parity, including gates/siblings/raw degrees;
- no prefix on cancellation, storage error, corrupt row/head, or source/policy/host supersession;
- bounded retained work and zero unrelated inventory/body/full-build work;
- final settings scenarios and R2 create/modify/rename/delete/recreate behavior remaining green.

Run the strongest available forms of:

```bash
fnm exec --using=22.22.2 npm run test:sources
fnm exec --using=22.22.2 npm run test:sources:browser
fnm exec --using=22.22.2 npm run verify
git diff --check
```

Return uncommitted changes with the changed files, continuation ownership, measured 20,015-owner work/peak bounds, exact test results and any environment limitations. Do not claim Obsidian/native or physical-device checks that were not run.
