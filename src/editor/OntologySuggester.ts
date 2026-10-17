/**
 * Provides Obsidian editor suggestions from K-Plex ontology settings. The native editor owns
 * suggestion lifecycle; this host adapter reads live configured fields and inserts the selected
 * value. Literal linear-time trigger matching keeps native editor updates responsive even when
 * K-Plex is hidden; no parser/index work, timers or retained editor text cross this boundary.
 */
import {
  EditorSuggest,
  type Editor,
  type EditorPosition,
  type EditorSuggestContext,
  type EditorSuggestTriggerInfo,
  type TFile
} from "obsidian";
import type KplexPlugin from "../main";
import type { RelationshipRole } from "../types";
import { ontologyFieldsForHierarchyRole } from "../core/contracts/fieldName";

/**
 * Match the legacy optional greedy whitespace prefix and terminal non-whitespace/non-colon query
 * without regex backtracking. KMP visits each literal/input character a bounded number of times.
 * Position zero wins the historical ^ alternative; otherwise the earliest possible regex start
 * wins, with its rightmost whitespace-prefixed trigger preferred over an embedded literal.
 * Line terminators end the old dot prefix, including Unicode separators in custom editor input.
 */
function triggerQueryStart(text: string, trigger: string, queryBoundary: number): number | null {
  if (!trigger.length) return queryBoundary;
  if (trigger.length > text.length) return null;
  const fallback = new Uint32Array(trigger.length);
  for (let i = 1, matched = 0; i < trigger.length; i++) {
    while (matched > 0 && trigger[i] !== trigger[matched]) matched = fallback[matched - 1];
    if (trigger[i] === trigger[matched]) matched++;
    fallback[i] = matched;
  }
  let matched = 0, bestRank = Infinity, bestEnd: number | null = null;
  let prefixCursor = 0, prefixRegionStart = 0;
  for (let i = Math.max(0, queryBoundary - trigger.length); i < text.length; i++) {
    while (matched > 0 && text[i] !== trigger[matched]) matched = fallback[matched - 1];
    if (text[i] === trigger[matched]) matched++;
    if (matched !== trigger.length) continue;
    const start = i + 1 - trigger.length;
    if (start === 0) return i + 1;
    // A preceding whitespace can be consumed by the prefix's final \s even when it is a
    // line terminator. Earlier terminators cannot be consumed by the prefix's dot scan.
    while (prefixCursor < start - 1) {
      if (/[\n\r\u2028\u2029]/.test(text[prefixCursor])) prefixRegionStart = prefixCursor + 1;
      prefixCursor++;
    }
    const rank = /\s/.test(text[start - 1]) ? prefixRegionStart : start;
    if (rank <= bestRank) { bestRank = rank; bestEnd = i + 1; }
    matched = fallback[matched - 1];
  }
  return bestEnd;
}

type SuggestType = "all" | "parent" | "child" | "leftFriend" | "rightFriend" | "previous" | "next";

export class OntologySuggester extends EditorSuggest<string> {
  private suggestType: SuggestType = "all";
  private latestTriggerInfo: EditorSuggestTriggerInfo | null = null;

  /** The native editor owns registration and teardown; settings remain live through the plugin. */
  constructor(private plugin: KplexPlugin) { super(plugin.app); }

  /** Resolve role/prefix precedence and exact replacement range without blocking on a long line. */
  onTrigger(cursor: EditorPosition, editor: Editor, _file: TFile | null): EditorSuggestTriggerInfo | null {
    const settings = this.plugin.settings;
    if (!settings.allowOntologySuggester) return null;
    const beforeCursor = editor.getLine(cursor.line).substring(0, cursor.ch);
    let queryBoundary = beforeCursor.length;
    while (queryBoundary > 0 && !/[\s:]/.test(beforeCursor[queryBoundary - 1])) queryBoundary--;
    const mid = settings.ontologySuggesterMidSentenceTrigger;
    const triggerMap: Array<[string, SuggestType]> = [
      [settings.ontologySuggesterTrigger, "all"],
      [settings.ontologySuggesterParentTrigger, "parent"],
      [settings.ontologySuggesterChildTrigger, "child"],
      [settings.ontologySuggesterLeftFriendTrigger, "leftFriend"],
      [settings.ontologySuggesterRightFriendTrigger, "rightFriend"],
      [settings.ontologySuggesterPreviousTrigger, "previous"],
      [settings.ontologySuggesterNextTrigger, "next"]
    ];

    for (const [trigger, type] of triggerMap) {
      for (const prefix of ["", mid]) {
        const fullTrigger = `${prefix}${trigger}`;
        const queryStart = triggerQueryStart(beforeCursor, fullTrigger, queryBoundary);
        if (queryStart === null) continue;
        this.suggestType = type;
        const query = beforeCursor.slice(queryStart);
        const info: EditorSuggestTriggerInfo = {
          end: cursor,
          start: { line: cursor.line, ch: Math.max(0, cursor.ch - query.length - trigger.length) },
          query
        };
        this.latestTriggerInfo = info;
        return info;
      }
    }
    return null;
  }

  /** Read the chosen role’s fields; the all-role picker retains its established sorted order. */
  private keys(): string[] {
    const h = this.plugin.settings.hierarchy;
    const roleForType: Record<Exclude<SuggestType, "all">, RelationshipRole> = {
      parent: "parent",
      child: "child",
      leftFriend: "left",
      rightFriend: "right",
      previous: "previous",
      next: "next",
    };
    const getFields = /** The same configured-field grammar supplies host editors and this native suggester. */
      (role: RelationshipRole): string[] => ontologyFieldsForHierarchyRole(h, role);

    if (this.suggestType !== "all") {
      return getFields(roleForType[this.suggestType]);
    }
    const all = [
      ...h.hidden,
      ...getFields("parent"),
      ...getFields("child"),
      ...getFields("left"),
      ...getFields("right"),
      ...getFields("previous"),
      ...getFields("next"),
      this.plugin.settings.primaryTagField,
    ];
    return [...new Set(all)].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
  }

  /** Filter configured field labels using the native trigger’s query, preserving role selection. */
  getSuggestions(context: EditorSuggestContext): string[] {
    const query = context.query.toLowerCase();
    return this.keys().filter((candidate) => candidate.toLowerCase().includes(query));
  }

  /** Render the native suggestion label through Obsidian’s owning-element creation helper. */
  renderSuggestion(suggestion: string, el: HTMLElement): void {
    const bold = el.createEl("b");
    bold.textContent = suggestion;
    el.appendChild(bold);
  }

  /** Replace only the captured trigger/query range, preserving inline prefixes and bold settings. */
  selectSuggestion(suggestion: string): void {
    const context = this.context;
    const info = this.latestTriggerInfo;
    if (!context || !info) return;
    const bold = this.plugin.settings.boldFields;
    const field = bold ? `**${suggestion}**` : suggestion;
    context.editor.replaceRange(`${field}:: `, info.start, info.end);
  }
}
