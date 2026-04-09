/**
 * Shared sizing math for the bar stage. PhysicsStage and BarTap both use
 * this so the visual tap and the physical spawn point stay in lockstep.
 */
export function computeTapAllowance(stageHeight: number): number {
  return Math.min(Math.max(stageHeight * 0.4, 150), 320);
}

/**
 * Vertical position of the spout opening within the BarTap SVG, expressed
 * as a fraction of the SVG's total height.
 */
export const TAP_SPOUT_RATIO = 0.955;

/**
 * Pixels of breathing room above the tap (between the nav border and the
 * top of the tap paddle).
 */
export const TAP_TOP_OFFSET = 14;

/**
 * Pixels of empty air between the spout opening and the cup rim. Letters
 * fall through this gap; it also gives stacked overflow somewhere to go.
 */
export const TAP_TO_CUP_GAP = 36;
