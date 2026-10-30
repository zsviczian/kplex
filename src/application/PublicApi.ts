/** Trusted automation use cases over existing bounded read/action ports. This owner supplies
 * version-one envelopes, passive coverage, revision fences and detached output. It schedules
 * no indexing or hydration. Disposal releases host closures even when clients retain handles. */
import {PublicApiError,PUBLIC_API_LIMITS as limits,PUBLIC_API_VERSION,type PublicApiPorts,type PublicApiRevision,type PublicApiResult,type PublicCoverage,type PublicReadOptions,type PublicGraphqlRequest,type PublicCanvasSnapshot} from './publicApiContracts';
import type {Role} from '../core/graph/relations';
import type {PublicApiConfiguration} from './PublicApiConfiguration';
import {publicApiMarkdownLiteral as literal} from './publicApiMarkdown';

const unknownCoverage:PublicCoverage={scope:'unknown',complete:false,pending:false};
/** JSON output is bounded before serialization or copying, preventing oversized host values
 * from turning small queries into accidental note/property exports or large allocations. */
function detached<T>(value:T):T {
  let remaining=limits.outputCharacters as number,nodes=50000;
  /** Inspect only finite plain JSON values; output DTOs never contain executable/native objects. */
  const inspect=(item:unknown,depth:number):void=>{
    if(--nodes<0||depth>32)throw new PublicApiError('LIMIT_EXCEEDED','Response structure exceeds the output budget');
    if(item===undefined||item===null||typeof item==='boolean')return;
    if(typeof item==='number'){if(!Number.isFinite(item))throw new PublicApiError('UNAVAILABLE','Nonfinite response value');remaining-=24;}
    else if(typeof item==='string'){remaining-=item.length*2+2;}
    else if(Array.isArray(item)){for(const entry of item)inspect(entry,depth+1);}
    else if(typeof item==='object'){for(const [key,entry]of Object.entries(item)){remaining-=key.length*2+4;inspect(entry,depth+1);}}
    else throw new PublicApiError('UNAVAILABLE','Response is not JSON data');
    if(remaining<0)throw new PublicApiError('LIMIT_EXCEEDED','Response exceeds the output budget');
  };
  inspect(value,0);
  const text=JSON.stringify(value);if(text.length>limits.outputCharacters)throw new PublicApiError('LIMIT_EXCEEDED','Response exceeds the output budget');
  return JSON.parse(text) as T;
}
/** Reject invalid identities without normalization; canonical IDs remain exact and case-sensitive. */
function identity(value:unknown,name:string):string {
  if(typeof value!=='string'||!value||value.length>limits.text)throw new PublicApiError('INVALID_ARGUMENT',`${name} must be a nonempty bounded string`);
  return value;
}
/** Page bounds are rejected explicitly rather than silently increasing traversal/output costs. */
function pageLimit(value:unknown,maximum:number=limits.page,fallback=40):number {
  if(value===undefined)return fallback;
  if(typeof value!=='number'||!Number.isInteger(value)||value<1||value>maximum)throw new PublicApiError('INVALID_ARGUMENT',`Limit must be an integer from 1 through ${maximum}`);
  return value;
}

export class PublicApi {
  readonly version=PUBLIC_API_VERSION;
  readonly limits=limits;
  private ports:PublicApiPorts|null;
  private lastRevision:PublicApiRevision={semantic:0,source:0,configuration:0};
  readonly configuration;
  /** Retain only supplied use-case capabilities; no plugin/global discovery is performed. */
  constructor(ports:PublicApiPorts){
    this.ports=ports;
    this.configuration={
      list:(...args:Parameters<PublicApiConfiguration['list']>)=>this.read({},()=>this.owner().configuration.list(...args),{scope:'configuration',complete:true,pending:false}),
      export:(...args:Parameters<PublicApiConfiguration['export']>)=>this.read({},()=>this.owner().configuration.export(...args),{scope:'configuration',complete:true,pending:false}),
      validate:(...args:Parameters<PublicApiConfiguration['validate']>)=>this.read({},()=>this.owner().configuration.validate(...args),{scope:'configuration',complete:true,pending:false}),
      preview:(...args:Parameters<PublicApiConfiguration['preview']>)=>this.read({},()=>this.owner().configuration.preview(...args),{scope:'configuration',complete:true,pending:false}),
      apply:(...args:Parameters<PublicApiConfiguration['apply']>)=>this.action(()=>this.owner().configuration.apply(...args)),
    };
  }
  /** Read current passive indexing facts; an unknown total never becomes a whole-vault count. */
  status(options:PublicReadOptions={}){return this.read(options,()=>this.owner().status(),()=>this.owner().status().coverage);}
  /** Coverage certificates are passive and distinguish one exact center from global semantics. */
  coverage(options:PublicReadOptions&{id?:string}={}){return this.read(options,()=>this.owner().graph.coverage(options.id),()=>this.owner().graph.coverage(options.id));}
  /** Configured ontology works before graph admission; discovered inventory is explicitly opt-in. */
  ontology(options:PublicReadOptions&{includeDiscovered?:boolean;limit?:number}={}){
    return this.read(options,()=>this.ontologyModel(options),
      {scope:'configuration',complete:true,pending:false,discoveryComplete:false});
  }
  /** Return authored meanings and literal property-writing syntax without synthesizing meaning. */
  ontologyGuide(options:PublicReadOptions&{format?:'json'|'markdown';includeDiscovered?:boolean;limit?:number}={}){
    return this.read(options,()=>{
      if(options.format!==undefined&&options.format!=='json'&&options.format!=='markdown')throw new PublicApiError('INVALID_ARGUMENT','Unknown guide format');
      const model=this.ontologyModel(options);
      const syntax={frontmatter:'Use the exact physical field as a YAML property and an Obsidian note link as its value.',inline:'Use the exact physical field followed by :: and an Obsidian note link.',inverse:'Either endpoint can declare one physical property. K-Plex does not write a reciprocal property automatically.',undocumented:'A missing description supplies no authored meaning. Discovered unassigned fields do not define relationships.'};
      return options.format==='markdown'?['# K-Plex ontology',...Object.values(syntax),'',...model.fields.map(field=>`${literal(field.name)} (${field.role}${field.partner?`; inverse ${literal(field.partner)}`:''}): ${field.description?literal(field.description):'No authored description.'}`)].join('\n'):{...model,syntax};
    },{scope:'configuration',complete:true,pending:false,discoveryComplete:false});
  }
  /** Exact node metadata reads never acquire sources or traverse its relationships. */
  node(options:PublicReadOptions&{id:string}){return this.read(options,()=>this.owner().graph.node(identity(options.id,'Node ID')),()=>this.owner().graph.coverage(options.id));}
  /** Rank the already-published search vocabulary within its explicit scanning/output budget. */
  search(options:PublicReadOptions&{query:string;limit?:number}){return this.read(options,()=>{
    if(typeof options.query!=='string'||options.query.length>512)throw new PublicApiError('INVALID_ARGUMENT','Search query exceeds 512 characters');
    return this.owner().graph.search(options.query,pageLimit(options.limit),this.cancellation(options));
  },()=>this.owner().graph.coverage());}
  /** Read one bounded canonical neighborhood independent of canvas visibility/lens preferences. */
  neighbors(options:PublicReadOptions&{id:string;role?:Exclude<Role,'sibling'>;limit?:number}){return this.read(options,()=>{
    if(options.role!==undefined&&!['parent','child','left','right','previous','next'].includes(options.role))throw new PublicApiError('INVALID_ARGUMENT','Unknown relationship role');
    return this.owner().graph.neighbors(identity(options.id,'Node ID'),options.role,pageLimit(options.limit),this.cancellation(options));
  },()=>this.owner().graph.coverage(options.id));}
  /** Evidence is explicit, pair-scoped and contains genuine provenance without raw note values. */
  evidence(options:PublicReadOptions&{sourceId:string;targetId:string;limit?:number}){return this.read(options,()=>this.owner().graph.evidence(identity(options.sourceId,'Source ID'),identity(options.targetId,'Target ID'),pageLimit(options.limit,limits.evidence,128),this.cancellation(options)),()=>this.owner().graph.coverage(options.sourceId));}
  /** List only registered canvas sessions; these IDs expire with their native incarnation. */
  canvases(options:PublicReadOptions={}){return this.read(options,()=>this.owner().canvas.list(),{scope:'local',complete:true,pending:false});}
  /** Read an explicit committed canvas; ambiguity never resolves through global focus. */
  canvas(options:PublicReadOptions&{canvasId?:string}={}){
    let frame:PublicCanvasSnapshot|undefined;
    /** Coverage and output consume the same committed frame and only one bounded host projection. */
    const snapshot=():PublicCanvasSnapshot=>frame??(frame=this.snapshot(options.canvasId));
    return this.read(options,()=>{
    const value=snapshot();
    if(options.expectedRevision?.canvas!==undefined&&options.expectedRevision.canvas!==value.canvas.revision)throw new PublicApiError('STALE_REVISION','Requested canvas revision is stale');
    return value;
  },()=>snapshot().coverage);}
  /** Project bounded scene context into Markdown, quoting authored labels as inert literal text. */
  context(options:PublicReadOptions&{canvasId?:string}={}){
    let frame:PublicCanvasSnapshot|undefined;
    /** Formatting and coverage share one committed snapshot instead of rereading the host scene. */
    const snapshot=():PublicCanvasSnapshot=>frame??(frame=this.snapshot(options.canvasId));
    return this.read(options,()=>{
    const value=snapshot();
    if(options.expectedRevision?.canvas!==undefined&&options.expectedRevision.canvas!==value.canvas.revision)throw new PublicApiError('STALE_REVISION','Requested canvas revision is stale');
    return [`# K-Plex canvas ${literal(value.canvas.id)}`,`View: ${literal(value.canvas.viewId)}`,`Attention: ${literal(value.canvas.attention)}`,`Root: ${literal(value.canvas.root)}`,`Coverage: ${value.coverage.scope}; complete=${value.coverage.complete}; truncated=${value.truncated}`,`Scene pending: ${value.scenePending}; motion pending: ${value.motionPending}`,'','## Materialized occurrences',...value.occurrences.map(item=>`- ${literal(item.id)}: ${literal(item.label)}; node=${literal(item.nodeId)}; included=${item.included}; inViewport=${item.inViewport}`),'','## Connections',...value.connections.map(item=>`- ${item.kind}: ${literal(item.sourceOccurrence)} → ${literal(item.targetOccurrence)} (${literal(item.role??'no semantic role')})`)].join('\n');
  },()=>snapshot().coverage);}
  /** Existing-note navigation delegates to the captured canvas's native persistence preflight. */
  navigate(options:{canvasId?:string;path:string}){return this.action(()=>this.owner().canvas.navigate(this.canvasId(options.canvasId),identity(options.path,'Note path')),{scope:'local',complete:false,pending:false});}
  /** Session selection retains the existing view/editor lifecycle and affects only this canvas. */
  selectView(options:{canvasId?:string;viewId:string}){return this.action(()=>this.owner().canvas.selectView(this.canvasId(options.canvasId),identity(options.viewId,'View ID')),{scope:'local',complete:false,pending:false});}
  /** Existing captured contribution commands select supported presets without rewriting settings. */
  selectPreset(options:{canvasId?:string;presetId:string}){return this.action(()=>this.owner().canvas.selectPreset(this.canvasId(options.canvasId),identity(options.presetId,'Preset ID')),{scope:'local',complete:false,pending:false});}
  /** Execute genuine read-only GraphQL through the injected lazy transport and the same read model. */
  query(request:PublicGraphqlRequest){return this.read({...request,requireComplete:false},()=>this.owner().graphql(this,request),()=>this.owner().graph.coverage());}
  /** Finite discovery advertises actual available operations and explicit deferred exporters. */
  capabilities(){return this.read({},()=>({version:1,readOnlyGraphql:true,operations:['status','coverage','ontology','ontologyGuide','node','search','neighbors','evidence','canvases','canvas','context','navigate','selectView','selectPreset','configuration','query'],exports:{image:false,mindmapMarkdown:false},limits}),{scope:'configuration',complete:true,pending:false});}
  /** Release all host references. Previously retained methods remain callable with closed errors. */
  dispose():void{this.ports=null;}
  /** Fail closed without retaining the plugin through an unloaded service handle. */
  private owner():PublicApiPorts{if(!this.ports)throw new PublicApiError('API_UNAVAILABLE','K-Plex API is unloaded');return this.ports;}
  /** Capture the most recent scalar revision even after retirement; it retains no host references. */
  private revision():PublicApiRevision{if(this.ports)this.lastRevision={...this.ports.revisions()};return this.lastRevision;}
  /** Cancellation observes the caller and lifecycle without scheduling work or retaining an owner. */
  private cancellation(options:PublicReadOptions):()=>boolean{return()=>!this.ports||options.isCancelled?.()===true;}
  /** Missing canvas IDs are usable only when exactly one native registration exists. */
  private canvasId(id:string|undefined):string{
    if(id!==undefined)return identity(id,'Canvas ID');
    const rows=this.owner().canvas.list();if(rows.length!==1)throw new PublicApiError(rows.length?'AMBIGUOUS_CANVAS':'NOT_FOUND',rows.length?'Specify a canvas ID':'No canvas is available');return rows[0].id;
  }
  /** Each invocation reacquires the registered reader rather than retaining a React render. */
  private snapshot(id:string|undefined):PublicCanvasSnapshot{const value=this.owner().canvas.snapshot(this.canvasId(id));if(!value)throw new PublicApiError('NOT_FOUND','Canvas is unavailable');return value;}
  /** Configured definitions need no graph proof. Explicit complete discovery requests must have
   * both the existing inventory certificate and untruncated output; no scan is initiated here. */
  private ontologyModel(options:PublicReadOptions&{includeDiscovered?:boolean;limit?:number}){
    const value=this.owner().ontology({includeDiscovered:options.includeDiscovered===true,limit:pageLimit(options.limit,limits.ontology,limits.ontology)});
    if(options.includeDiscovered===true&&options.requireComplete===true&&(!value.discoveryComplete||value.truncated))throw new PublicApiError('INDEX_INCOMPLETE','Discovered ontology inventory is incomplete');
    return value;
  }
  /** Normalize only known machine errors; arbitrary host exceptions never leak payloads or content. */
  private failure<T>(error:unknown):PublicApiResult<T>{return{ok:false,error:error instanceof PublicApiError?{code:error.code,message:error.message}:{code:'UNAVAILABLE',message:'K-Plex operation failed'},revision:this.revision()};}
  /** Synchronous reads are one revision frame; requireComplete never waits or expands coverage. */
  private read<T>(options:PublicReadOptions,read:()=>T,coverage:PublicCoverage|(()=>PublicCoverage)=unknownCoverage):PublicApiResult<T>{
    try{
      this.owner();if(this.cancellation(options)())throw new PublicApiError('CANCELLED','Request was cancelled');
      const before=this.revision();if(options.expectedRevision&&['semantic','source','configuration'].some(key=>Reflect.get(options.expectedRevision??{},key)!==Reflect.get(before,key)))throw new PublicApiError('STALE_REVISION','Requested revision is stale');
      const cover=typeof coverage==='function'?coverage():coverage;
      if(options.requireComplete===true&&!cover.complete)throw new PublicApiError('INDEX_INCOMPLETE','Required coverage is not complete');
      const value=detached(read()),after=this.revision();
      if(this.cancellation(options)())throw new PublicApiError('CANCELLED','Request was cancelled');
      if(before.semantic!==after.semantic||before.source!==after.source||before.configuration!==after.configuration)throw new PublicApiError('STALE_REVISION','Publication changed during the read');
      const truncated=typeof value==='object'&&value!==null&&Reflect.get(value,'truncated')===true;
      if(options.requireComplete===true&&truncated)throw new PublicApiError('INDEX_INCOMPLETE','Response is truncated');
      const canvas=typeof value==='object'&&value!==null?Reflect.get(value,'canvas'):undefined;
      const canvasRevision=canvas&&typeof canvas==='object'?Reflect.get(canvas,'revision'):undefined;
      return{ok:true,value,revision:typeof canvasRevision==='number'?{...after,canvas:canvasRevision}:after,coverage:{...cover},truncated};
    }catch(error){return this.failure(error);}
  }
  /** An accepted durable write remains saved even if retirement occurs while disk I/O completes. */
  private async action<T>(run:()=>Promise<T>,coverage:PublicCoverage={scope:'configuration',complete:true,pending:false}):Promise<PublicApiResult<T>>{
    try{this.owner();const value=detached(await run());return{ok:true,value,revision:this.revision(),coverage,truncated:false};}
    catch(error){return this.failure(error);}
  }
}
