import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadWordIndex } from '../../src/words/loader';

describe('loadWordIndex', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches /wordnet.json and returns the parsed index', async () => {
    const fixture = {
      definitions: { cat: ['a feline'] },
      bySignature: { act: ['cat'] },
    };
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => fixture,
      }),
    );

    const result = await loadWordIndex();
    expect(result.definitions.cat).toEqual(['a feline']);
    expect(result.bySignature.act).toEqual(['cat']);
  });

  it('throws when the response is not ok', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 404 }),
    );
    await expect(loadWordIndex()).rejects.toThrow(/404/);
  });

  it('throws when the JSON is missing required fields', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ wrong: 'shape' }),
      }),
    );
    await expect(loadWordIndex()).rejects.toThrow(/malformed/i);
  });
});
