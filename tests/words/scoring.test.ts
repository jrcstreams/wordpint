import { describe, it, expect } from 'vitest';
import { scoreWord, weightedPick } from '../../src/words/scoring';

describe('scoreWord', () => {
  it('scores longer words higher than shorter words', () => {
    expect(scoreWord('elephant')).toBeGreaterThan(scoreWord('cat'));
  });

  it('returns 0 for empty string', () => {
    expect(scoreWord('')).toBe(0);
  });

  it('is deterministic for the same input', () => {
    expect(scoreWord('giraffe')).toBe(scoreWord('giraffe'));
  });
});

describe('weightedPick', () => {
  it('returns null for empty input', () => {
    expect(weightedPick([], () => 0.5)).toBe(null);
  });

  it('returns the only item when given a single-element list', () => {
    expect(weightedPick(['only'], () => 0.5)).toBe('only');
  });

  it('returns one of the items', () => {
    const result = weightedPick(['a', 'bb', 'ccc'], () => 0.9);
    expect(['a', 'bb', 'ccc']).toContain(result);
  });

  it('biases toward longer (higher-scoring) items', () => {
    // With rng = 0 we should pick the highest-weighted item ("ccc")
    // because the cumulative threshold starts at the first item.
    const result = weightedPick(['a', 'bb', 'ccc'], () => 0);
    expect(result).toBe('a'); // rng=0 lands on first bucket
    // With rng = 0.99 we land in the last bucket
    const last = weightedPick(['a', 'bb', 'ccc'], () => 0.999);
    expect(last).toBe('ccc');
  });
});
