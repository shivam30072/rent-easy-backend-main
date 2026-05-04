import { swipeActionModel } from './SwipeAction.Schema.js'
import { partnerProfileModel } from '../PartnerProfile/PartnerProfile.Schema.js'
import { SUPER_LIKE_DAILY_LIMIT, UNDO_WINDOW_MS } from './SwipeAction.Constant.js'

const recordSwipe = async (swiperProfileId, targetProfileId, action) => {
  return await swipeActionModel.findOneAndUpdate(
    { swiper: swiperProfileId, target: targetProfileId },
    { $set: { action, createdAt: new Date() } },
    { upsert: true, new: true }
  )
}

const isMutualLike = async (swiperProfileId, targetProfileId) => {
  if (String(swiperProfileId) === String(targetProfileId)) return false
  const reverse = await swipeActionModel.findOne({
    swiper: targetProfileId,
    target: swiperProfileId,
    action: { $in: ['like', 'super_like'] },
  })
  return !!reverse
}

const getSwipedTargetIds = async (swiperProfileId) => {
  const rows = await swipeActionModel.find({ swiper: swiperProfileId }).select('target')
  return rows.map(r => r.target)
}

const undoLast = async (swiperProfileId) => {
  const last = await swipeActionModel.findOne({ swiper: swiperProfileId }).sort({ createdAt: -1 })
  if (!last) return null
  if (Date.now() - new Date(last.createdAt).getTime() > UNDO_WINDOW_MS) return 'expired'
  await swipeActionModel.deleteOne({ _id: last._id })
  return last
}

const superLikesToday = async (swiperProfileId) => {
  const start = new Date(); start.setHours(0,0,0,0)
  return await swipeActionModel.countDocuments({
    swiper: swiperProfileId, action: 'super_like', createdAt: { $gte: start }
  })
}

const SwipeActionModel = {
  recordSwipe, isMutualLike, getSwipedTargetIds, undoLast, superLikesToday,
  SUPER_LIKE_DAILY_LIMIT,
}

export default SwipeActionModel
