/**
 * Host-free localization of physical Plex positions for gates and Sidecar hints.
 * These labels describe layout, not semantic relationship roles; callers own host effects.
 */
import type { PlainTranslationKey, Translator } from "../../lang";

const POSITION_LABELS = {
  above: "position.physicalAbove",
  below: "position.physicalBelow",
  top: "position.physicalTop",
  bottom: "position.physicalBottom",
  left: "position.physicalLeft",
  right: "position.physicalRight",
} as const satisfies Record<string, PlainTranslationKey>;

/** Translate a physical position before embedding it in another localized sentence. */
export function physicalPositionLabel(position: keyof typeof POSITION_LABELS, translate: Translator): string {
  return translate(POSITION_LABELS[position]);
}
