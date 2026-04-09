import { useCallback, useEffect, useRef, useState } from 'react';
import { computeTapAllowance } from '../physics/sizing';

interface BarTapProps {
  onStart: () => void;
  onStop: () => void;
  /** True until the user has poured at least once — drives the glow ring. */
  showHint: boolean;
}

/**
 * A monochrome wooden draft tap. The "head" is a vertical grip with a
 * spherical knob on top, an inset cream panel with an italic-serif "P"
 * monogram, and decorative collars top and bottom. Below the grip sits
 * a chrome body and an angled spout. Press and hold to pour; the entire
 * head pivots forward at the body collar.
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
        aria-label="Draft tap — press and hold to pour letters"
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
            {/* Sphere knob */}
            <circle cx="100" cy="14" r="13" fill="#1a1a1a" />
            <ellipse
              cx="96"
              cy="9.5"
              rx="4"
              ry="2.5"
              fill="rgba(255,255,255,0.32)"
            />

            {/* Knob neck */}
            <rect x="93" y="26" width="14" height="5" fill="#1a1a1a" />

            {/* Top decorative collar */}
            <rect x="80" y="31" width="40" height="7" rx="1.5" fill="#1a1a1a" />
            <line
              x1="83"
              y1="34.5"
              x2="117"
              y2="34.5"
              stroke="#fbf7ec"
              strokeWidth="0.6"
            />

            {/* Wooden vertical grip — outer */}
            <rect x="74" y="38" width="52" height="92" rx="8" fill="#1a1a1a" />

            {/* Inset cream panel */}
            <rect
              x="80"
              y="44"
              width="40"
              height="80"
              rx="4"
              fill="#fbf7ec"
              stroke="#1a1a1a"
              strokeWidth="1.4"
            />

            {/* Top horizontal rule on panel */}
            <line
              x1="84"
              y1="52"
              x2="116"
              y2="52"
              stroke="#1a1a1a"
              strokeWidth="0.7"
            />
            {/* Bottom horizontal rule on panel */}
            <line
              x1="84"
              y1="116"
              x2="116"
              y2="116"
              stroke="#1a1a1a"
              strokeWidth="0.7"
            />

            {/* Italic serif monogram */}
            <text
              x="100"
              y="93"
              textAnchor="middle"
              fontFamily='"Playfair Display", Georgia, serif'
              fontSize="44"
              fontWeight="900"
              fontStyle="italic"
              fill="#1a1a1a"
            >
              P
            </text>

            {/* Bottom decorative collar */}
            <rect
              x="80"
              y="130"
              width="40"
              height="7"
              rx="1.5"
              fill="#1a1a1a"
            />
            <line
              x1="83"
              y1="133.5"
              x2="117"
              y2="133.5"
              stroke="#fbf7ec"
              strokeWidth="0.6"
            />

            {/* Lower neck connecting to body collar */}
            <rect x="93" y="137" width="14" height="6" fill="#1a1a1a" />
          </g>

          {/* ============ TAP BODY (static) ============ */}
          {/* Mounting collar between handle and body */}
          <rect x="78" y="143" width="44" height="11" rx="2" fill="#1a1a1a" />

          {/* Chrome cylinder body */}
          <rect x="84" y="154" width="32" height="62" rx="6" fill="#1a1a1a" />
          {/* Vertical highlight stripe */}
          <rect
            x="87"
            y="158"
            width="4"
            height="54"
            rx="2"
            fill="rgba(255,255,255,0.2)"
          />
          {/* Decorative horizontal bands */}
          <rect x="84" y="166" width="32" height="2" fill="#fbf7ec" />
          <rect x="84" y="202" width="32" height="2" fill="#fbf7ec" />

          {/* ============ SPOUT ============ */}
          <path d="M84,216 L80,232 L120,232 L116,216 Z" fill="#1a1a1a" />
          <rect x="84" y="232" width="32" height="6" rx="1" fill="#1a1a1a" />
          <ellipse cx="100" cy="240" rx="13" ry="2" fill="#3a3328" />

          {/* Idle drip */}
          {!pouring && (
            <circle
              className="tap-drip"
              cx="100"
              cy="242"
              r="2"
              fill="#e8a838"
              opacity="0.55"
            />
          )}

          {/* Pour stream */}
          <rect
            className="tap-stream"
            x="96"
            y="244"
            width="8"
            height="42"
            rx="3"
            fill="#e8a838"
            opacity="0"
          />
        </svg>

        {/* Hint glow ring around the handle (only before first pour) */}
        {showHint && (
          <span
            aria-hidden="true"
            className="hint-glow absolute left-1/2 top-[31%] -translate-x-1/2 -translate-y-1/2 w-[60%] h-[55%] rounded-full pointer-events-none"
          />
        )}
      </button>
    </div>
  );
}
