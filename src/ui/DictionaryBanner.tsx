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
        <p className="font-display text-base font-bold text-ink leading-tight">
          The dictionary is closed.
        </p>
        <p className="text-sm text-ink-mute mt-0.5">
          Couldn't load the word list — word lookup is unavailable.
        </p>
      </div>
      <button
        type="button"
        className="text-xs font-medium uppercase tracking-[0.12em] px-3 py-1.5 border border-ink hover:bg-ink hover:text-paper transition rounded"
        onClick={onRetry}
      >
        Retry
      </button>
    </div>
  );
}
