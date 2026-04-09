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
    <div className="receipt px-6 py-2 flex items-center gap-3 overflow-x-auto">
      <span className="font-receipt text-[10px] uppercase tracking-widest text-ink-mute whitespace-nowrap">
        tab —
      </span>
      <ul className="flex items-center gap-2 min-w-0">
        {recent.map((w, i) => (
          <li
            key={`${w}-${i}`}
            className="font-receipt text-xs text-ink whitespace-nowrap"
          >
            <span className="lowercase">{w}</span>
            {i < recent.length - 1 && (
              <span className="ml-2 text-ink-mute">·</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
