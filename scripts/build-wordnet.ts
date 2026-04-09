import { readFileSync, writeFileSync, mkdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

// wordnet-db is a CommonJS package with no type definitions; load it via createRequire
// so we reliably get its `path` export under ESM.
const require = createRequire(import.meta.url);
const wndb: { path: string; files?: string[] } = require('wordnet-db');

const POS_FILES = ['data.noun', 'data.verb', 'data.adj', 'data.adv'];

function signature(word: string): string {
  return word.split('').sort().join('');
}

function parseDataFile(contents: string): Array<{ word: string; gloss: string }> {
  const out: Array<{ word: string; gloss: string }> = [];
  for (const line of contents.split('\n')) {
    if (!line || line.startsWith(' ')) continue; // license header lines start with space
    const glossSplit = line.split('|');
    if (glossSplit.length < 2) continue;
    const header = glossSplit[0];
    const gloss = glossSplit[1].trim().split(';')[0].trim(); // first sense only
    const tokens = header.split(/\s+/);
    // tokens: synset_offset lex_filenum ss_type w_cnt word lex_id [word lex_id]... p_cnt ...
    const wCntHex = tokens[3];
    const wCnt = parseInt(wCntHex, 16);
    for (let i = 0; i < wCnt; i++) {
      const raw = tokens[4 + i * 2];
      if (!raw) continue;
      const word = raw.toLowerCase().replace(/_/g, ' ');
      // Skip multi-word entries and anything with non a-z chars
      if (!/^[a-z]+$/.test(word)) continue;
      if (word.length < 2 || word.length > 15) continue;
      // Skip pseudo-words made of a single repeated letter (Roman
      // numerals like "iii"/"xx", filler glyphs like "aaa", etc.)
      if (new Set(word).size === 1) continue;
      // Skip an empty/whitespace-only gloss so the runtime fallback
      // never has to render "no definition on file" for a real entry.
      if (!gloss || gloss.trim().length === 0) continue;
      out.push({ word, gloss });
    }
  }
  return out;
}

function main() {
  const definitions: Record<string, string> = {};
  for (const file of POS_FILES) {
    const path = join(wndb.path, file);
    const contents = readFileSync(path, 'utf8');
    const entries = parseDataFile(contents);
    for (const { word, gloss } of entries) {
      // TODO: smarter sense selection (e.g., index.sense tag counts) — first-seen is good enough for v1
      if (!definitions[word]) definitions[word] = gloss;
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
  writeFileSync(outPath, JSON.stringify({ definitions, bySignature }));

  const sizeMb = (statSync(outPath).size / (1024 * 1024)).toFixed(2);
  console.log(
    `Wrote ${outPath}: ${Object.keys(definitions).length} words, ${
      Object.keys(bySignature).length
    } signatures (${sizeMb} MB)`,
  );
}

main();
