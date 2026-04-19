import { roomModel } from '../resources/Room/Room.Schema.js'
import { mongoose } from '../helper/index.js'
import { propertyModel } from '../resources/Property/Property.Schema.js'

const recomputePropertyStats = async function (propertyId) {
  const Room = mongoose.model('Room')

  const stats = await Room.aggregate([
    { $match: { propertyId: new mongoose.Types.ObjectId(propertyId) } },
    {
      $group: {
        _id: null,
        minRent: { $min: "$rent" },
        maxRent: { $max: "$rent" },
        avgRating: { $avg: "$rating" }
      }
    }
  ])

  console.log("Stats:: ", stats)

  if (stats.length > 0) {
    await propertyModel.findByIdAndUpdate(propertyId, {
      minAmount: stats[0].minRent,
      maxAmount: stats[0].maxRent,
      rating: stats[0].avgRating || 0
    })
  } else {
    await propertyModel.findByIdAndUpdate(propertyId, {
      minAmount: null,
      maxAmount: null,
      rating: 0
    })
  }
}

export const updatingPropertyStats = async (req, res, next) => {
  try {
    let propertyId = null

    // If propertyId is in body
    if (req.body?.propertyId) {
      propertyId = req.body.propertyId
    }
    // If propertyId in params (e.g., /room/:id) -> fetch from DB
    else if (req.params?.id) {
      const room = await roomModel.findById(req.params.id).select('propertyId').lean()
      if (room) {
        propertyId = room.propertyId
      }
    }

    if (propertyId) {
      await recomputePropertyStats(propertyId)
    }

    next()
  } catch (error) {
    console.error('Error updating property stats:', error)
    next(error)
  }
}
