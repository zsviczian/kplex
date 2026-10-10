/**
 * Native declarative action settings. Every catalog row is independently searchable by Obsidian;
 * local filters affect only its original settings group. Edits cross the serialized workflow save
 * immediately, preserving overlapping assignments with inline diagnostics and failure recovery. Render callbacks
 * own exact subscriptions and recorder lifetimes, including standalone global-search results.
 * Hotkey search and recorded collision checks compare detached key/code facts from one press while
 * saved bindings retain the user's explicitly selected logical or physical matching mode. Persistent
 * chip diagnostics combine canonical local conflicts and read-only host advisories once per refresh.
 * Row-local scope and separately observed command registration/assignment facts also survive native
 * global Settings search and update independently of local collision fingerprints.
 */
import { setIcon, setTooltip, type Setting, type SettingDefinitionGroup, type SettingDefinitionRender, type ToggleComponent, SearchComponent } from "obsidian";
import type KplexPlugin from "../main";
import { ACTION_BY_ID, ACTION_CATALOG, type ActionId, type ActionMetadata } from "../core/plex/actions";
import { ACTION_BINDING_DEFAULTS, actionBindingContexts, compileActionBindings, effectiveActionBindings, isActionPublished, matchesActionBinding, physicalBindingKeycap, type ActionPreferencesV1, type BindingConflict, type LocalBinding } from "../core/plex/actionPreferences";
import type { KeyConvention } from "../core/contracts/presentationEnvironment";
import { readObsidianPresentationEnvironment } from "../adapters/obsidian/presentationEnvironment";
import { formatActionBinding, translateActionText } from "./actionPresentation";
import { actionPreferenceChanged, cloneActionPreferenceDraft, stageActionBinding } from "./actionSettingsPreferences";
import { readObsidianActionHotkeys, subscribeObsidianActionHotkeys, type NativeHotkeySnapshot } from "../adapters/obsidian/actionHotkeys";
import { actionBindingIdentity, collectActionShortcutConflicts, type ShortcutDiagnostic, type ShortcutDiagnosticSnapshot } from "./actionShortcutConflicts";
import { ShortcutRecorder } from "./ShortcutRecorder";

type ActionFilter = "all" | "assigned" | "custom" | "unassigned" | "conflicts";
type PreferenceEdit = (preferences: ActionPreferencesV1) => void | boolean;
type RowOwner = { setting: Setting; action?: ActionMetadata; refresh: () => void; release: () => void };
type GroupOwner = { live: boolean; search?: SearchComponent; root?: HTMLElement; query: string; chord?: LocalBinding; capturedChords?: readonly LocalBinding[]; filter: ActionFilter; conflictPill?: HTMLElement; nativeStatus?: HTMLElement; rows: Set<RowOwner>; release: (() => void)[]; refresh: () => void };

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
 * Evidence expires with this controller; no keyboard-layout correspondence is inferred on reload.
 */
function recordedActionConflicts(preferences: ActionPreferencesV1, action: ActionId, binding: LocalBinding,
  captured: readonly LocalBinding[] | undefined, convention: KeyConvention,
): BindingConflict[] {
  const metadata = ACTION_BY_ID.get(action);
  if (!metadata || !captured?.length || !effectiveActionBindings(preferences, action).some(/** An opted-out proposed text chord has no runtime collision. */ saved => actionMatchesShortcut([saved], binding, convention))) return [];
  const contexts = actionBindingContexts(metadata, binding);
  const conflicts: BindingConflict[] = [];
  for (const other of ACTION_CATALOG) {
    if (other.id === action) continue;
    for (const saved of effectiveActionBindings(preferences, other.id)) {
      const shared = actionBindingContexts(other, saved).filter(/** Only simultaneously executable routes create a local conflict. */ context => contexts.includes(context));
      if (shared.length && captured.some(/** Detached facts prove equivalence without inferring a glyph's physical position. */ chord => actionMatchesShortcut([saved], chord, convention))) conflicts.push({first: action, second: other.id, binding, secondBinding: saved, contexts: shared, kind: "collision"});
    }
  }
  return conflicts;
}

/** Own rendered native rows, never a separate settings window or an unapplied full-settings draft. */
export class ActionSettingsController {
  private rows = new Set<RowOwner>();
  private groups = new Set<GroupOwner>();
  private releasePreferences: (() => void) | null = null;
  private releaseNativeHotkeys: (() => void) | null = null;
  private nativeHotkeys: NativeHotkeySnapshot = {available: false, complete: false, commands: [], assignments: []};
  private diagnostics = new Map<KeyConvention, ShortcutDiagnosticSnapshot>();
  private nativeRefreshTimers = new Set<() => void>();
  private focusOwners = new Map<Window, { count: number; release: () => void }>();
  private recorder: ShortcutRecorder | null = null;
  private recorderOwner: RowOwner | GroupOwner | null = null;
  private listeners = new Map<HTMLElement, (() => void)[]>();
  private saving = false;
  private epoch = 0;
  private notices = new Map<string, string>();
  private retries = new Map<string, PreferenceEdit>();
  /** Exact key/code evidence is session-only; removal or controller teardown retires it. */
  private capturedAliases = new Map<string, {action: ActionId; binding: LocalBinding; captured: readonly LocalBinding[]}>();

  /** Construction/indexing reads finite metadata only; native resources are acquired during render. */
  constructor(private plugin: KplexPlugin) {}

  /** Refuse to rewrite a newer saved schema through this version's conservative effective fallback. */
  private unsupported(): boolean { return this.plugin.actionPreferenceUnsupportedVersion !== undefined || this.plugin.settings.actionPreferences.version !== 1; }

  /** Acquire one subscription for any combination of local rows and global Settings search results. */
  private activate(): void {
    if (this.releasePreferences) return;
    this.readDiagnostics();
    this.releaseNativeHotkeys = subscribeObsidianActionHotkeys(this.plugin.app, /** Native assignments affect diagnostics only, never saved local choices. */ () => this.scheduleNativeRefresh());
    this.releasePreferences = this.plugin.subscribeActionPreferences(/** External saved edits retire stale event evidence and refresh live controls. */ () => {
      if (!this.saving) this.pruneCapturedAliases();
      this.refresh();
    });
  }

  /** Cancel exact owning-window timers; native file refresh is bounded and never becomes background polling. */
  private clearNativeRefreshTimers(): void { for (const release of this.nativeRefreshTimers) release(); this.nativeRefreshTimers.clear(); }

  /**
   * Native hotkey reload is debounced/asynchronous. Recheck three bounded times after raw changes;
   * focus/page reopening provide later freshness without assuming any delay guarantees host completion.
   */
  private scheduleNativeRefresh(): void {
    this.clearNativeRefreshTimers();
    if (!this.rows.size) return;
    this.refresh();
    const ownerWindow = [...this.rows].find(/** Use a live native row's actual document, including popouts. */ row => row.setting.settingEl.isConnected)?.setting.settingEl.ownerDocument.defaultView;
    if (!ownerWindow) return;
    for (const delay of [250, 1000, 3000]) {
      let release: () => void;
      const timer = ownerWindow.setTimeout(/** Detached native snapshots are refreshed only while this controller still owns rows. */ () => {
        this.nativeRefreshTimers.delete(release);
        if (this.rows.size) this.refresh();
      }, delay);
      release = /** Cancel on the exact window that acquired this bounded retry. */ () => ownerWindow.clearTimeout(timer);
      this.nativeRefreshTimers.add(release);
    }
  }

  /** Acquire detached native assignments once and invalidate platform-specific canonical projections. */
  private readDiagnostics(): void {
    const commandIds = ACTION_CATALOG.flatMap(/** Exact host registry IDs differ from stable action IDs. */ action => action.command ? [`${this.plugin.manifest.id}:${action.command.id}`] : []);
    this.nativeHotkeys = readObsidianActionHotkeys(this.plugin.app, commandIds); this.diagnostics.clear();
  }

  /** Lazily compile each actually rendered platform once per refresh, sharing the snapshot across rows. */
  private diagnosticsFor(convention: KeyConvention): ShortcutDiagnosticSnapshot {
    let snapshot = this.diagnostics.get(convention);
    if (!snapshot) { const preferences = this.plugin.settings.actionPreferences;
      const captured = [...this.capturedAliases.values()].flatMap(/** Session facts remain active only while their exact originating chord is effective. */ alias => recordedActionConflicts(preferences, alias.action, alias.binding, alias.captured, convention));
      snapshot = collectActionShortcutConflicts(preferences, convention, this.nativeHotkeys, captured); this.diagnostics.set(convention, snapshot); }
    return snapshot;
  }

  /** Own one focus listener per actual rendering window; migration/release retire the old window exactly. */
  private ownFocus(setting: Setting): () => void {
    let ownedWindow: Window | null = null;
    const releaseWindow = /** Reference counting preserves other standalone native search rows in this window. */ (): void => {
      if (!ownedWindow) return;
      const owner = this.focusOwners.get(ownedWindow);
      if (owner && --owner.count === 0) { owner.release(); this.focusOwners.delete(ownedWindow); }
      ownedWindow = null;
    };
    const wire = /** Obsidian can migrate a detached settings row to a popout window after rendering. */ (): void => {
      const next = setting.settingEl.ownerDocument.defaultView;
      if (next === ownedWindow) return;
      releaseWindow(); ownedWindow = next;
      if (!next) return;
      const existing = this.focusOwners.get(next);
      if (existing) { existing.count++; return; }
      const focus = /** Native hotkey settings may change while this plugin's page is unfocused. */ (): void => { if (this.rows.size) this.refresh(); };
      next.addEventListener("focus", focus);
      this.focusOwners.set(next, {count: 1, release: /** Remove the callback from its actual acquisition window. */ () => next.removeEventListener("focus", focus)});
    };
    wire();
    const releaseMigration = typeof setting.settingEl.onWindowMigrated === "function" ? setting.settingEl.onWindowMigrated(wire) : null;
    return /** Closing this row releases its window lease and exact migration listener. */ () => { releaseMigration?.(); releaseWindow(); };
  }

  /** Refresh controls in place so native search result rows keep their original Setting ownership. */
  private refresh(): void {
    this.readDiagnostics();
    for (const row of this.rows) {
      const document = row.setting.settingEl.ownerDocument, active = document.activeElement;
      const focused = document.hasFocus();
      const control = active && row.setting.controlEl.contains(active) ? active.getAttribute("data-kplex-action-control") : null;
      row.refresh();
      if (control && focused && active && !active.isConnected) {
        const replacement = Array.from(row.setting.controlEl.querySelectorAll<HTMLButtonElement>("button")).find(button => button.getAttribute("data-kplex-action-control") === control && button.getAttribute("data-kplex-action-disabled") !== "true");
        // A save subscriber may refresh before the persistence guard is released; preserve focus while it rejects repeat edits.
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
    group.search = undefined; group.root = undefined; group.conflictPill = undefined; group.nativeStatus = undefined; this.groups.delete(group);
  }

  /** Retire event evidence when its exact originating binding has been removed or edited. */
  private pruneCapturedAliases(): void {
    for (const [token, alias] of this.capturedAliases) if (!(this.plugin.settings.actionPreferences.localBindings[alias.action] ?? ACTION_BINDING_DEFAULTS[alias.action] ?? []).some(/** Only the identical saved chord can retain a recorder's detached layout evidence. */ binding => actionBindingIdentity(binding) === actionBindingIdentity(alias.binding))) this.capturedAliases.delete(token);
  }

  /** Save one explicit edit against fresh preferences; failures expose retry without claiming installation. */
  private async save(key: string, edit: PreferenceEdit, ownerDocument?: Document): Promise<void> {
    if (!this.rows.size || this.saving || this.unsupported()) return;
    const epoch = this.epoch;
    const draft = cloneActionPreferenceDraft(this.plugin.settings.actionPreferences);
    if (edit(draft) === false) { this.refresh(); return; }
    const environment = readObsidianPresentationEnvironment(ownerDocument?.defaultView ?? undefined);
    const compiled = compileActionBindings(draft, environment.keyConvention);
    if (compiled.issues.length) {
      this.notices.set(key, this.plugin.translator("actions.invalidPreferences")); this.refresh(); return;
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
    } finally {
      this.saving = false;
      this.pruneCapturedAliases();
      if (this.rows.size) this.refresh();
    }
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

  /** Save the selected mode immediately; retain detached event evidence without replacing another assignment. */
  private chooseBinding(action: ActionId, binding: LocalBinding, ownerDocument: Document, captured?: readonly LocalBinding[]): void {
    if (this.saving || this.unsupported()) return;
    const environment = readObsidianPresentationEnvironment(ownerDocument.defaultView ?? undefined);
    void this.save(action, /** Rebase only this addition on current saved chords; overlaps are diagnostic rather than blocking. */ draft => {
      const staged = stageActionBinding(draft, action, binding, environment.keyConvention);
      if (!staged) { this.notices.set(action, this.plugin.translator("actions.bindingLimit")); return false; }
      draft.localBindings[action] = staged.draft.localBindings[action];
      if (captured?.length) this.capturedAliases.set(JSON.stringify([action, binding]), {action, binding, captured});
      return true;
    }, ownerDocument);
  }

  /** Render persistence status and explicit failed-save retry beside the action that owns them, without nested Settings rows. */
  private renderStatus(parent: HTMLElement, key: string): void {
    const message = this.unsupported() ? this.plugin.translator("actions.unsupportedPreferences") : this.notices.get(key);
    if (message) parent.createDiv({ cls: "kplex-action-status", text: message, attr: { role: "status", "aria-live": "polite" } });
    const retry = this.retries.get(key);
    if (retry) this.icon(parent, "refresh-cw", this.plugin.translator("actions.retrySave"), /** Retry rebases this exact operation on the latest saved preferences. */ () => { void this.save(key, retry, parent.ownerDocument); }, this.saving || this.unsupported());
  }

  /** Explain independent chip diagnostics without conflating local conflicts, layout suggestions or own commands. */
  private diagnosticLabels(diagnostic: ShortcutDiagnostic | undefined): string[] {
    if (!diagnostic) return [];
    const translate = this.plugin.translator, labels: string[] = [];
    for (const possible of [false, true]) {
      const actions = diagnostic.local.filter(/** Exact and layout-dependent local overlaps have distinct wording. */ item => item.possible === possible)
        .map(/** Translate stable catalog identities at presentation time. */ item => translateActionText(translate, ACTION_BY_ID.get(item.action)!.labelKey));
      if (actions.length) labels.push(translate(possible ? "actions.localLayoutOverlap" : "actions.localConflict", {actions: actions.join(", ")}));
    }
    for (const self of [false, true]) for (const possible of [false, true]) {
      const commands = diagnostic.obsidian.filter(/** Same-action publication is informational, never a conflict warning. */ item => item.self === self && item.possible === possible).map(/** Native command names are detached host data, not localized product literals. */ item => item.name);
      if (commands.length) labels.push(translate(self ? "actions.globalSelfAssignment" : possible ? "actions.globalLayoutOverlap" : "actions.globalOverlap", {commands: commands.join(", ")}));
    }
    return labels;
  }

  /** Attach an independently owned row; native teardown and controller disposal are both idempotent. */
  private own(setting: Setting, group: GroupOwner, action: ActionMetadata | undefined, render: () => void): () => void {
    this.activate();
    const releaseFocus = this.ownFocus(setting);
    const row: RowOwner = { setting, action, refresh: render, release: /** Native row cleanup retires recorder input before unregistering this owner. */ () => {
      if (!this.rows.delete(row)) return;
      releaseFocus();
      const local = group.rows.delete(row);
      if (local && !group.rows.size) this.releaseGroup(group);
      this.clearControls(setting.controlEl);
      const feedback = setting.infoEl.querySelector<HTMLElement>(".kplex-action-feedback");
      if (feedback) this.clearControls(feedback);
      setting.infoEl.querySelector(".kplex-action-diagnostics")?.remove();
      setting.infoEl.querySelector(".kplex-action-scope")?.remove();
      setting.infoEl.querySelector(".kplex-action-publication-state")?.remove();
      if (this.recorderOwner === row) { this.recorder?.close(); this.recorder = null; this.recorderOwner = null; }
      if (!this.rows.size) { this.epoch++; this.releasePreferences?.(); this.releasePreferences = null; this.releaseNativeHotkeys?.(); this.releaseNativeHotkeys = null; this.clearNativeRefreshTimers(); this.capturedAliases.clear(); }
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
        const scope = setting.infoEl.createDiv({cls: "kplex-action-scope"});
        const publicationStatus = setting.infoEl.createDiv({cls: "kplex-action-publication-state", attr: {role: "status", "aria-live": "polite"}});
        const status = setting.infoEl.createDiv({ cls: "kplex-action-feedback" });
        const diagnosticStatus = setting.infoEl.createDiv({cls: "kplex-action-diagnostics"});
        let previous = "";
        const render = /** Saved changes update controls in place without reconstructing native result rows. */ (): void => {
          this.clearControls(status);
          if (action.id.startsWith("composer.")) { status.setText(translate("actions.fixedProtocol")); return; }
          scope.setText(translate("actions.localScopeHint"));
          const preferences = this.plugin.settings.actionPreferences;
          const bindings = preferences.localBindings[action.id] ?? ACTION_BINDING_DEFAULTS[action.id] ?? [];
          const environment = readObsidianPresentationEnvironment(setting.settingEl.ownerDocument.defaultView ?? undefined);
          const disabled = this.saving || this.unsupported();
          const actualPublished = action.command ? this.plugin.isActionPublished(action.id) : false;
          if (action.command) {
            const desiredPublished = isActionPublished(preferences, action.id);
            const assignment = this.nativeHotkeys.assignments.find(/** Native assignments use the manifest-prefixed command ID, never the localized label. */ fact => fact.id === `${this.plugin.manifest.id}:${action.command?.id}`);
            const registration = translate(actualPublished ? "actions.actualPublished" : desiredPublished ? "actions.registrationPending" : "actions.actualUnpublished");
            let assignmentText = translate("actions.globalAssignmentUnknown");
            if (assignment?.presence === "assigned") {
              const chords = assignment.bindingsComplete ? assignment.bindings.map(/** Only safely comparable complete native chords use the local formatter. */ binding => formatActionBinding(binding, environment, translate, true) ?? binding.value).join(", ") : "";
              assignmentText = chords ? translate("actions.globalAssignmentChords", {bindings: chords}) : translate("actions.globalAssignmentPresent");
            } else if (assignment?.presence === "unassigned") assignmentText = translate("actions.globalAssignmentAbsent");
            const message = `${registration} · ${assignmentText}${!actualPublished && assignment?.presence === "assigned" ? ` ${translate("actions.savedAssignmentUnavailable")}` : ""}`;
            if (publicationStatus.textContent !== message) publicationStatus.setText(message);
            publicationStatus.toggleClass("kplex-action-diagnostic-warning", desiredPublished && !actualPublished);
          }
          const diagnostics = this.diagnosticsFor(environment.keyConvention).get(action.id);
          diagnosticStatus.empty();
          for (const binding of bindings) {
            const diagnostic = diagnostics?.get(actionBindingIdentity(binding));
            if (!diagnostic) continue;
            const text = formatActionBinding(binding, environment, translate, true) ?? binding.value;
            for (const label of this.diagnosticLabels({...diagnostic, obsidian: []})) diagnosticStatus.createDiv({cls: "kplex-action-diagnostic-error", text: translate("actions.bindingDiagnostic", {binding: text, message: label})});
            for (const self of [false, true]) for (const label of this.diagnosticLabels({local: [], obsidian: diagnostic.obsidian.filter(/** Self-publication stays neutral while external assignments remain visible warnings. */ item => item.self === self)})) diagnosticStatus.createDiv({cls: self ? "kplex-action-diagnostic-info" : "kplex-action-diagnostic-warning", text: translate("actions.bindingDiagnostic", {binding: text, message: label})});
          }
          const fingerprint = JSON.stringify([bindings, [...(diagnostics ?? [])], environment.keyConvention, preferences.publishedCommands[action.id], actualPublished, preferences.localBindings[action.id] !== undefined]);
          if (fingerprint === previous) { this.disableControls(setting.controlEl, disabled); this.renderStatus(status, action.id); return; }
          previous = fingerprint; this.clearControls(setting.controlEl);
          const pills = setting.controlEl.createDiv({ cls: "setting-command-hotkeys", attr: {role: "group", "aria-label": translate("actions.localShortcuts")} });
          for (const binding of bindings) {
            const text = formatActionBinding(binding, environment, translate, true) ?? binding.value;
            const pill = pills.createEl("button", { cls: "setting-hotkey", text, attr: { type: "button", "aria-label": translate("actions.removeBinding", { binding: text }) } });
            pill.disabled = disabled;
            const diagnostic = diagnostics?.get(actionBindingIdentity(binding));
            const labels = [translate("actions.removeBinding", {binding: text}), ...this.diagnosticLabels(diagnostic)];
            pill.setAttr("aria-label", labels.join(" ")); setTooltip(pill, labels.join("\n"));
            pill.toggleClass("has-conflict", Boolean(diagnostic?.local.length));
            pill.toggleClass("kplex-action-global-overlap", Boolean(diagnostic?.obsidian.some(/** Same-action publication is informational rather than an advisory warning. */ item => !item.self)));
            if (diagnostic?.local.length) setIcon(pill.createSpan({cls: "kplex-action-local-conflict"}), "alert-circle");
            if (diagnostic?.obsidian.length) {
              const advisory = diagnostic.obsidian.some(/** Same-action publication is informational rather than an advisory warning. */ item => !item.self);
              const indicator = pill.createSpan({cls: advisory ? "kplex-action-global-warning" : "kplex-action-global-self"});
              setIcon(indicator, advisory ? "globe" : "info");
            }
            pill.setAttr("data-kplex-action-control", `remove:${JSON.stringify(binding)}`);
            setIcon(pill.createSpan({ cls: "setting-hotkey-icon setting-delete-hotkey" }), "x");
            this.listen(pill, /** Remove the captured chord from fresh saved keys, preserving unrelated changes on retry. */ () => { if (!pill.disabled && this.rows.size) void this.save(action.id, draft => { const current = draft.localBindings[action.id] ?? ACTION_BINDING_DEFAULTS[action.id] ?? []; draft.localBindings[action.id] = current.filter(saved => JSON.stringify(saved) !== JSON.stringify(binding)); }, setting.settingEl.ownerDocument); });
          }
          if (!bindings.length) pills.createSpan({ cls: "setting-hotkey mod-empty", text: translate("actions.blank") });
          const add = this.icon(setting.controlEl, "plus-circle", translate("actions.addBinding"), /** Record one explicit addition while retaining the other saved assignments. */ () => {
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
    this.readDiagnostics();
    const group: GroupOwner = { live: true, query: "", filter: "all", rows: new Set(), release: [], refresh: /** Reconcile finite catalog rows only while their native group still exists. */ () => {
      for (const row of group.rows) {
        const action = row.action;
        if (!action) continue;
        const preferences = this.plugin.settings.actionPreferences, bindings = preferences.localBindings[action.id] ?? ACTION_BINDING_DEFAULTS[action.id] ?? [];
        const environment = readObsidianPresentationEnvironment(row.setting.settingEl.ownerDocument.defaultView ?? undefined);
        const text = `${translateActionText(translate, action.labelKey)} ${translateActionText(translate, action.descriptionKey)} ${action.id} ${bindings.map(binding => formatActionBinding(binding, environment, translate, true) ?? binding.value).join(" ")}`.toLocaleLowerCase();
        const match = (!group.query || text.includes(group.query.toLocaleLowerCase())) && (!group.chord || (group.capturedChords ?? [group.chord]).some(/** A search press can describe both logical and physical saved chords without conflating either mode. */ chord => actionMatchesShortcut(bindings, chord, environment.keyConvention)))
          && (group.filter === "all" || group.filter === "assigned" && bindings.length > 0 || group.filter === "unassigned" && !bindings.length || group.filter === "custom" && preferences.localBindings[action.id] !== undefined && bindings.length > 0 && actionPreferenceChanged(preferences, action) || group.filter === "conflicts" && [...(this.diagnosticsFor(environment.keyConvention).get(action.id)?.values() ?? [])].some(/** Include only active local conflicts or external native assignment advisories. */ diagnostic => diagnostic.local.length || diagnostic.obsidian.some(/** Same-action publication is informational rather than an advisory warning. */ item => !item.self)));
        row.setting.settingEl.toggleClass("kplex-action-filtered", !match);
      }
      if (group.conflictPill) {
        const environment = readObsidianPresentationEnvironment(group.conflictPill.ownerDocument.defaultView ?? undefined);
        const count = [...this.diagnosticsFor(environment.keyConvention).values()].filter(/** The native filter count covers actions, excluding neutral same-action publication. */ bindings => [...bindings.values()].some(/** Include only active local conflicts or external native assignment advisories. */ diagnostic => diagnostic.local.length || diagnostic.obsidian.some(/** Same-action publication is informational rather than an advisory warning. */ item => !item.self))).length;
        group.conflictPill.setText(translate("actions.filter.conflictCount", {count}));
      }
      if (group.nativeStatus) group.nativeStatus.setText(this.nativeHotkeys.available && this.nativeHotkeys.complete ? "" : translate(this.nativeHotkeys.available ? "actions.globalHotkeysPartial" : "actions.globalHotkeysUnavailable"));
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
        
        for (const filter of ["all", "assigned", "custom", "unassigned", "conflicts"] as const) {
          const pill = filters.createEl("button", { cls: "filter-pill", text: filter === "conflicts" ? translate("actions.filter.conflictCount", {count: 0}) : translate(`actions.filter.${filter}`), attr: { type: "button", "aria-pressed": String(filter === group.filter), "data-kplex-action-filter": filter } });
          if (filter === "conflicts") { group.conflictPill = pill; pill.addClass("kplex-action-conflicts-filter"); }
          pill.toggleClass("is-active", filter === group.filter);
          const click = /** Change native group presentation without affecting the declarative definitions. */ (): void => {
            if (!group.live || group.search !== search || !search.inputEl.isConnected) return; group.filter = filter;
            for (const button of Array.from(filters.querySelectorAll<HTMLButtonElement>("button"))) { const selected = button === pill; button.setAttr("aria-pressed", String(selected)); button.toggleClass("is-active", selected); }
            group.refresh();
          };
          pill.addEventListener("click", click); group.release.push(() => pill.removeEventListener("click", click));
        }
        group.nativeStatus = setting.controlEl.createDiv({cls: "kplex-action-status"});
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
              toggle?.setValue(this.plugin.settings.actionPreferences[key]).setDisabled(this.saving || this.unsupported());
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
    this.releasePreferences?.(); this.releasePreferences = null; this.releaseNativeHotkeys?.(); this.releaseNativeHotkeys = null; this.clearNativeRefreshTimers(); this.diagnostics.clear(); this.capturedAliases.clear(); this.notices.clear(); this.retries.clear();
  }
}
