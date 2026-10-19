/**
 * Native textarea binding for ontology drafts. Reuses Obsidian's Setting/TextArea/Button controls;
 * a tab-owned model survives page replacement, while every row's DOM/window listeners retire.
 * The narrow ports keep settings storage and semantic interpretation with their existing owners.
 */
import {type ButtonComponent, type Setting} from "obsidian";
import {TextSettingDraft} from "./components/textSettingDraft";
import type {Translator} from "../lang";

let nextRowId = 0;

/** One field model shared by its native page/search rows, never a second settings writer. */
export class OntologyFieldControl {
  private readonly releases = new Set<() => void>();

  /** The containing Settings tab retains the model until plugin teardown, including failed drafts. */
  constructor(readonly draft: TextSettingDraft, private readonly translate: Translator, private readonly captureOwner: () => () => boolean) {}

  /** Mount a native field without initial writes; row replacement cannot redirect an old callback. */
  mount(setting: Setting, rows: number): () => void {
    this.draft.refresh();
    const owner = this.captureOwner();
    let live = true, retry: ButtonComponent | undefined, discard: ButtonComponent | undefined;
    let releaseRow = /** No resources exist until the native component callback mounts. */ (): void => {};
    const feedback = setting.descEl.createDiv({attr: {role: "status", "aria-live": "polite"}});
    setting.addTextArea(/** Initial native value is installed before registering actual user changes. */ text => {
      text.inputEl.rows = rows; text.setValue(this.draft.state().value);
      const input = text.inputEl;
      // Rendered definitions already supply localized native name/description nodes. Link them
      // directly rather than duplicating copy or losing the declarative control's accessible name.
      const rowId = ++nextRowId;
      setting.nameEl.id ||= `kplex-ontology-name-${rowId}`; setting.descEl.id ||= `kplex-ontology-description-${rowId}`;
      input.setAttribute("aria-labelledby", setting.nameEl.id); input.setAttribute("aria-describedby", setting.descEl.id);
      /** Detached native handlers cannot edit a replacement row or a remotely superseded owner. */
      const editable = (): boolean => live && input.isConnected && owner();
      text.onChange(/** Keep native text/caret local; the bounded model owns later submission. */ value => {if (editable()) this.draft.input(value);});
      /** Render recovery actions only when needed, using the same native buttons as other Settings. */
      const refresh = (): void => {
        if (!live) return;
        const state = this.draft.state();
        if (input.value !== state.value) text.setValue(state.value);
        input.readOnly = state.error === "conflict";
        input.setAttribute("aria-busy", String(state.busy));
        if (state.error) input.setAttribute("aria-invalid", "true"); else input.removeAttribute("aria-invalid");
        feedback.setText(state.error === "conflict" ? this.translate("settings.ontology.conflict") : state.error === "storage" ? this.translate("settings.ontology.saveFailed") : "");
        if (state.error && !discard) setting.addButton(/** Explicit discard refreshes the draft from the current accepted field. */ button => {
          discard = button; button.setButtonText(this.translate("settings.ontology.discard")).onClick(/** A submitted write must settle before its draft can be discarded. */ () => {if (live) this.draft.discard();});
        });
        if (state.error === "storage" && !retry) setting.addButton(/** Retry is a user action, never a repeated timer after storage failure. */ button => {
          retry = button; button.setButtonText(this.translate("settings.ontology.retry")).onClick(/** Reapply only this field through the same original currentness checks. */ () => {if (live) this.draft.retry();});
        });
        if (state.error !== "storage") {retry?.buttonEl.remove(); retry = undefined;}
        if (!state.error) {discard?.buttonEl.remove(); discard = undefined;}
        discard?.setDisabled(state.busy); retry?.setDisabled(state.busy);
      };
      const unsubscribe = this.draft.subscribe(refresh);
      /** Native composition cannot publish transient preedit or overwrite its current selection. */
      const start = (): void => {if (editable()) this.draft.compositionStart();};
      /** Final composition text becomes eligible for idle/explicit exit submission. */
      const end = (): void => {if (editable()) this.draft.compositionEnd(input.value);};
      /** Blur flushes a confirmed draft; composition waits for its final event or row teardown. */
      const blur = (): void => {if (live) void this.draft.flush();};
      input.addEventListener("compositionstart", start); input.addEventListener("compositionend", end); input.addEventListener("blur", blur);
      let boundWindow: Window | null = null;
      /** Rebind only to the row's real document after native Settings adopts it into a popout. */
      const follow = (): void => {
        boundWindow?.removeEventListener("pagehide", closed);
        boundWindow = input.ownerDocument.defaultView; boundWindow?.addEventListener("pagehide", closed);
      };
      /** Destruction flushes confirmed text; an old window closing after adoption does not retire it. */
      const closed = (): void => {if (input.ownerDocument.defaultView !== boundWindow) follow(); else release();};
      const migrated = setting.settingEl.onWindowMigrated?.(/** Same-document notifications preserve the draft/caret. */ () => {if (live && input.ownerDocument.defaultView !== boundWindow) follow();});
      /** Render cleanup is idempotent and cannot cancel an operation already accepted by storage. */
      const release = (): void => {
        if (!live) return; live = false; unsubscribe(); migrated?.(); boundWindow?.removeEventListener("pagehide", closed);
        input.removeEventListener("compositionstart", start); input.removeEventListener("compositionend", end); input.removeEventListener("blur", blur);
        this.releases.delete(release); this.draft.leave();
      };
      releaseRow = release; this.releases.add(release); follow(); refresh();
    });
    return /** Retire this exact native row rather than whichever sibling mounted most recently. */ () => {releaseRow();};
  }

  /** Tab hide flushes confirmed work without throwing away a recoverable failed draft. */
  flush(): void {this.draft.leave();}

  /** Plugin teardown stops unsubmitted work before retiring row callbacks and their native windows. */
  dispose(): void {this.draft.dispose(); for (const release of [...this.releases]) release(); this.releases.clear();}
}
