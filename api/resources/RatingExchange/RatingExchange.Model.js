import { ratingExchangeModel } from './RatingExchange.Schema.js'
import AppError from '../../helper/AppError.js'
import {
  RATING_EXCHANGE_STATUS,
  RATING_WINDOW_DAYS,
  RATING_EXCHANGE_MESSAGES,
} from './RatingExchange.Constant.js'
import {
  createReputationSignal,
} from '../../services/reputation.service.js'
import { SIGNAL_TYPES, ROLES } from '../ReputationSignal/ReputationSignal.Constant.js'
import {
  SIGNAL_WEIGHTS,
  weightForRatingReceived,
} from '../../config/reputation.weights.js'
import { NotificationModel } from '../Notification/Notification.Model.js'
import { sendPushNotification } from '../../helper/pushNotification.js'

// Basic profanity filter — replace with proper moderation later.
const PROFANITY_RE = /\b(f[\*u]ck|sh[\*i]t|b[\*i]tch|a[\*s]{2}hole)\b/i
const sanitizeComment = (raw) => {
  if (typeof raw !== 'string') return ''
  return raw.trim().slice(0, 1000)
}
const containsProfanity = (s) => PROFANITY_RE.test(s)

// ----- Window opening — called by openWindow cron when an agreement ends or is terminated.
// Idempotent via the `agreementId` unique index.
export async function openWindowForAgreement(agreement, openedAt = new Date()) {
  if (!agreement?._id) return null
  const existing = await ratingExchangeModel.findOne({ agreementId: agreement._id })
  if (existing) return existing

  const deadline = new Date(openedAt.getTime() + RATING_WINDOW_DAYS * 24 * 60 * 60 * 1000)

  const created = await ratingExchangeModel.create({
    agreementId: agreement._id,
    tenantId: agreement.userId,
    ownerId: agreement.ownerId,
    windowOpenedAt: openedAt,
    deadline,
    status: RATING_EXCHANGE_STATUS.PENDING,
  })

  const message = 'A rental ended. Please rate your experience to access new platform actions.'
  for (const userId of [agreement.userId, agreement.ownerId]) {
    NotificationModel.createNotification({
      userId,
      type: 'rating_required',
      message,
      meta: { exchangeId: created._id, agreementId: agreement._id },
      triggeredAt: new Date(),
    }).catch(err => console.error('[rating-exchange] notification failed:', err.message))

    sendPushNotification(
      userId,
      'Rate your last rental',
      'Submit your rating within 14 days. New platform actions are blocked until you do.',
      { type: 'rating_required', exchangeId: String(created._id) }
    ).catch(err => console.error('[rating-exchange] push failed:', err.message))
  }

  return created
}

// ----- Submission

export async function submitRatingService({ exchangeId, userId, stars, comment }) {
  if (!exchangeId || typeof stars !== 'number' || stars < 1 || stars > 5) {
    throw new AppError(RATING_EXCHANGE_MESSAGES.BAD_INPUT, 400)
  }

  const exchange = await ratingExchangeModel.findById(exchangeId)
  if (!exchange) throw new AppError(RATING_EXCHANGE_MESSAGES.NOT_FOUND, 404)

  if (exchange.status !== RATING_EXCHANGE_STATUS.PENDING) {
    throw new AppError(RATING_EXCHANGE_MESSAGES.WINDOW_CLOSED, 409)
  }

  const isTenant = String(exchange.tenantId) === String(userId)
  const isOwner = String(exchange.ownerId) === String(userId)
  if (!isTenant && !isOwner) throw new AppError(RATING_EXCHANGE_MESSAGES.NOT_PARTICIPANT, 403)

  const submitterField = isTenant ? 'tenantRating' : 'ownerRating'
  if (exchange[submitterField]) throw new AppError(RATING_EXCHANGE_MESSAGES.ALREADY_SUBMITTED, 409)

  const cleaned = sanitizeComment(comment)
  const finalComment = containsProfanity(cleaned) ? '' : cleaned

  exchange[submitterField] = { stars, comment: finalComment, submittedAt: new Date() }

  if (exchange.tenantRating && exchange.ownerRating) {
    exchange.status = RATING_EXCHANGE_STATUS.BOTH_SUBMITTED
    exchange.publishedAt = new Date()
  }

  await exchange.save()

  if (exchange.status === RATING_EXCHANGE_STATUS.BOTH_SUBMITTED) {
    publishBothRatings(exchange).catch(err => console.error('[rating-exchange] publish failed:', err.message))
  }

  return exchange
}

// Once both have submitted, fire reputation signals + notify both parties.
async function publishBothRatings(exchange) {
  if (exchange.ownerRating) {
    await createReputationSignal({
      userId: exchange.tenantId,
      role: ROLES.TENANT,
      signalType: SIGNAL_TYPES.OWNER_RATING_RECEIVED,
      weightedValue: weightForRatingReceived(exchange.ownerRating.stars),
      rawValue: { stars: exchange.ownerRating.stars },
      sourceRef: { collection: 'RatingExchange', id: exchange._id },
      occurredAt: exchange.ownerRating.submittedAt,
      pushImmediate: true,
    })
  }
  if (exchange.tenantRating) {
    await createReputationSignal({
      userId: exchange.ownerId,
      role: ROLES.OWNER,
      signalType: SIGNAL_TYPES.TENANT_RATING_RECEIVED,
      weightedValue: weightForRatingReceived(exchange.tenantRating.stars),
      rawValue: { stars: exchange.tenantRating.stars },
      sourceRef: { collection: 'RatingExchange', id: exchange._id },
      occurredAt: exchange.tenantRating.submittedAt,
      pushImmediate: true,
    })
  }

  const message = 'Your rental rating is now published — both sides have rated.'
  for (const userId of [exchange.tenantId, exchange.ownerId]) {
    NotificationModel.createNotification({
      userId,
      type: 'rating_published',
      message,
      meta: { exchangeId: exchange._id, agreementId: exchange.agreementId },
      triggeredAt: new Date(),
    }).catch(err => console.error('[rating-exchange] publish notification failed:', err.message))
  }
}

// ----- Pending lookup — used by gating middleware AND frontend "you must rate" UI

export async function getPendingForUserService(userId) {
  return ratingExchangeModel
    .find({
      status: RATING_EXCHANGE_STATUS.PENDING,
      $or: [
        { tenantId: userId, tenantRating: null },
        { ownerId: userId, ownerRating: null },
      ],
    })
    .lean()
}

// ----- Published lookup — for showing on a user's profile

export async function getPublishedForUserService(userId) {
  return ratingExchangeModel
    .find({
      $or: [{ tenantId: userId }, { ownerId: userId }],
      status: { $in: [RATING_EXCHANGE_STATUS.BOTH_SUBMITTED, RATING_EXCHANGE_STATUS.ONE_FORFEIT, RATING_EXCHANGE_STATUS.CLOSED] },
      publishedAt: { $ne: null },
    })
    .sort({ publishedAt: -1 })
    .lean()
}

// ----- Deadline sweep — called by deadlineSweep cron

export async function processDeadlinePassed(now = new Date()) {
  const expired = await ratingExchangeModel.find({
    status: RATING_EXCHANGE_STATUS.PENDING,
    deadline: { $lte: now },
  })

  for (const exchange of expired) {
    const tenantSubmitted = !!exchange.tenantRating
    const ownerSubmitted = !!exchange.ownerRating

    if (!tenantSubmitted && !ownerSubmitted) {
      exchange.status = RATING_EXCHANGE_STATUS.BOTH_FORFEIT
      await exchange.save()
      continue
    }

    exchange.status = RATING_EXCHANGE_STATUS.ONE_FORFEIT
    exchange.publishedAt = now
    await exchange.save()

    if (tenantSubmitted && !ownerSubmitted) {
      await createReputationSignal({
        userId: exchange.ownerId,
        role: ROLES.OWNER,
        signalType: SIGNAL_TYPES.TENANT_RATING_RECEIVED,
        weightedValue: weightForRatingReceived(exchange.tenantRating.stars),
        rawValue: { stars: exchange.tenantRating.stars },
        sourceRef: { collection: 'RatingExchange', id: exchange._id },
        occurredAt: exchange.tenantRating.submittedAt,
        pushImmediate: true,
      })
      await createReputationSignal({
        userId: exchange.ownerId,
        role: ROLES.OWNER,
        signalType: SIGNAL_TYPES.FORFEITED_RATING,
        weightedValue: SIGNAL_WEIGHTS[SIGNAL_TYPES.FORFEITED_RATING],
        sourceRef: { collection: 'RatingExchange', id: exchange._id },
        occurredAt: now,
        pushImmediate: true,
      })
    } else if (ownerSubmitted && !tenantSubmitted) {
      await createReputationSignal({
        userId: exchange.tenantId,
        role: ROLES.TENANT,
        signalType: SIGNAL_TYPES.OWNER_RATING_RECEIVED,
        weightedValue: weightForRatingReceived(exchange.ownerRating.stars),
        rawValue: { stars: exchange.ownerRating.stars },
        sourceRef: { collection: 'RatingExchange', id: exchange._id },
        occurredAt: exchange.ownerRating.submittedAt,
        pushImmediate: true,
      })
      await createReputationSignal({
        userId: exchange.tenantId,
        role: ROLES.TENANT,
        signalType: SIGNAL_TYPES.FORFEITED_RATING,
        weightedValue: SIGNAL_WEIGHTS[SIGNAL_TYPES.FORFEITED_RATING],
        sourceRef: { collection: 'RatingExchange', id: exchange._id },
        occurredAt: now,
        pushImmediate: true,
      })
    }
  }

  return expired.length
}

const RatingExchangeModel = {
  openWindowForAgreement,
  submitRatingService,
  getPendingForUserService,
  getPublishedForUserService,
  processDeadlinePassed,
}

export default RatingExchangeModel
