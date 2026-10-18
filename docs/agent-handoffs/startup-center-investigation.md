# Temporary planning marker: restored-center investigation

Prepared by Zsolt's Codex Agent on 2026-10-18.

Investigation only: determine why a Plex restored at Obsidian startup can remain
empty or incomplete until navigation away and back, especially for dense centers
with placeholder relationships. The actual fix belongs to a separate later PR.

- Repository: `zsviczian/kplex`.
- Branch: `2026-10-18-startup-center-investigation`; target: `main`.
- Starting commit: `e95d3db9752de165bae52ebe21646f73acd00849`.
- Full scope, minimized supplied evidence, hypotheses, probes and return criteria
  are in this branch's draft PR description.
- The single root [HANDOFF.md](../../HANDOFF.md) contains the active assignment.
- Work independently of PRs #147, #176, #179, #181 and #182. Do not modify their
  branches, share a writable checkout, or run competing native tests on one host.

Initial changes are documentation only. This marker implements neither diagnostic
instrumentation nor a fix and makes no reproduction or validation claim. Remove
it before investigation closeout; retain reusable investigation tooling and one
reviewed findings report, not an archived handoff. Keep the PR in draft.
