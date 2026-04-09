import { useEffect } from 'react';

interface WordModalProps {
  word: string | null;
  definition: string | null;
  /** True for proper nouns — display with a leading capital. */
  proper?: boolean;
  onClose: () => void;
}

/**
 * Lightweight modal that shows a word + its definition. Used by the
 * Running Tab so users can revisit any word they've already used.
 */
export function WordModal({ word, definition, proper, onClose }: WordModalProps) {
  const displayedWord = word
    ? proper
      ? word.charAt(0).toUpperCase() + word.slice(1)
      : word
    : null;

  useEffect(() => {
    if (!word) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [word, onClose]);

  if (!word) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-fade"
      role="dialog"
      aria-modal="true"
      aria-label={`Definition of ${word}`}
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
            proper ? '' : 'lowercase'
          }`}
        >
          {displayedWord}
        </h3>

        <p className="mt-3 sm:mt-4 font-body text-base sm:text-lg text-ink-soft leading-snug">
          {definition || 'no definition on file'}
        </p>
      </div>
    </div>
  );
}
