import type { App } from "obsidian";
import {
  createLegacyPropertyProvider,
  predicateContextFromLegacy,
  type LegacyPredicateContext,
} from "../adapters/obsidian/predicateContracts";
import { GraphPredicateEngine as CoreGraphPredicateEngine, type CompiledGraphPredicate } from "../core/plex/predicate";

export * from "../core/plex/predicate";
export type {
  LegacyPredicateContext as GraphPredicateContext,
  LegacyPredicateEdgeContext as GraphPredicateEdgeContext,
} from "../adapters/obsidian/predicateContracts";
export type GraphPredicateNodeContext = LegacyPredicateContext["node"];

/** Legacy production callers delegate to one host-free evaluator. */
export class GraphPredicateEngine {
  readonly portable: CoreGraphPredicateEngine;

  constructor(app: App) {
    this.portable = new CoreGraphPredicateEngine(createLegacyPropertyProvider(app));
  }

  matches(predicate: CompiledGraphPredicate | null, context: LegacyPredicateContext): boolean {
    if (!predicate) return true;
    return this.portable.matches(predicate, predicateContextFromLegacy(context));
  }
}
