import { mongoose } from '../../helper/index.js'
import { ROLES } from '../ReputationSignal/ReputationSignal.Constant.js'
import { TIERS, BASE_SCORE, COMPUTE_REASONS } from './ReputationScore.Constant.js'

const mongooseObject = {
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  role: { type: String, enum: Object.values(ROLES), required: true },
  score: { type: Number, default: BASE_SCORE },
  tier: { type: String, enum: Object.values(TIERS), default: TIERS.FAIR },
  completedRentalsCount: { type: Number, default: 0 },
  signalCounts: { type: Map, of: Number, default: () => new Map() },
  lastComputedAt: { type: Date, default: Date.now },
  computeReason: { type: String, enum: Object.values(COMPUTE_REASONS), default: COMPUTE_REASONS.BACKFILL },
}

const reputationScoreSchema = new mongoose.Schema(mongooseObject, { timestamps: true })

reputationScoreSchema.index({ userId: 1, role: 1 }, { unique: true })

reputationScoreSchema.set('toJSON', { virtuals: true })
reputationScoreSchema.set('toObject', { virtuals: true })

const reputationScoreModel = mongoose.model('ReputationScore', reputationScoreSchema)

export { reputationScoreSchema, reputationScoreModel }
