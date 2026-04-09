import { useCallback, useEffect, useRef, useState } from 'react';
import { computeTapAllowance } from '../physics/sizing';

interface BarTapProps {
  onStart: () => void;
  onStop: () => void;
  /** True until the user has poured at least once — drives the glow + tooltip. */
  showHint: boolean;
}

/**
 * A monochrome draft tap whose handle paddle IS the Pint of Words brand
 * placement. Stacked "PINT / of / WORDS" wordmark with ornaments inside a
 * double-framed cream paddle, mounted on a chrome body and angled spout.
 *
 * Press and hold the assembly to pour; the entire branded head pivots
 * forward at the body collar like a real beer tap.
 */
export function BarTap({ onStart, onStop, showHint }: BarTapProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [pouring, setPouring] = useState(false);
  const [tapHeight, setTapHeight] = useState(180);

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

  // viewBox is 200×260; aspect ratio drives the wrapper width.
  const aspect = 200 / 260;
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
          viewBox="0 0 200 260"
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
              x="50"
              y="2"
              width="100"
              height="124"
              rx="10"
              fill="#1a1a1a"
            />

            {/* Cream inset */}
            <rect
              x="56"
              y="8"
              width="88"
              height="112"
              rx="5"
              fill="#fbf7ec"
              stroke="#1a1a1a"
              strokeWidth="1.5"
            />

            {/* Inner thin frame ornament */}
            <rect
              x="60"
              y="12"
              width="80"
              height="104"
              rx="3"
              fill="none"
              stroke="#1a1a1a"
              strokeWidth="0.6"
            />

            {/* Top star */}
            <text
              x="100"
              y="29"
              textAnchor="middle"
              fontFamily="Georgia, serif"
              fontSize="13"
              fill="#1a1a1a"
            >
              ✦
            </text>

            {/* CLICK */}
            <text
              x="100"
              y="54"
              textAnchor="middle"
              fontFamily='"Playfair Display", Georgia, serif'
              fontSize="22"
              fontWeight="900"
              fill="#1a1a1a"
              letterSpacing="1"
            >
              CLICK
            </text>

            {/* "to" with flanking rules */}
            <line
              x1="68"
              y1="64"
              x2="90"
              y2="64"
              stroke="#1a1a1a"
              strokeWidth="0.7"
            />
            <text
              x="100"
              y="69"
              textAnchor="middle"
              fontFamily='"EB Garamond", Georgia, serif'
              fontSize="13"
              fontStyle="italic"
              fill="#1a1a1a"
            >
              to
            </text>
            <line
              x1="110"
              y1="64"
              x2="132"
              y2="64"
              stroke="#1a1a1a"
              strokeWidth="0.7"
            />

            {/* POUR */}
            <text
              x="100"
              y="92"
              textAnchor="middle"
              fontFamily='"Playfair Display", Georgia, serif'
              fontSize="22"
              fontWeight="900"
              fill="#1a1a1a"
              letterSpacing="1"
            >
              POUR
            </text>

            {/* Bottom star */}
            <text
              x="100"
              y="111"
              textAnchor="middle"
              fontFamily="Georgia, serif"
              fontSize="13"
              fill="#1a1a1a"
            >
              ✦
            </text>

            {/* Lower neck connecting to body collar */}
            <rect x="93" y="126" width="14" height="6" fill="#1a1a1a" />
          </g>

          {/* ============ TAP BODY (static) ============ */}
          {/* Mounting collar between handle and body */}
          <rect x="78" y="132" width="44" height="11" rx="2" fill="#1a1a1a" />

          {/* Chrome cylinder body */}
          <rect x="84" y="143" width="32" height="62" rx="6" fill="#1a1a1a" />
          {/* Vertical highlight stripe */}
          <rect
            x="87"
            y="147"
            width="4"
            height="54"
            rx="2"
            fill="rgba(255,255,255,0.2)"
          />
          {/* Decorative bands */}
          <rect x="84" y="155" width="32" height="2" fill="#fbf7ec" />
          <rect x="84" y="191" width="32" height="2" fill="#fbf7ec" />

          {/* ============ SPOUT ============ */}
          <path d="M84,205 L80,221 L120,221 L116,205 Z" fill="#1a1a1a" />
          <rect x="84" y="221" width="32" height="6" rx="1" fill="#1a1a1a" />
          <ellipse cx="100" cy="229" rx="13" ry="2" fill="#3a3328" />

          {/* Idle drip */}
          {!pouring && (
            <circle
              className="tap-drip"
              cx="100"
              cy="231"
              r="2"
              fill="#e8a838"
              opacity="0.55"
            />
          )}

          {/* Pour stream */}
          <rect
            className="tap-stream"
            x="96"
            y="233"
            width="8"
            height="34"
            rx="3"
            fill="#e8a838"
            opacity="0"
          />
        </svg>

        {/* Hint glow ring around the paddle (only before first pour) */}
        {showHint && (
          <span
            aria-hidden="true"
            className="hint-glow absolute left-1/2 top-[24%] -translate-x-1/2 -translate-y-1/2 w-[110%] h-[55%] rounded-full pointer-events-none"
          />
        )}
      </button>
    </div>
  );
}
