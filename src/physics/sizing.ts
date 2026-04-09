/**
 * Shared sizing math for the bar stage. PhysicsStage and BarTap both use
 * this so the visual tap and the physical spawn point stay in lockstep.
 */
export function computeTapAllowance(stageHeight: number): number {
  return Math.min(Math.max(stageHeight * 0.46, 170), 360);
}

/**
 * Vertical position of the spout opening within the BarTap SVG, expressed
 * as a fraction of the SVG's total height. Update this when BarTap geometry
 * changes so the physics spawn point keeps tracking the visual spout.
 */
export const TAP_SPOUT_RATIO = 0.89;
