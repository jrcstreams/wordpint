import Matter from 'matter-js';

export interface PintGlassHandle {
  bodies: Matter.Body[];
  /** AABB of the glass interior, used by sensors to decide "letter is inside" */
  interior: { x: number; y: number; width: number; height: number };
}

/**
 * Builds a classic conical pint glass: tapered walls (wider at the rim),
 * thick base, drawn as ink-line outlines on the paper background.
 */
export function createPintGlass(
  world: Matter.World,
  centerX: number,
  baseY: number,
): PintGlassHandle {
  // Pint dimensions tuned for a stage that's roughly half the viewport height.
  const innerTopWidth = 220;
  const innerBottomWidth = 150;
  const innerHeight = 280;
  const wallThickness = 8;
  const baseThickness = 18;

  const tilt = Math.atan2(
    (innerTopWidth - innerBottomWidth) / 2,
    innerHeight,
  );

  // Slightly thicker, longer wall to compensate for the tilt cleanly.
  const wallLength = innerHeight + 16;

  const ink: Matter.IBodyRenderOptions = {
    fillStyle: '#1a1a1a',
    strokeStyle: '#1a1a1a',
    lineWidth: 0,
  };

  // Thick base (gives the pint that classic pub feel)
  const bottom = Matter.Bodies.rectangle(
    centerX,
    baseY,
    innerBottomWidth + wallThickness * 2 + 24,
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

  // The walls live to the OUTSIDE of the inner volume; offset by half the
  // wall thickness so the inside surfaces line up with the inner widths.
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
