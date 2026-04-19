import { express, configureRouter } from '../../helper/index.js'
import NotificationController from './Notification.Controller.js'
import NotificationValidator from './Notification.Validator.js'

const {
  getNotificationsByUser,
  getUnreadCount,
  markAsRead,
  deleteNotification
} = NotificationController

const config = {
  preMiddlewares: [],
  postMiddlewares: [],
  routesConfig: {
    getNotificationsByUser: {
      method: 'post',
      path: '/list',
      enabled: true,
      prePipeline: [NotificationValidator.validateGetByUser],
      pipeline: [getNotificationsByUser]
    },
    getUnreadCount: {
      method: 'post',
      path: '/unreadCount',
      enabled: true,
      prePipeline: [NotificationValidator.validateGetByUser],
      pipeline: [getUnreadCount]
    },
    markAsRead: {
      method: 'put',
      path: '/markRead',
      enabled: true,
      prePipeline: [NotificationValidator.validateMarkRead],
      pipeline: [markAsRead]
    },
    deleteNotification: {
      method: 'delete',
      path: '/delete',
      enabled: true,
      prePipeline: [],
      pipeline: [deleteNotification]
    }
  }
}

const NotificationRouter = configureRouter(express.Router(), config)

export default NotificationRouter
