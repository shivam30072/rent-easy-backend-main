import { express, configureRouter } from '../../helper/index.js'
import RequestController from './Request.Controller.js'

const {
  createRequest,
  getRequestsForOwner,
  getRequestsForUser,
  acceptRequest,
  completeRequest,
  rejectRequest,
  deleteRequest,
  exportRequestsToExcel
} = RequestController

const config = {
  preMiddlewares: [],
  postMiddlewares: [],
  routesConfig: {
    createRequest: {
      method: 'post',
      path: '/',
      enabled: true,
      prePipeline: [],
      pipeline: [createRequest]
    },
    getRequestsForOwner: {
      method: 'get',
      path: '/owner',
      enabled: true,
      prePipeline: [],
      pipeline: [getRequestsForOwner]
    },
    getRequestsForUser: {
      method: 'get',
      path: '/user',
      enabled: true,
      prePipeline: [],
      pipeline: [getRequestsForUser]
    },
    acceptRequest: {
      method: 'patch',
      path: '/accept/:id',
      enabled: true,
      prePipeline: [],
      pipeline: [acceptRequest]
    },
    completeRequest: {
      method: 'patch',
      path: '/complete/:id',
      enabled: true,
      prePipeline: [],
      pipeline: [completeRequest]
    },
    rejectRequest: {
      method: 'patch',
      path: '/reject/:id',
      enabled: true,
      prePipeline: [],
      pipeline: [rejectRequest]
    },
    deleteRequest: {
      method: 'delete',
      path: '/:id',
      enabled: true,
      prePipeline: [],
      pipeline: [deleteRequest]
    },
    exportRequestsToExcel: {
      method: 'get',
      path: '/export/excel',
      enabled: true,
      prePipeline: [],
      pipeline: [exportRequestsToExcel]
    }
  }
}

const RequestRouter = configureRouter(express.Router(), config)

export default RequestRouter
