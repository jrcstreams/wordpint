import { useCallback, useEffect, useRef, useState } from 'react';
import { computeTapAllowance } from '../physics/sizing';

interface BarTapProps {
  onStart: () => void;
  onStop: () => void;
  /** True until the user has poured at least once — drives the glow ring. */
  showHint: boolean;
}

/**
 * A proper monochrome draft tap: branded paddle handle on top (the "head"),
 * chrome body, side pour gauge, angled spout. Press and hold the entire
 * assembly to pour. The handle pivots forward at the collar like a real
 * beer tap and the gauge fills as you pour.
 */
export function BarTap({ onStart, onStop, showHint }: BarTapProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [pouring, setPouring] = useState(false);
  const [tapHeight, setTapHeight] = useState(180);

  // Resize-driven tap height — kept in sync with the physics stage's
  // tap allowance via the shared `computeTapAllowance` formula.
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

  // Tap is 200 wide × 240 tall in the SVG viewBox; we scale to tapHeight
  // and let the wrapper auto-width.
  const aspect = 200 / 240;
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
        aria-label="Draft tap — press and hold to pour letters"
        aria-pressed={pouring}
        className={`pointer-events-auto select-none touch-none cursor-pointer relative w-full h-full bg-transparent border-0 p-0 ${
          pouring ? 'tap-pouring' : ''
        } ${showHint ? 'tap-hint' : ''}`}
      >
        <svg
          viewBox="0 0 200 240"
          width="100%"
          height="100%"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="overflow-visible"
        >
          {/* ============ HANDLE GROUP (pivots when pouring) ============ */}
          <g className="tap-handle">
            {/* Outer paddle */}
            <rect
              x="34"
              y="2"
              width="132"
              height="84"
              rx="8"
              fill="#1a1a1a"
            />
            {/* Inner paddle (paper card on the handle) */}
            <rect
              x="40"
              y="8"
              width="120"
              height="72"
              rx="5"
              fill="#fbf7ec"
              stroke="#1a1a1a"
              strokeWidth="1.5"
            />
            {/* Top decorative line */}
            <line
              x1="46"
              y1="18"
              x2="154"
              y2="18"
              stroke="#1a1a1a"
              strokeWidth="0.8"
            />
            {/* Bottom decorative line */}
            <line
              x1="46"
              y1="70"
              x2="154"
              y2="70"
              stroke="#1a1a1a"
              strokeWidth="0.8"
            />
            {/* Brand text */}
            <text
              x="100"
              y="42"
              textAnchor="middle"
              fontFamily='"Playfair Display", Georgia, serif'
              fontSize="20"
              fontWeight="900"
              fill="#1a1a1a"
              letterSpacing="0.5"
            >
              PINT
            </text>
            <text
              x="100"
              y="60"
              textAnchor="middle"
              fontFamily='"Special Elite", monospace'
              fontSize="9"
              letterSpacing="2"
              fill="#1a1a1a"
            >
              POUR
            </text>

            {/* Joint between handle and body */}
            <rect x="92" y="86" width="16" height="10" fill="#1a1a1a" />
            <rect
              x="80"
              y="96"
              width="40"
              height="8"
              rx="2"
              fill="#1a1a1a"
            />
          </g>

          {/* ============ TAP BODY (static) ============ */}
          {/* Cylinder */}
          <rect
            x="84"
            y="104"
            width="32"
            height="84"
            rx="6"
            fill="#1a1a1a"
          />
          {/* Vertical highlight stripe */}
          <rect
            x="87"
            y="108"
            width="4"
            height="76"
            rx="2"
            fill="rgba(255,255,255,0.18)"
          />
          {/* Decorative bands */}
          <rect x="84" y="118" width="32" height="2" fill="#fbf7ec" />
          <rect x="84" y="172" width="32" height="2" fill="#fbf7ec" />

          {/* ============ POUR GAUGE (right side) ============ */}
          <g>
            <rect
              x="124"
              y="120"
              width="9"
              height="58"
              fill="#fbf7ec"
              stroke="#1a1a1a"
              strokeWidth="1.4"
            />
            {/* Tick marks */}
            <line
              x1="124"
              y1="135"
              x2="133"
              y2="135"
              stroke="#1a1a1a"
              strokeWidth="0.7"
            />
            <line
              x1="124"
              y1="149"
              x2="133"
              y2="149"
              stroke="#1a1a1a"
              strokeWidth="0.7"
            />
            <line
              x1="124"
              y1="163"
              x2="133"
              y2="163"
              stroke="#1a1a1a"
              strokeWidth="0.7"
            />
            {/* Fill bar (animated via CSS when pouring) */}
            <rect
              className="gauge-fill"
              x="125.4"
              y="176"
              width="6.2"
              height="0"
              fill="#e8a838"
            />
          </g>

          {/* ============ SPOUT ============ */}
          <path d="M84,188 L80,210 L120,210 L116,188 Z" fill="#1a1a1a" />
          <rect
            x="84"
            y="210"
            width="32"
            height="6"
            rx="1"
            fill="#1a1a1a"
          />
          {/* Spout opening */}
          <ellipse cx="100" cy="218" rx="13" ry="2" fill="#3a3328" />

          {/* Idle drip */}
          {!pouring && (
            <circle
              className="tap-drip"
              cx="100"
              cy="220"
              r="2"
              fill="#e8a838"
              opacity="0.55"
            />
          )}

          {/* Pour stream (visible while pouring) */}
          <rect
            className="tap-stream"
            x="96"
            y="222"
            width="8"
            height="38"
            rx="3"
            fill="#e8a838"
            opacity="0"
          />
        </svg>

        {/* Hint glow ring (positioned over the handle, not the cup) */}
        {showHint && (
          <span
            aria-hidden="true"
            className="hint-glow absolute left-1/2 top-[18%] -translate-x-1/2 -translate-y-1/2 w-[90%] h-[55%] rounded-full pointer-events-none"
          />
        )}
      </button>
    </div>
  );
}
