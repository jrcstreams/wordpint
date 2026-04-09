import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useAppStore } from './state/store';
import { loadWordIndex } from './words/loader';
import { findWords } from './words/findWords';
import { weightedPick } from './words/scoring';
import { PhysicsStage, type PhysicsStageHandle } from './physics/PhysicsStage';
import { Dispenser } from './ui/Dispenser';
import { ControlsBar } from './ui/ControlsBar';
import { WordCard } from './ui/WordCard';
import { WordList } from './ui/WordList';
import { HistoryStrip } from './ui/HistoryStrip';
import { DictionaryBanner } from './ui/DictionaryBanner';
import type { WordResult } from './words/types';

export default function App() {
  const stageRef = useRef<PhysicsStageHandle>(null);

  const lettersInGlass = useAppStore((s) => s.lettersInGlass);
  const wordIndex = useAppStore((s) => s.wordIndex);
  const dictionaryStatus = useAppStore((s) => s.dictionaryStatus);
  const currentWord = useAppStore((s) => s.currentWord);
  const history = useAppStore((s) => s.history);
  const showFullList = useAppStore((s) => s.showFullList);
  const setCurrentWord = useAppStore((s) => s.setCurrentWord);
  const setDictionary = useAppStore((s) => s.setDictionary);
  const setDictionaryStatus = useAppStore((s) => s.setDictionaryStatus);
  const useWordAction = useAppStore((s) => s.useWord);
  const toggleFullList = useAppStore((s) => s.toggleFullList);

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

  // Compute the current candidate set lazily so Find/Next don't recompute.
  const currentResults = useMemo<WordResult[]>(() => {
    if (!wordIndex) return [];
    if (lettersInGlass.size === 0) return [];
    return findWords(Array.from(lettersInGlass.values()), wordIndex, {
      minLength: 3,
    });
  }, [wordIndex, lettersInGlass]);

  const onFindWord = useCallback(() => {
    if (currentResults.length === 0) {
      setCurrentWord(null);
      return;
    }
    const pick = weightedPick(currentResults.map((r) => r.word));
    if (!pick) {
      setCurrentWord(null);
      return;
    }
    const result = currentResults.find((r) => r.word === pick) ?? null;
    setCurrentWord(result);
  }, [currentResults, setCurrentWord]);

  const onUseWord = useCallback(
    (word: string) => {
      const removed = useWordAction(word);
      if (removed.length > 0) {
        stageRef.current?.removeLetters(removed);
      }
    },
    [useWordAction],
  );

  const onPickFromList = useCallback(
    (r: WordResult) => {
      setCurrentWord(r);
      toggleFullList();
    },
    [setCurrentWord, toggleFullList],
  );

  return (
    <div className="relative w-full h-full overflow-hidden">
      <PhysicsStage ref={stageRef} />
      <Dispenser
        onStart={() => stageRef.current?.startPour()}
        onStop={() => stageRef.current?.stopPour()}
      />
      <ControlsBar
        letterCount={lettersInGlass.size}
        dictionaryReady={dictionaryStatus === 'ready'}
        onFindWord={onFindWord}
        onToggleList={toggleFullList}
      />
      <div className="absolute bottom-40 left-1/2 -translate-x-1/2">
        {(currentWord || lettersInGlass.size > 0) && (
          <WordCard
            currentWord={currentWord}
            onNext={onFindWord}
            onUseWord={onUseWord}
          />
        )}
      </div>
      <WordList
        open={showFullList}
        results={currentResults}
        onClose={toggleFullList}
        onPick={onPickFromList}
      />
      <HistoryStrip history={history} />
      <DictionaryBanner status={dictionaryStatus} onRetry={loadDictionary} />
    </div>
  );
}
