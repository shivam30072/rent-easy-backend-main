import jwt from 'jsonwebtoken'
import { userModel } from '../resources/User/User.Schema.js'

const generateToken = async (userId) => {
  const user = await userModel.findById(userId).lean()

  if (!user) throw new Error('User not found')

  delete user.passwordHash
  delete user.__v

  const accessToken = jwt.sign(user, process.env.JWT_SECRET, {
    expiresIn: '7d',
  })

  const refreshToken = jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: '7d',
  })

  return { accessToken, refreshToken }
}

const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET)
}

export {
  generateToken,
  verifyToken
}
