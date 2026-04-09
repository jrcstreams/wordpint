import { useCallback, useEffect, useRef, useState } from 'react';
import { computeTapAllowance, TAP_TOP_OFFSET } from '../physics/sizing';

interface BarTapProps {
  onStart: () => void;
  onStop: () => void;
  /** True until the user has poured at least once — drives the glow ring. */
  showHint: boolean;
}

/**
 * A monochrome draft tap with a branded paddle. The paddle is the brand
 * placement: a pint glass emblem at the top, then the stacked
 * HOLD / TO / POUR wordmark, all framed in a double-bordered cream inset.
 *
 * Press and hold the assembly to pour; the entire branded head pivots
 * forward at the body collar like a real beer tap.
 */
export function BarTap({ onStart, onStop, showHint }: BarTapProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [pouring, setPouring] = useState(false);
  const [tapHeight, setTapHeight] = useState(220);

  useEffect(() => {
    const el = wrapperRef.current?.parentElement;
    if (!el) return;
    const update = () => setTapHeight(computeTapAllowance(el.clientHeight));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

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

  // viewBox is 220×304; aspect drives the wrapper width.
  const aspect = 220 / 304;
  const svgWidth = tapHeight * aspect;

  return (
    <div
      ref={wrapperRef}
      className="absolute left-1/2 -translate-x-1/2 pointer-events-none"
      style={{ top: TAP_TOP_OFFSET, width: svgWidth, height: tapHeight }}
    >
      <button
        type="button"
        onPointerDown={handleDown}
        onPointerUp={handleUp}
        onPointerCancel={handleUp}
        onPointerLeave={handleUp}
        aria-label="Draft tap — press and hold the handle to pour letters"
        aria-pressed={pouring}
        className={`pointer-events-auto select-none touch-none cursor-pointer relative w-full h-full bg-transparent border-0 p-0 ${
          pouring ? 'tap-pouring' : ''
        } ${showHint ? 'tap-hint' : ''}`}
      >
        <svg
          viewBox="0 0 220 304"
          width="100%"
          height="100%"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="overflow-visible"
        >
          {/* ============ HANDLE GROUP (pivots when pouring) ============ */}
          <g className="tap-handle">
            {/* Outer paddle (black) */}
            <rect
              x="28"
              y="2"
              width="164"
              height="184"
              rx="14"
              fill="#1a1a1a"
            />

            {/* Cream inset */}
            <rect
              x="36"
              y="10"
              width="148"
              height="168"
              rx="7"
              fill="#fbf7ec"
              stroke="#1a1a1a"
              strokeWidth="1.8"
            />

            {/* Inner thin frame ornament */}
            <rect
              x="42"
              y="16"
              width="136"
              height="156"
              rx="4"
              fill="none"
              stroke="#1a1a1a"
              strokeWidth="0.7"
            />

            {/* Pint glass graphic — the brand emblem */}
            <g>
              <circle cx="102" cy="24" r="2.2" fill="#1a1a1a" />
              <circle cx="110" cy="22" r="2.6" fill="#1a1a1a" />
              <circle cx="118" cy="24" r="2.2" fill="#1a1a1a" />
              <path
                d="M 95 28 L 125 28 L 122 46 L 98 46 Z"
                fill="none"
                stroke="#1a1a1a"
                strokeWidth="1.8"
                strokeLinejoin="round"
              />
              <path
                d="M 99 36 L 121 36 L 119 44 L 101 44 Z"
                fill="#1a1a1a"
              />
            </g>

            {/* Decorative flanking lines under the emblem */}
            <line
              x1="56"
              y1="58"
              x2="92"
              y2="58"
              stroke="#1a1a1a"
              strokeWidth="0.9"
            />
            <line
              x1="128"
              y1="58"
              x2="164"
              y2="58"
              stroke="#1a1a1a"
              strokeWidth="0.9"
            />

            {/* HOLD */}
            <text
              x="110"
              y="92"
              textAnchor="middle"
              fontFamily='"Playfair Display", Georgia, serif'
              fontSize="32"
              fontWeight="900"
              fill="#1a1a1a"
              letterSpacing="2.5"
            >
              HOLD
            </text>

            {/* TO */}
            <text
              x="110"
              y="128"
              textAnchor="middle"
              fontFamily='"Playfair Display", Georgia, serif'
              fontSize="32"
              fontWeight="900"
              fill="#1a1a1a"
              letterSpacing="2.5"
            >
              TO
            </text>

            {/* POUR */}
            <text
              x="110"
              y="164"
              textAnchor="middle"
              fontFamily='"Playfair Display", Georgia, serif'
              fontSize="32"
              fontWeight="900"
              fill="#1a1a1a"
              letterSpacing="2.5"
            >
              POUR
            </text>

            {/* Lower neck connecting to body collar */}
            <rect x="103" y="186" width="14" height="6" fill="#1a1a1a" />
          </g>

          {/* ============ TAP BODY (static) ============ */}
          {/* Mounting collar */}
          <rect x="86" y="192" width="48" height="12" rx="2" fill="#1a1a1a" />

          {/* Chrome cylinder body */}
          <rect x="92" y="204" width="36" height="56" rx="6" fill="#1a1a1a" />
          <rect
            x="95"
            y="208"
            width="5"
            height="48"
            rx="2"
            fill="rgba(255,255,255,0.2)"
          />
          <rect x="92" y="216" width="36" height="2" fill="#fbf7ec" />
          <rect x="92" y="246" width="36" height="2" fill="#fbf7ec" />

          {/* ============ SPOUT ============ */}
          <path d="M92,260 L88,276 L132,276 L128,260 Z" fill="#1a1a1a" />
          <rect x="92" y="276" width="36" height="6" rx="1" fill="#1a1a1a" />
          <ellipse cx="110" cy="284" rx="14" ry="2" fill="#3a3328" />
        </svg>

        {/* Hint glow ring around the paddle (only before first pour) */}
        {showHint && (
          <span
            aria-hidden="true"
            className="hint-glow absolute left-1/2 top-[30%] -translate-x-1/2 -translate-y-1/2 w-[95%] h-[58%] rounded-full pointer-events-none"
          />
        )}
      </button>
    </div>
  );
}
