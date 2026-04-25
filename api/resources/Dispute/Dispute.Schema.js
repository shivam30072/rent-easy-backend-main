import { mongoose } from '../../helper/index.js'
import { DISPUTE_STATUS } from './Dispute.Constant.js'

const mongooseObject = {
  signalId: { type: mongoose.Schema.Types.ObjectId, ref: 'ReputationSignal', required: true, index: true },
  raisedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  reason: { type: String, required: true, maxlength: 1000 },
  status: { type: String, enum: Object.values(DISPUTE_STATUS), default: DISPUTE_STATUS.OPEN, index: true },
  adminNote: { type: String, default: null },
  resolvedAt: { type: Date, default: null },
}

const disputeSchema = new mongoose.Schema(mongooseObject, { timestamps: true })

disputeSchema.index({ status: 1, createdAt: -1 })
disputeSchema.index({ signalId: 1, raisedByUserId: 1 }, { unique: true })

const disputeModel = mongoose.model('Dispute', disputeSchema)

export { disputeSchema, disputeModel }
