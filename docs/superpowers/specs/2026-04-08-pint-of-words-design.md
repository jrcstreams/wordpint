# Pint of Words — Design Spec

**Date:** 2026-04-08
**Status:** Draft, awaiting user review
**Project directory:** `cup-of-words/` (directory name retained; product name is "Pint of Words")

## Overview

Pint of Words is a static single-page web app where the user pours randomized letter tiles from a dispenser into an on-screen pint glass with realistic 2D physics, then asks the app to surface words that can be formed from the letters currently in the glass. Words are displayed one at a time with their definitions, with an optional drawer that lists all formable words. The user can optionally "use" a word, which removes the matching letters from the glass.

The experience is the product. The physics, the dispenser, the glass, and the feel of letters cascading and overflowing must be polished and tactile.

## Goals

- A delightful, tactile letter-pouring experience with believable 2D physics, stacking, and overflow.
- Reliable word lookup against an open-source dictionary with definitions, fully offline.
- Zero backend; deployable as a static site.
- Mobile-friendly with no perceptible jank.

## Non-goals

- User accounts, persistence across sessions, sharing, or leaderboards.
- Multiplayer.
- 3D rendering.
- Full screen-reader choreography of the physics canvas (basic keyboard + ARIA labels only).
- Multi-language dictionaries (English/WordNet only for v1).

## Key decisions

| Decision | Choice | Rationale |
|---|---|---|
| Dictionary | **WordNet** (Princeton, open-source) | ~150k words with definitions, fully offline, no API keys, no rate limits |
| Physics | **Matter.js, 2D** | Convincing realism + overflow without 3D complexity; performant on any device |
| Dispenser | **Hopper/fountain only** (hold-to-pour) | Matches the "magic of seeing what emerges" intent; one clear interaction |
| Letter distribution | **Scrabble tile bag** (refills when empty) | Standard, trusted, yields good word-forming odds |
| Word display | **One word at a time, weighted random**, with toggle to reveal full ranked list | Preserves discovery; full list available for power users |
| Letter consumption | **Non-destructive by default**; "Use word" button consumes letters | Sandbox by default, game-like progression on demand |
| Stack | **Vite + React + TypeScript**, static SPA | Component ergonomics + type safety, zero backend, deploys anywhere |

## Architecture

Three loosely-coupled subsystems:

1. **Physics stage** (Matter.js + `<canvas>`) — owns the world: gravity, the pint glass, the dispenser, and every letter body. Exposes a thin imperative API (`spawnLetter`, `clearGlass`, `removeLetters(ids)`, `getLettersInGlass()`, `startPour`, `stopPour`) and emits events (`letterEnteredGlass`, `letterLeftGlass`).

2. **Word engine** (pure TypeScript) — owns the WordNet data. Given a multiset of letters, returns valid words and their definitions. Built on a preprocessed WordNet index loaded once at startup. Exposes `findWords(letters, opts)` and `getDefinition(word)`. Pure functions, fully unit-testable, no React, no DOM.

3. **React UI shell** — dispenser button, controls bar (appears once glass is non-empty), word card, full-list drawer, history strip. Owns user-facing state via a Zustand store. Talks to physics through refs and to the word engine through plain function calls.

**Boundary invariant:** the word engine never knows about pixels, and the physics never knows about words. The React shell is the only thing that touches both.

## File layout

```
src/
  physics/
    world.ts            // Matter.js engine setup, gravity, walls, render loop
    pintGlass.ts        // builds the pint glass body (compound shape) + overflow zone
    dispenser.ts        // hopper geometry + spawn logic, Scrabble bag
    letters.ts          // letter body factory (shape, mass, friction, sprite)
    sensors.ts          // "in-glass" sensor, overflow sensor, emits events
    PhysicsStage.tsx    // React wrapper: mounts canvas, exposes imperative ref
  words/
    wordnet/            // preprocessed WordNet data
    loader.ts           // async load + parse on app start
    index.ts            // trie / signature index for fast subset lookup
    findWords.ts        // findWords(letters, opts) — anagram subset search
    definitions.ts      // getDefinition(word)
    scoring.ts          // weight by length & rarity for "interesting" pick
  state/
    store.ts            // Zustand: glass state, current word, mode flags, history
  ui/
    Dispenser.tsx       // hold-to-pour button
    ControlsBar.tsx     // appears when glass non-empty: "Find a word", toggles
    WordCard.tsx        // current word + definition + "Use word" + "Next"
    WordList.tsx        // full-list drawer
    HistoryStrip.tsx    // words used this session
    App.tsx
  main.tsx
  index.css
scripts/
  build-wordnet.ts      // build-time: WordNet → compact JSON shipped in /public
public/
  wordnet.json          // preprocessed dictionary (gzip-served)
```

## Data flow

### Startup
1. App mounts → `wordnet.json` fetched async (loading state shown). Word engine builds in-memory index.
2. `PhysicsStage` mounts → Matter.js world boots, pint glass + dispenser bodies created, render loop starts. Glass empty.
3. UI shows the dispenser; controls bar hidden.

### Pouring letters
1. User presses & holds the dispenser → React calls `physicsRef.current.startPour()`.
2. Physics spawns a letter every ~80–120ms, drawn from a Scrabble bag (refills when empty). Each letter is a Matter body with the glyph rendered as a sprite.
3. Letters fall, collide, settle in the glass. The "in-glass" sensor fires `letterEnteredGlass({id, char})` → store updates `lettersInGlass: Map<id, char>`.
4. Once `lettersInGlass.size > 0`, the controls bar slides in.
5. Overflow: letters that miss the glass or spill over the rim trip the floor sensor → `letterLeftGlass` → removed from `lettersInGlass`. Visual sprites fade out after ~2s so the floor doesn't accumulate.

### Finding a word
1. User clicks "Find a word" → React reads `lettersInGlass`, calls `findWords(letters, {minLength: 3, weighted: true})`.
2. Word engine returns a ranked list. Store picks one (random pick weighted toward longer/rarer) and sets `currentWord`.
3. `WordCard` renders the word + definition. "Next" cycles to another from the same result set without recomputing.
4. "Show full list" toggle reveals `WordList` drawer with all results, sortable by length.

### Using a word
1. User clicks "Use word" → store dispatches `useWord(word)`.
2. Store determines which letter ids in `lettersInGlass` map to the word's chars (greedy match).
3. Store calls `physicsRef.current.removeLetters(ids)` → physics animates them out (small upward poof + fade) and removes the bodies.
4. Store appends the word to `history`, clears `currentWord`, recomputes results from the new pool.

**Single source of truth:** `lettersInGlass` in the store. Physics writes; the word engine reads. No direct physics → word engine path.

## Error handling & edge cases

### Word engine
- **Dictionary load failure** (offline, 404, corrupt): non-blocking banner "Couldn't load dictionary — word lookup unavailable", controls bar disabled, dispenser still works (sandbox mode). Banner has a retry button.
- **No words found** for current letters: `WordCard` empty state ("No words yet — try pouring a few more letters"). Not an error.
- **`useWord` letter mismatch** (race: letters spilled between display and click): greedy matcher consumes only present letters; if word can no longer be formed, the action is a silent no-op and the card refreshes.

### Physics
- **Letters stuck on dispenser lip**: any letter alive >10s without entering the glass is removed by a watchdog.
- **Glass overflows visibly**: by design. Letters past the rim leave `lettersInGlass` (no longer sensed), so the word engine doesn't see them.
- **Performance ceiling — adaptive cap on active bodies**:
  - Desktop: **400** active bodies.
  - Mobile / low-power (detected via `navigator.hardwareConcurrency < 4` or a 1-second FPS probe at startup): **200** active bodies.
  - When the cap is reached, dispenser refuses to spawn until letters are removed. The 2s floor-fade keeps spilled letters from accumulating regardless of cap.
- **Tab backgrounded**: Matter.js render loop pauses on `document.visibilitychange`.

### UI
- **Cold-start race**: pouring is allowed before WordNet finishes loading. The controls bar shows a "Loading dictionary…" spinner instead of "Find a word" until ready, then flips active.
- **Mobile**: hold-to-pour uses `pointerdown`/`pointerup`. Canvas sized via `ResizeObserver`; physics walls rebuilt on resize.

## Testing strategy

### Heavily tested (Vitest unit tests)
- `words/findWords.ts` — anagram subset search: exact match, subset match, double letters, min-length filter, empty input, no-match input, large-pool stress.
- `words/scoring.ts` — weighting: longer words rank higher, rarer rank higher, deterministic tiebreak.
- `words/loader.ts` — WordNet parser: valid load, malformed rejection, definition lookup.
- `state/store.ts` — reducers: `letterEnteredGlass` adds, `letterLeftGlass` removes, `useWord` consumes correct ids, `useWord` no-op when letters missing.

### Lightly tested (React Testing Library)
- `ControlsBar` visibility tied to `lettersInGlass.size`.
- `WordCard` empty state on no results.
- `WordList` drawer open/close.
- Dictionary-load-failure banner appears when loader rejects.

### Not tested (manual / visual)
- Physics behavior — falling, collisions, stacking, overflow. Tuned by feel via a `/physics-sandbox` dev route.
- Look and feel — dispenser, glass, sprites, transitions. Manual review.

### No e2e tests on day one
Playwright against a physics canvas is brittle and high-cost for a project this size. Revisit if the project grows.

## Open items

None at spec time. Implementation plan will surface concrete sub-tasks (WordNet preprocessing format, sprite generation pipeline, exact dispenser geometry).
