# Temporary draft-PR seed: per-Plex document sync and footprints

**Status: implementation handoff only; no runtime changes or completed feature validation.**

Prepared by Zsolt's Codex Agent on 2026-10-19.

- Base: `main` at `73b0589fbb9f3c18ee292834a00ef5659cdf176e`, including merged PR #185.
- Branch: `2026-10-19-plex-sync-footprints`.
- Issues: [independent Plex views #31](https://github.com/zsviczian/kplex/issues/31) and [breadcrumbs #59](https://github.com/zsviczian/kplex/issues/59).
- Keep persisted pins and navigation history global. Give each Plex independent document-sync and managed-Sidecar ownership.
- Add a per-Plex, session-only Footprints list beside Find. Preserve visit order and repeated visits; never serialize the trail. A metro-map visualization is future work, not this scope.

The draft PR on this branch is the authoritative implementation plan and acceptance checklist. Follow `AGENTS.md`, `CONTRIBUTING.md`, `docs/AGENT_WORKFLOW.md` and `docs/agent-workflows/issue-resolution.md`. Continue on this branch; preserve accepted startup, settings, native-view and graph-lifetime behavior.

This file exists only to initialize the draft PR. Remove it before final review. Do not archive it or treat it as a replacement for the single transient root `HANDOFF.md`. Neither issue is fixed by this planning commit.
