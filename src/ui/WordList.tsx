import type { WordResult } from '../words/types';

interface WordListProps {
  open: boolean;
  results: WordResult[];
  onClose: () => void;
  onPick: (word: WordResult) => void;
}

export function WordList({ open, results, onClose, onPick }: WordListProps) {
  if (!open) return null;
  const sorted = [...results].sort((a, b) => b.word.length - a.word.length);
  return (
    <div className="fixed top-0 right-0 h-full w-80 bg-stone-900/95 backdrop-blur p-4 overflow-y-auto shadow-2xl">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-amber-300">All words ({sorted.length})</h2>
        <button
          type="button"
          className="text-stone-400 hover:text-stone-200"
          onClick={onClose}
          aria-label="Close word list"
        >
          ×
        </button>
      </div>
      <ul className="space-y-1">
        {sorted.map((r) => (
          <li key={r.word}>
            <button
              type="button"
              className="w-full text-left px-2 py-1 rounded hover:bg-stone-800"
              onClick={() => onPick(r)}
            >
              <span className="text-stone-100">{r.word}</span>
              <span className="ml-2 text-xs text-stone-500">{r.word.length}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
