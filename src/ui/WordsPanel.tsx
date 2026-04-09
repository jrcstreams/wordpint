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
 * Stable shuffle seeded by the result-set fingerprint so the order doesn't
 * churn while browsing — but does refresh when the cup changes.
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
            onNext={() => onPick(heroWord!.word)}
            onShowAll={() => setShowAll(true)}
          />
        )}
      </div>
    </section>
  );
}

/* ============================== Header ============================== */

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
  const status =
    resultCount > 0
      ? `${resultCount} word${resultCount === 1 ? '' : 's'} on offer`
      : letterCount === 0
        ? 'awaiting your pour'
        : 'pour more letters';

  return (
    <header className="px-4 sm:px-6 pt-4 pb-3 border-b border-ink/25">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        {/* Title block */}
        <div className="min-w-0">
          <h2 className="font-display text-2xl sm:text-[1.7rem] leading-none tracking-tight text-ink">
            Words on the menu
          </h2>
          <p className="font-receipt text-[10px] uppercase tracking-[0.22em] text-ink-mute mt-1">
            {status}
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 ml-auto">
          {/* Sort */}
          <label className="flex items-center gap-1.5 font-receipt text-[10px] uppercase tracking-[0.18em] text-ink-mute">
            <span className="hidden sm:inline">sort</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortMode)}
              className="font-receipt text-[10px] uppercase tracking-[0.18em] bg-paper border border-ink/40 rounded px-1.5 py-1 focus:outline-none focus:border-ink hover:border-ink transition-colors"
              aria-label="Sort words"
            >
              {(Object.keys(SORT_LABELS) as SortMode[]).map((m) => (
                <option key={m} value={m}>
                  {SORT_LABELS[m]}
                </option>
              ))}
            </select>
          </label>

          {/* View toggle */}
          {resultCount > 0 && (
            <GhostButton onClick={() => setShowAll(!showAll)}>
              {showAll ? 'one at a time' : `browse all`}
            </GhostButton>
          )}

          {/* Empty cup */}
          {letterCount > 0 && (
            <GhostButton onClick={onEmptyCup} aria-label="Empty the cup">
              empty cup
            </GhostButton>
          )}

          {/* Pagination */}
          {showAll && pageCount > 1 && (
            <div className="flex items-center gap-1.5 font-receipt text-[10px] uppercase tracking-[0.18em] text-ink-mute ml-1">
              <button
                type="button"
                className="px-1.5 py-1 border border-ink/40 rounded hover:bg-ink hover:text-paper transition disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-ink-mute"
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
                className="px-1.5 py-1 border border-ink/40 rounded hover:bg-ink hover:text-paper transition disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-ink-mute"
                onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                disabled={page >= pageCount - 1}
                aria-label="Next page"
              >
                ›
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
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
      className="font-receipt text-[10px] uppercase tracking-[0.18em] px-2 py-1 border border-ink/50 rounded hover:bg-ink hover:text-paper transition-colors"
      {...rest}
    >
      {children}
    </button>
  );
}

/* ============================== Hero view ============================== */

function HeroView({
  word,
  totalCount,
  onNext,
  onShowAll,
}: {
  word: WordResult;
  totalCount: number;
  onNext: () => void;
  onShowAll: () => void;
}) {
  return (
    <div className="h-full flex items-center justify-center px-4 sm:px-6 py-4 sm:py-6">
      <article
        key={word.word}
        className="hero-in w-full max-w-2xl bg-paper border-2 border-ink shadow-[6px_6px_0_0_rgba(26,26,26,0.85)] px-6 sm:px-10 py-7 sm:py-9 flex flex-col items-center text-center"
      >
        {/* Word */}
        <h3 className="font-display font-black tracking-tight text-ink lowercase leading-[0.88] text-[clamp(2.8rem,8vw,5rem)]">
          {word.word}
        </h3>

        {/* Definition */}
        <p className="mt-5 font-body italic text-base sm:text-lg leading-snug text-ink-soft max-w-xl">
          {word.definition || '— no definition on file —'}
        </p>

        {/* Primary action */}
        <button
          type="button"
          onClick={onNext}
          className="mt-7 sm:mt-8 font-receipt text-[11px] sm:text-xs uppercase tracking-[0.28em] px-7 sm:px-8 py-3 sm:py-3.5 border-2 border-ink bg-ink text-paper hover:bg-paper hover:text-ink transition shadow-[3px_3px_0_0_rgba(26,26,26,0.85)] active:shadow-[1px_1px_0_0_rgba(26,26,26,0.85)] active:translate-x-[2px] active:translate-y-[2px]"
        >
          next word →
        </button>

        {/* Footer */}
        <div className="mt-5 font-receipt text-[10px] uppercase tracking-[0.22em] text-ink-mute">
          {totalCount > 1 ? (
            <>
              + {totalCount - 1} more
              <span className="mx-2 text-ink/30">·</span>
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

/* ============================== Grid view ============================== */

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
              <div className="font-display text-lg sm:text-xl font-extrabold tracking-tight text-ink lowercase leading-none">
                {r.word}
              </div>
              <p className="mt-1.5 font-body italic text-xs sm:text-[13px] text-ink-soft leading-snug line-clamp-2">
                {r.definition || '— no definition —'}
              </p>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ============================== Empty state ============================== */

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
        <p className="font-receipt text-xs uppercase tracking-[0.22em] text-ink-mute">
          opening the dictionary…
        </p>
      </div>
    );
  }
  if (letterCount === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3 text-center px-4">
        <p className="font-display text-3xl sm:text-4xl text-ink leading-none">
          Pour yourself a pint.
        </p>
        <p className="font-body italic text-base sm:text-lg text-ink-mute pulse-up">
          ↑ pull the tap above
        </p>
      </div>
    );
  }
  return (
    <div className="h-full flex flex-col items-center justify-center gap-3 text-center px-4">
      <p className="font-display text-2xl sm:text-3xl text-ink leading-none">
        No words yet.
      </p>
      <p className="font-body italic text-base text-ink-mute pulse-up">
        ↑ pour a few more letters
      </p>
    </div>
  );
}
