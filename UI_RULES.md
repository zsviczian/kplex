# K-Plex UI rules

These rules are required for new and changed UI. Reusing an input without its field,
label, actions and layout is not component reuse. Read this file before UI work.

## Shared owners

| UI concern | Required owner |
| --- | --- |
| Native modal shell | `src/adapters/obsidian/KplexModal.ts` (`KplexModal`) |
| Native settings rows and authored fields | `FormSetting` in that adapter; use `formField` for an integrated custom field |
| Native footer / icon action | `formActions`, `iconButton`, `labelIconButton` in that adapter |
| React footer | `FormActions` in `src/ui/components/FormField.tsx` |
| Labelled React authored field | `src/ui/components/FormField.tsx` |
| Labelled React dropdown | `src/ui/components/FormSelect.tsx` |
| Completion / drawing template | `CreationCompletionSelect` / `DrawingTemplateSelect`, both using `FormSelect` |
| Relationship direction, ontology search, disclosure and edit | `src/ui/features/RelationshipFieldControl.tsx`; do not rebuild an import-only variant |
| Native/import ontology binding | `RelationshipSelectionControl`; connection properties and import use the same binding, with explicit vocabulary creation separate from applying a relationship |
| Native finite dropdown with explanatory text | `formSelect` in the modal adapter; help spans the line below, and the control uses the space after its label |
| Native group of finite choices | `formOptionGroup`; shared label/control columns, stacked authored fields and narrow-window wrapping |
| Parent-draft color source and paired preview | `StyleColorControls` using native `Setting` info/control nodes; keep swatches and the source action together in the control column |
| Folder paths | `FolderPathInput` |
| Tabs | `src/ui/components/Tabs.tsx` |
| Tooltip ownership | Native Obsidian for native actions; `TooltipButton` for controls leased to K-Plex tooltips |
| Numeric preferences | `numberSlider`, `styleNumberSlider`, `LayoutSlider` |

Feature code owns its values, validation, persistence and native lifetime. Shared
controls own presentation and interaction mechanics. Do not put plugin state or
Obsidian APIs in portable components.

## Native modal and mobile keyboard ownership

- Every centered form/dialog must extend `KplexModal`, which extends Obsidian's
  native `Modal`. React form content mounts inside that shell. Never implement a
  centered modal as a canvas overlay, portal, fixed-position panel or HTML dialog.
- Native suggestion-only dialogs may use Obsidian's `SuggestModal`; dropdown
  suggestions/popovers are not replacement modal shells.
- Preserve Obsidian's mobile modal sizing, focus handling, scroll container and
  on-screen keyboard accommodation. `KplexModal` leases the existing
  `mobileModalViewport` adapter for every form, sizing to VisualViewport when the
  keyboard changes the usable area. Do not set fixed layout-viewport heights, lock the
  modal scroll area, or pin action rows to the viewport. Fields and actions must
  remain reachable by scrolling when the keyboard reduces the visible area.
- The same shared field/footer controls apply on mobile, with wrapping and coarse
  pointer targets. Desktop narrow-window checks verify layout only. Keyboard
  appearance, focus visibility, edit-area scrolling and action reachability must
  also be checked on a physical phone/tablet before claiming mobile acceptance.

## Layout and typography

- Start from the actual equivalent Obsidian control and its DOM structure. Native
  forms use `Setting`/input/dropdown/button components; React controls retain the
  equivalent native semantic elements and classes. Inspect core Settings in the
  running host when uncertain. Theme variables alone do not justify a separately
  recreated control skin. Add only necessary K-Plex layout/state rules around that
  native structure and compare the result against Obsidian in both themes.

- Use Obsidian's base input, textarea, button and `.dropdown` styles, including its
  native caret, insets, shadows, typography and `--input-height`. Shared controls own
  layout, not a replacement skin. Do not override native `appearance`, background
  images, borders, padding or focus treatment to make a second dropdown design.
  Paired rows use identical label styling and identical control styling; native
  label and control sizes may differ just as they do in Obsidian Settings.
  Do not inherit note typography or introduce per-modal font families/sizes.
  A source/code editor may intentionally use Obsidian's monospace font; this is
  not a reason for its label, actions or neighboring controls to use code typography.
- Long input (note/folder/file names, paths, queries, ontology names) is full width,
  with its visible label above. Textareas are always full width, label above, and
  vertically resizable. Never squeeze authored text into half a Settings row.
- Compact options such as a toggle or finite dropdown may be inline in Settings.
  A form's dropdown rows share label/control widths, height and spacing. Drawing
  template and After saving must use the same labelled-select component.
- Use a consistent 8 px control gap and 16 px field/section gap through shared
  classes. Dividers belong between sections, not through a control or its focus ring.
  Do not use blank Settings rows as spacing.
- Footer: progress/status on the left, actions on the right, with padding above the
  divider. At narrow widths it wraps without clipping or horizontal scrolling.
  Use `formActions` explicitly. An unlabelled row with a secondary action is not
  automatically a footer and must not gain a section divider by inference.
- Compact row flex bases must not reach stacked fields: in a column, a flex basis
  becomes height. Integrated Settings must preserve intrinsic label/control height
  for `kplex-form-field`, with bounded label-to-input spacing in native review.
- Keep tabs at the top of their content and preserve drafts when switching. Never
  hide a required common option behind an extra configure dialog.

## Buttons, selectors and tooltips

- Prefer accessible Lucide icon buttons for actions, including create, edit, import,
  save and cancel. Use text for choices/tabs and when an icon would be ambiguous.
  Native icon actions use `labelIconButton`; do not call `setIcon` after setting text
  and assume the text remains visible.
- A remembered primary action uses Obsidian's `mod-cta`, including while disabled;
  the host owns its accent and disabled appearance. Its highlight must agree with
  the keyboard default and must not vanish just because a required field is empty.
- A button has exactly one tooltip owner and no HTML `title`. Native actions use an
  accessible name and Obsidian's tooltip. A K-Plex tooltip uses `TooltipButton` and
  `aria-labelledby`, avoiding Obsidian's separate `aria-label` tooltip path.
- Do not add a tooltip that repeats an already visible field label. Disabled actions
  retain an accessible explanation where needed.
  Preserve programmatic label association; removing an accessible name is not a
  solution to duplicate tooltips.
- Native selects use the same theme-aware appearance everywhere. Searchable text
  fields use the shared suggester and an explicit chevron disclosure for browsing.
  An ontology combobox uses the native `.dropdown` outer skin/caret and a transparent
  browse hit area; never put a second boxed arrow inside the field.
  Its nested editable input strips only its duplicate skin and makes room for the
  tag icon. The native outer control remains the owner of appearance and insets.
  A search icon means search; an ontology picker uses the tag icon and adjacent edit
  action. Do not substitute a generic magnifier-only input for ontology selection.
- Direction is an editable choice. A drag supplies the initial direction, not a lock.
  Import, create and link share the same ontology vocabulary, annotations and editor.
- A gate drag takes its initial relationship role from the source's rendered port.
  A destination gate chooses the target note and does not invert that role. Honor
  flipped Compass ports before applying a held modifier: Friend becomes Previous,
  Challenger becomes Next; Parent/Child retain their roles. Each role restores its
  own remembered ontology field. Use `gateRelationshipIntent` for this creation intent.
- Icon-only linking footers shrink to their rendered actions. Do not reserve space
  for absent creation buttons; Cancel and Link share dimensions, spacing and centered
  glyphs regardless of companion availability. Hidden text labels stay out of flex flow.
- Ontology selectors insert only the physical field name. Display descriptions below
  that name in smaller Obsidian text, both for suggestions and selected values; never
  concatenate descriptions into a native option. Connection details distinguishes
  adding another relationship property from creating an ontology definition.

## Settings

- Keep Obsidian's declarative settings hierarchy, native toggle/dropdown behavior and
  existing persistence configurators. Do not replace Settings with a parallel form.
- Labelled long text and textarea settings use the shared full-width field treatment.
  Managers/lists retain bounded search, scrolling and compact row actions.
- Integrated controls must scope their styles to their actual setting row and use
  the same control typography and dimensions as modal forms.

## Required review evidence

Inventory affected consumers before changing a shared primitive. Run interaction,
focus, keyboard, draft/Save/Cancel and tooltip-owner checks, not just snapshots.
Inspect actual native forms in light and dark themes, at a narrow width and in a
popout. Verify long translated labels and real template/ontology choices. Record
unavailable physical-mobile/macOS acceptance honestly. Add a regression gate for a
new shared rule; do not merely document a rule that no consumer uses.

Visual acceptance must explicitly check full-width names/textareas, matching
dropdown rows, readable glyphs, one tooltip per action, consistent footer spacing,
and no control intersecting a divider. Passing a functional test is not visual QA.
Compare native control skins with core Obsidian Settings, not a browser imitation.
Footer button groups use intrinsic height and center alignment; their cancel and
creation buttons must have equal top edges/heights, including on native input sizes.
