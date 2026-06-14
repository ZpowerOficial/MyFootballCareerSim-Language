/**
 * Deep Merge Utility for Localization System
 * 
 * Recursively merges objects, preserving nested structures.
 * Later sources override earlier ones at the leaf level only.
 */

type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Checks if a value is a plain object (not array, null, Date, etc.)
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.prototype.toString.call(value) === '[object Object]'
  );
}

/**
 * Deep merges multiple objects recursively.
 * 
 * Rules:
 * - Objects are merged recursively
 * - Arrays are replaced entirely (not merged)
 * - Primitives are overwritten by later sources
 * - undefined values in sources do not overwrite existing values
 * 
 * @param target - The base object to merge into
 * @param sources - Objects to merge (later ones take precedence)
 * @returns A new merged object
 */
export function deepMerge<T extends Record<string, unknown>>(
  target: T,
  ...sources: DeepPartial<T>[]
): T {
  if (!sources.length) {
    return target;
  }

  const result: Record<string, unknown> = { ...target };

  for (const source of sources) {
    if (!isPlainObject(source)) {
      continue;
    }

    for (const key of Object.keys(source)) {
      const sourceValue = source[key];
      const targetValue = result[key];

      // Skip undefined values - they don't overwrite
      if (sourceValue === undefined) {
        continue;
      }

      // If both are plain objects, merge recursively
      if (isPlainObject(targetValue) && isPlainObject(sourceValue)) {
        result[key] = deepMerge(
          targetValue as Record<string, unknown>,
          sourceValue as Record<string, unknown>
        );
      } else {
        // Otherwise, replace the value
        result[key] = sourceValue;
      }
    }
  }

  return result as T;
}

/**
 * Deep merges with immutability guarantee.
 * Creates a completely new object tree.
 */
export function deepMergeImmutable<T extends Record<string, unknown>>(
  ...sources: DeepPartial<T>[]
): T {
  return deepMerge({} as T, ...sources);
}

/**
 * Gets a nested value from an object using dot notation.
 * 
 * @param obj - The object to traverse
 * @param path - Dot-separated path (e.g., "competition.championsLeague")
 * @returns The value at the path, or undefined if not found
 */
export function getNestedValue(
  obj: Record<string, unknown>,
  path: string
): unknown {
  const keys = path.split('.');
  let current: unknown = obj;

  for (const key of keys) {
    if (current === null || current === undefined) {
      return undefined;
    }
    if (typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }

  return current;
}

/**
 * Sets a nested value in an object using dot notation.
 * Creates intermediate objects as needed.
 * Returns a new object (immutable).
 */
export function setNestedValue<T extends Record<string, unknown>>(
  obj: T,
  path: string,
  value: unknown
): T {
  const keys = path.split('.');
  const result = { ...obj } as Record<string, unknown>;
  let current = result;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!isPlainObject(current[key])) {
      current[key] = {};
    } else {
      current[key] = { ...(current[key] as Record<string, unknown>) };
    }
    current = current[key] as Record<string, unknown>;
  }

  current[keys[keys.length - 1]] = value;
  return result as T;
}

export default deepMerge;
