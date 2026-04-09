import { useEffect, useMemo, useState } from 'react';
import type { WordResult } from '../words/types';

interface WordsPanelProps {
  results: WordResult[];
  letterCount: number;
  dictionaryReady: boolean;
  onPick: (word: string) => void;
  onEmptyCup: () => void;
}

const PAGE_SIZE = 10;

export type SortMode = 'random' | 'longest' | 'shortest' | 'alpha';

const SORT_LABELS: Record<SortMode, string> = {
  random: 'random',
  longest: 'longest',
  shortest: 'shortest',
  alpha: 'A → Z',
};

/** Stable shuffle seeded by the result-set length so the order doesn't churn
 *  while the user is browsing — but does change when the cup contents change. */
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

export function WordsPanel({
  results,
  letterCount,
  dictionaryReady,
  onPick,
  onEmptyCup,
}: WordsPanelProps) {
  const [sort, setSort] = useState<SortMode>('random');
  const [page, setPage] = useState(0);

  const sorted = useMemo(() => {
    if (results.length === 0) return results;
    switch (sort) {
      case 'longest':
        return [...results].sort(
          (a, b) => b.word.length - a.word.length || a.word.localeCompare(b.word),
        );
      case 'shortest':
        return [...results].sort(
          (a, b) => a.word.length - b.word.length || a.word.localeCompare(b.word),
        );
      case 'alpha':
        return [...results].sort((a, b) => a.word.localeCompare(b.word));
      case 'random':
      default:
        // Seed off the result count + first/last word so the order is stable
        // for a given cup state but changes when the cup changes.
        return seededShuffle(
          results,
          results.length * 31 +
            (results[0]?.word.charCodeAt(0) ?? 0) +
            (results[results.length - 1]?.word.charCodeAt(0) ?? 0),
        );
    }
  }, [results, sort]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));

  // Reset page if the underlying word set shrinks past the current page.
  useEffect(() => {
    if (page > 0 && page >= pageCount) setPage(0);
  }, [page, pageCount]);

  // Reset to page 0 when sort changes so the user always sees the top of the new order.
  useEffect(() => {
    setPage(0);
  }, [sort]);

  const visible = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <section className="relative flex-1 min-h-0 bg-paper-grain border-t-2 border-ink flex flex-col">
      <Header
        sort={sort}
        setSort={setSort}
        letterCount={letterCount}
        resultCount={sorted.length}
        page={page}
        pageCount={pageCount}
        setPage={setPage}
        onEmptyCup={onEmptyCup}
      />

      <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-3 sm:py-4">
        {sorted.length === 0 ? (
          <EmptyState letterCount={letterCount} dictionaryReady={dictionaryReady} />
        ) : (
          <ul className="grid gap-2 sm:gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {visible.map((r) => (
              <WordCard key={r.word} result={r} onPick={onPick} />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function Header({
  sort,
  setSort,
  letterCount,
  resultCount,
  page,
  pageCount,
  setPage,
  onEmptyCup,
}: {
  sort: SortMode;
  setSort: (m: SortMode) => void;
  letterCount: number;
  resultCount: number;
  page: number;
  pageCount: number;
  setPage: (n: number | ((p: number) => number)) => void;
  onEmptyCup: () => void;
}) {
  return (
    <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 sm:px-6 pt-3 pb-2 border-b border-ink/25">
      <div className="flex items-baseline gap-3 min-w-0">
        <h2 className="font-display text-xl sm:text-2xl tracking-tight text-ink truncate">
          Words on the menu
        </h2>
        <span className="font-receipt text-[10px] text-ink-mute uppercase tracking-widest hidden sm:inline">
          {resultCount > 0
            ? `${resultCount} possible · tap a card to use it`
            : letterCount === 0
              ? 'awaiting your pour'
              : 'pour more letters'}
        </span>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 ml-auto">
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

        {/* Empty cup button (only when there's something to empty) */}
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

        {/* Pagination */}
        {pageCount > 1 && (
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

function WordCard({
  result,
  onPick,
}: {
  result: WordResult;
  onPick: (word: string) => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={() => onPick(result.word)}
        className="group w-full h-full text-left bg-paper border border-ink/70 rounded-sm shadow-[2px_2px_0_0_rgba(26,26,26,0.85)] hover:shadow-[3px_3px_0_0_rgba(26,26,26,0.85)] hover:-translate-x-[1px] hover:-translate-y-[1px] active:translate-x-0 active:translate-y-0 active:shadow-[1px_1px_0_0_rgba(26,26,26,0.85)] transition-all px-3 py-2.5"
        aria-label={`Use the word ${result.word}`}
      >
        <div className="font-display text-xl sm:text-[1.4rem] font-extrabold tracking-tight text-ink lowercase leading-none">
          {result.word}
        </div>
        <p className="mt-1.5 font-body italic text-[13px] sm:text-sm text-ink-soft leading-snug line-clamp-2">
          {result.definition || '— no definition —'}
        </p>
      </button>
    </li>
  );
}

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
        <p className="font-display text-2xl sm:text-3xl text-ink">
          Pour yourself a pint.
        </p>
        <p className="font-body italic text-ink-mute pulse-up">
          ↑ press &amp; hold the tap above
        </p>
      </div>
    );
  }
  return (
    <div className="h-full flex flex-col items-center justify-center gap-2 text-center px-4">
      <p className="font-display text-xl sm:text-2xl text-ink">No words yet.</p>
      <p className="font-body italic text-ink-mute pulse-up">
        ↑ pour a few more letters
      </p>
    </div>
  );
}
