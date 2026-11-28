/** A publication's detached note, media and anchor lifetime belongs to its own Sidecar. */
import {useEffect, useRef, useState, type MouseEvent} from "react";
import {publicationNotePath} from "../core/plex/publication";
import {compassControls} from "../lang/webPublication";
import {sanitizePublicationContent} from "../ui/features/publicationContent";
import {documentDestination, type PublicationLocation} from "./navigation";
import type {Publication} from "./publication";
import type {PublicationResources} from "./resources";

const svgNamespace = "http://www.w3.org/2000/svg";
const mimeByExtension: Readonly<Record<string, string>> = {
  png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", webp: "image/webp", avif: "image/avif", svg: "image/svg+xml",
  mp3: "audio/mpeg", ogg: "audio/ogg", wav: "audio/wav", mp4: "video/mp4", webm: "video/webm", pdf: "application/pdf",
};

/** Find a sanitized note fragment in this slot only. */
function fragmentTarget(slot: HTMLElement, fragment: string | undefined) {
  if (!fragment) return undefined;
  return Array.from(slot.querySelectorAll("[data-publication-fragment]")).find(node => node.id === fragment || node.getAttribute("data-publication-fragment") === fragment);
}

/** Load this note and attach only approved media, with checksum validation before the browser decodes them. */
export function PublicationSidecar({publication, resources, location, id, contentScope, onClose, onNavigate}: {
  publication: Publication; resources: PublicationResources; location: PublicationLocation; id: string; contentScope: string;
  onClose: () => void; onNavigate: (location: PublicationLocation) => void;
}) {
  const content = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const focusNextHeading = useRef(false);
  const fragment = useRef(location.fragment);
  fragment.current = location.fragment;
  const [attempt, retry] = useState(0);
  const [status, setStatus] = useState<"loading" | "ready" | "failed" | "unavailable">("loading");
  const [mediaFailures, setMediaFailures] = useState(0);
  const node = publication.published.get(location.id)!;

  useEffect(() => {
    const slot = content.current;
    const owner = slot?.ownerDocument.defaultView;
    if (!slot || !owner) return;
    const abort = new owner.AbortController();
    const signal = abort.signal, urls = new Map<string, string>();
    setMediaFailures(0);
    slot.replaceChildren();
    const ownedURL = async (path: string) => {
      const prior = urls.get(path);
      if (prior) return prior;
      const type = mimeByExtension[path.slice(path.lastIndexOf(".") + 1)];
      if (!type) throw new Error("Unsupported publication media");
      const bytes = await resources.bytes(path, signal);
      signal.throwIfAborted();
      const url = owner.URL.createObjectURL(new owner.Blob([bytes], {type}));
      urls.set(path, url);
      return url;
    };
    const load = async () => {
      if (node.kind !== "document" && node.kind !== "drawing") {
        if (!node.asset) {setStatus("unavailable"); return;}
        const url = await ownedURL(node.asset);
        signal.throwIfAborted();
        const link = slot.ownerDocument.createElement("a");
        link.href = url;
        link.download = node.asset.slice("assets/".length);
        link.textContent = compassControls.downloadAsset;
        slot.replaceChildren(link);
        setStatus("ready");
        return;
      }
      const raw = await resources.text(publicationNotePath(node.id), signal);
      const clean = sanitizePublicationContent(raw, slot.ownerDocument, {siteURL: resources.siteURL,
        nodeIds: new Set(publication.nodes.keys()), assetPaths: resources.assetPaths, idPrefix: contentScope, deferMedia: true});
      const media = Array.from(clean.querySelectorAll("[data-publication-asset]"), element => ({element,
        path: element.getAttribute("data-publication-asset")!, download: false}));
      const assetsBase = new URL("./assets/", resources.siteURL);
      for (const link of Array.from(clean.querySelectorAll("a[href]"))) {
        const href = new URL(link.getAttribute("href")!, resources.siteURL);
        if (href.origin !== assetsBase.origin || !href.pathname.startsWith(assetsBase.pathname)) continue;
        const path = href.pathname.slice(resources.siteURL.pathname.length);
        // Enable only a verified download. A raw asset URL could navigate to an active document.
        link.removeAttribute("href");
        if (link.namespaceURI !== svgNamespace && resources.assetPaths.has(path)) media.push({element: link, path, download: true});
      }
      signal.throwIfAborted();
      slot.replaceChildren(clean);
      setStatus("ready");
      fragmentTarget(slot, fragment.current)?.scrollIntoView({block: "start"});
      // Verify in series: only one fetched/decompressed media buffer is in flight for this note.
      for (const {element, path, download} of media) {
        try {
          const url = await ownedURL(path);
          signal.throwIfAborted();
          element.setAttribute(download || element.namespaceURI === svgNamespace ? "href" : "src", url);
          if (download) element.setAttribute("download", path.slice("assets/".length));
          element.removeAttribute("data-publication-asset");
        } catch {
          if (signal.aborted) return;
          setMediaFailures(count => count + 1);
        }
      }
    };
    setStatus("loading");
    void load().catch(() => {if (!signal.aborted) setStatus("failed");});
    return () => {
      abort.abort();
      slot.replaceChildren();
      for (const url of urls.values()) owner.URL.revokeObjectURL(url);
    };
  }, [attempt, node, publication, resources, contentScope]);

  useEffect(() => {if (content.current) fragmentTarget(content.current, location.fragment)?.scrollIntoView({block: "start"});}, [location.fragment]);
  useEffect(() => {
    if (!focusNextHeading.current) return;
    focusNextHeading.current = false;
    headingRef.current?.focus({preventScroll: true});
  }, [location.id]);

  /** Route primary link activations through the reader and leave ordinary browser targets available. */
  function follow(event: MouseEvent<HTMLDivElement>) {
    if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const target = event.target;
    if (!(target instanceof event.currentTarget.ownerDocument.defaultView!.Element)) return;
    const href = target.closest("a")?.getAttribute("href");
    if (!href) return;
    const destination = documentDestination(href, resources.siteURL, publication, location.id);
    if (!destination) return;
    event.preventDefault();
    const heading = href.startsWith("#") && content.current ? fragmentTarget(content.current, destination.fragment) : null;
    focusNextHeading.current = event.detail === 0 && destination.id !== location.id;
    onNavigate(heading ? {...destination, fragment: heading.getAttribute("data-publication-fragment") ?? undefined} : destination);
  }

  return <aside id={id} className="kplex-publication-note" aria-labelledby={`${id}-heading`}>
    <header className="kplex-publication-sidecar-heading">
      <h2 ref={headingRef} id={`${id}-heading`} tabIndex={-1}>{node.title}</h2>
      <button type="button" onClick={onClose} aria-label={compassControls.closeSidecar}>×</button>
    </header>
    {status === "loading" && <p role="status">{compassControls.loadingNote}</p>}
    {status === "failed" && <div role="alert"><p>{compassControls.noteUnavailable}</p><button type="button" onClick={() => retry(value => value + 1)}>{compassControls.retry}</button></div>}
    {status === "unavailable" && <p>{compassControls.noDocument}</p>}
    <div ref={content} className="kplex-publication-note-content" aria-busy={status === "loading"} onClick={follow} />
    {mediaFailures > 0 && <div role="status"><p>{compassControls.mediaUnavailable}</p><button type="button" onClick={() => retry(value => value + 1)}>{compassControls.retry}</button></div>}
  </aside>;
}
