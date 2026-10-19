/**
 * A native Plex's memory-only chronological accepted visits. Stores small opaque references,
 * preserves repetitions and offers indexed access without copying/resolving the whole trail on
 * append. No persistence/export API exists; the native view disposes it on actual close.
 */
import type { NodeRef } from "../core/plex/actions";

export type FootprintVisit = Readonly<{id: number; node: NodeRef}>;

export class PlexFootprints {
  private visits: FootprintVisit[] = [];
  private serial = 0;
  private revision = 0;
  private disposed = false;
  private readonly listeners = new Set<() => void>();
  /** React subscribes only to a scalar; appending never copies the session array. */
  getSnapshot = (): number => this.revision;
  /** Retain one mounted UI listener, independently of the native owner's lifetime. */
  subscribe = (listener: () => void): (() => void) => {this.listeners.add(listener);return () => this.listeners.delete(listener);};
  /** Read session length without resolving any semantic node. */
  get length(): number {return this.visits.length;}
  /** Resolve one visible ordinal; callers cannot mutate the retained collection. */
  at(index: number): FootprintVisit | undefined {return this.visits[index];}
  /** Record an accepted change of center. Same-center publications and native echoes are no-ops. */
  accept(node: NodeRef): void {
    if (this.disposed) return;
    const previous = this.visits[this.visits.length - 1]?.node;
    if (previous?.identity === node.identity && previous.kind === node.kind && previous.fileIdentity === node.fileIdentity) return;
    this.visits.push({id: ++this.serial, node: {...node}});this.publish();
  }
  /** Start here affects only this trail and retains the current accepted center once. */
  startHere(): void {
    const last = this.visits[this.visits.length - 1];if (this.disposed || !last || this.visits.length === 1) return;
    this.visits = [last];this.publish();
  }
  /** Known native rename coordinates come from the existing navigation-path owner, including subtree moves. */
  remapPaths(remap: (path: string) => string): void {
    let changed = false;
    for (let index = 0; index < this.visits.length; index++) {
      const visit = this.visits[index], identity = remap(visit.node.identity);
      if (identity === visit.node.identity) continue;
      this.visits[index] = {id: visit.id, node: {...visit.node, identity, ...(visit.node.path ? {path: remap(visit.node.path)} : {})}};
      changed = true;
    }
    if (changed) this.publish();
  }
  /** Actual native close/plugin unload ends the trail; React/window remounts do not. */
  dispose(): void {this.disposed = true;this.visits = [];this.listeners.clear();}
  /** Notify small subscribers after one atomic append/reset/remap. */
  private publish(): void {this.revision++;for (const listener of this.listeners) listener();}
}
