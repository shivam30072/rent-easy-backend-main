import { reputationScoreModel } from '../ReputationScore/ReputationScore.Schema.js'
import { reputationSignalModel } from '../ReputationSignal/ReputationSignal.Schema.js'
import { SIGNAL_STATUS } from '../ReputationSignal/ReputationSignal.Constant.js'
import { decayFactor } from '../../config/reputation.weights.js'
import { REPUTATION_MESSAGES } from './Reputation.Constant.js'
import { enqueueReputationRecompute, coldStartUserIfNeeded } from '../../services/reputation.service.js'

const getScore = async (req, res) => {
  const { userId, role } = req.body
  if (!userId || !role) return res.error(400, REPUTATION_MESSAGES.BAD_INPUT)

  let doc = await reputationScoreModel.findOne({ userId, role }).lean()
  if (!doc) {
    // Legacy user — bootstrap their score doc + cold-start signals on first read.
    doc = await coldStartUserIfNeeded(userId, role)
    if (!doc) return res.error(404, REPUTATION_MESSAGES.NOT_FOUND)
  }

  return res.success(200, REPUTATION_MESSAGES.SCORE_FETCHED, {
    userId: doc.userId,
    role: doc.role,
    score: doc.score,
    tier: doc.tier,
    completedRentalsCount: doc.completedRentalsCount,
    lastComputedAt: doc.lastComputedAt,
  })
}

const getMultipleScores = async (req, res) => {
  const { userIds = [], role } = req.body
  if (!Array.isArray(userIds) || !role) return res.error(400, REPUTATION_MESSAGES.BAD_INPUT)

  const docs = await reputationScoreModel.find({ userId: { $in: userIds }, role }).lean()
  const byId = new Map(docs.map(d => [String(d.userId), d]))

  const out = userIds.map(uid => {
    const d = byId.get(String(uid))
    return d
      ? { userId: uid, role, score: d.score, tier: d.tier }
      : { userId: uid, role, score: null, tier: null }
  })

  return res.success(200, REPUTATION_MESSAGES.BULK_FETCHED, out)
}

const getBreakdown = async (req, res) => {
  const { userId, role } = req.body
  if (!userId || !role) return res.error(400, REPUTATION_MESSAGES.BAD_INPUT)

  // Auth check: only the user themselves can view their full breakdown
  if (String(req.user?._id) !== String(userId)) {
    return res.error(403, REPUTATION_MESSAGES.FORBIDDEN)
  }

  let score = await reputationScoreModel.findOne({ userId, role }).lean()
  if (!score) {
    score = await coldStartUserIfNeeded(userId, role)
    if (!score) return res.error(404, REPUTATION_MESSAGES.NOT_FOUND)
  }

  const signals = await reputationSignalModel
    .find({ userId, role, status: SIGNAL_STATUS.ACTIVE })
    .sort({ occurredAt: -1 })
    .limit(200)
    .lean()

  const now = new Date()
  const enriched = signals.map(s => ({
    _id: s._id,
    signalType: s.signalType,
    rawValue: s.rawValue,
    weightedValue: s.weightedValue,
    decayedImpact: Math.round(s.weightedValue * decayFactor(s.occurredAt, now) * 100) / 100,
    occurredAt: s.occurredAt,
    sourceRef: s.sourceRef,
  }))

  return res.success(200, REPUTATION_MESSAGES.BREAKDOWN_FETCHED, {
    score: score.score,
    tier: score.tier,
    completedRentalsCount: score.completedRentalsCount,
    signals: enriched,
  })
}

// ---------- Admin endpoints ----------

const adminListSignals = async (req, res) => {
  const { userId, role } = req.query
  if (!userId || !role) return res.error(400, 'userId and role are required')
  const signals = await reputationSignalModel
    .find({ userId, role })
    .sort({ occurredAt: -1 })
    .limit(500)
    .lean()
  return res.success(200, 'Signals fetched', signals)
}

const adminForceRecompute = async (req, res) => {
  const { userId, role, reason } = req.body
  if (!userId || !role) return res.error(400, 'userId and role are required')
  await enqueueReputationRecompute(userId, role, reason || 'admin_force')
  return res.success(202, 'Recompute enqueued', { userId, role })
}

const adminInvalidateSignal = async (req, res) => {
  const { id } = req.params
  const signal = await reputationSignalModel.findById(id)
  if (!signal) return res.error(404, 'Signal not found')
  signal.status = SIGNAL_STATUS.INVALIDATED
  await signal.save()
  await enqueueReputationRecompute(signal.userId, signal.role, 'admin_invalidate')
  return res.success(200, 'Signal invalidated', signal)
}

const ReputationController = {
  getScore,
  getMultipleScores,
  getBreakdown,
  adminListSignals,
  adminForceRecompute,
  adminInvalidateSignal,
}

export default ReputationController
