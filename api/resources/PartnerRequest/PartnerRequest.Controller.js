import PartnerRequestModel from './PartnerRequest.Model.js'
import PartnerListingModel from '../PartnerListing/PartnerListing.Model.js'
import { PARTNER_REQUEST_MESSAGES } from './PartnerRequest.Constant.js'
import { sendPushNotification } from '../../helper/pushNotification.js'
import { NotificationModel } from '../Notification/Notification.Model.js'

const sendRequest = async (req, res) => {
  const { listingId, note } = req.body
  const seekerId = req.user._id

  const listing = await PartnerListingModel.getListingByIdService(listingId)
  if (!listing) return res.error(404, PARTNER_REQUEST_MESSAGES.NOT_FOUND)
  if (listing.status !== 'active') return res.error(400, PARTNER_REQUEST_MESSAGES.LISTING_NOT_ACTIVE)
  if (listing.createdBy._id.toString() === seekerId.toString()) {
    return res.error(400, PARTNER_REQUEST_MESSAGES.SELF_REQUEST)
  }

  // 7-day cooldown between requests
  const lastRequest = await PartnerRequestModel.getLastRequestBySeeker(seekerId)
  if (lastRequest) {
    const daysSince = (Date.now() - new Date(lastRequest.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    if (daysSince < 7) {
      const daysLeft = Math.ceil(7 - daysSince)
      return res.error(429, `${PARTNER_REQUEST_MESSAGES.COOLDOWN} (${daysLeft} day${daysLeft !== 1 ? 's' : ''} remaining)`)
    }
  }

  const existing = await PartnerRequestModel.checkDuplicateRequestService(listingId, seekerId)
  if (existing) return res.error(400, PARTNER_REQUEST_MESSAGES.DUPLICATE)

  const ownerId = listing.createdBy._id
  const request = await PartnerRequestModel.sendRequestService({ listingId, seekerId, ownerId, note })

  sendPushNotification(
    ownerId,
    'New Partner Request',
    `${req.user.name} is interested in your room listing`,
    { type: 'partner_request', requestId: request._id.toString(), listingId: listingId.toString() }
  ).catch(err => console.error('Push notification failed:', err.message))

  NotificationModel.createNotification({
    userId: ownerId,
    type: 'partner_request',
    message: `${req.user.name} sent a partner request for your listing in ${listing.locality}`,
    meta: { requestId: request._id, listingId },
  }).catch(err => console.error('Notification creation failed:', err.message))

  return res.success(201, PARTNER_REQUEST_MESSAGES.SENT, request)
}

const respondToRequest = async (req, res) => {
  const { requestId, status } = req.body
  const ownerId = req.user._id

  const request = await PartnerRequestModel.respondToRequestService(requestId, ownerId, status)
  if (!request) return res.error(404, PARTNER_REQUEST_MESSAGES.NOT_FOUND)

  const notifType = status === 'accepted' ? 'partner_request_accepted' : 'partner_request_rejected'
  const notifMessage = status === 'accepted'
    ? `${req.user.name} accepted your partner request!`
    : 'Your partner request was declined.'

  sendPushNotification(
    request.seekerId,
    status === 'accepted' ? 'Request Accepted!' : 'Request Update',
    notifMessage,
    { type: notifType, requestId: request._id.toString() }
  ).catch(err => console.error('Push notification failed:', err.message))

  NotificationModel.createNotification({
    userId: request.seekerId,
    type: notifType,
    message: notifMessage,
    meta: { requestId: request._id, listingId: request.listingId },
  }).catch(err => console.error('Notification creation failed:', err.message))

  return res.success(200, PARTNER_REQUEST_MESSAGES.RESPONDED, request)
}

const getMyRequests = async (req, res) => {
  const { page = 0, limit = 10 } = req.body
  const data = await PartnerRequestModel.getMyRequestsService(req.user._id, page, limit)
  return res.success(200, PARTNER_REQUEST_MESSAGES.FETCHED, data)
}

const getIncomingRequests = async (req, res) => {
  const { listingId, page = 0, limit = 10 } = req.body
  const data = await PartnerRequestModel.getIncomingRequestsService(req.user._id, listingId, page, limit)
  return res.success(200, PARTNER_REQUEST_MESSAGES.FETCHED, data)
}

const getMatches = async (req, res) => {
  const { page = 0, limit = 10, role = null } = req.body
  const data = await PartnerRequestModel.getMatchesService(req.user._id, page, limit, role)
  return res.success(200, PARTNER_REQUEST_MESSAGES.MATCHES_FETCHED, data)
}

const shareContact = async (req, res) => {
  const { requestId } = req.body
  const result = await PartnerRequestModel.shareContactService(requestId, req.user._id)
  if (!result) return res.error(404, PARTNER_REQUEST_MESSAGES.NOT_FOUND)
  if (result.notMatched) return res.error(400, PARTNER_REQUEST_MESSAGES.NOT_MATCHED)

  const otherUserId = result.seekerId.toString() === req.user._id.toString()
    ? result.ownerId
    : result.seekerId

  sendPushNotification(
    otherUserId,
    'Contact Shared',
    `${req.user.name} shared their contact info with you`,
    { type: 'partner_contact_shared', requestId: result._id.toString() }
  ).catch(err => console.error('Push notification failed:', err.message))

  NotificationModel.createNotification({
    userId: otherUserId,
    type: 'partner_contact_shared',
    message: `${req.user.name} shared their contact info with you`,
    meta: { requestId: result._id },
  }).catch(err => console.error('Notification creation failed:', err.message))

  return res.success(200, PARTNER_REQUEST_MESSAGES.CONTACT_SHARED, result)
}

const PartnerRequestController = {
  sendRequest,
  respondToRequest,
  getMyRequests,
  getIncomingRequests,
  getMatches,
  shareContact,
}

export default PartnerRequestController
