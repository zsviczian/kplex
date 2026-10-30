/** Bounded public projection of an already committed PlexGraph render. It reads only supplied
 * scene geometry, filter membership and camera values; it never classifies, lays out, acquires
 * sources or serializes native pages. Canonical note identities remain separate from occurrences. */
import type {GraphPage, Neighbour, PositionedEdge, PositionedNode} from '../types';
import type {PublicCanvasSnapshot, PublicCanvasOccurrence, PublicCanvasConnection, PublicCanvasDecoration,
  PublicCoverage, PublicRect, JsonValue} from '../application/publicApiContracts';
import {PublicApiError} from '../application/publicApiContracts';
import {boundedViewState} from '../core/plex/views/state';
import type {HostPlexScene} from './plexViews/scene';
import {edgeOccurrence, occurrenceKey, semanticSceneEdge} from './plexViews/scene';

export type PublicCanvasScene=Pick<PublicCanvasSnapshot,'semanticRevision'|'sourceRevision'|'configurationRevision'|'scenePending'|'motionPending'|'occurrences'|
  'connections'|'decorations'|'areas'|'camera'|'viewport'|'bounds'|'coverage'|'truncated'|'folds'|'selection'|'filters'>;
export type PublicScenePublication=Readonly<{revision:number;read:()=>PublicCanvasScene}>;

/** The existing session codec returns detached JSON or null within its depth/size limits.
 * Narrow that already-validated result for the public contract; no second state codec is added. */
export function publicCanvasState(value:unknown):JsonValue|null {return boundedViewState(value) as JsonValue|null;}
type Mini=Readonly<{key:string;relation:Neighbour;label:string;localX:number;localY:number;width:number;height:number}>;
type Cluster=Readonly<{key:string;parent:PositionedNode;left:number;top:number;width:number;viewportHeight:number;
  contentHeight:number;scrollTop:number;children:readonly Mini[]}>;
export type PublicSceneInput=Readonly<{
  scene:HostPlexScene;edges:readonly PositionedEdge[];rendered:ReadonlyMap<string,PositionedNode>;
  clusters:readonly Cluster[];area:(node:PositionedNode)=>string|null|undefined;
  included:(node:PositionedNode)=>boolean;visible:ReadonlySet<string>;scroll:Readonly<Record<string,number|undefined>>;
  camera:Readonly<{x:number;y:number;scale:number}>;viewport:Readonly<{width:number;height:number}>;
  coverage:PublicCoverage;semanticRevision:number;sourceRevision?:number;configurationRevision?:number;pending:boolean;motion:boolean;
  selection:string|null;folds:readonly string[];filters:PublicCanvasSnapshot['filters'];
  decorationLabel:(decoration:NonNullable<HostPlexScene['decorations']>[number])=>string|undefined;
}>;

/** Transient headings/groups have no invented canonical identity; explicit target facets remain usable. */
function canonical(page:GraphPage):string|null {return page.transient?.kind==='group'?null:page.transient?page.transient.actualPath??null:page.path;}
/** Node positions are center-based; public rectangles consistently use their upper-left origin. */
function rectangle(node:Readonly<{x:number;y:number;width:number;height:number}>):PublicRect {
  return {x:node.x-node.width/2,y:node.y-node.height/2,width:node.width,height:node.height};
}
/** Strict positive-area intersection keeps clipped/offscreen rows separate from filter membership. */
function intersects(a:PublicRect,b:PublicRect):boolean {
  return a.width>0&&a.height>0&&b.width>0&&b.height>0&&a.x+a.width>b.x&&a.x<b.x+b.width&&a.y+a.height>b.y&&a.y<b.y+b.height;
}
/** Invalid geometry cannot become a serialized rectangle or contaminate the finite scene envelope. */
function validRectangle(value:PublicRect):boolean {return Object.values(value).every(number=>Number.isFinite(number)&&Math.abs(number)<=1e9)&&value.width>=0&&value.height>=0;}
/** Inspect existing world-space clip geometry and the committed camera without DOM measurement. */
function inViewport(bounds:PublicRect,clip:PublicRect|undefined,input:PublicSceneInput):boolean {
  if(clip&&!intersects(bounds,clip))return false;
  const {camera,viewport}=input;
  return intersects({x:camera.x+bounds.x*camera.scale,y:camera.y+bounds.y*camera.scale,
    width:bounds.width*camera.scale,height:bounds.height*camera.scale},{x:0,y:0,...viewport});
}

/** Copy a finite render frame on explicit API read. Independent array/text budgets prevent dense
 * scenes or large labels from creating an unbounded second scene representation. Omitted tails
 * report truncation; identities are never shortened or recovered from path-like strings. */
export function readPublicCanvasScene(input:PublicSceneInput):PublicCanvasScene {
  const occurrences:PublicCanvasOccurrence[]=[],connections:PublicCanvasConnection[]=[],decorations:PublicCanvasDecoration[]=[];
  const areas:PublicCanvasSnapshot['areas'][number][]=[];
  let truncated=Boolean(input.scene.projection?.truncated||input.scene.crossLinksLimited),remaining=500_000,inspected=0;
  let bounds:PublicRect|null=null;
  const canonicalByOccurrence=new Map<string,string|null>();
  const groupOccurrences=new Set<string>();
  if(!Number.isFinite(input.camera.scale)||input.camera.scale<=0||!Number.isFinite(input.camera.x)||!Number.isFinite(input.camera.y)
    ||!Number.isFinite(input.viewport.width)||!Number.isFinite(input.viewport.height))throw new PublicApiError('UNAVAILABLE','Committed canvas geometry is unavailable.');
  /** Reserve output before copying strings/points; empty budget never changes source/scene membership. */
  const reserve=(characters:number):boolean=>{if(characters>remaining){truncated=true;return false;}remaining-=characters;return true;};
  /** Skipped/invalid records consume work too; output caps alone do not bound sparse bad input. */
  const inspect=():boolean=>{if(++inspected>16384){truncated=true;return false;}return true;};
  /** Labels are presentation text; full oversized identity/semantic payloads are omitted with the tail. */
  const text=(value:string):string=>{if(value.length>4096)truncated=true;return value.slice(0,4096);};
  /** Full semantic identities are omitted when oversized, never shortened into another identity. */
  const identities=(values:readonly (string|null|undefined)[]):boolean=>{if(values.some(value=>value!==null&&value!==undefined&&value.length>4096)){truncated=true;return false;}return true;};
  /** Derive only an envelope over returned geometry, never a replacement layout. */
  const include=(rect:PublicRect):void=>{
    if(!bounds){bounds={...rect};return;}
    const x=Math.min(bounds.x,rect.x),y=Math.min(bounds.y,rect.y);
    bounds={x,y,width:Math.max(bounds.x+bounds.width,rect.x+rect.width)-x,height:Math.max(bounds.y+bounds.height,rect.y+rect.height)-y};
  };
  for(const original of input.scene.nodes){
    if(!inspect())break;
    if(occurrences.length===2048){truncated=true;break;}
    const id=occurrenceKey(original),node=input.rendered.get(id)??original,nodeId=canonical(node.page),area=input.area(original),panel=area?input.scene.zoneViewports[area]:undefined;
    if(!identities([id,nodeId,area]))continue;
    if(!reserve(id.length+(nodeId?.length??0)+(area?.length??0)+Math.min(node.label.length,4096)+Math.min(node.viewDescription?.length??0,4096)+Math.min(node.viewBadge?.label.length??0,4096)+256))break;
    const rect=rectangle(node),included=input.included(original),clip=panel?{x:panel.left,y:panel.top,width:panel.width,height:panel.height}:undefined;
    if(!validRectangle(rect)||clip&&!validRectangle(clip)){truncated=true;continue;}
    occurrences.push({id,nodeId,kind:node.page.transient?.kind==='group'?'group':node.page.transient?.kind==='section'?'section':'node',
      label:text(node.label),role:node.role,areaId:area??null,bounds:rect,included,
      inViewport:included&&input.visible.has(id)&&inViewport(rect,clip,input),
      ...(node.viewDescription?{description:text(node.viewDescription)}:{}),...(node.viewBadge?{badge:text(node.viewBadge.label)}:{})});
    canonicalByOccurrence.set(id,nodeId);
    if(node.page.transient?.kind==='group')groupOccurrences.add(id);
    include(rect);
  }
  for(const cluster of input.clusters){
    if(!inspect())break;
    const clip={x:cluster.left,y:cluster.top,width:cluster.width,height:cluster.viewportHeight};
    for(const child of cluster.children){
      if(!inspect())break;
      if(occurrences.length===2048){truncated=true;break;}
      const nodeId=canonical(child.relation.page),rect=rectangle({x:cluster.left+child.localX,y:cluster.top+child.localY-cluster.scrollTop,width:child.width,height:child.height});
      if(!identities([child.key,nodeId,cluster.key])||!validRectangle(rect)||!validRectangle(clip)){truncated=true;continue;}
      if(!reserve(child.key.length+(nodeId?.length??0)+Math.min(child.label.length,4096)+256))break;
      const included=input.included(cluster.parent),sourceOccurrence=occurrenceKey(cluster.parent),sourceId=canonicalByOccurrence.get(sourceOccurrence),semantic=sourceId!==null&&sourceId!==undefined&&nodeId!==null;
      occurrences.push({id:child.key,nodeId,kind:child.relation.page.transient?.kind==='group'?'group':child.relation.page.transient?.kind==='section'?'section':'node',label:text(child.label),role:child.relation.role,areaId:cluster.key,
        bounds:rect,included,inViewport:included&&inViewport(rect,clip,input)});include(rect);canonicalByOccurrence.set(child.key,nodeId);
      if(child.relation.page.transient?.kind==='group')groupOccurrences.add(child.key);
      const definition=semantic?child.relation.typeDefinition??null:null;
      if(!canonicalByOccurrence.has(sourceOccurrence)){truncated=true;continue;}
      if(connections.length<4096&&identities([definition])&&reserve(child.key.length*2+sourceOccurrence.length+(sourceId?.length??0)+(nodeId?.length??0)+(definition?.length??0)+256))connections.push({id:`expanded-edge:${child.key}`,kind:semantic?'semantic':'structural',
        sourceOccurrence,targetOccurrence:child.key,sourceNodeId:semantic?sourceId:null,targetNodeId:semantic?nodeId:null,
        role:semantic?child.relation.role:null,definition,relationType:semantic?child.relation.relationType:null,direction:semantic?child.relation.linkDirection:null});
      else truncated=true;
    }
    if(areas.length<256&&identities([cluster.key])&&validRectangle(clip)&&reserve(cluster.key.length+128))areas.push({id:cluster.key,bounds:{...clip},viewport:{...clip},scrollTop:cluster.scrollTop,contentHeight:cluster.contentHeight});
    else truncated=true;
  }
  for(const edge of input.edges){
    if(!inspect())break;
    if(connections.length===4096){truncated=true;break;}
    const sourceOccurrence=edgeOccurrence(edge,'source'),targetOccurrence=edgeOccurrence(edge,'target');
    if(!canonicalByOccurrence.has(sourceOccurrence)||!canonicalByOccurrence.has(targetOccurrence)){truncated=true;continue;}
    const sourceCanonical=canonicalByOccurrence.get(sourceOccurrence),targetCanonical=canonicalByOccurrence.get(targetOccurrence);
    const evidenceSource=edge.explanationSourcePath??sourceCanonical,evidenceTarget=edge.explanationTargetPath??targetCanonical;
    const semantic=semanticSceneEdge(edge)&&!groupOccurrences.has(sourceOccurrence)&&!groupOccurrences.has(targetOccurrence)
      &&evidenceSource!==null&&evidenceSource!==undefined&&evidenceTarget!==null&&evidenceTarget!==undefined;
    const sourceId=semantic?evidenceSource:null,targetId=semantic?evidenceTarget:null;
    const definition=semantic?edge.typeDefinition??null:null;
    if(!identities([edge.id,sourceOccurrence,targetOccurrence,sourceId,targetId,definition]))continue;
    if(!reserve(edge.id.length+sourceOccurrence.length+targetOccurrence.length+(sourceId?.length??0)+(targetId?.length??0)+(definition?.length??0)+256))break;
    connections.push({id:edge.id,kind:semantic?'semantic':edge.kind==='decorative'?'decorative':'structural',sourceOccurrence,targetOccurrence,
      sourceNodeId:sourceId,targetNodeId:targetId,
      role:semantic?edge.role:null,definition,relationType:semantic?edge.relationType:null,direction:semantic?edge.direction:null});
  }
  for(const edge of input.scene.sectionTreeEdges??[]){
    if(!inspect())break;
    const sourceOccurrence=edge.sourceOccurrence??edge.sourcePath,targetOccurrence=edge.targetOccurrence??edge.targetPath;
    if(!canonicalByOccurrence.has(sourceOccurrence)||!canonicalByOccurrence.has(targetOccurrence)||!identities([edge.id,sourceOccurrence,targetOccurrence])){truncated=true;continue;}
    if(connections.length===4096||!reserve(edge.id.length+sourceOccurrence.length+targetOccurrence.length+128)){truncated=true;break;}
    connections.push({id:edge.id,kind:'structural',sourceOccurrence,targetOccurrence,
      sourceNodeId:null,targetNodeId:null,role:null,definition:null,relationType:null,direction:null});
  }
  for(const id in input.scene.zoneAreas){const area=input.scene.zoneAreas[id];if(!area||!Object.prototype.hasOwnProperty.call(input.scene.zoneAreas,id))continue;
    if(!inspect())break;
    if(areas.length===256||!reserve(id.length+256)){truncated=true;break;}
    const panel=input.scene.zoneViewports[id],rect={x:area.left,y:area.top,width:area.width,height:area.height};
    if(!identities([id])||!validRectangle(rect)){truncated=true;continue;}
    areas.push({id,bounds:rect,viewport:panel?{x:panel.left,y:panel.top,width:panel.width,height:panel.height}:null,
      scrollTop:input.scroll[id]??0,contentHeight:panel?.contentHeight??area.height});include(rect);
  }
  for(const decoration of input.scene.decorations??[]){
    if(!inspect())break;
    const label=input.decorationLabel(decoration);
    if(!identities([decoration.id]))continue;
    const points=decoration.kind==='region'?0:Math.min(decoration.points.length,256);
    if(decorations.length===256||!reserve(decoration.id.length+Math.min(label?.length??0,4096)+points*64+128)){truncated=true;break;}
    if(decoration.kind==='region'){const rect={...decoration.bounds};if(!validRectangle(rect)){truncated=true;continue;}decorations.push({id:decoration.id,kind:'region',bounds:rect,...(label?{label:text(label)}:{})});include(rect);}
    else {if(decoration.points.length>256)truncated=true;decorations.push({id:decoration.id,kind:'guide',...(label?{label:text(label)}:{}),
      points:decoration.points.slice(0,256).map(/** Copy existing decorative coordinates with no semantic endpoints. */ point=>({x:point.x,y:point.y}))});}
  }
  const folds:string[]=[],areaFilters:Record<string,string>={};let filterCount=0;
  for(const fold of input.folds){if(!inspect())break;if(folds.length===2048){truncated=true;break;}if(!identities([fold]))continue;if(!reserve(fold.length+8))break;folds.push(fold);}
  for(const id in input.filters.areas){
    if(!Object.prototype.hasOwnProperty.call(input.filters.areas,id))continue;
    if(!inspect())break;
    if(++filterCount>128){truncated=true;break;}
    const value=input.filters.areas[id];if(!identities([id]))continue;if(!reserve(id.length+Math.min(value.length,4096)+16))break;
    Object.defineProperty(areaFilters,id,{value:text(value),enumerable:true,configurable:true,writable:true});
  }
  const selection=input.selection&&identities([input.selection])&&reserve(input.selection.length+8)?input.selection:null;
  const find=reserve(Math.min(input.filters.find.length,4096)+16)?text(input.filters.find):'';
  const quick=input.filters.quick&&reserve(Math.min(input.filters.quick.field.length,4096)+Math.min(input.filters.quick.operator.length,4096)+Math.min(input.filters.quick.value.length,4096)+32)
    ?{field:text(input.filters.quick.field),operator:text(input.filters.quick.operator),value:text(input.filters.quick.value)}:undefined;
  return {semanticRevision:input.semanticRevision,sourceRevision:input.sourceRevision??0,configurationRevision:input.configurationRevision??0,
    scenePending:input.pending,motionPending:input.motion,occurrences,connections,decorations,areas,
    camera:{...input.camera},viewport:{...input.viewport},bounds,coverage:{...input.coverage},truncated,
    selection,folds,filters:{layoutMode:text(input.filters.layoutMode),globalActive:input.filters.globalActive,find,areas:areaFilters,...(quick?{quick}:{})}};
}
