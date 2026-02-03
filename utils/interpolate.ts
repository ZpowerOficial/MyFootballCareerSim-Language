/**
 * Interpolation Engine with Caching
 * 
 * Resolves dynamic references and variables in translation strings.
 * Implements memory caching to avoid repeated regex processing.
 */

import { getNestedValue } from './deepMerge';

// Pattern for reference placeholders: {{ref:path.to.key}}
const REF_PATTERN = /\{\{ref:([a-zA-Z0-9_.]+)\}\}/g;

// Pattern for variable placeholders: {variableName}
const VAR_PATTERN = /\{(\w+)\}/g;

// Pattern for plural/conditional: {{plural:count|one|many}}
const PLURAL_PATTERN = /\{\{plural:(\w+)\|([^|]+)\|([^}]+)\}\}/g;

/**
 * LRU Cache implementation for resolved strings
 */
class InterpolationCache {
  private cache: Map<string, string>;
  private readonly maxSize: number;

  constructor(maxSize: number = 1000) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  /**
   * Generates a cache key from template and context
   */
  private generateKey(template: string, context: Record<string, unknown>): string {
    // Use a hash of context values for the key
    const contextHash = Object.entries(context)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}:${String(v)}`)
      .join('|');
    return `${template}::${contextHash}`;
  }

  get(template: string, context: Record<string, unknown>): string | undefined {
    const key = this.generateKey(template, context);
    const value = this.cache.get(key);
    
    if (value !== undefined) {
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    
    return value;
  }

  set(template: string, context: Record<string, unknown>, value: string): void {
    const key = this.generateKey(template, context);
    
    // Remove oldest entries if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }
    
    this.cache.set(key, value);
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }
}

// Global cache instance
const globalCache = new InterpolationCache(2000);

/**
 * Pre-compiled regex patterns cache for performance
 */
const compiledPatterns = new Map<string, RegExp>();

function getCompiledPattern(pattern: string): RegExp {
  let compiled = compiledPatterns.get(pattern);
  if (!compiled) {
    compiled = new RegExp(pattern, 'g');
    compiledPatterns.set(pattern, compiled);
  }
  // Reset lastIndex for global patterns
  compiled.lastIndex = 0;
  return compiled;
}

/**
 * Resolves {{ref:path.to.key}} references in a template
 * 
 * @param template - String containing reference placeholders
 * @param translations - Full translations object to look up references
 * @returns String with references resolved
 */
export function resolveReferences(
  template: string,
  translations: Record<string, unknown>
): string {
  if (!template.includes('{{ref:')) {
    return template;
  }

  return template.replace(REF_PATTERN, (match, path: string) => {
    const value = getNestedValue(translations, path);
    if (value === undefined || value === null) {
      console.warn(`[i18n] Reference not found: ${path}`);
      return `[${path}]`;
    }
    if (typeof value !== 'string') {
      console.warn(`[i18n] Reference is not a string: ${path}`);
      return `[${path}]`;
    }
    return value;
  });
}

/**
 * Resolves {variable} placeholders in a template
 * 
 * @param template - String containing variable placeholders
 * @param context - Object with variable values
 * @returns String with variables resolved
 */
export function resolveVariables(
  template: string,
  context: Record<string, unknown>
): string {
  if (!template.includes('{')) {
    return template;
  }

  return template.replace(VAR_PATTERN, (match, key: string) => {
    const value = context[key];
    if (value === undefined || value === null) {
      // Keep original placeholder if value not provided
      return match;
    }
    return String(value);
  });
}

/**
 * Resolves {{plural:count|singular|plural}} patterns
 * 
 * @param template - String containing plural placeholders
 * @param context - Object with count values
 * @returns String with plurals resolved
 */
export function resolvePlurals(
  template: string,
  context: Record<string, unknown>
): string {
  if (!template.includes('{{plural:')) {
    return template;
  }

  return template.replace(PLURAL_PATTERN, (match, countKey, singular, plural) => {
    const count = context[countKey];
    if (typeof count !== 'number') {
      return singular;
    }
    return count === 1 ? singular : plural;
  });
}

/**
 * Full interpolation with all resolution steps and caching
 * 
 * @param template - Template string with placeholders
 * @param context - Variables to interpolate
 * @param translations - Full translations for reference resolution
 * @param useCache - Whether to use caching (default: true)
 * @returns Fully resolved string
 */
export function interpolate(
  template: string,
  context: Record<string, unknown> = {},
  translations: Record<string, unknown> = {},
  useCache: boolean = true
): string {
  if (!template || typeof template !== 'string') {
    return template ?? '';
  }

  // Check cache first
  if (useCache) {
    const cached = globalCache.get(template, context);
    if (cached !== undefined) {
      return cached;
    }
  }

  let result = template;

  // Step 1: Resolve references ({{ref:...}})
  result = resolveReferences(result, translations);

  // Step 2: Resolve plurals ({{plural:...}})
  result = resolvePlurals(result, context);

  // Step 3: Resolve variables ({name}, {team}, etc.)
  result = resolveVariables(result, context);

  // Cache the result
  if (useCache) {
    globalCache.set(template, context, result);
  }

  return result;
}

/**
 * Batch interpolation for multiple templates
 * More efficient than calling interpolate() multiple times
 */
export function interpolateBatch(
  templates: string[],
  context: Record<string, unknown>,
  translations: Record<string, unknown>
): string[] {
  return templates.map(t => interpolate(t, context, translations));
}

/**
 * Creates a bound interpolator with pre-loaded translations
 * Useful for components that need to interpolate many strings
 */
export function createInterpolator(translations: Record<string, unknown>) {
  return (template: string, context: Record<string, unknown> = {}): string => {
    return interpolate(template, context, translations);
  };
}

/**
 * Clear the interpolation cache
 * Call this when translations are updated
 */
export function clearInterpolationCache(): void {
  globalCache.clear();
}

/**
 * Get cache statistics for debugging
 */
export function getCacheStats(): { size: number; maxSize: number } {
  return {
    size: globalCache.size,
    maxSize: 2000
  };
}

export default interpolate;
