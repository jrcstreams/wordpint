import { useCallback, useState } from 'react';

interface BarTapProps {
  onStart: () => void;
  onStop: () => void;
}

/**
 * A monochrome ink-illustration of a bar tap. Sits centered above the pint
 * glass. Press and hold (pointer down) to pour; release to stop. The handle
 * tilts forward and a faint stream appears while pouring.
 */
export function BarTap({ onStart, onStop }: BarTapProps) {
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
    <div
      className={`absolute top-0 left-1/2 -translate-x-1/2 select-none touch-none cursor-pointer ${
        pouring ? 'tap-pouring' : ''
      }`}
      onPointerDown={handleDown}
      onPointerUp={handleUp}
      onPointerCancel={handleUp}
      onPointerLeave={handleUp}
      role="button"
      aria-label="Bar tap — press and hold to pour letters"
      aria-pressed={pouring}
    >
      <svg
        width="120"
        height="92"
        viewBox="0 0 120 92"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Mounting plate (ceiling beam) */}
        <rect x="46" y="0" width="28" height="6" fill="#1a1a1a" />
        <rect x="44" y="6" width="32" height="3" fill="#1a1a1a" />

        {/* Vertical neck */}
        <rect x="55" y="9" width="10" height="22" fill="#1a1a1a" />

        {/* Tap body / barrel (horizontal) */}
        <g className="tap-handle">
          <rect x="52" y="28" width="16" height="22" rx="3" fill="#1a1a1a" />
          {/* Handle lever */}
          <rect x="58" y="14" width="4" height="18" fill="#1a1a1a" />
          <circle cx="60" cy="13" r="5" fill="#1a1a1a" />
          <circle cx="60" cy="13" r="2.5" fill="#f7f3ea" />
          {/* Spout */}
          <path d="M54,50 L52,60 L68,60 L66,50 Z" fill="#1a1a1a" />
          <rect x="55" y="60" width="10" height="3" fill="#1a1a1a" />
        </g>

        {/* Stream (visible only while pouring, animated via CSS class) */}
        <rect
          className="tap-stream"
          x="58.5"
          y="64"
          width="3"
          height="22"
          fill="#e8a838"
          opacity="0"
        />
      </svg>
    </div>
  );
}
