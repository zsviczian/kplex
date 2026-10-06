/**
 * Builds complete locale catalogs from translated text and explicitly permitted English fallback
 * entries while preserving stable keys, translator context, interpolation and plural metadata.
 */
import { englishCatalog, type EnglishCatalog } from "./en";

type EnglishKey = keyof EnglishCatalog;
type SourceEntry<K extends EnglishKey> = EnglishCatalog[K];

type TranslationValue<K extends EnglishKey> = SourceEntry<K> extends { readonly plural: Readonly<Record<string, string>> }
  ? Readonly<Record<string, string>>
  : string;

/** V2 copy ships in English until reviewed translations are supplied; existing keys stay exhaustive. */
type EnglishFallbackKey = Extract<EnglishKey, `indexing.${string}` | "node.gateLocalCount" | "node.gateCachedCount" | "node.gateHostUnavailable">;

/** Existing translations remain required; approved new V2 keys may use the source English entry. */
export type LocaleTranslationMap = {
  readonly [K in Exclude<EnglishKey, EnglishFallbackKey>]: TranslationValue<K>;
} & { readonly [K in EnglishFallbackKey]?: TranslationValue<K> };

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
 * @param translations - Existing translated text plus optional approved V2 translations.
 * @returns A complete runtime catalog retaining source context, params and plural count metadata.
 */
export function buildLocaleCatalog(translations: LocaleTranslationMap): LocaleCatalog {
  const catalog: Record<string, LocaleCatalog[string]> = {};
  for (const key of Object.keys(englishCatalog) as EnglishKey[]) {
    const source = englishCatalog[key];
    const translated = translations[key];
    if (translated === undefined) {
      catalog[key] = source;
      continue;
    }
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
