/**
 * Native, bounded shortcut recording dialog. Obsidian owns its modal scope; this shell captures one
 * logical/physical chord without executing actions and releases exact handlers on close/migration.
 * Search consumers may inspect detached logical and physical chord facts from that same key press;
 * Physical matching is the initial mode; editing consumers persist only the explicitly selected mode.
 * Only explicitly modified physical dead keys can be captured. No event is retained.
 */
import { ButtonComponent, Modal, Setting, type Scope } from "obsidian";
import type KplexPlugin from "../main";
import { captureActionBinding, isModifiedPhysicalDeadKey, type LocalBinding } from "../core/plex/actionPreferences";
import { readObsidianPresentationEnvironment } from "../adapters/obsidian/presentationEnvironment";

// Distinct mounted dialogs can coexist in one document without sharing accessible descriptions.
let recordingRegionId = 0;

/** Capture one chord with explicit key semantics, using Escape as cancellation unless chosen by button. */
export class ShortcutRecorder extends Modal {
  private match: "key" | "code" = "code";
  private opened = false;
  private recording = false;
  private captureArea: HTMLElement | null = null;
  private accepted = new WeakSet<KeyboardEvent>();
  private release: (() => void) | null = null;
  private nativeHandler: ReturnType<Scope["register"]> | null = null;

  /** Return the selected mode for saving and optional detached chord alternatives for hotkey search. */
  constructor(private plugin: KplexPlugin, private choose: (binding: LocalBinding, captured?: readonly LocalBinding[]) => void) { super(plugin.app); }

  /** Ignore modifier-only/IME input; qualified physical accent chords preserve the selected mode. */
  private record(event: KeyboardEvent): false | undefined {
    if (!this.opened || !this.recording) return undefined;
    const facts = { key: event.key, code: event.code, ctrlKey: event.ctrlKey, metaKey: event.metaKey,
      altKey: event.altKey, shiftKey: event.shiftKey, isComposing: event.isComposing, altGraph: event.getModifierState("AltGraph") };
    if (facts.isComposing || facts.altGraph || event.key === "Process" || event.key === "Unidentified"
      || event.key === "Dead" && !(this.match === "code" && isModifiedPhysicalDeadKey(facts))) return undefined;
    // Native modifier keydowns are intermediate chord state, never a completed recording.
    if (["Shift", "Control", "Alt", "Meta", "AltGraph"].includes(event.key)
      || /^(Shift|Control|Alt|Meta)(Left|Right)$/.test(event.code)) return undefined;
    if (event.key === "Tab") { this.recording = false; return undefined; }
    event.preventDefault(); event.stopPropagation();
    if (this.accepted.has(event) || event.repeat) return false;
    this.accepted.add(event);
    if (event.key === "Escape") { this.close(); return false; }
    const environment = readObsidianPresentationEnvironment(this.modalEl.ownerDocument.defaultView ?? undefined);
    const binding = captureActionBinding(facts, environment.keyConvention, this.match);
    if (binding) {
      const captured = [captureActionBinding(facts, environment.keyConvention, "key"), captureActionBinding(facts, environment.keyConvention, "code")]
        .filter(/** Only validated persisted-value shapes leave the recorder; callbacks receive no live event. */ (candidate): candidate is LocalBinding => candidate !== null);
      this.choose(binding, captured); this.close();
    }
    return false;
  }

  /** Escape closes recording rather than becoming an accidental saved shortcut. */
  override onEscapeKey(event: KeyboardEvent): void { if (!event.isComposing) { event.preventDefault(); this.close(); } }

  /** Schedule focus in the original owned document; a closed/replaced/migrated region stays inert. */
  private focusCaptureArea(): void {
    const area = this.captureArea, document = area?.ownerDocument;
    document?.defaultView?.queueMicrotask(/** Resume only this mounted invocation, without moving focus across documents. */ () => {
      if (!this.opened || !area || this.captureArea !== area || area.ownerDocument !== document
        || this.contentEl.ownerDocument !== document || !area.isConnected || !this.contentEl.contains(area)) return;
      area.focus({ preventScroll: true });
      this.recording = document.activeElement === area;
    });
  }

  /** Native settings explain matching semantics; the owned capture region and footer release all listeners. */
  onOpen(): void {
    this.opened = true;
    this.modalEl.addClass("kplex-shortcut-recorder");
    this.setTitle(this.plugin.translator("actions.recordTitle"));
    this.contentEl.createEl("p", { cls: "kplex-shortcut-recording-description", text: this.plugin.translator("actions.recordHelp") });
    const mode = new Setting(this.contentEl).setClass("kplex-shortcut-matching").setName(this.plugin.translator("actions.keyMode"));
    const describeMode = /** Explain the selected matching behavior, including accent-producing logical keys. */ (): void => {
      mode.setDesc(this.plugin.translator(this.match === "code" ? "actions.physicalKeyHelp" : "actions.logicalKeyHelp"));
    };
    const recordArea = this.contentEl.createDiv({ cls: "kplex-shortcut-recording-area", attr: { tabindex: "0", role: "group", "aria-label": this.plugin.translator("hotkeys.pressKeys") } });
    recordArea.createSpan({ text: this.plugin.translator("hotkeys.pressKeys") });
    const hint = recordArea.createSpan({ cls: "kplex-shortcut-recording-hint", text: this.plugin.translator("actions.recordCaptureHelp") });
    hint.id = `kplex-shortcut-recording-hint-${++recordingRegionId}`;
    recordArea.setAttr("aria-describedby", hint.id);
    this.captureArea = recordArea;
    let releaseMode: (() => void) | null = null;
    mode.addDropdown(/** Public native selection changes matching mode and immediately resumes the owned recording area. */ dropdown => {
      dropdown.addOption("key", this.plugin.translator("actions.logicalKey")).addOption("code", this.plugin.translator("actions.physicalKey")).setValue(this.match);
      dropdown.selectEl.setAttr("aria-label", this.plugin.translator("actions.keyMode"));
      const change = /** A finite explicit mode selection cannot save a shortcut or retain focus on the dropdown. */ (): void => {
        if (!this.opened || this.captureArea !== recordArea) return;
        this.match = dropdown.getValue() === "code" ? "code" : "key";
        describeMode(); this.focusCaptureArea();
      };
      dropdown.selectEl.addEventListener("change", change);
      releaseMode = /** Remove the exact native dropdown listener, including after modal close. */ () => dropdown.selectEl.removeEventListener("change", change);
    });
    describeMode();
    const keydown = /** A concrete modal region covers native Scope delivery gaps without global capture. */ (event: KeyboardEvent): void => { this.record(event); };
    const blur = /** Native Tab traversal leaves capture mode so dialog controls keep their normal keys. */ (): void => { this.recording = false; };
    const focus = /** Deliberately refocusing the capture region resumes recording. */ (): void => { this.recording = true; };
    recordArea.addEventListener("keydown", keydown); recordArea.addEventListener("blur", blur); recordArea.addEventListener("focus", focus);
    this.nativeHandler = this.scope.register(null, null, /** The native recording scope consumes input only in its focused region. */ event => {
      if (this.contentEl.ownerDocument.activeElement !== recordArea) return undefined;
      return this.record(event);
    });
    const footer = this.contentEl.createDiv({ cls: "modal-button-container" });
    const escape = new ButtonComponent(footer).setButtonText(this.plugin.translator("actions.useEscape")).buttonEl;
    const cancel = new ButtonComponent(footer).setButtonText(this.plugin.translator("common.cancel")).buttonEl;
    const chooseEscape = /** Explicit Escape selection bypasses the recorder cancellation protocol. */ (): void => {
      if (!this.opened) return;
      this.choose({ match: this.match, value: "Escape", modifiers: [] }); this.close();
    };
    const dismiss = /** Cancellation returns no binding to the parent draft. */ (): void => { if (this.opened) this.close(); };
    escape.addEventListener("click", chooseEscape); cancel.addEventListener("click", dismiss);
    this.release = /** Release only resources installed for this exact recorder invocation. */ () => {
      releaseMode?.(); recordArea.removeEventListener("keydown", keydown);
      recordArea.removeEventListener("blur", blur); recordArea.removeEventListener("focus", focus);
      escape.removeEventListener("click", chooseEscape); cancel.removeEventListener("click", dismiss);
    };
    this.focusCaptureArea();
  }

  /** Close/migration invalidates input and removes every shell-owned DOM listener. */
  onClose(): void { this.opened = false; this.recording = false; this.captureArea = null;
    if (this.nativeHandler) this.scope.unregister(this.nativeHandler); this.nativeHandler = null;
    this.release?.(); this.release = null; this.contentEl.empty(); }
}
