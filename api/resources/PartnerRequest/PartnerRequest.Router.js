import { express, configureRouter } from '../../helper/index.js'
import PartnerRequestController from './PartnerRequest.Controller.js'
import { authMiddleware } from '../../middleware/authMiddleware.js'

const {
  sendRequest,
  respondToRequest,
  getMyRequests,
  getIncomingRequests,
  getMatches,
  shareContact,
} = PartnerRequestController

const config = {
  preMiddlewares: [authMiddleware],
  postMiddlewares: [],
  routesConfig: {
    sendRequest: {
      method: 'post',
      path: '/send',
      enabled: true,
      prePipeline: [],
      pipeline: [sendRequest],
    },
    respondToRequest: {
      method: 'post',
      path: '/respond',
      enabled: true,
      prePipeline: [],
      pipeline: [respondToRequest],
    },
    getMyRequests: {
      method: 'post',
      path: '/my-requests',
      enabled: true,
      prePipeline: [],
      pipeline: [getMyRequests],
    },
    getIncomingRequests: {
      method: 'post',
      path: '/incoming',
      enabled: true,
      prePipeline: [],
      pipeline: [getIncomingRequests],
    },
    getMatches: {
      method: 'post',
      path: '/matches',
      enabled: true,
      prePipeline: [],
      pipeline: [getMatches],
    },
    shareContact: {
      method: 'post',
      path: '/share-contact',
      enabled: true,
      prePipeline: [],
      pipeline: [shareContact],
    },
  },
}

const PartnerRequestRouter = configureRouter(express.Router(), config)

export default PartnerRequestRouter
