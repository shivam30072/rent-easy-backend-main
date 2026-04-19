import { enquiryModel } from './Enquiry.Schema.js'
import { ENQUIRY_STATUS } from './Enquiry.Constant.js'

const createEnquiryService = async ({ propertyId, roomId, enquiredBy, ownerId, tenantName, tenantPhone, propertyName }) => {
  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)

  const existing = await enquiryModel.findOne({
    propertyId,
    enquiredBy,
    createdAt: { $gte: startOfDay }
  })

  if (existing) {
    return { alreadyEnquired: true }
  }

  return await enquiryModel.create({
    propertyId,
    roomId,
    enquiredBy,
    ownerId,
    tenantName,
    tenantPhone,
    propertyName,
    status: ENQUIRY_STATUS.NEW
  })
}

const getEnquiriesForOwnerService = async (ownerId, page = 1, limit = 20) => {
  const skip = (page - 1) * limit
  const enquiries = await enquiryModel
    .find({ ownerId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('enquiredBy', 'name email phone')

  const total = await enquiryModel.countDocuments({ ownerId })
  return { enquiries, total, page, limit }
}

const getUnreadCountForOwnerService = async (ownerId) => {
  return await enquiryModel.countDocuments({ ownerId, status: ENQUIRY_STATUS.NEW })
}

const markEnquiriesAsViewedService = async (ownerId) => {
  return await enquiryModel.updateMany(
    { ownerId, status: ENQUIRY_STATUS.NEW },
    { $set: { status: ENQUIRY_STATUS.VIEWED } }
  )
}

const getEnquiriesForTenantService = async (tenantId, page = 1, limit = 20) => {
  const skip = (page - 1) * limit
  const enquiries = await enquiryModel
    .find({ enquiredBy: tenantId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('propertyId', 'propertyName minAmount maxAmount')
    .populate('roomId', 'roomType rent securityDeposit')
    .populate('ownerId', 'name phone')

  const total = await enquiryModel.countDocuments({ enquiredBy: tenantId })
  return { enquiries, total, page, limit }
}

const EnquiryModel = {
  createEnquiryService,
  getEnquiriesForOwnerService,
  getUnreadCountForOwnerService,
  markEnquiriesAsViewedService,
  getEnquiriesForTenantService
}

export default EnquiryModel
