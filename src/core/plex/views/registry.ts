/** Finite static internal registration; definitions carry policy, never per-window mutable instances. */
import type {PlexViewDefinition} from "./contracts";
import {validateViewConfigurationSchema} from "./configuration";

export class PlexViewRegistry {
  private readonly definitions = new Map<string, PlexViewDefinition>();
  readonly available: readonly PlexViewDefinition[];
  /** Reject ambiguous IDs/versions before any native surface is constructed. */
  constructor(definitions: readonly PlexViewDefinition[], readonly fallbackId = "classic") {
    for (const definition of definitions) {
      if (!/^[a-z][a-z0-9.-]{0,79}$/.test(definition.id) || definition.version !== 1 || this.definitions.has(definition.id)) {
        throw new Error("Invalid or duplicate internal Plex view definition");
      }
      if (definition.configuration) validateViewConfigurationSchema(definition.configuration);
      this.definitions.set(definition.id, definition);
    }
    if (!this.definitions.has(fallbackId)) throw new Error("Missing fallback Plex view definition");
    this.available = [...this.definitions.values()];
  }
  /** Unknown IDs preserve their saved payload in the session while using the built-in fallback. */
  resolve(id: string): PlexViewDefinition { return this.definitions.get(id) ?? this.definitions.get(this.fallbackId)!; }
  /** Registration is closed after construction; a lookup grants no native or mutation authority. */
  has(id: string): boolean { return this.definitions.has(id); }
}
