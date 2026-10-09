/**
 * Native declarative action settings. Every catalog row is independently searchable by Obsidian;
 * local filters affect only its original settings group. Edits cross the serialized workflow save
 * immediately, while rejected/colliding edits retain an explicit recovery choice. Render callbacks
 * own exact subscriptions and recorder lifetimes, including standalone global-search results.
 * Hotkey search and recorded collision checks compare detached key/code facts from one press while
 * saved bindings retain the user's explicitly selected logical or physical matching mode.
 */
import { setIcon, setTooltip, type Setting, type SettingDefinitionGroup, type SettingDefinitionRender, type ToggleComponent, SearchComponent } from "obsidian";
import type KplexPlugin from "../main";
import { ACTION_BY_ID, ACTION_CATALOG, type ActionId, type ActionMetadata } from "../core/plex/actions";
import { ACTION_BINDING_DEFAULTS, actionBindingContexts, compileActionBindings, effectiveActionBindings, isActionPublished, matchesActionBinding, physicalBindingKeycap, type ActionPreferencesV1, type LocalBinding } from "../core/plex/actionPreferences";
import type { KeyConvention } from "../core/contracts/presentationEnvironment";
import { readObsidianPresentationEnvironment } from "../adapters/obsidian/presentationEnvironment";
import { formatActionBinding, translateActionText } from "./actionPresentation";
import { actionPreferenceChanged, cloneActionPreferenceDraft, stageActionBinding } from "./actionSettingsPreferences";
import { ShortcutRecorder } from "./ShortcutRecorder";

type ActionFilter = "all" | "assigned" | "custom" | "unassigned";
type PreferenceEdit = (preferences: ActionPreferencesV1) => void | boolean;
type RowOwner = { setting: Setting; action?: ActionMetadata; refresh: () => void; release: () => void };
type GroupOwner = { live: boolean; search?: SearchComponent; root?: HTMLElement; query: string; chord?: LocalBinding; capturedChords?: readonly LocalBinding[]; filter: ActionFilter; rows: Set<RowOwner>; release: (() => void)[]; refresh: () => void };

/** Adopted native Settings elements retain their creating realm even after ownerDocument changes. */
function isElementTarget(target: EventTarget | null): target is Element {
  return Boolean(target && "nodeType" in target && target.nodeType === 1 && "matches" in target && typeof target.matches === "function"
    && "closest" in target && typeof target.closest === "function");
}

/** Match canonical key facts as well as formatted labels without interpreting a displayed key glyph. */
export function actionMatchesShortcut(bindings: readonly LocalBinding[], chord: LocalBinding, convention: KeyConvention): boolean {
  const primary = convention === "macos" || convention === "ios" ? "meta" : "ctrl";
  const modifiers = new Set(chord.modifiers.map(/** Search uses the same actual primary modifier as the portable action compiler. */ modifier => modifier === "mod" ? primary : modifier));
  return bindings.some(/** Logical and physical searches remain deliberately distinct; matching facts never dispatch an event. */ binding => binding.match === chord.match && matchesActionBinding({ key: chord.value, code: chord.value,
    ctrlKey: modifiers.has("ctrl"), metaKey: modifiers.has("meta"), altKey: modifiers.has("alt"), shiftKey: modifiers.has("shift") }, binding, convention));
}

/**
 * Identify contextual collisions proven by one recorder press, including Option glyphs whose code
 * cannot be inferred from their text. Compiler layout projections remain separate and conservative.
 * Effective bindings and their canonical focus contexts preserve character opt-out and editor policy.
 */
function recordedActionConflicts(preferences: ActionPreferencesV1, action: ActionId, binding: LocalBinding,
  captured: readonly LocalBinding[] | undefined, convention: KeyConvention,
): ActionId[] {
  const metadata = ACTION_BY_ID.get(action);
  if (!metadata || !captured?.length || !effectiveActionBindings(preferences, action).some(/** An opted-out proposed text chord has no runtime collision. */ saved => actionMatchesShortcut([saved], binding, convention))) return [];
  const contexts = actionBindingContexts(metadata, binding);
  return ACTION_CATALOG.filter(/** Only another action executable in the same focus region can conflict with this captured press. */ other => other.id !== action && effectiveActionBindings(preferences, other.id).some(/** Exact logical/physical captured alternatives prove equivalence without inventing a keyboard layout. */ saved => actionBindingContexts(other, saved).some(/** Disjoint editor/widget routes may safely reuse a chord. */ context => contexts.includes(context)) && captured.some(/** Keep each alternative's matching mode explicit. */ chord => actionMatchesShortcut([saved], chord, convention)))).map(/** Pending choices retain only bounded stable action identities. */ other => other.id);
}

/** Own rendered native rows, never a separate settings window or an unapplied full-settings draft. */
export class ActionSettingsController {
  private rows = new Set<RowOwner>();
  private groups = new Set<GroupOwner>();
  private releasePreferences: (() => void) | null = null;
  private recorder: ShortcutRecorder | null = null;
  private recorderOwner: RowOwner | GroupOwner | null = null;
  private listeners = new Map<HTMLElement, (() => void)[]>();
  private saving = false;
  private epoch = 0;
  private notices = new Map<string, string>();
  private retries = new Map<string, PreferenceEdit>();
  private pending: { action: ActionId; binding: LocalBinding; captured?: readonly LocalBinding[]; others: readonly ActionId[] } | null = null;

  /** Construction/indexing reads finite metadata only; native resources are acquired during render. */
  constructor(private plugin: KplexPlugin) {}

  /** Refuse to rewrite a newer saved schema through this version's conservative effective fallback. */
  private unsupported(): boolean { return this.plugin.actionPreferenceUnsupportedVersion !== undefined || this.plugin.settings.actionPreferences.version !== 1; }

  /** Acquire one subscription for any combination of local rows and global Settings search results. */
  private activate(): void {
    if (this.releasePreferences) return;
    this.releasePreferences = this.plugin.subscribeActionPreferences(/** External saved changes invalidate unaccepted collision choices and refresh live row controls. */ () => {
      if (!this.saving) this.pending = null;
      this.refresh();
    });
  }

  /** Refresh controls in place so native search result rows keep their original Setting ownership. */
  private refresh(): void {
    for (const row of this.rows) {
      const document = row.setting.settingEl.ownerDocument, active = document.activeElement;
      const focused = document.hasFocus();
      const control = active && row.setting.controlEl.contains(active) ? active.getAttribute("data-kplex-action-control") : null;
      row.refresh();
      if (control && focused && active && !active.isConnected) {
        const replacement = Array.from(row.setting.controlEl.querySelectorAll<HTMLButtonElement>("button")).find(button => button.getAttribute("data-kplex-action-control") === control && button.getAttribute("data-kplex-action-disabled") !== "true");
        // A save subscriber may refresh before the pending guard is released; preserve focus while that guard rejects repeat edits.
        if (replacement && this.saving) { replacement.disabled = false; replacement.setAttr("aria-disabled", "true"); }
        replacement?.focus();
      }
    }
    for (const group of this.groups) group.refresh();
  }

  /** Bind click handlers to exact rendered controls so cleanup retires even temporarily connected DOM. */
  private listen(element: HTMLElement, click: () => void): void {
    element.addEventListener("click", click);
    const releases = this.listeners.get(element) ?? [];
    releases.push(() => element.removeEventListener("click", click)); this.listeners.set(element, releases);
  }

  /** Release only controls owned by the retiring row fragment. */
  private clearControls(parent: HTMLElement): void {
    for (const [element, releases] of this.listeners) if (parent.contains(element)) { for (const release of releases) release(); this.listeners.delete(element); }
    parent.empty();
  }

  /** Pending persistence disables other controls in place while preserving the initiating focus owner. */
  private disableControls(parent: HTMLElement, disabled: boolean): void {
    for (const button of Array.from(parent.querySelectorAll<HTMLButtonElement>("button"))) {
      const permanent = button.getAttribute("data-kplex-action-disabled") === "true";
      button.disabled = permanent || disabled && parent.ownerDocument.activeElement !== button;
      button.setAttr("aria-disabled", String(permanent || disabled));
    }
  }

  /** Native subpage teardown releases its own header even when the entire settings tab stays open. */
  private releaseGroup(group: GroupOwner): void {
    group.live = false;
    for (const release of group.release) release(); group.release = [];
    if (this.recorderOwner === group) { this.recorder?.close(); this.recorder = null; this.recorderOwner = null; }
    group.search = undefined; group.root = undefined; this.groups.delete(group);
  }

  /** Save one explicit edit against fresh preferences; failures expose retry without claiming installation. */
  private async save(key: string, edit: PreferenceEdit, ownerDocument?: Document): Promise<void> {
    if (!this.rows.size || this.saving || this.unsupported() || this.pending) return;
    const epoch = this.epoch;
    const draft = cloneActionPreferenceDraft(this.plugin.settings.actionPreferences);
    if (edit(draft) === false) { this.refresh(); return; }
    const environment = readObsidianPresentationEnvironment(ownerDocument?.defaultView ?? undefined);
    const compiled = compileActionBindings(draft, environment.keyConvention);
    if (compiled.conflicts.length || compiled.issues.length) {
      this.notices.set(key, this.plugin.translator("actions.resolveConflicts")); this.refresh(); return;
    }
    this.saving = true; this.notices.set(key, this.plugin.translator("actions.saving")); this.retries.delete(key); this.refresh();
    try {
      await this.plugin.updateActionPreferences(draft);
      if (!this.rows.size || epoch !== this.epoch) return;
      this.notices.set(key, this.plugin.translator("actions.saved"));
    } catch (error) {
      if (!this.rows.size || epoch !== this.epoch) return;
      this.notices.set(key, this.plugin.translator("actions.saveFailed", { error: error instanceof Error ? error.message : String(error) }));
      this.retries.set(key, edit);
    } finally { this.saving = false; if (this.rows.size) this.refresh(); }
  }

  /** Create native icon affordances with one accessible tooltip and an exact render-owned callback. */
  private icon(parent: HTMLElement, icon: string, label: string, action: () => void, disabled = false): HTMLButtonElement {
    const button = parent.createEl("button", { cls: "clickable-icon", attr: { type: "button", "aria-label": label } });
    setIcon(button, icon); setTooltip(button, label); button.disabled = disabled;
    this.listen(button, /** Removed controls cannot invoke another settings generation. */ () => { if (button.isConnected && !button.disabled) action(); });
    return button;
  }

  /** Relay selected save semantics and detached search alternatives only to their live render owner. */
  private record(owner: RowOwner | GroupOwner, choose: (binding: LocalBinding, captured?: readonly LocalBinding[]) => void): void {
    if (this.saving || "setting" in owner && this.unsupported()) return;
    this.recorder?.close();
    this.recorderOwner = owner;
    this.recorder = new ShortcutRecorder(this.plugin, /** Ignore choices after the exact originating row or header is retired. */ (binding, captured) => {
      if ("setting" in owner ? this.rows.has(owner) && owner.setting.settingEl.isConnected : owner.live) choose(binding, captured);
    });
    this.recorder.open();
  }

  /** Propose compiler or captured-event collisions before saving; persist only the selected recording mode. */
  private chooseBinding(action: ActionId, binding: LocalBinding, ownerDocument: Document, captured?: readonly LocalBinding[]): void {
    if (this.saving || this.unsupported()) return;
    const environment = readObsidianPresentationEnvironment(ownerDocument.defaultView ?? undefined);
    const staged = stageActionBinding(this.plugin.settings.actionPreferences, action, binding, environment.keyConvention);
    if (!staged) { this.notices.set(action, this.plugin.translator("actions.bindingLimit")); this.refresh(); return; }
    const others = [...new Set([...staged.conflicts.map(/** Explain both endpoints of a proposed overlap. */ conflict => conflict.first === action ? conflict.second : conflict.first), ...recordedActionConflicts(staged.draft, action, binding, captured, environment.keyConvention)])];
    if (others.length) {
      this.pending = { action, binding, captured, others };
      this.refresh(); return;
    }
    void this.save(action, /** Rebase the add intent on fresh saved chords, including an explicit retry after failure. */ draft => {
      const fresh = stageActionBinding(draft, action, binding, environment.keyConvention);
      if (!fresh) { this.notices.set(action, this.plugin.translator("actions.bindingLimit")); return false; }
      const others = [...new Set([...fresh.conflicts.map(/** Rebase only conflicts affected by this proposal. */ conflict => conflict.first === action ? conflict.second : conflict.first), ...recordedActionConflicts(fresh.draft, action, binding, captured, environment.keyConvention)])];
      if (others.length) {
        this.pending = { action, binding, captured, others };
        return false;
      }
      draft.localBindings[action] = fresh.draft.localBindings[action];
      return true;
    }, ownerDocument);
  }

  /** Resolve only explicitly accepted contextual overlaps; retained capture facts also fence replacement retries. */
  private replaceConflicts(ownerDocument: Document): void {
    const pending = this.pending;
    if (!pending || this.saving || this.unsupported()) return;
    this.pending = null;
    void this.save(pending.action, /** Recompute each other action's overlapping subset against fresh persisted preferences. */ draft => {
      for (const other of pending.others) {
        const bindings = draft.localBindings[other] ?? ACTION_BINDING_DEFAULTS[other] ?? [];
        draft.localBindings[other] = bindings.filter(/** A compiler collision with this proposal identifies exactly the chord being replaced. */ binding => {
          const probe = cloneActionPreferenceDraft(draft); probe.localBindings[other] = [binding]; probe.localBindings[pending.action] = [pending.binding];
          const environment = readObsidianPresentationEnvironment(ownerDocument.defaultView ?? undefined);
          return !compileActionBindings(probe, environment.keyConvention).conflicts.some(/** Other imported collisions are not part of this replacement. */ conflict => conflict.first === other && conflict.second === pending.action || conflict.second === other && conflict.first === pending.action)
            && !recordedActionConflicts(probe, pending.action, pending.binding, pending.captured, environment.keyConvention).includes(other);
        });
      }
      const environment = readObsidianPresentationEnvironment(ownerDocument.defaultView ?? undefined);
      const staged = stageActionBinding(draft, pending.action, pending.binding, environment.keyConvention);
      if (!staged) { this.notices.set(pending.action, this.plugin.translator("actions.bindingLimit")); return false; }
      const others = [...new Set([...staged.conflicts.map(/** A new conflict requires another explicit replacement decision. */ conflict => conflict.first === pending.action ? conflict.second : conflict.first), ...recordedActionConflicts(staged.draft, pending.action, pending.binding, pending.captured, environment.keyConvention)])];
      if (others.length) { this.pending = {...pending, others: [...new Set([...pending.others, ...others])]}; return false; }
      draft.localBindings[pending.action] = staged.draft.localBindings[pending.action];
      return true;
    }, ownerDocument);
  }

  /** Render status/retry/collision choices beside the action that owns them, without nested Settings rows. */
  private renderStatus(parent: HTMLElement, key: string): void {
    const message = this.unsupported() ? this.plugin.translator("actions.unsupportedPreferences") : this.notices.get(key);
    if (message) parent.createDiv({ cls: "kplex-action-status", text: message, attr: { role: "status", "aria-live": "polite" } });
    const retry = this.retries.get(key);
    if (retry) this.icon(parent, "refresh-cw", this.plugin.translator("actions.retrySave"), /** Retry rebases this exact operation on the latest saved preferences. */ () => { void this.save(key, retry, parent.ownerDocument); }, this.saving || this.unsupported());
    if (this.pending?.action !== key) return;
    for (const other of this.pending.others) {
      const action = ACTION_BY_ID.get(other);
      if (action) parent.createDiv({ cls: "kplex-action-status mod-warning", text: this.plugin.translator("actions.conflictsWithAction", { action: translateActionText(this.plugin.translator, action.labelKey) }) });
    }
    const replace = parent.createEl("button", { text: this.plugin.translator("actions.replaceConflicts"), attr: { type: "button" } });
    this.listen(replace, /** Collision replacement is a separate explicit user choice. */ () => this.replaceConflicts(parent.ownerDocument));
    const cancel = parent.createEl("button", { text: this.plugin.translator("common.cancel"), attr: { type: "button" } });
    this.listen(cancel, /** Discard only the unaccepted chord. */ () => { this.pending = null; this.refresh(); });
  }

  /** Attach an independently owned row; native teardown and controller disposal are both idempotent. */
  private own(setting: Setting, group: GroupOwner, action: ActionMetadata | undefined, render: () => void): () => void {
    this.activate();
    const row: RowOwner = { setting, action, refresh: render, release: /** Native row cleanup retires recorder input before unregistering this owner. */ () => {
      if (!this.rows.delete(row)) return;
      const local = group.rows.delete(row);
      if (local && !group.rows.size) this.releaseGroup(group);
      this.clearControls(setting.controlEl);
      const feedback = setting.infoEl.querySelector<HTMLElement>(".kplex-action-feedback");
      if (feedback) this.clearControls(feedback);
      if (this.recorderOwner === row) { this.recorder?.close(); this.recorder = null; this.recorderOwner = null; }
      if (!this.rows.size) { this.epoch++; this.releasePreferences?.(); this.releasePreferences = null; this.pending = null; }
    } };
    this.rows.add(row);
    // Global Settings search constructs its own groups without the original local search header.
    if (group.root?.contains(setting.settingEl)) group.rows.add(row);
    render(); group.refresh(); return row.release;
  }

  /** Build one real declarative row per action, including read-only composer session protocols. */
  private actionDefinition(action: ActionMetadata, group: GroupOwner): SettingDefinitionRender {
    const translate = this.plugin.translator;
    return { name: translateActionText(translate, action.labelKey), desc: translateActionText(translate, action.descriptionKey),
      aliases: [action.id, action.category, "shortcut", "hotkey", ...action.localContexts, action.target,
        ...(this.plugin.settings.actionPreferences.localBindings[action.id] ?? ACTION_BINDING_DEFAULTS[action.id] ?? []).map(/** Include saved canonical chord facts in native Settings search indexing. */ binding => `${binding.modifiers.join(" ")} ${binding.value}`)],
      render: /** All controls stay attached to the Setting created by the native declarative renderer. */ setting => {
        setting.settingEl.addClass("kplex-action-setting"); setting.settingEl.setAttr("data-action-id", action.id);
        const label = translateActionText(translate, action.labelKey).trim().replace(/[.!?]$/, "").toLocaleLowerCase();
        const description = translateActionText(translate, action.descriptionKey).trim().replace(/[.!?]$/, "").toLocaleLowerCase();
        if (description === label) setting.setDesc("");
        const status = setting.infoEl.createDiv({ cls: "kplex-action-feedback" });
        let previous = "";
        const render = /** Saved changes update controls in place without reconstructing native result rows. */ (): void => {
          this.clearControls(status);
          if (action.id.startsWith("composer.")) { status.setText(translate("actions.fixedProtocol")); return; }
          const preferences = this.plugin.settings.actionPreferences;
          const bindings = preferences.localBindings[action.id] ?? ACTION_BINDING_DEFAULTS[action.id] ?? [];
          const environment = readObsidianPresentationEnvironment(setting.settingEl.ownerDocument.defaultView ?? undefined);
          const disabled = this.saving || this.unsupported() || Boolean(this.pending);
          const fingerprint = JSON.stringify([bindings, preferences.publishedCommands[action.id], preferences.localBindings[action.id] !== undefined]);
          if (fingerprint === previous) { this.disableControls(setting.controlEl, disabled); this.renderStatus(status, action.id); return; }
          previous = fingerprint; this.clearControls(setting.controlEl);
          const pills = setting.controlEl.createDiv({ cls: "setting-command-hotkeys" });
          for (const binding of bindings) {
            const text = formatActionBinding(binding, environment, translate, true) ?? binding.value;
            const pill = pills.createEl("button", { cls: "setting-hotkey", text, attr: { type: "button", "aria-label": translate("actions.removeBinding", { binding: text }) } });
            pill.disabled = disabled; setTooltip(pill, translate("actions.removeBinding", { binding: text }));
            pill.setAttr("data-kplex-action-control", `remove:${JSON.stringify(binding)}`);
            setIcon(pill.createSpan({ cls: "setting-hotkey-icon setting-delete-hotkey" }), "x");
            this.listen(pill, /** Remove the captured chord from fresh saved keys, preserving unrelated changes on retry. */ () => { if (!pill.disabled && this.rows.size) void this.save(action.id, draft => { const current = draft.localBindings[action.id] ?? ACTION_BINDING_DEFAULTS[action.id] ?? []; draft.localBindings[action.id] = current.filter(saved => JSON.stringify(saved) !== JSON.stringify(binding)); }, setting.settingEl.ownerDocument); });
          }
          if (!bindings.length) pills.createSpan({ cls: "setting-hotkey mod-empty", text: translate("actions.blank") });
          const add = this.icon(setting.controlEl, "plus-circle", translate("actions.addBinding"), /** The recorder only returns a proposal to this row's collision policy. */ () => {
            const row = [...this.rows].find(candidate => candidate.setting === setting);
            if (row) this.record(row, /** Carry exact event evidence for collisions while saving only the explicitly chosen matching mode. */ (binding, captured) => this.chooseBinding(action.id, binding, setting.settingEl.ownerDocument, captured));
          }, disabled || bindings.length >= 4);
          add.addClass("setting-add-hotkey-button"); add.setAttr("data-kplex-action-control", "add"); add.setAttr("data-kplex-action-disabled", String(bindings.length >= 4));
          const reset = this.icon(setting.controlEl, "rotate-ccw", translate("hotkeys.reset"), /** Reset local bindings independently of command publication. */ () => { void this.save(action.id, draft => { delete draft.localBindings[action.id]; }, setting.settingEl.ownerDocument); }, disabled || preferences.localBindings[action.id] === undefined);
          reset.setAttr("data-kplex-action-control", "reset"); reset.setAttr("data-kplex-action-disabled", String(preferences.localBindings[action.id] === undefined));
          if (action.command) {
            const published = isActionPublished(preferences, action.id);
            const button = this.icon(setting.controlEl, "terminal", translate(published ? "actions.unpublishCommand" : "actions.publishCommand"), /** Desired publication changes use the same workflow-only save as local chords. */ () => { void this.save(action.id, draft => { draft.publishedCommands[action.id] = !published; }, setting.settingEl.ownerDocument); }, disabled);
            button.setAttr("aria-pressed", String(published)); button.toggleClass("is-active", published);
            button.setAttr("data-kplex-action-control", "publication");
          }
          this.renderStatus(status, action.id);
        };
        return this.own(setting, group, action, render);
      },
    };
  }

  /** Native group search and pills only filter their original DOM rows, never global search metadata. */
  getSettingDefinitions(): SettingDefinitionGroup<never> {
    const translate = this.plugin.translator;
    const group: GroupOwner = { live: true, query: "", filter: "all", rows: new Set(), release: [], refresh: /** Reconcile finite catalog rows only while their native group still exists. */ () => {
      for (const row of group.rows) {
        const action = row.action;
        if (!action) continue;
        const preferences = this.plugin.settings.actionPreferences, bindings = preferences.localBindings[action.id] ?? ACTION_BINDING_DEFAULTS[action.id] ?? [];
        const environment = readObsidianPresentationEnvironment(row.setting.settingEl.ownerDocument.defaultView ?? undefined);
        const text = `${translateActionText(translate, action.labelKey)} ${translateActionText(translate, action.descriptionKey)} ${action.id} ${bindings.map(binding => formatActionBinding(binding, environment, translate, true) ?? binding.value).join(" ")}`.toLocaleLowerCase();
        const match = (!group.query || text.includes(group.query.toLocaleLowerCase())) && (!group.chord || (group.capturedChords ?? [group.chord]).some(/** A search press can describe both logical and physical saved chords without conflating either mode. */ chord => actionMatchesShortcut(bindings, chord, environment.keyConvention)))
          && (group.filter === "all" || group.filter === "assigned" && bindings.length > 0 || group.filter === "unassigned" && !bindings.length || group.filter === "custom" && preferences.localBindings[action.id] !== undefined && bindings.length > 0 && actionPreferenceChanged(preferences, action));
        row.setting.settingEl.toggleClass("kplex-action-filtered", !match);
      }
    } };
    return { type: "group", heading: "", cls: "kplex-action-settings",
      items: [
        { name: "", searchable: false, render: /** Native header rendering uses public components across declarative renderer versions. */ setting => {
          setting.settingEl.addClass("kplex-action-settings-header");
        const search = new SearchComponent(setting.controlEl);
        group.live = true; group.query = ""; group.chord = undefined; group.capturedChords = undefined; group.filter = "all";
        this.groups.add(group); group.search = search;
        group.root = setting.settingEl.closest<HTMLElement>(".kplex-action-settings") ?? undefined;
        search.inputEl.setAttr("data-kplex-action-search", "true");
        search.inputEl.setAttr("aria-label", translate("actions.searchPlaceholder"));
        search.setPlaceholder(translate("actions.searchPlaceholder")).onChange(value => { if (!group.live || group.search !== search || !search.inputEl.isConnected) return; group.query = value.trim(); group.chord = undefined; group.capturedChords = undefined; group.refresh(); });
        const filters = setting.controlEl.createDiv({ cls: "kplex-action-filters" });
        
        for (const filter of ["all", "assigned", "custom", "unassigned"] as const) {
          const pill = filters.createEl("button", { cls: "filter-pill", text: translate(`actions.filter.${filter}`), attr: { type: "button", "aria-pressed": String(filter === group.filter), "data-kplex-action-filter": filter } });
          pill.toggleClass("is-active", filter === group.filter);
          const click = /** Change native group presentation without affecting the declarative definitions. */ (): void => {
            if (!group.live || group.search !== search || !search.inputEl.isConnected) return; group.filter = filter;
            for (const button of Array.from(filters.querySelectorAll<HTMLButtonElement>("button"))) { const selected = button === pill; button.setAttr("aria-pressed", String(selected)); button.toggleClass("is-active", selected); }
            group.refresh();
          };
          pill.addEventListener("click", click); group.release.push(() => pill.removeEventListener("click", click));
        }
        const keyboard = this.icon(search.inputEl.parentElement ?? setting.controlEl, "keyboard", translate("actions.searchByHotkey"), /** Capture a search chord without changing any preference. */ () => {
          if (!group.live || group.search !== search || !search.inputEl.isConnected) return;
          this.record(group, /** Searching a key press uses detached alternatives; it never changes preferences or the recorder's selected save mode. */ (binding, captured) => {
            if (group.search !== search || !search.inputEl.isConnected) return;
            group.query = ""; group.chord = binding; group.capturedChords = captured;
            const display = captured?.find(/** Familiar physical keycaps make Option-produced characters readable without guessing from those characters. */ candidate => candidate.match === "code" && physicalBindingKeycap(candidate) !== null) ?? binding;
            const environment = readObsidianPresentationEnvironment(search.inputEl.ownerDocument.defaultView ?? undefined);
            search.setValue(formatActionBinding(display, environment, translate, true) ?? display.value); group.refresh();
          });
        });
        keyboard.setAttr("data-kplex-action-control", "search-hotkey");
        let document: Document | null = null;
        const revealGlobalResult = /** Native same-page Settings navigation retains mounted rows, so retire local filters before its focus/highlight handler. */ (event: Event): void => {
          const root = group.root, target = event.target;
          if (!document || !group.live || group.search !== search || !root?.isConnected || root.ownerDocument !== document
            || !isElementTarget(target) || root.contains(target)) return;
          const externalSearch = target.matches('input[type="search"], .search-input-container input');
          // This observed native result class is a narrow DOM compatibility guard, not a private settings callback.
          const resultClick = event.type === "click" && Boolean(target.closest(".setting-search-result-item"));
          if (!externalSearch && !resultClick) return;
          group.query = ""; group.chord = undefined; group.capturedChords = undefined; group.filter = "all"; search.setValue("");
          for (const pill of Array.from(root.querySelectorAll<HTMLButtonElement>("[data-kplex-action-filter]"))) {
            const selected = pill.getAttribute("data-kplex-action-filter") === "all";
            pill.setAttr("aria-pressed", String(selected)); pill.toggleClass("is-active", selected);
          }
          group.refresh();
        };
        const unbind = /** Retire listeners on the exact old owning document before accepting its successor. */ (): void => {
          document?.removeEventListener("input", revealGlobalResult, true); document?.removeEventListener("focusin", revealGlobalResult, true); document?.removeEventListener("click", revealGlobalResult, true);
          document = null;
        };
        const wire = /** Native Settings may migrate its initially detached rendered page to another window. */ (): void => {
          unbind(); document = setting.settingEl.ownerDocument;
          document.addEventListener("input", revealGlobalResult, true); document.addEventListener("focusin", revealGlobalResult, true); document.addEventListener("click", revealGlobalResult, true);
        };
        wire();
        const releaseMigration = typeof setting.settingEl.onWindowMigrated === "function" ? setting.settingEl.onWindowMigrated(wire) : null;
        group.release.push(/** Exact header teardown retires cross-row native search reconciliation. */ () => {
          releaseMigration?.(); unbind();
        });
        return this.own(setting, group, undefined, () => {});
        } },
        ...(["characterShortcutsEnabled", "crossSectionAtBoundary"] as const).map(/** Workflow-wide toggles remain real searchable definitions with immediate saves. */ key => ({
          aliases: [key], name: translate(key === "characterShortcutsEnabled" ? "actions.characterShortcuts" : "actions.crossSection"), desc: translate(key === "characterShortcutsEnabled" ? "actions.characterShortcutsHelp" : "actions.crossSectionHelp"),
          render: (setting: Setting) => {
            setting.settingEl.setAttr("data-action-preference", key);
            const status = setting.infoEl.createDiv({ cls: "kplex-action-feedback" });
            let toggle: ToggleComponent | null = null;
            const render = /** Native Setting retains its single component and focused control throughout preference refresh. */ (): void => {
              this.clearControls(status);
              if (!toggle) setting.addToggle(component => {
                toggle = component;
                component.onChange(value => {
                  // Native setValue also invokes onChange; rendering committed state must not save it again.
                  if (value === this.plugin.settings.actionPreferences[key]) return;
                  if ([...this.rows].some(row => row.setting === setting)) void this.save(key, draft => { draft[key] = value; }, setting.settingEl.ownerDocument);
                });
              });
              toggle?.setValue(this.plugin.settings.actionPreferences[key]).setDisabled(this.saving || this.unsupported() || Boolean(this.pending));
              this.renderStatus(status, key);
            };
            return this.own(setting, group, undefined, render);
          },
        })),
        ...ACTION_CATALOG.map(action => this.actionDefinition(action, group)),
      ],
    };
  }

  /** Settings-tab hide/unload is a fallback for native render cleanup, and permits later re-rendering. */
  dispose(): void {
    this.recorder?.close(); this.recorder = null; this.recorderOwner = null;
    for (const group of this.groups) this.releaseGroup(group);
    this.groups.clear();
    for (const row of [...this.rows]) row.release();
    this.releasePreferences?.(); this.releasePreferences = null; this.pending = null; this.notices.clear(); this.retries.clear();
  }
}
