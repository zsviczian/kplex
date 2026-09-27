import { getLanguage } from "obsidian";
import { createTranslator, type Translator } from "../../lang";

/** Read Obsidian's configured UI language at the host boundary and retain English fallback. */
export function createObsidianTranslator(): Translator {
  return createTranslator(getLanguage() || "en");
}
