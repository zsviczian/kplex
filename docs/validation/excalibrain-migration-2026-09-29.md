# ExcaliBrain settings restore validation — 2026-09-29

The real-life fixture in `tests/fixtures/excalibrain-migration/data.json` passed the strict Obsidian CLI migration lane after the K-Plex namespace and compatibility-scope review. Validation used Node **22.22.3**, Obsidian **1.14.2** (installer 1.14.0), and a fresh explicit disposable vault named **kplex-migration-small**. The temporary vault and its Obsidian registry entry were removed after the run.

## Reviewed fixes

- ExcaliBrain compatibility remains limited to ontology plus graph, node, and link styling. The importer preserves K-Plex UI, navigation, editor, command, and scheduling preferences; it does not import command aliases, hotkeys, plugin CSS, or unrelated settings.
- Only canonical K-Plex command IDs, view symbols, CSS selectors, and runtime names are registered. The unused migration-command adapter and retired view source were removed.
- The historical `excalibrainFilepath` key is ignored. `Excalibrain.md` is a transient predecessor render surface and has no K-Plex graph or migration role.
- Native search activation uses the CLI CDP input path because synthetic DOM input events do not update React state in the Electron host.
- Cleanup persists the saved pretest settings, reloads K-Plex, and restores the matching index snapshot. This avoids making cleanup depend on a cold rebuild of the 20,000-note test vault.

## Exact validation

`npm run verify:obsidian:migration` exited **0**. Its nested `npm run verify` passed architecture and portable-core checks, official Obsidian lint, **123 Node tests**, **7 browser tests**, typecheck, and production build.

The staged build hashes exactly matched the source build:

- `main.js`: `0305949929ff682e92bb25612c07ac96b8c2c38d7caeb0704e45a54312aa5439`
- `manifest.json`: `e3bb9a35215af97f6a3394cf7fc8f7d2142bae06de94bb112fef5a05819cda62`
- `styles.css`: `e6c119a8ac15e1862f5d2fa6d17aabf60e14c33839319496c1828dc3e5407b4e`

The native lane passed all six reported scenarios:

1. Open K-Plex through its canonical command and render `.kplex-app` without captured JavaScript errors.
2. Import the actual fixture through the rendered file input and Import button, then compare the complete live and persisted ontology/style data.
3. Render and inspect every imported node and relationship style in the actual settings managers.
4. Save an unchanged imported style while preserving alpha, overrides, and matching order.
5. Index temporary notes and render the imported `#person` prefix/border plus the `Inspired by` connector color and width in the Plex.
6. Disable, enable, and reopen K-Plex while preserving the imported graph settings and all local preferences.

Cleanup restored the original settings, removed both temporary notes and the controller, and returned the index to a settled state. No captured JavaScript errors remained.

## Limits

This validates desktop Electron behavior in the disposable vault. It does not establish physical phone/tablet touch behavior or community-theme appearance. Those remain optional visual checks for the style editors; they do not block the settings restore result.
