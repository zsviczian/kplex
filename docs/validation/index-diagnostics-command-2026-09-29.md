# Index diagnostics command — 2026-09-29

## Change

**Copy index diagnostics** is a temporary Command Palette action for sharing indexing issue reports from desktop, tablet, or phone. It copies a versioned JSON report containing plugin version, platform, cached readiness/counts, graph/hydration progress, sanitized saved-generation metadata, and the last 20 local decision codes. The report contains no vault name, note path, note content, settings, generation ID, or vault signature. It is never transmitted by K-Plex. A localized notice confirms success or clipboard failure.

The report is assembled synchronously from in-memory facts and calls `navigator.clipboard.writeText()` before the command handler yields. This preserves WebKit's user-gesture requirement on iOS. If the vault-wide Markdown count is not cached yet, the report uses `totalFiles: null` rather than iterating the vault just to copy diagnostics. The startup catalog and completed snapshot writes keep a small sanitized cache summary current. The command does not alter index state or persisted schemas.

## Verification

- Node 22.22.3 `npm run verify:obsidian` passed architecture, core, official Obsidian lint, indexing/localization, 111 aggregate Node tests, seven browser DOM tests, production build, and exact-build host render/error checks. Installed/built `main.js` SHA-256: `315ba55ff8a737c4a932d03969b70ff0d5c96968607b5d6c5b046339d8f234a6`. Runner report: `/var/folders/b1/2dys0jfs7bq73whkl2qnyyym0000gn/T/kplex-obsidian-QaXv7F/report.json`.
- Portable tests assert that report serialization excludes raw metadata paths/signatures and that copying while the Markdown total is uncached does not call the vault-counting status path.
- In the native `kplex-test` vault, the installed command registered as `k-plex:copy-index-diagnostics` and synchronously called an intercepted clipboard writer during cache loading. On the final exact build, a second probe forced the cached total to `null` and replaced `getMarkdownFiles()` with a throwing stub; the command still produced a valid report with `phase: "ready"`, `upToDate: true`, and `totalFiles: null`. The intercepted report had the expected schema, saved-cache state, and decision history; the system clipboard was not changed by these tests. All temporary overrides were restored.
- Desktop mobile emulation on the final exact build: tablet at 900 × 875 and phone at 390 × 844 both registered and executed the command with an intercepted clipboard writer and no JavaScript errors. The original desktop mode and 996 × 795 dimensions were restored. This validates command routing and report generation in emulation, not physical-device clipboard permission or touch behavior.

## Release assessment

The indexing changes have meaningful 20,015-note desktop restart evidence and full automated gates. They are suitable for an opt-in user beta with this diagnostics command. Broad stable release should still include a physical iPad/Android clipboard and interrupted-checkpoint run, plus observation of mixed rename/move fallback behavior in a real synced vault. No complete cold-build wall-clock improvement is claimed.
