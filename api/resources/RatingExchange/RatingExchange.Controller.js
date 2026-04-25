import RatingExchangeModel from './RatingExchange.Model.js'
import { RATING_EXCHANGE_MESSAGES } from './RatingExchange.Constant.js'

const submit = async (req, res) => {
  const { exchangeId, stars, comment } = req.body
  const userId = req.user?._id || req.user?.id
  const exchange = await RatingExchangeModel.submitRatingService({ exchangeId, userId, stars, comment })
  return res.success(200, RATING_EXCHANGE_MESSAGES.SUBMITTED, exchange)
}

const getPending = async (req, res) => {
  const userId = req.user?._id || req.user?.id
  const data = await RatingExchangeModel.getPendingForUserService(userId)
  return res.success(200, RATING_EXCHANGE_MESSAGES.PENDING_FETCHED, data)
}

const getPublishedForUser = async (req, res) => {
  const { userId } = req.body
  if (!userId) return res.error(400, 'userId is required')
  const data = await RatingExchangeModel.getPublishedForUserService(userId)
  return res.success(200, RATING_EXCHANGE_MESSAGES.PUBLISHED_FETCHED, data)
}

const RatingExchangeController = { submit, getPending, getPublishedForUser }

export default RatingExchangeController
