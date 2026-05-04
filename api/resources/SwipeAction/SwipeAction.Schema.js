import { mongoose } from '../../helper/index.js'
import { SWIPE_ACTIONS } from './SwipeAction.Constant.js'

const swipeActionSchema = new mongoose.Schema({
  swiper: { type: mongoose.Schema.Types.ObjectId, ref: 'PartnerProfile', required: true, index: true },
  target: { type: mongoose.Schema.Types.ObjectId, ref: 'PartnerProfile', required: true, index: true },
  action: { type: String, enum: SWIPE_ACTIONS, required: true },
  createdAt: { type: Date, default: Date.now },
})

swipeActionSchema.index({ swiper: 1, target: 1 }, { unique: true })
swipeActionSchema.index({ swiper: 1, createdAt: -1 })

const swipeActionModel = mongoose.model('SwipeAction', swipeActionSchema)
export { swipeActionSchema, swipeActionModel }
