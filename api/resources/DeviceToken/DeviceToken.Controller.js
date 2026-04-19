import DeviceTokenModel from './DeviceToken.Model.js'

const registerToken = async (req, res) => {
  const { userId, token, platform } = req.body
  const data = await DeviceTokenModel.registerTokenService(userId, token, platform)
  return res.success(201, 'Device token registered.', data)
}

const removeToken = async (req, res) => {
  const { token } = req.body
  await DeviceTokenModel.removeTokenService(token)
  return res.success(200, 'Device token removed.')
}

const DeviceTokenController = {
  registerToken,
  removeToken
}

export default DeviceTokenController
