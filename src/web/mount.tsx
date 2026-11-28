import {createRoot} from "react-dom/client";
import {Compass} from "./Compass";
import {readPublication} from "./publication";
import {publicationResources} from "./resources";

declare const __KPLEX_WEB_RUNTIME_VERSION__: string;

const mounted = new WeakSet<HTMLElement>();
let nextInstance = 0;

/** Bind a read-only Compass to a caller-owned element. Validate each revision before replacing it. */
export function mountCompass(element: HTMLElement, fixture: unknown, {publicationUrl}: {publicationUrl?: URL} = {}) {
  return mount(element, fixture, publicationUrl);
}

/** Browser history belongs to the standalone entry point, never to an ordinary embedded mount. */
export function mountStandaloneCompass(element: HTMLElement, fixture: unknown, publicationUrl: URL) {
  return mount(element, fixture, publicationUrl, true);
}

/** Retain the original update/dispose contract for both the demo and complete publication sites. */
function mount(element: HTMLElement, fixture: unknown, publicationUrl?: URL, standalone = false) {
  const owner = element.ownerDocument.defaultView;
  const url = new URL(publicationUrl ?? "./publication.json", element.ownerDocument.baseURI);
  /** Prepare a full revision before it can replace the previously admitted publication. */
  const prepare = (input: unknown) => {
    const publication = readPublication(input);
    if (publication.manifest && (!owner?.crypto.subtle || url.origin !== owner.location.origin)) throw new Error("Secure publication context unavailable");
    if (publication.manifest && typeof __KPLEX_WEB_RUNTIME_VERSION__ !== "undefined" && publication.manifest.runtimeVersion !== __KPLEX_WEB_RUNTIME_VERSION__) {
      throw new Error("Incompatible publication runtime");
    }
    const resources = publication.manifest && owner ? publicationResources(owner, url, publication.manifest) : undefined;
    return {publication, resources};
  };
  const prepared = prepare(fixture);
  if (mounted.has(element)) throw new Error("A publication is already mounted in this element");
  const prefix = `kplex-publication-${++nextInstance}`;
  const root = createRoot(element, {identifierPrefix: prefix});
  mounted.add(element);
  let revision = 0;
  let disposed = false;
  /** Commit graph and resource ownership in one render. */
  const render = ({publication, resources}: ReturnType<typeof prepare>) => {
    if (standalone) element.ownerDocument.title = publication.title;
    root.render(<Compass key={revision++} publication={publication} markerPrefix={prefix} resources={resources}
      browser={standalone && resources && owner ? owner : undefined} />);
  };
  render(prepared);
  return {
    update(value: unknown) {
      if (disposed) throw new Error("Publication mount has been disposed");
      render(prepare(value));
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      try {root.unmount();} finally {mounted.delete(element);}
    },
  };
}
