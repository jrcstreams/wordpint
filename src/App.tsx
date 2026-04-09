import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useAppStore } from './state/store';
import { loadWordIndex } from './words/loader';
import { findWords } from './words/findWords';
import { PhysicsStage, type PhysicsStageHandle } from './physics/PhysicsStage';
import { BarTap } from './ui/BarTap';
import { WordsPanel } from './ui/WordsPanel';
import { HistoryStrip } from './ui/HistoryStrip';
import { DictionaryBanner } from './ui/DictionaryBanner';
import type { WordResult } from './words/types';

export default function App() {
  const stageRef = useRef<PhysicsStageHandle>(null);

  const lettersInGlass = useAppStore((s) => s.lettersInGlass);
  const wordIndex = useAppStore((s) => s.wordIndex);
  const dictionaryStatus = useAppStore((s) => s.dictionaryStatus);
  const history = useAppStore((s) => s.history);
  const setDictionary = useAppStore((s) => s.setDictionary);
  const setDictionaryStatus = useAppStore((s) => s.setDictionaryStatus);
  const useWordAction = useAppStore((s) => s.useWord);
  const clearGlass = useAppStore((s) => s.clearGlass);

  const loadDictionary = useCallback(async () => {
    setDictionaryStatus('loading');
    try {
      const idx = await loadWordIndex();
      setDictionary(idx);
    } catch {
      setDictionaryStatus('error');
    }
  }, [setDictionary, setDictionaryStatus]);

  useEffect(() => {
    loadDictionary();
  }, [loadDictionary]);

  const currentResults = useMemo<WordResult[]>(() => {
    if (!wordIndex) return [];
    if (lettersInGlass.size === 0) return [];
    return findWords(Array.from(lettersInGlass.values()), wordIndex, {
      minLength: 3,
    });
  }, [wordIndex, lettersInGlass]);

  const onPickWord = useCallback(
    (word: string) => {
      const removed = useWordAction(word);
      if (removed.length > 0) {
        stageRef.current?.removeLetters(removed);
      }
    },
    [useWordAction],
  );

  const onEmptyCup = useCallback(() => {
    stageRef.current?.clearAll();
    clearGlass();
  }, [clearGlass]);

  const showTapHint = lettersInGlass.size === 0 && history.length === 0;

  return (
    <div className="flex flex-col h-full bg-paper text-ink">
      {/* ============ TOP NAV ============ */}
      <header className="shrink-0 border-b-2 border-ink bg-paper px-4 sm:px-6 py-3 sm:py-3.5 flex items-baseline justify-between gap-4">
        <div className="flex items-baseline gap-3 sm:gap-5 min-w-0">
          <h1 className="font-display text-2xl sm:text-3xl md:text-[2rem] font-black tracking-tight text-ink leading-none whitespace-nowrap">
            Pint{' '}
            <span className="font-body italic font-normal text-[0.55em] text-ink-soft align-middle">
              of
            </span>{' '}
            Words
          </h1>
          <p className="hidden md:block font-body italic text-sm text-ink-mute leading-none whitespace-nowrap">
            pour a pint, learn a word
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-3">
          <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-ink-mute">
            est. 2026
          </span>
        </div>
      </header>

      {/* ============ POUR STAGE ============ */}
      <div className="relative basis-[40%] sm:basis-[44%] grow-0 shrink-0 overflow-hidden bg-bar-wood border-b-2 border-ink">
        <PhysicsStage ref={stageRef} />
        <BarTap
          onStart={() => stageRef.current?.startPour()}
          onStop={() => stageRef.current?.stopPour()}
          showHint={showTapHint}
        />
        <DictionaryBanner status={dictionaryStatus} onRetry={loadDictionary} />
      </div>

      {/* ============ WORDS + TAB ============ */}
      <div className="flex-1 min-h-0 flex flex-col">
        <WordsPanel
          results={currentResults}
          letterCount={lettersInGlass.size}
          dictionaryReady={dictionaryStatus === 'ready'}
          onPick={onPickWord}
          onEmptyCup={onEmptyCup}
        />
        <HistoryStrip history={history} />
      </div>
    </div>
  );
}
