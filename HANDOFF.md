# Standing instructions — preserve this header

This is a temporary handoff document between agents. The development of the solution involves agents with access to Obsidian CLI and a full development environment with all node packages installed, but also agents with more limited access. Development is done in "ping-pong" between these two types of agents. Agents should use this document to pass instructions and status from one another, such as instructions for testing/validation, or instructions for development work that can only be done in a full environment.

## Mixed agent handoff

### Instructions

The **offline development agent has no Obsidian CLI/runtime access** and performs most scoped implementation and substantial trace analysis. Its Node/dependency/browser/network/Git capabilities must be recorded, not assumed. The **main validation agent has Obsidian CLI and a full dependency environment** and prepares assignments, captures runtime evidence, reviews/fixes returns, performs native validation and handles authorized Git/PR actions. Host-only probes or supporting development can be requested from the main agent and the resulting evidence sent back for offline analysis.

Follow `AGENTS.md`, `CONTRIBUTING.md` and [the mixed agent workflow](docs/AGENT_WORKFLOW.md). Keep this single handoff transient: preserve the opening note/standing instructions and overwrite the assignment/results below on each transfer, in either direction. Do not archive handoffs or append a session history. Persist accepted architecture/checkpoint decisions and limitations in `Refactor plan.md`; feature-specific evidence belongs in its issue/PR or a reviewed validation report.

Return uncommitted changes and actual results for main-agent review unless the maintainer explicitly assigns other repository authority. Missing prerequisites/tests remain pending; a skip is not a pass. The main agent independently reviews, runs applicable checks, fixes defects and recommends only necessary prioritized manual checks. Commit/PR/merge/release steps follow applicable maintainer authorization after required validation or explicit acceptance of a recorded limitation.

Obsidian is the production host; preserve the established portable semantic, identity/source, publication/revision, localization and environment boundaries.




---

# PR177 stationary-center recovery checkpoint

Main validation agent; branch2026-10-17-navigation-and-native-drag.
Parent5fe9c802cd19f219e3731fadd8e057d5678300ac. Commit/push authorized; PR stays
DRAFT, no merge/release. No personal vault. Small only. No comparative performance
tests (HandBrake). All native/browser lanes serial; no driver currently running.

Delivered: real React App subscription catch-up (2-to7 child reproduction), finite
3s initial-center watchdog plus at most one source-ready follow-up, existing
foreground owners and exact demand/file/source/policy/window fences. Existing
20-entry diagnostic storage/export owners retain path-free aggregate outcomes;
latest2 non-healthy center entries protected. No full build/new scheduler/schema,
note/snapshot writes or source-validation relaxation. Read docs/INDEXING_DIAGNOSTICS.md
and docs/validation/navigation-and-native-drag-2026-10-18.md for scope/limits.

Full verify1792324807460 PASS Node22.22.2: architecture7/core130/lint/Node1049/UI140/
source334/browser607, actual build/native smoke. Native styles15(1792326297211),
foreground live-updates(1792326304258), support24(1792326309024), focused Properties
closed4(1792326331855)/open4(1792326286964,1792326259257) PASS. Actual native timer
restores deliberately incomplete frame's Parent0-to1 without navigation during
recovery. Final driver/architecture27 PASS. Sanity1792326341858:107files/88Markdown,
exact artifacts/config, no controllers/dialogs, desktop, original CLI capture false.
Mainbb5126d3d4a0aa17b0365740b73a2ef7009b7f460047cc7e4b27fd568bd0ee23;
CSS9664241e9e87f357ebfa57fcfe5477a5b8f592db4e4bbbb53f65db680dd6a7c0;
manifest19d9ecce5557733e0ff0f2e27155e635c30158c3cfa6fbca0f11c16e4dedfd2c.
Build5fe9c80.dirty; runtime unchanged after full verification.

IMPORTANT OPEN: two Properties-open controls passed Save but timed out waiting
for fixture Parent before reload (1792326132804/1792326213319). Closing Settings
did not explain it. Later passes with no runtime change do not erase these failures.
Driver captures fixture-only failure facts now. No freeze reproduced. Full Obsidian
process restart/affected-vault case, macOS/minimum host and physical devices remain
manual acceptance. Do not claim all startup causes fixed or recommend merge from
these positive controls alone. Preserve Closes157/Refs175 and earlier PR limitations.

Delivered runtime173c0c9080c8c0646699e950e4fa6ca3e68453ef committed/pushed.
Private verified backup outside Temp: LOCALAPPDATA/KplexValidation/
structural-drops-177-20261018-1792326449722;273files/18,098,913bytes; sourceZIP537
entries, CRC/per-file SHA verified, HANDOFF excluded. Manifest SHA256:
d8046052040695c2147e09edb667870ab5bf063edaa1e4f2f03698ae386f788a.
Originals/prior backups retained; raw evidence unpublished. Documentation closeout
records this source checkpoint and backup; runtime remains unchanged. PR update
must preserve these unresolved failures and draft status. Final CI is separate
from passed local/native checks; do not claim remote green while pending.