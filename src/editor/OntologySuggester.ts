/**
 * Provides Obsidian editor suggestions from K-Plex ontology settings. The native editor owns
 * suggestion lifecycle; this host adapter reads live configured fields and inserts the selected
 * value. Literal linear-time trigger matching keeps native editor updates responsive even when
 * K-Plex is hidden; no parser/index work, timers or retained editor text cross this boundary.
 */
import {ontologyConfiguration} from "../core/contracts/ontologyConfiguration";
import {normalizeFieldName} from '../core/contracts/fieldName';
import {ontologyFieldViews,ontologyFieldDetail} from '../ui/features/ontologyPresentation';
import {matchOntologyTrigger,ontologyCompletionCandidates,type OntologyCompletionRole} from '../core/contracts/ontologyCompletion';
import {ontologyCompletionConfiguration} from './ontologyCompletionConfiguration';
import {
  EditorSuggest,
  type Editor,
  type EditorPosition,
  type EditorSuggestContext,
  type EditorSuggestTriggerInfo,
  type TFile
} from "obsidian";
import type KplexPlugin from "../main";

export class OntologySuggester extends EditorSuggest<string> {
  private suggestType: OntologyCompletionRole = "all";
  private latestTriggerInfo: EditorSuggestTriggerInfo | null = null;

  /** The native editor owns registration and teardown; settings remain live through the plugin. */
  constructor(private plugin: KplexPlugin) { super(plugin.app); }

  /** Resolve role/prefix precedence and exact replacement range without blocking on a long line. */
  onTrigger(cursor: EditorPosition, editor: Editor, _file: TFile | null): EditorSuggestTriggerInfo | null {
    const settings = this.plugin.settings;
    if (!settings.allowOntologySuggester) return null;
    const match=matchOntologyTrigger(editor.getLine(cursor.line),cursor.ch,ontologyCompletionConfiguration(settings));
    if(!match)return null;
    this.suggestType=match.role;
    const info={end:cursor,start:{line:cursor.line,ch:match.start},query:match.query};
    this.latestTriggerInfo=info;
    return info;
  }

  /** Filter configured field labels using the native trigger’s query, preserving role selection. */
  getSuggestions(context: EditorSuggestContext): string[] {
    const settings=this.plugin.settings;
    return ontologyCompletionCandidates(ontologyConfiguration(settings),settings.ontologyDescriptions,settings.primaryTagField,this.suggestType,context.query)
      .map(/** Native insertion keeps its established string-valued options. */ field=>field.name);
  }

  /** Render the native suggestion label through Obsidian’s owning-element creation helper. */
  renderSuggestion(suggestion: string, el: HTMLElement): void {
    const bold = el.createEl("b");
    bold.textContent = suggestion;
    el.appendChild(bold);
    const view=ontologyFieldViews(ontologyConfiguration(this.plugin.settings),[],this.plugin.settings.ontologyDescriptions).find(/** Annotation never changes the exact insertion value. */ field=>field.key===normalizeFieldName(suggestion));
    if(view?.partner)el.createDiv({cls:'suggestion-note',text:ontologyFieldDetail({...view,description:undefined},this.plugin.translator,Boolean(this.latestTriggerInfo?.query&&!suggestion.toLocaleLowerCase().includes(this.latestTriggerInfo.query.toLocaleLowerCase())))});
    if(view?.description)el.createDiv({cls:'suggestion-note kplex-ontology-description',text:view.description,attr:{'aria-label':view.description}});
    el.setAttribute('aria-label',[suggestion,view?ontologyFieldDetail(view,this.plugin.translator):''].filter(Boolean).join('\n'));
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
