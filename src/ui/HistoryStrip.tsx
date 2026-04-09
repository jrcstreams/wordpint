interface HistoryStripProps {
  history: string[];
}

/**
 * Receipt-paper strip across the bottom of the page showing words used in
 * this session. Renders nothing until the first word is used.
 */
export function HistoryStrip({ history }: HistoryStripProps) {
  if (history.length === 0) return null;
  // Most recent first, capped to keep the strip compact.
  const recent = [...history].reverse().slice(0, 24);
  return (
    <div className="receipt px-4 sm:px-6 py-2 flex items-center gap-3 overflow-x-auto">
      <span className="font-receipt text-[10px] uppercase tracking-[0.22em] text-ink-mute whitespace-nowrap">
        running tab
      </span>
      <span className="text-ink/30">—</span>
      <ul className="flex items-center gap-2 min-w-0">
        {recent.map((w, i) => (
          <li
            key={`${w}-${i}`}
            className="font-receipt text-[11px] text-ink whitespace-nowrap"
          >
            <span className="lowercase">{w}</span>
            {i < recent.length - 1 && (
              <span className="ml-2 text-ink/40">·</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
