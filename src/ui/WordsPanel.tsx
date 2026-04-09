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

  const status =
    sorted.length > 0
      ? `${sorted.length} word${sorted.length === 1 ? '' : 's'} on offer`
      : letterCount === 0
        ? 'awaiting your pour'
        : 'pour more letters';

  return (
    <section className="relative flex-1 min-h-0 bg-paper-grain flex flex-col">
      <SectionHeader
        sort={sort}
        setSort={setSort}
        status={status}
        letterCount={letterCount}
        resultCount={sorted.length}
        showAll={showAll}
        setShowAll={setShowAll}
        onEmptyCup={onEmptyCup}
      />

      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col">
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

/* ============================== Section Header ============================== */

function SectionHeader({
  sort,
  setSort,
  status,
  letterCount,
  resultCount,
  showAll,
  setShowAll,
  onEmptyCup,
}: {
  sort: SortMode;
  setSort: (m: SortMode) => void;
  status: string;
  letterCount: number;
  resultCount: number;
  showAll: boolean;
  setShowAll: (v: boolean) => void;
  onEmptyCup: () => void;
}) {
  return (
    <header className="shrink-0 px-4 sm:px-6 py-3 border-b-2 border-ink bg-paper flex items-center justify-between gap-3 flex-wrap">
      {/* Title group */}
      <div className="flex items-baseline gap-3 min-w-0">
        <h2 className="font-display text-xl sm:text-2xl font-black tracking-tight text-ink leading-none">
          Words on Tap
        </h2>
        <span className="text-xs text-ink-mute whitespace-nowrap">
          {status}
        </span>
      </div>

      {/* Controls — prominent, sans, bordered */}
      <div className="flex items-center gap-2 flex-wrap">
        <SortSelect value={sort} onChange={setSort} />

        {resultCount > 0 && (
          <ToolbarButton onClick={() => setShowAll(!showAll)}>
            {showAll ? 'Single' : 'Browse all'}
          </ToolbarButton>
        )}

        {letterCount > 0 && (
          <ToolbarButton onClick={onEmptyCup} aria-label="Empty the cup">
            Empty cup
          </ToolbarButton>
        )}
      </div>
    </header>
  );
}

function SortSelect({
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
        className="appearance-none text-xs font-medium uppercase tracking-[0.12em] bg-paper border border-ink/70 hover:border-ink rounded pl-3 pr-8 py-2 cursor-pointer focus:outline-none focus:border-ink transition-colors"
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
        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-ink text-[10px]"
      >
        ▾
      </span>
    </div>
  );
}

function ToolbarButton({
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
      className="text-xs font-medium uppercase tracking-[0.12em] px-3 py-2 border border-ink/70 hover:bg-ink hover:text-paper rounded transition-colors"
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
      className="hero-in flex-1 flex flex-col items-center justify-center text-center px-6 py-5 sm:py-7 max-w-3xl mx-auto w-full"
    >
      {/* The featured word */}
      <h3 className="font-display font-black tracking-tight text-ink lowercase leading-[0.9] text-[clamp(2.4rem,6.5vw,4.25rem)]">
        {word.word}
      </h3>

      {/* Definition with ornamental serif quotes */}
      <div className="relative mt-5 sm:mt-6 max-w-xl px-6">
        <span
          aria-hidden="true"
          className="absolute left-0 -top-3 sm:-top-4 font-display text-3xl sm:text-4xl text-ink/30 leading-none select-none"
        >
          “
        </span>
        <p className="font-body italic text-base sm:text-lg leading-snug text-ink-soft">
          {word.definition || 'no definition on file'}
        </p>
        <span
          aria-hidden="true"
          className="absolute right-0 -bottom-5 sm:-bottom-6 font-display text-3xl sm:text-4xl text-ink/30 leading-none select-none"
        >
          ”
        </span>
      </div>

      {/* Primary CTA — sans, clean */}
      <button
        type="button"
        onClick={onNext}
        className="mt-7 sm:mt-9 text-sm font-semibold uppercase tracking-[0.16em] px-7 py-3 border-2 border-ink bg-ink text-paper hover:bg-paper hover:text-ink transition shadow-[3px_3px_0_0_rgba(26,26,26,0.85)] active:shadow-[1px_1px_0_0_rgba(26,26,26,0.85)] active:translate-x-[2px] active:translate-y-[2px] rounded-sm"
      >
        Next word →
      </button>

      {/* Footer */}
      <p className="mt-5 text-xs text-ink-mute">
        {totalCount > 1 ? (
          <>
            <span className="text-ink/40">·</span> {totalCount - 1} more
            available <span className="text-ink/40">·</span>{' '}
            <button
              type="button"
              onClick={onShowAll}
              className="font-medium underline decoration-dotted underline-offset-[3px] hover:text-ink transition"
            >
              browse all
            </button>{' '}
            <span className="text-ink/40">·</span>
          </>
        ) : (
          <>last word standing</>
        )}
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
  onPick,
}: {
  visible: WordResult[];
  page: number;
  pageCount: number;
  setPage: (n: number | ((p: number) => number)) => void;
  onPick: (word: string) => void;
}) {
  return (
    <div className="flex-1 flex flex-col px-4 sm:px-6 py-4 sm:py-5">
      <ul className="grid gap-2 sm:gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 flex-1">
        {visible.map((r) => (
          <li key={r.word}>
            <button
              type="button"
              onClick={() => onPick(r.word)}
              className="group w-full h-full text-left bg-paper border border-ink/70 rounded-sm shadow-[2px_2px_0_0_rgba(26,26,26,0.85)] hover:shadow-[3px_3px_0_0_rgba(26,26,26,0.85)] hover:-translate-x-[1px] hover:-translate-y-[1px] active:translate-x-0 active:translate-y-0 active:shadow-[1px_1px_0_0_rgba(26,26,26,0.85)] transition-all px-3 py-2.5"
              aria-label={`Use the word ${r.word}`}
            >
              <div className="font-display text-lg sm:text-xl font-black tracking-tight text-ink lowercase leading-none">
                {r.word}
              </div>
              <p className="mt-1.5 font-body italic text-xs sm:text-sm text-ink-soft leading-snug line-clamp-2">
                {r.definition || '— no definition —'}
              </p>
            </button>
          </li>
        ))}
      </ul>

      {pageCount > 1 && (
        <div className="mt-4 flex items-center justify-center gap-3 text-xs font-medium">
          <button
            type="button"
            className="px-3 py-1.5 border border-ink/70 rounded hover:bg-ink hover:text-paper transition disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-ink"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            aria-label="Previous page"
          >
            ‹ Prev
          </button>
          <span className="text-ink-mute tabular-nums">
            Page {page + 1} of {pageCount}
          </span>
          <button
            type="button"
            className="px-3 py-1.5 border border-ink/70 rounded hover:bg-ink hover:text-paper transition disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-ink"
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            disabled={page >= pageCount - 1}
            aria-label="Next page"
          >
            Next ›
          </button>
        </div>
      )}
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
        <p className="text-xs uppercase tracking-[0.18em] text-ink-mute">
          opening the dictionary…
        </p>
      </div>
    );
  }
  if (letterCount === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-4">
        <p className="font-display text-3xl sm:text-4xl font-black text-ink leading-none">
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
      <p className="font-display text-2xl sm:text-3xl font-black text-ink leading-none">
        No words yet.
      </p>
      <p className="font-body italic text-base text-ink-mute pulse-up">
        ↑ pour a few more letters
      </p>
    </div>
  );
}
