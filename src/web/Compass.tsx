import {useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent as ReactPointerEvent} from "react";
import type {NodeId} from "../core/graph/model";
import type {ViewPoint} from "../core/plex/views/contracts";
import {compassControls} from "../lang/webPublication";
import {PlexArrowMarkers, PlexConnectorLabel, PlexConnectorStroke, PlexGate, PlexNodeCard, PlexNodeLabel, PlexNodeText, plexMarker} from "../ui/features/PlexPaint";
import type {Publication} from "./publication";
import {publicationScene} from "./scene";

type Camera = ViewPoint & {scale: number};
type Pointer = ViewPoint & {id: number};
const directionalKeys = {ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1]} as const;

function gesture(first: Pointer, second?: Pointer) {
  return second ? {x: (first.x + second.x) / 2, y: (first.y + second.y) / 2,
    distance: Math.max(1, Math.hypot(first.x - second.x, first.y - second.y))} : {...first, distance: 1};
}

/** Mount-local navigation and camera. Pointer moves only touch the camera transform. */
export function Compass({publication, markerPrefix}: {publication: Publication; markerPrefix: string}) {
  const [history, setHistory] = useState({entries: [publication.entry], index: 0});
  const attention = history.entries[history.index];
  const scene = useMemo(() => publicationScene(publication, attention), [publication, attention]);
  const entry = scene.cards.find(card => card.center)!;
  const viewport = useRef<HTMLDivElement>(null);
  const group = useRef<HTMLDivElement>(null);
  const camera = useRef<Camera>({x: 0, y: 0, scale: 1});
  const manuallyMoved = useRef(false);
  const pointerState = useRef<{points: Map<number, Pointer>; origin: ViewPoint | null; moved: boolean}>({points: new Map(), origin: null, moved: false});
  const focusCenter = useRef(false);
  const captionId = useId();

  function paint(next: Camera) {
    camera.current = next;
    if (group.current) group.current.style.transform = `translate(${next.x}px, ${next.y}px) scale(${next.scale})`;
  }

  function fit() {
    const element = viewport.current;
    if (!element) return;
    let xExtent = 0, yExtent = 0;
    for (const {bounds} of scene.cards) {
      xExtent = Math.max(xExtent, Math.abs(bounds.x - entry.bounds.x) + bounds.width / 2);
      yExtent = Math.max(yExtent, Math.abs(bounds.y - entry.bounds.y) + bounds.height / 2);
    }
    const scale = Math.max(.25, Math.min(1, (element.clientWidth / 2 - 22) / xExtent, (element.clientHeight / 2 - 22) / yExtent));
    manuallyMoved.current = false;
    paint({x: -entry.bounds.x * scale, y: -entry.bounds.y * scale, scale});
  }

  function adjust(anchor: ViewPoint, destination: ViewPoint, factor: number) {
    const {x, y, scale} = camera.current;
    const nextScale = Math.max(.25, Math.min(3, scale * factor));
    manuallyMoved.current = true;
    paint({x: destination.x - (anchor.x - x) * nextScale / scale, y: destination.y - (anchor.y - y) * nextScale / scale, scale: nextScale});
  }

  function zoom(factor: number) {
    adjust({x: 0, y: 0}, {x: 0, y: 0}, factor);
  }

  function position(element: HTMLDivElement, clientX: number, clientY: number) {
    const rect = element.getBoundingClientRect();
    return {x: clientX - rect.left - rect.width / 2, y: clientY - rect.top - rect.height / 2};
  }

  useLayoutEffect(() => {
    const element = viewport.current;
    if (!element) return;
    fit();
    if (focusCenter.current) {
      element.querySelector<HTMLElement>("[data-publication-center]")?.focus({preventScroll: true});
      focusCenter.current = false;
    }
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const anchor = position(element, event.clientX, event.clientY);
      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? element.clientHeight : 1);
      adjust(anchor, anchor, Math.exp(-Math.max(-200, Math.min(200, delta)) / 350));
    };
    const owner = element.ownerDocument.defaultView;
    const observer = owner ? new owner.ResizeObserver(() => {if (!manuallyMoved.current) fit();}) : null;
    observer?.observe(element);
    element.addEventListener("wheel", onWheel, {passive: false});
    return () => {observer?.disconnect(); element.removeEventListener("wheel", onWheel);};
  }, [scene]);

  function activate(id: NodeId, fromKeyboard: boolean) {
    if (id === attention) return;
    focusCenter.current = fromKeyboard;
    setHistory(current => ({entries: [...current.entries.slice(0, current.index + 1), id], index: current.index + 1}));
  }

  function moveHistory(delta: number) {
    setHistory(current => ({...current, index: Math.max(0, Math.min(current.entries.length - 1, current.index + delta))}));
  }

  function onKey(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Home" || event.key === "0") fit();
    else if (event.key === "+" || event.key === "=") zoom(1.25);
    else if (event.key === "-") zoom(.8);
    else if (event.altKey && (event.key === "ArrowLeft" || event.key === "ArrowRight")) moveHistory(event.key === "ArrowLeft" ? -1 : 1);
    else if (Object.prototype.hasOwnProperty.call(directionalKeys, event.key)) {
      const [x, y] = directionalKeys[event.key as keyof typeof directionalKeys];
      const cards = Array.from(event.currentTarget.querySelectorAll<HTMLElement>("[data-publication-node]"));
      const origin = scene.cards[cards.findIndex(card => card === event.target)] ?? entry;
      let nearest = -1, distance = Infinity;
      for (const [index, {bounds}] of scene.cards.entries()) {
        const dx = bounds.x - origin.bounds.x, dy = bounds.y - origin.bounds.y;
        const forward = dx * x + dy * y;
        const weight = forward + 2 * Math.abs(dx * y - dy * x);
        if (forward > 0 && weight < distance) {nearest = index; distance = weight;}
      }
      cards[nearest]?.focus({preventScroll: true});
    } else return;
    event.preventDefault();
  }

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    const state = pointerState.current;
    if (state.points.size >= 2) return;
    const point = {...position(event.currentTarget, event.clientX, event.clientY), id: event.pointerId};
    if (state.points.size === 0) {state.origin = point; state.moved = false;}
    state.points.set(event.pointerId, point);
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const state = pointerState.current;
    if (!state.points.has(event.pointerId)) return;
    const [first, second] = state.points.values();
    const previous = gesture(first, second);
    const point = {...position(event.currentTarget, event.clientX, event.clientY), id: event.pointerId};
    state.points.set(event.pointerId, point);
    const [nextFirst, nextSecond] = state.points.values();
    const next = gesture(nextFirst, nextSecond);
    if (!state.moved && !nextSecond && state.origin && Math.hypot(point.x - state.origin.x, point.y - state.origin.y) < 5) return;
    if (!state.moved) {
      state.moved = true;
      for (const id of state.points.keys()) event.currentTarget.setPointerCapture(id);
    } else if (!event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.setPointerCapture(event.pointerId);
    adjust(previous, next, next.distance / previous.distance);
  }

  function onPointerEnd(event: ReactPointerEvent<HTMLDivElement>) {
    pointerState.current.points.delete(event.pointerId);
  }

  const body = publication.body(attention);
  const arrow = plexMarker("arrow", markerPrefix);
  return <main className="kplex-publication">
    <header className="kplex-publication-header">
      <div><h1>{publication.title}</h1><span>{compassControls.view}</span></div>
      <div className="kplex-publication-controls">
        <button type="button" onClick={() => moveHistory(-1)} disabled={history.index === 0} aria-label={compassControls.back}>←</button>
        <button type="button" onClick={() => moveHistory(1)} disabled={history.index === history.entries.length - 1} aria-label={compassControls.forward}>→</button>
        <button type="button" onClick={() => zoom(.8)} aria-label={compassControls.zoomOut}>−</button>
        <button type="button" onClick={() => zoom(1.25)} aria-label={compassControls.zoomIn}>+</button>
        <button type="button" onClick={fit}>{compassControls.fit}</button>
      </div>
    </header>
    <div ref={viewport} className="kplex-publication-viewport" role="group" aria-label={compassControls.view} tabIndex={0}
      onKeyDown={onKey} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerEnd} onPointerCancel={onPointerEnd}
      onLostPointerCapture={onPointerEnd}
      onPointerLeave={event => {if (!event.currentTarget.hasPointerCapture(event.pointerId)) onPointerEnd(event);}}
      onClickCapture={event => {if (event.detail && pointerState.current.moved) {event.stopPropagation(); pointerState.current.moved = false;}}}>
      <div className="kplex-camera" ref={group}>
        <svg className="kplex-links" width="3200" height="2400" viewBox="-1600 -1200 3200 2400" aria-hidden="true">
          <PlexArrowMarkers prefix={markerPrefix} />
          {scene.edges.map(({id, source, target, route, label, arrowStart, arrowEnd}) => <g key={id} className="kplex-edge" data-publication-source={source} data-publication-target={target}>
            <PlexConnectorStroke d={route.d} stroke="var(--kplex-publication-link)" strokeWidth={1.2} markerStart={arrowStart ? arrow : undefined} markerEnd={arrowEnd ? arrow : undefined} />
            <PlexConnectorLabel label={label} midpoint={route.midpoint} color="var(--text-muted)" background="var(--background-primary)" />
          </g>)}
        </svg>
        <div className="kplex-nodes">
          {scene.cards.map(card => <PlexNodeCard key={card.id} bounds={card.bounds} semanticRole={card.role}
            data-publication-node={card.node.id} data-publication-occurrence={card.id} data-publication-center={card.center || undefined}
            role="button" tabIndex={0} aria-label={card.node.name} aria-current={card.center || undefined}
            style={{fontSize: card.fontSize, "--kplex-gate-size": `${card.gateSize}px`} as CSSProperties}
            onClick={event => activate(card.node.id, event.detail === 0)}
            onKeyDown={event => {if (event.key === "Enter" || event.key === " ") {event.preventDefault(); activate(card.node.id, true);}}}>
            <PlexNodeLabel wrap={false}><PlexNodeText label={card.node.name} maximum={card.node.maxLabelLength} center={card.center} /></PlexNodeLabel>
            {card.gates.map(({side, count}) => <PlexGate key={side} side={side} connected={count > 0} count={count ? String(count) : null} aria-hidden="true" />)}
          </PlexNodeCard>)}
        </div>
      </div>
    </div>
    <section className="kplex-publication-note" aria-labelledby={captionId} aria-live="polite">
      <h2 id={captionId}>{entry.node.name}</h2>
      {body && <p>{body}</p>}
    </section>
  </main>;
}
