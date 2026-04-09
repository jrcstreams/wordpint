import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAppStore } from './state/store';
import { loadWordIndex } from './words/loader';
import { findWords } from './words/findWords';
import { PhysicsStage, type PhysicsStageHandle } from './physics/PhysicsStage';
import { BarTap } from './ui/BarTap';
import { WordsPanel } from './ui/WordsPanel';
import { HistoryStrip } from './ui/HistoryStrip';
import { DictionaryBanner } from './ui/DictionaryBanner';
import { WordModal } from './ui/WordModal';
import type { WordResult } from './words/types';

export default function App() {
  const stageRef = useRef<PhysicsStageHandle>(null);
  const [modalWord, setModalWord] = useState<string | null>(null);

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

  const modalDefinition =
    modalWord && wordIndex ? wordIndex.definitions[modalWord] ?? null : null;

  return (
    <div className="flex flex-col h-full bg-paper text-ink">
      {/* ============ TOP NAV ============ */}
      <header className="shrink-0 border-b-2 border-ink bg-paper px-4 sm:px-6 py-3 sm:py-4">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-ink leading-none">
          Pint of Words
        </h1>
        <p className="text-xs sm:text-sm text-ink-mute mt-1.5 leading-none">
          pour a pint, learn a word
        </p>
      </header>

      {/* ============ POUR STAGE ============ */}
      <div className="relative basis-[42%] sm:basis-[44%] grow-0 shrink-0 overflow-hidden bg-bar-wood border-b-2 border-ink">
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
        <HistoryStrip history={history} onWordClick={setModalWord} />
      </div>

      {/* ============ MODAL ============ */}
      <WordModal
        word={modalWord}
        definition={modalDefinition}
        onClose={() => setModalWord(null)}
      />
    </div>
  );
}
