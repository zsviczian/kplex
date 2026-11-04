/** Common native modal surface and form primitives. Obsidian still owns focus, Escape,
 * placement and window lifetime; this adapter supplies shared structure and accessible
 * icon actions without changing feature validation or mutation ownership. */
import {Modal, Setting, getIcon, type App, type TextComponent, type TextAreaComponent, type ButtonComponent} from "obsidian";
import {fitMobileModalToViewport} from "../../ui/mobileModalViewport";

/** Every plugin modal opts into the same theme-aware typography, fields and spacing. */
export class KplexModal extends Modal {
  private releaseFormViewport: (() => void) | null = null;
  /** Native Modal creates these elements synchronously in its owning document. */
  constructor(app: App) {
    super(app);
    this.modalEl.addClass("kplex-modal");
    this.contentEl.addClass("kplex-form");
  }

  /** Native Modal owns placement/focus; every form shares the existing mobile keyboard fix.
   * Binding after native open captures the document that actually hosts this dialog. */
  open(): void {
    this.releaseFormViewport?.(); this.releaseFormViewport = null;
    super.open();
    if (this.modalEl.isConnected) this.releaseFormViewport = fitMobileModalToViewport(this.modalEl);
  }

  /** Subclasses keep their own onClose cleanup; native dismissal always releases viewport work. */
  close(): void {
    this.releaseFormViewport?.(); this.releaseFormViewport = null;
    super.close();
  }
}

/** Native authored text uses the same full-width field layout in every dialog/settings host. */
export class FormSetting extends Setting {
  /** Authored text occupies the complete row; compact choices retain native Settings behavior. */
  addText(callback: (control: TextComponent) => unknown): this {
    formField(this);
    return super.addText(callback);
  }

  /** Textareas always stack below their visible label and description. */
  addTextArea(callback: (control: TextAreaComponent) => unknown): this {
    formField(this);
    return super.addTextArea(callback);
  }
}

/** A labelled long-form value occupies its own full-width row, with the label above. */
export function formField(setting: Setting): Setting {
  setting.settingEl.addClass("kplex-form-field");
  return setting;
}

/** Finite choices use an intrinsic label and the remaining row width. Help spans the
 * following line, so it cannot squeeze the native dropdown or misalign its label. */
export function formSelect(setting: Setting): Setting {
  setting.settingEl.addClass("kplex-form-select-row");
  setting.settingEl.append(setting.descEl);
  return setting;
}

/** Align finite choices within native Setting rows; authored text keeps its stacked field.
 * Obsidian continues to own the control markup, skin and theme typography. */
export function formOptionGroup(container: HTMLElement): void {container.addClass("kplex-form-options");}

/** One shared footer aligns progress on the left and explicit actions on the right. */
export function formActions(container: HTMLElement): Setting {
  const row = new Setting(container);
  row.settingEl.addClass("kplex-form-actions");
  return row;
}

/** Native icon actions retain text for existing lifecycle guards and one Obsidian tooltip.
 * Never add a title or a second custom tooltip to the same control. */
export function labelIconButton(button: HTMLElement, label: string, icon: string): void {
  button.setText(label);
  button.addClass("kplex-icon-action");
  button.removeAttribute("title");
  button.setAttribute("aria-label", label);
  appendIcon(button, icon);
}

/** Obsidian owns the Lucide asset; DOM insertion adopts it into the control's native window. */
export function appendIcon(button: HTMLElement, icon: string): void {
  const glyph = getIcon(icon);
  if (glyph) {glyph.classList.add("kplex-lucide"); button.prepend(glyph);}
}

/** Chainable native button configuration uses the same glyph, label and tooltip owner. */
export function iconButton(button: ButtonComponent, label: string, icon: string): ButtonComponent {
  labelIconButton(button.buttonEl, label, icon);
  return button;
}
