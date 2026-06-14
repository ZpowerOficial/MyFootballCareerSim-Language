/**
 * Sanitization Utilities for External Patches
 * 
 * Provides security measures to prevent XSS, injection attacks,
 * and malformed data from community-contributed patches.
 */

/**
 * HTML entities that should be escaped
 */
const HTML_ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;'
};

/**
 * Patterns that indicate potential malicious content
 */
const DANGEROUS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /javascript:/gi,
  /vbscript:/gi,
  /on\w+\s*=/gi,  // onclick=, onerror=, etc.
  /data:\s*text\/html/gi,
  /expression\s*\(/gi,  // CSS expression()
  /<iframe/gi,
  /<object/gi,
  /<embed/gi,
  /<link/gi,
  /<meta/gi,
  /<style/gi,
  /url\s*\(\s*['"]?\s*javascript:/gi,
  /<!--[\s\S]*?-->/g,  // HTML comments
];

/**
 * Maximum allowed string length for any translation value
 */
const MAX_STRING_LENGTH = 2000;

/**
 * Maximum allowed depth for nested objects
 */
const MAX_NESTING_DEPTH = 10;

/**
 * Escapes HTML entities in a string
 */
export function escapeHtml(str: string): string {
  return str.replace(/[&<>"'`=/]/g, (char) => HTML_ESCAPE_MAP[char] || char);
}

/**
 * Removes all HTML tags from a string
 */
export function stripHtmlTags(str: string): string {
  return str.replace(/<[^>]*>/g, '');
}

/**
 * Removes dangerous patterns from a string
 */
export function removeDangerousPatterns(str: string): string {
  let result = str;
  for (const pattern of DANGEROUS_PATTERNS) {
    result = result.replace(pattern, '');
  }
  return result;
}

/**
 * Sanitizes a single string value
 * 
 * @param value - The string to sanitize
 * @param options - Sanitization options
 * @returns Sanitized string
 */
export function sanitizeString(
  value: string,
  options: {
    stripHtml?: boolean;
    escapeHtml?: boolean;
    maxLength?: number;
    removeControlChars?: boolean;
  } = {}
): string {
  const {
    stripHtml: shouldStripHtml = true,
    escapeHtml: shouldEscapeHtml = false,
    maxLength = MAX_STRING_LENGTH,
    removeControlChars = true
  } = options;

  let result = value;

  // Remove dangerous patterns first
  result = removeDangerousPatterns(result);

  // Strip or escape HTML
  if (shouldStripHtml) {
    result = stripHtmlTags(result);
  } else if (shouldEscapeHtml) {
    result = escapeHtml(result);
  }

  // Remove control characters (except newlines and tabs)
  if (removeControlChars) {
    result = result.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  }

  // Trim whitespace
  result = result.trim();

  // Enforce max length
  if (result.length > maxLength) {
    result = result.substring(0, maxLength);
  }

  return result;
}

/**
 * Recursively sanitizes an object
 */
export function sanitizeObject(
  obj: unknown,
  depth: number = 0
): unknown {
  // Prevent infinite recursion
  if (depth > MAX_NESTING_DEPTH) {
    console.warn('[Sanitize] Maximum nesting depth exceeded');
    return null;
  }

  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }

  if (typeof obj === 'number' || typeof obj === 'boolean') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, depth + 1));
  }

  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    
    for (const [key, value] of Object.entries(obj)) {
      // Sanitize key names too
      const sanitizedKey = sanitizeString(key, { maxLength: 100 });
      
      // Skip keys that are empty after sanitization
      if (!sanitizedKey) {
        continue;
      }
      
      result[sanitizedKey] = sanitizeObject(value, depth + 1);
    }
    
    return result;
  }

  // Unknown types are converted to null
  return null;
}

/**
 * Validates that a value is a valid translation string
 */
export function isValidTranslationString(value: unknown): value is string {
  if (typeof value !== 'string') {
    return false;
  }
  
  if (value.length === 0 || value.length > MAX_STRING_LENGTH) {
    return false;
  }
  
  // Check for dangerous patterns
  for (const pattern of DANGEROUS_PATTERNS) {
    pattern.lastIndex = 0; // Reset regex state
    if (pattern.test(value)) {
      return false;
    }
  }
  
  return true;
}

/**
 * Validates and sanitizes a complete patch object
 * Returns null if the patch is fundamentally invalid
 */
export function sanitizePatch(
  patch: unknown
): Record<string, unknown> | null {
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
    console.error('[Sanitize] Patch must be a non-null object');
    return null;
  }

  try {
    const sanitized = sanitizeObject(patch) as Record<string, unknown>;
    
    if (!sanitized || Object.keys(sanitized).length === 0) {
      console.error('[Sanitize] Patch is empty after sanitization');
      return null;
    }
    
    return sanitized;
  } catch (error) {
    console.error('[Sanitize] Error sanitizing patch:', error);
    return null;
  }
}

/**
 * Checks if a namespace is protected (core functionality)
 */
export function isProtectedNamespace(namespace: string): boolean {
  const protectedNamespaces = [
    'system',
    'core',
    'attributes',
    'training',
    'setup',
    'positions',
    'common',
    'profile',
    'stats',
    'detailedStats',
    'careerStats'
  ];
  
  return protectedNamespaces.includes(namespace);
}

/**
 * Filters out protected namespaces from a patch
 */
export function filterProtectedNamespaces(
  patch: Record<string, unknown>
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(patch)) {
    if (!isProtectedNamespace(key)) {
      result[key] = value;
    } else {
      console.warn(`[Sanitize] Skipping protected namespace: ${key}`);
    }
  }
  
  return result;
}

export default sanitizePatch;
