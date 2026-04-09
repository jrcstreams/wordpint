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

        {/* Masthead in the corner */}
        <div className="absolute top-3 left-4 sm:top-5 sm:left-6 pointer-events-none">
          <p className="font-receipt text-[9px] sm:text-[10px] uppercase tracking-[0.42em] text-ink-mute leading-none">
            est. 2026
          </p>
          <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-ink leading-[0.92] mt-1">
            Pint of Words
          </h1>
          <div className="flex items-center gap-2 mt-2">
            <span className="h-px w-5 bg-ink/45" />
            <p className="font-body italic text-[13px] sm:text-sm text-ink-soft leading-none">
              pour a pint, learn a word
            </p>
            <span className="h-px w-5 bg-ink/45" />
          </div>
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
