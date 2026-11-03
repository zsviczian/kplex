# PR #270 validation

This batch implements #266, #265, #262 and #263, plus the maintainer's added ontology-description typing fix. The branch is `2026-11-03-pins-preview-obsidian-uri`; the PR remains draft. No release, issue closure or production-vault deployment is included.

## Implementation boundaries

- Saved pins retain one canonical mixed collection, stable occurrence identities and the serialized settings writer. Missing entries keep their slots. Pointer and keyboard moves share stale-order validation. Each canvas retains its own center.
- Today, This Week and This Month are opt-in symbolic pins. One injected calendar resolver serves the toolbar, picker and numbered slots. Daily Notes configuration is optional; weekly/monthly notes need no companion plugin. A missing destination produces guidance on explicit activation and is never created automatically. See [Pins](../PINS.md).
- Page Preview registers only the existing primary K-Plex source. Native view IDs and existing hover-intent handling remain unchanged. The canonical preference is retained; the former separate sidebar preference is unused. Production code does not rewrite the core plugin's private configuration.
- The existing synchronous, serialized-worker and cooperative grammar recognizes `obsidian://` alongside HTTP(S). Exact URI bytes remain URL identities, without local-file decoding or web-origin parents. Explicit Open uses the verified owning-window native protocol route; passive rendering and Sidecar synchronization cannot execute it or create a web guest.
- Derived source compiler/body-parser versions become 2/5. Existing database schemas, CAS writes and acquisition scheduling remain in place. Older incompatible families are reacquired. Known historical deletion markers remain enumerable; historical complete headers are admitted only to explicit absence reconciliation, never semantic replay. This fixes the native upgrade audit that otherwise remained incomplete behind old deleted-source headers.
- Ontology description input caches validation of the detached structural choice. Wording edits retain constant-time length validation; changing names, roles or partners invalidates the cached choice. Save still performs fresh canonical validation and existing receipt/conflict checks. Reciprocal text is not reassigned while its value is unchanged.

## Automated validation

`npm run verify` passed with Node 22.22.2 and installed Obsidian declarations. Release consistency, Obsidian lint and the final production build passed. Test groups reported zero failures, cancellations or skips:

| Group | Passed |
| --- | ---: |
| Architecture | 9 |
| Portable core | 133 |
| Main regression group | 2,008 |
| UI regression group | 479 |
| Source repository | 360 |
| Chromium persistence | 896 |

The aggregate began before the final URI Sidecar-availability adjustment. That presentation-only delta separately passed 78 actual-method checks, focused App lint, the installed-types production build and all five native lanes on the final binary. Source/compiler/cache implementations were unchanged throughout the aggregate; its concluding build matched all three final native artifact hashes below.

The recovered focused run passed all 39 ontology-input and relationship-source-removal checks, including a 2,000-field vocabulary. Thirty-two description input events perform no full-list iteration; a structural role change still validates the complete candidate. Existing IME, stale-owner, duplicate-submit, literal-text, cancellation and writer tests remain enabled.

URI regressions cover worker/cooperative parity, exclusions, exact properties/labels/provenance, unsupported schemes, multi-owner publication/removal, eager/on-demand behavior and real Chromium IndexedDB repair/reopen. Existing scaling limits are unchanged. History scrolling and native file/pin drop routing retain their production-component Chromium coverage.

The unchanged 20,015-owner scale case passed with exact metadata/evidence/gates/degrees, zero source I/O/full builds, one direct canonical pass, 8,187,369 owner checks within its original linear bound, and two cancellation yields without partial publication. Its measured cached-publication phase was 162.2 seconds; this is the synthetic high-degree workload, not ordinary navigation latency.

Earlier failures are retained in local logs: an isolated Chromium bundle-startup deadline recovered without increasing the deadline; extracted settings-method fixtures needed their real calendar dependencies; the pin source-location assertion now follows the extracted shared component. Native probes were corrected to wait for actual active-leaf identity, current DOM targets, rendered preview text and settled declarative scrolling. These corrections do not replace missing behavior with test doubles or turn failed runs into passes.

## Exact-build native evidence at batch checkpoint `0d7c044`

Windows, Obsidian 1.14.5, Node 22.22.2. All native writes used the existing disposable `kplex-test-small` vault at `C:/Obsidian/kplex-test-small`, config `.obsidian`. Its baseline was 117 files, including 98 Markdown files. Production vaults were untouched.

The staging caller held the shared application-user-data lock, froze the production artifacts, copied/hash-verified them and restored settings, enablement and workspace after each lane. The durable driver also verifies exact installed artifacts, explicit vault identity, bounded receipts and independent scenario cleanup. All owned notes, modals, views, observers and settings were restored; file inventories and configuration bytes matched their baseline.

| Artifact | SHA-256 |
| --- | --- |
| `main.js` | `dc35387cd5c12b824e42f69dc749efc00724548792a96c4b5a321c8897b3f3b0` |
| `styles.css` | `66114919b8771a5d6bb5e183c2c23e39a874d943fe23e5291640de80ed4168b5` |
| `manifest.json` | `8c65b0d38a506f8fa9fc3311b81ea22bcda48e0209e9190483752c1f20834326` |

| Lane | Actual result |
| --- | --- |
| Pins | Trusted pointer reorder persisted once without navigation; keyboard reorder worked through Obsidian's DOM menu renderer. Missing slots survived; two canvases agreed when revealed. Escape, popout blur, closing a tab and native tab-to-popout migration caused no pin move. Trusted History grab scrolling moved 50 pixels without navigation. |
| Calendar | Controlled December 31 → January 1 rollover updated day/month destinations while retaining ISO week `2020-W53`, with zero writes, source reads, rebuilds or navigation. A picker opened before advancing to January 4 activated that new day and week `2021-W01`; numbered slots used the same resolver. Missing January 5 produced guidance and no file. Real plugin reload preserved mixed order and an unknown-key sentinel. |
| Settings | All three actual declarative editors rendered without saving defaults. Native Daily Notes toggles applied and restored dependent controls, preserved custom configuration and enabled the symbolic pin. Source reads remained zero. |
| Page Preview | Exactly one actual core settings row. Stationary modifier activation produced the expected native preview text in tab, sidebar and popout documents. Disable/re-enable and real plugin reload preserved one source and working contents. The popout was also visually inspected through the computer-use skill. |
| URI | Bare, labelled and autolink forms appeared as exact graph URL nodes; ordinary Markdown, central preview and Sidecar preserved native clickable labelled/autolink forms. An existing companion remained closable at a URI center; opening/attaching one was unavailable in both controls and actions. Explicit Open reached the encoded file/heading with Web Viewer disabled and enabled. HTTP Web Viewer routing remained intact. Acquisition, hovering and warm reload dispatched no protocol; no bogus file/domain node, URI web guest or unintended note was created. |
| Warm cache | After persisting the real current graph and reloading the plugin, all URI nodes returned in approximately 8.29 seconds in the final run during portable verification (2.96 seconds in the earlier run). Both did zero vault reads, parses, URL reads or full builds. This is functional Small-vault plugin-reload evidence, not an isolated performance, large-vault or whole-application startup benchmark. |
| Ontology typing | Trusted native text input passed in Edit, Add and reciprocal-description fields. Maximum per-character DOM receipt was approximately 71.5, 40.2 and 24.3 ms during portable verification (24.9, 10.6 and 9.3 ms in the earlier run). Cancellation caused zero settings writes or source reads. These are observations under varying system load, not isolated pixel-paint or physical-keyboard latency benchmarks. |

Native baseline reproduction used the frozen preceding #272 build. Native Markdown already rendered labelled/autolink URIs, while graph URI discovery was absent and Page Preview registered two K-Plex sources. The final implementation keeps Obsidian's renderer.

After exact-build staging, set `KPLEX_TEST_VAULT_NAME`, `KPLEX_TEST_VAULT_PATH`, `KPLEX_TEST_CONFIG_DIR`, a fresh `KPLEX_HOST_REPORT_DIR`, and one `KPLEX_270_NATIVE_LANE` value (`pins`, `settings`, `preview`, `uri`, `ontology`). Run `npm run verify:obsidian:pins-preview-uri` serially. `KPLEX_OBSIDIAN_USER_DATA` optionally overrides the shared application identity; ordinary CLI discovery/override comes from the existing process helper.

## Periodic settings layout follow-up

The reported cramped form came from nesting an entire editor in the native setting's control column. Period headings competed with that form, inherited control alignment pushed content right, and native Settings group rules added nested padding/dividers. Periods now occupy full-width sections with complete headings, left-aligned labels, compact toggles, fields that stack at narrow widths and wrapping destination previews. Styles use Obsidian theme variables and apply only to these sections.

The old native build reproduced horizontal overflow. The updated `settings` lane passed all six actual layout cases: dark/light modes at widths 320, 480 and 700 pixels (the native page caps a requested 760 pixels at 700). Checks cover heading placement, field bounds and long unbroken destination paths. Changing widths/themes caused no settings writes. Existing native dependent-control/opt-in checks also passed with zero source reads; configuration bytes, native window geometry, theme classes and fixture inventories were restored. The final native appearance was visually inspected as well.

`npm run build` and focused `eslint src/settings.ts` passed with Node 22.22.2 and installed Obsidian declarations. This follow-up changes scoped CSS and native styling classes, with no indexing, persistence or parser changes; the expensive aggregate was not repeated. The complete batch verification above remains the earlier checkpoint evidence.

| Follow-up artifact | SHA-256 |
| --- | --- |
| `main.js` | `b58f67da43ca6f374d5c146aee24de58d953f170f1966282d519ade2ecd2ebd9` |
| `styles.css` | `4826da18f4c1abac6ce3aa85257b64c0c0e620e2531f861efe5716a6f29f72e8` |
| `manifest.json` | `8c65b0d38a506f8fa9fc3311b81ea22bcda48e0209e9190483752c1f20834326` |

Passing local receipt: `%TEMP%/kplex-270-native-Wb3UAa/pins-preview-uri-settings-270.json`; original overflow reproduction: `%TEMP%/kplex-270-native-AUn0c6/pins-preview-uri-settings-270.json`. These settings-only artifacts supersede the batch artifact hashes for the current build.

## Remaining platform checks

1. Physical phone/tablet: touch-handle reordering and ordinary native pin/History scrolling must coexist without accidental activation.
2. macOS: verify modifier previews, explicit URI routing and normal OS/native file dragging. Windows Electron/Chromium evidence does not certify these platform inputs or the OS-native reorder-menu renderer.
3. A large disposable vault with an older persisted cache: observe the one-time grammar refresh and subsequent warm hydration. Older incompatible derived facts must refresh once; no historical-cache production-vault performance claim is made here.

No automatic periodic-note creation is supplied; existing native creation commands retain responsibility for templates. No whole-app restart, macOS or physical-device run was performed.
