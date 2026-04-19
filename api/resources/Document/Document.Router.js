import { express, configureRouter } from '../../helper/index.js'
import DocumentController from './Document.Controller.js'
import DocumentValidator from './Document.Validator.js'

const {
  createDocument,
  getDocuments,
  getDocumentById,
  updateDocumentById,
  deleteDocument,
  getAllDocumentsByUserId,
  updateDocumentsByUserId,
  deleteDocumentsByUserId,
  getDocumentByType,
  uploadBase64
} = DocumentController

const config = {
  preMiddlewares: [],
  postMiddlewares: [],
  routesConfig: {
    createDocument: {
      method: 'post',
      path: '/',
      enabled: true,
      prePipeline: [DocumentValidator.validateCreateDocument],
      pipeline: [createDocument]
    },
    getDocuments: {
      method: 'get',
      path: '/',
      enabled: true,
      prePipeline: [],
      pipeline: [getDocuments]
    },
    getDocumentById: {
      method: 'post',
      path: '/getById',
      enabled: true,
      prePipeline: [DocumentValidator.validateGetDocumentById],
      pipeline: [getDocumentById]
    },
    updateDocumentById: {
      method: 'put',
      path: '/updateById',
      enabled: true,
      prePipeline: [DocumentValidator.validateUpdateDocumentById],
      pipeline: [updateDocumentById]
    },
    deleteDocument: {
      method: 'delete',
      path: '/deleteById',
      enabled: true,
      prePipeline: [DocumentValidator.validateDeleteDocument],
      pipeline: [deleteDocument]
    },
    getAllDocumentsByUserId: {
      method: 'post',
      path: '/getAllByUserId',
      enabled: true,
      prePipeline: [DocumentValidator.validateGetAllDocumentsByUserId],
      pipeline: [getAllDocumentsByUserId]
    },
    updateDocumentsByUserId: {
      method: 'put',
      path: '/getAllByUserId',
      enabled: true,
      prePipeline: [DocumentValidator.validateUpdateDocumentsByUserId],
      pipeline: [updateDocumentsByUserId]
    },
    deleteDocumentsByUserId: {
      method: 'delete',
      path: '/deleteByUserId',
      enabled: true,
      prePipeline: [DocumentValidator.validateDeleteDocumentsByUserId],
      pipeline: [deleteDocumentsByUserId]
    },
    getDocumentByType: {
      method: 'post',
      path: '/getByType',
      enabled: true,
      prePipeline: [DocumentValidator.validateGetDocumentByType],
      pipeline: [getDocumentByType]
    },
    uploadBase64: {
      method: 'post',
      path: '/upload-base64',
      enabled: true,
      prePipeline: [],
      pipeline: [uploadBase64]
    }
  }
}

const DocumentRouter = configureRouter(express.Router(), config)

export default DocumentRouter
