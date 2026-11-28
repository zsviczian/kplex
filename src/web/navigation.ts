/** Keep location/history ownership inside one reader. Only the standalone reader receives a window. */
import {useEffect, useRef, useState} from "react";
import type {NodeId} from "../core/graph/model";
import type {Publication} from "./publication";

export type PublicationLocation = Readonly<{id: NodeId; fragment?: string}>;
type NavigationState = Readonly<{
  entries: readonly PublicationLocation[];
  index: number;
  missing: boolean;
  browser?: BrowserPosition;
}>;
type BrowserPosition = Readonly<{position: number; last: number}>;

/** Decode bounded printable fragments without throwing for malformed addresses. */
function decodeFragment(value: string): string | undefined {
  try {
    const fragment = decodeURIComponent(value.replace(/^#/, ""));
    return fragment.length <= 200 && !/\p{Cc}/u.test(fragment) ? fragment || undefined : undefined;
  } catch {
    return undefined;
  }
}

/** Read the public URL with a non-disclosing fallback for a missing ID. */
function locationFrom(publication: Publication, url: URL): {location: PublicationLocation; missing: boolean} {
  const raw = url.searchParams.get("node");
  const node = raw && publication.nodes.get(raw.toLowerCase());
  return {location: {id: node ? node.id : publication.entry, fragment: node || !raw ? decodeFragment(url.hash) : undefined},
    missing: Boolean(raw && !node)};
}

/** Admit a document or diagram link only when it refers to this publication and a known public thought. */
export function documentDestination(raw: string, site: URL, publication: Publication, currentId: NodeId): PublicationLocation | undefined {
  try {
    const url = new URL(raw, site);
    if (url.origin !== site.origin || url.pathname !== site.pathname && url.pathname !== `${site.pathname}index.html`) return undefined;
    if (raw.startsWith("#")) return {id: currentId, fragment: decodeFragment(url.hash)};
    const value = url.searchParams.get("node");
    if (!value) return undefined;
    const {location, missing} = locationFrom(publication, url);
    return missing ? undefined : location;
  } catch {
    return undefined;
  }
}

/** Use the current standalone page path even when it is hosted under a non-root directory. */
function navigateURL(owner: Window, location: PublicationLocation): URL {
  const url = new URL(owner.location.href);
  url.searchParams.set("node", location.id);
  url.hash = location.fragment ? encodeURIComponent(location.fragment) : "";
  return url;
}

/** Distinguish this publication's cloned history markers from host or previous document state. */
function readBrowserPosition(entry: unknown, publicationId: string): BrowserPosition | null {
  if (!entry || typeof entry !== "object" || !("kplexPublication" in entry) || entry.kplexPublication !== publicationId
    || !("position" in entry) || typeof entry.position !== "number" || !Number.isSafeInteger(entry.position) || entry.position < 0
    || !("last" in entry) || typeof entry.last !== "number" || !Number.isSafeInteger(entry.last) || entry.last < entry.position) return null;
  return {position: entry.position, last: entry.last};
}

/** Treat reload/native history as browser navigation and embedded mounts as purely local navigation. */
export function usePublicationNavigation(publication: Publication, owner?: Window) {
  const publicationId = publication.manifest?.id;
  const [state, setState] = useState<NavigationState>(() => {
    const initial = owner ? locationFrom(publication, new URL(owner.location.href)) : {location: {id: publication.entry}, missing: false};
    const browser = owner && publicationId ? readBrowserPosition(owner.history.state, publicationId) ?? {position: 0, last: 0} : undefined;
    return {entries: [initial.location], index: 0, missing: initial.missing, browser};
  });
  const attention = state.entries[state.index];
  const browserEnd = useRef(state.browser?.last ?? 0);
  useEffect(() => {
    if (!owner || !publicationId) return;
    const history = owner.history;
    const onPopState = (event: PopStateEvent) => {
      const {location, missing} = locationFrom(publication, new URL(owner.location.href));
      const marker = readBrowserPosition(event.state, publicationId);
      // A push after going back replaces newer entries, including stale bounds on older markers.
      const browser = marker ? {...marker, last: Math.max(marker.position, browserEnd.current)} : {position: 0, last: 0};
      browserEnd.current = browser.last;
      history.replaceState({kplexPublication: publicationId, ...browser}, "");
      setState({entries: [location], index: 0, missing, browser});
    };
    const initial = readBrowserPosition(history.state, publicationId) ?? {position: 0, last: 0};
    history.replaceState({kplexPublication: publicationId, ...initial}, "");
    owner.addEventListener("popstate", onPopState);
    return () => owner.removeEventListener("popstate", onPopState);
  }, [owner, publication, publicationId]);

  /** Route canvas, addresses, search and safe document links through one history operation. */
  function activate(location: PublicationLocation): boolean {
    if (!publication.nodes.has(location.id) || !state.missing && attention.id === location.id && attention.fragment === location.fragment) return false;
    if (owner && publicationId && state.browser) {
      const position = state.browser.position + 1, browser = {position, last: position};
      owner.history.pushState({kplexPublication: publicationId, ...browser}, "", navigateURL(owner, location));
      browserEnd.current = position;
      setState({entries: [location], index: 0, missing: false, browser});
      return true;
    }
    const index = state.index + 1;
    setState({entries: [...state.entries.slice(0, index), location], index, missing: false});
    return true;
  }

  const canGoBack = state.browser ? state.browser.position > 0 : state.index > 0;
  const canGoForward = state.browser ? state.browser.position < state.browser.last : state.index + 1 < state.entries.length;

  /** Do not move the host document's history from an embedded Compass. */
  function move(delta: -1 | 1) {
    if (!(delta === -1 ? canGoBack : canGoForward)) return;
    if (owner && state.browser) owner.history.go(delta);
    else setState({...state, index: state.index + delta, missing: false});
  }

  return {attention, activate, move, missing: state.missing, canGoBack, canGoForward};
}
