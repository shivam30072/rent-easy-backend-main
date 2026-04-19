import { mongoose } from '../../helper/index.js'

const partnerRequestSchema = new mongoose.Schema({
  listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'PartnerListing', required: true },
  seekerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  note: { type: String, required: true, maxlength: 500 },

  status: { type: String, enum: ['pending', 'accepted', 'rejected', 'closed'], default: 'pending' },

  seekerContactShared: { type: Boolean, default: false },
  ownerContactShared: { type: Boolean, default: false },
}, { timestamps: true })

partnerRequestSchema.index({ listingId: 1, seekerId: 1 }, { unique: true })
partnerRequestSchema.index({ seekerId: 1 })
partnerRequestSchema.index({ ownerId: 1 })
partnerRequestSchema.index({ status: 1 })

partnerRequestSchema.set('toJSON', { virtuals: true })
partnerRequestSchema.set('toObject', { virtuals: true })

const partnerRequestModel = mongoose.model('PartnerRequest', partnerRequestSchema)

export { partnerRequestSchema, partnerRequestModel }
