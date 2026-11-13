/** One searchable, non-executing, creation-kind-scoped template catalogue shared by native shells. */
import {createElement, useEffect, useId, useMemo, useRef, useState} from "react";
import type {Translator} from "../../lang";
import {FormField} from "../components/FormField";
import {FuzzySuggester} from "../components/FuzzySuggester";
import {fuzzyFilterStrings} from "../components/fuzzyFilterStrings";

export type TemplateChoiceKind = "markdown" | "excalidraw";
export type DrawingTemplateChoice = Readonly<{path: string; kind?: TemplateChoiceKind}>;

/** Optional kinds keep existing drawing-only callers and remembered paths compatible. */
export interface DrawingTemplateChoices {
  files: readonly DrawingTemplateChoice[];
  selected: string;
  root: string;
  /** Captured identity/revision authority is checked only by an explicit Save, never by discovery. */
  validate?: (path: string, kind: TemplateChoiceKind) => void;
}

/** Typing searches only; choosing a captured catalogue entry commits its exact path and creation kind. */
export function DrawingTemplateSelect({choices, value, kind, disabled, translate, onChange}: {
  choices: DrawingTemplateChoices; value: string; kind?: TemplateChoiceKind; disabled?: boolean; translate: Translator;
  onChange: (path: string, kind?: TemplateChoiceKind) => void;
}) {
  const id=useId(),selected=choices.files.find(file=>file.path===value),currentKind=kind??selected?.kind??"excalidraw";
  const blankLabel=translate(currentKind==="markdown"?"template.none":"drawing.blank");
  const committed=useRef(value||blankLabel),[query,setQuery]=useState(value||blankLabel);
  const files=useMemo(/** Capture only paths/kinds; no file contents or host APIs enter discovery. */ ()=>
    new Map(choices.files.filter(file=>(file.kind??"excalidraw")===currentKind).map(file=>[file.path,{path:file.path,kind:file.kind??"excalidraw"} as const])),[choices.files,currentKind]);
  const paths=useMemo(()=>[...files.keys()],[files]);
  useEffect(/** External selections and locale changes replace only the committed display value. */ ()=>{
    committed.current=value||blankLabel;setQuery(committed.current);
  },[value,blankLabel]);
  return createElement(FormField,{controlId:id,label:translate("drawing.template"),className:"kplex-drawing-template",children:
    createElement(FuzzySuggester<DrawingTemplateChoice>,{
      inputId:id,labelledBy:`${id}-label`,ariaLabel:translate("drawing.template"),value:query,disabled,
      onChange:/** Draft query edits never change the creation path or output kind. */ next=>setQuery(next),
      getResults:/** Rank a bounded view of the immutable, folder-scoped catalogue only while disclosed. */ raw=>{
        if(disabled)return [];
        const matches=fuzzyFilterStrings(paths,raw,32,{caseSensitiveIdentity:true}).flatMap(path=>{const file=files.get(path);return file?[file]:[];});
        const blank=!raw.trim()||fuzzyFilterStrings([blankLabel],raw,1).length>0;
        return blank?[{path:"",kind:currentKind},...matches].slice(0,32):matches;
      },
      onChoose:/** Only explicit selection crosses the caller's creation contract. */ file=>{
        if(disabled)return;
        committed.current=file.path||blankLabel;setQuery(committed.current);onChange(file.path,file.kind??"excalidraw");
      },
      getKey:/** Native vault paths are case-sensitive template identities. */ file=>file.path,
      getLabel:/** Duplicate basenames remain readable while the detail retains their full path. */ file=>file.path?file.path.slice(file.path.lastIndexOf("/")+1):blankLabel,
      getDetail:/** Type and source path distinguish drawing/Markdown templates with equal names. */ file=>file.path
        ?`${translate(file.kind==="markdown"?"common.markdown":"common.excalidraw")} · ${file.path}`:null,
      placeholder:translate("template.search"),className:`kplex-template-picker dropdown kplex-native-combobox${disabled?" mod-disabled":""}`,
      floating:true,floatingMode:"viewport",maxFloatingHeight:320,minFloatingWidth:360,openResultsOnFocus:false,closeOnBlur:true,combobox:true,preferSuggestionOnModifiedEnter:true,
      onFocusChange:/** Abandoned query text cannot impersonate the selected template. */ focused=>{if(!focused)setQuery(committed.current);},
      disclosure:{label:translate("template.browse"),icon:null,onOpen:/** Browse all choices without changing the committed selection. */ ()=>setQuery("")},
    })});
}
