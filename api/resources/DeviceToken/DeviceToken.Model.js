import { deviceTokenModel } from './DeviceToken.Schema.js'

const registerTokenService = async (userId, token, platform) => {
  return await deviceTokenModel.findOneAndUpdate(
    { token, userId },
    { userId, token, platform },
    { upsert: true, new: true }
  )
}

const removeTokenService = async (token) => {
  return await deviceTokenModel.deleteOne({ token })
}

const getTokensForUserService = async (userId) => {
  const docs = await deviceTokenModel.find({ userId })
  return docs.map(d => d.token)
}

const removeStaleTokenService = async (token) => {
  return await deviceTokenModel.deleteOne({ token })
}

const DeviceTokenModel = {
  registerTokenService,
  removeTokenService,
  getTokensForUserService,
  removeStaleTokenService
}

export default DeviceTokenModel
