import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ChangeEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

export type FuzzySuggesterProps<T> = {
  value: string;
  onChange: (value: string) => void;
  results: readonly T[];
  onChoose: (value: T) => void;
  getKey: (value: T) => string;
  getLabel: (value: T) => string;
  getDetail?: (value: T) => string | null | undefined;
  placeholder?: string;
  ariaLabel?: string;
  icon?: ReactNode;
  autoFocus?: boolean;
  disabled?: boolean;
  floating?: boolean;
  /**
   * `app` keeps the historic K-Plex topbar overlay inside `.excalibrain-app`.
   * `viewport` portals to the document body so a modal cannot clip the result list.
   */
  floatingMode?: "app" | "viewport";
  portalSelector?: string;
  appTopbarSelector?: string;
  maxFloatingHeight?: number;
  resultPrefix?: (value: T) => ReactNode;
  onEnterWithoutResult?: () => void;
  onCtrlEnter?: () => void;
  openResultsOnFocus?: boolean;
  onFocusChange?: (focused: boolean) => void;
  /** Increment to imperatively focus this input and reopen its result list. */
  focusRequest?: number;
  className?: string;
  highlightMatches?: boolean;
};

function matchIndices(text: string, rawQuery: string): Set<number> {
  const query = rawQuery.trim().toLocaleLowerCase();
  if (!query) return new Set();
  const lower = text.toLocaleLowerCase();
  const contiguous = lower.indexOf(query);
  if (contiguous >= 0) {
    return new Set(Array.from({ length: query.length }, (_, offset) => contiguous + offset));
  }

  const indices = new Set<number>();
  let cursor = 0;
  for (const char of query) {
    const found = lower.indexOf(char, cursor);
    if (found < 0) return new Set();
    indices.add(found);
    cursor = found + 1;
  }
  return indices;
}

function highlightedText(text: string, query: string): ReactNode {
  const indices = matchIndices(text, query);
  if (!indices.size) return text;

  const parts: ReactNode[] = [];
  let start = 0;
  let currentMatch = indices.has(0);
  for (let index = 1; index <= text.length; index += 1) {
    const nextMatch = index < text.length && indices.has(index);
    if (index < text.length && nextMatch === currentMatch) continue;
    const fragment = text.slice(start, index);
    parts.push(currentMatch
      ? <mark key={`${start}:m`} className="kplex-fuzzy-match">{fragment}</mark>
      : <span key={`${start}:t`}>{fragment}</span>);
    start = index;
    currentMatch = nextMatch;
  }
  return <>{parts}</>;
}

/**
 * Shared K-Plex fuzzy-input chrome used by graph search and relationship creation.
 * Callers own ranking; this component owns focus, keyboard navigation, highlighting,
 * and optional portal positioning.
 */
export function FuzzySuggester<T>({
  value,
  onChange,
  results,
  onChoose,
  getKey,
  getLabel,
  getDetail,
  placeholder = "Search…",
  ariaLabel = "Search",
  icon,
  autoFocus = false,
  disabled = false,
  floating = false,
  floatingMode = "app",
  portalSelector,
  appTopbarSelector,
  maxFloatingHeight = 440,
  resultPrefix,
  onEnterWithoutResult,
  onCtrlEnter,
  openResultsOnFocus = true,
  onFocusChange,
  focusRequest,
  className = "",
  highlightMatches = true,
}: FuzzySuggesterProps<T>) {
  const [focused, setFocused] = useState(false);
  const [editedSinceFocus, setEditedSinceFocus] = useState(false);
  const [resultsDismissed, setResultsDismissed] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [overlayStyle, setOverlayStyle] = useState<CSSProperties | null>(null);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const resultsRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const visibleResults = focused && !resultsDismissed && (
    openResultsOnFocus || (editedSinceFocus && value.trim().length > 0)
  ) ? results : [];
  const clampedSelectedIndex = visibleResults.length ? Math.max(0, Math.min(visibleResults.length - 1, selectedIndex)) : 0;
  const ownerDocument = shellRef.current?.ownerDocument ?? null;
  const ownerWindow = ownerDocument?.defaultView ?? null;
  const portalRoot = floating
    ? (floatingMode === "viewport"
      ? ownerDocument?.body ?? null
      : portalSelector ? shellRef.current?.closest<HTMLElement>(portalSelector) ?? null : null)
    : null;

  const dismissResults = () => {
    setResultsDismissed(true);
    setSelectedIndex(0);
  };

  const close = () => {
    setFocused(false);
    setEditedSinceFocus(false);
    setResultsDismissed(false);
    setSelectedIndex(0);
    const input = inputRef.current;
    if (input && input.ownerDocument.activeElement === input) input.blur();
    onFocusChange?.(false);
  };

  const choose = (item: T) => {
    onChoose(item);
    close();
  };

  useEffect(() => {
    setSelectedIndex(0);
  }, [value]);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  useEffect(() => {
    if (!focusRequest) return;
    const input = inputRef.current;
    if (!input) return;
    setFocused(true);
    setEditedSinceFocus(false);
    setResultsDismissed(false);
    input.focus({ preventScroll: true });
  }, [focusRequest]);

  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) return;
    const dismiss = () => dismissResults();
    shell.addEventListener("kplex-dismiss-suggestions", dismiss);
    return () => shell.removeEventListener("kplex-dismiss-suggestions", dismiss);
  }, []);

  useEffect(() => {
    if (!focused || !ownerDocument || !ownerWindow) return;
    const shell = shellRef.current;
    if (!shell) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (target && (shell.contains(target) || resultsRef.current?.contains(target))) return;
      close();
    };
    const cleanup = () => ownerDocument.removeEventListener("pointerdown", onPointerDown, true);
    ownerDocument.addEventListener("pointerdown", onPointerDown, true);
    ownerWindow.addEventListener("pagehide", cleanup, { once: true });
    return () => {
      cleanup();
      ownerWindow.removeEventListener("pagehide", cleanup);
    };
  }, [focused, ownerDocument, ownerWindow]);

  useLayoutEffect(() => {
    if (!floating || !focused || !visibleResults.length) {
      setOverlayStyle(null);
      return;
    }

    const shell = shellRef.current;
    if (!shell) return;
    if (!ownerWindow) return;
    const visualViewport = ownerWindow.visualViewport;

    const updatePosition = () => {
      const shellRect = shell.getBoundingClientRect();
      const margin = 8;
      const gap = 6;

      if (floatingMode === "viewport") {
        // A mobile software keyboard shrinks the visual viewport without necessarily changing
        // innerHeight. Keep body-portalled suggestions inside the part the user can actually see.
        const viewportLeft = visualViewport?.offsetLeft ?? 0;
        const viewportTop = visualViewport?.offsetTop ?? 0;
        const viewportWidth = visualViewport?.width ?? ownerWindow.innerWidth;
        const viewportBottom = viewportTop + (visualViewport?.height ?? ownerWindow.innerHeight);
        const width = Math.min(shellRect.width, Math.max(0, viewportWidth - margin * 2));
        const left = Math.max(viewportLeft + margin, Math.min(shellRect.left, viewportLeft + viewportWidth - margin - width));
        const belowTop = Math.max(shellRect.bottom + gap, viewportTop + margin);
        const aboveBottom = Math.min(shellRect.top - gap, viewportBottom - margin);
        const below = Math.max(0, viewportBottom - margin - belowTop);
        const above = Math.max(0, aboveBottom - viewportTop - margin);
        const openBelow = below >= Math.min(180, maxFloatingHeight) || below >= above;
        const maxHeight = Math.max(0, Math.min(maxFloatingHeight, openBelow ? below : above));
        const style: CSSProperties = {
          position: "fixed",
          left,
          width,
          maxHeight,
          zIndex: 10000,
        };
        if (openBelow) style.top = belowTop;
        else style.bottom = ownerWindow.innerHeight - aboveBottom;
        setOverlayStyle(style);
        return;
      }

      const app = portalSelector ? shell.closest<HTMLElement>(portalSelector) ?? null : null;
      const topbar = appTopbarSelector ? shell.closest<HTMLElement>(appTopbarSelector) ?? null : null;
      if (!app || !topbar) return;
      const appRect = app.getBoundingClientRect();
      const topbarRect = topbar.getBoundingClientRect();
      const availableWidth = Math.max(0, appRect.width - margin * 2);
      const width = Math.min(780, Math.max(shellRect.width, Math.min(620, availableWidth)), availableWidth);
      const minLeft = margin;
      const maxLeft = Math.max(minLeft, appRect.width - margin - width);
      const left = Math.min(maxLeft, Math.max(minLeft, shellRect.left - appRect.left));
      const top = Math.max(0, topbarRect.bottom - appRect.top + gap);
      const maxHeight = Math.max(0, Math.min(maxFloatingHeight, appRect.height - top - margin));
      setOverlayStyle({ left, top, width, maxHeight });
    };

    updatePosition();
    const OwnerResizeObserver = ownerWindow.ResizeObserver;
    const resizeObserver = OwnerResizeObserver ? new OwnerResizeObserver(updatePosition) : null;
    const app = floatingMode === "app" && portalSelector ? shell.closest<HTMLElement>(portalSelector) : null;
    const topbar = floatingMode === "app" && appTopbarSelector ? shell.closest<HTMLElement>(appTopbarSelector) : null;
    if (app) resizeObserver?.observe(app);
    if (topbar) resizeObserver?.observe(topbar);
    resizeObserver?.observe(shell);
    const cleanup = () => {
      resizeObserver?.disconnect();
      ownerWindow.removeEventListener("resize", updatePosition);
      ownerWindow.removeEventListener("scroll", updatePosition, true);
      visualViewport?.removeEventListener("resize", updatePosition);
      visualViewport?.removeEventListener("scroll", updatePosition);
    };
    ownerWindow.addEventListener("resize", updatePosition);
    ownerWindow.addEventListener("scroll", updatePosition, true);
    visualViewport?.addEventListener("resize", updatePosition);
    visualViewport?.addEventListener("scroll", updatePosition);
    ownerWindow.addEventListener("pagehide", cleanup, { once: true });

    return () => {
      cleanup();
      ownerWindow.removeEventListener("pagehide", cleanup);
    };
  }, [appTopbarSelector, floating, floatingMode, focused, visibleResults.length, maxFloatingHeight, ownerDocument, ownerWindow, portalSelector]);

  useEffect(() => {
    const container = resultsRef.current;
    if (!container || !visibleResults.length) return;
    container.querySelector<HTMLElement>(`[data-kplex-fuzzy-index="${clampedSelectedIndex}"]`)?.scrollIntoView({ block: "nearest" });
  }, [clampedSelectedIndex, visibleResults.length]);

  const onKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      if (visibleResults.length) {
        event.preventDefault();
        event.stopPropagation();
        dismissResults();
      }
      return;
    }
    if (event.key === "ArrowDown" && visibleResults.length) {
      event.preventDefault();
      setSelectedIndex((current) => Math.min(visibleResults.length - 1, current + 1));
      return;
    }
    if (event.key === "ArrowUp" && visibleResults.length) {
      event.preventDefault();
      setSelectedIndex((current) => Math.max(0, current - 1));
      return;
    }
    if (event.key === "Enter" && event.nativeEvent.isComposing) return;
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey) && onCtrlEnter) {
      event.preventDefault();
      event.stopPropagation();
      onCtrlEnter();
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const selected = visibleResults[clampedSelectedIndex];
      if (selected) choose(selected);
      else onEnterWithoutResult?.();
    }
  };

  const list = focused && visibleResults.length > 0
    ? <div ref={resultsRef} className={`excalibrain-search-results${floating ? " kplex-fuzzy-floating-results" : " kplex-fuzzy-inline-results"}`} style={floating ? overlayStyle ?? undefined : undefined}>
      {visibleResults.map((item, resultIndex) => {
        const label = getLabel(item);
        const detail = getDetail?.(item);
        const highlightQuery = highlightMatches ? value : "";
        return <button
          key={getKey(item)}
          data-kplex-fuzzy-index={resultIndex}
          className={`excalibrain-search-result${resultIndex === clampedSelectedIndex ? " is-selected" : ""}`}
          title={detail ? `${label}\n${detail}` : label}
          onMouseDown={(event: MouseEvent<HTMLButtonElement>) => event.preventDefault()}
          onMouseEnter={() => setSelectedIndex(resultIndex)}
          onClick={() => choose(item)}
        >
          {resultPrefix?.(item)}
          <span>{highlightedText(label, highlightQuery)}</span>{detail ? <small>{highlightedText(detail, highlightQuery)}</small> : null}
        </button>;
      })}
    </div>
    : null;

  const resultList = floating && portalRoot && overlayStyle && list ? createPortal(list, portalRoot) : (!floating ? list : null);

  return <div ref={shellRef} className={`excalibrain-search-shell kplex-fuzzy-search${className ? ` ${className}` : ""}`}>
    {icon ? <div className="excalibrain-search-icon">{icon}</div> : null}
    <input
      ref={inputRef}
      className="excalibrain-search"
      value={value}
      disabled={disabled}
      onChange={(event: ChangeEvent<HTMLInputElement>) => {
        setEditedSinceFocus(true);
        setResultsDismissed(false);
        onChange(event.currentTarget.value);
      }}
      onFocus={() => {
        setFocused(true);
        setEditedSinceFocus(false);
        setResultsDismissed(false);
        onFocusChange?.(true);
      }}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      aria-label={ariaLabel}
      aria-expanded={focused && visibleResults.length > 0}
      autoComplete="off"
    />
    {resultList}
  </div>;
}
