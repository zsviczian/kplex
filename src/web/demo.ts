import {mountStandaloneCompass} from "./mount";
import {compassControls} from "../lang/webPublication";
import {fetchManifest} from "./resources";

const element = document.querySelector<HTMLElement>("[data-kplex-demo]");
if (element) openStandalonePublication(element);

/** Load from the page's path whether the script is next to it or in a pinned runtime directory. */
function openStandalonePublication(container: HTMLElement) {
  const owner = container.ownerDocument.defaultView;
  if (!owner) return;
  const manifestUrl = new URL("./publication.json", container.ownerDocument.baseURI);
  const controller = new owner.AbortController();
  let mount: ReturnType<typeof mountStandaloneCompass> | undefined;
  const open = async () => {
    const message = container.ownerDocument.createElement("p");
    message.className = "kplex-publication-opening";
    message.setAttribute("role", "status");
    message.textContent = compassControls.loading;
    container.replaceChildren(message);
    try {
      const fixture = await fetchManifest(owner, manifestUrl, controller.signal);
      controller.signal.throwIfAborted();
      mount = mountStandaloneCompass(container, fixture, manifestUrl);
    } catch {
      if (controller.signal.aborted) return;
      message.setAttribute("role", "alert");
      message.textContent = owner.crypto.subtle ? compassControls.loadFailed : compassControls.insecure;
      const retry = container.ownerDocument.createElement("button");
      retry.type = "button";
      retry.textContent = compassControls.retry;
      retry.addEventListener("click", () => {void open();}, {once: true});
      message.append(" ", retry);
      retry.focus();
    }
  };
  owner.addEventListener("pagehide", event => {
    if (!event.persisted) {controller.abort(); mount?.dispose();}
  });
  void open();
}
