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

  // Show the tap hint until the user has poured at least once.
  const showTapHint = lettersInGlass.size === 0 && history.length === 0;

  return (
    <div className="flex flex-col h-full bg-paper text-ink">
      {/* Top: bar / pour stage */}
      <div className="relative basis-[44%] sm:basis-1/2 grow-0 shrink-0 overflow-hidden bg-bar-wood border-b-4 border-ink">
        <PhysicsStage ref={stageRef} />
        <BarTap
          onStart={() => stageRef.current?.startPour()}
          onStop={() => stageRef.current?.stopPour()}
          showHint={showTapHint}
        />
        <DictionaryBanner status={dictionaryStatus} onRetry={loadDictionary} />

        {/* Header in the corner */}
        <div className="absolute top-3 left-4 sm:top-4 sm:left-6 pointer-events-none max-w-[60%]">
          <h1 className="font-display text-2xl sm:text-3xl md:text-4xl text-ink leading-none">
            Pint of Words
          </h1>
          <p className="font-receipt text-[9px] sm:text-[10px] uppercase tracking-[0.18em] text-ink-mute mt-1">
            pour a pint · learn a word
          </p>
        </div>
      </div>

      {/* Bottom: words & receipt */}
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
