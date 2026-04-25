import RatingModel from './Rating.Model.js'
import { RATING_MESSAGES as MSG } from './Rating.Constant.js'

const createRating = async (req, res) => {
  try {
    const { roomId, rating, review } = req.body || {}
    if (!roomId) return res.status(400).json({ success: false, error: 'roomId is required' })
    const ratingNum = Number(rating)
    if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return res.status(400).json({ success: false, error: 'rating must be an integer between 1 and 5' })
    }
    const created = await RatingModel.createRating(req.user._id, { roomId, rating: ratingNum, review })
    return res.success(201, MSG.CREATED, created)
  } catch (err) {
    res.status(400).json({ success: false, error: err.message })
  }
}

const getRatings = async (req, res) => {
  try {
    const filters = req.query
    const options = {
      sortBy: req.query.sortBy,
      sortOrder: req.query.sortOrder,
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 10
    }
    const result = await RatingModel.getRatings(filters, options)
    return res.success(200, MSG.GET_RATINGS, result)
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
}

const getRatingById = async (req, res) => {
  try {
    const rating = await RatingModel.getRatingById(req.params.id)
    if (!rating) return res.status(404).json({ success: false, error: MSG.NOT_FOUND })
    return res.success(200, MSG.GET_RATING, rating)
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
}

const updateRating = async (req, res) => {
  try {
    const updated = await RatingModel.updateRating(req.params.id, req.user._id, req.body)
    return res.success(200, MSG.UPDATED, updated)
  } catch (err) {
    res.status(400).json({ success: false, error: err.message })
  }
}

const deleteRating = async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin'
    await RatingModel.deleteRating(req.params.id, req.user._id, isAdmin)
    return res.success(200, MSG.DELETED, {})
  } catch (err) {
    res.status(400).json({ success: false, error: err.message })
  }
}

const getRoomAverage = async (req, res) => {
  try {
    const avg = await RatingModel.getRoomAverage(req.params.roomId)
    return res.success(200, MSG.ROOM_AVERAGE, avg)
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
}

const getPropertyAverage = async (req, res) => {
  try {
    const avg = await RatingModel.getPropertyAverage(req.params.propertyId)
    return res.success(200, MSG.PROPERTY_AVERAGE, avg)
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
}

const RatingController = {
  createRating,
  getRatings,
  getRatingById,
  updateRating,
  deleteRating,
  getRoomAverage,
  getPropertyAverage
}

export default RatingController
