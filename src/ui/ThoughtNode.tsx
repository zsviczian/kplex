/**
 * Plex node and gate presentation with localized accessibility and interaction hints. Uncertified
 * counts display lower bounds; count completeness never grants relationship editing coverage. Physical gate
 * labels are layout copy; semantic roles, coverage and drag effects belong to callers. Keyboard selection
 * is distinct from the central node and uses caller-supplied occurrence identity. Visible text shares
 * the density-independent geometry limit, preserving prefixes, ellipsis and center allowance.
 * The final image boundary rechecks consent before producing a src, including retained cached props.
 * A separately referenced accessible name avoids Obsidian's competing node tooltip; visible labels
 * retain the compact browser title, while gate hints and explicit page previews keep their owners.
 * Optional native body dragging preserves embedded editor input and delegates its host payload.
 * Corner actions receive the original stopped click event so caller-owned modifier intent survives.
 * Relation groups replace ordinary gates with an external member count and an unfold accessible name.
 * Revalidation retains only this mounted node's unchanged badge text as cached presentation;
 * native incarnation/value changes retire it, independently of index and relationship-write proof.
 * Branch chevrons and Markdown section plus/minus controls remain separate, with shared gesture
 * isolation and caller-owned actions. This component owns neither traversal nor source loading.
 */
import {physicalGateStats} from "./plexViews/measurement";
import {thoughtCornerRadius} from "./plexViews/nodeConnections";
import { useId, type CSSProperties, type DragEvent as ReactDragEvent, type MouseEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import type { GateSide, NodeVisual, PositionedNode } from "../types";
import {MeasuredNodeBadge} from "./plexViews/MeasuredNodeBadge";
import {NodeStatus} from "./features/NodeStatus";
import { nodePaint, nodePaintFallbacks } from "../index/style";
import type { KplexSettings } from "../settings";
import { effectiveLabelLimit, nodeLabelFontSize, gateDiameter } from "./layout";
import { ObsidianIcon } from "./ObsidianIcon";
import type { Translator } from "../lang";
import { physicalPositionLabel } from "./features/positionPresentation";
import { canDisplayNodeImage } from "../core/plex/nodeImagePolicy";
import { useGateCountPresentation } from "./useGateCountPresentation";

/** One caller-owned disclosure action. Separate branch/section instances share event isolation,
 * while their appearance and accessible labels preserve the distinction between the two jobs. */
type ThoughtDisclosure = {kind?: "branch"; hasChildren: boolean; expanded: boolean; hiddenDescendantCount: number;
  onToggle: () => void; expandedTitle?: string; foldedTitle?: string};

const GATES: GateSide[] = ["top", "bottom", "left", "right"];
export type ConnectionDragState = "normal" | "candidate" | "blocked" | "origin";

/** Render localized nodes/gates, withholding denied image destinations before any DOM src assignment. */
export function ThoughtNode({
  node,
  settings,
  selected,
  keyboardSelected = false,
  keyboardId,
  highlighted,
  dimmed,
  highlightedGates,
  hideGates = false,
  dragging,
  flair = false,
  connectionState = "normal",
  onActivate,
  onOpen,
  onHoverNode,
  onHoverGate,
  onHoverEnd,
  onHoverPreview,
  onGatePointerDown,
  onNodePointerDown,
  nativeDraggable = false,
  onNativeDragStart,
  onNativeDragEnd,
  onContextMenu,
  sectionFold,
  branchFold,
  branchStatus,
  branchStatusHint,
  badgeColorRevision = 0,
  visual,
  content,
  cornerAction,
  translate,
}: {
  node: PositionedNode;
  settings: KplexSettings;
  selected: boolean;
  keyboardSelected?: boolean;
  keyboardId?: string;
  highlighted: boolean;
  dimmed: boolean;
  highlightedGates: ReadonlySet<GateSide>;
  /** Scene-scoped appearance only; canonical ports/counts and node actions remain available. */
  hideGates?: boolean;
  dragging?: boolean;
  flair?: boolean;
  connectionState?: ConnectionDragState;
  onActivate: (node: PositionedNode, event: MouseEvent<HTMLDivElement>) => void;
  onOpen: (node: PositionedNode, event: MouseEvent<HTMLDivElement>) => void;
  onHoverNode: (node: PositionedNode, event: ReactPointerEvent) => void;
  onHoverGate: (node: PositionedNode, gate: GateSide, event: ReactPointerEvent) => void;
  onHoverEnd: () => void;
  onHoverPreview: (node: PositionedNode, target: HTMLElement, event: PointerEvent) => void;
  onGatePointerDown: (node: PositionedNode, gate: GateSide, event: ReactPointerEvent<HTMLSpanElement>) => void;
  onNodePointerDown: (node: PositionedNode, event: ReactPointerEvent<HTMLDivElement>) => void;
  nativeDraggable?: boolean;
  onNativeDragStart?: (node: PositionedNode, event: ReactDragEvent<HTMLDivElement>) => void;
  onNativeDragEnd?: () => void;
  onContextMenu?: (node: PositionedNode, event: MouseEvent<HTMLDivElement>) => void;
  visual?: NodeVisual;
  content?: ReactNode;
  cornerAction?: {
    icon: string;
    label: string;
    disabled?: boolean;
    onClick: (event: MouseEvent<HTMLButtonElement>) => void;
  };
  translate: Translator;
  sectionFold?: ThoughtDisclosure;
  branchFold?: ThoughtDisclosure;
  /** Optional hierarchy coverage/reference label; canonical note text and editor content are unchanged. */
  branchStatus?: string;
  /** Explanation of coverage/cycle status, independent of counts and relationship authority. */
  branchStatusHint?: string;
  badgeColorRevision?: number;
}) {
  const accessibleNameId = useId();
  const gateStats = physicalGateStats(node);
  const gateLabels = useGateCountPresentation(node.page.path, gateStats, !!(node.page.isTag || node.page.isFolder), settings.showNeighborCount, node.page.file);
  // Cached props can outlive resolution. Remove the image before React can assign a denied src.
  if (visual && !canDisplayNodeImage(visual.path, settings.allowRemoteNodeImages)) visual = undefined;
  const style = node.style;
  const isSection = node.page.transient?.kind === "section";
  const group = node.page.transient?.kind === "group" ? node.page.transient : null;
  const strokeStyle = style.strokeStyle === "dashed" ? "dashed" : style.strokeStyle === "dotted" ? "dotted" : "solid";
  const prefix = style.prefix ?? "";
  const label = `${prefix}${node.label}`;
  const max = effectiveLabelLimit(style.maxLabelLength ?? 30, node.role === "center");
  const display = label.length > max ? `${label.slice(0, Math.max(1, max - 1))}…` : label;
  const click = (e: MouseEvent<HTMLDivElement>) => { e.stopPropagation(); onActivate(node, e); };
  /** Both controls stop native-body gestures before dispatching their distinct shared action. */
  const disclosure = (fold: ThoughtDisclosure | undefined, branch = false): ReactNode => !fold?.hasChildren ? null : <button
    type="button"
    className={`kplex-section-fold-handle${branch || fold.kind === "branch" ? " is-branch-disclosure" : ""}${branch && node.controlReserve ? " has-expanded-hit-target" : ""}${fold.expanded ? " is-expanded" : " is-folded"}`}
    aria-expanded={fold.expanded}
    aria-label={fold.expanded ? fold.expandedTitle ?? translate("node.foldSectionChildren")
      : `${fold.foldedTitle ?? translate("node.unfoldSectionChildren")}${fold.hiddenDescendantCount ? ` · ${translate("node.hiddenCount", {count: fold.hiddenDescendantCount})}` : ""}`}
    onPointerDown={/** Disclosure input never starts node dragging. */ (e: ReactPointerEvent<HTMLButtonElement>) => { e.preventDefault();e.stopPropagation(); }}
    onClick={/** Exactly one caller action; note activation cannot receive this click. */ (e: MouseEvent<HTMLButtonElement>) => { e.preventDefault();e.stopPropagation();fold.onToggle(); }}
    onDoubleClick={/** A disclosure cannot also open the document. */ (e: MouseEvent<HTMLButtonElement>) => { e.preventDefault();e.stopPropagation(); }}
  >{(branch || fold.kind === "branch") && <span className="kplex-branch-disclosure-symbol"><ObsidianIcon name={fold.expanded ? "chevron-down" : "chevron-right"} size={12} /></span>}</button>;
  const paint = nodePaint(style, nodePaintFallbacks(node));
  const gateSize = gateDiameter(style);
  const nodeCss = {
    left: node.x - node.width / 2,
    top: node.y - node.height / 2,
    width: node.width,
    height: node.height,
    background: isSection || content ? undefined : paint.background,
    color: isSection || content ? undefined : paint.foreground,
    borderColor: isSection || content ? undefined : paint.border,
    borderWidth: isSection ? undefined : `${style.strokeWidth ?? 1}px`,
    borderStyle: isSection ? undefined : strokeStyle,
    borderRadius: isSection ? undefined : thoughtCornerRadius(style, node.role === "center"),
    fontSize: `${nodeLabelFontSize(style.fontSize ?? 18, node.role === "center", settings.baseFontSize)}px`,
    "--kplex-gate-size": `${gateSize}px`,
    "--kplex-gate-stroke": paint.gateStroke,
    "--kplex-gate-fill": paint.gateFill,
    "--kplex-section-level": String(node.page.transient?.kind === "section" ? (node.page.transient.level ?? 1) : 0),
  } as CSSProperties;

  const classes = [
    "kplex-thought",
    `kplex-role-${node.role}`,
    selected ? "is-selected" : "",
    keyboardSelected ? "is-keyboard-selected" : "",
    highlighted ? "is-highlighted" : "",
    dimmed ? "is-dimmed" : "",
    dragging ? "is-dragging" : "",
    flair ? "is-new-flair" : "",
    connectionState !== "normal" ? `is-connect-${connectionState}` : "",
    node.page.isFolder || node.page.isTag ? "is-structural-thought" : "",
    isSection ? "is-kplex-section" : "",
    group ? "is-relation-group" : "",
    visual ? "has-node-visual" : "",
    content ? "has-embedded-content" : "",
    visual?.mode === "replace" ? "is-node-image-only" : "",
  ].filter(Boolean).join(" ");

  return <div
    className={classes}
    style={nodeCss}
    data-kplex-path={node.page.path}
    role={group ? "button" : undefined}
    aria-label={group ? translate("groups.unfold", { name: node.label, count: group.groupMembers?.length ?? 0 }) : undefined}
    data-kplex-keyboard-id={keyboardId}
    aria-current={keyboardSelected ? "true" : undefined}
    draggable={nativeDraggable}
    onDragStart={/** Only the thought body delegates outbound dragging; embedded editors own their events. */ (event: ReactDragEvent<HTMLDivElement>) => {
      const target = event.target as Element;
      if (target.closest(".kplex-thought-embedded-content")) return;
      if (!nativeDraggable || target.closest("button, [data-kplex-gate]")) {
        event.preventDefault();
        return;
      }
      onNativeDragStart?.(node, event);
    }}
    onDragEnd={/** Native completion may already have released the host; the caller's cleanup is idempotent. */ () => onNativeDragEnd?.()}
    onPointerDown={(e: ReactPointerEvent<HTMLDivElement>) => { onNodePointerDown(node, e); }}
    onPointerEnter={(e: ReactPointerEvent<HTMLDivElement>) => {
      onHoverNode(node, e);
      // The surface retains this occurrence so Ctrl/Cmd also works after the pointer stops.
      onHoverPreview(node, e.currentTarget, e.nativeEvent);
    }}
    onPointerLeave={() => { onHoverEnd(); }}
    onClick={click}
    onDoubleClick={(e: MouseEvent<HTMLDivElement>) => { e.stopPropagation(); onOpen(node, e); }}
    onContextMenu={(e: MouseEvent<HTMLDivElement>) => {
      const target = e.target as Element;
      if (target.closest("button, [data-kplex-gate]")) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      if (onContextMenu) {
        e.preventDefault();
        e.stopPropagation();
        onContextMenu(node, e);
      }
    }}
    aria-labelledby={group ? undefined : accessibleNameId}
  >
    <span id={accessibleNameId} className="kplex-accessible-name">{group ? node.label : translate("node.accessibleLabel", { label: node.label, path: node.page.path })}
      {node.viewBadge ? ` ${node.viewBadge.label}. ${node.viewBadge.description ?? node.viewDescription ?? ""}` : node.viewDescription ? ` ${node.viewDescription}` : ""}
      {branchStatus ? ` ${branchStatus}. ${branchStatusHint ?? ""}` : ""}</span>
    {node.viewBadge && <MeasuredNodeBadge badge={node.viewBadge} colorRevision={badgeColorRevision} />}
    {content ? <div
      className="kplex-thought-embedded-content"
      onPointerDown={(e: ReactPointerEvent<HTMLDivElement>) => e.stopPropagation()}
      onClick={(e: MouseEvent<HTMLDivElement>) => e.stopPropagation()}
      onDoubleClick={(e: MouseEvent<HTMLDivElement>) => e.stopPropagation()}
      onContextMenu={(e: MouseEvent<HTMLDivElement>) => e.stopPropagation()}
    >{content}</div> : <span className={`kplex-thought-label${settings.wrapNodeLabels ? " is-two-line" : ""}`}>
      {node.page.transient?.kind === "section"
        ? <span className="kplex-section-heading-mark" aria-hidden="true">{(() => {
          const level = node.page.transient?.level ?? 1;
          return level <= 3 ? "#".repeat(level) : `H${level}`;
        })()}</span>
        : <>
          {visual?.mode === "thumbnail" && <span className="kplex-node-visual is-thumbnail" title={visual.alt}>
            <img src={visual.src} alt="" loading="lazy" decoding="async" draggable={false} />
          </span>}
          {!visual || visual.mode !== "replace" ? (style.icon && <ObsidianIcon name={style.icon} size={node.role === "center" ? 18 : 13} className="kplex-node-icon" />) : null}
        </>}
      {visual?.mode === "replace"
        ? <span className="kplex-node-visual is-replace" title={visual.alt}>
          <img src={visual.src} alt={visual.alt} loading="lazy" decoding="async" draggable={false} />
        </span>
        : <span className="kplex-thought-text" title={label}>{display}</span>}
    </span>}
    {cornerAction && <button
      type="button"
      className="kplex-thought-corner-action"
      aria-label={cornerAction.label}
      disabled={cornerAction.disabled}
      onPointerDown={(e: ReactPointerEvent<HTMLButtonElement>) => { e.stopPropagation(); }}
      onClick={(e: MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        e.stopPropagation();
        cornerAction.onClick(e);
      }}
    ><ObsidianIcon name={cornerAction.icon} size={10} /></button>}
    {disclosure(sectionFold)}
    {disclosure(branchFold, true)}
    {branchStatus && node.viewBadge?.presentation !== "status" && <NodeStatus label={branchStatus} description={branchStatusHint} />}
    {group && <span className="kplex-group-count" aria-hidden="true">{group.groupMembers?.length}</span>}
    {!group && !hideGates && GATES.filter(gate => !node.physicalPorts || Boolean(node.physicalPorts[gate])).map((gate) => {
      // Structural nodes have no lateral relationship vocabulary, even before other counts close.
      const semanticGate = node.physicalPorts?.[gate];
      const structuralLateral = (node.page.isTag || node.page.isFolder) && (semanticGate ? semanticGate === "left" || semanticGate === "right" : gate === "left" || gate === "right");
      const stat = structuralLateral ? { visibleCount: 0, hasAny: false, complete: true } : gateStats[gate];
      const gateDisabled = Boolean(node.page.transient);
      const gateLabel = physicalPositionLabel(gate, translate);
      const gateHint = node.page.isTag
        ? translate("node.gateTagDisabled", { gate: gateLabel })
        : node.page.isFolder
          ? (semanticGate ? semanticGate === "child" : gate === "bottom")
            ? translate("node.gateFolderChild")
            : translate("moveNode.gate")
          : stat.hasAny || stat.complete === false
            ? translate("node.gateVisible", { gate: gateLabel, count: stat.visibleCount })
            : translate("node.gateEmpty", { gate: gateLabel });
      const gateTitle = stat.countUnavailable ? `${gateLabel} · ${translate("node.gateHostUnavailable")}`
        : gateLabels[gate].retained ? `${gateHint} · ${translate("node.gateCachedCount")}`
        : stat.coverage === "cached" ? `${gateHint} · ${translate("node.gateCachedCount")}`
        : stat.coverage === "local" ? `${gateHint} · ${translate("node.gateLocalCount")}`
        : stat.complete === false ? `${gateHint} · ${translate("node.gatePartial")}` : gateHint;
      return <span key={gate} className={`kplex-gate-wrap gate-wrap-${gate}${stat.hasAny ? "" : " is-empty"}`}>
        <span
          className={`kplex-gate gate-${gate}${stat.hasAny ? " has-connections" : " is-empty"}${highlightedGates.has(gate) ? " is-highlighted" : ""}${gateDisabled ? " is-link-disabled" : ""}`}
          data-kplex-gate={gate}
          onPointerEnter={(e: ReactPointerEvent<HTMLSpanElement>) => { e.stopPropagation(); onHoverGate(node, gate, e); }}
          onPointerLeave={(e: ReactPointerEvent<HTMLSpanElement>) => { e.stopPropagation(); onHoverNode(node, e); }}
          onPointerDown={(e: ReactPointerEvent<HTMLSpanElement>) => { onGatePointerDown(node, gate, e); }}
          onClick={(e: MouseEvent<HTMLSpanElement>) => e.stopPropagation()}
          aria-label={gateTitle}
          data-kplex-control-tooltip
          data-kplex-tooltip-requires-alt={settings.gateTooltipRequiresAlt !== false ? "true" : undefined}
          data-tooltip-position={gate === "top" ? "bottom" : "top"}
        />
        {gateLabels[gate].text !== null && <span className="kplex-gate-count">{gateLabels[gate].text}</span>}
      </span>;
    })}
  </div>;
}
