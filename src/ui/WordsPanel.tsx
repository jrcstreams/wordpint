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
      <SectionBar
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

/* ============================== Section Bar ============================== */
/* Eyebrow-style label, NOT a competing serif heading. */

function SectionBar({
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
    <div className="shrink-0 px-4 sm:px-6 py-2 sm:py-2.5 border-b border-ink/30 bg-paper flex items-center justify-between gap-2 sm:gap-3 flex-wrap">
      {/* Subordinate label */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.18em] text-ink whitespace-nowrap">
          Words on Tap
        </span>
        <span className="text-[10px] sm:text-[11px] text-ink-mute whitespace-nowrap hidden sm:inline">
          {status}
        </span>
      </div>

      {/* Pill controls */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        <SortPill value={sort} onChange={setSort} />

        {resultCount > 0 && (
          <Pill onClick={() => setShowAll(!showAll)}>
            {showAll ? 'Single' : 'Browse all'}
          </Pill>
        )}

        {letterCount > 0 && (
          <Pill onClick={onEmptyCup} aria-label="Empty the cup">
            Empty cup
          </Pill>
        )}
      </div>
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
        className="appearance-none text-[11px] sm:text-xs font-semibold bg-ink/[0.04] border border-ink/25 hover:border-ink hover:bg-ink/[0.08] rounded-full pl-3 pr-7 py-1.5 cursor-pointer focus:outline-none focus:border-ink focus:bg-ink/[0.08] transition-colors"
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
        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-ink text-[9px]"
      >
        ▾
      </span>
    </div>
  );
}

function Pill({
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
      className="text-[11px] sm:text-xs font-semibold px-3 py-1.5 bg-ink/[0.04] border border-ink/25 hover:bg-ink hover:text-paper hover:border-ink rounded-full transition-colors"
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
      className="hero-in flex-1 flex flex-col items-center justify-center text-center px-5 py-3 sm:py-4 max-w-xl mx-auto w-full"
    >
      {/* Featured word */}
      <h3 className="font-display font-black tracking-tight text-ink lowercase leading-[0.9] text-[clamp(1.75rem,4.5vw,2.75rem)]">
        {word.word}
      </h3>

      {/* Definition — Garamond regular, no italic */}
      <p className="mt-2 sm:mt-3 max-w-md font-body text-sm sm:text-[15px] leading-snug text-ink-soft">
        {word.definition || 'no definition on file'}
      </p>

      {/* CTA — compact */}
      <button
        type="button"
        onClick={onNext}
        className="mt-4 sm:mt-5 text-[11px] sm:text-xs font-semibold uppercase tracking-[0.12em] px-4 py-2 border-2 border-ink bg-ink text-paper hover:bg-paper hover:text-ink transition shadow-[2px_2px_0_0_rgba(26,26,26,0.85)] active:shadow-[1px_1px_0_0_rgba(26,26,26,0.85)] active:translate-x-[1px] active:translate-y-[1px] rounded-sm"
      >
        Next word →
      </button>

      {/* Footer line */}
      <p className="mt-3 text-[11px] text-ink-mute">
        {totalCount > 1 ? (
          <>
            {totalCount - 1} more available ·{' '}
            <button
              type="button"
              onClick={onShowAll}
              className="font-medium underline decoration-dotted underline-offset-[3px] hover:text-ink transition"
            >
              browse all
            </button>
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
    <div className="flex-1 flex flex-col px-4 sm:px-6 py-3 sm:py-4">
      <ul className="grid gap-2 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 flex-1">
        {visible.map((r) => (
          <li key={r.word}>
            <button
              type="button"
              onClick={() => onPick(r.word)}
              className="group w-full h-full text-left bg-paper border border-ink/60 rounded-sm shadow-[2px_2px_0_0_rgba(26,26,26,0.85)] hover:shadow-[3px_3px_0_0_rgba(26,26,26,0.85)] hover:-translate-x-[1px] hover:-translate-y-[1px] active:translate-x-0 active:translate-y-0 active:shadow-[1px_1px_0_0_rgba(26,26,26,0.85)] transition-all px-2.5 py-2"
              aria-label={`Use the word ${r.word}`}
            >
              <div className="font-display text-base sm:text-lg font-black tracking-tight text-ink lowercase leading-none">
                {r.word}
              </div>
              <p className="mt-1 font-body text-[11px] sm:text-xs text-ink-soft leading-snug line-clamp-2">
                {r.definition || '— no definition —'}
              </p>
            </button>
          </li>
        ))}
      </ul>

      {pageCount > 1 && (
        <div className="mt-3 flex items-center justify-center gap-2 text-[11px] font-semibold">
          <button
            type="button"
            className="px-3 py-1.5 bg-ink/[0.04] border border-ink/25 hover:bg-ink hover:text-paper rounded-full transition disabled:opacity-30 disabled:hover:bg-ink/[0.04] disabled:hover:text-ink"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            aria-label="Previous page"
          >
            ‹ Prev
          </button>
          <span className="text-ink-mute tabular-nums text-[11px] px-1">
            {page + 1} / {pageCount}
          </span>
          <button
            type="button"
            className="px-3 py-1.5 bg-ink/[0.04] border border-ink/25 hover:bg-ink hover:text-paper rounded-full transition disabled:opacity-30 disabled:hover:bg-ink/[0.04] disabled:hover:text-ink"
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
        <p className="text-[11px] uppercase tracking-[0.18em] text-ink-mute">
          opening the dictionary…
        </p>
      </div>
    );
  }
  if (letterCount === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center px-4">
        <p className="font-display text-2xl sm:text-3xl font-black text-ink leading-none">
          Pour yourself a pint.
        </p>
        <p className="text-sm text-ink-mute pulse-up">
          ↑ pull the tap above
        </p>
      </div>
    );
  }
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center px-4">
      <p className="font-display text-xl sm:text-2xl font-black text-ink leading-none">
        No words yet.
      </p>
      <p className="text-sm text-ink-mute pulse-up">
        ↑ pour a few more letters
      </p>
    </div>
  );
}
