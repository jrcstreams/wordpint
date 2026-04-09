interface HistoryStripProps {
  history: string[];
  onWordClick: (word: string) => void;
}

/**
 * "Running tab" strip across the bottom showing words used this session.
 * Each word is a button that opens the definition modal.
 */
export function HistoryStrip({ history, onWordClick }: HistoryStripProps) {
  if (history.length === 0) return null;
  const recent = [...history].reverse().slice(0, 30);
  return (
    <div className="tab-strip border-t border-ink shrink-0 px-4 sm:px-6 py-1.5 sm:py-2 flex items-center gap-2.5 overflow-x-auto">
      <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink whitespace-nowrap">
        Running tab
      </span>
      <span className="text-ink/30">—</span>
      <ul className="flex items-center gap-1 min-w-0">
        {recent.map((w, i) => (
          <li key={`${w}-${i}`} className="whitespace-nowrap">
            <button
              type="button"
              onClick={() => onWordClick(w)}
              className="font-body text-sm text-ink lowercase underline decoration-dotted decoration-ink/30 underline-offset-[3px] hover:decoration-ink hover:bg-ink/5 px-1 py-0.5 rounded transition"
              aria-label={`Show definition of ${w}`}
            >
              {w}
            </button>
            {i < recent.length - 1 && (
              <span className="ml-1 text-ink/30">·</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
