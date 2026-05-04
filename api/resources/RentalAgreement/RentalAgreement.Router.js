import { express, configureRouter } from '../../helper/index.js'
import RentalAgreementController from './RentalAgreement.Controller.js'
import RentalAgreementValidator from './RentalAgreement.Validator.js'
import { authMiddleware } from '../../middleware/authMiddleware.js'
import { requireRatingsSubmitted } from '../../middleware/requireRatingsSubmitted.js'
import { processExitDateReached } from '../../cron/leave-exit/leaveExit.service.js'

const {
  createAgreement,
  listAgreements,
  getAgreementById,
  updateAgreementById,
  terminateAgreement,
  submitLeaveNotice,
  addDamages,
  markRefundPaid,
  raiseSettlementDispute,
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
      prePipeline: [authMiddleware, requireRatingsSubmitted, RentalAgreementValidator.validateCreateAgreement],
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
      prePipeline: [authMiddleware, RentalAgreementValidator.validateIdInBody],
      pipeline: [terminateAgreement]
    },
    submitLeaveNotice: {
      method: 'post',
      path: '/:id/leave-notice',
      enabled: true,
      prePipeline: [authMiddleware, RentalAgreementValidator.validateLeaveNoticeBody],
      pipeline: [submitLeaveNotice]
    },
    addDamages: {
      method: 'post',
      path: '/:id/settlement/damages',
      enabled: true,
      prePipeline: [authMiddleware, RentalAgreementValidator.validateDamagesBody],
      pipeline: [addDamages]
    },
    markRefundPaid: {
      method: 'post',
      path: '/:id/settlement/mark-paid',
      enabled: true,
      prePipeline: [authMiddleware],
      pipeline: [markRefundPaid]
    },
    raiseSettlementDispute: {
      method: 'post',
      path: '/:id/settlement/dispute',
      enabled: true,
      prePipeline: [authMiddleware],
      pipeline: [raiseSettlementDispute],
    },
    runLeaveExitCron: {
      method: 'post',
      path: '/admin/run-leave-exit-cron',
      enabled: true,
      prePipeline: [authMiddleware],
      pipeline: [async (req, res) => {
        try {
          const now = req.body?.now ? new Date(req.body.now) : new Date()
          const result = await processExitDateReached(now)
          return res.success(200, 'cron ran', { now: now.toISOString(), ...result })
        } catch (err) {
          console.error('[runLeaveExitCron] error:', err)
          return res.status(500).json({ error: err.message })
        }
      }],
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
