/**
 * Native consent shells for finite property cleanup, additive Hidden declarations and retained source
 * inspection. The plugin owns writes and source identity; these shells own localized choices and
 * one-shot confirm/cancel disposal. Hidden consent tracks the selected writable source and opposite
 * endpoint explicitly, disclosing directional visibility while preserving original links.
 * Physical-trash preferences never authorize arbitrary cleanup. Optional Hidden configuration
 * stays in a native disclosure. File deletion explains the captured automatic-cleanup preference;
 * its settings cross-link cancels old consent before navigating to the actual preference.
 */
import { Modal, Setting, type App, type TFile } from "obsidian";
import type { EvidenceSourceKind } from "../index/RelationEvidence";
import { createObsidianTranslator } from "../adapters/obsidian/localization";

/** A pre-trash property approval retains exact keys and bounded canonical payload, never graph policy. */
export type DeletePropertyChoice = "keep" | "remove" | "hide";
export type DeletePropertyPreview = { field: string; ontology: boolean; choice: DeletePropertyChoice; line: number; payload: string; after: unknown; supported: boolean };
export type DeleteSourcePreview = { file: TFile; path: string; properties: DeletePropertyPreview[]; hiddenPayload: string; bodyText: string; bodyStart: number; bodyReferences: RemainingNodeReference[]; targetSpellings: string[] };
export type DeleteNodePreview = { sources: DeleteSourcePreview[]; hiddenFields: string[]; hiddenField: string; removeOntologyLinksOnDelete?: boolean };

export type DeleteNodeConfirmationOptions = {
  nodeName: string;
  hasFile: boolean;
  firstUse: boolean;
  confirmFileDelete: boolean;
  onConfirm: (confirmFileDelete: boolean) => void | Promise<void>;
  onCancel?: () => void;
  preview?: DeleteNodePreview;
  onOpenCleanupSettings?: () => void;
  onOpenLocation?: (reference: RemainingNodeReference) => void | Promise<void>;
};

export class DeleteNodeConfirmationModal extends Modal {
  private decided = false;
  private readonly translate = createObsidianTranslator();
  /** Capture a finite transient plan; the plugin retains all mutation capabilities. */
  constructor(app: App, private readonly options: DeleteNodeConfirmationOptions) {
    super(app);
  }

  /** Explain the captured cleanup preference, offer its direct settings link, and keep per-property overrides in a native disclosure. */
  onOpen(): void {
    const { nodeName, hasFile, firstUse } = this.options;
    this.modalEl.addClass("kplex-delete-node-modal");
    this.titleEl.setText(this.translate(hasFile ? "delete.noteTitle" : "delete.placeholderTitle"));
    this.contentEl.createEl("p", {
      text: this.translate(hasFile ? "delete.cleanup.noteConfirm" : "delete.cleanup.placeholderConfirm", { name: nodeName }),
    });

    const preview = this.options.preview;
    if (hasFile) {
      this.contentEl.createEl("p", { text: this.translate(preview?.removeOntologyLinksOnDelete !== false ? "delete.cleanup.enabled" : "delete.cleanup.disabled") });
      if (this.options.onOpenCleanupSettings) {
        const link = this.contentEl.createEl("p").createEl("a", {
          text: this.translate("settings.deletion.removeOntologyLinks"),
          attr: { href: "#kplex-remove-ontology-links-on-delete" },
        });
        link.onClickEvent(/** Cancel this approval before changing the setting; later deletion recaptures policy and defaults. */ event => {
          event.preventDefault();
          if (this.decided) return;
          this.close();
          this.options.onOpenCleanupSettings?.();
        });
      }
    }
    if (preview && preview.sources.some(/** A property disclosure needs actual choices, not headings for body-only links. */ source => source.properties.length > 0)) {
      const review = this.contentEl.createEl("details");
      review.createEl("summary", { text: this.translate("delete.cleanup.reviewProperties") });
      const reviewContent = review.createDiv();
      reviewContent.createEl("p", { text: this.translate("delete.cleanup.choicesHelp") });
      reviewContent.createEl("p", { text: this.translate("delete.cleanup.coverage") });
      let hideOptions: HTMLDetailsElement | undefined;
      for (const source of preview.sources) {
        if (!source.properties.length) continue;
        reviewContent.createEl("h3", { text: source.path });
        for (const property of source.properties) {
          const row = new Setting(reviewContent).setName(property.field)
            .setDesc(this.translate(property.ontology ? "delete.cleanup.ontology" : "delete.cleanup.otherProperty"));
          row.settingEl.dataset.kplexDeleteSource = source.path;
          row.settingEl.dataset.kplexDeleteField = property.field;
          row.addDropdown(/** Choices apply only to this captured property, and broader changes need this confirmation. */ dropdown => {
            dropdown.selectEl.dataset.kplexDeleteChoice = "true";
            dropdown.addOption("keep", this.translate("delete.cleanup.keep"));
            if (property.supported) dropdown.addOption("remove", this.translate("delete.cleanup.remove"));
            if (preview.hiddenFields.length) dropdown.addOption("hide", this.translate("hide.choice"));
            dropdown.setValue(property.choice).onChange(/** Mutate only the transient displayed plan, never a note. */ value => {
              if (value === "keep" || value === "remove" || value === "hide") {
                property.choice = value;
                if (value === "hide" && hideOptions) hideOptions.open = true;
              }
            });
          });
          row.addButton(/** Native navigation retains the exact physical source coordinate. */ button => button.setButtonText(this.translate("common.open"))
            .onClick(/** Inspection does not approve any property mutation. */ () => { void this.options.onOpenLocation?.({path: source.path, line: property.line, label: property.field, sourceKind: "frontmatter-ontology", fieldName: property.field}); }));
          if (!property.supported) row.setDesc(this.translate("delete.cleanup.unsupported"));
        }
      }
      if (preview.hiddenFields.length) {
        hideOptions = reviewContent.createEl("details");
        hideOptions.createEl("summary", { text: this.translate("delete.cleanup.hideOptions") });
        hideOptions.open = preview.sources.some(/** Existing Hide choices must expose their destination property. */ source => source.properties.some(property => property.choice === "hide"));
        new Setting(hideOptions).setName(this.translate("hide.field"))
          .addDropdown(/** One explicit configured Hidden field is used for all selected source rows. */ dropdown => {
            dropdown.selectEl.dataset.kplexHiddenField = "true";
            for (const field of preview.hiddenFields) dropdown.addOption(field, field);
            dropdown.setValue(preview.hiddenField).onChange(/** This selection changes only the pending consent. */ value => { preview.hiddenField = value; });
          });
        hideOptions.createEl("p", { text: this.translate("hide.retainsSources") });
      }
    }

    let confirmFileDelete = this.options.confirmFileDelete;
    if (hasFile) {
      new Setting(this.contentEl)
        .setName(this.translate("delete.dontAskAgain"))
        .setDesc(this.translate("delete.cleanup.dontAskAgainHelp"))
        .addToggle(/** This toggle changes only future physical-trash confirmation. */ (toggle) => toggle
          .setValue(!confirmFileDelete)
          .onChange(/** Broader property consent remains explicit on later deletes. */ (dontAskAgain) => { confirmFileDelete = !dontAskAgain; }));
    } else if (firstUse) {
      new Setting(this.contentEl)
        .setName(this.translate("delete.alwaysConfirm"))
        .setDesc(this.translate("delete.alwaysConfirmHelp"))
        .addToggle(/** First-use explanation records only the existing physical confirmation preference. */ (toggle) => toggle
          .setValue(confirmFileDelete)
          .onChange(/** Native preference selection changes no property or file. */ (value) => { confirmFileDelete = value; }));
    }

    const actions = new Setting(this.contentEl);
    actions.addButton(/** Cancel never acquires native mutation authority. */ (button) => button
      .setButtonText(this.translate("common.cancel"))
      .onClick(/** Dismissal settles pending scope once. */ () => this.close()));
    actions.addButton(/** One primary button confirms the displayed finite scope and physical preference. */ (button) => { button.buttonEl.dataset.kplexDeleteConfirm = "true"; return button
      .setButtonText(this.translate(hasFile ? "delete.fileButton" : "delete.placeholderButton"))
      .setCta()
      .onClick(/** One explicit approval retires the shell before resuming native work. */ () => {
        if (this.decided) return;
        this.decided = true;
        this.close();
        void this.options.onConfirm(confirmFileDelete);
      }); });
  }

  /** Escape, cancellation and discarded controls cannot revive a settled approval. */
  onClose(): void {
    this.contentEl.empty();
    if (!this.decided) {this.decided = true;this.options.onCancel?.();}
  }
}

export type RemainingNodeReference = {
  path: string;
  line: number;
  label: string;
  fieldName?: string;
  sourceKind: EvidenceSourceKind;
};

export class RemainingNodeReferencesModal extends Modal {
  private readonly translate = createObsidianTranslator();
  /** Retain finite source locations and truthful per-file failure/pending summaries. */
  constructor(
    app: App,
    private readonly nodeName: string,
    private readonly references: readonly RemainingNodeReference[],
    private readonly onOpenLocation: (reference: RemainingNodeReference) => void | Promise<void>,
    private readonly issues: readonly string[] = [],
  ) {
    super(app);
  }

  /** Render surviving property/body locations and partial outcomes without offering automatic body edits. */
  onOpen(): void {
    this.modalEl.addClass("kplex-remaining-references-modal");
    this.titleEl.setText(this.translate("references.title"));
    this.contentEl.createEl("p", {
      text: this.translate("delete.cleanup.remainingHelp", { name: this.nodeName }),
    });

    this.contentEl.createEl("p", { text: this.translate("delete.cleanup.coverage") });
    for (const issue of this.issues) this.contentEl.createEl("p", { text: issue, cls: "mod-warning" });

    const grouped = new Map<string, RemainingNodeReference[]>();
    for (const reference of this.references) {
      const items = grouped.get(reference.path) ?? [];
      items.push(reference);
      grouped.set(reference.path, items);
    }

    for (const [path, items] of grouped) {
      this.contentEl.createEl("h3", { text: path });
      for (const reference of items) {
        const source = reference.fieldName ? this.translate("delete.cleanup.property", {field: reference.fieldName}) : ({
          "obsidian-link": this.translate("references.markdownLink"),
          "unresolved-link": this.translate("references.unresolvedMarkdownLink"),
          "inline-ontology": this.translate("references.inlineRelationship"),
          "body-url": this.translate("references.bodyUrl"),
          "property-url": this.translate("references.propertyUrl"),
        } as Partial<Record<EvidenceSourceKind, string>>)[reference.sourceKind] ?? this.translate("references.reference");
        const setting = new Setting(this.contentEl)
          .setName(reference.label || source)
          .setDesc(this.translate("references.sourceLine", { source, line: reference.line + 1 }));
        setting.addButton((button) => button
          .setButtonText(this.translate("common.open"))
          .onClick(() => { void this.onOpenLocation(reference); }));
      }
    }

    const actions = new Setting(this.contentEl);
    actions.addButton((button) => button
      .setButtonText(this.translate("common.done"))
      .setCta()
      .onClick(() => this.close()));
  }

  /** Release source navigation controls when the native inspection shell closes. */
  onClose(): void {
    this.contentEl.empty();
  }
}

/** Always-confirm directional Hidden declaration, naming one exact source, opposite endpoint and field. */
export class HideRelationshipModal extends Modal {
  private decided = false;
  /** Capture both exact endpoints independently of the writable source choices, without Vault capabilities. */
  constructor(app: App, private readonly sources: readonly string[], private readonly fields: readonly string[],
    private readonly endpoints: readonly [string,string], private readonly onDecision: (selection: {sourcePath: string; field: string} | null) => void) { super(app); }
  /** Update directional consent with the selected writable source; retired controls cannot revive approval. */
  onOpen(): void {
    const translate = createObsidianTranslator();
    this.modalEl.addClass("kplex-hide-relationship-modal");
    this.titleEl.setText(translate("hide.title"));
    const direction = this.contentEl.createEl("p");
    direction.dataset.kplexHideDirection = "true";
    direction.setAttribute("aria-live","polite");
    this.contentEl.createEl("p", {text: translate("hide.retainsSources")});
    let sourcePath = this.sources[0], field = this.fields[0];
    /** Describe the exact declaring note as the center affected by this one-note write. */
    const updateDirection = (): void => {
      if (this.decided || !this.endpoints.includes(sourcePath)) return;
      const targetPath = this.endpoints[0] === sourcePath ? this.endpoints[1] : this.endpoints[0];
      direction.dataset.kplexHideFrom = sourcePath;
      direction.dataset.kplexHideTo = targetPath;
      direction.setText(translate("hide.confirmPair", {source: sourcePath, target: targetPath}));
    };
    updateDirection();
    new Setting(this.contentEl).setName(translate("hide.source")).addDropdown(/** Select from the captured writable endpoints only. */ dropdown => {
      dropdown.selectEl.dataset.kplexHideSource = "true";
      for (const path of this.sources) dropdown.addOption(path,path);
      dropdown.setValue(sourcePath).onChange(/** Only live captured source choices update pending direction and write consent. */ value => {
        if (this.decided || !this.sources.includes(value) || !this.endpoints.includes(value)) return;
        sourcePath=value;updateDirection();
      });
    });
    new Setting(this.contentEl).setName(translate("hide.field")).addDropdown(/** No new ontology property is invented by this dialog. */ dropdown => {
      dropdown.selectEl.dataset.kplexHiddenField = "true";
      for (const key of this.fields) dropdown.addOption(key,key);
      dropdown.setValue(field).onChange(/** Retired controls and unconfigured keys cannot alter pending approval. */ value => {if(!this.decided && this.fields.includes(value))field=value;});
    });
    new Setting(this.contentEl).addButton(/** Native dismissal is cancellation. */ button => button.setButtonText(translate("common.cancel")).onClick(/** Close without write authority. */ () => this.close()))
      .addButton(/** Confirmation is explicit even when file deletion prompts were disabled. */ button => {
        button.buttonEl.dataset.kplexHideConfirm="true";
        button.setButtonText(translate("hide.title")).setCta().onClick(/** Duplicate activation settles only once. */ () => {
          if(this.decided || !this.sources.includes(sourcePath) || !this.endpoints.includes(sourcePath) || !this.fields.includes(field))return;
          this.decided=true;this.close();this.onDecision({sourcePath,field});
        });
      });
  }
  /** Escape, outside click and lifetime retirement release the pending choice exactly once. */
  onClose(): void {this.contentEl.empty();if(!this.decided){this.decided=true;this.onDecision(null);}}
}
