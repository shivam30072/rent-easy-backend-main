import { mongoose } from '../../helper/index.js'
import { RATING_EXCHANGE_STATUS } from './RatingExchange.Constant.js'

const ratingSubdocSchema = new mongoose.Schema(
  {
    stars: { type: Number, min: 1, max: 5 },
    comment: { type: String, maxlength: 1000, default: '' },
    submittedAt: { type: Date },
  },
  { _id: false }
)

const mongooseObject = {
  agreementId: { type: mongoose.Schema.Types.ObjectId, ref: 'RentalAgreement', required: true, unique: true },
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  windowOpenedAt: { type: Date, required: true },
  deadline: { type: Date, required: true, index: true },
  tenantRating: { type: ratingSubdocSchema, default: null },
  ownerRating: { type: ratingSubdocSchema, default: null },
  status: { type: String, enum: Object.values(RATING_EXCHANGE_STATUS), default: RATING_EXCHANGE_STATUS.PENDING, index: true },
  publishedAt: { type: Date, default: null },
}

const ratingExchangeSchema = new mongoose.Schema(mongooseObject, { timestamps: true })

ratingExchangeSchema.index({ deadline: 1, status: 1 })

const ratingExchangeModel = mongoose.model('RatingExchange', ratingExchangeSchema)

export { ratingExchangeSchema, ratingExchangeModel }
