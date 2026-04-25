import { express, configureRouter } from '../../helper/index.js'
import ReputationController from './Reputation.Controller.js'
import { authMiddleware, requireRole } from '../../middleware/authMiddleware.js'

const {
  getScore,
  getMultipleScores,
  getBreakdown,
  adminListSignals,
  adminForceRecompute,
  adminInvalidateSignal,
} = ReputationController

const config = {
  preMiddlewares: [],
  postMiddlewares: [],
  routesConfig: {
    getScore: {
      method: 'post',
      path: '/getScore',
      enabled: true,
      prePipeline: [],
      pipeline: [getScore],
    },
    getMultipleScores: {
      method: 'post',
      path: '/getMultipleScores',
      enabled: true,
      prePipeline: [],
      pipeline: [getMultipleScores],
    },
    getBreakdown: {
      method: 'post',
      path: '/getBreakdown',
      enabled: true,
      prePipeline: [authMiddleware],
      pipeline: [getBreakdown],
    },
    adminListSignals: {
      method: 'get',
      path: '/admin/signals',
      enabled: true,
      prePipeline: [authMiddleware, requireRole(['admin'])],
      pipeline: [adminListSignals],
    },
    adminForceRecompute: {
      method: 'post',
      path: '/admin/recompute',
      enabled: true,
      prePipeline: [authMiddleware, requireRole(['admin'])],
      pipeline: [adminForceRecompute],
    },
    adminInvalidateSignal: {
      method: 'patch',
      path: '/admin/signal/:id',
      enabled: true,
      prePipeline: [authMiddleware, requireRole(['admin'])],
      pipeline: [adminInvalidateSignal],
    },
  },
}

const ReputationRouter = configureRouter(express.Router(), config)

export default ReputationRouter
