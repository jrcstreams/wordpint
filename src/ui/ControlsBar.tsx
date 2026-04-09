interface ControlsBarProps {
  letterCount: number;
  dictionaryReady: boolean;
  onFindWord: () => void;
  onToggleList: () => void;
}

export function ControlsBar({
  letterCount,
  dictionaryReady,
  onFindWord,
  onToggleList,
}: ControlsBarProps) {
  if (letterCount === 0) return null;
  if (!dictionaryReady) {
    return (
      <div className="absolute bottom-24 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-stone-900/80 text-stone-300">
        Loading dictionary…
      </div>
    );
  }
  return (
    <div className="absolute bottom-24 left-1/2 -translate-x-1/2 flex gap-2">
      <button
        type="button"
        className="px-5 py-2 rounded-full bg-amber-500 text-stone-900 font-semibold hover:bg-amber-400"
        onClick={onFindWord}
      >
        Find a word
      </button>
      <button
        type="button"
        className="px-5 py-2 rounded-full bg-stone-800 text-stone-200 hover:bg-stone-700"
        onClick={onToggleList}
      >
        Show all
      </button>
    </div>
  );
}
