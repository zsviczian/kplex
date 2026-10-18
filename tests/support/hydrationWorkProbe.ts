/**
 * Test-only aggregate instrumentation of the actual CommonJS snapshot signature export. The
 * contributor browser bundle supplies require; GraphIndex uses this same module object. Only
 * synchronous signature work is timed, results/receivers are preserved, and restore owns cleanup.
 */
import type { computeIndexSettingsSignature } from "../../src/index/IndexSnapshot";

/** The browser bundler supplies this exact CommonJS owner; no native Node runtime enters the test page. */
declare function require(path: "../../src/index/IndexSnapshot"): {
  computeIndexSettingsSignature: typeof computeIndexSettingsSignature;
};

/** Count the owning signature function, never global JSON/Map operations or unrelated plugins. */
export function installHydrationWorkProbe(now: () => number, phase: () => string) {
  const owner = require("../../src/index/IndexSnapshot"), original = owner.computeIndexSettingsSignature;
  const phases = new Map<string, { calls: number; chars: number; synchronousMs: number }>();
  /** Forward one signature computation and retain only aggregate allocation/time proxies. */
  const observed: typeof original = function (this: unknown, settings) {
    const key = phase(), at = now();
    const result = original.call(this, settings);
    const elapsed = now() - at;
    const row = phases.get(key) ?? { calls: 0, chars: 0, synchronousMs: 0 };
    row.calls++; row.chars += result.length; row.synchronousMs += elapsed; phases.set(key, row);
    return result;
  };
  owner.computeIndexSettingsSignature = observed;
  return {
    /** Copy aggregate phase rows without exposing settings, signatures or owner identities. */
    snapshot() { return Object.fromEntries(phases); },
    /** Release precisely this wrapper even after cancellation/assertion failure. */
    restore() { if (owner.computeIndexSettingsSignature === observed) owner.computeIndexSettingsSignature = original; },
  };
}
