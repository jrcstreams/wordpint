import type { DictionaryStatus } from '../state/store';

interface DictionaryBannerProps {
  status: DictionaryStatus;
  onRetry: () => void;
}

export function DictionaryBanner({ status, onRetry }: DictionaryBannerProps) {
  if (status !== 'error') return null;
  return (
    <div className="absolute top-4 right-4 max-w-sm bg-paper border-2 border-ink shadow-[3px_3px_0_0_rgba(26,26,26,0.85)] px-4 py-3 flex items-start gap-3">
      <div className="flex-1">
        <p className="font-display text-base text-ink leading-tight">
          The dictionary is closed.
        </p>
        <p className="font-body italic text-sm text-ink-mute">
          Couldn't load the word list — word lookup is unavailable.
        </p>
      </div>
      <button
        type="button"
        className="font-receipt text-xs uppercase tracking-widest px-2 py-1 border border-ink hover:bg-ink hover:text-paper transition"
        onClick={onRetry}
      >
        Retry
      </button>
    </div>
  );
}
