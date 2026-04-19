import { agreementRequestModel } from './AgreementRequest.Schema.js'
import { AGREEMENT_REQUEST_STATUS, AGREEMENT_REQUEST_MESSAGES } from './AgreementRequest.Constant.js'

const COOLDOWN_DAYS = 7

const createAgreementRequestService = async ({ enquiryId, propertyId, roomId, tenantId, ownerId }) => {
  // Check for existing request on this enquiry by this tenant
  const existing = await agreementRequestModel
    .findOne({ enquiryId, tenantId })
    .sort({ createdAt: -1 })

  if (existing) {
    // If already accepted, block resend
    if (existing.status === AGREEMENT_REQUEST_STATUS.ACCEPTED) {
      return { blocked: true, reason: AGREEMENT_REQUEST_MESSAGES.ALREADY_ACCEPTED }
    }

    // If pending or declined, check 7-day cooldown
    const daysSince = (Date.now() - new Date(existing.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    if (daysSince < COOLDOWN_DAYS) {
      return { blocked: true, reason: AGREEMENT_REQUEST_MESSAGES.ALREADY_REQUESTED }
    }
  }

  const request = await agreementRequestModel.create({
    enquiryId,
    propertyId,
    roomId,
    tenantId,
    ownerId,
    status: AGREEMENT_REQUEST_STATUS.PENDING
  })

  return { blocked: false, request }
}

const getRequestStatusService = async (enquiryId, tenantId) => {
  const request = await agreementRequestModel
    .findOne({ enquiryId, tenantId })
    .sort({ createdAt: -1 })
    .lean()

  return request
}

const updateRequestStatusService = async (requestId, status) => {
  const request = await agreementRequestModel.findById(requestId)
  if (!request) return null

  request.status = status
  await request.save()
  return request
}

const getPendingRequestsForOwnerService = async (ownerId) => {
  return await agreementRequestModel
    .find({ ownerId, status: AGREEMENT_REQUEST_STATUS.PENDING })
    .sort({ createdAt: -1 })
    .populate('tenantId', 'name phone')
    .populate('propertyId', 'propertyName')
    .populate('roomId', 'roomType roomNumber rent securityDeposit')
    .lean()
}

const AgreementRequestModel = {
  createAgreementRequestService,
  getRequestStatusService,
  updateRequestStatusService,
  getPendingRequestsForOwnerService
}

export default AgreementRequestModel