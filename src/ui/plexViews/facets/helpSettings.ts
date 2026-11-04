/** Native Markdown source/preview inside one detached preset draft. The shared native help
 * owner handles rendering; the existing editor retains validation, Save/Cancel and stale guards. */
import {FormSetting as Setting} from "../../../adapters/obsidian/KplexModal";
import {getLanguage, type App} from "obsidian";
import type {FacetPreset} from "../../../core/plex/views/facets/contracts";
import {MARKDOWN_HELP_LIMIT, validMarkdownHelp} from "../../../core/contracts/markdownHelp";
import {NativeMarkdownHelp} from "../../NativeMarkdownHelp";
import {effectiveFacetHelp} from "./help";
import type {Translator} from "../../../lang";

/** Opening/default resolution never materializes a saved override. Only typing changes literal
 * source; Preview never saves. The returned disposer fences pending renders before form removal. */
export function renderPresetHelpSettings(app: App, body: HTMLElement, id: string, read: () => FacetPreset,
  change: (preset: FacetPreset, structural: boolean) => void, current: () => boolean, t: Translator, open = false): () => void {
  let alive = true, renderer: NativeMarkdownHelp | null = null;
  const section = body.createEl("details", {cls: "kplex-facet-help-settings kplex-form-disclosure", ...(open ? {attr: {open: ""}} : {})});section.createEl("summary", {text: t("facets.help")});
  const source = new Setting(section).setName(t("facets.help")).setDesc(t("facets.helpHint")).addTextArea(/** Native source occupies its own full-width row below the description. */ input => {
    input.inputEl.maxLength = MARKDOWN_HELP_LIMIT;input.inputEl.rows = 12;
    input.setValue(read().helpMarkdown ?? effectiveFacetHelp(id, read(), t)).onChange(/** Explicit blank source remains blank across locale changes. */ helpMarkdown => {
      if (alive && current()) change({...read(), helpMarkdown, helpSourceLocale: getLanguage() || "en"}, false);
    });
  });
  source.settingEl.addClass("kplex-facet-help-source");
  const preview = section.createDiv({cls: "kplex-preset-help-preview"});
  new Setting(section).addButton(/** The same bounded native renderer serves Info and unsaved preview. */ button => button.setButtonText(t("facets.previewHelp"))
    .onClick(/** Preview reads only the detached draft and cannot acquire note data. */ () => {
      if (!alive || !current()) return;
      renderer?.dispose();renderer = new NativeMarkdownHelp(app, preview);
      const source = read().helpMarkdown ?? effectiveFacetHelp(id, read(), t);
      if (!validMarkdownHelp(source)) {preview.setText(t("view.invalidHelp"));return;}
      if (!source.trim()) {preview.setText(t("view.emptyHelp"));return;}
      void renderer.render(source, /** A retired or superseded editor cannot attach a late result. */ () => alive && current()).catch(/** Invalid source keeps the editable draft and actionable feedback. */ error => {
        console.error("K-Plex preset help preview was not rendered", error);if (alive && current()) preview.setText(t("view.invalidHelp"));
      });
    }))
    .addButton(/** Reset is deliberate and remains an unsaved local edit until the parent Save. */ button => button.setButtonText(t("facets.resetHelp"))
      .onClick(/** Remove only this literal help override, preserving every sibling setting. */ () => {
        if (!alive || !current()) return;const preset = {...read()};delete preset.helpMarkdown;delete preset.helpSourceLocale;change(preset, true);
      }));
  return /** Native editor render/close immediately unloads its previous preview component. */ () => {if (!alive) return;alive = false;renderer?.dispose();renderer = null;};
}
