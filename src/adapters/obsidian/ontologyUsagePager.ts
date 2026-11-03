/** Explicit, resumable ontology usage over existing neutral-source postings. Sessions retain one
 * bounded posting page and constant-space iterator state; no source acquisition, Markdown read,
 * parsing, graph preparation, persistent write or whole-vault inventory belongs to this owner. */
import type {TFile} from 'obsidian';
import type {NeutralSourceRepository} from '../../index/SourceRepository';
import {normalizeFieldName} from '../../core/contracts/fieldName';
import {PublicApiError} from '../../application/publicApiContracts';
import {readOntologyUsageSource,type OntologyUsageDocument} from './ontologyUsage';
import type {OntologyDocumentsRequest,OntologyDocumentsPage} from '../../core/contracts/ontologyUsage';
export type {OntologyDocumentsRequest,OntologyDocumentsPage} from '../../core/contracts/ontologyUsage';

type PostingPage=Readonly<{ids:readonly string[];exhausted:boolean;complete:boolean;scanned:number;changed?:boolean;validate:()=>Promise<boolean>}>;
type Session={field:string;key:string;expires:number;revision:string;iterator:AsyncIterator<PostingPage>;pending:readonly string[];offset:number;
  ended:boolean;complete:boolean;partial:boolean;busy:boolean;current:()=>boolean;validate:(()=>Promise<boolean>)|null};
type Ports=Readonly<{repository:Pick<NeutralSourceRepository,'sourcePostingPages'|'readSelected'>;fileForPath:(path:string)=>TFile|null;
  revision:()=>string;current:()=>boolean;now:()=>number;uniqueId:()=>string}>;

/** Own finite cursor leases; expired/replayed tokens never restart traversal or silently omit a tail. */
export class OntologyUsagePager {
  private ports:Ports|null;
  private readonly sessions=new Map<string,Session>();
  private reading=false;
  /** Retain narrow repository/native identity capabilities for one API lifetime. */
  constructor(ports:Ports){this.ports=ports;}
  /** Release iterators and all host closures, including cursors retained by an unloaded caller. */
  dispose():void {this.ports=null;for(const session of this.sessions.values()){session.current=()=>false;void session.iterator.return?.();}this.sessions.clear();}
  /** Read at most 512 posting steps and 16 selected metadata sources, returning a continuation
   * even when this bounded page contains no current documents. Each successful page consumes its
   * token; callers retain the new token, not a replayable page number or index offset. */
  async read(request:OntologyDocumentsRequest,current:()=>boolean):Promise<OntologyDocumentsPage>{
    const ports=this.ports;
    if(!ports||!ports.current())throw new PublicApiError('API_UNAVAILABLE','K-Plex API is unloaded');
    if(this.reading)throw new PublicApiError('UNAVAILABLE','Another ontology usage page is in progress');
    if(!request||typeof request.field!=='string'||!request.field||request.field.length>4096)throw new PublicApiError('INVALID_ARGUMENT','A bounded physical field is required');
    const key=normalizeFieldName(request.field),limit=request.limit??40;
    if(!key||!Number.isInteger(limit)||limit<1||limit>100||request.cursor!==undefined&&(typeof request.cursor!=='string'||request.cursor.length>256))throw new PublicApiError('INVALID_ARGUMENT','Invalid ontology usage page');
    for(const [token,session]of this.sessions)if((session.expires<=ports.now()||session.revision!==ports.revision())&&!session.busy){session.current=()=>false;void session.iterator.return?.();this.sessions.delete(token);}
    let session:Session;
    if(request.cursor!==undefined){
      const found=this.sessions.get(request.cursor);
      if(!found||found.key!==key||found.field!==request.field||found.revision!==ports.revision()||found.expires<=ports.now())throw new PublicApiError('STALE_REVISION','Ontology usage cursor expired or changed');
      if(found.busy)throw new PublicApiError('UNAVAILABLE','Ontology usage cursor is in use');
      session=found;this.sessions.delete(request.cursor);
    }else{
      if(this.sessions.size>=8)throw new PublicApiError('LIMIT_EXCEEDED','Too many ontology usage cursors');
      const revision=ports.revision();
      session={field:request.field,key,expires:ports.now()+120000,revision,iterator:null as unknown as AsyncIterator<PostingPage>,pending:[],offset:0,ended:false,complete:false,partial:false,busy:false,current:()=>false,validate:null};
      session.iterator=ports.repository.sourcePostingPages('field',key,/** Every repository await observes the current page, provider and publication owner. */ ()=>session.current());
    }
    session.busy=true;this.reading=true;
    session.current=()=>this.ports===ports&&ports.current()&&current()&&ports.revision()===session.revision;
    const documents:Array<OntologyUsageDocument&{sourceId:string}>=[];
    let scanned=0,selected=0;
    try{
      if(session.validate&&!(await session.validate()))throw new PublicApiError('STALE_REVISION','Stored source posting changed before continuation');
      while(documents.length<limit&&selected<16&&scanned<512){
        if(!session.current())throw new PublicApiError(ports.current()?'STALE_REVISION':'API_UNAVAILABLE','Ontology usage publication changed or request cancelled');
        if(session.offset>=session.pending.length){
          if(session.ended)break;
          if(scanned>384)break;
          const page=await session.iterator.next();
          if(page.done){session.ended=true;session.complete=false;break;}
          if(page.value.changed)throw new PublicApiError('STALE_REVISION','Stored source posting changed during traversal');
          session.validate=page.value.validate;
          session.pending=page.value.ids;session.offset=0;session.ended=page.value.exhausted;session.complete=page.value.complete;
          scanned+=page.value.scanned;
          if(!session.pending.length)continue;
        }
        const sourceId=session.pending[session.offset++];selected++;
        const result=await readOntologyUsageSource(ports.repository,sourceId,key,ports.fileForPath,()=>session.current(),true);
        if(!session.current()||!session.validate||!(await session.validate()))throw new PublicApiError('STALE_REVISION','Stored source posting changed during metadata inspection');
        session.partial ||= result.partial;
        if(result.document)documents.push({...result.document,sourceId});
      }
      if(!session.current())throw new PublicApiError(ports.current()?'STALE_REVISION':'API_UNAVAILABLE','Ontology usage publication changed or request cancelled');
      if(session.validate&&!(await session.validate()))throw new PublicApiError('STALE_REVISION','Stored source posting changed before page publication');
      const exhausted=session.ended&&session.offset>=session.pending.length;
      let cursor:string|null=null;
      if(!exhausted){cursor=ports.uniqueId();this.sessions.set(cursor,session);}else await session.iterator.return?.();
      return {field:request.field,normalizedField:key,documents,cursor,exhausted,postingComplete:exhausted&&session.complete&&!session.partial,
        wholeVaultComplete:false,partial:true,scanned,truncated:!exhausted};
    }catch(error){session.current=()=>false;await session.iterator.return?.();throw error;}
    finally{this.reading=false;session.busy=false;session.current=()=>false;}
  }
}
