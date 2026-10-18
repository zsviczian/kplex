# PR #158 evidence and reproduction

[Final findings and limitations](native-styling-158-2026-10-15.md). Evidence is **local and unpublished**; no archive publication is authorized for this PR. Durable copies live at `%LOCALAPPDATA%/kplex-validation/pr-158/`. Original raw files remain under `%TEMP%`; no original measurement stream or failed control was deleted. Archives contain source/build/test evidence and local host metadata, not private configuration backups, note/cache payloads or root handoffs.

## Verified checkpoint archives

Each ZIP has a root `MANIFEST.json` identifying its source baseline, reproduction inputs and per-file checksums. Entry inventory, CRCs, byte counts and every listed file checksum were reverified before closeout; copied ZIP checksums also match.

| ZIP | Bytes | Entries |
| --- | ---: | ---: |
| `kplex-158-checkpoint-A-evidence.zip` | 222,442 | 24 |
| `kplex-158-checkpoint-B-evidence.zip` | 665,904 | 60 |
| `kplex-158-checkpoint-C1-evidence.zip` | 2,131,912 | 133 |
| `kplex-158-checkpoint-C2-evidence.zip` | 6,464,566 | 143 |
| `kplex-158-checkpoint-D-evidence.zip` | 2,746,137 | 121 |

SHA-256:

```text
a3151777b1c4f0e0a55ccd605e4f06a992dbbe6069e14d494972a4a94e010cff  kplex-158-checkpoint-A-evidence.zip
f1ac010ef4c245dfed48f383d56df14ada229354cb77a48ba3f66d4e7b43a254  kplex-158-checkpoint-B-evidence.zip
4e91ee71f650947dfa5b848a170a7d0bf29da611199a78ee322f888ad4396dae  kplex-158-checkpoint-C1-evidence.zip
ea96ac043fd04bfa8ca3d0abd7a1eb24be971992f1d1039f26cf15f6d532d5d1  kplex-158-checkpoint-C2-evidence.zip
bbe6636aec5ee0c7d303dfb5dd6e878f53ce054fa54bdd670a55e785a355065d  kplex-158-checkpoint-D-evidence.zip
```

The separately verified `kplex-158-pre-curation-preservation.zip` (13,593 bytes; SHA-256 `daa5b8ead7993b6893c853682bb5d7e5a808c70034a787d47a3e47db46f301e9`) retains the complete historical validation report and obsolete public plan marker before the final report was consolidated. It is also included with the final supplement. The single root `HANDOFF.md` remains transient and is excluded.

Final E/closeout supplement: `kplex-158-final-evidence.zip`, **3,953,297 bytes / 237 entries**, SHA-256 `437eef0034c44a7e887a705d8eadab7316e6e14ab29fd4c499c1b522293bf9aa`. Exact entry inventory, all CRCs and all 236 per-file size/SHA checks pass, including the nested pre-curation ZIP. It retains E1–E4 successful/failed trials, the final field-accessibility checkpoint, full verification failures/acceptance, implementation CI, source snapshots, final artifacts, fixture manifest, restoration/awake receipts, actual Gruvbox observation and the archive-generation source. E1/E2 historical binaries are identified by committed source/build hashes; E3 and final binaries are captured. Do not infer a captured historical binary where only its hash/source reference exists. The original raw streams remain intact.

## Source references

The final report lists every independently pushed checkpoint. Main `867ef55` was integrated at `689399d`. Runtime `701fd62` identifies the frozen final implementation and fixture ports before documentation closeout. Final archive metadata records full revisions, the exact working diff and file checksums. No database/source schema upgrade or receipt prototype belongs to this PR.

## Reproduce

Use Node **22.22.2**, actual installed repository dependencies, Obsidian desktop CLI and an existing maintainer-authorized disposable `kplex-test-small` vault. Never point these drivers at a personal vault. Follow [CONTRIBUTING](../../CONTRIBUTING.md#desktop-cli-setup-windows-and-macos); set the vault name, absolute path and config path explicitly, and verify the CLI-reported path before writes.

Run serially, keeping the selected native window unlocked and native throttling unchanged:

```powershell
npm ci
$env:KPLEX_TEST_VAULT_NAME = 'kplex-test-small'
$env:KPLEX_TEST_VAULT_PATH = 'C:\Obsidian\kplex-test-small'
$env:KPLEX_TEST_CONFIG_DIR = 'C:\Obsidian\kplex-test-small\.obsidian'
$env:KPLEX_OBSIDIAN_CLI = 'C:\Program Files\Obsidian\Obsidian.com'
# Use a different fresh absolute report directory for every invocation.
$env:KPLEX_HOST_REPORT_DIR = '<fresh report directory>'
npm run verify:obsidian
# Set another fresh report directory before each subsequent lane.
npm run verify:obsidian:color-styling
npm run verify:obsidian:style-operations
npm run verify:obsidian:migration
node scripts/testing/obsidian/themePreview.mjs
```

The migration lane normally performs its own full verification. The recorded final trial can reuse an already completed exact-hash report through the preserved local adapter; it preserves the native assertions/staging/cleanup and refuses source/artifact/target mismatches. The strict committed migration command above reproduces the complete acceptance without relying on that local adapter.

The color/Compass driver creates two owned synthetic notes and removes them. Migration creates/removes its two owned notes. Both reject collisions; theme sampling reads CSS and uses synthetic DOM only. Reports preserve failed cleanup as failures. A missing host or failed setup is not a pass. Build hashes must match installed hashes. Source/IDB/browser lanes are not performance trials; zero-call and DOM geometry observations do not establish CPU, memory, energy, physical paint or device acceptance.

## Pinned theme fixture inputs

Default uses the prepared vault's existing default theme. Minimal and Things are loaded CSS fixtures, not installed theme plugins/Style Settings. Store each as `<name>.css` beside a `MANIFEST.json` array containing `name`, `repository`, `revision`, `url`, `bytes`, `sha256`, `remoteResourceUrls: 0` and `imports: 0`. Set `KPLEX_THEME_FIXTURES` to that directory. The preserved archive includes the exact manifest and CSS.

| Theme | Source revision | CSS bytes |
| --- | --- | ---: |
| [Minimal](https://raw.githubusercontent.com/kepano/obsidian-minimal/93321bdc23fc879966e1e3aa0cfeda77012f540f/theme.css) | `93321bdc23fc879966e1e3aa0cfeda77012f540f` |266,817 |
| [Things](https://raw.githubusercontent.com/colineckert/obsidian-things/9b8bef93d3919f7693ac78597beaa35bbbd4cfff/theme.css) | `9b8bef93d3919f7693ac78597beaa35bbbd4cfff` |69,804 |

```text
b63ef8a162529a06a945b51a4dacf73333b1d273660be26c86def455584996a8  Minimal.css
b98c8b9ba0c3cc67ec42cbe34d5a1aea27a903bc7256351162e6584fb0b686d8  Things.css
```

The matrix checks actual main/popout graphs plus the declarative native Settings editor through real light/dark switches, a scoped color override, retained DOM and measured source/graph calls after first-view activation. A separate observational check uses the current sampler/preview/translator with the actual Obsidian gruvbox theme in testvault; its existing plugin and open Settings session are preserved and all four configuration hashes are unchanged. Its initial dependency/older-translator setup failures are retained. This is distinct from deploying the full new plugin to testvault. Script-driven alternate state, minimum-host/macOS and physical iOS/Android acceptance remain outside the formal recorded matrix.
