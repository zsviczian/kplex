/** Render a resolved node image under final consent. Explicit images retain native lazy loading;
 * automatic video previews acquire the injected bounded loader only on viewport intersection.
 * Each mounted image owns its subscriber and Blob URL, including across owning-document changes. */
import {useLayoutEffect, useMemo, useRef, useState} from "react";
import type {ThumbnailLoader} from "../../application/youtubeThumbnails";
import {canDisplayNodeImage} from "../../core/plex/nodeImagePolicy";

/** Keep viewport admission, deferred React publication and teardown in one image-owned lifetime. */
export function NodeVisualImage({src, path, alt, youtubeId, allowRemote, loader}: {
  src: string; path: string; alt: string; youtubeId?: string; allowRemote: boolean; loader?: ThumbnailLoader;
}) {
  const element = useRef<HTMLImageElement | null>(null);
  const allowed = canDisplayNodeImage(path, allowRemote);
  const identity = useMemo(/** Permission off/on cycles never reuse a retired Blob URL. */ () => ({}), [youtubeId, allowed, loader]);
  const [loaded, setLoaded] = useState<Readonly<{identity: object; src: string}> | null>(null);
  const [failed, setFailed] = useState<object | null>(null);
  useLayoutEffect(/** Permission, identity and owning-document cleanup retire requests before a later image can publish. */ () => {
    const image = element.current, owner = image?.ownerDocument, view = owner?.defaultView;
    if (!image || !owner || !view || !youtubeId || !allowed || !loader) return;
    let alive = true, started = false, url: string | null = null;
    let lease: ReturnType<ThumbnailLoader["acquire"]> | null = null;
    /** The captured image and document must still own this live request and any following fallback. */
    const current = (): boolean => alive && loader.permitted() && image.ownerDocument === owner && image.isConnected;
    /** Only a still-current owner may publish fallback; cancellation never marks another image failed. */
    const fail = (): void => {setFailed(/** Deferred failure publication retains the same lifetime fence as success. */ prior => current() ? identity : prior);};
    /** Admit at most one coalesced request for this mounted video after real viewport intersection. */
    const start = (): void => {
      if (started || !current()) return;
      started = true;
      try {lease = loader.acquire(youtubeId, current);} catch {fail(); return;}
      void lease.promise.then(/** A detached, revoked or replaced node never receives a Blob URL or image src. */ result => {
        if (!current()) return;
        if (!result) {fail(); return;}
        url = view.URL.createObjectURL(new view.Blob([result.bytes], {type: result.mime}));
        const resolved = url;
        setLoaded(/** A deferred React update cannot revive the outgoing image lifetime. */ prior => current() ? {identity, src: resolved} : prior);
      }).catch(/** Host transport/decode setup failures leave the ordinary label/icon fallback. */ () => {if (current()) fail();});
    };
    const observer = typeof view.IntersectionObserver === "function"
      ? new view.IntersectionObserver(/** Clipped/materialized nodes remain request-free until visible. */ entries => {
        if (entries.some(/** Only this image's actual visible intersection grants admission. */ entry => entry.isIntersecting)) {observer?.disconnect(); start();}
      }) : null;
    if (observer) observer.observe(image); else start();
    return /** Dispose through the captured owner even when a popout has moved/retired the node. */ () => {
      alive = false;
      observer?.disconnect();
      lease?.release();
      if (url) view.URL.revokeObjectURL(url);
    };
  }, [youtubeId, allowed, loader, identity, failed]);
  if (!allowed || youtubeId && failed === identity) return null;
  return <img ref={element} src={youtubeId ? loaded?.identity === identity ? loaded.src : undefined : src}
    alt={alt} loading="lazy" decoding="async" draggable={false}
    onError={youtubeId ? /** Invalid/offline payloads leave the ordinary node label and icon, without a retry loop. */ () => setFailed(identity) : undefined} />;
}
