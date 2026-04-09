import { describe, it, expect } from 'vitest';
import { findWords } from '../../src/words/findWords';
import type { WordIndex } from '../../src/words/types';

const fixture: WordIndex = {
  definitions: {
    cat: 'a small domesticated feline',
    act: 'a thing done',
    tact: 'sensitivity in dealing with others',
    bee: 'a flying insect',
    be: 'to exist',
    zzz: 'sleep noise',
  },
  bySignature: {
    act: ['cat', 'act'],
    actt: ['tact'],
    bee: ['bee'],
    be: ['be'],
    zzz: ['zzz'],
  },
};

describe('findWords', () => {
  it('returns words that are an exact letter match', () => {
    const result = findWords(['c', 'a', 't'], fixture);
    const words = result.map((r) => r.word).sort();
    expect(words).toEqual(['act', 'cat']);
  });

  it('returns words that are a strict subset of the input letters', () => {
    const result = findWords(['c', 'a', 't', 's'], fixture);
    expect(result.map((r) => r.word).sort()).toEqual(['act', 'cat']);
  });

  it('handles repeated letters via multiset matching', () => {
    const result = findWords(['t', 'a', 'c', 't'], fixture);
    const words = result.map((r) => r.word).sort();
    expect(words).toContain('tact');
    expect(words).toContain('cat');
    expect(words).toContain('act');
  });

  it('does not return words requiring more of a letter than provided', () => {
    // 'bee' needs two e's; we only give one
    const result = findWords(['b', 'e'], fixture);
    expect(result.map((r) => r.word)).toEqual(['be']);
  });

  it('respects minLength', () => {
    const result = findWords(['b', 'e', 'e'], fixture, { minLength: 3 });
    expect(result.map((r) => r.word)).toEqual(['bee']);
  });

  it('returns empty array when no words can be formed', () => {
    const result = findWords(['x'], fixture);
    expect(result).toEqual([]);
  });

  it('includes the definition for each word', () => {
    const result = findWords(['c', 'a', 't'], fixture);
    const cat = result.find((r) => r.word === 'cat');
    expect(cat?.definition).toBe('a small domesticated feline');
  });
});
