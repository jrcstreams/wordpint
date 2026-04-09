import type { WordIndex } from './types';

const DEFAULT_URL = `${import.meta.env.BASE_URL}wordnet.json`;

export async function loadWordIndex(url = DEFAULT_URL): Promise<WordIndex> {
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
