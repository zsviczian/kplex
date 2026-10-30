/** Version-one trusted automation contracts. Values contain no host objects or note bodies;
 * application reads share published semantic owners and never grant indexing or write authority.
 * Canvas registrations and configuration transactions retain their existing lifecycle owners. */
import type {GraphNodeView} from '../core/graph/model';
import type {OntologyReadField} from '../core/contracts/ontologyReadModel';
import type {Role} from '../core/graph/relations';
import type {MindMapMarkdownResult} from '../core/plex/export/mindMapMarkdown';
import type {PublicApiConfiguration} from './PublicApiConfiguration';
import type {PublicApi} from './PublicApi';

export type JsonValue=null|boolean|number|string|readonly JsonValue[]|{readonly [key:string]:JsonValue};
export type PublicApiErrorCode='INVALID_ARGUMENT'|'UNAVAILABLE'|'API_UNAVAILABLE'|'DISPOSED'|'NOT_FOUND'|'AMBIGUOUS_CANVAS'|'INDEX_INCOMPLETE'|'LIMIT_EXCEEDED'|'STALE_REVISION'|'CANCELLED'|'CONFIRMATION_REQUIRED'|'WRITE_FAILED'|'UNSUPPORTED';
/** Stable machine failures are developer diagnostics, independent of translated product notices. */
export class PublicApiError extends Error {
  /** Preserve a finite code without retaining arbitrary thrown payloads or host state. */
  constructor(readonly code:PublicApiErrorCode,message:string){super(message);this.name='PublicApiError';}
}
export type PublicApiRevision=Readonly<{semantic:number;source:number;configuration:number;canvas?:number}>;
export type PublicCoverage=Readonly<{scope:'configuration'|'global'|'local'|'cached'|'unknown';complete:boolean;pending:boolean;discoveryComplete?:boolean}>;
export type PublicApiResult<T>=Readonly<{ok:true;value:T;revision:PublicApiRevision;coverage:PublicCoverage;truncated:boolean}>|Readonly<{ok:false;error:Readonly<{code:PublicApiErrorCode;message:string}>;revision:PublicApiRevision}>;
export type PublicReadOptions=Readonly<{requireComplete?:boolean;isCancelled?:()=>boolean;expectedRevision?:PublicApiRevision}>;
export type PublicPage<T>=Readonly<{items:readonly T[];truncated:boolean;scanned:number}>;
export type PublicNode=GraphNodeView;
export type PublicRelationship=Readonly<{sourceId:string;targetId:string;role:Exclude<Role,'sibling'>;relationType:number;direction:number|null;definition:string|null}>;
export type PublicEvidenceDecision=Readonly<{id:string;sourceId:string;targetId:string;role:string;relationType:number;direction:number;sourceKind:string;declaredByPath:string;declaredTargetPath:string;declaredRole:string;fieldName?:string;definition?:string;line?:number;start?:number;end?:number;active:boolean;suppressionReason?:string}>;
export type PublicEvidence=Readonly<{sourceId:string;targetId:string;resolvedRoles:readonly Readonly<{role:string;relationType:number}>[];hidden:boolean;summary:string;decisions:readonly PublicEvidenceDecision[];truncated:boolean}>;
export type PublicIndexStatus=Readonly<{phase:string;upToDate:boolean;indexedFiles:number;totalFiles:number|null;coverage:PublicCoverage;searchComplete:boolean;hydrating:boolean;sourceReady:boolean;mode:'eager'|'on-demand'}>;
export type PublicOntologyRead=Readonly<{fields:readonly OntologyReadField[];truncated:boolean;discoveryComplete:boolean}>;
export type PublicRect=Readonly<{x:number;y:number;width:number;height:number}>;
export type PublicCanvasSummary=Readonly<{id:string;viewId:string;attention:string|null;root:string|null;surface:'main'|'sidebar'|'popout';visible:boolean;revision:number}>;
export type PublicCanvasOccurrence=Readonly<{id:string;nodeId:string|null;kind:'node'|'section'|'group';label:string;role:string;areaId:string|null;bounds:PublicRect;included:boolean;inViewport:boolean;description?:string;badge?:string}>;
export type PublicCanvasConnection=Readonly<{id:string;kind:'semantic'|'structural'|'decorative';sourceOccurrence:string;targetOccurrence:string;sourceNodeId:string|null;targetNodeId:string|null;role:string|null;definition:string|null;relationType:number|null;direction:number|null}>;
export type PublicCanvasDecoration=Readonly<{id:string;kind:string;label?:string;bounds?:PublicRect;points?:readonly Readonly<{x:number;y:number}>[]}>;
export type PublicCanvasSnapshot=Readonly<{canvas:PublicCanvasSummary;semanticRevision:number;sourceRevision:number;configurationRevision:number;scenePending:boolean;motionPending:boolean;state:JsonValue|null;preset:Readonly<{id:string;label:string}>|null;lenses:readonly Readonly<{id:string;name:string;mode:string;scope:string}>[];filters:Readonly<{layoutMode:string;globalActive:boolean;find:string;areas:Readonly<Record<string,string>>;quick?:Readonly<{field:string;operator:string;value:string}>}>;folds:readonly string[];foldState?:Readonly<{branches:readonly Readonly<{occurrenceId:string;expanded:boolean}>[];sections:Readonly<{expanded:boolean;expandedIds:readonly string[]}>;groups:Readonly<{unfoldedIds:readonly string[]}>}>;selection:string|null;occurrences:readonly PublicCanvasOccurrence[];connections:readonly PublicCanvasConnection[];decorations:readonly PublicCanvasDecoration[];areas:readonly Readonly<{id:string;bounds:PublicRect;viewport:PublicRect|null;scrollTop:number;contentHeight:number}>[];camera:Readonly<{x:number;y:number;scale:number}>;viewport:Readonly<{width:number;height:number}>;bounds:PublicRect|null;coverage:PublicCoverage;truncated:boolean}>;
export type PublicActionReceipt=Readonly<{status:'completed'|'accepted';canvasId:string;revision:number}>;
export type PublicMarkdownExport=MindMapMarkdownResult&Readonly<{canvasId:string;canvasRevision:number}>;
export type PublicCanvasPort=Readonly<{list:()=>readonly PublicCanvasSummary[];snapshot:(id:string)=>PublicCanvasSnapshot|null;exportMarkdown:(id:string,subtreeOccurrenceId?:string)=>PublicMarkdownExport;navigate:(id:string,path:string)=>Promise<PublicActionReceipt>;selectView:(id:string,viewId:string)=>Promise<PublicActionReceipt>;selectPreset:(id:string,presetId:string)=>Promise<PublicActionReceipt>}>;
export type PublicGraphPort=Readonly<{node:(id:string)=>PublicNode|null;search:(query:string,limit:number,cancelled:()=>boolean)=>PublicPage<PublicNode>;neighbors:(id:string,role:Exclude<Role,'sibling'>|undefined,limit:number,cancelled:()=>boolean)=>PublicPage<PublicRelationship>;evidence:(sourceId:string,targetId:string,limit:number,cancelled:()=>boolean)=>PublicEvidence|null;coverage:(id?:string)=>PublicCoverage}>;
export type PublicGraphqlRequest=PublicReadOptions&Readonly<{query:string;variables?:Readonly<Record<string,unknown>>;operationName?:string}>;
export type PublicGraphqlExecution=Readonly<{data?:unknown;errors?:readonly Readonly<{message:string;path?:readonly (string|number)[];extensions?:Readonly<Record<string,unknown>>}>[]}>;
export type PublicApiPorts=Readonly<{revisions:()=>PublicApiRevision;status:()=>PublicIndexStatus;ontology:(options:Readonly<{includeDiscovered:boolean;limit:number}>)=>PublicOntologyRead;graph:PublicGraphPort;canvas:PublicCanvasPort;configuration:PublicApiConfiguration;now:()=>number;graphql:(reads:PublicApi,request:PublicGraphqlRequest)=>PublicGraphqlExecution}>;
export const PUBLIC_API_VERSION=1;
export const PUBLIC_API_LIMITS=Object.freeze({page:200,ontology:2048,queryCharacters:16384,queryTokens:4096,queryDepth:20,queryCost:65536,outputCharacters:1048576,scan:8192,evidence:512,text:4096});
