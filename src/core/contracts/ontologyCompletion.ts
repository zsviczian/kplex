/** Settings-only ontology completion policy shared by the native editor and public API.
 * Literal matching, role ordering and inverse-aware filtering own no editor, graph or host work.
 * Callers retain insertion, lifecycle and public request/output limits. */
import {normalizeFieldName} from './fieldName';
import type {OntologyConfiguration,OntologyRole} from './ontologyConfiguration';
import {ontologyReadModel,type OntologyDescriptions,type OntologyReadField} from './ontologyReadModel';

export const ONTOLOGY_COMPLETION_ROLES=['all','parent','child','leftFriend','rightFriend','previous','next'] as const;
export type OntologyCompletionRole=typeof ONTOLOGY_COMPLETION_ROLES[number];
export type OntologyTriggerConfiguration=Readonly<{enabled:boolean;triggers:Readonly<Record<OntologyCompletionRole,string>>;midSentenceTrigger:string}>;
export type OntologyTriggerMatch=Readonly<{start:number;end:number;query:string;role:OntologyCompletionRole;trigger:string;prefix:string}>;
export type OntologyCompletionCandidate=Readonly<{name:string;role:OntologyRole|'unassigned';roles:readonly OntologyRole[];partner?:string;partnerRole?:OntologyRole;description?:string}>;
type SelectionView=Readonly<{key:string;partner?:string}>;

/** Match the historical optional greedy whitespace prefix and terminal query without regex
 * backtracking. KMP visits each literal/input character a bounded number of times. Position zero
 * wins the historical ^ alternative; otherwise preserve the earliest regex start and its
 * rightmost whitespace-prefixed trigger. Line terminators end the old dot prefix. */
function triggerQueryStart(text:string,trigger:string,queryBoundary:number):number|null {
  if(!trigger.length)return queryBoundary;
  if(trigger.length>text.length)return null;
  const fallback=new Uint32Array(trigger.length);
  for(let i=1,matched=0;i<trigger.length;i++){
    while(matched>0&&trigger[i]!==trigger[matched])matched=fallback[matched-1];
    if(trigger[i]===trigger[matched])matched++;
    fallback[i]=matched;
  }
  let matched=0,bestRank=Infinity,bestEnd:number|null=null;
  let prefixCursor=0,prefixRegionStart=0;
  for(let i=Math.max(0,queryBoundary-trigger.length);i<text.length;i++){
    while(matched>0&&text[i]!==trigger[matched])matched=fallback[matched-1];
    if(text[i]===trigger[matched])matched++;
    if(matched!==trigger.length)continue;
    const start=i+1-trigger.length;
    if(start===0)return i+1;
    while(prefixCursor<start-1){
      if(/[\n\r\u2028\u2029]/.test(text[prefixCursor]))prefixRegionStart=prefixCursor+1;
      prefixCursor++;
    }
    const rank=/\s/.test(text[start-1])?prefixRegionStart:start;
    if(rank<=bestRank){bestRank=rank;bestEnd=i+1;}
    matched=fallback[matched-1];
  }
  return bestEnd;
}

/** Match before an explicit UTF-16 cursor in one editor-provided line. Generic and role trigger
 * precedence, empty triggers and the mid-sentence prefix retain native historical behavior.
 * The replacement excludes the optional prefix, which remains owned by the editor. */
export function matchOntologyTrigger(text:string,cursor:number,configuration:OntologyTriggerConfiguration):OntologyTriggerMatch|null {
  if(!configuration.enabled)return null;
  const beforeCursor=text.substring(0,cursor);
  let queryBoundary=beforeCursor.length;
  while(queryBoundary>0&&!/[\s:]/.test(beforeCursor[queryBoundary-1]))queryBoundary--;
  for(const role of ONTOLOGY_COMPLETION_ROLES){
    const trigger=configuration.triggers[role];
    for(const prefix of ['',configuration.midSentenceTrigger]){
      const queryStart=triggerQueryStart(beforeCursor,prefix+trigger,queryBoundary);
      if(queryStart===null)continue;
      return {start:Math.max(0,queryStart-trigger.length),end:cursor,query:beforeCursor.slice(queryStart),role,trigger,prefix};
    }
  }
  return null;
}

/** One selectable option per normalized physical identity, retaining the caller's order/spelling. */
export function ontologySelectionFields(fields:readonly string[]):string[] {
  const seen=new Set<string>();
  return fields.filter(/** Legacy multi-role assignments must not duplicate a physical option. */ field=>{
    const key=normalizeFieldName(field);if(!key||seen.has(key))return false;seen.add(key);return true;
  });
}

/** Physical-name substring matches precede inverse-partner matches; roles remain caller-owned. */
export function ontologySelectionMatches(fields:readonly string[],views:readonly SelectionView[],query:string):string[] {
  const byKey=new Map(views.map(/** Reuse annotations without another ontology registry. */ field=>[field.key,field]));
  const needle=query.toLocaleLowerCase(),direct:string[]=[],indirect:string[]=[];
  for(const name of ontologySelectionFields(fields)){
    if(name.toLocaleLowerCase().includes(needle))direct.push(name);
    else if(byKey.get(normalizeFieldName(name))?.partner?.toLocaleLowerCase().includes(needle))indirect.push(name);
  }
  return [...direct,...indirect];
}

/** Select role-eligible physical fields and existing annotations without discovery/index reads.
 * The generic picker preserves its established alphabetical order; role pickers preserve their
 * configured order. An inverse query may find a field but never changes its insertion spelling. */
export function ontologyCompletionCandidates(configuration:OntologyConfiguration,descriptions:OntologyDescriptions,primaryTagField:string,role:OntologyCompletionRole,query:string):OntologyCompletionCandidate[] {
  const h=configuration.hierarchy;
  let names:readonly string[];
  switch(role){
    case 'parent':names=h.parents;break;
    case 'child':names=h.children;break;
    case 'leftFriend':names=h.leftFriends;break;
    case 'rightFriend':names=h.rightFriends;break;
    case 'previous':names=h.previous;break;
    case 'next':names=h.next;break;
    case 'all':names=[...h.hidden,...h.parents,...h.children,...h.leftFriends,...h.rightFriends,...h.previous,...h.next,primaryTagField]
      .sort(/** Alphabetical selection never reorders persisted configuration. */ (a,b)=>a.localeCompare(b,undefined,{sensitivity:'base'}));break;
  }
  const views=ontologyReadModel(configuration,descriptions),byKey=new Map<string,OntologyReadField>(views.map(/** Index this already decoded vocabulary only. */ field=>[field.key,field]));
  return ontologySelectionMatches(names,views,query).map(/** Annotation and physical insertion names stay separate. */ name=>{
    const view=byKey.get(normalizeFieldName(name));
    return {name,role:view?.role??'unassigned',roles:view?.roles??[],partner:view?.partner,partnerRole:view?.partnerRole,description:view?.description};
  });
}
