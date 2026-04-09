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
}

function pickInitialCap(): number {
  const cores = navigator.hardwareConcurrency ?? 4;
  return cores < 4 ? 200 : 400;
}

export const PhysicsStage = forwardRef<PhysicsStageHandle>((_, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const worldRef = useRef<WorldHandle | null>(null);
  const dispenserRef = useRef<Dispenser | null>(null);
  const sensorsRef = useRef<Sensors | null>(null);
  const capRef = useRef<number>(pickInitialCap());

  const letterEnteredGlass = useAppStore((s) => s.letterEnteredGlass);
  const letterLeftGlass = useAppStore((s) => s.letterLeftGlass);

  useEffect(() => {
    const canvas = canvasRef.current!;
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    const world = createWorld(canvas);
    worldRef.current = world;

    const glass = createPintGlass(world.world, world.width / 2, world.height - 60);

    const sensors = new Sensors({
      engine: world.engine,
      interior: glass.interior,
      worldHeight: world.height,
      maxActive: capRef.current,
      events: {
        onEntered: (id, char) => letterEnteredGlass(id, char),
        onLeft: (id) => letterLeftGlass(id),
      },
    });
    sensorsRef.current = sensors;

    const dispenser = new Dispenser({
      world: world.world,
      spawnX: world.width / 2,
      spawnY: 40,
      intervalMs: 100,
      onSpawn: () => {
        if (sensors.isFull()) dispenser.stop();
      },
    });
    dispenserRef.current = dispenser;

    // FPS probe: sample after 1s; if avg FPS < 45, downgrade cap to 200
    const probeStart = performance.now();
    let frames = 0;
    const probe = () => {
      frames++;
      if (performance.now() - probeStart < 1000) {
        requestAnimationFrame(probe);
      } else {
        const fps = frames;
        if (fps < 45) capRef.current = Math.min(capRef.current, 200);
      }
    };
    requestAnimationFrame(probe);

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
