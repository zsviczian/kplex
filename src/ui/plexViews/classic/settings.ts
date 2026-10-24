/** Compass's existing controls retain their exact flat/profile/appearance owners and bounds. */
import type {CanvasViewSettingsContribution} from "../settingsContributions";

export const classicSettingsContribution: CanvasViewSettingsContribution = {
  id: "classic",
  items: ({translate, areaTint}) => [
    {type: "group", heading: translate("view.arrangementSizing"), items: [
      {type: "page", name: translate("layout.simplifiedTitle"), desc: translate("layout.simplifiedHelp"),
        items: (["desktop", "tablet", "mobile"] as const).flatMap(device => (["leaf", "sidepanel"] as const).map(surface => ({
          name: translate("layout.arrangementScope", {device: translate(`typography.${device}`), surface: translate(surface === "leaf" ? "layout.mainTab" : "layout.sidepanel")}),
          control: {type: "toggle", key: `layout.${device}.${surface}.lateralArrangement` as const},
        })))},
      { name: translate("settings.ui.parent.maximum.height"), desc: translate("settings.ui.parent.rows.become.vertically.scrollable.above.this.heig"), control: {type: "slider", key: "parentMaxHeight", min: 140, max: 800, step: 20}},
      { name: translate("settings.ui.friend.challenger.maximum.height"), desc: translate("settings.ui.friend.and.challenger.lists.become.vertically.scrollable"), control: {type: "slider", key: "friendMaxHeight", min: 140, max: 800, step: 20}},
      { name: translate("settings.ui.sibling.maximum.height"), desc: translate("settings.ui.sibling.lists.become.vertically.scrollable.above.this.he"), control: {type: "slider", key: "siblingMaxHeight", min: 120, max: 700, step: 10}},
      { name: translate("settings.ui.sibling.relative.size"), desc: translate("settings.ui.scale.sibling.nodes.and.their.expanded.descendants.relat"), control: {type: "slider", key: "siblingRelativeSize", min: 30, max: 85, step: 5}},
      { name: translate("settings.ui.child.maximum.height"), desc: translate("settings.ui.child.rows.become.vertically.scrollable.above.this.heigh"), control: {type: "slider", key: "childMaxHeight", min: 160, max: 900, step: 20}},
      { name: translate("settings.ui.compact.view"), control: {type: "toggle", key: "compactView"}},
      { name: translate("settings.ui.minimum.link.length"), desc: translate("settings.ui.minimum.spacing.target.for.connected.nodes"), control: {type: "slider", key: "minLinkLength", min: 6, max: 40, step: 1}},
    ]},
    {type: "group", heading: translate("view.neighborsExpansion"), items: [
      { name: translate("settings.ui.show.siblings"), control: {type: "toggle", key: "renderSiblings"}},
    ]},
    {type: "group", heading: translate("view.areaTint"), items: [areaTint()]},
  ],
};
