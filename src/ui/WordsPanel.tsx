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

/* ============================================================================
 * Layout:
 *
 *   ┌──── HEADER ────────────────────────────────────┐
 *   │   ── WORDS ON TAP ──                           │
 *   │   X words on offer                             │
 *   ├──── BODY ──────────────────────────────────────┤
 *   │                                                │
 *   │              elephant                          │
 *   │       "a large mammal having a long..."        │
 *   │              ┌─────────┐                       │
 *   │              │ NEXT  → │                       │
 *   │              └─────────┘                       │
 *   │           ── + N more · all ──                 │
 *   │                                                │
 *   ├──── FOOTER ────────────────────────────────────┤
 *   │   sort ▾    browse all                empty   │
 *   └────────────────────────────────────────────────┘
 *
 * No card chrome on the hero — pure typography on the paper grain.
 * ========================================================================== */

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

  const status =
    sorted.length > 0
      ? `${sorted.length} word${sorted.length === 1 ? '' : 's'} on offer`
      : letterCount === 0
        ? 'awaiting your pour'
        : 'pour more letters';

  return (
    <section className="relative flex-1 min-h-0 bg-paper-grain border-t-2 border-ink flex flex-col">
      {/* ============ HEADER ============ */}
      <header className="px-4 sm:px-6 pt-5 pb-4 text-center border-b border-ink/25">
        <div className="flex items-center justify-center gap-3">
          <span className="h-px w-10 sm:w-16 bg-ink/45" />
          <h2 className="font-display text-2xl sm:text-3xl tracking-tight text-ink leading-none">
            Words on Tap
          </h2>
          <span className="h-px w-10 sm:w-16 bg-ink/45" />
        </div>
        <p className="font-receipt text-[10px] sm:text-[11px] uppercase tracking-[0.28em] text-ink-mute mt-2">
          {status}
        </p>
      </header>

      {/* ============ BODY ============ */}
      <div className="flex-1 min-h-0 overflow-y-auto flex">
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

      {/* ============ FOOTER ============ */}
      <Footer
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
    </section>
  );
}

/* ============================== Footer ============================== */

function Footer({
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
    <footer className="px-4 sm:px-6 py-2.5 border-t border-ink/25 flex items-center justify-between gap-2 sm:gap-3 flex-wrap">
      {/* Left group */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Sort */}
        <label className="flex items-center gap-1.5 font-receipt text-[10px] uppercase tracking-[0.22em] text-ink-mute">
          <span className="hidden sm:inline">sort</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortMode)}
            className="font-receipt text-[10px] uppercase tracking-[0.22em] bg-paper border border-ink/40 rounded px-1.5 py-1 focus:outline-none focus:border-ink hover:border-ink transition-colors"
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
            {showAll ? 'one at a time' : 'browse all'}
          </GhostButton>
        )}
      </div>

      {/* Right group */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Pagination */}
        {showAll && pageCount > 1 && (
          <div className="flex items-center gap-1.5 font-receipt text-[10px] uppercase tracking-[0.22em] text-ink-mute">
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

        {/* Empty cup */}
        {letterCount > 0 && (
          <GhostButton onClick={onEmptyCup} aria-label="Empty the cup">
            empty cup
          </GhostButton>
        )}
      </div>
    </footer>
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
      className="font-receipt text-[10px] uppercase tracking-[0.22em] px-2.5 py-1 border border-ink/50 rounded hover:bg-ink hover:text-paper transition-colors"
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
    <div
      key={word.word}
      className="hero-in flex-1 flex flex-col items-center justify-center text-center px-6 py-6 sm:py-8 max-w-3xl mx-auto w-full"
    >
      {/* The word */}
      <h3 className="font-display font-black tracking-tight text-ink lowercase leading-[0.85] text-[clamp(3rem,9vw,5.75rem)]">
        {word.word}
      </h3>

      {/* Definition with ornamental serif quotes */}
      <div className="relative mt-6 sm:mt-7 max-w-2xl px-6 sm:px-10">
        <span
          aria-hidden="true"
          className="absolute left-0 -top-3 sm:-top-4 font-display text-4xl sm:text-5xl text-ink/35 leading-none select-none"
        >
          “
        </span>
        <p className="font-body italic text-base sm:text-lg md:text-xl text-ink-soft leading-snug">
          {word.definition || 'no definition on file'}
        </p>
        <span
          aria-hidden="true"
          className="absolute right-0 -bottom-6 sm:-bottom-7 font-display text-4xl sm:text-5xl text-ink/35 leading-none select-none"
        >
          ”
        </span>
      </div>

      {/* Primary CTA */}
      <button
        type="button"
        onClick={onNext}
        className="mt-8 sm:mt-10 font-receipt text-[11px] sm:text-xs uppercase tracking-[0.32em] px-8 sm:px-10 py-3.5 sm:py-4 border-2 border-ink bg-ink text-paper hover:bg-paper hover:text-ink transition shadow-[3px_3px_0_0_rgba(26,26,26,0.85)] active:shadow-[1px_1px_0_0_rgba(26,26,26,0.85)] active:translate-x-[2px] active:translate-y-[2px]"
      >
        next word →
      </button>

      {/* Footer with rules */}
      <div className="mt-6 flex items-center gap-3">
        <span className="h-px w-8 bg-ink/35" />
        <p className="font-receipt text-[10px] uppercase tracking-[0.22em] text-ink-mute whitespace-nowrap">
          {totalCount > 1 ? (
            <>
              + {totalCount - 1} more
              <span className="mx-2 text-ink/30">·</span>
              <button
                type="button"
                onClick={onShowAll}
                className="underline decoration-dotted underline-offset-[3px] hover:text-ink transition"
              >
                browse all
              </button>
            </>
          ) : (
            <span>last word standing</span>
          )}
        </p>
        <span className="h-px w-8 bg-ink/35" />
      </div>
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
    <div className="flex-1 px-4 sm:px-6 py-4 sm:py-5">
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
      <div className="flex-1 flex items-center justify-center">
        <p className="font-receipt text-[11px] uppercase tracking-[0.22em] text-ink-mute">
          opening the dictionary…
        </p>
      </div>
    );
  }
  if (letterCount === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-4">
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
    <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-4">
      <p className="font-display text-2xl sm:text-3xl text-ink leading-none">
        No words yet.
      </p>
      <p className="font-body italic text-base text-ink-mute pulse-up">
        ↑ pour a few more letters
      </p>
    </div>
  );
}
