import { express, configureRouter } from '../../helper/index.js'
import PartnerListingController from './PartnerListing.Controller.js'
import { authMiddleware } from '../../middleware/authMiddleware.js'

const {
  createListing,
  updateListing,
  getListingById,
  listListings,
  getMyListings,
  closeListing,
  uploadImage,
} = PartnerListingController

const config = {
  preMiddlewares: [authMiddleware],
  postMiddlewares: [],
  routesConfig: {
    createListing: {
      method: 'post',
      path: '/create',
      enabled: true,
      prePipeline: [],
      pipeline: [createListing],
    },
    updateListing: {
      method: 'post',
      path: '/update',
      enabled: true,
      prePipeline: [],
      pipeline: [updateListing],
    },
    getListingById: {
      method: 'post',
      path: '/getById',
      enabled: true,
      prePipeline: [],
      pipeline: [getListingById],
    },
    listListings: {
      method: 'post',
      path: '/list',
      enabled: true,
      prePipeline: [],
      pipeline: [listListings],
    },
    getMyListings: {
      method: 'post',
      path: '/my-listings',
      enabled: true,
      prePipeline: [],
      pipeline: [getMyListings],
    },
    closeListing: {
      method: 'post',
      path: '/close',
      enabled: true,
      prePipeline: [],
      pipeline: [closeListing],
    },
    uploadImage: {
      method: 'post',
      path: '/upload-image',
      enabled: true,
      prePipeline: [],
      pipeline: [uploadImage],
    },
  },
}

const PartnerListingRouter = configureRouter(express.Router(), config)

export default PartnerListingRouter
