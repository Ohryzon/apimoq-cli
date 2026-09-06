import { describe, expect, it } from 'vitest';
import { generateRecord, resolveSchema, setGenerationSeed, validateBody } from './schema.js';

describe('schema engine', () => {
  it('resolves nested objects, arrays, enums, literals, and mocks', () => {
    const value = resolveSchema({ name: 'name', role: ['admin', 'user'], fixed: 'KES', tags: { type: 'array', items: 'string', count: 2 }, mock: { type: 'string', mock: 'Jane' } }) as any;
    expect(value.fixed).toBe('KES'); expect(value.mock).toBe('Jane'); expect(value.tags).toHaveLength(2); expect(['admin', 'user']).toContain(value.role);
  });
  it('produces repeatable seeded data', () => { setGenerationSeed(7); const first = generateRecord({ id: 'uuid', name: 'name' }); setGenerationSeed(7); expect(generateRecord({ id: 'uuid', name: 'name' })).toEqual(first); });
  it('rejects unknown fields and supports partial updates', () => {
    expect(validateBody({ name: 'string' }, { name: 'A', extra: true }).success).toBe(false);
    expect(validateBody({ name: 'string', count: 'integer' }, { name: 'A' }, true).success).toBe(true);
  });
});
