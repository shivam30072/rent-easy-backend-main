import { mongoose } from '../../helper/index.js'

const mongooseObject = {
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  docType: { type: String, enum: ['aadhaar', 'pan', 'agreement', 'photo', 'sign'], required: true },
  url: { type: String, required: true },
  isVerified: { type: Boolean, default: false },
    uniqueNumber: { // Aadhaar Number, PAN Number, etc.
    type: String,
    required: false,
    unique: true,
    trim: true
  },
  uploadedAt: { type: Date, default: Date.now }
}

const mongooseOptions = { timestamps: true }

const documentSchema = new mongoose.Schema(mongooseObject, mongooseOptions)

documentSchema.index({ docType: 1, uniqueNumber: 1 }, { unique: true })

documentSchema.set('toJSON', { virtuals: true })
documentSchema.set('toObject', { virtuals: true })

const documentModel = mongoose.model('Document', documentSchema)

export { documentSchema, documentModel }
