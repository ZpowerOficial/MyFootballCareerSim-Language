/**
 * Layered Translation Loader
 * 
 * Implements a priority-based loading system:
 * 1. Local Patch (highest priority) - Community modifications
 * 2. Remote (GitHub CDN) - Official updates
 * 3. Local Bundle (fallback) - Always available
 * 
 * Supports Universal Patches with language-specific overrides.
 */

import { deepMerge } from './deepMerge';
import { validatePatch, ValidationResult, UniversalPatch } from './schema';
import { sanitizePatch, filterProtectedNamespaces } from './sanitize';
import { clearInterpolationCache } from './interpolate';

/**
 * Storage interface for cross-platform compatibility
 * Implement this for your platform (AsyncStorage, localStorage, etc.)
 */
export interface StorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

/**
 * Fetch interface for cross-platform compatibility
 */
export interface FetchAdapter {
  fetch(url: string, options?: RequestInit): Promise<Response>;
}

/**
 * Configuration for the loader
 */
export interface LoaderConfig {
  /** Current language code (e.g., 'en', 'pt', 'es') */
  language: string;
  
  /** Base URL for remote translations */
  remoteBaseUrl?: string;
  
  /** Cache duration in milliseconds (default: 24 hours) */
  cacheDuration?: number;
  
  /** Storage adapter for patches and cache */
  storage?: StorageAdapter;
  
  /** Fetch adapter for remote requests */
  fetcher?: FetchAdapter;
  
  /** Enable verbose logging */
  debug?: boolean;
}

/**
 * Translation source metadata
 */
export interface TranslationSource {
  source: 'bundle' | 'remote' | 'patch';
  priority: number;
  timestamp?: number;
  version?: string;
}

/**
 * Loaded translations with metadata
 */
export interface LoadedTranslations {
  data: Record<string, unknown>;
  sources: TranslationSource[];
  language: string;
  loadedAt: number;
}

// Storage keys
const STORAGE_KEYS = {
  REMOTE_CACHE: (lang: string) => `@mfcs_remote_${lang}`,
  REMOTE_TIMESTAMP: (lang: string) => `@mfcs_remote_ts_${lang}`,
  LOCAL_PATCH: (lang: string) => `@mfcs_patch_${lang}`,
  UNIVERSAL_PATCH: '@mfcs_universal_patch',
};

// Base language for fallback
const BASE_LANGUAGE = 'en';

// Default configuration
const DEFAULT_CONFIG: Partial<LoaderConfig> = {
  cacheDuration: 24 * 60 * 60 * 1000, // 24 hours
  debug: false,
};

/**
 * Logger helper
 */
function createLogger(debug: boolean) {
  return {
    log: (...args: unknown[]) => debug && console.log('[i18n]', ...args),
    warn: (...args: unknown[]) => console.warn('[i18n]', ...args),
    error: (...args: unknown[]) => console.error('[i18n]', ...args),
  };
}

/**
 * Default in-memory storage (fallback when no adapter provided)
 */
class MemoryStorage implements StorageAdapter {
  private store = new Map<string, string>();
  
  async getItem(key: string): Promise<string | null> {
    return this.store.get(key) ?? null;
  }
  
  async setItem(key: string, value: string): Promise<void> {
    this.store.set(key, value);
  }
  
  async removeItem(key: string): Promise<void> {
    this.store.delete(key);
  }
}

/**
 * Translation Loader Class
 */
export class TranslationLoader {
  private config: LoaderConfig & typeof DEFAULT_CONFIG;
  private storage: StorageAdapter;
  private logger: ReturnType<typeof createLogger>;
  private bundleTranslations: Map<string, Record<string, unknown>> = new Map();
  private lastLoadedData: Record<string, unknown> = {};
  
  constructor(config: LoaderConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.storage = config.storage ?? new MemoryStorage();
    this.logger = createLogger(this.config.debug ?? false);
  }
  
  /**
   * Register bundle translations for a language
   * Call this during app initialization with your local JSON imports
   */
  registerBundle(language: string, translations: Record<string, unknown>): void {
    this.bundleTranslations.set(language, translations);
    this.logger.log(`Registered bundle for: ${language}`);
  }
  
  /**
   * Load translations with full layer resolution
   */
  async loadTranslations(): Promise<LoadedTranslations> {
    const { language } = this.config;
    const sources: TranslationSource[] = [];
    const layers: Record<string, unknown>[] = [];
    
    // Layer 4: English Bundle (base, always present)
    const baseBundle = this.bundleTranslations.get(BASE_LANGUAGE);
    if (baseBundle) {
      layers.push(baseBundle);
      sources.push({ source: 'bundle', priority: 0, version: 'base-en' });
      this.logger.log('Loaded base English translations');
    } else if (language !== BASE_LANGUAGE) {
      this.logger.warn(`Base language (${BASE_LANGUAGE}) bundle not registered`);
    }
    
    // Layer 3: Target Language Bundle (if not English)
    if (language !== BASE_LANGUAGE) {
      const targetBundle = this.bundleTranslations.get(language);
      if (targetBundle) {
        layers.push(targetBundle);
        sources.push({ source: 'bundle', priority: 1 });
        this.logger.log(`Loaded ${language} bundle translations`);
      } else {
        this.logger.warn(`No bundle registered for language: ${language}`);
      }
    }
    
    // Layer 2: Remote translations (if configured)
    if (this.config.remoteBaseUrl) {
      try {
        const remoteData = await this.loadRemoteTranslations();
        if (remoteData) {
          layers.push(remoteData);
          sources.push({ source: 'remote', priority: 2, timestamp: Date.now() });
          this.logger.log('Loaded remote translations');
        }
      } catch (error) {
        this.logger.warn('Failed to load remote translations:', error);
        // Try to use cached remote data
        const cachedRemote = await this.getCachedRemote();
        if (cachedRemote) {
          layers.push(cachedRemote);
          sources.push({ source: 'remote', priority: 2, timestamp: Date.now() });
          this.logger.log('Using cached remote translations');
        }
      }
    }
    
    // Layer 1: Local patches (highest priority)
    try {
      const patchData = await this.loadLocalPatches();
      if (patchData) {
        layers.push(patchData);
        sources.push({ source: 'patch', priority: 3, timestamp: Date.now() });
        this.logger.log('Loaded local patches');
      }
    } catch (error) {
      this.logger.warn('Failed to load local patches:', error);
    }
    
    // Merge all layers
    const mergedData = layers.reduce(
      (acc, layer) => deepMerge(acc, layer as Record<string, unknown>),
      {} as Record<string, unknown>
    );
    
    this.lastLoadedData = mergedData;
    
    // Clear interpolation cache when translations change
    clearInterpolationCache();
    
    return {
      data: mergedData,
      sources,
      language,
      loadedAt: Date.now(),
    };
  }
  
  /**
   * Load remote translations with caching
   */
  private async loadRemoteTranslations(): Promise<Record<string, unknown> | null> {
    const { language, remoteBaseUrl, cacheDuration } = this.config;
    
    if (!remoteBaseUrl) {
      return null;
    }
    
    // Check cache freshness
    const cachedTimestamp = await this.storage.getItem(
      STORAGE_KEYS.REMOTE_TIMESTAMP(language)
    );
    
    if (cachedTimestamp) {
      const age = Date.now() - parseInt(cachedTimestamp, 10);
      if (age < (cacheDuration ?? DEFAULT_CONFIG.cacheDuration!)) {
        this.logger.log('Using cached remote translations (still fresh)');
        return this.getCachedRemote();
      }
    }
    
    // Fetch fresh data
    const url = `${remoteBaseUrl}/${language}/content.json`;
    this.logger.log(`Fetching remote translations: ${url}`);
    
    const fetcher = this.config.fetcher ?? { fetch: globalThis.fetch };
    const response = await fetcher.fetch(url, {
      headers: { 'Accept': 'application/json' },
      cache: 'no-cache',
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Sanitize and cache
    const sanitized = sanitizePatch(data);
    if (sanitized) {
      const filtered = filterProtectedNamespaces(sanitized);
      await this.storage.setItem(
        STORAGE_KEYS.REMOTE_CACHE(language),
        JSON.stringify(filtered)
      );
      await this.storage.setItem(
        STORAGE_KEYS.REMOTE_TIMESTAMP(language),
        Date.now().toString()
      );
      return filtered;
    }
    
    return null;
  }
  
  /**
   * Get cached remote translations
   */
  private async getCachedRemote(): Promise<Record<string, unknown> | null> {
    const { language } = this.config;
    const cached = await this.storage.getItem(STORAGE_KEYS.REMOTE_CACHE(language));
    
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        return null;
      }
    }
    
    return null;
  }
  
  /**
   * Load local patches (universal + language-specific)
   */
  private async loadLocalPatches(): Promise<Record<string, unknown> | null> {
    const { language } = this.config;
    const patches: Record<string, unknown>[] = [];
    
    // Load universal patch
    const universalPatchJson = await this.storage.getItem(
      STORAGE_KEYS.UNIVERSAL_PATCH
    );
    
    if (universalPatchJson) {
      try {
        const parsed = JSON.parse(universalPatchJson) as UniversalPatch;
        
        // Validate patch structure
        const validation = validatePatch(parsed);
        if (!validation.valid) {
          this.logger.warn('Universal patch validation failed:', validation.errors);
        } else {
          // 1. Apply universal section first (to all languages)
          if (parsed.universal) {
            const sanitized = sanitizePatch(parsed.universal);
            if (sanitized) {
              patches.push(filterProtectedNamespaces(sanitized));
            }
          }
          
          // 2. Apply languages[currentLanguage] on top (language-specific overrides)
          if (parsed.languages?.[language]) {
            const sanitized = sanitizePatch(parsed.languages[language]);
            if (sanitized) {
              patches.push(filterProtectedNamespaces(sanitized as Record<string, unknown>));
            }
          }
        }
      } catch (error) {
        this.logger.warn('Failed to parse universal patch:', error);
      }
    }
    
    // Load standalone language-specific patch
    const langPatchJson = await this.storage.getItem(
      STORAGE_KEYS.LOCAL_PATCH(language)
    );
    
    if (langPatchJson) {
      try {
        const parsed = JSON.parse(langPatchJson);
        const sanitized = sanitizePatch(parsed);
        if (sanitized) {
          patches.push(filterProtectedNamespaces(sanitized));
        }
      } catch (error) {
        this.logger.warn('Failed to parse language patch:', error);
      }
    }
    
    // Merge all patches
    if (patches.length === 0) {
      return null;
    }
    
    return patches.reduce(
      (acc, patch) => deepMerge(acc, patch),
      {} as Record<string, unknown>
    );
  }
  
  /**
   * Apply a universal patch
   */
  async applyUniversalPatch(patch: UniversalPatch): Promise<ValidationResult> {
    const validation = validatePatch(patch);
    
    if (!validation.valid) {
      return validation;
    }
    
    await this.storage.setItem(
      STORAGE_KEYS.UNIVERSAL_PATCH,
      JSON.stringify(patch)
    );
    
    this.logger.log('Universal patch applied successfully');
    return validation;
  }
  
  /**
   * Apply a language-specific patch
   */
  async applyLanguagePatch(
    language: string,
    patch: Record<string, unknown>
  ): Promise<ValidationResult> {
    const wrappedPatch = {
      metadata: {
        version: '1.0.0',
        name: `${language} patch`,
      },
      languages: {
        [language]: patch,
      },
    };
    
    const validation = validatePatch(wrappedPatch);
    
    if (!validation.valid) {
      return validation;
    }
    
    const sanitized = sanitizePatch(patch);
    if (!sanitized) {
      return {
        valid: false,
        errors: [{ path: '', message: 'Sanitization failed', code: 'SANITIZE_FAILED' }],
        warnings: [],
      };
    }
    
    await this.storage.setItem(
      STORAGE_KEYS.LOCAL_PATCH(language),
      JSON.stringify(filterProtectedNamespaces(sanitized))
    );
    
    this.logger.log(`Language patch applied for: ${language}`);
    return validation;
  }
  
  /**
   * Remove all patches
   */
  async clearPatches(): Promise<void> {
    const { language } = this.config;
    
    await this.storage.removeItem(STORAGE_KEYS.UNIVERSAL_PATCH);
    await this.storage.removeItem(STORAGE_KEYS.LOCAL_PATCH(language));
    
    clearInterpolationCache();
    this.logger.log('All patches cleared');
  }
  
  /**
   * Clear remote cache
   */
  async clearRemoteCache(): Promise<void> {
    const { language } = this.config;
    
    await this.storage.removeItem(STORAGE_KEYS.REMOTE_CACHE(language));
    await this.storage.removeItem(STORAGE_KEYS.REMOTE_TIMESTAMP(language));
    
    this.logger.log('Remote cache cleared');
  }
  
  /**
   * Change the active language
   */
  setLanguage(language: string): void {
    this.config.language = language;
    this.logger.log(`Language changed to: ${language}`);
  }
  
  /**
   * Get current language
   */
  getLanguage(): string {
    return this.config.language;
  }

  /**
   * Get list of all registered language codes
   */
  getRegisteredLanguages(): string[] {
    return Array.from(this.bundleTranslations.keys());
  }

  /**
   * Check if a translation key exists
   */
  hasTranslation(key: string): boolean {
    if (!key) return false;
    const keys = key.split('.');
    let current: any = this.lastLoadedData;
    
    for (const k of keys) {
      if (current !== null && typeof current === 'object' && k in current) {
        current = current[k];
      } else {
        return false;
      }
    }
    return current !== undefined;
  }

  /**
   * Get loaded patch info for debugging
   */
  async getPatchInfo(): Promise<{ universal: boolean; languageSpecific: boolean; }> {
    const { language } = this.config;
    const universalPatchJson = await this.storage.getItem(STORAGE_KEYS.UNIVERSAL_PATCH);
    const langPatchJson = await this.storage.getItem(STORAGE_KEYS.LOCAL_PATCH(language));
    
    let hasUniversal = false;
    let hasLanguageSpecific = !!langPatchJson;
    
    if (universalPatchJson) {
      try {
        const parsed = JSON.parse(universalPatchJson) as UniversalPatch;
        hasUniversal = !!parsed.universal;
        if (parsed.languages?.[language]) {
          hasLanguageSpecific = true;
        }
      } catch {
        // Ignore
      }
    }
    
    return {
      universal: hasUniversal,
      languageSpecific: hasLanguageSpecific
    };
  }
}

/**
 * Create a singleton loader instance
 */
let loaderInstance: TranslationLoader | null = null;

export function initializeLoader(config: LoaderConfig): TranslationLoader {
  loaderInstance = new TranslationLoader(config);
  return loaderInstance;
}

export function getLoader(): TranslationLoader {
  if (!loaderInstance) {
    throw new Error('Translation loader not initialized. Call initializeLoader() first.');
  }
  return loaderInstance;
}

export default TranslationLoader;
