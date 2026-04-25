export const BASE_SCORE = 500
export const MIN_SCORE = 0
export const MAX_SCORE = 1000

export const TIERS = Object.freeze({
  POOR: 'poor',
  FAIR: 'fair',
  GOOD: 'good',
  EXCELLENT: 'excellent',
})

// Inclusive lower bound per tier
export const TIER_THRESHOLDS = Object.freeze([
  { tier: TIERS.EXCELLENT, min: 750 },
  { tier: TIERS.GOOD, min: 600 },
  { tier: TIERS.FAIR, min: 400 },
  { tier: TIERS.POOR, min: 0 },
])

export const COMPUTE_REASONS = Object.freeze({
  NIGHTLY_BATCH: 'nightly_batch',
  SIGNAL_PUSHED: 'signal_pushed',
  DISPUTE_RESOLVED: 'dispute_resolved',
  BACKFILL: 'backfill',
})

export function deriveTier(score) {
  for (const t of TIER_THRESHOLDS) {
    if (score >= t.min) return t.tier
  }
  return TIERS.POOR
}
