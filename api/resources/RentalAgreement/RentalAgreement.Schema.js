import { mongoose } from '../../helper/index.js'

const rentalAgreementSchema = new mongoose.Schema(
  {
    roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true, index: true },
    propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    agreementStartDate: { type: Date, required: true },
    agreementEndDate: { type: Date, required: true },
    rentAmount: { type: Number, required: true },
    securityDeposit: { type: Number, required: true },
    signedAgreementURL: { type: String, required: false },
    digitalSignatures: {
      userSignatureURL: { type: String, required: false },
      ownerSignatureURL: { type: String, required: false }
    },
    isActive: { type: Boolean, default: true, index: true },
    status: { type: String, enum: ['pending', 'active', 'terminated'], default: 'pending', index: true },
    paymentSchedule: {
      frequency: { type: String, enum: ['monthly','quarterly','annually'], default: 'monthly' },
      dueDay: { type: Number, min: 1, max: 31 },
      penaltyBufferDays: { type: Number, default: 5 },  // days after due date before penalty kicks in
      penaltyAmount: { type: Number, default: 0 }        // flat penalty amount in rupees
    },
    unsignedAgreementURL: { type: String, default: null },
    digioDocumentId: { type: String, default: null, index: true },
    digioStatus: {
      type: String,
      enum: ['not_initiated', 'in_progress', 'signed', 'expired', 'failed'],
      default: 'not_initiated'
    },
    meta: { type: Object, default: {} } // extra info (PDF generation data, etc.)
  },
  { timestamps: true }
)

rentalAgreementSchema.index({ roomId: 1, userId: 1 }, { unique: false }) // allow multiple agreements in history

rentalAgreementSchema.set('toJSON', { virtuals: true })
rentalAgreementSchema.set('toObject', { virtuals: true })

const rentalAgreementModel = mongoose.model('RentalAgreement', rentalAgreementSchema)

export { rentalAgreementSchema, rentalAgreementModel }
