# ExcaliBrain settings migration fixture

`data.json` is the maintainer-provided, fully configured real-life ExcaliBrain settings file. Keep the original keys, casing, empty overrides, Unicode prefixes and colors intact. It contains 32 tag-node style definitions and 297 hierarchy-link style entries; an entry count includes inherited/empty entries, not just meaningful custom overrides.

The historical `excalibrainFilepath` value remains in this unmodified source fixture, but K-Plex ignores it. `Excalibrain.md` was a transient drawing render surface rather than migration data or a K-Plex entity exclusion.

`tests/excalibrain-migration.test.mjs` verifies complete compatible settings, ontology precedence, persistence stability, actual node/link style resolution and manager inclusion. `npm run verify:obsidian:migration` loads this file through the native importer and verifies the settings dialogs and Plex in an explicitly configured disposable test vault. Do not replace this fixture with a synthetic subset or use it as a runtime/default configuration.
