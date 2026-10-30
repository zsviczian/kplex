/** Public discovery leases for existing native document sessions. The registry owns only opaque
 * IDs, revisions and live callbacks: App/PlexGraph retain all scene, navigation and session state.
 * Migration replaces a registration without allowing an older cleanup or async action to revive it. */
import {PublicApiError, type PublicActionReceipt, type PublicCanvasPort, type PublicCanvasSnapshot,
  type PublicCanvasSummary} from './publicApiContracts';

export type PublicCanvasRegistration=Readonly<{
  current:()=>boolean;
  summary:()=>Omit<PublicCanvasSummary,'id'>;
  snapshot:()=>Omit<PublicCanvasSnapshot,'canvas'>|null;
  navigate:(path:string)=>Promise<'completed'|'accepted'>;
  selectView:(id:string)=>Promise<'completed'|'accepted'>;
  selectPreset:(id:string)=>Promise<'completed'|'accepted'>;
}>;
type Slot={id:string;ports:PublicCanvasRegistration};

export class PublicCanvasRegistry {
  private identities=new WeakMap<object,string>();
  private readonly slots=new Map<string,Slot>();
  private sequence=0;
  private revision=0;
  private closed=false;
  /** The host supplies a fresh lifetime prefix; no global clock/randomness enters portable code. */
  constructor(private readonly lifetime:string) {}

  /** Allocate a publication coordinate without retaining another scene or scheduling work. */
  nextRevision():number {return ++this.revision;}

  /** Lease one mounted App generation, retaining identity across migration of its native session. */
  register(owner:object,ports:PublicCanvasRegistration):()=>void {
    if(this.closed)return ()=>{};
    let id=this.identities.get(owner);
    if(!id){id=`${this.lifetime}:${++this.sequence}`;this.identities.set(owner,id);}
    const slot={id,ports};this.slots.set(id,slot);
    return /** Old mounts cannot remove a replacement registration for the same document session. */ ()=>{
      if(this.slots.get(slot.id)===slot)this.slots.delete(slot.id);
    };
  }

  /** Reject retired generations before calling any captured native capability. */
  private slot(id:string):Slot {
    if(this.closed)throw new PublicApiError('API_UNAVAILABLE','The canvas API lifetime has ended.');
    const slot=this.slots.get(id);
    if(!slot||!slot.ports.current())throw new PublicApiError('NOT_FOUND','The canvas is no longer mounted.');
    return slot;
  }

  /** Read only mounted-session summaries; oversized inventories fail instead of hiding ambiguity. */
  list():readonly PublicCanvasSummary[] {
    if(this.closed)throw new PublicApiError('API_UNAVAILABLE','The canvas API lifetime has ended.');
    const result:PublicCanvasSummary[]=[];let visited=0;
    for(const slot of this.slots.values()){
      if(++visited>256)throw new PublicApiError('LIMIT_EXCEEDED','Canvas discovery exceeds its work budget.');
      if(!slot.ports.current())continue;
      if(result.length===64)throw new PublicApiError('LIMIT_EXCEEDED','Too many open canvases for one discovery request.');
      const value=slot.ports.summary();
      if(this.closed||this.slots.get(slot.id)!==slot)throw new PublicApiError('API_UNAVAILABLE','The canvas changed during discovery.');
      result.push({...value,id:slot.id});
    }
    return result;
  }

  /** Serialize the committed owner's current bounded projection; an empty/loading scene stays unavailable. */
  snapshot(id:string):PublicCanvasSnapshot|null {
    const slot=this.slot(id),value=slot.ports.snapshot();
    if(this.closed||this.slots.get(id)!==slot||!slot.ports.current())throw new PublicApiError('API_UNAVAILABLE','The canvas changed during the read.');
    const summary=slot.ports.summary();
    if(this.closed||this.slots.get(id)!==slot)throw new PublicApiError('API_UNAVAILABLE','The canvas changed during the read.');
    return value?{...value,canvas:{...summary,id}}:null;
  }

  /** Await the existing action owner, then fence its exact registration before reporting readback. */
  private async run(id:string,action:(ports:PublicCanvasRegistration)=>Promise<'completed'|'accepted'>):Promise<PublicActionReceipt> {
    const slot=this.slot(id),status=await action(slot.ports);
    if(this.slots.get(id)!==slot||!slot.ports.current()||this.closed)
      throw new PublicApiError('API_UNAVAILABLE','The target canvas retired during the action.');
    return {status,canvasId:id,revision:slot.ports.summary().revision};
  }

  /** Navigation has no file/graph authority here; the captured App retains its native preflight. */
  navigate(id:string,path:string):Promise<PublicActionReceipt> {return this.run(id,ports=>ports.navigate(path));}
  /** View selection delegates to the captured session's existing asynchronous selection guard. */
  selectView(id:string,viewId:string):Promise<PublicActionReceipt> {return this.run(id,ports=>ports.selectView(viewId));}
  /** Preset choice delegates to a fresh captured contribution command, never a settings rewrite. */
  selectPreset(id:string,presetId:string):Promise<PublicActionReceipt> {return this.run(id,ports=>ports.selectPreset(presetId));}

  /** Supply the single public consumer with narrow callbacks, without exporting this registry's lifecycle. */
  port():PublicCanvasPort {return {list:()=>this.list(),snapshot:id=>this.snapshot(id),navigate:(id,path)=>this.navigate(id,path),
    selectView:(id,view)=>this.selectView(id,view),selectPreset:(id,preset)=>this.selectPreset(id,preset)};}

  /** Release every host closure before index teardown; retained old API handles cannot retain native views. */
  dispose():void {this.closed=true;this.slots.clear();this.identities=new WeakMap();}
}
