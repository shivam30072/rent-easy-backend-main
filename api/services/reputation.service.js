// Central reputation engine. Three responsibilities:
//   1. ensureReputationScoreDocs(userId)           — make sure the user has a score doc per role they hold
//   2. createReputationSignal(...)                 — persist a signal event, optionally enqueue immediate recompute
//   3. computeAndSaveScore(userId, role, reason)   — pure recompute against current signals, upsert ReputationScore

import { reputationSignalModel } from '../resources/ReputationSignal/ReputationSignal.Schema.js'
import { reputationScoreModel } from '../resources/ReputationScore/ReputationScore.Schema.js'
import { userModel } from '../resources/User/User.Schema.js'
import { ownerModel } from '../resources/Owner/Owner.Schema.js'
import { ROLES, SIGNAL_STATUS, SIGNAL_TYPES } from '../resources/ReputationSignal/ReputationSignal.Constant.js'
import {
  BASE_SCORE,
  MIN_SCORE,
  MAX_SCORE,
  COMPUTE_REASONS,
  deriveTier,
} from '../resources/ReputationScore/ReputationScore.Constant.js'
import { decayFactor, SIGNAL_WEIGHTS } from '../config/reputation.weights.js'
import reputationQueue from '../workers/reputation.queue.js'

// ----- Score doc bootstrap -----
//
// Called whenever a user is created OR when their role is set/changed.
// Idempotent — does nothing if the doc(s) already exist.

export async function ensureReputationScoreDocs(userId) {
  const user = await userModel.findById(userId).lean()
  if (!user) return

  const rolesNeeded = []
  if (user.role === 'tenant') rolesNeeded.push(ROLES.TENANT)
  if (user.role === 'owner') rolesNeeded.push(ROLES.OWNER)

  for (const role of rolesNeeded) {
    const existing = await reputationScoreModel.findOne({ userId, role })
    if (existing) continue

    const created = await reputationScoreModel.create({
      userId,
      role,
      score: BASE_SCORE,
      tier: deriveTier(BASE_SCORE),
      computeReason: COMPUTE_REASONS.BACKFILL,
    })

    const ptrField = role === ROLES.TENANT ? 'tenantReputationScoreId' : 'ownerReputationScoreId'
    await userModel.findByIdAndUpdate(userId, { $set: { [ptrField]: created._id } })
  }
}

// ----- Signal creation -----
//
// Persist a reputation signal and optionally enqueue an immediate recompute.
// Failures are swallowed and logged — signal creation must NEVER block the caller.

export async function createReputationSignal({
  userId,
  role,
  signalType,
  weightedValue,
  rawValue = null,
  sourceRef = null,
  occurredAt = new Date(),
  pushImmediate = false,
}) {
  try {
    if (!userId || !role || !signalType || typeof weightedValue !== 'number') {
      console.warn('[reputation] createReputationSignal called with missing fields', { userId, role, signalType, weightedValue })
      return null
    }

    const signal = await reputationSignalModel.create({
      userId,
      role,
      signalType,
      weightedValue,
      rawValue,
      sourceRef,
      occurredAt,
    })

    if (pushImmediate) {
      await enqueueReputationRecompute(userId, role, COMPUTE_REASONS.SIGNAL_PUSHED)
    }

    return signal
  } catch (err) {
    console.error('[reputation] createReputationSignal failed:', err.message)
    return null
  }
}

// ----- Enqueue recompute -----
//
// Job key dedupe: jobs with the same userId+role collapse.

export async function enqueueReputationRecompute(userId, role, reason = COMPUTE_REASONS.SIGNAL_PUSHED) {
  try {
    const jobId = `recompute:${userId}:${role}`
    await reputationQueue.add(
      'recompute-reputation',
      { userId: String(userId), role, reason },
      { jobId, removeOnComplete: true, removeOnFail: 100, attempts: 3, backoff: { type: 'exponential', delay: 2000 } }
    )
  } catch (err) {
    console.error('[reputation] enqueue failed:', err.message)
  }
}

// ----- Compute + save -----
//
// Compute the user's score for one role from current active signals, then upsert ReputationScore.
// Returns the saved doc (lean).

export async function computeAndSaveScore(userId, role, reason = COMPUTE_REASONS.NIGHTLY_BATCH) {
  const now = new Date()

  const signals = await reputationSignalModel
    .find({ userId, role, status: SIGNAL_STATUS.ACTIVE })
    .lean()

  let raw = BASE_SCORE
  const counts = {}
  for (const s of signals) {
    raw += (s.weightedValue || 0) * decayFactor(s.occurredAt, now)
    counts[s.signalType] = (counts[s.signalType] || 0) + 1
  }

  const score = Math.round(Math.max(MIN_SCORE, Math.min(MAX_SCORE, raw)))
  const tier = deriveTier(score)

  const doc = await reputationScoreModel.findOneAndUpdate(
    { userId, role },
    {
      $set: {
        score,
        tier,
        signalCounts: counts,
        lastComputedAt: now,
        computeReason: reason,
      },
      $setOnInsert: { userId, role },
    },
    { upsert: true, new: true, lean: true }
  )

  return doc
}

// ----- Cold-start for legacy users (lazy backfill on first read) -----
//
// Pre-Reputation-feature users have no ReputationScore doc. When a read endpoint
// hits a 404, call this to:
//   1. Create the score doc
//   2. Fire any cold-start signals their CURRENT state warrants (KYC, profile basic, profile photo, bank for owners)
//      — but only if they haven't already been fired (idempotent via signalType lookup)
//   3. Synchronously recompute so the caller gets an accurate score back, not BASE 500
//
// Returns the freshly-computed score doc, or null if the user can't be scored
// (no User row, or role doesn't match).

export async function coldStartUserIfNeeded(userId, role) {
  const user = await userModel.findById(userId).lean()
  if (!user) return null
  if (user.role !== role) return null  // can't have a tenant score for an owner-only user

  await ensureReputationScoreDocs(userId)

  // What signals already exist? (avoid duplicates)
  const existing = await reputationSignalModel
    .find({ userId, role })
    .select('signalType')
    .lean()
  const have = new Set(existing.map(s => s.signalType))
  const occurredAt = user.updatedAt || user.createdAt || new Date()

  if (user.kycVerified && !have.has(SIGNAL_TYPES.KYC_VERIFIED)) {
    await createReputationSignal({
      userId, role,
      signalType: SIGNAL_TYPES.KYC_VERIFIED,
      weightedValue: SIGNAL_WEIGHTS[SIGNAL_TYPES.KYC_VERIFIED],
      sourceRef: { collection: 'User', id: user._id },
      occurredAt,
    })
  }
  if (user.name && user.phone && !have.has(SIGNAL_TYPES.PROFILE_BASIC_ADDED)) {
    await createReputationSignal({
      userId, role,
      signalType: SIGNAL_TYPES.PROFILE_BASIC_ADDED,
      weightedValue: SIGNAL_WEIGHTS[SIGNAL_TYPES.PROFILE_BASIC_ADDED],
      sourceRef: { collection: 'User', id: user._id },
      occurredAt,
    })
  }
  if (user.profileUrl && !have.has(SIGNAL_TYPES.PROFILE_PHOTO_ADDED)) {
    await createReputationSignal({
      userId, role,
      signalType: SIGNAL_TYPES.PROFILE_PHOTO_ADDED,
      weightedValue: SIGNAL_WEIGHTS[SIGNAL_TYPES.PROFILE_PHOTO_ADDED],
      sourceRef: { collection: 'User', id: user._id },
      occurredAt,
    })
  }
  if (role === ROLES.OWNER) {
    const owner = await ownerModel.findOne({ userId }).lean()
    const bankComplete = !!(
      owner?.bankDetails?.accountNumber &&
      owner?.bankDetails?.ifsc &&
      owner?.bankDetails?.accountHolderName
    )
    if (bankComplete && !have.has(SIGNAL_TYPES.BANK_VERIFIED)) {
      await createReputationSignal({
        userId, role,
        signalType: SIGNAL_TYPES.BANK_VERIFIED,
        weightedValue: SIGNAL_WEIGHTS[SIGNAL_TYPES.BANK_VERIFIED],
        sourceRef: { collection: 'Owner', id: owner._id },
        occurredAt: owner.updatedAt || owner.createdAt || occurredAt,
      })
    }
  }

  // Compute synchronously so the caller gets the right number on this same request.
  return computeAndSaveScore(userId, role, COMPUTE_REASONS.BACKFILL)
}
