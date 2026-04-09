import type { WordResult } from '../words/types';

interface WordCardProps {
  currentWord: WordResult | null;
  onNext: () => void;
  onUseWord: (word: string) => void;
}

export function WordCard({ currentWord, onNext, onUseWord }: WordCardProps) {
  if (!currentWord) {
    return (
      <div className="rounded-2xl bg-stone-900/80 backdrop-blur p-6 text-stone-300">
        No words yet — try pouring a few more letters
      </div>
    );
  }
  return (
    <div className="rounded-2xl bg-stone-900/80 backdrop-blur p-6 max-w-md">
      <div className="text-3xl font-bold text-amber-300">{currentWord.word}</div>
      <p className="mt-2 text-stone-300">{currentWord.definition}</p>
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          className="px-4 py-2 rounded-full bg-stone-700 hover:bg-stone-600"
          onClick={onNext}
        >
          Next
        </button>
        <button
          type="button"
          className="px-4 py-2 rounded-full bg-amber-500 text-stone-900 font-semibold hover:bg-amber-400"
          onClick={() => onUseWord(currentWord.word)}
        >
          Use word
        </button>
      </div>
    </div>
  );
}
