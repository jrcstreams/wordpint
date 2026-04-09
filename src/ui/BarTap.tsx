import { useCallback, useEffect, useRef, useState } from 'react';
import {
  computeTapAllowance,
  computeTapTopOffset,
} from '../physics/sizing';

interface BarTapProps {
  onStart: () => void;
  onStop: () => void;
  /** True until the user has poured at least once — drives the glow ring. */
  showHint: boolean;
}

/**
 * A monochrome draft tap with a minimal branded paddle. The paddle has
 * just three things: the cream inset, a thin inner frame, and the
 * stacked HOLD / TO / POUR wordmark with generous breathing room.
 *
 * Press and hold the assembly to pour; the head pivots forward at the
 * body collar like a real beer tap.
 */
export function BarTap({ onStart, onStop, showHint }: BarTapProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [pouring, setPouring] = useState(false);
  const [tapHeight, setTapHeight] = useState(220);
  const [tapTop, setTapTop] = useState(14);

  useEffect(() => {
    const el = wrapperRef.current?.parentElement;
    if (!el) return;
    const update = () => {
      const h = el.clientHeight;
      setTapHeight(computeTapAllowance(h));
      setTapTop(computeTapTopOffset(h));
    };
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

  // viewBox is 220×280; aspect drives the wrapper width.
  const aspect = 220 / 280;
  const svgWidth = tapHeight * aspect;

  return (
    <div
      ref={wrapperRef}
      className="absolute left-1/2 -translate-x-1/2 pointer-events-none"
      style={{ top: tapTop, width: svgWidth, height: tapHeight }}
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
          viewBox="0 0 220 280"
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
              height="168"
              rx="12"
              fill="#1a1a1a"
            />

            {/* Cream inset */}
            <rect
              x="38"
              y="10"
              width="144"
              height="152"
              rx="6"
              fill="#fbf7ec"
              stroke="#1a1a1a"
              strokeWidth="1.6"
            />

            {/* Inner thin frame ornament */}
            <rect
              x="44"
              y="16"
              width="132"
              height="140"
              rx="3"
              fill="none"
              stroke="#1a1a1a"
              strokeWidth="0.6"
            />

            {/* HOLD */}
            <text
              x="110"
              y="56"
              textAnchor="middle"
              fontFamily='"Playfair Display", Georgia, serif'
              fontSize="26"
              fontWeight="900"
              fill="#1a1a1a"
              letterSpacing="2"
            >
              HOLD
            </text>

            {/* TO */}
            <text
              x="110"
              y="92"
              textAnchor="middle"
              fontFamily='"Playfair Display", Georgia, serif'
              fontSize="26"
              fontWeight="900"
              fill="#1a1a1a"
              letterSpacing="2"
            >
              TO
            </text>

            {/* POUR */}
            <text
              x="110"
              y="128"
              textAnchor="middle"
              fontFamily='"Playfair Display", Georgia, serif'
              fontSize="26"
              fontWeight="900"
              fill="#1a1a1a"
              letterSpacing="2"
            >
              POUR
            </text>

            {/* Lower neck connecting to body collar */}
            <rect x="103" y="170" width="14" height="6" fill="#1a1a1a" />
          </g>

          {/* ============ TAP BODY (static) ============ */}
          {/* Mounting collar */}
          <rect x="86" y="176" width="48" height="12" rx="2" fill="#1a1a1a" />

          {/* Chrome cylinder body */}
          <rect x="92" y="188" width="36" height="56" rx="6" fill="#1a1a1a" />
          <rect
            x="95"
            y="192"
            width="5"
            height="48"
            rx="2"
            fill="rgba(255,255,255,0.2)"
          />
          <rect x="92" y="200" width="36" height="2" fill="#fbf7ec" />
          <rect x="92" y="230" width="36" height="2" fill="#fbf7ec" />

          {/* ============ SPOUT ============ */}
          <path d="M92,244 L88,260 L132,260 L128,244 Z" fill="#1a1a1a" />
          <rect x="92" y="260" width="36" height="6" rx="1" fill="#1a1a1a" />
          <ellipse cx="110" cy="268" rx="14" ry="2" fill="#3a3328" />
        </svg>

        {/* Hint glow ring around the paddle (only before first pour) */}
        {showHint && (
          <span
            aria-hidden="true"
            className="hint-glow absolute left-1/2 top-[30%] -translate-x-1/2 -translate-y-1/2 w-[95%] h-[55%] rounded-full pointer-events-none"
          />
        )}
      </button>
    </div>
  );
}
