/** One template dropdown shared by native shells and the related-note composer. */
import { createElement, type ChangeEvent } from "react";
import type { Translator } from "../../lang";

export interface DrawingTemplateChoices {
  files: readonly {path: string}[];
  selected: string;
  root: string;
}

/** Render vault paths as text and preserve an explicit blank-drawing choice. */
export function DrawingTemplateSelect({choices, value, disabled, translate, onChange}: {
  choices: DrawingTemplateChoices; value: string; disabled?: boolean; translate: Translator; onChange: (path: string) => void;
}) {
  return createElement("label", {className: "kplex-drawing-template"},
    translate("drawing.template"),
    createElement("select", {value, disabled, "aria-label": translate("drawing.template"),
      onChange: (event: ChangeEvent<HTMLSelectElement>) => onChange(event.target.value)},
      createElement("option", {value: ""}, translate("drawing.blank")),
      ...choices.files.map(file => createElement("option", {key: file.path, value: file.path},
        choices.root && file.path.startsWith(`${choices.root}/`) ? file.path.slice(choices.root.length + 1) : file.path))));
}
