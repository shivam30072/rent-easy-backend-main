import { express, configureRouter } from '../../helper/index.js'
import DeviceTokenController from './DeviceToken.Controller.js'

const { registerToken, removeToken } = DeviceTokenController

const config = {
  preMiddlewares: [],
  postMiddlewares: [],
  routesConfig: {
    registerToken: {
      method: 'post',
      path: '/register',
      enabled: true,
      prePipeline: [],
      pipeline: [registerToken]
    },
    removeToken: {
      method: 'delete',
      path: '/remove',
      enabled: true,
      prePipeline: [],
      pipeline: [removeToken]
    }
  }
}

const DeviceTokenRouter = configureRouter(express.Router(), config)

export default DeviceTokenRouter
