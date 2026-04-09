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
  /**
   * True while the user is holding the tap. The hero word is held
   * (or empty for brand-new pours) until this flips back to false,
   * so the first surfaced word reflects the full letter set instead
   * of whatever 3-letter combo happened to land first.
   */
  pouring: boolean;

  letterEnteredGlass: (id: number, char: string) => void;
  letterLeftGlass: (id: number) => void;
  useWord: (word: string) => number[];
  clearGlass: () => void;
  setCurrentWord: (word: WordResult | null) => void;
  setDictionary: (index: WordIndex) => void;
  setDictionaryStatus: (status: DictionaryStatus) => void;
  setPouring: (v: boolean) => void;
  toggleFullList: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  lettersInGlass: new Map(),
  currentWord: null,
  history: [],
  dictionaryStatus: 'idle',
  wordIndex: null,
  showFullList: false,
  pouring: false,

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
      history: [],
    }),

  setCurrentWord: (word) => set({ currentWord: word }),
  setDictionary: (index) => set({ wordIndex: index, dictionaryStatus: 'ready' }),
  setDictionaryStatus: (status) => set({ dictionaryStatus: status }),
  setPouring: (v) => set({ pouring: v }),
  toggleFullList: () => set({ showFullList: !get().showFullList }),
}));
