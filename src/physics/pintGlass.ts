import Matter from 'matter-js';

export interface PintGlassHandle {
  bodies: Matter.Body[];
  /** AABB of the glass interior, used by sensors to decide "letter is inside" */
  interior: { x: number; y: number; width: number; height: number };
}

/**
 * Builds a classic conical pint glass. Inner height is supplied by the
 * caller (so it can scale with the stage). Top width can also be passed
 * explicitly so the glass can grow horizontally on wide-but-short bar
 * regions (e.g. laptop landscape) where the vertical-only sizing leaves
 * a narrow cup floating in a sea of empty bar wood. If omitted, falls
 * back to the original height-based ratio.
 */
export function createPintGlass(
  world: Matter.World,
  centerX: number,
  baseY: number,
  innerHeight: number,
  innerTopWidth?: number,
): PintGlassHandle {
  const topWidth = innerTopWidth ?? innerHeight * 0.78;
  // Bottom is ~71.8% of the top — preserves the original 0.56/0.78
  // taper regardless of whether top width is height-derived or
  // explicitly supplied.
  const innerBottomWidth = topWidth * 0.718;
  const wallThickness = Math.max(6, Math.min(innerHeight, topWidth) * 0.026);
  const baseThickness = Math.max(12, innerHeight * 0.055);

  const tilt = Math.atan2((topWidth - innerBottomWidth) / 2, innerHeight);

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
      (topWidth - innerBottomWidth) / 4,
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
      (topWidth - innerBottomWidth) / 4,
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
      x: centerX - topWidth / 2,
      y: baseY - baseThickness / 2 - innerHeight,
      width: topWidth,
      height: innerHeight,
    },
  };
}
