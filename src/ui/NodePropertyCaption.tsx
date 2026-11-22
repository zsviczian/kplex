/** Shared property-line painting for every canvas and the native configuration preview.
 * Labels, Lucide/emoji icons and values remain distinct measured elements; all content is inert text. */
import {getIcon} from "obsidian";
import type {NodePropertyLine} from "../core/plex/nodeProperties";
import {ObsidianIcon} from "./ObsidianIcon";

/** Lucide names use their bounded identifier grammar; other authored glyphs paint as plain text. */
export function isPropertyLucideIcon(icon: string): boolean {return /^[a-z][a-z0-9-]*$/.test(icon);}

/** Render label before value so the label can shrink first without changing the value's semantic text. */
export function NodePropertyCaption({line}: {line: NodePropertyLine}) {
  return <span className="kplex-node-property" title={`${line.field}: ${line.text}`}>
    {line.icon && <span className="kplex-node-property-icon" aria-hidden="true">{isPropertyLucideIcon(line.icon)
      ? <ObsidianIcon name={line.icon} size={12} /> : line.icon}</span>}
    {line.label && <span className="kplex-node-property-label">{line.label}:</span>}
    <span className="kplex-node-property-value">{line.text}</span>
  </span>;
}

/** Native preview uses the same element structure and host-owned Lucide assets as canvas rows. */
export function appendNodePropertyCaption(container: HTMLElement, line: NodePropertyLine): void {
  const row = container.createSpan({cls: "kplex-node-property", attr: {"aria-label": `${line.field}: ${line.text}`}});
  if (line.icon) {
    const icon = row.createSpan({cls: "kplex-node-property-icon", attr: {"aria-hidden": "true"}});
    const glyph = isPropertyLucideIcon(line.icon) ? getIcon(line.icon) : null;
    if (glyph) {glyph.classList.add("kplex-lucide");icon.appendChild(glyph);}
    else if (!isPropertyLucideIcon(line.icon)) icon.setText(line.icon);
  }
  if (line.label) row.createSpan({cls: "kplex-node-property-label", text: `${line.label}:`});
  row.createSpan({cls: "kplex-node-property-value", text: line.text});
}
