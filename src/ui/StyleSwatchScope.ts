/** One bounded visible manager list shares the production reference binding and native fallback policy. */
import {ColorScope} from "../adapters/obsidian/colorScope";
import type {ColorValue} from "../core/contracts/colorValue";
import type {StyleColorContext} from "./StyleColorControls";

/** Literal-only lists need no CSS probe; a reference list owns exactly one native document scope. */
export class StyleSwatchScope {
  private binding: ColorScope | null = null;

  /** Keep preview preferences and CSS lifetime narrow; managers retain rows, data and edit actions. */
  constructor(private readonly element: HTMLElement, private readonly context: Pick<StyleColorContext, "preferences" | "subscribeCss">) {}

  /** Bind configured visible sources once, retaining full alpha and live native mode semantics. */
  update(references: readonly ColorValue[]): void {
    if (!references.some(value => typeof value !== "string")) {this.dispose(); return;}
    const config = {preferences: this.context.preferences(), references};
    if (this.binding) this.binding.update(config);
    else this.binding = new ColorScope(this.element, config, {subscribeCss: this.context.subscribeCss});
  }

  /** Release private properties and native observers before the owning modal disappears. */
  dispose(): void {this.binding?.dispose(); this.binding = null;}
}
