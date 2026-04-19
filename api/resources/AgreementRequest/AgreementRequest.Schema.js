import { mongoose } from '../../helper/index.js'

const agreementRequestSchema = new mongoose.Schema({
  enquiryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Enquiry', required: true },
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
  roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: false },
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'declined'],
    default: 'pending'
  }
}, { timestamps: true })

agreementRequestSchema.index({ tenantId: 1, enquiryId: 1, createdAt: -1 })
agreementRequestSchema.index({ ownerId: 1, status: 1 })

agreementRequestSchema.set('toJSON', { virtuals: true })
agreementRequestSchema.set('toObject', { virtuals: true })

const agreementRequestModel = mongoose.model('AgreementRequest', agreementRequestSchema)

export { agreementRequestSchema, agreementRequestModel }