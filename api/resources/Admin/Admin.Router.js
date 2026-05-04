import { express, configureRouter } from '../../helper/index.js'
import AdminController from './Admin.Controller.js'
import { authMiddleware } from '../../middleware/authMiddleware.js'

const { reseedDummies } = AdminController

const config = {
  preMiddlewares: [authMiddleware],
  postMiddlewares: [],
  routesConfig: {
    reseedDummies: { method: 'post', path: '/reseed-dummies', enabled: true, prePipeline: [], pipeline: [reseedDummies] },
  },
}

const AdminRouter = configureRouter(express.Router(), config)
export default AdminRouter
