export interface WordIndex {
  /**
   * Map from lowercase lookup key to an ordered list of glosses
   * (most-tagged sense first). Most words have one entry; common
   * words may have up to MAX_SENSES.
   */
  definitions: Record<string, string[]>;
  /**
   * Optional override casing for entries WordNet stores with
   * non-lowercase letters — proper nouns ("Paris", "Reagan") and
   * acronyms ("NASA", "FBI"). Missing key = render the lowercase
   * lookup key as-is.
   */
  displayForms?: Record<string, string>;
  bySignature: Record<string, string[]>;
}

export interface FindWordsOpts {
  minLength?: number;
}

export interface WordResult {
  /** Lowercase lookup key — what the cup spells. */
  word: string;
  /** Ordered list of glosses, primary sense first. Always at least one. */
  definitions: string[];
  /** Display casing override (acronym / proper noun). */
  display?: string;
}
