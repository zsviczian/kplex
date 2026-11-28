import {mountCompass} from "./mount";
import {compassControls} from "../lang/webPublication";

const element = document.querySelector<HTMLElement>("[data-kplex-demo]");
if (element) {
  const fixtureURL = new URL("./publication.json", import.meta.url);
  fetch(fixtureURL).then(response => {
    if (!response.ok) throw new Error(`Failed to load publication (${response.status})`);
    return response.json() as Promise<unknown>;
  }).then(fixture => mountCompass(element, fixture)).catch((error: unknown) => {
    const message = element.ownerDocument.createElement("p");
    message.setAttribute("role", "alert");
    message.textContent = error instanceof Error ? error.message : compassControls.loadFailed;
    element.replaceChildren(message);
  });
}
