/**
 * Provides Obsidian editor suggestions from K-Plex ontology settings. The native editor owns
 * suggestion lifecycle; this host adapter reads configured fields and inserts the selected value.
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

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

type SuggestType = "all" | "parent" | "child" | "leftFriend" | "rightFriend" | "previous" | "next";

export class OntologySuggester extends EditorSuggest<string> {
  private suggestType: SuggestType = "all";
  private latestTriggerInfo: EditorSuggestTriggerInfo | null = null;

  constructor(private plugin: KplexPlugin) { super(plugin.app); }

  onTrigger(cursor: EditorPosition, editor: Editor, _file: TFile | null): EditorSuggestTriggerInfo | null {
    const settings = this.plugin.settings;
    if (!settings.allowOntologySuggester) return null;
    const beforeCursor = editor.getLine(cursor.line).substring(0, cursor.ch);
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
        const re = new RegExp(`(?:^|.*\\s)?${escapeRegExp(fullTrigger)}([^\\s:]*)$`);
        const match = beforeCursor.match(re);
        if (!match) continue;
        this.suggestType = type;
        const query = match[1] ?? "";
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

  private keys(): string[] {
    const h = this.plugin.settings.hierarchy;
    switch (this.suggestType) {
      case "parent": return h.parents;
      case "child": return h.children;
      case "leftFriend": return h.leftFriends;
      case "rightFriend": return h.rightFriends;
      case "previous": return h.previous;
      case "next": return h.next;
      case "all": return [...h.hidden, ...h.parents, ...h.children, ...h.leftFriends, ...h.rightFriends, ...h.previous, ...h.next, this.plugin.settings.primaryTagField]
        .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
    }
  }

  getSuggestions(context: EditorSuggestContext): string[] {
    const query = context.query.toLowerCase();
    return this.keys().filter((candidate) => candidate.toLowerCase().includes(query));
  }

  renderSuggestion(suggestion: string, el: HTMLElement): void {
    const bold = el.createEl("b");
    bold.textContent = suggestion;
    el.appendChild(bold);
  }

  selectSuggestion(suggestion: string): void {
    const context = this.context;
    const info = this.latestTriggerInfo;
    if (!context || !info) return;
    const bold = this.plugin.settings.boldFields;
    const field = bold ? `**${suggestion}**` : suggestion;
    context.editor.replaceRange(`${field}:: `, info.start, info.end);
  }
}
