import { SIGNAL_TYPES } from '../resources/ReputationSignal/ReputationSignal.Constant.js'

// Static weights (signed). For variable signals, use the helper functions below.
export const SIGNAL_WEIGHTS = Object.freeze({
  [SIGNAL_TYPES.KYC_VERIFIED]: 50,
  [SIGNAL_TYPES.PROFILE_COMPLETED]: 30,
  [SIGNAL_TYPES.BANK_VERIFIED]: 40,
  [SIGNAL_TYPES.RENT_PAID_ON_TIME]: 15,
  [SIGNAL_TYPES.AGREEMENT_COMPLETED]: 60,
  [SIGNAL_TYPES.AGREEMENT_TERMINATED_EARLY]: -80,
  [SIGNAL_TYPES.AGREEMENT_TERMINATED_BY_OWNER]: -100,
  [SIGNAL_TYPES.MAINTENANCE_REJECTED]: -15,
  [SIGNAL_TYPES.MAINTENANCE_COMPLETED]: 20,
  [SIGNAL_TYPES.AGREEMENT_SIGNED_PROMPTLY]: 20,
  [SIGNAL_TYPES.FORFEITED_RATING]: -10,
})

// Late payment severity by days late
export function weightForRentPaidLate(daysLate) {
  if (daysLate <= 3) return -10
  if (daysLate <= 14) return -30
  return -60
}

// Maintenance acceptance speed
export function weightForMaintenanceAccepted(hoursToAccept) {
  if (hoursToAccept <= 24) return 10
  if (hoursToAccept <= 72) return 5
  return 0
}

// Mutual rating: stars 1..5 → (stars - 3) * 25 → range -50..+50
export function weightForRatingReceived(stars) {
  if (typeof stars !== 'number' || stars < 1 || stars > 5) return 0
  return (stars - 3) * 25
}

// Property rating average for owner score
export function weightForPropertyRatingUpdated(avgRating) {
  if (typeof avgRating !== 'number') return 0
  return (avgRating - 3) * 20
}

// Decay: half-life = 24 months
export const DECAY_HALF_LIFE_MONTHS = 24

export function decayFactor(occurredAt, now = new Date()) {
  const monthsSince = (now.getTime() - new Date(occurredAt).getTime()) / (1000 * 60 * 60 * 24 * 30.4375)
  if (monthsSince <= 0) return 1
  return Math.pow(0.5, monthsSince / DECAY_HALF_LIFE_MONTHS)
}
