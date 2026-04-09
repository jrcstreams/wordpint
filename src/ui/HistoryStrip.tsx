interface HistoryStripProps {
  history: string[];
}

export function HistoryStrip({ history }: HistoryStripProps) {
  if (history.length === 0) return null;
  return (
    <div className="absolute bottom-4 left-4 right-4 flex flex-wrap gap-2">
      {history.map((w, i) => (
        <span
          key={`${w}-${i}`}
          className="px-3 py-1 rounded-full bg-stone-800/80 text-stone-200 text-sm"
        >
          {w}
        </span>
      ))}
    </div>
  );
}
