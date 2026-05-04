import { express, configureRouter } from '../../helper/index.js'
import SwipeActionController from './SwipeAction.Controller.js'
import { authMiddleware } from '../../middleware/authMiddleware.js'

const { like, superLike, skip, undoLast } = SwipeActionController

const config = {
  preMiddlewares: [authMiddleware],
  postMiddlewares: [],
  routesConfig: {
    like: { method: 'post', path: '/like', enabled: true, prePipeline: [], pipeline: [like] },
    superLike: { method: 'post', path: '/super-like', enabled: true, prePipeline: [], pipeline: [superLike] },
    skip: { method: 'post', path: '/skip', enabled: true, prePipeline: [], pipeline: [skip] },
    undoLast: { method: 'post', path: '/undo-last', enabled: true, prePipeline: [], pipeline: [undoLast] },
  },
}

const SwipeActionRouter = configureRouter(express.Router(), config)
export default SwipeActionRouter
