# Creation and navigation: help-authoring reference

This is the proposed behavior on `codex/kplex-creation-navigation`, addressing [#217](https://github.com/zsviczian/kplex/issues/217), [#208](https://github.com/zsviczian/kplex/issues/208) and [#224](https://github.com/zsviczian/kplex/issues/224). It is an unreleased draft. This reference supports a separate agent working in K-Plex Help; it does not change that repository. Follow its current instructions and the [authoring guide](README.md) when organizing help pages.

## Open files in K-Plex

Right-click a file in Obsidian's file explorer, its tab, or an internal link (including an unresolved placeholder link in the editor or reading view). The **K-Plex** submenu offers these destinations:

| Destination | Desktop | Tablet | Phone |
| --- | --- | --- | --- |
| Open | Yes | Yes | No |
| Open in new tab | Yes | Yes | No |
| Open in new tab group | Yes | Yes | No |
| Open in side panel | Yes | Yes | Yes |
| Open in new window | Yes | No | No |

The requested file becomes the center of that K-Plex view. This applies to existing files, including attachments and drawings; folders do not acquire this submenu. An unresolved link opens its placeholder node without creating a note; the selected target is retained even before its graph scope is ready. Open reuses an existing K-Plex view when available. Open in new tab group creates a separate native group. Ordinary K-Plex tabs show the centered file's basename alongside the K-Plex brain-circuit icon. Independent tabs, splits and windows retain their own centers.

Useful help example: open a note's link in a second K-Plex tab while retaining the original view. Capture the actual submenu and resulting tab caption on an accepted build.

## Choose an Excalidraw drawing template

**Excalidraw is optional. The new dropdown requires an enabled Excalidraw plugin version 2.29.1 or newer**, checked through its public automation API. The companion changes were merged in [Excalidraw PR #3029](https://github.com/zsviczian/obsidian-excalidraw-plugin/pull/3029); they are not supplied by this K-Plex branch. Older companion versions keep the existing drawing-creation behavior and do not show this dropdown.

When creating an Excalidraw drawing, **Drawing template** appears in the related-note composer, folder-child creation dialog and unresolved-node creation dialog. Options come from Excalidraw's configured template file or folder. **Blank drawing** explicitly creates without a template. Folder entries display relative paths so similarly named templates in different subfolders remain distinguishable.

The last selection is remembered after a drawing is successfully created and is shared across these dialogs and Obsidian restarts. Cancelling does not change it. With no previous selection, the first configured template is selected; a remembered template that no longer exists falls back to the first available template. An explicit Blank drawing selection remains blank.

Useful help example: configure two templates in Excalidraw, create a related drawing with one, then open the folder-child dialog to demonstrate the remembered selection. Capture only after acceptance with the actual 2.29.1+ companion; a 2.29.0 test build intentionally does not expose the control.

## Choose what happens after creating a file

The related-note composer and folder-child dialog use one remembered **After saving** list:

- **Return** — create the file and return without opening it for editing.
- **Create another** — create it, clear the name and keep the dialog open with the same origin and useful choices.
- **Follow node** — center the new node without opening an editor.
- **Edit in sidecar** — center the node and open its file in the adjacent Sidecar, respecting Sidecar placement and editor settings.
- **Edit in editor view** — center the node and open the K-Plex editor.
- **Edit in editor view maximized** — center the node and maximize the K-Plex editor.
- **Open in new tab** — open the file in the invoking K-Plex tab group.
- **Open in popout window** — open the file in a separate desktop window.

The placeholder's **Create** dialog uses the same control but omits **Create another** and **Follow node**. **Return** creates its actual file without editing it. **Edit in sidecar** is unavailable from K-Plex in a sidepanel; **Open in new tab** there uses the most recently used main workspace tab group. Popouts appear only on desktop. Non-file relationship targets do not offer editor destinations.

An explicit selection is remembered across these dialogs and restarts. Opening a dialog never saves its context fallback: a remembered Create another or Follow node appears as Return in the placeholder dialog; a remembered unsupported Sidecar/popout falls back to a new tab. The former enabled Open for editing preference migrates to Edit in sidecar; disabled migrates to Return. Existing explicit submit shortcuts remain invocation overrides and do not replace the preference.

### Changing a placeholder's folder

For a path-qualified placeholder such as `[[folder/folder/note title]]`, choosing a different creation folder explicitly retargets its Markdown references to the actual new file. K-Plex updates approved body links, embeds, Markdown links and property links, preserving aliases and heading/block suffixes. This does not depend on Obsidian's automatic rename setting: the old file never existed.

Ambiguous references or concurrent source changes stop the operation with recovery feedback. If a file was already created, retry continues that file and the accepted relocation plan; it does not create another copy or overwrite later edits to already completed source files.

### Reveal native folders

A real folder node's **Open** submenu now offers the same **Obsidian Files** and platform-specific **Finder / System Explorer** locations as file nodes. The Files core plugin must be enabled for its entry; the system destination is desktop-only. Synthetic folders do not acquire a native location. Renamed, deleted or replaced folder identities cannot inherit an already open menu's reveal action.

## Navigate with a trackpad

Enable **Settings → K-Plex → Plex behavior → Navigation & interaction → Trackpad navigation**. It is off by default.

With it enabled, ordinary scrolling pans the K-Plex canvas horizontally and vertically. Pinching, or scrolling with Ctrl/Cmd, zooms around the pointer. With it disabled, ordinary scrolling continues to zoom. Scrolling inside native editors and lists retains its normal behavior. This changes navigation only; it does not change graph relationships or indexing.

Useful help example: enable the setting, pan across a wide neighborhood with two-finger scrolling, then pinch to zoom.

## Evidence and remaining acceptance

See [the validation record](../validation/creation-navigation-2026-11-01.md) and its native receipts for exact revisions and artifact identities. Native macOS checks cover file menus, tab captions, separate destinations, wheel behavior and actual settings reload. Complete Excalidraw native acceptance now passes 357/357, including all 40 device profiles; fast checks pass 600/600. Positive template acceptance on an actual 2.29.1+ companion remains pending. Desktop emulation does not establish physical mobile input behavior. Do not describe the draft as a published release or imply every platform is accepted.

A startup navigation follow-up keeps an accepted placeholder visible while its
own preview becomes available and allows available history entries to recover a
loading canvas. It creates no placeholder note and adds no setting. See the
[implementation and validation record](../validation/placeholder-startup-navigation-2026-11-01.md).
