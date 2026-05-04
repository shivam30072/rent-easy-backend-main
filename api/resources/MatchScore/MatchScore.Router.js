import { express, configureRouter } from '../../helper/index.js'
import MatchScoreController from './MatchScore.Controller.js'
import { authMiddleware } from '../../middleware/authMiddleware.js'

const { feed, score, dealbreakerRadar, scoreDebug } = MatchScoreController

const config = {
  preMiddlewares: [authMiddleware],
  postMiddlewares: [],
  routesConfig: {
    feed: { method: 'post', path: '/feed', enabled: true, prePipeline: [], pipeline: [feed] },
    score: { method: 'post', path: '/score', enabled: true, prePipeline: [], pipeline: [score] },
    dealbreakerRadar: { method: 'post', path: '/dealbreaker-radar', enabled: true, prePipeline: [], pipeline: [dealbreakerRadar] },
    scoreDebug: { method: 'post', path: '/score-debug', enabled: true, prePipeline: [], pipeline: [scoreDebug] },
  },
}

const MatchScoreRouter = configureRouter(express.Router(), config)
export default MatchScoreRouter
