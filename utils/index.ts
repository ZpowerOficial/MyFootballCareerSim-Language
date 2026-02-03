/**
 * Localization Utilities - Main Export
 */

export { deepMerge, deepMergeImmutable, getNestedValue, setNestedValue } from './deepMerge';

export {
  interpolate,
  resolveReferences,
  resolveVariables,
  resolvePlurals,
  interpolateBatch,
  createInterpolator,
  clearInterpolationCache,
  getCacheStats,
} from './interpolate';

export {
  sanitizeString,
  sanitizeObject,
  sanitizePatch,
  isValidTranslationString,
  isProtectedNamespace,
  filterProtectedNamespaces,
  escapeHtml,
  stripHtmlTags,
} from './sanitize';

export {
  validatePatch,
  getPatchableNamespaces,
  createPatchTemplate,
  type ValidationError,
  type ValidationResult,
  type PatchMetadata,
  type UniversalPatch,
} from './schema';

export {
  TranslationLoader,
  initializeLoader,
  getLoader,
  type StorageAdapter,
  type FetchAdapter,
  type LoaderConfig,
  type TranslationSource,
  type LoadedTranslations,
} from './loader';
