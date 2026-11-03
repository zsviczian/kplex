/** One cache-only pin projection for toolbar, picker and shortcut feedback. Symbolic labels stay
 * independent of their current filenames; existing node styling remains the sole paint owner. */
import type {ResolvedSavedPin} from "../core/plex/periodicPins";
import type {PinPeriod} from "../core/plex/savedPins";
import type {Translator} from "../lang";
import type {KplexSettings} from "../settings";
import type {GraphPage} from "../types";
import {nodeListPresentation} from "./nodeListPresentation";
import type {PinnedNodeRow} from "./PinnedNodeBar";

/** Translate the three supported periods without localizing their persisted symbolic identities. */
export function periodicPinLabel(period: PinPeriod, translate: Translator): string {
  return translate(period === "day" ? "pins.today" : period === "week" ? "pins.thisWeek" : "pins.thisMonth");
}

/** Project only supplied cached facts. Missing periodic rows remain actionable to explain their
 * configuration or missing file; neither rendering nor hovering creates a replacement note. */
export function savedPinPresentation(row: ResolvedSavedPin, page: GraphPage | undefined, title: string | undefined,
  settings: KplexSettings, translate: Translator, activePath: string): PinnedNodeRow {
  const label = row.period ? periodicPinLabel(row.period, translate) : title ?? row.path ?? translate("pins.unsupported");
  const presentation = page ? nodeListPresentation(page, label, settings, row.period ? "calendar" : undefined) : null;
  const detail = row.state === "configuration" ? translate("pins.configurationRequired") : row.state === "unsupported" ? translate("pins.unsupported")
    : row.state === "missing" ? translate("pins.missingTarget", {path: row.path ?? ""}) : row.path ?? "";
  return {id: row.id, path: row.path, label: presentation?.label ?? label, icon: presentation?.icon ?? (row.period ? "calendar" : "file-question"),
    style: presentation?.style, active: row.path !== null && row.path === activePath, available: row.state === "ready", actionable: row.state === "ready" || !!row.period, detail};
}
