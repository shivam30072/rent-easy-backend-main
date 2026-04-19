import { express, configureRouter } from '../../helper/index.js'
import PropertyController from './Property.Controller.js'
import PropertyValidator from './Property.Validator.js'
import { authMiddleware } from '../../middleware/authMiddleware.js'
import { isKycVerified } from '../../middleware/kycMiddleware.js'
import multer from 'multer'

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.originalname.endsWith('.xlsx')) {
      cb(null, true)
    } else {
      cb(new Error('Only .xlsx files are accepted'), false)
    }
  },
})

const {
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
  bulkUploadProperties
} = PropertyController

const config = {
  preMiddlewares: [],
  postMiddlewares: [],
  routesConfig: {
    createProperty: {
      method: 'post',
      path: '/',
      enabled: true,
      prePipeline: [PropertyValidator.validateCreateProperty],
      pipeline: [createProperty]
    },
    getProperties: {
      method: 'post',
      path: '/list',
      enabled: true,
      prePipeline: [PropertyValidator.validateList],
      pipeline: [getProperties]
    },
    getPropertyById: {
      method: 'post',
      path: '/getById',
      enabled: true,
      prePipeline: [PropertyValidator.validateGetPropertyById],
      pipeline: [getPropertyById]
    },
    getPropertyByCode: {
      method: 'get',
      path: '/byCode/:code',
      enabled: true,
      prePipeline: [PropertyValidator.validateCode],
      pipeline: [getPropertyByCode]
    },
    validateCodePost: {
      method: 'post',
      path: '/validate-code',
      enabled: true,
      prePipeline: [PropertyValidator.validateCode],
      pipeline: [validateCode]
    },
    validateCodeGet: {
      method: 'get',
      path: '/validate-code/:code',
      enabled: true,
      prePipeline: [PropertyValidator.validateCode],
      pipeline: [validateCode]
    },
    updatePropertyById: {
      method: 'put',
      path: '/updateById',
      enabled: true,
      prePipeline: [PropertyValidator.validateUpdateProperty],
      pipeline: [updatePropertyById]
    },
    softDeletePropertyById: {
      method: 'delete',
      path: '/softDeleteById',
      enabled: true,
      prePipeline: [PropertyValidator.validateGetPropertyById],
      pipeline: [softDeletePropertyById]
    },
    restorePropertyById: {
      method: 'put',
      path: '/restoreById',
      enabled: true,
      prePipeline: [PropertyValidator.validateGetPropertyById],
      pipeline: [restorePropertyById]
    },
    archiveProperty: {
      method: 'put',
      path: '/archive',
      enabled: true,
      prePipeline: [],
      pipeline: [archiveProperty]
    },
    deletePropertyById: {
      method: 'delete',
      path: '/deleteById',
      enabled: true,
      prePipeline: [PropertyValidator.validateGetPropertyById],
      pipeline: [deletePropertyById]
    },
    getAllPropertiesOfOwner: {
      method: 'post',
      path: '/getOwnersProperty',
      enabled: true,
      prePipeline: [],
      pipeline: [getAllPropertiesOfOwner]
    },
    recomputeRating: {
      method: 'post',
      path: '/recomputeRating',
      enabled: true,
      prePipeline: [],
      pipeline: [recomputeRating]
    },
    nearby: {
      method: 'post',
      path: '/nearby',
      enabled: true,
      prePipeline: [PropertyValidator.validateGeoNearby],
      pipeline: [nearby]
    },
    addImage: {
      method: 'post',
      path: '/image/add',
      enabled: true,
      prePipeline: [],
      pipeline: [addImage]
    },
    removeImage: {
      method: 'post',
      path: '/image/remove',
      enabled: true,
      prePipeline: [],
      pipeline: [removeImage]
    },
    bulkUpdate: {
      method: 'post',
      path: '/bulkUpdate',
      enabled: true,
      prePipeline: [],
      pipeline: [bulkUpdate]
    },
    getStats: {
      method: 'post',
      path: '/stats',
      enabled: true,
      prePipeline: [],
      pipeline: [getStats]
    },
    getSimilarById: {
      method: 'post',
      path: '/similar/byId',
      enabled: true,
      prePipeline: [],
      pipeline: [getSimilarById]
    },
    getSimilarByCode: {
      method: 'get',
      path: '/similar/byCode/:code',
      enabled: true,
      prePipeline: [],
      pipeline: [getSimilarByCode]
    },
    searchProperty: {
      method: 'post',
      path: '/search',
      enabled: true,
      prePipeline: [],
      pipeline: [searchProperty]
    },
    autoCompleteSearch: {
      method: 'post',
      path: '/autocomplete',
      enabled: true,
      prePipeline: [],
      pipeline: [autoCompleteSearch]
    },
    downloadBulkSample: {
      method: 'get',
      path: '/bulk-upload/sample',
      enabled: true,
      prePipeline: [],
      pipeline: [downloadSample]
    },
    bulkUploadProperties: {
      method: 'post',
      path: '/bulk-upload',
      enabled: true,
      prePipeline: [upload.single('file')],
      pipeline: [bulkUploadProperties]
    }
  }
}

const PropertyRouter = configureRouter(express.Router(), config)

export default PropertyRouter
