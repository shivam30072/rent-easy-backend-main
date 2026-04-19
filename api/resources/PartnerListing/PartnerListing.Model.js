import { partnerListingModel } from './PartnerListing.Schema.js'

const createListingService = async (data) => {
  return await partnerListingModel.create(data)
}

const updateListingService = async (listingId, userId, updates) => {
  return await partnerListingModel.findOneAndUpdate(
    { _id: listingId, createdBy: userId },
    { $set: updates },
    { new: true }
  )
}

const getListingByIdService = async (listingId) => {
  return await partnerListingModel
    .findById(listingId)
    .populate('createdBy', 'name phone profileUrl')
}

const listListingsService = async (filters = {}, page = 0, limit = 10, excludeUserId = null) => {
  const query = { status: 'active' }
  if (excludeUserId) query.createdBy = { $ne: excludeUserId }

  if (filters.city) query.city = { $regex: filters.city, $options: 'i' }
  if (filters.locality) query.locality = { $regex: filters.locality, $options: 'i' }
  if (filters.roomType) query.roomType = filters.roomType
  if (filters.gender) query['preferences.gender'] = { $in: [filters.gender, 'any'] }
  if (filters.profession) query['preferences.profession'] = { $in: [filters.profession, 'any'] }
  if (filters.minRent || filters.maxRent) {
    query.rentAmount = {}
    if (filters.minRent) query.rentAmount.$gte = filters.minRent
    if (filters.maxRent) query.rentAmount.$lte = filters.maxRent
  }
  if (filters.amenities && filters.amenities.length) {
    query.amenities = { $all: filters.amenities }
  }

  const skip = page * limit
  const listings = await partnerListingModel
    .find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('createdBy', 'name profileUrl')

  const total = await partnerListingModel.countDocuments(query)
  return { listings, total, page, limit }
}

const getMyListingsService = async (userId, page = 0, limit = 10) => {
  const skip = page * limit
  const listings = await partnerListingModel
    .find({ createdBy: userId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)

  const total = await partnerListingModel.countDocuments({ createdBy: userId })
  return { listings, total, page, limit }
}

const closeListingService = async (listingId, userId) => {
  return await partnerListingModel.findOneAndUpdate(
    { _id: listingId, createdBy: userId, status: 'active' },
    { $set: { status: 'closed' } },
    { new: true }
  )
}

const PartnerListingModel = {
  createListingService,
  updateListingService,
  getListingByIdService,
  listListingsService,
  getMyListingsService,
  closeListingService,
}

export default PartnerListingModel
