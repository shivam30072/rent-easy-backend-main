import { express, configureRouter } from '../../helper/index.js'
import PartnerProfileController from './PartnerProfile.Controller.js'
import { authMiddleware } from '../../middleware/authMiddleware.js'

const {
  create, update, getMine, getByUser, uploadPhoto, uploadVoiceIntro,
  setPulse, setWeightBoost, completionStatus,
} = PartnerProfileController

const config = {
  preMiddlewares: [authMiddleware],
  postMiddlewares: [],
  routesConfig: {
    create: { method: 'post', path: '/create', enabled: true, prePipeline: [], pipeline: [create] },
    update: { method: 'post', path: '/update', enabled: true, prePipeline: [], pipeline: [update] },
    getMine: { method: 'post', path: '/get-mine', enabled: true, prePipeline: [], pipeline: [getMine] },
    getByUser: { method: 'post', path: '/get-by-user', enabled: true, prePipeline: [], pipeline: [getByUser] },
    uploadPhoto: { method: 'post', path: '/upload-photo', enabled: true, prePipeline: [], pipeline: [uploadPhoto] },
    uploadVoiceIntro: { method: 'post', path: '/upload-voice-intro', enabled: true, prePipeline: [], pipeline: [uploadVoiceIntro] },
    setPulse: { method: 'post', path: '/set-pulse', enabled: true, prePipeline: [], pipeline: [setPulse] },
    setWeightBoost: { method: 'post', path: '/set-weight-boost', enabled: true, prePipeline: [], pipeline: [setWeightBoost] },
    completionStatus: { method: 'post', path: '/completion-status', enabled: true, prePipeline: [], pipeline: [completionStatus] },
  },
}

const PartnerProfileRouter = configureRouter(express.Router(), config)

export default PartnerProfileRouter
