# Standing instructions — preserve this header

This is a temporary handoff document between agents. The development of the solution involves agents with access to Obsidian CLI and a full development environment with all node packages installed, but also agents with more limited access. Development is done in "ping-pong" between these two types of agents. Agents should use this document to pass instructions and status from one another, such as instructions for testing/validation, or instructions for development work that can only be done in a full environment.

## Mixed agent handoff

### Instructions

The **offline development agent has no Obsidian CLI/runtime access** and performs most scoped implementation and substantial trace analysis. Its Node/dependency/browser/network/Git capabilities must be recorded, not assumed. The **main validation agent has Obsidian CLI and a full dependency environment** and prepares assignments, captures runtime evidence, reviews/fixes returns, performs native validation and handles authorized Git/PR actions. Host-only probes or supporting development can be requested from the main agent and the resulting evidence sent back for offline analysis.

Follow `AGENTS.md`, `CONTRIBUTING.md` and [the mixed agent workflow](docs/AGENT_WORKFLOW.md). Keep this single handoff transient: preserve the opening note/standing instructions and overwrite the assignment/results below on each transfer, in either direction. Do not archive handoffs or append a session history. Persist accepted architecture/checkpoint decisions and limitations in `Refactor plan.md`; feature-specific evidence belongs in its issue/PR or a reviewed validation report.

Return uncommitted changes and actual results for main-agent review unless the maintainer explicitly assigns other repository authority. Missing prerequisites/tests remain pending; a skip is not a pass. The main agent independently reviews, runs applicable checks, fixes defects and recommends only necessary prioritized manual checks. Commit/PR/merge/release steps follow applicable maintainer authorization after required validation or explicit acceptance of a recorded limitation.

Obsidian is the production host; preserve the established portable semantic, identity/source, publication/revision, localization and environment boundaries.

---

# Online work — SI5b checkpoint authorized; source-first startup approved

SI4 remains accepted at `323b260127e4fb81e1d3697d4ee8b0282f8cdb12`. The maintainer-authorized SI5a
interim is now committed at `e50dd521550e09d12de2b155018dce9cb8026201` on `indexing-optimization-v2`.
The maintainer authorizes the subsequent large-vault correction as SI5b with the cold timing
limitation explicitly retained. **SI5 is not accepted**. No push/release.
This is the online agent with Git, pinned Node 22.22.2, real Chromium/IndexedDB and Obsidian CLI.
C15–C26 remain paused. User authorizes edits and CLI testing; physical iOS/Android testing is theirs
once the desktop candidate is ready.

## Current correction

An uncertain startup resolver wave previously restamped every valid owner's resolution family.
Retain the safety fence, compare canonical resolver/Date output under an exact selected family, and
preserve unchanged heads/observations. Changed/corrupt sources take normal replacement. Head-only
inspection is read-only with no family leases; actual family reads retain their leases. Restart host
metadata is validated once. Elapsed inventory slices replace per-owner timers. Weak body selections
avoid repeating values/body-URL validation only under the exact same durable revision and sequence;
a changed selection requires full validation. Existing parser, resolver, repository and publication
owners remain; no store/schema or user data is deleted and no deadline/cap/golden is relaxed.

Native tooling shows the application before focusing the target window, samples actual visibility,
document/window focus and renderer JS heap throughout readiness, retains original throttling and
excludes any interrupted foreground run. Large warm cases cursor-hash all selected heads and assert
no restamping. `KPLEX_SI5_RESTART_RUNS=1/2` replaces excluded runs; default is still three and the
three-comparable-run requirement is unchanged. Cancel/release sampler ownership on every exit.

## Results and exact build

Candidate `main.js`: `6b77bbc320c62f46d8a5116e0e58f8724d8a7c60a9b4c39e12bbb67ae4611bba`.
Manifest/CSS are unchanged from SI5a. Architecture 7, core 60, aggregate Node 133, UI 7, portable
sources 314, real-browser/IDB 184, strict indexing/settings checks, scanner with zero warnings and
actual types/production build pass. Full verification was run as its separate commands once; native
command/render/error smoke reused that unchanged verification rather than duplicating the suite.
New regressions cover identical/changed resolver output, cancellation, supersession, corrupt postings,
bounded multi-chunk equality, read-only head inspection and exact-head body validation reuse.

All five final small native faults pass: policy restart, missing/invalid graph cache, one corrupt
requested source and offline edit. Zero full builds; source corruption repairs exactly one owner
from body-v2 with zero reads/parses; offline edit reads/parses only its owner once. Three large warm
functional cases pass with unchanged heads, zero source work/full builds and rendered restored center.
Only warm-2 (90,475 ms) and warm-3 (90,902 ms) stay foreground throughout. Warm-1 and a one-run
replacement lose focus/visibility and are excluded. These are CLI/readiness timings, not paint.

Cold window startup still fails the unchanged 240-second preflight: 18,053 cached owners validated,
zero Markdown reads/parses/repairs/resolution writes/failures/full builds. All 240 foreground samples
pass with original throttling; sampled renderer JS heap peaks at 2,206,694,546 bytes, not plugin-only
or process peak. A later probe finds all 20,015 owners complete, source-ready, no inventory, queues
or backpressure. This establishes convergence, not cold timing acceptance. Earlier failures remain
in [the report](docs/validation/settings-independent-indexing-si5-progress-2026-10-03.md) and
[exact-artifact evidence](docs/validation/settings-independent-indexing-si5-native-2026-10-03.json).

## Approved next work

The cold-start blocker survives the consolidated correction. The alternative and tradeoffs were reported; the maintainer has now approved implementation.
Do not adjust deadlines/caps to hide the failure.
The maintainer approves the next change: prioritize source authority/requested publication before eager complete
snapshot/evidence hydration, reusing existing preview/physical-baseline and source owners. This may
reduce storage contention/retention; it is not a proven latency fix. It delays complete global search
vocabulary, so combine the consumer decision with the already pending neutral body-only virtual/URL
search/suggestion recovery. Do not add another contributor catalog/proof framework/source journal.

The five original SI5 exits remain open. Native large acquisition/sync interruption, storage-degraded
coverage, dense/high-node latency/memory/storage and main-window/popout checks remain required.
A third comparable warm run is pending; an optional cooperation question was sent because runs
repeatedly lost foreground focus. No reply arrived before functional checks completed. Do not treat
time as approval or infer a foreground pass. Physical iOS/Android follows desktop readiness via
[the prepared checklist](docs/validation/settings-independent-indexing-si5-device-checklist.md).

## Cleanup

Small original fourteen-store cache/configuration restored and compared, original enablement restored,
temporary plugin removed, two original Markdown files and no owned fixtures/controllers. Large has
20,015 original files, source authority ready, no inventory or test controllers/fixtures, original
throttling and restored settings/methods. Its heavy test window is closed; originally enabled plugin
and valid source progress remain. No native driver or temporary production diagnostics remain.
Personal brain vault untouched. Native drivers must run serially; do not overlap manual CLI polling
or browser/CPU tests with measured runs. No maintainer manual test is needed to review this correction.
