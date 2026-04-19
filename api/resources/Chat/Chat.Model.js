import { messageModel } from './Chat.Schema.js'
import { partnerRequestModel } from '../PartnerRequest/PartnerRequest.Schema.js'

const createMessageService = async ({ conversationId, senderId, text }) => {
  return await messageModel.create({ conversationId, senderId, text })
}

const getMessagesService = async (conversationId, page = 0, limit = 50) => {
  const skip = page * limit
  const messages = await messageModel
    .find({ conversationId })
    .sort({ createdAt: 1 })
    .skip(skip)
    .limit(limit)
    .lean()

  const total = await messageModel.countDocuments({ conversationId })
  return { messages, total, page, limit }
}

const markDeliveredService = async (conversationId, recipientId) => {
  return await messageModel.updateMany(
    { conversationId, senderId: { $ne: recipientId }, delivered: false },
    { $set: { delivered: true } }
  )
}

const getUnreadCountsService = async (conversationIds, userId) => {
  const counts = {}
  for (const cid of conversationIds) {
    counts[cid] = await messageModel.countDocuments({
      conversationId: cid,
      senderId: { $ne: userId },
      delivered: false,
    })
  }
  return counts
}

const deleteConversationMessagesService = async (conversationId) => {
  return await messageModel.deleteMany({ conversationId })
}

const validateConversationAccess = async (conversationId, userId) => {
  const match = await partnerRequestModel.findOne({
    _id: conversationId,
    status: 'accepted',
    $or: [{ seekerId: userId }, { ownerId: userId }],
  })
  return match
}

const ChatModel = {
  createMessageService,
  getMessagesService,
  markDeliveredService,
  getUnreadCountsService,
  deleteConversationMessagesService,
  validateConversationAccess,
}

export default ChatModel
