import { express, configureRouter } from '../../helper/index.js'
import UserController from './User.Controller.js'
import { authMiddleware } from '../../middleware/authMiddleware.js'

const {
  registerUser,
  loginUser,
  googleLogin,
  resetPassword,
  verifyResetToken,
  updatePassword,
  updateUser,
  getUserById,
  uploadProfileImage,
  updatePartnerRole,
} = UserController

const config = {
  preMiddlewares: [],
  postMiddlewares: [],
  routesConfig: {
    googleLogin: {
      method: 'post',
      path: '/google-login',
      enabled: true,
      prePipeline: [],
      pipeline: [googleLogin]
    },
    registerUser: {
      method: 'post',
      path: '/register',
      enabled: true,
      prePipeline: [],
      pipeline: [registerUser]
    },
    loginUser: {
      method: 'post',
      path: '/login',
      enabled: true,
      prePipeline: [],
      pipeline: [loginUser]
    },
    resetPassword: {
      method: 'post',
      path: '/reset-password',
      enabled: true,
      prePipeline: [],
      pipeline: [resetPassword]
    },
    verifyResetToken: {
      method: 'post',
      path: '/verify-reset-token',
      enabled: true,
      prePipeline: [],
      pipeline: [verifyResetToken]
    },
    updatePassword: {
      method: 'post',
      path: '/update-password',
      enabled: true,
      prePipeline: [],
      pipeline: [updatePassword]
    },
    updatePartnerRole: {
      method: 'post',
      path: '/update-partner-role',
      enabled: true,
      prePipeline: [authMiddleware],
      pipeline: [updatePartnerRole]
    },
    uploadProfileImage: {
      method: 'post',
      path: '/:id/profile-image',
      enabled: true,
      prePipeline: [],
      pipeline: [uploadProfileImage]
    },
    updateUser: {
      method: 'put',
      path: '/:id',
      enabled: true,
      prePipeline: [],
      pipeline: [updateUser]
    },
    getUserById: {
      method: 'get',
      path: '/:id',
      enabled: true,
      prePipeline: [],
      pipeline: [getUserById]
    }
  }
}

const UserRouter = configureRouter(express.Router(), config)

export default UserRouter

