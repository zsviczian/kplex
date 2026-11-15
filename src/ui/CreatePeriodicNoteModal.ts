/** Missing periodic pin confirmation. Opening is a separate remembered preference, while the
 * captured period/path and native canvas lifetime authorize exactly one creation attempt.
 * Calendar selections may inject their explicit daily-date creator through the same confirmation. */
import {KplexModal as Modal, FormSetting, formActions, labelIconButton} from "../adapters/obsidian/KplexModal";
import {type ButtonComponent, type ToggleComponent, type WorkspaceLeaf} from "obsidian";
import {createElement} from "react";
import {createRoot, type Root} from "react-dom/client";
import type KplexPlugin from "../main";
import type {GraphPage} from "../types";

import {CreationCompletionSelect} from "./features/CreationCompletionSelect";

/** The native shell owns consent; the host owns journal lookup and the reviewed composer. */
export type DailyCreationGapOffer = Readonly<{
  load: (current: () => boolean) => Promise<Readonly<{label: string; current: () => boolean}> | null>;
  open: (page: GraphPage, current: () => boolean) => Promise<void>;
}>;

export class CreatePeriodicNoteModal extends Modal {
  private opened = false;
  private busy = false;
  private completing = false;
  private root: Root | null = null;
  private create: ButtonComponent | null = null;
  private feedback: HTMLElement | null = null;
  private releaseWindow: (() => void) | null = null;
  private releaseMigration: (() => void) | null = null;
  private gap: Awaited<ReturnType<DailyCreationGapOffer["load"]>> = null;
  private gapSelected = false;
  private gapLoading = false;
  private gapToggle: ToggleComponent | null = null;

  /** Keep the clicked symbolic pin and resolved path independent of later active files. */
  constructor(private readonly plugin: KplexPlugin, private readonly pinId: string, private readonly path: string,
    private readonly hostLeaf: WorkspaceLeaf, private readonly current: () => boolean, private readonly retired: () => void,
    private readonly createNote?: (current: () => boolean) => Promise<GraphPage | null>,
    private readonly gapOffer?: DailyCreationGapOffer) {super(plugin.app);}

  /** Reuse the shared completion selector with a preference independent from ordinary creation. */
  private renderControl(): void {
    const control = this.plugin.createdNoteCompletionControl(this.hostLeaf, {operation: "periodic", another: false, follow: false});
    this.root?.render(createElement(CreationCompletionSelect, {...control, translate: this.plugin.translator, disabled: this.busy,
      labelForChoice: /** Missing-note confirmation explains the no-opening choice directly. */ choice => choice === "return" ? this.plugin.translator("pins.dontOpen") : this.plugin.translator(`creation.afterSaving.${choice}`),
      onChange: /** Persist an offered destination only, without creating anything. */ value => {control.onChange(value); this.renderControl();}}));
    this.create?.setDisabled(this.busy || this.gapLoading || !this.current());
    this.gapToggle?.setDisabled(this.busy);
  }

  /** A pending native create never opens or navigates a retired canvas. */
  private async confirm(): Promise<void> {
    if (!this.opened || this.busy || this.gapLoading || !this.current()) return;
    this.busy = true; this.renderControl();
    const action = this.plugin.createdNoteCompletionControl(this.hostLeaf, {operation: "periodic", another: false, follow: false}).value;
    try {
      const current = /** A canceled prompt cannot authorize a later file write. */ (): boolean => this.opened && this.current();
      const page = await (this.createNote ? this.createNote(current) : this.plugin.createPeriodicPinNote(this.pinId, this.path, current));
      if (!page || !this.opened || !this.current()) return;
      this.completing = true; this.close();
      await this.plugin.finishNewRelatedNode(page, this.hostLeaf, "follow", /** A confirmed pin activation follows the new note even when no native editor is requested. */ () => this.completing && this.current());
      if (action !== "return") await this.plugin.finishNewRelatedNode(page, this.hostLeaf, action, /** Native opening retains the captured canvas after intentional close. */ () => this.completing && this.current());
      if (this.gapSelected && this.gap?.current() && this.completing && this.current()) await this.gapOffer?.open(page,
        /** Gap review survives intentional prompt close but never a retired canvas or changed day. */ () => this.current() && Boolean(this.gap?.current()));
    } catch (error) {if (this.opened && this.current()) this.feedback?.setText(error instanceof Error ? error.message : String(error));}
    finally {this.completing = false; this.busy = false; if (this.opened) this.renderControl();}
  }

  /** No note is created merely by clicking a missing pin. */
  onOpen(): void {
    this.opened = true; this.setTitle(this.plugin.translator("pins.createTitle"));
    this.contentEl.createEl("p", {text: this.plugin.translator("pins.createNotice", {path: this.path})});
    this.root = createRoot(this.contentEl.createDiv());
    const gapContainer = this.contentEl.createDiv();
    this.gapLoading = Boolean(this.gapOffer);
    if (this.gapOffer) void this.gapOffer.load(/** A canceled creation prompt never publishes a late offer. */ () => this.opened && !this.busy && this.current()).then(offer => {
      if (!offer || !this.opened || this.busy || !this.current() || !offer.current()) return;
      this.gap = offer;
      new FormSetting(gapContainer).setName(this.plugin.translator("daily.gapOffer", {name: offer.label})).setDesc(this.plugin.translator("daily.gapOfferHelp"))
        .addToggle(/** Consent is local to this creation, never a global auto-link preference. */ toggle => {this.gapToggle = toggle;toggle.setValue(false).onChange(value => {this.gapSelected = value;});});
    }).catch(/** Missing journal inventory leaves ordinary explicit creation available. */ () => {}).finally(/** Creation waits until its optional offer has been resolved. */ () => {
      this.gapLoading = false;if (this.opened) this.renderControl();
    });
    const actions = formActions(this.contentEl);
    this.feedback = actions.infoEl.createDiv({cls: "kplex-form-status", attr: {role: "status"}});
    actions
      .addButton(/** Cancel preserves the missing destination. */ button => {labelIconButton(button.buttonEl, this.plugin.translator("common.cancel"), "x"); button.onClick(/** Retire this prompt without changing pin settings. */ () => this.close());})
      .addButton(/** Creation is explicit and duplicate submissions are serialized. */ button => {this.create = button; labelIconButton(button.buttonEl, this.plugin.translator("pins.createAction"), "file-plus"); button.setCta().onClick(/** Submit the currently displayed period/path. */ () => {void this.confirm();});});
    this.releaseMigration = this.hostLeaf.view.containerEl.onWindowMigrated?.(/** A migrated canvas cannot retain this creation approval. */ () => this.close()) ?? null;
    const owner = this.contentEl.ownerDocument.defaultView, close = /** Realm teardown cancels unaccepted periodic creation. */ (): void => this.close();
    owner?.addEventListener("pagehide", close, {once: true}); this.releaseWindow = /** Release this prompt's native subscription. */ () => owner?.removeEventListener("pagehide", close);
    this.renderControl();
  }

  /** Native close retires controls; a deliberately started completion owns its remaining lifetime. */
  onClose(): void {this.opened = false; this.releaseWindow?.(); this.releaseWindow = null; this.releaseMigration?.(); this.releaseMigration = null; this.root?.unmount(); this.root = null; this.contentEl.empty(); this.retired();}
}
