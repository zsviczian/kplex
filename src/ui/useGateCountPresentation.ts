/**
 * View-local badge text continuity across count revalidation. Four committed labels survive only
 * while their displayed values and node identity match; they never certify index/write readiness.
 * Unavailable inputs and changed values replace them immediately, and complete proof upgrades them.
 * An unknown marker never survives an available local/cache observation with the same lower bound.
 */
import { useLayoutEffect, useRef } from "react";
import type { GateSide, GateStats } from "../types";

type Label = Readonly<{ key: string; text: string | null; retained: boolean }>;
type Labels = Readonly<Record<GateSide, Label>>;
const sides: readonly GateSide[] = ["top", "bottom", "left", "right"];

/** Format actual coverage on first observation, preserving existing partial/local/cached notation. */
function countText(stat: GateStats[GateSide], structural: boolean): string | null {
  if (structural) return "0";
  if (!stat.visibleCount && stat.complete !== false) return null;
  if (stat.countUnavailable) return "…";
  if (stat.complete === false && stat.coverage !== "local" && stat.coverage !== "cached") {
    return !stat.visibleCount ? "…" : stat.shownCount === undefined ? `≥${stat.visibleCount}` : `${stat.shownCount}/≥${stat.visibleCount}`;
  }
  return stat.shownCount === undefined ? String(stat.visibleCount) : `${stat.shownCount}/${stat.visibleCount}`;
}

/**
 * Keep an already displayed value stable while only its coverage is temporarily weaker. The
 * retained label is explicitly cached presentation, not a renewed count proof. Snapshot only
 * committed renders, so speculative/aborted React work cannot become the next render's baseline.
 * Unknown markers carry no previous numerical observation and must yield to available counts.
 */
export function useGateCountPresentation(identity: string, gates: GateStats, structural: boolean, enabled: boolean, file?: object | null): Labels {
  const committed = useRef<Readonly<{ identity: string; file?: object | null; labels: Labels }> | null>(null);
  const previous = committed.current?.identity === identity && committed.current.file === file ? committed.current.labels : null;
  const labels = Object.fromEntries(sides.map(side => {
    const stat = gates[side], lateral = structural && (side === "left" || side === "right");
    const key = JSON.stringify([enabled, lateral, stat.visibleCount, stat.shownCount ?? null, !!stat.hasAny, !!stat.countUnavailable]);
    const old = previous?.[side];
    const current = countText(stat, lateral);
    const retained = !lateral && !stat.countUnavailable && stat.complete === false && old?.key === key
      && old.text !== "…" && old.text !== current;
    return [side, { key, text: enabled ? retained ? old.text : current : null, retained: !!retained }];
  })) as Record<GateSide, Label>;
  useLayoutEffect(/** Only this mounted node's four committed display values are retained. */ () => {
    committed.current = { identity, file, labels };
  }, [identity, file, labels]);
  return labels;
}
