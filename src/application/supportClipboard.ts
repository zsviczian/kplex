/** Support-report compatibility facade over the shared gesture-safe clipboard lifecycle. */
import {ClipboardSession} from "./ClipboardSession";
export type {ClipboardState as SupportCopyState} from "./ClipboardSession";

/** Keep the report-preview contract while sharing write/denial/retirement mechanics with other UI. */
export class SupportClipboardSession extends ClipboardSession {
  get report(): string {return this.text;}
}
