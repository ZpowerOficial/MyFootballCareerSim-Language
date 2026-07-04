import { describe, expect, it } from 'vitest';
import { parsePatchJson } from '../patchParser';

describe('parsePatchJson', () => {
  it('accepts old community patch JSONC quirks', () => {
    const patch = parsePatchJson(`\uFEFF{
      // old shared patches may include comments
      "metadata": { "version": "1.0.0", "name": "100% brazuca" },
      "universal": { "countries": { "Brazil": "Brasil" } },
    }`);

    expect(patch).toEqual({
      metadata: { version: '1.0.0', name: '100% brazuca' },
      universal: { countries: { Brazil: 'Brasil' } },
    });
  });

  it('accepts a legacy patch with one extra final brace', () => {
    const patch = parsePatchJson(`{
      "metadata": { "version": "1.0.0", "name": "100% brazuca" },
      "universal": { "countries": { "Brazil": "Brasil" } }
    }}`);

    expect(patch).toEqual({
      metadata: { version: '1.0.0', name: '100% brazuca' },
      universal: { countries: { Brazil: 'Brasil' } },
    });
  });

  it('still rejects invalid JSON', () => {
    expect(() => parsePatchJson('{ "metadata": ')).toThrow(SyntaxError);
  });
});
