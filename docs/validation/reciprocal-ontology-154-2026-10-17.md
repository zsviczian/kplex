# Reciprocal ontology mappings: PR #154 review

> **Stopped at the maintainer's request; not approved for merge.** The final sorting
> checkpoint preserves unrelated and removal-only ontology list order. Its 79 focused
> tests and installed TypeScript checks pass; full verification v4 was interrupted on
> request before native staging. Results below describe the earlier 3a1907c prototype,
> not full acceptance of this final checkpoint. No indexing performance benchmark was
> completed. Pair identity versus directional display/filter behavior remains unresolved;
> no alternative design was implemented.

Reviewed original head `4500a97aee91c99f21a2717ae160b375313d345a`, integrated main
`d40a339ffce9cc40f332e20c5add2e01422cf847`, and corrected the findings below.
The feature fixes a real ambiguity: `replies to/replied by` in Previous shows the
correct label from both notes while retaining the property's actual declaring note.

## Review decisions

- Parent/child and previous/next are reciprocal. Friend and challenger each remain
  symmetric; Hidden and exclusions remain directional literal property names.
- Reverse projection changes the displayed definition, never the physical `fieldName`
  used for source navigation, authorization or unlinking. Preserve inverse metadata
  through Date compilation, the production per-file declaration bridge and snapshots.
- Physical property inputs explicitly use literal mode. Newly assigned `a/b`, `a\/b`
  and `a/b/c` round-trip without becoming configured pairs. Reassigning part of a pair
  preserves every unrelated counterpart, including intersections with two old pairs.
- Canonical selection supplies section expansion, unassigned fields and suggesters.
  Link-style aliases preserve explicit-key precedence and detect in-place hierarchy edits.
- Valid pairs and escaped literal names use semantic signature v5, rejecting historical
  literal-v4 graphs with the same raw configuration. Ordinary fields retain v4 signatures
  and historical spelling/normalization. Neutral source/cache schemas are unchanged.

Exactly one unescaped slash with two nonempty sides defines a pair. Use `\/` for a
literal slash in the six reciprocal groups; malformed/multiple-slash entries stay literal.
This is a documented interpretation change for existing single-slash configuration,
not an unconditional backwards-compatibility claim. See [appearance guide](../APPEARANCE.md#paired-relationship-fields).

## Verification

Windows 11 (`10.0.26200`), Node **22.22.2**, Obsidian **1.14.4**, installer 1.14.0;
only authorized disposable **kplex-test-small**, on-demand mode.

| Check | Result |
| --- | --- |
| Full `verify:obsidian` | **2,061/2,061** TAP executions; architecture, core, lint, browser/IndexedDB, types, production build and exact-build smoke pass. Counts include repeated core tests. |
| `verify:obsidian:ontology-mappings` | **5/5**: actual Settings textarea; both labels/roles; reverse physical source/authorization; ordinary edit plus exact-pair refresh; plugin reload; reverse unlink preserving unrelated metadata/prose and removing duplicate targets. |
| `verify:obsidian:date-properties` | **24/24**, including all roles, configured precedence, Hidden, scalar-Date refusal and plugin-reload persistence. |
| Final cleanup | Original 107 files, settings, layout, window bounds/minimum, Settings/debugger state and configuration bytes restored; no active build, preparation, acquisition or test controllers. |

The native edit test proves exact-pair refresh, not a native incremental-patch route;
the portable regression separately executes the actual GraphBuilder declaration bridge
and JSON snapshot restoration. Native Settings activation is programmatic DOM input,
not trusted typing, actual paint, minimum-host, macOS or physical-mobile acceptance.
A full application restart was not tested. Optional follow-up device checks: enter a pair
and navigate both endpoints on macOS and mobile, then reopen its relationship editor.

Runtime/test logic stayed frozen after full verification. Only documentation, test EOF
whitespace, native diagnostic metadata cleanup and the Date driver's Windows
backup-basename correction changed afterward; driver syntax and native
acceptance passed on the exact same bundle. Final branch CI remains visible on the PR.
No dependencies, versions, database migration, new scheduler or source-validation relaxation.
Parsing is configuration-scoped; aliases are cached and extra provenance is optional.
No matched CPU/memory benchmark was performed and no efficiency gain is claimed.

## Reproduction and local evidence

Set the three explicit disposable-vault variables documented in CONTRIBUTING and a
fresh `KPLEX_HOST_REPORT_DIR` per run. Run `npm run verify:obsidian`, then the two native
commands above serially. Date acceptance requires the existing Date property/Daily Notes
configuration; drivers do not change those host options. The reciprocal driver creates
and removes two owned notes and checks exact installed artifact hashes.

Raw logs, reports and source-freeze receipts remain under
`%TEMP%/kplex-154-review-2026-10-17/`: accepted `full-verification-v3`,
`native-ontology-v2`, `native-date-v2`, and final `postflight.json`.
The earlier interrupted verification, isolated-test dependency failure and Date-driver
Windows-path failure remain preserved as superseded/failed runs, not accepted results.
Initial workspace drift from the strict smoke was detected and the original session
workspace restored before final postflight. Private configuration backups stay local;
no evidence archive was published and no raw evidence was deleted.

Exact accepted `main.js` SHA-256:
`670a28e8d13bda6915c5429608fce7aa98c9044b3fc65e2e6da72932ce08f092`.
