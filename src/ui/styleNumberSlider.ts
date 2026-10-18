/** Native style dimensions share one bounded slider, visible value and explicit inheritance action. */
import { Setting, type ExtraButtonComponent, type SliderComponent } from "obsidian";
import type { Translator } from "../lang";

export function styleNumberSlider(parent: HTMLElement, translate: Translator, options: Readonly<{
  label: string; initial: number | undefined; fallback: number; min: number; max: number; step: number; help?: string;
}>): {read: () => number | undefined} {
  let value = options.initial;
  const row = new Setting(parent).setName(options.label);
  if (options.help) row.setDesc(options.help);
  let slider: SliderComponent, reset: ExtraButtonComponent;
  const display = row.controlEl.createEl("output", {attr: {"aria-live": "off"}});
  const refresh = (): void => {
    const number = Number((value ?? options.fallback).toFixed(2));
    display.setText(value === undefined ? `${translate("colors.inherit")} · ${number}` : String(number));
    slider?.sliderEl.setAttribute("aria-valuetext", display.textContent ?? String(number));
    reset?.setDisabled(value === undefined);
  };
  row.addSlider(control => {
    slider = control;
    control.setLimits(options.min, options.max, options.step).setInstant(true).setValue(value ?? options.fallback)
      .onChange(next => {
        const rounded = Number((Math.round(next / options.step) * options.step).toFixed(2));
        value = rounded === options.initial ? options.initial : rounded;
        refresh();
      });
    control.sliderEl.setAttribute("aria-label", options.label);
  });
  // Keep the visible value beside the rail, with native extra-button spacing and focus treatment.
  row.controlEl.append(display);
  row.addExtraButton(button => {
    reset = button;
    button.setIcon("rotate-ccw").setTooltip(translate("styles.inheritDimension", {name: options.label}))
      .onClick(() => {value = undefined; slider.setValue(options.fallback); refresh();});
  });
  refresh();
  return {read: () => value};
}
