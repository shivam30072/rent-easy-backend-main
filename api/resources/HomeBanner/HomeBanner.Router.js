import { express, configureRouter } from '../../helper/index.js'
import HomeBannerController from './HomeBanner.Controller.js'
import { authMiddleware, requireRole } from '../../middleware/authMiddleware.js'

const {
  getActiveBanners,
  listBanners,
  createBanner,
  updateBanner,
  deleteBanner,
} = HomeBannerController

const adminOnly = [authMiddleware, requireRole(['admin'])]

const config = {
  preMiddlewares: [],
  postMiddlewares: [],
  routesConfig: {
    getActiveBanners: {
      method: 'get',
      path: '/active',
      enabled: true,
      prePipeline: [],
      pipeline: [getActiveBanners],
    },
    listBanners: {
      method: 'get',
      path: '/',
      enabled: true,
      prePipeline: adminOnly,
      pipeline: [listBanners],
    },
    createBanner: {
      method: 'post',
      path: '/',
      enabled: true,
      prePipeline: adminOnly,
      pipeline: [createBanner],
    },
    updateBanner: {
      method: 'put',
      path: '/:id',
      enabled: true,
      prePipeline: adminOnly,
      pipeline: [updateBanner],
    },
    deleteBanner: {
      method: 'delete',
      path: '/:id',
      enabled: true,
      prePipeline: adminOnly,
      pipeline: [deleteBanner],
    },
  },
}

const HomeBannerRouter = configureRouter(express.Router(), config)

export default HomeBannerRouter
