import { mongoose } from '../../helper/index.js'

const matchScoreSchema = new mongoose.Schema({
  profileA: { type: mongoose.Schema.Types.ObjectId, ref: 'PartnerProfile', required: true, index: true },
  profileB: { type: mongoose.Schema.Types.ObjectId, ref: 'PartnerProfile', required: true, index: true },
  scoreAtoB: { type: Number, required: true, min: 0, max: 100 },
  scoreBtoA: { type: Number, required: true, min: 0, max: 100 },
  hardGatesPassed: { type: Boolean, required: true },
  breakdownAtoB: { type: Object, default: {} },
  breakdownBtoA: { type: Object, default: {} },
  whyYouMatch: { type: [String], default: [] },
  conflictReasons: { type: [String], default: [] },
  distanceKm: { type: Number },
  computedAt: { type: Date, default: Date.now },
}, { timestamps: true })

matchScoreSchema.index({ profileA: 1, profileB: 1 }, { unique: true })
matchScoreSchema.index({ profileA: 1, scoreAtoB: -1 })
matchScoreSchema.index({ computedAt: -1 })

const matchScoreModel = mongoose.model('MatchScore', matchScoreSchema)

export { matchScoreSchema, matchScoreModel }
