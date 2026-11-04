/** Native diagnostics controls edit only the enclosing detached preset draft. The preset editor
 * retains save/conflict/lifecycle ownership; layout and classification stay in the pure view. */

import {FormSetting as Setting} from "../../../adapters/obsidian/KplexModal";
import type {FacetDiagnostics} from "../../../core/plex/views/facets/contracts";
import {FACET_DIAGNOSTIC_ORDER} from "../../../core/plex/views/facets/presentation";
import type {Translator} from "../../../lang";

/** Rebuild on structural changes only. Native text-independent identities survive localization,
 * and combined mode hides the inapplicable inter-area orientation without erasing its value. */
export function renderDiagnosticSettings(body: HTMLElement, read: () => FacetDiagnostics | undefined, t: Translator,
  change: (value: FacetDiagnostics, structural: boolean) => void): void {
  const current = read() ?? {};
  new Setting(body).setName(t("facets.combineDiagnostics")).setDesc(t("facets.combineDiagnosticsHelp")).addToggle(/** Shared defaults change only after the parent native Save. */ input => input
    .setValue(current.combined ?? true).onChange(/** Changing mode rerenders the conditional arrangement control. */ combined => change({...read(), combined}, true)));
  new Setting(body).setName(t("facets.diagnosticsSide")).addDropdown(/** Physical sides are stable data, not localized identifiers. */ input => input
    .addOptions({top: t("position.above"), right: t("position.right"), bottom: t("position.below"), left: t("position.left")})
    .setValue(current.side ?? "right").onChange(/** Reject values outside the declared physical docking contract. */ side => {
      if (side === "top" || side === "right" || side === "bottom" || side === "left") change({...read(), side}, false);
    }));
  if (current.combined === false) new Setting(body).setName(t("facets.diagnosticsArrangement")).addDropdown(/** Orientation affects distinct frames only. */ input => input
    .addOptions({vertical: t("facets.vertical"), horizontal: t("facets.horizontal")}).setValue(current.orientation ?? "vertical")
    .onChange(/** Preserve the other saved dock values. */ orientation => {
      if (orientation === "horizontal" || orientation === "vertical") change({...read(), orientation}, false);
    }));
  new Setting(body).setName(t("facets.diagnosticsShowEmpty")).addToggle(/** Undefined retains the established separate-mode empty-region policy. */ input => input
    .setValue(current.showEmpty ?? true).onChange(/** Explicit hiding never hides a populated diagnostic status. */ showEmpty => change({...read(), showEmpty}, false)));
  const order = current.order ?? FACET_DIAGNOSTIC_ORDER;
  for (const [index, status] of order.entries()) new Setting(body).setName(t(status === "unresolved" ? "facets.cannotClassify" : `facets.${status}`))
    .addButton(/** Reorder by stable identity; classifications are never rewritten. */ button => button.setButtonText(t("facets.moveUp")).setDisabled(index === 0)
      .onClick(/** The parent refreshes the short native list after a move. */ () => {
        if (!index) return;
        const next = [...order];[next[index - 1], next[index]] = [next[index], next[index - 1]];
        change({...read(), order: next}, true);
      }));
}
