import { useEffect, useMemo, useState } from 'react';
import type { WordResult } from '../words/types';
import { scoreWord } from '../words/scoring';

interface WordsPanelProps {
  results: WordResult[];
  letterCount: number;
  dictionaryReady: boolean;
  onPick: (word: string) => void;
}

const PAGE_SIZE = 10;

export function WordsPanel({
  results,
  letterCount,
  dictionaryReady,
  onPick,
}: WordsPanelProps) {
  const sorted = useMemo(
    () => [...results].sort((a, b) => scoreWord(b.word) - scoreWord(a.word)),
    [results],
  );

  const [page, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));

  // Reset page when the underlying word set shrinks past current page.
  useEffect(() => {
    if (page > 0 && page >= pageCount) setPage(0);
  }, [page, pageCount]);

  const visible = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <section className="relative flex-1 min-h-0 bg-paper-grain border-t-2 border-ink flex flex-col">
      {/* Header strip */}
      <header className="flex items-end justify-between px-6 pt-4 pb-2 border-b border-ink/20">
        <div className="flex items-baseline gap-3">
          <h2 className="font-display text-2xl tracking-tight text-ink">
            Words on the menu
          </h2>
          <span className="font-receipt text-xs text-ink-mute uppercase tracking-widest">
            {sorted.length === 0
              ? letterCount === 0
                ? 'awaiting your pour'
                : dictionaryReady
                  ? 'no luck — pour more'
                  : 'opening the dictionary…'
              : `${sorted.length} possible · pick one to use it`}
          </span>
        </div>
        {sorted.length > PAGE_SIZE && (
          <div className="flex items-center gap-3 font-receipt text-xs text-ink-mute uppercase tracking-widest">
            <button
              type="button"
              className="px-2 py-1 border border-ink/40 rounded hover:bg-ink hover:text-paper transition disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-ink-mute"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              aria-label="Previous page"
            >
              ‹ Prev
            </button>
            <span className="tabular-nums">
              {page + 1} / {pageCount}
            </span>
            <button
              type="button"
              className="px-2 py-1 border border-ink/40 rounded hover:bg-ink hover:text-paper transition disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-ink-mute"
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              disabled={page >= pageCount - 1}
              aria-label="Next page"
            >
              Next ›
            </button>
          </div>
        )}
      </header>

      {/* Body */}
      <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
        {sorted.length === 0 ? (
          <EmptyState letterCount={letterCount} dictionaryReady={dictionaryReady} />
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
            {visible.map((r) => (
              <WordCard key={r.word} result={r} onPick={onPick} />
            ))}
          </ul>
        )}
      </div>
    </section>
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
        className="group w-full h-full text-left bg-paper border border-ink/70 rounded-sm shadow-[2px_2px_0_0_rgba(26,26,26,0.85)] hover:shadow-[3px_3px_0_0_rgba(26,26,26,0.85)] hover:-translate-x-[1px] hover:-translate-y-[1px] active:translate-x-0 active:translate-y-0 active:shadow-[1px_1px_0_0_rgba(26,26,26,0.85)] transition-all p-4"
        aria-label={`Use the word ${result.word}`}
      >
        <div className="flex items-baseline justify-between mb-1">
          <span className="font-display text-2xl font-extrabold tracking-tight text-ink lowercase">
            {result.word}
          </span>
          <span className="font-receipt text-[10px] uppercase tracking-widest text-ink-mute">
            {result.word.length} ltr
          </span>
        </div>
        <p className="font-body italic text-sm text-ink-soft leading-snug line-clamp-3">
          {result.definition || '— no definition —'}
        </p>
        <div className="mt-3 pt-2 border-t border-dashed border-ink/30 flex items-center justify-between">
          <span className="font-receipt text-[10px] uppercase tracking-widest text-ink-mute">
            tap to use
          </span>
          <span className="font-receipt text-[10px] uppercase tracking-widest text-ink-mute opacity-0 group-hover:opacity-100 transition-opacity">
            →
          </span>
        </div>
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
      <div className="h-full flex flex-col items-center justify-center gap-2">
        <p className="font-display text-3xl text-ink">Pour yourself a pint.</p>
        <p className="font-body italic text-ink-mute pulse-up">
          ↑ press and hold the tap above
        </p>
      </div>
    );
  }
  return (
    <div className="h-full flex flex-col items-center justify-center gap-2">
      <p className="font-display text-2xl text-ink">No words yet.</p>
      <p className="font-body italic text-ink-mute pulse-up">
        ↑ pour a few more letters
      </p>
    </div>
  );
}
