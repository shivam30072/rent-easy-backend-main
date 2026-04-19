import { userModel } from './User.Schema.js'
import {
   sendResetEmail,
   generateResetToken,
   verifyGoogleToken,
   hashPassword,
   comparePassword,
   isResetTokenUsed,
   markTokenAsUsed,
   generateToken,
   verifyToken
} from '../../helper/index.js'
import AppError from '../../helper/AppError.js'
import AddressModel from '../Address/Address.Model.js'
import { USER_MESSAGES, MESSAGES } from './User.Constant.js'

const {
  NOT_FOUND,
  INVALID_CREDENTIAL,
  TOKEN_REQUIRED,
  EMAIL_NOT_VERIFIED,
  EMAIL_NOT_REGISTERED,
  RESET_LINK_SENT,
  TOKEN_USED,
  TOKEN_EXPIRED,
  HASHED_PASSWORD_GOOGLE
} = MESSAGES

const registerUserService = async ({ name, email, password, phone, role, aadhaarNumber, kycVerified, address }) => {
  const passwordHash = await hashPassword(password)
  let createdAddress = null
  let user = null

  if (address) {
    createdAddress = await AddressModel.createAddress(address)
  }

  try {
    user = await userModel.create({
      name,
      email,
      passwordHash,
      phone,
      role,
      aadhaarNumber,
      kycVerified,
      address: createdAddress,
    })

    if (user && createdAddress?._id) {
      await AddressModel.updateAddressByAddressId(createdAddress._id, { ...address, userId: user._id })
    }

    const token = await generateToken(user._id)
    return { token, user, addressId: createdAddress?._id }

  } catch (err) {
    if (!user && createdAddress?._id) {
      await AddressModel.deleteAddress(createdAddress._id)
    }
    throw new AppError(err.message, 500)
  }
}

const loginUserService = async ({ email, password }) => {
  const user = await userModel.findOne({ email })
  if (!user) throw new AppError(NOT_FOUND, 404)

  const isValid = await comparePassword(password, user.passwordHash)
  if (!isValid) throw new AppError(INVALID_CREDENTIAL, 401)

  const token = await generateToken(user._id)
  return { token, user }
}

const googleLoginService = async (token) => {
  if (!token) throw new AppError(TOKEN_REQUIRED, 400)

  const userData = await verifyGoogleToken(token)
  if (!userData.email_verified) throw new AppError(EMAIL_NOT_VERIFIED, 401)

  let user = await userModel.findOne({ email: userData.email })

  if (!user) {
    user = await userModel.create({
      email: userData.email,
      name: userData.name,
      passwordHash: HASHED_PASSWORD_GOOGLE,
    })
  }

  const jwtToken = await generateToken(user)
  return { token: jwtToken, user }
}

const resetPasswordService = async ({ email }) => {
  const user = await userModel.findOne({ email })
  if (!user) throw new AppError(EMAIL_NOT_REGISTERED, 404)

  const token = generateResetToken(user._id)
  await sendResetEmail(email, token)
  return { message: RESET_LINK_SENT }
}

const verifyResetTokenService = async ({ token }) => {
  const alreadyUsed = await isResetTokenUsed(token)
  if (alreadyUsed) return { valid: false, message: TOKEN_USED }

  try {
    const payload = verifyToken(token)
    return { valid: true, userId: payload.id }
  } catch {
    return { valid: false, message: TOKEN_EXPIRED }
  }
}

const updatePasswordService = async ({ token, newPassword }) => {
  try {
    const payload = verifyToken(token)

    const alreadyUsed = await isResetTokenUsed(token)
    if (alreadyUsed) return { success: false, message: TOKEN_USED }

    const passwordHash = await hashPassword(newPassword)
    await userModel.findByIdAndUpdate(payload.id, { passwordHash })

    await markTokenAsUsed(token)

    return { success: true, message: USER_MESSAGES.UPDATE_PASSWORD }
  } catch {
    return { success: false, message: TOKEN_EXPIRED }
  }
}

const updateUser = async (id, updateData) => {
  const user = await userModel.findByIdAndUpdate(
    id,
    { $set: updateData },
    { new: true }
  )
  return user
}

const getUserById = async (id) => {
  return await userModel.findById(id).lean()
}

const UserModel = {
  registerUserService,
  loginUserService,
  googleLoginService,
  resetPasswordService,
  verifyResetTokenService,
  updatePasswordService,
  updateUser,
  getUserById
}

export default UserModel
