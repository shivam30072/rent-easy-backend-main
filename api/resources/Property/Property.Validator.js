import { PROPERTY_MESSAGES as MSG } from './Property.Constant.js'

const ENABLE_VALIDATION = process.env.ENABLE_VALIDATION !== 'false' // default ON

export const validateCreateProperty = (req, res, next) => {
  if (!ENABLE_VALIDATION) return next()
  const {
    ownerId, propertyName, propertyType, uniquePropertyCode,
    addressId, addressSnapshot, minAmount, maxAmount,
  } = req.body || {}

  if (!ownerId) return res.status(400).json({ message: 'ownerId is required' })
  if (!addressId) return res.status(400).json({ message: 'addressId is required' })
  if (!propertyName) return res.status(400).json({ message: 'propertyName is required' })
  if (!propertyType) return res.status(400).json({ message: 'propertyType is required' })

  // Either uniquePropertyCode, or addressSnapshot (to generate one)
  if (!uniquePropertyCode && !addressSnapshot) {
    return res.status(400).json({ message: 'Provide uniquePropertyCode or addressSnapshot to generate one' })
  }

  if (minAmount != null && maxAmount != null && Number(minAmount) > Number(maxAmount)) {
    return res.status(400).json({ message: 'minAmount cannot be greater than maxAmount' })
  }

  return next()
}

export const validateUpdateProperty = (req, res, next) => {
  if (!ENABLE_VALIDATION) return next()
  if (!req.body.propertyId) return res.status(400).json({ message: 'propertyId is required' })
  if (!req.body.propertyData) return res.status(400).json({ message: 'propertyData is required' })
  return next()
}

export const validateGetPropertyById = (req, res, next) => {
  if (!ENABLE_VALIDATION) return next()
  if (!req.body.propertyId) return res.status(400).json({ message: 'propertyId is required' })
  return next()
}

export const validateList = (req, res, next) => {
  if (!ENABLE_VALIDATION) return next()
  // Accepts: { query, page, limit, sortBy, sortDir }
  return next()
}

export const validateGeoNearby = (req, res, next) => {
  if (!ENABLE_VALIDATION) return next()
  const { lng, lat, maxDistanceMeters } = req.body || {}
  if (lng == null || lat == null || !maxDistanceMeters) {
    return res.status(400).json({ message: 'lng, lat and maxDistanceMeters are required' })
  }
  return next()
}

export const validateCode = (req, res, next) => {
  if (!ENABLE_VALIDATION) return next()
  if (!req.body.uniquePropertyCode && !req.params.code) {
    return res.status(400).json({ message: 'uniquePropertyCode is required' })
  }
  return next()
}

export const validateSimilarById = (req, res, next) => {
  if (!req.body?.propertyId) return res.status(400).json({ message: 'propertyId is required' })
  return next()
}

export const validateOwnerScopedList = (req, res, next) => {
  if (!ENABLE_VALIDATION) return next()
  if (!req.body?.ownerId) return res.status(400).json({ message: 'ownerId is required' })
  return next()
}

const PropertyValidator = {
  validateCreateProperty,
  validateUpdateProperty,
  validateGetPropertyById,
  validateList,
  validateGeoNearby,
  validateCode,
  validateSimilarById,
  validateOwnerScopedList
}

export default PropertyValidator