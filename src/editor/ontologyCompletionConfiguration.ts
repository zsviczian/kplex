/** Host-side projection of live suggester preferences into the shared portable matcher.
 * Reads only finite trigger values; it never retains settings, an editor or graph capabilities. */
import type {KplexSettings} from '../settings';
import type {OntologyTriggerConfiguration} from '../core/contracts/ontologyCompletion';

/** Read live values on each request so saved/custom/empty triggers retain native precedence. */
export function ontologyCompletionConfiguration(settings:KplexSettings):OntologyTriggerConfiguration {
  return {enabled:settings.allowOntologySuggester,midSentenceTrigger:settings.ontologySuggesterMidSentenceTrigger,triggers:{
    all:settings.ontologySuggesterTrigger,parent:settings.ontologySuggesterParentTrigger,child:settings.ontologySuggesterChildTrigger,
    leftFriend:settings.ontologySuggesterLeftFriendTrigger,rightFriend:settings.ontologySuggesterRightFriendTrigger,
    previous:settings.ontologySuggesterPreviousTrigger,next:settings.ontologySuggesterNextTrigger,
  }};
}
