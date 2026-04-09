import Matter from 'matter-js';

export interface PintGlassHandle {
  bodies: Matter.Body[];
  /** AABB of the glass interior, used by sensors to decide "letter is inside" */
  interior: { x: number; y: number; width: number; height: number };
}

/**
 * Builds a classic conical pint glass. Inner height is supplied by the
 * caller (so it can scale with the stage); other dimensions are derived
 * from it to maintain pub-glass proportions.
 */
export function createPintGlass(
  world: Matter.World,
  centerX: number,
  baseY: number,
  innerHeight: number,
): PintGlassHandle {
  const innerTopWidth = innerHeight * 0.78;
  const innerBottomWidth = innerHeight * 0.56;
  const wallThickness = Math.max(6, innerHeight * 0.026);
  const baseThickness = Math.max(12, innerHeight * 0.055);

  const tilt = Math.atan2(
    (innerTopWidth - innerBottomWidth) / 2,
    innerHeight,
  );

  // Slightly longer wall than the interior so the tilt cleanly sweeps the rim.
  const wallLength = innerHeight + 16;

  const ink: Matter.IBodyRenderOptions = {
    fillStyle: '#1a1a1a',
    strokeStyle: '#1a1a1a',
    lineWidth: 0,
  };

  const bottom = Matter.Bodies.rectangle(
    centerX,
    baseY,
    innerBottomWidth + wallThickness * 2 + 28,
    baseThickness,
    {
      isStatic: true,
      label: 'glass-bottom',
      friction: 0.6,
      restitution: 0.05,
      chamfer: { radius: 4 },
      render: ink,
    },
  );

  const wallCenterY = baseY - baseThickness / 2 - innerHeight / 2;

  const leftWall = Matter.Bodies.rectangle(
    centerX -
      innerBottomWidth / 2 -
      wallThickness / 2 -
      (innerTopWidth - innerBottomWidth) / 4,
    wallCenterY,
    wallThickness,
    wallLength,
    {
      isStatic: true,
      angle: -tilt,
      label: 'glass-left',
      friction: 0.5,
      restitution: 0.1,
      render: ink,
    },
  );

  const rightWall = Matter.Bodies.rectangle(
    centerX +
      innerBottomWidth / 2 +
      wallThickness / 2 +
      (innerTopWidth - innerBottomWidth) / 4,
    wallCenterY,
    wallThickness,
    wallLength,
    {
      isStatic: true,
      angle: tilt,
      label: 'glass-right',
      friction: 0.5,
      restitution: 0.1,
      render: ink,
    },
  );

  Matter.Composite.add(world, [bottom, leftWall, rightWall]);

  return {
    bodies: [bottom, leftWall, rightWall],
    interior: {
      x: centerX - innerTopWidth / 2,
      y: baseY - baseThickness / 2 - innerHeight,
      width: innerTopWidth,
      height: innerHeight,
    },
  };
}
