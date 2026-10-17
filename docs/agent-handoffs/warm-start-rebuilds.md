# Temporary draft-PR marker: warm-start rebuild and persistence

Prepared by Zsolt's Codex Agent on 2026-10-17.

Planning only: no runtime change, new measurement or confirmed redundant rebuild is included.
The draft PR description owns the investigation, implementation gates and acceptance criteria.

Goal: explain the automatic full compilation and complete snapshot rewrite observed after a warm restart, then remove only work proved redundant under existing source/publication/persistence guarantees. Reduce total background resource use without delaying the same work, weakening completeness or reviving the rejected receipt.

Starting baseline: `main@23aa44eae13797a93890fd1ce1679074d45d9295`.
[PR #174](https://github.com/zsviczian/kplex/pull/174) is accepted and ready for review at `035e69eb587ce74ac2afd1ae93bf2fd59078ebfb`, but was not merged when this branch was created. Before implementation, update this branch through the approved normal workflow after that prerequisite reaches main; do not change or merge #174 from this assignment. Freeze the integrated baseline for measurements.

Primary lead: [the #169 final report](https://github.com/zsviczian/kplex/blob/23aa44eae13797a93890fd1ce1679074d45d9295/docs/validation/source-reader-efficiency-169-2026-10-16.md). Its compilation/write observations are not proof of redundancy or a prediction of recoverable startup time.

Follow AGENTS.md, CONTRIBUTING.md and docs/agent-workflows/issue-resolution.md. Preserve the root HANDOFF.md standing header for actual transfers. Remove this temporary marker before final review; do not archive it. No merge, release, new persistence format, receipt experiment, reader-sharing optimization or personal-vault access is authorized by this planning commit.
