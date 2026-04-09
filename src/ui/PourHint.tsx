interface PourHintProps {
  visible: boolean;
}

/**
 * Floating "pull the tap" tooltip with a triangle pointer aimed at the
 * draft tap. Lives in the bar area, off to the right so it never covers
 * the cup. Hidden after the first pour.
 */
export function PourHint({ visible }: PourHintProps) {
  if (!visible) return null;
  return (
    <div className="absolute top-[38%] right-3 sm:right-6 -translate-y-1/2 pointer-events-none hint-tooltip">
      <div className="relative bg-paper border-2 border-ink shadow-[3px_3px_0_0_rgba(26,26,26,0.85)] px-3 py-2.5 sm:px-4 sm:py-3">
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden="true"
            className="font-display text-2xl sm:text-3xl text-ink leading-none hint-arrow"
          >
            ←
          </span>
          <div>
            <p className="font-receipt text-[10px] sm:text-[11px] uppercase tracking-[0.22em] text-ink leading-tight">
              pull the tap
            </p>
            <p className="font-body italic text-[12px] sm:text-[13px] text-ink-mute leading-tight mt-0.5">
              press &amp; hold
            </p>
          </div>
        </div>

        {/* Triangle pointer on the left edge */}
        <span
          aria-hidden="true"
          className="absolute left-[-10px] top-1/2 -translate-y-1/2 block w-0 h-0"
          style={{
            borderTop: '8px solid transparent',
            borderBottom: '8px solid transparent',
            borderRight: '10px solid #1a1a1a',
          }}
        />
      </div>
    </div>
  );
}
