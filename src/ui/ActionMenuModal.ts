/**
 * Native local command picker generated from the portable catalog. Launch captures
 * the owning surface and target before modal focus changes; execution revalidates through the same
 * manager as toolbar, menus and keys. This module owns only native modal presentation and teardown.
 */
import { FuzzySuggestModal, Notice, type FuzzyMatch } from "obsidian";
import type KplexPlugin from "../main";
import { ACTION_CATALOG, type ActionMetadata, type ActionRequest, type NodeRef, type TargetRequest } from "../core/plex/actions";
import type { ActionManager } from "../application/ActionManager";
import { formatActionBinding, translateActionText } from "./actionPresentation";
import { effectiveActionBindings } from "../core/plex/actionPreferences";
import { readObsidianPresentationEnvironment } from "../adapters/obsidian/presentationEnvironment";
import { renderActionSuggestion } from "./actionSuggestion";

/** Show finite, catalog-owned actions available to the captured surface with native fuzzy navigation. */
export class ActionMenuModal extends FuzzySuggestModal<ActionMetadata> {
  private retired = false;
  private chosen = false;

  /** Preserve the launching context and release its lease when the native palette closes. */
  constructor(private plugin: KplexPlugin, private manager: ActionManager, private surfaceId: string,
    private readCapturedTargets: () => { center: NodeRef | null; selected: { node: NodeRef; occurrenceId: string } | null }, private release: () => void = () => {}) {
    super(plugin.app);
    this.modalEl.addClass("kplex-action-menu");
    this.setPlaceholder(plugin.translator("actions.menuPlaceholder"));
    this.limit = ACTION_CATALOG.length;
  }

  /** Build requests with the captured explicit node only for target-bearing operations. */
  private request(item: ActionMetadata): ActionRequest {
    const { center, selected } = this.readCapturedTargets();
    const node = item.target === "center" ? center : item.target === "selected" ? selected?.node : selected?.node ?? center;
    const target: TargetRequest | undefined = item.target === "none" || item.target === "editor-field" ? undefined
      : node ? { kind: "explicit", node, ...(selected?.node === node ? { occurrenceId: selected.occurrenceId } : {}) }
      : { kind: item.target === "selected" ? "selected" : "center" };
    return { id: item.id, source: "local-menu", surfaceId: this.surfaceId, target };
  }

  /** Hide session/editor-only entries and retain every action with a live enabled/preparable route. */
  getItems(): ActionMetadata[] {
    return ACTION_CATALOG.filter(/** Availability checks are bounded and side-effect-free. */ item =>
      item.id !== "actions.open" && item.id !== "keyboard.help" && !item.id.startsWith("composer.") && !item.id.startsWith("ontology.assign.")
      && (item.target !== "selected" || Boolean(this.readCapturedTargets().selected))
      && (item.target !== "center" || Boolean(this.readCapturedTargets().center))
      && (item.target !== "selected-or-center" || Boolean(this.readCapturedTargets().selected ?? this.readCapturedTargets().center))
      && this.manager.check(this.request(item)).state !== "disabled");
  }

  /** Translate only registered action catalog keys; no user metadata becomes executable copy. */
  getItemText(item: ActionMetadata): string { return translateActionText(this.plugin.translator, item.labelKey); }

  /** Present native complex rows with descriptions and a separate effective-shortcut auxiliary column. */
  renderSuggestion(match: FuzzyMatch<ActionMetadata>, element: HTMLElement): void {
    const environment = readObsidianPresentationEnvironment(element.ownerDocument.defaultView ?? undefined);
    const chords = effectiveActionBindings(this.plugin.settings.actionPreferences, match.item.id)
      .map(/** The palette preserves keyboard-availability-aware hints from the shared environment formatter. */ binding =>
        environment.inputModes.keyboard === true ? formatActionBinding(binding, environment, this.plugin.translator, true) : null)
      .filter(/** Missing keyboard hints do not create empty chips. */ (chord): chord is string => chord !== null);
    renderActionSuggestion(element, this.getItemText(match.item), translateActionText(this.plugin.translator, match.item.descriptionKey), chords);
  }

  /** Prepare while captured targets remain live; native close must not erase the accepted request. */
  private prepareChoice(item: ActionMetadata): (() => void) | null {
    if (this.retired || this.chosen) return null;
    if (!this.getItems().some(candidate => candidate.id === item.id)) { new Notice(translateActionText(this.plugin.translator, "actions.target-unavailable")); return null; }
    const request = this.request(item);
    const prepared = this.manager.prepare(request);
    if (prepared.state !== "accepted") { new Notice(translateActionText(this.plugin.translator, prepared.reasonKey)); return null; }
    this.chosen = true;
    return /** Run the exact accepted request only after its originating picker lease is released. */ () => {
      void prepared.run().then(/** Rejected captured targets report once; thrown errors are manager-owned. */ outcome => {
        if (outcome.status === "unavailable") new Notice(translateActionText(this.plugin.translator, outcome.reasonKey));
      });
    };
  }

  /** Capture acceptance before the public native method closes, retaining native modifier bookkeeping. */
  selectSuggestion(match: FuzzyMatch<ActionMetadata>, event: MouseEvent | KeyboardEvent): void {
    const run = this.prepareChoice(match.item);
    if (!run) return;
    super.selectSuggestion(match, event);
    run();
  }

  /** Direct host/item callbacks follow the same captured request and release-before-dispatch policy. */
  onChooseItem(item: ActionMetadata): void {
    const run = this.prepareChoice(item);
    if (!run) return;
    this.close();
    run();
  }

  /** The native method calls this after close; an already claimed selection remains inert. */
  onChooseSuggestion(match: FuzzyMatch<ActionMetadata>): void { this.onChooseItem(match.item); }

  /** Release the captured launch and prevent closed or migrated UI from retaining the surface. */
  onClose(): void {
    if (this.retired) return;
    this.retired = true;
    this.release();
    this.release = () => {};
    this.readCapturedTargets = () => ({ center: null, selected: null });
  }
}
