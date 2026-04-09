# WordPint

**Pour a Pint, Learn a Word.**

A static web app where you pour Scrabble letter tiles from a draft tap into a
pint glass with realistic 2D physics, and the app surfaces words you can spell
from the letters currently in the cup, complete with definitions from
[Princeton WordNet](https://wordnet.princeton.edu/).

![tap → cup → words](docs/superpowers/specs/2026-04-08-pint-of-words-design.md)

## What it does

1. **Hold the tap** to pour letters into the pint glass. Letters fall with
   real physics, stack, and overflow.
2. **Words you can spell appear below.** Click `Next Word →` to use the
   featured word (which removes those letters from the cup) and reveal the
   next one.
3. **Browse all words** in a paginated grid, **sort** by random / longest /
   shortest / A→Z, and **empty the cup** at any time.
4. **Running tab** at the bottom keeps the words you've used this session;
   click any of them to re-open the definition.

## Tech

- **Vite + React + TypeScript** — static SPA, no backend
- **Matter.js** — 2D physics for the pint glass and falling letter tiles
- **Zustand** — single source of truth for cup contents, current word,
  history, and dictionary state
- **Tailwind CSS** — monochrome paper/ink theme with a single amber accent
- **Vitest + React Testing Library** — unit tests for the word engine,
  store, and UI components
- **WordNet** — preprocessed at build time into a single ~6.5 MB JSON
  shipped with the bundle

## Getting started

```bash
# Install dependencies
npm install

# Build the WordNet dictionary (one-time, generates public/wordnet.json)
npm run build:wordnet

# Run the dev server
npm run dev

# Run the tests
npm run test

# Production build
npm run build
```

## Architecture

Three loosely-coupled subsystems:

- **`src/physics/`** — Matter.js engine, pint glass body, letter tile factory
  with a Scrabble-distribution bag, dispenser timing, in-cup sensors, and a
  React `PhysicsStage` wrapper. Knows nothing about words.
- **`src/words/`** — pure TS word engine: WordNet loader, anagram subset
  search via a sorted-letter signature index, length/rarity scoring,
  definition lookup. Knows nothing about pixels.
- **`src/ui/`** — React shell: branded draft tap, hero word card, browse-all
  grid, running tab, page footer, definition modal.

The Zustand store in `src/state/store.ts` is the single bridge between
physics (which writes letter ins/outs) and the UI/word engine (which reads
the current cup contents).

## Credits

- **Definitions** — [Princeton WordNet](https://wordnet.princeton.edu/)
- **Created by** — [John Choudhari](https://www.linkedin.com/in/johnchoudhari/)

## License

MIT
