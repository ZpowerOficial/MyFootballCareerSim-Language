import { parse, type ParseError } from 'jsonc-parser';

export function parsePatchJson(content: string): unknown {
  const normalized = content.replace(/^\uFEFF/, '');
  const parsed = parseJsonc(normalized);

  if (parsed.valid) {
    return parsed.value;
  }

  // Some old community patches were shared with one extra closing brace.
  const repaired = parseJsonc(normalized.replace(/\s*}\s*$/, ''));

  if (repaired.valid && repaired.value && typeof repaired.value === 'object' && !Array.isArray(repaired.value)) {
    return repaired.value;
  }

  throw new SyntaxError('Invalid JSON format');
}

function parseJsonc(content: string): { valid: true; value: unknown } | { valid: false } {
  const errors: ParseError[] = [];
  const value = parse(content, errors, {
    allowTrailingComma: true,
    disallowComments: false,
  });

  return errors.length === 0 ? { valid: true, value } : { valid: false };
}
