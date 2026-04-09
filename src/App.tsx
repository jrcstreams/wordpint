import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useAppStore } from './state/store';
import { loadWordIndex } from './words/loader';
import { findWords } from './words/findWords';
import { PhysicsStage, type PhysicsStageHandle } from './physics/PhysicsStage';
import { BarTap } from './ui/BarTap';
import { WordsPanel } from './ui/WordsPanel';
import { HistoryStrip } from './ui/HistoryStrip';
import { DictionaryBanner } from './ui/DictionaryBanner';
import { WordModal } from './ui/WordModal';
import { SectionDivider } from './ui/SectionDivider';
import type { WordResult } from './words/types';

const GITHUB_URL = 'https://github.com/jrcstreams/wordpint';

export default function App() {
  const stageRef = useRef<PhysicsStageHandle>(null);
  const [modalWord, setModalWord] = useState<string | null>(null);

  // Responsive bar size based on actual viewport HEIGHT (not width).
  // Tailwind's default breakpoints are width-based, but the layout
  // problem is vertical: on short laptop windows the bar at 46% leaves
  // the words section too small for the hero to fit. Shrink the bar
  // on shorter viewports so the words section gets the space it needs.
  const [barBasis, setBarBasis] = useState('44%');
  const [showExplainer, setShowExplainer] = useState(true);

  useLayoutEffect(() => {
    const update = () => {
      const vh = window.innerHeight;
      if (vh < 720) {
        setBarBasis('36%');
        setShowExplainer(false);
      } else if (vh < 820) {
        setBarBasis('40%');
        setShowExplainer(false);
      } else if (vh < 950) {
        setBarBasis('44%');
        setShowExplainer(true);
      } else {
        setBarBasis('46%');
        setShowExplainer(true);
      }
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

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
      <header className="shrink-0 border-b-2 border-ink bg-paper px-4 sm:px-6 py-3 sm:py-3.5 flex items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <h1 className="text-2xl sm:text-3xl md:text-[2rem] font-black tracking-tight text-ink leading-none whitespace-nowrap">
            WordPint
          </h1>
          {/* Inter's metrics put a small tagline's visual center slightly
              ABOVE the title's visual center when both are box-centered
              (items-center). translate-y nudges the visible text down so
              the lowercase mid-line of the tagline lines up with the
              lowercase mid-line of "WordPint". */}
          <p className="text-[11px] sm:text-[13px] font-medium text-ink-mute leading-none whitespace-nowrap translate-y-[1.5px] sm:translate-y-[2px] md:translate-y-[3px]">
            Pour a Pint, Learn a Word
          </p>
        </div>
        <a
          href={GITHUB_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="View on GitHub"
          className="shrink-0 text-ink hover:text-ink-mute transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 16 16"
            width="22"
            height="22"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
          </svg>
        </a>
      </header>

      {/* ============ POUR STAGE ============
          flexBasis is responsive to actual viewport height — smaller
          on shorter laptops so the words section fits without overlap. */}
      <div
        className="relative grow-0 shrink-0 overflow-hidden bg-bar-wood border-b-2 border-ink"
        style={{ flexBasis: barBasis }}
      >
        <PhysicsStage ref={stageRef} />
        <BarTap
          onStart={() => stageRef.current?.startPour()}
          onStop={() => stageRef.current?.stopPour()}
          showHint={showTapHint}
        />
        <DictionaryBanner status={dictionaryStatus} onRetry={loadDictionary} />
      </div>

      {/* ============ WORDS + TAB (seamless flow) ============ */}
      <div className="flex-1 min-h-0 flex flex-col bg-paper-grain overflow-hidden">
        {/* How it works — concise numbered steps between the cup and
            the words section. Hidden on narrow widths AND short
            heights to free up panel space for the hero. */}
        <div
          className="hidden sm:block shrink-0 px-3 sm:px-6 pt-2 pb-2 sm:pt-3 sm:pb-3"
          style={{ display: showExplainer ? undefined : 'none' }}
        >
          <ol className="text-[11px] sm:text-[13px] text-ink-mute leading-snug max-w-xl mx-auto flex items-center justify-center gap-x-3 sm:gap-x-4 gap-y-1 flex-wrap">
            <li>
              <span className="font-semibold text-ink-soft">1.</span> Pour
              letters.
            </li>
            <li>
              <span className="font-semibold text-ink-soft">2.</span> Words
              appear.
            </li>
            <li>
              <span className="font-semibold text-ink-soft">3.</span>{' '}
              <span className="font-semibold text-ink-soft">"Next Word"</span>{' '}
              removes letters.
            </li>
          </ol>
        </div>
        {currentResults.length > 0 && (
          <SectionDivider count={currentResults.length}>
            Words on Tap
          </SectionDivider>
        )}
        <WordsPanel
          results={currentResults}
          letterCount={lettersInGlass.size}
          dictionaryReady={dictionaryStatus === 'ready'}
          onPick={onPickWord}
          onEmptyCup={onEmptyCup}
        />
        {history.length > 0 && (
          <HistoryStrip history={history} onWordClick={setModalWord} />
        )}
      </div>

      {/* ============ PAGE FOOTER ============ */}
      <footer className="shrink-0 border-t border-ink/30 bg-paper px-4 sm:px-6 py-3 sm:py-3.5 flex items-center justify-between gap-3 text-[10px] sm:text-[11px] text-ink-mute">
        <span>
          Definitions from{' '}
          <a
            href="https://wordnet.princeton.edu/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-dotted underline-offset-2 hover:text-ink transition-colors"
          >
            Princeton WordNet
          </a>
        </span>
        <span>
          Created by{' '}
          <a
            href="https://www.linkedin.com/in/johnchoudhari/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-ink underline decoration-dotted underline-offset-2 hover:text-ink-mute transition-colors"
          >
            John Choudhari
          </a>
        </span>
      </footer>

      {/* ============ MODAL ============ */}
      <WordModal
        word={modalWord}
        definition={modalDefinition}
        onClose={() => setModalWord(null)}
      />
    </div>
  );
}
