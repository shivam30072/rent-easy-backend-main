import { express, configureRouter } from '../../helper/index.js'
import AddressController from './Address.Controller.js'

const {
  getAddressByUserId,
  getAddressById,
  createAddress,
  updateAddressByAddressId,
  deleteAddress
} = AddressController

const config = {
  preMiddlewares: [],
  postMiddlewares: [],
  routesConfig: {
    getAddressByUserId: {
      method: 'post',
      path: '/get-by-user',
      enabled: true,
      prePipeline: [],
      pipeline: [getAddressByUserId]
    },
    getAddressById: {
      method: 'post',
      path: '/get-by-id',
      enabled: true,
      prePipeline: [],
      pipeline: [getAddressById]
    },
    createAddress: {
      method: 'post',
      path: '/create',
      enabled: true,
      prePipeline: [],
      pipeline: [createAddress]
    },
    updateAddressByAddressId: {
      method: 'put',
      path: '/update',
      enabled: true,
      prePipeline: [],
      pipeline: [updateAddressByAddressId]
    },
    deleteAddress: {
      method: 'post',
      path: '/delete',
      enabled: true,
      prePipeline: [],
      pipeline: [deleteAddress]
    }
  }
}

const AddressRouter = configureRouter(express.Router(), config)

export default AddressRouter
