import { mongoose } from '../../helper/index.js'

const enquirySchema = new mongoose.Schema({
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
  roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: false },
  enquiredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  tenantName: { type: String, required: true },
  tenantPhone: { type: String, required: true },
  propertyName: { type: String, required: true },
  status: { type: String, enum: ['new', 'viewed'], default: 'new' }
}, { timestamps: true })

enquirySchema.index({ ownerId: 1, status: 1, createdAt: -1 })
enquirySchema.index({ enquiredBy: 1, createdAt: -1 })

const enquiryModel = mongoose.model('Enquiry', enquirySchema)

export { enquirySchema, enquiryModel }
