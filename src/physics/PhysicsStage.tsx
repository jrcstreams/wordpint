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
  computeTapTopOffset,
  computeTapToCupGap,
  computeCupBottomMargin,
  TAP_SPOUT_RATIO,
} from './sizing';
import { LETTER_TILE_SIZE, createLetterBody, type LetterBody } from './letters';

export interface PhysicsStageHandle {
  startPour: () => void;
  stopPour: () => void;
  removeLetters: (ids: number[]) => void;
  clearAll: () => void;
  /** CSS-pixel position of the dispenser spout, used to align the on-screen tap. */
  getSpoutScreenPosition: () => { x: number; y: number } | null;
}

const MAX_ACTIVE_LETTERS = 180;

interface LetterSnapshot {
  char: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
}

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
      // Snapshot existing letters BEFORE tearing down so we can
      // restore them in the new world. This is what makes the cup
      // contents survive a window resize / browser zoom.
      const snapshot: LetterSnapshot[] = [];
      const oldW = worldRef.current?.width ?? 0;
      const oldH = worldRef.current?.height ?? 0;

      if (worldRef.current) {
        for (const body of Matter.Composite.allBodies(
          worldRef.current.world,
        )) {
          const letter = body as LetterBody;
          if (letter.letterChar !== undefined) {
            snapshot.push({
              char: letter.letterChar,
              x: body.position.x,
              y: body.position.y,
              vx: body.velocity.x,
              vy: body.velocity.y,
              angle: body.angle,
            });
          }
        }
      }

      // Tear down old world (if any)
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

      // ALL spacing constants now scale with stage height so the layout
      // never breaks on short laptop viewports.
      const tapTop = computeTapTopOffset(world.height);
      const tapAllowance = computeTapAllowance(world.height);
      const tapToCupGap = computeTapToCupGap(world.height);
      const cupBottomMargin = computeCupBottomMargin(world.height);

      const glassCenterX = world.width / 2;
      const glassBaseY = world.height - cupBottomMargin;
      const glassH = Math.max(
        100,
        world.height - tapTop - tapAllowance - tapToCupGap - cupBottomMargin,
      );
      const glass = createPintGlass(
        world.world,
        glassCenterX,
        glassBaseY,
        glassH,
      );

      // Sensor uses the visible glass interior as the strict region.
      // Stacked overflow letters above the rim still count as long as
      // they've been inside before — handled via stackHeadroom in the
      // Sensors class.
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

      const spawnX = glassCenterX;
      const spawnY = tapTop + tapAllowance * TAP_SPOUT_RATIO + 4;
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

      // Restore preserved letters from the snapshot, scaled to the
      // new world dimensions. Their old letter ids are gone (new
      // bodies have new ids); the store's lettersInGlass map gets
      // reset and re-populated by the sensor on the next physics tick
      // for any letter that's already inside the new cup.
      if (snapshot.length > 0 && oldW > 0 && oldH > 0) {
        // Reset the store's letters before re-adding so old (now-stale)
        // ids don't linger.
        useAppStore.setState({ lettersInGlass: new Map() });

        const scaleX = w / oldW;
        const scaleY = h / oldH;
        for (const snap of snapshot) {
          const newX = snap.x * scaleX;
          const newY = snap.y * scaleY;
          // Skip letters that would land WAY off-screen after scaling
          if (
            newX < -50 ||
            newX > w + 50 ||
            newY < -50 ||
            newY > h + 50
          ) {
            continue;
          }
          const body = createLetterBody(snap.char, newX, newY);
          Matter.Body.setAngle(body, snap.angle);
          Matter.Body.setVelocity(body, {
            x: snap.vx * scaleX,
            y: snap.vy * scaleY,
          });
          Matter.Composite.add(world.world, body);
        }
      }
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
