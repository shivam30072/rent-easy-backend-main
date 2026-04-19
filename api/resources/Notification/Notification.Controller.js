import { NotificationModel } from './Notification.Model.js'
import { NOTIFICATION_MESSAGES as MSG } from './Notification.Constant.js'

const getNotificationsByUser = async (req, res) => {
  try {
    const { userId, page, limit, isRead } = req.body
    const notifications = await NotificationModel.getNotificationsByUser(userId, { page, limit, isRead })
    return res.success(200, MSG.FETCHED, notifications)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

const getUnreadCount = async (req, res) => {
  try {
    const { userId } = req.body
    const count = await NotificationModel.getUnreadCount(userId)
    return res.success(200, MSG.UNREAD_COUNT, count)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

const markAsRead = async (req, res) => {
  try {
    const { userId, notificationIds } = req.body
    const result = await NotificationModel.markAsRead(userId, notificationIds || [])
    return res.success(200, MSG.MARKED_READ, result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

const deleteNotification = async (req, res) => {
  try {
    const { notificationId } = req.body
    const deleted = await NotificationModel.deleteNotificationById(notificationId)
    if (!deleted) return res.status(404).json({ message: MSG.DELETED })
    return res.success(200, MSG.DELETED, deleted)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

const NotificationController = {
  getNotificationsByUser,
  getUnreadCount,
  markAsRead,
  deleteNotification
}
export default NotificationController
