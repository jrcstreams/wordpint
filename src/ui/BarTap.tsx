import { useCallback, useState } from 'react';

interface BarTapProps {
  onStart: () => void;
  onStop: () => void;
  /** True until the user has poured at least once — drives the hint label and glow. */
  showHint: boolean;
}

/**
 * Big, obvious bar tap centered above the pint glass. Press and hold (or
 * touch and hold) anywhere on the tap to pour. Until the first pour, an
 * animated glow ring + "press & hold to pour" label make the interaction
 * impossible to miss.
 */
export function BarTap({ onStart, onStop, showHint }: BarTapProps) {
  const [pouring, setPouring] = useState(false);

  const handleDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
      setPouring(true);
      onStart();
    },
    [onStart],
  );

  const handleUp = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      if (!pouring) return;
      setPouring(false);
      onStop();
    },
    [onStop, pouring],
  );

  return (
    <div className="absolute top-0 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none">
      {/* Press target — must be pointer-events-auto */}
      <button
        type="button"
        onPointerDown={handleDown}
        onPointerUp={handleUp}
        onPointerCancel={handleUp}
        onPointerLeave={handleUp}
        aria-label="Bar tap — press and hold to pour letters"
        aria-pressed={pouring}
        className={`pointer-events-auto select-none touch-none cursor-pointer relative ${
          pouring ? 'tap-pouring' : ''
        }`}
        style={{ background: 'transparent', border: 0, padding: 0 }}
      >
        {/* Hint glow ring (only before first pour) */}
        {showHint && (
          <span
            aria-hidden="true"
            className="hint-glow absolute left-1/2 top-[58%] -translate-x-1/2 -translate-y-1/2 w-[140px] h-[140px] rounded-full pointer-events-none"
          />
        )}

        <svg
          width="180"
          height="148"
          viewBox="0 0 180 148"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="relative"
        >
          {/* Mounting plate (ceiling beam) */}
          <rect x="66" y="0" width="48" height="10" fill="#1a1a1a" />
          <rect x="62" y="10" width="56" height="5" fill="#1a1a1a" />

          {/* Vertical neck */}
          <rect x="83" y="15" width="14" height="34" fill="#1a1a1a" />

          {/* Tap body / barrel + handle (tilts when pouring) */}
          <g className="tap-handle">
            {/* Barrel */}
            <rect x="78" y="46" width="24" height="34" rx="4" fill="#1a1a1a" />
            {/* Decorative band */}
            <rect x="78" y="56" width="24" height="3" fill="#f7f3ea" />
            <rect x="78" y="68" width="24" height="2" fill="#f7f3ea" />

            {/* Handle lever */}
            <rect x="86" y="22" width="8" height="28" fill="#1a1a1a" />
            <circle cx="90" cy="20" r="9" fill="#1a1a1a" />
            <circle cx="90" cy="20" r="4" fill="#f7f3ea" />
            <circle cx="90" cy="20" r="2" fill="#1a1a1a" />

            {/* Spout */}
            <path d="M80,80 L77,96 L103,96 L100,80 Z" fill="#1a1a1a" />
            <rect x="80" y="96" width="20" height="5" fill="#1a1a1a" />
            {/* Spout opening (small dark circle) */}
            <ellipse cx="90" cy="100" rx="6" ry="1.6" fill="#3a3328" />
          </g>

          {/* Stream — visible only while pouring (CSS-driven) */}
          <rect
            className="tap-stream"
            x="87"
            y="103"
            width="6"
            height="36"
            rx="3"
            fill="#e8a838"
            opacity="0"
          />
          {/* Drip hint (always present, very subtle) */}
          {!pouring && (
            <circle cx="90" cy="105" r="1.6" fill="#e8a838" opacity="0.55" />
          )}
        </svg>
      </button>

      {/* Hint label */}
      {showHint && (
        <div className="mt-1 pointer-events-none">
          <div className="hint-label font-receipt text-[11px] uppercase tracking-[0.22em] text-ink bg-paper px-3 py-1 border border-ink shadow-[2px_2px_0_0_rgba(26,26,26,0.85)]">
            press &amp; hold to pour
          </div>
        </div>
      )}
    </div>
  );
}
