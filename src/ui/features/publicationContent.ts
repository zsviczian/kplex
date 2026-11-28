/** Construct a fresh, bounded DOM from a publication's restricted XHTML and SVG. */
import {isPublicationId, isPublicationPath} from "../../core/plex/publication";

const HTML = "http://www.w3.org/1999/xhtml";
const SVG = "http://www.w3.org/2000/svg";
const XLINK = "http://www.w3.org/1999/xlink";
const htmlTags = new Set("a article aside audio b blockquote br caption code dd del div dl dt em figcaption figure h1 h2 h3 h4 h5 h6 hr i img li mark ol p pre s section span strong sub sup table tbody td th thead tr ul video".split(" "));
const svgTags = new Set("svg a circle clipPath defs ellipse g image line linearGradient marker mask path pattern polygon polyline radialGradient rect stop symbol text textPath tspan use".split(" "));
const geometric = new Set("x y x1 x2 y1 y2 cx cy r rx ry fx fy fr d points width height viewBox markerWidth markerHeight refX refY startOffset stroke-width stroke-dasharray stroke-dashoffset font-size letter-spacing textLength pathLength transform gradientTransform patternTransform opacity fill-opacity stroke-opacity offset stop-opacity stroke-miterlimit".split(" "));
const svgOptions = new Set("stroke-linecap stroke-linejoin text-anchor dominant-baseline alignment-baseline font-weight font-style font-family fill-rule clip-rule gradientUnits spreadMethod markerUnits marker-start marker-end marker-mid patternUnits patternContentUnits clipPathUnits maskUnits maskContentUnits preserveAspectRatio orient vector-effect visibility lengthAdjust".split(" "));
const paint = new Set(["fill", "stroke", "stop-color", "clip-path", "mask", "marker-start", "marker-end", "marker-mid"]);
const aliases = /^[-a-z0-9_]{1,96}$/i;
const geometryValue = /^[\d\s+.,%()a-z-]+$/i;
const plainSvgValue = /^[a-z0-9][a-z0-9 .,%'"-]{0,191}$/i;
const svgColor = /^(?:#[\da-f]{3,8}|[a-z]{1,32}|rgba?\([\d., %]+\)|hsla?\([\d., %+-]+\))$/i;
const svgLocalReference = /^url\(#([a-z0-9_.:-]{1,160})\)$/i;
const assetResource = /^\.\/assets\/[a-f0-9]{64}\.[a-z0-9]{2,5}$/;
const assetMedia = /\.(?:png|jpe?g|gif|webp|avif)$/;
export const PUBLICATION_CONTENT_MAX_CHARS = 4 * 1024 * 1024;

export type PublicationContentPolicy = Readonly<{
  siteURL?: URL;
  nodeIds: ReadonlySet<string>;
  assetPaths: ReadonlySet<string>;
  /** A fresh scope per mounted reader document prevents cross-publication SVG ID collisions. */
  idPrefix?: string;
  /** Leave the canonical media path inert until the reader has verified its bytes. */
  deferMedia?: boolean;
}>;

/** Generate case-independent reader fragments from public headings or authored block IDs. */
export function publicationFragment(raw: string): string {
  let heading = raw.replace(/^#/, "");
  try { heading = decodeURIComponent(heading); } catch { /* A literal '%' can appear in an Obsidian heading. */ }
  const isBlock = heading.startsWith("^");
  const slug = heading.replace(/^\^/, "").normalize("NFKC").toLowerCase().trim().replace(/[^\p{L}\p{N}_]+/gu, "-").replace(/^-+|-+$/g, "").slice(0, 80);
  return slug ? `${isBlock ? "b" : "h"}-${slug}` : "";
}

/** Recognize only normalized fragments emitted by the publication converter. */
export function isPublicationFragment(value: string): boolean {
  return /^[bh]-[\p{L}\p{N}_-]{1,80}$/u.test(value);
}

/** Validate external navigation without admitting remote subresources. */
export function publicationExternalLink(raw: string): string | null {
  if (raw.length > 2048 || !/^https?:\/\//i.test(raw) || /[\p{Cc}\s\\]/u.test(raw)) return null;
  try {
    const url = new URL(raw);
    return url.hostname && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}

/** Canonicalize a checked logical node link without retaining any incidental URL parameters. */
export function publicationNodeLink(id: string, fragment = ""): string {
  if (!isPublicationId(id) || (fragment && !isPublicationFragment(fragment))) throw new Error("Invalid public link");
  return `?node=${id}${fragment ? `#${encodeURIComponent(fragment)}` : ""}`;
}

/** Link targets are checked against package membership on both producer and reader. */
function destination(raw: string, policy: PublicationContentPolicy): string | null {
  if (raw.startsWith("?node=")) {
    const match = /^\?node=([^#]+)(?:#(.+))?$/.exec(raw);
    if (!match || !policy.nodeIds.has(match[1]) || !isPublicationId(match[1])) return null;
    let fragment = "";
    try { fragment = decodeURIComponent(match[2] ?? ""); } catch { return null; }
    if (fragment && !isPublicationFragment(fragment)) return null;
    const link = publicationNodeLink(match[1], fragment);
    return policy.siteURL ? new URL(link, policy.siteURL).href : link;
  }
  if (raw.startsWith("#")) {
    let fragment: string;
    try { fragment = decodeURIComponent(raw.slice(1)); } catch { return null; }
    if (!isPublicationFragment(fragment)) return null;
    return `#${encodeURIComponent(policy.idPrefix ? `${policy.idPrefix}-${fragment}` : fragment)}`;
  }
  return assetDestination(raw, policy) ?? publicationExternalLink(raw);
}

/** Only a content-addressed, manifest-owned relative file can be loaded automatically. */
function assetDestination(raw: string, policy: PublicationContentPolicy): string | null {
  const path = raw.slice(2);
  if (!assetResource.test(raw) || !isPublicationPath(path) || !policy.assetPaths.has(path)) return null;
  return policy.siteURL ? new URL(`./${path}`, policy.siteURL).href : `./${path}`;
}

/** Scope all local SVG IDs before replacing clip paths, paint definitions and symbol references. */
function svgScope(root: Element, prefix: string): ReadonlyMap<string, string> {
  const ids = new Map<string, string>();
  for (const item of Array.from(root.querySelectorAll("[id]"))) {
    const id = item.getAttribute("id");
    if (id && /^[a-z0-9_.:-]{1,160}$/i.test(id) && !ids.has(id)) ids.set(id, `${prefix}-${ids.size + 1}`);
  }
  return ids;
}

/** Set a vetted href and mark external navigation independently from media access. */
function linkTo(element: Element, href: string | null): void {
  if (!href) return;
  element.setAttribute("href", href);
  element.setAttribute("rel", "noopener noreferrer");
}

/** Never start an unverified read in the web reader. */
function mediaSource(element: Element, attribute: "href" | "src", raw: string, policy: PublicationContentPolicy): void {
  const safe = assetDestination(raw, policy);
  if (!safe) return;
  if (policy.deferMedia) element.setAttribute("data-publication-asset", raw.slice(2));
  else element.setAttribute(attribute, safe);
}

/** Rebuild accepted HTML elements using exact attributes, never raw style, event or namespace attributes. */
function htmlAttributes(input: Element, output: HTMLElement, policy: PublicationContentPolicy): void {
  const tag = input.localName, id = input.getAttribute("id") ?? input.getAttribute("data-publication-fragment");
  if (id && isPublicationFragment(id)) {
    output.id = policy.idPrefix ? `${policy.idPrefix}-${id}` : id;
    output.setAttribute("data-publication-fragment", id);
  }
  if (tag === "a") linkTo(output, destination(input.getAttribute("href") ?? "", policy));
  if (tag === "img" || tag === "audio" || tag === "video") {
    const src = input.getAttribute("src") ?? "";
    const family = tag === "img" ? /\.(?:png|jpe?g|gif|webp|avif)$/ : tag === "audio" ? /\.(?:mp3|ogg|wav)$/ : /\.(?:mp4|webm)$/;
    if (family.test(src)) mediaSource(output, "src", src, policy);
    if (tag === "img") {
      output.setAttribute("alt", (input.getAttribute("alt") ?? "").slice(0, 512));
      output.setAttribute("loading", "lazy");
      output.setAttribute("decoding", "async");
    } else {
      output.setAttribute("controls", "controls");
      output.setAttribute("preload", "none");
    }
  }
  if (tag === "aside" || tag === "blockquote") {
    const role = input.getAttribute("data-callout");
    if (role && aliases.test(role)) output.setAttribute("data-callout", role);
  }
  if (tag === "ol") {
    const start = input.getAttribute("start");
    if (start && /^\d{1,7}$/.test(start)) output.setAttribute("start", start);
  }
}

/** Keep local SVG paint/geometry while refusing active content, data URLs and unowned resources. */
function svgAttributes(input: Element, output: Element, scope: ReadonlyMap<string, string>, policy: PublicationContentPolicy): void {
  for (const attr of Array.from(input.attributes)) {
    const {localName: key, value} = attr;
    if (value.length > 65_536) continue;
    if (key === "href" && (attr.namespaceURI === null || attr.namespaceURI === XLINK)) {
      if (input.localName === "a") linkTo(output, destination(value, policy));
      else if (input.localName === "image" && assetMedia.test(value)) mediaSource(output, "href", value, policy);
      else if ((input.localName === "use" || input.localName === "textPath" || input.localName.endsWith("Gradient")) && value.startsWith("#")) {
        const id = scope.get(value.slice(1));
        if (id) output.setAttribute("href", `#${id}`);
      }
      continue;
    }
    if (attr.namespaceURI) continue;
    if (key === "id") {
      const id = scope.get(value);
      if (id) output.setAttribute(key, id);
    } else if (paint.has(key)) {
      const reference = svgLocalReference.exec(value);
      const id = reference && scope.get(reference[1]);
      if (id) output.setAttribute(key, `url(#${id})`);
      else if (svgColor.test(value)) output.setAttribute(key, value);
    } else if (geometric.has(key) && geometryValue.test(value)) output.setAttribute(key, value);
    else if (svgOptions.has(key) && plainSvgValue.test(value)) output.setAttribute(key, value);
  }
}

/** Read the fragment as inert XML and append only freshly created allowlisted nodes. */
export function sanitizePublicationContent(raw: string, document: Document, policy: PublicationContentPolicy): DocumentFragment {
  if (raw.length > PUBLICATION_CONTENT_MAX_CHARS || /<!\s*(?:doctype|entity)|<\?[^>]*\?>/i.test(raw)) throw new Error("Invalid publication content");
  if (policy.idPrefix && !aliases.test(policy.idPrefix)) throw new Error("Invalid publication fragment scope");
  const owner = document.defaultView;
  if (!owner) throw new Error("Publication document unavailable");
  const parsed = new owner.DOMParser().parseFromString(`<article xmlns="${HTML}">${raw}</article>`, "application/xhtml+xml");
  if (parsed.documentElement.namespaceURI !== HTML || parsed.querySelector("parsererror")) throw new Error("Invalid publication markup");
  // The publisher serializes in an XML document with no browsing context. Images there cannot
  // resolve against Obsidian's own document. The reader controls deferred same-site media itself.
  const outputDocument = policy.siteURL ? document : parsed;
  const result = outputDocument.adoptNode(new owner.DocumentFragment());
  let count = 0, diagram = 0;
  const allowedSvgIds = new Set<string>();
  /** Bound nested tags and total copied nodes independently of the input byte limit. */
  const append = (node: Node, parent: DocumentFragment | Element, depth: number, scope: ReadonlyMap<string, string> | null): void => {
    if (++count > 100_000 || depth > 64) throw new Error("Publication content too complex");
    if (node.nodeType === 3 || node.nodeType === 4) {
      parent.appendChild(outputDocument.createTextNode(node.nodeValue ?? ""));
      return;
    }
    if (node.nodeType !== 1) return;
    const element = node as Element;
    if (element.namespaceURI === SVG && svgTags.has(element.localName)) {
      if (element.localName === "svg") scope = svgScope(element, `${policy.idPrefix ?? "svg"}-s${++diagram}`);
      if (!scope) return;
      const output = outputDocument.createElementNS(SVG, element.localName);
      svgAttributes(element, output, scope, policy);
      const id = output.getAttribute("id");
      if (id && allowedSvgIds.has(id)) output.removeAttribute("id");
      else if (id) allowedSvgIds.add(id);
      parent.appendChild(output);
      for (const child of Array.from(element.childNodes)) append(child, output, depth + 1, scope);
    } else if (!scope && element.namespaceURI === HTML && htmlTags.has(element.localName)) {
      const output = outputDocument.createElementNS(HTML, element.localName);
      htmlAttributes(element, output, policy);
      parent.appendChild(output);
      for (const child of Array.from(element.childNodes)) append(child, output, depth + 1, null);
    }
  };
  for (const child of Array.from(parsed.documentElement.childNodes)) append(child, result, 0, null);
  return result;
}
