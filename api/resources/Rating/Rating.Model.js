import { ratingModel } from './Rating.Schema.js'
import { roomModel } from '../Room/Room.Schema.js'

const createRating = async (userId, { roomId, rating, review }) => {
  const room = await roomModel.findOne({
    _id: roomId,
    'rentalHistory.tenantId': userId
  })

  if (!room) {
    throw new Error('You have not stayed in this room.')
  }

  const exists = await ratingModel.findOne({ roomId, userId })
  if (exists) {
    throw new Error('You have already rated this room.')
  }

  const newRating = await ratingModel.create({
    userId,
    roomId,
    propertyId: room.propertyId,
    rating,
    review
  })

  return newRating
}

const getRatings = async (filters, options) => {
  let query = {}

  if (filters.roomId) query.roomId = filters.roomId
  if (filters.propertyId) query.propertyId = filters.propertyId
  if (filters.userId) query.userId = filters.userId
  if (filters.minRating) query.rating = { ...query.rating, $gte: +filters.minRating }
  if (filters.maxRating) query.rating = { ...query.rating, $lte: +filters.maxRating }
  if (filters.startDate || filters.endDate) {
    query.createdAt = {}
    if (filters.startDate) query.createdAt.$gte = new Date(filters.startDate)
    if (filters.endDate) query.createdAt.$lte = new Date(filters.endDate)
  }

  const sortField = options.sortBy || 'createdAt'
  const sortOrder = options.sortOrder === 'asc' ? 1 : -1

  const ratings = await ratingModel
    .find(query)
    .populate('userId', 'name profileUrl')
    .populate('roomId', 'roomNumber roomType')
    .populate('propertyId', 'name')
    .sort({ [sortField]: sortOrder })
    .skip((options.page - 1) * options.limit)
    .limit(options.limit)

  const total = await ratingModel.countDocuments(query)

  return { ratings, total }
}

const getRatingById = async (id) => {
  return ratingModel.findById(id)
    .populate('userId', 'name profileUrl')
    .populate('roomId', 'roomNumber roomType')
    .populate('propertyId', 'name')
}

const updateRating = async (id, userId, updateData) => {
  const rating = await ratingModel.findOne({ _id: id, userId })
  if (!rating) throw new Error('Rating not found or unauthorized.')

  Object.assign(rating, updateData)
  await rating.save()
  return rating
}

const deleteRating = async (id, userId, isAdmin) => {
  const query = isAdmin ? { _id: id } : { _id: id, userId }
  const deleted = await ratingModel.findOneAndDelete(query)
  if (!deleted) throw new Error('Rating not found or unauthorized.')
  return deleted
}

const getRoomAverage = async (roomId) => {
  const result = await ratingModel.aggregate([
    { $match: { roomId: roomModel.Types.ObjectId(roomId) } },
    { $group: { _id: '$roomId', average: { $avg: '$rating' }, count: { $sum: 1 } } }
  ])
  return result[0] || { average: 0, count: 0 }
}

const getPropertyAverage = async (propertyId) => {
  const result = await ratingModel.aggregate([
    { $match: { propertyId: roomModel.Types.ObjectId(propertyId) } },
    { $group: { _id: '$propertyId', average: { $avg: '$rating' }, count: { $sum: 1 } } }
  ])
  return result[0] || { average: 0, count: 0 }
}

const RatingModel = {
    createRating,
    getRatings,
    getRatingById,
    updateRating,
    deleteRating,
    getRoomAverage,
    getPropertyAverage
}

export default RatingModel