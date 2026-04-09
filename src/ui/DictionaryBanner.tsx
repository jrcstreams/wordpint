import type { DictionaryStatus } from '../state/store';

interface DictionaryBannerProps {
  status: DictionaryStatus;
  onRetry: () => void;
}

export function DictionaryBanner({ status, onRetry }: DictionaryBannerProps) {
  if (status !== 'error') return null;
  return (
    <div className="absolute top-4 right-4 px-4 py-2 rounded-lg bg-red-900/90 text-red-100 flex items-center gap-3">
      <span>Couldn't load dictionary — word lookup unavailable</span>
      <button
        type="button"
        className="px-2 py-1 rounded bg-red-700 hover:bg-red-600"
        onClick={onRetry}
      >
        Retry
      </button>
    </div>
  );
}
