/** Native style dimensions share one bounded slider, visible value and explicit inheritance action. */
import {FormSetting as Setting} from "../adapters/obsidian/KplexModal";
import {type ExtraButtonComponent} from "obsidian";
import {numberSlider} from "./numberSlider";
import type { Translator } from "../lang";

export function styleNumberSlider(parent: HTMLElement, translate: Translator, options: Readonly<{
  label: string; initial: number | undefined; fallback: number; min: number; max: number; step: number; help?: string;
  onChange?: (value: number | undefined) => void;
}>): {read: () => number | undefined} {
  let value = options.initial;
  const row = new Setting(parent).setName(options.label);
  if (options.help) row.setDesc(options.help);
  let reset: ExtraButtonComponent;
  const refresh = (): void => {
    const number = Number((value ?? options.fallback).toFixed(2));
    slider.setValue(number);
    reset?.setDisabled(value === undefined);
  };
  const slider = numberSlider(row, {label: options.label, value: value ?? options.fallback, min: options.min, max: options.max, step: options.step,
    format: number => value === undefined ? `${translate("colors.inherit")} · ${Number(number.toFixed(2))}` : String(Number(number.toFixed(2))),
    onChange: next => {
        const rounded = Number((Math.round(next / options.step) * options.step).toFixed(2));
        value = rounded === options.initial ? options.initial : rounded;
        refresh();options.onChange?.(value);
      },
  });
  row.addExtraButton(button => {
    reset = button;
    button.setIcon("rotate-ccw").setTooltip(translate("styles.inheritDimension", {name: options.label}))
      .onClick(() => {value = undefined; refresh();options.onChange?.(undefined);});
  });
  refresh();
  return {read: () => value};
}
