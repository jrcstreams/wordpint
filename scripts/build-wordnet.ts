import { readFileSync, writeFileSync, mkdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

// wordnet-db is a CommonJS package with no type definitions; load it via createRequire
// so we reliably get its `path` export under ESM.
const require = createRequire(import.meta.url);
const wndb: { path: string } = require('wordnet-db');

// WordNet ss_type values from index.sense lex_sense:
//   1 = noun, 2 = verb, 3 = adjective, 4 = adverb, 5 = adjective satellite
// In data files the same value is encoded as a letter (n/v/a/r/s).
// Adjective satellites (5) live inside data.adj alongside the head (3),
// so we mirror data.adj entries under both keys.

// Maximum number of senses to keep per word. Tuned for cost: most
// common words have 1-3 dominant senses; the long tail of obscure
// senses bloats the JSON without giving the user anything useful.
const MAX_SENSES = 3;

interface WordEntry {
  /** Original casing as it appears in the WordNet data file (with spaces). */
  display: string;
  /** Lowercased lookup key. */
  lower: string;
}

interface Synset {
  gloss: string;
  lexFilenum: number;
  ssTypeNum: number;
  synsetOffset: string;
  words: WordEntry[];
}

const POS_FILES: Array<{ file: string; ssTypeNum: number }> = [
  { file: 'data.noun', ssTypeNum: 1 },
  { file: 'data.verb', ssTypeNum: 2 },
  { file: 'data.adj', ssTypeNum: 3 },
  { file: 'data.adv', ssTypeNum: 4 },
];

function parseDataFile(
  contents: string,
  ssTypeNum: number,
  synsetByKey: Map<string, Synset>,
  wordToSynsets: Map<string, Synset[]>,
) {
  for (const line of contents.split('\n')) {
    if (!line || line.startsWith(' ')) continue; // license header lines start with space
    const glossSplit = line.split('|');
    if (glossSplit.length < 2) continue;
    const header = glossSplit[0];
    const gloss = glossSplit[1].trim().split(';')[0].trim(); // first sense only
    const tokens = header.split(/\s+/);
    // tokens: synset_offset lex_filenum ss_type w_cnt word lex_id [word lex_id]... p_cnt ...
    const synsetOffset = tokens[0];
    const lexFilenum = parseInt(tokens[1], 10);
    const wCnt = parseInt(tokens[3], 16);
    const words: WordEntry[] = [];
    for (let i = 0; i < wCnt; i++) {
      const raw = tokens[4 + i * 2];
      if (!raw) continue;
      const display = raw.replace(/_/g, ' ');
      words.push({ display, lower: display.toLowerCase() });
    }
    const synset: Synset = {
      gloss,
      lexFilenum,
      ssTypeNum,
      synsetOffset,
      words,
    };
    synsetByKey.set(`${ssTypeNum}:${synsetOffset}`, synset);
    if (ssTypeNum === 3) {
      // index.sense uses ss_type 5 for adjective satellites; their
      // synset offsets live in data.adj. Mirror under both keys.
      synsetByKey.set(`5:${synsetOffset}`, synset);
    }
    for (const { lower } of words) {
      const arr = wordToSynsets.get(lower);
      if (arr) {
        arr.push(synset);
      } else {
        wordToSynsets.set(lower, [synset]);
      }
    }
  }
}

interface SenseEntry {
  ssTypeNum: number;
  synsetOffset: string;
  senseNumber: number;
  tagCount: number;
}

function parseIndexSense(contents: string): Map<string, SenseEntry[]> {
  const out = new Map<string, SenseEntry[]>();
  for (const line of contents.split('\n')) {
    if (!line) continue;
    const parts = line.split(/\s+/);
    if (parts.length < 4) continue;
    // sense_key  synset_offset  sense_number  tag_cnt
    // sense_key = lemma%lex_sense
    // lex_sense = ss_type:lex_filenum:lex_id:head_word:head_id
    const senseKey = parts[0];
    const synsetOffset = parts[1];
    const senseNumber = parseInt(parts[2], 10);
    const tagCount = parseInt(parts[3], 10);

    const pct = senseKey.indexOf('%');
    if (pct < 0) continue;
    const lemma = senseKey.slice(0, pct).toLowerCase().replace(/_/g, ' ');
    const lexSense = senseKey.slice(pct + 1);
    const ssTypeNum = parseInt(lexSense.split(':')[0], 10);
    if (!ssTypeNum) continue;

    const arr = out.get(lemma);
    const entry: SenseEntry = { ssTypeNum, synsetOffset, senseNumber, tagCount };
    if (arr) {
      arr.push(entry);
    } else {
      out.set(lemma, [entry]);
    }
  }
  return out;
}

function isAcceptableWord(word: string): boolean {
  if (!/^[a-z]+$/.test(word)) return false;
  if (word.length < 2 || word.length > 15) return false;
  // Skip pseudo-words made of a single repeated letter (Roman
  // numerals like "iii"/"xx", filler glyphs like "aaa", etc.)
  if (new Set(word).size === 1) return false;
  return true;
}

function signature(word: string): string {
  return word.split('').sort().join('');
}

function main() {
  const synsetByKey = new Map<string, Synset>();
  const wordToSynsets = new Map<string, Synset[]>();

  for (const { file, ssTypeNum } of POS_FILES) {
    const path = join(wndb.path, file);
    const contents = readFileSync(path, 'utf8');
    parseDataFile(contents, ssTypeNum, synsetByKey, wordToSynsets);
  }

  const senseIndex = parseIndexSense(
    readFileSync(join(wndb.path, 'index.sense'), 'utf8'),
  );

  const definitions: Record<string, string[]> = {};
  const displayForms: Record<string, string> = {};
  let displayOverrides = 0;

  // For each candidate word, build an ordered list of synsets:
  //   1. Sorted from index.sense by tag_cnt desc (with sense_number as tiebreaker)
  //   2. Padded with any remaining synsets that mention the word, in
  //      data-file order, for lemmas missing from index.sense.
  // Take the top MAX_SENSES, store their glosses in order, and pull
  // the display form from the primary (top-ranked) sense.
  for (const [word, synsetsForWord] of wordToSynsets) {
    if (!isAcceptableWord(word)) continue;

    const ranked: Synset[] = [];
    const seen = new Set<Synset>();

    const senses = senseIndex.get(word);
    if (senses && senses.length > 0) {
      const sortedSenses = [...senses].sort(
        (a, b) => b.tagCount - a.tagCount || a.senseNumber - b.senseNumber,
      );
      for (const s of sortedSenses) {
        const found = synsetByKey.get(`${s.ssTypeNum}:${s.synsetOffset}`);
        if (!found) continue;
        if (!found.gloss || found.gloss.trim().length === 0) continue;
        if (seen.has(found)) continue;
        ranked.push(found);
        seen.add(found);
        if (ranked.length >= MAX_SENSES) break;
      }
    }

    if (ranked.length < MAX_SENSES) {
      for (const synset of synsetsForWord) {
        if (!synset.gloss || synset.gloss.trim().length === 0) continue;
        if (seen.has(synset)) continue;
        ranked.push(synset);
        seen.add(synset);
        if (ranked.length >= MAX_SENSES) break;
      }
    }

    if (ranked.length === 0) continue;

    definitions[word] = ranked.map((s) => s.gloss);

    // Display form: take it from the primary sense's word list. If
    // WordNet stored the lemma with non-lowercase characters (Paris,
    // NASA, McDonald), capture that exact form so the UI can render
    // proper nouns and acronyms correctly. If the casing matches the
    // lowercase key, no override is needed.
    const primary = ranked[0];
    const primaryEntry = primary.words.find((w) => w.lower === word);
    if (primaryEntry && primaryEntry.display !== word) {
      displayForms[word] = primaryEntry.display;
      displayOverrides += 1;
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
  writeFileSync(
    outPath,
    JSON.stringify({ definitions, displayForms, bySignature }),
  );

  const sizeMb = (statSync(outPath).size / (1024 * 1024)).toFixed(2);
  let totalSenses = 0;
  let multiSense = 0;
  for (const arr of Object.values(definitions)) {
    totalSenses += arr.length;
    if (arr.length > 1) multiSense += 1;
  }
  console.log(
    `Wrote ${outPath}: ${Object.keys(definitions).length} words, ` +
      `${Object.keys(bySignature).length} signatures, ` +
      `${totalSenses} senses (${multiSense} multi-sense), ` +
      `${displayOverrides} display overrides (${sizeMb} MB)`,
  );
}

main();
