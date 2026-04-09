import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react';
import Matter from 'matter-js';
import { useAppStore } from '../state/store';
import { createWorld, type WorldHandle } from './world';
import { createPintGlass } from './pintGlass';
import { Dispenser } from './dispenser';
import { Sensors } from './sensors';
import {
  computeTapAllowance,
  TAP_SPOUT_RATIO,
  TAP_TOP_OFFSET,
  TAP_TO_CUP_GAP,
} from './sizing';
import { LETTER_TILE_SIZE } from './letters';

export interface PhysicsStageHandle {
  startPour: () => void;
  stopPour: () => void;
  removeLetters: (ids: number[]) => void;
  clearAll: () => void;
  /** CSS-pixel position of the dispenser spout, used to align the on-screen tap. */
  getSpoutScreenPosition: () => { x: number; y: number } | null;
}

const MAX_ACTIVE_LETTERS = 180;

export const PhysicsStage = forwardRef<PhysicsStageHandle>((_, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const worldRef = useRef<WorldHandle | null>(null);
  const dispenserRef = useRef<Dispenser | null>(null);
  const sensorsRef = useRef<Sensors | null>(null);
  const spoutRef = useRef<{ x: number; y: number } | null>(null);

  const letterEnteredGlass = useAppStore((s) => s.letterEnteredGlass);
  const letterLeftGlass = useAppStore((s) => s.letterLeftGlass);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const container = containerRef.current!;

    const build = () => {
      dispenserRef.current?.destroy();
      sensorsRef.current?.destroy();
      worldRef.current?.destroy();

      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w === 0 || h === 0) return;

      canvas.width = w;
      canvas.height = h;

      const world = createWorld(canvas);
      worldRef.current = world;

      const tapAllowance = computeTapAllowance(world.height);
      const cupBottomMargin = 16;
      const glassCenterX = world.width / 2;
      const glassBaseY = world.height - cupBottomMargin;
      const glassH = Math.max(
        130,
        world.height -
          TAP_TOP_OFFSET -
          tapAllowance -
          TAP_TO_CUP_GAP -
          cupBottomMargin,
      );
      const glass = createPintGlass(
        world.world,
        glassCenterX,
        glassBaseY,
        glassH,
      );

      // Sensor uses the visible glass interior as the strict region. Stacked
      // overflow letters above the rim still count as long as they've been
      // inside before — handled via stackHeadroom in the Sensors class.
      const sensors = new Sensors({
        engine: world.engine,
        interior: glass.interior,
        stackHeadroom: LETTER_TILE_SIZE * 4,
        sideSlack: 4,
        worldHeight: world.height,
        maxActive: MAX_ACTIVE_LETTERS,
        events: {
          onEntered: (id, char) => letterEnteredGlass(id, char),
          onLeft: (id) => letterLeftGlass(id),
        },
      });
      sensorsRef.current = sensors;

      // Spawn just below the spout opening.
      const spawnX = glassCenterX;
      const spawnY = TAP_TOP_OFFSET + tapAllowance * TAP_SPOUT_RATIO + 4;
      spoutRef.current = { x: spawnX, y: spawnY - 10 };

      const dispenser = new Dispenser({
        world: world.world,
        spawnX,
        spawnY,
        intervalMs: 90,
        jitterX: 14,
        onSpawn: () => {
          if (sensors.isFull()) dispenser.stop();
        },
      });
      dispenserRef.current = dispenser;
    };

    build();

    let raf = 0;
    const onResize = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => build());
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(container);
    window.addEventListener('orientationchange', onResize);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('orientationchange', onResize);
      dispenserRef.current?.destroy();
      sensorsRef.current?.destroy();
      worldRef.current?.destroy();
    };
  }, [letterEnteredGlass, letterLeftGlass]);

  useImperativeHandle(
    ref,
    () => ({
      startPour: () => dispenserRef.current?.start(),
      stopPour: () => dispenserRef.current?.stop(),
      removeLetters: (ids) => sensorsRef.current?.removeLetters(ids),
      clearAll: () => sensorsRef.current?.clearAll(),
      getSpoutScreenPosition: () => spoutRef.current,
    }),
    [],
  );

  return (
    <div ref={containerRef} className="absolute inset-0">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        aria-label="Pint of Words physics stage"
      />
    </div>
  );
});

PhysicsStage.displayName = 'PhysicsStage';

export { Matter };
