# Validation storage and retention

Keep tests and maintainable contracts in Git. Put routine test results in the existing
issue/PR and transient HANDOFF. Do not create a dated Markdown/JSON pair per task.
This policy is mandatory from AGENTS, coding standards and both implementation workflows.

| Content | Location | Retention |
| --- | --- | --- |
| Raw logs, diagnostic JSON, input hashes, receipts, intermediate captures | Ignored managed `.test-work/validation/` run | 14 days after completion/latest write |
| Unresolved failure evidence needed for active review | Same managed run with reasoned hold | Explicit date, at most 90 days from creation |
| Commands, outcomes, platform limits, important failed checks | Existing PR/issue; current HANDOFF | Keep concise; replace transient handoff on transfer |
| Exceptional curated summary or essential screenshot | `docs/validation/`, only with explicit maintainer approval | Review within 90 days; retire when superseded |
| Executable regression fixture/golden | `tests/fixtures/` with its test | Normal source lifecycle; never age-purge |
| CI artifacts, if uploaded | GitHub Actions artifacts | Set `retention-days: 14`; do not copy into Git |

Retention is a storage policy, not a validity guarantee. A relevant code/host change
invalidates previous acceptance immediately, even when the report is only a day old.
Neither an expiring file nor an unavailable artifact should be cited as the only
proof of a permanent design contract. Keep necessary conclusions in the PR/contract.

## Local runs

Use the shared helper instead of unbounded OS-temp or `docs/validation` output:

```js
import {createValidationRun} from './scripts/validationArtifacts.mjs';
const run = createValidationRun('issue-123');
try {
  // Send reportDir / KPLEX_HOST_REPORT_DIR to run.directory.
} finally {
  run.complete();
}
```

For unresolved review, `complete({holdUntil: ISO_DATE, reason: 'specific pending review'})`
requires an expiry within 90 days. Do not keep renewing evidence for completed work.
An active run is protected while its owning PID is live. Foreign/malformed markers,
links/junctions, tracked files and trees containing vault/repository markers are
protected for review rather than guessed safe. Closing the active lease does not
end unfinished native cleanup: complete the test's own restoration first.

At **task start and end**, run `npm run validation:prune`. It removes only expired,
marker-owned report trees below this repository's fixed ignored storage directory.
Creation of a managed run and `npm run verify` also trigger cleanup. The CLI's
`node scripts/validationArtifacts.mjs prune` is a dry run; `--apply` enables removal.
No personal vault, deployment backup, working checkout or arbitrary temp tree is a
cleanup target. Unmanaged old directories require explicit inspection/migration.

## Commit gate

New `docs/validation` files and all `.test-work` files are ignored by default.
`npm run check:validation` checks staged content locally; CI checks the actual base
commit through `VALIDATION_BASE`. Force-add does not bypass the gate.
Dependency installation installs the pre-commit guard through `prepare`; existing
custom hooks/hooksPath are preserved and must chain the check explicitly. For an
already prepared checkout run `node scripts/validationArtifacts.mjs install-hook`.
The hook never stages files, and branches without the policy script retain their
existing commit behavior. Deliberate `--no-verify` is not an authorized agent bypass.

New validation records need an entry in `.github/validation-retention.json` with
`path`, `reason`, `approvedBy` and `reviewBy` (within 90 days). The maintainer must
actually authorize the exception; agents cannot invent approval. Raw formats are
rejected unless an explicitly approved entry additionally says `allowRaw: true`.
Markdown summaries are limited to 6,000 bytes. A registry entry is not permission
to stage unrelated generated files. Stage explicit reviewed paths and run the gate
again before commit/push. Do not add blanket exclusions or weaken the check.

## Existing committed reports

Run `npm run validation:audit -- --list` **monthly**, and before adding another
curated report. Raw dated records become review candidates after 14 days; summaries
and captures after 90 days. The audit is a review queue, not permission to delete
everything with an old filename.

Retire superseded/redundant records through an ordinary reviewed change. Check
incoming Markdown links, code references, test inputs and current design/handoff
requirements first. Preserve a necessary conclusion in its canonical contract or
PR, repair/remove obsolete links, then remove the unnecessary record and its unused
assets. Move any executable baseline into `tests/fixtures/` with its consumer.
Record an explicit expiry/reason for genuinely necessary retained exceptions.
Never rewrite Git history or silently delete a referenced fixture based on age.

Existing tracked files are grandfathered until reviewed; that is not authorization
to keep adding generated reports. A monthly review must remove obsolete material,
not append another review transcript under `docs/validation`.
