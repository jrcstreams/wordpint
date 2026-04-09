import Matter from 'matter-js';

export interface WorldHandle {
  engine: Matter.Engine;
  world: Matter.World;
  render: Matter.Render;
  runner: Matter.Runner;
  width: number;
  height: number;
  destroy: () => void;
}

export function createWorld(canvas: HTMLCanvasElement): WorldHandle {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;

  const engine = Matter.Engine.create({
    gravity: { x: 0, y: 1, scale: 0.0014 },
  });

  const render = Matter.Render.create({
    canvas,
    engine,
    options: {
      width,
      height,
      wireframes: false,
      background: 'transparent',
    },
  });

  // Side walls + floor (offscreen below the visible area is the overflow zone)
  const wallThickness = 60;
  const walls = [
    Matter.Bodies.rectangle(-wallThickness / 2, height / 2, wallThickness, height * 2, {
      isStatic: true,
      render: { visible: false },
    }),
    Matter.Bodies.rectangle(
      width + wallThickness / 2,
      height / 2,
      wallThickness,
      height * 2,
      { isStatic: true, render: { visible: false } },
    ),
    Matter.Bodies.rectangle(
      width / 2,
      height + wallThickness / 2,
      width * 2,
      wallThickness,
      { isStatic: true, render: { visible: false }, label: 'floor' },
    ),
  ];
  Matter.Composite.add(engine.world, walls);

  const runner = Matter.Runner.create();
  Matter.Runner.run(runner, engine);
  Matter.Render.run(render);

  // Pause on tab background
  const visHandler = () => {
    if (document.hidden) {
      Matter.Runner.stop(runner);
    } else {
      Matter.Runner.run(runner, engine);
    }
  };
  document.addEventListener('visibilitychange', visHandler);

  return {
    engine,
    world: engine.world,
    render,
    runner,
    width,
    height,
    destroy: () => {
      document.removeEventListener('visibilitychange', visHandler);
      Matter.Render.stop(render);
      Matter.Runner.stop(runner);
      Matter.Composite.clear(engine.world, false);
      Matter.Engine.clear(engine);
    },
  };
}
