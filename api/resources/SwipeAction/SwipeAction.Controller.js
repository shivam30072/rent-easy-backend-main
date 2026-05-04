import SwipeActionModel from './SwipeAction.Model.js'
import PartnerProfileModel from '../PartnerProfile/PartnerProfile.Model.js'
import PartnerRequestModel from '../PartnerRequest/PartnerRequest.Model.js'
import { partnerListingModel } from '../PartnerListing/PartnerListing.Schema.js'
import { NotificationModel } from '../Notification/Notification.Model.js'
import { sendPushNotification } from '../../helper/pushNotification.js'
import { SWIPE_MESSAGES, SUPER_LIKE_DAILY_LIMIT } from './SwipeAction.Constant.js'

const handleLikeOrSuper = async (req, res, action) => {
  const { targetUserId } = req.body
  const me = await PartnerProfileModel.getMyProfileService(req.user._id)
  const target = await PartnerProfileModel.getProfileByUserIdService(targetUserId)
  if (!me || !target) return res.error(404, 'Profile not found.')

  if (action === 'super_like') {
    const used = await SwipeActionModel.superLikesToday(me._id)
    if (used >= SUPER_LIKE_DAILY_LIMIT) return res.error(429, SWIPE_MESSAGES.SUPER_LIKE_LIMIT)
  }

  await SwipeActionModel.recordSwipe(me._id, target._id, action)

  // Find or create a PartnerRequest between these two users (in either direction)
  let pr = await PartnerRequestModel.findRequestBetweenUsersService(req.user._id, target.userId)
  if (!pr) {
    // Reverse direction
    pr = await PartnerRequestModel.findRequestBetweenUsersService(target.userId, req.user._id)
  }

  if (!pr) {
    // No existing request — create a new pending one
    let listingId = null
    const targetListing = await partnerListingModel.findOne({ createdBy: target.userId, status: 'active' }).sort({ createdAt: -1 })
    if (targetListing) listingId = targetListing._id
    else {
      const myListing = await partnerListingModel.findOne({ createdBy: req.user._id, status: 'active' }).sort({ createdAt: -1 })
      if (myListing) listingId = myListing._id
    }
    pr = await PartnerRequestModel.sendRequestService({
      listingId,
      seekerId: req.user._id,
      ownerId: target.userId,
      note: 'Swipe-based request.',
    })
  }

  const mutual = await SwipeActionModel.isMutualLike(me._id, target._id)
  if (mutual) {
    // Auto-accept whichever side hasn't accepted yet
    if (pr.status === 'pending') {
      await PartnerRequestModel.respondToRequestService(pr._id, pr.ownerId, 'accepted')
    }
    const message = `You and ${target.basics.displayName} liked each other!`
    await Promise.all([
      NotificationModel.createNotification({
        userId: req.user._id, type: 'partner_match_new', message,
        meta: { targetUserId: target.userId, partnerRequestId: pr._id },
      }),
      NotificationModel.createNotification({
        userId: target.userId, type: 'partner_match_new', message: `You and ${me.basics.displayName} liked each other!`,
        meta: { targetUserId: req.user._id, partnerRequestId: pr._id },
      }),
    ]).catch(e => console.error('Notification creation:', e.message))
    sendPushNotification(target.userId, "It's a match!", `${me.basics.displayName} liked you back`,
      { type: 'partner_match_new', partnerRequestId: pr._id?.toString() }
    ).catch(e => console.error('Push:', e.message))
    return res.success(200, SWIPE_MESSAGES.MUTUAL_MATCH, { mutualMatch: true, partnerRequestId: pr._id })
  }

  // Not mutual yet — pending request already created
  return res.success(200, SWIPE_MESSAGES.RECORDED, { mutualMatch: false, partnerRequestId: pr._id })
}

const like = (req, res) => handleLikeOrSuper(req, res, 'like')
const superLike = (req, res) => handleLikeOrSuper(req, res, 'super_like')

const skip = async (req, res) => {
  const { targetUserId } = req.body
  const me = await PartnerProfileModel.getMyProfileService(req.user._id)
  const target = await PartnerProfileModel.getProfileByUserIdService(targetUserId)
  if (!me || !target) return res.error(404, 'Profile not found.')
  await SwipeActionModel.recordSwipe(me._id, target._id, 'skip')
  return res.success(200, SWIPE_MESSAGES.RECORDED, { ok: true })
}

const undoLast = async (req, res) => {
  const me = await PartnerProfileModel.getMyProfileService(req.user._id)
  if (!me) return res.error(404, 'Profile not found.')
  const result = await SwipeActionModel.undoLast(me._id)
  if (!result) return res.error(404, 'Nothing to undo.')
  if (result === 'expired') return res.error(410, SWIPE_MESSAGES.NOT_UNDOABLE)
  return res.success(200, SWIPE_MESSAGES.UNDONE, { ok: true })
}

const SwipeActionController = { like, superLike, skip, undoLast }
export default SwipeActionController
