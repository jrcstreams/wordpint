import { Fragment } from 'react';

interface HistoryStripProps {
  history: string[];
  onWordClick: (word: string) => void;
}

/**
 * "Running tab" content row showing words used this session. Each word
 * is a button that opens the definition modal. The "Running Tab" label
 * itself is rendered by a SectionDivider above this strip.
 *
 * App.tsx only renders this when history.length > 0, so we don't need
 * an empty state here.
 */
export function HistoryStrip({ history, onWordClick }: HistoryStripProps) {
  if (history.length === 0) return null;
  const recent = [...history].reverse().slice(0, 8);
  return (
    <div className="shrink-0 pb-4 sm:pb-5 overflow-x-auto">
      <ul className="flex items-center justify-center gap-2 sm:gap-2.5 px-4 sm:px-6 whitespace-nowrap">
        {recent.map((w, i) => (
          <Fragment key={`${w}-${i}`}>
            {i > 0 && (
              <li
                aria-hidden="true"
                className="text-ink/30 select-none"
              >
                ·
              </li>
            )}
            <li>
              <button
                type="button"
                onClick={() => onWordClick(w)}
                className="font-body text-sm sm:text-base text-ink lowercase whitespace-nowrap underline decoration-dotted decoration-ink/30 underline-offset-[3px] hover:decoration-ink hover:bg-ink/5 px-1.5 py-0.5 rounded transition"
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
