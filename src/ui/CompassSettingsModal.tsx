/**
 * Native off-by-default Compass editor. A detached draft reuses the source chooser, paired usage
 * preview, layout rail and disk-before-publication shell. No graph, note, scheduler or mode owner.
 */
import {Setting, type App} from "obsidian";
import {createRoot, type Root} from "react-dom/client";
import {StyleEditorModal, type StyleCommitResult} from "./StyleEditorModal";
import {StyleColorControls, type StyleColorContext} from "./StyleColorControls";
import {ColorPreview} from "./ColorPreview";
import {LayoutSlider} from "./components/LayoutSlider";
import {ObsidianIcon} from "./ObsidianIcon";
import {compassIntensity, COMPASS_DIRECTIONS, COMPASS_COLOR_VARIABLES, type ColorPreferencesV1} from "../core/plex/colorPreferences";

/** One native modal owns local controls, child dialogs, previews and the small rail root. */
export class CompassSettingsModal extends StyleEditorModal {
  private readonly initial: ColorPreferencesV1["compass"];
  private readonly draft: ColorPreferencesV1["compass"];
  private controls: StyleColorControls | null = null;
  private preview: ColorPreview | null = null;
  private rail: Root | null = null;
  private releaseCss: (() => void) | null = null;
  private releaseColors: (() => void) | null = null;

  /** Capture only Compass fields; the caller merges their explicit deltas into the latest queued preferences. */
  constructor(app: App, private readonly context: StyleColorContext,
    private readonly save: (initial: ColorPreferencesV1["compass"], edited: ColorPreferencesV1["compass"], current: () => boolean) => Promise<StyleCommitResult>,
    private readonly closed: () => void) {
    super(app); this.initial = structuredClone(context.preferences().compass); this.draft = structuredClone(this.initial);
  }

  /** Render native settings and two actual compositing examples; typing never writes storage. */
  onOpen(): void {
    this.beginEditor(this.context.sourceScope, this.context.bindEditor); this.modalEl.addClass("kplex-color-modal"); this.modalEl.addClass("kplex-compass-modal");
    const t = this.context.translate; this.titleEl.setText(t("compass.title"));
    const {body, actions} = this.scrollableContent(); body.addClass("kplex-compass-body"); actions.addClass("kplex-compass-actions");
    const context: StyleColorContext = {...this.context, preferences: /** Read current palette/semantics while retaining only the detached Compass draft. */ () => ({...this.context.preferences(), compass: this.draft})};
    body.createDiv({text: t("compass.help"), cls: "setting-item-description"});
    new Setting(body).setName(t("compass.enabled")).addToggle(/** The native toggle controls local preview only. */ toggle => toggle.setValue(this.draft.enabled).onChange(/** Retain the draft until the containing explicit Save. */ value => {
      if (!this.canEdit()) return; this.draft.enabled = value; this.preview?.refreshSources();
    }));
    const rail = body.createDiv({cls: "kplex-compass-intensity"}); this.rail = createRoot(rail);
    this.renderRail();
    new Setting(body).setDesc(t("compass.inheritHelp")).addButton(/** Reset removes the override rather than persisting a sampled percentage. */ button => button.setButtonText(t("compass.resetIntensity")).onClick(/** Reset is local and preserves independently configured fills. */ () => {
      if (!this.canEdit()) return; delete this.draft.intensity; this.renderRail(); this.preview?.refreshSources();
    }));
    this.controls = new StyleColorControls(this.app, context, /** Pending submission and retirement fence child edits. */ () => this.canEdit());
    for (const direction of COMPASS_DIRECTIONS) this.controls.add(body, t(`compass.${direction}`), {kind: "compass", direction},
      /** Return this direction?s saved identity without resolving RGB. */ () => this.draft.fills[direction], /** Update just one detached fill; Default retains absence. */ value => {if (value === undefined) delete this.draft.fills[direction]; else this.draft.fills[direction] = value; this.preview?.refreshSources();},
      /** Default inherits the direction token before its semantic fallback. */ () => ({kind: "theme", variable: COMPASS_COLOR_VARIABLES[direction]}));
    this.preview = new ColorPreview(body, {...context, target: {kind: "compass"}}, undefined);
    this.releaseCss = context.subscribeCss?.(/** CSS changes retire only this editor?s isolated sample. */ () => this.preview?.invalidate()) ?? null;
    this.releaseColors = context.subscribeColors?.(/** Current named/semantic changes repaint without replacing local edits. */ () => this.preview?.refreshSources()) ?? null;
    new Setting(actions).addButton(/** Cancel leaves persistence untouched. */ button => button.setButtonText(t("common.cancel")).onClick(/** The base shell excludes cancellation during a submitted write. */ () => this.close()))
      .addButton(/** One explicit Save submits an immutable local snapshot. */ button => button.setButtonText(t("common.save")).setCta().onClick(/** Unchanged Save closes without storage or presentation work. */ () => {
        if (JSON.stringify(this.initial) === JSON.stringify(this.draft)) {this.close(); return;}
        const edited = structuredClone(this.draft); this.runOperation(/** The caller owns latest-state merging and durable publication. */ current => this.save(this.initial, edited, current));
      }));
  }

  /** Reuse the established accessible rail; inherited intensity is labelled rather than manufactured as an override. */
  private renderRail(): void {
    const t = this.context.translate;
    const inherited = this.draft.intensity === undefined;
    const scope = this.context.sourceScope, mode = scope.ownerDocument.body.classList.contains("theme-light") ? "light" : "dark";
    const value = Math.round(compassIntensity({...this.context.preferences(), compass: this.draft}, mode,
      scope.ownerDocument.defaultView?.getComputedStyle(scope).getPropertyValue("--kplex-compass-opacity")) * 100);
    this.rail?.render(<LayoutSlider label={t("compass.intensity")} caption={t("compass.intensity")} hint={t("compass.inheritHelp")}
      icon={<ObsidianIcon name="blend" />} value={value} displayValue={inherited ? t("compass.inheritedIntensity", {value}) : `${value}%`} min={0} max={15} step={1}
      onChange={/** Retain explicit zero; render and preview only this detached draft. */ value => {
        if (!this.canEdit()) return; this.draft.intensity = value; this.renderRail(); this.preview?.refreshSources();
      }} />);
  }

  /** Retire every child/resource before releasing native content, including owner-window migration. */
  onClose(): void {
    super.onClose(); this.controls?.dispose(); this.controls = null; this.releaseCss?.(); this.releaseColors?.();
    this.releaseCss = null; this.releaseColors = null; this.preview?.dispose(); this.preview = null;
    this.rail?.unmount(); this.rail = null; this.contentEl.empty(); this.closed();
  }
}
