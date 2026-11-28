/** Shared card, gate, and connector paint. Hosts supply resolved presentation and actions. */
import type {ComponentPropsWithoutRef, ReactNode} from 'react';
import type {Role} from '../../core/graph/relations';
import type {PhysicalPort, ViewPoint} from '../../core/plex/views/contracts';
import {effectiveLabelLimit} from '../../core/plex/nodeGeometry';

type CardBounds=ViewPoint&Readonly<{width:number;height:number}>;

/** Use the same center-relative box for paint and physical pointer placement. */
export function PlexNodeCard({bounds,semanticRole,className,style,...properties}:
  ComponentPropsWithoutRef<'div'>&{bounds:CardBounds;semanticRole:Role|'center'}) {
  return <div {...properties} className={`kplex-thought kplex-role-${semanticRole}${className?' '+className:''}`}
    style={{left:bounds.x-bounds.width/2,top:bounds.y-bounds.height/2,width:bounds.width,height:bounds.height,...style}} />;
}

/** Keep clipping identical to the shared character limit, with full text available on hover. */
export function PlexNodeText({label,maximum,center}:{label:string;maximum?:number|null;center:boolean}) {
  const limit=effectiveLabelLimit(maximum??30,center);
  const display=label.length>limit?`${label.slice(0,Math.max(1,limit-1))}…`:label;
  return <span className="kplex-thought-text" title={label}>{display}</span>;
}

/** Keep the existing label and optional icon/media slots in one measured inline box. */
export function PlexNodeLabel({wrap,children}:{wrap:boolean;children:ReactNode}) {
  return <span className={`kplex-thought-label${wrap?' is-two-line':''}`}>{children}</span>;
}

/** Render the physical gate and optional count. Native drag and tooltip policy are supplied by the caller. */
export function PlexGate({side,connected,highlighted,disabled,count,...interaction}:ComponentPropsWithoutRef<'span'>&{
  side:PhysicalPort;connected:boolean;highlighted?:boolean;disabled?:boolean;count:string|null;
}) {
  return <span className={`kplex-gate-wrap gate-wrap-${side}${connected?'':' is-empty'}`}>
    <span {...interaction} data-kplex-gate={side}
      className={`kplex-gate gate-${side}${connected?' has-connections':' is-empty'}${highlighted?' is-highlighted':''}${disabled?' is-link-disabled':''}`} />
    {count!==null&&<span className="kplex-gate-count">{count}</span>}
  </span>;
}

/** A connector's visible path shares the exact coordinates and non-scaling stroke with native paint. */
export function PlexConnectorStroke(properties:ComponentPropsWithoutRef<'path'>) {
  return <path className="kplex-edge-visible" fill="none" vectorEffect="non-scaling-stroke" {...properties} />;
}

/** Draw a caption and its matching backdrop from an already resolved semantic label. */
export function PlexConnectorLabel({label,midpoint,fontSize:configuredFontSize,color,background,opacity}:{
  label:string|null;midpoint:ViewPoint;fontSize?:number|null;color:string;background:string;opacity?:number;
}) {
  if(!label)return null;
  const fontSize=configuredFontSize??10;
  const width=Math.max(20,label.length*fontSize*.58+10),height=fontSize+6;
  return <g className="kplex-edge-label-wrap" pointerEvents="none" opacity={opacity}>
    <rect x={midpoint.x-width/2} y={midpoint.y-height/2} width={width} height={height} rx={3} fill={background} />
    <text className="kplex-edge-label" x={midpoint.x} y={midpoint.y} textAnchor="middle" dominantBaseline="central" fill={color} fontSize={fontSize}>{label}</text>
  </g>;
}

/** Route marker IDs through the owning canvas. Existing desktop IDs are the default. */
export function plexMarker(head?:string,prefix='kplex'):string|undefined {
  if(!head||head==='none')return undefined;
  return `url(#${prefix}-${head==='triangle'||head==='dot'||head==='bar'?head:'arrow'})`;
}

/** Keep the marker shapes identical across SVG canvases with independent ID namespaces. */
export function PlexArrowMarkers({prefix='kplex'}:{prefix?:string}) {
  return <defs>
    <marker id={`${prefix}-arrow`} markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto-start-reverse" markerUnits="strokeWidth"><path d="M1,1 L8,4.5 L1,8" fill="none" stroke="context-stroke" strokeWidth="1.4" /></marker>
    <marker id={`${prefix}-triangle`} markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto-start-reverse" markerUnits="strokeWidth"><path d="M0,0 L9,4.5 L0,9 z" fill="context-stroke" /></marker>
    <marker id={`${prefix}-dot`} markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto" markerUnits="strokeWidth"><circle cx="4" cy="4" r="2.6" fill="context-stroke" /></marker>
    <marker id={`${prefix}-bar`} markerWidth="8" markerHeight="10" refX="4" refY="5" orient="auto-start-reverse" markerUnits="strokeWidth"><path d="M4,1 L4,9" stroke="context-stroke" strokeWidth="1.8" /></marker>
  </defs>;
}
