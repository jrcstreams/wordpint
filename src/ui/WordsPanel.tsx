import { useEffect, useMemo, useState } from 'react';
import type { WordResult } from '../words/types';

interface WordsPanelProps {
  results: WordResult[];
  letterCount: number;
  dictionaryReady: boolean;
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
    <div className="relative flex-1 min-h-0 bg-paper-grain flex flex-col">
      {sorted.length === 0 ? (
        <EmptyState
          letterCount={letterCount}
          dictionaryReady={dictionaryReady}
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
          totalCount={sorted.length}
          onPick={onPick}
          onShowSingle={() => setShowAll(false)}
          onEmptyCup={onEmptyCup}
        />
      ) : (
        <HeroView
          word={heroWord!}
          totalCount={sorted.length}
          sort={sort}
          setSort={setSort}
          letterCount={letterCount}
          onNext={() => onPick(heroWord!.word)}
          onShowAll={() => setShowAll(true)}
          onEmptyCup={onEmptyCup}
        />
      )}
    </div>
  );
}

/* ============================== Hero view ============================== */

function HeroView({
  word,
  totalCount,
  sort,
  setSort,
  letterCount,
  onNext,
  onShowAll,
  onEmptyCup,
}: {
  word: WordResult;
  totalCount: number;
  sort: SortMode;
  setSort: (m: SortMode) => void;
  letterCount: number;
  onNext: () => void;
  onShowAll: () => void;
  onEmptyCup: () => void;
}) {
  return (
    <div
      key={word.word}
      className="hero-in flex-1 flex flex-col items-center justify-center text-center px-5 py-3 max-w-2xl mx-auto w-full"
    >
      {/* Featured word */}
      <h3 className="font-display font-black tracking-tight text-ink lowercase leading-[0.9] text-[clamp(1.75rem,4.5vw,2.75rem)]">
        {word.word}
      </h3>

      {/* Definition — Garamond regular, no italic */}
      <p className="mt-2 max-w-md font-body text-base sm:text-lg leading-snug text-ink-soft">
        {word.definition || 'no definition on file'}
      </p>

      {/* Primary CTA on its own row */}
      <div className="mt-4 sm:mt-5">
        <PrimaryButton onClick={onNext}>Next Word →</PrimaryButton>
      </div>

      {/* Secondary controls on the second row */}
      <div className="mt-2 sm:mt-2.5 flex items-center justify-center gap-1.5 sm:gap-2 flex-wrap">
        <GhostButton onClick={onShowAll}>Browse All Words</GhostButton>
        <SortPill value={sort} onChange={setSort} />
        {letterCount > 0 && (
          <GhostButton onClick={onEmptyCup} aria-label="Empty the cup">
            Empty Cup
          </GhostButton>
        )}
      </div>

      {/* Total count — bigger, more prominent */}
      <p className="mt-3 sm:mt-4 text-sm sm:text-base text-ink-soft">
        <span className="font-display font-black text-ink">{totalCount}</span>{' '}
        word{totalCount === 1 ? '' : 's'} on offer
      </p>
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
  totalCount,
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
  totalCount: number;
  onPick: (word: string) => void;
  onShowSingle: () => void;
  onEmptyCup: () => void;
}) {
  return (
    <div className="flex-1 min-h-0 flex flex-col px-4 sm:px-6 py-3">
      {/* Cards */}
      <ul className="flex-1 min-h-0 grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
        {visible.map((r) => (
          <li key={r.word} className="min-h-0">
            <button
              type="button"
              onClick={() => onPick(r.word)}
              className="group w-full h-full text-left bg-paper border border-ink/60 rounded-sm shadow-[2px_2px_0_0_rgba(26,26,26,0.85)] hover:shadow-[3px_3px_0_0_rgba(26,26,26,0.85)] hover:-translate-x-[1px] hover:-translate-y-[1px] active:translate-x-0 active:translate-y-0 active:shadow-[1px_1px_0_0_rgba(26,26,26,0.85)] transition-all px-3 py-2.5 overflow-hidden flex flex-col"
              aria-label={`Use the word ${r.word}`}
            >
              <div className="font-display text-lg sm:text-xl font-black tracking-tight text-ink lowercase leading-none shrink-0">
                {r.word}
              </div>
              <p className="mt-1.5 font-body text-xs sm:text-sm text-ink-soft leading-snug line-clamp-3 flex-1 min-h-0">
                {r.definition || '— no definition —'}
              </p>
            </button>
          </li>
        ))}
      </ul>

      {/* Control row + count — pinned below the grid */}
      <div className="mt-3 shrink-0 flex flex-col items-center gap-2">
        <div className="flex items-center justify-center gap-1.5 sm:gap-2 flex-wrap">
          <GhostButton onClick={onShowSingle}>Single Word</GhostButton>
          <SortPill value={sort} onChange={setSort} />
          {letterCount > 0 && (
            <GhostButton onClick={onEmptyCup} aria-label="Empty the cup">
              Empty Cup
            </GhostButton>
          )}
          {pageCount > 1 && (
            <PageNav
              page={page}
              pageCount={pageCount}
              setPage={setPage}
            />
          )}
        </div>
        <p className="text-sm sm:text-base text-ink-soft">
          <span className="font-display font-black text-ink">{totalCount}</span>{' '}
          word{totalCount === 1 ? '' : 's'} on offer
        </p>
      </div>
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
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-sm font-bold uppercase tracking-[0.14em] px-7 sm:px-8 py-2.5 sm:py-3 border-2 border-ink bg-ink text-paper hover:bg-paper hover:text-ink transition shadow-[3px_3px_0_0_rgba(26,26,26,0.85)] active:shadow-[1px_1px_0_0_rgba(26,26,26,0.85)] active:translate-x-[1px] active:translate-y-[1px] rounded-md"
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
      className="text-xs font-semibold px-3.5 py-2 bg-paper border border-ink/40 hover:bg-ink hover:text-paper hover:border-ink rounded-md transition-colors"
      {...rest}
    >
      {children}
    </button>
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
        className="appearance-none text-xs font-semibold bg-paper border border-ink/40 hover:bg-ink hover:text-paper hover:border-ink focus:bg-ink focus:text-paper focus:border-ink rounded-md pl-3.5 pr-8 py-2 cursor-pointer focus:outline-none transition-colors"
        aria-label="Sort words"
      >
        {(Object.keys(SORT_LABELS) as SortMode[]).map((m) => (
          <option key={m} value={m}>
            Sort: {SORT_LABELS[m]}
          </option>
        ))}
      </select>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px]"
      >
        ▾
      </span>
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
}: {
  letterCount: number;
  dictionaryReady: boolean;
}) {
  if (!dictionaryReady) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-[11px] uppercase tracking-[0.18em] text-ink-mute">
          opening the dictionary…
        </p>
      </div>
    );
  }
  if (letterCount === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 sm:gap-5 text-center px-4">
        <p className="font-display text-2xl sm:text-3xl font-black text-ink leading-none">
          Pour yourself a pint.
        </p>
        <p className="text-sm sm:text-base text-ink-mute pulse-up">
          ↑ pull the tap above
        </p>
      </div>
    );
  }
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 sm:gap-5 text-center px-4">
      <p className="font-display text-xl sm:text-2xl font-black text-ink leading-none">
        No words yet.
      </p>
      <p className="text-sm sm:text-base text-ink-mute pulse-up">
        ↑ pour a few more letters
      </p>
    </div>
  );
}
