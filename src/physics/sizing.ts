/**
 * Shared sizing math for the bar stage. PhysicsStage and BarTap both use
 * this so the visual tap and the physical spawn point stay in lockstep.
 */
export function computeTapAllowance(stageHeight: number): number {
  return Math.min(Math.max(stageHeight * 0.3, 110), 240);
}
