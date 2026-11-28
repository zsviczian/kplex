/**
 * Builds complete locale catalogs from translated text and explicitly permitted English fallback
 * entries while preserving stable keys, interpolation and plural metadata.
 * English reference-parameter classification is inherited; locale text cannot retarget literal quoting.
 */
import { englishCatalog, type EnglishCatalog } from "./en";

type EnglishKey = keyof EnglishCatalog;
type SourceEntry<K extends EnglishKey> = EnglishCatalog[K];

type TranslationValue<K extends EnglishKey> = SourceEntry<K> extends { readonly plural: Readonly<Record<string, string>> }
  ? Readonly<Record<string, string>>
  : string;

/** Historical English-fallback allowances remain compatible; maintained Sidecar attachment/folding copy requires every supported translation. */
type EnglishFallbackKey = Exclude<Extract<EnglishKey, `styles.operation.${string}` | `indexing.${string}` | `hotkeys.${string}` | `wander.${string}` | `actions.${string}` | `addRelated.completion.${string}` | "addRelated.endpointChanged" | "addRelated.partialCreation" | "addRelated.originTitle" | "addRelated.completionMode" | "addRelated.savedPending" | "addRelated.refreshSaved" | "addRelated.recoverFile" | "addRelated.linkCreatedFile" | "addRelated.openCreatedFile" | "addRelated.closedBeforeLink" | "node.gateLocalCount" | "node.gateCachedCount" | "node.gateHostUnavailable"
  | "filter.sourcePropertyUrl" | "graph.sourcePropertyUrl" | "graph.typeSelectionStatus" | "graph.typeSelectionCount" | "explain.sourcePropertyUrl"
  | "explain.summarySourcePropertyUrl" | "references.propertyUrl" | "explain.summaryDatePropertyPolicy" | `settings.datePropertyRelations.${string}`
  | "settings.ui.allowRemoteNodeImages" | "settings.ui.allowRemoteNodeImages.help"
  | "graph.evidenceFieldDecision" | "graph.evidenceFieldDecisionOverridden">, Extract<EnglishKey, `actions.view.sidecar.attach-${string}` | "actions.view.sidecar.collapse-plex" | "actions.view.sidecar.collapse-plex.description">>;

/** Maintained translations are required; only the explicitly retained historical allowances may fall back to English. */
export type LocaleTranslationMap = {
  readonly [K in Exclude<EnglishKey, EnglishFallbackKey>]: TranslationValue<K>;
} & { readonly [K in EnglishFallbackKey]?: TranslationValue<K> };

/** Runtime shape accepted by the strict formatter in `src/lang/index.ts`. */
export type LocaleCatalog = Readonly<Record<string, Readonly<{
  params: readonly string[];
  referenceParams?: readonly string[];
  message?: string;
  plural?: Readonly<Record<string, string>>;
  countParam?: string;
}>>>;

/** Production arrays use English catalog order. A null slot or missing tail uses English fallback. */
type IndexedTranslations = Array<LocaleTranslationMap[EnglishKey] | null>;

/**
 * Materialize a locale catalog without duplicating non-translatable metadata in every language file.
 *
 * @param translations - The keyed source table or the build-generated array in English key order.
 * @returns A complete runtime catalog retaining params, reference classification and plural count metadata.
 */
export function buildLocaleCatalog(translations: LocaleTranslationMap | IndexedTranslations): LocaleCatalog {
  const catalog: Record<string, LocaleCatalog[string]> = {};
  const keys = Object.keys(englishCatalog) as EnglishKey[];
  const indexed = Array.isArray(translations);
  for (const [index, key] of keys.entries()) {
    const source = englishCatalog[key];
    const referenceMetadata = "referenceParams" in source ? {referenceParams:source.referenceParams} : {};
    const translated = indexed ? translations[index] : translations[key];
    if (translated === undefined || translated === null) {
      catalog[key] = source;
      continue;
    }
    if ("plural" in source) {
      catalog[key] = {
        params: source.params,
        ...referenceMetadata,
        plural: translated as Readonly<Record<string, string>>,
        countParam: source.countParam,
      };
    } else {
      catalog[key] = {
        params: source.params,
        ...referenceMetadata,
        message: translated as string,
      };
    }
  }
  return catalog;
}
