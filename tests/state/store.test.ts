import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '../../src/state/store';

describe('useAppStore', () => {
  beforeEach(() => {
    useAppStore.setState({
      lettersInGlass: new Map(),
      currentWord: null,
      history: [],
      dictionaryStatus: 'idle',
      wordIndex: null,
      showFullList: false,
    });
  });

  it('letterEnteredGlass adds a letter', () => {
    useAppStore.getState().letterEnteredGlass(1, 'a');
    expect(useAppStore.getState().lettersInGlass.get(1)).toBe('a');
    expect(useAppStore.getState().lettersInGlass.size).toBe(1);
  });

  it('letterLeftGlass removes a letter', () => {
    useAppStore.getState().letterEnteredGlass(1, 'a');
    useAppStore.getState().letterLeftGlass(1);
    expect(useAppStore.getState().lettersInGlass.size).toBe(0);
  });

  it('useWord removes the matching letter ids and appends to history', () => {
    const s = useAppStore.getState();
    s.letterEnteredGlass(1, 'c');
    s.letterEnteredGlass(2, 'a');
    s.letterEnteredGlass(3, 't');
    s.letterEnteredGlass(4, 's');

    const removed = useAppStore.getState().useWord('cat');
    expect(removed.sort()).toEqual([1, 2, 3]);
    const remaining = Array.from(useAppStore.getState().lettersInGlass.values());
    expect(remaining).toEqual(['s']);
    expect(useAppStore.getState().history).toEqual(['cat']);
    expect(useAppStore.getState().currentWord).toBe(null);
  });

  it('useWord is a no-op when the word can no longer be formed', () => {
    const s = useAppStore.getState();
    s.letterEnteredGlass(1, 'a');
    const removed = useAppStore.getState().useWord('cat');
    expect(removed).toEqual([]);
    expect(useAppStore.getState().lettersInGlass.size).toBe(1);
    expect(useAppStore.getState().history).toEqual([]);
  });

  it('useWord handles double letters greedily', () => {
    const s = useAppStore.getState();
    s.letterEnteredGlass(1, 'b');
    s.letterEnteredGlass(2, 'e');
    s.letterEnteredGlass(3, 'e');
    const removed = useAppStore.getState().useWord('bee');
    expect(removed.sort()).toEqual([1, 2, 3]);
    expect(useAppStore.getState().lettersInGlass.size).toBe(0);
  });

  it('setCurrentWord stores the current word', () => {
    useAppStore.getState().setCurrentWord({ word: 'cat', definition: 'feline' });
    expect(useAppStore.getState().currentWord?.word).toBe('cat');
  });

  it('toggleFullList flips the drawer state', () => {
    expect(useAppStore.getState().showFullList).toBe(false);
    useAppStore.getState().toggleFullList();
    expect(useAppStore.getState().showFullList).toBe(true);
  });
});
