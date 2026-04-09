import { useEffect, useMemo, useState } from 'react';
import type { WordResult } from '../words/types';

interface WordsPanelProps {
  results: WordResult[];
  letterCount: number;
  dictionaryReady: boolean;
  onPick: (word: string) => void;
  onEmptyCup: () => void;
}

const PAGE_SIZE = 12;

export type SortMode = 'random' | 'longest' | 'shortest' | 'alpha';

const SORT_LABELS: Record<SortMode, string> = {
  random: 'random',
  longest: 'longest',
  shortest: 'shortest',
  alpha: 'A → Z',
};

/**
 * Stable shuffle seeded by the result-set fingerprint so the ordering
 * doesn't churn while the user is browsing — but does refresh when the
 * cup contents change.
 */
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
  onPick,
  onEmptyCup,
}: WordsPanelProps) {
  const [sort, setSort] = useState<SortMode>('random');
  const [showAll, setShowAll] = useState(false);
  const [page, setPage] = useState(0);

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
  }, [sort]);

  // The hero card always reflects the first item of the current sorted list.
  // When the user uses the word, results recompute, sort recomputes, and
  // sorted[0] becomes the next word — fully reactive.
  const heroWord = sorted[0] ?? null;

  return (
    <section className="relative flex-1 min-h-0 bg-paper-grain border-t-2 border-ink flex flex-col">
      <Header
        sort={sort}
        setSort={setSort}
        letterCount={letterCount}
        resultCount={sorted.length}
        showAll={showAll}
        setShowAll={setShowAll}
        page={page}
        pageCount={pageCount}
        setPage={setPage}
        onEmptyCup={onEmptyCup}
      />

      <div className="flex-1 min-h-0 overflow-y-auto">
        {sorted.length === 0 ? (
          <EmptyState
            letterCount={letterCount}
            dictionaryReady={dictionaryReady}
          />
        ) : showAll ? (
          <GridView
            visible={sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)}
            onPick={onPick}
          />
        ) : (
          <HeroView
            word={heroWord!}
            totalCount={sorted.length}
            onUse={() => onPick(heroWord!.word)}
            onShowAll={() => setShowAll(true)}
          />
        )}
      </div>
    </section>
  );
}

/* -------------------------- Header -------------------------- */

function Header({
  sort,
  setSort,
  letterCount,
  resultCount,
  showAll,
  setShowAll,
  page,
  pageCount,
  setPage,
  onEmptyCup,
}: {
  sort: SortMode;
  setSort: (m: SortMode) => void;
  letterCount: number;
  resultCount: number;
  showAll: boolean;
  setShowAll: (v: boolean) => void;
  page: number;
  pageCount: number;
  setPage: (n: number | ((p: number) => number)) => void;
  onEmptyCup: () => void;
}) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 sm:px-6 pt-3 pb-2 border-b border-ink/25">
      <div className="flex items-baseline gap-3 min-w-0">
        <h2 className="font-display text-xl sm:text-2xl tracking-tight text-ink truncate">
          Words on the menu
        </h2>
        <span className="font-receipt text-[10px] text-ink-mute uppercase tracking-widest hidden md:inline">
          {resultCount > 0
            ? `${resultCount} possible`
            : letterCount === 0
              ? 'awaiting your pour'
              : 'pour more letters'}
        </span>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 ml-auto flex-wrap justify-end">
        {/* Sort dropdown */}
        <label className="font-receipt text-[10px] uppercase tracking-widest text-ink-mute flex items-center gap-1.5">
          <span className="hidden sm:inline">sort</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortMode)}
            className="font-receipt text-[10px] uppercase tracking-widest bg-paper border border-ink/40 rounded px-1.5 py-0.5 focus:outline-none focus:border-ink"
          >
            {(Object.keys(SORT_LABELS) as SortMode[]).map((m) => (
              <option key={m} value={m}>
                {SORT_LABELS[m]}
              </option>
            ))}
          </select>
        </label>

        {/* Show all / hero toggle */}
        {resultCount > 0 && (
          <button
            type="button"
            onClick={() => setShowAll(!showAll)}
            className="font-receipt text-[10px] uppercase tracking-widest px-2 py-1 border border-ink/60 hover:bg-ink hover:text-paper transition rounded"
          >
            {showAll ? 'one at a time' : `browse all ${resultCount}`}
          </button>
        )}

        {/* Empty cup */}
        {letterCount > 0 && (
          <button
            type="button"
            onClick={onEmptyCup}
            className="font-receipt text-[10px] uppercase tracking-widest px-2 py-1 border border-ink/60 hover:bg-ink hover:text-paper transition rounded"
            aria-label="Empty the cup"
          >
            empty cup
          </button>
        )}

        {/* Pagination (only in grid view) */}
        {showAll && pageCount > 1 && (
          <div className="flex items-center gap-1.5 font-receipt text-[10px] uppercase tracking-widest text-ink-mute">
            <button
              type="button"
              className="px-1.5 py-0.5 border border-ink/40 rounded hover:bg-ink hover:text-paper transition disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-ink-mute"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              aria-label="Previous page"
            >
              ‹
            </button>
            <span className="tabular-nums">
              {page + 1}/{pageCount}
            </span>
            <button
              type="button"
              className="px-1.5 py-0.5 border border-ink/40 rounded hover:bg-ink hover:text-paper transition disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-ink-mute"
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              disabled={page >= pageCount - 1}
              aria-label="Next page"
            >
              ›
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

/* -------------------------- Hero view -------------------------- */

function HeroView({
  word,
  totalCount,
  onUse,
  onShowAll,
}: {
  word: WordResult;
  totalCount: number;
  onUse: () => void;
  onShowAll: () => void;
}) {
  return (
    <div className="h-full flex items-center justify-center px-4 sm:px-6 py-4">
      <article
        key={word.word}
        className="hero-in w-full max-w-2xl bg-paper border-2 border-ink shadow-[6px_6px_0_0_rgba(26,26,26,0.85)] px-6 sm:px-10 py-6 sm:py-8 flex flex-col items-center text-center"
      >
        {/* Top eyebrow */}
        <p className="font-receipt text-[10px] uppercase tracking-[0.28em] text-ink-mute mb-2">
          on the menu
        </p>

        {/* The word */}
        <h3 className="font-display font-black tracking-tight text-ink lowercase leading-[0.9] text-[clamp(2.6rem,7vw,4.6rem)]">
          {word.word}
        </h3>

        {/* Length pill */}
        <div className="mt-2 mb-4 font-receipt text-[10px] uppercase tracking-[0.22em] text-ink-mute">
          {word.word.length} letters
        </div>

        {/* Definition */}
        <p className="font-body italic text-base sm:text-lg text-ink-soft leading-snug max-w-xl">
          {word.definition || '— no definition on file —'}
        </p>

        {/* Primary action */}
        <button
          type="button"
          onClick={onUse}
          className="mt-6 sm:mt-7 font-receipt text-xs sm:text-sm uppercase tracking-[0.22em] px-6 py-3 border-2 border-ink bg-ink text-paper hover:bg-paper hover:text-ink transition shadow-[3px_3px_0_0_rgba(26,26,26,0.85)] active:shadow-[1px_1px_0_0_rgba(26,26,26,0.85)] active:translate-x-[2px] active:translate-y-[2px]"
        >
          use this word →
        </button>

        {/* Footer line */}
        <div className="mt-5 flex items-center gap-3 font-receipt text-[10px] uppercase tracking-[0.18em] text-ink-mute">
          {totalCount > 1 ? (
            <>
              <span>+ {totalCount - 1} more</span>
              <span className="text-ink/30">·</span>
              <button
                type="button"
                onClick={onShowAll}
                className="underline decoration-dotted underline-offset-2 hover:text-ink transition"
              >
                browse all
              </button>
            </>
          ) : (
            <span>last word standing</span>
          )}
        </div>
      </article>
    </div>
  );
}

/* -------------------------- Grid view -------------------------- */

function GridView({
  visible,
  onPick,
}: {
  visible: WordResult[];
  onPick: (word: string) => void;
}) {
  return (
    <div className="px-4 sm:px-6 py-4">
      <ul className="grid gap-2 sm:gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {visible.map((r) => (
          <li key={r.word}>
            <button
              type="button"
              onClick={() => onPick(r.word)}
              className="group w-full h-full text-left bg-paper border border-ink/70 rounded-sm shadow-[2px_2px_0_0_rgba(26,26,26,0.85)] hover:shadow-[3px_3px_0_0_rgba(26,26,26,0.85)] hover:-translate-x-[1px] hover:-translate-y-[1px] active:translate-x-0 active:translate-y-0 active:shadow-[1px_1px_0_0_rgba(26,26,26,0.85)] transition-all px-3 py-2.5"
              aria-label={`Use the word ${r.word}`}
            >
              <div className="font-display text-xl font-extrabold tracking-tight text-ink lowercase leading-none">
                {r.word}
              </div>
              <p className="mt-1.5 font-body italic text-[13px] text-ink-soft leading-snug line-clamp-2">
                {r.definition || '— no definition —'}
              </p>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* -------------------------- Empty state -------------------------- */

function EmptyState({
  letterCount,
  dictionaryReady,
}: {
  letterCount: number;
  dictionaryReady: boolean;
}) {
  if (!dictionaryReady) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="font-receipt text-sm text-ink-mute uppercase tracking-widest">
          opening the dictionary…
        </p>
      </div>
    );
  }
  if (letterCount === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-2 text-center px-4">
        <p className="font-display text-3xl sm:text-4xl text-ink">
          Pour yourself a pint.
        </p>
        <p className="font-body italic text-ink-mute pulse-up">
          ↑ pull the tap above
        </p>
      </div>
    );
  }
  return (
    <div className="h-full flex flex-col items-center justify-center gap-2 text-center px-4">
      <p className="font-display text-2xl sm:text-3xl text-ink">
        No words yet.
      </p>
      <p className="font-body italic text-ink-mute pulse-up">
        ↑ pour a few more letters
      </p>
    </div>
  );
}
