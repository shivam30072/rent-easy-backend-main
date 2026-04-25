import { express, configureRouter } from '../../helper/index.js'
import AgreementRequestController from './AgreementRequest.Controller.js'
import { authMiddleware } from '../../middleware/authMiddleware.js'
import { isKycVerified } from '../../middleware/kycMiddleware.js'
import { requireRatingsSubmitted } from '../../middleware/requireRatingsSubmitted.js'

const {
  createRequest,
  respondToRequest,
  getRequestStatus,
  getPendingForOwner
} = AgreementRequestController

const config = {
  preMiddlewares: [],
  postMiddlewares: [],
  routesConfig: {
    createRequest: {
      method: 'post',
      path: '/',
      enabled: true,
      prePipeline: [authMiddleware, isKycVerified],
      pipeline: [createRequest]
    },
    respondToRequest: {
      method: 'patch',
      path: '/respond',
      enabled: true,
      prePipeline: [authMiddleware, requireRatingsSubmitted],
      pipeline: [respondToRequest]
    },
    getRequestStatus: {
      method: 'get',
      path: '/status',
      enabled: true,
      prePipeline: [],
      pipeline: [getRequestStatus]
    },
    getPendingForOwner: {
      method: 'get',
      path: '/pending',
      enabled: true,
      prePipeline: [],
      pipeline: [getPendingForOwner]
    }
  }
}

const AgreementRequestRouter = configureRouter(express.Router(), config)

export default AgreementRequestRouter