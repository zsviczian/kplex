/**
 * Host-free anchored informational callout for K-Plex guidance. The bubble can explain any UI
 * target, dismiss independently, or expose an explicit advance action so future onboarding/help
 * sequences can move to their next step without changing the positioning primitive.
 */
import { useCallback, useId, useRef, type ReactNode, type RefObject } from "react";
import { FloatingLayer, type FloatingLayerDismissReason, type FloatingLayerPositioning } from "./FloatingLayer";

export interface InfoBubbleProps {
  open: boolean;
  targetRef: RefObject<HTMLElement | null>;
  message: ReactNode;
  dismissLabel?: string;
  onDismiss: (reason?: FloatingLayerDismissReason) => void;
  advanceLabel?: string;
  onAdvance?: () => void;
  className?: string;
}

const INFO_BUBBLE_POSITIONING: FloatingLayerPositioning = {
  preferredWidth: 320,
  minimumWidth: 220,
  viewportMargin: 12,
  anchorGap: 10,
  minimumMaxHeight: 120,
};

/** Resolve the portal into the same owner document as the UI element the bubble explains. */
function ownerDocumentBody(ownerDocument: Document): Element | null {
  return ownerDocument.body;
}

/**
 * Render a reusable callout anchored to a target element.
 *
 * Outside pointer presses and Escape dismiss the bubble. When `onAdvance` and `advanceLabel` are
 * supplied, an additional primary action delegates sequence progression to the caller.
 */
export function InfoBubble({
  open,
  targetRef,
  message,
  dismissLabel,
  onDismiss,
  advanceLabel,
  onAdvance,
  className,
}: InfoBubbleProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const messageId = useId();

  /** Treat both the pointed-at control and the callout itself as inside pointer-dismiss bounds. */
  const insideRoots = useCallback(
    (): readonly (Node | null | undefined)[] => [targetRef.current, panelRef.current],
    [targetRef],
  );

  /** Collapse layer-specific dismissal reasons into the component's caller-owned dismiss action. */
  const dismissFromLayer = useCallback((reason: FloatingLayerDismissReason): void => {
    onDismiss(reason);
  }, [onDismiss]);

  /** Dismiss from the optional visible action without fabricating a layer-level reason. */
  const dismissFromAction = useCallback((): void => {
    onDismiss();
  }, [onDismiss]);

  return <FloatingLayer
    open={open}
    anchorRef={targetRef}
    panelRef={panelRef}
    insideRoots={insideRoots}
    onDismiss={dismissFromLayer}
    portalTarget={ownerDocumentBody}
    positioning={INFO_BUBBLE_POSITIONING}
  >
    {(style) => <div
      ref={panelRef}
      className={["kplex-info-bubble", "kplex-portal-layer", className].filter(Boolean).join(" ")}
      style={style}
      role="note"
      aria-describedby={messageId}
    >
      <span className="kplex-info-bubble-pointer" aria-hidden="true" />
      <div id={messageId} className="kplex-info-bubble-message" aria-live="polite">{message}</div>
      {((onAdvance && advanceLabel) || dismissLabel) ? <div className="kplex-info-bubble-actions">
        {onAdvance && advanceLabel
          ? <button type="button" className="mod-cta" onClick={onAdvance}>{advanceLabel}</button>
          : null}
        {dismissLabel ? <button type="button" onClick={dismissFromAction}>{dismissLabel}</button> : null}
      </div> : null}
    </div>}
  </FloatingLayer>;
}
