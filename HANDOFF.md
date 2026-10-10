# Standing instructions — preserve this header

This is a temporary handoff document between agents. The development of the solution involves agents with access to Obsidian CLI and a full development environment with all node packages installed, but also agents with more limited access. Development is done in "ping-pong" between these two types of agents. Agents should use this document to pass instructions and status from one another, such as instructions for testing/validation, or instructions for development work that can only be done in a full environment.

## Mixed agent handoff

### Instructions

The **offline development agent has no Obsidian CLI/runtime access** and performs most scoped implementation and substantial trace analysis. Its Node/dependency/browser/network/Git capabilities must be recorded, not assumed. The **main validation agent has Obsidian CLI and a full dependency environment** and prepares assignments, captures runtime evidence, reviews/fixes returns, performs native validation and handles authorized Git/PR actions. Host-only probes or supporting development can be requested from the main agent and the resulting evidence sent back for offline analysis.

Follow `AGENTS.md`, `CONTRIBUTING.md` and [the mixed agent workflow](docs/AGENT_WORKFLOW.md). Keep this single handoff transient: preserve the opening note/standing instructions and overwrite the assignment/results below on each transfer, in either direction. Do not archive handoffs or append a session history. Persist accepted architecture/checkpoint decisions and limitations in `Refactor plan.md`; feature-specific evidence belongs in its issue/PR or a reviewed validation report.

Return uncommitted changes and actual results for main-agent review unless the maintainer explicitly assigns other repository authority. Missing prerequisites/tests remain pending; a skip is not a pass. The main agent independently reviews, runs applicable checks, fixes defects and recommends only necessary prioritized manual checks. Commit/PR/merge/release steps follow applicable maintainer authorization after required validation or explicit acceptance of a recorded limitation.

Obsidian is the production host; preserve the established portable semantic, identity/source, publication/revision, localization and environment boundaries.



---

# Interaction correctness — maintainer accepted

Base: `80f73619a68e634698f404ea8c61a58f276c0fbe` (merged PR #108).
Branch: `fix/interaction-correctness-2026-10-10`; 29 changed/new files, no deletions, uncommitted.
The temporary assignment remains untracked and excluded. On 2026-10-10 the maintainer confirmed
testing and authorized committing, pushing, creating/merging a PR, closing #24/#28/#51/#106 with
that PR reference and updating local main. Publication is now proceeding under that instruction.

- [x] Verify baseline and reproduce bounded native failures.
- [x] A/#106: preserve native ranges with local passive touch containment; pane-fit controls stack
  above the bottom-left disclosure and scroll in short panes. Shared button sizing is preserved.
- [x] B/#28: count exact semantic endpoint membership independently of physical connector routes,
  retaining revisions, visibility, unknown/count-only proof and transient provenance.
- [x] C/#24/#51: same-file passive native follow preserves representation; initial embedded Markdown
  honors marked `excalidraw-open-md`. Exact request lifetimes preserve explicit source/open actions,
  different-file companions and pending native publication.
- [x] Independently review architecture, reuse, TSDoc, host APIs, source/revision boundaries and cleanup.
- [x] Full verification, exact-build staging and all final native lanes pass.
- [x] Restore disposable environment and return reviewable uncommitted work.

Node 22.22.2. Prior full `npm run verify:obsidian` PASS, 791.329 s: architecture 7/core 88/aggregate 559/
UI 25/portable sources 333/browser sources 428, zero failures/skips, official scanner, actual installed
Obsidian types, production build and native smoke. Final native UX 56/56, gates 6/6, touch/geometry,
Excalidraw 18/18, action workflows 8/8 and desktop/tablet/phone settings 3/3 pass. Native UX count
acceptance is local uncertified coverage; it does not claim requested-scope proof in an on-demand vault.
Earlier failed probes and corrected fixture prerequisites remain documented separately.

C14 remains accepted; C15–C26 paused. No schema, ontology, parser, source-cache format, scheduler,
connector routing, dependency or sibling-source changes. Version remains 0.1.0. Production changes
remain inside the existing index, native adapter/orchestration and reusable presentation owners.

Final built/installed main: `90a641a8f21dad9bb9d321c2cdec57f0ee4454420c52a663789cb8cf1cfadc31`.
Styles: `da87b7b3a35522dedd63eb021f51e8458a389608dd5e5ccfd3fcb8036323506a`.
Final full-run freeze: `1f72953dc70f2315aa06d4778e4a8466ff8df9a0a0b13746d967048e5d761741`.
Delivery source identity: `85cb352300a92ed6b5e59f75c4349db6a208e8b7d8332ec9bfbde91e7411cc31`.
The later native-driver setup/assertion/receipt changes are verified by their final native lane;
JavaScript remains identical to the full-run build; the subsequent typography styling uses the new stylesheet hash above.

Cleanup passed: original 76 files, desktop bounds, typography overrides, configuration bytes and
owned lifecycle resources restored; no captured JavaScript errors. No active test resource remains.
Automated evidence does not establish physical Android/iOS or Windows acceptance; the maintainer
has confirmed the fixes and accepted publication. No specific device result is inferred from that confirmation. Emulated plugin-only
last-Sidepanel drawer reopening was not established; fresh mobile-shell recreation is used for
persistence testing, with the observation preserved for future investigation and no production workaround.

The complete inventory, actual commands/results, evidence limits and at most three brief manual
checks are in [the validation report](docs/validation/interaction-correctness-2026-10-10.md).

Typography styling follow-up: all three rails now use full-width stacked cards with the wrap
checkbox in a horizontal card beneath, in wide and narrow panes. Focused Chromium 4/4, official
lint, real typed build, exact-build staging/smoke and native touch/reload/geometry all pass. The
full suite was not repeated for this CSS-only change; prior full/native evidence remains historical.
See the validation report for current artifact identity and receipts. Work remains uncommitted.
