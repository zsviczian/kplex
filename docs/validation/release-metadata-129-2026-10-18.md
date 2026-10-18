# Release metadata correction — PR148 / issue129

The maintainer authorizes completing and immediately merging PR148 after PR183,
chooses GNU AGPL with version selection delegated, and specifies Obsidian1.13.0.
Main selects **AGPL-3.0-only**, the version3 license already present in LICENSE,
and records that explicit project grant in README. This allows commercial use
under the license's copyleft/source requirements; it is not a commercial-use ban.
LICENSE itself is preserved verbatim; dependency licenses are not changed.

## Baseline and implementation

PR148's existing plan-only branch is reconciled with main
`28dbdbf78deff4045a60c843ebd88d6b80494561` (completed PR183), producing base
`42fe00d3fade0ef0dcdd1693e86e68879de68c01`. Root package and top/root lock versions
change from1.0.0 to the existing manifest version0.1.3. Package and lock-root license
change fromMIT toAGPL-3.0-only. Obsidian remains exactly1.13.0, matching both
manifests' minimum. Neither manifest, runtime source nor bundler changes.

The new `scripts/releaseMetadata.mjs` is the single policy owner. Its thin CLI
provides read-only repository checks, exact selected-dist validation and explicit
release preparation. `npm run check:release` runs first in full verification.
The release workflow uses the same owner after building and before existing
attestation/publication, with the tag supplied as environment data and its validated
boolean channel output reused. Action versions and permissions remain unchanged.

Both manifests/npm roots share the numeric version required by
[Obsidian's manifest reference](https://docs.obsidian.md/Reference/Manifest).
An optional single lowercase v is normalized. A matching numeric tag selects
stable; a valid SemVer prerelease suffix selects beta while the manifest retains
the numeric base. Existing beta-1 tag style is accepted. Build metadata, malformed
identifiers, leading-zero numeric identifiers and trailing-newline inputs fail.
Beta may differ in description; the other manifest identity fields must agree.
Preparation validates the actual ordinary dist manifest before selecting beta and
then validates its exact output, preventing replacement from hiding a wrong build.
Ordinary checks remain read-only even when GITHUB_OUTPUT is inherited.

## Historical release evidence

Main downloads public manifest.json assets with `gh release download`, independently
reads each tagged manifest with `git show`, and compares parsed metadata. Every
published release found has a matching numeric version and minimum1.13.0. The
unsupported1.0.0 map entry is removed; no fictitious tag/release is created.

| Published version | Minimum Obsidian | Manifest asset SHA256 |
| --- | --- | --- |
| [0.0.1](https://github.com/zsviczian/kplex/releases/download/0.0.1/manifest.json) | 1.13.0 | `ce47c92a66697beb729d04e184614656509483ee4d407b82f45d4b9815eb9b75` |
| [0.0.2](https://github.com/zsviczian/kplex/releases/download/0.0.2/manifest.json) | 1.13.0 | `93c7e5ffbd94b09bfd68367126c61241026b627d03ec3d4427fd4b6e8e6bb5a0` |
| [0.0.3](https://github.com/zsviczian/kplex/releases/download/0.0.3/manifest.json) | 1.13.0 | `fea9cba5466f803c82a2ea34d03027a304e472726feaec7fde62025c3b9494c8` |
| [0.0.4](https://github.com/zsviczian/kplex/releases/download/0.0.4/manifest.json) | 1.13.0 | `49214be9932e8866b6ba61ffe9396b5a8275e2d6d402ae45dc1f27655e305516` |
| [0.0.5](https://github.com/zsviczian/kplex/releases/download/0.0.5/manifest.json) | 1.13.0 | `e3bb9a35215af97f6a3394cf7fc8f7d2142bae06de94bb112fef5a05819cda62` |
| [0.1.0](https://github.com/zsviczian/kplex/releases/download/0.1.0/manifest.json) | 1.13.0 | `19799fff9ae459130d707901e7c0d98b3e14a8567881a393f07d457c2fa8ec1c` |
| [0.1.1](https://github.com/zsviczian/kplex/releases/download/0.1.1/manifest.json) | 1.13.0 | `af14fa53525911f8451babc617a577527d683af94074130124c5c88983106e7e` |
| [0.1.2](https://github.com/zsviczian/kplex/releases/download/0.1.2/manifest.json) | 1.13.0 | `0beacdb94adc4a0ec318d69dba87fcb4dc9c1a86784058db341fdefe0dfb4250` |
| [0.1.3](https://github.com/zsviczian/kplex/releases/download/0.1.3/manifest.json) | 1.13.0 | `19d9ecce5557733e0ff0f2e27155e635c30158c3cfa6fbca0f11c16e4dedfd2c` |

All nine parsed asset/tag comparisons pass. Compact source records are kept in the
private task directory `/private/tmp/kplex148-release-evidence/`; assets are public,
not vault data. Contributor documentation explains updating intended release
metadata and the evidence policy for historical entries.

## Review and focused validation

Offline implementation and main independent review check AGENTS, CONTRIBUTING,
architecture/workflow ownership, meaningful function/module TSDoc, filesystem
boundaries, tag handling, failure-before-write behavior and retained dependencies.
Main identifies two guard details during review: JavaScript `$` accepting a final
newline, and ordinary CI checks implicitly writing GITHUB_OUTPUT. Both are corrected
before executable inputs are frozen, with explicit regression fixtures.

Main independently reruns `node --test tests/release-metadata.test.mjs` using
Node22.22.2: **58passed,0failed,0skipped**. The actual repository CLI also passes at
0.1.3. These tests exercise the real pure owner and real CLI in temporary fixture
repositories: stable/v/prerelease selection, package/lock/license/minimum/map
mismatches, malformed JSON in every input, exact shipped-manifest checks, no writes
on failed validation, and the same no-publish command used by the workflow.

Preservation review confirms all341 non-root dependency records, dependency groups,
existing test registrations, action refs/permissions and manifest/LICENSE bytes are
unchanged. Only the metadata test registration is added to the Node lane.
LICENSE SHA256: `8486a10c4393cee1c25392769ddd3b2d6c242d6ec7928e1414efff7dfb2f07ef`.
Canonical sorted non-root dependency-record SHA256:
`93ec362ce85400f2d46491b82864fbc38166201014210a03550cc6f8d466fcfe`.
The temporary plan-only issue marker is removed. C14 remains paused.


## Final main-agent validation

Full `npm run verify`, invoked through the repository's shared
`runPortableVerification(process.cwd())` on Node22.22.2, exits **0**. Release
metadata validation, architecture7, core130, Node1127 (including the58 metadata
cases), UI165, portable source334 and real IndexedDB632 all pass, with zero failed,
cancelled or skipped tests. Official Obsidian lint, real installed typings and the
production build pass. Log: `verify.log` in the private evidence directory.

Main then validates the exact ordinary dist manifest and copies the actual metadata
and three actual built artifacts into a fresh temporary fixture. The same release
owner accepts `v0.1.3` and emits `is_prerelease=false`; it selects the exact beta
manifest for `v0.1.3-beta-1` and emits `is_prerelease=true`. The built bundle/styles
remain unchanged. A deliberately mismatched tag is rejected before artifact/output
writes. The repository's normal dist stays unchanged throughout. This invokes no
attestation, publishing API, tag creation or hosted release. Report:
`actual-no-publish-report.json`; driver: `actual-no-publish.mjs` in that directory.

All565 reviewed verification inputs remain unchanged at final audit. Canonical
input digest: `560c3bd41bc3a66d2768673dc814001d5dd82d18f559a8e79f66a01a5e0b564d`.
Normal build artifact SHA256:

| Artifact | SHA256 |
| --- | --- |
| main.js | `04bd96c4cb498e1c61226a2ac17cb4710888d4c6ec2cb5790d0c92b1a5c38ac3` |
| styles.css | `0135225519ad680cace5c7a35e8eab8388a3c6e6a8ead1a10a49f337324b106a` |
| manifest.json | `19d9ecce5557733e0ff0f2e27155e635c30158c3cfa6fbca0f11c16e4dedfd2c` |

The build identifies the reviewed uncommitted implementation at42fe00d3fade.dirty;
Git publication commits the same executable inputs after these checks. Final
branch/merge identity is recorded on PR148. `git diff --check` passes. The original
plan-only marker is removed, the feature checkpoint is recorded in Refactor plan,
and the transient handoff is inactive. Current main remains28dbdbf at the final
pre-publication fetch. The maintainer authorizes immediate merge after these local
checks without waiting for GitHub CI.

No native deployment or vault mutation is needed for this metadata/tooling change.
Prior PR183 native evidence remains separately identified. **No manual test needed**
for this scoped correction; the real hosted attestation/release service is not
exercised by a local no-publish check. No broader runtime, refactoring or release
work is queued.
