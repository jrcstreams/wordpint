import { useEffect, useMemo, useState } from 'react';
import type { WordResult } from '../words/types';

interface WordsPanelProps {
  results: WordResult[];
  letterCount: number;
  dictionaryReady: boolean;
  /**
   * True while the user is actively pouring. The hero word is held in
   * place (or empty for brand-new pours) until this flips back to
   * false — that way the first surfaced word reflects the full letter
   * set, not the first 3-letter combo that landed.
   */
  pouring: boolean;
  onPick: (word: string) => void;
  onEmptyCup: () => void;
}

const PAGE_SIZE = 4;

export type SortMode = 'random' | 'longest' | 'shortest' | 'alpha';

const SORT_LABELS: Record<SortMode, string> = {
  random: 'Random',
  longest: 'Longest',
  shortest: 'Shortest',
  alpha: 'A → Z',
};

function seededShuffle<T>(arr: T[], seed: number): T[] {
  const out = arr.slice();
  let state = seed || 1;
  for (let i = out.length - 1; i > 0; i--) {
    state = (state * 9301 + 49297) % 233280;
    const j = Math.floor((state / 233280) * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function displayWord(w: WordResult): string {
  // Use the explicit display form when WordNet stored the entry with
  // non-lowercase letters — covers acronyms (NASA) and proper nouns
  // (Paris). Otherwise the lowercase lookup key is the display.
  return w.display ?? w.word;
}

function fingerprint(results: WordResult[]): number {
  if (results.length === 0) return 0;
  return (
    results.length * 31 +
    (results[0].word.charCodeAt(0) ?? 0) +
    (results[results.length - 1].word.charCodeAt(0) ?? 0)
  );
}

export function WordsPanel({
  results,
  letterCount,
  dictionaryReady,
  pouring,
  onPick,
  onEmptyCup,
}: WordsPanelProps) {
  const [sort, setSort] = useState<SortMode>('random');
  const [showAll, setShowAll] = useState(false);
  const [page, setPage] = useState(0);
  // Tracks which word the hero is "locked" to. Without this, every
  // letter that lands in the cup re-sorts the list and flips the hero
  // to whatever sorted[0] is now — looks like the word is jumping
  // ahead. We only change selectedWordKey when the user hits Next Word
  // or when the locked word is no longer spellable from the cup.
  const [selectedWordKey, setSelectedWordKey] = useState<string | null>(null);

  const sorted = useMemo(() => {
    if (results.length === 0) return results;
    switch (sort) {
      case 'longest':
        return [...results].sort(
          (a, b) =>
            b.word.length - a.word.length || a.word.localeCompare(b.word),
        );
      case 'shortest':
        return [...results].sort(
          (a, b) =>
            a.word.length - b.word.length || a.word.localeCompare(b.word),
        );
      case 'alpha':
        return [...results].sort((a, b) => a.word.localeCompare(b.word));
      case 'random':
      default:
        return seededShuffle(results, fingerprint(results));
    }
  }, [results, sort]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));

  useEffect(() => {
    if (page > 0 && page >= pageCount) setPage(0);
  }, [page, pageCount]);

  useEffect(() => {
    setPage(0);
    // Clear the locked word so the next render picks the top entry of
    // the freshly-sorted list — sort changes should flip the hero
    // immediately, not stay anchored on the previous selection.
    setSelectedWordKey(null);
  }, [sort]);

  // The displayed hero word.
  //
  // - While the user is actively pouring, hold whatever was already
  //   locked. If nothing was locked (brand-new pour into an empty
  //   cup), return null and the panel renders a "pouring…" placeholder
  //   instead of snapping to whichever 3-letter combo landed first.
  //   The hero gets picked when pouring stops and the full letter set
  //   is in.
  //
  // - Non-random sorts (longest / shortest / A→Z) always show sorted[0]
  //   LIVE once pouring is done. As the user keeps interacting, the
  //   displayed word updates to the new top of the sort.
  //
  // - Random uses a stable lock (selectedWordKey) so the displayed
  //   word doesn't flicker between unrelated random picks. The lock
  //   falls back to sorted[0] if the locked word is no longer
  //   spellable.
  const heroWord = useMemo<WordResult | null>(() => {
    if (sorted.length === 0) return null;
    if (pouring) {
      if (selectedWordKey) {
        const found = sorted.find((w) => w.word === selectedWordKey);
        if (found) return found;
      }
      return null;
    }
    if (sort !== 'random') return sorted[0];
    if (selectedWordKey) {
      const found = sorted.find((w) => w.word === selectedWordKey);
      if (found) return found;
    }
    return sorted[0];
  }, [sorted, selectedWordKey, sort, pouring]);

  // Keep selectedWordKey in sync with whatever the hero is currently
  // displaying — but only in random mode AND only when pouring has
  // stopped. We deliberately do NOT clear the lock just because the
  // hero is null mid-pour (that null is the "wait for pour to finish"
  // state, not a "no word available" state).
  useEffect(() => {
    if (sort !== 'random') return;
    if (pouring) return;
    if (heroWord && heroWord.word !== selectedWordKey) {
      setSelectedWordKey(heroWord.word);
    } else if (!heroWord && selectedWordKey !== null) {
      setSelectedWordKey(null);
    }
  }, [heroWord, selectedWordKey, sort, pouring]);

  const handleNext = () => {
    if (!heroWord) return;
    onPick(heroWord.word);
    // Clear the lock so the next render picks the new sorted[0] from
    // the post-consumption results.
    setSelectedWordKey(null);
  };

  return (
    <div className="relative flex-1 min-h-0 flex flex-col overflow-hidden">
      {sorted.length === 0 ? (
        <EmptyState
          letterCount={letterCount}
          dictionaryReady={dictionaryReady}
          pouring={pouring}
        />
      ) : showAll ? (
        <GridView
          visible={sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)}
          page={page}
          pageCount={pageCount}
          setPage={setPage}
          sort={sort}
          setSort={setSort}
          letterCount={letterCount}
          onPick={onPick}
          onShowSingle={() => setShowAll(false)}
          onEmptyCup={onEmptyCup}
        />
      ) : heroWord ? (
        <HeroView
          word={heroWord}
          sort={sort}
          setSort={setSort}
          letterCount={letterCount}
          onNext={handleNext}
          onShowAll={() => setShowAll(true)}
          onEmptyCup={onEmptyCup}
        />
      ) : (
        <PouringPlaceholder
          sort={sort}
          setSort={setSort}
          letterCount={letterCount}
          onShowAll={() => setShowAll(true)}
          onEmptyCup={onEmptyCup}
        />
      )}
    </div>
  );
}

/* ============================== Pouring placeholder ============================== */

function PouringPlaceholder({
  sort,
  setSort,
  letterCount,
  onShowAll,
  onEmptyCup,
}: {
  sort: SortMode;
  setSort: (m: SortMode) => void;
  letterCount: number;
  onShowAll: () => void;
  onEmptyCup: () => void;
}) {
  // Shown while a brand-new pour is in progress so we don't snap to
  // the first 3-letter word that lands. Same vertical layout as
  // HeroView so the controls don't shift when the real word slides
  // in.
  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="flex-1 min-h-0 overflow-hidden px-5 flex flex-col">
        <div className="my-auto text-center w-full max-w-xl mx-auto py-2">
          <p className="font-display text-2xl sm:text-3xl font-black text-ink-mute leading-none">
            pouring<span className="pour-dots">…</span>
          </p>
          <p className="mt-3 text-xs sm:text-sm text-ink-mute">
            Picking the best word once your pour finishes.
          </p>
        </div>
      </div>
      <div className="shrink-0 pb-3 sm:pb-3.5 flex justify-center">
        <PrimaryButton onClick={() => {}} disabled>
          Next Word →
        </PrimaryButton>
      </div>

      <div className="shrink-0 px-3 sm:px-4 py-2 sm:py-2.5 flex items-center justify-center gap-1.5 sm:gap-2 border-t border-ink/15">
        <SmallGhostButton onClick={onShowAll}>
          Browse All Words
        </SmallGhostButton>
        <SmallSortPill value={sort} onChange={setSort} />
        {letterCount > 0 && (
          <SmallGhostButton onClick={onEmptyCup} aria-label="Empty the cup">
            Empty Cup
          </SmallGhostButton>
        )}
      </div>
    </div>
  );
}

/* ============================== Hero view ============================== */

function HeroView({
  word,
  sort,
  setSort,
  letterCount,
  onNext,
  onShowAll,
  onEmptyCup,
}: {
  word: WordResult;
  sort: SortMode;
  setSort: (m: SortMode) => void;
  letterCount: number;
  onNext: () => void;
  onShowAll: () => void;
  onEmptyCup: () => void;
}) {
  // Per-word "which sense are we looking at" cursor. Resets to the
  // primary sense whenever the displayed word changes (handled by
  // the key prop on the wrapper, which remounts the component).
  const [defIndex, setDefIndex] = useState(0);
  const senseCount = word.definitions.length;
  const currentDef = word.definitions[defIndex] ?? word.definitions[0] ?? '';
  const showSwipe = senseCount > 1;
  const hasCase = word.display !== undefined;

  return (
    <div
      key={word.word}
      className="hero-in flex-1 min-h-0 flex flex-col"
    >
      {/* Top zone: word + definition.
          The definition has a fixed min-height matching its
          line-clamp-3 max, so the slot the word/def occupies is
          identical for 1, 2, or 3 line definitions. overflow-hidden
          guarantees no scroll: the layout is sized to always fit. */}
      <div className="flex-1 min-h-0 overflow-hidden px-5 flex flex-col">
        <div className="my-auto text-center w-full max-w-xl mx-auto py-2">
          <h3
            className={`font-display font-black tracking-tight text-ink leading-[0.9] text-[clamp(1.4rem,3.8vw,2.125rem)] ${
              hasCase ? '' : 'lowercase'
            }`}
          >
            {displayWord(word)}
          </h3>
          <p className="mt-2 max-w-md mx-auto font-body text-sm sm:text-base leading-snug text-ink-soft line-clamp-2 sm:line-clamp-3 min-h-[40px] sm:min-h-[66px]">
            {currentDef && currentDef.trim().length > 0
              ? currentDef
              : 'No definition on file.'}
          </p>
          {showSwipe && (
            <div className="mt-1.5 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setDefIndex((i) => (i - 1 + senseCount) % senseCount)
                }
                className="text-ink hover:bg-ink/5 rounded-md w-7 h-7 flex items-center justify-center text-base font-bold leading-none transition"
                aria-label="Previous definition"
              >
                ‹
              </button>
              <span className="text-[10px] uppercase tracking-[0.18em] font-bold text-ink-mute tabular-nums">
                definition {defIndex + 1} of {senseCount}
              </span>
              <button
                type="button"
                onClick={() => setDefIndex((i) => (i + 1) % senseCount)}
                className="text-ink hover:bg-ink/5 rounded-md w-7 h-7 flex items-center justify-center text-base font-bold leading-none transition"
                aria-label="Next definition"
              >
                ›
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Primary CTA — lives inside the hero content zone, directly
          under the word/definition so it reads as part of the featured
          word, not as a generic toolbar action. */}
      <div className="shrink-0 pb-3 sm:pb-3.5 flex justify-center">
        <PrimaryButton onClick={onNext}>Next Word →</PrimaryButton>
      </div>

      {/* Secondary actions — below the separator, visually distinct
          from the hero. Smaller sizing so all three always fit on one
          line at any viewport width. */}
      <div className="shrink-0 px-3 sm:px-4 py-2 sm:py-2.5 flex items-center justify-center gap-1.5 sm:gap-2 border-t border-ink/15">
        <SmallGhostButton onClick={onShowAll}>
          Browse All Words
        </SmallGhostButton>
        <SmallSortPill value={sort} onChange={setSort} />
        {letterCount > 0 && (
          <SmallGhostButton onClick={onEmptyCup} aria-label="Empty the cup">
            Empty Cup
          </SmallGhostButton>
        )}
      </div>
    </div>
  );
}

/* ============================== Grid view ============================== */

function GridView({
  visible,
  page,
  pageCount,
  setPage,
  sort,
  setSort,
  letterCount,
  onPick,
  onShowSingle,
  onEmptyCup,
}: {
  visible: WordResult[];
  page: number;
  pageCount: number;
  setPage: (n: number | ((p: number) => number)) => void;
  sort: SortMode;
  setSort: (m: SortMode) => void;
  letterCount: number;
  onPick: (word: string) => void;
  onShowSingle: () => void;
  onEmptyCup: () => void;
}) {
  return (
    <div className="flex-1 min-h-0 flex flex-col px-4 sm:px-6 py-3">
      {/* Cards.
          - auto-rows-min so each row sizes to its content (NOT to fill
            the grid). Without this, when the panel is short on mobile
            the rows shrink to ~50px and the word/def get clipped.
          - Each card has a hard min-height that always fits the word
            plus a 2-3 line definition.
          - The ul itself is flex-1 min-h-0 overflow-y-auto, so if the
            grid is taller than the available panel space the grid
            scrolls INTERNALLY. The page itself never scrolls and the
            pagination row stays pinned below. */}
      <ul className="flex-1 min-h-0 overflow-y-auto grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 auto-rows-min content-start">
        {visible.map((r) => (
          <li key={r.word}>
            <GridCard result={r} onPick={onPick} />
          </li>
        ))}
      </ul>

      {/* Control row — pinned below the grid */}
      <div className="mt-3 shrink-0 flex items-center justify-center gap-1.5 sm:gap-2 flex-wrap">
        <GhostButton onClick={onShowSingle}>Single Word</GhostButton>
        <SortPill value={sort} onChange={setSort} />
        {letterCount > 0 && (
          <GhostButton onClick={onEmptyCup} aria-label="Empty the cup">
            Empty Cup
          </GhostButton>
        )}
        {pageCount > 1 && (
          <PageNav page={page} pageCount={pageCount} setPage={setPage} />
        )}
      </div>
    </div>
  );
}

/* ============================== Grid card ============================== */

function GridCard({
  result,
  onPick,
}: {
  result: WordResult;
  onPick: (word: string) => void;
}) {
  // Per-card definition cursor. Persists as the user pages/sorts
  // because each card is keyed by word — React keeps the same
  // GridCard mounted, so the user's "I want to read sense 2 of cat"
  // selection survives until they pick a different word or empty
  // the cup.
  const [defIndex, setDefIndex] = useState(0);
  const senseCount = result.definitions.length;
  const currentDef =
    result.definitions[defIndex] ?? result.definitions[0] ?? '';
  const showSwipe = senseCount > 1;

  const use = () => onPick(result.word);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={use}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          use();
        }
        if (!showSwipe) return;
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          setDefIndex((i) => (i - 1 + senseCount) % senseCount);
        }
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          setDefIndex((i) => (i + 1) % senseCount);
        }
      }}
      aria-label={`Use the word ${displayWord(result)}`}
      className="group w-full min-h-[100px] sm:min-h-[108px] text-left bg-paper border border-ink/60 rounded-sm shadow-[2px_2px_0_0_rgba(26,26,26,0.85)] hover:shadow-[3px_3px_0_0_rgba(26,26,26,0.85)] hover:-translate-x-[1px] hover:-translate-y-[1px] active:translate-x-0 active:translate-y-0 active:shadow-[1px_1px_0_0_rgba(26,26,26,0.85)] transition-all px-3 py-2.5 overflow-hidden flex flex-col cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ink"
    >
      <div
        className={`font-display text-lg sm:text-xl font-black tracking-tight text-ink leading-none shrink-0 ${
          result.display ? '' : 'lowercase'
        }`}
      >
        {displayWord(result)}
      </div>
      <p className="mt-1.5 font-body text-xs sm:text-sm text-ink-soft leading-snug line-clamp-3 flex-1">
        {currentDef || '— no definition —'}
      </p>
      {showSwipe && (
        <div className="mt-1 -mb-1 -mr-1 flex items-center justify-end gap-0.5 shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setDefIndex((i) => (i - 1 + senseCount) % senseCount);
            }}
            className="text-ink-mute hover:text-ink hover:bg-ink/5 rounded w-6 h-6 flex items-center justify-center text-base font-bold leading-none transition"
            aria-label={`Previous definition of ${displayWord(result)}`}
          >
            ‹
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setDefIndex((i) => (i + 1) % senseCount);
            }}
            className="text-ink-mute hover:text-ink hover:bg-ink/5 rounded w-6 h-6 flex items-center justify-center text-base font-bold leading-none transition"
            aria-label={`Next definition of ${displayWord(result)}`}
          >
            ›
          </button>
        </div>
      )}
    </div>
  );
}

/* ============================== Buttons ============================== */

function PrimaryButton({
  children,
  onClick,
  ...rest
}: {
  children: React.ReactNode;
  onClick: () => void;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  // Same dimensions as GhostButton — only difference is the fill.
  // No offset shadow, no translate, no layering. The dark fill alone
  // is the visual emphasis.
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-xs font-semibold px-3.5 py-2 border border-ink bg-ink text-paper hover:bg-ink-soft rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-paper-grain focus-visible:ring-ink disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-ink"
      {...rest}
    >
      {children}
    </button>
  );
}

function GhostButton({
  children,
  onClick,
  ...rest
}: {
  children: React.ReactNode;
  onClick: () => void;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-xs font-semibold text-ink px-3.5 py-2 bg-paper border border-ink/40 hover:bg-ink/10 hover:border-ink/60 rounded-md transition-colors"
      {...rest}
    >
      {children}
    </button>
  );
}

function SmallGhostButton({
  children,
  onClick,
  ...rest
}: {
  children: React.ReactNode;
  onClick: () => void;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-[10px] sm:text-[11px] font-semibold text-ink px-2.5 sm:px-3 py-1.5 bg-paper border border-ink/40 hover:bg-ink/10 hover:border-ink/60 rounded-md transition-colors whitespace-nowrap"
      {...rest}
    >
      {children}
    </button>
  );
}

function SmallSortPill({
  value,
  onChange,
}: {
  value: SortMode;
  onChange: (m: SortMode) => void;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as SortMode)}
        className="appearance-none text-[10px] sm:text-[11px] font-semibold text-ink bg-paper border border-ink/40 hover:bg-ink/10 hover:border-ink/60 focus:bg-ink/10 focus:border-ink/60 rounded-md pl-2.5 sm:pl-3 pr-7 py-1.5 cursor-pointer focus:outline-none transition-colors whitespace-nowrap"
        aria-label="Sort words"
      >
        {(Object.keys(SORT_LABELS) as SortMode[]).map((m) => (
          <option key={m} value={m}>
            Sort: {SORT_LABELS[m]}
          </option>
        ))}
      </select>
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3"
        viewBox="0 0 12 12"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 4.5 L6 7.5 L9 4.5" />
      </svg>
    </div>
  );
}

function SortPill({
  value,
  onChange,
}: {
  value: SortMode;
  onChange: (m: SortMode) => void;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as SortMode)}
        className="appearance-none text-xs font-semibold text-ink bg-paper border border-ink/40 hover:bg-ink/10 hover:border-ink/60 focus:bg-ink/10 focus:border-ink/60 rounded-md pl-3.5 pr-9 py-2 cursor-pointer focus:outline-none transition-colors"
        aria-label="Sort words"
      >
        {(Object.keys(SORT_LABELS) as SortMode[]).map((m) => (
          <option key={m} value={m}>
            Sort: {SORT_LABELS[m]}
          </option>
        ))}
      </select>
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5"
        viewBox="0 0 12 12"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 4.5 L6 7.5 L9 4.5" />
      </svg>
    </div>
  );
}

function PageNav({
  page,
  pageCount,
  setPage,
}: {
  page: number;
  pageCount: number;
  setPage: (n: number | ((p: number) => number)) => void;
}) {
  return (
    <div className="flex items-center gap-1 text-xs font-semibold">
      <button
        type="button"
        className="px-2.5 py-2 bg-paper border border-ink/40 hover:bg-ink hover:text-paper rounded-md transition disabled:opacity-30 disabled:hover:bg-paper disabled:hover:text-ink"
        onClick={() => setPage((p) => Math.max(0, p - 1))}
        disabled={page === 0}
        aria-label="Previous page"
      >
        ‹
      </button>
      <span className="text-ink-mute tabular-nums px-2">
        {page + 1}/{pageCount}
      </span>
      <button
        type="button"
        className="px-2.5 py-2 bg-paper border border-ink/40 hover:bg-ink hover:text-paper rounded-md transition disabled:opacity-30 disabled:hover:bg-paper disabled:hover:text-ink"
        onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
        disabled={page >= pageCount - 1}
        aria-label="Next page"
      >
        ›
      </button>
    </div>
  );
}

/* ============================== Empty state ============================== */

function EmptyState({
  letterCount,
  dictionaryReady,
  pouring,
}: {
  letterCount: number;
  dictionaryReady: boolean;
  pouring: boolean;
}) {
  if (!dictionaryReady) {
    return (
      <div className="my-auto text-center">
        <p className="text-[11px] uppercase tracking-[0.18em] text-ink-mute">
          opening the dictionary…
        </p>
      </div>
    );
  }
  if (pouring) {
    return (
      <div className="my-auto flex flex-col items-center gap-3 sm:gap-4 text-center px-4">
        <p className="font-display text-2xl sm:text-3xl font-black text-ink-mute leading-none">
          pouring<span className="pour-dots">…</span>
        </p>
        <p className="text-sm sm:text-base text-ink-mute">
          Picking the best word once your pour finishes.
        </p>
      </div>
    );
  }
  if (letterCount === 0) {
    return (
      <div className="my-auto flex flex-col items-center gap-3 sm:gap-4 text-center px-4">
        <p className="font-display text-2xl sm:text-3xl font-black text-ink leading-none">
          Pour yourself a pint.
        </p>
        <p className="text-sm sm:text-base text-ink-mute">
          Pull the tap above.
        </p>
      </div>
    );
  }
  return (
    <div className="my-auto flex flex-col items-center gap-3 sm:gap-4 text-center px-4">
      <p className="font-display text-xl sm:text-2xl font-black text-ink leading-none">
        No words yet.
      </p>
      <p className="text-sm sm:text-base text-ink-mute">
        Pour a few more letters.
      </p>
    </div>
  );
}
