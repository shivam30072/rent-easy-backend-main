import { express, configureRouter } from '../../helper/index.js'
import EnquiryController from './Enquiry.Controller.js'
import { authMiddleware } from '../../middleware/authMiddleware.js'
import { isKycVerified } from '../../middleware/kycMiddleware.js'
import { requireRatingsSubmitted } from '../../middleware/requireRatingsSubmitted.js'

const {
  createEnquiry,
  getOwnerEnquiries,
  getTenantEnquiries,
  getUnreadCount,
  markAsViewed
} = EnquiryController

const config = {
  preMiddlewares: [],
  postMiddlewares: [],
  routesConfig: {
    createEnquiry: {
      method: 'post',
      path: '/',
      enabled: true,
      prePipeline: [authMiddleware, isKycVerified, requireRatingsSubmitted],
      pipeline: [createEnquiry]
    },
    getOwnerEnquiries: {
      method: 'get',
      path: '/owner',
      enabled: true,
      prePipeline: [],
      pipeline: [getOwnerEnquiries]
    },
    getTenantEnquiries: {
      method: 'get',
      path: '/tenant',
      enabled: true,
      prePipeline: [],
      pipeline: [getTenantEnquiries]
    },
    getUnreadCount: {
      method: 'get',
      path: '/count',
      enabled: true,
      prePipeline: [],
      pipeline: [getUnreadCount]
    },
    markAsViewed: {
      method: 'patch',
      path: '/mark-viewed',
      enabled: true,
      prePipeline: [],
      pipeline: [markAsViewed]
    }
  }
}

const EnquiryRouter = configureRouter(express.Router(), config)

export default EnquiryRouter
