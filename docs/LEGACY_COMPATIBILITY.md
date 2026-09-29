# Legacy compatibility notes

K-Plex migrates graph ontology and graph/node/link styling from ExcaliBrain, not plugin UI or workflow behavior. The [historical specification](EXCALIBRAIN_DETAILED_SPECIFICATION_LEGACY.md) records the predecessor's input formats and semantics; it is not the current K-Plex implementation guide.

## Preserved graph inputs

- Obsidian resolved links
- unresolved links as virtual/ghost nodes
- folder tree (`file-tree`)
- tag tree (`tag-tree`)
- YAML/frontmatter ontology fields
- Dataview-style inline fields (`Field:: value`)
- HTTP/HTTPS links and origin nodes

## Preserved role reconciliation

The portable compiler, evidence and resolver modules under `src/core/graph/` own K-Plex relationship meaning. Imported ontology retains parent/child/friend/challenger/previous/next semantics: mutual inferred links and conflicting explicit roles reconcile laterally rather than duplicating role nodes. K-Plex deliberately gives conflicting frontmatter ontology precedence over body declarations from the same source; overridden evidence remains available for explanation.

## Preserved display filters

Legacy visibility settings are applied before neighborhood construction. `maxItemCount` is applied per visible zone and siblings are only derived through visible parents.

## Known architectural differences

- Dataview is no longer required. The built-in parser covers common frontmatter values, arrays, wiki links, Markdown links, URLs, and `Field::` inline fields.
- Excalidraw is no longer the render surface. Styles are translated into CSS/SVG equivalents.
- Excalidraw-specific properties such as hachure rendering and roughness are retained in persisted settings but only approximated in the React renderer.
- K-Plex owns document synchronization, navigation history, hotkeys, workspace/editor state and scheduling independently; importing a legacy graph does not replace those preferences.

## Runtime naming and persisted data

Current K-Plex classes, DOM selectors, custom properties, SVG marker IDs and canonical command
suffixes use `kplex`, while named TypeScript types/components use `Kplex`. CSS snippets targeting
the old runtime namespace need to adopt the corresponding `kplex-` classes and `--kplex-` variables;
there are no legacy plugin-CSS aliases. Imported graph/node/link style dictionaries are data, not plugin UI CSS.

The terminology cleanup intentionally leaves these migration contracts intact:

- `excalibrainFilepath` is ignored when importing old `data.json` files and removed when normalizing
  previously saved K-Plex settings. `Excalibrain.md` was a transient Excalidraw render surface, not
  migration data. K-Plex does not create it, reserve its path, exclude it from the graph, or treat a
  same-named user note specially.
- The `excalibrain` registry lookup is used only for first-run settings import. Import dialogs,
  migration notices and translated copy still identify the source product accurately. Legacy
  local-storage cleanup, imported style keys, ontology field names and graph target paths retain
  their exact spelling. Migration fixtures and golden data are not rebranded.
- `kplex-start`, `kplex-rebuild-index` and `kplex-focus-active-note` are registered once through
  `Plugin.addCommand`, with no legacy shortcut or command-URI aliases and unchanged availability
  gates. Existing bindings to old command IDs must be reassigned to the K-Plex actions. Plugin CSS,
  hotkey files and command-manager state are never imported or rewritten.
- `importExcaliBrainGraphSettings` explicitly selects ontology inputs, visibility/layout appearance,
  canvas/label settings and complete node/link style dictionaries, then uses the existing settings
  normalizer. First-run and manual imports share this boundary. Current K-Plex navigation, pins,
  synchronization, workspace/editor choices, suggestion shortcuts and indexing interval remain
  local. Unknown legacy keys and executable title scripts are not imported. Loading K-Plex's own
  `data.json` still uses `migrateAndMergeSettings` and preserves its preferences.

No legacy command aliases are registered. The unused `legacyCommands.ts` adapter has been deleted.

The plugin ID remains `k-plex`. Workspace view types remain `k-plex-react-view` and
`k-plex-sidepanel-view`, so existing saved layouts do not need a view-state migration. The canonical
native shell lives at `src/ui/KplexView.tsx`. The former source file has been removed.

Historical validation transcripts retain the identifiers actually observed by those older
builds. They are source evidence, not instructions for current DOM queries or a validation claim
for this naming patch. Current CLI runners and UI regression tests use the canonical namespace.
