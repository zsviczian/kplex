# Standing instructions — preserve this header

This is a temporary handoff document between agents. The development of the solution involves agents with access to Obsidian CLI and a full development environment with all node packages installed, but also agents with more limited access. Development is done in "ping-pong" between these two types of agents. Agents should use this document to pass instructions and status from one another, such as instructions for testing/validation, or instructions for development work that can only be done in a full environment.

## Mixed agent handoff

### Instructions

The **offline development agent has no Obsidian CLI/runtime access** and performs most scoped implementation and substantial trace analysis. Its Node/dependency/browser/network/Git capabilities must be recorded, not assumed. The **main validation agent has Obsidian CLI and a full dependency environment** and prepares assignments, captures runtime evidence, reviews/fixes returns, performs native validation and handles authorized Git/PR actions. Host-only probes or supporting development can be requested from the main agent and the resulting evidence sent back for offline analysis.

Follow `AGENTS.md`, `CONTRIBUTING.md` and [the mixed agent workflow](docs/AGENT_WORKFLOW.md). Keep this single handoff transient: preserve the opening note/standing instructions and overwrite the assignment/results below on each transfer, in either direction. Do not archive handoffs or append a session history. Persist accepted architecture/checkpoint decisions and limitations in `Refactor plan.md`; feature-specific evidence belongs in its issue/PR or a reviewed validation report.

Return uncommitted changes and actual results for main-agent review unless the maintainer explicitly assigns other repository authority. Missing prerequisites/tests remain pending; a skip is not a pass. The main agent independently reviews, runs applicable checks, fixes defects and recommends only necessary prioritized manual checks. Commit/PR/merge/release steps follow applicable maintainer authorization after required validation or explicit acceptance of a recorded limitation.

Obsidian is the production host; preserve the established portable semantic, identity/source, publication/revision, localization and environment boundaries.

---

# Online result — warm measurements complete; bounded scale correction decision required

SI4 is accepted/committed at `323b260`; SI5a `e50dd52` and SI5b `7bd14cf` are interim checkpoints
on `indexing-optimization-v2`. Source-first/global node recovery remains uncommitted per the
maintainer's latest instruction. All original SI5 exits stay open; C15–C26 paused. No push/release.
This online agent has pinned Node 22.22.2, real Chromium/IDB, Git and native Obsidian CLI.

## Candidate and new results

Exact unchanged production `main.js` is `9c9a2545a0b1bc2ba4c97bb4502fc3ad88966907bcbaf5feb77378b01ad239c3`.
Previously recorded full runtime verify (317 portable/192 browser/actual installed types/build),
retirement 26/26, native smoke and five small fault cases remain applicable. New changes are fixture
tooling/docs only: focused generator tests 3/3 and full 20,000-file byte/inventory verification pass.
No new aggregate whole-tree verification is claimed for that tooling addition.

Three same-build warm restart samples pass all foreground checks at 72,974 / 74,267 / 77,422 ms:
median 74,267, maximum 77,422 ms. Heads are unchanged; source reads/parses/acquisitions/resolution
writes/full builds are zero. Maximum sampled renderer heap is 980,683,923 bytes, not process/device
peak. Explicit settled warm snapshot restore passes separately at 6,018 ms (one pilot): page/relation
calls 2,723 ms, evidence 2,945 ms, presentation 235 ms, 14 cached body requests 4.2 ms, source flush
0.5 ms. Inclusive timings are not summed. Historical C08P ~5.8 s is this restore procedure, not full
restart; no matched pre-implementation restart baseline or speedup percentage exists.

Native reference-neighborhood main/popout functional checks pass separate Documents/centers,
current policy, both demands, camera preservation and independent teardown with zero source work
or full builds. Hidden-view navigation, folds, settings-popout/edit and actual paint remain open.

The actual native hub repeatedly rejects `decode-budget` with no publication. Existing-method
attribution proves direct discovery succeeds for 20,000 owners/four host facts, then canonical
neighborhood compilation rejects before degree/URL-title work. No source IO/repair/full build.
Unfocused timings are excluded; browser supported-completion does not waive this fixture failure.

A cold app reload has 111 valid foreground samples but fails the unchanged 30-second CLI timeout
while source authority is at 4,969 owners; optional full pages/evidence have not started. Later
20,015 valid sources/full graph converge with zero body work; hydration stamp difference 259,523 ms
has no continuous remaining focus trace and is not cold timing acceptance. The 240-second readiness
limit stays unchanged. Temporary power assertions/wrappers/controllers are gone.

## Proposed next delivery / decision

Per the design's repeated-blocker rule, report the smallest alternative instead of another cap/codec
adjustment: bounded canonical requested projections, compact parent/sibling/degree accumulation and
pair-local provenance through existing readers. Preserve exact center/gates/siblings/degrees/labels,
source multiplicity, shared lifetimes, current-policy edit checks and all final fences. This changes
the requested-consumer contract and may increase streamed reads; one integrated implementation and
native review must include the real 715,032-declaration hub and high-node fixture. No new classifier,
parser/catalog/journal/schema or cap/deadline/golden relaxation. Proposal is not implemented; obtain
the maintainer's scope decision before replacing the full-compilation contract. Independently
attribute/batch existing cold source-adoption validation; do not assume projections fix authority.
Physical iOS/Android is not ready.

The high-node fixture at `/private/tmp/kplex-si5-high-node-2026-10-03` is generated/byte-verified:
20,000 notes, 80,000 placeholders, 8,000 URLs, 259,000 source link occurrences, 160 dormant fields,
19,999 hub contributors, 8,831,230 bytes, content SHA-256 `50b8cb12…`. Counts are input, not actual
host graph/evidence/latency. Generator refuses existing output. No files merged into test/personal vaults.

## Cleanup and continuing discipline

Small original fourteen stores/config remain restored/compared and its originally absent plugin
removed. Large original data/enablement are byte-identical, all 20,015 Markdown files intact,
source/main view ready, no inventory/scope tasks/controllers/owned fixtures/popouts and original
background throttling true. Large window remains open; CLI foreground now succeeds intermittently.
Do not request Computer Use again without resolved macOS permissions (still pending, costly timeout).
Run native drivers serially/quietly and exclude every hidden/unfocused/throttling-disabled timing.
No native driver remains active. Personal vault untouched. Do not commit current work.

[Progress, proposed correction and remaining acceptance](docs/validation/settings-independent-indexing-si5-progress-2026-10-03.md)
[Exact source/artifact/native evidence and retained failures](docs/validation/settings-independent-indexing-si5-native-2026-10-03.json)
