import AgreementRequestModel from './AgreementRequest.Model.js'
import { AGREEMENT_REQUEST_MESSAGES } from './AgreementRequest.Constant.js'
import { sendPushNotification } from '../../helper/pushNotification.js'
import { NotificationModel } from '../Notification/Notification.Model.js'

const createRequest = async (req, res) => {
  const { enquiryId, propertyId, roomId, tenantId, ownerId, tenantName, propertyName } = req.body

  const result = await AgreementRequestModel.createAgreementRequestService({
    enquiryId, propertyId, roomId, tenantId, ownerId
  })

  if (result.blocked) {
    return res.success(200, result.reason, { blocked: true })
  }

  // Send push notification to owner (fire-and-forget)
  sendPushNotification(
    ownerId,
    'Rent Agreement Request',
    `${tenantName} has requested a rent agreement for ${propertyName}`,
    { type: 'agreement_request', agreementRequestId: result.request._id.toString() }
  ).catch(err => console.error('Push notification failed:', err.message))

  // Create in-app notification
  NotificationModel.createNotification({
    userId: ownerId,
    type: 'agreement_request',
    message: `${tenantName} has requested a rent agreement for ${propertyName}`,
    meta: {
      agreementRequestId: result.request._id,
      enquiryId,
      propertyId,
      roomId,
      tenantId,
      propertyName,
      tenantName
    }
  }).catch(err => console.error('Notification creation failed:', err.message))

  return res.success(201, AGREEMENT_REQUEST_MESSAGES.CREATED, result.request)
}

const respondToRequest = async (req, res) => {
  const { requestId, status } = req.body
  const data = await AgreementRequestModel.updateRequestStatusService(requestId, status)

  if (!data) {
    return res.success(404, AGREEMENT_REQUEST_MESSAGES.NOT_FOUND, null)
  }

  const message = status === 'accepted'
    ? AGREEMENT_REQUEST_MESSAGES.ACCEPTED
    : AGREEMENT_REQUEST_MESSAGES.DECLINED

  return res.success(200, message, data)
}

const getRequestStatus = async (req, res) => {
  const { enquiryId, tenantId } = req.query
  const data = await AgreementRequestModel.getRequestStatusService(enquiryId, tenantId)
  return res.success(200, AGREEMENT_REQUEST_MESSAGES.FETCHED, data)
}

const getPendingForOwner = async (req, res) => {
  const ownerId = req.query.ownerId || req.body.ownerId
  const data = await AgreementRequestModel.getPendingRequestsForOwnerService(ownerId)
  return res.success(200, AGREEMENT_REQUEST_MESSAGES.FETCHED, data)
}

const AgreementRequestController = {
  createRequest,
  respondToRequest,
  getRequestStatus,
  getPendingForOwner
}

export default AgreementRequestController