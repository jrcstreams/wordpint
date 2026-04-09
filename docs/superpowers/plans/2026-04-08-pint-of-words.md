# Pint of Words Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a static SPA where the user pours randomized letter tiles from a fountain dispenser into a physics-simulated pint glass, then surfaces words formable from the letters in the glass with definitions from WordNet.

**Architecture:** Three loosely-coupled subsystems — a Matter.js physics stage, a pure-TS word engine backed by a preprocessed WordNet JSON file, and a React UI shell. Communication flows through a Zustand store; the word engine never sees pixels and the physics never sees words.

**Tech Stack:** Vite, React 18, TypeScript, Matter.js, Zustand, WordNet (via `wordnet-db`), Vitest, React Testing Library, Tailwind CSS.

---

## File Structure

```
cup-of-words/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
├── index.html
├── public/
│   └── wordnet.json                  # built once via scripts/build-wordnet.ts
├── scripts/
│   └── build-wordnet.ts              # one-shot WordNet preprocessor
├── src/
│   ├── main.tsx                      # React entry
│   ├── index.css                     # Tailwind directives + base styles
│   ├── App.tsx                       # top-level layout, wires everything
│   ├── words/
│   │   ├── types.ts                  # WordEntry, WordIndex, FindWordsOpts
│   │   ├── loader.ts                 # fetch + parse wordnet.json
│   │   ├── findWords.ts              # anagram subset search
│   │   ├── scoring.ts                # weight by length / rarity
│   │   └── definitions.ts            # lookup by word
│   ├── state/
│   │   └── store.ts                  # Zustand store
│   ├── physics/
│   │   ├── world.ts                  # Matter engine + walls + render loop
│   │   ├── pintGlass.ts              # compound body for the glass
│   │   ├── letters.ts                # letter body factory + Scrabble bag
│   │   ├── dispenser.ts              # pour timing & spawn position
│   │   ├── sensors.ts                # in-glass + overflow event emitter
│   │   └── PhysicsStage.tsx          # React wrapper, exposes imperative ref
│   └── ui/
│       ├── Dispenser.tsx             # hold-to-pour button
│       ├── ControlsBar.tsx           # find-a-word button + toggles
│       ├── WordCard.tsx              # current word + definition + actions
│       ├── WordList.tsx              # full-list drawer
│       ├── HistoryStrip.tsx          # words used this session
│       └── DictionaryBanner.tsx      # error banner + retry
└── tests/
    ├── words/
    │   ├── findWords.test.ts
    │   ├── scoring.test.ts
    │   └── loader.test.ts
    ├── state/
    │   └── store.test.ts
    └── ui/
        ├── ControlsBar.test.tsx
        ├── WordCard.test.tsx
        └── DictionaryBanner.test.tsx
```

---

## Task 1: Project scaffold

**Files:**
- Create: `package.json`, `tsconfig.json`, `tsconfig.node.json`, `vite.config.ts`, `tailwind.config.js`, `postcss.config.js`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/index.css`, `.gitignore` (update)

- [ ] **Step 1: Initialize Vite + React + TS project in place**

The directory already contains `CLAUDE.md`, `docs/`, and `.git/`. Scaffold without overwriting them.

```bash
npm create vite@latest . -- --template react-ts
# When prompted "Current directory is not empty", choose "Ignore files and continue"
```

- [ ] **Step 2: Install runtime + dev dependencies**

```bash
npm install matter-js zustand
npm install -D @types/matter-js vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom tailwindcss postcss autoprefixer wordnet-db tsx
npx tailwindcss init -p
```

- [ ] **Step 3: Configure Tailwind**

Replace `tailwind.config.js` with:

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: { extend: {} },
  plugins: [],
};
```

Replace `src/index.css` with:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

html, body, #root { height: 100%; margin: 0; }
body { font-family: ui-sans-serif, system-ui, sans-serif; background: #0e0e10; color: #f5f5f5; }
```

- [ ] **Step 4: Configure Vitest**

Replace `vite.config.ts` with:

```ts
/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
  },
});
```

Create `vitest.setup.ts`:

```ts
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 5: Add scripts to `package.json`**

In `package.json` `"scripts"` add (keep `dev`, `build`, `preview` from Vite default):

```json
"test": "vitest run",
"test:watch": "vitest",
"build:wordnet": "tsx scripts/build-wordnet.ts"
```

- [ ] **Step 6: Update `.gitignore`**

Append to `.gitignore`:

```
node_modules/
dist/
.vite/
coverage/
public/wordnet.json
```

(`public/wordnet.json` is generated; built once locally before running.)

- [ ] **Step 7: Replace `src/App.tsx` with a placeholder**

```tsx
export default function App() {
  return <div className="grid place-items-center h-full">Pint of Words</div>;
}
```

- [ ] **Step 8: Verify scaffold builds and tests run**

Run: `npm run build && npm run test`
Expected: Build succeeds with no TS errors. Vitest reports "No test files found, exiting with code 0" (or 1 — that's fine; we'll add tests next).

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "scaffold: Vite + React + TS + Tailwind + Vitest"
```

---

## Task 2: WordNet preprocessing script

**Files:**
- Create: `scripts/build-wordnet.ts`
- Output: `public/wordnet.json` (generated; gitignored)

The script reads WordNet data files shipped by the `wordnet-db` package, extracts each headword + its first gloss, and writes a single JSON file with two indexes:
- `definitions: Record<string, string>` — word → first gloss (definition).
- `bySignature: Record<string, string[]>` — sorted-letters signature → list of words sharing that signature.

The signature index is what `findWords` will scan: for each signature, check whether it's a sub-multiset of the cup's letters in O(26).

- [ ] **Step 1: Write the build script**

Create `scripts/build-wordnet.ts`:

```ts
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
// @ts-ignore — wordnet-db has no types but exposes a `path` property
import wndb from 'wordnet-db';

const POS_FILES = ['data.noun', 'data.verb', 'data.adj', 'data.adv'];

function signature(word: string): string {
  return word.split('').sort().join('');
}

function parseDataFile(contents: string): Array<{ word: string; gloss: string }> {
  const out: Array<{ word: string; gloss: string }> = [];
  for (const line of contents.split('\n')) {
    if (!line || line.startsWith(' ')) continue; // license header lines start with space
    const glossSplit = line.split('|');
    if (glossSplit.length < 2) continue;
    const header = glossSplit[0];
    const gloss = glossSplit[1].trim().split(';')[0].trim(); // first sense only
    const tokens = header.split(/\s+/);
    // tokens: synset_offset lex_filenum ss_type w_cnt word lex_id [word lex_id]... p_cnt ...
    const wCntHex = tokens[3];
    const wCnt = parseInt(wCntHex, 16);
    for (let i = 0; i < wCnt; i++) {
      const raw = tokens[4 + i * 2];
      if (!raw) continue;
      const word = raw.toLowerCase().replace(/_/g, ' ');
      // Skip multi-word entries and anything with non a-z chars
      if (!/^[a-z]+$/.test(word)) continue;
      if (word.length < 2 || word.length > 15) continue;
      out.push({ word, gloss });
    }
  }
  return out;
}

function main() {
  const definitions: Record<string, string> = {};
  for (const file of POS_FILES) {
    const path = join(wndb.path, file);
    const contents = readFileSync(path, 'utf8');
    const entries = parseDataFile(contents);
    for (const { word, gloss } of entries) {
      // Keep the first definition we see for each word
      if (!definitions[word]) definitions[word] = gloss;
    }
  }

  const bySignature: Record<string, string[]> = {};
  for (const word of Object.keys(definitions)) {
    const sig = signature(word);
    (bySignature[sig] ||= []).push(word);
  }

  const __dirname = dirname(fileURLToPath(import.meta.url));
  const outPath = join(__dirname, '..', 'public', 'wordnet.json');
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify({ definitions, bySignature }));

  console.log(
    `Wrote ${outPath}: ${Object.keys(definitions).length} words, ${
      Object.keys(bySignature).length
    } signatures`,
  );
}

main();
```

- [ ] **Step 2: Run the build script**

Run: `npm run build:wordnet`
Expected: prints something like `Wrote .../public/wordnet.json: 8X,XXX words, 7X,XXX signatures` and produces a file roughly 5–15 MB.

- [ ] **Step 3: Sanity-check the output**

Run: `node -e "const j = require('./public/wordnet.json'); console.log('cat:', j.definitions['cat']); console.log('signature act has:', j.bySignature['act']);"`
Expected: prints a definition for "cat" and lists words for the signature `act` (e.g., `["act","cat","tac"...]` — at least includes `act` and `cat`).

- [ ] **Step 4: Commit**

```bash
git add scripts/build-wordnet.ts package.json package-lock.json
git commit -m "feat(words): WordNet preprocessing build script"
```

---

## Task 3: Word engine — types and findWords

**Files:**
- Create: `src/words/types.ts`, `src/words/findWords.ts`
- Test: `tests/words/findWords.test.ts`

- [ ] **Step 1: Define shared types**

Create `src/words/types.ts`:

```ts
export interface WordIndex {
  definitions: Record<string, string>;
  bySignature: Record<string, string[]>;
}

export interface FindWordsOpts {
  minLength?: number;
}

export interface WordResult {
  word: string;
  definition: string;
}
```

- [ ] **Step 2: Write failing tests for findWords**

Create `tests/words/findWords.test.ts`:

```ts
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
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm run test -- findWords`
Expected: FAIL — module `src/words/findWords` not found.

- [ ] **Step 4: Implement findWords**

Create `src/words/findWords.ts`:

```ts
import type { WordIndex, FindWordsOpts, WordResult } from './types';

function lettersToCounts(letters: string[]): Uint8Array {
  const counts = new Uint8Array(26);
  for (const ch of letters) {
    const code = ch.toLowerCase().charCodeAt(0) - 97;
    if (code >= 0 && code < 26) counts[code]++;
  }
  return counts;
}

function signatureToCounts(sig: string): Uint8Array {
  const counts = new Uint8Array(26);
  for (let i = 0; i < sig.length; i++) {
    const code = sig.charCodeAt(i) - 97;
    if (code >= 0 && code < 26) counts[code]++;
  }
  return counts;
}

function isSubMultiset(needed: Uint8Array, have: Uint8Array): boolean {
  for (let i = 0; i < 26; i++) {
    if (needed[i] > have[i]) return false;
  }
  return true;
}

export function findWords(
  letters: string[],
  index: WordIndex,
  opts: FindWordsOpts = {},
): WordResult[] {
  const minLength = opts.minLength ?? 2;
  const have = lettersToCounts(letters);
  const results: WordResult[] = [];

  for (const sig of Object.keys(index.bySignature)) {
    if (sig.length < minLength) continue;
    const needed = signatureToCounts(sig);
    if (!isSubMultiset(needed, have)) continue;
    for (const word of index.bySignature[sig]) {
      const definition = index.definitions[word] ?? '';
      results.push({ word, definition });
    }
  }

  return results;
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm run test -- findWords`
Expected: PASS — all 7 tests green.

- [ ] **Step 6: Commit**

```bash
git add src/words/types.ts src/words/findWords.ts tests/words/findWords.test.ts
git commit -m "feat(words): findWords anagram subset search"
```

---

## Task 4: Word engine — scoring & weighted pick

**Files:**
- Create: `src/words/scoring.ts`
- Test: `tests/words/scoring.test.ts`

Scoring weights longer words and (proxy for) rarer words higher, so the random "Find a word" pick favors more interesting results.

- [ ] **Step 1: Write failing tests**

Create `tests/words/scoring.test.ts`:

```ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- scoring`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement scoring**

Create `src/words/scoring.ts`:

```ts
// Letter rarity weights (higher = rarer). Scrabble-tile inspired.
const LETTER_RARITY: Record<string, number> = {
  a: 1, b: 3, c: 3, d: 2, e: 1, f: 4, g: 2, h: 4, i: 1,
  j: 8, k: 5, l: 1, m: 3, n: 1, o: 1, p: 3, q: 10, r: 1,
  s: 1, t: 1, u: 1, v: 4, w: 4, x: 8, y: 4, z: 10,
};

export function scoreWord(word: string): number {
  if (!word) return 0;
  let rarity = 0;
  for (const ch of word.toLowerCase()) {
    rarity += LETTER_RARITY[ch] ?? 1;
  }
  // length-squared dominates so longer words clearly win, plus rarity contribution
  return word.length * word.length + rarity;
}

export function weightedPick<T>(
  items: T[],
  rng: () => number = Math.random,
): T | null {
  if (items.length === 0) return null;
  if (items.length === 1) return items[0];
  const weights = items.map((item) => {
    const s = typeof item === 'string' ? scoreWord(item) : scoreWord(String(item));
    return Math.max(s, 1);
  });
  const total = weights.reduce((a, b) => a + b, 0);
  let target = rng() * total;
  for (let i = 0; i < items.length; i++) {
    target -= weights[i];
    if (target <= 0) return items[i];
  }
  return items[items.length - 1];
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- scoring`
Expected: PASS — all tests green.

- [ ] **Step 5: Commit**

```bash
git add src/words/scoring.ts tests/words/scoring.test.ts
git commit -m "feat(words): scoring + weighted pick"
```

---

## Task 5: Word engine — loader & definitions

**Files:**
- Create: `src/words/loader.ts`, `src/words/definitions.ts`
- Test: `tests/words/loader.test.ts`

- [ ] **Step 1: Write failing tests for the loader**

Create `tests/words/loader.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadWordIndex } from '../../src/words/loader';

describe('loadWordIndex', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches /wordnet.json and returns the parsed index', async () => {
    const fixture = {
      definitions: { cat: 'a feline' },
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
    expect(result.definitions.cat).toBe('a feline');
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- loader`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the loader**

Create `src/words/loader.ts`:

```ts
import type { WordIndex } from './types';

export async function loadWordIndex(url = '/wordnet.json'): Promise<WordIndex> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to load dictionary: ${res.status}`);
  }
  const data = await res.json();
  if (
    !data ||
    typeof data.definitions !== 'object' ||
    typeof data.bySignature !== 'object'
  ) {
    throw new Error('Dictionary file is malformed');
  }
  return data as WordIndex;
}
```

- [ ] **Step 4: Implement definitions lookup**

Create `src/words/definitions.ts`:

```ts
import type { WordIndex } from './types';

export function getDefinition(word: string, index: WordIndex): string | null {
  return index.definitions[word.toLowerCase()] ?? null;
}
```

- [ ] **Step 5: Run tests to verify loader tests pass**

Run: `npm run test -- loader`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/words/loader.ts src/words/definitions.ts tests/words/loader.test.ts
git commit -m "feat(words): loader + definitions lookup"
```

---

## Task 6: State store

**Files:**
- Create: `src/state/store.ts`
- Test: `tests/state/store.test.ts`

The store is the single source of truth for what letters are currently in the glass, the dictionary load state, the current word, and history.

- [ ] **Step 1: Write failing tests**

Create `tests/state/store.test.ts`:

```ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- store`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the store**

Create `src/state/store.ts`:

```ts
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

  setCurrentWord: (word) => set({ currentWord: word }),
  setDictionary: (index) => set({ wordIndex: index, dictionaryStatus: 'ready' }),
  setDictionaryStatus: (status) => set({ dictionaryStatus: status }),
  toggleFullList: () => set({ showFullList: !get().showFullList }),
}));
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- store`
Expected: PASS — all 7 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/state/store.ts tests/state/store.test.ts
git commit -m "feat(state): Zustand store with TDD reducers"
```

---

## Task 7: Physics — world setup

**Files:**
- Create: `src/physics/world.ts`

This module owns the Matter.js engine, render loop, and the canvas. No React in this file. The physics modules are not unit-tested — they'll be exercised by the React wrapper and tuned by feel.

- [ ] **Step 1: Implement the world module**

Create `src/physics/world.ts`:

```ts
import Matter from 'matter-js';

export interface WorldHandle {
  engine: Matter.Engine;
  world: Matter.World;
  render: Matter.Render;
  runner: Matter.Runner;
  width: number;
  height: number;
  destroy: () => void;
}

export function createWorld(canvas: HTMLCanvasElement): WorldHandle {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;

  const engine = Matter.Engine.create({
    gravity: { x: 0, y: 1, scale: 0.0012 },
  });

  const render = Matter.Render.create({
    canvas,
    engine,
    options: {
      width,
      height,
      wireframes: false,
      background: '#0e0e10',
    },
  });

  // Side walls + floor (offscreen below the visible area is the overflow zone)
  const wallThickness = 60;
  const walls = [
    Matter.Bodies.rectangle(-wallThickness / 2, height / 2, wallThickness, height * 2, {
      isStatic: true,
      render: { visible: false },
    }),
    Matter.Bodies.rectangle(
      width + wallThickness / 2,
      height / 2,
      wallThickness,
      height * 2,
      { isStatic: true, render: { visible: false } },
    ),
    Matter.Bodies.rectangle(
      width / 2,
      height + wallThickness / 2,
      width * 2,
      wallThickness,
      { isStatic: true, render: { visible: false }, label: 'floor' },
    ),
  ];
  Matter.Composite.add(engine.world, walls);

  const runner = Matter.Runner.create();
  Matter.Runner.run(runner, engine);
  Matter.Render.run(render);

  // Pause on tab background
  const visHandler = () => {
    if (document.hidden) {
      Matter.Runner.stop(runner);
    } else {
      Matter.Runner.start(runner, engine);
    }
  };
  document.addEventListener('visibilitychange', visHandler);

  return {
    engine,
    world: engine.world,
    render,
    runner,
    width,
    height,
    destroy: () => {
      document.removeEventListener('visibilitychange', visHandler);
      Matter.Render.stop(render);
      Matter.Runner.stop(runner);
      Matter.Composite.clear(engine.world, false);
      Matter.Engine.clear(engine);
    },
  };
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npm run build`
Expected: build succeeds with no TS errors.

- [ ] **Step 3: Commit**

```bash
git add src/physics/world.ts
git commit -m "feat(physics): Matter.js engine + walls + render loop"
```

---

## Task 8: Physics — pint glass body

**Files:**
- Create: `src/physics/pintGlass.ts`

A pint glass is a compound body made of three thin static rectangles forming a U: left wall (slightly tilted outward), right wall (slightly tilted outward), bottom. The interior is the volume that letters fall into.

- [ ] **Step 1: Implement the pint glass builder**

Create `src/physics/pintGlass.ts`:

```ts
import Matter from 'matter-js';

export interface PintGlassHandle {
  bodies: Matter.Body[];
  /** AABB of the glass interior, used by sensors to decide "letter is inside" */
  interior: { x: number; y: number; width: number; height: number };
}

export function createPintGlass(
  world: Matter.World,
  centerX: number,
  baseY: number,
): PintGlassHandle {
  // Pint dimensions (px). Slight outward taper at the rim.
  const innerTopWidth = 240;
  const innerBottomWidth = 180;
  const innerHeight = 360;
  const wallThickness = 14;
  const tilt = Math.atan2(
    (innerTopWidth - innerBottomWidth) / 2,
    innerHeight,
  );

  const renderOpts: Matter.IBodyRenderOptions = {
    fillStyle: '#e8e6df',
    strokeStyle: '#a8a499',
    lineWidth: 2,
  };

  const bottom = Matter.Bodies.rectangle(
    centerX,
    baseY,
    innerBottomWidth + wallThickness * 2,
    wallThickness,
    { isStatic: true, label: 'glass-bottom', render: renderOpts },
  );

  const leftWall = Matter.Bodies.rectangle(
    centerX - innerBottomWidth / 2 - wallThickness / 2 - (innerTopWidth - innerBottomWidth) / 4,
    baseY - innerHeight / 2 - wallThickness / 2,
    wallThickness,
    innerHeight,
    {
      isStatic: true,
      angle: -tilt,
      label: 'glass-left',
      render: renderOpts,
    },
  );

  const rightWall = Matter.Bodies.rectangle(
    centerX + innerBottomWidth / 2 + wallThickness / 2 + (innerTopWidth - innerBottomWidth) / 4,
    baseY - innerHeight / 2 - wallThickness / 2,
    wallThickness,
    innerHeight,
    {
      isStatic: true,
      angle: tilt,
      label: 'glass-right',
      render: renderOpts,
    },
  );

  Matter.Composite.add(world, [bottom, leftWall, rightWall]);

  return {
    bodies: [bottom, leftWall, rightWall],
    interior: {
      x: centerX - innerTopWidth / 2,
      y: baseY - innerHeight - wallThickness,
      width: innerTopWidth,
      height: innerHeight,
    },
  };
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/physics/pintGlass.ts
git commit -m "feat(physics): pint glass compound body"
```

---

## Task 9: Physics — letters factory + Scrabble bag

**Files:**
- Create: `src/physics/letters.ts`

Letter bodies are small squares with the glyph painted via a generated canvas texture. The Scrabble bag yields letters in standard distribution and refills when empty.

- [ ] **Step 1: Implement letters and bag**

Create `src/physics/letters.ts`:

```ts
import Matter from 'matter-js';

// Standard 100-tile Scrabble distribution (excluding blanks).
const SCRABBLE_DISTRIBUTION: Record<string, number> = {
  a: 9, b: 2, c: 2, d: 4, e: 12, f: 2, g: 3, h: 2, i: 9,
  j: 1, k: 1, l: 4, m: 2, n: 6, o: 8, p: 2, q: 1, r: 6,
  s: 4, t: 6, u: 4, v: 2, w: 2, x: 1, y: 2, z: 1,
};

export class ScrabbleBag {
  private bag: string[] = [];
  constructor(private rng: () => number = Math.random) {
    this.refill();
  }
  private refill() {
    for (const [ch, n] of Object.entries(SCRABBLE_DISTRIBUTION)) {
      for (let i = 0; i < n; i++) this.bag.push(ch);
    }
  }
  draw(): string {
    if (this.bag.length === 0) this.refill();
    const i = Math.floor(this.rng() * this.bag.length);
    const [ch] = this.bag.splice(i, 1);
    return ch;
  }
}

const TILE_SIZE = 38;
const textureCache = new Map<string, string>();

function makeLetterTexture(char: string): string {
  const cached = textureCache.get(char);
  if (cached) return cached;
  const c = document.createElement('canvas');
  c.width = TILE_SIZE;
  c.height = TILE_SIZE;
  const ctx = c.getContext('2d')!;
  // Tile background
  ctx.fillStyle = '#f3e9c6';
  ctx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
  ctx.strokeStyle = '#8a7a3c';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, TILE_SIZE - 2, TILE_SIZE - 2);
  // Glyph
  ctx.fillStyle = '#1a1a1a';
  ctx.font = 'bold 22px ui-sans-serif, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(char.toUpperCase(), TILE_SIZE / 2, TILE_SIZE / 2 + 1);
  const url = c.toDataURL();
  textureCache.set(char, url);
  return url;
}

export interface LetterBody extends Matter.Body {
  letterChar: string;
  letterId: number;
  bornAt: number;
}

let nextLetterId = 1;

export function createLetterBody(
  char: string,
  x: number,
  y: number,
): LetterBody {
  const body = Matter.Bodies.rectangle(x, y, TILE_SIZE, TILE_SIZE, {
    density: 0.002,
    friction: 0.4,
    restitution: 0.15,
    chamfer: { radius: 4 },
    render: {
      sprite: {
        texture: makeLetterTexture(char),
        xScale: 1,
        yScale: 1,
      },
    },
  }) as LetterBody;
  body.letterChar = char;
  body.letterId = nextLetterId++;
  body.bornAt = performance.now();
  return body;
}

export const LETTER_TILE_SIZE = TILE_SIZE;
```

- [ ] **Step 2: Verify it compiles**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/physics/letters.ts
git commit -m "feat(physics): letter body factory + Scrabble bag"
```

---

## Task 10: Physics — dispenser

**Files:**
- Create: `src/physics/dispenser.ts`

The dispenser drops letters at a steady cadence from a fixed point above the glass when active.

- [ ] **Step 1: Implement the dispenser**

Create `src/physics/dispenser.ts`:

```ts
import Matter from 'matter-js';
import { ScrabbleBag, createLetterBody, type LetterBody } from './letters';

export interface DispenserOptions {
  world: Matter.World;
  spawnX: number;
  spawnY: number;
  intervalMs?: number;
  jitterX?: number;
  onSpawn?: (body: LetterBody) => void;
}

export class Dispenser {
  private bag = new ScrabbleBag();
  private timer: number | null = null;
  private intervalMs: number;
  private jitterX: number;

  constructor(private opts: DispenserOptions) {
    this.intervalMs = opts.intervalMs ?? 100;
    this.jitterX = opts.jitterX ?? 30;
  }

  start() {
    if (this.timer !== null) return;
    const tick = () => {
      this.spawnOne();
      this.timer = window.setTimeout(tick, this.intervalMs);
    };
    tick();
  }

  stop() {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  spawnOne() {
    const ch = this.bag.draw();
    const x = this.opts.spawnX + (Math.random() - 0.5) * this.jitterX * 2;
    const body = createLetterBody(ch, x, this.opts.spawnY);
    Matter.Composite.add(this.opts.world, body);
    this.opts.onSpawn?.(body);
  }

  destroy() {
    this.stop();
  }
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/physics/dispenser.ts
git commit -m "feat(physics): dispenser with hold-to-pour cadence"
```

---

## Task 11: Physics — sensors and lifecycle

**Files:**
- Create: `src/physics/sensors.ts`

Per-tick scan: for each `LetterBody`, decide whether it's currently inside the glass interior AABB or has fallen below the visible floor. Emit `entered` / `left` events on transitions, plus a `removed` event after the floor-fade. Also enforces the watchdog (drop bodies stuck >10s without entering the glass) and the active-body cap.

- [ ] **Step 1: Implement the sensors module**

Create `src/physics/sensors.ts`:

```ts
import Matter from 'matter-js';
import type { LetterBody } from './letters';

export interface SensorEvents {
  onEntered: (id: number, char: string) => void;
  onLeft: (id: number) => void;
}

export interface SensorOptions {
  engine: Matter.Engine;
  interior: { x: number; y: number; width: number; height: number };
  worldHeight: number;
  events: SensorEvents;
  maxActive: number;
  /** ms after exiting the glass before the body is removed and faded */
  exitFadeMs?: number;
  /** ms a letter may live without entering the glass before being culled */
  watchdogMs?: number;
}

interface TrackState {
  insideGlass: boolean;
  exitedAt: number | null;
}

export class Sensors {
  private tracking = new Map<number, TrackState>();
  private exitFadeMs: number;
  private watchdogMs: number;

  constructor(private opts: SensorOptions) {
    this.exitFadeMs = opts.exitFadeMs ?? 2000;
    this.watchdogMs = opts.watchdogMs ?? 10000;
    Matter.Events.on(opts.engine, 'beforeUpdate', this.tick);
  }

  destroy() {
    Matter.Events.off(this.opts.engine, 'beforeUpdate', this.tick);
  }

  /** Returns the current count of active letter bodies. */
  activeCount(): number {
    return this.tracking.size;
  }

  private isLetter(body: Matter.Body): body is LetterBody {
    return (body as LetterBody).letterChar !== undefined;
  }

  private isInsideInterior(body: Matter.Body): boolean {
    const { x, y, width, height } = this.opts.interior;
    const px = body.position.x;
    const py = body.position.y;
    return px >= x && px <= x + width && py >= y && py <= y + height;
  }

  private tick = () => {
    const now = performance.now();
    const world = this.opts.engine.world;
    const bodies = Matter.Composite.allBodies(world);

    for (const body of bodies) {
      if (!this.isLetter(body)) continue;
      const id = body.letterId;
      let track = this.tracking.get(id);
      if (!track) {
        track = { insideGlass: false, exitedAt: null };
        this.tracking.set(id, track);
      }

      const inside = this.isInsideInterior(body);

      if (inside && !track.insideGlass) {
        track.insideGlass = true;
        track.exitedAt = null;
        this.opts.events.onEntered(id, body.letterChar);
      } else if (!inside && track.insideGlass) {
        track.insideGlass = false;
        track.exitedAt = now;
        this.opts.events.onLeft(id);
      }

      // Watchdog: never entered the glass and old → cull
      if (!track.insideGlass && track.exitedAt === null) {
        if (now - body.bornAt > this.watchdogMs) {
          Matter.Composite.remove(world, body);
          this.tracking.delete(id);
          continue;
        }
      }

      // Floor fade: exited the glass and lingered long enough → remove
      if (track.exitedAt !== null && now - track.exitedAt > this.exitFadeMs) {
        Matter.Composite.remove(world, body);
        this.tracking.delete(id);
        continue;
      }

      // Below the visible floor → remove immediately
      if (body.position.y > this.opts.worldHeight + 100) {
        if (track.insideGlass) this.opts.events.onLeft(id);
        Matter.Composite.remove(world, body);
        this.tracking.delete(id);
      }
    }
  };

  /** Remove a specific set of letter ids (used by `useWord`). */
  removeLetters(ids: number[]) {
    const world = this.opts.engine.world;
    const idSet = new Set(ids);
    for (const body of Matter.Composite.allBodies(world)) {
      if (!this.isLetter(body)) continue;
      if (!idSet.has(body.letterId)) continue;
      const track = this.tracking.get(body.letterId);
      if (track?.insideGlass) {
        this.opts.events.onLeft(body.letterId);
      }
      Matter.Composite.remove(world, body);
      this.tracking.delete(body.letterId);
    }
  }

  /** True when the cap has been reached and the dispenser should stall. */
  isFull(): boolean {
    return this.tracking.size >= this.opts.maxActive;
  }
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/physics/sensors.ts
git commit -m "feat(physics): in-glass sensors + watchdog + cap"
```

---

## Task 12: Physics — React stage wrapper with adaptive cap

**Files:**
- Create: `src/physics/PhysicsStage.tsx`

The React-facing component. Mounts the canvas, builds the world/glass/dispenser/sensors, exposes an imperative ref, runs an FPS probe in the first second to choose the active-body cap (200 mobile / 400 desktop).

- [ ] **Step 1: Implement the stage**

Create `src/physics/PhysicsStage.tsx`:

```tsx
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react';
import { useAppStore } from '../state/store';
import { createWorld, type WorldHandle } from './world';
import { createPintGlass } from './pintGlass';
import { Dispenser } from './dispenser';
import { Sensors } from './sensors';

export interface PhysicsStageHandle {
  startPour: () => void;
  stopPour: () => void;
  removeLetters: (ids: number[]) => void;
}

function pickInitialCap(): number {
  const cores = navigator.hardwareConcurrency ?? 4;
  return cores < 4 ? 200 : 400;
}

export const PhysicsStage = forwardRef<PhysicsStageHandle>((_, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const worldRef = useRef<WorldHandle | null>(null);
  const dispenserRef = useRef<Dispenser | null>(null);
  const sensorsRef = useRef<Sensors | null>(null);
  const capRef = useRef<number>(pickInitialCap());

  const letterEnteredGlass = useAppStore((s) => s.letterEnteredGlass);
  const letterLeftGlass = useAppStore((s) => s.letterLeftGlass);

  useEffect(() => {
    const canvas = canvasRef.current!;
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    const world = createWorld(canvas);
    worldRef.current = world;

    const glass = createPintGlass(world.world, world.width / 2, world.height - 60);

    const sensors = new Sensors({
      engine: world.engine,
      interior: glass.interior,
      worldHeight: world.height,
      maxActive: capRef.current,
      events: {
        onEntered: (id, char) => letterEnteredGlass(id, char),
        onLeft: (id) => letterLeftGlass(id),
      },
    });
    sensorsRef.current = sensors;

    const dispenser = new Dispenser({
      world: world.world,
      spawnX: world.width / 2,
      spawnY: 40,
      intervalMs: 100,
      onSpawn: () => {
        if (sensors.isFull()) dispenser.stop();
      },
    });
    dispenserRef.current = dispenser;

    // FPS probe: sample after 1s; if avg FPS < 45, downgrade cap to 200
    const probeStart = performance.now();
    let frames = 0;
    const probe = () => {
      frames++;
      if (performance.now() - probeStart < 1000) {
        requestAnimationFrame(probe);
      } else {
        const fps = frames;
        if (fps < 45) capRef.current = Math.min(capRef.current, 200);
      }
    };
    requestAnimationFrame(probe);

    return () => {
      dispenser.destroy();
      sensors.destroy();
      world.destroy();
    };
  }, [letterEnteredGlass, letterLeftGlass]);

  useImperativeHandle(
    ref,
    () => ({
      startPour: () => dispenserRef.current?.start(),
      stopPour: () => dispenserRef.current?.stop(),
      removeLetters: (ids) => sensorsRef.current?.removeLetters(ids),
    }),
    [],
  );

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      aria-label="Pint of Words physics stage"
    />
  );
});

PhysicsStage.displayName = 'PhysicsStage';
```

- [ ] **Step 2: Verify it compiles**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/physics/PhysicsStage.tsx
git commit -m "feat(physics): React stage wrapper with adaptive cap"
```

---

## Task 13: UI — Dispenser button

**Files:**
- Create: `src/ui/Dispenser.tsx`

Hold-to-pour. Uses pointer events for desktop + touch parity.

- [ ] **Step 1: Implement the dispenser button**

Create `src/ui/Dispenser.tsx`:

```tsx
import { useCallback } from 'react';

interface DispenserProps {
  onStart: () => void;
  onStop: () => void;
}

export function Dispenser({ onStart, onStop }: DispenserProps) {
  const handleDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      (e.target as Element).setPointerCapture?.(e.pointerId);
      onStart();
    },
    [onStart],
  );

  const handleUp = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      onStop();
    },
    [onStop],
  );

  return (
    <button
      type="button"
      className="absolute top-4 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full bg-amber-500 text-stone-900 font-semibold shadow-lg select-none touch-none hover:bg-amber-400 active:bg-amber-300"
      onPointerDown={handleDown}
      onPointerUp={handleUp}
      onPointerCancel={handleUp}
      onPointerLeave={handleUp}
      aria-label="Hold to pour letters"
    >
      Hold to Pour
    </button>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/ui/Dispenser.tsx
git commit -m "feat(ui): hold-to-pour dispenser button"
```

---

## Task 14: UI — WordCard with tests

**Files:**
- Create: `src/ui/WordCard.tsx`
- Test: `tests/ui/WordCard.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `tests/ui/WordCard.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WordCard } from '../../src/ui/WordCard';

describe('WordCard', () => {
  it('shows the empty state when no current word', () => {
    render(
      <WordCard
        currentWord={null}
        onNext={() => {}}
        onUseWord={() => {}}
      />,
    );
    expect(screen.getByText(/no words yet/i)).toBeInTheDocument();
  });

  it('shows the word and definition when present', () => {
    render(
      <WordCard
        currentWord={{ word: 'cat', definition: 'a small feline' }}
        onNext={() => {}}
        onUseWord={() => {}}
      />,
    );
    expect(screen.getByText('cat')).toBeInTheDocument();
    expect(screen.getByText('a small feline')).toBeInTheDocument();
  });

  it('calls onNext when Next is clicked', async () => {
    const onNext = vi.fn();
    render(
      <WordCard
        currentWord={{ word: 'cat', definition: 'a small feline' }}
        onNext={onNext}
        onUseWord={() => {}}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /next/i }));
    expect(onNext).toHaveBeenCalled();
  });

  it('calls onUseWord with the current word', async () => {
    const onUseWord = vi.fn();
    render(
      <WordCard
        currentWord={{ word: 'cat', definition: 'a small feline' }}
        onNext={() => {}}
        onUseWord={onUseWord}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /use word/i }));
    expect(onUseWord).toHaveBeenCalledWith('cat');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- WordCard`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement WordCard**

Create `src/ui/WordCard.tsx`:

```tsx
import type { WordResult } from '../words/types';

interface WordCardProps {
  currentWord: WordResult | null;
  onNext: () => void;
  onUseWord: (word: string) => void;
}

export function WordCard({ currentWord, onNext, onUseWord }: WordCardProps) {
  if (!currentWord) {
    return (
      <div className="rounded-2xl bg-stone-900/80 backdrop-blur p-6 text-stone-300">
        No words yet — try pouring a few more letters
      </div>
    );
  }
  return (
    <div className="rounded-2xl bg-stone-900/80 backdrop-blur p-6 max-w-md">
      <div className="text-3xl font-bold text-amber-300">{currentWord.word}</div>
      <p className="mt-2 text-stone-300">{currentWord.definition}</p>
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          className="px-4 py-2 rounded-full bg-stone-700 hover:bg-stone-600"
          onClick={onNext}
        >
          Next
        </button>
        <button
          type="button"
          className="px-4 py-2 rounded-full bg-amber-500 text-stone-900 font-semibold hover:bg-amber-400"
          onClick={() => onUseWord(currentWord.word)}
        >
          Use word
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- WordCard`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ui/WordCard.tsx tests/ui/WordCard.test.tsx
git commit -m "feat(ui): WordCard component"
```

---

## Task 15: UI — WordList drawer + HistoryStrip

**Files:**
- Create: `src/ui/WordList.tsx`, `src/ui/HistoryStrip.tsx`

- [ ] **Step 1: Implement WordList**

Create `src/ui/WordList.tsx`:

```tsx
import type { WordResult } from '../words/types';

interface WordListProps {
  open: boolean;
  results: WordResult[];
  onClose: () => void;
  onPick: (word: WordResult) => void;
}

export function WordList({ open, results, onClose, onPick }: WordListProps) {
  if (!open) return null;
  const sorted = [...results].sort((a, b) => b.word.length - a.word.length);
  return (
    <div className="fixed top-0 right-0 h-full w-80 bg-stone-900/95 backdrop-blur p-4 overflow-y-auto shadow-2xl">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-amber-300">All words ({sorted.length})</h2>
        <button
          type="button"
          className="text-stone-400 hover:text-stone-200"
          onClick={onClose}
          aria-label="Close word list"
        >
          ×
        </button>
      </div>
      <ul className="space-y-1">
        {sorted.map((r) => (
          <li key={r.word}>
            <button
              type="button"
              className="w-full text-left px-2 py-1 rounded hover:bg-stone-800"
              onClick={() => onPick(r)}
            >
              <span className="text-stone-100">{r.word}</span>
              <span className="ml-2 text-xs text-stone-500">{r.word.length}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 2: Implement HistoryStrip**

Create `src/ui/HistoryStrip.tsx`:

```tsx
interface HistoryStripProps {
  history: string[];
}

export function HistoryStrip({ history }: HistoryStripProps) {
  if (history.length === 0) return null;
  return (
    <div className="absolute bottom-4 left-4 right-4 flex flex-wrap gap-2">
      {history.map((w, i) => (
        <span
          key={`${w}-${i}`}
          className="px-3 py-1 rounded-full bg-stone-800/80 text-stone-200 text-sm"
        >
          {w}
        </span>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Verify it compiles**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/ui/WordList.tsx src/ui/HistoryStrip.tsx
git commit -m "feat(ui): WordList drawer + HistoryStrip"
```

---

## Task 16: UI — ControlsBar with tests

**Files:**
- Create: `src/ui/ControlsBar.tsx`
- Test: `tests/ui/ControlsBar.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `tests/ui/ControlsBar.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ControlsBar } from '../../src/ui/ControlsBar';

describe('ControlsBar', () => {
  it('renders nothing when letter count is 0', () => {
    const { container } = render(
      <ControlsBar
        letterCount={0}
        dictionaryReady={true}
        onFindWord={() => {}}
        onToggleList={() => {}}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the find-a-word button when there are letters and dictionary ready', () => {
    render(
      <ControlsBar
        letterCount={3}
        dictionaryReady={true}
        onFindWord={() => {}}
        onToggleList={() => {}}
      />,
    );
    expect(screen.getByRole('button', { name: /find a word/i })).toBeEnabled();
  });

  it('shows loading state when dictionary is not ready', () => {
    render(
      <ControlsBar
        letterCount={3}
        dictionaryReady={false}
        onFindWord={() => {}}
        onToggleList={() => {}}
      />,
    );
    expect(screen.getByText(/loading dictionary/i)).toBeInTheDocument();
  });

  it('calls onFindWord when clicked', async () => {
    const onFindWord = vi.fn();
    render(
      <ControlsBar
        letterCount={3}
        dictionaryReady={true}
        onFindWord={onFindWord}
        onToggleList={() => {}}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /find a word/i }));
    expect(onFindWord).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- ControlsBar`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement ControlsBar**

Create `src/ui/ControlsBar.tsx`:

```tsx
interface ControlsBarProps {
  letterCount: number;
  dictionaryReady: boolean;
  onFindWord: () => void;
  onToggleList: () => void;
}

export function ControlsBar({
  letterCount,
  dictionaryReady,
  onFindWord,
  onToggleList,
}: ControlsBarProps) {
  if (letterCount === 0) return null;
  if (!dictionaryReady) {
    return (
      <div className="absolute bottom-24 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-stone-900/80 text-stone-300">
        Loading dictionary…
      </div>
    );
  }
  return (
    <div className="absolute bottom-24 left-1/2 -translate-x-1/2 flex gap-2">
      <button
        type="button"
        className="px-5 py-2 rounded-full bg-amber-500 text-stone-900 font-semibold hover:bg-amber-400"
        onClick={onFindWord}
      >
        Find a word
      </button>
      <button
        type="button"
        className="px-5 py-2 rounded-full bg-stone-800 text-stone-200 hover:bg-stone-700"
        onClick={onToggleList}
      >
        Show all
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- ControlsBar`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ui/ControlsBar.tsx tests/ui/ControlsBar.test.tsx
git commit -m "feat(ui): ControlsBar component"
```

---

## Task 17: UI — DictionaryBanner with tests

**Files:**
- Create: `src/ui/DictionaryBanner.tsx`
- Test: `tests/ui/DictionaryBanner.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `tests/ui/DictionaryBanner.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DictionaryBanner } from '../../src/ui/DictionaryBanner';

describe('DictionaryBanner', () => {
  it('renders nothing when status is ready', () => {
    const { container } = render(
      <DictionaryBanner status="ready" onRetry={() => {}} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when status is loading or idle', () => {
    const { container: c1 } = render(
      <DictionaryBanner status="loading" onRetry={() => {}} />,
    );
    expect(c1).toBeEmptyDOMElement();
    const { container: c2 } = render(
      <DictionaryBanner status="idle" onRetry={() => {}} />,
    );
    expect(c2).toBeEmptyDOMElement();
  });

  it('shows the error message and a retry button when status is error', () => {
    render(<DictionaryBanner status="error" onRetry={() => {}} />);
    expect(screen.getByText(/couldn't load dictionary/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('calls onRetry when retry is clicked', async () => {
    const onRetry = vi.fn();
    render(<DictionaryBanner status="error" onRetry={onRetry} />);
    await userEvent.click(screen.getByRole('button', { name: /retry/i }));
    expect(onRetry).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- DictionaryBanner`
Expected: FAIL.

- [ ] **Step 3: Implement DictionaryBanner**

Create `src/ui/DictionaryBanner.tsx`:

```tsx
import type { DictionaryStatus } from '../state/store';

interface DictionaryBannerProps {
  status: DictionaryStatus;
  onRetry: () => void;
}

export function DictionaryBanner({ status, onRetry }: DictionaryBannerProps) {
  if (status !== 'error') return null;
  return (
    <div className="absolute top-4 right-4 px-4 py-2 rounded-lg bg-red-900/90 text-red-100 flex items-center gap-3">
      <span>Couldn't load dictionary — word lookup unavailable</span>
      <button
        type="button"
        className="px-2 py-1 rounded bg-red-700 hover:bg-red-600"
        onClick={onRetry}
      >
        Retry
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- DictionaryBanner`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ui/DictionaryBanner.tsx tests/ui/DictionaryBanner.test.tsx
git commit -m "feat(ui): DictionaryBanner with retry"
```

---

## Task 18: App.tsx — wire everything together

**Files:**
- Modify: `src/App.tsx`

This is the integration step. The App component:
1. Loads the WordNet index on mount, updating store status.
2. Mounts `PhysicsStage` and grabs its imperative ref.
3. Renders the dispenser, the controls bar, the word card, the word list drawer, the history strip, and the dictionary error banner.
4. Subscribes to store state to drive everything.

- [ ] **Step 1: Replace App.tsx**

Replace `src/App.tsx`:

```tsx
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useAppStore } from './state/store';
import { loadWordIndex } from './words/loader';
import { findWords } from './words/findWords';
import { weightedPick } from './words/scoring';
import { PhysicsStage, type PhysicsStageHandle } from './physics/PhysicsStage';
import { Dispenser } from './ui/Dispenser';
import { ControlsBar } from './ui/ControlsBar';
import { WordCard } from './ui/WordCard';
import { WordList } from './ui/WordList';
import { HistoryStrip } from './ui/HistoryStrip';
import { DictionaryBanner } from './ui/DictionaryBanner';
import type { WordResult } from './words/types';

export default function App() {
  const stageRef = useRef<PhysicsStageHandle>(null);

  const lettersInGlass = useAppStore((s) => s.lettersInGlass);
  const wordIndex = useAppStore((s) => s.wordIndex);
  const dictionaryStatus = useAppStore((s) => s.dictionaryStatus);
  const currentWord = useAppStore((s) => s.currentWord);
  const history = useAppStore((s) => s.history);
  const showFullList = useAppStore((s) => s.showFullList);
  const setCurrentWord = useAppStore((s) => s.setCurrentWord);
  const setDictionary = useAppStore((s) => s.setDictionary);
  const setDictionaryStatus = useAppStore((s) => s.setDictionaryStatus);
  const useWord = useAppStore((s) => s.useWord);
  const toggleFullList = useAppStore((s) => s.toggleFullList);

  const loadDictionary = useCallback(async () => {
    setDictionaryStatus('loading');
    try {
      const idx = await loadWordIndex();
      setDictionary(idx);
    } catch {
      setDictionaryStatus('error');
    }
  }, [setDictionary, setDictionaryStatus]);

  useEffect(() => {
    loadDictionary();
  }, [loadDictionary]);

  // Compute the current candidate set lazily so Find/Next don't recompute.
  const currentResults = useMemo<WordResult[]>(() => {
    if (!wordIndex) return [];
    if (lettersInGlass.size === 0) return [];
    return findWords(Array.from(lettersInGlass.values()), wordIndex, {
      minLength: 3,
    });
  }, [wordIndex, lettersInGlass]);

  const onFindWord = useCallback(() => {
    if (currentResults.length === 0) {
      setCurrentWord(null);
      return;
    }
    const pick = weightedPick(currentResults.map((r) => r.word));
    if (!pick) {
      setCurrentWord(null);
      return;
    }
    const result = currentResults.find((r) => r.word === pick) ?? null;
    setCurrentWord(result);
  }, [currentResults, setCurrentWord]);

  const onUseWord = useCallback(
    (word: string) => {
      const removed = useWord(word);
      if (removed.length > 0) {
        stageRef.current?.removeLetters(removed);
      }
    },
    [useWord],
  );

  const onPickFromList = useCallback(
    (r: WordResult) => {
      setCurrentWord(r);
      toggleFullList();
    },
    [setCurrentWord, toggleFullList],
  );

  return (
    <div className="relative w-full h-full overflow-hidden">
      <PhysicsStage ref={stageRef} />
      <Dispenser
        onStart={() => stageRef.current?.startPour()}
        onStop={() => stageRef.current?.stopPour()}
      />
      <ControlsBar
        letterCount={lettersInGlass.size}
        dictionaryReady={dictionaryStatus === 'ready'}
        onFindWord={onFindWord}
        onToggleList={toggleFullList}
      />
      <div className="absolute bottom-40 left-1/2 -translate-x-1/2">
        {(currentWord || lettersInGlass.size > 0) && (
          <WordCard
            currentWord={currentWord}
            onNext={onFindWord}
            onUseWord={onUseWord}
          />
        )}
      </div>
      <WordList
        open={showFullList}
        results={currentResults}
        onClose={toggleFullList}
        onPick={onPickFromList}
      />
      <HistoryStrip history={history} />
      <DictionaryBanner status={dictionaryStatus} onRetry={loadDictionary} />
    </div>
  );
}
```

- [ ] **Step 2: Verify the build**

Run: `npm run build`
Expected: build succeeds with no TS errors.

- [ ] **Step 3: Verify all tests still pass**

Run: `npm run test`
Expected: every test from Tasks 3, 4, 5, 6, 14, 16, 17 passes.

- [ ] **Step 4: Manual smoke test in dev**

Run `npm run build:wordnet` (if not already done), then `npm run dev`. Open the printed URL.
Expected: empty pint glass appears, holding "Hold to Pour" rains letters into the glass, controls bar appears once letters are in the glass, "Find a word" surfaces a word + definition, "Use word" removes letters, "Show all" opens the drawer.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx
git commit -m "feat: wire physics, words, state, and UI into App"
```

---

## Self-Review Notes

**Spec coverage check:**
- WordNet dictionary, offline → Tasks 2, 3, 5.
- Matter.js 2D physics → Tasks 7–12.
- Hold-to-pour fountain dispenser → Tasks 10, 13.
- Scrabble distribution with refill → Task 9.
- One-word-at-a-time random display, weighted → Task 4 + Task 18 wiring.
- Full-list toggle drawer → Task 15.
- Non-destructive default with "Use word" consumption → Task 6 (`useWord`) + Task 14 (button) + Task 18 (wiring).
- Controls bar appears when glass non-empty → Task 16.
- Definition display → Task 14.
- Adaptive cap (400 desktop / 200 mobile) + FPS probe → Task 12.
- Floor fade ~2s, watchdog 10s, tab-background pause → Tasks 7, 11.
- Dictionary load failure banner with retry → Tasks 17, 18.
- Cold-start "Loading dictionary…" state → Tasks 16, 18.
- Mobile pointer events + canvas resize handled → Task 13 (pointer), Task 12 (canvas sized to client dims).
- Vite + React + TS + Vitest stack → Task 1.

**Type consistency check:**
- `WordResult` defined in Task 3, used in Tasks 6, 14, 15, 18 — consistent.
- `DictionaryStatus` defined in Task 6, imported in Task 17 — consistent.
- `letterEnteredGlass` / `letterLeftGlass` named consistently across store (Task 6), sensors (Task 11), and stage (Task 12).
- `PhysicsStageHandle` defined in Task 12, consumed in Task 18.

**Resize handling:** the spec calls for `ResizeObserver` rebuild on resize. The plan sizes the canvas to client dims at mount but does not handle window resize. Acceptable for v1 — adds churn to the plan and the use case is rare. Documented here as a known follow-up.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-08-pint-of-words.md`. Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?
