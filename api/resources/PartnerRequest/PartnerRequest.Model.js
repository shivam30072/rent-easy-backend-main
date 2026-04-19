import { partnerRequestModel } from './PartnerRequest.Schema.js'

const sendRequestService = async ({ listingId, seekerId, ownerId, note }) => {
  return await partnerRequestModel.create({ listingId, seekerId, ownerId, note })
}

const respondToRequestService = async (requestId, ownerId, status) => {
  return await partnerRequestModel.findOneAndUpdate(
    { _id: requestId, ownerId, status: 'pending' },
    { $set: { status } },
    { new: true }
  )
}

const getMyRequestsService = async (seekerId, page = 0, limit = 10) => {
  const skip = page * limit
  const requests = await partnerRequestModel
    .find({ seekerId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('listingId', 'roomType rentAmount city locality images status')
    .populate('ownerId', 'name phone profileUrl')

  const total = await partnerRequestModel.countDocuments({ seekerId })
  return { requests, total, page, limit }
}

const getIncomingRequestsService = async (ownerId, listingId, page = 0, limit = 10) => {
  const query = { ownerId }
  if (listingId) query.listingId = listingId
  const skip = page * limit

  const requests = await partnerRequestModel
    .find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('seekerId', 'name phone profileUrl')
    .populate('listingId', 'roomType rentAmount city locality')

  const total = await partnerRequestModel.countDocuments(query)
  return { requests, total, page, limit }
}

const getMatchesService = async (userId, page = 0, limit = 10, role = null) => {
  const query = { status: 'accepted' }
  if (role === 'owner') {
    query.ownerId = userId
  } else if (role === 'seeker') {
    query.seekerId = userId
  } else {
    query.$or = [{ seekerId: userId }, { ownerId: userId }]
  }

  const skip = page * limit
  const requests = await partnerRequestModel
    .find(query)
    .sort({ updatedAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('seekerId', 'name phone profileUrl')
    .populate('ownerId', 'name phone profileUrl')
    .populate('listingId', 'roomType rentAmount city locality images')

  const total = await partnerRequestModel.countDocuments(query)
  return { matches: requests, total, page, limit }
}

const shareContactService = async (requestId, userId) => {
  const request = await partnerRequestModel.findById(requestId)
  if (!request) return null
  if (request.status !== 'accepted') return { notMatched: true }

  const update = {}
  if (request.seekerId.toString() === userId.toString()) {
    update.seekerContactShared = true
  } else if (request.ownerId.toString() === userId.toString()) {
    update.ownerContactShared = true
  } else {
    return null
  }

  return await partnerRequestModel.findByIdAndUpdate(requestId, { $set: update }, { new: true })
}

const getRequestCountsForListingService = async (listingId) => {
  const pending = await partnerRequestModel.countDocuments({ listingId, status: 'pending' })
  const accepted = await partnerRequestModel.countDocuments({ listingId, status: 'accepted' })
  return { pending, accepted }
}

const checkDuplicateRequestService = async (listingId, seekerId) => {
  return await partnerRequestModel.findOne({ listingId, seekerId })
}

const getLastRequestBySeeker = async (seekerId) => {
  return await partnerRequestModel
    .findOne({ seekerId })
    .sort({ createdAt: -1 })
    .lean()
}

const PartnerRequestModel = {
  sendRequestService,
  respondToRequestService,
  getMyRequestsService,
  getIncomingRequestsService,
  getMatchesService,
  shareContactService,
  getRequestCountsForListingService,
  checkDuplicateRequestService,
  getLastRequestBySeeker,
}

export default PartnerRequestModel
