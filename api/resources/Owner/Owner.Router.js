import { express, configureRouter } from '../../helper/index.js'
import OwnerController from './Owner.Controller.js'
import OwnerValidator from './Owner.Validator.js'

const {
  createOwner,
  getOwners,
  getOwnerById,
  getOwnerByUserId,
  updateOwner,
  deleteOwner,
  getOwnerDashboard
} = OwnerController

const config = {
  preMiddlewares: [],
  postMiddlewares: [],
  routesConfig: {
    createOwner: {
      method: 'post',
      path: '/',
      enabled: true,
      prePipeline: [OwnerValidator.validateCreateOwner],
      pipeline: [createOwner]
    },
    getOwners: {
      method: 'get',
      path: '/',
      enabled: true,
      prePipeline: [],
      pipeline: [getOwners]
    },
    getOwnerByUserId: {
      method: 'post',
      path: '/get-by-user-id',
      enabled: true,
      prePipeline: [],
      pipeline: [getOwnerByUserId]
    },
    getOwnerById: {
      method: 'get',
      path: '/:id',
      enabled: true,
      prePipeline: [],
      pipeline: [getOwnerById]
    },
    updateOwner: {
      method: 'put',
      path: '/:id',
      enabled: true,
      prePipeline: [],
      pipeline: [updateOwner]
    },
    deleteOwner: {
      method: 'delete',
      path: '/:id',
      enabled: true,
      prePipeline: [],
      pipeline: [deleteOwner]
    },
    getOwnerDashboard: {
      method: 'get',
      path: '/:ownerId/dashboard',
      enabled: true,
      prePipeline: [],
      pipeline: [getOwnerDashboard]
    }
  }
}

const OwnerRouter = configureRouter(express.Router(), config)

export default OwnerRouter
