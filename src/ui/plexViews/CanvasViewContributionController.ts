/** Per-canvas contribution dispatcher. The existing session owns selection/state; the existing
 * queued writer owns configuration. Captured callbacks cannot borrow another leaf or document. */
import type {PlexViewSession} from "../../application/PlexViewSession";
import type {PlexViewDefinition} from "../../core/plex/views/contracts";
import {boundedViewState} from "../../core/plex/views/state";
import {readViewConfiguration, readViewConfigurationAt, type ViewConfigurationAddress,
  type ViewConfigurationEdit, type ViewConfigurationExpected} from "../../core/plex/views/configuration";
import type {CanvasViewSettingsRegistry} from "./settingsContributions";
import type {CanvasViewCommand, CanvasViewContributionContext, CapturedCanvasViewCommand,
  CapturedCanvasViewMenuItem, CapturedCanvasViewChoice, CanvasViewHelp} from "./contributionContracts";
import {copyCanvasViewCommand, validateCanvasViewMenus, validateCanvasViewChoices, validCanvasViewHelp} from "./contributionValidation";

export type CanvasViewContributionPorts = Readonly<{
  settings: () => unknown;
  mounted: () => boolean;
  beforePresentationChange: () => void;
  update: (id: string, address: ViewConfigurationAddress, edit: ViewConfigurationEdit, expected?: ViewConfigurationExpected) => Promise<void>;
  openSettings: (id: string, target?: string) => boolean;
  openHelp?: (id: string, target: string, help: CanvasViewHelp, current: () => boolean) => boolean;
  failed: (error: unknown) => void;
}>;

export class CanvasViewContributionController {
  private disposed = false;
  /** No subscriptions or global state; the owning App disposes this generation on unmount. */
  constructor(readonly session: PlexViewSession, readonly registry: CanvasViewSettingsRegistry, private readonly ports: CanvasViewContributionPorts) {}
  /** Detached snapshots cannot mutate the session or the live settings object. */
  context(): CanvasViewContributionContext | null {
    if (this.disposed || !this.ports.mounted() || this.registry.definition(this.session.definition.id) !== this.session.definition) return null;
    const configuration = readViewConfiguration(this.session.definition, this.ports.settings());
    return {viewId: this.session.definition.id, state: boundedViewState(this.session.state), configuration};
  }
  /** Project every registered view and its optional choices without selecting inactive views.
   * One choice becomes the view's submenu; multiple choices keep their labelled groups. The
   * contribution registry remains the only source of subviews, with no Facets-specific branch. */
  selectionMenus(): readonly CapturedCanvasViewMenuItem[] {
    if (!this.context()) return [];
    return [...this.session.registry.available].sort(/** Keep the default view first, matching the shared selector. */ (a, b) =>
      Number(b.id === this.session.registry.fallbackId) - Number(a.id === this.session.registry.fallbackId)).map(definition => {
      const context: CanvasViewContributionContext = {viewId: definition.id,
        state: boundedViewState(this.session.stateFor(definition.id)), configuration: readViewConfiguration(definition, this.ports.settings())};
      const active = this.session.definition === definition;
      const label = {key: definition.labelKey};
      try {
        const choices = this.registry.contribution(definition)?.choices?.(context) ?? [];
        validateCanvasViewChoices(choices);
        const groups = choices.filter(/** Hidden choices never become native actions. */ choice => choice.visible !== false).map(choice => ({
          id: choice.id, kind: "submenu" as const, label: choice.label, enabled: choice.enabled !== false,
          items: choice.options.filter(/** Preserve the same admitted options as the shared selector. */ option => option.visible !== false).map(option => ({
            id: option.id, kind: "action" as const, label: option.label, enabled: choice.enabled !== false && option.enabled !== false,
            checked: active && option.id === choice.selected, unavailableReason: option.unavailableReason,
            command: this.captureSelection(definition, context, option.command),
          })),
        }));
        if (groups.length) return {id: definition.id, kind: "submenu" as const, label, icon: definition.icon, checked: active, enabled: true,
          items: groups.length === 1 && groups[0].enabled ? groups[0].items : groups};
      } catch (error) {this.ports.failed(error);}
      return {id: definition.id, kind: "action" as const, label, icon: definition.icon, checked: active, enabled: true,
        command: this.captureSelection(definition, context)};
    });
  }

  /** Capture exact source session/revision and target settings/state. Native editor preflight
   * remains requestSelection-owned; a rejected or superseded transition never runs a subview command. */
  private captureSelection(definition: PlexViewDefinition, context: CanvasViewContributionContext, request?: CanvasViewCommand): CapturedCanvasViewCommand {
    const current = this.session.capture(), revision = this.session.getSnapshot(), expected = JSON.stringify(context);
    const command = request ? copyCanvasViewCommand(request) : undefined;
    let used = false;
    /** Recheck inactive target configuration too: a menu may outlive an incoming settings change. */
    const targetCurrent = (): boolean => this.registry.definition(definition.id) === definition && JSON.stringify({viewId: definition.id,
      state: boundedViewState(this.session.stateFor(definition.id)), configuration: readViewConfiguration(definition, this.ports.settings())}) === expected;
    return {run: async () => {
      if (used || this.disposed || !this.ports.mounted() || !current() || this.session.getSnapshot() !== revision || !targetCurrent()) return {status: "unavailable"};
      used = true;
      try {
        if (!await this.session.requestSelection(definition.id)) return {status: "unavailable"};
        if (this.disposed || !this.ports.mounted() || this.session.definition !== definition || !targetCurrent()) return {status: "unavailable"};
        return command ? await this.capture(command).run() : {status: "completed"};
      } catch (error) {this.ports.failed(error);return {status: "failed"};}
    }};
  }
  /** Capture exact session/definition/revision and configuration; a stale menu is inert. */
  capture(request: CanvasViewCommand): CapturedCanvasViewCommand {
    const command = copyCanvasViewCommand(request), context = this.context(), definition = this.session.definition;
    const current = this.session.capture(), revision = this.session.getSnapshot(), configuration = JSON.stringify(context?.configuration);
    const expected = command.kind === "configuration" && context?.configuration.status === "available"
      ? readViewConfigurationAt(definition, this.ports.settings(), command.address) : undefined;
    let used = false;
    return {run: async () => {
      if (used || !context || this.disposed || !current() || !this.ports.mounted() || this.session.definition !== definition
        || this.session.getSnapshot() !== revision || JSON.stringify(this.context()?.configuration) !== configuration) return {status: "unavailable"};
      used = true;
      try {
        if (command.kind === "settings") return {status: this.ports.openSettings(definition.id, command.target) ? "completed" : "unavailable"};
        if (command.kind === "help") {
          const help = this.registry.contribution(definition)?.help?.(context, command.target);
          if (!help || !validCanvasViewHelp(help) || !this.ports.openHelp) return {status: "unavailable"};
          const alive = /** A pending renderer/edit handoff keeps the exact opening canvas, preset and configuration. */ (): boolean => !this.disposed && current() && this.ports.mounted()
            && this.session.definition === definition && this.session.getSnapshot() === revision && JSON.stringify(this.context()?.configuration) === configuration;
          return {status: this.ports.openHelp(definition.id, command.target, help, alive) ? "completed" : "unavailable"};
        }
        if (context.configuration.status !== "available") return {status: "unavailable"};
        if (command.kind === "configuration") {
          this.ports.beforePresentationChange();
          await this.ports.update(definition.id, command.address, command.edit, expected);
          return {status: "completed"};
        }
        if (!definition.reduceState) return {status: "unavailable"};
        const result = definition.reduceState(context.state, command.action, context.configuration);
        if (result.status !== "updated") return result;
        const next = boundedViewState(result.state);
        if (result.state !== null && next === null) return {status: "unavailable"};
        this.ports.beforePresentationChange();
        return {status: this.session.updateState(next) ? "completed" : "unavailable"};
      } catch (error) {this.ports.failed(error); return {status: "failed"};}
    }};
  }
  /** Native menu composition receives only admitted labels and captured, one-shot commands. */
  menus(): readonly CapturedCanvasViewMenuItem[] {
    const context = this.context(); if (!context) return [];
    try {
      const rows = this.registry.contribution(this.session.definition)?.menus?.(context) ?? [];
      validateCanvasViewMenus(rows);
      const capture = (items: typeof rows): CapturedCanvasViewMenuItem[] => items.flatMap<CapturedCanvasViewMenuItem>(row => {
        if (row.kind === "separator") return [{id: row.id, kind: "separator"}];
        if (row.visible === false) return [];
        const common = {id: row.id, label: {...row.label}, icon: row.icon, enabled: row.enabled !== false};
        return row.kind === "submenu" ? [{...common, kind: "submenu", items: capture(row.items)}]
          : [{...common, kind: "action", checked: row.checked, unavailableReason: row.unavailableReason,
            command: this.capture(row.command)}];
      });
      return capture(rows);
    } catch (error) {this.ports.failed(error); return [];}
  }
  /** Shared choices are the same requests as native menu commands, scoped to this panel's canvas. */
  choices(): readonly CapturedCanvasViewChoice[] {
    const context = this.context(); if (!context) return [];
    try {
      const choices = this.registry.contribution(this.session.definition)?.choices?.(context) ?? [];
      validateCanvasViewChoices(choices);
      return choices.filter(choice => choice.visible !== false).map(choice => ({id: choice.id, label: {...choice.label},
        selected: choice.selected, enabled: choice.enabled !== false, ...(choice.settings ? {settings: this.capture(choice.settings)} : {}),
        ...(choice.help ? {help: this.capture(choice.help)} : {}), options: choice.options.filter(option => option.visible !== false)
          .map(option => ({id: option.id, label: {...option.label}, enabled: option.enabled !== false,
            unavailableReason: option.unavailableReason, command: this.capture(option.command)}))}));
    } catch (error) {this.ports.failed(error); return [];}
  }
  /** Retire callbacks immediately; no host/menu/subscription survives its App generation. */
  dispose(): void {this.disposed = true;}
}
