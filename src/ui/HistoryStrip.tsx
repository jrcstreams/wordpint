import { Fragment, useEffect, useState } from 'react';

/** How many words to show per page in the running tab. */
const WINDOW = 5;

interface HistoryStripProps {
  history: string[];
  /** Optional override casing per lowercase key (acronyms, proper nouns). */
  displayForms?: Record<string, string>;
  onWordClick: (word: string) => void;
}

/**
 * Compact "Running Tab" strip showing words used this session. Words
 * are shown most-recent first. When the list grows past WINDOW items,
 * ‹ › arrows appear so the user can page through without horizontal
 * scroll. App.tsx only renders this when history.length > 0.
 */
export function HistoryStrip({
  history,
  displayForms,
  onWordClick,
}: HistoryStripProps) {
  const [startIndex, setStartIndex] = useState(0);

  // Snap back to the newest words whenever a new word is added.
  useEffect(() => {
    setStartIndex(0);
  }, [history.length]);

  if (history.length === 0) return null;

  const reversed = [...history].reverse();
  const total = reversed.length;
  const needsPaging = total > WINDOW;
  const visible = reversed.slice(startIndex, startIndex + WINDOW);
  const canPrev = startIndex > 0;
  const canNext = startIndex + WINDOW < total;

  return (
    <div className="shrink-0 border-t border-ink/20 px-3 sm:px-6 py-1.5 sm:py-2">
      <div className="flex items-center justify-center gap-1 sm:gap-1.5">
        {/* Label */}
        <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.18em] text-ink-mute mr-0.5 sm:mr-1 select-none whitespace-nowrap">
          Running Tab —
        </span>

        {/* Prev arrow */}
        {needsPaging && (
          <button
            type="button"
            onClick={() =>
              setStartIndex((i) => Math.max(0, i - WINDOW))
            }
            disabled={!canPrev}
            className="shrink-0 w-5 h-5 flex items-center justify-center text-sm font-bold text-ink-mute hover:text-ink hover:bg-ink/5 rounded transition disabled:opacity-25 disabled:hover:bg-transparent disabled:hover:text-ink-mute"
            aria-label="Show newer words"
          >
            ‹
          </button>
        )}

        {/* Visible word buttons */}
        {visible.map((w, i) => {
          const display = displayForms?.[w];
          const caseClass = display ? '' : 'lowercase';
          return (
            <Fragment key={`${w}-${startIndex + i}`}>
              {i > 0 && (
                <span
                  aria-hidden="true"
                  className="text-ink/30 select-none text-xs"
                >
                  ·
                </span>
              )}
              <button
                type="button"
                onClick={() => onWordClick(w)}
                className={`font-body text-xs sm:text-sm text-ink ${caseClass} whitespace-nowrap underline decoration-dotted decoration-ink/30 underline-offset-[3px] hover:decoration-ink hover:bg-ink/5 px-1 py-0.5 rounded transition`}
                aria-label={`Show definition of ${display ?? w}`}
              >
                {display ?? w}
              </button>
            </Fragment>
          );
        })}

        {/* Next arrow */}
        {needsPaging && (
          <button
            type="button"
            onClick={() =>
              setStartIndex((i) => Math.min(total - WINDOW, i + WINDOW))
            }
            disabled={!canNext}
            className="shrink-0 w-5 h-5 flex items-center justify-center text-sm font-bold text-ink-mute hover:text-ink hover:bg-ink/5 rounded transition disabled:opacity-25 disabled:hover:bg-transparent disabled:hover:text-ink-mute"
            aria-label="Show older words"
          >
            ›
          </button>
        )}
      </div>
    </div>
  );
}
