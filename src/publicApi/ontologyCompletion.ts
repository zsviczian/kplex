/** Host composition of settings-only completion, sharing the native editor's portable owners.
 * Public request validation belongs to PublicApi; this port bounds configured vocabulary and
 * returns inert DTOs without an editor, plugin, graph, file, storage or network capability. */
import type {KplexSettings} from '../settings';
import {PublicApiError,PUBLIC_API_LIMITS,type PublicOntologyCompletion} from '../application/publicApiContracts';
import {ONTOLOGY_GROUPS,ontologyConfiguration} from '../core/contracts/ontologyConfiguration';
import {matchOntologyTrigger,ontologyCompletionCandidates} from '../core/contracts/ontologyCompletion';
import {ontologyCompletionConfiguration} from '../editor/ontologyCompletionConfiguration';

/** Complete only the current logical line, preserving absolute UTF-16 replacement offsets.
 * Input after the caret remains untouched. Prefixes belong to the caller; native Markdown and
 * HTML consumers retain separate insertion policies over this same trigger/candidate result. */
export function completeConfiguredOntology(settings:KplexSettings,text:string,cursor:number,limit:number):PublicOntologyCompletion {
  const triggers=ontologyCompletionConfiguration(settings);
  if(!triggers.enabled)return {state:'disabled',context:null,items:[],truncated:false};
  if([triggers.midSentenceTrigger,...Object.values(triggers.triggers)].some(/** A configured literal cannot evade the public request budget. */ trigger=>trigger.length>PUBLIC_API_LIMITS.ontologyCompletionInput))
    throw new PublicApiError('LIMIT_EXCEEDED','Configured completion trigger exceeds the input budget');
  let lineStart=cursor;
  while(lineStart>0&&!/[\n\r\u2028\u2029]/.test(text[lineStart-1]))lineStart--;
  const match=matchOntologyTrigger(text.slice(lineStart,cursor),cursor-lineStart,triggers);
  if(!match)return {state:'no-match',context:null,items:[],truncated:false};
  if(ONTOLOGY_GROUPS.reduce(/** Reject a large raw vocabulary before decoding reciprocal fields. */ (count,group)=>count+(settings.hierarchy[group]?.length??0),0)>PUBLIC_API_LIMITS.scan)
    throw new PublicApiError('LIMIT_EXCEEDED','Configured ontology exceeds the vocabulary read budget');
  const configuration=ontologyConfiguration(settings);
  if(ONTOLOGY_GROUPS.reduce(/** Decoding can add reciprocal physical fields; bound those too. */ (count,group)=>count+configuration.hierarchy[group].length,0)>PUBLIC_API_LIMITS.scan)
    throw new PublicApiError('LIMIT_EXCEEDED','Configured ontology exceeds the physical vocabulary read budget');
  const items=ontologyCompletionCandidates(configuration,settings.ontologyDescriptions,settings.primaryTagField,match.role,match.query);
  return {state:'matched',context:{range:{start:lineStart+match.start,end:cursor},query:match.query,role:match.role,trigger:match.trigger,prefix:match.prefix},items:items.slice(0,limit),truncated:items.length>limit};
}
