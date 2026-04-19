import { express, configureRouter } from '../../helper/index.js'
import RoomController from './Room.Controller.js'
import RoomValidator from './Room.Validator.js'

const {
  createRoom,
  getRooms,
  getRoomById,
  updateRoomById,
  deleteRoomById,
  assignTenant,
  vacateTenant
} = RoomController

const config = {
  preMiddlewares: [],
  postMiddlewares: [],
  routesConfig: {
    createRoom: {
      method: 'post',
      path: '/',
      enabled: true,
      prePipeline: [RoomValidator.validateCreateRoom],
      pipeline: [createRoom]
    },
    getRooms: {
      method: 'post',
      path: '/list',
      enabled: true,
      prePipeline: [],
      pipeline: [getRooms]
    },
    getRoomById: {
      method: 'post',
      path: '/getById',
      enabled: true,
      prePipeline: [],
      pipeline: [getRoomById]
    },
    updateRoomById: {
      method: 'put',
      path: '/updateById',
      enabled: true,
      prePipeline: [RoomValidator.validateUpdateRoom],
      pipeline: [updateRoomById]
    },
    deleteRoomById: {
      method: 'delete',
      path: '/deleteById',
      enabled: true,
      prePipeline: [RoomValidator.validateGetRoomById],
      pipeline: [deleteRoomById]
    },
    assignTenant: {
      method: 'post',
      path: '/assign-tenant',
      enabled: true,
      prePipeline: [],
      pipeline: [assignTenant]
    },
    vacateTenant: {
      method: 'post',
      path: '/vacate-tenant',
      enabled: true,
      prePipeline: [],
      pipeline: [vacateTenant]
    }
  }
}

const RoomRouter = configureRouter(express.Router(), config)

export default RoomRouter

