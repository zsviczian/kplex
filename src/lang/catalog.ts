/**
 * Builds complete locale catalogs from translated message text while preserving the English source
 * catalog's stable keys, translator context, interpolation parameters and plural metadata.
 */
import { englishCatalog, type EnglishCatalog } from "./en";

type EnglishKey = keyof EnglishCatalog;
type SourceEntry<K extends EnglishKey> = EnglishCatalog[K];

type TranslationValue<K extends EnglishKey> = SourceEntry<K> extends { readonly plural: Readonly<Record<string, string>> }
  ? Readonly<Record<string, string>>
  : string;

/** Every locale must translate every English key; plural entries provide locale-specific forms. */
export type LocaleTranslationMap = {
  readonly [K in EnglishKey]: TranslationValue<K>;
};

/** Runtime shape accepted by the strict formatter in `src/lang/index.ts`. */
export type LocaleCatalog = Readonly<Record<string, Readonly<{
  context: string;
  params: readonly string[];
  message?: string;
  plural?: Readonly<Record<string, string>>;
  countParam?: string;
}>>>;

/**
 * Materialize a locale catalog without duplicating non-translatable metadata in every language file.
 *
 * @param translations - Exhaustive translated text keyed exactly like the English source catalog.
 * @returns A complete runtime catalog retaining source context, params and plural count metadata.
 */
export function buildLocaleCatalog(translations: LocaleTranslationMap): LocaleCatalog {
  const catalog: Record<string, LocaleCatalog[string]> = {};
  for (const key of Object.keys(englishCatalog) as EnglishKey[]) {
    const source = englishCatalog[key];
    const translated = translations[key];
    if ("plural" in source) {
      catalog[key] = {
        context: source.context,
        params: source.params,
        plural: translated as Readonly<Record<string, string>>,
        countParam: source.countParam,
      };
    } else {
      catalog[key] = {
        context: source.context,
        params: source.params,
        message: translated as string,
      };
    }
  }
  return catalog;
}
