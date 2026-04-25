import { express, configureRouter } from '../../helper/index.js'
import RatingExchangeController from './RatingExchange.Controller.js'
import { authMiddleware } from '../../middleware/authMiddleware.js'

const { submit, getPending, getPublishedForUser } = RatingExchangeController

const config = {
  preMiddlewares: [],
  postMiddlewares: [],
  routesConfig: {
    submit: {
      method: 'post',
      path: '/submit',
      enabled: true,
      prePipeline: [authMiddleware],
      pipeline: [submit],
    },
    getPending: {
      method: 'get',
      path: '/pending',
      enabled: true,
      prePipeline: [authMiddleware],
      pipeline: [getPending],
    },
    getPublishedForUser: {
      method: 'post',
      path: '/published-for-user',
      enabled: true,
      prePipeline: [],
      pipeline: [getPublishedForUser],
    },
  },
}

const RatingExchangeRouter = configureRouter(express.Router(), config)

export default RatingExchangeRouter
