/** Bounded host presentation contributions. Registered functions receive detached values, not
 * a plugin, index, active leaf or mutation authority. All effects return to the captured host. */
import type {CanvasViewText, PlexViewStateAction} from "../../core/plex/views/contracts";
import type {PlexViewConfiguration, ViewConfigurationAddress, ViewConfigurationEdit} from "../../core/plex/views/configuration";
import type {PlainTranslationKey} from "../../lang";

export type CanvasViewContributionContext = Readonly<{viewId: string; state: unknown; configuration: PlexViewConfiguration}>;
export type CanvasViewCommand = Readonly<
  {kind: "state"; action: PlexViewStateAction}
  | {kind: "configuration"; address: ViewConfigurationAddress; edit: ViewConfigurationEdit}
  | {kind: "settings"; target?: string}
  | {kind: "help"; target: string}>;
/** Longer inert source is validated by the help profile rather than the small label limit. */
export type CanvasViewHelp = Readonly<{name: CanvasViewText; markdown: CanvasViewText}>;
export type CanvasViewAvailability = Readonly<{visible?: boolean; enabled?: boolean; unavailableReason?: CanvasViewText}>;
export type CanvasViewMenuItem = Readonly<{id: string} & (
  {kind: "separator"}
  | ({kind: "action"; label: CanvasViewText; icon?: string; checked?: boolean; command: CanvasViewCommand} & CanvasViewAvailability)
  | ({kind: "submenu"; label: CanvasViewText; icon?: string; items: readonly CanvasViewMenuItem[]} & CanvasViewAvailability))>;
export type CanvasViewChoice = Readonly<{id: string; label: CanvasViewText; selected: string; settings?: CanvasViewCommand; help?: CanvasViewCommand;
  options: readonly Readonly<{id: string; label: CanvasViewText; command: CanvasViewCommand} & CanvasViewAvailability>[]} & CanvasViewAvailability>;
/** Legacy scalar rails retain their catalog metadata. Addressed controls also support explicit
 * literal labels and checkbox values; both use the existing layout components and settings writer. */
export type CanvasViewLayoutControl = Readonly<{field: string; path?: readonly (string | number)[];
  labelKey?: PlainTranslationKey; captionKey?: PlainTranslationKey; hintKey?: PlainTranslationKey;
  label?: CanvasViewText; caption?: CanvasViewText; hint?: CanvasViewText} & (
    {kind?: "slider"; icon: string; min: number; max: number; step: number}
    | {kind: "checkbox"; state?: Readonly<{value: boolean; actionId: string}>})>;
export type CapturedCanvasViewCommand = Readonly<{run: () => Promise<CanvasViewCommandOutcome>}>;
export type CanvasViewCommandOutcome = Readonly<{status: "completed" | "unavailable" | "failed"; reason?: CanvasViewText}>;
export type CapturedCanvasViewMenuItem = Readonly<{id: string} & (
  {kind: "separator"}
  | {kind: "action"; label: CanvasViewText; icon?: string; checked?: boolean; enabled: boolean;
    unavailableReason?: CanvasViewText; command: CapturedCanvasViewCommand}
  | {kind: "submenu"; label: CanvasViewText; icon?: string; enabled: boolean; checked?: boolean; items: readonly CapturedCanvasViewMenuItem[]})>;
export type CapturedCanvasViewChoice = Readonly<{id: string; label: CanvasViewText; selected: string; enabled: boolean; settings?: CapturedCanvasViewCommand; help?: CapturedCanvasViewCommand;
  options: readonly Readonly<{id: string; label: CanvasViewText; enabled: boolean; unavailableReason?: CanvasViewText;
    command: CapturedCanvasViewCommand}>[]}>;
