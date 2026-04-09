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
 * placement: a cream paddle with a double-frame ornament containing the
 * stacked CLICK / TO / POUR wordmark, framed by horizontal rules.
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

  // viewBox is 220×290; aspect drives the wrapper width.
  const aspect = 220 / 290;
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
          viewBox="0 0 220 290"
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
              x="30"
              y="2"
              width="160"
              height="170"
              rx="12"
              fill="#1a1a1a"
            />

            {/* Cream inset */}
            <rect
              x="38"
              y="10"
              width="144"
              height="154"
              rx="6"
              fill="#fbf7ec"
              stroke="#1a1a1a"
              strokeWidth="1.8"
            />

            {/* Inner thin frame ornament */}
            <rect
              x="44"
              y="16"
              width="132"
              height="142"
              rx="4"
              fill="none"
              stroke="#1a1a1a"
              strokeWidth="0.7"
            />

            {/* Pint glass graphic — the brand emblem */}
            <g>
              {/* Foam bubbles on top */}
              <circle cx="102" cy="22" r="2.2" fill="#1a1a1a" />
              <circle cx="110" cy="20" r="2.6" fill="#1a1a1a" />
              <circle cx="118" cy="22" r="2.2" fill="#1a1a1a" />
              {/* Glass outline (conical pint shape) */}
              <path
                d="M 95 26 L 125 26 L 122 44 L 98 44 Z"
                fill="none"
                stroke="#1a1a1a"
                strokeWidth="1.8"
                strokeLinejoin="round"
              />
              {/* Beer fill (lower portion) */}
              <path
                d="M 99 34 L 121 34 L 119 42 L 101 42 Z"
                fill="#1a1a1a"
              />
            </g>

            {/* Decorative flanking lines under the emblem */}
            <line
              x1="58"
              y1="56"
              x2="92"
              y2="56"
              stroke="#1a1a1a"
              strokeWidth="0.9"
            />
            <line
              x1="128"
              y1="56"
              x2="162"
              y2="56"
              stroke="#1a1a1a"
              strokeWidth="0.9"
            />

            {/* CLICK */}
            <text
              x="110"
              y="84"
              textAnchor="middle"
              fontFamily='"Playfair Display", Georgia, serif'
              fontSize="30"
              fontWeight="900"
              fill="#1a1a1a"
              letterSpacing="2"
            >
              CLICK
            </text>

            {/* TO */}
            <text
              x="110"
              y="116"
              textAnchor="middle"
              fontFamily='"Playfair Display", Georgia, serif'
              fontSize="30"
              fontWeight="900"
              fill="#1a1a1a"
              letterSpacing="2"
            >
              TO
            </text>

            {/* POUR */}
            <text
              x="110"
              y="148"
              textAnchor="middle"
              fontFamily='"Playfair Display", Georgia, serif'
              fontSize="30"
              fontWeight="900"
              fill="#1a1a1a"
              letterSpacing="2"
            >
              POUR
            </text>

            {/* Lower neck connecting to body collar */}
            <rect x="103" y="172" width="14" height="6" fill="#1a1a1a" />
          </g>

          {/* ============ TAP BODY (static) ============ */}
          {/* Mounting collar */}
          <rect x="86" y="178" width="48" height="12" rx="2" fill="#1a1a1a" />

          {/* Chrome cylinder body */}
          <rect x="92" y="190" width="36" height="56" rx="6" fill="#1a1a1a" />
          <rect
            x="95"
            y="194"
            width="5"
            height="48"
            rx="2"
            fill="rgba(255,255,255,0.2)"
          />
          <rect x="92" y="202" width="36" height="2" fill="#fbf7ec" />
          <rect x="92" y="232" width="36" height="2" fill="#fbf7ec" />

          {/* ============ SPOUT ============ */}
          <path d="M92,246 L88,262 L132,262 L128,246 Z" fill="#1a1a1a" />
          <rect x="92" y="262" width="36" height="6" rx="1" fill="#1a1a1a" />
          <ellipse cx="110" cy="270" rx="14" ry="2" fill="#3a3328" />
        </svg>

        {/* Hint glow ring around the paddle (only before first pour) */}
        {showHint && (
          <span
            aria-hidden="true"
            className="hint-glow absolute left-1/2 top-[28%] -translate-x-1/2 -translate-y-1/2 w-[95%] h-[55%] rounded-full pointer-events-none"
          />
        )}
      </button>
    </div>
  );
}
