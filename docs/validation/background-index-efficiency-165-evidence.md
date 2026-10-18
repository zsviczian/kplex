# PR #165 evidence and reproduction index

Verified complete measurement/cleanup archive: `kplex-165-evidence-final.zip`
(28,363,759 bytes; 836 verified files / 837 ZIP entries).
SHA-256: `6bc315739247b71a8f864edcaa9a492408da305960dc0711e4cd6ce7b57800ca`.
All entries pass CRC, size and per-file SHA-256 checks. It remains local under `%TEMP%`, unpublished;
all raw originals and the earlier pre-cleanup ZIP remain intact. No public archive URL is claimed.

The archive contains raw summaries and append-only sample streams, successful/failed/excluded
trials, verification logs, frozen measured artifacts and source/build inputs. Every entry's size and
SHA-256 plus ZIP CRC are verified. Original raw files remain intact on the measurement host.
Configuration backups, note/cache payloads and transient handoffs are excluded. Local host/filesystem
metadata is included; publishing the archive requires separate maintainer approval. No personal
vault was accessed. The archive README records complete reproduction instructions and limitations.

## Immutable references

| Material | Source |
| --- | --- |
| M: merged main/#163 | [`8df393a`](https://github.com/zsviczian/kplex/commit/8df393a44272e4d6a5d2b403447ef0f3c81ae527) |
| A: independent duplicate-read/progress checkpoint | [`d0d16fb`](https://github.com/zsviczian/kplex/commit/d0d16fb06781c9b8efdf3522a5c1d1bd4971caac) |
| Rejected receipt and three failing provenance probes | [`9124f5b`](https://github.com/zsviczian/kplex/commit/9124f5b4a523932ea468e9d73ffdbda2fddbeedd) |
| Failing test source | [snapshot-source-receipt-indexeddb.test.mjs at9124f5b](https://github.com/zsviczian/kplex/blob/9124f5b4a523932ea468e9d73ffdbda2fddbeedd/tests/snapshot-source-receipt-indexeddb.test.mjs) |
| Historical receipt proposal/results | [closeout scope checkpoint](https://github.com/zsviczian/kplex/tree/ed9fe3d/docs/validation) and archived historical documents |
| Synthetic generator | [generate-high-node-vault.mjs at62c7283](https://github.com/zsviczian/kplex/blob/62c728393440aa3dfb57869ece83c4060092bcba/scripts/testing/generate-high-node-vault.mjs) |
| Public help fixture | [`kplex-help@f5f667e`](https://github.com/zsviczian/kplex-help/tree/f5f667ee7b36fbc218d88720fdd67a07a4ad562d) |

Actual B build inputs bind to9124f5b:201 source files match exactly, four differ only by CRLF/LF.
The original dirty build's205 TypeScript inputs, injected main.profile.ts, source snapshot and patch
remain preserved. Failed exploratory immutable-source builds were never deployed and are excluded;
no byte-identical rebuild from the later receipt-free checkout is claimed. Source-only Git tar files
for M/A/B, committed lockfiles and pre-cleanup tools are archived. No prototype code is shipped.

## Locate the raw observations

Paths below are relative to the archive's `raw/` directory. [Compact measurements](background-index-efficiency-165-samples.json)
bind primary summaries by SHA-256 and contain the complete numeric comparison.

- `kplex-165-large-restarts/primary-v2-{01-B,02-A,03-M}.json`: original completed group. B fails its
  strict retention assertion; this is preserved fallback cost, outside accepted M/A denominators.
- `kplex-165-large-restarts/closeout-v1-{04-M,05-A,06-A,07-M}.json`: remaining matched M/A pairs.
  The middle05-A loses focus and is excluded; its raw report/stream remains. The bounded replacement
  is `closeout-focus-retry-v1-08-A.json`. Valid observations have corresponding `-before`, `-after`,
  `-memory`, `.samples.jsonl` and CLI logs preserving conditions.
- `series-v2-progress.json` and `closeout-v1-progress.json` in that same directory preserve trial
  ordering (including the failed original coordinator and separate bounded retry) and the maintainer's change from nine M/A/B observations to bounded M/A closeout.
- `kplex-165-proof-work-{1-baseline,2-candidate,3-candidate,4-baseline,5-baseline,6-candidate}.json`:
  independent real-IDB AB/BA/AB algorithmic work counts at32/64/128 owners.
- `kplex-165-large-restarts/receipt-v2-create-before-01.json`: separate ordinary first-use cost.
- `kplex-165-native-edit-lifecycle-{1,net-M,net-A,net-B}.json` and mixed-fit reports: small normal-use
  lifecycle and mixed large-prose/drawing eligibility; failed setup controls remain included.
- `kplex-165-receipt-stale-host-source-proof-red.log` and final-promotion red/green logs: source
  provenance counterexamples and the separate second-connection final-promotion race.
- `kplex-165-final-verification-12/` and its log: final receipt-free full verification. Earlier failed
  rollback/harness controls remain preserved; assertions, resource caps and deadlines are unchanged.
- `kplex-165-receipt-free-native-foreground/report.json`: all six exact-shipping-build foreground
  scenarios, controller removal and configuration-byte restoration.

## Fixture and tools

The20,000 generated-note path/content SHA-256 is
`50b8cb12ef83c3cd62f1605390fe6ff793079a9f6e37e471e59d0060cf287cd0`.
Generator SHA-256 is `da636a90ba9067c5461a6890991ecb14ff3faf9b131a272fb79c7edc6cb257d1`.
With88 public help notes:20,088 Markdown files,9,062,067bytes,108,217 nodes and197,561 declarations.
The archive includes a per-file public-help checksum manifest, generator verification, controlled
preferences, host/hardware versions and exact profile identities. Saved-source/cache identities are
instance-specific; the fixture checksum is portable. Do not copy an old IndexedDB cache to reproduce.

Retained reusable tools: [source work counts](../../scripts/testing/source-validation-work.mjs),
[immutable profile builder](../../scripts/testing/obsidian/buildStartupProfile.mjs),
[restart/drain driver](../../scripts/testing/obsidian/warmRestart.mjs),
[resource observer](../../scripts/testing/obsidian/startupResources.mjs),
[cache identity](../../scripts/testing/obsidian/startupCacheIdentity.mjs) and
[retained-memory observation](../../scripts/testing/obsidian/startupRetainedMemory.mjs).
Use Node22.22.2, real dependencies and explicit disposable-vault name/path/config variables;
verify CLI path identity before writes. Run native/browser/build measurement lanes serially,
retain foreground/throttling and610s quiet after genuine drain. Preserve raw host replay/graph order
commitments. CPU excludes other Electron processes; IDB/hash counters are not disk bytes or allocation
totals. Two-GC heap observations happen outside primary CPU timing. See the archive README for exact
commands, checksums, cleanup and all exclusions; this index makes no additional acceptance claims.

Full verification12 started from2fec9b1 plus scoped uncommitted cleanup; f9704a3 changes only docs/
measurements, with source/tool/test scopes verified identical. Archive source/final-verification-tree.json
and its scoped patch reproduce that fully validated tree. Both fixtures were restored to original
on-demand settings/enablement with uninstrumented main4813b60d and no owned controllers/probes.
Workspace-byte restoration is not proven. Final small-driver functional reload passes; awake released.

Main advanced to `b29833c` (merged #168) after measurement/while verification ran. The maintainer
explicitly approved integrating it into the draft branch; `9af675e` records that clean integration.
The immutable archive and resource conclusions remain bound to the frozen #163 baseline/correction.
Combined-tree functional verification is separate; it is not a new performance comparison.
No PR merge into main or release is authorized or performed.

## Approved integration supplement

`kplex-165-integrated-closeout-evidence.zip` remains local under `%TEMP%`, unpublished:
3,537,489 bytes, 30 files / 31 ZIP entries.
SHA-256: `d370d964ee86fcfdcf6b0c4f0e9ba24bb0586d54b55e88a291f83db70432d0f1`.
All entries pass CRC, size and per-file SHA-256 verification; the complete original archive above is
byte-identical. The supplement preserves full13 logs/report, all six repeated exact-build foreground
cases, fixture restoration/cleanup and awake release, CI failure/retry records, integrated source tar,
source-scope proof and exact uninstrumented artifacts. Its README gives reproduction commands and
links the original fixture/evidence instructions. No new benchmark, note/cache payload, configuration
backup or handoff is included. No archive was published; all raw originals remain.

Combined-tree verification uses pushed `9af675e`; only final documentation/measurement summaries
change afterward. Counts: architecture7/core128/general838/UI63/portable334/browser525; zero failures/skips/captured native JS errors.
The PR-specific runtime patch matches `d0d16fb` after ignoring upstream line shifts/blob hashes.
Both fixtures have original configuration/enablement bytes and all three combined-build artifacts;
main `4cb08ded50af580470c6049b3e10a88d9f0d356399368442379e0515fa8f2711`, styles `9d244b30cab5cbda418e7a3e51d2ddd38a59808bd0f72f713dc4b28595155082`,
manifest `19d9ecce5557733e0ff0f2e27155e635c30158c3cfa6fbca0f11c16e4dedfd2c`. Workspace-byte restoration remains unproven.
CI failure logs identify browser-startup failure before assertions; no test or deadline was weakened.
