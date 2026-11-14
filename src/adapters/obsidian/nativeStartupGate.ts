/**
 * Native PluginManager awaits Component.load(), then the instance's private loadCSS(), before
 * completing its load clock. Observe that verified hook without changing its result or rejection.
 * Workspace readiness alone can fire inline on reload; the one main-window task starts services
 * after both native boundaries. Hosts without the hook retain functional workspace/task fallback.
 */
import type {Plugin, Workspace} from "obsidian";

/** Own one startup admission and restore only our exact temporary instance method on retirement. */
export function installNativeStartupGate(plugin: Pick<Plugin, "register">, workspace: Pick<Workspace, "onLayoutReady">,
  start: () => void, cssFailed: () => void): void {
  const previous = Object.getOwnPropertyDescriptor(plugin, "loadCSS");
  let nativeCss: unknown;
  try {nativeCss = Reflect.get(plugin, "loadCSS");} catch { /* An unavailable private hook uses the functional fallback. */ }
  let wrapper: ((...args: unknown[]) => unknown) | null = null;
  let workspaceReady = false, cssReady = true, closed = false, started = false;
  let timer: number | null = null;
  /** Never remove a successor wrapper installed by the native host or another lifetime owner. */
  const restore = (): void => {
    if (!wrapper || Object.getOwnPropertyDescriptor(plugin, "loadCSS")?.value !== wrapper) return;
    if (previous) Object.defineProperty(plugin, "loadCSS", previous);
    else Reflect.deleteProperty(plugin, "loadCSS");
  };
  /** Main-window coordination and queued admission end with the owning Component registration. */
  const dispose = (): void => {
    closed = true;
    if (timer !== null) window.clearTimeout(timer);
    timer = null;restore();
  };
  /** Preserve the host's CSS failure channel; only the existing readiness promise is settled here. */
  const failed = (): void => {if (closed) return;dispose();cssFailed();};
  /** A native promise/clock continuation drains before this sole event task, including already-ready reloads. */
  const admit = (): void => {
    if (closed || started || timer !== null || !workspaceReady || !cssReady) return;
    timer = window.setTimeout(/** A captured retired callback cannot initialize a replacement plugin. */ () => {
      timer = null;if (closed || started) return;started = true;start();
    }, 0);
  };
  plugin.register(dispose);
  if (closed) return;
  if (typeof nativeCss === "function") {
    /** Observe the native first call without replacing its receiver, result or failure channel. */
    wrapper = function(this: unknown, ...args: unknown[]): unknown {
      // Observe only the first native startup call; later CSS reloads retain the original API.
      restore();
      let result: unknown;
      try {result = Reflect.apply(nativeCss, this, args);} catch (error) {failed();throw error;}
      // Return the exact native result. This independent observer consumes its rejection without
      // changing what PluginManager awaits, and cannot leave a rejected observation promise.
      void Promise.resolve(result).then(/** CSS settlement releases only this live startup gate. */ () => {if (!closed) {cssReady = true;admit();}}, failed).catch(failed);
      return result;
    };
    try {
      Object.defineProperty(plugin, "loadCSS", previous && "value" in previous ? {...previous, value: wrapper}
        : {configurable: true, enumerable: previous?.enumerable ?? false, writable: true, value: wrapper});
      cssReady = false;
    } catch {wrapper = null; /* Private API absence/read-only hosts keep workspace plus event-task admission. */ }
  }
  workspace.onLayoutReady(/** Native loading views never wait for these services during workspace restoration. */ () => {
    if (closed) return;workspaceReady = true;admit();
  });
}
