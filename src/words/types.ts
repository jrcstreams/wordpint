export interface WordIndex {
  definitions: Record<string, string>;
  bySignature: Record<string, string[]>;
  /**
   * Set of words that come from a proper-noun synset (people, places,
   * organizations). Used by the UI to capitalize them on display.
   * Optional so older builds of wordnet.json still load.
   */
  properNouns?: Record<string, true>;
}

export interface FindWordsOpts {
  minLength?: number;
}

export interface WordResult {
  word: string;
  definition: string;
  /** True for proper nouns — UI should capitalize the first letter. */
  proper?: boolean;
}
