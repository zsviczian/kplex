# Mind Map Markdown export

Implemented on the existing PR #237 branch, refreshed from main including #241. The feature exports a committed Mind Map presentation; it never requests another graph projection, expands a branch, reads note bodies, or indexes the graph.

## Using the feature

In **Mind Map**, open the central node's context menu and select **Mind Map Markdown export**, or run the command of the same name from the command palette. The dialog defaults to **Whole Mind Map**. When a branch node is selected, **Selected branch** is also available. Preview the exact output, then choose **Copy Markdown** or **Save Markdown**.

Save hands the suggested filename and preview bytes to Obsidian's native export facility, the same facility used for Bases CSV export. Obsidian owns the destination and overwrite interaction. Completion feedback describes the handoff; it does not claim the user completed the save. Saving directly into the vault can cause Obsidian's normal file indexing; the exporter itself does not create a vault note. Hosts without this capability retain Copy and disable Save.

## Ownership and format

- `captureMindMapMarkdown.ts` detaches the existing scene's admitted branch occurrences, cached native links, and unscrolled visual positions. Camera clipping never removes constructed rows. Current filters and collapsed branches do constrain scope.
- `core/plex/export/mindMapMarkdown.ts` is a bounded, host-free formatter. Whole-map and selected-subtree calls use the same immutable snapshot. PR #237 introduced this service without an API or CLI. Draft PR #240 reuses it through [the public `exportMarkdown` operation](../PUBLIC_API.md#export-a-committed-mind-map-as-markdown); that integration's full repository and exact-build Windows native acceptance pass, as recorded in its [validation report](../validation/public-api-cli-240-2026-10-30.md).
- `MindMapMarkdownModal` owns preview, gesture-safe owning-window clipboard, native save handoff, and truthful warnings. Existing dialog/session cleanup retires it on view migration or disposal. Changed scene/filter/view lifetime blocks stale publication.
- No note, relationship, camera, selection, editor binding, saved preference, or other canvas is changed by export.

The actual [Builder importer](https://github.com/zsviczian/ea-scripts/blob/a7a627bd78f462653bedcb81b01da41c464759d1/src/scripts/mindmap-builder/markdownImport.js) and [exporter](https://github.com/zsviczian/ea-scripts/blob/a7a627bd78f462653bedcb81b01da41c464759d1/src/scripts/mindmap-builder/markdownExport.js) define the format. A multi-node map uses a root heading and indented list children. A single-node map uses a list item because Builder's one-line import path retains a heading marker. Balanced maps serialize right-side children before left-side children, then top to bottom, matching Builder's export order. Descendants preserve displayed order.

Real notes use Obsidian's cached `fileToLinktext` target and an explicit wikilink alias. Repeated occurrences stay independent. Ancestor-cycle cards become block-reference crosslinks to their included ancestor; semantic crosslinks use Builder's eight-character block IDs and loose-list syntax. No branch or dummy node is invented to carry a link.

## Explicit limits

The preview warns about collapsed content, unresolved/structural identities, partial scenes, omitted outlines/decorations, and converted ancestor references. K-Plex has no Builder submap representation; expanded Markdown outlines are omitted with a warning. A root-only self-crosslink is omitted because Builder's single-line path cannot restore it.

Builder interprets `::` as ontology even inside aliases, and Excalidraw's native text parser displays HTML entities literally. Syntax-sensitive labels therefore use visible escape sequences and trigger a warning. Ordinary ampersands remain unchanged. Paths that cannot safely round-trip as a wikilink become text and trigger the unresolved warning. Output does not pretend such labels or targets round-trip exactly.

Formatting rejects malformed occurrence cycles, depth over 32, more than 2,048 captured nodes, more than 16,384 semantic links, or output over 2,000,000 characters. It uses iterative traversal and performs no background graph work.

## Validation

See [the validation record](../validation/mindmap-markdown-export-237-2026-10-30.md). The compatibility suite imports real output through the unmodified, pinned upstream importer. Native acceptance additionally runs the actual Builder runtime in the enabled Excalidraw companion, inspecting drawing elements and re-exporting Markdown. Only its unrelated help renderer is replaced to prevent network embeds.

Image export is tracked separately in PR #238. Importing Markdown into K-Plex, graph-wide export
and source editing remain out of scope. The separate draft public API work reuses this formatter
rather than expanding PR #237's export scope.
