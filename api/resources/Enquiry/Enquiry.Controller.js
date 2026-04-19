import EnquiryModel from './Enquiry.Model.js'
import { ENQUIRY_MESSAGES } from './Enquiry.Constant.js'
import { sendPushNotification } from '../../helper/pushNotification.js'
import { NotificationModel } from '../Notification/Notification.Model.js'

const createEnquiry = async (req, res) => {
  const { propertyId, roomId, ownerId, tenantName, tenantPhone, propertyName, enquiredBy } = req.body
  const data = await EnquiryModel.createEnquiryService({
    propertyId,
    roomId,
    enquiredBy,
    ownerId,
    tenantName,
    tenantPhone,
    propertyName
  })

  if (data.alreadyEnquired) {
    return res.success(200, 'You have already enquired about this property today.', data)
  }

  sendPushNotification(
    ownerId,
    'New Property Enquiry',
    `${tenantName} is interested in ${propertyName}`,
    { type: 'enquiry', enquiryId: data._id.toString() }
  ).catch(err => console.error('Push notification failed:', err.message))

  NotificationModel.createNotification({
    userId: ownerId,
    type: 'enquiry',
    message: `${tenantName} enquired about ${propertyName}`,
    meta: { enquiryId: data._id, propertyId, roomId }
  }).catch(err => console.error('Notification creation failed:', err.message))

  return res.success(201, ENQUIRY_MESSAGES.CREATED, data)
}

const getOwnerEnquiries = async (req, res) => {
  const ownerId = req.query.ownerId || req.body.ownerId
  const page = parseInt(req.query.page) || 1
  const limit = parseInt(req.query.limit) || 20
  const data = await EnquiryModel.getEnquiriesForOwnerService(ownerId, page, limit)
  return res.success(200, ENQUIRY_MESSAGES.FETCHED, data)
}

const getTenantEnquiries = async (req, res) => {
  const tenantId = req.query.tenantId || req.body.tenantId
  const page = parseInt(req.query.page) || 1
  const limit = parseInt(req.query.limit) || 20
  const data = await EnquiryModel.getEnquiriesForTenantService(tenantId, page, limit)
  return res.success(200, ENQUIRY_MESSAGES.FETCHED, data)
}

const getUnreadCount = async (req, res) => {
  const ownerId = req.query.ownerId || req.body.ownerId
  const count = await EnquiryModel.getUnreadCountForOwnerService(ownerId)
  return res.success(200, ENQUIRY_MESSAGES.COUNT_FETCHED, { count })
}

const markAsViewed = async (req, res) => {
  const ownerId = req.body.ownerId || req.query.ownerId
  await EnquiryModel.markEnquiriesAsViewedService(ownerId)
  return res.success(200, ENQUIRY_MESSAGES.MARKED_VIEWED)
}

const EnquiryController = {
  createEnquiry,
  getOwnerEnquiries,
  getTenantEnquiries,
  getUnreadCount,
  markAsViewed
}

export default EnquiryController
