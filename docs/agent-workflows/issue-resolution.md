# Issue implementation handoff and resolution

Use this workflow after the maintainer selects an issue from the [assessment shortlist](issue-assessment.md). The assessment remains in the GitHub issue; a draft PR is the implementation queue and its branch is the implementation workspace. Follow K-Plex's `AGENTS.md`, `CONTRIBUTING.md`, and [mixed-agent workflow](../AGENT_WORKFLOW.md). The root `HANDOFF.md` remains the single transient assignment/return document; a plan-only PR file is not a second durable handoff.

Follow [validation retention](../VALIDATION_ARTIFACTS.md). The PR holds concise actual
results; raw JSON/logs and per-run screenshots stay in ignored managed storage.
Do not create dated validation documents as a routine completion step. Before a
commit, review staged paths and run the validation-content gate; close local report
leases and prune expired output at handoff. Curated exceptions need explicit
maintainer approval and a review date, not an agent's self-approved registry entry.

## Prepare a draft PR — chat or main agent, after maintainer selection

1. Recheck the issue, comments, existing PRs, and current `main`; do not duplicate ongoing or merged work. Confirm the exact issue(s) selected by the maintainer.
2. Create a dedicated `YYYY-MM-DD-issue-N-short-topic` branch from K-Plex `main` (or the explicitly approved implementation base). Use one issue per branch by default; bundle issues only when the maintainer authorizes a batch. Keep work in the owning repository and link companion PRs when coordination is required.
3. GitHub requires a commit difference before opening a PR. For a **plan-only** branch, commit a minimal `docs/agent-handoffs/issue-N.md` file linking the issue/assessment and explicitly marked **temporary**. For an approved batch, use a descriptive batch filename listing all included issues. Do not modify runtime code at this stage. Remove the temporary file before the PR is finalized; do not archive it or replace the root `HANDOFF.md` with it.
4. Open a **draft** PR targeting `main`, with a title such as `Plan: Fix #N — short description`, using the template below. Verify the PR head equals the branch head, read back the temporary file and return the PR link. Do not mark the issue fixed; do not merge.

### Draft PR description template

**Status:** Implementation handoff only; not yet a fix.

**Issue and assessment:** #N, link to the detailed technical assessment comment.

**Baseline and dependencies:** K-Plex branch/base SHA, owning layer/module, related branches/PRs, relevant companion plugin or dependency versions.

**Implementation plan**
- Likely root cause and evidence (brief; do not duplicate the assessment):
- Recommended code changes, canonical architecture owners, existing reusable components/helpers, and key paths:
- Constraints, alternatives and risks; preserved graph/ontology semantics, performance, host lifecycle and backwards compatibility where relevant:

**Acceptance and tests**
- Expected behavior:
- Automated regression tests (focused tests, `npm run verify`, Obsidian scanner where applicable):
- Host/manual checks (disposable test vault, main window / popout / reload / mobile / cold-warm indexing / offline as relevant):

**For the implementing agent:** Re-read the current issue, assessment, PR, branch, source and repo instructions; verify assumptions and implement within approved scope. Follow K-Plex's mixed-agent authority: return uncommitted changes in the root `HANDOFF.md` by default; commit/push/edit the PR only when explicitly authorized. The main validation agent publishes accepted changes, removes the temporary plan-only file, and updates the PR with actual results. Leave the PR in draft until validation is complete.

## Complete the implementation — local agent and main validation agent

Continue from the *same* branch and draft PR. Before coding, verify branch head, current issue/assessment and dependencies; do not open a competing PR or implement unrelated issues. The offline/local agent implements the scoped change, adds focused tests and records actual results/limitations in the single root `HANDOFF.md`. By default, it returns changes uncommitted for independent main-agent review; commit/push/PR-edit authority must be separately explicit.

The main validation agent reviews the complete diff and K-Plex architecture/component-reuse obligations, runs available portable checks (including the actual installed-type build) and applicable exact-artifact Obsidian tests, commits accepted work to the existing branch under maintainer authorization, removes the temporary plan-only file and replaces the planning PR body with a concise outcome summary. Do not treat absent CLI/device evidence as a pass. A maintainer-accepted limitation must be recorded explicitly. For documentation-only changes, content/link/whitespace checks are sufficient:

### Completed PR / handoff template

**Problem and root cause**
- What failed, under which conditions:
- Confirmed cause and key source references:

**Change**
- What changed and why this is the smallest safe fix:
- Affected files and repositories; compatibility/migration, ownership, invalidation/lifecycle and dependency coordination:

**Validation**
- Exact automated commands, Node/dependency versions when relevant, test/build/lint results, and explicit skips/failures:
- Actual Obsidian/native checks completed (test vault, platform, main window, popout, reload, mobile, etc.) and their exact artifact identity:

**Remaining risk**
- Known limitations or untested cases:
- Up to three priority manual/device checks for the reviewer (steps, expected outcome and why automation cannot cover them), or none:

Link the original issue, assessment, and companion PRs. Never describe planned tests as completed. Verify all changed files and the final PR head on the intended branch, with no temporary plan-only file remaining. Mark ready for review only when implementation and applicable validation are complete or limitations explicitly accepted; do not close the issue solely because a PR exists, and do not merge without maintainer authorization.
