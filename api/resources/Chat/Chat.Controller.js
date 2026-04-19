import ChatModel from './Chat.Model.js'
import { CHAT_MESSAGES } from './Chat.Constant.js'

const getMessages = async (req, res) => {
  const { conversationId, page = 0, limit = 50 } = req.body
  const userId = req.user._id

  const match = await ChatModel.validateConversationAccess(conversationId, userId)
  if (!match) return res.error(403, CHAT_MESSAGES.NOT_AUTHORIZED)

  const data = await ChatModel.getMessagesService(conversationId, page, limit)
  return res.success(200, CHAT_MESSAGES.FETCHED, data)
}

const getUnreadCounts = async (req, res) => {
  const { conversationIds = [] } = req.body
  const userId = req.user._id

  const counts = await ChatModel.getUnreadCountsService(conversationIds, userId)
  return res.success(200, CHAT_MESSAGES.UNREAD_FETCHED, { counts })
}

const closeMatch = async (req, res) => {
  const { requestId } = req.body
  const userId = req.user._id

  const match = await ChatModel.validateConversationAccess(requestId, userId)
  if (!match) return res.error(404, CHAT_MESSAGES.MATCH_NOT_FOUND)

  match.status = 'closed'
  await match.save()

  await ChatModel.deleteConversationMessagesService(requestId)

  return res.success(200, CHAT_MESSAGES.MATCH_CLOSE_SUCCESS)
}

const ChatController = {
  getMessages,
  getUnreadCounts,
  closeMatch,
}

export default ChatController
