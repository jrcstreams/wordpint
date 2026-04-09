import { Fragment } from 'react';

interface HistoryStripProps {
  history: string[];
  onWordClick: (word: string) => void;
}

/**
 * Compact single-line "Running Tab" strip showing words used this
 * session. The label lives INLINE with the words (no separate
 * SectionDivider above it) so the entire feature costs ~26px of
 * vertical space instead of ~65px. App.tsx only renders this when
 * history.length > 0.
 */
export function HistoryStrip({ history, onWordClick }: HistoryStripProps) {
  if (history.length === 0) return null;
  const recent = [...history].reverse().slice(0, 8);
  return (
    <div className="shrink-0 border-t border-ink/20 px-3 sm:px-6 py-1.5 sm:py-2 overflow-x-auto">
      <ul className="flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap">
        <li className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.18em] text-ink-mute mr-0.5 sm:mr-1 select-none">
          Running Tab —
        </li>
        {recent.map((w, i) => (
          <Fragment key={`${w}-${i}`}>
            {i > 0 && (
              <li
                aria-hidden="true"
                className="text-ink/30 select-none text-xs"
              >
                ·
              </li>
            )}
            <li>
              <button
                type="button"
                onClick={() => onWordClick(w)}
                className="font-body text-xs sm:text-sm text-ink lowercase whitespace-nowrap underline decoration-dotted decoration-ink/30 underline-offset-[3px] hover:decoration-ink hover:bg-ink/5 px-1 py-0.5 rounded transition"
                aria-label={`Show definition of ${w}`}
              >
                {w}
              </button>
            </li>
          </Fragment>
        ))}
      </ul>
    </div>
  );
}
