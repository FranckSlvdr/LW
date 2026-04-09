/**
 * Configuration for the eco-day detector engine.
 *
 * A "jours éco" (eco day) is when a player intentionally plays conservatively
 * — low score relative to their usual performance or the week's baseline.
 *
 * Three detection methods are supported; only one is active at a time.
 * The method and thresholds can be adjusted without touching engine logic.
 */

export type EcoDetectionMethod =
  /** Score is below a fixed absolute value */
  | 'absolute'
  /** Score falls in the bottom X% of all scores for that week */
  | 'percentile'
  /** Score is below (week mean − N × standard deviation) */
  | 'stddev'

export interface EcoConfig {
  method: EcoDetectionMethod

  /**
   * For 'absolute': scores strictly below this value are marked eco.
   * Adjust to match the alliance's typical score range.
   */
  absoluteThreshold: number

  /**
   * For 'percentile': bottom fraction of weekly scores (0.0–1.0).
   * 0.2 = bottom 20% of scores across all players × days.
   */
  percentile: number

  /**
   * For 'stddev': multiplier applied to the standard deviation.
   * Score < (mean − multiplier × stddev) → eco day.
   */
  stddevMultiplier: number
}

export const ECO_CONFIG: EcoConfig = {
  method: 'absolute',
  absoluteThreshold: 10_000_000, // 10M — adjust based on real data
  percentile: 0.2,
  stddevMultiplier: 1.5,
} as const
