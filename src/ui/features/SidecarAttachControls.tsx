/**
 * Host-free controls for explicitly attaching an adjacent native pane. The caller supplies
 * eligibility, localized labels, icons and actions; arrows show the initial synchronization flow.
 * Native workspace ownership and subsequent bidirectional follow remain with the host.
 */
import type { ReactNode } from "react";

type Position = "left" | "right" | "above" | "below";
const OUTWARD = { left: "arrow-big-left-dash", right: "arrow-big-right-dash", above: "arrow-big-up-dash", below: "arrow-big-down-dash" } as const;
const INWARD = { left: "arrow-big-right-dash", right: "arrow-big-left-dash", above: "arrow-big-down-dash", below: "arrow-big-up-dash" } as const;

/** Render only supported initial flows; an empty pane can receive a center but cannot supply one. */
export function SidecarAttachControls(props: {
  position: Position; toLeaf: boolean; toPlex: boolean;
  toLeafLabel: string; toPlexLabel: string;
  icon: (name: string) => ReactNode;
  onToLeaf: () => void; onToPlex: () => void;
}) {
  return <>
    {props.toLeaf && <button type="button" data-kplex-sidecar-attach="to-leaf" aria-label={props.toLeafLabel} onClick={props.onToLeaf}>{props.icon(OUTWARD[props.position])}</button>}
    {props.toPlex && <button type="button" data-kplex-sidecar-attach="to-plex" aria-label={props.toPlexLabel} onClick={props.onToPlex}>{props.icon(INWARD[props.position])}</button>}
  </>;
}
