import UserModel from './User.Model.js'
import { USER_MESSAGES } from './User.Constant.js'
import { uploadBase64File } from '../../helper/s3.js'
import { userModel } from './User.Schema.js'

const registerUser = async (req, res) => {
  const data = await UserModel.registerUserService(req.body)
  return res.success(201, USER_MESSAGES.USER_CREATED, data)
}

const googleLogin = async (req, res) => {
  const { token } = req.body
  const data = await UserModel.googleLoginService(token)

  return res.success(201, USER_MESSAGES.GOOGLE_LOGIN, data)
}

const loginUser = async (req, res) => {
  const data = await UserModel.loginUserService(req.body)
  return res.success(200, USER_MESSAGES.USER_LOGIN, data)
}

const resetPassword = async (req, res) => {
  const data = await UserModel.resetPasswordService(req.body)
  return res.success(200, USER_MESSAGES.RESET_PASSWORD, data)
}

const verifyResetToken = async (req, res) => {
  const data = await UserModel.verifyResetTokenService(req.body)
  return res.success(200, USER_MESSAGES.VERIFY_RESET_TOKEN, data)
}

const updatePassword = async (req, res) => {
  const data = await UserModel.updatePasswordService(req.body)
  return res.success(200, USER_MESSAGES.UPDATE_PASSWORD, data)
}

const updateUser = async (req, res) => {
    const { id } = req.params
    const data = await UserModel.updateUser(id, req.body)
    return res.success(200, USER_MESSAGES.UPDATE_SUCCESS, data)
}

const getUserById = async (req, res) => {
    const { id } = req.params
    const user = await UserModel.getUserById(id)
    if(!user) return res.status(404).json({ message: 'User not found' })
    return res.success(200, USER_MESSAGES.LOGGED_IN, user) // reusing a message or generic
}

const uploadProfileImage = async (req, res) => {
    const { id } = req.params
    const { base64, fileName, mimetype } = req.body
    if (!base64) {
      return res.status(400).json({ message: 'base64 image data is required' })
    }

    const prefix = `profileImg-${id}`
    const { url } = await uploadBase64File(base64, fileName || 'profile.jpg', mimetype || 'image/jpeg', prefix)

    const data = await UserModel.updateUser(id, { profileUrl: url })
    return res.success(200, USER_MESSAGES.UPDATE_SUCCESS, data)
}

const updatePartnerRole = async (req, res) => {
  try {
    const { partnerRole } = req.body
    if (!['owner', 'seeker'].includes(partnerRole)) {
      return res.error(400, 'Invalid partner role. Must be "owner" or "seeker".')
    }
    const user = await userModel.findByIdAndUpdate(
      req.user._id,
      { $set: { partnerRole } },
      { new: true }
    )
    return res.success(200, 'Partner role updated successfully.', user)
  } catch (err) {
    console.error('updatePartnerRole error:', err)
    return res.error(500, 'Failed to update partner role.', err.message)
  }
}

const UserController = {
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
}

export default UserController
