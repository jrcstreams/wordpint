import { create } from 'zustand';
import type { WordIndex, WordResult } from '../words/types';

export type DictionaryStatus = 'idle' | 'loading' | 'ready' | 'error';

interface AppState {
  lettersInGlass: Map<number, string>;
  currentWord: WordResult | null;
  history: string[];
  dictionaryStatus: DictionaryStatus;
  wordIndex: WordIndex | null;
  showFullList: boolean;

  letterEnteredGlass: (id: number, char: string) => void;
  letterLeftGlass: (id: number) => void;
  useWord: (word: string) => number[];
  clearGlass: () => void;
  setCurrentWord: (word: WordResult | null) => void;
  setDictionary: (index: WordIndex) => void;
  setDictionaryStatus: (status: DictionaryStatus) => void;
  toggleFullList: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  lettersInGlass: new Map(),
  currentWord: null,
  history: [],
  dictionaryStatus: 'idle',
  wordIndex: null,
  showFullList: false,

  letterEnteredGlass: (id, char) => {
    const next = new Map(get().lettersInGlass);
    next.set(id, char.toLowerCase());
    set({ lettersInGlass: next });
  },

  letterLeftGlass: (id) => {
    const next = new Map(get().lettersInGlass);
    next.delete(id);
    set({ lettersInGlass: next });
  },

  useWord: (word) => {
    const target = word.toLowerCase();
    const current = get().lettersInGlass;
    const removed: number[] = [];
    const used = new Set<number>();
    for (const ch of target) {
      let found: number | null = null;
      for (const [id, c] of current) {
        if (used.has(id)) continue;
        if (c === ch) {
          found = id;
          break;
        }
      }
      if (found === null) return []; // word can no longer be formed
      used.add(found);
      removed.push(found);
    }
    const next = new Map(current);
    for (const id of removed) next.delete(id);
    set({
      lettersInGlass: next,
      history: [...get().history, target],
      currentWord: null,
    });
    return removed;
  },

  clearGlass: () =>
    set({
      lettersInGlass: new Map(),
      currentWord: null,
    }),

  setCurrentWord: (word) => set({ currentWord: word }),
  setDictionary: (index) => set({ wordIndex: index, dictionaryStatus: 'ready' }),
  setDictionaryStatus: (status) => set({ dictionaryStatus: status }),
  toggleFullList: () => set({ showFullList: !get().showFullList }),
}));
