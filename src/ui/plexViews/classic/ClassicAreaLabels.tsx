/** Legacy Classic backdrop labels stay with its physical area interpretation. */
import type {Translator} from "../../../lang";
import type {PlexViewConfiguration} from "../../../core/plex/views/configuration";
import {classicFlipped} from "../../../core/plex/views/classic/configuration";
/** Shared chrome never assumes that every view has parent/child/lateral areas. */
export function ClassicAreaLabels({translate, configuration}: {translate: Translator; configuration?: PlexViewConfiguration}) {const flipped = classicFlipped(configuration); return <>
  <div className="kplex-zone-label zone-parent">{translate("app.zoneParents")}</div>
  <div className={`kplex-zone-label ${flipped ? "zone-right" : "zone-left"}`}>{translate("app.zoneFriendsPrevious")}</div>
  <div className={`kplex-zone-label ${flipped ? "zone-left" : "zone-right"}`}>{translate("app.zoneChallengersNext")}</div>
  <div className="kplex-zone-label zone-child">{translate("app.zoneChildren")}</div>
</>; }
