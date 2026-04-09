import { useCallback } from 'react';

interface DispenserProps {
  onStart: () => void;
  onStop: () => void;
}

export function Dispenser({ onStart, onStop }: DispenserProps) {
  const handleDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      (e.target as Element).setPointerCapture?.(e.pointerId);
      onStart();
    },
    [onStart],
  );

  const handleUp = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      onStop();
    },
    [onStop],
  );

  return (
    <button
      type="button"
      className="absolute top-4 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full bg-amber-500 text-stone-900 font-semibold shadow-lg select-none touch-none hover:bg-amber-400 active:bg-amber-300"
      onPointerDown={handleDown}
      onPointerUp={handleUp}
      onPointerCancel={handleUp}
      onPointerLeave={handleUp}
      aria-label="Hold to pour letters"
    >
      Hold to Pour
    </button>
  );
}
