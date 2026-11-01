# Creation and navigation: help-authoring reference

This is the proposed behavior on `codex/kplex-creation-navigation`, addressing [#217](https://github.com/zsviczian/kplex/issues/217), [#208](https://github.com/zsviczian/kplex/issues/208) and [#224](https://github.com/zsviczian/kplex/issues/224). It is an unreleased draft. This reference supports a separate agent working in K-Plex Help; it does not change that repository. Follow its current instructions and the [authoring guide](README.md) when organizing help pages.

## Open files in K-Plex

Right-click an existing file in Obsidian's file explorer, its tab, or a resolved file link. The **K-Plex** submenu offers these destinations:

| Destination | Desktop | Tablet | Phone |
| --- | --- | --- | --- |
| Open | Yes | Yes | No |
| Open in new tab | Yes | Yes | No |
| Open to the right | Yes | Yes | No |
| Open in side panel | Yes | Yes | Yes |
| Open in new window | Yes | No | No |

The requested file becomes the center of that K-Plex view. This applies to existing files, including attachments and drawings; folders and unresolved links do not acquire this submenu. Ordinary K-Plex tabs show the centered file's basename alongside the K-Plex brain-circuit icon. Independent tabs, splits and windows retain their own centers.

Useful help example: open a note's link in a second K-Plex tab while retaining the original view. Capture the actual submenu and resulting tab caption on an accepted build.

## Choose an Excalidraw drawing template

**Excalidraw is optional. The new dropdown requires an enabled Excalidraw plugin version 2.29.1 or newer**, checked through its public automation API. The required companion changes are currently local in `obsidian-excalidraw-plugin` on `codex/kplex-integration-followup`; they are not supplied by this K-Plex branch. Older companion versions keep the existing drawing-creation behavior and do not show this dropdown.

When creating an Excalidraw drawing, **Drawing template** appears in the related-note composer, folder-child creation dialog and unresolved-node creation dialog. Options come from Excalidraw's configured template file or folder. **Blank drawing** explicitly creates without a template. Folder entries display relative paths so similarly named templates in different subfolders remain distinguishable.

The last selection is remembered after a drawing is successfully created and is shared across these dialogs and Obsidian restarts. Cancelling does not change it. With no previous selection, the first configured template is selected; a remembered template that no longer exists falls back to the first available template. An explicit Blank drawing selection remains blank.

Useful help example: configure two templates in Excalidraw, create a related drawing with one, then open the folder-child dialog to demonstrate the remembered selection. Capture only after acceptance with the actual 2.29.1+ companion; a 2.29.0 test build intentionally does not expose the control.

## Navigate with a trackpad

Enable **Settings → K-Plex → Plex behavior → Navigation & interaction → Trackpad navigation**. It is off by default.

With it enabled, ordinary scrolling pans the K-Plex canvas horizontally and vertically. Pinching, or scrolling with Ctrl/Cmd, zooms around the pointer. With it disabled, ordinary scrolling continues to zoom. Scrolling inside native editors and lists retains its normal behavior. This changes navigation only; it does not change graph relationships or indexing.

Useful help example: enable the setting, pan across a wide neighborhood with two-finger scrolling, then pinch to zoom.

## Evidence and remaining acceptance

See [the validation record](../validation/creation-navigation-2026-11-01.md) and its native receipts for exact revisions and artifact identities. Native macOS checks cover file menus, tab captions, separate destinations, wheel behavior and actual settings reload. Positive template acceptance on the required companion and the remaining device matrix are pending. Desktop emulation does not establish physical mobile input behavior. Do not describe the draft as a published release or imply every platform is accepted.
