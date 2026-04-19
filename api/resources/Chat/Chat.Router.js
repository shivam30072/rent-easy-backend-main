import { express, configureRouter } from '../../helper/index.js'
import ChatController from './Chat.Controller.js'
import { authMiddleware } from '../../middleware/authMiddleware.js'

const { getMessages, getUnreadCounts, closeMatch } = ChatController

const config = {
  preMiddlewares: [authMiddleware],
  postMiddlewares: [],
  routesConfig: {
    getMessages: {
      method: 'post',
      path: '/messages',
      enabled: true,
      prePipeline: [],
      pipeline: [getMessages],
    },
    getUnreadCounts: {
      method: 'post',
      path: '/unread-count',
      enabled: true,
      prePipeline: [],
      pipeline: [getUnreadCounts],
    },
    closeMatch: {
      method: 'post',
      path: '/close-match',
      enabled: true,
      prePipeline: [],
      pipeline: [closeMatch],
    },
  },
}

const ChatRouter = configureRouter(express.Router(), config)

export default ChatRouter
