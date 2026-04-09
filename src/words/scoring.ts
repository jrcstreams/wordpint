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
