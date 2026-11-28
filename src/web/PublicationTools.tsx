/** Shared Find and labelled address controls for the standalone Compass reader. */
import {useEffect, useId, useMemo, useRef, useState, type SyntheticEvent} from "react";
import type {NodeId} from "../core/graph/model";
import {publicationSearchPath} from "../core/plex/publication";
import {compassControls} from "../lang/webPublication";
import {FormField} from "../ui/components/FormField";
import {SearchBox} from "../ui/features/SearchBox";
import type {Publication} from "./publication";
import type {PublicationResources} from "./resources";
import {publicationSearch, readFullText} from "./search";

/** Find titles and aliases immediately, and load approved note text only when explicitly requested. */
export function PublicationTools({publication, resources, onChoose}: {publication: Publication; resources: PublicationResources; onChoose: (id: NodeId) => void}) {
  const controls = useRef<HTMLDivElement>(null);
  const id = useId();
  const [address, setAddress] = useState("");
  const [candidates, setCandidates] = useState<readonly NodeId[]>([]);
  const [addressMissing, setAddressMissing] = useState(false);
  const [full, setFull] = useState(false);
  const [index, setIndex] = useState<ReturnType<typeof readFullText> | null>(null);
  const [searchError, setSearchError] = useState(false);
  const search = useMemo(() => publicationSearch(publication, full ? index : null), [publication, full, index]);

  useEffect(() => {
    const owner = controls.current?.ownerDocument.defaultView;
    if (!full || !owner || index) return;
    const controller = new owner.AbortController();
    const signal = controller.signal;
    setSearchError(false);
    resources.text(publicationSearchPath, signal).then(value => {
      if (!signal.aborted) setIndex(readFullText(JSON.parse(value), publication));
    }).catch(() => {if (!signal.aborted) setSearchError(true);});
    return () => controller.abort();
  }, [full, publication, resources, index]);

  /** Keep identical names actionable as separate choices instead of guessing which note is intended. */
  function jump(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = search.address(address);
    if (next.length !== 1) {setCandidates(next); setAddressMissing(!next.length); return;}
    setCandidates([]);
    setAddressMissing(false);
    onChoose(next[0]);
  }

  return <div className="kplex-publication-tools" ref={controls}>
    <SearchBox graph={search.graph} revision={index && full ? 1 : 0} onActivate={onChoose} portalSelector=".kplex-publication"
      appTopbarSelector=".kplex-publication-header" placeholder={compassControls.find} ariaLabel={compassControls.find} />
    {publication.manifest?.fullText && <div className="kplex-publication-search-options">
      <button type="button" aria-pressed={full} onClick={() => setFull(value => !value)}>{compassControls.fullText}</button>
      {searchError && full ? <span role="status">{compassControls.searchUnavailable}</span>
        : full && !index ? <span role="status">{compassControls.searchLoading}</span> : null}
    </div>}
    <form className="kplex-publication-address" onSubmit={jump}>
      <FormField label={compassControls.address} layout="inline" controlId={id} actions={<button type="submit">{compassControls.open}</button>}>
        <input id={id} type="text" autoComplete="off" maxLength={512} value={address} onChange={event => {
          setAddress(event.currentTarget.value);
          setCandidates([]);
          setAddressMissing(false);
        }} />
      </FormField>
      {addressMissing && <span role="status">{compassControls.nodeUnavailable}</span>}
      {candidates.length > 1 && <div className="kplex-publication-address-matches">
        <p>{compassControls.chooseNote}</p>
        <ul>{candidates.slice(0, 24).map(candidate => <li key={candidate}>
          <button type="button" onClick={() => {setCandidates([]); onChoose(candidate);}}>{publication.nodes.get(candidate)?.name} · {candidate}</button>
        </li>)}</ul>
        {candidates.length > 24 && <p>{compassControls.chooseAddress}</p>}
      </div>}
    </form>
  </div>;
}
