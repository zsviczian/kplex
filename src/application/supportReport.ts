/**
 * Canonical public diagnostics: one safe projection serves raw copying and the Markdown support
 * modal. Supplied passive snapshots only; serialization admits no host, storage or indexing work.
 */
import {SUPPORT_PLUGIN_LIMIT} from "./supportCustomizationProjection";
import {projectIndexingActivity, INDEXING_ACTIVITY_COLUMNS} from "./IndexingActivity";
import {diagnosticBuildIdentity, diagnosticManifestVersion} from "./diagnosticBuildIdentity";
import {projectIndexingHistory, exceptionalIndexingSession} from "./IndexingHistory";
import {SESSION_EVENT_CODES, SESSION_EVENT_CATEGORIES, SESSION_EVENT_OUTCOMES, SESSION_EVENT_LIMIT,
  SUPPORT_PHASES, supportCode, supportCount, supportDuration, supportField} from "./SessionEventRecorder";
import {projectSupportEnvironment, projectSupportIndex, projectSupportPreferences, projectSupportStartup,
  supportIsoTime, supportRows, supportRowCount} from "./supportReportProjection";

export const SUPPORT_REPORT_BYTE_LIMIT=48*1024;
export const SUPPORT_REPORT_FORMAT_VERSION=2;
export type SupportReportInput=Readonly<{
  capturedAt:unknown;indexReport:unknown;environment:unknown;indexingPreferences:unknown;startup:unknown;session:unknown;
  identity?:unknown;indexingHistory?:unknown;
}>;

/** Re-project finite event codes and numbers, refusing private payloads and disabled recorder contents. */
function supportEvents(input:unknown){
  const events:Array<{code:string;atMs:number;phase?:string;outcome?:string;category?:string;durationMs?:number;count?:number}>=[];
  for(const row of supportRows(supportField(input,"events"),SESSION_EVENT_LIMIT)){
    const code=supportCode(supportField(row,"code"),SESSION_EVENT_CODES),atMs=supportCount(supportField(row,"atMs"));
    if(code==="unavailable"||atMs===null)continue;
    const event:typeof events[number]={code,atMs};
    const phase=supportCode(supportField(row,"phase"),SUPPORT_PHASES),outcome=supportCode(supportField(row,"outcome"),SESSION_EVENT_OUTCOMES);
    const category=supportCode(supportField(row,"category"),SESSION_EVENT_CATEGORIES),durationMs=supportDuration(supportField(row,"durationMs")),count=supportCount(supportField(row,"count"));
    if(phase!=="unavailable")event.phase=phase;if(outcome!=="unavailable")event.outcome=outcome;if(category!=="unavailable")event.category=category;
    if(durationMs!==null)event.durationMs=durationMs;if(count!==null)event.count=count;events.push(event);
  }
  const eventsCaptureStatus=supportCode(supportField(input,"eventsCaptureStatus"),["active","disabled","disposed"]);
  if(eventsCaptureStatus!=="active")events.length=0;
  return {events,eventsCaptureStatus,droppedEvents:supportCount(supportField(input,"droppedEvents")),
    oldestEventsOmitted:eventsCaptureStatus==="active"?Math.max(0,supportRowCount(supportField(input,"events"))-SESSION_EVENT_LIMIT):0,
    retainedBytes:supportCount(supportField(input,"retainedBytes"))};
}

/** Escape Unicode after projection so string length is the exact public UTF-8 byte count. */
function ascii(text:string):string{return text.replace(/[\u007f-\uffff]/g,character=>`\\u${character.charCodeAt(0).toString(16).padStart(4,"0")}`);}

/** Pretty current state with compact numeric activity/history; only branded activity is admitted. */
export function formatDiagnosticsJson(report:object,indexingActivity?:unknown,history?:object):string{
  const activity=projectIndexingActivity(indexingActivity);
  const current=activity?{...activity,settings:{mode:activity.settings.mode,urls:activity.settings.urls,pacing:activity.settings.pacing}}:null;
  const base=JSON.stringify(report,null,2);
  return ascii(`${base==="{}"?"{\n":base.slice(0,-2)+",\n"}  "indexingActivity": ${JSON.stringify(current)},\n  "indexingHistory": ${JSON.stringify(history??{schemaVersion:1,status:"unavailable",previousSessions:[]})}\n}`);
}

/** Wrap the exact canonical JSON without recapturing, parsing or sanitizing it again. */
export function wrapDiagnosticJson(json:string):string{return `## K-Plex support report\n\n\`\`\`json\n${json}\n\`\`\`\n`;}

/** Remove the fewest ordered rows using bounded binary search for large plugin lists. */
function trimRows<T>(rows:T[],oldest:boolean,update:(rows:T[],omitted:number)=>void,render:()=>string,limit:number):string{
  let low=0,high=rows.length;
  while(low<high){const middle=Math.floor((low+high)/2);update(oldest?rows.slice(middle):rows.slice(0,rows.length-middle),middle);if(render().length<=limit)high=middle;else low=middle+1;}
  update(oldest?rows.slice(low):rows.slice(0,rows.length-low),low);return render();
}

/** Shared allowlist projection; export trimming never modifies persistent history or live recorders. */
export function createDiagnosticJson(input:SupportReportInput,indexingActivity?:unknown):string{
  const activity=projectIndexingActivity(indexingActivity),captured=supportEvents(supportField(input,"session"));
  const indexProjection=projectSupportIndex(supportField(input,"indexReport"));
  const {pluginVersion:environmentVersion,...environment}=projectSupportEnvironment(supportField(input,"environment"));
  const identity=supportField(input,"identity");
  const manifestVersion=diagnosticManifestVersion(supportField(identity,"manifestVersion")??environmentVersion)??"unavailable";
  const buildId=diagnosticBuildIdentity(supportField(identity,"buildId")??activity?.settings.build);
  /** Strip legacy duplicate identity/environment fields after the one safe projection. */
  const state=()=>{
    if(!("plugin" in indexProjection))return indexProjection;
    const {formatVersion:_format,generatedAt:_at,plugin:_plugin,platform:_platform,device:_device,saved,recovery,persistence,...index}=indexProjection;
    const {snapshot,...sourceRecovery}=recovery??{snapshot:null};
    return {...index,cache:{...saved,persistence,writer:snapshot},recovery:sourceRecovery};
  };
  const trustedHistory=projectIndexingHistory(supportField(input,"indexingHistory"));
  const history={schemaVersion:1,statisticsVersion:1,status:trustedHistory?.status??"unavailable",
    ...(activity?{}:{columns:INDEXING_ACTIVITY_COLUMNS}),previousSessions:[...(trustedHistory?.previousSessions??[])],
    limits:trustedHistory?.limits,storage:trustedHistory?.storage};
  const report={formatVersion:SUPPORT_REPORT_FORMAT_VERSION,generatedAt:supportIsoTime(supportField(input,"capturedAt")),
    plugin:{id:"k-plex",manifestVersion,buildId},index:state(),environment,
    indexingPreferences:projectSupportPreferences(supportField(input,"indexingPreferences")),startup:projectSupportStartup(supportField(input,"startup")),
    session:{eventsCaptureStatus:captured.eventsCaptureStatus,rawConsoleCaptureStatus:"unsupported",events:captured.events,
      summary:{droppedEvents:captured.droppedEvents,retainedBytes:captured.retainedBytes}},
    truncation:{oldestEventsOmitted:captured.oldestEventsOmitted,oldestStartupPhasesOmitted:0,oldestStartupOverlapsOmitted:0,oldestIndexDecisionsOmitted:0,
      activePluginsOmitted:environment.activePluginsOmitted??0,historicalSessionsOmitted:0},
    limits:{outputBytes:SUPPORT_REPORT_BYTE_LIMIT,sessionEvents:SESSION_EVENT_LIMIT,activePlugins:SUPPORT_PLUGIN_LIMIT}};
  report.truncation.oldestStartupPhasesOmitted=report.startup.phasesOmitted;
  report.truncation.oldestStartupOverlapsOmitted=report.startup.overlapsOmitted;
  report.truncation.oldestIndexDecisionsOmitted="decisionsOmitted" in report.index?report.index.decisionsOmitted??0:0;
  const limit=SUPPORT_REPORT_BYTE_LIMIT-wrapDiagnosticJson("").length;
  const render=():string=>formatDiagnosticsJson(report,activity,history);
  let json=render();
  while(json.length>limit&&history.previousSessions.length){
    let selected=history.previousSessions.length-1;
    for(let index=history.previousSessions.length-1;index>=0;index--)if(!exceptionalIndexingSession(history.previousSessions[index])){selected=index;break;}
    history.previousSessions.splice(selected,1);report.truncation.historicalSessionsOmitted++;json=render();
  }
  if(json.length>limit&&report.session.events.length){
    const previous=report.truncation.oldestEventsOmitted;
    json=trimRows(report.session.events,true,(rows,omitted)=>{report.session.events=rows;report.truncation.oldestEventsOmitted=previous+omitted;},render,limit);
  }
  if(json.length>limit&&report.environment.activePlugins.length){
    const previous=report.truncation.activePluginsOmitted;
    json=trimRows(report.environment.activePlugins,false,(rows,omitted)=>{report.environment.activePlugins=rows;report.truncation.activePluginsOmitted=previous+omitted;report.environment.activePluginsOmitted=report.truncation.activePluginsOmitted;},render,limit);
  }
  while(json.length>limit){
    if(report.startup.phases.length){report.startup.phases.shift();report.truncation.oldestStartupPhasesOmitted++;}
    else if(report.startup.overlaps.length){report.startup.overlaps.shift();report.truncation.oldestStartupOverlapsOmitted++;}
    else if("decisions" in report.index&&report.index.decisions?.length){report.index.decisions.shift();report.truncation.oldestIndexDecisionsOmitted++;}
    else return formatDiagnosticsJson({formatVersion:SUPPORT_REPORT_FORMAT_VERSION,generatedAt:report.generatedAt,plugin:report.plugin,reportStatus:"size-limit"},activity);
    json=render();
  }
  return json;
}

/** Report Bug preserves the existing Markdown presentation around exactly the shared JSON. */
export function createSupportReport(input:SupportReportInput,indexingActivity?:unknown):string{return wrapDiagnosticJson(createDiagnosticJson(input,indexingActivity));}
