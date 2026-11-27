import {createRoot} from "react-dom/client";
import {Compass} from "./Compass";
import {readPublication} from "./publication";

const mounted = new WeakSet<HTMLElement>();
let nextInstance = 0;

/** Bind a read-only Compass to a caller-owned element. Validate each revision before replacing it. */
export function mountCompass(element: HTMLElement, fixture: unknown) {
  const publication = readPublication(fixture);
  if (mounted.has(element)) throw new Error("A publication is already mounted in this element");
  const prefix = `kplex-publication-${++nextInstance}`;
  const root = createRoot(element, {identifierPrefix: prefix});
  mounted.add(element);
  let revision = 0;
  let disposed = false;
  const render = (value: ReturnType<typeof readPublication>) => root.render(
    <Compass key={revision++} publication={value} markerPrefix={prefix} />,
  );
  render(publication);
  return {
    update(value: unknown) {
      if (disposed) throw new Error("Publication mount has been disposed");
      render(readPublication(value));
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      try {root.unmount();} finally {mounted.delete(element);}
    },
  };
}
