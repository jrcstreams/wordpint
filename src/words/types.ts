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
