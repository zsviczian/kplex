/** Reviewed ontology-only automation over the existing canonical settings writer.
 * Plans are detached, bounded, expiring and single-use; this owner never opens files,
 * classifies relationships, starts indexing or persists settings itself. */
import {PublicApiError,PUBLIC_API_LIMITS} from './publicApiContracts';
import {prepareOntologyBatch,captureOntologyBatchInput,OntologyBatchError,type OntologyBatchPlan,type OntologyBatchEdit,type OntologyBatchChange} from '../core/contracts/ontologyBatch';
import {ontologyEndpointState,ontologyConfiguration,type OntologyConfigurationInput} from '../core/contracts/ontologyConfiguration';
import {ontologyReadModel,type OntologyReadField} from '../core/contracts/ontologyReadModel';
import {normalizeFieldName} from '../core/contracts/fieldName';
import {detachPublicApiValue} from './PublicApi';

export const PUBLIC_ONTOLOGY_CONFIGURATION_LIMITS=Object.freeze({plans:16,previewMilliseconds:300_000});
export type OntologyConfigurationConflict=Readonly<{index:number;issue:string;message:string}>;
export type OntologyConfigurationPreview=Readonly<{state:'ready';previewId:string;expiresAt:number;configurationRevision:number;before:readonly OntologyReadField[];after:readonly OntologyReadField[];changes:readonly OntologyBatchChange[];conflicts:readonly []}>
  |Readonly<{state:'conflict';previewId:null;conflicts:readonly OntologyConfigurationConflict[]}>;
export type OntologyConfigurationApplyRequest=Readonly<{previewId:string;confirm:boolean;isCancelled?:()=>boolean}>;
export type OntologyConfigurationApplyReceipt=Readonly<{state:'saved';refreshPending:boolean;verified:boolean;configurationRevision:number|null;readbackScope:'reviewed-endpoints';readback:readonly OntologyReadField[]|null}>;
export type OntologyConfigurationApiPort=Readonly<{
  read:()=>OntologyConfigurationInput;
  capture:(plan:OntologyBatchPlan)=>(()=>boolean);
  save:(edits:readonly OntologyBatchEdit[],expected:OntologyConfigurationInput,current:()=>boolean)=>Promise<Readonly<{refreshPending:boolean}>>;
  current:()=>boolean;
  now:()=>number;
  revision:()=>number;
  sessionId:string;
}>;
type Review=Readonly<{plan:OntologyBatchPlan;expiresAt:number;current:()=>boolean}>;

/** Clone bounded data-only plans/results so consumers cannot rewrite retained authorization. */
function detached<T>(value:T):T{return JSON.parse(JSON.stringify(value)) as T;}
/** Compare exact affected physical assignments, pairing and independent descriptions. */
function equivalent(a:unknown,b:unknown):boolean{return JSON.stringify(a)===JSON.stringify(b);}
/** Collect the finite reviewed endpoint spellings, including former/new counterparts. */
function endpoints(plan:OntologyBatchPlan):readonly string[]{return [...new Set(plan.changes.flatMap(/** An edited field may not exist before or after removal. */ change=>[change.edit.field,...change.before.map(field=>field.name),...change.after.map(field=>field.name)]))];}

/** Bound accepted readback independently of unrelated settings which may grow after preview.
 * At most three endpoint identities per edit are returned. The conservative encoded bound
 * leaves envelope space below PublicApi's structural/string guards, so readback cannot turn
 * an already durable operation into a response-budget failure or encourage an unsafe retry. */
function boundedReadback(plan:OntologyBatchPlan,source:OntologyConfigurationInput):readonly OntologyReadField[]{
  const snapshot=captureOntologyBatchInput(source),keys=new Set(endpoints(plan).map(/** Spelling changes share one configured identity without losing the exact returned spelling. */ normalizeFieldName));
  const readback=ontologyReadModel(ontologyConfiguration(snapshot),snapshot.ontologyDescriptions).filter(/** Unrelated definitions are not part of this save's verification receipt. */ field=>keys.has(field.key));
  // The canonical batch has 128 intents with at most three relevant identities each. These
  // finite DTOs are shallow and contain fewer than 10,000 structural nodes at this cardinality.
  if(readback.length>384||JSON.stringify(readback).length*2+8192>PUBLIC_API_LIMITS.outputCharacters)throw new PublicApiError('LIMIT_EXCEEDED','Saved ontology readback exceeds its response budget');
  return readback;
}

export class PublicApiOntologyConfiguration {
  private port:OntologyConfigurationApiPort|null;
  private readonly plans=new Map<string,Review>();
  private sequence=0;

  /** Bind one API lifetime; production supplies a random nonce distinct across reloads. */
  constructor(port:OntologyConfigurationApiPort){
    if(!/^[A-Za-z0-9._-]{1,64}$/.test(port.sessionId))throw new PublicApiError('INVALID_ARGUMENT','Invalid ontology configuration session');
    this.port=port;
  }

  /** Retire offered reviews and release all plugin closures before its teardown. */
  dispose():void{this.plans.clear();this.port=null;}

  /** A retained old handle has no settings or write capability after retirement. */
  private active():OntologyConfigurationApiPort{
    if(!this.port||!this.port.current())throw new PublicApiError('API_UNAVAILABLE','Ontology configuration API is unavailable');
    return this.port;
  }

  /** Drop expired capabilities only on use, without background timers or source work. */
  private expire(port:OntologyConfigurationApiPort):void{
    for(const [id,review] of this.plans)if(review.expiresAt<=port.now())this.plans.delete(id);
  }

  /** Validate an entire bounded ordered batch and return exact diffs without publishing a draft.
   * A canonical conflict returns its failing intent index and never grants an apply token. */
  preview(edits:readonly OntologyBatchEdit[]):OntologyConfigurationPreview{
    const port=this.active();this.expire(port);
    let plan:OntologyBatchPlan;
    try{plan=prepareOntologyBatch(port.read(),edits);}
    catch(error){
      if(error instanceof OntologyBatchError){
        if(error.issue==='limit')throw new PublicApiError('LIMIT_EXCEEDED',error.message);
        return {state:'conflict',previewId:null,conflicts:[{index:error.index,issue:error.issue,message:error.message}]};
      }
      throw new PublicApiError('INVALID_ARGUMENT',error instanceof Error?error.message:'Invalid ontology configuration');
    }
    const current=port.capture(plan);
    if(!current())throw new PublicApiError('STALE_REVISION','Ontology configuration preview owner changed');
    const sequence=this.sequence+1,previewId=`ontology-${port.sessionId}-${sequence}`,expiresAt=port.now()+PUBLIC_ONTOLOGY_CONFIGURATION_LIMITS.previewMilliseconds;
    // Apply the exact shared public response budget before retaining authorization or evicting
    // another usable review. A caller never loses a plan slot to an unreturnable preview token.
    const response=detachPublicApiValue<OntologyConfigurationPreview>({state:'ready',previewId,expiresAt,configurationRevision:port.revision(),before:plan.before,after:plan.after,changes:plan.changes,conflicts:[]});
    while(this.plans.size>=PUBLIC_ONTOLOGY_CONFIGURATION_LIMITS.plans){const oldest=this.plans.keys().next();if(oldest.done)break;this.plans.delete(oldest.value);}
    this.sequence=sequence;
    this.plans.set(previewId,{plan:detached(plan),expiresAt,current});
    return response;
  }

  /** Consume exactly one explicit review and join the existing atomic ontology writer.
   * Before acceptance cancellation/staleness refuses the write. After durable acceptance
   * a retired provider or superseded readback reports unverified saved status, never retryable loss. */
  async apply(request:OntologyConfigurationApplyRequest):Promise<OntologyConfigurationApplyReceipt>{
    const port=this.active();this.expire(port);
    if(!request||request.confirm!==true)throw new PublicApiError('CONFIRMATION_REQUIRED','Apply requires confirm: true for the reviewed ontology batch');
    if(typeof request.previewId!=='string'||request.previewId.length>120||request.isCancelled!==undefined&&typeof request.isCancelled!=='function')throw new PublicApiError('INVALID_ARGUMENT','Invalid ontology configuration apply request');
    const review=this.plans.get(request.previewId);
    if(!review)throw new PublicApiError('STALE_REVISION','Ontology configuration preview is expired, missing or consumed');
    this.plans.delete(request.previewId);
    if(request.isCancelled?.())throw new PublicApiError('CANCELLED','Ontology configuration apply cancelled');
    if(!review.current())throw new PublicApiError('STALE_REVISION','Ontology configuration preview owner changed');
    const fields=endpoints(review.plan),latest=port.read();
    if(fields.some(/** Unrelated settings edits can merge; a changed reviewed endpoint cannot. */ field=>!equivalent(ontologyEndpointState(review.plan.input,field),ontologyEndpointState(latest,field))))throw new PublicApiError('STALE_REVISION','A reviewed ontology endpoint changed');
    let saved:Readonly<{refreshPending:boolean}>;
    try{saved=await port.save(review.plan.edits,review.plan.input,/** Repeated by the canonical queue before its durable acceptance. */ ()=>this.port===port&&port.current()&&review.current()&&port.now()<review.expiresAt&&!request.isCancelled?.());}
    catch(error){
      if(request.isCancelled?.())throw new PublicApiError('CANCELLED','Ontology configuration apply cancelled before acceptance');
      if(this.port!==port||!port.current())throw new PublicApiError('API_UNAVAILABLE','Ontology configuration API retired before acceptance');
      if(!review.current()||port.now()>=review.expiresAt||error instanceof Error&&error.name==='SettingsConflictError')throw new PublicApiError('STALE_REVISION','Ontology configuration review became stale before acceptance');
      throw new PublicApiError('WRITE_FAILED',error instanceof Error?error.message:'Ontology configuration save failed');
    }
    if(this.port!==port||!port.current())return {state:'saved',refreshPending:saved.refreshPending,verified:false,configurationRevision:null,readbackScope:'reviewed-endpoints',readback:null};
    try{
      const source=port.read(),readback=boundedReadback(review.plan,source);
      const verified=fields.every(/** Verify the exact saved endpoints without certifying unrelated definitions. */ field=>equivalent(ontologyEndpointState(review.plan.output,field),ontologyEndpointState(source,field)));
      return detachPublicApiValue<OntologyConfigurationApplyReceipt>({state:'saved',refreshPending:saved.refreshPending,verified,configurationRevision:port.revision(),readbackScope:'reviewed-endpoints',readback});
    }catch{return {state:'saved',refreshPending:saved.refreshPending,verified:false,configurationRevision:null,readbackScope:'reviewed-endpoints',readback:null};}
  }
}
