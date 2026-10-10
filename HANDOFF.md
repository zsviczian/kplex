# Standing instructions — preserve this header

This is a temporary handoff document between agents. The development of the solution involves agents with access to Obsidian CLI and a full development environment with all node packages installed, but also agents with more limited access. Development is done in "ping-pong" between these two types of agents. Agents should use this document to pass instructions and status from one another, such as instructions for testing/validation, or instructions for development work that can only be done in a full environment.

## Mixed agent handoff

### Instructions

The **offline development agent has no Obsidian CLI/runtime access** and performs most scoped implementation and substantial trace analysis. Its Node/dependency/browser/network/Git capabilities must be recorded, not assumed. The **main validation agent has Obsidian CLI and a full dependency environment** and prepares assignments, captures runtime evidence, reviews/fixes returns, performs native validation and handles authorized Git/PR actions. Host-only probes or supporting development can be requested from the main agent and the resulting evidence sent back for offline analysis.

Follow `AGENTS.md`, `CONTRIBUTING.md` and [the mixed agent workflow](docs/AGENT_WORKFLOW.md). Keep this single handoff transient: preserve the opening note/standing instructions and overwrite the assignment/results below on each transfer, in either direction. Do not archive handoffs or append a session history. Persist accepted architecture/checkpoint decisions and limitations in `Refactor plan.md`; feature-specific evidence belongs in its issue/PR or a reviewed validation report.

Return uncommitted changes and actual results for main-agent review unless the maintainer explicitly assigns other repository authority. Missing prerequisites/tests remain pending; a skip is not a pass. The main agent independently reviews, runs applicable checks, fixes defects and recommends only necessary prioritized manual checks. Commit/PR/merge/release steps follow applicable maintainer authorization after required validation or explicit acceptance of a recorded limitation.

Obsidian is the production host; preserve the established portable semantic, identity/source, publication/revision, localization and environment boundaries.



---

# Completed — shared local Find/navigation highlight

**Publication approved:** The maintainer reports all tests passed and authorizes commit, push, PR, merge and closure of #96, #97, #98, #99 and #101. Earlier automated Clipboard/Canvas observations remain historical evidence; this is maintainer acceptance of the batch. Copy-link preferences remain future issue #107.

The maintainer confirms both device Node width and Windows fullscreen + Zen + maximized-editor
controls pass manual testing. Actual Markdown editor text copy/paste is also confirmed. These are
accepted manual results; the separately recorded physical-mobile and Canvas zoom observations remain.

Top-right local Find now uses the same theme-accent outline and broad halo as arrow/Option-arrow
navigation and Plex typing selection. One shared CSS rule covers regular, center, section-center and
expanded nodes, after earlier center/selection styling. Search matching, keyboard selection state,
input focus and ARIA remain distinct and unchanged; clearing a match removes its halo.

This follow-up changes only styles.css among325 verification inputs. Frozen source SHA-256
`bec4f9be1011b57971eb91070f02b5167ca5439783bb0eb60c49017d086c166f`; installed styles.css `d5b3973600b9a082e600e7fcdb5b17284838bd82bd8e2bf949f01fdc9b77df73`.
JavaScript/manifest hashes are unchanged from the prior full verified build (main3875ea11). For this
CSS-only correction, scanner,26 existing UI/display Chromium checks and production typecheck/build
PASS. Exact bounded-verified build is staged using the standard native runner; rendered smoke and
owning-document style comparison4/4 PASS, no captured JavaScript errors. The style comparison uses
removed offscreen clones, not physical-device/paint validation; no query, preferences or focus edits.
Earlier full verify697.969s/native display12/12 results remain historical for source2e3ba2e5; semantic
suites were not repeated for CSS alone. Full commands and receipts are in the validation report.

Reviewed publication branch: five-issue-ux-package, base595a625. Pre-publication48-file diff ledger:
`/private/tmp/kplex-search-highlight-final-diff-2026-10-10.json`. Commit/push/PR/merge and the five implementation issue closures are authorized; no release,
version change or structural refactor is included. Copy-link preferences remain future issue107.

Evidence: docs/validation/five-issue-ux-package-2026-10-09.md.
The temporary implementation handoff is intentionally excluded from the commit.
