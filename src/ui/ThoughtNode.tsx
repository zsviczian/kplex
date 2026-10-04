/**
 * Plex node and gate presentation with localized accessibility and interaction hints. Physical gate labels are layout copy; semantic roles and drag effects belong to callers.
 */
import { type CSSProperties, type MouseEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import type { GateSide, NodeVisual, PositionedNode } from "../types";
import { alphaHexToCss } from "../index/style";
import type { KplexSettings } from "../settings";
import { effectiveLabelLimit, gateDiameter } from "./layout";
import { ObsidianIcon } from "./ObsidianIcon";
import type { Translator } from "../lang";
import { physicalPositionLabel } from "./features/positionPresentation";

const GATES: GateSide[] = ["top", "bottom", "left", "right"];
export type ConnectionDragState = "normal" | "candidate" | "blocked" | "origin";

/** Render a Plex node and physical gates with localized interaction hints; user labels, semantic roles and event effects stay caller-owned. */
export function ThoughtNode({
  node,
  settings,
  selected,
  highlighted,
  dimmed,
  highlightedGates,
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
  onContextMenu,
  sectionFold,
  visual,
  content,
  cornerAction,
  translate,
}: {
  node: PositionedNode;
  settings: KplexSettings;
  selected: boolean;
  highlighted: boolean;
  dimmed: boolean;
  highlightedGates: ReadonlySet<GateSide>;
  dragging?: boolean;
  flair?: boolean;
  connectionState?: ConnectionDragState;
  onActivate: (node: PositionedNode) => void;
  onOpen: (node: PositionedNode) => void;
  onHoverNode: (node: PositionedNode) => void;
  onHoverGate: (node: PositionedNode, gate: GateSide) => void;
  onHoverEnd: () => void;
  onHoverPreview: (node: PositionedNode, target: HTMLElement, event: PointerEvent) => void;
  onGatePointerDown: (node: PositionedNode, gate: GateSide, event: ReactPointerEvent<HTMLSpanElement>) => void;
  onNodePointerDown: (node: PositionedNode, event: ReactPointerEvent<HTMLDivElement>) => void;
  onContextMenu?: (node: PositionedNode, event: MouseEvent<HTMLDivElement>) => void;
  visual?: NodeVisual;
  content?: ReactNode;
  cornerAction?: {
    icon: string;
    label: string;
    onClick: () => void;
  };
  translate: Translator;
  sectionFold?: {
    hasChildren: boolean;
    expanded: boolean;
    hiddenDescendantCount: number;
    onToggle: () => void;
    expandedTitle?: string;
    foldedTitle?: string;
  };
}) {
  const style = node.style;
  const isSection = node.page.transient?.kind === "section";
  const strokeStyle = style.strokeStyle === "dashed" ? "dashed" : style.strokeStyle === "dotted" ? "dotted" : "solid";
  const prefix = style.prefix ?? "";
  const label = `${prefix}${node.label}`;
  const max = effectiveLabelLimit(settings, style.maxLabelLength ?? 30, node.role === "center");
  const display = label.length > max ? `${label.slice(0, Math.max(1, max - 1))}…` : label;
  const click = (e: MouseEvent) => { e.stopPropagation(); onActivate(node); };
  const fill = alphaHexToCss(style.backgroundColor, "rgba(0,0,0,.42)");
  const pattern = style.fillStyle === "hachure"
    ? `repeating-linear-gradient(135deg, rgba(255,255,255,.07) 0 1px, transparent 1px 6px), ${fill}`
    : style.fillStyle === "cross-hatch"
      ? `repeating-linear-gradient(45deg, rgba(255,255,255,.06) 0 1px, transparent 1px 7px), repeating-linear-gradient(135deg, rgba(255,255,255,.06) 0 1px, transparent 1px 7px), ${fill}`
      : fill;
  const gateSize = gateDiameter(style);
  const nodeCss = {
    left: node.x - node.width / 2,
    top: node.y - node.height / 2,
    width: node.width,
    height: node.height,
    background: isSection || content ? undefined : pattern,
    color: isSection || content ? undefined : alphaHexToCss(style.textColor, "white"),
    borderColor: isSection || content ? undefined : alphaHexToCss(style.borderColor, "rgba(255,255,255,.18)"),
    borderWidth: isSection ? undefined : `${style.strokeWidth ?? 1}px`,
    borderStyle: isSection ? undefined : strokeStyle,
    borderRadius: isSection ? undefined : (style.strokeShaprness === "sharp" ? 5 : node.role === "center" ? 18 : 12),
    fontSize: `${node.role === "center" ? Math.max(13, Math.min(24, (style.fontSize ?? 18) * 0.72)) : Math.max(10, Math.min(16, (style.fontSize ?? 18) * 0.62))}px`,
    "--kplex-gate-size": `${gateSize}px`,
    "--kplex-gate-stroke": alphaHexToCss(style.gateStrokeColor, "rgba(226,239,255,.84)"),
    "--kplex-gate-fill": alphaHexToCss(style.gateBackgroundColor, "rgba(226,239,255,.84)"),
    "--kplex-section-level": String(node.page.transient?.kind === "section" ? (node.page.transient.level ?? 1) : 0),
  } as CSSProperties;

  const classes = [
    "kplex-thought",
    `kplex-role-${node.role}`,
    selected ? "is-selected" : "",
    highlighted ? "is-highlighted" : "",
    dimmed ? "is-dimmed" : "",
    dragging ? "is-dragging" : "",
    flair ? "is-new-flair" : "",
    connectionState !== "normal" ? `is-connect-${connectionState}` : "",
    node.page.isFolder || node.page.isTag ? "is-structural-thought" : "",
    isSection ? "is-kplex-section" : "",
    visual ? "has-node-visual" : "",
    content ? "has-embedded-content" : "",
    visual?.mode === "replace" ? "is-node-image-only" : "",
  ].filter(Boolean).join(" ");

  return <div
    className={classes}
    style={nodeCss}
    data-kplex-path={node.page.path}
    onPointerDown={(e: ReactPointerEvent<HTMLDivElement>) => { onNodePointerDown(node, e); }}
    onPointerEnter={(e: ReactPointerEvent<HTMLDivElement>) => {
      onHoverNode(node);
      // Obsidian-style page preview is intentionally explicit: hold Ctrl/Cmd while entering
      // a thought. Without the modifier no preview is scheduled at all, which avoids timer
      // churn while moving across a dense Plex.
      if (e.nativeEvent.ctrlKey || e.nativeEvent.metaKey) onHoverPreview(node, e.currentTarget, e.nativeEvent);
    }}
    onPointerLeave={() => { onHoverEnd(); }}
    onClick={click}
    onDoubleClick={(e: MouseEvent<HTMLDivElement>) => { e.stopPropagation(); onOpen(node); }}
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
    aria-label={translate("node.accessibleLabel", { label: node.label, path: node.page.path })}
  >
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
      onPointerDown={(e: ReactPointerEvent<HTMLButtonElement>) => { e.stopPropagation(); }}
      onClick={(e: MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        e.stopPropagation();
        cornerAction.onClick();
      }}
    ><ObsidianIcon name={cornerAction.icon} size={10} /></button>}
    {sectionFold?.hasChildren && <button
      type="button"
      className={`kplex-section-fold-handle${sectionFold.expanded ? " is-expanded" : " is-folded"}`}
      aria-label={sectionFold.expanded
        ? (sectionFold.expandedTitle ?? translate("node.foldSectionChildren"))
        : `${sectionFold.foldedTitle ?? translate("node.unfoldSectionChildren")}${sectionFold.hiddenDescendantCount ? ` · ${translate("node.hiddenCount", { count: sectionFold.hiddenDescendantCount })}` : ""}`}
      onPointerDown={(e: ReactPointerEvent<HTMLButtonElement>) => { e.preventDefault(); e.stopPropagation(); }}
      onClick={(e: MouseEvent<HTMLButtonElement>) => { e.preventDefault(); e.stopPropagation(); sectionFold.onToggle(); }}
    />}
    {GATES.map((gate) => {
      const stat = node.gateStats[gate];
      const gateDisabled = node.page.isTag || (node.page.isFolder && gate !== "bottom");
      const gateLabel = physicalPositionLabel(gate, translate);
      const gateTitle = node.page.isTag
        ? translate("node.gateTagDisabled", { gate: gateLabel })
        : node.page.isFolder
          ? gate === "bottom"
            ? translate("node.gateFolderChild")
            : translate("node.gateFolderDisabled", { gate: gateLabel })
          : stat.hasAny
            ? translate("node.gateVisible", { gate: gateLabel, count: stat.visibleCount })
            : translate("node.gateEmpty", { gate: gateLabel });
      return <span key={gate} className={`kplex-gate-wrap gate-wrap-${gate}${stat.hasAny ? "" : " is-empty"}`}>
        <span
          className={`kplex-gate gate-${gate}${stat.hasAny ? " has-connections" : " is-empty"}${highlightedGates.has(gate) ? " is-highlighted" : ""}${gateDisabled ? " is-link-disabled" : ""}`}
          data-kplex-gate={gate}
          onPointerEnter={(e: ReactPointerEvent<HTMLSpanElement>) => { e.stopPropagation(); onHoverGate(node, gate); }}
          onPointerLeave={(e: ReactPointerEvent<HTMLSpanElement>) => { e.stopPropagation(); onHoverNode(node); }}
          onPointerDown={(e: ReactPointerEvent<HTMLSpanElement>) => { onGatePointerDown(node, gate, e); }}
          onClick={(e: MouseEvent<HTMLSpanElement>) => e.stopPropagation()}
          aria-label={gateTitle}
          data-tooltip-position="top"
        />
        {settings.showNeighborCount && stat.visibleCount > 0 && <span className="kplex-gate-count">{stat.shownCount === undefined ? stat.visibleCount : `${stat.shownCount}/${stat.visibleCount}`}</span>}
      </span>;
    })}
  </div>;
}
