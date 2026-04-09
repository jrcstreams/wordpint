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
      const proper = index.properNouns?.[word] === true;
      results.push({ word, definition, proper });
    }
  }

  return results;
}
