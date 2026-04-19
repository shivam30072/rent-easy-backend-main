import { express, configureRouter } from '../../helper/index.js'
import RentalAgreementController from './RentalAgreement.Controller.js'
import RentalAgreementValidator from './RentalAgreement.Validator.js'

const {
  createAgreement,
  listAgreements,
  getAgreementById,
  updateAgreementById,
  terminateAgreement,
  deleteAgreement,
  generatePdfAndSend,
  getAgreementsByTenant,
  getAgreementsByOwner,
  handleDigioWebhook
} = RentalAgreementController

const config = {
  preMiddlewares: [],
  enabled: true,
  postMiddlewares: [],
  routesConfig: {
    createAgreement: {
      method: 'post',
      path: '/',
      enabled: true,
      prePipeline: [RentalAgreementValidator.validateCreateAgreement],
      pipeline: [createAgreement]
    },
    listAgreements: {
      method: 'post',
      path: '/list',
      enabled: true,
      prePipeline: [],
      pipeline: [listAgreements]
    },
    getAgreementById: {
      method: 'post',
      path: '/getById',
      enabled: true,
      prePipeline: [RentalAgreementValidator.validateIdInBody],
      pipeline: [getAgreementById]
    },
    updateAgreementById: {
      method: 'put',
      path: '/updateById',
      enabled: true,
      prePipeline: [RentalAgreementValidator.validateIdInBody],
      pipeline: [updateAgreementById]
    },
    terminateAgreement: {
      method: 'put',
      path: '/terminate',
      enabled: true,
      prePipeline: [RentalAgreementValidator.validateIdInBody],
      pipeline: [terminateAgreement]
    },
    deleteAgreement: {
      method: 'delete',
      path: '/deleteById',
      enabled: true,
      prePipeline: [RentalAgreementValidator.validateIdInBody],
      pipeline: [deleteAgreement]
    },
    generatePdfAndSend: {
      method: 'post',
      path: '/generatePdf',
      enabled: true,
      prePipeline: [RentalAgreementValidator.validateIdInBody],
      pipeline: [generatePdfAndSend]
    },
    getAgreementsByTenant: {
      method: 'get',
      path: '/tenant',
      enabled: true,
      prePipeline: [],
      pipeline: [getAgreementsByTenant]
    },
    getAgreementsByOwner: {
      method: 'get',
      path: '/owner',
      enabled: true,
      prePipeline: [],
      pipeline: [getAgreementsByOwner]
    },
    handleDigioWebhook: {
      method: 'post',
      path: '/digio-webhook',
      enabled: true,
      prePipeline: [],
      pipeline: [handleDigioWebhook]
    }
  }
}

const RentalAgreementRouter = configureRouter(express.Router(), config)

export default RentalAgreementRouter
