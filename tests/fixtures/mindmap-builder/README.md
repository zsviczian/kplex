# Mindmap Builder compatibility fixture

This is the unmodified Markdown importer from `zsviczian/ea-scripts` at
`a7a627bd78f462653bedcb81b01da41c464759d1`, licensed AGPL-3.0-only.

Source: https://github.com/zsviczian/ea-scripts/blob/a7a627bd78f462653bedcb81b01da41c464759d1/src/scripts/mindmap-builder/markdownImport.js

SHA-256: `307a5b7c1d91296c5ae8a831bd2d4133c1cfc88bd4154497aa5b2ac528aab6a1`.

The compatibility test executes this real importer. Its unrelated native element-paste
imports are replaced with inert test capabilities. Finite EA doubles record the nodes,
branch parentage, ontology and crosslinks created by the actual Markdown import routine.
These checks do not substitute for native K-Plex UI/clipboard/file validation or physical
Mindmap Builder rendering. Keep the fixture pinned and verify its checksum when updating it.
