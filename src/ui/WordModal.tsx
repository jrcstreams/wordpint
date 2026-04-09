import { useEffect, useState } from 'react';

interface WordModalProps {
  word: string | null;
  definitions: string[] | null;
  /** Optional display casing override (acronym, proper noun). */
  display?: string;
  onClose: () => void;
}

/**
 * Lightweight modal that shows a word + its definitions. Used by the
 * Running Tab so users can revisit any word they've already used. If
 * the word has more than one sense the modal exposes ‹ › chevrons to
 * page through them.
 */
export function WordModal({
  word,
  definitions,
  display,
  onClose,
}: WordModalProps) {
  const [defIndex, setDefIndex] = useState(0);

  // Reset to the primary sense whenever the modal switches to a
  // different word.
  useEffect(() => {
    setDefIndex(0);
  }, [word]);

  useEffect(() => {
    if (!word) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (!definitions || definitions.length <= 1) return;
      if (e.key === 'ArrowLeft') {
        setDefIndex((i) => (i - 1 + definitions.length) % definitions.length);
      }
      if (e.key === 'ArrowRight') {
        setDefIndex((i) => (i + 1) % definitions.length);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [word, definitions, onClose]);

  if (!word) return null;

  const displayedWord = display ?? word;
  const senseCount = definitions?.length ?? 0;
  const currentDef =
    senseCount > 0 ? definitions![defIndex] : 'no definition on file';
  const showSwipe = senseCount > 1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-fade"
      role="dialog"
      aria-modal="true"
      aria-label={`Definition of ${displayedWord}`}
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-ink/40" />

      {/* Card */}
      <div
        className="relative bg-paper border-2 border-ink shadow-[6px_6px_0_0_rgba(26,26,26,0.85)] max-w-md w-full p-6 sm:p-8 modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-2.5 right-2.5 w-8 h-8 flex items-center justify-center text-2xl text-ink-mute hover:text-ink hover:bg-ink/5 rounded transition leading-none"
          aria-label="Close"
        >
          ×
        </button>

        <h3
          className={`font-display text-3xl sm:text-4xl font-black tracking-tight text-ink leading-[0.9] pr-6 ${
            display ? '' : 'lowercase'
          }`}
        >
          {displayedWord}
        </h3>

        <p className="mt-3 sm:mt-4 font-body text-base sm:text-lg text-ink-soft leading-snug min-h-[3.5rem]">
          {currentDef}
        </p>

        {showSwipe && (
          <SenseNav
            index={defIndex}
            count={senseCount}
            onPrev={() =>
              setDefIndex((i) => (i - 1 + senseCount) % senseCount)
            }
            onNext={() => setDefIndex((i) => (i + 1) % senseCount)}
          />
        )}
      </div>
    </div>
  );
}

function SenseNav({
  index,
  count,
  onPrev,
  onNext,
}: {
  index: number;
  count: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div className="mt-4 flex items-center justify-between gap-3 border-t border-ink/15 pt-3">
      <button
        type="button"
        onClick={onPrev}
        className="text-ink hover:bg-ink/5 rounded-md px-2.5 py-1.5 text-base font-bold leading-none transition"
        aria-label="Previous definition"
      >
        ‹
      </button>
      <span className="text-[10px] uppercase tracking-[0.18em] font-bold text-ink-mute tabular-nums">
        sense {index + 1} of {count}
      </span>
      <button
        type="button"
        onClick={onNext}
        className="text-ink hover:bg-ink/5 rounded-md px-2.5 py-1.5 text-base font-bold leading-none transition"
        aria-label="Next definition"
      >
        ›
      </button>
    </div>
  );
}
