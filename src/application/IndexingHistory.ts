/**
 * Bounded, settings-neutral statistical history over the existing activity recorder. Owns one
 * evolving session, one coalesced write and a five-minute safeguard; storage and clocks are injected.
 * No source, graph, Vault, environment enumeration or indexing scheduler capability crosses here.
 */
import {INDEXING_ACTIVITY_COLUMNS, projectIndexingActivity, type IndexingActivityCapture} from "./IndexingActivity";
import {diagnosticBuildIdentity, diagnosticManifestVersion} from "./diagnosticBuildIdentity";
import {supportField, supportDuration} from "./SessionEventRecorder";
import {projectSnapshotWriteDiagnostics} from "./indexRecoveryDiagnostics";

export const INDEXING_HISTORY_BYTE_LIMIT = 96 * 1024;
export const INDEXING_HISTORY_PREVIOUS_LIMIT = 16;
export const INDEXING_HISTORY_INTERVAL_MS = 5 * 60 * 1000;
type Row = readonly (number | null)[];
type Statistics = Pick<IndexingActivityCapture, "ageMs" | "totals" | "causes" | "milestones" | "phases" | "active" | "lastGlobal" | "current" | "clockRegressions" | "longObservationGaps" | "saturated" | "outcomeCoverage"> & {
  recent: readonly Row[]; settings: Readonly<{mode: string | null; urls: string | null; pacing: string | null}>;
};
type CacheSummary = Readonly<{pending: boolean | null; active: boolean | null; dueInMs: number | null;
  writer: ReturnType<typeof projectSnapshotWriteDiagnostics>}>;
export type IndexingHistoricalSession = Readonly<{
  manifestVersion: string; buildId: string | null; startedAt: string; lastCheckpointAt: string;
  termination: "normal-unload" | "interrupted-or-unknown"; statistics: Statistics | null; cache: CacheSummary | null;
}>;
/** Shared retention/export priority; a retired optional pass alone does not imply a failed session. */
export function exceptionalIndexingSession(session: IndexingHistoricalSession): boolean {
  const stats=session.statistics,writer=session.cache?.writer;
  return session.termination!=="normal-unload"||writer?.outcome==="failed"||writer?.outcome==="unavailable"
    ||Boolean(stats&&(stats.active.length||stats.totals[2]||stats.totals[4]||stats.current[5]
      ||stats.causes[INDEXING_ACTIVITY_COLUMNS.causes.indexOf("cache-failure")]));
}
type StoredSession = IndexingHistoricalSession & {order: number};
type Checkpoint = Readonly<{session: StoredSession; revision: number}>;
type StoredHistory = {formatVersion: 1; next: number; evicted: number; sessions: StoredSession[]};
export type IndexingHistoryCapture = Readonly<{
  schemaVersion: 1; statisticsVersion: 1; status: "loading" | "available" | "unavailable";
  previousSessions: readonly IndexingHistoricalSession[];
  limits: Readonly<{previousSessions: number; persistedBytes: number; checkpointIntervalMs: number}>;
  storage: Readonly<{evictedSessions: number; rejectedSessions: number; checkpoints: number; failures: number; bytes: number}>;
}>;
export type HistoryStorageResult<T> = Readonly<{available: true; value: T}> | Readonly<{available: false}>;
/** Atomic read/merge/write on one diagnostic key; failed commits never return a successful receipt. */
export interface IndexingHistoryStorage {
  update<T>(transform: (previous: unknown) => Readonly<{json: string; value: T}>): Promise<HistoryStorageResult<T>>;
}
export type HistoryRuntime = Readonly<{
  now(): number; wallTime(): number; schedule(callback: () => void, milliseconds: number): number; cancel(timer: number): void;
}>;
const admitted = new WeakSet<object>();
const MAX = 4294967295;
/** Read only internally created, frozen history projections; unknown serializers are never invoked. */
export function projectIndexingHistory(value: unknown): IndexingHistoryCapture | null {
  return value !== null && typeof value === "object" && admitted.has(value) ? value as IndexingHistoryCapture : null;
}
/** Wall clocks describe historical observations; elapsed work remains the recorder's monotonic age. */
function iso(value: number): string { return new Date(value).toISOString(); }
/** Validate actual UTC dates rather than accepting normalized invalid calendar strings. */
function validTime(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)
    && Number.isFinite(Date.parse(value)) && new Date(Date.parse(value)).toISOString() === value;
}
/** Accept only public numeric manifest versions, including an explicitly unavailable identity. */
function validVersion(value: unknown): value is string {
  return value === "unavailable" || diagnosticManifestVersion(value) !== null;
}
/** Finite nonnegative statistics never accept strings, coercion or arbitrary nested payloads. */
function numeric(value: unknown): value is number { return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= Number.MAX_SAFE_INTEGER; }
/** Rebuild a fixed-size numeric row; all unknown values reject the owning session. */
function row(value: unknown, length: number): Row | null {
  if (!Array.isArray(value) || value.length !== length) return null;
  const result: (number | null)[] = [];
  for (let index=0; index<length; index++) {const item=supportField(value,String(index));if(item!==null&&(!numeric(item)||!Number.isInteger(item)||item>MAX))return null;result.push(item);}
  return Object.freeze(result);
}
/** Validate a bounded matrix before copying, including the recorder's omitted phase-array form. */
function matrix(value: unknown, maximum: number, width: number, exact = false): readonly Row[] | null {
  if (!Array.isArray(value) || value.length>maximum || exact && value.length!==maximum && value.length!==0) return null;
  const result: Row[]=[];
  for(let index=0;index<value.length;index++){const item=row(supportField(value,String(index)),width);if(!item)return null;result.push(item);}
  return Object.freeze(result);
}
/** Re-project persisted statistics from a closed field vocabulary; no report/environment data is admitted. */
function statistics(value: unknown): Statistics | null {
  if(value===null)return null;
  const totals=row(supportField(value,"totals"),8),causes=row(supportField(value,"causes"),INDEXING_ACTIVITY_COLUMNS.causes.length);
  const milestones=row(supportField(value,"milestones"),INDEXING_ACTIVITY_COLUMNS.milestones.length),current=row(supportField(value,"current"),INDEXING_ACTIVITY_COLUMNS.current.length);
  const active=matrix(supportField(value,"active"),2,23),recent=matrix(supportField(value,"recent"),4,23);
  const phase=supportField(value,"phases"),phaseCurrent=matrix(supportField(phase,"current"),2,2,true);
  const counts=matrix(supportField(phase,"counts"),2,INDEXING_ACTIVITY_COLUMNS.phases.length,true);
  const elapsedMs=matrix(supportField(phase,"elapsedMs"),2,INDEXING_ACTIVITY_COLUMNS.phases.length,true);
  const maxMs=matrix(supportField(phase,"maxMs"),2,INDEXING_ACTIVITY_COLUMNS.phases.length,true);
  const last=supportField(value,"lastGlobal"),lastGlobal=last===null?null:row(last,23);
  const ageMs=supportField(value,"ageMs"),clockRegressions=supportField(value,"clockRegressions"),longObservationGaps=supportField(value,"longObservationGaps");
  const saturated=supportField(value,"saturated"),outcomeCoverage=supportField(value,"outcomeCoverage"),settings=supportField(value,"settings");
  const mode=supportField(settings,"mode"),urls=supportField(settings,"urls"),pacing=supportField(settings,"pacing");
  if(!totals||totals.some(item=>item===null)||!causes||!milestones||!current||!active||!recent||!phaseCurrent||!counts||!elapsedMs||!maxMs||last!==null&&!lastGlobal
    ||!numeric(ageMs)||!numeric(clockRegressions)||!numeric(longObservationGaps)||typeof saturated!=="boolean"
    ||outcomeCoverage!=="complete"&&outcomeCoverage!=="capacity-limited"
    ||mode!==null&&mode!=="eager"&&mode!=="on-demand"||urls!==null&&urls!=="background"&&urls!=="on-demand"
    ||pacing!==null&&pacing!=="responsive"&&pacing!=="balanced"&&pacing!=="faster")return null;
  const passRows=[...active,...recent,...(lastGlobal?[lastGlobal]:[])];
  if(passRows.some(item=>!ordinal(item[0],INDEXING_ACTIVITY_COLUMNS.kinds.length)||!ordinal(item[1],INDEXING_ACTIVITY_COLUMNS.scopes.length)
    ||item[4]!==null&&!ordinal(item[4],INDEXING_ACTIVITY_COLUMNS.outcomes.length)
    ||item[5]!==null&&!ordinal(item[5],INDEXING_ACTIVITY_COLUMNS.causes.length)
    ||!ordinal(item[6],INDEXING_ACTIVITY_COLUMNS.causes.length)||item[7]===null||item[7]>=2**INDEXING_ACTIVITY_COLUMNS.causes.length
    ||item[22]===null||item[22]>1))return null;
  if(phaseCurrent.some(item=>item[0]!==null&&!ordinal(item[0],INDEXING_ACTIVITY_COLUMNS.phases.length)))return null;
  return Object.freeze({ageMs,totals:totals as readonly number[],causes,milestones,current,active,recent,lastGlobal,
    clockRegressions,longObservationGaps,saturated,outcomeCoverage,settings:Object.freeze({mode,urls,pacing}),
    phases:Object.freeze({current:phaseCurrent,counts,elapsedMs,maxMs})});
}
/** Numeric categories are dictionary ordinals, never unbounded application identifiers. */
function ordinal(value:number|null,length:number):boolean{return value!==null&&Number.isInteger(value)&&value>=0&&value<length;}
/** Reuse the current report's fixed writer-code allowlist, excluding all arbitrary persisted fields. */
function cacheSummary(value: unknown): CacheSummary | null {
  if(!value||typeof value!=="object"||Array.isArray(value))return null;
  const boolean=(key:string):boolean|null=>{const field=supportField(value,key);return typeof field==="boolean"?field:null;};
  const writer=projectSnapshotWriteDiagnostics(supportField(value,"writer"));
  return Object.freeze({pending:boolean("pending"),active:boolean("active"),dueInMs:supportDuration(supportField(value,"dueInMs")),writer:Object.freeze(writer)});
}
/** Persist only compact current statistics; dictionaries/hours and full support reports never enter storage. */
export function summarizeIndexingActivity(value: unknown): Statistics | null {
  const activity=projectIndexingActivity(value);if(!activity)return null;
  const exceptional=activity.recent.filter(item=>item[4]!==0).slice(-2);
  const recent=activity.recent.filter(item=>!exceptional.includes(item)).slice(-(4-exceptional.length)).concat(exceptional)
    .sort((a,b)=>(a[2]??0)-(b[2]??0));
  const {build: _build,...settings}=activity.settings;
  return statistics({...activity,recent,settings});
}
/** Decode at most the storage budget and reject malformed sessions without retaining their fields. */
export function decodeIndexingHistory(value: unknown): {record: StoredHistory; rejected: number} {
  const empty: StoredHistory={formatVersion:1,next:0,evicted:0,sessions:[]};
  if(value===null||value===undefined)return {record:empty,rejected:0};
  if(typeof value!=="string"||value.length>INDEXING_HISTORY_BYTE_LIMIT)return {record:empty,rejected:1};
  // Stored history is ASCII by construction; refuse non-ASCII input before JSON allocation so
  // the character bound remains an exact byte bound even for corrupted/foreign metadata.
  for(let index=0;index<value.length;index++)if(value.charCodeAt(index)>127)return {record:empty,rejected:1};
  try{
    const parsed: unknown=JSON.parse(value),next=supportField(parsed,"next"),evicted=supportField(parsed,"evicted"),sessions=supportField(parsed,"sessions");
    if(supportField(parsed,"formatVersion")!==1||!Number.isSafeInteger(next)||!numeric(next)||next>=Number.MAX_SAFE_INTEGER||!Number.isSafeInteger(evicted)||!numeric(evicted)||evicted>MAX
      ||!Array.isArray(sessions)||sessions.length>INDEXING_HISTORY_PREVIOUS_LIMIT+1)return {record:empty,rejected:1};
    const result: StoredSession[]=[],orders=new Set<number>();let rejected=0;
    for(let index=0;index<sessions.length;index++){
      const source=supportField(sessions,String(index)),order=supportField(source,"order"),manifestVersion=supportField(source,"manifestVersion");
      const build=supportField(source,"buildId"),buildId=diagnosticBuildIdentity(build),startedAt=supportField(source,"startedAt"),lastCheckpointAt=supportField(source,"lastCheckpointAt");
      const termination=supportField(source,"termination"),rawStats=supportField(source,"statistics"),stats=statistics(rawStats);
      if(!numeric(order)||order===0||!Number.isSafeInteger(order)||order>next||orders.has(order)||!validVersion(manifestVersion)
        ||build!==null&&!buildId||!validTime(startedAt)||!validTime(lastCheckpointAt)
        ||termination!=="normal-unload"&&termination!=="interrupted-or-unknown"||rawStats!==null&&!stats){rejected++;continue;}
      orders.add(order);result.push({order,manifestVersion,buildId,startedAt,lastCheckpointAt,termination,statistics:stats,cache:cacheSummary(supportField(source,"cache"))});
    }
    return {record:{formatVersion:1,next,evicted,sessions:result},rejected};
  }catch{return {record:empty,rejected:1};}
}
/** Drop oldest previous sessions to both hard bounds, always retaining the current session. */
function fit(record: StoredHistory, current: number): string {
  record.sessions.sort((a,b)=>Date.parse(b.startedAt)-Date.parse(a.startedAt)||b.order-a.order);
  let json=JSON.stringify(record);
  while(record.sessions.length>INDEXING_HISTORY_PREVIOUS_LIMIT+1||json.length>INDEXING_HISTORY_BYTE_LIMIT){
    const protectedRows=new Set(record.sessions.filter(item=>item.order!==current&&exceptionalIndexingSession(item)).slice(0,2));
    let index=record.sessions.length-1;
    while(index>=0&&(record.sessions[index].order===current||protectedRows.has(record.sessions[index])))index--;
    if(index<0){index=record.sessions.length-1;while(index>=0&&record.sessions[index].order===current)index--;}
    if(index<0)throw Error("Diagnostic checkpoint exceeds its fixed budget");
    record.sessions.splice(index,1);record.evicted=Math.min(MAX,record.evicted+1);json=JSON.stringify(record);
  }
  return json;
}

/** Own only diagnostic liveness: activity boundaries mark dirty; one low-frequency timer handles stalls. */
export class IndexingHistory {
  private timer: number|null=null;
  private order: number|null=null;
  private pending: Promise<void>|null=null;
  private queued: Checkpoint|null=null;
  private dirty=true;
  private changeRevision=0;
  private closed=false;
  private started=false;
  private firstSettlement=false;
  private lastFailureCheckpoint=-Infinity;
  private lastWrite=-Infinity;
  private previous: readonly IndexingHistoricalSession[]=[];
  private status: IndexingHistoryCapture["status"]="loading";
  private counters={evictedSessions:0,rejectedSessions:0,checkpoints:0,failures:0,bytes:0};
  private readonly startedAt: string;
  private readonly manifestVersion: string;
  private readonly buildId: string|null;
  /** Capture public identities once; no installation identifier or random tracking value is generated. */
  constructor(private storage: IndexingHistoryStorage,private readonly runtime: HistoryRuntime,
    private capture: (()=>unknown)|null,manifestVersion: unknown,buildId: unknown,private captureCache: (()=>unknown)|null=null){
    this.startedAt=iso(runtime.wallTime());this.manifestVersion=validVersion(manifestVersion)?manifestVersion:"unavailable";
    this.buildId=diagnosticBuildIdentity(buildId);
  }
  /** Begin asynchronously; indexing and clipboard callers never await this owner. */
  start(): void {if(this.closed||this.started)return;this.started=true;this.request(true);this.arm();}
  /** O(1) coarse-boundary observation; never captures data or schedules a per-file write. */
  changed(): void {if(!this.closed){this.dirty=true;this.changeRevision++;}}
  /** Preserve a fast startup before another development reload. One early settled checkpoint is
   * allowed per lifetime; ongoing activity retains the five-minute write interval and timer. */
  settled(): void {
    if(this.closed||this.firstSettlement)return;
    this.firstSettlement=true;this.changed();
    void Promise.resolve().then(()=>{if(!this.closed)this.request(true);});
  }
  /** Retain a recent coarse failure before an immediate reload, at most once per five minutes. */
  failed(): void {
    if(this.closed)return;this.changed();
    const now=this.runtime.now();if(now-this.lastFailureCheckpoint<INDEXING_HISTORY_INTERVAL_MS)return;
    this.lastFailureCheckpoint=now;
    void Promise.resolve().then(()=>{if(!this.closed)this.request(true);});
  }
  /** Backgrounding may flush an already-due dirty checkpoint, never bypassing the minimum interval. */
  background(): void {if(!this.closed)this.request(false);}
  /** Export only already-loaded, immutable session summaries; copying performs no asynchronous work. */
  snapshot(): IndexingHistoryCapture {
    const result=Object.freeze({schemaVersion:1 as const,statisticsVersion:1 as const,status:this.status,previousSessions:this.previous,
      limits:Object.freeze({previousSessions:INDEXING_HISTORY_PREVIOUS_LIMIT,persistedBytes:INDEXING_HISTORY_BYTE_LIMIT,checkpointIntervalMs:INDEXING_HISTORY_INTERVAL_MS}),
      storage:Object.freeze({...this.counters})});admitted.add(result);return result;
  }
  /** Retire the safeguard and retain one best-effort final checkpoint before recorder disposal. */
  close(): void {
    if(this.closed)return;
    const final=this.checkpoint(true);this.closed=true;this.capture=null;this.captureCache=null;
    this.stopTimer();
    if(final)this.submit(final);
  }
  /** A single timer performs prolonged/stalled-work checkpoints without another indexing scheduler. */
  private arm(): void {
    if(this.closed||this.timer!==null)return;
    try{this.timer=this.runtime.schedule(()=>{this.timer=null;if(this.closed)return;this.request(false);if(!this.pending)this.arm();},INDEXING_HISTORY_INTERVAL_MS);}
    catch{this.status="unavailable";}
  }
  /** Cancel through the same owner; neither retirement nor rescheduling can break plugin cleanup. */
  private stopTimer(): void {
    const timer=this.timer;this.timer=null;
    if(timer!==null){try{this.runtime.cancel(timer);}catch{ /* Best-effort diagnostic lifetime only. */ }}
  }
  /** Read one trusted recorder snapshot; active stalled passes remain meaningful without transitions. */
  private checkpoint(normal: boolean): Checkpoint|null {
    let cache: CacheSummary|null=null;
    try{cache=cacheSummary(this.captureCache?.());}catch{ /* Retain activity when optional cache health is unavailable. */ }
    try{return {revision:this.changeRevision,session:{order:this.order??-1,manifestVersion:this.manifestVersion,buildId:this.buildId,startedAt:this.startedAt,
      lastCheckpointAt:iso(this.runtime.wallTime()),termination:normal?"normal-unload":"interrupted-or-unknown",
      statistics:summarizeIndexingActivity(this.capture?.()),cache}};}catch{return null;}
  }
  /** Admission is independent of storage completion and uses only the injected monotonic clock. */
  private request(force: boolean): void {
    if(this.closed||!force&&this.runtime.now()-this.lastWrite<INDEXING_HISTORY_INTERVAL_MS)return;
    const checkpoint=this.checkpoint(false);if(!checkpoint)return;
    const stats=checkpoint.session.statistics;
    const inProgress=stats&&(stats.active.length||stats.phases.current.some(item=>item[0]!==null)
      ||stats.current.slice(0,14).some(value=>value!==null&&value>0)
      ||stats.current[INDEXING_ACTIVITY_COLUMNS.current.indexOf("urlActive")]);
    if(!force&&!this.dirty&&!inProgress&&!checkpoint.session.cache?.active&&!checkpoint.session.cache?.pending)return;
    this.submit(checkpoint);
  }
  /** Serialize atomic merges and coalesce to one latest checkpoint; late old sessions cannot replace newer rows. */
  private submit(checkpoint: Checkpoint): void {
    if(this.pending){this.queued=checkpoint;return;}
    // A queued capture can predate a later boundary. Submitting it must not clear that newer
    // observation; its revision is private coordination data and never enters persisted JSON.
    this.dirty=checkpoint.revision!==this.changeRevision;
    const task=Promise.resolve().then(()=>this.storage.update(previous=>{
      const decoded=decodeIndexingHistory(previous),record=decoded.record;
      const existing=this.order===null?undefined:record.sessions.find(item=>item.order===this.order&&item.startedAt===this.startedAt);
      const order=existing?.order??record.next+1;
      const session={...checkpoint.session,order};record.next=Math.max(record.next,order);
      record.sessions=record.sessions.filter(item=>item.order!==order);record.sessions.push(session);
      const json=fit(record,order);
      return {json,value:{record,order,rejected:decoded.rejected,bytes:json.length}};
    })).then(result=>{
      if(!result.available){this.status="unavailable";this.dirty=true;this.counters.failures++;return;}
      this.order=result.value.order;this.status="available";this.lastWrite=this.runtime.now();
      this.previous=Object.freeze(result.value.record.sessions.filter(item=>item.order!==this.order)
        .map(({order: _order,...session})=>Object.freeze(session)));
      this.counters={...this.counters,evictedSessions:result.value.record.evicted,rejectedSessions:this.counters.rejectedSessions+result.value.rejected,
        checkpoints:this.counters.checkpoints+1,bytes:result.value.bytes};
    },()=>{this.status="unavailable";this.dirty=true;this.counters.failures++;}).finally(()=>{
      if(this.pending===task)this.pending=null;
      const queued=this.queued;this.queued=null;
      if(queued)this.submit(queued);
      else if(this.closed)this.previous=[];
      else {this.stopTimer();this.arm();}
    });
    this.pending=task;
  }
}
