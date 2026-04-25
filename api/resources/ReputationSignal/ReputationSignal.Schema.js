import { mongoose } from '../../helper/index.js'
import { SIGNAL_TYPES, SIGNAL_STATUS, ROLES } from './ReputationSignal.Constant.js'

const sourceRefSchema = new mongoose.Schema(
  {
    collection: { type: String, required: true },
    id: { type: mongoose.Schema.Types.ObjectId, required: true },
  },
  { _id: false }
)

const mongooseObject = {
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  role: { type: String, enum: Object.values(ROLES), required: true },
  signalType: { type: String, enum: Object.values(SIGNAL_TYPES), required: true },
  rawValue: { type: mongoose.Schema.Types.Mixed, default: null },
  weightedValue: { type: Number, required: true },
  sourceRef: { type: sourceRefSchema, default: null },
  occurredAt: { type: Date, required: true },
  status: { type: String, enum: Object.values(SIGNAL_STATUS), default: SIGNAL_STATUS.ACTIVE, index: true },
}

const reputationSignalSchema = new mongoose.Schema(mongooseObject, { timestamps: true })

reputationSignalSchema.index({ userId: 1, role: 1, occurredAt: -1 })
reputationSignalSchema.index({ status: 1, occurredAt: -1 })

const reputationSignalModel = mongoose.model('ReputationSignal', reputationSignalSchema)

export { reputationSignalSchema, reputationSignalModel }
