import { mongoose } from '../../helper/index.js'

const messageSchema = new mongoose.Schema({
  conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'PartnerRequest', required: true },
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true, maxlength: 1000 },
  delivered: { type: Boolean, default: false },
}, { timestamps: true })

messageSchema.index({ conversationId: 1, createdAt: 1 })
messageSchema.index({ conversationId: 1, senderId: 1, delivered: 1 })

const messageModel = mongoose.model('Message', messageSchema)

export { messageSchema, messageModel }
