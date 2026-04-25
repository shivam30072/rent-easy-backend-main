import { disputeModel } from './Dispute.Schema.js'
import { reputationSignalModel } from '../ReputationSignal/ReputationSignal.Schema.js'
import { ratingExchangeModel } from '../RatingExchange/RatingExchange.Schema.js'
import { userModel } from '../User/User.Schema.js'
import { NotificationModel } from '../Notification/Notification.Model.js'
import { sendPushNotification } from '../../helper/pushNotification.js'
import { enqueueReputationRecompute } from '../../services/reputation.service.js'
import { COMPUTE_REASONS } from '../ReputationScore/ReputationScore.Constant.js'
import { SIGNAL_STATUS } from '../ReputationSignal/ReputationSignal.Constant.js'
import AppError from '../../helper/AppError.js'
import {
  DISPUTE_STATUS,
  DISPUTE_WINDOW_DAYS,
  DISPUTE_ABUSE_THRESHOLD,
  DISPUTE_ABUSE_WINDOW_DAYS,
  DISPUTE_MESSAGES,
} from './Dispute.Constant.js'

// ---------- Raise a dispute ----------
//
// Pre-conditions:
//   - signalId exists
//   - raisedByUserId === signal.userId (you can only dispute signals about you)
//   - signal.status === 'active'
//   - For rating-derived signals: must be within 7 days of publication

export async function raiseDisputeService({ signalId, raisedByUserId, reason }) {
  if (!signalId || !reason || typeof reason !== 'string') {
    throw new AppError(DISPUTE_MESSAGES.BAD_INPUT, 400)
  }

  const signal = await reputationSignalModel.findById(signalId)
  if (!signal) throw new AppError(DISPUTE_MESSAGES.SIGNAL_NOT_FOUND, 404)

  if (String(signal.userId) !== String(raisedByUserId)) {
    throw new AppError(DISPUTE_MESSAGES.NOT_YOUR_SIGNAL, 403)
  }

  if (signal.status !== SIGNAL_STATUS.ACTIVE) {
    throw new AppError('This signal is not eligible for dispute', 409)
  }

  // For rating-derived signals, enforce the 7-day window from publication.
  if (signal.sourceRef?.collection === 'RatingExchange') {
    const exchange = await ratingExchangeModel.findById(signal.sourceRef.id).lean()
    if (exchange?.publishedAt) {
      const ageMs = Date.now() - new Date(exchange.publishedAt).getTime()
      const windowMs = DISPUTE_WINDOW_DAYS * 24 * 60 * 60 * 1000
      if (ageMs > windowMs) throw new AppError(DISPUTE_MESSAGES.WINDOW_PASSED, 409)
    }
  }

  let dispute
  try {
    dispute = await disputeModel.create({
      signalId,
      raisedByUserId,
      reason: reason.trim().slice(0, 1000),
      status: DISPUTE_STATUS.OPEN,
    })
  } catch (err) {
    if (err.code === 11000) throw new AppError(DISPUTE_MESSAGES.ALREADY_RAISED, 409)
    throw err
  }

  // Immediately mark signal disputed and recompute score (excluding it).
  signal.status = SIGNAL_STATUS.DISPUTED
  await signal.save()
  await enqueueReputationRecompute(signal.userId, signal.role, COMPUTE_REASONS.DISPUTE_RESOLVED)

  return dispute
}

// ---------- Resolve a dispute (admin only) ----------

export async function resolveDisputeService({ disputeId, decision, adminNote }) {
  if (decision !== DISPUTE_STATUS.UPHELD && decision !== DISPUTE_STATUS.REJECTED) {
    throw new AppError(DISPUTE_MESSAGES.ADMIN_BAD_DECISION, 400)
  }

  const dispute = await disputeModel.findById(disputeId)
  if (!dispute) throw new AppError(DISPUTE_MESSAGES.DISPUTE_NOT_FOUND, 404)
  if (dispute.status !== DISPUTE_STATUS.OPEN) {
    throw new AppError('Dispute is already resolved', 409)
  }

  const signal = await reputationSignalModel.findById(dispute.signalId)
  if (!signal) throw new AppError(DISPUTE_MESSAGES.SIGNAL_NOT_FOUND, 404)

  if (decision === DISPUTE_STATUS.UPHELD) {
    signal.status = SIGNAL_STATUS.INVALIDATED
  } else {
    signal.status = SIGNAL_STATUS.ACTIVE
  }
  await signal.save()

  dispute.status = decision
  dispute.adminNote = (adminNote || '').slice(0, 2000)
  dispute.resolvedAt = new Date()
  await dispute.save()

  await enqueueReputationRecompute(signal.userId, signal.role, COMPUTE_REASONS.DISPUTE_RESOLVED)

  // Anti-abuse: if rejected, count rejections in the last 12 months
  if (decision === DISPUTE_STATUS.REJECTED) {
    const since = new Date(Date.now() - DISPUTE_ABUSE_WINDOW_DAYS * 24 * 60 * 60 * 1000)
    const rejectedCount = await disputeModel.countDocuments({
      raisedByUserId: dispute.raisedByUserId,
      status: DISPUTE_STATUS.REJECTED,
      resolvedAt: { $gte: since },
    })
    if (rejectedCount >= DISPUTE_ABUSE_THRESHOLD) {
      await userModel.findByIdAndUpdate(dispute.raisedByUserId, { $set: { disputeAbuseFlag: true } })
    }
  }

  // Notify the disputer
  const message = decision === DISPUTE_STATUS.UPHELD
    ? 'Your dispute was upheld. The disputed signal has been invalidated.'
    : 'Your dispute was reviewed and rejected. The signal stands.'
  NotificationModel.createNotification({
    userId: dispute.raisedByUserId,
    type: 'dispute_resolved',
    message,
    meta: { disputeId: dispute._id, signalId: signal._id, decision },
    triggeredAt: new Date(),
  }).catch(err => console.error('[dispute] notification failed:', err.message))

  sendPushNotification(
    dispute.raisedByUserId,
    'Dispute resolved',
    message,
    { type: 'dispute_resolved', disputeId: String(dispute._id) }
  ).catch(err => console.error('[dispute] push failed:', err.message))

  return dispute
}

// ---------- User reads their own disputes ----------

export async function getDisputesForUserService(userId) {
  return disputeModel
    .find({ raisedByUserId: userId })
    .sort({ createdAt: -1 })
    .lean()
}

// ---------- Admin: list all disputes ----------

export async function listAllDisputesService({ status } = {}) {
  const q = {}
  if (status) q.status = status
  return disputeModel
    .find(q)
    .sort({ createdAt: -1 })
    .populate('signalId')
    .populate('raisedByUserId', 'name email phone')
    .lean()
}

const DisputeModel = {
  raiseDisputeService,
  resolveDisputeService,
  getDisputesForUserService,
  listAllDisputesService,
}

export default DisputeModel
