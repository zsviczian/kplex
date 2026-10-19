/**
 * Owns optional post-save completion, never settings persistence. One refresh flight and a
 * coalesced newer obligation bound retained work when a host refresh does not settle. A short
 * UI wait reports saved/pending; it neither cancels nor replays an accepted disk operation.
 * The plugin supplies its existing refresh owners and retires this adapter on unload.
 */
import {yieldToHostTask} from "./yieldToHostTask";

/** Durable callers need only know whether optional consumers still require recovery. */
type RefreshResult = Readonly<{refreshPending: boolean}>;

/** Single-flight completion lease shared by actual appearance and compatibility saves. */
export class SavedSettingsRefresh {
  private flight: Promise<RefreshResult> | null = null;
  private revision = 0;
  private semanticPending = false;
  private semanticRevision = 0;
  private closed = false;

  /** The callback must retain its own publication fences and must never write settings. */
  constructor(private readonly refresh: (semantic: boolean, current: () => boolean) => Promise<void>) {}

  /** Coalesce later accepted settings without retaining their drafts or starting more host work. */
  request(semantic: boolean): Promise<RefreshResult> {
    if (this.closed) return Promise.resolve({refreshPending: true});
    this.revision += 1;
    this.semanticPending ||= semantic;
    if (semantic) this.semanticRevision += 1;
    if (this.flight) return Promise.resolve({refreshPending: true});
    // Install the lease before invoking the callback, including callbacks that throw synchronously.
    const flight = Promise.resolve().then(/** Construction ordering only; retry fairness uses host tasks below. */ () => this.run());
    this.flight = flight;
    return new Promise<RefreshResult>(/** Bound UI waiting after durable/live publication, not the disk writer. */ resolve => {
      const timer = window.setTimeout(/** The existing saved/pending UX makes a submitted editor dismissible. */ () => resolve({refreshPending: true}), 200);
      void flight.then(/** Fast normal refreshes close without a pending warning; late completion cannot re-close UI. */ result => {
        window.clearTimeout(timer);
        resolve(result);
      });
    });
  }

  /** Process only actual newer save intent; retries cannot build an unbounded optional work queue. */
  private async run(): Promise<RefreshResult> {
    try {
      for (let attempt = 0; attempt < 8 && !this.closed; attempt += 1) {
        const revision = this.revision, semantic = this.semanticPending, semanticRevision = this.semanticRevision;
        await this.refresh(semantic, /** Unload fences follow-up effects without pretending to cancel storage. */ () => !this.closed);
        // A later paint/workflow save cannot manufacture another semantic refresh. A genuinely
        // newer ontology obligation still survives the earlier semantic completion.
        if (semantic && semanticRevision === this.semanticRevision) this.semanticPending = false;
        if (revision === this.revision) return {refreshPending: this.closed};
        await yieldToHostTask();
      }
    } catch (error) {console.error("K-Plex saved settings refresh remains pending", error);}
    finally {this.flight = null;}
    return {refreshPending: true};
  }

  /** Retire follow-up work; already submitted native I/O remains owned by its original provider. */
  close(): void {this.closed = true; this.revision += 1;}
}
