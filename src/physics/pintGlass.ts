import Matter from 'matter-js';

export interface PintGlassHandle {
  bodies: Matter.Body[];
  /** AABB of the glass interior, used by sensors to decide "letter is inside" */
  interior: { x: number; y: number; width: number; height: number };
}

export function createPintGlass(
  world: Matter.World,
  centerX: number,
  baseY: number,
): PintGlassHandle {
  // Pint dimensions (px). Slight outward taper at the rim.
  const innerTopWidth = 240;
  const innerBottomWidth = 180;
  const innerHeight = 360;
  const wallThickness = 14;
  const tilt = Math.atan2(
    (innerTopWidth - innerBottomWidth) / 2,
    innerHeight,
  );

  const renderOpts: Matter.IBodyRenderOptions = {
    fillStyle: '#e8e6df',
    strokeStyle: '#a8a499',
    lineWidth: 2,
  };

  const bottom = Matter.Bodies.rectangle(
    centerX,
    baseY,
    innerBottomWidth + wallThickness * 2,
    wallThickness,
    { isStatic: true, label: 'glass-bottom', render: renderOpts },
  );

  const leftWall = Matter.Bodies.rectangle(
    centerX - innerBottomWidth / 2 - wallThickness / 2 - (innerTopWidth - innerBottomWidth) / 4,
    baseY - innerHeight / 2 - wallThickness / 2,
    wallThickness,
    innerHeight,
    {
      isStatic: true,
      angle: -tilt,
      label: 'glass-left',
      render: renderOpts,
    },
  );

  const rightWall = Matter.Bodies.rectangle(
    centerX + innerBottomWidth / 2 + wallThickness / 2 + (innerTopWidth - innerBottomWidth) / 4,
    baseY - innerHeight / 2 - wallThickness / 2,
    wallThickness,
    innerHeight,
    {
      isStatic: true,
      angle: tilt,
      label: 'glass-right',
      render: renderOpts,
    },
  );

  Matter.Composite.add(world, [bottom, leftWall, rightWall]);

  return {
    bodies: [bottom, leftWall, rightWall],
    interior: {
      x: centerX - innerTopWidth / 2,
      y: baseY - innerHeight - wallThickness,
      width: innerTopWidth,
      height: innerHeight,
    },
  };
}
