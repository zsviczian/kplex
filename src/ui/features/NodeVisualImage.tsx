/** Render explicit node images and admit automatic previews at the same viewport boundary.
 * Local media leases are released on visibility loss. YouTube reads live consent and retains
 * its existing mount and transport lifetime. */
import {useLayoutEffect, useMemo, useRef, useState} from "react";
import type {LocalVideoThumbnailFile, LocalVideoThumbnailLoader} from "../../application/localVideoThumbnail";
import type {ThumbnailLoader} from "../../application/youtubeThumbnails";
import {canDisplayNodeImage} from "../../core/plex/nodeImagePolicy";

/** Keep viewport admission, deferred React publication and teardown in one image-owned lifetime. */
export function NodeVisualImage<File extends LocalVideoThumbnailFile>({src, path, alt, youtubeId, allowRemote, loader, localFile, localLoader}: {
  src: string; path: string; alt: string; youtubeId?: string; allowRemote: boolean; loader?: ThumbnailLoader;
  localFile?: File; localLoader?: LocalVideoThumbnailLoader<File, Document>;
}) {
  const element = useRef<HTMLImageElement | null>(null);
  const localSlot = useRef<HTMLSpanElement | null>(null);
  const rejectLocalImage = useRef<(() => void) | null>(null);
  const allowed = localFile ? localLoader?.permitted() === true : canDisplayNodeImage(path, allowRemote);
  const automatic = Boolean(localFile || youtubeId);
  const localPath = localFile ? path : undefined;
  const identity = useMemo(/** Provider replacement and permission revocation invalidate the old image. */ () => ({}),
    [youtubeId, allowed, loader, localFile, localLoader, localPath]);
  const [loaded, setLoaded] = useState<Readonly<{identity: object; src: string}> | null>(null);
  const [failed, setFailed] = useState<object | null>(null);
  useLayoutEffect(/** Observe the image slot so nested clipping and hidden native windows revoke local work. */ () => {
    const slot = localFile ? localSlot.current : element.current, owner = slot?.ownerDocument, view = owner?.defaultView;
    if (!slot || !owner || !view || !allowed || !(localFile ? localLoader : youtubeId && loader)) return;
    let alive = true, intersects = false, pageHidden = false, started = false, revision = 0, url: string | null = null;
    let lease: Readonly<{release: () => void}> | null = null;

    /** Never publish into a migrated image, closed document or now-ineligible setting. */
    const current = (): boolean => alive && slot.ownerDocument === owner && slot.isConnected
      && (localFile ? intersects && !owner.hidden && !pageHidden && !view.closed && localFile.path === localPath
        && localLoader?.permitted() === true : loader?.permitted() === true);

    /** Retire this viewport residency before a deferred result can be applied. */
    const stop = (): void => {
      revision++;
      started = false;
      lease?.release();
      lease = null;
      if (url) {view.URL.revokeObjectURL(url);url = null;}
      setLoaded(/** Clearing an outgoing residency never removes its successor. */ previous => previous?.identity === identity ? null : previous);
    };

    /** A retired attempt cannot update React state even if the same node becomes visible again. */
    const publish = (source: string, attempt: number): void => {
      setLoaded(/** Recheck after React scheduling, not just after the provider is ready. */ previous =>
        current() && revision === attempt ? {identity, src: source} : previous);
    };

    /** Start only once per visible residency. Refused jobs can wait for a later real intersection. */
    const start = (): void => {
      if (started || !current()) return;
      started = true;
      const attempt = ++revision;
      /** Keep the local fallback observable for its next viewport residency. */
      const fail = (): void => {
        if (!localFile) setFailed(/** A queued failure also belongs to this provider's lifetime. */ previous =>
          current() && revision === attempt ? identity : previous);
      };
      try {
        if (localFile && localLoader && localPath) {
          const local = localLoader.acquire(localFile, localPath, owner, current, /** Native writes invalidate same-path mounted images. */ () => {
            stop();
            view.queueMicrotask(start);
          });
          lease = local;
          void local.promise.then(/** The host lease owns a shared frame URL for this document. */ result => {
            if (result) publish(result, attempt);
          }).catch(fail);
        } else if (youtubeId && loader) {
          const remote = loader.acquire(youtubeId, current);
          lease = remote;
          void remote.promise.then(/** Construct a private URL only while the remote consumer still exists. */ result => {
            if (!current() || revision !== attempt) return;
            if (!result) {fail();return;}
            url = view.URL.createObjectURL(new view.Blob([result.bytes], {type: result.mime}));
            publish(url, attempt);
          }).catch(fail);
        }
      } catch {
        fail();
      }
    };

    /** A hidden WebView must release queries even if geometry is unchanged. */
    const updateVisibility = (): void => {if (current()) start();else if (started) stop();};
    /** Native window retirement may precede the React surface's ordinary unmount. */
    const hidePage = (): void => {pageHidden = true;updateVisibility();};
    const observer = typeof view.IntersectionObserver === "function"
      ? new view.IntersectionObserver(/** A clipped image remains request-free even inside a mounted canvas. */ entries => {
        if (!localFile) {
          if (entries.some(/** YouTube admits its existing pre-image placeholder. */ entry => entry.isIntersecting)) {observer?.disconnect();start();}
          return;
        }
        const entry = entries[entries.length - 1];
        if (!entry) return;
        intersects = entry.isIntersecting && entry.intersectionRect.width > 0 && entry.intersectionRect.height > 0;
        updateVisibility();
      }) : null;
    if (observer) observer.observe(slot);
    else if (!localFile) start();
    if (localFile) {
      owner.addEventListener("visibilitychange", updateVisibility);
      view.addEventListener("pagehide", hidePage);
      rejectLocalImage.current = /** Release a rejected URL without readmitting the same residency. */ () => {
        if (!current()) return;
        revision++;
        lease?.release();
        lease = null;
        setLoaded(/** Keep a newer image if this event was already queued. */ previous => previous?.identity === identity ? null : previous);
      };
    }
    return /** Dispose through the captured owner even when a popout has moved/retired the node. */ () => {
      alive = false;
      observer?.disconnect();
      lease?.release();
      if (url) view.URL.revokeObjectURL(url);
      if (localFile) {
        rejectLocalImage.current = null;
        owner.removeEventListener("visibilitychange", updateVisibility);
        view.removeEventListener("pagehide", hidePage);
      }
    };
  }, [youtubeId, allowed, loader, localFile, localLoader, identity, localPath, failed]);
  if (!allowed || youtubeId && failed === identity) return null;
  const source = automatic ? loaded?.identity === identity ? loaded.src : undefined : src;
  const image = <img ref={localFile ? undefined : element} src={source}
    alt={alt} loading="lazy" decoding="async" draggable={false}
    onError={automatic ? /** Rejected image data keeps the normal label and icon. */ () => {
      if (localFile) rejectLocalImage.current?.();
      else setFailed(identity);
    } : undefined} />;
  // Keep the local visibility target mounted without presenting an empty bitmap to image export.
  return localFile ? <span ref={localSlot} className="kplex-local-video-slot" aria-hidden="true">{source && image}</span> : image;
}
