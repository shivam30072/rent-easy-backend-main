import { propertyModel } from './Property.Schema.js'
import { convertToObjectId, crypto } from '../../helper/index.js'
import { roomModel } from '../Room/Room.Schema.js'
import { PROPERTY_MESSAGES as MSG } from './Property.Constant.js'
import { ownerModel } from '../Owner/Owner.Schema.js'
import { PROPERTY_SIMILAR_WEIGHTS as SIM_W } from './Property.Constant.js'
import { addressModel } from '../Address/Address.Schema.js'

const generateUniquePropertyCode = ({ state, city, houseNumber }) => {
  const s = (state || 'XX').slice(0, 2).toUpperCase()
  const c = (city || 'XXX').slice(0, 3).toUpperCase()
  const h = (houseNumber || '000')
    .toString()
    .replace(/\s+/g, '')
    .slice(0, 5)
    .toUpperCase()
  const rand = crypto.randomBytes(2).toString('hex').toUpperCase() // 4 chars
  return `${s}-${c}-${h}-${rand}`
}

const ensureUniqueCode = async (suggested) => {
  let code = suggested
  let tries = 0
  while (await propertyModel.exists({ uniquePropertyCode: code })) {
    tries += 1
    code = `${suggested}-${tries}`
  }
  return code
}

export const createProperty = async (propertyData) => {
  // 1. Validate owner existence
  const owner = await ownerModel.findById(propertyData.ownerId)
  if (!owner) {
    const err = new Error(MSG.OWNER_NOT_FOUND)
    err.statusCode = 404
    throw err
  }

  // 2. Generate uniquePropertyCode if not provided
  if (!propertyData.uniquePropertyCode) {
    const snap = propertyData.addressSnapshot || {}
    const suggested = generateUniquePropertyCode({
      state: snap.state,
      city: snap.city,
      houseNumber: snap.houseNumber,
    })
    propertyData.uniquePropertyCode = await ensureUniqueCode(suggested)
  } else {
    // enforce uniqueness
    const exists = await propertyModel.exists({
      uniquePropertyCode: propertyData.uniquePropertyCode,
    })
    if (exists) {
      const err = new Error(MSG.CODE_EXISTS)
      err.statusCode = 400
      throw err
    }
  }

  // 3. Create property
  let property
  try {
    property = await propertyModel.create(propertyData)
  } catch (err) {
    const error = new Error(MSG.CREATE_FAILED + `: ${err.message}`)
    error.statusCode = 500
    throw error
  }

  // 4. Push property to owner's ownedProperties
  try {
    await ownerModel.findByIdAndUpdate(
      propertyData.ownerId,
      { $addToSet: { ownedProperties: property._id } },
      { new: true }
    )
  } catch (err) {
    // rollback property if linking fails
    await propertyModel.findByIdAndDelete(property._id)
    const error = new Error(MSG.OWNER_UPDATE_FAILED + `: ${err.message}`)
    error.statusCode = 500
    throw error
  }

  return property.toObject()
}

// ---------- Query Helpers ----------
const buildMatch = (filter = {}) => {
  const m = {}

  // Visibility defaults
  if (filter.includeArchived !== true) m.isArchived = { $ne: true }
  if (filter.includeDeleted !== true) m.deletedAt = null

  if (filter.ownerId) m.ownerId = convertToObjectId(filter.ownerId)
  if (filter.propertyType)
    m.propertyType = {
      $in: Array.isArray(filter.propertyType)
        ? filter.propertyType
        : [filter.propertyType],
    }
  if (filter.furnishing)
    m.furnishing = {
      $in: Array.isArray(filter.furnishing)
        ? filter.furnishing
        : [filter.furnishing],
    }
  if (filter.isActive !== undefined) m.isActive = !!filter.isActive
  if (filter.isArchived !== undefined) m.isArchived = !!filter.isArchived
  if (filter.minRating !== undefined)
    m.rating = { ...(m.rating || {}), $gte: Number(filter.minRating) }
  if (filter.maxRating !== undefined)
    m.rating = { ...(m.rating || {}), $lte: Number(filter.maxRating) }
  if (filter.minAmount !== undefined)
    m.minAmount = { ...(m.minAmount || {}), $gte: Number(filter.minAmount) }
  if (filter.maxAmount !== undefined)
    m.maxAmount = { ...(m.maxAmount || {}), $lte: Number(filter.maxAmount) }
  if (filter.sizeGte !== undefined)
    m.size = { ...(m.size || {}), $gte: Number(filter.sizeGte) }
  if (filter.sizeLte !== undefined)
    m.size = { ...(m.size || {}), $lte: Number(filter.sizeLte) }
  if (filter.bhkType)
    m.bhkType = {
      $in: Array.isArray(filter.bhkType) ? filter.bhkType : [filter.bhkType],
    }
  if (filter.parking !== undefined) m.parking = !!filter.parking

  // Date range (createdAt)
  if (filter.createdFrom || filter.createdTo) {
    m.createdAt = {}
    if (filter.createdFrom) m.createdAt.$gte = new Date(filter.createdFrom)
    if (filter.createdTo) m.createdAt.$lte = new Date(filter.createdTo)
  }

  // Available from
  if (filter.availableFromGte) {
    m.availableFrom = {
      ...(m.availableFrom || {}),
      $gte: new Date(filter.availableFromGte),
    }
  }
  if (filter.availableFromLte) {
    m.availableFrom = {
      ...(m.availableFrom || {}),
      $lte: new Date(filter.availableFromLte),
    }
  }

  // Features include all/any
  if (
    filter.featuresAll &&
    Array.isArray(filter.featuresAll) &&
    filter.featuresAll.length
  ) {
    m.features = { ...(m.features || {}), $all: filter.featuresAll }
  }
  if (
    filter.featuresAny &&
    Array.isArray(filter.featuresAny) &&
    filter.featuresAny.length
  ) {
    m.features = { ...(m.features || {}), $in: filter.featuresAny }
  }

  // Text search
  if (filter.q) {
    m.$text = { $search: filter.q }
  }

  // uniquePropertyCode exact
  if (filter.uniquePropertyCode) {
    m.uniquePropertyCode = filter.uniquePropertyCode
  }

  return m
}

const buildSort = (sortBy, sortDir) => {
  const dir = sortDir === 'asc' || sortDir === 1 ? 1 : -1
  let sort = { createdAt: -1 }
  if (sortBy) {
    const fields = Array.isArray(sortBy) ? sortBy : [sortBy]
    sort = {}
    for (const f of fields) {
      const [field, order] = `${f}`.split(':')
      sort[field] = order === 'asc' || order === '1' ? 1 : -1
    }
  }
  return sort
}

const getProperties = async (req, res) => {
  try {
    let {
      ownerId,
      addressId,
      propertyType,
      bhkType,
      furnishing,
      minAmount,
      maxAmount,
      rating,
      features,
      isActive,
      isArchived,
      minSize,
      maxSize,
      floor,
      preferredTenant,
      lat,
      lng,
      distanceValue, // value
      distanceUnit, // km, m, KM, meter
      sortBy,
      sortOrder,
      page = 1,
      limit = 10,
      search, // search by propertyName or description
    } = req.body

    page = Number(page)
    limit = Number(limit)

    const matchStage = {}

    if (ownerId) matchStage.ownerId = new mongoose.Types.ObjectId(ownerId)
    if (addressId)
      matchStage.addressId = new mongoose.Types.ObjectId(addressId)
    if (propertyType) matchStage.propertyType = propertyType
    if (bhkType) matchStage.bhkType = bhkType
    if (furnishing) matchStage.furnishing = furnishing
    if (isActive !== undefined) matchStage.isActive = isActive === 'true'
    if (isArchived !== undefined) matchStage.isArchived = isArchived === 'true'
    if (preferredTenant) matchStage.preferredTenant = preferredTenant
    if (floor) matchStage.floor = Number(floor)
    if (rating) matchStage.rating = { $gte: Number(rating) }
    if (minAmount || maxAmount) {
      matchStage.minAmount = {}
      if (minAmount) matchStage.minAmount.$gte = Number(minAmount)
      if (maxAmount) matchStage.minAmount.$lte = Number(maxAmount)
    }
    if (minSize || maxSize) {
      matchStage.size = {}
      if (minSize) matchStage.size.$gte = Number(minSize)
      if (maxSize) matchStage.size.$lte = Number(maxSize)
    }
    if (features) {
      const featuresArray = Array.isArray(features)
        ? features
        : features.split(',')
      matchStage.features = { $all: featuresArray }
    }
    if (search) {
      matchStage.$or = [
        { propertyName: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ]
    }

    // Convert distance to meters
    let maxDistance = null
    if (distanceValue && distanceUnit) {
      const unit = distanceUnit.toLowerCase()
      if (unit === 'km' || unit === 'kilometer' || unit === 'kilometers') {
        maxDistance = distanceValue * 1000
      } else if (unit === 'm' || unit === 'meter' || unit === 'meters') {
        maxDistance = distanceValue
      } else {
        return res
          .status(400)
          .json({ success: false, message: 'Invalid distance unit' })
      }
    }

    let pipeline = []

    // GEO FILTER CASE
    if (lat && lng && maxDistance) {
      pipeline.push({
        $geoNear: {
          near: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)],
          },
          distanceField: 'distance',
          distanceMultiplier: 0.001, // return in KM
          maxDistance: maxDistance, // in meters
          spherical: true,
          key: 'geoLocation',
        },
      })

      pipeline.push({
        $lookup: {
          from: 'properties',
          localField: '_id',
          foreignField: 'addressId',
          as: 'property',
        },
      })
      pipeline.push({ $unwind: '$property' })

      // Merge filters for properties
      pipeline.push({ $match: matchStage })

      // Sorting
      if (sortBy) {
        pipeline.push({ $sort: { [sortBy]: sortOrder === 'asc' ? 1 : -1 } })
      } else {
        pipeline.push({ $sort: { distance: 1 } }) // default nearest first
      }

      // Pagination
      pipeline.push({ $skip: (page - 1) * limit })
      pipeline.push({ $limit: limit })

      const results = await addressModel.aggregate(pipeline)
      const struturedResponse = _transformProperties(results)
      console.log(
        'results-----------------------------------------',
        struturedResponse
      )
      return struturedResponse
      // return res.json({
      //   success: true,
      //   total: results.length,
      //   page,
      //   limit,
      //   data: results,
      // })
    }

    // NON-GEO CASE
    pipeline.push({ $match: matchStage })
    pipeline.push({
      $lookup: {
        from: 'addresses',
        localField: 'addressId',
        foreignField: '_id',
        as: 'address',
      },
    })
    pipeline.push({ $unwind: '$address' })

    // Sorting
    if (sortBy) {
      pipeline.push({ $sort: { [sortBy]: sortOrder === 'asc' ? 1 : -1 } })
    }

    // Pagination
    pipeline.push({ $skip: (page - 1) * limit })
    pipeline.push({ $limit: limit })

    const properties = await propertyModel.aggregate(pipeline)
    const totalCount = await propertyModel.countDocuments(matchStage)

    const response = {
      success: true,
      total: totalCount,
      page,
      limit,
      data: properties,
    }

    return response
  } catch (error) {
    console.error('Error in getProperties:', error)
    return res.status(500).json({ success: false, message: error.message })
  }
}

const getPropertyById = async (id, { withRooms = false, withAddress = false, withOwner = false } = {}) => {
  const q = propertyModel.findById(convertToObjectId(id))
  if (withRooms) {
    q.populate({
      path: 'rooms',
      model: 'Room',
      options: { sort: { createdAt: -1 } },
    })
  }

  if (withAddress) {
    q.populate({
      path: 'addressId',
      model: 'Address',
      select: '-__v -createdAt -updatedAt -_id', // optional: clean response
    })
  }

  if (withOwner) {
    q.populate({
      path: 'ownerId',
      model: 'Owner',
      populate: {
        path: 'userId',
        model: 'User',
        select: '-passwordHash -__v -createdAt -updatedAt',
      },
      select: '-__v -createdAt -updatedAt',
    })
  }

  return await q.lean({ virtuals: true })
}

const getPropertyByCode = async (code, opts = {}) => {
  const q = propertyModel.findOne({ uniquePropertyCode: code })
  if (opts.withRooms) {
    q.populate({
      path: 'rooms',
      model: 'Room',
      options: { sort: { createdAt: -1 } },
    })
  }
  return await q.lean({ virtuals: true })
}

const updatePropertyById = async (propertyId, updateData) => {
  // prevent unique code collision
  if (updateData?.uniquePropertyCode) {
    const exists = await propertyModel.exists({
      _id: { $ne: convertToObjectId(propertyId) },
      uniquePropertyCode: updateData.uniquePropertyCode,
    })
    if (exists) {
      const err = new Error(MSG.CODE_EXISTS)
      err.statusCode = 400
      throw err
    }
  }
  return await propertyModel
    .findByIdAndUpdate(
      convertToObjectId(propertyId),
      { $set: updateData },
      { new: true }
    )
    .lean()
}

const softDeletePropertyById = async (propertyId) => {
  return await propertyModel
    .findByIdAndUpdate(
      convertToObjectId(propertyId),
      { $set: { deletedAt: new Date(), isActive: false } },
      { new: true }
    )
    .lean()
}

const restorePropertyById = async (propertyId) => {
  return await propertyModel
    .findByIdAndUpdate(
      convertToObjectId(propertyId),
      { $set: { deletedAt: null, isActive: true } },
      { new: true }
    )
    .lean()
}

const archivePropertyById = async (propertyId, archive = true) => {
  return await propertyModel
    .findByIdAndUpdate(
      convertToObjectId(propertyId),
      { $set: { isArchived: !!archive } },
      { new: true }
    )
    .lean()
}

const deletePropertyById = async (propertyId) => {
  // hard delete (use with caution)
  return await propertyModel.findByIdAndDelete(convertToObjectId(propertyId))
}

// Recalculate average rating for property using roomModel
const recomputePropertyRating = async (propertyId) => {
  const pid = convertToObjectId(propertyId)
  const agg = await roomModel.aggregate([
    { $match: { propertyId: pid, rating: { $exists: true } } },
    { $group: { _id: '$propertyId', avgRating: { $avg: '$rating' } } },
  ])
  const avg = agg[0]
    ? Math.round((agg[0].avgRating + Number.EPSILON) * 100) / 100
    : 0
  await propertyModel.findByIdAndUpdate(pid, { $set: { rating: avg } })
  return avg
}

const getAllPropertiesOfOwner = async ({
  ownerId,
  withRoom = false,
  includeArchived = false,
}) => {
  const match = { ownerId, deletedAt: null }
  if (!includeArchived) match.isArchived = { $ne: true }

  let query = propertyModel.find(match).sort({ createdAt: -1 })
  if (withRoom) {
    query = query.populate({
      path: 'rooms',
      model: 'Room',
      options: { sort: { createdAt: -1 } },
    })
  }
  const properties = await query.lean({ virtuals: true }).exec()
  return properties
}

const addImage = async (propertyId, url) => {
  return propertyModel
    .findByIdAndUpdate(
      convertToObjectId(propertyId),
      { $addToSet: { images: url } },
      { new: true }
    )
    .lean()
}

const removeImage = async (propertyId, url) => {
  return propertyModel
    .findByIdAndUpdate(
      convertToObjectId(propertyId),
      { $pull: { images: url } },
      { new: true }
    )
    .lean()
}

const bulkUpdate = async ({ ids = [], set = {}, unset = {} }) => {
  const _ids = ids.map(convertToObjectId)
  await propertyModel.updateMany(
    { _id: { $in: _ids } },
    {
      ...(Object.keys(set).length ? { $set: set } : {}),
      ...(Object.keys(unset).length ? { $unset: unset } : {}),
    }
  )
  return { updatedIds: ids }
}

const validateCodeAvailability = async (code) => {
  const exists = await propertyModel.exists({ uniquePropertyCode: code })
  return { available: !exists }
}

const getStats = async (filter = {}) => {
  const match = buildMatch(filter)
  const [stats] = await propertyModel.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$propertyType',
        count: { $sum: 1 },
        minPrice: { $min: '$minAmount' },
        maxPrice: { $max: '$maxAmount' },
        avgPrice: { $avg: { $ifNull: ['$minAmount', '$maxAmount'] } },
        avgRating: { $avg: '$rating' },
      },
    },
    { $sort: { count: -1 } },
  ])

  const global = await propertyModel.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        count: { $sum: 1 },
        minPrice: { $min: '$minAmount' },
        maxPrice: { $max: '$maxAmount' },
        avgRating: { $avg: '$rating' },
      },
    },
  ])

  return { byType: stats ? [stats] : [], global: global[0] || null }
}

// SIMILAR PROPERTIES
const midPrice = (doc) => {
  const hasMin = typeof doc?.minAmount === 'number'
  const hasMax = typeof doc?.maxAmount === 'number'
  if (hasMin && hasMax) return (doc.minAmount + doc.maxAmount) / 2
  if (hasMin) return doc.minAmount
  if (hasMax) return doc.maxAmount
  return null
}

const _ensureNumber = (v, fallback = 0) =>
  typeof v === 'number' && !Number.isNaN(v) ? v : fallback

// Main: Similar properties via aggregation pipeline + scoring
const _similarPipeline = ({ target, opts, phase = 1 }) => {
  const {
    maxDistanceMeters = 10000, // 10km default
    includeArchived = false,
    includeDeleted = false,
    excludeOwner = false,
  } = opts || {}

  const tCity = target?.addressSnapshot?.city || null
  const tLocality = target?.addressSnapshot?.locality || null
  const tState = target?.addressSnapshot?.state || null
  const tType = target.propertyType
  const tBhk = (target.bhkType || '').toString().toUpperCase()
  const tFurn = target.furnishing
  const tPrice = _ensureNumber(midPrice(target), 1) // avoid /0 later
  const tFeatures = Array.isArray(target.features) ? target.features : []

  // Base visibility filters
  const baseMatch = {
    _id: { $ne: target._id },
    ...(includeArchived ? {} : { isArchived: { $ne: true } }),
    ...(includeDeleted ? {} : { deletedAt: null }),
    isActive: true,
  }

  // Phase 1 is stricter Phase 2 relaxes locality/distance and (optionally) type walls
  const phaseMatch = { ...baseMatch }

  if (phase === 1) {
    // Keep same type in phase 1
    if (tType) phaseMatch.propertyType = tType
  } else {
    // Phase 2: still prefer same type but don’t hard filter—handled in score
    // (No explicit type filter)
  }

  // Owner exclusion (optional)
  if (excludeOwner && target.ownerId) {
    phaseMatch.ownerId = { $ne: target.ownerId }
  }

  // Location handling
  const useGeo = !!(target.location?.coordinates?.length === 2)
  const startStages = []

  if (useGeo && phase === 1) {
    startStages.push({
      $geoNear: {
        near: { type: 'Point', coordinates: target.location.coordinates },
        distanceField: 'distance',
        spherical: true,
        maxDistance: Number(maxDistanceMeters),
        query: phaseMatch,
      },
    })
  } else {
    // Non-geo phase or phase 2: rely on city/locality for proximity hint (if present)
    const locMatch = { ...phaseMatch }
    if (phase === 1) {
      if (tLocality) {
        locMatch['addressSnapshot.locality'] = tLocality
      } else if (tCity) {
        locMatch['addressSnapshot.city'] = tCity
      } else if (tState) {
        locMatch['addressSnapshot.state'] = tState
      }
    } else {
      // Phase 2: relax to same city if available, else only state if nothing, just visibility filters
      if (tCity) {
        locMatch['addressSnapshot.city'] = tCity
      } else if (tState) {
        locMatch['addressSnapshot.state'] = tState
      }
    }
    startStages.push({ $match: locMatch })
  }

  // Scoring fields
  const addScoreFields = {
    // --- Price score: 1 - relative difference of mid prices ---
    candidateMidPrice: {
      $let: {
        vars: {
          cMin: { $ifNull: ['$minAmount', null] },
          cMax: { $ifNull: ['$maxAmount', null] },
        },
        in: {
          $cond: [
            { $and: [{ $ne: ['$$cMin', null] }, { $ne: ['$$cMax', null] }] },
            { $divide: [{ $add: ['$$cMin', '$$cMax'] }, 2] },
            { $ifNull: ['$$cMin', { $ifNull: ['$$cMax', tPrice] }] },
          ],
        },
      },
    },
    priceScore: {
      $let: {
        vars: { cMid: '$candidateMidPrice' },
        in: {
          $max: [
            0,
            {
              $subtract: [
                1,
                {
                  $divide: [
                    { $abs: [{ $subtract: ['$$cMid', tPrice] }] },
                    { $max: [tPrice, 1] },
                  ],
                },
              ],
            },
          ],
        },
      },
    },

    // --- BHK score: exact match 1 else 0 ---
    bhkScore: {
      $cond: [
        {
          $eq: [{ $toUpper: { $ifNull: ['$bhkType', ''] } }, tBhk],
        },
        1,
        0,
      ],
    },

    // --- Furnishing affinity: exact 1 semi<->fully 0.6 else 0.3 ---
    furnishingScore: {
      $cond: [
        { $eq: ['$furnishing', tFurn] },
        1,
        {
          $cond: [
            {
              $setIsSubset: [
                [{ $ifNull: ['$furnishing', 'none'] }, tFurn],
                ['semi-furnished', 'fully-furnished'],
              ],
            },
            0.6,
            0.3,
          ],
        },
      ],
    },

    // --- Type score: exact match (even if not filtered in phase 2) ---
    typeScore: { $cond: [{ $eq: ['$propertyType', tType] }, 1, 0] },

    // --- Features Jaccard overlap ---
    featuresOverlap: {
      $size: { $setIntersection: [{ $ifNull: ['$features', []] }, tFeatures] },
    },
    featuresUnionSize: {
      $size: { $setUnion: [{ $ifNull: ['$features', []] }, tFeatures] },
    },
    featuresScore: {
      $cond: [
        {
          $gt: [
            {
              $size: { $setUnion: [{ $ifNull: ['$features', []] }, tFeatures] },
            },
            0,
          ],
        },
        {
          $divide: [
            {
              $size: {
                $setIntersection: [{ $ifNull: ['$features', []] }, tFeatures],
              },
            },
            {
              $size: { $setUnion: [{ $ifNull: ['$features', []] }, tFeatures] },
            },
          ],
        },
        0,
      ],
    },

    // --- Rating closeness: 1 - |Δ|/5 ---
    ratingScore: {
      $max: [
        0,
        {
          $subtract: [
            1,
            {
              $divide: [
                {
                  $abs: [
                    {
                      $subtract: [
                        { $ifNull: ['$rating', 0] },
                        _ensureNumber(target.rating, 0),
                      ],
                    },
                  ],
                },
                5,
              ],
            },
          ],
        },
      ],
    },

    // --- Distance/city/locality score ---
    distanceScore: {
      $let: {
        vars: {
          // whether $distance exists (only from geoNear)
          hasDist: { $ne: ['$distance', undefined] },
        },
        in: {
          $cond: [
            '$$hasDist',
            {
              $max: [
                0,
                {
                  $subtract: [
                    1,
                    { $divide: ['$distance', Math.max(1, maxDistanceMeters)] },
                  ],
                },
              ],
            },
            // Fallback to locality/city equality
            {
              $cond: [
                { $eq: ['$addressSnapshot.locality', tLocality] },
                1,
                {
                  $cond: [
                    { $eq: ['$addressSnapshot.city', tCity] },
                    0.7,
                    {
                      $cond: [
                        { $eq: ['$addressSnapshot.state', tState] },
                        0.4,
                        0,
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      },
    },
  }

  const finalScoreExpr = {
    $add: [
      { $multiply: ['$typeScore', SIM_W.type] },
      { $multiply: ['$priceScore', SIM_W.price] },
      { $multiply: ['$bhkScore', SIM_W.bhk] },
      { $multiply: ['$furnishingScore', SIM_W.furnishing] },
      { $multiply: ['$featuresScore', SIM_W.features] },
      { $multiply: ['$distanceScore', SIM_W.distance] },
      { $multiply: ['$ratingScore', SIM_W.rating] },
    ],
  }

  return [
    ...startStages,
    { $addFields: addScoreFields },
    { $addFields: { finalScore: finalScoreExpr } },
    // Guardrails: ignore very weak matches
    { $match: { finalScore: { $gte: phase === 1 ? 0.35 : 0.2 } } },
  ]
}

const findSimilar = async (target, options = {}) => {
  if (!target) return { items: [], usedFallback: false }
  const limit = Number(options.limit) > 0 ? Number(options.limit) : 10
  const minResults =
    Number(options.minResults) > 0
      ? Number(options.minResults)
      : Math.min(limit, 6)

  // Phase 1 (strict)
  const pipeline1 = _similarPipeline({ target, opts: options, phase: 1 })
  const res1 = await propertyModel.aggregate([
    ...pipeline1,
    { $sort: { finalScore: -1, createdAt: -1 } },
    { $limit: limit },
  ])

  if (res1.length >= minResults) return { items: res1, usedFallback: false }

  // Phase 2 (relaxed)
  const relaxed = { ...options }
  if (target.location?.coordinates?.length === 2 && options.maxDistanceMeters) {
    relaxed.maxDistanceMeters = options.maxDistanceMeters * 2 // widen circle
  }

  const pipeline2 = _similarPipeline({ target, opts: relaxed, phase: 2 })
  const res2 = await propertyModel.aggregate([
    ...pipeline2,
    { $sort: { finalScore: -1, createdAt: -1 } },
    { $limit: limit },
  ])

  // Merge unique (in case phase 2 overlaps)
  const sel = new Map()
  for (const x of [...res1, ...res2]) sel.set(String(x._id), x)
  return {
    items: Array.from(sel.values()).slice(0, limit),
    usedFallback: true,
  }
}

const findSimilarById = async (propertyId, options = {}) => {
  const target = await propertyModel
    .findById(convertToObjectId(propertyId))
    .lean()
  console.log('Targert:: ', target)
  console.log('options: ', options)
  const result = await findSimilar(target, options)
  return { target, ...result }
}

const findSimilarByCode = async (code, options = {}) => {
  const target = await propertyModel
    .findOne({ uniquePropertyCode: code })
    .lean()
  console.log('Targert:: ', target)
  console.log('options: ', options)
  const result = await findSimilar(target, options)
  return { target, ...result }
}

function _transformProperties(result) {
  return result.map((item) => {
    const property = item.property || {}

    return {
      _id: property._id,
      propertyId: property._id,
      ownerId: property.ownerId,
      userId: item.userId,
      addressId: item._id,
      description: property.description,
      propertyName: property.propertyName,
      propertyType: property.propertyType,
      bhkType: property.bhkType,
      size: property.size,
      floor: property.floor,
      totalFloors: property.totalFloors,
      availableFrom: property.availableFrom,
      preferredTenant: property.preferredTenant,
      parking: property.parking,
      features: property.features || [],
      images: property.images || [],
      isActive: property.isActive,
      highlights: property.highlights || [],
      uniquePropertyCode: property.uniquePropertyCode,
      furnishing: property.furnishing,
      rating: property.rating ? Number(property.rating.toFixed(2)) : null,
      minAmount: property.minAmount,
      maxAmount: property.maxAmount,
      createdAt: property.createdAt,
      updatedAt: property.updatedAt,
      distance: item.distance,
      address: {
        addressId: item._id,
        state: item.state,
        city: item.city,
        pincode: item.pincode,
        fullAddress: item.fullAddress,
        geoLocation: item.geoLocation,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      },
    }
  })
}

const searchProperty = async (body) => {
    const page = Number(body.page || 1)
    const limit = Number(body.limit || 10)
    const skip = (page - 1) * limit

    const propertyMatch = buildPropertyMatch(body)

    // GEO PATH if coords provided & a valid maxDistance can be parsed/assumed
    const latOk = body.lat != null && body.lng != null
    const meters = parseDistanceToMeters(body)
    const useGeo = latOk && meters != null

    // Build sort
    const sort = _buildSort(body.sortBy, body.sortOrder, { geoEnabled: useGeo })

    if (useGeo) {
      // ✅ GEO NEAR must be on addresses use key 'geoLocation'
      const pipeline = [
        {
          $geoNear: {
            near: { type: "Point", coordinates: [Number(body.lng), Number(body.lat)] },
            distanceField: "distance",
            distanceMultiplier: 0.001, // return KM
            maxDistance: meters, // meters
            spherical: true,
            key: "geoLocation",
            // NOTE: we DO NOT put property filters here we filter after lookup
          },
        },
        {
          $lookup: {
            from: "properties",
            localField: "_id",
            foreignField: "addressId",
            as: "property",
          },
        },
        { $unwind: "$property" },
        // Re-map sort field path for joined doc if not 'distance'
        ...(sort.distance
          ? [{ $sort: sort }]
          : [{ $sort: Object.fromEntries(Object.entries(sort).map(([k, v]) => [`property.${k}`, v])) }]),
        { $match: Object.keys(propertyMatch).length ? Object.fromEntries(Object.entries(propertyMatch).map(([k, v]) => [`property.${k}`, v])) : {} },
        { $skip: skip },
        { $limit: limit },
        // projection keeps only what's needed
        {
          $project: {
            // address root fields
            _id: 1,
            state: 1,
            city: 1,
            pincode: 1,
            fullAddress: 1,
            geoLocation: 1,
            createdAt: 1,
            updatedAt: 1,
            userId: 1,
            distance: 1,
            // property subdoc
            property: 1,
          },
        },
      ]

      const [items, totalAgg] = await Promise.all([
        addressModel.aggregate(pipeline).allowDiskUse(true),
        // fast count: aggregate again with $count to avoid loading everything
        addressModel
          .aggregate([
            {
              $geoNear: {
                near: { type: "Point", coordinates: [Number(body.lng), Number(body.lat)] },
                distanceField: "distance",
                maxDistance: meters,
                spherical: true,
                key: "geoLocation",
              },
            },
            {
              $lookup: {
                from: "properties",
                localField: "_id",
                foreignField: "addressId",
                as: "property",
              },
            },
            { $unwind: "$property" },
            { $match: Object.keys(propertyMatch).length ? Object.fromEntries(Object.entries(propertyMatch).map(([k, v]) => [`property.${k}`, v])) : {} },
            { $count: "total" },
          ])
          .allowDiskUse(true),
      ])

      const total = totalAgg?.[0]?.total || 0

      const response = {
        success: true,
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        data: transformGeoResults(items),
      }
      return response
    }

    // ✅ NON-GEO PATH
    const sortNonGeo =
      sort.distance
        ? { createdAt: -1 } // distance not available fall back
        : sort

    const pipeline = [
      { $match: propertyMatch },
      {
        $lookup: {
          from: "addresses",
          localField: "addressId",
          foreignField: "_id",
          as: "address",
        },
      },
      { $unwind: "$address" },
      { $sort: sortNonGeo },
      { $skip: skip },
      { $limit: limit },
      {
        $project: {
          // project only what you return
          _id: 1,
          ownerId: 1,
          addressId: 1,
          description: 1,
          propertyName: 1,
          propertyType: 1,
          bhkType: 1,
          size: 1,
          floor: 1,
          totalFloors: 1,
          availableFrom: 1,
          preferredTenant: 1,
          parking: 1,
          features: 1,
          images: 1,
          isActive: 1,
          highlights: 1,
          uniquePropertyCode: 1,
          furnishing: 1,
          rating: 1,
          minAmount: 1,
          maxAmount: 1,
          createdAt: 1,
          updatedAt: 1,
          address: 1,
        },
      },
    ]

    const [items, total] = await Promise.all([
      propertyModel.aggregate(pipeline).allowDiskUse(true),
      propertyModel.countDocuments(propertyMatch),
    ])

    const response =       
    {
      success: true,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      data: transformPropertyResults(items),
    }
    return response
}

function parseDistanceToMeters(body) {
  // explicit pair takes precedence
  if (body.distanceValue != null && body.distanceUnit) {
    const val = Number(body.distanceValue)
    const unit = String(body.distanceUnit).trim().toLowerCase()
    if (Number.isNaN(val) || val < 0) return null
    if (unit === "km" || unit === "kilometer" || unit === "kilometers") return val * 1000
    if (unit === "m" || unit === "meter" || unit === "meters") return val
    return null
  }

  // fallback: maxDistance token (e.g., "5km", "500 m")
  if (body.maxDistance != null) {
    if (typeof body.maxDistance === "number") return body.maxDistance // assume meters
    const raw = String(body.maxDistance).trim().toLowerCase().replace(/\s+/g, "")
    const match = raw.match(/^([\d.]+)(km|m)?$/)
    if (!match) return null
    const val = Number(match[1])
    const unit = match[2] || "m"
    if (Number.isNaN(val) || val < 0) return null
    return unit === "km" ? val * 1000 : val
  }

  return null
}

/** Build safe sort object with whitelist */
function _buildSort(sortBy, sortOrder, { geoEnabled } = { geoEnabled: false }) {
  const allowed = new Set([
    "propertyName",
    "propertyType",
    "bhkType",
    "size",
    "floor",
    "totalFloors",
    "availableFrom",
    "preferredTenant",
    "furnishing",
    "rating",
    "minAmount",
    "maxAmount",
    "createdAt",
    "updatedAt",
    "isActive",
    "isArchived",
  ])
  const order = String(sortOrder || "asc").toLowerCase() === "desc" ? -1 : 1

  if (geoEnabled) {
    // default sort by distance if geo is used
    if (!sortBy || sortBy === "distance") return { distance: 1 }
    // allow other fields as well (on the correct path later)
  }

  if (!sortBy) return { createdAt: -1 }
  if (sortBy === "distance") return { distance: 1 }
  if (!allowed.has(sortBy)) return { createdAt: -1 }
  return { [sortBy]: order }
}

/** Transform aggregated geo results (address as root + property joined) to your desired shape */
function transformGeoResults(results) {
  return results.map((item) => {
    const p = item.property || {}
    const ratingRounded =
      typeof p.rating === "number" ? Math.round(p.rating * 100) / 100 : p.rating ?? null

    return {
      _id: p._id,
      propertyId: p._id,
      ownerId: p.ownerId,
      userId: item.userId,
      addressId: item._id,
      description: p.description,
      propertyName: p.propertyName,
      propertyType: p.propertyType,
      bhkType: p.bhkType,
      size: p.size,
      floor: p.floor,
      totalFloors: p.totalFloors,
      availableFrom: p.availableFrom,
      preferredTenant: p.preferredTenant,
      parking: p.parking,
      features: p.features || [],
      images: p.images || [],
      isActive: p.isActive,
      highlights: p.highlights || [],
      uniquePropertyCode: p.uniquePropertyCode,
      furnishing: p.furnishing,
      rating: ratingRounded,
      minAmount: p.minAmount,
      maxAmount: p.maxAmount,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      distance: item.distance, // in KM if distanceMultiplier used
      address: {
        addressId: item._id,
        state: item.state,
        city: item.city,
        pincode: item.pincode,
        fullAddress: item.fullAddress,
        geoLocation: item.geoLocation,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      },
    }
  })
}

/** Transform non-geo property->address lookup results into a consistent shape (without distance) */
function transformPropertyResults(results) {
  return results.map((p) => {
    const a = p.address || {}
    const ratingRounded =
      typeof p.rating === "number" ? Math.round(p.rating * 100) / 100 : p.rating ?? null

    return {
      _id: p._id,
      propertyId: p._id,
      ownerId: p.ownerId,
      userId: a.userId,
      addressId: p.addressId,
      description: p.description,
      propertyName: p.propertyName,
      propertyType: p.propertyType,
      bhkType: p.bhkType,
      size: p.size,
      floor: p.floor,
      totalFloors: p.totalFloors,
      availableFrom: p.availableFrom,
      preferredTenant: p.preferredTenant,
      parking: p.parking,
      features: p.features || [],
      images: p.images || [],
      isActive: p.isActive,
      highlights: p.highlights || [],
      uniquePropertyCode: p.uniquePropertyCode,
      furnishing: p.furnishing,
      rating: ratingRounded,
      minAmount: p.minAmount,
      maxAmount: p.maxAmount,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      address: {
        addressId: a._id,
        state: a.state,
        city: a.city,
        pincode: a.pincode,
        fullAddress: a.fullAddress,
        geoLocation: a.geoLocation,
        createdAt: a.createdAt,
        updatedAt: a.updatedAt,
      },
    }
  })
}

/** Build property $match from request (shared for both paths) */
function buildPropertyMatch(body) {
  const m = {}

  if (body.ownerId) m.ownerId = new mongoose.Types.ObjectId(body.ownerId)
  if (body.addressId) m.addressId = new mongoose.Types.ObjectId(body.addressId)
  if (body.propertyType) m.propertyType = body.propertyType
  if (body.bhkType) m.bhkType = body.bhkType
  if (body.furnishing) m.furnishing = body.furnishing

  if (body.isActive !== undefined) m.isActive = body.isActive === true || body.isActive === "true"
  if (body.isArchived !== undefined)
    m.isArchived = body.isArchived === true || body.isArchived === "true"

  if (body.preferredTenant) m.preferredTenant = body.preferredTenant
  if (body.floor != null) m.floor = Number(body.floor)

  if (body.rating != null) m.rating = { $gte: Number(body.rating) }

  if (body.minAmount != null || body.maxAmount != null) {
    m.minAmount = {}
    if (body.minAmount != null) m.minAmount.$gte = Number(body.minAmount)
    if (body.maxAmount != null) m.minAmount.$lte = Number(body.maxAmount)
  }
  if (body.minSize != null || body.maxSize != null) {
    m.size = {}
    if (body.minSize != null) m.size.$gte = Number(body.minSize)
    if (body.maxSize != null) m.size.$lte = Number(body.maxSize)
  }

  if (body.features) {
    const featuresArray = Array.isArray(body.features)
      ? body.features
      : String(body.features).split(",").map((s) => s.trim()).filter(Boolean)
    if (featuresArray.length) m.features = { $all: featuresArray }
  }

  if (body.search) {
    m.$or = [
      { propertyName: { $regex: String(body.search), $options: "i" } },
      { description: { $regex: String(body.search), $options: "i" } },
    ]
  }

  // Clean empty composite fields
  if (m.minAmount && Object.keys(m.minAmount).length === 0) delete m.minAmount
  if (m.size && Object.keys(m.size).length === 0) delete m.size

  return m
}

async function autoCompleteSearch(q, limit = 10) {
  const regex = new RegExp(escapeRegex(q), "i")
  
  const suggestions = []
  const seen = new Set()

  const props = await propertyModel
    .find(
      { propertyName: { $regex: regex } },
      { propertyName: 1, _id: 1  }
    )
    .limit(limit)
    .lean()

  for (const p of props) {
    const text = p.propertyName
    const propertyId = p._id
    if (text && !seen.has(`p:${text.toLowerCase()}`)) {
      suggestions.push({ type: "property", text, propertyId })
      seen.add(`p:${text.toLowerCase()}`)
    }
    if (suggestions.length >= limit) break
  }

  const addr = await addressModel.aggregate([
    {
      $match: {
        $or: [
          { city: { $regex: regex } },
          { fullAddress: { $regex: regex } },
          { pincode: { $regex: regex } }
        ]
      }
    },
    {
      $lookup: {
        from: "properties",
        localField: "_id",
        foreignField: "addressId",
        as: "property"
      }
    },
    { $unwind: "$property" },
    {
      $project: {
        text: {
          $ifNull: ["$city", { $ifNull: ["$fullAddress", "$pincode"] }]
        },
        propertyId: "$property._id"
      }
    },
    { $limit: Math.max(0, limit - suggestions.length) }
  ])

  for (const a of addr) {
    if (a.text && !seen.has(`a:${a.text.toLowerCase()}`)) {
      suggestions.push({ type: "address", text: a.text, propertyId: a.propertyId })
      seen.add(`a:${a.text.toLowerCase()}`)
    }
    if (suggestions.length >= limit) break
  }

  // 3) Fallback: search embedded snapshot in property
  if (suggestions.length < limit) {
    const snapshots = await propertyModel
      .find(
        {
          $or: [
            { "addressSnapshot.city": { $regex: regex } },
            { "addressSnapshot.locality": { $regex: regex } },
            { "addressSnapshot.pincode": { $regex: regex } }
          ]
        },
        { addressSnapshot: 1, _id: 0 }
      )
      .limit(limit - suggestions.length)
      .lean()

    for (const snap of snapshots) {
      const text = snap.addressSnapshot?.city || snap.addressSnapshot?.locality || snap.addressSnapshot?.pincode
      if (text && !seen.has(`s:${text.toLowerCase()}`)) {
        suggestions.push({ type: "address", text })
        seen.add(`s:${text.toLowerCase()}`)
      }
      if (suggestions.length >= limit) break
    }
  }

  return suggestions
}


function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

const PropertyModel = {
  createProperty,
  getProperties,
  getPropertyById,
  getPropertyByCode,
  updatePropertyById,
  softDeletePropertyById,
  restorePropertyById,
  archivePropertyById,
  deletePropertyById,
  recomputePropertyRating,
  getAllPropertiesOfOwner,
  addImage,
  removeImage,
  bulkUpdate,
  validateCodeAvailability,
  getStats,
  findSimilarById,
  findSimilarByCode,
  searchProperty,
  autoCompleteSearch
}

export default PropertyModel
