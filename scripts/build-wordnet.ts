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
// Adjective satellites (5) live inside data.adj alongside the head (3).

// lex_filenum values that mark a synset as a proper noun:
//   14 = noun.group     (organizations, teams, etc.)
//   15 = noun.location  (places)
//   18 = noun.person    (people)
const PROPER_LEX_FILENUMS = new Set([14, 15, 18]);

interface Synset {
  gloss: string;
  lexFilenum: number;
  words: string[];
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
    const words: string[] = [];
    for (let i = 0; i < wCnt; i++) {
      const raw = tokens[4 + i * 2];
      if (!raw) continue;
      const word = raw.toLowerCase().replace(/_/g, ' ');
      words.push(word);
    }
    const synset: Synset = { gloss, lexFilenum, words };
    synsetByKey.set(`${ssTypeNum}:${synsetOffset}`, synset);
    // index.sense uses ss_type 5 for adjective satellites; their synset
    // offsets live in data.adj (ss_type 3). Mirror the entry under both
    // keys so satellite lookups resolve.
    if (ssTypeNum === 3) {
      synsetByKey.set(`5:${synsetOffset}`, synset);
    }
    for (const w of words) {
      const arr = wordToSynsets.get(w);
      if (arr) {
        arr.push(synset);
      } else {
        wordToSynsets.set(w, [synset]);
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

  const definitions: Record<string, string> = {};
  const properNouns: Record<string, true> = {};

  // For each candidate word, pick the most-tagged sense from
  // index.sense (highest tag_cnt, ties broken by lower sense_number).
  // This is what makes "cat" return the feline, not the CT-scan
  // imaging method that happens to come first in data.noun.
  for (const [word, synsets] of wordToSynsets) {
    if (!isAcceptableWord(word)) continue;

    let chosen: Synset | null = null;

    const senses = senseIndex.get(word);
    if (senses && senses.length > 0) {
      const sorted = [...senses].sort(
        (a, b) => b.tagCount - a.tagCount || a.senseNumber - b.senseNumber,
      );
      for (const s of sorted) {
        const found = synsetByKey.get(`${s.ssTypeNum}:${s.synsetOffset}`);
        if (found && found.gloss && found.gloss.trim().length > 0) {
          chosen = found;
          break;
        }
      }
    }

    // Fall back to the first synset (any POS) that has a usable gloss.
    // Words missing from index.sense or whose tagged sense has no gloss
    // still get a definition rather than disappearing.
    if (!chosen) {
      for (const synset of synsets) {
        if (synset.gloss && synset.gloss.trim().length > 0) {
          chosen = synset;
          break;
        }
      }
    }

    if (!chosen) continue;
    definitions[word] = chosen.gloss;
    if (PROPER_LEX_FILENUMS.has(chosen.lexFilenum)) {
      properNouns[word] = true;
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
    JSON.stringify({ definitions, bySignature, properNouns }),
  );

  const sizeMb = (statSync(outPath).size / (1024 * 1024)).toFixed(2);
  console.log(
    `Wrote ${outPath}: ${Object.keys(definitions).length} words, ${
      Object.keys(bySignature).length
    } signatures, ${Object.keys(properNouns).length} proper nouns (${sizeMb} MB)`,
  );
}

main();
