import { notificationModel } from './Notification.Schema.js'
import { convertToObjectId } from '../../helper/index.js'
import { roomModel } from '../Room/Room.Schema.js'
import { propertyModel } from '../Property/Property.Schema.js'

const createNotification = async (data) => {
  return await notificationModel.create(data)
}

const getNotificationsByUser = async (userId, options = {}) => {
  const q = { userId: convertToObjectId(userId) }
  if (options.isRead !== undefined) q.isRead = options.isRead
  const page = options.page > 0 ? parseInt(options.page) : 0
  const limit = options.limit > 0 ? parseInt(options.limit) : 0
  const cursor = notificationModel.find(q).sort({ triggeredAt: -1 }).lean()
  if (limit) cursor.skip(page * limit).limit(limit)
  return await cursor
}

const getUnreadCount = async (userId) => {
  return await notificationModel.countDocuments({ userId: convertToObjectId(userId), isRead: false })
}

const markAsRead = async (userId, notificationIds = []) => {
  if (notificationIds.length) {
    const ids = notificationIds.map(convertToObjectId)
    return await notificationModel.updateMany({ _id: { $in: ids }, userId: convertToObjectId(userId) }, { $set: { isRead: true } })
  }
  // mark all for a user
  return await notificationModel.updateMany({ userId: convertToObjectId(userId), isRead: false }, { $set: { isRead: true } })
}

const deleteNotificationById = async (id) => {
  return await notificationModel.findByIdAndDelete(convertToObjectId(id))
}

/* Helper: Create rent reminder from a room document */
const createRentReminderForRoom = async (roomId, daysBefore = 3) => {
  const room = await roomModel.findById(convertToObjectId(roomId)).lean()
  if (!room) throw new Error('Room not found')

  // if room has rentDueDay, compute next due date and trigger notification if within window
  if (!room.rentDueDay) return null

  // create a message and attach to owner (property owner) or tenant depending on your logic
  // Here we attach to property owner (owner may be room owner)
  const property = await propertyModel.findById(convertToObjectId(room.propertyId)).lean()
  if (!property) return null

  const ownerId = property.ownerId

  const message = `Rent reminder for ${room.roomType} (room ${room.roomNumber || ''}). Rent ₹${room.rent} due on day ${room.rentDueDay} of each month.`
  return await createNotification({
    userId: ownerId,
    type: 'rent_reminder',
    message,
    meta: { roomId: room._id, propertyId: property._id },
    triggeredAt: new Date()
  })
}

/* Helper: Create agreement expiry notification */
const createAgreementExpiryForRoom = async (roomId, expiryDate) => {
  const room = await roomModel.findById(convertToObjectId(roomId)).lean()
  if (!room) throw new Error('Room not found')
  const property = await property_model.findById(convertToObjectId(room.propertyId)).lean() // if you keep property_model imported
  const ownerId = property?.ownerId || null
  if (!ownerId) return null

  const message = `Agreement for room ${room.roomNumber || ''} expires on ${expiryDate.toISOString().slice(0,10)}`
  return await createNotification({
    userId: ownerId,
    type: 'agreement_expiry',
    message,
    meta: { roomId: room._id, expiryDate },
    triggeredAt: new Date()
  })
}

export const NotificationModel = {
  createNotification,
  getNotificationsByUser,
  getUnreadCount,
  markAsRead,
  deleteNotificationById,
  createRentReminderForRoom,
  createAgreementExpiryForRoom
}
