/** Static native Settings composition. Pure view definitions never import Obsidian or receive host objects. */
import type {SettingDefinition, SettingDefinitionItem, SettingDefinitionPage} from "obsidian";
import type {DeclarativeSettingKey} from "../../settings";
import type {Translator} from "../../lang";
import type {PlexViewRegistry} from "../../core/plex/views/registry";
import type {PlexViewDefinition} from "../../core/plex/views/contracts";
import {viewConfigurationKey} from "../../core/plex/views/configuration";
import {builtInPlexViews} from "./builtins";
import {classicSettingsContribution} from "./classic/settings";
import {viewLabel} from "./labels";

export type CanvasViewSettingsContext = Readonly<{
  translate: Translator;
  areaTint: () => SettingDefinition<DeclarativeSettingKey>;
  key: (field: string) => `canvasView:${string}:${string}`;
}>;
export type CanvasViewSettingsContribution = Readonly<{
  id: string;
  items: (context: CanvasViewSettingsContext) => SettingDefinitionItem<DeclarativeSettingKey>[];
}>;

/** Declarative keys contain only registered type/field identities, never saved payloads or runtime state. */
export function canvasViewControl(key: string): {id: string; field: string} | null {
  const match = /^canvasView:([a-z][a-z0-9.-]{0,79}):([a-z][a-zA-Z0-9-]{0,63})$/.exec(key);
  return match && viewConfigurationKey(match[2]) ? {id: match[1], field: match[2]} : null;
}

export class CanvasViewSettingsRegistry {
  private readonly contributions = new Map<string, CanvasViewSettingsContribution>();
  /** Close registration before creating a Settings/native-session lifetime. Tests construct independent registries. */
  constructor(readonly views: PlexViewRegistry, contributions: readonly CanvasViewSettingsContribution[]) {
    for (const contribution of contributions) {
      if (!views.has(contribution.id) || this.contributions.has(contribution.id)) throw new Error("Invalid view settings contribution");
      this.contributions.set(contribution.id, contribution);
    }
  }
  /** Never resolve an unknown settings write to the fallback definition. */
  definition(id: string): PlexViewDefinition | undefined { return this.views.has(id) ? this.views.resolve(id) : undefined; }
  /** Native page/search rendering consumes the same finite contributions; no per-view branches in the tab. */
  pages(context: Omit<CanvasViewSettingsContext, "key">): SettingDefinitionPage<DeclarativeSettingKey>[] {
    return this.views.available.flatMap(definition => {
      const contribution = this.contributions.get(definition.id);
      if (!contribution) return [];
      const key = (field: string): `canvasView:${string}:${string}` => {
        if (!viewConfigurationKey(field) || !definition.configuration || !Object.prototype.hasOwnProperty.call(definition.configuration.fields, field))
          throw new Error("Unknown view configuration field");
        return `canvasView:${definition.id}:${field}`;
      };
      return [{type: "page", name: viewLabel(definition.labelKey, context.translate),
        ...(definition.configuration ? {desc: context.translate("view.settingsScope")} : {}), items: contribution.items({...context, key})}];
    });
  }
}

export const builtInCanvasViewSettings = new CanvasViewSettingsRegistry(builtInPlexViews, [classicSettingsContribution]);
