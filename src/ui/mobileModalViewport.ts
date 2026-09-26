/**
 * Fit a native Obsidian modal to the visible mobile WebView area. The software keyboard can
 * shrink VisualViewport without changing window.innerHeight or the modal container's height.
 * Keep this at the host shell; portable input components receive only their own geometry.
 */
export function fitMobileModalToViewport(modalEl: HTMLElement): () => void {
  const ownerDocument = modalEl.ownerDocument;
  const ownerWindow = ownerDocument.defaultView;
  if (!ownerWindow || !ownerDocument.body.classList.contains("is-mobile")) return () => {};

  modalEl.classList.add("kplex-mobile-fullscreen-modal");
  const viewport = ownerWindow.visualViewport;
  const update = () => {
    const current = ownerWindow.visualViewport;
    modalEl.setCssProps({
      "--kplex-visible-left": `${current?.offsetLeft ?? 0}px`,
      "--kplex-visible-top": `${current?.offsetTop ?? 0}px`,
      "--kplex-visible-width": `${current?.width ?? ownerWindow.innerWidth}px`,
      "--kplex-visible-height": `${current?.height ?? ownerWindow.innerHeight}px`,
    });
  };

  update();
  viewport?.addEventListener("resize", update);
  viewport?.addEventListener("scroll", update);
  ownerWindow.addEventListener("resize", update);
  return () => {
    viewport?.removeEventListener("resize", update);
    viewport?.removeEventListener("scroll", update);
    ownerWindow.removeEventListener("resize", update);
    modalEl.classList.remove("kplex-mobile-fullscreen-modal");
  };
}
