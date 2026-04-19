import PartnerListingModel from './PartnerListing.Model.js'
import { PARTNER_LISTING_MESSAGES } from './PartnerListing.Constant.js'
import { uploadBase64File } from '../../helper/s3.js'

const createListing = async (req, res) => {
  const data = { ...req.body, createdBy: req.user._id }
  const listing = await PartnerListingModel.createListingService(data)
  return res.success(201, PARTNER_LISTING_MESSAGES.CREATED, listing)
}

const updateListing = async (req, res) => {
  const { listingId, ...updates } = req.body
  const listing = await PartnerListingModel.updateListingService(listingId, req.user._id, updates)
  if (!listing) return res.error(404, PARTNER_LISTING_MESSAGES.NOT_FOUND)
  return res.success(200, PARTNER_LISTING_MESSAGES.UPDATED, listing)
}

const getListingById = async (req, res) => {
  const { listingId } = req.body
  const listing = await PartnerListingModel.getListingByIdService(listingId)
  if (!listing) return res.error(404, PARTNER_LISTING_MESSAGES.NOT_FOUND)
  return res.success(200, PARTNER_LISTING_MESSAGES.FETCHED, listing)
}

const listListings = async (req, res) => {
  const { page = 0, limit = 10, filters = {} } = req.body
  const data = await PartnerListingModel.listListingsService(filters, page, limit, req.user._id)
  return res.success(200, PARTNER_LISTING_MESSAGES.FETCHED, data)
}

const getMyListings = async (req, res) => {
  const { page = 0, limit = 10 } = req.body
  const data = await PartnerListingModel.getMyListingsService(req.user._id, page, limit)
  return res.success(200, PARTNER_LISTING_MESSAGES.FETCHED, data)
}

const closeListing = async (req, res) => {
  const { listingId } = req.body
  const listing = await PartnerListingModel.closeListingService(listingId, req.user._id)
  if (!listing) return res.error(404, PARTNER_LISTING_MESSAGES.NOT_FOUND)
  return res.success(200, PARTNER_LISTING_MESSAGES.CLOSED, listing)
}

const uploadImage = async (req, res) => {
  try {
    const { base64, fileName, mimetype } = req.body
    if (!base64) return res.error(400, 'base64 image data is required.')
    const prefix = `partner-listings/${req.user._id}`
    const { url } = await uploadBase64File(base64, fileName || 'image.jpg', mimetype || 'image/jpeg', prefix)
    return res.success(201, 'Image uploaded successfully.', { url })
  } catch (err) {
    console.error('Partner listing image upload error:', err.message)
    return res.error(500, 'Failed to upload image.', err.message)
  }
}

const PartnerListingController = {
  createListing,
  updateListing,
  getListingById,
  listListings,
  getMyListings,
  closeListing,
  uploadImage,
}

export default PartnerListingController
