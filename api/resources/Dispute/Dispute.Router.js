import { express, configureRouter } from '../../helper/index.js'
import DisputeController from './Dispute.Controller.js'
import { authMiddleware, requireRole } from '../../middleware/authMiddleware.js'

const { raise, getMine, adminResolve, adminListAll } = DisputeController

const config = {
  preMiddlewares: [],
  postMiddlewares: [],
  routesConfig: {
    raise: {
      method: 'post',
      path: '/raise',
      enabled: true,
      prePipeline: [authMiddleware],
      pipeline: [raise],
    },
    getMine: {
      method: 'get',
      path: '/mine',
      enabled: true,
      prePipeline: [authMiddleware],
      pipeline: [getMine],
    },
    adminResolve: {
      method: 'patch',
      path: '/admin/:id',
      enabled: true,
      prePipeline: [authMiddleware, requireRole(['admin'])],
      pipeline: [adminResolve],
    },
    adminListAll: {
      method: 'get',
      path: '/admin/list',
      enabled: true,
      prePipeline: [authMiddleware, requireRole(['admin'])],
      pipeline: [adminListAll],
    },
  },
}

const DisputeRouter = configureRouter(express.Router(), config)

export default DisputeRouter
