interface HistoryStripProps {
  history: string[];
}

/**
 * "Running tab" strip across the bottom of the page showing words used in
 * this session. Renders nothing until the first word is used.
 */
export function HistoryStrip({ history }: HistoryStripProps) {
  if (history.length === 0) return null;
  const recent = [...history].reverse().slice(0, 30);
  return (
    <div className="tab-strip border-t border-ink shrink-0 px-4 sm:px-6 py-2 flex items-center gap-3 overflow-x-auto">
      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink whitespace-nowrap">
        Running tab
      </span>
      <span className="text-ink/30">—</span>
      <ul className="flex items-center gap-2 min-w-0">
        {recent.map((w, i) => (
          <li
            key={`${w}-${i}`}
            className="font-body text-sm text-ink whitespace-nowrap"
          >
            <span className="lowercase">{w}</span>
            {i < recent.length - 1 && (
              <span className="ml-2 text-ink/35">·</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
