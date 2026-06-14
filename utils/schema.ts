/**
 * Validation Schema for Localization Patches
 * 
 * Uses Zod for runtime validation of community patches.
 * Ensures patches conform to expected structure and types.
 */

// Note: In production, install zod: npm install zod
// For now, we implement a lightweight validation system

/**
 * Validation error details
 */
export interface ValidationError {
  path: string;
  message: string;
  code: string;
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: string[];
}

/**
 * Patch metadata schema
 */
export interface PatchMetadata {
  version: string;
  name: string;
  author?: string;
  description?: string;
  compatibleGameVersion?: string;
  language?: string;
}

/**
 * Universal patch structure
 */
export interface UniversalPatch {
  metadata: PatchMetadata;
  universal?: Record<string, unknown>;  // Applies to all languages
  languages?: Record<string, Record<string, unknown>>;  // Language-specific
}

/**
 * Allowed patcheable namespaces
 */
const PATCHABLE_NAMESPACES = [
  'leagues',
  'cups',
  'competitionNames',
  'competition',
  'trophy',
  'trophies',
  'trophiesSection',
  'award',
  'awardsSection',
  'awardGroups',
  'countries',
  'nationality',
  'continents',
  'tier',
  'careerTiers'
];

/**
 * Version format regex (semver-like)
 */
const VERSION_REGEX = /^\d+\.\d+\.\d+(-[\w.]+)?$/;

/**
 * Validates the metadata section of a patch
 */
function validateMetadata(
  metadata: unknown,
  errors: ValidationError[],
  warnings: string[]
): boolean {
  if (!metadata || typeof metadata !== 'object') {
    errors.push({
      path: 'metadata',
      message: 'Metadata is required and must be an object',
      code: 'MISSING_METADATA'
    });
    return false;
  }

  const meta = metadata as Record<string, unknown>;

  // Validate version
  if (typeof meta.version !== 'string') {
    errors.push({
      path: 'metadata.version',
      message: 'Version is required and must be a string',
      code: 'INVALID_VERSION'
    });
  } else if (!VERSION_REGEX.test(meta.version)) {
    errors.push({
      path: 'metadata.version',
      message: 'Version must follow semver format (e.g., 1.0.0)',
      code: 'INVALID_VERSION_FORMAT'
    });
  }

  // Validate name
  if (typeof meta.name !== 'string' || meta.name.length === 0) {
    errors.push({
      path: 'metadata.name',
      message: 'Name is required and must be a non-empty string',
      code: 'INVALID_NAME'
    });
  } else if (meta.name.length > 100) {
    errors.push({
      path: 'metadata.name',
      message: 'Name must be 100 characters or less',
      code: 'NAME_TOO_LONG'
    });
  }

  // Validate optional fields
  if (meta.author !== undefined && typeof meta.author !== 'string') {
    warnings.push('Author should be a string');
  }

  if (meta.description !== undefined) {
    if (typeof meta.description !== 'string') {
      warnings.push('Description should be a string');
    } else if (meta.description.length > 500) {
      warnings.push('Description is very long, consider shortening');
    }
  }

  return errors.filter(e => e.path.startsWith('metadata')).length === 0;
}

/**
 * Validates a content section (universal or language-specific)
 */
function validateContentSection(
  content: unknown,
  path: string,
  errors: ValidationError[],
  warnings: string[]
): void {
  if (!content || typeof content !== 'object') {
    return;
  }

  const contentObj = content as Record<string, unknown>;

  for (const [namespace, values] of Object.entries(contentObj)) {
    const namespacePath = `${path}.${namespace}`;

    // Check if namespace is patchable
    if (!PATCHABLE_NAMESPACES.includes(namespace)) {
      errors.push({
        path: namespacePath,
        message: `Namespace '${namespace}' is not patchable. Allowed: ${PATCHABLE_NAMESPACES.join(', ')}`,
        code: 'PROTECTED_NAMESPACE'
      });
      continue;
    }

    // Validate namespace values
    if (!values || typeof values !== 'object') {
      errors.push({
        path: namespacePath,
        message: 'Namespace value must be an object',
        code: 'INVALID_NAMESPACE_VALUE'
      });
      continue;
    }

    // Validate individual keys
    validateNamespaceContent(values as Record<string, unknown>, namespacePath, errors, warnings);
  }
}

/**
 * Validates the content of a namespace
 */
function validateNamespaceContent(
  content: Record<string, unknown>,
  basePath: string,
  errors: ValidationError[],
  warnings: string[]
): void {
  for (const [key, value] of Object.entries(content)) {
    const keyPath = `${basePath}.${key}`;

    if (typeof value === 'string') {
      // Validate string value
      if (value.length === 0) {
        warnings.push(`Empty string at ${keyPath}`);
      } else if (value.length > 2000) {
        errors.push({
          path: keyPath,
          message: 'String value exceeds maximum length of 2000 characters',
          code: 'STRING_TOO_LONG'
        });
      }
    } else if (typeof value === 'object' && value !== null) {
      // Recursively validate nested objects
      validateNamespaceContent(value as Record<string, unknown>, keyPath, errors, warnings);
    } else if (value !== null && value !== undefined) {
      // Other types are not allowed
      errors.push({
        path: keyPath,
        message: `Invalid value type: ${typeof value}. Only strings and objects are allowed`,
        code: 'INVALID_VALUE_TYPE'
      });
    }
  }
}

/**
 * Validates a complete patch object
 */
export function validatePatch(patch: unknown): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: string[] = [];

  // Basic type check
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
    return {
      valid: false,
      errors: [{
        path: '',
        message: 'Patch must be a non-null object',
        code: 'INVALID_PATCH_TYPE'
      }],
      warnings: []
    };
  }

  const patchObj = patch as Record<string, unknown>;

  // Validate metadata
  validateMetadata(patchObj.metadata, errors, warnings);

  // Validate universal section
  if (patchObj.universal !== undefined) {
    if (typeof patchObj.universal !== 'object' || patchObj.universal === null) {
      errors.push({
        path: 'universal',
        message: 'Universal section must be an object',
        code: 'INVALID_UNIVERSAL'
      });
    } else {
      validateContentSection(patchObj.universal, 'universal', errors, warnings);
    }
  }

  // Validate languages section
  if (patchObj.languages !== undefined) {
    if (typeof patchObj.languages !== 'object' || patchObj.languages === null) {
      errors.push({
        path: 'languages',
        message: 'Languages section must be an object',
        code: 'INVALID_LANGUAGES'
      });
    } else {
      for (const [lang, content] of Object.entries(patchObj.languages as Record<string, unknown>)) {
        validateContentSection(content, `languages.${lang}`, errors, warnings);
      }
    }
  }

  // Must have at least one content section
  if (patchObj.universal === undefined && patchObj.languages === undefined) {
    errors.push({
      path: '',
      message: 'Patch must have at least one of: universal, languages',
      code: 'NO_CONTENT'
    });
  }

  // Size check
  const jsonSize = JSON.stringify(patch).length;
  if (jsonSize > 5 * 1024 * 1024) { // 5MB
    errors.push({
      path: '',
      message: 'Patch exceeds maximum size of 5MB',
      code: 'PATCH_TOO_LARGE'
    });
  } else if (jsonSize > 1024 * 1024) { // 1MB
    warnings.push('Patch is larger than 1MB, consider splitting into smaller patches');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Gets a list of all patchable namespaces
 */
export function getPatchableNamespaces(): string[] {
  return [...PATCHABLE_NAMESPACES];
}

/**
 * Creates an empty valid patch template
 */
export function createPatchTemplate(name: string, author?: string): UniversalPatch {
  return {
    metadata: {
      version: '1.0.0',
      name,
      author,
      description: 'Community content patch'
    },
    universal: {},
    languages: {}
  };
}

export default validatePatch;
