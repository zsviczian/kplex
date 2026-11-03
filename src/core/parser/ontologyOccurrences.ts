/** On-demand body-key projection over the canonical cooperative Markdown grammar. It owns no
 * second matcher, YAML parser or source reader; ordinary indexed metadata retains legacy spans.
 * Only selected key DTOs are retained, and a full result page stops parsing at the next match. */
import {parseBodyMetadataCooperativeCore, type CooperativeMetadataParseRuntime} from "./metadata";
import type {OntologyPhysicalOccurrence} from "../contracts/ontologyOccurrences";

/** Internal bounded early exit, distinct from cancellation or a genuine canonical parser failure. */
class OccurrencePageFull extends Error {}

/** Inspect all selected normalized field identities together, preserving repeated declarations.
 * @param content Exact original saved string, already bounded by the inspection owner.
 * @param fields Established normalized identities, not partner labels or description aliases.
 * @returns Finite original-string key coordinates and an explicit omitted-tail marker.
 */
export async function inspectBodyFieldKeys(content:string, fields:ReadonlySet<string>, limit:number,
  runtime:CooperativeMetadataParseRuntime):Promise<{occurrences:OntologyPhysicalOccurrence[];truncated:boolean;masked:boolean}> {
  const occurrences:OntologyPhysicalOccurrence[]=[];
  let truncated=false, masked=false;
  try {
    await parseBodyMetadataCooperativeCore(content,{...runtime,retainMetadata:false,
      /** Observe canonical matches only; never search the source again for a requested field. */
      onFieldKey:occurrence=>{
        if(!fields.has(occurrence.normalizedName))return;
        if(occurrences.length>=limit){truncated=true;throw new OccurrencePageFull();}
        if(!occurrence.keyRange)masked=true;
        occurrences.push({...occurrence,yamlKey:null});
      },
    });
  }catch(error){if(!(error instanceof OccurrencePageFull))throw error;}
  return {occurrences,truncated,masked};
}
