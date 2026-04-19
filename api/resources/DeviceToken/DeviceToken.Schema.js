import { mongoose } from '../../helper/index.js'

const deviceTokenSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  token: { type: String, required: true },
  platform: { type: String, enum: ['android', 'ios'], required: true }
}, { timestamps: true })

deviceTokenSchema.index({ userId: 1 })
deviceTokenSchema.index({ token: 1, userId: 1 }, { unique: true })

const deviceTokenModel = mongoose.model('DeviceToken', deviceTokenSchema)

export { deviceTokenSchema, deviceTokenModel }
