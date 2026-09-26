import { Platform } from "obsidian";
import { parseBodyMetadataCore, type ParsedBodyMetadata } from "../core/parser/metadata";
import { parseBodyMetadataCooperative } from "./fieldParser";

type Pending = {
  resolve: (value: ParsedBodyMetadata) => void;
  reject: (reason?: unknown) => void;
};

type WorkerResponse = {
  id: number;
  ok: boolean;
  result?: ParsedBodyMetadata;
  error?: string;
};

export class MetadataParseCancelledError extends Error {
  constructor() { super("K-Plex metadata parse cancelled"); this.name = "MetadataParseCancelledError"; }
}

/**
 * Single parsing boundary for GraphBuilder. Workers execute the self-contained synchronous core;
 * worker-less hosts use the grammar-equivalent cooperative parser so long lines can yield and
 * observe cancellation on the renderer thread. Regression tests keep both paths equivalent.
 */
export class MetadataParser {
  private worker: Worker | null = null;
  private nextId = 1;
  private pending = new Map<number, Pending>();
  private disabled = false;
  private disposed = false;
  private fallbackGeneration = 0;

  constructor() {
    // WebKit/WebView worker message passing clones whole Markdown strings and parsed payloads.
    // On iOS this transient duplication can be more expensive than parsing one file at a time
    // on the renderer thread, so prefer the low-memory fallback path there.
    if (Platform.isIosApp || typeof Worker === "undefined" || typeof Blob === "undefined") {
      this.disabled = true;
      return;
    }
    this.createWorker();
  }

  private createWorker(): void {
    if (this.disposed || this.disabled || this.worker) return;
    try {
      const parserSource = parseBodyMetadataCore.toString();
      const source = `
        const parseBodyMetadataCore = ${parserSource};
        self.onmessage = (event) => {
          const { id, content } = event.data;
          try {
            self.postMessage({ id, ok: true, result: parseBodyMetadataCore(content) });
          } catch (error) {
            self.postMessage({ id, ok: false, error: error instanceof Error ? error.message : String(error) });
          }
        };
      `;
      const url = URL.createObjectURL(new Blob([source], { type: "text/javascript" }));
      this.worker = new Worker(url, { name: "k-plex-metadata-parser" });
      URL.revokeObjectURL(url);
      this.worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
        const message = event.data;
        const pending = this.pending.get(message.id);
        if (!pending) return;
        this.pending.delete(message.id);
        if (message.ok && message.result) pending.resolve(message.result);
        else pending.reject(new Error(message.error || "Metadata worker failed"));
      };
      this.worker.onerror = () => this.disableWorker();
    } catch {
      this.disabled = true;
      this.worker = null;
    }
  }

  async parse(content: string): Promise<ParsedBodyMetadata> {
    if (this.disposed) throw new MetadataParseCancelledError();
    if (this.disabled || !this.worker) {
      const generation = this.fallbackGeneration;
      try {
        return await parseBodyMetadataCooperative(
          content,
          () => !this.disposed && generation === this.fallbackGeneration,
        );
      } catch (error) {
        if (this.disposed || generation !== this.fallbackGeneration) throw new MetadataParseCancelledError();
        throw error;
      }
    }
    const id = this.nextId++;
    try {
      return await new Promise<ParsedBodyMetadata>((resolve, reject) => {
        this.pending.set(id, { resolve, reject });
        try {
          this.worker!.postMessage({ id, content });
        } catch (error) {
          this.pending.delete(id);
          reject(error instanceof Error ? error : new Error(String(error)));
        }
      });
    } catch (error) {
      if (error instanceof MetadataParseCancelledError || this.disposed) throw error;
      // A genuine worker failure degrades to the cooperative renderer-thread parser; cancellation
      // never does. The fallback has the same grammar but yields within long lines.
      const generation = this.fallbackGeneration;
      try {
        return await parseBodyMetadataCooperative(
          content,
          () => !this.disposed && generation === this.fallbackGeneration,
        );
      } catch (fallbackError) {
        if (this.disposed || generation !== this.fallbackGeneration) throw new MetadataParseCancelledError();
        throw fallbackError;
      }
    }
  }

  /** Stop obsolete work immediately. Terminating the worker is required because a synchronous
   * parser job cannot observe a cancel message until after that job has already finished. */
  cancelPending(): void {
    if (this.disposed) return;
    this.fallbackGeneration += 1;
    this.worker?.terminate();
    this.worker = null;
    const error = new MetadataParseCancelledError();
    for (const pending of this.pending.values()) pending.reject(error);
    this.pending.clear();
    if (!this.disabled) this.createWorker();
  }

  destroy(): void {
    this.disposed = true;
    this.fallbackGeneration += 1;
    this.worker?.terminate();
    this.worker = null;
    const error = new MetadataParseCancelledError();
    for (const pending of this.pending.values()) pending.reject(error);
    this.pending.clear();
  }

  private disableWorker(): void {
    this.disabled = true;
    this.worker?.terminate();
    this.worker = null;
    // These are genuine failures, so parse() is allowed to fall back for the affected jobs.
    for (const pending of this.pending.values()) pending.reject(new Error("K-Plex metadata parser worker disabled"));
    this.pending.clear();
  }
}
