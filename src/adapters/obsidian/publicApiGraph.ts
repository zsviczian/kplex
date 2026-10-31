/** Adapt the existing live GraphIndex's bounded passive readers to the application API port.
 * This module owns no index, cache, source acquisition, subscriptions or lifecycle resources. */
import type {GraphIndex} from '../../index/GraphIndex';
import type {PublicGraphPort} from '../../application/publicApiContracts';

/** Retain only this index capability for the owning API lifetime; service disposal releases it. */
export function createPublicGraphRead(index:GraphIndex):PublicGraphPort {
  return{
    node:/** Exact lookup retains canonical identity and never prepares a missing scope. */id=>index.publicApiNode(id),
    search:/** Bounded ranking uses existing vocabulary rather than enumerating the graph. */(query,limit,cancelled)=>index.publicApiSearch(query,limit,cancelled),
    neighbors:/** Canonical roles are independent of canvas visibility/filter settings. */(id,role,limit,cancelled)=>index.publicApiNeighbors(id,role,limit,cancelled),
    evidence:/** Explicit pair requests expose only allowlisted provenance. */(source,target,limit,cancelled)=>index.publicApiEvidence(source,target,limit,cancelled),
    coverage:/** Current scalar certificates never initiate hydration or source work. */id=>index.publicApiCoverage(id),
  };
}
