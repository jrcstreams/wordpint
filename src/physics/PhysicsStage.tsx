import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react';
import { useAppStore } from '../state/store';
import { createWorld, type WorldHandle } from './world';
import { createPintGlass } from './pintGlass';
import { Dispenser } from './dispenser';
import { Sensors } from './sensors';

export interface PhysicsStageHandle {
  startPour: () => void;
  stopPour: () => void;
  removeLetters: (ids: number[]) => void;
  /** Returns the on-canvas position of the dispenser spout in CSS pixels. */
  getSpoutScreenPosition: () => { x: number; y: number } | null;
}

const MAX_ACTIVE_LETTERS = 150;

export const PhysicsStage = forwardRef<PhysicsStageHandle>((_, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const worldRef = useRef<WorldHandle | null>(null);
  const dispenserRef = useRef<Dispenser | null>(null);
  const sensorsRef = useRef<Sensors | null>(null);
  const spoutRef = useRef<{ x: number; y: number } | null>(null);

  const letterEnteredGlass = useAppStore((s) => s.letterEnteredGlass);
  const letterLeftGlass = useAppStore((s) => s.letterLeftGlass);

  useEffect(() => {
    const canvas = canvasRef.current!;
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    const world = createWorld(canvas);
    worldRef.current = world;

    // Glass sits on the bottom of the stage with a little breathing room.
    const glassCenterX = world.width / 2;
    const glassBaseY = world.height - 28;
    const glass = createPintGlass(world.world, glassCenterX, glassBaseY);

    const sensors = new Sensors({
      engine: world.engine,
      interior: glass.interior,
      worldHeight: world.height,
      maxActive: MAX_ACTIVE_LETTERS,
      events: {
        onEntered: (id, char) => letterEnteredGlass(id, char),
        onLeft: (id) => letterLeftGlass(id),
      },
    });
    sensorsRef.current = sensors;

    // Spawn directly under the on-screen tap (which we draw at the top center).
    const spawnX = glassCenterX;
    const spawnY = 64;
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

    return () => {
      dispenser.destroy();
      sensors.destroy();
      world.destroy();
    };
  }, [letterEnteredGlass, letterLeftGlass]);

  useImperativeHandle(
    ref,
    () => ({
      startPour: () => dispenserRef.current?.start(),
      stopPour: () => dispenserRef.current?.stop(),
      removeLetters: (ids) => sensorsRef.current?.removeLetters(ids),
      getSpoutScreenPosition: () => spoutRef.current,
    }),
    [],
  );

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      aria-label="Pint of Words physics stage"
    />
  );
});

PhysicsStage.displayName = 'PhysicsStage';
