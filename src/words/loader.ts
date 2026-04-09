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
