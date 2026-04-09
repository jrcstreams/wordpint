import { useCallback, useEffect, useRef, useState } from 'react';
import { computeTapAllowance } from '../physics/sizing';

interface BarTapProps {
  onStart: () => void;
  onStop: () => void;
  /** True until the user has poured at least once — drives the glow ring. */
  showHint: boolean;
}

/**
 * A monochrome draft tap whose paddle is the brand placement: a tall
 * cream paddle with a double-frame ornament containing CLICK / to / POUR
 * stacked vertically. The paddle dominates the assembly so the
 * instruction is impossible to miss. Press and hold to pour; the head
 * pivots forward at the body collar.
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

  // viewBox is 220×280; aspect drives the wrapper width.
  const aspect = 220 / 280;
  const svgWidth = tapHeight * aspect;

  return (
    <div
      ref={wrapperRef}
      className="absolute top-0 left-1/2 -translate-x-1/2 pointer-events-none"
      style={{ width: svgWidth, height: tapHeight }}
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
            {/* Outer paddle (black) — large */}
            <rect
              x="30"
              y="2"
              width="160"
              height="158"
              rx="12"
              fill="#1a1a1a"
            />

            {/* Cream inset */}
            <rect
              x="38"
              y="10"
              width="144"
              height="142"
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
              height="130"
              rx="4"
              fill="none"
              stroke="#1a1a1a"
              strokeWidth="0.7"
            />

            {/* Top star */}
            <text
              x="110"
              y="34"
              textAnchor="middle"
              fontFamily="Georgia, serif"
              fontSize="14"
              fill="#1a1a1a"
            >
              ✦
            </text>

            {/* CLICK */}
            <text
              x="110"
              y="64"
              textAnchor="middle"
              fontFamily='"Playfair Display", Georgia, serif'
              fontSize="28"
              fontWeight="900"
              fill="#1a1a1a"
              letterSpacing="1.5"
            >
              CLICK
            </text>

            {/* TO (same style, no italic, no rules) */}
            <text
              x="110"
              y="94"
              textAnchor="middle"
              fontFamily='"Playfair Display", Georgia, serif'
              fontSize="28"
              fontWeight="900"
              fill="#1a1a1a"
              letterSpacing="1.5"
            >
              TO
            </text>

            {/* POUR */}
            <text
              x="110"
              y="124"
              textAnchor="middle"
              fontFamily='"Playfair Display", Georgia, serif'
              fontSize="28"
              fontWeight="900"
              fill="#1a1a1a"
              letterSpacing="1.5"
            >
              POUR
            </text>

            {/* Bottom star */}
            <text
              x="110"
              y="144"
              textAnchor="middle"
              fontFamily="Georgia, serif"
              fontSize="14"
              fill="#1a1a1a"
            >
              ✦
            </text>

            {/* Lower neck connecting to body collar */}
            <rect x="103" y="160" width="14" height="6" fill="#1a1a1a" />
          </g>

          {/* ============ TAP BODY (static) ============ */}
          {/* Mounting collar */}
          <rect x="86" y="166" width="48" height="12" rx="2" fill="#1a1a1a" />

          {/* Chrome cylinder body */}
          <rect x="92" y="178" width="36" height="56" rx="6" fill="#1a1a1a" />
          {/* Vertical highlight stripe */}
          <rect
            x="95"
            y="182"
            width="5"
            height="48"
            rx="2"
            fill="rgba(255,255,255,0.2)"
          />
          {/* Decorative bands */}
          <rect x="92" y="190" width="36" height="2" fill="#fbf7ec" />
          <rect x="92" y="220" width="36" height="2" fill="#fbf7ec" />

          {/* ============ SPOUT ============ */}
          <path d="M92,234 L88,250 L132,250 L128,234 Z" fill="#1a1a1a" />
          <rect x="92" y="250" width="36" height="6" rx="1" fill="#1a1a1a" />
          <ellipse cx="110" cy="258" rx="14" ry="2" fill="#3a3328" />

          {/* Idle drip */}
          {!pouring && (
            <circle
              className="tap-drip"
              cx="110"
              cy="260"
              r="2.2"
              fill="#e8a838"
              opacity="0.55"
            />
          )}

          {/* Pour stream */}
          <rect
            className="tap-stream"
            x="106"
            y="262"
            width="9"
            height="36"
            rx="3"
            fill="#e8a838"
            opacity="0"
          />
        </svg>

        {/* Hint glow ring around the paddle (only before first pour) */}
        {showHint && (
          <span
            aria-hidden="true"
            className="hint-glow absolute left-1/2 top-[28%] -translate-x-1/2 -translate-y-1/2 w-[95%] h-[58%] rounded-full pointer-events-none"
          />
        )}
      </button>
    </div>
  );
}
