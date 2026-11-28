# Publish a static K-Plex site

K-Plex Publish turns a selected part of a vault into a static directory with a
read-only Compass and Sidecar. Readers can navigate thoughts, open published
documents and drawings, search, and share note addresses. Every file in the ZIP
is public to anyone who receives it.

## Prepare and export

1. In desktop Obsidian, run **K-Plex: Publish static site** from the command
   palette. Set the public title and entry note. Add note, folder, tag, or
   declarative condition rules to **Include notes** and **Exclude notes**.
   Folder recursion is explicit. Exclusions take precedence and relationships
   never expand the selection. Include the entry note in the selected set.
2. Choose any properties, aliases, full-text search, or theme colors to share.
   Public property names also opt in to matching relationship labels. Save the
   profile to reuse it. Profiles live in the plugin's private vault settings
   (`.obsidian/plugins/k-plex/data.json`), in the versioned `publishProfiles`
   field. Unknown profile schema versions are retained by the settings writer.
3. Choose `kplex-web-runtime-<version>.json` from the same K-Plex release as your
   installed plugin. For a local build, run `npm run build:web` and choose the
   generated pack in `dist-web/`. Importing verifies the version, required
   files and SHA-256 digests. Obtain the pack from the official release or your
   own exact build. The hashes check integrity and the pack's JavaScript runs in
   the published site.
4. Click **Preview publication**. Review the exact selected notes, relationship
   count, warnings, and individually selectable media. If graph data is
   incomplete, **Prepare publication graph** can check sources across the
   vault while retaining your indexing mode. If sufficient coverage remains
   unavailable, try again after indexing settles or narrow the scope.
5. If notes need IDs, open **Review proposed note IDs** and check each listed
   change. **Apply these note IDs** writes the reviewed frontmatter field
   through Obsidian, using `kplex-id` by default. Valid unique IDs are preserved.
   Resolve duplicates in Obsidian or exclude the affected notes. A cancelled or
   interrupted operation can leave already-saved IDs in place. Check the write
   outcomes and take a fresh preview before exporting.
6. Click **Export site ZIP**. Save the completed archive outside the vault and
   extract it to an empty directory.

Note, folder and tag rules select Markdown documents. Folder and tag rules do
not publish the vault's structural index. Unselected targets are absent from
the public graph and search. Referenced media requires approval and cannot
override a folder exclusion. Embedded notes must belong to the selected set.
Files such as JPEGs, audio, video and PDFs can retain embedded metadata. Preview
the actual authored content before sharing.

The converter supports static Markdown and approved local assets. Supported
Excalidraw vector drawings use the installed companion's SVG link hook so
links to selected notes remain interactive. Unsupported drawings and references
are reported in the review. Safe drawing omission requires a separate choice.
Script-driven Markdown, arbitrary postprocessors, remote embedded media,
unapproved dependencies, and editable drawing scenes are excluded.

## Preview and host

From the extracted directory, start a local static preview with
`python -m http.server 8000 --bind 127.0.0.1` (or use `python3`), then open
`http://localhost:8000/`. The reader uses browser cryptography to verify files.
Serve the public site over HTTPS, or use localhost for local preview.

Upload the complete extracted directory to a static host. For GitHub Pages,
include `.nojekyll` and keep all paths relative to `index.html`. The same site
works at `/` or a project subpath. A CMS can embed the hosted URL in an iframe
if its policy allows it. K-Plex performs local generation and leaves upload and
hosting to the author.

On republication, deploy the new complete directory and remove stale files from
the previous deployment. An export cannot retract existing copies, cached
pages, or content preserved in Git history.

## File format

The version 2 `publication.json` identifies the required runtime version,
publication and entry UUIDs, public nodes, exact directed relationship roles,
resolved presentation fields, and the size and SHA-256 digest of each generated
resource. Shareable addresses use `?node=<uuid>` with an optional fragment.

- `notes/<uuid>.html` contains sanitized document or drawing content.
- `assets/<sha256>.<ext>` contains approved media or sanitized vector drawings.
- `data/search.json` contains optional full-text postings and approved snippets.
- `theme/publication.css` contains optional scoped, resolved theme colors.
- `runtime/` contains the pinned local reader, and `LICENSES/` carries its
  notices and corresponding-source information.

See the [implementation specification and validation notes](proposals/KPLEX_PUBLISH_MVP.md).
