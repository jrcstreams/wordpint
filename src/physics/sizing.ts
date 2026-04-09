/**
 * Shared sizing math for the bar stage. PhysicsStage and BarTap both
 * use this so the visual tap and the physical spawn point stay in
 * lockstep, AND so everything scales proportionally to the stage's
 * actual rendered height (which lets the layout work on short laptop
 * viewports without the tap visually colliding with the cup).
 */

/**
 * Visual height of the draft tap, in CSS pixels.
 * Roughly 38% of the stage height, clamped so the wordmark stays
 * legible at the small end and doesn't dominate the bar at the large end.
 */
export function computeTapAllowance(stageHeight: number): number {
  return Math.min(Math.max(stageHeight * 0.38, 110), 320);
}

/**
 * Pixels of breathing room between the top of the bar (the nav border)
 * and the top of the tap paddle. ~3% of the stage with a sane floor.
 */
export function computeTapTopOffset(stageHeight: number): number {
  return Math.min(Math.max(Math.round(stageHeight * 0.03), 6), 18);
}

/**
 * Pixels of empty air between the spout opening and the cup rim.
 * Letters fall through this space, and stacked overflow has somewhere
 * to go before exiting the cup column.
 */
export function computeTapToCupGap(stageHeight: number): number {
  return Math.min(Math.max(Math.round(stageHeight * 0.08), 16), 40);
}

/**
 * Distance from the cup base to the bar's bottom border.
 */
export function computeCupBottomMargin(stageHeight: number): number {
  return Math.min(Math.max(Math.round(stageHeight * 0.015), 4), 12);
}

/**
 * Vertical position of the spout opening within the BarTap SVG,
 * expressed as a fraction of the SVG's total height. Constant because
 * the SVG geometry is fixed; only the rendered height scales.
 */
export const TAP_SPOUT_RATIO = 0.957;
