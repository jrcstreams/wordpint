import type { WordIndex } from './types';

export function getDefinition(
  word: string,
  index: WordIndex,
): string[] | null {
  return index.definitions[word.toLowerCase()] ?? null;
}
