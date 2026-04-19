import PropertyModel from './Property.Model.js'
import { PROPERTY_MESSAGES as MSG } from './Property.Constant.js'
import { PROPERTY_SIMILAR_WEIGHTS as SIM_W } from './Property.Constant.js'
import { logger } from '../../helper/index.js'
import ExcelJS from 'exceljs'
import { BULK_UPLOAD_COLUMNS, BULK_UPLOAD_MESSAGES as BULK_MSG } from './Property.Constant.js'
import { uploadBase64File } from '../../helper/s3.js'
import { addressModel } from '../Address/Address.Schema.js'
import { roomModel } from '../Room/Room.Schema.js'
import { propertyModel } from './Property.Schema.js'
import { ownerModel } from '../Owner/Owner.Schema.js'
import { crypto } from '../../helper/index.js'

/**
 * Geocode city+state+pincode using OpenStreetMap Nominatim (free, no API key).
 * Returns [lng, lat] or [0, 0] on failure.
 */
const geocodeAddress = async (city, state, pincode) => {
  try {
    const query = [city, state, pincode].filter(Boolean).join(', ')
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`
    const response = await fetch(url, {
      headers: { 'User-Agent': 'RentEasy-BulkUpload/1.0' }
    })
    const data = await response.json()
    if (data && data.length > 0) {
      return [parseFloat(data[0].lon), parseFloat(data[0].lat)]
    }
  } catch (err) {
    logger.error(err, `Geocoding failed for: ${city}, ${state}, ${pincode}`)
  }
  return [0, 0]
}

const createProperty = async (req, res) => {
  try {
    const property = await PropertyModel.createProperty(req.body)
    return res.success(201, MSG.CREATED, property)
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message })
  }
}

const getProperties = async (req, res) => {
  try {
    const props = await PropertyModel.getProperties(req)
    return res.success(200, MSG.ALL, props)
  } catch (err) {
    logger.error(err, err.errorResponse.errmsg || "No proper error found")
    res.status(500).json({ error: err.message })
  }
}

const getPropertyById = async (req, res) => {
  try {
    const { propertyId, withRooms = false, withAddress = false, withOwner = false } = req.body
    const property = await PropertyModel.getPropertyById(propertyId, { withRooms, withAddress, withOwner })
    if (!property) return res.status(404).json({ message: MSG.NOT_FOUND })
    return res.success(200, MSG.GET_PROPERTY_BY_ID_SUCCESSFULLY, property)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

const getPropertyByCode = async (req, res) => {
  try {
    const { code } = req.params
    const { withRooms = false } = req.query
    const property = await PropertyModel.getPropertyByCode(code, { withRooms: withRooms === 'true' })
    if (!property) return res.status(404).json({ message: MSG.NOT_FOUND })
    return res.success(200, MSG.GET_PROPERTY_BY_CODE, property)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

const updatePropertyById = async (req, res) => {
  try {
    const updated = await PropertyModel.updatePropertyById(req.body.propertyId, req.body.propertyData)
    if (!updated) return res.status(404).json({ message: MSG.NOT_FOUND })
    return res.success(200, MSG.UPDATED, updated)
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message })
  }
}

const softDeletePropertyById = async (req, res) => {
  try {
    const deleted = await PropertyModel.softDeletePropertyById(req.body.propertyId)
    if (!deleted) return res.status(404).json({ message: MSG.NOT_FOUND })
    return res.success(200, MSG.DELETED, deleted)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

const restorePropertyById = async (req, res) => {
  try {
    const restored = await PropertyModel.restorePropertyById(req.body.propertyId)
    if (!restored) return res.status(404).json({ message: MSG.NOT_FOUND })
    return res.success(200, MSG.RESTORED, restored)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

const archiveProperty = async (req, res) => {
  try {
    const { propertyId, archive = true } = req.body
    const data = await PropertyModel.archivePropertyById(propertyId, archive)
    if (!data) return res.status(404).json({ message: MSG.NOT_FOUND })
    return res.success(200, MSG.ARCHIVED, data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

const deletePropertyById = async (req, res) => {
  try {
    const deleted = await PropertyModel.deletePropertyById(req.body.propertyId)
    if (!deleted) return res.status(404).json({ message: MSG.NOT_FOUND })
    return res.success(200, MSG.DELETED, deleted)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

const getAllPropertiesOfOwner =  async (req, res) => {
  try {
    const properties = await PropertyModel.getAllPropertiesOfOwner(req.body)
    if (!properties) return res.status(404).json({ message: MSG.NOT_FOUND })

    return res.success(200, MSG.ALL_OWNER_PROPERTIES, properties)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

const recomputeRating = async (req, res) => {
  try {
    const { propertyId } = req.body
    const avg = await PropertyModel.recomputePropertyRating(propertyId)
    res.json({ message: MSG.RATING_RECOMPUTED, data: { average: avg } })

    return res.success(200, MSG.RATING_RECOMPUTED, avg)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

const nearby = async (req, res) => {
  try {
    const { lng, lat, maxDistanceMeters, ...rest } = req.body
    const result = await PropertyModel.getProperties(
      { ...rest, near: { lng, lat, maxDistanceMeters } },
      { page: req.body.page, limit: req.body.limit, sortBy: req.body.sortBy, sortDir: req.body.sortDir }
    )

    return res.success(200, MSG.ALL, ...result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

const addImage = async (req, res) => {
  try {
    const { propertyId, url } = req.body
    const updated = await PropertyModel.addImage(propertyId, url)
    return res.success(200, MSG.IMAGE_ADDED, updated)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

const removeImage = async (req, res) => {
  try {
    const { propertyId, url } = req.body
    const updated = await PropertyModel.removeImage(propertyId, url)
    return res.success(200, MSG.IMAGE_REMOVED, updated)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

const bulkUpdate = async (req, res) => {
  try {
    const result = await PropertyModel.bulkUpdate(req.body)
    return res.success(200, MSG.BULK_UPDATED, result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

const validateCode = async (req, res) => {
  try {
    const code = req.body.uniquePropertyCode || req.params.code
    const result = await PropertyModel.validateCodeAvailability(code)
    return res.success(200, result.available ? MSG.CODE_AVAILABLE : MSG.CODE_EXISTS, result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

const getStats = async (req, res) => {
  try {
    const stats = await PropertyModel.getStats(req.body?.query || {})
    return res.success(200, MSG.STATS, stats)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}


const getSimilarById = async (req, res) => {
  try {
    const {
      propertyId,
      limit = 10,
      minResults = 6,
      maxDistanceMeters = 10000,
      includeArchived = false,
      includeDeleted = false,
      excludeOwner = false,
    } = req.body || {}

    const { items, usedFallback, target } = await PropertyModel.findSimilarById(propertyId, {
      limit, minResults, maxDistanceMeters, includeArchived, includeDeleted, excludeOwner,
    })

    if (!target) return res.status(404).json({ message: MSG.NOT_FOUND })

      const data = {
        items,
        targetId: String(target._id),
        usedFallback,
        weights: SIM_W,
        limit, minResults, maxDistanceMeters,
    }

    return res.success(200, usedFallback ? MSG.SIMILAR_FALLBACK_USED : MSG.SIMILAR_FETCHED, data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

const getSimilarByCode = async (req, res) => {
  try {
    const {
      limit = 10,
      minResults = 6,
      maxDistanceMeters = 10000,
      includeArchived = false,
      includeDeleted = false,
      excludeOwner = false,
    } = req.query || {}

    const { items, usedFallback, target } = await PropertyModel.findSimilarByCode(req.params.code, {
      limit: Number(limit),
      minResults: Number(minResults),
      maxDistanceMeters: Number(maxDistanceMeters),
      includeArchived: includeArchived === 'true',
      includeDeleted: includeDeleted === 'true',
      excludeOwner: excludeOwner === 'true',
    })

    if (!target) return res.status(404).json({ message: MSG.NOT_FOUND })

    const data = {
        items,
        targetCode: target.uniquePropertyCode,
        usedFallback,
        weights: SIM_W,
        limit: Number(limit),
        minResults: Number(minResults),
        maxDistanceMeters: Number(maxDistanceMeters),
    }


    return res.success(200, usedFallback ? MSG.SIMILAR_FALLBACK_USED : MSG.SIMILAR_FETCHED, data)      
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

const searchProperty = async (req, res) => {
  try {
    const properties = await PropertyModel.searchProperty(req.body || {})
    return res.success(200, MSG.SEARCH_PROPERTY, properties)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

const autoCompleteSearch = async (req, res) => {
  try {
    const query = { q: req.query.q, limit: req.query.limit ? Number(req.query.limit) : undefined }
    const { q, limit } = query

    const properties = await PropertyModel.autoCompleteSearch(q, limit)
    return res.success(200, MSG.AUTO_COMPLETE, properties)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

const downloadSample = async (req, res) => {
  try {
    const workbook = new ExcelJS.Workbook()
    const sheet = workbook.addWorksheet('Properties')

    // Set columns
    sheet.columns = BULK_UPLOAD_COLUMNS.map(col => ({
      header: col.header,
      key: col.key,
      width: col.width,
    }))

    // Style header row
    const headerRow = sheet.getRow(1)
    headerRow.eachCell(cell => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF8A2BE2' } }
      cell.alignment = { horizontal: 'center', vertical: 'middle' }
      cell.border = {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' },
      }
    })

    // Add example data row
    const exampleData = {}
    BULK_UPLOAD_COLUMNS.forEach(col => {
      exampleData[col.key] = col.example
    })
    sheet.addRow(exampleData)

    // Add a "Required?" indicator row
    const requiredData = {}
    BULK_UPLOAD_COLUMNS.forEach(col => {
      requiredData[col.key] = col.required ? 'REQUIRED' : 'optional'
    })
    const reqRow = sheet.addRow(requiredData)
    reqRow.eachCell(cell => {
      cell.font = {
        italic: true,
        color: { argb: cell.value === 'REQUIRED' ? 'FFFF0000' : 'FF888888' },
      }
    })

    // Write to buffer
    const buffer = await workbook.xlsx.writeBuffer()

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', 'attachment; filename="bulk-upload-sample.xlsx"')
    return res.end(Buffer.from(buffer))
  } catch (err) {
    return res.error(500, err.message)
  }
}

const bulkUploadProperties = async (req, res) => {
  try {
    logger.info({ body: req.body, hasFile: !!req.file, query: req.query }, 'Bulk upload debug')
    const userId = req.body?.userId || req.query?.userId
    if (!userId) {
      return res.error(400, 'userId is required')
    }

    const file = req.file
    if (!file) {
      return res.error(400, BULK_MSG.NO_FILE)
    }

    if (!file.originalname.endsWith('.xlsx')) {
      return res.error(400, BULK_MSG.INVALID_FORMAT)
    }

    // Upload to S3 for audit trail
    try {
      const base64 = file.buffer.toString('base64')
      await uploadBase64File(
        base64,
        `${userId}_${Date.now()}.xlsx`,
        file.mimetype,
        'bulk-upload'
      )
    } catch (s3Err) {
      logger.error(s3Err, 'S3 upload failed for bulk file')
    }

    // Parse Excel
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(file.buffer)
    const sheet = workbook.getWorksheet(1)

    if (!sheet || sheet.rowCount < 2) {
      return res.error(400, BULK_MSG.NO_DATA_ROWS)
    }

    // Get headers from row 1
    const headers = []
    sheet.getRow(1).eachCell((cell, colNumber) => {
      headers[colNumber] = String(cell.value).trim()
    })

    // Parse data rows
    const rows = []
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return

      const rowData = {}
      let hasData = false
      row.eachCell((cell, colNumber) => {
        const key = headers[colNumber]
        if (key) {
          let val = cell.value
          if (val && typeof val === 'object' && val.result !== undefined) val = val.result
          if (val && typeof val === 'object' && val.richText) val = val.richText.map(r => r.text).join('')
          rowData[key] = val
          if (val !== null && val !== undefined && String(val).trim() !== '') hasData = true
        }
      })

      // Skip the indicator row (row 3 in sample: "REQUIRED"/"optional" labels)
      if (rowNumber === 3) {
        const firstVal = String(Object.values(rowData)[0] || '').trim().toLowerCase()
        if (firstVal === 'required' || firstVal === 'optional') return
      }
      if (hasData) rows.push({ rowNumber, data: rowData })
    })

    if (rows.length === 0) {
      return res.error(400, BULK_MSG.NO_DATA_ROWS)
    }

    if (rows.length > 200) {
      return res.error(400, BULK_MSG.TOO_MANY_ROWS)
    }

    const results = { total: rows.length, succeeded: 0, failed: 0, errors: [] }
    const requiredCols = BULK_UPLOAD_COLUMNS.filter(c => c.required)
    const enumCols = BULK_UPLOAD_COLUMNS.filter(c => c.enum)
    const numericCols = BULK_UPLOAD_COLUMNS.filter(c => c.type === 'number')

    for (const { rowNumber, data } of rows) {
      const rowErrors = []

      for (const col of requiredCols) {
        if (!data[col.key] || String(data[col.key]).trim() === '') {
          rowErrors.push({ row: rowNumber, field: col.key, message: 'Required field missing' })
        }
      }

      for (const col of enumCols) {
        if (data[col.key] && !col.enum.includes(String(data[col.key]).trim())) {
          rowErrors.push({
            row: rowNumber,
            field: col.key,
            message: `Invalid value '${data[col.key]}'. Must be one of: ${col.enum.join(', ')}`,
          })
        }
      }

      for (const col of numericCols) {
        if (data[col.key] !== undefined && data[col.key] !== null && data[col.key] !== '') {
          const num = Number(data[col.key])
          if (isNaN(num)) {
            rowErrors.push({ row: rowNumber, field: col.key, message: `Must be a number, got '${data[col.key]}'` })
          }
        }
      }

      if (rowErrors.length > 0) {
        results.failed += 1
        results.errors.push(...rowErrors)
        continue
      }

      try {
        const city = String(data.city).trim()
        const state = String(data.state).trim()
        const pincode = data.pincode ? String(data.pincode).trim() : ''
        const coordinates = await geocodeAddress(city, state, pincode)

        const address = await addressModel.create({
          userId,
          city,
          state,
          pincode,
          geoLocation: { type: 'Point', coordinates },
        })

        const parseCSV = (val) => {
          if (!val) return []
          return String(val).split(',').map(s => s.trim()).filter(Boolean)
        }

        const s = (data.state || 'XX').toString().slice(0, 2).toUpperCase()
        const c = (data.city || 'XXX').toString().slice(0, 3).toUpperCase()
        const rand = crypto.randomBytes(2).toString('hex').toUpperCase()
        let uniquePropertyCode = `${s}-${c}-00000-${rand}`
        let tries = 0
        while (await propertyModel.exists({ uniquePropertyCode })) {
          tries += 1
          uniquePropertyCode = `${s}-${c}-00000-${rand}-${tries}`
        }

        const rentAmount = Number(data.rent) || 0
        const property = await propertyModel.create({
          ownerId: userId,
          addressId: address._id,
          propertyName: String(data.propertyName).trim(),
          propertyType: String(data.propertyType).trim(),
          bhkType: data.bhkType ? String(data.bhkType).trim() : undefined,
          size: data.size ? Number(data.size) : undefined,
          floor: data.floor ? Number(data.floor) : undefined,
          totalFloors: data.totalFloors ? Number(data.totalFloors) : undefined,
          availableFrom: data.availableFrom ? new Date(data.availableFrom) : undefined,
          preferredTenant: data.preferredTenant ? String(data.preferredTenant).trim() : undefined,
          furnishing: data.furnishing ? String(data.furnishing).trim() : 'unfurnished',
          parking: data.parking === true || String(data.parking).toLowerCase() === 'true',
          features: parseCSV(data.features),
          highlights: parseCSV(data.highlights),
          description: data.description ? String(data.description).trim() : undefined,
          minAmount: data.minAmount ? Number(data.minAmount) : rentAmount,
          maxAmount: data.maxAmount ? Number(data.maxAmount) : rentAmount,
          uniquePropertyCode,
          isActive: true,
        })

        await roomModel.create({
          propertyId: property._id,
          addressId: address._id,
          roomNumber: data.roomNumber ? String(data.roomNumber).trim() : '1',
          roomType: String(data.roomType).trim(),
          rent: rentAmount,
          rentDueDay: data.rentDueDay ? Number(data.rentDueDay) : 1,
          maintenanceCharge: {
            amount: data.maintenanceCharge ? Number(data.maintenanceCharge) : 0,
            frequency: 'monthly',
          },
          securityDeposit: {
            months: data.securityDeposit ? Number(data.securityDeposit) : 1,
          },
          amenities: parseCSV(data.amenities),
          isAvailable: true,
        })

        // Link property to owner's ownedProperties
        await ownerModel.findOneAndUpdate(
          { userId },
          { $addToSet: { ownedProperties: property._id } }
        )

        results.succeeded += 1
      } catch (createErr) {
        results.failed += 1
        results.errors.push({
          row: rowNumber,
          field: 'general',
          message: createErr.message,
        })
      }
    }

    const statusCode = results.failed === results.total ? 400 : 200
    const message = results.failed === 0
      ? BULK_MSG.UPLOAD_SUCCESS
      : `${BULK_MSG.UPLOAD_SUCCESS} with ${results.failed} error(s)`

    return res.success(statusCode, message, results)
  } catch (err) {
    logger.error(err, 'Bulk upload failed')
    return res.error(500, err.message)
  }
}

const PropertyController = {
  createProperty,
  getProperties,
  getPropertyById,
  getPropertyByCode,
  updatePropertyById,
  softDeletePropertyById,
  restorePropertyById,
  archiveProperty,
  deletePropertyById,
  getAllPropertiesOfOwner,
  recomputeRating,
  nearby,
  addImage,
  removeImage,
  bulkUpdate,
  validateCode,
  getStats,
  getSimilarById,
  getSimilarByCode,
  searchProperty,
  autoCompleteSearch,
  downloadSample,
  bulkUploadProperties,
}

export default PropertyController
