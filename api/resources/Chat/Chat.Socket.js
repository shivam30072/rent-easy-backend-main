import ChatModel from './Chat.Model.js'
import { sendPushNotification } from '../../helper/pushNotification.js'
import { NotificationModel } from '../Notification/Notification.Model.js'

const registerChatHandlers = (io, socket) => {
  const userId = socket.user._id
  const userName = socket.user.name

  // Join a conversation room
  socket.on('join_conversation', async ({ conversationId }) => {
    try {
      const match = await ChatModel.validateConversationAccess(conversationId, userId)
      if (!match) {
        socket.emit('error_message', { message: 'Not authorized for this conversation' })
        return
      }

      socket.join(`chat:${conversationId}`)

      // Mark messages from the other user as delivered
      await ChatModel.markDeliveredService(conversationId, userId)
      io.to(`chat:${conversationId}`).emit('messages_delivered', { conversationId })
    } catch (err) {
      console.error('join_conversation error:', err.message)
    }
  })

  // Leave a conversation room
  socket.on('leave_conversation', ({ conversationId }) => {
    socket.leave(`chat:${conversationId}`)
  })

  // Send a message
  socket.on('send_message', async ({ conversationId, text }) => {
    try {
      if (!text || !text.trim()) return
      if (text.length > 1000) return

      const match = await ChatModel.validateConversationAccess(conversationId, userId)
      if (!match) {
        socket.emit('error_message', { message: 'Not authorized' })
        return
      }

      const message = await ChatModel.createMessageService({
        conversationId,
        senderId: userId,
        text: text.trim(),
      })

      // Broadcast to room
      io.to(`chat:${conversationId}`).emit('new_message', {
        _id: message._id,
        conversationId: message.conversationId,
        senderId: message.senderId,
        text: message.text,
        delivered: message.delivered,
        createdAt: message.createdAt,
      })

      // Check if recipient is in the room — if not, send push notification
      const room = io.sockets.adapter.rooms.get(`chat:${conversationId}`)
      const recipientId = match.seekerId.toString() === userId
        ? match.ownerId.toString()
        : match.seekerId.toString()

      let recipientInRoom = false
      if (room) {
        for (const socketId of room) {
          const s = io.sockets.sockets.get(socketId)
          if (s && s.user._id === recipientId) {
            recipientInRoom = true
            break
          }
        }
      }

      if (!recipientInRoom) {
        const truncatedText = text.length > 100 ? text.substring(0, 100) + '...' : text
        sendPushNotification(
          recipientId,
          `${userName}`,
          truncatedText,
          { type: 'partner_chat_message', conversationId: conversationId.toString() }
        ).catch(err => console.error('Chat push notification failed:', err.message))

        NotificationModel.createNotification({
          userId: recipientId,
          type: 'partner_chat_message',
          message: `${userName}: ${truncatedText}`,
          meta: { conversationId },
        }).catch(err => console.error('Chat notification creation failed:', err.message))
      }
    } catch (err) {
      console.error('send_message error:', err.message)
    }
  })

  // Mark messages as delivered
  socket.on('mark_delivered', async ({ conversationId }) => {
    try {
      await ChatModel.markDeliveredService(conversationId, userId)
      io.to(`chat:${conversationId}`).emit('messages_delivered', { conversationId })
    } catch (err) {
      console.error('mark_delivered error:', err.message)
    }
  })
}

export { registerChatHandlers }
